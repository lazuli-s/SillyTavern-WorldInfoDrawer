# Code Review Tracker

Track all code-review findings across the extension's JS files.

**Fields per finding:**

- **Meta-reviewed**: Has this finding already been meta-reviewed by a second LLM? [ ] or [X]
- **Verdict**: Ready to implement 🟢 / Implementation plan needs revision 🟡 / Implementation plan is not usable 🔴
- **Reason**: If rejected, why
- **Implemented**: Has the implementation plan been implemented? ❌ or ✔

---

## Reviewed Files

---

### `index.js`
→ `CodeReview_index.js.md`

- **F01** — Debounced `WORLDINFO_UPDATED` handler can drop intermediate updates, leaving cache stale
  - Meta-reviewed: [ ]
  - Verdict:
    - Reason: 
  - Implemented: 

- **F02** — `updateWIChange()` races with `refreshList()` — DOM/cache consistency
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 
  
- **F03** — `jumpToEntry()` can discard in-progress editor work via synthetic clicks
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F04** — `jumpToEntry()` reports success even when entry is filtered out / not visible
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F05** — `bookSourceLinksApi.cleanup()` does not unsubscribe `eventSource` listeners
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F06** — Global `keydown` Delete handler can be duplicated; brittle drawer-open detection
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F07** — `updateWIChange()` uses expensive `JSON.stringify` deep comparisons in hot loop
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F08** — Dev CSS watch leaks watchers/style tags on module reload (no teardown)
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/drawer.js`
→ `CodeReview_drawer.js.md`

- **F01** — New-book creation awaits non-specific "update started" promise — race with cache init
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Checklist needs to explicitly register `waitForWorldInfoUpdate()` *before* `createNewWorldInfo(...)` and remove redundant investigation step.
  - Implemented: ✅
    - Implementation Notes: Registered `waitForWorldInfoUpdate()` before `createNewWorldInfo(...)` and added cache/DOM guard with refresh fallback before scrolling to the new book.
    - Manual check: Create a new book while other updates are happening; confirm the new book expands and scrolls into view without console errors.

- **F02** — Drawer "reopen" MutationObserver forces synthetic click that can discard unsaved edits
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Fix plan is ambiguous (prompt vs skip); must pick a single least-behavior-change rule and declare consistency/dependency with other dirty-guard fixes.
  - Implemented: ✅
    - Implementation Notes: Drawer reopen observer now skips the synthetic entry-row click when the current editor is dirty, preventing unsaved input loss.
    - Manual check: Open an entry, type without saving, close and reopen the drawer; confirm typed text is preserved and no unexpected blank editor state occurs.

- **F03** — Delete handler reads live `selectionState` across `await` — can delete wrong entries
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Remove optional behavior-changing "abort if selection changes" branch; snapshot-only should be the sole recommendation.
  - Implemented: ✅
    - Implementation Notes: Delete hotkey now snapshots `selectFrom` and selected UIDs before any `await` to prevent selection changes from affecting an in-flight delete.
    - Manual check: Select multiple entries, press Delete, then quickly click another book; confirm only the originally selected entries are deleted.

- **F04** — Drawer-open detection uses `elementFromPoint` at screen center — brittle with overlays
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded 🔴
    - Reason: Impact claim is not evidence-backed (likely false negatives vs false positives) and proposed fix is ambiguous/multi-option; requires broader runtime validation.
  - Implemented: ❌ Skipped (🔴 discarded)
    - Implementation Notes: Skipped — plan discarded; requires runtime validation to choose an authoritative drawer-open signal and overlay behavior.

- **F05** — No teardown for `moSel`/`moDrawer` MutationObservers — accumulate on reload
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded 🔴
    - Reason: Relies on unproven in-place reload lifecycle and lacks a concrete teardown trigger; needs a verified lifecycle hook or a broader singleton/teardown strategy.
  - Implemented: ❌ Skipped (🔴 discarded)
    - Implementation Notes: Skipped — plan discarded; no evidence-backed teardown lifecycle beyond `beforeunload` to safely disconnect observers on reload.

- **F06** — Splitter drag lifecycle missing `pointercancel` — listeners can leak
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - Implemented: ✅
    - Implementation Notes: Added `pointercancel` and `lostpointercapture` termination paths to splitter drag cleanup so listeners always detach and width persists.
    - Manual check: Start dragging the splitter, then alt-tab / open an OS overlay / trigger a gesture cancel; confirm the list is still resizable afterward and the final width persists after reload.

- **F07** — Toggling Activation Settings / Order Helper clears entry editor without dirty-state guard
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Fix plan is ambiguous (prompt vs refuse); should pick a single least-scope behavior (skip toggle when dirty) and keep dirty-guard behavior consistent with F02.
  - Implemented: ✅
    - Implementation Notes: Added dirty guards to Activation Settings and Order Helper toggles, showing a toast and blocking mode switches that would discard unsaved edits.
    - Manual check: Type unsaved edits in an entry, click the gear/order toggle; confirm a toast appears and the editor content remains unchanged.

- **F08** — `addDrawer()` has no singleton guard — multiple inits duplicate UI and global listeners
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded 🔴
    - Reason: Requires evidence of in-place reload + a concrete singleton registry/teardown strategy; "skip init" risks breaking `initDrawer()` consumers and fix risk is under-rated.
  - Implemented: ❌ Skipped (🔴 discarded)
    - Implementation Notes: Skipped — plan discarded; safe idempotent init/teardown requires validated ST reload semantics and a concrete singleton/registry approach.

---

### `src/editorPanel.js`
→ `CodeReview_editorPanel.js.md`

- **F01** — Dirty-tracking desynchronized when `openEntryEditor` aborts early — can lose edits
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — Dirty tracking is one-way — no "user reverted to clean" — causes stuck-dirty scenarios
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F03** — `clearEntryHighlights` is O(total entries) on every editor open — input latency
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F04** — `openEntryEditor` leaves entry highlighted but editor unchanged on abort
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F05** — Editor event listeners have no teardown — duplicate dirty-marking handlers on reload
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F06** — Focus/unfocus toggle buttons can mark editor dirty despite being presentation-only
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/listPanel.bookMenu.js`
→ `CodeReview_listPanel.bookMenu.js.md`

- **F01** — Duplicate-book detection picks wrong "new book" under concurrent creation — wrong folder move
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — "Move Book to Folder" always triggers `refreshList()` — can clear editor and lose typed edits
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F03** — Folder import is sequential with no yield / progress / partial-failure handling
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F04** — "Export Book" omits metadata — loses folder assignment and sort preference on re-import
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F05** — External Editor fires fire-and-forget POST — silent failure, no user feedback
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/listPanel.booksView.js`
→ `CodeReview_listPanel.booksView.js.md`

- **F01** — "Create new entry" uses stale snapshot payload with no save-failure rollback
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — Book "active" toggle can desync from canonical ST selection state on missing selector or rapid toggle
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F03** — `loadList()` aborts entirely on single book-load failure — blank panel
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F04** — `renderBook()` dereferences `data.entries`/`data.metadata` without null guards — throws on race
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F05** — Large-book entry rendering is sequential with no yielding — UI stall
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F06** — `dragend` cleanup iterates cache without null guards — throws if cache cleared during drag
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/listPanel.coreBridge.js`
→ `CodeReview_listPanel.coreBridge.js.md`

- **F01** — `setSelectedBookInCoreUi()` can resolve before core selection is confirmed — wrong-book delete/duplicate
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — Redundant `change` event dispatched when book is already selected — unnecessary core reloads
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F03** — `clickCoreUiAction()` re-resolves element after wait — can click missing/wrong element
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F04** — `waitForDom()` observes entire `document` subtree with attributes — performance footgun
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F05** — `renameBook` selector list has only one entry — higher breakage risk on upstream DOM change
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/listPanel.filterBar.js`
→ `CodeReview_listPanel.filterBar.js.md`

- **F01** — `applySearchFilter()` throws during list load when entry DOM not yet rendered
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — Filtering can hide selected entries — Delete then destroys invisible entries silently
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F03** — Search filter traverses and writes all entry DOM nodes every keystroke — input lag
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F04** — Entry search cache grows unbounded — no pruning on entry/book removal
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F05** — Global `document` click handler for visibility menu has no cleanup path — listener leak
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/listPanel.foldersView.js`
→ `CodeReview_listPanel.foldersView.js.md`

- **F01** — Folder header `onToggle` throws when folder DOM is missing due to refresh/click race
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — "Expand All Folders" not applied to folders created after the action — inconsistent state
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F03** — Folder active-toggle refresh is O(Folders × Books) — input lag on large collections
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F04** — "Collapse All Folders" writes `localStorage` once per folder — avoidable sync overhead
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/listPanel.js`
→ `CodeReview_listPanel.js.md`

- **F01** — `setBookSortPreference()` calls `sortEntriesIfNeeded()` post-await on possibly-cleared cache
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — `setBookSortPreference()` saves full `buildSavePayload()` for a metadata-only change — overwrites risk
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F03** — `refreshList()` awaits debounced loader — can drop/merge requests and produce stale UI
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F04** — `initListPanel()` has no teardown — duplicate handlers if called more than once
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 
  
- **F05** — `renderBookSourceLinks()` clears container via `innerHTML = ''` — drops keyboard focus
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/Settings.js`
→ `CodeReview_Settings.js.md`

- **F01** — `useBookSorts` validation can silently override persisted false when stored as non-boolean
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — `Object.assign` hydrates arbitrary keys into the Settings instance
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F03** — Overwriting `extension_settings.worldInfoDrawer` with a class instance relies on `toJSON` behavior
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/bookSourceLinks.js`
→ `CodeReview_bookSourceLinks.js.md`

- **F01** — `cleanup()` does not unsubscribe `eventSource` listeners (leak / duplicate refresh on re-init)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - Implemented: ✅
    - Implementation Notes: Added subscription tracking and removed `eventSource` listeners during cleanup to prevent duplicate refreshes on re-init.
    - Manual checks:
      - [ ] Reload / re-init the extension UI twice, then change chat; confirm source-icon debug logs fire only once per event.

- **F02** — `getBookSourceLinks()` fallback returns a different object shape than normal entries
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Impact/severity rationale is overstated; at least one current caller normalizes missing fields, so validate other call sites and adjust severity/justification accordingly.
  - Implemented: ✅
    - Implementation Notes: Updated `EMPTY_BOOK_SOURCE_LINKS` to a full-shape fallback so `getBookSourceLinks()` always returns a consistent object shape.
    - Manual checks:
      - [ ] Open the World Info drawer and verify book source icons + tooltips still render correctly for books with no chat/persona/character linkage.

- **F03** — Signature computation uses full `JSON.stringify(nextLinks)` (unnecessary churn + ordering sensitivity)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Performance/ordering instability claims are plausible but unproven; revise toward a minimal, lower-risk stabilization (e.g., canonicalize `characterNames` ordering) and avoid over-scoped signature refactor.
  - Implemented: ✅
    - Implementation Notes: Sorted `characterNames` to reduce signature churn without changing the overall signature mechanism.
    - Manual checks:
      - [ ] Join a group chat with multiple characters linked to the same book; confirm the tooltip lists the same names (now in stable order) and source icons still update on character/group changes.

- **F04** — Direct imports from internal ST modules increase upstream breakage risk (prefer `getContext()` where possible)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Must include an explicit compatibility policy (minimum supported ST version) or a context-first fallback strategy; otherwise refactor can introduce host-version breakages.
  - Implemented: ✅
    - Implementation Notes: Switched to context-first ST state access with fallback to existing direct imports for compatibility across host versions.
    - Manual checks:
      - [ ] Load the extension on your target ST version and verify source icons update when switching chats and when selecting a persona lorebook (no console errors).

---

### `src/constants.js`
→ `CodeReview_constants.js.md`

- **F01** — `SORT_DIRECTION` docstrings are incorrect/misaligned with actual meaning
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - Implemented: 

- **F02** — Recursion option values are duplicated across modules — drift risk breaks filters/indicators
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - Implemented: 

- **F03** — Column-schema “sync” is comment-only — mismatch can silently break column visibility/persistence
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Preventive drift check; checklist lacks a concrete one-time integration point/gating strategy.
  - Implemented: 

- **F04** — Exported “constant” objects/arrays are mutable — accidental mutation can cascade across UI
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Preventive-only; freeze/copy strategy is not narrowed to a smallest safe change and could be breaking.
  - Implemented: 

- **F05** — `SORT` enum names overlap conceptually (TITLE vs ALPHABETICAL) — increases future misuse risk
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Forward-looking; `SORT.ALPHABETICAL` not currently surfaced in UI and rename/compat concerns outweigh benefit.
  - Implemented: 

---

### `src/listPanel.selectionDnD.js`
→ `CodeReview_listPanel.selectionDnD.js.md`

- **F01** — Drag-drop uses live selection list after async loads, enabling wrong-entry moves
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — Missing null guards on `loadWorldInfo` results can crash drag-drop
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F03** — Move operation can create duplicates on partial delete failures
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/listPanel.state.js`
→ `CodeReview_listPanel.state.js.md`

- **F01** — State caches use plain objects with user-controlled keys (prototype pollution / key collisions)
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — Selection state can survive list reloads, leaving stale `selectFrom`/`selectList`
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/lorebookFolders.js`
→ `CodeReview_lorebookFolders.js.md`

- **F01** — `createBookInFolder` assumes `loadWorldInfo()` always succeeds and returns an object
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

- **F02** — Folder import can miss the update event if it fires before `waitForWorldInfoUpdate` is registered
  - Meta-reviewed: [ ]
    - Verdict: 
    - Reason: 
  - Implemented: 

---

### `src/orderHelper.js`
→ `CodeReview_orderHelper.js.md`

- **F01** — Opening Order Helper can clear the entry editor and lose unsaved typing (no “dirty” guard)
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F02** — Order Helper entry collection can throw if cache/DOM desyncs during updates (missing null guards)
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F03** — Scope comparison is order-sensitive and can cause unnecessary full rerenders
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F04** — `getOrderHelperSourceEntries()` does repeated `includes()` scans and late book filtering (avoidable overhead)
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F05** — Custom-order display index assignment mutates cache and triggers background saves with no error handling
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

---

### `src/orderHelperFilters.js`
→ `CodeReview_orderHelperFilters.js.md`

- **F01** — Applying filters mutates filter state (auto-selects “all”) and can override user intent
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F02** — Group filter can throw if `getGroupValue()` returns null/undefined (assumes array)
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F03** — Recursion “delayUntilRecursion” flag detection is overly permissive and may misclassify values
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F04** — Filter application is more expensive than necessary (repeated Set creation per row), risking lag on large tables
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

---

### `src/orderHelperRender.js`
→ `CodeReview_orderHelperRender.js.md`

- **F01** — Opening Order Helper can silently wipe unsaved editor work (forced editor reset)
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F02** — Custom sort persistence uses fire-and-forget saves, risking race conditions and silent failures
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F03** — Renderer mounts new Order Helper DOM without clearing previous content (duplication / leaks)
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

---

## Pipeline Queues

The live work queues have been moved to dedicated files:

| Stage | File |
| --- | --- |
| Pending first-pass review | [`QUEUE_REVIEW.md`](QUEUE_REVIEW.md) |
| Pending meta-review (step 2) | [`QUEUE_META_REVIEW.md`](QUEUE_META_REVIEW.md) |
| Pending implementation | [`QUEUE_IMPLEMENTATION.md`](QUEUE_IMPLEMENTATION.md) |
