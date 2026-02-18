# CODE REVIEW FINDINGS: `src/orderHelperRender.utils.js`

*Reviewed: February 17, 2026*

## Scope

- **File reviewed:** `src/orderHelperRender.utils.js`
- **Helper files consulted:** `vendor/SillyTavern/public/scripts/st-context.js`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Shared multiselect dropdown DOM helpers (open/close/outside-click/checkbox), tooltip helper, and character-filter formatting for Order Helper render slices.

---

## F01: `setTooltip()` can throw if `text` is not a string (missing type guard)

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If this function is called with something that isn't plain text (for example, a number or an object), the drawer can crash instead of showing a tooltip.

- **Location:**
  `src/orderHelperRender.utils.js` → `setTooltip(...)`

  Anchor:
  ```js
  export const setTooltip = (element, text, { ariaLabel = null } = {})=>{
      if (!element || !text) return;
      element.title = text;
      const label = ariaLabel ?? text.replace(/\s*---\s*/g, ' ').replace(/\s+/g, ' ').trim();
  ```
- **Detailed Finding:**
  `setTooltip()` checks `if (!element || !text) return;`, but it does **not** check `typeof text === 'string'`.
  - `element.title = text;` will stringify non-string values, but
  - `text.replace(...)` will throw a `TypeError` if `text` is not a string (e.g., a number, object, or boolean).

  This is a robustness issue: `setTooltip()` is a shared helper used across Order Helper render slices, so any incorrect call site can hard-crash rendering and break interactivity.

- **Why it matters:**
  A single unexpected value from upstream data (or from a future refactor) can crash the UI path that uses tooltips, leaving the Order Helper partially broken.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** JS Best Practice

- **Reproducing the issue:**
  N/A (depends on an internal call site passing a non-string tooltip value)

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Treat tooltip text as an API boundary: validate `text` is a string before using string methods, and gracefully skip or coerce when invalid.

- **Proposed fix:**
  In `setTooltip(...)`:
  - Replace `if (!element || !text) return;` with:
    - `if (!element) return;`
    - If `typeof text !== 'string' || text.trim() === ''`, return (or coerce using `String(text)`; pick one policy and apply consistently).
  - Apply the same type validation for `ariaLabel` when it is provided (since `ariaLabel ?? ...` can still become a non-string and later be used as an attribute value).

- **Implementation Checklist:**
  - [ ] Update `setTooltip()` to require `typeof text === 'string'` before calling `.replace(...)`.
  - [ ] Validate `ariaLabel` type (string) when provided; otherwise fall back to the normalized `text`.
  - [ ] Ensure the early-return condition still allows tooltips like `'0'` (string) but rejects `0` (number) per the chosen policy.

- **Fix risk:** Low 🟢
  The change is localized and only affects invalid inputs; valid tooltips continue to behave the same.

- **Why it's safe to implement:**
  It does not affect dropdown open/close behavior, filtering, sorting, or save/persistence flows—only tooltip generation.

- **Pros:**
  Prevents hard crashes caused by unexpected tooltip values and makes the helper safer for reuse.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - "If this function is called with something that isn't plain text (for example, a number or an object), the drawer can crash instead of showing a tooltip."
  - "text.replace(...) will throw a TypeError if text is not a string"

- **Top risks:**
  None identified — the claim is evidence-based and correctly identifies a real bug.

#### Technical Accuracy Audit

> `if (!element || !text) return;` already handles falsy values like `null`, `undefined`, `''`, `false`.

- **Why it may be wrong/speculative:**
  The guard `!text` evaluates to `true` for falsy values, so it does filter out `null`, `undefined`, `''`, `false`. However, for the number `0`, `!0` is `false`, so `0` passes through and `.replace()` throws. This is a genuine bug.

- **Validation:**
  Validated ✅ — Confirmed by code inspection: `text.replace()` called without type check.

- **What needs to be done/inspected to successfully validate:**
  None — bug confirmed.

#### Fix Quality Audit

- **Direction:**
  The proposed direction is sound: add `typeof text === 'string'` check before string methods.

- **Behavioral change:**
  This is a bug fix — it changes behavior only for invalid inputs (non-string values). Not labeled as "Behavior Change Required" since it fixes a crash, not alters intended behavior.

- **Ambiguity:**
  Single fix direction — validate type before string methods.

- **Checklist:**
  All items are actionable:
  - Update `setTooltip()` to require `typeof text === 'string'` — specific enough for LLM.
  - Validate `ariaLabel` type — specific enough.
  - Ensure `'0'` passes — covered by the proposed `String(text)` coercion or explicit check.

- **Dependency integrity:**
  No cross-finding dependencies.

- **Fix risk calibration:**
  Fix risk is correctly rated Low — localized change, no side effects on valid inputs.

- **Why it's safe to implement:**
  Safety claim is specific: "only tooltip generation is affected" — correct.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Update `setTooltip()` to require `typeof text === 'string'` before calling `.replace(...)`.
- [x] Validate `ariaLabel` type (string) when provided; otherwise fall back to the normalized `text`.
- [x] Ensure the early-return condition still allows tooltips like `'0'` (string) but rejects `0` (number) per the chosen policy.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperRender.utils.js`
  - Split the combined `!element || !text` guard into two explicit checks: `if (!element) return;` then `if (typeof text !== 'string' || text.trim() === '') return;`
  - Added `effectiveAriaLabel` validation to require `ariaLabel` be a string before using it as the label; non-string values fall back to the normalized `text`

- Risks / Side effects
  - Valid string tooltips (including `'0'`) continue to work; only non-string `text` values are now rejected (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Open Order Helper, hover over tooltipped elements (column headers, filter dropdowns, entry links); confirm tooltips appear correctly and no console errors occur.

---

## F02: `wireMultiselectDropdown()` does not keep `aria-expanded` in sync with open/close state

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Screen readers (and other accessibility tools) can be told the menu is closed even when it is open (or vice versa), because the "expanded" flag isn't updated consistently.

- **Location:**
  `src/orderHelperRender.utils.js` → `wireMultiselectDropdown(menu, menuButton, menuWrap)`

  Anchor:
  ```js
  const closeMenu = ()=>{
      if (!menu.classList.contains('stwid--active')) return;
      menu.classList.remove('stwid--active');
      document.removeEventListener('click', handleOutsideClick);
  };
  const openMenu = ()=>{
      if (menu.classList.contains('stwid--active')) return;
      closeOpenMultiselectDropdownMenus(menu);
      menu.classList.add('stwid--active');
      document.addEventListener('click', handleOutsideClick);
  };
  ```
- **Detailed Finding:**
  The fallback path in `closeOpenMultiselectDropdownMenus()` tries to update the trigger:
  ```js
  trigger?.setAttribute('aria-expanded', 'false');
  ```
  However, the normal open/close behavior in `wireMultiselectDropdown()` never sets `menuButton.setAttribute('aria-expanded', 'true')` on open, nor resets it to `'false'` on close.

  Result: the menu can be visually open (`.stwid--active`) while `aria-expanded` is stale/incorrect. This is a UI correctness/accessibility bug, and it can also cause inconsistent state if other code depends on `aria-expanded` to reflect actual state.

- **Why it matters:**
  This makes the UI harder to use for keyboard and assistive-technology users and increases the chance of future bugs if `aria-expanded` is later used as a state signal.

- **Severity:** Low ⭕
- **Confidence:** High 😀
- **Category:** UI Correctness

- **Reproducing the issue:**
  1. Open a multiselect dropdown in Order Helper.
  2. Inspect the menu button element's `aria-expanded` attribute.
  3. Observe it may remain `"false"` even though the menu is open.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make `wireMultiselectDropdown()` the single source of truth for accessibility state: set `aria-expanded` when opening and closing.

- **Proposed fix:**
  In `wireMultiselectDropdown(...)`:
  - In `openMenu()`: call `menuButton?.setAttribute('aria-expanded', 'true')`.
  - In `closeMenu()`: call `menuButton?.setAttribute('aria-expanded', 'false')`.
  - Keep `closeOpenMultiselectDropdownMenus()`'s fallback behavior, but prefer using the registered `closeMenu` handler (which would now also set `aria-expanded`).

- **Implementation Checklist:**
  - [ ] Update `openMenu()` to set `aria-expanded="true"` on `menuButton`.
  - [ ] Update `closeMenu()` to set `aria-expanded="false"` on `menuButton`.
  - [ ] Verify `closeOpenMultiselectDropdownMenus()` closes other menus via their registered close handler so the attribute stays consistent.

- **Fix risk:** Low 🟢
  This is a non-functional accessibility/state sync improvement; it should not change which menus open/close, only the attribute.

- **Why it's safe to implement:**
  It does not alter event ordering, saving, or filtering—only an attribute update on open/close.

- **Pros:**
  Improves accessibility correctness and reduces future state drift bugs.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - "the normal open/close behavior in `wireMultiselectDropdown()` never sets `menuButton.setAttribute('aria-expanded', 'true')` on open, nor resets it to `'false'` on close"
  - "Result: the menu can be visually open (`.stwid--active`) while `aria-expanded` is stale/incorrect"

- **Top risks:**
  None identified — the claim is evidence-based and correctly identifies a real accessibility bug.

#### Technical Accuracy Audit

> `wireMultiselectDropdown()` never sets `aria-expanded` attribute on the menu button.

- **Why it may be wrong/speculative:**
  The claim is accurate based on code inspection. The code in `openMenu()` and `closeMenu()` does not include any `setAttribute('aria-expanded', ...)` calls.

- **Validation:**
  Validated ✅ — Confirmed by code inspection: `openMenu()` and `closeMenu()` functions do not manipulate the `aria-expanded` attribute.

- **What needs to be done/inspected to successfully validate:**
  None — bug confirmed.

#### Fix Quality Audit

- **Direction:**
  The proposed direction is sound: add `aria-expanded` attribute updates in `openMenu()` and `closeMenu()`.

- **Behavioral change:**
  This is a non-functional accessibility improvement — it only affects an attribute, not user-observable behavior.

- **Ambiguity:**
  Single fix direction.

- **Checklist:**
  All items are actionable and specific:
  - Update `openMenu()` — specific enough.
  - Update `closeMenu()` — specific enough.
  - Verify `closeOpenMultiselectDropdownMenus()` — the verification step is reasonable.

- **Dependency integrity:**
  No cross-finding dependencies.

- **Fix risk calibration:**
  Fix risk is correctly rated Low — attribute-only change, no functional side effects.

- **Why it's safe to implement:**
  Safety claim is specific: "only an attribute update on open/close" — correct.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Update `openMenu()` to set `aria-expanded="true"` on `menuButton`.
- [x] Update `closeMenu()` to set `aria-expanded="false"` on `menuButton`.
- [x] Verify `closeOpenMultiselectDropdownMenus()` closes other menus via their registered close handler so the attribute stays consistent.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperRender.utils.js`
  - Added `menuButton?.setAttribute('aria-expanded', 'true')` in `openMenu()` so the attribute correctly reflects the open state
  - Added `menuButton?.setAttribute('aria-expanded', 'false')` in `closeMenu()` so the attribute correctly reflects the closed state
  - `closeOpenMultiselectDropdownMenus()` already calls the registered `closeMenu` handler (which now sets `aria-expanded`), keeping the attribute in sync for externally-closed menus too

- Risks / Side effects
  - Attribute-only change; no functional open/close behavior altered (probability: ⭕)
      - **🟥 MANUAL CHECK**: [ ] Open a multiselect dropdown in Order Helper, inspect the button element's `aria-expanded` attribute; confirm it reads `"true"` when the menu is open and `"false"` after closing it.

---

## F03: Outside-click `document` listener can leak if a menu is removed while open (no teardown path)

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If the UI is rebuilt while a dropdown is open, a background "click outside to close" listener can remain attached, potentially slowing the page down or causing surprising behavior later.

- **Location:**
  `src/orderHelperRender.utils.js` → `wireMultiselectDropdown(...)` (`document.addEventListener('click', handleOutsideClick)`)

- **Detailed Finding:**
  `wireMultiselectDropdown()` adds a `document` click listener when the menu is opened and removes it only when `closeMenu()` runs.

  There is no explicit teardown/cleanup function returned for "component unmount" scenarios, and there is no defensive cleanup if:
  - the menu DOM is removed while still open (e.g., Order Helper re-render / drawer refresh), or
  - `menuWrap` becomes detached and future clicks cause `menuWrap.contains(...)` to throw (less likely, but depends on call sites and DOM lifetime).

  This matches a common ST-extension perf footgun (event listeners not cleaned up) and can create "phantom" handlers firing after the UI is gone.

- **Why it matters:**
  Over time (especially during repeated Order Helper opens/rerenders), leaked listeners can add overhead and lead to hard-to-debug UI behavior.

- **Severity:** Medium ❗
- **Confidence:** Medium 🤔
  Depends on whether Order Helper rebuilds can remove dropdown DOM while a menu is open.

- **Category:** Performance

- **Reproducing the issue:**
  N/A (depends on runtime lifecycle and whether the menu can be removed while open)

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Provide a deterministic cleanup path so callers can reliably detach document-level listeners when the containing UI is being torn down.

- **Proposed fix:**
  Update `wireMultiselectDropdown(...)` to expose teardown:
  - Return an object like `{ closeMenu, cleanup }`, or return `closeMenu` augmented with a `.cleanup()` property, where `cleanup()`:
    - calls `document.removeEventListener('click', handleOutsideClick)`
    - removes the click listeners registered on `menu` and `menuButton` (requires named handler functions instead of inline lambdas)
    - deletes `menu[MULTISELECT_DROPDOWN_CLOSE_HANDLER]` (optional but prevents stale references)

  🚩 Requires user input: confirm whether Order Helper rerender/list refresh can remove the dropdown DOM while any dropdown is open (to set final severity and ensure cleanup is wired in the right lifecycle hook).

- **Implementation Checklist:**
  - [ ] Refactor the inline event handlers in `wireMultiselectDropdown()` into named functions so they can be removed.
  - [ ] Add a `cleanup()` function that removes:
    - [ ] `document` outside-click listener
    - [ ] `menu` click handler (`stopPropagation`)
    - [ ] `menuButton` click handler
  - [ ] Change return value from `closeMenu` to `{ closeMenu, cleanup }` (or equivalent) and update call sites to call `cleanup()` when Order Helper DOM is replaced.

- **Fix risk:** Medium 🟡
  Requires changing the API shape of a shared helper and updating all call sites; mistakes can break dropdown toggling behavior.

- **Why it's safe to implement:**
  The change can be scoped to Order Helper render slices that use this helper; it does not touch World Info persistence or core ST APIs.

- **Pros:**
  Prevents listener leaks and makes dropdown wiring safer under rerender/refresh lifecycles.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - "There is no explicit teardown/cleanup function returned for 'component unmount' scenarios"
  - "wireMultiselectDropdown() adds a document click listener when the menu is opened and removes it only when closeMenu() runs"
  - "requires named handler functions instead of inline lambdas" — inline lambdas prevent removal

- **Top risks:**
  - Missing evidence / wrong prioritization — The finding has a 🚩 flag for "Requires user input" which requires a 🔴 verdict.

#### Technical Accuracy Audit

> No cleanup function is returned.

- **Why it may be wrong/speculative:**
  The claim is accurate. The function returns `closeMenu` but does not provide a way to remove the listeners without calling `closeMenu()`.

- **Validation:**
  Validated ✅ — Confirmed by code inspection: `return closeMenu;` is the only return value.

- **What needs to be done/inspected to successfully validate:**
  Need to verify whether Order Helper rebuilds can remove dropdown DOM while a menu is open.

#### Fix Quality Audit

- **Direction:**
  The proposed direction is sound: return a cleanup function.

- **Behavioral change:**
  The fix changes the API shape (returns object instead of single function) — this is a structural change that requires updating call sites. This should be flagged as "Behavior Change Required" since existing call sites will need to be updated.

- **Ambiguity:**
  Single fix direction — add cleanup function.

- **Checklist:**
  All items are actionable:
  - Refactor inline handlers — specific enough.
  - Add cleanup() — specific enough.
  - Change return value — specific enough.

- **Dependency integrity:**
  The finding correctly notes that call sites need to be updated. No cross-finding dependencies.

- **Fix risk calibration:**
  Fix risk is rated Medium — correct. Changing return value API affects all callers.

- **Why it's safe to implement:**
  The safety claim is correct: it "does not touch World Info persistence or core ST APIs."

- **Mitigation:**
  The checklist is complete but the finding has a 🚩 flag: "Requires user input: confirm whether Order Helper rerender/list refresh can remove the dropdown DOM while any dropdown is open"

- **Verdict:** Implementation plan discarded 🔴

  Reason: The finding contains a 🚩 flag requiring user input. Per the meta-review rules, findings with 🚩 flags must be discarded.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

❌ Skipped — Implementation plan discarded 🔴
> Finding contains a 🚩 flag requiring user input to confirm whether Order Helper rerender can remove dropdown DOM while a menu is open. Per meta-review rules, findings with unresolved 🚩 flags are discarded.

---

### Coverage Note

- **Obvious missed findings:** None identified.
- **Severity calibration:** F01 (Medium) and F02 (Low) are correctly calibrated. F03 (Medium) is correctly calibrated; the 🚩 flag is appropriate.