# REFACTORING: sort-helpers.js
*Created: July 3, 2026*

**File:** `src/shared/sort-helpers.js`
**Findings:** 5 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **5** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The file repeats the same "compare two optional numbers, put missing values last, and fall back to a tie-breaker" logic in multiple places. Repeating this logic makes it easier for future changes to accidentally fix one copy but not the other.

**Where:**
- `src/shared/sort-helpers.js`, lines 30-35 - numeric sort comparison (compares `getter(...)` results, handles missing values, then falls back to `defaultCompare`)
- `src/shared/sort-helpers.js`, lines 45-49 - custom sort comparison (compares `display_index`, handles missing values, then continues with a UID tie-breaker)

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `compareFiniteOrMissingNumbers(aValue, bValue, { direction, onTie })` near the top of `sortEntries`.
- [x] Replace the numeric-sort missing-value comparator block (lines 30-35) with a call to `compareFiniteOrMissingNumbers(...)` (use `direction` and `defaultCompare(a, b)` as the tie-breaker).
- [x] Replace the custom-sort missing-value comparator block (lines 45-49) with a call to `compareFiniteOrMissingNumbers(...)` (use direction `1` and a tie-breaker that continues into the UID comparison).

---

### [2] DRY-02 - Magic value

**What:** The value `Number.MAX_SAFE_INTEGER` appears 4 times. It represents "treat missing depth/order as a very large number so it sorts to the end" and should be a named constant.

**Where:**
- `src/shared/sort-helpers.js`, line 75
- `src/shared/sort-helpers.js`, line 76
- `src/shared/sort-helpers.js`, line 77
- `src/shared/sort-helpers.js`, line 78

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const MISSING_NUMBER_SORT_VALUE = Number.MAX_SAFE_INTEGER;`
- [x] Replace each occurrence of `Number.MAX_SAFE_INTEGER` (lines 75-78) with `MISSING_NUMBER_SORT_VALUE`.

---

### [3] DRY-02 - Magic value

**What:** The value `', '` appears 3 times. It represents "the separator used when joining multi-part entry keys into a display string" and should be a named constant.

**Where:**
- `src/shared/sort-helpers.js`, line 16
- `src/shared/sort-helpers.js`, line 62
- `src/shared/sort-helpers.js`, line 67

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const ENTRY_KEY_JOIN_SEPARATOR = ', ';`
- [x] Replace each occurrence of `', '` (lines 16, 62, 67) with `ENTRY_KEY_JOIN_SEPARATOR`.

---

### [4] NAME-01 - Shape-based name

**What:** `x` (line 11) describes neither what the value represents nor what the helper is for. Reading the name alone does not tell you it "unwraps" `y.data` when present (and otherwise returns `y`).

**Where:** `src/shared/sort-helpers.js`, line 11

**Steps to fix:**
- [x] Rename `x` to `unwrapEntry` everywhere it appears in this file.
- [x] Rename the parameter `y` to `entryOrWrapper` (or similar) so the helper reads clearly: `(entryOrWrapper) => entryOrWrapper.data ?? entryOrWrapper`.

---

### [5] SIZE-01 - Large function

**What:** `sortEntries` is 115 lines long (lines 8-122). It is doing too much: it sets default settings values and also defines multiple helper functions and also contains all sort-mode logic in one switch statement.

**Where:** `src/shared/sort-helpers.js`, lines 8-122

**Steps to fix:**
- [x] Extract the "normalize and compare text" helpers (lines 12-24) into top-level functions, for example:
      - `normalizeString(value)` - lower-case string normalization with null/undefined handling
      - `getDefaultTitle(entry)` - current `defaultTitle` logic
      - `createDefaultCompare({ unwrapEntry })` - returns the current `defaultCompare` comparator
- [x] Extract the "string sort" and "numeric sort" builders (lines 18-37) into top-level functions, for example:
      - `createStringSorter({ entries, unwrapEntry, defaultCompare })`
      - `createNumericSorter({ entries, unwrapEntry, defaultCompare, sortDirection })`
- [x] Extract each switch case body into its own small function, for example:
      - `sortByTitle(entries, sortDirection, helpers)`
      - `sortByTrigger(entries, sortDirection, helpers)`
      - `sortByPrompt(entries, sortDirection, helpers)`
      - `sortByLength(entries, sortDirection, helpers)`
      - `sortByCustom(entries, helpers)`
- [x] Keep `sortEntries` as a short coordinator function that:
      - picks `sortLogic` / `sortDirection` defaults
      - selects which `sortByX(...)` function to call
      - applies the final reverse step when needed

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/shared/sort-helpers.js`
- Pulled the entry-unwrapping, string normalization, title fallback, and default comparison helpers up to the top of the file so `sortEntries` no longer defines them inline.
- Replaced duplicated "finite-or-missing number" comparison logic with one shared helper and named constants for missing numeric values and joined key text.
- Split the sort-mode work into smaller helper functions for title, trigger, prompt, length, and custom sorting so `sortEntries` now acts as a coordinator.

### Risks / What might break

- Sorting behavior depends on the new shared numeric comparator, so any mistake there would affect several sort modes at once.
- The renamed unwrap helper is local to this file, but future edits in this file would break if they reintroduce the old short name by mistake.
- Prompt and custom sorting still rely on the previous tie-break rules, so manual checking is useful to confirm the refactor did not flip any ordering edge case.

### Manual checks

- Reload the extension UI and sort a book by Title and Trigger. Success looks like alphabetical order matching the old behavior, including entries with empty comments or keys.
- Sort by Prompt, Depth, Order, and Custom. Success looks like entries with missing numeric values staying at the end and custom order still using UID as the tie-breaker.
- Sort by Length and switch direction. Success looks like shorter and longer entries moving correctly without errors in the browser console.
