# CODE REVIEW FINDINGS: `src/listPanel.state.js`

## F01: State caches use plain objects with user-controlled keys (prototype pollution / key collisions)
- Location:
  `src/listPanel.state.js` — `ensureEntrySearchCacheBook`, `setEntrySearchCacheValue`, `setFolderDom`, `setCollapseState` (object maps keyed by book/folder names)

- What the issue is  
  Multiple state maps (`entrySearchCache`, `collapseStates`, `folderCollapseStates`, `folderDoms`) are plain objects keyed by book/folder names. Book and folder names are user-defined, so names like `__proto__`, `constructor`, or `toString` can mutate the object prototype or collide with built-ins.

- Why it matters  
  A single malicious or accidental book/folder name can corrupt state, break `Object.keys`/iteration, or cause lookups to resolve incorrectly, leading to missing entries, broken collapse state, or filter behavior that silently fails.

- Severity: Medium

- Fix risk: Low  
  (Replacing map structures is localized but touches multiple consumers.)

- Confidence: Medium  
  (The failure mode depends on user-provided names; the code currently does no key guarding.)

- Repro idea:  
  Create a book named `__proto__`, load the list, then toggle folder collapse or run entry search. Watch for unexpected UI behavior or console errors.

- Suggested direction  
  Use `Map` objects or `Object.create(null)` for map-like state, and normalize/validate keys before insert.

- Proposed fix  
  Replace the object maps with `Map` instances (or null-prototype objects) and update accessors to use `.get()` / `.set()` (or `Object.create(null)` and `Object.hasOwn` guards).

- **Pros:** 
  - Issue is well-described with specific vulnerable locations
  - Suggested direction (Map or Object.create(null)) is technically sound
  - Fix risk assessment (Low) is accurate - change is localized to state module

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: `entrySearchCache`, `collapseStates`, `folderCollapseStates`, `folderDoms` are plain objects keyed by user-controlled names
  - Claim: Code does no key guarding against prototype pollution

- **Top risks:**
  - Internal inconsistency (checklist mentions updating call sites but doesn't enumerate them)

#### Technical Accuracy Audit

> *Multiple state maps (`entrySearchCache`, `collapseStates`, `folderCollapseStates`, `folderDoms`) are plain objects keyed by book/folder names. Book and folder names are user-defined*

- **Why it may be wrong/speculative:**
  Not speculative - validated by inspecting `src/listPanel.state.js`:
  - Line 14: `entrySearchCache: {}`
  - Line 15: `collapseStates: {}`
  - Line 16: `folderCollapseStates: {}`
  - Line 17: `folderDoms: {}`
  - Methods like `ensureEntrySearchCacheBook`, `setEntrySearchCacheValue`, `setFolderDom`, `setCollapseState` all use direct bracket notation with user-provided names

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A - claim is confirmed

#### Fix Quality Audit

- **Direction:**
  Using `Map` or `Object.create(null)` stays within the correct module (listPanel.state.js owns state management per ARCHITECTURE.md). This is technically sound.

- **Behavioral change:**
  This is an internal storage change with no observable behavior difference from the user's perspective. No "Behavior Change Required" label needed - the change is transparent to users.

- **Ambiguity:**
  Only one suggestion (Map or Object.create(null)) - clear and actionable.

- **Checklist:**
  - "Convert ... to Map or Object.create(null)" - actionable ✅
  - "Update getters/setters ... to use new map API" - actionable ✅
  - "Update call sites that use Object.keys/Object.values" - **vague** ❌ (doesn't specify which files/call sites need updating - requires investigation)
  - "Add key normalization/validation" - **vague** ❌ (what normalization? What validation rules?)

- **Dependency integrity:**
  No cross-finding dependencies - F01 stands alone.

- **Fix risk calibration:**
  "Low" is accurate. While it touches multiple consumers, the change is localized to the state module and uses safe replacement patterns.

- **Why it's safe validity:**
  "It preserves existing behavior while preventing key collisions; state still stores the same values but with safer lookups" - this is specific and verifiable.

- **Mitigation:**
  None needed - risk is low.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Convert `entrySearchCache`, `collapseStates`, `folderCollapseStates`, and `folderDoms` to `Map` or `Object.create(null)`.
- [ ] Update getters/setters (`getFolderDom`, `setFolderDom`, etc.) to use the new map API.
- [ ] Update call sites that use `Object.keys` / `Object.values` to iterate through map keys/values.
- [ ] Add key normalization/validation for book/folder names before insert.

---

## F02: Selection state can survive list reloads, leaving stale `selectFrom`/`selectList`
- Location:
  `src/listPanel.state.js` — `resetSelectionMemory`, `clearCacheBooks` (used by list reloads)

- What the issue is  
  `refreshList()` clears the cache via `clearCacheBooks()` but does not clear selection state. If the list is refreshed while entries are selected, `selectFrom`/`selectList` remain in memory even though the DOM and cache were rebuilt.

- Why it matters  
  Stale selection state can cause delete or drag/drop actions to operate on entries that no longer exist or point to a different entry after refresh, risking unintended deletions or errors.

- Severity: Medium

- Fix risk: Low  
  (Clearing selection on reload is localized and predictable.)

- Confidence: Medium  
  (Depends on timing, but refreshes occur frequently via update events.)

- Repro idea:  
  Select entries, trigger a refresh (import, manual refresh, or world info update), then press Delete or drag. Observe whether the operation targets the previous selection rather than the newly rendered entries.

- Suggested direction  
  Reset selection state (and clear the selection toast) whenever the list cache is rebuilt.

- Proposed fix  
  Call `resetSelectionMemory()` (with toast clearing) during list refresh or in `clearCacheBooks()` to ensure selection state is cleared when the DOM/cache are regenerated.

- **Pros:** 
  - Issue is clearly described with specific failure scenario
  - Fix direction is precise (call resetSelectionMemory during refresh)
  - Fix risk (Low) is accurate

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  - Claim: `refreshList()` clears cache via `clearCacheBooks()` but does not clear selection state
  - Claim: Selection state (`selectFrom`/`selectList`) survives DOM rebuild

- **Top risks:**
  - None identified - claim is straightforward and verifiable

#### Technical Accuracy Audit

> *`refreshList()` clears the cache via `clearCacheBooks()` but does not clear selection state.*

- **Why it may be wrong/speculative:**
  Not speculative - validated by code inspection:
  - `clearCacheBooks` in `src/listPanel.state.js` only iterates through `cache` object and deletes entries
  - `resetSelectionMemory` exists as a separate function but is NOT called within `clearCacheBooks`
  - The selection state (`selectFrom`, `selectList`, `selectMode`, `selectLast`, `selectList`) persists after cache clear

- **Validation:**
  Validated ✅

- **What needs to be done/inspected to successfully validate:**
  N/A - claim is confirmed

#### Fix Quality Audit

- **Direction:**
  Calling `resetSelectionMemory()` during refresh stays within the correct module. This is technically sound.

- **Behavioral change:**
  This is a behavioral change - selection will be cleared on refresh. The review doesn't explicitly label this as "Behavior Change Required", but it should be noted. The change is desirable (fixing a bug) and clearly explained.

- **Ambiguity:**
  Only one suggestion - clear and actionable.

- **Checklist:**
  - "Add a selection reset step during refreshList()" - actionable but could be more specific about WHERE in the flow ✅
  - "Ensure the selection toast is cleared when selection resets" - `resetSelectionMemory` already accepts a `clearToast` parameter, so this is covered ✅
  - "Verify delete/drag operations no longer reference stale selections" - This is a validation step, not implementation ❌

- **Dependency integrity:**
  No cross-finding dependencies - F02 stands alone.

- **Fix risk calibration:**
  "Low" is accurate. Clearing selection on reload is localized and predictable.

- **Why it's safe validity:**
  "It only clears selection on list rebuilds; it does not alter how selection works during normal interactions" - specific and verifiable.

- **Mitigation:**
  None needed - risk is low.

- **Verdict:** Ready to implement 🟢

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [ ] Add a selection reset step during `refreshList()` (or inside `clearCacheBooks()` if that's the chosen hook).
- [ ] Ensure the selection toast is cleared when selection resets.
- [ ] Verify delete/drag operations no longer reference stale selections after a refresh.

---

### Coverage Note

- **Obvious missed findings:** None identified.
- **Severity calibration:** Both findings are correctly rated Medium severity - they represent real bugs with potential for user impact but aren't critical (no data loss, no security vulnerabilities).
