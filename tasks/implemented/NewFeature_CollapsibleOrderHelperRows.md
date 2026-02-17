# New Feature: Collapsible Order Helper Rows

## Summary

Add independent collapse/expand behavior to the **Visibility** and **Bulk Editor** rows in the Order Helper panel. Each row shows a clickable title bar with a chevron icon; clicking collapses the row content with a smooth slide animation.

## Requirements

- Both rows independently collapsible (each has its own toggle)
- Toggle: click anywhere on the row title label (`stwid--RowTitle`)
- Chevron icon on the left side of the title text; rotates 90° when collapsed
- Collapsed state: row shrinks to just the title bar (all content hidden)
- Labels reuse existing text: "Visibility" and "Bulk Editor"
- Smooth slide animation (max-height transition, 250ms)
- No persistence — always starts expanded on load

## Files Changed

- `src/orderHelperRender.actionBar.js` — `buildVisibilityRow` and `buildBulkEditRow`
- `style.css` — Order Helper section

## Implementation Notes

- Content elements are wrapped into a `stwid--rowContentWrap` div after all elements are appended to the row
- `overflow: hidden` is managed by JS during animation only (to avoid clipping absolutely-positioned dropdown menus in the expanded stable state)
- `closeOpenMultiselectDropdownMenus()` is called before collapsing to prevent dropdown artifacts
- `stwid--collapsed` CSS class is toggled on the row element to drive all state styles
