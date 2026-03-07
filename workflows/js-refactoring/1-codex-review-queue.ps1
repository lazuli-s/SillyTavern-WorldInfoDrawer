#!/usr/bin/env pwsh
#requires -Version 7.0

[CmdletBinding()]
param(
    [string]$QueueDir = "tasks/js-refactoring"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Force UTF-8 for all console I/O -- prevents emoji/Unicode corruption on Windows
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

function Get-QueueFilePath {
    return Join-Path $QueueDir 'js-refactoring-queue.md'
}

function Get-PendingItems {
    $queueFile = Get-QueueFilePath
    if (-not (Test-Path -LiteralPath $queueFile -PathType Leaf)) { return @() }

    $lines = Get-Content -LiteralPath $queueFile
    $pending = New-Object System.Collections.Generic.List[string]
    $inPendingSection = $false

    foreach ($line in $lines) {
        if ($line -match '^##\s+Files Pending Review\s*$') {
            $inPendingSection = $true
            continue
        }

        if ($inPendingSection -and $line -match '^##\s+') {
            break
        }

        if (-not $inPendingSection) {
            continue
        }

        if ($line -match '^\s*-\s+(.+?)\s*$') {
            $item = $Matches[1].Trim()
            if (-not [string]::IsNullOrWhiteSpace($item)) {
                $pending.Add($item) | Out-Null
            }
        }
    }

    return @($pending)
}

function Count-Pending {
    return @(Get-PendingItems).Count
}

function Next-File {
    $pending = Get-PendingItems
    if (@($pending).Count -eq 0) { return "" }
    return $pending[0]
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

# Ensure queue directory exists
if (-not (Test-Path -LiteralPath $QueueDir -PathType Container)) {
    throw "Queue folder not found: $QueueDir"
}

$queueFile = Get-QueueFilePath
if (-not (Test-Path -LiteralPath $queueFile -PathType Leaf)) {
    throw "Queue file not found: $queueFile"
}

$pending = Count-Pending
if (($pending -as [int]) -eq 0) {
    Write-Host "JS refactoring queue is already empty. Nothing to do."
    exit 0
}

Write-Host "=============================================================================="
Write-Host ("Files to review : {0}" -f $pending)
Write-Host ("Queue folder    : {0}" -f $QueueDir)
Write-Host ("Queue file      : {0}" -f $queueFile)
Write-Host "=============================================================================="

$run = 0
$reviewed = New-Object System.Collections.Generic.List[string]
$batchStart = Get-Date

while ($true) {
    $pending = Count-Pending
    if (($pending -as [int]) -eq 0) {
        Write-Host ""
        Write-Host "JS refactoring queue is empty - all files reviewed."
        break
    }

    $nextPath = Next-File
    if ([string]::IsNullOrEmpty($nextPath)) {
        Write-Host ""
        Write-Host "JS refactoring queue is empty - all files reviewed."
        break
    }

    $nextBase = [System.IO.Path]::GetFileName($nextPath)
    $run += 1
    $fileStart = Get-Date

    Write-Host ""
    Write-Host ("-- Run {0} -- {1} {2}" -f $run, $nextBase, ("-" * 50))
    Write-Host ("Started   : {0}" -f $fileStart)

    $instruction = @"
Run the /js-refactoring skill for exactly one file.

Use queue mode: read the next file from tasks/js-refactoring/js-refactoring-queue.md,
review exactly one queued JS file, write the report, update the queue, and then stop.

Next queued file for this run:
$nextPath

Follow the skill instructions exactly as written in:
  skills/js-refactoring/SKILL.md

Requirements:
- Process ONLY one queued file in this Codex session.
- Do not modify source JS files; this skill writes refactoring reports only.
- Write the report under tasks/js-refactoring/ready-for-implementation/.
- Update tasks/js-refactoring/js-refactoring-queue.md to remove the reviewed file.
- Do not modify vendor/SillyTavern.
- Keep output and edits ASCII-only (no emoji).
- Do not write file content using Bash echo, printf, or heredoc -- use the Write or Edit tools only.
"@

    & codex exec --yolo $instruction
    if ($LASTEXITCODE -ne 0) {
        throw ("codex exec failed on run {0} for {1} (exit code {2})." -f $run, $nextBase, $LASTEXITCODE)
    }

    $reviewed.Add($nextBase) | Out-Null
    $fileEnd = Get-Date
    $fileElapsed = $fileEnd - $fileStart
    Write-Host ("Completed : {0}" -f $fileEnd)
    Write-Host ("Elapsed   : {0}" -f (Format-Elapsed $fileElapsed))
}

$batchEnd = Get-Date
$batchElapsed = $batchEnd - $batchStart

Write-Host ""
Write-Host "=============================================================================="
Write-Host ("Total files reviewed : {0}" -f $run)
Write-Host ("Total time           : {0}" -f (Format-Elapsed $batchElapsed))
Write-Host "=============================================================================="

& git add tasks/js-refactoring/
if ($LASTEXITCODE -ne 0) {
    throw "git add failed."
}

# If no staged changes, exit
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No files were staged. Nothing to commit."
    exit 0
}

$bodyLines = ($reviewed | ForEach-Object { "- $_" }) -join "`n"
$commitMsg = "chore(tasks): record js refactoring batch review outputs`n`nFiles reviewed:`n$bodyLines`n"

& git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed."
}

Write-Host "Committed."
