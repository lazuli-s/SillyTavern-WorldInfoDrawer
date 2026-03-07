# REFACTORING: browser-tabs.lorebooks-tab.js
*Created: March 7, 2026*

**File:** `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js`
**Findings:** 5 total

---

## Summary

| Check | ID | Findings |
|---|---|---:|
| Duplicated code blocks | DRY-01 | 0 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 2 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **5** |

---

## Findings

### [1] DRY-02 — Magic value

**What:** The value `Create New Book` appears 2 times. It represents the user-facing label for the “create book” button (used for both tooltip text and screen-reader text) and should be a named constant.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js`, line 26
- `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js`, line 27

**Steps to fix:**
- [ ] At the top of the file (after exports), add: `const CREATE_BOOK_LABEL = 'Create New Book';`
- [ ] Replace each occurrence of the raw literal with `CREATE_BOOK_LABEL`.

---

### [2] DRY-02 — Magic value

**What:** The value `Import Book` appears 2 times. It represents the user-facing label for the “import book” button (used for both tooltip text and screen-reader text) and should be a named constant.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js`, line 48
- `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js`, line 49

**Steps to fix:**
- [ ] At the top of the file (after exports), add: `const IMPORT_BOOK_LABEL = 'Import Book';`
- [ ] Replace each occurrence of the raw literal with `IMPORT_BOOK_LABEL`.

---

### [3] NAME-01 — Shape-based name

**What:** `add` (line 23) describes a vague action (“add”) rather than what this element actually is. Reading the name alone does not tell you that it’s the “Create New Book” button.

**Where:** `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js`, line 23

**Steps to fix:**
- [ ] Rename `add` to `createBookButton` everywhere it appears in this file.
- [ ] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [4] NAME-01 — Shape-based name

**What:** `imp` (line 46) is an abbreviation that forces the reader to decode what it means. Reading the name alone does not tell you that it’s the “Import Book” button.

**Where:** `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js`, line 46

**Steps to fix:**
- [ ] Rename `imp` to `importBookButton` everywhere it appears in this file.
- [ ] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [5] SIZE-01 — Large function

**What:** `createLorebooksTabContent` is 65 lines long (lines 9–73, counting from the opening `{` to the closing `}`). It is doing too much: it builds the Lorebooks header area and also wires up the “Create New Book” button and also wires up the “Import Book” button and also builds the “collapse/expand all” toggle.

**Where:** `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js`, lines 1–73

**Steps to fix:**
- [ ] Extract “build the Lorebooks group label + hint icon” (lines 13–22) into a new function named `createLorebooksGroupLabel()`. Creates the label row (text + hint icon) for the Lorebooks section.
- [ ] Extract “create and wire up the Create New Book button” (lines 23–45) into a new function named `createCreateBookButton({ cache, getFreeWorldName, createNewWorldInfo, Popup, wiHandlerApi, getListPanelApi })`. Creates the button element and attaches the click handler.
- [ ] Extract “create and wire up the Import Book button” (lines 46–53) into a new function named `createImportBookButton()`. Creates the import button element and attaches the click handler that triggers the file input.
- [ ] Extract “create and wire up the collapse/expand all toggle” (lines 54–69) into a new function named `createCollapseAllToggle({ dom, cache, getListPanelApi })`. Creates the toggle element, stores it in `dom`, and attaches the click handler.
- [ ] Replace the extracted blocks in `createLorebooksTabContent` with calls to the new functions.
