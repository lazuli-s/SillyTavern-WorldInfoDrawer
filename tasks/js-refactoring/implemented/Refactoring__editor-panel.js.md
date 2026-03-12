# REFACTORING: editor-panel.js
*Created: March 12, 2026*

**File:** `src/editor-panel/editor-panel.js`
**Findings:** 5 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 0 |
| Shape-based naming | NAME-01 | 3 |
| Large functions | SIZE-01 | 1 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **5** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** The same three-property argument object is constructed twice when calling `resetEditorOwnershipState` — once inside `clearEditor` and once inside `resetEditorOwnership`. Because these two functions both need to do the same reset, the caller code (`clearEditor`) is independently building what `resetEditorOwnership` already knows how to do. If the argument shape ever needs to change, it must be updated in two places.

**Where:**
- `src/editor-panel/editor-panel.js`, lines 259–264 — `clearEditor` builds the argument and calls `resetEditorOwnershipState` when `resetCurrent` is true
- `src/editor-panel/editor-panel.js`, lines 267–273 — `resetEditorOwnership` builds the identical argument and calls `resetEditorOwnershipState`

**Steps to fix:**
- [x] In `clearEditor` (lines 259–264), replace the inline call to `resetEditorOwnershipState({...})` with a call to `resetEditorOwnership()`.
- [x] `resetEditorOwnership` is already defined just below `clearEditor` and does exactly this work — remove the duplicate argument construction from `clearEditor` and delegate to it instead.
- [x] Verify `resetEditorOwnership` is always available in scope when `clearEditor` runs (it is — both are closures inside `initEditorPanel`).

---

### [2] NAME-01 — Shape-based name: `editDom`

**What:** The name `editDom` tells you only the data type ("Dom" = a page element) but not what this element actually represents. If you read the name alone, you cannot tell whether it is the entry editor form, a toolbar, or some other part of the page. The purpose is: the entry editor form that SillyTavern generates when you open a World Info entry for editing.

**Where:** `src/editor-panel/editor-panel.js`, line 162 (first assignment in `buildEntryEditDom`); also lines 163, 165, 167, 168 (same function), line 177 (parameter in `renderEntryEditorDom`), line 354 (local in `openEntryEditor`), lines 362, 370, 373, 374 (uses in `openEntryEditor`)

**Steps to fix:**
- [x] Rename `editDom` to `entryEditorDom` everywhere it appears in this file (lines 162, 163, 165, 167, 168, 177, 184, 185, 354, 362, 370, 373, 374).
- [x] `editDom` is not exported; it is only used as a local variable and function parameter inside this file, so no other files need to change.

---

### [3] NAME-01 — Shape-based name: `entryDom`

**What:** `entryDom` tells you only that this is a page element ("Dom") belonging to an entry. It does not say what role the element plays in the interface. Its actual purpose is: the row element in the entry list that the user clicked to open the editor. Knowing this name, you could call it `entryRowDom` to match the naming style already used by `activeEntryDom` elsewhere in the same file.

**Where:** `src/editor-panel/editor-panel.js`, line 177 (parameter in `renderEntryEditorDom`); also lines 182, 186 (uses in `renderEntryEditorDom`), line 349 (parameter in `openEntryEditor`), line 364 (use in `openEntryEditor`)

**Steps to fix:**
- [x] Rename `entryDom` to `entryRowDom` everywhere it appears in this file (lines 177, 182, 186, 349, 364).
- [x] `entryDom` is not exported; it is only used as a local parameter inside this file, so no other files need to change. Note: `openEntryEditor` uses alias destructuring (`entryDom: entryRowDom`) so external callers still pass the property as `entryDom` with no changes needed.

---

### [4] NAME-01 — Shape-based name: `icon`

**What:** `icon` describes only that this value is an icon element — it could be any icon anywhere on the page. Its actual purpose is: the chevron arrow icon inside the AMS drawer toggle that visually shows whether the drawer is open or closed. Renaming it makes it immediately clear in both places it is used.

**Where:** `src/editor-panel/editor-panel.js`, line 113 (parameter in `syncAmsDrawerIcon`); line 141 (local in `wireAmsDrawerSection`); lines 142, 147 (uses in `wireAmsDrawerSection`)

**Steps to fix:**
- [x] Rename `icon` to `chevronIcon` in the parameter of `syncAmsDrawerIcon` (line 113) and in all four references inside that function (lines 114, 115, 116, 117).
- [x] Rename `icon` to `chevronIcon` in the local declaration in `wireAmsDrawerSection` (line 141) and in its two uses (lines 142, 147).

---

### [5] SIZE-01 — Large function: `initEditorPanel`

**What:** `initEditorPanel` is 213 lines long (lines 189–402). It is doing too much: it manages editor state variables, and also defines dirty-tracking logic, and also defines editor clear/reset operations, and also defines activation-settings visibility, and also defines focus-toggle button creation, and also defines entry-editor open/render logic, and also wires competing-panel closing. Each of these is a self-contained concern that could be a named helper.

**Where:** `src/editor-panel/editor-panel.js`, lines 189–402

**Steps to fix:**
- [x] Extract the dirty-tracking state and its three inner functions (`markEditorClean`, `markEditorDirtyIfCurrent`, `shouldMarkDirtyOnKeydown`) into a new factory function named `createDirtyTracker()` (lines 204–247). It should return `{ markEditorClean, markEditorDirtyIfCurrent, shouldMarkDirtyOnKeydown, cleanup }` and accept `dom` as a parameter. Note: also returns setters/getters (`setCurrentEditorKey`, `setIsEditorDirty`, `getIsEditorDirty`, `getCurrentEditorKey`) needed by `resetEditorOwnership`, `isDirty`, and `markClean` in the outer scope.
- [x] Extract `clearEntryHighlights` and `clearEditor` together into a new helper named `createEditorClearer({ dom, resetEditorOwnership })` (lines 249–265). The `activeEntryDom` state variable moved into this factory. Returns `{ clearEntryHighlights, clearEditor, setActiveEntryDom }`.
- [x] Extract `fetchEntryHeaderElement` and `fixTextpoleHeights` into their own standalone (non-closure) functions at the module level. Note: `fetchEntryHeaderElement` captures `renderTemplateAsync` from the `initEditorPanel` closure, so it was lifted with `renderTemplateAsync` added as an explicit first parameter.
- [x] Replace the extracted blocks inside `initEditorPanel` with calls to the new factory functions and import their results via destructuring.
- [x] After extraction, verify the return object at lines 390–401 still exports the same keys with the same values. Verified — all 10 keys (`cleanup`, `clearEditor`, `clearEntryHighlights`, `hideActivationSettings`, `showActivationSettings`, `toggleActivationSettings`, `resetEditorState`, `openEntryEditor`, `isDirty`, `markClean`) are present and correct.

---

## After Implementation
*Implemented: March 12, 2026*

### What changed

**`src/editor-panel/editor-panel.js`**
- `clearEditor` now delegates to `resetEditorOwnership()` instead of duplicating the ownership-reset argument object (DRY-01).
- `editDom` renamed to `entryEditorDom` in `appendFocusButton`, `wireAmsDrawerSection`, `buildEntryEditDom`, `renderEntryEditorDom`, `fixTextpoleHeights`, and `openEntryEditor`.
- `entryDom` renamed to `entryRowDom` in `renderEntryEditorDom` and `openEntryEditor`; `openEntryEditor` uses alias destructuring (`entryDom: entryRowDom`) so callers are unaffected.
- `icon` renamed to `chevronIcon` in `syncAmsDrawerIcon` (parameter + body) and `wireAmsDrawerSection` (local + calls).
- `initEditorPanel` reduced from 213 lines to ~75 lines by extracting:
  - `createDirtyTracker({ dom })` — owns dirty state, `markEditorClean`, `markEditorDirtyIfCurrent`, `shouldMarkDirtyOnKeydown`, and the `wireEditorDirtyTracking` call.
  - `createEditorClearer({ dom, resetEditorOwnership })` — owns `activeEntryDom` state, `clearEntryHighlights`, `clearEditor`, and `setActiveEntryDom`.
  - `fetchEntryHeaderElement(renderTemplateAsync, isTokenCurrent)` — lifted to module level.
  - `fixTextpoleHeights(entryEditorDom)` — lifted to module level.

### Risks / What might break

- The `openEntryEditor` public API still accepts `{ entryDom }` from callers (alias destructuring preserves the external property name). Any future caller that passes `entryRowDom` instead of `entryDom` will silently receive `undefined` for the row — verify callers pass `entryDom`.
- `createDirtyTracker` now exposes internal setters/getters as part of its return. If future code calls these setters directly it bypasses the validation guards in `markEditorClean` — only `resetEditorOwnership`, `isDirty`, and `markClean` should use them.
- `fetchEntryHeaderElement` now takes `renderTemplateAsync` as an explicit first argument; any future call site must pass it or the template fetch will fail silently.

### Manual checks

1. Open the extension in SillyTavern, click an entry row in the book browser — verify the entry editor renders correctly with header and content.
2. Edit any field in the open editor, then open a second entry — verify the first entry's highlight clears and the editor resets cleanly.
3. Click the activation-settings toggle — verify the panel opens, the entry editor clears, and clicking again restores the editor state.
4. Open an entry, click the AMS section header — verify the chevron icon flips between up and down as the drawer opens and closes.
5. Open an entry and make an edit, then navigate away — verify `isDirty` returns true and `markClean` resets it to false.
