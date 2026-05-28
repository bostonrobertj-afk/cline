# Quick Dev Workflow Module Action Plan

## FrontMatter

- Read this plan from top to bottom before making any changes.
- Read each task and subtask in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.
  - After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.

## Scope

Build and register the product-owned `quick-dev` workflow module described by [quick-dev-requirements.md](./quick-dev-requirements.md).

Quick Dev consumes the required `quick-spec` workflow output at `planning/quick-spec.md`, stores its selected absolute path in workflow value `spec_file`, derives `spec_file_filename: "quick-spec.md"`, asks the agent to review and confirm the first incomplete implementation phase, asks the agent to implement the confirmed phase, then deterministically relocates `planning/quick-spec.md` to `review/quick-spec.md`.

Approved implementation decisions derived from the requirements and module build guide:

- Use `WorkflowDefinition.prerequisiteFiles` plus `resolve_prerequisite_files` for the required Quick Spec file.
- Use `run_deterministic_procedure` to derive and validate `spec_file_filename`.
- Use `project_prompt` for Step 1 and Step 2.
- Use `workflow_progress_request_confirmed` and `workflow_progress_request_denied` routes for Step 1 progression.
- Use `attempt_completion_succeeded` to transition Step 2 to Step 3.
- Use deterministic `move_project_file` routing in Step 3; do not expose `move_workflow_project_file` to the model.
- Use module-owned tool schema builders in `quickDevToolSchemas.ts` and shared/default `ClineToolSet` specs for normal Cline tools.
- Do not create a document builder, artifact definition, workflow form, backend tool, registry data file, or workflow-owned output document for Quick Dev.

## Scope Boundary

- Do not edit `docs/workflows/workflow-runtime/requirements.md`.
- Do not edit `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`.
- Do not edit `docs/action-plan-guide.md`.
- Do not edit `docs/workflows/workflow-runtime/workflow-modules/quick-dev/quick-dev-requirements.md`; scope-diff checks may report it as the pre-existing backing requirements document for this plan.
- Do not edit `/Users/robertboston/Documents/Cline/Workflows/quick-dev.md`.
- Do not add a runtime dependency on `/Users/robertboston/Documents/Cline/Workflows/quick-dev.md`, `.cline/workflow-config.yaml`, BMAD assets, or legacy workflow markdown.
- Do not register `quick-dev.md` as a workflow name, slash-command alias, or use-skill alias.
- Do not expose `ask_followup_question`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `use_subagents`, `use_skill`, web tools, MCP tools, or artifact lifecycle tools in any Quick Dev model-facing schema.
- Do not add exact full-prose snapshot assertions for editable Step 1 or Step 2 prompt text. Use prompt shape, materialized workflow-value, forbidden-marker, response-tool, and projected-tool invariants.

## Verified Live Contracts

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev` does not exist and must be created.
- `ClineDefaultTool.FILE_NEW` is the live enum member whose tool name is `write_to_file`.
- `ClineDefaultTool.BASH` is the live enum member whose tool name is `execute_command`.
- `WorkflowDefinition.prerequisiteFiles` supports `match: { kind: "exact_filename", filename: string }`.
- `WorkflowDecisionAction` supports `run_deterministic_procedure`, `resolve_prerequisite_files`, `transition_step`, `project_prompt`, `move_project_file`, `terminal_error`, and `complete_workflow`.
- `move_project_file` requires `sourceFolderSegments`, `destinationFolderSegments`, and `filenameWorkflowValueKey`; it reads the filename workflow value and resolves source/destination paths under the selected project root.
- Runtime-only steps still need named exported tool-schema builders that return `[]`; do not inline `() => []` in `quickDevWorkflow.ts`.
- `src/core/task/workflow-runtime/WorkflowRegistry.ts` is the shipped workflow registry and is keyed by workflow `name`, `slashCommandName`, and `useSkillName`.
- `src/test/slash-commands.test.ts` already has shipped-workflow slash command coverage for `quick-spec`; this plan adds the analogous `quick-dev` assertion.
- `src/core/prompts/system-prompt/__tests__/integration.test.ts` owns prompt/tool projection coverage for shipped workflow modules.

## Known Issues / Risks / Technical Debt

- `npm run check-types` may fail before TypeScript checking if generated proto files are missing or host probing fails. If that happens, run `npm run protos`, then rerun the exact blocked `npm run check-types` command before treating the failure as a code defect.
- `npm run package` starts by running `npm run check-types`; if it fails before packaging because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run package` before treating the failure as a code defect.
- Quick Dev is the first module that consumes `quick-spec.md` as a prerequisite and then moves that same file from `planning` to `review`. The plan therefore prescribes focused route tests for the prerequisite value, derived filename, and move action.

## Tasks / Subtasks

### Phase 1: Quick Dev Tool Schemas

Relevant requirements: Step 1 Tool Schema, Step 2 Tool Schema, Step 3 Routing, Prompt Projection Requirements, Test Requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

Pause for QA after Phase 1 validation passes. Do not start Phase 2 until QA passes.

[x] Task 1: Add `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts` with Quick Dev shared/default tool schema builders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 1.1: Create `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts` with imports exactly: `import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"`, `import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"`, `import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"`, `import { ModelFamily } from "@/shared/prompts"`, and `import { ClineDefaultTool } from "@/shared/tools"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 1.2: In `quickDevToolSchemas.ts`, add `const QUICK_DEV_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 1.3: In `quickDevToolSchemas.ts`, add `export const QUICK_DEV_STEP_1_TOOL_IDS: readonly ClineDefaultTool[] = [ClineDefaultTool.BASH, ClineDefaultTool.LIST_FILES, ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_CODE_DEF, ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_READ_RANGE, ClineDefaultTool.APPLY_PATCH, ClineDefaultTool.FILE_NEW, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 1.4: In `quickDevToolSchemas.ts`, add `export const QUICK_DEV_STEP_2_TOOL_IDS: readonly ClineDefaultTool[] = [ClineDefaultTool.BASH, ClineDefaultTool.LIST_FILES, ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_CODE_DEF, ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_READ_RANGE, ClineDefaultTool.APPLY_PATCH, ClineDefaultTool.FILE_NEW, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.ATTEMPT]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 1.5: In `quickDevToolSchemas.ts`, add `function resolveQuickDevSharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec` that calls `registerClineToolSets()`, assigns `const tool = ClineToolSet.getToolByNameWithFallback(toolId, QUICK_DEV_TOOL_SCHEMA_VARIANT)`, throws `new Error(\`Missing shared/default tool schema for ${toolId}.\`)` when `tool === undefined`, and returns `tool.config`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 1.6: In `quickDevToolSchemas.ts`, add `export function buildQuickDevStep1ToolSchemas(): readonly ClineToolSpec[]` returning `QUICK_DEV_STEP_1_TOOL_IDS.map((toolId) => resolveQuickDevSharedToolSpec(toolId))`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 1.7: In `quickDevToolSchemas.ts`, add `export function buildQuickDevStep2ToolSchemas(): readonly ClineToolSpec[]` returning `QUICK_DEV_STEP_2_TOOL_IDS.map((toolId) => resolveQuickDevSharedToolSpec(toolId))`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 1.8: In `quickDevToolSchemas.ts`, add `export function buildQuickDevStep3ToolSchemas(): readonly ClineToolSpec[]` returning `[]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[x] Task 2: Add `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts` with focused tool schema tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.1: Create `quickDevToolSchemas.test.ts` with imports exactly: `import { expect } from "chai"`, `import { describe, it } from "mocha"`, `import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"`, `import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"`, `import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"`, `import { ModelFamily } from "@/shared/prompts"`, `import { ClineDefaultTool } from "@/shared/tools"`, and imports for `buildQuickDevStep1ToolSchemas`, `buildQuickDevStep2ToolSchemas`, `buildQuickDevStep3ToolSchemas`, `QUICK_DEV_STEP_1_TOOL_IDS`, and `QUICK_DEV_STEP_2_TOOL_IDS` from `../quickDevToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.2: In `quickDevToolSchemas.test.ts`, add `const STEP_1_TOOL_NAMES: readonly string[] = ["execute_command", "list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "workflow_progress_request"]` and `const STEP_2_TOOL_NAMES: readonly string[] = ["execute_command", "list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "attempt_completion"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.3: In `quickDevToolSchemas.test.ts`, add `const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = ["ask_followup_question", "set_workflow_values", "build_workflow_document", "create_workflow_artifact", "archive_workflow_artifact", "delete_workflow_artifact", "move_workflow_project_file", "use_subagents", "use_skill", "web_search", "web_fetch", "browser_action", "use_mcp_tool", "access_mcp_resource", "load_mcp_documentation", "plan_story_artifacts", "plan_remediation_story_artifact", "generate_story_files", "update_story_index_status"]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.4: In `quickDevToolSchemas.test.ts`, add `function schemaNames(schemas: readonly ClineToolSpec[]): readonly string[]` returning `schemas.map((schema) => schema.name)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.5: In `quickDevToolSchemas.test.ts`, add `function expectedSharedToolSpecs(toolIds: readonly ClineDefaultTool[]): readonly ClineToolSpec[]` that calls `registerClineToolSets()`, maps `toolIds`, assigns `const tool = ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)`, throws `new Error(\`Missing shared/default tool schema for ${toolId}.\`)` when `tool === undefined`, and returns `tool.config`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.6: In `quickDevToolSchemas.test.ts`, add top-level `describe("quickDevToolSchemas", () => {` before the first prescribed test and add its closing `})` after the final prescribed test.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.7: In `quickDevToolSchemas.test.ts`, add test `exposes the exact Step 1 shared/default tool schema order` asserting `schemaNames(buildQuickDevStep1ToolSchemas())` deep-equals `STEP_1_TOOL_NAMES`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.8: In `quickDevToolSchemas.test.ts`, add test `exposes the exact Step 2 shared/default tool schema order` asserting `schemaNames(buildQuickDevStep2ToolSchemas())` deep-equals `STEP_2_TOOL_NAMES`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.9: In `quickDevToolSchemas.test.ts`, add test `returns an empty model-facing schema for runtime-only Step 3` asserting `buildQuickDevStep3ToolSchemas()` deep-equals `[]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.10: In `quickDevToolSchemas.test.ts`, add test `uses shared default Step 1 and Step 2 tool specs without module-owned schema prose` asserting `buildQuickDevStep1ToolSchemas()` deep-equals `expectedSharedToolSpecs(QUICK_DEV_STEP_1_TOOL_IDS)` and `buildQuickDevStep2ToolSchemas()` deep-equals `expectedSharedToolSpecs(QUICK_DEV_STEP_2_TOOL_IDS)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.11: In `quickDevToolSchemas.test.ts`, add test `uses only approved Cline default tool ids` asserting `QUICK_DEV_STEP_1_TOOL_IDS` deep-equals `[ClineDefaultTool.BASH, ClineDefaultTool.LIST_FILES, ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_CODE_DEF, ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_READ_RANGE, ClineDefaultTool.APPLY_PATCH, ClineDefaultTool.FILE_NEW, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST]` and `QUICK_DEV_STEP_2_TOOL_IDS` deep-equals `[ClineDefaultTool.BASH, ClineDefaultTool.LIST_FILES, ClineDefaultTool.SEARCH, ClineDefaultTool.LIST_CODE_DEF, ClineDefaultTool.FILE_READ, ClineDefaultTool.FILE_READ_RANGE, ClineDefaultTool.APPLY_PATCH, ClineDefaultTool.FILE_NEW, ClineDefaultTool.SEND_USER_MESSAGE, ClineDefaultTool.ATTEMPT]`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 2.12: In `quickDevToolSchemas.test.ts`, add test `does not expose forbidden model-facing tools in any quick-dev step` assigning `const exposedNames = [...schemaNames(buildQuickDevStep1ToolSchemas()), ...schemaNames(buildQuickDevStep2ToolSchemas()), ...schemaNames(buildQuickDevStep3ToolSchemas())]` and asserting `expect(exposedNames).not.to.include(forbiddenToolName)` for every `forbiddenToolName` in `FORBIDDEN_MODEL_FACING_TOOL_NAMES`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[x] Task 3: Run Phase 1 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 3.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 3.2: Run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 3.3: Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 3.4: Run `git diff --name-only` and `git ls-files --others --exclude-standard`; confirm persistent diffs and untracked files are limited to Phase 1 authorized files plus the pre-existing backing requirements document: `src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`, `docs/workflows/workflow-runtime/workflow-modules/quick-dev/quick-dev-requirements.md`, and this action plan.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

### Phase 2: Quick Dev Workflow Definition And Module Tests

Relevant requirements: Workflow Identity, Persona, Runtime-Owned Values, Required Prerequisite File, Runtime Artifacts And Output Documents, Steps, Step 1 Routing, Step 1 Prompt, Step 2 Routing, Step 2 Prompt, Step 3 Routing, Test Requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

Pause for QA after Phase 2 validation passes. Do not start Phase 3 until QA passes.

[x] Task 4: Add `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts` imports, identity constants, workflow values, prerequisite declaration, setup procedure, prompt constants, decision trees, and workflow definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.1: Create `quickDevWorkflow.ts` with imports exactly: `import { basename } from "node:path"`; type imports `ActiveWorkflowSession`, `WorkflowDecisionBranchTrigger`, `WorkflowDecisionTree`, `WorkflowDefinition`, `WorkflowDeterministicProcedureResult`, `WorkflowPersonaDefinition`, `WorkflowStepDefinition`, `WorkflowStepPromptSource`, and `WorkflowValues` from `../../types`; and imports `buildQuickDevStep1ToolSchemas`, `buildQuickDevStep2ToolSchemas`, and `buildQuickDevStep3ToolSchemas` from `./quickDevToolSchemas`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.2: In `quickDevWorkflow.ts`, add exported identity constants exactly: `QUICK_DEV_WORKFLOW_NAME = "quick-dev"`, `QUICK_DEV_WORKFLOW_DISPLAY_NAME = "quick dev"`, `QUICK_DEV_WORKFLOW_SLASH_COMMAND_NAME = "quick-dev"`, `QUICK_DEV_WORKFLOW_USE_SKILL_NAME = "quick-dev"`, `QUICK_DEV_WORKFLOW_PROJECT_SUBFOLDER = "implementation"`, and `QUICK_DEV_WORKFLOW_DESCRIPTION = "In this workflow, the agent implements a small project using an implementation spec drafted in the Quick Spec workflow."`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.3: In `quickDevWorkflow.ts`, add `export const QUICK_DEV_WORKFLOW_PERSONA: WorkflowPersonaDefinition = { name: "Amelia", role: "Developer Agent", identity: "professional developer with experience in a variety of programming languages", communicationStyle: "ultra-succinct, using file paths and acceptance-criteria or task IDs with no fluff", capabilities: ["software development"], principles: ["implementation must be precise, up to quality standards, and directly aligned with prescribed tasks"] }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.4: In `quickDevWorkflow.ts`, add exported enum `QuickDevWorkflowValueKey` with members `ProjectMode = "projectMode"`, `ProjectTitle = "projectTitle"`, `ProjectFolderName = "projectFolderName"`, `SpecFile = "spec_file"`, and `SpecFileFilename = "spec_file_filename"`; add `export const QUICK_DEV_WORKFLOW_VALUE_KEYS: readonly QuickDevWorkflowValueKey[] = [QuickDevWorkflowValueKey.ProjectMode, QuickDevWorkflowValueKey.ProjectTitle, QuickDevWorkflowValueKey.ProjectFolderName, QuickDevWorkflowValueKey.SpecFile, QuickDevWorkflowValueKey.SpecFileFilename]`; and add `export const QUICK_DEV_ENTRY_PROJECT_VALUE_KEYS = { projectMode: QuickDevWorkflowValueKey.ProjectMode, projectTitle: QuickDevWorkflowValueKey.ProjectTitle, projectFolderName: QuickDevWorkflowValueKey.ProjectFolderName }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.5: In `quickDevWorkflow.ts`, add `export const QUICK_DEV_SPEC_FILE_PREREQUISITE_ID = QuickDevWorkflowValueKey.SpecFile` and `export const QUICK_DEV_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]> = { [QUICK_DEV_SPEC_FILE_PREREQUISITE_ID]: { id: QUICK_DEV_SPEC_FILE_PREREQUISITE_ID, requirement: "required", producingWorkflowName: "quick-spec", projectSubfolderSegments: ["planning"], match: { kind: "exact_filename", filename: "quick-spec.md" }, workflowValueKey: QuickDevWorkflowValueKey.SpecFile, outputDocumentReference: "none" } }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.6: In `quickDevWorkflow.ts`, add `const QUICK_DEV_MISSING_SPEC_FILE_ERROR = "No implementation specs were found in the selected project folder. You can generate one by running the Quick Spec workflow."`, `const QUICK_DEV_INVALID_SPEC_FILENAME_ERROR = "A file with the required naming conventions was not located. Please ensure that there is a spec file generated by the Quick Spec workflow in the selected project's folder with naming convention \"quick-spec.md\""`, and `const QUICK_DEV_SPEC_MOVE_FAILED_ERROR = "migration of the completed spec to the project's review subfolder failed. Please manually relocate the file."`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.7: In `quickDevWorkflow.ts`, add `function createEmptyPromptSource(): WorkflowStepPromptSource { return { kind: "none" } }` and `function createStepDefinition(args: { stepNumber: 1 | 2 | 3; checklistLabel: string; decisionTree: WorkflowDecisionTree; buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]; promptTemplates?: WorkflowStepDefinition["promptTemplates"]; buildToolSchema: WorkflowStepDefinition["buildToolSchema"] }): WorkflowStepDefinition` that builds `{ id: \`step-${args.stepNumber}\`, stepNumber: args.stepNumber, checklistLabel: args.checklistLabel, buildPromptSource: args.buildPromptSource ?? createEmptyPromptSource, buildToolSchema: args.buildToolSchema, decisionTree: args.decisionTree }` and returns the object with `promptTemplates` added only when `args.promptTemplates !== undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.8: In `quickDevWorkflow.ts`, add `function readWorkflowStringValue(workflowValues: WorkflowValues, key: QuickDevWorkflowValueKey): string | undefined` that returns `undefined` unless `workflowValues[key]` is a string whose trimmed value is non-empty; add `export function deriveQuickDevSpecFileFilename(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult` that reads `spec_file`, returns `{ kind: "failed", errorMessage: QUICK_DEV_MISSING_SPEC_FILE_ERROR }` when missing, assigns `const specFileFilename = basename(specFile)`, returns `{ kind: "failed", errorMessage: QUICK_DEV_INVALID_SPEC_FILENAME_ERROR }` unless `specFileFilename === "quick-spec.md"`, and returns `{ kind: "succeeded", workflowValueWrites: { [QuickDevWorkflowValueKey.SpecFileFilename]: specFileFilename } }` on success. Do not read the filesystem, validate parent folder paths, or search for `quick-spec.md` in other folders.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.9: In `quickDevWorkflow.ts`, add prompt constants `QUICK_DEV_STEP_1_PROMPT_TEMPLATE` and `QUICK_DEV_STEP_2_PROMPT_TEMPLATE` with the exact text below, preserving the leading spaces before `If`, `After`, and each Step 2 bullet:

```ts
const QUICK_DEV_STEP_1_PROMPT_TEMPLATE = `You've been called within a workflow designed to implement one phase within a small project based on documentation built in an upstream workflow. Follow the instructions provided for each step exactly. You will receive additional instructions as you complete steps and unlock additional steps in the workflow.

Read this first: \`{workflow.spec_file}\`
Identify the first incomplete phase in the file, and ask the user to confirm that they'd like you to implement that phase during this workflow. Once they've confirmed, analyze that phase only to build an understanding of the work to be performed. Identify any ambiguities or internal conflicts within the file, and notify the user if any are present.
Once you've read the assigned phase and ensured it is free of internal conflict or ambiguity, send a message to the user informing them that the file is in a good state for execution, and that you will be initiating progression to the execution phase. When the user responds, use workflow_progress_request to progress this workflow to the task execution phase.`

const QUICK_DEV_STEP_2_PROMPT_TEMPLATE = `Implement the phase confirmed by the user in step 1, following the instructions in the document's "Dev Agent Instructions" section exactly. Do not infer missing behavior, do not broaden scope, and do not implement later phases.

 If any task or subtask is ambiguous, internally contradictory, references a missing symbol, requires a change outside the authorized scope for the assigned phase, or cannot be implemented compile-safely as written, stop and report the blocker instead of improvising.

Once all of the assigned phase's tasks and subtasks are complete, stage the files revised, deleted, or generated during implementation. Include the file name and phase number in the commit description.

 After committing your changes, stop and use attempt_completion to provide the user with an implementation summary including:
 - phase completion status
 - any blocker or failed validation, with exact output (if applicable)
 - files changed
 - validation commands and results (if applicable)
 - confirmation that no later-phase work was performed
 - the commit hash from your commit`
```

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.10: In `quickDevWorkflow.ts`, add `function buildStep1PromptSource(): WorkflowStepPromptSource` returning `{ kind: "current_step_instruction_template", currentStepInstructionTemplate: QUICK_DEV_STEP_1_PROMPT_TEMPLATE }` and `function buildStep2PromptSource(): WorkflowStepPromptSource` returning `{ kind: "current_step_instruction_template", currentStepInstructionTemplate: QUICK_DEV_STEP_2_PROMPT_TEMPLATE }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.11: In `quickDevWorkflow.ts`, add trigger helpers exactly: `function workflowProgressRequestConfirmed(): WorkflowDecisionBranchTrigger` returning `{ kind: "on_event", eventKind: "workflow_progress_request_confirmed" }`; `function workflowProgressRequestDenied(): WorkflowDecisionBranchTrigger` returning `{ kind: "on_event", eventKind: "workflow_progress_request_denied" }`; `function attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger` returning `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }`; `function workflowValuesPersisted(...keys: readonly QuickDevWorkflowValueKey[]): WorkflowDecisionBranchTrigger` returning an `event_predicate` whose `matches` returns `triggerEvent.kind === "workflow_values_persisted" && keys.every((key) => triggerEvent.changedKeys.includes(key))`; `function sourceRouteMatches(sourceRoute: { branchId: string; routeId: string }, branchId: string, routeId: string): boolean` returning `sourceRoute.branchId === branchId && sourceRoute.routeId === routeId`; `function toolBackedOperationSucceeded(branchId: string, routeId: string): WorkflowDecisionBranchTrigger` returning an `event_predicate` whose `matches` returns `triggerEvent.kind === "tool_backed_operation_succeeded" && sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId)`; and `function toolBackedOperationFailed(branchId: string, routeId: string): WorkflowDecisionBranchTrigger` returning an `event_predicate` whose `matches` returns `triggerEvent.kind === "tool_backed_operation_failed" && sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId)`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.12: In `quickDevWorkflow.ts`, add `function buildStep1DecisionTree(): WorkflowDecisionTree` with `entryBranchId: "step-1-resolve-spec-file"` and branches: `"step-1-resolve-spec-file"` always routes id `"step-1-resolve-spec-file"` to `{ kind: "resolve_prerequisite_files", prerequisiteIds: [QUICK_DEV_SPEC_FILE_PREREQUISITE_ID] }` with `followingBranchId: "step-1-derive-spec-file-filename"`; `"step-1-derive-spec-file-filename"` always routes id `"step-1-derive-spec-file-filename"` to `{ kind: "run_deterministic_procedure", instruction: { run: deriveQuickDevSpecFileFilename } }` with `followingBranchId: "step-1-await-spec-file-filename"`; `"step-1-await-spec-file-filename"` routes id `"step-1-project-prompt"` on `workflowValuesPersisted(QuickDevWorkflowValueKey.SpecFileFilename)` to `{ kind: "project_prompt" }` with `followingBranchId: "step-1-await-progress-request"`; and `"step-1-await-progress-request"` has route `"step-1-progress-confirmed"` on `workflowProgressRequestConfirmed()` to `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } }` plus route `"step-1-progress-denied"` on `workflowProgressRequestDenied()` to `{ kind: "project_prompt" }` with `followingBranchId: "step-1-await-progress-request"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.13: In `quickDevWorkflow.ts`, add `function buildStep2DecisionTree(): WorkflowDecisionTree` with `entryBranchId: "step-2-project-prompt"` and branches: `"step-2-project-prompt"` always routes id `"step-2-project-prompt"` to `{ kind: "project_prompt" }` with `followingBranchId: "step-2-await-attempt-completion"`; `"step-2-await-attempt-completion"` routes id `"step-2-transition-to-step-3"` on `attemptCompletionSucceeded()` to `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 3 } }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.14: In `quickDevWorkflow.ts`, add `function buildStep3DecisionTree(): WorkflowDecisionTree` with `entryBranchId: "step-3-move-spec-to-review"` and branches: `"step-3-move-spec-to-review"` always routes id `"step-3-move-spec-to-review"` to `{ kind: "move_project_file", sourceFolderSegments: ["planning"], destinationFolderSegments: ["review"], filenameWorkflowValueKey: QuickDevWorkflowValueKey.SpecFileFilename }` with `followingBranchId: "step-3-await-spec-move"`; `"step-3-await-spec-move"` routes id `"step-3-complete-after-spec-move"` on `toolBackedOperationSucceeded("step-3-move-spec-to-review", "step-3-move-spec-to-review")` to `{ kind: "complete_workflow" }` and route id `"step-3-terminal-error-after-spec-move-failure"` on `toolBackedOperationFailed("step-3-move-spec-to-review", "step-3-move-spec-to-review")` to `{ kind: "terminal_error", errorMessage: QUICK_DEV_SPEC_MOVE_FAILED_ERROR }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 4.15: In `quickDevWorkflow.ts`, add `export const quickDevWorkflowDefinition: WorkflowDefinition` with exact properties: `name: QUICK_DEV_WORKFLOW_NAME`, `displayName: QUICK_DEV_WORKFLOW_DISPLAY_NAME`, `description: QUICK_DEV_WORKFLOW_DESCRIPTION`, `slashCommandName: QUICK_DEV_WORKFLOW_SLASH_COMMAND_NAME`, `useSkillName: QUICK_DEV_WORKFLOW_USE_SKILL_NAME`, `persona: QUICK_DEV_WORKFLOW_PERSONA`, `projectSubfolder: QUICK_DEV_WORKFLOW_PROJECT_SUBFOLDER`, `workflowValueKeys: QUICK_DEV_WORKFLOW_VALUE_KEYS`, `entryProjectValueKeys: QUICK_DEV_ENTRY_PROJECT_VALUE_KEYS`, `entryPanel: { promptMarkdown: QUICK_DEV_WORKFLOW_DESCRIPTION }`, `prerequisiteFiles: QUICK_DEV_PREREQUISITE_FILES`, and `steps` containing `"step-1"`, `"step-2"`, and `"step-3"` built through `createStepDefinition(...)`. Step 1 must use `stepNumber: 1`, `checklistLabel: "Review Assigned Phase"`, `decisionTree: buildStep1DecisionTree()`, `buildPromptSource: buildStep1PromptSource`, `promptTemplates: [QUICK_DEV_STEP_1_PROMPT_TEMPLATE]`, and `buildToolSchema: buildQuickDevStep1ToolSchemas`. Step 2 must use `stepNumber: 2`, `checklistLabel: "Implement Assigned Phase"`, `decisionTree: buildStep2DecisionTree()`, `buildPromptSource: buildStep2PromptSource`, `promptTemplates: [QUICK_DEV_STEP_2_PROMPT_TEMPLATE]`, and `buildToolSchema: buildQuickDevStep2ToolSchemas`. Step 3 must use `stepNumber: 3`, `checklistLabel: "Update Project Records"`, `decisionTree: buildStep3DecisionTree()`, and `buildToolSchema: buildQuickDevStep3ToolSchemas`, with no `buildPromptSource` and no `promptTemplates`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[x] Task 5: Add `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/index.ts` module exports.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 5.1: Create `index.ts` with exactly `export * from "./quickDevToolSchemas"` followed by `export * from "./quickDevWorkflow"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[x] Task 6: Add `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts` with focused workflow definition tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.1: Create `quickDevWorkflow.test.ts` with imports exactly: `import { expect } from "chai"`, `import { describe, it } from "mocha"`, type imports `ActiveWorkflowSession`, `WorkflowBranchTriggerEvent`, `WorkflowDecisionBranchEvaluationInput`, `WorkflowDecisionBranchRoute`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, and `WorkflowValues` from `../../../types`, `renderWorkflowPromptTemplate` from `../../../workflowPromptTemplates`, the three quick-dev tool schema builders from `../quickDevToolSchemas`, and imports `deriveQuickDevSpecFileFilename`, `QUICK_DEV_ENTRY_PROJECT_VALUE_KEYS`, `QUICK_DEV_PREREQUISITE_FILES`, `QUICK_DEV_SPEC_FILE_PREREQUISITE_ID`, `QUICK_DEV_WORKFLOW_DESCRIPTION`, `QUICK_DEV_WORKFLOW_PERSONA`, `QUICK_DEV_WORKFLOW_VALUE_KEYS`, `QuickDevWorkflowValueKey`, and `quickDevWorkflowDefinition` from `..`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.2: In `quickDevWorkflow.test.ts`, add constants `TEST_SPEC_FILE = "/tmp/quick-dev-project/planning/quick-spec.md"`, `TEST_SPEC_FILE_FILENAME = "quick-spec.md"`, `MISSING_SPEC_FILE_ERROR = "No implementation specs were found in the selected project folder. You can generate one by running the Quick Spec workflow."`, `INVALID_SPEC_FILENAME_ERROR = "A file with the required naming conventions was not located. Please ensure that there is a spec file generated by the Quick Spec workflow in the selected project's folder with naming convention \"quick-spec.md\""`, and `SPEC_MOVE_FAILED_ERROR = "migration of the completed spec to the project's review subfolder failed. Please manually relocate the file."`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.3: In `quickDevWorkflow.test.ts`, add helper `function createSession(args: { activeStepNumber: number; activeBranchId: string; workflowValues: WorkflowValues }): ActiveWorkflowSession` returning a session with the provided active step, active branch, workflow values, `projectSelection` values `{ projectMode: "existing", projectTitle: "Quick Dev Project", projectFolderName: "quick-dev-project" }`, `lifecycle: { projectSelectionCompleted: true }`, `entryArtifactResolution: undefined`, `ui` values `formSession: undefined`, `stepResolutionSession: undefined`, `suppressedWorkflowFormIds: []`, and `suppressedWorkflowStepResolutionRoutes: []`, and `branchContext: { activeBranchId: args.activeBranchId }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.4: In `quickDevWorkflow.test.ts`, add helper `function createPredicateInput(args: { activeBranchId: string; workflowValues: WorkflowValues; step: WorkflowStepDefinition; triggerEvent: WorkflowBranchTriggerEvent }): WorkflowDecisionBranchEvaluationInput & { triggerEvent: WorkflowBranchTriggerEvent }` returning the provided branch, values, step, a session from `createSession(...)`, and `triggerEvent`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.5: In `quickDevWorkflow.test.ts`, add helper `function getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition` that assigns `const step = quickDevWorkflowDefinition.steps[stepId]`, throws `new Error(\`Missing quick-dev step ${stepId}.\`)` when `step === undefined`, and returns `step`. Add helper `function findStepRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute` that assigns `const step = getStep(stepId)`, `const branch = step.decisionTree.branches[branchId]`, throws `new Error(\`Missing quick-dev branch ${branchId}.\`)` when `branch === undefined`, assigns `const route = branch.routes.find((candidate) => candidate.id === routeId)`, throws `new Error(\`Missing quick-dev route ${branchId}/${routeId}.\`)` when `route === undefined`, and returns `route`. Add helper `function createPromptInput(args: { stepId: WorkflowStepDefinition["id"]; activeBranchId: string; workflowValues: WorkflowValues }): WorkflowPromptBuilderInput` that assigns `const step = getStep(args.stepId)` and returns `{ session: createSession({ activeStepNumber: step.stepNumber, activeBranchId: args.activeBranchId, workflowValues: args.workflowValues }), step }`. Add helper `function getPromptInstructions(args: { stepId: WorkflowStepDefinition["id"]; activeBranchId: string; workflowValues: WorkflowValues }): string` that assigns `const promptSource = getStep(args.stepId).buildPromptSource(createPromptInput(args))`, throws `new Error(\`Expected quick-dev ${args.stepId} to provide current step instructions.\`)` unless `promptSource.kind === "current_step_instruction_template"`, and returns `renderWorkflowPromptTemplate({ template: promptSource.currentStepInstructionTemplate, workflowValueKeys: quickDevWorkflowDefinition.workflowValueKeys, workflowValues: args.workflowValues, context: \`quick-dev ${args.stepId} test prompt\` })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.6: In `quickDevWorkflow.test.ts`, add event helpers `function buildWorkflowValuesPersistedEvent(changedKeys: readonly string[]): WorkflowBranchTriggerEvent` returning `{ kind: "workflow_values_persisted", changedKeys }`, `function buildToolBackedOperationSucceededEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent` returning `{ kind: "tool_backed_operation_succeeded", sourceRoute: { branchId, routeId } }`, and `function buildToolBackedOperationFailedEvent(branchId: string, routeId: string): WorkflowBranchTriggerEvent` returning `{ kind: "tool_backed_operation_failed", sourceRoute: { branchId, routeId }, errorMessage: "move failed" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.7: In `quickDevWorkflow.test.ts`, add helper `function expectEventPredicateMatches(args: { stepId: WorkflowStepDefinition["id"]; branchId: string; route: WorkflowDecisionBranchRoute; workflowValues: WorkflowValues; triggerEvent: WorkflowBranchTriggerEvent }): void` that requires `args.route.trigger.kind === "event_predicate"` and asserts `args.route.trigger.matches(createPredicateInput({ activeBranchId: args.branchId, workflowValues: args.workflowValues, step: getStep(args.stepId), triggerEvent: args.triggerEvent }))` equals `true`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.8: In `quickDevWorkflow.test.ts`, add top-level `describe("quickDevWorkflow", () => {` before the first prescribed test and add its closing `})` after the final prescribed test.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.9: In `quickDevWorkflow.test.ts`, add test `defines the Quick Dev workflow identity, persona, values, prerequisite, and steps` asserting `quickDevWorkflowDefinition.name`, `displayName`, `description`, `slashCommandName`, `useSkillName`, and `projectSubfolder` match the requirements; `quickDevWorkflowDefinition.persona` deep-equals `QUICK_DEV_WORKFLOW_PERSONA`; `entryPanel.promptMarkdown` equals `QUICK_DEV_WORKFLOW_DESCRIPTION`; `workflowValueKeys` deep-equals `QUICK_DEV_WORKFLOW_VALUE_KEYS`; `entryProjectValueKeys` deep-equals `QUICK_DEV_ENTRY_PROJECT_VALUE_KEYS`; `workflowForms` and `artifacts` equal `undefined`; `Object.keys(quickDevWorkflowDefinition.steps)` deep-equals `["step-1", "step-2", "step-3"]`; `Object.values(quickDevWorkflowDefinition.steps).map((step) => step.stepNumber)` deep-equals `[1, 2, 3]`; `Object.values(quickDevWorkflowDefinition.steps).map((step) => step.checklistLabel)` deep-equals `["Review Assigned Phase", "Implement Assigned Phase", "Update Project Records"]`; and `quickDevWorkflowDefinition.prerequisiteFiles` deep-equals `QUICK_DEV_PREREQUISITE_FILES`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.10: In `quickDevWorkflow.test.ts`, add test `declares the required quick-spec prerequisite exactly` reading `const prerequisite = QUICK_DEV_PREREQUISITE_FILES[QUICK_DEV_SPEC_FILE_PREREQUISITE_ID]` and asserting deep equality with `{ id: "spec_file", requirement: "required", producingWorkflowName: "quick-spec", projectSubfolderSegments: ["planning"], match: { kind: "exact_filename", filename: "quick-spec.md" }, workflowValueKey: "spec_file", outputDocumentReference: "none" }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.11: In `quickDevWorkflow.test.ts`, add test `derives and validates the quick-spec filename from the selected prerequisite path` that calls `deriveQuickDevSpecFileFilename(...)` with `spec_file: TEST_SPEC_FILE` and asserts success writes `{ [QuickDevWorkflowValueKey.SpecFileFilename]: TEST_SPEC_FILE_FILENAME }`; calls it with no `spec_file` and asserts failed `errorMessage` equals `MISSING_SPEC_FILE_ERROR`; and calls it with `spec_file: "/tmp/quick-dev-project/planning/not-quick-spec.md"` and asserts failed `errorMessage` equals `INVALID_SPEC_FILENAME_ERROR`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.12: In `quickDevWorkflow.test.ts`, add test `routes Step 1 through prerequisite resolution, filename derivation, project prompt, and progress gating` asserting the Step 1 resolve route action deep-equals `{ kind: "resolve_prerequisite_files", prerequisiteIds: ["spec_file"] }` with `followingBranchId: "step-1-derive-spec-file-filename"`; the derive route action has `kind: "run_deterministic_procedure"` with `followingBranchId: "step-1-await-spec-file-filename"`; after narrowing `deriveRoute.action.kind === "run_deterministic_procedure"`, assert `deriveRoute.action.instruction.run` equals `deriveQuickDevSpecFileFilename`; the prompt route matches `buildWorkflowValuesPersistedEvent(["spec_file_filename"])`, action deep-equals `{ kind: "project_prompt" }`, and `followingBranchId` equals `"step-1-await-progress-request"`; the confirmed route trigger deep-equals `{ kind: "on_event", eventKind: "workflow_progress_request_confirmed" }` and action deep-equals `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 2 } }`; and the denied route trigger deep-equals `{ kind: "on_event", eventKind: "workflow_progress_request_denied" }`, action deep-equals `{ kind: "project_prompt" }`, and `followingBranchId` equals `"step-1-await-progress-request"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.13: In `quickDevWorkflow.test.ts`, add test `routes Step 2 attempt completion to Step 3` asserting the Step 2 project prompt route action deep-equals `{ kind: "project_prompt" }` with `followingBranchId: "step-2-await-attempt-completion"` and the Step 2 completion route trigger deep-equals `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }` with action `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 3 } }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.14: In `quickDevWorkflow.test.ts`, add test `routes Step 3 through quick-spec relocation and completion or terminal error` asserting the move route action deep-equals `{ kind: "move_project_file", sourceFolderSegments: ["planning"], destinationFolderSegments: ["review"], filenameWorkflowValueKey: "spec_file_filename" }` with `followingBranchId: "step-3-await-spec-move"`; the success route matches `buildToolBackedOperationSucceededEvent("step-3-move-spec-to-review", "step-3-move-spec-to-review")` and action deep-equals `{ kind: "complete_workflow" }`; and the failure route matches `buildToolBackedOperationFailedEvent("step-3-move-spec-to-review", "step-3-move-spec-to-review")` and action deep-equals `{ kind: "terminal_error", errorMessage: SPEC_MOVE_FAILED_ERROR }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.15: In `quickDevWorkflow.test.ts`, add test `builds Step 1 and Step 2 prompt sources with materialized workflow values and keeps Step 3 promptless` using `getPromptInstructions(...)` for Step 1 and Step 2 with workflow values `{ spec_file: TEST_SPEC_FILE, spec_file_filename: TEST_SPEC_FILE_FILENAME }`. Assert Step 1 includes `TEST_SPEC_FILE`, `Read this first: \`${TEST_SPEC_FILE}\``, `workflow_progress_request`, and `Identify the first incomplete phase`; Step 1 does not include `{workflow.spec_file}`, `### Prompt`, `### Progression Rule`, `# Tool Schema Override`, or `# Focus Chain Tasks`. Assert Step 2 includes `Implement the phase confirmed by the user in step 1`, `attempt_completion`, `phase completion status`, and `the commit hash from your commit`; Step 2 does not include `workflow must progress to step 3`, `### Prompt`, `### Progression Rule`, `# Tool Schema Override`, or `# Focus Chain Tasks`. Assign `const step3PromptSource = getStep("step-3").buildPromptSource(createPromptInput({ stepId: "step-3", activeBranchId: "step-3-move-spec-to-review", workflowValues: { spec_file: TEST_SPEC_FILE, spec_file_filename: TEST_SPEC_FILE_FILENAME } }))`, assert `step3PromptSource` deep-equals `{ kind: "none" }`, and assert `getStep("step-3").promptTemplates` equals `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.16: In `quickDevWorkflow.test.ts`, add test `delegates every step to module-owned tool schema builders` that creates `const workflowValues = { spec_file: TEST_SPEC_FILE, spec_file_filename: TEST_SPEC_FILE_FILENAME }`, `const step1PromptInput = createPromptInput({ stepId: "step-1", activeBranchId: "step-1-resolve-spec-file", workflowValues })`, `const step2PromptInput = createPromptInput({ stepId: "step-2", activeBranchId: "step-2-project-prompt", workflowValues })`, and `const step3PromptInput = createPromptInput({ stepId: "step-3", activeBranchId: "step-3-move-spec-to-review", workflowValues })`; then assert `quickDevWorkflowDefinition.steps["step-1"].buildToolSchema(step1PromptInput)` deep-equals `buildQuickDevStep1ToolSchemas()`, `quickDevWorkflowDefinition.steps["step-2"].buildToolSchema(step2PromptInput)` deep-equals `buildQuickDevStep2ToolSchemas()`, and `quickDevWorkflowDefinition.steps["step-3"].buildToolSchema(step3PromptInput)` deep-equals `buildQuickDevStep3ToolSchemas()`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 6.17: In `quickDevWorkflow.test.ts`, add test `does not reference legacy source files, authoring markers, or unauthorized runtime artifacts` serializing `quickDevWorkflowDefinition` with `JSON.stringify(...)`, requiring a string result, and asserting it does not include `/Users/robertboston/Documents/Cline/Workflows/quick-dev.md`, `.cline/workflow-config.yaml`, `bmad`, `BMAD`, `quick-dev.md`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `set_workflow_values`, `ask_followup_question`, `use_subagents`, or `use_skill`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[x] Task 7: Run Phase 2 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 7.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 7.2: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 7.3: Run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 7.4: Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 7.5: Run `git diff --name-only` and `git ls-files --others --exclude-standard`; confirm persistent diffs and untracked files are limited to Phase 1 and Phase 2 authorized files plus the pre-existing backing requirements document: `src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/index.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`, `docs/workflows/workflow-runtime/workflow-modules/quick-dev/quick-dev-requirements.md`, and this action plan.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

### Phase 3: Registry, Prompt Projection, And Slash Command Coverage

Relevant requirements: Workflow Identity, Prompt Projection Requirements, Registration Requirements, Test Requirements.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/slash-commands.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

Pause for QA after Phase 3 validation passes. Do not start Phase 4 until QA passes.

[x] Task 8: Register the Quick Dev workflow in `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 8.1: In `WorkflowRegistry.ts`, add `import { quickDevWorkflowDefinition } from "@/core/task/workflow-runtime/workflow-modules/quick-dev"` immediately after the existing `quickSpecWorkflowDefinition` import.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 8.2: In `WorkflowRegistry.ts`, add `quickDevWorkflowDefinition,` to `shippedWorkflowDefinitions` immediately after `quickSpecWorkflowDefinition,`. Do not add `quick-dev.md` or any alias to any registry map.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[x] Task 9: Extend `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts` with registry lookup coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 9.1: In `quickDevWorkflow.test.ts`, add imports `resolveWorkflowBySlashCommand`, `resolveWorkflowByUseSkillName`, and `resolveWorkflowDefinition` from `../../../WorkflowRegistry`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 9.2: In `quickDevWorkflow.test.ts`, add test `resolves from the registry by canonical quick-dev names and rejects .md aliases` asserting `resolveWorkflowDefinition("quick-dev")`, `resolveWorkflowBySlashCommand("quick-dev")`, and `resolveWorkflowByUseSkillName("quick-dev")` each equal `quickDevWorkflowDefinition`; and asserting `resolveWorkflowDefinition("quick-dev.md")`, `resolveWorkflowBySlashCommand("quick-dev.md")`, and `resolveWorkflowByUseSkillName("quick-dev.md")` each equal `undefined`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[x] Task 10: Extend `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts` with Quick Dev prompt and tool projection coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.1: In `integration.test.ts`, add an import block for `buildQuickDevStep1ToolSchemas`, `buildQuickDevStep2ToolSchemas`, `QuickDevWorkflowValueKey`, and `quickDevWorkflowDefinition` from `@/core/task/workflow-runtime/workflow-modules/quick-dev`. Do not import `buildQuickDevStep3ToolSchemas` into `integration.test.ts` because Step 3 is deterministic routing only and Task 10 must not build a Step 3 prompt context.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.2: In `integration.test.ts`, add Quick Dev fixture constants near the existing Quick Spec prompt fixtures: `const QUICK_DEV_SPEC_FILE = "/test/project/docs/projects/quick-dev-project/planning/quick-spec.md"`, `const QUICK_DEV_SPEC_FILE_FILENAME = "quick-spec.md"`, and `type QuickDevPromptStepNumber = 1 | 2 | 3`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.3: In `integration.test.ts`, add `function createQuickDevWorkflowValues(): WorkflowValues` returning values for `QuickDevWorkflowValueKey.ProjectMode: "existing"`, `ProjectTitle: "Quick Dev Prompt Project"`, `ProjectFolderName: "quick-dev-project"`, `SpecFile: QUICK_DEV_SPEC_FILE`, and `SpecFileFilename: QUICK_DEV_SPEC_FILE_FILENAME`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.4: In `integration.test.ts`, add `function getQuickDevEntryBranchId(activeStepNumber: QuickDevPromptStepNumber): string` that returns `quickDevWorkflowDefinition.steps["step-1"].decisionTree.entryBranchId` for `1`, `quickDevWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId` for `2`, and `quickDevWorkflowDefinition.steps["step-3"].decisionTree.entryBranchId` for `3`, with a `never` exhaustive check for the default.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.5: In `integration.test.ts`, add `function createQuickDevWorkflowSession(activeStepNumber: QuickDevPromptStepNumber): ActiveWorkflowSession` returning a session with `activeStepNumber`, `workflowValues: createQuickDevWorkflowValues()`, `projectSelection` values `{ projectMode: "existing", projectTitle: "Quick Dev Prompt Project", projectFolderName: "quick-dev-project" }`, `lifecycle: { projectSelectionCompleted: true }`, `entryArtifactResolution: undefined`, `ui` values `formSession: undefined`, `stepResolutionSession: undefined`, `suppressedWorkflowFormIds: []`, and `suppressedWorkflowStepResolutionRoutes: []`, and `branchContext: { activeBranchId: getQuickDevEntryBranchId(activeStepNumber) }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.6: In `integration.test.ts`, add `const buildQuickDevPromptContext = async (activeStepNumber: QuickDevPromptStepNumber): Promise<SystemPromptContext & WorkflowPromptProjection>` that creates `const workspacePathPolicy: WorkflowWorkspacePathPolicy = { validateAccess: () => true }`, `const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })`, `const taskState = new TaskState()`, sets `taskState.activeWorkflowName = quickDevWorkflowDefinition.name`, `taskState.activeWorkflowSession = createQuickDevWorkflowSession(activeStepNumber)`, and `taskState.apiRequestCount = 1`, assigns `const workflowProjection = await runtime.buildTurnProjection({ taskState })`, and returns `{ ...baseContext, mcpHub: makeMcpHub([]), providerInfo: makeProviderInfo("gpt-5-codex", "openai"), enableNativeToolCalls: true, useMinimalGptPrompt: true, ...workflowProjection }`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.7: In `integration.test.ts`, add `async function expectQuickDevProjectedToolSurface(testCtx: TestRunner, activeStepNumber: QuickDevPromptStepNumber, expectedToolSpecs: readonly ClineToolSpec[]): Promise<void>` that assigns `const context = await buildQuickDevPromptContext(activeStepNumber)`, asserts `context.workflowToolSchemaOverride` deep-equals `expectedToolSpecs`, and calls `await runPromptTest(testCtx, context, "gpt-5-codex", async ({ tools }) => { expect(getNativeToolNames(tools)).to.deep.equal(expectedToolSpecs.map((tool) => tool.name)) })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.8: In the workflow prompt-projection describe block in `integration.test.ts`, add test `projects active quick-dev prompt-step tools from module-owned builders into native GPT-5 prompts` with callback `async function (this: TestRunner)`. Its body must call `await expectQuickDevProjectedToolSurface(this, 1, buildQuickDevStep1ToolSchemas())` and `await expectQuickDevProjectedToolSurface(this, 2, buildQuickDevStep2ToolSchemas())`. Do not build a Step 3 prompt context in this test because Step 3 is deterministic routing only and must not render a prompt.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.9: In the workflow prompt-projection describe block in `integration.test.ts`, add test `projects quick-dev Step 1 materialized spec path into the workflow input payload only` with callback `async function (this: TestRunner)`. Its body must assign `const context = await buildQuickDevPromptContext(1)`, `const workflowInputPayloadBlock = context.workflowInputPayloadBlock`, and `const renderedReadLine = "Read this first: `" + QUICK_DEV_SPEC_FILE + "`"`; throw `new Error("Expected quick-dev Step 1 workflow input payload block.")` when `workflowInputPayloadBlock === undefined || workflowInputPayloadBlock.length === 0`; assert `workflowInputPayloadBlock` includes `Workflow:\nquick dev`, `Name: Amelia`, `Role: Developer Agent`, `Step 1: Review Assigned Phase`, `renderedReadLine`, `workflow_progress_request`, and `Identify the first incomplete phase`; assert it does not include `{workflow.spec_file}`, `### Prompt`, `### Progression Rule`, `# Tool Schema Override`, or `# Focus Chain Tasks`; and call `await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt }) => { expect(systemPrompt).not.to.include("CURRENT STEP DETAILED INSTRUCTIONS"); expect(systemPrompt).not.to.include(renderedReadLine) })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.10: In the workflow prompt-projection describe block in `integration.test.ts`, add test `projects quick-dev Step 2 implementation prompt into the workflow input payload only` with callback `async function (this: TestRunner)`. Its body must assign `const context = await buildQuickDevPromptContext(2)`, `const workflowInputPayloadBlock = context.workflowInputPayloadBlock`, throw `new Error("Expected quick-dev Step 2 workflow input payload block.")` when `workflowInputPayloadBlock === undefined || workflowInputPayloadBlock.length === 0`, assert `workflowInputPayloadBlock` includes `Step 2: Implement Assigned Phase`, `Implement the phase confirmed by the user in step 1`, `attempt_completion`, `phase completion status`, and `the commit hash from your commit`; assert it does not include `workflow_progress_request`, `### Prompt`, `### Progression Rule`, `# Tool Schema Override`, or `# Focus Chain Tasks`; and call `await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt }) => { expect(systemPrompt).not.to.include("CURRENT STEP DETAILED INSTRUCTIONS"); expect(systemPrompt).not.to.include("Implement the phase confirmed by the user in step 1") })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.11: In the workflow prompt-projection describe block in `integration.test.ts`, add test `renders quick-dev response-tool guidance only for active response tools` with callback `async function (this: TestRunner)`. Its body must assign `const step1Context = await buildQuickDevPromptContext(1)`, call `await runPromptTest(this, step1Context, "gpt-5-codex", async ({ systemPrompt }) => { expectResponseToolNames(systemPrompt, ["`workflow_progress_request`"], ["`attempt_completion`"]) })`, assign `const step2Context = await buildQuickDevPromptContext(2)`, and call `await runPromptTest(this, step2Context, "gpt-5-codex", async ({ systemPrompt }) => { expectResponseToolNames(systemPrompt, ["`attempt_completion`"], ["`workflow_progress_request`"]) })`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 10.12: In the workflow prompt-projection describe block in `integration.test.ts`, add test `does not expose forbidden runtime or legacy tools in quick-dev prompt projection` with callback `async () =>`. Its body must define `const forbiddenToolNames = ["ask_followup_question", "set_workflow_values", "build_workflow_document", "create_workflow_artifact", "archive_workflow_artifact", "delete_workflow_artifact", "move_workflow_project_file", "use_subagents", "use_skill", "web_search", "web_fetch", "browser_action", "use_mcp_tool", "access_mcp_resource", "load_mcp_documentation"]`, loop through `[1, 2] as const`, build each context with `await buildQuickDevPromptContext(activeStepNumber)`, assign `const projectedToolNames = context.workflowToolSchemaOverride?.map((tool) => tool.name) ?? []`, and assert `expect(projectedToolNames).not.to.include(forbiddenToolName)` for every `forbiddenToolName` in `forbiddenToolNames`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[x] Task 11: Extend `/Users/robertboston/Documents/Cline Extension/cline/src/test/slash-commands.test.ts` with Quick Dev shipped slash command coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/slash-commands.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 11.1: In `slash-commands.test.ts`, inside `describe("Shipped Workflow Slash Commands", () => { ... })`, add test `includes the registered quick-dev workflow slash command` that calls `getResponse()`, finds `cmd.name === "quick-dev"`, asserts the command is not `undefined`, `section` equals `"custom"`, `cliCompatible` equals `true`, and `description` equals `"Shipped workflow: quick-dev"`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/test/slash-commands.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[x] Task 12: Run Phase 3 validation.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 12.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/test/slash-commands.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 12.2: Run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 12.3: Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [x] Subtask 12.4: Run `git diff --name-only` and `git ls-files --others --exclude-standard`; confirm persistent diffs and untracked files are limited to Phase 1, Phase 2, and Phase 3 authorized files plus the pre-existing backing requirements document: `src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/index.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`, `src/core/task/workflow-runtime/WorkflowRegistry.ts`, `src/core/prompts/system-prompt/__tests__/integration.test.ts`, `src/test/slash-commands.test.ts`, `docs/workflows/workflow-runtime/workflow-modules/quick-dev/quick-dev-requirements.md`, and this action plan.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

### Phase 4: Cleanup Guards And Final Validation

Relevant requirements: Scope, Source Wording Preservation, Runtime Artifacts And Output Documents, Prompt Projection Requirements, Registration Requirements, Validation Requirements For The Future Action Plan.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[ ] Task 13: Run final static guard checks.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 13.1: Run `rg -n "quick-dev\\.md" src/core/task/workflow-runtime/WorkflowRegistry.ts src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/test/slash-commands.test.ts`; confirm it returns no matches and exit code `1`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 13.2: Run `rg -n "set_workflow_values|ask_followup_question|use_subagents|use_skill|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|build_workflow_document|create_workflow_artifact|web_search|web_fetch|browser_action|use_mcp_tool|access_mcp_resource|load_mcp_documentation|plan_story_artifacts|plan_remediation_story_artifact|generate_story_files|update_story_index_status" src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`; confirm it returns no matches and exit code `1`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 13.3: Run `rg -n -U "QUICK_DEV_STEP_1_TOOL_IDS: readonly ClineDefaultTool\\[\\] = \\[[^\\]]*ClineDefaultTool\\.ATTEMPT[^\\]]*\\]|QUICK_DEV_STEP_2_TOOL_IDS: readonly ClineDefaultTool\\[\\] = \\[[^\\]]*ClineDefaultTool\\.WORKFLOW_PROGRESS_REQUEST[^\\]]*\\]|buildQuickDevStep3ToolSchemas\\(\\): readonly ClineToolSpec\\[\\] \\{\\s*return QUICK_DEV_STEP|buildQuickDevStep3ToolSchemas\\(\\): readonly ClineToolSpec\\[\\] \\{\\s*return \\[[^\\]]" src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`; confirm it returns no matches and exit code `1`. This guard verifies Step 1 does not expose `attempt_completion`, Step 2 does not expose `workflow_progress_request`, and Step 3 does not return model-facing schemas even when tool id arrays are formatted across multiple lines.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 13.4: Run `rg -n "move_project_file|sourceFolderSegments: \\[\"planning\"\\]|destinationFolderSegments: \\[\"review\"\\]|filenameWorkflowValueKey: QuickDevWorkflowValueKey\\.SpecFileFilename" src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`; confirm it returns matches for all four required Step 3 deterministic move concepts: `move_project_file`, `sourceFolderSegments: ["planning"]`, `destinationFolderSegments: ["review"]`, and `filenameWorkflowValueKey: QuickDevWorkflowValueKey.SpecFileFilename`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 13.5: Run `rg -n "/Users/robertboston/Documents/Cline/Workflows/quick-dev.md|\\.cline/workflow-config|bmad|BMAD" src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts src/core/task/workflow-runtime/WorkflowRegistry.ts`; confirm it returns no matches and exit code `1`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 13.6: Run `rg -n "### Prompt|### Progression Rule|# Tool Schema Override|# Focus Chain Tasks" src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`; confirm it returns no matches and exit code `1`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

[ ] Task 14: Run final validation commands.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 14.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 14.2: Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts src/test/slash-commands.test.ts`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 14.3: Run `npm run check-types`. If it fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 14.4: Run `npm run lint`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 14.5: Run `npm run package`. If it fails before packaging because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run package` before treating the failure as a code defect.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

    [ ] Subtask 14.6: Run `git diff --name-only` and `git ls-files --others --exclude-standard`; confirm persistent diffs and untracked files are limited to the full authorized implementation file set plus the pre-existing backing requirements document: `src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/quickDevWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/index.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/quick-dev/__tests__/quickDevWorkflow.test.ts`, `src/core/task/workflow-runtime/WorkflowRegistry.ts`, `src/core/prompts/system-prompt/__tests__/integration.test.ts`, `src/test/slash-commands.test.ts`, `docs/workflows/workflow-runtime/workflow-modules/quick-dev/quick-dev-requirements.md`, and this action plan.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/quick-dev/action-plan.md`

## Compliance Matrix

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Task 1 | Step 1 Tool Schema; Step 2 Tool Schema; Step 3 Routing | `quickDevToolSchemas.ts` | `quickDevToolSchemas.ts`; shared/default tool imports | Quick Spec schema builder pattern and `ClineDefaultTool` names verified | No local schema prose; no backend-only tools | Task 2; Task 3; Task 13; Task 14 |
| Subtask 1.1 | Step 1 Tool Schema; module build guide tool ownership | `quickDevToolSchemas.ts` | `ClineToolSet`; `ClineToolSpec`; `registerClineToolSets`; `ModelFamily`; `ClineDefaultTool` | Import paths verified in Quick Spec schema file | Later subtasks consume all imports | Subtask 3.2; Task 2 |
| Subtask 1.2 | Step 1 Tool Schema; Step 2 Tool Schema | `quickDevToolSchemas.ts` | `QUICK_DEV_TOOL_SCHEMA_VARIANT` | `ModelFamily.NATIVE_GPT_5` verified in shipped modules | Consumed by `resolveQuickDevSharedToolSpec` | Subtask 2.10; Subtask 3.2 |
| Subtask 1.3 | Step 1 Tool Schema | `quickDevToolSchemas.ts` | `QUICK_DEV_STEP_1_TOOL_IDS` | Step 1 tool names verified in `ClineDefaultTool` | Exact-order tests prevent extra tools | Subtasks 2.7, 2.11, 2.12 |
| Subtask 1.4 | Step 2 Tool Schema | `quickDevToolSchemas.ts` | `QUICK_DEV_STEP_2_TOOL_IDS` | Step 2 tool names verified in `ClineDefaultTool` | Exact-order tests prevent extra tools | Subtasks 2.8, 2.11, 2.12 |
| Subtask 1.5 | Step 1 Tool Schema; Step 2 Tool Schema | `quickDevToolSchemas.ts` | `resolveQuickDevSharedToolSpec` | `ClineToolSet.getToolByNameWithFallback` pattern verified | Throws on missing shared spec; avoids local prose | Subtask 2.10 |
| Subtask 1.6 | Step 1 Tool Schema | `quickDevToolSchemas.ts` | `buildQuickDevStep1ToolSchemas` | `WorkflowStepDefinition.buildToolSchema` accepts named builder | Workflow file uses builder instead of inline schema | Subtasks 2.7, 2.10, 6.16 |
| Subtask 1.7 | Step 2 Tool Schema | `quickDevToolSchemas.ts` | `buildQuickDevStep2ToolSchemas` | `WorkflowStepDefinition.buildToolSchema` accepts named builder | Workflow file uses builder instead of inline schema | Subtasks 2.8, 2.10, 6.16 |
| Subtask 1.8 | Step 3 Routing | `quickDevToolSchemas.ts` | `buildQuickDevStep3ToolSchemas` | Runtime-only empty builder pattern verified | Prevents inline empty schema in workflow file | Subtasks 2.9, 6.16, 10.8 |
| Task 2 | Test Requirements | `quickDevToolSchemas.test.ts` | Tool schema test file and helpers | Chai/Mocha and shared spec comparison verified | Tests catch tool exposure fallout | Task 3; Task 14 |
| Subtask 2.1 | Test Requirements | `quickDevToolSchemas.test.ts` | Test imports and Quick Dev schema exports | Import paths verified from planned source files | Imports consumed by later assertions | Subtask 3.1 |
| Subtask 2.2 | Step 1 Tool Schema; Step 2 Tool Schema | `quickDevToolSchemas.test.ts` | `STEP_1_TOOL_NAMES`; `STEP_2_TOOL_NAMES` | Required tool names verified in requirements | Constants drive exact-order assertions | Subtasks 2.7, 2.8 |
| Subtask 2.3 | Step 1 Tool Schema; Step 2 Tool Schema | `quickDevToolSchemas.test.ts` | `FORBIDDEN_MODEL_FACING_TOOL_NAMES` | Forbidden inventory verified in requirements | Guard list catches forbidden exposure | Subtask 2.12; Task 13 |
| Subtask 2.4 | Test Requirements | `quickDevToolSchemas.test.ts` | `schemaNames` | `ClineToolSpec.name` verified in schema type | Helper consumed by exact-name tests | Subtasks 2.7, 2.8, 2.12 |
| Subtask 2.5 | Test Requirements | `quickDevToolSchemas.test.ts` | `expectedSharedToolSpecs` | Shared/default resolver contract verified | Throws on stale missing shared tools | Subtask 2.10 |
| Subtask 2.6 | Test Requirements | `quickDevToolSchemas.test.ts` | `describe("quickDevToolSchemas")` | Mocha structure verified in existing tests | Wraps all prescribed tests | Subtask 3.1 |
| Subtask 2.7 | Step 1 Tool Schema | `quickDevToolSchemas.test.ts` | Step 1 exact-order assertion | Tool names verified in requirements | Fails on extra or missing Step 1 tools | Subtask 3.1 |
| Subtask 2.8 | Step 2 Tool Schema | `quickDevToolSchemas.test.ts` | Step 2 exact-order assertion | Tool names verified in requirements | Fails on extra or missing Step 2 tools | Subtask 3.1 |
| Subtask 2.9 | Step 3 Routing | `quickDevToolSchemas.test.ts` | Empty Step 3 schema assertion | Runtime-only Step 3 verified in requirements | Fails if Step 3 becomes model-facing | Subtask 3.1 |
| Subtask 2.10 | Step 1 Tool Schema; Step 2 Tool Schema | `quickDevToolSchemas.test.ts` | Shared/default spec equality assertion | Shared schema source verified in Quick Spec tests | Prevents module-owned schema prose | Subtask 3.1 |
| Subtask 2.11 | Step 1 Tool Schema; Step 2 Tool Schema | `quickDevToolSchemas.test.ts` | Approved `ClineDefaultTool` id assertions | Enum members verified in `src/shared/tools.ts` | Prevents stale or wrong ids | Subtask 3.1 |
| Subtask 2.12 | Step 1 Tool Schema; Step 2 Tool Schema; Step 3 Routing | `quickDevToolSchemas.test.ts` | Forbidden exposure assertion | Forbidden tool list verified in requirements | Catches backend and legacy tool leakage | Subtask 3.1; Task 13 |
| Task 3 | Validation Requirements | action plan | Phase 1 commands and scope diff | `npm` scripts and diff commands verified | Scope allowlist includes backing requirements doc | Subtasks 3.1-3.4 |
| Subtask 3.1 | Validation Requirements | action plan | Phase 1 focused unit test command | Test path created in Task 2 | Stops on failing focused schema tests | Phase 1 QA |
| Subtask 3.2 | Validation Requirements | action plan | `npm run check-types`; `npm run protos` fallback | Proto recovery rule verified from repo behavior | Separates environment setup failures from defects | Phase 1 QA |
| Subtask 3.3 | Validation Requirements | action plan | `npm run lint` | Lint script verified in `package.json` | Catches formatting and unused imports | Phase 1 QA |
| Subtask 3.4 | Validation Requirements | action plan | `git diff --name-only`; `git ls-files --others --exclude-standard` | Required scope-diff commands verified | Allows only Phase 1 files, action plan, requirements doc | Phase 1 QA |
| Task 4 | Workflow Identity; Persona; Values; Prerequisite; Steps; Routing; Prompts | `quickDevWorkflow.ts` | Quick Dev workflow definition surface | Route/action/type contracts verified in live runtime | No artifacts, forms, source markdown dependency, or backend tools | Tasks 6, 7, 10, 13, 14 |
| Subtask 4.1 | Workflow Identity; Steps | `quickDevWorkflow.ts` | `basename`; workflow type imports; schema builder imports | `../../types` and schema export paths verified | Omits unused `WorkflowPromptBuilderInput` import | Subtask 7.3 |
| Subtask 4.2 | Workflow Identity | `quickDevWorkflow.ts` | Quick Dev identity constants | Identity values verified in requirements | Registry uses canonical names only | Subtasks 6.9, 9.2, 11.1 |
| Subtask 4.3 | Persona | `quickDevWorkflow.ts` | `QUICK_DEV_WORKFLOW_PERSONA` | Persona fields verified in requirements | Tests assert exact persona | Subtask 6.9 |
| Subtask 4.4 | Runtime-Owned Values | `quickDevWorkflow.ts` | `QuickDevWorkflowValueKey`; value arrays; entry project keys | Workflow value contract verified in `WorkflowDefinition` type | No AI-writable values or extra keys | Subtask 6.9 |
| Subtask 4.5 | Required Prerequisite File | `quickDevWorkflow.ts` | `QUICK_DEV_SPEC_FILE_PREREQUISITE_ID`; `QUICK_DEV_PREREQUISITE_FILES` | `exact_filename` prerequisite shape verified in types | No selector discovery or artifact allocation | Subtask 6.10 |
| Subtask 4.6 | Required Prerequisite File; Step 3 Routing | `quickDevWorkflow.ts` | Exact missing, invalid basename, and move-failure errors | Exact text verified in requirements | Tests assert constants through behavior | Subtasks 6.11, 6.14 |
| Subtask 4.7 | Steps | `quickDevWorkflow.ts` | `createEmptyPromptSource`; `createStepDefinition` | `WorkflowStepDefinition` shape verified | Prompt templates included only when present | Subtasks 6.9, 6.16 |
| Subtask 4.8 | Required Prerequisite File | `quickDevWorkflow.ts` | `readWorkflowStringValue`; `deriveQuickDevSpecFileFilename` | `WorkflowDeterministicProcedureResult` verified in types | No filesystem read, folder validation, or alternate search | Subtask 6.11 |
| Subtask 4.9 | Step 1 Prompt; Step 2 Prompt | `quickDevWorkflow.ts` | `QUICK_DEV_STEP_1_PROMPT_TEMPLATE`; `QUICK_DEV_STEP_2_PROMPT_TEMPLATE` | Exact prompt text verified in requirements | Preserves leading spaces and excludes authoring labels | Subtask 6.15; Subtasks 10.9, 10.10 |
| Subtask 4.10 | Step 1 Prompt; Step 2 Prompt | `quickDevWorkflow.ts` | `buildStep1PromptSource`; `buildStep2PromptSource` | Prompt source type verified | Shared renderer handles `{workflow.spec_file}` | Subtask 6.15 |
| Subtask 4.11 | Step 1 Routing; Step 2 Routing; Step 3 Routing | `quickDevWorkflow.ts` | Trigger helpers and source-route predicates | Event kinds verified in `WorkflowBranchTriggerEvent` | Predicates scoped to exact route and event kind | Subtasks 6.12-6.14 |
| Subtask 4.12 | Step 1 Routing | `quickDevWorkflow.ts` | `buildStep1DecisionTree` | `resolve_prerequisite_files`, deterministic procedure, project prompt, and progression events verified | Denied progression stays in Step 1; no direct completion | Subtask 6.12 |
| Subtask 4.13 | Step 2 Routing | `quickDevWorkflow.ts` | `buildStep2DecisionTree` | `attempt_completion_succeeded` transition verified | Step 2 routes only to Step 3 | Subtask 6.13 |
| Subtask 4.14 | Step 3 Routing | `quickDevWorkflow.ts` | `buildStep3DecisionTree`; `move_project_file`; terminal error | `move_project_file` shape verified in live runtime | Success completes; failure does not complete | Subtask 6.14 |
| Subtask 4.15 | Workflow Identity; Steps; Prompt Projection | `quickDevWorkflow.ts` | `quickDevWorkflowDefinition` | `WorkflowDefinition` shape verified | No `artifacts`, `workflowForms`, or Step 3 prompt templates | Subtasks 6.9, 6.16, 6.17 |
| Task 5 | Registration Requirements | `index.ts` | Module index file | Existing module index pattern verified | Exports only schema and workflow surfaces | Task 7; Task 8 |
| Subtask 5.1 | Registration Requirements | `index.ts` | `export * from "./quickDevToolSchemas"`; `export * from "./quickDevWorkflow"` | Barrel export shape verified in shipped modules | No document-builder export added | Subtask 7.3 |
| Task 6 | Test Requirements | `quickDevWorkflow.test.ts` | Workflow test file and helpers | Chai/Mocha, route, event, and prompt helper contracts verified | Tests cover route, prompt, registry, and forbidden fallout | Task 7; Task 14 |
| Subtask 6.1 | Test Requirements | `quickDevWorkflow.test.ts` | Test imports and Quick Dev workflow exports | Import paths and type names verified | Imports consumed by later test subtasks | Subtask 7.1 |
| Subtask 6.2 | Required Prerequisite File; Step 3 Routing | `quickDevWorkflow.test.ts` | Test spec path and exact error constants | Error text verified in requirements | Omits unused project-root fixture | Subtask 7.1 |
| Subtask 6.3 | Test Requirements | `quickDevWorkflow.test.ts` | `createSession` | `ActiveWorkflowSession` shape verified in types | Includes required UI and branch context fields | Subtask 7.1 |
| Subtask 6.4 | Test Requirements | `quickDevWorkflow.test.ts` | `createPredicateInput` | `WorkflowDecisionBranchEvaluationInput` shape verified | Supplies trigger event for event predicates | Subtask 7.1 |
| Subtask 6.5 | Step 1 Prompt; Step 2 Prompt | `quickDevWorkflow.test.ts` | `getStep`; `findStepRoute`; `createPromptInput`; `getPromptInstructions` | `renderWorkflowPromptTemplate` contract verified | Exact helper bodies and prompt-source narrowing prescribed | Subtask 7.1 |
| Subtask 6.6 | Step 1 Routing; Step 3 Routing | `quickDevWorkflow.test.ts` | Workflow value and tool-backed event helpers | Event shapes verified in `WorkflowBranchTriggerEvent` | Exact source-route events drive route tests | Subtask 7.1 |
| Subtask 6.7 | Step 1 Routing; Step 3 Routing | `quickDevWorkflow.test.ts` | `expectEventPredicateMatches` | Event predicate trigger narrowing verified | Prevents union-field access without narrowing | Subtask 7.1 |
| Subtask 6.8 | Test Requirements | `quickDevWorkflow.test.ts` | `describe("quickDevWorkflow")` | Mocha structure verified | Wraps all prescribed workflow tests | Subtask 7.1 |
| Subtask 6.9 | Workflow Identity; Persona; Values; Prerequisite; Steps | `quickDevWorkflow.test.ts` | Identity, persona, value, prerequisite, step id, step order, and step label assertions | Definition shape verified in types | Verifies exactly three required steps and no artifacts or workflow forms | Subtask 7.1 |
| Subtask 6.10 | Required Prerequisite File | `quickDevWorkflow.test.ts` | Exact prerequisite assertion | Prerequisite declaration shape verified | Catches wrong match or workflow value key | Subtask 7.1 |
| Subtask 6.11 | Required Prerequisite File | `quickDevWorkflow.test.ts` | Filename derivation success and failures | Deterministic procedure result shape verified | Exact missing and invalid basename errors tested | Subtask 7.1 |
| Subtask 6.12 | Step 1 Routing | `quickDevWorkflow.test.ts` | Step 1 route assertions and deterministic procedure function assertion | Route/action/trigger shapes verified | Covers confirm and deny branches | Subtask 7.1 |
| Subtask 6.13 | Step 2 Routing | `quickDevWorkflow.test.ts` | Step 2 route assertions | Attempt-completion event verified | Prevents direct Step 2 completion | Subtask 7.1 |
| Subtask 6.14 | Step 3 Routing | `quickDevWorkflow.test.ts` | Step 3 move, success, and failure assertions | `move_project_file` and tool-backed events verified | Exact terminal error tested | Subtask 7.1 |
| Subtask 6.15 | Step 1 Prompt; Step 2 Prompt; Step 3 Routing; Source Wording Preservation | `quickDevWorkflow.test.ts` | Prompt invariant assertions and Step 3 promptless assertions | Shared prompt renderer and empty prompt source verified | Raw token and all authoring markers excluded | Subtask 7.1 |
| Subtask 6.16 | Step 1 Tool Schema; Step 2 Tool Schema; Step 3 Routing | `quickDevWorkflow.test.ts` | Tool builder delegation assertions with `WorkflowPromptBuilderInput` arguments | `buildToolSchema` contract verified | No inline schema drift | Subtask 7.1 |
| Subtask 6.17 | Scope; Runtime Artifacts And Output Documents | `quickDevWorkflow.test.ts` | Serialized forbidden-value assertions | Definition serialization behavior verified | Catches legacy source, artifact, and backend strings | Subtask 7.1; Task 13 |
| Task 7 | Validation Requirements | action plan | Phase 2 commands and scope diff | `npm` scripts and test paths verified | Scope allowlist includes Phase 1, Phase 2, action plan, requirements doc | Subtasks 7.1-7.5 |
| Subtask 7.1 | Validation Requirements | action plan | Focused workflow test command | Test path created in Task 6 | Stops on workflow test failures | Phase 2 QA |
| Subtask 7.2 | Validation Requirements | action plan | Combined Quick Dev unit test command | Tool schema and workflow tests created earlier | Catches cross-file regression | Phase 2 QA |
| Subtask 7.3 | Validation Requirements | action plan | `npm run check-types`; `npm run protos` fallback | Proto recovery rule verified | Separates environment setup failures from defects | Phase 2 QA |
| Subtask 7.4 | Validation Requirements | action plan | `npm run lint` | Lint script verified | Catches unused imports and formatting | Phase 2 QA |
| Subtask 7.5 | Validation Requirements | action plan | Diff and untracked-file scope commands | Required scope-diff commands verified | Allows only Phase 1-2 files, action plan, requirements doc | Phase 2 QA |
| Task 8 | Registration Requirements | `WorkflowRegistry.ts` | Registry import and shipped definitions entry | Registry map construction verified | No `.md` alias added | Task 9; Task 11; Task 12; Task 13 |
| Subtask 8.1 | Registration Requirements | `WorkflowRegistry.ts` | `quickDevWorkflowDefinition` import | Existing Quick Spec import location verified | No unrelated registry import movement | Subtask 12.2 |
| Subtask 8.2 | Registration Requirements | `WorkflowRegistry.ts` | `quickDevWorkflowDefinition` shipped entry | Shipped definition array verified | No alias or map rewrite | Subtasks 9.2, 11.1 |
| Task 9 | Registration Requirements; Test Requirements | `quickDevWorkflow.test.ts` | Registry lookup tests | Registry resolver exports verified | `.md` aliases rejected | Task 12 |
| Subtask 9.1 | Registration Requirements | `quickDevWorkflow.test.ts` | `resolveWorkflowDefinition`; slash and skill resolvers | Registry export names verified | Imports used by Subtask 9.2 | Subtask 12.1 |
| Subtask 9.2 | Registration Requirements | `quickDevWorkflow.test.ts` | Canonical lookup and `.md` rejection assertions | Registry lookup behavior verified | Prevents unauthorized legacy alias | Subtask 12.1; Task 13 |
| Task 10 | Prompt Projection Requirements; Test Requirements | `integration.test.ts` | Quick Dev prompt-projection helpers and tests | Prompt projection helper contracts verified | Tests payload and tool projection, not exact full prose | Task 12; Task 14 |
| Subtask 10.1 | Prompt Projection Requirements | `integration.test.ts` | Quick Dev import block without Step 3 schema builder | Module barrel export planned in Task 5 | Imports consumed by later projection tests; no unused Step 3 import | Subtask 12.1 |
| Subtask 10.2 | Prompt Projection Requirements | `integration.test.ts` | `QUICK_DEV_SPEC_FILE`; `QUICK_DEV_SPEC_FILE_FILENAME`; step type | Quick Spec fixture location verified | Constants drive materialized path assertions | Subtasks 10.3, 10.9 |
| Subtask 10.3 | Prompt Projection Requirements | `integration.test.ts` | `createQuickDevWorkflowValues` | Workflow value keys verified | Values include `spec_file` and filename | Subtasks 10.5, 10.9 |
| Subtask 10.4 | Prompt Projection Requirements | `integration.test.ts` | `getQuickDevEntryBranchId` | Step ids and entry branches verified in definition | Exhaustive switch prevents missing Step 3 | Subtask 10.5 |
| Subtask 10.5 | Prompt Projection Requirements | `integration.test.ts` | `createQuickDevWorkflowSession` | `ActiveWorkflowSession` shape verified | Active branch matches step entry branch | Subtask 10.6 |
| Subtask 10.6 | Prompt Projection Requirements | `integration.test.ts` | `buildQuickDevPromptContext` | `WorkflowRuntime.buildTurnProjection` helper pattern verified | Exact native GPT-5 prompt context fields prescribed | Subtasks 10.7-10.12 |
| Subtask 10.7 | Prompt Projection Requirements | `integration.test.ts` | `expectQuickDevProjectedToolSurface` | `runPromptTest` async handler contract and native tool helpers verified | Asserts projected override and native tool names | Subtask 10.8 |
| Subtask 10.8 | Prompt Projection Requirements | `integration.test.ts` | Active prompt-step tool projection async test | Schema builders verified | Excludes deterministic Step 3 prompt context | Subtask 12.1 |
| Subtask 10.9 | Step 1 Prompt; Prompt Projection Requirements | `integration.test.ts` | Exact Step 1 context, display-name payload, and async system-prompt assertions | Runtime uses `displayName` in workflow payload and `runPromptTest` async handler contract verified | Raw token and all authoring markers absent | Subtask 12.1 |
| Subtask 10.10 | Step 2 Prompt; Prompt Projection Requirements | `integration.test.ts` | Exact Step 2 context, payload, and async system-prompt assertions | Workflow input payload projection and `runPromptTest` async handler contract verified | Step 2 excludes Step 1 response tool and authoring markers | Subtask 12.1 |
| Subtask 10.11 | Prompt Projection Requirements | `integration.test.ts` | Response-tool guidance async assertions | `runPromptTest` async handler contract and `expectResponseToolNames` verified | Step 1 and Step 2 response tools separated | Subtask 12.1 |
| Subtask 10.12 | Prompt Projection Requirements | `integration.test.ts` | Forbidden projected-tool async assertions for Steps 1 and 2 | `workflowToolSchemaOverride` shape verified | Backend, web, MCP, and legacy tools excluded from prompt-rendered steps | Subtask 12.1; Task 13 |
| Task 11 | Registration Requirements | `slash-commands.test.ts` | Slash-command shipped workflow test | Existing `getResponse()` helper verified | Adds Quick Dev without altering existing commands | Task 12 |
| Subtask 11.1 | Registration Requirements | `slash-commands.test.ts` | `quick-dev` slash-command assertion | Existing Quick Spec slash test verified | Prevents missing command registration | Subtask 12.1 |
| Task 12 | Validation Requirements | action plan | Phase 3 commands and scope diff | `npm` scripts and test paths verified | Scope allowlist includes Phase 1-3, action plan, requirements doc | Subtasks 12.1-12.4 |
| Subtask 12.1 | Validation Requirements | action plan | Focused registry, prompt, and slash test command | Target test paths exist or are created earlier | Stops on prompt/registry regressions | Phase 3 QA |
| Subtask 12.2 | Validation Requirements | action plan | `npm run check-types`; `npm run protos` fallback | Proto recovery rule verified | Separates environment setup failures from defects | Phase 3 QA |
| Subtask 12.3 | Validation Requirements | action plan | `npm run lint` | Lint script verified | Catches imports and formatting | Phase 3 QA |
| Subtask 12.4 | Validation Requirements | action plan | Diff and untracked-file scope commands | Required scope-diff commands verified | Allows only Phase 1-3 files, action plan, requirements doc | Phase 3 QA |
| Task 13 | Validation Requirements | action plan | Static guard commands | `rg` positive and negative behavior verified | Guards target runtime code to avoid test assertion false positives | Task 14 |
| Subtask 13.1 | Validation Requirements; Registration Requirements | action plan | `quick-dev.md` guard | Registry and runtime files selected exactly | Avoids matching negative test strings | Task 14 |
| Subtask 13.2 | Validation Requirements; Tool Schema requirements | action plan | Forbidden model/backend tool guard | Runtime workflow and schema files selected exactly | Includes story, web, MCP, and backend forbidden terms | Task 14 |
| Subtask 13.3 | Validation Requirements; Tool Schema requirements | action plan | Step-specific forbidden tool-schema guard | Runtime schema file selected exactly | Checks Step 1 excludes attempt, Step 2 excludes progress request, and Step 3 exposes no schemas | Task 14 |
| Subtask 13.4 | Validation Requirements; Step 3 Routing | action plan | Required `move_project_file` deterministic route guard | Runtime workflow file selected exactly | Confirms Step 3 uses deterministic planning-to-review move | Task 14 |
| Subtask 13.5 | Validation Requirements; Scope | action plan | Source markdown, config, and BMAD guard | Runtime files selected exactly | Avoids matching negative test strings | Task 14 |
| Subtask 13.6 | Validation Requirements; Source Wording Preservation | action plan | Authoring marker guard including `### Prompt` | Prompt constants live in workflow file | Ensures all authoring labels are not prompt content | Task 14 |
| Task 14 | Validation Requirements | action plan | Final focused tests, typecheck, lint, package, scope diff | `package.json` scripts verified; package required by guide | Final allowlist includes all implementation files, action plan, requirements doc | Subtasks 14.1-14.6 |
| Subtask 14.1 | Validation Requirements | action plan | Final Quick Dev unit test command | Quick Dev test paths created earlier | Covers module workflow and schema tests | Final validation |
| Subtask 14.2 | Validation Requirements | action plan | Final prompt and slash test command | Prompt and slash test paths verified | Covers shipped integration surfaces | Final validation |
| Subtask 14.3 | Validation Requirements | action plan | `npm run check-types`; `npm run protos` fallback | Proto recovery rule verified | Separates environment setup failures from defects | Final validation |
| Subtask 14.4 | Validation Requirements | action plan | `npm run lint` | Lint script verified | Catches final formatting and import fallout | Final validation |
| Subtask 14.5 | Validation Requirements | action plan | `npm run package`; `npm run protos` fallback | Package/build gate required by guide | Separates setup failures from package defects | Final validation |
| Subtask 14.6 | Validation Requirements | action plan | Final diff and untracked-file scope commands | Required scope-diff commands verified | Allows only implementation files, action plan, requirements doc | Final validation |
