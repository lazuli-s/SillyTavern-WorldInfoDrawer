---
name: file-naming
description: "Authoritative naming and placement rules for all task files in this SillyTavern WorldInfoDrawer extension. Use whenever creating a new task file (bug, feature, rework, refactoring, code review, skill review, or documentation task). Also consult this skill when another skill (e.g. analyze-request) needs to create a task file, or when the user invokes /file-naming. Covers which folder each file type belongs in, the exact filename format, and the check-first rule."
---
# File Naming Conventions

This skill defines where every task file lives and what it must be named.

## Rule: Check First

Before creating any new task file, look inside the correct folder first.
If a relevant file already exists there, **update it** - do not create a duplicate.

---

## File Types and Naming

All main task files go into `tasks/main-tasks/documented/` when first created, except for code review tasks, which go into `tasks/code-reviews/`. 

When naming a new task file, use the following format:

| Task type | Filename format | Example |
|---|---|---|
| Bug or issue | `issue__<name-only-low-case>.md` | `issue__filter-bar-crash-on-empty.md` |
| New feature | `new-feature__<name-only-low-case>.md` | `new-feature__list-panel-tabs.md` |
| Rework of existing feature | `rework__<name-only-low-case>.md` | `rework__visibility-chips-layout.md` |
| Refactoring (code only, no behavior change) | `refactoring__<name-only-low-case>.md` | `refactoring__style.css.md` |
| Documentation task | `docs__<name-only-low-case>.md` | `docs__architecture-update.md` |
| Skill | `skill__<name-only-low-case>.md` | `skill__create-analyze-request.md` |
| Code review | `code-review___<file-name-only-low-case>.md` | `code-review___listPanel.filterBar.js.md` |

---

## Required Task Header

At the top of each task file, include this header:

```md
# <TASK TYPE>: <Task title>
*Created: <Month D, YYYY>*
```
