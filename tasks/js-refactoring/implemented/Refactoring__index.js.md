# REFACTORING: index.js
*Created: March 7, 2026*

**File:** `index.js`
**Findings:** 6 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 3 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **6** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The file repeats the same "write the current editor back into shared state" callback twice. That means one small behavior must be kept in sync in two places instead of one.

**Where:**
- `index.js`, lines 69-72 - `initWIUpdateHandler` setter for `currentEditor`
- `index.js`, lines 80-83 - `initDrawer` setter for `currentEditor`

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `setCurrentEditor(value)` near the top of the file.
- [x] Replace the first copy (lines 69-72) with `setCurrentEditor`.
- [x] Replace the second copy (lines 80-83) with `setCurrentEditor`.

---

### [2] DRY-01 - Duplicated code block

**What:** `jumpToEntry` repeats the same "if this toggle is active, click it to close it" logic for two different buttons. This is the same sequence of steps with a different input.

**Where:**
- `index.js`, lines 258-261 - close the activation toggle if it is active
- `index.js`, lines 262-265 - close the order toggle if it is active

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `deactivateToggle(toggleButton)` near the top of the file.
- [x] Replace the first copy (lines 258-261) with a call to `deactivateToggle(activationToggle)`.
- [x] Replace the second copy (lines 262-265) with a call to `deactivateToggle(orderToggle)`.

---

### [3] DRY-01 - Duplicated code block

**What:** The settings panel builds two feature-checkbox change handlers with the same save-and-refresh flow. The only difference is which setting key and checkbox are used.

**Where:**
- `index.js`, lines 200-206 - folder grouping checkbox setup
- `index.js`, lines 209-215 - additional matching sources checkbox setup

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `bindFeatureCheckbox(checkbox, settingKey)` near the top of the file.
- [x] Replace the first copy (lines 200-206) with a call to `bindFeatureCheckbox(folderGroupingCheckbox, 'featureFolderGrouping')`.
- [x] Replace the second copy (lines 209-215) with a call to `bindFeatureCheckbox(amsCheckbox, 'featureAdditionalMatchingSources')`.

---

### [4] DRY-02 - Magic value

**What:** The value `'display'` appears 4 times. It represents the inline style property being hidden and restored, and should be a named constant.

**Where:**
- `index.js`, line 126
- `index.js`, line 127
- `index.js`, line 138
- `index.js`, line 139

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const DISPLAY_STYLE_PROPERTY = 'display';`
- [x] Replace each occurrence of the raw literal with `DISPLAY_STYLE_PROPERTY`.

---

### [5] NAME-01 - Shape-based name

**What:** `ev` (line 37) describes the variable by its short shape rather than its purpose. Reading the name alone does not tell you that it is the file-watch event source returned by the CSS watcher.

**Where:** `index.js`, line 37

**Steps to fix:**
- [x] Rename `ev` to `cssWatchEventSource` everywhere it appears in this file.

---

### [6] SIZE-01 - Large function

**What:** `initSettingsPanel` is 54 lines long (lines 182-235). It is doing too much: it mounts the settings panel markup and also wires feature checkboxes and also wires hidden-tab checkboxes.

**Where:** `index.js`, lines 182-235

**Steps to fix:**
- [x] Extract settings panel mounting (lines 183-195) into a new function named `mountSettingsPanel()`. This should find the host container, render the template, and return the new wrapper.
- [x] Extract feature checkbox wiring (lines 197-216) into a new function named `bindFeatureSettingControls(wrapper)`. This should connect the two feature toggles to settings saves and visibility refreshes.
- [x] Extract hidden-tab checkbox wiring (lines 218-232) into a new function named `bindHiddenTabControls(wrapper)`. This should sync each tab checkbox with `Settings.instance.hiddenTabs`.
- [x] Replace the extracted blocks in `initSettingsPanel` with calls to the new functions.

---

## After Implementation
*Implemented: March 10, 2026*

### What changed

`index.js`
- Extracted shared helpers for setting the current editor, deactivating toggles, and binding feature checkboxes so repeated logic now lives in one place.
- Replaced the repeated `'display'` string with a named constant and renamed the CSS watcher event source variable to describe its job clearly.
- Split the settings panel setup into smaller functions so mounting, feature-toggle wiring, and hidden-tab wiring are separated.

### Risks / What might break

- If future code expects the old inline settings setup shape inside `initSettingsPanel`, it will now need to follow the extracted helper flow.
- If another setting checkbox is added later and not routed through the shared helper, behavior could drift again.

### Manual checks

- Reload the extension settings page and confirm the WorldInfo Drawer settings panel still appears. Success looks like the same settings block rendering under Extensions.
- Toggle `Folder Grouping` and `Additional Matching Sources`. Success looks like each checkbox still saves immediately and updates the related UI without errors.
- Toggle hidden tabs on and off. Success looks like the matching browser tabs hide and reappear correctly after each click.
