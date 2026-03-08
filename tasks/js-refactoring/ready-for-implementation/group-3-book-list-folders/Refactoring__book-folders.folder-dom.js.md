# REFACTORING: book-folders.folder-dom.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`
**Findings:** 7 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 2 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **7** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The folder menu creates five action rows with the same structure: build a menu item, close the menu, run one action, add an icon, and add a label. Writing the same pattern five times makes the menu harder to change safely.

**Where:**
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 163-181 - Rename Folder item
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 183-201 - Import Into Folder item
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 203-221 - Export Folder item
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 223-241 - Entry Manager item
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 243-261 - Delete Folder item

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `createFolderMenuItem({ itemClass, iconClass, label, onSelect })` near the top of the file.
- [ ] Replace the first copy (lines 163-181) with a call to `createFolderMenuItem(...)`.
- [ ] Replace the second copy (lines 183-201) with a call to `createFolderMenuItem(...)`.
- [ ] Replace the third copy (lines 203-221) with a call to `createFolderMenuItem(...)`.
- [ ] Replace the fourth copy (lines 223-241) with a call to `createFolderMenuItem(...)`.
- [ ] Replace the fifth copy (lines 243-261) with a call to `createFolderMenuItem(...)`.

---

### [2] DRY-01 - Duplicated code block

**What:** The menu-close sequence `blocker.remove()` plus resetting `menuTrigger.style.anchorName` is written out every time the menu closes. Repeating the same two-step cleanup in six places makes it easy for one branch to drift out of sync.

**Where:**
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 156-159 - blocker click closes the menu
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 167-169 - Rename Folder click closes the menu
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 187-189 - Import Into Folder click closes the menu
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 207-209 - Export Folder click closes the menu
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 227-229 - Entry Manager click closes the menu
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 247-249 - Delete Folder click closes the menu

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `closeFolderMenu()` inside the menu trigger click handler.
- [ ] Replace the first copy (lines 156-159) with a call to `closeFolderMenu()`.
- [ ] Replace the second copy (lines 167-169) with a call to `closeFolderMenu()`.
- [ ] Replace the third copy (lines 187-189) with a call to `closeFolderMenu()`.
- [ ] Replace the fourth copy (lines 207-209) with a call to `closeFolderMenu()`.
- [ ] Replace the fifth copy (lines 227-229) with a call to `closeFolderMenu()`.
- [ ] Replace the sixth copy (lines 247-249) with a call to `closeFolderMenu()`.

---

### [3] DRY-02 - Magic value

**What:** The value `'--stwid--ctxAnchor'` appears 7 times. It represents the temporary CSS anchor name for the open folder menu and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, line 144
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, line 159
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, line 168
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, line 188
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, line 208
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, line 228
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, line 248

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const FOLDER_MENU_ANCHOR_NAME = '--stwid--ctxAnchor';`
- [ ] Replace each occurrence of the raw literal with `FOLDER_MENU_ANCHOR_NAME`.

---

### [4] NAME-01 - Shape-based name

**What:** `i` (line 171) describes the element's shape rather than its purpose. Reading the name alone does not tell you which icon it represents.

**Where:** `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, line 171

**Steps to fix:**
- [ ] Rename `i` to `renameIcon` everywhere it appears in this block.
- [ ] Repeat the same purpose-based naming pattern for the matching icon variables at lines 191, 211, 231, and 251.

---

### [5] NAME-01 - Shape-based name

**What:** `txt` (line 176) describes the value's shape rather than its purpose. Reading the name alone does not tell you which label text it holds.

**Where:** `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, line 176

**Steps to fix:**
- [ ] Rename `txt` to `renameLabel` everywhere it appears in this block.
- [ ] Repeat the same purpose-based naming pattern for the matching label variables at lines 196, 216, 236, and 256.

---

### [6] SIZE-01 - Large function

**What:** `createFolderDom` is 305 lines long (lines 30-334). It is doing too much: it builds the folder row DOM, wires drag and click behavior, builds the folder menu, and also manages live active-state updates.

**Where:** `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 30-334

**Steps to fix:**
- [ ] Extract the drag-and-drop header wiring (lines 48-70) into a new function named `bindFolderHeaderDropHandlers()`. This should attach the folder drag events and reuse the same drop-state rules.
- [ ] Extract the folder actions area setup (lines 85-280) into a new function named `createFolderActionsDom()`. This should build the active toggle, add button, menu trigger, and collapse toggle.
- [ ] Extract the active-toggle refresh logic (lines 298-321) into a new function named `syncFolderActiveToggleState()`. This should compute the state and apply the checkbox attributes.
- [ ] Replace the extracted blocks in `createFolderDom` with calls to the new functions.

---

### [7] NEST-01 - Deep nesting

**What:** Inside `createFolderDom`, the block starting at line 145 reaches 7 levels of indentation. The innermost logic is hard to follow because the reader must hold 7 contexts in memory at the same time.

**Where:** `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`, lines 145-261 (deepest point: line 173)

**Steps to fix:**
- [ ] Extract the inner block (lines 145-261) into a new function named `buildFolderMenuOverlay({ folderName, menuActions, menuTrigger })`. This should create the blocker, build the menu items, and return the finished overlay element.
- [ ] Replace the inner block with a call to `buildFolderMenuOverlay(...)`.

---
