# CODE REVIEW FINDINGS: `src/lorebookFolders.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/lorebookFolders.js`
- **Helper files consulted:** `ARCHITECTURE.md`, `FEATURE_MAP.md`, `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`, `skills/st-js-best-practices/references/patterns.md`, `skills/st-world-info-api/references/wi-api.md`
- **Skills applied:** `st-js-best-practices`, `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Folder metadata key handling on lorebook metadata, folder registry persistence, folder DOM creation, folder collapse state persistence, folder visibility refresh, folder active-toggle tri-state refresh, folder context menu actions, create new book directly inside a folder, set active/inactive state for all books in a folder

---

## F01: Import Attribution Logic May Block Valid Partial Imports

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When importing books into a folder, the code tries to identify which books came from the import by matching names. If some books match but not all, it cancels the entire move operation with a warning — even though the matching books could safely be moved into the folder.

- **Category:** UI Correctness

- **Location:**
  `src/lorebookFolders.js`, `createFolderDom` function, import menu item click handler (~line 332-393)

- **Detailed Finding:**
  The import flow uses `expectedBookNames` (from the JSON file) to identify which new books belong to this import. After the import completes, it filters `newNames` (books that appeared) against `expectedBookNames` and import prefixes to produce `attributedNames`.

  The blocking check at line 381:
  ```javascript
  if (expectedBookNames.length && attributedNames.length !== newNames.length) {
      toastr.warning('Import finished, but new books could not be confidently identified. No books were moved into the folder.');
      return;
  }
  ```

  This check is too strict. If the import file lists 3 books but only 2 match (perhaps one was renamed differently, or one already existed and wasn't imported), the condition fails and ALL books are left unmoved — even the 2 that were correctly identified.

  The intent is to be conservative and avoid mis-assigning books. However, the code already filters conservatively using `expectedBookNames.includes(name) || importPrefixes.some(...)`. The length check adds an unnecessary all-or-nothing constraint that creates a poor user experience when imports partially succeed.

- **Why it matters:**
  Users may import files where some books already exist (and aren't re-imported) or where naming doesn't match the expected pattern. In these cases, the valid new books should still be moved into the folder. The current behavior forces users to manually move books even when the extension correctly identified which ones were imported.

- **Severity:** Medium ❗

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Remove or relax the strict length-equality check. Instead, move only the books that could be confidently attributed, and show an informational toast if some books couldn't be matched.

- **Proposed fix:**
  Change the blocking condition to allow partial attribution. If `attributedNames.length > 0`, proceed to move those books. If `attributedNames.length < newNames.length`, show an additional informational toast listing the unmatched books.

- **Fix risk:** Low 🟢
  This changes only the success condition for partial matches. The conservative attribution logic (matching by exact name or import prefix) remains unchanged, so the risk of mis-assigning books is not increased.

- **Why it's safe to implement:**
  The attribution matching logic itself is not changed — only the decision of whether to proceed with partial matches. The existing safeguards (prefix matching, empty-check) remain in place.

- **Pros:**
  Better user experience for partial imports; users won't need to manually move books that were correctly identified.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The strict length check at line 381 blocks partial imports: `if (expectedBookNames.length && attributedNames.length !== newNames.length)`
  - The attribution logic uses `expectedBookNames.includes(name) || importPrefixes.some(...)` which correctly identifies matching books
  - The code path is traceable: import completes → newNames detected → attribution filtering → strict length check → potential cancellation

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:** Sound. Relaxing the length check allows partial matches without changing the attribution logic.
- **Behavioral change:** Yes — partial imports will now succeed instead of failing completely. This is a positive behavioral change.
- **Ambiguity:** Single clear recommendation — replace the strict length check with a check for zero attributed names.
- **Checklist:** Complete and actionable. Steps are specific and verifiable.
- **Dependency integrity:** No dependencies on other findings.
- **Fix risk calibration:** Accurately rated Low. Only affects the success condition, not the attribution logic.
- **"Why it's safe" validity:** Valid. The attribution matching logic is unchanged; only the decision threshold is relaxed.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Replace the strict length check with a check that allows partial matches (e.g., `if (attributedNames.length === 0)` instead of `if (attributedNames.length !== newNames.length)`)
- [x] Add logic to compute `unmatchedNames = newNames.filter(name => !attributedNames.includes(name))`
- [x] Update the warning toast to indicate partial completion: "Moved N books to folder. Could not identify: [list]"
- [x] Ensure the flow still guards against the case where `attributedNames` is empty (no confident matches)

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/lorebookFolders.js`
  - Replaced the all-or-nothing attribution check with a zero-match guard (`if (!attributedNames.length)`).
  - Added `unmatchedNames` computation and an informational toast when only part of the imported books can be confidently identified.
  - Kept the conservative attribution logic intact (exact expected names or imported-name prefixes), and still blocks auto-move when there are no confident matches.

- [x] Replace the strict length check with a check that allows partial matches (e.g., `if (attributedNames.length === 0)` instead of `if (attributedNames.length !== newNames.length)`)
- [x] Add logic to compute `unmatchedNames = newNames.filter(name => !attributedNames.includes(name))`
- [x] Update the warning toast to indicate partial completion: "Moved N books to folder. Could not identify: [list]"
- [x] Ensure the flow still guards against the case where `attributedNames` is empty (no confident matches)

---

## F02: Drag State Change Callback Called on Every dragover Event

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When dragging a book over a folder, a callback function is triggered repeatedly (potentially hundreds of times per second), which could slow down the browser during drag operations.

- **Category:** Performance

- **Location:**
  `src/lorebookFolders.js`, `createFolderDom` function, dragover event handler (~line 412-420)

- **Detailed Finding:**
  The `dragover` event fires continuously as the dragged item moves over the drop target. The current handler:
  ```javascript
  header.addEventListener('dragover', (evt)=>{
      if (!onDrop) return;
      const allowDrop = onDragStateChange?.(true, evt) ?? true;
      if (!allowDrop) return;
      evt.preventDefault();
      root.classList.add('stwid--state-target');
  });
  ```

  This calls `onDragStateChange?.(true, evt)` on every `dragover` event — potentially 60+ times per second during a drag operation. If the callback performs any non-trivial work (state updates, DOM queries), this creates unnecessary CPU load.

  The callback is used to signal "drag started / drag ended" state changes, but it's being invoked as a continuous "drag is happening" notification. This is semantically incorrect — the callback should only fire when the drag state actually changes (entering vs leaving).

- **Why it matters:**
  During drag operations, excessive callback invocations can cause frame drops, making the UI feel sluggish. If `onDragStateChange` triggers React-style re-renders or DOM updates elsewhere, the performance impact multiplies.

- **Severity:** Low ⭕

- **Confidence:** Medium 🤔
  The performance impact depends on what `onDragStateChange` actually does at runtime. If it's a simple no-op or state flag setter, the impact is minimal. If it triggers expensive operations, this could be a real performance issue.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Debounce or throttle the `onDragStateChange` callback, or move the state-change notification to `dragenter` instead of `dragover`.

- **Proposed fix:**
  Add a simple guard to only call `onDragStateChange` once per drag session:
  ```javascript
  let isDragOver = false;
  header.addEventListener('dragover', (evt)=>{
      if (!onDrop) return;
      if (!isDragOver) {
          isDragOver = true;
          const allowDrop = onDragStateChange?.(true, evt) ?? true;
          if (!allowDrop) return;
      }
      evt.preventDefault();
      root.classList.add('stwid--state-target');
  });
  header.addEventListener('dragleave', (evt)=>{
      // ... reset isDragOver = false when appropriate
  });
  ```

  Alternatively, check if `root.classList.contains('stwid--state-target')` is already set before calling the callback.

- **Fix risk:** Low 🟢
  This is a performance optimization that doesn't change the callback contract — it just reduces the call frequency. The behavior remains the same; only the performance improves.

- **Why it's safe to implement:**
  The callback is still invoked with the same arguments and at the appropriate times (when drag starts/ends). The only difference is that it's not invoked repeatedly during the drag.

- **Pros:**
  Reduced CPU usage during drag operations; smoother UI performance.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - The `dragover` handler at lines 412-420 calls `onDragStateChange?.(true, evt)` unconditionally on every event
  - The `dragover` event fires continuously during drag operations (60+ times/second)
  - The callback contract is for state change notifications, not continuous updates

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:** Sound. Adding a guard to prevent redundant callback invocations is the correct approach.
- **Behavioral change:** No — the callback is still invoked at the correct lifecycle points (drag start/end), just not repeatedly during the drag.
- **Ambiguity:** Two alternatives presented (guard variable vs classList check). The guard variable approach is cleaner and should be the primary recommendation.
- **Checklist:** Complete and actionable. Steps are specific and verifiable.
- **Dependency integrity:** No dependencies on other findings.
- **Fix risk calibration:** Accurately rated Low. This is a defensive optimization with no functional changes.
- **"Why it's safe" validity:** Valid. The callback contract is preserved; only the invocation frequency changes.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Track drag-over state locally in the event handler
- [x] Only call `onDragStateChange(true, evt)` on the first `dragover` after `dragleave` or initial entry
- [x] Ensure `onDragStateChange(false, evt)` is still called appropriately on `dragleave`

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/lorebookFolders.js`
  - Added local drag target state (`isDropTargetActive`) so `onDragStateChange(true, evt)` runs only once per active drag-over session.
  - Added shared cleanup (`clearDropTargetState`) used by both `dragleave` and `drop` to clear UI state and emit `onDragStateChange(false, evt)` once.

- [x] Track drag-over state locally in the event handler
- [x] Only call `onDragStateChange(true, evt)` on the first `dragover` after `dragleave` or initial entry
- [x] Ensure `onDragStateChange(false, evt)` is still called appropriately on `dragleave`

---

## F03: Folder Registry Updated Before Confirming Book Moves During Rename

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When renaming a folder, the code adds the new folder name to the registry before confirming that any books were successfully moved to it. If all moves fail, the new folder name remains in the registry even though no books are using it.

- **Category:** Data Integrity

- **Location:**
  `src/lorebookFolders.js`, `createFolderDom` function, rename menu item click handler (~line 269-304)

- **Detailed Finding:**
  In the rename flow:
  ```javascript
  const targetFolderExisted = getFolderRegistry().includes(normalized);
  registerFolderName(normalized);  // <-- Registry updated here
  const bookNames = getFolderBookNames(menuActions.cache, folderName);
  const failedBookNames = [];
  for (const bookName of bookNames) {
      // ... attempt to move each book ...
  }
  if (!failedBookNames.length) {
      removeFolderName(folderName);
  } else {
      const movedCount = Math.max(bookNames.length - failedBookNames.length, 0);
      if (movedCount === 0 && !targetFolderExisted) {
          removeFolderName(normalized);  // <-- Only removed if no books moved AND folder didn't exist
      }
      // ...
  }
  ```

  The new folder name is registered before any books are moved. If all moves fail (`movedCount === 0`), the code does remove the new folder name — but only if `targetFolderExisted` was false. If the target folder already existed (perhaps the user is merging into an existing folder), the registry is left with a folder name that may have no books.

  More importantly, the registry should reflect the actual state of folders in use. Registering the folder before confirming any successful moves creates a window where the registry claims a folder exists that has no books assigned to it.

- **Why it matters:**
  The folder registry is used to populate the folder list UI. A folder with no books appears in the UI but is empty, confusing users. While this is cleaned up on next load (via `normalizeRegistry`), it's still a temporary inconsistency that could affect other operations during the rename.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Move the `registerFolderName(normalized)` call to after the loop, only registering if at least one book was successfully moved.

- **Proposed fix:**
  ```javascript
  // ... rename dialog and validation ...
  const targetFolderExisted = getFolderRegistry().includes(normalized);
  const bookNames = getFolderBookNames(menuActions.cache, folderName);
  const failedBookNames = [];
  for (const bookName of bookNames) {
      // ... attempt to move each book ...
  }
  const movedCount = Math.max(bookNames.length - failedBookNames.length, 0);
  
  if (movedCount > 0) {
      registerFolderName(normalized);  // Only register if books were actually moved
  }
  
  if (!failedBookNames.length) {
      removeFolderName(folderName);
  } else {
      if (movedCount === 0 && !targetFolderExisted) {
          // No need to remove since we didn't register
      }
      // ...
  }
  ```

- **Fix risk:** Low 🟢
  This ensures the registry always reflects actual folder usage. The only behavioral change is that empty folders won't temporarily appear in the registry during failed rename operations.

- **Why it's safe to implement:**
  The registry is purely a UI convenience — it doesn't affect book storage or metadata. The change only affects when folders appear in the registry, not whether they can be used.

- **Pros:**
  Registry consistency; no empty folders appearing temporarily in the UI.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `registerFolderName(normalized)` is called at line 271 before the book moving loop
  - The registry tracks folder names for UI purposes via `FOLDER_REGISTRY_STORAGE_KEY`
  - `normalizeRegistry` cleans up empty folders on next load, but temporary inconsistency exists

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:** Sound. Deferring registration until after successful moves ensures registry consistency.
- **Behavioral change:** No — the end result is the same (folder registered if books exist), just without the temporary inconsistency window.
- **Ambiguity:** Single clear recommendation with before/after code showing the exact change.
- **Checklist:** Complete and actionable. Steps are specific and verifiable.
- **Dependency integrity:** No dependencies on other findings.
- **Fix risk calibration:** Accurately rated Low. This is a behavioral refinement with no breaking changes.
- **"Why it's safe" validity:** Valid. The registry is a UI convenience; changes don't affect data integrity.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Move `registerFolderName(normalized)` to after the move loop
- [x] Wrap it in a condition: only register if `movedCount > 0`
- [x] Update the cleanup logic to match the new flow (remove the `removeFolderName(normalized)` call since we won't register unless books moved)

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/lorebookFolders.js`
  - Moved folder registration to after the rename move loop.
  - Added `movedCount` gate so the new folder name is registered only when at least one book actually moved.
  - Removed obsolete cleanup path that tried to remove `normalized` on total failure, since it is no longer pre-registered.

- [x] Move `registerFolderName(normalized)` to after the move loop
- [x] Wrap it in a condition: only register if `movedCount > 0`
- [x] Update the cleanup logic to match the new flow (remove the `removeFolderName(normalized)` call since we won't register unless books moved)

---

## F04: MutationObserver Not Disconnected When Folder DOM Is Destroyed

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  When a folder's DOM element is removed from the page, a background observer keeps watching for changes even though it's no longer needed, which uses a small amount of memory unnecessarily.

- **Category:** Performance

- **Location:**
  `src/lorebookFolders.js`, `createFolderDom` function, observer creation and return (~line 529-548)

- **Detailed Finding:**
  The function creates a `MutationObserver` to watch the folder's books container:
  ```javascript
  const observer = new MutationObserver(()=>{
      updateFolderCount(count, books.childElementCount);
  });
  observer.observe(books, { childList: true });
  ```

  This observer is returned in the folder DOM object but is never disconnected. When the folder is removed from the DOM (e.g., during a list refresh or folder deletion), the observer continues to hold references to the `books` element and the `count` element, preventing garbage collection of the entire folder DOM tree.

  While modern browsers are better at handling detached DOM nodes, this is still a memory leak pattern. If the user repeatedly refreshes the book list or switches between views, these observers accumulate.

- **Why it matters:**
  Over a long session with many folder operations, accumulated observers and detached DOM references increase memory usage. This can lead to slower performance or browser tab crashes in extreme cases.

- **Severity:** Low ⭕

- **Confidence:** High 😀

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Return a cleanup function from `createFolderDom` that disconnects the observer, and ensure callers invoke it when the folder DOM is destroyed.

- **Proposed fix:**
  Add a `destroy` or `cleanup` method to the returned object:
  ```javascript
  return {
      root,
      header: root.querySelector('.stwid--folderHeader'),
      books,
      count,
      toggle,
      activeToggle,
      observer,
      updateActiveToggle,
      cleanup: () => {
          observer.disconnect();
      },
  };
  ```

  Then ensure callers (in `listPanel.foldersView.js` or wherever folder DOMs are managed) call `folder.cleanup()` when removing the folder from the DOM.

- **Fix risk:** Low 🟢
  This adds a cleanup mechanism without changing existing behavior. If callers don't use the new `cleanup()` method immediately, the behavior is identical to today (memory leak continues). Once they do use it, the leak is fixed.

- **Why it's safe to implement:**
  The change is purely additive — a new method on the return object. Existing code continues to work unchanged. The memory leak only fixes itself once callers start using the cleanup method.

- **Pros:**
  Proper resource cleanup; prevents memory leaks during long sessions.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - `MutationObserver` is created at line 529-532 and returned in the folder DOM object
  - `observer.disconnect()` is never called in the current implementation
  - The observer holds references to `books` and `count` elements, preventing GC

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:** Sound. Adding a cleanup method follows standard resource management patterns.
- **Behavioral change:** No — the cleanup method is additive and doesn't change existing behavior until callers use it.
- **Ambiguity:** Single clear recommendation with code showing the exact change.
- **Checklist:** Complete and actionable. Steps are specific and verifiable.
- **Dependency integrity:** No dependencies on other findings.
- **Fix risk calibration:** Accurately rated Low. This is an additive change with no breaking changes.
- **"Why it's safe" validity:** Valid. The change is purely additive.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Add a `cleanup` function to the return object that calls `observer.disconnect()`
- [x] Identify all places where folder DOM objects are discarded (likely in listPanel.foldersView.js)
- [x] Ensure `cleanup()` is called before discarding the folder DOM reference
- [x] Consider using a `WeakRef` or `FinalizationRegistry` as a fallback, though explicit cleanup is preferred

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/lorebookFolders.js`, `src/listPanel.foldersView.js`
  - Added `cleanup()` to folder DOM objects returned by `createFolderDom`, implemented as `observer.disconnect()`.
  - Updated folder DOM teardown (`resetFolderDoms`) to call `folderDom.cleanup?.()` before clearing references.
  - Chose explicit cleanup; did not add `WeakRef`/`FinalizationRegistry` fallback.

- [x] Add a `cleanup` function to the return object that calls `observer.disconnect()`
- [x] Identify all places where folder DOM objects are discarded (likely in listPanel.foldersView.js)
- [x] Ensure `cleanup()` is called before discarding the folder DOM reference
- [x] Consider using a `WeakRef` or `FinalizationRegistry` as a fallback, though explicit cleanup is preferred

---

*No additional findings for `src/lorebookFolders.js`*
