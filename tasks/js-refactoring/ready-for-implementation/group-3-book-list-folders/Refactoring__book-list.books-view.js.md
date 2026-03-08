# REFACTORING: book-list.books-view.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-list/book-list.books-view.js`
**Findings:** 8 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 3 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 0 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **8** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The same "toggle this book open or closed" logic is written twice, so one behavior change would have to be made in two places.

**Where:**
- `src/book-browser/book-list/book-list.books-view.js`, lines 91-94 - click handler on the book title
- `src/book-browser/book-list/book-list.books-view.js`, lines 204-207 - click handler on the collapse icon

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `toggleBookCollapsedState(bookName, entryList)` near the top of the file.
- [ ] Replace the first copy (lines 91-94) with a call to `toggleBookCollapsedState(name, entryList)`.
- [ ] Replace the second copy (lines 204-207) with a call to `toggleBookCollapsedState(name, entryList)`.

---

### [2] DRY-01 - Duplicated code block

**What:** The same loop pattern that renders books and pauses every two items to keep the page responsive is written twice.

**Where:**
- `src/book-browser/book-list/book-list.books-view.js`, lines 293-298 - render loop for books inside folders
- `src/book-browser/book-list/book-list.books-view.js`, lines 302-307 - render loop for books at the root level

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `renderBookBatch(booksToRender, getParentElement)` near the top of the file.
- [ ] Replace the first copy (lines 293-298) with a call to `renderBookBatch(folderBooks, () => folderDom.books)`.
- [ ] Replace the second copy (lines 302-307) with a call to `renderBookBatch(rootBooks, () => runtime.dom.books)`.

---

### [3] DRY-01 - Duplicated code block

**What:** The same case-insensitive string sort rule is written twice, which makes sorting behavior harder to keep consistent.

**Where:**
- `src/book-browser/book-list/book-list.books-view.js`, line 254 - sort for world names
- `src/book-browser/book-list/book-list.books-view.js`, line 289 - sort for folder names

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `compareCaseInsensitiveNames(leftName, rightName)` near the top of the file.
- [ ] Replace the first copy (line 254) with `compareCaseInsensitiveNames`.
- [ ] Replace the second copy (line 289) with `compareCaseInsensitiveNames`.

---

### [4] DRY-02 - Magic value

**What:** The value `'Collapse/expand this book'` appears 2 times. It represents the shared tooltip text for book-collapse controls and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-list.books-view.js`, line 73
- `src/book-browser/book-list/book-list.books-view.js`, line 202

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const BOOK_COLLAPSE_TOOLTIP = 'Collapse/expand this book';`
- [ ] Replace each occurrence of the raw literal with `BOOK_COLLAPSE_TOOLTIP`.

---

### [5] DRY-02 - Magic value

**What:** The value `'Entry was not saved. Keep this editor open and save again when ready.'` appears 2 times. It represents the fallback error message shown when the new entry cannot be saved and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-list.books-view.js`, line 179
- `src/book-browser/book-list/book-list.books-view.js`, line 183

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const UNSAVED_ENTRY_RETRY_MESSAGE = 'Entry was not saved. Keep this editor open and save again when ready.';`
- [ ] Replace each occurrence of the raw literal with `UNSAVED_ENTRY_RETRY_MESSAGE`.

---

### [6] SIZE-01 - Large function

**What:** `renderBook` is 223 lines long (lines 21-243). It is doing too much: it loads and clones book data, and also builds the book DOM, and also wires drag-drop handlers, and also handles new-entry save and rollback flows, and also inserts the finished book into the correct sorted location.

**Where:** `src/book-browser/book-list/book-list.books-view.js`, lines 21-243

**Steps to fix:**
- [ ] Extract book cache setup (lines 22-54) into a new function named `createCachedBookState(bookName, bookData, parentElement)`. It should validate the payload, clone the entry data, and decide which parent container to use.
- [ ] Extract header construction (lines 66-212) into a new function named `buildBookHeader(bookName, worldState, entryList)`. It should create the title area, action buttons, and collapse controls.
- [ ] Extract sorted insertion (lines 227-240) into a new function named `insertBookInAlphabeticalOrder(bookName, bookElement, targetParent, beforeElement)`. It should decide where the book belongs and insert it.
- [ ] Replace the extracted blocks in `renderBook` with calls to the new functions.

---

### [7] SIZE-01 - Large function

**What:** `loadList` is 68 lines long (lines 245-312). It is doing too much: it clears existing UI state, and also loads every book payload, and also groups books by folder, and also renders folder books, and also renders root books, and then refreshes filter and collapse controls.

**Where:** `src/book-browser/book-list/book-list.books-view.js`, lines 245-312

**Steps to fix:**
- [ ] Extract book loading (lines 251-270) into a new function named `loadValidBooksWithYield(sortedNames)`. It should fetch each book, skip invalid payloads, and yield to the browser after each batch.
- [ ] Extract folder grouping (lines 272-289) into a new function named `groupBooksByFolder(books)`. It should return grouped folder books, root books, and sorted folder names.
- [ ] Extract folder and root rendering (lines 290-308) into a new function named `renderGroupedBooks(sortedFolders, folderGroups, rootBooks)`. It should render both sections and keep the UI responsive.
- [ ] Replace the extracted blocks in `loadList` with calls to the new functions.

---

### [8] NEST-01 - Deep nesting

**What:** Inside `renderBook`, the block starting at line 160 reaches 6 levels of indentation. The innermost logic is hard to follow because the reader must hold 6 contexts in memory simultaneously.

**Where:** `src/book-browser/book-list/book-list.books-view.js`, lines 160-183 (deepest point: line 167)

**Steps to fix:**
- [ ] Extract the inner block (lines 160-183) into a new function named `resolveFailedEntrySave(editorOpened, bookName, rollbackOptimisticEntry)`. It should decide whether to retry, keep the editor open, or discard the unsaved entry.
- [ ] Replace the inner block with a call to `resolveFailedEntrySave(...)`.

