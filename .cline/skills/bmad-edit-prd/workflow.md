---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# workflow

## META

- Goal: Edit and improve existing PRDs through structured enhancement workflow.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Configuration Loading">
  <action>project_name, output_folder, planning_artifacts, user_name</action>
  <action>communication_language, document_output_language, user_skill_level</action>
  <action>date as system-generated current datetime</action>
  <output>✅ YOU MUST ALWAYS WRITE all artifact and document content in {document_output_language}.</output>
</step>

<step n="2" goal="Route to Edit Workflow">
  <ask>&quot;Edit Mode: Improving an existing PRD.&quot; Prompt for PRD path: &quot;Which PRD would you like to edit?</ask>
  <ask>Please provide the path to the PRD.md file.&quot; Then read fully and follow: ./steps-e/step-e-01-discovery.md</ask>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: ./steps-e/step-e-01-discovery.md
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
- Do not load future step files until the current phase is complete and the workflow directs the transition.

## REFERENCE

<prose>
**Goal:** Edit and improve existing PRDs through structured enhancement workflow.

**Your Role:** PRD improvement specialist.

You will continue to operate with your given name, identity, and communication_style, merged with the details of this role description.

## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for disciplined execution:

### Core Principles

- **Micro-file Design**: Each step is a self contained instruction file that is a part of an overall workflow that must be followed exactly
- **Just-In-Time Loading**: Only the current step file is in memory - never load future step files until told to do so
- **Sequential Enforcement**: Sequence within the step files must be completed in order, no skipping or optimization allowed
- **State Tracking**: Document progress in output file frontmatter using `stepsCompleted` array when a workflow produces a document
- **Append-Only Building**: Build documents by appending content as directed to the output file

### Step Processing Rules

1. **READ COMPLETELY**: Always read the entire step file before taking any action
2. **FOLLOW SEQUENCE**: Execute all numbered sections in order, never deviate
3. **WAIT FOR INPUT**: If a menu is presented, halt and wait for user selection
4. **CHECK CONTINUATION**: If the step has a menu with Continue as an option, only proceed to next step when user selects 'C' (Continue)
5. **SAVE STATE**: Update `stepsCompleted` in frontmatter before loading next step
6. **LOAD NEXT**: When directed, read fully and follow the next step file

### Critical Rules (NO EXCEPTIONS)

- 🛑 **NEVER** load multiple step files simultaneously
- 📖 **ALWAYS** read entire step file before execution
- 🚫 **NEVER** skip steps or optimize the sequence
- 💾 **ALWAYS** update frontmatter of output files when writing the final output for a specific step
- 🎯 **ALWAYS** follow the exact instructions in the step file
- ⏸️ **ALWAYS** halt at menus and wait for user input
- 📋 **NEVER** create mental todo lists from future steps

## INITIALIZATION SEQUENCE

### 1. Configuration Loading

Load and read full config from {main_config} and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime

✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the configured `{communication_language}`.
✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`.

### 2. Route to Edit Workflow

"**Edit Mode: Improving an existing PRD.**"

Prompt for PRD path: "Which PRD would you like to edit? Please provide the path to the PRD.md file."

Then read fully and follow: `./steps-e/step-e-01-discovery.md`
</prose>
