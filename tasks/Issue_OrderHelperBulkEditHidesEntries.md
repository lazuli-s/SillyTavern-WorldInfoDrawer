# Order Helper: Bulk Edit Hides Edited Entries After Apply

## Summary

When the user applies a bulk edit in the Order Helper that assigns a new outlet value
(one that did not exist in any entry when the table was opened), the affected entries
immediately disappear from the table. This happens because the column filter's known-value
snapshot is not updated after the edit, so the new outlet value is treated as unknown and
filtered out — even when no column filter was intentionally active.

## Current Behavior

When the user opens the Order Helper, selects some entries, types a new outlet name into
the bulk edit row, and clicks Apply:

1. Each selected entry's outlet field is changed to the new value.
2. The row-level outlet filter is applied immediately using the existing filter state.
3. Because the new outlet value was not in the filter's known-value snapshot (captured
   when the table was opened), the entry does not match the filter's allowed list.
4. The row is marked as filtered out and hidden — even though the user never set any
   outlet filter manually.

## Expected Behavior

After this fix, when the user applies a bulk edit that assigns a new outlet value:

1. Each selected entry's outlet field is changed to the new value.
2. The filter's known-value snapshot is refreshed to include the new outlet value.
3. Because no outlet filter was active before the edit, the new value is automatically
   added to the "allowed" list (all values visible).
4. The affected entries remain visible in the table.

If the user had intentionally narrowed the outlet filter before applying the bulk edit
(e.g. showing only "OutletA"), entries changed to a different outlet may still be hidden —
this is correct and intentional behavior (the user's filter choice is respected).

## Root Cause

`orderHelperRender.actionBar.js` — the outlet bulk-edit apply handler — calls
`applyOrderHelperOutletFilterToRow()` directly after mutating `entryData.outletName`.
This function checks the existing `orderHelperState.filters.outlet` list, which was
initialized from `outletValues` (the snapshot taken at table-build time). A brand-new
outlet value is not in that snapshot, so it is not in the allowed list, and the row is
hidden.

The `syncOrderHelperOutletFilters()` function already exists in `orderHelperFilters.js`
and is designed for exactly this situation: it re-reads all current outlet values from
the entries, detects whether all values were selected before (no intentional filter), and
if so, expands the filter's allowed list to include the new value. This function is not
called anywhere in the bulk-edit apply flow.

## Agreed Scope

### Files to change

- `src/orderHelperRender.actionBar.js`
  — The outlet bulk-edit apply button's click handler (around the `applyOutlet` element).
  After all target entries' `outletName` fields are updated, call:
  1. `syncOrderHelperOutletFilters()` — refreshes state to include the new outlet value
  2. `applyOrderHelperOutletFilterToRow(tr, entryData)` for each target row (already
     called; just needs to happen after the sync)
  3. `filterIndicatorRefs.outlet?.()` (already called as `refreshOutletFilterIndicator`)
     — updates the filter-button active/inactive visual in the table header

  The `syncOrderHelperOutletFilters` callback must be passed into `buildBulkEditRow`
  (alongside `applyOrderHelperOutletFilterToRow`, which is already passed in), or
  accessed through an existing reference available in scope.

- `src/orderHelperFilters.js`
  — No logic change needed. The existing `syncOrderHelperOutletFilters` function is
  already correct.

### Potentially affected (check but no change expected unless confirmed broken)

- Row-level inline outlet edits in `src/orderHelperRender.tableBody.js` — these call
  `refreshOutletFilterIndicator` after each inline change, but the same root cause may
  affect them. Confirm whether the same issue occurs during inline outlet edits; if so,
  apply the same fix pattern.

**Resolution (from code inspection):** `tableBody.js` line 443–444 already calls
`syncOrderHelperOutletFilters()` then `refreshOutletFilterIndicator()` on every inline
outlet edit. No change needed there.

## Implementation Plan

- [x] In `src/orderHelperRender.js` (lines 157–175), add `syncOrderHelperOutletFilters`
      and `filterIndicatorRefs` to the `buildBulkEditRow` call. Both are already in scope
      at that point (`syncOrderHelperOutletFilters` from the outer ctx, `filterIndicatorRefs`
      defined at line 117 before the call).
- [x] In `src/orderHelperRender.actionBar.js`, add `syncOrderHelperOutletFilters` and
      `filterIndicatorRefs` to the JSDoc comment and destructured parameter list of
      `buildBulkEditRow`.
- [x] In the `applyOutlet` click handler (lines 984–999), restructure into two passes:
      - Pass 1: mutate `entryData.outletName` and `rowOutlet.value` as today; collect `books`.
        Remove `applyOrderHelperOutletFilterToRow` from inside this loop.
      - After pass 1: call `syncOrderHelperOutletFilters()`.
      - Pass 2: iterate `targets` and call `applyOrderHelperOutletFilterToRow(tr, entryData)`.
      - After pass 2: call `filterIndicatorRefs.outlet?.()`.
      - Then `await saveUpdatedBooks(books)` as before.
- [x] Confirm `orderHelperFilters.js` — no change needed (already verified correct).
- [x] Confirm `orderHelperRender.tableBody.js` — no change needed (inline edits already
      handle sync correctly; verified above).

## After Implementation

### What changed

- Files changed: `src/orderHelperRender.js`, `src/orderHelperRender.actionBar.js`
  - `orderHelperRender.js` — passes `syncOrderHelperOutletFilters` and `filterIndicatorRefs`
    into `buildBulkEditRow` so the apply handler can use them
  - `buildBulkEditRow` / `applyOutlet` handler — split the single loop into two passes:
    first all mutations run, then `syncOrderHelperOutletFilters()` refreshes the snapshot,
    then `applyOrderHelperOutletFilterToRow` runs per row, then `filterIndicatorRefs.outlet?.()`
    updates the filter-button indicator

### Risks / What might break

- This touches the outlet filter sync flow in the bulk-edit path, so it could affect
  filter state if `syncOrderHelperOutletFilters` ever produces unexpected results (e.g.
  if `getOutletValues` returns stale cache data before the save completes — though the
  mutation happens in-memory first, before save, so this should be fine).
- The filter indicator chip (`filterIndicatorRefs.outlet?.()`) is now called after bulk
  edits, matching what inline edits already do. If the indicator had not fired before, any
  test relying on it staying un-updated after a bulk outlet edit would now behave differently.

### Manual checks

- [ ] Open the Order Helper, select several entries that currently have no outlet name.
  Type a brand-new outlet name (one that doesn't exist yet) into the Outlet bulk-edit
  field and click Apply. **Success: all selected entries remain visible in the table.**
- [ ] Same setup, but this time first use the outlet column filter to narrow to a specific
  outlet value, then bulk-apply a *different* outlet name. **Success: the affected entries
  disappear because the intentional filter is respected.**
- [ ] Inline outlet edit (click an outlet cell in a row, type a new value, press Enter or
  blur). Confirm entries remain visible. **Success: no regression — inline edits were
  already working and should continue to work.**
