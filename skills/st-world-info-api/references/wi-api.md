# ST World Info API — Compact Reference

Sources: `vendor/SillyTavern/public/scripts/world-info.js` · `st-context.js` · `events.js`

---

## Ownership Summary

> **Rule:** ST owns truth, persistence, and lifecycle. The extension is a UI/controller layer only.

| What | Owner | Rule |
|---|---|---|
| WI book files on disk | **ST** | Never write directly via fetch — use `saveWorldInfo()` |
| `worldInfoCache` | **ST** | Never mutate cache entries — load fresh, mutate, save back |
| `world_names` array | **ST** | Read-only from extension — call `updateWorldInfoList()` after changes |
| `selected_world_info` array | **ST** | Mutate only through documented APIs (`onWorldInfoChange`, slash cmds) |
| WI settings (depth, budget, etc.) | **ST** | Use `getWorldInfoSettings()` to read; write via ST settings UI |
| `world_info.charLore` | **ST** | Use `charUpdatePrimaryWorld()` / `charUpdateAddAuxWorld()` |
| Extension UI state | **Extension** | Own it entirely |
| Extension settings (`extension_settings[MODULE]`) | **Extension** | Own it entirely, save via `saveSettingsDebounced()` |

---

## 1. Book CRUD

All available via `getContext()`.

```js
const {
    loadWorldInfo,       // async (name: string) → data | null
    saveWorldInfo,       // async (name, data, immediately?: bool) → void
    updateWorldInfoList, // async () → void   — refreshes world_names + UI selects
    reloadWorldInfoEditor, // (name, loadIfNotSelected?) → void — force editor refresh
    convertCharacterBook,  // (book) → WI data format — convert character card lorebook
} = SillyTavern.getContext();
```

**Patterns:**
```js
// Load (uses cache automatically — safe to call repeatedly)
const data = await loadWorldInfo('MyBook');

// Mutate + save (debounced by default; pass true for immediate)
data.entries[uid].content = 'new content';
await saveWorldInfo('MyBook', data);         // debounced
await saveWorldInfo('MyBook', data, true);   // immediate

// After creating/renaming/deleting a book, refresh the list
await updateWorldInfoList();
```

✅ Always mutate a loaded copy, then call `saveWorldInfo`.
❌ Never write to `worldInfoCache` directly.
❌ Never call `/api/worldinfo/edit` yourself — `saveWorldInfo` does it and updates the cache.
❌ Never call `/api/worldinfo/get` yourself — `loadWorldInfo` does it and caches the result.

---

## 2. Entry CRUD

These are **NOT** on `getContext()` — import from world-info.js directly if needed, or replicate the logic.

```js
// From vendor/SillyTavern/public/scripts/world-info.js
import { createWorldInfoEntry } from '../path/to/world-info.js'; // reference only

// Usage pattern (replicate in extension if import is not available):
const newUid = getFreeWorldEntryUid(data);          // internal ST fn
const newEntry = { uid: newUid, ...structuredClone(newWorldInfoEntryTemplate) };
data.entries[newUid] = newEntry;
await saveWorldInfo(bookName, data);
```

✅ Use `createWorldInfoEntry(name, data)` when available — it handles UID generation.
❌ Never assign UIDs manually (collision risk).
❌ Never build a blank entry from scratch — use `newWorldInfoEntryTemplate` shape as base.

**Delete an entry:**
```js
delete data.entries[uid];
await saveWorldInfo(bookName, data);
```

---

## 3. WI Entry Shape (`newWorldInfoEntryDefinition`)

Every field name, type, and default. Used as ground truth for reading/writing entries.

| Field | Type | Default | Notes |
|---|---|---|---|
| `uid` | `number` | auto | Auto-assigned — never set manually |
| `key` | `string[]` | `[]` | Primary trigger keys |
| `keysecondary` | `string[]` | `[]` | Secondary/filter keys |
| `comment` | `string` | `''` | Display title / memo |
| `content` | `string` | `''` | The injected prompt text |
| `constant` | `boolean` | `false` | Always active, ignores keys |
| `disable` | `boolean` | `false` | Entry is inactive |
| `selective` | `boolean` | `true` | Uses secondary key logic |
| `selectiveLogic` | `enum` | `AND_ANY (0)` | See `world_info_logic` enum |
| `position` | `number` | `0` | See `world_info_position` enum |
| `role` | `enum` | `0` | Used when `position = atDepth` |
| `depth` | `number` | `4` | `DEFAULT_DEPTH` — depth when `position = atDepth` |
| `order` | `number` | `100` | Priority order (higher = inserted earlier) |
| `probability` | `number` | `100` | % chance of activation (0–100) |
| `useProbability` | `boolean` | `true` | Whether probability is applied |
| `group` | `string` | `''` | Group scoring group name |
| `groupOverride` | `boolean` | `false` | Overrides group selection |
| `groupWeight` | `number` | `100` | `DEFAULT_WEIGHT` |
| `scanDepth` | `number?` | `null` | Override global scan depth |
| `caseSensitive` | `boolean?` | `null` | Override global setting |
| `matchWholeWords` | `boolean?` | `null` | Override global setting |
| `useGroupScoring` | `boolean?` | `null` | Override global setting |
| `vectorized` | `boolean` | `false` | Use vector similarity for matching |
| `ignoreBudget` | `boolean` | `false` | Ignore token budget |
| `excludeRecursion` | `boolean` | `false` | Skip in recursion scans |
| `preventRecursion` | `boolean` | `false` | Prevent this entry from triggering recursion |
| `delayUntilRecursion` | `number` | `0` | Wait N recursion steps before activating |
| `sticky` | `number?` | `null` | Stay active for N messages after trigger |
| `cooldown` | `number?` | `null` | Cooldown period in messages |
| `delay` | `number?` | `null` | Delay activation until N messages in chat |
| `automationId` | `string` | `''` | ID for automation/scripting targeting |
| `outletName` | `string` | `''` | Named outlet injection target |
| `addMemo` | `boolean` | `false` | Auto-populate comment from key |
| `triggers` | `string[]` | `[]` | Generation type triggers |
| `matchPersonaDescription` | `boolean` | `false` | Scan persona description |
| `matchCharacterDescription` | `boolean` | `false` | Scan char description |
| `matchCharacterPersonality` | `boolean` | `false` | Scan char personality |
| `matchCharacterDepthPrompt` | `boolean` | `false` | Scan char depth prompt |
| `matchScenario` | `boolean` | `false` | Scan scenario field |
| `matchCreatorNotes` | `boolean` | `false` | Scan creator notes |
| `characterFilter` | `object` | `{isExclude:false, names:[], tags:[]}` | Character filter config |

> `characterFilterNames`, `characterFilterTags`, `characterFilterExclude` are virtual fields used only by slash commands — they map to `characterFilter.*` internally and are **excluded from the entry template**.

---

## 4. Key Enums and Constants

```js
// world_info_position — entry.position values
world_info_position = {
    before: 0,    // Before character card
    after: 1,     // After character card
    ANTop: 2,     // Before Author's Note
    ANBottom: 3,  // After Author's Note
    atDepth: 4,   // At chat depth (uses entry.depth + entry.role)
    EMTop: 5,     // Before example messages
    EMBottom: 6,  // After example messages
    outlet: 7,    // Named outlet (uses entry.outletName)
};

// world_info_logic — entry.selectiveLogic values
world_info_logic = {
    AND_ANY: 0,   // Any secondary key must match
    NOT_ALL: 1,   // Not all secondary keys should match
    NOT_ANY: 2,   // No secondary key should match
    AND_ALL: 3,   // All secondary keys must match
};

// wi_anchor_position — for anchor-type entries
wi_anchor_position = {
    before: 0,
    after: 1,
};

// Constants
DEFAULT_DEPTH = 4;
DEFAULT_WEIGHT = 100;
MAX_SCAN_DEPTH = 1000;
SORT_ORDER_KEY = 'world_info_sort_order';  // accountStorage key
METADATA_KEY = 'world_info';              // chat_metadata key for chat-bound book
```

---

## 5. WI-Specific Events

Subscribe via `eventSource.on(eventTypes.EVENT_NAME, handler)`.

| Event | When it fires | Payload |
|---|---|---|
| `WORLDINFO_UPDATED` | After `saveWorldInfo` completes | `(name: string, data: object)` |
| `WORLDINFO_FORCE_ACTIVATE` | External code forces entry activation | `(entries: WIScanEntry[])` |
| `WORLDINFO_SETTINGS_UPDATED` | WI global settings changed | `(settings: object)` |
| `WORLDINFO_ENTRIES_LOADED` | Entries loaded into editor | — |
| `WORLDINFO_SCAN_DONE` | WI scan for prompt generation finished | — |
| `WORLD_INFO_ACTIVATED` | Entries were activated during prompt gen | `(entries: WIScanEntry[])` |
| `CHAT_CHANGED` | Chat or character switched | — (re-check `chat_metadata[METADATA_KEY]`) |

```js
const { eventSource, eventTypes } = SillyTavern.getContext();

// React to any book save
eventSource.on(eventTypes.WORLDINFO_UPDATED, (name, data) => {
    if (name === myCurrentBook) refreshMyUI(data);
});

// Clean up on unload
eventSource.removeListener(eventTypes.WORLDINFO_UPDATED, myHandler);
```

✅ Always remove listeners on teardown to avoid memory leaks.
❌ Never emit `WORLDINFO_UPDATED` yourself — it is ST-internal.
❌ Never emit `WORLDINFO_FORCE_ACTIVATE` from the extension UI layer — it bypasses normal WI rules.

---

## 6. WI Global Settings (Read-Only from Extension)

```js
// Read current settings
const {
    world_info_depth,                  // number — scan depth (default: 2)
    world_info_min_activations,        // number — minimum activated entries
    world_info_min_activations_depth_max, // number
    world_info_budget,                 // number — % token budget (0–100)
    world_info_budget_cap,             // number — hard cap in tokens (0 = none)
    world_info_include_names,          // boolean
    world_info_recursive,              // boolean
    world_info_overflow_alert,         // boolean
    world_info_case_sensitive,         // boolean
    world_info_match_whole_words,      // boolean
    world_info_use_group_scoring,      // boolean
    world_info_character_strategy,     // number — see world_info_insertion_strategy enum
    world_info_max_recursion_steps,    // number
} = getWorldInfoSettings(); // from world-info.js

// OR via getContext():
// These are NOT directly on getContext() — use getWorldInfoSettings() or read from world-info.js module scope
```

```js
// world_info_insertion_strategy — world_info_character_strategy values
world_info_insertion_strategy = {
    evenly: 0,
    character_first: 1,
    global_first: 2,
};
```

✅ Read settings to inform UI display or feature logic.
❌ Never write to `world_info_depth` etc. directly from the extension — these are ST-owned globals.
❌ Never call `updateWorldInfoSettings()` or `setWorldInfoSettings()` from the extension — these are ST-internal.

---

## 7. World / Book Lists and Selection

```js
// world_names — array of all available WI book names (ST-owned, read-only)
// selected_world_info — array of globally active book names (ST-owned, read-only)

// Both are module-level exports from world-info.js, not on getContext()
// Access via worldInfoCache for book data

// Check if a book exists:
world_names.includes('MyBook');  // read-only check — safe

// Refresh after any book creation/rename/delete:
await updateWorldInfoList();  // from getContext()
```

✅ Use `updateWorldInfoList()` after modifying the book list.
❌ Never push/splice `world_names` or `selected_world_info` directly.

---

## 8. Character Lorebook APIs

```js
// Primary lorebook (shown in character card editor)
// NOT on getContext() — internal world-info.js functions
charUpdatePrimaryWorld(name: string) → Promise<void>
// Sets character's primary lorebook. Also calls setWorldInfoButtonClass.

charUpdateAddAuxWorld(characterKey: string, nameOrNames: string | string[]) → Promise<void>
// Adds auxiliary lorebook(s) to a character's extra books list.

// Read character lorebook name:
const character = context.characters[context.characterId];
const primaryBook = character?.data?.extensions?.world ?? '';

// Read aux books (via world_info.charLore):
world_info.charLore?.find(e => e.name === charAvatarKey)?.extraBooks ?? []
```

✅ Use these ST functions to assign lorebooks — they handle cache + UI refresh.
❌ Never write `character.data.extensions.world` directly — call `charUpdatePrimaryWorld`.

---

## 9. Chat-Bound Book (chat_metadata)

```js
// chat_metadata key:
const METADATA_KEY = 'world_info';  // string value = the book name

// Read:
const chatBook = chat_metadata[METADATA_KEY];  // may be undefined

// Write (via extension, after creating the book):
chat_metadata[METADATA_KEY] = newBookName;
await saveMetadata();  // from getContext()

// Verify it's a valid book:
world_names.includes(chat_metadata[METADATA_KEY]);
```

✅ After assigning, call `saveMetadata()` and update the UI button class.
❌ Never write to `chat_metadata` without calling `saveMetadata()` — changes won't persist.

---

## 10. worldInfoCache

```js
// StructuredCloneMap — automatically deep-clones on read
worldInfoCache.has(name)    // boolean
worldInfoCache.get(name)    // returns deep clone — safe to mutate
worldInfoCache.set(name, data) // saveWorldInfo() calls this automatically
worldInfoCache.delete(name)    // deleteWorldInfo() calls this automatically
```

✅ Use `loadWorldInfo(name)` — it reads from cache automatically.
❌ Never call `worldInfoCache.set()` from the extension — `saveWorldInfo` manages this.
❌ Never hold a reference to a cached object and mutate it over time — always get a fresh copy.

---

## 11. Anti-Patterns Quick Reference

| ❌ Don't reinvent | ✅ Use instead |
|---|---|
| Manual fetch to `/api/worldinfo/get` | `loadWorldInfo(name)` |
| Manual fetch to `/api/worldinfo/edit` | `saveWorldInfo(name, data)` |
| Manual fetch to `/api/worldinfo/delete` | `deleteWorldInfo(name)` (not on getContext — import if needed) |
| Building a blank entry object manually | `createWorldInfoEntry(bookName, data)` |
| Assigning UIDs yourself | `createWorldInfoEntry` handles it |
| Maintaining your own book name list | Read `world_names` (ST-owned) |
| Writing lorebook to character directly | `charUpdatePrimaryWorld()` / `charUpdateAddAuxWorld()` |
| Custom debounce for saving | `saveWorldInfo(name, data)` is already debounced |
| Storing WI book data in `extensionSettings` | Store only UI preferences there — book data lives in `worldInfoCache`/server |
| Emitting WI events yourself | Only ST emits `WORLDINFO_UPDATED`, `WORLD_INFO_ACTIVATED`, etc. |
| Implementing your own entry filter | `worldInfoFilter` (FilterHelper) already exists |
| Implementing your own entry sort | `sortWorldInfoEntries(entries)` already exists |
