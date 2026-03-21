---
agent_party: '{project-root}/_bmad/_config/agent-manifest.csv'
---
# Workflow

## META

- Goal: push the LLM to reconsider, refine, and improve its recent output.
- Execute this workflow in order.
- Halt whenever a user response is required.
- Speak in `{communication_language}`.

## RULES

- Load and use `./methods.csv` as the source of elicitation methods.
- Load and use `{agent_party}` as supporting context when selecting methods.
- Keep the elicitation focused on actionable improvements to the current content being enhanced.
- Each method application should build on the current enhanced version rather than restarting from the original draft.
- Use the CSV descriptions and output patterns as guidance, not rigid formatting constraints.

## EXECUTION

<step n="1" goal="Load elicitation methods and analyze the current context">
  <action>Load and read `./methods.csv` and `{agent_party}`.</action>
  <action>Review the current section or content being enhanced.</action>
  <action>Analyze the content type, complexity, stakeholder needs, risk level, and creative potential.</action>
  <action>Select 5 elicitation methods that best match the current context.</action>
  <detail>
    The selected methods should be strong fits for the current material rather than a random sample.
  </detail>
</step>

<step n="2" goal="Present elicitation choices to the user">
  <output>Display the advanced elicitation menu with options `1-5`, `r`, `a`, and `x`.</output>
  <ask>Ask the user to choose a method, reshuffle the list, list all methods, provide direct feedback, or proceed with the current content.</ask>
  <detail>
    - `1-5`: execute one of the currently presented methods
    - `r`: reshuffle and present 5 new methods
    - `a`: list all available methods compactly with descriptions
    - direct feedback: revise the content according to the feedback
    - `x`: stop elicitation and keep the current enhanced result
  </detail>
</step>

<step n="3" goal="Execute a selected elicitation method with user approval gating">
  <branch if="user selects a single method from the current menu or the list-all view">
    <action>Execute the chosen method descriptions from `./methods.csv` against the current enhanced content.</action>
    <output>Show the enhanced content or improvements produced by the method application.</output>
    <ask>Ask whether the proposed changes should be applied to the document.</ask>
    <branch if="user approves">
      <action>Apply the proposed changes to the current content.</action>
    </branch>
    <branch if="user rejects">
      <action>Discard the proposed changes and keep the current version unchanged.</action>
    </branch>
    <action>Re-present the elicitation menu after the method cycle completes.</action>
  </branch>
</step>

<step n="4" goal="Handle reshuffle and list-all requests">
  <branch if="user selects `r`">
    <action>Select 5 new diverse elicitation methods and re-present the menu.</action>
  </branch>
  <branch if="user selects `a`">
    <output>List all available methods compactly with descriptions.</output>
    <ask>Allow the user to select a method by number or name.</ask>
  </branch>
</step>

<step n="5" goal="Handle direct feedback and multi-method requests">
  <branch if="user gives direct feedback">
    <action>Apply the feedback to the current enhanced content.</action>
    <action>Re-present the elicitation choices.</action>
  </branch>
  <branch if="user selects multiple methods">
    <action>Execute the selected methods in sequence on the current enhanced content.</action>
    <output>Show the enhanced content or improvements produced by the combined method application.</output>
    <ask>Ask whether the proposed changes should be applied to the document.</ask>
    <branch if="user approves">
      <action>Apply the proposed changes to the current content.</action>
    </branch>
    <branch if="user rejects">
      <action>Discard the proposed changes and keep the current version unchanged.</action>
    </branch>
    <action>Re-present the elicitation choices after the combined method cycle completes.</action>
  </branch>
</step>

<step n="6" goal="Complete elicitation cleanly">
  <branch if="user selects `x`">
    <action>Stop elicitation and treat the current enhanced content as the final result.</action>
    <output>Return the enhanced content to the invoking workflow or process.</output>
  </branch>
  <detail>
    When this workflow is invoked indirectly, return the enhanced section to the calling workflow after the user selects `x`.
  </detail>
</step>

## CHECKPOINT

Every method application must halt for the user's apply or discard decision before the workflow continues.

## ADVISORY

- Preserve every user approval gate in this workflow.
- Keep the elicitation focused on improving the current content rather than restarting the exercise.
- Treat the current enhanced version as the working baseline after each accepted change.
