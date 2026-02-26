# CODE REVIEW FINDINGS: `src/orderHelperRender.actionBar.js`

*Reviewed: February 16, 2026*

## Scope

- **File reviewed:** `src/orderHelperRender.actionBar.js`
- **Helper files consulted:** none
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Order Helper visibility/action row (select-all, hide-keys, column visibility, sort, filter toggle, chips) and bulk edit row structure (bulk edit field containers + apply actions)

---

## F01: Bulk-apply actions can throw if table DOM/cache is not ready (missing null guards)

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Several “Apply” buttons assume the table and the underlying data are always available. If the user clicks at the wrong time (during a refresh, while the Order Helper is opening/closing, or after a re-render), the extension can crash with an error and stop responding.

- **Location:**
  `src/orderHelperRender.actionBar.js` — `buildBulkEditRow(...)` click handlers (e.g., `applyActiveState`, `applyStrategy`, `applyPosition`, `applyDepth`, `applyOutlet`, `apply`, `applyRecursion`, `applyBudget`, `applyProbability`, `applySticky`, `applyCooldown`, `applyBulkDelay`)

  Anchor snippet:
  ```js
  const rows = [...dom.order.tbody.children];
  // ...
  cache[bookName].entries[uid].disable = willDisable;
  ```

- **Detailed Finding:**
  Many bulk-apply handlers dereference `dom.order.tbody.children` without verifying `dom.order.tbody` exists. They also assume:
  - `cache[bookName]` exists
  - `cache[bookName].entries[uid]` exists
  - table rows contain valid `data-book` / `data-uid`

  In this codebase, Order Helper rendering and cache synchronization are explicitly async and update-driven (`wiUpdateHandler`, `orderHelperRender`, etc.). That makes it plausible for UI controls to be clickable while:
  - the `<tbody>` hasn’t been assigned yet,
  - the table is being rebuilt,
  - cache content is temporarily missing for a row (e.g., book removed, update in-flight, scope changes).

  Any of these conditions will cause a synchronous exception (e.g., “Cannot read properties of undefined (reading 'children')” or “Cannot read properties of undefined (reading 'entries')”), breaking the current UI interaction and potentially leaving the drawer in a partially-updated state.

- **Why it matters:**
  A single mis-timed click can break the Order Helper UI and force the user to close/reopen the drawer, losing workflow progress and trust in bulk editing.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** UI Correctness

- **Reproducing the issue:**
  1. Open Order Helper.
  2. Trigger a refresh/update (e.g., book/entry changes that force a rerender), then quickly click one of the bulk “Apply” buttons while the table is still changing.
  3. Observe a console error and the action failing (or the Order Helper becoming unresponsive).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add small defensive guards at the start of each bulk-apply handler so the UI fails safely (toast + no-op) instead of throwing.

- **Proposed fix:**
  In `buildBulkEditRow(...)`, introduce a small helper (local function) that validates prerequisites and returns a safe row list:

  - Check `dom.order?.tbody instanceof HTMLElement`. If not, `toastr.warning('Order Helper table is not ready yet.'); return null;`
  - When iterating rows, validate `bookName` and `uid` and confirm `cache?.[bookName]?.entries?.[uid]` exists before mutating.
    - If missing, skip that row and optionally `console.warn` once per click (avoid spamming per-row).
  - Replace all instances of `const rows = [...dom.order.tbody.children];` with:
    - `const rows = getSafeRows(); if (!rows) return;`

  This is a localized change inside the module and does not alter the intended “apply to selected rows” behavior—only prevents hard crashes.

- **Implementation Checklist:**
  - [ ] In `buildBulkEditRow`, add a `getSafeTbodyRows()` helper that returns `HTMLElement[] | null` and emits a toast when `dom.order.tbody` is missing.
  - [ ] Update each bulk “Apply” click handler to use `getSafeTbodyRows()` and early-return when null.
  - [ ] In each handler loop, add a guard for `cache?.[bookName]?.entries?.[uid]` before writing; skip invalid rows.

- **Fix risk:** Low 🟢
  The change is additive (guards + early returns) and only affects error paths.

- **Why it's safe to implement:**
  It does not change how values are computed or saved when prerequisites are met; it only prevents exceptions when prerequisites are not met.

- **Pros:**
  Prevents Order Helper crashes from transient render/cache states and improves resilience under update churn.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ Confirmed: `const rows = [...dom.order.tbody.children];` appears in 10+ bulk-apply handlers (State, Strategy, Position, Depth, Outlet, Order, Recursion, Budget, Probability, Sticky, Cooldown, Delay). If `dom.order.tbody` is `undefined` or `null`, this throws synchronously.
  - ✅ Confirmed: `cache[bookName].entries[uid].disable = willDisable;` pattern is used throughout. If `cache[bookName]` or `cache[bookName].entries[uid]` is undefined, this throws.
  - ✅ Confirmed: `tr.getAttribute('data-book')` and `tr.getAttribute('data-uid')` can return `null` if attributes are missing, producing `bookName = null` and `uid = null`, which would then fail cache lookups.

- **Top risks:**
  - The review correctly identifies that clicking during async render/update windows can cause crashes. However, the actual frequency of this race condition is **speculative** — no concrete repro steps or observed failures are documented. The `dom.order.tbody` is assigned during render before handlers are wired; the window where it's clickable but `null` is narrow (only if DOM events fire mid-render).

#### Technical Accuracy Audit
For each questionable claim:

  > *“In this codebase, Order Helper rendering and cache synchronization are explicitly async and update-driven (`wiUpdateHandler`, `orderHelperRender`, etc.). That makes it plausible for UI controls to be clickable while the `<tbody>` hasn't been assigned yet”*

- **Why it may be wrong/speculative:**
  The claim is plausible but speculative. Looking at `orderHelperRender.js`, `dom.order.tbody` is assigned during the synchronous `buildTableBody()` call before the handlers are exposed to user interaction. The actual risk window is narrow.

- **Validation:**
  Validated ✅ — The code pattern is real (no guards exist), but the race condition likelihood is lower than implied.

- **What needs to be done/inspected to successfully validate:**
  N/A — the missing guards are confirmed; the risk is real but severity may be overstated.

#### Fix Quality Audit

- **Direction:**
  ✅ Correct. Adding guards is the right approach and stays within the module's responsibility.

- **Behavioral change:**
  ✅ None — the fix is purely defensive (early returns on invalid state). No behavioral change required.

- **Ambiguity:**
  ✅ Single suggestion (add guards) — no alternatives proposed.

- **Checklist:**
  ⚠️ Minor issue: The checklist says “skip invalid rows” but doesn't specify whether to log, toast, or silently skip. For implementation clarity, it should state: “skip invalid rows silently (or with single console.warn per batch).”

- **Dependency integrity:**
  ✅ No cross-finding dependencies declared.

- **Fix risk calibration:**
  ✅ Low is correct — additive guards with early returns.

- **"Why it's safe" validity:**
  ✅ Valid — “does not change how values are computed or saved when prerequisites are met” is specific and correct.

- **Mitigation:**
  N/A — fix risk is Low.

- **Verdict:** Ready to implement 🟢

  Original confidence is High, no 🚩 or ❌ flags. The finding is technically accurate and the proposed fix is sound.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] In `buildBulkEditRow`, add a `getSafeTbodyRows()` helper that returns `HTMLElement[] | null` and emits a toast when `dom.order.tbody` is missing.
- [x] Update each bulk "Apply" click handler to use `getSafeTbodyRows()` and early-return when null.
- [x] In each handler loop, add a guard for `cache?.[bookName]?.entries?.[uid]` before writing; skip invalid rows silently (with optional single `console.warn` per batch).


### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperRender.actionBar.js`
  - Added `getSafeTbodyRows()` and shared bulk-target helpers so bulk Apply handlers fail safely when table/cache state is missing.
  - Updated bulk Apply loops to skip invalid rows with guarded cache access instead of throwing.
  - Consolidated book-save flushing into a shared helper to keep behavior consistent after guarded mutations.

- Risks / Side effects
  - Rows with broken or missing metadata are now skipped instead of crashing the action (probability: ?)
      - **?? MANUAL CHECK**: [ ] Open Order Helper, trigger a quick refresh, click bulk Apply buttons, and confirm there are no console errors and valid selected rows still update.
---

## F02: Outside-click listeners can leak if the component is removed while menus are open

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Some dropdowns add a global “click anywhere” listener to the whole page. If the Order Helper is closed or re-rendered while a dropdown is open, that global listener may never be removed, causing weird behavior and slowly increasing memory usage.

- **Location:**
  `src/orderHelperRender.actionBar.js` — Outlet dropdown helpers in `buildBulkEditRow(...)`

  Anchor snippet:
  ```js
  document.addEventListener('click', handleOutletOutsideClick);
  // ...
  document.removeEventListener('click', handleOutletOutsideClick);
  ```

- **Detailed Finding:**
  The outlet dropdown uses a manual outside-click pattern:
  - `openOutletMenu()` calls `document.addEventListener('click', handleOutletOutsideClick)`
  - `closeOutletMenu()` removes the listener

  This cleanup only occurs if `closeOutletMenu()` runs. If the Order Helper DOM is torn down (for example, rerendered due to scope changes or closed) while the outlet menu is still “active”, there is no teardown path in this module that guarantees `closeOutletMenu()` runs. That leaves a dangling document-level event handler referencing DOM nodes that may no longer exist.

  A similar pattern likely exists in `wireMultiselectDropdown(...)` (not reviewed here), making it especially important that order helper render/unmount has an explicit cleanup hook for any “document-level” listeners. This is a classic PERF-02 category issue: listeners added must be removed deterministically.

- **Why it matters:**
  Leaked global listeners can produce phantom interactions (menus closing/opening unexpectedly) and degrade performance over time, especially if Order Helper is opened frequently.

- **Severity:** Medium ❗
- **Confidence:** Medium 🤔
- **Category:** Performance

- **Reproducing the issue:**
  N/A (depends on whether Order Helper rerenders/unmounts while the outlet dropdown is open; this can’t be confirmed from this file alone).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Ensure every document-level listener added by this module has a guaranteed cleanup path when the Order Helper UI is unmounted.

- **Proposed fix:**
  **Structural Issue:** the safest teardown trigger likely lives in the Order Helper renderer/unmount path (e.g., `orderHelperRender.js`), not inside individual row builders.

  Minimal-change approach:
  - In this module, store a cleanup function on a well-known property of the returned element (or return it explicitly), e.g.:
    - `return { element: row, refreshSelectionCount, cleanup }`
  - Implement `cleanup()` to call `closeOutletMenu()` and remove any document listeners regardless of open/closed state.
  - In the renderer module that owns mounting/unmounting of these rows, call `cleanup()` before removing/replacing the DOM.

  If the project already has a “teardown” pattern for Order Helper, align with it; do not invent a second lifecycle.

- **Implementation Checklist:**
  - [ ] In `buildBulkEditRow`, create a `cleanup()` function that calls `closeOutletMenu()` and defensively `document.removeEventListener('click', handleOutletOutsideClick)` even if the menu is not active.
  - [ ] Extend the return value to include `cleanup`.
  - [ ] In the Order Helper renderer unmount/re-render path (owner module), call `cleanup()` before replacing/removing the previous row DOM.

- **Fix risk:** Medium 🟡
  Requires threading a cleanup hook through render orchestration; incorrect wiring could miss cleanup or create new coupling.

- **Why it's safe to implement:**
  It only affects listener lifecycle; it doesn’t change the business logic of applying edits or saving world info.

- **Pros:**
  Prevents event-handler accumulation and reduces hard-to-debug "ghost click" behavior across repeated opens/rerenders.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ Confirmed: The outlet dropdown in `buildBulkEditRow` uses manual outside-click pattern with `document.addEventListener('click', handleOutletOutsideClick)` in `openOutletMenu()` and `document.removeEventListener` in `closeOutletMenu()`.
  - ⚠️ Speculative: The review claims "there is no teardown path in this module that guarantees `closeOutletMenu()` runs" — this needs validation of the Order Helper lifecycle.

- **Top risks:**
  - The finding correctly identifies the leak pattern, but the **actual impact depends on Order Helper's unmount lifecycle**, which is not documented in this file. If Order Helper never re-renders without a full page reload, the leak is negligible.

#### Technical Accuracy Audit
For each questionable claim:

  > *"If the Order Helper DOM is torn down (for example, rerendered due to scope changes or closed) while the outlet menu is still 'active', there is no teardown path in this module that guarantees `closeOutletMenu()` runs."*

- **Why it may be wrong/speculative:**
  The search of the codebase revealed no explicit cleanup/teardown pattern for Order Helper. The drawer uses `beforeunload` for global listeners, but Order Helper-specific cleanup is not visible. However, without confirming whether Order Helper re-renders in-place (which would trigger collapse handlers that call `closeOpenMultiselectDropdownMenus()`) or is completely destroyed, the severity is uncertain.

- **Validation:**
  Needs extensive analysis ❌ — Determining the exact Order Helper lifecycle and whether `closeOpenMultiselectDropdownMenus()` covers the outlet dropdown requires tracing the full render path in `orderHelperRender.js` and `drawer.js`.

- **What needs to be done/inspected to successfully validate:**
  Trace the Order Helper render/unmount lifecycle: when `renderOrderHelper()` is called, is the previous DOM removed? Does `closeOpenMultiselectDropdownMenus()` get called before removal? Check if outlet menu's `closeOutletMenu` is registered via `MULTISELECT_DROPDOWN_CLOSE_HANDLER`.

#### Fix Quality Audit

- **Direction:**
  ⚠️ Correct but under-specified. The proposed fix (add `cleanup()` return value) is sound, but it requires changes to multiple modules (`orderHelperRender.actionBar.js` AND `orderHelperRender.js`), making it a **Structural Issue** that crosses module boundaries.

- **Behavioral change:**
  ✅ None — only affects listener lifecycle.

- **Ambiguity:**
  ⚠️ The fix mentions "If the project already has a teardown pattern for Order Helper, align with it" but doesn't confirm whether one exists. This puts implementer in a position to research this.

- **Checklist:**
  ⚠️ The checklist requires modifying `orderHelperRender.js` but doesn't specify WHERE in that file to call cleanup. The renderer's `renderOrderHelper` function replaces `dom.order.root.innerHTML` — the checklist should specify calling cleanup BEFORE that innerHTML assignment.

- **Dependency integrity:**
  ⚠️ Declares dependency on `orderHelperRender.js` changes but doesn't note that `wireMultiselectDropdown` (used elsewhere) may also need similar treatment.

- **Fix risk calibration:**
  ✅ Medium is correct — multi-module change with lifecycle implications.

- **"Why it's safe" validity:**
  ✅ Valid — "only affects listener lifecycle" is accurate.

- **Mitigation:**
  N/A — Medium risk is acceptable.

- **Verdict:** Implementation plan needs revision 🟡

  The finding is valid but requires additional research to determine the exact lifecycle before implementation. The checklist should be revised to include: (1) confirming whether `closeOpenMultiselectDropdownMenus()` already handles outlet dropdown via `MULTISELECT_DROPDOWN_CLOSE_HANDLER`, and (2) specific location in renderer to call cleanup.

#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Checklist has missing steps that need research before implementation can proceed safely.
> Revisions applied: Added research step to validate existing cleanup coverage, and clarified the exact location in renderer where cleanup should be called.

- [x] **Research step:** Check if `outletMenu[MULTISELECT_DROPDOWN_CLOSE_HANDLER] = closeOutletMenu` already registers the outlet menu for cleanup via `closeOpenMultiselectDropdownMenus()`. If yes, verify that function is called on collapse/unmount.
- [x] In `buildBulkEditRow`, create a `cleanup()` function that calls `closeOutletMenu()` and defensively `document.removeEventListener('click', handleOutletOutsideClick)` regardless of menu state.
- [x] Extend the return value of `buildBulkEditRow` to include `cleanup`.
- [x] In `orderHelperRender.js`, in `renderOrderHelper()`, locate the DOM replacement point (where `dom.order.root` children are replaced) and call cleanup on the previous bulk edit row BEFORE the replacement.


### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperRender.actionBar.js`, `src/orderHelperRender.js`
  - Confirmed the outlet menu already registers `MULTISELECT_DROPDOWN_CLOSE_HANDLER` and is closed on collapse via `closeOpenMultiselectDropdownMenus()`.
  - Added a dedicated bulk-row `cleanup()` in `buildBulkEditRow()` to always remove the document outside-click listener.
  - Added renderer-level lifecycle wiring to run the previous bulk-row cleanup before each rerender.

- Risks / Side effects
  - Cleanup now runs on every rerender; if future code reuses stale DOM refs, they will be closed sooner (probability: ?)
      - **?? MANUAL CHECK**: [ ] Open the outlet dropdown, switch Order Helper scope or rerender, and confirm no ghost outside-click behavior remains.
---

## F03: Bulk apply loops can freeze the UI on large tables (no yielding in hot loops)

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When there are lots of entries, clicking “Apply” can make the page feel frozen until it finishes, because the code tries to update everything in one go without letting the browser “breathe”.

- **Location:**
  `src/orderHelperRender.actionBar.js` — multiple bulk apply handlers iterate all `<tr>` rows and perform DOM queries/updates synchronously.

  Anchor snippet:
  ```js
  for (const tr of rows) {
      if (tr.classList.contains('stwid--isFiltered')) continue;
      if (!isOrderHelperRowSelected(tr)) continue;
      // DOM queries + cache mutation per row
  }
  ```

- **Detailed Finding:**
  Each bulk action:
  - iterates all rows,
  - checks filters/selection,
  - performs per-row DOM queries (`querySelector`, `querySelectorAll`) and DOM mutations,
  - then performs one or more async saves.

  For large books/scopes (hundreds or thousands of rows), the synchronous portion can be long enough to block rendering and input, creating perceived lag. This is a PERF-03 risk: heavy synchronous computation on the UI thread.

  The current code does not yield during these loops, and does not batch DOM operations (e.g., precomputing selected row list once). The design is correct logically, but performance may degrade with scale.

- **Why it matters:**
  Bulk edit is specifically used when there are many entries. If bulk operations lag, users may double-click, change state mid-operation, or believe the operation failed.

- **Severity:** Low ⭕
- **Confidence:** Medium 🤔
- **Category:** Performance

- **Reproducing the issue:**
  1. Open Order Helper on a book/scope with a very large number of entries.
  2. Select many rows.
  3. Click an “Apply” button (e.g., Strategy or Order).
  4. Observe the UI becoming temporarily unresponsive.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Keep behavior the same, but yield during long loops and avoid repeated DOM queries where possible.

- **Proposed fix:**
  For bulk actions with potentially large row counts:
  - Convert `for (const tr of rows)` to indexed loops and yield periodically:
    - `if (i % 200 === 0) await new Promise(r => setTimeout(r, 0));`
  - Precompute the “target rows” once:
    - `const targets = rows.filter(r => !r.classList.contains('stwid--isFiltered') && isOrderHelperRowSelected(r));`
  - Only query DOM controls when needed (and guard nulls).

  Apply this pattern to the highest-frequency actions first (State/Strategy/Position/Order).

- **Implementation Checklist:**
  - [ ] For 2–3 most common bulk actions (State, Strategy, Order), refactor to build a `targets` array of rows to mutate.
  - [ ] Add periodic yields inside the mutation loop (every ~200 targets).
  - [ ] Keep save behavior the same (save once per book after mutations).

- **Fix risk:** Medium 🟡
  Yielding introduces new async boundaries; if other code expects the operation to be fully synchronous, timing could change (though results should remain the same).

- **Why it's safe to implement:**
  The final mutated state and save payload are unchanged; only the scheduling is adjusted to avoid UI stalls.

- **Pros:**
  Improves perceived responsiveness for large bulk edits and reduces accidental double-activation by users.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ Confirmed: The bulk apply handlers use `for (const tr of rows)` with synchronous DOM operations inside the loop.
  - ✅ Confirmed: Each iteration performs `classList.contains()` checks and cache mutations — these are synchronous.
  - ⚠️ Speculative: The review claims "For large books/scopes (hundreds or thousands of rows), the synchronous portion can be long enough to block rendering" — no performance measurements or concrete thresholds are provided.

- **Top risks:**
  - The severity is appropriately rated Low because the issue only affects users with very large lorebooks. However, the confidence is Medium because the actual impact hasn't been measured. The PERF-03 rule states "Heavy synchronous loops freeze the browser" but doesn't define "heavy" — 100 rows may be fine, 1000 may not.

#### Technical Accuracy Audit
For each questionable claim:

  > *"For large books/scopes (hundreds or thousands of rows), the synchronous portion can be long enough to block rendering and input, creating perceived lag."*

- **Why it may be wrong/speculative:**
  No benchmark data is provided. The actual time per iteration depends on DOM query complexity (typically <1ms per row for simple operations). At 200 rows with yield, the overhead of `setTimeout` may exceed the benefit. The "200" threshold is arbitrary.

- **Validation:**
  Validated ✅ — The pattern matches PERF-03 guidance, but the actual impact is workload-dependent.

- **What needs to be done/inspected to successfully validate:**
  Performance testing with 500+ row lorebooks would confirm severity. Without it, this remains a preventive optimization.

#### Fix Quality Audit

- **Direction:**
  ✅ Correct. Precomputing target rows and yielding are sound performance patterns per PERF-03.

- **Behavioral change:**
  ⚠️ **Behavior Change Required** — Yielding introduces async boundaries. The current handlers are `async` but the loop body is synchronous. Adding `await` inside the loop means the save operation happens AFTER all yields complete, potentially allowing user to change selection mid-operation. This should be labeled as a behavioral change.

- **Ambiguity:**
  ⚠️ The fix says "Apply this pattern to the highest-frequency actions first" but doesn't specify whether all 12+ bulk handlers need the same treatment or only the 2-3 listed.

- **Checklist:**
  ⚠️ Missing step: The checklist should include disabling the Apply buttons during operation to prevent double-clicks, which is one of the stated motivations for the fix.

- **Dependency integrity:**
  ✅ No cross-finding dependencies.

- **Fix risk calibration:**
  ⚠️ Medium is correct, but the reason given ("timing could change") understates the risk. The real risk is **user interaction during the async gaps** — user could change row selection between yield points.

- **"Why it's safe" validity:**
  ⚠️ Partially valid — "final mutated state and save payload are unchanged" is true, but the async gaps introduce new intermediate states where user actions could produce inconsistent results.

- **Mitigation:**
  Consider disabling the Apply button during the operation to prevent concurrent mutations.

- **Verdict:** Implementation plan needs revision 🟡

  The finding is valid but the fix introduces behavioral changes (async gaps allowing user interaction) that should be mitigated. The checklist should be revised to include button disabling.

#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Fix risk understates the behavioral change introduced by async yielding; checklist missing mitigation step.
> Revisions applied: Added button-disabling step to prevent concurrent mutations during async operation.

- [x] For 2�3 most common bulk actions (State, Strategy, Order), refactor to build a `targets` array of rows to mutate upfront (filter + selection check).
- [x] At the start of each handler, disable the Apply button; re-enable it after save completes.
- [x] Add periodic yields inside the mutation loop (every ~200 targets) using `await new Promise(r => setTimeout(r, 0));`
- [x] Keep save behavior the same (save once per book after all mutations complete).


### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperRender.actionBar.js`
  - Refactored State, Strategy, and Order handlers to precompute a guarded `targets` list before mutation.
  - Added apply-button lock/disable handling (`withApplyButtonLock`) to prevent concurrent clicks during in-flight bulk updates.
  - Added periodic loop yielding every 200 targets to keep UI responsiveness on large tables while preserving one-save-per-book behavior.

- Risks / Side effects
  - Long-running bulk actions now span multiple micro-pauses, so users can see incremental UI updates during apply (probability: ?)
      - **?? MANUAL CHECK**: [ ] Run State/Strategy/Order apply on a large entry list and confirm the button is temporarily disabled, the UI stays responsive, and final saved values are correct.
---

## F04: Direction radios are not grouped as radios (no `name`), risking inconsistent UI/accessibility

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The “up/down” choice is implemented with two radio buttons, but they aren’t set up like a normal radio group. This can cause confusing behavior for keyboard users and makes future changes riskier.

- **Location:**
  `src/orderHelperRender.actionBar.js` — `buildBulkEditRow(...)` direction radio construction.

  Anchor snippet:
  ```js
  inp.type = 'radio';
  inp.addEventListener('click', ()=>{
      inp.checked = true;
      dom.order.direction.down.checked = false;
  });
  ```

- **Detailed Finding:**
  The two radio inputs have `type = 'radio'` but no shared `name`. Without a shared name, browsers do not automatically enforce mutual exclusivity or proper radio-group semantics. The code compensates by manually unchecking the other input on click.

  This works for mouse clicks, but:
  - it is less robust for keyboard navigation and assistive technology semantics,
  - it increases maintenance risk (any additional direction option would require manual uncheck logic),
  - it can desync if the state is manipulated elsewhere without the click handler.

- **Why it matters:**
  This is low-impact day-to-day, but it’s a correctness/accessibility edge case and a future footgun for UI state consistency.

- **Severity:** Low ⭕
- **Confidence:** High 😀
- **Category:** UI Correctness

- **Reproducing the issue:**
  N/A (primarily a semantic/robustness issue; visible behavior may still appear correct in basic mouse usage).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Use a normal radio group (shared `name`) and handle selection through `change` events.

- **Proposed fix:**
  In the direction control creation:
  - Assign both inputs the same `name`, e.g. `inp.name = 'stwid--order-direction';`
  - Replace manual uncheck logic with a `change` handler that writes localStorage based on the checked input.
  - Preserve current persisted semantics (`'up'` vs `'down'`).

- **Implementation Checklist:**
  - [ ] Add a shared `name` attribute to the up/down radio inputs.
  - [ ] Replace `click` handlers with `change` handlers that persist the selected direction.
  - [ ] Remove manual uncheck logic (browser will enforce exclusivity).

- **Fix risk:** Low 🟢
  This is a standard HTML behavior change that should preserve the same selected value and persistence.

- **Why it's safe to implement:**
  It only affects the direction UI control wiring; it doesn’t affect row ordering logic beyond reading the same checked state.

- **Pros:**
  More robust UI semantics and fewer edge cases for keyboard/accessibility and future maintenance.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - ✅ Confirmed: The code creates two `<input type="radio">` elements without a `name` attribute, then manually manages mutual exclusivity via `click` handlers that set `inp.checked = true` and uncheck the sibling.
  - ✅ Confirmed: The pattern exists at lines ~680-720 in the direction control section of `buildBulkEditRow()`.
  - ✅ Confirmed: Without a shared `name`, browser native radio group behavior (arrow key navigation, automatic exclusivity) is not available.

- **Top risks:**
  - The issue is correctly identified as Low severity — the current manual exclusion logic works for mouse clicks. The risk is primarily accessibility (keyboard users can't use arrow keys to switch) and future maintenance (adding a third option requires more manual wiring).

#### Technical Accuracy Audit
For each questionable claim:

  > *"This works for mouse clicks, but: it is less robust for keyboard navigation and assistive technology semantics"*

- **Why it may be wrong/speculative:**
  The claim is accurate. Without a shared `name`, keyboard navigation between radios doesn't work (arrow keys don't switch focus), and screen readers won't announce them as a group.

- **Validation:**
  Validated ✅ — Standard HTML radio behavior requires shared `name` attribute for proper grouping.

- **What needs to be done/inspected to successfully validate:**
  N/A — the HTML spec is clear on this.

#### Fix Quality Audit

- **Direction:**
  ✅ Correct. Using standard radio group semantics with shared `name` is the right approach.

- **Behavioral change:**
  ⚠️ **Minor behavior change** — Switching from `click` to `change` events may affect timing slightly (change fires after click), but the end result (localStorage persistence) is identical.

- **Ambiguity:**
  ✅ Single suggestion (add name, switch to change events) — no alternatives proposed.

- **Checklist:**
  ✅ Complete and actionable. The three steps are clear and sufficient.

- **Dependency integrity:**
  ✅ No cross-finding dependencies.

- **Fix risk calibration:**
  ✅ Low is correct — small localized change with standard HTML behavior.

- **"Why it's safe" validity:**
  ✅ Valid — "only affects the direction UI control wiring" is accurate. The row ordering logic only reads `dom.order.direction.up.checked` which continues to work.

- **Mitigation:**
  N/A — fix risk is Low.

- **Verdict:** Ready to implement 🟢

  Original confidence is High, no 🚩 or ❌ flags. The finding is technically accurate and the proposed fix is sound.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Add a shared `name` attribute to the up/down radio inputs (e.g., `inp.name = 'stwid--order-direction';` for both).
- [x] Replace `click` handlers with `change` handlers that persist the selected direction to localStorage.
- [x] Remove manual uncheck logic (`dom.order.direction.down.checked = false` etc.) � browser will enforce exclusivity automatically.


### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/orderHelperRender.actionBar.js`
  - Added a shared radio group name (`stwid--order-direction`) for up/down direction inputs.
  - Switched persistence listeners from `click` to `change`, writing only when the option is checked.
  - Removed manual sibling-uncheck logic so browser-native radio behavior handles exclusivity.

- Risks / Side effects
  - Direction persistence now follows native radio change timing instead of click timing (probability: ?)
      - **?? MANUAL CHECK**: [ ] Toggle Direction between up/down and reload; confirm the selected option persists and only one option can be selected at a time.
---

### Coverage Note

- **Obvious missed findings:** None identified. The review covers the main categories: null guards (F01), listener cleanup (F02), performance (F03), and semantic correctness (F04).

- **Severity calibration:** Appropriate. F01 is Medium because crashes disrupt user workflow; F02 is Medium but speculative (depends on lifecycle); F03 is Low (only affects large lorebooks); F04 is Low (accessibility/maintenance concern only).
