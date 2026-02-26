<task name="Code Review - Step 4: Changelog">

<task_objective>
Process `tasks/code-reviews/queue-code-review.md` "Files Pending Changelog": for the first pending `tasks/code-reviews/CodeReview_*.md`, read the review file to extract implemented findings, create/update `CODE_REVIEW_CHANGELOG.md`, remove the file from "Files Pending Changelog" in the queue, and move the review file into `tasks/code-reviews/finished/Mon-YYYY/` (creating the dated folder if needed). Only output the created/updated files. Output proper emojis.
</task_objective>

<detailed_sequence_steps>

# Changelog & Wrap-up Process - Detailed Sequence of Steps

## Editing tool policy (encoding safety)

When this workflow edits existing text files, prefer `apply_patch` for targeted changes.
Do not write workflow/review markdown content through shell text output commands, because Windows encoding mismatches can corrupt symbols.

---

## 1. Read the queue and identify the target file

1. Use `read_file` on `tasks/code-reviews/queue-code-review.md`.

2. Locate the section:

    - `## Files Pending Changelog`

3. Extract the file list items (bullet list entries like `- \`tasks/code-reviews/CodeReview_utils.js.md\``).

4. If the list is empty:
    1. Stop and use `attempt_completion` to report completion (no pending files remaining).

5. Otherwise:
    1. Choose the **first** file in that list as `TARGET_REVIEW_FILE` (exactly as written, e.g. `tasks/code-reviews/CodeReview_drawer.js.md`).
    2. Derive `TARGET_SOURCE_FILE` from the filename (e.g. `CodeReview_drawer.js.md` → `src/drawer.js`), or read the header `# CODE REVIEW FINDINGS: \`<path>\`` in the review file to get the exact path.

---

## 2. Read the review file and extract finding data

1. Use `read_file` on `TARGET_REVIEW_FILE`.

2. For each finding section (`## F01: ...`, `## F02: ...`, etc.):
    1. Record the **finding number** (e.g. `F01`) and **title** (the text after `## F0X: `).
    2. Locate the `### STEP 3: IMPLEMENTATION` section for this finding.
    3. Determine whether the finding was **implemented** or **skipped/already-fixed**:
        - **Implemented**: the `#### Implementation Notes` block does NOT begin with `❌`.
        - **Skipped / Already Fixed**: the `#### Implementation Notes` block begins with `❌`.
    4. If implemented: extract the first `<1-line description of change>` sub-bullet under `- What changed` as the changelog summary.

---

## 3. Create or update CODE_REVIEW_CHANGELOG.md

1. If `tasks/code-reviews/CODE_REVIEW_CHANGELOG.md` does not exist, create it with this header:

    ```markdown
    # Code Review Implementation Changelog

    Changes applied from code review findings across the extension's source files.

    ---
    ```

2. Use `read_file` on `tasks/code-reviews/CODE_REVIEW_CHANGELOG.md` (if it exists).

3. Prepend a new dated section at the top of the changelog (below the header), in this format:

    ```markdown
    ## <Month D, YYYY>

    ### `<TARGET_SOURCE_FILE>`

    - **F01** — <Finding title>: <summary of what changed>
    - **F06** — <Finding title>: <summary of what changed>
    ```

    > - Use the **full month name** in the `## <Month D, YYYY>` heading (e.g. `## February 26, 2026`).
    > - Only include findings that were **implemented** (not skipped, not already-fixed).
    > - If no findings were implemented (all skipped/already-fixed), add a note instead:
    >   ```markdown
    >   ### `<TARGET_SOURCE_FILE>`
    >
    >   *No changes — all findings were skipped or already resolved.*
    >   ```

4. Use `write_to_file` to save the updated changelog.

---

## 4. Remove from "Files Pending Changelog" in the queue

Use `replace_in_file` on `tasks/code-reviews/queue-code-review.md` to remove `TARGET_REVIEW_FILE` from the bullet list under `## Files Pending Changelog`.

Keep existing formatting consistent (same `---` separators, blank lines, indentation).

---

## 5. Move the review file to the dated finished folder

1. Determine today's date in `Mon-YYYY` format: abbreviated month name (Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec) and four-digit year. Example: `Feb-2026`.

2. Run:

    ```bash
    mkdir -p "tasks/code-reviews/finished/<Mon-YYYY>"
    mv "tasks/code-reviews/CodeReview_<BASENAME>.md" "tasks/code-reviews/finished/<Mon-YYYY>/CodeReview_<BASENAME>.md"
    ```

    Substitute the actual date (e.g. `Feb-2026`) and filename (e.g. `CodeReview_utils.js.md`) for the placeholders.

3. Report the file that was processed and stop.

</detailed_sequence_steps>

</task>
