# Split Plan: orderHelperRender.js → Multiple Slice Files

## Why

`orderHelperRender.js` is 138 KB / 1,966 lines — the largest file in the project by a wide
margin. It is hard to understand (too big to hold in your head at once) and inconsistent with
the rest of the codebase (`listPanel.js` was already split into 7 slice files using the same
dot-notation naming pattern).

The previous refactoring plan (`Refactoring_orderHelperRender.js.md`) explicitly listed
"do not split into new files" as a non-goal. This plan supersedes that constraint.

The split is **purely internal**. The public API (`createOrderHelperRenderer` /
`renderOrderHelper`) stays identical. `orderHelper.js` — the only consumer — never changes.

---

## Resulting file structure

| File | Contents | Lines (approx.) |
|------|----------|-----------------|
| `src/constants.js` | + 4 ORDER_HELPER column/option constants | +35 |
| `src/orderHelperRender.utils.js` | 6 utility functions + `MULTISELECT_DROPDOWN_CLOSE_HANDLER` | ~125 |
| `src/orderHelperRender.actionBar.js` | Action bar: select-all, column toggle, sort, filter toggle, Apply Order | ~350 |
| `src/orderHelperRender.filterPanel.js` | Script-based filter input + live preview | ~145 |
| `src/orderHelperRender.tableHeader.js` | `<thead>` with 6 multiselect column filter menus | ~495 |
| `src/orderHelperRender.tableBody.js` | Row loop + named cell builders + end-of-build filter init | ~685 |
| `src/orderHelperRender.js` | Orchestrator: Init + section calls + DOM assembly + Mount | ~120 |

---

## Section boundary map (source → destination)

| Lines in source | Section | Destination file |
|----------------|---------|-----------------|
| 69 | `MULTISELECT_DROPDOWN_CLOSE_HANDLER` constant | utils.js |
| 71–152 | Utility helper functions | utils.js |
| 154–187 | `wireMultiselectDropdown` helper | utils.js |
| 189–238 | `TOGGLE_COLUMNS`, `TABLE_COLUMNS`, `NUMBER_COLUMN_KEYS`, `RECURSION_OPTIONS` | constants.js (renamed with `ORDER_HELPER_` prefix) |
| 253–288 | Init block | orchestrator (stays in orderHelperRender.js) |
| 290–294 | Body container creation + class setup | orchestrator |
| 295–637 | Action bar | actionBar.js → `buildActionBar(ctx)` |
| 639–778 | Filter panel | filterPanel.js → `buildFilterPanel(ctx)` |
| 780–1278 | Table header | tableHeader.js → `buildTableHeader(ctx)` |
| 1280–1955 | Table body + post-build filter init | tableBody.js → `buildTableBody(ctx)` |
| 1958–1960 | Mount | orchestrator (stays in orderHelperRender.js) |

---

## Cross-section dependency map

| Dependency | Defined in | Used in | Transport |
|-----------|-----------|---------|-----------|
| `body` DOM element | orchestrator (before section calls) | actionBar (event listeners mutate body classes) | passed in `ctx.body` |
| `entries` array | orchestrator Init (`getOrderHelperEntries`) | tableBody loop | passed in `ctx.entries` |
| `refreshOutletFilterIndicator` | tableHeader return value | tableBody outlet change handler | orchestrator threads via return → ctx |
| `refreshAutomationIdFilterIndicator` | tableHeader return value | tableBody automationId change handler | orchestrator threads via return → ctx |
| `refreshGroupFilterIndicator` | tableHeader return value | tableBody group change handler | orchestrator threads via return → ctx |
| `dom.order.filter.root` | set by filterPanel builder | action bar filterToggle click handler | already via `dom` object ref (late-bound, set before first click) |
| `dom.order.tbody` | set by tableBody builder | action bar Apply Order click handler | already via `dom` object ref (late-bound, set before first click) |

---

## Builder function signatures

### `buildActionBar(ctx)` → `Element`
```
ctx: { body, orderHelperState, dom, ORDER_HELPER_HIDE_KEYS_STORAGE_KEY,
       ORDER_HELPER_COLUMNS_STORAGE_KEY, ORDER_HELPER_DEFAULT_COLUMNS,
       applyOrderHelperColumnVisibility, clearOrderHelperScriptFilters,
       setOrderHelperSort, applyOrderHelperSortToDom, ensureCustomDisplayIndex,
       saveWorldInfo, buildSavePayload, appendSortOptions, getOrderHelperEntries,
       isOrderHelperRowSelected, setAllOrderHelperRowSelected,
       updateOrderHelperSelectAllButton, getOrderHelperRows, updateOrderHelperPreview,
       SORT, SORT_DIRECTION }
```

### `buildFilterPanel(ctx)` → `Element`
```
ctx: { dom, orderHelperState, getOrderHelperEntries, setOrderHelperRowFilterState,
       SlashCommandParser, debounce, hljs, isTrueBoolean }
```

### `buildTableHeader(ctx)` → `{ thead, refreshOutletFilterIndicator, refreshAutomationIdFilterIndicator, refreshGroupFilterIndicator }`
```
ctx: { orderHelperState, applyOrderHelperStrategyFilters, applyOrderHelperPositionFilters,
       applyOrderHelperRecursionFilters, applyOrderHelperOutletFilters,
       applyOrderHelperAutomationIdFilters, applyOrderHelperGroupFilters,
       normalizeStrategyFilters, normalizePositionFilters, normalizeOutletFilters,
       normalizeAutomationIdFilters, normalizeGroupFilters,
       getStrategyOptions, getStrategyValues, getPositionOptions, getPositionValues,
       getOutletOptions, getOutletValues, getAutomationIdOptions, getAutomationIdValues,
       getGroupOptions, getGroupValues }
```

### `buildTableBody(ctx)` → `Element` (`<tbody>`)
```
ctx: { entries, orderHelperState, dom, cache,
       refreshOutletFilterIndicator, refreshAutomationIdFilterIndicator,
       refreshGroupFilterIndicator,
       isOutletPosition, saveWorldInfo, buildSavePayload, focusWorldEntry,
       isOrderHelperRowSelected, setOrderHelperRowSelected,
       updateOrderHelperSelectAllButton, setOrderHelperRowFilterState,
       applyOrderHelperStrategyFilterToRow, applyOrderHelperPositionFilterToRow,
       applyOrderHelperRecursionFilterToRow,
       applyOrderHelperStrategyFilters, applyOrderHelperRecursionFilters,
       applyOrderHelperOutletFilters, applyOrderHelperAutomationIdFilters,
       applyOrderHelperGroupFilters, syncOrderHelperOutletFilters,
       syncOrderHelperAutomationIdFilters, syncOrderHelperGroupFilters,
       getEditorPanelApi, entryState, getOrderHelperRows, setOrderHelperSort,
       SORT, SORT_DIRECTION, getSortableDelay, $ }
```

---

## Import graph (after split)

```
orderHelperRender.js (orchestrator)
  ├── ./orderHelperRender.actionBar.js
  ├── ./orderHelperRender.filterPanel.js
  ├── ./orderHelperRender.tableHeader.js
  ├── ./orderHelperRender.tableBody.js
  └── ./constants.js  (ORDER_HELPER_TOGGLE_COLUMNS only, for body setup)

orderHelperRender.actionBar.js
  ├── ./orderHelperRender.utils.js  (setTooltip, createMultiselectDropdownCheckbox, wireMultiselectDropdown, MULTISELECT_DROPDOWN_CLOSE_HANDLER)
  └── ./constants.js  (ORDER_HELPER_TOGGLE_COLUMNS)

orderHelperRender.filterPanel.js
  └── (no local imports — all deps via ctx)

orderHelperRender.tableHeader.js
  ├── ./orderHelperRender.utils.js  (setTooltip, createMultiselectDropdownCheckbox, wireMultiselectDropdown)
  └── ./constants.js  (ORDER_HELPER_TABLE_COLUMNS, ORDER_HELPER_NUMBER_COLUMN_KEYS, ORDER_HELPER_RECURSION_OPTIONS)

orderHelperRender.tableBody.js
  ├── ./orderHelperRender.utils.js  (setTooltip, formatCharacterFilter)
  └── ./constants.js  (ORDER_HELPER_RECURSION_OPTIONS)
```

---

## Constants renaming

| Old name (file-local) | New name (exported from constants.js) |
|----------------------|--------------------------------------|
| `TOGGLE_COLUMNS` | `ORDER_HELPER_TOGGLE_COLUMNS` |
| `TABLE_COLUMNS` | `ORDER_HELPER_TABLE_COLUMNS` |
| `NUMBER_COLUMN_KEYS` | `ORDER_HELPER_NUMBER_COLUMN_KEYS` |
| `RECURSION_OPTIONS` | `ORDER_HELPER_RECURSION_OPTIONS` |

---

## Safety checklist

Same as `Refactoring_orderHelperRender.js.md` Phase 4 checklist. All invariants must hold:

1. Opening in single-book and "all active books" mode renders correctly
2. Sort, drag/drop reorder, move buttons persist custom order
3. Apply Order skips filtered rows and respects start/step/direction
4. Every inline field edit (all 14 column types) updates cache and saves to correct book
5. All 6 header filter menus (strategy, position, recursion, outlet, automationId, group) + script filter combine correctly
6. Column visibility presets and individual toggles persist across reload
7. Entry link click focuses the correct entry in the main list/editor
8. Missing `#entry_edit_template` controls throw a clear error (no silent failure)

---

## AFTER IMPLEMENTATION

### Task checklist

- [x] Create `docs/planning/Split_orderHelperRender.js.md`
- [x] Update `src/constants.js` — add 4 ORDER_HELPER constants
- [x] Create `src/orderHelperRender.utils.js`
- [x] Create `src/orderHelperRender.actionBar.js`
- [x] Create `src/orderHelperRender.filterPanel.js`
- [x] Create `src/orderHelperRender.tableHeader.js`
- [x] Create `src/orderHelperRender.tableBody.js`
- [x] Refactor `src/orderHelperRender.js` into orchestrator
- [x] Update `ARCHITECTURE.md`, `FEATURE_MAP.md`, `CHANGELOG.md`
