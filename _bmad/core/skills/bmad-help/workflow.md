---
help_catalog: '{project-root}/_bmad/_config/bmad-help.csv'
---

# BMAD Help

**Goal:** Answer BMAD Method questions and recommend the next workflow or agent using the active project context.

## Operating Rules

- Treat the help catalog as the source of truth for available workflows, agents, phases, required flags, and output locations.
- Use the current conversation, recent workflow state, and discovered artifacts to infer what was just completed.
- Keep the response grounded in the active module and project knowledge when that information exists.
- Do not invent workflows, agents, phases, or outputs that are not present in the catalog.
- If the active module or the completed workflow is unclear, ask one focused clarifying question.
- Present the final answer in `{communication_language}` when available; otherwise match the user's language.

## Execution

<step n="1" goal="Load the help catalog and project context">
  <action>Load `{help_catalog}`.</action>
  <action>Scan each module folder under `{project-root}/_bmad/` except `_config` for `config.yaml`.</action>
  <action>Resolve each workflow row's `output-location` against the matching module config so artifact paths can be searched.</action>
  <action>Extract `communication_language` and `project_knowledge` from each scanned module config.</action>
  <detail>
    - If `project_knowledge` resolves to an existing path, use the available docs for grounding.
    - Never fabricate project-specific facts when documentation is missing.
  </detail>
</step>

<step n="2" goal="Detect the active module and infer what the user just completed">
  <action>Determine the active module from the conversation, nearby workflow context, and user wording.</action>
  <action>Infer the most recent completed workflow or task from explicit statements, artifacts, or matching output paths.</action>
  <ask if="the module or completed workflow cannot be inferred" optional="true">
    What workflow did you most recently complete?
  </ask>
  <detail>
    - Prefer the most specific matching workflow code or name.
    - If multiple modules are plausible, ask before recommending a next step.
  </detail>
</step>

<step n="3" goal="Choose the next recommendations">
  <action>Filter catalog rows to the active module unless the user asked for a cross-module answer.</action>
  <action>Use phase ordering, required flags, and discovered artifacts to determine the next useful workflow.</action>
  <action>List optional items before required items when both are relevant.</action>
  <action>For validation workflows, prefer recommending a different high-quality LLM if one is available.</action>
  <detail>
    - Surface the workflow name.
    - Surface either the command or the agent load instruction.
    - Surface the agent title and display name from the catalog.
    - Include a short description of why the workflow is the right next move.
  </detail>
</step>

<step n="4" goal="Answer direct BMAD questions">
  <branch if="the user asked a BMAD method or workflow question">
    <action>Answer using the catalog, active module context, and any grounded project knowledge.</action>
    <action>Explain which workflow or agent fits the request best and why.</action>
    <detail>
      - Keep the answer concise and practical.
      - If the question is about a workflow choice, include the next recommended step.
      - If the question is ambiguous, ask one focused follow-up instead of guessing.
    </detail>
  </branch>
  <branch if="the user asked what to do next">
    <output>Present the next recommended workflow or agent first, then any optional alternatives that may help.</output>
  </branch>
</step>

<step n="5" goal="Present the result and stop">
  <action>Return the recommendations or answer in a clear, compact format.</action>
  <action>Stop after presenting the response so the calling process can route the next workflow.</action>
  <detail>
    - Run each workflow in a fresh context window.
    - Preserve the module-specific order and do not skip required prerequisites.
    - When artifact evidence exists, mention it as the reason for the recommendation.
  </detail>
</step>
