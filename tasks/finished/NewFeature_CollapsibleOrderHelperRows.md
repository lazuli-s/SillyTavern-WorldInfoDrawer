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

---

## Post-Implementation Review

*Reviewed: February 17, 2026*

### Files Inspected

- `src/orderHelperRender.actionBar.js`
- `style.css`

### Findings

#### PIR-01: Chevron icon class replacement bug in collapse/expand toggle

- **Category:** Bug
- **Severity:** Medium ❗
- **Location:** `src/orderHelperRender.actionBar.js` — `buildVisibilityRow()` and `buildBulkEditRow()` (collapse toggle click handlers)
- **Summary:** The chevron icon was initialized with `fa-chevron-down` class, but the expand logic used `classList.replace('fa-chevron-right', 'fa-chevron-down')`. Since the chevron never had `fa-chevron-right` initially, the replace was a no-op and the icon classes became corrupted (both classes present). While the CSS `transform: rotate(-90deg)` on `.stwid--collapsed .stwid--collapseChevron` still made it visually work, the class management was incorrect.
- **Fix applied:** Changed both functions to use `row.dataset.collapsed` as the source of truth instead of relying on class presence. Now uses explicit `classList.remove('fa-chevron-right')` / `classList.add('fa-chevron-down')` and vice versa for collapsing. Added `row.dataset.collapsed = 'false'` initialization to ensure consistent state tracking.

### No Additional Issues Found

The rest of the implementation was reviewed against:
- **Architectural boundaries**: Correctly uses the Order Helper module scope as documented in FEATURE_MAP.md
- **JS Best Practices**: No security issues (no eval, no unsanitized DOM insertion), event listeners are properly scoped to the row elements, no blocking operations, proper use of SillyTavern APIs
- **CSS**: Proper use of existing CSS patterns, smooth animations implemented via max-height transition