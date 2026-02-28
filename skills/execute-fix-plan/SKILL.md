---
name: execute-fix-plan
description: Implements the fix plans from a post-implementation review (PIR). Reads one reviewed task file, classifies each PIR finding as fixable or skippable, applies all fixable fixes, appends a Post-Implementation Fixes section, and moves the task file to the correct folder based on remaining skipped items. Use when the user invokes /execute-fix-plan, says "execute the fix plan", "fix the next reviewed task", "apply the PIR fixes", or provides a reviewed task file path. Processes exactly one task per invocation. In pending-fix folder mode (no task specified), scans tasks/main-tasks/pending-fix and picks the first task file.
---

# execute-fix-plan

Implements PIR fix plans for exactly one task per invocation, then stops.

**Two modes:**
- **Pending-fix folder mode** (no task specified): scan `tasks/main-tasks/pending-fix` and pick the first task file.
- **Direct mode** (user names a task): use that task file as `TARGET_TASK_FILE`. Skip folder scan.

---

## 1. Select target

**Pending-fix folder mode:** Read `tasks/main-tasks/pending-fix`, gather `*.md` files, sort alphabetically, and select the first file as `TARGET_TASK_FILE`. If none exist: report "No pending-fix tasks to process" and stop.

**Direct mode:** Set `TARGET_TASK_FILE` to the path the user provided.

---

## 2. Load authoritative documentation

Invoke the `doc-guide` skill and load the docs it prescribes for this task type (always: `ARCHITECTURE.md`, `FEATURE_MAP.md`; conditionals based on file types being reviewed).

---

## 3. Parse TARGET_TASK_FILE

1. Read `TARGET_TASK_FILE` fully.
2. Produce `FILES_TO_INSPECT`:
   - If `Agreed Scope` lists specific file paths: extract those paths.
   - If `Agreed Scope` is vague or does not list explicit paths: infer likely owning modules from `FEATURE_MAP.md` using the features described in the task.
3. Collect all PIR findings from the `## Post-Implementation Review` section.
4. For each PIR finding, classify:
   - **Fixable**: Fix risk is Low or Medium, `Requires human judgment` is No, and a Fix Plan with at least one step is present.
   - **Skippable**: Fix risk is High, `Requires human judgment` is Yes, Fix Plan is absent, or Fix Plan is marked N/A. Treat a missing Fix Plan as `Requires human judgment`.

---

## 4. Implement each fix

Do not review or rewrite fix plans. Start implementation immediately using the classification above.

For each **fixable** PIR, working in order:

1. If the source file has not been loaded yet: read it now.
2. Apply each step in the Fix Plan using targeted edits. Prefer `Edit` over `Write` unless changes are too scattered.
3. After each successful change: mark the Fix Plan checklist item as `- [x]` inside the PIR finding immediately. Do not batch updates.
4. After the full PIR is resolved: create a commit using Conventional Commits format.
   - Always run the `git-commit` skill before writing any commit message.
   - Use type `fix` and scope `code-review`.
   - Example: `fix(code-review): address null-check issue found in review`

---

## 5. Append Post-Implementation Fixes section

Append to the end of `TARGET_TASK_FILE`:

```markdown
---

## Post-Implementation Fixes
*Implemented: <Month D, YYYY>*

- [x] **PIR-01**: <Title>
  - **What changed**: [Plain-language description. No jargon. No code snippets.]

- [ ] **PIR-02**: <Title>
  - High fix risk

- [ ] **PIR-03**: <Title>
  - Requires human judgment
```

Rules:
- Include every PIR from the review, fixed or not.
- Fixed PIRs: mark `[x]`; include a `**What changed**` line in plain language.
- Skipped PIRs: mark `[ ]`; include only the skip reason, no `**What changed**` line.
- Skip reasons: `High fix risk` / `Requires human judgment` / `No fix plan provided - Requires human judgment`.

---

## 6. Update status and move task file

In `TARGET_TASK_FILE`, update `**Status**` to one of:

- `FINISHED`: every PIR was fixed.
- `PENDING_HUMAN_REVIEW`: at least one PIR was skipped (high risk, human judgment, or no fix plan).

Then move the task file:

- If a destination folder does not exist yet, create it first.
- If status is `FINISHED`: move `TARGET_TASK_FILE` to `tasks/main-tasks/finished-tasks`.
- If status is `PENDING_HUMAN_REVIEW`: move `TARGET_TASK_FILE` to `tasks/main-tasks/pending-human-review`.

---

## 7. Print summary

Print a short plain-language summary:

- For each fixed PIR: one sentence, what was wrong and what was done to fix it.
- For each skipped PIR: one sentence, what it is and why it was not fixed.
- End with the final status.

Example:
> **PIR-01 (fixed):** The null check was missing before reading the entry's key field - added a guard so the code no longer crashes when the key is empty.
>
> **PIR-02 (skipped - high fix risk):** The event listener is registered without cleanup. Fixing this would require restructuring how the module initializes - left for human review.
>
> **Status:** PENDING_HUMAN_REVIEW - 1 issue was not resolved and requires human judgment.

Then stop.
