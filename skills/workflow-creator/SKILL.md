---
name: workflow-creator
description: Creates a structured workflow documentation file (Workflow_<Name>.md) in tasks/workflows/ for any multi-step repeatable process. Interviews the user to capture all phases, tools, inputs, outputs, state-tracking folders, scripts, and edge cases, then generates the file using the project's four-section visual format: quick-reference table, pipeline flow diagram, folder conveyor belt, and per-phase cards. Also creates a linked scripts-reference.md when the workflow involves automated scripts. Use when the user says "create a workflow", "document my process", "help me create a workflow file", "document this process", or invokes /workflow-creator.
---

# Workflow Creator

## Process

1. Check for an existing file to avoid duplicates.
2. Interview the user.
3. Write the file(s).
4. Report what was created.

---

## Step 1 — Check for Existing File

Glob `tasks/workflows/`. If a relevant workflow file already exists, update it rather than creating a new one.

---

## Step 2 — Interview the User

Use `AskUserQuestion` to gather everything needed before writing. If the conversation already contains the required information, skip ahead to Step 3.

**Round 1 — Overview:**

- What is the workflow name and one-sentence purpose?
- Who uses it — a human, an AI agent, or both?
- What are the phases, listed briefly in order?
- Does it involve automated scripts? If so, which tools (Cline, Codex, shell)?

**Round 2 — Per-phase detail** (batch up to 4 phases per call):

For each phase, gather: trigger, tool or action used, input, output, whether a manual test is needed after, and whether it is conditional (only runs when something specific happens).

**Round 3 — State and edge cases:**

- Are there files or folders that track where you are in the cycle?
- What happens if you stop mid-way and resume later?
- What can go wrong, and how do you recover?

Probe gaps and follow up. Do not ask about information already given.

---

## Step 3 — Write the Files

### Naming and location

- Main file: `tasks/workflows/Workflow_<NameWithNoSpaces>.md`
- Scripts reference (only if automated scripts exist): `tasks/workflows/<name-lowercase>-scripts-reference.md`
- Link to the scripts reference from the main file's header block.

### Document structure (in order)

1. **Header block** — title, `Last updated` date, purpose, audience, link to scripts-reference if applicable
2. **Quick Reference Table** — one row per phase
3. **Pipeline Flow Diagram** — top-down ASCII art showing all phases and branches
4. **Folder Conveyor Belt** — ASCII state map showing how folders track progress (omit if no state folders)
5. **Phase Cards** — one card per phase, with prose below each
6. **Edge Cases** — resuming mid-cycle, failure recovery, and any conditional phase detail

---

## Format Conventions

### Quick Reference Table

```markdown
| # | Phase | How | Output location | Test? |
| --- | --- | --- | --- | --- |
| 1 | Phase name | Tool or action | `output-folder/` | No |
```

- Always use `| --- |` separator style (spaces inside pipes).
- "Test?" column: `No`, `Yes`, or `🟡 = yes` when risk-dependent.
- Conditional phases: prefix the Phase cell with *(if X)*.

### Pipeline Flow Diagram

Top-down connected box diagram inside a ` ```text ` fence. Show splits and branches explicitly.

```text
  PHASE 1 ── Phase Name
  ┌──────────────────────────────────────┐
  │  brief description of what happens  │
  └──────────────────┬───────────────────┘
                     │
  PHASE 2 ── Next Phase
  ...
```

For conditional branches:

```text
  └──────┬─────────────────┬─────────────┘
         │ normal path     │ failure path
         ▼                 ▼
  PHASE N ── Normal    PHASE N+1 ── Conditional (only if X)
```

### Folder Conveyor Belt

Show folders in the order files pass through them, with arrows. Mark which phase moves files into each folder. Show loop-backs for failure or retry paths. Use a ` ```text ` fence.

### Phase Cards

```text
┌──────────────────────────────────────────────────────────┐
│  PHASE N  │  Phase Name                                 │
├──────────────────────────────────────────────────────────┤
│  Row      │  Value                                      │
└──────────────────────────────────────────────────────────┘
```

- Use single-line box drawing only: `┌ ─ ┐ │ ├ ┤ └ ┘` — never double-line (`╔ ═ ║`).
- Wrap every card in a ` ```text ` fence.
- For conditional phases, add a second header line: `│  PHASE N  │  *(conditional — only if X)*  │`
- After the card, add prose: what happens, decisions to make, or key tips.
- If a referenced skill or script does not exist yet, add below the card:
  > **Status:** The `skill-name` skill does not exist yet. This phase is a placeholder.

### Edge Cases section

Always include at minimum:

- **Resuming mid-cycle** — a lookup table mapping folder or state to "which phase to run next"
- **Failure recovery** — what to do when something breaks (manual steps or a skill reference)

### Markdown lint rules

- Blank line between a heading and its code fence.
- Blank line before and after every list.
- All code fences must specify a language: use `text` for ASCII art and diagrams.

---

## Scripts Reference File Format

Only create this file if the workflow has automated scripts. Structure:

```markdown
# Scripts Reference — <Workflow Name>

**Last updated:** <date>
**Used by:** [Workflow_<Name>.md](Workflow_<Name>.md)

<brief description>

---

## Step N — <Phase Name>

**Skill/tool:** `skill-name`
**Runs:** <how many times / until what condition>

### Cline task prompt

[prompt text]

### Codex command

[command or placeholder]

---

## Notes

- <important notes about session handling, loop behavior, etc.>
```

---

## Step 4 — Report

Output one short paragraph naming the file(s) created and listing the phases covered. Then stop.
