---
name: code-review-implement
description: Implements code review findings from the ready-for-implementation queue. Reads the first file from `tasks/code-reviews/ready-for-implementation/`, loads authoritative docs, verifies each finding against current source (skips Already Fixed ones), implements all verified findings in order (🟢 then 🟡), writes a STEP 3 section for each finding, updates REVIEW_TRACKER.md, and moves the file to `tasks/code-reviews/pending-changelog/`. Processes exactly one file per invocation. Use when the user invokes /code-review-implement, says "implement code review", "implement the next code review", "implement review findings", or provides a specific review file path to implement.
---

# code-review-implement

Implements exactly one review file per invocation, then stops.

**Two modes:**
- **Auto mode** (no file specified): scan `tasks/code-reviews/ready-for-implementation/`, pick the first `.md` file alphabetically.
- **Direct mode** (user names a file): use that path as `TARGET_REVIEW_FILE`.

---

## 1. Select target

**Auto mode:** List files in `tasks/code-reviews/ready-for-implementation/`. Pick the first `.md` file alphabetically and set it as `TARGET_REVIEW_FILE`. If the folder is empty: report "No files pending implementation" and stop.

**Direct mode:** Set `TARGET_REVIEW_FILE` to the path the user provided.

Parse the header `# CODE REVIEW FINDINGS: \`<TARGET_SOURCE_FILE>\`` to identify `TARGET_SOURCE_FILE`.

---

## 2. Load authoritative documentation

Invoke the `doc-guide` skill and load the applicable docs for a code-review task.

---

## 3. Classify all findings

Read `TARGET_REVIEW_FILE` in full and classify every finding block:

| Class | How to detect |
|---|---|
| **Stub** | Block has no STEP 1 or STEP 2 — just a title line and `*Finding removed…*` |
| **Active** | Block contains `### STEP 2: META CODE REVIEW` with an `#### Implementation Checklist` |

**Stub findings:** silently skip — no STEP 3, no tracker update.

For each **Active** finding, read its STEP 2 verdict:
- 🟢 `Ready to implement` → eligible for implementation
- 🟡 `Implementation plan needs revision` → eligible (use the revised checklist in STEP 2)
- 🔴 `Implementation plan discarded` → if present without being stubbed, treat as stub and skip silently

---

## 4. Verify active findings against source

For each active finding, locate the **Location** anchor snippet and check whether the defective code pattern is still present in `TARGET_SOURCE_FILE`.

**If defect is gone:**
- Mark finding as **Already Fixed**.
- Overwrite the `#### Implementation Checklist` inside the `### STEP 2: META CODE REVIEW` block with:
  ```
  #### Implementation Checklist

  Already fixed — <evidence, e.g. "guard added at line 42", "handler removed", "import migrated">
  ```
- Queue this finding for STEP 3 using the **Already Fixed** format (see §6).

**If defect is still present:** keep as active, proceed to §5.

---

## 5. Determine implementation order

Build the final ordered list from active, non-Already-Fixed findings:

1. 🟢 findings first, then 🟡 findings.
2. Respect cross-finding dependencies declared inside an `#### Implementation Checklist` (e.g. "Depends on F02 being applied first"):
   - Move the dependency target ahead of the dependent finding, even if this re-orders 🟢/🟡 groups.
   - If the dependency target is Already Fixed or a Stub, treat the dependency as satisfied and proceed normally.

---

## 6. Implement each finding in order

For each finding in the ordered list:

1. Re-read the `#### Implementation Checklist` inside the `### STEP 2: META CODE REVIEW` block.
2. Read `TARGET_SOURCE_FILE` (and any other file to be modified) if not already in context.
3. Implement each checklist step:
   - Use `Edit` for targeted changes; use `Write` only if changes are too scattered for targeted edits.
   - If a step requires changes across multiple source files, implement all of them in this same finding pass.
   - After completing each step, mark its `- [ ]` as `- [x]` in the `#### Implementation Checklist`.
4. If a step **cannot be completed** (anchor not found, code too changed):
   - Stop implementing this finding immediately.
   - Mark all remaining unchecked items as `- [ ] ❌ BLOCKED — <reason>`.
   - Write STEP 3 using the **Skipped** format (see below).
   - Continue to the next finding.
5. If all steps complete successfully: write STEP 3 using the **Implemented** format (see below).

Write STEP 3 **immediately after the `### STEP 2: META CODE REVIEW` block**, as a sibling section to STEP 1 and STEP 2.

---

### STEP 3 formats

#### Implemented

```markdown
### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `<path/to/file.js>`
  - <1-line description of change 1>
  - <1-line description of change 2>

- Risks / Side effects
  - <Short description of side effect> (probability: ⭕ / ❗ / ❗❗❗)
      - **🟥 MANUAL CHECK**: [ ] <Concrete user action. Include what success looks like.>
```

**Risk format guidance:**
- ⭕ = low or non-existent, ❗ = medium, ❗❗❗ = high.
- List 1–3 plausible side effects max.
- Manual check steps must be concrete user actions. Good: "Create a new book while another update is in progress; confirm it auto-scrolls and no console error appears." Bad: "Verify it works correctly."
- Omit the `Risks / Side effects` block entirely if there are no plausible side effects.

#### Skipped (implementation failed)

```markdown
### STEP 3: IMPLEMENTATION

Implementation skipped — <reason, e.g. "anchor snippet not found in current source; code at this location has changed significantly">

- **🟥 MANUAL CHECK**: [ ] <What the user should manually verify or do to address this finding>
```

#### Already Fixed

```markdown
### STEP 3: IMPLEMENTATION

Already fixed — <evidence, e.g. "guard added at line 42 of src/drawer.js">
```

---

## 7. Update REVIEW_TRACKER.md

After all findings are processed, update `tasks/code-reviews/REVIEW_TRACKER.md`. Find the `### \`<TARGET_SOURCE_FILE>\`` section and update each **active** (non-stub) finding's entry.

**Implemented (✅):**
```markdown
  - Implemented: ✅
    - Implementation Notes: <1-sentence summary of what changed>
    - **🟥 MANUAL CHECK**:
      - [ ] <check from STEP 3, copied verbatim>
```
Omit the `🟥 MANUAL CHECK` sub-bullet if STEP 3 has no manual check items.

**Already Fixed:**
```markdown
  - Implemented: ✅ Already fixed — <evidence>
    - Implementation Notes: Already fixed — <same evidence>
```

**Skipped (failed implementation):**
```markdown
  - Implemented: ❌ Skipped — <reason>
    - Implementation Notes: <1-sentence explanation>
    - **🟥 MANUAL CHECK**:
      - [ ] <check from STEP 3, copied verbatim>
```

Do **not** modify `Meta-reviewed`, `Verdict`, `Reason`, or `Neglect Risk` fields.
Do **not** update tracker entries for stub findings.

---

## 8. Move the file

Move `TARGET_REVIEW_FILE` from `tasks/code-reviews/ready-for-implementation/` to `tasks/code-reviews/pending-changelog/`. Create the destination folder if it does not exist.

---

## 9. Report and stop

Report:
- File implemented
- Findings processed: X total (Y implemented, Z already fixed, W skipped, V stubs silently skipped)
