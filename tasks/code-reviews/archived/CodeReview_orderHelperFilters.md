# CODE REVIEW FINDINGS: `src/orderHelperFilters.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/orderHelperFilters.js`
- **Helper files consulted:** `FEATURE_MAP.md`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** "Structured row filters (strategy, position, recursion, outlet, automation ID, group)" — implements filtering logic for Order Helper table rows.

---

## F01: Massive Code Duplication in Filter Functions

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The file has 6 almost identical functions that all do the same thing: check if an entry matches selected filter values. The only differences are which filter type they're checking (strategy, position, etc.). This means any bug fix or improvement has to be made 6 times, which is error-prone.

- **Category:** Redundancy

- **Location:**
  `src/orderHelperFilters.js` — Lines 77-82, 95-100, 123-135, 147-152, 164-169, 181-188
  Functions: `applyOrderHelperStrategyFilterToRow`, `applyOrderHelperPositionFilterToRow`, `applyOrderHelperRecursionFilterToRow`, `applyOrderHelperOutletFilterToRow`, `applyOrderHelperAutomationIdFilterToRow`, `applyOrderHelperGroupFilterToRow`

- **Detailed Finding:**
  Each filter function follows an identical pattern:
  1. Get allowed values from state or use getter fallback
  2. Check if values array is empty (early return if so)
  3. Create a Set from the filter selection
  4. Extract the entry's value for this filter type
  5. Call `setOrderHelperRowFilterState` with the negated match result
  
  The only variations are:
  - `orderHelperState.xxxValues` vs `getXxxValues()`
  - `orderHelperState.filters.xxx`
  - How the entry value is extracted (e.g., `entryState(entryData)`, `entryData.position`, `getOutletValue(entryData)`)

  This is approximately 90 lines of nearly identical code that could be abstracted into a single reusable function.

- **Why it matters:**
  - Maintenance burden: Bug fixes must be applied in 6 places
  - Inconsistency risk: It's easy to update 5 functions and miss the 6th
  - Readability: The file is ~320 lines when it could be ~150 with proper abstraction
  - Testing: Each function would need separate test coverage for the same logic

- **Severity:** Medium ❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Create a generic filter application function that takes the filter configuration as parameters, reducing the 6 specialized functions to calls to one generic implementation.

- **Proposed fix:**
  Create a unified filter function that accepts: values array, getter fallback, filter key, entry value extractor function, and optional value transformer. Each specific filter becomes a one-line call to this generic function.

- **Implementation Checklist:**
  - [ ] Create `applyGenericFilterToRow(row, entryData, config)` helper
  - [ ] Create `applyGenericFilters(config)` batch helper  
  - [ ] Refactor each specific filter function to call the generic implementation
  - [ ] Verify all existing behavior is preserved (empty array early return, Set creation, negation logic)

- **Fix risk:** Low 🟢
  The change is purely structural refactoring with no behavior changes. The existing functions can remain as thin wrappers that call the generic implementation, maintaining backward compatibility with any callers.

- **Why it's safe to implement:**
  - No external API changes
  - No DOM structure changes
  - No state management changes
  - Pure code organization improvement

- **Pros:**
  - Easier maintenance
  - Reduced bug surface
  - Better testability (test one function instead of six)
  - Clearer code intent

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F02: Multiple Passes Over Same Data in Batch Filters

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When multiple filters are applied at the same time, the code loops through all entries once for each filter type. For a book with 500 entries and 6 filter types, that's 3,000 row operations instead of 500.

- **Category:** Performance

- **Location:**
  `src/orderHelperFilters.js` — Lines 192-256
  Functions: `applyOrderHelperStrategyFilters`, `applyOrderHelperPositionFilters`, `applyOrderHelperRecursionFilters`, `applyOrderHelperOutletFilters`, `applyOrderHelperAutomationIdFilters`, `applyOrderHelperGroupFilters`

- **Detailed Finding:**
  Each batch filter function:
  1. Calls `getOrderHelperEntries(orderHelperState.book, true)` to get entries
  2. Precomputes values/allowed sets
  3. Loops through entries to apply the filter
  
  If a user interaction triggers multiple filters (e.g., changing visibility scope refreshes several filter types), each batch filter re-fetches entries and re-loops through them. The entries are fetched fresh each time, and the DOM rows are accessed fresh each time (`dom.order.entries?.[entry.book]?.[entry.data.uid]`).

  For large lorebooks (hundreds of entries), this creates unnecessary work. While modern browsers handle this reasonably well, it's inefficient and could cause UI jank on very large datasets.

- **Why it matters:**
  - Unnecessary CPU cycles on the main thread
  - Potential frame drops during filter updates on large books
  - Inefficient memory access patterns (repeated DOM queries)

- **Severity:** Low ⭕

- **Confidence:** Medium 🤔
  The performance impact depends on book size and how filters are triggered. For typical usage (books under 100 entries), this is negligible. It only becomes noticeable with very large books (500+ entries).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Provide a unified batch filter function that applies all active filters in a single pass over the entries.

- **Proposed fix:**
  Create `applyAllOrderHelperFilters()` that:
  1. Fetches entries once
  2. Precomputes all filter Sets once
  3. Single loop through entries applying all filter types
  4. Single call to `updateOrderHelperRowFilterClass` per row

- **Implementation Checklist:**
  - [ ] Create `applyAllOrderHelperFilters(filterTypes)` function
  - [ ] Accept optional filterTypes array to limit which filters to apply (for partial updates)
  - [ ] Precompute all Sets before the loop
  - [ ] Single pass through entries applying all specified filters
  - [ ] Update callers to use the unified function when multiple filters change

- **Fix risk:** Low 🟢
  The existing individual batch functions can remain as thin wrappers. New code path is additive.

- **Why it's safe to implement:**
  - Existing functions preserved as wrappers
  - No changes to DOM or state structures
  - Performance optimization only

- **Pros:**
  - Better performance on large datasets
  - Fewer DOM accesses
  - Cleaner API for multi-filter updates

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F03: Missing Input Validation in normalizeGroupValuesForFilter

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  A helper function that processes group values accepts any type of input but only handles arrays, null, and "other" (treated as single value). If something unexpected is passed (like an object or function), it may behave strangely.

- **Category:** JS Best Practice

- **Location:**
  `src/orderHelperFilters.js` — Lines 43-50
  Function: `normalizeGroupValuesForFilter`

- **Detailed Finding:**
  ```javascript
  const normalizeGroupValuesForFilter = (groupValues)=>{
      if (Array.isArray(groupValues)) {
          if (!groupValues.length) return [''];
          return groupValues.map((value)=>String(value ?? '').trim());
      }
      if (groupValues == null) return [''];
      return [String(groupValues).trim()];
  };
  ```
  
  The function handles:
  - Arrays: maps to string trimmed values
  - null/undefined: returns `['']`
  - Everything else: converts to string and wraps in array
  
  However, if `groupValues` is:
  - An object without `Symbol.iterator`: `String(groupValues)` returns `"[object Object]"`
  - A function: `String(groupValues)` returns the function source code
  - A Symbol: throws TypeError (cannot convert Symbol to string)
  
  While these are edge cases, defensive programming would handle them explicitly.

- **Why it matters:**
  - Defensive coding prevents hard-to-debug errors
  - Silent failures (object → "[object Object]") produce confusing filter behavior
  - Symbol inputs would throw uncaught exceptions

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add explicit type validation and handle edge cases gracefully.

- **Proposed fix:**
  Add type checking for objects/functions and handle Symbol case. Consider logging a warning for unexpected types in development.

- **Implementation Checklist:**
  - [ ] Add check for `typeof groupValues === 'object'` (non-array) and handle appropriately
  - [ ] Add check for `typeof groupValues === 'function'` 
  - [ ] Wrap String() conversion in try-catch or pre-check for Symbol
  - [ ] Consider adding a dev-mode warning for unexpected types

- **Fix risk:** Low 🟢
  This is a pure addition of defensive checks. Current behavior for valid inputs unchanged.

- **Why it's safe to implement:**
  - Only adds validation, no behavior changes for valid inputs
  - Makes invalid inputs fail more gracefully

- **Pros:**
  - More robust code
  - Easier debugging when bad data is passed
  - Prevents cryptic runtime errors

<!-- META-REVIEW: STEP 2 will be inserted here -->