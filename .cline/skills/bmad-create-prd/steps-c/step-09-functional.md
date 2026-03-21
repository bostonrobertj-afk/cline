
# step 09 functional

## META

- Goal: Synthesize functional requirements by capability area.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction and handoff.

## EXECUTION

<step n="1" goal="Understand the purpose of the FR section">
  <action>Frame the functional requirements section as the capability contract for design, architecture, and development.</action>
</step>

<step n="2" goal="Extract capabilities from the PRD">
  <action>Review the current PRD and extract the major capability areas implied by the vision, journeys, and scope.</action>
</step>

<step n="3" goal="Organize requirements by capability">
  <action>Group functional requirements under coherent capability areas instead of generating one undifferentiated list.</action>
</step>

<step n="4" goal="Generate comprehensive functional requirements">
  <output>Create a complete functional requirements section organized by capability area.</output>
</step>

<step n="5" goal="Self-validate the requirement set">
  <action>Check that requirements are clear, non-duplicative, and sufficiently complete to support downstream work.</action>
</step>

<step n="6" goal="Review, save, and continue">
  <ask>Present the functional requirements to the user for review and correction.</ask>
  <action>Save the approved requirement set into the PRD.</action>
  <ask>Present the continuation menu for moving to non-functional requirements.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-10-nonfunctional.md`.</action>
</step>

## CHECKPOINT

Wait for the user to approve the functional requirements before saving them.

## ADVISORY
- Favor concrete behavior and capability language over implementation detail.
