# Step 08 - Completion

Workflow ID: `bmad-create-architecture`

## EXECUTION
<step n="1" goal="Congratulate the user on completion">
  <action>Celebrate the collaboration and summarize what was achieved together.</action>
</step>

<step n="2" goal="Finalize workflow state and handoff">
  <action>Update the document frontmatter to `stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]`, `workflowType: 'architecture'`, `lastStep: 8`, `status: 'complete'`, and `completedAt: '{{current_date}}'`.</action>
  <action>Invoke the `bmad-help` skill.</action>
  <ask>Offer to answer any questions about the Architecture Document.</ask>
</step>

## CHECKPOINT
Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
