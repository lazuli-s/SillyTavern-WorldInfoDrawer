---
name: analyze-request
description: This skill should be used when the user wants to define a feature, report a bug, describe a rework, or request any change to the SillyTavern WorldInfoDrawer extension before coding begins. It activates an analysis-only mode that reads architecture docs, interviews the user to build a precise shared understanding, and produces a draft task file. Use this skill when the user says things like "I want a feature that...", "there's a bug where...", "I want to change how X works", or invokes /analyze-request. Do NOT use this skill when the user explicitly asks to write code or has already completed the definition phase.
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

## Mandatory Preparation (Do This First)

Before asking any questions, read these three files in full:

1. `CLAUDE.md` — agent rules, naming conventions, commit style, and task file format
2. `ARCHITECTURE.md` — module boundaries, responsibilities, and runtime model
3. `FEATURE_MAP.md` — where each feature/behavior is implemented in the codebase

Use this context to ground the interview. The goal is to understand not just *what* the user wants,
but *where in the existing system* it would live.

---

## Strict Constraints

- Do NOT modify any code during this skill.
- Do NOT propose implementation approaches until the interview is complete.
- Do NOT introduce new abstractions or patterns yet.
- Preserve current behavior mentally while analyzing.

---

## Interview Process

Use the `AskUserQuestion` tool to interview the user. Follow these rules:

- Ask a maximum of 3-4 questions per round to avoid overwhelming the user.
- Start with the most important questions first.
- Keep interviewing until all of the following are clearly established:

| What to establish | Example question |
|---|---|
| **Current behavior** | "What does the extension do today in this situation?" |
| **Expected behavior** | "What would you like it to do instead?" |
| **Trigger / context** | "When exactly does this happen? What did you do right before?" |
| **Scope** | "Should this affect all entries, or only certain ones?" |
| **Edge cases** | "What should happen if [unusual situation]?" |

After each round of answers, explicitly tell the user:

- Any **assumptions** you are making about current or expected behavior
- If information is missing, propose **2-3 plausible interpretations** and explain in plain
  language how each one would change the feature or fix

---

## Codebase Grounding

After the interview is complete, use what you read from `FEATURE_MAP.md` and `ARCHITECTURE.md`
to identify:

- Which module(s) currently own the behavior being changed
- Whether this is a new feature, a bug fix, a rework, or a refactor
- Any related behavior that might be affected by the change

Explain these findings to the user in plain language before writing the task file.

---

## End of Interview: Draft Task File

When the interview is complete and a precise understanding has been agreed on:

### Step 1: Choose the file name

Use the naming conventions from `CLAUDE.md`:

| Type of work | File path |
|---|---|
| Bug or issue | `tasks/Issue_<NameHereWithNoUnderscores>.md` |
| New feature | `tasks/NewFeature_<NameHereWithNoUnderscores>.md` |
| Rework of existing feature | `tasks/Rework_<NameHereWithNoUnderscores>.md` |
| Refactoring | `tasks/Refactoring_<NameOfFileToBeRefactored>.md` |

Check the `tasks/` folder first — if a relevant task file already exists, update it rather than
creating a new one.

### Step 2: Write the task file

Use this template:

```markdown
# [Task title in plain language]

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

## Open Questions / Assumptions

[Any remaining unknowns, or assumptions that need to be validated during implementation.
If there are none, write "None — all questions resolved during interview."]

## Out of Scope

[Explicitly list anything that was discussed but excluded from this task.
If nothing was excluded, write "None identified."]
```

### Step 3: Update TASKS_PENDING_IMPLEMENTATION.md

After writing the task file, always create or update `tasks/TASKS_PENDING_IMPLEMENTATION.md`.

- If the file does not exist, create it using this template:

```markdown
# Queue: Tasks Pending Implementation

Task files that have been analyzed and are ready for implementation.

---

## Tasks Pending Implementation
```

- Then append the new task file path as a list item:

```markdown
- `tasks/<filename>.md`
```

Never remove existing entries from the list. Only append.

### Step 4: Tell the user

After creating the task file and updating the queue, tell the user:

- Where the task file was saved
- That `tasks/TASKS_PENDING_IMPLEMENTATION.md` was updated with the new entry
- That both files are ready to hand off to a coding agent
- A one-sentence plain-language summary of what was agreed
