# Workflow Module Build Guide

This guide describes how to build a workflow module for the runtime-owned workflow architecture. It is based on the completed brainstorming module, which is the current reference implementation for a shipped workflow module with runtime-owned artifacts, workflow forms, deterministic progression, module-owned prompt data, and per-step tool-schema projection.

Use this guide as a tutorial and checklist. It does not replace the requirements document, architecture document, or action plan rules. If a future workflow needs behavior that is not explicitly governed by requirements, stop and tighten the requirements before writing the action plan or code.

Reference implementation:

- Requirements: `docs/workflows/workflow-runtime/workflow-modules/brainstorming/brainstorming-requirements.md`
- Action plan: `docs/workflows/workflow-runtime/workflow-modules/brainstorming/action-plan.md`
- Module definition: `src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`
- Tool schema file: `src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingToolSchemas.ts`
- Document builder: `src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingDocument.ts`
- Module registry/data: `src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry.ts`
- Module exports: `src/core/task/workflow-runtime/workflow-modules/brainstorming/index.ts`

## Build Order

Build a workflow module in this order:

1. Write or tighten the module requirements.
2. Identify any foundational/runtime support needed before module code.
3. Write an action-plan-guide-compliant module action plan.
4. Implement runtime support first, if needed.
5. Implement module-owned data, document builders, workflow definition, and tool schemas.
6. Add shared backend tools only when module behavior truly requires them.
7. Register the workflow.
8. Add tests at the module, runtime, handler, and prompt-projection levels.
9. Run unit validation, typecheck, lint, package.

Do not start from code. The requirements must own the final behavior, especially prompt text, step progression, artifact behavior, and model-visible tool schemas.

When a user-authored workflow source document provides prompt text, user-facing panel text, labels, button text, or other UI-visible wording, the module requirements must prescribe that exact verbiage. Do not summarize, paraphrase, condense, or reinterpret user-authored prompt or UI copy while drafting requirements or action plans. Runtime implementation may interpolate deterministic workflow values into the prescribed text, but the surrounding wording must remain the user-authored wording unless the user explicitly approves a rewrite.

Do not invent UI-visible fields, labels, notices, helper text, descriptions, button labels, or prompt wording. If a runtime form, prompt builder, or schema needs UI-visible text that the source document does not provide, stop and ask the user to add or approve the missing wording before writing requirements, action-plan tasks, or code.

## Requirements Checklist

Every module requirements document should explicitly govern these areas.

### Identity And User-Facing Metadata

Define:

- canonical workflow `name`
- `slashCommandName`
- `useSkillName`
- `displayName`
- `description`
- `projectSubfolder`
- persona fields

The user-provided workflow instructions file contains the persona designation and supporting information, which must be exactly translated into requirements, then prescribed for implementation in the action plan, including:
- name
- role
- identity
- capabilities
- communicationStyle
- principles



If the module requirements and workflow instructions file do not contain the above persona details, stop and ask the user to ensure that the necessary information is present in the instructions file, then update the requirements document to mirror what is prescribed by the user. Do not invent persona data ad hoc inside the action plan or implementation.

### Runtime-Owned Values

Declare every workflow value key the module may store in `workflowValueKeys`.

Include:

- shared entry project keys: `projectMode`, `projectTitle`, `projectFolderName`
- form values that must survive beyond form-local state
- deterministic procedure state
- artifact output metadata values
- AI-writable workflow values, if any

Do not allow hidden values. If the runtime or a tool writes a key, that key belongs in `workflowValueKeys`.

When AI writes workflow values, the active step tool schema must explicitly expose the mutation tool and the exact writable keys. Do not rely on runtime persistence authorization as model-facing exposure control.

### Artifact Strategy

Decide whether the workflow needs a runtime-owned artifact.

If it needs a new artifact family, the requirements must clearly indicate as much, and the action plan must prescribe the exact steps necesesary to register the artifact.

Module artifact definitions should reference runtime-owned artifact families and map `outputValueKeys` into module workflow values. The module should not invent filename rules, numbering rules, path construction, or discovery rules that belong to the runtime artifact-family registry.

For model-facing steps, persist the resolved artifact path into a workflow value such as `output_file`, then render that value into prompts. The AI should not recompute the artifact path.

Use `project_numbered` artifact families when a workflow must create a new artifact that receives the next number within the artifact family in the selected project without a parent or target artifact identity. The artifact family must be registered in `WORKFLOW_ARTIFACT_FAMILY_REGISTRY` with `allocationMode: "new_numbered"`, `identityRequirement: "none"`, and `numberingScope: "project_numbered"`.

A workflow module using a project-numbered family declares a standalone `WorkflowArtifactDefinition` with `intentMode: "new"`, `parentIdentitySource: undefined`, `targetIdentitySource: undefined`, and standalone `outputValueKeys`. The module must route through `allocate_artifact`; it must not compute `{C}`, scan files, parse filenames, or construct artifact paths.

Project-numbered artifacts use the workflow's `projectSubfolder` as the numbering and destination folder. Runtime discovers existing filenames matching the family discovery pattern in that folder, allocates the highest existing `{C}` plus one, creates the empty artifact, and persists the same standalone artifact metadata keys as singleton project artifacts.

For singleton artifacts with `intentMode: "new"`, existing-project conflict handling is runtime-owned. The module must not inspect the filesystem, compute whether the artifact already exists, archive files, delete files, or expose archive/delete tools to the model.

Project selection completion is runtime lifecycle state only; workflow modules must not branch on `project_selection_completed`. After project selection and any runtime-owned entry singleton artifact resolution, runtime emits `entry_artifact_resolution_completed`. The module decision tree must branch on that event:

- `creationRequired: true`: run the normal `allocate_artifact` and initial `build_workflow_document` setup route.
- `creationRequired: false`: skip `allocate_artifact` and skip the initial document build for that artifact, then continue through the post-artifact-ready route.

The runtime persists artifact output values for continued existing artifacts, so prompts should read the same workflow values they would read after allocation.

### Runtime Writes Versus AI Writes

Use `build_workflow_document` only for runtime-owned deterministic full-document replacement actions.

Do not expose `build_workflow_document` through model-facing `buildToolSchema(...)`. It replaces the whole file and is not the right editing surface for interactive agent work.

For model-facing artifact edits, expose governed file tools such as:

- `read_file`
- `apply_patch`

### Steps And Progression

Each step must declare:

- `id` in canonical `step-{number}` form
- `stepNumber`
- `checklistLabel`
- `buildPromptSource`
- `buildToolSchema`
- `decisionTree`

Even runtime-only steps must delegate `buildToolSchema` to a named export from the module tool-schema file. For runtime-only steps, that export returns an empty array. Do not use local fallback bodies such as `() => []` inside `{workflowId}Workflow.ts`.

Choose one of these step modes:

| Step mode | Decision action pattern | Tool schema |
| --- | --- | --- |
| Runtime-driven | `allocate_artifact`, `render_workflow_form`, `run_deterministic_procedure`, `build_workflow_document`, `transition_step`, `terminal_error` | empty exported builder |
| Model-driven | `project_prompt`, then event routes such as `workflow_progress_request_confirmed` or `attempt_completion_succeeded` | non-empty exported builder |

Do not let a step route to `project_prompt` while exposing an empty schema.

### Workflow Forms

Use workflow forms for structured user input before model-driven work.

Rules of thumb:

- Use one multi-panel form for one logical input flow.
- Put form-local panel sequencing, conditional branches, back navigation, and stale value clearing inside the form definition. Use runtime-routed transitions only when the next panel must be chosen or prepared by workflow runtime route/action logic.
- Use runtime-routed same-session panels when the next panel depends on module route/action logic, deterministic backend checks, tool-backed work, selected-project file checks, or backend-computed panel payload data.
- A runtime-routed panel submission emits `workflow_form_panel_submitted`; the workflow module decision tree handles that event and returns `continue_workflow_form` to render the next panel in the same active form session.
- Runtime-routed panels must prescribe `backDestinationPanelId` whenever `back` is allowed because the workflow form cannot infer or replay module-owned route/action decisions.
- Continued panels use the same canonical panel-finalization pipeline as initially rendered panels, including prompt/content interpolation, `jsonOptionsSource` resolution, field validation, allowed actions, and stale value clearing.
- Use `workflowValueKey` only when the submitted value must persist beyond form-local state.
- A workflow form field persists at most one durable workflow value. If one user choice determines additional module values, derive those values in deterministic post-form behavior instead of trying to make the field persist multiple workflow values.
- Use `staleValueKeysToClear`, `resetValueKeysOnChange`, and back-panel stale clearing to prevent stale dependent values.
- Do not split a single form flow into multiple workflow forms unless requirements explicitly demand it.

The brainstorming Step 2 form is the reference pattern: approach selection, category selection, technique selection, and random confirmation are all one form with conditional panels.

Use `jsonOptionsSource` when a `dropdown`, `radio_group`, `multi_select`, or `checkbox_group` field needs options derived from selected-project JSON index files. A JSON options source must use `root.kind = "selected_project_root"` and exactly one source mode. Use exact-file mode with `sourcePathSegments` when the field should read one selected-project-relative JSON file such as `planning/Epics.index.json` or `implementation/epic-{workflow.epic_identity}-stories.index.json`. A source path segment may use lookup-only workflow-form placeholders such as `epic-{workflow.epic_identity}-stories.index.json`; runtime interpolates and validates each resolved segment before reading the JSON source.

Use discovered-files mode with `sourceFileDiscovery` when the field should aggregate options from every matching JSON source file in a selected-project folder, such as all `epic-{E}-stories.index.json` files under `implementation`. Set `sourceFileDiscovery.targetPathSegments` to the selected-project-relative folder, `namingPattern` to the matching filename pattern, `immediateChildrenOnly` and `sort` to the required discovery behavior, `itemsPath` to the array of index entries, `valueProperty` for stable option values, and labels or descriptions with direct item-property placeholders. Runtime concatenates discovered-file options in discovered file order and source-array order, rejects duplicate option values across the aggregate, and returns an empty option array when no files match.

Use `selectorDiscovery` only for filesystem discovery. Do not repurpose it to read JSON index content or to derive options from index entries.

For a confirmation-only panel that displays prescribed text and advances through a single click, use the panel's `promptMarkdown` for the user-authored message, set `fields: []`, set `allowedActions: ["submit"]`, and set the approved confirmation button text through `actionLabels.submit`. Do not add a `static_notice`, `markdown_display`, or other non-input field unless the source document explicitly provides that additional displayed text. A fieldless submit-only panel is valid and does not need filler content to render.

### Prerequisite Files

If a module requires prerequisite files from the selected project before model-driven work can begin, declare them in `WorkflowDefinition.prerequisiteFiles` and invoke them with the runtime-owned `resolve_prerequisite_files` decision action.

Prerequisite-file selection must not be implemented as a module-owned `selectorDiscovery` workflow form, and it must not mutate shared project-selection behavior. Shared project selection still chooses only the project folder; prerequisite resolution happens afterward inside `WorkflowRuntime`.

Each prerequisite declaration must include:

- `id`: the canonical prerequisite id, matching the `prerequisiteFiles` record key.
- `requirement`: `required` or `optional`.
- `projectSubfolderSegments`: the selected-project subfolder segments to scan.
- `match`: either an exact filename or a naming pattern.
- `producingWorkflowName`: the workflow that produces the prerequisite file.
- `workflowValueKey`: the declared workflow value key that receives the selected absolute path.
- `outputDocumentReference`: `none` or `module_document_builder`, depending on whether the module-owned document builder must render the persisted path into an output document.

When a user selects a prerequisite file, `resolve_prerequisite_files` persists the selected full absolute path to the declaration's `workflowValueKey`. If the workflow output document must reference that path, render the persisted workflow value through the module-owned document builder; do not recompute or rediscover the path in module prompt code.

Required prerequisite behavior is runtime-owned:

- No match: render a cannot-continue panel naming the producing workflow; do not proceed.
- One match: render a confirmation panel showing the file name and full absolute path; yes persists the path and continues.
- Multiple matches: render a required dropdown whose option values are full absolute paths and whose labels identify file names.
- User rejection: persist no path and render the cannot-continue panel.
- Cancel: persist no path and render the cannot-continue panel.

Optional prerequisite behavior is runtime-owned:

- No match: skip the prerequisite and continue without a cannot-continue panel.
- One match: render a non-required confirmation panel; yes persists the path, while no or no selection continues without persisting a path.
- Multiple matches: render a non-required dropdown whose option values are full absolute paths and whose labels identify file names.
- User rejection: persist no path and continue.
- Cancel: persist no path and continue.

Use the module decision action `move_project_file` for deterministic file lifecycle moves between folders under the selected project. The action should provide source and destination folder segments plus a `filenameWorkflowValueKey`; the runtime resolves the selected project root and performs the governed move.

Project setup creates `implementation/drafts`, `implementation/stories-backlog`, `implementation/stories-review`, and `implementation/stories-complete` under every workflow project. Future story lifecycle modules should use those folders rather than inventing parallel draft, backlog, review, or completed-story locations.

`implementation/epic-{E}-stories.index.json` is the canonical story inventory for an epic. AI agents must not author canonical story numbers or story filenames directly. Modules should expose runtime-owned story planning tools when story inventory changes are needed:

- `plan_story_artifacts` creates or expands primary story entries in `epic-{E}-stories.index.json`.
- `plan_remediation_story_artifact` appends the next remediation story entry under an existing target story.

Use backend-only `update_story_index_status` for governed runtime status updates to existing story index entries. Modules may route to it through runtime-owned decision actions, but it must not be included in model-facing tool schemas.

Use runtime-owned `resolve_existing_project_artifact` when a workflow already has a canonical artifact identity in workflow values and needs runtime to resolve an existing selected-project artifact path. This action is for existing files only: runtime normalizes the identity through artifact-family rules, derives the canonical filename from `WORKFLOW_ARTIFACT_FAMILY_REGISTRY`, resolves the declared selected-project-relative folder, enforces workspace path-policy checks, requires the file to exist, persists the resolved absolute path, and re-enters decision-tree evaluation. Modules must not use direct `fs` reads, `stat`, `access`, custom filename builders, or custom selected-project path construction for this case.

`resolve_existing_project_artifact` routes must declare the artifact family, the workflow value key containing the artifact identity, the selected-project-relative `projectSubfolderSegments`, the output workflow value key that receives the absolute path, and the exact terminal error message to show when resolution fails. If a user choice can refer to either a primary story or a remediation story, the module must route through separate decision-tree branches so each branch declares the exact `WorkflowArtifactFamily.Story` or `WorkflowArtifactFamily.RemediationStory` contract.

Use runtime-owned `validate_story_index_entry` when a workflow must verify an existing selected story or remediation story entry in `implementation/epic-{E}-stories.index.json` before model-driven work, deterministic lifecycle actions, or project file moves. Runtime resolves the canonical story index path from the selected project and story identity, requires the persisted index path to match, enforces workspace path-policy checks before reading, parses through the canonical story-index parser, verifies the selected entry exists, and validates the entry's `story_type`, `story_file_name`, and `status`.

`validate_story_index_entry` routes must declare workflow value keys for the story index path, story identity, and story filename; the required story type; the required status; and exact terminal error messages for missing or malformed index, missing entry, and invalid entry. This action does not mutate the story index; status changes still use backend-only `update_story_index_status`.

`resolve_existing_project_artifact` and `validate_story_index_entry` are runtime-only decision actions. They must never be projected in model-facing tool schemas, response-tool schemas, or prompt-visible backend tool dictionaries. They do not replace prerequisite file selection, `selectorDiscovery`, JSON-backed form options, `plan_story_artifacts`, `plan_remediation_story_artifact`, `generate_story_files`, `update_story_index_status`, or `move_project_file`.

### Deterministic Procedures

Use deterministic procedures for code-owned state changes that should not be AI-callable tools.

The brainstorming random technique selector is the reference pattern:

- The technique registry is module-owned data.
- The random selector runs through `run_deterministic_procedure`.
- It persists `random_technique_candidate` and retry state through workflow values.
- It re-enters decision-tree evaluation.
- It is not exposed as a backend tool.

Use a backend tool only when the AI must call it during model-driven work.

### Prompt Construction

Workflow prompt data has two places:

- workflow-level identity, description, persona, and checklist context
- current step details in the input payload

Each workflow module must define workflow-level and per-step prompt content.

Prompt templates may reference workflow values only with `{workflow.<workflowValueKey>}` tokens matching declared `workflowValueKeys`. The shared `WorkflowRuntime` prompt-template renderer validates and renders those tokens before prompt projection. Workflow modules must not use local `replace`, `replaceAll`, regex, or hand-built substitution for workflow-value references.

The prompt and tool schema must match. If the prompt says the AI may call a tool, that tool must be in the current step schema. If the schema does not include the tool, the prompt must not instruct or imply that it is available.

Shared prompt fragments are acceptable only when the final generated prompt for each variant is reviewable and tested. Do not split prompt construction in a way that hides the final ordering or makes requirements hard to compare against runtime output.

When the user-authored source document provides step prompt wording, `buildPromptSource(...)` must preserve that wording exactly except for converting workflow-value references into `{workflow.<workflowValueKey>}` prompt-template tokens and applying explicitly approved runtime-only substitutions. Tests must not assert exact editable prompt prose. Protect prompt behavior with shape and invariant assertions: prompt output exists when required, required workflow values are rendered non-empty, prompt-template tokens required by the requirements are materialized, forbidden legacy text is absent, current step details are projected in the correct payload location, and the projected tool schema matches the prompt's tool references.

### Tool Schema Ownership

Every workflow module must have a canonical tool-schema file:

```text
src/core/task/workflow-runtime/workflow-modules/{workflowId}/{workflowId}ToolSchemas.ts
```

All model-visible workflow tool-schema builders live there.

`{workflowId}Workflow.ts` must not define:

- inline `ClineToolSpec` objects
- inline tool arrays
- local tool-schema builder bodies
- fallback empty schemas

Each `WorkflowStepDefinition.buildToolSchema(...)` must delegate directly to a named export from the tool-schema file.

The returned `readonly ClineToolSpec[]` is the complete model-visible workflow tool surface for that turn. It is not additive with default workflow tools, and the legacy contextual tool matrix must not participate.

For normal shared Cline tools, the module-owned tool-schema file owns selection and ordering, but it must reuse the registered shared/default tool specs. Do not hand-build or copy local `ClineToolSpec` objects for normal shared tools such as `read_file`, `read_file_range`, `list_files`, `search_files`, `list_code_definition_names`, `execute_command`, `send_user_message`, `attempt_completion`, `apply_patch`, `write_to_file`, `ask_followup_question`, or `use_subagents`.

Use this pattern for shared/default tools:

```ts
import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const EXAMPLE_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5

function resolveExampleSharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolId, EXAMPLE_TOOL_SCHEMA_VARIANT)
	if (tool === undefined) {
		throw new Error(`Missing shared/default tool schema for ${toolId}.`)
	}

	return tool.config
}

const EXAMPLE_STEP_2_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ASK,
	ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
]

export function buildExampleStep2ToolSchemas(): readonly ClineToolSpec[] {
	return EXAMPLE_STEP_2_TOOL_IDS.map((toolId) => resolveExampleSharedToolSpec(toolId))
}
```

Define local `ClineToolSpec` objects only for workflow-specific or domain-specific backend tools that do not have registered shared/default specs and are explicitly authorized by the workflow requirements.

Do not include `archive_workflow_artifact`, `delete_workflow_artifact`, or `move_workflow_project_file` in module tool schemas. Those are backend-only runtime-owned tools. `move_workflow_project_file` must not be model-facing unless a future requirement explicitly approves projection.

Use this translation process for each model-driven step:

1. Read the current workflow source prompt for the step.
2. Identify the actual actions the AI must perform in the runtime workflow step.
3. Translate those actions into exact ordered `ClineDefaultTool` ids in `{workflowId}ToolSchemas.ts`, then resolve normal shared tools through the registered shared/default specs. Select tools to surface for that turn using the following guidelines:
    - write/ update files: apply_patch, write_to_file, read_file, read_file_range (the AI agent needs to be able to read files before/after writing to ensure their write action is executed correctly)
    - read existing files: list_files, search_files, list_code_definition_names, read_file, read_file_range
    - activate subagents: use_subagents
    - search the web: web_search, web_fetch
    - persist values for workflow session keys: set_workflow_values
    - run local CLI commands: execute_command
    - use connected MCP capabilities: use_mcp_tool (for calling tools provided by a connected MCP server), access_mcp_resource (when the step requires reading mcp-hosted resources), load_mcp_documentation (when the step requires mcp documentation discovery)
    - provide an array of options to the user to select from: ask_followup_question
    - send a final workflow recap/message to the user: attempt_completion
    - progress the workflow step (only when prescribed): workflow_progress_request
    - send a general message to the user: send_user_message
5. Add workflow-specific backend tools only when normal shared tools cannot safely express the action.
6. Add user-facing response or delivery tools appropriate for the step. send_user_message must be included in every model-facing step.
7. Exclude placeholder-era tools and runtime-owned deterministic tools that are not model-facing.
8. Add tests that assert the exact tool names returned for the step.

If the prompt and available tool set do not clearly imply the exact schema, stop and ask the user for input.

### Response Tools

Include response or delivery tools deliberately.

Do not expose only internal/backend tools in a model-facing step. A model-driven step needs at least one governed way to talk to the user or complete the turn.

### Specialized Backend Workflow Tools

Add a specialized backend workflow tool only when a normal shared tool is insufficient.

For example, brainstorming needed `append_brainstorming_selected_technique` because `set_workflow_values` replacement semantics were unsafe for multi-technique append/de-dupe behavior.

When adding a specialized backend workflow tool, update all relevant surfaces:

- `src/shared/tools.ts`
- `READ_ONLY_TOOLS`, when the tool is truly read-only
- `src/core/task/tools/backendWorkflowToolContracts.ts`
- handler under `src/core/task/tools/handlers/`
- `src/core/task/tools/ToolExecutorCoordinator.ts`
- `src/core/task/tools/response/ResponseToolRegistry.ts`
- assistant-message parameter parsing in `src/core/assistant-message/index.ts`, if new parameter names are introduced
- handler tests
- module tool-schema builders
- prompt integration tests

Specialized mutation tools must write through runtime workflow-value seams. They must not bypass `WorkflowRuntime.applyWorkflowValueWrites(...)`.

## Recommended Module File Layout

Use this layout for each workflow module:

```text
src/core/task/workflow-runtime/workflow-modules/{workflowId}/
  {workflowId}Workflow.ts
  {workflowId}ToolSchemas.ts
  {workflowId}Document.ts              # if the workflow owns document rendering helpers
  {workflowId}Registry.ts              # if the workflow owns static module data
  index.ts
  __tests__/
    {workflowId}Workflow.test.ts
    {workflowId}ToolSchemas.test.ts
    {workflowId}Document.test.ts
    {workflowId}Registry.test.ts
```

Only create files that the workflow actually needs. Do not add a registry or document helper just because brainstorming has one.

## Workflow Definition Pattern

A shipped workflow definition should follow this broad shape:

```ts
export const exampleWorkflowDefinition: WorkflowDefinition = {
  name: "example",
  displayName: EXAMPLE_WORKFLOW_DISPLAY_NAME,
  description: EXAMPLE_WORKFLOW_DESCRIPTION,
  slashCommandName: "example",
  useSkillName: "example",
  persona: EXAMPLE_WORKFLOW_PERSONA,
  projectSubfolder: "discovery",
  workflowValueKeys: EXAMPLE_WORKFLOW_VALUE_KEYS,
  entryProjectValueKeys: {
    projectMode: ExampleWorkflowValueKey.ProjectMode,
    projectTitle: ExampleWorkflowValueKey.ProjectTitle,
    projectFolderName: ExampleWorkflowValueKey.ProjectFolderName,
  },
  entryPanel: {
    promptMarkdown: EXAMPLE_WORKFLOW_DESCRIPTION,
  },
  artifacts: {
    example_artifact: {
      id: "example_artifact",
      family: WorkflowArtifactFamily.Example,
      intentMode: "new",
      parentIdentitySource: undefined,
      targetIdentitySource: undefined,
      outputValueKeys: {
        projectTitle: ExampleWorkflowValueKey.ProjectTitle,
        projectFolderName: ExampleWorkflowValueKey.ProjectFolderName,
        artifactFamily: ExampleWorkflowValueKey.OutputArtifactFamily,
        artifactIdentity: ExampleWorkflowValueKey.OutputArtifactIdentity,
        artifactFilename: ExampleWorkflowValueKey.OutputArtifactFilename,
        artifactRelativePath: ExampleWorkflowValueKey.OutputArtifactRelativePath,
        artifactAbsolutePath: ExampleWorkflowValueKey.OutputFile,
        parentIdentity: undefined,
        targetIdentity: undefined,
      },
    },
  },
  workflowForms: {
    "step-1-setup-form": buildStep1SetupWorkflowForm(),
  },
  steps: {
    "step-1": createStepDefinition({
      stepNumber: 1,
      checklistLabel: "Gather Inputs",
      decisionTree: buildStep1DecisionTree(),
      buildToolSchema: buildExampleStep1ToolSchemas,
    }),
    "step-2": createStepDefinition({
      stepNumber: 2,
      checklistLabel: "Do Model Work",
      decisionTree: buildStep2DecisionTree(),
      buildPromptSource: buildStep2PromptSource,
      buildToolSchema: buildExampleStep2ToolSchemas,
    }),
  },
}
```

The helper `createStepDefinition(...)` should require `buildToolSchema`. It may default `buildPromptSource` to an empty prompt source for runtime-only steps, but it must not default tool schema locally.

## Tool Schema Pattern

For runtime-only steps:

```ts
export function buildExampleStep1ToolSchemas(): readonly ClineToolSpec[] {
  return []
}
```

For model-driven steps:

```ts
const EXAMPLE_STEP_2_TOOL_IDS: readonly ClineDefaultTool[] = [
  ClineDefaultTool.FILE_READ,
  ClineDefaultTool.APPLY_PATCH,
  ClineDefaultTool.SEND_USER_MESSAGE,
  ClineDefaultTool.ASK,
  ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
]

export function buildExampleStep2ToolSchemas(): readonly ClineToolSpec[] {
  return EXAMPLE_STEP_2_TOOL_IDS.map((toolId) => resolveExampleSharedToolSpec(toolId))
}
```

When a model-driven step needs a workflow-specific backend tool that has no shared/default spec, define a local builder for that tool only and include it directly in the returned array alongside resolved shared/default specs.

Keep the tool list exact. If a step prompt says the AI can switch methods, inspect documents, edit an artifact, ask the user a question, and request progression, the schema must include exactly the tools needed for those actions.

Do not expose a tool merely because another workflow used it. Tool exposure is per-step and per-workflow.

## Document Builder Pattern

Use document builders for deterministic document creation or deterministic full-document refreshes.

Good uses:

- initial artifact shell
- form-submitted setup values
- deterministic selected approach or selected technique values before model-driven work

Bad uses:

- interactive agent-authored edits
- incremental append-like behavior
- line or section replacement by the model

For interactive edits, use `read_file` plus `apply_patch`.

Document builders should:

- export heading constants when headings are product-owned conventions
- render JSON-safe workflow values deterministically
- validate object fields with type narrowing
- avoid runtime file reads from legacy templates
- preserve unsupported or malformed values by omission or explicit failure, according to requirements

## Decision Tree Patterns

### Runtime-Driven Setup

Typical singleton artifact startup flow:

1. Wait for `entry_artifact_resolution_completed`.
2. If the active artifact resolution has `creationRequired: true`, run `allocate_artifact`.
3. After allocation succeeds, run the initial `build_workflow_document`.
4. If the active artifact resolution has `creationRequired: false`, skip allocation and initial document build.
5. Route both paths into the same artifact-ready branch.
6. Continue with setup forms, deterministic document updates, `transition_step`, or `project_prompt`.

Each tool-backed operation should have explicit success and failure routes. Failure routes should go to retry or `terminal_error`; they should not silently no-op.

### Deterministic State Mutation

Use `run_deterministic_procedure` when code owns the decision or state mutation.

The procedure should return either:

- `{ kind: "succeeded"; workflowValueWrites }`
- `{ kind: "failed"; errorMessage }`

The runtime applies successful writes and resumes next-action evaluation. The module should not model deterministic decisions as AI-callable tools unless the AI truly needs to initiate them.

### Model-Driven Work

Use `project_prompt` to hand control to the AI agent.

For a progress-gated step, the common pattern is:

1. entry branch emits `project_prompt`
2. following branch waits for `workflow_progress_request_confirmed`
3. confirmed route transitions to the next step
4. denied route returns to `project_prompt`

For final delivery, expose `attempt_completion` only when the current step may complete or hand off final delivery. After successful `attempt_completion`, the runtime emits `attempt_completion_succeeded`. The module decision tree must route that event explicitly to `complete_workflow`, a step transition, deterministic or tool-backed follow-up work, or `no_op`.

For model-called workflow-projected tools, route tool completion through `model_tool_succeeded` and `model_tool_failed`. These events carry the canonical tool name and are for tools the model called from the active step's projected schema.

Reserve `tool_backed_operation_succeeded` and `tool_backed_operation_failed` for runtime-selected deterministic tool-backed actions. Those events use `sourceRoute` correlation and should not be used for model-called tool lifecycle routing.

Dedicated workflow events take precedence over generic model-tool lifecycle events. Tools that emit events such as `workflow_values_persisted`, `workflow_progress_request_confirmed`, `workflow_progress_request_denied`, or `attempt_completion_succeeded` should route through those dedicated events instead of `model_tool_succeeded` or `model_tool_failed`.

## Registration

Export the workflow module from its local `index.ts`, then register it in `WorkflowRegistry.ts`.

The shipped workflow registry is keyed by:

- canonical workflow `name`
- `slashCommandName`
- `useSkillName`

Do not preserve markdown filename identities such as `brainstorming.md` as activation aliases unless requirements explicitly say to.

## Testing Checklist

### Module Tests

Add tests for:

- workflow identity and metadata
- persona fields
- workflow value inventory
- entry project value keys
- artifact definition and output value mapping
- workflow forms, panels, transitions, and stale clearing
- deterministic procedures
- decision-tree route structure
- singleton artifact route for `entry_artifact_resolution_completed` with `creationRequired: true`
- singleton artifact route for `entry_artifact_resolution_completed` with `creationRequired: false`
- prompt source shape and non-empty required rendering
- exact tool-schema outputs
- absence of archive/delete workflow artifact tools from model-facing schemas
- absence of retired tools

### Data And Document Tests

If the module has code-owned data, test:

- row count or inventory count
- category ordering
- lookup by id/name
- filtering
- deterministic random or selection behavior
- no runtime dependency on source CSV/markdown/BMAD files

If the module has document builders, test:

- heading order
- empty initial document shell
- rendering of form values
- rendering of arrays/objects
- placeholder behavior, if any
- omission or rejection of unsupported shapes

### Handler Tests

For new backend tools, test:

- active workflow gating
- missing or invalid parameters
- registry/data validation
- mutation semantics
- de-dupe or merge semantics
- workflowRuntime seam usage
- queued next actions, when relevant
- read-only behavior for read-only tools

### Runtime Tests

Add runtime coverage when the module depends on runtime behavior:

- activation through the shared entry form
- focus-chain/checklist projection
- first next action after project selection
- artifact allocation and output value mapping
- runtime-owned document build actions
- workflow completion through explicit `attempt_completion_succeeded` routing

### Prompt Integration Tests

Add prompt integration coverage proving:

- workflow placeholders are not leaked into system prompt templates
- current step details appear in input payload, not system instructions
- runtime-projected workflow schema is the exact native tool surface
- response-tool guidance matches the projected schema
- workflow-specific backend tools appear only when the active step schema includes them
- backend-only runtime tools such as `build_workflow_document` are not statically exposed

## Validation Commands

Use targeted validation during implementation:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/{workflowId}/__tests__/{workflowId}Workflow.test.ts src/core/task/workflow-runtime/workflow-modules/{workflowId}/__tests__/{workflowId}ToolSchemas.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
```

Add focused `rg` checks for known regressions. For example, the brainstorming module validates that model-facing schemas do not contain `build_workflow_document` or `set_workflow_values`:

```bash
rg -n "build_workflow_document|set_workflow_values" src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingToolSchemas.ts
```

Also run module-specific negative checks when retiring legacy sources:

```bash
rg -n "_bmad|analyst\\.md|readFile|fs/promises|fs" src/core/task/workflow-runtime/workflow-modules/{workflowId}
```

## Action Plan Guidance

Use `docs/action-plan-guide.md` for all module build action plans.

Practical lessons from brainstorming:

- If requirements are ambiguous, stop and update requirements first.
- Do not let an action plan prescribe an intermediate shape that later subtasks replace.
- Do not let allowed-files lists block required fixture or integration-test updates.
- Put completed behavior into requirements before prescribing code.
- Include validation tasks in the same phase that changes the relevant runtime surface.
- When a dev agent reports an allowed-files blocker, inspect the actual code and test surface before adding files to the plan.

For new modules, prefer phases like:

1. Runtime support, if needed.
2. Module-owned data and document helpers.
3. Shared backend tools, if needed.
4. Workflow definition and registration.
5. Prompt and tool projection verification.
6. Cleanup and compatibility checks.
7. Final validation and packaged smoke testing.

## Common Failure Modes

Avoid these patterns:

- Loading persona, prompt, method inventory, or template content from BMAD or old workflow markdown files at runtime.
- Treating `build_workflow_document` as an AI editing tool.
- Exposing only internal/backend tools on a model-driven step.
- Leaving `buildToolSchema` as an inline array or local function in `{workflowId}Workflow.ts`.
- Returning an empty schema from a model-driven step.
- Letting prompt text mention tools that are not exposed in that step schema.
- Letting response-tool guidance drift from the projected schema.
- Using `set_workflow_values` as a general scratchpad when the document is the source of truth.
- Creating separate forms for panels that belong to one logical form flow.
- Preserving markdown filename activation aliases after moving to canonical workflow names.
- Copying the legacy contextual tool matrix literally instead of translating its tool-category intent into explicit module-owned schemas.
- Starting singleton artifact workflows with `allocate_artifact` before handling `entry_artifact_resolution_completed`.
- Rebuilding an existing singleton artifact after the user chose to continue the existing document.
- Exposing `archive_workflow_artifact` or `delete_workflow_artifact` to the AI agent.

## Smoke Test Checklist

After tests pass, package and run the workflow manually.

For an interactive workflow, verify:

- activation works through the intended entry path
- the shared entry form renders
- project folder and artifact are created in the expected location
- every workflow form panel appears in the expected order
- conditional required fields re-render cleanly rather than failing prematurely
- runtime-owned setup actions complete without freezing the UI
- the first model turn receives the correct input payload
- the native tool schema contains exactly the expected active-step tools
- response-tool guidance matches the schema
- the AI can perform the expected document reads/edits
- progress confirmation advances the workflow
- final delivery follows the module's explicit `attempt_completion_succeeded` route

When the packaged run differs from tests, treat the packaged output as evidence. Update requirements and tests to cover the observed gap before changing implementation.
