# REFACTORING: book-list.book-menu.js
*Created: March 5, 2026*

**Status:** IMPLEMENTED

**File:** `src/book-browser/book-list/book-list.book-menu.js`
**Findings:** 11 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 3 |
| Deep nesting | NEST-01 | 2 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **11** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** The file builds the same kind of menu row over and over: create a menu item, add the shared classes, attach a click handler, then add an icon and label. Repeating that pattern eight times makes the file longer and harder to update consistently.

**Where:**
- `src/book-browser/book-list/book-list.book-menu.js`, lines 473–492 — Rename Book row
- `src/book-browser/book-list/book-list.book-menu.js`, lines 497–519 — Bulk Edit row
- `src/book-browser/book-list/book-list.book-menu.js`, lines 523–557 — External Editor row
- `src/book-browser/book-list/book-list.book-menu.js`, lines 560–582 — Fill Empty Titles row
- `src/book-browser/book-list/book-list.book-menu.js`, lines 624–641 — Entry Manager row
- `src/book-browser/book-list/book-list.book-menu.js`, lines 680–701 — Export Book row
- `src/book-browser/book-list/book-list.book-menu.js`, lines 703–721 — Duplicate Book row
- `src/book-browser/book-list/book-list.book-menu.js`, lines 723–741 — Delete Book row

**Steps to fix:**
1. Extract the shared pattern into a new function named `createBookMenuActionItem({ itemClass, iconClass, labelText, onClick, enableKeyboard = true })` near the top of the file.
2. Replace the Rename Book block (lines 473–492) with a call to `createBookMenuActionItem(...)`.
3. Replace the Bulk Edit block (lines 497–519) with a call to `createBookMenuActionItem(...)`.
4. Replace the External Editor block (lines 523–557) with a call to `createBookMenuActionItem(...)`.
5. Replace the Fill Empty Titles block (lines 560–582) with a call to `createBookMenuActionItem(...)`.
6. Replace the Entry Manager block (lines 624–641) with a call to `createBookMenuActionItem(...)`.
7. Replace the Export Book block (lines 680–701) with a call to `createBookMenuActionItem(...)`.
8. Replace the Duplicate Book block (lines 703–721) with a call to `createBookMenuActionItem(...)`.
9. Replace the Delete Book block (lines 723–741) with a call to `createBookMenuActionItem(...)`.

---

### [2] DRY-01 — Duplicated code block

**What:** The file repeats the same “stop if there are unsaved edits, then show the same warning message” check four times. That is one rule with one message, so it should live in one helper instead of being copied into separate actions.

**Where:**
- `src/book-browser/book-list/book-list.book-menu.js`, lines 320–323 — Create folder quick action
- `src/book-browser/book-list/book-list.book-menu.js`, lines 345–348 — Remove from folder quick action
- `src/book-browser/book-list/book-list.book-menu.js`, lines 378–381 — Save folder move action
- `src/book-browser/book-list/book-list.book-menu.js`, lines 565–568 — Fill Empty Titles action

**Steps to fix:**
1. Extract the shared guard into a new function named `abortIfUnsavedChanges(actionLabel)` near the other local helpers.
2. Move the `state.isDirtyCheck?.()` check and warning toast into `abortIfUnsavedChanges(actionLabel)`.
3. Replace the create-folder copy (lines 320–323) with a call to `abortIfUnsavedChanges('moving a book')`.
4. Replace the no-folder copy (lines 345–348) with a call to `abortIfUnsavedChanges('moving a book')`.
5. Replace the save-move copy (lines 378–381) with a call to `abortIfUnsavedChanges('moving a book')`.
6. Replace the Fill Empty Titles copy (lines 565–568) with a call to `abortIfUnsavedChanges('filling titles')`.

---

### [3] DRY-02 — Magic value

**What:** The message `'Unsaved edits detected. Save or discard changes before'` appears 4 times as part of one rule. It represents the shared warning shown before a risky action and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-list.book-menu.js`, line 321
- `src/book-browser/book-list/book-list.book-menu.js`, line 346
- `src/book-browser/book-list/book-list.book-menu.js`, line 379
- `src/book-browser/book-list/book-list.book-menu.js`, line 566

**Steps to fix:**
1. At the top of the file (after imports), add: `const UNSAVED_EDITS_WARNING_PREFIX = 'Unsaved edits detected. Save or discard changes before';`
2. Replace each raw string occurrence with a template string that starts from `UNSAVED_EDITS_WARNING_PREFIX`.

---

### [4] NAME-01 — Shape-based name

**What:** `reg` (line 309) is an abbreviation that hides its job. Reading the name alone does not tell you that it holds the result of trying to register a folder name.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, line 309

**Steps to fix:**
1. Rename `reg` to `folderRegistrationResult` everywhere it appears in this file.

---

### [5] NAME-01 — Shape-based name

**What:** `i` (first used at line 405) describes the element’s HTML tag shape instead of its purpose. The reader has to inspect the block to learn that it is the folder icon.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, line 405

**Steps to fix:**
1. Rename `i` to `folderIcon` in the Move Book to Folder item block.
2. Apply the same purpose-based naming rule to the other menu-item icon variables in this file when those blocks are refactored.

---

### [6] NAME-01 — Shape-based name

**What:** `txt` (first used at line 410) describes the value as “some text” instead of saying what that text is for. The reader has to inspect the block to learn that it is the menu label.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, line 410

**Steps to fix:**
1. Rename `txt` to `menuLabel` in the Move Book to Folder item block.
2. Apply the same purpose-based naming rule to the other menu-item label variables in this file when those blocks are refactored.

---

### [7] SIZE-01 — Large function

**What:** `importFolderFile` is 76 lines long (lines 68–144). It is doing too much: it validates the imported file, creates unique book names, saves each book, rolls back failed saves, and also shows final success and failure messages.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, lines 68–144

**Steps to fix:**
1. Extract file-shape validation (lines 73–86) into a new function named `parseFolderImportPayload(file)`. It should read the file, parse JSON, and confirm that `books` is a plain object.
2. Extract unique-name generation (lines 95–103) into a new function named `buildImportedBookName(rawName, currentNames)`. It should return the next available imported name.
3. Extract single-book creation and rollback handling (lines 104–128) into a new function named `importSingleBook(rawName, bookData, currentNames)`. It should create one book and report whether it succeeded.
4. Extract final toast handling (lines 130–143) into a new function named `showFolderImportResult(createdNames, failedBooks)`.
5. Replace the extracted blocks in `importFolderFile` with calls to the new functions.

---

### [8] SIZE-01 — Large function

**What:** `buildMoveBookMenuItem` is 186 lines long (lines 231–417). It is doing too much: it creates the menu item, builds the dialog window, fills the folder selector, wires three move actions, and also handles dialog cleanup.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, lines 231–417

**Steps to fix:**
1. Extract folder-list collection and sorting (lines 242–247) into a new function named `getSortedFolderNamesForMoveDialog()`. It should return the combined registry and DOM folder list.
2. Extract dialog shell creation (lines 249–269) into a new function named `createMoveBookDialogShell(cleanName)`. It should build the dialog, popup body, popup content, and title.
3. Extract folder select row creation (lines 271–353) into a new function named `buildMoveBookSelectionRow({ folderNames, currentFolder, name, modal })`. It should build the selector plus the quick-action buttons.
4. Extract the primary buttons block (lines 356–396) into a new function named `buildMoveBookPrimaryButtons({ folderNames, currentFolder, select, name, modal })`. It should build Save and Cancel.
5. Replace the extracted blocks in `buildMoveBookMenuItem` with calls to the new functions.

---

### [9] SIZE-01 — Large function

**What:** `buildBookMenuTrigger` is 331 lines long (lines 419–750). It is doing too much: it creates the trigger, opens and closes the dropdown, builds every menu item, checks optional companion extensions, and wires sort-selection behavior.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, lines 419–750

**Steps to fix:**
1. Extract trigger creation and keyboard wiring (lines 429–443) into a new function named `createBookMenuTriggerButton(name)`. It should return the trigger element only.
2. Extract blocker and close logic (lines 446–472) into a new function named `createBookMenuOverlay(menuTrigger)`. It should return `blocker`, `menu`, and `closeMenu`.
3. Extract the static core actions (lines 473–495, 560–623, 624–741) into a new function named `appendCoreBookMenuItems(menu, name, closeMenu)`.
4. Extract companion-extension items (lines 496–559 and 643–679) into a new function named `appendIntegrationMenuItems(menu, name, closeMenu)`.
5. Replace the extracted blocks in `buildBookMenuTrigger` with calls to the new functions.

---

### [10] NEST-01 — Deep nesting

**What:** Inside `buildMoveBookMenuItem`, the block starting at line 304 reaches 4 levels of indentation. The innermost logic is hard to follow because the reader must hold the menu item click, dialog build, button setup, and button click handler in memory at the same time.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, lines 304–326 (deepest point: line 325)

**Steps to fix:**
1. Extract the inner block (lines 304–326) into a new function named `handleCreateFolderAndMoveBook({ name, modal })`. It should ask for a new folder name, validate it, and move the book there.
2. Replace the inner block with a call to `handleCreateFolderAndMoveBook(...)`.
3. Extract the similar move button block (lines 366–383) into its own handler so the dialog builder no longer contains multiple nested action flows.

---

### [11] NEST-01 — Deep nesting

**What:** Inside `buildBookMenuTrigger`, the block starting at line 496 reaches 5 levels of indentation. The innermost logic is hard to follow because the reader must hold the trigger click, overlay build, optional extension check, item build, and item click handler in memory at the same time.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, lines 496–519 (deepest point: line 504)

**Steps to fix:**
1. Extract the inner block (lines 496–519) into a new function named `createBulkEditMenuItem(name, closeMenu)`. It should build the Bulk Edit row and wire its click action.
2. Replace the inner block with a call to `createBulkEditMenuItem(name, closeMenu)`.
3. Apply the same extraction pattern to the other optional and static menu-item blocks so the trigger click handler mainly assembles already-named pieces.

---

## Implementation Plan

- [x] Extract shared menu-row and unsaved-edit helpers, and replace repeated menu item blocks with helper calls.
- [x] Split folder import handling into smaller helpers for parsing, naming, single-book import, and final result messages.
- [x] Split move-book dialog setup into focused helpers and replace nested move handlers with named functions.
- [x] Split the book menu trigger flow into focused trigger, overlay, core-action, and integration-action helpers.

---

## After Implementation
*Implemented: March 6, 2026*

### What changed

- `src/book-browser/book-list/book-list.book-menu.js`
- Added shared helpers for repeated menu rows and the repeated unsaved-edits warning.
- Broke the folder import flow into smaller named steps so each part has one clear job.
- Broke the move-book dialog and dropdown-menu builder into smaller helpers without changing which module owns the behavior.

### Risks / What might break

- This touches the per-book dropdown menu, so it might affect which actions appear or whether they close correctly after a click.
- This touches the move-to-folder popup, so it might affect folder selection, creating a new folder, or removing a book from a folder.
- This touches folder import handling, so malformed import files or partial import failures might show the wrong message if something was missed.

### Manual checks

- Open a book menu and click Rename, Export, Duplicate, Delete, Entry Manager, and Fill Empty Titles. Success looks like each action still opens or runs the same thing it did before.
- Open Move Book to Folder. Success looks like the popup opening, listing folders, letting you create a folder, move to an existing folder, remove from folder, and close cleanly with Cancel.
- With unsaved editor changes present, try Move Book to Folder and Fill Empty Titles. Success looks like the warning appearing and the action stopping.
- Import a valid folder JSON and an invalid JSON file. Success looks like valid books importing with a success message and bad files showing an error instead of breaking the page.
