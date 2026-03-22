## META

- Goal: guide the user from topic discovery into the managed technical research workflow.
- Execute the flow in order.
- Halt whenever user input or workflow gating is required.
- Speak in `{communication_language}`.
- Do not begin web research until the topic and scope are confirmed.

## EXECUTION

<step n="1" goal="Discover the technical research topic and goals">
  <action>Load `{project-root}/_bmad/bmm/config.yaml` and resolve `project_name`, `output_folder`, `planning_artifacts`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date`.</action>
  <output>Welcome {user_name}. Ask what technology, tool, or technical area they want to research.</output>
  <ask>What specific aspect of the topic should we focus on, what outcomes should this research support, and how broad should the scope be?</ask>
  <detail>
    Capture `research_topic` and `research_goals` from the conversation.
    Keep the discussion focused on technical architecture, implementation, integration, and adoption concerns.
  </detail>
</step>

<step n="2" goal="Route into the managed technical research workflow">
  <action>Set `research_type = "technical"`.</action>
  <action>Set `research_topic` and `research_goals` from the confirmed discussion.</action>
  <action>Create `{planning_artifacts}/research/technical-{{research_topic}}-research-{{date}}.md` by copying `./research.template.md` exactly.</action>
  <handoff path="./technical-steps/step-01-init.md" />
</step>

## CHECKPOINT

Do not hand off until the topic, primary focus, research goals, and desired scope are clear.

## ADVISORY

- Keep the discovery conversation brief and practical.
- Pass the confirmed topic into the first technical step so it can refine scope instead of restarting discovery.
- Keep all user-facing text in `{communication_language}`.
