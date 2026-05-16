---
description: Execute a specific subtask by ID, or sequentially execute plan
---

# Bigtask Execute Command

## Parameter Validation

IF $ARGUMENTS is empty:
OUTPUT "Error: Missing required arguments."
OUTPUT "Usage: /bigtask-execute <project-name> or /bigtask-execute <project-name>/<task-id>"
OUTPUT "Examples:"
OUTPUT " - /bigtask-execute project-a (check status and sequentially execute)"
OUTPUT " - /bigtask-execute project-a/task-1 (execute specific task)"
STOP

## Check Execution Mode

IF $ARGUMENTS contains "/":
SET $PROJECT_NAME = part before "/"
SET $TASK_ID = part after "/"
SET $MODE = "single"
ELSE:
SET $PROJECT_NAME = $ARGUMENTS
SET $TASK_ID = ""
SET $MODE = "sequential"

## Execution

## Load Related Skills

Before executing the task:

1. Analyze task requirements to identify relevant skill categories (e.g., coding standards, testing, security, documentation)
2. Search for available skills in project skills directory
3. Automatically load related skills using the Skill tool
4. Apply skill guidelines during task execution

## Clarification Guidelines

During task execution, if you encounter any of the following, ASK THE USER for clarification:

- Task requirements are unclear or ambiguous
- Missing input files or dependencies not satisfied
- Conflicting instructions between task description and actual code
- Need clarification on expected output format or structure
- Encounter technical issues or blockers
- Unclear about coding standards or conventions to follow

When asking, be specific about what you need clarified and provide options when possible.

---

## Mode: Single Task Execution

If $MODE is "single", execute a specific subtask based on the provided task ID.

The format is: `/bigtask-execute project-name/task-id` (e.g., `/bigtask-execute project-a/task-1`)

1. First, read the `tasks/$PROJECT_NAME/task_plan.md` file to understand all tasks
2. Find the task with ID: $TASK_ID
3. Check for any input files that this task depends on (from previous task outputs)
4. Execute the task - output files are saved to appropriate locations based on task requirements

The task plan format is:

- **ID**: unique identifier
- **Description**: what the task does
- **Dependencies**: array of task IDs that must complete first
- **Input**: what files this task needs as input
- **Output**: what files this task produces

After execution, create a state file `tasks/$PROJECT_NAME/$TASK_ID-state.json` (e.g., `tasks/project-a/task-1-state.json`) with:

- taskId
- status (completed/failed)
- outputFiles (array of files created)
- timestamp

### MANDATORY: State File Required

DO NOT report execution complete until state file is created. The state file is the proof of execution.

Report the execution status and any files created.

---

## Mode: Sequential Execution

If $MODE is "sequential" (no task-id provided), check task status and execute tasks in order.

The format is: `/bigtask-execute project-name` (e.g., `/bigtask-execute project-a`)

1. First, read the `tasks/$PROJECT_NAME/task_plan.md` file to understand all tasks
2. Read all existing state files (`tasks/$PROJECT_NAME/*-state.json`) to determine completed tasks
3. Find the next pending task that has all dependencies satisfied
4. Execute the task - output files are saved to appropriate locations based on task requirements
5. Create the state file for the executed task
6. Output execution result and continue to next task automatically

### Execution Flow

```
1. Read task_plan.md → Get all tasks and their dependencies
2. Read existing *-state.json files → Determine completed tasks
3. Find next executable task:
   - Has status "pending" (not in any state file)
   - All dependencies are completed
4. Execute the task
5. CREATE OR UPDATE state file with status "completed" or "failed"
6. Output execution result and continue to next task automatically
```

### MANDATORY: State File Update

For EACH task execution, you MUST create/update the state file immediately:

**File Path**: `tasks/$PROJECT_NAME/<task-id>-state.json`

**Format**:

```json
{
  "taskId": "task-1",
  "status": "completed",
  "outputFiles": ["path/to/file.ext"],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Rules**:

- Create new state file if it doesn't exist
- Update existing state file with new status
- ALWAYS set status to "completed" or "failed" (never "pending")
- ALWAYS include outputFiles array (can be empty if no files)
- ALWAYS include timestamp in ISO 8601 format

DO NOT proceed to next task until state file is created/updated.

### Status Output Format

After each task execution, automatically output:

```
────────────────────────────────────────
📊 Task Status: $PROJECT_NAME

Completed: [n] tasks
Current: [task-id] - [status]
Pending: [n] tasks remaining

Next Task: [task-id] - [task description]
────────────────────────────────────────
```

Continue to next task automatically, without asking for confirmation.

Report the execution status after each task.
