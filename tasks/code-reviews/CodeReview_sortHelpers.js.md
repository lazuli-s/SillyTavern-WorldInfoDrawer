# CODE REVIEW FINDINGS: `src/sortHelpers.js`

*Reviewed: February 17, 2026*

## Scope

- **File reviewed:** `src/sortHelpers.js`
- **Helper files consulted:** `src/constants.js`, `src/utils.js`, `src/listPanel.js`, `src/wiUpdateHandler.js`
- **Skills applied:** `st-js-best-practices`
- **FEATURE_MAP stated responsibilities:** Entry sort implementations (title, trigger, prompt, position, depth, order, uid, length, custom) and per-book metadata sort preference helpers.

---

## F01: Length sorting recomputes word counts inside the comparator, causing avoidable UI stalls

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  The "Tokens" sort keeps recounting every entry's words over and over while sorting. On larger books, that repeated work can make the interface feel laggy or briefly frozen.

- **Location:**
  `src/sortHelpers.js` - `sortEntries()` -> `SORT.LENGTH` case via `numericSort()`

  Anchor:
  ```js
  case SORT.LENGTH: {
      result = numericSort((entry)=>{
          if (typeof entry.content !== 'string') return null;
          return entry.content.split(/\s+/).filter(Boolean).length;
      });
      break;
  }
  ```

- **Detailed Finding:**
  `numericSort()` calls the provided getter on every comparator invocation. In the `SORT.LENGTH` path, that getter performs `split(...).filter(...).length` each time it is called. Since sort comparators run many times (`O(n log n)` comparisons), the same entry content is tokenized repeatedly during one sort pass. This adds avoidable CPU cost on a hot UI path (`sortEntries` is called from list rendering and sort refresh paths), and is directly against the performance guidance to avoid blocking the UI thread with repeated heavy synchronous work.

- **Why it matters:**
  Sorting by token count can become noticeably slow on large books or long entries, reducing responsiveness during common interactions.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** Performance

- **Reproducing the issue:**
  1. Open a book with many entries containing long `content` strings.
  2. Set sort mode to "Tokens".
  3. Observe increased sort latency (UI hitching) versus simpler sorts like UID/Position.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Keep the same sort behavior, but precompute each entry's token count once per sort call and reuse those cached values in the comparator.

- **Proposed fix:**
  In `sortEntries()` for `SORT.LENGTH`, build a per-entry cache (for example, a `Map`) of token counts before calling `numericSort`. Then change the getter passed to `numericSort` to only read from that cache instead of splitting content inside each comparison.

- **Implementation Checklist:**
  [ ] In the `SORT.LENGTH` branch of `sortEntries()`, precompute token counts once for all `entries`.
  [ ] Replace the inline `split/filter/length` getter with a cache lookup getter.
  [ ] Preserve current fallback behavior for non-string `content` (treat as non-finite/unsorted by numeric key).

- **Fix risk:** Low 🟢
  The change is localized to one sort mode and preserves output ordering semantics while reducing repeated work.

- **Why it's safe to implement:**
  It does not modify metadata handling, non-length sort logic, or any save/update integration paths.

- **Pros:**
  - Faster token-based sorting on medium/large datasets.
  - Lower chance of UI stutter during sort-triggering actions.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "numericSort() calls the provided getter on every comparator invocation" — Confirmed by code inspection of `numericSort` implementation which passes getter directly to `safeToSorted` comparator
  - Claim: "the same entry content is tokenized repeatedly during one sort pass" — Confirmed: for O(n log n) comparisons, the same content is split/filtered multiple times

- **Top risks:**
  - None identified — the finding is well-evidenced with specific code location and behavior

#### Technical Accuracy Audit

> *The getter performs `split(...).filter(...).length` each time it is called.*

- **Why it may be wrong/speculative:**
  Not speculative. The code clearly shows the getter is defined inline and executed on every comparison.

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A — claim is confirmed by code inspection

#### Fix Quality Audit

- **Direction:**
  The proposed direction (precompute token counts once before sorting) is technically sound and follows the same pattern used for other expensive operations in UI code. It stays within the `sortHelpers.js` module per ARCHITECTURE.md.

- **Behavioral change:**
  The fix does not change observable behavior — it only optimizes an internal implementation detail.

- **Ambiguity:**
  Only one suggestion is provided. ✅

- **Checklist:**
  All checklist items are specific and actionable:
  1. Precompute token counts once for all entries — specific action
  2. Replace inline getter with cache lookup — specific change
  3. Preserve fallback behavior — specific requirement
  ✅ Complete

- **Dependency integrity:**
  No cross-finding dependencies declared. The fix is self-contained.

- **Fix risk calibration:**
  Fix risk is rated Low — this is accurate. The change is isolated to one sort mode, preserves behavior, and only adds caching.

- **"Why it's safe" validity:**
  The claim "does not modify metadata handling, non-length sort logic, or any save/update integration paths" is specific and verifiable. ✅

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] In the `SORT.LENGTH` branch of `sortEntries()`, precompute token counts once for all `entries`.
- [ ] Replace the inline `split/filter/length` getter with a cache lookup getter.
- [ ] Preserve current fallback behavior for non-string `content` (treat as non-finite/unsorted by numeric key).

---

## F02: Metadata parser drops valid per-book sort preferences when legacy data omits direction

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  If an imported/older book stores "which sort to use" but forgets the direction value, the extension ignores the whole preference instead of using a safe default. Users then see a different sort order than expected.

- **Location:**
  `src/sortHelpers.js` - `getSortFromMetadata()`

  Anchor:
  ```js
  const sort = sortData.sort ?? sortData.logic ?? sortData.sortLogic;
  const direction = sortData.direction ?? sortData.sortDirection;
  if (!Object.values(SORT).includes(sort) || !Object.values(SORT_DIRECTION).includes(direction)) return null;
  return { sort, direction };
  ```

- **Detailed Finding:**
  `getSortFromMetadata()` already supports multiple legacy field names for the sort key (`sort`, `logic`, `sortLogic`), which signals backward-compatibility intent. However, direction has no fallback default: if `direction`/`sortDirection` is missing, validation fails and the function returns `null`. Downstream callers (`listPanel.js`, `wiUpdateHandler.js`) then fall back to global sort settings, silently ignoring the book-level preference even though the sort logic itself is valid.

- **Why it matters:**
  Imported or older metadata can lose per-book sorting behavior without a clear user-facing explanation, causing confusing "my sort preference didn't load" behavior.

- **Severity:** Medium ❗
- **Confidence:** High 😀
- **Category:** JS Best Practice

- **Reproducing the issue:**
  1. Load a lorebook whose metadata contains `stwid.sort.sort` (or `logic`) but no `direction`.
  2. Open the drawer with per-book sorts enabled.
  3. Observe the book uses global sort instead of the metadata sort preference.

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Preserve compatibility by defaulting missing direction to `ascending` when sort logic is valid, while still rejecting explicitly invalid direction values.

- **Proposed fix:**
  In `getSortFromMetadata()`, detect whether direction is absent versus invalid.
  - If absent, use `SORT_DIRECTION.ASCENDING`.
  - If present but not in `SORT_DIRECTION`, continue returning `null`.
  Keep the existing sort-key alias handling unchanged.

- **Implementation Checklist:**
  [ ] Update `getSortFromMetadata()` to assign `SORT_DIRECTION.ASCENDING` when `direction` is missing.
  [ ] Keep explicit validation for `sort` and for any provided non-empty direction value.
  [ ] Return normalized `{ sort, direction }` so existing callers continue unchanged.

- **Fix risk:** Low 🟢
  The change is narrowly scoped to metadata parsing and only affects cases where direction is currently missing.

- **Why it's safe to implement:**
  It does not alter persistence format, sort algorithm implementations, or non-metadata sort selection paths.

- **Pros:**
  - Better backward compatibility for legacy/imported metadata.
  - Fewer silent fallbacks to global sort behavior.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: "direction has no fallback default" — Confirmed by code inspection of `getSortFromMetadata`
  - Claim: "if `direction`/`sortDirection` is missing, validation fails and the function returns `null`" — Confirmed by code: the validation `!Object.values(SORT_DIRECTION).includes(direction)` will fail when direction is undefined

- **Top risks:**
  - None identified — the finding is well-evidenced with specific code location and behavior

#### Technical Accuracy Audit

> *However, direction has no fallback default: if `direction`/`sortDirection` is missing, validation fails and the function returns `null`.*

- **Why it may be wrong/speculative:**
  Not speculative. The code shows `direction = sortData.direction ?? sortData.sortDirection` which will be `undefined` if both are missing, then the validation `!Object.values(SORT_DIRECTION).includes(undefined)` returns `true`, causing the function to return `null`.

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A — claim is confirmed by code inspection

#### Fix Quality Audit

- **Direction:**
  The proposed direction (default to ASCENDING when direction is absent but valid) is technically sound. It stays within the `sortHelpers.js` module per ARCHITECTURE.md.

- **Behavioral change:**
  The fix changes behavior: when direction is missing, instead of returning `null` (falling back to global sort), it will now return `{ sort, direction: SORT_DIRECTION.ASCENDING }`. This is a meaningful behavioral change that should be labeled as such.

- **Ambiguity:**
  Only one suggestion is provided. ✅

- **Checklist:**
  All checklist items are specific and actionable:
  1. Assign ASCENDING when direction is missing — specific action
  2. Keep explicit validation for sort and provided direction — specific requirement
  3. Return normalized object — specific requirement
  ✅ Complete

- **Dependency integrity:**
  No cross-finding dependencies declared. The fix is self-contained.

- **Fix risk calibration:**
  Fix risk is rated Low — this is accurate. The change is isolated to metadata parsing, preserves backward compatibility for valid direction values, and only adds a sensible default.

- **"Why it's safe" validity:**
  The claim "does not alter persistence format, sort algorithm implementations, or non-metadata sort selection paths" is specific and verifiable. ✅

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Update `getSortFromMetadata()` to assign `SORT_DIRECTION.ASCENDING` when `direction` is missing.
- [ ] Keep explicit validation for `sort` and for any provided non-empty direction value.
- [ ] Return normalized `{ sort, direction }` so existing callers continue unchanged.

---

### Coverage Note

- **Obvious missed findings:** None identified.
- **Severity calibration:** Both findings are Medium severity, appropriately rated. The issues are real but not critical — they affect performance optimization and backward compatibility respectively.