---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 01b continue

## META

- Goal: Resume the product brief workflow from the saved document state with the same supporting context restored.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Analyze the saved workflow state">
  <action>Review the frontmatter values in `{outputFile}`, including `stepsCompleted`, `lastStep`, `inputDocuments`, and the other saved workflow variables.</action>
  <output>Present a short progress summary covering the completed steps, the last completed step, and the number of saved context documents.</output>
</step>

<step n="2" goal="Restore only the previously confirmed context">
  <action>Reload each file listed in `inputDocuments`.</action>
  <detail>Do not perform new discovery during continuation. The goal here is to restore the previously confirmed context, not to expand it.</detail>
</step>

<step n="3" goal="Determine the next step from the saved state">
  <branch if="lastStep = 1" optional="true">
    <output>Set the next step to `./step-02-vision.md`.</output>
  </branch>
  <branch if="lastStep = 2" optional="true">
    <output>Set the next step to `./step-03-users.md`.</output>
  </branch>
  <branch if="lastStep = 3" optional="true">
    <output>Set the next step to `./step-04-metrics.md`.</output>
  </branch>
  <branch if="lastStep = 4" optional="true">
    <output>Set the next step to `./step-05-scope.md`.</output>
  </branch>
  <branch if="lastStep = 5" optional="true">
    <output>Set the next step to `./step-06-complete.md`.</output>
  </branch>
  <branch if="lastStep = 6" optional="true">
    <output>State that the workflow is already complete and shift into completion guidance instead of resuming a drafting step.</output>
  </branch>
</step>

<step n="4" goal="Ask the user whether to continue from the detected point">
  <ask>Ask the user whether the restored progress looks correct and whether they want to continue from the detected next step.</ask>
  <branch if="the workflow is already complete" optional="true">
    <output>Offer to review the completed product brief, suggest next workflows, or start a revision pass.</output>
  </branch>
  <branch if="the user confirms continuation" optional="true">
    <branch if="lastStep = 1" optional="true">
      <handoff path="./step-02-vision.md">Resume at product vision discovery.</handoff>
    </branch>
    <branch if="lastStep = 2" optional="true">
      <handoff path="./step-03-users.md">Resume at target-user discovery.</handoff>
    </branch>
    <branch if="lastStep = 3" optional="true">
      <handoff path="./step-04-metrics.md">Resume at success-metrics definition.</handoff>
    </branch>
    <branch if="lastStep = 4" optional="true">
      <handoff path="./step-05-scope.md">Resume at MVP scope definition.</handoff>
    </branch>
    <branch if="lastStep = 5" optional="true">
      <handoff path="./step-06-complete.md">Resume at workflow completion.</handoff>
    </branch>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
