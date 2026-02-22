this is the template for the main-tasks-queue.md files.

I was imagining something like this:

# Main Tasks Queue

[brief explanation of why the items are here]

Format of each item:

- `tasks/implemented/<filename>.md`

## New tasks

Brief explanation of why the items are on this list.

[LIST HERE]

here we have items that I manually add such as - small bug on the drawer when I select 2 entries.

## Documented tasks

Brief explanation of why the items are on this list.

[LIST HERE]

here we have the items that I asked an LLM to analyze for me. they might be items from the first section (New tasks) or items that I directly asked the llm to create. for example, i just found an small issue or bug. i run step 1 workflow (ANALYZE REQUEST) where the LLM helps me understand and create a document (TASK_DOCUMENTATION_FILE) detailing the issue, and this workflow adds this item to this list.

## Tasks to be implemented

Brief explanation of why the items are on this list.

[LIST HERE]

here we have items that the step 2 IMPLEMENT TASK workflow adds here. the issue/bug/new feature were already detailed IN TASK_DOCUMENTATION_FILE.

If I think this task was fine and that it doesnt need any reviews, I'll just manually move it the TASK_DOCUMENTATION_FILE to the 'finished-tasks' folder and remove it from here.

## Tasks pending review

Brief explanation of why the items are on this list.

[LIST HERE]

here we add tasks that were already implemented and need to be reviewed by the step 3 - post implementation review. this workflow reads the TASK_DOCUMENTATION_FILE to understand what was implemented, inspect the relevant source files, identify and fix bugs, architectural violations, and JS best practice issues introduced by the implementation, and append to TASK_DOCUMENTATION_FILE a "Post-Implementation Review"

## Reviewed tasks

### Tasks with no issues found

Brief explanation of why the items are on this list.

[LIST HERE]

here we add tasks that were already reviewed by the step 3 and it found no issues.

step 3 moves them to 'finished-tasks' folder.

### Tasks with issues found

Brief explanation of why the items are on this list.

[LIST HERE]

here we add tasks that were already reviewed by the step 3, it found issues/findings.

they need to be processed by the step 4 (implement fix plan workflow)

## Fix plan

`step 4 (execute fix plan workflow)` processes all files inside 'issues found' list, and creates a separate commit for each finding/issue (only if there's more than one).

### Tasks with all issues fixed

Brief explanation of why the items are on this list.

[LIST HERE]

here we only add files that had all findings/issues successfully fixed. 

step 4 moves them to 'finished-tasks' folder.

### Tasks with unresolved issues

tasks from the lists: 'Tasks that contains findings with a high risk fix' and 'Tasks that contains findings that need human review'

step 4 moves them to 'unresolved-issues' folder.

#### Tasks that contains findings with a high risk fix

Brief explanation of why the items are on this list.

[LIST HERE]

here we add tasks that went through `step 4 (execute fix plan workflow)`, but not all findings were fixed: they still have findings with high risk fix rating.

#### Tasks that contains findings that need human review

Brief explanation of why the items are on this list.

[LIST HERE]

here we add tasks that went through `step 4 (execute fix plan workflow)`, but not all findings were fixed: they still have findings that depend on human review or with high risk fix rating.



## Archived Tasks

here we add only tasks that were already processed by the workflow.

the LAST WORKFLOW: 'add to changelog and archive'
- it scans all files inside "finished-tasks" folder ONLY
- adds them to tasks-changelog.md
- moves them to "archived-tasks" folder.
