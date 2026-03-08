# REFACTORING: editor-panel.js
*Created: July 3, 2026*

**File:** `src/editor-panel/editor-panel.js`
**Findings:** 12 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 4 |
| Magic values | DRY-02 | 5 |
| Shape-based naming | NAME-01 | 1 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **12** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The same "reset editor ownership state" logic is written in two places. This makes future changes risky, because updating one copy but forgetting the other can cause inconsistent behavior (bugs that only happen in some paths).

**Where:**
- `src/editor-panel/editor-panel.js`, lines 97-101 - reset current editor state inside `clearEditor` when `resetCurrent` is true
- `src/editor-panel/editor-panel.js`, lines 104-108 - `resetEditorOwnership` does the same reset

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `resetEditorOwnershipState()` near the top of the file (after the `let` state variables).
- [ ] Replace the block in `clearEditor` (lines 97-101) with a call to `resetEditorOwnershipState()`.
- [ ] Replace the block in `resetEditorOwnership` (lines 104-108) with a call to `resetEditorOwnershipState()`.

---

### [2] DRY-01 - Duplicated code block

**What:** The same "activation settings availability" guard is repeated in multiple functions. This repeats the same decision logic in three places and makes it easier to accidentally handle one path differently than the others.

**Where:**
- `src/editor-panel/editor-panel.js`, line 111 - `hideActivationSettings`: `if (!activationBlock || !activationBlockParent) return;`
- `src/editor-panel/editor-panel.js`, line 132 - `showActivationSettings`: `if (!activationBlock || !activationBlockParent) return;`
- `src/editor-panel/editor-panel.js`, line 139 - `toggleActivationSettings`: `if (!activationBlock || !activationBlockParent) return;`

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `hasActivationSettingsDom()` near the top of the file that returns `Boolean(activationBlock && activationBlockParent)`.
- [ ] Replace the guard line in `hideActivationSettings` (line 111) with `if (!hasActivationSettingsDom()) return;`.
- [ ] Replace the guard line in `showActivationSettings` (line 132) with `if (!hasActivationSettingsDom()) return;`.
- [ ] Replace the guard line in `toggleActivationSettings` (line 139) with `if (!hasActivationSettingsDom()) return;`.

---

### [3] DRY-01 - Duplicated code block

**What:** The same "validate name and uid" guard appears in multiple functions. This repeats the same correctness rule in three places and makes it easy for the rules to drift over time (for example, one function might start accepting a value that another rejects).

**Where:**
- `src/editor-panel/editor-panel.js`, line 28 - `markEditorClean`: `if (!name || uid == null) return;`
- `src/editor-panel/editor-panel.js`, line 308 - `isDirty`: `if (!name || uid == null) return false;`
- `src/editor-panel/editor-panel.js`, line 314 - `markClean`: `if (!name || uid == null) return;`

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `hasValidEditorKey(name, uid)` near the top of the file that returns `Boolean(name && uid != null)`.
- [ ] Replace the guard in `markEditorClean` (line 28) with `if (!hasValidEditorKey(name, uid)) return;`.
- [ ] Replace the guard in `isDirty` (line 308) with `if (!hasValidEditorKey(name, uid)) return false;`.
- [ ] Replace the guard in `markClean` (line 314) with `if (!hasValidEditorKey(name, uid)) return;`.

---

### [4] DRY-01 - Duplicated code block

**What:** The logic that updates the AMS drawer icon is split across two places (initial setup and click handler). This increases the chance of the icon being out of sync (for example, one path sets different classes than the other).

**Where:**
- `src/editor-panel/editor-panel.js`, lines 207-211 - initial icon setup inside `wireAmsSection`
- `src/editor-panel/editor-panel.js`, lines 216-221 - icon update logic inside the `amsHeader` click handler

**Steps to fix:**
- [ ] Extract the shared pattern into a new function named `syncAmsDrawerIcon({ icon, isOpen })` near `wireAmsSection`.
- [ ] In the initial setup (lines 207-211), replace the block with `syncAmsDrawerIcon({ icon, isOpen: false })`.
- [ ] In the click handler (lines 216-221), replace the icon update block with `syncAmsDrawerIcon({ icon, isOpen })`.

---

### [5] DRY-02 - Magic value

**What:** The value `'stwid--ams-open'` appears 2 times. It represents the "AMS drawer open state class" and should be a named constant.

**Where:**
- `src/editor-panel/editor-panel.js`, line 200
- `src/editor-panel/editor-panel.js`, line 215

**Steps to fix:**
- [ ] At the top of the file (after constants), add: `const AMS_OPEN_CLASS = 'stwid--ams-open';`
- [ ] Replace each occurrence of the raw literal with `AMS_OPEN_CLASS`.

---

### [6] DRY-02 - Magic value

**What:** The value `'1'` appears 2 times. It represents the "wired marker value" for `amsDrawer.dataset.stwidAmsWired` and should be a named constant.

**Where:**
- `src/editor-panel/editor-panel.js`, line 196
- `src/editor-panel/editor-panel.js`, line 197

**Steps to fix:**
- [ ] At the top of the file (after constants), add: `const AMS_WIRED_DATASET_VALUE = '1';`
- [ ] Replace each occurrence of the raw literal with `AMS_WIRED_DATASET_VALUE`.

---

### [7] DRY-02 - Magic value

**What:** The value `'input'` appears 2 times. It represents the editor "input event type" and should be a named constant to prevent typos and keep add/remove event names in sync.

**Where:**
- `src/editor-panel/editor-panel.js`, line 82
- `src/editor-panel/editor-panel.js`, line 323

**Steps to fix:**
- [ ] At the top of the file (after constants), add: `const EDITOR_EVENT_INPUT = 'input';`
- [ ] Replace each occurrence of the raw literal with `EDITOR_EVENT_INPUT`.

---

### [8] DRY-02 - Magic value

**What:** The value `'change'` appears 2 times. It represents the editor "change event type" and should be a named constant to prevent typos and keep add/remove event names in sync.

**Where:**
- `src/editor-panel/editor-panel.js`, line 83
- `src/editor-panel/editor-panel.js`, line 324

**Steps to fix:**
- [ ] At the top of the file (after constants), add: `const EDITOR_EVENT_CHANGE = 'change';`
- [ ] Replace each occurrence of the raw literal with `EDITOR_EVENT_CHANGE`.

---

### [9] DRY-02 - Magic value

**What:** The value `'keydown'` appears 2 times. It represents the editor "keydown event type" and should be a named constant to prevent typos and keep add/remove event names in sync.

**Where:**
- `src/editor-panel/editor-panel.js`, line 84
- `src/editor-panel/editor-panel.js`, line 325

**Steps to fix:**
- [ ] At the top of the file (after constants), add: `const EDITOR_EVENT_KEYDOWN = 'keydown';`
- [ ] Replace each occurrence of the raw literal with `EDITOR_EVENT_KEYDOWN`.

---

### [10] NAME-01 - Shape-based name

**What:** `btn` (line 182) describes that the value is a "button" (its shape/type) rather than its purpose. Reading the name alone does not tell you what the button is for.

**Where:** `src/editor-panel/editor-panel.js`, line 182

**Steps to fix:**
- [ ] Rename `btn` to `focusToggleButton` everywhere it appears in this file.
- [ ] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [11] SIZE-01 - Large function

**What:** `initEditorPanel` is 328 lines long (lines 14-341). It is doing too much: it creates many unrelated helper functions and also wires event listeners and also manages activation settings UI and also manages focus/unfocus UI and also manages AMS drawer behavior and also opens and renders entry editors.

**Where:** `src/editor-panel/editor-panel.js`, lines 14-341

**Steps to fix:**
- [ ] Extract the editor dirty-tracking and event listener wiring (lines 18-84, plus cleanup lines 322-326) into a new helper function named `wireEditorDirtyTracking()` that returns `{ cleanup }`.
- [ ] Extract activation settings rendering/toggling (lines 110-148) into a new helper function named `createActivationSettingsController()` that returns `{ hideActivationSettings, showActivationSettings, toggleActivationSettings }`.
- [ ] Extract focus/unfocus button creation and wiring (lines 159-184) into a new helper function named `createFocusControls()` that returns `{ appendFocusButton, appendUnfocusButton }`.
- [ ] Extract AMS drawer wiring (lines 186-223) into a new helper function named `wireAmsDrawerSection(editDom)` (or keep the existing `wireAmsSection` but move it out of `initEditorPanel` into a module-level function).
- [ ] Keep `initEditorPanel` as an orchestration function that calls these helpers and returns the public API.

---

### [12] SIZE-01 - Large function

**What:** `openEntryEditor` is 55 lines long (lines 250-304). It is doing too much: it validates selection state and also closes competing panels and also fetches header template and also builds the entry edit DOM and also renders the editor UI and also updates ownership/dirty tracking.

**Where:** `src/editor-panel/editor-panel.js`, lines 250-304

**Steps to fix:**
- [ ] Extract the early-exit and selection handling (lines 254-256) into a new function named `prepareToOpenEntryEditor({ isTokenCurrent, getSelectFrom, selectEnd })`. One sentence: ensures it is safe to open an editor and finalizes any current text selection.
- [ ] Extract the "load entry editor DOM" portion (lines 270-280) into a new async function named `buildEntryEditDom({ name, entry, isTokenCurrent })`. One sentence: builds and returns `editDom` for a world entry using the save payload.
- [ ] Extract the "render editor DOM and highlight active entry" portion (lines 283-293) into a new function named `renderEntryEditorDom({ entryDom, editDom, header })`. One sentence: clears the editor panel, highlights the selected entry, and appends all required DOM nodes.
- [ ] Replace the extracted blocks in `openEntryEditor` with calls to the new functions.