# Vanilla SillyTavern World Info (Lorebook) Logic — Beginner Guide

> This document explains **Vanilla SillyTavern** lorebook logic (called **World Info** in the code).
> It is intentionally written for someone with **zero programming background**.
>
> Scope:
> - **Vanilla ST only** (from the `/vendor/SillyTavern` submodule).
> - No extension-specific behavior is described here.

---

## 1) First: what is a “lorebook” in SillyTavern?

In SillyTavern, a **lorebook** is just a file that holds **entries**. Each entry is like a note card:

- It has **keywords** (what to look for in the chat)
- It has **content** (what text to insert into the prompt)

When you generate text, SillyTavern **scans the chat** for those keywords, decides which entries should “activate,” and then inserts the activated entry content into the prompt that goes to the AI.

> In the code, this system is called **World Info**.

---

## 2) The big picture flow (simple version)

1. **Collect entries** from different sources (global, character, chat, persona).
2. **Sort and prepare** entries (ordering, decorators, hashing).
3. **Scan the chat** and evaluate each entry’s rules.
4. **Apply probability + budget rules**.
5. **Insert activated content** into the prompt.

---

## 3) Main variables (the “knobs” and stored data)

These are the **core variables** that the vanilla system keeps in memory:

### Core settings (“knobs”)
- `world_info_depth`: how far back in chat the scan looks.
- `world_info_budget`: % of max context reserved for World Info text.
- `world_info_budget_cap`: hard maximum token budget.
- `world_info_include_names`: include entry names when building prompt text.
- `world_info_recursive`: allow recursion scanning.
- `world_info_min_activations`: keep scanning until at least this many entries activate.
- `world_info_min_activations_depth_max`: maximum depth for “min activations.”
- `world_info_overflow_alert`: warn when the budget is exceeded.
- `world_info_case_sensitive`: case-sensitive matching toggle.
- `world_info_match_whole_words`: match whole words only.
- `world_info_use_group_scoring`: enable scoring for inclusion groups.
- `world_info_max_recursion_steps`: stop after this many recursion loops.
- `world_info_character_strategy`: how to order character vs global lorebooks.

### Stored data
- `world_names`: all known lorebook names.
- `selected_world_info`: the globally selected lorebooks.
- `world_info`: the settings object saved to disk.
- `worldInfoCache`: an in-memory cache of loaded lorebooks.

### Enums & constants (named choices)
- `world_info_insertion_strategy`: the available ordering strategies.
- `world_info_logic`: logic modes for secondary keyword matching.
- `scan_state`: scan loop states (initial, recursion, min-activations).
- `world_info_position`: where entry content is inserted in the prompt.
- `wi_anchor_position`: anchor positions for some prompt sections.
- `DEFAULT_DEPTH`, `DEFAULT_WEIGHT`, `MAX_SCAN_DEPTH`: default limits.

---

## 4) Helper classes & utilities (what they do, simply)

Helpers are small tools used by the main logic:

- **`WorldInfoBuffer`**: stores the text to scan (chat + recursion + injected prompts).
- **`WorldInfoTimedEffects`**: tracks sticky/cooldown/delay effects across chat.
- **`FilterHelper`**: used for editor filtering (not part of scanning, but tied to World Info UI).
- **`StructuredCloneMap`**: cache helper used for `worldInfoCache`.

---

## 5) Main functions (what each does, in simple words)

### Loading & saving
- `loadWorldInfo(name)`: fetch a lorebook (uses cache).
- `saveWorldInfo(name, data, immediately)`: save lorebook data.
- `createNewWorldInfo(name)`: create a new empty lorebook.
- `createWorldInfoEntry(name, data)`: create a new entry inside a lorebook.
- `deleteWorldInfo(name)`: delete a lorebook file.
- `deleteWorldInfoEntry(data, uid)`: delete a single entry.

### UI helpers
- `updateWorldInfoList()`: refresh list of lorebooks in the UI.
- `showWorldEditor(name)`: load a lorebook into the editor.

### Settings
- `setWorldInfoSettings(settings, data)`: apply saved settings + load lists.
- `updateWorldInfoSettings(settings, activeWorldInfo)`: update settings while running.

### Entry collection & scan
- `getSortedEntries()`: merge entries from all sources + sort them.
- `getWorldInfoPrompt(chat, maxContext, isDryRun, globalScanData)`: returns final World Info text for the prompt.
- `checkWorldInfo(chat, maxContext, isDryRun, globalScanData)`: the core scanning/activation logic.

### Automation & commands
- `registerWorldInfoSlashCommands()`: registers slash commands related to lorebooks.

---

## 6) Where entries come from (the 4 sources)

Vanilla ST merges entries from **four places**:

1. **Global lorebooks** — the ones you selected in the UI.
2. **Character lorebooks** — the main character lorebook (plus extra ones).
3. **Chat lorebook** — the lorebook tied to the current chat.
4. **Persona lorebook** — the lorebook tied to your persona.

SillyTavern is careful **not to double‑count** the same lorebook if it’s already active elsewhere.

---

## 7) How entries are ordered (insertion strategy)

When SillyTavern merges entries, it applies a **strategy** for “global vs character” ordering:

- **Evenly**: mix them together
- **Character first**: character entries go before global entries
- **Global first**: global entries go before character entries

After that:

- **Chat lore** goes first
- **Persona lore** goes next
- Then the rest of the combined list

This ordering matters because later logic processes entries in this sequence.

---

## 8) What’s inside a lorebook entry (fields you should know)

Each entry has many fields. Think of them as **settings for that one entry**.

Here are the most important ones:

### Matching & content
- `key`: the **primary keywords**
- `keysecondary`: **secondary keywords** (optional)
- `content`: the text that gets inserted into the prompt
- `comment`: a title/label for the entry

### Activation rules
- `disable`: if true, the entry never activates
- `constant`: if true, the entry always activates
- `useProbability` + `probability`: chance‑based activation

### Ordering and placement
- `order`: controls ordering among entries
- `position`, `depth`: controls where it appears in the prompt

### Recursion & timing
- `excludeRecursion`: skip recursion activation
- `preventRecursion`: don’t add it to recursion scanning
- `delayUntilRecursion`: only activate on recursion scans
- `sticky`, `cooldown`, `delay`: timed effects

### Inclusion groups & scoring
- `group`: puts entries into a named group
- `groupOverride`: allows an entry to override group behavior
- `groupWeight`: weight used when the system “picks winners” inside a group
- `useGroupScoring`: toggle for scoring‑based group decisions

### Filters
- `characterFilter`: only activate for certain characters/tags
- `triggers`: only activate on certain generation types

---

## 9) What is a “helper” (in very simple terms)?

A **helper** is a small piece of code (a function or class) that does one focused job so the main logic stays clean.

Example analogy:
- The **main logic** is the recipe.
- A **helper** is a kitchen tool (like a blender) that performs a repeated, specialized task.

In Vanilla ST World Info, helpers include:

- **`WorldInfoBuffer`** — collects the text to scan, recursion text, and injected text.
- **`WorldInfoTimedEffects`** — manages sticky/cooldown/delay timing.
- **`FilterHelper`** — manages filtering logic used by the editor UI.
- **`StructuredCloneMap`** — cache helper behind `worldInfoCache`.

You don’t need to code to benefit from them; just know they keep the system organized.

---

## 10) The scanning process (step‑by‑step, beginner view)

This is the core of lorebook logic. Think of it like a checklist for each entry.

### Step A — Build the scan buffer
SillyTavern creates a buffer containing:

- Recent chat text
- Any injected prompts (extra text added before scanning)
- Recursion text (if recursion is used)

This buffer is what gets searched for keywords.

### Step B — Load all entries
SillyTavern gathers and sorts the combined list of entries (from the 4 sources).

### Step C — Evaluate each entry
For each entry, ST checks things like:

- Is it disabled?
- Does it match the current generation trigger?
- Is it filtered by character or tag?
- Is it blocked by cooldown or delay?
- Is it forced to activate (decorators)?
- Is it force‑activated by another system?
- Does it match primary keywords?
- If it has secondary keywords, does it pass the selected logic?

If it passes all checks, it’s **activated**.

### Step C.1 — Inclusion group rules (quick idea)
Some entries are placed into **groups**. When multiple entries in the same group could activate, SillyTavern can **choose a winner** based on group rules and scoring. This prevents too many similar entries from activating at once.

### Step D — Probability + budget
Even activated entries still have two big filters:

1. **Probability**: it may fail a random chance roll.
2. **Budget**: if adding it would exceed the token budget, it might be skipped.

### Step E — Recursion and “minimum activations”
If recursion is on, newly activated entry text can be added to the buffer for another scan pass.

If “minimum activations” is set, the scan keeps going deeper until enough entries activate (or the maximum depth is reached).

---

## 11) Decorators (special tags in entry content)

Entries can start with special lines like:

- `@@activate` → force activation
- `@@dont_activate` → prevent activation

These are called **decorators** and are parsed before matching happens.

---

## 12) Why “budget” exists

A **budget** is a limit on how much lorebook text can be inserted. It’s a safety guard so your prompt doesn’t get too big.

- It’s based on **max context size**.
- You can also set a hard **cap**.

If the budget is exceeded, ST may stop adding more entries.

---

## 13) Where this logic lives in Vanilla ST

Everything described here is primarily implemented in:

- `vendor/SillyTavern/public/scripts/world-info.js`

This file defines:

- The world info settings
- The entry template and fields
- Entry collection (global / character / chat / persona)
- The scanning logic and recursion
- Budget & probability checks

---

## 14) Key terms glossary (plain English)

- **Entry**: One lore note (keywords + content).
- **Activation**: The entry is chosen to be inserted into the prompt.
- **Recursion**: Activated entry text is scanned again to activate more entries.
- **Decorator**: Special line like `@@activate` that changes entry behavior.
- **Budget**: Max total text allowed from activated entries.
- **Helper**: A small utility function/class used to keep code organized.

---

## 15) If you want to learn incrementally

Start with these three ideas:

1. **Entries = keyword + content**
2. **Scanning = search text for keywords**
3. **Activated entries = inserted into prompt**

Once that makes sense, explore the extra controls (probability, recursion, budget) one by one.
