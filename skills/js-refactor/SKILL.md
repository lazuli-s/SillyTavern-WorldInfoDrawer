---
name: js-refactoring
description: JS refactoring reviewer for the SillyTavern WorldInfoDrawer extension. Reads a target JS file, identifies refactoring opportunities across six check families (DRY, naming, large functions, deep nesting, dead code, magic values), and writes a structured refactoring task file to tasks/js-refactoring/ready-for-implementation/. Makes no code changes. Use when the user invokes /js-refactoring, names a JS file and asks for refactoring review, or says things like "review this file for refactoring", "find refactoring opportunities in", or "check this JS for cleanup".
---

# JS Refactoring

## Workflow

1. **Identify the target file** — If the user named a JS file, use it. If not, ask before proceeding.
2. **Load checks** — Read `references/checks.md`. It defines every check ID, what to flag, and the threshold for each.
3. **Load report template** — Read `references/report-template.md`. Use it as the exact structure for the output file.
4. **Read the target file in full** — Do not truncate. Every finding must reference real line numbers.
5. **Apply each check in order** — Work through every check ID in `references/checks.md`. Record all violations found, not just the first.
6. **Write the report** — Create `tasks/js-refactoring/ready-for-implementation/Refactoring__<filename>.md` using the structure from `references/report-template.md`.

## Output filename

Follow the file-naming convention for refactoring tasks:

```
tasks/js-refactoring/ready-for-implementation/Refactoring__<js-filename>.md
```

Example: reviewing `action-bar.js` → `tasks/js-refactoring/ready-for-implementation/Refactoring__action-bar.js.md`

**Check first:** Before creating, look inside `tasks/js-refactoring/ready-for-implementation/`. If a refactoring file for this JS file already exists, update it instead of creating a duplicate.

## What this skill does NOT do

- It does not change any source code.
- It does not queue the report for implementation — the report is the end product.

## Resources

- `references/checks.md` — All check IDs with definitions and thresholds. Read before evaluating.
- `references/report-template.md` — Exact Markdown structure for the output file. Read before writing.
