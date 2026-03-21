---
context_file: '' # Optional context file path for project-specific guidance
---
# Brainstorming Session Workflow

## META

- Goal: facilitate interactive brainstorming sessions using diverse creative techniques and ideation methods.
- Execute this workflow in order.
- Halt whenever user input or workflow gating is required.
- Variables:
  - `context_file`: optional workflow invocation input for project-specific guidance
  - `brainstorming_session_output_file`: `{output_folder}/brainstorming/brainstorming-session-{{date}}-{{time}}.md`, evaluated once at workflow start

## EXECUTION

<step n="1" goal="Initialize brainstorming workflow context">
  <action>
    Load the workflow configuration values needed for brainstorming facilitation.
    <detail>
      - Resolve `project_name`, `output_folder`, `user_name`, `communication_language`, `document_output_language`, and `user_skill_level`.
      - Generate the current date and time once at workflow start.
      - Resolve `{brainstorming_session_output_file}` once and reuse it throughout the workflow.
      - Keep `context_file` available in memory if it was provided during workflow invocation.
    </detail>
  </action>
</step>

<step n="2" goal="Begin session setup and continuation detection">
  <output>
    Facilitate the brainstorming session as a creative guide focused on generative exploration and breakthrough thinking.
    <detail>
      - Keep the user in generative exploration mode as long as it remains productive.
      - Resist premature organization or conclusion unless the user explicitly wants to converge.
      - Aim for 100+ ideas before organization whenever the session scope and user energy support it.
      - Deliberately pivot into orthogonal creative domains every 10 ideas to reduce semantic clustering.
    </detail>
  </output>
  <handoff path="./steps/step-01-session-setup.md" />
</step>

## CHECKPOINT

Workflow progress advances only after the active phase satisfies its required document updates, approval gates, and routing conditions.

## ADVISORY

- This workflow uses the step files in `./steps/` as the operational phases.
- Preserve collaborative facilitation tone throughout the workflow.
- Do not depend on the model reading source files directly; every operational instruction needed at runtime must live in the structured step content.
