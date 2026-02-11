# CLAUDE.md - AI Agent Rules for This Repository

This repository is a **third-party SillyTavern frontend extension** that replaces the default World Info editor with a custom full-screen drawer UI.

This file defines **mandatory rules and constraints** for AI agents modifying this codebase.
All instructions below MUST be followed unless explicitly overridden by the user.

## 1. Runtime Context

- This extension runs **entirely in the browser**.
- It integrates with **SillyTavern World Info / world-info APIs**.
- There is **no backend code** in this repository.

## 2. Task File Naming Conventions

Whenever working on a bug, issue, new feature, rework, or refactoring, create a task planning file according to the type of work:

| Type | File path |
| --- | --- |
| Bug / Issue | `tasks/Issue_<NameHereWithNoUnderscores>.md` |
| New Feature | `tasks/NewFeature_<NameHereWithNoUnderscores>.md` |
| Rework of existing feature | `tasks/Rework_<NameHereWithNoUnderscores>.md` |
| Refactoring | `tasks/Refactoring_<NameOfFileToBeRefactored>.md` |

## 3. Authoritative Documentation

Before making changes, always analyze these files to understand how the code works **without scanning everything** and wasting tokens on unnecessary context:

- `ARCHITECTURE.md`
  (module boundaries, responsibilities, and runtime model)
- `FEATURE_MAP.md`
  (where each extension feature/behavior is implemented)
- `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`
  (ownership boundaries, integration contract, and safe hook points)
- **ST Context** — relevant SillyTavern state, APIs, helpers, or events
  (from `vendor/SillyTavern/public/scripts/st-context.js`)
- `docs/SillyTavernExtensionsDocumentation.md`
  (SillyTavern extension best practices and constraints)

SillyTavern source is available as a **reference-only submodule** under: `vendor/SillyTavern`

Note: if you don't see that folder, the git submodule is probably not initialized.

- After cloning, always initialize submodules:
  `git submodule update --init --recursive`

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

Before making any UI or CSS change, always consult:

- `STYLE_GUIDE.md`

Style guide requirements are mandatory:

- Reuse existing SillyTavern styles first (check `vendor/SillyTavern` reference files listed in the guide)
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

These are the foundations upon which all development work is built:

### Separation of Concerns

Divide the system into distinct sections, each addressing a specific aspect of functionality. This creates cleaner abstractions, simplifies maintenance, and enables parallel development.

### Single Responsibility Principle

Each component should have one and only one reason to change. When a module has a single focus, it becomes more stable, understandable, and testable.

### Don't Repeat Yourself (DRY)

Eliminate duplication by abstracting common functionality. Each piece of knowledge should have a single, unambiguous representation within the system.

### Performance

Design for efficiency in response time, throughput, and resource utilization. Consider caching strategies, asynchronous processing, and data access optimization.

### Scalability

Enable the system to handle increased load by adding resources. Minimize shared mutable state and identify potential bottlenecks early.

### Iterative Development

Build software in small, incremental cycles that deliver working functionality. This enables rapid feedback and adaptation to changing requirements.

### Refactoring

Continuously improve code structure without changing external behavior. Regular refactoring prevents technical debt accumulation.

### Documentation

Maintain appropriate documentation at all levels. Keep it concise, accurate, and useful — prefer self-documenting code over excessive comments.

### Meaningful Names

Use clear, descriptive names for variables, functions, classes, and modules. Good names are self-documenting and reduce the need for comments.

### Small Functions

Keep functions focused on a single task and limit their size. A function that does one thing is easier to test, read, and reuse.

### Logical Cohesion

Group related functionality together. Each module should have a clear, focused purpose.

### Boy Scout Rule

Leave the code better than you found it. Make small improvements whenever you work in an area, even if you didn't create the issues.

### Visual Communication

Use diagrams, charts, and other visual aids to convey complex technical concepts when documenting architecture or explaining changes.

### Code Reviews as Teaching

When explaining feedback or changes, assume the user knows nothing about programming. Explain the reasoning behind decisions in plain language.

### Options Analysis

Identify multiple viable solutions to a problem. Evaluate each option based on consistent criteria such as performance, maintainability, and simplicity.

## 9. Explicitly Forbidden Actions

- Do NOT modify `vendor/SillyTavern`
- Do NOT introduce frameworks (React, Vue, etc.)
- Do NOT change public APIs unintentionally
