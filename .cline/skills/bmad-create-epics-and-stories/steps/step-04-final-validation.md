# step 04 final validation

## META

- Goal: Validate complete coverage of the requirements inventory and confirm that the stories are ready for development.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Validate coverage and implementation readiness across the full document">
  <action>Review every functional requirement and verify that it appears in at least one story.</action>
  <action>Check that the acceptance criteria for each mapped story fully address the requirement being implemented.</action>
  <action>Review story quality to confirm that each story is appropriately scoped, technically actionable, and free of forward dependencies.</action>
  <detail>Stories should be completable by a single development agent, reference the relevant requirements clearly, and avoid depending on future stories within the same epic.</detail>
</step>

<step n="2" goal="Validate Architecture and UX alignment in the final story set">
  <branch if="the Architecture document specifies a starter template" optional="true">
    <action>Verify that Epic 1 Story 1 reflects the required starter-template setup work.</action>
    <detail>That setup story should include cloning, dependency installation, and initial project configuration rather than broad unrelated infrastructure work.</detail>
  </branch>
  <action>Verify that entities, tables, and foundational technical work are introduced only when a story actually needs them.</action>
  <branch if="UX requirements were extracted earlier" optional="true">
    <action>Verify that the UX requirements are represented in the final story set rather than being left as unattached notes.</action>
  </branch>
</step>

<step n="3" goal="Validate epic structure and dependency flow">
  <action>Check that each epic delivers user value rather than acting as a purely technical milestone.</action>
  <action>Confirm that epic dependencies flow naturally and that later epics build on earlier ones without requiring future epics to function.</action>
  <ask>Ask whether the user sees any remaining gaps, dependency issues, or missing implementation details before finalizing.</ask>
  <branch if="validation issues are found" optional="true">
    <action>Revise the epic-and-story document to resolve the identified issues.</action>
    <output>Re-present the corrected validation results for confirmation.</output>
  </branch>
  <branch if="the user confirms the document is ready" optional="true">
    <output>State that the epic-and-story document is validated and ready for development.</output>
  </branch>
</step>

<step n="4" goal="Finalize and close the workflow">
  <action>Update any remaining placeholders in `{planning_artifacts}/epics.md`.</action>
  <action>Ensure the final document formatting is complete and consistent.</action>
  <output>Save the final `epics.md` and present the completed outcome to the user.</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
