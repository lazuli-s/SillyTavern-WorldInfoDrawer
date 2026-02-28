# Code Review Tracker

Track all code-review findings across the extension's JS files.

## Reviewed Files

### `src/lorebookFolders.js`
[CodeReview_lorebookFolders.md](tasks/code-reviews/pending-meta-review/CodeReview_lorebookFolders.md)

- **F01** â€” MutationObserver never disconnected â€” memory leak
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** â€” Import timeout too aggressive â€” may fail on slow systems
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** â€” Repeated localStorage reads â€” inefficient registry access
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F04** â€” Event listeners not tracked for cleanup â€” best practice violation
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F05** â€” Import partial match handling too conservative
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/listPanel.state.js`
[CodeReview_listPanel.state.js.md](tasks/code-reviews/pending-implementation/CodeReview_listPanel.state.js.md)

- **F01** — Potential data loss in folder collapse state persistence
  - Meta-reviewed: [X]
    - Verdict: 🟢
    - Reason: All claims evidence-based; fix is low-risk and additive; checklist is actionable.
  - Implemented:
- **F02** — Book collapse state capture may miss updates due to DOM timing
  - Meta-reviewed: [X]
    - Verdict: 🟡
    - Reason: DOM timing claim is speculative/unverified; boolean check claim is incorrect; refactoring recommendation violates architecture. Revised to documentation-only.
  - Implemented:
- **F03** — Entry search cache lacks eviction limits
  - Meta-reviewed: [X]
    - Verdict: 🟡
    - Reason: Finding is sound but checklist presented competing implementations without guidance. Revised to prioritize simpler clear-cache approach.
  - Implemented:

### `src/listPanel.js`
[CodeReview_listPanel.js.md](tasks/code-reviews/pending-implementation/CodeReview_listPanel.js.md)

- **F01** — Unhandled Promise Rejections in Async Book Operations
  - Meta-reviewed: [X]
    - Verdict: 🟢
    - Reason: N/A
  - Implemented:
- **F02** — Race Condition Between Save and Refresh in setBookSortPreference
  - Meta-reviewed: [X]
    - Verdict: 🟢
    - Reason: N/A
  - Implemented:
- **F03** — Missing DOM Attachment Check in applyCollapseState
  - Meta-reviewed: [X]
    - Verdict: 🟢
    - Reason: N/A
  - Implemented:
- **F04** — refreshWorkerPromise Null Race in refreshList
  - Meta-reviewed: [X]
    - Verdict: 🟡
    - Reason: Fix proposal is vague with competing options; risk understated for core coordination changes. Checklist auto-revised to single concrete approach.
  - Implemented:

### `src/listPanel.coreBridge.js`
[CodeReview_listPanel.coreBridge.js.md](tasks/code-reviews/pending-implementation/CodeReview_listPanel.coreBridge.js.md)

- **F01** â€” Race Condition in Value Verification Timing
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: Low â­• â€” verified sequencing issue with minimal user impact; only affects error-case detection
  - Implemented:

### `src/listPanel.booksView.js`
[CodeReview_listPanel.booksView.js.md](tasks/code-reviews/pending-implementation/CodeReview_listPanel.booksView.js.md)

- **F01** â€” Race Condition in Active Toggle Handler
  - Meta-reviewed: [X]
    - Verdict: ðŸ”´
    - Reason: Core claim is incorrect â€” disabled checkboxes do not fire click events in browsers.
  - Neglect Risk: Low â­• â€” discarded finding based on incorrect technical premise
  - Implemented:
- **F02** â€” Optimistic UI Rollback May Discard User Edits
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¡
    - Reason: Real issue but checklist assumes unavailable dirty-state API; needs revision.
  - Neglect Risk: Low â­• â€” timing window is milliseconds, probability extremely low
  - Implemented:
- **F03** â€” Event Listeners on Dynamic DOM Elements Not Cleaned Up
  - Meta-reviewed: [X]
    - Verdict: ðŸ”´
    - Reason: Speculative without profiling; modern browsers reliably GC DOM listeners.
  - Neglect Risk: Low â­• â€” discarded finding, no confirmed memory leak
  - Implemented:
- **F04** â€” Yield Frequency May Be Insufficient for Large Datasets
  - Meta-reviewed: [X]
    - Verdict: ðŸ”´
    - Reason: Premature optimization without profiling data.
  - Neglect Risk: Low â­• â€” discarded finding, no evidence of actual performance impact
  - Implemented:

### `src/bookSourceLinks.js`
[CodeReview_bookSourceLinks.js.md](tasks/code-reviews/pending-changelog/CodeReview_bookSourceLinks.js.md)

- **F01** - Context fallback still hard-depends on fragile direct ST imports
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: Medium â— â€” direct-import fragility can break source-link behavior after host export changes.
  - Implemented: âœ…
    - Implementation Notes: Removed fragile direct ST imports and switched runtime context reads to `SillyTavern.getContext()` with safe defaults.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] Open a chat, change chat/persona/character source books, and confirm source-link badges refresh without console errors.
- **F02** - Group member fallback by character name can mis-attribute source links
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¡
    - Reason: behavior-change label and checklist precision need revision before implementation.
  - Neglect Risk: Medium â— â€” mis-attribution is an edge-case UI correctness issue, but still user-visible when triggered.
  - Implemented: âœ…
    - Implementation Notes: Added avatar-first member resolution with unique-name fallback only and skip+debug behavior for ambiguous duplicate names.
    - **ðŸŸ¥ MANUAL CHECK**:
      - [ ] In a group with two characters sharing the same name, verify source icons do not attach that ambiguous member to the wrong book and a debug log appears.

### `src/drawer.js`
[CodeReview_drawer.js.md](tasks/code-reviews/pending-implementation/CodeReview_drawer.js.md)

- **F01** - Direct Imports from ST Core Modules Bypass Stable Context API
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¡
    - Reason: selective context migration is valid, but the original plan overstates context coverage and needs a per-symbol checklist.
  - Neglect Risk: Medium â— â€” direct-import fragility can break integration when ST internals change.
  - Implemented:
- **F02** - MutationObserver `moSel` Never Disconnected
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: Medium â— â€” teardown leaks may accumulate observers across reload cycles.
  - Implemented:
- **F03** - `moDrawer` MutationObserver Never Disconnected
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: Medium â— â€” teardown leaks may keep drawer observers alive unnecessarily.
  - Implemented:
- **F04** - Selection Visibility Check Race Condition in Delete Handler
  - Meta-reviewed: [X]
    - Verdict: ðŸ”´
    - Reason: claimed correctness bug is unproven; implementing requires explicit UX/product decision.
  - Neglect Risk: Medium â— â€” if ignored, impact is mostly UX policy ambiguity rather than confirmed data corruption.
  - Implemented: Pending user review - see [user-review__drawer.js.md](tasks/code-reviews/pending-user-review/user-review__drawer.js.md)
- **F05** - Potential Stale Reference to `selectionState`
  - Meta-reviewed: [X]
    - Verdict: ðŸ”´
    - Reason: stale-reference claim is not supported by current selection-state proxy design.
  - Neglect Risk: Medium â— â€” leaving this unresolved mainly preserves review noise, not a confirmed runtime defect.
  - Implemented: Pending user review - see [user-review__drawer.js.md](tasks/code-reviews/pending-user-review/user-review__drawer.js.md)

### `src/editorPanel.js`
[CodeReview_editorPanel.js.md](tasks/code-reviews/pending-implementation/CodeReview_editorPanel.js.md)

- **F01** - Code duplication in activation settings display logic
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: Low âšª - low-severity duplication increases maintenance overhead but has no immediate correctness or data-loss impact.
  - Implemented:

### `src/listPanel.bookMenu.js`
[CodeReview_listPanel.bookMenu.js.md](tasks/code-reviews/pending-implementation/CodeReview_listPanel.bookMenu.js.md)

- **F01** - Event listener leak in openImportDialog
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: Low â­• â€” minor memory leak in long sessions, limited blast radius
  - Implemented:
- **F02** - Unsanitized user input in move book dialog
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: Low â­• â€” defense-in-depth issue, current textContent usage is already safe
  - Implemented:
- **F03** - Keyboard accessibility missing on menu items
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: Medium â— â€” accessibility gap affects keyboard users, but workarounds exist
  - Implemented:
- **F04** - No dirty check before Fill Empty Titles action
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: High â—â— â€” confirmed data loss risk when user has unsaved edits
  - Implemented:
- **F05** - Duplicate book polling may miss fast updates
  - Meta-reviewed: [X]
    - Verdict: ðŸ”´
    - Reason: "Requires user input" flag and uncertain investigation steps mean this cannot be implemented without first resolving the open question about waitForWorldInfoUpdate behavior.
  - Neglect Risk: Low â­• â€” discarded finding, no confirmed defect
  - Implemented: Pending user review — see [user-review__listPanel.bookMenu.js.md](tasks/code-reviews/pending-user-review/user-review__listPanel.bookMenu.js.md)
- **F06** - Potential race condition in importFolderFile rollback
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: Medium â— â€” may leave orphaned book entries on failed imports, tolerable short-term
  - Implemented:

### `src/listPanel.foldersView.js`
[CodeReview_listPanel.foldersView.js.md](tasks/code-reviews/pending-implementation/CodeReview_listPanel.foldersView.js.md)

- **F01** - Hidden folders processed unnecessarily in active toggle update
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¡
    - Reason: Finding proposed two competing options; revised checklist to specify Option 1 as the sole recommendation.
  - Neglect Risk: Low â­• â€” Low-severity micro-optimization; no data loss or correctness risks
  - Implemented:

### `src/listPanel.selectionDnD.js`
[CodeReview_listPanel.selectionDnD.js.md](tasks/code-reviews/pending-implementation/CodeReview_listPanel.selectionDnD.js.md)

- **F01** — Race condition between book load and save operations
  - Meta-reviewed: [X]
    - Verdict: 🟢
    - Reason: Finding is technically accurate with actionable fix direction. Added explicit cleanup step to checklist.
  - Implemented:
- **F02** — Missing error handling leaves UI in inconsistent state
  - Meta-reviewed: [X]
    - Verdict: 🟢
    - Reason: Finding is accurate with clear, actionable fix. No checklist revisions needed.
  - Implemented:
- **F03** — Partial failure in bulk move creates data inconsistency
  - Meta-reviewed: [X]
    - Verdict: 🟢
    - Reason: Finding is accurate with actionable fix. No checklist revisions needed.
  - Implemented:
- **F04** — Uses undocumented runtime APIs not in WI API reference
  - Meta-reviewed: [X]
    - Verdict: 🟢
    - Reason: Finding is accurate. Investigation/documentation task. Checklist auto-revised to add JSDoc guidance.
  - Implemented:

### `src/orderHelper.js`
[CodeReview_orderHelper.js.md](tasks/code-reviews/pending-meta-review/CodeReview_orderHelper.js.md)

- **F01** â€” Direct cache mutation in ensureCustomDisplayIndex
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** â€” Unsanitized JSON injection into DOM
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** â€” Synchronous localStorage operations on sort change
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F04** â€” Redundant helper functions for options/values
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/orderHelperFilters.js`
[CodeReview_orderHelperFilters.md](tasks/code-reviews/pending-meta-review/CodeReview_orderHelperFilters.md)

- **F01** â€” Massive Code Duplication in Filter Functions
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** â€” Multiple Passes Over Same Data in Batch Filters
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** â€” Missing Input Validation in normalizeGroupValuesForFilter
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/orderHelperRender.actionBar.js`
[CodeReview_orderHelperRender.actionBar.js.md](tasks/code-reviews/pending-meta-review/CodeReview_orderHelperRender.actionBar.js.md)

- **F01** â€” Incomplete Event Listener Cleanup â€” Memory Leak Risk
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** â€” Race Condition in Rapid Sort Changes â€” Potential Data Corruption
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** â€” Inconsistent UI Yielding in Bulk Operations â€” UI Freezing
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F04** â€” Missing Error Handling in Bulk Save Operations â€” Partial Data Loss Risk
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F05** â€” Redundant localStorage Writes â€” Performance Waste
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F06** â€” Missing Input Validation on Numeric Fields â€” Data Corruption Risk
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

