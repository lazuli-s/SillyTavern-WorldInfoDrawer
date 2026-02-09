# FEATURE MAP

Where each feature or behavior is implemented in the codebase.

## Bootstrap & runtime sync

- Extension startup, drawer DOM bootstrap, and panel wiring → index.js
- Dev CSS watch/reload via FilesPluginApi (when available) → index.js
- Incremental cache updates after World Info changes (books and entries) → index.js
- World Info update waiting/token coordination for async UI actions → index.js, src/utils.js
- Book source-link detection (character/chat/persona), attribution metadata (character/persona names), and refresh triggers → index.js
- Source-link refresh applying list visibility filters after map updates → index.js
- Source-link icon rendering on book rows, including attribution tooltips/aria labels for character/persona links → src/listPanel.js
- Jump-to-entry API (open book, scroll, focus editor) → index.js
- Drawer keyboard handling for selected-entry delete → index.js
- List/editor splitter drag resize + saved width → index.js

## Book-level behavior

- Book list rendering and insertion order → src/listPanel.js
- Top control row (new book, new folder, import book, import folder, refresh, collapse/expand all books, collapse/expand all folders) → index.js, src/listPanel.js
- Book active toggle (global active status) → src/listPanel.js
- Book collapse/expand and collapse-all behavior → src/listPanel.js, index.js
- Book drag/drop between folders and root, including Ctrl-copy duplicate flow → src/listPanel.js
- Book context menu actions (rename, move folder, duplicate, export, delete) → src/listPanel.bookMenu.js
- Fill empty entry titles from keywords (book action) → index.js, src/listPanel.bookMenu.js
- Per-book sort preference menu + clear all preferences → src/listPanel.bookMenu.js, src/listPanel.js, src/sortHelpers.js

## Folder behavior

- Folder metadata key handling on lorebook metadata (`folder`) → src/lorebookFolders.js
- Folder registry persistence (`stwid--folder-registry`) → src/lorebookFolders.js
- Folder DOM creation (header, count, active toggle, collapse toggle) → src/lorebookFolders.js
- Folder collapse state persistence (`stwid--folder-collapse-states`) → src/listPanel.js
- Folder collapse/expand-all toggle behavior (all folders, transient expand path) → src/listPanel.js, index.js
- Folder context menu actions (rename, import into folder, export folder, delete folder) → src/lorebookFolders.js
- Create new book directly inside a folder → src/lorebookFolders.js
- Set active/inactive state for all books in a folder → src/lorebookFolders.js

## Entry-level behavior

- Entry row rendering (title/comment, keys, status/actions area) → src/worldEntry.js
- Entry enable/disable toggle and strategy selector on row → src/worldEntry.js
- Entry click-to-open editor flow → src/worldEntry.js, src/editorPanel.js
- Entry creation inside a selected book → src/listPanel.js
- Entry move/copy/duplicate across books with selection + drag/drop → src/listPanel.selectionDnD.js, src/worldEntry.js
- Entry state mapping (`normal`/`constant`/`vectorized`) → src/worldEntry.js

## Editor behavior

- Entry editor render pipeline (template header + `getWorldEntry`) → src/editorPanel.js
- Editor dirty tracking to prevent refresh from discarding unsaved edits → src/editorPanel.js, index.js
- Editor reset/clear and active-row highlight control → src/editorPanel.js
- Focus/unfocus editor UI toggles → src/editorPanel.js
- Global activation settings panel embedding/toggling (`#wiActivationSettings`) → src/editorPanel.js
- Duplicate-entry button refresh queue/reopen behavior → index.js

## Selection & interaction

- Entry selection state model (source book, last clicked, selected uid list, toast) → src/listPanel.selectionDnD.js
- List panel state container for selection/drag/search/visibility/collapse locals + lifecycle resets/hydration → src/listPanel.state.js
- Click select, toggle select, and Shift range select behavior → src/worldEntry.js
- Selection visual state add/remove/clear helpers → src/listPanel.selectionDnD.js
- Delete selected entries (Del key) with save/update propagation → index.js
- Search books by name and optional entry text search (title/keys) → src/listPanel.filterBar.js
- Book visibility filter (`All Books` default exclusive preset, `All Active` exclusive preset, and multi-select `Global`/`Chat`/`Persona`/`Character`) as the single source of list visibility, with static trigger label, list-only helper tooltip, per-option explanatory tooltips/checkbox indicators, and active-filter chips → src/listPanel.filterBar.js
- Book visibility control/chip layout (chips wrap beside the menu trigger/help icon instead of dropping below by default) → style.css

## Sorting & ordering

- Sort enum definitions and sort-direction constants → src/constants.js
- Global sort settings and persistence bridge (`extension_settings.worldInfoDrawer`) → src/Settings.js
- Entry sort implementations (title, trigger, prompt, position, depth, order, uid, length, custom) → src/sortHelpers.js
- Sort option labels/options for dropdowns → src/utils.js
- Book-level sort choice resolution and DOM reorder application → src/listPanel.js
- Per-book metadata sort read/write (`stwid.sort`) → src/sortHelpers.js, src/listPanel.js

## Persistence & settings

- Extension settings object serialization/save (`sortLogic`, `sortDirection`, `useBookSorts`) → src/Settings.js
- Folder registry storage and normalization → src/lorebookFolders.js
- Folder collapse state storage → src/listPanel.js
- Order Helper persisted state keys (`sort`, `hide-keys`, `columns`) → src/orderHelperState.js
- Order Helper local state keys (`start`, `step`, `direction`, `filter`) → src/orderHelperRender.js
- List panel width persistence (`stwid--list-width`) → index.js

## Integration with SillyTavern

- Core World Info API usage (load/save/create/delete book/entry) → index.js, src/listPanel.js, src/orderHelperRender.js
- Event bus subscriptions (`WORLDINFO_UPDATED`, `WORLDINFO_SETTINGS_UPDATED`, context events) → index.js
- Core template usage (`renderTemplateAsync`, `getWorldEntry`) → src/editorPanel.js, index.js
- Delegation to core World Info UI buttons for rename/delete/duplicate actions → src/listPanel.bookMenu.js, src/listPanel.coreBridge.js
- Optional extension/plugin menu integration (Bulk Edit, External Editor, STLO) → src/listPanel.bookMenu.js, index.js

## Advanced tools (Order Helper)

- Order Helper open/close orchestration and scope selection (Book Visibility scope, single book override, folder-within-visibility scope) → index.js, src/orderHelper.js, src/listPanel.js, src/lorebookFolders.js
- Order Helper state creation (defaults + restored localStorage state) → src/orderHelperState.js
- Derived filter-option sets (strategy/position/outlet/automation ID/group) → src/orderHelper.js
- Table renderer and control bar (sort, select-all, filter toggle, apply order) → src/orderHelperRender.js
- Row drag sorting and custom order persistence (`extensions.display_index`) → src/orderHelperRender.js, src/orderHelper.js
- Start/spacing/direction apply-to-order workflow → src/orderHelperRender.js
- Row-level inline edits (enabled, strategy, position, depth, outlet, group, prioritize, order, sticky, cooldown, delay, automation ID, trigger) → src/orderHelperRender.js
- Recursion flags and budget-ignore controls → src/orderHelperRender.js
- Column visibility controls and hide-keys toggle → src/orderHelperRender.js, src/orderHelperState.js
- Structured row filters (strategy, position, recursion, outlet, automation ID, group) → src/orderHelperFilters.js, src/orderHelperRender.js
- Script-based filtering with SlashCommandParser + syntax-highlighted input → src/orderHelperRender.js
- Live preview panel for script filter context data → src/orderHelper.js, src/orderHelperRender.js
- Character filter column display (read-only) → src/orderHelperRender.js
- Focus entry in main list/editor from Order Helper row link → src/orderHelper.js, src/orderHelperRender.js
