# Step 2: Discussion Orchestration and Multi-Agent Conversation

## META

- Goal: Orchestrate dynamic multi-agent conversations with intelligent agent selection and clear exit handling.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Analyze the User Message">
  <action>Inspect the latest user message for topic, domain, tone, and requested outcome.</action>
  <action>Check for exit triggers: `*exit`, `goodbye`, `end party`, `quit`.</action>
  <branch if="an exit trigger is detected">
    <handoff path="./step-03-graceful-exit.md">Conclude party mode with graceful exit.</handoff>
  </branch>
  <branch if="no exit trigger is detected" optional="true">
    <detail>Proceed with agent selection and response generation.</detail>
  </branch>
</step>

<step n="2" goal="Select the Most Relevant Agents">
  <action>Choose 2-3 agents whose expertise best matches the user topic.</action>
  <action>If the user mentions a specific agent, prioritize that agent and add complementary voices.</action>
  <action>Rotate agent participation over time so the discussion stays balanced.</action>
  <detail>Prefer a primary expert, a complementary perspective, and a cross-domain or devil's-advocate voice when useful.</detail>
</step>

<step n="3" goal="Generate the Conversation Round">
  <action>Write each selected agent in character using their documented communication style.</action>
  <action>Allow natural cross-talk between agents where it strengthens the discussion.</action>
  <detail>Keep responses concise enough to preserve momentum, but specific enough to be useful.</detail>
  <branch if="an agent asks the user a direct question">
    <ask>Highlight the question and wait for the user response before continuing.</ask>
  </branch>
</step>

<step n="4" goal="Check for Conversation Boundaries">
  <branch if="the discussion is naturally concluding" optional="true">
    <ask>Would you like to continue or end party mode?</ask>
  </branch>
  <branch if="the user wants to exit party mode" optional="true">
    <handoff path="./step-03-graceful-exit.md">Conclude the session with graceful farewells.</handoff>
  </branch>
  <branch if="the user wants to continue" optional="true">
    <detail>Continue the conversation with the next relevant agent response round.</detail>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
