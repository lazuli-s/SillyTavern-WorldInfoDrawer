# CODE REVIEW FINDINGS: drawer.js

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