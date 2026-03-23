---
# File references (ONLY variables used in this step)
prdFile: '{{prd_file_path}}'
validationWorkflow: '{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-prd/steps-v/step-v-01-discovery.md'
---

# step e 04 complete

## META

- Goal: Present summary of completed edits and offer next steps including seamless integration with validation workflow.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Compile Edit Summary">
  <action>List the sections that were added.</action>
  <action>List the sections that were updated.</action>
  <action>List the content that was removed.</action>
  <action>Describe any structure changes.</action>
  <action>Report the total number of sections affected.</action>
</step>

<step n="2" goal="Present Completion Summary">
  <action>Downstream workflows (UX Design, Architecture)</action>
  <action>Validation to ensure quality</action>
  <action>Production use</action>
</step>

<step n="3" goal="Present MENU OPTIONS">
  <action>ALWAYS halt and wait for user input</action>
  <action>Only proceed based on user selection</action>
  <branch if="user selects V">
    <handoff path="./steps-v/step-v-01-discovery.md">Run the full validation workflow.</handoff>
  </branch>
  <branch if="user selects E" optional="true">
    <handoff path="./step-e-03-edit.md">Return to the edit step for additional changes.</handoff>
  </branch>
  <branch if="user selects S" optional="true">
    <exit>Present a detailed summary and exit.</exit>
  </branch>
  <branch if="any other selection" optional="true">
    <detail>Help the user choose a next step, then redisplay the menu.</detail>
  </branch>
</step>

## CHECKPOINT

After ensuring that all task list items are complete (one-by-one, in order, using the complete_workflow_item tool),
Use the attempt_completion tool to send a final message to the user informing them that this workflow is complete, then HALT and await further instruction.
## ADVISORY

- Use this step to summarize completed work and route the user to validation or additional edits.
