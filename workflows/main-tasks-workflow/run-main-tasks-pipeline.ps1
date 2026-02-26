# Main Tasks Pipeline - Runs steps 2-4 with sync_queue between each step
# Usage: .\run-main-tasks-pipeline.ps1
#
# IMPORTANT: Each cline -y invocation is a SEPARATE process with FRESH context.
# No conversation history carries over between commands.
# State is persisted in files (task files, queue file), not in memory.
# Each step reads the current state from disk independently.

$ErrorActionPreference = "Stop"

$WorkflowDir = "tasks/workflows/main-tasks/workflows/main-tasks-workflow"

Write-Host "=== Syncing queue (before step 2) ===" -ForegroundColor Cyan
cline -y "Run the utility workflow at $WorkflowDir/utility-sync-queue.md to sync the task queue"

Write-Host "`n=== Running Step 2: Implement Task ===" -ForegroundColor Cyan
cline -y "Run the workflow at $WorkflowDir/step-2-implement-task.md to implement the first documented task"

Write-Host "`n=== Syncing queue (after step 2) ===" -ForegroundColor Cyan
cline -y "Run the utility workflow at $WorkflowDir/utility-sync-queue.md to sync the task queue"

Write-Host "`n=== Running Step 3: Post-Implementation Review ===" -ForegroundColor Cyan
cline -y "Run the workflow at $WorkflowDir/step-3-post-implementation-review.md to review the implemented task"

Write-Host "`n=== Syncing queue (after step 3) ===" -ForegroundColor Cyan
cline -y "Run the utility workflow at $WorkflowDir/utility-sync-queue.md to sync the task queue"

Write-Host "`n=== Running Step 4: Execute Fix Plan ===" -ForegroundColor Cyan
cline -y "Run the workflow at $WorkflowDir/step-4-execute-fix-plan.md to fix any issues found"

Write-Host "`n=== Syncing queue (after step 4) ===" -ForegroundColor Cyan
cline -y "Run the utility workflow at $WorkflowDir/utility-sync-queue.md to sync the task queue"

Write-Host "`n=== Pipeline complete ===" -ForegroundColor Green