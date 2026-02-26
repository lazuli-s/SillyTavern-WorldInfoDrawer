# CSS Audit Report Template

Use this structure exactly when writing the output file. Replace all `<placeholder>` values with real data.

---

## Output filename

```
tasks/CSSAudit_<YYYY-MM-DD>.md
```

Example: `tasks/CSSAudit_2026-02-26.md`

---

## Report structure

```markdown
# CSS Audit — style.css

**Date:** <YYYY-MM-DD>
**File:** style.css
**Rules evaluated:** 40 across 11 families

---

## Summary

| Family | Rules | PASS | FAIL | N/A |
|---|---|---|---|---|
| NAME | 5 | ? | ? | ? |
| FMT | 4 | ? | ? | ? |
| PROP | 2 | ? | ? | ? |
| DGR | 4 | ? | ? | ? |
| RESP | 3 | ? | ? | ? |
| BRK | 4 | ? | ? | ? |
| OVF | 3 | ? | ? | ? |
| LAY | 5 | ? | ? | ? |
| ANIM | 3 | ? | ? | ? |
| ACC | 5 | ? | ? | ? |
| ST-REUSE | 2 | ? | ? | ? |
| **Total** | **40** | **?** | **?** | **?** |

### FAILs by priority

| Priority | Count |
|---|---|
| 🔴 High | ? |
| 🟡 Medium | ? |
| 🟢 Low | ? |

---

## NAME — Naming

| ID | Status | Priority | Notes |
|---|---|---|---|
| NAME-01 | ✅ PASS | — | — |
| NAME-02 | ❌ FAIL | Low | See details below |
| NAME-03 | ✅ PASS | — | — |
| NAME-04 | ✅ PASS | — | — |
| NAME-05 | — N/A | — | No ID selectors present |

<!-- For each FAIL, add a details block immediately below the table: -->

### NAME-02 — FAIL (Low)

**Violation** (line 42):
\```css
.stwid--myButtonThing { }
\```

**Corrected:**
\```css
.stwid--my-button-thing { }
\```

<!-- If the same rule has multiple violations, use numbered sub-items: -->

### NAME-02 — FAIL (Low) — violation 2

**Violation** (line 87):
\```css
.stwid--searchBarWrapper { }
\```

**Corrected:**
\```css
.stwid--search-bar-wrapper { }
\```

---

## FMT — Formatting

| ID | Status | Priority | Notes |
|---|---|---|---|
| FMT-01 | ✅ PASS | — | — |
| FMT-02 | ✅ PASS | — | — |
| FMT-03 | ❌ FAIL | Low | See details below |
| FMT-04 | — N/A | — | No repeated parent prefix pattern |

### FMT-03 — FAIL (Low)

**Violation** — Section starting at line 120 has no section comment header.

**Corrected:** Add `/* 5) Filter Bar */` before the section.

---

## PROP — Properties

| ID | Status | Priority | Notes |
|---|---|---|---|
| PROP-01 | ✅ PASS | — | — |
| PROP-02 | ❌ FAIL | Low | See details below |

### PROP-02 — FAIL (Low)

**Violation** (line 34):
\```css
color: #aabbcc;
\```

**Corrected:**
\```css
color: #abc;
\```

---

## DGR — Danger

| ID | Status | Priority | Notes |
|---|---|---|---|
| DGR-01 | ✅ PASS | — | — |
| DGR-02 | ✅ PASS | — | — |
| DGR-03 | ✅ PASS | — | — |
| DGR-04 | ✅ PASS | — | — |

---

## RESP — Responsive Units

| ID | Status | Priority | Notes |
|---|---|---|---|
| RESP-01 | ✅ PASS | — | — |
| RESP-02 | ✅ PASS | — | — |
| RESP-03 | ✅ PASS | — | — |

---

## BRK — Breakpoints

| ID | Status | Priority | Notes |
|---|---|---|---|
| BRK-01 | ✅ PASS | — | — |
| BRK-02 | ❌ FAIL | High | See details below |
| BRK-03 | ✅ PASS | — | — |
| BRK-04 | ✅ PASS | — | — |

### BRK-02 — FAIL (High)

**Violation** (line 200): Section `.stwid--content-row` introduces `display: flex` with no mobile override.

**Corrected:** Add a `@media screen and (max-width: 1000px)` block immediately after:
\```css
@media screen and (max-width: 1000px) {
    .stwid--content-row {
        flex-direction: column;
    }
}
\```

---

## OVF — Overflow

| ID | Status | Priority | Notes |
|---|---|---|---|
| OVF-01 | ✅ PASS | — | — |
| OVF-02 | ✅ PASS | — | — |
| OVF-03 | ✅ PASS | — | — |

---

## LAY — Layout

| ID | Status | Priority | Notes |
|---|---|---|---|
| LAY-01 | ✅ PASS | — | — |
| LAY-02 | ✅ PASS | — | — |
| LAY-03 | ✅ PASS | — | — |
| LAY-04 | ✅ PASS | — | — |
| LAY-05 | — N/A | — | Order Helper panel not present |

---

## ANIM — Animation

| ID | Status | Priority | Notes |
|---|---|---|---|
| ANIM-01 | ✅ PASS | — | — |
| ANIM-02 | ✅ PASS | — | — |
| ANIM-03 | — N/A | — | No will-change usage |

---

## ACC — Accessibility

| ID | Status | Priority | Notes |
|---|---|---|---|
| ACC-01 | ❌ FAIL | High | See details below |
| ACC-02 | ✅ PASS | — | — |
| ACC-03 | ✅ PASS | — | — |
| ACC-04 | — N/A | — | No icon-only button markup visible in CSS file |
| ACC-05 | — N/A | — | tabindex is a markup concern, not CSS |

### ACC-01 — FAIL (High)

**Violation** (line 55):
\```css
.stwid--entry-item:focus {
    outline: none;
}
\```

**Corrected:**
\```css
.stwid--entry-item:focus {
    outline: none;
}
.stwid--entry-item:focus-visible {
    box-shadow: 0 0 0 2px var(--SmartThemeBorderColor);
}
\```

---

## ST-REUSE — SillyTavern Style Reuse

| ID | Status | Priority | Notes |
|---|---|---|---|
| ST-01 | ✅ PASS | — | — |
| ST-02 | ❌ FAIL | High | See details below |

### ST-02 — FAIL (High)

**Violation** (line 78):
\```css
color: #c0c0c0;
\```

**Corrected:**
\```css
color: var(--SmartThemeBodyColor);
\```
```

---

## Status icon key

| Symbol | Meaning |
|---|---|
| ✅ PASS | Rule satisfied |
| ❌ FAIL | Violation found — see details block below the table |
| — N/A | Rule does not apply (construct absent from this file) |

## Priority key

| Level | When to use |
|---|---|
| 🔴 High | Accessibility, jank, theme breakage, or cross-browser correctness |
| 🟡 Medium | Mobile/responsive issues, overflow risks, structural concerns |
| 🟢 Low | Naming, formatting, shorthand preferences |
