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

This plan updates the already-built `validate-story` workflow module for parent-assigned child/subagent execution, using [validate-story-subagent-update-requirements.md](./validate-story-subagent-update-requirements.md) as the backing requirements document.

This is a new update action plan. Do not edit [action-plan.md](./action-plan.md), which belongs to the initial validate-story module build.

## Scope Boundary

- Do not edit `docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md`.
- Do not edit `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-requirements.md`.
- Do not edit `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story.md`.
- Do not edit `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-requirements.md`.
- Do not change validate-story identity, persona, prerequisite declarations, registry registration, or Step 1 tool schema order.
- Do not add validate-story workflow artifacts, document builders, workflow-specific forms, AI-writable workflow values, backend tools, or model-facing backend-only runtime tools.
- Do not add exact full-prompt snapshot assertions for editable prompt prose; use prompt shape, materialized workflow-value, forbidden-marker, non-selected-section, and projected-tool invariants.

## Known Pre-Existing Diffs

The scope-diff validation in this plan must allow these pre-existing documentation diffs to remain present without treating them as implementation scope violations:

- `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story.md`
- `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-requirements.md`
- `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-action-plan.md`

## Requirement Trace

| Requirement | Required Behavior | Owning Files |
| --- | --- | --- |
| Update requirements lines 9-16 | Support main-agent validate-story plus child invocation from `create-story`, `write-remediation-story`, and `quick-spec`; report through `attempt_completion`; do not mutate project artifacts. | `validateStoryWorkflow.ts`, `validateStoryWorkflow.test.ts`, `integration.test.ts` |
| Update requirements lines 18-33 | Preserve child workflow activation through registry-owned `use_skill` assignment, copied project selection, explicit inheritance, isolated sessions, and runtime-owned teardown/resume. | `types.ts`, `WorkflowRuntime.ts`, `SubagentRunner.ts`, runtime/subagent tests |
| Update requirements lines 35-43 | Preserve exact source prompt prose, convert only workflow placeholders, and exclude conditional authoring callouts. | `validateStoryWorkflow.ts`, `validateStoryWorkflow.test.ts`, `integration.test.ts` |
| Update requirements lines 45-55 | Add `originating_story` and `code_review_output` workflow values; keep `set_workflow_values` absent. | `validateStoryWorkflow.ts`, `validateStoryWorkflow.test.ts`, `validateStoryToolSchemas.test.ts` |
| Update requirements lines 56-71 | Add runtime-owned `lifecycle.parentWorkflowName`, pass it from `SubagentRunner`, preserve it on resume, and expose the active session to decision predicates and prompt builders. | `types.ts`, `WorkflowRuntime.ts`, `SubagentRunner.ts`, runtime/subagent tests |
| Update requirements lines 73-90 | Add exact validate-story `childInheritance` rules and preserve parent/child value isolation. | `validateStoryWorkflow.ts`, `validateStoryWorkflow.test.ts`, `SubagentRunner.test.ts` |
| Update requirements lines 92-117 | Main-agent invocation resolves prerequisites; child invocations skip prerequisite forms and route directly to `project_prompt`; completion routes to `complete_workflow`. | `validateStoryWorkflow.ts`, `validateStoryWorkflow.test.ts` |
| Update requirements lines 119-230 | Build Step 1 prompt variants from parent workflow context and source-authored sections. | `validateStoryWorkflow.ts`, `validateStoryWorkflow.test.ts`, `integration.test.ts` |
| Update requirements lines 232-260 | Keep the existing exact Step 1 shared/default tool surface and forbidden model-facing tool exclusions. | `validateStoryToolSchemas.ts`, `validateStoryToolSchemas.test.ts`, `integration.test.ts` |
| Update requirements lines 282-317 | Add focused module, runtime, subagent, prompt-projection, typecheck, lint, static guard, and scope-diff validation. | Test files and validation tasks in this plan |

## Phase 1: Runtime Parent Workflow Context

Allowed files:

- `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-action-plan.md`
- `src/core/task/workflow-runtime/types.ts`
- `src/core/task/workflow-runtime/WorkflowRuntime.ts`
- `src/core/task/tools/subagent/SubagentRunner.ts`
- `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`
- `src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`

### Task 1: Extend Workflow Runtime Types

- [ ] 1.1. In `src/core/task/workflow-runtime/types.ts`, update `WorkflowRuntimeLifecycleState` to include the exact optional property `parentWorkflowName?: WorkflowDefinition["name"]` after `projectSelectionCompleted: boolean`.

- [ ] 1.2. In `src/core/task/workflow-runtime/types.ts`, update `WorkflowDecisionBranchEvaluationInput` to include the exact property `session: ActiveWorkflowSession` after `step: WorkflowStepDefinition`. Do not add `ui`, `branchContext`, `suppressedWorkflowFormIds`, or `suppressedWorkflowStepResolutionRoutes` as top-level predicate input fields.

### Task 2: Persist Runtime Parent Workflow Context

- [ ] 2.1. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update the `activateWorkflow(args: { ... })` parameter type to include `parentWorkflowName?: WorkflowDefinition["name"]` after `parentSession?: ActiveWorkflowSession`.

- [ ] 2.2. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update the destructuring at the start of `activateWorkflow(...)` from `const { taskState, workflowName, parentSession } = args` to `const { taskState, workflowName, parentSession, parentWorkflowName } = args`.

- [ ] 2.3. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update the `lifecycle` object created inside `activateWorkflow(...)` to this exact shape:

```ts
lifecycle: {
	projectSelectionCompleted: parentSession !== undefined,
	...(parentWorkflowName === undefined ? {} : { parentWorkflowName }),
},
```

- [ ] 2.4. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `isWorkflowRuntimeLifecycleState(...)` so it returns `false` unless `projectSelectionCompleted` is a boolean and, when `parentWorkflowName` is present, `parentWorkflowName` is a non-empty string after `trim()`. Preserve acceptance of persisted lifecycle objects that omit `parentWorkflowName`.

- [ ] 2.5. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update the lifecycle clone built during persisted-session restoration so the restored lifecycle has this exact shape:

```ts
lifecycle: {
	projectSelectionCompleted: persistedSession.lifecycle.projectSelectionCompleted,
	...(persistedSession.lifecycle.parentWorkflowName === undefined
		? {}
		: { parentWorkflowName: persistedSession.lifecycle.parentWorkflowName }),
},
```

- [ ] 2.6. In `src/core/task/workflow-runtime/WorkflowRuntime.ts`, update `buildDecisionTreeEvaluationInput(...)` to include `session` in the returned object:

```ts
return {
	activeBranchId: session.branchContext.activeBranchId,
	workflowValues: session.workflowValues,
	step,
	session,
}
```

### Task 3: Pass Parent Workflow Context From Subagent Activation

- [ ] 3.1. In `src/core/task/tools/subagent/SubagentRunner.ts`, update the `this.baseConfig.workflowRuntime.activateWorkflow({ ... })` call in `autoActivateAssignedWorkflow(...)` to include the exact property `parentWorkflowName: this.baseConfig.taskState.activeWorkflowName` immediately after `parentSession: structuredClone(parentSession)`.

- [ ] 3.2. In `src/core/task/tools/subagent/SubagentRunner.ts`, do not add a new failure message, fallback workflow name, marker parser, or child-visible prompt instruction for missing parent workflow identity. Preserve the existing `nextAction.kind === "no_op"` failure path and error text.

### Task 4: Update Runtime And Subagent Tests

- [ ] 4.1. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update `ObservedDecisionPredicateInput` to add the exact fields `sessionProjectTitleValue: string`, `sessionParentWorkflowName: string | undefined`, and `sessionActiveBranchId: string` after `stepNumber: number`.

- [ ] 4.2. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update the `"passes only documented decision inputs to session predicates"` test so its predicate records:

```ts
sessionProjectTitleValue: input.session.projectSelection.projectTitle,
sessionParentWorkflowName: input.session.lifecycle.parentWorkflowName,
sessionActiveBranchId: input.session.branchContext.activeBranchId,
keys: Object.keys(input).sort(),
hasSession: Reflect.has(input, "session"),
```

The expected object must assert `keys: ["activeBranchId", "session", "step", "workflowValues"]`, `hasSession: true`, `sessionProjectTitleValue: "Session Predicate Project"`, `sessionParentWorkflowName: undefined`, and `sessionActiveBranchId: "session-predicate-entry"`.

- [ ] 4.3. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update the `"passes sanitized decision inputs and trigger events to event predicates"` test so its predicate records the same three session fields as Subtask 4.2. The expected object must assert `keys: ["activeBranchId", "session", "step", "triggerEvent", "workflowValues"]`, `hasSession: true`, `sessionProjectTitleValue: "Event Predicate Project"`, `sessionParentWorkflowName: undefined`, `sessionActiveBranchId: "event-predicate-entry"`, and `triggerEventKind: "entry_artifact_resolution_completed"`.

- [ ] 4.4. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update the `"copies complete parent project selection into child workflow activation without rendering entry form"` test's `runtime.activateWorkflow(...)` call to include `parentWorkflowName: "parent-workflow"` immediately after `parentSession`. Add an exact assertion after the project-selection assertions:

```ts
expect(childSession.lifecycle).to.deep.equal({
	projectSelectionCompleted: true,
	parentWorkflowName: "parent-workflow",
})
```

- [ ] 4.5. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update the `"no-ops child workflow activation without mutating state when parent project selection is incomplete"` test's `runtime.activateWorkflow(...)` call to include `parentWorkflowName: "parent-workflow"` immediately after `parentSession`.

- [ ] 4.6. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, add a new test named exactly `"persists and restores child workflow parent workflow identity"` after the child project-selection activation test. The test must create a workflow with `createWorkflowDefinition()`, register it, create `parentSession = createParentWorkflowSession()`, activate with `parentSession` and `parentWorkflowName: "parent-workflow"`, assert `runtime.getPersistedSession({ taskState: childState })?.lifecycle` deep-equals `{ projectSelectionCompleted: true, parentWorkflowName: "parent-workflow" }`, restore that persisted session into a fresh `TaskState` with `activeWorkflowName = workflow.name`, and assert `restoredState.activeWorkflowSession?.lifecycle` deep-equals `{ projectSelectionCompleted: true, parentWorkflowName: "parent-workflow" }`.

- [ ] 4.7. In `src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`, update every remaining `runtime.activateWorkflow({ ... parentSession ... })` object in these test cases to include `parentWorkflowName: "parent-workflow"` immediately after the `parentSession` property: `"renders a workflow form from an explicit start panel"`, `"seeds workflow form session data only when creating a new form session"`, `"interpolates workflow values in workflow form and panel text"`, `"leaves unresolved placeholders and expression-like placeholder syntax unchanged"`, `"does not write interpolated text back into workflow form session definitions"`, `"rejects invalid buildSessionData shapes before activation"`, `"rejects render form actions with non-function buildSessionData before activation"`, `"returns terminal error when workflow form rendering fails after validation"`, `"renders dropdown options from workflow-value-interpolated selected-project story index"`, `"fails before reading JSON options when dynamic source path placeholders stay unresolved"`, `"fails before reading JSON options when workflow values resolve source path placeholders to unsafe segments"`, and `"restores workflow form sessions with current panel, data, canonical definitions, and interpolated text"`.

- [ ] 4.8. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update the `"activates parent-assigned workflow before the first child model request"` test to assert `activateWorkflowSpy.firstCall.args[0].parentWorkflowName` equals `"parent-workflow"` immediately after the existing workflow-name assertion.

- [ ] 4.9. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, update the `"leaves the parent workflow state unchanged while inheriting declared values into the child workflow session"` test to assert `state.activeWorkflowSession?.lifecycle` deep-equals `{ projectSelectionCompleted: true, parentWorkflowName: "parent-workflow" }` and to assert `activateWorkflowSpy.firstCall.args[0].parentWorkflowName` equals `"parent-workflow"`.

- [ ] 4.10. In `src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts`, update the `runtime.activateWorkflow({ taskState, workflowName: "blind-review", parentSession })` call to include `parentWorkflowName: "parent-workflow"`. Add an exact assertion after the project-selection assertions that `activeSession.lifecycle` deep-equals `{ projectSelectionCompleted: true, parentWorkflowName: "parent-workflow" }`.

- [ ] 4.11. In `src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`, update the `runtime.activateWorkflow({ taskState, workflowName: "edge-case-hunter-review", parentSession })` call to include `parentWorkflowName: "parent-workflow"`. Add an exact assertion after the project-selection assertions that `childSession.lifecycle` deep-equals `{ projectSelectionCompleted: true, parentWorkflowName: "parent-workflow" }`.

### Task 5: Phase 1 Validation

- [ ] 5.1. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`.

- [ ] 5.2. Run `npm run check-types` with elevated permissions. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

- [ ] 5.3. Run `git diff --name-only` and confirm persistent tracked diffs are limited to files listed in the Phase 1 allowed-files set plus the known pre-existing documentation diffs listed in this plan.

- [ ] 5.4. Run `git ls-files --others --exclude-standard` and confirm untracked files are limited to `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-requirements.md` and `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-action-plan.md`.

## Phase 2: Validate-Story Workflow Module Update

Allowed files:

- `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-action-plan.md`
- `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`

### Task 6: Update Validate-Story Workflow Values And Prompt Sections

- [ ] 6.1. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `WorkflowDecisionBranchTrigger` and `WorkflowPromptBuilderInput` to the existing type-only import from `"../../types"`. Do not remove `WorkflowDecisionTree`, `WorkflowDefinition`, `WorkflowPersonaDefinition`, `WorkflowStepDefinition`, or `WorkflowStepPromptSource`.

- [ ] 6.2. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add these enum members to `ValidateStoryWorkflowValueKey` after `ArchitectureDocument = "architecture_document"`:

```ts
OriginatingStory = "originating_story",
CodeReviewOutput = "code_review_output",
```

- [ ] 6.3. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `ValidateStoryWorkflowValueKey.OriginatingStory` and `ValidateStoryWorkflowValueKey.CodeReviewOutput` to `VALIDATE_STORY_WORKFLOW_VALUE_KEYS` immediately after `ValidateStoryWorkflowValueKey.ArchitectureDocument`.

- [ ] 6.4. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, replace `const VALIDATE_STORY_STEP_1_PROMPT_TEMPLATE = ...` with these exported prompt-section constants, preserving the exact text:

```ts
export const VALIDATE_STORY_STEP_1_IMPLEMENTATION_STORY_HEADER = `You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.
- Project: {workflow.projectTitle}
- Project Folder: {workflow.projectFolderName}
- Architecture Document: {workflow.architecture_document}
- Epics Documentation: {workflow.epics_document}
- Target Story: {workflow.target_story}`

export const VALIDATE_STORY_STEP_1_WRITE_REMEDIATION_STORY_HEADER = `You have been called inside a workflow designed to validate a remediation story before implementation. You will assess the remediation story against quality standards, ensure that the prescribed revisions are correct and comprehensive, and ensure that the story satisfies requirements as-written.
- Story for Review: {workflow.target_story}
- Story which had QA findings leading to generation of the story being reviewed: {workflow.originating_story}
- Findings from QA pass on the original story: {workflow.code_review_output}`

export const VALIDATE_STORY_STEP_1_QUICK_SPEC_HEADER = `You have been called inside a workflow designed to validate an implementation spec for a small project. You will assess the provided spec against quality standards, ensure that the prescribed revisions are correct and comprehensive, and ensure that the spec's tasks and subtasks satisfy the project's objective and requirements.
Spec for review: {workflow.target_story}

Read the entire provided spec, then assess the spec's tasks and subtasks following the criteria below.`
```

- [ ] 6.5. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add this exact constant immediately after the three header constants:

```ts
export const VALIDATE_STORY_STEP_1_COMMON_REVIEW_CRITERIA = `Review each task and subtask individually, inspecting the indicated target file and determinining whether the prescribed change meets the following standards:
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

After assessing the tasks and subtasks thoroughly, consider whether the combined set delivers on the indicated requirements/objective while respecting the defined scope.`
```

- [ ] 6.6. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `export const VALIDATE_STORY_STEP_1_SUBAGENT_FINAL_INSTRUCTION` with exact value `Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.`

- [ ] 6.7. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `export const VALIDATE_STORY_STEP_1_MAIN_AGENT_FINAL_INSTRUCTION` with exact value `Once you've reviewed the story document, provide a response to the user using attempt_completion. In your response, list each story section and indicate "no violations" or provide specific violation details. For the task section, provide either a "no violations" or violations details for each task and subtask. If findings were present, instruct the user to run the create-story workflow and provide your findings to the agent in that workflow.`

- [ ] 6.8. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add `export const VALIDATE_STORY_STEP_1_PROMPT_TEMPLATES: readonly string[]` after the final instruction constants with this exact value:

```ts
[
	VALIDATE_STORY_STEP_1_IMPLEMENTATION_STORY_HEADER,
	VALIDATE_STORY_STEP_1_WRITE_REMEDIATION_STORY_HEADER,
	VALIDATE_STORY_STEP_1_QUICK_SPEC_HEADER,
	VALIDATE_STORY_STEP_1_COMMON_REVIEW_CRITERIA,
	VALIDATE_STORY_STEP_1_SUBAGENT_FINAL_INSTRUCTION,
	VALIDATE_STORY_STEP_1_MAIN_AGENT_FINAL_INSTRUCTION,
]
```

### Task 7: Update Validate-Story Prompt Builder, Decision Tree, And Child Inheritance

- [ ] 7.1. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add this exact helper before `buildStep1PromptSource(...)`:

```ts
function resolveValidateStoryStep1Header(parentWorkflowName: WorkflowDefinition["name"] | undefined): string {
	if (parentWorkflowName === "write-remediation-story") {
		return VALIDATE_STORY_STEP_1_WRITE_REMEDIATION_STORY_HEADER
	}
	if (parentWorkflowName === "quick-spec") {
		return VALIDATE_STORY_STEP_1_QUICK_SPEC_HEADER
	}
	return VALIDATE_STORY_STEP_1_IMPLEMENTATION_STORY_HEADER
}
```

- [ ] 7.2. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add this exact helper immediately after `resolveValidateStoryStep1Header(...)`:

```ts
function resolveValidateStoryStep1FinalInstruction(parentWorkflowName: WorkflowDefinition["name"] | undefined): string {
	return parentWorkflowName === undefined
		? VALIDATE_STORY_STEP_1_MAIN_AGENT_FINAL_INSTRUCTION
		: VALIDATE_STORY_STEP_1_SUBAGENT_FINAL_INSTRUCTION
}
```

- [ ] 7.3. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, replace `function buildStep1PromptSource(): WorkflowStepPromptSource` with this exact function signature and body:

```ts
function buildStep1PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const parentWorkflowName = input.session.lifecycle.parentWorkflowName
	const sections = [
		resolveValidateStoryStep1Header(parentWorkflowName),
		VALIDATE_STORY_STEP_1_COMMON_REVIEW_CRITERIA,
		resolveValidateStoryStep1FinalInstruction(parentWorkflowName),
	]
	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: sections.join("\n\n"),
	}
}
```

- [ ] 7.4. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add these exact trigger helpers before `buildStep1DecisionTree()`:

```ts
function mainAgentInvocation(): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: (input) => input.session.lifecycle.parentWorkflowName === undefined,
	}
}

function parentWorkflowInvocation(parentWorkflowName: WorkflowDefinition["name"]): WorkflowDecisionBranchTrigger {
	return {
		kind: "session_predicate",
		matches: (input) => input.session.lifecycle.parentWorkflowName === parentWorkflowName,
	}
}
```

- [ ] 7.5. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, replace `buildStep1DecisionTree()` with a decision tree whose exact branch keys in insertion order are `step-1-route-by-invocation`, `step-1-start-review`, and `step-1-await-attempt-completion`; whose `entryBranchId` is `step-1-route-by-invocation`; and whose `step-1-route-by-invocation` routes are exactly:

```ts
[
	{
		id: "step-1-main-agent-resolve-prerequisites",
		trigger: mainAgentInvocation(),
		action: {
			kind: "resolve_prerequisite_files",
			prerequisiteIds: [
				VALIDATE_STORY_TARGET_STORY_PREREQUISITE_ID,
				VALIDATE_STORY_EPICS_DOCUMENT_PREREQUISITE_ID,
				VALIDATE_STORY_ARCHITECTURE_DOCUMENT_PREREQUISITE_ID,
			],
		},
		followingBranchId: "step-1-start-review",
	},
	{
		id: "step-1-create-story-project-prompt",
		trigger: parentWorkflowInvocation("create-story"),
		action: { kind: "project_prompt" },
		followingBranchId: "step-1-await-attempt-completion",
	},
	{
		id: "step-1-write-remediation-story-project-prompt",
		trigger: parentWorkflowInvocation("write-remediation-story"),
		action: { kind: "project_prompt" },
		followingBranchId: "step-1-await-attempt-completion",
	},
	{
		id: "step-1-quick-spec-project-prompt",
		trigger: parentWorkflowInvocation("quick-spec"),
		action: { kind: "project_prompt" },
		followingBranchId: "step-1-await-attempt-completion",
	},
]
```

The `step-1-start-review` branch must retain the existing `step-1-project-prompt` route with action `{ kind: "project_prompt" }` and `followingBranchId: "step-1-await-attempt-completion"`. The `step-1-await-attempt-completion` branch must retain the existing `step-1-complete-workflow` route with trigger `{ kind: "on_event", eventKind: "attempt_completion_succeeded" }` and action `{ kind: "complete_workflow" }`.

- [ ] 7.6. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, add this exact `childInheritance` property to `validateStoryWorkflowDefinition` immediately after `prerequisiteFiles: VALIDATE_STORY_PREREQUISITE_FILES`:

```ts
childInheritance: [
	{ parentKey: "target_story", childKey: "target_story" },
	{ parentKey: "epics_document", childKey: "epics_document" },
	{ parentKey: "architecture_document", childKey: "architecture_document" },
	{ parentKey: "originating_story", childKey: "originating_story" },
	{ parentKey: "code_review_output", childKey: "code_review_output" },
	{ parentKey: "output_document", childKey: "target_story" },
],
```

- [ ] 7.7. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, update the Step 1 `promptTemplates` property from `[VALIDATE_STORY_STEP_1_PROMPT_TEMPLATE]` to `VALIDATE_STORY_STEP_1_PROMPT_TEMPLATES`.

- [ ] 7.8. In `src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts`, remove the now-deleted local symbol `VALIDATE_STORY_STEP_1_PROMPT_TEMPLATE`. Do not remove `buildValidateStoryStep1ToolSchemas`, prerequisite constants, persona constants, or existing workflow identity exports.

### Task 8: Update Validate-Story Workflow Tests

- [ ] 8.1. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `WorkflowDecisionBranchEvaluationInput` to the existing type-only import from `"../../../types"`.

- [ ] 8.2. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add `VALIDATE_STORY_STEP_1_PROMPT_TEMPLATES` to the existing import from `"../validateStoryWorkflow"`.

- [ ] 8.3. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add these constants after `ARCHITECTURE_DOCUMENT_PATH`:

```ts
const ORIGINATING_STORY_PATH = "/tmp/validate-story-project/implementation/stories-complete/Story-1-0.md"
const CODE_REVIEW_OUTPUT_PATH = "/tmp/validate-story-project/review/code-review-1-1.md"
const QUICK_SPEC_OUTPUT_DOCUMENT_PATH = "/tmp/validate-story-project/planning/quick-spec.md"
```

- [ ] 8.4. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, replace `createPromptBuilderInput(workflowValues: WorkflowValues = createWorkflowValues())` with a helper accepting this exact argument shape:

```ts
function createPromptBuilderInput(
	args: {
		workflowValues?: WorkflowValues
		parentWorkflowName?: string
	} = {},
): WorkflowPromptBuilderInput
```

The helper must use `args.workflowValues ?? createWorkflowValues()` for `session.workflowValues`, and its lifecycle object must be:

```ts
lifecycle: {
	projectSelectionCompleted: true,
	...(args.parentWorkflowName === undefined ? {} : { parentWorkflowName: args.parentWorkflowName }),
},
```

- [ ] 8.5. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add this helper after `createPromptBuilderInput(...)`:

```ts
function createDecisionEvaluationInput(parentWorkflowName?: string): WorkflowDecisionBranchEvaluationInput {
	const promptInput = createPromptBuilderInput({ parentWorkflowName })
	return {
		activeBranchId: "step-1-route-by-invocation",
		workflowValues: promptInput.session.workflowValues,
		step: promptInput.step,
		session: promptInput.session,
	}
}
```

- [ ] 8.6. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, update the workflow-values test name from `"declares workflow values without AI-writable values forms artifacts or child inheritance"` to `"declares workflow values child inheritance and no AI-writable values forms or artifacts"`. Replace the `expect(validateStoryWorkflowDefinition.childInheritance).to.equal(undefined)` assertion with this exact assertion:

```ts
expect(validateStoryWorkflowDefinition.childInheritance).to.deep.equal([
	{ parentKey: "target_story", childKey: "target_story" },
	{ parentKey: "epics_document", childKey: "epics_document" },
	{ parentKey: "architecture_document", childKey: "architecture_document" },
	{ parentKey: "originating_story", childKey: "originating_story" },
	{ parentKey: "code_review_output", childKey: "code_review_output" },
	{ parentKey: "output_document", childKey: "target_story" },
])
```

- [ ] 8.7. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, update the `"declares Step 1 checklist label prompt builder and exact tool surface"` test so the existing `buildToolSchema(createPromptBuilderInput())` call and the existing `buildPromptSource(createPromptBuilderInput())` call keep using the new zero-argument helper shape. Replace the prompt-template assertion with `expect(getStep("step-1").promptTemplates).to.deep.equal(VALIDATE_STORY_STEP_1_PROMPT_TEMPLATES)`.

- [ ] 8.8. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, replace the `"renders Step 1 prompt with materialized workflow values and without raw placeholders"` test with four tests named exactly:

```text
renders the main-agent Step 1 prompt variant with materialized workflow values
renders the create-story child Step 1 prompt variant with subagent completion guidance
renders the write-remediation-story child Step 1 prompt variant with inherited remediation context
renders the quick-spec child Step 1 prompt variant with inherited spec path
```

The main-agent test must assert that the rendered prompt includes `PROJECT_TITLE`, `PROJECT_FOLDER_NAME`, `TARGET_STORY_PATH`, `EPICS_DOCUMENT_PATH`, `ARCHITECTURE_DOCUMENT_PATH`, `You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.`, and `Once you've reviewed the story document, provide a response to the user using attempt_completion.`. It must assert the rendered prompt does not include `You have been called inside a workflow designed to validate a remediation story before implementation.`, `You have been called inside a workflow designed to validate an implementation spec for a small project.`, `Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.`, `{workflow.projectTitle}`, `{workflow.projectFolderName}`, `{workflow.target_story}`, `{workflow.epics_document}`, `{workflow.architecture_document}`, `*** conditional prompt`, and `*** end conditional`.

The create-story child test must use `createPromptBuilderInput({ parentWorkflowName: "create-story" })`, assert the rendered prompt includes `TARGET_STORY_PATH`, `EPICS_DOCUMENT_PATH`, `ARCHITECTURE_DOCUMENT_PATH`, `You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.`, and `Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.`, and assert it does not include `You have been called inside a workflow designed to validate a remediation story before implementation.`, `You have been called inside a workflow designed to validate an implementation spec for a small project.`, `{workflow.target_story}`, `{workflow.epics_document}`, `{workflow.architecture_document}`, `*** conditional prompt`, or `*** end conditional`.

The write-remediation-story child test must use `createPromptBuilderInput({ parentWorkflowName: "write-remediation-story", workflowValues: createWorkflowValues({ [ValidateStoryWorkflowValueKey.OriginatingStory]: ORIGINATING_STORY_PATH, [ValidateStoryWorkflowValueKey.CodeReviewOutput]: CODE_REVIEW_OUTPUT_PATH }) })`, assert the rendered prompt includes `TARGET_STORY_PATH`, `ORIGINATING_STORY_PATH`, `CODE_REVIEW_OUTPUT_PATH`, `You have been called inside a workflow designed to validate a remediation story before implementation.`, and `Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.`, and assert it does not include `- Epics Documentation:`, `- Architecture Document:`, `You have been called inside a workflow designed to validate an implementation spec for a small project.`, `{workflow.target_story}`, `{workflow.originating_story}`, `{workflow.code_review_output}`, `*** conditional prompt`, or `*** end conditional`.

The quick-spec child test must use `createPromptBuilderInput({ parentWorkflowName: "quick-spec", workflowValues: createWorkflowValues({ [ValidateStoryWorkflowValueKey.TargetStory]: QUICK_SPEC_OUTPUT_DOCUMENT_PATH }) })`, assert the rendered prompt includes `QUICK_SPEC_OUTPUT_DOCUMENT_PATH`, `Spec for review: ${QUICK_SPEC_OUTPUT_DOCUMENT_PATH}`, `You have been called inside a workflow designed to validate an implementation spec for a small project.`, and `Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.`, and assert it does not include `- Epics Documentation:`, `- Architecture Document:`, `You have been called inside a workflow designed to validate a remediation story before implementation.`, `{workflow.target_story}`, `*** conditional prompt`, or `*** end conditional`.

- [ ] 8.9. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, update the `"routes Step 1 through prerequisite resolution project prompt and completion"` test name to `"routes Step 1 by invocation context through prerequisites child prompts and completion"`. Update expected branch keys to exactly `["step-1-route-by-invocation", "step-1-start-review", "step-1-await-attempt-completion"]`.

- [ ] 8.10. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, update the route assertions in the renamed routing test with these exact assertions for the route-by-invocation branch:

```ts
const mainAgentRoute = routeByInvocation.routes.find(
	(route) => route.id === "step-1-main-agent-resolve-prerequisites",
)
expect(mainAgentRoute).to.not.equal(undefined)
if (mainAgentRoute === undefined) {
	throw new Error("Missing main-agent validate-story route")
}
expect(mainAgentRoute.trigger.kind).to.equal("session_predicate")
if (mainAgentRoute.trigger.kind !== "session_predicate") {
	throw new Error("Expected main-agent validate-story route to use a session predicate")
}
expect(mainAgentRoute.trigger.matches(createDecisionEvaluationInput(undefined))).to.equal(true)
expect(mainAgentRoute.trigger.matches(createDecisionEvaluationInput("create-story"))).to.equal(false)
expect(mainAgentRoute.action).to.deep.equal({
	kind: "resolve_prerequisite_files",
	prerequisiteIds: [
		"target_story",
		"epics_document",
		"architecture_document",
	],
})
expect(mainAgentRoute.followingBranchId).to.equal("step-1-start-review")

const createStoryRoute = routeByInvocation.routes.find(
	(route) => route.id === "step-1-create-story-project-prompt",
)
expect(createStoryRoute).to.not.equal(undefined)
if (createStoryRoute === undefined) {
	throw new Error("Missing create-story validate-story route")
}
expect(createStoryRoute.trigger.kind).to.equal("session_predicate")
if (createStoryRoute.trigger.kind !== "session_predicate") {
	throw new Error("Expected create-story validate-story route to use a session predicate")
}
expect(createStoryRoute.trigger.matches(createDecisionEvaluationInput("create-story"))).to.equal(true)
expect(createStoryRoute.trigger.matches(createDecisionEvaluationInput(undefined))).to.equal(false)
expect(createStoryRoute.action).to.deep.equal({ kind: "project_prompt" })
expect(createStoryRoute.followingBranchId).to.equal("step-1-await-attempt-completion")

const remediationRoute = routeByInvocation.routes.find(
	(route) => route.id === "step-1-write-remediation-story-project-prompt",
)
expect(remediationRoute).to.not.equal(undefined)
if (remediationRoute === undefined) {
	throw new Error("Missing write-remediation-story validate-story route")
}
expect(remediationRoute.trigger.kind).to.equal("session_predicate")
if (remediationRoute.trigger.kind !== "session_predicate") {
	throw new Error("Expected write-remediation-story validate-story route to use a session predicate")
}
expect(remediationRoute.trigger.matches(createDecisionEvaluationInput("write-remediation-story"))).to.equal(true)
expect(remediationRoute.trigger.matches(createDecisionEvaluationInput(undefined))).to.equal(false)
expect(remediationRoute.action).to.deep.equal({ kind: "project_prompt" })
expect(remediationRoute.followingBranchId).to.equal("step-1-await-attempt-completion")

const quickSpecRoute = routeByInvocation.routes.find(
	(route) => route.id === "step-1-quick-spec-project-prompt",
)
expect(quickSpecRoute).to.not.equal(undefined)
if (quickSpecRoute === undefined) {
	throw new Error("Missing quick-spec validate-story route")
}
expect(quickSpecRoute.trigger.kind).to.equal("session_predicate")
if (quickSpecRoute.trigger.kind !== "session_predicate") {
	throw new Error("Expected quick-spec validate-story route to use a session predicate")
}
expect(quickSpecRoute.trigger.matches(createDecisionEvaluationInput("quick-spec"))).to.equal(true)
expect(quickSpecRoute.trigger.matches(createDecisionEvaluationInput(undefined))).to.equal(false)
expect(quickSpecRoute.action).to.deep.equal({ kind: "project_prompt" })
expect(quickSpecRoute.followingBranchId).to.equal("step-1-await-attempt-completion")
```

- [ ] 8.11. In `src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts`, add a new test named exactly `"activates child contexts directly to project prompt with inherited values and no forms"` after the main-agent prerequisite runtime tests. The test must create three exact cases:

```ts
[
	{
		parentWorkflowName: "create-story",
		parentValues: {
			target_story: TARGET_STORY_PATH,
			epics_document: EPICS_DOCUMENT_PATH,
			architecture_document: ARCHITECTURE_DOCUMENT_PATH,
			ignored_parent: "drop",
		},
		expectedChildValues: {
			target_story: TARGET_STORY_PATH,
			epics_document: EPICS_DOCUMENT_PATH,
			architecture_document: ARCHITECTURE_DOCUMENT_PATH,
		},
	},
	{
		parentWorkflowName: "write-remediation-story",
		parentValues: {
			target_story: TARGET_STORY_PATH,
			originating_story: ORIGINATING_STORY_PATH,
			code_review_output: CODE_REVIEW_OUTPUT_PATH,
		},
		expectedChildValues: {
			target_story: TARGET_STORY_PATH,
			originating_story: ORIGINATING_STORY_PATH,
			code_review_output: CODE_REVIEW_OUTPUT_PATH,
		},
	},
	{
		parentWorkflowName: "quick-spec",
		parentValues: {
			output_document: QUICK_SPEC_OUTPUT_DOCUMENT_PATH,
		},
		expectedChildValues: {
			target_story: QUICK_SPEC_OUTPUT_DOCUMENT_PATH,
		},
	},
]
```

For each case, activate `VALIDATE_STORY_WORKFLOW_NAME` through `WorkflowRuntime.activateWorkflow({ taskState, workflowName: VALIDATE_STORY_WORKFLOW_NAME, parentSession, parentWorkflowName: case.parentWorkflowName })`, assert the result kind is `"project_prompt"`, assert `taskState.activeWorkflowSession?.workflowValues` deep-equals `case.expectedChildValues`, assert lifecycle deep-equals `{ projectSelectionCompleted: true, parentWorkflowName: case.parentWorkflowName }`, assert `taskState.activeWorkflowSession?.ui.formSession` equals `undefined`, and assert the parent session's `workflowValues` object still deep-equals `case.parentValues`.

### Task 9: Phase 2 Validation

- [ ] 9.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`.

- [ ] 9.2. Run `npm run check-types` with elevated permissions. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

- [ ] 9.3. Run `git diff --name-only` and confirm persistent tracked diffs are limited to files listed in the Phase 1 and Phase 2 allowed-files sets plus the known pre-existing documentation diffs listed in this plan.

- [ ] 9.4. Run `git ls-files --others --exclude-standard` and confirm untracked files are limited to `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-requirements.md` and `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-action-plan.md`.

## Phase 3: Prompt Projection And Final Validation

Allowed files:

- `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-action-plan.md`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`

### Task 10: Update Validate-Story Prompt Projection Coverage

- [ ] 10.1. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add these constants after `VALIDATE_STORY_ARCHITECTURE_DOCUMENT`:

```ts
const VALIDATE_STORY_ORIGINATING_STORY = `${VALIDATE_STORY_PROJECT_ROOT}/implementation/stories-complete/Story-1-0.md`
const VALIDATE_STORY_CODE_REVIEW_OUTPUT = `${VALIDATE_STORY_PROJECT_ROOT}/review/code-review-1-1.md`
const VALIDATE_STORY_QUICK_SPEC_DOCUMENT = `${VALIDATE_STORY_PROJECT_ROOT}/planning/quick-spec.md`
```

- [ ] 10.2. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, update `createValidateStoryWorkflowSession(...)` to accept `parentWorkflowName?: string` as a second parameter and to build lifecycle with this exact shape:

```ts
lifecycle: {
	projectSelectionCompleted: true,
	...(parentWorkflowName === undefined ? {} : { parentWorkflowName }),
},
```

- [ ] 10.3. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, update `buildValidateStoryPromptContext(...)` to accept this exact argument object instead of a bare workflow-values parameter:

```ts
async function buildValidateStoryPromptContext(
	args: {
		workflowValues?: WorkflowValues
		parentWorkflowName?: string
	} = {},
): Promise<SystemPromptContext & WorkflowPromptProjection>
```

The helper must call `createValidateStoryWorkflowSession(args.workflowValues ?? createValidateStoryWorkflowValues(), args.parentWorkflowName)`.

- [ ] 10.4. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, update existing zero-argument calls to `buildValidateStoryPromptContext()` so they keep using the new zero-argument default object. Do not change prompt context helpers for other workflows.

- [ ] 10.5. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, replace the existing `"projects validate-story Step 1 materialized values into full-turn and continuation payloads"` test with a test named exactly `"projects validate-story main-agent Step 1 materialized values into full-turn and continuation payloads"`. Preserve the existing full-turn and continuation non-empty checks and exact includes for `VALIDATE_STORY_TARGET_STORY`, `VALIDATE_STORY_EPICS_DOCUMENT`, `VALIDATE_STORY_ARCHITECTURE_DOCUMENT`, `"Validate Story Session"`, and `"validate-story-project"`. Preserve exact negative assertions for `{workflow.target_story}`, `{workflow.epics_document}`, `{workflow.architecture_document}`, `{workflow.projectTitle}`, `{workflow.projectFolderName}`, `target_story`, `epics_document`, `architecture_document`, `projectTitle`, and `projectFolderName`. Add exact negative assertions for `"*** conditional prompt"` and `"*** end conditional"`.

- [ ] 10.6. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add a new test named exactly `"projects validate-story child prompt variants by parent workflow context"` after the renamed main-agent materialized-values test. The test must build three contexts:

```ts
const createStoryContext = await buildValidateStoryPromptContext({ parentWorkflowName: "create-story" })
const remediationContext = await buildValidateStoryPromptContext({
	parentWorkflowName: "write-remediation-story",
	workflowValues: createValidateStoryWorkflowValues({
		[ValidateStoryWorkflowValueKey.OriginatingStory]: VALIDATE_STORY_ORIGINATING_STORY,
		[ValidateStoryWorkflowValueKey.CodeReviewOutput]: VALIDATE_STORY_CODE_REVIEW_OUTPUT,
	}),
})
const quickSpecContext = await buildValidateStoryPromptContext({
	parentWorkflowName: "quick-spec",
	workflowValues: createValidateStoryWorkflowValues({
		[ValidateStoryWorkflowValueKey.TargetStory]: VALIDATE_STORY_QUICK_SPEC_DOCUMENT,
	}),
})
```

After the three context constants, add this exact local helper before making prompt assertions:

```ts
function getValidateStoryPayloadBlocks(
	context: SystemPromptContext & WorkflowPromptProjection,
	label: string,
): readonly [string, string] {
	const workflowInputPayloadBlock = context.workflowInputPayloadBlock
	const continuationWorkflowInputPayloadBlock = context.continuationWorkflowInputPayloadBlock
	if (workflowInputPayloadBlock === undefined || workflowInputPayloadBlock === "") {
		throw new Error(`Expected ${label} workflow input payload.`)
	}
	if (continuationWorkflowInputPayloadBlock === undefined || continuationWorkflowInputPayloadBlock === "") {
		throw new Error(`Expected ${label} continuation workflow input payload.`)
	}
	return [workflowInputPayloadBlock, continuationWorkflowInputPayloadBlock]
}
```

For `createStoryContext`, iterate `for (const payloadBlock of getValidateStoryPayloadBlocks(createStoryContext, "create-story validate-story"))` and assert each `payloadBlock` includes `You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.`, `VALIDATE_STORY_TARGET_STORY`, `VALIDATE_STORY_EPICS_DOCUMENT`, `VALIDATE_STORY_ARCHITECTURE_DOCUMENT`, and `Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.`; assert each `payloadBlock` excludes `You have been called inside a workflow designed to validate a remediation story before implementation.`, `You have been called inside a workflow designed to validate an implementation spec for a small project.`, `Once you've reviewed the story document, provide a response to the user using attempt_completion.`, `{workflow.target_story}`, `{workflow.epics_document}`, `{workflow.architecture_document}`, `"*** conditional prompt"`, and `"*** end conditional"`.

For `remediationContext`, iterate `for (const payloadBlock of getValidateStoryPayloadBlocks(remediationContext, "write-remediation-story validate-story"))` and assert each `payloadBlock` includes `You have been called inside a workflow designed to validate a remediation story before implementation.`, `VALIDATE_STORY_TARGET_STORY`, `VALIDATE_STORY_ORIGINATING_STORY`, `VALIDATE_STORY_CODE_REVIEW_OUTPUT`, and `Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.`; assert each `payloadBlock` excludes `You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.`, `You have been called inside a workflow designed to validate an implementation spec for a small project.`, `"- Epics Documentation:"`, `"- Architecture Document:"`, `{workflow.originating_story}`, `{workflow.code_review_output}`, `"*** conditional prompt"`, and `"*** end conditional"`.

For `quickSpecContext`, iterate `for (const payloadBlock of getValidateStoryPayloadBlocks(quickSpecContext, "quick-spec validate-story"))` and assert each `payloadBlock` includes `You have been called inside a workflow designed to validate an implementation spec for a small project.`, `Spec for review: ${VALIDATE_STORY_QUICK_SPEC_DOCUMENT}`, and `Once you've performed your review, use attempt_completion to provide detailed findings back to the primary agent.`; assert each `payloadBlock` excludes `You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.`, `You have been called inside a workflow designed to validate a remediation story before implementation.`, `"- Epics Documentation:"`, `"- Architecture Document:"`, `{workflow.target_story}`, `"*** conditional prompt"`, and `"*** end conditional"`.

- [ ] 10.7. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, keep the validate-story Step 1 native tool projection assertion exactly `expect(context.workflowToolSchemaOverride).to.deep.equal(buildValidateStoryStep1ToolSchemas())` and keep the non-native prompt test's exact approved-tool assertions based on `buildValidateStoryStep1ToolSchemas().map((tool) => tool.name)`.

### Task 11: Final Validation

- [ ] 11.1. Run `npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts`.

- [ ] 11.2. Run `npm run test:unit -- src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`.

- [ ] 11.3. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts`.

- [ ] 11.4. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryToolSchemas.test.ts`.

- [ ] 11.5. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`.

- [ ] 11.6. Run `npm run check-types` with elevated permissions. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

- [ ] 11.7. Run `npm run lint`.

- [ ] 11.8. Run `npm run package`. If this command fails in its internal `npm run check-types` step before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, rerun `npm run check-types` with elevated permissions, then rerun `npm run package` before treating the failure as a code defect.

- [ ] 11.9. Run `rg -n "conditional prompt|end conditional|shown when" src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts` and confirm it returns no matches.

- [ ] 11.10. Run `rg -n "Perform a line-by-line review to ensure that the provided story document meets all relevant project and quality standards" src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts` and confirm it returns no matches.

- [ ] 11.11. Run `rg -n "apply_patch|write_to_file|set_workflow_values|workflow_progress_request|ask_followup_question|use_subagents|create_workflow_artifact|build_workflow_document|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|resolve_prerequisite_files|resolve_existing_project_artifact|validate_story_index_entry" src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts` and confirm it returns no matches.

- [ ] 11.12. Run `rg -n "validate-story\\.md|bmad-validate-story|activeWorkflowFormSession|activeWorkflowStepResolutionSession|workflow-config\\.yaml" src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts` and confirm it returns no matches.

- [ ] 11.13. Run `git diff --name-only -- docs/workflows/workflow-runtime/workflow-modules/validate-story/action-plan.md` and confirm it returns no matches.

- [ ] 11.14. Run `git diff --name-only` and confirm tracked diffs are limited to this exact set:

```text
docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story.md
src/core/task/tools/subagent/SubagentRunner.ts
src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
src/core/task/workflow-runtime/WorkflowRuntime.ts
src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts
src/core/task/workflow-runtime/types.ts
src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/__tests__/edgeCaseHunterReviewWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/validate-story/__tests__/validateStoryWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryWorkflow.ts
src/core/prompts/system-prompt/__tests__/integration.test.ts
```

- [ ] 11.15. Run `git ls-files --others --exclude-standard` and confirm untracked files are limited to this exact set:

```text
docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-requirements.md
docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story-subagent-update-action-plan.md
```

## Authoring Compliance Matrix

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1 | lines 56-71 | `types.ts` | `WorkflowRuntimeLifecycleState`, `WorkflowDefinition["name"]` | optional `parentWorkflowName` field after `projectSelectionCompleted` | no import cleanup | 5.2, 11.6 |
| 1.2 | lines 56-71 | `types.ts` | `WorkflowDecisionBranchEvaluationInput`, `ActiveWorkflowSession` | exact `session` field and excluded top-level fields | predicate test fallout prescribed in 4.1-4.3 | 5.1, 11.1 |
| 2.1 | lines 56-71 | `WorkflowRuntime.ts` | `activateWorkflow` args type | exact optional `parentWorkflowName` arg position | no cleanup | 5.1, 11.1 |
| 2.2 | lines 56-71 | `WorkflowRuntime.ts` | `activateWorkflow` destructuring | exact destructuring shape | no cleanup | 5.1, 11.1 |
| 2.3 | lines 56-71 | `WorkflowRuntime.ts` | `activateWorkflow` lifecycle object | exact conditional `parentWorkflowName` spread | no cleanup | 4.4-4.6, 5.1, 11.1 |
| 2.4 | lines 56-71 | `WorkflowRuntime.ts` | `isWorkflowRuntimeLifecycleState` | boolean project-selection and non-empty string parent-name validation | omitted parent-name compatibility preserved | 4.6, 5.1, 11.1 |
| 2.5 | lines 56-71 | `WorkflowRuntime.ts` | persisted-session restoration lifecycle clone | exact restored lifecycle object shape | no cleanup | 4.6, 5.1, 11.1 |
| 2.6 | lines 56-71 | `WorkflowRuntime.ts` | `buildDecisionTreeEvaluationInput` | returned object includes exact `session` field | predicate key assertions updated in 4.2-4.3 | 4.1-4.3, 5.1, 11.1 |
| 3.1 | lines 18-33, 56-71 | `SubagentRunner.ts` | `autoActivateAssignedWorkflow`, `activateWorkflow` call | exact `parentWorkflowName` argument | no cleanup | 4.8-4.9, 5.1, 11.2 |
| 3.2 | lines 18-33, 56-71 | `SubagentRunner.ts` | `nextAction.kind === "no_op"` path | existing failure behavior preserved | forbids new failure text, fallback, parser, prompt instruction | 5.1, 11.2 |
| 4.1 | lines 56-71 | `WorkflowRuntime.test.ts` | `ObservedDecisionPredicateInput` | exact observed session fields | no cleanup | 5.1, 11.1 |
| 4.2 | lines 56-71 | `WorkflowRuntime.test.ts` | session-predicate test | exact observed values and key list | stale key expectation replaced | 5.1, 11.1 |
| 4.3 | lines 56-71 | `WorkflowRuntime.test.ts` | event-predicate test | exact observed values, key list, event kind | stale key expectation replaced | 5.1, 11.1 |
| 4.4 | lines 18-33, 56-71 | `WorkflowRuntime.test.ts` | child project-selection activation test | exact activation arg and lifecycle assertion | no cleanup | 5.1, 11.1 |
| 4.5 | lines 18-33, 56-71 | `WorkflowRuntime.test.ts` | incomplete parent activation test | exact activation arg | no cleanup | 5.1, 11.1 |
| 4.6 | lines 56-71 | `WorkflowRuntime.test.ts` | new persistence/restore test | exact persisted and restored lifecycle assertions | no cleanup | 5.1, 11.1 |
| 4.7 | lines 18-33, 56-71 | `WorkflowRuntime.test.ts` | named parentSession caller tests | exact parent workflow arg on each named call | activation-call fallout prescribed by test name | 5.1, 11.1 |
| 4.8 | lines 18-33, 56-71 | `SubagentRunner.test.ts` | assigned-workflow activation test | exact spy arg assertion | no cleanup | 5.1, 11.2 |
| 4.9 | lines 18-33, 56-71 | `SubagentRunner.test.ts` | inheritance isolation test | exact lifecycle and spy arg assertions | no cleanup | 5.1, 11.2 |
| 4.10 | lines 18-33, 56-71 | `blindReviewWorkflow.test.ts` | blind-review child activation test | exact activation arg and lifecycle assertion | no cleanup | 5.1, 11.3 |
| 4.11 | lines 18-33, 56-71 | `edgeCaseHunterReviewWorkflow.test.ts` | edge-case child activation test | exact activation arg and lifecycle assertion | no cleanup | 5.1, 11.3 |
| 5.1 | lines 303-317 | command | focused runtime/subagent/sibling tests | exact `npm run test:unit -- ...` command | no cleanup | direct validation |
| 5.2 | lines 303-317 | command | typecheck/proto fallback | elevated exact command and fallback condition | no cleanup | direct validation |
| 5.3 | lines 303-317 | command | tracked scope diff | exact allowed tracked scope | no cleanup | direct validation |
| 5.4 | lines 303-317 | command | untracked scope diff | exact allowed untracked scope | no cleanup | direct validation |
| 6.1 | lines 119-230 | `validateStoryWorkflow.ts` | type-only import | exact imports to add and retain | import cleanup constrained | 9.1, 11.4, 11.6 |
| 6.2 | lines 45-55 | `validateStoryWorkflow.ts` | `ValidateStoryWorkflowValueKey` | exact enum members and placement | no cleanup | 9.1, 11.4 |
| 6.3 | lines 45-55 | `validateStoryWorkflow.ts` | `VALIDATE_STORY_WORKFLOW_VALUE_KEYS` | exact key additions and placement | no cleanup | 9.1, 11.4 |
| 6.4 | lines 119-174 | `validateStoryWorkflow.ts` | three prompt header constants | exact source-authored header text | old single template replaced in 7.8 | 8.8, 9.1, 11.4 |
| 6.5 | lines 175-214 | `validateStoryWorkflow.ts` | common review criteria constant | exact source-authored review criteria text | no cleanup | 8.8, 9.1, 11.4 |
| 6.6 | lines 216-222 | `validateStoryWorkflow.ts` | subagent final instruction constant | exact final instruction text | no cleanup | 8.8, 9.1, 11.4 |
| 6.7 | lines 224-230 | `validateStoryWorkflow.ts` | main-agent final instruction constant | exact final instruction text | no cleanup | 8.8, 9.1, 11.4 |
| 6.8 | lines 35-43, 119-230 | `validateStoryWorkflow.ts` | prompt templates array | exact array contents and order | old prompt-template symbol removed in 7.8 | 8.7, 9.1, 11.4 |
| 7.1 | lines 119-174 | `validateStoryWorkflow.ts` | `resolveValidateStoryStep1Header` | exact helper body | no cleanup | 8.8, 9.1, 11.4 |
| 7.2 | lines 216-230 | `validateStoryWorkflow.ts` | `resolveValidateStoryStep1FinalInstruction` | exact helper body | no cleanup | 8.8, 9.1, 11.4 |
| 7.3 | lines 119-230 | `validateStoryWorkflow.ts` | `buildStep1PromptSource` | exact prompt-builder signature and body | old no-arg prompt builder replaced | 8.8, 9.1, 11.4 |
| 7.4 | lines 92-117 | `validateStoryWorkflow.ts` | `mainAgentInvocation`, `parentWorkflowInvocation` | exact session-predicate helper bodies | no cleanup | 8.10, 9.1, 11.4 |
| 7.5 | lines 92-117 | `validateStoryWorkflow.ts` | `buildStep1DecisionTree` | exact branch keys, route order, actions, following branches | legacy direct-entry route moved behind invocation router | 8.9-8.10, 9.1, 11.4 |
| 7.6 | lines 73-90 | `validateStoryWorkflow.ts` | `childInheritance` | exact parent/child key rules and placement | no cleanup | 8.6, 8.11, 9.1, 11.4 |
| 7.7 | lines 35-43, 119-230 | `validateStoryWorkflow.ts` | Step 1 `promptTemplates` | exact array-symbol reference | old single-template reference removed | 8.7, 9.1, 11.4 |
| 7.8 | lines 35-43, 119-230 | `validateStoryWorkflow.ts` | `VALIDATE_STORY_STEP_1_PROMPT_TEMPLATE` | exact removed symbol and retained symbols | cleanup names exact | 9.1, 11.4, 11.10 |
| 8.1 | lines 282-301 | `validateStoryWorkflow.test.ts` | type-only import | exact import addition | no cleanup | 9.1, 11.4 |
| 8.2 | lines 282-301 | `validateStoryWorkflow.test.ts` | workflow import | exact import addition | no cleanup | 9.1, 11.4 |
| 8.3 | lines 282-301 | `validateStoryWorkflow.test.ts` | path constants | exact constants and values | no cleanup | 9.1, 11.4 |
| 8.4 | lines 282-301 | `validateStoryWorkflow.test.ts` | `createPromptBuilderInput` | exact argument and lifecycle shape | old bare-parameter helper replaced | 9.1, 11.4 |
| 8.5 | lines 282-301 | `validateStoryWorkflow.test.ts` | `createDecisionEvaluationInput` | exact helper body | no cleanup | 8.10, 9.1, 11.4 |
| 8.6 | lines 73-90, 282-301 | `validateStoryWorkflow.test.ts` | workflow-values test | exact test rename and childInheritance assertion | stale undefined assertion replaced | 9.1, 11.4 |
| 8.7 | lines 35-43, 282-301 | `validateStoryWorkflow.test.ts` | Step 1 declaration test | exact prompt-template assertion | stale single-template assertion replaced | 9.1, 11.4 |
| 8.8 | lines 119-230, 282-301 | `validateStoryWorkflow.test.ts` | prompt variant tests | exact test names, fixtures, includes, exclusions | old single prompt test replaced | 9.1, 11.4 |
| 8.9 | lines 92-117, 282-301 | `validateStoryWorkflow.test.ts` | routing test | exact test rename and branch-key assertion | stale branch list replaced | 9.1, 11.4 |
| 8.10 | lines 92-117, 282-301 | `validateStoryWorkflow.test.ts` | route assertions | exact route lookup, narrowing, trigger/action/following-branch assertions | stale route assertions replaced | 9.1, 11.4 |
| 8.11 | lines 73-117, 282-301 | `validateStoryWorkflow.test.ts` | child runtime activation test | exact case table, activation call, value/lifecycle/form/isolation assertions | no cleanup | 9.1, 11.4 |
| 9.1 | lines 303-317 | command | focused validate-story tests | exact `npm run test:unit -- ...` command | no cleanup | direct validation |
| 9.2 | lines 303-317 | command | typecheck/proto fallback | elevated exact command and fallback condition | no cleanup | direct validation |
| 9.3 | lines 303-317 | command | tracked scope diff | exact Phase 1/2 allowed tracked scope | no cleanup | direct validation |
| 9.4 | lines 303-317 | command | untracked scope diff | exact allowed untracked scope | no cleanup | direct validation |
| 10.1 | lines 119-230, 282-301 | `integration.test.ts` | prompt path constants | exact constants and values | no cleanup | 11.5 |
| 10.2 | lines 56-71, 282-301 | `integration.test.ts` | `createValidateStoryWorkflowSession` | exact second parameter and lifecycle shape | no cleanup | 11.5 |
| 10.3 | lines 119-230, 282-301 | `integration.test.ts` | `buildValidateStoryPromptContext` | exact argument object and return type | old bare-value parameter replaced | 11.5 |
| 10.4 | lines 282-301 | `integration.test.ts` | zero-argument context calls | exact zero-argument behavior retained | forbids other workflow helper changes | 11.5 |
| 10.5 | lines 119-230, 282-301 | `integration.test.ts` | main-agent projection test | exact test rename, includes, exclusions | stale prompt projection assertions replaced | 11.5 |
| 10.6 | lines 119-230, 282-301 | `integration.test.ts` | child prompt projection test | exact contexts, optional block narrowing, includes, exclusions | no cleanup | 11.5 |
| 10.7 | lines 232-260, 282-301 | `integration.test.ts` | tool projection assertions | exact native and non-native schema assertions | no cleanup | 11.5 |
| 11.1 | lines 303-317 | command | runtime unit tests | exact command | no cleanup | direct validation |
| 11.2 | lines 303-317 | command | subagent unit tests | exact command | no cleanup | direct validation |
| 11.3 | lines 303-317 | command | sibling child-workflow unit tests | exact command | no cleanup | direct validation |
| 11.4 | lines 303-317 | command | validate-story unit tests | exact command | no cleanup | direct validation |
| 11.5 | lines 303-317 | command | prompt integration tests | exact command | no cleanup | direct validation |
| 11.6 | lines 303-317 | command | typecheck/proto fallback | elevated exact command and fallback condition | no cleanup | direct validation |
| 11.7 | lines 303-317 | command | lint | exact command | no cleanup | direct validation |
| 11.8 | lines 303-317 | command | package/proto fallback | exact command and fallback condition | no cleanup | direct validation |
| 11.9 | lines 303-317 | command | conditional-marker static guard | exact `rg` command and no-match expectation | no cleanup | direct validation |
| 11.10 | lines 303-317 | command | legacy prompt static guard | exact `rg` command and no-match expectation | no cleanup | direct validation |
| 11.11 | lines 232-260, 303-317 | command | forbidden tool static guard | exact `rg` command and no-match expectation | no cleanup | direct validation |
| 11.12 | lines 232-260, 303-317 | command | forbidden legacy workflow static guard | exact `rg` command and no-match expectation | no cleanup | direct validation |
| 11.13 | lines 303-317 | command | initial action-plan drift guard | exact `git diff --name-only -- .../action-plan.md` command | no cleanup | direct validation |
| 11.14 | lines 303-317 | command | tracked scope diff | exact final tracked allowlist | no cleanup | direct validation |
| 11.15 | lines 303-317 | command | untracked scope diff | exact final untracked allowlist | no cleanup | direct validation |
