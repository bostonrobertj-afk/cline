# step 08 complete

## META

- Goal: finalize the architecture workflow, mark completion, and guide the user to the next phase.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Treat this step as completion, handoff, and celebration.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

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
  <output>
    Conclude the workflow after presenting the summary and next-step guidance.
    <detail>
      Do not ask a new follow-up question just to keep the workflow open.
      If the user already requested a specific follow-up in the same task, acknowledge it in the closing guidance.
      Otherwise, stop cleanly after the completion summary.
    </detail>
  </output>
</step>

## CHECKPOINT

After ensuring that all task list items are complete (one-by-one, in order, using the complete_workflow_item tool),
Use the attempt_completion tool to send a final message to the user informing them that this workflow is complete, then HALT and await further instruction.
## ADVISORY

- Celebrate completion without overselling certainty.
- Keep the next-step guidance practical and implementation-oriented.
