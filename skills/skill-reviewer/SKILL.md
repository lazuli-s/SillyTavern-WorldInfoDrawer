---
name: skill-reviewer
description: >-
  Reviews an existing Claude skill against skill-creator quality rules and
  produces a structured SkillReview findings report saved to
  tasks/main-tasks/skills/. Use when the user invokes /skill-reviewer, asks to
  "review a skill", "audit a skill", "check a skill's quality", or "is this
  skill well written". Checks SKILL.md structure, description trigger phrasing,
  progressive disclosure, extraneous files, duplicate or nested references, and
  asset relevance. Severity-rated findings plus improvement recommendations.
metadata:
  sync:
    version: 2
    hash: sha256-2e532518789c5d60bff17bc7c198e0f8da3e3e908a555ddfc02f113d25419df8
---
# Skill Reviewer

Reviews an existing skill against the skill-creator quality rules and auto-writes a SkillReview findings report.


## Review Workflow

1. **Locate** — resolve the name or path to a directory.
2. **Read the skill** — read `SKILL.md` plus every file in `references/`, `scripts/`, and `assets/`.
3. **Read the rules** — read `.claude/skills/skill-creator/SKILL.md` for the authoritative rule definitions.
4. **Analyze** — work through every item in the Review Checklist below.
5. **Write the report** — auto-write to `tasks/main-tasks/skills/SkillReview_<name>.md`. Create `tasks/main-tasks/skills/` if it does not exist.

Do not ask for confirmation before writing. Write the report only.

## What Excellent Looks Like

An excellent skill has **all** of the following:

- **Tight description** — states clearly *what* the skill does and *exactly when* to trigger it. Includes explicit trigger phrases (slash commands, intent keywords, user-facing example phrases). Claude could auto-select this skill without ambiguity.
- **Lean SKILL.md** — under 500 lines. Contains only core workflow and navigation guidance. No lengthy reference material crammed into the body.
- **Good progressive disclosure** — all substantial detail (schemas, API docs, domain rules, large examples) lives in `references/` files. Each reference file is linked from SKILL.md with a one-line note saying *when* to read it.
- **No extraneous files** — only files an AI agent actually needs to do the job. 
- **No duplication** — each piece of information lives in exactly one place: either SKILL.md or a references file, never both.
- **Flat reference structure** — all reference files are linked directly from SKILL.md. No reference file links to another reference file.
- **Purposeful assets** — every file in `assets/` is something Claude would copy or embed in output. No orphaned or decorative files.
- **Correct frontmatter** — only `name` and `description` fields are present (plus optional `license`). No extra YAML keys.

## Review Checklist

### Structure

- **Length / bloat**: Is SKILL.md under 500 lines? Is reference-level detail crammed into SKILL.md instead of a references file?
- **Progressive disclosure**: Is substantial detail split into `references/` files? Is each file linked from SKILL.md with "when to read" context?
- **Extraneous files**: Does the skill contain README, CHANGELOG, INSTALLATION_GUIDE, or other non-operational files?
- **No duplication**: Is the same information repeated in both SKILL.md and a references file?
- **Flat references**: Do any reference files link to other reference files (not allowed — must link only from SKILL.md)?

### Content

- **Description quality**: Does the description state *what* the skill does AND *when* to trigger it? Would Claude auto-select this skill from the description alone?
- **Trigger phrasing**: Does the description include explicit trigger phrases: slash commands, intent keywords, example user sentences?
- **Frontmatter fields**: Are only `name` and `description` present (plus optional `license`)? No extra YAML fields?
- **Asset relevance**: Does every file in `assets/` have a clear output purpose? Are there orphaned or unused assets?

## Severity Definitions

- **Critical**: The skill cannot work correctly or will cause Claude to misuse it. Fix before using.
- **Warning**: The skill functions but quality is degraded. Likely causes confusion or inefficiency.
- **Suggestion**: Polish opportunity. The skill works fine as-is.

## Report Structure

Write the report using exactly this structure:

```markdown
# Skill Review: <skill-name>
*Created: <Month D, YYYY>*

## Skill Metadata Summary

A bullet list with:
- Name
- Description word count (approximate)
- Trigger clarity rating: Excellent / Good / Weak / Missing — one sentence explaining why
- SKILL.md line count
- Resources present (which of: references/, scripts/, assets/ exist and how many files each)
- Overall quality: Excellent / Good / Needs Work / Poor

## Findings

One entry per finding, grouped: Structure findings first, then Content findings.

Format each finding as:

> **[SEVERITY] Rule name**
> What is wrong and why it matters to the skill's effectiveness or correctness.

If there are no findings in a group, write: *No issues found.*

---

## Improvement Recommendations

Ordered list of actionable changes, highest priority first. Each item references the finding(s) it resolves. Describe *what* to do, not *how* to do it.

---

## What Excellent Looks Like

2-4 sentences describing what this specific skill would look like if it fully met all quality criteria. Tailor this to the skill's actual purpose — give the implementer a concrete, achievable target.
```
