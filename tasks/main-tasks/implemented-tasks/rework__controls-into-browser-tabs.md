# REWORK: Controls Into Browser Tabs
*Created: March 4, 2026*

**Type:** Rework
**Status:** IMPLEMENTED

---

## Summary

The book browser's control buttons (Lorebooks, Folders, Settings) currently live in a
horizontal row (`stwid--controlsRow`) above the tab bar. This rework moves them into
two dedicated new tabs that are always visible regardless of screen size. The Lorebooks
and Settings containers go into the first tab; the Folders container goes into the second.
Each new tab gets its own JS file inside `src/book-browser/browser-tabs/`.

On mobile today, the whole controls row is moved into a special "Controls" icon tab.
After this rework, that mobile-only logic is removed — the two new tabs replace it
on all screen sizes.

---

## Current Behavior

- The book browser shows a row of labeled button groups above the icon tab bar:
  **Lorebooks** (New Book, Import Book, Collapse All), **Folders** (New Folder, Import Folder,
  Collapse All Folders), **Settings** (Activation Settings, Refresh).
- The Entry Manager toggle button sits in the Visibility tab (moved there by
  `browser-tabs.filter-bar.js`'s `helperContainer` inside the Visibility row).
- On mobile screens (≤ 1000 px), the entire controls row is hidden from its original
  position and re-mounted inside a prepended "Controls" icon tab that becomes the default.

## Expected Behavior

- The controls row is gone. Its contents live permanently in the icon tab bar as two new tabs:
  1. **Lorebooks tab** (icon: `fa-book`, label: `Lorebooks`) — first tab, always default:
     contains Lorebooks thinContainer, Settings thinContainer, and the Entry Manager toggle
     (in a Helper thinContainer — the same container that currently hosts it in the Visibility tab).
  2. **Folders tab** (icon: `fa-folder`, label: `Folders`) — second tab: contains the
     Folders thinContainer.
- The remaining tabs keep their current order: Visibility (3rd), Sorting (4th), Search (5th).
- On mobile, the behavior is identical to desktop — no special Controls tab appears.
- The Entry Manager toggle no longer appears in the Visibility tab's Helper container.

---

## Agreed Scope

| File | Change type |
|---|---|
| `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js` | **New** — Lorebooks+Settings+Helper tab content factory |
| `src/book-browser/browser-tabs/browser-tabs.folders-tab.js` | **New** — Folders tab content factory |
| `src/drawer.js` | Modified — remove controls row DOM; call new factories; store results in `dom` |
| `src/book-browser/browser-tabs/browser-tabs.filter-bar.js` | Modified — add two new tabs; remove Controls mobile logic; remove helperContainer from Visibility row |
| `ARCHITECTURE.md` | Modified — add two new files to tree and module table |
| `FEATURE_MAP.md` | Modified — update "Top control row" entry |

---

## Out of Scope

- CSS changes beyond what is strictly needed to make the reworked tabs function correctly.
  The existing `stwid--controls`, `stwid--controlsRow`, `stwid--thinContainer`, etc. classes
  are not renamed or restructured.
- Changing any button behavior, label, or icon except what is listed above.
- Changing the Sorting tab and its two containers (`Global Sorting`, `Per-book Sorting`).

---

## Implementation Plan

### [x] Step 1 — Create `browser-tabs.lorebooks-tab.js`

Create `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js`.

Export a single function:

```js
export const createLorebooksTabContent = ({
    dom,
    cache,
    getFreeWorldName,
    createNewWorldInfo,
    Popup,
    wiHandlerApi,
    openOrderHelper,
    getListPanelApi,   // lazy getter: () => listPanelApi
    getEditorPanelApi, // lazy getter: () => editorPanelApi
    getCurrentEditor,
}) => { /* returns HTMLElement */ };
```

Inside the function, build and return a wrapper `<div>` containing three `stwid--thinContainer`
divs in this order:

**A — Helper thinContainer** (`stwid--thinContainer stwid--visibilityHelper`)
- Label span (`stwid--thinContainerLabel`): text `'Helper'`, with hint icon
  (`fa-circle-question`, title: `'Open Entry Manager for the books currently shown by Visibility filters.'`)
- Entry Manager toggle `<div>`:
  - Assign to `dom.order.toggle`
  - Classes: `menu_button fa-solid fa-fw fa-arrow-down-wide-short`
  - `title`: `'Open Entry Manager (Book Visibility scope)'`
  - `aria-label`: `'Open Entry Manager for current Book Visibility scope'`
  - Click handler — mirror the existing handler in `drawer.js` lines 402–431:
    reads `getEditorPanelApi()`, `getCurrentEditor()`, checks dirty state, calls
    `openOrderHelper(null, getListPanelApi()?.getBookVisibilityScope?.())`

**B — Lorebooks thinContainer** (`stwid--thinContainer`)
- Label span (`stwid--thinContainerLabel`): text `'Lorebooks'`, with hint icon
  (`fa-circle-question`, title: `'Create, import, or collapse lorebooks'`)
- Add Book button — mirror `drawer.js` lines 266–296:
  clones `#world_create_button`, removes its id and inner `<span>`, sets title/aria-label
  `'Create New Book'`, adds class `stwid--addBook`, click handler uses `getFreeWorldName`,
  `createNewWorldInfo`, `wiHandlerApi`, and `getListPanelApi()`.
- Import Book button — mirror `drawer.js` lines 318–327:
  `<div>` with classes `menu_button fa-solid fa-fw fa-file-import`, title `'Import Book'`,
  clicks `#world_import_file`.
- Collapse All Books button:
  - Assign to `dom.collapseAllToggle`
  - `<button>` with classes `menu_button stwid--collapseAllToggle`
  - Contains `<i class="fa-solid fa-fw">` (icon updated by `updateCollapseAllToggle`)
  - Click handler — mirror `drawer.js` lines 419–425:
    `getListPanelApi().hasExpandedBooks()`, loops cache keys,
    calls `getListPanelApi().setBookCollapsed(name, shouldCollapse)`,
    then `getListPanelApi().updateCollapseAllToggle()`

**C — Settings thinContainer** (`stwid--thinContainer`)
- Label span (`stwid--thinContainerLabel`): text `'Settings'`, with hint icon
  (`fa-circle-question`, title: `'Open activation settings or refresh the list'`)
- Activation Settings button:
  - Assign to `dom.activationToggle`
  - `<div>` with classes `stwid--activation menu_button fa-solid fa-fw fa-cog`
  - `title`: `'Global Activation Settings'`
  - Click handler — mirror `drawer.js` lines 345–360:
    reads dirty state via `getCurrentEditor()` + `getEditorPanelApi()?.isDirty`,
    warns if dirty, otherwise calls `getEditorPanelApi().toggleActivationSettings()`
- Refresh button — mirror `drawer.js` lines 362–371:
  `<div>` with classes `menu_button fa-solid fa-fw fa-arrows-rotate`,
  title `'Refresh'`, click calls `getListPanelApi().refreshList()`

Return the wrapper element.

---

### [x] Step 2 — Create `browser-tabs.folders-tab.js`

Create `src/book-browser/browser-tabs/browser-tabs.folders-tab.js`.

Export a single function:

```js
export const createFoldersTabContent = ({
    dom,
    registerFolderName,
    Popup,
    getListPanelApi, // lazy getter: () => listPanelApi
}) => { /* returns HTMLElement */ };
```

Inside the function, build and return a wrapper `<div>` containing one `stwid--thinContainer`:

**Folders thinContainer** (`stwid--thinContainer`)
- Label span (`stwid--thinContainerLabel`): text `'Folders'`, with hint icon
  (`fa-circle-question`, title: `'Create, import, or collapse folders'`)
- New Folder button — mirror `drawer.js` lines 297–316:
  `<div>` with classes `menu_button fa-solid fa-fw fa-folder-plus`, title `'New Folder'`,
  click handler calls `Popup.show.input(...)`, `registerFolderName(...)`,
  `getListPanelApi().refreshList()`
- Import Folder button — mirror `drawer.js` lines 328–337:
  `<div>` with classes `menu_button fa-solid fa-fw fa-file-import`, title `'Import Folder'`,
  click calls `getListPanelApi()?.openFolderImportDialog?.()`
- Collapse All Folders button:
  - Assign to `dom.collapseAllFoldersToggle`
  - `<button>` with classes `menu_button stwid--collapseAllFoldersToggle`
  - Contains `<i class="fa-solid fa-fw">` (icon updated by `updateCollapseAllFoldersToggle`)
  - Click handler — mirror `drawer.js` lines 437–441:
    calls `getListPanelApi().hasExpandedFolders()`, `setAllFoldersCollapsed(shouldCollapse)`,
    `updateCollapseAllFoldersToggle()`

Return the wrapper element.

---

### [x] Step 3 — Update `drawer.js`

**3a. Add imports** at the top of the file:

```js
import { createLorebooksTabContent } from './book-browser/browser-tabs/browser-tabs.lorebooks-tab.js';
import { createFoldersTabContent } from './book-browser/browser-tabs/browser-tabs.folders-tab.js';
```

**3b. Remove dead `dom` map entries**

In the `dom` object (lines 24–73), remove:
- `visibilityAndSettingsRow: undefined,` — this property was declared but never assigned.
- `controlsRow: undefined,` — no longer needed after controlsPrimary is removed.

**3c. Call the two new factories** just before the `controls` div block (before
`const controls = document.createElement('div')`):

```js
dom.lorebooksTabContent = createLorebooksTabContent({
    dom,
    cache,
    getFreeWorldName,
    createNewWorldInfo,
    Popup,
    wiHandlerApi,
    openOrderHelper,
    getListPanelApi: () => listPanelApi,
    getEditorPanelApi: () => editorPanelApi,
    getCurrentEditor,
});
dom.foldersTabContent = createFoldersTabContent({
    dom,
    registerFolderName,
    Popup,
    getListPanelApi: () => listPanelApi,
});
```

**3d. Gut the `controlsPrimary` section inside the `controls` div block.**

Remove all code between `const controls = document.createElement('div'); {` and
`controls.append(controlsPrimary, controlsSecondary)`:
- The `const controlsPrimary` declaration and class/dom assignment
- The `lorebooksGroup` build (label + hint + all three buttons appended to it)
- The `foldersGroup` build (label + hint + all three buttons appended to it)
- The `settingsGroup` build (label + hint + activation + refresh buttons appended to it)
- The `order` Entry Manager toggle build (including the click handler block)
- The `collapseAllToggle` build
- The `collapseAllFoldersToggle` build

Change the final append line from:
```js
controls.append(controlsPrimary, controlsSecondary);
```
to:
```js
controls.append(controlsSecondary);
```

> At this point `controlsSecondary` (= `dom.sortingRow`) is the only child of `controls`.
> Filter-bar will move it into the Sorting tab as before, leaving `controls` empty in the DOM.
> This is harmless — the empty div causes no layout impact.

---

### [x] Step 4 — Update `browser-tabs.filter-bar.js`

**4a. Remove mobile Controls tab logic.**

Remove these two blocks:
```js
// Remove:
const controlsRowEl = runtime?.dom?.controlsRow instanceof HTMLElement
    ? runtime.dom.controlsRow
    : null;
const isMobile = window.innerWidth <= 1000;
```
Keep `const isMobile` only if it is still used elsewhere in the function; if the only
use was the Controls tab guard, remove it too.

Remove the conditional that prepends the Controls tab:
```js
// Remove:
if (isMobile && controlsRowEl) {
    panelTabs.unshift({ id:'controls', icon:'fa-sliders', label:'Controls' });
}
```

Remove the block that moves `controlsRowEl` into the Controls tab content:
```js
// Remove:
if (isMobile && controlsRowEl) {
    const controlsTabContent = tabContentsById.get('controls');
    if (controlsTabContent) {
        const originalParent = controlsRowEl.parentElement;
        controlsTabContent.append(controlsRowEl);
        if (originalParent) {
            originalParent.style.display = 'none';
        }
    }
}
```

Update the default tab ID line from:
```js
const defaultTabId = (isMobile && controlsRowEl) ? 'controls' : (panelTabs[0]?.id ?? 'visibility');
```
to:
```js
const defaultTabId = panelTabs[0]?.id ?? 'lorebooks';
```

**4b. Add the two new tabs to the `panelTabs` array** (first and second positions):

```js
const panelTabs = [
    { id:'lorebooks', icon:'fa-book', label:'Lorebooks' },
    { id:'folders', icon:'fa-folder', label:'Folders' },
    { id:'visibility', icon:'fa-eye', label:'Visibility' },
    { id:'sorting', icon:'fa-arrow-down-wide-short', label:'Sorting' },
    { id:'search', icon:'fa-magnifying-glass', label:'Search' },
];
```

**4c. Mount the new tab content** in the tab-content loop, right before the existing
`visibilityTabContent` block:

```js
const lorebooksTabContent = tabContentsById.get('lorebooks');
if (lorebooksTabContent && runtime?.dom?.lorebooksTabContent instanceof HTMLElement) {
    lorebooksTabContent.append(runtime.dom.lorebooksTabContent);
}
const foldersTabContent = tabContentsById.get('folders');
if (foldersTabContent && runtime?.dom?.foldersTabContent instanceof HTMLElement) {
    foldersTabContent.append(runtime.dom.foldersTabContent);
}
```

**4d. Remove the `helperContainer` from the Visibility row.**

In the block that builds `visibilityRow`, remove:
- The entire `helperContainer` `<div>` creation (label, hint icon, Entry Manager toggle append)
- The `orderHelperToggle` variable and its `helperContainer.append(orderHelperToggle)` call

Change:
```js
visibilityRow.append(helperContainer, visibilityContainer);
```
to:
```js
visibilityRow.append(visibilityContainer);
```

---

### [x] Step 5 — Update `ARCHITECTURE.md`

**5a. Add the two new files to the file tree** under `browser-tabs/`:

```
|   |   |-- browser-tabs/
|   |   |   |-- browser-tabs.filter-bar.js     # Browser tabs + filters/search/visibility
|   |   |   |-- browser-tabs.lorebooks-tab.js  # Lorebooks+Settings+Helper tab content
|   |   |   └-- browser-tabs.folders-tab.js    # Folders tab content
```

**5b. Add the two new files to the Module Responsibilities table:**

| Module | Design Intent |
|---|---|
| `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js` | Builds the Lorebooks tab content: Helper (Entry Manager toggle), Lorebooks thinContainer, and Settings thinContainer |
| `src/book-browser/browser-tabs/browser-tabs.folders-tab.js` | Builds the Folders tab content: Folders thinContainer (New Folder, Import Folder, Collapse All Folders) |

---

### [x] Step 6 — Update `FEATURE_MAP.md`

In the **Book-level behavior** section, update the "Top control row" entry:

Replace the current description (which mentions `stwid--controlsRow`, the three thin-container
groups, and the mobile Controls tab behavior) with:

> Top control row groups moved into permanent browser tabs:
> Lorebooks (new book, import, collapse-all-books) + Settings (activation + refresh) + Helper (Entry Manager toggle) → **Lorebooks tab** (tab 1, always default); Folders (new folder, import, collapse-all-folders) → **Folders tab** (tab 2). Both tabs are always visible on all screen sizes. Mobile-only Controls tab removed. Tab content factories owned by `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js` and `src/book-browser/browser-tabs/browser-tabs.folders-tab.js`; tab registration and mounting owned by `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`.

In the **Selection & interaction** section, update the icon-tab strip entry:

Remove the sentence about the mobile Controls tab (`On mobile (<= 1000 px), a Controls tab is prepended...`) and replace with a note that the tab order is now: Lorebooks (1st/default), Folders (2nd), Visibility (3rd), Sorting (4th), Search (5th).

---

## After Implementation
*Implemented: March 5, 2026*

### What changed

- `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js`
  - Added a new tab-content factory for the Lorebooks tab.
  - Moved Helper, Lorebooks, and Settings controls into this new module.
  - Reused the same button behavior for creating/importing/collapsing books, opening settings, refreshing, and opening Entry Manager.
- `src/book-browser/browser-tabs/browser-tabs.folders-tab.js`
  - Added a new tab-content factory for the Folders tab.
  - Moved New Folder, Import Folder, and Collapse All Folders controls into this module.
- `src/drawer.js`
  - Imported and called the two new tab-content factories.
  - Removed old controls-row construction from `drawer.js`.
  - Kept Sorting controls wiring in place and left only the sorting row under `.stwid--controls`.
- `src/book-browser/browser-tabs/browser-tabs.filter-bar.js`
  - Added Lorebooks and Folders tabs before existing tabs.
  - Removed mobile-only Controls tab logic.
  - Mounted `dom.lorebooksTabContent` and `dom.foldersTabContent` into their new tabs.
  - Removed Helper container from the Visibility row.
- `ARCHITECTURE.md`
  - Added the two new browser-tab files to the project tree.
  - Added module responsibility rows for both new files and updated filter-bar description.
- `FEATURE_MAP.md`
  - Updated control ownership mapping to the new Lorebooks/Folders tab model.
  - Updated icon-tab order mapping and removed old mobile Controls-tab behavior notes.
  - Updated Visibility-row ownership notes after moving Entry Manager toggle out of Visibility.

### Risks / What might break

- This touches where the Entry Manager toggle is mounted, so it might affect feature-toggle visibility behavior for that button.
- This changes tab mounting order, so it might affect which tab opens first and where controls appear after reload.
- This moves control DOM creation into new files, so it might affect existing button references if any code expected old locations.

### Manual checks

- Open the drawer on desktop and mobile widths and confirm the tab order is: Lorebooks, Folders, Visibility, Sorting, Search.
  Success looks like Lorebooks opens by default and no Controls tab appears.
- In Lorebooks tab, click New Book/Import/Collapse All/Activation/Refresh and verify each action still works like before.
  Success looks like each button performing the same action as pre-rework.
- In Folders tab, click New Folder/Import Folder/Collapse All Folders and verify behavior still works.
  Success looks like folder actions updating the list immediately.
- Open Visibility tab and confirm only visibility filters/chips appear there (no Entry Manager toggle).
  Success looks like Entry Manager toggle only appearing in Lorebooks -> Helper.
- Toggle the Entry Manager feature setting (if available in settings panel).
  Success looks like the Entry Manager toggle showing/hiding correctly in its new location.
