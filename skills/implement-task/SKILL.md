---
name: implement-task
description: �Implements the next pending task from the main-tasks queue. Reads tasks/main-tasks-queue.md, picks the first item from '## Documented tasks', reviews and corrects its existing implementation plan for JS best practice and WI API violations, applies all code changes, writes an After Implementation section, and sets status to IMPLEMENTED. Use when the user says 'implement the next task', 'run /implement-task', or invokes /implement-task. Do NOT use when still defining a request - use analyze-request for that instead.�
metadata:
  sync:
    version: 2
    hash: sha256-fb292be9326729d0e0eeb1a4d3c01a50456572bf4baf51f86fa2e78852bb2ca6
---

# implement-task

An implementation skill for the SillyTavern WorldInfoDrawer extension.

Takes the next documented task from `tasks/main-tasks-queue.md`, validates and corrects its
implementation plan, implements all changes, and marks the task as IMPLEMENTED.

---

## Role

Act as an experienced programmer implementing changes to this third-party SillyTavern
frontend extension. Prioritize correctness and minimal-diff changes over cleverness.

- Reuse existing functions and variables whenever possible.
- Introduce new functions only when the behavior cannot be implemented by modifying existing ones.
- Introduce new variables/styles only when no existing one can be safely reused.
- Preserve current behavior unless the task file explicitly says to change it.

---

## Step 1: Select target from queue

1. Read `tasks/main-tasks-queue.md`.
2. Locate the section `## Documented tasks`.
3. If the section is empty or missing: report "No documented tasks — queue is empty." and stop.
4. Choose the **first** file path listed as `TARGET_TASK_FILE`.

---

## Step 2: Load authoritative docs (mandatory — do this before reading the task file)

Read `skills/doc-guide/SKILL.md` and load the docs it prescribes for this task.

---

## Step 3: Parse the task file

1. Read `TARGET_TASK_FILE`.
2. Identify these sections:
   - **Summary** — what the task is about
   - **Current Behavior** / **Expected Behavior** — the observable change
   - **Agreed Scope** — which files/functions are involved
   - **Out of Scope** — what NOT to touch
   - **Implementation Plan** — the checklist to execute

3. Produce `FILES_TO_INSPECT`:
   - If `Agreed Scope` lists specific file paths: extract those paths.
   - If `Agreed Scope` is vague or lists no explicit paths: infer owning modules from
     `FEATURE_MAP.md` using the features described in the task.
   - If files were inferred, record this at the top of the Implementation Plan:
     *"Files inferred from FEATURE_MAP.md — Agreed Scope did not list explicit paths."*

4. From `FEATURE_MAP.md`: confirm the owning module(s). Flag anything in scope that falls outside
   the stated module responsibilities.

---

## Step 4: Review and correct the implementation plan

### 4a: If the Implementation Plan is empty

Build it before reviewing:

1. Read every file in `FILES_TO_INSPECT`.
2. Identify the exact functions, lines, and variables to change.
3. Write the checklist into the `## Implementation Plan` section of `TARGET_TASK_FILE`.

Rules for checklist items:
- **Concrete**: name the exact function, variable, and file.
- **Self-contained**: an LLM can execute it without human input.
- **Ordered** to satisfy dependencies (e.g., export before calling).
- Steps requiring NO change are noted as "no change needed" to avoid confusion.

### 4b: Review the plan for violations

Check each checklist item against:

**JS best practice violations:**

| Code | Violation |
|---|---|
| SEC-01 | Unsanitized HTML inserted into DOM |
| SEC-02 | `eval()` or `new Function()` |
| SEC-03 | Secrets in source |
| PERF-01 | Large data stored in localStorage |
| PERF-02 | Event listeners without cleanup |
| PERF-03 | Blocking synchronous operations |
| COMPAT-01 | Direct ST internals access instead of `getContext()` |
| COMPAT-02 | Non-unique MODULE_NAME |
| COMPAT-03 | Settings not initialized with defaults |
| COMPAT-04 | Direct emission of ST-internal events |

**WI API violations:** Check against Section 11 anti-patterns in `wi-api.md`. Verify the plan
uses the correct API methods for book/entry CRUD.

If violations are found:
- Rewrite the affected checklist item(s) in-place with corrected steps.
- Append a short note directly below explaining what changed and why.
  *Example: "Step 3 rewritten: original used direct DOM injection without sanitization — corrected to use DOMPurify per SEC-01."*

---

## Step 5: Implement each step in order

For each item in the `## Implementation Plan` checklist:

1. Read the source file if not already loaded.
2. Apply the change using targeted edits (prefer Edit over Write unless changes are too scattered).
3. After each successful change: mark the item as `- [x]` in the task file immediately. Do not batch updates.
4. Follow all rules from the authoritative docs loaded in Step 2.

---

## Step 6: Update architecture docs (if scope changed)

After all steps are complete:

1. If a **new feature** was added: update `FEATURE_MAP.md` to list it under the owning module.
2. If a feature was **moved** between modules: update both `FEATURE_MAP.md` and `ARCHITECTURE.md`.
3. If nothing changed in module ownership: skip this step.

---

## Step 7: Write the "After Implementation" section

Append to `TARGET_TASK_FILE`:

```markdown
## After Implementation
*Implemented: <Month D, YYYY>*

### What changed

[List each file changed, then 1–3 bullets per file in plain language. No jargon. No code snippets.]

### Risks / What might break

[1–3 plausible side effects in plain language.
Style: "This touches X, so it might affect Y or Z."]

### Manual checks

[Concrete, observable steps. Each item must state what success looks like in plain terms.
Cover every risk listed above.]
```

Tone rules:
- **What changed**: succinct. List files, then 1–3 bullets per file. No code snippets.
- **Risks**: 1–3 plain-language side effects. "This touches X, so it might affect Y or Z."
- **Manual checks**: each item says **what success looks like** in a few words.

---

## Step 8: Set status to IMPLEMENTED

In `TARGET_TASK_FILE`, update the status line to:

```markdown
**Status:** IMPLEMENTED
```

Do NOT update `tasks/main-tasks-queue.md` — queue moves are handled by the sync_queue utility.

---

## Step 9: Report completion

Tell the user:

- Which task file was implemented (`TARGET_TASK_FILE`)
- A one-sentence plain-language summary of what changed
- The **Manual checks** list from the After Implementation section so they can verify immediately

---

## Constraints (always apply)

- Do NOT modify `vendor/SillyTavern`.
- Do NOT introduce frameworks (React, Vue, etc.).
- Do NOT add new external dependencies.
- Do NOT change behavior outside the task's Agreed Scope without flagging it explicitly.
- Do NOT commit. The user commits when ready.
- Do NOT update `tasks/main-tasks-queue.md` — sync_queue handles all queue updates.
