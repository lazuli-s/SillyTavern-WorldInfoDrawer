---
name: implement-task
description: "This skill should be used when the user wants to implement the next pending task from tasks/TASKS_PENDING_IMPLEMENTATION.md — tasks analyzed and defined by the analyze-request skill. It loads authoritative docs, resolves open questions via code inspection, builds a step-by-step implementation checklist inside the task file, implements all changes, updates architecture docs if needed, writes an After Implementation section, and queues the task for post-implementation review. Use when the user says 'implement the next task', 'run /implement-task', or invokes /implement-task. Do NOT use when the user is still defining a request — use analyze-request for that instead."
---

# implement-task

An implementation skill for the SillyTavern WorldInfoDrawer extension.

Takes the next pending task from `tasks/TASKS_PENDING_IMPLEMENTATION.md`, plans a detailed
implementation checklist, implements it, and hands off to post-implementation review.

---

## Role

Act as an experienced programmer implementing changes to this third-party SillyTavern
frontend extension. Prioritize correctness and minimal-diff changes over cleverness.

- Reuse existing functions and variables whenever possible.
- Introduce new functions only when the behavior cannot be implemented by modifying existing ones.
- Introduce new variables/styles only when no existing one can be safely reused.
- Preserve current behavior unless the task file explicitly says to change it.

---

## Step 1: Scan the pending implementation list

1. Read `tasks/TASKS_PENDING_IMPLEMENTATION.md`.
2. Locate the section `## Tasks Pending Implementation`.
3. If the list is empty: report "No tasks pending -- queue is empty." and stop.
4. Otherwise: choose the **first** file as `TARGET_TASK_FILE`.

---

## Step 2: Load authoritative docs (mandatory -- do this before reading the task file)

Read all of the following:

1. `ARCHITECTURE.md` -- module responsibilities and boundaries
2. `FEATURE_MAP.md` -- where each feature lives in the codebase
3. `SILLYTAVERN_OWNERSHIP_BOUNDARY.md` -- integration contract (what ST owns vs. extension)
4. `.claude/skills/st-js-best-practices/references/patterns.md` -- JS best practices (SEC/PERF/COMPAT rules)
5. `.claude/skills/st-world-info-api/references/wi-api.md` -- WI API reference and anti-patterns

If the task involves WI books, entries, or events, also load:
- `vendor/SillyTavern/public/scripts/st-context.js` (ST API shape confirmation)

---

## Step 3: Read and parse the task file

1. Read `TARGET_TASK_FILE`.
2. Identify the following sections:
   - **Summary** -- what the task is about
   - **Current Behavior** -- what the code does today
   - **Expected Behavior** -- what it should do after the fix
   - **Agreed Scope** -- which files and functions are involved
   - **Open Questions / Assumptions** -- unresolved items from the analysis phase
   - **Out of Scope** -- what NOT to touch

3. From `FEATURE_MAP.md`: identify the owning module(s) for the behavior being changed.
   Flag any scope item that falls outside the stated module responsibilities.

---

## Step 4: Resolve open questions (if any)

If `Open Questions / Assumptions` contains unresolved items:

1. Read each source file mentioned in the task's Agreed Scope.
2. Try to answer each open question from the code itself.
3. For each question:
   - If resolvable from code: document the resolution in the plan (Step 5).
   - If NOT resolvable from code: make a reasonable assumption, document it clearly, and add
     a corresponding manual check item (Step 8).
4. Do NOT stop to ask the user unless the open question is blocking and genuinely
   unanswerable from code inspection alone.

---

## Step 5: Build the implementation plan checklist

Before writing any code:

1. Read every source file listed in `Agreed Scope`.
2. For each file: identify the exact functions, lines, and variables to change.
3. Append a `## Implementation Plan` section to `TARGET_TASK_FILE`.

Format:

    ## Implementation Plan

    - [ ] Read `src/example.js` and locate function `doThing()`
    - [ ] In `doThing()`, after the call to `mutateEntry()`, call `syncFilters()` to refresh state
    - [ ] In `src/otherFile.js`, pass `syncFilters` into `buildRow()` alongside `applyFilter`
    - [ ] Confirm `syncFilters` is exported from `orderHelperFilters.js` (already exported -- no change needed)

Rules for checklist items:
- Each item is **concrete**: name the exact function, variable, and file.
- Each item is **self-contained**: an LLM can execute it without human input.
- Steps are **ordered** to satisfy dependencies (e.g., export before calling).
- Steps requiring NO change are noted as "no change needed" to avoid confusion.

---

## Step 6: Implement each step in order

For each step in the `## Implementation Plan` checklist:

1. Read the source file if not already loaded.
2. Apply the change using targeted edits (prefer Edit over Write unless changes are too scattered).
3. After each successful change, mark the corresponding item as `- [x]` in the task file.
4. Follow all rules from the authoritative docs loaded in Step 2:
   - SEC/PERF/COMPAT patterns from `st-js-best-practices`
   - WI API ownership rules from `st-world-info-api`
   - Module boundaries from `ARCHITECTURE.md`
   - Integration contract from `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`

---

## Step 7: Update architecture docs (if scope changed)

After implementing all changes:

1. If a **new feature** was added: update `FEATURE_MAP.md` to list it under the owning module.
2. If a feature was **moved** from one module to another: update both `FEATURE_MAP.md` and
   `ARCHITECTURE.md` to reflect the new ownership.
3. If nothing changed in module ownership: skip this step.

---

## Step 8: Write the "After Implementation" section

Append the following section to `TARGET_TASK_FILE`:

    ## After Implementation

    ### What changed

    - Files changed: `src/example.js`, `src/otherFile.js`
      - `doThing()` -- now calls `syncFilters()` after mutating entries
      - `buildRow()` -- receives `syncFilters` as a parameter alongside `applyFilter`

    ### Risks / What might break

    - This touches the outlet filter sync flow, so it might affect inline outlet edits or
      filter indicator refresh timing if those call the same path.
    - If `syncFilters` is called before mutation completes in a fast sequence, the filter
      snapshot might miss the latest value.

    ### Manual checks

    - [ ] Open Order Helper, select 3 entries, apply a new outlet name via bulk edit; confirm
      all 3 entries remain visible after Apply. (Success: entries stay in the table.)
    - [ ] Open Order Helper with an outlet filter already active, bulk-edit to a different
      outlet; confirm those entries disappear. (Success: intentional filter is respected.)

Tone and format rules:
- **What changed**: succinct. List files, then 1-3 bullets per file describing changes.
  No jargon. No code snippets.
- **Risks**: 1-3 plausible side effects in plain language. Style:
  "This touches X, so it might affect Y or Z."
- **Manual checks**: concrete, observable steps. Each item must say **what success looks like**
  in a few words. Cover the risk items listed above.

---

## Step 9: Update queue files

1. Remove `TARGET_TASK_FILE` from the bullet list under `## Tasks Pending Implementation`
   in `tasks/TASKS_PENDING_IMPLEMENTATION.md`.

2. Add `TARGET_TASK_FILE` to `tasks/POST_IMPLEMENTATION_REVIEW.md`:
   - If the file does not exist, create it with this header:

         # Post-Implementation Review Queue

         Tasks that have been implemented and are waiting for review.

         ---

         ## Tasks Pending Review

   - Append the task file path as a bullet:

         - `tasks/<filename>.md`

3. Keep separators and ordering style consistent with existing entries in both files.

---

## Step 10: Report completion

Tell the user:

- Which task was implemented (`TARGET_TASK_FILE`)
- A one-sentence plain-language summary of what changed
- That `tasks/POST_IMPLEMENTATION_REVIEW.md` was updated
- Prompt them to run the **Manual checks** listed in the task file before anything else

---

## Constraints (always apply)

- Do NOT modify `vendor/SillyTavern`.
- Do NOT introduce frameworks (React, Vue, etc.).
- Do NOT add new external dependencies.
- Do NOT change behavior outside the task's Agreed Scope without flagging it explicitly.
- Do NOT commit. The user commits when ready.
