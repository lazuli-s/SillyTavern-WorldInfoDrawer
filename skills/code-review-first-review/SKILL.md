---
name: code-review-first-review
description: Runs a structured first-pass code review on the next file from the code-review queue. Picks the first entry from the pending review list, loads authoritative docs via doc-guide, reviews the file across six axes (data integrity, race conditions, UI correctness, performance, redundancy, JS best practices), writes a structured findings report, and updates the queue and review tracker. Use when the user invokes /code-review-first-review, says "do a code review", "review the next file", "start a code review", "run a first review", or names a specific source file to review.
---

# code-review-first-review

Reviews exactly one file per invocation, then stops.

**Two modes:**
- **Queue mode** (no file specified): read `tasks/code-reviews/code-review-queue.md`, pick the first entry under `## Files Pending Review`.
- **Direct mode** (user names a file): use that path as `TARGET_FILE`. Skip queue lookup.

---

## 1. Select target

**Queue mode:** Read `tasks/code-reviews/code-review-queue.md`. Under `## Files Pending Review`, pick the first bullet item and set it as `TARGET_FILE`. If the list is empty: report "No files pending review" and stop.

**Direct mode:** Set `TARGET_FILE` to the path the user provided.

---

## 2. Load authoritative documentation

Invoke the `doc-guide` skill and load the applicable docs.

---

## 3. Scan the target file

1. Look up `TARGET_FILE` in `FEATURE_MAP.md`. Note its stated responsibilities — anything the code does outside that scope is a potential architectural finding.
2. Read `TARGET_FILE`.
3. If `TARGET_FILE` imports local modules (e.g. `./utils.js`, `../constants.js`), read them only if required to understand a specific finding. Do not recursively scan the repo.

---

## 4. Perform the code review

Do not change any source files during this step.

Review `TARGET_FILE` across six axes:

1. **Data integrity** — risk of losing user edits
2. **Race conditions / async ordering** — debounce, event handlers, stale state
3. **UI correctness edge cases** — selection, drag/drop, editor sync, toggles
4. **Performance** — input latency, excessive DOM work, event/listener leaks, unnecessary re-renders
5. **Redundancy / duplication** — if it increases bug risk or slows things down
6. **JS best practices / API contract** — apply `st-js-best-practices` Review Mode against `TARGET_FILE`. Each FAIL item becomes a finding. For WI-touching files, check `wi-api.md` Section 11 anti-patterns. Flag ownership violations per `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`.

**Rules during review:**
- No new libraries, framework migrations, or stylistic reformatting.
- If behavior must change to fix a bug: label it **Behavior Change Required** and explain why.
- If the fix requires moving a responsibility to a different module: label it **Structural Issue**, name the correct owner, and flag for human decision.
- If fixing one finding depends on or conflicts with another, state it explicitly under the proposed fix.
- Do not suggest adding tests.

---

## 5. Create the output file

1. Set `BASENAME` = the final path component of `TARGET_FILE` (e.g., `Settings.js`).
2. Output path: `tasks/code-reviews/CodeReview_<BASENAME>.md`
3. Load `references/finding-template.md` for the exact output file structure and per-finding format.
4. Write the output file using that template. Assign finding IDs F01, F02, … in order.
5. If `TARGET_FILE` has no findings: write only the Scope section, then `---`, then `*No findings.*`
6. Output path rules:
   - If there are **one or more findings**: `tasks/code-reviews/pending-meta-review/CodeReview_<BASENAME>.md`
   - If there are **no findings**: `tasks/code-reviews/finished/CodeReview_<BASENAME>.md`

---

## 6. Update queue files and tracker

Apply all updates. Keep separators, blank lines, and indentation consistent with existing entries.

**A. Remove from pending review**
In `tasks/code-reviews/code-review-queue.md`: remove `TARGET_FILE` from the bullet list under `## Files Pending Review`.

**B. Add to reviewed files in tracker (findings only)**
In `tasks/code-reviews/REVIEW_TRACKER.md`: under `## Reviewed Files`, add a new section following the format of existing entries:

```
### `<TARGET_FILE>`
[CodeReview_<BASENAME>.md](tasks/code-reviews/pending-meta-review/CodeReview_<BASENAME>.md)

- **F01** — <Title>
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
  
(repeat for each finding)
```

**No-findings case:** If `TARGET_FILE` had no findings, do not add anything to `REVIEW_TRACKER.md`.

---

Report the file reviewed and the number of findings, then stop.
