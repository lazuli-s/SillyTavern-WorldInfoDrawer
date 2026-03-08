# REFACTORING: bulk-editor-tab.js
*Created: July 3, 2026*

**File:** `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`
**Findings:** 8 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 0 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 3 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **8** |

---

## Findings

### [1] DRY-02 — Magic value

**What:** The tab ID values `'display'` and `'bulk-editor'` appear multiple times. They represent the IDs for the Entry Manager tabs, and keeping them as raw strings increases the chance of typos that are hard to spot.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, line 189 (tab definition: `id:'display'`)
- `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, line 244 (`tabContentsById.get('display')`)
- `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, line 248 (`setActiveTab('display')`)
- `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, line 190 (tab definition: `id:'bulk-editor'`)
- `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, line 245 (`tabContentsById.get('bulk-editor')`)

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const TAB_ID_DISPLAY = 'display';`
- [ ] At the top of the file (after imports), add: `const TAB_ID_BULK_EDITOR = 'bulk-editor';`
- [ ] Replace each occurrence of `'display'` with `TAB_ID_DISPLAY`.
- [ ] Replace each occurrence of `'bulk-editor'` with `TAB_ID_BULK_EDITOR`.

---

### [2] NAME-01 — Shape-based name

**What:** `body` (line 116) describes the element's shape (a DOM "body"/container) rather than its purpose. Reading the name alone does not tell you what part of the UI it represents.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, line 116

**Steps to fix:**
- [ ] Rename `body` to `entryManagerRootEl` everywhere it appears in this file.
- [ ] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [3] NAME-01 — Shape-based name

**What:** `tbl` (line 345) and `wrap` (line 349) describe their shapes (table, wrapper) rather than their roles in the UI. The names do not say what the table is for.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, line 345
- `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, line 349

**Steps to fix:**
- [ ] Rename `tbl` to `orderTableEl` everywhere it appears in this file.
- [ ] Rename `wrap` to `orderTableWrapEl` everywhere it appears in this file.
- [ ] If these names are referenced in other files, search for them project-wide before renaming.

---

### [4] NAME-01 — Shape-based name

**What:** Inside the tab builder loop, names like `button`, `content`, `icon`, and `text` describe their shapes rather than their purpose in the tab UI. This makes it harder to scan and understand the tab construction code.

**Where:**
- `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, lines 217-239

**Steps to fix:**
- [ ] Rename `button` to `tabButtonEl` everywhere it appears in the tab loop.
- [ ] Rename `content` to `tabPanelEl` everywhere it appears in the tab loop.
- [ ] Rename `icon` to `tabIconEl` everywhere it appears in the tab loop.
- [ ] Rename `text` to `tabLabelEl` everywhere it appears in the tab loop.
- [ ] If any of these names are referenced outside this function (unlikely), search for them project-wide before renaming.

---

### [5] SIZE-01 — Large function

**What:** `createEntryManagerRenderer` is 358 lines long (lines 7-364). It is doing too much: it sets up the renderer factory and also defines the full Entry Manager render pipeline and also wires together multiple UI subcomponents.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, lines 7-364

**Steps to fix:**
- [ ] Extract the "bulk editor cleanup state" logic (lines 74-80) into a new function named `resetBulkEditRow()` that clears and runs the previous cleanup callback.
- [ ] Extract the `renderEntryManager` function (lines 76-361) into its own module-level function named `renderEntryManager(...)` (or move it to a new file if that better matches the project structure).
- [ ] Keep `createEntryManagerRenderer` focused on dependency wiring: create state, return `{ renderEntryManager }`, and avoid owning the full render implementation.

---

### [6] SIZE-01 — Large function

**What:** `renderEntryManager` is 286 lines long (lines 76-361). It is doing too much: it resets state and also builds multiple UI sections (tabs, filter panel, table) and also wires filter indicators and refresh hooks and also mounts the final DOM.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, lines 76-361

**Steps to fix:**
- [ ] Extract "reset state and sync filters" (lines 77-101) into a new function named `resetEntryManagerStateForRender(book)`. One sentence: clears previous render state and syncs all filter state before building DOM.
- [ ] Extract "custom sort persistence" (lines 102-112) into a new function named `persistCustomSortOrderIfNeeded(book)`. One sentence: ensures custom display indexes are saved before rendering entries.
- [ ] Extract "build root container" (lines 116-120) into a new function named `buildEntryManagerRootEl()`. One sentence: creates the root container element and applies the current column visibility and hide-keys state.
- [ ] Extract "build display toolbar and bulk edit row" (lines 123-185) into a new function named `buildEntryManagerTopRows(...)`. One sentence: builds the top bar controls and returns their elements plus refresh hooks.
- [ ] Extract "build filter panel" (lines 252-261) into a new function named `buildEntryManagerFilterPanel(...)`. One sentence: creates the filter UI and returns its DOM element.
- [ ] Extract "build table (header/body/wrap)" (lines 263-352) into a new function named `buildEntryManagerTable(...)`. One sentence: builds the table header/body, wires filter indicator refresh callbacks, and returns the table wrapper element.
- [ ] Replace the extracted blocks in `renderEntryManager` with calls to the new functions.

---

### [7] SIZE-01 — Large function

**What:** The tab builder IIFE assigned to `entryManagerTabs` is 64 lines long (lines 187-250). It is doing too much: it defines tab metadata and also builds the full tab DOM and also wires click behavior and also mounts initial tab content.

**Where:** `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, lines 187-250

**Steps to fix:**
- [ ] Extract the IIFE body into a new function named `buildEntryManagerTabs({ displayToolbarEl, bulkEditRowEl })`. One sentence: creates the Display/Bulk Editor tab UI and returns the root element.
- [ ] Replace the `(() => { ... })()` block with a call to `buildEntryManagerTabs({ displayToolbarEl, bulkEditRowEl })`.
- [ ] If helpful, extract `setActiveTab` (lines 205-214) into its own function outside the tab builder to simplify the main tab-building flow.

---

### [8] NEST-01 — Deep nesting

**What:** Inside `renderEntryManager`, the block starting at line 102 reaches 4 levels of indentation. The innermost logic is hard to follow because the reader must hold multiple nested contexts in mind at the same time (if, try, loop).

**Where:** `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`, lines 102-107 (deepest point: line 106)

**Steps to fix:**
- [ ] Extract the inner "save each book's custom display index" block (lines 103-107) into a new function named `saveCustomDisplayIndexForBooks(updatedBooks)`. One sentence: saves updated custom ordering to World Info for each affected book.
- [ ] Replace the `for (const bookName of updatedBooks) { ... }` block with a call to `saveCustomDisplayIndexForBooks(updatedBooks)`.
- [ ] Consider returning a success/failure result from the helper so the error handling remains straightforward in `renderEntryManager`.