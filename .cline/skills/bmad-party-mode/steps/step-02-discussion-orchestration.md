# Step 02 - Orchestrate Party Discussion
Workflow ID: `bmad-party-mode`

## META
- workflow_id: bmad-party-mode

## EXECUTION
<step n="1" goal="Analyze the new user message and pick the best agents">
  <action>Review the user's topic, complexity, context, and any explicit agent mentions.</action>
  <action>Select 2-3 agents whose expertise, tone, and principles fit the moment best.</action>
  <detail>Prefer balanced coverage over packing in too many voices.</detail>
</step>

<step n="2" goal="Generate the response round">
  <output>Render each selected agent's in-character response in `{communication_language}`.</output>
  <action>Allow agents to reference each other naturally when that improves the conversation.</action>
  <detail>Keep the voices distinct and avoid flattening them into a generic summary.</detail>
</step>

<step n="3" goal="Handle user questions and pauses">
  <branch if="an agent asks the user a direct question">
    <output>Stop the round immediately after the question and show that the session is awaiting the user.</output>
    <ask>Wait for the user's reply before any other agent continues.</ask>
  </branch>
  <branch if="the user requests exit or the conversation naturally concludes">
    <ask>Confirm whether the user wants to exit party mode or continue chatting.</ask>
  </branch>
  <detail>Keep the discussion moving only when no user response is required.</detail>
</step>

<step n="4" goal="Offer exit or continuation after each round">
  <output>Show the user the party-mode menu and invite the next response.</output>
  <ask>Ask whether the user wants to continue chatting or exit party mode.</ask>
  <detail>Honor explicit exit triggers immediately.</detail>
</step>

## CHECKPOINT
Every round must pause for the user's next choice before the workflow advances.

## ADVISORY
- Maintain agent personality, cross-talk, and topic relevance.
- Keep the roster state and conversation history available for the next round.
