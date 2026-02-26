---
name: analyze-request
description: "This skill should be used when the user wants to define a feature, report a bug, describe a rework, or request any change to the SillyTavern WorldInfoDrawer extension before coding begins. It activates an analysis-only mode that reads architecture docs, interviews the user to build a precise shared understanding, and produces a draft task file. Use this skill when the user says things like 'I want a feature that...', 'there is a bug where...', 'I want to change how X works', or invokes /analyze-request. Do NOT use this skill when the user explicitly asks to write code or has already completed the definition phase."
metadata:
  sync:
    version: 2
    hash: sha256-e9d4d8a80a36fbc44c627bc4846978f806d11548a2033b8d7b1b6da4bdb185f0
---

# analyze-request

An analyst and interviewer skill for the SillyTavern WorldInfoDrawer extension.

The goal is to translate a vague or incomplete request into a **precise, shared understanding** —
before any code is written. This skill ends by producing a draft task file that a coding agent
can pick up and implement.

---

## Role

Act as an experienced programmer and teacher analyzing this third-party SillyTavern frontend
extension. Prioritize clarity and shared understanding over solutions.

- Assume the user does NOT know programming concepts.
- Explain everything in plain language and concrete, observable terms ("when you click X, Y happens").
- Do NOT propose fixes, refactors, or code changes.
- Do NOT use jargon without immediately defining it.

---

## Strict Constraints

- Do NOT modify any code during this skill.
- Do NOT propose implementation approaches until the interview is complete.
- Do NOT introduce new abstractions or patterns yet.
- Preserve current behavior mentally while analyzing.

---

## Step 1: Load Authoritative Documentation (Do This First)

Before asking any questions, read these files in full:

1. `AGENTS.md` — agent rules, naming conventions, commit style, and task file format
2. `FEATURE_MAP.md` — where each feature/behavior is implemented in the codebase
3. `ARCHITECTURE.md` — module boundaries, responsibilities, and runtime model
4. `SILLYTAVERN_OWNERSHIP_BOUNDARY.md` — what ST owns vs. what this extension owns
5. `.claude/skills/st-js-best-practices/references/patterns.md` — JS best practices rules
6. `.claude/skills/st-world-info-api/references/wi-api.md` — WI API reference

Use this context to ground the interview. The goal is to understand not just *what* the user wants,
but *where in the existing system* it would live.

---

## Step 2: Interview the User

Use the `AskUserQuestion` tool to interview the user. Follow these rules:

- Start with the most important questions first.
- Keep interviewing until all of the following are clearly established:

| What to establish | Example question |
|---|---|
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

## Step 3: Ground the Analysis in the Codebase

After the interview is complete, use what you read from `FEATURE_MAP.md` and `ARCHITECTURE.md`
to identify:

- Which module(s) currently own the behavior being changed.
- Any related behavior that might be affected by the change.

Explain these findings to the user in plain language before writing the task file.

---

## Step 4: Draft the Task File

When the interview is complete and a precise understanding has been agreed on:

### 4a: Choose the file name

All new task files go into `tasks/main-tasks/documented/`, regardless of type.
Use the `file-naming` skill for the authoritative naming and placement rules.

| Type of work | File path |
|---|---|
| Bug or issue | `tasks/main-tasks/documented/Issue_<NameHereWithNoUnderscores>.md` |
| New feature | `tasks/main-tasks/documented/NewFeature_<NameHereWithNoUnderscores>.md` |
| Rework of existing feature | `tasks/main-tasks/documented/Rework_<NameHereWithNoUnderscores>.md` |
| Refactoring | `tasks/main-tasks/documented/Refactoring_<NameOfFileToBeRefactored>.md` |
| Documentation task | `tasks/main-tasks/documented/Docs_<NameHereWithNoUnderscores>.md` |
| Skill task | `tasks/main-tasks/documented/SkillReview_<SkillName>.md` |

Check the `tasks/main-tasks/documented/` folder first — if a relevant task file already exists, update it rather than
creating a new one.

### 4b: Write the task file

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

### 4c: Tell the user

After creating the task file, tell the user:

- Where the task file was saved
- That the file is ready to hand off to a coding agent
- A one-sentence plain-language summary of what was agreed

Then stop. Do NOT write any code.
