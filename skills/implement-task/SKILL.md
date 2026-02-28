---
name: implement-task
description: Implements a documented task from the tasks/main-tasks/pending-implementation (or a user-specified task file) by loading authoritative docs, reviewing and correcting the implementation plan, applying each step, updating architecture docs if needed, and marking the task IMPLEMENTED. Use when the user invokes /implement-task, says "implement the next task", "implement this task", or provides a task file path to implement. Do NOT use when the user wants to plan or analyze a request — use analyze-request for that.
---

# implement-task

Implements exactly one task per invocation, then stops.

**Two modes:**
- **Direct mode** (user names a task): use that task file as `TARGET_TASK_FILE`. Skip folder scan.
- **Pending-implementation folder mode** (no task specified): scan `tasks/main-tasks/pending-implementation` and pick the first task file in alphabetical order.

---

## 1. Select target

**Pending-implementation folder mode:** Read `tasks/main-tasks/pending-implementation`, collect task files (`*.md`), sort alphabetically, and set the first file as `TARGET_TASK_FILE`. If none exist: report "No pending-implementation tasks to implement" and stop.

**Direct mode:** Set `TARGET_TASK_FILE` to the path the user provided.

---

## 2. Load authoritative documentation

Invoke the `doc-guide` skill and load the docs it prescribes for this task type.

---

## 3. Parse the task file

1. Read `TARGET_TASK_FILE` fully.
2. Produce `FILES_TO_INSPECT`:
   - If `Agreed Scope` lists specific file paths: extract those.
   - If `Agreed Scope` is vague: infer owning modules from `FEATURE_MAP.md` and record in the task file: *"Files inferred from FEATURE_MAP.md; Agreed Scope did not list explicit paths."*

---

## 4. Review and correct the implementation plan

Before writing any code, load the `skills/st-js-best-practices/SKILL.md` skill and use it to review each checklist item in `Implementation Plan`.

When the task touches World Info APIs, also verify plan steps against `skills/st-world-info-api/SKILL.md` (correct CRUD APIs and anti-pattern avoidance).

If violations found: rewrite the affected checklist item(s) in-place and append a short note explaining what changed and why.
*Example: "Step 3 rewritten: original used direct DOM injection without sanitization — corrected to use DOMPurify per SEC-01."*

---

## 5. Implement each step

For each item in `Implementation Plan`, in order:

1. If the source file has not been loaded yet, read it now.
2. Apply the change using a targeted edit. Prefer `Edit` over `Write` unless changes are too scattered.
3. After each successful change: mark the item `- [x]` in the task file immediately. Do not batch updates.

---

## 6. Update architecture documentation

After all steps are complete, check whether the implementation:
- Added a new feature surface
- Moved logic between modules
- Changed which module owns a behavior

If any are true: update `FEATURE_MAP.md` and/or `ARCHITECTURE.md` to reflect the new state.

---

## 7. Write After Implementation section

Append to `TARGET_TASK_FILE`:

```markdown
---

## After Implementation
*Implemented: <Month D, YYYY>*

### What changed

[List each file changed, then 1–3 bullets per file in plain language. No jargon. No code snippets.]

### Risks / What might break

[1–3 plausible side effects in plain language.
Style: "This touches X, so it might affect Y or Z."]

### Manual checks

[Concrete, observable steps the user can take to verify the change.
Each item must state what success looks like in plain terms.
Cover every risk listed above.]
```

---

## 8. Update status

In `TARGET_TASK_FILE`, update to:

```markdown
**Status:** IMPLEMENTED
```

---

## 9. Move task file

Move `TARGET_TASK_FILE` to `tasks/main-tasks/implemented-tasks`.

Then stop.
