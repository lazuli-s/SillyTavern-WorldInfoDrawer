[CmdletBinding()]
param(
  [int]$MaxFiles = 15,
  [switch]$DryRun,
  [string]$ClineProfile = "eh-gpt-5.2",
  [string]$ClineConfigDir
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$tracker = Join-Path $repoRoot "tasks\code-reviews\REVIEW_TRACKER.md"
$promptTemplate = Join-Path $repoRoot "scripts\code-reviews\step-1-review-files.md"

function Resolve-ClineConfigPath([string]$overridePath, [string]$profileName) {
  if ($overridePath) {
    if (-not (Test-Path -Path $overridePath -PathType Container)) {
      throw "Provided Cline config directory does not exist: $overridePath"
    }
    return (Resolve-Path $overridePath).Path
  }

  $candidates = @(
    (Join-Path $env:USERPROFILE ".cline\custom-configs\$profileName")
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -Path $candidate -PathType Container) {
      return (Resolve-Path $candidate).Path
    }
  }

  throw "Could not find Cline config directory for profile '$profileName'. Checked: $($candidates -join ', ')"
}

function Get-FirstPendingFile([string]$trackerPath) {
  $pending = Get-PendingFiles $trackerPath
  if ($pending.Count -eq 0) { return $null }
  return $pending[0]
}

function Get-PendingFiles([string]$trackerPath) {
  $t = Get-Content -Raw $trackerPath

  $m = [regex]::Match($t, '(?ms)^## Files Pending Review\s*(?<body>.*?)(^\#\#\s|\z)')
  if (-not $m.Success) { throw "Could not find '## Files Pending Review' section." }

  $body = $m.Groups["body"].Value
  $matches = [regex]::Matches($body, '(?m)^\s*-\s*`(?<path>[^`]+)`\s*$')
  if ($matches.Count -eq 0) { return @() }

  return @($matches | ForEach-Object { $_.Groups["path"].Value })
}

$clineConfigPath = Resolve-ClineConfigPath $ClineConfigDir $ClineProfile
Write-Host "Using Cline config: $clineConfigPath"

if ($DryRun) {
  $pending = @(Get-PendingFiles $tracker | Select-Object -First $MaxFiles)
  if ($pending.Count -eq 0) {
    Write-Host "No pending files remain. Done."
    exit 0
  }

  foreach ($target in $pending) {
    $base = [System.IO.Path]::GetFileName($target)
    $outFile = "tasks/code-reviews/CodeReview_$base.md"
    Write-Host "Reviewing: $target -> $outFile"
  }

  Write-Host "Dry run complete. No Cline tasks were dispatched."
  exit 0
}

$dispatched = @{}

for ($i=0; $i -lt $MaxFiles; $i++) {
  $target = Get-FirstPendingFile $tracker
  if (-not $target) {
    Write-Host "No pending files remain. Done."
    exit 0
  }

  if ($dispatched.ContainsKey($target)) {
    throw "Loop guard: '$target' came up again -- Cline likely failed to update the tracker. Aborting."
  }
  $dispatched[$target] = $true

  $base = [System.IO.Path]::GetFileName($target)
  $outFile = "tasks/code-reviews/CodeReview_$base.md"

  Write-Host "Reviewing: $target -> $outFile"

  $template = Get-Content -Raw $promptTemplate
  $prompt = $template.Replace("{{TARGET_FILE}}", $target).Replace("{{BASENAME}}", $base)

  # Requirement: new Cline process per iteration.
  # --thinking is a boolean flag (no token count); prompt is the positional final argument.
  cline -y --config $clineConfigPath --thinking "$prompt"

  if ($LASTEXITCODE -ne 0) { throw "Cline run failed for $target" }
}
