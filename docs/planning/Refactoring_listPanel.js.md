# Refactoring Plan: listPanel.js

## 1. Mental Model of the Current File
- This file builds and controls the entire left side of the drawer: folders, books, and entry rows.
- It also handles many user actions directly: search, visibility filtering, folder/book collapse, drag and drop, selection, book menu actions, folder import, and parts of sorting behavior.
- It receives a large `state` object from `index.js` and then reads and writes through that object for almost everything (data loading, saving, UI updates, and external actions).
- Data mostly flows like this:
1. `index.js` passes API functions and shared objects into `initListPanel`.
2. `listPanel.js` loads books, builds DOM nodes, and stores DOM references inside `state.cache`.
3. User clicks and drags trigger local handlers that edit cache data, call SillyTavern APIs, and refresh the list.
4. Other modules (`index.js`, `worldEntry.js`, `lorebookFolders.js`) call back into returned list panel methods.
- Main sources of truth (important):
1. SillyTavern-owned truth for lorebooks (`world_names`, `selected_world_info`, and `loadWorldInfo`/`saveWorldInfo` data).
2. Extension runtime cache (`state.cache`) used to render and mutate rows quickly.
3. Local module memory (many top-level variables like selection state, collapse state, folder DOM maps, visibility mode, search cache).
4. Browser storage for folder collapse defaults (`stwid--folder-collapse-states`).

## 2. Why This File Is Hard to Change
- Complexity hotspot: one file (1,900+ lines) mixes rendering, event wiring, persistence calls, filtering rules, selection rules, and integration logic.
- Mixed responsibilities: �what to show� logic and �what to save� logic live side-by-side in the same handlers.
- Hidden state: important behavior depends on top-level mutable variables (`selectFrom`, `bookVisibilityMode`, `dragBookName`, `folderDoms`, and others) that are changed from many places.
- Tight coupling to DOM structure and IDs:
1. Core selectors like `#world_import_file`, `#world_editor_select`, `#world_info`, `#world_popup_delete`, `#world_popup_name_button`.
2. Many CSS class checks/toggles that act as behavior flags.
- Tight coupling to adjacent modules:
1. `index.js` injects a large dependency surface and expects many return methods.
2. `worldEntry.js` relies on selection getters/setters returned from this file.
3. `lorebookFolders.js` relies on `folderMenuActions` contract.
- Implicit timing risk: several actions depend on async UI timing (`waitForDom`, `waitForWorldInfoUpdate`, delayed refresh), which makes regressions hard to spot quickly.
- Repeated patterns: similar drop handlers and menu construction patterns appear in multiple places, increasing �fix in one place but forget another� risk.

## 3. Refactoring Phases

### Phase 1 � Make the File Easier to Read
- Goal (one sentence): Reorganize the file layout so a reader can find behavior by topic without changing any logic.
- What is allowed to change:
1. Reorder existing function blocks into clear sections (state setup, filtering, book rendering, folder behavior, menu actions, selection, initialization).
2. Add short plain-language comments above major sections and tricky behavior.
3. Normalize naming consistency for local helper names only where meaning becomes clearer and no exported/public names are touched.
- What must NOT change:
1. Any event behavior.
2. Any selector, class toggle, or API call target.
3. Any returned API shape from `initListPanel`.
- Why this phase is low-risk: it only changes where code sits and how it is labeled, not what code does.
- What becomes clearer or safer after this phase:
1. Faster onboarding for future edits.
2. Lower chance of editing the wrong region.
3. Easier review of behavior-specific changes.

### Phase 2 � Clarify State Ownership and Lifecycles
- Goal (one sentence): Make every mutable state value explicit about who owns it and when it resets.
- What is allowed to change:
1. Group top-level mutable variables by concern (selection, visibility filter, folder collapse, drag state, search cache).
2. Add clear comments for lifecycle boundaries (set during init, reset on refresh, persisted to localStorage, derived from SillyTavern state).
3. Add internal read/write helpers around direct variable mutation where it improves traceability, without changing behavior.
- What must NOT change:
1. Stored key names in localStorage.
2. Existing default values and reset behavior.
3. Selection rules (single-book selection, shift range behavior, drag/copy rules).
- Why this phase is low-risk: behavior remains identical; only state bookkeeping becomes easier to reason about.
- What becomes clearer or safer after this phase:
1. Fewer accidental state leaks between refreshes.
2. Easier debugging when selection/filter/collapse bugs appear.
3. Better confidence that async flows update the right state.

### Phase 3 � Separate UI Construction from Action Logic (Inside Same File)
- Goal (one sentence): Split �build DOM� work from �do action� work so handlers are easier to test mentally.
- What is allowed to change:
1. Extract local helper groups for menu action handlers, drag/drop decisions, and filter computations while staying in `listPanel.js`.
2. Route repeated action paths through single internal helpers (for example, common refresh-and-scroll or common book move checks) without changing outcomes.
3. Make handler names match user intent (for example, �move book�, �duplicate into folder�, �apply visibility filter�).
- What must NOT change:
1. Menu contents, labels, and availability conditions.
2. Integration calls to SillyTavern and companion extensions.
3. Any observable order of side effects (save, update, refresh, UI toggle).
- Why this phase is low-risk: the same actions still run; this phase only reduces repetition and makes call paths explicit.
- What becomes clearer or safer after this phase:
1. Lower chance of inconsistent behavior between similar drop/menu paths.
2. Safer future edits because logic has fewer duplicated branches.
3. Better reviewability for bug fixes.

### Phase 4 � Optional Future-Proofing for Safe Maintenance
- Goal (one sentence): Add guardrails for known fragile points so future edits are less likely to break integration.
- What is allowed to change:
1. Add explicit internal checklists/comments near fragile selectors and async waits explaining expected assumptions.
2. Consolidate constants for repeated selector strings and tooltip text when this improves drift resistance.
3. Add lightweight manual test notes near high-risk paths (import, duplicate, move/copy, visibility filtering).
- What must NOT change:
1. Runtime behavior, feature set, or UI text meaning.
2. Public API from this file.
3. Ownership boundaries with SillyTavern.
- Why this phase is low-risk: it improves defensive clarity, not product behavior.
- What becomes clearer or safer after this phase:
1. Faster detection when upstream SillyTavern DOM changes.
2. Fewer regressions during routine maintenance.
3. Better handoff quality for future contributors.

## 4. Explicit Non-Goals
- Do not split this work across multiple files in this plan; keep scope to `listPanel.js`.
- Do not redesign menus, folder UI, filter UI, or interaction flow.
- Do not replace SillyTavern DOM delegation with new APIs unless requested.
- Do not change import/export behavior, public method names, or call signatures.
- Do not optimize for speed first; only address performance if it blocks clarity or causes unsafe complexity.
- Do not alter optional integration behavior (Bulk Edit, External Editor, STLO).
- Do not introduce framework patterns, state libraries, or architecture rewrites.

## 5. Safety Checklist
- Invariants that must remain true after every phase:
1. The same books and entries render in the same places (root vs folder).
2. Selection still works exactly the same (single book only, Shift range, Ctrl copy behavior).
3. Drag and drop outcomes stay identical for move vs copy and folder/root targets.
4. Book visibility filter still supports `All Books`, `All Active`, and custom multi-select sources.
5. Folder collapse persistence still uses `stwid--folder-collapse-states` and behaves the same on reload.
6. Book menu and folder menu actions still trigger the same downstream behavior.
7. `initListPanel` still returns the same callable API expected by `index.js` and `worldEntry.js`.

- Observable signs of regression:
1. Book rows disappear unexpectedly after refresh or filter changes.
2. Folder headers appear without correct counts or active toggle state.
3. Selection highlight and draggable behavior get out of sync.
4. Duplicate/import/move actions silently fail or target wrong books.
5. Visibility chips/menu state does not match actual visible books.
6. Collapse-all buttons show wrong icon or wrong pressed state.

- Things to manually verify after changes:
1. Create, rename, duplicate, export, delete book from the book menu.
2. Move book between folders, back to root, and copy with Ctrl-drag.
3. Select entries with click and Shift range, then move/copy across books.
4. Search books, then enable entry search and verify matched entries.
5. Toggle each visibility mode and confirm list + chips + folder visibility.
6. Collapse/expand single books and folders, then use global collapse toggles.
7. Reload the drawer and confirm persisted folder collapse defaults remain correct.
8. Confirm Order Helper scope still updates when visibility filtering changes.
