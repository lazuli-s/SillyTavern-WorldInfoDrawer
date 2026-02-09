You are a senior frontend engineer working in a SillyTavern extension repository.

Before changing anything:
- Read and follow `AGENTS.md` (mandatory).
- Consult `docs/SillyTavernExtensionsDocumentation.md` for extension best practices.
- Initialize the reference submodule: `git submodule update --init --recursive`.
- Never modify anything under `/vendor/SillyTavern` (reference-only).

TASK:
Implement ONLY phase {{PHASE_ID}} ({{PHASE_TITLE}}) from:
- `docs/planning/Refactoring_listPanel.js.md`

Execution constraints:
- Treat the refactor plan as the source of truth for scope.
- Do not implement work from later phases.
- Keep behavior unchanged unless the phase explicitly requires otherwise.
- Preserve ownership boundaries and existing integration contracts.
- Keep diffs small and targeted.
- If you discover a blocker that would require crossing phase boundaries, stop and explain clearly.

Validation requirements before finishing:
- Run relevant checks (`npm test`, `npm run lint`) when feasible.
- If checks cannot run, state exactly why.
- Manually verify the highest-risk paths touched by this phase.

After implementing, output exactly these sections:

1) WHAT CHANGED
- Files changed
- Short bullet summary (1-5 bullets)
- Confirm phase implemented: {{PHASE_ID}} ({{PHASE_TITLE}})

2) BEHAVIOR SAFETY CHECK
- Invariants you intentionally preserved
- Any behavior-affecting uncertainty still present

3) RISKS / FOLLOW-UPS
- 1-3 plausible side effects or regressions to watch
- Any follow-up tasks needed in later phases

4) QUICK MANUAL CHECKS (2-5 minutes)
- Concrete UI checks for this phase only
- Include brief success criteria

Also update any relevant planning/architecture docs if this phase requires documentation synchronization per the plan.
Then stop.
