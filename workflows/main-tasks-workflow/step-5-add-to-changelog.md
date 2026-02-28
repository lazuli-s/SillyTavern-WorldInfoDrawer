<task name="Add to Changelog & Archive (Step 5)">

<steps_overview>
- Scan all files inside `tasks/main-tasks/finished-tasks/`.
- For each file: read it, extract the task title, implemented date, summary, and what changed.
- Prepend a human-readable entry to `tasks/main-tasks-changelog.md` for each file.
- Move each processed file from `finished-tasks/` to `archived-tasks/` (creating the folder if it does not exist).

Process all files in `finished-tasks/` in one invocation, then stop.
</steps_overview>
 
<detailed_steps>

## 1. Scan the finished-tasks folder

1. List all `.md` files inside `tasks/main-tasks/finished-tasks/`.
2. If the folder is empty or does not exist: report "No finished tasks to archive" and stop.
3. For each file found, set its path as a member of `FILES_TO_ARCHIVE`.

---

## 2. Extract data from each task file

For each file in `FILES_TO_ARCHIVE`, read it and extract:

| Field | Where to find it |
| --- | --- |
| **Title** | First `# TASK:` heading — the text after `# TASK:` |
| **Type** | `**Type:**` field near the top |
| **Implemented date** | `*Implemented: <date>*` line inside `## After Implementation` |
| **Summary** | First 1–2 sentences of the `## Summary` section |
| **What changed** | Bullet list under `### What changed` inside `## After Implementation` |
| **Review outcome** | Check for `### No Issues Found` or `### Findings` in `## Post-Implementation Review` |

If a field is missing (e.g. no `## After Implementation` section yet), substitute `—` for that field.

---

## 3. Write changelog entries

1. Use `read_file` on `tasks/main-tasks-changelog.md` (it may be empty — that is fine).

2. For each file in `FILES_TO_ARCHIVE`, compose a changelog entry in this format:

    ```markdown
    ## <Implemented date, or Created date if no implementation date>

    ### <Type>: <Title>

    <1–2 sentence plain-language summary of what the task did. Non-technical. No jargon.>

    **What changed:**
    <paste the bullet list from "What changed" exactly as written in the task file>

    **Review:** <"No issues found." or "Issues found and fixed." or "Issues found — some pending human review.">

    ---
    ```

    > - Keep the summary short and non-technical. A user who did not write the code should understand it.
    > - If the `What changed` section is absent, write: `— (no implementation recorded)`
    > - Include all files in `FILES_TO_ARCHIVE` as separate entries, newest implemented date first.

3. Prepend all new entries at the top of the changelog file (below any existing header, above any existing entries).


---

## 4. Move files to archived-tasks

---

## 6. Report

Print a plain-language summary:

- How many files were archived.
- The title of each one.

Then stop.

</detailed_steps>

</task>
