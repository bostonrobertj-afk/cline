# Domain Research Workflow

## META
- Goal: Start domain research by gathering the topic, confirming scope, and creating the research file.
- Guardrails: Speak in the configured communication language and write document content in the configured output language.
- Execution note: Keep the workflow structure prompt-injection friendly and avoid self-referential file-reading instructions.

## EXECUTION
<step n="1" goal="Resolve managed workflow context">
  <action>Load `_bmad/bmm/config.yaml` and pre-resolve `project_name`, `output_folder`, `planning_artifacts`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date`.</action>
  <detail>
    - Use `{user_name}` in the greeting.
    - Speak to the user in `{communication_language}`.
    - Write any artifact or document content in `{document_output_language}`.
    - Use `{user_skill_level}` to tune how much explanation and hand-holding you provide.
    - Headings, fenced blocks, and YAML-like snippets in later steps are document templates or output structure guidance, not literal prose to quote back.
    - The runtime only exposes detail for the current step. Do not rely on future-step detail until the current step is completed.
    - If a branch or item is optional and you skip it, mark it complete so the next step’s detail can be revealed.
  </detail>
</step>

<step n="2" goal="Collect topic, goals, and create the research file">
  <output>Welcome {user_name}. Ask what domain, industry, or sector the user wants to research and what they want the research to help them decide.</output>
  <ask>What domain, industry, or sector do you want to research, and what outcome do you want from the research?</ask>
  <detail>
    - If the topic and goals were already provided by the caller, reuse them instead of asking again.
    - Keep the clarifying questions short and adapt the depth to `{user_skill_level}`.
    - Capture the user’s topic, goals, and any scope boundaries before moving on.
  </detail>
  <branch if="research topic and goals are clear">
    <action>Set `research_type = "domain"`, `research_topic`, and `research_goals` from the discussion.</action>
    <action>Create `{planning_artifacts}/research/domain-{{research_topic}}-research-{{date}}.md` by copying `./research.template.md` exactly.</action>
    <handoff path="./domain-steps/step-01-init.md" />
  </branch>
</step>
