# IMPLEMENTATION: Lorebook Row Source Icons (Character, Chat, Persona)

## Step S01: Add source icons to each lorebook row and keep them synchronized with chat/persona/character context changes.

- **Goal**
  Add non-interactive source icons to every lorebook row, positioned immediately left of the row's existing global activation checkbox, with fixed order (character, chat, persona), multi-icon support, and tooltips, while reusing existing row rendering/state and ensuring icon state updates immediately when relevant SillyTavern context changes.

- **Extension Modules**
  `index.js`: Own one in-memory source-membership map keyed by lorebook name, subscribe to context-change events, recompute membership, and trigger row icon refresh without changing entry/editor/order-helper logic.
  `src/listPanel.js`: Extend lorebook row render path to include a dedicated source-icon container in `.stwid--actions` just before the existing checkbox, and expose a small row-level refresh hook for source icons.
  `style.css`: Add minimal scoped styling for the new source-icon container and icon spacing/alignment so header layout stays stable.
  `docs/GlobalStateMap.md`: Document the new long-lived source-membership state and update triggers so future changes stay aligned with current architecture.

- **ST Context**
  Existing extension imports/state already used and reused: `selected_world_info`, `world_names`, `eventSource`, `event_types`, and existing `cache[name].dom` row references.
  SillyTavern world-info source model (reference-only): global source from `selected_world_info`, chat source from `chat_metadata[METADATA_KEY]`, persona source from `power_user.persona_description_lorebook`, and character source from primary character world plus `world_info.charLore` auxiliary books.
  Group behavior requirement (any member): source resolution must include character-linked books for all active group members, not only the currently focused character.
  Immediate sync requirement: rely on existing `WORLDINFO_SETTINGS_UPDATED` and `WORLDINFO_UPDATED` handling, plus additional context-change listeners needed to catch chat/persona/character link changes as soon as they occur.

- **Decision Points**
  Choose canonical source-resolution inputs so empty linked lorebooks still receive icons (do not infer sources only from loaded entry arrays).
  Choose exact event set for immediate updates when links change outside global WI toggle flow (chat assignment, persona assignment, character/world binding changes, and chat switches).
  Define conflict handling when a lorebook is linked by multiple sources: always render all applicable icons in fixed left-to-right order.
  Define fallback when referenced lorebook name is missing from `world_names`: ignore for row rendering to avoid creating invalid UI state.

- **Invariants**
  Keep current lorebook row behavior unchanged: title click collapse, drag/drop, menu actions, and activation checkbox semantics remain exactly as-is.
  Keep global active filter behavior unchanged: icons are informational and must not affect `selected_world_info` filtering/toggling logic.
  Keep cache/update architecture unchanged: no vendor edits, no new backend paths, no order-helper/editor behavior changes.
  Keep visual contract unchanged except for added icons: no layout shifts that hide existing controls, no reordering of existing action buttons.
  Keep icon display rules fixed: show nothing for global-only linkage, show character/chat/persona icons only for those sources, and show multiple icons when multiple sources apply.

- **Smallest Change Set Checklist**
  [x] Add one source-membership state object in `index.js` keyed by lorebook name with three booleans (`character`, `chat`, `persona`) and one recompute function that reads current ST context and group members.
  [x] Add one event-wiring block in `index.js` that calls the recompute function and row-refresh hook on all required context-change events, including existing WI events and additional chat/persona/character-relevant events.
  [x] Extend `src/listPanel.js` lorebook row render to create/store a source-icon container DOM reference immediately before the existing activation checkbox inside `.stwid--actions`.
  [x] Add one `src/listPanel.js` row-level updater that receives per-book source flags and renders icons in strict order `character -> chat -> persona` with per-icon tooltip text.
  [x] Trigger that updater during initial row render and during incremental updates, reusing existing cache DOM references instead of rebuilding book rows.
  [x] Add minimal scoped CSS in `style.css` for source-icon container spacing, icon alignment, and non-interactive visual styling consistent with existing action-row density.
  [ ] Document the new source-membership state and update triggers in `docs/GlobalStateMap.md`.

- **Risks**
  Stale icons after persona/chat assignment if one relevant ST event is not included in the recompute trigger list.
  Incorrect group-member character icon coverage if member-to-character mapping uses the wrong identifier for auxiliary lore lookup.
  Header action crowding on narrow list widths if icon container spacing is not constrained.

- **Manual Test Steps**
  Open the World Info Drawer and confirm existing controls still appear in each lorebook header (menu, add, collapse, checkbox).
  Prepare at least five lorebooks so each case exists: one global-only, one character-only, one chat-only, one persona-only, and one linked to at least two sources.
  Verify icon placement for every row: icons appear immediately to the left of the activation checkbox.
  Verify icon order on multi-source rows: character icon first, then chat, then persona.
  Hover each icon and verify tooltip label text matches source (`Character`, `Chat`, `Persona`).
  Verify global-only row shows no source icon even when its checkbox is enabled.
  Switch to a different chat and confirm chat/persona/character source icons update immediately without manual refresh.
  In a group chat, change member composition or member-linked lore and confirm any-member character-linked lorebooks show the character icon.
  Toggle global activation checkbox on rows and confirm only checkbox state changes; source icons remain based on link source, not global toggle.
  Run a normal drawer refresh and confirm icons remain correct after list rebuild.

- **Console / Debug Checks**
  Add a single debug prefix for this feature (for example, `[STWID][SOURCE_ICONS]`) and log: trigger event name, number of books with each source flag, and number of rows refreshed.
  Confirm no repeated high-frequency log spam during idle state; logs should appear only on relevant context-change events or explicit list refresh.