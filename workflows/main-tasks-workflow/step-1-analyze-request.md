<task name="Analyze Request (Step 1)">
Your task is to turn a vague or incomplete request into a precise, shared understanding before any code is written. This step ends by producing a draft task file that a coding agent can pick up and implement.

<role>
Act as an experienced programmer and teacher analyzing this third-party SillyTavern frontend extension. Assume the user does NOT know programming concepts. Explain everything in plain language and concrete, observable terms ("when you click X, Y happens"). Do NOT use jargon without immediately defining it.
</role>

<instructions>
- Interview the user in detail using the AskUserQuestion tool.
- Keep interviewing until everything is covered.
- Only start documenting and planning after you have completely understood: current behavior, expected behavior, trigger/context, scope, and edge cases.
</instructions>

<detailed_steps>
## 1. Load authoritative documentation

Read `skills/doc-guide/SKILL.md` and load the docs it prescribes for this task.

---

## 2. Interview the user

Use the `AskUserQuestion` tool to interview the user. Follow these rules:

- Start with the most important questions first.
- Keep interviewing until all of the following are clearly established:

| What to establish | Example question |
| --- | --- |
| **Current behavior** | "What does the extension do today in this situation?" |
| **Expected behavior** | "What would you like it to do instead?" |
| **Trigger / context** | "When exactly does this happen? What did you do right before?" |
| **Scope** | "Should this affect all entries, or only certain ones?" |
| **Edge cases** | "What should happen if [unusual situation]?" |

Add any other questions you think are necessary to properly identify the issue or feature.

After each round of answers, explicitly tell the user:

- Any **assumptions** you are making about current or expected behavior.
- If information is missing, propose **2–3 plausible interpretations** and explain in plain
  language how each one would change the feature or fix. Clarify before documenting.

---

## 3. Ground the analysis in the codebase

After the interview is complete, use what you read from `FEATURE_MAP.md` and `ARCHITECTURE.md`
to identify:

- Which module(s) currently own the behavior being changed.
- Any related behavior that might be affected by the change.

Explain these findings to the user in plain language before writing the task file.

---

## 4. Draft the task file

When the interview is complete and a precise understanding has been agreed on:

### Step 1: Choose the file name

Use the file-naming skill.

### Step 2: Write the task file

Use the following markdown structure:

```markdown
# TASK: Task Title
*Created: <Month D, YYYY>*

**Type:** ISSUE / NEW_FEATURE / REWORK / REFACTORING
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

[Incremental, self-contained steps for an LLM to implement. Do not include any step that
requires user input or manual verification. Any doubts about implementation that depend on
user input must be clarified before this section is written.

Rules for checklist items:
- Each item is **concrete**: name the exact function, variable, and file.
- Each item is **self-contained**: an LLM can execute it without human input.
- Steps are **ordered** to satisfy dependencies (e.g., export before calling).]

- [ ] Detailed, incremental task to implement this change
```

---

Then stop. Do NOT write any code.

</detailed_steps>
</task>
