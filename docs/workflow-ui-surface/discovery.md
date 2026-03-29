# High-Level Idea
Add a popup form capability that can be triggered by slash commands or specific placeholder workflow step progression which prompts the user to provide inputs and make selections, then runs deterministic workflow steps with the AI out-of-the-loop before passing back to the AI

# Reason Behind This Idea
- AI Agents are using tokens on workflow steps that could be performed deterministically
- Even if a tool is built to do the deterministic work, the AI agent is currently taking the inputs from the human, then invoking the tool
- When AI Agents receive the inputs from the human user, they invariably read them, consuming tokens, when the only action required was to pass the input into the tool
- There's no way to pass something from a human user into a tool without inserting the input into the AI Agent's context window right now.

# Example Use Case

- User invokes the code review worfklow using "/code-review.md"
- AI Agent completes step 2 of the workflow. The workflow progresses to step three through deterministic workflow progression via this trigger: 
    - Done Signal: A new `review_input.md` file has been created in `{output_folder}` during the current task run.
- For Context: Step 3 of the code review workflow currently says:
    Goal: Construct a diff output with detailed code changes from the most recent dev cycle

    Supported tool-backed sources:
    - an explicit commit from the user or story
    - an explicit commit range from the user or story
    - an explicit branch diff or remote branch reference from the user or story
    - `git diff HEAD -- <scoped-paths>` for tracked scoped files with unstaged and/or staged changes

    When one of these sources is available, ALWAYS use the `build_review_diff_output` tool to build and replace `{diff_output}`.

    Use raw `git show` / `git diff` construction only as fallback when:
    - the `build_review_diff_output` tool is unavailable
    - the tool errors
    - or the requested diff source is outside the tool's supported contract

    If no supported or fallback diff source is available, still create `review-input.diff` with explicit fallback notes stating that no diff source was available for this workflow run.

    Done Signal: A new `review-input.diff` file has been created in `{output_folder}` during the current task run.
- A form appears in the chat UI above the text input box. It says:
    - "This workflow requires the following tool-produced artifact: `{artifact_name}` (e.g. review-input.diff)
    - Can you provide the inputs required to produce `{artifact_name}`? (inputs is a hyperlink to a read-only document which explains what each tool does, what it produces, and what it's inputs are in a human-understandable way. The link jumps to the line where this tool's description starts)
    - User sees yes/no buttons beneath the form question
    - User clicks "yes"
    - Form UI updates to show one or more dropdowns based on tool schema's inputs which are clearly labelled, and allow the user to select from supported types per input, e.g.:
        - "source": {commit, commit range, branch diff, gt diff HEAD, commit hash}
    - Optional fields' dropdowns have a "none" option and default to that option
    - Required fields' dropdowns do not have a "none" option and default to "select"
    - A "next" button is present at the bottom of the form, but is not clickable until all dropdowns have been resolved by the user ("select" on a required field counts as unresolved)
    - Form UI updates to show input fields for the inputs the user indicated they have
    - Required fields must be filled
    - Optional fields are still optional at this step
    - A "submit" button is present at the bottom of the form but is not clickable until all required fields have inputs
    - User completes form and clicks "submit"
    - Back end transforms user's inputs into the tool's required input format
    - Tool processes
    - If error occurs, UI notifies user with a detailed error and asks if they'd like to retry (if they retry, it just reruns the UI steps from the start)
    - If it succeeds, a system-generated message shows up in the chat UI indicating success
    - The workflow progresses to the next step using deterministic workflow progression
    - The system passes back to the AI Agent in the same manner that it does today for deterministic workflow progression, including system-generated prompting indicating:
        - What step was completed
        - What output was produced (file path only, must not insert the full contents of the output into the prompt)
        - This should be shown near the existing focus chain task list prompting, above the current workflow step detail prompting
        - Phrasing should be something like "step 3 of this workflow was successfully completed through an automated trigger. You are now on step 4."
    
    # Initial Needs
    - A read-only system dictionary document:
        - Serves as a central reference where technical terms like "commit" are paired with human-friendly descriptions like "A single Git commit to review" or "git ref" with "a commit hash or tag".
        - Likely needs to contain these for each defined technical term:
            - short label
            - medium explanation
            - long explanation
            - examples
            - context tags

    - A human-friendly tool dictionary that is derived from tool schema:
        - Explains what the tool does
        - Explains what the tool produces
        - Explains what the tool's inputs are and which are required vs optional
        - Automatically replaces technical syntax from tool schema with human-friendly syntax from the read-only system dictionary document

    - A Task-integrated, schema-driven, multi-field workflow form mechanism
        - Will be a new workflow-form system layer
        - Will reuse the current chat insertion/rendering pattern for inline presentation
        - Will reuse the current buttons/selects/dialogs for visible controls
        - Must not mix with unrelated task/system mechanisms unless they are explicitly part of the new workflow-form contract
        - These things already exist in the system and can be reused here instead of hand-coding from scratch:
            - the existing system path for rendering a system-generated interactive frame inline in chat, as seen in the ask_followup_question flow
            - inline answer-button rendering via OptionsButtons.tsx
            - modal/dialog primitives via dialog.tsx and AlertDialog.tsx
            - existing button primitives via button.tsx
            - existing select/dropdown primitives such as select.tsx and the existing VSCodeDropdown usage patterns

    - Deterministic tools for each workflow step that is to be automated
        - Phase 1: build_review_diff_output only, since it's already built
        - Phase 2: Introduce a small set of new tools:
            - build_review_input: used in "/code-review.md"
            - workflow_input_resolver: net-new- would prompt the user for a workflow's inputs at invocation (runs between slash command invocation and api all, adds inputs to api call alongside use input)
        - Phase 3 TBD

    - A workflow form-to-tool execution bridge
        - takes validated form data
        - translates into the canonical tool shape (tool schema is the reference)
        - executes the tool- tools are executed through ToolExecutor.ts
        
    # Expectations

        - This mechanism must be triggerable by:
            - slash command invocation for a specified command
            - deterministic workflow progression (existing capability)- must be configurable such that it may be triggered by only one specific step completion in a specific workflow, or by many step completions in many workflows.
        - Each use case that this functionality supports requires an assessment of the associated workflow(s) to ensure that:
            - They are supported by deterministic workflow resolution
            - They are invocable by slash command
            - Their source documents are structured such that the use case is a single step, with a deterministic progression trigger that invokes the deterministic form-driven step procedure, and ends with a deterministic progression event that is automatically triggered by the invoked tool's output.