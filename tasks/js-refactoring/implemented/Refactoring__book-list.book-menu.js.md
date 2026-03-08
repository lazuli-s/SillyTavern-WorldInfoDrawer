# REFACTORING: book-list.book-menu.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-list/book-list.book-menu.js`
**Findings:** 7 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 3 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **7** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The same keyboard activation logic is written twice for clickable menu controls. That means one behavior change would need to be edited in two places instead of one shared helper.

**Where:**
- `src/book-browser/book-list/book-list.book-menu.js`, lines 20-28 - keyboard support for menu items
- `src/book-browser/book-list/book-list.book-menu.js`, lines 489-494 - keyboard support for the menu trigger button

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `addKeyboardClickSupport(target)` near the top of the file.
- [x] Replace the first copy (lines 20-28) with a call to `addKeyboardClickSupport(item)`.
- [x] Replace the second copy (lines 489-494) with a call to `addKeyboardClickSupport(menuTrigger)`.

---

### [2] DRY-02 - Magic value

**What:** The value `'moving a book'` appears 3 times. It represents the same warning label each time and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-list.book-menu.js`, line 347
- `src/book-browser/book-list/book-list.book-menu.js`, line 358
- `src/book-browser/book-list/book-list.book-menu.js`, line 418

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const MOVE_BOOK_ACTION_LABEL = 'moving a book';`
- [x] Replace each occurrence of the raw literal with `MOVE_BOOK_ACTION_LABEL`.

---

### [3] NAME-01 - Shape-based name

**What:** `i` (line 555) describes its shape as a short temporary variable rather than its purpose. Reading the name alone does not tell you that it holds the sort icon for the menu row.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, line 555

**Steps to fix:**
- [x] Rename `i` to `sortIcon` everywhere it appears in this file.

---

### [4] SIZE-01 - Large function

**What:** `createBookMenuSlice` is 659 lines long (lines 6-664). It is doing too much: it builds shared menu helpers and also handles import flow, duplication flow, move-to-folder dialog flow, overlay flow, and menu assembly.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, lines 6-664

**Steps to fix:**
- [x] Extract the import helpers (lines 68-230) into a new function named `createBookImportHandlers()`. This function should own the import dialog and folder import flow.
- [x] Extract the book action helpers (lines 234-300) into a new function named `createBookCrudHandlers()`. This function should own duplication and deletion behavior.
- [x] Extract the move dialog helpers (lines 302-479) into a new function named `createMoveBookDialogHelpers()`. This function should build and run the move-to-folder dialog.
- [x] Extract the menu trigger and overlay helpers (lines 481-655) into a new function named `createBookMenuUiHelpers()`. This function should build the trigger and assemble the visible menu.
- [x] Replace the extracted blocks in `createBookMenuSlice` with calls to the new helper factories.

---

### [5] SIZE-01 - Large function

**What:** `openImportDialog` is 51 lines long (lines 68-118). It is doing too much: it starts the file picker and also manages timeout cleanup, file parsing, and cancel detection.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, lines 68-118

**Steps to fix:**
- [x] Extract the cleanup and resolve logic (lines 75-84) into a new function named `createImportDialogResolver(resolve, abortController)`. This function should finish the promise exactly once and clear listeners.
- [x] Extract the file-read branch (lines 85-96) into a new function named `readImportedJsonFile(input, finish)`. This function should read the selected file and return parsed JSON or `null`.
- [x] Extract the focus-return cancel check (lines 97-106) into a new function named `watchImportDialogCancel(input, finish)`. This function should detect when the picker closes without a file.
- [x] Replace the extracted blocks in `openImportDialog` with calls to the new helpers.

---

### [6] SIZE-01 - Large function

**What:** `appendCoreBookMenuItems` is 110 lines long (lines 524-634). It is doing too much: it adds standard menu actions and also manually builds the custom sort row inline.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, lines 524-634

**Steps to fix:**
- [x] Extract the rename action setup (lines 525-535) into a new function named `buildRenameBookMenuItem(name, closeMenu)`. This function should return the ready-made menu item.
- [x] Extract the fill-title, entry-manager, export, duplicate, and delete action setup into small builders named after each action. Each one should return one menu item.
- [x] Extract the inline sort row builder (lines 551-590) into a new function named `buildBookSortMenuRow(name, closeMenu)`. This function should create the sort label, select element, and change handler.
- [x] Replace the extracted blocks in `appendCoreBookMenuItems` with calls to those builders.

---

### [7] NEST-01 - Deep nesting

**What:** Inside `appendCoreBookMenuItems`, the block starting at line 551 reaches 4 levels of indentation. The innermost logic is hard to follow because the reader must hold 4 contexts in memory at the same time.

**Where:** `src/book-browser/book-list/book-list.book-menu.js`, lines 551-586 (deepest point: line 581)

**Steps to fix:**
- [x] Extract the inner block (lines 565-586) into a new function named `buildBookSortSelect(name, closeMenu)`. This function should create the select, populate options, and wire the change handler.
- [x] Replace the inner block with a call to `buildBookSortSelect(name, closeMenu)`.

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/book-browser/book-list/book-list.book-menu.js`
- Pulled the repeated keyboard activation behavior into one shared helper and reused it for both menu items and the menu trigger.
- Replaced the repeated move-warning text with a named constant so the message only needs to be changed in one place.
- Split the large menu module into smaller helpers for import handling, book actions, move-to-folder dialog logic, menu UI assembly, and individual menu item builders.
- Split the import dialog and custom sort row into smaller focused helpers so the nested logic is easier to read and change.

### Risks / What might break

- The import picker now relies on extracted helper functions, so a missed edge case there could affect cancel detection or imported JSON parsing.
- The menu is assembled through more helper layers now, so a wrong dependency passed into one helper could hide or break a menu action.
- The sort dropdown uses new builder functions, so any future code expecting the old inline structure could drift if it is updated in only one place.

### Manual checks

- Open a book menu with keyboard only. Success looks like `Enter` and `Space` opening the trigger and activating normal menu items.
- Use `Move Book to Folder`, `New Folder`, and `No Folder`. Success looks like the dialog opening, saving, and closing exactly as before.
- Test `Duplicate Book`, `Delete Book`, `Export Book`, and `Fill Empty Titles`. Success looks like each action still running from the menu without errors.
- Open the import flows and cancel them, then import a valid JSON file. Success looks like cancel returning quietly and valid imports still completing.

