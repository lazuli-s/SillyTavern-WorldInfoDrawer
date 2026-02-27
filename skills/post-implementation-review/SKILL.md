---
name: post-implementation-review
description: Runs a structured post-implementation review (PIR) on a completed task. Reads the changed source files, identifies bugs, architectural violations, and JS best-practice issues introduced by the implementation, then appends a "## Post-Implementation Review" section to the task file and updates its status. Use when the user invokes /post-implementation-review, says "review the next task", "do a PIR", or provides a task file path to review. Processes exactly one task per invocation. In queue mode (no task specified), picks the first entry under "## Implemented tasks" in tasks/main-tasks-queue.md.
---

# post-implementation-review

Runs a post-implementation review on exactly one task per invocation, then stops.

**Two modes:**
- **Queue mode** (no task specified): read `tasks/main-tasks-queue.md`, pick the first entry under `## Implemented tasks`.
- **Direct mode** (user names a task): use that task file as `TARGET_TASK_FILE`. Skip queue lookup.

---

## 1. Select target

**Queue mode:** Read `tasks/main-tasks-queue.md`. Under `## Implemented tasks`, select the first item and set it as `TARGET_TASK_FILE`. If none exist: report "No implemented tasks pending review" and stop.

**Direct mode:** Set `TARGET_TASK_FILE` to the path the user provided.

---

## 2. Load authoritative documentation

Invoke the `doc-guide` skill and load the docs it prescribes for this task type (always: `ARCHITECTURE.md`, `FEATURE_MAP.md`; conditionals based on file types being reviewed).

---

## 3. Parse TARGET_TASK_FILE

1. Read `TARGET_TASK_FILE` fully.
2. Produce `FILES_TO_INSPECT`:
   - If a `Files Changed` section exists: extract file paths (strip trailing descriptions after dashes).
   - If not: infer likely owning modules via `FEATURE_MAP.md`. Record in the PIR: *"Files inferred from description; no `Files Changed` section present."*

---

## 4. Inspect source files

For each file in `FILES_TO_INSPECT`:

1. Read the current source file. If it does not exist: record "File not found — skipped" and continue.
2. Look up stated responsibilities in `FEATURE_MAP.md`. Flag anything outside declared scope as an Architectural Violation.
3. Identify findings across the three categories below. Assign sequential IDs: PIR-01, PIR-02, etc., counting across all files.

### A. Bugs introduced by the implementation

- Null/undefined access on values that may be absent
- Logic errors in new conditionals
- Event listeners registered repeatedly without cleanup
- Async ordering issues (stale closures, race conditions, unresolved state)
- Unhandled edge cases (empty lists, missing DOM, invalid input, uninitialized state)

### B. Architectural violations

- Direct mutation of state owned by another module
- Duplicated logic instead of reused utilities
- Single Responsibility Principle violations
- Cross-module imports that violate `ARCHITECTURE.md`

### C. JS best practice violations

| Code | Rule |
| --- | --- |
| SEC-01 | Unsanitized HTML inserted into DOM |
| SEC-02 | `eval()` or `new Function()` |
| SEC-03 | Secrets in source |
| PERF-01 | Large data stored in localStorage |
| PERF-02 | Event listeners without cleanup |
| PERF-03 | Blocking synchronous operations |
| COMPAT-01 | Direct ST internals access |
| COMPAT-02 | Non-unique MODULE_NAME |
| COMPAT-03 | Settings not initialized with defaults |
| COMPAT-04 | Direct emission of ST-internal events |

For WI-related files: also check `wi-api.md` Section 11 anti-patterns.

---

## 5. Append PIR section

Append to `TARGET_TASK_FILE`:

```markdown
---

## Post-Implementation Review
*Reviewed: <Month D, YYYY>*

### Files Inspected
- <path/to/source1.js>
- <path/to/source2.js>

### Findings
(only if findings exist; otherwise skip this heading and use "### No Issues Found" instead)

#### PIR-01: <Title>

- **Category:** Bug / Architectural Violation / JS Best Practice / Data Integrity / Race Condition / UI Correctness / Performance / Redundancy

- **Severity:** Low ⭕ / Medium ❗ / High ❗❗

- **Location:** `<file.js>` — `<functionName()>` (brief anchor)

- **Summary:** Plain-language description including why it matters.

- **Confidence:** Low 😔 / Medium 🤔 / High 😀
    High = complete failure path traceable entirely from code, no runtime assumptions needed. Medium = failure depends on a runtime condition not confirmable from code alone. Low = speculative; depends on unverifiable user behavior.

- **Fix risk:** Low 🟢 / Medium 🟡 / High 🔴
    Justify with risks and cons of applying this fix, potential side effects, behaviors that might change.

- **Fix Plan:**
    Only include if fixable without human judgment. Detailed, incremental, self-contained steps.
      - [ ] Detailed step

- **Requires human judgment:** ⚠️ Yes / No
    Mark Yes if fixing requires moving responsibility across modules, would change observable behavior significantly, requires runtime confirmation, or cannot be safely resolved in a single-pass review.

### No Issues Found
(only if no findings)
```

---

## 6. Update status

In `TARGET_TASK_FILE`, update `**Status**` to one of:

- `ISSUES_FOUND` — if there is at least one finding
- `NO_ISSUES` — if there are no findings

Then stop.
