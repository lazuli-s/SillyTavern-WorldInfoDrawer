# REFACTORING: Split book-folders.lorebook-folders.js into three focused files
*Created: March 4, 2026*

**Type:** Refactoring
**Status:** IMPLEMENTED

---

## Summary

`book-folders.lorebook-folders.js` is 720 lines long and mixes three unrelated jobs:
pure data helpers, action logic, and DOM construction. This makes it hard to read.
This task splits it into three shorter, focused files — one per job — without changing
any behavior the user sees.

## Current Behavior

The file currently does everything related to folders in one place:
- Reads and writes folder names stored in lorebook metadata
- Manages the saved list of folder names in browser storage
- Creates a new book inside a folder
- Handles the rename, import, export, delete, and Entry Manager menu actions
- Builds the entire folder card in the UI (DOM), including the header, count badge,
  active checkbox, collapse toggle, and dropdown menu

## Expected Behavior

After this change, the same behavior continues to work identically for the user.
Internally, the code is reorganized into three files:

- **`book-folders.lorebook-folders.js`** — kept, but trimmed to only data/registry
  helpers (no DOM, no actions). Roughly 150 lines.
- **`book-folders.folder-actions.js`** — new file. Contains all action logic:
  creating a book inside a folder, toggling all books active/inactive, and the five
  menu item actions (rename, import, export, Entry Manager, delete). Roughly 235 lines.
- **`book-folders.folder-dom.js`** — new file. Contains DOM helpers and
  `createFolderDom`, the function that builds the folder card. Roughly 290 lines.

## Agreed Scope

Files that change:

- `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js` — trimmed (data helpers only)
- `src/book-browser/book-list/book-folders/book-folders.folder-actions.js` — **created**
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js` — **created**

Callers that need their import paths updated:

- `src/book-browser/book-browser.js`
- `src/book-browser/book-browser.state.js`
- `src/book-browser/book-list/book-folders/book-folders.folders-view.js`

Documentation that must be updated:

- `ARCHITECTURE.md` — module table
- `FEATURE_MAP.md` — folder behavior entries

`src/drawer.js` imports only `registerFolderName`, which stays in `lorebook-folders.js`
— no change needed there.

## Out of Scope

- No changes to `createFolderDom`'s public API or its `menuActions` parameter shape.
- No changes to `book-folders.folders-view.js` beyond updating its import paths.
- No new unit tests (separate task if desired).
- No changes to any behavior visible to the user.

---

## Implementation Plan

Plan review against JS best practices and WI API rules: no corrections required.

### Step 1 — Create `book-folders.folder-actions.js`
- [x] Completed

Create the new file at:
`src/book-browser/book-list/book-folders/book-folders.folder-actions.js`

**1a. Add imports from `lorebook-folders.js`:**

```js
import {
    validateFolderName,
    getFolderBookNames,
    registerFolderName,
    removeFolderName,
    summarizeBookNames,
    setFolderInMetadata,
} from './book-folders.lorebook-folders.js';
```

**1b. Add internal helpers (move from `lorebook-folders.js`, do NOT export):**

Move `hasFolderImportPayload` (currently lines 212–215) and
`getFolderImportBookNames` (currently lines 217–220).
These are only ever used by the import action, so they become private helpers here.

**1c. Move `setFolderBooksActive` from `lorebook-folders.js`** (currently lines 142–151).

**1d. Move `createBookInFolder` from `lorebook-folders.js`** (currently lines 153–183).

**1e. Extract `renameFolderAction` from inside `createFolderDom`**

Currently the rename handler is an anonymous `async` function inside the
`rename.addEventListener('click', ...)` call (approximately lines 358–400).
Extract its body (the logic after the two menu-close lines) into a named function:

```js
const renameFolderAction = async ({ folderName, menuActions }) => {
    // ... rename logic from the inline handler, minus the blocker/anchor cleanup lines
};
```

The two menu-close lines (`blocker.remove()` and `menuTrigger.style.anchorName = ''`)
will stay in the event handler inside `createFolderDom` and run before calling this function.

**1f. Extract `importFolderAction` from inside `createFolderDom`**

Currently the import handler is an anonymous `async` function inside
`imp.addEventListener('click', ...)` (approximately lines 416–509).
Same pattern: extract the body after the menu-close lines into:

```js
const importFolderAction = async ({ folderName, menuActions }) => {
    // ... import logic
};
```

`hasFolderImportPayload` and `getFolderImportBookNames` (moved in 1b) are used here.

**1g. Extract `exportFolderAction` from inside `createFolderDom`**

Currently the export handler is inside `exp.addEventListener('click', ...)` (approximately lines 526–547):

```js
const exportFolderAction = ({ folderName, menuActions }) => {
    // ... export logic (sync, no await needed)
};
```

**1h. Extract `orderHelperFolderAction` from inside `createFolderDom`**

Currently the order-helper handler is inside `orderHelper.addEventListener('click', ...)` (approximately lines 552–562):

```js
const orderHelperFolderAction = ({ folderName, menuActions }) => {
    // ... order helper logic (sync)
};
```

**1i. Extract `deleteFolderAction` from inside `createFolderDom`**

Currently the delete handler is inside `del.addEventListener('click', ...)` (approximately lines 578–622):

```js
const deleteFolderAction = async ({ folderName, menuActions }) => {
    // ... delete logic
};
```

**1j. Export all public functions:**

```js
export {
    setFolderBooksActive,
    createBookInFolder,
    renameFolderAction,
    importFolderAction,
    exportFolderAction,
    orderHelperFolderAction,
    deleteFolderAction,
};
```

---

### Step 2 — Create `book-folders.folder-dom.js`
- [x] Completed

Create the new file at:
`src/book-browser/book-list/book-folders/book-folders.folder-dom.js`

**2a. Add imports from `lorebook-folders.js`:**

```js
import {
    getVisibleFolderBookNames,
    getFolderActiveState,
    getFolderBookNames,
} from './book-folders.lorebook-folders.js';
```

**2b. Add imports from `folder-actions.js`:**

```js
import {
    renameFolderAction,
    importFolderAction,
    exportFolderAction,
    orderHelperFolderAction,
    deleteFolderAction,
} from './book-folders.folder-actions.js';
```

**2c. Move `updateFolderCount` from `lorebook-folders.js`** (currently lines 195–198).

**2d. Move `setFolderCollapsed` from `lorebook-folders.js`** (currently lines 200–210).

**2e. Move `createFolderDom` from `lorebook-folders.js`** (currently lines 222–706).

In the five menu item event handlers, replace the inline action logic with calls
to the extracted functions. The two menu-close lines stay as-is before each call.

The rename handler becomes:
```js
rename.addEventListener('click', async () => {
    blocker.remove();
    menuTrigger.style.anchorName = '';
    await renameFolderAction({ folderName, menuActions });
});
```

The import handler becomes:
```js
imp.addEventListener('click', async () => {
    blocker.remove();
    menuTrigger.style.anchorName = '';
    await importFolderAction({ folderName, menuActions });
});
```

The export handler becomes:
```js
exp.addEventListener('click', () => {
    blocker.remove();
    menuTrigger.style.anchorName = '';
    exportFolderAction({ folderName, menuActions });
});
```

The order-helper handler becomes:
```js
orderHelper.addEventListener('click', () => {
    blocker.remove();
    menuTrigger.style.anchorName = '';
    orderHelperFolderAction({ folderName, menuActions });
});
```

The delete handler becomes:
```js
del.addEventListener('click', async () => {
    blocker.remove();
    menuTrigger.style.anchorName = '';
    await deleteFolderAction({ folderName, menuActions });
});
```

**2f. Export:**

```js
export {
    createFolderDom,
    setFolderCollapsed,
    updateFolderCount,
};
```

---

### Step 3 — Trim `lorebook-folders.js`
- [x] Completed

Remove from the file:
- `setFolderBooksActive` (moved to `folder-actions.js`)
- `createBookInFolder` (moved to `folder-actions.js`)
- `hasFolderImportPayload` (moved to `folder-actions.js`)
- `getFolderImportBookNames` (moved to `folder-actions.js`)
- `updateFolderCount` (moved to `folder-dom.js`)
- `setFolderCollapsed` (moved to `folder-dom.js`)
- `createFolderDom` (moved to `folder-dom.js`)

Add exports for functions that `folder-actions.js` and `folder-dom.js` need
but that were previously only used internally within this file:
`validateFolderName`, `removeFolderName`, `getFolderBookNames`,
`getVisibleFolderBookNames`, `summarizeBookNames`, `getFolderActiveState`

Update the `export` block at the bottom to:

```js
export {
    getFolderFromMetadata,
    getFolderRegistry,
    registerFolderName,
    removeFolderName,
    setFolderInMetadata,
    sanitizeFolderMetadata,
    validateFolderName,
    getFolderBookNames,
    getVisibleFolderBookNames,
    summarizeBookNames,
    getFolderActiveState,
};
```

---

### Step 4 — Update caller import paths
- [x] Completed

**4a. `src/book-browser/book-browser.js`**

Current import from `lorebook-folders.js`:
```js
import {
    createBookInFolder,
    getFolderFromMetadata,
    getFolderRegistry,
    registerFolderName,
    setFolderBooksActive,
    sanitizeFolderMetadata,
    setFolderInMetadata,
} from './book-list/book-folders/book-folders.lorebook-folders.js';
```

Split into two imports:
```js
import {
    getFolderFromMetadata,
    getFolderRegistry,
    registerFolderName,
    sanitizeFolderMetadata,
    setFolderInMetadata,
} from './book-list/book-folders/book-folders.lorebook-folders.js';
import {
    createBookInFolder,
    setFolderBooksActive,
} from './book-list/book-folders/book-folders.folder-actions.js';
```

**4b. `src/book-browser/book-browser.state.js`**

Change:
```js
import { setFolderCollapsed } from './book-list/book-folders/book-folders.lorebook-folders.js';
```
To:
```js
import { setFolderCollapsed } from './book-list/book-folders/book-folders.folder-dom.js';
```

**4c. `src/book-browser/book-list/book-folders/book-folders.folders-view.js`**

Change:
```js
import { createFolderDom, getFolderFromMetadata, setFolderCollapsed } from './book-folders.lorebook-folders.js';
```
To:
```js
import { getFolderFromMetadata } from './book-folders.lorebook-folders.js';
import { createFolderDom, setFolderCollapsed } from './book-folders.folder-dom.js';
```

---

### Step 5 — Update `ARCHITECTURE.md`
- [x] Completed

In the project structure tree (section 1) and the module responsibility table, replace the
single `book-folders.lorebook-folders.js` entry with three entries:

| Module | Design Intent |
|---|---|
| `book-folders.lorebook-folders.js` | Folder metadata, registry helpers, and book-name/active-state utilities (pure data — no DOM) |
| `book-folders.folder-actions.js` | Standalone folder action functions: create book in folder, set books active/inactive, and the five folder menu item actions (rename, import, export, Entry Manager, delete) |
| `book-folders.folder-dom.js` | Folder DOM construction (`createFolderDom`), count update, and collapse-state DOM helper |

---

### Step 6 — Update `FEATURE_MAP.md`
- [x] Completed

In the **Folder behavior** section, update the source file references for:

- "Folder DOM creation" → `book-folders.folder-dom.js`
- "Folder context menu actions (rename, import into folder, export folder, delete folder)" → `book-folders.folder-actions.js`
- "Create new book directly inside a folder" → `book-folders.folder-actions.js`
- "Set active/inactive state for all books in a folder" → `book-folders.folder-actions.js`
- "Folder metadata key handling" and "Folder registry persistence" → `book-folders.lorebook-folders.js` (unchanged)

---

## After Implementation
*Implemented: March 5, 2026*

### What changed

- `src/book-browser/book-list/book-folders/book-folders.folder-actions.js`
  - Added a new focused module for folder actions (create, activate/deactivate, rename, import, export, Entry Manager, delete).
  - Moved menu action logic out of the DOM builder so behavior code is separate from UI structure.
- `src/book-browser/book-list/book-folders/book-folders.folder-dom.js`
  - Added a new focused module for folder DOM construction and folder DOM helpers.
  - Kept the same folder card API and event wiring, but action handlers now call imported action functions.
- `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js`
  - Trimmed to metadata/registry/data helper functions only.
  - Exported shared helper functions now used by the new action/DOM modules.
- `src/book-browser/book-browser.js`
  - Updated imports to read action functions from `book-folders.folder-actions.js`.
- `src/book-browser/book-browser.state.js`
  - Updated import of `setFolderCollapsed` to come from `book-folders.folder-dom.js`.
- `src/book-browser/book-list/book-folders/book-folders.folders-view.js`
  - Updated imports so DOM helpers come from `book-folders.folder-dom.js` and metadata helper stays in `book-folders.lorebook-folders.js`.
- `ARCHITECTURE.md`
  - Updated project structure and module responsibilities to list the new three-file split.
- `FEATURE_MAP.md`
  - Updated folder behavior ownership entries to point to the new DOM/actions modules.

### Risks / What might break

- This touches all folder menu actions, so folder rename/import/export/delete might fail if any moved callback was wired incorrectly.
- This touches folder DOM construction and collapse helpers, so folder collapse/expand visuals might not update correctly.
- This touches active-toggle behavior split across modules, so folder-level active toggles might not reflect visible book state in some filter states.

### Manual checks

- Open the drawer and verify folder cards still render with icon, name, count, active checkbox, menu button, and collapse toggle.
  Success: all elements appear and counts update when books are added/removed.
- Use each folder menu action once: Rename, Import Into Folder, Export Folder, Entry Manager (Folder), Delete Folder.
  Success: each action opens/runs and produces the same user-visible result as before.
- Toggle folder collapse and “Collapse/Expand All Folders”.
  Success: folder rows collapse/expand correctly and state persists after reload.
- Toggle folder active checkbox with visibility/search filters on and off.
  Success: checkbox state changes correctly (`on/off/partial`) and applies to visible books only.
