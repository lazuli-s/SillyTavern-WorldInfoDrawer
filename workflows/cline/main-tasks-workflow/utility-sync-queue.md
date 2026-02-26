<task name="Sync Queue (Utility)">

<objective>
  Scan all task files across all task folders. For each file, read its Status field, move the file to the correct folder on disk, and update main-tasks-queue.md so each entry appears in exactly one correct section. Run automatically after every step (1 through 4).
</objective>

<steps_overview>
- Scan all task files in tasks/main-tasks/ subfolders
- For each file: read its Status field
- Create any destination folders that do not exist yet
- Move files that are in the wrong folder
- Update main-tasks-queue.md: add each file to the correct section and remove it from any other section
- Print a summary of every change made

Process all task files in a single pass, then stop.
</steps_overview>

<detailed_steps>

## 1. Collect task files

Collect the full path of every `.md` file found in:

- `tasks/main-tasks/documented-tasks/`
- `tasks/main-tasks/implemented-tasks/`
- `tasks/main-tasks/finished-tasks/`
- `tasks/main-tasks/issues-found/`
- `tasks/main-tasks/pending-fix/`

Exclude files that are not task files:

- Anything inside `tasks/workflows/`
- Anything inside `tasks/code-reviews/`

---

## 2. Read each file's status

For each collected file:

1. Read the file's `**Status:**` line.
2. Record `CURRENT_PATH` and `STATUS`.
3. If no `**Status:**` line is found: skip this file. It is a new task that has not been analyzed yet and should stay where it is.

---

## 3. Determine correct destination

Use this routing table:

| Status | Queue section in main-tasks-queue.md | Destination folder on disk |
| --- | --- | --- |
| `DOCUMENTED` | `## Documented tasks` | `tasks/main-tasks/documented-tasks` |
| `IMPLEMENTED` | `## Implemented tasks` | `tasks/main-tasks/implemented-tasks` |
| `NO_ISSUES` | `## Finished Tasks` | `tasks/main-tasks/finished-tasks` |
| `FINISHED` | `## Finished Tasks` | `tasks/main-tasks/finished-tasks` |
| `ISSUES_FOUND` | `## Tasks with issues found` | `tasks/main-tasks/issues-found` |

If the status is anything else (e.g. `PENDING_REVIEW`, `PENDING_HUMAN_REVIEW`, `HIGH_RISK_FIX`): skip this file. These are leftover statuses and are not routed.

---

## 4. Create missing folders

Before moving any file, check whether each destination folder exists.

If a folder does not exist: create it.

---

## 5. Move files to the correct folder

For each file whose `CURRENT_PATH` does not match the correct destination folder:

1. Move the file to the correct destination folder, keeping the filename unchanged.
2. Update `CURRENT_PATH` to the new full path.

Do not move files that are already in the correct folder.

---

## 6. Update main-tasks-queue.md

If `tasks/main-tasks-queue.md` does not exist: create it from the template at `tasks/workflows/main-tasks/templates/main-tasks-queue-template.md`.

Read `tasks/main-tasks-queue.md`.

For each task file collected in step 1 (including any that were skipped due to no status — see below):

**Files with a recognized status:**

1. Search all sections of the queue for any existing entry whose filename matches this file.
2. If an entry exists in the wrong section: remove it from that section.
3. If the file is not yet listed in the correct section: add it.
4. Each entry must use this exact format: `- \`tasks/main-tasks/SUBFOLDER/FILENAME.md\``

**Files without a status (new tasks):**

- Do not add, move, or remove their queue entries. Leave them untouched.

Do not modify entries under `## New tasks` or `## Archived Tasks` — those sections are managed manually.

Write the updated `tasks/main-tasks-queue.md` back to disk.

---

## 7. Print a summary

After processing all files, print a short plain-language summary:

- For each file moved on disk: one line showing `old path → new path`.
- For each queue entry added or removed: one line describing what changed and in which section.
- If nothing changed: print `"Queue is already in sync — no changes needed."`

Then stop.

</detailed_steps>
</task>
