---
main_config: '{project-root}/_bmad/bmm/config.yaml'
sprint_status_file: '{implementation_artifacts}/sprint-status.yaml'
---

# Retrospective Workflow

## META

- Goal: Review a completed epic, capture lessons learned, and prepare the next epic.
- Progress through the numbered steps in sequence.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Load configuration and retrospective context">
  <action>Load config from {main_config}.</action>
  <action>Resolve {project_name}, {user_name}, {communication_language}, {document_output_language}, {user_skill_level}, {planning_artifacts}, {implementation_artifacts}, and {date}.</action>
  <detail>Keep all responses in {communication_language} and all document output in {document_output_language}.</detail>
</step>

<step n="2" goal="Identify the completed epic">
  <action>Load any project context file if it exists, then inspect {sprint_status_file} for the highest completed epic.</action>
  <branch if="a completed epic is detected" optional="true">
    <output>Based on sprint status, it looks like Epic {{detected_epic}} was recently completed.</output>
    <ask>Is that the epic you want to review, or would you like to specify a different one?</ask>
  </branch>
  <branch if="no completed epic can be detected" optional="true">
    <ask>Which epic number did you just complete?</ask>
  </branch>
</step>

<step n="3" goal="Verify epic completeness">
  <detail>Count total stories, completed stories, and pending stories for the selected epic.</detail>
  <branch if="the epic is not complete" optional="true">
    <output>The selected epic still has pending stories.</output>
    <ask>Would you like to continue with a partial retrospective, finish the remaining stories first, or switch to planning?</ask>
    <branch if="the user declines the partial retrospective" optional="true">
      <exit>Halt the workflow until the epic is complete.</exit>
    </branch>
    <branch if="the user accepts the partial retrospective" optional="true">
      <action>Set `partial_retrospective` to true and continue.</action>
    </branch>
  </branch>
  <branch if="the epic is complete" optional="true">
    <output>The epic is complete and ready for retrospective.</output>
  </branch>
</step>

<step n="4" goal="Load project documents and epic artifacts">
  <detail>Load the selected epic, the optional previous retrospective, architecture context, PRD context, and any relevant project documentation using the load strategies in the input table.</detail>
  <detail>Keep the discovery focused on the selected epic and the immediately relevant supporting documents.</detail>
</step>

<step n="5" goal="Analyze story-level lessons">
  <detail>Review each story for development notes, challenges, review feedback, lessons learned, technical debt, and testing or quality insights.</detail>
  <detail>Summarize recurring themes across stories so the retrospective can focus on patterns rather than isolated incidents.</detail>
</step>

<step n="6" goal="Run the retrospective discussion">
  <output>Let’s review what happened, what we learned, and what to carry forward into the next epic.</output>
  <detail>Use a no-blame tone, invite specific examples, and keep the conversation grounded in systems and process.</detail>
  <ask>What stands out most from the completed epic: wins, lessons, risks, or action items for the next epic?</ask>
  <branch if="the user raises concerns" optional="true">
    <detail>Explore the concern, note the impact, and frame it as a system or process improvement opportunity.</detail>
  </branch>
</step>

<step n="7" goal="Document the retrospective">
  <detail>Write a concise epic review and a next-epic preparation section into the retrospective output file.</detail>
  <detail>Capture action items with clear ownership and keep the document focused on lessons and outcomes.</detail>
</step>

<step n="8" goal="Offer next steps">
  <output>Present the most relevant next-step options, such as validation, retrospective edits, or finishing with the completed summary.</output>
  <branch if="the user chooses validation" optional="true">
    <detail>Route to the validation workflow for the retrospective output.</detail>
  </branch>
  <branch if="the user chooses edits" optional="true">
    <detail>Return to the appropriate retrospective editing path if one is available in the parent workflow.</detail>
  </branch>
  <detail>
    Do not ask a new follow-up question just to keep the workflow open.
    If the user already requested a specific next action in the same task, acknowledge it in the closing guidance.
    Otherwise, stop cleanly after presenting the summary and options.
  </detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
