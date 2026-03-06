# REWORK: Extract Extension Integrations Into Own Module
*Created: March 5, 2026*

**Type:** Rework
**Status:** IMPLEMENTED

---

## Summary

All the code that controls how this extension interacts with other installed extensions
(Bulk Edit, External Editor, and STLO) is currently buried inside the Book Menu module.
This task extracts that code into its own dedicated file so it has a clear, single home
and is easier to find, update, or extend in the future.

As part of this move, the STLO menu item will also be made conditional — meaning it will
only appear in the book menu when STLO is actually installed, consistent with how Bulk Edit
and External Editor are already handled.

---

## Current Behavior

When the user opens the three-dot menu on a lorebook, the extension adds menu items for
other extensions it knows about:

- **Bulk Edit** — only shown when `SillyTavern-WorldInfoBulkEdit` is installed.
- **External Editor** — only shown when `SillyTavern-WorldInfoExternalEditor` is installed.
- **Configure STLO** — **always shown**, even when STLO is not installed. Clicking it runs
  the `/stlo` slash command; if STLO is absent, it shows an error toast.

This logic lives in two functions inside
`src/book-browser/book-list/book-list.book-menu.js`:

- `createBulkEditMenuItem` (lines 522–532): builds the Bulk Edit menu item.
- `appendIntegrationMenuItems` (lines 646–699): the top-level function that checks for
  each extension and appends the appropriate menu items.

---

## Expected Behavior

After this task:

- The two integration functions (`createBulkEditMenuItem` and `appendIntegrationMenuItems`)
  are moved out of `book-list.book-menu.js` and into a new file:
  `src/book-browser/book-list/book-list.extension-integrations.js`.
- The book menu module imports and calls the integration code from the new file.
- **The STLO menu item is now conditional**: it only appears in the book menu when STLO
  is detected as an installed extension (using the same `extensionNames` check as Bulk Edit
  and External Editor). If STLO is not installed, the item is simply not added to the menu.
- All other menu behavior is unchanged.

---

## Agreed Scope

**Files changed:**

- `src/book-browser/book-list/book-list.book-menu.js` — remove the two integration
  functions; import and call them from the new module instead.
- `src/book-browser/book-list/book-list.extension-integrations.js` — **new file**
  containing the extracted integration logic.
- `ARCHITECTURE.md` — add the new file to the module list and responsibilities table.
- `FEATURE_MAP.md` — update the "Optional plugin and extension integrations" entry to
  include the new file.

**Not changed:**

- Bulk Edit and External Editor integration behavior (already conditional — no change).
- The STLO slash command string (`/stlo`) or any STLO attributes.
- Any other book menu items.

---

## Implementation Plan

### Step 0 — Verify the STLO extension registry name

Before writing any code, confirm the exact string that STLO registers under in
`extensionNames`. Look it up by either:

a. Checking the `manifest.json` inside the STLO extension folder (the `"name"` field
   gives the folder name; the full registry key is `"third-party/<folder-name>"`).
b. Temporarily adding a `console.log(extensionNames)` log while STLO is installed and
   checking the browser console.

Use this confirmed string in the STLO presence check in Step 2.

- [x] Confirmed from `../SillyTavern-LorebookOrdering/manifest.json`: the folder name is `SillyTavern-LorebookOrdering`, so the `extensionNames` registry key is `third-party/SillyTavern-LorebookOrdering`.

---

### Step 1 — Create `book-list.extension-integrations.js`

Create the new file at:
`src/book-browser/book-list/book-list.extension-integrations.js`

Export a single factory function named `createExtensionIntegrationsSlice` that accepts
a single parameter object with these fields:

```js
export const createExtensionIntegrationsSlice = ({
    extensionNames,
    getRequestHeaders,
    executeSlashCommand,
    setSelectedBookInCoreUi,
    clickCoreUiAction,
    createBookMenuActionItem,
}) => { ... };
```

Inside the factory, move in the two functions from `book-list.book-menu.js`:

1. `createBulkEditMenuItem` — copy it in unchanged; it stays a private internal function
   (not exported), because it is only used inside this file.
2. `appendIntegrationMenuItems` — copy it in and update it:
   - Replace all references to `state.extensionNames` with `extensionNames`.
   - Replace all references to `state.getRequestHeaders()` with `getRequestHeaders()`.
   - Replace all references to `state.executeSlashCommand(...)` with `executeSlashCommand(...)`.
   - Add a presence check for STLO using the confirmed registry name from Step 0, so the
     STLO block mirrors the Bulk Edit and External Editor checks.

Return an object containing `appendIntegrationMenuItems`:

```js
return { appendIntegrationMenuItems };
```

- [x] Created `src/book-browser/book-list/book-list.extension-integrations.js` with `createExtensionIntegrationsSlice`, moved the Bulk Edit and integration menu builders into it, and made the STLO menu item conditional on `third-party/SillyTavern-LorebookOrdering`.

---

### Step 2 — Update `book-list.book-menu.js`

1. Delete `createBulkEditMenuItem` (lines 522–532) from this file entirely.
2. Delete `appendIntegrationMenuItems` (lines 646–699) from this file entirely.
3. At the top of the file, import `createExtensionIntegrationsSlice`:

```js
import { createExtensionIntegrationsSlice } from './book-list.extension-integrations.js';
```

4. Inside `createBookMenuSlice`, before `buildBookMenuTrigger` is defined, instantiate the
   integration slice by passing the fields it needs from the local closure:

```js
const { appendIntegrationMenuItems } = createExtensionIntegrationsSlice({
    extensionNames: state.extensionNames,
    getRequestHeaders: state.getRequestHeaders,
    executeSlashCommand: state.executeSlashCommand,
    setSelectedBookInCoreUi,
    clickCoreUiAction,
    createBookMenuActionItem,
});
```

5. The call to `appendIntegrationMenuItems(menu, name, closeMenu)` inside
   `buildBookMenuTrigger` is unchanged.

- [x] Removed the local integration helpers from `src/book-browser/book-list/book-list.book-menu.js`, imported the new slice, and instantiated it inside `createBookMenuSlice`.

---

### Step 3 — Update `ARCHITECTURE.md`

1. Add `book-list.extension-integrations.js` to the project structure tree under
   `book-list/`, after `book-list.book-menu.js`.
2. Add a row to the Module Responsibilities table:

| `src/book-browser/book-list/book-list.extension-integrations.js` | Third-party extension integration menu items (Bulk Edit, External Editor, STLO): presence checks and menu item builders |

- [x] Added `book-list.extension-integrations.js` to the structure tree and module responsibilities table in `ARCHITECTURE.md`.

---

### Step 4 — Update `FEATURE_MAP.md`

Find the line:

```
- Optional plugin and extension integrations (Bulk Edit, External Editor, STLO) → src/book-browser/book-list/book-list.book-menu.js, src/drawer.js
```

Replace it with:

```
- Optional plugin and extension integrations (Bulk Edit, External Editor, STLO) → src/book-browser/book-list/book-list.extension-integrations.js
- Integration menu items wired into book menu → src/book-browser/book-list/book-list.book-menu.js
```

(`src/drawer.js` can be dropped from this line — it only passes dependencies, it does not
own any integration behavior.)

- [x] Updated `FEATURE_MAP.md` so the integration behavior points to `book-list.extension-integrations.js`, with a separate line noting that the book menu still wires those items into the dropdown.

---

## After Implementation
*Implemented: March 6, 2026*

### What changed

`src/book-browser/book-list/book-list.extension-integrations.js`

- Added a new file that owns the menu items for Bulk Edit, External Editor, and STLO.
- Kept the existing Bulk Edit and External Editor behavior the same.
- Changed STLO so its menu item is only added when the STLO extension is actually installed.

`src/book-browser/book-list/book-list.book-menu.js`

- Removed the integration-specific helper functions from the book menu file.
- Imported the new integration module and asked it to append those menu items.
- Kept the rest of the book menu behavior in the same file.

`ARCHITECTURE.md`

- Added the new integration file to the structure list.
- Added a responsibility row so the file has a clear owner description.

`FEATURE_MAP.md`

- Moved the integration ownership entry to the new file.
- Added a separate line to show that the book menu still wires those items into the dropdown.

### Risks / What might break

- This touches the lorebook menu, so the Bulk Edit, External Editor, or STLO items could disappear if one of the injected dependencies was wired incorrectly.
- The STLO item now depends on the exact installed extension name, so it will stay hidden if that extension reports a different registry key than expected.
- The new file still uses the same network request and slash command paths, so any pre-existing problem in those external integrations would still behave the same when clicked.

### Manual checks

- Reload the browser tab, open a lorebook menu with STLO installed, and confirm "Configure STLO" appears. Success looks like the item being visible only when the extension is present.
- Temporarily disable or remove STLO, reload, and open the same menu again. Success looks like the STLO item being absent instead of showing an error after a click.
- If you use Bulk Edit or External Editor, open a lorebook menu with those extensions installed and click each item once. Success looks like the same behavior you had before this change.
