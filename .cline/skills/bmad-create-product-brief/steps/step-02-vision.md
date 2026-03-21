---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 02 vision

## META

- Goal: define the product vision, the problem it solves, and the differentiators that make the approach compelling.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Explore the core problem">
  <ask>What core problem are you trying to solve?</ask>
  <ask>Who feels this problem most acutely?</ask>
  <ask>What would success look like for the people you are helping?</ask>
</step>

<step n="2" goal="Understand the problem in more depth">
  <ask>How do people solve this today?</ask>
  <ask>What is frustrating or inefficient about the current approach?</ask>
  <ask>What happens if the problem is left unsolved?</ask>
</step>

<step n="3" goal="Review the current solution landscape">
  <ask>What solutions exist today?</ask>
  <ask>Where do they fall short?</ask>
  <ask>What gap are they leaving open?</ask>
</step>

<step n="4" goal="Shape the solution vision">
  <ask>If we solved this perfectly, what would that look like?</ask>
  <ask>What is the smallest meaningful way to make a difference?</ask>
  <ask>What makes your approach different from what is already out there?</ask>
</step>

<step n="5" goal="Surface differentiators">
  <ask>What is your unfair advantage?</ask>
  <ask>What would be hard for competitors to copy?</ask>
  <ask>What insight or approach is uniquely yours?</ask>
</step>

<step n="6" goal="Prepare the executive summary draft">
  <output>
    Draft the following content for append to the product brief.
    <detail>
      ```markdown
      ## Executive Summary

      [Executive summary content based on the conversation]

      ---

      ## Core Vision

      ### Problem Statement

      [Problem statement content based on the conversation]

      ### Problem Impact

      [Problem impact content based on the conversation]

      ### Why Existing Solutions Fall Short

      [Analysis of existing solution gaps based on the conversation]

      ### Proposed Solution

      [Proposed solution description based on the conversation]

      ### Key Differentiators

      [Key differentiators based on the conversation]
      ```
    </detail>
  </output>
</step>

<step n="7" goal="Present the menu and pause">
  <output>Present the drafted vision content and offer `[A]` Advanced Elicitation, `[P]` Party Mode, or `[C]` Continue.</output>
  <branch if="the user selects A">
    <action>Use the `bmad-advanced-elicitation` skill to deepen and refine the current vision draft.</action>
  </branch>
  <branch if="the user selects P">
    <action>Use the `bmad-party-mode` skill to explore alternate perspectives on positioning and differentiation.</action>
  </branch>
  <branch if="the user selects C">
    <action>Save the drafted vision content to `{outputFile}` and update frontmatter `stepsCompleted: [1, 2]`.</action>
    <handoff path="./step-03-users.md" />
  </branch>
  <ask>Invite the user to chat, ask questions, or choose A, P, or C.</ask>
  <output>Always halt and wait for user input after presenting the menu.</output>
</step>

## CHECKPOINT

Pause for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Next handoff: `./step-03-users.md`
- Persist workflow state updates whenever this phase writes or updates a managed artifact.
