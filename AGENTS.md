# AGENTS.md — AI Agent Rules for This Repository

This repository is a **third-party SillyTavern frontend extension** that replaces the default World Info editor with a custom full-screen drawer UI.

This file defines **mandatory rules and constraints** for AI agents modifying this codebase.
All instructions below MUST be followed unless explicitly overridden by the user.

---

## 1. Runtime Context

- This extension runs **entirely in the browser**.
- It integrates with **SillyTavern World Info / world-info APIs**.
- There is **no backend code** in this repository.

---

## 2. Authoritative Documentation

Before making changes, always consult:

- `docs/SillyTavern_Extensions_Documentation.md`
  (SillyTavern extension best practices and constraints)

SillyTavern source is available as a **reference-only submodule** under:
- `/vendor/SillyTavern`

Note: if you don't see that folder, the git submodule is probably not initialized.

- After cloning, initialize submodules:
  `git submodule update --init --recursive`

**DO NOT modify anything under `/vendor/SillyTavern`.**

---

## 3. High-Level Architecture (Must Be Preserved)

### Entry point
- `index.js`
  - Watches CSS for local dev (via FilesPluginApi if installed)
  - Bootstraps the drawer UI + DOM structure (`dom` object)
  - Wires global events (`WORLDINFO_UPDATED`, `WORLDINFO_SETTINGS_UPDATED`)
  - Manages the in-memory `cache` of books/entries and updates it incrementally
  - Connects list panel, editor panel, and order helper

### Core modules (`/src`)

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

---

## 4. Critical Behaviors That MUST Be Preserved

Do NOT change these unless explicitly instructed:

1. **Drawer behavior**
   - Drawer replaces the default World Info UI
   - CSS hides `#wi-holder`
   - Drawer is shown when `<body>` has class `stwid--`

2. **List Panel**
   - Books can collapse / expand
   - Folders can collapse / expand
   - Search matches books and optionally entries (title / keys)
   - Selection system:
     - Click selects
     - SHIFT selects range
     - DEL deletes selected
     - Drag moves
     - CTRL modifies copy / duplicate behavior

3. **Editor Panel**
   - Clicking an entry opens the editor via SillyTavern templates
   - Activation settings can be toggled into the editor area

4. **Order Helper**
   - Can show entries from:
     - All active books
     - A single book context
     - A custom scope list (e.g., folder active books)
   - Drag sorting uses jQuery sortable
   - Applying order saves per affected book via:
     - `saveWorldInfo(bookName, buildSavePayload(bookName), true)`

5. **Sorting**
   - Global defaults come from `Settings`
   - Optional per-book sort preferences stored in metadata
     - Namespace `stwid`, key `sort`
   - Custom order uses `entry.extensions.display_index`

---

## 5. Dependencies and Imports

- Prefer **SillyTavern shared frontend libraries**
- Do NOT add new external dependencies unless explicitly requested

Shared libs are available via:
- `vendor/SillyTavern/public/lib.js`

If importing a shared library, use:
```js
import { <name> } from '../../../../../lib.js';
```

Main shared libs include:

* lodash
* localforage
* Fuse
* DOMPurify
* Handlebars
* moment
* morphdom
* showdown

---

## 6. Constraints on Changes

* Keep changes **localized to the extension**
* Avoid unnecessary rewrites
* Prefer **small, targeted diffs**
* Preserve existing behavior unless explicitly told otherwise
* If behavior must change:

  * Explain what changed
  * Explain why it changed

---

## 7. Explicitly Forbidden Actions

* Do NOT modify `/vendor/SillyTavern`
* Do NOT introduce frameworks (React, Vue, etc.)
* Do NOT reformat unrelated code
* Do NOT refactor large sections unless explicitly asked
* Do NOT change public APIs unintentionally
