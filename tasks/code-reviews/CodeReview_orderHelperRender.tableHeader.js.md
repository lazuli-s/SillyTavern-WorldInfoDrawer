# CODE REVIEW FINDINGS: `src/orderHelperRender.tableHeader.js`

*Reviewed: February 17, 2026*

## Scope

- **File reviewed:** `src/orderHelperRender.tableHeader.js`
- **Helper files consulted:** `src/orderHelperRender.utils.js`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Builds the Order Helper table header (`<thead>`) with multiselect column filter menus and returns refresh-indicator callbacks for filters.

---

## F01: Unused `setTooltip` import adds dead code and increases maintenance noise

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The file says it needs a helper called `setTooltip`, but it never actually uses it. This makes the code harder to read because it suggests something important is happening when it isn’t.

- **Location:**
  `src/orderHelperRender.tableHeader.js` — top-level import list

  Anchor:
  ```js
  import {
      setTooltip,
      createMultiselectDropdownCheckbox,
      wireMultiselectDropdown,
  } from './orderHelperRender.utils.js';
  ```

- **Detailed Finding:**
  `setTooltip` is imported from `orderHelperRender.utils.js` but is not referenced anywhere in this module. This is a small issue, but it creates unnecessary coupling and can mislead future refactors (someone searching for tooltip behavior will be sent here and find nothing).

- **Why it matters:**
  Small “unused import” clutter adds friction during future debugging and makes it easier to miss real issues in review diffs.

- **Severity:** Low ⭕
- **Confidence:** High 😀
- **Category:** JS Best Practice
- **Reproducing the issue:**
  N/A

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Remove the unused import so the file’s dependencies match what it actually uses.

- **Proposed fix:**
  In `src/orderHelperRender.tableHeader.js`, remove `setTooltip` from the named import list.

- **Implementation Checklist:**
  [ ] Remove `setTooltip` from the import destructuring in `src/orderHelperRender.tableHeader.js`.

- **Fix risk:** Low 🟢
  This is a purely local cleanup with no runtime behavior impact.

- **Why it's safe to implement:**
  No other module behavior changes; only the import list is adjusted.

- **Pros:**
  - Reduces noise and confusion during future maintenance.
  - Avoids lint warnings in stricter configurations.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F02: Filter menus forcibly “snap back” to “All selected” when the user clears the last option (Behavior Change Required)

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If a user tries to uncheck every option in a filter (meaning “show nothing”), the UI silently turns the filter back into “show everything.” That can feel like the filter controls are broken or not respecting the user’s choice.

- **Location:**
  `src/orderHelperRender.tableHeader.js` — in each filter’s `updateFilterIndicator()` (strategy/position/outlet/automationId/group) and recursion filter logic.

  Anchor (strategy example):
  ```js
  const filters = normalizeStrategyFilters(orderHelperState.filters.strategy);
  orderHelperState.filters.strategy = filters.length ? filters : [...allValues];
  ```

  Anchor (recursion example):
  ```js
  if (!orderHelperState.filters.recursion.length) {
      orderHelperState.filters.recursion = [...allValues];
  }
  ```

- **Detailed Finding:**
  The indicator-update functions are not “read-only”; they *normalize and rewrite* filter state and enforce a non-empty selection by converting empty arrays into “all values”.

  Consequence:
  - When a user unchecks the last remaining checkbox in a menu, the `change` handler removes the value, making the filter array empty.
  - `update*Filters()` then calls `updateFilterIndicator()`, which immediately replaces the empty array with `[...]allValues`.
  - The net effect is that the UI cannot represent “no options selected,” even if the user explicitly asks for it.

  This can also interact poorly with callers that treat `filters[key]` as “the user’s explicit selection,” because the code mutates it behind the scenes.

- **Why it matters:**
  This can cause UX confusion (“I unchecked everything but it still shows everything”), and makes it harder to reason about filter state during debugging (because the state is being rewritten in the indicator logic).

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** UI Correctness
- **Reproducing the issue:**
  1. Open Order Helper.
  2. Open a column filter menu (e.g., Strategy).
  3. Uncheck every option (including the last checked one).
  4. Observe that the filter button/behavior snaps back to “all selected” instead of staying empty.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Decide on a single meaning for “empty selection” and make the UI/state reflect it consistently. If “empty means all” is required, only apply that rule during initialization, not on user-driven changes.

- **Proposed fix:**
  **Behavior Change Required:** allow an empty selection to remain empty *after user interaction*.
  - For each `update*Filters()` function, stop auto-filling the filter array when it becomes empty due to checkbox changes.
  - Keep the “default to all” behavior only for initial render/initial state hydration (e.g., when `orderHelperState.filters.<key>` is `null/undefined` or has never been set), not as an invariant during updates.
  - Concretely: adjust each filter’s `updateFilterIndicator()` so it does **not** assign `orderHelperState.filters.<key>` (it should only compute `isActive`), and move any “default to all” initialization to the renderer/state creation path.

- **Implementation Checklist:**
  [ ] For each filter menu block in `buildTableHeader`, change `updateFilterIndicator()` to be read-only (no mutation of `orderHelperState.filters.*`).
  [ ] Ensure filter arrays are initialized to defaults (likely “all values”) in the Order Helper state initialization path (outside this module).
  [ ] Update the filter application functions to correctly interpret an empty array as “no matches” (or whichever final behavior is chosen), consistently across all filter types.

- **Fix risk:** High 🔴
  This changes user-visible behavior and can affect how filters combine (especially if other modules assume empty means “all”).

- **Why it's safe to implement:**
  It can be implemented without changing unrelated Order Helper rendering, row editing, or persistence—only filter semantics and initialization are affected.

- **Pros:**
  - Filter behavior matches user expectation (“none selected” means none).
  - Removes hidden state mutation from indicator rendering, making debugging easier.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F03: Several filter menus can render as a blank popover when there are no options (missing empty-state UI)

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Some filter dropdowns can open to an empty box with no message. Users may think the UI is broken, even though it just means “there are no options for this filter right now.”

- **Location:**
  `src/orderHelperRender.tableHeader.js` — outlet/automationId/group/recursion menu builders (no `stwid--empty` and no text when `get*Options()` returns empty).

  Anchor (outlet example):
  ```js
  const outletOptions = getOutletOptions();
  for (const optionData of outletOptions) { ... }
  ```

- **Detailed Finding:**
  Strategy and Position menus show explicit empty-state UI:
  ```js
  if (!strategyOptions.length) {
      menu.classList.add('stwid--empty');
      menu.textContent = 'No strategies available.';
  }
  ```
  but outlet/automationId/group/recursion do not. If `getOutletOptions()` (etc.) returns `[]`, the menu remains empty, yet still opens.

- **Why it matters:**
  Blank menus are confusing and lead to false bug reports. They also make it unclear whether the menu is still loading, broken, or intentionally empty.

- **Severity:** Low ⭕
- **Confidence:** High 😀
- **Category:** UI Correctness
- **Reproducing the issue:**
  1. Open Order Helper in a context where (for example) no entries have an outlet/automationId/group value.
  2. Click the corresponding filter icon.
  3. Observe an empty dropdown with no explanation.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add consistent “No … available” messaging for all filter menus when their option list is empty.

- **Proposed fix:**
  In the outlet/automationId/group/recursion menu blocks:
  - If `get*Options().length === 0`, add `menu.classList.add('stwid--empty')` and set `menu.textContent` to a short message (matching strategy/position style).

- **Implementation Checklist:**
  [ ] Add empty-state messaging for Outlet when `getOutletOptions()` returns `[]`.
  [ ] Add empty-state messaging for Automation ID when `getAutomationIdOptions()` returns `[]`.
  [ ] Add empty-state messaging for Group when `getGroupOptions()` returns `[]`.
  [ ] Add empty-state messaging for Recursion when the option set is effectively empty for the current dataset.

- **Fix risk:** Low 🟢
  UI-only messaging change; no behavior changes.

- **Why it's safe to implement:**
  It does not alter filter state, only renders text when there are no options.

- **Pros:**
  - Reduces confusion and support/debug churn.
  - Makes UI behavior consistent across columns.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F04: Dropdown outside-click listeners can leak if the header is replaced while a menu is open (Structural Issue)

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When a dropdown is open, the code listens for clicks anywhere on the page so it can close the dropdown. If the table is rebuilt while the dropdown is still open, that “listen for clicks” hook might never get removed, slowly making the app heavier over time.

- **Location:**
  `src/orderHelperRender.tableHeader.js` calls `wireMultiselectDropdown(...)` for each menu.
  
  Helper: `src/orderHelperRender.utils.js` — `wireMultiselectDropdown()` adds `document.addEventListener('click', handleOutsideClick)` when opening.

- **Detailed Finding:**
  `wireMultiselectDropdown()` registers a document-level click listener only while the menu is open, and removes it inside `closeMenu()`:

  ```js
  document.addEventListener('click', handleOutsideClick);
  ...
  document.removeEventListener('click', handleOutsideClick);
  ```

  This works *if* the menu is closed normally. However, this header is built dynamically and can be replaced during rerenders. If the DOM subtree containing `menu/menuWrap` is removed while the menu is still active, there is no guaranteed call to `closeMenu()`, meaning the `document` listener can remain registered.

  This issue is mostly lifecycle-related: this file constructs menus but does not own a teardown/unmount hook.

- **Why it matters:**
  Leaked document listeners can cause:
  - Gradual performance/memory issues after repeated open/close/re-render cycles.
  - “Phantom” handlers that run with detached DOM references.

- **Severity:** Medium ❗
- **Confidence:** Medium 🤔
- **Category:** Performance
- **Reproducing the issue:**
  N/A (depends on rerender/unmount timing and whether rerender can occur while a menu is open)

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Ensure any open menus are programmatically closed before the Order Helper DOM is cleared/replaced.

- **Proposed fix:**
  **Structural Issue:** the proper owner is the Order Helper renderer/orchestrator (likely `src/orderHelperRender.js`) that mounts/unmounts the header.
  - Before replacing the Order Helper container contents, call `closeOpenMultiselectDropdownMenus()` (from `orderHelperRender.utils.js`) to close any active menus and detach outside-click listeners.
  - Optionally, add a defensive call in the renderer’s “mount” sequence before rebuilding header/body.

- **Implementation Checklist:**
  [ ] In the renderer module that clears/rebuilds Order Helper DOM, call `closeOpenMultiselectDropdownMenus()` before teardown/rebuild.
  [ ] Verify that open menus close cleanly during rerenders without leaving `stwid--active` menus in the DOM.

- **Fix risk:** Low 🟢
  Closing menus during rerender is consistent with typical UI behavior.

- **Why it's safe to implement:**
  It only affects dropdown open state during rerender/unmount; it does not change filter semantics or saved data.

- **Pros:**
  - Prevents document-level listener leaks.
  - Makes rerenders more deterministic.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F05: Large copy/paste blocks for each filter menu increase drift risk and make fixes error-prone

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The code that builds each filter menu is almost the same, repeated many times. When you need to fix a bug or add a feature, you have to make the same change in several places—making it easy to miss one.

- **Location:**
  `src/orderHelperRender.tableHeader.js` — repeated blocks for `strategy`, `position`, `recursion`, `outlet`, `automationId`, `group`.

- **Detailed Finding:**
  Each menu block repeats the same structure:
  - Create `header`, `title`, `filterWrap`, `menuWrap`, `menuButton`, `menu`
  - Define `updateFilterIndicator()`
  - Define `updateXFilters()`
  - Render options and wire checkbox handlers
  - `updateFilterIndicator(); wireMultiselectDropdown(...);`

  This duplication makes it hard to keep behavior consistent across menus (e.g., empty-state messaging already diverges between menus).

- **Why it matters:**
  Duplication increases future bug risk (fix applied to one menu but not others) and makes the file significantly harder to review.

- **Severity:** Low ⭕
- **Confidence:** High 😀
- **Category:** Redundancy
- **Reproducing the issue:**
  N/A

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Extract a small internal helper within this module to build a “standard” multiselect filter header, keeping differences (options getter, normalize function, filter key) as parameters.

- **Proposed fix:**
  Refactor within `src/orderHelperRender.tableHeader.js` only (no cross-module changes required):
  - Create a local function (e.g., `buildMultiselectFilterHeader({ col, options, values, normalize, stateKey, applyFilters })`) that returns the `th` contents and the `refresh...Indicator` callback.
  - Use it for each of the six filter columns.

- **Implementation Checklist:**
  [ ] Identify the common DOM structure shared by all filter columns.
  [ ] Create a local helper to build the menu UI and wire handlers.
  [ ] Replace each per-column block with a call to the helper, preserving current behavior and CSS class names.
  [ ] Ensure the returned refresh-indicator callbacks still bind to the correct menuButton per column.

- **Fix risk:** Medium 🟡
  Refactors can introduce subtle wiring mistakes (wrong stateKey, wrong callback binding) if not done carefully.

- **Why it's safe to implement:**
  The refactor is purely internal to header construction and does not require changing the filter logic functions themselves.

- **Pros:**
  - Reduces drift between filter menus.
  - Makes future fixes cheaper and less error-prone.
  - Improves readability.

<!-- META-REVIEW: STEP 2 will be inserted here -->