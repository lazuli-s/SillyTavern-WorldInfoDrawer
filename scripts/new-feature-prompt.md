Now produce a DETAILED IMPLEMENTATION PLAN for this feature.

Before changing anything:
- Read and follow `AGENTS.md` (mandatory).
- Consult `docs/SillyTavernExtensionsDocumentation.md` for best practices.
- Initialize the reference submodule: `git submodule update --init --recursive`.
- Do NOT modify anything under `/vendor/SillyTavern` (reference-only).

Rules:
- Build incrementally in multiple steps (maximum 4 steps).
- No refactors unless required to fix a specific issue.
- Preserve existing behavior.
- If any item may change behavior, STOP and ask for confirmation.
- Do not implement code yet.

Output format:
Create `docs/ImplementNewFeature.md` with exactly this structure, using Markdown:

# DETAILED IMPLEMENTATION PLAN: <feature name>

## Step S01: <one concise sentence title>
- Relevant file(s)
  e.g., `listPanel.js`, `worldEntry.js`, `editorPanel.js`, `orderHelper.js`, `index.js`

- Extension Modules
  module responsibilities for this feature
  
- ST Context
  vanilla ST/main app state objects, useful functions, and utilities that can be reused (context inside `vendor/SillyTavern/public/scripts/st-context.js`)
  
- Decision point
  where logic likely needs to change
  
- Smallest change set
  [ ] Change X
  [ ] Change Y
  ...
  
- Invariants
  what must NOT change
  
- Risks
  1-3 plausible regressions/side effects
  
- Manual test steps
  exact UI actions + expected result
  
- Console checks/logs to inspect 
  only if relevant

## Step S02: <one concise sentence title>
- (same bullets as S01)

...

After writing the file, stop and wait for user input.