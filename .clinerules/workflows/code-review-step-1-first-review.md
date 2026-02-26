<task name="Code Review - Step 1: Review Pending Files">

<task_objective>
Process `tasks/code-reviews/queue-code-review.md` "Files Pending Review": pick the first pending file, load required repo/ST docs, review it using the provided code-review prompt, write `tasks/code-reviews/CodeReview_<filename>.md`, update the queue file and `REVIEW_TRACKER.md` (add findings under Reviewed Files, remove from pending review, add to pending meta-review). Only output the created/updated files.
</task_objective>

<detailed_sequence_steps>

# Review Pending Files - Detailed Sequence of Steps

## 1. Scan the pending list (single source of truth)

1. Use `read_file` on `tasks/code-reviews/queue-code-review.md`.

2. Locate the section:

    - `## Files Pending Review`

3. Extract the file list items (bullet list entries like `- \`src/utils.js\``).

4. If the list is empty:
    1. Use `attempt_completion` to report completion of the workflow run (no pending files remaining).

5. Otherwise:
    1. Choose the **first** file in that list as `TARGET_FILE` (exactly as written, e.g. `src/Settings.js`).

## 2. Mandatory "before anything": load authoritative docs

1. Use `read_file` on:
    1. `AGENTS.md` (mandatory constraints)
    2. `FEATURE_MAP.md` (feature ownership / locating)
    3. `ARCHITECTURE.md` (module responsibilities)
    4. `SILLYTAVERN_OWNERSHIP_BOUNDARY.md` (integration contract)
    5. `.claude/skills/st-js-best-practices/references/patterns.md` (JS best practices rules + patterns)

2. If `TARGET_FILE` imports from `world-info.js` or uses WI APIs (e.g., `loadWorldInfo`, `saveWorldInfo`, `worldInfoCache`, `WORLDINFO_UPDATED`): also load `.claude/skills/st-world-info-api/references/wi-api.md`.

3. If needed, load SillyTavern "ST Context" reference from:
    - `vendor/SillyTavern/public/scripts/st-context.js`

## 3. Scan the target file (and only referenced helpers as needed)

0. Before reading the file, look up `TARGET_FILE` in the `FEATURE_MAP.md` loaded in Step 2. Note its stated responsibilities. While reviewing, flag anything the code does that falls outside that scope as a potential architectural finding.

1. Use `read_file` on `TARGET_FILE`.

2. Identify â€œshared helpersâ€ used by `TARGET_FILE`:
    1. Scan the top-of-file imports/exports and local references.
    2. If `TARGET_FILE` imports local modules (e.g. `./utils.js`, `../constants.js`), read them with `read_file` **only if** they are required to understand a finding in `TARGET_FILE`.
    3. Do not recursively scan the whole repo.

3. If `TARGET_FILE` relies on ST globals or APIs (e.g., `SillyTavern.getContext()`, `eventSource`, `Popup`), consult `st-context.js` via targeted `search_files` to confirm correct API names/shape.

## 4. Perform the code review (no source changes)

1. Review `TARGET_FILE`, focusing on:
    1. Data integrity / risk of losing user edits
    2. Race conditions / async ordering issues (debounce, event handlers, stale state, etc)
    3. UI correctness edge cases (selection, drag/drop, editor sync, toggles)
    4. Performance: input latency, excessive DOM work, event/listener leaks, unnecessary re-renders, etc
    5. Redundancy/duplication if it increases bug risk or slows things down
    6. JS best practices / API contract: run `st-js-best-practices` Review Mode against `TARGET_FILE` using the patterns loaded in Step 2. Each FAIL item becomes a finding. For WI-touching files, check `wi-api.md` Section 11 anti-patterns (e.g., writing `worldInfoCache` directly, emitting ST-internal events, assigning UIDs manually, bypassing `saveWorldInfo`). Also flag ownership boundary violations per `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`.

2. Follow these rules:
    - No new libraries, no framework migrations, no "rewrite into React", no stylistic reformatting.
    - Do not change behavior; if you believe behavior must change to fix a bug, label it explicitly as "Behavior Change Required" and explain why.
    - If the real fix requires moving a responsibility to a different module (not just patching a line), label it explicitly as "Structural Issue" and explain which module should own it and why, and flag them for human decision.
    - If this finding's fix would conflict with or depend on another finding in the same file, state it explicitly under the proposed fix (e.g., "Depends on F02 being applied first" or "Conflicts with F03").
    - Do not suggest adding tests. This project has no test infrastructure.

## 5. Create a code review output file

1. Compute output file name:
    1. Let `BASENAME` be the final path component of `TARGET_FILE` (e.g. `Settings.js`).
    2. Output path must be:

        - `tasks/code-reviews/CodeReview_<BASENAME>.md`

        Example:
        - `TARGET_FILE = src/utils.js`
        - Output: `tasks/code-reviews/CodeReview_utils.js.md`

2. Use `write_to_file` to create the full contents of `CodeReview_<BASENAME>.md`.

3. Generate findings for `TARGET_FILE`:
    1. Keep the exact structure and labels (`F01`, `F02`, â€¦).

4. Use the following file structure:

    # CODE REVIEW FINDINGS: `<TARGET_FILE>`

    *Reviewed: <Month D, YYYY>*

    ## Scope

    - **File reviewed:** `<TARGET_FILE>`
    - **Helper files consulted:** `<list, or "none">`
    - **Skills applied:** `<st-js-best-practices>` / `<st-world-info-api>` / none
    - **FEATURE_MAP stated responsibilities:** `<brief description from FEATURE_MAP.md>`

    ---

    ## F01: <Title>

    ### STEP 1. FIRST CODE REVIEW

    - **Plain-language summary:**
      Explain the issue as if the reader has no programming background.

    - **Location:**
      file + function (and anchor snippet)

    - **Detailed Finding:**
      Describe the finding using technical terminology: cite relevant files and functions, describe the failure mode, triggers, observable symptoms, what happens, why it happens, and why the code permits it.

    - **Why it matters:**
      Describe the possible consequences of not addressing this issue.

    - **Severity:** Low â­• / Medium â— / High â—â—
      Low = cosmetic/edge-case with minimal user impact. Medium = plausible data loss or UX confusion under realistic conditions. High = direct data loss, crash, or security issue on a common path.

    - **Confidence:** Low ðŸ˜” / Medium ðŸ¤” / High ðŸ˜€
      High = complete failure path traceable entirely from code, no runtime assumptions needed. Medium = failure depends on a runtime condition not confirmable from code alone (e.g., concurrent update in-flight). Low = speculative; depends on unverifiable user behavior or unmeasured load.

    - **Category:** Data Integrity / Race Condition / UI Correctness / Performance / Redundancy / JS Best Practice â€” pick the single best-fit category

    #### ADDRESSING THE ISSUE

    - **Suggested direction:**
      1â€“3 sentences; NO code and NO detailed plan. If you're in doubt about two different ways of fixing the same issue, choose ONLY one (the one that changes behavior the least.)

    - **Proposed fix:**
      Concrete implementation details: name the exact functions, variables, and changes required.
      If the fix cannot be fully specified without first confirming a runtime behavior or observable symptom, add `ðŸš© Requires user input` and state exactly what needs to be confirmed.

    - **Implementation Checklist:**
      Incremental, self-contained steps for an LLM to implement. Do not include any step that requires user input or manual verification.
      [ ] Detailed, incremental task to fix this issue

    - **Fix risk:** Low ðŸŸ¢ / Medium ðŸŸ¡ / High ðŸ”´
      Justify with risks and cons of applying this fix, potential side-effects or unwanted consequences, behaviors that might change, etc.

    - **Why it's safe to implement:**
      Name the specific behaviors, paths, or other findings that this fix does not affect.

    - **Pros:**
      Benefits of implementing this fix.

    <!-- META-REVIEW: STEP 2 will be inserted here -->

5. If `TARGET_FILE` has no findings, omit all finding sections. Write only the Scope section, then a `---` separator, then `*No findings.*`.

## 6. Update queue files and tracker (preserve structure)

Apply the following updates:

1. In `tasks/code-reviews/queue-code-review.md`: use `replace_in_file` to remove `TARGET_FILE` from the bullet list under `## Files Pending Review`.

2. In `tasks/code-reviews/REVIEW_TRACKER.md`: use `replace_in_file` to add a new entry under `## Reviewed Files` with the same formatting used by existing reviewed files:

    1. Create a new section:

        - `### \`<TARGET_FILE>\``
          - `â†’ `CodeReview_<BASENAME>.md``

    2. Under that, add bullet items for each finding title, following the existing pattern:

        - `- **F01** â€” <Title>`
          - ```
              - Meta-reviewed: [ ]
                - Verdict:
                - Reason:
              - Implemented:
            ```

3. In `tasks/code-reviews/queue-code-review.md`: use `replace_in_file` to add `tasks/code-reviews/CodeReview_<BASENAME>.md` as a new bullet entry under `## Files Pending Meta-Review` (same bullet-list formatting used by existing entries).

4. Keep each file's separators and ordering style (the `---` lines, blank lines, indentation) consistent with existing entries.

5. Report the file that was reviewed and stop.

</detailed_sequence_steps>

</task>
