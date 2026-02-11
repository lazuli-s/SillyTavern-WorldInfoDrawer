# New Feature: Bulk Edit Toggle Active State Container

## Summary

Add a "Toggle Active State" container to `stwid--bulkEditRow` in the Order Helper, positioned before the existing "Strategy" container.

## Container Spec

- **Label:** "Toggle Active State" (with `?` hint icon)
- **Contents:**
  1. A toggle button (`fa-toggle-on` / `fa-toggle-off`) representing the state to apply (enabled vs disabled)
  2. An apply button (`menu_button interactable fa-solid fa-fw fa-check`) that sets all selected, non-filtered entries to the toggled state
- **Persistence:** Toggle state stored in `localStorage['stwid--bulk-active-value']`

## Implementation Location

`src/orderHelperRender.actionBar.js` — inside `buildBulkEditRow()`, inserted between the select container and the strategy container (after `row.append(selectContainer)` / `refreshSelectionCount`, before the strategy container block).

## Apply Logic

For each selected, non-filtered row:
1. Set `cache[bookName].entries[uid].disable` based on toggle state
2. Update Order Helper row icon: `tr.querySelector('[name="entryKillSwitch"]')`
3. Update list panel icon: `cache[bookName].dom.entry?.[uid]?.isEnabled`
4. Save all affected books via `saveWorldInfo`

## Files Changed

- `src/orderHelperRender.actionBar.js` — new container added
- `FEATURE_MAP.md` — bulk edit row entry updated
