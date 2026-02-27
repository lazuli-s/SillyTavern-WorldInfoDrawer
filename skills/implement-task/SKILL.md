---
name: implement-task
description: Implements a documented task from the main tasks queue (or a user-specified task file) by loading authoritative docs, reviewing and correcting the implementation plan, applying each step, updating architecture docs if needed, and marking the task IMPLEMENTED. Use when the user invokes /implement-task, says "implement the next task", "implement this task", or provides a task file path to implement. Do NOT use when the user wants to plan or analyze a request — use analyze-request for that.
---

# implement-task

Implements exactly one task per invocation, then stops.

**Two modes:**
- **Queue mode** (no task specified): read `tasks/main-tasks-queue.md`, pick the first entry under `## Documented tasks`.
- **Direct mode** (user names a task): use that task file as `TARGET_TASK_FILE`. Skip queue lookup.

---

## 1. Select target

**Queue mode:** Read `tasks/main-tasks-queue.md`. Under `## Documented tasks`, select the first item and set it as `TARGET_TASK_FILE`. If none exist: report "No documented tasks to implement" and stop.

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

Before writing any code, check each checklist item in `Implementation Plan` for violations.

**JS best practice violations:**

| Code | Rule |
| --- | --- |
| SEC-01 | Unsanitized HTML inserted into DOM |
| SEC-02 | `eval()` or `new Function()` |
| SEC-03 | Secrets in source |
| PERF-01 | Large data stored in localStorage |
| PERF-02 | Event listeners without cleanup |
| PERF-03 | Blocking synchronous operations |
| COMPAT-01 | Direct ST internals access |
| COMPAT-02 | Non-unique MODULE_NAME |
| COMPAT-03 | Settings not initialized with defaults |
| COMPAT-04 | Direct emission of ST-internal events |

**WI API violations:** Check anti-patterns from `wi-api.md` Section 11 and verify the plan uses correct API methods for book/entry CRUD.

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

Then stop.
