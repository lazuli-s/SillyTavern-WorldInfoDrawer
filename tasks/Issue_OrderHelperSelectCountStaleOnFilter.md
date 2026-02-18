# Order Helper: Select Count Doesn't Update When Column Filters Change

## Summary

The "Select" field in the Order Helper's bulk edit row shows a line like
*"Selected 2 out of 20 entries"*. When the user applies column filters (Strategy, Position,
Outlet, Group, etc.) and some rows are hidden, neither the selected count nor the total
updates. The count always reflects the full unfiltered table, not what's currently visible.

## Current Behavior

When the user opens the Order Helper and applies one or more column filters (for example,
filtering to only show entries with strategy "Normal"):

1. The rows that don't match the filter are hidden from the table.
2. The "Select" field in the bulk edit row continues to show the **original total** — as if
   no filter were active.
3. The selected count also does not update, because `refreshSelectionCount()` is never called
   when filters change.

In short: the count is frozen at the state it was in when the table first loaded (or when
the last individual row selection happened).

## Expected Behavior

After this fix, whenever the user changes a column filter:

1. Rows that don't match the filter are hidden as before.
2. The "Select" count immediately updates to reflect only the **currently visible** rows.
   - "Total" = number of non-hidden rows (those without the `stwid--isFiltered` class).
   - "Selected" = number of non-hidden rows that are also marked as selected.
3. Example: 20 entries total, filter leaves 5 visible, 1 of those is selected →
   display reads *"Selected 1 out of 5 entries"*.

## Root Cause

`refreshSelectionCount()` is defined in `src/orderHelperRender.actionBar.js` inside
`buildBulkEditRow()`. It currently:

1. Counts **all** rows in the tbody (including hidden/filtered ones) as the "total."
2. Is **never called** when column filters change — only on individual row-selection toggles
   and on initial table load.

The filter-change hook (`onFilterChange` → `refreshVisibilityRow()`) in
`src/orderHelperRender.js` does not call `refreshSelectionCount()`.

## Agreed Scope

### Files to change

- **`src/orderHelperRender.actionBar.js`**
  — Inside `refreshSelectionCount()` (around line 566–571):
  Update the `total` and `selected` calculations to exclude rows that carry the
  `stwid--isFiltered` CSS class. Rows with that class are hidden by a filter and should
  not be counted.

  ```js
  // Current (counts all rows):
  const total = rows.length;
  const selected = rows.filter((r) => isOrderHelperRowSelected(r)).length;

  // Fixed (counts only visible rows):
  const visible = rows.filter((r) => !r.classList.contains('stwid--isFiltered'));
  const total = visible.length;
  const selected = visible.filter((r) => isOrderHelperRowSelected(r)).length;
  ```

  — Also ensure `refreshSelectionCount` is **returned** from `buildBulkEditRow()` (or
  otherwise made available to the caller) so that `orderHelperRender.js` can wire it
  into the filter-change flow.

- **`src/orderHelperRender.js`**
  — In the `onFilterChange` callback (currently only calls `refreshVisibilityRow()`),
  also call `refreshSelectionCount()` so the count updates every time any column filter
  is applied or cleared.

### Potentially affected (check but no change expected)

- `src/orderHelperRender.tableBody.js` — already calls `refreshSelectionCount` on
  individual row selection toggles; no change needed there.
- `src/orderHelperFilters.js` — the filter logic itself is correct; no change needed.

## Open Questions / Assumptions

- **Assumption:** `refreshSelectionCount` is already passed back from `buildBulkEditRow()`
  in some form (or called at line 283 in `orderHelperRender.js`). If it isn't directly
  accessible in `orderHelperRender.js`, the implementation agent will need to wire it
  through the return value of `buildBulkEditRow()`, similar to how other refresh callbacks
  (e.g., `filterIndicatorRefs`) are passed around.
- **Out-of-scope edge case:** If `stwid--isFiltered` is not reliably set on every hidden
  row (e.g., the script filter uses a different mechanism), that would need a separate
  investigation. Treat this task as covering column filters only.

## Out of Scope

- Script filter (the `stwid--isFiltered` class is also set by the script filter, so the
  count fix will naturally cover it too — but no additional wiring is planned for it).
- Any change to *which* entries are selected (the selection model itself is not changing).
- Any change to the filter logic in `src/orderHelperFilters.js`.

## Implementation Plan

**Open question resolved from code inspection:**

- `refreshSelectionCount` is already returned from `buildBulkEditRow()` at line 1558
  (`return { element: row, refreshSelectionCount, cleanup }`) and already destructured in
  `orderHelperRender.js` at line 157. No additional wiring is needed.

- [x] In `src/orderHelperRender.actionBar.js`, locate `refreshSelectionCount` (line 566).
  Replace the current body (which counts all rows) with a version that first filters out
  rows carrying `stwid--isFiltered`, then counts visible rows for both `total` and
  `selected`.

- [x] In `src/orderHelperRender.js`, locate the `onFilterChange` callback passed to
  `buildTableHeader` (line 222). Expand it from the single `refreshVisibilityRow()` call
  to also call `refreshSelectionCount()`, so the count updates on every column filter change.

## After Implementation

### What changed

- Files changed: `src/orderHelperRender.actionBar.js`, `src/orderHelperRender.js`
  - `refreshSelectionCount()` — now filters rows first, excluding any that carry the
    `stwid--isFiltered` class, so both the total and selected counts reflect only the
    currently visible rows.
  - `onFilterChange` callback in `renderOrderHelper()` — now calls `refreshSelectionCount()`
    alongside `refreshVisibilityRow()`, so the count refreshes every time a column filter
    is applied or cleared.

### Risks / What might break

- This touches the selection count display path, so any caller that reads the count text
  for display purposes (there are none currently) would see the new filtered value instead
  of the raw total.
- The script-filter panel also sets `stwid--isFiltered` on rows; its hidden rows will now
  be excluded from the count too. This is the correct behavior but was previously
  out-of-scope — it comes for free with no extra wiring.

### Manual checks

- [ ] Open Order Helper with 10+ entries. Apply a column filter (e.g. Strategy = Normal)
  that hides some rows. Confirm the "Selected X out of Y entries" text immediately
  updates to show only the visible row count. (Success: Y equals the number of
  non-hidden rows, not the full table total.)
- [ ] With a filter active, click select-all, then clear the filter. Confirm the count
  updates again to show the full table total. (Success: count jumps back to the
  unfiltered row count.)
- [ ] With no filter active, select a few individual rows. Confirm the selected count
  still reflects the correct number of checked rows. (Success: existing per-row
  selection counting is unaffected.)
