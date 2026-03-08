# REFACTORING: book-folders.lorebook-folders.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js`
**Findings:** 4 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 0 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 0 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **4** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The file repeats the same "read the folder name from metadata, validate it, and decide whether to keep or reject it" steps in two places. That makes future rule changes easy to miss in one copy.

**Where:**
- `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js`, lines 72-78 - reads and validates the stored folder name without changing metadata
- `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js`, lines 96-105 - reads and validates the stored folder name, then repairs metadata when needed

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `readValidatedMetadataFolder(metadata)` near the top of the file.
- [ ] Replace the first copy (lines 72-78) with a call to `readValidatedMetadataFolder(metadata)`.
- [ ] Replace the second copy (lines 96-105) with a call to `readValidatedMetadataFolder(metadata)` and keep only the metadata-repair step in `sanitizeFolderMetadata`.

---

### [2] NAME-01 - Shape-based name

**What:** `value` (line 4) describes the input only as a generic value, not what that value means. Reading the name alone does not tell you that this function is cleaning up a folder name.

**Where:** `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js`, line 4

**Steps to fix:**
- [ ] Rename `value` to `folderNameInput` everywhere it appears in this file.

---

### [3] NAME-01 - Shape-based name

**What:** `raw` (line 17) describes the data by its rough form, not its purpose. The name does not tell you that it holds the saved folder registry text loaded from browser storage.

**Where:** `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js`, line 17

**Steps to fix:**
- [ ] Rename `raw` to `storedRegistryJson` everywhere it appears in this file.

---

### [4] NAME-01 - Shape-based name

**What:** `parsed` (line 19) describes the data by its shape after decoding, not what it represents. The name does not tell you that it is the parsed folder registry.

**Where:** `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js`, line 19

**Steps to fix:**
- [ ] Rename `parsed` to `storedRegistry` everywhere it appears in this file.

---
