# REFACTORING: wi-update-handler.js
*Created: July 3, 2026*

**File:** `src/shared/wi-update-handler.js`
**Findings:** 11 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 2 |
| Shape-based naming | NAME-01 | 5 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 1 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **11** |

---

## Findings

### [1] DRY-01 - Duplicated code block

**What:** The same "check the editor field value and decide whether to refresh the editor" logic is repeated in multiple `switch` cases. This makes the code harder to change safely, because any future tweak must be repeated in several places.

**Where:**
- `src/shared/wi-update-handler.js`, lines 154-160 - check `content` editor field and call `triggerEditorRefreshOnce()`
- `src/shared/wi-update-handler.js`, lines 163-168 - check `comment` editor field and call `triggerEditorRefreshOnce()`
- `src/shared/wi-update-handler.js`, lines 173-178 - check `key` editor field and call `triggerEditorRefreshOnce()`
- `src/shared/wi-update-handler.js`, lines 199-204 - check generic editor field and call `triggerEditorRefreshOnce()`

**Steps to fix:**
- [x] Extract the shared pattern into a new function named `maybeTriggerEditorRefreshForField({ isCurrentEditor, selector, expectedValue, triggerEditorRefreshOnce })` near the top of `updateWIChange`.
- [x] Replace the `content` copy (lines 154-160) with a call to `maybeTriggerEditorRefreshForField(...)`.
- [x] Replace the `comment` copy (lines 163-168) with a call to `maybeTriggerEditorRefreshForField(...)`.
- [x] Replace the `key` copy (lines 173-178) with a call to `maybeTriggerEditorRefreshForField(...)` (with `expectedValue` pre-joined into a string).
- [x] Replace the default copy (lines 199-204) with a call to `maybeTriggerEditorRefreshForField(...)`.

---

### [2] DRY-02 - Magic value

**What:** The value `'[STWID]'` appears 2 times. It represents the logging prefix for this extension and should be a named constant.

**Where:**
- `src/shared/wi-update-handler.js`, line 50
- `src/shared/wi-update-handler.js`, line 64

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const LOG_PREFIX = '[STWID]';`
- [x] Replace each occurrence of the raw literal with `LOG_PREFIX`.

---

### [3] DRY-02 - Magic value

**What:** The value `'.stwid--editor'` appears 4 times. It represents the root selector for this extension's editor panel and should be a named constant.

**Where:**
- `src/shared/wi-update-handler.js`, line 155
- `src/shared/wi-update-handler.js`, line 164
- `src/shared/wi-update-handler.js`, line 174
- `src/shared/wi-update-handler.js`, line 200

**Steps to fix:**
- [x] At the top of the file (after imports), add: `const EDITOR_ROOT_SELECTOR = '.stwid--editor';`
- [x] Replace each occurrence of the raw literal with `EDITOR_ROOT_SELECTOR` (for example: ``document.querySelector(`${EDITOR_ROOT_SELECTOR} [name="comment"]`)``).

---

### [4] NAME-01 - Shape-based name

**What:** `a` (line 130) describes its shape (an arbitrary "thing") rather than its purpose. Reading the name alone does not tell you what it holds or does.

**Where:** `src/shared/wi-update-handler.js`, line 130

**Steps to fix:**
- [x] Rename `a` to `entryToInsert` everywhere it appears in this file.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [5] NAME-01 - Shape-based name

**What:** `e` (line 113, line 128, line 138) describes its shape (a short, generic identifier) rather than its purpose. In these loops it holds an entry UID, but the name does not communicate that.

**Where:**
- `src/shared/wi-update-handler.js`, line 113
- `src/shared/wi-update-handler.js`, line 128
- `src/shared/wi-update-handler.js`, line 138

**Steps to fix:**
- [x] Rename `e` to `entryUid` everywhere it appears in this file.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [6] NAME-01 - Shape-based name

**What:** `o` (line 138) describes its shape (an "object") rather than its purpose. In this loop it holds the currently cached entry data, but the name does not communicate that.

**Where:** `src/shared/wi-update-handler.js`, line 138

**Steps to fix:**
- [x] Rename `o` to `cachedEntry` everywhere it appears in this file.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [7] NAME-01 - Shape-based name

**What:** `n` (line 139) describes its shape (a generic "new" value) rather than its purpose. In this loop it holds the updated entry data, but the name does not communicate that.

**Where:** `src/shared/wi-update-handler.js`, line 139

**Steps to fix:**
- [x] Rename `n` to `updatedEntry` everywhere it appears in this file.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [8] NAME-01 - Shape-based name

**What:** `inp` (line 155) describes its shape (an input element) rather than its purpose. In this file it is always a field inside the World Info Drawer editor, but the name does not capture that.

**Where:**
- `src/shared/wi-update-handler.js`, line 155
- `src/shared/wi-update-handler.js`, line 164
- `src/shared/wi-update-handler.js`, line 174
- `src/shared/wi-update-handler.js`, line 200

**Steps to fix:**
- [x] Rename each `inp` variable to `editorFieldInput` everywhere it appears in this file.
- [x] If it is exported or referenced in other files, search for it project-wide before renaming.

---

### [9] SIZE-01 - Large function

**What:** `initWIUpdateHandler` is 328 lines long (lines 18-345). It is doing too much: it builds the handler API and also defines multiple worker/helper functions and also wires up event listeners and also manages internal async state.

**Where:** `src/shared/wi-update-handler.js`, lines 18-345

**Steps to fix:**
- [x] Extract the "World Info event wiring" (lines 319-330) into a new function named `registerWorldInfoListeners({ eventBus, eventTypes, onWorldInfoUpdated, onWorldInfoSettingsUpdated })`. It should attach the listeners and return a cleanup function.
- [x] Extract the "editor duplicate refresh worker" logic (lines 275-299) into a new function named `createEditorDuplicateRefreshWorker({ getCurrentEditor, refreshList, reopenEditorEntry, waitForWorldInfoUpdateWithTimeout })`. It should return `{ queueEditorDuplicateRefresh }`.
- [x] Extract the "wait for update" helpers (lines 237-265) into a new function named `createWorldInfoUpdateWaiter({ delay, createDeferred })`. It should return `{ waitForWorldInfoUpdate, waitForWorldInfoUpdateWithTimeout }`.
- [x] Replace the extracted blocks in `initWIUpdateHandler` with calls to the new functions.

---

### [10] SIZE-01 - Large function

**What:** `updateWIChange` is 170 lines long (lines 63-232). It is doing too much: it reconciles the cache of books and also loads and renders missing books and also syncs entry add/remove and also applies per-field DOM updates and also refreshes the editor state.

**Where:** `src/shared/wi-update-handler.js`, lines 63-232

**Steps to fix:**
- [x] Extract the "remove books no longer in `world_names`" block (lines 86-92) into a new function named `removeStaleCachedBooks({ cache, worldNames })`. It should remove DOM nodes and delete cache entries.
- [x] Extract the "load and render missing books" block (lines 94-101) into a new function named `renderMissingBooks({ cache, worldNames, loadWorldInfo, listPanelApi })`. It should ensure every `worldName` is present in `cache`.
- [x] Extract the "sync entries (remove missing, add new, update existing)" block (lines 113-225) into a new function named `syncBookEntriesAndDom({ bookName, cache, data, listPanelApi, editorPanelApi, getCurrentEditor, setCurrentEditor })`.
- [x] Replace the extracted blocks in `updateWIChange` with calls to the new functions.

---

### [11] NEST-01 - Deep nesting

**What:** Inside `updateWIChange`, the block starting at line 138 reaches 6 levels of indentation. The innermost logic is hard to follow because the reader must hold many nested conditions in memory simultaneously.

**Where:** `src/shared/wi-update-handler.js`, lines 138-208 (deepest points include line 156 and line 201)

**Steps to fix:**
- [x] Extract the inner block that handles per-field differences (lines 147-208) into a new function named `applyEntryFieldDiff({ bookName, entryUid, oldEntry, updatedEntry, editorPanelApi, triggerEditorRefreshOnce })`. One sentence on what it does: it compares one entry's old/new field values, updates the entry row DOM, and decides whether the editor needs to refresh.
- [x] Replace the inner block with a call to `applyEntryFieldDiff(...)`.
- [x] Consider reducing nesting further by using early `continue` statements inside `applyEntryFieldDiff` (for example, skip work when `oldValue` equals `newValue`).

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/shared/wi-update-handler.js`
- Added named helper functions for editor refresh checks, cache/book syncing, entry field diff handling, update waiting, duplicate refresh queueing, and listener registration.
- Replaced short local names with purpose-based names like `entryUid`, `cachedEntry`, `updatedEntry`, and `entryToInsert`.
- Replaced repeated raw literals with `LOG_PREFIX` and `EDITOR_ROOT_SELECTOR` constants.

### Risks / What might break

- If any helper extraction changed the order of a side effect, book rows or entry rows could refresh at a slightly different moment than before.
- The editor reopen logic now runs through helper functions, so any missed edge case there could leave the editor open on stale data after an update.
- Future edits that bypass the new helpers could accidentally reintroduce duplicate logic and split the behavior again.

### Manual checks

- Open a lorebook, edit an entry in core World Info, then reload the drawer view. Success looks like the matching row text and strategy toggle updating without duplicate rows.
- Keep one entry open in the drawer editor, then change that same entry externally. Success looks like the editor refreshing only when its visible field value is out of date.
- Duplicate or add an entry, then refresh the list. Success looks like the new entry appearing in the correct sorted position and the editor reopening on the expected entry when applicable.

---
