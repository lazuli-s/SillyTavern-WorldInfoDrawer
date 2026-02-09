[CmdletBinding()]
param(
    [string]$PhasesFile = "docs/planning/Refactoring_listPanel.js.md",
    [string]$PromptTemplate = "scripts/refactoring-prompt.md",
    [string[]]$OnlyPhase = @(),
    [ValidateSet("read-only", "workspace-write", "danger-full-access")]
    [string]$CodexSandbox = "workspace-write",
    [ValidateSet("untrusted", "on-failure", "on-request", "never")]
    [string]$CodexApproval = "never",
    [switch]$DangerouslyBypassApprovalsAndSandbox,
    [switch]$SkipSubmoduleInit,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarnLine {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-ErrLine {
    param([string]$Message)
    Write-Host "[ERR ] $Message" -ForegroundColor Red
}

function Normalize-PhaseId {
    param([string]$Value)
    if ($Value -match '^P\d{2}$') {
        return $Value
    }
    if ($Value -match '^\d+$') {
        return "P{0:D2}" -f [int]$Value
    }
    return $Value.ToUpperInvariant()
}

function Invoke-Step {
    param(
        [string]$Description,
        [scriptblock]$Command
    )
    Write-Info $Description
    & $Command
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
    throw "codex.cmd was not found in PATH."
}

if (-not (Test-Path -Path $PhasesFile -PathType Leaf)) {
    throw "Phases file not found: $PhasesFile"
}
if (-not (Test-Path -Path $PromptTemplate -PathType Leaf)) {
    throw "Prompt template not found: $PromptTemplate"
}

$gitStatus = Get-TrimmedCommandOutput { git status --porcelain }
if ($gitStatus) {
    throw "Working tree is not clean. Commit/stash changes before running this script."
}

if (-not $SkipSubmoduleInit) {
    Invoke-Step -Description "Initializing submodules" -Command {
        & git submodule update --init --recursive
        if ($LASTEXITCODE -ne 0) {
            throw "git submodule update failed."
        }
    }
}

$phasesText = Get-Content -Raw -Path $PhasesFile
$matches = [regex]::Matches($phasesText, '(?m)^### Phase (\d+):\s*(.+)$')
if ($matches.Count -eq 0) {
    throw "No phases found. Expected headers like: ### Phase 1: <title>"
}

$phases = foreach ($m in $matches) {
    $phaseNumber = [int]$m.Groups[1].Value
    [pscustomobject]@{
        Id = "P{0:D2}" -f $phaseNumber
        Number = $phaseNumber
        Title = $m.Groups[2].Value.Trim()
    }
}

if ($OnlyPhase.Count -gt 0) {
    $wanted = $OnlyPhase | ForEach-Object { Normalize-PhaseId $_ }
    $phases = $phases | Where-Object { $wanted -contains $_.Id }
    if (-not $phases) {
        throw "No phases matched -OnlyPhase values: $($OnlyPhase -join ', ')"
    }
}

$template = Get-Content -Raw -Path $PromptTemplate
$logDir = Join-Path $repoRoot ".codex-phase-logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$results = New-Object System.Collections.Generic.List[object]

foreach ($phase in $phases) {
    $id = $phase.Id
    $number = $phase.Number
    $title = $phase.Title
    Write-Host ""
    Write-Host "=== ${id}: $title ===" -ForegroundColor Magenta

    $prompt = $template
    $prompt = $prompt.Replace("{{PHASE_ID}}", $id)
    $prompt = $prompt.Replace("{{PHASE_NUMBER}}", "$number")
    $prompt = $prompt.Replace("{{PHASE_TITLE}}", $title)
    $prompt = $prompt.Replace("{{STEP_ID}}", $id)
    $prompt = $prompt.Replace("{{STEP_TITLE}}", $title)
    $prompt = $prompt.Replace("{{FINDING_ID}}", $id)
    $prompt = $prompt.Replace("{{FINDING_TITLE}}", $title)

    $logPath = Join-Path $logDir ("{0}-{1:yyyyMMdd-HHmmss}.log" -f $id, (Get-Date))

    if ($DryRun) {
        Write-Info "Dry run: would execute codex for $id"
        $results.Add([pscustomobject]@{
            Id = $id
            Title = $title
            Status = "DRY_RUN"
            Commit = ""
            Note = "No commands executed."
        })
        continue
    }

    $codexArgs = @()
    if ($DangerouslyBypassApprovalsAndSandbox) {
        $codexArgs += "--dangerously-bypass-approvals-and-sandbox"
    }
    else {
        $codexArgs += @("--sandbox", $CodexSandbox, "--ask-for-approval", $CodexApproval)
    }
    $codexArgs += @("exec", "-")

    $previousEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $prompt | & $codexCmd.Source @codexArgs 2>&1 | Tee-Object -FilePath $logPath
        $codexExit = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousEap
    }

    if ($codexExit -ne 0) {
        Write-ErrLine "codex exec failed for $id (exit $codexExit)"

        $dirty = Get-TrimmedCommandOutput { git status --porcelain }
        $stashNote = ""
        if ($dirty) {
            $stashMessage = "codex-phase-failed-$id"
            & git stash push -u -m $stashMessage | Out-Null
            $stashNote = "Changes stashed as '$stashMessage'."
            Write-WarnLine $stashNote
        }

        $results.Add([pscustomobject]@{
            Id = $id
            Title = $title
            Status = "FAILED"
            Commit = ""
            Note = "codex exit $codexExit. $stashNote Log: $logPath"
        })
        continue
    }

    $postRunStatus = Get-TrimmedCommandOutput { git status --porcelain }
    if (-not $postRunStatus) {
        Write-WarnLine "No file changes detected for $id; skipping commit."
        $results.Add([pscustomobject]@{
            Id = $id
            Title = $title
            Status = "NO_CHANGES"
            Commit = ""
            Note = "No changes detected. Log: $logPath"
        })
        continue
    }

    & git add -A
    if ($LASTEXITCODE -ne 0) {
        Write-ErrLine "git add failed for $id"
        $results.Add([pscustomobject]@{
            Id = $id
            Title = $title
            Status = "FAILED"
            Commit = ""
            Note = "git add failed. Log: $logPath"
        })
        continue
    }

    $titleForCommit = $title
    if ($titleForCommit.Length -gt 60) {
        $titleForCommit = $titleForCommit.Substring(0, 57) + "..."
    }
    $commitMsg = "feat(codex): phase $id $titleForCommit"

    & git commit -m $commitMsg | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-ErrLine "git commit failed for $id"
        $results.Add([pscustomobject]@{
            Id = $id
            Title = $title
            Status = "FAILED"
            Commit = ""
            Note = "git commit failed. Log: $logPath"
        })
        continue
    }

    $commitHash = Get-TrimmedCommandOutput { git rev-parse --short HEAD }
    Write-Info "Committed $id as $commitHash"
    $results.Add([pscustomobject]@{
        Id = $id
        Title = $title
        Status = "COMMITTED"
        Commit = $commitHash
        Note = "Log: $logPath"
    })
}

Write-Host ""
Write-Host "=== Run Summary ===" -ForegroundColor Green
$results | ForEach-Object {
    $commitPart = if ($_.Commit) { " (commit $($_.Commit))" } else { "" }
    Write-Host ("{0} {1}: {2}{3}" -f $_.Status.PadRight(10), $_.Id, $_.Title, $commitPart)
}

$failed = $results | Where-Object { $_.Status -eq "FAILED" }
$noChanges = $results | Where-Object { $_.Status -eq "NO_CHANGES" }

if ($failed.Count -gt 0 -or $noChanges.Count -gt 0) {
    Write-Host ""
    Write-WarnLine "Failures or skipped commits detected:"
    foreach ($r in ($failed + $noChanges)) {
        Write-Host ("- {0} {1}: {2}" -f $r.Status, $r.Id, $r.Note)
    }
    exit 1
}

Write-Host ""
Write-Info "All phases in scope completed successfully."
exit 0
