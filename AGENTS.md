# AGENTS.md - AI Agent Rules for This Repository

This repository is a **third-party SillyTavern frontend extension** that replaces the default World Info editor with a custom full-screen drawer UI.

This file defines **mandatory rules and constraints** for AI agents modifying this codebase.
All instructions below MUST be followed unless explicitly overridden by the user.

## 1. Runtime Context

- This extension runs **entirely in the browser**.
- It integrates with **SillyTavern World Info / world-info APIs**.
- There is **no backend code** in this repository.

## 2. Authoritative Documentation

Before making changes, always consult:

- `docs/SillyTavernExtensionsDocumentation.md`
  (SillyTavern extension best practices and constraints)
- `FEATURE_MAP.md`
  (where each extension feature/behavior is implemented)
- `ARCHITECTURE.md`
  (module boundaries, responsibilities, and runtime model)
- `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`
  (ownership boundaries, integration contract, and safe hook points)
- **ST Context**
  relevant SillyTavern state, APIs, helpers, or events
  (from `vendor/SillyTavern/public/scripts/st-context.js`)

SillyTavern source is available as a **reference-only submodule** under: `/vendor/SillyTavern`

Note: if you don't see that folder, the git submodule is probably not initialized.

- After cloning, always initialize submodules:
  `git submodule update --init --recursive`

**DO NOT modify anything under `/vendor/SillyTavern`.**

## 3. Dependencies and Imports

- Prefer **SillyTavern shared frontend libraries**
- Do NOT add new external dependencies unless explicitly requested

Shared libs are available via: `vendor/SillyTavern/public/lib.js`

If importing a shared library, use:

```js
import { <name> } from '../../../../../lib.js';
```

Main shared libs include:

- lodash
- localforage
- Fuse
- DOMPurify
- Handlebars
- moment
- morphdom
- showdown

## 4. Style Guide Compliance

Before making any UI or CSS change, always consult:

- `STYLE_GUIDE.md`

Style guide requirements are mandatory:

- Reuse existing SillyTavern styles first (check `vendor/SillyTavern` reference files listed in the guide)
- Only add new extension CSS when no suitable existing style is available
- Keep styling changes small, targeted, and consistent with the guide

## 5. Ownership and Integration Contract

When implementing or modifying behavior, follow the ownership boundary document:

- Treat SillyTavern as the owner of World Info truth, persistence, lifecycle, and core UI contracts
- Treat this extension as an alternate UI/controller layer over core APIs and events
- Integrate only through documented APIs, event bus events, templates, and named DOM anchors

## 6. Change Targeting and Architecture Guardrails

- Keep changes **localized to the extension**
- Avoid unnecessary rewrites
- Prefer **small, targeted diffs**
- Use `FEATURE_MAP.md` to locate the owning module(s) before editing
- Preserve module responsibilities described in `ARCHITECTURE.md` (avoid cross-module logic moves unless requested)
- If adding a new feature surface or moving ownership, update both `FEATURE_MAP.md` and `ARCHITECTURE.md`
- Preserve existing behavior unless explicitly told otherwise
- If behavior must change:
  - Explain what changed
  - Explain why it changed

## 7. Explicitly Forbidden Actions

- Do NOT modify `/vendor/SillyTavern`
- Do NOT introduce frameworks (React, Vue, etc.)
- Do NOT reformat unrelated code
- Do NOT refactor large sections unless explicitly asked
- Do NOT change public APIs unintentionally
