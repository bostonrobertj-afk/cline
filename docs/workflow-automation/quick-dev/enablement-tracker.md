# Buildout Steps
[ ] Step Progression Configuration
[ ] Add workflow keys to systemDictionary
[ ] Workflow Start Form
[ ] Contextual Tool Matrix
[ ] Persona Activation

# Deterministic Workflow Progression / Step Progression Configuration
[ ] requirements doc
[ ] action plan
[ ] implementation
[ ] QA
- Step 1: Required variables are set as workflow variables and resolve to valid filepaths where appropriate.

# Workflow Start Form- enablement not needed
No enablement needed.

# Contextual Tool Matrix
[ ] requirements doc
[ ] action plan
[ ] implementation
[ ] QA
- Defines allowed native tools for each step of this workflow
- step exposure in contextualToolMatrix.ts (line 179)
- shared workflow/step support in workflow-progress-request.ts (line 1)
- prompt teaching in task_progress.ts (line 62)
- continuation guidance in continuation_turn.ts (line 13)
# Persona Activation
[ ] requirements doc
[ ] action plan
[ ] implementation
[ ] QA
- Add entry for the workflow to /Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts indicating that the appropriate agent for this workflow is quick-flow-solo-dev
<!-- user note: be sure to update the agent name above when using this template for workflow enablement -->
- Update /Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md to reflect the new entry in /Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts