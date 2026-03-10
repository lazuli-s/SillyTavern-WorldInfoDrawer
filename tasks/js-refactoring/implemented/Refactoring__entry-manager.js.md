# REFACTORING: entry-manager.js
*Created: July 3, 2026*

**File:** `src/entry-manager/entry-manager.js`
**Findings:** 10 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 4 |
| Shape-based naming | NAME-01 | 2 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 2 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **10** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** The file repeats the same "options + values" helper pattern three times (outlet, automation ID, group). This makes changes harder, because any future tweak to the pattern must be repeated in multiple places.

**Where:**
- `src/entry-manager/entry-manager.js`, lines 153-156 — outlet options (`getOutletOptions` + `getOutletValues`)
- `src/entry-manager/entry-manager.js`, lines 165-168 — automation ID options (`getAutomationIdOptions` + `getAutomationIdValues`)
- `src/entry-manager/entry-manager.js`, lines 179-182 — group options (`getGroupOptions` + `getGroupValues`)

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `createDynamicOptionAccessors({ getValueForEntry, noneValue })` near the top of the file.
- [x] Update the outlet helpers (lines 153-156) to use `createDynamicOptionAccessors(...)` instead of defining `getOutletOptions` and `getOutletValues` separately.
- [x] Update the automation ID helpers (lines 165-168) to use `createDynamicOptionAccessors(...)` instead of defining `getAutomationIdOptions` and `getAutomationIdValues` separately.
- [x] Update the group helpers (lines 179-182) to use `createDynamicOptionAccessors(...)` instead of defining `getGroupOptions` and `getGroupValues` separately.

---

### [2] DRY-02 — Magic value

**What:** The value `'stwid--applySelected'` appears 2 times. It represents the CSS class used to mark a selected row and should be a named constant.

**Where:**
- `src/entry-manager/entry-manager.js`, line 196
- `src/entry-manager/entry-manager.js`, line 200

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const ROW_SELECTED_CLASS = 'stwid--applySelected';`
- [x] Replace each occurrence of the raw literal with `ROW_SELECTED_CLASS`.

---

### [3] DRY-02 — Magic value

**What:** The value `'fa-square'` appears 2 times. It represents the Font Awesome icon class used for the "not selected" state and should be a named constant.

**Where:**
- `src/entry-manager/entry-manager.js`, line 204
- `src/entry-manager/entry-manager.js`, line 221

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const ICON_UNCHECKED_CLASS = 'fa-square';`
- [x] Replace each occurrence of the raw literal with `ICON_UNCHECKED_CLASS`.

---

### [4] DRY-02 — Magic value

**What:** The value `'fa-square-check'` appears 2 times. It represents the Font Awesome icon class used for the "selected" state and should be a named constant.

**Where:**
- `src/entry-manager/entry-manager.js`, line 205
- `src/entry-manager/entry-manager.js`, line 220

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const ICON_CHECKED_CLASS = 'fa-square-check';`
- [x] Replace each occurrence of the raw literal with `ICON_CHECKED_CLASS`.

---

### [5] DRY-02 — Magic value

**What:** The value `'stwid--state-active'` appears 2 times. It represents the CSS class used to mark the Entry Manager UI as active and should be a named constant.

**Where:**
- `src/entry-manager/entry-manager.js`, line 219
- `src/entry-manager/entry-manager.js`, line 391

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const STATE_ACTIVE_CLASS = 'stwid--state-active';`
- [x] Replace each occurrence of the raw literal with `STATE_ACTIVE_CLASS`.

---

### [6] NAME-01 — Shape-based name

**What:** `it` (lines 66 and 70) describes an unspecified "thing" rather than what the value actually is. Reading the name alone does not tell you what it holds.

**Where:** `src/entry-manager/entry-manager.js`, line 66 (also line 70)

**Steps to fix:**
- [x] Rename `it` to `entryData` everywhere it appears in this file.

---

### [7] NAME-01 — Shape-based name

**What:** `v` (line 140) describes a generic "value" without indicating what kind of value it is. In this loop it is specifically a possible filter option value.

**Where:** `src/entry-manager/entry-manager.js`, line 140

**Steps to fix:**
- [x] Rename `v` to `optionValue` everywhere it appears in this file.

---

### [8] SIZE-01 — Large function

**What:** `initEntryManager` is 370 lines long (lines 36-405). It is doing too much: it builds state and helper functions and also wires up filters and also wires up the renderer and also handles the open/refresh UI behavior.

**Where:** `src/entry-manager/entry-manager.js`, lines 36-405

**Steps to fix:**
- [x] Extract scope helpers (lines 41-48) into a new function named `createScopeHelpers()`. It should normalize and compare the scope values.
- [x] Extract entry data helpers (lines 50-123) into a new function named `createEntryAccessors({ cache, getSelectedWorldInfo, sortEntries, entryManagerState })`. It should provide functions for retrieving and sorting entries.
- [x] Extract dynamic option helpers (lines 125-182) into a new function named `createDynamicOptionHelpers({ getEntryManagerEntries, entryManagerState, isOutletPosition })`. It should provide outlet/automation/group options and value helpers.
- [x] Extract preview and selection helpers (lines 184-251) into a new function named `createSelectionAndPreviewHelpers({ dom, entryManagerState })`. It should manage row selection and preview rendering.
- [x] Extract filter wiring (lines 253-291) into a new function named `initEntryManagerFilters(...)`. It should call `createEntryManagerFilters(...)` and return the destructured helpers.
- [x] Extract renderer wiring (lines 302-369) into a new function named `initEntryManagerRenderer(...)`. It should call `createEntryManagerRenderer(...)` and return `renderEntryManager`.
- [x] Extract UI open/refresh functions (lines 371-402) into a new function named `createEntryManagerOpeners({ dom, entryManagerState, getCurrentEditor, getEditorPanelApi, renderEntryManager })`. It should return `{ openEntryManager, refreshEntryManagerScope }`.
- [x] Replace the extracted blocks in `initEntryManager` with calls to the new functions and keep the final `return { openEntryManager, refreshEntryManagerScope };`.

---

### [9] NEST-01 — Deep nesting

**What:** Inside `ensureCustomDisplayIndex`, the block starting at line 84 reaches 4 levels of indentation. The innermost logic is hard to follow because the reader must hold multiple nested loops and conditions in mind at once.

**Where:** `src/entry-manager/entry-manager.js`, lines 84-91 (deepest point: line 89)

**Steps to fix:**
- [x] Extract the inner block (lines 86-91) into a new function named `getMaxDisplayIndex(entries)`. It should scan the entries and return the max numeric display index (or -1).
- [x] Replace the nested `for` + `if` block with: `const maxIndex = getMaxDisplayIndex(entries);`

---

### [10] NEST-01 — Deep nesting

**What:** Inside `getEntryManagerEntries`, the DOM-building branch nests multiple mapping functions and an `if` in the same expression, reaching more than 3 indentation levels. This is hard to read and hard to debug when something goes wrong.

**Where:** `src/entry-manager/entry-manager.js`, lines 107-119 (deepest point: line 111)

**Steps to fix:**
- [x] Extract the inner block (lines 109-117) into a new function named `getEntryManagerRowData({ entryBook, row, cache })`. It should return either `{ book, dom, data }` or `null`.
- [x] Replace the inline `map(tr => { ... })` block with a call to `getEntryManagerRowData(...)` to reduce nesting.
- [x] Keep the `filter(Boolean)` so the final `source` list still removes null entries.

---

## After Implementation
*Implemented: March 10, 2026*

### What changed

`src/entry-manager/entry-manager.js`
- Split the large `initEntryManager` function into smaller helper functions for scope handling, entry access, dynamic filter options, row selection/preview behavior, filter setup, renderer setup, and open/refresh actions.
- Replaced repeated CSS class and icon text with named constants so selection-state behavior is defined in one place.
- Reused one shared helper for outlet, automation ID, and group option/value generation, and extracted the nested display-index and row-data logic into separate helpers.

### Risks / What might break

- If another part of the file was depending on one of the old inline helper definitions being nearby, future edits may miss the new helper locations.
- The Entry Manager open/refresh flow now runs through a dedicated helper, so any future change to that flow needs to update the helper inputs, not just `initEntryManager`.
- Renamed local variables like `it` and `v` are safe in this file, but any future manual copy-paste from older notes could reintroduce the old names.

### Manual checks

- Open Entry Manager for a single book and confirm the table still renders, sorts, and filters normally.
- Toggle row selection and the select-all button and confirm the checked and unchecked icons still change correctly.
- Open the outlet, automation ID, and group filter menus and confirm they still show the same option lists, including `(none)` where appropriate.
