# SKILL: Update Task File Naming Convention to PascalCase__kebab-name
*Created: March 7, 2026*

**Type:** Skill
**Status:** IMPLEMENTED

---

## Summary

The task file naming convention has been updated. The new format uses a PascalCase type prefix followed by a double underscore and a kebab-case name — for example `NewFeature__bulk-editor-presets.md`. The old formats (`new-feature__name.md` and `NewFeature_Name.md`) are no longer the standard for new files. This task updates the skill files that define and reference file naming so that all future task files use the new convention consistently.

## Current Behavior

The `file-naming` skill defines the naming format as all-lowercase type prefix + double underscore + kebab-case name (e.g. `new-feature__list-panel-tabs.md`). The `task-changelog` skill recognizes two legacy styles but not the new PascalCase + double underscore style. The `js-refactor` skill and its report template hardcode `refactoring__` as the prefix.

## Expected Behavior

After this change:
- The `file-naming` skill defines the format as PascalCase type prefix + double underscore + kebab-case name (e.g. `NewFeature__bulk-editor-presets.md`).
- The `task-changelog` skill recognizes all three styles — old single-underscore, old all-lowercase double-underscore, and new PascalCase double-underscore — so existing task files still work.
- The `js-refactor` skill and report template use `Refactoring__` as the prefix.

## Agreed Scope

- `skills/file-naming/SKILL.md`
- `skills/task-changelog/SKILL.md`
- `skills/js-refactor/SKILL.md`
- `skills/js-refactor/references/report-template.md`

Files inferred from current repository structure; the original `.claude/skills/...` paths in this task were from an older layout and were corrected before implementation.

## Out of Scope

- Renaming any existing task files — old files keep their current names.
- Updating any other skills that only say "use the file-naming skill" without hardcoding a format.

## Implementation Plan

### Step 1 — Update `file-naming/SKILL.md`: naming table

In the naming table (the 9-row table under "File Types and Naming"), replace every type prefix and example with the new PascalCase format:

| Task type | Old format | New format | Old example | New example |
|---|---|---|---|---|
| Bug or issue | `issue__<name-only-low-case>.md` | `Issue__<kebab-case-name>.md` | `issue__filter-bar-crash-on-empty.md` | `Issue__filter-bar-crash-on-empty.md` |
| New feature | `new-feature__<name-only-low-case>.md` | `NewFeature__<kebab-case-name>.md` | `new-feature__list-panel-tabs.md` | `NewFeature__list-panel-tabs.md` |
| Rework | `rework__<name-only-low-case>.md` | `Rework__<kebab-case-name>.md` | `rework__visibility-chips-layout.md` | `Rework__visibility-chips-layout.md` |
| Refactoring | `refactoring__<name-only-low-case>.md` | `Refactoring__<kebab-case-name>.md` | `refactoring__style.css.md` | `Refactoring__style.css.md` |
| Documentation | `docs__<name-only-low-case>.md` | `Docs__<kebab-case-name>.md` | `docs__architecture-update.md` | `Docs__architecture-update.md` |
| Skill | `skill__<name-only-low-case>.md` | `Skill__<kebab-case-name>.md` | `skill__create-analyze-request.md` | `Skill__create-analyze-request.md` |
| Code review | `code-review___<file-name-only-low-case>.md` | `CodeReview__<kebab-case-name>.md` | `code-review___browser-tabs.filter-bar.js.md` | `CodeReview__browser-tabs.filter-bar.js.md` |
| Plan | `plan__<name-only-low-case>.md` | `Plan__<kebab-case-name>.md` | `plan__new-filter-system.md` | `Plan__new-filter-system.md` |
| Workflow | `workflow__<name-only-low-case>.md` | `Workflow__<kebab-case-name>.md` | `workflow__session-start-hook.md` | `Workflow__session-start-hook.md` |

- [x] Replace the full table in `file-naming/SKILL.md` with the updated formats and examples above.

### Step 2 — Update `file-naming/SKILL.md`: inline references

Two sentences in the "When to Use Each Type" section reference old prefixes inline:

- Line containing `never use 'new-feature__'` (in the **Skill** section) → change to `never use 'NewFeature__'`
- Line containing `never use 'new-feature__'` (in the **Workflow / Automation** section) → change to `never use 'NewFeature__'`

- [x] Find both occurrences of `` `new-feature__` `` in the "When to Use" section and replace each with `` `NewFeature__` ``.

### Step 3 — Update `task-changelog/SKILL.md`: prefix detection table

The table in section 2a currently has two prefix variants per row (old PascalCase-underscore and old all-lowercase-double-underscore). Add a third variant — the new PascalCase double-underscore — to each row:

| Update this row | Add this third variant |
|---|---|
| `Issue_` or `issue__` | add `or 'Issue__'` |
| `NewFeature_` or `new-feature__` | add `or 'NewFeature__'` |
| `Rework_` or `rework__` | add `or 'Rework__'` |
| `Refactoring_` or `refactoring__` | add `or 'Refactoring__'` |
| `Docs_` or `docs__` | add `or 'Docs__'` |
| `Skill_` or `skill__` | add `or 'Skill__'` |
| `CodeReview_` or `code-review___` | add `or 'CodeReview__'` |

- [x] Update each row in the prefix detection table in `task-changelog/SKILL.md` to include the new PascalCase double-underscore variant.

### Step 4 — Update `js-refactor/SKILL.md`

Three lines hardcode the old `refactoring__` prefix. Replace each with `Refactoring__`:

- Line: `Create tasks/main-tasks/documented/refactoring__<filename>.md` → `Refactoring__<filename>.md`
- Line: `tasks/main-tasks/documented/refactoring__<js-filename>.md` → `Refactoring__<js-filename>.md`
- Line: `Example: reviewing action-bar.js → tasks/main-tasks/documented/refactoring__action-bar.js.md` → `Refactoring__action-bar.js.md`

- [x] Replace all three occurrences of `refactoring__` in `skills/js-refactor/SKILL.md` with `Refactoring__`.

### Step 5 — Update `js-refactor/references/report-template.md`

Two lines hardcode the old prefix:

- `tasks/main-tasks/documented/refactoring__<js-filename>.md` → `Refactoring__<js-filename>.md`
- `Example: tasks/main-tasks/documented/refactoring__action-bar.js.md` → `Refactoring__action-bar.js.md`

- [x] Replace both occurrences of `refactoring__` in `skills/js-refactor/references/report-template.md` with `Refactoring__`.

---

## After Implementation
*Implemented: March 7, 2026*

### What changed

`skills/file-naming/SKILL.md`
- Changed the naming table to the new `PascalCase__kebab-case-name.md` standard for every task type.
- Updated the two inline examples that still told people to use the old `new-feature__` prefix.

`skills/task-changelog/SKILL.md`
- Expanded the filename-detection table so changelog generation now recognizes the old single-underscore style, the old lowercase double-underscore style, and the new PascalCase double-underscore style.

`skills/js-refactor/SKILL.md`
- Changed the refactoring output filename examples from `refactoring__...` to `Refactoring__...`.

`skills/js-refactor/references/report-template.md`
- Updated the report template so new refactoring reports use the same new filename style as the skill instructions.

### Risks / What might break

- This touches the written instructions that other agent workflows follow, so an older workflow file could still mention the previous naming style and create mixed naming until that file is updated too.
- The changelog skill now accepts more filename styles, so if another rule elsewhere assumes only one style exists, that older rule could still disagree with it.

### Manual checks

- Open `skills/file-naming/SKILL.md` and confirm each example starts with a PascalCase type like `Issue__` or `NewFeature__`. Success looks like there are no lowercase task-type prefixes left in the table.
- Open `skills/task-changelog/SKILL.md` and confirm each task-type row lists three accepted prefixes. Success looks like the new `Issue__`, `NewFeature__`, `Rework__`, and similar forms are present.
- Open both JS refactor files and confirm their example filenames now start with `Refactoring__`. Success looks like there are no remaining `refactoring__` examples in those two files.
