# CODE REVIEW FINDINGS: `src/orderHelperFilters.js`

## F01: Applying filters mutates filter state (auto-selects "all") and can override user intent

### STEP 1. FIRST CODE REVIEW

When the Order Helper table decides which rows to hide, this file sometimes *changes your filter selections automatically*. That can make the filter UI feel inconsistent (you "deselect everything", but it quietly re-selects everything again) and can make debugging "why are rows showing/hiding?" hard.

- **Location:**
  `src/orderHelperFilters.js` — `applyOrderHelperStrategyFilterToRow`, `applyOrderHelperPositionFilterToRow`, `applyOrderHelperOutletFilterToRow`, `applyOrderHelperAutomationIdFilterToRow`, `applyOrderHelperGroupFilterToRow`

  Anchor snippet (example from Strategy):
  ```js
  if (!orderHelperState.filters.strategy.length) {
      orderHelperState.filters.strategy = [...strategyValues];
  }
  ```

- **Detailed Finding:**
  The "apply filter to a row" functions are expected to be pure-ish: read current filter state and mark the row filtered/unfiltered. Instead, they also *initialize* `orderHelperState.filters.*` when empty by assigning all possible values (e.g., `filters.strategy = [...strategyValues]`).

  This creates two practical issues:

  1) It becomes impossible to represent "no values selected" as a real state. If the UI allows the user to uncheck all options in a multiselect, this code will promptly convert that to "all options selected" the next time rows are evaluated.

  2) Rendering/applying filters has side effects on shared state. If other modules depend on `orderHelperState.filters.*` being the user's selection, those modules may observe state changes that were triggered merely by "apply filters" and not by a user interaction.

  This pattern repeats across multiple filters, increasing drift risk (a bug fix to one filter may be missed in others).

- **Why it matters:**
  - Users may be unable to intentionally filter down to "show nothing" (useful as a quick "hide all until I choose something" state).
  - Filter UIs can appear "buggy" if selections revert.
  - State side effects during rendering make future bugs harder to trace and can lead to subtle ordering/race issues between "UI updates filter state" and "filter application mutates filter state back".

- **Severity:** Medium ❗

- **Confidence:** High 😀
  The state mutation is explicit and unconditional when the corresponding filter array is empty.

- **Reproducing the issue:**
  1. Open Order Helper.
  2. Open one of the column filter menus (Strategy/Position/Outlet/etc).
  3. Uncheck every option (so nothing is selected).
  4. Trigger any refresh that reapplies filters (e.g., change a different filter, toggle hide-keys, or reopen Order Helper).
  5. Observe that rows are not all hidden and/or the filter menu may show everything selected again.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Treat "apply filter to row" as read-only and allow "no selection" to mean "filter out all rows".

- **Proposed fix:**
  Remove the "if empty, select all" assignments from the `applyOrderHelper*FilterToRow` functions. Initialization of defaults should happen only in state creation (`createOrderHelperState`) and/or when syncing option sets (`syncOrderHelper*Filters`), not while applying a filter.

  Then, define consistent semantics:
  - If `filters.<x>` is empty, interpret as "nothing allowed" (so every row fails the filter and becomes filtered), OR if the intended UX is "empty means all", enforce that at the UI level and keep apply functions pure.

- **Fix risk:** Medium 🟡
  This changes the semantics of "empty filter" and could alter current user-observed behavior if they were relying on empty meaning "all". However, it makes behavior more predictable and aligns state updates with user actions.

- **Why it's safe to implement:**
  Existing behavior for non-empty filter selections remains unchanged; only the edge case of an empty selection changes and becomes consistent.

- **Pros:**
  - Filter UI becomes predictable (no "auto re-select").
  - Clear separation between state initialization and filter application.
  - Easier to debug and extend filter logic.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "The 'apply filter to a row' functions also *initialize* `orderHelperState.filters.*` when empty by assigning all possible values" — **Validated**: Code inspection confirms this pattern exists in all six filter types (strategy, position, recursion, outlet, automationId, group).
  - Claim: "This creates two practical issues: 1) It becomes impossible to represent 'no values selected' as a real state. 2) Rendering/applying filters has side effects on shared state." — **Validated**: The unconditional assignment `orderHelperState.filters.strategy = [...strategyValues]` runs on every filter apply when the array is empty.

- **Top risks:**
  - Risk of the issue actually causing real impact > risk of fixing/benefits: The behavior is intentional in the current design (auto-select all on empty), but it does override user intent and makes "show nothing" impossible — confirmed real UX issue.
  - Internal inconsistency: The same pattern is repeated 6 times (one per filter type), increasing drift risk.

#### Technical Accuracy Audit

> *The 'apply filter to a row' functions are expected to be pure-ish: read current filter state and mark the row filtered/unfiltered. Instead, they also *initialize* `orderHelperState.filters.*` when empty.*

- **Why it may be wrong/speculative:**
  The finding accurately describes the current code behavior. However, this "auto-fill on empty" is a deliberate design choice that ALSO happens in `syncOrderHelper*Filters()` — so removing it from apply functions may not fully solve the problem if sync functions still auto-fill.

- **Validation:**
  Validated ✅ — Code in `orderHelperFilters.js` lines 68-70, 84-86, 100-102, 116-118, 132-134, 148-150 shows unconditional assignments when filter arrays are empty.

- **What needs to be done/inspected to successfully validate:**
  None — the behavior is explicit in the code.

#### Fix Quality Audit

- **Direction:**
  The proposed direction is sound — remove auto-fill from apply functions and keep initialization in state creation/sync only. This aligns with the separation of concerns principle in ARCHITECTURE.md (orderHelperFilters.js owns filter logic, orderHelperState.js owns state).

- **Behavioral change:**
  **Behavior Change Required** — The fix explicitly changes the semantics of "empty filter" from "show all" to "show none" (or whatever consistent interpretation is chosen). This is a user-visible behavior change that must be explicitly communicated.

- **Ambiguity:**
  There is ONLY one suggestion (remove auto-fill from apply functions), which is correct. However, the checklist mentions "Decide the intended meaning of an empty filter selection" — this decision point is appropriate since the current behavior is ambiguous.

- **Checklist:**
  Checklist items are actionable:
  - "Decide the intended meaning of an empty filter selection" — clear decision point for implementer
  - "Remove `orderHelperState.filters.<x> = [...values]` auto-fill" — specific code change
  - "Ensure the filter dropdown UI initializes with all selected on first open" — verifiable
  - "Verify that clearing all selections results in all rows being hidden" — testable

- **Dependency integrity:**
  The fix does NOT conflict with other findings in this file. F04 (performance) mentions that moving `allowed = new Set(...)` out of row functions pairs "naturally with F01" — this is accurate but not a dependency.

- **Fix risk calibration:**
  **Fix risk** is rated Medium 🟡, which is accurate. The fix changes filter semantics and affects all filter types (6 locations), but doesn't touch shared state mutation in complex async flows.

- **Why it's safe validity:**
  The claim "Existing behavior for non-empty filter selections remains unchanged" is specific and verifiable — only empty-filter edge case changes. This is valid.

- **Mitigation:**
  None required — the behavior change is intentional and documented.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Decide the intended meaning of an empty filter selection (most consistent is "show none").
- [x] Remove `orderHelperState.filters.<x> = [...values]` auto-fill from each `applyOrderHelper*FilterToRow`.
- [x] Ensure the filter dropdown UI initializes with all selected on first open (if desired) by setting defaults only in `createOrderHelperState` / `syncOrderHelper*Filters`.
- [x] Verify that clearing all selections results in all rows being hidden (or the intended behavior) without the filter state being rewritten.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperFilters.js`
  - Removed filter-state auto-fill mutations from all row-apply functions so filter application is read-only.
  - Kept empty filter selections as an intentional state (`show none`) instead of rewriting to all-selected.
  - Preserved initial all-selected behavior through existing sync/default state paths.

- Risks / Side effects
  - Users who relied on the old "empty means all" behavior will now see empty as "show none". (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] In Order Helper, clear all values in Strategy and Position filters; confirm all rows are hidden and reopening/toggling filters does not auto-reselect everything.

---

## F02: Group filter can throw if `getGroupValue()` returns null/undefined (assumes array)

### STEP 1. FIRST CODE REVIEW

If some entry doesn't have a "group" value (or the data isn't shaped exactly as expected), the Order Helper may crash while trying to apply the Group filter.

- **Location:**
  `src/orderHelperFilters.js` — `applyOrderHelperGroupFilterToRow`

  Anchor snippet:
  ```js
  const groupValuesForEntry = getGroupValue(entryData);
  const matches = groupValuesForEntry.some((value)=>allowed.has(value));
  ```

- **Detailed Finding:**
  `applyOrderHelperGroupFilterToRow` assumes `getGroupValue(entryData)` always returns an array. If it returns `null`, `undefined`, or a string (possible during partial data loads, plugin-specific entry shapes, or future schema changes), calling `.some(...)` will throw a runtime exception.

  Other "value getter" paths (e.g., `getOutletValue`, `getAutomationIdValue`) are treated like scalars and are safe with `Set.has(undefined)`. The group path is uniquely fragile due to direct array method calls without a guard.

- **Why it matters:**
  A single malformed entry can break filtering for the entire table, potentially making Order Helper unusable until a full refresh/reopen.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔
  From this file alone we can't confirm `getGroupValue`'s return contract in all cases, but the assumption is unguarded and therefore brittle.

- **Reproducing the issue:**
  If there exists an entry whose group field is missing or shaped differently:
  1. Open Order Helper and ensure Group column/filter is available.
  2. Apply or reapply Group filtering (change filter selection / refresh).
  3. Observe console error and filter application stopping.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make the group filter tolerant of missing/invalid group data by normalizing to an array.

- **Proposed fix:**
  In `applyOrderHelperGroupFilterToRow`, normalize:
  - `const groupValuesForEntry = getGroupValue(entryData) ?? [];`
  - If it might be a scalar, wrap: `Array.isArray(v) ? v : [v]` (and filter falsy).

  Then compute `.some(...)` safely.

- **Fix risk:** Low 🟢
  Adds defensive handling; should not affect valid data paths.

- **Why it's safe to implement:**
  For entries where `getGroupValue` already returns an array, behavior remains unchanged.

- **Pros:**
  - Prevents a whole-table crash from a single unexpected entry shape.
  - Makes the module resilient to upstream schema changes.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "If some entry doesn't have a 'group' value (or the data isn't shaped exactly as expected), the Order Helper may crash while trying to apply the Group filter." — **Validated**: The code calls `getGroupValue(entryData).some(...)` without a null check.
  - Claim: "`getGroupValue(entryData)` always returns an array" — **Not fully accurate**: `getGroupValueForEntry` in `src/orderHelper.js` (lines 153-158) **always returns an array** — it handles null/undefined by returning `[GROUP_NONE_VALUE]`. The finding incorrectly assumes it can return null/undefined.

- **Top risks:**
  - Missing evidence / wrong prioritization: The finding assumes `getGroupValue` can return null/undefined, but the actual implementation always returns an array. The crash risk is **not present** with the current implementation.
  - Speculative claims: The finding claims a crash is possible, but the code path is safe.

#### Technical Accuracy Audit

> *`applyOrderHelperGroupFilterToRow` assumes `getGroupValue(entryData)` always returns an array.*

- **Why it may be wrong/speculative:**
  The finding is based on a false premise. Looking at `src/orderHelper.js`:
  ```js
  const getGroupValueForEntry = (entry)=>{
      const groupValue = entry?.group;
      if (groupValue == null) return [GROUP_NONE_VALUE];
      const groups = splitGroupValues(groupValue);
      return groups.length ? groups : [GROUP_NONE_VALUE];
  };
  ```
  This function **always returns an array** — it never returns null, undefined, or a scalar string. The `.some()` call is therefore safe.

- **Validation:**
  Validated ✅ — The implementation in `src/orderHelper.js` confirms the function always returns an array. No crash is possible with the current implementation.

- **What needs to be done/inspected to successfully validate:**
  None — code inspection confirms the finding is based on incorrect assumptions.

#### Fix Quality Audit

- **Direction:**
  The proposed fix (adding defensive normalization) is harmless but **unnecessary** for the current code. If applied, it would be defensive coding that adds robustness against future changes.

- **Behavioral change:**
  None — the behavior would remain identical since the function already returns arrays.

- **Ambiguity:**
  There is ONLY one suggestion (normalize to array), which is clear.

- **Checklist:**
  Checklist items are actionable and reasonable, though the fix is unnecessary.

- **Dependency integrity:**
  No dependencies with other findings.

- **Fix risk calibration:**
  **Fix risk** is rated Low 🟢, which is accurate for a defensive normalization.

- **Why it's safe validity:**
  The claim is technically wrong (the crash can't happen), but the defensive fix is safe.

- **Mitigation:**
  None — the current code is safe.

- **Verdict:** Implementation plan needs revision 🟡

#### Detailed Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: The finding incorrectly claims `getGroupValue` can return null/undefined, but code inspection shows it always returns an array. The fix is unnecessary but harmless.
> Revisions applied: Removed the premise that a crash is possible; reframed the fix as defensive coding against future changes.

- [x] Update `applyOrderHelperGroupFilterToRow` to coerce `getGroupValue(entryData)` into an array safely (defensive, currently not required but harmless).
- [x] Ensure normalization does not treat empty string as a meaningful group unless intended.
- [x] Add a minimal unit test or lightweight runtime guard (if tests are feasible) for non-array group values.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperFilters.js`
  - Added `normalizeGroupValuesForFilter(...)` to defensively coerce non-array group values before matching.
  - Group filter matching now avoids direct `.some(...)` on unknown value shapes while keeping `(none)` (`''`) semantics.
  - Implemented lightweight runtime guard behavior in filter logic instead of adding a new test file.

- Risks / Side effects
  - Unexpected upstream group value shapes are now tolerated, which may mask bad producer data instead of surfacing it immediately. (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Open Group filter and verify entries with no group still match `(none)` and no console errors appear while toggling group filters.

---

## F03: Recursion "delayUntilRecursion" flag detection is overly permissive and may misclassify values

### STEP 1. FIRST CODE REVIEW

The Recursion filter tries to treat "Delay until recursion" as a boolean flag, but the check is broad enough that it may mark entries as having that flag even when the value effectively means "no delay".

- **Location:**
  `src/orderHelperFilters.js` — `applyOrderHelperRecursionFilterToRow`

  Anchor snippet:
  ```js
  const hasDelayUntilRecursion = entryData?.delayUntilRecursion !== false
      && entryData?.delayUntilRecursion != null;
  ```

- **Detailed Finding:**
  This code sets `hasDelayUntilRecursion` to true for any value that is not explicitly `false` and not `null/undefined`. If the underlying field is numeric (e.g., milliseconds/seconds) and `0` is used to mean "no delay", the check will treat `0` as true (because `0 !== false` and `0 != null`).

  That means entries may be included/excluded by the Recursion filter in a way that doesn't match what the user expects from the UI.

- **Why it matters:**
  - Users could bulk-edit or reorder based on a filter that is silently wrong, affecting many entries.
  - Hard to diagnose: UI looks correct, but filtered set is incorrect.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔
  It depends on the real type/semantics of `delayUntilRecursion` in the host data model. The current check is clearly permissive and at risk if the field is not strictly boolean.

- **Reproducing the issue:**
  If `delayUntilRecursion` can be `0`:
  1. Create/locate an entry with "delay until recursion" set to `0` (or a value representing "disabled").
  2. In Order Helper, use the Recursion filter to show only entries with Delay-until-recursion.
  3. Observe the entry appears even though delay is effectively off.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Align the "delay until recursion" filter flag with the actual data type and UI meaning.

- **Proposed fix:**
  🚩 Requires user input
  Decide the intended meaning:
  - If the field is boolean: use strict truthiness check (`=== true`).
  - If numeric duration: treat values `> 0` as enabled and `0`/null/undefined as disabled.

  Update `hasDelayUntilRecursion` accordingly, and keep the filter matching logic the same.

- **Fix risk:** Medium 🟡
  Correcting the condition may change which rows are included by the filter for some existing data values (notably `0`).

- **Why it's safe to implement:**
  The change makes the filter correspond to the real meaning of the underlying property; it does not change unrelated filters or core editing behaviors.

- **Pros:**
  - More accurate filtering.
  - Less surprising behavior for users doing bulk operations.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "If the underlying field is numeric (e.g., milliseconds/seconds) and `0` is used to mean 'no delay', the check will treat `0` as true (because `0 !== false` and `0 != null`)." — **Validated**: The WI API entry shape shows `delayUntilRecursion` is a number (default 0), not boolean. The check `entryData?.delayUntilRecursion != null` treats `0` as truthy.
  - Claim: "Entries may be included/excluded by the Recursion filter in a way that doesn't match what the user expects from the UI." — **Validated**: If the UI shows "Delay until recursion" as a toggle/flag, but the data stores it as a number where 0 means "disabled", the filter logic is misaligned.

- **Top risks:**
  - Internal inconsistency: The check uses boolean-style logic (`!== false`, `!= null`) on a numeric field.

#### Technical Accuracy Audit

> *If the underlying field is numeric (e.g., milliseconds/seconds) and `0` is used to mean "no delay", the check will treat `0` as true.*

- **Why it may be wrong/speculative:**
  The finding is accurate. The WI API entry shape defines `delayUntilRecursion` as a number (default 0), and 0 is falsy in JavaScript but passes `!= null` and `!== false`.

- **Validation:**
  Validated ✅ — WI API reference confirms `delayUntilRecursion` is `number` type with default 0.

- **What needs to be done/inspected to successfully validate:**
  None — the type and default are documented in the WI API.

#### Fix Quality Audit

- **Direction:**
  The proposed direction is sound — determine whether the field is boolean or numeric and apply appropriate checking.

- **Behavioral change:**
  **Behavior Change Required** — Changing from `!= null` to `> 0` will change which entries match the filter. Entries with `delayUntilRecursion = 0` would be treated differently.

- **Ambiguity:**
  The finding correctly flags this as needing user input to decide the semantics. The current code assumes boolean-like behavior, but the field is numeric.

- **Checklist:**
  The checklist correctly identifies the need to confirm the field type/meaning and update accordingly.

- **Dependency integrity:**
  No dependencies with other findings.

- **Fix risk calibration:**
  **Fix risk** is rated Medium 🟡, which is accurate because it changes filter matching behavior for existing data.

- **Why it's safe validity:**
  The claim is specific and verifiable — the fix makes the filter align with the actual data type.

- **Mitigation:**
  None required — the behavior change is intentional.

- **Verdict:** Implementation plan needs revision 🟡

#### Detailed Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: The finding correctly identifies the numeric vs boolean mismatch, but the "Requires user input" flag should be replaced with a concrete recommendation based on the WI API evidence (the field IS numeric).
> Revisions applied: Removed the "Requires user input" flag and instead recommend the numeric check (`> 0`) since the WI API confirms it's a number field.

- [x] Confirm `delayUntilRecursion` type/meaning in the entry data model — WI API confirms it's a **number** (default 0), where 0 means "no delay/disabled".
- [x] Replace the permissive condition with a type-aware check: treat values `> 0` as enabled and `0`/null/undefined as disabled.
- [x] Verify filtering results match what the UI control shows for the same entry.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperFilters.js`
  - Updated recursion delay detection from permissive boolean-style checks to numeric semantics: `Number(delayUntilRecursion) > 0`.
  - Kept recursion filter matching logic intact for the other recursion flags.

- Risks / Side effects
  - Rows with non-numeric custom values (if any exist) may now classify differently after numeric coercion. (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Compare Recursion filter results for entries with `delayUntilRecursion = 0` and `> 0`; confirm only positive-delay rows match the delay flag.

---

## F04: Filter application is more expensive than necessary (repeated Set creation per row), risking lag on large tables

### STEP 1. FIRST CODE REVIEW

On large lorebooks, changing filters can feel slow. Part of that risk is that this file rebuilds "allowed value sets" and recomputes entry lists more often than needed.

- **Location:**
  `src/orderHelperFilters.js` — `applyOrderHelper*Filters()` loops + `applyOrderHelper*FilterToRow()` implementations

  Anchor snippet (pattern):
  ```js
  const allowed = new Set(orderHelperState.filters.strategy);
  // ... called once per row
  ```

- **Detailed Finding:**
  Each `applyOrderHelper*Filters()` function loops entries and calls `applyOrderHelper*FilterToRow(row, entry.data)` for each one. Inside the per-row function, the code commonly:
  - Derives the full value list (`get*Values()` or `orderHelperState.*Values`)
  - Potentially initializes filters
  - Rebuilds a `Set` from `orderHelperState.filters.<x>`

  This is repeated for every row. With many rows, this becomes avoidable overhead. The code already has a natural structure to compute `allowed` once per filter application, then apply it to all rows.

- **Why it matters:**
  - Slower filter toggling and worse perceived responsiveness.
  - More CPU churn in the browser, especially on weaker devices or very large datasets.

- **Severity:** Low ⭕ (can become Medium if users routinely have very large tables)

- **Confidence:** High 😀
  The repeated `new Set(...)` is clearly inside row-level calls.

- **Reproducing the issue:**
  1. Open Order Helper on a lorebook with hundreds/thousands of entries.
  2. Toggle a filter repeatedly (e.g., Strategy or Position).
  3. Notice UI delay/stutter compared to simpler UI actions.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Compute "allowed sets" once per filter apply and keep row-level functions as small/pure as possible.

- **Proposed fix:**
  Refactor each `applyOrderHelper*Filters()` to:
  - Compute `entries` once
  - Compute the relevant `allowed` `Set` once (and any default value list once)
  - Loop rows and apply the precomputed data

  Optionally keep `applyOrderHelper*FilterToRow` but pass `allowed`/defaults in to avoid rebuilding.

- **Fix risk:** Low 🟢
  This is a performance-only refactor; the intended behavior can remain unchanged if done carefully.

- **Why it's safe to implement:**
  Row filter state and CSS class toggling logic remains the same; only redundant recomputation is removed.

- **Pros:**
  - Faster filter application for large lists.
  - Cleaner separation of "prepare filter data" vs "apply to each row".

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "Each `applyOrderHelper*Filters()` function loops entries and calls `applyOrderHelper*FilterToRow(row, entry.data)` for each one. Inside the per-row function... rebuilds a `Set` from `orderHelperState.filters.<x>`" — **Validated**: Code inspection confirms `new Set(orderHelperState.filters.strategy)` is called inside the per-row function for each row.

- **Top risks:**
  - None identified — the performance issue is real and the fix is straightforward.

#### Technical Accuracy Audit

> *This is repeated for every row. With many rows, this becomes avoidable overhead.*

- **Why it may be wrong/speculative:**
  The finding is accurate. The Set is created inside each per-row function call.

- **Validation:**
  Validated ✅ — Code in `applyOrderHelperStrategyFilterToRow` and similar functions shows `const allowed = new Set(...)` inside the function that runs per-row.

- **What needs to be done/inspected to successfully validate:**
  None — the pattern is explicit in the code.

#### Fix Quality Audit

- **Direction:**
  The proposed direction is sound — move Set creation outside the loop. This is a standard performance optimization.

- **Behavioral change:**
  None — the filtering results should be identical; only the computation is optimized.

- **Ambiguity:**
  There is ONLY one suggestion (move Set creation out of row functions), which is clear.

- **Checklist:**
  Checklist items are actionable:
  - "Move `allowed = new Set(...)` out of the per-row function" — specific code change
  - "Ensure default handling doesn't mutate filters during apply" — this is where F01's fix is relevant
  - "Verify filtered rows/class toggling remains identical" — testable

- **Dependency integrity:**
  The checklist correctly notes dependency with F01 — removing auto-fill mutations during apply (F01) pairs naturally with this performance fix since the Set will be pre-computed.

- **Fix risk calibration:**
  **Fix risk** is rated Low 🟢, which is accurate — it's a pure refactor with no behavioral change.

- **Why it's safe validity:**
  The claim is specific — "only redundant recomputation is removed" — which is verifiable.

- **Mitigation:**
  None required — the change is safe.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] For each filter type, move `allowed = new Set(...)` out of the per-row function and into the outer apply loop.
- [x] Ensure default handling doesn't mutate filters during apply (pairs naturally with F01).
- [x] Verify filtered rows/class toggling remains identical.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperFilters.js`
  - Refactored each `applyOrderHelper*Filters()` loop to precompute `allowed` sets and pass precomputed values into row-level apply helpers.
  - Retained backward-compatible row helper signatures by adding an optional `precomputed` argument.
  - Removed per-row state mutation dependency, pairing with F01 for pure filter application during full-table passes.

- Risks / Side effects
  - If future callers pass malformed precomputed objects, row-level helpers could apply stale filter data. (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] With a large Order Helper table, toggle Strategy/Position/Outlet/Automation/Group filters repeatedly and confirm filtering behavior matches before/after expectations without noticeable lag spikes.

---

## Coverage Note

- **Obvious missed findings:**
  None identified. The four findings cover the main issues in this file: state mutation (F01), defensive coding (F02, though unnecessary), type mismatch (F03), and performance (F04).

- **Severity calibration:**
  - F01: Medium ❗ — Real UX issue affecting user intent, but not data-loss critical
  - F02: Low ⭕ — False positive; the crash can't happen with current code
  - F03: Medium ❗ — Real filtering inaccuracy affecting bulk operations
  - F04: Low ⭕ (can become Medium if users have very large tables) — Performance optimization
