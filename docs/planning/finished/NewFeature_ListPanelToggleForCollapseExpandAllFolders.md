# [NEW FEATURE]: List Panel Toggle for Collapse/Expand All Folders

## DESCRIPTION

### User Report
  > "Add a new toggle button in the list panel, placed next to the existing collapse/expand-all-books control, that collapses or expands all folders at once. It must apply to all folders, expand only for the current view/session context (not as a permanent default override), and keep existing new-folder default behavior unchanged."

### Mental Map
1. The user works in the WorldInfo Drawer list panel, where folders group books and each folder can be collapsed or expanded individually.
2. Current interaction is per-folder: the user must click each folder header/toggle icon to open or close folders one by one.
3. The top control row already includes a global collapse/expand control for books, but that control manages book entry lists, not folder containers.
4. This creates a scope mismatch in the UI: there is a global book-level toggle, but no equivalent global folder-level toggle.
5. The requested feature is a folder-level global toggle, not a one-way button, so it must support both states (collapse-all-folders and expand-all-folders) depending on current folder state.
6. The action target is all folders in the list model, not only folders currently visible after search/filter effects.
7. Folder collapsed state is currently tracked in extension-owned local state (`folderCollapseStates`) and rendered through folder DOM collapse classes (`.stwid--folderBooks.stwid--isCollapsed`).
8. Existing folder behavior includes persisted collapse preferences and per-folder toggles; the new feature should reuse this existing state flow rather than introducing a parallel folder-state mechanism.
9. "Only expand for the current view" means the user expects expand-all to function as an immediate UI action without changing the conceptual default behavior for future newly created folders.
10. "Keep behavior" for new folders means existing new-folder initial collapse behavior should remain exactly as it is today.
11. Placement requirement is explicit: this new folder toggle belongs in the same top control row as the current global controls, next to the existing books collapse/expand toggle.
12. Ownership is extension-local: control-row markup is in `index.js`, folder-collapse state plumbing is in `src/listPanel.js`, and folder collapse rendering is in `src/lorebookFolders.js` + `style.css`; no `/vendor/SillyTavern` changes are involved.

## PLAN

### Goal
  Add a folder-level global toggle button in the list-panel top controls that collapses or expands all folders in one click, applies to all folders, and keeps expand-all as a current-view action by reusing the existing transient folder-collapse path so default new-folder behavior remains unchanged.

### Extension Modules
  1. `index.js`
     - Owns top control-row button creation and click wiring.
     - Will add one new folder-global toggle button adjacent to the existing books collapse/expand button.
  2. `src/listPanel.js`
     - Owns folder collapse state (`folderCollapseStates`), persistence (`stwid--folder-collapse-states`), and folder DOM registry (`folderDoms`).
     - Will expose minimal folder-global helpers through `initListPanel(...)` return API so `index.js` can trigger/update folder toggle behavior without direct state access.
     - Will reuse `setFolderCollapsedAndPersist(...)` and existing `transientExpand` option to satisfy "expand for current view".
  3. `src/lorebookFolders.js`
     - No logic rewrite planned; existing `setFolderCollapsed(...)` remains the folder DOM collapse primitive used by list panel.
  4. `style.css`
     - No new CSS expected if existing `.menu_button` styling is reused.
     - Only targeted style adjustment if required for spacing after adding one extra top-row control.

### ST Context
  1. No new SillyTavern API surface is needed; this is extension-owned UI state and DOM behavior.
  2. Relevant host context remains unchanged (`eventSource` / `event_types` in ST context), and existing extension refresh paths already rebuild list/folder DOM after WI updates.
  3. Existing browser persistence remains extension-owned via `localStorage` key `stwid--folder-collapse-states`; no ST-owned lorebook truth or persistence contract is modified.
  4. Existing host-provided UI primitives (`menu_button`, Font Awesome icons) are reused; no dependency additions.

### Decision Points
  1. Toggle state rule:
     - When any folder is expanded, the button action is "Collapse All Folders".
     - When no folders are expanded, the button action is "Expand All Folders".
  2. Scope rule:
     - Apply to all folders tracked in `folderDoms`, not only currently visible folders.
  3. Persistence rule for expand-all:
     - Use `transientExpand` path when setting folders expanded so expand-all does not overwrite saved collapse defaults.
  4. Persistence rule for collapse-all:
     - Keep normal persisted collapse flow when collapsing all (consistent with existing explicit collapse behavior).
  5. Empty-state behavior:
     - Button remains present; with zero folders it should be effectively no-op and still keep correct label/icon state.

### Evidence-based fix
  1. In `src/listPanel.js`, add folder-global helpers that reuse existing folder state:
     - `hasExpandedFolders()` based on `folderDoms[*].books` collapsed class.
     - `setAllFoldersCollapsed(isCollapsed)` iterating known folders and calling `setFolderCollapsedAndPersist(...)` per folder, with `{ transientExpand:true }` on expand path.
     - `updateCollapseAllFoldersToggle()` that updates icon/title/aria on a new DOM toggle reference.
  2. In `src/listPanel.js`, include these helpers in the returned list-panel API and call folder-toggle updater after list load/refresh and after individual folder toggles so UI state stays synchronized.
  3. In `index.js`, add one top-row folder toggle button next to the existing books toggle, wired to list-panel folder-global helpers.
  4. Reuse existing button conventions (`menu_button`, icon-only control with `aria-label`, `aria-pressed`) for parity with current controls.
  5. Avoid touching `/vendor/SillyTavern` and avoid introducing new modules; keep change-set scoped to extension entry/list-panel ownership.

### Risks/cons
  1. Button state can drift after list rebuilds if folder-toggle updater is not called in every refresh/re-render path.
  2. Using transient expand without persistence can feel inconsistent to users who expect expand-all to survive a full reload.
  3. If folder iteration uses only rendered DOM and misses registry-only empty folders, label/icon logic could misreport toggle state.

## TASK CHECKLIST
  Smallest Change Set Checklist:
  [x] In `index.js`, add a new folder collapse/expand toggle button in the primary controls row immediately next to the existing books collapse/expand button, using existing `menu_button` styling and icon conventions.
  [x] In `src/listPanel.js`, add `hasExpandedFolders()` using existing `folderDoms` + `.stwid--isCollapsed` state detection.
  [x] In `src/listPanel.js`, add `setAllFoldersCollapsed(isCollapsed)` that loops all folder names and calls existing `setFolderCollapsedAndPersist(...)`, passing `{ transientExpand:true }` when expanding.
  [x] In `src/listPanel.js`, add `updateCollapseAllFoldersToggle()` mirroring existing books-toggle state updates (title, `aria-label`, `aria-pressed`, icon classes).
  [x] In `src/listPanel.js`, include new folder-toggle helpers in `initListPanel(...)` returned API object for `index.js` wiring.
  [x] In `src/listPanel.js`, invoke `updateCollapseAllFoldersToggle()` after folder state mutations (individual folder toggle and post-load/post-refresh list completion).
  [x] In `index.js`, wire new button click handler to call `listPanelApi.hasExpandedFolders()`, `listPanelApi.setAllFoldersCollapsed(...)`, and `listPanelApi.updateCollapseAllFoldersToggle()`.
  [x] Verify manually: toggle behavior flips correctly, applies to all folders (including hidden-by-filter folders), expand-all is current-view only, and new-folder default collapse behavior remains unchanged.

## AFTER IMPLEMENTATION

### What changed
  1. `index.js`
     - Added `dom.collapseAllFoldersToggle` and created a new top-row folder toggle button next to the existing book toggle.
     - Wired click behavior to list-panel folder-global helpers.
     - Initialized folder-toggle UI state on startup (`updateCollapseAllFoldersToggle()`).
  2. `src/listPanel.js`
     - Added folder-global helpers: `hasExpandedFolders()`, `setAllFoldersCollapsed(...)`, `updateCollapseAllFoldersToggle()`.
     - Updated folder toggle flow to keep the new button state synchronized after individual and full list updates.
     - Tightened `transientExpand` behavior so expand-all is view-only and does not overwrite saved folder-collapse defaults.
  3. `FEATURE_MAP.md` and `ARCHITECTURE.md`
     - Documented new top-row folder toggle ownership and folder collapse/expand-all behavior location.

### Risks/What might break
  1. This touches folder collapse-state write rules, so persistence timing might differ from older behavior in edge cases where users mix expand-all with later per-folder collapse actions.
  2. This adds a new top-row control, so compact layouts could feel tighter if the host theme has unusually large button sizing.
  3. This adds new list-panel API members used by `index.js`, so future refactors to `initListPanel(...)` return shape could break the folder button if not kept in sync.

### Manual checks
  1. Click the new folder toggle once when at least one folder is open; success looks like all folders collapse and button label switches to "Expand All Folders".
  2. Click it again; success looks like all folders expand and button label switches to "Collapse All Folders".
  3. Apply search/visibility filters so some folders are hidden, then use the folder toggle; success looks like hidden folders also follow the new global state when they become visible again.
  4. Use Expand All Folders, then refresh/reopen the list; success looks like expansion was view-only (saved default collapse behavior is not silently replaced).
  5. Create a brand-new folder after using the toggle; success looks like new-folder initial collapse behavior is unchanged from before this feature.
