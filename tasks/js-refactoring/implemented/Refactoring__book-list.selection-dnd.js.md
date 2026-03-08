# REFACTORING: book-list.selection-dnd.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-list/book-list.selection-dnd.js`
**Findings:** 10 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 3 |
| Shape-based naming | NAME-01 | 2 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **10** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The file repeats the same "find the selection icon, then swap the empty and checked square classes" pattern in three places. That makes the selected-state UI harder to change because the same rule lives in multiple spots.

**Where:**
- `src/book-browser/book-list/book-list.selection-dnd.js`, lines 15-17 - reset the icon for each cleared selection inside `selectEnd`
- `src/book-browser/book-list/book-list.selection-dnd.js`, lines 30-32 - set the icon to selected inside `selectAdd`
- `src/book-browser/book-list/book-list.selection-dnd.js`, lines 38-40 - set the icon back to unselected inside `selectRemove`

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `setEntrySelectionIcon(entry, isSelected)` near the top of the file.
- [x] Replace the first copy (lines 15-17) with a call to `setEntrySelectionIcon(item, false)`.
- [x] Replace the second copy (lines 30-32) with a call to `setEntrySelectionIcon(entry, true)`.
- [x] Replace the third copy (lines 38-40) with a call to `setEntrySelectionIcon(entry, false)`.

---

### [2] DRY-01 - Duplicated code block

**What:** The book drop-target handlers repeat the same "if a book is being dragged, update the target highlight and return; otherwise only do the same work when entry selection mode is active" pattern. The repeated branching makes the drag state rules harder to read and easier to drift apart later.

**Where:**
- `src/book-browser/book-list/book-list.selection-dnd.js`, lines 174-183 - add the drop-target highlight during drag-over
- `src/book-browser/book-list/book-list.selection-dnd.js`, lines 185-192 - remove the drop-target highlight during drag-leave

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `updateBookDropTargetState(book, shouldHighlight)` near the drop-target handlers.
- [x] Replace the first copy (lines 175-182) with a call to the shared helper after the guard conditions are resolved.
- [x] Replace the second copy (lines 186-191) with a call to the shared helper after the guard conditions are resolved.

---

### [3] DRY-02 - Magic value

**What:** The value `.stwid--selector > .stwid--icon` appears 3 times. It represents the CSS selector for the entry selection icon and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 15
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 30
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 38

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const ENTRY_SELECTION_ICON_SELECTOR = '.stwid--selector > .stwid--icon';`
- [x] Replace each occurrence of the raw literal with `ENTRY_SELECTION_ICON_SELECTOR`.

---

### [4] DRY-02 - Magic value

**What:** The value `fa-square` appears 3 times. It represents the icon class for an unselected entry and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 16
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 31
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 39

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const UNSELECTED_ENTRY_ICON_CLASS = 'fa-square';`
- [x] Replace each occurrence of the raw literal with `UNSELECTED_ENTRY_ICON_CLASS`.

---

### [5] DRY-02 - Magic value

**What:** The value `stwid--state-target` appears 6 times. It represents the CSS class for a highlighted drop target and should be a named constant.

**Where:**
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 20
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 22
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 177
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 182
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 187
- `src/book-browser/book-list/book-list.selection-dnd.js`, line 191

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const DROP_TARGET_CLASS = 'stwid--state-target';`
- [x] Replace each occurrence of the raw literal with `DROP_TARGET_CLASS`.

---

### [6] NAME-01 - Shape-based name

**What:** `item` (line 12) describes the variable's shape rather than its purpose. Reading the name alone does not tell you that it is a selected entry row being cleared.

**Where:** `src/book-browser/book-list/book-list.selection-dnd.js`, line 12

**Steps to fix:**
- [x] Rename `item` to `selectedEntry` everywhere it appears in this callback.

---

### [7] NAME-01 - Shape-based name

**What:** `book` (line 174) describes the variable's type rather than its role. Reading the name alone does not tell you that it is the current book row being used as a drop target.

**Where:** `src/book-browser/book-list/book-list.selection-dnd.js`, line 174

**Steps to fix:**
- [x] Rename `book` to `targetBookRow` everywhere it appears in the drop-target handlers in this file.

---

### [8] SIZE-01 - Large function

**What:** `createSelectionDnDSlice` is 281 lines long (lines 3-283). It is doing too much: it builds selection helpers and also handles entry move/copy orchestration and also handles book and folder drag-drop events and also exposes state accessors.

**Where:** `src/book-browser/book-list/book-list.selection-dnd.js`, lines 3-283

**Steps to fix:**
- [x] Extract the selection UI helpers (lines 8-54) into a new function named `createSelectionStateHelpers()`. It should build the functions that add, remove, clear, and preserve selected entries.
- [x] Extract the entry transfer flow (lines 56-172) into a new function named `createEntryTransferHandlers()`. It should own the move/copy logic and the SillyTavern event subscription cleanup.
- [x] Extract the drag-drop handlers (lines 174-235) into a new function named `createBookDropHandlers()`. It should return the handlers for book, folder, and root drop targets.
- [x] Replace the extracted blocks in `createSelectionDnDSlice` with calls to the new functions.

---

### [9] SIZE-01 - Large function

**What:** `moveOrCopySelectedEntriesToBook` is 117 lines long (lines 56-172). It is doing too much: it sets up concurrent-update watching and also copies entry data between books and also deletes source entries and also saves both books and also shows partial-failure messages.

**Where:** `src/book-browser/book-list/book-list.selection-dnd.js`, lines 56-172

**Steps to fix:**
- [x] Extract the event subscription setup (lines 67-83) into a new function named `watchEntryTransferBooks(targetBookName, sourceBookName, isCopy)`. It should start watching the relevant lorebooks and return the cleanup pieces.
- [x] Extract the per-entry transfer loop (lines 92-130) into a new function named `transferSelectedEntries(srcBook, dstBook, isCopy, hasConcurrentBookUpdate)`. It should copy entries, attempt source deletion when needed, and return the transfer result flags.
- [x] Extract the save-and-notify phase (lines 136-161) into a new function named `finalizeEntryTransfer(result, sourceBookName, targetBookName, srcBook, dstBook, isCopy)`. It should save changed books, update runtime state, and handle partial-failure toasts.
- [x] Replace the extracted blocks in `moveOrCopySelectedEntriesToBook` with calls to the new functions.

---

### [10] NEST-01 - Deep nesting

**What:** Inside `moveOrCopySelectedEntriesToBook`, the block starting at line 112 reaches 6 levels of indentation. The innermost logic is hard to follow because the reader must hold 6 contexts in memory simultaneously.

**Where:** `src/book-browser/book-list/book-list.selection-dnd.js`, lines 112-122 (deepest point: line 120)

**Steps to fix:**
- [x] Extract the inner block (lines 112-128) into a new function named `tryDeleteTransferredSourceEntry(srcBook, uid)`. It should attempt the source deletion, clean up original-data state when deletion succeeds, and report whether the delete worked.
- [x] Replace the inner block with a call to `tryDeleteTransferredSourceEntry(...)`.

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/book-browser/book-list/book-list.selection-dnd.js`
- Added named constants for the selection icon selector, the unselected icon class, and the drop-target class so the file no longer repeats raw UI strings.
- Extracted small helpers for selection icon updates, selection state management, entry transfer watching and finalization, source-entry deletion, and book drop-target highlighting.
- Split the large slice factory into smaller focused builders so selection logic, move/copy logic, and drag-drop wiring are separated but still returned through the same public API.

### Risks / What might break

- The move/copy flow now passes through several helper functions, so any future edit that changes the helper inputs without updating all call sites could break entry transfers.
- The book-row highlight now goes through a shared helper, so if a non-book element ever starts using the same handler shape it may need its own logic.
- Partial move failures still depend on the surrounding runtime helpers behaving the same way, so changes in the host app’s delete/save behavior could alter what stays selected after a failed move.

### Manual checks

- Select multiple entries in one lorebook, drag them to another lorebook, and confirm the entries appear in the destination and the selection clears when the move succeeds.
- Copy selected entries with `Ctrl` held during drop, and confirm the destination gets duplicates while the source entries stay in place.
- Drag a lorebook over another lorebook and away again, and confirm the highlight appears on hover and disappears on leave or drop.
