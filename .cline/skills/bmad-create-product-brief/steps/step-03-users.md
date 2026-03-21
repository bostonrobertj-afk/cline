---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 03 users

## META

- Goal: define the target users, their motivations, and the journeys that show how the product creates value.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Identify the user groups">
  <ask>Who experiences the problem we are solving?</ask>
  <ask>Are there different user types with different needs?</ask>
  <ask>Who gets the most value from the solution?</ask>
</step>

<step n="2" goal="Develop primary user segments">
  <action>
    Create realistic primary user personas.
    <detail>
      Include a name, role, context, goals, motivations, current workarounds, and the emotional or practical impact of the problem.
    </detail>
  </action>
  <ask>Tell me about a typical person who would use {{project_name}}.</ask>
  <ask>What motivates them and what do they need to accomplish?</ask>
  <ask>How do they experience the problem today?</ask>
</step>

<step n="3" goal="Identify secondary users and stakeholders">
  <ask>Who else benefits from this solution even if they are not the primary user?</ask>
  <ask>Are there admin, support, or oversight roles we should include?</ask>
  <ask>Who influences the decision to adopt or purchase this product?</ask>
</step>

<step n="4" goal="Map the user journey">
  <action>
    Sketch the key touchpoints for the primary user.
    <detail>
      Cover discovery, onboarding, core usage, success moment, and how the product fits into the long term routine.
    </detail>
  </action>
  <ask>Walk me through how a primary persona would discover and start using {{project_name}}.</ask>
  <ask>What is their aha moment?</ask>
  <ask>How does the product change how they work or live?</ask>
</step>

<step n="5" goal="Prepare the target user draft">
  <output>
    Draft the following content for append to the product brief.
    <detail>
      ```markdown
      ## Target Users

      ### Primary Users

      [Primary user segment content based on the conversation]

      ### Secondary Users

      [Secondary user segment content based on the conversation, or N/A if not discussed]

      ### User Journey

      [User journey content based on the conversation, or N/A if not discussed]
      ```
    </detail>
  </output>
</step>

<step n="6" goal="Present the menu and pause">
  <output>Present the drafted user content and offer `[A]` Advanced Elicitation, `[P]` Party Mode, or `[C]` Continue.</output>
  <branch if="the user selects A">
    <action>Use the `bmad-advanced-elicitation` skill to deepen the personas and journeys.</action>
  </branch>
  <branch if="the user selects P">
    <action>Use the `bmad-party-mode` skill to validate the user understanding from additional perspectives.</action>
  </branch>
  <branch if="the user selects C">
    <action>Save the drafted user content to `{outputFile}` and update frontmatter `stepsCompleted: [1, 2, 3]`.</action>
    <handoff path="./step-04-metrics.md" />
  </branch>
  <ask>Invite the user to chat, ask questions, or choose A, P, or C.</ask>
  <output>Always halt and wait for user input after presenting the menu.</output>
</step>

## CHECKPOINT

Pause for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: `./step-04-metrics.md`
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
