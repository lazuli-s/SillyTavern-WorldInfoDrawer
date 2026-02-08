# Architecture Overview

## 1. Project Structure

[Project Root]/
|-- index.js                     # Extension entry point; bootstraps drawer UI and event wiring
|-- style.css                    # Extension styles
|-- manifest.json                # SillyTavern extension manifest
|-- src/
|   |-- listPanel.js             # Left panel: books/folders/entries, selection, DnD, context menus
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
|-- docs/                        # Architecture and implementation notes for ST + extension logic
|-- test/                        # Vitest unit tests (utils/folders)
|-- scripts/                     # Repository automation scripts/prompts
|-- .github/
|   └-- workflows/               # CI, CodeQL, test, and release prep workflows
|-- vendor/
|   └-- SillyTavern/             # Reference-only submodule (do not modify)
|-- README.md
|-- CHANGELOG.md
|-- AGENTS.md
└-- ARCHITECTURE.md              # This document

### EXISTING MODULES AND RESPONSIBILITIES

#### Entry point

- `index.js`
  - Watches CSS for local dev (via FilesPluginApi if installed)
  - Bootstraps the drawer UI + DOM structure (`dom` object)
  - Wires global events (`WORLDINFO_UPDATED`, `WORLDINFO_SETTINGS_UPDATED`)
  - Manages the in-memory `cache` of books/entries and updates it incrementally
  - Connects list panel, editor panel, and order helper

#### Core modules (`/src`)

- `listPanel.js`
  - Renders the left panel (folders + books + entry lists)
  - Control row: create book, create folder, import book, import folder, refresh
  - Search matches books and optionally entries (title + keys)
  - Active-book filter
  - Selection system:
    - Click selects
    - SHIFT selects range
    - DEL deletes selected
    - Drag moves
    - CTRL modifies copy / duplicate behavior
  - Per-book menu actions:
    - Rename / delete (delegates to core WorldInfo UI)
    - Duplicate book
    - Export book
    - Fill empty titles from keywords
    - Book sort preference
    - Order Helper shortcut
    - Optional integration: Bulk Edit, External Editor, Configure STLO
  - Folder support:
    - Folder collapse state
    - Folder active toggle (tri-state)
    - Folder context menu (export folder, import into folder, rename folder, delete folder)

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
    - Gathers entries from active books, a single book, or a custom scope (e.g., folder)
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
  - Renders the Order Helper table UI
  - Supports:
    - Sorting (including CUSTOM using `extensions.display_index`)
    - jQuery sortable drag ordering + keyboard-like move buttons
    - Row selection for apply + select-all
    - Start / step / direction controls
    - Inline edits (enabled, strategy, position, depth, order, sticky, cooldown, delay, automationId, trigger %)
    - Recursion flags + budget ignore toggle
    - Inclusion group + prioritize
    - Character filter display (read-only)
    - Column visibility
    - Hide keys
    - Script-based filtering via `SlashCommandParser`
    - Live preview (`{{var::entry}}`) with `highlight.js`

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

Date of Last Update: 2026-02-07

## 11. Glossary / Acronyms

ST: SillyTavern.

WI: World Info (SillyTavern lorebook system).

STWID: Short prefix used by this extension (WorldInfo Drawer).

Order Helper: Bulk-edit/reorder table UI for entries.

Book: A lorebook file in SillyTavern.

Entry: A single World Info record inside a book.

Folder: Extension-level grouping metadata for books (`metadata.folder` + local registry).

STLO: SillyTavern Lorebook Ordering companion extension referenced by menu actions.
