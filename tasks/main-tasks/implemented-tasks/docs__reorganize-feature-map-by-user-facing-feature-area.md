# DOCS: Reorganize FEATURE_MAP.md by user-facing feature area
*Created: March 5, 2026*

**Type:** Docs
**Status:** IMPLEMENTED

---

## Summary

FEATURE_MAP.md is the primary lookup table used by AI agents to find which file owns a specific
behavior. The current document is hard to scan: some features are in the wrong section, several
bullet points are walls of text covering multiple unrelated behaviors, and at least one entry
references a deleted file. This task reorganizes the document by user-facing feature area,
trims verbose entries into concise one-behavior-per-line bullets, removes stale content, and
ensures there is no redundancy with the Module Responsibilities table in ARCHITECTURE.md.

No JavaScript or CSS is changed. The only file modified is `FEATURE_MAP.md`.

---

## Current Behavior

`FEATURE_MAP.md` has 8 sections:
**Bootstrap & runtime sync, Book-level behavior, Folder behavior, Entry-level behavior,
Editor behavior, Selection & interaction, Sorting & ordering, Persistence & settings,
Settings panel, Integration with SillyTavern, Advanced tools (Entry Manager).**

Problems:
- **Wrong placement.** Browser tab ordering, visibility tab, and sorting tab entries
  are all inside "Selection & interaction" instead of a dedicated tabs section.
- **Wall-of-text bullets.** Several entries pack three or four separate behaviors into one
  long sentence (e.g. the browser-tabs line in "Book-level behavior" is ~8 lines long).
- **Stale content.** The Entry Manager section references
  `src/entry-manager/action-bar.helpers.js`, which was deleted in commit
  `1528177` ("merge wrapRowContent into utils, remove action-bar.helpers"). ARCHITECTURE.md
  still lists this file too — but only FEATURE_MAP.md is in scope for this task.
- **Redundancy with ARCHITECTURE.md.** Some bullets essentially restate the module's
  design intent (which ARCHITECTURE.md §Module Responsibilities already covers) rather than
  naming the specific behavior the line is about.

---

## Expected Behavior

After this task, `FEATURE_MAP.md`:
- Has **~11 sections** organized by what the user sees and interacts with (not by code folders).
- Every bullet point is **one behavior → one concise line → file(s)**. Long sentences are
  split into multiple focused bullets.
- All references to `action-bar.helpers.js` are **removed**.
- Any other stale file paths discovered during implementation are also removed or corrected.
- No bullet duplicates a description already present in ARCHITECTURE.md's Module
  Responsibilities table — FEATURE_MAP.md names behaviors; ARCHITECTURE.md describes modules.

---

## Agreed Scope

Only `FEATURE_MAP.md` is modified. No source code, no ARCHITECTURE.md.

---

## Out of Scope

- Updating ARCHITECTURE.md (it also lists `action-bar.helpers.js` — leave that for a
  separate task if the user requests it).
- Changing any JavaScript, CSS, or HTML.
- Adding new behaviors to the map that are not already documented somewhere.

---

## Implementation Plan

### Phase 1 — Audit before writing

- [x] **1. Verify stale file references.**
  For every file path that appears in `FEATURE_MAP.md`, confirm the file exists on disk
  using Glob. List any paths that do not exist. Confirmed stale: `src/entry-manager/action-bar.helpers.js`.
  Check additionally: `src/entry-manager/bulk-editor-tab/bulk-edit-row.js` and all others in the
  Entry Manager section to ensure no others were removed during recent refactors.

- [x] **2. Identify all misplaced entries.**
  Read each entry and note which proposed section it belongs in (see Phase 2 structure below).
  Pay special attention to the "Selection & interaction" section — it currently contains browser
  tab ordering (line 72), visibility filter (line 73), and chip layout (line 74–75) entries that
  belong in a Browser Tabs section.

- [x] **3. Identify wall-of-text bullets to split.**
  Flag any bullet that describes more than one independent behavior. These should be split into
  separate lines, one per behavior.

### Phase 2 — Define the new section structure

Use the following 11 user-facing sections. Place each existing entry into the most appropriate
section. Do not create new sections unless a confirmed existing behavior cannot fit anywhere.

| # | Section heading | What belongs here |
|---|---|---|
| 1 | **Startup & Wiring** | Extension bootstrap, module composition, dev CSS reload, public API surface (jumpToEntry) |
| 2 | **Drawer & Splitter** | Drawer DOM bootstrap, keyboard handling, splitter drag/resize/persistence |
| 3 | **Book Browser — Books** | Book list rendering, active toggle, collapse/expand, book context menu, source-link detection/icons |
| 4 | **Book Browser — Folders** | Folder DOM, registry, collapse state, context menu, active-state tri-state |
| 5 | **Book Browser — Tabs** | Tab strip, all 6 tab sections: Settings tab, Lorebooks tab, Folders tab, Visibility tab, Sorting tab, Search tab |
| 6 | **Entry Rows** | Entry row rendering, enable/disable toggle, state mapping, click-to-open editor, entry creation |
| 7 | **Selection & Drag-Drop** | Selection model, click/toggle/shift-range select, drag-drop move/copy, delete selected |
| 8 | **Editor Panel** | Editor render pipeline, dirty tracking, reset, focus/unfocus, AMS section, duplicate-refresh |
| 9 | **Entry Manager** | Open/close, scope selection, display toolbar, table (header/body/filter-panel), bulk editor rows, filters, script filter, drag sort, inline edits, focus-link |
| 10 | **Sorting** | Sort enums/constants, implementations, per-book sort, sort option labels |
| 11 | **Persistence, Settings & ST Integration** | All localStorage keys, extension_settings, settings panel template, feature toggles, WI API calls, event subscriptions, core template usage, DOM delegation helpers, plugin integrations |

> **Note:** "Persistence, Settings & ST Integration" merges the current
> "Persistence & settings", "Settings panel", and "Integration with SillyTavern" sections.
> They overlap heavily and all concern the same concern (data flowing in/out of ST).
> If this merged section feels too long after writing, it may be split again.

### Phase 3 — Write the new FEATURE_MAP.md

- [x] **4. Write the opening paragraph.**
  Keep the one-line description at the top: "Where each feature or behavior is implemented in
  the codebase." Add a one-sentence note explaining the relationship to ARCHITECTURE.md:
  "For module design intent, see the Module Responsibilities table in ARCHITECTURE.md —
  this file lists specific behaviors, not module descriptions."

- [x] **5. Write each section in order (1–11).**
  For each entry:
  - One behavior per bullet. If the original bullet covered two behaviors, write two bullets.
  - Format: `- <Behavior description> → <file(s)>` — concise noun phrase, then arrow, then
    path(s). Use commas to separate multiple files. Drop any prose that already appears in
    ARCHITECTURE.md's module description for that file.
  - Omit any bullet whose entire content is already stated as a module design intent in
    ARCHITECTURE.md (i.e., don't write "Book Browser composition and orchestration → book-browser.js"
    because ARCHITECTURE.md already says exactly that).
  - Remove all references to `action-bar.helpers.js` and any other stale paths found in Phase 1.

- [x] **6. Review for redundancy.**
  After writing all sections, do a final pass comparing FEATURE_MAP.md against the
  ARCHITECTURE.md Module Responsibilities table. Remove or trim any bullet that essentially
  repeats a module description verbatim. FEATURE_MAP.md should name *behaviors*, not describe
  what a module *is*.

- [x] **7. Final length check.**
  The new file should be roughly the same length as the current one or shorter, not longer.
  If a section has grown compared to the original, review it for verbosity and trim.

---

## After Implementation
*Implemented: March 5, 2026*

### What changed

`FEATURE_MAP.md`
- Reorganized the document into user-facing sections so related behaviors are easier to find.
- Split long mixed-purpose bullets into shorter one-behavior lines.
- Removed the deleted `src/entry-manager/action-bar.helpers.js` path and kept the file map aligned with the current source tree.

### Risks / What might break

- This changes a reference document used by agents, so any future task that expects the old section names may need to be updated.
- Some behavior lines were shortened on purpose, so a reader may need to cross-check `ARCHITECTURE.md` if they want module intent instead of feature ownership.

### Manual checks

- Open `FEATURE_MAP.md` and confirm the headings now run from `Startup & Wiring` through `Persistence, Settings & ST Integration`.
- Search the file for `action-bar.helpers.js` and confirm it no longer appears.
- Compare a few bullets against `ARCHITECTURE.md` and confirm `FEATURE_MAP.md` names behaviors instead of repeating module descriptions.
