# Validate Story Subagent Update Requirements

## Scope

Update the already-built product-owned `validate-story` workflow module to support the updated source document at `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story.md`.

This document is update-specific. It does not replace `validate-story-requirements.md`; the initial build requirements remain authoritative for unchanged workflow identity, persona, prerequisite declarations, shared/default tool reuse, registry behavior, and legacy cleanup boundaries.

The update must add support for:

- user-facing main-agent invocation through `validate-story`
- parent-assigned child/subagent invocation from `create-story`
- parent-assigned child/subagent invocation from `write-remediation-story`
- parent-assigned child/subagent invocation from `quick-spec`

The workflow validates an implementation story, remediation story, or quick-spec implementation spec before implementation. It reports findings through `attempt_completion`; it must not modify story files, quick-spec files, epics files, architecture files, project files, story indexes, workflow artifacts, or workflow source documents.

## Governing Runtime Requirements

The update must preserve project workflow-runtime requirements for:

- canonical shipped workflow identity and registry resolution through workflow definitions
- main-agent shared entry `WorkflowForm` project selection
- child/subagent workflow activation without rendering entry forms or workflow forms
- child workflow project selection copied from the parent session
- explicit workflow-definition-owned parent-to-child value inheritance
- isolated parent and child workflow sessions
- module-owned prompt templates rendered through the shared runtime prompt-template renderer
- module-owned tool-schema builders that reuse shared/default tool specs
- explicit `attempt_completion_succeeded` routing to workflow completion
- runtime-owned teardown, persistence, and resume behavior

Parent-assigned child workflow activation must continue to resolve `use_skill("validate-story")`, `use_skill('validate-story')`, `skill_name = "validate-story"`, or `skill_name = 'validate-story'` through the product-owned workflow registry before the first child model request. The child agent must not directly execute `use_skill`.

## Source Verbiage Fidelity

The module must preserve the exact user-provided AI-facing prompt verbiage from `validate-story.md`, except for converting workflow-value references into `{workflow.<workflowValueKey>}` runtime prompt-template tokens.

The source document's conditional prompt callouts are authoring instructions only. The runtime prompt must not include text such as `*** conditional prompt`, `*** end conditional prompt segment ***`, `shown when`, or equivalent planning notes.

The module must not invent, paraphrase, summarize, or add UI-visible panel titles, `promptMarkdown`, field labels, action labels, static notice content, helper text, descriptions, button labels, or AI prompt text.

If required UI-visible text, prompt text, or user-visible error text is missing from the source document or from an existing shared runtime/tool contract, the implementation plan must stop and request source-document or requirements clarification before prescribing runtime implementation work.

## Runtime-Owned Values

The validate-story module must extend its `workflowValueKeys` inventory to include:

- `originating_story`
- `code_review_output`

The existing workflow value keys `projectMode`, `projectTitle`, `projectFolderName`, `target_story`, `epics_document`, and `architecture_document` remain required.

No validate-story step may expose `set_workflow_values`. Project selection, prerequisite-file path persistence, and parent-to-child inherited value initialization are runtime-owned deterministic behavior.

## Child/Subagent Runtime Context

The runtime must expose parent workflow identity to child workflow prompt builders and decision-tree predicates without using model-writable workflow values.

The exact runtime-owned session contract for this update is:

- `WorkflowRuntime.activateWorkflow(...)` must accept an optional `parentWorkflowName?: WorkflowDefinition["name"]` argument.
- When `parentSession` is supplied, `parentWorkflowName` must also be supplied by the caller.
- `SubagentRunner` must pass the parent execution context's active canonical workflow name as `parentWorkflowName` when activating an assigned child workflow.
- `WorkflowRuntime.activateWorkflow(...)` must persist the supplied parent workflow name into `ActiveWorkflowSession.lifecycle.parentWorkflowName`.
- Main-agent activation must leave `ActiveWorkflowSession.lifecycle.parentWorkflowName` unset.
- Persisted workflow sessions must preserve `lifecycle.parentWorkflowName` across resume.
- `WorkflowDecisionBranchEvaluationInput` must include the active `session: ActiveWorkflowSession` so `session_predicate` routes can branch on `input.session.lifecycle.parentWorkflowName`.
- `WorkflowPromptBuilderInput.session.lifecycle.parentWorkflowName` must be the prompt-builder source of truth for choosing the validate-story prompt variant.

The parent workflow name is runtime activation metadata. It must not be declared as a validate-story `workflowValueKey`, must not be inherited through `childInheritance`, and must not be model-writable.

## Child Value Inheritance

The validate-story workflow must declare these exact `childInheritance` rules:

```ts
[
	{ parentKey: "target_story", childKey: "target_story" },
	{ parentKey: "epics_document", childKey: "epics_document" },
	{ parentKey: "architecture_document", childKey: "architecture_document" },
	{ parentKey: "originating_story", childKey: "originating_story" },
	{ parentKey: "code_review_output", childKey: "code_review_output" },
	{ parentKey: "output_document", childKey: "target_story" },
]
```

Undefined parent values must be skipped without error during child activation. The rules above are valid as one flat inheritance list because the authorized parent workflows do not currently provide conflicting `target_story` and `output_document` values in the same parent session.

The inherited values initialize only the child workflow session's workflow-value map. They must not alias, replace, synchronize, or mutate the parent session's workflow-value map.

## Prerequisite Behavior

The existing main-agent prerequisite declarations remain unchanged:

- `target_story`
- `epics_document`
- `architecture_document`

For main-agent invocation, Step 1 must still resolve those prerequisites through the runtime-owned `resolve_prerequisite_files` action before model-driven work begins.

Child/subagent invocation must not render prerequisite selection forms. Child invocation must rely on the inherited workflow values supplied by the parent workflow.

## Step 1 Decision Tree

Step 1 must be model-driven after the required runtime preparation for the invocation context.

The Step 1 decision tree must:

- route main-agent invocation to `resolve_prerequisite_files` with exactly `["target_story", "epics_document", "architecture_document"]`
- route from successful main-agent prerequisite resolution to `project_prompt`
- route child invocation from parent workflow `create-story` directly to `project_prompt`
- route child invocation from parent workflow `write-remediation-story` directly to `project_prompt`
- route child invocation from parent workflow `quick-spec` directly to `project_prompt`
- route `attempt_completion_succeeded` to `complete_workflow`

The decision tree must not route to story-index validation, artifact allocation, document generation, child workflow activation, story file mutation, story status update, story file movement, or runtime-owned backend tools after `attempt_completion_succeeded`.

## Step 1 Prompt Variants

Step 1 must assemble conditional prompt content using named prompt-section constants and `buildPromptSource(...)`. Conditional prompt content must use section assembly; source-document conditional callouts must not be included in the AI-facing prompt.

The Step 1 prompt builder must choose the prompt variant from `input.session.lifecycle.parentWorkflowName`:

- if `parentWorkflowName` is unset, use the main-agent implementation-story header
- if `parentWorkflowName` is `create-story`, use the same implementation-story header as the main-agent variant
- if `parentWorkflowName` is `write-remediation-story`, use the remediation-story header
- if `parentWorkflowName` is `quick-spec`, use the quick-spec header

The source placeholders must be converted to these runtime prompt-template tokens:

- `projectTitle` -> `{workflow.projectTitle}`
- `projectFolderName` -> `{workflow.projectFolderName}`
- `architecture_document` -> `{workflow.architecture_document}`
- `workflow.epics_document` -> `{workflow.epics_document}`
- `workflow.target_story` -> `{workflow.target_story}`
- `workflow.originating_story` -> `{workflow.originating_story}`
- `workflow.code_review_output` -> `{workflow.code_review_output}`

### Main-Agent And Create-Story Header

Use this exact AI-facing prompt text for main-agent invocation and for child invocation from `create-story`:

```text
You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.
- Project: {workflow.projectTitle}
- Project Folder: {workflow.projectFolderName}
- Architecture Document: {workflow.architecture_document}
- Epics Documentation: {workflow.epics_document}
- Target Story: {workflow.target_story}
```

### Write-Remediation-Story Header

Use this exact AI-facing prompt text for child invocation from `write-remediation-story`:

```text
You have been called inside a workflow designed to validate a remediation story before implementation. You will assess the remediation story against quality standards, ensure that the prescribed revisions are correct and comprehensive, and ensure that the story satisfies requirements as-written.
- Story for Review: {workflow.target_story}
- Story which had QA findings leading to generation of the story being reviewed: {workflow.originating_story}
- Findings from QA pass on the original story: {workflow.code_review_output}
```

### Quick-Spec Header

Use this exact AI-facing prompt text for child invocation from `quick-spec`:

```text
You have been called inside a workflow designed to validate an implementation spec for a small project. You will assess the provided spec against quality standards, ensure that the prescribed revisions are correct and comprehensive, and ensure that the spec's tasks and subtasks satisfy the project's objective and requirements.
Spec for review: {workflow.target_story}

Read the entire provided spec, then assess the spec's tasks and subtasks following the criteria below.
```

### Common Review Criteria

After the selected header, include this exact AI-facing prompt text for every invocation context:

```text
Review each task and subtask individually, inspecting the indicated target file and determinining whether the prescribed change meets the following standards:
1. Tasks and subtasks must be sequentially numbered.
2. Tasks may summarize a file or capability area. Subtasks must prescribe exact changes.
3. Each task or subtask must include:
- Full target file path.
- Allowed files list.
- One exact prescribed revision unless subordinate subtasks split the work.
- Exact imports to add or remove.
- Exact helper/function/type/object shape.
- Exact required narrowing before union-field access.
- Exact fixture/session/action/event shape.
- Exact assertions for stable machine-consumed contracts.
- Exact raw-placeholder negative assertions for required prompt placeholders.
- Exact cleanup of now-unused imports, helpers, exports, fixtures, assertions, and validation guards.
4. Tasks & Subtasks must not use vague phrases such as:
- “all helpers”
- “matching sibling pattern”
- “equivalent shape”
- “update tests”
- “as needed”
- “fixture like the existing one”
- “all exported constants”
- “each static branch template”
5. Each task & subtask meets the following quality standards:
- It is requirements-backed.
- It is compile-safe.
- It has exact imports and cleanup.
- It has exact fixture/action/session shapes.
- It has exact assertions where stable contracts are involved.
- It does not invent prose.
- It does not preserve unauthorized legacy behavior.
- It does not require the dev agent to infer implementation details.

After assessing the tasks and subtasks thoroughly, consider whether the combined set delivers on the indicated requirements/objective while respecting the defined scope.
```

### Final Instruction Variants

For child/subagent invocation, append this exact AI-facing prompt text:

```text
Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.
```

For main-agent invocation, append this exact AI-facing prompt text:

```text
Once you've reviewed the story document, provide a response to the user using attempt_completion. In your response, list each story section and indicate "no violations" or provide specific violation details. For the task section, provide either a "no violations" or violations details for each task and subtask. If findings were present, instruct the user to run the create-story workflow and provide your findings to the agent in that workflow.
```

The final review response must be delivered through `attempt_completion`.

## Tool Schema Requirements

The existing Step 1 tool schema remains unchanged. Step 1 must expose exactly these existing shared/default tool schemas, in this order:

1. `read_file`
2. `read_file_range`
3. `list_files`
4. `search_files`
5. `list_code_definition_names`
6. `execute_command`
7. `send_user_message`
8. `attempt_completion`

The validate-story tool schema must not include:

- `apply_patch`
- `write_to_file`
- `set_workflow_values`
- `workflow_progress_request`
- `ask_followup_question`
- `use_subagents`
- `create_workflow_artifact`
- `build_workflow_document`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`
- `resolve_prerequisite_files`
- `resolve_existing_project_artifact`
- `validate_story_index_entry`

## Module And Runtime File Scope

Validate-story module changes belong in the existing module files:

```text
src/core/task/workflow-runtime/workflow-modules/validate-story/
  validateStoryWorkflow.ts
  __tests__/validateStoryWorkflow.test.ts
```

Tool-schema changes are not expected unless needed to preserve the existing tool-schema tests:

```text
src/core/task/workflow-runtime/workflow-modules/validate-story/
  validateStoryToolSchemas.ts
  __tests__/validateStoryToolSchemas.test.ts
```

Runtime support for parent workflow identity belongs in the shared workflow runtime and subagent runner files that own activation/session state. Prompt-projection or registry coverage may belong in existing shared test files; the action plan must name the exact shared test file and exact imports required.

## Testing Requirements

The update must include focused unit tests covering:

- workflow value inventory including `originating_story` and `code_review_output`
- exact `childInheritance` rules
- undefined-parent-value skip behavior during child activation
- child activation copies project selection, initializes only declared inherited child values, and does not mutate parent workflow values
- runtime-owned `lifecycle.parentWorkflowName` persistence for child activation and absence for main-agent activation
- decision-tree predicate access to the active session, including `session.lifecycle.parentWorkflowName`
- main-agent invocation still resolving `target_story`, `epics_document`, and `architecture_document` prerequisites before `project_prompt`
- child/subagent invocation from `create-story`, `write-remediation-story`, and `quick-spec` reaching `project_prompt` without rendering entry, prerequisite, or workflow forms
- Step 1 prompt projection selecting the correct header for main-agent, `create-story`, `write-remediation-story`, and `quick-spec` contexts
- Step 1 prompt projection rendering required workflow values and excluding raw prompt-template tokens after runtime values are provided
- prompt projection proving source-document conditional callouts do not leak into AI-facing prompt text
- prompt projection proving non-selected conditional headers are absent from each prompt variant
- Step 1 exported tool-schema builder returning exactly the approved model-visible tool names in order
- Step 1 `attempt_completion_succeeded` routing to workflow completion without story index updates, story file moves, artifact allocation, document generation, subagent dispatch, or parent workflow mutation

Prompt tests must not assert complete prompt strings or duplicate full user-authored prompt bodies as test-owned expected values. Tests must verify prompt behavior through required workflow-value interpolation, context-dependent prompt-section inclusion/exclusion, prerequisite-dependent model handoff, routing/tool exposure contracts, and absence of unauthorized legacy or invented wording.

## Validation Requirements

The update action plan must prescribe validation commands that include:

- focused validate-story workflow module unit tests
- focused validate-story tool-schema tests if any tool-schema file or test is touched
- runtime/subagent tests for parent workflow identity propagation, child workflow activation, inherited values, and child form suppression
- prompt-projection tests covering slash-command and use-skill activation
- `npm run check-types`
- `npm run lint`
- focused `rg` checks proving forbidden legacy validate-story runtime concepts are not present in the update implementation

When running `npm run check-types`, run it with elevated permissions. If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

Persistent diffs after implementation must be limited to files authorized by the action plan phase being executed.
