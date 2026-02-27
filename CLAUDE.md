# CLAUDE.md - AI Agent Rules for This Repository

This repository is a **third-party SillyTavern frontend extension** that replaces the default World Info editor with a custom full-screen drawer UI.

This file defines **mandatory rules and constraints** for AI agents modifying this codebase.

All instructions below MUST be followed unless explicitly overridden by the user.

## 0. User Context

The user of this repository **is not a programmer**. This shapes every interaction:

- Explain what you are about to do and why, in plain language, **before doing it**.
- Never assume familiarity with programming terms. If a technical term is unavoidable, define it immediately.
- When presenting options, describe trade-offs in practical terms ("this is faster but harder to change later"), not technical jargon.

**When in doubt, ask.** If a request is ambiguous, or could reasonably be interpreted in more than one way, stop and ask before writing any code. Do not guess and proceed silently. One clarifying question upfront saves far more time than redoing work.

## 1. Runtime Context

- This extension runs **entirely in the browser**.
- It integrates with **SillyTavern World Info / world-info APIs**.
- There is **no backend code** in this repository.
- There is **no build step**. No npm build, no bundler, no compilation. Changes take effect when the browser tab is reloaded. There is no command to run to validate code — testing is done manually by reloading and observing behavior in the browser.

## 2. Task File Naming Conventions

See the `file-naming` skill for the authoritative rules on task file names, folder locations, and the check-first rule.

## 3. Authoritative Documentation

Before starting any task, invoke the `doc-guide` skill. It is the single source
of truth for which docs to load and when — always-load docs plus conditional
loading based on task type (writing JS, reading/writing WI, ownership questions,
code review).

## 4. Dependencies and Imports

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

## 5. Style Guide Compliance

Before making any UI or CSS change, always run the `css-ST` and `css-responsive` skills.

## 6. Ownership and Integration Contract

When implementing or modifying behavior, follow the ownership boundary document:

- Treat SillyTavern as the owner of World Info truth, persistence, lifecycle, and core UI contracts
- Treat this extension as an alternate UI/controller layer over core APIs and events
- Integrate only through documented APIs, event bus events, templates, and named DOM anchors

## 7. Change Targeting and Code Reuse

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

### Code Reuse

- **Reuse existing functions and variables whenever possible.**
- Introduce new functions only if the behavior cannot be implemented by modifying existing ones.
- Introduce new variables/styles only if no existing variable/style can be safely reused.

## 8. Core Architectural Principles

- **Separation of Concerns** — Each module has one clear job. Don't mix unrelated logic.
- **Single Responsibility** — One reason to change per component. Focused components are easier to fix.
- **DRY (Don't Repeat Yourself)** — No duplication. If the same logic appears twice, extract it.
- **Small Functions** — One task per function. If a function is doing too much, split it.
- **Logical Cohesion** — Group related logic together in the same module.
- **Boy Scout Rule** — Leave code slightly better than you found it, even on unrelated visits.
- **Performance** — Prefer async operations; avoid blocking the browser UI thread.
- **Iterative Development** — Small, working increments over large rewrites.
- **Options Analysis** — When multiple approaches exist, present them with practical trade-offs before choosing one.
- **Visual Communication** — Use diagrams or tables in documentation when structure is complex.

## 9. Explicitly Forbidden Actions

- Do NOT modify `vendor/SillyTavern`
- Do NOT introduce frameworks (React, Vue, etc.)
- Do NOT change public APIs unintentionally
- Do NOT use Bash `echo`, `printf`, or heredoc to write file content — always use the Write or Edit tools. Shell output on Windows can corrupt multi-byte characters (emojis, special Unicode) inside files.
- Prefer `apply_patch` for targeted edits to existing text files, especially workflow/docs files with symbols; direct file edits are safer than shell text output on Windows.

## 10. Git Commits

Only commit when **explicitly asked** by the user.

**Always run the `git-commit` skill before writing any commit message.** It defines the required format, allowed types, canonical scope list, body/footer rules, and breaking-change notation for this project.
