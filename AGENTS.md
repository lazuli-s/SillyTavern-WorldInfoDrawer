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

- `SillyTavern_Extensions_Documentation.md`  
  (SillyTavern extension best practices and constraints)

SillyTavern source is available as a **reference-only submodule** under:
- `/vendor/SillyTavern`

- After cloning, initialize submodules:
  git submodule update --init --recursive

**DO NOT modify anything under `/vendor/SillyTavern`.**

---

## 3. High-Level Architecture (Must Be Preserved)

### Entry point
- `index.js`
  - Bootstraps the drawer UI
  - Wires global events
  - Connects list panel, editor panel, and order helper

### Core modules (`/src`)
- `listPanel.js`
  - Renders the left panel (books + entry lists)
  - Control row: create/import/refresh, search, active filter, sorting
  - Manages selection state, drag/drop (move/copy/duplicate)
  - Per-book menus (rename, delete, bulk edit, external editor)
  - Active-book toggles

- `worldEntry.js`
  - Renders each entry row
  - Selection UI + help toast
  - Enable/disable + strategy toggles
  - Click-to-open editor behavior

- `editorPanel.js`
  - Renders the entry editor using SillyTavern templates
  - Uses:
    - `renderTemplateAsync('worldInfoKeywordHeaders')`
    - `getWorldEntry(...)`
  - Handles focus/unfocus
  - Moves `#wiActivationSettings` into the editor when shown

- `orderHelper.js`
  - Renders the Order Helper table
  - Supports:
    - Per-book or active-book scope
    - jQuery sortable drag ordering
    - Row selection for apply
    - Start / step / direction controls
    - Inline edits (enabled, strategy, position, depth, order, trigger %)
    - Jump-to-entry links
    - Column visibility
    - Hide keys
    - Script-based filtering via `SlashCommandParser`
    - Live preview (`{{var::entry}}`) with `highlight.js`

- `sortHelpers.js`, `utils.js`, `Settings.js`, `constants.js`
  - Sorting logic
  - Shared helpers
  - Persisted settings (`extension_settings.wordInfoDrawer`)
  - Per-book sort metadata:
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
   - Search matches books and optionally entries (title / memo / keys)
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
   - Drag sorting uses jQuery sortable
   - Applying order saves per affected book via:
     - `saveWorldInfo(buildSavePayload(book), true)`

5. **Sorting**
   - Global defaults come from `Settings`
   - Optional per-book sort preferences stored in metadata
     - Namespace `stwid`, key `sort`

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

## 7. Required Process (MANDATORY)

For every task, the agent MUST:

A) Scan the repository first:

* `index.js`
* `/src/*.js`
* `style.css`
* `manifest.json`
* `README.md`

B) Identify the correct module(s) for the change

C) Implement **minimal, focused changes**

* Use clear naming
* Add comments only where they prevent confusion

D) Output results in this format:

1. Brief summary of what changed and why
2. List of files modified
3. Behavior change notes (only if applicable)

---

## 8. Explicitly Forbidden Actions

* Do NOT modify `/vendor/SillyTavern`
* Do NOT introduce frameworks (React, Vue, etc.)
* Do NOT reformat unrelated code
* Do NOT refactor large sections unless explicitly asked
* Do NOT change public APIs unintentionally