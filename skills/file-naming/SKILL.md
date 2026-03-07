---
name: file-naming
description: "Authoritative naming and placement rules for all task files in this SillyTavern WorldInfoDrawer extension. Use whenever creating a new task file (bug, feature, rework, refactoring, plan, workflow, code review, skill, or documentation task). Also consult this skill when another skill (e.g. analyze-request) needs to create a task file, or when the user invokes /file-naming. Covers which folder each file type belongs in, the exact filename format, the check-first rule, and when to use each type."
---

# File Naming Conventions

This skill defines where every task file lives, what it must be named, and when to use each type.

## Rule: Check First

Before creating any new task file, look inside the correct folder first.
If a relevant file already exists there, **update it** - do not create a duplicate.

---

## File Types and Naming

All main task files go into `tasks/main-tasks/documented/` when first created, except for code review tasks, which go into `tasks/code-reviews/`.

When naming a new task file, use the following format:

| Task type | Filename format | Example |
|---|---|---|
| Bug or issue | `Issue__<kebab-case-name>.md` | `Issue__filter-bar-crash-on-empty.md` |
| New feature | `NewFeature__<kebab-case-name>.md` | `NewFeature__list-panel-tabs.md` |
| Rework of existing feature | `Rework__<kebab-case-name>.md` | `Rework__visibility-chips-layout.md` |
| Refactoring (code only, no behavior change) | `Refactoring__<kebab-case-name>.md` | `Refactoring__style.css.md` |
| Documentation task | `Docs__<kebab-case-name>.md` | `Docs__architecture-update.md` |
| Skill | `Skill__<kebab-case-name>.md` | `Skill__create-analyze-request.md` |
| Code review | `CodeReview__<kebab-case-name>.md` | `CodeReview__browser-tabs.filter-bar.js.md` |
| Plan | `Plan__<kebab-case-name>.md` | `Plan__new-filter-system.md` |
| Workflow / automation | `Workflow__<kebab-case-name>.md` | `Workflow__session-start-hook.md` |

---

## When to Use Each Type

**Bug / Issue** — Use when something is not working as expected: crashes, wrong behavior, data loss, or any result that is incorrect. If it is wrong, it is a bug.

**New Feature** — Use when adding a brand-new user-facing capability to the extension UI or behavior. Only for the extension product itself — skills, docs, and workflows have their own types even when created from scratch.

**Rework** — Use when an existing feature works as designed, but the design needs to change. Examples: a layout that is confusing, a behavior that no longer makes sense, a UI pattern that needs redesigning. Not broken — just wrong by intent.

**Refactoring** — Use when reorganizing code without changing what the user sees or experiences. Primary trigger: a file has gotten too large or messy. The before and after behavior must be identical.

**Docs** — Use only when documentation is the main deliverable (e.g. a standalone update to ARCHITECTURE.md or FEATURE_MAP.md). Doc updates that are a side effect of another task belong inside that task's file, not a separate docs task.

**Skill** — Use for any work that touches a skill file, whether creating a new skill or updating an existing one. Skills are infrastructure, not product features — always use this type, never `NewFeature__`.

**Code Review** — Use for a scheduled, structured review of a specific source file. Findings discovered during the review are fixed inside the same review task file — not spun off as separate tasks.

**Plan** — Use when the output of the task is a plan or design document, not code. Use this before you know exactly what to build or how — when you need to make architectural decisions or lay out an approach first.

**Workflow / Automation** — Use for non-skill automation: Claude hook changes (session start, pre-tool, etc.), scripts, file watchers, or any automated process that is not a Claude skill. Workflows are infrastructure — never use `NewFeature__` for these.

---

## Required Task Header

At the top of each task file, include this header:

```md
# <TASK TYPE>: <Task title>
*Created: <Month D, YYYY>*
```
