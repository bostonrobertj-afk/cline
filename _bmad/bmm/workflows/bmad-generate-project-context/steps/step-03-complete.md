# Step 3: Context Completion & Finalization

<step n="3" goal="Finalize, optimize, and close the project context file">
  <action>Review the completed project context file for redundancy, obvious rules, and formatting issues.</action>
  <detail>
    Keep the file lean and scannable. Merge overlapping rules, remove filler, and preserve only guidance that materially helps agents implement correctly.
  </detail>

  <action>Update the project context frontmatter to reflect completion.</action>
  <detail>
```yaml
---
project_name: '{{project_name}}'
user_name: '{{user_name}}'
date: '{{date}}'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: {{total_rules}}
optimized_for_llm: true
---
```
  </detail>

  <action>Append the usage guidelines and the final "Last Updated" line to the project context file.</action>
  <detail>
    For AI agents:
    - Use the generated project context as the active source of implementation rules before writing any code
    - Follow all rules exactly as documented
    - When in doubt, prefer the more restrictive option
    - Update the file if new patterns emerge

    For humans:
    - Keep the file lean and focused on agent needs
    - Update when the technology stack changes
    - Review periodically for outdated rules
    - Remove rules that become obvious over time
  </detail>

  <detail>
    Completion summaries by user skill level:

    Expert: "Project context complete. Optimized for LLM consumption with {{rule_count}} critical rules across {{section_count}} sections.\n\nFile saved to: `{output_file}`\n\nReady for AI agent integration."

    Intermediate: "Your project context is complete and optimized for AI agents!\n\n**What we created:**\n\n- {{rule_count}} critical implementation rules\n- Technology stack with exact versions\n- Framework-specific patterns and conventions\n- Testing and quality guidelines\n- Workflow and anti-pattern rules\n\n**Key benefits:**\n\n- AI agents will implement consistently with your standards\n- Reduced context switching and implementation errors\n- Clear guidance for unobvious project requirements\n\n**Next steps:**\n\n- Use the generated project context as the reference for implementation decisions\n- Update as your project evolves\n- Review periodically for optimization"

    Beginner: "Excellent! Your project context guide is ready!\n\n**What this does:**\nThink of this as a 'rules of the road' guide for AI agents working on your project. It ensures they all follow the same patterns and avoid common mistakes.\n\n**What's included:**\n\n- Exact technology versions to use\n- Critical coding rules they might miss\n- Testing and quality standards\n- Workflow patterns to follow\n\n**How AI agents use it:**\nThe generated project context should guide every implementation choice, ensuring everything they create follows your project's standards perfectly.\n\nYour project context is saved and ready to help agents implement consistently!"
  </detail>

  <output>
    Present the completion summary appropriate to `user_skill_level`, confirm the file is saved at `{output_file}`, and note that the context is ready for AI agent use.
  </output>
</step>
