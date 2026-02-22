<task name="Execute Fix Plan (Step 4)">

<steps_overview>
- Pick the first task from "### Tasks with issues found" in `tasks/main-tasks-queue.md`.
- Load authoritative docs.
- Read TARGET_TASK_FILE; collect PIR findings; classify each as fixable or skippable.
- Review each fixable PIR's fix plan against JS best practices and WI API rules.
- Implement each fixable PIR in order; commit after each one.
- Append a Post-Implementation Fixes section to the task file.
- Update Status: FINISHED or PENDING_FIX.
- Print a plain-language summary.

Process exactly one task per invocation, then stop.
</steps_overview>

<detailed_steps>

## 1. Select target

1. Read `tasks/main-tasks-queue.md`.
2. Under `### Tasks with issues found`, select the first item.
3. If none exist: report "No tasks with issues found" and stop.
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

3. Collect all PIR findings from the `## Post-Implementation Review` section.

4. For each PIR, classify:
   - **Fixable**: Fix risk is Low 🟢 or Medium 🟡, `Requires human judgment` is No, and a Fix Plan with at least one step is present.
   - **Skippable**: Fix risk is High 🔴, `Requires human judgment` is Yes, or Fix Plan is absent or marked N/A. Treat a missing Fix Plan as `⚠️ Requires human judgment`.

---

## 4. Review each fix plan

Before writing any code, review each **fixable** PIR's Fix Plan checklist against the loaded authoritative documentation.

Check each checklist item for the following violations:

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
- Verify the fix plan uses the correct API methods for book/entry CRUD.

If violations are found:

- Rewrite the affected checklist item(s) in-place with corrected steps.
- Append a short note directly below the checklist explaining what changed and why.
  Example: *"Step 2 rewritten: original used direct DOM injection without sanitization — corrected to use DOMPurify per SEC-01."*

---

## 5. Implement each fix

For each **fixable** PIR, working in order:

1. If the source file has not been loaded yet: read it now.
2. Apply each step in the Fix Plan using targeted edits. Prefer `Edit` over `Write` unless changes are too scattered to apply as targeted edits.
3. After each successful change: mark the Fix Plan checklist item as `- [x]` inside the PIR finding immediately. Do not batch updates.
4. After the full PIR is resolved: create a commit using Conventional Commits format from `AGENTS.md`.
   - Use type `tasks` and scope `code-review`.
   - Example: `tasks(code-review): address null-check issue found in review`

---

## 6. Append Post-Implementation Fixes section

Append to the end of `TARGET_TASK_FILE`:

```markdown
---

## Post-Implementation Fixes
*Implemented: <Month D, YYYY>*

- [x] **PIR-01**: <Title>
  - **What changed**: [Plain-language description. No jargon. No code snippets.]

- [ ] **PIR-02**: <Title>
  - High fix risk 🔴

- [ ] **PIR-03**: <Title>
  - ⚠️ Requires human judgment
```

Rules:
- Include every PIR from the review, fixed or not.
- Fixed PIRs: mark `[x]`; include a `**What changed**` line in plain language.
- Skipped PIRs: mark `[ ]`; include only the skip reason — no `**What changed**` line.
- Skip reasons: `High fix risk 🔴` / `⚠️ Requires human judgment` / `No fix plan provided — ⚠️ Requires human judgment`.

---

## 7. Update status

In `TARGET_TASK_FILE`, update `**Status**`.

Choose one:

- `FINISHED`: every PIR was fixed
- `PENDING_FIX`: at least one PIR was skipped (high risk, human judgment, or no fix plan)

---

## 8. Print summary

After updating the status, print a short plain-language summary for the user:

- For each fixed PIR: one sentence — what was wrong and what was done to fix it.
- For each skipped PIR: one sentence — what it is and why it was not fixed.
- End with the final status.

Example:

> **PIR-01 (fixed):** The null check was missing before reading the entry's key field — added a guard so the code no longer crashes when the key is empty.
>
> **PIR-02 (skipped — high fix risk):** The event listener is registered without cleanup. Fixing this would require restructuring how the module initializes — left for human review.
>
> **Status:** PENDING_FIX — 1 issue was not resolved and requires human judgment.

Then stop.

</detailed_steps>
</task>
