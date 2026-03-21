# Step 2: Context Rules Generation

<step n="2" goal="Generate project rules category by category and get approval before saving">
  <action>Use the discovery results from step 1 to draft the project context one category at a time.</action>
  <detail>
    Keep every rule specific, actionable, and lean. Prefer unobvious implementation guidance over general advice. After each category, show the draft to the user and present the same menu:
    - `A` Advanced Elicitation
    - `P` Party Mode
    - `C` Continue
    Save only when the user chooses `C`, and update `sections_completed` as you go.
  </detail>
  <detail>
    When `A` is selected, invoke the `bmad-advanced-elicitation` skill for the current category. When `P` is selected, invoke the `bmad-party-mode` skill for the current category. After either enhancement completes, ask whether to accept the change, then return to the same `A/P/C` menu for that category.
  </detail>

  <action>Document the technology stack and exact versions.</action>
  <detail>
    Expert: "Technology stack from your architecture and package files: {{exact_technologies_with_versions}}. Any critical version constraints I should document for agents?"
    Intermediate: "I found your technology stack:\n\n**Core Technologies:**\n{{main_technologies_with_versions}}\n\n**Key Dependencies:**\n{{important_dependencies_with_versions}}\n\nAre there any version constraints or compatibility notes agents should know about?"
    Beginner: "Here are the technologies you're using:\n\n**Main Technologies:**\n{{friendly_description_of_tech_stack}}\n\n**Important Notes:**\n{{key_things_agents_need_to_know_about_versions}}\n\nShould I document any special version rules or compatibility requirements?"
  </detail>

  <action>Document language-specific rules.</action>
  <detail>
    Capture the project's primary language patterns, configuration requirements, import and export conventions, async or error-handling rules, and any strict compiler or runtime settings that agents might miss.
  </detail>

  <action>Document framework-specific rules.</action>
  <detail>
    Capture framework lifecycle rules, component or module organization, state or data flow conventions, performance-sensitive patterns, and any integration rules that keep implementations consistent.
  </detail>

  <action>Document testing rules.</action>
  <detail>
    Capture test organization, mock conventions, unit versus integration boundaries, coverage expectations, and any special rules for browser, server, or end-to-end testing.
  </detail>

  <action>Document code quality and style rules.</action>
  <detail>
    Capture linting and formatting constraints, naming conventions, folder structure, documentation expectations, and any file-level patterns that agents should preserve.
  </detail>

  <action>Document development workflow rules.</action>
  <detail>
    Capture branch, commit, review, deployment, and handoff conventions that affect implementation work or collaboration.
  </detail>

  <action>Document critical don't-miss rules.</action>
  <detail>
    Capture anti-patterns, edge cases, security constraints, performance traps, and any project-specific gotchas that would likely cause regressions.
  </detail>

  <action>Prepare the lean markdown block that will be appended to `{output_file}` for the approved category content.</action>
  <detail>
```md
## Technology Stack & Versions

{{concise_technology_list_with_exact_versions}}

## Critical Implementation Rules

### Language-Specific Rules

{{bullet_points_of_critical_language_rules}}

### Framework-Specific Rules

{{bullet_points_of_framework_patterns}}

### Testing Rules

{{bullet_points_of_testing_requirements}}

### Code Quality & Style Rules

{{bullet_points_of_style_and_quality_rules}}

### Development Workflow Rules

{{bullet_points_of_workflow_patterns}}

### Critical Don't-Miss Rules

{{bullet_points_of_anti_patterns_and_edge_cases}}
```
  </detail>

  <output>Show the drafted category content and wait for the user's choice before saving or moving on.</output>
  <detail>
    If the user approves `C` for a category, append the approved content to `{output_file}` and continue to the next category. If all categories are complete, route to step 3.
  </detail>
  <branch if="all categories are complete and the final category has been approved">
    <handoff path="./step-03-complete.md" />
  </branch>
</step>
