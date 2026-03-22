---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# Market Research Workflow

## META

- Goal: Conduct comprehensive market research using current web data and verified sources.
- Work with the user to establish the topic, goals, and scope before detailed research begins.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Discover the market research topic and confirm the research scope.">
  <action>Load and read the full config from {main_config}.</action>
  <action>Resolve {communication_language}, {document_output_language}, {planning_artifacts}, and {date}.</action>
  <detail>Use the configured communication language for all user-facing output.</detail>
  <output>Welcome the user and invite them to name the topic, problem, or area they want to research.</output>
  <ask>What topic, problem, or area do you want to research?</ask>
  <detail>
    Example topics include electric vehicle markets in Europe, plant-based food alternatives, and mobile payment solutions in Southeast Asia.
  </detail>
  <branch if="topic is provided" optional="true">
    <ask>What exactly about {{research_topic}} are you most interested in?</ask>
    <ask>What do you hope to achieve with this research?</ask>
    <ask>Should we focus broadly or dive deep into specific aspects?</ask>
  </branch>
</step>

<step n="2" goal="Prepare the market research file and hand off to scope confirmation.">
  <action>Set `research_type = "market"`.</action>
  <action>Set `research_topic` and `research_goals` from the discussion.</action>
  <action>Create `{planning_artifacts}/research/market-{{research_topic}}-research-{{date}}.md` from `./research.template.md`.</action>
  <handoff path="./steps/step-01-init.md" />
</step>
