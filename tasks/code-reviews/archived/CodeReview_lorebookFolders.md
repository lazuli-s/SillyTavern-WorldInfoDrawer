# CODE REVIEW FINDINGS: `src/lorebookFolders.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/lorebookFolders.js`
- **Helper files consulted:** `FEATURE_MAP.md`, `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`, `skills/st-js-best-practices/references/patterns.md`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Folder metadata key handling on lorebook metadata (`folder`), Folder registry persistence (`stwid--folder-registry`), Folder DOM creation (header, count, active toggle, collapse toggle), Folder context menu actions (rename, import into folder, export folder, delete folder), Create new book directly inside a folder, Set active/inactive state for all books in a folder

---

## F01: MutationObserver never disconnected — memory leak

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The code creates a watcher that monitors folder book counts but never stops watching when the folder is removed from the screen. This means the watcher continues running in the background even after the folder is gone, using up memory.

- **Category:** Performance

- **Location:**
  `src/lorebookFolders.js`, `createFolderDom` function (lines ~425-435)
  ```js
  const observer = new MutationObserver(()=>{
      updateFolderCount(count, books.childElementCount);
  });
  observer.observe(books, { childList: true });
  ```

- **Detailed Finding:**
  The `MutationObserver` is created and started watching the `books` container for child list changes. The observer reference is returned in the result object, but there is no mechanism to disconnect it when the folder DOM is destroyed. If folders are frequently created and destroyed (e.g., during list refreshes or navigation), this creates a memory leak as orphaned observers accumulate. The observer keeps a reference to the DOM node, preventing garbage collection.

- **Why it matters:**
  Over time, this can lead to increased memory usage and potential performance degradation, especially during heavy UI interactions where folders are recreated frequently.

- **Severity:** Medium ❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Return a cleanup function from `createFolderDom` that disconnects the observer, or provide a destroy method on the returned object. Call this cleanup when the folder DOM is being removed.

- **Proposed fix:**
  Add a `destroy()` method to the returned object that calls `observer.disconnect()`. Ensure callers invoke this when tearing down folder DOM.

- **Implementation Checklist:**
  - [ ] Add `destroy` method to the return object that calls `observer.disconnect()`
  - [ ] Update all call sites that create folder DOM to call `destroy()` when removing the folder
  - [ ] Verify no other resources need cleanup in the destroy method

- **Fix risk:** Low 🟢
  Adding a cleanup method is additive and doesn't change existing behavior. Callers can be updated incrementally.

- **Why it's safe to implement:**
  This is a pure addition to the API surface. Existing code will continue to work; only the memory leak will be fixed when callers are updated to use the cleanup.

- **Pros:**
  Prevents memory leaks, improves long-term performance, follows best practices for observer cleanup.

---

## F02: Import timeout too aggressive — may fail on slow systems

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When importing books into a folder, the code waits only 15 seconds for the import to complete. If the system is slow or the import file is large, it may timeout prematurely and fail even though the import is still in progress.

- **Category:** Race Condition

- **Location:**
  `src/lorebookFolders.js`, import handler in `createFolderDom` menu (lines ~295-305)
  ```js
  const hasUpdate = await Promise.race([
      updatePromise ? updatePromise.then(()=>true) : Promise.resolve(false),
      new Promise((resolve)=>setTimeout(()=>resolve(false), 15000)),
  ]);
  if (!hasUpdate) {
      console.warn(`[STWID] Folder import timed out waiting for WORLDINFO_UPDATED...`);
      toastr.warning('Import did not complete in time. No books were moved into the folder.');
      return;
  }
  ```

- **Detailed Finding:**
  The import flow races between a WORLDINFO_UPDATED event promise and a 15-second hard timeout. On slower systems, with large lorebooks, or when the browser is under heavy load, the import may take longer than 15 seconds. When this happens, the code aborts with a warning and doesn't move any books into the folder, even though the import may have succeeded in the background.

- **Why it matters:**
  Users on slower systems or importing large files may experience failed imports that appear to work (books are created) but don't get placed in the intended folder. This creates a confusing user experience and requires manual cleanup.

- **Severity:** Medium ❗

- **Confidence:** Medium 🤔

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Increase the timeout to a more generous value (e.g., 60 seconds) or make it configurable. Alternatively, provide a way for the user to manually retry the folder assignment if the timeout occurs.

- **Proposed fix:**
  Increase the timeout from 15000ms to 60000ms. Consider also checking if the expected books appeared even after timeout before giving up completely.

- **Implementation Checklist:**
  - [ ] Change timeout from 15000 to 60000 milliseconds
  - [ ] After timeout, check if expected books exist anyway before showing failure message
  - [ ] Consider adding a progress indicator for long imports

- **Fix risk:** Low 🟢
  Increasing a timeout is safe and only affects the worst-case wait time.

- **Why it's safe to implement:**
  This only affects how long the code waits; it doesn't change success conditions or failure handling.

- **Pros:**
  Reduces false-negative timeout failures, improves user experience on slower systems.

---

## F03: Repeated localStorage reads — inefficient registry access

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Functions that work with the folder registry read from localStorage every time they're called, even when multiple operations happen in sequence. This is slower than necessary.

- **Category:** Performance

- **Location:**
  `src/lorebookFolders.js`, `removeFolderName` function and others (lines ~140-150)
  ```js
  const removeFolderName = (folderName)=>{
      const normalized = normalizeFolderName(folderName);
      if (!normalized) return false;
      const registry = getFolderRegistry(); // reads localStorage
      const nextRegistry = registry.filter((entry)=>entry !== normalized);
      if (nextRegistry.length === registry.length) return false;
      saveFolderRegistry(nextRegistry);
      return true;
  };
  ```

- **Detailed Finding:**
  `getFolderRegistry()` reads from localStorage, normalizes, and returns the registry. Functions like `removeFolderName` call this for single operations. When batch operations occur (e.g., folder rename moving multiple books), the registry is read repeatedly. localStorage is synchronous but involves disk I/O in some browsers, making this pattern suboptimal.

- **Why it matters:**
  While not critical for small registries, this pattern could cause jank during batch operations with many folders. It's also unnecessary work when the registry is already in memory.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Cache the registry in memory and invalidate the cache on write. Alternatively, accept a registry parameter for batch operations to avoid repeated reads.

- **Proposed fix:**
  Add an in-memory cache for the folder registry with a dirty flag, or optimize batch operations to fetch the registry once and pass it through.

- **Implementation Checklist:**
  - [ ] Add module-level registry cache variable
  - [ ] Update `getFolderRegistry` to use cache when valid
  - [ ] Invalidate cache in `saveFolderRegistry`
  - [ ] Verify cache is cleared on module reload (development hot-reload)

- **Fix risk:** Medium 🟡
  Caching introduces state that must be properly invalidated. Risk of stale data if not handled correctly.

- **Why it's safe to implement:**
  The registry is only modified through this module's functions, so we control all write paths and can invalidate appropriately.

- **Pros:**
  Reduces localStorage I/O, improves performance during batch operations, cleaner architecture.

---

## F04: Event listeners not tracked for cleanup — best practice violation

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The folder DOM creation adds many click and change event handlers to buttons and toggles, but doesn't keep track of them for later cleanup. While browsers handle this when elements are removed, it's better to track them explicitly.

- **Category:** JS Best Practice (PERF-02)

- **Location:**
  `src/lorebookFolders.js`, `createFolderDom` function (multiple event listener attachments throughout)
  Example at lines ~355-370:
  ```js
  addButton.addEventListener('click', async(evt)=>{
      evt.preventDefault();
      evt.stopPropagation();
      if (!menuActions?.createBookInFolder) return;
      addButton.setAttribute('aria-busy', 'true');
      try {
          await menuActions.createBookInFolder(folderName);
      } finally {
          addButton.removeAttribute('aria-busy');
      }
  });
  ```

- **Detailed Finding:**
  The `createFolderDom` function attaches approximately 10+ event listeners to various DOM elements (click handlers for add button, menu trigger, active toggle, drag events, etc.). These listeners are not tracked in an array or registry for cleanup. While modern browsers clean up event listeners when DOM nodes are garbage collected, explicit cleanup is still a best practice (PERF-02) and helps prevent issues with hot-reloading during development.

- **Why it matters:**
  In development scenarios with hot reloading, or if the extension is disabled/enabled, orphaned listeners could accumulate. This is primarily a code quality issue but aligns with the project's stated best practices.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Track all event listeners in an array and provide a cleanup function that removes them. This pairs with F01's observer cleanup.

- **Proposed fix:**
  Create a listeners array, push all addEventListener calls to it with {element, type, handler} objects, and remove them in the destroy function.

- **Implementation Checklist:**
  - [ ] Create `listeners` array at start of `createFolderDom`
  - [ ] Wrap each `addEventListener` call to also track in the array
  - [ ] Add listener removal loop to the destroy function (from F01)

- **Fix risk:** Low 🟢
  This is additive tracking that doesn't change existing behavior.

- **Why it's safe to implement:**
  The cleanup only runs when explicitly called; existing code paths remain unchanged.

- **Pros:**
  Follows project best practices, enables clean module teardown, helps with development hot-reload.

---

## F05: Import partial match handling too conservative

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When importing books, if some but not all of the new books can be confidently identified as coming from the import, the code gives up and doesn't move any books into the folder. It could instead move the books it is confident about.

- **Category:** Data Integrity

- **Location:**
  `src/lorebookFolders.js`, import handler in `createFolderDom` (lines ~335-345)
  ```js
  if (expectedBookNames.length && attributedNames.length !== newNames.length) {
      toastr.warning('Import finished, but new books could not be confidently identified. No books were moved into the folder.');
      return;
  }
  ```

- **Detailed Finding:**
  The import logic filters new books to only those that can be attributed to the import (matching expected names or import prefixes). If there's any mismatch between expected and attributed counts, it aborts entirely. A more conservative approach would be to move the books that *can* be confidently attributed, leaving ambiguous ones for manual handling.

- **Why it matters:**
  Users may experience imports where most books are correctly identified but one ambiguous book causes the entire import to skip folder assignment. This requires manual work to organize the books.

- **Severity:** Low ⭕

- **Confidence:** Medium 🤔

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Instead of aborting when counts don't match, proceed with the books that could be attributed and warn about the ambiguous ones.

- **Proposed fix:**
  Remove the early return and proceed with `attributedNames` even if it's a subset. Add a warning message listing which books weren't moved.

- **Implementation Checklist:**
  - [ ] Remove the `return` statement when counts mismatch
  - [ ] Add logic to show which books were moved vs. skipped
  - [ ] Update warning message to be more specific about partial success

- **Fix risk:** Low 🟢
  This makes the code more permissive, not less. Books that would have been skipped will now be moved.

- **Why it's safe to implement:**
  The attribution logic is already conservative (only moving books with strong evidence). Partial matches are still safe to process.

- **Pros:**
  Better user experience, less manual cleanup needed after imports, more resilient import handling.