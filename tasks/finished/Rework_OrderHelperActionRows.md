# Rework: Order Helper — Replace Action Bar with Two New Rows

## Context

The Order Helper currently has a single `div.stwid--actions` action bar that mixes two unrelated concerns in one horizontal strip:
- **General table controls**: select-all, key visibility, column visibility, sort, filter toggle
- **Order-field bulk editing**: Start value, Spacing, Direction radios, Apply Order button

The user wants the action bar fully replaced by two semantically distinct rows:

1. **`stwid--visibilityRow`** — general controls + live entry count + active column-filter chips
2. **`stwid--bulkEditRow`** — one labeled bordered box per editable field (Order box now; more fields later)

This rework improves discoverability: the visibility row communicates what you're looking at, and the bulk edit row communicates what you can do to it. More bulk-edit containers (strategy, position, depth, etc.) will be added to Row 2 in future iterations.

---

## Final Design

### Row 1: Visibility Row (`div.stwid--visibilityRow`)

Left side — all controls moved unchanged from the old action bar:
- Select-all toggle (checkbox icon)
- Key visibility toggle (eye icon)
- Column visibility multiselect dropdown
- Divider
- Sort selector
- Script filter toggle

Right side — visibility info section (`div.stwid--visibilityInfo`):
- `span.stwid--visibilityCount` → `"Showing X of Y entries"` — always visible
- `div.stwid--activeFilters` → hidden when no column filters are active; visible when ≥1 is active:
  - `span` → `"Active filters:"`
  - `div.stwid--filterChip` × N — one per active column filter
    - `span` → `"FilterLabel: value1, value2"` (human-readable label from options)
    - `button.stwid--chipRemove` → `"×"` — clicking clears the entire filter for that key

When no column filters are active: row shows count only, `stwid--activeFilters` is hidden.

### Row 2: Bulk Edit Row (`div.stwid--bulkEditRow`)

One bordered labeled box per field. For now, only the **Order** box:

**`div.stwid--bulkEditContainer[data-field="order"]`**
- `span.stwid--bulkEditLabel` → `"Order"` (small label inside or above the box border)
- Start value input (same as current)
- Spacing input (same as current)
- Direction radios up/down (same as current)
- Apply Order button (same as current)

> Future containers will be added here for strategy, position, depth, etc. The row uses `flex-wrap: wrap` to accommodate multiple containers.

---

## Architecture

### How filter chips stay in sync

Each of the 6 column filter menus in `buildTableHeader` has a local `updateFilterIndicator()` function that toggles the active dot on the filter button. Currently, filter changes do not notify any other UI component.

**New coordination mechanism:**
1. `buildTableHeader` accepts a new **`onFilterChange`** callback parameter.
2. After each filter change in each of the 6 menus (after `updateFilterIndicator()` + `applyOrderHelperXFilters()`), `onFilterChange()` is called.
3. `buildVisibilityRow` exposes a `refresh()` function that reads from `orderHelperState.filters` and `dom.order.tbody` to rebuild the chip area and count.
4. In `renderOrderHelper`, `onFilterChange` is wired to `refreshVisibilityRow`.

**How chip X resets the header indicator dot:**

`buildTableHeader` currently returns 3 indicator callbacks (`refreshOutletFilterIndicator`, `refreshAutomationIdFilterIndicator`, `refreshGroupFilterIndicator`) for strategy/position/recursion filters, no callback is currently returned. This must be extended to return all 6.

A **`filterIndicatorRefs`** plain object `{}` is created in `renderOrderHelper` before building any rows. After `buildTableHeader` runs and returns all 6 indicator callbacks, they are assigned into `filterIndicatorRefs`. The chip X handlers inside `buildVisibilityRow` close over `filterIndicatorRefs` and call the correct entry at click time (the object is fully populated by then).

### Chip "active" logic

A filter is **active** (chip shown) when its selected values count is less than the total available values count:

| Filter key    | All values                                                          | Options (for labels)              |
|---------------|---------------------------------------------------------------------|-----------------------------------|
| `strategy`    | `orderHelperState.strategyValues` or `getStrategyValues()`          | `getStrategyOptions()`            |
| `position`    | `orderHelperState.positionValues` or `getPositionValues()`          | `getPositionOptions()`            |
| `recursion`   | `orderHelperState.recursionValues` or `ORDER_HELPER_RECURSION_OPTIONS.map(o=>o.value)` | `ORDER_HELPER_RECURSION_OPTIONS`  |
| `outlet`      | `getOutletValues()`                                                 | `getOutletOptions()`              |
| `automationId`| `getAutomationIdValues()`                                           | `getAutomationIdOptions()`        |
| `group`       | `getGroupValues()`                                                  | `getGroupOptions()`               |

Chip labels: filter key → human-readable name comes from `ORDER_HELPER_TOGGLE_COLUMNS` (e.g., `strategy → "Strategy"`). For recursion use `"Recursion"` (it's also a toggle column label).

### Entry count logic (inside `refresh()`)

```js
const rows = dom.order.tbody ? [...dom.order.tbody.children] : [];
const total = rows.length;
const visible = rows.filter(r => !r.classList.contains('stwid--isFiltered')).length;
// countEl.textContent = `Showing ${visible} of ${total} entries`;
```

### Chip X click handler logic

```js
// per filter key (e.g., 'strategy'):
1. const allValues = [...(orderHelperState.strategyValues.length ? orderHelperState.strategyValues : getStrategyValues())];
2. orderHelperState.filters.strategy = allValues;
3. applyOrderHelperStrategyFilters();       // re-filter all rows
4. filterIndicatorRefs.strategy?.();        // reset header dot
5. refresh();                               // rebuild chips + count
```

---

## Critical Files to Modify

| File | Change type | What changes |
|------|-------------|--------------|
| [src/orderHelperRender.actionBar.js](../../src/orderHelperRender.actionBar.js) | **Major** | Replace `buildActionBar` export with two new exports: `buildVisibilityRow` and `buildBulkEditRow` |
| [src/orderHelperRender.js](../../src/orderHelperRender.js) | **Medium** | Import new builders; create `filterIndicatorRefs`; wire `onFilterChange`; populate refs after `buildTableHeader`; update `body.append(...)` |
| [src/orderHelperRender.tableHeader.js](../../src/orderHelperRender.tableHeader.js) | **Minor** | Add `onFilterChange` param; call it after each filter change; add 3 missing indicator return values |
| [style.css](../../style.css) | **Minor** | Rename `.stwid--actions` rule to cover new row classes; update child selectors; remove `stwid--actionsRight`; add new rules |
| [FEATURE_MAP.md](../../FEATURE_MAP.md) | **Docs** | Update Order Helper section entries |

No new module files are needed.

---

## Reusable Existing Functions and Patterns

- `setTooltip`, `wireMultiselectDropdown`, `createMultiselectDropdownCheckbox` from [src/orderHelperRender.utils.js](../../src/orderHelperRender.utils.js) — reuse unchanged in `buildVisibilityRow`
- `ORDER_HELPER_TOGGLE_COLUMNS` from [src/constants.js](../../src/constants.js) — provides `{ key, label }` for chip header names
- `ORDER_HELPER_RECURSION_OPTIONS` from [src/constants.js](../../src/constants.js) — static source for recursion option labels
- `stwid--visibilityChip` / `stwid--visibilityChips` CSS from [style.css](../../style.css) (line 304–328) — pattern to follow for new `stwid--filterChip` style (same pill shape/colors; new class needed because this is inside `.stwid--orderHelper` not `.stwid--list`)
- `stwid--multiselectDropdownWrap/Button/Menu` family — unchanged; reused for column visibility and sort controls in the visibility row
- `menu_button` ST class — unchanged; used for icon buttons in the left side of the visibility row

---

## Implementation Steps

### Step 1 — `src/orderHelperRender.actionBar.js`

Delete `buildActionBar`. Add two exported functions:

**`export function buildVisibilityRow(ctx)`**

Context params: all existing `buildActionBar` params + new filter-related params:
`applyOrderHelperStrategyFilters`, `applyOrderHelperPositionFilters`, `applyOrderHelperRecursionFilters`, `applyOrderHelperOutletFilters`, `applyOrderHelperAutomationIdFilters`, `applyOrderHelperGroupFilters`, `getStrategyOptions`, `getPositionOptions`, `getOutletOptions`, `getAutomationIdOptions`, `getGroupOptions`, `getStrategyValues`, `getPositionValues`, `getOutletValues`, `getAutomationIdValues`, `getGroupValues`, `filterIndicatorRefs`

Construction:
1. `const row = document.createElement('div'); row.classList.add('stwid--visibilityRow');`
2. Add all left-side controls (select-all, key toggle, column-visibility, divider, sort, filter-toggle) — **exact same code** as current `buildActionBar`, just moved into this function, omitting the `rightGroup` block
3. Add `div.stwid--visibilityInfo` containing:
   - `span.stwid--visibilityCount` (initially `"Showing 0 of 0 entries"`)
   - `div.stwid--activeFilters` with `"Active filters:"` span + chip container div
4. Define `const refresh = ()=>{ ... }` (rebuilds count + chips, see chip logic above)
5. Return `{ element: row, refresh }`

**`export function buildBulkEditRow(ctx)`**

Context params: `dom`, `orderHelperState`, `cache`, `saveWorldInfo`, `buildSavePayload`, `isOrderHelperRowSelected`, `getOrderHelperRows`

Construction:
1. `const row = document.createElement('div'); row.classList.add('stwid--bulkEditRow');`
2. `const orderContainer = document.createElement('div'); orderContainer.classList.add('stwid--bulkEditContainer'); orderContainer.dataset.field = 'order';`
3. Add `span.stwid--bulkEditLabel` with text `"Order"` inside `orderContainer`
4. Move the Apply Order button, startLbl, stepLbl, dir controls into `orderContainer` — **exact same code** as current `rightGroup` block (minus the leading divider and `stwid--actionsRight` wrapper)
5. `row.append(orderContainer);`
6. Return `row`

### Step 2 — `src/orderHelperRender.js`

```js
// Import change:
import { buildVisibilityRow, buildBulkEditRow } from './orderHelperRender.actionBar.js';

// Inside renderOrderHelper(), after body is created:
const filterIndicatorRefs = {};

const { element: visibilityRowEl, refresh: refreshVisibilityRow } = buildVisibilityRow({
    body, orderHelperState, dom, cache,
    ORDER_HELPER_HIDE_KEYS_STORAGE_KEY, ORDER_HELPER_COLUMNS_STORAGE_KEY, ORDER_HELPER_DEFAULT_COLUMNS,
    applyOrderHelperColumnVisibility, clearOrderHelperScriptFilters,
    setOrderHelperSort, applyOrderHelperSortToDom, ensureCustomDisplayIndex,
    saveWorldInfo, buildSavePayload, appendSortOptions, getOrderHelperEntries,
    isOrderHelperRowSelected, setAllOrderHelperRowSelected, updateOrderHelperSelectAllButton,
    getOrderHelperRows, updateOrderHelperPreview, SORT, SORT_DIRECTION,
    // new:
    applyOrderHelperStrategyFilters, applyOrderHelperPositionFilters, applyOrderHelperRecursionFilters,
    applyOrderHelperOutletFilters, applyOrderHelperAutomationIdFilters, applyOrderHelperGroupFilters,
    getStrategyOptions, getPositionOptions, getOutletOptions, getAutomationIdOptions, getGroupOptions,
    getStrategyValues, getPositionValues, getOutletValues, getAutomationIdValues, getGroupValues,
    filterIndicatorRefs,
});

const bulkEditRowEl = buildBulkEditRow({
    dom, orderHelperState, cache, saveWorldInfo, buildSavePayload,
    isOrderHelperRowSelected, getOrderHelperRows,
});

// buildTableHeader call — add onFilterChange:
const {
    thead,
    refreshStrategyFilterIndicator,   // NEW
    refreshPositionFilterIndicator,   // NEW
    refreshRecursionFilterIndicator,  // NEW
    refreshOutletFilterIndicator,
    refreshAutomationIdFilterIndicator,
    refreshGroupFilterIndicator,
} = buildTableHeader({
    ...existingParams,
    onFilterChange: () => refreshVisibilityRow(),
});

// Populate filterIndicatorRefs after tableHeader is built:
filterIndicatorRefs.strategy    = refreshStrategyFilterIndicator;
filterIndicatorRefs.position    = refreshPositionFilterIndicator;
filterIndicatorRefs.recursion   = refreshRecursionFilterIndicator;
filterIndicatorRefs.outlet      = refreshOutletFilterIndicator;
filterIndicatorRefs.automationId = refreshAutomationIdFilterIndicator;
filterIndicatorRefs.group       = refreshGroupFilterIndicator;

// Assembly (replace actionsEl):
body.append(visibilityRowEl, bulkEditRowEl, filterEl, wrap);
```

Also call `refreshVisibilityRow()` after tbody is built (so the initial count is correct):
```js
// After buildTableBody:
refreshVisibilityRow();
```

### Step 3 — `src/orderHelperRender.tableHeader.js`

1. Add `onFilterChange = ()=>{}` to the destructured params of `buildTableHeader`
2. In each of the 6 filter blocks, after the existing `updateFilterIndicator()` call that follows a filter change, add `onFilterChange()`
3. In strategy, position, and recursion blocks — expose `updateFilterIndicator` as a returned function:
   ```js
   let refreshStrategyFilterIndicator = ()=>{};
   // Inside strategy block:
   refreshStrategyFilterIndicator = updateFilterIndicator;
   // ... (same for position, recursion)
   ```
4. Update `@returns` JSDoc and the return object:
   ```js
   return {
       thead,
       refreshStrategyFilterIndicator,
       refreshPositionFilterIndicator,
       refreshRecursionFilterIndicator,
       refreshOutletFilterIndicator,
       refreshAutomationIdFilterIndicator,
       refreshGroupFilterIndicator,
   };
   ```

### Step 4 — `style.css`

**Rename and update existing rules** (lines ~1062–1120):

| Old selector | New selector |
|---|---|
| `.stwid--orderHelper .stwid--actions` | `.stwid--orderHelper .stwid--visibilityRow, .stwid--orderHelper .stwid--bulkEditRow` |
| `.stwid--orderHelper .stwid--actions .stwid--actionsDivider` | `.stwid--orderHelper .stwid--visibilityRow .stwid--actionsDivider` |
| `.stwid--orderHelper .stwid--actions .stwid--inputWrap` | `.stwid--orderHelper .stwid--visibilityRow .stwid--inputWrap` |
| `.stwid--orderHelper .stwid--actions .stwid--inputWrap .stwid--input` | `.stwid--orderHelper .stwid--bulkEditRow .stwid--inputWrap .stwid--input` |
| `.stwid--orderHelper .stwid--actions .stwid--columnVisibility` | `.stwid--orderHelper .stwid--visibilityRow .stwid--columnVisibility` |
| `.stwid--orderHelper .stwid--actions .stwid--columnVisibility .stwid--columnVisibilityLabel` | keep under visibility row |
| `.stwid--orderHelper .stwid--actions .stwid--actionsRight` | **remove** (no longer used) |
| `.stwid--orderHelper .stwid--actions .stwid--actionsRight .stwid--actionsDivider` | **remove** |

**Add new rules** after the renamed block:

```css
/* Visibility row — right side */
.stwid--orderHelper .stwid--visibilityInfo {
  display: flex;
  align-items: center;
  gap: 0.75em;
  margin-left: auto;
  flex-wrap: wrap;
}

.stwid--orderHelper .stwid--visibilityCount {
  color: var(--SmartThemeEmColor);
  font-size: smaller;
  white-space: nowrap;
}

.stwid--orderHelper .stwid--activeFilters {
  display: flex;
  align-items: center;
  gap: 0.35em;
  flex-wrap: wrap;
  font-size: smaller;
  color: var(--SmartThemeEmColor);
}

/* Filter chips — same visual style as stwid--visibilityChip but scoped to orderHelper */
.stwid--orderHelper .stwid--filterChip {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: var(--stwid-radius-s, 4px);
  padding: 0.1em 0.35em;
  font-size: 0.85em;
  background-color: color-mix(in srgb, var(--SmartThemeBlurTintColor) 85%, black 10%);
}

.stwid--orderHelper .stwid--chipRemove {
  background: none;
  border: none;
  padding: 0 0.1em;
  cursor: pointer;
  color: var(--SmartThemeQuoteColor);
  line-height: 1;
  font-size: 1em;
}

.stwid--orderHelper .stwid--chipRemove:hover {
  color: var(--SmartThemeDangerColor, var(--SmartThemeQuoteColor));
}

/* Bulk edit row */
.stwid--orderHelper .stwid--bulkEditRow {
  flex-wrap: wrap;
  gap: 0.75em;
  padding: 0.4em 0.5em;
}

.stwid--orderHelper .stwid--bulkEditContainer {
  display: flex;
  align-items: center;
  gap: 0.5em;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: var(--stwid-radius-s, 4px);
  padding: 0.35em 0.65em;
  position: relative;
}

.stwid--orderHelper .stwid--bulkEditLabel {
  position: absolute;
  top: -0.6em;
  left: 0.4em;
  font-size: 0.7em;
  background-color: var(--SmartThemeBlurTintColor);
  padding: 0 0.25em;
  color: var(--SmartThemeEmColor);
  line-height: 1;
}

.stwid--orderHelper .stwid--bulkEditRow .stwid--inputWrap {
  display: flex;
  align-items: center;
  gap: 0.5em;
  color: var(--SmartThemeEmColor);
  font-size: smaller;
}

.stwid--orderHelper .stwid--bulkEditRow .stwid--inputWrap .stwid--input {
  width: 33%;
  min-width: 4em;
}
```

### Step 5 — `FEATURE_MAP.md`

Update the Order Helper section:
- Line ~87: change `Table renderer and control bar (sort, select-all, filter toggle, apply order) → ...` to reflect the new two-row structure
- Line ~89: change `Start/spacing/direction apply-to-order workflow → src/orderHelperRender.actionBar.js` (add note about bulk edit row)
- Add new entry: `Visibility row (entry count, active filter chips with X clear) → src/orderHelperRender.actionBar.js`
- Add new entry: `Bulk edit row structure (field containers, starting with Order) → src/orderHelperRender.actionBar.js`

---

## ST Context / Integration Notes

- No SillyTavern APIs are added or changed — this is a pure DOM/UI rework within the extension's own Order Helper popup.
- `dom.order.start`, `dom.order.step`, `dom.order.direction`, `dom.order.selectAll` refs are still assigned inside the new builder functions — no change to their usage in the `apply` button and `buildTableBody`.
- `orderHelperState.filters.{key}` mutation and `dom.order.tbody.children` read are both local to the extension — no ownership boundary concerns.
- `stwid--isFiltered` class on `<tr>` rows — read-only by `refresh()`, ownership stays in `orderHelperFilters.js`.

---

## Verification

After implementation, open the Order Helper and verify:

1. **Old action bar gone** — no `div.stwid--actions` appears; two distinct rows appear instead.
2. **Visibility row left side** — select-all, eye, column-visibility dropdown, divider, sort selector, filter-toggle all present and functional.
3. **Count accurate** — `"Showing X of Y entries"` reflects current table row count with no filters active (should be `"Showing N of N entries"`).
4. **No chips when unfiltered** — `stwid--activeFilters` section is hidden; `"Active filters:"` text not visible.
5. **Apply a column filter** (e.g., uncheck one strategy) → chip appears in visibility row: `"Strategy: <remaining values>"`. Count updates. `stwid--activeFilters` appears.
6. **Click chip X** → filter clears, chip disappears, header indicator dot resets, count resets to N/N.
7. **Apply multiple filters** → multiple chips appear, each independently clearable.
8. **Bulk edit row** — "Order" labeled bordered box visible. Start, Spacing, Direction, Apply button all work exactly as before (save, persist, apply to selected rows).
9. **Column visibility dropdown** — works from visibility row; columns hide/show correctly.
10. **Sort selector** — works; sort persists.
11. **Script filter toggle** — opens/closes `stwid--filter` panel as before.
12. **Select-all** — selects/deselects all rows; `dom.order.selectAll` ref works.
13. **Key visibility toggle** — shows/hides keyword column text.
