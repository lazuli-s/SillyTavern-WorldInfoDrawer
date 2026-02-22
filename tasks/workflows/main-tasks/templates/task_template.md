# TASK: Task Title
*Created: <Month D, YYYY>*

**Type:** ISSUE / NEW_FEATURE / REWORK / REFACTORING
**Status:** DOCUMENTED / IMPLEMENTED / PENDING_REVIEW / NO_ISSUES / ISSUES_FOUND / PENDING_HUMAN_REVIEW / HIGH_RISK_FIX

---

## Summary

[1-3 sentences in plain language describing what this task is about and why it matters.]

## Current Behavior

[Describe what the extension does today, in observable terms. No code. No jargon. 
"When the user does X, the extension does Y."]

## Expected Behavior

[Describe what the user wants it to do instead, in the same observable terms.
"After this change, when the user does X, the extension should do Z."]

## Agreed Scope

[List the modules or files likely to be affected, based on FEATURE_MAP.md findings.
Example: "The entry list module owns this behavior — src/entryList.js"]

## Assumptions


## Out of Scope

[Explicitly list anything that was discussed but excluded from this task.
If nothing was excludd, omit this field entirely.]

## Implementation Plan


---

## After Implementation
*Implemented: <Month D, YYYY>*

### What changed

succinct. List files, then 1-3 bullets per file describing changes.
  No jargon. No code snippets.


### Risks / What might break

 1-3 plausible side effects in plain language. Style:
  "This touches X, so it might affect Y or Z."

### Manual checks

concrete, observable steps. Each item must say **what success looks like**
  in a few words. Cover the risk items listed above.
  
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