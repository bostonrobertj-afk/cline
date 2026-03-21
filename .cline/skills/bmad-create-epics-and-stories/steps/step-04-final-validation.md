# step 04 final validation

## META

- Goal: Validate complete coverage of all requirements and confirm the stories are ready for development.
- Execute this step in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for checklist items and routing; use `<detail>` for supporting guidance.

## EXECUTION

<step n="1" goal="Validate FR coverage">
  <action>Check every FR from the requirements inventory and confirm it appears in at least one story.</action>
  <detail>
    Acceptance criteria should fully address each FR, and no FR should be left uncovered.
  </detail>
</step>

<step n="2" goal="Validate architecture implementation constraints">
  <action>Confirm starter-template handling, if any, and verify database or entity creation happens only when a story needs it.</action>
  <ask>Does the Architecture document specify a starter template?</ask>
  <ask>Are database tables or entities created only when stories need them?</ask>
  <detail>
    If Architecture specifies a starter template, Epic 1 Story 1 must be the starter-template setup story. Foundation work should only cover what the next story actually needs.
  </detail>
</step>

<step n="3" goal="Validate story quality">
  <action>Check that every story is completable by a single dev agent, has clear acceptance criteria, references the specific FRs it implements, and avoids forward dependencies.</action>
</step>

<step n="4" goal="Validate the epic structure">
  <action>Confirm the epics deliver user value, dependencies flow naturally, and there is no large upfront technical work that does not deliver user value.</action>
</step>

<step n="5" goal="Validate epic independence">
  <action>Confirm that each epic is complete for its domain and that each story builds only on earlier stories.</action>
  <ask>Does each epic deliver complete functionality for its domain?</ask>
  <ask>Can Epic 2 function without Epic 3 being implemented?</ask>
  <ask>Can Epic 3 function stand-alone using the outputs of Epics 1 and 2?</ask>
</step>

<step n="6" goal="Save the final document">
  <action>Update any remaining placeholders, ensure formatting is correct, and save the final `epics.md`.</action>
  <output>Save the final `epics.md`.</output>
</step>

<step n="7" goal="Present the final menu">
  <output>All validations complete. Offer `[C]` complete workflow and invite any final questions.</output>
  <ask>Would you like to complete the workflow now?</ask>
  <detail>
    If the user selects `C`, complete the workflow, save the final document state, and invoke `bmad-help`.
    If the user asks questions, answer them and redisplay the same menu.
  </detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Use the structured checklist above for validation.
- When the workflow completes, offer to answer any questions about the epics and stories.

