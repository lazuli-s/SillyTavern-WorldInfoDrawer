#!/usr/bin/env pwsh
#requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$PENDING_DIR = "tasks/code-reviews/pending-implementation"

function Count-Pending {
  if (-not (Test-Path -LiteralPath $PENDING_DIR -PathType Container)) { return 0 }
  $files = Get-ChildItem -LiteralPath $PENDING_DIR -Filter *.md -File -ErrorAction SilentlyContinue
  return @($files).Count
}

function Next-File {
  if (-not (Test-Path -LiteralPath $PENDING_DIR -PathType Container)) { return "" }
  $files = Get-ChildItem -LiteralPath $PENDING_DIR -Filter *.md -File -ErrorAction SilentlyContinue |
           Sort-Object -Property Name
  if (@($files).Count -eq 0) { return "" }
  return $files[0].FullName
}

# Ensure codex exists
$codex = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codex) {
  Write-Error "ERROR: codex command not found in PATH."
  exit 1
}

# Ensure pending directory exists
if (-not (Test-Path -LiteralPath $PENDING_DIR -PathType Container)) {
  Write-Error "ERROR: Pending folder not found: $PENDING_DIR"
  exit 1
}

$PENDING = Count-Pending
if (($PENDING -as [int]) -eq 0) {
  Write-Host "pending-implementation is already empty. Nothing to do."
  exit 0
}

Write-Host ("Codex triage batch started: {0}" -f (Get-Date))
Write-Host ("Files to triage: {0}" -f $PENDING)

$RUN = 0
$TRIAGED = New-Object System.Collections.Generic.List[string]

while ($true) {
  $PENDING = Count-Pending
  if (($PENDING -as [int]) -eq 0) {
    Write-Host "pending-implementation is empty. All files triaged."
    break
  }

  $NEXT_PATH = Next-File
  if ([string]::IsNullOrEmpty($NEXT_PATH)) {
    Write-Host "pending-implementation is empty. All files triaged."
    break
  }

  $NEXT_BASE = [System.IO.Path]::GetFileName($NEXT_PATH)
  $RUN += 1

  Write-Host ("-- Run {0}: {1}" -f $RUN, $NEXT_BASE)
  Write-Host ("Started: {0}" -f (Get-Date))

  $instruction = @"
Run triage-reviews for exactly one file.

Target file:
$NEXT_PATH

Requirements:
- Follow skills/triage-reviews/SKILL.md behavior.
- Process ONLY this target file.
- Do not edit source code files.
- Do not modify vendor/SillyTavern.
- Keep output and edits ASCII-only (no emoji).
"@

  & codex exec --yolo $instruction

  $TRIAGED.Add($NEXT_BASE) | Out-Null
  Write-Host ("Completed: {0}" -f (Get-Date))
}

Write-Host ("Total files triaged: {0}" -f $RUN)

& git add tasks/code-reviews/

# If no staged changes, exit
& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "No files were staged. Nothing to commit."
  exit 0
}

$bodyLines = ($TRIAGED | ForEach-Object { "- $_" }) -join "`n"
$commitMsg = "chore(code-reviews): promote reviews after triage`n`nFiles triaged:`n$bodyLines`n"

& git commit -m $commitMsg

Write-Host "Committed."