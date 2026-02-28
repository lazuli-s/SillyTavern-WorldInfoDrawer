# CODE REVIEW FINDINGS: `src/bookSourceLinks.js`

*Reviewed: February 27, 2026*

## Scope

- **File reviewed:** `src/bookSourceLinks.js`
- **Helper files consulted:** `index.js`, `src/drawer.js`, `src/listPanel.js`
- **Skills applied:** `st-js-best-practices` / `st-world-info-api`
- **FEATURE_MAP stated responsibilities:** Character/chat/persona lorebook source-link detection, source attribution metadata, refresh triggers, and list visibility re-application after source-link updates.

---

## F01: Context fallback still hard-depends on fragile direct ST imports

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  This file tries to use SillyTavern's safer context API first, but it still imports many old internal values directly. If SillyTavern changes those internal exports, this module can fail before the fallback logic even runs.

- **Location:**
  `src/bookSourceLinks.js` top-level imports and `getBookSourceRuntimeContext(...)`
  - `import { ... } from '../../../../../script.js';`
  - `import { groups ... } from '../../../../group-chats.js';`
  - `import { power_user ... } from '../../../../power-user.js';`

- **Detailed Finding:**
  The module imports `chat_metadata`, `characters`, `event_types`, `eventSource`, `name1`, `this_chid`, `groups`, `selected_group`, and `power_user` directly from internal ST files, then wraps them in `getBookSourceRuntimeContext()` as fallback values. This pattern still creates a hard load-time dependency on those internal exports.

  If upstream ST renames one export or moves internals, ESM import resolution fails before runtime, so the context-first fallback does not protect the extension. This violates `st-js-best-practices` COMPAT-01 ("Prefer getContext over direct ST imports") for values that are already available in `SillyTavern.getContext()`.

- **Why it matters:**
  A normal ST update can break source-link behavior (or module initialization) even when equivalent context fields still exist.

- **Severity:** Medium

- **Confidence:** High

- **Category:** JS Best Practice

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Remove direct imports for values already available through `SillyTavern.getContext()` and use context-only reads with safe defaults.

- **Proposed fix:**
  In `src/bookSourceLinks.js`, delete direct imports from `script.js`, `group-chats.js`, and `power-user.js`. Update `getBookSourceRuntimeContext()` to read only from `globalThis.SillyTavern?.getContext?.()`, with defensive defaults for missing fields:
  - `chatMetadata`: `{}` default
  - `characters`: `[]` default
  - `groups`: `[]` default
  - `eventTypes`: `{}` default
  - `eventSource`: `null` default
  Keep direct imports only for WI fields not exposed through context (`METADATA_KEY`, `world_info`, `world_names`) and keep the explicit comment for that exception.

- **Implementation Checklist:**
  - [ ] Remove top-level direct imports from `script.js`, `group-chats.js`, and `power-user.js`.
  - [ ] Refactor `getBookSourceRuntimeContext()` to context-only reads plus safe defaults.
  - [ ] Verify event subscription setup still no-ops safely when `eventSource` or `eventTypes` are missing.
  - [ ] Keep WI-specific direct imports (`METADATA_KEY`, `world_info`, `world_names`) unchanged.

- **Fix risk:** Medium
  If older host versions rely on those legacy exports and provide incomplete context fields, behavior may degrade to missing source-link metadata until compatibility rules are clarified.

- **Why it's safe to implement:**
  Source-link computation logic stays the same; only data access path changes to the officially supported context contract.

- **Pros:**
  Better resilience to ST internal refactors and fewer extension breakages after host updates.

<!-- META-REVIEW: STEP 2 will be inserted here -->

---

## F02: Group member fallback by character name can mis-attribute source links

### STEP 1. FIRST CODE REVIEW

- **Plain-language summary:**
  In group chats, this code can match a member by name if avatar matching fails. If two characters share the same name, the first one found is used, which can show wrong source icons and wrong tooltip names.

- **Location:**
  `src/bookSourceLinks.js` in `buildLorebookSourceLinks(...)`
  - `const character = runtime.characters.find((it)=>it?.avatar === member || it?.name === member);`

- **Detailed Finding:**
  Group member lookup currently uses one `.find(...)` with `avatar OR name`. Name is not a unique key, so when multiple characters share `name`, the first match wins. That character's primary/aux lorebooks are then attributed to the group member.

  This leads to incorrect `character` flags and incorrect `characterNames` attribution on books in `linksByBook`, which affects rendered source icons/tooltips and visibility filtering tied to source links.

- **Why it matters:**
  Users can see wrong lorebook source attribution in group mode, which undermines trust in the indicator UI.

- **Severity:** Medium

- **Confidence:** Medium

- **Category:** UI Correctness

#### ADDRESSING THE ISSUE

- **Suggested direction:**
  Treat avatar as authoritative, and only use a name fallback when it is unambiguous.

- **Proposed fix:**
  In `buildLorebookSourceLinks(...)`:
  - Build a quick lookup for `avatar -> character`.
  - Build a second lookup for `name -> characters[]`.
  - For each member, resolve by avatar first.
  - If avatar miss and name lookup returns exactly one character, use it.
  - If name lookup returns multiple characters, skip linking for that member and optionally `console.debug` an ambiguity warning.

- **Implementation Checklist:**
  - [ ] Precompute avatar and name lookup maps once per refresh call.
  - [ ] Replace the current `.find(avatar || name)` resolution with two-step lookup logic.
  - [ ] Add an ambiguity guard for duplicate names so no arbitrary character is selected.
  - [ ] Keep existing behavior unchanged when avatars are present and unique.

- **Fix risk:** Low
  The change is local to group member matching and only alters ambiguous edge cases.

- **Why it's safe to implement:**
  Standard avatar-based group records continue to work exactly as before.

- **Pros:**
  More reliable source attribution and fewer incorrect icons/tooltips in multi-character groups.

<!-- META-REVIEW: STEP 2 will be inserted here -->
