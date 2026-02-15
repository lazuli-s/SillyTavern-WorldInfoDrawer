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

- **Fix risk:** Low 🟢
  Pure comment change; no runtime effect.

- **Why it's safe to implement:**
  Does not affect any call sites; only changes documentation.

- **Pros:**
  Prevents misunderstandings and future wiring mistakes.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ `src/constants.js` currently has incorrect docstrings on `SORT_DIRECTION.ASCENDING` / `DESCENDING`. This is directly visible in the reviewed source.

- **Top risks:**
  - Very low implementation risk (comment-only), but moderate *review* risk: the Step 1 review includes an unverified “copy/paste from other sort descriptions” claim which is plausible but not required to justify the fix.

#### Technical Accuracy Audit

> *“The JSDoc blocks … appear to be copy/pasted from other sort descriptions …”*

- **Why it may be wrong/speculative:**
  The repo contains similar docstrings on `SORT` values, but proving copy/paste origin is not possible from current evidence. The claim is not necessary for the core finding.

- **Validation:** Validated ✅
  The docstrings are definitively wrong regardless of origin.

#### Fix Quality Audit

- **Direction:**
  Sound and within `src/constants.js` responsibilities (docstrings on exported enums).

- **Behavioral change:**
  None.

- **Ambiguity:**
  None.

- **Checklist:**
  Step 1 checklist was actionable and complete for this change.

- **Dependency integrity:**
  No cross-finding dependency.

- **Fix risk calibration:**
  “Low” is accurate.

- **"Why it's safe" validity:**
  Specific and verifiable (comment-only).

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Update the JSDoc comments for `SORT_DIRECTION.ASCENDING` and `SORT_DIRECTION.DESCENDING` to correctly describe direction semantics.

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

- **Fix risk:** Low 🟢
  Very localized change; values should remain identical.

- **Why it's safe to implement:**
  The runtime behavior stays the same as long as the derived list matches the previous hardcoded one (it currently does).

- **Pros:**
  Eliminates a silent drift vector between state init and UI rendering.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ `ORDER_HELPER_RECURSION_OPTIONS` is defined in `src/constants.js` with the three recursion flags.
  - ✅ `createOrderHelperState()` in `src/orderHelperState.js` separately hardcodes `recursionValues` with the same three strings.
  - ✅ `ORDER_HELPER_RECURSION_OPTIONS` is used by the header filter UI and row cell rendering (imported in `orderHelperRender.actionBar.js`, `orderHelperRender.tableHeader.js`, `orderHelperRender.tableBody.js`).

- **Top risks:**
  - Low. This is a textbook “duplicate contract values” drift risk.
  - Ensure the import direction doesn’t create a circular dependency (`orderHelperState.js` currently has no imports; adding an import from `constants.js` is safe and is already the intended contract boundary).

#### Technical Accuracy Audit

> *“The result can be dead filter options … or hidden options …”*

- **Why it may be wrong/speculative:**
  It depends on what drifts and where (state init vs UI schema), but the risk scenario is plausible.

- **Validation:** Validated ✅
  If either list drifts, state defaults and UI options can become inconsistent; this is supported by the current architecture (state init + UI schema are in separate modules).

#### Fix Quality Audit

- **Direction:**
  Sound; keeps contract values in `src/constants.js` (per module responsibility).

- **Behavioral change:**
  None in the healthy case (values remain identical).

- **Ambiguity:**
  None.

- **Checklist:**
  Actionable and complete.

- **Dependency integrity:**
  No dependency on other findings, though it pairs well with F03’s “schema drift guard” if implemented later.

- **Fix risk calibration:**
  “Low” is accurate.

- **"Why it's safe" validity:**
  Specific: “derived list matches previous list” is verifiable.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Import `ORDER_HELPER_RECURSION_OPTIONS` into `src/orderHelperState.js`.
- [ ] Replace the hardcoded `recursionValues = [...]` array with `ORDER_HELPER_RECURSION_OPTIONS.map(({ value }) => value)`.
- [ ] Keep `state.filters.recursion` initialized from that derived list.

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

- **Fix risk:** Medium 🟡
  Even “just warnings” can reveal latent issues; and an automatic backfill/ignore policy can alter behavior in a mismatched state (but that state is already broken).

- **Why it's safe to implement:**
  In the normal, already-synced case, nothing changes besides negligible startup work.

- **Pros:**
  Prevents future regressions from shipping silently; makes drift bugs diagnosable.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ There are currently *two* separate key-sets that must stay in sync:
    - `ORDER_HELPER_TOGGLE_COLUMNS` keys in `src/constants.js`
    - `ORDER_HELPER_DEFAULT_COLUMNS` keys in `src/orderHelperState.js`
  - ✅ There is no runtime validation today; only a comment warns about sync.

- **Top risks:**
  - The Step 1 plan is directionally correct but under-specified: it suggests warning + “backfill and/or ignore” without choosing a single deterministic policy.
  - Any automatic backfill policy is a **Behavior Change Required** in *mismatched* states (not in the healthy state). The review should explicitly label and constrain that behavior.

#### Technical Accuracy Audit

> *“Mismatch can silently break column visibility/persistence …”*

- **Why it may be wrong/speculative:**
  The exact failure mode depends on which side drifts and how the UI is wired.

- **Validation:** Validated ✅
  The current wiring makes mismatch possible and hard to diagnose:
  - The Column Visibility menu iterates `ORDER_HELPER_TOGGLE_COLUMNS`.
  - State hydration only iterates `ORDER_HELPER_DEFAULT_COLUMNS` keys.
  - `applyOrderHelperColumnVisibility()` toggles CSS classes based on `Object.entries(orderHelperState.columns)`.

  This can produce “column exists but default/hydration ignores it” and vice-versa.

- **What needs to be done/inspected to successfully validate:**
  Not required; the drift hazard is structural and observable from code.

#### Fix Quality Audit

- **Direction:**
  Sound. This belongs in Order Helper state init/hydration (module boundary is acceptable; no architecture changes needed).

- **Behavioral change:**
  **Behavior Change Required** only when keys drift:
  - Choosing a backfill default (e.g., missing keys default to `false`) changes what a user sees in a mismatched state.
  - This should be explicitly declared and constrained to “only when mismatch detected”.

- **Ambiguity:**
  Step 1 proposes multiple alternatives (“backfill and/or ignore”) which is ambiguous. Must pick one.

- **Checklist:**
  Not implementation-ready as written; it doesn’t specify:
  - where the check should live (state creation vs renderer init),
  - what the exact backfill/ignore policy is,
  - how to ensure `orderHelperState.columns` contains the canonical schema keys.

- **Dependency integrity:**
  This finding overlaps with F02 (schema constants as source of truth). If you import from `constants.js` for recursion values, it’s consistent to do the same for column schema validation.

- **Fix risk calibration:**
  “Medium” is reasonable because it touches persisted preferences and can change behavior when mismatch exists.

- **"Why it's safe" validity:**
  Valid for the healthy case, but incomplete for the mismatch case unless the fallback policy is clearly defined.

- **Verdict:** Implementation plan needs revision 🟡

#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Step 1 checklist is ambiguous about fallback policy and does not specify how schema keys are made canonical in `orderHelperState.columns`.
> Revisions applied: Pinned the fix to `createOrderHelperState()` (single init point) and defined a deterministic policy: warn on mismatch, backfill missing schema keys to `false` in defaults/state, and ignore stored unknown keys.

- [ ] In `src/orderHelperState.js`, import `ORDER_HELPER_TOGGLE_COLUMNS` from `./constants.js` and compute `schemaKeys = ORDER_HELPER_TOGGLE_COLUMNS.map(({ key }) => key)`.
- [ ] Add a one-time validation inside `createOrderHelperState()`:
  - Compare `schemaKeys` vs `Object.keys(ORDER_HELPER_DEFAULT_COLUMNS)`.
  - If mismatch, `console.warn` listing `missingInDefaults` and `extraInDefaults`.
- [ ] Define the canonical column defaults as:
  - Start from `{ ...ORDER_HELPER_DEFAULT_COLUMNS }`
  - For each `key` in `schemaKeys` missing from defaults, add `key: false` (explicit **Behavior Change Required** only in mismatch state).
- [ ] When hydrating `storedColumns`, apply only keys in `schemaKeys` (ignore unknown stored keys), and always backfill missing schema keys to their canonical defaults.
- [ ] Ensure `orderHelperState.columns` contains *all* `schemaKeys` so `applyOrderHelperColumnVisibility()` can consistently toggle CSS classes.

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

- **Fix risk:** Medium 🟡
  Freezing will throw in strict mode (or silently fail) if any existing code mutates these structures; that would surface as runtime errors.

- **Why it's safe to implement:**
  Repo search did not find mutation call sites (no `.push/.splice` etc. on the exported arrays), suggesting current code treats them as read-only.

- **Pros:**
  Makes accidental mutation bugs impossible (or immediately obvious), improving long-term stability.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ In ES modules, exported object/array *bindings* are immutable, but the underlying objects/arrays/sets are still mutable (language semantics).
  - ✅ The repo uses these exports as shared schema/contract across Order Helper modules (multiple imports from `./constants.js`).

- **Top risks:**
  - The Step 1 review adds a 🚩 “Requires user input” flag that is not actually required for validation: we can validate current in-repo behavior via code search (which Step 1 already partially did).
  - The Step 1 proposal mixes multiple strategies (freeze everything vs export predicate for the Set) without selecting a single minimal plan.
  - Freezing is a **Behavior Change Required** only if any runtime mutation exists (currently not evidenced). The plan should explicitly include a hard “no mutation call sites” validation step.

#### Technical Accuracy Audit

> *“Repo search did not find mutation call sites … suggests current code treats them as read-only.”*

- **Why it may be wrong/speculative:**
  Search can miss dynamic mutation (e.g., bracket access, indirect aliases), but in this repo the constants are imported by name and used directly; that lowers the likelihood of missed mutations.

- **Validation:** Needs extensive analysis ❌
  Proving *absence* of all mutation paths in all runtime contexts is not feasible from static inspection alone.

- **What needs to be done/inspected to successfully validate:**
  - Perform a targeted repo search for common mutation operations on these identifiers (e.g., `.push`, `.splice`, `.add`, property assignment).
  - If implementing freezing: ensure there is no code that intentionally mutates these exports during init (including dev/hot-reload helpers).
  - If possible, run the extension and open Order Helper to ensure no runtime exceptions are thrown after freezing.

#### Fix Quality Audit

- **Direction:**
  Direction is reasonable (defensive immutability for schema constants), but the validation burden is understated.

- **Behavioral change:**
  Potential behavior change if any mutation exists (would surface as exceptions in strict mode). This must be declared and mitigated by narrowing scope.

- **Ambiguity:**
  Multiple fix options are proposed; the plan needs to pick one minimal approach.

- **Checklist:**
  Step 1 checklist is incomplete because it does not include:
  - a concrete “prove no mutations” validation step (at least via repo search), and
  - a pinned decision for the Set (`keep as Set but treat as read-only` vs `replace with predicate`).

- **Dependency integrity:**
  Touching `ORDER_HELPER_NUMBER_COLUMN_KEYS` impacts `orderHelperRender.tableHeader.js` (and possibly other slices). This must be explicitly included if the Set is replaced.

- **Fix risk calibration:**
  “Medium” is plausible, but the reason should be “can throw at runtime if hidden mutation exists”, not “freezing is generally risky”.

- **"Why it's safe" validity:**
  As written, it’s too vague (“repo search did not find…”) unless it names exact search terms and/or call sites.

- **Mitigation:**
  If freezing is implemented, keep it limited to the arrays/objects (not the Set) for the first pass, to minimize cross-file blast radius.

- **Verdict:** Implementation plan discarded 🔴
  Needs extensive analysis ❌ is TRUE (absence-of-mutation proof and runtime validation cannot be completed purely by inspection in this workflow).

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

- **Fix risk:** Low 🟢
  Doc/label changes only (if limited to labels/comments).

- **Why it's safe to implement:**
  Does not change stored sort values or sort behavior.

- **Pros:**
  Reduces the chance of future incorrect wiring without breaking compatibility.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ `SORT.ALPHABETICAL` exists as a constant and is handled in `src/sortHelpers.js`.
  - ✅ `src/utils.js`’s `SORT_OPTIONS` currently does **not** surface `SORT.ALPHABETICAL` in any dropdown labels; therefore “UI label mapping” is not evidenced for this option.

- **Top risks:**
  - The Step 1 impact scenario (“developer might choose ALPHABETICAL thinking it means title”) is plausible but not evidence-backed because the option is not currently exposed via UI label lists.
  - The Step 1 finding misses a more concrete drift: `SORT.TITLE` is documented as “entry title”, but `sortEntries()` treats `SORT.TITLE` and `SORT.ALPHABETICAL` identically and sorts primarily by `entry.comment` (title/memo). That indicates the docs, not just naming, may be misaligned.

#### Technical Accuracy Audit

> *“Ensure any UI label mapping … presents it as ‘Comment’/‘Memo’ rather than ‘Alphabetical’.”*

- **Why it may be wrong/speculative:**
  There is no current UI label mapping entry for `SORT.ALPHABETICAL` in `src/utils.js` (`SORT_OPTIONS` lacks it).

- **Validation:** Validated ✅
  Confirmed by inspection of `src/utils.js` (`SORT_OPTIONS`) and a repo search for `'alphabetical'`.

- **What needs to be done/inspected to successfully validate:**
  If the intent is to surface this option, identify the UI surface(s) that should include it (e.g., list panel sort menu vs order helper sort menu) and confirm how those menus are built.

#### Fix Quality Audit

- **Direction:**
  “Do not rename stored enum values” is correct (compatibility).

- **Behavioral change:**
  None required if limiting to docs/comments. If you choose to surface a new dropdown option, that is a behavior change and must be labeled.

- **Ambiguity:**
  Step 1 implies changes to UI labels for an option that currently isn’t shown. The fix needs to pick a single minimal target.

- **Checklist:**
  Not implementation-ready: it references UI labels without naming the exact label source (`SORT_OPTIONS`) and doesn’t address the more concrete doc mismatch around `SORT.TITLE` semantics.

- **Dependency integrity:**
  No cross-finding dependency, but this overlaps with F01 (docstring correctness) at a “documentation semantics must match actual usage” level.

- **Fix risk calibration:**
  “Low” is accurate if restricted to docs; could be higher if UI behavior is changed.

- **"Why it's safe" validity:**
  Valid if restricted to docs/comments only.

- **Verdict:** Implementation plan needs revision 🟡

#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Step 1 plan references UI label mapping for `SORT.ALPHABETICAL` without evidence it is currently exposed; it also misses the doc mismatch that `SORT.TITLE` is sorted by `entry.comment` in `sortEntries()`.
> Revisions applied: Tightened the plan to documentation-only changes scoped to `src/constants.js`, and added an explicit “confirm UI exposure” step before changing dropdown labels.

- [ ] In `src/constants.js`, update the docstrings for `SORT.TITLE` and `SORT.ALPHABETICAL` to explicitly describe their effective sort field(s) as implemented in `sortEntries()` (currently `entry.comment` / “title/memo”, with `entry.key` fallback).
- [ ] Add a short inline comment near `SORT.ALPHABETICAL` indicating whether it is a legacy/compatibility alias vs an intended UI option.
- [ ] (Only if you confirm `SORT.ALPHABETICAL` is intentionally user-facing) Update `src/utils.js` `SORT_OPTIONS` to include a non-ambiguous label such as “Comment A‑Z / Z‑A”, and ensure it maps to `SORT.ALPHABETICAL` (declare this as a behavior change).

---

### Coverage Note

- **Obvious missed findings:**  
  `ORDER_HELPER_NUMBER_COLUMN_KEYS` includes keys that aren’t numeric inputs (e.g., `automationId` is a text input, and “Trigger %” is a percentage UI). This isn’t necessarily wrong (the CSS class name may just mean “tight/right-aligned column”), but it is a potential naming/semantic mismatch similar to F01/F05. No clear runtime bug was identified from `src/constants.js` alone.
- **Severity calibration:**  
  The file is largely schema/constants. Most issues are maintainability/drift risks rather than user-facing breakages today, so Low/Medium severities are appropriate.