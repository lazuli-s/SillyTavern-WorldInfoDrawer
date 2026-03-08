# REFACTORING: browser-tabs.folders-tab.js
*Created: March 7, 2026*

**File:** `src/book-browser/browser-tabs/browser-tabs.folders-tab.js`
**Findings:** 3 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 0 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **3** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** This file builds the "New Folder" control and the "Import Folder" control with the same setup steps in the same order: create a `div`, store it on `dom.folderControls`, add shared button classes, set the title and accessible label, attach a click handler, and append it to the group. Repeating that setup makes small UI changes easy to miss in one of the two buttons.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.folders-tab.js`, lines 21-40 - build and wire the "New Folder" control
- `src/book-browser/browser-tabs/browser-tabs.folders-tab.js`, lines 42-50 - build and wire the "Import Folder" control

**Steps to fix:**
- [x] Extract the shared setup into a helper named `createFolderActionButton({ controlKey, iconClass, title, onClick })` near the top of the file.
- [x] Replace the "New Folder" block (lines 21-40) with a call to `createFolderActionButton(...)`.
- [x] Replace the "Import Folder" block (lines 42-50) with a call to `createFolderActionButton(...)`.

---

### [2] DRY-02 - Magic value

**What:** The value `'menu_button'` appears 3 times. It represents the shared SillyTavern button class for these controls and should be a named constant.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.folders-tab.js`, line 23
- `src/book-browser/browser-tabs/browser-tabs.folders-tab.js`, line 44
- `src/book-browser/browser-tabs/browser-tabs.folders-tab.js`, line 56

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const MENU_BUTTON_CLASS = 'menu_button';`
- [x] Replace each occurrence of the raw literal with `MENU_BUTTON_CLASS`.

---

### [3] NAME-01 - Shape-based name

**What:** `impFolder` (line 42) describes the variable in shorthand rather than by its purpose. Reading the name alone does not clearly tell you that this is the clickable control for importing a folder.

**Where:** `src/book-browser/browser-tabs/browser-tabs.folders-tab.js`, line 42

**Steps to fix:**
- [x] Rename `impFolder` to `importFolderButton` everywhere it appears in this file.

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/book-browser/browser-tabs/browser-tabs.folders-tab.js`
- Added a small helper that builds folder action buttons so the repeated setup only lives in one place.
- Replaced the repeated `'menu_button'` text with a named constant so future style changes only need one edit.
- Updated the import-folder control naming to be clearer while folding that control into the shared helper flow.

### Risks / What might break

- If any future code expects the folder action buttons to be built inline instead of through the helper, that code will need to follow the new helper pattern.
- If another control needs slightly different setup later, changing the helper carelessly could affect both existing folder buttons at once.

### Manual checks

- Reload the browser tab, open the drawer, and confirm the Folders tab still shows New Folder, Import Folder, and Collapse All controls.
- Click New Folder and verify the name prompt still appears and a valid new folder shows up in the list after confirming.
- Click Import Folder and verify the folder import dialog still opens.

---
