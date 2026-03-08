# REFACTORING: book-list.world-entry.js
*Created: March 7, 2026*

**File:** `src/book-browser/book-list/book-list.world-entry.js`
**Findings:** 7 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 0 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 1 |
| **Total** | | **7** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The file repeats the same "change cached entry state, disable the control, try to save, then roll back on failure" flow twice. That makes future fixes easy to miss because both copies have to stay in sync.

**Where:**
- `src/book-browser/book-list/book-list.world-entry.js`, lines 150-171 - save flow for the enable or disable toggle
- `src/book-browser/book-list/book-list.world-entry.js`, lines 183-221 - save flow for the strategy dropdown

**Steps to fix:**
- [x] Extract the shared save and rollback pattern into a new function named `runEntryStateSave(action)` near the top of the file.
- [x] Replace the first copy (lines 150-171) with a call to `runEntryStateSave(...)`.
- [x] Replace the second copy (lines 183-221) with a call to `runEntryStateSave(...)`.

---

### [2] NAME-01 - Shape-based name

**What:** `e` (line 17) describes a short data shape rather than its purpose. Reading the name alone does not tell you that it holds the current world entry.

**Where:** `src/book-browser/book-list/book-list.world-entry.js`, line 17

**Steps to fix:**
- [x] Rename `e` to `worldEntry` everywhere it appears in this file.
- [x] If it is referenced in other files, search for it project-wide before renaming.

---

### [3] NAME-01 - Shape-based name

**What:** `sel` (line 36) describes a shortened shape instead of the element's job. The reader has to inspect the block to learn that this is the entry selection button.

**Where:** `src/book-browser/book-list/book-list.world-entry.js`, line 36

**Steps to fix:**
- [x] Rename `sel` to `selectorButton` everywhere it appears in this file.

---

### [4] NAME-01 - Shape-based name

**What:** `strat` (line 175) is shorthand for a type of value, not the role it plays. The name does not clearly say that this control changes the entry strategy.

**Where:** `src/book-browser/book-list/book-list.world-entry.js`, line 175

**Steps to fix:**
- [x] Rename `strat` to `strategySelect` everywhere it appears in this file.

---

### [5] SIZE-01 - Large function

**What:** `renderEntry` is 243 lines long (lines 17-259). It is doing too much: building the entry row DOM, wiring selection behavior, wiring save controls, and also opening the editor and drag behavior.

**Where:** `src/book-browser/book-list/book-list.world-entry.js`, lines 17-259

**Steps to fix:**
- [x] Extract selector UI creation (lines 36-107) into a new function named `buildEntrySelector()`. It should create the selector button and attach its click behavior.
- [x] Extract body content creation (lines 108-123) into a new function named `buildEntryBody()`. It should render the comment and key text areas.
- [x] Extract status control creation (lines 124-225) into a new function named `buildEntryStatusControls()`. It should build the enable toggle and strategy dropdown.
- [x] Extract row-level click and drag listeners (lines 231-254) into a new function named `attachEntryInteractionHandlers()`. It should wire editor opening and drag preparation.
- [x] Replace the extracted blocks in `renderEntry` with calls to the new functions.

---

### [6] NEST-01 - Deep nesting

**What:** Inside `renderEntry`, the block starting at line 44 reaches 7 levels of indentation. The innermost logic is hard to follow because the reader must hold 7 contexts in memory at the same time.

**Where:** `src/book-browser/book-list/book-list.world-entry.js`, lines 44-77 (deepest point: line 75)

**Steps to fix:**
- [x] Extract the inner block that builds the help toast list (lines 64-79) into a new function named `buildSelectionHelpToast()`. It should return the finished help list element.
- [x] Extract the shift-range selection block (lines 46-58) into a new function named `selectEntryRange(startRow, endRow, entryList)`. It should add every entry in the range to the selection state.
- [x] Replace the inner blocks with calls to the new functions.

---

### [7] DEAD-01 - Dead code

**What:** `evt` is declared at line 232 but is never referenced anywhere else in this file.

**Where:** `src/book-browser/book-list/book-list.world-entry.js`, line 232

**Steps to fix:**
- [x] Remove the unused `evt` parameter from the click handler on line 232.

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/book-browser/book-list/book-list.world-entry.js`
- Split the long entry row renderer into smaller helper functions for selection UI, body content, status controls, and row interaction wiring.
- Replaced repeated save calls with a shared `runEntryStateSave(action)` helper and kept the rollback behavior in the individual controls.
- Renamed short local variables to purpose-based names like `worldEntry`, `selectorButton`, and `strategySelect`, and removed the unused click event parameter.

### Risks / What might break

- If any other code was informally relying on the old in-function structure, future manual merges could be harder until they are rebased onto this version.
- The selection and status helpers now pass data through function arguments, so a missed argument in later edits could break entry clicks or selection behavior.
- The shared save helper still depends on the same context save functions, so any existing save timing issue outside this file would still affect both controls.

### Manual checks

- Reload the browser tab, open a lorebook, and click several entries. Success looks like the editor still opens for the clicked entry.
- Click one entry selector, then Shift-click another. Success looks like the full range becomes selected and the help toast still appears on first selection.
- Toggle an entry on and off and change its strategy. Success looks like the icon and dropdown update immediately and stay correct after the save finishes.

---
