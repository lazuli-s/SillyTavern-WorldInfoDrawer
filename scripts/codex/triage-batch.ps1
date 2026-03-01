#!/usr/bin/env pwsh
#requires -Version 7.0

[CmdletBinding()]
param(
    [string]$PendingDir = "tasks/code-reviews/pending-implementation"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Count-Pending {
    if (-not (Test-Path -LiteralPath $PendingDir -PathType Container)) { return 0 }
    $files = Get-ChildItem -LiteralPath $PendingDir -Filter *.md -File -ErrorAction SilentlyContinue
    return @($files).Count
}

function Next-File {
    if (-not (Test-Path -LiteralPath $PendingDir -PathType Container)) { return "" }
    $files = Get-ChildItem -LiteralPath $PendingDir -Filter *.md -File -ErrorAction SilentlyContinue |
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

# Ensure codex exists
$codex = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codex) {
    throw "codex command not found in PATH."
}

# Ensure pending directory exists
if (-not (Test-Path -LiteralPath $PendingDir -PathType Container)) {
    throw "Pending folder not found: $PendingDir"
}

$pending = Count-Pending
if (($pending -as [int]) -eq 0) {
    Write-Host "Pending folder is already empty. Nothing to do."
    exit 0
}

Write-Host "=============================================================================="
Write-Host ("Files to triage : {0}" -f $pending)
Write-Host ("Pending folder  : {0}" -f $PendingDir)
Write-Host "=============================================================================="

$run = 0
$triaged = New-Object System.Collections.Generic.List[string]
$batchStart = Get-Date

while ($true) {
    $pending = Count-Pending
    if (($pending -as [int]) -eq 0) {
        Write-Host ""
        Write-Host "Pending folder is empty - all files triaged."
        break
    }

    $nextPath = Next-File
    if ([string]::IsNullOrEmpty($nextPath)) {
        Write-Host ""
        Write-Host "Pending folder is empty - all files triaged."
        break
    }

    $nextBase = [System.IO.Path]::GetFileName($nextPath)
    $run += 1
    $fileStart = Get-Date

    Write-Host ""
    Write-Host ("-- Run {0} -- {1} {2}" -f $run, $nextBase, ("-" * 50))
    Write-Host ("Started   : {0}" -f $fileStart)

    $instruction = @"
Run the /triage-reviews skill for exactly one file.

Target file:
$nextPath

Follow the skill instructions exactly as written in:
  skills/triage-reviews/SKILL.md

Requirements:
- Process ONLY this target file.
- Do not edit source code files.
- Do not modify vendor/SillyTavern.
- Keep output and edits ASCII-only (no emoji).
"@

    & codex exec --yolo $instruction
    if ($LASTEXITCODE -ne 0) {
        throw ("codex exec failed on run {0} for {1} (exit code {2})." -f $run, $nextBase, $LASTEXITCODE)
    }

    $triaged.Add($nextBase) | Out-Null
    $fileEnd = Get-Date
    $fileElapsed = $fileEnd - $fileStart
    Write-Host ("Completed : {0}" -f $fileEnd)
    Write-Host ("Elapsed   : {0}" -f (Format-Elapsed $fileElapsed))
}

$batchEnd = Get-Date
$batchElapsed = $batchEnd - $batchStart

Write-Host ""
Write-Host "=============================================================================="
Write-Host ("Total files triaged : {0}" -f $run)
Write-Host ("Total time          : {0}" -f (Format-Elapsed $batchElapsed))
Write-Host "=============================================================================="

& git add tasks/code-reviews/
if ($LASTEXITCODE -ne 0) {
    throw "git add failed."
}

# If no staged changes, exit
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No files were staged. Nothing to commit."
    exit 0
}

$bodyLines = ($triaged | ForEach-Object { "- $_" }) -join "`n"
$commitMsg = "chore(code-reviews): promote reviews after triage`n`nFiles triaged:`n$bodyLines`n"

& git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed."
}

Write-Host "Committed."
