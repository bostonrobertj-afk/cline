# step 08 complete

## META

- Goal: finalize the architecture workflow, mark completion, and guide the user to the next phase.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Treat this step as completion, handoff, and celebration.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Finalize architecture workflow state">
  <action>Update the architecture document frontmatter to reflect workflow completion.</action>
  <detail>
    Mark:
    - `stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]`
    - `workflowType: architecture`
    - `lastStep: 8`
    - `status: complete`
    - `completedAt: {date}`
  </detail>
</step>

<step n="2" goal="Present completion summary and next-step guidance">
  <output>Congratulate the user and summarize what was accomplished in the completed architecture workflow.</output>
  <output>Explain that the architecture document is now the technical source of truth for implementation agents.</output>
  <output>Recommend the next phase, including invoking `bmad-help` if the user wants guidance on what to do next.</output>
  <ask>Offer to answer questions about the completed architecture document.</ask>
</step>

## CHECKPOINT

Complete the final summary and workflow-state update before ending the workflow.

## ADVISORY

- Celebrate completion without overselling certainty.
- Keep the next-step guidance practical and implementation-oriented.
