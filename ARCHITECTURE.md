# Architecture Overview

## 1. Project Structure

[Project Root]/
|-- index.js                     # Extension entry point; composes module initialization and public API
|-- style.css                    # Extension styles
|-- manifest.json                # SillyTavern extension manifest
|-- src/
|   |-- drawer.js                # Drawer UI bootstrap + DOM map + control wiring
|   |-- drawer.splitter.js       # Desktop splitter DOM + drag/resize + size persistence + layout restore
|   |-- book-browser/
|   |   |-- book-browser.js                    # Book Browser composition + orchestration
|   |   |-- book-browser.state.js              # Book Browser state container
|   |   |-- book-browser.core-bridge.js        # Core WI DOM delegation helpers
|   |   |-- browser-tabs/
|   |   |   |-- browser-tabs.js                # Browser tabs + filters/search/visibility
|   |   |   |-- browser-tabs.lorebooks-tab.js  # Lorebooks tab content
|   |   |   |-- browser-tabs.settings-tab.js   # Settings tab content
|   |   |   |-- browser-tabs.visibility-tab.js # Visibility tab mount helper
|   |   |   |-- browser-tabs.sorting-tab.js    # Sorting tab mount helper
|   |   |   |-- browser-tabs.search-tab.js     # Search tab mount helper
|   |   |   └-- browser-tabs.folders-tab.js    # Folders tab content
|   |   └-- book-list/
|   |       |-- book-list.books-view.js        # Book list render/load + row wiring
|   |       |-- book-list.book-menu.js         # Per-book dropdown menu actions
|   |       |-- book-list.extension-integrations.js # Third-party integration menu items
|   |       |-- book-list.selection-dnd.js     # Entry selection + drag/drop handlers
|   |       |-- book-list.world-entry.js       # Entry row renderer + row interactions
|   |       |-- book-list.book-source-links.js # Character/chat/persona source-link tracking
|   |       └-- book-folders/
|   |           |-- book-folders.folders-view.js      # Folder view DOM/collapse wiring
|   |           |-- book-folders.lorebook-folders.js  # Folder metadata + registry + folder data helpers
|   |           |-- book-folders.folder-actions.js     # Folder actions (create/toggle/menu handlers)
|   |           └-- book-folders.folder-dom.js         # Folder DOM construction + count/collapse helpers
|   |-- editor-panel/
|   |   |-- editor-panel.js                    # Entry editor panel integration with ST templates
|   |   └-- editor-panel-mobile.js             # Mobile entry editor header layout transforms
|   |-- entry-manager/
|   |   |-- entry-manager.js                   # Entry Manager orchestration
|   |   |-- logic/
|   |   |   |-- logic.state.js                 # Entry Manager persisted/default UI state
|   |   |   └-- logic.filters.js               # Entry Manager filter logic
|   |   |-- action-bar.helpers.js              # Shared action bar row helpers (used by both tabs)
|   |   |-- entry-manager.utils.js            # Shared Entry Manager utilities
|   |   |-- display-tab/
|   |   |   └-- display-tab.display-toolbar.js # Display toolbar controls
|   |   |-- bulk-editor-tab/
|   |   |   |-- bulk-editor-tab.js            # Bulk editor orchestrator
|   |   |   |-- bulk-edit-row.js              # Bulk edit row assembly
|   |   |   |-- bulk-edit-row.helpers.js      # Bulk edit row shared primitives
|   |   |   |-- bulk-edit-row.sections.js     # Bulk edit row section builders
|   |   |   |-- bulk-edit-row.position.js     # Position/depth/outlet section builder
|   |   |   └-- bulk-edit-row.order.js        # Order section builder
|   |   └-- table/
|   |       |-- table.filter-panel.js         # Script filter panel + preview wiring
|   |       |-- table.header.js               # Bulk editor table header
|   |       └-- table.body.js                 # Bulk editor table body
|   └-- shared/
|       |-- settings.js                        # Persistent extension settings singleton
|       |-- constants.js                       # Sort enums/constants
|       |-- sort-helpers.js                    # Sorting + metadata sort preference helpers
|       |-- utils.js                           # Shared UI/util helpers
|       └-- wi-update-handler.js               # WORLDINFO update engine
|-- docs/
|   |-- user/                    # End-user and behavior docs (World Info / extension logic, state maps)
|   |-- SillyTavernExtensionsDocumentation.md  # ST extension best-practice reference
|-- tasks/                        # Planning and task tracking docs
|   |-- main-tasks/               # Tasks going through the formal main-tasks pipeline
|   |   |-- documented-tasks/     # Analyzed and spec'd, ready to implement
|   |   |-- implemented-tasks/    # Implemented, pending post-implementation review
|   |   |-- finished-tasks/       # Fully reviewed and complete
|   |   |-- issues-found/         # Issues flagged during review, awaiting triage
|   |   |-- pending-fix/          # Blocked — needs a fix before marking done
|   |   └-- pending-manual-check/ # Needs manual browser verification
|   |-- code-reviews/             # Per-module code review task files
|   |   └-- finished/             # Completed code reviews
|   |-- workflows/                # Pipeline workflow definitions and templates
|   └-- main-tasks-queue.md       # Current task queue and pipeline state
|-- test/                        # Vitest unit tests (utils/folders)
|-- scripts/                     # Repository automation scripts/prompts
|-- .github/
|   └-- workflows/               # CI, CodeQL, test, and release prep workflows
|-- vendor/
|   └-- SillyTavern/             # Reference-only submodule (do not modify)
|-- README.md
|-- CHANGELOG.md
|-- AGENTS.md
|-- SILLYTAVERN_OWNERSHIP_BOUNDARY.md  # Ownership contract: vanilla ST vs extension responsibilities and safe integration surfaces
|-- STYLE_GUIDE.md               # UI/CSS rules emphasizing reuse of existing SillyTavern styles before adding extension CSS
|-- FEATURE_MAP.md               # Feature-to-module index showing where each behavior is implemented
└-- ARCHITECTURE.md              # This document

### Module Responsibilities

> For the feature-level detail of which module owns which specific behavior, see `FEATURE_MAP.md`.

| Module | Design Intent |
| --- | --- |
| `index.js` | Extension entry point; composes module initialization, injects/wires ST Extensions settings panel, applies feature visibility registry, and exposes `jumpToEntry` public API |
| `drawer.js` | Owns drawer DOM map, bootstrap flow, top/settings control rows, folder-controls visibility hooks, and global interaction wiring |
| `src/drawer.splitter.js` | Desktop splitter DOM creation, drag-resize handlers, size persistence, and layout-restore logic |
| `src/book-browser/book-list/book-list.book-source-links.js` | Derives and tracks lorebook source links (character/chat/persona); refreshes icons and filters |
| `src/shared/wi-update-handler.js` | Owns WORLDINFO event handling, incremental cache sync, update-wait primitives, and duplicate-refresh queue |
| `src/book-browser/book-browser.js` | Composes Book Browser slices and shared orchestration; exposes consolidated Book Browser API |
| `src/book-browser/book-list/book-list.books-view.js` | Book row render and full list load pipeline; wires per-book interactions |
| `src/book-browser/book-list/book-folders/book-folders.folders-view.js` | Folder view wiring: DOM creation, collapse state sync, visibility/active-toggle refresh, and folder-grouping visibility state |
| `src/book-browser/book-list/book-list.book-menu.js` | Per-book dropdown menu: triggers, ARIA, keyboard support, actions, and import dialog helpers |
| `src/book-browser/book-list/book-list.extension-integrations.js` | Third-party extension integration menu items (Bulk Edit, External Editor, STLO): presence checks and menu item builders |
| `src/book-browser/browser-tabs/browser-tabs.js` | Thin orchestrator for icon-tab strip and shared multiselect dropdown helpers; wires tab content mounting and delegates search/visibility builders to tab modules |
| `src/book-browser/browser-tabs/browser-tabs.lorebooks-tab.js` | Builds the Lorebooks tab content (Lorebooks thinContainer) |
| `src/book-browser/browser-tabs/browser-tabs.settings-tab.js` | Builds the Settings tab content (Activation, Refresh, Entry Manager toggle) |
| `src/book-browser/browser-tabs/browser-tabs.visibility-tab.js` | Owns `BOOK_VISIBILITY_MODES`, `createVisibilitySlice`, `buildVisibilityDropdownSection`, and Visibility tab mount helper |
| `src/book-browser/browser-tabs/browser-tabs.sorting-tab.js` | Builds the Sorting tab content (Global Sorting dropdown, Per-book Sorting toggle and clear) and mounts it into the tab container |
| `src/book-browser/browser-tabs/browser-tabs.search-tab.js` | Owns `buildSearchRow` builder and Search tab mount helper |
| `src/book-browser/browser-tabs/browser-tabs.folders-tab.js` | Builds the Folders tab content: Folders thinContainer (New Folder, Import Folder, Collapse All Folders) |
| `src/book-browser/book-browser.state.js` | Module-local mutable state container + lifecycle helpers (reset/hydration) |
| `src/book-browser/book-list/book-list.selection-dnd.js` | Entry selection UI helpers; entry/book drag-drop move-copy persistence |
| `src/book-browser/book-browser.core-bridge.js` | Core WI DOM delegation utilities for rename/duplicate/delete actions |
| `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js` | Folder metadata, registry helpers, and folder book/active-state data utilities (no DOM/actions) |
| `src/book-browser/book-list/book-folders/book-folders.folder-actions.js` | Folder actions: create book in folder, set folder books active/inactive, and folder menu actions (rename/import/export/Entry Manager/delete) |
| `src/book-browser/book-list/book-folders/book-folders.folder-dom.js` | Folder DOM construction (`createFolderDom`) plus folder count and collapse DOM helpers |
| `src/book-browser/book-list/book-list.world-entry.js` | Entry row renderer; selection UI, enable/disable toggle, click-to-open editor |
| `src/editor-panel/editor-panel.js` | Entry editor panel using ST templates; focus/unfocus and `#wiActivationSettings` embedding |
| `src/editor-panel/editor-panel-mobile.js` | Mobile layout transforms for the entry editor header and content sections; detects mobile viewport and restructures ST-rendered editor DOM for narrow screens |
| `src/entry-manager/entry-manager.js` | Entry Manager orchestration: state creation, scope gathering, derived filter options, and feature-toggle open guard |
| `src/entry-manager/logic/logic.state.js` | Entry Manager persisted state (sort/hide-keys/columns) via localStorage |
| `src/entry-manager/logic/logic.filters.js` | Filter logic for Entry Manager rows (strategy/position/recursion/outlet/group/script) |
| `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js` | Orchestrator: init, section assembly, and public bulk editor rendering API |
| `src/entry-manager/entry-manager.utils.js` | Shared DOM/utility helpers for Entry Manager slices, including multiselect dropdown wiring and collapsible row animation |
| `src/entry-manager/action-bar.helpers.js` | Shared DOM builder helper (`wrapRowContent`) used by both action-bar row modules |
| `src/entry-manager/display-tab/display-tab.display-toolbar.js` | Display toolbar: select-all, key toggle, column visibility, sort, filter chips, and entry count controls |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.js` | Bulk edit row assembly that composes all section builders and shared apply registry |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.helpers.js` | Shared bulk-edit constants and primitive helper functions |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.sections.js` | Bulk-edit section builders (select, state, strategy, recursion, budget, probability, sticky, cooldown, delay, apply-all) |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.position.js` | Position/depth/outlet bulk section builder |
| `src/entry-manager/bulk-editor-tab/bulk-edit-row.order.js` | Order bulk section builder (start/spacing/direction) |
| `src/entry-manager/table/table.filter-panel.js` | Script-based filter panel with SlashCommandParser, highlight.js, and live preview |
| `src/entry-manager/table/table.header.js` | `<thead>` with multiselect column filter menus; returns refresh-indicator callbacks |
| `src/entry-manager/table/table.body.js` | `<tbody>` entry row loop with all cell types, drag sorting, and inline edits |
| `src/shared/sort-helpers.js` | Sorting implementations and per-book sort preference read/write |
| `src/shared/utils.js` | Shared UI/utility helpers and sort option labels |
| `src/shared/constants.js` | Sort enums, direction constants, and Entry Manager column/option schema |
| `src/shared/settings.js` | Persistent extension settings singleton (`extension_settings.worldInfoDrawer`), including feature toggles |

## 2. High-Level System Diagram

[User]
   |
   v
[WorldInfo Drawer UI Extension (index.js + src/*, browser)]
   |  reads/writes via imports and ST globals
   v
[SillyTavern Frontend APIs]
   |-- world-info.js (load/save/create/delete lorebooks and entries)
   |-- templates.js (renderTemplateAsync)
   |-- event bus (WORLDINFO_UPDATED, WORLDINFO_SETTINGS_UPDATED, etc.)
   |
   v
[SillyTavern Persistence Layer]
   |-- Lorebook files/metadata managed by SillyTavern
   |-- extension_settings.worldInfoDrawer
   |-- browser localStorage (folder/order/splitter UI state)

## 3. Core Components

### 3.1. Frontend

Name: WorldInfo Drawer Extension UI

Description: Browser-side SillyTavern extension that replaces the default World Info editor with a full-screen drawer. It renders book/folder lists, entry rows, an embedded entry editor, and an Entry Manager for bulk edits/reordering. It keeps an in-memory `cache` synchronized with SillyTavern world-info state and persists UI preferences.

Technologies: Vanilla JavaScript (ES modules), DOM APIs, jQuery/jQuery UI sortable (host-provided), highlight.js (host-provided), SillyTavern frontend APIs.

Deployment: Loaded by SillyTavern as a third-party extension (`manifest.json` -> `index.js`, `style.css`).

### 3.2. Backend Services

This repository contains no backend code. It depends on SillyTavern's host backend/frontend services.

#### 3.2.1. SillyTavern World Info Service (External Host Dependency)

Name: SillyTavern World Info API surface

Description: External host functionality used by this extension for lorebook CRUD and editor rendering. Key calls include `loadWorldInfo`, `saveWorldInfo`, `createNewWorldInfo`, `createWorldInfoEntry`, `deleteWorldInfo`, `deleteWorldInfoEntry`, `getWorldEntry`, and `renderTemplateAsync`.

Technologies: SillyTavern core modules (`world-info.js`, `templates.js`, event bus modules).

Deployment: Part of the upstream SillyTavern application, not deployed from this repository.

#### 3.2.2. Optional Plugin Endpoints/Extensions (External)

Name: Optional third-party integrations

Description: Conditional UI actions for companion extensions and plugins, such as Bulk Edit, External Editor (`/api/plugins/wiee/editor`), and STLO slash command integration.

Technologies: `fetch`, SillyTavern request headers (`getRequestHeaders`), slash-command execution.

Deployment: Hosted by SillyTavern/plugin ecosystem outside this repository.

## 4. Data Stores

### 4.1. SillyTavern Lorebook Store (Host-managed)

Name: World Info book/entry persistence

Type: Host-managed file/data store (via SillyTavern `world-info.js` API)

Purpose: Stores lorebooks and entries edited through this extension.

Key Schemas/Collections: `world_names`, `selected_world_info`, per-book `entries`, per-book `metadata` (including extension folder/sort metadata).

### 4.2. Browser Persistence

Name: UI and extension preference storage

Type: `localStorage` + `extension_settings.worldInfoDrawer`

Purpose: Persists client-side UI preferences and extension behavior.

### 4.3. Runtime In-Memory State

Name: Extension cache/state maps

Type: In-memory JavaScript objects

Purpose: Fast UI rendering and incremental updates without full reload on every interaction.

Key objects: `cache`, `dom`, `currentEditor`, selection state, entry-manager state, source-link maps.

## 5. External Integrations / APIs

Service Name 1: SillyTavern core frontend modules

Purpose: World Info CRUD, editor templates, event handling, settings access, utility functions.

Integration Method: Direct ES module imports from host SillyTavern script paths.

Service Name 2: SillyTavern event bus (`eventSource`)

Purpose: React to world-info and context updates (`WORLDINFO_UPDATED`, `WORLDINFO_SETTINGS_UPDATED`, `CHAT_CHANGED`, etc.).

Integration Method: Event subscription.

Service Name 3: Optional FilesPluginApi

Purpose: Local development CSS hot-reload/watch in extension runtime.

Integration Method: Dynamic import and plugin API calls.

Service Name 4: Optional companion extensions/plugins (Bulk Edit, External Editor, STLO)

Purpose: Cross-extension actions from Book Browser menus.

Integration Method: Extension presence checks, slash commands, and authenticated `fetch` to plugin endpoint.

## 6. Security Considerations

Authentication: Inherited from SillyTavern session/runtime context; extension does not implement its own auth.

Authorization: Inherited from host app behavior and user context; no extension-defined RBAC/ACL layer.

Data Encryption: Not implemented by extension; transport/storage security depends on SillyTavern deployment (e.g., HTTPS/TLS when applicable).

Key Security Tools/Practices:

- Uses SillyTavern `getRequestHeaders()` for authenticated plugin endpoint calls.
- Static analysis via GitHub CodeQL workflow.
- Linting and formatting checks in CI.
- Avoids backend secret handling in extension code.

## 7. Development & Testing Environment

Local Setup Instructions:

- Clone repository.
- Initialize submodule if needed: `git submodule update --init --recursive`.
- Install dependencies: `npm ci`.
- Run checks: `npm run lint`, `npm run lint:css`, `npm run format:check`, `npm test`.
- Load as a third-party SillyTavern extension using `manifest.json` entrypoint configuration.

Testing Frameworks: Vitest (`test/*.test.js`).

Code Quality Tools: ESLint (`eslint.config.js`), Stylelint (`.stylelintrc.json`), Prettier (`.prettierrc.json`), CodeQL (`.github/workflows/codeql.yml`).

## 8. Future Considerations / Roadmap

- Improve Entry Manager filter UX (from README to-do).
- Add lorebook tag system (classification/filtering/enable-disable by tag).
- Resolve remaining CSS alignment issues.
- Increase test coverage for high-coupling modules (`src/drawer.js`, `src/book-browser/book-browser.js`, `src/entry-manager/bulk-editor-tab/bulk-editor-tab.js`) that currently rely heavily on host DOM and runtime APIs.
- Track SillyTavern upstream template/API changes to avoid selector drift and integration regressions.

## 9. Project Identification

Project Name: SillyTavern-WorldInfoDrawer (WorldInfo Drawer)

Repository URL: `https://github.com/lazuli-s/SillyTavern-WorldInfoDrawer`

## 11. Glossary / Acronyms

ST: SillyTavern.

WI: World Info (SillyTavern lorebook system).

STWID: Short prefix used by this extension (WorldInfo Drawer).

Entry Manager: Bulk-edit/reorder table UI for entries.

Book: A lorebook file in SillyTavern.

Entry: A single World Info record inside a book.

Folder: Extension-level grouping metadata for books (`metadata.folder` + local registry).

STLO: SillyTavern Lorebook Ordering companion extension referenced by menu actions.
