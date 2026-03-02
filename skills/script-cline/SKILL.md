---
name: script-cline
description: 'Generate Cline CLI headless-mode bash scripts for local automation on Windows with Git Bash. Use when the user wants to automate a coding task with Cline CLI non-interactively — including code review (git diff, PR diffs), fixing lint or test failures, generating commit messages or release notes, and batch processing multiple files. Triggers on: "/script-cline", "cline script", "automate with cline", "run cline headless", "cline yolo", "write a cline automation", "cline batch", or when the user describes a task they want Cline to handle autonomously without interaction.'
---

# Script — Cline

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

Then ask: *"Want me to save this as `workflows/<workflow-name>/<N>-cline-<purpose>.sh` in your project?"*

## Risk levels and guardrails

| Risk | When | Guardrails to suggest |
|------|------|-----------------------|
| Low | Read-only (review, generate text) | None required |
| Medium | Edits source files | Feature branch before running; review `git diff` after |
| High | Edits many files or runs long autonomously | Feature branch + stash check; `CLINE_COMMAND_PERMISSIONS` to restrict commands; `--timeout` to cap runtime |

Do not enforce guardrails in code. Document them clearly and let the user decide.

## Constraints

These are hard limits that apply to every generated script — never violate them:

- **Shell target is Git Bash only.** Do not generate PowerShell, CMD, or Python scripts. The user runs Windows and Git Bash is the only supported shell for this skill.
- **Headless mode only.** Scripts must invoke Cline non-interactively. Do not generate scripts that open an interactive Cline session.
- **No destructive git operations without explicit instruction.** Scripts must not force-push, reset the working tree (`git reset --hard`), or delete branches unless the user has explicitly asked for that behavior.
- **Never touch `vendor/SillyTavern`.** If the task prompt would cause Cline to modify files under that path, add an explicit exclusion instruction to the Cline task prompt.
- **One clear goal per script.** Reject or decompose vague, open-ended task descriptions. A prompt like "fix everything" is not actionable — ask the user to narrow it down before generating the script.
- **Avoid `apply_patch` in Cline task prompts.** Instruct Cline to use `write_to_file` or `replace_in_file` instead. `apply_patch` produces unreliable results on Windows and can silently corrupt files that contain special characters or emoji.
- **No log files.** Do not generate log file writing, `tee` to log files, or `LOG_DIR`/`LOG_FILE` variables. Output goes to the terminal only.

## Use cases

**1. Code review** — Pipe a git diff into Cline for analysis. Cline reads only; output goes to terminal. Risk: Low.

**2. Fix lint/tests** — Cline edits source files to fix ESLint or test failures. Risk: Medium.

**3. Commit message / release notes** — Cline reads staged diff or git log and generates text. No files modified. Risk: Low.

**4. Batch file processing** — Cline loops through a list of files and applies a task to each. Risk: High.

See `references/examples.md` for complete, ready-to-run scripts for each use case. Load it when generating or customizing scripts.

## Script naming convention

Scripts saved in a workflow folder follow this pattern:

```
<N>-cline-<purpose>.sh
```

Examples:
- `1-cline-first-review.sh`
- `2-cline-meta-review.sh`
- `3-cline-batch-files.sh`

Where `<N>` is the execution order within the workflow, and `<purpose>` is a short, lowercase-hyphenated description of what the script does.

## Script conventions

- Start with `#!/bin/bash`
- Use `set -e` to stop on errors
- Top comment block: task name, risk level, guardrail reminder
- Branch check with `git branch --show-current` for Medium/High risk scripts
- `read -r` pause before continuing if risk is High
- Add `--timeout <seconds>` for any task that edits files (Medium/High)

## Best practices

Guidance for writing scripts that are safe, reviewable, and easy to debug:

- **Run on a feature branch, not on `main` or `dev`.** For any Medium or High risk script, switching to a throwaway branch before running means a bad result is one `git checkout` away from being undone.
- **Size `--timeout` to the task scope.** Suggested baselines: ~120 s for a single-file review or small fix; ~300 s for a multi-file batch; ~600 s for a full lint-fix pass. Tighter timeouts catch runaway sessions early.
- **Test batch scripts on one file first.** Before looping over a directory, run the script against a single representative file and inspect the result. Only widen the loop once the single-file output looks correct.
- **Keep the Cline task prompt under ~200 words.** Long, multi-objective prompts increase the chance of unintended edits. One goal, stated clearly, produces more predictable output than a list of goals.
- **Stash or commit local changes before a Medium/High run.** A clean working tree means `git diff` after the run shows only what Cline changed, with no noise from pre-existing edits.

## Running scripts on Windows (Git Bash)

In VS Code:
1. Open a terminal: `Terminal → New Terminal`
2. Change shell: click the `+` dropdown → **Git Bash**
3. Run: `bash ./workflows/<workflow-name>/<script-name>.sh`

To set Git Bash as the permanent default: `Ctrl+Shift+P → "Terminal: Select Default Profile" → Git Bash`.

Scripts live inside the workflow folder they belong to: `workflows/<workflow-name>/`. Create the folder first if it does not exist: `mkdir -p workflows/<workflow-name>`.
