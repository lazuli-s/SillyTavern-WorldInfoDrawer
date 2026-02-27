# Prompt Guidelines — Annotated Examples

## Table of Contents

- [FMT-01 — XML vs. Markdown roles](#fmt-01)
- [FMT-02 — No duplicated hierarchy](#fmt-02)
- [FMT-03 — No competing emphasis](#fmt-03)
- [FENCE-01 — Code fencing for parsed output](#fence-01)
- [FENCE-02 — Prefer plain Markdown for analysis](#fence-02)
- [SRP-01 — One role per invocation](#srp-01)
- [SRP-02 — Sequential phases with clear handoffs](#srp-02)
- [RULE-01 — One responsibility per rule](#rule-01)
- [RULE-02 — Conditional over absolute](#rule-02)
- [RULE-03 — No redundant rules](#rule-03)
- [PHASE-01 — Explicit phase naming](#phase-01)
- [PHASE-02 — Don't over-engineer phases](#phase-02)

---

## FMT-01 — XML vs. Markdown roles {#fmt-01}

Each format has a clear, non-overlapping role.
- XML: logical containers (role separation, tool calls, I/O constraints)
- Markdown: visual formatting inside those containers (bullets, headings, step lists)

**✓ Good — each format does one job:**

```
<task>
Summarize the following article.
</task>

<output_format>
## Summary
- Key point 1
- Key point 2
</output_format>
```

XML defines the logical sections. Markdown defines the formatting inside them.

**✗ Bad — XML and Markdown compete for the same structural role:**

```
<task>
## Task
Summarize the article.
</task>
```

The `<task>` tag and the `## Task` heading both title the same container. One is redundant.

---

## FMT-02 — No duplicated hierarchy {#fmt-02}

If XML already wraps a section, don't reopen it with a Markdown heading at the same level.

**✓ Good:**

```
<instructions>
Follow these steps:
1. Do X
2. Do Y
</instructions>
```

**✗ Bad:**

```
<instructions>
# Instructions
Follow these steps:
1. Do X
2. Do Y
</instructions>
```

The `# Instructions` heading duplicates the structural role already served by `<instructions>`.

---

## FMT-03 — No competing emphasis {#fmt-03}

An XML tag and a Markdown heading must not both title the same concept. Pick one.

**✓ Good — XML titles the container, Markdown titles internal sub-sections:**

```
<output_format>
## Overview
- Point A

## Risks
- Point B
</output_format>
```

**✗ Bad — both compete to label the same thing:**

```
<output_format>
## Output Format
Use this structure: ...
</output_format>
```

The `<output_format>` tag and `## Output Format` heading are redundant. Drop the heading.

---

## FENCE-01 — Code fencing for parsed output {#fence-01}

Use a fenced code block inside XML only when the output will be parsed downstream by another system, or when exact whitespace and formatting determinism is required.

**✓ Good — fencing is appropriate because output is piped into a parser:**

```
<output_format>
```json
{
  "title": "",
  "summary": "",
  "tags": []
}
```
</output_format>
```

**✗ Bad — fencing a Markdown structure that the reader will simply read, not parse:**

```
<output_format>
```markdown
## Policy Overview
## Economic Arguments For
## Economic Arguments Against
```
</output_format>
```

The fences add no value. The model can reason about Markdown headings without them.

---

## FENCE-02 — Prefer plain Markdown for analysis {#fence-02}

When the goal is reasoning depth or analytical richness, specify the structure in plain Markdown prose. Fences constrain format without improving output quality.

**✓ Good:**

```
<output_format>
Use the following Markdown structure:

## Policy Overview
## Economic Arguments For
## Economic Arguments Against
</output_format>
```

**✗ Bad:**

```
<output_format>
```markdown
## Policy Overview
## Economic Arguments For
## Economic Arguments Against
```
</output_format>
```

The fenced version gives the model a formatting cage instead of a reasoning scaffold.

---

## SRP-01 — One role per invocation {#srp-01}

Even strong models degrade when asked to hold multiple professional roles at once. Auditor, fixer, documentarian, and filesystem manager in one prompt produce lower-quality output across all roles.

**✓ Good — each invocation has one job:**

```
<task>
Audit the following rule set. Report violations only. Do not fix anything.
</task>
```

**✗ Bad — too many hats at once:**

```
<task>
Review this rule set for violations, fix any broken rules, update the documentation,
and write the corrected version back to the file.
</task>
```

This prompt asks the model to be an auditor, editor, technical writer, and filesystem manager simultaneously.

---

## SRP-02 — Sequential phases with clear handoffs {#srp-02}

When multiple responsibilities are genuinely required, define sequential phases. Each phase has a named input and produces exactly one output before the next phase begins.

**✓ Good:**

```
<phases>

**Phase 1 — Audit**
Input: the rule set below.
Output: a list of violations. No fixes yet.

**Phase 2 — Fix**
Input: the violation list from Phase 1.
Output: a corrected rule set. No new audit.

</phases>
```

**✗ Bad — phases with blurred boundaries:**

```
Review the rules, then fix anything broken. Also clean up the formatting
and note any unclear areas for later.
```

No clear phase boundaries, no defined outputs, no sequencing.

---

## RULE-01 — One responsibility per rule {#rule-01}

Each rule should cover exactly one thing. Bundling what to do, when to do it, and why into a single bullet makes rules hard to follow and harder to audit.

**✓ Good — one responsibility per bullet:**

```
- Sanitize user input with DOMPurify before inserting it into the DOM.
- Sanitize input before passing it to external API calls.
```

**✗ Bad — scope creep in a single rule:**

```
- Always sanitize user input with DOMPurify before inserting into the DOM or using
  in API calls, because unsanitized input can cause XSS attacks and corrupt API
  responses, so validate type first and then sanitize.
```

This rule covers sanitization, validation, two contexts (DOM + API), and the threat model — four separate concerns in one bullet.

---

## RULE-02 — Conditional over absolute {#rule-02}

"Always" and "never" sound strong but silently break in edge cases. Use "when X" to express the actual condition.

**✓ Good:**

```
- When inserting user content into the DOM, sanitize it with DOMPurify first.
- When storing large datasets, use localforage instead of extensionSettings.
```

**✗ Bad:**

```
- Always sanitize with DOMPurify.
- Never use extensionSettings for data.
```

The absolute versions create false rules: DOMPurify isn't needed for server-side rendering, and small, non-sensitive settings belong in extensionSettings.

---

## RULE-03 — No redundant rules {#rule-03}

Each constraint appears exactly once. Repeating it in a different section or with slightly different wording dilutes attention, inflates prompt size, and creates maintenance risk (the two copies may diverge).

**✓ Good — constraint stated once, in the most specific location:**

```
## Security
- When inserting user content into the DOM, sanitize it with DOMPurify first.
```

**✗ Bad — same constraint repeated in two places:**

```
## General Rules
- Always sanitize user input.

## Security
- When inserting user content into the DOM, sanitize it with DOMPurify.
```

If the rule needs updating, only one copy will be changed, leaving the other stale.

---

## PHASE-01 — Explicit phase naming {#phase-01}

A phase name must do two things: tell the model where it is in the sequence, and tell it what its single job is for this phase.

**✓ Good:**

```
Phase 1 — Audit: identify violations. Do not write fixes.
Phase 2 — Fix: apply corrections from Phase 1. Do not introduce new findings.
Phase 3 — Document: update the task file to reflect changes made in Phase 2.
```

**✗ Bad:**

```
First, do the review. Then handle the fixes. Documentation last.
```

"First", "then", and "last" indicate sequence but not role. The model doesn't know what each phase is allowed or forbidden to do.

---

## PHASE-02 — Don't over-engineer phases {#phase-02}

A phase split is only justified when: (1) the output of one step is the non-trivial input of the next, or (2) different roles are needed that genuinely degrade each other. Otherwise, one invocation is cleaner.

**✓ Good — single invocation is sufficient:**

```
<task>
Summarize this article in three bullet points.
</task>
```

**✗ Bad — unnecessary phase split:**

```
Phase 1 — Read: read the article carefully.
Phase 2 — Extract: identify the key points.
Phase 3 — Write: write the summary.
```

Reading, extracting, and writing are not separate responsibilities — they're stages of a single cognitive act. The phase split adds structure with no benefit.
