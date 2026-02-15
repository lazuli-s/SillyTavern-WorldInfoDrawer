# Issue: DOMPurify — Unsanitized innerHTML in orderHelperRender.filterPanel.js

## Problem

`src/orderHelperRender.filterPanel.js` has two `innerHTML` sites that write non-static content
without sanitization:

1. **`orderHelperState.book` → `hint.innerHTML`** (line ~37–44)
   A lorebook book name is user-controlled. Injecting it directly into a template literal that is
   then written to `innerHTML` is an XSS vector (e.g. a book named `"><script>alert(1)</script>`).

2. **`hljs.highlight(inp.value).value` → `syntax.innerHTML`** (lines 144, 154)
   User-typed script text passes through `hljs.highlight()` before reaching `innerHTML`. `hljs`
   HTML-encodes its input, but relying solely on that chain without a second sanitization step
   violates defense-in-depth.

## Fix

Import `DOMPurify` from `../../../../../lib.js` and wrap the three assignments.

## Scope

Single file: `src/orderHelperRender.filterPanel.js`

## Status

Resolved.
