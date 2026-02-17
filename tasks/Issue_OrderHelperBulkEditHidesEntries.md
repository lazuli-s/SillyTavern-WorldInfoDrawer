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
