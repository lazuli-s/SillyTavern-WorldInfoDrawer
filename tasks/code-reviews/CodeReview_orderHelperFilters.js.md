# CODE REVIEW FINDINGS: `src/orderHelperFilters.js`

## F01: Applying filters mutates filter state (auto-selects “all”) and can override user intent

### STEP 1. FIRST CODE REVIEW

When the Order Helper table decides which rows to hide, this file sometimes *changes your filter selections automatically*. That can make the filter UI feel inconsistent (you “deselect everything”, but it quietly re-selects everything again) and can make debugging “why are rows showing/hiding?” hard.

- **Location:**
  `src/orderHelperFilters.js` — `applyOrderHelperStrategyFilterToRow`, `applyOrderHelperPositionFilterToRow`, `applyOrderHelperOutletFilterToRow`, `applyOrderHelperAutomationIdFilterToRow`, `applyOrderHelperGroupFilterToRow`

  Anchor snippet (example from Strategy):
  ```js
  if (!orderHelperState.filters.strategy.length) {
      orderHelperState.filters.strategy = [...strategyValues];
  }
  ```

- **Detailed Finding:**
  The “apply filter to a row” functions are expected to be pure-ish: read current filter state and mark the row filtered/unfiltered. Instead, they also *initialize* `orderHelperState.filters.*` when empty by assigning all possible values (e.g., `filters.strategy = [...strategyValues]`).

  This creates two practical issues:

  1) It becomes impossible to represent “no values selected” as a real state. If the UI allows the user to uncheck all options in a multiselect, this code will promptly convert that to “all options selected” the next time rows are evaluated.

  2) Rendering/applying filters has side effects on shared state. If other modules depend on `orderHelperState.filters.*` being the user’s selection, those modules may observe state changes that were triggered merely by “apply filters” and not by a user interaction.

  This pattern repeats across multiple filters, increasing drift risk (a bug fix to one filter may be missed in others).

- **Why it matters:**
  - Users may be unable to intentionally filter down to “show nothing” (useful as a quick “hide all until I choose something” state).
  - Filter UIs can appear “buggy” if selections revert.
  - State side effects during rendering make future bugs harder to trace and can lead to subtle ordering/race issues between “UI updates filter state” and “filter application mutates filter state back”.

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
  Treat “apply filter to row” as read-only and allow “no selection” to mean “filter out all rows”.

- **Proposed fix:**
  Remove the “if empty, select all” assignments from the `applyOrderHelper*FilterToRow` functions. Initialization of defaults should happen only in state creation (`createOrderHelperState`) and/or when syncing option sets (`syncOrderHelper*Filters`), not while applying a filter.

  Then, define consistent semantics:
  - If `filters.<x>` is empty, interpret as “nothing allowed” (so every row fails the filter and becomes filtered), OR if the intended UX is “empty means all”, enforce that at the UI level and keep apply functions pure.

- **Implementation Checklist:**
  - [ ] Decide the intended meaning of an empty filter selection (most consistent is “show none”).
  - [ ] Remove `orderHelperState.filters.<x> = [...values]` auto-fill from each `applyOrderHelper*FilterToRow`.
  - [ ] Ensure the filter dropdown UI initializes with all selected on first open (if desired) by setting defaults only in `createOrderHelperState` / `syncOrderHelper*Filters`.
  - [ ] Verify that clearing all selections results in all rows being hidden (or the intended behavior) without the filter state being rewritten.

- **Fix risk:** Medium 🟡
  This changes the semantics of “empty filter” and could alter current user-observed behavior if they were relying on empty meaning “all”. However, it makes behavior more predictable and aligns state updates with user actions.

- **Why it’s safe to implement:**
  Existing behavior for non-empty filter selections remains unchanged; only the edge case of an empty selection changes and becomes consistent.

- **Pros:**
  - Filter UI becomes predictable (no “auto re-select”).
  - Clear separation between state initialization and filter application.
  - Easier to debug and extend filter logic.

---

## F02: Group filter can throw if `getGroupValue()` returns null/undefined (assumes array)

### STEP 1. FIRST CODE REVIEW

If some entry doesn’t have a “group” value (or the data isn’t shaped exactly as expected), the Order Helper may crash while trying to apply the Group filter.

- **Location:**
  `src/orderHelperFilters.js` — `applyOrderHelperGroupFilterToRow`

  Anchor snippet:
  ```js
  const groupValuesForEntry = getGroupValue(entryData);
  const matches = groupValuesForEntry.some((value)=>allowed.has(value));
  ```

- **Detailed Finding:**
  `applyOrderHelperGroupFilterToRow` assumes `getGroupValue(entryData)` always returns an array. If it returns `null`, `undefined`, or a string (possible during partial data loads, plugin-specific entry shapes, or future schema changes), calling `.some(...)` will throw a runtime exception.

  Other “value getter” paths (e.g., `getOutletValue`, `getAutomationIdValue`) are treated like scalars and are safe with `Set.has(undefined)`. The group path is uniquely fragile due to direct array method calls without a guard.

- **Why it matters:**
  A single malformed entry can break filtering for the entire table, potentially making Order Helper unusable until a full refresh/reopen.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔
  From this file alone we can’t confirm `getGroupValue`’s return contract in all cases, but the assumption is unguarded and therefore brittle.

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

- **Implementation Checklist:**
  - [ ] Update `applyOrderHelperGroupFilterToRow` to coerce `getGroupValue(entryData)` into an array safely.
  - [ ] Ensure normalization does not treat empty string as a meaningful group unless intended.
  - [ ] Add a minimal unit test or lightweight runtime guard (if tests are feasible) for non-array group values.

- **Fix risk:** Low 🟢
  Adds defensive handling; should not affect valid data paths.

- **Why it’s safe to implement:**
  For entries where `getGroupValue` already returns an array, behavior remains unchanged.

- **Pros:**
  - Prevents a whole-table crash from a single unexpected entry shape.
  - Makes the module resilient to upstream schema changes.

---

## F03: Recursion “delayUntilRecursion” flag detection is overly permissive and may misclassify values

### STEP 1. FIRST CODE REVIEW

The Recursion filter tries to treat “Delay until recursion” as a boolean flag, but the check is broad enough that it may mark entries as having that flag even when the value effectively means “no delay”.

- **Location:**
  `src/orderHelperFilters.js` — `applyOrderHelperRecursionFilterToRow`

  Anchor snippet:
  ```js
  const hasDelayUntilRecursion = entryData?.delayUntilRecursion !== false
      && entryData?.delayUntilRecursion != null;
  ```

- **Detailed Finding:**
  This code sets `hasDelayUntilRecursion` to true for any value that is not explicitly `false` and not `null/undefined`. If the underlying field is numeric (e.g., milliseconds/seconds) and `0` is used to mean “no delay”, the check will treat `0` as true (because `0 !== false` and `0 != null`).

  That means entries may be included/excluded by the Recursion filter in a way that doesn’t match what the user expects from the UI.

- **Why it matters:**
  - Users could bulk-edit or reorder based on a filter that is silently wrong, affecting many entries.
  - Hard to diagnose: UI looks correct, but filtered set is incorrect.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔
  It depends on the real type/semantics of `delayUntilRecursion` in the host data model. The current check is clearly permissive and at risk if the field is not strictly boolean.

- **Reproducing the issue:**
  If `delayUntilRecursion` can be `0`:
  1. Create/locate an entry with “delay until recursion” set to `0` (or a value representing “disabled”).
  2. In Order Helper, use the Recursion filter to show only entries with Delay-until-recursion.
  3. Observe the entry appears even though delay is effectively off.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Align the “delay until recursion” filter flag with the actual data type and UI meaning.

- **Proposed fix:**
  🚩 Requires user input
  Decide the intended meaning:
  - If the field is boolean: use strict truthiness check (`=== true`).
  - If numeric duration: treat values `> 0` as enabled and `0`/null/undefined as disabled.

  Update `hasDelayUntilRecursion` accordingly, and keep the filter matching logic the same.

- **Implementation Checklist:**
  - [ ] Confirm `delayUntilRecursion` type/meaning in the entry data model (and any UI control that writes it).
  - [ ] Replace the permissive condition with a type-aware check (boolean strict or numeric `> 0`).
  - [ ] Verify filtering results match what the UI control shows for the same entry.

- **Fix risk:** Medium 🟡
  Correcting the condition may change which rows are included by the filter for some existing data values (notably `0`).

- **Why it’s safe to implement:**
  The change makes the filter correspond to the real meaning of the underlying property; it does not change unrelated filters or core editing behaviors.

- **Pros:**
  - More accurate filtering.
  - Less surprising behavior for users doing bulk operations.

---

## F04: Filter application is more expensive than necessary (repeated Set creation per row), risking lag on large tables

### STEP 1. FIRST CODE REVIEW

On large lorebooks, changing filters can feel slow. Part of that risk is that this file rebuilds “allowed value sets” and recomputes entry lists more often than needed.

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
  Compute “allowed sets” once per filter apply and keep row-level functions as small/pure as possible.

- **Proposed fix:**
  Refactor each `applyOrderHelper*Filters()` to:
  - Compute `entries` once
  - Compute the relevant `allowed` `Set` once (and any default value list once)
  - Loop rows and apply the precomputed data

  Optionally keep `applyOrderHelper*FilterToRow` but pass `allowed`/defaults in to avoid rebuilding.

- **Implementation Checklist:**
  - [ ] For each filter type, move `allowed = new Set(...)` out of the per-row function and into the outer apply loop.
  - [ ] Ensure default handling doesn’t mutate filters during apply (pairs naturally with F01).
  - [ ] Verify filtered rows/class toggling remains identical.

- **Fix risk:** Low 🟢
  This is a performance-only refactor; the intended behavior can remain unchanged if done carefully.

- **Why it’s safe to implement:**
  Row filter state and CSS class toggling logic remains the same; only redundant recomputation is removed.

- **Pros:**
  - Faster filter application for large lists.
  - Cleaner separation of “prepare filter data” vs “apply to each row”.