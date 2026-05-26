# Quick Spec Workflow Module Requirements

## Scope

Build the product-owned `quick-spec` workflow module using `/Users/robertboston/Documents/Cline/Workflows/quick-spec.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use `docs/workflows/workflow-runtime/requirements.md` as the controlling project requirements source where it defines shared runtime, artifact, form, prompt, registration, and legacy cleanup behavior.

The quick-spec workflow builds a delivery spec for a limited-scope enhancement or update. For larger projects, the user should use the standard workflow process beginning with the Create Architecture workflow.

Do not rely on the source markdown workflow file, legacy BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

Do not delete, migrate, remap, or otherwise touch `.cline/skills/bmad-quick-spec/**/*`; the primary project requirements explicitly leave that package in place for now.

## Source Verbiage Fidelity

The quick-spec module must preserve exact user-provided workflow metadata, persona fields, workflow-form panel text, action labels, prompt wording, document headings, and final Dev Agent Instructions from `/Users/robertboston/Documents/Cline/Workflows/quick-spec.md`, except where this document explicitly requires runtime token conversion or removal of source-authoring markers.

Workflow-value references in source prompt prose such as `workflow.output_document`, `workflow.additional_context`, and `workflow.vision_statement` must be represented in module prompt templates using shared runtime prompt-template tokens:

- `{workflow.output_document}`
- `{workflow.additional_context}`
- `{workflow.vision_statement}`

The module must let the shared `WorkflowRuntime` prompt-template renderer materialize those tokens. The module must not perform local `replace`, `replaceAll`, regex, or hand-built substitution for workflow-value references.

The source document's conditional prompt markers are source-authoring instructions, not AI-facing prompt text. The Step 2 prompt implementation must not include these strings or equivalent callouts in rendered AI-facing prompt text:

- `*** conditional prompt segment`
- `*** end conditional prompt segment ***`

When the source document does not provide distinct field labels but the live `WorkflowFormFieldDefinition` contract requires a `label`, the implementation must reuse the panel title exactly as the field label for that panel. Do not invent alternate labels.

## Workflow Identity

- `name`: `quick-spec`
- `displayName`: `quick spec`
- `slashCommandName`: `quick-spec`
- `useSkillName`: `quick-spec`
- `projectSubfolder`: `planning`
- `description`: `In this workflow, the agent builds a delivery spec for a small enhancement or update. This workflow is intended for limited-scope projects. For larger projects, use the standard workflow process beginning with the Create Architecture workflow.`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above as the workflow overview text.

## Persona

The quick-spec module must use the persona prescribed by `quick-spec.md`.

The module must copy the persona into module-owned constants and must not read BMAD agent files or the source markdown workflow document at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition`:

- `name`: `Bob`
- `role`: `Scrum Master`
- `identity`: `A pragmatic scrum master with a background in software development`
- `communicationStyle`: `crisp, checklist-driven, and ambiguity-free.`
- `capabilities`: [`translating user vision into a delivery spec via interviews and codebase assessment`]
- `principles`: [`bridging the gap between stakeholder vision and product reality requires patience and diligence.`]

## Runtime-Owned Values

The quick-spec module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- optional `additional_context`, the user's Panel B documentation file-path/context response
- required `vision_statement`, the user's Panel C vision-statement response
- `output_document`, the canonical prompt-readable absolute path to `quick-spec.md`
- output artifact metadata required by the shared artifact runtime, including `output_artifact_family`, `output_artifact_identity`, `output_artifact_filename`, and `output_artifact_relative_path`

The quick-spec artifact definition must map `outputValueKeys.artifactAbsolutePath` to `output_document`. This makes the runtime-resolved artifact absolute path available as the workflow's canonical session output document path for prompts and model-facing file edits.

The Panel A yes/no field is form-local branching state only. It must not be persisted as a workflow-owned value unless a later approved requirement explicitly adds a durable value for it.

Workflow values must remain JSON-safe and preserve type and shape. Prompt builders may render workflow values only through the shared runtime renderer; runtime or tool code requiring string paths must validate non-empty strings before use.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state.

## AI-Writable Workflow Values

The quick-spec module must not define AI-writable workflow values.

No quick-spec step may expose `set_workflow_values`. Project selection, workflow-form persistence, artifact output persistence, and document initialization are runtime-owned deterministic behavior. Model-facing steps update the generated quick-spec artifact through governed file-read and file-edit tools.

## Runtime Artifacts And Output Documents

The quick-spec workflow produces one runtime-owned singleton project markdown artifact.

The implementation must extend the runtime-owned artifact-family registry and related type surfaces to support a singleton project markdown artifact for quick-spec output, consistent with the project artifact requirements.

The new artifact family must be runtime-owned, not module-owned. The quick-spec module may reference the artifact-family identifier, but must not define or override canonical filename patterns, extensions, numbering scopes, discovery patterns, or path construction.

The new artifact family must use:

- enum member: `WorkflowArtifactFamily.QuickSpec`
- enum value: `quick_spec`
- allocation mode: `singleton_project`
- identity requirement: `none`
- numbering scope: `project_singleton`
- content kind: `markdown`
- file extension: `.md`
- stable singleton identity: `quick_spec`
- canonical filename pattern: `quick-spec.md`
- discovery pattern matching only `quick-spec.md`

The artifact goes in the selected project's `planning` subfolder because the workflow's `projectSubfolder` is `planning`.

The quick-spec workflow artifact definition must use:

- artifact id: `quick_spec`
- family: `WorkflowArtifactFamily.QuickSpec`
- `intentMode`: `new`
- `parentIdentitySource`: `undefined`
- `targetIdentitySource`: `undefined`
- standalone `outputValueKeys`
- `outputValueKeys.artifactAbsolutePath`: `output_document`

When runtime entry artifact resolution returns `creationRequired: true`, Step 1 must allocate/create this artifact through an `allocate_artifact` decision action, which the runtime executes through `create_workflow_artifact`. The runtime must create the empty file and persist project/artifact metadata into workflow values.

When runtime entry artifact resolution returns `creationRequired: false`, Step 1 must skip `allocate_artifact` and skip the initial document build for that artifact. Runtime persists the same artifact output values for the existing canonical artifact path, including `output_document`.

Runtime-owned deterministic document initialization must use `build_workflow_document`. `build_workflow_document` must not be exposed through model-facing quick-spec tool schemas.

The initial document shell must be generated from runtime code, not from markdown assets. The module-owned document builder must produce this exact heading order and no extra source-marker lines:

```text
# Product Vision

# User Context

# Project Scope

# Boundaries & Constraints

# Technical Decisions

# Solution Overview

# Acceptance Criteria

# Code Map

# Sequencing

# Dev Agent Instructions

# Implementation Phases
```

## Required Prerequisite Files

The quick-spec workflow has no required prerequisite files and no optional prerequisite files.

The module must not declare `WorkflowDefinition.prerequisiteFiles`.

The Step 1 optional documentation/context input is user-provided form text persisted to `additional_context`; it is not a runtime prerequisite-file declaration and must not use `resolve_prerequisite_files`.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the quick-spec workflow using the module-owned description.

The quick-spec workflow is approved to expose the generic `use_subagents` model-facing tool only in Step 4. That does not authorize workflow child-session activation, child inheritance rules, or BMAD subagent persona/reminder injection.

The module must define each workflow step as a `WorkflowStepDefinition`:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`
- `stepNumber` must define runtime step order
- `checklistLabel` must define the focus-chain task text projected to the UI
- `buildPromptSource` must provide module-owned prompt text or `none` for runtime-only Step 1
- `buildToolSchema` must delegate directly to named exports from `quickSpecToolSchemas.ts`
- `decisionTree` must own entry artifact resolution, workflow-form rendering, document initialization, model handoff, workflow progression, and completion behavior
- final-step completion must use workflow-runtime completion and teardown behavior

The module must define these four steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Gather Context & Generate Spec Document` | Runtime-driven. Branch on runtime entry singleton artifact resolution, allocate and initialize `quick-spec.md` only when creation is required, render the Step 1 context/vision workflow form, persist `additional_context` and `vision_statement`, and transition to Step 2. |
| `step-2` | 2 | `Assess Vision & Develop Solution Foundation` | Model-driven. Render the source-prescribed Step 2 prompt with optional additional-context sections, expose approved read/edit/message/progression tools, and transition to Step 3 after `workflow_progress_request` is confirmed. |
| `step-3` | 3 | `Finalize Solution & Implementation Spec` | Model-driven. Render the source-prescribed Step 3 prompt, expose approved read/edit/message/progression tools, and transition to Step 4 after `workflow_progress_request` is confirmed. |
| `step-4` | 4 | `Generate Implementation Details` | Model-driven. Render the source-prescribed Step 4 prompt, expose approved read/edit/message/subagent/final-delivery tools, and complete the workflow after successful `attempt_completion`. |

## Step 1: Gather Context & Generate Spec Document

Step 1 is runtime-driven and must not route to `project_prompt`.

Step 1 must begin by waiting for `entry_artifact_resolution_completed` for artifact id `quick_spec`.

When the event reports `creationRequired: true`, Step 1 must:

1. run `allocate_artifact` for artifact id `quick_spec`
2. on allocation success, run `build_workflow_document` using the module-owned initial quick-spec document builder
3. on initial document-build success, render the Step 1 workflow form
4. on first allocation failure, retry allocation exactly once
5. on retry allocation failure, route to `terminal_error` with `Unable to allocate quick-spec.md after retrying artifact creation.`
6. on initial document-build failure, route to `terminal_error` with `Unable to initialize quick-spec.md.`

When the event reports `creationRequired: false`, Step 1 must skip allocation and skip initial document build, then render the same Step 1 workflow form against the existing `output_document` path already persisted by runtime entry artifact resolution.

The Step 1 workflow form must be one multi-panel form with:

- form id: `step-1-quick-spec-input-form`
- `title`: `Gather Context & Generate Spec Document`
- `toolDictionaryTitle`: `Gather Context & Generate Spec Document`
- `toolDictionaryMarkdown`: the module-owned workflow description
- first panel id: `step-1-existing-documentation-panel`

Panel A must be:

- panel id: `step-1-existing-documentation-panel`
- `title`: `Existing Documentation`
- `promptMarkdown`: `Would you like to provide any existing documentation as context?`
- field key: `has_existing_documentation`
- field kind: `boolean`
- field label: `Existing Documentation`
- field required: `true`
- field `allowedValueType`: `boolean`
- field `trueLabel`: `yes`
- field `falseLabel`: `no`
- no `workflowValueKey`
- `allowedActions`: [`submit`]
- `actionLabels.submit`: `continue`
- transition: conditional on `has_existing_documentation`
- `true` branch: next panel `step-1-documentation-file-paths-panel`
- `false` branch: next panel `step-1-vision-statement-panel` and clear stale `additional_context`

Panel B must be:

- panel id: `step-1-documentation-file-paths-panel`
- `title`: `Documentation File Paths`
- `promptMarkdown`: `Please provide the full file path(s) for any documentation you'd like to use as context.`
- field key: `additional_context`
- field `workflowValueKey`: `additional_context`
- field kind: `large_text`
- field label: `Documentation File Paths`
- field required: `true`
- field `allowedValueType`: `string`
- field presentation `textareaSize`: `large`
- `allowedActions`: [`submit`, `back`]
- `actionLabels.submit`: `continue`
- `actionLabels.back`: `back`
- `backDestinationPanelId`: `step-1-existing-documentation-panel`
- transition: sequential to `step-1-vision-statement-panel`

Panel C must be:

- panel id: `step-1-vision-statement-panel`
- `title`: `Vision Statement`
- `promptMarkdown`: `Please describe what you'd like to achieve with this update.`
- field key: `vision_statement`
- field `workflowValueKey`: `vision_statement`
- field kind: `large_text`
- field label: `Vision Statement`
- field required: `true`
- field `allowedValueType`: `string`
- field presentation `textareaSize`: `large`
- `allowedActions`: [`submit`, `back`]
- `actionLabels.submit`: `Continue`
- `actionLabels.back`: `Back`
- `backDestinationPanelId`: `step-1-existing-documentation-panel`
- transition: terminal

After the Step 1 workflow form completes, Step 1 must transition to Step 2. Step 1 must not use `workflow_progress_request`, `attempt_completion`, model-driven file edits, or AI workflow-value writes.

## Step 2: Assess Vision & Develop Solution Foundation

Step 2 is model-driven. Its entry branch must emit `project_prompt`, then wait for `workflow_progress_request_confirmed` or `workflow_progress_request_denied`.

On `workflow_progress_request_confirmed`, Step 2 must transition to Step 3. On `workflow_progress_request_denied`, Step 2 must route back to `project_prompt` for continued Step 2 work.

The Step 2 prompt must include the optional additional-context read-list line and the optional additional-context document-update sentence only when `additional_context` is present as a non-empty string after trimming.

When `additional_context` is present, the rendered Step 2 prompt must follow this AI-facing content, with workflow-value tokens rendered by the shared runtime renderer and with no source conditional callout markers:

```text
You have been called inside a Quick Spec workflow. Your role is to assist the user in building out a delivery spec for a limited-scope project.
Read the following:
- {workflow.output_document}
- {workflow.additional_context}

The system generated the spec file for you from a standardized template here:
- {workflow.output_document}

The user provided a vision statement for this product update:
{workflow.vision_statement}

Review the vision statement and add it to the spec file under the "Product Vision" Heading.
Add the additional context provided to the spec file under the "User Context" heading.

Next, inform the user that the first step is to develop a buildable solution from the product vision, starting by defining the boundaries and constraints. Aid the user in defining the project's scope, boundaries, and constraints, assessing runtime code where necessary, and updating {workflow.output_document} to reflect decisions under the "Project Scope" and "Boundaries & Constraints" headings.

Once scope, boundaries, and constraints are clear, inform the user that the next step is to document any technical decisions needed to inform the solution. Identify any technical solutions relevant to the project, gain alignment from the user, then update the "Technical Decisions" section of {workflow.output_document} to reflect the approved technical decisions.

Do not touch any of the sections in the spec file beyond the "Technical Decisions" section in this step. Instructions for populating the remaining sections will be provided in later workflow steps.

Once the spec file is complete up to and including the "Technical Decisions" section, call workflow_progress_request to unlock the next step's instructions.
```

When `additional_context` is absent or blank, the rendered Step 2 prompt must omit only:

- `- {workflow.additional_context}`
- `Add the additional context provided to the spec file under the "User Context" heading.`

All other Step 2 prompt text must remain in the same order.

## Step 3: Finalize Solution & Implementation Spec

Step 3 is model-driven. Its entry branch must emit `project_prompt`, then wait for `workflow_progress_request_confirmed` or `workflow_progress_request_denied`.

On `workflow_progress_request_confirmed`, Step 3 must transition to Step 4. On `workflow_progress_request_denied`, Step 3 must route back to `project_prompt` for continued Step 3 work.

The Step 3 prompt template must use this exact source text, with source workflow-value references converted to shared runtime prompt-template tokens:

```text
The next step is to capture the solution overview based on what was added to {workflow.output_document} in step 2. Work with the user to draft an approved solution overview, then add it to the spec file under the "Solution Overview" heading.

Once the solution overview is complete, inform the user that you will scan the codebase to identify the seams which must be touched during implementation, then review runtime code & test configuration to identify all revisions necessary to deliver the intended solution. Add content to {workflow.output_document} under the "Code Map" heading indicating all surfaces which must be touched during implementation with guidance on what needs to be added, removed, or updated.

After reviewing code and populating the "Code Map" section in the spec file, notify the user that you've mapped the solution to it's implementation seams and provide them with the content you added to the "Code Map" section of the spec file. Revise or expand as needed based on their feedback before moving on. Once the use approves the code map content, move on.

Lastly, inform the user that you'll identify the correct implementation sequence based on the code map and dependencies within the codebase. Review the surfaces to be touched based on the code map, identify where dependencies exist, and populate the "Sequencing" section of {workflow.output_document} with a suggested implementation sequence. Then provide the user with the sequencing content and adjust as needed based on their feedback.

Once the user approves the content under the spec file's "Sequencing" heading, call workflow_progress_request to unlock the next workflow step's instructions.
```

The typo `Once the use approves` is present in the source prompt and must not be silently corrected by implementation work unless the source document or requirements are explicitly revised.

## Step 4: Generate Implementation Details

Step 4 is model-driven. Its entry branch must emit `project_prompt`, then wait for `attempt_completion_succeeded`.

On `attempt_completion_succeeded`, Step 4 must route to `complete_workflow`.

The Step 4 prompt template must use this exact source text, with source workflow-value references converted to shared runtime prompt-template tokens and without adding extra implementation guidance:

```text
Next, inform the user that the next step is to divide the work into tightly-scoped seams if needed to make identifying tasks and subtasks easier later. Offer to review what has been captured so far and provide a recommendation. 

*** Determine Task-Discovery Strategy ***
Review {workflow.output_document}, perform any code review necessary (limiting this to only where it is truly necessary) then decide whether this work should be planned as a single story or divided into separate stories.

Keep the work as a single phase when:
- the implementation can be understood as one coherent change slice
- the required revisions cannot be divided into compile-safe chunks
- the affected code follows one primary execution path or one tightly-coupled vertical slice
- likely file touches, tests, typing changes, and wiring impacts can be understood together without separate investigations
- one bounded `Tasks / Subtasks` plan can be authored without splitting file ownership or seam boundaries

Break the work into multiple phases when:
- there are 2 or more independently traceable implementation slices
- the work can be divided into compile-safe chunks
- different layers or subsystems require separate repo exploration
- different task groups would naturally require different allowed-files boundaries
- one seam can be analyzed and planned without reading the others in full
- keeping the work as one seam would force broad repo exploration before executable task blocks can be written

Do not break work into multiple phases if the split would create overlapping file ownership, duplicate investigation, or artificial task boundaries.

Share your recommendation for how this project should be divided into implementation phases (if at all), then capture the phase(s) under the "implementation phases" heading in {workflow.output_document}.

Next, inform the user that you will use subagents to quickly identify the exact steps necessary to execute this project, including file and line targets. Then, launch a subagent for each phase, up to four subagents at a time. Provide the spec file's file path to each subagent ({workflow.output_document}) and provide them with clear direction regarding the phase they are assigned to.
Subagents must:
- Confirm the exact runtime code and test revisions necessary to deliver their assigned phase
- Identify the exact code revisions necessary during implementation
- Trace relevant seams end-to-end
- Assess types, interfaces, schemas, validators, imports, and exports to ensure comprehensive task coverage
- Respond with a full set of required revisions including full file path for target files

Once subagents have delivered their output to you, use their responses to build out the implementation phase(s) under the spec file's "Implementation Phases" heading, following these rules exactly:

ACCEPTANCE CRITERIA TRACE:
For each requirement, identify
- Exact required behavior.
- Exact user-facing, terminal-error, panel, option, tool, or schema text
- Required persisted values, artifacts, routes, actions, fixtures, and validation coverage.
- Owning runtime, module, test, documentation, and validation files.

LIVE CONTRACT INSPECTION:
For each affected file, verify the live contract before drafting subtasks:
- Existing imports and exports.
- Helper names, signatures, return types, and call sites.
- Type definitions, discriminated unions, required fields, and narrowing requirements.
- Constructor, method, action, route, event, session, and fixture object shapes.
- Existing assertions and validation commands.
- Existing files and exact paths for every command.
Every referenced symbol must be classified as one of:
- Existing symbol verified in live code.
- New symbol created earlier in the same phase.
- Invalid and requiring rewrite before the plan can be used.

CONFIRM IMPLEMENTATION METHOD:
Use the content in the spec file and any available repo documentation (readmes, etc) to determine the approved implementation method.
If more than one implementation method is viable and the approved documents do not clearly select one, stop and ask the user to choose.
Do not invent architecture, compatibility bridges, aliases, fallback paths, or legacy preservation unless requirements explicitly approve them.

DRAFT TASKS & SUBTASKS:
Tasks and subtasks must be sequentially numbered.
Tasks may summarize a file or capability area. Subtasks must prescribe exact changes.
Each task or subtask must include:
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

Do not use vague phrases such as:
- "all helpers"
- "matching sibling pattern"
- "equivalent shape"
- "update tests"
- "as needed"
- "fixture like the existing one"
- "all exported constants"
- "each static branch template"
Name every symbol, constant, fixture, assertion, and command exactly.

DELTA FALLOUT PASS:
After drafting each task, inspect the consequences of every prescribed change.
For every deletion, replacement, de-parameterization, signature change, type change, or removed call site, prescribe cleanup for:
- Now-unused imports.
- Dead helpers.
- Dead exports.
- Stale fixture fields.
- Stale test assertions.
- Stale validation guards.
- Scope-diff allowlists.
Validation commands do not replace this pass. It is a guide violation to rely on typecheck, lint, or implementation-time discovery to find fallout.

DRAFT VALIDATION:
Validation must be exact and repo-supported.
Include:
- Focused tests for touched runtime and test layers.
- Typecheck.
- Lint or formatting gate required by the repo.
- Package/build validation when required by project guidance.
- Static guards only for approved forbidden legacy concepts or regression risks.
- Scope diff using both `git diff --name-only` and `git ls-files --others --exclude-standard`.
If a command path does not exist, rewrite the validation command before completing the plan.

COMPLIANCE MATRIX:
Before reporting completion, audit every task and subtask with this matrix:

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |

Every row must be complete. If any row requires inference by the implementing agent, rewrite the task or subtask.

FINAL LINE-BY-LINE AUDIT:
Re-read each phase from top to bottom.
For each task and subtask, confirm:
- It is backed by the spec file's acceptance criteria, project scope, technical decisions, and/or solution overview
- It is compile-safe.
- It has exact imports and cleanup.
- It has exact fixture/action/session shapes.
- It has exact assertions where stable contracts are involved.
- It does not invent prose.
- It does not preserve unauthorized legacy behavior.
- It does not require the dev agent to infer implementation details.

DEV AGENT INSTRUCTIONS:
Add this exact content to the "Dev Agent Instructions" section of {workflow.output_document}. Do not paraphrase or invent additional instructions.
Required instructions:
- Read this plan from top to bottom before making any changes.
- Read each task and subtask in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.
  - After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.

Once you've authored the implementation phases, audited and reviewed them, and added the prescribed agent instructions, notify the user that you've completed the implementation document. Provide them with the full file path for the document ({workflow.output_document}), and ask them to review. Adjust as needed based on their feedback. Once the user approves the drafted content, call attempt_completion and provide a final recap before the workflow automatically concludes.
```


## Tool Schema Requirements

All model-visible quick-spec tool-schema builders must live in:

```text
src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts
```

`quickSpecWorkflow.ts` must not define inline `ClineToolSpec` objects, inline tool arrays, local tool-schema builder bodies, or fallback empty schemas. Each step must delegate directly to a named export from `quickSpecToolSchemas.ts`.

For normal shared tools, the quick-spec tool-schema file must declare exact ordered `ClineDefaultTool[]` lists and resolve those ids through the registered shared/default `ClineToolSet` registry. It must not hand-build or copy shared/default tool specs.

Because `workflow_progress_request` is a reusable workflow progression tool, this work must add it to the shared/default prompt-tool registry instead of defining a quick-spec-local `ClineToolSpec` for it. The shared/default prompt-tool spec must live under `src/core/prompts/system-prompt/tools/`, must use `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST`, must expose tool name `workflow_progress_request`, must have generic workflow-step progression wording, must define no parameters, must be exported from the tools barrel, and must be registered by `registerClineToolSets()`. Quick-spec Step 2 and Step 3 tool schemas must consume `workflow_progress_request` through `ClineToolSet.getToolByNameWithFallback(...)` like the other shared/default tools.

The module must define these exact model-visible tool ids by step:

| Step | Tool ids |
| --- | --- |
| Step 1 | empty array |
| Step 2 | `ClineDefaultTool.FILE_READ`, `ClineDefaultTool.FILE_READ_RANGE`, `ClineDefaultTool.LIST_FILES`, `ClineDefaultTool.SEARCH`, `ClineDefaultTool.LIST_CODE_DEF`, `ClineDefaultTool.APPLY_PATCH`, `ClineDefaultTool.SEND_USER_MESSAGE`, `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST` |
| Step 3 | `ClineDefaultTool.FILE_READ`, `ClineDefaultTool.FILE_READ_RANGE`, `ClineDefaultTool.LIST_FILES`, `ClineDefaultTool.SEARCH`, `ClineDefaultTool.LIST_CODE_DEF`, `ClineDefaultTool.APPLY_PATCH`, `ClineDefaultTool.SEND_USER_MESSAGE`, `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST` |
| Step 4 | `ClineDefaultTool.FILE_READ`, `ClineDefaultTool.FILE_READ_RANGE`, `ClineDefaultTool.LIST_FILES`, `ClineDefaultTool.SEARCH`, `ClineDefaultTool.LIST_CODE_DEF`, `ClineDefaultTool.APPLY_PATCH`, `ClineDefaultTool.SEND_USER_MESSAGE`, `ClineDefaultTool.USE_SUBAGENTS`, `ClineDefaultTool.ATTEMPT` |

The quick-spec model-facing schemas must not include:

- `ClineDefaultTool.SET_WORKFLOW_VALUES`
- `ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT`
- `ClineDefaultTool.CREATE_WORKFLOW_ARTIFACT`
- `ClineDefaultTool.ARCHIVE_WORKFLOW_ARTIFACT`
- `ClineDefaultTool.DELETE_WORKFLOW_ARTIFACT`
- `ClineDefaultTool.MOVE_WORKFLOW_PROJECT_FILE`
- `ClineDefaultTool.FILE_NEW`
- legacy `build_tech_spec_document`

`FILE_NEW` must not be exposed because quick-spec file creation is runtime-owned through artifact allocation and `build_workflow_document`; model-driven writing is limited to governed patch edits of the existing generated artifact.

## Decision Tree Requirements

Step 1 must use runtime-owned decision actions only:

- `allocate_artifact`
- `build_workflow_document`
- `render_workflow_form`
- `transition_step`
- `terminal_error`

Step 1 must not expose any model-facing tools and must not route to `project_prompt`.

Steps 2 and 3 must use the standard progress-gated model-driven pattern:

1. entry branch emits `project_prompt`
2. following branch waits for `workflow_progress_request_confirmed` or `workflow_progress_request_denied`
3. confirmed route transitions to the next step
4. denied route returns to `project_prompt`

Step 4 must use the standard final-delivery pattern:

1. entry branch emits `project_prompt`
2. following branch waits for `attempt_completion_succeeded`
3. success route emits `complete_workflow`

Step progression must be represented by `transition_step` actions. Step progression must not rely on focus-chain checklist mutation, placeholder deterministic progression, response-tool side effects, or route metadata outside the selected decision action.

## Legacy Cleanup Requirements

The quick-spec action plan must retire the source-prescribed legacy surfaces without preserving compatibility aliases or replacement shared helpers:

- delete `src/shared/build-tech-spec-document.ts` entirely if it still exists
- delete `src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts` entirely if it still exists
- delete `QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID` from `src/core/task/workflow-step-resolution/WorkflowStepResolutionRegistry.ts` and remove its registration, references, imports, exports, and tests if they still exist
- remove prompt/tool/schema/test references to legacy `build_tech_spec_document` and `build-tech-spec-document`

The build must not preserve old quick-spec placeholder concepts such as `tech-spec-wip.md`, title/slug/date/status frontmatter initialization, legacy 10-step quick-spec deterministic progression, or legacy workflow-specific document-build handlers.

## Registration Requirements

The module must export the quick-spec workflow definition from its local `index.ts` and register it in `src/core/task/workflow-runtime/WorkflowRegistry.ts`.

The shipped workflow registry must resolve the module by:

- canonical workflow `name`: `quick-spec`
- `slashCommandName`: `quick-spec`
- `useSkillName`: `quick-spec`

The implementation must not preserve markdown filename identities such as `quick-spec.md` as activation aliases unless a later approved requirement explicitly says to.

## Expected Implementation Surfaces

The action plan must inspect and prescribe exact changes for every affected live contract. Expected surfaces include, at minimum:

- `src/core/task/workflow-runtime/artifactFamilies.ts`
- `src/core/task/workflow-runtime/types.ts`
- `src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `src/core/prompts/system-prompt/tools/workflow_progress_request.ts`
- `src/core/prompts/system-prompt/tools/init.ts`
- `src/core/prompts/system-prompt/tools/index.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-spec/index.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecDocument.ts`
- focused module tests under `src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/`
- prompt integration tests under `src/core/prompts/system-prompt/__tests__/integration.test.ts`
- shared prompt-tool registry tests under `src/core/prompts/system-prompt/__tests__/`
- registry/metadata/slash-command tests affected by shipped workflow registration
- runtime tests affected by singleton artifact-family registration and entry artifact resolution
- legacy cleanup files and tests if the legacy surfaces still exist

If the live repo shows any of these expected surfaces are already deleted, absent, or replaced by a newer equivalent, the action plan must state the verified live status and prescribe only the remaining required changes.

## Testing Requirements

Module workflow tests must cover:

- workflow identity and metadata, including lower-case `displayName`
- structured Bob/Scrum Master persona fields
- workflow value inventory
- `entryProjectValueKeys`
- absence of AI-writable workflow values and absence of `set_workflow_values`
- quick-spec artifact definition and `output_document` output-value mapping
- Step 1 creation-required route through allocation, initial document build, form rendering, and Step 2 transition
- Step 1 continue-existing route skipping allocation and initial document build before form rendering
- allocation retry and terminal-error routes
- initial document-build terminal-error route
- Step 1 form panels, exact titles, exact promptMarkdown, exact labels, exact action labels, boolean true/false labels, conditional Panel B behavior, Panel C back destination to Panel A, and stale `additional_context` clearing when Panel A is no
- Step 2 prompt shape with and without `additional_context`
- Step 2 no leakage of conditional authoring markers
- Step 3 prompt source shape and required workflow-value token rendering
- Step 4 prompt source shape, `use_subagents` availability, Dev Agent Instructions content presence, and final `attempt_completion_succeeded` completion route
- Step 2 and Step 3 progress-confirmed and progress-denied routes
- Step 4 completion route
- absence of archive/delete workflow artifact tools from model-facing schemas
- absence of retired legacy tech-spec document tools

Document builder tests must cover:

- exact quick-spec heading order
- empty initial document shell
- no runtime dependency on markdown templates, `.cline/skills`, or source workflow markdown
- no legacy quick-spec frontmatter, title/slug/date/status scaffold, or `tech-spec-wip.md` references

Tool schema tests must assert exact ordered tool ids for Steps 1 through 4 and must assert forbidden tool ids are absent.

Shared prompt-tool registry tests must prove `workflow_progress_request` is registered as a shared/default `ClineToolSet` spec, resolves through `getToolByNameWithFallback(...)` for `ModelFamily.NATIVE_GPT_5`, has no parameters, and uses the canonical shared tool id and name.

Prompt integration tests must prove:

- current step details appear in the correct projected payload location
- workflow tokens are materialized and no unresolved `{workflow.<...>}` tokens leak into rendered prompt output
- Step 2 conditional content appears only when `additional_context` is non-empty
- Step 2 conditional source-authoring markers never appear
- runtime-projected workflow schema is the exact native tool surface for each step
- response-tool guidance matches the projected schema
- backend-only runtime tools such as `build_workflow_document` and `create_workflow_artifact` are not statically or model-facing exposed

Runtime and registry tests must cover any new artifact-family type/registry behavior, including singleton identity `quick_spec`, filename `quick-spec.md`, discovery pattern behavior, and singleton existing-artifact resolution compatibility with the shared runtime entry flow.

## Validation Requirements

The quick-spec action plan must include exact repo-supported validation commands for every affected phase. The final validation phase must include at least:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/quick-spec/__tests__/quickSpecDocument.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts
npm run check-types
npm run lint
npm run package
git diff --name-only
git ls-files --others --exclude-standard
```

The action plan must add any additional focused unit commands required by the exact files it touches, including registry, metadata, slash-command, or cleanup test files.

The phase that adds the shared/default `workflow_progress_request` prompt-tool spec must include focused unit validation for both the shared prompt-tool registry coverage and the quick-spec tool-schema coverage that consumes the registered spec.

The action plan must include focused static guards for approved forbidden legacy concepts. At minimum, final validation must guard against live source references to the patterns below. The expected result for each guard is no matches; an `rg` exit code caused only by no matches is passing and must not be treated as a code defect.

```bash
rg -n "build_tech_spec_document|build-tech-spec-document|BuildTechSpecDocumentToolHandler|QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_DEFINITION_ID|tech-spec-wip\\.md" src -g "*.ts" -g "!**/__tests__/**" -g "!**/*.test.ts"
rg -n "conditional prompt segment|end conditional prompt segment" src/core/task/workflow-runtime/workflow-modules/quick-spec -g "*.ts" -g "!**/__tests__/**"
rg -n "build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|set_workflow_values|write_to_file" src/core/task/workflow-runtime/workflow-modules/quick-spec/quickSpecToolSchemas.ts
```

If a validation command path does not exist at action-plan authoring time, the action plan must rewrite that command to target the actual expected file path before completion.

Every phase must include scope-diff validation using both `git diff --name-only` and `git ls-files --others --exclude-standard`, and the phase must define an authorized file set broad enough for the exact runtime, test, documentation, and cleanup files that phase prescribes.

## Action Plan Requirements

The quick-spec action plan must follow `docs/action-plan-guide.md`.

Before writing the action plan, the author must inspect every runtime, test, fixture, registry, schema, prompt, and validation file likely affected by the quick-spec build. The plan must not defer live-contract discovery to implementation-time typecheck, lint, or failing tests.

For each task and subtask, the action plan must provide:

- full target file path
- allowed files list
- one exact prescribed revision unless subordinate subtasks split the work
- exact imports to add or remove
- exact helper, function, type, enum, object, fixture, route, action, event, and assertion shapes
- exact fallout cleanup for removed legacy quick-spec surfaces
- exact validation coverage

If more than one implementation method remains viable after applying this requirements document, the primary project requirements, the module build guide, and live code inspection, the action plan author must stop and ask the user to choose before prescribing the affected task.
