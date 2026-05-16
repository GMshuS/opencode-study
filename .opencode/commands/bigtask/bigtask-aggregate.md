---
description: Aggregate all subtask outputs into final result
---

# Bigtask Aggregate Command

## Parameter Validation

IF $ARGUMENTS is empty OR $ARGUMENTS contains "/":
OUTPUT "Error: Missing required project name."
OUTPUT "Usage: /bigtask-aggregate <project-name>"
OUTPUT "Example: /bigtask-aggregate project-a"
STOP

## Execution

## Clarification Guidelines

During aggregation, if you encounter any of the following, ASK THE USER for clarification:

- Missing or incomplete task outputs that are expected
- Unclear how to combine certain types of outputs
- Task outputs have conflicting or inconsistent formats
- Need clarification on how to structure the final result
- Some tasks failed - how to handle in aggregation
- Need clarification on what should be included in the summary

When asking, be specific about what you need clarified and provide options when possible.

---

Aggregate all completed subtask outputs from a specific project into a final result.

The format is: `/bigtask-aggregate project-name` (e.g., `/bigtask-aggregate project-a`)

1. Read the `tasks/$ARGUMENTS/task_plan.md` file to understand all tasks
2. Find all completed task state files (e.g., `tasks/$ARGUMENTS/task-*-state.json`)
3. Read each completed task's output files from `tasks/$ARGUMENTS/outputs/`
4. Combine all results into a cohesive final output

After aggregation:

- Create a `tasks/$ARGUMENTS/final-result.md` file summarizing all completed tasks
- Create a `tasks/$ARGUMENTS/status-summary.json` with:
  - projectName
  - totalTasks
  - completedTasks (array of task IDs)
  - failedTasks (array of task IDs)
  - aggregatedOutput (path to final result)
  - timestamp

Report the aggregation results and show the final output.
