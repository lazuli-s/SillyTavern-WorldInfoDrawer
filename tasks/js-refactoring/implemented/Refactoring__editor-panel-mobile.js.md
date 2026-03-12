# REFACTORING: editor-panel-mobile.js
*Created: March 12, 2026*

**File:** `src/editor-panel/editor-panel-mobile.js`
**Findings:** 4 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 0 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **4** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** The same two-step lookup — "find a toggle label inside the flags row first; if not found, search the whole editor DOM" — is written out in full four separate times. If the selector pattern ever needs to change, it must be updated in four places instead of one.

**Where:**
- `src/editor-panel/editor-panel-mobile.js`, lines 119–120 — lookup for `delay_until_recursion` toggle
- `src/editor-panel/editor-panel-mobile.js`, lines 142–143 — lookup for `excludeRecursion` toggle
- `src/editor-panel/editor-panel-mobile.js`, lines 144–145 — lookup for `preventRecursion` toggle
- `src/editor-panel/editor-panel-mobile.js`, lines 156–157 — lookup for `ignoreBudget` toggle

**Steps to fix:**
- [x] Add the following helper function near the top of the file (after the `MOBILE_EDITOR_MEDIA_QUERY` constant):
  ```js
  const findToggleByName = (editDom, name) =>
      editDom.querySelector(`.stwid--editorContentFlagsRow label:has(input[name='${name}'])`)
      ?? editDom.querySelector(`label:has(input[name='${name}'])`);
  ```
- [x] Replace lines 119–120 with: `const delayUntilRecursionToggle = findToggleByName(editDom, 'delay_until_recursion');`
- [x] Replace lines 142–143 with: `const excludeRecursionToggle = findToggleByName(editDom, 'excludeRecursion');`
- [x] Replace lines 144–145 with: `const preventRecursionToggle = findToggleByName(editDom, 'preventRecursion');`
- [x] Replace lines 156–157 with: `const ignoreBudgetToggle = findToggleByName(editDom, 'ignoreBudget');`

---

### [2] DRY-02 — Magic value

**What:** The CSS class name `stwid--editorContentFlagsRow` appears as a raw string 9 times throughout the file. It is used both to add this class to a new element and to query for existing elements that have it. Because it is not stored in a constant, a typo in any one copy would silently break that code path.

**Where:**
- `src/editor-panel/editor-panel-mobile.js`, line 74
- `src/editor-panel/editor-panel-mobile.js`, line 77
- `src/editor-panel/editor-panel-mobile.js`, line 98
- `src/editor-panel/editor-panel-mobile.js`, line 119
- `src/editor-panel/editor-panel-mobile.js`, line 142
- `src/editor-panel/editor-panel-mobile.js`, line 144
- `src/editor-panel/editor-panel-mobile.js`, line 156
- `src/editor-panel/editor-panel-mobile.js`, line 167

**Steps to fix:**
- [x] At the top of the file (after `MOBILE_EDITOR_MEDIA_QUERY`), add: `const FLAGS_ROW_CLASS = 'stwid--editorContentFlagsRow';`
- [x] Replace every raw occurrence of the string `'stwid--editorContentFlagsRow'` with `FLAGS_ROW_CLASS`.
- [x] For selector strings that embed the class with a leading dot (e.g. `'.stwid--editorContentFlagsRow label:...'`), use a template literal: `` `.${FLAGS_ROW_CLASS} label:has(...)` ``. Note: if finding [1] is implemented first, those occurrences will already be inside `findToggleByName` — update that helper to use `FLAGS_ROW_CLASS` too.

---

### [3] DRY-02 — Magic value

**What:** The long CSS selector `".inline-drawer-content > .world_entry_edit > .flex-container.wide100p.flexGap10:nth-child(2)"` appears in full twice. This selector identifies the "group row" inside the entry editor, and repeating it means any future change to SillyTavern's DOM structure requires two edits instead of one.

**Where:**
- `src/editor-panel/editor-panel-mobile.js`, line 203
- `src/editor-panel/editor-panel-mobile.js`, line 225

**Steps to fix:**
- [x] At the top of the file (after `MOBILE_EDITOR_MEDIA_QUERY`), add: `const GROUP_ROW_SELECTOR = ".inline-drawer-content > .world_entry_edit > .flex-container.wide100p.flexGap10:nth-child(2)";`
- [x] Replace the raw selector string on line 203 with `GROUP_ROW_SELECTOR`.
- [x] Replace the raw selector string on line 225 with `GROUP_ROW_SELECTOR`.

---

### [4] SIZE-01 — Large function

**What:** `applyMobileHeaderLayout` is 56 lines long (lines 254–309). It is doing three distinct jobs: validating the DOM and deciding whether to proceed, building all the new mobile header DOM nodes (the title row, toggle slot, strategy control), and then calling every individual layout sub-function to finish restructuring the rest of the editor. The DOM-building section alone is dense enough to be its own named function.

**Where:** `src/editor-panel/editor-panel-mobile.js`, lines 254–309

**Steps to fix:**
- [x] Extract the DOM-building block (lines 267–295 — from `const topRow = ...` through `headerContent.replaceChildren(topRow, headerControls)`) into a new function named `buildMobileEditorTitleBar(headerContent, titleTextarea, headerControls, strategySelect, killSwitch)`. This function creates the top row, toggle slot, title control, and strategy control, then calls `headerContent.replaceChildren` to put them in place.
- [x] Replace the extracted lines in `applyMobileHeaderLayout` with a call to `buildMobileEditorTitleBar(headerContent, titleTextarea, headerControls, strategySelect, killSwitch)`.
- [x] Verify that `applyMobileHeaderLayout` now reads as a clear sequence: guard checks → build title bar → run layout passes.

---

## After Implementation
*Implemented: March 12, 2026*

### What changed

**`src/editor-panel/editor-panel-mobile.js`**
- Added `FLAGS_ROW_CLASS` constant (`'stwid--editorContentFlagsRow'`) and replaced all 8 raw string occurrences with it, including inside template literals for querySelector calls.
- Added `GROUP_ROW_SELECTOR` constant for the long group-row selector and replaced 2 duplicate raw strings in `moveMobileGroupControls` and `moveMobileTimingControls`.
- Added `findToggleByName(editDom, name)` helper function that encapsulates the two-step toggle lookup (flags row first, then whole editor). Replaced 4 duplicated two-step lookups in `moveMobileRecursionControls`, `moveMobileRecursionGuardControls`, and `moveMobileBudgetControl`.
- Extracted `buildMobileEditorTitleBar(headerContent, titleTextarea, headerControls, strategySelect, killSwitch)` from `applyMobileHeaderLayout`. The parent function now reads as: guard checks → `titleAndStatus.remove()` → `buildMobileEditorTitleBar(...)` → layout passes.

### Risks / What might break

- `findToggleByName` uses `FLAGS_ROW_CLASS` inside a template literal for the selector — if `FLAGS_ROW_CLASS` is ever changed, the selector updates automatically, which is the intended benefit.
- `titleAndStatus.remove()` was moved to just before the `buildMobileEditorTitleBar` call (it was previously inside the extracted block at line 294). The DOM effect is identical since `replaceChildren` would have removed it anyway, but the explicit call now lives in `applyMobileHeaderLayout` rather than the extracted helper.
- Any future code that calls `applyMobileHeaderLayout` is unaffected — the public export signature did not change.

### Manual checks

1. Open the drawer on a mobile-width viewport (≤1000 px). Click an entry to open the editor. Confirm the title row, toggle slot, strategy selector, and action buttons render correctly — same as before this change.
2. Confirm that entries with recursion, budget, and group controls still show those controls in their correct sections in the mobile editor layout.
3. On a desktop viewport (>1000 px), open an entry editor and confirm the standard (non-mobile) layout is unchanged.
