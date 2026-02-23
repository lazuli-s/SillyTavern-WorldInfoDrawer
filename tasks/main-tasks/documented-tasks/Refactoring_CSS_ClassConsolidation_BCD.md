# TASK: Refactor CSS class naming + menu building blocks (B/C/D)
*Created: Feb 23, 2026*

**Type:** REFACTORING  
**Status:** IMPLEMENTED

---

## Summary

Refactor CSS class naming in WorldInfoDrawer to reduce redundancy and improve consistency:
- consolidate “labeled container” patterns to rely on `stwid--thinContainer` (including Order Helper bulk edit groups)
- standardize UI state class naming to the `stwid--state-*` convention
- introduce shared menu/menuItem hooks to unify styling now, and explicitly track a follow-up to unify behavior later

This is intended to be a **non-functional, non-visual refactor** (no user-visible behavior changes).

## Current Behavior

- The extension uses multiple parallel “container” classes:
  - `stwid--thinContainer` is used throughout the main drawer UI for labeled groups (with `stwid--thinContainerLabel`, `stwid--thinContainerLabelHint`, etc.).
  - Order Helper uses a separate `stwid--bulkEditContainer` wrapper for action-bar control groups, with similar styling needs but separate CSS selectors.
- UI states are represented by a mix of conventions:
  - `stwid--active` is used for multiple meanings (selected toggle state, open menus, highlighted entry row, open filter panel).
  - Many other states use `stwid--isX` (e.g. `stwid--isSelected`, `stwid--isTarget`, `stwid--isCollapsed`, etc.).
  - There is also at least one generic state class: `.is-disabled` on `.stwid--thinContainer` (CSS only).
- Dropdown/menu DOM uses separate “families” of classes:
  - multiselect dropdowns: `stwid--multiselectDropdownMenu` + `stwid--multiselectDropdownOption`
  - list/context menus: `stwid--listDropdownMenu` + `stwid--listDropdownItem`

## Expected Behavior

- `stwid--thinContainer` is the shared base “labeled container” building block across the drawer UI **and** Order Helper action bar groups.
- State classes follow a single naming convention: `stwid--state-*`.
- Menus gain shared building-block classes `stwid--menu` and `stwid--menuItem` (styling hooks now), while the existing specific classes remain available until a later cleanup.
- No changes to:
  - what controls exist
  - what actions do
  - what data is saved/loaded
  - menu open/close logic (for this task), beyond keeping ARIA in sync if class renames require it

## Agreed Scope

### B) Thin/bulk container unification (B1 + B4)
- Standardize on **`stwid--thinContainer`** (double dash).
- **Markup changes are allowed** as long as the UI looks and behaves the same.
- Likely files:
  - `src/orderHelperRender.actionBar.js` (bulk edit groups)
  - `style.css` (Order Helper bulk edit container rules)
  - Potentially other Order Helper renderer modules if they assume `stwid--bulkEditContainer` for styling hooks

### C) State naming consistency (C2)
- Standardize state class names to: **`stwid--state-<name>`**
- Likely files:
  - `style.css`
  - `src/editorPanel.js`
  - `src/drawer.js`
  - `src/listPanel.*.js` modules (selection, collapse, target hover)
  - `src/lorebookFolders.js`
  - Order Helper modules: `src/orderHelper.js`, `src/orderHelperFilters.js`, `src/orderHelperRender.*.js`
  - Tests that assert classes:
    - `test/lorebookFolders.test.js` (collapsed state assertions)

### D) Menu building blocks + follow-up (D2)
- Add shared “menu primitives”:
  - `stwid--menu` on menu containers
  - `stwid--menuItem` on menu options/items
- Do **not** unify menu behavior in this task, but the task should record a follow-up to standardize:
  - keyboard navigation
  - focus handling
  - outside-click closing patterns
  - consistent ARIA across menu types
- Likely files:
  - `src/orderHelperRender.tableHeader.js` (multiselect filter menus)
  - `src/orderHelperRender.actionBar.js` (outlet menu + columns menu)
  - `src/orderHelperRender.utils.js` (menu open/close wiring)
  - `src/listPanel.filterBar.js` (book visibility multiselect menu)
  - `src/listPanel.bookMenu.js` and `src/lorebookFolders.js` (list dropdown menus)
  - `style.css`

## Out of Scope

- **A) Order Helper hide-column refactor to a `data-hide-cols` attribute** — explicitly dropped.
- **E) Unifying filtering flags (`stwid--filter-query`, `stwid--filter-visibility`)** — explicitly deferred.
- Any new features, UI layout changes, or behavioral changes.

---

## Implementation Plan

### Phase 0 — Inventory and naming map (prep)
- [x] Enumerate all state classes currently in use (CSS + JS), including:
  - `stwid--active`
  - `stwid--isTarget`
  - `stwid--isSelected`
  - `stwid--isCollapsed`
  - `stwid--isEmpty`
  - `stwid--isDragging`
  - `stwid--isLoading`
  - `stwid--isDisabled`
  - `stwid--isFiltered`
  - `.is-disabled` (generic)
- [x] Produce an explicit mapping table for the refactor:

| Current class | New class |
|---|---|
| `stwid--active` | `stwid--state-active` |
| `stwid--isTarget` | `stwid--state-target` |
| `stwid--isSelected` | `stwid--state-selected` |
| `stwid--isCollapsed` | `stwid--state-collapsed` |
| `stwid--isEmpty` | `stwid--state-empty` |
| `stwid--isDragging` | `stwid--state-dragging` |
| `stwid--isLoading` | `stwid--state-loading` |
| `stwid--isDisabled` | `stwid--state-disabled` |
| `stwid--isFiltered` | `stwid--state-filtered` |
| `.is-disabled` | `stwid--state-disabled` |

**Note:** `stwid--active` currently represents multiple concepts (open menus, enabled toggles, active entry highlight). This refactor keeps the single concept name (`state-active`) to avoid behavior/design churn. If later needed, split into `state-open` vs `state-active` as a follow-up.

### Phase 1 — B: unify `stwid--bulkEditContainer` → `stwid--thinContainer`
- [x] Update Order Helper action bar DOM builders to use `stwid--thinContainer` for bulk edit groups.
  - Primary location: `src/orderHelperRender.actionBar.js` (multiple `selectContainer`, `activeStateContainer`, `strategyContainer`, etc. currently call `classList.add('stwid--bulkEditContainer')`).
- [x] Update `style.css` selectors currently targeting:
  - `.stwid--orderHelper .stwid--bulkEditContainer { ... }`
  - `.stwid--orderHelper .stwid--bulkEditContainer.stwid--isDisabled { ... }`
  - `.stwid--orderHelper .stwid--bulkEditContainer[data-field=\"...\"] { ... }`
  to target `.stwid--thinContainer` (or a more specific combination, e.g. `.stwid--orderHelper .stwid--thinContainer[data-field]`) so Order Helper visuals remain unchanged.

**Compatibility option (recommended):**
- During the transition, keep `stwid--bulkEditContainer` as an additional class in markup for one refactor cycle:
  - add `stwid--thinContainer` alongside the old class
  - update CSS to support both selectors
  - later remove `stwid--bulkEditContainer` entirely once stable  
This reduces risk of missing any selector and helps external/custom themes survive.

### Phase 2 — C: rename state classes to `stwid--state-*`
- [x] Update JS to add/toggle/remove the new state classes.
  - Example pattern: if code currently does `el.classList.toggle('stwid--isSelected', on)`, change to `stwid--state-selected`.
- [x] Update CSS selectors to match the new classes.
- [x] Update tests that assert old class names:
  - `test/lorebookFolders.test.js` expects `stwid--isCollapsed` on folder books; change to `stwid--state-collapsed`.

**Compatibility option (recommended):**
- For one refactor cycle, have JS toggle both (old + new), and CSS match both, then remove old.
  - This is especially relevant for `stwid--active`, which is used widely across modules.

### Phase 3 — D: add shared `stwid--menu` / `stwid--menuItem` hooks (styling now)
- [x] Add `stwid--menu` to:
  - `.stwid--multiselectDropdownMenu` elements (Order Helper filters, book visibility menu, outlet menu, columns menu)
  - `.stwid--listDropdownMenu` elements (book/folder context menus)
- [x] Add `stwid--menuItem` to:
  - `.stwid--multiselectDropdownOption`
  - `.stwid--listDropdownItem`
- [x] Update `style.css` to prefer the shared hooks where practical:
  - Move shared layout properties (min-height, padding, hover background, flex alignment) onto `.stwid--menu` / `.stwid--menuItem`.
  - Keep specialized rules where needed (e.g. multiselect checkbox layout vs list dropdown icon/label layout).

### Phase 4 — Follow-up task (explicitly tracked; not implemented here)
Create a follow-up task to unify menu behavior (keyboard/focus/ARIA/outside-click close) across:
- multiselect dropdowns (`wireMultiselectDropdown`, Order Helper + list panel visibility)
- list/context dropdowns (book/folder menus)

This follow-up should reference the repo best-practices requirement:
- `.claude/skills/st-js-best-practices/references/patterns.md` → COMPAT-03: keep `aria-expanded` in sync.


Created follow-up task: `tasks/main-tasks/documented-tasks/Rework_MenuBehaviorUnification.md`
---

## After Implementation
*Implemented: February 23, 2026*

### What changed

- `src/orderHelperRender.actionBar.js`
  - Added `stwid--thinContainer` to bulk edit group wrappers while keeping `stwid--bulkEditContainer` for one transition cycle.
  - Renamed all state class usage to the new `stwid--state-*` pattern.
  - Added shared menu hooks (`stwid--menu`, `stwid--menuItem`) to dropdown markup.
- `style.css`
  - Renamed state selectors from mixed names to `stwid--state-*`.
  - Added shared menu styling hooks (`stwid--menu`, `stwid--menuItem`) and kept specific menu rules in place.
  - Updated Order Helper container selectors to support both `stwid--thinContainer` and `stwid--bulkEditContainer`.
- `src/editorPanel.js`
  - Updated active-state class toggles/checks to `stwid--state-active`.
- `src/drawer.js`
  - Updated loading and active-state class toggles/checks to `stwid--state-*`.
- `src/listPanel.filterBar.js`
  - Updated active-state class toggles/checks to `stwid--state-active`.
  - Added menu primitives to book visibility dropdown markup.
- `src/listPanel.booksView.js`
  - Updated collapsed/target/empty-state class usage to `stwid--state-*`.
- `src/listPanel.foldersView.js`
  - Updated collapsed-state checks to `stwid--state-collapsed`.
- `src/listPanel.js`
  - Updated collapsed/empty/loading-state class usage to `stwid--state-*`.
- `src/listPanel.selectionDnD.js`
  - Updated dragging/selected/target-state class usage to `stwid--state-*`.
- `src/listPanel.state.js`
  - Updated collapsed-state checks to `stwid--state-collapsed`.
- `src/lorebookFolders.js`
  - Updated collapsed/target-state classes to `stwid--state-*`.
  - Added menu primitives to folder menu markup.
- `src/orderHelper.js`
  - Updated active-state class usage to `stwid--state-active`.
- `src/orderHelperFilters.js`
  - Updated filtered-row class to `stwid--state-filtered`.
- `src/orderHelperRender.filterPanel.js`
  - Updated filter panel active-state checks to `stwid--state-active`.
- `src/orderHelperRender.tableBody.js`
  - Updated filtered-row checks to `stwid--state-filtered`.
- `src/orderHelperRender.tableHeader.js`
  - Updated active-state class usage to `stwid--state-active`.
  - Added menu primitives to multiselect dropdown markup.
- `src/orderHelperRender.utils.js`
  - Updated open-menu selectors/class toggles to `stwid--state-active`.
- `src/listPanel.bookMenu.js`
  - Added menu primitives to book context menu markup.
- `src/worldEntry.js`
  - Updated dragging-state class usage to `stwid--state-dragging`.
- `test/lorebookFolders.test.js`
  - Updated collapsed-state assertions to `stwid--state-collapsed`.
- `tasks/main-tasks/documented-tasks/Rework_MenuBehaviorUnification.md`
  - Added a documented follow-up task to unify menu behavior and ARIA/focus handling.

### Risks / What might break

- This touches many class names, so it might affect custom themes or custom CSS that still targets the old class names.
- This touches menu class markup, so it might affect dropdown spacing or hover styling in edge cases.
- This touches selection/highlight classes, so it might affect some visual states during drag, select, or collapse actions.

### Manual checks

- Reload the extension UI and open several books and folders. Success: collapse/expand, selection highlight, and drag target highlight still appear normally.
- Open Book Visibility and Order Helper filter dropdowns, then open book/folder context menus. Success: menus open/close as before and item spacing/hover behavior still looks correct.
- Use Order Helper bulk edit controls (including fields that can be disabled). Success: disabled groups become visually dim and non-clickable at the same times as before.
- Drag entries and use multi-select in both list and Order Helper views. Success: selected and filtered rows show/hide correctly and no stale highlight remains.