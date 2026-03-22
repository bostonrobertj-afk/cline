---
config_source: '{project-root}/_bmad/bmm/config.yaml'
project_name: '{config_source}:project_name'
user_name: '{config_source}:user_name'
communication_language: '{config_source}:communication_language'
document_output_language: '{config_source}:document_output_language'
user_skill_level: '{config_source}:user_skill_level'
output_folder: '{config_source}:output_folder'
planning_artifacts: '{config_source}:planning_artifacts'
project_knowledge: '{config_source}:project_knowledge'
date: system-generated current datetime
---

## EXECUTION

<step n="1" goal="Discover the technical research topic and goals.">
  <action>Load `{project-root}/_bmad/bmm/config.yaml` and resolve `project_name`, `output_folder`, `planning_artifacts`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date`.</action>
  <output>Welcome {user_name}. Ask what technology, tool, or technical area they want to research.</output>
  <ask>What specific aspect of the topic should we focus on, what outcomes should this research support, and how broad should the scope be?</ask>
  <detail>
    Capture `research_topic` and `research_goals` from the conversation. Keep the discussion focused on technical architecture, implementation, integration, and adoption concerns.
  </detail>
</step>

<step n="2" goal="Route into the managed technical research workflow.">
  <action>Set `research_type = "technical"`.</action>
  <action>Set `research_topic` and `research_goals` from the confirmed discussion.</action>
  <action>Create `{planning_artifacts}/research/technical-{{research_topic}}-research-{{date}}.md` by copying `./research.template.md` exactly.</action>
  <handoff path="./technical-steps/step-01-init.md" />
</step>
