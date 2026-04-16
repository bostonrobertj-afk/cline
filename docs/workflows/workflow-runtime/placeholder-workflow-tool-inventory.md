# Placeholder Workflow Tool Inventory

This document inventories the tools that the current runtime actively exposes to, or auto-runs for, placeholder workflows.

Included sources of truth:
- `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `src/shared/workflow-progress-request.ts`
- `src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
- `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts`
- `src/core/task/workflow-step-resolution/WorkflowStepResolutionTriggerRegistry.ts`

Inclusion rule:
- A tool is listed here only if placeholder-workflow runtime code currently exposes it through the contextual tool matrix, the workflow-form layer, the deterministic step-resolution layer, or the workflow-progress-request gate.

Exclusion rule:
- If a handler exists in runtime code but no live placeholder-workflow seam currently exposes or auto-invokes it, it is intentionally not listed here.

## Universal Tools Preserved Across Placeholder Workflows

Tools:
- `ask_followup_question`
- `send_user_message`
- `attempt_completion`
- `act_mode_respond`
- `generate_plan_output`
- `new_task`
- `browser_action`
- `access_mcp_resource`

Supported workflows:
- All placeholder workflows. These are preserved by the system-prompt runtime independently of any one workflow's tool matrix.

What they do in plain English:
- These are the baseline conversation and runtime-control tools. They let the model ask the user questions, send updates, finish a task, switch response modes, start sub-tasks, open the browser, and access MCP resources regardless of which placeholder workflow is active.

## Bundle-Driven Shared Tools

### DOC_READ

Tools:
- `list_files`
- `search_files`
- `read_file`
- `read_file_range`

Supported workflows:
- `advanced-elicitation.md`
- `blind-review.md`
- `brainstorming.md`
- `check-implementation-readiness.md`
- `cis-design-thinking.md`
- `cis-innovation-strategy.md`
- `cis-problem-solving.md`
- `cis-storytelling.md`
- `code-review.md`
- `correct-course.md`
- `create-architecture.md`
- `create-epics.md`
- `create-prd.md`
- `create-product-brief.md`
- `create-story.md`
- `create-ux-design.md`
- `dev-story.md`
- `distillator.md`
- `document-project.md`
- `domain-research.md`
- `edit-prd.md`
- `editorial-review-prose.md`
- `generate-project-context.md`
- `help.md`
- `index-docs.md`
- `market-research.md`
- `party-mode.md`
- `pi-planning.md`
- `qa-generate-e2e-tests.md`
- `quick-dev-new-preview.md`
- `quick-dev.md`
- `quick-spec.md`
- `retrospective.md`
- `review-adversarial-general.md`
- `review-edge-case-hunter.md`
- `shard-doc.md`
- `sprint-planning.md`
- `sprint-status.md`
- `teach-me-testing.md`
- `technical-research.md`
- `validate-prd.md`
- `write-remediation-story.md`

What they do in plain English:
- These are the standard read-only file inspection tools. They let a placeholder workflow browse the workspace, search for text, and read whole files or specific ranges before deciding what to do next.

### CODE_READ

Tools:
- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`

Supported workflows:
- `blind-review.md`
- `code-review.md`
- `create-story.md`
- `dev-story.md`
- `generate-project-context.md`
- `qa-generate-e2e-tests.md`
- `quick-dev-new-preview.md`
- `quick-dev.md`
- `quick-spec.md`
- `review-adversarial-general.md`
- `review-edge-case-hunter.md`
- `write-remediation-story.md`

What they do in plain English:
- This is the code-focused read bundle. It gives the workflow the normal read tools plus symbol-name discovery so it can inspect source structure and navigate code more deliberately.

### DOC_WRITE

Tools:
- `write_to_file`
- `apply_patch`

Supported workflows:
- `advanced-elicitation.md`
- `blind-review.md`
- `brainstorming.md`
- `check-implementation-readiness.md`
- `cis-storytelling.md`
- `code-review.md`
- `correct-course.md`
- `create-architecture.md`
- `create-epics.md`
- `create-prd.md`
- `create-product-brief.md`
- `create-story.md`
- `create-ux-design.md`
- `dev-story.md`
- `distillator.md`
- `domain-research.md`
- `edit-prd.md`
- `generate-project-context.md`
- `index-docs.md`
- `market-research.md`
- `pi-planning.md`
- `qa-generate-e2e-tests.md`
- `quick-dev-new-preview.md`
- `quick-dev.md`
- `quick-spec.md`
- `retrospective.md`
- `sprint-planning.md`
- `sprint-status.md`
- `teach-me-testing.md`
- `technical-research.md`
- `validate-prd.md`
- `write-remediation-story.md`

What they do in plain English:
- These are the normal file-writing tools. They let a placeholder workflow create or update markdown and other workspace files when the current step calls for producing or revising an artifact.

### LOCAL_EXEC

Tools:
- `execute_command`

Supported workflows:
- `code-review.md`
- `dev-story.md`
- `distillator.md`
- `qa-generate-e2e-tests.md`
- `quick-dev-new-preview.md`
- `quick-dev.md`
- `shard-doc.md`
- `write-remediation-story.md`

What they do in plain English:
- This lets the workflow run shell commands in the local workspace when a step requires command-line inspection, test execution, or other terminal-driven work.

### PLACEHOLDER_WRITE

Tools:
- `set_workflow_placeholders`

Supported workflows:
- `advanced-elicitation.md`
- `blind-review.md`
- `brainstorming.md`
- `check-implementation-readiness.md`
- `cis-design-thinking.md`
- `cis-innovation-strategy.md`
- `cis-storytelling.md`
- `code-review.md`
- `correct-course.md`
- `create-architecture.md`
- `create-prd.md`
- `create-product-brief.md`
- `create-story.md`
- `dev-story.md`
- `domain-research.md`
- `edit-prd.md`
- `market-research.md`
- `quick-dev-new-preview.md`
- `quick-dev.md`
- `quick-spec.md`
- `retrospective.md`
- `sprint-status.md`
- `technical-research.md`
- `write-remediation-story.md`

What they do in plain English:
- This stores workflow state values like selected paths, output files, or other placeholder-backed values so later steps can reuse them. The workflow-start form path also resolves through this tool when Step 1 start requirements are form-driven.

### WORKFLOW_ROUTE

Tools:
- `use_skill`

Supported workflows:
- `create-epics.md`
- `create-product-brief.md`
- `create-ux-design.md`
- `document-project.md`
- `edit-prd.md`
- `retrospective.md`
- `sprint-status.md`
- `validate-prd.md`

What they do in plain English:
- This lets a placeholder workflow hand a bounded piece of work to a skill that already knows how to execute that specialized procedure.

### SUBAGENT_COORD

Tools:
- `use_subagents`

Supported workflows:
- `code-review.md`
- `create-story.md`
- `party-mode.md`
- `quick-dev-new-preview.md`
- `quick-spec.md`

What they do in plain English:
- This lets the workflow delegate parallel or isolated sub-work to subagents when the step explicitly supports that collaboration pattern.

### DIFF_BUILD

Tools:
- `build_review_diff_output`

Supported workflows:
- `code-review.md`

What they do in plain English:
- This builds the canonical review-diff artifact from an explicit Git-backed source so the workflow has a stable diff file to review against.

### WORKFLOW_PROGRESS_REQUEST

Tools:
- `workflow_progress_request`

Supported workflows:
- `create-prd.md`
- `create-story.md`
- `quick-dev.md`
- `quick-spec.md`
- `create-epics.md`
- `pi-planning.md`

What they do in plain English:
- This asks the user for explicit approval before the workflow moves from one gated step to the next.

### EXTERNAL_RESEARCH

Tools:
- `web_search`
- `web_fetch`

Supported workflows:
- `create-architecture.md`
- `domain-research.md`
- `market-research.md`
- `technical-research.md`

What they do in plain English:
- These let the workflow research outside sources on the web when the step is explicitly designed to gather external information.

### INDXR_DISCOVERY

Tools:
- `search_relevant`
- `search_signatures`
- `list_declarations`
- `get_tree`
- `get_imports`
- `get_stats`
- `get_diff_summary`
- `get_token_estimate`

Supported workflows:
- `blind-review.md`
- `code-review.md`
- `create-story.md`
- `dev-story.md`
- `generate-project-context.md`
- `qa-generate-e2e-tests.md`
- `quick-dev-new-preview.md`
- `quick-dev.md`
- `quick-spec.md`
- `review-adversarial-general.md`
- `review-edge-case-hunter.md`
- `write-remediation-story.md`

What they do in plain English:
- These are the discovery-oriented INDXR tools. They help a workflow scan indexed code structure, locate declarations, estimate scope, and get a quick picture of how the codebase is shaped.

### INDXR_SOURCE_READ

Tools:
- `get_file_summary`
- `read_source`
- `get_file_context`
- `batch_file_summaries`

Supported workflows:
- `blind-review.md`
- `code-review.md`
- `create-story.md`
- `dev-story.md`
- `generate-project-context.md`
- `qa-generate-e2e-tests.md`
- `quick-dev-new-preview.md`
- `quick-dev.md`
- `quick-spec.md`
- `review-adversarial-general.md`
- `review-edge-case-hunter.md`
- `write-remediation-story.md`

What they do in plain English:
- These are the INDXR source-reading tools. They summarize files, return source text, and provide enough file context for a workflow to reason about code without always doing raw file reads first.

### INDXR_SYMBOL_GRAPH

Tools:
- `lookup_symbol`
- `explain_symbol`
- `get_callers`
- `get_public_api`
- `get_related_tests`
- `get_dependency_graph`

Supported workflows:
- `code-review.md`
- `create-story.md`
- `dev-story.md`
- `generate-project-context.md`
- `qa-generate-e2e-tests.md`
- `quick-dev-new-preview.md`
- `quick-dev.md`
- `quick-spec.md`
- `write-remediation-story.md`

What they do in plain English:
- These are the INDXR symbol-relationship tools. They help a workflow understand what a symbol is, where it is used, what depends on it, and what tests or APIs are connected to it.

### STORY_TASK_EXECUTION

Tools:
- `story_task_reminder`
- `story_task_complete`
- `story_notes_update`

Supported workflows:
- `dev-story.md`

What they do in plain English:
- These tools support active implementation against a story file. They show the current task, mark a task or subtask complete, and append concise completion notes and touched-file notes back into the story document.

### STORY_TASK_VALIDATION

Tools:
- `story_notes_update`
- `story_testing_complete`

Supported workflows:
- `dev-story.md`

What they do in plain English:
- These tools support the testing and validation phase of story execution. They let the workflow record what happened during validation and mark the story as ready to move into review.

## Workflow-Form And Deterministic Step-Resolution Tools

### `continue_brainstorming_session`

Supported workflows:
- `brainstorming.md` Step 2

What it does in plain English:
- Reuses the newest existing brainstorming session file instead of creating a new one.

Workflow Runtime Implication: This is a workflow-specific tool which performs a task that will be performed by a function like fs.readdir(...,{withFiletypes: true}) in the new architecture. The cleanup phase needs to require that this tool be removed from the system.

### `create_brainstorming_session`

Supported workflows:
- `brainstorming.md` Step 2

What it does in plain English:
- Creates a new canonical brainstorming session file and points the workflow at it. The deterministic step-resolution layer also auto-runs this when Step 2 is reached and no session files exist yet.

Workflow Runtime Implication: This is a workflow-specific tool which performs a task that will be performed by a single sharee function in the new architecture. The cleanup phase must require that this tool be removed from the system. 

### `select_brainstorming_session`

Supported workflows:
- `brainstorming.md` Step 2

What it does in plain English:
- Lets the workflow choose one existing brainstorming session file from the discovered session list and make that the active session artifact.

Workflow Runtime Implication: This is a workflow-specific tool which performs a task that will be performed by a function like fs.readdir(...,{withFiletypes: true}) in the new architecture. The cleanup phase needs to require that this tool be removed from the system.

### `capture_brainstorming_topic`

Supported workflows:
- `brainstorming.md` Step 3

What it does in plain English:
- Writes the user's topic/goals text into the canonical Topic section of the active brainstorming session file.

Workflow Runtime Implication: This is a workflow-specific tool which performs a task that will be performed by a single shared tool in the new architecture. The cleanup phase must require that this tool be removed from the system. 

### `persist_brainstorming_approach`

Supported workflows:
- `brainstorming.md` Step 4

What it does in plain English:
- Stores the selected brainstorming approach both in workflow state and in the session artifact's Selected Approach section.

Workflow Runtime Implication: This is a workflow-specific tool which performs a task that will be performed by a single shared tool in the new architecture. The cleanup phase must require that this tool be removed from the system. 

### `select_random_brainstorming_technique`

Supported workflows:
- `brainstorming.md` Step 4

What it does in plain English:
- Picks a random brainstorming technique from the runtime technique library and returns its name, description, and category.

### `request_brainstorming_technique_suggestion`

Supported workflows:
- `brainstorming.md` Step 4

What it does in plain English:
- Marks the brainstorming artifact and workflow state to indicate that the user asked for a technique suggestion instead of selecting one directly.

### `persist_brainstorming_technique`

Supported workflows:
- `brainstorming.md` Step 4

What it does in plain English:
- Writes the chosen technique into the session artifact's Selected Techniques section and stores the selected technique name in workflow state.

### `build_review_input`

Supported workflows:
- `code-review.md` Step 3
- `write-remediation-story.md` Step 2

What it does in plain English:
- Builds `review-input.md` from the current story file and the existing review diff artifact so later review or remediation steps have a stable review-input document to work from.

### `build_tech_spec_document`

Supported workflows:
- `quick-spec.md` Step 2

What it does in plain English:
- Creates the canonical tech-spec scaffold from the workflow's template and placeholder state so the quick-spec workflow starts from a structured document instead of a blank file.
