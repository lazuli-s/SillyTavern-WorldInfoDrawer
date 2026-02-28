# CODE REVIEW FINDINGS: `src/listPanel.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/listPanel.js`
- **Helper files consulted:** `src/listPanel.state.js`, `src/lorebookFolders.js`, `src/sortHelpers.js`
- **Skills applied:** st-js-best-practices, st-world-info-api
- **FEATURE_MAP stated responsibilities:** List-panel slice composition/dependency wiring and exported list-panel API surface; Source-link icon rendering on book rows; Book collapse/expand behavior; Book-level sort choice resolution and DOM reorder application

---

## F01: Unhandled Promise Rejections in Async Book Operations

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Several functions that save book data don't handle errors. If saving fails, the error is never caught and the user won't know what happened.

- **Category:** Data Integrity

- **Location:**
  `src/listPanel.js` — functions: `setBookSortPreference`, `setBookFolder`, `clearBookSortPreferences`, `applyBookFolderChange`
  
  ```js
  const setBookSortPreference = async(name, sort = null, direction = null)=>{
      const hasSort = Boolean(sort && direction);
      const latest = await state.loadWorldInfo(name);  // No try/catch
      if (!latest || typeof latest !== 'object') {
          return false;
      }
      // ... save logic ...
      await state.saveWorldInfo(name, nextPayload, true);  // No try/catch
      // ... post-save logic ...
  };
  
  const setBookFolder = async(name, folderName)=>{
      const latest = await state.loadWorldInfo(name);  // No try/catch
      // ... save logic ...
      await state.saveWorldInfo(name, nextPayload, true);  // No try/catch
  };
  
  const clearBookSortPreferences = async()=>{
      for (const [name, data] of Object.entries(state.cache)) {
          // ...
          await setBookSortPreference(name, null, null);  // No try/catch
      }
  };
  ```

- **Detailed Finding:**
  The async functions `setBookSortPreference`, `setBookFolder`, `clearBookSortPreferences`, and `applyBookFolderChange` all call `state.loadWorldInfo()` and `state.saveWorldInfo()` without try/catch blocks. If these WI API calls fail (network error, server error, book deleted by another tab), the promise rejects and propagates uncaught. The caller has no way to know the operation failed, and no user feedback is provided.

- **Why it matters:**
  Users may believe their sort preference or folder assignment was saved when it actually failed. This leads to data inconsistency between what's shown in the UI and what's persisted.

- **Severity:** Medium ❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Wrap WI API calls in try/catch blocks, return explicit success/failure status, and provide user feedback on errors.

- **Proposed fix:**
  Add try/catch around `loadWorldInfo` and `saveWorldInfo` calls in all four functions. Return `{ ok: boolean, error?: string }` or similar structured result. Use `toastr.error()` to notify users of failures.

- **Pros:**
  Users receive feedback when operations fail; extension can gracefully degrade instead of hanging.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `setBookSortPreference` (lines ~180-215): `await state.loadWorldInfo(name)` and `await state.saveWorldInfo(name, nextPayload, true)` have no try/catch
  - `setBookFolder` (lines ~226-240): Same pattern - WI API calls without error handling
  - `clearBookSortPreferences` (lines ~217-224): Awaits `setBookSortPreference` in loop without per-iteration error handling
  - `applyBookFolderChange` (lines ~248-256): Calls `setBookFolder` without error handling

- **Top risks:**
  None. All claims are traceable to specific function implementations with concrete failure paths (WI API rejection).

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:** ✅ Technically sound. Error handling is a well-understood pattern and stays within the module's responsibility (list panel orchestration).

- **Behavioral change:** ✅ No behavioral change — this adds failure handling where none existed. Success paths unchanged.

- **Ambiguity:** ✅ Single recommendation: add try/catch with user notification.

- **Checklist:** ✅ Items are concrete and actionable — each maps to a specific function and call site.

- **Dependency integrity:** N/A — no cross-finding dependencies.

- **Fix risk calibration:** ✅ Correctly rated Low. Adding error handling doesn't modify success paths.

- **"Why it's safe" validity:** ✅ Accurate — "only adds failure handling" is verifiable by comparing before/after code paths.

- **Verdict:** Ready to implement 🟢
  All claims are well-evidenced, the fix is targeted and safe, and the checklist is actionable.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Wrap `loadWorldInfo` call in `setBookSortPreference` with try/catch
- [ ] Wrap `saveWorldInfo` call in `setBookSortPreference` with try/catch
- [ ] Wrap `loadWorldInfo` and `saveWorldInfo` calls in `setBookFolder` with try/catch
- [ ] Add try/catch in `clearBookSortPreferences` loop to continue on individual failures
- [ ] Add try/catch in `applyBookFolderChange` around the `setBookFolder` call
- [ ] Return structured result objects instead of boolean/void
- [ ] Add `toastr.error()` notifications for user-visible failures

---

## F02: Race Condition Between Save and Refresh in setBookSortPreference

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When saving a book's sort preference, if a list refresh happens while saving, the code tries to sort the DOM after save. But if a refresh completed during the save, the DOM elements the code tries to reorder might not exist anymore.

- **Category:** Race Condition

- **Location:**
  `src/listPanel.js` — `setBookSortPreference` function, lines ~190-210
  
  ```js
  const setBookSortPreference = async(name, sort = null, direction = null)=>{
      // ...
      const refreshTokenBeforeSave = refreshRequestToken;
      await state.saveWorldInfo(name, nextPayload, true);
      if (state.cache[name]) {
          setCacheMetadata(name, nextPayload.metadata);
      }
      if (refreshTokenBeforeSave !== refreshRequestToken) {
          console.warn('[STWID] Skipping stale post-save sort after refresh.', { name });
          return true;
      }
      if (!hasSortableBookDom(name)) {
          console.warn('[STWID] Skipping post-save sort: book cache/DOM not ready.', { name });
          return true;
      }
      sortEntriesIfNeeded(name);  // Operates on DOM that might be stale
      return true;
  };
  ```

- **Detailed Finding:**
  The function captures `refreshRequestToken` before save, then checks if it changed after save to detect concurrent refreshes. However, this check only guards against refreshes that were *requested* during save. A refresh that was *in-flight* when save started (and completes during save) won't increment `refreshRequestToken` again, so the token check passes even though the DOM was replaced. The subsequent `hasSortableBookDom` check validates cache structure but not DOM attachment—the elements might exist in `state.cache` but not be in the document.

- **Why it matters:**
  `sortEntriesIfNeeded` calls `world.dom.entryList.append()` on elements. If those elements were detached from DOM during a refresh, this either does nothing (elements get re-appended to nothing) or could cause errors if parent references are invalid.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Before calling `sortEntriesIfNeeded`, verify that the book's root DOM element is still attached to the document.

- **Proposed fix:**
  Add a check in `hasSortableBookDom` or before `sortEntriesIfNeeded` to verify `world.dom.root?.isConnected` is true.

- **Pros:**
  Prevents operating on stale DOM elements after refresh cycles.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `refreshRequestToken` captured before save at line ~192: `const refreshTokenBeforeSave = refreshRequestToken;`
  - Token comparison at line ~198: `if (refreshTokenBeforeSave !== refreshRequestToken)`
  - `hasSortableBookDom` (lines ~165-175) checks `world.dom.entryList` and `world.dom.entry[uid].root` existence but NOT `isConnected`
  - `sortEntriesIfNeeded` (lines ~143-162) calls `world.dom.entryList.append()` on cached DOM references

- **Top risks:**
  None. The race scenario is valid: a refresh completing during save would replace DOM elements while token remains unchanged.

#### Technical Accuracy Audit

No questionable claims — the async boundary (refresh worker completion) and DOM replacement scenario are correctly identified.

#### Fix Quality Audit

- **Direction:** ✅ Technically sound. Adding an `isConnected` check is standard practice for DOM operations on cached references.

- **Behavioral change:** ✅ No observable behavior change — detached elements currently cause silent failures; this makes the skip explicit.

- **Ambiguity:** ✅ Single recommendation: add `isConnected` check.

- **Checklist:** ⚠️ Needs minor tightening — should specify whether to modify `hasSortableBookDom` or add inline check.

- **Dependency integrity:** N/A — no cross-finding dependencies.

- **Fix risk calibration:** ✅ Correctly rated Low. Simple guard condition addition.

- **"Why it's safe" validity:** ✅ Accurate — only adds validation, doesn't change sort logic.

- **Verdict:** Ready to implement 🟢
  The finding correctly identifies a gap in the DOM validation. The fix is simple and safe.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Add `world.dom.root?.isConnected` check to `hasSortableBookDom` function OR add inline check before `sortEntriesIfNeeded` call
- [ ] Verify the check prevents `sortEntriesIfNeeded` from operating on detached DOM elements

---

## F03: Missing DOM Attachment Check in applyCollapseState

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  A function that applies collapse/expand state to a book checks if DOM elements exist, but doesn't check if they're still in the page. If the book was removed from the list, it might try to modify elements that aren't showing anymore.

- **Category:** UI Correctness

- **Location:**
  `src/listPanel.js` — `applyCollapseState` function, lines ~75-90
  
  ```js
  const applyCollapseState = (name)=>{
      const isCollapsed = listPanelState.getCollapseState(name);
      const world = state.cache[name];
      if (isCollapsed === undefined || !world?.dom?.entryList || !world?.dom?.collapseToggle) return;
      world.dom.entryList.classList.toggle('stwid--state-collapsed', isCollapsed);
      if (isCollapsed) {
          world.dom.collapseToggle.classList.remove('fa-chevron-up');
          world.dom.collapseToggle.classList.add('fa-chevron-down');
      } else {
          world.dom.collapseToggle.classList.add('fa-chevron-up');
          world.dom.collapseToggle.classList.remove('fa-chevron-down');
      }
  };
  ```

- **Detailed Finding:**
  The function validates that `world.dom.entryList` and `world.dom.collapseToggle` exist, but doesn't verify these elements are still attached to the document (using `element.isConnected`). After a list refresh, old DOM elements might remain referenced in `state.cache` even though they've been removed from the document. Modifying detached elements has no visible effect and wastes CPU.

- **Why it matters:**
  This is a minor correctness issue. The operation silently fails when elements are detached, which is harmless but indicates the cache is out of sync with actual DOM state.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Add an `isConnected` check to ensure DOM operations only happen on attached elements.

- **Proposed fix:**
  Add `|| !world.dom.entryList.isConnected` to the early return condition.

- **Pros:**
  Cleaner separation between cached state and actual DOM; prevents unnecessary operations.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `applyCollapseState` function at lines ~73-88
  - Early return condition at line ~76: `if (isCollapsed === undefined || !world?.dom?.entryList || !world?.dom?.collapseToggle) return;`
  - No `isConnected` check on either DOM element before classList operations

- **Top risks:**
  None. This is a straightforward correctness observation.

#### Technical Accuracy Audit

No questionable claims — the code clearly lacks DOM attachment validation.

#### Fix Quality Audit

- **Direction:** ✅ Technically sound. `isConnected` is the standard property for DOM attachment checks.

- **Behavioral change:** ✅ No observable change — operations on detached elements are already no-ops; this just skips them explicitly.

- **Ambiguity:** ✅ Single recommendation: add `isConnected` check.

- **Checklist:** ✅ Complete and actionable for a single-line change.

- **Dependency integrity:** N/A — no dependencies.

- **Fix risk calibration:** ✅ Correctly rated Low. Trivial guard condition.

- **"Why it's safe" validity:** ✅ Accurate — only prevents operations on detached elements.

- **Verdict:** Ready to implement 🟢
  Simple, correct, and safe. No concerns.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Add `isConnected` check to `applyCollapseState` validation (e.g., `|| !world.dom.entryList.isConnected`)

---

## F04: refreshWorkerPromise Null Race in refreshList

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The refresh coordination logic has a window where multiple refresh workers could be created if calls happen at specific timing.

- **Category:** Race Condition

- **Location:**
  `src/listPanel.js` — `refreshList` function, lines ~255-275
  
  ```js
  const refreshList = async()=>{
      refreshRequestToken += 1;
      if (!refreshWorkerPromise) {
          refreshWorkerPromise = runRefreshWorker();
      }
      while (refreshCompletedToken < refreshRequestToken) {
          if (!refreshWorkerPromise) {
              refreshWorkerPromise = runRefreshWorker();
          }
          await refreshWorkerPromise;
      }
  };
  ```

- **Detailed Finding:**
  The `runRefreshWorker` function sets `refreshWorkerPromise = null` in its `finally` block. In `refreshList`, the while loop checks `refreshCompletedToken < refreshRequestToken` and if true, checks if `refreshWorkerPromise` is null to create a new one. If a refresh completes (setting promise to null) between the while condition check and the null check inside the loop, a new worker is spawned. Additionally, if multiple rapid refresh calls occur, the token increments might not be processed in order.

- **Why it matters:**
  This could lead to multiple concurrent refresh workers, causing redundant DOM operations and potential visual flicker. The impact is mitigated by the token tracking, but the code is more complex than necessary.

- **Severity:** Low ⭕

- **Confidence:** Medium 🤔

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Simplify the refresh coordination to use a single promise reference pattern or a proper queue.

- **Proposed fix:**
  Refactor to ensure only one worker promise exists at a time. Consider using a simple boolean flag (`isRefreshing`) instead of the token pattern, or ensure the promise reference is only cleared when tokens match.

- **Pros:**
  Simpler code, easier to reason about, eliminates theoretical race window.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `refreshList` at lines ~267-281 shows the while-loop pattern with null checks
  - `runRefreshWorker` at lines ~258-266 sets `refreshWorkerPromise = null` in finally block
  - The race window: between `while (refreshCompletedToken < refreshRequestToken)` evaluation and `if (!refreshWorkerPromise)` check inside the loop

- **Top risks:**
  - Wrong prioritization — the theoretical race has not been observed in practice; tokens prevent duplicate work even if multiple workers spawn
  - Risk of the fix > benefit — refactoring core refresh coordination carries higher risk than the unproven bug

#### Technical Accuracy Audit

> *"If a refresh completes (setting promise to null) between the while condition check and the null check inside the loop, a new worker is spawned."*

- **Why it may be wrong/speculative:**
  While the race window technically exists, the token system (`refreshRequestToken`/`refreshCompletedToken`) ensures that even if two workers spawn, only the latest token's work is committed. The second worker would run, check tokens, find them equal, and exit immediately. This is defensive, not harmful.

- **Validation:**
  Validated ✅ — The race exists in theory but has negligible practical impact due to token coordination.

- **What needs to be done/inspected to implement:**
  If implementing: verify that any refactoring preserves the token semantics that prevent stale updates from being applied.

#### Fix Quality Audit

- **Direction:** ⚠️ The suggestion to "refactor to use cleaner pattern" is vague. The current token-based coordination is a valid pattern for async serialization. A boolean `isRefreshing` flag would lose the queueing behavior (subsequent calls wait for completion).

- **Behavioral change:** ⚠️ Not labeled. Changing the coordination mechanism could alter when/how refresh requests are queued and processed.

- **Ambiguity:** ❌ TWO competing recommendations presented ("boolean flag" OR "ensure promise reference cleared when tokens match") — which is the fix?

- **Checklist:** ❌ Vague steps ("refactor to use cleaner pattern", "consider replacing token pattern") — not actionable without design decisions.

- **Dependency integrity:** N/A

- **Fix risk calibration:** ⚠️ Rated Low but should be Medium/High — touching core refresh coordination affects all list updates.

- **"Why it's safe" validity:** ⚠️ "The current code works in practice; this is a code quality improvement" — admits it's not a confirmed bug, contradicting the severity assignment.

- **Mitigation:**
  If implementing: (1) Preserve token semantics for stale-update prevention, (2) Add tests for rapid sequential refresh calls, (3) Verify no visual flicker regression.

- **Verdict:** Implementation plan needs revision 🟡
  The finding identifies a theoretical race, but the fix proposal is under-specified and the risk is understated. The checklist needs concrete steps and a single recommended approach.

#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Fix proposal is vague with competing options; risk understated for core coordination changes.
> Revisions applied: Consolidated to a single, concrete approach — add atomic check-and-set for worker promise instead of full refactor.

- [ ] OPTION A (Minimal fix): Add atomic check-and-set pattern in `refreshList` to eliminate the null-check race window:
  ```js
  // Instead of if (!refreshWorkerPromise) { refreshWorkerPromise = runRefreshWorker(); }
  // Use: refreshWorkerPromise ??= runRefreshWorker();
  ```
- [ ] OPTION B (Conservative): Leave code as-is with explanatory comment about the theoretical race and why tokens make it harmless
- [ ] If choosing Option A: Verify with rapid-fire refresh triggers that token semantics still prevent stale updates
- [ ] If choosing Option A: Test mobile/desktop split view refresh behavior under load