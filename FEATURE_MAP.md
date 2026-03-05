# FEATURE MAP

Where each feature or behavior is implemented in the codebase.

## Bootstrap & runtime sync

- Extension startup/module composition → index.js
- Drawer DOM bootstrap and panel wiring → src/drawer.js
- List-panel slice composition/dependency wiring and exported list-panel API surface → src/book-browser/book-browser.js
- Dev CSS watch/reload via FilesPluginApi (when available) → index.js
- Incremental cache updates after World Info changes (books and entries) → src/shared/wi-update-handler.js
- World Info update waiting/token coordination for async UI actions → src/shared/wi-update-handler.js, src/shared/utils.js
- Book source-link detection (character/chat/persona), attribution metadata (character/persona names), and refresh triggers → src/book-browser/book-list/book-list.book-source-links.js
- Source-link refresh applying list visibility filters after map updates → src/book-browser/book-list/book-list.book-source-links.js
- Source-link icon rendering on book rows, including attribution tooltips/aria labels for character/persona links → src/book-browser/book-browser.js
- Jump-to-entry API (open book, scroll, focus editor) → index.js
- Drawer keyboard handling for selected-entry delete → src/drawer.js
- List/editor splitter drag resize (desktop width + mobile top/bottom height) and saved splitter state (`stwid--splitter-size`, `stwid--splitter-size-mobile`, with legacy `stwid--list-width`/`stwid--list-height` compatibility) → src/drawer.splitter.js

## Book-level behavior

- Book list rendering and insertion order → src/book-browser/book-list/book-list.books-view.js
- Top control row (new book, new folder, import book, import folder, collapse/expand all books, collapse/expand all folders, activation settings, refresh), including thin-container groups: Lorebooks (new/import/collapse-all-books), Folders (new/import/collapse-all-folders), and Settings (activation + refresh). On mobile (<= 1000 px), `stwid--controlsRow` is moved into the `Controls` icon tab and its original wrapper is hidden. → src/drawer.js, src/book-browser/book-browser.js, src/book-browser/browser-tabs/browser-tabs.filter-bar.js
- Book active toggle (global active status) → src/book-browser/book-list/book-list.books-view.js
- Book collapse/expand and collapse-all behavior → src/book-browser/book-list/book-list.books-view.js, src/book-browser/book-browser.js, src/drawer.js
- Book drag/drop between folders and root, including Ctrl-copy duplicate flow → src/book-browser/book-list/book-list.books-view.js, src/book-browser/book-list/book-list.selection-dnd.js, src/book-browser/book-browser.js
- Book context menu actions (rename, move folder, duplicate, export, delete) → src/book-browser/book-list/book-list.book-menu.js
- Book context menu accessibility and behavior: `aria-expanded`/`aria-haspopup` on trigger, `role="menu"`/`role="menuitem"` on container/items, keyboard open (Enter/Space), focus return to trigger on close, centralized close via `MULTISELECT_DROPDOWN_CLOSE_HANDLER`, all actions close the menu → src/book-browser/book-list/book-list.book-menu.js
- Fill empty entry titles from keywords (book action) → src/shared/wi-update-handler.js, src/book-browser/book-list/book-list.book-menu.js
- Per-book sort preference menu + clear all preferences → src/book-browser/book-list/book-list.book-menu.js, src/book-browser/book-browser.js, src/shared/sort-helpers.js

## Folder behavior

- Folder metadata key handling on lorebook metadata (`folder`) → src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js
- Folder registry persistence (`stwid--folder-registry`) → src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js
- Folder DOM creation (header, count, active toggle, collapse toggle) → src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js
- Folder collapse state persistence (`stwid--folder-collapse-states`) → src/book-browser/book-browser.state.js
- Folder collapse/expand-all toggle behavior (all folders, transient expand path) → src/book-browser/book-list/book-folders/book-folders.folders-view.js, src/book-browser/book-browser.js, src/drawer.js
- Folder visibility refresh while search/visibility filters are active → src/book-browser/book-list/book-folders/book-folders.folders-view.js
- Folder active-toggle tri-state refresh based on currently visible books → src/book-browser/book-list/book-folders/book-folders.folders-view.js
- Folder context menu actions (rename, import into folder, export folder, delete folder) → src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js
- Create new book directly inside a folder → src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js
- Set active/inactive state for all books in a folder → src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js

## Entry-level behavior

- Entry row rendering (title/comment, keys, status/actions area) → src/book-browser/book-list/book-list.world-entry.js
- Entry enable/disable toggle and strategy selector on row → src/book-browser/book-list/book-list.world-entry.js
- Entry click-to-open editor flow → src/book-browser/book-list/book-list.world-entry.js, src/editor-panel/editor-panel.js
- Entry creation inside a selected book → src/book-browser/book-list/book-list.books-view.js
- Entry move/copy/duplicate across books with selection + drag/drop → src/book-browser/book-list/book-list.selection-dnd.js, src/book-browser/book-list/book-list.world-entry.js
- Entry state mapping (`normal`/`constant`/`vectorized`) → src/book-browser/book-list/book-list.world-entry.js

## Editor behavior

- Entry editor render pipeline (template header + `getWorldEntry`) → src/editor-panel/editor-panel.js
- Editor dirty tracking to prevent refresh from discarding unsaved edits → src/editor-panel/editor-panel.js, src/shared/wi-update-handler.js
- Editor reset/clear and active-row highlight control → src/editor-panel/editor-panel.js
- Focus/unfocus editor UI toggles → src/editor-panel/editor-panel.js
- Global activation settings panel embedding/toggling (`#wiActivationSettings`) → src/editor-panel/editor-panel.js
- Duplicate-entry button refresh queue/reopen behavior → src/shared/wi-update-handler.js, src/drawer.js

## Selection & interaction

- Entry selection state model (source book, last clicked, selected uid list, toast) → src/book-browser/book-list/book-list.selection-dnd.js
- List panel state container for selection/drag/search/visibility/collapse locals + lifecycle resets/hydration → src/book-browser/book-browser.state.js
- Click select, toggle select, and Shift range select behavior → src/book-browser/book-list/book-list.world-entry.js
- Selection visual state add/remove/clear helpers → src/book-browser/book-list/book-list.selection-dnd.js
- Delete selected entries (Del key) with save/update propagation → src/drawer.js, src/shared/wi-update-handler.js
- Search books by name and optional entry text search (title/keys) → src/book-browser/browser-tabs/browser-tabs.filter-bar.js
- List-panel icon tabs (`Visibility`, `Sorting`, `Search`) with active-state switching and real control rows mounted per tab. On mobile (<= 1000 px), a `Controls` tab is prepended as the first/default tab and contains `stwid--controlsRow`. → src/book-browser/browser-tabs/browser-tabs.filter-bar.js, style.css
- Book visibility filter (`All Books` default exclusive preset, `All Active` exclusive preset, and multi-select `Global`/`Chat`/`Persona`/`Character`) as the single source of list visibility, with icon-only trigger button, list/order-helper scope tooltip, per-option explanatory tooltips/checkbox indicators, and active-filter chips → src/book-browser/browser-tabs/browser-tabs.filter-bar.js
- Book visibility control/chip layout (chips wrap inline beside the trigger button; no separate help icon in the row) → style.css
- Visibility tab row (`stwid--visibilityRow`) groups Entry Manager toggle + Book Visibility trigger + chips; activation/refresh actions live in the top `stwid--controlsRow` Settings group (owned by `src/drawer.js`) → src/book-browser/browser-tabs/browser-tabs.filter-bar.js, src/drawer.js, style.css

## Sorting & ordering

- Sort enum definitions and sort-direction constants → src/shared/constants.js
- Global sort settings and persistence bridge (`extension_settings.worldInfoDrawer`) → src/shared/settings.js
- Entry sort implementations (title, trigger, prompt, position, depth, order, uid, length, custom) → src/shared/sort-helpers.js
- Sort option labels/options for dropdowns → src/shared/utils.js
- Sorting controls row (`stwid--sortingRow`) split into two labeled thin containers: `Global Sorting` (sort select + `stwid--smallSelectTextPole`) and `Per-book Sorting` (enable/disable toggle + clear preferences); mounted in icon tab 2 (`Sorting`) → src/drawer.js, src/book-browser/browser-tabs/browser-tabs.filter-bar.js, style.css
- Book-level sort choice resolution and DOM reorder application → src/book-browser/book-browser.js, src/book-browser/book-list/book-list.books-view.js
- Per-book metadata sort read/write (`stwid.sort`) → src/shared/sort-helpers.js, src/book-browser/book-browser.js

## Persistence & settings

- Extension settings object serialization/save (`sortLogic`, `sortDirection`, `useBookSorts`) → src/shared/settings.js
- Feature toggle settings persistence (`featureBulkEditor`, `featureFolderGrouping`) → src/shared/settings.js
- Folder registry storage and normalization → src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js
- Folder collapse state storage → src/book-browser/book-browser.state.js
- Entry Manager persisted state keys (`sort`, `hide-keys`, `columns`) → src/entry-manager/logic/logic.state.js
- Entry Manager local state keys (`start`, `step`, `direction`, `filter`) → src/entry-manager/bulk-editor/bulk-editor.js
- List panel width persistence (`stwid--splitter-size`) and mobile list height persistence (`stwid--splitter-size-mobile`) with legacy key mirroring (`stwid--list-width`, `stwid--list-height`) → src/drawer.splitter.js

## Settings panel

- ST Extensions drawer settings panel template (`settings.html`) and injection/wiring logic → index.js
- Feature visibility registry and runtime apply loop for UI toggles → index.js
- Entry Manager toggle button hide/show wiring in Visibility tab → src/book-browser/browser-tabs/browser-tabs.filter-bar.js
- Entry Manager open guard when feature is disabled → src/entry-manager/entry-manager.js
- Folder rows hide/show behavior for feature toggling → src/book-browser/book-list/book-folders/book-folders.folders-view.js
- Folder control buttons hide/show behavior (New Folder, Import Folder, Collapse/Expand Folders) → src/drawer.js

## Integration with SillyTavern

- Core World Info API usage (load/save/create/delete book/entry) → src/drawer.js, src/shared/wi-update-handler.js, src/book-browser/book-browser.js, src/entry-manager/bulk-editor/bulk-editor.js
- Event bus subscriptions (`WORLDINFO_UPDATED`, `WORLDINFO_SETTINGS_UPDATED`, context events) → src/shared/wi-update-handler.js, src/book-browser/book-list/book-list.book-source-links.js
- Core template usage (`renderTemplateAsync`, `getWorldEntry`) → src/editor-panel/editor-panel.js, src/drawer.js
- Delegation to core World Info UI buttons for rename/delete/duplicate actions → src/book-browser/book-list/book-list.book-menu.js, src/book-browser/book-browser.core-bridge.js
- Core WI DOM delegation helpers (`waitForDom`, `setSelectedBookInCoreUi`, `clickCoreUiAction`) and selector map ownership → src/book-browser/book-browser.core-bridge.js
- Optional extension/plugin menu integration (Bulk Edit, External Editor, STLO) → src/book-browser/book-list/book-list.book-menu.js, src/drawer.js

## Advanced tools (Entry Manager)

- Entry Manager open/close orchestration and scope selection (Book Visibility scope, single book override, folder-within-visibility scope) → src/drawer.js, src/entry-manager/entry-manager.js, src/book-browser/book-browser.js, src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js
- Entry Manager state creation (defaults + restored localStorage state) → src/entry-manager/logic/logic.state.js
- Derived filter-option sets (strategy/position/outlet/automation ID/group) → src/entry-manager/entry-manager.js
- Visibility row (select-all, key toggle, column visibility, sort, script filter toggle, entry count, active filter chips with X clear) → src/entry-manager/bulk-editor/bulk-editor.action-bar.visibility-row.js, src/entry-manager/bulk-editor/bulk-editor.js
- Bulk edit row structure (field containers: Select, State, Strategy, Position, Depth, Order, Recursion, Budget, Probability, Sticky, Cooldown, Delay, Apply All Changes) → src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js
- Dirty indicator on bulk edit Apply buttons (amber highlight when inputs changed, clears on successful apply) → src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js, style.css
- Apply All Changes container (runs all dirty containers in sequence, skips clean ones) → src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js
- Row drag sorting and custom order persistence (`extensions.display_index`) → src/entry-manager/bulk-editor/bulk-editor.table-body.js, src/entry-manager/entry-manager.js
- Row-level inline edits (enabled, strategy, position, depth, outlet, group, prioritize, order, sticky, cooldown, delay, automation ID, trigger) → src/entry-manager/bulk-editor/bulk-editor.table-body.js
- Recursion flags and budget-ignore controls → src/entry-manager/bulk-editor/bulk-editor.table-body.js
- Column visibility controls and hide-keys toggle → src/entry-manager/bulk-editor/bulk-editor.action-bar.visibility-row.js, src/entry-manager/logic/logic.state.js
- Structured row filters (strategy, position, recursion, outlet, automation ID, group) → src/entry-manager/logic/logic.filters.js, src/entry-manager/bulk-editor/bulk-editor.table-header.js, src/entry-manager/bulk-editor/bulk-editor.table-body.js
- Script-based filtering with SlashCommandParser + syntax-highlighted input → src/entry-manager/bulk-editor/bulk-editor.filter-panel.js
- Live preview panel for script filter context data → src/entry-manager/entry-manager.js, src/entry-manager/bulk-editor/bulk-editor.filter-panel.js
- Character filter column display (read-only) → src/entry-manager/bulk-editor/bulk-editor.table-body.js
- Focus entry in main list/editor from Entry Manager row link → src/entry-manager/entry-manager.js, src/entry-manager/bulk-editor/bulk-editor.table-body.js
- Shared multiselect dropdown DOM helpers (open/close/outside-click/checkbox); `closeOpenMultiselectDropdownMenus` closes both multiselect and list dropdown menus and returns focus to trigger; `wireCollapseRow` wires collapse/expand animation shared by Visibility and Bulk Editor rows → src/entry-manager/bulk-editor/bulk-editor.utils.js
- Entry Manager table column/option schema constants → src/shared/constants.js


