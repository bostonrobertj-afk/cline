# Buildout Steps
[x] Step Progression Configuration
[x] Workflow Start Form
[ ] Step 2 Automation
[x] Contextual Tool Matrix
[ ] Persona Activation

# Deterministic Workflow Progression / Step Progression Configuration
[x] requirements doc
[x] action plan
[x] implementation
[x] QA
- Step 1: Required variables are set as workflow variables and resolve to valid filepaths where appropriate.
- Step 2: Story document is created in correct location and has all required template content + all required content from the epic delivery spec
- Step 3: workflow-progress-request receives a "yes" response from the user
- Step 4: workflow-progress-request receives a "yes" response from the user
- Step 5: status is set to ready-for-dev in the story document

# Step 2 Automation
[x] requirements doc
[x] action plan
[x] implementation
[x] QA
Reference file: /Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md
Create a new tool which performs the following:
    Persist a story document scaffold in `{output_folder}/implementation-artifacts` using naming convention `story#.#`
    - Using `{project_root}/cline/.cline/skills/bmad-create-story/template.md` as the template, persist a story document scaffold in `{output_folder}/implementation-artifacts` using naming convention `story#.#`. 
    - The numbering convention is "story(epic#).(story#).md"
    - The story document must directly reproduce all of the content present in the story template.
    - Copy the existing story details for the story from `{epic_delivery_spec} including:
        - Story number
        - objective
        - acceptance criteria
        - sequencing / dependencies
    This content must be mapped into the appropriate sections within the story document.

    Persist the full file path of the new story document as the `{story_doc}` workflow variable.

Follow existing configuration patterns for automated workflow steps (e.g. in pi-planning workflow there are existing automated steps- the methods used to implement should be used here as well)

# Workflow Start Form- enablement not needed
[x] ensure all variables are present and correctly defined in systemDictionary
[x] Validate base workflow start form config is sufficient for the workflow
Dictionary Entry Updates:
story_template: A fixed template which indicates required sections and structure for a story document
story_number: Used to identify a story

# Contextual Tool Matrix
[x] requirements doc
[x] action plan
[x] implementation
[x] QA
- Defines allowed native tools for each step of this workflow
- step exposure in contextualToolMatrix.ts (line 179)
- shared workflow/step support in workflow-progress-request.ts (line 1)
- prompt teaching in task_progress.ts (line 62)
- continuation guidance in continuation_turn.ts (line 13)
# Persona Activation
No enablement needed- already in place.
- Add entry for the workflow to /Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts indicating that the appropriate agent for this workflow is scrum-master
<!-- user note: be sure to update the agent name above when using this template for workflow enablement -->
- Update /Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md to reflect the new entry in /Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts