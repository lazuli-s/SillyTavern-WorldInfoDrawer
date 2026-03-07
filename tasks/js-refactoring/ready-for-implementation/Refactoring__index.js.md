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
- [ ] Extract the shared pattern into a new function named `setCurrentEditor(value)` near the top of the file.
- [ ] Replace the first copy (lines 69-72) with `setCurrentEditor`.
- [ ] Replace the second copy (lines 80-83) with `setCurrentEditor`.

---

### [2] DRY-01 - Duplicated code block

**What:** `jumpToEntry` repeats the same "if this toggle is active, click it to close it" logic for two different buttons. This is the same sequence of steps with a different input.

**Where:**
- `index.js`, lines 258-261 - close the activation toggle if it is active
- `index.js`, lines 262-265 - close the order toggle if it is active

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `deactivateToggle(toggleButton)` near the top of the file.
- [ ] Replace the first copy (lines 258-261) with a call to `deactivateToggle(activationToggle)`.
- [ ] Replace the second copy (lines 262-265) with a call to `deactivateToggle(orderToggle)`.

---

### [3] DRY-01 - Duplicated code block

**What:** The settings panel builds two feature-checkbox change handlers with the same save-and-refresh flow. The only difference is which setting key and checkbox are used.

**Where:**
- `index.js`, lines 200-206 - folder grouping checkbox setup
- `index.js`, lines 209-215 - additional matching sources checkbox setup

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `bindFeatureCheckbox(checkbox, settingKey)` near the top of the file.
- [ ] Replace the first copy (lines 200-206) with a call to `bindFeatureCheckbox(folderGroupingCheckbox, 'featureFolderGrouping')`.
- [ ] Replace the second copy (lines 209-215) with a call to `bindFeatureCheckbox(amsCheckbox, 'featureAdditionalMatchingSources')`.

---

### [4] DRY-02 - Magic value

**What:** The value `'display'` appears 4 times. It represents the inline style property being hidden and restored, and should be a named constant.

**Where:**
- `index.js`, line 126
- `index.js`, line 127
- `index.js`, line 138
- `index.js`, line 139

**Steps to fix:**
- [ ] At the top of the file (after imports), add: `const DISPLAY_STYLE_PROPERTY = 'display';`
- [ ] Replace each occurrence of the raw literal with `DISPLAY_STYLE_PROPERTY`.

---

### [5] NAME-01 - Shape-based name

**What:** `ev` (line 37) describes the variable by its short shape rather than its purpose. Reading the name alone does not tell you that it is the file-watch event source returned by the CSS watcher.

**Where:** `index.js`, line 37

**Steps to fix:**
- [ ] Rename `ev` to `cssWatchEventSource` everywhere it appears in this file.

---

### [6] SIZE-01 - Large function

**What:** `initSettingsPanel` is 54 lines long (lines 182-235). It is doing too much: it mounts the settings panel markup and also wires feature checkboxes and also wires hidden-tab checkboxes.

**Where:** `index.js`, lines 182-235

**Steps to fix:**
- [ ] Extract settings panel mounting (lines 183-195) into a new function named `mountSettingsPanel()`. This should find the host container, render the template, and return the new wrapper.
- [ ] Extract feature checkbox wiring (lines 197-216) into a new function named `bindFeatureSettingControls(wrapper)`. This should connect the two feature toggles to settings saves and visibility refreshes.
- [ ] Extract hidden-tab checkbox wiring (lines 218-232) into a new function named `bindHiddenTabControls(wrapper)`. This should sync each tab checkbox with `Settings.instance.hiddenTabs`.
- [ ] Replace the extracted blocks in `initSettingsPanel` with calls to the new functions.
