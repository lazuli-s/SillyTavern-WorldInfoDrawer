# REWORK: Bulk Editor Tab — Preset API Preparation
*Created: March 11, 2026*

**Type:** Rework
**Status:** DOCUMENTED

---

## Summary

The incoming bulk editor presets feature needs to read, write, and reset the value of every
bulk-edit section. Currently those sections are self-contained DOM widgets that return only a
container element — no external code can ask what they currently hold or tell them to load a
preset value. This task adds `getValue`, `setValue`, and `clearValue` functions to every
section builder, extracts the Apply All logic into a callable `runApplyAll` helper, and
assembles a `valueRegistry` and `getSelectedEntryCount` function inside `buildBulkEditRow` so
the preset column (built in the subsequent task) can plug in without touching section internals.

No user-visible behaviour changes. No new UI. No preset files are created here.

---

## Current Behavior

Each bulk-edit section builder (`buildBulkStateSection`, `buildBulkStrategySection`, etc.)
returns a plain DOM container element. The row assembler appends that element and discards the
return value. Sections manage their own state internally with no external read/write API.

The Apply All click handler is an anonymous async function inside `buildApplyAllSection`. There
is no way to call it programmatically or learn how many sections were actually applied.

---

## Expected Behavior

After this task:

- Every section builder returns `{ container, getValue, setValue, clearValue }` (Position
  preserves its existing named keys and adds the three new ones).
- `getValue()` returns the section's current value payload (e.g. `{ state: 'enabled' }`) if
  the user changed it this Entry Manager session, or `null` if untouched.
- `setValue(presetValues)` fills the section's UI controls with the preset's values, marks
  `wasChangedThisSession = true`, and marks that section's apply button dirty.
- `clearValue()` resets the section's controls to a neutral blank/initial state, clears
  `wasChangedThisSession`, and removes that section's apply button dirty marker.
- `buildApplyAllSection` returns `{ container, applyButton, runApplyAll }` where
  `runApplyAll()` resolves to `{ appliedSections: number }`.
- `buildBulkEditRow` returns
  `{ element, refreshSelectionCount, cleanup, valueRegistry, getSelectedEntryCount, runApplyAll }`
  for the preset feature to consume.

### Runtime state contract

Each section tracks `wasChangedThisSession` separately from the existing `APPLY_DIRTY_CLASS`
on its apply button. These are related but not the same:

| Signal | Set by | Cleared by |
|---|---|---|
| `wasChangedThisSession` | User interaction or `setValue()` | `clearValue()` only |
| `APPLY_DIRTY_CLASS` | User interaction or `setValue()` | `clearValue()` **and** a successful Apply |

A successful apply must **not** clear `wasChangedThisSession` — the current session can still
be saved as a preset after applying.

---

## Agreed Scope

| File | Change |
|---|---|
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js` | Add `makeSessionTrackedAPI` helper; update all section builders; update `buildApplyAllSection` |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js` | Add `getValue`, `setValue`, `clearValue` to `buildBulkPositionSection`; expose sub-inputs from helpers |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js` | Change `buildBulkOrderSection` return shape; add `getValue`, `setValue`, `clearValue` |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.js` | Update `appendBulkSection`; assemble `valueRegistry`; add `getSelectedEntryCount`; update return |

---

## Out of Scope

- `src/shared/settings.js` — adding `bulkEditorPresets` is part of the preset feature task.
- Creating any preset files (`presets-store.js`, `preset-values.js`, `presets-column.js`,
  `presets-popup.js`).
- Importing or wiring `buildPresetsColumn` into the row — that happens in the preset feature
  task.
- Any change to user-visible behaviour. Every section must behave exactly as today when
  `getValue/setValue/clearValue` are not externally called.

---

## Implementation Plan

### Step 1 — Add `makeSessionTrackedAPI` helper to `bulk-edit-row.sections.js`

Add a **module-private** function `makeSessionTrackedAPI` near the top of the file (after the
constants). This helper owns the repeated `wasChangedThisSession` pattern so no section
duplicates it.

- [ ] Define `function makeSessionTrackedAPI({ applyButton, readValue, applyValue, resetToInitial })`.
- [ ] Inside: declare `let wasChangedThisSession = false`.
- [ ] Define `function getValue()`: if `!wasChangedThisSession` return `null`; otherwise return
  `readValue()`.
- [ ] Define `function setValue(presetValues)`: call `applyValue(presetValues)`, set
  `wasChangedThisSession = true`, call `applyButton.classList.add(APPLY_DIRTY_CLASS)`.
- [ ] Define `function clearValue()`: call `resetToInitial()`, set `wasChangedThisSession = false`,
  call `applyButton.classList.remove(APPLY_DIRTY_CLASS)`.
- [ ] Define `function markDirty()`: set `wasChangedThisSession = true`, call
  `applyButton.classList.add(APPLY_DIRTY_CLASS)`. Each section's user-interaction event listener
  calls this instead of manipulating `classList` directly.
- [ ] Return `{ getValue, setValue, clearValue, markDirty }`.

---

### Step 2 — Update `buildApplyAllSection` in `bulk-edit-row.sections.js`

- [ ] Extract the body of the Apply All click handler into a named async function
  `runApplyAll()`.
- [ ] Inside `runApplyAll()`: filter `applyRegistry` for dirty entries. If none, call
  `toastr.info('No changes to apply.')` and return `{ appliedSections: 0 }`. Otherwise run each
  dirty `runApply()` in sequence and return `{ appliedSections: dirty.length }`.
- [ ] Keep the existing `applyAll` click listener, calling `withApplyButtonLock(applyAll, () => runApplyAll())` internally (same visible behaviour, just delegating to the named function).
- [ ] Change the return from `return applyAllContainer` to
  `return { container: applyAllContainer, applyButton: applyAll, runApplyAll }`.

---

### Step 3 — Update `buildBulkNonNegativeIntegerSection` in `bulk-edit-row.sections.js`

This private helper is shared by Sticky, Cooldown, and Delay. Adding session tracking here
means the three wrappers get it automatically.

- [ ] Reorder the build sequence so `applyButton` exists before calling `makeSessionTrackedAPI`:
  create `persistedInput` first, then `applyButton` (via `createApplyButton`), then call
  `makeSessionTrackedAPI`. The `runApply` closure that `createApplyButton` needs can still
  reference `applyButton` via a forward-declared `let applyButton` pattern — see the existing
  code in this file for the same pattern.
- [ ] Call `makeSessionTrackedAPI` with:
  - `applyButton` — the button element created above.
  - `readValue`: returns `{ [entryField]: parseInt(persistedInput.value, 10) }` if
    `persistedInput.value` is non-empty, otherwise returns `null`. (The `getValue` wrapper in
    the helper already guards on `wasChangedThisSession`; `readValue` only needs to return the
    value or `null` based on input state.)
  - `applyValue(values)`: if `values[entryField] != null`, set
    `persistedInput.value = String(values[entryField])` and
    `localStorage.setItem(storageKey, String(values[entryField]))`.
  - `resetToInitial`: set `persistedInput.value = ''` and call
    `localStorage.removeItem(storageKey)`.
- [ ] Replace the existing `persistedInput.addEventListener('change', () => applyButton.classList.add(APPLY_DIRTY_CLASS))` with `persistedInput.addEventListener('change', markDirty)`.
- [ ] Change `return container` to `return { container, getValue, setValue, clearValue }`.

---

### Step 4 — Update `buildBulkStateSection` in `bulk-edit-row.sections.js`

- [ ] After calling `buildBulkActiveToggle()`, capture the initial toggle state:
  `const initialIsOn = activeToggle.classList.contains(TOGGLE_ON_CLASS)`.
- [ ] Call `makeSessionTrackedAPI` after creating `applyActiveState` with:
  - `readValue`: returns
    `{ state: activeToggle.classList.contains(TOGGLE_ON_CLASS) ? 'enabled' : 'disabled' }`.
  - `applyValue({ state })`: if `state` is `'enabled'` or `'disabled'`, set toggle classes
    directly — `activeToggle.classList.toggle(TOGGLE_ON_CLASS, state === 'enabled')` and
    `activeToggle.classList.toggle(TOGGLE_OFF_CLASS, state !== 'enabled')` — then
    `localStorage.setItem(BULK_ACTIVE_STORAGE_KEY, String(state === 'enabled'))`. Do **not**
    call `.click()`.
  - `resetToInitial`: restore toggle classes from `initialIsOn` (`TOGGLE_ON_CLASS` if `true`,
    `TOGGLE_OFF_CLASS` if `false`) and sync `localStorage`.
- [ ] Replace `activeToggle.addEventListener('click', () => applyActiveState.classList.add(APPLY_DIRTY_CLASS))` with `activeToggle.addEventListener('click', markDirty)`.
- [ ] Change `return activeStateContainer` to
  `return { container: activeStateContainer, getValue, setValue, clearValue }`.

---

### Step 5 — Update `buildBulkStrategySection` in `bulk-edit-row.sections.js`

- [ ] After creating `strategySelect` (including restoring from localStorage), capture its
  loaded value: `const initialStrategyValue = strategySelect.value`.
- [ ] Call `makeSessionTrackedAPI` after creating `applyStrategy` with:
  - `readValue`: returns `{ strategy: strategySelect.value }`.
  - `applyValue({ strategy })`: if `strategy` is a string and a matching `<option>` exists in
    `strategySelect`, set `strategySelect.value = strategy` and
    `localStorage.setItem(BULK_STRATEGY_STORAGE_KEY, strategy)`.
  - `resetToInitial`: set `strategySelect.value = initialStrategyValue` and
    `localStorage.setItem(BULK_STRATEGY_STORAGE_KEY, initialStrategyValue)`.
- [ ] Replace `strategySelect.addEventListener('change', () => applyStrategy.classList.add(APPLY_DIRTY_CLASS))` with `strategySelect.addEventListener('change', markDirty)`.
- [ ] Change `return strategyContainer` to
  `return { container: strategyContainer, getValue, setValue, clearValue }`.

---

### Step 6 — Update `buildBulkProbabilitySection` in `bulk-edit-row.sections.js`

- [ ] Call `makeSessionTrackedAPI` after creating `applyProbability` with:
  - `readValue`: if `probabilityInput.value` is non-empty, return
    `{ probability: parseInt(probabilityInput.value, 10) }`; otherwise return `null`.
  - `applyValue({ probability })`: if `probability` is a number between 0 and 100 (inclusive),
    set `probabilityInput.value = String(probability)` and
    `localStorage.setItem('stwid--bulk-probability-value', String(probability))`.
  - `resetToInitial`: set `probabilityInput.value = ''` and call
    `localStorage.removeItem('stwid--bulk-probability-value')`.
- [ ] Replace `probabilityInput.addEventListener('change', () => applyProbability.classList.add(APPLY_DIRTY_CLASS))` with `probabilityInput.addEventListener('change', markDirty)`.
- [ ] Change `return probabilityContainer` to
  `return { container: probabilityContainer, getValue, setValue, clearValue }`.

---

### Step 7 — Update Sticky, Cooldown, and Delay wrappers in `bulk-edit-row.sections.js`

After Step 3, `buildBulkNonNegativeIntegerSection` returns
`{ container, getValue, setValue, clearValue }`. Each wrapper currently does
`return buildBulkNonNegativeIntegerSection(...)`.

- [ ] Verify that `buildBulkStickySection`, `buildBulkCooldownSection`, and `buildBulkDelaySection`
  each directly return the result of `buildBulkNonNegativeIntegerSection(...)`. If so, no code
  change is required — the updated return shape passes through automatically. Add a brief inline
  comment to each wrapper confirming the pass-through is intentional.

---

### Step 8 — Update `buildBulkBudgetSection` in `bulk-edit-row.sections.js`

- [ ] Call `makeSessionTrackedAPI` after creating `applyBudget` with:
  - `readValue`: returns `{ ignoreBudget: budgetIgnoreCheckbox.checked }`.
  - `applyValue({ ignoreBudget })`: if `ignoreBudget` is a boolean, set
    `budgetIgnoreCheckbox.checked = ignoreBudget`.
  - `resetToInitial`: set `budgetIgnoreCheckbox.checked = false` (neutral unchecked state).
- [ ] Replace `budgetIgnoreCheckbox.addEventListener('change', () => applyBudget.classList.add(APPLY_DIRTY_CLASS))` with `budgetIgnoreCheckbox.addEventListener('change', markDirty)`.
- [ ] Change `return budgetContainer` to
  `return { container: budgetContainer, getValue, setValue, clearValue }`.

---

### Step 9 — Update `buildBulkRecursionSection` in `bulk-edit-row.sections.js`

- [ ] Call `makeSessionTrackedAPI` after creating `applyRecursion` with:
  - `readValue`: returns
    `{ recursion: Object.fromEntries([...recursionCheckboxes.entries()].map(([key, input]) => [key, input.checked])) }`.
    Always returns the full object (even if `{}`) when `wasChangedThisSession` is true — an
    empty object means "clear all recursion flags."
  - `applyValue(values)`: if `'recursion'` key is absent from `values`, no-op. If present:
    uncheck all checkboxes in `recursionCheckboxes`, then set only the preset's flags
    (`for (const [key, val] of Object.entries(values.recursion)) { const cb = recursionCheckboxes.get(key); if (cb) cb.checked = Boolean(val); }`).
  - `resetToInitial`: uncheck all checkboxes in `recursionCheckboxes`.
- [ ] Replace the existing loop that adds `APPLY_DIRTY_CLASS` on change with a loop that calls `markDirty`:
  `for (const input of recursionCheckboxes.values()) { input.addEventListener('change', markDirty); }`.
- [ ] Change `return recursionContainer` to
  `return { container: recursionContainer, getValue, setValue, clearValue }`.

---

### Step 10 — Update `buildBulkOrderSection` in `bulk-edit-row.order.js`

`buildBulkOrderSection` currently returns the `orderContainer` element directly.

- [ ] Add `let wasChangedThisSession = false` at the top of `buildBulkOrderSection`.
- [ ] After `buildOrderDirectionControls` runs and `dom.order.direction.up` / `dom.order.direction.down`
  are set, capture the initial direction: `const initialDirectionUp = dom.order.direction.up.checked`.
- [ ] Define `function markOrderDirty() { wasChangedThisSession = true; applyOrder.classList.add(APPLY_DIRTY_CLASS); }`.
  Since `applyOrder` is declared via `let` and assigned after `createRunApplyOrder`, `markOrderDirty`
  can reference it via closure (same pattern as `createRunApplyOrder` itself). Define `markOrderDirty`
  after `applyOrder` is assigned.
- [ ] `buildOrderStartSpacingControls` currently receives `applyOrder` and creates an internal
  `markApplyButtonDirty` closure. Update the call site in `buildBulkOrderSection` to pass
  `onDirty: markOrderDirty` — **but `markOrderDirty` is defined after `buildOrderStartSpacingControls`
  is called**. Resolve this by passing a wrapper: `onDirty: () => markOrderDirty()`, which is safe
  because the actual call happens on user interaction, after `markOrderDirty` is defined.
- [ ] `buildDirectionRadio` already adds `APPLY_DIRTY_CLASS` on change (via the `applyButton`
  parameter it receives). To also set `wasChangedThisSession = true`, add extra `'change'` listeners
  on each direction radio after they are registered in `dom`:
  `dom.order.direction.up.addEventListener('change', () => { wasChangedThisSession = true; });`
  `dom.order.direction.down.addEventListener('change', () => { wasChangedThisSession = true; });`
  Do **not** duplicate the `classList.add` call — `buildDirectionRadio` already handles it.
- [ ] Implement `function getValue()`:
  - If `!wasChangedThisSession` return `null`.
  - Build result: `const result = {}`.
  - `const start = parseInt(dom.order.start.value, 10); if (!isNaN(start)) result.orderStart = start;`
  - `const step = parseInt(dom.order.step.value, 10); if (!isNaN(step)) result.orderStep = step;`
  - `result.orderDirection = dom.order.direction.up.checked ? 'up' : 'down';`
  - Return `result`.
- [ ] Implement `function setValue(values)`:
  - If `values.orderStart != null`: set `dom.order.start.value = String(values.orderStart)` and
    `localStorage.setItem(ORDER_START_STORAGE_KEY, String(values.orderStart))`.
  - If `values.orderStep != null`: set `dom.order.step.value = String(values.orderStep)` and
    `localStorage.setItem(ORDER_STEP_STORAGE_KEY, String(values.orderStep))`.
  - If `values.orderDirection === 'up'` or `'down'`: set
    `dom.order.direction.up.checked = values.orderDirection === 'up'` and
    `dom.order.direction.down.checked = values.orderDirection === 'down'` and
    `localStorage.setItem(ORDER_DIRECTION_GROUP, values.orderDirection)`.
  - Call `markOrderDirty()`.
- [ ] Implement `function clearValue()`:
  - Set `dom.order.start.value = ''` and call `localStorage.removeItem(ORDER_START_STORAGE_KEY)`.
  - Set `dom.order.step.value = ''` and call `localStorage.removeItem(ORDER_STEP_STORAGE_KEY)`.
  - Restore direction radios: `dom.order.direction.up.checked = initialDirectionUp`;
    `dom.order.direction.down.checked = !initialDirectionUp`.
  - Set `wasChangedThisSession = false` and `applyOrder.classList.remove(APPLY_DIRTY_CLASS)`.
- [ ] Change `return orderContainer` to
  `return { container: orderContainer, getValue, setValue, clearValue }`.

---

### Step 11 — Update `buildBulkPositionSection` in `bulk-edit-row.position.js`

Position has three sub-controls (position select, depth input, outlet input) each with a
separate session flag.

#### 11a — Expose sub-inputs from internal helpers

- [ ] Update `buildBulkDepthControls` to include `depthInput` and `applyDepth` in its return:
  change `return { depthContainer }` to `return { depthContainer, depthInput, applyDepth }`.
- [ ] Update `buildBulkOutletControls` to include `outletInput` and `applyOutlet` in its return:
  change `return { outletContainer, cleanup }` to
  `return { outletContainer, outletInput, applyOutlet, cleanup }`.
- [ ] In `buildBulkPositionSection`, update the destructuring of both calls to capture the newly
  exposed values. Also destructure `applyPosition` from `buildBulkPositionControls`
  (already returned; just add it to the destructuring).

#### 11b — Session flags and event wiring

- [ ] Declare three session flags at the top of `buildBulkPositionSection` (after all three
  sub-builders have run):
  `let positionChangedThisSession = false;`
  `let depthChangedThisSession = false;`
  `let outletChangedThisSession = false;`
- [ ] Capture the initial position value: `const initialPositionValue = positionSelect.value`.
- [ ] Add a `'change'` listener on `positionSelect` to set `positionChangedThisSession = true`
  (the existing listener already adds `APPLY_DIRTY_CLASS`; this adds only the session flag).
- [ ] Add a `'change'` listener on `depthInput` to set `depthChangedThisSession = true`
  (existing listener adds `APPLY_DIRTY_CLASS`; this adds only the session flag).
- [ ] Add an `'input'` listener on `outletInput` to set `outletChangedThisSession = true`
  (existing listener adds `APPLY_DIRTY_CLASS`; this adds only the session flag).

#### 11c — Implement `getValue()`

- [ ] If none of the three session flags are `true`, return `null`.
- [ ] Build result object:
  - If `positionChangedThisSession`: `result.position = positionSelect.value`.
  - If `depthChangedThisSession`: `result.depth = depthInput.value === '' ? null : parseInt(depthInput.value, 10)`.
    `depth: null` is a valid explicit-clear marker.
  - If `outletChangedThisSession`: `result.outlet = outletInput.value`.
- [ ] Return the result object.

#### 11d — Implement `setValue(values)`

- [ ] If `'position' in values` and `values.position` is a non-empty string matching an existing
  option in `positionSelect`: set `positionSelect.value = values.position`,
  `localStorage.setItem(STORAGE_KEY_BULK_POSITION, values.position)`, then dispatch a `'change'`
  event on `positionSelect` (e.g. `positionSelect.dispatchEvent(new Event('change'))`) so the
  existing depth/outlet enabled-state sync listeners run. Mark `positionChangedThisSession = true`.
  Mark `applyPosition.classList.add(APPLY_DIRTY_CLASS)`.
- [ ] After the position change event fires and the depth/outlet enabled states are updated:
  - If `'depth' in values` AND `!depthInput.disabled`: set
    `depthInput.value = values.depth != null ? String(values.depth) : ''`,
    `localStorage.setItem(STORAGE_KEY_BULK_DEPTH, depthInput.value)`,
    set `depthChangedThisSession = true`, add `APPLY_DIRTY_CLASS` to `applyDepth`.
  - If `'outlet' in values` AND `!outletInput.disabled`: set `outletInput.value = String(values.outlet)`,
    `localStorage.setItem(STORAGE_KEY_BULK_OUTLET, outletInput.value)`,
    set `outletChangedThisSession = true`, add `APPLY_DIRTY_CLASS` to `applyOutlet`.

#### 11e — Implement `clearValue()`

- [ ] Set `positionSelect.value = initialPositionValue`,
  `localStorage.setItem(STORAGE_KEY_BULK_POSITION, initialPositionValue)`.
  Dispatch `'change'` on `positionSelect` to re-run depth/outlet enabled-state sync.
- [ ] Set `depthInput.value = ''`, call `localStorage.removeItem(STORAGE_KEY_BULK_DEPTH)`.
- [ ] Set `outletInput.value = ''`, call `localStorage.removeItem(STORAGE_KEY_BULK_OUTLET)`.
- [ ] Set all three session flags to `false`.
- [ ] Remove `APPLY_DIRTY_CLASS` from `applyPosition`, `applyDepth`, and `applyOutlet`.

#### 11f — Update return

- [ ] Change the return of `buildBulkPositionSection` from
  `return { positionContainer, depthContainer, outletContainer, cleanup }` to
  `return { positionContainer, depthContainer, outletContainer, cleanup, getValue, setValue, clearValue }`.

---

### Step 12 — Update `bulk-edit-row.js`

#### 12a — Update `appendBulkSection` helper

- [ ] Change the helper to destructure the new return shape from each section builder:
  `const { container, getValue, setValue, clearValue } = buildSection({ dom, cache, ..., ...extraArgs });`
- [ ] Append `container` to the row (not the whole object).
- [ ] Return `{ getValue, setValue, clearValue }` from the helper.

#### 12b — Update `appendBulkEditSections`

- [ ] Declare `const sectionApis = []` at the top of the function body.
- [ ] For each `appendBulkSection` call, capture the return and push it:
  `sectionApis.push(appendBulkSection(buildBulkStateSection));` etc.
- [ ] For the position section (handled separately via `buildBulkPositionSection`): destructure
  `{ positionContainer, depthContainer, outletContainer, cleanup, getValue: posGetValue, setValue: posSetValue, clearValue: posClearValue }`.
  Append the three containers as before. Push `{ getValue: posGetValue, setValue: posSetValue, clearValue: posClearValue }` into `sectionApis`.
- [ ] Change `return cleanup` to `return { cleanup, sectionApis }`.

#### 12c — Update `buildApplyAllSection` call site in `finalizeBulkEditRow`

- [ ] `finalizeBulkEditRow` currently calls `row.append(buildApplyAllSection(applyRegistry))`.
  Change this to destructure:
  `const { container: applyAllContainer, applyButton, runApplyAll } = buildApplyAllSection(applyRegistry);`
  Then `row.append(applyAllContainer)`.
- [ ] Update `finalizeBulkEditRow`'s parameters and return to accept and pass through
  `valueRegistry`, `getSelectedEntryCount`, and `runApplyAll`:
  - Signature: `function finalizeBulkEditRow(row, applyRegistry, refreshSelectionCount, cleanup, valueRegistry, getSelectedEntryCount)`
  - Return: `{ element: row, refreshSelectionCount, cleanup, valueRegistry, getSelectedEntryCount, runApplyAll }`

#### 12d — Assemble `valueRegistry` and `getSelectedEntryCount` in `buildBulkEditRow`

- [ ] Update the call to `appendBulkEditSections` to destructure both values:
  `const { cleanup, sectionApis } = appendBulkEditSections(row, { ... });`
- [ ] Define `getSelectedEntryCount()`:
  ```js
  function getSelectedEntryCount() {
      if (!dom.order.tbody) return 0;
      const rows = [...dom.order.tbody.children];
      return rows.filter(tr =>
          !tr.classList.contains('stwid--state-filtered') &&
          isEntryManagerRowSelected(tr)
      ).length;
  }
  ```
- [ ] Name the registry: `const valueRegistry = sectionApis;`
- [ ] Update the `finalizeBulkEditRow` call to pass the new values:
  `return finalizeBulkEditRow(row, applyRegistry, refreshSelectionCount, cleanup, valueRegistry, getSelectedEntryCount);`
