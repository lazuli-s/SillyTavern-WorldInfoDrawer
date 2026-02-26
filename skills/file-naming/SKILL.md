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

All main task files — bugs, features, reworks, refactoring, docs, skill tasks —
go into `tasks/main-tasks/documented/` when first created.

| Task type | Folder (when new) | Filename format | Example |
|---|---|---|---|
| Bug or issue | `tasks/main-tasks/documented/` | `Issue_<NameNoUnderscores>.md` | `Issue_FilterBarCrashOnEmpty.md` |
| New feature | `tasks/main-tasks/documented/` | `NewFeature_<NameNoUnderscores>.md` | `NewFeature_ListPanelTabs.md` |
| Rework of existing feature | `tasks/main-tasks/documented/` | `Rework_<NameNoUnderscores>.md` | `Rework_VisibilityChipsLayout.md` |
| Refactoring (code only, no behavior change) | `tasks/main-tasks/documented/` | `Refactoring_<NameOfFileOrArea>.md` | `Refactoring_stylecss.md` |
| Documentation task | `tasks/main-tasks/documented/` | `Docs_<NameNoUnderscores>.md` | `Docs_ArchitectureUpdate.md` |
| Skill review | `tasks/main-tasks/documented/` | `SkillReview_<SkillName>.md` | `SkillReview_analyze-request.md` |
| Code review | `tasks/code-reviews/` | `CodeReview_<FileName>.md` | `CodeReview_listPanel.filterBar.js.md` |

### Naming rules

- Use **PascalCase** (each word capitalized, no spaces) for the name part - `MyFeatureName` not `my-feature-name`
- **No underscores in the name part** - underscores only appear as the separator after the prefix
- **No spaces** in any filename
- Always end with `.md`