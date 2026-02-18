# Code Review Tracker

Track all code-review findings across the extension's JS files.

**Fields per finding:**

- **Meta-reviewed**: Has this finding already been meta-reviewed by a second LLM? [ ] or [X]
- **Verdict**: Ready to implement 🟢 / Implementation plan needs revision 🟡 / Implementation plan is not usable 🔴
- **Reason**: If rejected, why
- **Implemented**: Has the implementation plan been implemented? ❌ or ✅
  - **Implementation Notes**:
  - **🧪 MANUAL CHECK**: [] checklist for the user

---

## Reviewed Files

---

### `index.js`
-> `CodeReview_index.js.md`

- **F01** -- `jumpToEntry()` can discard unsaved editor work when switching entries
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** High ❗❗ — Direct unsaved-edit loss path via public API; external callers can cause data loss.
  - Implemented:

- **F02** -- Startup `refreshList()` promise is not handled
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Startup failures become opaque; harder to diagnose issues.
  - Implemented:

- **F03** -- Dev CSS watch has no teardown path for watcher/listener lifecycle
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Best practice violation; only affects dev workflow.
  - Implemented:

---

### `src/drawer.js`
-> `CodeReview_drawer.js.md`

- **F01** — New-book creation awaits non-specific "update started" promise — race with cache init
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Checklist needs to explicitly register `waitForWorldInfoUpdate()` *before* `createNewWorldInfo(...)` and remove redundant investigation step.
  - Implemented: ✅
    - Implementation Notes: Registered `waitForWorldInfoUpdate()` before `createNewWorldInfo(...)` and added cache/DOM guard with refresh fallback before scrolling to the new book.
    - **🟥 MANUAL CHECK**: [ ] Create a new book while other updates are happening; confirm the new book expands and scrolls into view without console errors.

- **F02** — Drawer "reopen" MutationObserver forces synthetic click that can discard unsaved edits
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Fix plan is ambiguous (prompt vs skip); must pick a single least-behavior-change rule and declare consistency/dependency with other dirty-guard fixes.
  - Implemented: ✅
    - Implementation Notes: Drawer reopen observer now skips the synthetic entry-row click when the current editor is dirty, preventing unsaved input loss.
    - **🟥 MANUAL CHECK**: [ ] Open an entry, type without saving, close and reopen the drawer; confirm typed text is preserved and no unexpected blank editor state occurs.

- **F03** — Delete handler reads live `selectionState` across `await` — can delete wrong entries
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Remove optional behavior-changing "abort if selection changes" branch; snapshot-only should be the sole recommendation.
  - Implemented: ✅
    - Implementation Notes: Delete hotkey now snapshots `selectFrom` and selected UIDs before any `await` to prevent selection changes from affecting an in-flight delete.
    - **🟥 MANUAL CHECK**: [ ] Select multiple entries, press Delete, then quickly click another book; confirm only the originally selected entries are deleted.

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
    - **🟥 MANUAL CHECK**: [ ] Start dragging the splitter, then alt-tab / open an OS overlay / trigger a gesture cancel; confirm the list is still resizable afterward and the final width persists after reload.

- **F07** — Toggling Activation Settings / Order Helper clears entry editor without dirty-state guard
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Fix plan is ambiguous (prompt vs refuse); should pick a single least-scope behavior (skip toggle when dirty) and keep dirty-guard behavior consistent with F02.
  - Implemented: ✅
    - Implementation Notes: Added dirty guards to Activation Settings and Order Helper toggles, showing a toast and blocking mode switches that would discard unsaved edits.
    - **🟥 MANUAL CHECK**: [ ] Type unsaved edits in an entry, click the gear/order toggle; confirm a toast appears and the editor content remains unchanged.

- **F08** — `addDrawer()` has no singleton guard — multiple inits duplicate UI and global listeners
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded 🔴
    - Reason: Requires evidence of in-place reload + a concrete singleton registry/teardown strategy; "skip init" risks breaking `initDrawer()` consumers and fix risk is under-rated.
  - Implemented: ❌ Skipped (🔴 discarded)
    - Implementation Notes: Skipped — plan discarded; safe idempotent init/teardown requires validated ST reload semantics and a concrete singleton/registry approach.

---

### `src/editorPanel.js`
-> `CodeReview_editorPanel.js.md`

- **F01** — Dirty tracking silently fails for entry UID `0` because of falsy checks
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** High ❗❗ — Direct data-loss path for entry UID 0; users can lose unsaved edits without warning.
  - Implemented:

- **F02** — `openEntryEditor()` marks the new entry clean before async load succeeds
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** High ❗❗ — Dirty-state desync can cause guards to fail, leading to data loss on abort.
  - Implemented:

- **F03** — Dirty state can remain permanently "dirty" after successful saves
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Users repeatedly blocked from Activation Settings/Order Helper despite having no unsaved changes.
  - Implemented:

- **F04** — Stale open abort can leave active-row highlight inconsistent with editor content
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Visual mismatch can lead to accidental edits on wrong entry.
  - Implemented:

- **F05** — `clearEntryHighlights()` scans every entry on every open/reset
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Performance issue; UI lag on large lorebooks.
  - Implemented:

- **F06** — Pointer-based dirty tracking marks non-editing UI interactions as unsaved edits
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — False positives cause misleading warnings and blocked actions.
  - Implemented:

- **F07** — Editor-level event listeners are attached without a teardown path
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Best practice violation; listener leak only affects re-init scenarios.
  - Implemented:

---

### `src/listPanel.booksView.js`
-> `CodeReview_listPanel.booksView.js.md`

- **F01** -- Missing null guard for loaded book data can crash full list rendering
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Crash is disruptive but recoverable via refresh; defensive fix adds robustness.
  - Implemented:

- **F02** -- New-entry flow applies optimistic UI/cache mutation without rollback on save failure
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Checklist missing editor cleanup step — if editor was opened via `.click()` before save fails, editor panel may remain open with unsaved content.
  - **Neglect Risk:** Medium ❗ — Data integrity issue but requires specific failure conditions to manifest.
  - Implemented:

---

### `src/listPanel.bookMenu.js`
-> `CodeReview_listPanel.bookMenu.js.md`

- **F01** -- Duplicate-book detection can pick the wrong new book under concurrent creates
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F02** -- Move-to-folder actions can discard unsaved editor edits via forced list refresh
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F03** -- Folder import can abort mid-run and leave partial/empty books without clear recovery
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F04** -- Exported book payload drops metadata needed for folder/sort restoration
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

- **F05** -- External Editor integration suppresses request failures and user feedback
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

---

### `src/bookSourceLinks.js`
-> `CodeReview_bookSourceLinks.js.md`

- **F01** — `cleanup()` does not unsubscribe `eventSource` listeners (leak / duplicate refresh on re-init)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - Implemented: ✅
    - Implementation Notes: Added tracked event subscriptions and cleanup-time `eventSource.removeListener(...)` teardown for all source-link event handlers.
    - **🧪 MANUAL CHECK**:
      - [ ] Reopen/reinitialize the drawer extension, then switch chats/characters and confirm source-link refresh events fire once per action.

- **F02** — `getBookSourceLinks()` fallback returns a different object shape than normal entries
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Impact/severity rationale is overstated; at least one current caller normalizes missing fields, so validate other call sites and adjust severity/justification accordingly.
  - Implemented: ✅
    - Implementation Notes: Expanded the fallback object to full link shape and verified existing callers still normalize safely.
    - **🧪 MANUAL CHECK**:
      - [ ] Open the book list with mixed source-linked and unlinked books and confirm source icons/tooltips render without missing text or errors.

- **F03** — Signature computation uses full `JSON.stringify(nextLinks)` (unnecessary churn + ordering sensitivity)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Performance/ordering instability claims are plausible but unproven; revise toward a minimal, lower-risk stabilization (e.g., canonicalize `characterNames` ordering) and avoid over-scoped signature refactor.
  - Implemented: ✅
    - Implementation Notes: Added canonical source-link signature generation with sorted keys/names and kept refresh early-return behavior unchanged.
    - **🧪 MANUAL CHECK**:
      - [ ] Trigger source-link refresh events (chat switch, character edit, settings update) and confirm icons/tooltips refresh when actual links change.

- **F04** — Direct imports from internal ST modules increase upstream breakage risk (prefer `getContext()` where possible)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Must include an explicit compatibility policy (minimum supported ST version) or a context-first fallback strategy; otherwise refactor can introduce host-version breakages.
  - Implemented: ✅
    - Implementation Notes: Refactored to context-first runtime access with direct-import fallback strategy for compatibility across host versions.
    - **🧪 MANUAL CHECK**:
      - [ ] Switch chats/groups/characters and verify source-link icons still update correctly with no console errors on your current SillyTavern version.

---

### `src/constants.js`
-> `CodeReview_constants.js.md`

- **F01** -- `SORT_DIRECTION` docstrings are incorrect/misaligned with actual meaning
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ -- Documentation-only mismatch; leaving it unfixed mainly risks developer confusion.
  - Implemented: ✅
    - Implementation Notes: Corrected `SORT_DIRECTION` docstrings to describe ascending/descending semantics without changing runtime values.
    - **🧪 MANUAL CHECK**:
      - [ ] Open any sort menu and confirm sort direction behavior is unchanged.

- **F02** -- Recursion option values are duplicated across modules -- drift risk breaks filters/indicators
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ -- Duplication increases future drift risk that can break filter behavior/indicators in Order Helper.
  - Implemented: ✅
    - Implementation Notes: Replaced hardcoded recursion values in createOrderHelperState() with values derived from ORDER_HELPER_RECURSION_OPTIONS.
    - **🧪 MANUAL CHECK**:
      - [ ] Open Order Helper and verify Recursion filter options still show all three expected values and filter rows correctly.

- **F03** -- Column-schema "sync" is comment-only -- mismatch can silently break column visibility/persistence
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Step 1 plan is ambiguous about fallback policy and does not specify canonical schema key handling in state/hydration.
  - **Neglect Risk:** Medium ❗ -- Drift would silently degrade column visibility persistence, making preferences feel unreliable.
  - Implemented: ✅
    - Implementation Notes: Added schema/default mismatch validation, canonical default backfill for missing schema keys, and schema-key-only stored columns hydration.
    - **🧪 MANUAL CHECK**:
      - [ ] Open Order Helper, toggle several columns, reload the page, and confirm column visibility persists without console errors.

- **F04** -- Exported "constant" objects/arrays are mutable -- accidental mutation can cascade across UI
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded 🔴
    - Reason: Requires extensive analysis to validate absence of runtime mutation paths; freezing could introduce runtime exceptions.
  - **Neglect Risk:** Low ⬜ -- No evidence of current mutation; risk is mostly hypothetical unless future code mutates shared schema.
  - Implemented: ❌ Skipped (🔴 discarded)
    - Implementation Notes: Skipped -- requires extensive analysis to prove no runtime mutation paths before introducing freezing behavior.

- **F05** -- `SORT` enum names overlap conceptually (TITLE vs ALPHABETICAL) -- increases future misuse risk
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Step 1 fix references UI label mapping without evidence the option is exposed, and misses the concrete doc mismatch vs `sortEntries()` behavior.
  - **Neglect Risk:** Low ⬜ -- Primarily a maintainability/docs clarity issue; limited immediate user impact.
  - Implemented: ✅
    - Implementation Notes: Updated `SORT.TITLE`/`SORT.ALPHABETICAL` docs and marked `ALPHABETICAL` as a legacy compatibility alias while keeping UI options unchanged.
    - **🧪 MANUAL CHECK**:
      - [ ] Open sort dropdowns and confirm the same options as before are shown (no new `ALPHABETICAL` option added).

---

### `src/orderHelper.js`
-> `CodeReview_orderHelper.js.md`

- **F01** — Opening Order Helper can clear the entry editor and lose unsaved typing (no "dirty" guard)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Checklist Step 1 redundant (dirty-state API confirmed); Step 3 vague about entry points.
  - **Neglect Risk:** High ❗❗ — Direct unsaved-edit loss path; users can lose typed content without warning.
  - Implemented: ✅
    - Implementation Notes: Added `getCurrentEditor` dep to `initOrderHelper()`; added dirty guard in `openOrderHelper()` using `getCurrentEditor()` + `isDirty()` — shows warning toast and returns early, protecting all callers including book-menu shortcut.
    - **🟥 MANUAL CHECK**:
      - [ ] Open an entry, type without saving, then open Order Helper via the book-menu shortcut; confirm a warning toast appears and Order Helper does not open. Save or discard changes; confirm Order Helper opens normally.

- **F02** — Order Helper entry collection can throw if cache/DOM desyncs during updates (missing null guards)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Crash during concurrent updates can disrupt user workflow.
  - Implemented: ✅
    - Implementation Notes: Added null guards in `getOrderHelperEntries()` `includeDom` path — validates `uid`, `cache[entryBook]`, and `cache[entryBook].entries[uid]`; stale rows filtered via `.filter(Boolean)`.
    - **🟥 MANUAL CHECK**:
      - [ ] Open Order Helper, then delete a book or trigger a refresh while it is open; interact with sort/filter and confirm no console errors appear and valid rows still display correctly.

- **F03** — Scope comparison is order-sensitive and can cause unnecessary full rerenders
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Step 1 is a decision point, not actionable; race condition claim speculative.
  - **Neglect Risk:** Low ⭕ — Performance only; no data loss risk.
  - Implemented: ✅
    - Implementation Notes: Updated `normalizeScope()` to return `[...scope].sort()` (sorted copy); `isSameScope()` unchanged — index-based comparison is now correct since both inputs are always pre-sorted.

- **F04** — `getOrderHelperSourceEntries()` does repeated `includes()` scans and late book filtering (avoidable overhead)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Performance issue; O(books × scopeSize) overhead in hot paths.
  - Implemented: ✅
    - Implementation Notes: Replaced `.includes()` with `Set.has()` (scope built once per call); added early-return fast path for single-book requests to bypass full cache iteration.

- **F05** — Custom-order display index assignment mutates cache and triggers background saves with no error handling
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Step 1 is investigation, not implementation; Step 2 presents options.
  - **Neglect Risk:** Medium ❗ — Silent persistence failure can cause lost ordering work.
  - Implemented: ✅
    - Implementation Notes: Made `renderOrderHelper()` async; replaced fire-and-forget `void saveWorldInfo(...)` loop with awaited sequential `for...of` saves in `try/catch`; shows `toastr.error` on failure.
    - **🟥 MANUAL CHECK**:
      - [ ] With multiple books open, switch Order Helper to Custom sort; confirm all entries receive display indexes and no console errors appear. Simulate a network failure or server error and confirm a toast error message appears.

---

### `src/orderHelperRender.actionBar.js`
-> `CodeReview_orderHelperRender.actionBar.js.md`

- **F01** — Bulk-apply actions can throw if table DOM/cache is not ready (missing null guards)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Crash during bulk operations can disrupt user workflow and require drawer reopen.
  - Implemented: ✅
    - Implementation Notes: Added safe tbody/entry guards for bulk apply handlers so invalid table/cache rows are skipped instead of throwing.
    - **🧪 MANUAL CHECK**:
      - [ ] Open Order Helper, trigger a quick refresh, click bulk Apply buttons, and confirm there are no console errors and valid selected rows still update.

- **F02** — Outside-click listeners can leak if the component is removed while menus are open
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Needs research step to validate existing cleanup coverage via MULTISELECT_DROPDOWN_CLOSE_HANDLER and exact lifecycle before implementation.
  - **Neglect Risk:** Low ⬜ — Listener leak only affects repeated opens without page reload; speculative severity.
  - Implemented: ✅
    - Implementation Notes: Added bulk-row cleanup plus renderer rerender cleanup invocation to always remove outlet outside-click listeners.
    - **🧪 MANUAL CHECK**:
      - [ ] Open the outlet dropdown, switch Order Helper scope or rerender, and confirm no ghost outside-click behavior remains.

- **F03** — Bulk apply loops can freeze the UI on large tables (no yielding in hot loops)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Async yielding introduces behavioral changes (user interaction during gaps) that require button-disabling mitigation.
  - **Neglect Risk:** Low ⬜ — Performance-only issue; only affects users with large lorebooks and no data loss risk.
  - Implemented: ✅
    - Implementation Notes: Refactored State/Strategy/Order bulk applies to precompute targets, lock Apply buttons, and yield every 200 rows.
    - **🧪 MANUAL CHECK**:
      - [ ] Run State/Strategy/Order apply on a large entry list and confirm the button is temporarily disabled, the UI stays responsive, and final saved values are correct.

- **F04** — Direction radios are not grouped as radios (no `name`), risking inconsistent UI/accessibility
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Accessibility/maintenance concern only; mouse behavior works correctly.
  - Implemented: ✅
    - Implementation Notes: Grouped direction radios with a shared name and switched persistence to change handlers with native exclusivity.
    - **🧪 MANUAL CHECK**:
      - [ ] Toggle Direction between up/down and reload; confirm the selected option persists and only one option can be selected at a time.

---

### `src/orderHelperFilters.js`
-> `CodeReview_orderHelperFilters.js.md`

- **F01** -- Applying filters mutates filter state (auto-selects "all") and can override user intent
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ -- Real UX/state-consistency issue that can override user filter intent.
  - Implemented: ✅
    - Implementation Notes: Removed apply-time auto-fill state mutation so empty selections remain intentional and filtering no longer rewrites user state.
    - **🟥 MANUAL CHECK**:
      - [ ] In Order Helper, clear all values in Strategy and Position filters; confirm all rows hide and selections are not auto-restored by refresh/reopen.

- **F02** -- Group filter can throw if `getGroupValue()` returns null/undefined (assumes array)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: The finding incorrectly claims `getGroupValue` can return null/undefined, but code inspection shows it always returns an array. The fix is unnecessary but harmless.
  - **Neglect Risk:** Low ⬜ -- Defensive-only hardening; current code path is already safe.
  - Implemented: ✅
    - Implementation Notes: Added defensive group-value normalization before matching so non-array shapes no longer risk runtime method errors.
    - **🟥 MANUAL CHECK**:
      - [ ] Open Group filter and confirm entries with no group still match `(none)` and no console errors appear during filter toggles.

- **F03** -- Recursion "delayUntilRecursion" flag detection is overly permissive and may misclassify values
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: The finding correctly identifies the numeric vs boolean mismatch, but the "Requires user input" flag should be replaced with a concrete recommendation based on WI API evidence (the field is numeric).
  - **Neglect Risk:** Medium ❗ -- Misclassification can produce incorrect row sets for bulk operations.
  - Implemented: ✅
    - Implementation Notes: Replaced permissive delay flag logic with numeric semantics (`Number(delayUntilRecursion) > 0`) to match WI entry schema.
    - **🟥 MANUAL CHECK**:
      - [ ] Verify Recursion filter only marks delay-flag rows when `delayUntilRecursion` is greater than 0.

- **F04** -- Filter application is more expensive than necessary (repeated Set creation per row), risking lag on large tables
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ -- Performance optimization issue that grows with larger entry tables.
  - Implemented: ✅
    - Implementation Notes: Moved allowed-set construction into outer filter-application loops and passed precomputed data into row helpers.
    - **🟥 MANUAL CHECK**:
      - [ ] Toggle multiple Order Helper filters on a large table and confirm behavior is unchanged with no noticeable lag spikes.

---

### `src/orderHelperRender.js`
-> `CodeReview_orderHelperRender.js.md`

- **F01** — Opening Order Helper can silently wipe unsaved editor work (forced editor reset)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Original checklist step 1 is vague ("Inspect getEditorPanelApi() shape") and should verify if `isDirty` is already exposed. Also, the fix should prefer blocking with warning (simpler) over confirmation dialog (more complex).
  - **Neglect Risk:** High ❗❗ — Direct unsaved-edit loss path; high-severity data loss risk.
  - Routed to: `QUEUE_USER_REVIEW.md`
  - Implemented: ❌ Skipped (🚩 requires user input)
    - Implementation Notes: Skipped — routed to QUEUE_USER_REVIEW.md; requires confirmation on whether existing caller-level dirty guards (drawer.js F07, orderHelper.js F01 via openOrderHelper()) are sufficient or whether a guard inside renderOrderHelper() is still needed.

- **F02** — Custom sort persistence uses fire-and-forget saves, risking race conditions and silent failures
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Reliability issue; users can lose ordering work without clear feedback.
  - Implemented: ❌ Already fixed
    - Implementation Notes: Already fixed — renderOrderHelper() uses await saveWorldInfo(...) in a try/catch for...of sequential loop (not void) and is async; applied as part of orderHelper.js F05 (CODE_REVIEW_CHANGELOG.md, February 17, 2026).

- **F03** — Renderer mounts new Order Helper DOM without clearing previous content (duplication / leaks)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Performance issue; can cause progressive slowdown and ghost interactions.
  - Implemented: ❌ Already fixed
    - Implementation Notes: Already fixed — resetEditorState() called at the start of renderOrderHelper() invokes clearEditor() → dom.editor.innerHTML = '' in editorPanel.js, clearing all prior content (including any existing .stwid--orderHelper) before the new body is appended.

---

### `src/orderHelperRender.utils.js`
-> `CodeReview_orderHelperRender.utils.js.md`

- **F01** — `setTooltip()` can throw if `text` is not a string (missing type guard)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Can cause hard crashes if tooltip receives non-string values.
  - Implemented: ✅
    - Implementation Notes: Split combined guard into `if (!element) return;` + `if (typeof text !== 'string' || text.trim() === '') return;`; added `effectiveAriaLabel` type check so non-string ariaLabel values fall back to normalized text.
    - **🟥 MANUAL CHECK**:
      - [ ] Open Order Helper, hover over tooltipped elements (column headers, filter dropdowns, entry links); confirm tooltips appear correctly and no console errors occur.

- **F02** — `wireMultiselectDropdown()` does not keep `aria-expanded` in sync with open/close state
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Accessibility issue only; no functional impact.
  - Implemented: ✅
    - Implementation Notes: Added `menuButton?.setAttribute('aria-expanded', 'true')` in `openMenu()` and `menuButton?.setAttribute('aria-expanded', 'false')` in `closeMenu()`; `closeOpenMultiselectDropdownMenus()` already delegates to the registered close handler, so attribute stays consistent for externally-closed menus.
    - **🟥 MANUAL CHECK**:
      - [ ] Open a multiselect dropdown in Order Helper, inspect the button element's `aria-expanded` attribute; confirm it reads `"true"` when the menu is open and `"false"` after closing it.

- **F03** — Outside-click `document` listener can leak if a menu is removed while open (no teardown path)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded 🔴
    - Reason: Finding contains a 🚩 flag requiring user input. Per meta-review rules, findings with 🚩 flags must be discarded.
  - **Neglect Risk:** Medium ❗ — Listener leaks can accumulate over repeated Order Helper opens/rerenders, causing performance degradation.
  - Implemented: ❌ Skipped (🔴 discarded)
    - Implementation Notes: Skipped — plan discarded; requires user confirmation on whether Order Helper rerender removes dropdown DOM while any menu is open before a cleanup lifecycle can be wired.

---

### `src/orderHelperRender.tableBody.js`
-> `CodeReview_orderHelperRender.tableBody.js.md`

- **F01** — Concurrent `saveWorldInfo(..., true)` calls can persist stale snapshots (last-write-wins race)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** High ❗❗ — Real data integrity risk; users can lose edits when making rapid changes in Order Helper.
  - Implemented: ✅
    - Implementation Notes: Added `createBookSaveSerializer()` module-level helper with per-book in-flight/pending coalescing; replaced all 16 direct `saveWorldInfo` calls in inline-edit handlers and `updateCustomOrderFromDom` with `enqueueSave(book)`.
    - **🟥 MANUAL CHECK**:
      - [x] In Order Helper, rapidly change two different fields on the same entry (e.g., change Delay then immediately toggle Ignore Budget). Reload the lorebook. Confirm both changes are persisted.

- **F02** — `updateCustomOrderFromDom()` can throw on missing book/entry during refresh/desync
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Crash during concurrent updates can disrupt user workflow.
  - Implemented: ✅
    - Implementation Notes: Added early-exit tbody guard, `!bookName || !uid` attribute guard, `!cache[bookName]?.entries` guard, and `!entry` guard; stale rows are skipped and `nextIndex` is computed only for valid rows.
    - **🟥 MANUAL CHECK**:
      - [x] Open Order Helper and drag-reorder rows normally; confirm row order saves correctly on reload. Then trigger a World Info refresh while Order Helper is open; confirm no console errors and the table remains usable.

- **F03** — Comment link can render as the string "undefined" for entries without a comment
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Cosmetic issue only; no data integrity or functionality impact.
  - Implemented: ✅
    - Implementation Notes: Changed `comment.textContent = e.data.comment` to `comment.textContent = e.data.comment ?? ''` so entries without a comment render as blank text.

---

### `src/orderHelperState.js`
-> `CodeReview_orderHelperState.js.md`

- **F01** -- Order Helper state initialization depends on live core template DOM, causing empty/mismatched option lists
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Timing dependency on DOM can cause empty option lists in edge cases; affects filter functionality.
  - Implemented:

- **F02** -- Recursion option values are duplicated locally instead of deriving from the shared constants schema
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Already addressed in current code; no action needed.
  - Implemented:

- **F03** -- Multiple DOM scrapes for strategy/position lists can create inconsistent snapshots and unnecessary work
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Performance optimization; limited user-visible impact.
  - Implemented:

---

### `src/sortHelpers.js`
-> `CodeReview_sortHelpers.js.md`

- **F01** — Length sorting recomputes word counts inside the comparator, causing avoidable UI stalls
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Performance optimization; impact depends on dataset size and is cosmetic when small.
  - Implemented:

- **F02** — Metadata parser drops valid per-book sort preferences when legacy data omits direction
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Users with legacy metadata lose per-book sort preferences without clear feedback.
  - Implemented:

---

### `src/utils.js`
-> `CodeReview_utils.js.md`

- **F01** -- `executeSlashCommand()` swallows failures, so callers cannot react or inform the user
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Silent failures confuse users when slash command actions (like STLO integration) don't work.
  - Implemented: ✅
    - Implementation Notes: Updated slash command execution to return success/failure with parser/closure guards and updated STLO menu handling to keep the menu open on failure.
    - **🧪 MANUAL CHECK**:
      - [ ] Disable or break STLO, click Configure STLO, and confirm the menu stays open and an error toast appears.
      - [ ] Restore STLO, click Configure STLO, and confirm the command succeeds and the menu closes.

- **F02** -- Direct internal import of `SlashCommandParser` is brittle across SillyTavern updates
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Upcoming SillyTavern updates can break slash command functionality without warning.
  - Implemented: ✅
    - Implementation Notes: Added global parser constructor discovery with try/catch fallback import and null normalization for controlled compatibility failures.
    - **🧪 MANUAL CHECK**:
      - [ ] On your current SillyTavern version, click Configure STLO and confirm there are no parser import/constructor errors in the console.

---

### `src/wiUpdateHandler.js`
-> `CodeReview_wiUpdateHandler.js.md`

- **F01** -- Failed update cycles can leave waiters hanging indefinitely
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** High ❗❗ — Real data-integrity risk; can deadlock UI flows waiting on update completion.
  - Implemented: ✅
    - Implementation Notes: Wrapped `updateWIChange()` in `try/finally` with per-cycle deferred finalization so waiters always receive a finish signal.
    - **🧪 MANUAL CHECK**:
      - [ ] Temporarily force an error during `updateWIChange()` (for example with a test throw), then create or edit a book and confirm follow-up UI actions do not wait forever.

- **F02** -- `fillEmptyTitlesWithKeywords()` forces a duplicate update pass for the same save
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Performance issue causing redundant UI work; no data integrity risk.
  - Implemented: ✅
    - Implementation Notes: Removed the direct post-save `updateWIChange(name, data)` call so fill-empty-title reconciliation runs once via the standard `WORLDINFO_UPDATED` event path.
    - **🧪 MANUAL CHECK**:
      - [ ] Run "Fill empty titles from keywords" on a book with empty titles and confirm titles update once with no duplicate `[UPDATE-WI]` pass for the same save.

- **F03** -- Event bus listeners are registered without a teardown path
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Listener leaks on re-init cause duplicate work and performance drift.
  - Implemented: ✅
    - Implementation Notes: Added named world-info event handlers plus `cleanup()` teardown in `wiUpdateHandler`, and called `wiHandlerApi.cleanup?.()` in drawer teardown.
    - **🧪 MANUAL CHECK**:
      - [ ] Reload/reinitialize the extension flow, then trigger a World Info save and settings change; confirm each handler runs once (no duplicate logs or duplicate list refresh behavior).

- **F04** -- Direct `script.js` imports bypass the stable context API
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Compatibility improvement; no runtime impact unless ST internal APIs change.
  - Implemented: ✅
    - Implementation Notes: Migrated event bus access from direct `script.js` imports to `SillyTavern.getContext()` (`eventSource` + `eventTypes`/`event_types`) for listener wiring.
    - **🧪 MANUAL CHECK**:
      - [ ] Open the drawer, save a lorebook entry, and change WI settings; confirm update and settings handlers still run on your current SillyTavern version.

---

### `src/worldEntry.js`
-> `CodeReview_worldEntry.js.md`

- **F01** -- Clicking status controls on the active row can re-open the editor and discard unsaved text
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** High ❗❗ — Direct unsaved-edit loss path on common interaction; users can lose typed content without warning.
  - Implemented: ✅
    - Implementation Notes: Changed `status` click handler to call `evt.stopPropagation()` unconditionally, preventing status-control clicks from bubbling to the entry row click handler in all cases.
    - **🟥 MANUAL CHECK**:
      - [ ] Click the enable toggle and strategy selector on the currently-open editor row; confirm `openEntryEditor` is not re-triggered and both controls still change entry state correctly.

- **F02** -- Rapid toggle/strategy changes can race and persist stale state out of order
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Race condition can cause user-visible state inconsistency where controls show one value but persisted state reverts.
  - Implemented: ✅
    - Implementation Notes: Added `let isSavingState = false` per-row guard; both `isEnabled` and `strat` handlers return early when `isSavingState` is `true`, disable the control before save, and restore in `finally`.
    - **🟥 MANUAL CHECK**:
      - [ ] Click the enable toggle twice in rapid succession; confirm only one save fires and the final visual state matches the last committed toggle.

- **F03** -- Save failures leave optimistic UI/cache mutations without rollback
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Failed saves leave confusing UI state; users may think changes were saved when they weren't.
  - Implemented: ✅
    - Implementation Notes: Added try/catch with snapshot-based rollback to both handlers — `isEnabled` restores `prevDisabled` + icon; `strat` restores `prevConstant`/`prevVectorized` + `strat.value` via `entryState`; both show `toastr.error` on failure.
    - **🟥 MANUAL CHECK**:
      - [ ] Simulate a save failure (e.g., interrupt the network), then toggle an entry's enable state; confirm the control visually reverts to its pre-toggle value and a red error toast appears.

- **F04** -- Missing template controls cause early return with a partially initialized, non-inserted row
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Edge case failure mode; template availability is generally stable.
  - Implemented: ✅
    - Implementation Notes: Replaced `if (!isEnabled) return entry` and `if (!strat) return entry` with `if (isEnabled) { … }` and `if (strat) { … }` guards; row insertion and entry click handler now always execute regardless of template availability.
    - **🟥 MANUAL CHECK**:
      - [ ] Open a book with normal templates in place; confirm all entry rows render with enable toggles and strategy selectors visible, and that clicking them behaves as before.

---

### `src/listPanel.foldersView.js`
-> `CodeReview_listPanel.foldersView.js.md`

- **F01** — Folder header toggle can throw due to unsafe optional chaining when folder DOM is missing (refresh/click race)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Crash in event handler during refresh/click race; defensive fix adds robustness.
  - Implemented:

- **F02** — "Expand All Folders" is transient and does not apply to folders created after the action, causing inconsistent UI state during in-progress list loads
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — UI consistency issue during incremental list loads; user expectation mismatch.
  - Implemented:

- **F03** — Folder active-toggle refresh is potentially O(Folders × Books) on every filter update, causing input lag on large collections
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Performance issue affecting input latency; algorithmic optimization available.
  - Implemented:

- **F04** — "Collapse All Folders" can write `localStorage` repeatedly (once per folder), causing avoidable synchronous overhead on large folder counts
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Performance issue with large folder counts; straightforward batching optimization.
  - Implemented:

---

### `src/listPanel.js`
-> `CodeReview_listPanel.js.md`

- **F01** — Race: `setBookSortPreference()` can crash or reorder stale DOM after an awaited save
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** High ❗❗ — Real race condition that can crash or desync UI state; high-severity data-integrity issue.
  - Implemented: ✅
    - Implementation Notes: Added refresh-token stale continuation guard, cache/DOM sort guards, and `[STWID]` warnings to skip unsafe post-save sort work.
    - **🟥 MANUAL CHECK**:
      - [ ] Change a book sort, trigger Refresh immediately, and confirm no console crash occurs and the final order is correct after refresh.

- **F02** — Data integrity: `setBookSortPreference()` writes via `buildSavePayload()` from cache (risk of overwriting newer book data)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** High ❗❗ — Silent overwrite bug can cause users to lose edits made through other paths.
  - Implemented: ✅
    - Implementation Notes: Replaced cache-derived sort-preference save with load-latest/clone/metadata-patch/save and refreshed cache metadata after save.
    - **🟥 MANUAL CHECK**:
      - [ ] Edit an entry in one UI surface, then set/clear per-book sort in another, and confirm both changes persist after reload.

- **F03** — Async ordering: `refreshList()` awaits a debounced loader, which can drop/merge refresh requests and produce stale UI
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Debounce semantics can cause visual glitches and inconsistent UI state.
  - Implemented: ✅
    - Implementation Notes: Added refresh worker token sequencing and a documented refresh contract so callers await the newest completed refresh before resolving.
    - **🟥 MANUAL CHECK**:
      - [ ] Click Refresh repeatedly while typing in search and confirm spinner behavior is stable and final list/filter state is correct with no console errors.

- **F04** — Potential memory leak / duplicate handlers if `initListPanel()` runs more than once
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Duplicate handlers can cause subtle bugs; listener stacking is a correctness issue.
  - Implemented: ✅
    - Implementation Notes: Added `teardownListPanel()` cleanup for list listeners/state, idempotent init guard with warning, and exposed `destroyListPanel` in API.
    - **🟥 MANUAL CHECK**:
      - [ ] Reopen/reinitialize the drawer and verify drag/drop and filters trigger once (no duplicate actions).

- **F05** — UI correctness edge case: `renderBookSourceLinks()` clears container with `innerHTML = ''` (focus/selection can be lost)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Checklist needs to specify handling of tooltip changes when the same source key exists with a different display name.
  - **Neglect Risk:** Low ⭕ — Accessibility edge case; cosmetic impact only.
  - Implemented: ✅
    - Implementation Notes: Switched source-link rendering to keyed node diffing that preserves existing icons and updates tooltip/aria text only when values change.
    - **🟥 MANUAL CHECK**:
      - [ ] Switch chat/persona/character links and confirm source icons update correctly and tooltip text changes when attribution names change.

---

### `src/listPanel.selectionDnD.js`
-> `CodeReview_listPanel.selectionDnD.js.md`

- **F01** — Drag-drop uses live selection list after async loads, enabling wrong-entry moves
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Race condition can cause wrong entries to be moved/copied, leading to data confusion.
  - Implemented:

- **F02** — Missing null guards on `loadWorldInfo` results can crash drag-drop
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⬜ — Edge case crash; recoverable via refresh.
  - Implemented:

- **F03** — Move operation can create duplicates on partial delete failures
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Ambiguous policy step - checklist revised to pick single approach (skip destination save on delete failure).
  - **Neglect Risk:** Medium ❗ — Data integrity issue; can silently create duplicates.
  - Implemented:

---

### `src/listPanel.state.js`
-> `CodeReview_listPanel.state.js.md`

- **F01** — State caches use plain objects with user-controlled keys (prototype pollution / key collisions)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Prototype pollution risk with malicious/accidental book names like `__proto__`; can corrupt state and break iteration.
  - Implemented: ✅
    - Implementation Notes: Replaced state maps with null-prototype maps, added key validation helpers, and updated folder collapse state accessors/callers.
    - **🟥 MANUAL CHECK**:
      - [ ] Create or rename a book/folder with normal names and confirm collapse state and folder rendering still behave exactly as before.
      - [ ] Collapse/expand multiple folders, reload the page, and confirm each folder restores to the same collapsed state.

- **F02** — Selection state can survive list reloads, leaving stale `selectFrom`/`selectList`
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Stale selection can cause delete/drag operations to target wrong entries after refresh.
  - Implemented: ✅
    - Implementation Notes: Updated refresh cache clear flow to call `resetSelectionMemory(clearToast)` so stale selections and selection toast are cleared on rebuild.
    - **🟥 MANUAL CHECK**:
      - [ ] Select multiple entries, trigger Refresh, and confirm selection highlight/toast clears immediately.
      - [ ] Select entries, refresh the list, then press Delete or drag; confirm nothing from the old selection is affected.

---

### `src/lorebookFolders.js`
-> `CodeReview_lorebookFolders.js.md`

- **F01** — `createBookInFolder` assumes `loadWorldInfo()` always succeeds and returns an object
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Null return from loadWorldInfo can cause crash; leaves partially created books without folder metadata.
  - Implemented: ✅
    - Implementation Notes: Added a null/object guard in `createBookInFolder`, warned/logged on load failure, and kept the newly created book unchanged for manual folder assignment.
    - **🟥 MANUAL CHECK**:
      - [ ] Create a new book in a folder while `loadWorldInfo` is failing (or temporarily forced to return `null`); confirm a warning appears, the new book still exists, and no console exception is thrown.

- **F02** — Folder import can miss the update event if it fires before `waitForWorldInfoUpdate` is registered
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Race condition causes failed folder assignment with misleading warning.
  - Implemented: ✅
    - Implementation Notes: Registered `waitForWorldInfoUpdate()` before `openImportDialog()`, kept timeout fallback behavior, and added timeout logging.
    - **🟥 MANUAL CHECK**:
      - [ ] Import a folder and confirm books are auto-assigned to the folder without the timeout warning when import succeeds.
      - [ ] Cancel the import dialog, then perform another WI update (for example, save any book); confirm no unexpected folder moves or console errors occur.

---

### `src/Settings.js`
-> `CodeReview_Settings.js.md`

- **F01** — `useBookSorts` validation can silently override persisted false when stored as non-boolean
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Data integrity issue; users can lose their "useBookSorts: false" preference on reload if it gets serialized as a string.
  - Implemented: ✅
    - Implementation Notes: Added `parseBooleanSetting(value, defaultValue)` to `utils.js` (accepts booleans, `"true"`/`"false"` strings, and `1`/`0` numbers); replaced the `typeof !== 'boolean'` guard in `Settings.constructor()` with the tolerant parser.
    - 10 unit tests added to `test/utils.test.js`.

- **F02** — `Object.assign` hydrates arbitrary keys into the Settings instance
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⭕ — Coupling/bloat issue; can carry forward stale keys but has no direct user impact.
  - Implemented: ✅
    - Implementation Notes: Added `KNOWN_SETTINGS_KEYS` allowlist at module level; replaced `Object.assign` with an explicit `for...of` loop that copies only the three known keys when `Object.hasOwn(saved, key)`.

- **F03** — Overwriting `extension_settings.worldInfoDrawer` with a class instance relies on `toJSON` behavior
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ — Integration fragility; relies on SillyTavern always calling toJSON during serialization.
  - Implemented: ✅
    - Implementation Notes: Hardened via F02's allowlist hydration (no extra own enumerable props can appear); added inline comment documenting that `JSON.stringify` invokes `toJSON()` so only the three declared fields are persisted. No storage-shape change.

---

## Pipeline Queues

The live work queues have been moved to dedicated files:

| Stage | File |
| --- | --- |
| Pending first-pass review | [`QUEUE_REVIEW.md`](QUEUE_REVIEW.md) |
| Pending meta-review (step 2) | [`QUEUE_META_REVIEW.md`](QUEUE_META_REVIEW.md) |
| Pending implementation | [`QUEUE_IMPLEMENTATION.md`](QUEUE_IMPLEMENTATION.md) |
