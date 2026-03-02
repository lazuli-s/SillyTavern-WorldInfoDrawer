# JS Refactor Report Template

Use this structure exactly when writing the output file. Replace all `<placeholder>` values with real data.

---

## Output filename

```
tasks/main-tasks/documented/refactoring__<js-filename>.md
```

Example: `tasks/main-tasks/documented/refactoring__action-bar.js.md`

---

## Report structure

```markdown
# REFACTORING: <JS filename>
*Created: <Month D, YYYY>*

**File:** `<relative path from project root>`
**Findings:** <N> total

---

## Summary

| Check | ID | Findings |
|---|---|---|
| Duplicated code blocks | DRY-01 | <N> |
| Magic values | DRY-02 | <N> |
| Shape-based naming | NAME-01 | <N> |
| Large functions | SIZE-01 | <N> |
| Deep nesting | NEST-01 | <N> |
| Dead code | DEAD-01 | <N> |
| **Total** | | **<N>** |

---

## Findings

<!-- One block per finding. Number them sequentially across all checks. -->

### [1] DRY-01 — Duplicated code block

**What:** <Plain-language description of what pattern is being repeated and why that's a problem.>

**Where:**
- `<file path>`, lines <X>–<Y> — <brief description of this copy>
- `<file path>`, lines <X>–<Y> — <brief description of this copy>

**Steps to fix:**
1. Extract the shared pattern into a new function named `<suggestedName>(<params>)` near the top of the file.
2. Replace the first copy (lines <X>–<Y>) with a call to `<suggestedName>(...)`.
3. Replace the second copy (lines <X>–<Y>) with a call to `<suggestedName>(...)`.
4. <Add more steps if there are more copies.>

---

### [2] DRY-02 — Magic value

**What:** The value `<literal>` appears <N> times. It represents <what it means> and should be a named constant.

**Where:**
- `<file path>`, line <X>
- `<file path>`, line <X>
- <...>

**Steps to fix:**
1. At the top of the file (after imports), add: `const <SUGGESTED_NAME> = <value>;`
2. Replace each occurrence of the raw literal with `<SUGGESTED_NAME>`.

---

### [3] NAME-01 — Shape-based name

**What:** `<name>` (line <X>) describes its <shape / type / structure> rather than its purpose. Reading the name alone does not tell you what it holds or does.

**Where:** `<file path>`, line <X>

**Steps to fix:**
1. Rename `<oldName>` to `<suggestedName>` everywhere it appears in this file.
2. <If it is exported or referenced in other files, search for it project-wide before renaming.>

---

### [4] SIZE-01 — Large function

**What:** `<functionName>` is <N> lines long (lines <X>–<Y>). It is doing too much: <describe the distinct jobs it is doing, separated by "and also">.

**Where:** `<file path>`, lines <X>–<Y>

**Steps to fix:**
1. Extract `<sub-task 1>` (lines <X>–<Y>) into a new function named `<suggestedName1>()`. <One sentence on what it does.>
2. Extract `<sub-task 2>` (lines <X>–<Y>) into a new function named `<suggestedName2>()`. <One sentence on what it does.>
3. Replace the extracted blocks in `<functionName>` with calls to the new functions.
4. <Repeat for each extracted block.>

---

### [5] NEST-01 — Deep nesting

**What:** Inside `<functionName>`, the block starting at line <X> reaches <N> levels of indentation. The innermost logic is hard to follow because the reader must hold <N> contexts in memory simultaneously.

**Where:** `<file path>`, lines <X>–<Y> (deepest point: line <Z>)

**Steps to fix:**
1. Extract the inner block (lines <X>–<Y>) into a new function named `<suggestedName>(<params>)`. <One sentence on what it does.>
2. Replace the inner block with a call to `<suggestedName>(...)`.
3. <Repeat if there are multiple deep nesting sites in the same function.>

---

### [6] DEAD-01 — Dead code

**What:** `<name>` is declared at line <X> but is never referenced anywhere else in this file.

**Where:** `<file path>`, line <X>

**Steps to fix:**
1. <If it is a variable:> Delete the declaration on line <X>.
2. <If it is a function:> Delete the function body (lines <X>–<Y>). Verify first that `<name>` is not called dynamically (e.g. via `obj[functionName]` or a string-based lookup).
3. <If it is an import:> Remove the import statement on line <X>.

---

<!-- If there are no findings for a check, omit its section entirely. -->
<!-- If there are multiple findings for the same check, add them as [N] blocks in sequence. -->
```

---

## Notes on writing findings

- **Plain language first.** The "What" sentence must explain the problem to someone who is not a programmer. Avoid jargon. If a technical term is unavoidable, define it in the same sentence.
- **Every line number must be real.** Do not estimate. Read the file and confirm each line number before writing it.
- **Steps must be actionable.** Each step should be a single, concrete action. If a step requires a decision, state the decision too.
- **No severity ratings.** Do not add priority labels. List findings in check-ID order (DRY-01, DRY-02, NAME-01, SIZE-01, NEST-01, DEAD-01), then by line number within each check.
