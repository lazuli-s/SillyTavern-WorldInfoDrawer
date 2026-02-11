# FEATURE REWORK: Book Visibility Single Source of Truth

## DESCRIPTION

### User Report
  > Book Visibility and Active filtering are inconsistent and the UI shows the wrong scope. Remove the separate Active checkbox and make Book Visibility the single source of truth for what is shown. Book Visibility alone defines which books are visible in the list panel and which entries are included in Order Helper (global and folder). Order Helper should ignore text search filters and update live if Book Visibility changes. Single-book Order Helper is the only exception: it must open that book even if hidden by Book Visibility. Keep the default Book Visibility option as All Books.

### Mental Map
1. The user opens the list panel and sees a Book Visibility control plus a separate Active checkbox, which currently act as two overlapping filters.
2. The user expects Book Visibility to be the only filter determining which books are shown in the list; the Active checkbox should not exist or influence visibility anymore.
3. Book Visibility includes two key presets: All Books (everything, active or inactive) and All Active (only books currently sent to context).
4. Book Visibility should also define which books are included in Order Helper scope when opened from the toolbar or a folder menu.
5. Order Helper should ignore list search filters (Search books / Entries) so text queries do not change its scope.
6. If Book Visibility changes while Order Helper is open, Order Helper should update immediately to match the new visibility selection.
7. A single-book Order Helper opened from a specific book should always include that book, even if it is currently hidden by Book Visibility.

## PLAN

### Goal
  Make Book Visibility the single scope authority for list visibility and non-single-book Order Helper scopes, remove the legacy `Active` checkbox/filter path, keep search text filtering list-only, and preserve single-book Order Helper as an explicit override.

### Extension Modules
  1. `src/listPanel.js`
     - Owns Book Visibility state (`bookVisibilityMode`, `bookVisibilitySelections`) and the current mixed filter pipeline in `applyActiveFilter()`.
     - Owns filter-row UI creation (`setupFilter()`) where legacy `filterActiveInput` is created and where Book Visibility chips/menu state are rendered.
     - Owns folder menu action wiring (`folderMenuActions`) and is the best place to provide a reusable visibility-scope helper for Order Helper callers.
  2. `src/lorebookFolders.js`
     - Owns folder context action `Order Helper (Folder)` and currently intersects folder books with `getSelectedWorldInfo()`.
     - Must consume Book Visibility-derived scope instead of global-active-only scope.
  3. `src/orderHelper.js`
     - Owns Order Helper scope state (`scopedBookNames`) and open flow (`openOrderHelper(book, scope)`).
     - Needs a minimal in-place scope refresh path for open non-single-book sessions when Book Visibility changes.
  4. `index.js`
     - Owns toolbar Order Helper trigger and the runtime glue between list panel APIs, order-helper APIs, and source-link refresh events.
     - Must route toolbar Order Helper scope from Book Visibility state (not implicit active-only default).
  5. `style.css`
     - Owns legacy filter UI/style selectors (`.stwid--filterActive`, `.stwid--book.stwid--filter-active`) and hidden-book selector groups.
     - Requires targeted cleanup after removing the separate Active filter path.

### ST Context
  1. `vendor/SillyTavern/public/scripts/st-context.js` exposes `eventSource` and `eventTypes`/`event_types`; extension already relies on these to refresh UI/filter state on `WORLDINFO_SETTINGS_UPDATED`, `CHAT_CHANGED`, `GROUP_UPDATED`, `CHARACTER_EDITED`, `CHARACTER_PAGE_LOADED`, and `SETTINGS_UPDATED`.
  2. Canonical activation truth remains SillyTavern-owned (`selected_world_info` from core world-info surface). Extension only reads this plus source-link context to derive Book Visibility flags.
  3. Source-link visibility for `Chat`/`Persona`/`Character` remains extension-derived from ST-owned state (`chat_metadata`, `characters`, `this_chid`, `groups`, `selected_group`, `power_user`) and refreshed in `index.js`.
  4. No new ST API or persistence surface is required; this is extension-owned scope routing and filter composition.

### Decision Points
  1. Scope source for Order Helper:
     - Use Book Visibility mode/selections + source-link/global flags as the scope input.
     - Do not derive scope from DOM hidden classes so text search filtering never affects Order Helper scope.
  2. Single-book precedence:
     - `openOrderHelper(bookName)` must include that book regardless of Book Visibility or global-active status.
  3. Live-update behavior:
     - Re-scope only when Order Helper is currently open in non-single-book mode.
     - Re-render in place (no panel close/reopen) to keep interaction predictable.
  4. Backward-compatible API naming:
     - Keep `applyActiveFilter()` name for cross-module stability (`index.js` callers), but remove legacy Active-checkbox semantics from its body.
  5. Class contract cleanup:
     - Remove `stwid--filter-active` usage entirely instead of leaving dead mixed-filter classes.

### Evidence-based fix
  1. In `src/listPanel.js`, remove the legacy Active checkbox UI block (`filterActiveInput`) and remove Active-chip rendering from `renderVisibilityChips()`.
  2. In `src/listPanel.js`, simplify `applyActiveFilter()` to compute/toggle only `stwid--filter-visibility` from Book Visibility state; stop toggling `stwid--filter-active`.
  3. In `src/listPanel.js`, add one helper that returns Book Visibility-scoped book names from in-memory flags/mode (`All Books`, `All Active`, or multiselect), explicitly independent from query filtering.
  4. In `src/listPanel.js`, expose that helper through list panel API/menu actions and invoke a scope-change callback when Book Visibility changes.
  5. In `index.js`, update toolbar Order Helper open path to pass current Book Visibility scope (instead of relying on default active-book scope).
  6. In `src/lorebookFolders.js`, update `Order Helper (Folder)` action to intersect folder books with passed Book Visibility scope rather than `getSelectedWorldInfo()`.
  7. In `src/orderHelper.js`, add a minimal method to refresh `scopedBookNames` and re-render only when Order Helper is open with `book === null`; wire this from list panel Book Visibility changes.
  8. In `src/listPanel.js` and `src/lorebookFolders.js`, remove remaining `stwid--filter-active` checks from filtered/visible-book helper paths.
  9. In `style.css`, remove obsolete Active-filter selectors (`.stwid--filterActive`, `.stwid--book.stwid--filter-active`) while preserving search + Book Visibility styling behavior.

### Risks/cons
  1. Re-rendering Order Helper on live visibility updates can reset current row focus or in-progress inline edits.
  2. If scope callback wiring misses one open path (toolbar/folder), Order Helper can show stale scope until manually reopened.
  3. Removing legacy Active selectors can affect user custom CSS snippets that still target `.stwid--filterActive` or `.stwid--filter-active`.

## TASK CHECKLIST
  Smallest Change Set Checklist:
  [x] Remove legacy Active checkbox creation and Active chip rendering in `src/listPanel.js` `setupFilter()`/`renderVisibilityChips()`.
  [x] Update `src/listPanel.js` `applyActiveFilter()` to only compute/toggle `stwid--filter-visibility`.
  [x] Add `src/listPanel.js` helper/API to return Book Visibility-scoped book names independent of search query filtering.
  [x] Update toolbar Order Helper trigger in `index.js` to call `openOrderHelper(null, <bookVisibilityScope>)`.
  [x] Update folder `Order Helper (Folder)` action in `src/lorebookFolders.js` to intersect folder books with passed Book Visibility scope (not `getSelectedWorldInfo()`).
  [x] Add `src/orderHelper.js` method to refresh scope while open in non-single-book mode and wire it from Book Visibility-change flow.
  [x] Remove `stwid--filter-active` checks from filtered-book helper paths in `src/listPanel.js` and `src/lorebookFolders.js`.
  [x] Remove obsolete legacy Active-filter CSS selectors from `style.css` without changing Book Visibility/search behavior.
  [x] Verify behavior: default `All Books`, no separate Active checkbox, global/folder Order Helper follows Book Visibility, single-book Order Helper still opens its target book, search text does not affect Order Helper scope.

## AFTER IMPLEMENTATION

### What changed
  `src/listPanel.js`
  - Removed legacy `Active` checkbox/chip path.
  - Added `getBookVisibilityScope()` helper/API and made `applyActiveFilter()` Book-Visibility-only.
  - Added Book Visibility scope-change callback hook for live Order Helper updates.

  `index.js`
  - Toolbar `Order Helper` now opens with current Book Visibility scope.
  - Wired list-panel Book Visibility changes to Order Helper scope refresh.

  `src/lorebookFolders.js`
  - Folder `Order Helper (Folder)` now intersects folder books with Book Visibility scope.
  - Removed legacy `stwid--filter-active` dependency from visible-book detection.

  `src/orderHelper.js`
  - Added `refreshOrderHelperScope(scope)` for live non-single-book scope updates.
  - Keeps single-book mode untouched.

  `FEATURE_MAP.md`, `ARCHITECTURE.md`
  - Updated docs to reflect that Book Visibility is now the single list-visibility source and Order Helper scope source.

### Risks/What might break
  - This touches Order Helper live re-rendering, so in-progress inline edits/focus can reset when Book Visibility changes.
  - This changes toolbar/folder scope routing, so a missed callback path could leave Order Helper showing stale scope until reopened.
  - This removes legacy Active-filter classes, so custom CSS targeting `.stwid--filterActive`/`.stwid--filter-active` will stop applying.

### Manual checks
  - Open the list panel: confirm there is no separate `Active` checkbox.  
    Success: only `Book Visibility` controls list visibility.
  - Toggle `Book Visibility` between `All Books`, `All Active`, and custom `Global/Chat/Persona/Character`.
    Success: visible books update immediately and chips match the selected mode.
  - Open toolbar `Order Helper`, then change Book Visibility while it is open.
    Success: rows refresh to the new Book Visibility scope (without reopening).
  - Open `Order Helper (Folder)` from a folder menu with mixed visible/hidden books.
    Success: only books in both that folder and current Book Visibility scope appear.
  - Open single-book `Order Helper` from a specific book that is hidden by current Book Visibility.
    Success: that specific book still opens (single-book override still works).
  - Type in search (`Search books` / `Entries`) and open toolbar/folder Order Helper.
    Success: search text does not change Order Helper scope.
