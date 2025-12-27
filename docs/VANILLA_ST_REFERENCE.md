# Vanilla SillyTavern reference (read-only)

## Purpose
This repo keeps a **read-only** copy of vanilla SillyTavern so Codex (and developers) can verify SillyTavern internals (imports/exports, file locations, and API surfaces) without guessing. It is **not** used at runtime and **must never** become a dependency for the extension.

## Pinned upstream release
- Repo: https://github.com/SillyTavern/SillyTavern
- Release tag: `1.14.0`
- Commit SHA: `9c9be90821ffd6132b40b5f04982522a61d7ad30`
- Submodule path: `vendor/sillytavern/`

## Read-only guardrails
- **Do not edit anything under `vendor/sillytavern/`.**
- **Do not import from `vendor/sillytavern/` at runtime.** This is for development/AI reference only.
- **Do not ship or require this submodule for users.** It is optional and purely informational.

## Updating to the next stable release
1. Find the latest stable release tag (not a preview/beta):
   ```bash
   git ls-remote --tags https://github.com/SillyTavern/SillyTavern.git
   ```
2. Update the submodule and checkout the tag:
   ```bash
   git -C vendor/sillytavern fetch --tags
   git -C vendor/sillytavern checkout tags/<NEW_TAG>
   ```
3. Record the new tag + commit SHA in this file:
   ```bash
   git -C vendor/sillytavern rev-parse HEAD
   ```
4. Commit the submodule pointer update in the parent repo.
