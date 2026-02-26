---
name: file-naming
description: >-
  Authoritative naming and placement rules for all task files in this
  SillyTavern WorldInfoDrawer extension. Use whenever creating a new task file
  (bug, feature, rework, refactoring, code review, skill review, or
  documentation task). Also consult this skill when another skill (e.g.
  analyze-request) needs to create a task file, or when the user invokes
  /file-naming. Covers which folder each file type belongs in, the exact
  filename format, and the check-first rule.
metadata:
  sync:
    version: 2
    hash: sha256-4ecafb2733e95175db5267fa7d7dd9670b9bbc40dc4a2ce5986203204f3ce124
---
# File Naming Conventions

This skill defines where every task file lives and what it must be named.

## Rule: Check First

Before creating any new task file, look inside the correct folder first.
If a relevant file already exists there, **update it** - do not create a duplicate.

---

## Folder Structure

```
tasks/
  main-tasks/
    bugs/         <- active bug/issue tasks
      done/       <- fixed bugs
    features/     <- active new-feature tasks
      done/       <- completed features
    changes/      <- active rework and refactoring tasks
      done/       <- completed reworks and refactoring
    docs/         <- active documentation tasks
      done/       <- completed doc tasks
    skills/       <- active skill review and skill creation tasks
      done/       <- completed skill tasks
    main-tasks-queue.md   <- main task queue
  code-reviews/   <- active code review files
    finished/     <- completed code reviews
    queue-code-review.md  <- code review queue
```

---

## File Types and Naming

| Task type | Folder | Filename format | Example |
|---|---|---|---|
| Bug or issue | `tasks/main-tasks/bugs/` | `Issue_<NameNoUnderscores>.md` | `Issue_FilterBarCrashOnEmpty.md` |
| New feature | `tasks/main-tasks/features/` | `NewFeature_<NameNoUnderscores>.md` | `NewFeature_ListPanelTabs.md` |
| Rework of existing feature | `tasks/main-tasks/changes/` | `Rework_<NameNoUnderscores>.md` | `Rework_VisibilityChipsLayout.md` |
| Refactoring (code only, no behavior change) | `tasks/main-tasks/changes/` | `Refactoring_<NameOfFileOrArea>.md` | `Refactoring_stylecss.md` |
| Documentation task | `tasks/main-tasks/docs/` | `Docs_<NameNoUnderscores>.md` | `Docs_ArchitectureUpdate.md` |
| Code review | `tasks/code-reviews/` | `CodeReview_<FileName>.md` | `CodeReview_listPanel.filterBar.js.md` |
| Skill review | `tasks/main-tasks/skills/` | `SkillReview_<SkillName>.md` | `SkillReview_analyze-request.md` |

### Naming rules

- Use **PascalCase** (each word capitalized, no spaces) for the name part - `MyFeatureName` not `my-feature-name`
- **No underscores in the name part** - underscores only appear as the separator after the prefix
- **No spaces** in any filename
- Always end with `.md`

---

## Finished / Done Files

When a task is completed, move it to the `done/` (or `finished/`) subfolder inside its category:

| Category | Active location | Completed location |
|---|---|---|
| Bugs | `tasks/main-tasks/bugs/` | `tasks/main-tasks/bugs/done/` |
| Features | `tasks/main-tasks/features/` | `tasks/main-tasks/features/done/` |
| Changes | `tasks/main-tasks/changes/` | `tasks/main-tasks/changes/done/` |
| Docs | `tasks/main-tasks/docs/` | `tasks/main-tasks/docs/done/` |
| Code reviews | `tasks/code-reviews/` | `tasks/code-reviews/finished/` |
| Skill tasks | `tasks/main-tasks/skills/` | `tasks/main-tasks/skills/done/` |
