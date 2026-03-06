# FEATURE MAP

Where each feature or behavior is implemented in the codebase.

For module design intent, see the Module Responsibilities table in `ARCHITECTURE.md`; this file lists specific behaviors, not module descriptions.

## Startup & Wiring

- Extension startup and settings panel injection → index.js
- Dev CSS watch/reload via FilesPluginApi → index.js
- Public `jumpToEntry` API → index.js
- Incremental cache updates after World Info changes → src/shared/wi-update-handler.js
- Update waiting/token coordination for async UI actions → src/shared/wi-update-handler.js, src/shared/utils.js
- Source-link detection and attribution metadata refresh → src/book-browser/book-list/book-list.book-source-links.js
- Source-link filter refresh after map updates → src/book-browser/book-list/book-list.book-source-links.js
- Source-link icons and attribution tooltips on book rows → src/book-browser/book-browser.js

## Drawer & Splitter

- Drawer DOM bootstrap and panel wiring → src/drawer.js
- Drawer keyboard delete handling for selected entries → src/drawer.js
- Duplicate-entry refresh queue reopen handling → src/shared/wi-update-handler.js, src/drawer.js
- Splitter drag/resize on desktop and mobile → src/drawer.splitter.js
- Splitter size persistence and legacy key compatibility (`stwid--splitter-size`, `stwid--splitter-size-mobile`, `stwid--list-width`, `stwid--list-height`) → src/drawer.splitter.js

## Book Browser - Books

- Book list rendering and insertion order → src/book-browser/book-list/book-list.books-view.js
- Book active toggle → src/book-browser/book-list/book-list.books-view.js
- Book collapse and expand behavior → src/book-browser/book-list/book-list.books-view.js, src/book-browser/book-browser.js
- Collapse all books control → src/drawer.js, src/book-browser/book-browser.js
- Book drag/drop between root and folders → src/book-browser/book-list/book-list.books-view.js, src/book-browser/book-list/book-list.selection-dnd.js, src/book-browser/book-browser.js
- Ctrl-drag book copy flow → src/book-browser/book-list/book-list.selection-dnd.js, src/book-browser/book-browser.js
- Book context menu actions → src/book-browser/book-list/book-list.book-menu.js
- Book context menu keyboard and ARIA behavior → src/book-browser/book-list/book-list.book-menu.js
- Fill empty entry titles from keywords → src/shared/wi-update-handler.js, src/book-browser/book-list/book-list.book-menu.js

## Book Browser - Folders

- Folder metadata key handling (`metadata.folder`) → src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js
- Folder registry persistence (`stwid--folder-registry`) → src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js
- Folder DOM creation → src/book-browser/book-list/book-folders/book-folders.folder-dom.js
- Folder collapse state persistence (`stwid--folder-collapse-states`) → src/book-browser/book-browser.state.js
- Folder collapse and expand behavior → src/book-browser/book-list/book-folders/book-folders.folders-view.js, src/book-browser/book-browser.js
- Collapse all folders control → src/drawer.js, src/book-browser/book-list/book-folders/book-folders.folders-view.js
- Folder visibility refresh under search and visibility filters → src/book-browser/book-list/book-folders/book-folders.folders-view.js
- Folder active-toggle tri-state refresh → src/book-browser/book-list/book-folders/book-folders.folders-view.js
- Folder context menu actions → src/book-browser/book-list/book-folders/book-folders.folder-actions.js
- Create a new book inside a folder → src/book-browser/book-list/book-folders/book-folders.folder-actions.js
- Set all books in a folder active or inactive → src/book-browser/book-list/book-folders/book-folders.folder-actions.js

## Book Browser - Tabs

- Browser tab strip order and active-tab switching → src/book-browser/browser-tabs/browser-tabs.js, style.css
- Settings tab content → src/book-browser/browser-tabs/browser-tabs.settings-tab.js
- Lorebooks tab content → src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js
- Folders tab content → src/book-browser/browser-tabs/browser-tabs.folders-tab.js
- Visibility tab mount flow → src/book-browser/browser-tabs/browser-tabs.js, src/book-browser/browser-tabs/browser-tabs.visibility-tab.js
- Sorting tab mount flow → src/book-browser/browser-tabs/browser-tabs.js, src/book-browser/browser-tabs/browser-tabs.sorting-tab.js
- Search tab mount flow → src/book-browser/browser-tabs/browser-tabs.js, src/book-browser/browser-tabs/browser-tabs.search-tab.js
- Search books by name → src/book-browser/browser-tabs/browser-tabs.search-tab.js, src/book-browser/browser-tabs/browser-tabs.js
- Search entries by title and keys → src/book-browser/browser-tabs/browser-tabs.search-tab.js, src/book-browser/browser-tabs/browser-tabs.js
- Book visibility filter presets and source filters → src/book-browser/browser-tabs/browser-tabs.visibility-tab.js, src/book-browser/browser-tabs/browser-tabs.js
- Visibility filter chips and trigger layout → src/book-browser/browser-tabs/browser-tabs.js, style.css
- Visibility tab row contents → src/book-browser/browser-tabs/browser-tabs.js, src/book-browser/browser-tabs/browser-tabs.settings-tab.js, style.css

## Entry Rows

- Entry row rendering → src/book-browser/book-list/book-list.world-entry.js
- Entry enable/disable toggle → src/book-browser/book-list/book-list.world-entry.js
- Entry strategy selector → src/book-browser/book-list/book-list.world-entry.js
- Entry click-to-open editor flow → src/book-browser/book-list/book-list.world-entry.js, src/editor-panel/editor-panel.js
- Entry creation inside the selected book → src/book-browser/book-list/book-list.books-view.js
- Entry move/copy/duplicate across books → src/book-browser/book-list/book-list.selection-dnd.js, src/book-browser/book-list/book-list.world-entry.js
- Entry state mapping (`normal`, `constant`, `vectorized`) → src/book-browser/book-list/book-list.world-entry.js

## Selection & Drag-Drop

- Entry selection state model → src/book-browser/book-list/book-list.selection-dnd.js
- Book Browser state for selection, drag, search, visibility, and collapse → src/book-browser/book-browser.state.js
- Click selection → src/book-browser/book-list/book-list.world-entry.js
- Toggle selection → src/book-browser/book-list/book-list.world-entry.js
- Shift-range selection → src/book-browser/book-list/book-list.world-entry.js
- Selection visual state helpers → src/book-browser/book-list/book-list.selection-dnd.js
- Delete selected entries → src/drawer.js, src/shared/wi-update-handler.js

## Editor Panel

- Entry editor render pipeline → src/editor-panel/editor-panel.js
- Editor dirty tracking during refresh → src/editor-panel/editor-panel.js, src/shared/wi-update-handler.js
- Editor reset and clear behavior → src/editor-panel/editor-panel.js
- Active-row highlight control → src/editor-panel/editor-panel.js
- Editor focus and unfocus UI toggles → src/editor-panel/editor-panel.js
- Embedded global activation settings panel (`#wiActivationSettings`) → src/editor-panel/editor-panel.js
- Additional Matching Sources section → src/editor-panel/editor-panel.js

## Entry Manager

- Entry Manager open/close flow → src/drawer.js, src/entry-manager/entry-manager.js
- Entry Manager scope selection → src/drawer.js, src/entry-manager/entry-manager.js, src/book-browser/book-browser.js, src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js
- Entry Manager restored/default UI state → src/entry-manager/logic/logic.state.js
- Derived filter-option sets → src/entry-manager/entry-manager.js
- Display toolbar controls → src/entry-manager/display-tab/display-tab.display-toolbar.js, src/entry-manager/bulk-editor-tab/bulk-editor-tab.js
- Entry Manager tab bar → src/entry-manager/bulk-editor-tab/bulk-editor-tab.js
- Bulk edit row assembly → src/entry-manager/bulk-editor-tab/bulk-edit-row.js
- Bulk edit row section builders → src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js, src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js, src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js
- Bulk edit row helper primitives → src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js
- Dirty indicator on bulk edit apply buttons → src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js, src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js, src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js, src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js, style.css
- Apply All Changes flow → src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js
- Table header and column filter menus → src/entry-manager/table/table.header.js
- Table body row rendering → src/entry-manager/table/table.body.js
- Row drag sorting and custom order persistence (`extensions.display_index`) → src/entry-manager/table/table.body.js, src/entry-manager/entry-manager.js
- Row-level inline edits → src/entry-manager/table/table.body.js
- Recursion flags and budget-ignore controls → src/entry-manager/table/table.body.js
- Structured row filters → src/entry-manager/logic/logic.filters.js, src/entry-manager/table/table.header.js, src/entry-manager/table/table.body.js
- Script-based filtering → src/entry-manager/table/table.filter-panel.js
- Live preview panel for script filter context data → src/entry-manager/entry-manager.js, src/entry-manager/table/table.filter-panel.js
- Character filter column display → src/entry-manager/table/table.body.js
- Focus entry in the main list/editor from an Entry Manager row → src/entry-manager/entry-manager.js, src/entry-manager/table/table.body.js
- Shared multiselect dropdown helpers → src/entry-manager/entry-manager.utils.js
- Shared collapse-row animation wiring → src/entry-manager/entry-manager.utils.js

## Sorting

- Sort enums and direction constants → src/shared/constants.js
- Global sort settings persistence bridge (`extension_settings.worldInfoDrawer`) → src/shared/settings.js
- Sort implementations → src/shared/sort-helpers.js
- Sort option labels → src/shared/utils.js
- Sorting tab controls layout → src/book-browser/browser-tabs/browser-tabs.sorting-tab.js, src/book-browser/browser-tabs/browser-tabs.js, style.css
- Book-level sort resolution and DOM reorder application → src/book-browser/book-browser.js, src/book-browser/book-list/book-list.books-view.js
- Per-book sort preference menu → src/book-browser/book-list/book-list.book-menu.js, src/book-browser/book-browser.js, src/shared/sort-helpers.js
- Clear all per-book sort preferences → src/book-browser/book-list/book-list.book-menu.js, src/book-browser/book-browser.js, src/shared/sort-helpers.js

## Persistence, Settings & ST Integration

- Extension settings serialization and save (`sortLogic`, `sortDirection`, `useBookSorts`) → src/shared/settings.js
- Feature toggle settings persistence (`featureBulkEditor`, `featureFolderGrouping`, `featureAdditionalMatchingSources`) → src/shared/settings.js
- Entry Manager persisted state keys (`sort`, `hide-keys`, `columns`) → src/entry-manager/logic/logic.state.js
- Entry Manager local state keys (`start`, `step`, `direction`, `filter`) → src/entry-manager/bulk-editor-tab/bulk-editor-tab.js
- ST Extensions drawer settings template and wiring → settings.html, index.js
- Feature visibility registry and runtime apply loop → index.js
- Entry Manager toggle button visibility wiring → src/book-browser/browser-tabs/browser-tabs.settings-tab.js
- Entry Manager disabled-feature guard → src/entry-manager/entry-manager.js
- Folder row visibility under feature toggles → src/book-browser/book-list/book-folders/book-folders.folders-view.js
- Folder control button visibility under feature toggles → src/drawer.js
- Additional Matching Sources settings toggle wiring → settings.html, index.js, src/shared/settings.js
- Core World Info API usage for book and entry CRUD → src/drawer.js, src/shared/wi-update-handler.js, src/book-browser/book-browser.js, src/entry-manager/bulk-editor-tab/bulk-editor-tab.js
- Event bus subscriptions for World Info and context changes → src/shared/wi-update-handler.js, src/book-browser/book-list/book-list.book-source-links.js
- Core template usage (`renderTemplateAsync`, `getWorldEntry`) → src/editor-panel/editor-panel.js, src/drawer.js
- Delegation to core World Info UI buttons → src/book-browser/book-list/book-list.book-menu.js, src/book-browser/book-browser.core-bridge.js
- Core WI DOM delegation helpers and selector map → src/book-browser/book-browser.core-bridge.js
- Optional plugin and extension integrations (Bulk Edit, External Editor, STLO) → src/book-browser/book-list/book-list.extension-integrations.js
- Integration menu items wired into book menu → src/book-browser/book-list/book-list.book-menu.js
- Entry Manager table column and option schema constants → src/shared/constants.js


