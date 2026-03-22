## META

- Goal: Synthesize functional requirements by capability area.
- Speak to the user in `{communication_language}`.
- Requirements should be complete, organized, and implementation-useful.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Understand the purpose of the functional requirements section">
  <action>Frame the functional requirements section as the capability contract for design, architecture, and development.</action>
</step>

<step n="2" goal="Extract and organize the capability areas">
  <action>Review the current PRD and extract the major capability areas implied by the vision, journeys, and scope.</action>
  <action>Group functional requirements under coherent capability areas instead of generating one undifferentiated list.</action>
</step>

<step n="3" goal="Generate and self-validate the functional requirements">
  <output>Create a complete functional requirements section organized by capability area.</output>
  <action>Check that requirements are clear, non-duplicative, and sufficiently complete to support downstream work.</action>
  <detail>Favor concrete behavior and capability language over implementation detail.</detail>
</step>

<step n="4" goal="Review, save, and continue">
  <ask>Present the functional requirements to the user for review and correction.</ask>
  <branch if="the user approves the functional requirements" optional="true">
    <action>Save the approved requirement set into the PRD.</action>
    <handoff path="./step-10-nonfunctional.md">Proceed to non-functional requirements.</handoff>
  </branch>
</step>

## CHECKPOINT

Wait for the user to approve the functional requirements before saving them.

## ADVISORY

- The FR section is the core capability contract for the product.
