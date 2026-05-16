---
description: Validate task completion by checking output files, state files, content quality and completeness
---

# Bigtask Validator Command

## Parameter Validation

IF $ARGUMENTS is empty:
OUTPUT "Error: Missing required arguments."
OUTPUT "Usage: /bigtask-validator <project-name> or /bigtask-validator <project-name>/<task-id>"
OUTPUT "Examples:"
OUTPUT "  - /bigtask-validator project-a (validate all tasks in project)"
OUTPUT "  - /bigtask-validator project-a/task-1 (validate specific task)"
STOP

## Check Validation Mode

IF $ARGUMENTS contains "/":
SET $PROJECT_NAME = part before "/"
SET $TASK_ID = part after "/"
SET $MODE = "single"
ELSE:
SET $PROJECT_NAME = $ARGUMENTS
SET $TASK_ID = ""
SET $MODE = "project"

## Execution

## Validator Guidelines

The validator must thoroughly check:

1. **State File Validation**
   - Check if state file exists (`*-state.json`)
   - Verify status is "completed" (not "failed" or missing)
   - Verify outputFiles array is not empty
   - Check timestamp is present and valid

2. **Output Files Validation**
   - Verify all declared output files exist
   - Check file sizes (not empty, not too small)
   - Verify file content is not placeholder/boilerplate

3. **Content Quality Validation**
   - Check for required sections/structure
   - Verify code is not commented-out or incomplete
   - Check for obvious errors or missing implementations
   - Verify naming conventions and formatting

4. **Completeness Validation**
   - Compare with task plan requirements
   - Check if all subtasks are completed
   - Verify dependencies are satisfied

---

## Mode: Single Task Validation

If $MODE is "single", validate a specific task.

The format is: `/bigtask-validator project-name/task-id` (e.g., `/bigtask-validator project-a/task-1`)

1. Read `tasks/$PROJECT_NAME/task_plan.md` to understand the task requirements
2. Read `tasks/$PROJECT_NAME/$TASK_ID-state.json` to check state
3. Read output files in `tasks/$PROJECT_NAME/outputs/`
4. Generate validation report

---

## Mode: Project Validation

If $MODE is "project", validate all tasks in the project.

The format is: `/bigtask-validator project-name` (e.g., `/bigtask-validator project-a`)

1. Read `tasks/$PROJECT_NAME/task_plan.md` to get all tasks
2. Read all state files (`tasks/$PROJECT_NAME/*-state.json`)
3. Check each task's output files
4. Generate comprehensive validation report

---

## Validation Report Format

Create a `tasks/$PROJECT_NAME/validation-report.md` file:

```markdown
# Validation Report: $PROJECT_NAME

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | [n] |
| Completed | [n] |
| Failed | [n] |
| Pending | [n] |
| Overall Status | PASS/FAIL |

## Task Details

### Task 1: [Task Name]
- **Status**: ✅ Completed / ❌ Failed / ⏳ Pending
- **State File**: [exists/missing]
- **Output Files**: [list]
- **Quality Check**: [pass/fail]
- **Issues**: [list if any]

### Task 2: [Task Name]
- [Same structure]

## Issues Found

### Critical
- [Issue 1]
- [Issue 2]

### Warnings
- [Warning 1]

## Recommendations

- [Recommendation 1]
- [Recommendation 2]

## Next Steps

Based on validation results:
- If all passed: Ready for `/bigtask-aggregate`
- If failed tasks: Use `/bigtask-execute` to retry
- If pending tasks: Use `/bigtask-execute` to continue
```

---

## Quality Checks by File Type

### For Code Files
- No placeholder comments like "TODO", "FIXME"
- No empty functions or incomplete implementations
- Proper error handling exists
- Code follows reasonable best practices

### For Config Files
- All required fields are present
- Values are not placeholder/default
- No obvious misconfigurations

### For Documentation Files
- Content is not minimal/boilerplate
- Sections are properly structured
- Key information is present

Output the validation report and highlight any critical issues.