---
agent_party: '{project-root}/_bmad/_config/agent-manifest.csv'
---

## META

- Goal: Push the LLM to reconsider, refine, and improve its recent output.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Load elicitation methods and analyze the current context">
  <action>Load and read `./methods.csv` and `{agent_party}`.</action>
  <action>Review the current section or content being enhanced.</action>
  <action>Analyze the content type, complexity, stakeholder needs, risk level, and creative potential.</action>
  <action>Select five elicitation methods that best fit the current context.</action>
  <detail>Select methods intentionally rather than randomly. The chosen methods should fit the specific content and the kind of improvement the user needs.</detail>
</step>

<step n="2" goal="Present the elicitation menu">
  <output>Display the advanced-elicitation menu with five current methods plus `r` for reshuffle, `a` for all methods, and `x` to exit.</output>
  <ask>Ask the user to choose a method, reshuffle the menu, list all methods, provide direct feedback, or finish elicitation.</ask>
</step>

<step n="3" goal="Handle numbered-method selections with approval gating">
  <branch if="the user selects one or more numbered methods" optional="true">
    <action>Execute the selected method or methods against the current enhanced content.</action>
    <output>Show the improved content or the proposed changes produced by the method application.</output>
    <ask>Ask whether the proposed changes should be applied.</ask>
    <branch if="the user approves the changes" optional="true">
      <action>Apply the proposed changes to the working version of the content.</action>
    </branch>
    <branch if="the user rejects the changes" optional="true">
      <action>Discard the proposed changes and keep the prior working version.</action>
    </branch>
    <detail>Each completed method cycle should build on the current approved version rather than resetting to the original draft.</detail>
  </branch>
</step>

<step n="4" goal="Handle reshuffle and list-all requests">
  <branch if="the user selects `r`" optional="true">
    <action>Choose five new diverse methods and re-present the menu.</action>
  </branch>
  <branch if="the user selects `a`" optional="true">
    <output>List all available methods compactly with short descriptions and allow selection by number or name.</output>
  </branch>
</step>

<step n="5" goal="Handle direct feedback and iterative refinement requests">
  <branch if="the user gives direct feedback instead of choosing a named method" optional="true">
    <action>Apply the user's feedback to the current working content.</action>
    <output>Show the revised content and return to the elicitation menu.</output>
  </branch>
  <branch if="the user wants to continue refining after any completed cycle" optional="true">
    <output>Re-present the elicitation menu so the user can choose another method or exit.</output>
  </branch>
</step>

<step n="6" goal="Exit elicitation cleanly">
  <branch if="the user selects `x`" optional="true">
    <action>Stop elicitation and treat the current approved version as the final result.</action>
    <output>Return the enhanced content to the invoking workflow or process.</output>
  </branch>
</step>

## CHECKPOINT

Every method application must halt for the user's apply or discard decision before the workflow continues.

## ADVISORY

- Each method application should build on the current enhanced version rather than restarting from the original draft.
- Use the CSV descriptions and output patterns as guidance, not rigid formatting constraints.
