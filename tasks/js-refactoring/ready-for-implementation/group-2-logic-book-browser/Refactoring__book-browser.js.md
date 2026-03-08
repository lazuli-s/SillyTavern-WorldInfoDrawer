# REFACTORING: book-browser.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-browser.js`
**Findings:** 6 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 2 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **6** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** Two save helpers repeat the same "load the latest book, build a save payload, save it, then refresh the cache metadata" sequence. That makes future changes to the save flow easy to miss in one place.

**Where:**
- `src/book-browser/book-browser.js`, lines 278-313 - `setBookSortPreference()` loads a book, prepares metadata, saves it, and updates the cache
- `src/book-browser/book-browser.js`, lines 350-375 - `setBookFolder()` loads a book, prepares metadata, saves it, and updates the cache

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `saveBookMetadataUpdate(name, updateMetadata, messages)` near the top of the file.
- [ ] Replace the copy in lines 278-313 with a call to `saveBookMetadataUpdate(...)`.
- [ ] Replace the copy in lines 350-375 with a call to `saveBookMetadataUpdate(...)`.
- [ ] Keep the sort-only post-save behavior in `setBookSortPreference()` outside the shared helper so the new helper stays focused on loading and saving metadata.

---

### [2] DRY-02 — Magic value

**What:** The value `'fa-chevron-up'` appears 2 times. It represents the expanded-state icon class and should be a named constant.

**Where:**
- `src/book-browser/book-browser.js`, line 104
- `src/book-browser/book-browser.js`, line 107

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const EXPANDED_CHEVRON_CLASS = 'fa-chevron-up';`
- [ ] Replace each occurrence of the raw literal with `EXPANDED_CHEVRON_CLASS`.

---

### [3] DRY-02 — Magic value

**What:** The value `'fa-chevron-down'` appears 2 times. It represents the collapsed-state icon class and should be a named constant.

**Where:**
- `src/book-browser/book-browser.js`, line 105
- `src/book-browser/book-browser.js`, line 108

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const COLLAPSED_CHEVRON_CLASS = 'fa-chevron-down';`
- [ ] Replace each occurrence of the raw literal with `COLLAPSED_CHEVRON_CLASS`.

---

### [4] NAME-01 — Shape-based name

**What:** `btn` (line 76) describes the variable's shape as a button rather than its purpose. Reading the name alone does not tell you that this is the "collapse all books" control.

**Where:** `src/book-browser/book-browser.js`, line 76

**Steps to fix:**
- [ ] Rename `btn` to `collapseAllButton` everywhere it appears in this file.

---

### [5] NAME-01 — Shape-based name

**What:** `books` (line 468) describes the variable's shape as a collection rather than its job. Reading the name alone does not tell you this element is the root container for the rendered book list.

**Where:** `src/book-browser/book-browser.js`, line 468

**Steps to fix:**
- [ ] Rename `books` to `booksContainer` everywhere it appears in this file.

---

### [6] SIZE-01 — Large function

**What:** `wireSlices` is 56 lines long (lines 523-578). It is doing too much: it builds the filter-bar slice configuration, and also builds the drag-and-drop slice, and also builds the book-menu, folder-view, and books-view slice configurations.

**Where:** `src/book-browser/book-browser.js`, lines 523-578

**Steps to fix:**
- [ ] Extract the filter-bar slice setup (lines 524-532) into a new function named `createFilterBarSliceConfig()`. It should return the config object used to create the filter bar slice.
- [ ] Extract the book-menu slice setup (lines 538-556) into a new function named `createBookMenuSliceConfig()`. It should return the config object used to create the book menu slice.
- [ ] Extract the books-view slice setup (lines 562-577) into a new function named `createBooksViewSliceConfig()`. It should return the config object used to create the books view slice.
- [ ] Replace the extracted blocks in `wireSlices` with calls to the new functions.

---
