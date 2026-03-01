# Skill Review: triage-reviews
*Created: March 1, 2026*

## Skill Metadata Summary

- **Name:** triage-reviews
- **Description word count:** ~85 words
- **Trigger clarity:** Good — includes the `/triage-reviews` slash command and one natural-language phrase ("triage the next review"), but coverage is thin for a dispatch/routing skill; a user saying "process the queue" or "let's triage" might not trigger it
- **SKILL.md line count:** 127 lines
- **Resources present:** None (no `references/`, `scripts/`, or `assets/` directories)
- **Overall quality:** Good

---

## Findings

### Structure

*No issues found.*

The skill is 127 lines, well under the 500-line limit. There are no extraneous files and no reference-level detail crammed into the body. The workflow is self-contained and appropriately lean for its complexity.

---

### Content

> **[Warning] Description — thin trigger phrase coverage**
> The description lists only `/triage-reviews` and `"triage the next review"` as triggers. Natural variations like "triage reviews", "run triage", "process the review queue", "sort the reviews", or "let's triage" are not mentioned. Claude auto-selects skills from descriptions, so a narrow phrase list means plausible user commands won't match.

> **[Warning] Step 1.3 — `partial header` extraction has no stated purpose at point of extraction**
> The partial header is collected in Step 1.3, but its only use (populating the user-review file) is not revealed until Step 4a. A Claude instance reading Step 1 might reasonably skip or deprioritise this extraction, not knowing it is required later. A brief forward-reference note at Step 1.3 — e.g., "(used in Step 4a to build the user-review file header)" — removes this ambiguity.

> **[Suggestion] Step 4b — stub uses ambiguous `F0X` placeholder**
> The replacement stub template reads `## F0X: <original title>`. The intent is that `F0X` represents the actual finding number from the original block (e.g., `F01`, `F02`). But `F0X` looks like a literal string, not a placeholder. Using `## F<NN>: <original title>` (matching the convention already implied) or simply `## <original heading>` makes the substitution rule unambiguous.

> **[Suggestion] Case B — missing "create folder if absent" guard**
> Cases A and C both include: *"Create the destination subfolder if it does not exist."* Case B moves to `tasks/code-reviews/pending-user-review/` but does not include this guard. On a fresh repository the folder may not exist, causing the move to fail silently. Adding the same guard to Case B makes all three cases consistent.

> **[Suggestion] No error path for malformed input files**
> If a file in `pending-implementation/` does not match the expected `# CODE REVIEW FINDINGS:` header format, there is no guidance on how to handle it. Without a fallback, Claude must guess — typically either skipping the file or crashing the step. A single sentence (e.g., "If the file does not match the expected header format, report the filename and stop") would close this gap.

---

## Improvement Recommendations

1. **Expand trigger phrases in the description** *(resolves Warning: thin trigger coverage)*
   Add 3–4 additional natural-language patterns to the description that a user might say. Examples: "triage reviews", "run triage", "process the review queue", "sort pending reviews". These sit beside the existing slash command and existing phrase.

2. **Add a forward-reference note to Step 1.3** *(resolves Warning: unexplained extraction)*
   Append a parenthetical to the `partial header` instruction — something like "(needed in Step 4a when building the user-review file)" — so the extraction purpose is clear at the point it is performed.

3. **Fix the `F0X` stub placeholder** *(resolves Suggestion: ambiguous placeholder)*
   Replace `## F0X:` in the Step 4b stub template with `## F<NN>:` or `## <original heading>`, matching the actual finding-number format used elsewhere in the skill.

4. **Add the "create folder if absent" guard to Case B** *(resolves Suggestion: missing guard)*
   Add "Create the destination folder if it does not exist" to the Case B routing step, making all three cases consistent.

5. **Add a one-line error path for malformed files** *(resolves Suggestion: no error path)*
   Add a sentence to Step 1 (or the Mode line) covering files that do not match the expected header format: report the filename and stop rather than attempting to process it.

---

## What Excellent Looks Like

An excellent version of this skill would have a description listing five or more trigger patterns (the slash command plus natural-language variants like "run triage", "process the queue", "sort the reviews") so Claude reliably auto-selects it from any reasonable user phrasing. Every extraction step would carry a one-line note explaining what the extracted value is used for later, eliminating forward-reference confusion. The three routing cases would be symmetric — each carrying the same folder-creation guard — and the stub template in Step 4b would use unambiguous placeholder notation. With those changes the skill would be fully self-documenting and robust against edge cases without adding meaningful bulk to its 127 lines.
