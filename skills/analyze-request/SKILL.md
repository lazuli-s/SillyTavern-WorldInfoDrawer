---
name: analyze-request
description: Turns a vague or incomplete user request into a precise, documented task file ready for a coding agent to implement. Use when the user describes a bug, new feature, change, or rework they want — especially when the request needs clarification before any code is written. Triggers on phrases like "I want to add X", "fix Y", "change Z", "something is wrong with", or when the user invokes /analyze-request. Do NOT use when the user wants to immediately implement — use implement-task for that.
---

# analyze-request

Turns a vague or incomplete user request into a shared, precise understanding — and ends by
producing a draft task file that a coding agent can pick up and implement.

Follow the non-programmer communication guidelines in CLAUDE.md §0 throughout this skill.

---

## Step 1: Load authoritative documentation

Invoke the `doc-guide` skill and load the docs necessary for this task.

---

## Step 2: Interview the user

Use the `AskUserQuestion` tool. Start with the most important questions first. Keep interviewing
until all of the following are clearly established:

| What to establish | Example question |
| --- | --- |
| **Current behavior** | "What does the extension do today in this situation?" |
| **Expected behavior** | "What would you like it to do instead?" |
| **Trigger / context** | "When exactly does this happen? What did you do right before?" |
| **Scope** | "Should this affect all entries, or only certain ones?" |
| **Edge cases** | "What should happen if [unusual situation]?" |

Add any other questions necessary to properly identify the issue or feature.

After each round of answers, tell the user:
- Any **assumptions** you are making about current or expected behavior.
- If information is missing, propose **2–3 plausible interpretations** in plain language,
  explaining how each would change the feature or fix. Clarify before documenting.

---

## Step 3: Ground the analysis in the codebase

After the interview is complete, use `FEATURE_MAP.md` and `ARCHITECTURE.md` to identify:
- Which module(s) currently own the behavior being changed.
- Any related behavior that might be affected by the change.

Explain these findings to the user in plain language before writing the task file.

---

## Step 4: Draft the task file

### 4a: Choose the file name

Use the `file-naming` skill. Pass the agreed task type and any candidate title so it can confirm the correct file name and path.

### 4b: Write the task file

```markdown
# TASK TYPE: Task Title
*Created: <Month D, YYYY>*

**Type:** 
**Status:** DOCUMENTED

---

## Summary

[1–3 sentences in plain language describing what this task is about and why it matters.
Explain as if the reader has no programming background.]

## Current Behavior

[Describe what the extension does today, in observable terms. No code. No jargon.
"When the user does X, the extension does Y."]

## Expected Behavior

[Describe what the user wants it to do instead, in the same observable terms.
"After this change, when the user does X, the extension should do Z."]

## Agreed Scope

[List the modules or files likely to be affected, based on FEATURE_MAP.md findings.
Example: "The entry list module owns this behavior — src/entryList.js"]

## Out of Scope

[Explicitly list anything that was discussed but excluded from this task.
If nothing was excluded, omit this section entirely.]

## Implementation Plan

[Incremental, self-contained steps for an LLM to implement. Clarify any doubts before writing
this section.

Rules for checklist items:
- **Concrete**: name the exact function, variable, and file.
- **Self-contained**: an LLM can execute it without human input.
- **Ordered** to satisfy dependencies (e.g., export before calling).]

- [ ] Detailed, incremental task to implement this change
```

Then stop. Do NOT change any code.
