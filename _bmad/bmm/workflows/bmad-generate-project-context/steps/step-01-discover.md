# Step 1: Context Discovery & Initialization

<step n="1" goal="Discover the project context and initialize the output file">
  <action>Check for an existing `project-context.md` at `{output_file}` and anywhere else under the project tree.</action>
  <detail>
    Treat this as collaborative discovery between technical peers. Do not generate project rules yet, and do not use time estimates.
  </detail>
  <branch if="existing context is found">
    <action>Load the full file and count the sections already completed.</action>
    <ask>Found existing project context with {{number_of_sections}} sections. Update this file or create a new one?</ask>
  </branch>
  <branch if="no existing context is found">
    <action>Copy `{template_path}` to `{output_file}` and initialize the frontmatter for a fresh context file.</action>
    <detail>
      Initialize `project_name`, `user_name`, `date`, `sections_completed: ['technology_stack']`, and `existing_patterns_found`.
    </detail>
  </branch>
  <action>Inspect repository files to identify the technology stack, configuration, conventions, and critical implementation rules that matter to agents.</action>
  <detail>
    Prioritize architecture docs, manifests, build and test configs, naming patterns, code organization, documentation style, and any project-specific constraints that could prevent a likely implementation mistake.
  </detail>
  <action>Summarize the stack, patterns, and key rule areas in a concise discovery report.</action>
  <output>Share the discovery report and ask the user to continue to context generation when ready.</output>
  <detail>
    Stop here and wait for the user's response before any rule generation or file updates beyond initialization.
  </detail>
  <branch if="user chooses continue">
    <handoff path="./step-02-generate.md" />
  </branch>
</step>
