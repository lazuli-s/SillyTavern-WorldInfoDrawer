# DETAILED IMPLEMENTATION PLAN: Auto-refresh list panel after entry-editor duplicate/move/copy (Option B full refresh)

## Step S01: Add a scoped editor-action refresh gate and trigger full list refresh on matching WORLDINFO updates

- **Goal**
  Ensure the list panel refreshes automatically after duplicate, move, or copy actions that are initiated from the entry editor, using a full list refresh path for correctness. The refresh must be scoped so unrelated WORLDINFO updates do not force full refreshes, and current editor behavior must remain unchanged.

- **Extension Modules**
  - `index.js`: owns WORLDINFO event wiring, update pipeline (`updateWIChange`), and is the correct place to decide when to run full list refresh vs existing incremental sync.
  - `src/editorPanel.js`: owns entry editor lifecycle and can expose a short-lived, action-intent signal when editor-originated duplicate/move/copy is initiated.
  - `src/listPanel.js`: already provides `refreshList()` that rebuilds books/entries and re-applies search/filter state; no architecture change required.
  - `docs/GlobalStateMap.md` (reference only): confirms impacted global state (`cache`, `currentEditor`, `listPanelApi`, update-cycle tokens/promises).

- **ST Context**
  - `eventSource.on(event_types.WORLDINFO_UPDATED, ...)` receives world info updates.
  - Core world-info editor actions emit `WORLDINFO_UPDATED` after save operations.
  - Global world-info state and APIs used by this extension remain unchanged (`world_names`, `selected_world_info`, `loadWorldInfo`, `saveWorldInfo`, etc.).

- **Decision Points**
  - How to identify editor-originated actions without affecting other flows:
    - Use a short-lived internal flag/timestamp set only when duplicate/move/copy is started from the editor panel.
  - How to handle move/copy that can emit multiple updates in quick succession:
    - First matching update should trigger one full list refresh; additional immediate updates during the same action window should not cause repeated full rebuild loops.
  - How to preserve current editor behavior:
    - Keep existing editor selection/focus/navigation logic exactly as-is; only list refresh behavior changes.

- **Invariants**
  - Drag/drop move/copy from list panel must not change behavior.
  - Manual refresh button behavior must remain unchanged.
  - Existing incremental `updateWIChange` behavior for non-editor-triggered updates must remain unchanged.
  - Current editor open/close/focus behavior must remain unchanged.
  - Search filter and active-book filter behavior must remain unchanged, and must still be correctly applied after refresh.
  - No modifications under `vendor/SillyTavern`.

- **Smallest Change Set Checklist**
  - [ ] Add a minimal, internal editor-origin action marker (duplicate/move/copy only) that is set when action starts from the entry editor and expires quickly.
  - [ ] Update the WORLDINFO update handling path in `index.js` to detect that marker and execute `refreshList()` once per editor action window instead of only incremental update.
  - [ ] Keep existing incremental `updateWIChange` path intact for all updates outside that scoped marker.
  - [ ] Ensure full refresh path naturally re-runs current search/active filters through existing `refreshList()` behavior.
  - [ ] Add concise debug logging with existing `[STWID]` prefix for marker set/consume/expire and refresh trigger reason.

- **Risks**
  - If the marker window is too short, some editor move/copy updates may miss the full-refresh path and still appear stale.
  - If the marker window is too broad, unrelated WORLDINFO updates could trigger unnecessary full refreshes.
  - Multiple rapid updates from one action may cause duplicate refresh calls if marker consumption is not guarded.

- **Manual Test Steps**
  1. Open World Info Drawer and pick a book with visible entries.
  2. In the entry editor, click Duplicate (same-book) and confirm the list panel updates automatically without pressing Refresh.
  3. In the entry editor, use Move to send an entry to another book; confirm source and target lists update automatically.
  4. In the entry editor, use Copy to another book; confirm source keeps original and target gets copy automatically.
  5. Enable the list panel search filter, then repeat Duplicate/Move/Copy and confirm filtered visibility updates correctly after each action.
  6. Enable Active-only filter, then repeat Move/Copy involving active/inactive books and confirm filter state remains correct.
  7. Perform list-panel drag/drop move/copy (not from editor) and confirm behavior remains unchanged from current baseline.
  8. Confirm editor focus/selection behavior remains as before (no forced jumps beyond current behavior).

- **Console / Debug Checks**
  - Verify a single, explicit log when editor action marker is set (action type: duplicate/move/copy).
  - Verify a log when WORLDINFO update consumes marker and triggers full refresh.
  - Verify marker expiration/clear log when no matching update arrives in window.
  - Verify non-editor WORLDINFO updates continue through existing incremental path logs.
