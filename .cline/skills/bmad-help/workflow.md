# workflow

## META

- Goal: workflow
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Load catalog — Load {project-root}/_bmad/_config/bmad-help">
  <action>Load catalog — Load {project-root}/_bmad/_config/bmad-help.csv</action>
</step>

<step n="2" goal="Resolve output locations and config — Scan each folder under {project-root}/_bmad/ (except _config) for config">
  <action>Resolve output locations and config — Scan each folder under {project-root}/_bmad/ (except _config) for config.yaml. For each workflow row, resolve its output-location variables against that module's config so artifact paths can be searched. Also extract communication_language and project_knowledge from each scanned module's config.</action>
  <action>For each workflow row, resolve its output-location variables against that module's config so artifact paths can be searched.</action>
  <action>Also extract communication_language and project_knowledge from each scanned module's config.</action>
</step>

<step n="3" goal="Ground in project knowledge — If project_knowledge resolves to an existing path, read available documentation files (architecture docs, project overview, tech stack references) for grounding context">
  <action>Ground in project knowledge — If project_knowledge resolves to an existing path, read available documentation files (architecture docs, project overview, tech stack references) for grounding context. Use discovered project facts when composing any project-specific output. Never fabricate project-specific details — if documentation is unavailable, state so.</action>
  <action>Use discovered project facts when composing any project-specific output.</action>
  <action>Never fabricate project-specific details — if documentation is unavailable, state so.</action>
</step>

<step n="4" goal="Detect active module — Use MODULE DETECTION above">
  <action>Detect active module — Use MODULE DETECTION above</action>
</step>

<step n="5" goal="Analyze input — Task may provide a workflow name/code, conversational phrase, or nothing">
  <action>Infer what was just completed using INPUT ANALYSIS above.</action>
  <ask>Analyze input — Task may provide a workflow name/code, conversational phrase, or nothing. Infer what was just completed using INPUT ANALYSIS above.</ask>
</step>

<step n="6" goal="Present recommendations — Show next steps based on:">
  <action>Present recommendations — Show next steps based on:</action>
  <action>Completed workflows detected</action>
  <action>Phase/sequence ordering (ROUTING RULES)</action>
  <action>Artifact presence</action>
  <action>Workflow name</action>
  <output>Command OR Code + Agent load instruction (per DISPLAY RULES)</output>
</step>

<step n="7" goal="Additional guidance to convey:">
  <action>Additional guidance to convey:</action>
  <action>Run each workflow in a fresh context window</action>
  <action>For validation workflows: recommend using a different high-quality LLM if available</action>
  <output>Present all output in {communication_language}</output>
  <output>For conversational requests: match the user's tone while presenting clearly</output>
</step>

<step n="8" goal="Return to the calling process after presenting recommendations">
  <action>Return to the calling process after presenting recommendations.</action>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Use the prose block below for the full agent-facing guidance that complements the structured execution steps.

## REFERENCE

<prose>
## ROUTING RULES

- **Empty `phase` = anytime** — Universal tools work regardless of workflow state
- **Numbered phases indicate sequence** — Phases like `1-discover` → `2-define` → `3-build` → `4-ship` flow in order (naming varies by module)
- **Phase with no Required Steps** - If an entire phase has no required, true items, the entire phase is optional. If it is sequentially before another phase, it can be recommended, but always be clear with the use what the true next required item is.
- **Stay in module** — Guide through the active module's workflow based on phase+sequence ordering
- **Descriptions contain routing** — Read for alternate paths (e.g., "back to previous if fixes needed")
- **`required=true` blocks progress** — Required workflows must complete before proceeding to later phases
- **Artifacts reveal completion** — Search resolved output paths for `outputs` patterns, fuzzy-match found files to workflow rows

## DISPLAY RULES

### Command-Based Workflows
When `command` field has a value:
- Show the command as a skill name in backticks (e.g., `bmad-bmm-create-prd`)

### Skill-Referenced Workflows
When `workflow-file` starts with `skill:`:
- The value is a skill reference (e.g., `skill:bmad-quick-dev-new-preview`), NOT a file path
- Do NOT attempt to resolve or load it as a file path
- Display using the `command` column value as a skill name in backticks (same as command-based workflows)

### Agent-Based Workflows
When `command` field is empty:
- User loads agent first by invoking the agent skill (e.g., `bmad-pm`)
- Then invokes by referencing the `code` field or describing the `name` field
- Do NOT show a slash command — show the code value and agent load instruction instead

Example presentation for empty command:
```
Explain Concept (EC)
Load: tech-writer agent skill, then ask to "EC about [topic]"
Agent: Tech Writer
Description: Create clear technical explanations with examples...
```

## MODULE DETECTION

- **Empty `module` column** → universal tools (work across all modules)
- **Named `module`** → module-specific workflows

Detect the active module from conversation context, recent workflows, or user query keywords. If ambiguous, ask the user.

## INPUT ANALYSIS

Determine what was just completed:
- Explicit completion stated by user
- Workflow completed in current conversation
- Artifacts found matching `outputs` patterns
- If `index.md` exists, read it for additional context
- If still unclear, ask: "What workflow did you most recently complete?"

## EXECUTION

1. **Load catalog** — Load `{project-root}/_bmad/_config/bmad-help.csv`

2. **Resolve output locations and config** — Scan each folder under `{project-root}/_bmad/` (except `_config`) for `config.yaml`. For each workflow row, resolve its `output-location` variables against that module's config so artifact paths can be searched. Also extract `communication_language` and `project_knowledge` from each scanned module's config.

3. **Ground in project knowledge** — If `project_knowledge` resolves to an existing path, read available documentation files (architecture docs, project overview, tech stack references) for grounding context. Use discovered project facts when composing any project-specific output. Never fabricate project-specific details — if documentation is unavailable, state so.

4. **Detect active module** — Use MODULE DETECTION above

5. **Analyze input** — Task may provide a workflow name/code, conversational phrase, or nothing. Infer what was just completed using INPUT ANALYSIS above.

6. **Present recommendations** — Show next steps based on:
   - Completed workflows detected
   - Phase/sequence ordering (ROUTING RULES)
   - Artifact presence

   **Optional items first** — List optional workflows until a required step is reached
   **Required items next** — List the next required workflow

   For each item, apply DISPLAY RULES above and include:
   - Workflow **name**
   - **Command** OR **Code + Agent load instruction** (per DISPLAY RULES)
   - **Agent** title and display name from the CSV (e.g., "🎨 Alex (Designer)")
   - Brief **description**

7. **Additional guidance to convey**:
   - Present all output in `{communication_language}`
   - Run each workflow in a **fresh context window**
   - For **validation workflows**: recommend using a different high-quality LLM if available
   - For conversational requests: match the user's tone while presenting clearly

8. Return to the calling process after presenting recommendations.
</prose>
