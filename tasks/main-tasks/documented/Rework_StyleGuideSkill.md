# Rework: style-guide → css-ST Skill

## Summary

Renamed the `style-guide` skill to `css-ST` and expanded it from a minimal
rule + class list into a full component reference. Eliminated the instruction
to scan the ST submodule — all relevant classes and their modifiers are now
documented inline with brief "when to use" descriptions.

---

## What Changed

### Skill renamed

- Old: `skills/style-guide/SKILL.md`
- New: `skills/css-ST/SKILL.md`

The new name fits the `css-*` naming pattern used by all other CSS skills.

### Content expanded

Previously the skill listed bare class names with no descriptions and told
the LLM to scan the ST submodule to learn what each class does.

The new skill:
- Groups classes by component type (Buttons, Inputs, Select2, Toggles,
  Inline Elements, Typography, Drawers, Menus & Popups)
- Lists key modifiers/subclasses for each base class in a table
- Adds a "when to use" column so the LLM can choose without opening any files
- Drops the submodule-scan instruction entirely

New component sections added from screenshots provided by user:
- Toggles & Checkboxes (`input[type=checkbox]`, `input[type=range]`)
- Inline Elements (`.note-link-span`, FA icon classes)
- Typography (`h1`–`h6`, `.standoutHeader`)
- Drawers (`.inline-drawer` family)
- Full Popup API with size modifiers

### References updated

All files that referenced `style-guide` were updated to `css-ST`:

| File | Change |
| --- | --- |
| `AGENTS.md` | Updated skill name in section 5 |
| `.claude/agents/javascript-pro.md` | Updated skill name |
| `workflows/css-workflow.md` | Updated all references + fixed stale "coming soon" statuses for css-rules, css-animation, css-accessibility |
| `skills/css-responsive/SKILL.md` | Updated reference in description |

---

## Status

- [x] New `skills/css-ST/SKILL.md` created
- [x] Old `skills/style-guide/` deleted
- [x] All cross-references updated
- [x] `css-workflow.md` updated (skill name + active status for 3 skills)
