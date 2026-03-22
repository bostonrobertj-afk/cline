---
wipFile: '{implementation_artifacts}/tech-spec-wip.md'
---

# Step 3: Generate Implementation Plan

## META

- Progress: Step 3 of 4
- Next: Review & Finalize
- Focus on the implementation sequence and acceptance criteria.
- Speak in the configured communication language.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Load the current state">
  <action>Read {wipFile} completely and extract all frontmatter values, the Overview section, and the Context for Development section.</action>
  <branch if="wip file is missing" optional="true">
    <output>The WIP file is missing. Return to Step 2 and create the investigation results first.</output>
    <exit />
  </branch>
</step>

<step n="2" goal="Generate the implementation plan">
  <action>Build specific implementation tasks ordered by dependency.</action>
  <detail>
    Each task should be a discrete, completable unit of work with a clear file path and a specific action.
  </detail>
  <detail>
    Use this format for each task:

    - [ ] Task N: clear action description
      - File: `path/to/file.ext`
      - Action: specific change to make
      - Notes: any implementation details
  </detail>
</step>

<step n="3" goal="Generate acceptance criteria">
  <action>Create testable acceptance criteria in Given/When/Then form.</action>
  <detail>
    Cover happy path functionality, error handling, edge cases when relevant, and integration points when relevant.
  </detail>
  <detail>
    Use this format for each AC:

    - [ ] AC N: Given [precondition], when [action], then [expected result]
  </detail>
</step>

<step n="4" goal="Complete the remaining spec sections">
  <action>Fill in Dependencies, Testing Strategy, and Notes.</action>
  <detail>
    Dependencies should cover external libraries or services, upstream work, and data or API dependencies.
  </detail>
  <detail>
    Testing Strategy should cover unit tests, integration tests, and manual testing steps.
  </detail>
  <detail>
    Notes should capture high-risk items, known limitations, and future considerations that are out of scope but worth noting.
  </detail>
</step>

<step n="5" goal="Write the complete spec and hand off to review">
  <action>Update {wipFile} with the full spec content.</action>
  <detail>
    Ensure all template sections are filled in, all placeholders are removed, all frontmatter values are current, and status is set to `review`.
  </detail>
  <detail>Update frontmatter to `stepsCompleted: [1, 2, 3]`.</detail>
  <output>The spec is ready for review and finalization.</output>
  <handoff path="./step-04-review.md" />
</step>
