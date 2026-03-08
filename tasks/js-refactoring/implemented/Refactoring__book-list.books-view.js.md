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
- [x] Extract the shared pattern into a new function named `toggleBookCollapsedState(bookName, entryList)` near the top of the file.
- [x] Replace the first copy (lines 91-94) with a call to `toggleBookCollapsedState(name, entryList)`.
- [x] Replace the second copy (lines 204-207) with a call to `toggleBookCollapsedState(name, entryList)`.

---

### [2] DRY-01 - Duplicated code block

**What:** The same loop pattern that renders books and pauses every two items to keep the page responsive is written twice.

**Where:**
- `src/book-browser/book-list/book-list.books-view.js`, lines 293-298 - render loop for books inside folders
- `src/book-browser/book-list/book-list.books-view.js`, lines 302-307 - render loop for books at the root level

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `renderBookBatch(booksToRender, getParentElement)` near the top of the file.
- [x] Replace the first copy (lines 293-298) with a call to `renderBookBatch(folderBooks, () => folderDom.books)`.
- [x] Replace the second copy (lines 302-307) with a call to `renderBookBatch(rootBooks, () => runtime.dom.books)`.

---

### [3] DRY-01 - Duplicated code block

**What:** The same case-insensitive string sort rule is written twice, which makes sorting behavior harder to keep consistent.

**Where:**
- `src/book-browser/book-list/book-list.books-view.js`, line 254 - sort for world names
- `src/book-browser/book-list/book-list.books-view.js`, line 289 - sort for folder names

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `compareCaseInsensitiveNames(leftName, rightName)` near the top of the file.
- [x] Replace the first copy (line 254) with `compareCaseInsensitiveNames`.
- [x] Replace the second copy (line 289) with `compareCaseInsensitiveNames`.

---

### [4] DRY-02 - Magic value

**What:** The value `'Collapse/expand this book'` appears 2 times. It represents the shared tooltip text for book-collapse controls and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-list.books-view.js`, line 73
- `src/book-browser/book-list/book-list.books-view.js`, line 202

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const BOOK_COLLAPSE_TOOLTIP = 'Collapse/expand this book';`
- [x] Replace each occurrence of the raw literal with `BOOK_COLLAPSE_TOOLTIP`.

---

### [5] DRY-02 - Magic value

**What:** The value `'Entry was not saved. Keep this editor open and save again when ready.'` appears 2 times. It represents the fallback error message shown when the new entry cannot be saved and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-list.books-view.js`, line 179
- `src/book-browser/book-list/book-list.books-view.js`, line 183

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const UNSAVED_ENTRY_RETRY_MESSAGE = 'Entry was not saved. Keep this editor open and save again when ready.';`
- [x] Replace each occurrence of the raw literal with `UNSAVED_ENTRY_RETRY_MESSAGE`.

---

### [6] SIZE-01 - Large function

**What:** `renderBook` is 223 lines long (lines 21-243). It is doing too much: it loads and clones book data, and also builds the book DOM, and also wires drag-drop handlers, and also handles new-entry save and rollback flows, and also inserts the finished book into the correct sorted location.

**Where:** `src/book-browser/book-list/book-list.books-view.js`, lines 21-243

**Steps to fix:**
- [x] Extract book cache setup (lines 22-54) into a new function named `createCachedBookState(bookName, bookData, parentElement)`. It should validate the payload, clone the entry data, and decide which parent container to use.
- [x] Extract header construction (lines 66-212) into a new function named `buildBookHeader(bookName, worldState, entryList)`. It should create the title area, action buttons, and collapse controls.
- [x] Extract sorted insertion (lines 227-240) into a new function named `insertBookInAlphabeticalOrder(bookName, bookElement, targetParent, beforeElement)`. It should decide where the book belongs and insert it.
- [x] Replace the extracted blocks in `renderBook` with calls to the new functions.

---

### [7] SIZE-01 - Large function

**What:** `loadList` is 68 lines long (lines 245-312). It is doing too much: it clears existing UI state, and also loads every book payload, and also groups books by folder, and also renders folder books, and also renders root books, and then refreshes filter and collapse controls.

**Where:** `src/book-browser/book-list/book-list.books-view.js`, lines 245-312

**Steps to fix:**
- [x] Extract book loading (lines 251-270) into a new function named `loadValidBooksWithYield(sortedNames)`. It should fetch each book, skip invalid payloads, and yield to the browser after each batch.
- [x] Extract folder grouping (lines 272-289) into a new function named `groupBooksByFolder(books)`. It should return grouped folder books, root books, and sorted folder names.
- [x] Extract folder and root rendering (lines 290-308) into a new function named `renderGroupedBooks(sortedFolders, folderGroups, rootBooks)`. It should render both sections and keep the UI responsive.
- [x] Replace the extracted blocks in `loadList` with calls to the new functions.

---

### [8] NEST-01 - Deep nesting

**What:** Inside `renderBook`, the block starting at line 160 reaches 6 levels of indentation. The innermost logic is hard to follow because the reader must hold 6 contexts in memory simultaneously.

**Where:** `src/book-browser/book-list/book-list.books-view.js`, lines 160-183 (deepest point: line 167)

**Steps to fix:**
- [x] Extract the inner block (lines 160-183) into a new function named `resolveFailedEntrySave(editorOpened, bookName, rollbackOptimisticEntry)`. It should decide whether to retry, keep the editor open, or discard the unsaved entry.
- [x] Replace the inner block with a call to `resolveFailedEntrySave(...)`.

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

[`src/book-browser/book-list/book-list.books-view.js`](C:/ST Test/SillyTavern/data/default-user/extensions/SillyTavern-WorldInfoDrawer/src/book-browser/book-list/book-list.books-view.js)
- Pulled repeated collapse, sorting, and batch-render logic into small helper functions.
- Split `renderBook` into focused helpers for cached book setup, header creation, failed-save handling, and alphabetical insertion.
- Split `loadList` into loading, grouping, and rendering steps so the high-level flow is easier to follow.

### Risks / What might break

- If any future code assumes the old inline save-failure flow, it now needs to follow the extracted helper path instead.
- The new helper that picks a parent container controls where books appear, so folder placement issues would show up there first.
- The alphabetical insert helper now owns root and folder insert order, so a bug there would affect both views.

### Manual checks

- Reload the extension, open the book list, and confirm books still appear in the same alphabetical order as before.
- Click a book title and the collapse icon; success means both controls open and close the same book reliably.
- Create a new entry in a book; success means the editor opens, the entry saves normally, and failed-save prompts still keep unsaved edits open when saving fails.
