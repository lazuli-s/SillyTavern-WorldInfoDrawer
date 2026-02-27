<task name="Post-Implementation Review (Step 3)">

<objective>
    Process the first unchecked file in `tasks/main-tasks-queue.md`: load authoritative documentation, read the task file to understand what was implemented, inspect the relevant source files, identify and fix bugs, architectural violations, and JS best practice issues introduced by the implementation, append a "## Post-Implementation Review" section to the task file. Process exactly one file per invocation, then stop.
  </objective>

## 1. Select target
1. Read `tasks/main-tasks-queue.md`.
2. Under `## Implemented tasks`, select the first item.
3. If none exist: report "All reviewed" and stop.
4. Set `TARGET_TASK_FILE` to the full path from the checklist (e.g., tasks/main-tasks/implemented-tasks/NewFeature_BulkEditOutletContainer.md).

## 2. Load authoritative documentation

Read `skills/doc-guide/SKILL.md` and load the docs it prescribes for this task.

## 3. Parse TARGET_TASK_FILE

1. Read `TARGET_TASK_FILE` fully.

2. If `Files Changed` section exists:
- Extract file paths (strip trailing descriptions after dashes) and produce `FILES_TO_INSPECT`.

3. Else:
- Infer likely owning modules via `FEATURE_MAP.md` and produce `FILES_TO_INSPECT`.
- Record in PIR: "Files inferred from description; no `Files Changed` present."

## 4. Inspect source files

For each file in FILES_TO_INSPECT:

1. Read the current source file.
   - If it does not exist: record "File not found — skipped".
   
2. Look up stated responsibilities in FEATURE_MAP.md.
   - Flag anything outside scope as Architectural Violation.

3. Identify findings across three categories.
   - Assign sequential IDs: PIR-01, PIR-02, etc., counting across all files.

### A. Bugs introduced by the implementation

Look for:

- Null/undefined access
- Logic errors in new conditionals
- Event listeners registered repeatedly without cleanup
- Async ordering issues (stale closures, race conditions, unresolved state)
- Unhandled edge cases (empty lists, missing DOM, invalid input, uninitialized state)

### B. Architectural violations

Look for:

- Direct mutation of state owned by another module
- Duplicated logic instead of reused utilities
- Single Responsibility Principle violations
- Cross-module imports violating ARCHITECTURE.md

### C. JS best practice violations

Apply st-js-best-practices Review Mode:

- SEC-01: Unsanitized HTML inserted into DOM
- SEC-02: eval() or new Function()
- SEC-03: Secrets in source
- PERF-01: Large data stored in localStorage
- PERF-02: Event listeners without cleanup
- PERF-03: Blocking synchronous operations
- COMPAT-01: Direct ST internals access
- COMPAT-02: Non-unique MODULE_NAME
- COMPAT-03: Settings not initialized with defaults
- COMPAT-04: Direct emission of ST-internal events

For WI-related files:
- Also check wi-api.md Section 11 anti-patterns.

## 5. Append PIR section

Append to `TARGET_TASK_FILE` using the following markdown structure:

```markdown
---

## Post-Implementation Review
*Reviewed: <Month D, YYYY>*

### Files Inspected
- <path/to/source1.js>
- <path/to/source2.js>

### Findings
(only if findings exist; otherwise skip this heading)

#### PIR-01: <Title>

- **Category:** Bug / Architectural Violation / JS Best Practice / Data Integrity / Race Condition / UI Correctness / Performance / Redundancy

- **Severity:** Low ⭕ / Medium ❗ / High ❗❗

- **Location:** <file.js> — <functionName()> (brief anchor)

- **Summary:** Plain-language description including why it matters.

- **Confidence:** Low 😔 / Medium 🤔 / High 😀
    High = complete failure path traceable entirely from code, no runtime assumptions needed. Medium = failure depends on a runtime condition not confirmable from code alone (e.g., concurrent update in-flight). Low = speculative; depends on unverifiable user behavior or unmeasured load.

- **Fix risk:** Low 🟢 / Medium 🟡 / High 🔴
    Justify with risks and cons of applying this fix, potential side-effects or unwanted consequences, behaviors that might change, etc.

- **Fix Plan:**
    Only if fixable without human judgment. Create a fix plan with detailed, incremental, self-contained steps for an LLM to implement. Do not include any step that requires user input or manual verification.
      - [ ] Detailed, incremental task to fix this issue

- **Requires human judgment**: ⚠️ Yes/No
	Mark as `⚠️ Requires human judgment` if fixing this issue: 
	- Requires moving responsibility across modules; 
	- Would change observable behavior significantly; 
	- Requires runtime confirmation; 
	- Cannot be safely resolved in a single-pass review.

### No Issues Found
      (only if no findings)
```

---

## 6. Update status

In `TARGET_TASK_FILE`, update `**Status**`.

Choose one:

- NO_ISSUES: if there are no findings
- ISSUES_FOUND: if there is at least one finding

Then stop.
</task>