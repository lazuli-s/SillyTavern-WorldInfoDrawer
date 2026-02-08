# SillyTavern Boundary / Ownership Map

- This file defines the safe boundary for code changes: use extension-owned surfaces, do not modify vanilla-owned behavior.
- It anchors decisions to explicit ownership and listed integration points.
- Provides a quick checklist for where to read, where to hook, and what not to treat as extension responsibility.

## High-Level System Diagram

[User] <--> [WorldInfoDrawer Extension UI] <--> [Vanilla SillyTavern Frontend Runtime]
                                               |
                                               +--> [World Info APIs + Event Bus]
                                               |
                                               +--> [Core WI DOM/Templates]
                                               |
                                               +--> [Core Persistence Endpoints/Storage]

## Ownership (Vanilla SillyTavern)

- World Info/Lorebook data model, persistence, and canonical state (`world_info`, `world_names`, `selected_world_info`)
- World Info CRUD and entry lifecycle operations exposed by core world-info APIs
- Global World Info activation settings state and propagation
- Core event bus lifecycle and event emission (`eventSource`, `event_types`)
- Core World Info drawer/container markup and built-in control elements in `public/index.html`
- Core World Info templates and editor fragments used by extensions (`entry_edit_template`, keyword header template, chat/persona lorebook templates)
- Core app state for chat, character, group, and persona linkage used to derive lorebook sources
- Extension settings persistence substrate (`extension_settings`, `saveSettingsDebounced`)
- Built-in popup, template rendering, slash-command parsing, and shared utility modules
- Extension discovery/registry state (`extensionNames`) for cross-extension availability checks

## Extension Responsibilities

- Rendering and maintaining the custom full-screen World Info drawer UI layer
- Mapping user interactions in the custom UI to SillyTavern World Info API calls
- Maintaining extension-local UI/session state (selection, collapse, splitter width, order-helper preferences)
- Persisting extension-owned preferences under its namespace in extension settings/localStorage
- Subscribing to relevant SillyTavern events and reconciling custom UI state after core updates
- Delegating selected actions to core World Info controls when the extension relies on core handlers
- Reading core chat/character/group/persona linkage state to display extension-level source indicators
- Handling optional third-party extension interoperability through extension-name presence checks

## Integration Surfaces

- `public/scripts/world-info.js`: `loadWorldInfo`, `saveWorldInfo`, `createNewWorldInfo`, `createWorldInfoEntry`, `deleteWorldInfo`, `deleteWorldInfoEntry`, `deleteWIOriginalDataValue`, `getWorldEntry`, `getFreeWorldName`, `onWorldInfoChange`, `METADATA_KEY`, `world_info`, `world_names`, `selected_world_info`
- `public/scripts/events.js` via `script.js`: `eventSource.on(...)` with `WORLDINFO_UPDATED`, `WORLDINFO_SETTINGS_UPDATED`, `CHAT_CHANGED`, `GROUP_UPDATED`, `CHARACTER_EDITED`, `CHARACTER_PAGE_LOADED`, `SETTINGS_UPDATED`
- `public/scripts/templates.js`: `renderTemplateAsync(...)` for core template fragments
- `public/scripts/popup.js`: `Popup.show.*` interaction surfaces for confirm/input flows
- `public/scripts/extensions.js`: `extension_settings` and `extensionNames`
- `public/script.js`: `saveSettingsDebounced`, `chat_metadata`, `characters`, `this_chid`, `eventSource`, `event_types`, `getRequestHeaders`
- `public/scripts/group-chats.js`: `groups`, `selected_group`
- `public/scripts/power-user.js`: `power_user` (persona lorebook linkage)
- `public/scripts/utils.js`: shared helpers used by the extension (`debounce`, `debounceAsync`, `delay`, `download`, `getCharaFilename`, `getSortableDelay`, `isTrueBoolean`, `uuidv4`)
- Core DOM anchors used as hook points: `#WorldInfo`, `#world_info`, `#world_editor_select`, `#world_create_button`, `#world_import_file`, `#world_duplicate`, `#world_popup_delete`, `#world_popup_name_button`, `#wiActivationSettings`, `#entry_edit_template`
- Core lorebook selector surfaces: `.chat_world_info_selector`, `.persona_world_info_selector`
- Host-provided globals used by the extension runtime: `toastr`, `$`, `hljs`

## Mental Model

- SillyTavern owns lorebook truth, persistence, lifecycle, and core UI contracts; the extension owns an alternate presentation/controller layer.
- The extension must treat SillyTavern APIs, events, and named DOM/template anchors as the only integration contract.
- The extension should never modify vendored core code and should keep all behavior layered through imported surfaces and runtime hooks.
