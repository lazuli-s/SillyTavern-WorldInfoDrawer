# TASK: Unify menu behavior across multiselect and list dropdowns
*Created: Feb 23, 2026*

**Type:** REWORK  
**Status:** DOCUMENTED

---

## Summary

Standardize menu behavior across the two menu systems used by this extension:
- multiselect menus (`stwid--multiselectDropdown*`)
- action list menus (`stwid--listDropdown*`)

This follow-up should focus on behavior consistency, not visual redesign.

## Goals

- Keep keyboard navigation consistent between menu types
- Keep focus behavior consistent when opening and closing menus
- Keep outside-click closing behavior consistent
- Keep ARIA state updates consistent (`aria-expanded`, focus target, and menu role usage)

## Likely Scope

- `src/orderHelperRender.utils.js`
- `src/listPanel.filterBar.js`
- `src/orderHelperRender.actionBar.js`
- `src/orderHelperRender.tableHeader.js`
- `src/listPanel.bookMenu.js`
- `src/lorebookFolders.js`
- `style.css` (only if behavior changes require tiny style support)

## Out of Scope

- New menu visuals or layout redesign
- New menu features unrelated to behavior consistency
