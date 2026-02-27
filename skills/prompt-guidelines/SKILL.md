---
name: prompt-guidelines
description: Prompting guidelines for writing effective LLM prompts, workflows, skill instructions, and rule sets. Use when authoring new prompts, skills, workflow files, or instruction sets for any LLM. Invoked via /prompt-guidelines. Covers five rule families: XML/Markdown hybrid formatting (FMT), code fencing decisions (FENCE), single-responsibility principle for prompts (SRP), constraint and rule writing (RULE), and phase sequencing (PHASE).
---

# Prompt Guidelines

Enforce effective prompting practices when authoring LLM prompts, skills, workflows, or instruction sets. Twelve rules across five families.

Load `references/rules.md` for annotated good/bad examples when illustrating violations or writing new prompts.

## Rule Families

### Format (FMT) — XML and Markdown Hybrid

| ID | Rule |
|---|---|
| FMT-01 | Use XML for logical separation (roles, tool calls, I/O constraints); use Markdown for visual formatting (bullets, headings, step lists). Never use both formats for the same structural role. |
| FMT-02 | No duplicated hierarchy. If XML wraps a section, do not open that section with a Markdown heading of the same level inside it. |
| FMT-03 | No competing emphasis. An XML tag and a Markdown heading must not both title the same concept. |

### Code Fencing (FENCE)

| ID | Rule |
|---|---|
| FENCE-01 | Use fenced code blocks inside XML only when output is parsed downstream or requires high formatting determinism. |
| FENCE-02 | Prefer plain Markdown structure (e.g., `## Section`) over fenced Markdown blocks when the goal is analytical richness or reasoning depth. |

### Single Responsibility (SRP)

| ID | Rule |
|---|---|
| SRP-01 | Each prompt invocation has one role. Do not combine auditor, fixer, documentarian, and filesystem manager in a single prompt. |
| SRP-02 | When multiple responsibilities are required, define sequential phases with clear inputs and one output each. |

### Constraint and Rule Writing (RULE)

| ID | Rule |
|---|---|
| RULE-01 | Each rule covers one responsibility. Do not bundle what to do, when to do it, and why into a single bullet. |
| RULE-02 | Avoid absolute quantifiers ("always", "never") unless truly unconditional. Prefer "when X" conditions instead. |
| RULE-03 | Each constraint appears exactly once. Repeating the same rule in different sections dilutes attention and inflates prompt size. |

### Phases and Sequencing (PHASE)

| ID | Rule |
|---|---|
| PHASE-01 | Name phases explicitly with an ordinal label and a clear role (e.g., "Phase 1 — Audit", "Phase 2 — Fix"). |
| PHASE-02 | Do not split into phases when a single invocation is sufficient. Over-engineering phases adds friction without benefit. |

## Applying These Rules

When authoring a new prompt or skill:

1. Load `references/rules.md` for the relevant rule families before writing.
2. Apply all applicable rules from the start — do not write a first draft and fix it later.
3. When a rule is applied, note it inline if the correct pattern is non-obvious.

When reviewing an existing prompt or workflow for quality:

1. Load `references/rules.md` for all five rule families.
2. Evaluate each of the twelve rules against the content under review.
3. Output a structured checklist (PASS / FAIL / N/A per rule), then list only FAIL items with the exact offending text and a corrected version.
