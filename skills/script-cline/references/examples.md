# Script-Cline — PowerShell Script Examples

Complete, ready-to-run PowerShell scripts for each use case. Customize the `$prompt` or file filter sections as needed.

---

## 1. Code Review

**Task:** Pipe your current uncommitted changes into Cline for a code review.
**Risk:** Low — Cline reads only. No files are modified.
**Guardrails:** None required.

```powershell
#!/usr/bin/env pwsh
#requires -Version 7.0
# ──────────────────────────────────────────────────────────────────
# 1-cline-review-diff.ps1
# Task:   Review uncommitted changes with Cline
# Risk:   LOW — Cline reads only. No files are modified.
# ──────────────────────────────────────────────────────────────────

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Force UTF-8 for all console I/O -- prevents emoji/Unicode corruption on Windows
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

$diff = & git diff HEAD

if ([string]::IsNullOrEmpty($diff)) {
    Write-Host "No uncommitted changes found."
    Write-Host "To review the last commit instead, use: git diff HEAD~1"
    exit 0
}

$prompt = @"
Review these code changes for:
- Logic errors and edge cases
- Security issues (XSS, injection, prototype pollution)
- Performance concerns
- Unused variables or dead code
- Browser extension conventions (no frameworks, no build step, no backend)

Provide a concise, actionable summary of findings. Group issues by severity.
"@

$diff | & cline -y $prompt
```

**Variant — review the last commit (already pushed):**

```powershell
& git diff HEAD~1 | & cline -y "Review this commit for bugs and issues. Summarize findings."
```

**Variant — review only staged changes before committing:**

```powershell
& git diff --cached | & cline -y "Review these staged changes before I commit them."
```

---

## 2. Fix ESLint Errors

**Task:** Run Cline autonomously to find and fix all ESLint errors in `src/`.
**Risk:** Medium — Cline edits source files.
**Guardrails (suggested):**

- Run on a feature branch: `git checkout -b fix/lint-errors`
- Review changes after: `git diff`

```powershell
#!/usr/bin/env pwsh
#requires -Version 7.0
# ──────────────────────────────────────────────────────────────────
# 2-cline-fix-lint.ps1
# Task:   Auto-fix ESLint errors in src/ with Cline
# Risk:   MEDIUM — Cline edits source files directly.
# Guardrail: Run on a feature branch before executing.
#   git checkout -b fix/lint-errors
# ──────────────────────────────────────────────────────────────────

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Force UTF-8 for all console I/O -- prevents emoji/Unicode corruption on Windows
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$OutputEncoding           = [System.Text.Encoding]::UTF8

# Warn if on a protected branch
$branch = & git branch --show-current
if ($branch -eq 'main' -or $branch -eq 'master') {
    Write-Warning "You are on '$branch'. Cline will edit files."
    Write-Warning "Recommended: git checkout -b fix/lint-errors"
    Read-Host "Press Enter to continue anyway, or Ctrl+C to abort"
}

$prompt = @"
Fix all ESLint errors found in the src/ directory.

Rules:
- Fix lint errors only — do not refactor, add features, or change behavior
- Preserve all existing comments and logic
- Do not add new imports or dependencies
- Keep changes as minimal and targeted as possible
"@

& cline -y --timeout 300 $prompt
if ($LASTEXITCODE -ne 0) {
    throw "cline exited with code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Done. Review changes with: git diff"
```

**Variant — fix failing tests:**

```powershell
& cline -y --timeout 600 "Run the test suite and fix any failing tests. Do not change passing tests."
```

---

## 3. Batch File Processing

**Task:** Apply a repeated instruction to multiple `.js` files in a folder, one at a time.
**Risk:** High — Cline edits every file in the folder.
**Guardrails (strongly suggested):**

- Run on a feature branch: `git checkout -b refactor/batch-task`
- Restrict what Cline can do: `$env:CLINE_COMMAND_PERMISSIONS` (see below)
- Set a timeout per file with `--timeout`

```powershell
#!/usr/bin/env pwsh
#requires -Version 7.0
# ──────────────────────────────────────────────────────────────────
# 3-cline-batch-files.ps1
# Task:   Apply a repeated Cline task to each file in a folder
# Risk:   HIGH — Cline edits every file in the folder.
# Guardrail: Run on a feature branch before executing.
#   git checkout -b refactor/your-task
# ──────────────────────────────────────────────────────────────────

[CmdletBinding()]
param(
    [string]$InputDir = "src"   # Default folder to process
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

# Optional: restrict Cline to safe commands only (no shell execution)
# Remove or adjust the allow list as needed.
# $env:CLINE_COMMAND_PERMISSIONS = '{"allow": ["git *"], "deny": ["rm *", "sudo *"]}'

# Ensure cline exists
$clineCmd = Get-Command cline -ErrorAction SilentlyContinue
if (-not $clineCmd) { throw "cline command not found in PATH." }

# Ensure input folder exists
if (-not (Test-Path -LiteralPath $InputDir -PathType Container)) {
    throw "Input folder not found: $InputDir"
}

# Warn if on a protected branch
$branch = & git branch --show-current
if ($branch -eq 'main' -or $branch -eq 'master') {
    Write-Warning "You are on '$branch'. This script will edit multiple files."
    Write-Warning "Strongly recommended: git checkout -b refactor/your-task"
    Read-Host "Press Enter to continue, or Ctrl+C to abort"
}

# ── EDIT THIS TASK ────────────────────────────────────────────────
$task = @"
Add JSDoc comments to all exported functions in this file.
Rules:
- Only add comments where they are missing
- Do not change any existing code or logic
- Keep comments concise and accurate
"@
# ─────────────────────────────────────────────────────────────────

$files = Get-ChildItem -LiteralPath $InputDir -Filter *.js -File -ErrorAction SilentlyContinue |
         Sort-Object -Property Name

if (@($files).Count -eq 0) {
    Write-Host "No .js files found in: $InputDir"
    exit 0
}

Write-Host "=============================================================================="
Write-Host ("Files to process : {0}" -f @($files).Count)
Write-Host ("Input folder     : {0}" -f $InputDir)
Write-Host "=============================================================================="

$run = 0
$processed = New-Object System.Collections.Generic.List[string]
$batchStart = Get-Date

foreach ($file in $files) {
    $run += 1
    $fileStart = Get-Date

    Write-Host ""
    Write-Host ("-- Run {0} -- {1} {2}" -f $run, $file.Name, ("-" * 50))
    Write-Host ("Started   : {0}" -f $fileStart)

    $prompt = "File: $($file.FullName)`n`n$task"

    & cline -y --timeout 120 $prompt
    if ($LASTEXITCODE -ne 0) {
        throw ("cline failed on run {0} for {1} (exit code {2})." -f $run, $file.Name, $LASTEXITCODE)
    }

    $processed.Add($file.Name) | Out-Null
    $fileEnd = Get-Date
    $fileElapsed = $fileEnd - $fileStart
    Write-Host ("Completed : {0}" -f $fileEnd)
    Write-Host ("Elapsed   : {0}" -f (Format-Elapsed $fileElapsed))
}

$batchEnd = Get-Date
$batchElapsed = $batchEnd - $batchStart

Write-Host ""
Write-Host "=============================================================================="
Write-Host ("Total processed : {0}" -f $processed.Count)
Write-Host ("Total time      : {0}" -f (Format-Elapsed $batchElapsed))
Write-Host "=============================================================================="
Write-Host ""
Write-Host "Review all changes with: git diff"
```

---

## Key flags quick reference

| Flag | What it does |
|------|-------------|
| `-y` / `--yolo` | Auto-approve all actions; enters headless mode |
| `--timeout 300` | Stop after 300 seconds (5 min); adjust per task complexity |
| `--json` | Output JSON (one object per line); parse with `ConvertFrom-Json` |
| `-m claude-sonnet-4-6` | Use a specific model for this task |
| `--config ~/.cline-cheap` | Use an alternate Cline config (e.g., cheaper model profile) |
| `-c path` | Run Cline in a different working directory |

---

## CLINE_COMMAND_PERMISSIONS examples (PowerShell syntax)

```powershell
# Read-only git (safest for review tasks)
$env:CLINE_COMMAND_PERMISSIONS = '{"allow": ["git log *", "git diff *", "git show *"]}'

# Allow git and npm but block destructive commands
$env:CLINE_COMMAND_PERMISSIONS = '{"allow": ["git *", "npm *"], "deny": ["rm *", "sudo *", "git push *"]}'

# Allow file reads and redirects (for analysis tasks)
$env:CLINE_COMMAND_PERMISSIONS = '{"allow": ["cat *", "git *"], "allowRedirects": true}'
```
