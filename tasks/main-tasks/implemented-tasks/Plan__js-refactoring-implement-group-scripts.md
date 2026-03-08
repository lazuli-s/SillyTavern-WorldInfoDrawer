# PLAN: JS Refactoring — 7 Group Implementation Scripts
*Created: March 7, 2026*

**Type:** Plan
**Status:** IMPLEMENTED

---

## Summary

There are 42 refactoring task files ready to be implemented, spread across the entire
extension codebase. To reduce the risk of errors, the work is divided into 7 groups
organized by module. Each group gets its own PowerShell script that runs all files in
that group via Codex, then makes a single git commit. The user tests in the browser
between groups.

## Current Behavior

All 42 refactoring `.md` files sit flat inside
`tasks/js-refactoring/ready-for-implementation/`. There are no scripts to process them
in groups — they would have to be run one by one manually.

## Expected Behavior

After this plan is implemented:
- The 42 `.md` files are organized into 7 subfolders (one per group) inside
  `tasks/js-refactoring/ready-for-implementation/`.
- 7 PowerShell scripts exist in `workflows/js-refactoring/`, numbered `3` through `9`.
- Each script processes only the files in its group subfolder, then makes one git commit.
- The user runs one script, tests, then runs the next.

## Agreed Scope

- `tasks/js-refactoring/ready-for-implementation/` — add 7 group subfolders, move files
- `workflows/js-refactoring/` — add 7 new `.ps1` scripts (numbered 3–9)

## Out of Scope

- No changes to any source `.js` files (that is the job of each script when run).
- No changes to existing scripts `1-codex-review-queue.ps1` or `2-cline-review-queue.ps1`.

---

## Group Definitions

| # | Script name | Subfolder | Files (42 total) |
|---|-------------|-----------|------------------|
| 1 | `3-codex-implement-g1-base-utils.ps1` | `group-1-base-utils/` | `Refactoring__constants.js.md`, `Refactoring__settings.js.md`, `Refactoring__sort-helpers.js.md`, `Refactoring__utils.js.md`, `Refactoring__wi-update-handler.js.md` |
| 2 | `4-codex-implement-g2-logic-book-browser.ps1` | `group-2-logic-book-browser/` | `Refactoring__logic.filters.js.md`, `Refactoring__logic.state.js.md`, `Refactoring__book-browser.js.md`, `Refactoring__book-browser.state.js.md` |
| 3 | `5-codex-implement-g3-book-list-folders.ps1` | `group-3-book-list-folders/` | `Refactoring__book-list.book-menu.js.md`, `Refactoring__book-list.book-source-links.js.md`, `Refactoring__book-list.books-view.js.md`, `Refactoring__book-list.extension-integrations.js.md`, `Refactoring__book-list.selection-dnd.js.md`, `Refactoring__book-list.world-entry.js.md`, `Refactoring__book-folders.folder-actions.js.md`, `Refactoring__book-folders.folder-dom.js.md`, `Refactoring__book-folders.folders-view.js.md`, `Refactoring__book-folders.lorebook-folders.js.md` |
| 4 | `6-codex-implement-g4-browser-tabs.ps1` | `group-4-browser-tabs/` | `Refactoring__browser-tabs.js.md`, `Refactoring__browser-tabs.folders-tab.js.md`, `Refactoring__browser-tabs.lorebooks-tab.js.md`, `Refactoring__browser-tabs.search-tab.js.md`, `Refactoring__browser-tabs.settings-tab.js.md`, `Refactoring__browser-tabs.sorting-tab.js.md`, `Refactoring__browser-tabs.visibility-tab.js.md` |
| 5 | `7-codex-implement-g5-drawer-editor.ps1` | `group-5-drawer-editor/` | `Refactoring__drawer.js.md`, `Refactoring__drawer.splitter.js.md`, `Refactoring__editor-panel.js.md` |
| 6 | `8-codex-implement-g6-entry-table-bulk.ps1` | `group-6-entry-table-bulk/` | `Refactoring__entry-manager.js.md`, `Refactoring__entry-manager.utils.js.md`, `Refactoring__table.body.js.md`, `Refactoring__table.filter-panel.js.md`, `Refactoring__table.header.js.md`, `Refactoring__bulk-edit-row.js.md`, `Refactoring__bulk-edit-row.helpers.js.md`, `Refactoring__bulk-edit-row.order.js.md`, `Refactoring__bulk-edit-row.position.js.md`, `Refactoring__bulk-edit-row.sections.js.md`, `Refactoring__bulk-editor-tab.js.md` |
| 7 | `9-codex-implement-g7-display-index.ps1` | `group-7-display-index/` | `Refactoring__display-tab.display-toolbar.js.md`, `Refactoring__index.js.md` |

---

## Implementation Plan

### Step 1 — Create group subfolders

Create these 7 folders inside `tasks/js-refactoring/ready-for-implementation/`:

- [x] Create `group-1-base-utils/`
- [x] Create `group-2-logic-book-browser/`
- [x] Create `group-3-book-list-folders/`
- [x] Create `group-4-browser-tabs/`
- [x] Create `group-5-drawer-editor/`
- [x] Create `group-6-entry-table-bulk/`
- [x] Create `group-7-display-index/`

### Step 2 — Move the 42 files into their group subfolders

Move each `.md` file from `tasks/js-refactoring/ready-for-implementation/` into the
correct group subfolder as defined in the Group Definitions table above.

- [x] Move 5 files into `group-1-base-utils/`
- [x] Move 4 files into `group-2-logic-book-browser/`
- [x] Move 10 files into `group-3-book-list-folders/`
- [x] Move 7 files into `group-4-browser-tabs/`
- [x] Move 3 files into `group-5-drawer-editor/`
- [x] Move 11 files into `group-6-entry-table-bulk/`
- [x] Move 2 files into `group-7-display-index/`

### Step 3 — Create the 7 PowerShell scripts

Create each script in `workflows/js-refactoring/`. All 7 scripts follow the same
structure as `workflows/code-review/7-codex-implement-bulk.ps1`, with these
differences per script:

- The `$GroupDir` parameter points to the script's own group subfolder.
- The Codex instruction names `js-refactoring-implement` as the skill.
- The git commit message identifies the group number and name.

**Template for each script:**

```
#!/usr/bin/env pwsh
#requires -Version 7.0

[CmdletBinding()]
param(
    [string]$GroupDir = "tasks/js-refactoring/ready-for-implementation/<group-subfolder>"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

function Count-Pending {
    if (-not (Test-Path -LiteralPath $GroupDir -PathType Container)) { return 0 }
    $files = Get-ChildItem -LiteralPath $GroupDir -Filter *.md -File -ErrorAction SilentlyContinue
    return @($files).Count
}

function Next-File {
    if (-not (Test-Path -LiteralPath $GroupDir -PathType Container)) { return "" }
    $files = Get-ChildItem -LiteralPath $GroupDir -Filter *.md -File -ErrorAction SilentlyContinue |
             Sort-Object -Property Name
    if (@($files).Count -eq 0) { return "" }
    return $files[0].FullName
}

function Format-Elapsed {
    param([TimeSpan]$Elapsed)
    $m = [int]$Elapsed.TotalMinutes
    $s = $Elapsed.Seconds
    if ($m -ge 1) { return "${m}m ${s}s" }
    return "${s}s"
}

$codex = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codex) { throw "codex command not found in PATH." }

if (-not (Test-Path -LiteralPath $GroupDir -PathType Container)) {
    throw "Group folder not found: $GroupDir"
}

$pending = Count-Pending
if (($pending -as [int]) -eq 0) {
    Write-Host "Group folder is already empty. Nothing to do."
    exit 0
}

Write-Host "=============================================================================="
Write-Host ("Files to implement : {0}" -f $pending)
Write-Host ("Group folder       : {0}" -f $GroupDir)
Write-Host "=============================================================================="

$run = 0
$implemented = New-Object System.Collections.Generic.List[string]
$batchStart = Get-Date

while ($true) {
    $pending = Count-Pending
    if (($pending -as [int]) -eq 0) {
        Write-Host ""
        Write-Host "Group folder is empty - all files implemented."
        break
    }

    $nextPath = Next-File
    if ([string]::IsNullOrEmpty($nextPath)) {
        Write-Host ""
        Write-Host "Group folder is empty - all files implemented."
        break
    }

    $nextBase = [System.IO.Path]::GetFileName($nextPath)
    $run += 1
    $fileStart = Get-Date

    Write-Host ""
    Write-Host ("-- Run {0} -- {1} {2}" -f $run, $nextBase, ("-" * 50))
    Write-Host ("Started   : {0}" -f $fileStart)

    $instruction = @"
Run the /js-refactoring-implement skill for exactly one file.

Target file:
$nextPath

Follow the skill instructions exactly as written in:
  .claude/skills/js-refactoring-implement/SKILL.md

Use direct mode: process ONLY the target file listed above.
Do not auto-select a different file.

Requirements:
- Mark all finding checkboxes as done in the target review file.
- Append the After Implementation section to the target review file.
- Apply all refactoring changes to the source JS file that the report targets.
- Move the target review file to tasks/js-refactoring/implemented/ when done.
- Do NOT modify anything under vendor/SillyTavern.
- Do not write file content using Bash echo, printf, or heredoc -- use the Write or Edit tools only.
"@

    & codex exec --yolo $instruction
    if ($LASTEXITCODE -ne 0) {
        throw ("codex exec failed on run {0} for {1} (exit code {2})." -f $run, $nextBase, $LASTEXITCODE)
    }

    $implemented.Add($nextBase) | Out-Null
    $fileEnd = Get-Date
    $fileElapsed = $fileEnd - $fileStart
    Write-Host ("Completed : {0}" -f $fileEnd)
    Write-Host ("Elapsed   : {0}" -f (Format-Elapsed $fileElapsed))
}

$batchEnd = Get-Date
$batchElapsed = $batchEnd - $batchStart

Write-Host ""
Write-Host "=============================================================================="
Write-Host ("Total files implemented : {0}" -f $run)
Write-Host ("Total time              : {0}" -f (Format-Elapsed $batchElapsed))
Write-Host "=============================================================================="

& git add -A
if ($LASTEXITCODE -ne 0) { throw "git add failed." }

& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No files were staged. Nothing to commit."
    exit 0
}

$bodyLines = ($implemented | ForEach-Object { "- $_" }) -join "`n"
$commitMsg = "refactor(<scope>): apply js refactoring group <N> (<group-name>)`n`nFiles refactored:`n$bodyLines`n"

& git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) { throw "git commit failed." }

Write-Host "Committed."
```

Per-script substitutions (`<...>` placeholders):

| Script | `<group-subfolder>` | `<scope>` | `<N>` | `<group-name>` |
|--------|---------------------|-----------|-------|----------------|
| `3-codex-implement-g1-base-utils.ps1` | `group-1-base-utils` | `utils` | `1` | `base-utils` |
| `4-codex-implement-g2-logic-book-browser.ps1` | `group-2-logic-book-browser` | `book-browser` | `2` | `logic-book-browser` |
| `5-codex-implement-g3-book-list-folders.ps1` | `group-3-book-list-folders` | `book-browser` | `3` | `book-list-folders` |
| `6-codex-implement-g4-browser-tabs.ps1` | `group-4-browser-tabs` | `browser-tabs` | `4` | `browser-tabs` |
| `7-codex-implement-g5-drawer-editor.ps1` | `group-5-drawer-editor` | `drawer` | `5` | `drawer-editor` |
| `8-codex-implement-g6-entry-table-bulk.ps1` | `group-6-entry-table-bulk` | `entry-manager` | `6` | `entry-table-bulk` |
| `9-codex-implement-g7-display-index.ps1` | `group-7-display-index` | `index` | `7` | `display-index` |

- [x] Create `workflows/js-refactoring/3-codex-implement-g1-base-utils.ps1`
- [x] Create `workflows/js-refactoring/4-codex-implement-g2-logic-book-browser.ps1`
- [x] Create `workflows/js-refactoring/5-codex-implement-g3-book-list-folders.ps1`
- [x] Create `workflows/js-refactoring/6-codex-implement-g4-browser-tabs.ps1`
- [x] Create `workflows/js-refactoring/7-codex-implement-g5-drawer-editor.ps1`
- [x] Create `workflows/js-refactoring/8-codex-implement-g6-entry-table-bulk.ps1`
- [x] Create `workflows/js-refactoring/9-codex-implement-g7-display-index.ps1`

---

## After Implementation
*Implemented: March 8, 2026*

### What changed

`tasks/js-refactoring/ready-for-implementation/`
- Added 7 group folders so the refactoring reports are separated by area instead of mixed together.
- Moved all 42 refactoring report files into those folders based on the plan's module groups.

`workflows/js-refactoring/3-codex-implement-g1-base-utils.ps1`
- Added a batch runner for the shared utility group.
- It processes one report at a time and makes one commit after the group finishes.

`workflows/js-refactoring/4-codex-implement-g2-logic-book-browser.ps1`
- Added a batch runner for the logic and main book browser group.
- It points Codex at only that group folder.

`workflows/js-refactoring/5-codex-implement-g3-book-list-folders.ps1`
- Added a batch runner for book list and folder related reports.
- It uses the same run loop and commit pattern as the repository's existing automation.

`workflows/js-refactoring/6-codex-implement-g4-browser-tabs.ps1`
- Added a batch runner for the browser tabs group.
- It stops cleanly if the folder is already empty.

`workflows/js-refactoring/7-codex-implement-g5-drawer-editor.ps1`
- Added a batch runner for the drawer and editor group.
- It records which files were processed into the commit message body.

`workflows/js-refactoring/8-codex-implement-g6-entry-table-bulk.ps1`
- Added a batch runner for the entry manager, table, and bulk edit group.
- It stages and commits only after the whole group run completes.

`workflows/js-refactoring/9-codex-implement-g7-display-index.ps1`
- Added a batch runner for the display toolbar and index group.
- It uses the same direct-file instruction format as the other new runners.

### Risks / What might break

- This changes where the refactoring report files live, so anything that still expects them in one flat folder will no longer find them.
- The new scripts make git commits automatically, so a wrong folder path or unexpected file in a group could be included in that commit.
- These scripts depend on the `codex` command being available in PowerShell, so they will stop immediately on machines where that command is missing.

### Manual checks

- Open `tasks/js-refactoring/ready-for-implementation/` and confirm you only see the 7 group folders and no loose `.md` files.
- Open each folder and confirm the file counts match the plan table: 5, 4, 10, 7, 3, 11, and 2.
- Open `workflows/js-refactoring/` and confirm scripts `3` through `9` are present next to the two existing scripts.
- Run one script with a safe test group when you are ready. Success looks like it processing files from only that one folder and then either committing once or stopping with a clear message if the folder is empty.
