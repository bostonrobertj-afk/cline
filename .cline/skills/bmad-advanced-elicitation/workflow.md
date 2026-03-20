---
agent_party: '{project-root}/_bmad/_config/agent-manifest.csv'
---

## META

- Goal: push the LLM to reconsider, refine, and improve its recent output.
- Execute the flow in order.
- Halt whenever a user response is required.
- Speak in `communication_language`.

## EXECUTION

<step n="1" goal="Load elicitation methods and analyze context">
  <action>Load and read `./methods.csv` and `{agent_party}`.</action>
  <action>Review the current section or content being enhanced.</action>
  <action>Analyze content type, complexity, stakeholder needs, risk level, and creative potential.</action>
  <action>Select 5 methods that best match the current context.</action>
</step>

<step n="2" goal="Present elicitation choices">
  <output>Display the advanced elicitation menu with options 1-5, `r`, `a`, and `x`.</output>
  <ask>Ask the user to choose a method, reshuffle, list all methods, provide direct feedback, or proceed.</ask>
</step>

<step n="3" goal="Execute numbered method selections">
  <action>If the user selects one or more numbered methods, execute the chosen method descriptions from the CSV against the current enhanced content.</action>
  <output>Show the enhanced content or improvements produced by the method application.</output>
  <ask>Ask whether the proposed changes should be applied to the document.</ask>
  <action>If the user approves, apply the changes. If the user rejects them, discard the proposed changes.</action>
  <action>Re-present the elicitation menu after each completed method cycle.</action>
</step>

<step n="4" goal="Handle reshuffle and list-all requests">
  <action>If the user selects `r`, choose 5 new diverse methods and re-present the menu.</action>
  <action>If the user selects `a`, list all methods compactly with descriptions and allow selection by number or name.</action>
</step>

<step n="5" goal="Handle direct feedback and multi-method requests">
  <action>If the user gives direct feedback, apply it to the current content and re-present the choices.</action>
  <action>If the user selects multiple methods, execute them in sequence on the current enhanced content before returning to the menu.</action>
</step>

<step n="6" goal="Complete elicitation cleanly">
  <action>If the user selects `x`, stop elicitation and treat the current enhanced content as the final result.</action>
  <output>Return the enhanced content to the invoking workflow or process.</output>
</step>

## CHECKPOINT

Every method application must halt for the user's apply or discard decision before the workflow continues.

## ADVISORY

- Each method application should build on the current enhanced version rather than restarting from the original draft.
- Use the CSV descriptions and output patterns as guidance, not rigid formatting constraints.

## REFERENCE

- When invoked indirectly, return the enhanced section to the calling workflow after the user selects `x`.
- Keep the elicitation focused on actionable improvements to the current content.
