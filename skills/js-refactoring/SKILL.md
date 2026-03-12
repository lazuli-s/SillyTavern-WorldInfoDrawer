---
name: js-refactoring
description: JS refactoring reviewer for the SillyTavern WorldInfoDrawer extension. Reads a target JS file, identifies refactoring opportunities across six check families (DRY, naming, large functions, deep nesting, dead code, magic values), and writes a structured refactoring task file to tasks/js-refactoring/ready-for-implementation/. Makes no code changes. Use when the user invokes /js-refactoring, names a JS file and asks for refactoring review, or says things like "review this file for refactoring", "find refactoring opportunities in", or "check this JS for cleanup".
---

# JS Refactoring

Reviews exactly one file per invocation, then stops.

**Two modes:**
- **Queue mode** (no file specified): read `tasks/js-refactoring/js-refactoring-queue.md`, pick the first entry under `## Files Pending Review`.
- **Direct mode** (user names a file): use that path as `TARGET_FILE`. Skip queue lookup.

---

## 1. Select target

**Queue mode:** Read `tasks/js-refactoring/js-refactoring-queue.md`. Under `## Files Pending Review`, pick the first bullet item and set it as `TARGET_FILE`. If the list is empty: report "No files pending review" and stop.

**Direct mode:** Set `TARGET_FILE` to the path the user provided.

---

## 2. Load checks

Read `references/checks.md`. It defines every check ID, what to flag, and the threshold for each.

---

## 3. Read the target file

Read `TARGET_FILE` in full. Do not truncate. Every finding must reference real line numbers.

---

## 4. Apply each check

Work through every check ID in `references/checks.md` in order. Record all violations found, not just the first. Do not change any source files during this step.

---

## 5. Write the report

1. Set `BASENAME` = the final path component of `TARGET_FILE` (e.g., `action-bar.js`).
2. Load `references/report-template.md` for the exact output file structure and per-finding format.
3. Output path: `tasks/js-refactoring/ready-for-implementation/Refactoring__<BASENAME>.md`
4. **Check first:** Before creating, look inside `tasks/js-refactoring/ready-for-implementation/`. If a refactoring file for this JS file already exists, update it instead of creating a duplicate.
5. Write the output file using that template.
6. If `TARGET_FILE` has no findings: write only the file header, then `---`, then `*No refactoring opportunities found.*`

---

## 6. Update the queue

 In `tasks/js-refactoring/js-refactoring-queue.md`, remove `TARGET_FILE` from the bullet list under `## Files Pending Review`.

---

Report the file reviewed and the number of findings, then stop.
