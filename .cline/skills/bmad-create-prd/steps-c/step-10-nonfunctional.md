## META

- Goal: define the non-functional requirements that matter for this product.
- Speak to the user in `{communication_language}`.
- Only include categories that are relevant to this project.

## EXECUTION

<step n="1" goal="Frame the NFR discussion">
  <action>Explain that non-functional requirements define quality attributes and operational expectations rather than product features.</action>
</step>

<step n="2" goal="Assess relevant NFR categories">
  <action>Review the project context and determine which NFR categories are actually relevant, such as performance, security, scalability, accessibility, or integration.</action>
</step>

<step n="3" goal="Explore the relevant categories">
  <ask>Ask targeted questions for each relevant NFR category so the resulting requirements are specific and measurable.</ask>
</step>

<step n="4" goal="Make NFRs specific">
  <action>Convert vague quality expectations into concrete standards, thresholds, or operational expectations wherever possible.</action>
</step>

<step n="5" goal="Generate NFR content">
  <output>Create PRD-ready non-functional requirements content covering only the relevant categories.</output>
</step>

<step n="6" goal="Review, save, and continue">
  <ask>Present the NFR section to the user for review and refinement.</ask>
  <action>Save the approved NFRs into the PRD.</action>
  <ask>Present the continuation menu for moving to document polish.</ask>
  <action>If the user chooses to continue, append this step to `stepsCompleted` and load `./step-11-polish.md`.</action>
</step>

## CHECKPOINT

Wait for the user to approve the non-functional requirements before saving them.

## ADVISORY

- Exclude generic NFR boilerplate that does not materially apply to the project.

## REFERENCE

- The NFR section should help architecture and delivery teams understand the product’s quality bar.
