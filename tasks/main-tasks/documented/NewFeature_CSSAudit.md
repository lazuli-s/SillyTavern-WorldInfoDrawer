# CSS Audit Skill — Planning Document

Planning document for the `css-audit` skill. This skill is the last to be implemented,
as it synthesizes rules from `css-rules` and `css-accessibility`. See
`tasks/Rework_NewCSSskills.md` for the planning of the three companion authoring skills.

---

## Background

`css-audit` is a comprehensive checker that reads `style.css` (the extension's main
stylesheet) and produces a structured violation report. It is separate from the authoring
skills — those guide writing new code; this one reviews existing code.

It does not replace `style-guide`. That skill covers ST-specific reuse rules (use
SillyTavern's own classes first). `css-audit` covers CSS quality rules (naming, formatting,
properties, danger, accessibility). Both should be run when doing a thorough CSS review.

---

## Skill: `css-audit`

### Folder

`.claude/skills/css-audit/`

### Frontmatter description (trigger text)

Audits the extension's CSS file (`style.css`) for violations of the Google CSS Style Guide,
adapted for this SillyTavern extension. Covers naming (NAME), formatting (FMT), properties
(PROP), danger (DGR), and accessibility (ACC) rule families. Does NOT cover animation
performance (authoring-only). Does NOT cover ST-specific style reuse — for that, run the
`style-guide` skill separately. Use when asked to "audit CSS", "review CSS quality",
"check CSS style compliance", or automatically during any code review that touches CSS files.
Produces a single structured task file in `tasks/` with a `UI_` prefix containing both the
violation report and an implementation plan.

### Trigger

- Explicit: "audit my CSS", "review CSS", "check CSS quality", "CSS style compliance"
- Automatic: during any code review that includes `style.css`

### Output

A single file: `tasks/UI_<DescriptiveName>.md`

The file contains:

1. A structured violation report (grouped by rule family, with line references)
2. An implementation plan listing all fixes to apply

### Rule families included in audit

| Family | Source | Notes |
| --- | --- | --- |
| Naming (NAME-01–06) | `css-rules` | Existing camelCase is a known deviation — do not flag |
| Formatting (FMT-01–08) | `css-rules` | |
| Properties (PROP-01–04) | `css-rules` | |
| Danger (DGR-01–04) | `css-rules` | |
| Accessibility (ACC-01–03) | `css-accessibility` | |

Animation rules (ANIM) are **not included** — they are authoring-only guidelines.

### Extension-specific exceptions (document in SKILL.md)

| Pattern | Rule | Decision |
| --- | --- | --- |
| Existing camelCase class names (`.stwid--folderHeader`) | NAME-02: hyphen-only | Note as known deviation — do not flag existing code |
| SillyTavern DOM selectors (`#WorldInfo`, `#wi-holder`, etc.) | NAME-05: no ID selectors | Allowed for scoping — only flag extension-created `#` selectors |
| `!important` with `/* override: reason */` comment | DGR-01: no bare `!important` | Allowed — document the pattern |
| `!important` without any comment | DGR-01 | Violation — flag it |
| `body.stwid-- #WorldInfo .stwid--*` | Redundant gate selector | Flag as potentially redundant; suggest simplifying to `#WorldInfo .stwid--*`. Exception: the three "keep" selectors documented in `Rework_NewCSSskills.md`. |

### CSS file path

`style.css` (root of the extension repo) — auto-found, no user input needed

### Relationship to other skills

| Skill | Relationship |
| --- | --- |
| `css-rules` | css-audit runs all NAME/FMT/PROP/DGR checks from this skill in review mode |
| `css-accessibility` | css-audit includes all ACC checks |
| `css-animation` | NOT included — animation rules are authoring-only |
| `style-guide` | NOT included — ST-specific reuse rules are separate; run style-guide independently |

---

## Known CSS Quirk: `body.stwid-- #WorldInfo` selector prefix

See `tasks/Rework_NewCSSskills.md` for the full explanation of when this prefix is essential
vs. redundant. The three selectors that must never be flagged are:

| Selector | Why it must stay |
| --- | --- |
| `body.stwid-- #WorldInfo { }` | Overrides ST's own element size/layout/tokens |
| `body.stwid-- #WorldInfo.openDrawer { }` | Forces `display:flex` on ST's own element |
| `body.stwid-- #WorldInfo #wi-holder { }` | Hides ST's own child `#wi-holder` |

All other `body.stwid-- #WorldInfo .stwid--*` patterns should be flagged as redundant.

---

## Open Questions

None — all decisions inherited from `tasks/Rework_NewCSSskills.md`.

---

## Status

- [x] Planning complete
- [ ] `css-audit` skill created
