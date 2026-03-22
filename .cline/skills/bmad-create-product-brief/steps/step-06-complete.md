---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 06 complete

## META

- Goal: Complete the product brief workflow, confirm document quality, and guide the user toward logical next steps.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
## EXECUTION

<step n="1" goal="Summarize the completed product brief">
  <output>Announce that the product brief is complete and point the user to `{outputFile}`.</output>
  <output>Summarize the major completed sections, including the executive summary, core vision, target users, success metrics, and MVP scope.</output>
</step>

<step n="2" goal="Perform a final quality and alignment check">
  <output>Call out the final quality-check lenses: executive-summary clarity, user/persona accuracy, and alignment between success metrics, MVP scope, and intended outcomes.</output>
  <branch if="the user already requested final adjustments in the current task" optional="true">
    <action>Incorporate those final adjustments into `{outputFile}` before closing the workflow.</action>
  </branch>
</step>

<step n="3" goal="Recommend the most relevant next workflows">
  <output>Recommend `create-prd` as the primary next workflow when the user is ready for detailed requirements planning.</output>
  <branch if="the user wants UX work in parallel" optional="true">
    <output>Recommend `create-ux-design` as a complementary next workflow.</output>
  </branch>
  <branch if="the user still needs foundational research" optional="true">
    <output>Recommend `domain-research` before or alongside the next planning workflows.</output>
  </branch>
  <detail>Frame the brief as the strategic foundation that later planning, design, and development work should trace back to.</detail>
</step>

<step n="4" goal="Close the workflow cleanly">
  <action>Mark the workflow complete in the document state.</action>
  <output>
    Conclude the workflow after presenting the completed outcome and next-step guidance.
    <detail>
      Do not ask a new follow-up question just to keep the workflow open.
      If the user already requested a particular next action in the same task, acknowledge it in the closing guidance.
      Otherwise, stop cleanly after the completion summary.
    </detail>
  </output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
