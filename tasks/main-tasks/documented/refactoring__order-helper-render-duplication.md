# REFACTORING: Order Helper render layer — eliminate duplication
*Created: February 28, 2026*

**Type:** Refactoring
**Status:** DOCUMENTED

---

## Summary

Four Order Helper files contain large blocks of near-identical code that are copy-pasted 3–6 times each. This refactoring extracts each repeated pattern into a private helper function inside its own file (or into `utils.js` when the helper is genuinely shared). No visible behavior changes — the Order Helper must work exactly the same before and after.

---

## Current Behavior

The extension works correctly. The problem is purely structural:

- Opening Order Helper shows the same filter menus, table cells, and bulk edit containers as before.
- When a developer wants to change how a filter menu looks, they must make the same edit 6 times.
- When a new number-input column is needed in the table, ~20 lines of near-identical boilerplate must be copied.

---

## Expected Behavior

After this refactoring:

- The same Order Helper UI appears with identical behavior.
- Each repeated pattern is written once and called with different parameters.
- Files are meaningfully shorter and easier to navigate.

---

## Agreed Scope

| File | What changes |
|---|---|
| `src/orderHelperRender.tableHeader.js` | Extract private `buildFilterMenu` + `buildFilterColumnHeader`; replace 6 duplicate if/else blocks with a data-driven loop |
| `src/orderHelperRender.tableBody.js` | Extract private `buildNumberInputCell`; replace 6 duplicate number-cell blocks with calls to the helper |
| `src/orderHelperRender.actionBar.js` | Extract private `createLabeledBulkContainer` + `createApplyButton`; reduce ~12 bulk containers from ~35 lines each to ~15; replace inline collapse wiring with call to new util |
| `src/orderHelperRender.utils.js` | Add exported `wireCollapseRow` helper (shared by both action bar rows) |
| `src/orderHelper.js` | Extract private `buildDynamicOptions`; reduce 3 near-identical options-builder functions to one-line calls |

**No new modules.** No changes to public API surfaces. No behavior changes.

---

## Out of Scope

- `orderHelperRender.js` (the orchestrator) — no duplication to fix there.
- `orderHelperRender.filterPanel.js` — unrelated to this refactoring.
- `orderHelperFilters.js` — not part of this scope.
- `orderHelperState.js` — not part of this scope.
- Any CSS, feature behavior, or architectural changes.

---

## Implementation Plan

### Step 1 — `orderHelperRender.tableHeader.js`: extract `buildFilterMenu` and `buildFilterColumnHeader`

**Context:** The 6 filter columns (strategy, position, recursion, outlet, automationId, group) each build identical DOM with a `div.stwid--columnHeader`, a filter button, a multiselect menu, and a `wireMultiselectDropdown` call. The only differences between them are the state key, the normalize function, and the apply function.

- [ ] **1a.** Add a private (non-exported) `buildFilterMenu(config)` function before `buildTableHeader` in `orderHelperRender.tableHeader.js`. Its signature:

  ```js
  /**
   * @param {{
   *   stateKey: string,
   *   stateValuesKey: string,
   *   getOptions: function(): Array<{value: string, label: string}>,
   *   getValues: function(): string[] | null,
   *   normalizeFilters: function(string[]): string[] | null,
   *   applyFilters: function(): void,
   *   onFilterChange: function(): void,
   *   orderHelperState: object,
   * }} config
   * @returns {{ menuWrap: HTMLElement, updateFilterIndicator: function }}
   */
  function buildFilterMenu({ stateKey, stateValuesKey, getOptions, getValues, normalizeFilters, applyFilters, onFilterChange, orderHelperState })
  ```

  When `normalizeFilters` is `null`, use "recursion mode": skip the normalize step; instead set all values if `orderHelperState.filters[stateKey]` is empty; return early from `updateFilterIndicator` if `allValues.length === 0`.

  When `normalizeFilters` is a function, use "standard mode": call `normalizeFilters(orderHelperState.filters[stateKey])` and set the result (or all values if the result is empty).

  In both modes, `isActive = orderHelperState.filters[stateKey].length !== allValues.length`. The DOM structure (menuWrap → menuButton + menu → option labels loop + wireMultiselectDropdown) is identical for all columns.

  The options loop inside `buildFilterMenu` is exactly the same for all 6 columns:
  ```js
  for (const optionData of getOptions()) {
      const option = document.createElement('label');
      option.classList.add('stwid--multiselectDropdownOption', 'stwid--menuItem');
      const inputControl = createMultiselectDropdownCheckbox(
          orderHelperState.filters[stateKey].includes(optionData.value),
      );
      inputControl.input.addEventListener('change', () => {
          if (inputControl.input.checked) {
              if (!orderHelperState.filters[stateKey].includes(optionData.value)) {
                  orderHelperState.filters[stateKey].push(optionData.value);
              }
          } else {
              orderHelperState.filters[stateKey] = orderHelperState.filters[stateKey]
                  .filter((item) => item !== optionData.value);
          }
          updateFilters();
      });
      option.append(inputControl.input, inputControl.checkbox);
      const optionLabel = document.createElement('span');
      optionLabel.textContent = optionData.label;
      option.append(optionLabel);
      menu.append(option);
  }
  ```

  If `getOptions()` returns an empty array, add `menu.classList.add('stwid--empty')` and set `menu.textContent = 'No options available.'`

- [ ] **1b.** Add a private `buildFilterColumnHeader(label, menuConfig, orderHelperState)` function that:
  - Creates `div.stwid--columnHeader` → child `div` with `label` text → child `div.stwid--columnFilter` → calls `buildFilterMenu({ ...menuConfig, orderHelperState })`
  - Returns `{ header: HTMLElement, updateFilterIndicator: function }`

- [ ] **1c.** Inside `buildTableHeader`, build a `filterMenuConfigs` object (keyed by column key) mapping each filterable column to its config:

  ```js
  const filterMenuConfigs = {
      strategy:    { stateKey: 'strategy',     stateValuesKey: 'strategyValues',     getOptions: getStrategyOptions,     getValues: getStrategyValues,     normalizeFilters: normalizeStrategyFilters,     applyFilters: applyOrderHelperStrategyFilters },
      position:    { stateKey: 'position',     stateValuesKey: 'positionValues',     getOptions: getPositionOptions,     getValues: getPositionValues,     normalizeFilters: normalizePositionFilters,     applyFilters: applyOrderHelperPositionFilters },
      recursion:   { stateKey: 'recursion',    stateValuesKey: 'recursionValues',    getOptions: () => ORDER_HELPER_RECURSION_OPTIONS, getValues: null, normalizeFilters: null, applyFilters: applyOrderHelperRecursionFilters },
      outlet:      { stateKey: 'outlet',       stateValuesKey: 'outletValues',       getOptions: getOutletOptions,       getValues: getOutletValues,       normalizeFilters: normalizeOutletFilters,       applyFilters: applyOrderHelperOutletFilters },
      automationId:{ stateKey: 'automationId', stateValuesKey: 'automationIdValues', getOptions: getAutomationIdOptions, getValues: getAutomationIdValues, normalizeFilters: normalizeAutomationIdFilters, applyFilters: applyOrderHelperAutomationIdFilters },
      group:       { stateKey: 'group',        stateValuesKey: 'groupValues',        getOptions: getGroupOptions,        getValues: getGroupValues,        normalizeFilters: normalizeGroupFilters,        applyFilters: applyOrderHelperGroupFilters },
  };
  ```

- [ ] **1d.** Replace the `if (col.key === 'strategy') { ... } else if (...) { ... }` chain inside the `for (const col of ORDER_HELPER_TABLE_COLUMNS)` loop with:

  ```js
  const menuConfig = filterMenuConfigs[col.key];
  if (menuConfig) {
      const { header, updateFilterIndicator } = buildFilterColumnHeader(col.label, { ...menuConfig, onFilterChange }, orderHelperState);
      th.append(header);
      refreshFilterIndicators[col.key] = updateFilterIndicator;
  } else {
      th.textContent = col.label;
  }
  ```

  Where `refreshFilterIndicators` is an object declared before the loop: `const refreshFilterIndicators = {};`

- [ ] **1e.** Replace the 6 `let refreshXxxFilterIndicator = () => {};` declarations with the single `refreshFilterIndicators` object. Update the `return` statement of `buildTableHeader` to use `refreshFilterIndicators`:

  ```js
  return {
      thead,
      refreshStrategyFilterIndicator:     refreshFilterIndicators.strategy     ?? (() => {}),
      refreshPositionFilterIndicator:     refreshFilterIndicators.position     ?? (() => {}),
      refreshRecursionFilterIndicator:    refreshFilterIndicators.recursion    ?? (() => {}),
      refreshOutletFilterIndicator:       refreshFilterIndicators.outlet       ?? (() => {}),
      refreshAutomationIdFilterIndicator: refreshFilterIndicators.automationId ?? (() => {}),
      refreshGroupFilterIndicator:        refreshFilterIndicators.group        ?? (() => {}),
  };
  ```

  The returned property names are unchanged — callers in `orderHelperRender.js` must not need updating.

---

### Step 2 — `orderHelperRender.tableBody.js`: extract `buildNumberInputCell`

**Context:** 6 table cells (depth, order, sticky, cooldown, delay, trigger/selective_probability) all follow the same 20-line pattern: create `<td data-col>`, add a number `<input>`, wire a `change` listener that calls `parseInt`, checks `Number.isFinite`, updates the cache, and calls `enqueueSave`.

- [ ] **2a.** Add a private (non-exported) `buildNumberInputCell(config)` function before `buildTableBody` in `orderHelperRender.tableBody.js`. Its signature:

  ```js
  /**
   * @param {{
   *   col: string,
   *   name: string,
   *   tooltip: string,
   *   max?: string,
   *   getValue: function(): number | undefined | null,
   *   onSave: function(number | undefined): Promise<void>,
   * }} config
   * @returns {HTMLElement} The `<td>` element.
   */
  function buildNumberInputCell({ col, name, tooltip, max = '99999', getValue, onSave })
  ```

  Implementation:
  ```js
  function buildNumberInputCell({ col, name, tooltip, max = '99999', getValue, onSave }) {
      const td = document.createElement('td');
      td.setAttribute('data-col', col);
      td.classList.add('stwid--orderTable--NumberColumns');
      const inp = document.createElement('input');
      inp.classList.add('stwid--input', 'text_pole');
      inp.name = name;
      setTooltip(inp, tooltip);
      inp.min = '0';
      inp.max = max;
      inp.type = 'number';
      inp.value = getValue() ?? '';
      inp.addEventListener('change', async () => {
          const value = parseInt(inp.value);
          await onSave(Number.isFinite(value) ? value : undefined);
      });
      td.append(inp);
      return td;
  }
  ```

- [ ] **2b.** Replace the 6 inline number-cell blocks in `buildTableBody` with calls to `buildNumberInputCell`. Add each returned `<td>` with `tr.append(...)`. The 6 replacements are:

  | Old variable | `col` | `name` | `tooltip` | `max` | `cacheKey` |
  |---|---|---|---|---|---|
  | `depth` | `'depth'` | `'depth'` | `'Entry depth'` | (default) | `depth` |
  | `order` | `'order'` | `'order'` | `'Order value'` | (default) | `order` |
  | `sticky` | `'sticky'` | `'sticky'` | `'Sticky duration'` | (default) | `sticky` |
  | `cooldown` | `'cooldown'` | `'cooldown'` | `'Cooldown duration'` | (default) | `cooldown` |
  | `delay` | `'delay'` | `'delay'` | `'Delay before activation'` | (default) | `delay` |
  | `probability` | `'trigger'` | `'selective_probability'` | `'Trigger chance percentage'` | `'100'` | `selective_probability` |

  For each: `getValue: () => e.data.<field>`, `onSave: async (value) => { cache[e.book].entries[e.data.uid].<field> = value; await enqueueSave(e.book); }`

  Note: the trigger cell's `col` is `'trigger'` (not `'selective_probability'`) — this matches the original `data-col` attribute value. Preserve this exactly.

---

### Step 3 — `orderHelperRender.utils.js`: add `wireCollapseRow`

**Context:** Both `buildVisibilityRow` and `buildBulkEditRow` in `actionBar.js` have the exact same collapse/expand animation logic (chevron toggle, `maxHeight` transition, `closeOpenMultiselectDropdownMenus` on collapse). The code is written out in full twice.

- [ ] **3a.** Add an exported `wireCollapseRow` function to `orderHelperRender.utils.js`:

  ```js
  /**
   * Wires collapse/expand toggle behavior onto a row.
   * The row title element triggers the toggle. The contentWrap element is
   * animated with maxHeight. The chevron icon switches between fa-chevron-down
   * and fa-chevron-right.
   *
   * @param {HTMLElement} rowTitle - The clickable title element.
   * @param {HTMLElement} row - The row container (receives `data-collapsed` and `stwid--collapsed`).
   * @param {HTMLElement} contentWrap - The element whose height is animated.
   * @param {HTMLElement} chevron - The icon element that rotates between down and right.
   * @param {{ initialCollapsed?: boolean }} [options]
   */
  export const wireCollapseRow = (rowTitle, row, contentWrap, chevron, { initialCollapsed = false } = {}) => {
      const applyCollapsedState = (collapsed) => {
          row.dataset.collapsed = String(collapsed);
          row.classList.toggle('stwid--collapsed', collapsed);
          chevron.classList.toggle('fa-chevron-down', !collapsed);
          chevron.classList.toggle('fa-chevron-right', collapsed);
      };

      rowTitle.addEventListener('click', () => {
          const isCollapsed = row.dataset.collapsed === 'true';
          if (isCollapsed) {
              applyCollapsedState(false);
              contentWrap.style.overflow = 'hidden';
              contentWrap.style.maxHeight = '1000px';
              contentWrap.addEventListener('transitionend', () => {
                  contentWrap.style.overflow = '';
                  contentWrap.style.maxHeight = '';
              }, { once: true });
          } else {
              closeOpenMultiselectDropdownMenus();
              contentWrap.style.overflow = 'hidden';
              contentWrap.style.maxHeight = contentWrap.scrollHeight + 'px';
              void contentWrap.offsetHeight;
              contentWrap.style.maxHeight = '0';
              applyCollapsedState(true);
          }
      });

      if (initialCollapsed) {
          applyCollapsedState(true);
          contentWrap.style.overflow = 'hidden';
          contentWrap.style.maxHeight = '0';
      } else {
          applyCollapsedState(false);
      }
  };
  ```

  Note: `closeOpenMultiselectDropdownMenus` is already defined in `utils.js` — no import needed.

---

### Step 4 — `orderHelperRender.actionBar.js`: use `wireCollapseRow` and extract bulk container helpers

- [ ] **4a.** Import `wireCollapseRow` from `./orderHelperRender.utils.js` at the top of `actionBar.js`.

- [ ] **4b.** In `buildVisibilityRow`, replace the inline collapse wiring block (the `rowTitle.addEventListener('click', ...)` handler plus the `if (initialCollapsed)` block at the bottom) with a single call:

  ```js
  wireCollapseRow(rowTitle, row, contentWrap, collapseChevron, { initialCollapsed });
  ```

  Also remove the `row.dataset.collapsed = 'false';` line that precedes the old wiring, since `wireCollapseRow` sets it internally.

- [ ] **4c.** In `buildBulkEditRow`, do the same replacement — the collapse wiring block is structurally identical to the one in `buildVisibilityRow`.

- [ ] **4d.** Add a private (non-exported) `createLabeledBulkContainer(fieldKey, labelText, hintText)` function before `buildBulkEditRow`:

  ```js
  function createLabeledBulkContainer(fieldKey, labelText, hintText) {
      const container = document.createElement('div');
      container.classList.add('stwid--thinContainer');
      container.dataset.field = fieldKey;
      const label = document.createElement('span');
      label.classList.add('stwid--bulkEditLabel');
      label.textContent = labelText;
      const hint = document.createElement('i');
      hint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
      setTooltip(hint, hintText);
      label.append(hint);
      container.append(label);
      return container;
  }
  ```

- [ ] **4e.** Add a private (non-exported) `createApplyButton(tooltip, runFn, applyRegistry)` function before `buildBulkEditRow`:

  ```js
  function createApplyButton(tooltip, runFn, applyRegistry) {
      const btn = document.createElement('div');
      btn.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
      setTooltip(btn, tooltip);
      btn.addEventListener('click', () => runFn());
      applyRegistry.push({
          isDirty: () => btn.classList.contains('stwid--applyDirty'),
          runApply: runFn,
      });
      return btn;
  }
  ```

- [ ] **4f.** Refactor each bulk edit container in `buildBulkEditRow` to use `createLabeledBulkContainer` and `createApplyButton`. Each container reduces from ~35 lines to ~15 lines. Apply to all of: **State, Strategy, Position, Depth, Order, Recursion, Budget, Probability, Sticky, Cooldown, Delay, Outlet** containers (and any others present). Preserve existing behavior exactly — only the scaffolding (container div + label + hint + apply button) changes; the input elements, dirty wiring, and apply logic stay as-is.

  Example — before (State container, ~35 lines):
  ```js
  const activeStateContainer = document.createElement('div');
  activeStateContainer.classList.add('stwid--thinContainer');
  activeStateContainer.dataset.field = 'activeState';
  const activeStateLabel = document.createElement('span');
  activeStateLabel.classList.add('stwid--bulkEditLabel');
  activeStateLabel.textContent = 'State';
  const activeStateLabelHint = document.createElement('i');
  activeStateLabelHint.classList.add('fa-solid', 'fa-fw', 'fa-circle-question', 'stwid--bulkEditLabelHint');
  setTooltip(activeStateLabelHint, '...');
  activeStateLabel.append(activeStateLabelHint);
  activeStateContainer.append(activeStateLabel);
  // ... activeToggle input ...
  const applyActiveState = document.createElement('div');
  applyActiveState.classList.add('menu_button', 'interactable', 'fa-solid', 'fa-fw', 'fa-check');
  setTooltip(applyActiveState, '...');
  const runApplyActiveState = async () => { ... };
  applyActiveState.addEventListener('click', runApplyActiveState);
  applyRegistry.push({ isDirty: ..., runApply: runApplyActiveState });
  activeStateContainer.append(applyActiveState);
  ```

  After:
  ```js
  const activeStateContainer = createLabeledBulkContainer('activeState', 'State', 'Choose enabled or disabled and apply it to all selected entries at once.');
  // ... activeToggle input (unchanged) ...
  const runApplyActiveState = async () => { ... }; // unchanged
  const applyActiveState = createApplyButton('Apply the active state to all selected entries', runApplyActiveState, applyRegistry);
  activeToggle.addEventListener('click', () => applyActiveState.classList.add('stwid--applyDirty'));
  activeStateContainer.append(activeToggle, applyActiveState);
  row.append(activeStateContainer);
  ```

---

### Step 5 — `orderHelper.js`: extract `buildDynamicOptions`

**Context:** `getOutletOptions`, `getAutomationIdOptions`, and `getGroupOptions` all: collect unique values from entries via a per-entry accessor, exclude the "none" value, sort alphabetically, and return `[{ value: noneValue, label: '(none)' }, ...sorted]`.

- [ ] **5a.** Add a private (non-exported) `buildDynamicOptions(entries, getValueFn, noneValue)` function before the three options functions in `orderHelper.js`:

  ```js
  /**
   * Builds a sorted options array from entry data.
   * Handles both single-value and multi-value per-entry accessors.
   *
   * @param {Array<{data: object}>} entries
   * @param {function(object): string | string[]} getValueFn - Returns one value or an array per entry
   * @param {string} noneValue - The sentinel "none" value to prepend as "(none)"
   * @returns {Array<{value: string, label: string}>}
   */
  function buildDynamicOptions(entries, getValueFn, noneValue) {
      const values = new Set();
      for (const entry of entries) {
          const result = getValueFn(entry.data);
          if (Array.isArray(result)) {
              for (const v of result) values.add(v);
          } else {
              values.add(result);
          }
      }
      const labels = [...values].filter((v) => v !== noneValue);
      labels.sort((a, b) => a.localeCompare(b));
      return [
          { value: noneValue, label: '(none)' },
          ...labels.map((label) => ({ value: label, label })),
      ];
  }
  ```

- [ ] **5b.** Replace `getOutletOptions` with a one-liner:

  ```js
  const getOutletOptions = (book = orderHelperState.book) =>
      buildDynamicOptions(getOrderHelperEntries(book), getOutletValueForEntry, OUTLET_NONE_VALUE);
  ```

- [ ] **5c.** Replace `getAutomationIdOptions` with a one-liner:

  ```js
  const getAutomationIdOptions = (book = orderHelperState.book) =>
      buildDynamicOptions(getOrderHelperEntries(book), getAutomationIdValueForEntry, AUTOMATION_ID_NONE_VALUE);
  ```

- [ ] **5d.** Replace `getGroupOptions` with a one-liner:

  ```js
  const getGroupOptions = (book = orderHelperState.book) =>
      buildDynamicOptions(getOrderHelperEntries(book), getGroupValueForEntry, GROUP_NONE_VALUE);
  ```

  Note: `getGroupValueForEntry` returns an array. `buildDynamicOptions` handles this via the `Array.isArray` check.

---

### Step 6 — Verify no public API changes

- [ ] **6a.** Confirm that `buildTableHeader`, `buildTableBody`, `buildVisibilityRow`, `buildBulkEditRow` still export the same function names with the same parameter shapes and return values. The callers in `orderHelperRender.js` must not require any changes.
- [ ] **6b.** Confirm that `getOutletOptions`, `getAutomationIdOptions`, `getGroupOptions`, `getOutletValues`, `getAutomationIdValues`, `getGroupValues` still exist in `orderHelper.js` and return the same shape. The caller (`createOrderHelperRenderer` in `orderHelperRender.js`) passes these as dependencies.
- [ ] **6c.** Confirm that `wireCollapseRow` is the only new export from `orderHelperRender.utils.js`. No existing exports are changed or removed.

---

### Step 7 — Update ARCHITECTURE.md and FEATURE_MAP.md

- [ ] **7a.** In `ARCHITECTURE.md`, update the `orderHelperRender.utils.js` row to mention `wireCollapseRow` in its description: `Shared DOM/utility helpers across orderHelperRender.* slices` → `Shared DOM/utility helpers across orderHelperRender.* slices, including multiselect dropdown wiring and collapsible row animation`.
- [ ] **7b.** In `FEATURE_MAP.md`, the "Shared multiselect dropdown DOM helpers" entry already references `orderHelperRender.utils.js`. Append `wireCollapseRow` to this description: `…; wireCollapseRow wires collapse/expand animation shared by Visibility and Bulk Editor rows`.
