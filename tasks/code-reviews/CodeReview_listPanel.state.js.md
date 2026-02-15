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

- Immplementation Checklist:
  [ ] Convert `entrySearchCache`, `collapseStates`, `folderCollapseStates`, and `folderDoms` to `Map` or `Object.create(null)`.
  [ ] Update getters/setters (`getFolderDom`, `setFolderDom`, etc.) to use the new map API.
  [ ] Update call sites that use `Object.keys` / `Object.values` to iterate through map keys/values.
  [ ] Add key normalization/validation for book/folder names before insert.

- Why it’s safe to implement  
  It preserves existing behavior while preventing key collisions; state still stores the same values but with safer lookups.

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

- Immplementation Checklist:
  [ ] Add a selection reset step during `refreshList()` (or inside `clearCacheBooks()` if that’s the chosen hook).
  [ ] Ensure the selection toast is cleared when selection resets.
  [ ] Verify delete/drag operations no longer reference stale selections after a refresh.

- Why it’s safe to implement  
  It only clears selection on list rebuilds; it does not alter how selection works during normal interactions.