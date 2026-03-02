#!/usr/bin/env pwsh
#requires -Version 7.0

[CmdletBinding()]
param(
    [string]$InputDir = "src/..."   # <<< CUSTOMIZE: default folder path (e.g. "src/modules")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Force UTF-8 for all console I/O -- prevents emoji/Unicode corruption on Windows
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

function Format-Elapsed {
    param([TimeSpan]$Elapsed)
    $m = [int]$Elapsed.TotalMinutes
    $s = $Elapsed.Seconds
    if ($m -ge 1) { return "${m}m ${s}s" }
    return "${s}s"
}

# Ensure cline exists
$clineCmd = Get-Command cline -ErrorAction SilentlyContinue
if (-not $clineCmd) {
    throw "cline command not found in PATH."
}

# Ensure input directory exists
if (-not (Test-Path -LiteralPath $InputDir -PathType Container)) {
    throw "Input folder not found: $InputDir"
}

# Branch safety check -- required for Medium/High risk scripts
$branch = & git branch --show-current
if ($branch -eq 'main' -or $branch -eq 'master') {
    Write-Warning "You are on '$branch'. This script will edit files."
    Write-Warning "Recommended: git checkout -b task/your-branch"
    Read-Host "Press Enter to continue, or Ctrl+C to abort"  # <<< CUSTOMIZE: remove for Low-risk scripts
}

$files = Get-ChildItem -LiteralPath $InputDir -Filter *.js -File -ErrorAction SilentlyContinue |  # <<< CUSTOMIZE: filter (e.g. *.js, *.ts, *.md)
         Sort-Object -Property Name

if (@($files).Count -eq 0) {
    Write-Host "No files found in: $InputDir"  # <<< CUSTOMIZE: message if desired
    exit 0
}

Write-Host "=============================================================================="
Write-Host ("Files to process : {0}" -f @($files).Count)  # <<< CUSTOMIZE: label (e.g. "Files to review")
Write-Host ("Input folder     : {0}" -f $InputDir)
Write-Host "=============================================================================="

$run = 0
$processed = New-Object System.Collections.Generic.List[string]  # <<< CUSTOMIZE: variable name (e.g. $reviewed, $fixed)
$batchStart = Get-Date

foreach ($file in $files) {
    $run += 1
    $fileStart = Get-Date

    Write-Host ""
    Write-Host ("-- Run {0} -- {1} {2}" -f $run, $file.Name, ("-" * 50))
    Write-Host ("Started   : {0}" -f $fileStart)

    $prompt = @"
<TASK DESCRIPTION HERE>    # <<< CUSTOMIZE: what Cline should do with each file

Target file:
$($file.FullName)

Requirements:
- Do not modify vendor/SillyTavern.
- Do not write file content using Bash echo, printf, or heredoc -- use the Write or Edit tools only.
# <<< CUSTOMIZE: add any task-specific constraints here
"@

    & cline -y --timeout 120 $prompt   # <<< CUSTOMIZE: timeout (120s per file is a safe default)
    if ($LASTEXITCODE -ne 0) {
        throw ("cline failed on run {0} for {1} (exit code {2})." -f $run, $file.Name, $LASTEXITCODE)
    }

    $processed.Add($file.Name) | Out-Null  # <<< CUSTOMIZE: variable name to match above
    $fileEnd = Get-Date
    $fileElapsed = $fileEnd - $fileStart
    Write-Host ("Completed : {0}" -f $fileEnd)
    Write-Host ("Elapsed   : {0}" -f (Format-Elapsed $fileElapsed))
}

$batchEnd = Get-Date
$batchElapsed = $batchEnd - $batchStart

Write-Host ""
Write-Host "=============================================================================="
Write-Host ("Total processed : {0}" -f $processed.Count)  # <<< CUSTOMIZE: label
Write-Host ("Total time      : {0}" -f (Format-Elapsed $batchElapsed))
Write-Host "=============================================================================="
Write-Host ""
Write-Host "Review all changes with: git diff"
