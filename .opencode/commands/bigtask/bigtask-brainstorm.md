---
description: Task brainstorming phase - explore requirements, solutions, and tech choices
---

# Bigtask Brainstorm Command

## Parameter Validation

IF $ARGUMENTS is empty:
OUTPUT "Error: Missing required arguments."
OUTPUT "Usage: /bigtask-brainstorm <project-name> <theme>"
OUTPUT "Example: /bigtask-brainstorm project-a user authentication system"
STOP

IF $ARGUMENTS does not contain " " (no space between project name and theme):
OUTPUT "Error: Missing theme description."
OUTPUT "Usage: /bigtask-brainstorm <project-name> <theme>"
OUTPUT "Example: /bigtask-brainstorm project-a user authentication system"
STOP

SET $PROJECT_NAME = first word of $ARGUMENTS
SET $THEME = $ARGUMENTS after first space

## Execution

## Interactive Brainstorming Guidelines

During brainstorming, you MUST continuously engage with the user. DO NOT proceed without confirmation.

### Required Interaction Pattern

1. **Start with Questions**: Begin by asking the user clarifying questions about their needs
2. **Propose and Confirm**: For each major decision point, propose options and wait for confirmation
3. **Discuss Before Concluding**: When you identify issues or risks, discuss them with the user before moving on

### Decision Points That Require User Confirmation

- **Scope Definition**: What features are in/out of scope?
- **Technology Preferences**: Any specific tech stack requirements?
- **Architecture Choice**: Monolithic vs microservices, SPA vs MPA, etc.
- **Priority**: What's most important - speed, maintainability, scalability?
- **Constraints**: Budget, timeline, team skills, existing systems?

### What to Do When Issues Arise

When you encounter unclear requirements, conflicting constraints, or potential risks:

1. STOP and describe the issue clearly
2. Present options or questions
3. WAIT for user response
4. ONLY proceed after confirmation

### NEVER Do These

- DO NOT assume user preferences without asking
- DO NOT make technology choices without discussing trade-offs
- DO NOT proceed with unclear requirements
- DO NOT skip over potential risks without flagging them
- DO NOT finish without confirming key decisions

### Example Interaction Flow

```
You: "Before we continue, I have a few questions:
1. What is your target audience - consumers or enterprises?
2. Do you have an existing database, or should we design from scratch?
3. What is your timeline - days, weeks, or months?"

[Wait for user response]

You: "Based on what you mentioned, here are my initial thoughts on [X]. Does this align with your expectations?"

[Wait for user response]

...continue iterating until all key decisions are confirmed...
```

---

Explore the following topic and generate comprehensive brainstorming notes:

**Project Name**: $PROJECT_NAME

**Theme**: $THEME

First, check existing brainstoriming files in `tasks/$PROJECT_NAME/` if they exist to avoid duplication.

Create a `tasks/$PROJECT_NAME/brainstorm.md` file with the following structure:

```markdown
# Brainstorm: $PROJECT_NAME

## Theme

[Topic being brainstormed]

## Requirements Exploration

### Key Questions

- [Question 1]
- [Question 2]
- ...

### User Scenarios

- [Scenario 1]
- [Scenario 2]
- ...

## Solution Options

### Option 1: [Name]

- **Description**: [What it is]
- **Pros**: [Advantages]
- **Cons**: [Disadvantages]
- **Best For**: [Use cases]

### Option 2: [Name]

- [Same structure]

[Continue with more options...]

## Technology Stack

### Recommended Stack

- **Frontend**: [Option]
- **Backend**: [Option]
- **Database**: [Option]
- **Hosting**: [Option]
- **Other Tools**: [List]

### Alternative Stacks

- [Alternative 1]
- [Alternative 2]

## Risks and Open Questions

### High Priority

- [Risk/Question 1]
- [Risk/Question 2]

### Medium Priority

- [Risk/Question 3]

### To Investigate Later

- [Items to explore in detail during task planning]

## Next Steps

After brainstorming, proceed to `/bigtask-plan` to create the task plan based on the explored direction.

Use this brainstorming output as input context for the task planning phase.
```

Output the brainstorming notes and explain the reasoning behind each exploration area.

## File Modification Restriction

DURING the entire brainstorming execution, you MUST only modify the following file:

- `tasks/$PROJECT_NAME/brainstorm.md`

DO NOT modify any other files, including:

- No code files
- No configuration files
- No other markdown files
- No task plan files

If you need to reference other files, read them but DO NOT modify them.

## Final Confirmation

Before completing brainstorming, CONFIRM the following with the user:

1. **Scope**: Is the defined scope correct?
2. **Technology**: Are the recommended technology choices acceptable?
3. **Risks**: Are you aware of and accept the identified risks?
4. **Next Steps**: Do you want to proceed to `/bigtask-plan`?

ONLY after user confirmation, output the completion message with next steps instruction:

```
────────────────────────────────────────
🧠 Brainstorming Completed: $PROJECT_NAME

The brainstorming notes have been saved to:
tasks/$PROJECT_NAME/brainstorm.md

To proceed, use:
/bigtask-plan $PROJECT_NAME [your refined requirements]
────────────────────────────────────────
```

DO NOT automatically proceed to task planning.
