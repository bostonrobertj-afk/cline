---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 04 metrics

## META

- Goal: define measurable success metrics that connect user outcomes, business objectives, and strategy.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Discover success from the user perspective">
  <ask>How will we know we are succeeding for our users?</ask>
  <ask>What would make users say this was worth it?</ask>
  <ask>What metrics show we are creating real value?</ask>
</step>

<step n="2" goal="Translate user success into measurable outcomes">
  <action>
    Turn vague statements into observable behaviors.
    <detail>
      Example framing:
      - "Users are happy" becomes "Users complete [key action] within [timeframe]"
      - "Product is useful" becomes "Users return [frequency] and use [core feature]"
    </detail>
  </action>
  <ask>What outcome are users trying to achieve?</ask>
  <ask>How will they know the product is working for them?</ask>
  <ask>What moment tells them the problem is being solved?</ask>
</step>

<step n="3" goal="Define business objectives">
  <ask>What does success look like for the business at 3 months and 12 months?</ask>
  <ask>Are we measuring growth, engagement, revenue, efficiency, or something else?</ask>
  <ask>What business metric would make you say this is working?</ask>
  <action>
    Capture the relevant categories.
    <detail>
      Consider:
      - growth metrics
      - engagement metrics
      - financial metrics
      - strategic metrics
    </detail>
  </action>
</step>

<step n="4" goal="Define key performance indicators">
  <action>
    Convert objectives into measurable KPIs.
    <detail>
      Include targets, timeframes, and measurement method where useful.
    </detail>
  </action>
  <action>Include leading indicators that predict success.</action>
  <action>User acquisition can be framed as "X new users per month".</action>
</step>

<step n="5" goal="Connect metrics to strategy">
  <action>Connect each metric back to the product vision.</action>
  <action>Make sure user success drives business success.</action>
  <action>Avoid vanity metrics that do not support decisions.</action>
</step>

<step n="6" goal="Prepare the success metrics draft">
  <output>
    Draft the following content for append to the product brief.
    <detail>
      ```markdown
      ## Success Metrics

      [Success metrics content based on the conversation]

      ### Business Objectives

      [Business objectives content based on the conversation, or N/A if not discussed]

      ### Key Performance Indicators

      [Key performance indicators content based on the conversation, or N/A if not discussed]
      ```
    </detail>
  </output>
</step>

<step n="7" goal="Present the menu and pause">
  <output>Present the drafted metrics content and offer `[A]` Advanced Elicitation, `[P]` Party Mode, or `[C]` Continue.</output>
  <branch if="the user selects A">
    <action>Use the `bmad-advanced-elicitation` skill to deepen the metrics definition.</action>
  </branch>
  <branch if="the user selects P">
    <action>Use the `bmad-party-mode` skill to validate the metrics from additional perspectives.</action>
  </branch>
  <branch if="the user selects C">
    <action>Save the drafted metrics content to `{outputFile}` and update frontmatter `stepsCompleted: [1, 2, 3, 4]`.</action>
    <handoff path="./step-05-scope.md" />
  </branch>
  <ask>Invite the user to chat, ask questions, or choose A, P, or C.</ask>
  <output>Always halt and wait for user input after presenting the menu.</output>
</step>

## CHECKPOINT

Pause for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: `./step-05-scope.md`
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
