#!/usr/bin/env pwsh
#requires -Version 7.0

[CmdletBinding()]
param(
    [string]$StepsDir = "tasks/main-tasks/documented/SrcFolderSteps"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Force UTF-8 for all console I/O -- prevents emoji/Unicode corruption on Windows
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

# Low-risk steps in fixed implementation order.
# Steps 02 (Book Browser Root) and 07 (Entry Manager Root) are Medium risk
# due to concept renames -- they are excluded and must be run manually.
$lowRiskSteps = @(
    "Step01_SharedFolder.md",
    "Step03_BrowserTabs.md",
    "Step04_BookList.md",
    "Step05_BookFolders.md",
    "Step06_EditorPanel.md",
    "Step08_BulkEditor.md",
    "Step09_FinalSweep.md"
)

function Get-StepStatus {
    param([string]$FilePath)
    $content = Get-Content -LiteralPath $FilePath -Raw -Encoding UTF8
    if ($content -match '\*\*Status:\*\*\s+IMPLEMENTED') { return "IMPLEMENTED" }
    if ($content -match '\*\*Status:\*\*\s+IN PROGRESS') { return "IN PROGRESS" }
    return "PENDING"
}

function Count-Pending {
    return @($script:lowRiskSteps | Where-Object {
        $path = "$script:StepsDir/$_"
        (Test-Path -LiteralPath $path -PathType Leaf) -and
        (Get-StepStatus -FilePath $path) -eq "PENDING"
    }).Count
}

function Next-File {
    foreach ($step in $script:lowRiskSteps) {
        $path = "$script:StepsDir/$step"
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { continue }
        $status = Get-StepStatus -FilePath $path
        if ($status -ne "IMPLEMENTED") { return $path }
    }
    return ""
}

function Format-Elapsed {
    param([TimeSpan]$Elapsed)
    $m = [int]$Elapsed.TotalMinutes
    $s = $Elapsed.Seconds
    if ($m -ge 1) { return "${m}m ${s}s" }
    return "${s}s"
}

# Ensure codex exists
$codex = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codex) {
    throw "codex command not found in PATH."
}

# Ensure steps directory exists
if (-not (Test-Path -LiteralPath $StepsDir -PathType Container)) {
    throw "Steps folder not found: $StepsDir"
}

$pending = Count-Pending
if (($pending -as [int]) -eq 0) {
    Write-Host "All low-risk steps are already implemented. Nothing to do."
    exit 0
}

Write-Host "=============================================================================="
Write-Host ("Steps to implement : {0}" -f $pending)
Write-Host ("Steps folder       : {0}" -f $StepsDir)
Write-Host "=============================================================================="

$run = 0
$implemented = New-Object System.Collections.Generic.List[string]
$batchStart = Get-Date

while ($true) {
    $pending = Count-Pending
    if (($pending -as [int]) -eq 0) {
        Write-Host ""
        Write-Host "All pending low-risk steps are implemented."
        break
    }

    $nextPath = Next-File
    if ([string]::IsNullOrEmpty($nextPath)) {
        Write-Host ""
        Write-Host "All pending low-risk steps are implemented."
        break
    }

    $nextBase = [System.IO.Path]::GetFileName($nextPath)

    # Guard: stop if a step is IN PROGRESS (interrupted previous run requires manual review)
    $currentStatus = Get-StepStatus -FilePath $nextPath
    if ($currentStatus -eq "IN PROGRESS") {
        throw ("Step $nextBase is IN PROGRESS -- a previous run was likely interrupted. " +
               "Inspect the step file and any partially-moved source files manually. " +
               "Then mark the step IMPLEMENTED or reset it to PENDING before re-running.")
    }

    $run += 1
    $fileStart = Get-Date

    Write-Host ""
    Write-Host ("-- Run {0} -- {1} {2}" -f $run, $nextBase, ("-" * 50))
    Write-Host ("Started   : {0}" -f $fileStart)

    $instruction = @"
Implement the following src folder refactoring step file:
  $nextPath

Follow Phase 2 of the workflow exactly as documented in:
  tasks/workflows/Workflow_SrcFolderRefactoring.md

Phase 2 steps to perform for this file:
1. Read the step file above in full.
2. Update its Status field to: IN PROGRESS
3. Read every source file listed in the "Files to Move" table.
4. For each file in the table, atomically:
   a. Write the file to its new path with its new name (use the Write tool).
   b. Delete the original file (use Bash rm).
   c. Update all import statements INSIDE the moved file to use the correct
      new relative paths -- use the "Import depth reference" table in the step file.
   d. Grep the entire codebase for any file that imports from the old path;
      update each reference to the new path.
5. Verify: grep for all old filenames from this step. Confirm no file still
   imports from any of those old paths. Fix any that are found.
6. Append the ## IMPLEMENTATION block to the step file using the output
   template from the workflow doc (see "Implementation output template" section).
7. Update the step file Status field to: IMPLEMENTED

Requirements:
- Implement ONLY the step file listed above. Do not process any other step file.
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
Write-Host ("Total steps implemented : {0}" -f $run)
Write-Host ("Total time              : {0}" -f (Format-Elapsed $batchElapsed))
Write-Host "=============================================================================="

& git add -A
if ($LASTEXITCODE -ne 0) {
    throw "git add failed."
}

# If no staged changes, exit
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No files were staged. Nothing to commit."
    exit 0
}

$bodyLines = ($implemented | ForEach-Object { "- $_" }) -join "`n"
$commitMsg = "refactor(src): implement low-risk src folder steps from codex batch run`n`nSteps implemented:`n$bodyLines`n"

& git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed."
}

Write-Host "Committed."
