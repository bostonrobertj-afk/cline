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
9. Run unit validation, typecheck, lint, package, and a real workflow smoke test.

Do not start from code. The requirements must own the final behavior, especially prompt text, step progression, artifact behavior, and model-visible tool schemas.

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

Use the canonical workflow-to-persona-to-project-subfolder mapping in `docs/workflows/workflow-runtime/requirements.md` to select the workflow persona and project subfolder. That mapping is the authority for which persona a workflow uses.

Use `_bmad/bmm/agents/` only as migration source material while building the module. Derive the structured `WorkflowPersonaDefinition` fields from the mapped persona source file, then copy the resulting data into module-owned constants. The runtime workflow module must not read BMAD files at activation time, prompt-projection time, or step execution time.

For the current in-scope mappings, the BMAD migration source files are:

| Requirements persona | BMAD source file |
| --- | --- |
| `analyst` | `_bmad/bmm/agents/analyst.md` |
| `architect` | `_bmad/bmm/agents/architect.md` |
| `developer` | `_bmad/bmm/agents/dev.md` |
| `product-manager` | `_bmad/bmm/agents/pm.md` |
| `quality-control` | `_bmad/bmm/agents/quality-control.md` |
| `scrum-master` | `_bmad/bmm/agents/sm.md` |

Map BMAD source content into `WorkflowPersonaDefinition` as follows:

| WorkflowPersonaDefinition field | Source |
| --- | --- |
| `name` | BMAD agent `name` attribute when present; otherwise the persona display name prescribed by requirements |
| `role` | BMAD `<role>` text |
| `identity` | BMAD `<identity>` text |
| `capabilities` | BMAD agent `capabilities` attribute split into trimmed entries |
| `communicationStyle` | BMAD `<communication_style>` text |
| `principles` | BMAD `<principles>` content split into explicit principle strings |

If the requirements mapping, BMAD source file, or derived persona fields conflict or are incomplete, stop and tighten the requirements or migration source before implementing the workflow module. Do not invent persona data ad hoc inside the action plan or implementation.

In the brainstorming module, `displayName`, `description`, and `persona` live as constants in `brainstormingWorkflow.ts`, and the entry panel reuses `brainstormingWorkflowDefinition.description`.

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

If it needs a new artifact family, that is foundational/runtime work, not module-local code. For brainstorming, the singleton `brainstorming.md` artifact required `WorkflowArtifactFamily.BrainstormingSession` and runtime family support before the module could reference it.

Module artifact definitions should reference runtime-owned artifact families and map `outputValueKeys` into module workflow values. The module should not invent filename rules, numbering rules, path construction, or discovery rules that belong to the runtime artifact-family registry.

For model-facing steps, persist the resolved artifact path into a workflow value such as `output_file`, then render that value into prompts. The AI should not recompute the artifact path.

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

The brainstorming module uses `build_workflow_document` for deterministic Step 1 and Step 2 document population, then uses `read_file` and `apply_patch` for Step 3 and Step 4 interactive document work.

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
| Model-driven | `project_prompt`, then event routes such as `workflow_progress_request_confirmed` or final delivery | non-empty exported builder |

Do not let a step route to `project_prompt` while exposing an empty schema.

### Workflow Forms

Use workflow forms for structured user input before model-driven work.

Rules of thumb:

- Use one multi-panel form for one logical input flow.
- Put panel sequencing, conditional branches, back navigation, and stale value clearing inside the form definition.
- Use `workflowValueKey` only when the submitted value must persist beyond form-local state.
- Use `staleValueKeysToClear`, `resetValueKeysOnChange`, and back-panel stale clearing to prevent stale dependent values.
- Do not split a single form flow into multiple workflow forms unless requirements explicitly demand it.

The brainstorming Step 2 form is the reference pattern: approach selection, category selection, technique selection, and random confirmation are all one form with conditional panels.

### Prerequisite Files

If a module requires a prerequisite file from the selected project before model-driven work can begin, make that prerequisite selection a module-owned Step 1 workflow form after shared project selection. The form field must discover files from the selected project, with `selectorDiscovery.root.kind: "selected_project_root"`, so the runtime-owned project-selection root remains the authority for file discovery.

When no valid prerequisite file is available, the form copy or validation message must identify the workflow that produces the prerequisite by workflow name. Do not leave the user with a generic missing-file error.

Use the module decision action `move_project_file` for deterministic file lifecycle moves between folders under the selected project. The action should provide source and destination folder segments plus a `filenameWorkflowValueKey`; the runtime resolves the selected project root and performs the governed move.

Project setup creates `implementation/stories-backlog`, `implementation/stories-review`, and `implementation/stories-complete` under every workflow project. Future story lifecycle modules should use those folders rather than inventing parallel backlog, review, or completed-story locations.

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

Current step instructions belong in `buildPromptSource(...).currentStepInstructions`, not workflow system instructions. Do not put current step details into persona fields or workflow-level system instructions.

Prompt builders may interpolate workflow values only through the runtime prompt builder input, such as `input.renderWorkflowValue(...)`. For paths like `output_file`, render the persisted value rather than reconstructing it.

The prompt and tool schema must match. If the prompt says the AI may call a tool, that tool must be in the current step schema. If the schema does not include the tool, the prompt must not instruct or imply that it is available.

Shared prompt fragments are acceptable only when the final generated prompt for each variant is reviewable and tested. Do not split prompt construction in a way that hides the final ordering or makes requirements hard to compare against runtime output.

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

The deleted `contextualToolMatrix.ts` is reference material only. Use `docs/workflows/workflow-runtime/workflow-modules/legacy-tool-matrix.md` as a loose migration reference for historical tool-category intent, not as an implementation source and not as a 1:1 step mapping.

Do not include `archive_workflow_artifact`, `delete_workflow_artifact`, or `move_workflow_project_file` in module tool schemas. Those are backend-only runtime-owned tools. `move_workflow_project_file` must not be model-facing unless a future requirement explicitly approves projection.

Use this translation process for each model-driven step:

1. Read the current workflow source prompt for the step.
2. Compare it to the legacy matrix entry for the old markdown workflow step, if one exists.
3. Identify the actual actions the AI must perform in the runtime workflow step.
4. Translate those actions into exact `ClineDefaultTool` schema builders in `{workflowId}ToolSchemas.ts`.
5. Add workflow-specific backend tools only when normal shared tools cannot safely express the action.
6. Add user-facing response or delivery tools required by the step.
7. Exclude placeholder-era tools and runtime-owned deterministic tools that are not model-facing.
8. Add tests that assert the exact tool names returned for the step.

Do not copy legacy bundle names literally. For example, old `DOC_WRITE` intent should become the exact governed file-edit tools needed by the runtime prompt, such as `apply_patch`, not `build_workflow_document`. Old placeholder-write intent should not become `set_workflow_values` unless the step requirements explicitly make workflow values AI-writable for that turn.

If the prompt, legacy matrix, and available tool set do not clearly imply the exact schema, stop and tighten the module requirements before writing code.

### Response Tools

Include response or delivery tools deliberately.

Examples:

- Use `send_user_message` for ordinary user-visible messages.
- Use `ask_followup_question` when the next thing needed is user input.
- Use `workflow_progress_request` when the workflow step needs explicit confirmation to advance.
- Use `attempt_completion` only for final delivery or completion-like turns.

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
export function buildExampleStep2ToolSchemas(): readonly ClineToolSpec[] {
  return [
    buildExampleReadFileToolSchema(),
    buildExampleApplyPatchToolSchema(),
    buildExampleSendUserMessageToolSchema(),
    buildExampleAskFollowupQuestionToolSchema(),
    buildExampleWorkflowProgressRequestToolSchema(),
  ]
}
```

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

For final delivery, expose `attempt_completion` and rely on generic workflow teardown after successful final delivery.

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
- prompt source output
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
- workflow completion and teardown

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
- final delivery tears down workflow state

When the packaged run differs from tests, treat the packaged output as evidence. Update requirements and tests to cover the observed gap before changing implementation.
