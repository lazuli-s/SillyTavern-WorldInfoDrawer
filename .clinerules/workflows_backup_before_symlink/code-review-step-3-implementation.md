<task name="Code Review - Step 3: Implementation">

<task_objective>
Process `tasks/code-reviews/queue-code-review.md` "Files Pending Implementation": for the first pending `tasks/code-reviews/CodeReview_*.md`, load authoritative docs, scan the review and its source file, check whether each finding is already fixed (via changelog + source inspection), overwrite the `#### Implementation Checklist` with an "Already fixed" note when applicable, implement all actionable findings in order (checking off `[ ]` items as they complete), update the code review file with a `### STEP 3: IMPLEMENTATION` section containing `#### Implementation Notes`, update `REVIEW_TRACKER.md`, move the file to "Files Pending Changelog" in the queue. Only output the created/updated files. Output proper emojis.
</task_objective>

<detailed_sequence_steps>

# Implementation Process - Detailed Sequence of Steps

## Editing tool policy (encoding safety)

When this workflow edits existing text files, prefer `apply_patch` for targeted changes.
Do not write workflow/review markdown content through shell text output commands, because Windows encoding mismatches can corrupt symbols.

## 1. Start an iteration by scanning the pending implementation list (single source of truth)

1. Use `read_file` on `tasks/code-reviews/queue-code-review.md`.

2. Locate the section:

    - `## Files Pending Implementation`

3. Extract the file list items (bullet list entries like `- \`tasks/code-reviews/CodeReview_utils.js.md\``).

4. If the list is empty:
    1. Stop and use `attempt_completion` to report completion of the workflow run (no pending files remaining).

5. Otherwise:
    1. Choose the **first** file in that list as `TARGET_REVIEW_FILE` (exactly as written, e.g. `tasks/code-reviews/CodeReview_drawer.js.md`).
    2. Derive `TARGET_SOURCE_FILE` from the filename (e.g. `CodeReview_drawer.js.md` → `src/drawer.js`), or read the header `# CODE REVIEW FINDINGS: \`<path>\`` in the review file to get the exact path.

---

## 2. Mandatory: load authoritative docs for this iteration


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

### Check the implementation changelog

- Use `read_file` on `tasks/code-reviews/CODE_REVIEW_CHANGELOG.md`.
- Scan for any recent entry (within the last few dated sections) that references `TARGET_SOURCE_FILE`.
- If a matching entry is found: mark the finding as **Already Fixed (changelog)** and record the evidence (e.g. "logged in changelog entry dated February 15, 2026 — pointercancel added to splitter drag"). Then verify via source code (step below) before finalizing the "Already Fixed" status.

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
| **Already Fixed** | `Implemented: ✅` in tracker, OR defect absent from source |
| **Ready 🟢** | Verdict 🟢, defect still present |
| **Ready 🟡** | Verdict 🟡, defect still present — `#### Implementation Checklist` already revised by Step 2 |

---

## 5. Update `#### Implementation Checklist` for Already Fixed findings (before any code changes)

For findings with **Already Fixed** status only: overwrite the `#### Implementation Checklist` block inside the `### STEP 2: META CODE REVIEW` section with an "Already fixed" note.

Use `replace_in_file` to replace the entire `#### Implementation Checklist` block (from the `#### Implementation Checklist` heading through the last `- [ ]` item) with:

```markdown
#### Implementation Checklist

> Already fixed — not implemented.
> Evidence: <one sentence citing the evidence: specific line in source that shows the fix, or REVIEW_TRACKER.md entry>
```

For **Skip 🔴** and **Skip 🚩** findings: no `#### Implementation Checklist` exists in the file — nothing to update here.

For **Ready 🟢** and **Ready 🟡** findings: the `#### Implementation Checklist` was already written by Step 2 — do not modify it before implementing. Checklist items will be checked off (`[x]`) during implementation in Step 7.

---

## 6. Determine implementation order

Before implementing, compute the final ordered list of findings to implement:

1. Start with all findings that have status **Ready 🟢** or **Ready 🟡**.
2. Within that set, sort: **🟢 first**, then **🟡**.
3. Respect any declared cross-finding dependencies:
    - If the `#### Implementation Checklist` for F03 says "Depends on F02 being applied first", ensure F02 comes before F03 in the order, even if F02 is 🟡 and F03 is 🟢.
    - If a dependency target has status Skip or Already Fixed, proceed normally (treat the dependency as satisfied).
4. Findings with status Skip or Already Fixed are excluded from the implementation order.

---

## 7. Implement each finding in order

For each finding in the ordered list from Step 6:

1. Re-read the **`#### Implementation Checklist`** inside the `### STEP 2: META CODE REVIEW` block for this finding.
2. Implement each checklist step by modifying the source files.
    - Use `read_file` on any file you are about to modify (if not already read).
    - Use `replace_in_file` for targeted edits; use `write_to_file` only if changes are too scattered for targeted edits.
    - If the checklist requires changes in multiple source files (e.g. caller updates), implement all of them in this same finding pass.
    - After completing each checklist step, mark the corresponding `- [ ]` item as `- [x]` in the `#### Implementation Checklist` using `replace_in_file`.
3. After implementing all steps, write the `### STEP 3: IMPLEMENTATION` section (see Step 8) immediately.
4. Proceed to the next finding.

---

## 8. Write STEP 3: IMPLEMENTATION section for each finding

Immediately after implementing each finding (or determining it should be skipped), insert a `### STEP 3: IMPLEMENTATION` section immediately after the `### STEP 2: META CODE REVIEW` block (as a sibling to `### STEP 1` and `### STEP 2`).

### Format for implemented findings:

```markdown
### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `<path/to/file.js>`
  - <1-line description of change 1>
  - <1-line description of change 2>
  - <1-line description of change 3 (if needed)>

- Risks / Side effects
  - <Short description of side effect> (probability: ⭕ / ❗ / ❗❗❗)
      - **🟥 MANUAL CHECK**: [ ] <Concrete checklist the user should do to verify. Include what success looks like.>
```

> **Risk format guidance:**
> - ⭕ = low or non-existent risk
> - ❗ = medium risk
> - ❗❗❗ = high risk
> - List 1–3 side effects maximum; only plausible ones.
> - Manual check steps must be concrete user actions, not abstract assertions. Good example: "Create a new book while another update is in progress; confirm it auto-scrolls and does not throw a console error." Bad example: "Verify the timing works correctly."

### Format for skipped / already-fixed findings:

```markdown
### STEP 3: IMPLEMENTATION

#### Implementation Notes

❌ <Skipped — [reason: Implementation plan discarded 🔴 / Requires user input 🚩 / Already fixed]>
> <One sentence of evidence or reason. For 🔴: copy the Reason from the tracker. For 🚩: summarize the required input. For Already Fixed: cite evidence (commit, line, or tracker entry).>
```

---

## 9. Update REVIEW_TRACKER.md

After all findings are processed, use `replace_in_file` to update the `REVIEW_TRACKER.md` block for `TARGET_SOURCE_FILE`.

For each finding:

1. Set `Implemented:` to:
    - `✅` — if the finding was successfully implemented
    - `❌ Already fixed` — if the defect was no longer present in source
    - `❌ Skipped (🔴 discarded)` — if verdict was 🔴
    - `❌ Skipped (🚩 requires user input)` — if a 🚩 flag was present

2. Add an `Implementation Notes:` sub-bullet immediately after `Implemented:` with a **1-sentence** summary of what changed (or why it was skipped). Examples:
    - `Implementation Notes: Added pointercancel to drag cleanup handler in splitter drag lifecycle.`
    - `Implementation Notes: Already fixed — guard present at line 42 of current source.`
    - `Implementation Notes: Skipped — plan discarded; requires confirmed lifecycle hook for teardown.`

3. If the finding was **implemented** (✅) and the `#### Implementation Notes` section contains a `Risks / Side effects` block with `Manual check:` items, add a `Manual checks:` sub-bullet after `Implementation Notes:` listing each check as an unchecked checkbox. Example:

    ```markdown
    - Implemented: ✅
      - Implementation Notes: Added pointercancel to splitter drag cleanup.
      - **🟥 MANUAL CHECK**:
        - [ ] Drag the splitter, then release the pointer outside the window; confirm no console errors and width is saved.
        - [ ] Rapidly drag and release; confirm the panel does not get stuck.
    ```

    Omit the `Manual checks:` sub-bullet entirely for skipped or already-fixed findings.

Do **not** modify the `Meta-reviewed` or `Verdict` or `Reason` fields.

---

## 10. Move to "Files Pending Changelog" in the queue

Use `replace_in_file` on `tasks/code-reviews/queue-code-review.md` to:

1. Remove `TARGET_REVIEW_FILE` from the bullet list under `## Files Pending Implementation`.
2. Add `TARGET_REVIEW_FILE` to the bullet list under `## Files Pending Changelog`. If the `## Files Pending Changelog` section does not yet exist in the queue file, create it — append a new section at the end of the file, formatted consistently with the rest of the file.

Keep each file's separators and ordering style (the `---` lines, blank lines, indentation) consistent with existing entries.

Report the file that was processed and stop.

</detailed_sequence_steps>

</task>
