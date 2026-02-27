# CODE REVIEW FINDINGS: `src/orderHelperRender.js`

## F01: Opening Order Helper can silently wipe unsaved editor work (forced editor reset)

### STEP 1. FIRST CODE REVIEW

When you open the Order Helper, the code forcibly resets/clears the normal entry editor. If you were in the middle of typing in an entry (and it wasn't saved yet), this can cause your text to disappear without warning.

- **Location:**
  `src/orderHelperRender.js` → `renderOrderHelper()`  
  Anchor:
  ```js
  const editorPanelApi = getEditorPanelApi();
  editorPanelApi.resetEditorState();
  ```

- **Detailed Finding:**
  `renderOrderHelper()` always calls `editorPanelApi.resetEditorState()` as part of Order Helper rendering. This is unconditional and happens before building/mounting the Order Helper DOM.

  From this file alone, there is no dirty-state check, "unsaved changes" confirmation, or attempt to preserve editor content while switching views. If `resetEditorState()` clears the editor inputs or selection highlights (likely, given the naming), then opening Order Helper becomes a destructive UI action.

  This overlaps with earlier repo-level risks around "synthetic clicks / panel toggles clearing the editor without a dirty guard", but here the reset is explicit and always executed.

- **Why it matters:**
  Losing unsaved typing is one of the most frustrating failure modes for end users. It also undermines trust in the extension UI, because the user action ("open Order Helper") doesn't intuitively imply "discard what I'm editing".

- **Severity:** High ❗❗

- **Confidence:** Medium 🤔  
  The call is unconditional; the impact depends on what `resetEditorState()` does. The name strongly implies clearing editor state, but I can't confirm exact behavior without reading `src/editorPanel.js`.

- **Reproducing the issue:**
  1. Open an entry in the editor panel.
  2. Type some text but don't save (or do whatever normally leaves the editor "dirty").
  3. Open Order Helper.
  4. Return to the entry editor and check whether your typed text is still present.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Avoid resetting the editor when switching into Order Helper unless it's confirmed safe (clean editor) or the user confirms discarding changes.

- **Proposed fix:**
  In `renderOrderHelper()`, replace the unconditional `resetEditorState()` with a guard that checks whether the editor currently has unsaved changes (via the editor panel API / shared `currentEditor` state). If dirty, either:
  - block opening Order Helper with a warning/toast, or
  - prompt confirmation (Behavior Change Required: user-facing confirmation) before clearing.

  🚩 Requires user input: confirm whether current UX already expects "Order Helper clears editor" and whether there is an existing dirty-state concept exposed by `getEditorPanelApi()`.

- **Why it's safe to implement:**
  When the editor is clean, behavior stays the same (Order Helper opens and editor is reset/cleared as before).

- **Pros:**
  Prevents accidental data loss and makes state transitions between editor and Order Helper predictable.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `renderOrderHelper()` unconditionally calls `editorPanelApi.resetEditorState()` — confirmed in code
  - `editorPanel.js` exposes `isDirty(name, uid)` method — confirmed via API return object
  - `resetEditorState()` calls `clearEditor()` which sets `isEditorDirty = false` — confirmed in code

- **Top risks:**
  - Missing evidence: While the `isDirty()` method exists, it's not exposed via `getEditorPanelApi()` return object (need to verify)

#### Technical Accuracy Audit

> *renderOrderHelper() always calls editorPanelApi.resetEditorState() as part of Order Helper rendering. This is unconditional and happens before building/mounting the Order Helper DOM.*

- **Why it may be wrong/speculative:**
  The claim is accurate. However, the review asserts there is "no dirty-state check" when there actually IS a dirty-state mechanism in `editorPanel.js` (`isDirty()` method). The issue is that the current `getEditorPanelApi()` may not expose this method, OR the render function simply doesn't use it.

- **Validation:**
  Validated ✅ — Confirmed `isDirty()` exists in `editorPanel.js` but need to verify it's in the API returned by `getEditorPanelApi()`.

- **What needs to be done/inspected to successfully validate:**
  Verify whether `isDirty` is in the object returned by `getEditorPanelApi()`. If not present, it should be added to the return object so callers can check before destructive operations.

#### Fix Quality Audit

- **Direction:**
  The suggested direction is sound. Checking dirty state before reset is the correct approach per the editor panel's own architecture.

- **Behavioral change:**
  Labeled "Behavior Change Required" in the original review (confirmation dialog). This is accurate — adding a guard changes when/whether the editor gets cleared.

- **Ambiguity:**
  Multiple options presented (block with warning OR prompt confirmation). The less-behavioral-change option should be the sole recommendation: block opening Order Helper with a warning when dirty, rather than adding confirmation dialogs.

- **Checklist:**
  The checklist mentions "Inspect `getEditorPanelApi()` shape" but doesn't verify whether `isDirty` is already exposed. This is a vague step.

- **Dependency integrity:**
  No cross-finding dependencies identified.

- **Fix risk calibration:**
  Medium is appropriate — touches high-traffic UX path.

- **Why it's safe to implement:**
  The claim is specific: "When the editor is clean, behavior stays the same." This is verifiable.

- **Mitigation:**
  None required for the LLM implementation, but the checklist should be tightened.

- **Verdict:** Implementation plan needs revision 🟡

#### Detailed Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Original checklist step 1 is vague ("Inspect getEditorPanelApi() shape") and should verify if `isDirty` is already exposed. Also, the fix should prefer blocking with warning (simpler) over confirmation dialog (more complex).

- [ ] Verify whether `isDirty` method is already exposed in `getEditorPanelApi()` return object; if not, add it
- [ ] Add a dirty check before calling `resetEditorState()` using `isDirty()` or equivalent
- [ ] If dirty, block Order Helper open and show toast/warning instead of clearing editor
- [ ] Ensure Order Helper opens normally when editor is clean (no changes to behavior in that case)
- [ ] Manual test: type unsaved text → open order helper → confirm warning appears and text is preserved

- **Fix risk:** Medium 🟡  
  This touches a high-traffic UX path. If the editor dirty-state detection is imperfect, it could either block Order Helper too often or still allow data loss.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

❌ Skipped — Requires user input 🚩
> Routed to `QUEUE_USER_REVIEW.md` — requires user confirmation on whether existing caller-level dirty guards (added in `drawer.js` F07 and `orderHelper.js` F01 via `openOrderHelper()`) are sufficient, or whether an additional guard inside `renderOrderHelper()` itself is still needed.

---

## F02: Custom sort persistence uses fire-and-forget saves, risking race conditions and silent failures

### STEP 1. FIRST CODE REVIEW

When using "Custom" sorting, the code tries to ensure entries have a stored display index and then saves affected books — but it does this in a "don't wait for it" way. That means later UI logic can continue before the save actually finishes, and if the save fails, there's no feedback.

- **Location:**
  `src/orderHelperRender.js` → `renderOrderHelper()`  
  Anchor:
  ```js
  if (orderHelperState.sort === SORT.CUSTOM) {
      const updatedBooks = ensureCustomDisplayIndex(book);
      for (const bookName of updatedBooks) {
          void saveWorldInfo(bookName, buildSavePayload(bookName), true);
      }
  }
  ```

- **Detailed Finding:**
  When `orderHelperState.sort === SORT.CUSTOM`, this function calls `ensureCustomDisplayIndex(book)` and then loops `updatedBooks`, invoking `saveWorldInfo(...)` with `void` (intentionally ignoring the returned Promise).

  Risks from this pattern:
  - **Async ordering:** `getOrderHelperEntries(book)` runs immediately after. If any downstream UI assumes persistence already happened (or depends on `WORLDINFO_UPDATED` events that may be triggered by save), the UI can briefly be in a "half-updated" state.
  - **Error handling:** failures in `saveWorldInfo` will be unobserved here; user may think custom-order is saved when it isn't.
  - **Burst saves:** this may kick multiple saves concurrently without throttling, which can increase update-event churn.

  Notably, the sort dropdown change handler in `buildVisibilityRow()` *does* `await saveWorldInfo(...)` for custom sort, so this "void save" path is inconsistent with other parts of the same feature.

- **Why it matters:**
  The Order Helper is a bulk-edit/reorder tool. If the "custom order" metadata doesn't persist reliably, users can lose ordering work or see confusing "it looked applied but didn't stick" behavior.

- **Severity:** Medium ❗

- **Confidence:** High 😀  
  The ignored promises and lack of error handling are explicit in this file.

- **Reproducing the issue:**
  1. Switch Order Helper sort to Custom.
  2. Perform actions that rely on custom ordering being persisted (reopen Order Helper, refresh list, reload page).
  3. Observe if ordering sometimes reverts or appears inconsistent (especially if the host is busy / many books).

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Make the custom-sort persistence deterministic: await the saves (or batch them) and handle/save failures visibly.

- **Proposed fix:**
  In `renderOrderHelper()`, either:
  - `await` each `saveWorldInfo` (possibly sequentially to avoid event storms), or
  - `await Promise.all(...)` with minimal concurrency if safe.

  Add a minimal failure path (toast/warn) so users aren't silently misled if persistence fails.

- **Fix risk:** Low 🟢  
  Mostly changes async ordering and adds error visibility; should not alter how custom index is computed.

- **Why it's safe to implement:**
  It preserves the same intended behavior (persist custom display indexes) but makes it reliable and observable.

- **Pros:**
  Reduces "sometimes it saves, sometimes it doesn't" issues and makes failures diagnosable.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `void saveWorldInfo(...)` explicitly ignores the returned Promise — confirmed in code
  - Other sort handlers use `await` — needs verification in `buildVisibilityRow()`

- **Top risks:**
  None identified — the issue is clearly documented in code

#### Technical Accuracy Audit

> *When orderHelperState.sort === SORT.CUSTOM, this function calls ensureCustomDisplayIndex(book) and then loops updatedBooks, invoking saveWorldInfo(...) with void (intentionally ignoring the returned Promise).*

- **Why it may be wrong/speculative:**
  The claim is accurate. The `void` keyword is present, explicitly discarding the Promise.

- **Validation:**
  Validated ✅ — Code inspection confirms the void pattern.

- **What needs to be done/inspected to successfully validate:**
  N/A — claim is confirmed.

#### Fix Quality Audit

- **Direction:**
  The proposed direction is sound: await saves sequentially and add error handling.

- **Behavioral change:**
  Not labeled as behavior change, but it IS a behavioral change — async ordering changes (saves complete before continuing vs. fire-and-forget). Should be labeled "Behavior Change Required".

- **Ambiguity:**
  Single suggestion — good.

- **Checklist:**
  Checklist is complete and actionable.

- **Dependency integrity:**
  No cross-finding dependencies identified.

- **Fix risk calibration:**
  Low is appropriate — primarily async flow change.

- **Why it's safe to implement:**
  The claim is specific and verifiable.

- **Mitigation:**
  None required.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Already fixed — not implemented.
> Evidence: `src/orderHelperRender.js` `renderOrderHelper()` uses `await saveWorldInfo(...)` inside a `try/catch` `for...of` loop (not `void`) and the function is `async`; fix applied as part of `orderHelper.js` F05 (CODE_REVIEW_CHANGELOG.md, February 17, 2026).

### STEP 3: IMPLEMENTATION

#### Implementation Notes

❌ Skipped — Already fixed
> The `void saveWorldInfo(...)` fire-and-forget loop was replaced with `await saveWorldInfo(...)` inside a sequential `try/catch` `for...of` loop and `renderOrderHelper()` was made `async`, with `toastr.error` on failure. Implemented as part of `orderHelper.js` F05 (CODE_REVIEW_CHANGELOG.md, February 17, 2026).

---

## F03: Renderer mounts new Order Helper DOM without clearing previous content (duplication / leaks)

### STEP 1. FIRST CODE REVIEW

Each time the Order Helper is rendered, the code creates a new big DOM tree and appends it to the editor container — but it doesn't remove the old one first. If Order Helper can be opened multiple times in a session, this can stack multiple tables and event listeners, slowing down the UI or causing weird behavior.

- **Location:**
  `src/orderHelperRender.js` → end of `renderOrderHelper()`  
  Anchor:
  ```js
  body.append(visibilityRowEl, bulkEditRowEl, filterEl, wrap);
  dom.editor.append(body);
  ```

- **Detailed Finding:**
  `renderOrderHelper()` constructs `body` and appends it to `dom.editor`, but this file does not clear `dom.editor` or remove/replace existing Order Helper elements. It does clear some `dom.order.*` references, but that only breaks references; it does not remove the actual DOM nodes or detach their event listeners.

  If `renderOrderHelper()` is called multiple times (e.g., opening Order Helper for different books, reopening after refresh, or toggling views), the old nodes may remain in the DOM, leading to:
  - duplicated UI
  - duplicated handlers (especially document-level ones created by subcomponents)
  - increased memory usage and slower interactions

  Whether this happens depends on how `dom.editor` is managed elsewhere (likely in `drawer.js` / editor panel orchestration), but from this file alone, `renderOrderHelper()` is not self-contained with respect to cleanup.

- **Why it matters:**
  DOM duplication and listener leaks cause progressively worse performance and "ghost interactions" (clicking one control triggers logic multiple times). These bugs are hard to diagnose because they only show up after repeated use.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔  
  The append-without-clear is certain; whether the container is cleared elsewhere isn't shown in this file.

- **Reproducing the issue:**
  1. Open Order Helper.
  2. Close it (or switch away) and open it again several times (or open it for multiple books).
  3. Watch for duplicated UI sections, slower response, or actions firing multiple times.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Ensure only one Order Helper root exists in the mount container at a time (replace/clear before appending).

- **Proposed fix:**
  In `renderOrderHelper()`, remove any existing `.stwid--orderHelper` element(s) from `dom.editor` before appending the new `body`, or explicitly set `dom.editor.innerHTML = ''` if `dom.editor` is dedicated to Order Helper content (Behavior Change Required if `dom.editor` also contains other editor content).

  Prefer a targeted removal (remove only the previous Order Helper root) to avoid unintended UI loss.

- **Fix risk:** Medium 🟡  
  Risk depends on what else shares the `dom.editor` container; an overly broad clear could remove legitimate editor UI.

- **Why it's safe to implement:**
  If removal targets only `.stwid--orderHelper`, normal editor behavior outside Order Helper remains unchanged.

- **Pros:**
  Prevents progressive slowdown and reduces risk of handler duplication across renders.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `renderOrderHelper()` appends to `dom.editor` without clearing previous content — confirmed in code
  - The function clears `dom.order.*` references but not the actual DOM nodes — confirmed

- **Top risks:**
  None identified — the issue is clearly visible in code

#### Technical Accuracy Audit

> *renderOrderHelper() constructs body and appends it to dom.editor, but this file does not clear dom.editor or remove/replace existing Order Helper elements.*

- **Why it may be wrong/speculative:**
  The claim is accurate. Code shows `dom.editor.append(body)` without any prior removal.

- **Validation:**
  Validated ✅ — Code inspection confirms append without clear.

- **What needs to be done/inspected to successfully validate:**
  Need to verify in `drawer.js` or other orchestration code whether `dom.editor` is cleared before `renderOrderHelper()` is called (external to this file).

#### Fix Quality Audit

- **Direction:**
  The proposed direction is sound: remove existing Order Helper DOM before appending new content.

- **Behavioral change:**
  Not labeled as behavior change, but it IS a behavioral change (removes existing UI before showing new). Should be labeled "Behavior Change Required".

- **Ambiguity:**
  Single suggestion — good.

- **Checklist:**
  Checklist step 1 says "Identify what else lives under dom.editor" — this requires external verification but is appropriately scoped.

- **Dependency integrity:**
  No cross-finding dependencies identified.

- **Fix risk calibration:**
  Medium is appropriate — depends on what's else in `dom.editor`.

- **Why it's safe to implement:**
  The claim is specific about targeting `.stwid--orderHelper` only.

- **Mitigation:**
  None required for LLM implementation.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Already fixed — not implemented.
> Evidence: `renderOrderHelper()` calls `editorPanelApi.resetEditorState()` at the start, which invokes `clearEditor()` in `editorPanel.js` — `dom.editor.innerHTML = ''` — removing any existing `.stwid--orderHelper` before the new body is appended.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

❌ Skipped — Already fixed
> `renderOrderHelper()` calls `editorPanelApi.resetEditorState()` before appending, which calls `clearEditor()` → `dom.editor.innerHTML = ''` in `editorPanel.js`, clearing all existing content (including any prior `.stwid--orderHelper`) before the new body is mounted. DOM duplication cannot occur in normal use.

---

### Coverage Note

- **Obvious missed findings:** None identified. All three findings are well-documented and technically accurate. The only gap is verifying whether external code (drawer.js) handles the DOM cleanup that F03 depends on.
- **Severity calibration:** F01 (High) is appropriately rated — data loss risk is high-severity. F02 and F03 (both Medium) are appropriately rated — reliability and performance issues, not immediate data loss.