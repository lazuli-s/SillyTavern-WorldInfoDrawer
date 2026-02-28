# Meta-Review Format Reference

This file defines the exact format for the `### STEP 2: META CODE REVIEW` block inserted into each finding, and the tracker update format.

---

## Table of Contents

1. [STEP 2 block structure](#step-2-block-structure)
2. [Technical Accuracy Audit](#technical-accuracy-audit)
3. [Fix Quality Audit](#fix-quality-audit)
4. [Implementation Checklist (appended to STEP 2)](#implementation-checklist)
5. [Verdict definitions](#verdict-definitions)

---

## STEP 2 block structure

Insert this block immediately after the `- **Pros:**` content in each finding:

```markdown

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  <List the specific claims that are backed by named functions, anchor snippets, and a traceable failure path.>

- **Top risks:**
  <Choose applicable: missing evidence / wrong prioritization / speculative claims / internal inconsistency / risk of the fix > benefit / other (specify). If none apply, write "None.">

#### Technical Accuracy Audit

<For each questionable claim in the original finding:>

  > *Quoted claim*

- **Why it may be wrong/speculative:**
  <Based on code/evidence.>

- **Validation:**
  Validated ✅ / Needs extensive analysis ❌ / Requires user input 🚩 — <justify>

- **What needs to be done/inspected to validate:**
  <Only if speculative or false: file/function/observable symptom the implementer must check. Plain language.>

#### Fix Quality Audit

- **Direction:**
  Is the proposed direction technically sound? Does it stay within the correct module per ARCHITECTURE.md? Flag structural issues requiring human decision.

- **Behavioral change:**
  Does the fix change observable behavior? Is it labeled "Behavior Change Required" if yes? Flag unlabeled behavioral changes — including seemingly safe ones (changed debounce timing, altered event ordering, removed a guard check, changed when a save is triggered).

- **Ambiguity:**
  Is there only ONE recommendation? If more than one, the least-behavioral-change option must be the sole recommendation.

- **Checklist:**
  Are checklist items complete and actionable by an LLM without human input? Flag: vague steps ("refactor X" without specifics), steps implying manual verification, skipped follow-up actions (updating callers after a rename, re-registering a listener after removal).

- **Dependency integrity:**
  If the fix depends on or conflicts with another finding, is it declared explicitly? Would applying this before/after the declared dependency work as described?

- **Fix risk calibration:**
  Is the stated Fix risk accurate? A fix touching shared state, core event handlers, debounce/async behavior, or multiple callers must NOT be rated Low.

- **"Why it's safe" validity:**
  Is the safety claim specific and verifiable — naming concrete behaviors, paths, or callers not affected? Vague claims ("only affects this function", "shouldn't break anything") are not valid, especially when the function has multiple call sites or mutates shared state.

- **Mitigation:**
  <Only if there's a high risk of introducing new bugs. Directed at the LLM implementing the fix. Omit this item entirely if not applicable.>

- **Verdict:** Ready to implement 🟢 / Implementation plan needs revision 🟡 / Implementation plan discarded 🔴
  <Justify — see Verdict Definitions below.>
```

---

## Technical Accuracy Audit

Only include a Technical Accuracy Audit entry for claims you consider questionable. If all claims in the finding are well-evidenced, write:

```markdown
#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.
```

---

## Fix Quality Audit

Fill in all fields. If a field is not applicable (e.g., no behavioral change, no dependencies), write "N/A" or "None" — do not omit the field.

---

## Implementation Checklist

**For 🟢 (Ready to implement) — append after the Verdict line:**

```markdown
#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] <checklist step 1, copied from the original Step 1 Implementation Checklist>
- [ ] <checklist step 2>
...
```

**For 🟡 (Needs revision) — append after the Verdict line:**

```markdown
#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: <reason from Fix Quality Audit — Checklist field>
> Revisions applied: <1–2 sentences describing exactly what was changed in the checklist>

- [ ] <revised checklist step 1>
- [ ] <revised checklist step 2>
...
```

**For 🔴 — omit the Implementation Checklist entirely.**

---

## Verdict definitions

**Ready to implement 🟢** — all three conditions:
- Original confidence is High or Medium
- No 🚩 Requires user input flags
- No ❌ Needs extensive analysis flags

**Implementation plan needs revision 🟡** — any one of:
- Low confidence on one or more key claims, but no ❌ or 🚩 flags
- Fix risk is under-rated OR "Why it's safe" claim is vague but correctable
- Checklist has vague or missing steps that need tightening
- A cross-finding dependency is missing but the fix itself is sound

**Implementation plan discarded 🔴** — either:
- Needs extensive analysis ❌ is present
- Requires user input 🚩 is present

> **Note on 🚩 and ❌ findings:** Even with these flags, the file still moves to `pending-implementation/`. The implementer is responsible for handling them. Do not route to a separate queue file.
