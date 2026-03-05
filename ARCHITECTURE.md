# Architecture Overview

## 1. Project Structure

[Project Root]/
|-- index.js                     # Extension entry point; composes module initialization and public API
|-- style.css                    # Extension styles
|-- manifest.json                # SillyTavern extension manifest
|-- src/
|   |-- drawer.js                # Drawer UI bootstrap + DOM map + control wiring
|   |-- book-browser/
|   |   |-- book-browser.js                    # Book Browser composition + orchestration
|   |   |-- book-browser.state.js              # Book Browser state container
|   |   |-- book-browser.core-bridge.js        # Core WI DOM delegation helpers
|   |   |-- browser-tabs/
|   |   |   └-- browser-tabs.filter-bar.js     # Browser tabs + filters/search/visibility
|   |   └-- book-list/
|   |       |-- book-list.books-view.js        # Book list render/load + row wiring
|   |       |-- book-list.book-menu.js         # Per-book dropdown menu actions
|   |       |-- book-list.selection-dnd.js     # Entry selection + drag/drop handlers
|   |       |-- book-list.world-entry.js       # Entry row renderer + row interactions
|   |       |-- book-list.book-source-links.js # Character/chat/persona source-link tracking
|   |       └-- book-folders/
|   |           |-- book-folders.folders-view.js      # Folder view DOM/collapse wiring
|   |           └-- book-folders.lorebook-folders.js  # Folder metadata + registry helpers
|   |-- editor-panel/
|   |   └-- editor-panel.js                    # Entry editor panel integration with ST templates
|   |-- entry-manager/
|   |   |-- entry-manager.js                   # Entry Manager orchestration
|   |   |-- logic/
|   |   |   |-- logic.state.js                 # Entry Manager persisted/default UI state
|   |   |   └-- logic.filters.js               # Entry Manager filter logic
|   |   └-- bulk-editor/
|   |       |-- bulk-editor.js                 # Bulk editor orchestrator
|   |       |-- bulk-editor.utils.js           # Shared bulk editor utilities
|   |       |-- bulk-editor.action-bar.helpers.js       # Shared action bar row helpers
|   |       |-- bulk-editor.action-bar.visibility-row.js # Visibility row controls
|   |       |-- bulk-editor.action-bar.bulk-edit-row.js # Bulk edit row controls
|   |       |-- bulk-editor.filter-panel.js    # Script filter panel + preview wiring
|   |       |-- bulk-editor.table-header.js    # Bulk editor table header
|   |       └-- bulk-editor.table-body.js      # Bulk editor table body
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
| `index.js` | Extension entry point; composes module initialization and exposes `jumpToEntry` public API |
| `drawer.js` | Owns drawer DOM map, bootstrap flow, top/settings control rows, desktop/mobile splitter behavior, and global interaction wiring |
| `src/book-browser/book-list/book-list.book-source-links.js` | Derives and tracks lorebook source links (character/chat/persona); refreshes icons and filters |
| `src/shared/wi-update-handler.js` | Owns WORLDINFO event handling, incremental cache sync, update-wait primitives, and duplicate-refresh queue |
| `src/book-browser/book-browser.js` | Composes Book Browser slices and shared orchestration; exposes consolidated Book Browser API |
| `src/book-browser/book-list/book-list.books-view.js` | Book row render and full list load pipeline; wires per-book interactions |
| `src/book-browser/book-list/book-folders/book-folders.folders-view.js` | Folder view wiring: DOM creation, collapse state sync, visibility/active-toggle refresh |
| `src/book-browser/book-list/book-list.book-menu.js` | Per-book dropdown menu: triggers, ARIA, keyboard support, actions, and import dialog helpers |
| `src/book-browser/browser-tabs/browser-tabs.filter-bar.js` | Icon-tab strip (Visibility/Sorting/Search); owns book visibility menu and active-filter chip rendering |
| `src/book-browser/book-browser.state.js` | Module-local mutable state container + lifecycle helpers (reset/hydration) |
| `src/book-browser/book-list/book-list.selection-dnd.js` | Entry selection UI helpers; entry/book drag-drop move-copy persistence |
| `src/book-browser/book-browser.core-bridge.js` | Core WI DOM delegation utilities for rename/duplicate/delete actions |
| `src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js` | Folder metadata, registry helpers, DOM construction, and folder menu actions |
| `src/book-browser/book-list/book-list.world-entry.js` | Entry row renderer; selection UI, enable/disable toggle, click-to-open editor |
| `src/editor-panel/editor-panel.js` | Entry editor panel using ST templates; focus/unfocus and `#wiActivationSettings` embedding |
| `src/entry-manager/entry-manager.js` | Entry Manager orchestration: state creation, scope gathering, derived filter options |
| `src/entry-manager/logic/logic.state.js` | Entry Manager persisted state (sort/hide-keys/columns) via localStorage |
| `src/entry-manager/logic/logic.filters.js` | Filter logic for Entry Manager rows (strategy/position/recursion/outlet/group/script) |
| `src/entry-manager/bulk-editor/bulk-editor.js` | Orchestrator: init, section assembly, and public bulk editor rendering API |
| `src/entry-manager/bulk-editor/bulk-editor.utils.js` | Shared DOM/utility helpers for bulk editor slices, including multiselect dropdown wiring and collapsible row animation |
| `src/entry-manager/bulk-editor/bulk-editor.action-bar.helpers.js` | Shared DOM builder helpers used by both action-bar row modules |
| `src/entry-manager/bulk-editor/bulk-editor.action-bar.visibility-row.js` | Visibility row: select-all, key toggle, column visibility, sort, filter chips, and entry count controls |
| `src/entry-manager/bulk-editor/bulk-editor.action-bar.bulk-edit-row.js` | Bulk edit row: per-field bulk edit containers (state, strategy, position, depth, outlet, order, recursion, budget, probability, sticky, cooldown, delay) and Apply All Changes |
| `src/entry-manager/bulk-editor/bulk-editor.filter-panel.js` | Script-based filter panel with SlashCommandParser, highlight.js, and live preview |
| `src/entry-manager/bulk-editor/bulk-editor.table-header.js` | `<thead>` with multiselect column filter menus; returns refresh-indicator callbacks |
| `src/entry-manager/bulk-editor/bulk-editor.table-body.js` | `<tbody>` entry row loop with all cell types, drag sorting, and inline edits |
| `src/shared/sort-helpers.js` | Sorting implementations and per-book sort preference read/write |
| `src/shared/utils.js` | Shared UI/utility helpers and sort option labels |
| `src/shared/constants.js` | Sort enums, direction constants, and Entry Manager column/option schema |
| `src/shared/settings.js` | Persistent extension settings singleton (`extension_settings.worldInfoDrawer`) |

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
- Increase test coverage for high-coupling modules (`src/drawer.js`, `src/book-browser/book-browser.js`, `src/entry-manager/bulk-editor/bulk-editor.js`) that currently rely heavily on host DOM and runtime APIs.
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
