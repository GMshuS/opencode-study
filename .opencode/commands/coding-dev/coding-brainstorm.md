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

First, check existing brainstoriming files in `coding-dev/$PROJECT_NAME/` if they exist to avoid duplication.

Create a `coding-dev/$PROJECT_NAME/brainstorm.md` file with the following structure:

```markdown


```

## File Modification Restriction

DURING the entire brainstorming execution, you MUST only modify the following file:

- `coding-dev/$PROJECT_NAME/brainstorm.md`

DO NOT modify any other files, including:

- No code files
- No configuration files
- No other markdown files

If you need to reference other files, read them but DO NOT modify them.

## Final Confirmation

Before completing brainstorming, CONFIRM the following with the user:

1. **Scope**: Is the defined scope correct?
2. **Technology**: Are the recommended technology choices acceptable?
3. **Risks**: Are you aware of and accept the identified risks?

ONLY after user confirmation, output the completion message with next steps instruction:

```
────────────────────────────────────────
🧠 Brainstorming Completed: $PROJECT_NAME

The brainstorming notes have been saved to:
coding-dev/$PROJECT_NAME/brainstorm.md

To proceed, use:
/bigtask-plan $PROJECT_NAME [your refined requirements]
────────────────────────────────────────
```
