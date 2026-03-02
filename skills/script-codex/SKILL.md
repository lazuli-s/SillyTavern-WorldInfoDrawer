---
name: script-codex
description: "Generates, reviews, and updates codex batch scripts (.ps1) inside the matching workflow folder under workflows/. Each script loops over a folder of .md files, calls a codex skill on each file via codex exec --yolo, and commits at the end. Use when: (1) creating a new batch script to automate a codex skill over a folder, (2) reviewing an existing script for convention compliance, (3) updating a script to follow established patterns. Trigger phrases: 'create a codex batch script for [skill]', 'add a script for [phase]', 'make a batch script', 'review this codex script', 'update the batch script'."
---

# script-codex

Generates, reviews, or updates a codex batch script inside the matching workflow folder.

---

## 1. Before writing — gather these inputs

| Input | Where to get it |
| --- | --- |
| Skill name | User (e.g. `triage-reviews`) |
| SKILL.md path | `skills/<skill-name>/SKILL.md` |
| Input folder (default path) | User (e.g. `tasks/code-reviews/pending-implementation`) |
| Param name | Derive from purpose (e.g. `$PendingDir`, `$BulkDir`, `$InputDir`) |
| Banner labels | Derive from context (e.g. "Files to triage", "Files to implement") |
| Git add scope | `tasks/code-reviews/` if review files only; `-A` if source files are also edited |
| Commit message | User — follow `git-commit` skill conventions |
| Extra requirements | User — any skill-specific constraints to add to the instruction |
| Codex flags | Default `--yolo`; see section 4 for when to use `--sandbox` |

If any input is unclear or missing, ask before writing.

---

## 2. Template

Read `references/template.ps1`. Copy it and fill in every `# <<< CUSTOMIZE` placeholder.

Every customizable section is marked with that comment. Sections without it are **fixed** — do not remove, reorder, or simplify them. They are required by the conventions in section 3.

---

## 3. Mandatory conventions checklist

Every script MUST have all of the following. Treat any absence as a violation when generating or auditing.

| # | Convention | Location in script |
| --- | --- | --- |
| 1 | `[CmdletBinding()]` + `param([string]$<DirParam> = "...")` | Top of script |
| 2 | UTF-8 encoding block (three `[Console]` + `$OutputEncoding` lines) | After `$ErrorActionPreference` |
| 3 | `Count-Pending`, `Next-File`, `Format-Elapsed` helper functions | Function definitions section |
| 4 | `throw` if codex not found in PATH | Pre-flight check |
| 5 | `throw` if input folder not found | Pre-flight check |
| 6 | `===` opening banner: file count + folder path | Before main loop |
| 7 | `-- Run N -- filename --` divider + Started / Completed / Elapsed per file | Inside main loop |
| 8 | `===` closing footer: total count + total elapsed | After main loop |
| 9 | `throw` on codex non-zero exit code | After `codex exec` call |
| 10 | `throw` on `git add` failure | After `git add` |
| 11 | `throw` on `git commit` failure | After `git commit` |
| 12 | Instruction contains: skill name, SKILL.md path, requirements list | `$instruction` heredoc |
| 13 | Instruction requirement: no Bash echo/printf/heredoc for file writes | In requirements list |

---

## 4. Codex flags

**Default:** `--yolo` — no sandboxing, full file access. Use for skills that edit source files or move files across folders.

**Use `--sandbox workspace-write --full-auto`** when the skill must NOT edit source code (read-only review tasks, e.g. `code-review-first-review`).

If unsure, use `--yolo`.

---

## 5. File placement and naming

- **Folder:** `workflows/<workflow-name>/` — scripts live inside the workflow folder they belong to
- **Name pattern:** `<N>-codex-<purpose>.ps1` — number first, then tool indicator, then purpose; lowercase, hyphenated

Where `<N>` is the execution order within the workflow and `<purpose>` is a short description of what the script does.

Examples:
- `3-codex-triage.ps1` → runs `triage-reviews` skill (step 3 of its workflow)
- `4-codex-implement-bulk.ps1` → runs `code-review-implement` on the `bulk/` subfolder

---

## 6. Auditing an existing script

When reviewing a script for compliance, check each row in the checklist (section 3). For each row report:

- **PASS** — convention is present and correct
- **FAIL** — missing or wrong; explain what and show the corrected snippet
- **N/A** — does not apply; explain why

Do not rewrite the script unless the user asks. Report findings only.
