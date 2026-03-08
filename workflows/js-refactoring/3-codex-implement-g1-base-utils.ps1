#!/usr/bin/env pwsh
#requires -Version 7.0

[CmdletBinding()]
param(
    [string]$GroupDir = "tasks/js-refactoring/ready-for-implementation/group-1-base-utils"
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
  skills/js-refactoring-implement/SKILL.md

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
$commitMsg = "refactor(utils): apply js refactoring group 1 (base-utils)`n`nFiles refactored:`n$bodyLines`n"

& git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) { throw "git commit failed." }

Write-Host "Committed."
