# NEW FEATURE: Bulk Editor Presets Column

*Created: March 5, 2026*
*Updated: March 12, 2026*

**Type:** New Feature
**Status:** DOCUMENTED

---

## Summary

Adds a new "Presets" column to the right side of the bulk-editor row. Users can save the current bulk-edit container values as a named preset (with an optional description note), load a preset from a dropdown, apply favourite presets in one click from visible chips, and manage all presets (rename, describe, star, duplicate, delete, reorder) through a popup panel. Presets are persisted in `extension_settings.worldInfoDrawer` so they survive refreshes and are included in ST settings backups.

> **Intentional JS best-practices exception:** This feature keeps presets in `extension_settings.worldInfoDrawer` instead of moving them to `localforage`. This is a deliberate exception to the usual large-data storage rule because keeping presets inside SillyTavern settings backups is more important for this feature than strict storage-rule compliance. To reduce growth risk while keeping backup support, preset count remains unlimited, but preset text length is capped and validated.

All preset code lives in its own dedicated folder: `src/entry-manager/edit-presets/`, split by responsibility into small modules so no single file has to own storage, value mapping, the main Presets column, and the popup UI at the same time.

---

## Current Behavior

The bulk-editor row has many containers (State, Strategy, Position, Depth, Outlet, Order, Recursion, Budget, Probability, Sticky, Cooldown, Delay, Apply All). Each container is filled manually by the user every time they open the Entry Manager. There is no way to save or recall a set of bulk-edit values for reuse.

---

## Expected Behavior

After this change, the bulk-editor row has a new "Presets" column on the right. The column contains:

1. **Header**: "Presets"
2. **Dropdown**: A `<select>` listing all saved presets by name. Selecting an entry **resets all bulk-edit containers to their neutral clean state** (blank where possible; otherwise the control's initial default selection/value for this Entry Manager session), then loads the preset's values into the matching containers (fills in the UI, does not apply to entries yet).
3. **Save button**: Snapshots the current values of every bulk-edit container the user changed in this Entry Manager session and saves them into the currently selected preset.
4. **Manage button**: Opens a SillyTavern popup for managing presets.
5. **Favourite chips**: Up to 5 starred presets are shown as chips (similar to the existing visibility chips). Hovering a chip shows the preset's description as a tooltip. Clicking a chip **resets all bulk-edit containers to their neutral clean state**, loads the preset's values, then immediately applies them to the selected entries (equivalent to reset → load → Apply All Changes). If no entries are selected, the chip shows an info message and does nothing. After applying, the chip briefly shows how many entries were updated (e.g. `"5 updated"`), then reverts to the preset name after ~2 seconds.

Inside the **Manage popup**:

- Lists all presets, one row per preset.
- Each row shows: editable name field, an editable description/note field, move up / move down buttons for reordering, a star/unstar button, a duplicate button, and a delete button.
- Deleting a preset requires an **inline confirmation** before it is removed.
- Duplicating a preset creates a new preset with a generated unique copy name (starting with `"Copy of [name]"`) with the same values and description, auto-selected in the dropdown.
- An "Add new" button at the bottom creates a blank preset and prompts the user for a name.
- Closing the popup refreshes the dropdown and favourite chips.

---

## Agreed Design Details

| Question | Decision |
| --- | --- |
| Which containers does a preset capture? | Only containers the user changed in the current Entry Manager session. Values that merely appeared from existing defaults or `localStorage` do **not** count until the user changes that control in this session. |
| State toggle capture | **Session-change only** — only saved if the user explicitly clicked the toggle in the current session (or a preset load changed it in this session). If never touched, state is excluded from the preset. |
| Budget checkbox capture | Same as State — **session-change only**. Only saved if the user explicitly clicked the checkbox (or a preset load changed it in this session). Both `true` and `false` values are meaningful and saved when changed this session. |
| Runtime state model | Each section keeps **two runtime-only states**: `wasChangedThisSession` (used for saving presets) and the existing Apply-All dirty marker (`APPLY_DIRTY_CLASS` on that section's apply button). These are related but not the same thing. |
| Dirty flags on load | **Set both runtime states** — `setValue()` marks `wasChangedThisSession = true` and also marks that section's existing apply button dirty, so the current Apply All flow picks it up immediately. |
| Load behaviour | **Reset all, then apply** — `loadPreset()` first calls `clearValue()` on every section (resetting controls to a neutral clean state, clearing `wasChangedThisSession`, and clearing the section apply button dirty marker), then calls `setValue(preset.values)` on every section. Result: only the preset's fields become active/dirty after load; stale manual values do not remain active. |
| Favourite chip click behaviour | Reads the selected-entry count first. If none are selected, shows an info toast and stops. Otherwise it calls `loadPreset()` (reset-all-then-apply), then calls an **awaitable Apply All helper** owned by the bulk-edit row instead of simulating a DOM click. Only after that helper reports a successful apply does the chip briefly show the count of entries updated (e.g. `"5 updated"`). |
| Dropdown select behaviour | Reset all fields to a neutral clean state, then fill preset values — no immediate apply |
| Preset description/note | Each preset has an optional `description` string. Edited in the Manage popup (a second text input on each preset row). Shown as a native browser tooltip (`title` attribute) on the favourite chip. Empty string is valid (no tooltip shown). |
| User text rendering safety | Preset `name` and `description` are **plain text only**. Before using them in the UI, first validate that each value is a string, then sanitize it with `DOMPurify.sanitize()`, then render it with `input.value`, `option.textContent`, `element.textContent`, and `title`. Do **not** inject them with `innerHTML`. |
| Storage location | `extension_settings.worldInfoDrawer.bulkEditorPresets` (array) |
| Max total presets | **No limit** |
| Max favourite chips shown | 5 |
| Favourite chip order | Same order as the preset list in Manage popup (top to bottom) |
| Long chip names | Truncated with ellipsis; full name shown in a tooltip on hover |
| Save button guard | **Disabled** (greyed out) when no preset is selected in the dropdown; enabled once a preset is chosen |
| Save with nothing set | **Blocked** — if `captureCurrentValues()` returns an empty `{}` (no values were changed in this Entry Manager session), show `toastr.warning('Nothing to save — set at least one value first.')` and do not overwrite the preset |
| Duplicate preset names | **Blocked** — show `toastr.error('A preset with that name already exists.')` on both Add and Rename |
| Rename to duplicate | Show error + restore old name in the input |
| "Add new" in popup | Inline input — a text field + confirm button appears inside the Manage popup panel |
| Empty favourite chips row | Shows a placeholder: *"Star a preset to pin it here."* |
| Save workflow | Main-column "Save" button saves preset values immediately. Inside the Manage popup, add/rename/description/star/duplicate/delete/reorder update the popup UI immediately but persist **once when the popup closes**. |
| Delete confirmation | **Inline confirm before deleting** — clicking the delete button replaces the row action area with a prompt: `"Delete '[name]'? This cannot be undone."` with Confirm and Cancel buttons. On Confirm: the preset is removed. On Cancel: the row is restored to normal. |
| Delete currently-selected preset | Dropdown resets to placeholder; Save button becomes disabled |
| Dropdown after closing Manage popup | Closing the popup commits all popup edits, then refreshes the dropdown. The selected preset is preserved if it still exists; resets to placeholder if it was deleted |
| Duplicate preset button | Each row in the Manage popup has a **duplicate button** (`fa-copy`). Clicking it creates a uniquely named copy (starting with `'Copy of [name]'`) with the same `values` and `description`, `favorite: false`. Appended at the end of the list and auto-selected in the dropdown. |
| Popup close behavior | Only clicking **outside** the popup panel closes it; clicks inside the panel do not close it |
| Recursion on load (full replace) | `clearValue()` on the Recursion section unchecks all flags; then `setValue()` applies only the preset's flags. **If the preset contains `recursion: {}` that means "explicitly clear all recursion flags" and must still mark the section dirty so Apply All writes the cleared state back to WI.** No recursion key in preset → `setValue()` is a no-op (flags stay cleared in the UI but the section is not marked for apply). |
| Position/Depth/Outlet coupling | `setValue()` sets `position` first, runs the existing depth/outlet enabled-state sync, then applies `depth` / `outlet` only if those controls are enabled after the position change. `clearValue()` restores the section to a neutral clean state. |
| Preset reordering | Presets are reordered with explicit **Move Up / Move Down** buttons in the Manage popup so reordering works on desktop and phone/touch devices. The popup order updates immediately; persistence happens when the popup closes. |
| Dropdown selection memory | The dropdown remembers the last selected preset **in memory only** — not persisted across page refresh. On reload, it resets to the placeholder. |
| Auto-select after Add new | After confirming a new preset name in the Manage popup, the new preset is **automatically selected** in the dropdown (Save button becomes enabled). |
| Save button disabled tooltip | The disabled Save button shows a tooltip: `'Select a preset from the dropdown first'`. |
| Preset name length | Maximum **100 characters**. Longer input is blocked with an error message. Long valid names are still truncated visually with ellipsis in chips and the dropdown. |
| Preset description length | Maximum **300 characters**. Longer input is blocked with an error message. |
| `applyRegistry` | **Kept** — the preset feature reuses the existing section apply buttons and `applyRegistry`. `setValue()` must dirty the same apply buttons Apply All already reads today. |
| Chip apply feedback | Before calling the shared awaitable Apply All helper, read the count of currently selected entries from state/DOM. If the count is `0`, show an info toast and do not load/apply. Otherwise, only after the helper reports that one or more dirty sections were actually applied should the chip briefly show `'N updated'` for ~2 seconds, then revert to the preset name. If no reliable count is available but an apply still occurs, fall back to a generic `'Applied!'` flash. |
| Export/import | **Out of scope now** — noted as a future extension point. The data shape and storage key must not block adding it later. |
| Popup persistence model | The Manage popup edits a **deep-cloned** temporary in-memory draft copy of the preset list. Closing the popup writes the whole updated list once to settings. |

---

## Preset Data Shape

> **Runtime-only state contract:** Each section keeps `wasChangedThisSession` for preset capture and also uses its existing apply button dirty class (`APPLY_DIRTY_CLASS`) for Apply All. `setValue()` sets both. `clearValue()` clears both. A successful Apply All clears only the apply-button dirty class; it does **not** erase `wasChangedThisSession`, so the current session can still be saved as a preset.

```js
// extension_settings.worldInfoDrawer.bulkEditorPresets = [...]
{
  id: string,          // unique ID (crypto.randomUUID())
  name: string,        // user-visible label
  description: string, // optional note (empty string if none)
  favorite: boolean,   // whether it appears as a chip
  values: {
    // Only fields captured at save time are present.
    // Binary controls (state, ignoreBudget) use session-change capture:
    // they are only included if the user explicitly interacted with them this session.
    state?: string,           // 'enabled' | 'disabled' — only present if changed this session. constant/vectorized belong to strategy.
    strategy?: string,        // strategy enum value (includes 'constant', 'vectorized', etc.)
    position?: string,        // position enum value
    depth?: number | null,    // null means "explicitly clear Depth" and must still dirty/apply the section
    outlet?: string,
    orderStart?: number,
    orderStep?: number,
    orderDirection?: string,  // 'up' | 'down'
    recursion?: Record<string, boolean>,  // {} means "explicitly clear all recursion flags"
    ignoreBudget?: boolean,               // true OR false — only present if changed this session (checkbox was explicitly clicked)
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
| --- | --- |
| `src/entry-manager/edit-presets/presets-store.js` | **New file** — owns preset validation, read/write helpers, CRUD helpers, duplicate, and reorder |
| `src/entry-manager/edit-presets/preset-values.js` | **New file** — owns bulk-editor value capture and preset load helpers |
| `src/entry-manager/edit-presets/presets-column.js` | **New file** — owns the main Presets column DOM, dropdown, Save button, Manage button, and favourite chips |
| `src/entry-manager/edit-presets/presets-popup.js` | **New file** — owns the Manage Presets popup DOM, draft editing flow, delete confirmation UI, and move-up/move-down reorder controls |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js` | Extend section builders to return `getValue()` / `setValue()` / `clearValue()` |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js` | Same — extend `buildBulkPositionSection` |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js` | Same — extend `buildBulkOrderSection` |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.js` | Assemble `valueRegistry`; import and wire `buildPresetsColumn` |
| `src/shared/settings.js` | Add `bulkEditorPresets` field |
| `style.css` | Add styles for preset chips and popup if needed |
| `ARCHITECTURE.md` | Add `edit-presets/` folder and new preset modules to module map |
| `FEATURE_MAP.md` | Add preset feature entries |

---

## Out of Scope

- Per-entry-manager-scope preset filtering (presets apply to any scope).
- Import/export of presets as files *(noted as future extension point — code must not block this)*.
- Undo/redo of preset application.

---

## Implementation Plan

### Step 1 — Extend `Settings` to persist presets

File: `src/shared/settings.js`

> **Storage exception note:** Keep presets in `extension_settings.worldInfoDrawer` on purpose so they stay inside normal ST settings backups. This is an approved exception to `PERF-01` for this feature and must stay documented in the task file.

- [ ] Add `'bulkEditorPresets'` to `KNOWN_SETTINGS_KEYS`.
- [ ] Add `bulkEditorPresets = []` as a class field on `Settings`.
- [ ] Add `bulkEditorPresets` to `toJSON()` return object.
- [ ] After loading from `saved`, validate: if `this.bulkEditorPresets` is not an array, reset it to `[]`.
- [ ] Add module-level constants for text limits: `MAX_PRESET_NAME_LENGTH = 100` and `MAX_PRESET_DESCRIPTION_LENGTH = 300`.
- [ ] Validate each preset item: must have `id` (string), `name` (string), `favorite` (boolean), `values` (object). Filter out any malformed items. If a valid item is missing `description`, default it to `''` (backwards compatibility for any presets saved before this field was added).
- [ ] Validate each preset's `values` payload against the bulk-editor/WI field contract before keeping it: strip unknown keys, require the expected types, clamp numeric ranges, and reject invalid enum values so bad settings data cannot later be written into ST-owned World Info entries through the normal `saveWorldInfo()` flow.
- [ ] Preserve explicit clear intents during validation: `depth: null` stays valid and means "clear depth", and `recursion: {}` stays valid and means "clear all recursion flags".
- [ ] Clamp loaded `name` and `description` strings to the max lengths above so oversized legacy data cannot keep growing in settings forever.

---

### Step 2 — Create `presets-store.js` (storage and CRUD only)

File: `src/entry-manager/edit-presets/presets-store.js` *(new file)*

> **Refactoring note:** Promote repeated named concepts in this file to module-level constants instead of repeating raw literals. Expected examples include duplicate-name prefix, max favourite chip count, and any repeated user-facing strings that are reused by multiple helpers.

- [ ] Import `Settings` from `../../shared/settings.js`.
- [ ] Export and reuse shared constants for duplicate-name prefix and text-length limits instead of repeating raw numbers or strings in popup/column helpers.
- [ ] Implement `generatePresetId()`: returns `crypto.randomUUID()`.
- [ ] Implement `readPresets()`: returns a deep-cloned copy of `Settings.instance.bulkEditorPresets` so popup draft edits and render helpers never mutate live settings objects by accident.
- [ ] Implement `savePresets(presets)`: assigns the array to `Settings.instance.bulkEditorPresets` then calls `Settings.instance.save()`.
- [ ] Implement small shared text-normalization helpers for preset `name` / `description`: validate type, trim user input, and clamp to the configured max lengths before saving.
- [ ] Implement shared `normalizePresetValues()` / `validatePresetValues()` helpers that sanitize the preset payload before every save and after every read. These helpers must preserve explicit clear markers like `depth: null` and `recursion: {}` while stripping invalid keys/types.
- [ ] Implement `addPreset(name)`: creates `{ id: generatePresetId(), name, description: '', favorite: false, values: {} }` using the normalized/clamped name, appends it, saves, returns the new preset.
- [ ] Implement shared duplicate-name resolution for all create flows. Add/Rename still block duplicates with an error, but Duplicate must generate a unique copy name (for example `'Copy of [name]'`, `'Copy of [name] (2)'`, etc.) before saving.
- [ ] Implement `duplicatePreset(id)`: reads the source preset; creates a new preset with a generated unique copy name, the same `values` (deep-cloned with `structuredClone()`), and the same `description`, `favorite: false`. Normalize/clamp the duplicate name if needed. Appends it, saves, returns the new preset.
- [ ] Implement `deletePreset(id)`: removes the preset with matching id and saves.
- [ ] Implement `updatePreset(id, changes)`: merges `changes` into the matching preset (using `Object.assign`), normalizes/clamps `name` / `description` if present, and saves.
- [ ] Implement `updatePresetValues(id, capturedValues)`: replaces `preset.values` with normalized/validated `capturedValues` and saves.
- [ ] Implement `getFavoritePresets()`: returns presets where `favorite === true`, limited to first 5.

---

### Step 2.5 — Create `preset-values.js` (bulk value capture/load only)

File: `src/entry-manager/edit-presets/preset-values.js` *(new file)*

- [ ] Implement `captureCurrentValues(valueRegistry)`:
  - Calls `entry.getValue()` for each entry in `valueRegistry`.
  - Merges all non-null results into one flat object.
  - Preserves explicit clear intents instead of dropping them. Example: a cleared Depth must be captured as `depth: null`, and a Recursion section intentionally cleared to no checked flags must be captured as `recursion: {}`.
  - Returns the merged object. May be empty `{}` if no values were changed in the current Entry Manager session.
- [ ] Implement `loadPresetValues(presetValues, valueRegistry)`:
  - Validates/normalizes `presetValues` first so only known-safe payload keys reach the section loaders.
  - **First**: calls `entry.clearValue()` for every section in `valueRegistry` (resets all controls to a neutral clean state, clears `wasChangedThisSession`, clears the section apply button dirty marker).
  - **Then**: calls `entry.setValue(presetValues)` for every section (each applies only its own keys, sets `wasChangedThisSession = true`, and marks that section's apply button dirty, including explicit clear markers like `depth: null` and `recursion: {}`).
  - Result: only the preset's fields are active and dirty after load; no stale manual values remain active.

---

### Step 3 — Add `getValue()` / `setValue()` / `clearValue()` to section builders

**Contract:**

- Each section tracks `wasChangedThisSession` separately from the existing Apply-All dirty marker.
- `getValue()` returns a plain object with only the fields this section owns (e.g. `{ state: 'enabled' }`), including explicit clear markers when the user intentionally cleared a value this session, or `null` if this section was not changed in the current Entry Manager session.
- `setValue(values)` receives the full preset `values` object, applies only its own fields (no-op if key absent), sets `wasChangedThisSession = true`, and marks the section dirty using the same existing apply-button mechanism Apply All already reads. Explicit clear markers like `depth: null` or `recursion: {}` still count as "apply this section".
- `clearValue()` resets this section's controls to a neutral clean state for the current session (blank where possible; otherwise the section's initial default/live value), clears `wasChangedThisSession`, and removes the section apply-button dirty marker.
- A successful apply clears the section apply-button dirty marker, but does **not** clear `wasChangedThisSession`.
- All three functions are returned alongside the existing container element from each builder.

> **Return shape note:** All current section builders return a plain DOM element. After this step, each builder must return an object `{ container, getValue, setValue, clearValue }` (or for position, its existing named keys plus the three new functions). The `appendBulkSection` helper in `bulk-edit-row.js` currently calls `row.append(section)` directly on the return value and must be updated in Step 4.
>
> **Refactoring note:** Do **not** hand-copy the same preset-state wiring into every section builder. Add one shared helper in the bulk-edit-row module area that owns the repeated pattern: session-change tracking, marking the apply button dirty, clearing the dirty marker, and returning the `{ getValue, setValue, clearValue }` API. Each section should provide only its section-specific read/apply/clear logic. This avoids DRY violations across State, Strategy, Probability, Sticky, Cooldown, Delay, Budget, Recursion, Position, and Order.

Files: `bulk-edit-row.sections.js`, `bulk-edit-row.position.js`, `bulk-edit-row.order.js`

- [ ] `buildApplyAllSection` *(in `bulk-edit-row.sections.js`)*: Extract the current click-handler body into a named `runApplyAll` async function. Update the return to `{ container, applyButton, runApplyAll }` instead of a plain element. `runApplyAll()` must resolve to `{ appliedSections: number }` — `0` if no sections were dirty, otherwise the count of dirty sections that were applied. The existing click listener keeps working by calling `runApplyAll()` internally and using its result. This contract is required by the preset chip feedback in Step 6.
- [ ] `buildBulkStateSection`: Track `wasChangedThisSession` (init `false`) and remember the initial toggle state when the section is built. Manual click sets `wasChangedThisSession = true` and marks the section apply button dirty. `getValue()` → `{ state: 'enabled' | 'disabled' }` if `wasChangedThisSession`, else `null`. `setValue({ state })` → sets `fa-toggle-on`/`fa-toggle-off` classes and `localStorage` with `BULK_ACTIVE_STORAGE_KEY`; do **not** call `.click()`; sets `wasChangedThisSession = true` and marks the section apply button dirty. `clearValue()` → restores the initial toggle state, clears `wasChangedThisSession`, clears the section apply button dirty marker.
- [ ] `buildBulkStrategySection`: Remember the initial select value when the section is built. Manual change sets `wasChangedThisSession = true` and marks the section apply button dirty. `getValue()` → `{ strategy: selectEl.value }` only if `wasChangedThisSession`, else `null`. `setValue({ strategy })` → sets the select value, sets `wasChangedThisSession = true`, marks the section apply button dirty. `clearValue()` → restores the initial select value (not a placeholder, because this select has no blank option), clears `wasChangedThisSession`, clears the section apply button dirty marker.
- [ ] `buildBulkProbabilitySection`: same pattern → key `probability`. Manual change sets `wasChangedThisSession = true`. `getValue()` returns the number only if `wasChangedThisSession` and the input is non-empty. `clearValue()` → empties input, clears `wasChangedThisSession`, clears the section apply button dirty marker.
- [ ] `buildBulkNonNegativeIntegerSection` *(private shared helper used by Sticky, Cooldown, and Delay)*: Add session tracking directly to this helper so the logic is not duplicated across the three exported wrappers. Add `wasChangedThisSession` (init `false`). Wire the existing `persistedInput` change listener to also set `wasChangedThisSession = true`. Return `{ container, getValue, setValue, clearValue }` from the helper. `getValue()` → returns `{ [entryField]: parsedValue }` if `wasChangedThisSession` and the input is non-empty, else `null`. `setValue(values)` → if `values[entryField]` is present, sets `persistedInput.value`, updates `localStorage`, sets `wasChangedThisSession = true`, marks the apply button dirty. `clearValue()` → empties `persistedInput.value`, clears the `localStorage` key, clears `wasChangedThisSession`, clears the apply button dirty marker.
- [ ] `buildBulkStickySection`: inherits `getValue/setValue/clearValue` from the updated shared helper. No session-tracking code needed in this wrapper — just pass through the full return object.
- [ ] `buildBulkCooldownSection`: same — inherits from shared helper. Pass through the full return object.
- [ ] `buildBulkDelaySection`: same — inherits from shared helper. Note: `entryField` is `'delay'` and container `data-field` is `'bulkDelay'`. Pass through the full return object.
- [ ] `buildBulkBudgetSection`: Track `wasChangedThisSession`. Manual change sets it `true` and marks the section apply button dirty. `getValue()` → `{ ignoreBudget: checkboxEl.checked }` if `wasChangedThisSession`, else `null`. `setValue({ ignoreBudget })` → sets checkbox, sets `wasChangedThisSession = true`, marks the section apply button dirty. `clearValue()` → restores the neutral unchecked state, clears `wasChangedThisSession`, clears the section apply button dirty marker.
- [ ] `buildBulkRecursionSection`: Track `wasChangedThisSession`. Manual checkbox changes set it `true` and mark the section apply button dirty. `getValue()` → always returns `{ recursion: {...} }` when `wasChangedThisSession`, even if the object is empty; an empty object means "clear all recursion flags". `setValue({ recursion })` → unchecks ALL checkboxes, then sets only the preset's flags, sets `wasChangedThisSession = true`, marks the section apply button dirty; if `recursion` key absent, no-op. `clearValue()` → unchecks all checkboxes, clears `wasChangedThisSession`, clears the section apply button dirty marker.
- [ ] `buildBulkPositionSection`: preserves existing multi-return shape `{ positionContainer, depthContainer, outletContainer, cleanup }`. Add `getValue`, `setValue`, `clearValue`. Track **separate** session-change flags for `position`, `depth`, and `outlet` so the preset captures only the sub-controls the user changed this session. `getValue()` → object with present keys among `{ position, depth, outlet }`, but only for sub-controls whose session flag is `true`; if the user explicitly clears Depth while it is enabled, capture that as `depth: null` instead of dropping the key. Return `null` if none were changed this session. `setValue(values)` → if `position` exists, set it first and run the existing depth/outlet enabled-state sync; then apply `depth` / `outlet` only if those controls are enabled after the position change. `depth: null` must clear the depth input, still mark the depth sub-control as changed this session, and still dirty the section so Apply All writes the cleared state back to WI. Mark only the written sub-controls as changed this session, and mark the section apply buttons dirty. `clearValue()` → restores `position` to its initial select value, clears `depth` and `outlet`, clears all three session flags, and clears the section apply-button dirty markers.
- [ ] `buildBulkOrderSection`: currently returns a plain element; change to return `{ container, getValue, setValue, clearValue }`. Track `wasChangedThisSession` for the Order section as a whole. Manual change to Start, Spacing, or Direction sets it `true` and marks the section apply button dirty. `getValue()` → if `wasChangedThisSession`, return the current composite order payload `{ orderStart, orderStep, orderDirection }` using the current UI values (omit number keys if input empty); otherwise return `null`. `setValue(values)` → sets `dom.order.start.value`, `dom.order.step.value`, correct radio `checked`, updates `localStorage`, sets `wasChangedThisSession = true`, marks the section apply button dirty. `clearValue()` → empties Start/Spacing, resets Direction to its initial default, clears `wasChangedThisSession`, clears the section apply button dirty marker.

---

### Step 4 — Assemble `valueRegistry` in `buildBulkEditRow`

File: `src/entry-manager/bulk-editor-tab/bulk-edit-row.js`

- [ ] Update `appendBulkSection` to return `{ getValue, setValue, clearValue }` from each call: destructure these from the section builder's new return shape, append only the container to the row as before. Update `appendBulkEditSections` to collect each call's return alongside the section name into a local array, and return that array alongside `cleanup` so `buildBulkEditRow` can use it to assemble `valueRegistry`.
- [ ] Update all `buildBulk*` calls inside `appendBulkSection` to destructure `{ container (or existing name), getValue, setValue, clearValue }` from their return values (existing positional return shapes stay compatible — use named destructuring locally).
- [ ] Update the `buildApplyAllSection` call site in `finalizeBulkEditRow` to destructure `{ container, applyButton, runApplyAll }` from the updated function (changed in Step 3). `row.append(container)` as before; pass `applyButton` and `runApplyAll` through to `buildPresetsColumn`.
- [ ] After all sections are built, assemble:

  ```js
  const valueRegistry = [
    { getValue: stateGetValue,     setValue: stateSetValue,     clearValue: stateClearValue },
    { getValue: strategyGetValue,  setValue: strategySetValue,  clearValue: strategyClearValue },
    // ... one entry per section that exposes getValue/setValue/clearValue
  ];
  ```

- [ ] Define `getSelectedEntryCount()` in `buildBulkEditRow` using `dom` and `isEntryManagerRowSelected` already in scope: filter `dom.order.tbody` children by visible (not filtered) and selected, return the count as a number. Pass this function to `buildPresetsColumn`.
- [ ] Import `buildPresetsColumn` from `../edit-presets/presets-column.js`.
- [ ] Call `buildPresetsColumn({ valueRegistry, applyButton, runApplyAll, getSelectedEntryCount })` and `row.append()` the returned element (append after the `buildApplyAllSection` result).
- [ ] Include `cleanup` returned by `buildPresetsColumn` in the combined `cleanup` function returned by `buildBulkEditRow` (if any cleanup is needed).

---

### Step 5 — Build `presets-column.js` (main Presets column only)

File: `src/entry-manager/edit-presets/presets-column.js`

Implement `buildPresetsColumn({ valueRegistry, applyButton, runApplyAll, getSelectedEntryCount })`:

> **Refactoring note:** Use purpose-based names in this file. Prefer names like `presetSelect`, `favoriteChipsContainer`, `savePresetButton`, and `managePresetsButton`. Avoid shape-only names such as `selectEl`, `chipsRow`, or `btn`.

> **Function-size note:** Keep `buildPresetsColumn()` focused on assembling the column and wiring top-level events only. Extract helper functions for dropdown rendering, Save button state sync, chip feedback text restore, and selected-entry counting instead of letting the main builder grow into a large multi-purpose function.

- [ ] Create the container using `createLabeledBulkContainer('presets', 'Presets', 'Save and recall bulk-edit value sets.')` (import `createLabeledBulkContainer` from `../bulk-editor-tab/bulk-edit-row.helpers.js`).
- [ ] Create a `<select>` dropdown. Populate it by calling `renderPresetDropdown(presetSelect)` (internal helper that clears and repopulates from `readPresets()`).
- [ ] Add a tooltip to the dropdown element: `'Select a preset to load its values into the bulk-edit containers.'`
- [ ] Wire `change` event on the dropdown: read the selected preset, call `loadPresetValues(preset.values, valueRegistry)`, and re-evaluate Save button enabled/disabled state.
- [ ] Create a "Save" button (`menu_button interactable`, icon `fa-floppy-disk`). Initially disabled. `title` attribute updates between `'Save current bulk-edit values into the selected preset'` (enabled) and `'Select a preset from the dropdown first'` (disabled) based on dropdown selection state. On click: call `captureCurrentValues(valueRegistry)`; if empty `{}`, show `toastr.warning('Nothing to save — set at least one value first.')` and abort; otherwise call `updatePresetValues(selectedId, captured)` and show `toastr.success('Preset saved.')`.
- [ ] Create a "Manage" button (`menu_button interactable`, icon `fa-sliders`) with tooltip `'Open preset manager'`. On click: call `openPresetsPopup({ favoriteChipsContainer, presetSelect, valueRegistry, runApplyAll, getSelectedEntryCount })` from `presets-popup.js`.
- [ ] Append dropdown, Save button, Manage button to the container.
- [ ] Below the controls, reuse the existing chip-row wrapper class by creating `<div class="stwid--visibilityChips stwid--preset-chips">`; call `renderFavoritePresetChips(favoriteChipsContainer, valueRegistry, runApplyAll, getSelectedEntryCount)` to populate it.
- [ ] Return `{ element: container }`.
- [ ] Add a small shared helper in this file for safe preset text display: validate that `name` / `description` are strings, sanitize them with `DOMPurify.sanitize()`, then assign them with `textContent`, `value`, and `title` only. Do not use `innerHTML` for user-entered text.

---

### Step 6 — Finish `presets-column.js` chip and dropdown helpers

File: `src/entry-manager/edit-presets/presets-column.js`

- [ ] Implement `renderFavoritePresetChips(favoriteChipsContainer, valueRegistry, runApplyAll, getSelectedEntryCount)`:
  - Clears the row by removing/replacing child nodes; do not concatenate user text into `innerHTML`.
  - Calls `getFavoritePresets()`.
  - If no favourites: appends a greyed-out placeholder span `'Star a preset to pin it here.'` with class `stwid--preset-chips-placeholder`.
  - For each favourite preset: creates a real `<button type="button">` chip (reuse `menu_button` and `stwid--visibilityChip` CSS classes, plus a `fa-star` icon). Chip text is the preset name, truncated with CSS ellipsis. `title` attribute shows the preset description (if non-empty), otherwise just the name. Use a real button so the chip is reachable by keyboard Tab navigation.
  - Chips appear in the same order as the full preset list (top-to-bottom).
  - On click:
    1. Call `getSelectedEntryCount()` to read the count of currently selected entries before applying (used for feedback text).
    2. If the count is `0`, show `toastr.info('Select at least one entry first.')` and stop.
    3. Look up the preset by id, then call `loadPresetValues(preset.values, valueRegistry)`.
    4. Await `runApplyAll()`. It resolves to `{ appliedSections: number }`.
    5. Only if `result.appliedSections > 0`: temporarily set chip text to `'N updated'` (where N is the entry count from step 1) for ~2 seconds, then restore the preset name.

- [ ] Implement `renderPresetDropdown(presetSelect, selectedPresetId = null)` helper:
  - Clears all options.
  - Adds a disabled placeholder option `'— select preset —'`.
  - Appends one `<option>` per preset from `readPresets()`, assigning `value`, `title`, and `textContent` using the shared safe-text helper (string check + `DOMPurify.sanitize()` before use).
  - If `selectedPresetId` is provided and a matching option exists, sets `presetSelect.value = selectedPresetId` and re-evaluates the Save button enabled state.

- [ ] Extract small helper functions instead of stacking all chip/dropdown behavior inline. Expected helpers include:
  - `updateSavePresetButtonState(...)`
  - `flashFavoriteChipFeedback(...)`
  - `findPresetById(...)`

---

### Step 7 — Build `presets-popup.js` (Manage Presets popup only)

File: `src/entry-manager/edit-presets/presets-popup.js`

Implement `openPresetsPopup({ favoriteChipsContainer, presetSelect, valueRegistry, runApplyAll, getSelectedEntryCount })`:

> **Refactoring note:** This step must be split into small functions. `openPresetsPopup()` should only coordinate popup open/close flow and draft lifecycle. Do not let it become the single owner of overlay creation, modal DOM creation, row rendering, add-row state, duplicate flow, delete confirmation flow, reorder flow, and persistence.

> **Recommended helper split:** `buildPresetsPopupContent`, `renderPresetRows`, `buildPresetRow`, `commitPresetNameEdit`, `commitPresetDescriptionEdit`, `moveDraftPreset`, `toggleDraftFavorite`, `duplicateDraftPreset`, `buildDeleteConfirmation`, `buildAddPresetRow`, `commitDraftPresets`, and `closePresetsPopup`.

> **Naming note:** Use purpose names such as `presetsPopup`, `presetListContainer`, `draftPresets`, `autoSelectedPresetId`, and `previouslySelectedPresetId`. Avoid shape-only names like `listEl`, `row`, `item`, or `obj`.

- [ ] Open the manager with SillyTavern's popup API (`new Popup(html, POPUP_TYPE.DISPLAY)` or the current equivalent) instead of creating a custom page-level overlay. Apply ST popup size/scroll classes such as `.wide_dialogue_popup` / `.wider_dialogue_popup` / `.vertical_scrolling_dialogue_popup` as needed so the popup stays consistent with the host UI.
- [ ] When opening the popup, create a deep-cloned temporary draft copy of `readPresets()` and edit that draft while the popup is open.
- [ ] Build popup content inside a root `<div class="stwid--presets-popup">` with:
  - A close button (`fa-xmark`) in the top-right corner with `aria-label="Close preset manager"`.
  - A title `<h3>Manage Presets</h3>`.
  - A preset list container `<div class="stwid--presets-list">`.
  - An "Add new preset" button at the bottom.
- [ ] Implement `renderPresetRows(presetListContainer)`:
  - Clears `presetListContainer`.
  - For each preset from the popup draft:
    - Creates one row via a dedicated `buildPresetRow(...)` helper instead of inlining all row logic inside the list renderer.
    - **Name input** `<input type="text">` showing the preset name. On `change`/`blur`: require a string, trim it, block names longer than `MAX_PRESET_NAME_LENGTH`, if blank restore previous, if duplicate show `toastr.error('A preset with that name already exists.')` and restore, else update the draft item only.
    - **Description input** `<input type="text" placeholder="Optional note…">` showing the preset description. On `change`/`blur`: require a string, trim it, block descriptions longer than `MAX_PRESET_DESCRIPTION_LENGTH` (blank is valid — empty string means no note), then update the draft item only.
    - **Move Up / Move Down buttons** (`fa-arrow-up`, `fa-arrow-down`). On click: swap the preset with the previous/next draft item, re-render the list immediately, and disable the button at the top/bottom edges. Each icon-only button must include an `aria-label`.
    - **Star button** (`fa-star` solid if `favorite`, regular if not). On click: toggle `favorite` in the draft, then re-render the list. This icon-only button must include an `aria-label`.
    - **Duplicate button** (`fa-copy`). On click: duplicate the draft preset with `structuredClone()`, assign it a generated unique copy name before appending it to the draft list, re-render list, and remember the duplicate id so it is auto-selected after popup close. This icon-only button must include an `aria-label`.
    - **Delete button** (`fa-trash`). On click: show delete confirmation through a dedicated helper for the inline confirm state. Hide the action buttons and show the message using text nodes / `textContent`, not `innerHTML`. Validate/sanitize the preset name before showing it inside the confirmation text. On Confirm: remove the preset from the draft, re-render list. On Cancel: restore the row to its normal state. This icon-only button must include an `aria-label`.
  - Appends all built rows to `presetListContainer`.
- [ ] Wire "Add new preset" button: reveals a `<div class="stwid--presets-add-row">` (hidden by default) containing `<input type="text" placeholder="Preset name…">` and a confirm button (`fa-check`) with `aria-label="Confirm new preset name"`. Pressing Enter or clicking confirm: require a string, trim it, ignore if blank, block if longer than `MAX_PRESET_NAME_LENGTH`, if name exists in the draft show `toastr.error('A preset with that name already exists.')` and keep open, else create a new draft preset, re-render list, remember its id for auto-selection after close, and hide add row. Pressing Escape hides add row without saving.
- [ ] Closing the popup (close button, popup cancel path, or clicking outside the popup panel if the ST popup supports that behavior): writes the final draft to settings once via `savePresets(draftPresets)`, closes the popup through the ST popup lifecycle, then calls `renderPresetDropdown(presetSelect, previouslySelectedPresetIdOrNewPresetId)` (re-selects preset if it still exists, else falls back to placeholder), then calls `renderFavoritePresetChips(favoriteChipsContainer, valueRegistry, runApplyAll, getSelectedEntryCount)`.

- [ ] Keep every popup helper under the refactoring thresholds:
  - No helper should exceed the 50-line `SIZE-01` threshold without being split again.
  - Avoid 4-level indentation inside row renderers or close handlers; extract inner conditional branches into named helpers before that happens.

---

### Step 8 — Add CSS for preset chips and popup

File: `style.css`

> Run the `css-ST` and `css-responsive` skills before writing any new CSS rules. Reuse existing SillyTavern classes wherever possible. Only add new rules for things that cannot be expressed with existing classes. All new class names in this step must use the repo's kebab-case `stwid--` naming style.

- [ ] Reuse existing `.stwid--visibilityChip` and `.stwid--visibilityChips` styling for the preset chips and chip row wherever possible. Add `.stwid--preset-chips` only if the preset row needs a small local adjustment that the shared chip wrapper does not already provide.
- [ ] Chips must truncate long names: add or reuse `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` on the label area, and use a responsive `max-width` value rather than a fixed major-layout pixel width. Full name is exposed via the `title` attribute (native browser tooltip) — no custom tooltip component needed.
- [ ] Add `.stwid--presets-popup` only for popup content that cannot be expressed with existing ST popup classes.
- [ ] Add `.stwid--presets-row` (flex row, `align-items: center`, gap).
- [ ] Add `.stwid--presets-add-row` (flex row for the inline "add new" input + confirm button; hidden by default via `display: none`, shown when active).
- [ ] Add `.stwid--preset-chips-placeholder` (greyed-out hint text shown in the chips row when no favourites exist).
- [ ] Add explicit mobile overrides directly after each related preset CSS section using only `@media screen and (max-width: 1000px)` and, if still needed, `@media screen and (max-width: 768px)`.
- [ ] In the mobile overrides, make preset popup rows wrap (`flex-wrap: wrap`) and let text inputs grow to full width so the name/description fields and action buttons remain reachable on phone.
- [ ] If any transition or animation is added for chip feedback or popup behavior, use named non-layout transitions only (no `transition: all`) and add the matching `prefers-reduced-motion` override directly after that rule.

---

### Step 9 — Update architecture docs

Files: `ARCHITECTURE.md`, `FEATURE_MAP.md`

- [ ] In `ARCHITECTURE.md`: add `edit-presets/` folder under `entry-manager/` in the project structure tree, and add rows to the Module Responsibilities table for `presets-store.js`, `preset-values.js`, `presets-column.js`, and `presets-popup.js`.
- [ ] In `FEATURE_MAP.md`, add under the **Entry Manager** section:
  - `Bulk editor preset storage and CRUD → src/entry-manager/edit-presets/presets-store.js, src/shared/settings.js`
  - `Bulk editor preset column DOM (dropdown, save, manage button, chips) → src/entry-manager/edit-presets/presets-column.js`
  - `Bulk editor preset value capture and restore → src/entry-manager/edit-presets/preset-values.js`
  - `Bulk editor favourite preset chips → src/entry-manager/edit-presets/presets-column.js`
  - `Bulk editor manage-presets popup → src/entry-manager/edit-presets/presets-popup.js`
