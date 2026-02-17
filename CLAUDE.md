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

Whenever working on a bug, issue, new feature, rework, or refactoring, create a task planning file according to the type of work:

| Type | File path |
| --- | --- |
| Bug / Issue | `tasks/Issue_<NameHereWithNoUnderscores>.md` |
| New Feature | `tasks/NewFeature_<NameHereWithNoUnderscores>.md` |
| Rework of existing feature | `tasks/Rework_<NameHereWithNoUnderscores>.md` |
| Refactoring | `tasks/Refactoring_<NameOfFileToBeRefactored>.md` |

Check the `tasks/` folder first — if a relevant task file already exists, update it rather than creating a duplicate.

## 3. Authoritative Documentation

Before making changes, always analyze these files to understand how the code works **without scanning everything** and wasting tokens on unnecessary context:

- `ARCHITECTURE.md`
  (module boundaries, responsibilities, and runtime model)
- `FEATURE_MAP.md`
  (where each extension feature/behavior is implemented)
- `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`
  (ownership boundaries, integration contract, and safe hook points)
- `.claude/skills/st-js-best-practices/references/patterns.md`
  (JS best practices rules with concrete good/bad examples — Security: SEC-01–03, Performance: PERF-01–03, API Compatibility: COMPAT-01–04; consult before writing any JS)
- `.claude/skills/st-world-info-api/references/wi-api.md`
  (Compact WI API reference — book/entry CRUD, entry shape, enums, events, ownership rules, and anti-patterns; consult before writing any code that reads or writes WI books or entries)
- `vendor/SillyTavern/public/scripts/st-context.js`
  (Authoritative list of what `SillyTavern.getContext()` exposes — consult when you need to know whether a ST API, state value, helper, or event is available on the context object vs. requires a direct import)

SillyTavern source is available as a **reference-only submodule** under: `vendor/SillyTavern`

Note: if you don't see that folder, the git submodule is probably not initialized.

**DO NOT modify anything under `vendor/SillyTavern`.**

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

Before making any UI or CSS change, always run the `style-guide` skill.

Style guide requirements are mandatory:

- Reuse existing SillyTavern styles first
- Only add new extension CSS when no suitable existing style is available
- Keep styling changes small, targeted, and consistent with the guide

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

## 10. Git Commits

Only commit when **explicitly asked** by the user.

Use **Conventional Commits** format, matching the project's established style:

```text
type(scope): lowercase description, imperative mood, no period at end
```

**Types:**

| Type | When to use |
| --- | --- |
| `new-feat` | New feature or new behavior added from scratch |
| `rework` | Intentional change to how an existing feature works or looks — behavior or design intent changed, not just a tweak |
| `fix` | Bug fix |
| `style` | CSS or visual tweak with no intent change (colors, spacing, alignment) |
| `docs` | Changes in documentation or architecture files |
| `refactor` | Code restructured without changing behavior |
| `chore` | Config, tooling, or maintenance (no production code) |
| `code-review` | The review activity itself for a specific file — planning, findings, tracking, or implementation notes |

**Scopes** — use the module or area being changed (e.g. `ui`, `editor`, `order-helper`, `css`, `code-review`). Omit the scope only when the change is truly cross-cutting and no single area owns it. `code-review` can also be used as a scope when a `fix` or `refactor` was directly triggered by a review.

**Message rules:**

- Lowercase after the colon
- Imperative mood: "add", "fix", "remove", "prevent", "update" — not "added" or "fixing"
- No period at the end
- Keep the message under 72 characters

**Examples from this project:**

- `fix(editor): prevent blank flash on entry clear`
- `new-feat(ui): add collapsible visibility row`
- `rework(ui): redesign visibility row to use icon chips`
- `style: remove unused row divider CSS`
- `docs(tasks): update task file for order-helper refactor`
- `code-review(sortHelpers.js): add findings for sortHelpers`
- `fix(code-review): address null-check issue found in review`

## 11. Definition of Done

A task is complete when **all of the following are true**:

1. **Code is written** — all changes are saved and in their final state.
2. **Task file is updated** — the relevant `tasks/` file reflects what was done, what changed, and why.
3. **Architecture docs are updated** — if the task added, removed, or moved a feature, `ARCHITECTURE.md` and/or `FEATURE_MAP.md` are updated to reflect the new state.

Do NOT consider a task done if:

- The implementation is partial or a placeholder remains
- The task file was not updated
- A feature was added or moved but the architecture docs were not updated
