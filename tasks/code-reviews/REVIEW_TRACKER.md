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
[CodeReview_listPanel.state.js.md](tasks/code-reviews/pending-meta-review/CodeReview_listPanel.state.js.md)

- **F01** â€” Potential data loss in folder collapse state persistence
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** â€” Book collapse state capture may miss updates due to DOM timing
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** â€” Entry search cache lacks eviction limits
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/listPanel.js`
[CodeReview_listPanel.js.md](tasks/code-reviews/pending-meta-review/CodeReview_listPanel.js.md)

- **F01** â€” Unhandled Promise Rejections in Async Book Operations
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** â€” Race Condition Between Save and Refresh in setBookSortPreference
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** â€” Missing DOM Attachment Check in applyCollapseState
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F04** â€” refreshWorkerPromise Null Race in refreshList
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/listPanel.coreBridge.js`
[CodeReview_listPanel.coreBridge.js.md](tasks/code-reviews/pending-meta-review/CodeReview_listPanel.coreBridge.js.md)

- **F01** â€” Race Condition in Value Verification Timing
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/listPanel.booksView.js`
[CodeReview_listPanel.booksView.js.md](tasks/code-reviews/pending-meta-review/CodeReview_listPanel.booksView.js.md)

- **F01** â€” Race Condition in Active Toggle Handler
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** â€” Optimistic UI Rollback May Discard User Edits
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** â€” Event Listeners on Dynamic DOM Elements Not Cleaned Up
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F04** â€” Yield Frequency May Be Insufficient for Large Datasets
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/bookSourceLinks.js`
[CodeReview_bookSourceLinks.js.md](tasks/code-reviews/pending-implementation/CodeReview_bookSourceLinks.js.md)

- **F01** - Context fallback still hard-depends on fragile direct ST imports
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¢
    - Reason: N/A
  - Neglect Risk: Medium â— â€” direct-import fragility can break source-link behavior after host export changes.
  - Implemented:
- **F02** - Group member fallback by character name can mis-attribute source links
  - Meta-reviewed: [X]
    - Verdict: ðŸŸ¡
    - Reason: behavior-change label and checklist precision need revision before implementation.
  - Neglect Risk: Medium â— â€” mis-attribution is an edge-case UI correctness issue, but still user-visible when triggered.
  - Implemented:

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
[CodeReview_listPanel.bookMenu.js.md](tasks/code-reviews/pending-meta-review/CodeReview_listPanel.bookMenu.js.md)

- **F01** - Event listener leak in openImportDialog
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** - Unsanitized user input in move book dialog
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** - Keyboard accessibility missing on menu items
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F04** - No dirty check before Fill Empty Titles action
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F05** - Duplicate book polling may miss fast updates
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F06** - Potential race condition in importFolderFile rollback
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/listPanel.foldersView.js`
[CodeReview_listPanel.foldersView.js.md](tasks/code-reviews/pending-meta-review/CodeReview_listPanel.foldersView.js.md)

- **F01** - Hidden folders processed unnecessarily in active toggle update
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/listPanel.selectionDnD.js`
[CodeReview_listPanel.selectionDnD.js.md](tasks/code-reviews/pending-meta-review/CodeReview_listPanel.selectionDnD.js.md)

- **F01** â€” Race condition between book load and save operations
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** â€” Missing error handling leaves UI in inconsistent state
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** â€” Partial failure in bulk move creates data inconsistency
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F04** â€” Uses undocumented runtime APIs not in WI API reference
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
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