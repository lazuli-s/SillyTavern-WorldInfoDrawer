# REFACTORING: table.body.js
*Created: July 3, 2026*

**File:** `src/entry-manager/table/table.body.js`
**Findings:** 12 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 3 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 2 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **12** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The logic to "move a row in the filtered list, then update the saved custom order" is written twice (once for single-click, once for double-click). This makes it easy for the two behaviors to drift apart over time (a bug fix in one place may be forgotten in the other).

**Where:**
- `src/entry-manager/table/table.body.js`, lines 217-232 - single-click: compute neighbor row and move `tr`, then call `updateCustomOrderFromDom()`
- `src/entry-manager/table/table.body.js`, lines 241-252 - double-click: compute first/last row and move `tr`, then call `updateCustomOrderFromDom()`

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `moveRowAndSyncCustomOrder({ row, direction, mode })` near `createMoveButton` (or near the top of `buildTableBody`).
- [x] In the click handler (lines 217-232), replace the duplicated block with a call to `moveRowAndSyncCustomOrder({ row: tr, direction, mode: 'step' })`.
- [x] In the dblclick handler (lines 241-252), replace the duplicated block with a call to `moveRowAndSyncCustomOrder({ row: tr, direction, mode: 'jump' })`.
- [x] Inside `moveRowAndSyncCustomOrder`, keep the "filtered/visible rows" guard checks and keep the final `updateCustomOrderFromDom()` call in exactly one place.

---

### [2] DRY-01 - Duplicated code block

**What:** The "create a text input with the same styling classes and the same change listener shape" pattern is repeated for multiple columns (outlet, group, automationId). Repeating this UI wiring makes the code longer and harder to scan.

**Where:**
- `src/entry-manager/table/table.body.js`, lines 426-455 - outlet name text input
- `src/entry-manager/table/table.body.js`, lines 468-489 - group text input
- `src/entry-manager/table/table.body.js`, lines 546-566 - automationId text input

**Steps to fix:**
- [x] Extract a shared helper function near the top of the file named `buildTextInput({ name, tooltip, getValue, onChange })`.
- [x] Make `buildTextInput` create the `<input>` element, apply common classes, set `name`, set tooltip, set `type = 'text'`, set initial value from `getValue()`, and attach a `change` handler that calls `onChange(nextValue)`.
- [x] Replace the outlet/group/automationId input creation blocks with calls to `buildTextInput(...)`, leaving only the cell-specific code (for example: syncing filters, hiding the outlet wrapper, etc.) in the caller.

---

### [3] DRY-02 - Magic value

**What:** The value `'text_pole'` appears 4 times. It represents "use SillyTavern's standard text input styling" and should be a named constant so the meaning is clear and changes are easier later.

**Where:**
- `src/entry-manager/table/table.body.js`, line 42
- `src/entry-manager/table/table.body.js`, line 428
- `src/entry-manager/table/table.body.js`, line 470
- `src/entry-manager/table/table.body.js`, line 548

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const TEXT_POLE_CLASS = 'text_pole';`
- [x] Replace each occurrence of the raw literal `'text_pole'` with `TEXT_POLE_CLASS`.

---

### [4] DRY-02 - Magic value

**What:** The value `'stwid--state-filtered'` appears 3 times. It represents "this row is currently filtered out" and should be a named constant so it is obvious that all checks refer to the same state.

**Where:**
- `src/entry-manager/table/table.body.js`, line 112
- `src/entry-manager/table/table.body.js`, line 219
- `src/entry-manager/table/table.body.js`, line 242

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const STATE_FILTERED_CLASS = 'stwid--state-filtered';`
- [x] Replace each occurrence of the raw literal `'stwid--state-filtered'` with `STATE_FILTERED_CLASS`.

---

### [5] DRY-02 - Magic value

**What:** The value `'stwid--orderInputTight'` appears 3 times. It represents a specific compact input style for the Entry Manager table, and should be a named constant to make the repeated styling intent clear.

**Where:**
- `src/entry-manager/table/table.body.js`, line 429
- `src/entry-manager/table/table.body.js`, line 471
- `src/entry-manager/table/table.body.js`, line 549

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const ORDER_INPUT_TIGHT_CLASS = 'stwid--orderInputTight';`
- [x] Replace each occurrence of the raw literal `'stwid--orderInputTight'` with `ORDER_INPUT_TIGHT_CLASS`.

---

### [6] NAME-01 - Shape-based name

**What:** `inp` (line 41) describes the element's type ("input") rather than its purpose. This file uses multiple inputs with very different jobs (numbers, outlet name, group, automationId), so a more specific name helps readers understand intent.

**Where:** `src/entry-manager/table/table.body.js`, line 41

**Steps to fix:**
- [x] Rename `inp` to `inputEl` (or a purpose-based name like `numberInput`) everywhere it appears in `buildNumberInputCell`.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [7] NAME-01 - Shape-based name

**What:** `e` (line 153) describes neither what the value is nor what it is used for. Reading the name alone does not tell you that it is an "entry row model" (book + entry data) being rendered into a table row.

**Where:** `src/entry-manager/table/table.body.js`, line 153

**Steps to fix:**
- [x] Rename `e` to `entryRow` (or `entryInfo`) everywhere it appears in this function.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [8] NAME-01 - Shape-based name

**What:** `wrap` (line 315) describes the element's shape ("wrapper") rather than its purpose. This name is also reused for multiple different wrappers in the same large function, which makes it harder to search and debug.

**Where:** `src/entry-manager/table/table.body.js`, line 315

**Steps to fix:**
- [x] Rename this `wrap` to something purpose-based like `entryCellWrap`.
- [x] For other `wrap` variables in this function (for example: lines 423, 464, 580, 614, 642), rename them to purpose-based names like `outletWrap`, `groupWrap`, `recursionWrap`, `budgetWrap`, `characterFilterWrap`.

---

### [9] SIZE-01 - Large function

**What:** `buildTableBody` is 592 lines long (lines 91-682). It is doing too much: it sets up sorting behavior and also builds every table row/cell and also wires up many different event handlers and also applies all filters at the end.

**Where:** `src/entry-manager/table/table.body.js`, lines 91-682

**Steps to fix:**
- [x] Extract the "template lookup and validation" block (lines 102-108) into a new function named `getEntryEditTemplates()` that returns the required templates (or throws).
- [x] Extract the sortable setup (lines 110-150) into a new function named `setupEntryManagerSorting({ tbody, dom, cache, enqueueSave, setEntryManagerSort, SORT, SORT_DIRECTION, getSortableDelay, $, getEntryManagerRows })`.
- [x] Extract the row construction loop (starting at line 153) into a new function named `buildEntryManagerRow({ entryRow, dom, cache, enqueueSave, ... })` that returns the created `<tr>`.
- [x] SKIPPED — kept the per-column logic grouped inside `buildEntryManagerRow`; the main refactor reduced `buildTableBody` to orchestration without adding another layer of tiny helpers.
- [x] Replace the extracted blocks in `buildTableBody` with calls to the new functions, keeping `buildTableBody` as an orchestration function.

---

### [10] SIZE-01 - Large function

**What:** `createMoveButton` is 55 lines long (lines 201-255). It is doing too much: it builds the button UI and also manages single-click vs double-click timing and also contains the row movement logic.

**Where:** `src/entry-manager/table/table.body.js`, lines 201-255

**Steps to fix:**
- [x] Extract the button DOM creation (lines 202-209) into a new function named `buildMoveButton({ iconClass, tooltipText })` that returns the `<button>`.
- [x] Extract the shared "move row and update custom order" logic (used by both click modes) into a new function named `moveRowAndSyncCustomOrder(...)` (see finding [1]).
- [x] Replace the extracted blocks in `createMoveButton` with calls to the new functions.

---

### [11] NEST-01 - Deep nesting

**What:** Inside `createMoveButton`, the click handler block reaches more than 3 levels of indentation. The innermost logic is hard to follow because the reader must hold multiple contexts in memory simultaneously (event handler, timeout callback, and multiple guard checks).

**Where:** `src/entry-manager/table/table.body.js`, lines 211-233 (deepest point: line 227)

**Steps to fix:**
- [x] Extract the inner timeout callback block (lines 218-232) into a new function named `moveRowByOneStepInFilteredList({ row, direction })`. One sentence: it moves the row up/down by one visible row and then syncs the saved custom order.
- [x] Replace the body of the timeout callback with a call to `moveRowByOneStepInFilteredList(...)`.

---

### [12] NEST-01 - Deep nesting

**What:** Inside `buildTableBody`, the recursion checkbox builder has very deep nesting due to nested element creation blocks and an inner event handler. This makes it difficult to see the "main idea" (build one checkbox row, wire it to save and filter behavior).

**Where:** `src/entry-manager/table/table.body.js`, lines 582-602 (deepest point: line 595)

**Steps to fix:**
- [x] Extract the inner "create one checkbox row and wire its change handler" block into a new function named `buildRecursionOptionRow({ entryRow, tr, key, label, cache, enqueueSave, applyEntryManagerRecursionFilterToRow })`. One sentence: it builds and returns the `<label>` element for one recursion option.
- [x] In `addCheckbox` (lines 582-602), replace the nested DOM-building block with a call to `buildRecursionOptionRow(...)` and append its result to `wrap`.

---

## After Implementation
*Implemented: March 10, 2026*

### What changed

`src/entry-manager/table/table.body.js`
- Added named constants for repeated CSS class strings used by the Entry Manager table.
- Extracted shared helpers for template lookup, sortable setup, text inputs, move buttons, row movement, recursion rows, and full row construction.
- Reduced `buildTableBody` to orchestration so the main render flow is easier to read and maintain.

### Risks / What might break

- The row move buttons now depend on shared helpers, so a mistake there would affect both single-click and double-click move behavior.
- The text input fields for outlet, group, and automation ID now share one builder, so any future styling or event changes in that helper will affect all three fields.
- `buildEntryManagerRow` still contains several column sections, so future edits inside that function should be checked carefully for unintended UI side effects.

### Manual checks

- Open Entry Manager and use the up/down move buttons with single-click and double-click. Success looks like rows moving one step or jumping to the top/bottom, and the custom order staying saved after refresh.
- Edit the outlet, group, and automation ID fields. Success looks like the value saving correctly and the matching filters updating immediately.
- Toggle recursion checkboxes and the ignore-budget checkbox. Success looks like the row state saving correctly and recursion filters reacting without errors.
