---
name: cline-headless
description: Generate Cline CLI headless-mode bash scripts for local automation on Windows with Git Bash. Use when the user wants to automate a coding task with Cline CLI non-interactively — including code review (git diff, PR diffs), fixing lint or test failures, generating commit messages or release notes, and batch processing multiple files. Triggers on: "/cline-headless", "cline script", "automate with cline", "run cline headless", "cline yolo", "write a cline automation", "cline batch", or when the user describes a task they want Cline to handle autonomously without interaction.
---

# Cline Headless Script Generator

Cline CLI headless mode runs Cline autonomously in a terminal — no human approval needed. This skill generates ready-to-run Git Bash scripts (`.sh`) for the four most common local automation workflows.

## Workflow

**If the user describes a task** → identify the closest use case → produce a ready-to-run script with the standard response format below.

**If no task is given** → show this menu and ask the user to pick:

```
Pick a Cline headless automation:

1. Code review      — analyze git diff or last commit for bugs and issues
2. Fix lint/tests   — auto-fix ESLint errors or failing tests
3. Commit message   — generate from staged changes or git log
4. Batch files      — apply a repeated task to multiple files
```

## Response format for every script

Always include these four items before the script block:

- **Task:** One sentence describing what the script does.
- **Risk level:** Low / Medium / High
- **What Cline may change:** List exactly what files or state Cline could modify.
- **Suggested guardrails:** Risk-appropriate options the user may choose to apply.

Then show the complete `.sh` script.

Then ask: *"Want me to save this as `scripts/cline-headless/<name>.sh` in your project?"*

## Risk levels and guardrails

| Risk | When | Guardrails to suggest |
|------|------|-----------------------|
| Low | Read-only (review, generate text) | None required |
| Medium | Edits source files | Feature branch before running; review `git diff` after |
| High | Edits many files or runs long autonomously | Feature branch + stash check; `CLINE_COMMAND_PERMISSIONS` to restrict commands; `--timeout` to cap runtime |

Do not enforce guardrails in code. Document them clearly and let the user decide.

## Use cases

**1. Code review** — Pipe a git diff into Cline for analysis. Cline reads only; output goes to terminal. Risk: Low.

**2. Fix lint/tests** — Cline edits source files to fix ESLint or test failures. Risk: Medium.

**3. Commit message / release notes** — Cline reads staged diff or git log and generates text. No files modified. Risk: Low.

**4. Batch file processing** — Cline loops through a list of files and applies a task to each. Risk: High.

See `references/examples.md` for complete, ready-to-run scripts for each use case. Load it when generating or customizing scripts.

## Script conventions

- Start with `#!/bin/bash`
- Use `set -e` to stop on errors
- Top comment block: task name, risk level, guardrail reminder
- Branch check with `git branch --show-current` for Medium/High risk scripts
- `read -r` pause before continuing if risk is High
- Add `--timeout <seconds>` for any task that edits files (Medium/High)

## Running scripts on Windows (Git Bash)

In VS Code:
1. Open a terminal: `Terminal → New Terminal`
2. Change shell: click the `+` dropdown → **Git Bash**
3. Run: `bash ./scripts/cline-headless/script-name.sh`

To set Git Bash as the permanent default: `Ctrl+Shift+P → "Terminal: Select Default Profile" → Git Bash`.

Scripts are saved to `scripts/cline-headless/` inside the project. Create the folder first if it does not exist: `mkdir -p scripts/cline-headless`.
