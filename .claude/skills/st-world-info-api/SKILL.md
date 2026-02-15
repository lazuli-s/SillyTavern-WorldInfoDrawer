---
name: st-world-info-api
description: "Compact reference of SillyTavern World Info APIs, events, state, data shapes, and ownership rules. Use before writing any code that reads/writes WI books, entries, or settings. Includes inline anti-patterns (what not to reinvent) and ownership flags (ST-owned vs extension-owned)."
---

# ST World Info API — Reference Skill

Load `references/wi-api.md` whenever writing or reviewing code that touches World Info.

## When to Use This Skill

- Writing code that loads, saves, creates, or deletes WI books or entries
- Subscribing to WI-related events
- Reading or writing WI settings (depth, budget, etc.)
- Checking ownership: "does ST manage this, or should the extension?"
- Suspecting the extension is reimplementing something ST already provides

## How to Use

1. Load `references/wi-api.md` before generating code.
2. Check the **Ownership Summary** section first — it tells you what ST controls vs what the extension controls.
3. For each API call, follow the inline `✅ Do / ❌ Don't` flags.
4. For type shapes, use the **WI Entry Shape** section rather than guessing field names.

## Source of Truth

- `vendor/SillyTavern/public/scripts/world-info.js` — WI functions, types, constants
- `vendor/SillyTavern/public/scripts/st-context.js` — getContext() surface
- `vendor/SillyTavern/public/scripts/events.js` — all event name constants

Check these directly only when you need exact signatures or suspect `wi-api.md` is outdated.
