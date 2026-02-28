# CHANGELOG.md — Rules & Purpose Definition

## Audience

Non-technical users of the extension, primarily. Developer-relevant notes (such as a public API change) may appear only when they affect how the extension is actually used.

## Purpose

Help users decide whether to update, and understand what's new or different after they do.

## Tone

Plain and direct. As brief as possible — one sentence per change unless a second sentence is needed to make it meaningful.

## Sections

Use only the sections that have entries for that version. Always in this order:

1. **Added** — new features a user can now do.
2. **Changed** — existing behavior that now works differently.
3. **Fixed** — bugs that were broken and are now correct.
4. **Removed** — features or behaviors that no longer exist.
5. **Performance** — speed or responsiveness improvements.

## Writing Rules

- End every bullet with a period.
- Use sentence case (capitalize the first word only, unless a proper name).
- Use active voice and plain language. Prefer "X now does Y" over "Y is now done by X."
- Performance entries must include a note on how noticeable the impact is — e.g. "minor improvement on loading the editor panel" or "noticeably faster on large books."
- Removed entries must include what to use instead, if a replacement exists — e.g. "Removed the Active filter — use Book Visibility instead."
- When a change fits more than one section, place it in the most impactful one. Do not list the same change twice. Priority order: Added > Changed > Fixed > Performance. Removed always stands alone.

## Exclusions

Do not include:

- Internal refactoring and code cleanup.
- CSS or visual changes that don't affect how any element looks, behaves, or feels to the user.
- Documentation and task file updates.
- Anything a user can't directly experience.

## Format

- Versions listed newest first.
- Version date format: `Month D, YYYY` — e.g. `February 8, 2026`.
- Do not create an Internal/Maintenance section heading — entries that would go there are excluded entirely (see Exclusions above), not moved to a separate section.

### Feature Subheaders

When a section contains entries for more than one feature area, group them under `####` subheaders with a consistent emoji:

```md
### Added

#### 📁 Lorebook Folders

- Added folder drag-and-drop support.

#### 📊 Order Helper

- Added outlet name column.
```

- Use subheaders only when a section has entries across **two or more distinct feature areas**.
- Skip subheaders when all entries in a section belong to the same area, or when there is only one entry.
- Emoji assignments are defined in `docs/changelog-emojis.md` — always use that reference to keep emojis consistent across versions.

## Version Numbers

Versions use **semantic versioning**: `major.minor.patch` — e.g. `2.3.4`.

A legend appears at the top of CHANGELOG.md so users can gauge update weight at a glance:
> `patch` = bug fixes | `minor` = new features or noticeable changes | `major` = milestone redesign

### Patch `x.x.+1`

Bump patch when the release contains only:

- Bug fixes.
- Performance improvements (always patch, regardless of how noticeable).
- Subtle behavior tweaks users won't notice.
- Small additions to something already existing (e.g. an extra option inside an existing menu).

### Minor `x.+1.0` — patch resets to 0

Bump minor when the release contains any of:

- A new visible control, panel, or user-facing capability.
- A behavior change users will clearly notice and need to adjust to.
- Any removal — with or without a replacement (users still have to adjust).

### Mixed releases

When a release contains changes at multiple levels, the **headline decides**: what is the primary reason for this release? That sets the version.

- Primary reason is a significant new feature → minor.
- Primary reason is a bug fix, with a small addition along for the ride → patch.

### Major `+1.0.0` — minor and patch reset to 0

**Major bumps are decided by the user only. The AI must never apply or suggest a major bump without explicit instruction.**

Major is reserved for milestone-level changes only:

- The entire drawer UI is redesigned from scratch.
- The way users organize and navigate lorebooks changes completely.
