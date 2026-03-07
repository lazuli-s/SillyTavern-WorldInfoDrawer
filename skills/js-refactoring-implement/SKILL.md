---
name: js-refactoring-implement
description: Implements refactoring findings from a js-refactoring report and moves the file to implemented. Reads one report from tasks/js-refactoring/ready-for-implementation/, applies every finding's steps to the target JS file (marking checkboxes as it goes), appends an After Implementation section, then moves the report to tasks/js-refactoring/implemented/. Use when the user invokes /js-refactoring-implement, says "implement the next refactoring", "apply the refactoring findings", or "implement this refactoring report".
---

# js-refactoring-implement

Implements exactly one refactoring report per invocation, then stops.

**Two modes:**
- **Queue mode** (no file specified): scan `tasks/js-refactoring/ready-for-implementation/`, pick the first `*.md` file in alphabetical order.
- **Direct mode** (user names a report file): use that path as `TARGET_REPORT`.

---

## 1. Select target

**Queue mode:** List `tasks/js-refactoring/ready-for-implementation/`, collect `*.md` files, sort alphabetically, set the first as `TARGET_REPORT`. If none exist: report "No refactoring reports pending implementation" and stop.

**Direct mode:** Set `TARGET_REPORT` to the path the user provided.

---

## 2. Load authoritative docs

Invoke the `doc-guide` skill and load the docs it prescribes for a JS-writing task.

Also load `skills/st-js-best-practices/SKILL.md`.

---

## 3. Parse the report

Read `TARGET_REPORT` fully. Extract:

- `TARGET_JS_FILE` — the path on the `**File:**` line.
- All findings — each `### [N]` block with its `**Steps to fix:**` checklist.

---

## 4. Review findings against best-practices

Before touching any code, scan each finding's steps against the rules in `st-js-best-practices`. If a step would violate a rule (e.g., a rename that clashes with a required API name, or a constant that should use `Object.freeze`), annotate the step in `TARGET_REPORT` with a short note and adjust the implementation accordingly.

---

## 5. Implement each finding

Work through findings in order (`[1]`, `[2]`, …).

For each finding:

1. If `TARGET_JS_FILE` has not been loaded yet, read it now.
2. Apply every `- [ ]` step in `**Steps to fix:**` to the source file.
   - Prefer targeted `Edit` over full `Write` unless changes are too scattered across the file.
   - When a step says "rename everywhere in this file", search the file for all occurrences before editing.
   - When a step says "search project-wide before renaming", use `Grep` to find all callers first.
3. After each step is applied successfully: mark it `- [x]` in `TARGET_REPORT` immediately. Do not batch.

If a step cannot be applied (e.g., the code has already changed since the report was written), mark it `- [x] SKIPPED — <one-line reason>` and continue.

---

## 6. Write After Implementation section

Append to `TARGET_REPORT`:

```markdown
---

## After Implementation
*Implemented: <Month D, YYYY>*

### What changed

[List each file changed, then 1-3 bullets per file in plain language describing what was renamed, extracted, or removed.]

### Risks / What might break

[1-3 plausible side effects in plain language. Example: "Renamed X, so any future code that references the old name will break."]

### Manual checks

[Concrete, observable steps to verify the change. Each item must state what success looks like.]
```

---

## 7. Move the report

Move `TARGET_REPORT` to `tasks/js-refactoring/implemented/`.

Create the folder if it does not exist.

Then stop.
