[CmdletBinding()]
param(
    [string]$QueueFile = "tasks/code-reviews/code-review-queue.md",
    [string]$LogDir = "scripts/codex-headless/logs"
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

function Get-PendingQueueItems {
    param([string]$Path)
    if (-not (Test-Path -Path $Path -PathType Leaf)) {
        return @()
    }

    $lines = Get-Content -Path $Path
    $items = @()

    foreach ($line in $lines) {
        if ($line -match '^- `(.+)`$') {
            $items += $Matches[1]
        }
    }

    return $items
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

if (-not (Test-Path -Path $QueueFile -PathType Leaf)) {
    throw "Queue file not found: $QueueFile"
}

if (-not (Test-Path -Path $LogDir -PathType Container)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = Join-Path $LogDir "code-review-batch-$timestamp.log"
New-Item -ItemType File -Path $logFile -Force | Out-Null

$pendingItems = Get-PendingQueueItems -Path $QueueFile
if ($pendingItems.Count -eq 0) {
    Write-Host "Queue is already empty. Nothing to do."
    exit 0
}

Write-LogLine -Message "==============================================================================" -LogPath $logFile
Write-LogLine -Message "Codex code-review batch started: $(Get-Date)" -LogPath $logFile
Write-LogLine -Message "Files in queue: $($pendingItems.Count)" -LogPath $logFile
Write-LogLine -Message "Log file: $logFile" -LogPath $logFile
Write-LogLine -Message "==============================================================================" -LogPath $logFile

$run = 0
$reviewed = New-Object System.Collections.Generic.List[string]

while ($true) {
    $pendingItems = Get-PendingQueueItems -Path $QueueFile
    if ($pendingItems.Count -eq 0) {
        Write-LogLine -Message "" -LogPath $logFile
        Write-LogLine -Message "Queue is empty - all reviews complete." -LogPath $logFile
        break
    }

    $next = $pendingItems[0]
    $run += 1

    Write-LogLine -Message "" -LogPath $logFile
    Write-LogLine -Message "-- Run $run -- $next ----------------------------------------------" -LogPath $logFile
    Write-LogLine -Message "Started: $(Get-Date)" -LogPath $logFile

    $prompt = @"
Run the /code-review-first-review skill now.

Follow the skill instructions exactly as written in:
  skills/code-review-first-review/SKILL.md

Pick the FIRST file listed under '## Files Pending Review' in:
  tasks/code-reviews/code-review-queue.md

Complete the full first-pass review for that one file only.
Write the findings report, remove the file from the queue, and update the tracker.

Hard constraints - never violate these:
- Do NOT edit any source files. This is a READ-ONLY review.
- Do NOT modify anything under vendor/SillyTavern/
"@

    $codexArgs = @("exec", "--sandbox", "workspace-write", "--full-auto", "-")
    $prompt | & $codexCmd.Source @codexArgs 2>&1 | Tee-Object -FilePath $logFile -Append | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "codex exec failed on run $run for $next (exit $LASTEXITCODE). See log: $logFile"
    }

    $reviewed.Add($next) | Out-Null
    Write-LogLine -Message "Completed: $(Get-Date)" -LogPath $logFile
}

Write-LogLine -Message "" -LogPath $logFile
Write-LogLine -Message "Total reviews completed: $run" -LogPath $logFile

& git add tasks/code-reviews/
if ($LASTEXITCODE -ne 0) {
    throw "git add failed."
}

& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-LogLine -Message "No review files were staged. Nothing to commit." -LogPath $logFile
    exit 0
}

$body = ($reviewed | ForEach-Object { "- $_" }) -join "`n"
$commitMessage = "code-review(first-review): add review reports from codex batch run`n`nFiles reviewed:`n$body"

& git commit -m $commitMessage | Out-Host
if ($LASTEXITCODE -ne 0) {
    throw "git commit failed."
}

Write-LogLine -Message "" -LogPath $logFile
Write-LogLine -Message "Committed. Log saved to: $logFile" -LogPath $logFile
