# REFACTORING: logic.state.js
*Created: July 3, 2026*

**File:** `src/entry-manager/logic/logic.state.js`
**Findings:** 6 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **6** |

---

## Findings

### [1] DRY-01 -- Duplicated code block

**What:** Two functions build the same list of `{ value, label }` objects from a `<select>` element. Duplicating the same steps in multiple places makes it easier for the two versions to drift apart over time.

**Where:**
- `src/entry-manager/logic/logic.state.js`, lines 27-36 -- build options for the "strategy" select
- `src/entry-manager/logic/logic.state.js`, lines 40-49 -- build options for the "position" select

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `getSelectOptions(selectQuery, optionSelector = 'option')` near the top of the file.
- [ ] Replace `getStrategyOptions` (lines 27-36) with a call to `getSelectOptions('#entry_edit_template [name="entryStateSelector"]')`.
- [ ] Replace `getPositionOptions` (lines 40-49) with a call to `getSelectOptions('#entry_edit_template [name="position"]')`.
- [ ] Optionally simplify `getStrategyValues` (line 38) and `getPositionValues` (line 51) to a single helper like `getOptionValues(options)` if it stays duplicated elsewhere.

---

### [2] DRY-01 -- Duplicated code block

**What:** There are three similar `try { ... } catch {}` blocks that read localStorage and then apply the result. Repeating this pattern makes it harder to keep behavior consistent (for example: which defaults apply, and how invalid data is handled).

**Where:**
- `src/entry-manager/logic/logic.state.js`, lines 90-96 -- read and apply stored sort settings
- `src/entry-manager/logic/logic.state.js`, lines 97-99 -- read and apply stored hide-keys setting
- `src/entry-manager/logic/logic.state.js`, lines 100-112 -- read and apply stored column visibility settings

**Steps to fix:**
- [ ] Extract a helper function near the top of the file named `readLocalStorageJson(key)` that returns the parsed object or `null` on failure.
- [ ] Extract a helper function near the top of the file named `readLocalStorageString(key)` that returns the raw string or `null` on failure.
- [ ] Update the sort storage block (lines 90-96) to use `readLocalStorageJson(ENTRY_MANAGER_SORT_STORAGE_KEY)`.
- [ ] Update the hideKeys storage block (lines 97-99) to use `readLocalStorageString(ENTRY_MANAGER_HIDE_KEYS_STORAGE_KEY)` (and keep the `=== 'true'` check where it is).
- [ ] Update the columns storage block (lines 100-112) to use `readLocalStorageJson(ENTRY_MANAGER_COLUMNS_STORAGE_KEY)`.

---

### [3] DRY-02 -- Magic value

**What:** The value `'option'` appears 2 times. It represents the HTML option element selector used when reading values from a `<select>`, and should be a named constant so it can be changed in one place if needed.

**Where:**
- `src/entry-manager/logic/logic.state.js`, line 30
- `src/entry-manager/logic/logic.state.js`, line 43

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const SELECT_OPTION_SELECTOR = 'option';`
- [ ] Replace each occurrence of the raw literal with `SELECT_OPTION_SELECTOR`.

---

### [4] NAME-01 -- Shape-based name

**What:** `stored` (line 91) describes that something is "stored", but not what it contains. Reading the name alone does not tell you what settings were loaded, so you have to read the code to understand it.

**Where:** `src/entry-manager/logic/logic.state.js`, line 91

**Steps to fix:**
- [ ] Rename `stored` to `storedSortSettings` everywhere it appears in this file (lines 91-95).
- [ ] If it is exported or referenced in other files, search for it project-wide before renaming. (In this file it is local-only.)

---

### [5] SIZE-01 -- Large function

**What:** `createEntryManagerState` is 62 lines long (lines 53-114). It is doing too much: it builds the default state object and also validates the column schema and also loads and applies three different stored settings.

**Where:** `src/entry-manager/logic/logic.state.js`, lines 53-114

**Steps to fix:**
- [ ] Extract the column schema validation block (lines 54-68) into a new function named `buildCanonicalDefaultColumns()` that returns `{ canonicalDefaultColumns, schemaKeys, recursionValues }` (or a similar small data object).
- [ ] Extract the initial state object construction (lines 69-89) into a new function named `buildInitialEntryManagerState({ canonicalDefaultColumns, recursionValues, SORT, SORT_DIRECTION })`. One sentence on what it does: builds a fully-populated state object with defaults and current option lists.
- [ ] Extract the localStorage application block (lines 90-112) into a new function named `applyStoredEntryManagerState({ state, schemaKeys, canonicalDefaultColumns, SORT, SORT_DIRECTION })`. One sentence on what it does: reads stored settings and applies them to an existing state object.
- [ ] Replace the extracted blocks in `createEntryManagerState` with calls to the new functions.

---

### [6] NEST-01 -- Deep nesting

**What:** Inside `createEntryManagerState`, the block starting at line 100 reaches 5 levels of indentation. The deepest nesting happens at the `if (typeof storedColumns[key] === 'boolean')` check (line 105), inside a `for` loop (line 103), inside an `if` (line 102), inside a `try` (line 100).

**Where:** `src/entry-manager/logic/logic.state.js`, lines 100-112 (deepest point: line 105)

**Steps to fix:**
- [ ] Extract the inner loop block (lines 103-110) into a new function named `applyStoredColumns({ state, storedColumns, schemaKeys, canonicalDefaultColumns })`. One sentence on what it does: updates `state.columns` using validated stored values and known schema keys.
- [ ] Replace the loop with a call to `applyStoredColumns(...)` after `storedColumns` is loaded and validated.
- [ ] If you implement the DRY-01 localStorage helpers, use them here so this logic only focuses on applying the columns, not reading storage.