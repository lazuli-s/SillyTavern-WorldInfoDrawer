# TASK: Create doc-guide Skill as Single Source of Truth for Doc Loading
*Created: February 26, 2026*

**Type:** NEW_FEATURE
**Status:** IMPLEMENTED

---

## Summary

The "which docs to load and when" rules were duplicated across 11 files —
workflows, skills, agent definitions, and root config files. Any time a doc
was added or renamed, all 11 places had to be updated manually. This task
creates a single `doc-guide` skill that all other files delegate to.

## Current Behavior

Each workflow step, skill, and agent definition contains its own inline copy
of the doc-loading list. Steps 2, 3, and 4 of the main-tasks workflow are
100% identical copy-pastes of the same list.

## Expected Behavior

After this change, a single file — `skills/doc-guide/SKILL.md` — owns the
complete, conditional doc-loading rules. All other files replace their inline
lists with a one-liner: "Read `skills/doc-guide/SKILL.md` and load the docs
it prescribes for this task."

## Agreed Scope

Documentation files only — no JavaScript source code changed.

Files updated:
- `skills/doc-guide/SKILL.md` (new)
- `CLAUDE.md`
- `AGENTS.md`
- `workflows/main-tasks-workflow/step-1-analyze-request.md`
- `workflows/main-tasks-workflow/step-2-implement-task.md`
- `workflows/main-tasks-workflow/step-3-post-implementation-review.md`
- `workflows/main-tasks-workflow/step-4-execute-fix-plan.md`
- `workflows/cline/code-review-step-1-first-review.md`
- `skills/analyze-request/SKILL.md`
- `skills/implement-task/SKILL.md`
- `.claude/agents/javascript-pro.md`
- `.claude/agents/architect-review.md`

## Implementation Plan

- [x] Create `skills/doc-guide/SKILL.md` with complete conditional loading rules
- [x] Update `CLAUDE.md` Section 3 to reference the skill
- [x] Update `AGENTS.md` Section 3 to reference the skill
- [x] Update workflow step-1 doc-loading section
- [x] Update workflow step-2 doc-loading section
- [x] Update workflow step-3 doc-loading section
- [x] Update workflow step-4 doc-loading section
- [x] Update `skills/analyze-request/SKILL.md` Step 1
- [x] Update `skills/implement-task/SKILL.md` Step 2
- [x] Update `.claude/agents/javascript-pro.md` Mandatory Pre-Work
- [x] Update `.claude/agents/architect-review.md` pre-work section
- [x] Update `workflows/cline/code-review-step-1-first-review.md` doc-loading section

---

## After Implementation
*Implemented: February 26, 2026*

### What changed

- `skills/doc-guide/SKILL.md` (new): single source of truth for all doc-loading rules,
  organized into always-load and conditional sections, including a specific code-review
  variant. Incorporates the smart conditional logic previously found only in the
  code-review workflow.

- `CLAUDE.md`, `AGENTS.md`: Section 3 replaced with a one-liner directing agents to
  read the `doc-guide` skill instead of listing docs inline.

- 4 main-tasks workflow files, 2 skill files, 1 code-review workflow: doc-loading
  sections replaced with one-liner references to `skills/doc-guide/SKILL.md`.

- 2 agent files: Mandatory Pre-Work / pre-work sections simplified to reference the
  skill.

### Risks / What might break

- If an agent ignores or skips the doc-guide step, it will miss docs it would have
  previously loaded from the inline list. However, this risk existed before (agents
  could skip any step), and the skill description is now explicit and centralized.

- Agents that cannot invoke skills (subprocesses without the Skill tool) must
  read `skills/doc-guide/SKILL.md` directly via their `Read` or `read_file` tool.

### Manual checks

- Open any workflow file (e.g., `step-2-implement-task.md`) and confirm it no longer
  contains an inline list of docs — only a one-liner referencing `doc-guide`.
- Open `skills/doc-guide/SKILL.md` and confirm all 6+ docs are present with
  conditional rules intact.
- Confirm `CLAUDE.md` still mentions `doc-guide` by name so agents know it exists.
