---
name: css-audit
description: Comprehensive CSS auditor for the SillyTavern WorldInfoDrawer extension. Reads style.css, evaluates every rule from all five CSS skill families (NAME, FMT, PROP, DGR — css-rules; RESP, BRK, OVF, LAY — css-responsive; ANIM — css-animation; ACC — css-accessibility; ST-REUSE — css-ST), and writes a structured findings report to tasks/main-tasks/documented/CSSAudit_<date>.md. Each finding is rated PASS / FAIL / N/A with a High / Medium / Low fix priority and a corrected snippet for every FAIL. Use when the user invokes /css-audit or asks to audit, review, or check style.css for violations.
---

# CSS Audit

## Workflow

1. **Load rules** — Read `references/rules-index.md`. This file contains every rule ID, its definition, and its default priority.
2. **Load output format** — Read `references/report-template.md`. Use it as the exact structure for the output file.
3. **Read the CSS** — Read `style.css` from the project root. Read the entire file; do not truncate.
4. **Evaluate each rule** — Work through every rule ID in the index in order. For each rule assign:
   - `PASS` — the code satisfies the rule in all places you can find
   - `FAIL` — at least one violation exists (note every distinct violation, not just the first)
   - `N/A` — the rule cannot apply because the relevant construct is absent from the file (e.g. ANIM rules when there are no transitions)
5. **For each FAIL** — Record the exact violating line or snippet, then write the corrected version. Assign priority using the guidance in `references/rules-index.md`. When a single rule has multiple violations, list each one as a sub-item under the same rule row.
6. **Write the report** — Create `tasks/main-tasks/documented/CSSAudit_<YYYY-MM-DD>.md` using today's date. Follow the structure in `references/report-template.md` exactly.

## Priority assignment

Use the defaults from `references/rules-index.md`. Override the default priority upward when a violation:
- Removes a user-visible accessibility feature (focus, keyboard operability) → always **High**
- Causes jank or layout reflow on every frame → always **High**
- Affects only naming, formatting, or color shorthand → cap at **Low**

## Target file

Always audit `style.css` in the project root unless the user explicitly names a different file.

## Resources

- `references/rules-index.md` — All rule IDs with definitions and default priorities. Load before evaluating.
- `references/report-template.md` — Exact Markdown structure for the output file. Load before writing.
