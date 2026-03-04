# REFACTORING: bulk-editor.action-bar.js
*Created: March 2, 2026*

**File:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`
**Findings:** 20 total
**Status:** IMPLEMENTED

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 3 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 8 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 3 |
| Dead code | DEAD-01 | 2 |
| **Total** | | **20** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** Both exported functions (`buildVisibilityRow` and `buildBulkEditRow`) build a collapsible row title in exactly the same way — create a `div`, assign a CSS class, set text, create a chevron icon, prepend it, add a second class, and append the whole thing to the row. The only difference between the two copies is the text content (`'Visibility'` vs `'Bulk Editor'`). Writing this logic out twice means any future change to the row-title structure must be made in two places, which risks them drifting apart.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 144–151 — row title for `buildVisibilityRow`
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 553–560 — row title for `buildBulkEditRow`

**Steps to fix:**
1. Extract the shared pattern into a new function named `createCollapsibleRowTitle(titleText)` near the top of the file (below `createApplyButton`). It should create the `div`, the chevron `i`, wire them together, and return `{ rowTitle, collapseChevron }`.
2. Replace the first copy (lines 144–151) with a call to `createCollapsibleRowTitle('Visibility')` and destructure the returned object.
3. Replace the second copy (lines 553–560) with a call to `createCollapsibleRowTitle('Bulk Editor')` and destructure the returned object.

---

### [2] DRY-01 — Duplicated code block

**What:** Both exported functions end with the exact same six-line sequence: create a `div.stwid--rowContentWrap`, move all children except the first (the row title) into it, append it to the row, then call `wireCollapseRow`. This closing sequence is written out twice in full. Extracting it would also pair cleanly with finding [1] — once the title creation is shared, the collapse wiring can be shared too.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 485–495 — end of `buildVisibilityRow`
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 1431–1439 — end of `buildBulkEditRow`

**Steps to fix:**
1. Extract the shared pattern into a new function named `wrapRowContent(row, rowTitle, collapseChevron, initialCollapsed)` near the top of the file. It should create the content wrapper, move children, append, and call `wireCollapseRow`, then return the `contentWrap` element.
2. Replace the first copy (lines 485–495) with a call to `wrapRowContent(row, rowTitle, collapseChevron, initialCollapsed)`.
3. Replace the second copy (lines 1431–1439) with a call to `wrapRowContent(row, rowTitle, collapseChevron, initialCollapsed)`.

---

### [3] DRY-01 — Duplicated code block

**What:** The six `clearFilterHandlers` entries (strategy, position, recursion, outlet, automationId, group) all follow the same five-step pattern: (1) decide the "all values" list from state or a getter, (2) write it back to `orderHelperState.filters[key]`, (3) call the matching `applyOrderHelperXFilters()` function, (4) fire the filter indicator ref, (5) call `refresh()`. Writing this out six times creates six places to update if the pattern ever needs to change.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 390–398 — strategy handler
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 399–407 — position handler
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 408–413 — recursion handler (slight variation: uses `?? []` instead of the ternary)
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 415–422 — outlet handler
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 424–431 — automationId handler
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 433–441 — group handler

**Steps to fix:**
1. Extract a helper named `makeClearFilterHandler(key, getAllValues, applyFn, stateRef, indicatorRef, refreshFn)` before the `clearFilterHandlers` object. It returns a function that performs the five shared steps using its arguments.
2. Replace each handler entry with a call to `makeClearFilterHandler(...)`, passing the key-specific arguments.
3. The `recursion` case uses `?? []` instead of a length-guard ternary — document this difference as a parameter to the helper (e.g., an `allowEmpty` flag or a direct `getAllValues` callback that already handles the nullish case).

---

### [4] DRY-02 — Magic value

**What:** The number `200` appears three times as the batch size for a "yield to the browser every N iterations" pattern inside long loops. It means "pause for one event-loop tick after every 200 entries" and should have a name — without one, it reads like an arbitrary limit and is hard to change consistently.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 697
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 755
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 1018

**Steps to fix:**
1. At the top of the file (after imports), add: `const BULK_APPLY_BATCH_SIZE = 200;`
2. Replace each occurrence of the raw `200` with `BULK_APPLY_BATCH_SIZE`.

---

### [5] DRY-02 — Magic value

**What:** The CSS class string `'stwid--applyDirty'` appears more than 25 times across the file — on every `.classList.add`, `.classList.remove`, and `.classList.contains` call that tracks whether an apply button has uncommitted changes. Repeating the string this many times means a typo in any one occurrence would silently break the dirty-state system, and renaming the class requires a global search-and-replace across the whole file.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 50 (contains check inside `createApplyButton`)
- Lines 702, 706, 760, 764, 809, 812, 853, 856, 972, 975, 1023, 1072, 1073, 1094, 1112, 1167, 1171, 1211, 1214, 1259, 1262, 1306, 1309, 1353, 1356, 1400, 1403 (add/remove calls throughout `buildBulkEditRow`)

**Steps to fix:**
1. At the top of the file (after imports), add: `const APPLY_DIRTY_CLASS = 'stwid--applyDirty';`
2. Replace every raw `'stwid--applyDirty'` string with `APPLY_DIRTY_CLASS`.

---

### [6] NAME-01 — Shape-based name

**What:** `btn` (line 45) describes the HTML element type — a button — rather than what the element represents. Inside a factory function called `createApplyButton`, the name tells you nothing extra. If this local variable were ever debugged in a stack trace or referenced later in the function, its purpose would not be apparent from its name alone.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 45

**Steps to fix:**
1. Rename `btn` to `applyButtonEl` everywhere it appears in `createApplyButton` (lines 45–53).

---

### [7] NAME-01 — Shape-based name

**What:** `apply` (line 1027) is the apply button for the Order container, but its name is just `apply` — a generic verb. Every other apply button in this file is named after its field: `applyActiveState`, `applyStrategy`, `applyPosition`, `applyDepth`, `applyOutlet`, `applyRecursion`, `applyBudget`, `applyProbability`, `applySticky`, `applyCooldown`, `applyBulkDelay`. The inconsistency makes this button harder to identify in code, especially since the variable `apply` is then referenced in nine other lines scattered through the Order container block.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 1027

**Steps to fix:**
1. Rename `apply` to `applyOrder` everywhere it appears in `buildBulkEditRow` (lines 1027, 1023, 1072, 1073, 1094, 1112, 1122).
2. Note: `apply` inside `runApplyOrder` at line 993 (`withApplyButtonLock(apply, ...)`) is a forward reference — confirm the rename applies there too.

---

### [8] NAME-01 — Shape-based name

**What:** `inp` is used twice in the direction radio group (lines 1085 and 1103) as the name for two different `<input type="radio">` elements — one for "up" and one for "down". The name `inp` says only that it is an input element; it does not say which direction it controls.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 1085 — up-direction radio
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 1103 — down-direction radio

**Steps to fix:**
1. Rename the first `inp` (line 1085) to `upRadioInput` everywhere it appears in its block scope (lines 1085–1096).
2. Rename the second `inp` (line 1103) to `downRadioInput` everywhere it appears in its block scope (lines 1103–1114).

---

### [9] NAME-01 — Shape-based name

**What:** `dir` (line 1075) is the container `div` for the direction radio group, but the name `dir` is a common abbreviation that could mean "direction", "directory", or any other "dir" concept. It gives no hint that it holds a label and a radio-button toggle widget.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 1075

**Steps to fix:**
1. Rename `dir` to `directionGroup` everywhere it appears in its block scope (lines 1075–1121).

---

### [10] NAME-01 — Shape-based name

**What:** `wrap` (line 1080) is a nested `div` inside the direction group that holds the up/down radio labels side by side. The name `wrap` describes structure (it wraps things) but not purpose.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 1080

**Steps to fix:**
1. Rename `wrap` to `radioToggleWrap` everywhere it appears in its block scope (lines 1080–1119).

---

### [11] NAME-01 — Shape-based name

**What:** `o` is used as the loop variable name for option objects in two map/filter callbacks (lines 379 and 724). In both cases you need to read the surrounding context to know that `o` is an option object with `.value` and `.label` properties. The name `o` is one of the most stripped-down shape names possible.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 379 — inside `getFilterValueLabels`, `options.map((o) => [o.value, o.label])`
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 724 — inside `buildBulkEditRow`, `[...strategySelect.options].some((o) => o.value === storedStrategy)`

**Steps to fix:**
1. Rename the `o` on line 379 to `opt`.
2. Rename the `o` on line 724 to `opt`.

---

### [12] NAME-01 — Shape-based name

**What:** `v` (line 380) is a one-character variable name for a selected value inside a map callback. It describes the type ("some value") not the purpose ("a selected filter value").

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 380

**Steps to fix:**
1. Rename `v` to `selectedValue` on line 380 (both occurrences on that line: `(v) => labelMap[v] ?? String(v)`).

---

### [13] NAME-01 — Shape-based name

**What:** `r` is used three times as the loop variable name for table row elements in arrow-function callbacks (lines 572, 589, 591). The name `r` gives no indication that it refers to a `<tr>` element representing a World Info entry row.

**Where:**
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 572 — `rows.some(r => !isOrderHelperRowSelected(r))`
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 589 — `rows.filter((r) => !r.classList.contains('stwid--state-filtered'))`
- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 591 — `visible.filter((r) => isOrderHelperRowSelected(r)).length`

**Steps to fix:**
1. Rename `r` to `tableRow` on line 572.
2. Rename `r` to `tableRow` on line 589.
3. Rename `r` to `tableRow` on line 591.

---

### [14] SIZE-01 — Large function

**What:** `buildVisibilityRow` is 395 lines long (lines 102–496). It is doing too much: building the row title and collapse wiring, and also building the key-visibility toggle, and also building the entire column-visibility dropdown (including its menu, actions, and checkbox inputs), and also building the sort selector, and also building the filter-panel toggle, and also building the active-filter chip display with all its refresh logic.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 102–496

**Steps to fix:**
1. Extract `buildColumnVisibilityDropdown(orderHelperState, dom, ctx)` (lines 193–292) into a standalone function. It builds and returns the completed `columnVisibilityContainer` element.
2. Extract `buildSortSelector(orderHelperState, dom, ctx)` (lines 301–326) into a standalone function. It builds and returns the completed `tableSortContainer` and wired `sortSel`.
3. Extract `buildFilterChipDisplay(orderHelperState, filterConfigs, clearFilterHandlers, FILTER_KEY_LABELS, getFilterValueLabels)` (lines 345–483) into a standalone function. It builds the active-filters element, defines `refresh`, and returns `{ activeFiltersEl, chipContainer, refresh }`.
4. Replace the extracted blocks in `buildVisibilityRow` with calls to these new functions.
5. The row-title and collapse-wiring blocks should also be collapsed using the helpers from findings [1] and [2].

---

### [15] SIZE-01 — Large function

**What:** `buildBulkEditRow` is 916 lines long (lines 527–1442). It is doing too much: building the row title and collapse wiring, and also building the select-all control, and also building ten separate bulk-edit field containers (state, strategy, position, depth, outlet, order, recursion, budget, probability, sticky, cooldown, delay), and also building the Apply All Changes container, and also defining shared utilities (`getSafeTbodyRows`, `getBulkTargets`, `saveUpdatedBooks`, `setApplyButtonBusy`, `withApplyButtonLock`). Passing everything through a single 900-line function makes each individual container impossible to read in isolation.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 527–1442

**Steps to fix:**
1. Extract the five shared utilities (`getSafeTbodyRows`, `getBulkTargets`, `saveUpdatedBooks`, `setApplyButtonBusy`, `withApplyButtonLock`, lines 595–651) into module-level private functions. They depend only on `dom`, `cache`, `saveWorldInfo`, `buildSavePayload`, and `isOrderHelperRowSelected` — pass these as parameters or close over them in a factory.
2. Extract `buildSelectAllContainer(dom, ctx)` (lines 562–593) into a standalone function. Returns `{ selectContainer, refreshSelectionCount }`.
3. Extract `buildStateContainer(cache, dom, ctx, applyRegistry)` (lines 657–709) into a standalone function. Returns the completed `activeStateContainer`.
4. Extract `buildStrategyContainer(cache, dom, ctx, applyRegistry)` (lines 711–767) into a standalone function. Returns the completed `strategyContainer`.
5. Extract `buildPositionContainer(cache, dom, ctx, applyRegistry)` (lines 769–815) into a standalone function. Returns `{ positionContainer, positionSelect }`.
6. Extract `buildDepthContainer(cache, dom, ctx, applyRegistry, positionSelect)` (lines 817–868) into a standalone function. Returns the completed `depthContainer`.
7. Extract `buildOutletContainer(cache, dom, ctx, applyRegistry, positionSelect)` (lines 870–988) into a standalone function. Returns `{ outletContainer, cleanup }`.
8. Extract `buildOrderContainer(dom, ctx, applyRegistry)` (lines 989–1123) into a standalone function. Returns the completed `orderContainer`.
9. Extract `buildRecursionContainer(cache, dom, ctx, applyRegistry)` (lines 1125–1175) into a standalone function. Returns the completed `recursionContainer`.
10. Extract `buildBudgetContainer(cache, dom, ctx, applyRegistry)` (lines 1177–1217) into a standalone function. Returns the completed `budgetContainer`.
11. Extract containers for probability, sticky, cooldown, and delay (lines 1219–1406) using the same approach — one function per field.
12. Replace each extracted block in `buildBulkEditRow` with a call to its new function, appending the returned element to the row.

---

### [16] NEST-01 — Deep nesting

**What:** Inside `buildVisibilityRow`, the column-visibility dropdown is built using nested block-scoped variable declarations (`const X = el; { ... }`) that reach 5 levels of indentation. The reader must mentally track being inside the function body, inside the `columnVisibilityWrap` block, inside the `menuWrap` block, inside the `menu` block, and then inside the `for` loop with another block-scoped `option` — all before reading any application logic.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 195–292 (deepest points: line 204 inside `caret` block; line 262 inside `option` block inside `for` loop inside `menu` block)

**Steps to fix:**
1. Extract the inner `menuButton` block (lines 199–208) into a standalone function named `buildColumnDropdownButton(hint)`. It creates and returns the `menuButton` element.
2. Extract the `for` loop that builds column checkboxes (lines 261–284) into a standalone function named `buildColumnCheckboxOptions(menu, columns, orderHelperState, columnInputs, onColumnChange)`. It builds and appends the checkbox option elements.
3. Call these functions from the column-visibility block, eliminating two levels of nesting.

---

### [17] NEST-01 — Deep nesting

**What:** Inside `buildBulkEditRow`, the direction radio group is built using four levels of nested block-scoped declarations. Starting from the function body: the `dir` block contains the `wrap` block, which contains the `up` label block, which contains the `inp` input block — four levels just to create a single radio button element.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 1075–1121 (deepest point: line 1086 inside the `inp` block)

**Steps to fix:**
1. Extract the inner radio-button builder into a standalone function named `buildDirectionRadio(name, value, label, hint, directionStorageKey, applyButton)`. It creates the `label` element, the `input`, wires persistence and dirty-marking, and returns the `label`.
2. Call `buildDirectionRadio` twice (for "up" and "down") from the direction group block, eliminating the three-level nesting inside `wrap`.

---

### [18] NEST-01 — Deep nesting

**What:** Inside `buildBulkEditRow`, the recursion-options list is built using four levels of nesting: the function body, the `recursionOptions` block scope, a `for...of` loop, and then a `row` label block containing an `input` block. The checkbox wiring is buried at the deepest level.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, lines 1130–1147 (deepest point: line 1136 inside the `input` block)

**Steps to fix:**
1. Extract the inner `row` block (lines 1133–1144) into a standalone function named `buildRecursionCheckboxRow(value, label, recursionCheckboxes)`. It creates the `label`, the `input`, stores the checkbox, and returns the completed `label`.
2. Replace the nested block inside the `for...of` loop with a call to `buildRecursionCheckboxRow(value, label, recursionCheckboxes)`.

---

### [19] DEAD-01 — Dead code

**What:** `SORT_DIRECTION` is destructured from the `buildVisibilityRow` parameter object (line 120) but is never referenced anywhere in the function body (lines 139–496). The developer has suppressed the lint warning with `// eslint-disable-line no-unused-vars`, confirming it is intentionally unused. The parameter remains in the public API of the function even though callers are forced to pass it for no reason.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 120

**Steps to fix:**
1. Remove `SORT_DIRECTION` from the destructured parameter list on line 120.
2. Search the file for any reference to `SORT_DIRECTION` to confirm it is not used elsewhere (no dynamic string lookup or object property access).
3. Remove the `// eslint-disable-line no-unused-vars` comment on that line at the same time.
4. If the caller always passed `SORT_DIRECTION` as part of a shared context object, no change is needed at the call site — the key is simply ignored.

---

### [20] DEAD-01 — Dead code

**What:** `orderHelperState` is destructured from the `buildBulkEditRow` parameter object (line 529) but is never referenced in the function body (lines 548–1442). The developer has suppressed the lint warning with `// eslint-disable-line no-unused-vars`. Like finding [19], the parameter bloats the function signature without providing anything to the function body.

**Where:** `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`, line 529

**Steps to fix:**
1. Remove `orderHelperState` from the destructured parameter list on line 529.
2. Confirm by searching the `buildBulkEditRow` body (lines 548–1442) that no reference to `orderHelperState` exists within it. (The name appears freely in `buildVisibilityRow`, but that is a separate function.)
3. Remove the `// eslint-disable-line no-unused-vars` comment on that line at the same time.
4. If the caller passes `orderHelperState` as part of a shared context object, no change is needed at the call site — the key is simply ignored.

---

## After Implementation
*Implemented: March 4, 2026*

### What changed

- `src/entry-manager/bulk-editor/bulk-editor.action-bar.js`
- Added shared helpers for repeated UI patterns (`createCollapsibleRowTitle`, `wrapRowContent`, filter-clear handler factory, column dropdown helpers, direction radio builder, recursion checkbox row builder).
- Added named constants for repeated values (`BULK_APPLY_BATCH_SIZE`, `APPLY_DIRTY_CLASS`) and replaced raw literals.
- Extracted visibility-row sub-builders (`buildColumnVisibilityDropdown`, `buildSortSelector`, `buildFilterChipDisplay`) and replaced inline blocks with helper calls.
- Moved bulk-edit shared utilities (`getSafeTbodyRows`, `getBulkTargets`, `saveUpdatedBooks`, apply-button lock helpers) to module scope.
- Renamed unclear local variables (`btn` → `applyButtonEl`, `apply` → `applyOrder`, `dir` → `directionGroup`, `wrap` → `radioToggleWrap`, callback short names like `o/v/r` to descriptive names).
- Replaced deep nested direction/recursion UI blocks with helper calls, keeping behavior the same.

### Risks / What might break

- This touches row-collapsing and action-bar assembly, so the open/close behavior of Visibility and Bulk Editor rows could regress.
- This touches Order direction radio wiring, so saved direction (`up`/`down`) could fail to persist if a wiring mismatch exists.
- This touches filter-chip clear handlers, so clearing a filter chip could fail to refresh chips or indicators in edge cases.

### Manual checks

- Open Entry Manager and click both row headers (`Visibility`, `Bulk Editor`) to confirm each row collapses and expands correctly.
- In Bulk Editor, change `Start`, `Spacing`, and `Direction`, then reload the page and confirm values still match what you set.
- Apply a few filters, verify chips appear, click each chip `×`, and confirm rows, chips, and filter-indicator highlights all update immediately.
- Change several bulk fields, confirm Apply buttons become highlighted, run `Apply All Changes`, and confirm highlights clear only after apply completes.
