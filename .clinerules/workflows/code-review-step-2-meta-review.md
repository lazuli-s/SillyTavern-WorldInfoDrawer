<task name="Code Review - Step 2: Meta-Review">

<task_objective>
Iteratively process `tasks/code-reviews/QUEUE_META_REVIEW.md` "Files Pending Meta-Review": for each pending `tasks/code-reviews/CodeReview_*.md`, reload authoritative repo/ST docs, audit the quality/technical accuracy/actionability of each finding, insert a `### STEP 2: META CODE REVIEW` section **inside each finding** (immediately after `- **Pros:**` content) — including an `#### Implementation Checklist` at its end for 🟢/🟡 verdicts — and remove the original `- **Implementation Checklist:**` block from Step 1, update queue files and `REVIEW_TRACKER.md` (remove from meta-review queue, add to implementation queue; mark each finding Meta-reviewed and add Verdict/Reason in the tracker), then call `new_task` to clear context and repeat until none remain. Only output the created/updated files.
</task_objective>

<detailed_sequence_steps>

# Meta-Review Code Reviews Loop Process - Detailed Sequence of Steps

## 1. Start an iteration by scanning the pending meta-review list (single source of truth)

1. Use `read_file` on `tasks/code-reviews/QUEUE_META_REVIEW.md`.

2. Locate the section:

    - `## Files Pending Meta-Review`

3. Extract the file list items (bullet list entries like `- \`tasks/code-reviews/CodeReview_utils.js.md\``).

4. If the list is empty:
    1. Stop the loop and use `attempt_completion` to report completion of the workflow run (no pending code reviews remaining).

5. Otherwise:
    1. Choose the **first** file in that list as `TARGET_REVIEW_FILE` (exactly as written, e.g. `tasks/code-reviews/CodeReview_drawer.js.md`).

## 2. Mandatory “before anything”: reload authoritative docs for this iteration

> This workflow intentionally reloads docs **every iteration** because the workflow requires `new_task` context clearing after each meta-reviewed file.

1. Use `read_file` on:
    1. `AGENTS.md` (mandatory constraints)
    2. `FEATURE_MAP.md` (feature ownership / locating)
    3. `ARCHITECTURE.md` (module responsibilities)
    4. `SILLYTAVERN_OWNERSHIP_BOUNDARY.md` (integration contract)
    5. `.claude/skills/st-js-best-practices/references/patterns.md` (JS best practices rules + patterns)
    6. `.claude/skills/st-world-info-api/references/wi-api.md` (WI API ownership rules and anti-patterns)

2. If you need authoritative SillyTavern frontend API names/shape, consult:
    - `vendor/SillyTavern/public/scripts/st-context.js` using targeted `read_file` (if small) or `search_files` for exact symbol names.

## 3. Scan the target code review file (and verify evidence only as needed)

1. Use `read_file` on `TARGET_REVIEW_FILE`.

2. Parse the review structure:
    1. Identify the header `# CODE REVIEW FINDINGS: ...`
    2. Identify each finding section: `## F01: ...`, `## F02: ...`, etc.
    3. Within each finding, locate the required sub-sections (Location, issue description, severity, confidence, suggested direction, checklist, “Why it’s safe to implement”, etc.).

3. Determine the underlying source file(s) being reviewed:
    1. Prefer the path in the header `# CODE REVIEW FINDINGS: \`<TARGET_FILE>\``
    2. If the header is missing or inconsistent, infer the target from the filename (e.g. `CodeReview_drawer.js.md` → `src/drawer.js`) and verify via repo structure.

4. “Trust but verify” policy:
    1. For claims you mark as questionable (speculative, inconsistent, or high-risk), validate them by inspecting code.
    2. Use `read_file` on the underlying `TARGET_FILE` to confirm a claim.
    3. If you need to locate a function quickly, use `search_files` (scoped to `src/` and/or the reviewed file path).

## 4. Perform the meta-review (quality audit) — one audit per finding

For **each** finding (`F01`, `F02`, ...), produce a “Meta-Review: Code Review Quality Audit” section that evaluates the review’s quality and implementation readiness.

### The code review focus areas for context

When judging whether the *original* code review is complete and correctly prioritized, treat these as the intended focus areas:

1) Data integrity / risk of losing user edits

2) Race conditions / async ordering issues (debounce, event handlers, stale state)

3) UI correctness edge cases (selection, drag/drop, editor sync, toggles)

4) Performance: input latency, excessive DOM work, event/listener leaks, unnecessary re-renders

5) Redundancy/duplication if it increases bug risk or slows things down

6) JS best practices / API contract: SEC/PERF/COMPAT rule violations and WI API anti-patterns

### Meta-Review: Code Review Quality Audit Format

Use the following file structure, adding it right after each STEP 1:

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
    Highlight evidence-based claims

- **Top risks:**
  Missing evidence / wrong prioritization / speculative claims / internal inconsistency / risk of the issue actually causing real impact > risk of fixing/benefits

#### Technical Accuracy Audit
For each questionable claim:

  > *Quoted claim*

- **Why it may be wrong/speculative:**
  Describe, based on code/evidence.

- **Validation:**
  Inspect whatever is needed to validate the claim (file/function/observable symptom) and choose: Validated ✅ / Needs extensive analysis ❌ / Requires user input 🚩 — explain/justify

- **What needs to be done/inspected to successfully validate:**
  Only if speculative or false claim: (file/function/observable symptom/what the user needs to do in plain language to confirm)

#### Fix Quality Audit

Evaluate the proposed fix:

- **Direction:**
  Is the proposed direction technically sound? Does it stay within the correct module per ARCHITECTURE.md? If it moves responsibility across modules, is it labeled "Structural Issue" and flagged for human decision?

- **Behavioral change:**
  Does the fix change observable behavior? If yes, is it explicitly labeled "Behavior Change Required"? Flag unlabeled behavioral changes — including seemingly safe ones (e.g., changed debounce timing, altered event ordering, removed a guard check, changed when a save is triggered).

- **Ambiguity:**
  Is there ONLY one suggestion to fix the same issue? If there's more than one, the least-behavioral-change option must be the sole recommendation.
- **Checklist:**
  Are checklist items complete and actionable by an LLM without human input? Flag any step that is vague (e.g., "refactor X" without specifying exactly what to change), implies manual verification, or skips obviously required follow-up actions (e.g., updating callers after renaming a function, or re-registering a listener after removing one).

- **Dependency integrity:**
  If the fix depends on or conflicts with another finding in the same file, is that declared explicitly in the proposed fix? Verify: would applying this fix before or after the declared dependency actually work as described?

- **Fix risk calibration:**
  Is the stated `Fix risk` rating accurate? A fix that touches shared state, modifies core event handlers, changes debounce or async behavior, or has multiple callers must not be rated Low.

- **"Why it's safe" validity:**
  Is the safety claim specific and verifiable — naming concrete behaviors, paths, or callers not affected? Vague claims ("only affects this function", "shouldn't break anything") are not valid and must be flagged, especially when the function has multiple call sites or mutates shared state.

- **Mitigation:**
  Only if there's a high risk of introducing new bugs during implementation. If not applicable, omit this item entirely. Do not add manual checks or steps that depend on user input — this is directed at the LLM implementing the fix.

- **Verdict:** Ready to implement 🟢 / Implementation plan needs revision 🟡 / Implementation plan discarded 🔴

  Justify based on the following conditions:
  - Ready to implement 🟢:
    - Original confidence is High or Medium
    - No 🚩 Requires user input flags
    - No ❌ Needs extensive analysis flags
  - Implementation plan needs revision 🟡:
    - Low confidence on one or more key claims, but no ❌ or 🚩 flags
    - OR: Fix risk is under-rated or "Why it's safe" claim is vague but correctable with an addition
    - OR: Checklist has vague or missing steps that need tightening
    - OR: A cross-finding dependency is missing but the fix itself is otherwise sound
  - Implementation plan discarded 🔴:
    - If Needs extensive analysis ❌ = TRUE
    - If 🚩 Requires user input = TRUE

#### Implementation Checklist

After writing the Verdict, append an `#### Implementation Checklist` block — **only for 🟢 and 🟡 verdicts**. Omit it entirely for 🔴 and 🚩.

**For 🟢 (Ready to implement):**

```markdown
#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] <checklist step 1, copied from the original Step 1 Implementation Checklist>
- [ ] <checklist step 2>
...
```

**For 🟡 (Needs revision):**

```markdown
#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: <reason from Fix Quality Audit — Checklist>
> Revisions applied: <1–2 sentences describing exactly what was changed in the checklist>

- [ ] <revised checklist step 1>
- [ ] <revised checklist step 2>
...
```

#### After all findings: Coverage Note

After auditing all individual findings, produce a standalone `### Coverage Note` section to be appended at the end of `TARGET_REVIEW_FILE`:

- **Obvious missed findings:**
  Are there clear High-severity, High-confidence issues visible from the code that Step 1 did not flag? Name them briefly — no full finding structure required. If none, write `None identified.`

---

### Meta-review rules (apply to every finding)

1. Be strict about evidence:
    1. If the original review did not specify a function, anchor snippet, and a concrete failure trigger, downgrade Evidence quality.
    2. If the original review asserts a race/ordering bug, require an explicit async boundary (`await`, event handler, debounce, observer callback) and a plausible ordering scenario.
    3. If the review claims a “can lose edits” scenario, require an explicit write/clear/replace operation and a concrete path that overwrites or discards user input.

2. Avoid “reviewing style”:
    - Don’t penalize lack of formatting polish unless it blocks actionability.

3. Don’t introduce scope creep:
    - Do not propose new libraries, migrations, architecture rewrites.

## 5. Update the code review file (insert meta-review sections inside each finding)

1. The code review update is mandatory and must be applied **for every finding** in `TARGET_REVIEW_FILE`.

2. For each finding section (`## F0X: ...`):
    1. Locate the subsection header/label:

        - `- **Pros:**`

    2. Insert the full meta-review block **immediately after** that section's content. For 🟢 and 🟡 verdicts, the block ends with `#### Implementation Checklist` (see format in Section 4). Omit `#### Implementation Checklist` for 🔴 and 🚩.

    3. Using a **separate** `replace_in_file` edit on the same finding, **remove the `- **Implementation Checklist:**` block** from the `#### ADDRESSING THE ISSUE` section. Delete everything from the `- **Implementation Checklist:**` line through the last `- [ ]` item (the line immediately before `- **Fix risk:**`).

3. Important formatting constraints:
    1. Insert the meta-review block **inside the same finding**, not at the end of the file.
    2. Use the exact heading:

        - `### STEP 2: META CODE REVIEW`

    3. Do not change the original review's text unless necessary to fix:
        - broken formatting (e.g., headings not rendering)
        - missing required labels (e.g., "Immplementation Checklist" typos that break consistency)
        - factual errors you can prove

4. Editing approach:
    1. Prefer `replace_in_file` with small, safe edits.
    2. If repeated inserts become brittle, use `write_to_file` to rewrite the entire `TARGET_REVIEW_FILE` with:
        - the original content preserved, plus inserted meta-review blocks under each finding.

5. After inserting meta-review blocks into all findings, append the Coverage Note at the end of `TARGET_REVIEW_FILE` using the following structure:

    ```markdown
    ---

    ### Coverage Note

    - **Obvious missed findings:** ...
    - **Severity calibration:** ...
    ```

## 6. Update queue files and tracker (preserve structure)

Apply the following updates across three files:

1. In `tasks/code-reviews/QUEUE_META_REVIEW.md`: use `replace_in_file` to remove `TARGET_REVIEW_FILE` from the bullet list under `## Files Pending Meta-Review`.

2. In `tasks/code-reviews/QUEUE_IMPLEMENTATION.md`: use `replace_in_file` to add `TARGET_REVIEW_FILE` as a new bullet entry under `## Files Pending Implementation` (if it's not already present).

3. In `tasks/code-reviews/REVIEW_TRACKER.md`: use `replace_in_file` to find the reviewed file section that corresponds to `TARGET_REVIEW_FILE`:
    1. Identify it by its `### \`<TARGET_FILE>\`` heading and the arrow line `→ \`CodeReview_<BASENAME>.md\``.
    2. Ensure you're updating the correct reviewed file block.

4. For each finding bullet (`- **F0X** — <Title>`) in that `REVIEW_TRACKER.md` block:
    1. Mark `Meta-reviewed: [X]`.
    2. Fill in:
        - `Verdict:` (must match the meta-review's Fix Quality Audit verdict)
        - `Reason:` (brief, only if 🟡 or 🔴; otherwise can be empty or "N/A")
    3. Do not modify the `Implemented:` field (leave as-is).

    4. Also add a **Neglect Risk** line for each finding:

    ```
    - **Neglect Risk:** Low ⭕ / Medium ❗ / High ❗❗ — <short justification>
    ```

    This reflects **the risk of leaving the issues in this review unaddressed** (not the risk of fixing them). Choose based on the worst confirmed finding:
    - **High ❗❗** — at least one High-severity, confirmed finding that poses real risk to data integrity, async correctness, or user-visible correctness if left unfixed
    - **Medium ❗** — findings are real but degraded, low-confidence, or limited in blast radius; ignoring them is tolerable short-term
    - **Low ⭕** — all findings are cosmetic, speculative, or have negligible impact if left unfixed

5. Keep each file's separators and ordering style (the `---` lines, blank lines, indentation) consistent with existing entries.

## 7. Clear context and repeat

1. Call `new_task` with the following prompt:

    ```
    Your immediate task is applying the `.clinerules/workflows/code-review-step-2-meta-review.md` workflow on the first file in the updated "Files Pending Meta-Review" list.
    ```

2. Then restart and repeat until the pending meta-review list is empty.

## 8. Finalize the workflow run

1. When `## Files Pending Meta-Review` in `tasks/code-reviews/QUEUE_META_REVIEW.md` becomes empty:
    1. Use `attempt_completion` to indicate that all pending code reviews have been meta-reviewed and the queue files have been updated accordingly.

</detailed_sequence_steps>

</task>