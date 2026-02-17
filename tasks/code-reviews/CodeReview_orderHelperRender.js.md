# CODE REVIEW FINDINGS: `src/orderHelperRender.js`

## F01: Opening Order Helper can silently wipe unsaved editor work (forced editor reset)

### STEP 1. FIRST CODE REVIEW

When you open the Order Helper, the code forcibly resets/clears the normal entry editor. If you were in the middle of typing in an entry (and it wasn’t saved yet), this can cause your text to disappear without warning.

- **Location:**
  `src/orderHelperRender.js` → `renderOrderHelper()`  
  Anchor:
  ```js
  const editorPanelApi = getEditorPanelApi();
  editorPanelApi.resetEditorState();
  ```

- **Detailed Finding:**
  `renderOrderHelper()` always calls `editorPanelApi.resetEditorState()` as part of Order Helper rendering. This is unconditional and happens before building/mounting the Order Helper DOM.

  From this file alone, there is no dirty-state check, “unsaved changes” confirmation, or attempt to preserve editor content while switching views. If `resetEditorState()` clears the editor inputs or selection highlights (likely, given the naming), then opening Order Helper becomes a destructive UI action.

  This overlaps with earlier repo-level risks around “synthetic clicks / panel toggles clearing the editor without a dirty guard”, but here the reset is explicit and always executed.

- **Why it matters:**
  Losing unsaved typing is one of the most frustrating failure modes for end users. It also undermines trust in the extension UI, because the user action (“open Order Helper”) doesn’t intuitively imply “discard what I’m editing”.

- **Severity:** High ❗❗

- **Confidence:** Medium 🤔  
  The call is unconditional; the impact depends on what `resetEditorState()` does. The name strongly implies clearing editor state, but I can’t confirm exact behavior without reading `src/editorPanel.js`.

- **Reproducing the issue:**
  1. Open an entry in the editor panel.
  2. Type some text but don’t save (or do whatever normally leaves the editor “dirty”).
  3. Open Order Helper.
  4. Return to the entry editor and check whether your typed text is still present.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Avoid resetting the editor when switching into Order Helper unless it’s confirmed safe (clean editor) or the user confirms discarding changes.

- **Proposed fix:**
  In `renderOrderHelper()`, replace the unconditional `resetEditorState()` with a guard that checks whether the editor currently has unsaved changes (via the editor panel API / shared `currentEditor` state). If dirty, either:
  - block opening Order Helper with a warning/toast, or
  - prompt confirmation (Behavior Change Required: user-facing confirmation) before clearing.

  🚩 Requires user input: confirm whether current UX already expects “Order Helper clears editor” and whether there is an existing dirty-state concept exposed by `getEditorPanelApi()`.

- **Implementation Checklist:**
  - [ ] Inspect `getEditorPanelApi()` shape and locate a “dirty” flag or safe-check method in `src/editorPanel.js`.
  - [ ] Add a non-destructive “canResetEditorState” / “isDirty” check before calling `resetEditorState()`.
  - [ ] If dirty, short-circuit Order Helper open (or add confirmation dialog) and keep editor state intact.
  - [ ] Ensure Order Helper can still open normally when editor is clean.
  - [ ] Add a regression test plan note (manual) for “type unsaved text → open order helper → confirm preserved or confirmed discard”.

- **Fix risk:** Medium 🟡  
  This touches a high-traffic UX path. If the editor dirty-state detection is imperfect, it could either block Order Helper too often or still allow data loss.

- **Why it’s safe to implement:**
  When the editor is clean, behavior stays the same (Order Helper opens and editor is reset/cleared as before).

- **Pros:**
  Prevents accidental data loss and makes state transitions between editor and Order Helper predictable.

---

## F02: Custom sort persistence uses fire-and-forget saves, risking race conditions and silent failures

### STEP 1. FIRST CODE REVIEW

When using “Custom” sorting, the code tries to ensure entries have a stored display index and then saves affected books — but it does this in a “don’t wait for it” way. That means later UI logic can continue before the save actually finishes, and if the save fails, there’s no feedback.

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
  - **Async ordering:** `getOrderHelperEntries(book)` runs immediately after. If any downstream UI assumes persistence already happened (or depends on `WORLDINFO_UPDATED` events that may be triggered by save), the UI can briefly be in a “half-updated” state.
  - **Error handling:** failures in `saveWorldInfo` will be unobserved here; user may think custom-order is saved when it isn’t.
  - **Burst saves:** this may kick multiple saves concurrently without throttling, which can increase update-event churn.

  Notably, the sort dropdown change handler in `buildVisibilityRow()` *does* `await saveWorldInfo(...)` for custom sort, so this “void save” path is inconsistent with other parts of the same feature.

- **Why it matters:**
  The Order Helper is a bulk-edit/reorder tool. If the “custom order” metadata doesn’t persist reliably, users can lose ordering work or see confusing “it looked applied but didn’t stick” behavior.

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

  Add a minimal failure path (toast/warn) so users aren’t silently misled if persistence fails.

- **Implementation Checklist:**
  - [ ] Change the `void saveWorldInfo(...)` loop to an awaited flow.
  - [ ] Decide sequential vs. parallel saves (prefer sequential unless proven too slow).
  - [ ] Add try/catch around save(s) and log + toast warning on failure.
  - [ ] Verify `getOrderHelperEntries()` and subsequent rendering still behaves correctly during/after saves.
  - [ ] Manually test: open Order Helper with Custom sort on large sets; reopen after reload.

- **Fix risk:** Low 🟢  
  Mostly changes async ordering and adds error visibility; should not alter how custom index is computed.

- **Why it’s safe to implement:**
  It preserves the same intended behavior (persist custom display indexes) but makes it reliable and observable.

- **Pros:**
  Reduces “sometimes it saves, sometimes it doesn’t” issues and makes failures diagnosable.

---

## F03: Renderer mounts new Order Helper DOM without clearing previous content (duplication / leaks)

### STEP 1. FIRST CODE REVIEW

Each time the Order Helper is rendered, the code creates a new big DOM tree and appends it to the editor container — but it doesn’t remove the old one first. If Order Helper can be opened multiple times in a session, this can stack multiple tables and event listeners, slowing down the UI or causing weird behavior.

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
  DOM duplication and listener leaks cause progressively worse performance and “ghost interactions” (clicking one control triggers logic multiple times). These bugs are hard to diagnose because they only show up after repeated use.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔  
  The append-without-clear is certain; whether the container is cleared elsewhere isn’t shown in this file.

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

- **Implementation Checklist:**
  - [ ] Identify what else lives under `dom.editor` when Order Helper is open (verify in `drawer.js` / editor panel integration).
  - [ ] Before mounting, remove existing `dom.editor.querySelector('.stwid--orderHelper')` if present.
  - [ ] If subcomponents attach document-level listeners, add teardown hooks (or ensure they already have cleanup paths).
  - [ ] Manually test repeated open/close cycles for duplication and multi-fire behavior.

- **Fix risk:** Medium 🟡  
  Risk depends on what else shares the `dom.editor` container; an overly broad clear could remove legitimate editor UI.

- **Why it’s safe to implement:**
  If removal targets only `.stwid--orderHelper`, normal editor behavior outside Order Helper remains unchanged.

- **Pros:**
  Prevents progressive slowdown and reduces risk of handler duplication across renders.