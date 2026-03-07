# REFACTORING: book-folders.folders-view.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-list/book-folders/book-folders.folders-view.js`
**Findings:** 3 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 0 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 0 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **3** |

---

## Findings

### [1] DRY-02 - Magic value

**What:** The value `'stwid--state-collapsed'` appears 2 times. It represents the CSS class name for a collapsed folder state and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-folders/book-folders.folders-view.js`, line 15
- `src/book-browser/book-list/book-folders/book-folders.folders-view.js`, line 55

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const FOLDER_COLLAPSED_CLASS = 'stwid--state-collapsed';`
- [ ] Replace each occurrence of the raw literal with `FOLDER_COLLAPSED_CLASS`.

---

### [2] DRY-02 - Magic value

**What:** The value `'stwid--book'` appears 2 times. It represents the CSS class name for a book row and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-folders/book-folders.folders-view.js`, line 79
- `src/book-browser/book-list/book-folders/book-folders.folders-view.js`, line 123

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const BOOK_ROW_CLASS = 'stwid--book';`
- [ ] Replace each occurrence of the raw literal with `BOOK_ROW_CLASS`.

---

### [3] NAME-01 - Shape-based name

**What:** `btn` (line 20) describes its shape rather than its purpose. Reading the name alone does not tell you that it is the collapse-all-folders toggle button.

**Where:** `src/book-browser/book-list/book-folders/book-folders.folders-view.js`, line 20

**Steps to fix:**
- [ ] Rename `btn` to `collapseAllFoldersButton` everywhere it appears in this file.

---
