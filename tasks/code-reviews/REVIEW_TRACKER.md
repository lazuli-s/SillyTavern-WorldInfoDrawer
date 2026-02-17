# Code Review Tracker

Track all code-review findings across the extension's JS files.

**Fields per finding:**

- **Meta-reviewed**: Has this finding already been meta-reviewed by a second LLM? [ ] or [X]
- **Verdict**: Ready to implement Ã°Å¸Å¸Â¢ / Implementation plan needs revision Ã°Å¸Å¸Â¡ / Implementation plan is not usable Ã°Å¸â€Â´
- **Reason**: If rejected, why
- **Implemented**: Has the implementation plan been implemented? Ã¢ÂÅ’ or Ã¢Å“â€
  - **Implementation Notes**:
  - **ðŸŸ¥ MANUAL CHECK**: [] checklist for the user

---

## Reviewed Files

---

### `index.js`
-> `CodeReview_index.js.md`

- **F01** -- `jumpToEntry()` can discard unsaved editor work when switching entries
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** High â—â— â€” Direct unsaved-edit loss path via public API; external callers can cause data loss.
  - Implemented:

- **F02** -- Startup `refreshList()` promise is not handled
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Medium â— â€” Startup failures become opaque; harder to diagnose issues.
  - Implemented:

- **F03** -- Dev CSS watch has no teardown path for watcher/listener lifecycle
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Low â­• â€” Best practice violation; only affects dev workflow.
  - Implemented:

---

### `src/drawer.js`
Ã¢â€ â€™ `CodeReview_drawer.js.md`

- **F01** Ã¢â‚¬â€ New-book creation awaits non-specific "update started" promise Ã¢â‚¬â€ race with cache init
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision Ã°Å¸Å¸Â¡
    - Reason: Checklist needs to explicitly register `waitForWorldInfoUpdate()` *before* `createNewWorldInfo(...)` and remove redundant investigation step.
  - Implemented: Ã¢Å“â€¦
    - Implementation Notes: Registered `waitForWorldInfoUpdate()` before `createNewWorldInfo(...)` and added cache/DOM guard with refresh fallback before scrolling to the new book.
    - **Ã°Å¸Å¸Â¥ MANUAL CHECK**: [ ] Create a new book while other updates are happening; confirm the new book expands and scrolls into view without console errors.

- **F02** Ã¢â‚¬â€ Drawer "reopen" MutationObserver forces synthetic click that can discard unsaved edits
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision Ã°Å¸Å¸Â¡
    - Reason: Fix plan is ambiguous (prompt vs skip); must pick a single least-behavior-change rule and declare consistency/dependency with other dirty-guard fixes.
  - Implemented: Ã¢Å“â€¦
    - Implementation Notes: Drawer reopen observer now skips the synthetic entry-row click when the current editor is dirty, preventing unsaved input loss.
    - **Ã°Å¸Å¸Â¥ MANUAL CHECK**: [ ] Open an entry, type without saving, close and reopen the drawer; confirm typed text is preserved and no unexpected blank editor state occurs.

- **F03** Ã¢â‚¬â€ Delete handler reads live `selectionState` across `await` Ã¢â‚¬â€ can delete wrong entries
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision Ã°Å¸Å¸Â¡
    - Reason: Remove optional behavior-changing "abort if selection changes" branch; snapshot-only should be the sole recommendation.
  - Implemented: Ã¢Å“â€¦
    - Implementation Notes: Delete hotkey now snapshots `selectFrom` and selected UIDs before any `await` to prevent selection changes from affecting an in-flight delete.
    - **Ã°Å¸Å¸Â¥ MANUAL CHECK**: [ ] Select multiple entries, press Delete, then quickly click another book; confirm only the originally selected entries are deleted.

- **F04** Ã¢â‚¬â€ Drawer-open detection uses `elementFromPoint` at screen center Ã¢â‚¬â€ brittle with overlays
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded Ã°Å¸â€Â´
    - Reason: Impact claim is not evidence-backed (likely false negatives vs false positives) and proposed fix is ambiguous/multi-option; requires broader runtime validation.
  - Implemented: Ã¢ÂÅ’ Skipped (Ã°Å¸â€Â´ discarded)
    - Implementation Notes: Skipped Ã¢â‚¬â€ plan discarded; requires runtime validation to choose an authoritative drawer-open signal and overlay behavior.

- **F05** Ã¢â‚¬â€ No teardown for `moSel`/`moDrawer` MutationObservers Ã¢â‚¬â€ accumulate on reload
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded Ã°Å¸â€Â´
    - Reason: Relies on unproven in-place reload lifecycle and lacks a concrete teardown trigger; needs a verified lifecycle hook or a broader singleton/teardown strategy.
  - Implemented: Ã¢ÂÅ’ Skipped (Ã°Å¸â€Â´ discarded)
    - Implementation Notes: Skipped Ã¢â‚¬â€ plan discarded; no evidence-backed teardown lifecycle beyond `beforeunload` to safely disconnect observers on reload.

- **F06** Ã¢â‚¬â€ Splitter drag lifecycle missing `pointercancel` Ã¢â‚¬â€ listeners can leak
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - Implemented: Ã¢Å“â€¦
    - Implementation Notes: Added `pointercancel` and `lostpointercapture` termination paths to splitter drag cleanup so listeners always detach and width persists.
    - **Ã°Å¸Å¸Â¥ MANUAL CHECK**: [ ] Start dragging the splitter, then alt-tab / open an OS overlay / trigger a gesture cancel; confirm the list is still resizable afterward and the final width persists after reload.

- **F07** Ã¢â‚¬â€ Toggling Activation Settings / Order Helper clears entry editor without dirty-state guard
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision Ã°Å¸Å¸Â¡
    - Reason: Fix plan is ambiguous (prompt vs refuse); should pick a single least-scope behavior (skip toggle when dirty) and keep dirty-guard behavior consistent with F02.
  - Implemented: Ã¢Å“â€¦
    - Implementation Notes: Added dirty guards to Activation Settings and Order Helper toggles, showing a toast and blocking mode switches that would discard unsaved edits.
    - **Ã°Å¸Å¸Â¥ MANUAL CHECK**: [ ] Type unsaved edits in an entry, click the gear/order toggle; confirm a toast appears and the editor content remains unchanged.

- **F08** Ã¢â‚¬â€ `addDrawer()` has no singleton guard Ã¢â‚¬â€ multiple inits duplicate UI and global listeners
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded Ã°Å¸â€Â´
    - Reason: Requires evidence of in-place reload + a concrete singleton registry/teardown strategy; "skip init" risks breaking `initDrawer()` consumers and fix risk is under-rated.
  - Implemented: Ã¢ÂÅ’ Skipped (Ã°Å¸â€Â´ discarded)
    - Implementation Notes: Skipped Ã¢â‚¬â€ plan discarded; safe idempotent init/teardown requires validated ST reload semantics and a concrete singleton/registry approach.

---

### `src/editorPanel.js`
-> `CodeReview_editorPanel.js.md`

- **F01** â€” Dirty tracking silently fails for entry UID `0` because of falsy checks
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** High â—â— â€” Direct data-loss path for entry UID 0; users can lose unsaved edits without warning.
  - Implemented:

- **F02** â€” `openEntryEditor()` marks the new entry clean before async load succeeds
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** High â—â— â€” Dirty-state desync can cause guards to fail, leading to data loss on abort.
  - Implemented:

- **F03** â€” Dirty state can remain permanently "dirty" after successful saves
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Medium â— â€” Users repeatedly blocked from Activation Settings/Order Helper despite having no unsaved changes.
  - Implemented:

- **F04** â€” Stale open abort can leave active-row highlight inconsistent with editor content
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Medium â— â€” Visual mismatch can lead to accidental edits on wrong entry.
  - Implemented:

- **F05** â€” `clearEntryHighlights()` scans every entry on every open/reset
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Medium â— â€” Performance issue; UI lag on large lorebooks.
  - Implemented:

- **F06** â€” Pointer-based dirty tracking marks non-editing UI interactions as unsaved edits
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Medium â— â€” False positives cause misleading warnings and blocked actions.
  - Implemented:

- **F07** â€” Editor-level event listeners are attached without a teardown path
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Low â­• â€” Best practice violation; listener leak only affects re-init scenarios.
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
Ã¢â€ â€™ `CodeReview_bookSourceLinks.js.md`

- **F01** Ã¢â‚¬â€ `cleanup()` does not unsubscribe `eventSource` listeners (leak / duplicate refresh on re-init)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - Implemented: âœ…
    - Implementation Notes: Added tracked event subscriptions and cleanup-time `eventSource.removeListener(...)` teardown for all source-link event handlers.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Reopen/reinitialize the drawer extension, then switch chats/characters and confirm source-link refresh events fire once per action.

- **F02** Ã¢â‚¬â€ `getBookSourceLinks()` fallback returns a different object shape than normal entries
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision Ã°Å¸Å¸Â¡
    - Reason: Impact/severity rationale is overstated; at least one current caller normalizes missing fields, so validate other call sites and adjust severity/justification accordingly.
  - Implemented: âœ…
    - Implementation Notes: Expanded the fallback object to full link shape and verified existing callers still normalize safely.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Open the book list with mixed source-linked and unlinked books and confirm source icons/tooltips render without missing text or errors.

- **F03** Ã¢â‚¬â€ Signature computation uses full `JSON.stringify(nextLinks)` (unnecessary churn + ordering sensitivity)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision Ã°Å¸Å¸Â¡
    - Reason: Performance/ordering instability claims are plausible but unproven; revise toward a minimal, lower-risk stabilization (e.g., canonicalize `characterNames` ordering) and avoid over-scoped signature refactor.
  - Implemented: âœ…
    - Implementation Notes: Added canonical source-link signature generation with sorted keys/names and kept refresh early-return behavior unchanged.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Trigger source-link refresh events (chat switch, character edit, settings update) and confirm icons/tooltips refresh when actual links change.

- **F04** Ã¢â‚¬â€ Direct imports from internal ST modules increase upstream breakage risk (prefer `getContext()` where possible)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision Ã°Å¸Å¸Â¡
    - Reason: Must include an explicit compatibility policy (minimum supported ST version) or a context-first fallback strategy; otherwise refactor can introduce host-version breakages.
  - Implemented: âœ…
    - Implementation Notes: Refactored to context-first runtime access with direct-import fallback strategy for compatibility across host versions.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Switch chats/groups/characters and verify source-link icons still update correctly with no console errors on your current SillyTavern version.

---

### `src/constants.js`
-> `CodeReview_constants.js.md`

- **F01** -- `SORT_DIRECTION` docstrings are incorrect/misaligned with actual meaning
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⭕ -- Documentation-only mismatch; leaving it unfixed mainly risks developer confusion.
  - Implemented: ✅
    - Implementation Notes: Corrected `SORT_DIRECTION` docstrings to describe ascending/descending semantics without changing runtime values.
    - **🟥 MANUAL CHECK**:
      - [ ] Open any sort menu and confirm sort direction behavior is unchanged.

- **F02** -- Recursion option values are duplicated across modules -- drift risk breaks filters/indicators
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Medium ❗ -- Duplication increases future drift risk that can break filter behavior/indicators in Order Helper.
  - Implemented: ✅
    - Implementation Notes: Replaced hardcoded recursion values in createOrderHelperState() with values derived from ORDER_HELPER_RECURSION_OPTIONS.
    - **🟥 MANUAL CHECK**:
      - [ ] Open Order Helper and verify Recursion filter options still show all three expected values and filter rows correctly.

- **F03** -- Column-schema "sync" is comment-only -- mismatch can silently break column visibility/persistence
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Step 1 plan is ambiguous about fallback policy and does not specify canonical schema key handling in state/hydration.
  - **Neglect Risk:** Medium ❗ -- Drift would silently degrade column visibility persistence, making preferences feel unreliable.
  - Implemented: ✅
    - Implementation Notes: Added schema/default mismatch validation, canonical default backfill for missing schema keys, and schema-key-only stored columns hydration.
    - **🟥 MANUAL CHECK**:
      - [ ] Open Order Helper, toggle several columns, reload the page, and confirm column visibility persists without console errors.

- **F04** -- Exported "constant" objects/arrays are mutable -- accidental mutation can cascade across UI
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded 🔴
    - Reason: Requires extensive analysis to validate absence of runtime mutation paths; freezing could introduce runtime exceptions.
  - **Neglect Risk:** Low ⭕ -- No evidence of current mutation; risk is mostly hypothetical unless future code mutates shared schema.
  - Implemented: ❌ Skipped (🔴 discarded)
    - Implementation Notes: Skipped -- requires extensive analysis to prove no runtime mutation paths before introducing freezing behavior.

- **F05** -- `SORT` enum names overlap conceptually (TITLE vs ALPHABETICAL) -- increases future misuse risk
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision 🟡
    - Reason: Step 1 fix references UI label mapping without evidence the option is exposed, and misses the concrete doc mismatch vs `sortEntries()` behavior.
  - **Neglect Risk:** Low ⭕ -- Primarily a maintainability/docs clarity issue; limited immediate user impact.
  - Implemented: ✅
    - Implementation Notes: Updated `SORT.TITLE`/`SORT.ALPHABETICAL` docs and marked `ALPHABETICAL` as a legacy compatibility alias while keeping UI options unchanged.
    - **🟥 MANUAL CHECK**:
      - [ ] Open sort dropdowns and confirm the same options as before are shown (no new `ALPHABETICAL` option added).

---### `src/orderHelperRender.actionBar.js`
Ã¢â€ â€™ `CodeReview_orderHelperRender.actionBar.js.md`

- **F01** Ã¢â‚¬â€ Bulk-apply actions can throw if table DOM/cache is not ready (missing null guards)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** Medium Ã¢Ââ€” Ã¢â‚¬â€ Crash during bulk operations can disrupt user workflow and require drawer reopen.
  - Implemented: âœ…
    - Implementation Notes: Added safe tbody/entry guards for bulk apply handlers so invalid table/cache rows are skipped instead of throwing.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Open Order Helper, trigger a quick refresh, click bulk Apply buttons, and confirm there are no console errors and valid selected rows still update.

- **F02** Ã¢â‚¬â€ Outside-click listeners can leak if the component is removed while menus are open
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision Ã°Å¸Å¸Â¡
    - Reason: Needs research step to validate existing cleanup coverage via MULTISELECT_DROPDOWN_CLOSE_HANDLER and exact lifecycle before implementation.
  - **Neglect Risk:** Low Ã¢Â­â€¢ Ã¢â‚¬â€ Listener leak only affects repeated opens without page reload; speculative severity.
  - Implemented: âœ…
    - Implementation Notes: Added bulk-row cleanup plus renderer rerender cleanup invocation to always remove outlet outside-click listeners.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Open the outlet dropdown, switch Order Helper scope or rerender, and confirm no ghost outside-click behavior remains.

- **F03** Ã¢â‚¬â€ Bulk apply loops can freeze the UI on large tables (no yielding in hot loops)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan needs revision Ã°Å¸Å¸Â¡
    - Reason: Async yielding introduces behavioral changes (user interaction during gaps) that require button-disabling mitigation.
  - **Neglect Risk:** Low Ã¢Â­â€¢ Ã¢â‚¬â€ Performance-only issue; only affects users with large lorebooks and no data loss risk.
  - Implemented: âœ…
    - Implementation Notes: Refactored State/Strategy/Order bulk applies to precompute targets, lock Apply buttons, and yield every 200 rows.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Run State/Strategy/Order apply on a large entry list and confirm the button is temporarily disabled, the UI stays responsive, and final saved values are correct.

- **F04** Ã¢â‚¬â€ Direction radios are not grouped as radios (no `name`), risking inconsistent UI/accessibility
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** Low Ã¢Â­â€¢ Ã¢â‚¬â€ Accessibility/maintenance concern only; mouse behavior works correctly.
  - Implemented: âœ…
    - Implementation Notes: Grouped direction radios with a shared name and switched persistence to change handlers with native exclusivity.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Toggle Direction between up/down and reload; confirm the selected option persists and only one option can be selected at a time.

---

### `src/orderHelperRender.utils.js`
Ã¢â€ â€™ `CodeReview_orderHelperRender.utils.js.md`

- **F01** Ã¢â‚¬â€ `setTooltip()` can throw if `text` is not a string (missing type guard)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** Medium Ã¢Ââ€” Ã¢â‚¬â€ Can cause hard crashes if tooltip receives non-string values.
  - Implemented:

- **F02** Ã¢â‚¬â€ `wireMultiselectDropdown()` does not keep `aria-expanded` in sync with open/close state
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** Low Ã¢Â­â€¢ Ã¢â‚¬â€ Accessibility issue only; no functional impact.
  - Implemented:

- **F03** Ã¢â‚¬â€ Outside-click `document` listener can leak if a menu is removed while open (no teardown path)
  - Meta-reviewed: [X]
    - Verdict: Implementation plan discarded Ã°Å¸â€Â´
    - Reason: Finding contains a Ã°Å¸Å¡Â© flag requiring user input. Per meta-review rules, findings with Ã°Å¸Å¡Â© flags must be discarded.
  - **Neglect Risk:** Medium Ã¢Ââ€” Ã¢â‚¬â€ Listener leaks can accumulate over repeated Order Helper opens/rerenders, causing performance degradation.
  - Implemented:

---

### `src/orderHelperRender.tableBody.js`
Ã¢â€ â€™ `CodeReview_orderHelperRender.tableBody.js.md`

- **F01** Ã¢â‚¬â€ Concurrent `saveWorldInfo(..., true)` calls can persist stale snapshots (last-write-wins race)
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** High Ã¢Ââ€”Ã¢Ââ€” Ã¢â‚¬â€ Real data integrity risk; users can lose edits when making rapid changes in Order Helper.
  - Implemented:

- **F02** Ã¢â‚¬â€ `updateCustomOrderFromDom()` can throw on missing book/entry during refresh/desync
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** Medium Ã¢Ââ€” Ã¢â‚¬â€ Crash during concurrent updates can disrupt user workflow.
  - Implemented:

- **F03** Ã¢â‚¬â€ Comment link can render as the string "undefined" for entries without a comment
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** Low Ã¢Â­â€¢ Ã¢â‚¬â€ Cosmetic issue only; no data integrity or functionality impact.
  - Implemented:

---

### `src/orderHelperRender.filterPanel.js`
-> `CodeReview_orderHelperRender.filterPanel.js.md`

- **F01** — Script filter is read from localStorage but never persisted back
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - Implemented: ✅
    - Implementation Notes: Added debounced script-filter persistence and seeded default filter value to localStorage when missing.
    - **🟥 MANUAL CHECK**:
      - [ ] Type a custom script, close/reopen Order Helper (or reload), and confirm the same script text is restored.
  - **Neglect Risk:** Medium ❗ — Users can lose complex filter scripts, causing frustration and rework.

- **F02** — Missing null guards when resolving rows can throw during refresh/desync
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - Implemented: ✅
    - Implementation Notes: Added optional-chained row lookups and `if (!row) continue;` guards in both update loops.
    - **🟥 MANUAL CHECK**:
      - [ ] Run a script filter, then quickly change Order Helper scope to force rerender; confirm no console errors and visible rows still update.
  - **Neglect Risk:** Medium ❗ — Filter panel can crash during concurrent UI rebuilds, breaking the filtering feature.

- **F03** — In-flight async filter execution can apply stale results after filter panel is no longer active
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - Implemented: ✅
    - Implementation Notes: Added `isActive()` checks after compile and inside the per-entry execution loop to stop applying results when panel closes.
    - **🟥 MANUAL CHECK**:
      - [ ] Start a heavy script filter and close the panel quickly; confirm no further row-state changes are applied after close.
  - **Neglect Risk:** Low ⭕ — Edge case timing issue; users may see confusing background changes but no data loss.

- **F04** — Syntax highlighting runs on every keystroke and may cause input lag for long scripts
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - Implemented: ✅
    - Implementation Notes: Refactored highlight rendering into `updateHighlight()` and switched input updates to debounced highlighting.
    - **🟥 MANUAL CHECK**:
      - [ ] Paste/type a longer script quickly and confirm typing stays smooth while syntax highlighting remains aligned with the textarea content.
  - **Neglect Risk:** Low ⭕ — Performance issue only; depends on script size/device.
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
  - **Neglect Risk:** Low ⭕ — Already addressed in current code; no action needed.
  - Implemented:

- **F03** -- Multiple DOM scrapes for strategy/position lists can create inconsistent snapshots and unnecessary work
  - Meta-reviewed: [X]
    - Verdict: Ready to implement 🟢
    - Reason: N/A
  - **Neglect Risk:** Low ⭕ — Performance optimization; limited user-visible impact.
  - Implemented:

---

### `src/sortHelpers.js`
-> `CodeReview_sortHelpers.js.md`

- **F01** Ã¢â‚¬â€ Length sorting recomputes word counts inside the comparator, causing avoidable UI stalls
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** Low Ã¢Â­â€¢ Ã¢â‚¬â€ Performance optimization; impact depends on dataset size and is cosmetic when small.
  - Implemented:

- **F02** Ã¢â‚¬â€ Metadata parser drops valid per-book sort preferences when legacy data omits direction
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** Medium Ã¢Ââ€” Ã¢â‚¬â€ Users with legacy metadata lose per-book sort preferences without clear feedback.
  - Implemented:

---

### `src/utils.js`
-> `CodeReview_utils.js.md`

- **F01** -- `executeSlashCommand()` swallows failures, so callers cannot react or inform the user
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** Medium Ã¢Ââ€” Ã¢â‚¬â€ Silent failures confuse users when slash command actions (like STLO integration) don't work.
  - Implemented: âœ…
    - Implementation Notes: Updated slash command execution to return success/failure with parser/closure guards and updated STLO menu handling to keep the menu open on failure.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Disable or break STLO, click Configure STLO, and confirm the menu stays open and an error toast appears.
      - [ ] Restore STLO, click Configure STLO, and confirm the command succeeds and the menu closes.

- **F02** -- Direct internal import of `SlashCommandParser` is brittle across SillyTavern updates
  - Meta-reviewed: [X]
    - Verdict: Ready to implement Ã°Å¸Å¸Â¢
    - Reason: N/A
  - **Neglect Risk:** Medium Ã¢Ââ€” Ã¢â‚¬â€ Upcoming SillyTavern updates can break slash command functionality without warning.
  - Implemented: âœ…
    - Implementation Notes: Added global parser constructor discovery with try/catch fallback import and null normalization for controlled compatibility failures.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] On your current SillyTavern version, click Configure STLO and confirm there are no parser import/constructor errors in the console.

---

### `src/wiUpdateHandler.js`
-> `CodeReview_wiUpdateHandler.js.md`

- **F01** -- Failed update cycles can leave waiters hanging indefinitely
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** High â—â— â€” Real data-integrity risk; can deadlock UI flows waiting on update completion.
  - Implemented: âœ…
    - Implementation Notes: Wrapped `updateWIChange()` in `try/finally` with per-cycle deferred finalization so waiters always receive a finish signal.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Temporarily force an error during `updateWIChange()` (for example with a test throw), then create or edit a book and confirm follow-up UI actions do not wait forever.

- **F02** -- `fillEmptyTitlesWithKeywords()` forces a duplicate update pass for the same save
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Medium â— â€” Performance issue causing redundant UI work; no data integrity risk.
  - Implemented: âœ…
    - Implementation Notes: Removed the direct post-save `updateWIChange(name, data)` call so fill-empty-title reconciliation runs once via the standard `WORLDINFO_UPDATED` event path.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Run "Fill empty titles from keywords" on a book with empty titles and confirm titles update once with no duplicate `[UPDATE-WI]` pass for the same save.

- **F03** -- Event bus listeners are registered without a teardown path
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Medium â— â€” Listener leaks on re-init cause duplicate work and performance drift.
  - Implemented: âœ…
    - Implementation Notes: Added named world-info event handlers plus `cleanup()` teardown in `wiUpdateHandler`, and called `wiHandlerApi.cleanup?.()` in drawer teardown.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Reload/reinitialize the extension flow, then trigger a World Info save and settings change; confirm each handler runs once (no duplicate logs or duplicate list refresh behavior).

- **F04** -- Direct `script.js` imports bypass the stable context API
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Low â­• â€” Compatibility improvement; no runtime impact unless ST internal APIs change.
  - Implemented: âœ…
    - Implementation Notes: Migrated event bus access from direct `script.js` imports to `SillyTavern.getContext()` (`eventSource` + `eventTypes`/`event_types`) for listener wiring.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Open the drawer, save a lorebook entry, and change WI settings; confirm update and settings handlers still run on your current SillyTavern version.

---

### `src/worldEntry.js`
-> `CodeReview_worldEntry.js.md`

- **F01** -- Clicking status controls on the active row can re-open the editor and discard unsaved text
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** High â—â— â€” Direct unsaved-edit loss path on common interaction; users can lose typed content without warning.
  - Implemented:

- **F02** -- Rapid toggle/strategy changes can race and persist stale state out of order
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Medium â— â€” Race condition can cause user-visible state inconsistency where controls show one value but persisted state reverts.
  - Implemented:

- **F03** -- Save failures leave optimistic UI/cache mutations without rollback
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Medium â— â€” Failed saves leave confusing UI state; users may think changes were saved when they weren't.
  - Implemented:

- **F04** -- Missing template controls cause early return with a partially initialized, non-inserted row
  - Meta-reviewed: [X]
    - Verdict: Ready to implement ðŸŸ¢
    - Reason: N/A
  - **Neglect Risk:** Low â­• â€” Edge case failure mode; template availability is generally stable.
  - Implemented:

---

## Pipeline Queues

The live work queues have been moved to dedicated files:

| Stage | File |
| --- | --- |
| Pending first-pass review | [`QUEUE_REVIEW.md`](QUEUE_REVIEW.md) |
| Pending meta-review (step 2) | [`QUEUE_META_REVIEW.md`](QUEUE_META_REVIEW.md) |
| Pending implementation | [`QUEUE_IMPLEMENTATION.md`](QUEUE_IMPLEMENTATION.md) |



