# Step 1: Agent Loading and Party Mode Initialization

## META

- Goal: Load the complete BMAD agent roster, activate party mode, and route into live discussion.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Load the agent manifest and build the conversation roster">
  <action>Read {project-root}/_bmad/_config/agent-manifest.csv.</action>
  <action>Parse each manifest row and extract the agent name, display name, title, icon, role, identity, communication style, principles, module, and file path.</action>
  <action>Build the complete party-mode roster using the manifest data and any needed agent file configuration.</action>
  <detail>
    - Validate that the required manifest fields are present before using an entry.
    - Handle incomplete entries gracefully instead of failing the whole workflow when one row is malformed.
    - Organize the roster so later steps can select agents by expertise and communication style.
  </detail>
</step>

<step n="2" goal="Introduce party mode and present the loaded roster">
  <output>Announce that party mode is activated and that the BMAD agent roster has been loaded.</output>
  <output>Welcome {user_name} and explain that the session will use {communication_language} for user-facing discussion.</output>
  <action>Show a diverse sample of 3-4 loaded agents with their icons, names, titles, and short role descriptions.</action>
  <detail>
    - Choose a representative mix of agents so the user can immediately see the breadth of available perspectives.
    - Keep the introduction energetic and collaborative without turning it into a long monologue.
  </detail>
</step>

<step n="3" goal="Ask whether to begin the live discussion">
  <ask>Ask whether the user is ready to begin the multi-agent conversation.</ask>
  <branch if="the user is ready to continue" optional="true">
    <action>Mark the party mode state as initialized and ready for live discussion.</action>
    <handoff path="./step-02-discussion-orchestration.md" />
  </branch>
  <branch if="the user is not ready to continue" optional="true">
    <output>Pause party mode without starting the conversation.</output>
    <exit />
  </branch>
</step>

## CHECKPOINT

Halt if the manifest cannot be loaded, required agent data is missing beyond recovery, or the user has not confirmed that the discussion should begin.
