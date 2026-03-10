# REFACTORING: bulk-edit-row.sections.js
*Created: July 3, 2026*

**File:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`
**Findings:** 13 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 5 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 2 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **13** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The "bulk non-negative number input + apply button" section pattern is repeated three times. This makes future changes risky because the same fix would need to be applied in multiple places.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, lines 146-193 - Sticky section (persisted number input, apply via `runApplyNonNegativeIntegerField`, dirty tracking)
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, lines 194-241 - Cooldown section (same structure with different field names/messages)
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, lines 242-289 - Delay section (same structure with different field names/messages)

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `buildBulkNonNegativeIntegerSection({ id, label, description, storageKey, entryField, rowInputName, emptyValueWarning, invalidValueWarning, dom, cache, isEntryManagerRowSelected, saveWorldInfo, buildSavePayload, applyRegistry })` near the top of the file.
- [x] Extract the shared pattern into a new function named `buildBulkNonNegativeIntegerSection({ id, label, description, storageKey, entryField, rowInputName, emptyValueWarning, invalidValueWarning, dom, cache, isEntryManagerRowSelected, saveWorldInfo, buildSavePayload, applyRegistry })` near the top of the file.
- [x] Replace the Sticky copy (lines 146-193) with a call to `buildBulkNonNegativeIntegerSection(...)`.
- [x] Replace the Cooldown copy (lines 194-241) with a call to `buildBulkNonNegativeIntegerSection(...)`.
- [x] Replace the Delay copy (lines 242-289) with a call to `buildBulkNonNegativeIntegerSection(...)`.

---

### [2] DRY-02 - Magic value

**What:** The value `'stwid--recursionOptions'` appears 4 times. It represents the CSS class name for the "options row container" and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 451
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 464
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 500
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 522

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const RECURSION_OPTIONS_CLASS = 'stwid--recursionOptions';`
- [x] Replace each occurrence of the raw literal with `RECURSION_OPTIONS_CLASS` (including updating selector strings, e.g. by building them with a template string).

---

### [3] DRY-02 - Magic value

**What:** The value `'fa-toggle-on'` appears 5 times. It represents the CSS class for the enabled/on state of the toggle and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 308
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 312
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 313
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 333
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 338

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const TOGGLE_ON_CLASS = 'fa-toggle-on';`
- [x] Replace each occurrence of the raw literal with `TOGGLE_ON_CLASS`.

---

### [4] DRY-02 - Magic value

**What:** The value `'fa-toggle-off'` appears 5 times. It represents the CSS class for the disabled/off state of the toggle and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 309
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 314
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 323
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 332
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 337

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const TOGGLE_OFF_CLASS = 'fa-toggle-off';`
- [x] Replace each occurrence of the raw literal with `TOGGLE_OFF_CLASS`.

---

### [5] DRY-02 - Magic value

**What:** The value `'stwid--bulk-active-value'` appears 2 times. It represents the localStorage key for the bulk "active state" toggle and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 306
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 315

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const BULK_ACTIVE_STORAGE_KEY = 'stwid--bulk-active-value';`
- [x] Replace each occurrence of the raw literal with `BULK_ACTIVE_STORAGE_KEY`.

---

### [6] DRY-02 - Magic value

**What:** The value `'stwid--bulk-strategy-value'` appears 2 times. It represents the localStorage key for the bulk "strategy" select and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 384
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 389

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const BULK_STRATEGY_STORAGE_KEY = 'stwid--bulk-strategy-value';`
- [x] Replace each occurrence of the raw literal with `BULK_STRATEGY_STORAGE_KEY`.

---

### [7] NAME-01 - Shape-based name

**What:** `opt` (line 378) describes the variable as an "option object" rather than its purpose. Reading the name alone does not tell you what kind of option it is.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 378

**Steps to fix:**
- [x] Rename `opt` (line 378) to `strategyOption` everywhere it appears in that `for (...)` loop.
- [x] In the `some((opt)=>...)` callback (line 385), rename that `opt` parameter to something purpose-based like `existingStrategyOption` to avoid reusing the same vague name.

---

### [8] NAME-01 - Shape-based name

**What:** `rowInp` (line 129) describes the variable as "some input" rather than what input it is. Reading the name alone does not tell you that this is the probability input inside the entry row.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 129

**Steps to fix:**
- [x] Rename `rowInp` to `rowProbabilityInput` everywhere it appears in this file.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming. SKIPPED — it is a function-local variable, not exported or shared outside this file.

---

### [9] NAME-01 - Shape-based name

**What:** `input` (line 503) describes the variable as "an input element" rather than its purpose. The code is specifically creating the "Ignore budget" checkbox, so the name should reflect that.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, line 503

**Steps to fix:**
- [x] Rename `input` to `budgetIgnoreCheckboxInput` everywhere it appears in this file.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming. SKIPPED — it is a function-local variable, not exported or shared outside this file.

---

### [10] SIZE-01 - Large function

**What:** `buildBulkStateSection` is 69 lines long (lines 290-358). It is doing too much: it builds the state toggle UI and also persists toggle state to localStorage and also applies the state to all selected entries (including updating multiple DOM locations and batching/yielding).

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, lines 290-358

**Steps to fix:**
- [x] Extract the "create and initialize activeToggle from localStorage" block (lines 304-316) into a new function named `buildBulkActiveToggle()` that returns the toggle element.
- [x] Extract the "apply state to targets, update row/list toggles, and yield in batches" block (lines 326-342) into a new function named `applyBulkActiveStateToTargets({ targets, cache, willDisable })`. This function should handle the per-target loop.
- [x] Replace the extracted blocks in `buildBulkStateSection` with calls to the new functions.

---

### [11] SIZE-01 - Large function

**What:** `buildBulkStrategySection` is 75 lines long (lines 359-433). It is doing too much: it builds the strategy select UI and also persists the selection to localStorage and also applies the strategy to all selected entries (including updating multiple DOM locations and batching/yielding).

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, lines 359-433

**Steps to fix:**
- [x] Extract the "build and initialize strategySelect options + load stored value" block (lines 375-391) into a new function named `buildBulkStrategySelect(getStrategyOptions)`. This function should return the select element.
- [x] Extract the "apply strategy to targets, update row/list strategy inputs, and yield in batches" loop (lines 405-417) into a new function named `applyBulkStrategyToTargets({ targets, cache, value, applyEntryManagerStrategyFilterToRow })`.
- [x] Replace the extracted blocks in `buildBulkStrategySection` with calls to the new functions.

---

### [12] NEST-01 - Deep nesting

**What:** Inside `runApplyActiveState`, the loop and nested `if` blocks reach 4+ levels of indentation. This makes the "apply" logic harder to follow because the reader must keep multiple conditions in mind at once.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, lines 326-342 (deepest point: line 341)

**Steps to fix:**
- [x] Extract the per-target DOM update block (lines 330-339) into a new function named `syncActiveStateToggles({ tr, cache, bookName, uid, willDisable })`. One sentence: update both the entry-row toggle and the book-list toggle to match the new active state.
- [x] Replace the extracted inner block with a call to `syncActiveStateToggles(...)`.
- [x] Optionally extract the batch-yield check (lines 340-342) into a small helper like `maybeYieldAfterBatch(i)` to keep the main loop flatter.

---

### [13] NEST-01 - Deep nesting

**What:** Inside `runApplyStrategy`, the loop plus nested `if` blocks reach 4+ levels of indentation. This makes the "apply" logic harder to read because each nested `if` adds another context the reader must remember.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`, lines 405-417 (deepest point: line 416)

**Steps to fix:**
- [x] Extract the per-target "apply value to entryData and row/list DOM" block (lines 408-414) into a new function named `applyStrategyToSingleTarget({ tr, cache, bookName, uid, entryData, value })`. One sentence: set the target's strategy in data and sync the related DOM inputs.
- [x] Replace the inner block with a call to `applyStrategyToSingleTarget(...)`.
- [x] Optionally extract the batch-yield check (lines 415-417) into a helper like `maybeYieldAfterBatch(i)` to keep the loop body flatter.

---

## After Implementation
*Implemented: March 10, 2026*

### What changed

`src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js`
- Extracted shared helpers for the repeated sticky, cooldown, and delay bulk number sections so those three areas now use one reusable builder.
- Replaced repeated hard-coded class names and localStorage keys with named constants, and renamed vague local variables to purpose-based names.
- Split the bulk state and bulk strategy sections into smaller helper functions so toggle syncing, per-target updates, and batch yielding are easier to follow.

### Risks / What might break

- The shared sticky/cooldown/delay helper now builds button labels and tooltips from the section label, so a future label change could also change the visible text in that section.
- The active-state and strategy apply flows now depend on extracted helpers, so any future edits need to keep those helper inputs in sync with the calling code.
- The recursion and budget selectors now build their checkbox query selectors from a constant, so a CSS class rename would need to update that constant.

### Manual checks

- Open the bulk editor and confirm Sticky, Cooldown, and Delay still show their number field and apply button, and clicking each apply button updates the selected entries without errors.
- Toggle the bulk State control between on and off, apply it, and confirm both the table row toggle and the book-list entry toggle switch to the same state.
- Change the bulk Strategy dropdown, apply it, and confirm the selected entries update in both the table and the book list while the strategy filter still refreshes correctly.
