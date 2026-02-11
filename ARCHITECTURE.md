# Architecture Overview

## 1. Project Structure

[Project Root]/
|-- index.js                     # Extension entry point; bootstraps drawer UI and event wiring
|-- style.css                    # Extension styles
|-- manifest.json                # SillyTavern extension manifest
|-- src/
|   |-- listPanel.js             # Left panel composition: books/folders/entries and menu orchestration
|   |-- listPanel.state.js       # List panel state container (UI/session state + lifecycle hydration/reset helpers)
|   |-- listPanel.filterBar.js   # Filter/search/visibility slice for list panel
|   |-- listPanel.foldersView.js # Folder view slice (folder DOM map wiring + collapse/visibility toggles)
|   |-- listPanel.booksView.js   # Book view slice (`renderBook`/`loadList` + book row wiring)
|   |-- listPanel.bookMenu.js    # Book dropdown menu items/actions + import dialog helpers
|   |-- listPanel.selectionDnD.js # Entry selection model + entry/book drag/drop target handlers
|   |-- listPanel.coreBridge.js  # Core WI DOM delegation helpers (wait/select/click wrappers)
|   |-- editorPanel.js           # Entry editor panel integration with ST templates
|   |-- worldEntry.js            # Entry row renderer + selection/toggle behaviors
|   |-- orderHelper.js           # Order Helper orchestration
|   |-- orderHelperRender.js     # Order Helper table rendering and inline edits
|   |-- orderHelperFilters.js    # Order Helper filter logic
|   |-- orderHelperState.js      # Order Helper persisted/default UI state
|   |-- lorebookFolders.js       # Folder metadata and registry helpers
|   |-- sortHelpers.js           # Sorting + metadata sort preference helpers
|   |-- utils.js                 # Shared UI/util helpers
|   |-- Settings.js              # Persistent extension settings singleton
|   └-- constants.js             # Sort enums/constants
|-- docs/
|   |-- user/                    # End-user and behavior docs (World Info / extension logic, state maps)
|   |-- SillyTavernExtensionsDocumentation.md  # ST extension best-practice reference
|-- tasks/                        # In-progress and finished planning/task docs
|   └-- finished/                 # Completed task docs
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

### EXISTING MODULES AND RESPONSIBILITIES

#### Entry point

- `index.js`
  - Watches CSS for local dev (via FilesPluginApi if installed)
  - Bootstraps the drawer UI + DOM structure (`dom` object)
  - Wires global events (`WORLDINFO_UPDATED`, `WORLDINFO_SETTINGS_UPDATED`)
  - Manages the in-memory `cache` of books/entries and updates it incrementally
  - Recomputes lorebook source links (chat/persona/character) and reapplies list visibility filters on source-link changes
  - Connects list panel, editor panel, and order helper

#### Core modules (`/src`)

- `listPanel.js`
  - Composes list panel slices and shared orchestration actions
  - Wires slice dependency injection (`filterBar`, `selectionDnD`, `bookMenu`, `foldersView`, `booksView`) and returns the consolidated list-panel API surface used by `index.js`
  - Control row: create book, create folder, import book, import folder, refresh, collapse/expand all books, collapse/expand all folders
  - Owns source-link icon rendering helpers and sort/metadata orchestration helpers shared by slices

- `listPanel.booksView.js`
  - Owns book row render shell (`renderBook`) and full list load pipeline (`loadList`)
  - Wires per-book interactions:
    - Active toggle
    - Add-entry action
    - Collapse toggle/title click behavior
    - Book drop-target handlers
  - Applies folder/root insertion ordering for rendered books

- `listPanel.foldersView.js`
  - Owns folder view wiring:
    - Folder DOM creation/ensure flow for list rendering
    - Folder collapse-all toggle state sync
    - Folder visibility refresh based on active filters
    - Folder active-toggle refresh (tri-state)
  - Owns folder DOM map reset/disconnect lifecycle hooks used during list reload

- `listPanel.bookMenu.js`
  - Builds per-book dropdown menu trigger and menu contents
  - Per-book menu actions:
    - Rename / delete (delegates to core WorldInfo UI via `listPanel.coreBridge.js`)
    - Duplicate book
    - Export book
    - Fill empty titles from keywords
    - Book sort preference
    - Order Helper shortcut
    - Optional integration: Bulk Edit, External Editor, Configure STLO
  - Owns book/folder import dialog helper paths used by folder actions

- `listPanel.filterBar.js`
  - Owns list search bar and entry-text search toggle behavior
  - Owns Book Visibility constants/options/menu/chip rendering
  - Owns visibility scope computation and active-filter application wiring
  - Calls back into composition for folder toggle refresh and scope-change notifications

- `listPanel.state.js`
  - Owns list panel module-local mutable state:
    - visibility/search refs and caches
    - collapse/folder DOM maps
    - selection + drag state
  - Owns state lifecycle helpers:
    - visibility reset
    - entry-search cache clear
    - folder-collapse hydration/persistence
    - selection reset
    - cache/collapse capture clear helpers

- `listPanel.selectionDnD.js`
  - Owns entry selection UI helpers (`selectAdd`, `selectRemove`, `selectEnd`)
  - Owns selection state API (`getSelectionState`) used by `worldEntry.js` and `index.js`
  - Owns entry drag/drop move-copy persistence flow between books
  - Owns reusable drag/drop handlers for book, folder, and root drop targets

- `listPanel.coreBridge.js`
  - Owns core WI DOM delegation utilities used by list panel menu actions:
    - `waitForDom`
    - `setSelectedBookInCoreUi`
    - `clickCoreUiAction`
  - Owns core WI action selector map for rename/duplicate/delete button targeting

- `lorebookFolders.js`
  - Folder metadata and registry helpers
  - Metadata key: `folder` (top-level book metadata)
  - Registry stored in localStorage: `stwid--folder-registry`
  - Folder DOM construction + menu actions

- `worldEntry.js`
  - Renders each entry row
  - Selection UI + help toast
  - Enable/disable toggle + strategy selector
  - Click-to-open editor behavior

- `editorPanel.js`
  - Renders the entry editor using SillyTavern templates
  - Uses:
    - `renderTemplateAsync('worldInfoKeywordHeaders')`
    - `getWorldEntry(...)`
  - Focus/unfocus support (`stwid--focus`)
  - Moves `#wiActivationSettings` into the editor when shown

- `orderHelper.js`
  - Order Helper orchestration glue:
    - Creates state
    - Gathers entries from Book Visibility scope, a single book override, or a custom scoped subset (e.g., folder intersection)
    - Computes derived filter option lists (strategy/position/outlet/automationId/group)

- `orderHelperState.js`
  - Order Helper persisted state in localStorage:
    - Sort: `stwid--order-helper-sort`
    - Hide keys: `stwid--order-helper-hide-keys`
    - Columns: `stwid--order-helper-columns`

- `orderHelperFilters.js`
  - Filter logic for Order Helper rows:
    - Strategy
    - Position
    - Recursion
    - Outlet
    - Automation ID
    - Inclusion group
    - Script filter

- `orderHelperRender.js`
  - Orchestrator: Init (sync filters, reset state) + section assembly + Mount
  - Calls section builders in order and threads cross-section return values (e.g. refresh callbacks)
  - Public API unchanged: `createOrderHelperRenderer` / `renderOrderHelper`

- `orderHelperRender.utils.js`
  - Shared DOM/utility helpers used across orderHelperRender.* slices:
    - `setTooltip`, `createMultiselectDropdownCheckbox`, `setMultiselectDropdownOptionCheckboxState`
    - `closeOpenMultiselectDropdownMenus`, `wireMultiselectDropdown`
    - `formatCharacterFilter`
    - `MULTISELECT_DROPDOWN_CLOSE_HANDLER` constant

- `orderHelperRender.actionBar.js`
  - Action bar: select-all toggle, hide-keys toggle, column visibility dropdown
  - Sort select + filter panel toggle
  - Apply Order button with start/step/direction controls

- `orderHelperRender.filterPanel.js`
  - Script-based filter panel (SlashCommandParser + highlight.js)
  - Live preview panel

- `orderHelperRender.tableHeader.js`
  - `<thead>` with 6 multiselect column filter menus (strategy, position, recursion, outlet, automationId, group)
  - Returns refresh-indicator callbacks for outlet/automationId/group (consumed by tableBody)

- `orderHelperRender.tableBody.js`
  - `<tbody>` entry row loop with all 14 cell types (select, drag, enabled, entry, strategy, position, depth, outlet, group, order, sticky, cooldown, delay, automationId, trigger, recursion, budget, characterFilter)
  - jQuery sortable drag reordering + move buttons
  - Post-build: applies all structured filters and updates select-all state

- `sortHelpers.js`, `utils.js`, `constants.js`, `Settings.js`
  - Sorting logic + shared utilities
  - Persisted settings stored at: `extension_settings.worldInfoDrawer`
  - Optional per-book sort preferences stored in book metadata:
    - Namespace: `stwid`
    - Key: `sort`

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

Description: Browser-side SillyTavern extension that replaces the default World Info editor with a full-screen drawer. It renders book/folder lists, entry rows, an embedded entry editor, and an Order Helper for bulk edits/reordering. It keeps an in-memory `cache` synchronized with SillyTavern world-info state and persists UI preferences.

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

Key keys:

- `extension_settings.worldInfoDrawer` (global sort logic/direction and per-book-sort toggle)
- `stwid--folder-registry`
- `stwid--folder-collapse-states`
- `stwid--order-helper-sort`
- `stwid--order-helper-hide-keys`
- `stwid--order-helper-columns`
- `stwid--order-start`, `stwid--order-step`, `stwid--order-direction`, `stwid--order-filter`
- `stwid--list-width`

### 4.3. Runtime In-Memory State

Name: Extension cache/state maps

Type: In-memory JavaScript objects

Purpose: Fast UI rendering and incremental updates without full reload on every interaction.

Key objects: `cache`, `dom`, `currentEditor`, selection state, order-helper state, source-link maps.

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

Purpose: Cross-extension actions from list-panel menus.

Integration Method: Extension presence checks, slash commands, and authenticated `fetch` to plugin endpoint.

## 6. Deployment & Infrastructure

Cloud Provider: N/A for this repository (client-side extension code only).

Key Services Used: SillyTavern host runtime in browser, GitHub Actions for CI/security checks.

CI/CD Pipeline: GitHub Actions workflows in `.github/workflows`:

- `ci.yml` (parse/lint/stylelint/prettier on PRs to `dev`)
- `vitest.yml` (tests on PR activity)
- `codeql.yml` (JavaScript CodeQL analysis)
- `prepare-main.yml` / `clean-main.yml` (manual branch/file allowlist automation)

Monitoring & Logging: Browser console logging (`console.log/debug/warn/error`) and CI status checks. No dedicated runtime telemetry stack in this repository.

## 7. Security Considerations

Authentication: Inherited from SillyTavern session/runtime context; extension does not implement its own auth.

Authorization: Inherited from host app behavior and user context; no extension-defined RBAC/ACL layer.

Data Encryption: Not implemented by extension; transport/storage security depends on SillyTavern deployment (e.g., HTTPS/TLS when applicable).

Key Security Tools/Practices:

- Uses SillyTavern `getRequestHeaders()` for authenticated plugin endpoint calls.
- Static analysis via GitHub CodeQL workflow.
- Linting and formatting checks in CI.
- Avoids backend secret handling in extension code.

## 8. Development & Testing Environment

Local Setup Instructions:

- Clone repository.
- Initialize submodule if needed: `git submodule update --init --recursive`.
- Install dependencies: `npm ci`.
- Run checks: `npm run lint`, `npm run lint:css`, `npm run format:check`, `npm test`.
- Load as a third-party SillyTavern extension using `manifest.json` entrypoint configuration.

Testing Frameworks: Vitest (`test/*.test.js`).

Code Quality Tools: ESLint (`eslint.config.js`), Stylelint (`.stylelintrc.json`), Prettier (`.prettierrc.json`), CodeQL (`.github/workflows/codeql.yml`).

## 9. Future Considerations / Roadmap

- Improve Order Helper filter UX (from README to-do).
- Add lorebook tag system (classification/filtering/enable-disable by tag).
- Resolve remaining CSS alignment issues.
- Increase test coverage for high-coupling modules (`index.js`, `listPanel.js`, `orderHelperRender.js`) that currently rely heavily on host DOM and runtime APIs.
- Track SillyTavern upstream template/API changes to avoid selector drift and integration regressions.

## 10. Project Identification

Project Name: SillyTavern-WorldInfoDrawer (WorldInfo Drawer)

Repository URL: `https://github.com/lazuli-s/SillyTavern-WorldInfoDrawer`

Primary Contact/Team: Lazuli

Date of Last Update: 2026-02-09

## 11. Glossary / Acronyms

ST: SillyTavern.

WI: World Info (SillyTavern lorebook system).

STWID: Short prefix used by this extension (WorldInfo Drawer).

Order Helper: Bulk-edit/reorder table UI for entries.

Book: A lorebook file in SillyTavern.

Entry: A single World Info record inside a book.

Folder: Extension-level grouping metadata for books (`metadata.folder` + local registry).

STLO: SillyTavern Lorebook Ordering companion extension referenced by menu actions.
