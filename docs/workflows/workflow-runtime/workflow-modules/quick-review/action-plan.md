# Quick Review Workflow Module Action Plan

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

Build the `quick-review` workflow module from `docs/workflows/workflow-runtime/workflow-modules/quick-review/quick-review-requirements.md`.

Authorized implementation method:

- Define a module-owned workflow under `src/core/task/workflow-runtime/workflow-modules/quick-review`.
- Use `WorkflowDefinition.prerequisiteFiles` and the `resolve_prerequisite_files` decision-tree action to resolve `review/quick-spec.md`.
- Use a Step 1 workflow form to collect `commit_hash`.
- Persist the Step 1 field directly to workflow values using `workflowValueKey: "commit_hash"`.
- Use a Step 2 `project_prompt` branch to project the review prompt.
- Complete the workflow only after `attempt_completion_succeeded`.
- Use shared default `ClineToolSet` specs for the Step 2 model-facing tools.
- Do not add backend tools, generated artifact builders, document builders, markdown workflow aliases, child workflows, or AI-writable workflow values.

Do not modify:

- `docs/workflows/workflow-runtime/workflow-modules/quick-review/quick-review.md`
- `docs/workflows/workflow-runtime/workflow-modules/quick-review/quick-review-requirements.md`
- `docs/workflows/workflow-runtime/requirements.md`
- Any workflow source document outside `src/core/task/workflow-runtime/workflow-modules/quick-review`

## Verified Live Contracts

- `WorkflowDefinition`, `WorkflowStepDefinition`, `WorkflowDecisionTree`, `WorkflowDecisionBranchTrigger`, and `WorkflowStepPromptSource` are defined in `src/core/task/workflow-runtime/types.ts`.
- Workflow-form payload contracts are defined in `src/shared/ExtensionMessage.ts`.
- Existing module-owned workflow patterns are present in `src/core/task/workflow-runtime/workflow-modules/quick-dev` and `src/core/task/workflow-runtime/workflow-modules/blind-review`.
- Workflow registration is centralized in `src/core/task/workflow-runtime/WorkflowRegistry.ts`.
- Prompt-projection coverage for registered workflow modules is in `src/core/prompts/system-prompt/__tests__/integration.test.ts`.
- Shipped slash-command coverage is in `src/test/slash-commands.test.ts`.
- Default tool specs are resolved by calling `registerClineToolSets()`, then `ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)`, then returning the resolved tool's `config`.

## Phase 1: Tool Schema Module

### [x] Task 1: Add Quick Review Tool Schema Builders

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewToolSchemas.ts`
- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [x] Subtask 1.1: Add `src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewToolSchemas.ts` with these exact imports:

```ts
import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
```

- [x] Subtask 1.2: In `quickReviewToolSchemas.ts`, add `QUICK_REVIEW_TOOL_SCHEMA_VARIANT` set to `ModelFamily.NATIVE_GPT_5`.

- [x] Subtask 1.3: In `quickReviewToolSchemas.ts`, add this exact exported Step 2 tool-id list in this order:

```ts
export const QUICK_REVIEW_STEP_2_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.BASH,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.FILE_NEW,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ATTEMPT,
]
```

- [x] Subtask 1.4: In `quickReviewToolSchemas.ts`, add `resolveQuickReviewSharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec` that:
  - calls `registerClineToolSets()`;
  - assigns `const tool = ClineToolSet.getToolByNameWithFallback(toolId, QUICK_REVIEW_TOOL_SCHEMA_VARIANT)`;
  - throws `new Error(\`Missing shared/default tool schema for Quick Review tool: ${toolId}\`)` when `tool === undefined`;
  - returns `tool.config`.

- [x] Subtask 1.5: In `quickReviewToolSchemas.ts`, add `buildQuickReviewStep1ToolSchemas(): readonly ClineToolSpec[]` with exactly this body:

```ts
export function buildQuickReviewStep1ToolSchemas(): readonly ClineToolSpec[] {
	return []
}
```

- [x] Subtask 1.6: In `quickReviewToolSchemas.ts`, add `buildQuickReviewStep2ToolSchemas(): readonly ClineToolSpec[]` with exactly this body:

```ts
export function buildQuickReviewStep2ToolSchemas(): readonly ClineToolSpec[] {
	return QUICK_REVIEW_STEP_2_TOOL_IDS.map((toolId) => resolveQuickReviewSharedToolSpec(toolId))
}
```

### [x] Task 2: Add Quick Review Tool Schema Tests

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewToolSchemas.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [x] Subtask 2.1: Add `src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewToolSchemas.test.ts` with these exact imports: `import { expect } from "chai"`, `import { describe, it } from "mocha"`, `import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"`, `import type { ClineToolSpec } from "@/core/prompts/system-prompt/spec"`, `import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"`, `import { ModelFamily } from "@/shared/prompts"`, `import { ClineDefaultTool } from "@/shared/tools"`, and a named import from `../quickReviewToolSchemas` containing `buildQuickReviewStep1ToolSchemas`, `buildQuickReviewStep2ToolSchemas`, and `QUICK_REVIEW_STEP_2_TOOL_IDS`.

- [x] Subtask 2.2: In `quickReviewToolSchemas.test.ts`, define `EXPECTED_STEP_2_TOOL_NAMES` with these exact model-facing tool names in this order:

```ts
[
	"execute_command",
	"list_files",
	"search_files",
	"list_code_definition_names",
	"read_file",
	"read_file_range",
	"apply_patch",
	"write_to_file",
	"send_user_message",
	"attempt_completion",
]
```

- [x] Subtask 2.3: In `quickReviewToolSchemas.test.ts`, define `FORBIDDEN_MODEL_FACING_TOOL_NAMES` with these exact strings:

```ts
[
	"workflow_progress_request",
	"ask_followup_question",
	"set_workflow_values",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
	"use_subagents",
	"use_skill",
	"web_search",
	"web_fetch",
	"browser_action",
	"use_mcp_tool",
	"access_mcp_resource",
	"load_mcp_documentation",
	"plan_story_artifacts",
	"plan_remediation_story_artifact",
	"generate_story_files",
	"update_story_index_status",
	"record_findings",
	"dev_story_git_finalize",
	"story_task_reminder",
	"story_task_complete",
	"request_task_detail",
	"show_incomplete_tasks",
]
```

- [x] Subtask 2.4: In `quickReviewToolSchemas.test.ts`, add `expectedSharedToolSpecs(toolIds: readonly ClineDefaultTool[]): readonly ClineToolSpec[]` that calls `registerClineToolSets()`, resolves each expected tool with `ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)`, throws `new Error(\`Missing expected shared/default tool schema for ${toolId}\`)` when the shared/default spec is missing, and returns each resolved tool's `config`.

- [x] Subtask 2.5: In `quickReviewToolSchemas.test.ts`, add a test that asserts `buildQuickReviewStep1ToolSchemas()` returns `[]`.

- [x] Subtask 2.6: In `quickReviewToolSchemas.test.ts`, add a test that asserts `buildQuickReviewStep2ToolSchemas().map((spec) => spec.name)` exactly equals `EXPECTED_STEP_2_TOOL_NAMES`.

- [x] Subtask 2.7: In `quickReviewToolSchemas.test.ts`, add a test that asserts `buildQuickReviewStep2ToolSchemas()` deeply equals `expectedSharedToolSpecs(QUICK_REVIEW_STEP_2_TOOL_IDS)`.

- [x] Subtask 2.8: In `quickReviewToolSchemas.test.ts`, add a test that asserts `QUICK_REVIEW_STEP_2_TOOL_IDS` exactly equals the Step 2 `ClineDefaultTool` list prescribed in Task 1.

- [x] Subtask 2.9: In `quickReviewToolSchemas.test.ts`, add a test that combines Step 1 and Step 2 schema names and asserts every name in `FORBIDDEN_MODEL_FACING_TOOL_NAMES` is absent.

### [x] Task 3: Validate Phase 1

Allowed files for this task and every numbered subtask below:

- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [x] Subtask 3.1: Run:

```sh
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewToolSchemas.test.ts
```

- [x] Subtask 3.2: Run:

```sh
npm run check-types
```

If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run:

```sh
npm run protos
```

Then rerun:

```sh
npm run check-types
```

- [x] Subtask 3.3: Run:

```sh
npm run lint
```

## Phase 2: Workflow Definition

### [ ] Task 4: Add Quick Review Workflow Definition

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewWorkflow.ts`
- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 4.1: Add `src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewWorkflow.ts` with imports for `WorkflowFormDefinitionPayload` from `@shared/ExtensionMessage`; `WorkflowDecisionBranchTrigger`, `WorkflowDecisionTree`, `WorkflowDefinition`, `WorkflowPersonaDefinition`, `WorkflowStepDefinition`, and `WorkflowStepPromptSource` from `../../types`; and `buildQuickReviewStep1ToolSchemas` plus `buildQuickReviewStep2ToolSchemas` from `./quickReviewToolSchemas`.

- [ ] Subtask 4.2: In `quickReviewWorkflow.ts`, add these exact exported workflow identity constants:

```ts
export const QUICK_REVIEW_WORKFLOW_NAME = "quick-review"
export const QUICK_REVIEW_WORKFLOW_DISPLAY_NAME = "quick review"
export const QUICK_REVIEW_WORKFLOW_SLASH_COMMAND_NAME = "quick-review"
export const QUICK_REVIEW_WORKFLOW_USE_SKILL_NAME = "quick-review"
export const QUICK_REVIEW_WORKFLOW_PROJECT_SUBFOLDER = "review"
```

- [ ] Subtask 4.3: In `quickReviewWorkflow.ts`, add exported `QUICK_REVIEW_WORKFLOW_DESCRIPTION` with this exact string:

```ts
"This workflow performs a thorough assessment of a completed implementation spec to ensure that the prescribed updates were implemented correctly. You should only run this workflow after a phase within an implementation spec has been implemented via the Quick Dev workflow, and the files touched during implementation have been staged and committed."
```

- [ ] Subtask 4.4: In `quickReviewWorkflow.ts`, add exported `QUICK_REVIEW_WORKFLOW_PERSONA: WorkflowPersonaDefinition` with these exact values:
  - `name`: `Fred`
  - `role`: `Quality Control`
  - `identity`: `Coordinates quality review after implementation to ensure that code is functional and compliant before it ships to production.`
  - `capabilities`: one-element array containing `QA findings triage & documentation`
  - `communicationStyle`: `precise and detailed`
  - `principles`: one-element array containing `lazily formatted and noncompliant code must never hit the production environment.`

- [ ] Subtask 4.5: In `quickReviewWorkflow.ts`, add this exact exported enum:

```ts
export enum QuickReviewWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	SpecFile = "spec_file",
	CommitHash = "commit_hash",
}
```

- [ ] Subtask 4.6: In `quickReviewWorkflow.ts`, add exported `QUICK_REVIEW_WORKFLOW_VALUE_KEYS` with exactly this array:

```ts
export const QUICK_REVIEW_WORKFLOW_VALUE_KEYS: readonly QuickReviewWorkflowValueKey[] = [
	QuickReviewWorkflowValueKey.ProjectMode,
	QuickReviewWorkflowValueKey.ProjectTitle,
	QuickReviewWorkflowValueKey.ProjectFolderName,
	QuickReviewWorkflowValueKey.SpecFile,
	QuickReviewWorkflowValueKey.CommitHash,
]
```

- [ ] Subtask 4.7: In `quickReviewWorkflow.ts`, add exported `QUICK_REVIEW_ENTRY_PROJECT_VALUE_KEYS` with exactly this object:

```ts
export const QUICK_REVIEW_ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: QuickReviewWorkflowValueKey.ProjectMode,
	projectTitle: QuickReviewWorkflowValueKey.ProjectTitle,
	projectFolderName: QuickReviewWorkflowValueKey.ProjectFolderName,
}
```

- [ ] Subtask 4.8: In `quickReviewWorkflow.ts`, add exported `QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID` set to `QuickReviewWorkflowValueKey.SpecFile`.

- [ ] Subtask 4.9: In `quickReviewWorkflow.ts`, add exported `QUICK_REVIEW_PREREQUISITE_FILES: NonNullable<WorkflowDefinition["prerequisiteFiles"]>` with exactly this object:

```ts
{
	[QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID]: {
		id: QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID,
		requirement: "required",
		producingWorkflowName: "quick-spec",
		projectSubfolderSegments: ["review"],
		match: { kind: "exact_filename", filename: "quick-spec.md" },
		workflowValueKey: QuickReviewWorkflowValueKey.SpecFile,
		outputDocumentReference: "none",
	},
}
```

- [ ] Subtask 4.10: In `quickReviewWorkflow.ts`, add these exact exported form constants:

```ts
export const QUICK_REVIEW_STEP_1_FORM_ID = "step-1-quick-review-commit-form"
export const QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID = "step-1-panel-a-commit-hash"
export const QUICK_REVIEW_COMMIT_HASH_FIELD_KEY = "commit_hash"
```

- [ ] Subtask 4.11: In `quickReviewWorkflow.ts`, add `buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"]` that returns exactly:

```ts
{
	type: "conditional",
	conditionSourceKey: "__terminal__",
	branches: [],
	defaultTerminal: true,
}
```

- [ ] Subtask 4.12: In `quickReviewWorkflow.ts`, add exported `buildQuickReviewStep1WorkflowForm(): WorkflowFormDefinitionPayload` that returns a form with:
  - `definitionVersion: 2`
  - `title: "Quick Review"` using the exact top-level workflow form title approved by the user after action-plan authoring review
  - `toolDictionaryTitle: "Quick Review"`
  - `toolDictionaryMarkdown: "You can get the commit hash by opening the github pane, ensuring \"graph\" is enabled, and right-clicking on the commit from the phase's implementation."`
  - `firstPanelId: QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`
  - exactly one panel keyed by `QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`
  - panel `panelId: QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`
  - panel `title: "Commit Hash"`
  - panel `promptMarkdown: "Please provide the commit hash for the phase to be reviewed"`
  - panel `allowedActions: ["submit"]`
  - panel `actionLabels: { submit: "continue" }`
  - panel `transition: buildTerminalTransition()`
  - exactly one field with:

```ts
{
	key: QUICK_REVIEW_COMMIT_HASH_FIELD_KEY,
	workflowValueKey: QuickReviewWorkflowValueKey.CommitHash,
	kind: "small_text",
	label: "commit hash",
	required: true,
	allowedValueType: "string",
}
```

- [ ] Subtask 4.13: In `quickReviewWorkflow.ts`, add `createEmptyPromptSource(): WorkflowStepPromptSource` that returns `{ kind: "none" }`.

- [ ] Subtask 4.14: In `quickReviewWorkflow.ts`, add `createStepDefinition(args: { stepNumber: 1 | 2; checklistLabel: string; decisionTree: WorkflowDecisionTree; buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]; promptTemplates?: WorkflowStepDefinition["promptTemplates"]; buildToolSchema: WorkflowStepDefinition["buildToolSchema"] }): WorkflowStepDefinition` with exactly this body:

```ts
function createStepDefinition(args: {
	stepNumber: 1 | 2
	checklistLabel: string
	decisionTree: WorkflowDecisionTree
	buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]
	promptTemplates?: WorkflowStepDefinition["promptTemplates"]
	buildToolSchema: WorkflowStepDefinition["buildToolSchema"]
}): WorkflowStepDefinition {
	const stepDefinition: WorkflowStepDefinition = {
		id: `step-${args.stepNumber}`,
		stepNumber: args.stepNumber,
		checklistLabel: args.checklistLabel,
		buildPromptSource: args.buildPromptSource ?? createEmptyPromptSource,
		buildToolSchema: args.buildToolSchema,
		decisionTree: args.decisionTree,
	}

	if (args.promptTemplates !== undefined) {
		return { ...stepDefinition, promptTemplates: args.promptTemplates }
	}

	return stepDefinition
}
```

- [ ] Subtask 4.15: In `quickReviewWorkflow.ts`, add exported `QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE` with exactly this template literal:

```ts
export const QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE = `You have been called inside a review workflow to ensure that an implemented project phase meets quality standards, was implemented as prescribed, and meets expectations for performance and functionality.
Identify the last-completed phase in the implementation spec and ask the user to confirm that your review should focus on that phase.
Implementation Spec: {workflow.spec_file}
Commit hash for the completed phase: {workflow.commit_hash}

Perform a line-by-line validation of tasks and subtasks within the assigned phase. For each task/subtask, verify that the prescribed revisions were implemented as intended by directly reviewing the relevant runtime code and tests. Do not rely on test outcomes alone; assess the code configuration associated with each task/subtask directly. If needed you can use CLI commands with the provided commit hash to identify the revisions made during phase implementation.

Next, ensure that the tasks/subtasks and their associated revisions did not miss any edge cases by performing the following analysis:

Identify every changed file, changed symbol, changed workflow value, changed tool/schema contract, changed route/action, changed persisted artifact, changed test fixture, changed validation path, changed UI surface, or changed configuration surface described by the review scope.

For each changed item, trace outward to the adjacent surfaces that could be affected:
   - callers and callees
   - imports and exports
   - type definitions and discriminated unions
   - schema builders and tool handlers
   - runtime routing and workflow values
   - persisted files, artifact metadata, and cleanup paths
   - prompt projection and continuation behavior
   - validation, error handling, retry, and terminal-error paths
   - tests and fixtures that claim to cover the behavior

Walk the boundary paths for each changed or adjacent surface. Focus on edges where values, states, files, or control flow transition:
   - missing else/default branches
   - null, empty, malformed, duplicate, stale, or missing values
   - renamed, moved, copied, or deleted files
   - partial success, retry, rollback, cancellation, timeout, or failed cleanup
   - ordering dependencies between route actions
   - stale cache, stale workflow values, or un-cleared session state
   - incompatible old callers, persisted data, or restored sessions
   - changed tests that no longer match runtime behavior

Ask, for each boundary path: “Does the current implementation actually handle this path?” Verify using the changed code and narrowly relevant adjacent code. Do not assume coverage from intent, naming, or happy-path tests.

Ask, for each changed item: “What nearby file, registration, type, schema, route, prompt, fixture, or cleanup path should have changed with this, but did not?” Treat missing adjacent updates as findings when supported by evidence.

Once review is complete, do the following:
1. Add your findings (if any) to {workflow.spec_file} at the bottom of the file with a markdown heading identifying the phase they pertain to. For each finding, include:
    - finding: a short title
    - description: a detailed explanation including:
     - what is wrong
     - the trigger condition
     - the likely consequence if not addressed
     - exact supporting code location with file path, start line, and end line for the smallest supporting line range
     - if the finding depends on multiple non-contiguous locations, include each cited location
     - what the cited code proves
2. Reopen, edit, delete, or add tasks and subtasks to the reviewed phase as needed so that a dev agent can take action based on your findings. Do not make code or test changes yourself. Do not make changes to the implementation spec beyond the task and/or subtask revisions necessary based on your findings.
3. Call attempt_completion and include:
    - A summary of your findings or statement that QA passed without findings
    - A summary of any changes made to the target phase based on findings, if applicable
    - A reminder to return to the dev agent who implemented the reviewed phase to complete new and reopened tasks/ subtasks, if applicable
    - A reminder to run the Quick Dev workflow in a fresh conversation thread for the next incomplete phase, if applicable (no findings and there are additional incomplete phases in {workflow.spec_file})

 #### workflow must end on successful use of attempt_completion`
```

- [ ] Subtask 4.16: In `quickReviewWorkflow.ts`, add `buildStep2PromptSource(): WorkflowStepPromptSource` that returns `{ kind: "current_step_instruction_template", currentStepInstructionTemplate: QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE }`.

- [ ] Subtask 4.17: In `quickReviewWorkflow.ts`, add `workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger` that returns an `event_predicate` trigger matching only `triggerEvent.kind === "workflow_form_completed"` and `triggerEvent.workflowFormId === workflowFormId`.

- [ ] Subtask 4.18: In `quickReviewWorkflow.ts`, add `attemptCompletionSucceeded(): WorkflowDecisionBranchTrigger` that returns `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }`.

- [ ] Subtask 4.19: In `quickReviewWorkflow.ts`, add `buildStep1DecisionTree(): WorkflowDecisionTree` with exactly this decision-tree shape:

```ts
function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-resolve-spec-file",
		branches: {
			"step-1-resolve-spec-file": {
				id: "step-1-resolve-spec-file",
				routes: [
					{
						id: "step-1-resolve-spec-file",
						trigger: { kind: "always" },
						action: {
							kind: "resolve_prerequisite_files",
							prerequisiteIds: [QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID],
						},
						followingBranchId: "step-1-render-commit-hash-form",
					},
				],
			},
			"step-1-render-commit-hash-form": {
				id: "step-1-render-commit-hash-form",
				routes: [
					{
						id: "step-1-render-commit-hash-form",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: QUICK_REVIEW_STEP_1_FORM_ID,
							startPanelId: QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID,
						},
						followingBranchId: "step-1-await-commit-hash-form",
					},
				],
			},
			"step-1-await-commit-hash-form": {
				id: "step-1-await-commit-hash-form",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: workflowFormCompleted(QUICK_REVIEW_STEP_1_FORM_ID),
						action: {
							kind: "transition_step",
							target: { kind: "entry_branch", stepNumber: 2 },
						},
					},
				],
			},
		},
	}
}
```

- [ ] Subtask 4.20: In `quickReviewWorkflow.ts`, add `buildStep2DecisionTree(): WorkflowDecisionTree` with exactly this decision-tree shape:

```ts
function buildStep2DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-2-project-prompt",
		branches: {
			"step-2-project-prompt": {
				id: "step-2-project-prompt",
				routes: [
					{
						id: "step-2-project-prompt",
						trigger: { kind: "always" },
						action: { kind: "project_prompt" },
						followingBranchId: "step-2-await-attempt-completion",
					},
				],
			},
			"step-2-await-attempt-completion": {
				id: "step-2-await-attempt-completion",
				routes: [
					{
						id: "step-2-complete-workflow",
						trigger: attemptCompletionSucceeded(),
						action: { kind: "complete_workflow" },
					},
				],
			},
		},
	}
}
```

- [ ] Subtask 4.21: In `quickReviewWorkflow.ts`, add exported `quickReviewWorkflowDefinition: WorkflowDefinition` with:
  - `name: QUICK_REVIEW_WORKFLOW_NAME`
  - `displayName: QUICK_REVIEW_WORKFLOW_DISPLAY_NAME`
  - `description: QUICK_REVIEW_WORKFLOW_DESCRIPTION`
  - `slashCommandName: QUICK_REVIEW_WORKFLOW_SLASH_COMMAND_NAME`
  - `useSkillName: QUICK_REVIEW_WORKFLOW_USE_SKILL_NAME`
  - `persona: QUICK_REVIEW_WORKFLOW_PERSONA`
  - `projectSubfolder: QUICK_REVIEW_WORKFLOW_PROJECT_SUBFOLDER`
  - `workflowValueKeys: QUICK_REVIEW_WORKFLOW_VALUE_KEYS`
  - `entryProjectValueKeys: QUICK_REVIEW_ENTRY_PROJECT_VALUE_KEYS`
  - `entryPanel: { promptMarkdown: QUICK_REVIEW_WORKFLOW_DESCRIPTION }`
  - `workflowForms: { [QUICK_REVIEW_STEP_1_FORM_ID]: buildQuickReviewStep1WorkflowForm() }`
  - `prerequisiteFiles: QUICK_REVIEW_PREREQUISITE_FILES`
  - `steps` with exactly two keys:
    - `"step-1"` created with `stepNumber: 1`, `checklistLabel: "Gather Commit Info"`, `decisionTree: buildStep1DecisionTree()`, and `buildToolSchema: buildQuickReviewStep1ToolSchemas`
    - `"step-2"` created with `stepNumber: 2`, `checklistLabel: "Perform Quality Review"`, `decisionTree: buildStep2DecisionTree()`, `buildPromptSource: buildStep2PromptSource`, `promptTemplates: [QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE]`, and `buildToolSchema: buildQuickReviewStep2ToolSchemas`.

- [ ] Subtask 4.22: Confirm that `quickReviewWorkflowDefinition` does not define `artifacts` and does not define `childInheritance`.

### [ ] Task 5: Add Quick Review Workflow Definition Tests

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewWorkflow.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 5.1: Add `src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewWorkflow.test.ts` with these exact imports: `import { expect } from "chai"`, `import { describe, it } from "mocha"`, a type-only named import from `../../../types` containing `ActiveWorkflowSession`, `WorkflowBranchTriggerEvent`, `WorkflowDecisionBranchEvaluationInput`, `WorkflowDecisionBranchRoute`, `WorkflowPromptBuilderInput`, `WorkflowStepDefinition`, and `WorkflowValues`; `import { renderWorkflowPromptTemplate } from "../../../workflowPromptTemplates"`; a named import from `../quickReviewWorkflow` containing `QUICK_REVIEW_COMMIT_HASH_FIELD_KEY`, `QUICK_REVIEW_ENTRY_PROJECT_VALUE_KEYS`, `QUICK_REVIEW_PREREQUISITE_FILES`, `QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID`, `QUICK_REVIEW_STEP_1_FORM_ID`, `QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`, `QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE`, `QUICK_REVIEW_WORKFLOW_DESCRIPTION`, `QUICK_REVIEW_WORKFLOW_PERSONA`, `QUICK_REVIEW_WORKFLOW_VALUE_KEYS`, `QuickReviewWorkflowValueKey`, `buildQuickReviewStep1WorkflowForm`, and `quickReviewWorkflowDefinition`; and a named import from `../quickReviewToolSchemas` containing `buildQuickReviewStep1ToolSchemas` and `buildQuickReviewStep2ToolSchemas`.

- [ ] Subtask 5.2: In `quickReviewWorkflow.test.ts`, add constants `TEST_SPEC_FILE = "/tmp/quick-review-project/review/quick-spec.md"` and `TEST_COMMIT_HASH = "abc1234"`.

- [ ] Subtask 5.3: In `quickReviewWorkflow.test.ts`, add these exact helpers:
  - `getStep(stepId: WorkflowStepDefinition["id"]): WorkflowStepDefinition` that assigns `const step = quickReviewWorkflowDefinition.steps[stepId]`, throws `new Error(\`Missing quick-review step ${stepId}.\`)` when `step === undefined`, and returns `step`;
  - `findStepRoute(stepId: WorkflowStepDefinition["id"], branchId: string, routeId: string): WorkflowDecisionBranchRoute` that calls `getStep(stepId)`, assigns `const branch = step.decisionTree.branches[branchId]`, throws `new Error(\`Missing quick-review branch ${branchId}.\`)` when `branch === undefined`, assigns `const route = branch.routes.find((candidate) => candidate.id === routeId)`, throws `new Error(\`Missing quick-review route ${branchId}/${routeId}.\`)` when `route === undefined`, and returns `route`;
  - `createWorkflowValues(): WorkflowValues` with exactly this return object:

```ts
{
	[QuickReviewWorkflowValueKey.ProjectMode]: "existing",
	[QuickReviewWorkflowValueKey.ProjectTitle]: "Quick Review Test Project",
	[QuickReviewWorkflowValueKey.ProjectFolderName]: "quick-review-project",
	[QuickReviewWorkflowValueKey.SpecFile]: TEST_SPEC_FILE,
	[QuickReviewWorkflowValueKey.CommitHash]: TEST_COMMIT_HASH,
}
```

  - `createSession(args: { activeStepNumber: 1 | 2; activeBranchId: string; workflowValues?: WorkflowValues }): ActiveWorkflowSession` with exactly this return object shape:

```ts
{
	activeStepNumber: args.activeStepNumber,
	workflowValues: args.workflowValues ?? createWorkflowValues(),
	projectSelection: {
		projectMode: "existing",
		projectTitle: "Quick Review Test Project",
		projectFolderName: "quick-review-project",
	},
	lifecycle: { projectSelectionCompleted: true },
	entryArtifactResolution: undefined,
	ui: {
		formSession: undefined,
		stepResolutionSession: undefined,
		suppressedWorkflowFormIds: [],
		suppressedWorkflowStepResolutionRoutes: [],
	},
	branchContext: { activeBranchId: args.activeBranchId },
}
```

  - `createPredicateInput(args: { activeStepNumber: 1 | 2; activeBranchId: string; workflowValues?: WorkflowValues; step: WorkflowStepDefinition; triggerEvent: WorkflowBranchTriggerEvent }): WorkflowDecisionBranchEvaluationInput & { triggerEvent: WorkflowBranchTriggerEvent }` with `const workflowValues = args.workflowValues ?? createWorkflowValues()`, `activeBranchId: args.activeBranchId`, `workflowValues`, `step: args.step`, `session: createSession({ activeStepNumber: args.activeStepNumber, activeBranchId: args.activeBranchId, workflowValues })`, and `triggerEvent: args.triggerEvent`;
  - `workflowFormCompletedEvent(workflowFormId: string): WorkflowBranchTriggerEvent` returning `{ kind: "workflow_form_completed", workflowFormId }`;
  - `attemptCompletionSucceededEvent(): WorkflowBranchTriggerEvent` returning `{ kind: "attempt_completion_succeeded" }`;
  - `createPromptInput(stepId: "step-1" | "step-2"): WorkflowPromptBuilderInput` that assigns `const step = getStep(stepId)`, assigns `const activeStepNumber = stepId === "step-1" ? 1 : 2`, and returns `{ step, session: createSession({ activeStepNumber, activeBranchId: step.decisionTree.entryBranchId }) }`;
  - `renderStep2Prompt(): string` that renders `QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE` with `renderWorkflowPromptTemplate`, `QUICK_REVIEW_WORKFLOW_VALUE_KEYS`, `createWorkflowValues()`, and context `"quick-review step-2 test"`.

- [ ] Subtask 5.4: In `quickReviewWorkflow.test.ts`, add a test that asserts workflow identity, description, slash command, skill name, project subfolder, persona, entry panel prompt, value keys, entry project value keys, workflow form keys, step keys, step numbers, and checklist labels exactly match Task 4. In the same test, assert `quickReviewWorkflowDefinition.prerequisiteFiles?.[QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID]` deeply equals the Task 4 prerequisite object with `requirement: "required"`, `producingWorkflowName: "quick-spec"`, `projectSubfolderSegments: ["review"]`, `match: { kind: "exact_filename", filename: "quick-spec.md" }`, `workflowValueKey: QuickReviewWorkflowValueKey.SpecFile`, and `outputDocumentReference: "none"`.

- [ ] Subtask 5.5: In `quickReviewWorkflow.test.ts`, add a test that asserts `quickReviewWorkflowDefinition.artifacts` and `quickReviewWorkflowDefinition.childInheritance` are `undefined`.

- [ ] Subtask 5.6: In `quickReviewWorkflow.test.ts`, add a test that asserts `quickReviewWorkflowDefinition.name`, `quickReviewWorkflowDefinition.slashCommandName`, and `quickReviewWorkflowDefinition.useSkillName` each equal `"quick-review"` and none equals `"quick-review.md"`.

- [ ] Subtask 5.7: In `quickReviewWorkflow.test.ts`, add a test that first assigns `const workflowForms = quickReviewWorkflowDefinition.workflowForms`, asserts `workflowForms` is not `undefined`, throws `new Error("Expected Quick Review workflow forms.")` if `workflowForms === undefined`, and then asserts `buildQuickReviewStep1WorkflowForm()` and `workflowForms[QUICK_REVIEW_STEP_1_FORM_ID]` deeply equal the exact Step 1 form prescribed in Task 4, including `definitionVersion`, `title`, `toolDictionaryTitle`, `toolDictionaryMarkdown`, panel title, panel prompt, allowed actions, action labels, terminal transition, field key, `workflowValueKey`, field kind, label, `required`, and `allowedValueType`.

- [ ] Subtask 5.8: In `quickReviewWorkflow.test.ts`, add a test that asserts the Step 1 decision tree:
  - starts at `"step-1-resolve-spec-file"`;
  - resolves `QUICK_REVIEW_SPEC_FILE_PREREQUISITE_ID`;
  - renders `QUICK_REVIEW_STEP_1_FORM_ID` at `QUICK_REVIEW_STEP_1_PANEL_A_COMMIT_HASH_ID`;
  - transitions to Step 2 only when a `workflow_form_completed` event for `QUICK_REVIEW_STEP_1_FORM_ID` is supplied;
  - does not transition when a `workflow_form_completed` event for a different form id is supplied;
  - has no route whose action kind is `"project_prompt"`;
  - has no route whose action kind is `"complete_workflow"`.

- [ ] Subtask 5.9: In `quickReviewWorkflow.test.ts`, add a test that asserts the Step 2 decision tree:
  - starts at `"step-2-project-prompt"`;
  - uses the `project_prompt` action in branch `"step-2-project-prompt"`;
  - waits at `"step-2-await-attempt-completion"`;
  - uses the `complete_workflow` action only for an `attempt_completion_succeeded` event;
  - has no route whose action kind is `"transition_step"`.

- [ ] Subtask 5.10: In `quickReviewWorkflow.test.ts`, add a test that assigns `const promptInput = createPromptInput("step-1")`, asserts `getStep("step-1").buildPromptSource(promptInput)` returns `{ kind: "none" }`, and asserts `getStep("step-1").buildToolSchema(promptInput)` returns `buildQuickReviewStep1ToolSchemas()`.

- [ ] Subtask 5.11: In `quickReviewWorkflow.test.ts`, add a test that renders Step 2 instructions and asserts prompt-template invariants without asserting editable prompt prose:
  - `const renderedOutput = renderStep2Prompt()`
  - `expect(renderedOutput.trim()).to.not.equal("")`
  - `expect(renderedOutput).to.include(TEST_SPEC_FILE)`
  - `expect(renderedOutput).to.include(TEST_COMMIT_HASH)`
  - `expect(renderedOutput).to.include("attempt_completion")`
  - `expect(renderedOutput).to.not.equal(QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE)`

- [ ] Subtask 5.12: In `quickReviewWorkflow.test.ts`, add a test that renders Step 2 instructions and asserts the rendered output does not include:
  - `{workflow.spec_file}`
  - `{workflow.commit_hash}`
  - `workflow.spec_file`
  - `workflow.commit_hash`
  - `# Module metadata:`
  - `# Persona`
  - `# Prerequisite Files`
  - `### Prompt`
  - `# Tool Schema Override`
  - `# Focus Chain Tasks`
  - `# Workflow Steps`
  - `Workflow Form 1:`
  - `Panel A:`
  - `Field:`
  - `allowedActions/ Labels:`

- [ ] Subtask 5.13: In `quickReviewWorkflow.test.ts`, add a test that assigns `const promptInput = createPromptInput("step-2")`, asserts `getStep("step-2").buildToolSchema(promptInput)` returns `buildQuickReviewStep2ToolSchemas()`, and asserts `getStep("step-2").promptTemplates` exactly equals `[QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE]`.

- [ ] Subtask 5.14: In `quickReviewWorkflow.test.ts`, add a test that serializes `quickReviewWorkflowDefinition` and asserts the serialized definition does not include:
  - `artifacts`
  - `childInheritance`
  - `build_workflow_document`
  - `create_workflow_artifact`
  - `archive_workflow_artifact`
  - `delete_workflow_artifact`
  - `move_workflow_project_file`
  - `set_workflow_values`
  - `ask_followup_question`
  - `workflow_progress_request`
  - `use_subagents`
  - `use_skill`
  - `record_findings`
  - `quick-review.md`
  - `.cline/workflow-config.yaml`
  - `bmad`
  - `BMAD`

### [ ] Task 6: Validate Phase 2

Allowed files for this task and every numbered subtask below:

- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 6.1: Run:

```sh
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewWorkflow.test.ts
```

- [ ] Subtask 6.2: Run:

```sh
npm run check-types
```

If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run:

```sh
npm run protos
```

Then rerun:

```sh
npm run check-types
```

- [ ] Subtask 6.3: Run:

```sh
npm run lint
```

## Phase 3: Registration And Prompt Projection

### [ ] Task 7: Add Quick Review Module Index

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/workflow-modules/quick-review/index.ts`
- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 7.1: Add `src/core/task/workflow-runtime/workflow-modules/quick-review/index.ts` with exactly:

```ts
export * from "./quickReviewToolSchemas"
export * from "./quickReviewWorkflow"
```

### [ ] Task 8: Register Quick Review Workflow

Allowed files for this task and every numbered subtask below:

- `src/core/task/workflow-runtime/WorkflowRegistry.ts`
- `src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewWorkflow.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 8.1: In `WorkflowRegistry.ts`, import `quickReviewWorkflowDefinition` from `@/core/task/workflow-runtime/workflow-modules/quick-review`.

- [ ] Subtask 8.2: In `WorkflowRegistry.ts`, add `quickReviewWorkflowDefinition` to the registered workflow definitions array immediately after `quickDevWorkflowDefinition`.

- [ ] Subtask 8.3: Confirm that no `.md` alias, `quick-review.md` alias, or source-document path is added to `WorkflowRegistry.ts`.

- [ ] Subtask 8.4: In `quickReviewWorkflow.test.ts`, add a named import from `../../../WorkflowRegistry` containing `resolveWorkflowBySlashCommand`, `resolveWorkflowByUseSkillName`, and `resolveWorkflowDefinition`.

- [ ] Subtask 8.5: In `quickReviewWorkflow.test.ts`, add a registry test that asserts `resolveWorkflowDefinition("quick-review")`, `resolveWorkflowBySlashCommand("quick-review")`, and `resolveWorkflowByUseSkillName("quick-review")` all return `quickReviewWorkflowDefinition`, and asserts `resolveWorkflowDefinition("quick-review.md")`, `resolveWorkflowBySlashCommand("quick-review.md")`, and `resolveWorkflowByUseSkillName("quick-review.md")` all return `undefined`.

### [ ] Task 9: Add Quick Review Prompt Projection Tests

Allowed files for this task and every numbered subtask below:

- `src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 9.1: In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, import `QuickReviewWorkflowValueKey`, `buildQuickReviewStep1ToolSchemas`, `buildQuickReviewStep2ToolSchemas`, and `quickReviewWorkflowDefinition` from `@/core/task/workflow-runtime/workflow-modules/quick-review`.

- [ ] Subtask 9.2: In `integration.test.ts`, add constants:

```ts
const QUICK_REVIEW_SPEC_FILE = "/test/project/docs/projects/quick-review-project/review/quick-spec.md"
const QUICK_REVIEW_COMMIT_HASH = "abc1234"
```

- [ ] Subtask 9.3: In `integration.test.ts`, add `type QuickReviewPromptStepNumber = 1 | 2`.

- [ ] Subtask 9.4: In `integration.test.ts`, add `createQuickReviewWorkflowValues(): WorkflowValues` that returns:
  - `[QuickReviewWorkflowValueKey.ProjectMode]: "existing"`
  - `[QuickReviewWorkflowValueKey.ProjectTitle]: "Quick Review Prompt Project"`
  - `[QuickReviewWorkflowValueKey.ProjectFolderName]: "quick-review-project"`
  - `[QuickReviewWorkflowValueKey.SpecFile]: QUICK_REVIEW_SPEC_FILE`
  - `[QuickReviewWorkflowValueKey.CommitHash]: QUICK_REVIEW_COMMIT_HASH`

- [ ] Subtask 9.5: In `integration.test.ts`, add this exact helper:

```ts
function getQuickReviewEntryBranchId(activeStepNumber: QuickReviewPromptStepNumber): string {
	switch (activeStepNumber) {
		case 1:
			return quickReviewWorkflowDefinition.steps["step-1"].decisionTree.entryBranchId
		case 2:
			return quickReviewWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId
		default: {
			const exhaustiveCheck: never = activeStepNumber
			return exhaustiveCheck
		}
	}
}
```

- [ ] Subtask 9.6: In `integration.test.ts`, add `createQuickReviewWorkflowSession(activeStepNumber: QuickReviewPromptStepNumber): ActiveWorkflowSession` using:
  - `activeStepNumber`
  - `workflowValues: createQuickReviewWorkflowValues()`
  - `projectSelection` with `projectMode: "existing"`, `projectTitle: "Quick Review Prompt Project"`, and `projectFolderName: "quick-review-project"`
  - `lifecycle: { projectSelectionCompleted: true }`
  - `entryArtifactResolution: undefined`
  - `ui.formSession: undefined`, `ui.stepResolutionSession: undefined`, `ui.suppressedWorkflowFormIds: []`, and `ui.suppressedWorkflowStepResolutionRoutes: []`
  - `branchContext.activeBranchId: getQuickReviewEntryBranchId(activeStepNumber)`

- [ ] Subtask 9.7: In `integration.test.ts`, add this exact helper:

```ts
const buildQuickReviewPromptContext = async (
	activeStepNumber: QuickReviewPromptStepNumber,
): Promise<SystemPromptContext & WorkflowPromptProjection> => {
	const workspacePathPolicy: WorkflowWorkspacePathPolicy = { validateAccess: () => true }
	const runtime = new WorkflowRuntime({ cwd: "/test/project", workspacePathPolicy })
	const taskState = new TaskState()
	taskState.activeWorkflowName = quickReviewWorkflowDefinition.name
	taskState.activeWorkflowSession = createQuickReviewWorkflowSession(activeStepNumber)
	taskState.apiRequestCount = 1
	const workflowProjection = await runtime.buildTurnProjection({ taskState })
	return {
		...baseContext,
		mcpHub: makeMcpHub([]),
		providerInfo: makeProviderInfo("gpt-5-codex", "openai"),
		enableNativeToolCalls: true,
		useMinimalGptPrompt: true,
		...workflowProjection,
	}
}
```

- [ ] Subtask 9.8: In `integration.test.ts`, add a test that projects Step 1 and asserts:
  - `const context = await buildQuickReviewPromptContext(1)`;
  - `const workflowInputPayloadBlock = context.workflowInputPayloadBlock`;
  - `if (workflowInputPayloadBlock === undefined || workflowInputPayloadBlock.length === 0) { throw new Error("Expected quick-review Step 1 workflow input payload block.") }`;
  - `workflowToolSchemaOverride` deeply equals `buildQuickReviewStep1ToolSchemas()`;
  - projected native tool names are `[]`;
  - the workflow input payload includes `Workflow:\nquick review`;
  - the workflow input payload includes `Name: Fred`;
  - the workflow input payload includes `Role: Quality Control`;
  - the workflow input payload includes `Step 1: Gather Commit Info`;
  - the workflow input payload does not include `CURRENT STEP DETAILED INSTRUCTIONS`;
  - the workflow input payload does not include `Please provide the commit hash for the phase to be reviewed`;
  - the system prompt does not include `Please provide the commit hash for the phase to be reviewed`.

- [ ] Subtask 9.9: In `integration.test.ts`, add a test that projects Step 2 and asserts prompt-projection invariants without asserting editable prompt prose:
  - `const context = await buildQuickReviewPromptContext(2)`;
  - `const workflowInputPayloadBlock = context.workflowInputPayloadBlock`;
  - `if (workflowInputPayloadBlock === undefined || workflowInputPayloadBlock.length === 0) { throw new Error("Expected quick-review Step 2 workflow input payload block.") }`;
  - `workflowToolSchemaOverride` deeply equals `buildQuickReviewStep2ToolSchemas()`;
  - projected native tool names exactly equal `["execute_command", "list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "attempt_completion"]`;
  - the workflow input payload includes `Step 2: Perform Quality Review`;
  - `expect(workflowInputPayloadBlock).to.include(QUICK_REVIEW_SPEC_FILE)`;
  - `expect(workflowInputPayloadBlock).to.include(QUICK_REVIEW_COMMIT_HASH)`;
  - `expect(workflowInputPayloadBlock).to.include("attempt_completion")`;
  - the workflow input payload does not include `{workflow.spec_file}`;
  - the workflow input payload does not include `{workflow.commit_hash}`;
  - the workflow input payload does not include `workflow.spec_file`;
  - the workflow input payload does not include `workflow.commit_hash`;
  - the workflow input payload does not include `# Module metadata:`;
  - the workflow input payload does not include `# Persona`;
  - the workflow input payload does not include `# Prerequisite Files`;
  - the workflow input payload does not include `### Prompt`;
  - the workflow input payload does not include `# Tool Schema Override`;
  - the workflow input payload does not include `# Focus Chain Tasks`;
  - the workflow input payload does not include `# Workflow Steps`;
  - the workflow input payload does not include `Workflow Form 1:`;
  - the workflow input payload does not include `Panel A:`;
  - the workflow input payload does not include `Field:`;
  - the workflow input payload does not include `allowedActions/ Labels:`;
  - `expect(systemPrompt).to.not.include(QUICK_REVIEW_SPEC_FILE)`;
  - `expect(systemPrompt).to.not.include(QUICK_REVIEW_COMMIT_HASH)`.

- [ ] Subtask 9.10: In `integration.test.ts`, add this exact response-tool guidance test; do not assert raw unbackticked `attempt_completion` or `workflow_progress_request` text against the full system prompt:

```ts
it("renders quick-review response-tool guidance only for active response tools", async function () {
	const step1Context = await buildQuickReviewPromptContext(1)
	await runPromptTest(this, step1Context, "gpt-5-codex", async ({ systemPrompt }) => {
		expectResponseToolNames(systemPrompt, [], ["`attempt_completion`", "`workflow_progress_request`"])
	})

	const step2Context = await buildQuickReviewPromptContext(2)
	await runPromptTest(this, step2Context, "gpt-5-codex", async ({ systemPrompt }) => {
		expectResponseToolNames(systemPrompt, ["`attempt_completion`"], ["`workflow_progress_request`"])
	})
})
```

- [ ] Subtask 9.11: In `integration.test.ts`, add a test that inspects only the projected Quick Review tool names for Step 1 and Step 2 and asserts these strings are absent from both projected tool-name arrays:
  - `workflow_progress_request`
  - `ask_followup_question`
  - `set_workflow_values`
  - `build_workflow_document`
  - `create_workflow_artifact`
  - `archive_workflow_artifact`
  - `delete_workflow_artifact`
  - `move_workflow_project_file`
  - `use_subagents`
  - `use_skill`
  - `web_search`
  - `web_fetch`
  - `browser_action`
  - `use_mcp_tool`
  - `access_mcp_resource`
  - `load_mcp_documentation`
  - `plan_story_artifacts`
  - `plan_remediation_story_artifact`
  - `generate_story_files`
  - `update_story_index_status`
  - `record_findings`

### [ ] Task 10: Add Quick Review Slash Command Test

Allowed files for this task and every numbered subtask below:

- `src/test/slash-commands.test.ts`
- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 10.1: In `src/test/slash-commands.test.ts`, add a test named `includes the registered quick-review workflow slash command`.

- [ ] Subtask 10.2: In the new slash-command test, assert the command list includes a command with:
  - `name: "quick-review"`
  - `section: "custom"`
  - `cliCompatible: true`
  - `description: "Shipped workflow: quick-review"`

- [ ] Subtask 10.3: Confirm that no `.md` slash-command alias is asserted or introduced for Quick Review.

### [ ] Task 11: Validate Phase 3

Allowed files for this task and every numbered subtask below:

- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 11.1: Run:

```sh
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewWorkflow.test.ts
```

- [ ] Subtask 11.2: Run:

```sh
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
```

- [ ] Subtask 11.3: Run:

```sh
npm run test:unit -- src/test/slash-commands.test.ts
```

- [ ] Subtask 11.4: Run:

```sh
npm run check-types
```

If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run:

```sh
npm run protos
```

Then rerun:

```sh
npm run check-types
```

- [ ] Subtask 11.5: Run:

```sh
npm run lint
```

## Phase 4: Final Validation And Scope Review

### [ ] Task 12: Run Static Guard Checks

Allowed files for this task and every numbered subtask below:

- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 12.1: Run this static guard and confirm it returns no matches:

```sh
rg -n "quick-review\\.md|/Users/robertboston/Documents/Cline/Workflows/quick-review\\.md|\\.cline/workflow-config\\.yaml|bmad|BMAD" src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewWorkflow.ts src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewToolSchemas.ts src/core/task/workflow-runtime/workflow-modules/quick-review/index.ts src/core/task/workflow-runtime/WorkflowRegistry.ts
```

- [ ] Subtask 12.2: Run this static guard and confirm it returns no matches:

```sh
rg -n "set_workflow_values|ask_followup_question|workflow_progress_request|build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|use_subagents|use_skill|web_search|web_fetch|browser_action|use_mcp_tool|access_mcp_resource|load_mcp_documentation|record_findings|plan_story_artifacts|plan_remediation_story_artifact|generate_story_files|update_story_index_status" src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewToolSchemas.ts
```

- [ ] Subtask 12.3: Run this static guard and confirm it returns no matches:

```sh
rg -n "artifacts:|childInheritance:|build_workflow_document|create_workflow_artifact" src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewWorkflow.ts
```

- [ ] Subtask 12.4: Run this static guard and confirm it returns no matches:

```sh
rg -n "# Module metadata:|# Persona|# Prerequisite Files|# Tool Schema Override|# Focus Chain Tasks|# Workflow Steps|### Prompt|Workflow Form 1:|Panel A:|Field:|allowedActions/ Labels:" src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewWorkflow.ts
```

- [ ] Subtask 12.5: Run this static guard and confirm the output only shows the two named Quick Review schema builders, Step 1's `return []`, `QUICK_REVIEW_STEP_2_TOOL_IDS`, the `return QUICK_REVIEW_STEP_2_TOOL_IDS.map((toolId) => resolveQuickReviewSharedToolSpec(toolId))` line, and the ten prescribed Step 2 `ClineDefaultTool` entries from Task 1:

```sh
rg -n "buildQuickReviewStep1ToolSchemas|buildQuickReviewStep2ToolSchemas|return \\[\\]|QUICK_REVIEW_STEP_2_TOOL_IDS|ClineDefaultTool\\." src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewToolSchemas.ts
```

### [ ] Task 13: Run Final Validation Commands

Allowed files for this task and every numbered subtask below:

- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 13.1: Run:

```sh
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewWorkflow.test.ts
```

- [ ] Subtask 13.2: Run:

```sh
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
```

- [ ] Subtask 13.3: Run:

```sh
npm run test:unit -- src/test/slash-commands.test.ts
```

- [ ] Subtask 13.4: Run:

```sh
npm run check-types
```

If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run:

```sh
npm run protos
```

Then rerun:

```sh
npm run check-types
```

- [ ] Subtask 13.5: Run:

```sh
npm run lint
```

- [ ] Subtask 13.6: Run:

```sh
npm run package
```

If `npm run package` fails before packaging because generated proto files are missing or host probing fails, run:

```sh
npm run protos
```

Then rerun:

```sh
npm run package
```

### [ ] Task 14: Run Scope-Diff Review

Allowed files for this task and every numbered subtask below:

- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 14.1: Run:

```sh
git diff --name-only
```

- [ ] Subtask 14.2: Run:

```sh
git ls-files --others --exclude-standard
```

- [ ] Subtask 14.3: Confirm persistent diffs are limited to:
  - `src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewToolSchemas.ts`
  - `src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewToolSchemas.test.ts`
  - `src/core/task/workflow-runtime/workflow-modules/quick-review/quickReviewWorkflow.ts`
  - `src/core/task/workflow-runtime/workflow-modules/quick-review/__tests__/quickReviewWorkflow.test.ts`
  - `src/core/task/workflow-runtime/workflow-modules/quick-review/index.ts`
  - `src/core/task/workflow-runtime/WorkflowRegistry.ts`
  - `src/core/prompts/system-prompt/__tests__/integration.test.ts`
  - `src/test/slash-commands.test.ts`
  - `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 14.4: If `docs/workflows/workflow-runtime/workflow-modules/quick-review/quick-review-requirements.md` or `docs/workflows/workflow-runtime/workflow-modules/quick-review/quick-review.md` appear as pre-existing untracked or modified files, do not edit them and report them as pre-existing source/requirements diffs in the final implementation response.

### [ ] Task 15: Final Action-Plan Compliance Review

Allowed files for this task and every numbered subtask below:

- `docs/workflows/workflow-runtime/workflow-modules/quick-review/action-plan.md`

- [ ] Subtask 15.1: Reread `docs/action-plan-guide.md`.

- [ ] Subtask 15.2: Perform a line-by-line review of this action plan against `docs/action-plan-guide.md` before reporting completion.

- [ ] Subtask 15.3: Confirm that every task and subtask in this action plan has:
  - a checkbox;
  - a current-phase allowed-files list;
  - exact file paths;
  - exact symbols, strings, prompts, form labels, route ids, tool names, or commands where implementation depends on them;
  - verification instructions tied to the specific behavior being changed.

- [ ] Subtask 15.4: Confirm that no subtask asks the implementer to infer implementation details from requirements, update files outside its allowed-files list, create broad compatibility aliases, or make opportunistic refactors.

## Compliance Matrix

Each row covers the listed task and every numbered subtask range named in the first column.

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Task 1 and Subtasks 1.1-1.6 | Quick Review Requirements: tool schema override; module build guide: module-owned tool schemas | `quickReviewToolSchemas.ts` | `QUICK_REVIEW_STEP_2_TOOL_IDS`, `buildQuickReviewStep1ToolSchemas`, `buildQuickReviewStep2ToolSchemas`, `resolveQuickReviewSharedToolSpec` | `registerClineToolSets`, `ClineToolSet.getToolByNameWithFallback`, `ClineDefaultTool`, `ModelFamily.NATIVE_GPT_5`, `ClineToolSpec` | Excludes Step 1 tools and every forbidden Quick Review model-facing tool from builders | Task 2 tests; Task 3 validation |
| Task 2 and Subtasks 2.1-2.9 | Quick Review Requirements: test coverage and forbidden tools | `quickReviewToolSchemas.test.ts` | `EXPECTED_STEP_2_TOOL_NAMES`, `FORBIDDEN_MODEL_FACING_TOOL_NAMES`, `expectedSharedToolSpecs` | Mocha/Chai unit test structure and shared tool-set lookup | Covers absent forbidden tools so stale schema exposure is caught | `npm run test:unit -- ...quickReviewToolSchemas.test.ts` |
| Task 3 and Subtasks 3.1-3.3 | Module build guide: validate each completed phase | Action plan only | Focused tool-schema test command, `npm run check-types`, `npm run protos`, `npm run lint` | Repo-supported validation scripts from `package.json` | Proto fallback prevents host/proto setup failures from being misclassified as code defects | Command output |
| Task 4 and Subtasks 4.1-4.22 | Quick Review Requirements: workflow identity, variables, form, prompt, routing, completion | `quickReviewWorkflow.ts` | `quickReviewWorkflowDefinition`, `QuickReviewWorkflowValueKey`, `QUICK_REVIEW_PREREQUISITE_FILES`, `QUICK_REVIEW_STEP_2_PROMPT_TEMPLATE`, form ids, route ids | `WorkflowDefinition`, `WorkflowStepDefinition`, `WorkflowDecisionTree`, `WorkflowFormDefinitionPayload`, `WorkflowStepPromptSource` | Excludes `artifacts`, `childInheritance`, backend tools, AI-writable value tools, markdown aliases, source-doc dependency | Task 5 tests; Task 6 validation |
| Task 5 and Subtasks 5.1-5.14 | Quick Review Requirements: direct workflow definition validation | `quickReviewWorkflow.test.ts` | Workflow constants, form builder, decision-tree routes, prompt template, schema builders | `ActiveWorkflowSession`, `WorkflowBranchTriggerEvent`, `WorkflowDecisionBranchEvaluationInput`, `WorkflowValues`, `renderWorkflowPromptTemplate` | Negative assertions cover stale aliases, raw placeholders, source-doc markers, and forbidden runtime capabilities | `npm run test:unit -- ...quickReviewWorkflow.test.ts` |
| Task 6 and Subtasks 6.1-6.3 | Module build guide: validate after workflow definition | Action plan only | Focused module test command, `npm run check-types`, `npm run protos`, `npm run lint` | Repo-supported validation scripts from `package.json` | Proto fallback prevents environment setup failures from masking TypeScript defects | Command output |
| Task 7 and Subtask 7.1 | Module build guide: module index export convention | `index.ts` | `quickReviewToolSchemas`, `quickReviewWorkflow` exports | Existing module barrel export convention | No downstream import fallout because Task 8 and Task 9 import from the module index | Task 9 and Task 11 validation |
| Task 8 and Subtasks 8.1-8.5 | Workflow runtime requirements: registered workflow availability | `WorkflowRegistry.ts`, `quickReviewWorkflow.test.ts` | `quickReviewWorkflowDefinition`, workflow definition array, `resolveWorkflowDefinition`, `resolveWorkflowBySlashCommand`, `resolveWorkflowByUseSkillName` | Registry lookup by `name`, `slashCommandName`, and `useSkillName` | Prohibits `.md` alias and source-document path registration | Task 8 registry tests; Task 10 slash-command test |
| Task 9 and Subtasks 9.1-9.11 | Workflow runtime requirements: prompt and tool projection | `integration.test.ts` | `QuickReviewWorkflowValueKey`, Quick Review prompt-session helpers, Step 1/Step 2 projected tool assertions | Active workflow prompt-test harness, workflow input payload projection, native tool-name extraction | Negative assertions cover raw placeholders, source headings, form text leakage, and forbidden projected tools | `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts` |
| Task 10 and Subtasks 10.1-10.3 | Workflow runtime requirements: shipped slash command discovery | `slash-commands.test.ts` | `quick-review` slash command name, `section: "custom"`, `cliCompatible: true`, and description | Existing slash-command test harness | Prohibits `.md` slash-command alias | `npm run test:unit -- src/test/slash-commands.test.ts` |
| Task 11 and Subtasks 11.1-11.5 | Module build guide: validate after registration and prompt projection | Action plan only | Focused module tests, prompt integration test, slash-command test, `npm run check-types`, `npm run protos`, `npm run lint` | Repo-supported validation scripts from `package.json` | Proto fallback prevents generated-file setup failures from masking implementation defects | Command output |
| Task 12 and Subtasks 12.1-12.5 | Quick Review Requirements: source-doc independence, source-heading exclusion, Step 1 empty schema, Step 2 exact schema, and forbidden capabilities | Action plan only | Static `rg` guards for source-doc paths, BMAD markers, forbidden tools, artifact/document builder markers, source authoring labels, and Quick Review schema declarations | `rg` static validation command shape | Guards stale aliases, source markdown dependency, unauthorized tool/document/artifact exposure, source-heading leakage, Step 1 tool exposure, and Step 2 schema drift | `rg` output |
| Task 13 and Subtasks 13.1-13.6 | Module build guide: final validation | Action plan only | Focused module tests, prompt integration test, slash-command test, `npm run check-types`, `npm run protos`, `npm run lint`, `npm run package` | Repo-supported validation scripts from `package.json` | Proto fallback for typecheck and package prevents environment setup failures from masking defects | Command output |
| Task 14 and Subtasks 14.1-14.4 | Action plan guide: scope-diff review | Action plan only | `git diff --name-only`, `git ls-files --others --exclude-standard`, authorized file allowlist | Git tracked and untracked diff commands | Reports pre-existing source/requirements diffs without editing them | Scope-diff command output |
| Task 15 and Subtasks 15.1-15.4 | Action plan guide: final line-by-line compliance review | Action plan only | `docs/action-plan-guide.md`, task/subtask checkboxes, allowed files, exact symbols, exact commands | Action-plan guide final audit procedure | Blocks inferred work, broad aliases, out-of-scope edits, and opportunistic refactors before final response | Manual line-by-line review |
