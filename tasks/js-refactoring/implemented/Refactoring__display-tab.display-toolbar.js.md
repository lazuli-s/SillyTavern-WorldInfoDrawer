# REFACTORING: display-tab.display-toolbar.js
*Created: July 3, 2026*

**File:** `src/entry-manager/display-tab/display-tab.display-toolbar.js`
**Findings:** 10 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 3 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 3 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 2 |
| **Total** | | **10** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The `clearFilterHandlers` object repeats the same "build a clear handler" pattern 6 times. This makes it harder to add a new filter or change the clear behavior, because you have to edit many near-identical blocks and can accidentally miss one.

**Where:**
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, lines 398-405 - `strategy` clear handler
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, lines 406-413 - `position` clear handler
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, lines 414-421 - `recursion` clear handler
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, lines 422-429 - `outlet` clear handler
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, lines 430-437 - `automationId` clear handler
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, lines 438-445 - `group` clear handler

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `buildClearFilterHandlers({ entryManagerState, filterIndicatorRefs, refresh, getValues, applyFilters })` near the top of the file.
- [x] Inside `buildClearFilterHandlers`, define a small config array (one item per filter key) and generate the handler object from that config instead of writing each property by hand.
- [x] Replace the existing object literal (lines 397-446) with a single call to `buildClearFilterHandlers(...)`.

---

### [2] DRY-02 - Magic value

**What:** The string literal `'Choose which columns are visible'` appears 2 times. It represents the column visibility UI hint text and should be a named constant.

**Where:**
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, line 74
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, line 80

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const COLUMN_VISIBILITY_HINT = 'Choose which columns are visible';`
- [x] Replace each occurrence of the raw literal with `COLUMN_VISIBILITY_HINT`.

---

### [3] DRY-02 - Magic value

**What:** The string literal `'Sort rows in the table'` appears 3 times. It represents the sort UI hint text and should be a named constant.

**Where:**
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, line 165
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, line 168
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, line 171

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const TABLE_SORT_HINT = 'Sort rows in the table';`
- [x] Replace each occurrence of the raw literal with `TABLE_SORT_HINT`.

---

### [4] DRY-02 - Magic value

**What:** The string literal `'Show/hide keyword column text'` appears 2 times. It represents the keys visibility toggle hint text and should be a named constant.

**Where:**
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, line 297
- `src/entry-manager/display-tab/display-tab.display-toolbar.js`, line 301

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const KEYWORD_COLUMN_TEXT_TOGGLE_HINT = 'Show/hide keyword column text';`
- [x] Replace each occurrence of the raw literal with `KEYWORD_COLUMN_TEXT_TOGGLE_HINT`.

---

### [5] NAME-01 - Shape-based name

**What:** `row` (line 293) describes the element's shape (a row/div) rather than its purpose. Reading the name alone does not tell you what UI this element is (it is the display toolbar root container).

**Where:** `src/entry-manager/display-tab/display-tab.display-toolbar.js`, line 293

**Steps to fix:**
- [x] Rename `row` to `displayToolbarRow` everywhere it appears in this file.

---

### [6] SIZE-01 - Large function

**What:** `buildColumnVisibilityDropdown` is 85 lines long (lines 67-151). It is doing too much: it builds the dropdown UI and also defines the "apply + persist" behavior and also adds preset actions and also builds the checkbox option list.

**Where:** `src/entry-manager/display-tab/display-tab.display-toolbar.js`, lines 67-151

**Steps to fix:**
- [x] Extract "create the base DOM structure (container, wraps, button, menu)" (lines 74-85) into a new function named `createColumnVisibilityDropdownDom()`. It should return `{ columnVisibilityContainer, columnVisibilityWrap, menuWrap, menuButton, menu }`.
- [x] Extract "apply new visibility state to entryManagerState + inputs + localStorage + DOM, then close menu" (lines 90-105) into a new function named `applyAndPersistColumnVisibility({ entryManagerState, columnInputs, body, storageKey, applyEntryManagerColumnVisibility, menu })`.
- [x] Extract "add preset actions (SELECT ALL, MAIN COLUMNS)" (lines 120-131) into a new function named `addColumnVisibilityPresetActions({ menu, setColumnVisibility, mainColumnDefaults })`.
- [x] Keep the call to `buildColumnCheckboxOptions(...)` (lines 132-145) but move it into a short "assemble" section after the helpers.
- [x] Replace the extracted blocks in `buildColumnVisibilityDropdown` with calls to the new functions.

---

### [7] SIZE-01 - Large function

**What:** `buildFilterChipDisplay` is 63 lines long (lines 191-253). It is doing too much: it builds the base DOM and also re-renders the entire chip list and also decides which filters are active and also builds each chip element.

**Where:** `src/entry-manager/display-tab/display-tab.display-toolbar.js`, lines 191-253

**Steps to fix:**
- [x] Extract "build one filter chip DOM element" (lines 231-246) into a new function named `buildFilterChip({ headerName, valueLabels, onRemove })`. It should return the chip element.
- [x] Extract "compute filter configs + active filters and render chips" (lines 214-250) into a new function named `renderActiveFilterChips({ chipContainer, entryManagerState, filterConfigs, FILTER_KEY_LABELS, getFilterValueLabels, clearFilterHandlers, activeFiltersEl })`.
- [x] Replace the extracted blocks in `refresh` with calls to the new helpers.

---

### [8] SIZE-01 - Large function

**What:** `buildDisplayToolbar` is 210 lines long (lines 256-465). It is doing too much: it builds multiple unrelated UI sections (keys toggle, columns dropdown, sorting, filters UI) and also creates helper functions and also wires events and also sets up the filter chip display.

**Where:** `src/entry-manager/display-tab/display-tab.display-toolbar.js`, lines 256-465

**Steps to fix:**
- [x] Extract "keys toggle section (container + element + click handler)" (lines 297-318) into a new function named `buildKeysToggle({ body, entryManagerState, storageKey })`. It should return the element to append.
- [x] Extract "filter toggle button (create element + click handler)" (lines 349-362) into a new function named `buildFilterToggle({ dom, entryManagerState, getEntryManagerEntries, updateEntryManagerPreview, clearEntryManagerScriptFilters })`.
- [x] Extract "build FILTER_KEY_LABELS and getFilterValueLabels" (lines 371-389) into a new function named `createFilterValueLabelHelpers({ getStrategyOptions, getPositionOptions, getOutletOptions, getAutomationIdOptions, getGroupOptions })`. It should return `{ FILTER_KEY_LABELS, getFilterValueLabels }`.
- [x] Extract "build clearFilterHandlers + wire refresh" (lines 394-446) into a new function named `buildClearFilterHandlers(...)` (see finding [1]).
- [x] Keep `buildColumnVisibilityDropdown(...)`, `buildSortSelector(...)`, and `buildFilterChipDisplay(...)` calls, but reduce the top-level function to assembling these pieces and returning `{ element, refresh }`.

---

### [9] DEAD-01 - Dead code

**What:** `closeOpenMultiselectDropdownMenus` is imported at line 3 but is never referenced anywhere else in this file.

**Where:** `src/entry-manager/display-tab/display-tab.display-toolbar.js`, line 3

**Steps to fix:**
- [x] Remove the import of `closeOpenMultiselectDropdownMenus` from the import statement on lines 1-8.

---

### [10] DEAD-01 - Dead code

**What:** `initialCollapsed` is declared as a parameter at line 291 but is never referenced anywhere else in this function.

**Where:** `src/entry-manager/display-tab/display-tab.display-toolbar.js`, line 291

**Steps to fix:**
- [x] Remove the `initialCollapsed` parameter from `buildDisplayToolbar` (line 291) if it is not part of an expected external API.
- [x] SKIPPED — The parameter was not part of an external API, so no compatibility comment was needed.

---

## After Implementation
*Implemented: March 10, 2026*

### What changed

`src/entry-manager/display-tab/display-tab.display-toolbar.js`
- Replaced repeated tooltip text with named constants so the same UI hints are defined in one place.
- Split the large toolbar function into smaller helpers for the keys toggle, filter toggle, column dropdown pieces, filter chip rendering, and clear-filter handler generation.
- Removed the unused dropdown helper import and renamed the toolbar root variable to describe its purpose instead of its shape.

`src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`
- Removed the unused `initialCollapsed` argument from the `buildDisplayToolbar(...)` call to match the refactored function signature.

### Risks / What might break

- The extracted helper functions still need to receive the same state and callbacks; if one argument was missed, a toolbar control could stop updating.
- The clear-filter chips now depend on a generated config list, so a future new filter must be added to that list or its clear button will not work.
- Removing the unused argument is safe for the current caller, but any future copied call site that still passes it will now be ignored silently.

### Manual checks

- Open Entry Manager and click the Keys button. Success looks like the keyword text column hiding and showing, and the eye icon changing state.
- Open the Columns dropdown and use both preset actions. Success looks like the visible columns changing immediately and the dropdown closing after each preset.
- Apply several filters, then remove them from the chips. Success looks like each chip disappearing and the table rows updating to match the cleared filter.
