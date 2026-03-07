---
name: document-concepts
description: Captures programming concepts from the current conversation into draft learning files in docs/user/learning-vault/drafts/. Use when the user invokes /document-concepts. Scans the conversation for concepts that were explicitly explained or introduced (not just mentioned), presents them as a multiselect for the user to pick from, then writes or updates structured draft files. Each file gets a plain-language definition, a "why it matters" section, a diagram/table showing where it fits, and a real code example from the project when possible.
---

# document-concepts

Captures concepts from this conversation into the learning vault for later review and notebook generation.

---

## Phase 1 — Scan the conversation

Read the full conversation and identify every concept that was **explicitly explained or introduced** — a term was defined, a pattern was described, or the AI explained how something works.

**Include:**
- Terms the AI defined or named ("a callback is…")
- Patterns or structures that were explained
- Architecture or design concepts that were described
- Technical words the AI used and then clarified

**Exclude:**
- Words mentioned in passing with no explanation
- SillyTavern-internal implementation details (unless architectural)
- Concepts the user clearly already knows (no explanation was given)

For each concept, note:
- Its name
- Which topic tag best fits it (see tag list below)

**Topic tags and what belongs under each:**

| Tag | Belongs here |
|---|---|
| `JS` | Variables, functions, loops, objects, arrays, modules, closures, scope, classes |
| `HTML` | Elements, attributes, document structure, forms, semantic markup |
| `DOM` | Querying elements, parent/child, event listeners, adding/removing nodes |
| `Async` | Promises, async/await, callbacks, event loop, setTimeout |
| `CSS` | Selectors, properties, flex, grid, custom properties, animations |
| `Git` | Commits, branches, diffs, merge, rebase, stash |
| `Patterns` | Module pattern, observer, factory, strategy, event-driven design |
| `Browser` | DevTools, console, fetch, localStorage, network tab |
| `Architecture` | Separation of concerns, DRY, single responsibility, module boundaries, cohesion |
| `General` | Anything that doesn't fit the above |

---

## Phase 2 — Ask the user which concepts to document

Use `AskUserQuestion` with `multiSelect: true`. Show concepts in batches of up to 4 per question.

- If ≤4 concepts: one question.
- If 5–8 concepts: two questions.
- If 9–12 concepts: three questions.
- If >12 concepts: prioritize the most foundational/useful ones and cap at 12.

Label each question clearly: `"Which concepts would you like to save? (batch 1 of 2)"`.

For each option:
- `label`: the concept name
- `description`: one sentence — what it is, in plain language

After all batches, collect every selected concept name into a list before proceeding.

---

## Phase 3 — Write draft files

For each selected concept:

### 3a: Determine file path

**Filename format:** `[TAG]_[concept-slug].md`

Tag prefix mapping:
| Topic tag | File prefix |
|---|---|
| JS | `JS` |
| HTML | `HTML` |
| DOM | `DOM` |
| Async | `ASYNC` |
| CSS | `CSS` |
| Git | `GIT` |
| Patterns | `PATTERNS` |
| Browser | `BROWSER` |
| Architecture | `ARCH` |
| General | `GENERAL` |

Concept slug: lowercase kebab-case of the concept name.

Examples: `JS_callback-function.md`, `ARCH_separation-of-concerns.md`, `DOM_event-listener.md`

Full path: `docs/user/learning-vault/drafts/[filename]`

### 3b: Check for existing file

Use the Read tool to check if the file already exists. If it does, read it first, then update it in place (silently — do not tell the user the file already existed). If it does not exist, create the `docs/user/learning-vault/drafts/` folder if needed, then create the file.

### 3c: Write the file

Use this template exactly:

```markdown
# [Concept Name]

**Type:** [terminology | mental model | code snippet]
**Topic:** [topic tag]
**Captured:** [YYYY-MM-DD — today's date]
**Source:** [one sentence — which task or conversation this came from]

---

## What it is

[One sentence definition. Plain language. No jargon. If a technical word is unavoidable, define it immediately.]

## Why it matters

[1–3 sentences. What problem does this solve? Why do programmers use it? What would go wrong without it?]

## Where it fits

[A table or simple ASCII diagram showing how this concept relates to nearby concepts, or where it lives in a typical project structure. Make it visual — the user is a strong visual learner.]

## Example

[A short code snippet. Use code from THIS project (SillyTavern-WorldInfoDrawer) when the concept appears there. If not, use a minimal illustrative example. Below the code block, write 2–4 sentences in plain language explaining what the code does — not what to type, but what it means.]
```

**Type classification rules:**
- `terminology` — a word or name for a concept (e.g. "callback", "scope", "module")
- `mental model` — a way of thinking about how something works (e.g. "the event loop", "separation of concerns")
- `code snippet` — a specific pattern of writing code (e.g. "async/await syntax", "destructuring assignment")

---

## Phase 4 — Confirm to the user

After all files are written, output a short summary:

```
Saved [N] concept(s) to docs/user/learning-vault/drafts/:
- JS_callback-function.md
- ARCH_separation-of-concerns.md
```

Do not output the full file contents in chat. The files are the output.
