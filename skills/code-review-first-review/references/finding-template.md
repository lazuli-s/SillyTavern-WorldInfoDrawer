# Finding Template

## Output file structure

```
# CODE REVIEW FINDINGS: `<TARGET_FILE>`

*Reviewed: <Month D, YYYY>*

## Scope

- **File reviewed:** `<TARGET_FILE>`
- **Helper files consulted:** `<list, or "none">`
- **Skills applied:** `<st-js-best-practices>` / `<st-world-info-api>` / none
- **FEATURE_MAP stated responsibilities:** `<brief description from FEATURE_MAP.md>`

---

## F01: <Title>

[finding block — see format below]

---

## F02: <Title>

[finding block — see format below]
```

---

## Per-finding format

Repeat this block for each Fxx, separated by `---`:

```
## Fxx: <Title>

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  Explain the issue as if the reader has no programming background.

- **Location:**
  file + function (and anchor snippet)

- **Detailed Finding:**
  Describe the finding using technical terminology: cite relevant files and functions, describe the failure mode, triggers, observable symptoms, what happens, why it happens, and why the code permits it.

- **Why it matters:**
  Describe the possible consequences of not addressing this issue.

- **Severity:** Low ⭕ / Medium ❗ / High ❗❗
  Low = cosmetic/edge-case with minimal user impact. Medium = plausible data loss or UX confusion under realistic conditions. High = direct data loss, crash, or security issue on a common path.

- **Confidence:** Low 😔 / Medium 🤔 / High 😀
  High = complete failure path traceable entirely from code, no runtime assumptions needed. Medium = failure depends on a runtime condition not confirmable from code alone (e.g., concurrent update in-flight). Low = speculative; depends on unverifiable user behavior or unmeasured load.

- **Category:** Data Integrity / Race Condition / UI Correctness / Performance / Redundancy / JS Best Practice — pick the single best-fit category

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  1–3 sentences; NO code and NO detailed plan. If in doubt between two approaches, choose the one that changes behavior the least.

- **Proposed fix:**
  Concrete implementation details: name the exact functions, variables, and changes required.
  If the fix cannot be fully specified without confirming a runtime behavior or observable symptom, add `🚩 Requires user input` and state exactly what needs to be confirmed.

- **Implementation Checklist:**
  Incremental, self-contained steps for an LLM to implement. No steps that require user input or manual verification.
  - [ ] Detailed, incremental task to fix this issue

- **Fix risk:** Low 🟢 / Medium 🟡 / High 🔴
  Justify with risks and cons of applying this fix, potential side-effects or unwanted consequences, behaviors that might change, etc.

- **Why it's safe to implement:**
  Name the specific behaviors, paths, or other findings that this fix does not affect.

- **Pros:**
  Benefits of implementing this fix.

<!-- META-REVIEW: STEP 2 will be inserted here -->
```
