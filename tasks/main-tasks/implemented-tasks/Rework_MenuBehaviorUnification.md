# TASK: Unify menu behavior across multiselect and list dropdowns
*Created: Feb 23, 2026*

**Type:** REWORK
**Status:** ISSUES_FOUND

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

---

## Implementation Plan

- [x] 1. Add `aria-expanded` attribute to list dropdown trigger in `listPanel.bookMenu.js`
      - Add `aria-expanded="false"` to the trigger element on creation
      - Update to `aria-expanded="true"` when menu opens
      - Update to `aria-expanded="false"` when menu closes

- [x] 2. Add centralized close handler to list dropdown menu in `listPanel.bookMenu.js`
      - Add `MULTISELECT_DROPDOWN_CLOSE_HANDLER` property to menu element (reuse constant from utils)
      - Register a closeMenu function that removes blocker and resets aria-expanded
      - This enables programmatic closing from external triggers

- [x] 3. Update `closeOpenMultiselectDropdownMenus` in `orderHelperRender.utils.js` to also close list dropdowns
      - Add query for `.stwid--listDropdownMenu.stwid--state-active`
      - Call registered close handler if available
      - Fallback: remove blocker element and reset aria-expanded

- [x] 4. Add keyboard navigation support (Enter/Space to open, Escape to close) to list dropdown
      - Add keydown handler on trigger for Enter/Space
      - Add keydown handler on menu for Escape to close (blocker click handles this)

- [x] 5. Add aria attributes to list dropdown menu container
      - Add `role="menu"` to the menu element
      - Add `role="menuitem"` to each menu item

- [x] 6. Verify focus returns to trigger when list dropdown closes
      - Add trigger.focus() call in closeMenu function

- [ ] 7. Test both menu systems to ensure consistent behavior
      - Verify outside-click closes both menu types
      - Verify keyboard navigation works on both
      - Verify ARIA states update correctly on both

---

## After Implementation
*Implemented: Feb 23, 2026*

### What changed

- `src/listPanel.bookMenu.js`: Added `aria-expanded` and `aria-haspopup` attributes to the menu trigger, added `role="menu"` to the menu container, added keyboard navigation (Enter/Space to open), added focus return when menu closes, and updated all close handlers to properly manage aria-expanded state.

- `src/orderHelperRender.utils.js`: Updated `closeOpenMultiselectDropdownMenus` to also close list dropdown menus (blocker-based menus) when called, ensuring consistent outside-click behavior across both menu systems.

### Risks / What might break

- The keyboard navigation changes might conflict with existing keyboard handlers if the trigger element receives focus unexpectedly.
- The focus return on close might feel unexpected if users are used to focus staying where it was.

### Manual checks

- Open a book menu (the three dots menu on any book row), verify it opens with `aria-expanded="true"`, then close it by clicking outside - verify `aria-expanded` returns to `"false"` and focus returns to the trigger.
- Navigate to a book menu using keyboard (Tab) and press Enter or Space - the menu should open.
- Open both a multiselect dropdown (like visibility filter) and a book menu, then click outside - both should close properly.

---

## Post-Implementation Review
*Reviewed: Feb 23, 2026*

### Files Inspected
- `src/listPanel.bookMenu.js`
- `src/orderHelperRender.utils.js`

### Findings

#### PIR-01: Menu items don't close the menu after action

- **Category:** Bug / UI Correctness

- **Severity:** Medium ❗

- **Location:** `listPanel.bookMenu.js` — `buildBookMenuTrigger()` (menu item click handlers)

- **Summary:** Most menu items (rename, bulk edit, external editor, fill titles, order helper, export, duplicate, delete) don't call closeMenu() after their action. This means the menu stays open after clicking these items, which is inconsistent behavior - users expect the menu to close after clicking an action.

- **Confidence:** High 😀

- **Fix risk:** Low 🟢

- **Fix Plan:**
  - [x] In the click handlers for rename, bulk, editor, fillTitles, orderHelper, exp, dup, del: add `closeMenu?.()` call before the action (or after if the action is async and we want to wait)
  - [x] For async actions (bulk, editor, duplicate, delete), call closeMenu() after the await completes

- **Requires human judgment**: ⚠️ No

#### PIR-02: Inconsistent aria-expanded handling

- **Category:** UI Correctness / Redundancy

- **Severity:** Low ⭕

- **Location:** `listPanel.bookMenu.js` — multiple close handlers

- **Summary:** The code manually sets `aria-expanded="false"` in multiple places (blocker click, sortSelect change, stloButton click) instead of using the centralized closeMenu function. This creates redundancy and makes maintenance harder.

- **Confidence:** High 😀

- **Fix risk:** Low 🟢

- **Fix Plan:**
  - [x] Update sortSelect change handler to call closeMenu() instead of manually setting aria-expanded
  - [x] Update stloButton click handler to call closeMenu() instead of manually setting aria-expanded (but only on success path)

- **Requires human judgment**: ⚠️ No

#### PIR-03: Missing focus() in cross-system close

- **Severity:** Low ⭕

- **Location:** `orderHelperRender.utils.js` — `closeOpenMultiselectDropdownMenus()`

- **Summary:** When closeOpenMultiselectDropdownMenus closes a list dropdown (blocker-based menu), it sets aria-expanded but doesn't call focus() on the trigger, unlike the closeMenu function in listPanel.bookMenu.js. This is a minor inconsistency.

- **Confidence:** Medium 🤔

- **Fix risk:** Low 🟢

- **Fix Plan:**
  - [x] In the list dropdown close loop, add `trigger?.focus()` after setting aria-expanded

- **Requires human judgment**: ⚠️ No
