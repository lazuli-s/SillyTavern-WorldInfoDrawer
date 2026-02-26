[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Fail {
    param([string]$Message)
    throw $Message
}

function Assert-SymbolicLinkToSkills {
    param(
        [string]$LinkPath,
        [string]$ExpectedTargetPath
    )

    if (-not (Test-Path -Path $LinkPath)) {
        Fail "Missing path: $LinkPath"
    }

    $item = Get-Item -Path $LinkPath -Force
    if ($item.LinkType -ne "SymbolicLink") {
        Fail "Expected symbolic link at $LinkPath, found: $($item.Attributes)"
    }

    $resolvedLinkTarget = Resolve-Path -Path (Join-Path $LinkPath ".")
    $resolvedExpectedTarget = Resolve-Path -Path $ExpectedTargetPath
    if ($resolvedLinkTarget.Path -ne $resolvedExpectedTarget.Path) {
        Fail "Wrong target for $LinkPath. Expected $($resolvedExpectedTarget.Path), got $($resolvedLinkTarget.Path)"
    }
}

$repoRoot = (Resolve-Path ".").Path
$canonicalSkillsPath = Join-Path $repoRoot "skills"

if (-not (Test-Path -Path $canonicalSkillsPath -PathType Container)) {
    Fail "Canonical folder is missing: $canonicalSkillsPath"
}

$canonicalItem = Get-Item -Path $canonicalSkillsPath -Force
if ($canonicalItem.LinkType) {
    Fail "Canonical folder must be a real directory, not a link: $canonicalSkillsPath"
}

Assert-SymbolicLinkToSkills -LinkPath (Join-Path $repoRoot ".claude/skills") -ExpectedTargetPath $canonicalSkillsPath
Assert-SymbolicLinkToSkills -LinkPath (Join-Path $repoRoot ".codex/skills") -ExpectedTargetPath $canonicalSkillsPath

Write-Host "[OK] Skill symlinks are valid and point to the canonical skills folder." -ForegroundColor Green
