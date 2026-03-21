---
name: 'step-e-04-complete'
description: 'Summarize the PRD edits and offer the next action'
workflowPath: '../'
validationWorkflow: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/steps-v/step-v-01-discovery.md'
---

# Edit Step 4: Complete the edit workflow

## META

- Goal: Summarize the completed edits and offer the next action, including validation or more edits.
- Execute this phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Keep this as the final edit-phase summary.

## EXECUTION

<step n="1" goal="Compile the edit summary">
  <action>Summarize the sections added, updated, removed, and structurally changed.</action>
  <detail>Include the edit mode, the number of sections affected, and the main quality improvements.</detail>
</step>

<step n="2" goal="Present the completion summary">
  <output>Show the updated PRD path, the major changes, and what the PRD is ready for next.</output>
  <detail>Keep the summary concise and concrete.</detail>
</step>

<step n="3" goal="Offer the next action">
  <ask>What would you like to do next?</ask>
  <detail>
    [V] Run Full Validation
    [E] Edit More
    [S] Summary
    [X] Exit
  </detail>
</step>

<step n="4" goal="Route the selected next action">
  <branch if="the user selects V">
    <handoff path="{validationWorkflow}" />
  </branch>
  <branch if="the user selects E">
    <handoff path="./step-e-03-edit.md" />
  </branch>
  <branch if="the user selects S or X">
    <exit />
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- This is the final edit phase.
- Validation is optional and can be launched from here without restarting the workflow.
- If the user chooses more edits, return to the edit phase with the approved changes updated first.
