# REFACTORING: bulk-edit-row.position.js
*Created: July 3, 2026*

**File:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`
**Findings:** 7 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 4 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **7** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** Three different "Apply" actions repeat the same overall steps: find the selected rows, compute targets, track which books are touched, apply changes to each target, save updated books, and clear the apply button's dirty state. Repeating this pattern makes the file longer and harder to change safely, because a future fix would need to be made in multiple places.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, lines 54-73 - Apply Position (bulk update + save + clear dirty)
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, lines 102-121 - Apply Depth (bulk update + save + clear dirty)
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, lines 222-244 - Apply Outlet (bulk update + save + clear dirty)

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `runBulkApplyForSelectedEntries({ dom, cache, isEntryManagerRowSelected, saveWorldInfo, buildSavePayload, applyButton, perTargetUpdate, afterTargetsUpdate })` near the top of the file.
- [ ] Inside `runBulkApplyForSelectedEntries(...)`, centralize:
      - `getSafeTbodyRows(dom)` and early return if missing
      - `getBulkTargets(rows, cache, isEntryManagerRowSelected)`
      - `books` collection and `saveUpdatedBooks(books, saveWorldInfo, buildSavePayload)`
      - clearing `APPLY_DIRTY_CLASS` on `applyButton`
- [ ] Replace the Apply Position body (lines 54-73) with a call to `runBulkApplyForSelectedEntries(...)` and pass a `perTargetUpdate` callback that sets `entryData.position`, updates `domPos`, and calls `applyEntryManagerPositionFilterToRow(...)`.
- [ ] Replace the Apply Depth body (lines 102-121) with a call to `runBulkApplyForSelectedEntries(...)` and pass a `perTargetUpdate` callback that sets `entryData.depth` and updates the row's `[name="depth"]` input.
- [ ] Replace the Apply Outlet body (lines 222-244) with a call to `runBulkApplyForSelectedEntries(...)` and pass:
      - a `perTargetUpdate` callback that sets `entryData.outletName` and updates the row's `[name="outletName"]` input
      - an `afterTargetsUpdate` callback that runs `syncEntryManagerOutletFilters()`, re-applies `applyEntryManagerOutletFilterToRow(...)` across targets, and triggers `filterIndicatorRefs.outlet?.()`

---

### [2] DRY-02 - Magic value

**What:** The value `'stwid--bulk-position-value'` appears 2 times. It represents the localStorage key for the bulk Position selection and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 45
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 50

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const STORAGE_KEY_BULK_POSITION = 'stwid--bulk-position-value';`
- [ ] Replace each occurrence of the raw literal with `STORAGE_KEY_BULK_POSITION`.

---

### [3] DRY-02 - Magic value

**What:** The value `'stwid--bulk-depth-value'` appears 2 times. It represents the localStorage key for the bulk Depth input and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 95
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 98

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const STORAGE_KEY_BULK_DEPTH = 'stwid--bulk-depth-value';`
- [ ] Replace each occurrence of the raw literal with `STORAGE_KEY_BULK_DEPTH`.

---

### [4] DRY-02 - Magic value

**What:** The value `'stwid--bulk-outlet-value'` appears 4 times. It represents the localStorage key for the bulk Outlet input and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 152
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 171
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 207
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 210

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const STORAGE_KEY_BULK_OUTLET = 'stwid--bulk-outlet-value';`
- [ ] Replace each occurrence of the raw literal with `STORAGE_KEY_BULK_OUTLET`.

---

### [5] DRY-02 - Magic value

**What:** The value `'stwid--state-active'` appears 5 times. It represents the "menu option is active/open" state class and should be a named constant.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 167
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 178
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 179
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 183
- `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 185

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const STATE_ACTIVE_CLASS = 'stwid--state-active';`
- [ ] Replace each occurrence of the raw literal with `STATE_ACTIVE_CLASS`.

---

### [6] NAME-01 - Shape-based name

**What:** `opt` (line 39) describes the variable's shape (an "option object") rather than its purpose. Reading the name alone does not tell you which kind of option it is (position options vs outlet options).

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, line 39

**Steps to fix:**
- [ ] Rename `opt` to `positionOption` everywhere it appears in this loop.

---

### [7] SIZE-01 - Large function

**What:** `buildBulkPositionSection` is 234 lines long (lines 29-262). It is doing too much: it builds the Position controls and also builds the Depth controls and also builds the Outlet dropdown behavior (including open/close handling) and also wires up cleanup logic.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js`, lines 29-262

**Steps to fix:**
- [ ] Extract the "Position UI" creation (lines 30-80) into a new function named `buildBulkPositionControls(...)`. One sentence: Create the Position select, restore its stored value, and return the container plus the apply button wiring.
- [ ] Extract the "Depth UI" creation (lines 82-137) into a new function named `buildBulkDepthControls(...)`. One sentence: Create the Depth input, validate and apply depth changes, and toggle disabled state based on Position.
- [ ] Extract the "Outlet UI" creation (lines 138-260) into a new function named `buildBulkOutletControls(...)`. One sentence: Create the Outlet input + dropdown menu, manage open/close behavior, and apply outlet changes in bulk.
- [ ] Keep `buildBulkPositionSection(...)` as a short "orchestrator" that calls the three helper builders and returns `{ positionContainer, depthContainer, outletContainer, cleanup }`.