# CODE REVIEW FINDINGS: `src/editorPanel.js`

*Reviewed: February 17, 2026*

## Scope

- **File reviewed:** `src/editorPanel.js`
- **Helper files consulted:** `src/worldEntry.js`, `src/wiUpdateHandler.js`, `src/drawer.js`
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Entry editor render pipeline (template header + `getWorldEntry`), dirty tracking to protect unsaved edits, editor reset/clear and active-row highlight control, focus/unfocus controls, and activation-settings embedding/toggling.

---

## F01: Dirty tracking silently fails for entry UID `0` because of falsy checks

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The first entry in a book can use ID `0`. This file treats `0` as "missing," so dirty protection can turn off for that entry and unsaved text can be lost.

- **Location:**
  `src/editorPanel.js` - `markEditorClean`, `isDirty`, and `markClean`

  Anchor:
  ```js
  if (!name || !uid) return;
  ...
  if (!name || !uid) return false;
  ```

- **Detailed Finding:**
  Dirty-state helpers gate on `!uid`. In JavaScript, `0` is falsy, so valid entry UID `0` is rejected by `markEditorClean`, `isDirty`, and `markClean`. When UID `0` is open, `currentEditorKey` may not be updated correctly and `isDirty(name, 0)` always returns `false`. Downstream guards in `src/drawer.js` and `src/wiUpdateHandler.js` rely on `editorPanelApi.isDirty(...)`, so they can incorrectly allow destructive refresh/toggle flows while the user has unsaved edits.

- **Why it matters:**
  This creates a direct data-loss path for a common entry ID.

- **Severity:** High ??
- **Confidence:** High ??
- **Category:** Data Integrity

- **Reproducing the issue:**
  1. Open an entry whose `uid` is `0`.
  2. Type unsaved edits in the editor.
  3. Trigger a guarded mode switch (Activation Settings / Order Helper) or an auto-refresh path.
  4. Observe the dirty guard does not treat the entry as dirty.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Replace truthiness checks with explicit nullish checks so UID `0` is handled as valid.

- **Proposed fix:**
  In `markEditorClean`, `isDirty`, and `markClean`, replace `!uid` guards with `uid == null` (and keep `!name` or tighten to `name == null` as needed). Keep `currentEditorKey` shape unchanged.

- **Implementation Checklist:**
  [ ] Update the three guard clauses in `src/editorPanel.js` to accept UID `0` as valid.
  [ ] Verify dirty detection works for entries with UID `0` and non-zero UIDs.

- **Fix risk:** Low ??
  The change is localized to guard conditions and does not alter render logic or save payload shape.

- **Why it's safe to implement:**
  It only changes validation of existing inputs and preserves all current call sites/API contracts.

- **Pros:**
  - Removes a concrete unsaved-edit loss path.
  - Makes dirty tracking consistent for all valid UIDs.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F02: `openEntryEditor()` marks the new entry clean before async load succeeds

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The code says "editing is clean" for the new row before the new editor actually opens. If loading is canceled midway, dirty state no longer matches what is on screen.

- **Location:**
  `src/editorPanel.js` - `openEntryEditor`

  Anchor:
  ```js
  clearEntryHighlights();
  markEditorClean(name, entry.uid);
  ...
  const headerTemplate = await renderTemplateAsync('worldInfoKeywordHeaders');
  if (!isTokenCurrent()) return;
  ```

- **Detailed Finding:**
  `openEntryEditor()` calls `markEditorClean(name, entry.uid)` before async template and editor DOM loading, and before `setCurrentEditor(...)`. The function has multiple early-return points (`!isTokenCurrent`, missing payload entry). On these abort paths, the previous editor DOM can remain visible, but dirty state/key have already moved to the new target. This de-synchronizes editor content vs dirty metadata and weakens unsaved-edit protections used by update/toggle guards.

- **Why it matters:**
  Users can lose unsaved edits because guard logic trusts dirty flags that no longer describe the visible editor.

- **Severity:** High ??
- **Confidence:** High ??
- **Category:** Data Integrity

- **Reproducing the issue:**
  1. Open entry A and type unsaved edits.
  2. Click another entry while rapid selection causes stale-token aborts.
  3. Trigger a refresh/toggle guard path.
  4. Observe dirty state no longer matches the editor currently shown.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Commit "clean" state only after the new editor DOM is successfully swapped into place.

- **Proposed fix:**
  In `openEntryEditor`, remove the early `markEditorClean(...)` call. Keep dirty/key updates only in the final success block (after `clearEditor`, append header/editor DOM, `setCurrentEditor`). If an abort occurs, leave prior dirty state untouched.

- **Implementation Checklist:**
  [ ] Delete the pre-async `markEditorClean(name, entry.uid)` call in `openEntryEditor`.
  [ ] Keep/retain the final `markEditorClean(name, entry.uid)` after successful DOM swap.
  [ ] Verify stale-token/missing-payload aborts do not mutate dirty state.

- **Fix risk:** Medium ??
  Timing-sensitive behavior changes in a hot click path; incorrect ordering could regress editor selection state.

- **Why it's safe to implement:**
  It does not alter what data is saved; it only aligns dirty bookkeeping with completed UI state transitions.

- **Pros:**
  - Eliminates dirty-state desynchronization on aborted opens.
  - Makes update guards more trustworthy.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F03: Dirty state can remain permanently "dirty" after successful saves

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Once the editor is marked dirty, this module has no confirmed path that marks it clean again after a successful save of the same open entry.

- **Location:**
  `src/editorPanel.js` - dirty-state model (`markEditorDirtyIfCurrent`, `markClean`), with call-path impact in `src/wiUpdateHandler.js`

  Anchor:
  ```js
  let isEditorDirty = false;
  ...
  const markClean = (name, uid)=>{ ... isEditorDirty = false; };
  ```

- **Detailed Finding:**
  Dirty is set aggressively on editor interactions, but `markClean` is not invoked from update reconciliation paths. In `src/wiUpdateHandler.js`, editor refresh can be skipped intentionally when in-editor values match incoming data; in that common path, `editorPanelApi.markClean(...)` is never called. Result: `isDirty(...)` can stay `true` even after data is saved and synchronized, causing persistent warnings and blocked mode switches.

- **Why it matters:**
  Users can be repeatedly blocked from Activation Settings/Order Helper despite having no unsaved changes.

- **Severity:** Medium ?
- **Confidence:** Medium ??
- **Category:** UI Correctness

- **Reproducing the issue:**
  1. Open an entry and edit text.
  2. Let the normal save/update cycle complete.
  3. Without reopening the entry, click Activation Settings or Order Helper.
  4. Observe dirty warning/guard can still trigger.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Explicitly clear dirty state when the current editor entry is confirmed synchronized after a save/update cycle.

- **Proposed fix:**
  Use the existing `editorPanelApi.markClean(name, uid)` from `src/wiUpdateHandler.js` once current-editor reconciliation confirms no pending refresh is needed (`needsEditorRefresh === false`) and the update cycle for that entry has completed.

- **Implementation Checklist:**
  [ ] In `src/wiUpdateHandler.js` updated-entry loop, identify the current-editor branch where values are already in sync and no click-refresh is triggered.
  [ ] Call `editorPanelApi.markClean(name, e)` in that branch.
  [ ] Verify dirty guards clear after successful same-entry saves without requiring editor reopen.

- **Fix risk:** Medium ??
  Incorrect clean timing could hide real unsaved edits if called too early.

- **Why it's safe to implement:**
  It reuses existing public API (`markClean`) and only affects dirty flag state, not persistence payloads.

- **Pros:**
  - Prevents stuck-dirty UX.
  - Aligns guard behavior with actual saved state.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F04: Stale open abort can leave active-row highlight inconsistent with editor content

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  A row is highlighted as active before loading finishes. If loading is canceled, the highlight can point to a different row than what the editor is actually showing.

- **Location:**
  `src/editorPanel.js` - `openEntryEditor`

  Anchor:
  ```js
  clearEntryHighlights();
  ...
  entryDom.classList.add('stwid--active');
  ...
  if (!isTokenCurrent()) return;
  ```

- **Detailed Finding:**
  The function clears all highlights and marks the clicked row active before async template/entry fetch completes. On abort returns (`isTokenCurrent` false or missing payload), there is no rollback to previous active row. This creates visible UI mismatch: list highlights one entry while editor still contains previous entry content.

- **Why it matters:**
  Users can edit the wrong entry by mistake because visual selection cues are unreliable.

- **Severity:** Medium ?
- **Confidence:** High ??
- **Category:** UI Correctness

- **Reproducing the issue:**
  1. Open entry A.
  2. Rapidly click entry B then entry C so earlier open aborts.
  3. Observe transient or persistent highlight/editor mismatch.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Apply active-row highlight only after the new editor content is ready to commit.

- **Proposed fix:**
  Move `clearEntryHighlights()` + `entryDom.classList.add('stwid--active')` into the final success section (right before/after DOM swap), or restore previous highlight on abort using `getCurrentEditor`/cache lookup.

- **Implementation Checklist:**
  [ ] Remove pre-async highlight mutation in `openEntryEditor`.
  [ ] Add highlight mutation only in the success commit block.
  [ ] Verify stale-token and missing-payload aborts keep list highlight aligned with the visible editor.

- **Fix risk:** Low ??
  This only changes timing of class toggling.

- **Why it's safe to implement:**
  It does not change save/update behavior, only visual state ordering.

- **Pros:**
  - Prevents misleading active-row cues.
  - Reduces accidental edits to unintended entries.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F05: `clearEntryHighlights()` scans every entry on every open/reset

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Opening an editor row loops over every entry in every book just to remove one CSS class. Large lorebook collections can feel laggy.

- **Location:**
  `src/editorPanel.js` - `clearEntryHighlights`

  Anchor:
  ```js
  for (const cb of Object.values(cache)) {
      for (const ce of Object.values(cb.dom.entry)) {
          ce.root.classList.remove('stwid--active');
      }
  }
  ```

- **Detailed Finding:**
  Highlight clearing is O(total rendered entries) and runs in hot paths (`openEntryEditor`, `showActivationSettings`, `toggleActivationSettings`, `resetEditorState`). This does unnecessary DOM writes when only one row is expected to be active.

- **Why it matters:**
  It increases input latency and can make rapid navigation feel sluggish on big datasets.

- **Severity:** Medium ?
- **Confidence:** High ??
- **Category:** Performance

- **Reproducing the issue:**
  1. Load a large set of books/entries.
  2. Rapidly open different entries.
  3. Observe increased UI latency proportional to total entry count.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Track and clear only the previously active row instead of scanning the entire cache.

- **Proposed fix:**
  Introduce an `activeEntryDom` reference inside `initEditorPanel`. Replace full-cache iteration with: remove class from previous `activeEntryDom` (if present), then set/update the new active row on successful open.

- **Implementation Checklist:**
  [ ] Add `activeEntryDom` module-local state in `src/editorPanel.js`.
  [ ] Refactor `clearEntryHighlights()` to operate on that single reference.
  [ ] Update open/reset/toggle flows to keep `activeEntryDom` in sync.

- **Fix risk:** Medium ??
  Incorrect state updates could leave stale highlight if some paths forget to reset `activeEntryDom`.

- **Why it's safe to implement:**
  The change is internal to highlight bookkeeping and does not touch persistence logic.

- **Pros:**
  - Better responsiveness on large lorebooks.
  - Less unnecessary DOM churn.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F06: Pointer-based dirty tracking marks non-editing UI interactions as unsaved edits

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Clicking any button/select-like control inside the editor is treated as an edit, even when it only changes presentation (for example opening/collapsing UI sections).

- **Location:**
  `src/editorPanel.js` - `pointerdown` dirty handler

  Anchor:
  ```js
  if (target.closest('input, textarea, select, button, [contenteditable=""], [contenteditable="true"], .checkbox')) {
      markEditorDirtyIfCurrent();
  }
  ```

- **Detailed Finding:**
  Dirty marking is intentionally conservative, but this selector includes generic `button`/`.checkbox` interactions that may not mutate entry data. Because drawer toggles rely on `isDirty(...)` (`src/drawer.js`), false positives can block mode switches with unsaved-edit warnings when no actual data changed.

- **Why it matters:**
  Users can get misleading warnings and blocked actions, reducing trust in the editor state.

- **Severity:** Medium ?
- **Confidence:** Medium ??
- **Category:** UI Correctness

- **Reproducing the issue:**
  1. Open an entry without editing text/fields.
  2. Click a presentation-only button/control in the embedded editor UI.
  3. Attempt to open Activation Settings/Order Helper.
  4. Observe dirty warning despite no persisted data change.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Narrow pointer-based dirty detection to controls that are known to mutate entry fields.

- **Proposed fix:**
  Replace broad `button` matching with explicit field selectors (for example controls that map to entry fields by `name`) or add an exclusion allowlist for presentation-only controls/classes. Keep `input/change` listeners as primary source of truth.

- **Implementation Checklist:**
  [ ] Refine the `pointerdown` selector in `src/editorPanel.js` to exclude presentation-only controls.
  [ ] Keep dirty marking for actual mutable form elements.
  [ ] Verify unsaved-edit guard still triggers for real edits but not for presentation-only toggles.

- **Fix risk:** Medium ??
  Over-tightening selectors could miss genuine edits from custom widgets.

- **Why it's safe to implement:**
  It only affects dirty-heuristic scope and preserves existing save/render APIs.

- **Pros:**
  - Fewer false warnings.
  - Cleaner alignment between user actions and dirty status.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F07: Editor-level event listeners are attached without a teardown path

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  This module adds global editor listeners but never removes them. If the panel is initialized again, handlers can stack and fire multiple times.

- **Location:**
  `src/editorPanel.js` - top-level listener registration in `initEditorPanel`

  Anchor:
  ```js
  dom.editor?.addEventListener?.('input', markEditorDirtyIfCurrent, true);
  dom.editor?.addEventListener?.('change', markEditorDirtyIfCurrent, true);
  dom.editor?.addEventListener?.('keydown', (evt)=>{ ... }, true);
  dom.editor?.addEventListener?.('pointerdown', (evt)=>{ ... }, true);
  ```

- **Detailed Finding:**
  Four capture listeners are registered during `initEditorPanel`, but there is no returned cleanup API and no remove path in caller lifecycle (`src/drawer.js`). Under re-init scenarios (hot reload/reopen patterns), duplicate listeners can accumulate and over-mark dirty state. This fails `st-js-best-practices` PERF-02 guidance (listener cleanup).

- **Why it matters:**
  Repeated initialization can cause memory leaks and duplicate behavior.

- **Severity:** Low ?
- **Confidence:** Medium ??
- **Category:** JS Best Practice

- **Reproducing the issue:**
  N/A

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add an explicit teardown hook so caller lifecycle can unregister listeners when the drawer/editor is disposed.

- **Proposed fix:**
  Store listener function references in `initEditorPanel`, return a `cleanup()` method in the API, and remove all four listeners there. Wire `cleanup()` into drawer teardown/re-init logic when available. **Structural Issue:** lifecycle ownership must be coordinated with `src/drawer.js` so teardown is called exactly once.

- **Implementation Checklist:**
  [ ] Replace inline anonymous `keydown`/`pointerdown` handlers with named function references.
  [ ] Add `cleanup()` to the returned editor panel API that removes all registered listeners.
  [ ] Call `editorPanelApi.cleanup()` from the drawer lifecycle teardown path.

- **Fix risk:** Medium ??
  Missing or double teardown calls can break dirty tracking until re-init.

- **Why it's safe to implement:**
  Properly scoped cleanup affects only listener lifecycle and does not change entry persistence rules.

- **Pros:**
  - Prevents listener leaks/duplication.
  - Aligns with documented ST extension best practices.

<!-- META-REVIEW: STEP 2 will be inserted here -->
