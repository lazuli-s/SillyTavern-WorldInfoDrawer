# CODE REVIEW FINDINGS: editorPanel.js

Scope reviewed:
- `src/editorPanel.js`
- Direct call sites relevant to findings (evidence only): `src/worldEntry.js`, `src/wiUpdateHandler.js`, `src/drawer.js`

## F01: Dirty-tracking can become desynchronized when `openEntryEditor` aborts early (stale click token or missing payload entry), risking silent loss of edits
- Location:
  - `src/editorPanel.js` → `initEditorPanel(...)` → `openEntryEditor(...)`
  - Anchor snippet:
    - `markEditorClean(name, entry.uid);`
    - `if (!isTokenCurrent()) return;` (multiple early returns)
    - `const payload = buildSavePayload(name);`
    - `const payloadEntry = payload?.entries?.[entry.uid];`
    - `if (!payloadEntry) return;`

- What the issue is  
  `openEntryEditor` calls `markEditorClean(name, entry.uid)` very early (before any DOM swap and before `setCurrentEditor(...)`). If the function then returns early due to:
  - `isTokenCurrent()` becoming false (user clicks another entry quickly), or
  - `payloadEntry` missing (cache changed between click and editor open, e.g., entry deleted/refresh),
  then `currentEditorKey` is left pointing at the *new* (aborted) entry, while the UI may still be showing the *previous* entry editor DOM.

  From that point on, any user input in the still-visible editor will set `isEditorDirty = true` (because `currentEditorKey` is non-null), but it will be “attributed” to the wrong `{name, uid}`.

- Why it matters (impact)  
  This undermines the main safety contract of dirty tracking (“don’t rebuild editor while user is typing”):
  - `src/wiUpdateHandler.js` uses `editorPanelApi.isDirty(name, uid)` to decide whether it’s safe to auto-refresh the editor (`shouldAutoRefreshEditor`).
  - If dirty state is attributed to the wrong entry, `shouldAutoRefreshEditor` may incorrectly decide it’s safe to rebuild the actually-open editor.
  - Failure mode: user types in entry A, quickly clicks entry B, entry B open aborts mid-way, dirty key now points at B, and a later WORLDINFO update triggers an auto-refresh of A that rebuilds the editor and discards typed changes.

- Severity: High

- Fix risk: Medium  
  Dirty tracking semantics affect multiple flows (auto-refresh in `wiUpdateHandler`, and UX behavior around refresh).

- Confidence: Medium  
  Depends on timing windows, but the early `markEditorClean` + multiple early `return`s makes the mismatch plausible under rapid clicks or background updates.

- Repro idea:
  1) Open entry A and start typing in `content` (do not save).
  2) Quickly click entry B and then entry C repeatedly to induce stale-token aborts.
  3) Trigger a background update (toggle an entry enabled state in list, duplicate an entry, or refresh).
  4) Observe whether entry A’s editor content unexpectedly resets / loses typed text.

- Suggested direction  
  Ensure the editor dirty key only updates when the editor DOM actually switches to the new entry, and restore/rollback if `openEntryEditor` aborts.

- Proposed fix  
  Move “commit” of `{name, uid}` for dirty tracking to the same point where `setCurrentEditor({ name, uid })` happens (after the DOM swap), or explicitly revert `currentEditorKey` when aborting.

- Immplementation Checklist:
  - [ ] Identify all early-return paths in `openEntryEditor` (token stale, missing header, missing payload entry, missing editDom).
  - [ ] Ensure `currentEditorKey` and `setCurrentEditor(...)` are updated atomically together (or not at all).
  - [ ] Add a rollback path that restores the previous `currentEditorKey` when aborting after it was modified.
  - [ ] Confirm `wiUpdateHandler.shouldAutoRefreshEditor` still behaves as intended under rapid-click scenarios.

- Why it’s safe to implement  
  The editor still opens the same entry content; this only makes dirty-state accounting consistent with what is actually rendered, preserving current behavior while preventing accidental refreshes from discarding edits.

---

## F02: Editor dirty tracking is one-way (no “user returned to clean state”), increasing “stuck dirty” scenarios that prevent legitimate refreshes
- Location:
  - `src/editorPanel.js` → `initEditorPanel(...)`
  - Anchor snippet:
    - `let isEditorDirty = false;`
    - `dom.editor?.addEventListener?.('input', markEditorDirtyIfCurrent, true);`
    - `dom.editor?.addEventListener?.('change', markEditorDirtyIfCurrent, true);`
    - `dom.editor?.addEventListener?.('keydown', ... markEditorDirtyIfCurrent(), true);`
    - `dom.editor?.addEventListener?.('pointerdown', ... markEditorDirtyIfCurrent(), true);`

- What the issue is  
  Once any qualifying interaction marks the editor dirty, it stays dirty until:
  - `markEditorClean(name, uid)` is called during entry open, or
  - `markClean(name, uid)` is called by an external caller (currently no in-repo call sites found), or
  - `clearEditor()` resets state.

  There is no mechanism to detect “the user made a change and then reverted it back to the original value.” Additionally, `pointerdown` marks dirty for many UI interactions (any click on `button`, `select`, `.checkbox`, etc.), even if they don’t actually change data.

- Why it matters (impact)  
  This can cause overly conservative behavior:
  - `src/wiUpdateHandler.js` will stop auto-refreshing the editor when it believes it’s dirty.
  - If the editor is marked dirty due to a click that doesn’t actually change entry state (or due to a brief temporary change that gets reverted), the editor may stop reflecting external updates (e.g., updates from order helper actions, other UI surfaces) until the user manually reopens the editor.

  This is primarily a UI correctness + sync issue, but it can also create confusing state where the cache/entry row updates but the editor does not.

- Severity: Medium

- Fix risk: Medium  
  Any adjustment to when “dirty” is set/cleared risks changing refresh behavior and the safety guarantees against losing edits.

- Confidence: Medium  
  The marking behavior is clearly broader than “user modified an entry field”, but the real-world impact depends on how often auto-refresh is needed.

- Repro idea:
  1) Open an entry.
  2) Click around inside the editor on non-data controls (e.g., focus toggles, collapsible drawers, buttons that open drawers).
  3) Modify the same entry externally (toggle disable from list row, or change strategy from row).
  4) Observe whether the editor stays stale because it was marked dirty earlier.

- Suggested direction  
  Tighten what counts as “dirty” to actual value mutations, or introduce a lightweight clean-check on blur/save events if ST exposes them.

- Proposed fix  
  Constrain “dirty on pointerdown” to controls known to mutate entry state (or compare snapshots on certain events), and/or ensure the extension can mark clean when it knows the entry has been persisted by ST.

- Immplementation Checklist:
  - [ ] List which editor interactions actually mutate data versus UI-only toggles.
  - [ ] Adjust dirty marking to avoid UI-only clicks where possible.
  - [ ] Identify a safe point to call `markClean` after successful persistence (if such a hook exists).
  - [ ] Verify `wiUpdateHandler` auto-refresh still avoids discarding typed edits.

- Why it’s safe to implement  
  The goal remains unchanged: prevent refreshes from discarding in-progress edits. The change is only to reduce false-positive “dirty” states that block legitimate synchronization.

---

## F03: `clearEntryHighlights` is O(total entries) on every editor open, which can introduce input latency on large lorebook sets
- Location:
  - `src/editorPanel.js` → `initEditorPanel(...)` → `clearEntryHighlights()` used by:
    - `openEntryEditor(...)`
    - `showActivationSettings()`
    - `toggleActivationSettings()` (when showing)
    - `resetEditorState()`
  - Anchor snippet:
    - `for (const cb of Object.values(cache)) { for (const ce of Object.values(cb.dom.entry)) { ce.root.classList.remove('stwid--active'); } }`

- What the issue is  
  The highlight-clearing strategy walks every book and every entry DOM node and removes the highlight class. On large datasets (hundreds/thousands of entries), this can be a noticeable cost and occurs on frequently used interactions (opening an entry editor).

- Why it matters (impact)  
  Performance / UI responsiveness:
  - Each click-to-open entry triggers a full traversal and DOM class removal attempts.
  - This can add jank / input latency exactly in the “click entry to edit” interaction path.

- Severity: Medium

- Fix risk: Low  
  A narrower highlight tracking mechanism can be introduced without changing visible behavior (only changing how it is implemented).

- Confidence: High  
  The complexity is directly proportional to cached entries, and the function is in a hot path.

- Repro idea:
  1) Create/import a lorebook with a very large number of entries.
  2) Click different entries quickly.
  3) Profile in DevTools (Performance) and watch `clearEntryHighlights` cost and style recalculation.

- Suggested direction  
  Track the last-highlighted entry element (or maintain a small set) and only remove the class from those, instead of scanning the entire cache.

- Proposed fix  
  Maintain a reference to the currently highlighted entry DOM node and clear only that on selection change. If multi-highlight is possible, maintain a bounded list of active highlights.

- Immplementation Checklist:
  - [ ] Confirm whether multiple entries can be highlighted simultaneously in current UX (should be single active editor row).
  - [ ] Store and update a single `activeEntryEl` pointer.
  - [ ] Replace cache-wide scan with direct removal on the previous active element.
  - [ ] Verify activation settings and order helper paths still clear highlights correctly.

- Why it’s safe to implement  
  Visible behavior remains “only one entry is highlighted as active”; only the internal bookkeeping changes to avoid unnecessary DOM work.

---

## F04: `openEntryEditor` can leave UI in an inconsistent state when it aborts after highlighting the clicked entry
- Location:
  - `src/editorPanel.js` → `openEntryEditor(...)`
  - Anchor snippet:
    - `clearEntryHighlights();`
    - `entryDom.classList.add('stwid--active');`
    - early returns after this point:
      - `if (!isTokenCurrent()) return;`
      - `if (!payloadEntry) return;`
      - `if (!isTokenCurrent()) return;` (several)

- What the issue is  
  The entry row is highlighted (`stwid--active`) before the expensive async steps complete. If the function returns early after that point, the UI may end up with:
  - a highlighted entry row,
  - but no editor content swap (since `clearEditor` is intentionally deferred until new content is ready),
  - and potentially mismatched internal editor state (depending on where the early return happens; see F01).

- Why it matters (impact)  
  UI correctness:
  - User sees an entry highlighted as active but the editor still shows the previous entry (or is empty).
  - This can also contribute to data integrity issues indirectly if users continue editing while believing a different entry is open.

- Severity: Medium

- Fix risk: Medium  
  Adjusting highlight timing can change perceived responsiveness; needs careful balancing (avoid blank-state flash was explicitly desired).

- Confidence: Medium  
  Requires an abort after highlight. Stale-token aborts are already explicitly guarded for, so this situation is acknowledged by the code; the highlight behavior is still left behind.

- Repro idea:
  1) Rapidly click two entries repeatedly to generate stale-token aborts.
  2) Watch for moments where the highlight changes but the editor content does not.

- Suggested direction  
  Defer applying the `.stwid--active` highlight until immediately before the DOM swap, or ensure that on abort it restores the previous highlight.

- Proposed fix  
  Track the previously active entry element and revert highlighting if the open operation is aborted, without clearing the editor.

- Immplementation Checklist:
  - [ ] Identify the earliest point at which highlight is applied.
  - [ ] Track previous active DOM element before clearing highlights.
  - [ ] On abort, restore the previous highlight state.
  - [ ] Verify that fast-click UX remains responsive and no blank flash is introduced.

- Why it’s safe to implement  
  The final steady state remains the same (clicked entry becomes active when successfully opened). This change only prevents transient inconsistent states on aborted opens.

---

## F05: Editor-level event listeners have no teardown; repeated initialization can multiply dirty-marking handlers
- Location:
  - `src/editorPanel.js` → `initEditorPanel(...)` (initialization-time listener wiring)
  - Anchor snippet:
    - `dom.editor?.addEventListener?.('input', markEditorDirtyIfCurrent, true);`
    - `dom.editor?.addEventListener?.('change', markEditorDirtyIfCurrent, true);`
    - `dom.editor?.addEventListener?.('keydown', ..., true);`
    - `dom.editor?.addEventListener?.('pointerdown', ..., true);`

- What the issue is  
  `initEditorPanel` registers capture-phase listeners on `dom.editor` but never removes them. In normal single-init runtime this is fine, but if the extension is reinitialized (dev hot-reload, extension reload without full page refresh), multiple listeners can stack.

- Why it matters (impact)  
  Performance and correctness:
  - Duplicate dirty handlers can run multiple times per input event.
  - This increases overhead in tight typing loops (input/keydown), and complicates reasoning about dirty state (e.g., if future changes add more state transitions).

- Severity: Low

- Fix risk: Low  
  Teardown is straightforward but needs a reliable lifecycle hook (the repository already has some best-effort cleanup in `drawer.js`).

- Confidence: Medium  
  Depends on whether ST reloads extensions in-place; the project already anticipates this scenario in other modules.

- Repro idea:
  1) Reload the extension without full page refresh.
  2) Type in the editor and confirm dirty-marking/logging behavior via breakpoints or performance profiling; observe multiple handler invocations.

- Suggested direction  
  Provide a `cleanup()` function from `initEditorPanel` that detaches listeners, and call it from the same teardown path used by other modules.

- Proposed fix  
  Store bound handler references and expose a cleanup API to remove them (or ensure `initDrawer` is singleton so `initEditorPanel` only runs once).

- Immplementation Checklist:
  - [ ] Store handler references (`markEditorDirtyIfCurrent`, keydown wrapper, pointerdown wrapper).
  - [ ] Add `cleanup()` to the editor panel API and call it during extension teardown.
  - [ ] Confirm no behavior changes when initialized once.

- Why it’s safe to implement  
  Single-init behavior remains identical; this only prevents duplicated listeners in reload scenarios.

---

## F06: Focus/unfocus toggles operate by toggling a global editor class, but dirty tracking treats these as potential edits
- Location:
  - `src/editorPanel.js` → `appendUnfocusButton()`, `appendFocusButton(editDom)`, and dirty tracking listeners
  - Anchor snippet:
    - `dom.editor.classList.toggle('stwid--focus');` (both buttons)
    - `dom.editor?.addEventListener?.('pointerdown', ... if (target.closest('... button ...')) markEditorDirtyIfCurrent(); , true);`

- What the issue is  
  Focus/unfocus buttons toggle a presentation-only CSS class (`stwid--focus`) and do not represent a lorebook entry edit. However, the dirty tracking heuristics can mark the editor dirty on pointerdown for `button` clicks (and focus buttons are created as clickable `div.menu_button` elements, but other controls in the editor are buttons too).

  If interacting with focus UI marks the entry dirty (or contributes to it), the editor may stop auto-refreshing even though the user hasn’t changed entry data.

- Why it matters (impact)  
  UI correctness:
  - External updates to the entry (via list row toggles, order helper changes, etc.) may not reflect in the editor if it was marked dirty by UI-only interactions.
  - This is especially confusing because focus mode is likely used frequently while editing.

- Severity: Low

- Fix risk: Medium  
  Narrowing dirty heuristics risks reintroducing data loss if important state-changing UI controls are missed.

- Confidence: Low  
  Depends on exact DOM elements involved; the focus toggle itself is a `div` (not `button`), but focus interactions often involve other controls that match the selector and may trigger dirty marking.

- Repro idea:
  1) Open an entry without changing any fields.
  2) Toggle focus/unfocus a few times.
  3) Externally change the same entry (e.g., disable toggle on list row).
  4) Observe whether editor auto-refresh is suppressed unexpectedly.

- Suggested direction  
  Treat purely presentational toggles as not affecting dirty state, without weakening dirty detection for actual entry changes.

- Proposed fix  
  Exclude known extension-only UI elements from dirty tracking (e.g., by class), or prefer dirty marking on `input/change` for actual form elements over broad `pointerdown` heuristics.

- Immplementation Checklist:
  - [ ] Identify extension-only controls in the editor (`stwid--focusToggle`, `stwid--unfocusToggle`) and ensure they don’t mark dirty.
  - [ ] Validate that core ST widgets that mutate entry state still reliably mark dirty.
  - [ ] Re-test auto-refresh protection while typing in `content` and editing keys/comments.

- Why it’s safe to implement  
  Preventing UI-only actions from marking entries dirty does not change saved lorebook data; it only improves editor synchronization behavior while maintaining protection for real edits.