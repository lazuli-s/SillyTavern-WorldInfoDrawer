[CmdletBinding()]
param(
    [string]$PendingDir = "tasks/code-reviews/pending-implementation",
    [string]$LogDir = "scripts/codex/logs"
)

$ErrorActionPreference = "Stop"

function Write-LogLine {
    param(
        [string]$Message,
        [string]$LogPath
    )
    Write-Host $Message
    Add-Content -Path $LogPath -Value $Message
}

function Get-PendingFiles {
    param([string]$Path)
    if (-not (Test-Path -Path $Path -PathType Container)) {
        return @()
    }
    return @(Get-ChildItem -Path $Path -Filter "*.md" -File | Sort-Object Name)
}

function Get-TrimmedCommandOutput {
    param([scriptblock]$Command)
    $raw = & $Command
    if ($null -eq $raw) {
        return ""
    }
    $text = ($raw | Out-String)
    if ($null -eq $text) {
        return ""
    }
    return $text.Trim()
}

$repoRoot = Get-TrimmedCommandOutput { git rev-parse --show-toplevel }
if (-not $repoRoot) {
    throw "Could not determine git repository root."
}
Set-Location $repoRoot

$codexCmd = Get-Command codex.cmd -ErrorAction SilentlyContinue
if (-not $codexCmd) {
    $codexCmd = Get-Command codex -ErrorAction SilentlyContinue
}
if (-not $codexCmd) {
    throw "codex was not found in PATH."
}

if (-not (Test-Path -Path $PendingDir -PathType Container)) {
    throw "Pending folder not found: $PendingDir"
}

if (-not (Test-Path -Path $LogDir -PathType Container)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = Join-Path $LogDir "triage-batch-$timestamp.log"
New-Item -ItemType File -Path $logFile -Force | Out-Null

$pendingFiles = Get-PendingFiles -Path $PendingDir
if ($pendingFiles.Count -eq 0) {
    Write-Host "pending-implementation/ is already empty. Nothing to do."
    exit 0
}

Write-LogLine -Message "==============================================================================" -LogPath $logFile
Write-LogLine -Message "Codex triage batch started: $(Get-Date)" -LogPath $logFile
Write-LogLine -Message "Files to triage: $($pendingFiles.Count)" -LogPath $logFile
Write-LogLine -Message "Log file: $logFile" -LogPath $logFile
Write-LogLine -Message "==============================================================================" -LogPath $logFile

$run = 0
$triaged = New-Object System.Collections.Generic.List[string]

while ($true) {
    $pendingFiles = Get-PendingFiles -Path $PendingDir
    if ($pendingFiles.Count -eq 0) {
        Write-LogLine -Message "" -LogPath $logFile
        Write-LogLine -Message "pending-implementation/ is empty - all files triaged." -LogPath $logFile
        break
    }

    $next = $pendingFiles[0].Name
    $run += 1

    Write-LogLine -Message "" -LogPath $logFile
    Write-LogLine -Message "-- Run $run -- $next ----------------------------------------------" -LogPath $logFile
    Write-LogLine -Message "Started: $(Get-Date)" -LogPath $logFile

    $prompt = @"
Run the /triage-reviews skill now.

Follow the skill instructions exactly as written in:
  skills/triage-reviews/SKILL.md

Pick the FIRST file in tasks/code-reviews/pending-implementation/ and triage it.
Process that one file only.

Hard constraints - never violate these:
- Do NOT edit any source files. This is a triage operation only.
- Do NOT modify anything under vendor/SillyTavern/
"@

    $codexArgs = @("exec", "--sandbox", "workspace-write", "--full-auto", "-")
    $prompt | & $codexCmd.Source @codexArgs 2>&1 | Tee-Object -FilePath $logFile -Append | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "codex exec failed on run $run for $next (exit $LASTEXITCODE). See log: $logFile"
    }

    $triaged.Add($next) | Out-Null
    Write-LogLine -Message "Completed: $(Get-Date)" -LogPath $logFile
}

Write-LogLine -Message "" -LogPath $logFile
Write-LogLine -Message "Total files triaged: $run" -LogPath $logFile

& git add tasks/code-reviews/
if ($LASTEXITCODE -ne 0) {
    throw "git add failed."
}

& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-LogLine -Message "No files were staged. Nothing to commit." -LogPath $logFile
    exit 0
}

$body = ($triaged | ForEach-Object { "- $_" }) -join "`n"
$commitMessage = "chore(code-reviews): promote reviews after triage`n`nFiles triaged:`n$body"

& git commit -m $commitMessage | Out-Host
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed."
}

Write-LogLine -Message "" -LogPath $logFile
Write-LogLine -Message "Committed. Log saved to: $logFile" -LogPath $logFile
