# Step 1: Context Discovery & Initialization

## META

- High-Level Goal: Create a concise `project-context.md` file containing the critical implementation rules AI agents need.
- Goal for this Phase: Discover the project stack, identify implementation patterns, and initialize the project context file.
- Stay collaborative and do not proceed until the user confirms the next step.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Check for existing context and discover project details">
  <branch if="an existing project-context file is found" optional="true">
    <output>Found existing project context with {{number_of_sections}} sections. Would you like to update this or create a new one?</output>
    <ask>Choose update or create-new.</ask>
    <detail>
      Look for `{project_knowledge}/project-context.md` or `{project-root}/**/project-context.md` and read the complete file before asking.
    </detail>
  </branch>

  <action>Inspect `{planning_artifacts}/architecture.md`, package files, config files, and nearby source files to identify technologies, conventions, and critical implementation rules.</action>
  <detail>
    Focus on versions, naming conventions, code organization, testing patterns, and project-specific gotchas that AI agents could miss.
  </detail>

  <branch if="no existing context file is present" optional="true">
    <action>Copy `../project-context-template.md` to `{output_folder}/project-context.md` and initialize its frontmatter.</action>
  </branch>

  <branch if="an existing context file is present" optional="true">
    <action>Load the existing context and prepare the frontmatter for updates.</action>
  </branch>

  <output>Welcome {{user_name}}! I’ve analyzed {{project_name}} to discover the implementation context AI agents need.</output>
  <output>Present the discovered stack, patterns, and critical rule areas, then explain that the context file is ready to be created or updated.</output>
  <ask>Continue to context generation?</ask>
  <detail>
    Halt here until the user explicitly chooses `[C]` to continue.
  </detail>
</step>
