# REFACTORING: logic.filters.js
*Created: July 3, 2026*

**File:** `src/entry-manager/logic/logic.filters.js`
**Findings:** 7 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 4 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **7** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** Five different functions repeat the same "normalize selected filters" steps (build a Set of allowed values, then filter the input list). This makes the file longer and increases the chance that one filter type gets updated differently than the others.

**Where:**
- `src/entry-manager/logic/logic.filters.js`, lines 15-18 - normalize strategy filters
- `src/entry-manager/logic/logic.filters.js`, lines 20-23 - normalize position filters
- `src/entry-manager/logic/logic.filters.js`, lines 25-28 - normalize outlet filters
- `src/entry-manager/logic/logic.filters.js`, lines 30-33 - normalize automation id filters
- `src/entry-manager/logic/logic.filters.js`, lines 35-38 - normalize group filters

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `normalizeAllowedFilters(filters, allowedValues)` near the top of the file.
- [x] Update `normalizeStrategyFilters` (lines 15-18) to call `normalizeAllowedFilters(filters, getStrategyValues())`.
- [x] Update `normalizePositionFilters` (lines 20-23) to call `normalizeAllowedFilters(filters, getPositionValues())`.
- [x] Update `normalizeOutletFilters` (lines 25-28) to call `normalizeAllowedFilters(filters, getOutletValues())`.
- [x] Update `normalizeAutomationIdFilters` (lines 30-33) to call `normalizeAllowedFilters(filters, getAutomationIdValues())`.
- [x] Update `normalizeGroupFilters` (lines 35-38) to call `normalizeAllowedFilters(filters, getGroupValues())`.

---

### [2] DRY-01 - Duplicated code block

**What:** Several "apply filter to one row" functions share the same structure (pick the full list of possible values, early-exit if there are no values, compute a Set of allowed values, compute the row's value, then mark the row as filtered or not). Keeping these separate makes it easy for them to drift apart over time.

**Where:**
- `src/entry-manager/logic/logic.filters.js`, lines 76-89 - apply strategy filter to one row
- `src/entry-manager/logic/logic.filters.js`, lines 91-105 - apply position filter to one row
- `src/entry-manager/logic/logic.filters.js`, lines 129-142 - apply outlet filter to one row
- `src/entry-manager/logic/logic.filters.js`, lines 144-157 - apply automation id filter to one row
- `src/entry-manager/logic/logic.filters.js`, lines 159-173 - apply group filter to one row

**Steps to fix:**
- [x] Extract the shared pattern into a new helper function named `applySimpleSetFilterToRow({ row, entryData, precomputed, valuesFromState, valuesFromSource, allowedFromState, datasetKey, getEntryValue })` near the other row helper functions.
- [x] Replace the strategy implementation (lines 76-89) with a call to the shared helper.
- [x] Replace the position implementation (lines 91-105) with a call to the shared helper.
- [x] Replace the outlet implementation (lines 129-142) with a call to the shared helper.
- [x] Replace the automation id implementation (lines 144-157) with a call to the shared helper.
- [x] Replace the group implementation (lines 159-173) with a call to the shared helper.
- [x] Keep `applyEntryManagerRecursionFilterToRow` (lines 107-127) separate for now since it has extra logic (flags, partial selection, and matching rules).

---

### [3] DRY-01 - Duplicated code block

**What:** Multiple "apply filter to all entries in the book" functions do the same loop (load entries, compute precomputed values, find each row in `dom.order.entries`, then call the per-row apply function). This duplicates both the iteration logic and the DOM lookup logic.

**Where:**
- `src/entry-manager/logic/logic.filters.js`, lines 175-186 - apply strategy filter to all entries
- `src/entry-manager/logic/logic.filters.js`, lines 188-200 - apply position filter to all entries
- `src/entry-manager/logic/logic.filters.js`, lines 218-229 - apply outlet filter to all entries
- `src/entry-manager/logic/logic.filters.js`, lines 231-242 - apply automation id filter to all entries
- `src/entry-manager/logic/logic.filters.js`, lines 244-255 - apply group filter to all entries

**Steps to fix:**
- [x] Extract the shared "iterate entries and resolve row elements" logic into a helper function named `forEachEntryRowInBook(book, callback)` near the other shared helpers.
- [x] Replace the strategy loop (lines 175-186) with a call to `forEachEntryRowInBook(...)`.
- [x] Replace the position loop (lines 188-200) with a call to `forEachEntryRowInBook(...)`.
- [x] Replace the outlet loop (lines 218-229) with a call to `forEachEntryRowInBook(...)`.
- [x] Replace the automation id loop (lines 231-242) with a call to `forEachEntryRowInBook(...)`.
- [x] Replace the group loop (lines 244-255) with a call to `forEachEntryRowInBook(...)`.
- [x] Decide whether to also move recursion handling (lines 202-216) to this shared helper. It has extra precomputed fields but the row iteration pattern is the same.

---

### [4] DRY-01 - Duplicated code block

**What:** Five "sync filters with latest available values" functions share the same decision tree (refresh available values, detect if "all were selected", clear selection when no values exist, otherwise select all or normalize the current selection). This repeats the same business rules in multiple places.

**Where:**
- `src/entry-manager/logic/logic.filters.js`, lines 265-278 - sync strategy filters
- `src/entry-manager/logic/logic.filters.js`, lines 280-293 - sync position filters
- `src/entry-manager/logic/logic.filters.js`, lines 295-308 - sync outlet filters
- `src/entry-manager/logic/logic.filters.js`, lines 310-323 - sync automation id filters
- `src/entry-manager/logic/logic.filters.js`, lines 325-338 - sync group filters

**Steps to fix:**
- [x] Extract the shared sync logic into a helper function named `syncSelectableFilters({ getNextValues, getPrevValues, getSelectedFilters, setNextValues, setSelectedFilters, normalizeSelectedFilters })`.
- [x] Replace the strategy sync implementation (lines 265-278) with a call to the shared helper.
- [x] Replace the position sync implementation (lines 280-293) with a call to the shared helper.
- [x] Replace the outlet sync implementation (lines 295-308) with a call to the shared helper.
- [x] Replace the automation id sync implementation (lines 310-323) with a call to the shared helper.
- [x] Replace the group sync implementation (lines 325-338) with a call to the shared helper.

---

### [5] DRY-02 - Magic value

**What:** Several dataset key strings are repeated. These strings represent "which filter flag lives in the row.dataset", so repeating them makes it easier to mistype one and harder to change the naming later.

**Where:**
- `src/entry-manager/logic/logic.filters.js`, lines 83 and 88 - `'stwidFilterStrategy'`
- `src/entry-manager/logic/logic.filters.js`, lines 98 and 104 - `'stwidFilterPosition'`
- `src/entry-manager/logic/logic.filters.js`, lines 110, 116, and 126 - `'stwidFilterRecursion'`
- `src/entry-manager/logic/logic.filters.js`, lines 136 and 141 - `'stwidFilterOutlet'`
- `src/entry-manager/logic/logic.filters.js`, lines 151 and 156 - `'stwidFilterAutomationId'`
- `src/entry-manager/logic/logic.filters.js`, lines 166 and 172 - `'stwidFilterGroup'`

**Steps to fix:**
- [x] At the top of the file (after imports), add a single mapping object, for example: `const FILTER_DATASET_KEYS = { strategy: 'stwidFilterStrategy', position: 'stwidFilterPosition', recursion: 'stwidFilterRecursion', outlet: 'stwidFilterOutlet', automationId: 'stwidFilterAutomationId', group: 'stwidFilterGroup' };`
- [x] Replace each repeated string literal with the corresponding `FILTER_DATASET_KEYS.*` entry.

---

### [6] NAME-01 - Shape-based name

**What:** `key` (line 70) describes the variable as a generic "key" rather than saying what it is for. Reading the name alone does not tell you that it must be a dataset field name like `'stwidFilterStrategy'`.

**Where:** `src/entry-manager/logic/logic.filters.js`, line 70

**Steps to fix:**
- [x] Rename `key` to `datasetFlagKey` everywhere it appears in this file.
- [x] If this function is called from other files (not visible here), search for it project-wide before renaming call sites.

---

### [7] SIZE-01 - Large function

**What:** `createEntryManagerFilters` is 353 lines long (lines 14-366). It is doing too much: it defines normalization helpers and also defines row filter state helpers and also implements per-row filter logic for multiple filter types and also implements per-book bulk apply logic and also implements filter value syncing and also exports a public API.

**Where:** `src/entry-manager/logic/logic.filters.js`, lines 14-366

**Steps to fix:**
- [x] Extract the normalization helpers (lines 15-47) into a new function named `createFilterNormalizers()` that returns `{ normalizeStrategyFilters, normalizePositionFilters, normalizeOutletFilters, normalizeAutomationIdFilters, normalizeGroupFilters, normalizeGroupValuesForFilter }`.
- [x] Extract the shared row-state helpers (lines 49-74) into a new function named `createRowFilterStateHelpers()` that returns `{ setEntryManagerRowFilterState }` (and keeps `updateEntryManagerRowFilterClass` private inside that helper).
- [x] Extract the per-row filter functions (lines 76-173) into a new function named `createRowFilterAppliers()` that returns the `applyEntryManager*FilterToRow` functions.
- [x] Extract the per-book apply functions (lines 175-255) into a new function named `createBookFilterAppliers()` that returns the `applyEntryManager*Filters` functions.
- [x] Extract the remaining helpers (lines 257-338) into a new function named `createFilterSyncHelpers()` that returns `{ clearEntryManagerScriptFilters, syncEntryManagerStrategyFilters, syncEntryManagerPositionFilters, syncEntryManagerOutletFilters, syncEntryManagerAutomationIdFilters, syncEntryManagerGroupFilters }`.
- [x] Keep `createEntryManagerFilters` as a small coordinator that calls the helper factories and returns the final public API object (lines 340-365).

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

[`src/entry-manager/logic/logic.filters.js`](C:/ST Test/SillyTavern/data/default-user/extensions/SillyTavern-WorldInfoDrawer/src/entry-manager/logic/logic.filters.js)
- Pulled repeated filter normalization, per-row filter logic, per-book row iteration, and filter syncing into small shared helpers.
- Added one `FILTER_DATASET_KEYS` mapping so dataset flag names live in one place instead of being repeated across the file.
- Reduced `createEntryManagerFilters` to a coordinator that assembles helper factories and returns the same public filter API.

### Risks / What might break

- If any caller depended on internal implementation details rather than the returned API, that code would no longer match the new structure.
- Filter behavior now flows through shared helpers, so a mistake in one helper could affect several filter types at once.
- Dataset flag names are centralized now, so any typo in the mapping would affect row filtered-state styling across multiple filters.

### Manual checks

- Open Entry Manager and change strategy, position, outlet, automation ID, and group filters. Success looks like the same rows hiding or dimming as before.
- Change available filter values by switching books or entries, then reopen the filters. Success looks like selected values staying valid and invalid old selections being removed.
- Use script filtering together with the structured filters. Success looks like rows keeping the correct filtered styling when both systems are active.
