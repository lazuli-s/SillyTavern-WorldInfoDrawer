# TASK: Mobile/Responsive CSS Redesign
*Created: February 25, 2026*

**Type:** REWORK
**Status:** DOCUMENTED

---

## Summary

The WorldInfo Drawer extension has no mobile or responsive CSS — the entire UI uses fixed
layouts that become unusable on small screens. This task creates a new `css-responsive` AI
skill to enforce responsive CSS rules for all future edits, then uses those rules to retrofit
`style.css` and `src/drawer.js` with a full mobile redesign. On small screens (≤1000 px wide),
the layout switches from a side-by-side split (list left, editor right) to a stacked split
(list on top, editor/Order Helper below) with a draggable handle to resize the two halves.

---

## Current Behavior

When the user opens the WorldInfo Drawer on a small screen (phone, tablet, or a narrow browser
window), the extension forces a fixed horizontal layout: the book/entry list on the left and
the editor panel on the right. Neither panel adapts its size to the available space — content
overflows the screen edges, elements overlap or disappear off-screen, and the UI becomes
effectively unusable on any device narrower than a typical desktop browser window. There are
currently zero `@media` rules anywhere in `style.css`.

---

## Expected Behavior

After this task:

1. **On screens ≤1000 px wide** — the extension stacks the list panel above the
   editor/Order Helper panel. Both panels take the full available width. A draggable handle
   between the two halves lets the user resize the top/bottom split. The Order Helper table
   scrolls horizontally inside its container instead of overflowing the screen.

2. **On all screen sizes, for all future CSS** — the `css-responsive` AI skill is active
   whenever CSS is written or changed, ensuring mobile-friendly units, overflow containment,
   and the correct breakpoints are applied from the start.

---

## Agreed Scope

### Deliverable 1 — `css-responsive` skill

A new AI agent skill at `.claude/skills/css-responsive/SKILL.md`:

| Property | Value |
|---|---|
| Trigger | Every time CSS is added or changed (same pattern as `style-guide`) |
| Mode | Guide (authoring new CSS) + Review (auditing existing CSS) |
| Primary breakpoint | `max-width: 1000px` — mirrors SillyTavern's own primary mobile cutoff |
| Secondary breakpoint | `max-width: 768px` — for very small phones (matches ST's model-card cutoff) |

Rule families to define:

| Family | ID range | Focus |
|---|---|---|
| Responsive Units | RESP | Prefer fluid units (`%`, `em`, `rem`, `vw`, `vh`) for widths and heights; allow `px` for borders, padding, and font sizes |
| Breakpoints | BRK | Use only ST-mirrored breakpoints; add both a mobile and small-phone block where needed |
| Overflow | OVF | Never create horizontal scroll at the page level; use `overflow-x: auto` on scrollable containers |
| Layout | LAY | Row-direction flex containers that contain major panels must have a column-direction override at the mobile breakpoint; fixed pixel widths must include `max-width: 100%` or be replaced by fluid alternatives |

### Deliverable 2 — `style.css` + `src/drawer.js` mobile redesign

**Files affected:**
- `style.css` — add `@media (max-width: 1000px)` blocks for all 7 CSS sections
- `src/drawer.js` — adapt splitter drag behavior for vertical (top-bottom) resize on mobile

**Areas covered:**

| CSS Section | Mobile change |
|---|---|
| 1) Drawer | `flex-direction: column`; drawer fills full viewport on mobile |
| 2) List Panel | Full-width (`width: 100%`, `max-width: none`); filter rows wrap on narrow widths |
| 3) Splitter | Vertical splitter hidden on mobile; new horizontal drag handle shown for top/bottom resize |
| 4) Editor Panel | Full-width, positioned below list panel |
| 5) Context Menus / Modals | Menus constrained to viewport width; popup widths adapt |
| 6) Order Helper | Full-width below list; table container gets `overflow-x: auto` |
| 7) Misc | Review for any remaining fixed-width elements; add fluid overrides |

**JS changes (src/drawer.js):**
- Splitter logic currently lives around lines 612–681 using `pointerdown` / `lostpointercapture`
  and resizes the list panel's **width** (horizontal).
- On mobile: route splitter drag events to resize the list panel's **height** (vertical) instead.
- Persist mobile splitter position under a new localStorage key `stwid--list-height` (separate
  from the desktop key `stwid--list-width`) to avoid collision.
- On window resize crossing the 1000 px threshold: detect the breakpoint change and reset the
  splitter to a sensible default for the new orientation.

---

## Out of Scope

Nothing — all UI areas are included.

---

## Implementation Plan

### Phase 1 — Create the `css-responsive` skill

- [x] Create the folder `.claude/skills/css-responsive/`
- [x] Write `.claude/skills/css-responsive/SKILL.md`:
  - Frontmatter trigger description: activates when any CSS is added or changed
  - Document the four rule families (RESP, BRK, OVF, LAY) with IDs, rule text, good/bad
    examples, and PASS/FAIL/N/A review instructions matching the format of `css-rules`
  - List the two ST-mirrored breakpoints with exact pixel values and their ST source reference
  - Define Guide mode (apply rules when authoring) and Review mode (flag violations in audits)
- [x] Create `.claude/skills/css-responsive/references/examples.md` with before/after CSS
  snippets illustrating each rule (one example per rule ID minimum)

Validated during implementation: these files already existed and matched the phase requirements.

### Phase 2 — Register `css-responsive` as a mandatory pre-CSS check

- [ ] In `CLAUDE.md` section 5 (Style Guide Compliance), add `css-responsive` to the
  "before making any UI or CSS change, run..." list alongside `style-guide`
- [ ] In `AGENTS.md` section 5, add the same line so both instruction files stay in sync

### Phase 3 — Implement mobile CSS in `style.css`

Add one `@media (max-width: 1000px)` block per major section; place each block directly
after its source section to keep related rules co-located:

- [ ] **Section 1 (Drawer)**: Switch drawer flex direction to `column`; set drawer to fill
  full viewport width and height; hide the desktop-only horizontal splitter
- [ ] **Section 2 (List Panel)**: `width: 100%`, `max-width: none`, `height: auto` (shrinks
  to content or the mobile splitter position); filter/sort/search bar rows wrap on narrow
  widths using `flex-wrap: wrap`
- [ ] **Section 3 (Splitter)**: Hide `.stwid--splitter` (the vertical bar); show a new
  `.stwid--splitter-h` horizontal bar for top/bottom resizing on mobile (see Phase 4 for JS)
- [ ] **Section 4 (Editor Panel)**: `width: 100%`; positioned naturally below list in the
  column-direction drawer; height fills the remaining space
- [ ] **Section 5 (Context Menus / Modals)**: Constrain dropdown/popup widths to
  `max-width: calc(100vw - 2rem)`; ensure menus don't overflow the right edge of the screen
- [ ] **Section 6 (Order Helper)**: `width: 100%`; wrap the Order Helper table in
  `overflow-x: auto` so the multi-column table scrolls horizontally without breaking layout
- [ ] **Section 7 (Misc)**: Scan for any remaining fixed-pixel width declarations not covered
  above and add `max-width: 100%` overrides in the mobile block

### Phase 4 — Adapt the splitter in `src/drawer.js`

- [ ] After the splitter element is created (around line 612), add a mobile-detection helper
  — a function `isMobileLayout()` that returns `window.innerWidth <= 1000`
- [ ] Create a second splitter element `.stwid--splitter-h` (horizontal bar) and insert it
  into the drawer DOM alongside the existing `.stwid--splitter`; CSS from Phase 3 will
  show/hide each one based on the breakpoint
- [ ] On `pointerdown` on `.stwid--splitter-h`: read `evt.clientY` as the drag origin and
  resize the list panel's `height` (instead of width) as the pointer moves; mirror the
  existing pointer-capture + lost-capture cleanup pattern from the horizontal splitter
- [ ] Clamp the mobile splitter: define `MIN_LIST_HEIGHT` and `MIN_EDITOR_HEIGHT` constants
  (e.g. 150 px each) and use them as floor/ceiling during drag, analogous to the existing
  `MIN_LIST_WIDTH` / `MIN_EDITOR_WIDTH` constants
- [ ] Save the mobile list height to `localStorage` under key `stwid--list-height` on drag end
- [ ] Restore the saved mobile list height on drawer open when `isMobileLayout()` is true
- [ ] Add a `window.addEventListener('resize', ...)` listener (debounced) that detects when
  the viewport crosses the 1000 px threshold and resets the splitter to a sensible default
  for whichever orientation just became active

### Phase 5 — Update documentation

- [ ] Update `ARCHITECTURE.md` section on `drawer.js` to note the mobile splitter addition
- [ ] Update `FEATURE_MAP.md` "Bootstrap & runtime sync" and "Splitter" entries to note
  the mobile vertical splitter behavior and the new `stwid--list-height` persistence key
- [ ] Update `ARCHITECTURE.md` data stores section with the new `stwid--list-height`
  localStorage key

---

## After Implementation

*To be filled in after implementation is complete.*
