# REFACTORING: book-browser.core-bridge.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-browser.core-bridge.js`
**Findings:** 4 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 0 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 0 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **4** |

---

## Findings

### [1] DRY-02 - Magic value

**What:** The value `5000` appears 2 times. It represents the default DOM wait timeout and should be a named constant.

**Where:**
- `src/book-browser/book-browser.core-bridge.js`, line 16
- `src/book-browser/book-browser.core-bridge.js`, line 83

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const DEFAULT_DOM_WAIT_TIMEOUT_MS = 5000;`
- [x] Replace each occurrence of the raw literal with `DEFAULT_DOM_WAIT_TIMEOUT_MS`.

---

### [2] NAME-01 - Shape-based name

**What:** `select` (line 52) describes its element type rather than its purpose. Reading the name alone does not tell you that it is the core World Info book picker.

**Where:** `src/book-browser/book-browser.core-bridge.js`, line 52

**Steps to fix:**
- [x] Rename `select` to `worldEditorSelect` everywhere it appears in this file.
- [x] Search this file after renaming to make sure all related reads and writes still refer to the same DOM element.

---

### [3] NAME-01 - Shape-based name

**What:** `option` (line 54) describes the data shape rather than its purpose. Reading the name alone does not tell you that it is the matched lorebook option for the requested book name.

**Where:** `src/book-browser/book-browser.core-bridge.js`, line 54

**Steps to fix:**
- [x] Rename `option` to `matchedBookOption` everywhere it appears in this file.
- [x] Search this file after renaming to make sure the comparison and assignment logic still read clearly.

---

### [4] NAME-01 - Shape-based name

**What:** `btn` (line 91) describes the element type rather than its purpose. Reading the name alone does not tell you that it is the core UI action button that was found from the selector list.

**Where:** `src/book-browser/book-browser.core-bridge.js`, line 91

**Steps to fix:**
- [x] Rename `btn` to `actionButton` everywhere it appears in this file.
- [x] Search this file after renaming to make sure the click call still targets the same element.

---

## After Implementation
*Implemented: March 7, 2026*

### What changed

`src/book-browser/book-browser.core-bridge.js`
- Added a named timeout constant so the file no longer repeats the same raw wait value.
- Renamed the core World Info select, matched option, and action button variables to describe what they do.
- Kept the existing behavior the same while making the DOM interaction code easier to read.

### Risks / What might break

- If another future edit reintroduces raw timeout numbers in this file, the consistency benefit from the shared constant will be lost.
- Any future code copied from older notes that still refers to the old variable names will no longer match this file.

### Manual checks

- Open the drawer and trigger a core book action like rename, duplicate, or delete. Success looks like the same core UI button being found and clicked.
- Switch the selected lorebook through the drawer flow that syncs with the core World Info selector. Success looks like the correct book remaining selected after the change event.
- Repeat the above once after a normal page reload. Success looks like no console errors and unchanged behavior.

---
