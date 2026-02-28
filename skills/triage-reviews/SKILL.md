---
name: triage-reviews
description: Triages the next code review file from pending-implementation by scanning each finding for "Implementation plan discarded". If no discarded findings exist, moves the file to ready-for-implementation. If some are discarded, splits them into a user-review file, stubs them in the original, and moves the original to ready-for-implementation. If all are discarded, renames and moves the whole file to pending-user-review. Use when the user invokes /triage-reviews or says "triage the next review".
---

# triage-reviews

Processes exactly one file per invocation, then stops.

**Mode:** Auto — pick the first `.md` file alphabetically from `tasks/code-reviews/pending-implementation/`. If the folder is empty, report "No files pending triage" and stop.

---

## 1. Read and parse the target file

1. Read the file.
2. Extract `SOURCE_BASENAME` from the header line `# CODE REVIEW FINDINGS: \`src/<name>\`` → the value between backticks after the last `/` (e.g. `drawer.js`).
3. Extract the **partial header** — the following lines from the top of the file:
   ```
   # CODE REVIEW FINDINGS: `<source>`
   *Reviewed: <date>*

   ## Scope

   - **File reviewed:** `<source>`
   ```
4. Parse all findings. A finding block starts at `## F0X:` and ends at the next `---` separator (inclusive). Collect them as an ordered list.

---

## 2. Classify findings

For each finding, check whether the block contains the exact phrase:

```
Implementation plan discarded
```

Label each finding as either **discarded** or **retained**.

---

## 3. Route based on classification

### Case A — No discarded findings

- Move the file to `tasks/code-reviews/ready-for-implementation/`.
- No user-review file is created.
- Report and stop.

### Case B — All findings discarded

- Rename the file from `CodeReview_<SOURCE_BASENAME>.md` to `user-review__<SOURCE_BASENAME>.md`.
- Move the renamed file (unchanged) to `tasks/code-reviews/pending-user-review/`.
- Report and stop.

### Case C — Mixed (some discarded, some retained)

Proceed to step 4.

---

## 4. Split the file (Case C only)

### 4a. Create the user-review file

Create `tasks/code-reviews/pending-user-review/user-review__<SOURCE_BASENAME>.md`.

Structure:

```
<partial header>
- **Helper files consulted:** (omit — not relevant for user review)

> The following findings were marked as **Implementation plan discarded 🔴** during the meta-review.
> They could not be implemented without your input. Please read each one and decide: proceed, modify, or drop it.

---

<full text of each discarded finding, in original order, separated by --->
```

### 4b. Replace each discarded finding in the original file

For each discarded finding block, replace the entire block (from `## F0X:` through the closing `---`) with this stub:

```
## F0X: <original title>
*Finding removed — implementation plan discarded. See [user-review__<SOURCE_BASENAME>.md](tasks/code-reviews/pending-user-review/user-review__<SOURCE_BASENAME>.md)*

---
```

### 4c. Move the trimmed original

Move the modified original file to `tasks/code-reviews/ready-for-implementation/`.

---

## 5. Report and stop

State:
- File triaged
- How many findings were retained vs discarded
- Which folders files were moved to
