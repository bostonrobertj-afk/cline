## META

- Goal: Finalize the UX design workflow, update status tracking, and guide the user to the most relevant next workflows.
- Speak to the user in `{communication_language}`.
- Do not load additional UX design phase files after this step.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.
## EXECUTION

<step n="1" goal="Announce UX design completion">
  <output>Tell the user the UX design specification is complete and summarize the major areas that were created.</output>
</step>

<step n="2" goal="Identify the final deliverables">
  <output>State clearly where the completed UX design assets live, including `{planning_artifacts}/ux-design-specification.md` and any supplemental outputs such as color theme or design-direction artifacts when they exist.</output>
</step>

<step n="3" goal="Update workflow status tracking">
  <branch if="a workflow status file exists" optional="true">
    <action>Update the workflow status file and record the UX design completion details while preserving structure and comments.</action>
  </branch>
  <action>Update frontmatter so this step is appended to `stepsCompleted`.</action>
</step>

<step n="4" goal="Suggest relevant next workflows">
  <action>
    Dispatch a dedicated subagent for next-step guidance.
    <detail>
      Instruct the subagent to call `use_skill` with `skill_name = "bmad-help"`.
      Prompt the subagent with the completed UX specification context and the instruction to return the most relevant next workflow options.
      Tell the subagent to return concise next-step recommendations that can be shown to the user in this thread.
    </detail>
  </action>
  <output>Explain that likely next workflows include architecture, epic creation, development planning, or later-stage visual design work.</output>
</step>

<step n="5" goal="Confirm the workflow is finished">
  <output>Congratulate the user and confirm that the UX workflow is complete and ready to guide visual design, prototyping, architecture, and implementation.</output>
</step>

## CHECKPOINT

After ensuring that all task list items are complete (one-by-one, in order, using the complete_workflow_item tool),
Use the attempt_completion tool to send a final message to the user informing them that this workflow is complete, then HALT and await further instruction.
## ADVISORY

- Suggested next actions are advisory follow-on options, not blocking tasks for this workflow.
