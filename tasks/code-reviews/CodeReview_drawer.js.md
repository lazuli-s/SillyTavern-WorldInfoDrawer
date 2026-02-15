# CODE REVIEW FINDINGS: `src/drawer.js`

Scope reviewed:
- `src/drawer.js`
- Shared helpers referenced by `drawer.js`: `src/editorPanel.js`, `src/listPanel.js`, `src/orderHelper.js`, `src/wiUpdateHandler.js`

## F01: New-book creation waits on a non-specific “update started” promise and can race UI/cache initialization
- Location:
  - `src/drawer.js` → `initDrawer(...)` → `addDrawer()` → new-book button click handler
  - Anchor snippet:
    - `const startPromise = wiHandlerApi.getUpdateWIChangeStarted().promise;`
    - `const created = await createNewWorldInfo(finalName, { interactive: true });`
    - `await startPromise;`
    - `await wiHandlerApi.getUpdateWIChangeFinished()?.promise;`
    - `cache[finalName].dom.root.scrollIntoView(...)`

- What the issue is  
  The handler captures `wiHandlerApi.getUpdateWIChangeStarted().promise` before creating a new book, then awaits it after `createNewWorldInfo(...)`. That “started” deferred is global and can resolve for an unrelated update cycle that began earlier (or even immediately if already resolved), rather than the update cycle triggered by the new-book creation.

- Why it matters (impact)  
  If the awaited promises resolve for the wrong update cycle, the code can attempt to access `cache[finalName].dom.root` before the new book is actually present in `cache`/DOM. Likely outcomes:
  - runtime exception (`Cannot read properties of undefined`) on `.dom.root`,
  - or centering/collapse logic not running (book exists, but the UX step fails),
  - or sporadic “sometimes it works” behavior depending on background WORLDINFO updates.

- Severity: Medium

- Fix risk: Medium  
  Touches ordering guarantees around WORLDINFO update reconciliation; could affect other flows that assume the same “started/finished” semantics.

- Confidence: Medium  
  This depends on whether an update cycle can be in-flight at the time the user clicks “Create New Book” (e.g., after other operations), which is plausible.

- Repro idea:
  1) Trigger any action that causes `WORLDINFO_UPDATED` (toggle entries quickly, duplicate/delete, refresh list) so updates are “busy”.
  2) Immediately click “Create New Book”, confirm name.
  3) Watch for occasional console errors or failure to auto-expand/center the new book.

- Suggested direction  
  Wait for the specific next update cycle caused by the creation action, not a pre-existing global deferred.

- Proposed fix  
  Use a “wait for next WORLDINFO update” primitive that is token-based (like `wiHandlerApi.waitForWorldInfoUpdate()`), then only perform UI operations once the created book is confirmed present in `cache`.

- Immplementation Checklist:
  - [ ] Identify whether `wiHandlerApi.getUpdateWIChangeStarted()` can be already-resolved at click time.
  - [ ] Replace the “started/finished” pairing with a single “next update cycle” wait that cannot resolve from earlier cycles.
  - [ ] Add a guard for `cache[finalName]?.dom?.root` before calling `scrollIntoView`.
  - [ ] Verify behavior when `createNewWorldInfo` fails or user cancels the name prompt.

- Why it’s safe to implement  
  The observable behavior remains: “creating a new book causes it to appear, expand, and center.” This only makes the timing deterministic and prevents null-deref crashes.

- **Pros:**
  - Clear anchor snippet and a plausible async/race failure mode tied to update-cycle primitives.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The anchor snippet matches the current implementation in `src/drawer.js` (the handler captures `getUpdateWIChangeStarted().promise` before the async popup + create flow, then awaits it).
  - `src/wiUpdateHandler.js` explicitly documents that token-based waiting is needed because non-specific "started" promises can resolve from earlier cycles (`waitForWorldInfoUpdate()` captures `updateWIChangeToken` and waits for a strictly later cycle).

- **Top risks:**
  - The review is correct directionally, but it does not explicitly state the most important implementation detail: the wait must be registered *before* calling `createNewWorldInfo(...)` (otherwise the next update can be missed).
  - The proposed guard `cache[finalName]?.dom?.root` is necessary, but if it fails the UX "center new book" step is silently skipped; consider minimal fallback (e.g., `await listPanelApi.refreshList()` in that specific failure case) — this is optional and may be scope creep if not careful.

#### Technical Accuracy Audit

> *"That “started” deferred is global and can resolve for an unrelated update cycle that began earlier (or even immediately if already resolved)"*

- **Why it may be wrong/speculative:**
  - It is not speculative: `updateWIChangeStarted` is a shared deferred in `src/wiUpdateHandler.js` and is re-created at the end of `updateWIChange()`. If an update cycle already started (or completed) prior to the click, the captured promise can resolve without correlating to the new-book creation cycle.

- **Validation:** Validated ✅  
  Confirmed by inspecting `src/wiUpdateHandler.js`:
  - `updateWIChangeStarted` is a single module-scoped deferred.
  - `updateWIChange()` resolves it, then re-initializes it near the end: `updateWIChangeStarted = createDeferred();`

> *"the code can attempt to access `cache[finalName].dom.root` before the new book is actually present in `cache`/DOM"*

- **Why it may be wrong/speculative:**
  - This is plausible because `cache` is extension-owned and is only populated for new books during the `updateWIChange` reconciliation loop (`added books` block). If the awaited update is unrelated, `cache[finalName]` can still be absent.

- **Validation:** Validated ✅  
  Confirmed by inspecting `src/wiUpdateHandler.js` and `src/drawer.js`:
  - New books are added in `updateWIChange()` by iterating `world_names` and calling `renderBook(...)` to create DOM + cache entries.
  - `src/drawer.js` dereferences `cache[finalName].dom.root` without a null guard.

#### Fix Quality Audit

- **Direction:**
  - Sound and within correct module boundaries. `drawer.js` should wait using `wiHandlerApi.waitForWorldInfoUpdate()` rather than reinventing its own correlation logic.

- **Behavioral change:**
  - No intended behavior change; this should only reduce flakiness and prevent occasional null derefs.

- **Ambiguity:**
  - Single clear fix direction (token-based wait) — good.

- **Proportionality:**
  - Proportionate for Medium severity / Medium confidence.

- **Checklist:**
  - Mostly actionable. The first checklist item (“Identify whether ... can be already-resolved”) is redundant because the code already demonstrates this is possible; it can be replaced by an implementation step that ensures the wait is registered before creation:
    - Example actionable step: “Create `const wait = wiHandlerApi.waitForWorldInfoUpdate();` before calling `createNewWorldInfo`, then `await wait` after.”

- **Dependency integrity:**
  - No cross-finding dependency required.

- **Fix risk calibration:**
  - Medium seems accurate: this touches update ordering assumptions but only for new-book creation.

- **"Why it's safe" validity:**
  - Adequately specific and behavior-preserving.

- **Verdict:** Implementation plan needs revision 🟡  
  The direction is correct, but the checklist should be tightened to specify the correct correlation pattern (register wait before calling create), and remove the redundant "investigate if resolved" step.

---

## F02: Drawer “reopen” MutationObserver can trigger a synthetic click that rebuilds the editor and discards unsaved typed input (Behavior Change Required)
- Location:
  - `src/drawer.js` → `initDrawer(...)` → `addDrawer()` → `moDrawer` MutationObserver callback
  - Anchor snippet:
    - `const moDrawer = new MutationObserver(()=>{ ... cache[currentEditor.name].dom.entry[currentEditor.uid].root.click(); });`

- What the issue is  
  When the core `#WorldInfo` element’s `style` attribute changes (drawer shown), the observer forces a `.click()` on the current editor entry row to “restore” selection. That click path ultimately goes through `editorPanelApi.openEntryEditor(...)` (see `src/editorPanel.js`) and rebuilds editor DOM.

  If the user has typed into the editor (dirty state) and then closes/hides the drawer (or ST toggles its visibility), reopening can trigger a rebuild and discard in-progress text in the editor inputs.

- Why it matters (impact)  
  This is a direct data-integrity risk: user edits can be lost without an explicit user action to “discard changes.” It can also create confusing behavior where closing/reopening the drawer “resets” what the user typed.

- Severity: High

- Fix risk: Medium  
  Protecting dirty state typically requires prompting or skipping the auto-restore action, which changes current behavior.

- Confidence: Medium  
  The rebuild path is clearly invoked via `.click()`, and `editorPanel.js` is explicitly designed to track dirty state to avoid losing typed edits during refreshes. This observer bypasses that intent.

- Repro idea:
  1) Open an entry, type into `content` but don’t save.
  2) Close the World Info drawer (hide `#WorldInfo`), then reopen it.
  3) Observe whether the typed content is lost or the editor is re-rendered.

- Suggested direction  
  The “auto-restore selection” should be conditional: do not force re-open if the editor is dirty (or require confirmation).

- Proposed fix  
  **Behavior Change Required:** Before triggering `.click()`, consult `editorPanelApi.isDirty(currentEditor.name, currentEditor.uid)` and skip (or prompt) if dirty.

- Immplementation Checklist:
  - [ ] Confirm whether hiding/showing `#WorldInfo` can occur without user intent (e.g., other UI interactions).
  - [ ] Add a dirty guard in the observer callback.
  - [ ] Decide expected behavior when dirty: keep editor DOM as-is, or prompt before rebuild.
  - [ ] Validate that selection highlight restoration still works when not dirty.

- Why it’s safe to implement  
  In the non-dirty case, behavior remains unchanged (selection is restored). The only change is preventing silent loss of unsaved edits.

- **Pros:**
  - Correctly identifies a data-loss class issue and explicitly labels it as behavior-changing.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The MutationObserver exists and does a synthetic `.click()` on the current editor entry row when `#WorldInfo` becomes visible (`style` no longer includes `display: none;`).
  - `editorPanelApi.openEntryEditor(...)` performs a full editor rebuild (it clears and re-renders the editor DOM), and it intentionally uses dirty tracking to avoid rebuilds in other contexts (`src/wiUpdateHandler.js` consults `editorPanelApi.isDirty(...)` before auto-refresh clicks).

- **Top risks:**
  - The review’s fix is ambiguous (“skip or prompt”). The workflow rules require a single least-behavior-change recommendation; prompting introduces user input flow and new UX complexity.
  - It does not validate whether the existing editor DOM is actually preserved across hide/show; if ST fully re-mounts or clears the container, skipping the click might result in no editor content. (In current code, the observer watches `#WorldInfo` style changes, which suggests DOM remains, but this should be treated as an assumption.)

#### Technical Accuracy Audit

> *"That click path ultimately goes through `editorPanelApi.openEntryEditor(...)` and rebuilds editor DOM."*

- **Why it may be wrong/speculative:**
  - It assumes entry row click triggers openEntryEditor. This is consistent with this project’s architecture (entry clicks route to editor open), but the claim should be verified for this specific click path.

- **Validation:** Validated ✅  
  Confirmed by inspection of `src/editorPanel.js`: `openEntryEditor(...)` clears editor and mounts new DOM (`clearEditor({ resetCurrent:false })` then appends header + edit DOM).

> *"reopening can trigger a rebuild and discard in-progress text in the editor inputs"*

- **Why it may be wrong/speculative:**
  - This depends on two things:
    1) whether the click is triggered when dirty, and
    2) whether the dirty state implies unsaved text exists only in the DOM, not persisted.
  - Both are plausible, but the review doesn't cite the `openEntryEditor` logic that marks clean early, which makes the risk more concrete.

- **Validation:** Validated ✅  
  Confirmed by inspection of `src/editorPanel.js`:
  - `openEntryEditor` calls `markEditorClean(name, entry.uid)` near the start.
  - It later does `clearEditor({ resetCurrent:false })` before re-mounting. If the user’s typed text was not persisted to the payload, it is discarded.

#### Fix Quality Audit

- **Direction:**
  - Sound and within module boundaries: the observer lives in `drawer.js`, and it should respect the editor panel’s dirty-state contract.

- **Behavioral change:**
  - Correctly labeled as behavior change. Skipping the restore click when dirty changes reopen behavior.

- **Ambiguity:**
  - Needs tightening: choose one approach. Least behavioral change is:
    - If dirty: do not trigger synthetic click (preserve existing DOM, preserving typed text).
    - If not dirty: allow restore click.

- **Proportionality:**
  - Proportionate for High severity.

- **Checklist:**
  - Contains a decision step (“keep DOM as-is, or prompt”), which is ambiguous for an LLM implementation plan. Replace with a single explicit rule (skip when dirty).

- **Dependency integrity:**
  - Related to `drawer.js` F07 (also about dirty guards). The intended UX should be consistent across all “mode switches” that can clear/rebuild the editor. This dependency should be called out.

- **Fix risk calibration:**
  - Medium seems fair: changes selection-restore behavior.

- **"Why it's safe" validity:**
  - Mostly valid, but it should state what happens in dirty case (editor content will remain whatever it was before hide).

- **Verdict:** Implementation plan needs revision 🟡  
  Technically correct issue, but the fix plan must remove the “prompt vs skip” ambiguity and declare dependency/consistency with other dirty-guard findings (notably F07).

---

## F03: Global Delete handler uses live `selectionState` during async operations; selection changes can delete unintended entries
- Location:
  - `src/drawer.js` → `initDrawer(...)` → `addDrawer()` → `onDrawerKeydown(evt)`
  - Anchor snippet:
    - `if (selectionState.selectFrom === null || !selectionState.selectList?.length) return;`
    - `const srcBook = await loadWorldInfo(selectionState.selectFrom);`
    - `for (const uid of selectionState.selectList) { ... }`
    - `await saveWorldInfo(selectionState.selectFrom, srcBook, true);`

- What the issue is  
  The handler reads `selectionState.selectFrom` and `selectionState.selectList` multiple times across `await` boundaries. If selection changes while:
  - `loadWorldInfo(...)` is in-flight,
  - deletes are happening in a loop,
  - or before the final `saveWorldInfo(...)`,
  then the handler can:
  - delete entries that were not selected when Delete was pressed,
  - or save the wrong book name (if `selectFrom` changes mid-flight),
  - or partially delete one selection but save under another book name (worst-case corruption risk, depending on ST API behavior).

- Why it matters (impact)  
  Data integrity: deletion is destructive. Deleting the wrong set of entries is high-impact and hard to recover (especially if the user doesn’t notice immediately).

- Severity: High

- Fix risk: Low  
  Capturing a snapshot of `selectFrom` + `selectList` at the start and only operating on that snapshot should not change intended behavior, it just prevents races.

- Confidence: Medium  
  Requires a timing window where selection can change while a delete is in progress. That’s plausible with fast UI interactions and async `loadWorldInfo/saveWorldInfo`.

- Repro idea:
  1) Select multiple entries in Book A.
  2) Press Delete, then quickly click an entry in Book B while the delete is processing.
  3) Observe whether Book B is modified or whether wrong entries disappear.

- Suggested direction  
  Make Delete operate on a stable snapshot of selection and book name taken at keypress time.

- Proposed fix  
  Copy `selectionState.selectFrom` and `selectionState.selectList` into local constants before any `await`, and use those values for the entire delete transaction. Optionally, abort if selection changes (to avoid surprising deletes).

- Immplementation Checklist:
  - [ ] Snapshot `selectFrom` and `selectList` at handler entry.
  - [ ] Use the snapshot for `loadWorldInfo`, delete loop, and `saveWorldInfo`.
  - [ ] After completion, clear selection via `listPanelApi.selectEnd()` (already done).
  - [ ] Add minimal logging when aborting due to selection change (if that approach is chosen).

- Why it’s safe to implement  
  Intended behavior (“Delete removes currently selected entries in the current book”) remains the same; this only prevents selection changes from affecting an in-flight delete.

- **Pros:**
  - Strongly anchored to concrete `await` boundaries and destructive side effects; fix is small and localized.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The handler in `src/drawer.js` does read `selectionState.selectFrom` multiple times across `await` boundaries (`loadWorldInfo(...)`, `deleteWorldInfoEntry(...)`, `saveWorldInfo(...)`).
  - `selectionState` is a mutable object returned by `listPanelApi.getSelectionState()`, so it can change due to other UI interactions during the async delete.

- **Top risks:**
  - The review slightly overstates “worst-case corruption risk”: `saveWorldInfo` is called with the loaded `srcBook` object, so even if the book name argument changes, the payload is still the loaded object. However, saving a book object under the wrong name could still be catastrophic depending on ST’s API implementation, so the risk remains non-trivial.
  - The optional “abort if selection changes” introduces ambiguity; the least behavioral change is snapshot-only (do not abort mid-flight).

#### Technical Accuracy Audit

> *"partially delete one selection but save under another book name (worst-case corruption risk, depending on ST API behavior)"*

- **Why it may be wrong/speculative:**
  - The code loads the book object first (`srcBook = await loadWorldInfo(selectionState.selectFrom)`) and then mutates that object. If `selectFrom` changes after load but before save, the mutated object still corresponds to the original book. The "wrong name" save is the real hazard, not mismatched deletes within the object itself.

- **Validation:** Validated ✅  
  Confirmed by inspection of `src/drawer.js`:
  - `srcBook` is loaded once, then mutated, then passed to `saveWorldInfo(selectionState.selectFrom, srcBook, true)`.

- **What needs to be done/inspected to successfully validate:**
  - (Optional) Check ST `saveWorldInfo(name, data)` behavior to confirm it uses `name` as the file key; if so, saving with wrong `name` can overwrite another file. (This would be in vendor ST; not required for implementing the snapshot fix.)

#### Fix Quality Audit

- **Direction:**
  - Sound, localized, and within module boundary (`drawer.js` owns this handler).

- **Behavioral change:**
  - Snapshot-only is behavior-preserving (it deletes what was selected at keypress time). Adding “abort if selection changes” is a behavioral change and should not be recommended unless clearly required.

- **Ambiguity:**
  - Needs tightening: remove the “optionally abort” branch from the implementation plan.

- **Proportionality:**
  - Proportionate for High severity.

- **Checklist:**
  - Actionable, though the “abort” step should be removed to keep one recommendation.

- **Dependency integrity:**
  - None.

- **Fix risk calibration:**
  - Low is accurate.

- **"Why it's safe" validity:**
  - Specific and verifiable.

- **Verdict:** Implementation plan needs revision 🟡  
  The fix is correct, but the plan should remove the optional behavior-changing “abort if selection changes” branch and stick to snapshotting as the sole recommendation.

---

## F04: Drawer-open detection for Delete relies on `elementFromPoint` at screen center, which is brittle with overlays/popups
- Location:
  - `src/drawer.js` → `initDrawer(...)` → `addDrawer()` → `onDrawerKeydown(evt)`
  - Anchor snippet:
    - `const centerEl = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);`
    - `if (!centerEl?.closest?.('.stwid--body')) return;`

- What the issue is  
  Whether the drawer is “open” is inferred by checking the element at the center of the viewport. This can be incorrect when:
  - a popup/overlay is open (Popup, toastr, native dialogs),
  - the drawer is open but the center is occupied by some other floating element,
  - the drawer is visible but the center happens to be outside `.stwid--body` due to layout/scroll.

- Why it matters (impact)  
  UI correctness and data integrity: a false-positive can allow Delete to run when the user is not meaningfully “in the drawer,” increasing accidental deletion risk.

- Severity: Medium

- Fix risk: Medium  
  Changing the “drawer open” condition changes when Delete is accepted. Needs careful choice of a more authoritative signal.

- Confidence: Medium  
  Overlay-heavy UIs are common in SillyTavern; false positives/negatives are plausible.

- Repro idea:
  1) Ensure multiple entries are selected.
  2) Open a popup that sits on top of the drawer.
  3) Press Delete; observe whether deletion still happens even though the popup is the user’s primary focus.

- Suggested direction  
  Use an explicit drawer-open signal (e.g., `#WorldInfo` visibility or a body class that tracks open/closed state), and consider blocking Delete while a popup is open.

- Proposed fix  
  Replace `elementFromPoint` logic with a deterministic state check:
  - drawer container `display`/visibility,
  - presence of `document.body.classList.contains('stwid--')` (if this class is authoritative),
  - and/or a dedicated “drawer open” flag stored during toggle events.

- Immplementation Checklist:
  - [ ] Identify the most reliable “drawer open” signal in this extension (body class vs container style).
  - [ ] Decide how to treat popups/overlays (block Delete or require focus in list).
  - [ ] Update Delete gating and manually verify common overlay scenarios.

- Why it’s safe to implement  
  Deleting selected entries while the drawer is genuinely open remains possible; only accidental trigger scenarios are reduced.

- **Pros:**
  - Identifies a brittle heuristic in a destructive hotkey path and suggests seeking a deterministic state signal.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The `elementFromPoint` gating exists exactly as described in `src/drawer.js`.
  - Delete is a destructive action; gating correctness matters.

- **Top risks:**
  - The review’s stated primary failure (“false-positive allows delete while popup open”) is not well-evidenced. In many overlay designs, `elementFromPoint` will *prevent* delete (false-negative) because the overlay is not inside `.stwid--body`.
  - The proposed fix is under-specified: it lists 3+ alternative signals and asks the implementer to pick one, which violates the “single recommendation” rule.

#### Technical Accuracy Audit

> *"a false-positive can allow Delete to run when the user is not meaningfully “in the drawer,” increasing accidental deletion risk."*

- **Why it may be wrong/speculative:**
  - With the current code, the risk might skew toward false negatives (Delete blocked when a popup is centered), which is safer for data integrity. A false positive would require the center element to be inside `.stwid--body` even though user focus is elsewhere — possible (e.g., popup not centered), but not demonstrated.

- **Validation:** Needs extensive analysis ❌  
  Confirming actual false-positive vs false-negative behavior requires inspecting how ST popups/toasts are layered in the DOM (likely vendor ST templates/CSS) and how `#WorldInfo` is shown/hidden in practice.

- **What needs to be done/inspected to successfully validate:**
  - Inspect ST popup DOM placement and overlay containers in the runtime:
    - Are popups appended inside `#WorldInfo`, inside `.stwid--body`, or elsewhere (e.g., `document.body`)?
  - Test in UI: open ST `Popup.show.input` while drawer open, press Delete, observe whether it triggers.

#### Fix Quality Audit

- **Direction:**
  - Good instinct (avoid heuristics for destructive hotkeys), but the plan should be narrowed.

- **Behavioral change:**
  - Changing hotkey gating is a behavioral change and should be acknowledged; it can impact users who rely on Delete while certain overlays are present.

- **Ambiguity:**
  - Too many alternative “signals” are listed. The plan must choose one smallest safe change.

- **Proportionality:**
  - For Medium severity / Medium confidence, a conservative minimal change is appropriate (e.g., additionally require `document.body.classList.contains('stwid--')` *and* `.stwid--body` exists, rather than a bigger refactor).

- **Checklist:**
  - Not fully actionable because it delegates the key choice to the implementer and implies manual verification.

- **Dependency integrity:**
  - Depends on F08/F05 to the extent that duplicate initialization could also make keydown handling unpredictable; however the gating problem exists even in single-init.

- **Fix risk calibration:**
  - Medium is reasonable.

- **"Why it's safe" validity:**
  - Vague (“only accidental trigger scenarios are reduced”) without specifying which ones.

- **Verdict:** Implementation plan discarded 🔴  
  The main impact claim is not evidence-backed and validation would require broader runtime investigation. The plan is also ambiguous (multiple alternative signals) and would require manual UI verification to choose correctly.

---

## F05: No teardown for MutationObservers; extension reload/hot-reload can accumulate observers and duplicate work
- Location:
  - `src/drawer.js` → `initDrawer(...)` → `addDrawer()` → `moSel` and `moDrawer`
  - Anchor snippets:
    - `const moSel = new MutationObserver(()=>wiHandlerApi.updateWIChangeDebounced());`
    - `moSel.observe(moSelTarget, { childList:true });`
    - `const moDrawer = new MutationObserver(()=>{ ... });`
    - `moDrawer.observe(drawerContent, { attributes:true, attributeFilter:['style'] });`

- What the issue is  
  Observers are created and started but never disconnected. Cleanup only removes the `keydown` listener and calls `bookSourceLinksApi.cleanup()` on `beforeunload`. If the extension is reinitialized without a full page unload (dev workflow, extension reload), old observers remain active.

- Why it matters (impact)  
  Performance and correctness risk:
  - multiple observers firing for the same DOM changes,
  - repeated calls to `updateWIChangeDebounced`,
  - repeated synthetic clicks on drawer open,
  - harder-to-debug behavior where actions happen multiple times.

- Severity: Medium

- Fix risk: Low  
  Disconnecting observers on teardown is localized, but requires a reliable teardown hook beyond `beforeunload`.

- Confidence: Medium  
  Depends on whether ST can reload extensions without full page unload; the code already includes “best-effort cleanup” comments, implying this scenario is expected.

- Repro idea:
  1) Reload the extension module without refreshing the page (dev tooling / ST extension reload).
  2) Change the selected world-info book in core UI or open/close the drawer.
  3) Observe multiple update logs or repeated selection restoration behavior.

- Suggested direction  
  Track observer instances in closure scope and disconnect them during cleanup.

- Proposed fix  
  Store `moSel`/`moDrawer` references and call `.disconnect()` during the same teardown path that removes the keydown listener.

- Immplementation Checklist:
  - [ ] Capture observer references in `addDrawer` scope.
  - [ ] Extend the cleanup handler to disconnect observers.
  - [ ] Verify observers are re-created exactly once on init.

- Why it’s safe to implement  
  Observer-driven behavior remains; only duplicate observers from previous loads are prevented.

- **Pros:**
  - Identifies concrete leak sources and suggests the standard `.disconnect()` pattern.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `moSel` and `moDrawer` are created and observed, and there is no `.disconnect()` call in `src/drawer.js`.
  - The only cleanup in `drawer.js` is a `beforeunload` handler that removes `keydown` listener and calls `bookSourceLinksApi.cleanup()`.

- **Top risks:**
  - The proposed cleanup path still only runs on `beforeunload`. If ST reloads extensions without full unload, the plan does not fully solve the stated problem unless there is an additional teardown hook.
  - There is an undeclared dependency with F08 (singleton/teardown): preventing multiple inits is often the primary solution; disconnecting observers is secondary/defensive.

#### Technical Accuracy Audit

> *"If the extension is reinitialized without a full page unload ... old observers remain active."*

- **Why it may be wrong/speculative:**
  - This depends on ST extension lifecycle capabilities (in-place reload). The code’s own “best-effort cleanup” comment implies it is expected, but it's not proven in this repo.

- **Validation:** Needs extensive analysis ❌  
  Confirming re-init without page unload is possible requires either:
  - reading ST extension loader behavior (vendor), or
  - runtime testing in ST.

- **What needs to be done/inspected to successfully validate:**
  - Inspect how ST reloads extensions (if at all) and whether it re-imports ESM modules in the same page session.
  - Reproduce by reloading the extension from ST UI/dev tools and observe whether `initDrawer()` runs multiple times.

#### Fix Quality Audit

- **Direction:**
  - Disconnecting observers is correct, but the plan must also address *when* teardown runs. Within current module boundaries, the most realistic fix is to combine:
    - idempotent init (F08) to prevent duplicate observers, and
    - defensive `.disconnect()` on page unload.

- **Behavioral change:**
  - None.

- **Ambiguity:**
  - Not ambiguous, but incomplete: it assumes a teardown hook exists.

- **Proportionality:**
  - Reasonable.

- **Checklist:**
  - Actionable as written, but should include the explicit limitation: this only helps for unload unless you also implement a re-init teardown mechanism.

- **Dependency integrity:**
  - Depends on F08; should be declared.

- **Fix risk calibration:**
  - Low seems correct for disconnecting on known teardown.

- **"Why it's safe" validity:**
  - Valid.

- **Verdict:** Implementation plan discarded 🔴  
  The plan relies on an unproven lifecycle (in-place reload without unload) and does not include a concrete, evidence-backed teardown trigger. This needs either (a) a verified ST lifecycle hook or (b) a redesigned idempotent init/teardown strategy (see F08) before being implementable safely.

---

## F06: Splitter drag lifecycle does not handle `pointercancel`, risking stuck listeners and inconsistent stored widths
- Location:
  - `src/drawer.js` → `initDrawer(...)` → `addDrawer()` → splitter `pointerdown` handler
  - Anchor snippet:
    - `window.addEventListener('pointermove', onMove);`
    - `window.addEventListener('pointerup', onUp);`
    - (no `pointercancel` handler)

- What the issue is  
  The code attaches `pointermove` and `pointerup` listeners on `window` during a drag, and only removes them on `pointerup`. If the pointer is canceled (browser gesture, OS interruption, tab switch, touch cancel), the cleanup may not run.

- Why it matters (impact)  
  Performance and UI correctness:
  - leaked listeners that continue to run,
  - subsequent drags may behave unpredictably,
  - width may not persist or may persist from an intermediate state.

- Severity: Low

- Fix risk: Low  
  Adding a `pointercancel` cleanup path should be behavior-preserving for normal pointerup flows.

- Confidence: Medium  
  Pointer cancellation is common on touch devices and can occur on desktop during system interruptions.

- Repro idea:
  1) Start dragging the splitter.
  2) Trigger a pointer-cancel scenario (e.g., alt-tab, open OS overlay, or on touch: scroll/gesture).
  3) Attempt another drag and see if resize feels “stuck” or inconsistent.

- Suggested direction  
  Ensure drag cleanup runs on all termination paths (pointerup, pointercancel, lost capture).

- Proposed fix  
  Add a shared cleanup function and wire it to `pointerup` and `pointercancel` (and optionally `lostpointercapture`) so the listeners always detach and the final width is persisted consistently.

- Immplementation Checklist:
  - [ ] Add a `pointercancel` handler that mirrors `onUp`.
  - [ ] Consider handling `lostpointercapture`.
  - [ ] Ensure the RAF is canceled and final width is applied once.
  - [ ] Verify stored width is updated in all end states.

- Why it’s safe to implement  
  Normal resizing behavior remains the same; this only improves robustness under interruption scenarios.

- **Pros:**
  - Concrete, low-risk robustness improvement with a clear failure mode and minimal code change.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Verified in `src/drawer.js`: listeners are attached to `window` for `pointermove`/`pointerup` only; there is no `pointercancel` handling.

- **Top risks:**
  - Minor: the code uses `setPointerCapture` on the splitter; `lostpointercapture` may be a more relevant event than `pointercancel` in some browsers. The review covers this (“optionally lostpointercapture”) which is good.

#### Technical Accuracy Audit

> *"If the pointer is canceled ... the cleanup may not run."*

- **Why it may be wrong/speculative:**
  - Not speculative; it is a standard pointer-event lifecycle concern.

- **Validation:** Validated ✅  
  Confirmed by inspecting the code: cleanup only occurs in `onUp`, and only `pointerup` removes listeners and persists width.

#### Fix Quality Audit

- **Direction:**
  - Correct and stays within `drawer.js`.

- **Behavioral change:**
  - None intended.

- **Ambiguity:**
  - Minor optionality (`lostpointercapture`), but this is acceptable as an additive robustness measure.

- **Proportionality:**
  - Good (Low severity, low scope).

- **Checklist:**
  - Actionable.

- **Dependency integrity:**
  - None.

- **Fix risk calibration:**
  - Low is accurate.

- **"Why it's safe" validity:**
  - Specific and verifiable.

- **Verdict:** Ready to implement 🟢

---

## F07: Toggling Activation Settings / Order Helper can clear the entry editor without any dirty-state guard (Behavior Change Required)
- Location:
  - `src/drawer.js` → `addDrawer()` → activation settings button and order-helper button handlers
  - Anchor snippets:
    - Activation: `settings.addEventListener('click', ()=>{ editorPanelApi.toggleActivationSettings(); });`
    - Order helper: `order.addEventListener('click', ()=>{ ... openOrderHelper(null, visibilityScope); });`
    - Order helper close path: `if (isActive) { ... editorPanelApi.clearEditor(); return; }`

- What the issue is  
  Drawer-level toggles can cause the editor to be cleared/replaced, but the click handlers themselves do not consult the editor’s dirty state (`editorPanelApi.isDirty(...)`). `editorPanel.js` explicitly tracks dirty state to prevent refreshes from discarding input, but these top-level toggles can still wipe editor DOM.

- Why it matters (impact)  
  Data integrity: a user can lose typed edits by accidentally clicking the activation settings gear or order helper toggle, or by an integration triggering these actions indirectly.

- Severity: High

- Fix risk: Medium  
  Adding dirty guards typically means adding prompts or refusing the action when dirty, which changes UX.

- Confidence: Medium  
  Whether typed input is lost depends on how `toggleActivationSettings`/order helper rendering interacts with current editor DOM, but both paths clear editor content.

- Repro idea:
  1) Open an entry and type into a field without saving.
  2) Click the activation settings gear or the order-helper button.
  3) Observe whether the editor content is cleared and typed text is lost.

- Suggested direction  
  The same “don’t discard unsaved edits” contract used for auto-refresh should apply to user-initiated mode switches, ideally with confirmation.

- Proposed fix  
  **Behavior Change Required:** Add dirty-state checks before clearing/replacing the editor. If dirty, either:
  - prompt the user to confirm discarding changes, or
  - refuse the toggle and keep the user in the editor.

- Immplementation Checklist:
  - [ ] Identify the authoritative dirty signal (`editorPanelApi.isDirty(currentEditor.name, currentEditor.uid)`).
  - [ ] Decide consistent UX for dirty protection across: refresh list, activation settings toggle, order helper toggle, drawer reopen auto-restore.
  - [ ] Ensure the guard covers both “open” and “close” directions of these toggles.

- Why it’s safe to implement  
  When the editor is not dirty, behavior remains unchanged. The only behavior change is preventing silent loss of unsaved edits.

- **Pros:**
  - Correctly connects the issue to the established dirty-tracking contract and highlights user-facing data loss risk.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Verified in `src/editorPanel.js`: `toggleActivationSettings()` clears editor DOM and resets dirty state (`clearEditor({ resetCurrent:false })` and `isEditorDirty = false`), which would discard any unsaved text that only exists in DOM.
  - Verified in `src/drawer.js`: activation gear calls `toggleActivationSettings()` without consulting dirty state; order helper close path explicitly calls `editorPanelApi.clearEditor()`.

- **Top risks:**
  - The proposed fix is ambiguous (prompt vs refuse). Per rules, the plan should pick the least-behavior-change option and stick to it.
  - This finding overlaps with F02 (drawer reopen) — if implemented inconsistently, users could still lose edits through a different path.

#### Technical Accuracy Audit

> *"both paths clear editor content"*

- **Why it may be wrong/speculative:**
  - For activation settings, yes: it clears editor and mounts activation block.
  - For order helper, `drawer.js` close path calls `clearEditor()`; open path calls `openOrderHelper(...)` which likely also affects editor. The review doesn’t cite order helper implementation details; however the explicit `clearEditor()` call on close is enough to justify the data loss risk.

- **Validation:** Validated ✅  
  Confirmed by inspection of `src/drawer.js` and `src/editorPanel.js`.

#### Fix Quality Audit

- **Direction:**
  - Sound: these are mode switches owned by `drawer.js` and should honor `editorPanelApi.isDirty(...)`.

- **Behavioral change:**
  - Correctly labeled. Blocking the toggle while dirty is behavior change.

- **Ambiguity:**
  - Needs revision: choose one strategy. Least complex / least scope is:
    - If dirty: do nothing (optionally show a toast) rather than adding a new confirmation UI flow.

- **Proportionality:**
  - Proportionate for High severity.

- **Checklist:**
  - Actionable but includes a “decide UX” step that is ambiguous.

- **Dependency integrity:**
  - Depends on consistent dirty-guard behavior in F02 as well; should be declared.

- **Fix risk calibration:**
  - Medium is fair.

- **"Why it's safe" validity:**
  - Good for non-dirty case; it should explicitly state the dirty-case behavior (toggle is ignored).

- **Verdict:** Implementation plan needs revision 🟡  
  The issue is correct and important, but the fix plan must select one behavior (skip toggle when dirty) and avoid introducing a prompt/confirmation flow unless explicitly required.

---

## F08: `addDrawer()` has no singleton guard; multiple initializations can duplicate UI and global listeners
- Location:
  - `src/drawer.js` → `initDrawer(...)` → `addDrawer()` (called unconditionally)
  - Anchor snippet:
    - `addDrawer();` (immediately invoked)
    - `drawerContent.append(body);`
    - `document.addEventListener('keydown', onDrawerKeydown);`

- What the issue is  
  The module unconditionally builds and appends a new drawer UI and registers global listeners on every `initDrawer` call, without checking whether the drawer already exists. In reload scenarios (dev, hot reload, ST extension reload without hard refresh), this can lead to:
  - multiple `.stwid--body` instances in the DOM,
  - multiple `keydown` listeners,
  - multiple mutation observers,
  - unpredictable behavior due to duplicated UI and event handling.

- Why it matters (impact)  
  Performance and correctness degrade over time in reload workflows. Duplicate Delete handlers amplify data-integrity risks (multiple delete passes, multiple saves).

- Severity: Medium

- Fix risk: Low  
  A singleton guard is typically localized: detect existing `.stwid--body` and skip init (or tear down before re-init).

- Confidence: High  
  The code has no guard and already relies on “beforeunload” cleanup, implying it expects page-unload as the main teardown mechanism.

- Repro idea:
  1) Reinitialize the extension without a full page reload.
  2) Inspect DOM for multiple `.stwid--body` nodes and test Delete key behavior.

- Suggested direction  
  Make drawer initialization idempotent: either “init once per page” or “teardown then init”.

- Proposed fix  
  Add a check at the start of `addDrawer()` to detect an existing drawer body and avoid duplicating UI/listeners, or implement a teardown routine that removes prior UI and unsubscribes listeners before re-adding.

- Immplementation Checklist:
  - [ ] Choose a stable DOM marker for “already initialized” (e.g., `.stwid--body` or a `data-` attribute).
  - [ ] Ensure global listeners (keydown, observers) are not re-registered when already present.
  - [ ] Validate dev reload workflow: init → teardown → init produces exactly one drawer.

- Why it’s safe to implement  
  In normal use (single init), behavior remains unchanged. This only prevents duplicate initialization side effects in reload/hot-reload scenarios.

- **Pros:**
  - Correctly flags a common extension-reload failure mode and ties it to concrete duplicated side effects (keydown, observers, duplicated DOM).

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Verified in `src/drawer.js`: `addDrawer()` is defined and immediately invoked without any "already initialized" check.
  - The code registers global listeners (`document.addEventListener('keydown', ...)`) and creates MutationObservers each time `addDrawer()` runs.

- **Top risks:**
  - The proposed fix is ambiguous (skip init vs teardown+reinit). Skipping init can break consumers because `initDrawer()` expects to initialize and then return live `listPanelApi/editorPanelApi` references; if you early-return, you may return undefined APIs or leave other modules in an inconsistent state.
  - The finding assumes `initDrawer()` can be called multiple times in one session; while plausible, it is not proven in this repo without checking ST extension loader behavior.

#### Technical Accuracy Audit

> *"In reload scenarios ... this can lead to multiple `.stwid--body` instances ... multiple `keydown` listeners ... observers"*

- **Why it may be wrong/speculative:**
  - The duplication is accurate *if* the module is re-executed. The missing piece is whether ST actually reloads ESM extensions in-place.

- **Validation:** Needs extensive analysis ❌  
  Requires either:
  - inspecting ST extension loader/reload behavior (vendor), or
  - runtime reproduction.

- **What needs to be done/inspected to successfully validate:**
  - Confirm if ST has a “reload extension” path that re-imports the module in the same page.
  - If yes, validate whether previous module instances remain alive (which would keep listeners/observers active).

#### Fix Quality Audit

- **Direction:**
  - The direction “make init idempotent” is good, but it must be implemented in a way that does not break `initDrawer` consumers.

- **Behavioral change:**
  - None intended in normal runtime.

- **Ambiguity:**
  - Too ambiguous. The plan must choose one approach, and "skip init" is likely not viable without also providing a way to retrieve existing API handles.

- **Proportionality:**
  - Reasonable for Medium severity but high complexity if done fully.

- **Checklist:**
  - The checklist lacks the key missing step: define a concrete teardown hook (or an idempotent singleton registry on `globalThis`) so repeated inits can either:
    - return existing handles, or
    - tear down prior instance cleanly.

- **Dependency integrity:**
  - Overlaps with F05 (observer teardown) and with global listener duplication in other modules; should be declared.

- **Fix risk calibration:**
  - “Low” is likely under-rated because implementing correct teardown/idempotence touches many global hooks and must avoid leaving ST DOM in a broken state.

- **"Why it's safe" validity:**
  - Too generic; does not specify how idempotence is achieved without breaking init state.

- **Verdict:** Implementation plan discarded 🔴  
  Requires a concrete, evidence-backed lifecycle model (does ST reload extensions in-place?) and a defined strategy (singleton registry vs teardown+reinit). As written, it is too ambiguous and risks breaking `initDrawer()` consumers if implemented as a simple early-return.

---

### Coverage Note

- **Obvious missed findings:** None identified.
- **Severity calibration:** F04 and F05/F08 are lifecycle-dependent; their severities/confidence should be explicitly tied to whether in-place extension reload occurs in the target ST environment.