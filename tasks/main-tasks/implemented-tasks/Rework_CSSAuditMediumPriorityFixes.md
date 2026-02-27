# Rework — CSS Audit Medium Priority Fixes

**Status:** IMPLEMENTED
**Date:** 2026-02-27
**Source:** `tasks/main-tasks/documented/CSSAudit_2026-02-27.md`
**File changed:** `style.css`

---

## Context

The CSS audit flagged 17 violations at three priority tiers. This task addresses only the **medium priority** findings (5 total). High and low priority findings are tracked separately.

RESP-01/02/03 (fixed-width list panel) were already resolved prior to this task — the current code uses `width: 20vw; min-width: 220px; max-width: 100%`. No action was taken for RESP.

---

## Findings Fixed

| ID | Rule Family | Description |
| --- | --- | --- |
| DGR-02 | Danger | Deprecated vendor prefixes in scrollbar/scroll rules |
| DGR-04 | Danger | 5 selector chains exceed 3-level depth limit |
| ANIM-02 | Animation | 7 bare `transition: 200ms` declarations with no named property |

---

## Implementation Plan

### Step 1 — DGR-02: Remove deprecated vendor prefixes

**1a** — Delete `-webkit-overflow-scrolling: touch` from `.stwid--orderTableWrap` inside the `@media (max-width: 768px)` block (~line 2023). The `overflow-x: auto` on the same rule already handles scrolling in all modern browsers.

**1b** — Replace the `::webkit-scrollbar` / `::-webkit-scrollbar-thumb` visibility-hidden block (~lines 1657–1663) with:

- `scrollbar-width: none` on the input element (standard, Firefox-first)
- `::-webkit-scrollbar { display: none }` for Chrome/Safari (keep but use `display:none` not `visibility:hidden`)

### Step 2 — DGR-04: Shorten deep selector chains

Drop unnecessary intermediate ancestor classes to bring all chains to ≤ 3 levels. No HTML changes needed.

**2a** Action affordance (~line 666): Drop `.stwid--folderHeader` and `.stwid--books .stwid--head` intermediates. Update matching hover rule.

**2b/2c** sourceLinks (~lines 737, 743): Drop `.stwid--books .stwid--head` prefix on both rules.

**2d** Entry body text truncation (~lines 821–837): Drop `.stwid--books` prefix from both rules.

**2e** List dropdown icon/label (~lines 1206–1215): Drop `.stwid--blocker` prefix from both rules.

### Step 3 — ANIM-02: Name bare transitions

Replace 7 instances of `transition: 200ms` with named-property transitions:

- Action affordance → `opacity 200ms ease`
- Entry row → `background-color 200ms ease`
- Entry selector → `opacity 200ms ease`
- Entry status → `opacity 200ms ease`
- Order table row → `background-color 200ms ease`
- Sortable handle → `opacity 200ms ease`
- Order select → `opacity 200ms ease`

---

## Checklist

- [x]DGR-02a: Remove `-webkit-overflow-scrolling: touch`
- [x]DGR-02b: Replace webkit-scrollbar block with scrollbar-width + display:none
- [x]DGR-04a: Shorten action affordance selectors (+ hover)
- [x]DGR-04b: Shorten sourceLinks selector (display rule)
- [x]DGR-04c: Shorten sourceLinks.stwid--state-empty selector
- [x]DGR-04d: Shorten entry body comment/key combined rule
- [x]DGR-04d: Shorten entry body .stwid--key rule
- [x]DGR-04e: Shorten listDropdownItem .stwid--icon rule
- [x]DGR-04e: Shorten listDropdownItem .stwid--label rule
- [x]ANIM-02: Name 7 bare transitions
