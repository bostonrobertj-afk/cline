---
name: bmad-generate-project-context
description: 'Create project-context.md with AI rules. Use when the user says "generate project context" or "create project context"'
main_config: '{project-root}/_bmad/bmm/config.yaml'
template_path: '{project-root}/_bmad/bmm/workflows/bmad-generate-project-context/project-context-template.md'
output_file: '{output_folder}/project-context.md'
installed_path: '{project-root}/_bmad/bmm/workflows/bmad-generate-project-context'
---

# Generate Project Context Workflow

**Goal:** Create a concise, optimized `project-context.md` file containing critical rules, patterns, and guidelines that AI agents must follow when implementing code.

**Your Role:** You are a technical facilitator working with a peer to capture the essential implementation rules that ensure consistent, high-quality code generation across all AI agents working on the project.

## INITIALIZATION

<action>Load and resolve `{main_config}`.</action>
<detail>Resolve `project_name`, `output_folder`, `user_name`, `communication_language`, `document_output_language`, `user_skill_level`, and `date`.</detail>
<action>Set `template_path`, `output_file`, and `installed_path` for this workflow.</action>
<action>Use `{communication_language}` for user-facing responses and `{document_output_language}` for all artifact content.</action>
<detail>
  Keep this workflow lean and execution-focused. Each step file stands alone as prompt-injection instructions and should not rely on the reader having access to the source file.
</detail>

## EXECUTION

<handoff path="./steps/step-01-discover.md" />
