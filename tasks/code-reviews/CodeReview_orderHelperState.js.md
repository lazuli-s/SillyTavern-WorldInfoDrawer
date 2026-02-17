# CODE REVIEW FINDINGS: `src/orderHelperState.js`

*Reviewed: February 17, 2026*

## Scope

- **File reviewed:** `src/orderHelperState.js`
- **Helper files consulted:** `src/constants.js`, `src/orderHelper.js`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Order Helper state creation (defaults + restored localStorage state); persisted state keys (`sort`, `hide-keys`, `columns`)

---

## F01: Order Helper state initialization depends on live core template DOM, causing empty/mismatched option lists

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The Order Helper decides which “Strategy” and “Position” options exist by reading a hidden SillyTavern template in the page. If that template isn’t loaded yet (or changes), the Order Helper can start with missing options, leading to confusing filters or missing dropdown choices.

- **Location:**
  `src/orderHelperState.js` — `getStrategyOptions()`, `getPositionOptions()`, `createOrderHelperState()`

  Anchor snippets:
  - `document.querySelector('#entry_edit_template [name="entryStateSelector"]')`
  - `filters: { strategy: getStrategyValues(), position: getPositionValues(), ... }`

- **Detailed Finding:**
  `createOrderHelperState()` populates both:
  - the *available value lists* (`strategyValues`, `positionValues`)
  - and the *active filter selections* (`filters.strategy`, `filters.position`)
  by calling `getStrategyValues()` / `getPositionValues()`, which scrape `<option>` elements from `#entry_edit_template`.

  This creates a hard dependency on the presence and stability of the core template DOM at the time `createOrderHelperState()` is called. The code does attempt to mitigate this later: `openOrderHelper()` in `src/orderHelper.js` calls `syncOrderHelperStrategyFilters()` / `syncOrderHelperPositionFilters()` before rendering. However, the risk remains that:
  - initialization runs before templates exist (returns empty arrays),
  - callers use state before `openOrderHelper()` runs (or if future code paths render without calling the sync first),
  - or upstream template names/structure changes (selector drift), silently producing empty option sets.

  Architecturally, this is also a scope blur: `orderHelperState.js` is described as “state creation + persistence”; DOM scraping is a UI/template integration concern and is more naturally owned by the Order Helper renderer or initialization layer.

- **Why it matters:**
  When filter option lists are empty or wrong, users can see an Order Helper table that appears “broken” (no options, unexpected filtering behavior, or defaults that don’t match what the UI shows), which erodes trust in bulk-edit tooling.

- **Severity:** Medium ❗
- **Confidence:** Medium 🤔
- **Category:** UI Correctness
- **Reproducing the issue:**
  1. Open SillyTavern and trigger the extension in a state where the `#entry_edit_template` is not yet present (early init / unusual load ordering).
  2. Open Order Helper.
  3. Observe Strategy/Position filter menus missing options or defaulting to an unexpected set.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Keep state/persistence logic in `orderHelperState.js`, but move DOM-derived option discovery closer to where the template is guaranteed to exist (render/open time), then inject those values into state.

- **Proposed fix:**
  - Refactor `createOrderHelperState()` to accept the initial option lists as parameters (e.g., `createOrderHelperState({ SORT, SORT_DIRECTION, strategyValues, positionValues })`) and stop querying the DOM inside state creation.
  - Move the DOM-scraping helpers (`getStrategyOptions`/`getPositionOptions`) to the renderer/init layer (or keep them exported but ensure `createOrderHelperState()` does not call them).
  - Ensure `openOrderHelper()` (or the renderer entrypoint) computes these lists once at open time and assigns both:
    - `orderHelperState.strategyValues` / `orderHelperState.positionValues`
    - and the default “select all” filter values when filters are empty (only when there is no persisted user selection).

- **Implementation Checklist:**
  - [ ] Update `createOrderHelperState()` signature to accept `strategyValues` and `positionValues` (arrays of strings), and use them to initialize both `filters.*` and `*Values` fields.
  - [ ] Update `initOrderHelper()` (`src/orderHelper.js`) to compute strategy/position values at Order Helper open/render time (single snapshot) and pass them into `createOrderHelperState()` (or assign into state before first render).
  - [ ] Remove the DOM scraping calls from inside `createOrderHelperState()` so state initialization cannot silently start “empty” due to template timing.
  - [ ] Keep `syncOrderHelperStrategyFilters()` / `syncOrderHelperPositionFilters()` as the single “refresh from DOM” mechanism after open, rather than having two separate discovery paths.

- **Fix risk:** Medium 🟡
  This touches initialization wiring between `orderHelper.js` and `orderHelperState.js`. If the injection path is wrong, menus/filters may initialize incorrectly. However, the change is localized and can preserve existing behavior if implemented carefully.

- **Why it's safe to implement:**
  This change is internal to Order Helper initialization and does not alter SillyTavern-owned data or persistence APIs. It narrows responsibility boundaries and makes initialization more deterministic.

- **Pros:**
  - Reduces “works on my machine” timing issues.
  - Makes option lists consistent (single snapshot) and less sensitive to selector drift.
  - Aligns module responsibilities with `FEATURE_MAP`/`ARCHITECTURE`.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F02: Recursion option values are duplicated locally instead of deriving from the shared constants schema

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The list of recursion modes is written in more than one place. If one copy changes and the other doesn’t, users can get broken filters or mismatched labels without an obvious error.

- **Location:**
  `src/orderHelperState.js` — `createOrderHelperState()`

  Anchor snippet:
  ```js
  const recursionValues = [
      'excludeRecursion',
      'preventRecursion',
      'delayUntilRecursion',
  ];
  ```

- **Detailed Finding:**
  `src/constants.js` defines `ORDER_HELPER_RECURSION_OPTIONS` as the shared schema for recursion values/labels. `orderHelperState.js` independently defines the same values as raw strings. This is a classic drift hazard: future updates might add/remove/rename recursion options in `constants.js` (for table header/row UI), but the state defaults and filter initialization would still reference the old set, causing:
  - missing options in filters,
  - rows that can’t be filtered correctly,
  - confusing “nothing matches” scenarios.

- **Why it matters:**
  Order Helper is a bulk-edit tool; users rely on filters to avoid editing the wrong entries. Drift in filter semantics can lead to incorrect bulk edits.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** Redundancy
- **Reproducing the issue:**
  N/A (this is a maintainability drift risk that manifests after a future change).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Treat `src/constants.js` as the single source of truth for recursion values and derive state defaults from it.

- **Proposed fix:**
  - Import `ORDER_HELPER_RECURSION_OPTIONS` into `orderHelperState.js`.
  - Replace the hardcoded `recursionValues` list with `ORDER_HELPER_RECURSION_OPTIONS.map(o => o.value)`.
  - Use that derived list for both `filters.recursion` and `recursionValues` on state.

- **Implementation Checklist:**
  - [ ] Add `import { ORDER_HELPER_RECURSION_OPTIONS } from './constants.js';` to `src/orderHelperState.js`.
  - [ ] Replace the hardcoded recursion string array with a derived array from `ORDER_HELPER_RECURSION_OPTIONS`.
  - [ ] Ensure the state fields `filters.recursion` and `recursionValues` both reference the derived values.

- **Fix risk:** Low 🟢
  This is a small refactor that should not change runtime behavior as long as the constants values match the existing strings.

- **Why it's safe to implement:**
  It only changes how the default list is constructed; it does not change saving, rendering, or the meaning of any value.

- **Pros:**
  - Prevents future drift between UI schema and default filter state.
  - Reduces duplicated “magic strings”.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F03: Multiple DOM scrapes for strategy/position lists can create inconsistent snapshots and unnecessary work

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The file reads the same dropdown options from the page multiple times during setup. If the page changes between reads (even briefly), the Order Helper can start with mismatched internal lists. It also does extra work for no user-visible benefit.

- **Location:**
  `src/orderHelperState.js` — `createOrderHelperState()`

  Anchor snippet:
  ```js
  filters: {
      strategy: getStrategyValues(),
      position: getPositionValues(),
      ...
  },
  strategyValues: getStrategyValues(),
  positionValues: getPositionValues(),
  ```

- **Detailed Finding:**
  `createOrderHelperState()` calls `getStrategyValues()` twice and `getPositionValues()` twice. Each call performs a DOM query and iterates `<option>` nodes. While this is not heavy work, it is unnecessary duplication and risks creating a non-atomic snapshot (e.g., strategy filters initialized from one DOM state and `strategyValues` from another) if the template is dynamically swapped/updated.

  This compounds F01’s root issue (DOM dependency) by making the dependency non-singleton even within a single initialization.

- **Why it matters:**
  Small inconsistencies in filter initialization can lead to confusing UI states (“why is this option in the menu but not selected?”). Reducing redundant DOM reads also reduces the chance of edge-case timing bugs.

- **Severity:** Low ⭕
- **Confidence:** High 😀
- **Category:** Performance
- **Reproducing the issue:**
  N/A (timing-dependent; easiest observed only under unusual DOM churn).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Compute strategy/position values once per initialization and reuse the same arrays for all state fields.

- **Proposed fix:**
  - In `createOrderHelperState()`, compute:
    - `const strategyValues = getStrategyValues();`
    - `const positionValues = getPositionValues();`
    once, then use these variables to populate both `filters.*` and `*Values`.
  - If implementing F01 (injecting values), this finding is automatically resolved.

- **Implementation Checklist:**
  - [ ] Introduce single-snapshot `strategyValues` and `positionValues` locals in `createOrderHelperState()`.
  - [ ] Replace duplicate calls with the local snapshot variables.
  - [ ] If F01 is implemented (injected values), remove this duplication as part of that refactor.

- **Fix risk:** Low 🟢
  This is a small internal refactor with minimal surface area.

- **Why it's safe to implement:**
  It does not change what values are used—only ensures they are taken from a single snapshot.

- **Pros:**
  - Less redundant DOM work.
  - More predictable initialization state.

<!-- META-REVIEW: STEP 2 will be inserted here -->