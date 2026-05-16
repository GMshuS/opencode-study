---
description: List all tasks and their status
---

# Bigtask Status Command

## Parameter Validation

IF $ARGUMENTS contains "/":
OUTPUT "Error: Invalid project name. Project name should not contain '/'."
OUTPUT "Usage: /bigtask-status [project-name]"
OUTPUT "Examples: /bigtask-status or /bigtask-status project-a"
STOP

## Execution

## Clarification Guidelines

During status check, if you encounter any of the following, ASK THE USER for clarification:

- Task plan file is missing or corrupted
- Need clarification on which project's status to show
- State files have unexpected format or missing data
- Need clarification on display format preference

When asking, be specific about what you need clarified and provide options when possible.

---

List all tasks from the task plan(s) and their current execution status.

**Optional argument**: project name

- `/bigtask-status` - show all projects
- `/bigtask-status project-a` - show specific project

When argument is provided:

1. For a specific project: Read `tasks/$ARGUMENTS/task_plan.md` to get all tasks
2. Check for any existing task state files (e.g., `tasks/$ARGUMENTS/task-*-state.json`)
3. Display a table showing:
   - Project Name
   - Task ID
   - Description
   - Status (pending/completed/failed)
   - Dependencies

Report the overall progress percentage for each project.
