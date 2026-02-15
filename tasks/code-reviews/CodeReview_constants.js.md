# CODE REVIEW FINDINGS: `src/constants.js`

*Reviewed: February 15, 2026*

## Scope

- **File reviewed:** `src/constants.js`
- **Helper files consulted:** `src/orderHelperState.js`, `src/orderHelperRender.tableHeader.js`, `src/orderHelperRender.tableBody.js`, `src/orderHelperFilters.js`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Sort enum definitions and sort-direction constants; Order Helper table column/option schema constants (single source of truth)

---

## F01: `SORT_DIRECTION` docstrings are incorrect/misaligned with actual meaning

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The comments that explain what “Ascending” and “Descending” mean are wrong. This won’t break the app directly, but it makes the code harder to understand and increases the chance of future mistakes.

- **Location:**
  `src/constants.js` → `SORT_DIRECTION`

  ```js
  export const SORT_DIRECTION = {
      /** Alphabetical by entry comment (title/memo) */
      ASCENDING: 'ascending',
      /** According to prompt depth (position-depth-order) */
      DESCENDING: 'descending',
  };
  ```

- **Detailed Finding:**
  The JSDoc blocks for `SORT_DIRECTION.ASCENDING` and `SORT_DIRECTION.DESCENDING` appear to be copy/pasted from other sort descriptions (likely `SORT.ALPHABETICAL` and `SORT.PROMPT`). The values themselves (`'ascending'`, `'descending'`) are fine, but the comments currently describe unrelated behaviors.

- **Why it matters:**
  Misleading docs cause “semantic drift”: a future change may implement or wire sort directions incorrectly because the code comments claim the direction values mean something else.

- **Severity:** Low ⭕
- **Confidence:** High 😀
- **Category:** JS Best Practice
- **Reproducing the issue:**
  N/A (documentation bug)

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Update the docstrings so they describe sort direction (ascending vs descending), not a sort type.

- **Proposed fix:**
  In `src/constants.js`, replace the two incorrect comments with direction-accurate descriptions, e.g. “Ascending (A→Z / low→high)” and “Descending (Z→A / high→low)”.

- **Implementation Checklist:**
  - [ ] Update the JSDoc comments for `SORT_DIRECTION.ASCENDING` and `SORT_DIRECTION.DESCENDING` to correctly describe direction semantics.

- **Fix risk:** Low 🟢
  Pure comment change; no runtime effect.

- **Why it's safe to implement:**
  Does not affect any call sites; only changes documentation.

- **Pros:**
  Prevents misunderstandings and future wiring mistakes.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F02: Recursion option values are duplicated across modules — drift risk breaks filters/indicators

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The app defines the same list of recursion options in more than one place. If one list gets updated and the other doesn’t, the UI can become inconsistent (filters may not match what rows show).

- **Location:**
  - `src/constants.js` → `ORDER_HELPER_RECURSION_OPTIONS`
  - `src/orderHelperState.js` → `recursionValues` array inside `createOrderHelperState`

  ```js
  // constants.js
  export const ORDER_HELPER_RECURSION_OPTIONS = [
      { value: 'excludeRecursion',    label: 'Non-recursable' },
      { value: 'preventRecursion',    label: 'Prevent further recursion' },
      { value: 'delayUntilRecursion', label: 'Delay until recursion' },
  ];
  ```

  ```js
  // orderHelperState.js
  const recursionValues = [
      'excludeRecursion',
      'preventRecursion',
      'delayUntilRecursion',
  ];
  ```

- **Detailed Finding:**
  `src/constants.js` positions itself as the “single source of truth” for recursion option labels/values used across Order Helper slices. However, `createOrderHelperState()` independently hardcodes the same values. This creates a maintenance hazard:
  - If a new recursion flag is added, or a value is renamed, the filter header and row rendering may use one set (from `constants.js`) while state initialization uses a different set (from `orderHelperState.js`).
  - The result can be “dead” filter options (filter button shows options that never match rows) or hidden options (rows can match a flag that is not filterable).

- **Why it matters:**
  This is the kind of mismatch that causes confusing UI behavior that looks like “filters are broken” to users, and it’s hard to diagnose because each module appears correct in isolation.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** Redundancy
- **Reproducing the issue:**
  1. (Dev scenario) Change one module’s recursion list (add/remove/rename a value) and forget to change the other.
  2. Open Order Helper and use the Recursion column filter.
  3. Some rows will not filter correctly, or filter options will appear to do nothing.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Ensure recursion option values come from `src/constants.js` only.

- **Proposed fix:**
  In `src/orderHelperState.js`, derive `recursionValues` from `ORDER_HELPER_RECURSION_OPTIONS.map(o => o.value)` by importing `ORDER_HELPER_RECURSION_OPTIONS` from `./constants.js`. Then use that derived array for both `filters.recursion` and `recursionValues`.

- **Implementation Checklist:**
  - [ ] Import `ORDER_HELPER_RECURSION_OPTIONS` into `src/orderHelperState.js`.
  - [ ] Replace the hardcoded `recursionValues = [...]` array with `ORDER_HELPER_RECURSION_OPTIONS.map(({ value }) => value)`.
  - [ ] Keep `state.filters.recursion` initialized from that derived list.

- **Fix risk:** Low 🟢
  Very localized change; values should remain identical.

- **Why it's safe to implement:**
  The runtime behavior stays the same as long as the derived list matches the previous hardcoded one (it currently does).

- **Pros:**
  Eliminates a silent drift vector between state init and UI rendering.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F03: Column-schema “sync” is comment-only — mismatch can silently break column visibility/persistence

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  There are two different lists that describe which columns exist in the Order Helper table. The code only *comments* that they must match, but nothing enforces it. If they drift apart, users can see missing columns, broken toggles, or settings that don’t apply.

- **Location:**
  - `src/constants.js` → `ORDER_HELPER_TOGGLE_COLUMNS`
  - `src/orderHelperState.js` → `ORDER_HELPER_DEFAULT_COLUMNS`

  ```js
  // constants.js
  // Keep ORDER_HELPER_TOGGLE_COLUMNS in sync with ORDER_HELPER_DEFAULT_COLUMNS
  // in orderHelperState.js.
  export const ORDER_HELPER_TOGGLE_COLUMNS = [
      { key: 'strategy', label: 'Strategy' },
      // ...
      { key: 'characterFilter', label: 'Character Filter' },
  ];
  ```

  ```js
  // orderHelperState.js
  const ORDER_HELPER_DEFAULT_COLUMNS = {
      strategy: true,
      // ...
      characterFilter: false,
  };
  ```

- **Detailed Finding:**
  The extension uses:
  - `ORDER_HELPER_TOGGLE_COLUMNS` to drive header/table column definitions and UI labels (what the user can toggle).
  - `ORDER_HELPER_DEFAULT_COLUMNS` to drive persisted default visibility states.

  The file currently relies on developer discipline to keep the sets of keys aligned. There is no guard or assertion to detect:
  - a key present in `ORDER_HELPER_TOGGLE_COLUMNS` but missing in defaults (column exists but can’t persist/show correctly), or
  - a key present in defaults but missing in schema (stored settings apply to nothing).

  Because the mismatch manifests only in certain UI states (e.g., after a localStorage restore), it can be hard to trace.

- **Why it matters:**
  Column visibility is a user-facing preference. Silent drift can make settings feel unreliable (“I turned this column on but it doesn’t stay on”).

- **Severity:** Medium ❗
- **Confidence:** Medium 🤔
  The drift risk is certain; whether it has occurred yet depends on change history.

- **Category:** UI Correctness
- **Reproducing the issue:**
  1. (Dev scenario) Add a new toggleable column to `ORDER_HELPER_TOGGLE_COLUMNS` but forget to add it to `ORDER_HELPER_DEFAULT_COLUMNS`.
  2. Open Order Helper → Column Visibility menu.
  3. Toggle the new column on/off and reload; it may not persist or may render inconsistently.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add a small runtime validation at Order Helper init that checks key-set equality and warns loudly if they drift.

- **Proposed fix:**
  Add a one-time check during Order Helper state creation or renderer init:
  - Compare `Object.keys(ORDER_HELPER_DEFAULT_COLUMNS)` vs `ORDER_HELPER_TOGGLE_COLUMNS.map(c => c.key)`.
  - If they differ, `console.warn` with the missing/extra keys, and fall back safely by:
    - backfilling missing defaults to `false` (hidden), and/or
    - ignoring unknown stored keys.

  (This is a preventative guard; it should not change behavior in the healthy case.)

- **Implementation Checklist:**
  - [ ] Compute the schema key set (`ORDER_HELPER_TOGGLE_COLUMNS` keys) and the default key set.
  - [ ] If sets differ, log a warning listing missing/extra keys.
  - [ ] Ensure state hydration backfills missing keys to a safe default (likely `false`) without throwing.

- **Fix risk:** Medium 🟡
  Even “just warnings” can reveal latent issues; and an automatic backfill/ignore policy can alter behavior in a mismatched state (but that state is already broken).

- **Why it's safe to implement:**
  In the normal, already-synced case, nothing changes besides negligible startup work.

- **Pros:**
  Prevents future regressions from shipping silently; makes drift bugs diagnosable.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F04: Exported “constant” objects/arrays are mutable — accidental mutation can cascade across UI

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Lists like “table columns” are exported as normal JavaScript arrays/objects. Any code that imports them can accidentally change them, and that change would affect the entire extension.

- **Location:**
  `src/constants.js` exports:
  - `SORT`
  - `SORT_DIRECTION`
  - `ORDER_HELPER_TOGGLE_COLUMNS`
  - `ORDER_HELPER_TABLE_COLUMNS`
  - `ORDER_HELPER_NUMBER_COLUMN_KEYS` (Set)
  - `ORDER_HELPER_RECURSION_OPTIONS`

- **Detailed Finding:**
  `export const ...` does not make the underlying data immutable; it only prevents reassignment of the binding. Any importer can still do:
  - `ORDER_HELPER_TOGGLE_COLUMNS.push(...)`
  - `SORT_DIRECTION.ASCENDING = 'desc'`
  - `ORDER_HELPER_RECURSION_OPTIONS[0].label = '...'`
  - `ORDER_HELPER_NUMBER_COLUMN_KEYS.add('...')`

  A single accidental mutation can create non-deterministic UI bugs because it changes shared global configuration at runtime.

  A quick repo search did not find any in-repo mutations of these structures, which suggests freezing may be feasible, but third-party consumers (or future code) could still mutate them unintentionally.

- **Why it matters:**
  Schema constants are foundational: if they are mutated, downstream logic can break in surprising ways (wrong columns, wrong filter indicator behavior, wrong sort options).

- **Severity:** Low ⭕
- **Confidence:** Medium 🤔
  The risk exists by language semantics; whether any mutation happens at runtime depends on future code.

- **Category:** JS Best Practice
- **Reproducing the issue:**
  N/A through end-user UI; this would be triggered by a coding mistake (mutating an imported constant).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make schema exports defensive (freeze, or export builders that return copies).

- **Proposed fix:**
  The smallest, least-invasive approach is:
  - `Object.freeze(SORT)` and `Object.freeze(SORT_DIRECTION)`
  - Freeze arrays: `Object.freeze(ORDER_HELPER_TOGGLE_COLUMNS)`, `Object.freeze(ORDER_HELPER_TABLE_COLUMNS)`, `Object.freeze(ORDER_HELPER_RECURSION_OPTIONS)`
  - Additionally freeze each contained object literal (`{ key, label }`, `{ value, label }`) to prevent nested mutation.
  - Consider freezing `ORDER_HELPER_NUMBER_COLUMN_KEYS` (cannot be truly frozen as a Set; the safe alternative is to avoid exporting the Set instance directly, or to export a function `isOrderHelperNumberColumnKey(key)`).

  🚩 Requires user input: confirm whether any consumer (including future planned work) intentionally mutates these exports at runtime; if so, freezing would be a behavior change and should be avoided.

- **Implementation Checklist:**
  - [ ] Freeze top-level “constant” objects/arrays in `src/constants.js`.
  - [ ] Freeze nested option objects inside exported arrays.
  - [ ] Replace exported mutable `Set` with a non-mutable predicate helper OR document it as read-only and avoid exporting it directly.

- **Fix risk:** Medium 🟡
  Freezing will throw in strict mode (or silently fail) if any existing code mutates these structures; that would surface as runtime errors.

- **Why it's safe to implement:**
  Repo search did not find mutation call sites (no `.push/.splice` etc. on the exported arrays), suggesting current code treats them as read-only.

- **Pros:**
  Makes accidental mutation bugs impossible (or immediately obvious), improving long-term stability.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F05: `SORT` enum names overlap conceptually (TITLE vs ALPHABETICAL) — increases future misuse risk

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Two sort options sound like they do the same thing (“Title” and “Alphabetical”), but they actually refer to different fields. This can confuse future development and lead to the wrong sort being used.

- **Location:**
  `src/constants.js` → `SORT`

  ```js
  export const SORT = {
      TITLE: 'title',
      // ...
      /** Alphabetical by entry comment (title/memo) */
      ALPHABETICAL: 'alphabetical',
      // ...
  };
  ```

- **Detailed Finding:**
  The `SORT` enum includes both `TITLE` (entry title) and `ALPHABETICAL` (entry comment/memo per docstring). The name `ALPHABETICAL` describes a *sorting method*, not a *field*, and overlaps conceptually with several other values (`TITLE`, `TRIGGER`, potentially other alphabetical fields).

  Because `SORT` is used as a cross-module contract (settings, UI labels, sort helper dispatch), ambiguous naming can lead to wiring mistakes.

- **Why it matters:**
  This is a “future bug” trap: when a developer adds a new menu option or reads stored preferences, they might choose `ALPHABETICAL` assuming it means “sort by title”.

- **Severity:** Low ⭕
- **Confidence:** Medium 🤔
  The ambiguity is clear; the practical impact depends on whether `SORT.ALPHABETICAL` is surfaced/used.

- **Category:** Redundancy
- **Reproducing the issue:**
  N/A (design clarity / maintainability issue)

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Avoid renaming the enum value (breaking change); improve clarity via naming comments and UI label mapping.

- **Proposed fix:**
  - Keep the stored value `'alphabetical'` as-is for compatibility.
  - Update documentation/comments to clarify that `ALPHABETICAL` means “Comment/Memo (A→Z)” (or similar).
  - Ensure any UI label mapping (likely in `src/utils.js` / sort option label builders) presents it as “Comment”/“Memo” rather than “Alphabetical”.

- **Implementation Checklist:**
  - [ ] Clarify the `SORT.ALPHABETICAL` docstring to explicitly mention the field (“comment/memo”), not the method.
  - [ ] Ensure UI labels (where sort choices are displayed) don’t present this as a generic “Alphabetical” option.

- **Fix risk:** Low 🟢
  Doc/label changes only (if limited to labels/comments).

- **Why it's safe to implement:**
  Does not change stored sort values or sort behavior.

- **Pros:**
  Reduces the chance of future incorrect wiring without breaking compatibility.

<!-- META-REVIEW: STEP 2 will be inserted here -->