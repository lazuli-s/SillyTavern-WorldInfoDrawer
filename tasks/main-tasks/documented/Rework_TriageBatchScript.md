# REWORK: triage-batch.ps1 aesthetics and information improvements
*Created: March 1, 2026*

**Type:** REWORK
**Status:** IMPLEMENTED

---

## Summary

Improve `scripts/codex/triage-batch.ps1` to match the visual polish and
informativeness of `scripts/codex-headless/code-review-batch.ps1`.

No log file is written — output remains console-only. The changes are purely
about how information is presented during a run.

## Requirements gathered via interview

| Area | Decision |
| --- | --- |
| Log file | No — console only |
| Visual separators | Yes — `===` header banner and `-- Run N --` run dividers |
| Per-file timestamps | Yes — Started / Completed per file |
| Per-file elapsed time | Yes — e.g. `Elapsed: 1m 23s` |
| Total batch elapsed | Yes — shown in the closing footer |
| Total count summary | Yes — shown in the closing footer |
| Header content | File count + pending folder path (no start timestamp) |
| Configurable param | Yes — `$PendingDir` as a `[CmdletBinding()]` parameter |
| Error handling | Yes — `throw` on codex failure, git add failure, git commit failure |

## Changes implemented

- Added `[CmdletBinding()]` and `param([string]$PendingDir = ...)` block.
- Changed `$PENDING_DIR` constant to `$PendingDir` parameter throughout.
- Added `Format-Elapsed` helper function to format `TimeSpan` as `Xm Ys` or `Xs`.
- Changed `Write-Error` pre-flight checks to `throw` for consistent error behavior.
- Added `===` opening banner showing file count and pending folder path.
- Added `-- Run N -- filename --` separator line before each file.
- Added `Started:` / `Completed:` / `Elapsed:` lines per file.
- Added `$batchStart` / `$batchEnd` tracking for total elapsed time.
- Added `===` closing footer with total files triaged and total batch time.
- Added `throw` on `codex exec` non-zero exit code.
- Added `throw` on `git add` non-zero exit code.
- Added `throw` on `git commit` non-zero exit code.
- Normalized variable casing to camelCase to match PowerShell conventions.

## Why this change

The original script printed minimal output — just a file name and two
timestamps. When a batch runs for many minutes, there was no clear visual
structure to tell which file was being processed, how long each took, or how
long the whole run took. The rework makes the output match the reference
script's style, making batch runs easier to monitor and diagnose.
