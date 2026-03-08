# REFACTORING: browser-tabs.js
*Created: March 7, 2026*

**File:** `src/book-browser/browser-tabs/browser-tabs.js`
**Findings:** 4 total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | 1 |
| Magic values | DRY-02 | 1 |
| Shape-based naming | NAME-01 | 0 |
| Large functions | SIZE-01 | 2 |
| Deep nesting | NEST-01 | 0 |
| Dead code | DEAD-01 | 0 |
| **Total** | | **4** |

---

## Findings

### [1] DRY-01 — Duplicated code block

**What:** The code that “finds a tab’s content area and appends a runtime-provided DOM element into it (if present)” is repeated three times. Repeating this makes the file harder to maintain because if the rules for appending change, you have to remember to update every copy.

**Where:**
- `src/book-browser/browser-tabs/browser-tabs.js`, lines 131–134 — append `runtimeState.dom.lorebooksTabContent` into the `lorebooks` tab panel
- `src/book-browser/browser-tabs/browser-tabs.js`, lines 135–138 — append `runtimeState.dom.foldersTabContent` into the `folders` tab panel
- `src/book-browser/browser-tabs/browser-tabs.js`, lines 139–142 — append `runtimeState.dom.settingsTabContent` into the `settings` tab panel

**Steps to fix:**
- [x] Extract the shared pattern into a new helper function inside `buildIconTabBar(...)` named `appendRuntimeTabContent(tabContentsById, tabId, runtimeDomNode)`.
- [x] Replace the `lorebooks` copy (lines 131–134) with `appendRuntimeTabContent(tabContentsById, 'lorebooks', runtimeState?.dom?.lorebooksTabContent)`.
- [x] Replace the `folders` copy (lines 135–138) with `appendRuntimeTabContent(tabContentsById, 'folders', runtimeState?.dom?.foldersTabContent)`.
- [x] Replace the `settings` copy (lines 139–142) with `appendRuntimeTabContent(tabContentsById, 'settings', runtimeState?.dom?.settingsTabContent)`.

---

### [2] DRY-02 — Magic value

**What:** The “tab ID” strings (`'settings'`, `'lorebooks'`, `'folders'`, `'visibility'`, `'sorting'`, `'search'`) are repeated as raw text in multiple places. These represent important named concepts (the tab identifiers). Keeping them as raw text increases the chance of typos and makes renaming a tab harder because you have to find-and-replace multiple locations.

**Where (examples):**
- `'settings'`: lines 14, 65, 139, 147
- `'lorebooks'`: lines 14, 66, 131
- `'folders'`: lines 14, 67, 135
- `'visibility'`: lines 14, 68
- `'sorting'`: lines 14, 69
- `'search'`: lines 14, 70

**Steps to fix:**
- [x] At the top of the file (after imports), add a shared constant map such as:
  - `const TAB_IDS = Object.freeze({ SETTINGS: 'settings', LOREBOOKS: 'lorebooks', FOLDERS: 'folders', VISIBILITY: 'visibility', SORTING: 'sorting', SEARCH: 'search' });`
- [x] Update `KNOWN_TAB_IDS` (line 14) to use `Object.values(TAB_IDS)` so it stays in sync automatically.
- [x] Replace each raw string usage with the constant (e.g. `'settings'` → `TAB_IDS.SETTINGS`, `'lorebooks'` → `TAB_IDS.LOREBOOKS`, etc.).

---

### [3] SIZE-01 — Large function

**What:** `buildIconTabBar` is 97 lines long (lines 57–153). It is doing too much: it builds the tab buttons and content containers and also wires up tab click behavior and also injects pre-built runtime tab content and also applies “hidden tabs” settings.

**Where:** `src/book-browser/browser-tabs/browser-tabs.js`, lines 57–153

**Steps to fix:**
- [x] Extract “create the tab button + icon + label + click handler” (roughly lines 87–114) into a new function named `createTabButton({ tab, onClick })`. It should return the created `<button>`.
- [x] Extract “create the tab content panel container” (roughly lines 105–112) into a new function named `createTabPanel({ tabId })`. It should return the created `<div>`.
- [x] Extract “apply runtime DOM nodes to their tab panels” (lines 131–145) into a new function named `mountRuntimeTabContent({ tabContentsById, runtimeState, visibilityRow, sortingRow, searchRow })`. It should handle all tab content mounting in one place.
- [x] Replace the extracted blocks in `buildIconTabBar(...)` with calls to the new functions.

---

### [4] SIZE-01 — Large function

**What:** `createFilterBarSlice` is 161 lines long (lines 42–202). It is doing too much: it validates and normalizes state and also creates the visibility slice and also defines the full tab UI builder and also manages document-level click listener cleanup and also exposes a public API object.

**Where:** `src/book-browser/browser-tabs/browser-tabs.js`, lines 42–202

**Steps to fix:**
- [x] Extract the “normalize bookVisibilityMode” block (lines 43–45) into a helper named `ensureValidBookVisibilityMode(listPanelState)`. It should set the default if invalid.
- [x] Extract the `buildIconTabBar(...)` function (lines 57–153) out to a separate top-level function in this module (still in the same file) to reduce nesting inside `createFilterBarSlice`.
- [x] Extract the document click listener lifecycle (lines 155–194) into a small helper like `createDocumentClickSubscription()` that returns `{ set(handler), cleanup() }`.
- [x] Keep `createFilterBarSlice(...)` focused on wiring the pieces together and returning the public API.

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`src/book-browser/browser-tabs/browser-tabs.js`
- Added a shared `TAB_IDS` constant so the tab names live in one place.
- Moved tab button creation, tab panel creation, runtime tab mounting, visibility-mode validation, and document click subscription into small helpers.
- Slimmed `createFilterBarSlice(...)` so it mainly connects existing pieces together.

### Risks / What might break

- If any future edit uses a raw tab name instead of `TAB_IDS`, hidden-tab logic can drift out of sync again.
- The document click cleanup now goes through one helper, so a later change that bypasses that helper could leave a stale click listener behind.
- The tab layout still depends on the same runtime DOM nodes being present; if those nodes change shape elsewhere, tabs could render empty.

### Manual checks

- Open the drawer and switch through all browser tabs. Success looks like each tab opening the same content as before.
- Hide and show tabs from settings. Success looks like hidden tabs disappearing and the first visible tab becoming active when needed.
- Open the visibility menu, then click elsewhere on the page. Success looks like the menu closing and not leaving broken click behavior behind.
