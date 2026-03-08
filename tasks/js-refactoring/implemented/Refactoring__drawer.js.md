# REFACTORING: drawer.js
*Created: July 3, 2026*

**File:** `src/drawer.js`
**Findings:** 13 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 3 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 3 |
| Deep nesting | NEST-01 | 2 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **13** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The same "safe event target element" logic is written twice. Keeping two copies makes it easier for them to drift apart later (one gets fixed, the other is forgotten).

**Where:**
- `src/drawer.js`, line 155 - get a safe `HTMLElement` from `evt.target` inside `onDrawerKeydown`
- `src/drawer.js`, line 382 - get a safe `HTMLElement` from `evt.target` inside the editor click handler

**Steps to fix:**
- [x] Extract the shared pattern into a new helper function named `getEventTargetElement(evt)` near the top of the file (or near the top of `initDrawer`).
- [x] Replace the first copy (line 155) with `const target = getEventTargetElement(evt);`.
- [x] Replace the second copy (line 382) with `const target = getEventTargetElement(evt);`.

---

### [2] DRY-01 - Duplicated code block

**What:** The same "if this value is an element, set its hidden state" block is repeated four times. This is easy to miss when making changes (for example, adding a new control means copying yet another block).

**Where:**
- `src/drawer.js`, lines 442-445 - hide/show `dom.folderControls.group`
- `src/drawer.js`, lines 446-449 - hide/show `dom.folderControls.add`
- `src/drawer.js`, lines 450-453 - hide/show `dom.folderControls.import`
- `src/drawer.js`, lines 454-457 - hide/show `dom.folderControls.collapseAll`

**Steps to fix:**
- [x] Extract the shared pattern into a new helper function named `setHiddenIfElement(el, hidden)` near the top of `initDrawer`.
- [x] Replace each repeated block (lines 442-457) with calls like `setHiddenIfElement(dom.folderControls.group, !visible)`.
- [x] Optional: store the elements in a small array and loop, so adding future controls is a one-line change.

---

### [3] DRY-02 - Magic value

**What:** The value `'stwid--filter-query'` appears 2 times. It represents the CSS class used to mark items hidden by a query filter and should be a named constant.

**Where:**
- `src/drawer.js`, line 183
- `src/drawer.js`, line 187

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const FILTER_QUERY_CLASS = 'stwid--filter-query';`
- [x] Replace each occurrence of the raw literal with `FILTER_QUERY_CLASS`.

---

### [4] DRY-02 - Magic value

**What:** The value `'stwid--'` appears 2 times. It represents the CSS class used to mark the drawer UI as active and should be a named constant.

**Where:**
- `src/drawer.js`, line 228
- `src/drawer.js`, line 395

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const DRAWER_ACTIVE_CLASS = 'stwid--';`
- [x] Replace each occurrence of the raw literal with `DRAWER_ACTIVE_CLASS`.

---

### [5] DRY-02 - Magic value

**What:** The value `'style'` appears 2 times. It represents the HTML attribute name used to detect visibility changes on the drawer and should be a named constant.

**Where:**
- `src/drawer.js`, line 411
- `src/drawer.js`, line 432

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const STYLE_ATTRIBUTE = 'style';`
- [x] Replace each occurrence of the raw literal with `STYLE_ATTRIBUTE` (including `attributeFilter: [STYLE_ATTRIBUTE]`).

---

### [6] NAME-01 - Shape-based name

**What:** `is` (line 395) describes its shape (a boolean) rather than its purpose. Reading the name alone does not tell you what is true or false.

**Where:** `src/drawer.js`, line 395

**Steps to fix:**
- [x] Rename `is` to `isDrawerActive` everywhere it appears in this function block.
- [x] Verify the rename does not change meaning (it should still reflect the return value of `classList.toggle(...)`).

---

### [7] NAME-01 - Shape-based name

**What:** `group` (line 442) describes its shape (some grouped thing) rather than its purpose. It is actually the folder controls group element.

**Where:** `src/drawer.js`, line 442

**Steps to fix:**
- [x] Rename `group` to `folderControlsGroupEl` everywhere it appears in this function.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [8] NAME-01 - Shape-based name

**What:** `add` (line 446) describes an action rather than what this value is. It is actually the "add folder" (or similar) button element.

**Where:** `src/drawer.js`, line 446

**Steps to fix:**
- [x] Rename `add` to `addFolderButtonEl` everywhere it appears in this function.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [9] SIZE-01 - Large function

**What:** `initDrawer` is 437 lines long (lines 28-464). It is doing too much: setting up the shared `dom` structure and state and also wiring event listeners and also constructing/mounting UI and also configuring child modules and also returning the public API.

**Where:** `src/drawer.js`, lines 28-464

**Steps to fix:**
- [x] Extract the initial DOM/state setup (lines 29-122) into a new function named `createDrawerRuntimeState()` that returns `{ dom, activationBlock, activationBlockParent, entryStateSaveQueueByBook, enqueueEntryStateSave }`.
- [x] Extract the drawer mounting logic (lines 124-433) into a new function named `mountDrawerUI(...)` that returns `{ listPanelApi, editorPanelApi, selectionState }`.
- [x] Extract the public API object creation (lines 437-463) into a new function named `buildDrawerApi(...)` so the return section stays short and easy to scan.
- [x] Replace the extracted blocks in `initDrawer` with calls to the new functions.

---

### [10] SIZE-01 - Large function

**What:** `addDrawer` is 310 lines long (lines 124-433). It is doing too much: initializing the entry manager and also registering global event listeners and also building DOM nodes and also wiring UI callbacks and also setting up mutation observers.

**Where:** `src/drawer.js`, lines 124-433

**Steps to fix:**
- [x] Extract entry manager initialization (lines 125-146) into a new function named `initDrawerEntryManager(...)`. One sentence: it creates and returns `{ openEntryManager, refreshEntryManagerScope }`.
- [x] Extract keyboard handler setup (lines 148-216) into a new function named `installDrawerKeyboardShortcuts(...)`. One sentence: it registers `keydown` and returns a cleanup function.
- [x] Extract the DOM creation/mounting block (lines 230-390) into a new function named `buildAndAttachDrawerDom(...)`. One sentence: it creates the drawer body/list/editor elements, attaches them, and returns any needed handles.
- [x] Extract mutation observer setup (lines 404-432) into a new function named `installDrawerObservers(...)`. One sentence: it watches for book select changes and drawer open/close changes.
- [x] Replace the extracted blocks in `addDrawer` with calls to the new functions.

---

### [11] SIZE-01 - Large function

**What:** `onDrawerKeydown` is 68 lines long (lines 148-215). It is doing too much: checking whether the drawer should handle the key press and also checking for text editing and selection state and also handling delete confirmation and also performing deletion and saving.

**Where:** `src/drawer.js`, lines 148-215

**Steps to fix:**
- [x] Extract the "should we handle this keydown at all?" checks (lines 150-162) into a new function named `shouldHandleDrawerKeydown(evt)`. One sentence: it returns true only when the drawer is the active focus target and the user is not typing in an input.
- [x] Extract the selection visibility logic (lines 178-189) into a new function named `isSelectionVisible(cache, bookName, selectedUids)`. One sentence: it returns true if all selected entries are currently visible under the active filters.
- [x] Extract the delete-and-save sequence (lines 199-211) into a new function named `deleteSelectedEntriesAndSave(selectFrom, selectedUids)`. One sentence: it deletes the selected entries, saves the book, updates change tracking, and clears selection.
- [x] Replace the extracted blocks in `onDrawerKeydown` with calls to the new functions.

---

### [12] NEST-01 - Deep nesting

**What:** Inside `onDrawerKeydown`, the selection visibility logic reaches 4+ levels of indentation. The innermost logic is hard to follow because the reader must hold multiple nested contexts in memory at the same time.

**Where:** `src/drawer.js`, lines 165-189 (deepest point: lines 185-188)

**Steps to fix:**
- [x] Extract the inner `selectedUids.every((uid)=>{ ... })` block (lines 185-188) into a new function named `isEntryVisible(cache, bookName, uid)`. One sentence: it returns true if the entry exists and is not hidden by the query filter.
- [x] Replace the inner block with `return selectedUids.every((uid) => isEntryVisible(cache, selectFrom, uid));`.
- [x] If the filter checks expand in the future, consider extracting `isBookVisibleUnderFilters(...)` as well.

---

### [13] NEST-01 - Deep nesting

**What:** Inside `addDrawer`, the DOM construction/mounting section uses nested block scopes that reach 4+ levels of indentation. This makes it harder to scan and increases the chance of mismatching braces when editing.

**Where:** `src/drawer.js`, lines 230-390 (deepest point: lines 261-266)

**Steps to fix:**
- [x] Extract the nested "build list panel container and controls" block (lines 235-266) into a new function named `buildDrawerListContainer(dom, cache, listPanelApiGetters, helpers)`. One sentence: it creates the list container element and its top controls area.
- [x] Extract the "build editor container" block (lines 378-387) into a new function named `buildDrawerEditorContainer(dom, wiHandlerApi)`. One sentence: it creates the editor element and installs the duplicate-entry click handler.
- [x] Replace the nested blocks in `addDrawer` with calls to the new functions, so `addDrawer` reads as a short sequence of high-level steps.

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/drawer.js`
- Pulled the large setup sections out of `initDrawer` into smaller helper functions so the main startup flow reads as a short sequence.
- Reused shared helpers for event-target lookup, hidden-state updates, filter class names, drawer active class name, and style attribute checks.
- Split the keyboard delete logic, DOM building, entry manager startup, and mutation observers into focused functions with clearer names.

### Risks / What might break

- The drawer startup order was reorganized, so any hidden dependency on the old local variable timing could surface when the drawer first opens.
- The keyboard delete flow now passes through helper functions, so a missed argument would show up as delete not working or not prompting correctly.
- The close/open observer logic now uses shared constants and helper functions, so any missed selector or null case would affect drawer reopen behavior.

### Manual checks

- Open the World Info drawer. Success looks like the book list, sorting row, and editor panel all appearing exactly as before.
- Select one or more entries and press `Delete`. Success looks like visible entries deleting immediately and hidden filtered entries showing the confirmation prompt first.
- Close and reopen the drawer with an entry selected. Success looks like the splitter size restoring and the selected entry reopening unless the editor has unsaved changes.
- Toggle the folder controls feature visibility. Success looks like all folder control buttons hiding and showing together.

---
