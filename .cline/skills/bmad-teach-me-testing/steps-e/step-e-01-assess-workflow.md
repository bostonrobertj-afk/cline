---
name: 'step-e-01-assess-workflow'
description: 'Assess what the learner wants to change in the teaching workflow'

nextStepFile: './step-e-02-apply-edits.md'
workflowPath: '../'
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'
---

# Edit Step 1: Assess What to Edit

## META

- Goal: capture the desired workflow changes before any edits are made.
- Keep this step in discovery mode.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Ask what should be edited">
  <output>Invite the user to describe the change they want in the teaching workflow.</output>
  <detail>Common topics include session content, quiz questions, fragment lists, templates, resource references, and role-based examples.</detail>
</step>

<step n="2" goal="Clarify the edit scope">
  <action>Ask follow-up questions that identify the target session or file, the exact change, and the reason for the change.</action>
  <detail>Keep the questions specific so the edit plan is actionable.</detail>
</step>

<step n="3" goal="Load relevant source material">
  <action>Load the current workflow or step files that are relevant to the requested change.</action>
  <action>Show the user the current content that will be edited.</action>
</step>

<step n="4" goal="Document the edit plan">
  <output>Summarize the target files, required changes, and reason for the edits, then ask whether to proceed.</output>
</step>

<step n="5" goal="Offer routing options">
  <ask>Ask the user to choose `A` for Advanced Elicitation, `P` for Party Mode, or `C` to continue to the apply-edits step.</ask>
  <branch if="the user chooses `C`" optional="true">
    <handoff path="./step-e-02-apply-edits.md" />
  </branch>
</step>

## CHECKPOINT

Pause until the user approves the edit plan or chooses a routing option.
