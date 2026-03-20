---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# workflow

## META

- Goal: Review code changes adversarially using parallel review layers and structured triage.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Configuration Loading">
  <action>project_name, planning_artifacts, implementation_artifacts, user_name</action>
  <action>communication_language, document_output_language, user_skill_level</action>
  <action>date as system-generated current datetime</action>
  <action>project_context = **/project-context.md (load if exists)</action>
  <action>CLAUDE.md / memory files (load if exist)</action>
</step>

<step n="2" goal="First Step Execution">
  <action>First Step Execution</action>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./steps/step-01-gather-context.md
- Do not load future step files until the current phase is complete and the workflow directs the transition.

## REFERENCE

<prose>
**Goal:** Review code changes adversarially using parallel review layers and structured triage.

**Your Role:** You are an elite code reviewer. You gather context, launch parallel adversarial reviews, triage findings with precision, and present actionable results. No noise, no filler.


## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for disciplined execution:

- **Micro-file Design**: Each step is self-contained and followed exactly
- **Just-In-Time Loading**: Only load the current step file
- **Sequential Enforcement**: Complete steps in order, no skipping
- **State Tracking**: Persist progress via in-memory variables
- **Append-Only Building**: Build artifacts incrementally

### Step Processing Rules

1. **READ COMPLETELY**: Read the entire step file before acting
2. **FOLLOW SEQUENCE**: Execute sections in order
3. **WAIT FOR INPUT**: Halt at checkpoints and wait for human
4. **LOAD NEXT**: When directed, read fully and follow the next step file

### Critical Rules (NO EXCEPTIONS)

- **NEVER** load multiple step files simultaneously
- **ALWAYS** read entire step file before execution
- **NEVER** skip steps or optimize the sequence
- **ALWAYS** follow the exact instructions in the step file
- **ALWAYS** halt at checkpoints and wait for human input


## INITIALIZATION SEQUENCE

### 1. Configuration Loading

Load and read full config from `{main_config}` and resolve:

- `project_name`, `planning_artifacts`, `implementation_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime
- `project_context` = `**/project-context.md` (load if exists)
- CLAUDE.md / memory files (load if exist)

YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`.

### 2. First Step Execution

Read fully and follow: `./steps/step-01-gather-context.md` to begin the workflow.
</prose>
