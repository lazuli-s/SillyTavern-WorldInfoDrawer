# REFACTORING: Split bulk-edit-row into focused files
*Created: March 5, 2026*

**Type:** Refactoring
**Status:** DOCUMENTED

---

## Summary

`bulk-editor.action-bar.bulk-edit-row.js` has grown to 1,186 lines with 22 internal functions
and 13 field sections. It is hard to navigate and maintain. This task splits it into 4 focused
files plus a thin assembly file, moves the shared `wrapRowContent` helper to `entry-manager/`
level where both tab rows can import it cleanly, and updates `ARCHITECTURE.md` and
`FEATURE_MAP.md` to reflect the new structure. No user-facing behavior changes.

---

## Current Behavior

The extension works correctly. The problem is internal size: everything related to bulk editing
(shared helper functions, all 13 field section builders, position/depth/outlet logic, and the
order generator) lives in a single 1,186-line file. In addition, `wrapRowContent` — a helper
shared by both action-bar rows — lives inside `bulk-editor-tab/` but is imported by
`display-tab/` via a cross-folder path.

---

## Expected Behavior

After this refactoring:
- `bulk-edit-row.js` is a thin assembly file (~130 lines) that imports and wires together all
  sections
- Each extracted file has one clear job and is easy to find
- `wrapRowContent` lives at `entry-manager/` level, imported cleanly by both tab folders
- `ARCHITECTURE.md` and `FEATURE_MAP.md` accurately list all new file paths

---

## Agreed Scope

All changes are inside `src/entry-manager/`. No changes to `bulk-editor.js` (the only consumer
of `buildBulkEditRow`) or to any file outside `entry-manager/`.

**Files created:**
- `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.helpers.js`
- `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.sections.js`
- `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.position.js`
- `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.order.js`
- `src/entry-manager/bulk-editor.action-bar.helpers.js` (moved up from bulk-editor-tab/)

**Files modified:**
- `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.js` (trimmed to assembly)
- `src/entry-manager/display-tab/bulk-editor.action-bar.visibility-row.js` (import path update)
- `ARCHITECTURE.md`
- `FEATURE_MAP.md`

**Files deleted:**
- `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.helpers.js` (replaced by the moved version above)

---

## Implementation Plan

### Step 1 — Move `wrapRowContent` to `entry-manager/` level

`wrapRowContent` is shared by both action-bar rows but currently sits inside `bulk-editor-tab/`,
forcing `display-tab/` to reach sideways into another folder to import it. Moving it one level
up gives both tabs a clean, neutral import path.

- [x] Create `src/entry-manager/bulk-editor.action-bar.helpers.js` with the same content as
      the current `bulk-editor-tab/bulk-editor.action-bar.helpers.js` (the `wrapRowContent`
      export)
- [x] In `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.js`, update
      the import of `wrapRowContent` from `'./bulk-editor.action-bar.helpers.js'` to
      `'../bulk-editor.action-bar.helpers.js'`
- [x] In `src/entry-manager/display-tab/bulk-editor.action-bar.visibility-row.js`, update the
      import of `wrapRowContent` from `'../bulk-editor-tab/bulk-editor.action-bar.helpers.js'`
      to `'../bulk-editor.action-bar.helpers.js'`
- [x] Delete `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.helpers.js`

---

### Step 2 — Create `bulk-edit-row.helpers.js`

Move all shared primitive helpers out of `bulk-edit-row.js` into a new dedicated file.

- [x] Create `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.helpers.js`
- [x] Move these constants from `bulk-edit-row.js` into the new file:
  - `BULK_APPLY_BATCH_SIZE`
  - `APPLY_DIRTY_CLASS`
  - `NON_NEGATIVE_PLACEHOLDER`
- [x] Move these functions from `bulk-edit-row.js` into the new file:
  - `createLabeledBulkContainer` (lines 14–27)
  - `createApplyButton` (lines 29–39)
  - `buildDirectionRadio` (lines 41–59)
  - `buildRecursionCheckboxRow` (lines 62–74)
  - `getSafeTbodyRows` (lines 76–83)
  - `getBulkTargets` (lines 86–110)
  - `saveUpdatedBooks` (lines 113–117)
  - `setApplyButtonBusy` (lines 120–125)
  - `withApplyButtonLock` (lines 128–136)
  - `createPersistedBulkNumberInput` (lines 138–162)
  - `runApplyNonNegativeIntegerField` (lines 164–202)
  - `applyRecursionFlagsToRowInputs` (lines 204–212)
- [x] Export all of the above **except** `setApplyButtonBusy` (it is only called internally
      by `withApplyButtonLock`)
- [x] Add the required imports at the top of the new file:
  ```js
  import { setTooltip } from './bulk-editor.utils.js';
  import { ORDER_HELPER_RECURSION_OPTIONS } from '../../shared/constants.js';
  ```

---

### Step 3 — Create `bulk-edit-row.sections.js`

Move the 10 named section-builder functions (already extracted as named functions in the
current file, lines 214–732) into a dedicated file.

- [x] Create `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.sections.js`
- [x] Move these functions from `bulk-edit-row.js`:
  - `buildBulkSelectSection`
  - `buildApplyAllSection`
  - `buildBulkProbabilitySection`
  - `buildBulkStickySection`
  - `buildBulkCooldownSection`
  - `buildBulkDelaySection`
  - `buildBulkStateSection`
  - `buildBulkStrategySection`
  - `buildBulkRecursionSection`
  - `buildBulkBudgetSection`
- [x] Export all 10
- [x] Add the required imports at the top of the new file:
  ```js
  import {
      MULTISELECT_DROPDOWN_CLOSE_HANDLER,
      closeOpenMultiselectDropdownMenus,
      setTooltip,
  } from './bulk-editor.utils.js';
  import {
      BULK_APPLY_BATCH_SIZE,
      APPLY_DIRTY_CLASS,
      NON_NEGATIVE_PLACEHOLDER,
      createLabeledBulkContainer,
      createApplyButton,
      getSafeTbodyRows,
      getBulkTargets,
      saveUpdatedBooks,
      withApplyButtonLock,
      createPersistedBulkNumberInput,
      runApplyNonNegativeIntegerField,
      buildRecursionCheckboxRow,
      applyRecursionFlagsToRowInputs,
  } from './bulk-editor.action-bar.bulk-edit-row.helpers.js';
  ```
  *(Verify each import name is actually used by these sections before finalising)*

---

### Step 4 — Create `bulk-edit-row.position.js`

The position, depth, and outlet controls are currently written as inline code blocks **inside**
`buildBulkEditRow`, not as named functions. They must be extracted into a named function first,
then moved to their own file. These three controls are tightly interdependent (outlet is only
shown for certain positions; depth is only shown for position 4).

- [x] Create `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.position.js`
- [x] Extract the inline position/depth/outlet block from inside `buildBulkEditRow`
      (lines ~785–1007) into a new named function `buildBulkPositionSection`
- [x] The function signature should accept the parameters already in scope at that point:
      `applyRegistry`, `saveWorldInfo`, `buildSavePayload`, `orderHelperState`, and any
      other locals it currently closes over — read the block carefully to identify all of them
- [x] Export `buildBulkPositionSection`
- [x] Add the required imports at the top of the new file (read the extracted block to confirm
      exact names):
  ```js
  import {
      MULTISELECT_DROPDOWN_CLOSE_HANDLER,
      closeOpenMultiselectDropdownMenus,
      setTooltip,
  } from './bulk-editor.utils.js';
  import {
      APPLY_DIRTY_CLASS,
      createLabeledBulkContainer,
      createApplyButton,
      getSafeTbodyRows,
      getBulkTargets,
      saveUpdatedBooks,
  } from './bulk-editor.action-bar.bulk-edit-row.helpers.js';
  ```

---

### Step 5 — Create `bulk-edit-row.order.js`

The order generator (start value, step/spacing, up/down direction) is also an inline block
inside `buildBulkEditRow`. Extract it as a named function in its own file.

- [x] Create `src/entry-manager/bulk-editor-tab/bulk-editor.action-bar.bulk-edit-row.order.js`
- [x] Move the constant `MAX_ORDER_INPUT` here (it is only used in this block)
- [x] Extract the inline order block from inside `buildBulkEditRow` (lines ~1010–1127) into
      a named function `buildBulkOrderSection`
- [x] The function signature should accept the parameters already in scope at that point:
      `applyRegistry`, `saveWorldInfo`, `buildSavePayload`, `orderHelperState`, and any
      other locals it currently closes over — read the block carefully to identify all of them
- [x] Export `buildBulkOrderSection`
- [x] Add the required imports at the top of the new file (confirm exact names from the block):
  ```js
  import { setTooltip } from './bulk-editor.utils.js';
  import {
      BULK_APPLY_BATCH_SIZE,
      APPLY_DIRTY_CLASS,
      createLabeledBulkContainer,
      createApplyButton,
      buildDirectionRadio,
      getSafeTbodyRows,
      getBulkTargets,
      saveUpdatedBooks,
      withApplyButtonLock,
  } from './bulk-editor.action-bar.bulk-edit-row.helpers.js';
  ```

---

### Step 6 — Trim `bulk-edit-row.js` to assembly only

After all extractions, the main file contains only `buildBulkEditRow`, which now calls all
the named section functions instead of containing them inline.

- [x] Remove the moved constants and functions from `bulk-edit-row.js`
- [x] Replace the top-level imports with:
  ```js
  import { wrapRowContent } from '../bulk-editor.action-bar.helpers.js';
  import {
      buildBulkSelectSection,
      buildApplyAllSection,
      buildBulkProbabilitySection,
      buildBulkStickySection,
      buildBulkCooldownSection,
      buildBulkDelaySection,
      buildBulkStateSection,
      buildBulkStrategySection,
      buildBulkRecursionSection,
      buildBulkBudgetSection,
  } from './bulk-editor.action-bar.bulk-edit-row.sections.js';
  import { buildBulkPositionSection } from './bulk-editor.action-bar.bulk-edit-row.position.js';
  import { buildBulkOrderSection } from './bulk-editor.action-bar.bulk-edit-row.order.js';
  ```
- [x] In `buildBulkEditRow`, replace the inline position block with a call to
      `buildBulkPositionSection(...)`, passing the correct arguments
- [x] In `buildBulkEditRow`, replace the inline order block with a call to
      `buildBulkOrderSection(...)`, passing the correct arguments
- [x] Verify that `buildBulkEditRow` is the only remaining export and that the file compiles
      (no undefined references)

---

### Step 7 — Update ARCHITECTURE.md and FEATURE_MAP.md

- [ ] In `ARCHITECTURE.md`, under `src/entry-manager/bulk-editor-tab/`, add entries for the
      4 new files and update `bulk-editor.action-bar.helpers.js` to show its new path at
      `entry-manager/` level
- [ ] In `FEATURE_MAP.md`, update the "Bulk edit row" entries to reference the new files
      (helpers, sections, position, order) alongside the existing assembly file reference

---

## Verification

1. Reload the browser tab running SillyTavern
2. Open the Entry Manager
3. Switch to the Bulk Editor tab
4. Confirm all 13 field sections render correctly:
   Select, State, Strategy, Position, Depth, Outlet, Order, Recursion, Budget,
   Probability, Sticky, Cooldown, Delay, Apply All Changes
5. Select several rows and test each section's Apply button
6. Test the "Apply All Changes" button with multiple dirty sections
7. Verify no errors appear in the browser console (F12 → Console tab)
8. Confirm the Display tab (visibility row) still renders correctly
