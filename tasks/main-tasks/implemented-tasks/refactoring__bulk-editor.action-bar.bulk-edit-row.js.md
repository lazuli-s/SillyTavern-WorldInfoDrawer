# REFACTORING: bulk-editor.action-bar.bulk-edit-row.js
*Created: March 5, 2026*

**File:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`
**Findings:** 8 total
**Status:** IMPLEMENTED

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 2 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 1 |
| **Total** | | **8** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** Four input setup blocks repeat the same steps (create numeric input, load saved value, save on change, append to container), which makes future edits easy to miss in one place.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, lines 735–748 — Probability input setup
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, lines 783–795 — Sticky input setup
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, lines 830–842 — Cooldown input setup
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, lines 877–889 — Delay input setup

**Steps to fix:**
1. Extract the shared pattern into a new function named `createPersistedBulkNumberInput(config)` near the helper functions at the top of the file.
2. Replace the Probability input block (lines 735–748) with a call to `createPersistedBulkNumberInput(...)`.
3. Replace the Sticky input block (lines 783–795) with a call to `createPersistedBulkNumberInput(...)`.
4. Replace the Cooldown input block (lines 830–842) with a call to `createPersistedBulkNumberInput(...)`.
5. Replace the Delay input block (lines 877–889) with a call to `createPersistedBulkNumberInput(...)`.

---

### [2] DRY-01 — Duplicated code block

**What:** Three apply handlers perform the same algorithm (read value, validate non-negative integer, get targets, write entry field, update row input, save books, clear dirty state), which should be one shared helper with parameters.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, lines 797–820 — Sticky apply handler
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, lines 844–867 — Cooldown apply handler
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, lines 891–914 — Delay apply handler

**Steps to fix:**
1. Extract the shared algorithm into a new function named `runApplyNonNegativeIntegerField(config)`.
2. Replace the Sticky handler block (lines 797–820) with a call to `runApplyNonNegativeIntegerField(...)`.
3. Replace the Cooldown handler block (lines 844–867) with a call to `runApplyNonNegativeIntegerField(...)`.
4. Replace the Delay handler block (lines 891–914) with a call to `runApplyNonNegativeIntegerField(...)`.

---

### [3] DRY-02 — Magic value

**What:** The value `'0+'` appears 3 times. It represents the same UI hint ("non-negative integer") and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, line 787
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, line 834
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, line 881

**Steps to fix:**
1. At the top of the file (after imports), add: `const NON_NEGATIVE_PLACEHOLDER = '0+';`
2. Replace each occurrence of the raw literal with `NON_NEGATIVE_PLACEHOLDER`.

---

### [4] DRY-02 — Magic value

**What:** The value `'10000'` appears 2 times. It represents the maximum allowed order input and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, line 582
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, line 601

**Steps to fix:**
1. At the top of the file (after imports), add: `const MAX_ORDER_INPUT = '10000';`
2. Replace each occurrence of the raw literal with `MAX_ORDER_INPUT`.

---

### [5] NAME-01 — Shape-based name

**What:** `stored` (line 742) describes that the value came from storage, but not what it stores. A reader must inspect surrounding code to know its purpose.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, line 742

**Steps to fix:**
1. Rename `stored` to `storedProbabilityValue` everywhere it appears in this file.
2. Apply the same naming pattern to equivalent variables in nearby blocks (`stored` at lines 789, 836, 883) so names stay consistent.

---

### [6] SIZE-01 — Large function

**What:** `buildBulkEditRow` is 812 lines long (lines 136–947). It is doing too much: building many UI sections and also wiring all apply logic and state persistence in one place.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, lines 136–947

**Steps to fix:**
1. Extract select-section creation (lines 161–191) into a new function named `buildBulkSelectSection()`. It should build the select UI and return references needed by the caller.
2. Extract action section builders (for example State, Strategy, Position, Depth, Outlet, Order, Recursion, Budget, Probability, Sticky, Cooldown, Delay) into dedicated functions named `buildBulk<Section>NameSection()`.
3. Extract the "Apply All Changes" block (lines 922–940) into `buildApplyAllSection(applyRegistry)`.
4. Keep `buildBulkEditRow` as a short orchestration function that calls those helpers and assembles the row.

---

### [7] NEST-01 — Deep nesting

**What:** Inside `runApplyRecursion`, the block starting at line 667 reaches 4 levels of indentation. The innermost logic is hard to follow because the reader must track nested loops plus a conditional at the same time.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, lines 667–675 (deepest point: line 674)

**Steps to fix:**
1. Extract the inner recursion-option loop (lines 671–675) into a new function named `applyRecursionFlagsToRowInputs(domInputs, entryData, recursionCheckboxes)`.
2. Replace the extracted inner block with a call to `applyRecursionFlagsToRowInputs(...)`.
3. Keep `runApplyRecursion` focused on orchestration (load targets, call helper, save).

---

### [8] DEAD-01 — Dead code

**What:** `initialCollapsed` is declared at line 155 but is never referenced anywhere else in this file.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`, line 155

**Steps to fix:**
1. Remove `initialCollapsed = false` from the `buildBulkEditRow` parameter list.
2. Verify project-wide that callers do not pass this value by searching for `initialCollapsed` before removal.

---

## After Implementation
*Implemented: March 5, 2026*

### What changed

- `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js`
- Added shared helpers to remove repeated numeric input setup and repeated non-negative integer apply logic.
- Added named constants for repeated literals (`NON_NEGATIVE_PLACEHOLDER`, `MAX_ORDER_INPUT`).
- Extracted select/apply-all and several bulk action sections into dedicated builder functions so the main row builder is more orchestration-focused.
- Reduced recursion nesting by moving flag assignment into `applyRecursionFlagsToRowInputs(...)`.
- Removed unused `initialCollapsed` from `buildBulkEditRow` arguments.

- `src/entry-manager/bulk-editor/bulk-editor.js`
- Removed obsolete `initialCollapsed` argument when calling `buildBulkEditRow(...)`.

### Risks / What might break

- This touches bulk apply wiring, so apply buttons for Sticky/Cooldown/Delay/Probability could fail if a selector or field name was mistyped.
- This touches section construction order, so one section could render differently if a dependency between controls was accidentally changed.
- This touches the recursion and budget apply paths, so those filters and checkbox mirroring could behave differently if wiring changed.

### Manual checks

1. Open Entry Manager, change Sticky/Cooldown/Delay values, click each apply button, and confirm selected rows update and the dirty highlight clears.
2. Change Probability and apply it, then confirm selected rows show the new probability and no warning appears for valid values.
3. Toggle Recursion options and Budget Ignore, apply each, and confirm row checkboxes and filter behavior update as expected.
4. Use Apply All Changes after modifying multiple sections, and confirm every dirty section applies once and then clears its dirty state.
