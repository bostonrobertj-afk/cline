# Step 1b: Resume UX Design Workflow

## META
Goal: Resume the UX design workflow from the exact point where it was interrupted.
Execute this file in order.
Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Analyze Current State">
  <action>lastStep: The most recently completed step number</action>
  <action>inputDocuments: What context was already loaded</action>
  <action>All other frontmatter variables</action>
  <ask>stepsCompleted: Which steps are already done</ask>
</step>

<step n="2" goal="Load All Input Documents">
  <action>For each document in inputDocuments, load the complete file</action>
  <action>This ensures you have full context for continuation</action>
  <action>Don't discover new documents - only reload what was previously processed</action>
</step>

<step n="3" goal="Summarize Current Progress">
  <action>Steps completed: {stepsCompleted}</action>
  <action>Last worked on: Step {lastStep}</action>
  <action>Context documents available: {len(inputDocuments)} files</action>
  <action>Current UX design specification is ready with all completed sections</action>
  <action>Current UX design document is ready with all completed sections</action>
</step>

<step n="4" goal="Determine Next Step">
  <action>If lastStep = 1 → Load ./step-02-discovery.md</action>
  <action>If lastStep = 2 → Load ./step-03-core-experience.md</action>
  <action>If lastStep = 3 → Load ./step-04-emotional-response.md</action>
  <action>Continue this pattern for all steps</action>
  <action>If lastStep indicates final step → Workflow already complete</action>
</step>

<step n="5" goal="Present Continuation Options">
  <action>Review the completed UX design specification with you</action>
  <action>Suggest next workflow steps (like wireframe generation or architecture)</action>
  <action>Start a new UX design revision</action>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
