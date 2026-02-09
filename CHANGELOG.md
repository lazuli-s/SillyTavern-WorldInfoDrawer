# Changelog

## [2.3.2] - 2026-02-09

### Internal / Maintenance

- Refactored `src/listPanel.js` initialization by extracting slice wiring and API-surface assembly into helper functions (`wireSlices`, `getListPanelApi`) without changing behavior.

## [2.3.1] - 2026-02-09

### Added

- Added standardized dropdown families across the drawer UI: `stwid--multiselectDropdown*` for selectable menus and `stwid--listDropdown*` for action menus, including square/check-square indicators for multiselect options.
- Added Book Visibility scope sharing with Order Helper, so toolbar and folder launches can use current Book Visibility scope and open non-single-book sessions can refresh to scope changes.
- Added a top-row list-panel toggle to collapse/expand all folders in one click.

### Changed

- Changed list filtering so Book Visibility is now the single source of truth for visible books, removing the separate `Active` filter control from the list panel.
- Changed dropdown styling and behavior to be consistent across list panel and Order Helper menus (rounding, spacing, and open/close interaction consistency).
- Changed folder expand-all handling to be view-only, so expanding all folders does not overwrite saved default folder-collapse preferences.

### Fixed

- Fixed source-link tooltips to include linked character names and active persona names when available.
- Fixed folder row/button padding alignment in the list panel.

### Internal / Maintenance

- Documented the dropdown family contract and visibility chip usage in `STYLE_GUIDE.md`, and updated architecture/feature mapping docs to reflect the current Book Visibility and Order Helper scope model.
- Updated architecture and feature-map documentation for the new list-panel folder collapse/expand-all toggle ownership and behavior.


## [2.3.0] - 2026-02-08

### Added

- Added a Book Visibility filter with source-based modes (`All Active`, `Global`, `Chat`, `Persona`, `Character`) and inline chips.

### Changed

- Changed Book Visibility defaults to include an `All Books` preset (shown first in the menu) so the list starts by showing both active and inactive books.

### Fixed

- Fixed folder visibility so folders with no currently visible books are hidden when visibility/search filters are active.
- Fixed source icon tooltips to show linked character/persona attribution when available instead of only generic source labels.
- Fixed stale entry rendering in the editor by resolving entries from a fresh save payload before opening.
- Fixed duplicate-entry refresh races by serializing refresh/reopen handling after duplicate actions.
- Fixed book menu rename/bulk-edit actions to wait for core UI actions instead of using fixed delays.
- Fixed Order Helper filter correctness after inline outlet/group/automation ID edits.
- Fixed Order Helper apply-order validation to reject invalid start/spacing values before writes.
- Fixed redundant editor refresh clicks during world-info updates to reduce flicker and extra rebuilds.
- Fixed Book Visibility control layout issues (menu clarity, chip wrapping/alignment, and contextual help text).

### Performance

- Reduced splitter drag reflow pressure by batching width updates and skipping redundant style writes.
- Reduced entry-search filter overhead by caching normalized entry search text and minimizing unnecessary class toggles.
- Reduced Order Helper render cost by caching entry template node lookups outside per-row loops.

## [2.2.0]

### Added

#### Folders & Book Organization

- Added a full lorebook folder system with per-book folder metadata and persisted folder registry.
- Added folder rendering/grouping in the list panel (books nested under folder headers).
- Added list controls for creating folders and importing folders.
- Added folder-level active toggles with tri-state behavior.
- Added folder context menu actions: rename, delete, export, import into folder, and create book in folder.
- Added drag-and-drop support for moving books between folders and back to root.
- Added folder collapse-state persistence in `localStorage`.
- Added folder-scoped Order Helper action.

#### Order Helper Capabilities

- Added Order Helper filters for strategy, position, recursion flags, outlet, automation ID, and inclusion group (including prioritize handling).
- Added outlet and automation ID editing/display support in Order Helper rows.
- Added entry move controls in the Order Helper drag column.
- Added column visibility quick actions/presets in Order Helper.

### Changed

#### UI/UX Consistency

- Removed Discord-layout-specific styling logic and simplified CSS behavior.

#### Architecture & Maintainability

- Refactored Order Helper internals into dedicated modules (`orderHelper*` split).
- Reorganized and standardized CSS (feature grouping, scoped tokens, focus/state primitives).

### Fixed

#### Folder & Import Reliability

- Fixed folder import assignment to prevent books being placed in wrong folders.
- Fixed race conditions from overlapping folder imports.
- Fixed folder active-toggle state updates while filtering books.
- Fixed refresh list to use latest world names.
- Fixed list panel entry-search reset behavior.

#### Selection, Drag & Input Safety

- Fixed selection stability by using UID-based selection logic.
- Fixed SHIFT range-selected entry drag behavior.
- Fixed accidental Delete-key deletions while typing in inputs/editors.

#### Editor & Update Lifecycle

- Fixed editor dirty-state tracking to reduce unsaved-input loss during refresh.
- Fixed stale-click handling in editor entry opening.
- Fixed world-info update synchronization using monotonic update-token handling.

#### Defensive Runtime Fixes

- Fixed multiple null/guard edge cases across render/update/jump paths.
- Fixed duplicate/delete book action reliability via safer core-UI interaction helpers.
- Fixed jump-to-entry DOM validation and scroll/click behavior.

## [2.1.0]

### Added

- Extended Order Helper from reordering-only into a full active-entry table view.
- Added configurable table columns, including recursion, budget, and inclusion group fields.
- Added custom ordering driven by drag-and-drop inside Order Helper.

## [2.0.2]

### Changed

- Reworked the Order Helper layout to improve scanability of controls and columns.
- Tightened column labels for clearer ordering context.

### Added

- Outlet name column in Order Helper.
- Clickable comment links in Order Helper to jump directly to entries.
- Draggable splitter between World Info list and editor for adjustable panel width.
- Order Helper option to hide keywords for cleaner reordering views.
- Expanded sorting controls: title, position, depth, order, UID, trigger/keyword, and token count (ascending/descending).
- Per-book sort preference toggle with a clear-preferences option to fall back to global sorting.
- Order Helper selection controls for updating only selected entries.

## [2.0.1]

### Added

- Added support for the "ST Lorebook Ordering" extension integration.

## [2.0.0]

### Added

- Refresh control for quickly syncing lorebook state.
- Fill empty titles toggle to auto-label entries without titles.
