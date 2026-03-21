---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 06 complete

## META

- Goal: close out the product brief workflow, validate the completed brief, and point to logical next steps.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Announce workflow completion">
  <action>Confirm the brief includes the executive summary, core vision, target users, success metrics, MVP scope, and future vision.</action>
  <output>The product brief is complete and ready for review.</output>
</step>

<step n="2" goal="Validate brief quality">
  <ask>Does the executive summary clearly communicate the vision and problem?</ask>
  <ask>Are the target users well defined with compelling personas?</ask>
  <ask>Do the success metrics connect user value to business objectives?</ask>
  <ask>Is the MVP scope focused and realistic?</ask>
</step>

<step n="3" goal="Recommend next steps">
  <action>
    Offer the most logical follow-on workflows.
    <detail>
      Consider:
      - `create-prd`
      - `create-ux-design`
      - `domain-research`
    </detail>
  </action>
</step>

<step n="4" goal="Celebrate the result">
  <output>Summarize the completed brief and its strategic value for the project.</output>
</step>

<step n="5" goal="Close the workflow">
  <output>Mark the product brief workflow complete and leave the user at the wrap-up stage.</output>
</step>

## CHECKPOINT

Pause for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
