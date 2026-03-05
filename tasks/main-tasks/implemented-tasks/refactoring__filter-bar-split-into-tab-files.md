# REFACTORING: Split filter-bar logic into respective tab files
*Created: March 4, 2026*

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

`browser-tabs.filter-bar.js` currently owns the logic for three distinct features — the search row, the book visibility system, and the tab bar orchestration — all in one large file (~570 lines). The search and visibility logic should live in their respective tab files (`browser-tabs.search-tab.js` and `browser-tabs.visibility-tab.js`), which currently contain only 8 lines each (trivial mount-only stubs). This refactoring moves each feature's code to its proper home, leaving `filter-bar.js` as a thin orchestrator. No visible behavior changes.

## Current Behavior

When the browser panel loads, `browser-tabs.filter-bar.js` builds the search row, all book visibility logic (modes, dropdown, chips, filter application), and the icon tab bar — all in one file. The three existing tab-specific files (`browser-tabs.search-tab.js`, `browser-tabs.visibility-tab.js`, `browser-tabs.sorting-tab.js`) are trivially thin mount-only stubs.

## Expected Behavior

After this change, the same behavior is produced, but:
- `browser-tabs.search-tab.js` owns and exports the search row builder
- `browser-tabs.visibility-tab.js` owns and exports all book visibility constants, logic, and the dropdown section builder
- `browser-tabs.filter-bar.js` is a thin orchestrator that imports from the tab files and wires them together via `setupFilter` and `buildIconTabBar`

## Agreed Scope

Files that change:
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js` — remove moved code, add imports, slim down orchestration
- `src/book-browser/browser-tabs/browser-tabs.search-tab.js` — absorbs search logic
- `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js` — absorbs visibility constants and logic
- `src/book-browser/book-browser.js` — update `BOOK_VISIBILITY_MODES` import source
- `ARCHITECTURE.md`, `FEATURE_MAP.md` — update module descriptions

## Out of Scope

- Sorting tab — `browser-tabs.sorting-tab.js` has no logic to receive (sorting row is built in `drawer.js` and only mounted here); no change needed
- Behavior or API changes — the public return of `createFilterBarSlice` (`cleanup`, `getBookVisibilityScope`, `setOrderHelperToggleVisibility`, `setupFilter`) must remain identical
- The `orderHelperToggle` / `setOrderHelperToggleVisibility` logic stays in `filter-bar.js` — it is not visibility-filter logic

## Implementation Plan

### Phase 1 — Expand `browser-tabs.search-tab.js`

- [x] In `browser-tabs.search-tab.js`, add the full `buildSearchRow` function (currently lines 117–228 of `filter-bar.js`) as a named export. Its signature is `buildSearchRow(searchRow, listPanelState, runtime, updateFolderActiveToggles)` — it has no closure dependencies and is already self-contained.
- [x] Keep the existing `mountSearchTabContent` export in the same file.

### Phase 2 — Expand `browser-tabs.visibility-tab.js`

- [x] Move the four `BOOK_VISIBILITY_*` freeze-object constants from `filter-bar.js` to `browser-tabs.visibility-tab.js`. Export `BOOK_VISIBILITY_MODES`; keep the other three (`BOOK_VISIBILITY_OPTIONS`, `BOOK_VISIBILITY_OPTION_TOOLTIPS`, `BOOK_VISIBILITY_MULTISELECT_MODES`) as module-level private constants.
- [x] Move `normalizeBookSourceLinks` as a module-level private helper in `visibility-tab.js`.
- [x] Move `buildVisibilityDropdownSection` as a module-level private function in `visibility-tab.js`. Its parameter signature stays unchanged — it already accepts all dependencies as explicit params.
- [x] Create and export a new `createVisibilitySlice` factory function in `visibility-tab.js`. It accepts:
  ```js
  {
    listPanelState,
    runtime,
    updateFolderActiveToggles,
    onBookVisibilityScopeChange,
    setApplyActiveFilter,
    closeOpenMultiselectDropdownMenus,
    setMultiselectDropdownOptionCheckboxState,
  }
  ```
  Inside, using closure over those params, it defines:
  - `isAllBooksVisibility`, `isAllActiveVisibility`, `getSelectedWorldInfo`
  - `getBookVisibilityFlags`, `getBookVisibilityScope`
  - `getBookVisibilityOption`, `setAllBooksVisibility`, `setAllActiveVisibility`, `toggleVisibilitySelection`
  - `createBookVisibilityIcon`, `renderVisibilityChips`, `closeBookVisibilityMenu`, `applyActiveFilter`
  - Calls `setApplyActiveFilter(applyActiveFilter)` internally (matching current behavior in `setupFilter`).
  - Returns `{ getBookVisibilityScope, setupVisibilitySection }` where `setupVisibilitySection(visibilityRow)` calls `buildVisibilityDropdownSection(...)`, appends the returned `visibilityContainer` to `visibilityRow`, and returns `onDocClickCloseMenu` for the caller to wire the document click listener.
- [x] Keep the existing `mountVisibilityTabContent` export in the same file.

### Phase 3 — Slim down `browser-tabs.filter-bar.js`

- [x] Add imports at the top of `filter-bar.js`:
  ```js
  import { buildSearchRow } from './browser-tabs.search-tab.js';
  import { BOOK_VISIBILITY_MODES, createVisibilitySlice } from './browser-tabs.visibility-tab.js';
  ```
- [x] Remove from `filter-bar.js`: the four `BOOK_VISIBILITY_*` constants, `normalizeBookSourceLinks`, `buildSearchRow`, `buildVisibilityDropdownSection`, and all the visibility-logic helpers currently defined inside `createFilterBarSlice` and `setupFilter` (`isAllBooksVisibility`, `isAllActiveVisibility`, `getSelectedWorldInfo`, `getBookVisibilityFlags`, `getBookVisibilityScope`, `getBookVisibilityOption`, `setAllBooksVisibility`, `setAllActiveVisibility`, `toggleVisibilitySelection`, `createBookVisibilityIcon`, `renderVisibilityChips`, `closeBookVisibilityMenu`, `applyActiveFilter`).
- [x] Keep in `filter-bar.js`: `MULTISELECT_DROPDOWN_CLOSE_HANDLER`, `CSS_STATE_ACTIVE`, `CSS_MULTISELECT_DROPDOWN_BUTTON`, `CSS_VISIBILITY_CHIP`, `setMultiselectDropdownOptionCheckboxState`, `closeOpenMultiselectDropdownMenus`, `buildIconTabBar`, `createFilterBarSlice`, `setupFilter`, and the `applyOrderHelperToggleVisibility` / `orderHelperToggleVisible` / `setOrderHelperToggleVisibility` block.
- [x] In `setupFilter`, replace the entire inline visibility setup block with a call to `createVisibilitySlice({ listPanelState, runtime, updateFolderActiveToggles, onBookVisibilityScopeChange, setApplyActiveFilter, closeOpenMultiselectDropdownMenus, setMultiselectDropdownOptionCheckboxState })`. Use the returned `{ getBookVisibilityScope, setupVisibilitySection }` — call `setupVisibilitySection(visibilityRow)` to build and append the visibility row content, and capture the returned `onDocClickCloseMenu` to register the document click listener (same as current line 545).
- [x] In `setupFilter`, replace the inline `buildSearchRow(searchRow, listPanelState, runtime, updateFolderActiveToggles)` call with the imported version (identical call, no change to behavior).
- [x] Update `createFilterBarSlice` return to use `getBookVisibilityScope` from the visibility slice return value rather than defining it locally.
- [x] In the `filter-bar.js` exports block, remove `BOOK_VISIBILITY_MODES` from the export list (it now lives in `visibility-tab.js`; `book-browser.js` will import it directly from there).

### Phase 4 — Update consumer import in `book-browser.js`

- [x] In `src/book-browser/book-browser.js` (line 27), change the `BOOK_VISIBILITY_MODES` import source from `'./browser-tabs/browser-tabs.filter-bar.js'` to `'./browser-tabs/browser-tabs.visibility-tab.js'`.

### Phase 5 — Update docs

- [x] In `ARCHITECTURE.md`, update the description for `browser-tabs.filter-bar.js` to reflect its new role as a thin orchestrator that owns shared dropdown helpers and the icon tab bar, and delegates search/visibility building to their respective tab files.
- [x] In `ARCHITECTURE.md`, update the description for `browser-tabs.visibility-tab.js` to: owns `BOOK_VISIBILITY_MODES` constants, `createVisibilitySlice` factory, `buildVisibilityDropdownSection`, and visibility tab mount helper.
- [x] In `ARCHITECTURE.md`, update the description for `browser-tabs.search-tab.js` to: owns `buildSearchRow` builder and search tab mount helper.
- [x] In `FEATURE_MAP.md`, update the "Search books by name" entry to reference `browser-tabs.search-tab.js` as the logic owner (alongside `filter-bar.js` for orchestration).
- [x] In `FEATURE_MAP.md`, update the "Book visibility filter" entry to reference `browser-tabs.visibility-tab.js` as the logic owner.

---

## After Implementation
*Implemented: March 5, 2026*

### What changed

- `src/book-browser/browser-tabs/browser-tabs.search-tab.js`
  - Moved the full search row creation and filtering behavior into this file.
  - Kept the existing search tab mount helper in place.
- `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js`
  - Moved visibility mode constants and dropdown/chip behavior into this file.
  - Added `createVisibilitySlice` so visibility behavior is created in one place and reused by the filter bar.
  - Kept the existing visibility tab mount helper in place.
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`
  - Reduced this file to orchestration logic, shared dropdown helpers, and tab bar wiring.
  - Replaced inline search and visibility logic with calls into the search/visibility tab modules.
  - Kept the public API of `createFilterBarSlice` unchanged.
- `src/book-browser/book-browser.js`
  - Updated `BOOK_VISIBILITY_MODES` import to come from `browser-tabs.visibility-tab.js`.
- `ARCHITECTURE.md`
  - Updated module responsibility text for `filter-bar`, `visibility-tab`, and `search-tab`.
- `FEATURE_MAP.md`
  - Updated search feature ownership to include `search-tab.js` as the logic owner.
  - Updated visibility feature ownership to include `visibility-tab.js` as the logic owner.

### Risks / What might break

- This touches tab wiring and dropdown close behavior, so tab switching or outside-click menu closing might behave differently.
- This moves visibility filtering logic to another file, so visibility chips and active states could get out of sync if any wiring was missed.
- This moves search filtering logic to another file, so search-by-entry text or search checkbox behavior might regress.

### Manual checks

- Open the drawer, switch through all tabs, and confirm each tab still shows the same controls as before.
  Success looks like: no empty/broken tabs and no console errors when switching.
- Open Visibility, toggle `All Books`, `All Active`, and a custom multi-select mix, then click outside the menu.
  Success looks like: list visibility updates correctly, chips match the active filter, and the menu closes on outside click.
- Use Search with and without `Entries` checked, using short and long queries.
  Success looks like: book-name filtering works, entry text filtering starts when expected, and clearing the query restores all books.
