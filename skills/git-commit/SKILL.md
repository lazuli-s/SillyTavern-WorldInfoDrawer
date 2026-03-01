---
name: git-commit
description: "Commit message conventions for the SillyTavern extension. ALWAYS load this skill before creating any git commit — it defines the required format, allowed types, canonical scope list, body/footer rules, and breaking-change notation. Use when the user asks to commit, create a commit, or write a commit message."
---

# Git Commit Conventions

## Format

```
type(scope): lowercase description, imperative mood, no period at end
```

Subject line must be **under 72 characters**.

---

## Default Staging Scope

Unless the user explicitly says otherwise, stage and commit **only files changed during the current session**.

- Do not include unrelated pre-existing modified/untracked files.
- If unrelated files exist, leave them unstaged by default.
- Include unrelated files only when the user explicitly requests it.

---

## Types

| Type | When to use |
| --- | --- |
| `new-feat` | New feature or behavior added from scratch |
| `rework` | Intentional change to how an existing feature works or looks — behavior or design intent changed |
| `fix` | Bug fix |
| `style` | CSS or visual tweak with no behavior change (colors, spacing, alignment) |
| `docs` | Documentation or architecture files only |
| `refactor` | Code restructured without changing behavior |
| `chore` | Config, tooling, maintenance, moving files (no production code) |
| `code-review` | The review activity itself — planning, findings, tracking, or implementation notes |

---

## Canonical Scopes

Always pick the narrowest matching scope. Omit scope only when the change is truly cross-cutting and no single area owns it.

| Scope | Covers |
| --- | --- |
| `ui` | General UI layout, controls, panels, interactive behaviors |
| `css` | Visual-only changes (colors, spacing, sizing) |
| `editor` | Entry editor panel |
| `list-panel` | Entry list, selection, drag-and-drop |
| `order-helper` | Order helper feature |
| `filter-bar` | Filter/search bar |
| `settings` | Extension settings |
| `state` | State management |
| `booksView` | Books/world selector view |
| `tasks` | Task files and queue management |
| `architecture` | ARCHITECTURE.md, FEATURE_MAP.md |
| `skills` | Skills under `skills/` |
| `workflows` | Workflow definitions and pipelines |

> New scopes may be introduced when a clearly distinct area warrants it. Keep names lowercase and hyphenated.

---

## Body and Footer

Add a body only when the subject line alone is insufficient:

- **Why not obvious** — add one sentence explaining the reason
- **Spans 3+ modules** — briefly list what changed where
- **Breaking change** — required; see below

Separate the body from the subject with a blank line.

### Breaking Changes

When a commit changes public-facing behavior (exported functions, event names, public APIs), append a footer:

```
BREAKING CHANGE: <what changed and what callers must update>
```

Example:

```
rework(order-helper): rename sortEntries to sortEntriesByPosition

The old name was ambiguous. All callers must update the import.

BREAKING CHANGE: sortEntries renamed to sortEntriesByPosition
```

---

## Examples

```
fix(editor): prevent blank flash on entry clear
new-feat(ui): add collapsible visibility row
rework(ui): redesign visibility row to use icon chips
style(css): remove unused row divider styles
docs(tasks): update task file for order-helper refactor
refactor(list-panel): extract selection logic into own module
code-review(sortHelpers.js): add findings for sort helpers
fix(code-review): address null-check issue found in review
chore: update .gitignore to exclude codex logs
```
