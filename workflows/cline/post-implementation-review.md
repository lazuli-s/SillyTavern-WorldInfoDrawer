<task name="Post-Implementation Review">

<task_objective>
Process the first unchecked file in `tasks/POST_IMPLEMENTATION_REVIEW.md`: load authoritative docs, read the task file to understand what was implemented, inspect the source files, identify and fix bugs/architectural violations/JS best practice issues introduced by the implementation, append a "## Post-Implementation Review" section to the task file, update the checklist, copy the task file to `tasks/finished/`, and delete it from `tasks/implemented/`. Process one file per invocation, then stop.
</task_objective>

<detailed_sequence_steps>

## Editing tool policy (encoding safety)

When this workflow edits existing text files, prefer `apply_patch` for targeted changes.
Do not write workflow/review markdown content through shell text output commands, because Windows encoding mismatches can corrupt symbols.

# Post-Implementation Review — Detailed Sequence of Steps

## 1. Initialize or update the review checklist

1. Attempt to use `read_file` on `tasks/POST_IMPLEMENTATION_REVIEW.md`.

2. If the file does not exist:
    1. Use `list_files` or `list_directory` to scan `tasks/implemented/` for all `.md` files.
    2. Create `tasks/POST_IMPLEMENTATION_REVIEW.md` using the exact format in Step 1.4 below, listing all discovered files as unchecked items under `## Pending Review`.

3. If the file exists:
    1. Read the existing checklist.
    2. Scan `tasks/implemented/` for all `.md` files.
    3. For each discovered file whose path does not already appear anywhere in the checklist (checked or unchecked), add it as a new unchecked item at the bottom of the `## Pending Review` list.
    4. If any new files were added, save the updated checklist using `replace_in_file`.

4. Format for `tasks/POST_IMPLEMENTATION_REVIEW.md`:

    ```markdown
    # Post-Implementation Review Queue

    Tracks files in `tasks/implemented/` that need a post-implementation review.
    The workflow inspects the code changed by each task, fixes any bugs or violations found,
    documents the findings in the task file, then moves the file to `tasks/finished/`.

    ---

    ## Pending Reviews

    - `tasks/implemented/<filename>.md`

    ---

    ## Reviewed and Archived

    (Completed entries will appear here after processing.)
    ```

## 2. Pick the next file to process

1. Read `tasks/POST_IMPLEMENTATION_REVIEW.md`.

2. Locate the section `## Pending Review`.

3. Find the file on the list.

4. If no unchecked items remain:
    1. Use `attempt_completion` to report that all files in `tasks/implemented/` have been reviewed and moved to `tasks/finished/`. Stop.

5. Otherwise:
    1. Set `TARGET_TASK_FILE` to the path in that unchecked item (e.g. `tasks/implemented/NewFeature_BulkEditOutletContainer.md`).

## 3. Load authoritative docs

1. Use `read_file` on:
    1. `AGENTS.md` (mandatory constraints)
    2. `FEATURE_MAP.md` (feature ownership and module locations)
    3. `ARCHITECTURE.md` (module responsibilities and boundaries)
    4. `SILLYTAVERN_OWNERSHIP_BOUNDARY.md` (integration contract)
    5. `.claude/skills/st-js-best-practices/references/patterns.md` (JS best practices rules with good/bad examples)

2. Read `TARGET_TASK_FILE` (first pass — to detect WI API usage). If the task file mentions any of these terms: `worldInfoCache`, `loadWorldInfo`, `saveWorldInfo`, `WORLDINFO_UPDATED`, `world-info.js`: also load `.claude/skills/st-world-info-api/references/wi-api.md`.

3. If any inspected source file uses `SillyTavern.getContext()` or ST globals not recognized from prior knowledge: load `vendor/SillyTavern/public/scripts/st-context.js` to confirm correct API names and shape.

## 4. Parse the task file

1. Use `read_file` on `TARGET_TASK_FILE` (second full read).

2. Parse the following sections:
    - **Summary** — what feature or fix was implemented.
    - **Files Changed** — the list of source files modified by this task (primary inspection targets).
    - **Implementation Notes** — specific patterns, APIs, or behaviors used.

3. If the task file does not have a `## Files Changed` section:
    1. Search `FEATURE_MAP.md` for the feature described in the Summary to identify the owning module(s).
    2. Set `FILES_TO_INSPECT` to the inferred file paths.
    3. In Step 8, note "Files inferred from task description — no `## Files Changed` section present."

4. Otherwise: build `FILES_TO_INSPECT` from the file paths listed in `## Files Changed`. Extract only the file path (e.g. `src/orderHelperRender.actionBar.js`) — discard the description after the dash.

## 5. Inspect source files

For each file in `FILES_TO_INSPECT`:

1. Use `read_file` to read the current source file.
    - If the file does not exist (was renamed or deleted): skip it. Note it in Step 8 as "File not found — skipped."

2. Look up the file's stated responsibilities in `FEATURE_MAP.md`. While reviewing, flag anything the code does that falls outside that scope as an **Architectural Violation**.

3. Check for issues in the following three categories. Assign a sequential finding ID (`PIR-01`, `PIR-02`, …) to each issue, counting across all files.

    ### A. Bugs introduced by the implementation

    Look for defects that could plausibly have been introduced by this specific task:

    - Null or undefined access on values that may not be set
    - Logic errors in new conditional branches
    - Event listeners or DOM handlers registered inside a function called repeatedly, without a corresponding cleanup
    - Async ordering issues in new code: stale closures, race conditions in debounced handlers, state read before an async operation resolves
    - Edge cases not handled: empty lists, missing DOM elements, uninitialized state, input values not validated at the system boundary (user input, external APIs)

    ### B. Architectural violations

    Check whether the implementation respected module boundaries:

    - Code that directly reads or mutates state that belongs to a different module per `ARCHITECTURE.md`
    - Logic that duplicates an existing utility function instead of reusing it
    - A function that now has more than one responsibility (SRP violation)
    - A cross-module import that violates the stated boundaries

    ### C. JS best practices violations

    Run st-js-best-practices Review Mode against each inspected file, using the patterns loaded in Step 3. Each FAIL item is a finding:

    - **SEC-01:** User-supplied HTML inserted into the DOM without DOMPurify sanitization
    - **SEC-02:** Use of `eval()` or `new Function()`
    - **SEC-03:** Secrets, API keys, or credentials in source code
    - **PERF-01:** Large data (arrays, objects) stored in `localStorage` — should use `localforage`
    - **PERF-02:** Event listeners registered without a corresponding cleanup path (especially inside functions called on every render or event)
    - **PERF-03:** Synchronous, blocking operations on the UI thread
    - **COMPAT-01:** Direct access to SillyTavern internals not exposed by `SillyTavern.getContext()`
    - **COMPAT-02:** Non-unique `MODULE_NAME` / extension identifier
    - **COMPAT-03:** Extension settings not initialized with defaults
    - **COMPAT-04:** ST-internal events emitted directly instead of through the event bus

    For files that import from `world-info.js` or use WI APIs: also check `wi-api.md` Section 11 anti-patterns (e.g., writing `worldInfoCache` directly, assigning UIDs manually, bypassing `saveWorldInfo`).

4. If a file has no findings of any kind, note it as "No issues found" for that file.

## 6. Implement fixes

After inspecting all files, fix each finding in order of severity (High → Medium → Low):

1. Use `read_file` on any source file you are about to modify (if not already read in the current state).

2. Apply the fix using `replace_in_file` for targeted edits. Use `write_to_file` only if changes are too scattered for targeted edits.

3. If the fix requires changes in multiple files (e.g., updating callers after changing a function signature), apply all of them in this step.

4. Record for each finding: what file was modified, what was changed (function, line, pattern), and why (brief justification referencing the issue type).

5. Mark a finding as `⚠️ Not fixed — requires human judgment` and skip it if:
    - The fix would move a responsibility to a different module (Structural Issue that needs a human decision).
    - The fix would change observable behavior and cannot be safely applied in a single-pass review.
    - The fix requires confirming a runtime condition that cannot be verified from code alone.
    - In all skip cases, include a plain-language explanation in the Post-Implementation Review section (Step 8).

## 7. Update POST_IMPLEMENTATION_REVIEW.md

1. Use `replace_in_file` to remove the unchecked entry for `TARGET_TASK_FILE` from the `## Pending Review` section:
    - Remove the exact line: `- \`<TARGET_TASK_FILE>\``

2. Use `replace_in_file` to add a checked entry to the `## Reviewed and Archived` section:
    - Add: `- \`<TARGET_TASK_FILE>\`

3. Keep existing formatting (blank lines, `---` separators) consistent with the rest of the file.

## 8. Append Post-Implementation Review section to the task file

1. Use `read_file` to read the current content of `TARGET_TASK_FILE`.

2. Append the following section to the end of the file (do not modify any existing content):

    ```markdown
    ---

    ## Post-Implementation Review

    *Reviewed: <Month D, YYYY>*

    ### Files Inspected

    - `<path/to/source1.js>`
    - `<path/to/source2.js>`

    ### Findings

    #### PIR-01: <Title>

    - **Category:** Bug / Architectural Violation / JS Best Practice — pick one
    - **Severity:** Low ⭕ / Medium ❗ / High ❗❗
    - **Location:** `<file.js>` — `<functionName()>` (brief anchor description)
    - **Summary:** Plain-language description of the issue found.
    - **Fix applied:** Description of exactly what was changed — which function, what was added/removed/modified, and what behavior changed.

    #### PIR-02: <Title>

    ...
    ```

3. If no issues were found across all inspected files, replace the `### Findings` section with:

    ```markdown
    ### No Issues Found

    All inspected files are consistent with project patterns. No bugs, architectural violations, or JS best practice violations were identified.
    ```

4. For each finding marked `⚠️ Not fixed — requires human judgment` in Step 6, include it in the Findings list with the following note instead of `Fix applied`:

    ```markdown
    - **Fix applied:** ⚠️ Not fixed — requires human judgment.
      <Plain-language explanation of why this was skipped and what a human needs to decide.>
    ```

5. Save the updated task file using `write_to_file`.

## 9. Move the task file to tasks/finished/

1. Confirm the final content of `TARGET_TASK_FILE` was saved correctly in Step 8.

2. Derive the destination path: replace `tasks/implemented/` with `tasks/finished/` in the file path. The filename stays identical.

3. Use `write_to_file` to create the file at `tasks/finished/<filename>.md` with the full updated content from Step 8.

4. Use a Bash `rm` command to delete `TARGET_TASK_FILE` from `tasks/implemented/`:
    ```bash
    rm "TARGET_TASK_FILE"
    ```

## 10. Finalize the workflow run

1. Use `attempt_completion` to report:
    - Which task file was reviewed (`TARGET_TASK_FILE`)
    - How many findings were identified (e.g. "3 findings: 1 bug, 1 architectural violation, 1 JS best practice")
    - How many were fixed vs. skipped with a reason
    - Where the file was moved (`tasks/finished/<filename>.md`)

</detailed_sequence_steps>

</task>
