# Code Review Tracker

Track all code-review findings across the extension's JS files.

## Reviewed Files

### `src/listPanel.coreBridge.js`
[CodeReview_listPanel.coreBridge.js.md](tasks/code-reviews/pending-meta-review/CodeReview_listPanel.coreBridge.js.md)

- **F01** — Race Condition in Value Verification Timing
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/listPanel.booksView.js`
[CodeReview_listPanel.booksView.js.md](tasks/code-reviews/pending-meta-review/CodeReview_listPanel.booksView.js.md)

- **F01** — Race Condition in Active Toggle Handler
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** — Optimistic UI Rollback May Discard User Edits
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** — Event Listeners on Dynamic DOM Elements Not Cleaned Up
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F04** — Yield Frequency May Be Insufficient for Large Datasets
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/bookSourceLinks.js`
[CodeReview_bookSourceLinks.js.md](tasks/code-reviews/pending-meta-review/CodeReview_bookSourceLinks.js.md)

- **F01** - Context fallback still hard-depends on fragile direct ST imports
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** - Group member fallback by character name can mis-attribute source links
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/drawer.js`
[CodeReview_drawer.js.md](tasks/code-reviews/pending-meta-review/CodeReview_drawer.js.md)

- **F01** - Direct Imports from ST Core Modules Bypass Stable Context API
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F02** - MutationObserver `moSel` Never Disconnected
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F03** - `moDrawer` MutationObserver Never Disconnected
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F04** - Selection Visibility Check Race Condition in Delete Handler
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:
- **F05** - Potential Stale Reference to `selectionState`
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
  - Implemented:

### `src/editorPanel.js`
[CodeReview_editorPanel.js.md](tasks/code-reviews/pending-meta-review/CodeReview_editorPanel.js.md)

- **F01** - Code duplication in activation settings display logic
  - Meta-reviewed: [ ]
    - Verdict:
    - Reason:
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