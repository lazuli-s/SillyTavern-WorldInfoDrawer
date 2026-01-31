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

## 3) Where entries come from (the 4 sources)

Vanilla ST merges entries from **four places**:

1. **Global lorebooks** — the ones you selected in the UI.
2. **Character lorebooks** — the main character lorebook (plus extra ones).
3. **Chat lorebook** — the lorebook tied to the current chat.
4. **Persona lorebook** — the lorebook tied to your persona.

SillyTavern is careful **not to double‑count** the same lorebook if it’s already active elsewhere.

---

## 4) How entries are ordered (insertion strategy)

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

## 5) What’s inside a lorebook entry (fields you should know)

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

## 6) What is a “helper” (in very simple terms)?

A **helper** is a small piece of code (a function or class) that does one focused job so the main logic stays clean.

Example analogy:
- The **main logic** is the recipe.
- A **helper** is a kitchen tool (like a blender) that performs a repeated, specialized task.

In Vanilla ST World Info, helpers include:

- **`WorldInfoBuffer`** — collects the text to scan, recursion text, and injected text.
- **`FilterHelper`** — manages filtering logic used by the editor UI.

You don’t need to code to benefit from them; just know they keep the system organized.

---

## 7) The scanning process (step‑by‑step, beginner view)

This is the core of lorebook logic. Think of it like a checklist for each entry.

### Step A — Build the scan buffer
SillyTavern creates a buffer containing:

- Recent chat text
- Any injected prompts (like extension prompts)
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
- Is it force‑activated by another system or extension?
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

## 8) Decorators (special tags in entry content)

Entries can start with special lines like:

- `@@activate` → force activation
- `@@dont_activate` → prevent activation

These are called **decorators** and are parsed before matching happens.

---

## 9) Why “budget” exists

A **budget** is a limit on how much lorebook text can be inserted. It’s a safety guard so your prompt doesn’t get too big.

- It’s based on **max context size**.
- You can also set a hard **cap**.

If the budget is exceeded, ST may stop adding more entries.

---

## 10) Where this logic lives in Vanilla ST

Everything described here is primarily implemented in:

- `vendor/SillyTavern/public/scripts/world-info.js`

This file defines:

- The world info settings
- The entry template and fields
- Entry collection (global / character / chat / persona)
- The scanning logic and recursion
- Budget & probability checks

---

## 11) Key terms glossary (plain English)

- **Entry**: One lore note (keywords + content).
- **Activation**: The entry is chosen to be inserted into the prompt.
- **Recursion**: Activated entry text is scanned again to activate more entries.
- **Decorator**: Special line like `@@activate` that changes entry behavior.
- **Budget**: Max total text allowed from activated entries.
- **Helper**: A small utility function/class used to keep code organized.

---

## 12) If you want to learn incrementally

Start with these three ideas:

1. **Entries = keyword + content**
2. **Scanning = search text for keywords**
3. **Activated entries = inserted into prompt**

Once that makes sense, explore the extra controls (probability, recursion, budget) one by one.
