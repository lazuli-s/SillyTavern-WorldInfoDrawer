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

- **Fix risk:** Medium
  If older host versions rely on those legacy exports and provide incomplete context fields, behavior may degrade to missing source-link metadata until compatibility rules are clarified.

- **Why it's safe to implement:**
  Source-link computation logic stays the same; only data access path changes to the officially supported context contract.

- **Pros:**
  Better resilience to ST internal refactors and fewer extension breakages after host updates.

### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  The finding is grounded in concrete code paths: module-level direct imports from `script.js`, `group-chats.js`, and `power-user.js`; fallback wiring in `getBookSourceRuntimeContext(...)`; and matching context fields in `st-context.js` (`chatMetadata`, `characters`, `groups`, `name1`, `characterId`, `groupId`, `powerUserSettings`, `eventSource`, `eventTypes`).

- **Top risks:**
  None.

#### Technical Accuracy Audit

No questionable claims — all assertions are traceable from code.

#### Fix Quality Audit

- **Direction:**
  Technically sound and stays in the correct module (`src/bookSourceLinks.js`) without crossing architecture boundaries.

- **Behavioral change:**
  No intended behavior change on supported ST versions. On legacy/partial-context hosts, source-link data can degrade to defaults; this trade-off is already acknowledged in Step 1 risk text.

- **Ambiguity:**
  One clear recommendation only (context-first/context-only reads).

- **Checklist:**
  Steps are actionable and implementation-ready.

- **Dependency integrity:**
  No cross-finding dependency.

- **Fix risk calibration:**
  Medium is appropriate because this touches initialization-time runtime context and event subscription inputs.

- **"Why it's safe" validity:**
  Valid. The safety claim is specific: source-link computation stays intact while only the data access path changes.

- **Verdict:** Ready to implement 🟢
  Confidence is High, no user-input blocker exists, and no claim requires deep unresolved analysis.

#### Implementation Checklist

> Verdict: Ready to implement 🟢 — no checklist revisions needed.

- [x] Remove top-level direct imports from `script.js`, `group-chats.js`, and `power-user.js`.
- [x] Refactor `getBookSourceRuntimeContext()` to context-only reads plus safe defaults.
- [x] Verify event subscription setup still no-ops safely when `eventSource` or `eventTypes` are missing.
- [x] Keep WI-specific direct imports (`METADATA_KEY`, `world_info`, `world_names`) unchanged.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/bookSourceLinks.js`
  - Removed direct imports from `script.js`, `group-chats.js`, and `power-user.js`.
  - Refactored `getBookSourceRuntimeContext()` to context-only reads with safe defaults for missing values.
  - Kept WI-specific direct imports (`METADATA_KEY`, `world_info`, `world_names`) unchanged.
  - Event subscriptions remain safe no-ops when context `eventSource` or `eventTypes` are missing.

- Risks / Side effects
  - Older/partial host context payloads may produce fewer source-link attributions until those fields are available in context (probability: ❗)
      - **🟥 MANUAL CHECK**: [ ] Open a chat, change chat/persona/character source books, and confirm source-link badges refresh without console errors.

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

- **Fix risk:** Low
  The change is local to group member matching and only alters ambiguous edge cases.

- **Why it's safe to implement:**
  Standard avatar-based group records continue to work exactly as before.

- **Pros:**
  More reliable source attribution and fewer incorrect icons/tooltips in multi-character groups.
  
### STEP 2: META CODE REVIEW

- **Evidence-based claims:**
  The code anchor is exact: `runtime.characters.find((it)=>it?.avatar === member || it?.name === member)`. This directly allows name fallback and `.find(...)` first-match behavior. The chosen character is then used by `addCharacterLinkedBooks(...)`, which drives `linksByBook` attribution shown in source icons/tooltips.

- **Top risks:**
  Missing evidence on trigger frequency. The finding is correct, but Step 1 does not quantify how often name-based members occur versus avatar-based members.

#### Technical Accuracy Audit

  > *"If two characters share the same name, the first one found is used, which can show wrong source icons and wrong tooltip names."*

- **Why it may be wrong/speculative:**
  The duplicate-name failure needs a specific trigger path: group member token must resolve through name fallback (not avatar match).

- **Validation:**
  Validated ✅ — ST group handling still includes avatar-or-name member lookups for compatibility (`group-chats.js` uses the same `avatar || name` pattern), so this edge case remains plausible.

#### Fix Quality Audit

- **Direction:**
  Sound and localized. Building maps once per refresh is cleaner and avoids repeated linear scans.

- **Behavioral change:**
  Yes. Ambiguous duplicate-name members would change from "pick first match" to "skip linking". That is observable and should be explicitly labeled as Behavior Change Required in the implementation task.

- **Ambiguity:**
  One recommendation path is provided.

- **Checklist:**
  Mostly actionable, but it should explicitly capture the behavior-change label and preserve unique-name fallback behavior while blocking ambiguous matches.

- **Dependency integrity:**
  No cross-finding dependency.

- **Fix risk calibration:**
  Low is acceptable because the change is scoped to source-attribution mapping and not persistence.

- **"Why it's safe" validity:**
  Partially valid. It needs an explicit note that only ambiguous fallback cases change behavior.

- **Verdict:** Implementation plan needs revision 🟡
  The fix direction is correct, but behavior-change labeling and checklist precision need tightening before implementation.

#### Implementation Checklist

> Verdict: Needs revision 🟡 — checklist auto-revised.
> Meta-review Reason: Behavioral change was not explicitly labeled and checklist did not pin the ambiguity contract.
> Revisions applied: Added an explicit behavior-change step and tightened fallback behavior guarantees for unique versus ambiguous name matches.

- [x] Mark this finding as `Behavior Change Required`: ambiguous duplicate-name fallback now skips linking instead of choosing the first match.
- [x] Precompute avatar and name lookup maps once per `buildLorebookSourceLinks(...)` refresh run.
- [x] Replace `.find(avatar || name)` with two-step resolution: avatar exact match first, then unique-name fallback only.
- [x] If name fallback returns multiple characters, skip linking for that member and emit a debug log for ambiguity.
- [x] Preserve existing behavior when avatar matches exist and when name fallback is uniquely resolvable.

### STEP 3: IMPLEMENTATION

#### Implementation Notes

- What changed
  - Files changed: `src/bookSourceLinks.js`
  - Applied the behavior change: ambiguous duplicate-name fallback now skips linking instead of selecting the first match.
  - Added one-pass avatar and name lookup maps per `buildLorebookSourceLinks(...)` run.
  - Replaced `.find(avatar || name)` with avatar-first resolution and unique-name fallback only.
  - Added debug logging for ambiguous duplicate-name fallback cases.
  - Preserved avatar-match and unique-name-match behavior.

- Risks / Side effects
  - Ambiguous duplicate-name members now show no character-source attribution instead of potentially incorrect attribution (probability: ⚪)
      - **🟥 MANUAL CHECK**: [ ] In a group with two characters sharing the same name, verify source icons do not attach that ambiguous member to the wrong book and a debug log appears.
