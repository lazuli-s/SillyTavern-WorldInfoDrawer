<task name="Implement Task (Step 2)">

<steps_overview>
- Pick the first task from "Documented tasks" in `tasks/main-tasks-queue.md`.
- Load authoritative docs
- Review and correct the implementation plan against JS best practices and WI API rules
- Implement each step in order
- Update architecture docs if ownership changed
- Write the After Implementation section
- Mark the task IMPLEMENTED

Process exactly one task per invocation, then stop.
</steps_overview>

<detailed_steps>

## 1. Select target

1. Read `tasks/main-tasks-queue.md`.
2. Under `## Documented tasks`, select the first item.
3. If none exist: report "No documented tasks to implement" and stop.
4. Set `TARGET_TASK_FILE` to the full path from the checklist.

---

## 2. Load authoritative documentation

Read:

- `AGENTS.md`
- `FEATURE_MAP.md`
- `ARCHITECTURE.md`
- `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`
- `.claude/skills/st-js-best-practices/references/patterns.md`
- `.claude/skills/st-world-info-api/references/wi-api.md`

If any source file is expected to use `SillyTavern.getContext()` or unfamiliar ST globals:

- Read `vendor/SillyTavern/public/scripts/st-context.js`

---

## 3. Parse TARGET_TASK_FILE

1. Read `TARGET_TASK_FILE` fully.

2. Produce `FILES_TO_INSPECT`:
   - If `Agreed Scope` lists specific file paths: extract those paths.
   - If `Agreed Scope` is vague or does not list explicit paths: infer likely owning modules from `FEATURE_MAP.md` using the features described in the task.
   - Record in the task file if files were inferred: "Files inferred from FEATURE_MAP.md; Agreed Scope did not list explicit paths."

---

## 4. Review and correct the implementation plan

Before writing any code, review the full task file against the loaded authoritative documentation.

Inside the `Implementation Plan` section, check each checklist item for the following violations:

### A. JS best practice violations

- **SEC-01:** Unsanitized HTML inserted into DOM
- **SEC-02:** `eval()` or `new Function()`
- **SEC-03:** Secrets in source
- **PERF-01:** Large data stored in localStorage
- **PERF-02:** Event listeners without cleanup
- **PERF-03:** Blocking synchronous operations
- **COMPAT-01:** Direct ST internals access
- **COMPAT-02:** Non-unique MODULE_NAME
- **COMPAT-03:** Settings not initialized with defaults
- **COMPAT-04:** Direct emission of ST-internal events

### B. WI API violations

- Check anti-patterns from `wi-api.md` Section 11.
- Verify the plan uses the correct API methods for book/entry CRUD.

If violations are found:

- Rewrite the affected checklist item(s) in-place with corrected steps.
- Append a short note directly below the checklist explaining what changed and why.
  Example: *"Step 3 rewritten: original used direct DOM injection without sanitization — corrected to use DOMPurify per SEC-01."*

---

## 5. Implement each step

For each item in the `Implementation Plan` checklist, working in order:

1. If the source file has not been loaded yet: read it now.
2. Apply the change using a targeted edit. Prefer `Edit` over `Write` unless changes are too scattered to apply as targeted edits.
3. After each successful change: mark the item as `- [x]` in the task file immediately. Do not batch updates.

---

## 6. Update architecture documentation

After all steps are complete, check whether the implementation:

- Added a new feature surface
- Moved logic between modules
- Changed which module owns a behavior

If any of the above are true:

- Update `FEATURE_MAP.md` to reflect the new ownership or feature location.
- Update `ARCHITECTURE.md` if module boundaries or responsibilities changed.

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

</detailed_steps>
</task>
