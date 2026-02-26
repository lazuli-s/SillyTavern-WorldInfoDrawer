# CSS Workflow Guide

Entry point for all CSS and UI work in this extension. Read this before making any UI or CSS change.

## When to Use Which Skill

| Situation | What to do |
|-----------|------------|
| Investigating a UI/visual question before writing any code | Use `workflows/explore-css.md` |
| Making any UI or CSS change | Run `style-guide` + `css-responsive` |
| Writing new CSS classes or blocks | Run `css-rules` *(coming soon)* |
| Writing CSS transitions or animations | Run `css-animation` *(coming soon)* |
| Writing CSS for interactive elements (buttons, inputs) | Run `css-accessibility` *(coming soon)* |
| Full audit of `style.css` for quality violations | Run `css-audit` *(coming soon)* |

## Skill Run Order

For any CSS change, run skills in this order:

1. **Investigation** — if you need to define the visual change first, use `workflows/explore-css.md` before writing any code
2. **`style-guide`** — confirms ST styles are reused and extension CSS contracts are followed
3. **`css-responsive`** — confirms mobile compatibility

When writing new CSS classes or blocks, additionally run:

4. **`css-rules`** *(coming soon)* — naming, formatting, property values, danger rules
5. **`css-animation`** *(coming soon)* — only when writing transitions or animations
6. **`css-accessibility`** *(coming soon)* — only when writing CSS for interactive elements

## All CSS Skills

| Skill | File | Status | Description |
|-------|------|--------|-------------|
| `style-guide` | `skills/style-guide/SKILL.md` | Active | Enforce ST style reuse first; defines extension CSS contracts (dropdowns, chips) |
| `css-responsive` | `skills/css-responsive/SKILL.md` | Active | Enforce mobile/responsive rules (RESP, BRK, OVF, LAY) |
| `css-rules` | — | Coming soon | Naming, formatting, property values, danger rules (Google CSS Style Guide) |
| `css-animation` | — | Coming soon | Transition/animation performance: compositor vs. paint vs. layout tiers |
| `css-accessibility` | — | Coming soon | Focus styles, motion sensitivity, ARIA for icon-only buttons |
| `css-audit` | — | Coming soon | Full `style.css` audit combining css-rules + css-accessibility |

## Investigation Mode

See `workflows/explore-css.md` — a guided analysis process for defining visual changes before writing any code.

## Extension CSS Contracts

These contracts are enforced by the `style-guide` skill and also documented here for quick reference.

### Dropdown Families

Use exactly one of the two dropdown families below.

#### Multiselect Dropdown (`stwid--multiselectDropdown*`)

Use for selectable/toggleable option lists (including filter menus and column visibility menus).

Family classes:
- `stwid--multiselectDropdownWrap`
- `stwid--multiselectDropdownButton`
- `stwid--multiselectDropdownMenu`
- `stwid--multiselectDropdownOption`
- `stwid--multiselectDropdownOptionIcon`
- `stwid--multiselectDropdownOptionCheckbox`

Book Visibility rules:
- Keep preset actions (`All Books`, `All Active`) at the top.
- Presets are independent actions, not multiselect rows.
- Multiselect rows (`Global`, `Chat`, `Persona`, `Character`) use Font Awesome square checkbox icons (`fa-square` / `fa-square-check`).

#### Action List Dropdown (`stwid--listDropdown*`)

Use for action menus (book/folder context actions and future single-action lists).

Family classes:
- `stwid--listDropdownTrigger`
- `stwid--listDropdownMenu`
- `stwid--listDropdownItem`

These menus are action lists only (no select/multiselect behavior).

### Visibility Chips (`stwid--visibilityChips`)

Maintain the default chip contract:

- `stwid--visibilityChips` sits beside any visibility trigger/help controls.
- Chips summarize currently active visibility selections/mode.
- Chips are status indicators only; they are not interactive controls.
