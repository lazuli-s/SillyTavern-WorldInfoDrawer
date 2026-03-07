# REFACTORING: browser-tabs.settings-tab.js
*Created: July 3, 2026*

**File:** `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`
**Findings:** 7 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **7** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The file repeats the same "check whether the editor has unsaved changes" logic in multiple click handlers. This increases the chance of future bugs because any change to how "dirty" is computed must be updated in more than one place.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, lines 28-32 - compute `isDirty` inside the Global Activation Settings click handler
- `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, lines 57-61 - compute `isDirty` inside the Entry Manager toggle click handler

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `getIsEditorDirty()` near the top of the file.
- [ ] Move the repeated block (lines 28-32 and 57-61) into `getIsEditorDirty()`, returning the boolean.
- [ ] Replace the first copy (lines 28-32) with `const isDirty = getIsEditorDirty();`.
- [ ] Replace the second copy (lines 57-61) with `const isDirty = getIsEditorDirty();`.

---

### [2] DRY-02 - Magic value

**What:** The value `'menu_button'` appears 3 times. It represents the shared "icon button base styling" class and should be a named constant (or shared list) so the styling contract is not repeated in multiple places.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, line 24
- `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, line 42
- `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, line 52

**Steps to fix:**
- [ ] At the top of the file (after exports), add: `const ICON_BUTTON_BASE_CLASSES = ['menu_button', 'fa-solid', 'fa-fw'];`
- [ ] Replace `settings.classList.add('stwid--activation', 'menu_button', 'fa-solid', 'fa-fw', 'fa-cog');` (line 24) with `settings.classList.add('stwid--activation', ...ICON_BUTTON_BASE_CLASSES, 'fa-cog');`
- [ ] Replace `refresh.classList.add('menu_button', 'fa-solid', 'fa-fw', 'fa-arrows-rotate');` (line 42) with `refresh.classList.add(...ICON_BUTTON_BASE_CLASSES, 'fa-arrows-rotate');`
- [ ] Replace `order.classList.add('menu_button', 'fa-solid', 'fa-fw', 'fa-pen-to-square');` (line 52) with `order.classList.add(...ICON_BUTTON_BASE_CLASSES, 'fa-pen-to-square');`

---

### [3] DRY-02 - Magic value

**What:** The value `'stwid--state-active'` appears 3 times. It represents the "active state" CSS class and should be a named constant so it is easy to change consistently.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, line 33
- `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, line 56
- `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, line 71

**Steps to fix:**
- [ ] At the top of the file (after exports), add: `const ACTIVE_STATE_CLASS = 'stwid--state-active';`
- [ ] Replace each occurrence of the raw literal with `ACTIVE_STATE_CLASS`.

---

### [4] NAME-01 - Shape-based name

**What:** `settings` (line 22) describes a generic concept ("settings") rather than what this element actually is in the UI (a button that opens Global Activation Settings). Reading the name alone does not tell you what it does.

**Where:** `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, line 22

**Steps to fix:**
- [ ] Rename `settings` to `activationSettingsButton` everywhere it appears in this file.
- [ ] Update related assignments to keep them consistent (for example, keep `dom.activationToggle` pointing at `activationSettingsButton`).

---

### [5] NAME-01 - Shape-based name

**What:** `refresh` (line 41) describes the action but not the role (this is a clickable icon button). A clearer name helps distinguish the DOM element from the refresh behavior.

**Where:** `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, line 41

**Steps to fix:**
- [ ] Rename `refresh` to `refreshButton` everywhere it appears in this file.

---

### [6] NAME-01 - Shape-based name

**What:** `order` (line 50) does not describe what this element actually does. This button is used to open/close the Entry Manager, not to manage ordering.

**Where:** `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, line 50

**Steps to fix:**
- [ ] Rename `order` to `entryManagerToggleButton` everywhere it appears in this file.
- [ ] Ensure `dom.order.toggle` continues to reference the same element after the rename.

---

### [7] SIZE-01 - Large function

**What:** `createSettingsTabContent` is 77 lines long (lines 7-83). It is doing too much: creating the container DOM structure and also wiring multiple click handlers and also defining the returned public API.

**Where:** `src/book-browser/browser-tabs/browser-tabs.settings-tab.js`, lines 7-83

**Steps to fix:**
- [ ] Extract the "settings group label and hint icon" creation (lines 11-20) into a new function named `createSettingsGroupLabel()` that returns the label element.
- [ ] Extract the "Global Activation Settings button" creation and event wiring (lines 22-39) into a new function named `createActivationSettingsButton({ dom, getCurrentEditor, getEditorPanelApi })`.
- [ ] Extract the "Refresh button" creation and event wiring (lines 41-48) into a new function named `createRefreshButton({ getListPanelApi })`.
- [ ] Extract the "Entry Manager toggle button" creation and event wiring (lines 50-78) into a new function named `createEntryManagerToggleButton({ dom, openEntryManager, getListPanelApi, getEditorPanelApi, getCurrentEditor })`.
- [ ] Replace the extracted blocks in `createSettingsTabContent` with calls to the new functions.
- [ ] Keep `setToggleVisible` and the final return object close together at the bottom to make the public API easier to see.