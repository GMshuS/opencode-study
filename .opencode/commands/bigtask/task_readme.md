# Bigtask Orchestration System

This project uses a custom command system for state persistence and task orchestration across AI conversations.

## Commands

| Command                                       | Description                                                         |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `/bigtask-brainstorm <project-name> <主题>`   | 任务头脑风暴阶段：在bigtask-plan之前探索需求、方案思路、技术选型等  |
| `/bigtask-plan <project-name> <requirements>` | Split requirements into structured task plan for a specific project |
| `/bigtask-execute <project-name>/<task-id>`   | Execute a specific subtask by ID                                    |
| `/bigtask-status [project-name]`              | List all tasks and their status (optionally for a specific project) |
| `/bigtask-aggregate <project-name>`           | Aggregate all subtask outputs into final result                     |

## Workflow

```
┌─────────────────────────────────────────────────────────┐
│           Brainstorm (Optional)                        │
├─────────────────────────────────────────────────────────┤
│  /bigtask-brainstorm project-a 用户认证系统            │
│  → tasks/project-a/brainstorm.md                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              Multiple Projects Supported                │
├─────────────────────────────────────────────────────────┤
│  /bigtask-plan project-a ...  /bigtask-plan project-b ...│
│  → tasks/project-a/            → tasks/project-b/       │
│     task_plan.md                 task_plan.md           │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  /bigtask-execute project-a/task-1                     │
│  /bigtask-execute project-b/task-1                     │
│  (Independent execution, isolated directories)          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  /bigtask-aggregate project-a  → final-result.md        │
│  /bigtask-aggregate project-b  → final-result.md       │
└─────────────────────────────────────────────────────────┘
```

### Phase 1: Brainstorming (Optional)

Run `/bigtask-brainstorm project-a 用户认证系统` to explore requirements, solution ideas, and tech choices before planning.

- Creates: `tasks/project-a/brainstorm.md`
- Output contains exploration notes, ideas, and tech evaluation

### Phase 2: Task Planning

Run `/bigtask-plan project-a build a user auth system` to split requirements into tasks for a specific project.

- Creates: `tasks/project-a/task_plan.md`
- Each project has its own isolated directory

### Phase 3: Task Execution

Run `/bigtask-execute project-a/task-1` for each task.

- Creates: `tasks/project-a/task-1-state.json`
- Creates: `tasks/project-a/outputs/` directory for task outputs

### Phase 4: Aggregation

Run `/bigtask-aggregate project-a` to combine results for a specific project.

- Creates: `tasks/project-a/final-result.md`
- Creates: `tasks/project-a/status-summary.json`

## Directory Structure

```
tasks/
├── project-a/
│   ├── brainstorm.md
│   ├── task_plan.md
│   ├── task-1-state.json
│   ├── task-2-state.json
│   ├── outputs/
│   │   ├── task-1-output.md
│   │   └── task-2-output.md
│   ├── final-result.md
│   └── status-summary.json
└── project-b/
    ├── brainstorm.md
    ├── task_plan.md
    ├── ...
```

## Key Features

1. **Isolation**: Each project has its own `tasks/<project-name>/` directory
2. **Independence**: Multiple projects can be planned and executed in parallel without interference
3. **State Persistence**: Each task's state is saved in `<task-id>-state.json`
4. **Flexible Aggregation**: Aggregate results per project or across all projects
