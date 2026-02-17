# CODE REVIEW FINDINGS: `index.js`

*Reviewed: February 17, 2026*

## Scope

- **File reviewed:** `index.js`
- **Helper files consulted:** `src/editorPanel.js`, `src/listPanel.js`, `src/drawer.js`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Extension startup/module composition, dev CSS watch/reload wiring, and exported jump-to-entry API.

---

## F01: `jumpToEntry()` can discard unsaved editor work when switching entries

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If another extension calls `jumpToEntry()` while the user has unsaved text, this function can force-open a different entry and the in-progress text can be lost.

- **Location:**
  `index.js` - `jumpToEntry`

  Anchor:
  ```js
  if (currentEditor?.name != name || currentEditor?.uid != uid) {
      entryDom.click();
  }
  ```

- **Detailed Finding:**
  `jumpToEntry()` performs a synthetic `click()` whenever the requested entry is not already open. That click path goes into `openEntryEditor()` (`src/editorPanel.js`), which currently reinitializes editor state during entry switches and does not have a dirty-state guard at this API boundary. Unlike the top-level toggle buttons in `src/drawer.js` (which explicitly block dirty destructive transitions), `jumpToEntry()` bypasses those safeguards and can trigger the same destructive entry-switch path directly.

- **Why it matters:**
  External callers can unintentionally cause direct user data loss (unsaved entry edits) on a common navigation path.

- **Severity:** High ❗❗
- **Confidence:** High 😀
- **Category:** Data Integrity

- **Reproducing the issue:**
  1. Open an entry and type unsaved edits.
  2. Trigger `jumpToEntry(<otherBook>, <otherUid>)` from an integration using this public API.
  3. Observe the editor switches entries and unsaved text is lost.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add a dirty-state gate in `jumpToEntry()` before any synthetic click or mode toggle side effects.

- **Proposed fix:**
  **Behavior Change Required:** In `jumpToEntry()`, read the current editor from `currentEditor` and call `editorPanelApi?.isDirty?.(currentEditor.name, currentEditor.uid)` when available. If dirty, abort navigation (return `false` and optionally show a warning). Only execute `entryDom.click()` when there are no unsaved edits.

- **Implementation Checklist:**
  [ ] Add a dirty-state check at the top of `jumpToEntry()` before toggling activation/order modes.
  [ ] Return `false` when dirty state is true, without firing `entryDom.click()`.
  [ ] Keep existing behavior unchanged for clean editor state.

- **Fix risk:** Medium 🟡
  Callers currently expecting unconditional navigation may need to handle a new `false` return path more often.

- **Why it's safe to implement:**
  It only guards destructive transitions and does not modify save payload logic, cache mutation logic, or book rendering logic.

- **Pros:**
  - Prevents a direct unsaved-edit loss path.
  - Aligns public API behavior with existing dirty protections in drawer controls.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  The claim that `jumpToEntry()` performs synthetic click without dirty guard is **evidence-based** and confirmed by code inspection.

- **Top risks:**
  - None — the finding is well-evidenced with specific code anchors.

#### Technical Accuracy Audit

> `jumpToEntry()` performs a synthetic `click()` whenever the requested entry is not already open. That click path goes into `openEntryEditor()` which does not have a dirty-state guard at this API boundary.

- **Why it may be wrong/speculative:**
  N/A — claim is correct.

- **Validation:**
  Validated ✅ — `index.js` lines 66-72 show unconditional `entryDom.click()` when entry differs.

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  Proposed direction (add dirty check) is sound and stays within module responsibility.

- **Behavioral change:**
  Explicitly labeled "Behavior Change Required" — ✅ correctly flags that callers may receive `false` returns.

- **Ambiguity:**
  Only one suggestion — ✅ no ambiguity.

- **Checklist:**
  Checklist items are complete and actionable.

- **Dependency integrity:**
  No dependencies — ✅ self-contained.

- **Fix risk calibration:**
  Fix risk rated "Medium 🟡" — ✅ accurate. Callers may need to handle new return value.

- **Why it's safe validity:**
  Safety claim is specific — ✅ verifiable.

- **Mitigation:**
  N/A

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Add a dirty-state check at the top of `jumpToEntry()` before toggling activation/order modes.
- [ ] Return `false` when dirty state is true, without firing `entryDom.click()`.
- [ ] Keep existing behavior unchanged for clean editor state.

---

## F02: Startup `refreshList()` promise is not handled

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Initial list loading starts in the background, but if it fails there is no error handling path for that startup call.

- **Location:**
  `index.js` - module bootstrap

  Anchor:
  ```js
  refreshList();
  ```

- **Detailed Finding:**
  `refreshList` is async (`src/listPanel.js`) and can reject if downstream list-loading work throws. In `index.js`, the call is fire-and-forget and has no `await`/`.catch(...)`. That creates an unhandled-promise path at startup, making failures harder to diagnose and leaving the extension in a partially initialized state without an explicit recovery or logging contract.

- **Why it matters:**
  Startup failures become opaque and can leave users with a blank or stale list and no clear actionable signal.

- **Severity:** Medium ❗
- **Confidence:** Medium 🤔
- **Category:** JS Best Practice

- **Reproducing the issue:**
  N/A

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Keep fire-and-forget startup behavior, but always attach explicit rejection handling.

- **Proposed fix:**
  Replace the bare call with `void refreshList().catch(...)` in `index.js`, log a scoped error (`[STWID]`) and preserve current bootstrap ordering. Do not convert startup to blocking `await` unless explicitly requested.

- **Implementation Checklist:**
  [ ] Update the startup invocation to `void refreshList().catch((error)=>{ ... })`.
  [ ] Emit a clear prefixed error message with the caught exception.
  [ ] Preserve current non-blocking startup order.

- **Fix risk:** Low 🟢
  This only adds error handling on an existing async path.

- **Why it's safe to implement:**
  It does not alter list loading logic itself, only how failure is surfaced and contained.

- **Pros:**
  - Eliminates unhandled-promise noise.
  - Improves diagnosability of startup failures.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  The claim that `refreshList()` is called without error handling is **evidence-based** and correct.

- **Top risks:**
  - None — the finding is well-evidenced.

#### Technical Accuracy Audit

> The call is fire-and-forget and has no `await`/`.catch(...)`.

- **Why it may be wrong/speculative:**
  N/A — claim is correct.

- **Validation:**
  Validated ✅ — `index.js` line 60 shows bare `refreshList()` call.

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  Proposed direction (add catch handler) is sound.

- **Behavioral change:**
  Not explicitly labeled — internal improvement.

- **Ambiguity:**
  Only one suggestion — ✅ no ambiguity.

- **Checklist:**
  Checklist items are complete and actionable.

- **Dependency integrity:**
  No dependencies — ✅ self-contained.

- **Fix risk calibration:**
  Fix risk rated "Low 🟢" — ✅ accurate.

- **Why it's safe validity:**
  Safety claim is specific — ✅ verifiable.

- **Mitigation:**
  N/A

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Update the startup invocation to `void refreshList().catch((error)=>{ ... })`.
- [ ] Emit a clear prefixed error message with the caught exception.
- [ ] Preserve current non-blocking startup order.

---

## F03: Dev CSS watch has no teardown path for watcher/listener lifecycle

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The development CSS watcher starts listening for updates, but there is no cleanup step to stop it later.

- **Location:**
  `index.js` - `watchCss`

  Anchor:
  ```js
  const ev = await FilesPluginApi.watch(path);
  ev.addEventListener('message', async(/**@type {boolean}*/exists)=>{
  ```

- **Detailed Finding:**
  `watchCss()` registers a `message` listener on the watcher object returned by `FilesPluginApi.watch(path)`, but no cleanup function is stored or exposed. On extension re-init/hot-reload flows, this can accumulate duplicate listeners/watchers and stale `<style>` elements. This violates `st-js-best-practices` `PERF-02` guidance (explicit listener cleanup).

- **Why it matters:**
  Repeated initialization can increase memory usage and trigger duplicate CSS update work.

- **Severity:** Low ⭕
- **Confidence:** Medium 🤔
- **Category:** JS Best Practice

- **Reproducing the issue:**
  N/A

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add an explicit lifecycle hook so watch setup always has a symmetric teardown path.

- **Proposed fix:**
  **Structural Issue:** Return a cleanup handle from `watchCss()` that removes the `message` listener and calls watcher-unsubscribe logic if provided by `FilesPluginApi.watch(...)`. Store that handle in `index.js` runtime state and invoke it from extension teardown/re-init lifecycle.

- **Implementation Checklist:**
  [ ] Refactor `watchCss()` to keep a named listener reference and return a cleanup function.
  [ ] Persist the cleanup handle in module scope.
  [ ] Invoke cleanup from the extension teardown/re-init path before creating a new watcher.

- **Fix risk:** Medium 🟡
  Requires correct teardown timing; wrong timing can disable dev CSS live updates.

- **Why it's safe to implement:**
  It is confined to dev-only CSS watch wiring and does not touch World Info persistence or editor behavior.

- **Pros:**
  - Prevents duplicate watcher/listener accumulation.
  - Brings lifecycle handling in line with extension best-practice guidance.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  The claim that the CSS watcher has no cleanup is **evidence-based** and correct — PERF-02 violation.

- **Top risks:**
  - None — the finding is well-evidenced.

#### Technical Accuracy Audit

> `watchCss()` registers a `message` listener on the watcher object, but no cleanup function is stored or exposed.

- **Why it may be wrong/speculative:**
  N/A — claim is correct.

- **Validation:**
  Validated ✅ — `index.js` lines 13-27 show watcher setup with no cleanup path.

- **What needs to be done/inspected to successfully validate:**
  N/A

#### Fix Quality Audit

- **Direction:**
  Proposed direction (add cleanup) is sound and follows best practices.

- **Behavioral change:**
  Labeled as "Structural Issue" — ✅ appropriate.

- **Ambiguity:**
  Only one suggestion — ✅ no ambiguity.

- **Checklist:**
  Checklist items are complete and actionable.

- **Dependency integrity:**
  No dependencies — ✅ self-contained.

- **Fix risk calibration:**
  Fix risk rated "Medium 🟡" — ✅ accurate.

- **Why it's safe validity:**
  Safety claim is specific — ✅ verifiable.

- **Mitigation:**
  N/A

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Refactor `watchCss()` to keep a named listener reference and return a cleanup function.
- [ ] Persist the cleanup handle in module scope.
- [ ] Invoke cleanup from the extension teardown/re-init path before creating a new watcher.

---

### Coverage Note

- **Obvious missed findings:** None identified. All findings are well-evidenced with specific code anchors. The review covers key data integrity, startup error handling, and lifecycle management issues in the extension entry point.
- **Severity calibration:** Severity ratings appear appropriate — F01 (High) addresses a direct data-loss path, F02 (Medium) addresses startup error handling, F03 (Low) addresses a best-practice violation.