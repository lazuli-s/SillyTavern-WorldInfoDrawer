# NEW FEATURE: Bulk Editor Presets Column
*Created: March 5, 2026*

**Type:** New Feature
**Status:** DOCUMENTED

---

## Summary

Adds a new "Presets" column to the right side of the bulk-editor row. Users can save the current bulk-edit container values as a named preset, load a preset from a dropdown, apply favourite presets in one click from visible chips, and manage all presets (rename, star, delete, add) through a popup panel. Presets are persisted in `extension_settings.worldInfoDrawer` so they survive refreshes and are included in ST settings backups.

---

## Current Behavior

The bulk-editor row has many containers (State, Strategy, Position, Depth, Outlet, Order, Recursion, Budget, Probability, Sticky, Cooldown, Delay, Apply All). Each container is filled manually by the user every time they open the Entry Manager. There is no way to save or recall a set of bulk-edit values for reuse.

---

## Expected Behavior

After this change, the bulk-editor row has a new "Presets" column on the right. The column contains:

1. **Header**: "Presets"
2. **Dropdown**: A `<select>` listing all saved presets by name. Selecting an entry **loads** its values into the matching containers (fills in the UI, does not apply to entries yet).
3. **Save button**: Snapshots the current values of every bulk-edit container that has a meaningful value set and saves them into the currently selected preset.
4. **Manage button**: Opens a full-screen-overlay popup for managing presets.
5. **Favourite chips**: Up to 5 starred presets are shown as chips (similar to the existing visibility chips). Clicking a chip **loads + immediately applies** that preset to the selected entries (equivalent to load then Apply All Changes).

Inside the **Manage popup**:
- Lists all presets, one row per preset.
- Each row shows: editable name field, a star/unstar button, and a delete button.
- An "Add new" button at the bottom creates a blank preset and prompts the user for a name.
- Closing the popup refreshes the dropdown and favourite chips.

---

## Agreed Design Details

| Question | Decision |
|---|---|
| Which containers does a preset capture? | Only containers with a meaningful value set (non-empty inputs, active buttons, checked checkboxes) |
| Favourite chip click behaviour | Fill values **and** immediately apply (like clicking Apply All Changes) |
| Dropdown select behaviour | Fill values only — no immediate apply |
| Storage location | `extension_settings.worldInfoDrawer.bulkEditorPresets` (array) |
| Max favourite chips shown | 5 |
| "Add new" in popup | Creates blank preset; user types a name |
| Save workflow | "Save" button in the column → writes current container values to the selected preset |

---

## Preset Data Shape

```js
// extension_settings.worldInfoDrawer.bulkEditorPresets = [...]
{
  id: string,        // unique ID (crypto.randomUUID())
  name: string,      // user-visible label
  favorite: boolean, // whether it appears as a chip
  values: {
    // Only fields that had a meaningful value at save time are present:
    state?: string,           // 'enabled' | 'disabled' | 'constant' | 'vectorized'
    strategy?: string,        // strategy enum value
    position?: string,        // position enum value
    depth?: number,
    outlet?: string,
    orderStart?: number,
    orderStep?: number,
    orderDirection?: string,  // 'up' | 'down'
    recursion?: Record<string, boolean>,  // only present if at least one flag is checked
    budget?: number,
    probability?: number,
    sticky?: number,
    cooldown?: number,
    delay?: number,
  }
}
```

---

## Agreed Scope

| File | Change |
|---|---|
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.presets.js` | **New file** — owns all preset logic and the Presets column DOM |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js` | Extend section builders to return `getValue()` / `setValue()` |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js` | Same — extend `buildBulkPositionSection` |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js` | Same — extend `buildBulkOrderSection` |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.js` | Assemble `valueRegistry`; import and wire `buildBulkPresetsSection` |
| `src/shared/settings.js` | Add `bulkEditorPresets` field |
| `style.css` | Add styles for preset chips and popup if needed |
| `ARCHITECTURE.md` | Add `bulk-edit-row.presets.js` to module map |
| `FEATURE_MAP.md` | Add preset feature entries |

---

## Out of Scope

- Per-entry-manager-scope preset filtering (presets apply to any scope).
- Import/export of presets as files.
- Undo/redo of preset application.

---

## Implementation Plan

### Step 1 — Extend `Settings` to persist presets

File: `src/shared/settings.js`

- [ ] Add `'bulkEditorPresets'` to `KNOWN_SETTINGS_KEYS`.
- [ ] Add `bulkEditorPresets = []` as a class field on `Settings`.
- [ ] Add `bulkEditorPresets` to `toJSON()` return object.
- [ ] After loading from `saved`, validate: if `this.bulkEditorPresets` is not an array, reset it to `[]`.
- [ ] Validate each preset item: must have `id` (string), `name` (string), `favorite` (boolean), `values` (object). Filter out any malformed items.

---

### Step 2 — Create `bulk-edit-row.presets.js` (data helpers only, no DOM yet)

File: `src/entry-manager/bulk-editor-tab/bulk-edit-row.presets.js` *(new file)*

- [ ] Import `Settings` from `../../shared/settings.js`.
- [ ] Implement `generatePresetId()`: returns `crypto.randomUUID()`.
- [ ] Implement `readPresets()`: returns `Settings.instance.bulkEditorPresets` (a shallow copy).
- [ ] Implement `savePresets(presets)`: assigns the array to `Settings.instance.bulkEditorPresets` then calls `Settings.instance.save()`.
- [ ] Implement `addPreset(name)`: creates `{ id: generatePresetId(), name, favorite: false, values: {} }`, appends it, saves, returns the new preset.
- [ ] Implement `deletePreset(id)`: removes the preset with matching id and saves.
- [ ] Implement `updatePreset(id, changes)`: merges `changes` into the matching preset (using `Object.assign`) and saves.
- [ ] Implement `updatePresetValues(id, capturedValues)`: replaces `preset.values` with `capturedValues` and saves.
- [ ] Implement `getFavoritePresets()`: returns presets where `favorite === true`, limited to first 5.

---

### Step 3 — Add `getValue()` / `setValue()` to section builders

**Contract:**
- `getValue()` returns a plain object with only the fields this section owns (e.g. `{ state: 'enabled' }`), or `null` if the control has no meaningful value set (empty input, no active toggle, etc.).
- `setValue(values)` receives the full preset `values` object and applies only the field(s) this section owns (a no-op if the relevant key is absent).
- Both functions are returned alongside the existing container element from each builder.

Files: `bulk-edit-row.sections.js`, `bulk-edit-row.position.js`, `bulk-edit-row.order.js`

- [ ] `buildBulkStateSection`: track the currently active state button. Return `getValue()` → `{ state: activeValue } | null` and `setValue({ state })` → programmatically click/activate the matching button.
- [ ] `buildBulkStrategySection`: track the strategy `<select>`. Return `getValue()` → `{ strategy: selectEl.value } | null` (null if no option selected / placeholder) and `setValue({ strategy })`.
- [ ] `buildBulkProbabilitySection`: track the number `<input>`. Return `getValue()` → `{ probability: parsedInt } | null` (null if empty) and `setValue({ probability })`.
- [ ] `buildBulkStickySection`: same pattern → key `sticky`.
- [ ] `buildBulkCooldownSection`: same pattern → key `cooldown`.
- [ ] `buildBulkDelaySection`: same pattern → key `delay`.
- [ ] `buildBulkBudgetSection`: same pattern → key `budget`.
- [ ] `buildBulkRecursionSection`: track the recursion checkboxes map. Return `getValue()` → `{ recursion: { [flagKey]: bool, ... } } | null` (null if no checkbox is checked) and `setValue({ recursion })` → sets each checkbox state.
- [ ] `buildBulkPositionSection`: return `getValue()` → object with present keys among `{ position, depth, outlet }` (each key only if its control has a value) or `null` if none. `setValue(values)` applies each present key.
- [ ] `buildBulkOrderSection`: return `getValue()` → `{ orderStart, orderStep, orderDirection }` (omit number keys if input empty) or `null` if nothing set. `setValue(values)` sets each present key.

---

### Step 4 — Assemble `valueRegistry` in `buildBulkEditRow`

File: `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`

- [ ] Update all `buildBulk*` calls to destructure `{ container (or existing name), getValue, setValue }` from their return values (the existing positional return shapes need to stay compatible — use named returns or rename destructuring locally).
- [ ] After all sections are built, assemble:
  ```js
  const valueRegistry = [
    { getValue: stateGetValue, setValue: stateSetValue },
    { getValue: strategyGetValue, setValue: strategySetValue },
    // ... one entry per section that exposes getValue/setValue
  ];
  ```
- [ ] Import `buildBulkPresetsSection` from `./bulk-edit-row.presets.js`.
- [ ] Call `buildBulkPresetsSection({ valueRegistry, applyRegistry })` and `row.append()` the returned element (append after the existing `buildApplyAllSection` result).
- [ ] Include `cleanup` returned by `buildBulkPresetsSection` in the combined `cleanup` function returned by `buildBulkEditRow` (if any cleanup is needed).

---

### Step 5 — Build the Presets column DOM (main column, no popup yet)

File: `src/entry-manager/bulk-editor-tab/bulk-edit-row.presets.js`

Implement `buildBulkPresetsSection({ valueRegistry, applyRegistry })`:

- [ ] Create the container using `createLabeledBulkContainer('presets', 'Presets', 'Save and recall bulk-edit value sets.')` (import `createLabeledBulkContainer` from `./bulk-edit-row.helpers.js`).
- [ ] Create a `<select>` dropdown. Populate it by calling `renderDropdownOptions()` (internal helper that clears and repopulates from `readPresets()`).
- [ ] Add a tooltip to the dropdown: `'Select a preset to load its values into the bulk-edit containers.'`
- [ ] Wire `change` event on the dropdown: call `loadPreset(selectedId, valueRegistry)` (internal helper defined in Step 6).
- [ ] Create a "Save" button (`menu_button interactable`, icon `fa-floppy-disk`) with tooltip `'Save current bulk-edit values into the selected preset'`. On click: call `captureCurrentValues(valueRegistry)`, then `updatePresetValues(selectedId, captured)`. Show a `toastr.success('Preset saved.')`.
- [ ] Create a "Manage" button (`menu_button interactable`, icon `fa-sliders`) with tooltip `'Open preset manager'`. On click: call `openPresetsPopup(...)` (Step 7) — stub it as a no-op for now.
- [ ] Append dropdown, Save button, Manage button to the container.
- [ ] Below the controls, create a `<div class="stwid--presetChips">` chips row; call `renderFavoriteChips(chipsRow, valueRegistry, applyRegistry)` (defined in Step 6) to populate it.
- [ ] Return `{ element: container }`.

---

### Step 6 — Implement preset value capture, load, and favourite chip helpers

File: `src/entry-manager/bulk-editor-tab/bulk-edit-row.presets.js`

- [ ] Implement `captureCurrentValues(valueRegistry)`:
  - Calls `entry.getValue()` for each entry in `valueRegistry`.
  - Merges all non-null results into one flat object.
  - Returns the merged object (may be empty `{}` if nothing is set).

- [ ] Implement `loadPreset(id, valueRegistry)`:
  - Reads preset by id from `readPresets()`.
  - Calls each `entry.setValue(preset.values)` in `valueRegistry`.

- [ ] Implement `renderFavoriteChips(chipsRow, valueRegistry, applyRegistry)`:
  - Clears `chipsRow.innerHTML`.
  - Calls `getFavoritePresets()`.
  - For each favourite preset, creates a `<span>` chip (reuse `stwid--visibilityChip` CSS class already used by existing chips, plus a `fa-star` icon).
  - On click: calls `loadPreset(id, valueRegistry)`, then triggers all dirty `applyRegistry` entries by calling `runApply()` on each — effectively replicating the "Apply All Changes" behaviour.

- [ ] Implement `renderDropdownOptions(selectEl)` helper:
  - Clears all options.
  - Adds a disabled placeholder option `'— select preset —'`.
  - Appends one `<option value="{id}">{name}</option>` per preset from `readPresets()`.

---

### Step 7 — Implement the Manage Presets popup

File: `src/entry-manager/bulk-editor-tab/bulk-edit-row.presets.js`

Implement `openPresetsPopup({ chipsRow, selectEl, valueRegistry, applyRegistry })`:

- [ ] Create a full-screen overlay `<div class="stwid--presetsOverlay">` and attach it to `document.body`.
- [ ] Inside it, create a modal panel `<div class="stwid--presetsModal">` with:
  - A close button (`fa-xmark`) in the top-right corner.
  - A title `<h3>Manage Presets</h3>`.
  - A preset list container `<div class="stwid--presetsList">`.
  - An "Add new preset" button at the bottom.
- [ ] Implement `renderPresetList(listEl)`:
  - Clears `listEl`.
  - For each preset from `readPresets()`:
    - Creates a row `<div class="stwid--presetsRow">`.
    - An `<input type="text">` showing the preset name. On `change`/`blur`: calls `updatePreset(id, { name: input.value.trim() })` (ignores blank names — restore previous on blur if blank).
    - A star button (`fa-star` solid if `favorite`, regular if not). On click: toggles `favorite`, calls `updatePreset(id, { favorite: !current })`, re-renders chips and dropdown.
    - A delete button (`fa-trash`). On click: calls `deletePreset(id)`, re-renders the list, updates chips and dropdown.
  - Appends all rows to `listEl`.
- [ ] Wire "Add new preset" button: prompts the user for a name via `window.prompt('Preset name:')` (or an inline text input if prompt is blocked), calls `addPreset(name)`, re-renders the list, updates dropdown.
- [ ] Closing the popup (close button or overlay click): removes the overlay from the DOM, calls `renderDropdownOptions(selectEl)`, calls `renderFavoriteChips(chipsRow, valueRegistry, applyRegistry)`.

---

### Step 8 — Add CSS for preset chips and popup

File: `style.css`

> Run the `css-ST` and `css-responsive` skills before writing any new CSS rules. Reuse existing SillyTavern classes wherever possible. Only add new rules for things that cannot be expressed with existing classes.

- [ ] Check whether `.stwid--visibilityChip` already exists and can be reused for preset chips. If so, no new chip styles are needed.
- [ ] Add `.stwid--presetChips` if a distinct flex-wrap row for chips is needed.
- [ ] Add `.stwid--presetsOverlay` (full-screen fixed backdrop, `z-index` above drawer).
- [ ] Add `.stwid--presetsModal` (centered card, overflow-y scroll, max-height).
- [ ] Add `.stwid--presetsRow` (flex row, `align-items: center`, gap).
- [ ] Ensure all new rules follow the existing naming convention (`stwid--` prefix, kebab-case).

---

### Step 9 — Update architecture docs

Files: `ARCHITECTURE.md`, `FEATURE_MAP.md`

- [ ] In `ARCHITECTURE.md`, add `bulk-edit-row.presets.js` to the project structure tree under `bulk-editor-tab/` and add a row to the Module Responsibilities table: *"Bulk-editor preset CRUD, value capture/restore, Presets column DOM, and manage-presets popup"*.
- [ ] In `FEATURE_MAP.md`, add under the **Entry Manager** section:
  - `Bulk editor preset storage and CRUD → src/entry-manager/bulk-editor-tab/bulk-edit-row.presets.js, src/shared/settings.js`
  - `Bulk editor preset column DOM (dropdown, save, manage button, chips) → src/entry-manager/bulk-editor-tab/bulk-edit-row.presets.js`
  - `Bulk editor preset value capture and restore → src/entry-manager/bulk-editor-tab/bulk-edit-row.presets.js`
  - `Bulk editor favourite preset chips → src/entry-manager/bulk-editor-tab/bulk-edit-row.presets.js`
  - `Bulk editor manage-presets popup → src/entry-manager/bulk-editor-tab/bulk-edit-row.presets.js`
