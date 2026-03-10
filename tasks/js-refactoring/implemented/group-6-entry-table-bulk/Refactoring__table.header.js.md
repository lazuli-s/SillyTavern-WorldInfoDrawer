# REFACTORING: table.header.js
*Created: July 3, 2026*

**File:** `src/entry-manager/table/table.header.js`
**Findings:** 9 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 3 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **9** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The code that updates the "filter is active" indicator is written twice, once for each normalization mode. This makes the file harder to change because any future tweak (like changing how "active" is calculated) must be done in two places.

**Where:**
- `src/entry-manager/table/table.header.js`, lines 35-43 - updateFilterIndicator when `normalizeFilters === null`
- `src/entry-manager/table/table.header.js`, lines 55-63 - updateFilterIndicator when `normalizeFilters !== null`

**Steps to fix:**
- [x] Extract the shared "compute allValues, ensure defaults, compute isActive, toggle active class" logic into a new function named `updateFilterIndicatorState({ stateKey, stateValuesKey, getValues, normalizeFilters, entryManagerState, menuButton })` near the top of the file.
- [x] Replace the first copy (lines 35-43) with a call to `updateFilterIndicatorState(...)`.
- [x] Replace the second copy (lines 55-63) with a call to `updateFilterIndicatorState(...)`.

---

### [2] DRY-01 - Duplicated code block

**What:** The "default selected filters to all available values" logic is repeated twice in the same branch. This is easy to accidentally change in one place but not the other.

**Where:**
- `src/entry-manager/table/table.header.js`, lines 36-40 - sets `entryManagerState.filters[stateKey]` to all values when empty (inside updateFilterIndicator)
- `src/entry-manager/table/table.header.js`, lines 45-48 - sets `entryManagerState.filters[stateKey]` to all values when empty (inside updateFilters)

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `ensureDefaultFiltersSelected({ stateKey, allValues, entryManagerState })` near the top of the file.
- [x] Replace lines 36-40 with a call to `ensureDefaultFiltersSelected(...)`.
- [x] Replace lines 45-48 with a call to `ensureDefaultFiltersSelected(...)`.

---

### [3] DRY-01 - Duplicated code block

**What:** The "apply updated filters" flow is written twice (once per normalization mode). This repeats the same steps: update the indicator, apply filters, and notify listeners.

**Where:**
- `src/entry-manager/table/table.header.js`, lines 44-52 - updateFilters when `normalizeFilters === null`
- `src/entry-manager/table/table.header.js`, lines 64-69 - updateFilters when `normalizeFilters !== null`

**Steps to fix:**
- [x] Extract the shared "update indicator, apply, notify" steps into a new function named `applyFiltersAndNotify({ updateFilterIndicator, applyFilters, onFilterChange })` near the top of the file.
- [x] Replace the first copy (lines 44-52) with a call to `applyFiltersAndNotify(...)` (keeping any mode-specific setup, like normalization, before the call).
- [x] Replace the second copy (lines 64-69) with a call to `applyFiltersAndNotify(...)` (keeping any mode-specific setup, like normalization, before the call).

---

### [4] DRY-02 - Magic value

**What:** The value `'stwid--state-active'` appears 2 times. It represents the CSS class used to show that a filter is currently active and should be a named constant.

**Where:**
- `src/entry-manager/table/table.header.js`, line 42
- `src/entry-manager/table/table.header.js`, line 62

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const ACTIVE_FILTER_CLASS = 'stwid--state-active';`
- [x] Replace each occurrence of the raw literal with `ACTIVE_FILTER_CLASS`.

---

### [5] NAME-01 - Shape-based name

**What:** `titleDiv` (line 113) describes the element type ("div") rather than its purpose. Reading the name alone does not tell you what the element is for.

**Where:** `src/entry-manager/table/table.header.js`, line 113

**Steps to fix:**
- [x] Rename `titleDiv` to `headerTitle` everywhere it appears in this file.

---

### [6] NAME-01 - Shape-based name

**What:** `tr` (line 162) is a short name based on the HTML tag ("table row") instead of its role. The name does not explain what this row represents.

**Where:** `src/entry-manager/table/table.header.js`, line 162

**Steps to fix:**
- [x] Rename `tr` to `headerRow` everywhere it appears in this file.

---

### [7] NAME-01 - Shape-based name

**What:** `th` (line 164) is a short name based on the HTML tag ("table header cell") instead of its role. The name does not explain what the cell is used for.

**Where:** `src/entry-manager/table/table.header.js`, line 164

**Steps to fix:**
- [x] Rename `th` to `headerCell` everywhere it appears in this file.

---

### [8] SIZE-01 - Large function

**What:** `buildFilterMenu` is 96 lines long (lines 12-107). It is doing too much: it builds the menu DOM and also defines filter update behavior for two modes and also renders all menu options and wires event handlers.

**Where:** `src/entry-manager/table/table.header.js`, lines 12-107

**Steps to fix:**
- [x] Extract the initial DOM creation (lines 13-28) into a new function named `createFilterMenuShell()`. It should create and return `{ menuWrap, menuButton, menu }`.
- [x] Extract the "create update functions for a given mode" logic (lines 30-70) into a new function named `createFilterMenuUpdaters({ stateKey, stateValuesKey, getValues, normalizeFilters, applyFilters, onFilterChange, entryManagerState, menuButton })`. It should return `{ updateFilterIndicator, updateFilters }`.
- [x] Extract the "render options including the change handler" logic (lines 72-100) into a new function named `renderFilterMenuOptions({ options, stateKey, entryManagerState, updateFilters, menu })`. It should add the option elements to `menu`.
- [x] Extract the final wiring and return (lines 102-106) into a new function named `finalizeFilterMenu({ menu, menuButton, menuWrap, updateFilterIndicator })`. It should call `wireMultiselectDropdown(...)`, append `menu`, and return `{ menuWrap, updateFilterIndicator }`.
- [x] Replace the extracted blocks in `buildFilterMenu` with calls to the new functions.

---

### [9] NEST-01 - Deep nesting

**What:** Inside `buildFilterMenu`, the change handler added at line 84 reaches 5 levels of indentation at its deepest point. The innermost logic is hard to follow because the reader must keep multiple conditions in mind at the same time.

**Where:** `src/entry-manager/table/table.header.js`, lines 84-92 (deepest point: lines 86-88)

**Steps to fix:**
- [x] Extract the inner "add or remove optionData.value from filters" logic (lines 85-92) into a new function named `toggleFilterValue({ stateKey, value, isChecked, entryManagerState })`. It should update `entryManagerState.filters[stateKey]` appropriately.
- [x] Replace the nested block inside the event handler with a call to `toggleFilterValue({ stateKey, value: optionData.value, isChecked: inputControl.input.checked, entryManagerState })`.
- [x] Keep the `updateFilters();` call (line 93) after the extracted function call.

---

## After Implementation
*Implemented: March 10, 2026*

### What changed

`src/entry-manager/table/table.header.js`
- Split the large filter-menu builder into small helper functions for shell creation, state updates, option rendering, and final wiring.
- Pulled repeated filter-state logic into shared helpers so the two filter modes follow the same code path.
- Replaced shape-based variable names with purpose-based names and moved the active-filter CSS class into a named constant.

### Risks / What might break

- If another part of this file depended on the old inline filter-update flow, a missed behavior difference could make a filter indicator stop refreshing correctly.
- The normalization path now shares more helper code with the non-normalized path, so a bug in that shared helper would affect both modes.
- Future edits that bypass the new helpers could reintroduce mismatched filter state or indicator behavior.

### Manual checks

- Open the Entry Manager table and open each column filter menu. Success looks like every menu still opens and closes normally.
- Turn filters on and off in both normalized and non-normalized columns. Success looks like the filter button gaining the active style only when not all values are selected.
- Clear a filter selection completely, then use the table again. Success looks like the code restoring the default full selection instead of leaving the column stuck empty.
