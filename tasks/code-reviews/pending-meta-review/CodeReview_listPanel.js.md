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

- **Implementation Checklist:**
  - [ ] Wrap `loadWorldInfo` call in `setBookSortPreference` with try/catch
  - [ ] Wrap `saveWorldInfo` call in `setBookSortPreference` with try/catch
  - [ ] Wrap `loadWorldInfo` and `saveWorldInfo` calls in `setBookFolder` with try/catch
  - [ ] Add try/catch in `clearBookSortPreferences` loop to continue on individual failures
  - [ ] Add try/catch in `applyBookFolderChange` around the `setBookFolder` call
  - [ ] Return structured result objects instead of boolean/void
  - [ ] Add `toastr.error()` notifications for user-visible failures

- **Fix risk:** Low 🟢
  Adding error handling doesn't change success paths; only adds failure handling that currently doesn't exist.

- **Why it's safe to implement:**
  All changes are additive error handling. No existing success-path behavior is modified.

- **Pros:**
  Users receive feedback when operations fail; extension can gracefully degrade instead of hanging.

<!-- META-REVIEW: STEP 2 will be inserted here -->

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

- **Implementation Checklist:**
  - [ ] Add `world.dom.root?.isConnected` check to `hasSortableBookDom` function
  - [ ] Alternatively, add the check inline before `sortEntriesIfNeeded` call in `setBookSortPreference`

- **Fix risk:** Low 🟢
  Simple validation check that prevents operations on detached DOM.

- **Why it's safe to implement:**
  Only adds a guard condition; doesn't change the sort logic itself.

- **Pros:**
  Prevents operating on stale DOM elements after refresh cycles.

<!-- META-REVIEW: STEP 2 will be inserted here -->

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

- **Implementation Checklist:**
  - [ ] Add `isConnected` check to `applyCollapseState` validation

- **Fix risk:** Low 🟢
  Trivial guard condition addition.

- **Why it's safe to implement:**
  Only prevents operations on detached elements; doesn't affect attached elements.

- **Pros:**
  Cleaner separation between cached state and actual DOM; prevents unnecessary operations.

<!-- META-REVIEW: STEP 2 will be inserted here -->

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

- **Implementation Checklist:**
  - [ ] Refactor `refreshList` to use cleaner synchronization pattern
  - [ ] Consider replacing token pattern with `isRefreshing` flag + queue

- **Fix risk:** Medium 🟡
  Changes core refresh coordination logic; requires careful testing.

- **Why it's safe to implement:**
  The current code works in practice; this is a code quality improvement.

- **Pros:**
  Simpler code, easier to reason about, eliminates theoretical race window.

<!-- META-REVIEW: STEP 2 will be inserted here -->