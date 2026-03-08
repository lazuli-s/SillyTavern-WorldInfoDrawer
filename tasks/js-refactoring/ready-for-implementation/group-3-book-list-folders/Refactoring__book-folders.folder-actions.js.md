# REFACTORING: book-folders.folder-actions.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-list/book-folders/book-folders.folder-actions.js`
**Findings:** 5 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 0 |
| Shape-based naming | NAME-01 | 2 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **5** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The file repeats the same "loop through books, try one action, collect failures, and log the error" pattern three times. That makes future fixes easy to miss because the same maintenance work has to be done in multiple places.

**Where:**
- `src/book-browser/book-list/book-folders/book-folders.folder-actions.js`, lines 80-89 - rename each book into the new folder name
- `src/book-browser/book-list/book-folders/book-folders.folder-actions.js`, lines 217-224 - delete each book while deleting the folder
- `src/book-browser/book-list/book-folders/book-folders.folder-actions.js`, lines 226-235 - move each book out of the folder

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `collectFailedBookOperations(bookNames, runBookOperation, buildFailureMessage)` near the top of the file.
- [ ] Replace the first copy (lines 80-89) with a call to `collectFailedBookOperations(...)` that runs `menuActions.setBookFolder(bookName, normalized)`.
- [ ] Replace the second copy (lines 217-224) with a call to `collectFailedBookOperations(...)` that runs `menuActions.deleteBook?.(bookName, { skipConfirm: true })`.
- [ ] Replace the third copy (lines 226-235) with a call to `collectFailedBookOperations(...)` that runs `menuActions.setBookFolder(bookName, null)`.

---

### [2] NAME-01 - Shape-based name

**What:** `data` (line 46) describes a vague blob of information instead of its purpose. Reading the name alone does not tell you that it holds the newly created lorebook contents.

**Where:** `src/book-browser/book-list/book-folders/book-folders.folder-actions.js`, line 46

**Steps to fix:**
- [ ] Rename `data` to `newBookData` everywhere it appears in this file.

---

### [3] NAME-01 - Shape-based name

**What:** `updated` (line 54) describes a generic result instead of what was actually checked. Reading the name alone does not tell you that it is the result of writing folder metadata.

**Where:** `src/book-browser/book-list/book-folders/book-folders.folder-actions.js`, line 54

**Steps to fix:**
- [ ] Rename `updated` to `folderAssignmentResult` everywhere it appears in this block.

---

### [4] SIZE-01 - Large function

**What:** `importFolderAction` is 79 lines long (lines 105-183). It is doing too much: it guards against duplicate imports and also waits for the host app to finish importing and also tries to figure out which new books belong to this folder and also moves those books and reports partial failures.

**Where:** `src/book-browser/book-list/book-folders/book-folders.folder-actions.js`, lines 105-183

**Steps to fix:**
- [ ] Extract the import wait logic (lines 121-140) into a new function named `waitForImportedBooksToStabilize(getWorldNames, updatePromise)`. It should wait for the update event and then poll until the book list stops changing.
- [ ] Extract the attribution logic (lines 143-151) into a new function named `matchImportedBookNames(expectedBookNames, beforeNames, afterNames)`. It should return the identified imported books and the unmatched names.
- [ ] Extract the folder move loop and follow-up notices (lines 158-179) into a new function named `moveImportedBooksIntoFolder(attributedNames, folderName, menuActions, unmatchedNames)`. It should move the books, report partial failures, and refresh the list when needed.
- [ ] Replace the extracted blocks in `importFolderAction` with calls to the new functions.

---

### [5] NEST-01 - Deep nesting

**What:** Inside `deleteFolderAction`, the block starting at line 225 reaches 4 levels of indentation. The innermost logic is hard to follow because the reader must hold 4 contexts in memory at the same time.

**Where:** `src/book-browser/book-list/book-folders/book-folders.folder-actions.js`, lines 225-230 (deepest point: line 229)

**Steps to fix:**
- [ ] Extract the inner block (lines 226-235) into a new function named `moveBooksOutOfFolder(bookNames, menuActions, folderName)`. It should try each move, collect failed book names, and report move errors consistently.
- [ ] Replace the inner block with a call to `moveBooksOutOfFolder(...)`.

---
