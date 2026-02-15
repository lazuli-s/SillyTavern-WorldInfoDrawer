---
name: st-js-best-practices
description: "Enforces JS best practices for SillyTavern extension development. This skill should be used when writing new JS code for this extension OR when reviewing/auditing existing JS for correctness. Covers three rule families: Security (DOMPurify, no eval, no secrets), Performance (localforage for large data, listener cleanup, async UI), and API Compatibility (getContext() preference, unique MODULE_NAME, settings initialization). Activates automatically during JS authoring and on code review requests."
---

# ST JS Best Practices Skill

Enforce SillyTavern extension JS best practices derived from the official ST Extensions documentation. This skill operates in two modes: **Guide mode** (writing new code) and **Review mode** (auditing existing code).

## Rule Families

Ten rules across three families. Full good/bad code examples live in `references/patterns.md` — load that file when illustrating violations or generating corrected code.

### Security (SEC)

| ID | Rule |
|---|---|
| SEC-01 | Never store API keys or secrets in `extensionSettings` — they are stored in plain text and visible to all other extensions. |
| SEC-02 | Always sanitize user inputs with `DOMPurify.sanitize()` before inserting into the DOM or using in API calls. Validate type first (`typeof x !== 'string'`). |
| SEC-03 | Never use `eval()` or the `Function()` constructor. Use safer, explicit alternatives. |

### Performance (PERF)

| ID | Rule |
|---|---|
| PERF-01 | Never store large datasets in `extensionSettings`. Use `localforage` (IndexedDB) for large data; `localStorage` for small non-sensitive data. `extensionSettings` is loaded into memory and saved frequently. |
| PERF-02 | Always remove event listeners (`eventSource.removeListener`, `removeEventListener`) when they are no longer needed to prevent memory leaks. |
| PERF-03 | Never perform heavy synchronous computation on the UI thread. Use `async/await` for I/O and yield to the UI thread with `await new Promise(r => setTimeout(r, 0))` in long loops. |

### API Compatibility (COMPAT)

| ID | Rule |
|---|---|
| COMPAT-01 | Prefer `SillyTavern.getContext()` over direct ES module imports from ST source files (e.g., `script.js`, `extensions.js`). The context API is stable; direct imports may break with ST updates. |
| COMPAT-02 | Use a unique, descriptive `MODULE_NAME` constant as the key for `extensionSettings`. Generic names (`'settings'`, `'data'`) collide with other extensions. |
| COMPAT-03 | Always initialize `extensionSettings[MODULE_NAME]` with frozen defaults. After updates, new keys must be backfilled via `lodash.merge` or manual key iteration. |
| COMPAT-04 | When modifying `chat` objects from a prompt interceptor, use `structuredClone()` to avoid mutating the actual chat history unintentionally. |

## Guide Mode (Writing New Code)

When writing new JS for this extension:

1. Load `references/patterns.md` for the relevant rule families before generating code.
2. Apply all applicable rules from the start — do not generate a "first draft" and fix it later.
3. When a rule is applied, note it inline with a brief comment if the correct pattern is non-obvious.

## Review Mode (Auditing Existing Code)

When the user asks to review, audit, or check JS code:

1. Load `references/patterns.md` for all three rule families.
2. Evaluate each of the 10 rules against the code under review.
3. Output a structured checklist in this format:

```
## JS Best Practices Review

### Security
- [PASS] SEC-01 — No secrets stored in extensionSettings.
- [FAIL] SEC-02 — `userInput` inserted into innerHTML without DOMPurify sanitization at line 42.
- [PASS] SEC-03 — No eval() or Function() usage found.

### Performance
- [PASS] PERF-01 — No large data stored in extensionSettings.
- [FAIL] PERF-02 — EVENT listener added at line 18 but never removed.
- [PASS] PERF-03 — All I/O uses async/await.

### API Compatibility
- [PASS] COMPAT-01 — getContext() used consistently.
- [FAIL] COMPAT-02 — MODULE_NAME is 'settings' (too generic).
- [PASS] COMPAT-03 — Settings initialized with defaults and backfill.
- [N/A]  COMPAT-04 — No prompt interceptors present.
```

4. After the checklist, list only the **FAIL** items with:
   - The exact line or code snippet causing the failure.
   - A corrected code snippet using the good pattern from `references/patterns.md`.

## When Rules Conflict or Don't Apply

- Mark as `[N/A]` with a one-line reason when a rule genuinely does not apply to the code under review.
- Do not mark `[N/A]` to avoid flagging a violation — when in doubt, flag it.
