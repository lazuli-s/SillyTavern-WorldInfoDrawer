# REFACTORING: bulk-edit-row.order.js
*Created: July 3, 2026*

**File:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`
**Findings:** 10 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 3 |
| Shape-based naming | NAME-01 | 4 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **10** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The file builds two number inputs ("Start" and "Spacing") using almost the same steps (create label, attach tooltip, create input, set min/max, load from localStorage, save back to localStorage on change). This makes future changes easy to miss because you have to edit two separate blocks.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, lines 74-89 -- build and persist the "Start" input
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, lines 91-106 -- build and persist the "Spacing" input

**Steps to fix:**
- [ ] Extract the shared pattern into a new helper function named `buildPersistedNumberInput({ labelText, tooltipText, storageKey, defaultValue, maxValue, onDirty })` near the top of the file.
- [ ] Replace the first copy (lines 74-89) with a call to `buildPersistedNumberInput(...)`, assign the returned input to `dom.order.start`, and append the returned label to `startSpacingPair`.
- [ ] Replace the second copy (lines 91-106) with a call to `buildPersistedNumberInput(...)`, assign the returned input to `dom.order.step`, and append the returned label to `startSpacingPair`.
- [ ] Keep the "mark apply button dirty" behavior (lines 109-110), either by keeping those listeners in the main function or by passing an `onDirty` callback into the helper.

---

### [2] DRY-02 - Magic value

**What:** The value `'stwid--order-direction'` appears 3 times. It represents the shared identifier for the order direction radio group (and also the CSS class passed into `buildDirectionRadio`) and should be a named constant to avoid typos and make changes safer.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 116
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 124
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 134

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const ORDER_DIRECTION_GROUP = 'stwid--order-direction';`
- [ ] Replace each occurrence of the raw literal with `ORDER_DIRECTION_GROUP` (both the `directionRadioGroupName` assignment and the 5th argument to `buildDirectionRadio`).

---

### [3] DRY-02 - Magic value

**What:** The value `'stwid--order-start'` appears 2 times. It represents the localStorage key used to remember the user's chosen start value and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 84
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 86

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const ORDER_START_STORAGE_KEY = 'stwid--order-start';`
- [ ] Replace each occurrence of the raw literal with `ORDER_START_STORAGE_KEY`.

---

### [4] DRY-02 - Magic value

**What:** The value `'stwid--order-step'` appears 2 times. It represents the localStorage key used to remember the user's chosen spacing value and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 101
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 103

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const ORDER_STEP_STORAGE_KEY = 'stwid--order-step';`
- [ ] Replace each occurrence of the raw literal with `ORDER_STEP_STORAGE_KEY`.

---

### [5] NAME-01 - Shape-based name

**What:** `up` (line 45) describes a direction label rather than what the boolean actually means in the logic. The value is used to set `{ reverse: up }`, so the name should explain that it controls reversing the target list.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 45

**Steps to fix:**
- [ ] Rename `up` to `shouldReverseTargets` everywhere it appears in this file.

---

### [6] NAME-01 - Shape-based name

**What:** `tr` (line 50) describes the HTML tag type ("table row") instead of its purpose in this feature. A purpose-based name makes it clearer that this is the row element for the current entry being updated.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 50

**Steps to fix:**
- [ ] Rename `tr` to `entryRowEl` everywhere it appears in this file.

---

### [7] NAME-01 - Shape-based name

**What:** `start` (line 78) is the input element for the start value, but the name is easy to confuse with the numeric `start` value used earlier (line 32). Using a purpose-based name reduces the chance of mistakes when editing this code.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 78

**Steps to fix:**
- [ ] Rename this DOM variable `start` to `startInputEl` everywhere it appears in this file.
- [ ] Consider also renaming the numeric `start` (line 32) to `startValue` to make the two meanings clearly different.

---

### [8] NAME-01 - Shape-based name

**What:** `step` (line 95) is the input element for the spacing value, but the name is easy to confuse with the numeric `step` value used earlier (line 33). Using a purpose-based name reduces the chance of mistakes when editing this code.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, line 95

**Steps to fix:**
- [ ] Rename this DOM variable `step` to `stepInputEl` everywhere it appears in this file.
- [ ] Consider also renaming the numeric `step` (line 33) to `stepValue` to make the two meanings clearly different.

---

### [9] SIZE-01 - Large function

**What:** `buildBulkOrderSection` is 122 lines long (lines 23-144). It is doing too much: it builds the UI elements and also wires up persistence to localStorage and also defines and binds the apply handler logic.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, lines 23-144

**Steps to fix:**
- [ ] Extract the apply handler creation (lines 30-63) into a new function named `createRunApplyOrder({ dom, cache, isEntryManagerRowSelected, saveWorldInfo, buildSavePayload, applyOrder })`. It should return the `runApplyOrder` function.
- [ ] Extract the start/spacing input UI construction (lines 71-110) into a new function named `buildOrderStartSpacingControls({ dom, applyOrder })`. It should return the `startSpacingPair` element.
- [ ] Extract the direction UI construction (lines 112-140) into a new function named `buildOrderDirectionControls({ dom, applyOrder })`. It should return the `directionGroup` element.
- [ ] Keep `buildBulkOrderSection` as an orchestration function that calls the helpers and appends their returned DOM elements in order.

---

### [10] NEST-01 - Deep nesting

**What:** Inside `runApplyOrder` (specifically inside the `async()=>{ ... }` callback passed to `withApplyButtonLock`), the for-loop block starting at line 49 reaches 4+ levels of indentation (for-loop, then if, then awaited promise). The inner logic is harder to follow because the reader must keep multiple nested contexts in mind at the same time.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js`, lines 49-58 (deepest point: line 57)

**Steps to fix:**
- [ ] Extract the "pause every N items" logic (lines 56-58) into a new function named `maybeYieldToEventLoop(index, batchSize)`. It should return a promise you can `await` (or be an `async` function).
- [ ] Replace the inline nested `if` block with `await maybeYieldToEventLoop(i, BULK_APPLY_BATCH_SIZE);` inside the loop.