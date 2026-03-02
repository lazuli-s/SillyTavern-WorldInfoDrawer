# Create Step File — SrcFolder Refactoring

## Context to load first

Before filling in the template, read these two files:

1. `tasks/main-tasks/documented/Refactoring_SrcFolderStructure.md` — the full agreed
   file structure and move plan. Use it to verify that the parameters you were given
   match the agreed mappings, and to cross-check the import depth reference below.

2. `FEATURE_MAP.md` — the feature-to-file ownership map. Use it to understand what
   each file being moved actually does. This feeds the risk justification and
   "why it's safe" sections.

Do not skip this step. The quality of the checklist and risk sections depends on
knowing what the files do and how they relate to each other.

---

## Your task

Create exactly ONE step planning file for the src folder reorganization.
The step-specific parameters are provided at the end of the instruction that
loaded this file. Do not implement any code changes — create the planning file only.

---

## Output

Write the file to the path given in `OutputFile` parameter:
`tasks/main-tasks/documented/SrcFolderSteps/<OutputFile>`

---

## Step file template

Use this exact structure. Replace every `<placeholder>` with the matching
parameter value from the step parameters section.

```markdown
# STEP <StepNumber> — <StepName>

**Status:** PENDING
**Parent task:** [Refactoring_SrcFolderStructure.md](../Refactoring_SrcFolderStructure.md)
**Folder:** `<DestFolder>`

---

## Files to Move

<FileTable>

---

## Implementation Checklist

- [ ] Create the destination folder(s) if they do not exist
- [ ] For each file in the table above, do the following atomically:
  - [ ] Write the file to its new location with its new name
  - [ ] Delete the original file
  - [ ] Update all `import` statements INSIDE the moved file to use
        the new relative paths (see import depth table below)
  - [ ] Grep the entire codebase for any file that imports from the
        old path; update each reference to the new path
- [ ] Verify: grep for all old filenames from this step; confirm
      no file still imports from any of those old paths

<ConceptRenameChecklist — include only if ConceptRename=yes, otherwise omit entirely>
- [ ] Search `README.md` for "<OldName>"; replace with "<NewName>"
- [ ] Search `style.css` for CSS classes matching the old name pattern;
      rename each class and update every file that uses those classes
- [ ] Search all JS files for `title=`, `aria-label=`, tooltip strings
      containing "<OldName>"; replace with "<NewName>"
- [ ] Search all JS/HTML template literals for UI-visible labels saying
      "<OldName>"; replace with "<NewName>"
</ConceptRenameChecklist>

---

## Import depth reference

| File location | Path to `src/shared/` | Path to `src/book-browser/` |
|---|---|---|
| `src/shared/*.js` | `./` | `../book-browser/` |
| `src/book-browser/*.js` | `../shared/` | `./` |
| `src/book-browser/browser-tabs/*.js` | `../../shared/` | `../` |
| `src/book-browser/book-list/*.js` | `../../shared/` | `../` |
| `src/book-browser/book-list/book-folders/*.js` | `../../../shared/` | `../../` |
| `src/editor-panel/*.js` | `../shared/` | `../book-browser/` |
| `src/entry-manager/*.js` | `../shared/` | `../book-browser/` |
| `src/entry-manager/logic/*.js` | `../../shared/` | `../../book-browser/` |
| `src/entry-manager/bulk-editor/*.js` | `../../shared/` | `../../book-browser/` |

---

## Fix Risk: <RiskLevel>

<RiskJustification>

## Why It's Safe to Implement

<WhySafe>
```

---

## Rules

- `Status` must be `PENDING`
- Do not add a `## IMPLEMENTATION` section
- Do not modify any source file in `src/`
- Do not write file content using Bash echo, printf, or heredoc —
  use the Write tool only
