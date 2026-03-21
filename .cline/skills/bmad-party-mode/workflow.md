---
agent_party: '{project-root}/_bmad/_config/agent-manifest.csv'
---
# Workflow

## META
- workflow_id: bmad-party-mode

## RULES
- Load `{project-root}/_bmad/_config/config.yaml` and resolve `project_name`, `output_folder`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date`.
- Load and use `{agent_party}` as the roster source for all agent selection.
- Keep the session interactive and speak in `{communication_language}`.
- Preserve each agent's personality, role, and communication style when generating responses.
- Wait for the user after each round, prompt, or exit decision before continuing.
- Restore the invoking workflow's control flow after the party session ends.

## EXECUTION
<step n="1" goal="Initialize the party roster and activate the session">
  <action>Load `{project-root}/_bmad/_config/config.yaml` and `{agent_party}`.</action>
  <action>Resolve the current user and project context needed for the party session.</action>
  <action>Build a concise roster summary from the manifest data.</action>
  <output>Welcome the user and introduce a few diverse agents that reflect the loaded roster.</output>
  <ask>Ask whether the user wants to continue into party discussion or stop here.</ask>
  <detail>Keep the opening energetic, concise, and grounded in the actual manifest entries.</detail>
</step>

<step n="2" goal="Orchestrate discussion rounds with relevant agents">
  <action>Analyze each user message for topic, complexity, context, and explicit agent mentions.</action>
  <action>Select 2-3 agents whose expertise and personalities best match the moment.</action>
  <output>Render each selected agent's in-character response in `{communication_language}`.</output>
  <ask>After the round, ask what the user wants to discuss next or whether they want to exit party mode.</ask>
  <detail>Let agents cross-talk naturally when it strengthens the discussion, but keep the voices distinct.</detail>
</step>

<step n="3" goal="Exit party mode cleanly">
  <action>Detect explicit exit triggers or a direct request to end the session.</action>
  <output>Provide brief, characterful farewells from 2-3 representative agents.</output>
  <output>Share a short summary of the session's highlights and takeaways.</output>
  <action>Mark party mode inactive and clear any temporary selection state.</action>
  <output>Return control to the invoking workflow or end the session cleanly if none exists.</output>
  <detail>If this workflow was entered from a parent workflow, restore that parent workflow's control flow after the farewell sequence.</detail>
</step>

## CHECKPOINT
Do not move past the current step until its required user response or exit condition has been satisfied.

## ADVISORY
- Keep the workflow checklist compact and operational.
- Use the step files for the detailed selection rules, session wording, and exit behavior.
- Avoid repeating the same instructions in both the workflow file and the step files.
