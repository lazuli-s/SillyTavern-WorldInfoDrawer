---
name: doc-guide
description: Single source of truth for which authoritative docs to load and when. Invoke
  at the start of any task on the SillyTavern-WorldInfoDrawer extension, before
  reading code or making changes. Provides a conditional loading guide: always-load
  docs (ARCHITECTURE.md, FEATURE_MAP.md), plus conditional docs based on whether
  the task involves writing JS, reading/writing World Info, ownership questions,
  or code review. All workflow and skill files that previously listed docs inline
  now delegate here instead.
---

# doc-guide

Tells you which authoritative documents to load before starting any task on the
SillyTavern-WorldInfoDrawer extension.

**Read only what is relevant to the task.** Do NOT load all docs every time —
that wastes context window space and slows work down.

---

## Always load

For every task, read these two files first:

- `ARCHITECTURE.md` — module boundaries, responsibilities, and runtime model
- `FEATURE_MAP.md` — where each extension feature/behavior is implemented

---

## Conditional loading

### When writing or modifying any JavaScript

Load:

- `.claude/skills/st-js-best-practices/references/patterns.md`
  (JS best practices — Security: SEC-01–03, Performance: PERF-01–03, API Compatibility: COMPAT-01–04)

### When reading or writing World Info books or entries

Load:

- `.claude/skills/st-world-info-api/references/wi-api.md`
  (WI API reference — book/entry CRUD, entry shape, enums, events, anti-patterns)

Also load if the task uses `SillyTavern.getContext()` or unfamiliar ST globals:

- `vendor/SillyTavern/public/scripts/st-context.js`
  (What `SillyTavern.getContext()` exposes — confirms available APIs, state values, and events)

### When uncertain about what belongs in ST vs. this extension

Load:

- `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`
  (Ownership boundaries, integration contract, and safe hook points)

### For code review tasks

Load all conditionals that apply to the file being reviewed, plus always load:

- `SILLYTAVERN_OWNERSHIP_BOUNDARY.md`
- `.claude/skills/st-world-info-api/references/wi-api.md` — if the file imports
  from `world-info.js` or uses WI APIs (e.g., `loadWorldInfo`, `saveWorldInfo`,
  `worldInfoCache`, `WORLDINFO_UPDATED`)
- `vendor/SillyTavern/public/scripts/st-context.js` — only if needed to confirm
  ST API names or shapes

### When making any UI or CSS change

Load:

- `.claude/skills/css-guide/SKILL.md`
  (overview of all CSS skills and when each one applies — then load the specific skills it recommends for the task)

---

## Reference note

SillyTavern source is under `vendor/SillyTavern` — reference only.

**DO NOT modify anything under `vendor/SillyTavern`.**
