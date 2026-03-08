# REFACTORING: bulk-edit-row.js
*Created: March 7, 2026*

**File:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`
**Findings:** 2 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 0 |
| Shape-based naming | NAME-01 | 0 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **2** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** This file repeats the same pattern of "build a bulk section using a builder function with mostly the same arguments, then append it to the row". Repeating this setup makes the file longer and harder to update because a small change (like adding/removing a shared argument) must be done in many places.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`, lines 51-58 — append the "state" section with shared arguments
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`, lines 59-68 — append the "strategy" section with shared arguments plus `getStrategyOptions` and `applyEntryManagerStrategyFilterToRow`
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`, lines 92-99 — append the "order" section with shared arguments
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`, lines 101-109 — append the "recursion" section with shared arguments plus `applyEntryManagerRecursionFilterToRow`
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`, lines 110-117 — append the "budget" section with shared arguments
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`, lines 118-125 — append the "probability" section with shared arguments
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`, lines 126-133 — append the "sticky" section with shared arguments
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`, lines 134-141 — append the "cooldown" section with shared arguments
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`, lines 142-149 — append the "delay" section with shared arguments

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `appendBulkSection(buildSection, extraArgs = {})` inside `buildBulkEditRow` (near the `applyRegistry` declaration).
- [ ] Inside `appendBulkSection(...)`, build the section by calling `buildSection({ dom, cache, isEntryManagerRowSelected, saveWorldInfo, buildSavePayload, applyRegistry, ...extraArgs })`, then append it to `row`.
- [ ] Replace the first copy (lines 51-58) with `appendBulkSection(buildBulkStateSection)`.
- [ ] Replace the second copy (lines 59-68) with `appendBulkSection(buildBulkStrategySection, { getStrategyOptions, applyEntryManagerStrategyFilterToRow })`.
- [ ] Replace the other copies (lines 92-99, 101-109, 110-117, 118-125, 126-133, 134-141, 142-149) with calls to `appendBulkSection(...)`, passing only the extra arguments needed for that section.

---

### [2] SIZE-01 — Large function

**What:** `buildBulkEditRow` is 121 lines long (lines 36-156). It is doing too much: it creates the main row element and also builds and appends every UI section and also wires up the "apply all" behavior and also returns multiple handles (element, refresh function, cleanup function).

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`, lines 36-156

**Steps to fix:**
- [ ] Extract the "create the row and add its base class" block (lines 37-38) into a new function named `createBulkEditRowRoot()`. One sentence: creates the root DOM element for the bulk edit row.
- [ ] Extract the "build and append select section" block (lines 40-47) into a new function named `appendBulkSelectSection(row, args)`. One sentence: adds the selection UI and returns `refreshSelectionCount`.
- [ ] Extract the "append the bulk edit sections (state/strategy/order/recursion/budget/probability/sticky/cooldown/delay)" block (lines 51-149) into a new function named `appendBulkEditSections(row, args)`. One sentence: appends all the bulk-edit controls to the row.
- [ ] Keep the "position" block grouped as part of `appendBulkEditSections(...)` (lines 70-90) or extract it into `appendBulkPositionSection(row, args)` if it needs its own cleanup handling.
- [ ] Extract the "apply all, wrap, and return" block (lines 151-155) into a new function named `finalizeBulkEditRow(row, applyRegistry, refreshSelectionCount, cleanup)`. One sentence: adds the apply-all UI, applies row wrapping, and returns the public API.