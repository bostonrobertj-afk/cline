# Buildout Steps
[ ] Step Progression Configuration
[ ] Add workflow keys to systemDictionary
[ ] Workflow Start Form
[ ] Contextual Tool Matrix
[ ] Persona Activation
[ ] update workflow-form-inventory with any new form use cases
[ ] update system-prompt/tools/readme.md with any new tools

# Step 2 Automation
[x] requirements doc
[x] action plan
[x] implementation
[x] QA
Persists the output file for the workflow using the workflow's template.

# Step 3 Automation
[x] requirements doc
[x]] action plan
[x] implementation
[x] QA
Asks the user what they want the brainstorming session to focus on, then adds their response to the output file.
Must use this:
    Title: "What topics and/or goals would you like to focus on for this brainstorming session?"
    Text: "Be as detailed as you can- we'll worry about formatting later!"
Ideally this does not present a workflow form with a text box- would prefer that user be able to reply through the normal chat UI response textarea, and that their response be added tot he appropriate section in the session's output file without triggering system prompt generation and GPT invocation.

# Step 4 Automation
Presents the user with three options for how they want to approach selecting the brainstorming technique, then runs special handling based on the user's response.
Need to break this up into three separate patches:

## 4.1: "I want to choose" Path:
- “I want to choose”: two-panel workflow form, category-to-technique derivation from brain-methods.csv (line 1), and Back behavior

## 4.2: "I Want a Random Technique" Path:
- “I want a random technique”: random selection plus confirm/retry loop

## 4.3: "I want You to Suggest a Technique" Path:
- “I want you to suggest a technique”: sentinel write now, actual selection deferred to Step 5

# Deterministic Workflow Progression / Step Progression Configuration
[ ] requirements doc
[ ] action plan
[ ] implementation
[ ] QA
- Step 1: Required variables are set as workflow variables and resolve to valid filepaths where appropriate.
- Step 2: output file path is set as `{output_file}` workflow variable, and the file has been correctly populated from the workflow's template.
- Step 3: User's input has been added to the output file in the "Topic" section.
- Step 4: The "Selected Approach" and "Selected Techniques" sections of the output file has been updated with the user's selection.
- Step 5: workflow_progress_request receives a "yes" response.
- Step 6: attempt_completion is successfully used.


# Workflow Start Form- enablement not needed
[ ] requirements doc
[ ] action plan
[ ] implementation
[ ] QA
Gathers inputs using existing workflow start mechanism tied to the workflow source document.

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
- Add entry for the workflow to /Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts indicating that the appropriate agent for this workflow is analyst
<!-- user note: be sure to update the agent name above when using this template for workflow enablement -->
- Update /Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md to reflect the new entry in /Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts