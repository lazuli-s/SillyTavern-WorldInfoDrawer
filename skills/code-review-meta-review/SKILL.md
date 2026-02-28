---
name: code-review-meta-review
description: Runs a structured meta-review (Step 2) on the next pending code review file. Scans `tasks/code-reviews/pending-meta-review/` for the first CodeReview file, loads authoritative docs, audits each finding for technical accuracy and implementation quality, inserts a `### STEP 2: META CODE REVIEW` section into each finding, updates REVIEW_TRACKER.md, and moves the file to `pending-implementation/`. Use when the user invokes /code-review-meta-review, says "do a meta-review", "run a meta-review", or "meta-review the next file". Processes exactly one file per run, then stops.
---

# code-review-meta-review

Meta-reviews exactly one file per invocation, then stops.

**Two modes:**
- **Auto mode** (no file specified): scan `tasks/code-reviews/pending-meta-review/`, pick the first `.md` file alphabetically.
- **Direct mode** (user names a file): use that path as `TARGET_REVIEW_FILE`. Skip folder scan.

---

## 1. Select target

**Auto mode:** List files in `tasks/code-reviews/pending-meta-review/`. Pick the first `.md` file alphabetically and set it as `TARGET_REVIEW_FILE`. If the folder is empty: report "No files pending meta-review" and stop.

**Direct mode:** Set `TARGET_REVIEW_FILE` to the path the user provided.

---

## 2. Load authoritative documentation

Invoke the `doc-guide` skill and load the applicable docs for a code-review task.

---

## 3. Read the review file and identify target source

1. Read `TARGET_REVIEW_FILE`.
2. Parse the header `# CODE REVIEW FINDINGS: \`<TARGET_FILE>\`` to determine `TARGET_SOURCE_FILE`.
3. Read `TARGET_SOURCE_FILE` to use during validation.
4. If you need to validate a specific claim, use targeted reads or searches on `TARGET_SOURCE_FILE` or its local imports — do not recursively scan the repo.

---

## 4. Perform the meta-review — one audit per finding

Load `skills/code-review-meta-review/references/meta-review-format.md` for the exact format of each meta-review section.

For **each** finding (`F01`, `F02`, …):

1. Read the finding's Step 1 content: location, detailed finding, severity, confidence, proposed fix, implementation checklist, fix risk, and "Why it's safe" claim.
2. Validate questionable claims by inspecting `TARGET_SOURCE_FILE`.
3. Write the `### STEP 2: META CODE REVIEW` block using the format in `meta-review-format.md`. This block goes immediately after the `- **Pros:**` content.
4. For 🟢 and 🟡 verdicts: append an `#### Implementation Checklist` at the end of the STEP 2 block (copied or revised from Step 1). For 🔴: omit it.
5. Remove the original `- **Implementation Checklist:**` block from the `#### ADDRESSING THE ISSUE` section (from the `- **Implementation Checklist:**` line through the last `- [ ]` item, immediately before `- **Fix risk:**`).
6. Remove the `<!-- META-REVIEW: STEP 2 will be inserted here -->` placeholder if present.

### Focus areas (for judging the original review)

1. Data integrity — risk of losing user edits
2. Race conditions / async ordering (debounce, event handlers, stale state)
3. UI correctness edge cases (selection, drag/drop, editor sync, toggles)
4. Performance — input latency, DOM leaks, unnecessary re-renders
5. Redundancy / duplication if it increases bug risk
6. JS best practices / API contract — SEC/PERF/COMPAT violations, WI API anti-patterns

### Meta-review rules

- **Require evidence for all claims:** If the original review did not specify a function, anchor snippet, and a concrete failure trigger, downgrade evidence quality.
- **Race/ordering bugs require an explicit async boundary:** `await`, event handler, debounce, observer callback — plus a plausible ordering scenario.
- **"Can lose edits" requires a concrete write/clear/replace path.**
- **Do not review style** — only flag formatting issues if they block actionability.
- **No scope creep** — do not propose new libraries, migrations, or architecture rewrites.

---

## 5. Edit the review file

Prefer small, targeted edits (one edit per finding). If repeated inserts become brittle, rewrite the entire file with original content preserved plus inserted meta-review blocks.

Apply the edits described in step 4 for every finding before moving on.

---

## 6. Update REVIEW_TRACKER.md

In `tasks/code-reviews/REVIEW_TRACKER.md`, find the section for `TARGET_SOURCE_FILE` (identified by its `### \`<TARGET_FILE>\`` heading).

For **each** finding bullet:

1. Mark `Meta-reviewed: [X]`.
2. Fill in:
   - `Verdict:` — must match the meta-review's Fix Quality Audit verdict (🟢 / 🟡 / 🔴)
   - `Reason:` — brief; required for 🟡 and 🔴, can be "N/A" for 🟢
3. Add a **Neglect Risk** line immediately after the Reason line:
   ```
   - Neglect Risk: Low ⭕ / Medium ❗ / High ❗❗ — <short justification>
   ```
   - **High ❗❗** — at least one High-severity confirmed finding posing real risk to data integrity, async correctness, or user-visible correctness
   - **Medium ❗** — findings are real but low-confidence or limited blast radius; tolerable short-term
   - **Low ⭕** — all findings cosmetic, speculative, or negligible impact
4. Do not modify the `Implemented:` field.

Keep the tracker's separators and ordering consistent with existing entries.

---

## 7. Move the file

Move `TARGET_REVIEW_FILE` from `tasks/code-reviews/pending-meta-review/` to `tasks/code-reviews/pending-implementation/`. Create the destination folder if it does not exist.

---

## 8. Report and stop

Report: the file meta-reviewed, the number of findings processed, and how many got each verdict (🟢 / 🟡 / 🔴). Then stop.
