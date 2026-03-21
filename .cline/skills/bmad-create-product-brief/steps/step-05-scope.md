---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 05 scope

## META

- Goal: define the MVP scope, the explicit boundaries, and the future direction for the product.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Set the scope frame">
  <ask>What is the absolute minimum we need to solve the core problem?</ask>
  <ask>What features would make users say this solves my problem?</ask>
  <ask>How do we balance ambition with delivering something valuable quickly?</ask>
</step>

<step n="2" goal="Define MVP core features">
  <action>
    Identify the essential capabilities.
    <detail>
      Keep the MVP focused on what solves the core problem, is feasible, and can be tested with user feedback.
    </detail>
  </action>
  <ask>What core functionality must work?</ask>
  <ask>Which features directly address the main problem?</ask>
  <ask>What would users consider incomplete if it were missing?</ask>
</step>

<step n="3" goal="Set out-of-scope boundaries">
  <ask>What would be nice to have but is not essential?</ask>
  <ask>What can wait for version 2.0?</ask>
  <ask>What are we intentionally saying no to for now?</ask>
  <action>
    Capture the boundary rationale.
    <detail>
      Make the trade-offs clear so stakeholders understand why certain items are deferred.
    </detail>
  </action>
</step>

<step n="4" goal="Define MVP success criteria">
  <ask>How will we know the MVP is successful?</ask>
  <ask>What metrics will show whether we should proceed beyond MVP?</ask>
  <ask>What user feedback signals validate the approach?</ask>
  <action>
    Include adoption, validation, and feasibility signals.
  </action>
</step>

<step n="5" goal="Describe the future vision">
  <ask>If this is wildly successful, what does it become in 2 to 3 years?</ask>
  <ask>What capabilities would we add with more resources?</ask>
  <ask>How does the MVP evolve into the full vision?</ask>
</step>

<step n="6" goal="Prepare the MVP scope draft">
  <output>
    Draft the following content for append to the product brief.
    <detail>
      ```markdown
      ## MVP Scope

      ### Core Features

      [Core features content based on the conversation]

      ### Out of Scope for MVP

      [Out of scope content based on the conversation, or N/A if not discussed]

      ### MVP Success Criteria

      [MVP success criteria content based on the conversation, or N/A if not discussed]

      ### Future Vision

      [Future vision content based on the conversation, or N/A if not discussed]
      ```
    </detail>
  </output>
</step>

<step n="7" goal="Present the menu and pause">
  <output>Present the drafted scope content and offer `[A]` Advanced Elicitation, `[P]` Party Mode, or `[C]` Continue.</output>
  <branch if="the user selects A">
    <action>Use the `bmad-advanced-elicitation` skill to optimize the scope definition.</action>
  </branch>
  <branch if="the user selects P">
    <action>Use the `bmad-party-mode` skill to validate the MVP scope from additional perspectives.</action>
  </branch>
  <branch if="the user selects C">
    <action>Save the drafted scope content to `{outputFile}` and update frontmatter `stepsCompleted: [1, 2, 3, 4, 5]`.</action>
    <handoff path="./step-06-complete.md" />
  </branch>
  <ask>Invite the user to chat, ask questions, or choose A, P, or C.</ask>
  <output>Always halt and wait for user input after presenting the menu.</output>
</step>

## CHECKPOINT

Pause for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: `./step-06-complete.md`
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
