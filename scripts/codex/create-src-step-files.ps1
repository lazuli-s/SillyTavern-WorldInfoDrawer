#!/usr/bin/env pwsh
#requires -Version 7.0

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Force UTF-8 for all console I/O — prevents emoji/Unicode corruption on Windows
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

$promptFile = "tasks/main-tasks/documented/SrcFolderSteps/create-step-file.md"
$outputDir  = "tasks/main-tasks/documented/SrcFolderSteps"

# Ensure codex exists
$codex = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codex) { throw "codex command not found in PATH." }

if (-not (Test-Path -LiteralPath $promptFile -PathType Leaf)) {
    throw "Prompt file not found: $promptFile"
}

function Format-Elapsed {
    param([TimeSpan]$Elapsed)
    $m = [int]$Elapsed.TotalMinutes
    $s = $Elapsed.Seconds
    if ($m -ge 1) { return "${m}m ${s}s" }
    return "${s}s"
}

# ---------------------------------------------------------------------------
# Step definitions
# ---------------------------------------------------------------------------
$steps = @(
    @{
        OutputFile  = "Step01_SharedFolder.md"
        StepNumber  = 1
        StepName    = "Shared Folder"
        DestFolder  = "src/shared/"
        ConceptRename = $false
        FileTable   = @"
| From | To |
|---|---|
| ``src/constants.js`` | ``src/shared/constants.js`` |
| ``src/utils.js`` | ``src/shared/utils.js`` |
| ``src/Settings.js`` | ``src/shared/settings.js`` |
| ``src/sortHelpers.js`` | ``src/shared/sort-helpers.js`` |
| ``src/wiUpdateHandler.js`` | ``src/shared/wi-update-handler.js`` |
"@
        RiskLevel   = "Low 🟢"
        RiskJust    = "Pure utility files with no UI or event handlers. The only risk is a missed import reference, which surfaces immediately as a named browser console error."
        WhySafe     = "No logic, no UI, no events change. Only file locations and import strings change."
    },
    @{
        OutputFile  = "Step02_BookBrowserRoot.md"
        StepNumber  = 2
        StepName    = "Book Browser — Root Files"
        DestFolder  = "src/book-browser/ (root files only)"
        ConceptRename = $true
        OldName     = "List Panel"
        NewName     = "Book Browser"
        FileTable   = @"
| From | To |
|---|---|
| ``src/listPanel.js`` | ``src/book-browser/book-browser.js`` |
| ``src/listPanel.state.js`` | ``src/book-browser/book-browser.state.js`` |
| ``src/listPanel.coreBridge.js`` | ``src/book-browser/book-browser.core-bridge.js`` |
"@
        RiskLevel   = "Medium 🟡"
        RiskJust    = "The concept rename (List Panel → Book Browser) adds surface area beyond pure file moves — README, CSS classes, tooltip strings, and UI labels all need updating. A missed reference leaves old terminology visible to the user or causes a broken CSS class."
        WhySafe     = "No logic changes. The rename is cosmetic. Missed CSS class renames affect appearance only, not functionality. Import errors surface immediately in the browser console."
    },
    @{
        OutputFile  = "Step03_BrowserTabs.md"
        StepNumber  = 3
        StepName    = "Browser Tabs"
        DestFolder  = "src/book-browser/browser-tabs/"
        ConceptRename = $false
        FileTable   = @"
| From | To |
|---|---|
| ``src/listPanel.filterBar.js`` | ``src/book-browser/browser-tabs/browser-tabs.filter-bar.js`` |
"@
        RiskLevel   = "Low 🟢"
        RiskJust    = "Single file moved as-is with no code changes. The planned three-way split is deferred to Phase 3 — no splitting here. Import errors surface immediately."
        WhySafe     = "No code changes inside the file. File is moved unchanged. Filter bar behavior is completely unaffected."
    },
    @{
        OutputFile  = "Step04_BookList.md"
        StepNumber  = 4
        StepName    = "Book List"
        DestFolder  = "src/book-browser/book-list/"
        ConceptRename = $false
        FileTable   = @"
| From | To |
|---|---|
| ``src/listPanel.booksView.js`` | ``src/book-browser/book-list/book-list.books-view.js`` |
| ``src/listPanel.selectionDnD.js`` | ``src/book-browser/book-list/book-list.selection-dnd.js`` |
| ``src/listPanel.bookMenu.js`` | ``src/book-browser/book-list/book-list.book-menu.js`` |
| ``src/bookSourceLinks.js`` | ``src/book-browser/book-list/book-list.book-source-links.js`` |
| ``src/worldEntry.js`` | ``src/book-browser/book-list/book-list.world-entry.js`` |
"@
        RiskLevel   = "Low 🟢"
        RiskJust    = "Five pure file moves with no logic changes. The most likely error is a missed import reference, which shows up immediately as a named browser console error."
        WhySafe     = "No behavior changes. No UI changes. Only file locations and import strings change."
    },
    @{
        OutputFile  = "Step05_BookFolders.md"
        StepNumber  = 5
        StepName    = "Book Folders"
        DestFolder  = "src/book-browser/book-list/book-folders/"
        ConceptRename = $false
        FileTable   = @"
| From | To |
|---|---|
| ``src/listPanel.foldersView.js`` | ``src/book-browser/book-list/book-folders/book-folders.folders-view.js`` |
| ``src/lorebookFolders.js`` | ``src/book-browser/book-list/book-folders/book-folders.lorebook-folders.js`` |
"@
        RiskLevel   = "Low 🟢"
        RiskJust    = "Two files moved to a deeper nesting level. The main risk is an off-by-one `../` in import paths; a browser console error will identify any such mistake immediately."
        WhySafe     = "No logic changes. Folder feature behavior is completely unchanged."
    },
    @{
        OutputFile  = "Step06_EditorPanel.md"
        StepNumber  = 6
        StepName    = "Editor Panel"
        DestFolder  = "src/editor-panel/"
        ConceptRename = $false
        FileTable   = @"
| From | To |
|---|---|
| ``src/editorPanel.js`` | ``src/editor-panel/editor-panel.js`` |
"@
        RiskLevel   = "Low 🟢"
        RiskJust    = "Single file moved and renamed. Minimal surface area. Import errors surface immediately."
        WhySafe     = "No logic changes. Editor panel behavior is completely unchanged."
    },
    @{
        OutputFile  = "Step07_EntryManagerRoot.md"
        StepNumber  = 7
        StepName    = "Entry Manager — Root + Logic"
        DestFolder  = "src/entry-manager/ (root files) and src/entry-manager/logic/"
        ConceptRename = $true
        OldName     = "Order Helper"
        NewName     = "Entry Manager"
        FileTable   = @"
| From | To |
|---|---|
| ``src/orderHelper.js`` | ``src/entry-manager/entry-manager.js`` |
| ``src/orderHelperState.js`` | ``src/entry-manager/logic/logic.state.js`` |
| ``src/orderHelperFilters.js`` | ``src/entry-manager/logic/logic.filters.js`` |
"@
        RiskLevel   = "Medium 🟡"
        RiskJust    = "The concept rename (Order Helper → Entry Manager) adds surface area — README, CSS classes, tooltip strings, and UI labels all need updating. A missed reference leaves old terminology visible to the user or causes a broken CSS class."
        WhySafe     = "No logic changes. The rename is cosmetic. Missed CSS class renames affect appearance only, not functionality. Import errors surface immediately."
    },
    @{
        OutputFile  = "Step08_BulkEditor.md"
        StepNumber  = 8
        StepName    = "Bulk Editor"
        DestFolder  = "src/entry-manager/bulk-editor/"
        ConceptRename = $false
        FileTable   = @"
| From | To |
|---|---|
| ``src/orderHelperRender.js`` | ``src/entry-manager/bulk-editor/bulk-editor.js`` |
| ``src/orderHelperRender.actionBar.js`` | ``src/entry-manager/bulk-editor/bulk-editor.action-bar.js`` |
| ``src/orderHelperRender.filterPanel.js`` | ``src/entry-manager/bulk-editor/bulk-editor.filter-panel.js`` |
| ``src/orderHelperRender.tableBody.js`` | ``src/entry-manager/bulk-editor/bulk-editor.table-body.js`` |
| ``src/orderHelperRender.tableHeader.js`` | ``src/entry-manager/bulk-editor/bulk-editor.table-header.js`` |
| ``src/orderHelperRender.utils.js`` | ``src/entry-manager/bulk-editor/bulk-editor.utils.js`` |
"@
        RiskLevel   = "Low 🟢"
        RiskJust    = "Six pure file moves with no logic changes. The only risk is a missed import reference, which surfaces immediately as a named browser console error."
        WhySafe     = "No logic changes. Bulk editor behavior is completely unchanged."
    }
)

# ---------------------------------------------------------------------------
# Main loop — one codex session per step
# ---------------------------------------------------------------------------
$run      = 0
$skipped  = 0
$created  = New-Object System.Collections.Generic.List[string]
$batchStart = Get-Date

Write-Host "=============================================================================="
Write-Host ("Steps to create : {0}" -f $steps.Count)
Write-Host ("Output folder   : {0}" -f $outputDir)
Write-Host "=============================================================================="

foreach ($step in $steps) {
    $outputPath = "$outputDir/$($step.OutputFile)"

    if (Test-Path -LiteralPath $outputPath -PathType Leaf) {
        Write-Host ""
        Write-Host ("SKIP: {0} already exists" -f $step.OutputFile)
        $skipped += 1
        continue
    }

    $run += 1
    $fileStart = Get-Date

    Write-Host ""
    Write-Host ("-- Step {0}/{1} -- {2} {3}" -f $run, ($steps.Count - $skipped), $step.OutputFile, ("-" * 40))
    Write-Host ("Started : {0}" -f $fileStart)

    $renameBlock = if ($step.ConceptRename) {
        "ConceptRename : yes`nOldName       : $($step.OldName)`nNewName       : $($step.NewName)"
    } else {
        "ConceptRename : no"
    }

    $instruction = @"
Follow the instructions in:
  $promptFile

Then create the step file for these parameters:

OutputFile    : $($step.OutputFile)
StepNumber    : $($step.StepNumber)
StepName      : $($step.StepName)
DestFolder    : $($step.DestFolder)
$renameBlock
RiskLevel     : $($step.RiskLevel)
RiskJust      : $($step.RiskJust)
WhySafe       : $($step.WhySafe)

Files to Move:
$($step.FileTable)

Requirements:
- Write the output file using the Write tool — not Bash echo, printf, or heredoc.
- Status must be PENDING.
- Do not add a ## IMPLEMENTATION section.
- Do not modify any source file in src/.
"@

    & codex exec --yolo $instruction
    if ($LASTEXITCODE -ne 0) {
        throw ("codex exec failed on step {0} — {1} (exit code {2})." -f $step.StepNumber, $step.OutputFile, $LASTEXITCODE)
    }

    $created.Add($step.OutputFile) | Out-Null
    $fileEnd     = Get-Date
    $fileElapsed = $fileEnd - $fileStart
    Write-Host ("Completed : {0}" -f $fileEnd)
    Write-Host ("Elapsed   : {0}" -f (Format-Elapsed $fileElapsed))
}

# ---------------------------------------------------------------------------
# Step 09 — Final Sweep (different structure: no files to move)
# ---------------------------------------------------------------------------
$sweepFile = "$outputDir/Step09_FinalSweep.md"

if (Test-Path -LiteralPath $sweepFile -PathType Leaf) {
    Write-Host ""
    Write-Host "SKIP: Step09_FinalSweep.md already exists"
} else {
    $run += 1
    $fileStart = Get-Date
    Write-Host ""
    Write-Host ("-- Step 9/9 -- Step09_FinalSweep.md {0}" -f ("-" * 40))
    Write-Host ("Started : {0}" -f $fileStart)

    $sweepInstruction = @"
Create the file: tasks/main-tasks/documented/SrcFolderSteps/Step09_FinalSweep.md

Use exactly this content:

# STEP 9 — Final Sweep

**Status:** PENDING
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Scope:** Cross-cutting — drawer.js, index.js, and any remaining old-path references

---

## Implementation Checklist

- [ ] Read ``src/drawer.js``; confirm all imports point to new paths.
      Fix any that still reference old flat ``src/*.js`` paths.
- [ ] Read ``index.js`` at the project root; confirm all imports point to
      new paths. Fix any that still reference old flat ``src/*.js`` paths.
- [ ] Grep the entire codebase for each filename listed below. Any match
      found in an import statement is a missed update — fix it.

Old filenames to grep:
``listPanel.js``, ``listPanel.state.js``, ``listPanel.coreBridge.js``,
``listPanel.filterBar.js``, ``listPanel.booksView.js``, ``listPanel.selectionDnD.js``,
``listPanel.bookMenu.js``, ``listPanel.foldersView.js``,
``bookSourceLinks.js``, ``worldEntry.js``, ``lorebookFolders.js``,
``editorPanel.js``,
``orderHelper.js``, ``orderHelperState.js``, ``orderHelperFilters.js``,
``orderHelperRender.js``, ``orderHelperRender.actionBar.js``,
``orderHelperRender.filterPanel.js``, ``orderHelperRender.tableBody.js``,
``orderHelperRender.tableHeader.js``, ``orderHelperRender.utils.js``,
``constants.js``, ``utils.js``, ``Settings.js``, ``sortHelpers.js``, ``wiUpdateHandler.js``

---

## Fix Risk: Low 🟢

Scan-only with targeted fixes. No files are moved. Any fix is a single
import string update. If nothing is found, this step completes with no changes.

## Why It's Safe to Implement

All moves were done in Steps 01-08. This step only corrects import strings
accidentally left behind. No logic, structure, or behavior changes.

Requirements:
- Write the file using the Write tool — not Bash echo, printf, or heredoc.
"@

    & codex exec --yolo $sweepInstruction
    if ($LASTEXITCODE -ne 0) {
        throw ("codex exec failed on Step09_FinalSweep.md (exit code {0})." -f $LASTEXITCODE)
    }

    $created.Add("Step09_FinalSweep.md") | Out-Null
    $fileEnd     = Get-Date
    $fileElapsed = $fileEnd - $fileStart
    Write-Host ("Completed : {0}" -f $fileEnd)
    Write-Host ("Elapsed   : {0}" -f (Format-Elapsed $fileElapsed))
}

# ---------------------------------------------------------------------------
# Summary + commit
# ---------------------------------------------------------------------------
$batchEnd     = Get-Date
$batchElapsed = $batchEnd - $batchStart

Write-Host ""
Write-Host "=============================================================================="
Write-Host ("Files created : {0}" -f $created.Count)
Write-Host ("Files skipped : {0}" -f $skipped)
Write-Host ("Total time    : {0}" -f (Format-Elapsed $batchElapsed))
Write-Host "=============================================================================="

if ($created.Count -eq 0) {
    Write-Host "Nothing new to commit."
    exit 0
}

& git add "$outputDir/"
if ($LASTEXITCODE -ne 0) { throw "git add failed." }

& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No staged changes. Nothing to commit."
    exit 0
}

$bodyLines = ($created | ForEach-Object { "- $_" }) -join "`n"
$commitMsg = "docs(refactoring): create src folder step files for phase 1`n`nFiles created:`n$bodyLines`n"

& git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) { throw "git commit failed." }

Write-Host "Committed."
