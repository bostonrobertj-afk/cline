# Buildout Steps
[ ] Step Progression Configuration
[ ] Workflow Start Form
[ ] Step 2 Automation
[ ] Step 3 Automation
[ ] Contextual Tool Matrix
[ ] Persona Activation

# Deterministic Workflow Progression / Step Progression Configuration
[x] requirements doc
[x] action plan
[x] implementation
[x] QA
- Step 1: `epics_document`, `architecture_document` are set as session variables
- Step 2: `target_epic` is set as a session variable
- Step 3: `epic_delivery_spec` is set as a session variable, and it's value resolves to a valid file created during this task
- Step 4: workflow_progress_request receives a "yes" user response
- Step 5: workflow_progress_request receives a "yes" user response

# Workflow Start Form- enablement not needed
[ ] requirements doc
[ ] action plan
[ ] implementation
[ ] QA
Gathers required inputs `epics_document`, `architecture_document` and optionally `epic_delivery_spec` and persists them as session variables

# Step 2 Automation
[x] requirements doc
[x] action plan
[x] implementation
[x] QA
- Reference file: /Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md
- extracts the full list of epics from `epics_document`
- Presents a menu with each epic's name on a clickable button, using existing UI component that ask_followup_question uses
- Form is labelled "Which epic would you like to work on?"
- When user clicks one of the epics' buttons, that epic name is set as the `target_epic` variable for the session.

# Step 3 Automation
[x] requirements doc
[x] action plan
[x] implementation
[x] QA
- Reference document: /Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md
- Persists an epic delivery document in `{output_folder}/implementation-artifacts` using naming convention `epic#-delivery-spec.md` using `{project_root}/cline/.cline/skills/create-epics/epic-delivery-spec-template.md` as the template.
Extracts the following from `{epics_document}` for `{target_epic}`:
  - Objective
  - Description
  - Success Measures
  - Scope
  - Scope Boundary
includes the extracted content in the new epic delivery spec.

Then, sets the full file path of the delivery spec as `epic_delivery_spec` variable for this session.

# Contextual Tool Matrix
[x] requirements doc
[x] action plan
[x] implementation
[x] QA
- Defines allowed native tools for each step of this workflow
- Must include workflow_progress_request for steps 4 and 5.
- step exposure in contextualToolMatrix.ts (line 179)
- shared workflow/step support in workflow-progress-request.ts (line 1)
- prompt teaching in task_progress.ts (line 62)
- continuation guidance in continuation_turn.ts (line 13)
# Persona Activation
[ ] requirements doc
[ ] action plan
[ ] implementation
[ ] QA
- Add entry for pi-planning.md workflow to /Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts indicating that the appropriate agent for this workflow is scrum-master
- Update /Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md to reflect the new entry in /Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts