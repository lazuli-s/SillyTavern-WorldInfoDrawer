# Skill Review: analyze-request
*Created: February 26, 2026*

## Skill Metadata Summary

- **Name:** analyze-request
- **Description word count:** ~75 words
- **Trigger clarity rating:** Excellent — names the slash command, four explicit intent-keyword phrases, a plain-language description of the task, and a clear negative trigger ("Do NOT use when the user wants to immediately implement")
- **SKILL.md line count:** 114 lines
- **Resources present:** None — no `references/`, `scripts/`, or `assets/` directories
- **Overall quality:** Good

---

## Findings

### Structure

*No issues found.*

---

### Content

> **[Warning] Role section duplicates always-loaded CLAUDE.md guidance**
> The "Role" section instructs Claude to act as a teacher, explain in plain language, and avoid jargon for a non-programmer user. This is identical to the guidance in CLAUDE.md §0 ("User Context"), which is always loaded at session start. Because CLAUDE.md is always in context, the Role section adds token cost without contributing unique information. If the intent is to emphasize the principle specifically for this skill, a single reference sentence would accomplish that at a fraction of the cost.

> **[Suggestion] Step 4a skill handoff gives no input guidance**
> Step 4a reads: "Use the `file-naming` skill." with nothing else. It is not clear what the caller should pass to the file-naming skill — the proposed task type, the draft file name, or both. A one-sentence note on what to hand off would prevent the agent from having to infer or re-read the file-naming skill to find out.

> **[Suggestion] Step 1 doc-guide invocation is similarly bare**
> Step 1 says: "Invoke the `doc-guide` skill and load the docs it prescribes for this task." There is no hint about which task type this workflow maps to (analysis of a bug / feature / rework). A brief note — e.g., "treat the task type as whichever matches the user's request" — would help the agent resolve ambiguity without guessing.

---

## Improvement Recommendations

1. **Remove or collapse the Role section** *(resolves Warning: Role duplication)* — Delete the section entirely, or replace all four sentences with one line: "Follow the non-programmer communication guidelines in CLAUDE.md §0 throughout this skill." This recovers roughly 5 lines and eliminates a knowledge contradiction risk if CLAUDE.md is ever updated.

2. **Expand the Step 4a handoff note** *(resolves Suggestion: Step 4a)* — Add one sentence after the current line, for example: "Pass the agreed task type (ISSUE / NEW_FEATURE / REWORK / REFACTORING) and any candidate title to the skill so it can confirm the correct file name and path."

3. **Clarify the Step 1 doc-guide call** *(resolves Suggestion: Step 1)* — Add a parenthetical or short sentence explaining what "task type" to provide to doc-guide. For example: "Use the task type that matches the user's request (bug → ISSUE, new behavior → NEW_FEATURE, change to existing → REWORK)."

---

## What Excellent Looks Like

An excellent version of this skill has the same lean footprint (114 lines is well within target) and strong description it already has. The Role section is removed, trusting CLAUDE.md to carry the non-programmer communication contract. Steps 1 and 4a each gain one clarifying sentence so that skill handoffs require no inference. The embedded task file template in Step 4b stays inline — it is compact, central to the workflow, and needs no separate reference file at this size. With those three focused edits, the skill would be tight, unambiguous, and ready for any coding agent to pick up without second-guessing.
