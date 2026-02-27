---
name: sync-queue
description: Syncs task files to their correct on-disk folders and updates tasks/main-tasks-queue.md based on each file's **Status** field. Use when the queue may be out of sync — after implementing or reviewing tasks, moving files manually, or when the user invokes /sync-queue. Scans all subfolders in tasks/main-tasks/, routes each file by status, moves misplaced files, and updates the queue document in a single pass.
---

# Sync Queue

Scan all task files, move any in the wrong folder, and sync `tasks/main-tasks-queue.md` — in one pass.

## Routing table

| Status | Queue section | Disk folder |
|---|---|---|
| `DOCUMENTED` | `## Documented tasks` | `tasks/main-tasks/documented/` |
| `IMPLEMENTED` | `## Implemented tasks` | `tasks/main-tasks/implemented-tasks/` |
| `NO_ISSUES` | `## Finished tasks` | `tasks/main-tasks/finished-tasks/` |
| `FINISHED` | `## Finished tasks` | `tasks/main-tasks/finished-tasks/` |
| `ISSUES_FOUND` | `### Tasks with issues found` | `tasks/main-tasks/tasks-issues-found/` |

Any other status value: skip that file entirely.

## Steps

### 1. Collect task files

Scan every `.md` file in these folders:

- `tasks/main-tasks/documented/`
- `tasks/main-tasks/implemented-tasks/`
- `tasks/main-tasks/finished-tasks/`
- `tasks/main-tasks/tasks-issues-found/`

Exclude: `tasks/code-reviews/`, `tasks/main-tasks/skills/`, and any workflow or template files.

### 2. Read each file's status

For each file, read the `**Status:**` line.

- If found: record `CURRENT_PATH` and `STATUS`.
- If not found: skip this file. It is a new/undocumented task — leave it where it is.

### 3. Determine correct destination

Use the routing table above. Skip files whose status does not appear in the table.

### 4. Move misplaced files

For each file whose current folder does not match the correct destination:

1. Create the destination folder if it does not exist.
2. Move the file, keeping the filename unchanged.
3. Record the old and new path for the summary.

Do not move files that are already in the correct folder.

### 5. Update tasks/main-tasks-queue.md

Read the current queue file.

For each collected file with a recognized status:

1. Search all sections for any existing entry whose filename matches this file.
2. If an entry exists in the wrong section: remove it from that section.
3. If the file is not yet listed in the correct section: add it.
4. Entry format: `- \`tasks/main-tasks/SUBFOLDER/FILENAME.md\``

Rules:

- Do not touch entries under `## New tasks` or `## Archived Tasks` — those sections are managed manually.
- Do not add, move, or remove entries for files with no status (new tasks).

Write the updated queue back to disk.

### 6. Print a summary

- For each file moved on disk: one line showing `old path → new path`
- For each queue entry added or removed: one line describing what changed and in which section
- If nothing changed: `Queue is already in sync — no changes needed.`

Then stop.
