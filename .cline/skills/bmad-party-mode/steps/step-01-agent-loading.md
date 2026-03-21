# Step 01 - Load Party Roster
Workflow ID: `bmad-party-mode`

## META
- workflow_id: bmad-party-mode

## EXECUTION
<step n="1" goal="Resolve party-mode configuration">
  <action>Load `{project-root}/_bmad/_config/config.yaml` and resolve the session values needed for party mode.</action>
  <action>Load `{project-root}/_bmad/_config/agent-manifest.csv` through `{agent_party}`.</action>
  <detail>Use the resolved `communication_language` for every user-facing line in this session.</detail>
</step>

<step n="2" goal="Parse and summarize the agent roster">
  <action>Extract each agent's `name`, `displayName`, `title`, `icon`, `role`, `identity`, `communicationStyle`, `principles`, `module`, and `path`.</action>
  <action>Build an internal roster summary grouped by expertise so selection stays balanced.</action>
  <detail>Prefer complete manifest entries and note missing fields instead of inventing values.</detail>
</step>

<step n="3" goal="Activate party mode and gate entry">
  <output>Welcome the user and introduce 2-3 diverse agents that reflect the loaded roster.</output>
  <ask>Ask whether the user wants to continue into the party discussion or stop here.</ask>
  <detail>Do not begin the discussion loop until the user chooses to continue.</detail>
</step>

## CHECKPOINT
Wait for the user's continue decision before loading the discussion orchestration step.

## ADVISORY
- Keep the introduction concise, energetic, and grounded in the loaded roster.
- Save any session state needed for the next step only after the user continues.
