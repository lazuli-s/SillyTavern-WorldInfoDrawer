# New Feature: Bulk Edit – Outlet Container

## Summary

Add an **Outlet** bulk edit container to the `stwid--bulkEditRow` in the Order Helper action bar, appearing immediately after the existing **Depth** container.

## Requirements

- **Position**: After the Depth container in `buildBulkEditRow`.
- **Label**: "Outlet" with a `?` hint icon explaining the field.
- **Input**: A text input with a `<datalist>` populated from `getOutletOptions()` (all existing outlet names in the current table), allowing the user to either select an existing outlet name or type a new one freely.
- **Apply button**: `menu_button interactable fa-solid fa-fw fa-check` — applies the input value as `outletName` to all selected, non-filtered rows.
- **Disabled state**: Container is disabled (`stwid--isDisabled`) when the Position dropdown is not set to an outlet position. Tooltip communicates this constraint.

## Files Changed

- `src/orderHelperRender.actionBar.js` — adds outlet container, wires position → outlet enabled/disabled state
- `src/orderHelperRender.js` — destructures `applyOrderHelperOutletFilterToRow` and passes it to `buildBulkEditRow`

## Implementation Notes

- Use `isOutletPosition(positionSelect.value)` to gate the container.
- Use `<input type="text" list="stwid--bulk-outlet-options">` + `<datalist id="stwid--bulk-outlet-options">` for the combobox pattern.
- Persist last-used value in `localStorage` under `stwid--bulk-outlet-value`.
- On apply: update `cache[bookName].entries[uid].outletName`, update row DOM `[name="outletName"]` input, call `applyOrderHelperOutletFilterToRow`, then save.
- Follow the exact same pattern as the Depth container for structure and the Position container for per-row filter application.
