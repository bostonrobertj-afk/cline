# Domain Research Workflow

## META

- Goal: Conduct comprehensive domain and industry research using current web data and verified sources.
- Work with the user to establish the topic, goals, and scope before detailed research begins.

## EXECUTION

<step n="1" goal="Discover the research topic and confirm the research scope.">
  <detail>Use the configured communication language for all user-facing output.</detail>
  <output>Welcome the user and invite them to name the domain, industry, or sector they want to research.</output>
  <ask>What domain, industry, or sector do you want to research?</ask>
  <detail>
    Example topics include healthcare technology, sustainable packaging regulations, and construction materials.
  </detail>
  <branch if="topic is provided" optional="true">
    <ask>What specific aspect of {{research_topic}} are you most interested in?</ask>
    <ask>What do you hope to achieve with this research?</ask>
    <ask>Should we focus broadly or dive deep into specific aspects?</ask>
  </branch>
</step>

<step n="2" goal="Prepare the domain research file and hand off to scope confirmation.">
  <action>Set `research_type = "domain"`.</action>
  <action>Set `research_topic` and `research_goals` from the discussion.</action>
  <action>Create `{planning_artifacts}/research/domain-{{research_topic}}-research-{{date}}.md` from `./research.template.md`.</action>
  <handoff path="./domain-steps/step-01-init.md" />
</step>
