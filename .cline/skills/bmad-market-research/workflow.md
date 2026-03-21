---
main_config: '{project-root}/_bmad/bmm/config.yaml'
outputFile: '{planning_artifacts}/research/market-{{research_topic}}-research-{{date}}.md'
---

# bmad market research workflow

## META
- Goal: conduct source-verified market research on the selected topic.
- Speak in `{communication_language}` and write the report in `{document_output_language}`.
- Use the discovered topic and goals from the triggering conversation.
- Keep the workflow append-only and gate each phase on explicit user confirmation.

## EXECUTION
<step n="1" goal="Load workflow context and initialize the research file">
  <action>Resolve `project_name`, `output_folder`, `planning_artifacts`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date` from `{main_config}`.</action>
  <action>Bind `research_type = "market"` and carry forward the discovered `research_topic` and `research_goals` from the conversation context.</action>
  <action>Create `{outputFile}` from `./research.template.md` if the file does not already exist.</action>
  <detail>The initialization phase should begin with the discovered topic and goals already in context so the next step can focus on scope refinement instead of re-asking for the topic.</detail>
</step>

<step n="2" goal="Open the market-research initialization phase">
  <output>Load and follow `./steps/step-01-init.md` with the current topic and goals in context.</output>
</step>

## CHECKPOINT
Halt for user input, confirmation, or missing context before advancing to later phases.

## ADVISORY
- Keep the workflow focused on market research and current-source verification.
- Do not duplicate workflow files or change the file layout.
- Let the phase files carry the detailed research and document-appending instructions.
