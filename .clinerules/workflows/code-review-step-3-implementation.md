<task name="Code Review - Step 3: Implementation">

<task_objective>
Iteratively process `tasks/code-reviews/QUEUE_IMPLEMENTATION.md` "Files Pending Implementation": for each pending `tasks/code-reviews/CodeReview_*.md`, reload authoritative docs, scan the review and its source file, check whether each finding is already fixed (via git log + REVIEW_TRACKER.md + source inspection), write a `### Final Implementation Checklist` inside each finding, implement all actionable findings in order, update the code review file with `### Implementation Notes`, update `REVIEW_TRACKER.md`, create/update `CODE_REVIEW_CHANGELOG.md`, remove from the implementation queue, then call `new_task` to clear context and repeat until none remain. Only output the created/updated files.
</task_objective>

<detailed_sequence_steps>

# Implementation Loop Process - Detailed Sequence of Steps

## 1. Start an iteration by scanning the pending implementation list (single source of truth)

1. Use `read_file` on `tasks/code-reviews/QUEUE_IMPLEMENTATION.md`.

2. Locate the section:

    - `## Files Pending Implementation`

3. Extract the file list items (bullet list entries like `- \`tasks/code-reviews/CodeReview_utils.js.md\``).

4. If the list is empty:
    1. Stop the loop and use `attempt_completion` to report completion of the workflow run (no pending files remaining).

5. Otherwise:
    1. Choose the **first** file in that list as `TARGET_REVIEW_FILE` (exactly as written, e.g. `tasks/code-reviews/CodeReview_drawer.js.md`).
    2. Derive `TARGET_SOURCE_FILE` from the filename (e.g. `CodeReview_drawer.js.md` → `src/drawer.js`), or read the header `# CODE REVIEW FINDINGS: \`<path>\`` in the review file to get the exact path.

---

## 2. Mandatory "before anything": reload authoritative docs for this iteration

> This workflow intentionally reloads docs **every iteration** because `new_task` clears context between files.

1. Use `read_file` on:
    1. `AGENTS.md` (mandatory constraints)
    2. `FEATURE_MAP.md` (feature ownership / locating)
    3. `ARCHITECTURE.md` (module responsibilities)
    4. `SILLYTAVERN_OWNERSHIP_BOUNDARY.md` (integration contract)
    5. `.claude/skills/st-js-best-practices/references/patterns.md` (JS best practices rules + patterns)

2. If `TARGET_SOURCE_FILE` imports from `world-info.js` or uses WI APIs: also load `.claude/skills/st-world-info-api/references/wi-api.md`.

3. If needed, load SillyTavern "ST Context" reference from:
    - `vendor/SillyTavern/public/scripts/st-context.js`

---

## 3. Scan the code review file and source file

1. Use `read_file` on `TARGET_REVIEW_FILE`.

2. Parse the review structure:
    1. Identify each finding section: `## F01: ...`, `## F02: ...`, etc.
    2. For each finding, record:
        - Its **verdict** from `REVIEW_TRACKER.md` (read it next): 🟢 / 🟡 / 🔴
        - Its **Reason** field from `REVIEW_TRACKER.md` (needed for 🟡 auto-revision)
        - Whether the STEP 2 meta-review contains a `🚩 Requires user input` flag
        - Any declared cross-finding dependencies (e.g. "Depends on F02 being applied first")

3. Use `read_file` on `tasks/code-reviews/REVIEW_TRACKER.md`.
    1. Locate the section for `TARGET_SOURCE_FILE`.
    2. For each finding (`F0X`), copy the **Verdict** and **Reason** fields into your working record.
    3. Confirm `Meta-reviewed: [X]` is set for every finding. If a finding has `Meta-reviewed: [ ]`, treat its verdict as 🔴 and skip it (it has not been approved for implementation).

4. Use `read_file` on `TARGET_SOURCE_FILE`.
    1. Read the full current source file.
    2. Identify any local helper modules imported by `TARGET_SOURCE_FILE`; read them only if needed to understand a specific finding.

---

## 4. Pre-implementation pass: determine status of each finding

For **each** finding with verdict 🟢 or 🟡 (skip 🔴 immediately — see below), determine whether it is **still present** or **already fixed**:

### Verify in source code

- Using the **Location** anchor snippet from the finding, confirm whether the defective code pattern still exists in the current source file read in Step 3.
- If the defect is **no longer present**: mark the finding as **Already Fixed (source)** and record the evidence (e.g. "guard added at line 42", "handler removed", "addressed in commit abc1234").
- If the defect is **still present**: mark the finding as **Needs Implementation**.

### Finding status summary

After Step 4, each finding has one of these statuses:

| Status | Condition |
|---|---|
| **Skip 🔴** | Verdict is 🔴 in tracker |
| **Skip 🚩** | Meta-review contains a `🚩 Requires user input` flag |
| **Already Fixed** | `Implemented: ✔` in tracker, OR defect absent from source |
| **Ready 🟢** | Verdict 🟢, defect still present |
| **Revised 🟡** | Verdict 🟡, defect still present — checklist must be auto-revised |

---

## 5. Write Final Implementation Checklists for ALL findings (before any code changes)

For **every** finding in `TARGET_REVIEW_FILE`, insert a `### Final Implementation Checklist` section immediately after the `### STEP 2: META CODE REVIEW` block.

Use `replace_in_file` or `write_to_file` to insert the content.

### Format for each status:

**Skip 🔴:**
```markdown
### Final Implementation Checklist

> Verdict: Implementation plan discarded 🔴 — skipped.
> Reason: <copy the Reason field from REVIEW_TRACKER.md>
```

**Skip 🚩:**
```markdown
### Final Implementation Checklist

> Verdict: Requires user input 🚩 — skipped.
> Reason: Cannot implement without runtime confirmation. <summarize the 🚩 flag from the meta-review in 1 sentence.>
```

**Already Fixed:**
```markdown
### Final Implementation Checklist

> Already fixed — not implemented.
> Evidence: <one sentence citing the evidence: specific line in source that shows the fix, or REVIEW_TRACKER.md entry>
```

**Ready 🟢 (copy original checklist):**
```markdown
### Final Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] <checklist step 1>
- [ ] <checklist step 2>
...
```

**Revised 🟡 (auto-revise based on the meta-review):**
```markdown
### Final Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: <write the reason here>
> Revisions applied: <1–2 sentences describing exactly what was changed in the checklist>

- [ ] <revised checklist step 1>
- [ ] <revised checklist step 2>
...
```

---

## 6. Determine implementation order

Before implementing, compute the final ordered list of findings to implement:

1. Start with all findings that have status **Ready 🟢** or **Revised 🟡**.
2. Within that set, sort: **🟢 first**, then **🟡 revised**.
3. Respect any declared cross-finding dependencies:
    - If the Final Implementation Checklist for F03 says "Depends on F02 being applied first", ensure F02 comes before F03 in the order, even if F02 is 🟡 and F03 is 🟢.
    - If a dependency target has status Skip or Already Fixed, proceed normally (treat the dependency as satisfied).
4. Findings with status Skip or Already Fixed are excluded from the implementation order.

---

## 7. Implement each finding in order

For each finding in the ordered list from Step 6:

1. Re-read the **Final Implementation Checklist** you wrote for this finding.
2. Implement each checklist step by modifying the source files.
    - Use `read_file` on any file you are about to modify (if not already read).
    - Use `replace_in_file` for targeted edits; use `write_to_file` only if changes are too scattered for targeted edits.
    - If the checklist requires changes in multiple source files (e.g. caller updates), implement all of them in this same finding pass.
3. After implementing, write the `### Implementation Notes` section (see Step 8) immediately.
4. Proceed to the next finding.

---

## 8. Write Implementation Notes for each finding

Immediately after implementing each finding (or determining it should be skipped), insert a `### Implementation Notes` section immediately after the `### Final Implementation Checklist` block.

### Format for implemented findings:

```markdown
### Implementation Notes

- What changed
  - Files changed: `<path/to/file.js>`
  - <1-line description of change 1>
  - <1-line description of change 2>
  - <1-line description of change 3 (if needed)>

- Risks / Side effects
  - <Short description of side effect> (probability: ⭕ / ❗ / ❗❗❗)
      - Manual check: <Concrete thing the user should do to verify. Include what success looks like.>
```

> **Risk format guidance:**
> - ⭕ = low or non-existent risk
> - ❗ = medium risk
> - ❗❗❗ = high risk
> - List 1–3 side effects maximum; only plausible ones.
> - Manual check steps must be concrete user actions, not abstract assertions. Good example: "Create a new book while another update is in progress; confirm it auto-scrolls and does not throw a console error." Bad example: "Verify the timing works correctly."

### Format for skipped / already-fixed findings:

```markdown
### Implementation Notes

❌ <Skipped — [reason: Implementation plan discarded 🔴 / Requires user input 🚩 / Already fixed]>
> <One sentence of evidence or reason. For 🔴: copy the Reason from the tracker. For 🚩: summarize the required input. For Already Fixed: cite evidence (commit, line, or tracker entry).>
```

---

## 9. Update REVIEW_TRACKER.md

After all findings are processed, use `replace_in_file` to update the `REVIEW_TRACKER.md` block for `TARGET_SOURCE_FILE`.

For each finding:

1. Set `Implemented:` to:
    - `✔` — if the finding was successfully implemented
    - `❌ Already fixed` — if the defect was no longer present in source
    - `❌ Skipped (🔴 discarded)` — if verdict was 🔴
    - `❌ Skipped (🚩 requires user input)` — if a 🚩 flag was present

2. Add an `Implementation Notes:` sub-bullet immediately after `Implemented:` with a **1-sentence** summary of what changed (or why it was skipped). Examples:
    - `Implementation Notes: Added pointercancel to drag cleanup handler in splitter drag lifecycle.`
    - `Implementation Notes: Already fixed — guard present at line 42 of current source.`
    - `Implementation Notes: Skipped — plan discarded; requires confirmed lifecycle hook for teardown.`

Do **not** modify the `Meta-reviewed` or `Verdict` or `Reason` fields.

---

## 10. Create or update CODE_REVIEW_CHANGELOG.md

1. If `tasks/code-reviews/CODE_REVIEW_CHANGELOG.md` does not exist, create it with a header:

    ```markdown
    # Code Review Implementation Changelog

    Changes applied from code review findings across the extension's source files.

    ---
    ```

2. Use `read_file` on `CODE_REVIEW_CHANGELOG.md` (if it exists).

3. Prepend a new dated section at the top of the changelog (below the header), in this format:

    ```markdown
    ## <Month D, YYYY>

    ### `<TARGET_SOURCE_FILE>`

    - **F01** — <Finding title>: <summary of what changed>
    - **F06** — <Finding title>: <summary of what changed>
    ```

    > Only include findings that were **implemented** (✔). Do not list skipped or already-fixed findings.
    >
    > If no findings were implemented for this file (all were skipped/already fixed), add a note instead:
    > ```markdown
    > ### `<TARGET_SOURCE_FILE>`
    >
    > *No changes — all findings were skipped or already resolved.*
    > ```

4. Use `write_to_file` to save the updated changelog.

---

## 11. Update queue files (preserve structure)

1. In `tasks/code-reviews/QUEUE_IMPLEMENTATION.md`: use `replace_in_file` to remove `TARGET_REVIEW_FILE` from the bullet list under `## Files Pending Implementation`.

2. Keep each file's separators and ordering style (the `---` lines, blank lines, indentation) consistent with existing entries.

---

## 12. Clear context and repeat

1. After updating all queue files, re-read `tasks/code-reviews/QUEUE_IMPLEMENTATION.md`. Take the **exact path** of the first entry under `## Files Pending Implementation` — this is `NEXT_FILE`.

2. If `## Files Pending Implementation` in `tasks/code-reviews/QUEUE_IMPLEMENTATION.md` is now empty, skip to Step 13 (Finalize).

3. Call `new_task` with the following prompt, substituting the actual `NEXT_FILE` path — do NOT use a placeholder:

    ```text
    Your immediate task is applying the `.clinerules/workflows/code-review-step-3-implementation.md` workflow on `<NEXT_FILE>`.
    ```

---

## 13. Finalize the workflow run

1. When `## Files Pending Implementation` in `tasks/code-reviews/QUEUE_IMPLEMENTATION.md` becomes empty:
    1. Use `attempt_completion` to indicate that all pending implementation files have been processed and all queues, trackers, and changelogs have been updated.

</detailed_sequence_steps>

</task>
