# CODE REVIEW FINDINGS: `src/sortHelpers.js`
*Reviewed: February 28, 2026*

## Scope

- **File reviewed:** `src/sortHelpers.js`
- **Helper files consulted:** `src/constants.js`, `src/utils.js`, `src/Settings.js`, `vendor/SillyTavern/public/scripts/world-info.js`
- **Skills applied:** `st-js-best-practices` / `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** "Sorting implementations and per-book sort preference read/write"

---

## F01: Prompt sort tie-breaker inverts WI `order` priority

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The "Prompt" sorting mode can show entries in a different order than SillyTavern actually uses when building the prompt, which can mislead users while organizing entries.

- **Category:** UI Correctness

- **Location:**
  `src/sortHelpers.js`, `sortEntries()` -> `case SORT.PROMPT`, comparator lines using:
  - `if ((x(a).order ?? Number.MAX_SAFE_INTEGER) > (x(b).order ?? Number.MAX_SAFE_INTEGER)) return 1;`
  - `if ((x(a).order ?? Number.MAX_SAFE_INTEGER) < (x(b).order ?? Number.MAX_SAFE_INTEGER)) return -1;`

- **Detailed Finding:**
  In `SORT.PROMPT`, the tie-breaker for equal `position` and `depth` sorts `order` ascending (lower order first). SillyTavern's WI pipeline uses descending order priority (`b.order - a.order`) for activation/insertion ordering in `vendor/SillyTavern/public/scripts/world-info.js` (`sortFn`, line 88, reused in prompt build flow). Because this extension labels the mode as Prompt sorting, users reasonably expect it to mirror prompt priority. With same-position/same-depth entries, the drawer can display the opposite precedence from core WI behavior.

- **Why it matters:**
  Users can make edits based on a displayed order that does not match runtime activation priority, causing confusion and incorrect assumptions during lorebook tuning.

- **Severity:** Medium (plausible user-facing ordering mismatch in normal workflows)

- **Confidence:** High
  The mismatch is directly visible from comparator logic and core WI ordering code.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  **Behavior Change Required:** make `SORT.PROMPT` match core WI order precedence for equal `position`/`depth` so the Prompt sort mode reflects what users expect from SillyTavern.

- **Proposed fix:**
  In `src/sortHelpers.js` `SORT.PROMPT` comparator, invert the `order` tie-breaker so higher `order` values sort earlier (descending precedence). Keep the existing `shouldReverse` handling for the explicit descending Prompt option.

- **Implementation Checklist:**
  - [ ] Update the two `order` comparison branches in `SORT.PROMPT` so higher `order` values come first before fallback compare
  - [ ] Keep `position` and `depth` comparison behavior unchanged
  - [ ] Preserve the existing `sortDirection` reverse flow and fallback `defaultCompare`

- **Fix risk:** Low
  The change is tightly scoped to one comparator branch and only affects Prompt mode ordering.

- **Why it's safe to implement:**
  It does not alter metadata read/write, settings defaults, or any non-Prompt sort mode.

- **Pros:**
  - Makes Prompt sort behavior align with core WI ordering rules
  - Reduces UI/runtime mismatch confusion
  - Keeps sorting behavior more predictable for users tuning activation priority

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F02: Length sort recomputes full token counts inside comparator

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The length-based sort recalculates each entry's word count many times during sorting, which can make large lorebooks feel slow.

- **Category:** Performance

- **Location:**
  `src/sortHelpers.js`, `sortEntries()` -> `case SORT.LENGTH`, getter in `numericSort`:
  - `return entry.content.split(/\s+/).filter(Boolean).length;`

- **Detailed Finding:**
  `SORT.LENGTH` computes word count by splitting and filtering `entry.content` inside the sort comparator path. Comparators run many times per sort (`O(n log n)` comparisons), so each entry may be tokenized repeatedly. For larger books and longer content, this creates avoidable CPU and allocation churn on the main UI thread. This conflicts with `st-js-best-practices` PERF-03 guidance to avoid heavy synchronous work that can block UI responsiveness.

- **Why it matters:**
  Sorting by length can introduce noticeable input lag or stutter in large datasets, especially when rerender/sort is triggered repeatedly.

- **Severity:** Medium (performance degradation on realistic large books)

- **Confidence:** High
  The repeated split/filter allocation path is directly in the comparator getter and is deterministic.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Cache each entry's computed length once per sort call, then compare cached numeric values.

- **Proposed fix:**
  In `sortEntries`, before executing `numericSort` for `SORT.LENGTH`, precompute a lookup (for example `Map` keyed by entry object or uid) with word counts. Replace the inline split/filter getter with a lookup-based getter that returns the precomputed number (or null for non-string content).

- **Implementation Checklist:**
  - [ ] Add a per-call cache for length counts in `SORT.LENGTH`
  - [ ] Compute each entry length once using existing content rules
  - [ ] Change the `numericSort` getter for `SORT.LENGTH` to read from the cache
  - [ ] Keep existing handling for non-string `content` values

- **Fix risk:** Low
  This is an optimization-only change that preserves current ordering semantics.

- **Why it's safe to implement:**
  It only changes how length values are produced, not how comparisons, fallbacks, or direction handling work.

- **Pros:**
  - Reduces repeated string splitting and temporary allocations
  - Improves responsiveness for large lorebooks
  - Keeps behavior intact while lowering CPU cost

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

*End of first-pass review findings*
