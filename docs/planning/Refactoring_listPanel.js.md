# Refactoring Plan: listPanel.js (Feature Slice Split, UI-First)

## Goal
Split `src/listPanel.js` into UI-first feature slices while preserving behavior, integration points, selectors, and exported API.

Chosen split family:
1. `listPanel.js` (composition + public API)
2. `listPanel.state.js` (module-local mutable state + lifecycle resets)
3. `listPanel.filterBar.js` (search + book visibility menu/chips/scope)
4. `listPanel.foldersView.js` (folder dom map, collapse persistence, folder rendering/wiring)
5. `listPanel.booksView.js` (book row render shell + entry list container wiring)
6. `listPanel.bookMenu.js` (book dropdown menu items and actions)
7. `listPanel.selectionDnD.js` (entry selection model + drag/drop handlers)
8. `listPanel.coreBridge.js` (core WI selector/click/wait helpers)

## Scope Constraints
1. No behavior changes.
2. No selector/id/class behavior changes.
3. No changed labels/menu availability.
4. No changed `initListPanel` return shape.
5. No changes under `vendor/SillyTavern`.

## Baseline Snapshot (Before Any Move)
1. Save a copy of `src/listPanel.js` as a temporary reference branch/commit.
2. Record current external surface:
   1. `initListPanel` export and return members.
   2. `refreshList` export.
   3. State members consumed by `worldEntry.js`, `index.js`, `lorebookFolders.js`.
3. Record integration selectors used by core bridge:
   1. `#world_import_file`
   2. `#world_editor_select`
   3. `#world_info`
   4. `#world_duplicate`
   5. `#world_popup_delete`
   6. `#world_popup_name_button`

## Target Ownership Map
### `listPanel.state.js`
Owns:
1. Mutable locals currently at module scope:
   1. visibility mode/selections/menu refs
   2. search refs and entry search cache
   3. collapse maps and folder dom map
   4. selection memory
   5. drag book name
2. Lifecycle reset/hydration helpers:
   1. visibility reset
   2. entry search cache clear
   3. folder collapse hydration
   4. selection reset

Does not own:
1. ST API calls.
2. DOM rendering itself.

### `listPanel.filterBar.js`
Owns:
1. `setupFilter`.
2. book visibility constants/options/tooltips.
3. `getBookVisibilityScope` and `applyActiveFilter`.
4. query filter application and folder visibility refresh trigger calls.

Depends on:
1. state store getters/setters.
2. callbacks injected by composition (`updateFolderActiveToggles`, `state.onBookVisibilityScopeChange`).

### `listPanel.foldersView.js`
Owns:
1. folder collapse localStorage helpers.
2. folder-level collapse all toggle sync.
3. folder dom creation path (`createFolderDom`) and folder insertion ordering.
4. folder visibility and folder active toggle refresh helpers.

Depends on:
1. `listPanel.state.js` for folder dom map.
2. actions from composition (`handleDraggedBookMoveOrCopy`, `folderMenuActions`).

### `listPanel.booksView.js`
Owns:
1. `renderBook` shell.
2. `loadList`.
3. per-book collapse toggle wiring.
4. source-links rendering hooks.
5. entry list rendering loop callouts to `state.renderEntry`.

Does not own:
1. book menu DOM internals.
2. selection state internals.

### `listPanel.bookMenu.js`
Owns:
1. dropdown build for book menu trigger contents.
2. move-to-folder modal and actions.
3. duplicate/delete/export/sort/order helper/stlo/external editor menu actions.
4. folder import dialog entry points tied to book/folder actions.

Depends on:
1. core bridge functions.
2. composition actions (`setBookFolder`, `refreshList`, `setBookSortPreference`, etc).

### `listPanel.selectionDnD.js`
Owns:
1. `selectAdd`, `selectRemove`, `selectEnd`.
2. selection state API (`getSelectionState`).
3. entry move/copy algorithm for drop.
4. shared drag/drop handler helpers used by books/folders/root container.

Depends on:
1. state store selection/drag fields.
2. injected persistence actions (`loadWorldInfo`, `saveWorldInfo`, `deleteWorldInfoEntry`).

### `listPanel.coreBridge.js`
Owns:
1. `waitForDom`
2. `setSelectedBookInCoreUi`
3. `clickCoreUiAction`
4. core delegated actions wrappers used by menu actions.

## Implementation Sequence (Detailed)
### Phase 1: Create state container and move pure state helpers
1. Add `listPanel.state.js`.
2. Move module mutable variables and reset/hydration helpers.
3. Expose only explicit getter/setter operations, not raw objects where possible.
4. Keep `listPanel.js` behavior identical by adapting calls to state container.

Exit criteria:
1. App boots.
2. `initListPanel` and `refreshList` still exported.
3. No behavior differences in manual smoke test.

### Phase 2: Extract core bridge utilities
1. Add `listPanel.coreBridge.js`.
2. Move `waitForDom`, `setSelectedBookInCoreUi`, `clickCoreUiAction`.
3. Move `duplicateBook`/`deleteBook` wrappers only if they stay bridge-only; otherwise keep orchestration in composition.

Exit criteria:
1. Rename/duplicate/delete actions still work from book menu.
2. No selector string changes.

### Phase 3: Extract filter bar slice
1. Add `listPanel.filterBar.js`.
2. Move visibility constants and helpers.
3. Move `setupFilter` with injected callbacks for:
   1. folder toggle updates
   2. visibility-scope change callback
   3. access to cache and selected books
4. Keep `state.applyActiveFilter` assignment contract available to composition.

Exit criteria:
1. Search by book name works.
2. Entry search toggle works.
3. All visibility modes/chips/menu state remain consistent.

### Phase 4: Extract selection + drag/drop slice
1. Add `listPanel.selectionDnD.js`.
2. Move `selectAdd`, `selectRemove`, `selectEnd`, `getSelectionState`.
3. Move entry move/copy on drop flow into this slice.
4. Expose reusable handlers for:
   1. book drop target
   2. folder drop target
   3. root list drop target

Exit criteria:
1. click/shift multi-select unchanged.
2. ctrl-copy vs move unchanged.
3. selected visual state and draggable attrs unchanged.

### Phase 5: Extract book menu slice
1. Add `listPanel.bookMenu.js`.
2. Move `buildMoveBookMenuItem`, import dialog helpers, and dropdown item builders.
3. Keep side-effect order unchanged:
   1. save
   2. update
   3. refresh
   4. UI close/reset

Exit criteria:
1. All book menu items still appear under the same conditions.
2. Optional integrations (Bulk Edit, External Editor, STLO) still gate on extension presence.

### Phase 6: Extract folders + books view slices
1. Add `listPanel.foldersView.js` for folder map/collapse behavior.
2. Add `listPanel.booksView.js` for `renderBook` and `loadList`.
3. Inject dependencies from composition for:
   1. menu builder
   2. selection/drop handlers
   3. source link update helpers
   4. sort helpers

Exit criteria:
1. `renderBook` still creates identical structure/classes.
2. folder ordering and root ordering unchanged.
3. collapse-all books/folders toggle state unchanged.

### Phase 7: Final composition pass in `listPanel.js`
1. Reduce `listPanel.js` to:
   1. dependency wiring
   2. shared orchestration actions
   3. public API assembly
2. Ensure returned API names/signatures unchanged.
3. Remove dead helpers from composition file.

Exit criteria:
1. `initListPanel` return object exactly matches baseline keys.
2. `refreshList` export still available and behaviorally identical.

## Risk Register
1. Hidden shared state drift.
   1. Risk: two slices update different copies of selection/drag fields.
   2. Mitigation: single state module, no duplicate state vars.
2. Event listener multiplication.
   1. Risk: filter or menu document listeners attach more than before.
   2. Mitigation: keep one setup path and preserve initialization count.
3. Timing regressions in core delegation.
   1. Risk: duplicate/delete/rename flaky after extraction.
   2. Mitigation: keep bridge code unchanged and covered by targeted manual tests.
4. Side-effect order changes.
   1. Risk: refresh before save causes stale UI.
   2. Mitigation: keep action wrappers with explicit ordered steps.
5. API breakage with adjacent modules.
   1. Risk: `worldEntry.js` or `index.js` expect old methods/state paths.
   2. Mitigation: freeze public API at composition boundary and compare against baseline.

## Validation Gates
Run after each phase:
1. `npm test`
2. `npm run lint`
3. targeted manual checks for changed slice

Full manual regression pass before completion:
1. Create/rename/duplicate/export/delete book.
2. Move book folder-to-folder, folder-to-root, and ctrl-copy.
3. Entry multi-select click + shift range, then move/copy across books.
4. Search book and entry content toggles.
5. Toggle all visibility modes and confirm chips + scope + folder hide/show.
6. Collapse/expand books and folders; verify global toggle icon/title/pressed state.
7. Reload and verify folder collapse persistence.
8. Confirm Order Helper scope updates with visibility changes.

## Done Definition
1. `src/listPanel.js` reduced to composition/orchestration and exports.
2. New slice files contain the feature logic listed in ownership map.
3. No UI or behavior regression in validation gates.
4. Public API compatibility preserved.
5. `FEATURE_MAP.md` and `ARCHITECTURE.md` updated to reflect new file ownership.