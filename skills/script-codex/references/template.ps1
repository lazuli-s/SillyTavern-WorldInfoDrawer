#!/usr/bin/env pwsh
#requires -Version 7.0

[CmdletBinding()]
param(
    [string]$InputDir = "tasks/..."   # <<< CUSTOMIZE: default folder path (e.g. "tasks/code-reviews/pending-implementation")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Force UTF-8 for all console I/O -- prevents emoji/Unicode corruption on Windows
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

function Count-Pending {
    if (-not (Test-Path -LiteralPath $InputDir -PathType Container)) { return 0 }
    $files = Get-ChildItem -LiteralPath $InputDir -Filter *.md -File -ErrorAction SilentlyContinue
    return @($files).Count
}

function Next-File {
    if (-not (Test-Path -LiteralPath $InputDir -PathType Container)) { return "" }
    $files = Get-ChildItem -LiteralPath $InputDir -Filter *.md -File -ErrorAction SilentlyContinue |
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

# Ensure input directory exists
if (-not (Test-Path -LiteralPath $InputDir -PathType Container)) {
    throw "Input folder not found: $InputDir"
}

$pending = Count-Pending
if (($pending -as [int]) -eq 0) {
    Write-Host "Input folder is already empty. Nothing to do."  # <<< CUSTOMIZE: message if desired
    exit 0
}

Write-Host "=============================================================================="
Write-Host ("Files to process : {0}" -f $pending)   # <<< CUSTOMIZE: label (e.g. "Files to triage")
Write-Host ("Input folder     : {0}" -f $InputDir)  # <<< CUSTOMIZE: label (e.g. "Pending folder")
Write-Host "=============================================================================="

$run = 0
$processed = New-Object System.Collections.Generic.List[string]  # <<< CUSTOMIZE: variable name (e.g. $triaged, $implemented)
$batchStart = Get-Date

while ($true) {
    $pending = Count-Pending
    if (($pending -as [int]) -eq 0) {
        Write-Host ""
        Write-Host "Input folder is empty - all files processed."  # <<< CUSTOMIZE: message
        break
    }

    $nextPath = Next-File
    if ([string]::IsNullOrEmpty($nextPath)) {
        Write-Host ""
        Write-Host "Input folder is empty - all files processed."  # <<< CUSTOMIZE: message
        break
    }

    $nextBase = [System.IO.Path]::GetFileName($nextPath)
    $run += 1
    $fileStart = Get-Date

    Write-Host ""
    Write-Host ("-- Run {0} -- {1} {2}" -f $run, $nextBase, ("-" * 50))
    Write-Host ("Started   : {0}" -f $fileStart)

    $instruction = @"
Run the /<SKILL_NAME> skill for exactly one file.    # <<< CUSTOMIZE: skill name

Target file:
$nextPath

Follow the skill instructions exactly as written in:
  skills/<SKILL_NAME>/SKILL.md                       # <<< CUSTOMIZE: SKILL.md path

# <<< CUSTOMIZE: add a "Use direct mode" line if the skill supports it and you want to prevent auto-selection
# Example: "Use direct mode: process ONLY the target file listed above. Do not auto-select a different file."

Requirements:
- Do not modify vendor/SillyTavern.
- Do not write file content using Bash echo, printf, or heredoc -- use the Write or Edit tools only.
# <<< CUSTOMIZE: add any skill-specific constraints here (e.g. "Do not edit source code files.")
"@

    & codex exec --yolo $instruction   # <<< CUSTOMIZE: flags if needed (see SKILL.md section 4)
    if ($LASTEXITCODE -ne 0) {
        throw ("codex exec failed on run {0} for {1} (exit code {2})." -f $run, $nextBase, $LASTEXITCODE)
    }

    $processed.Add($nextBase) | Out-Null  # <<< CUSTOMIZE: variable name to match above
    $fileEnd = Get-Date
    $fileElapsed = $fileEnd - $fileStart
    Write-Host ("Completed : {0}" -f $fileEnd)
    Write-Host ("Elapsed   : {0}" -f (Format-Elapsed $fileElapsed))
}

$batchEnd = Get-Date
$batchElapsed = $batchEnd - $batchStart

Write-Host ""
Write-Host "=============================================================================="
Write-Host ("Total files processed : {0}" -f $run)   # <<< CUSTOMIZE: label
Write-Host ("Total time            : {0}" -f (Format-Elapsed $batchElapsed))
Write-Host "=============================================================================="

& git add tasks/code-reviews/   # <<< CUSTOMIZE: scope (use -A if source files are also edited)
if ($LASTEXITCODE -ne 0) {
    throw "git add failed."
}

# If no staged changes, exit
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No files were staged. Nothing to commit."
    exit 0
}

$bodyLines = ($processed | ForEach-Object { "- $_" }) -join "`n"   # <<< CUSTOMIZE: variable name
$commitMsg = "<TYPE>(<SCOPE>): <description>`n`nFiles processed:`n$bodyLines`n"  # <<< CUSTOMIZE: commit message

& git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed."
}

Write-Host "Committed."
