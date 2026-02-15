<task>
# CODE REVIEW

1) Perform a code review on @{{TARGET_FILE}}
2) Create a file called  `tasks/code-reviews/CodeReview_{{BASENAME}}.md`
3) Update @tasks/code-reviews/REVIEW_TRACKER.md

Do not output any additional commentary outside those file contents.
</task>

<constraints>
- **Hard requirement:** Review exactly one file: `{{TARGET_FILE}}` and stop. Do not implement any fix.
- **No source changes:** Do **NOT** modify any files under `src/` (or any production code). Only write the code review markdown output and update the tracker.
</constraints>

<context>
1. @AGENTS.md (mandatory constraints)
2. @FEATURE_MAP.md (feature ownership / locating)
3. @ARCHITECTURE.md (module responsibilities)
4. @SILLYTAVERN_OWNERSHIP_BOUNDARY.md (integration contract)
5. @vendor/SillyTavern/public/scripts/st-context.js (SillyTavern "ST Context" reference)
</context>

<review_scope>
- `{{TARGET_FILE}}`
- Any shared helpers used by the above (only if referenced)
</review_scope>

<code_review>
## STEP 1
Perform the code review focusing on:
1) Data integrity / risk of losing user edits
2) Race conditions / async ordering issues (debounce, event handlers, stale state)
3) UI correctness edge cases (selection, drag/drop, editor sync, toggles)
4) Performance: input latency, excessive DOM work, event/listener leaks, unnecessary re-renders
5) Redundancy/duplication ONLY if it increases bug risk or slows things down

## Rules
- No new libraries, no framework migrations, no "rewrite into React", no stylistic reformatting.
- Do not change behavior; if you believe behavior must change to fix a bug, label it explicitly as "Behavior Change Required" and explain why.
</code_review>

<file_creation>
## STEP 2
1) Create the file: `tasks/code-reviews/CodeReview_{{BASENAME}}.md`

2) If no issues are found, create the file with only this content:
```md
# CODE REVIEW FINDINGS: `{{TARGET_FILE}}`

No findings.
```

3) Otherwise, use this exact file structure (repeat for each finding):

```md
# CODE REVIEW FINDINGS: `{{TARGET_FILE}}`

## F01: <Title>
- Location:
  file + function (and anchor snippet)

- What the issue is

- Why it matters
  (impact)

- Severity: Low / Medium / High

- Fix risk: Low / Medium / High
  (risk of side effects)

- Confidence: Low / Medium / High
  (how sure you are from code alone)

- Repro idea:
  minimal steps to try in the UI (or logging idea if hard to repro)

- Suggested direction
  (1-3 sentences; NO code and NO detailed plan)

- Proposed fix
  describe only; no code

- Implementation Checklist:
  [ ] List of detailed incremental tasks to fix this issue

- Why it's safe to implement
  (what behavior remains unchanged)
```
</file_creation>

<file_update>
## STEP 3
Update `tasks/code-reviews/REVIEW_TRACKER.md`:

1) Remove `{{TARGET_FILE}}` from the bullet list under `## Files Pending Review`.

2) Add a new entry under `## Reviewed Files` using the same formatting pattern as existing entries:

   - Header:
     - `### \`{{TARGET_FILE}}\``

   - Link line:
     - `-> [CodeReview_{{BASENAME}}.md](CodeReview_{{BASENAME}}.md)`

   - Under that, add bullet items for each finding title:
     - `- **F01** - <Title>`
       - `  - Reviewed: . Verdict: . Reason: . Implemented:`

3) Preserve separators, blank lines, indentation, and ordering style used by the file (including `---` lines).
</file_update>

<final_output>
Write both files using your file creation tool. Do not produce any other output.

Files:
  1. `tasks/code-reviews/CodeReview_{{BASENAME}}.md`
  2. `tasks/code-reviews/REVIEW_TRACKER.md`
</final_output>
