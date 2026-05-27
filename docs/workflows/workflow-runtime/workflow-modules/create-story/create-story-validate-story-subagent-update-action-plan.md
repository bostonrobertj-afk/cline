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

This plan updates the already-built `create-story` workflow module so Step 3 invokes validate-story subagents and owns final completion, using [create-story-validate-story-subagent-update-requirements.md](./create-story-validate-story-subagent-update-requirements.md) as the backing requirements document.

This is a new update action plan. Do not edit [action-plan.md](./action-plan.md), which belongs to the initial create-story module build.

Scope-diff note: [create-story-validate-story-subagent-update-requirements.md](./create-story-validate-story-subagent-update-requirements.md) is the backing requirements document for this update and may appear as an untracked documentation file in scope-diff checks. It is authorized to persist as an untracked file, but this plan does not authorize editing it.

## Scope Boundary

- Do not edit `docs/workflows/workflow-runtime/workflow-modules/create-story/action-plan.md`.
- Do not edit `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-requirements.md`.
- Do not edit `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-requirements.md`.
- Do not edit `/Users/robertboston/Documents/Cline/Workflows/create-story.md`.
- Do not change create-story identity, persona, project subfolder, prerequisite declarations, workflow forms, entry project keys, artifact declarations, or registry registration.
- Do not add create-story `childInheritance` rules, subagent locking, parent/child synchronization, subagent result parsing, or parent workflow mutation.
- Do not expose backend-only workflow tools, story-planning tools, artifact lifecycle tools, `update_story_index_status`, or `move_workflow_project_file` in model-facing create-story tool schemas.
- Do not add exact full-prompt snapshot assertions for editable prompt prose; use focused includes, exclusions, materialized workflow-value checks, route checks, and projected-tool checks.

## Requirement Trace

| Requirement | Required Behavior | Owning Files |
| --- | --- | --- |
| Update requirements lines 9-41 | Remove Step 4, keep Step 1 and Step 2 behavior unchanged except shared tool schema resolution, and make Step 3 own subagent validation plus final completion. | `createStoryWorkflow.ts`, `createStoryWorkflow.test.ts`, `integration.test.ts` |
| Update requirements lines 43-191 | Preserve exact Step 3 prompt variants and shared text, exclude source authoring metadata, and fail clearly for unsupported Step 3 state. | `createStoryWorkflow.ts`, `createStoryWorkflow.test.ts`, `integration.test.ts` |
| Update requirements lines 193-217 | Route Step 3 through `project_prompt`, wait for `attempt_completion_succeeded`, and retain finalization semantics with `step-3-*` branch and route IDs. | `createStoryWorkflow.ts`, `createStoryWorkflow.test.ts` |
| Update requirements lines 219-250 | Resolve create-story shared/default model-facing tools through `ClineToolSet`, preserve Step 2 tool order, and update Step 3 tool order with `use_subagents` and `attempt_completion`. | `createStoryToolSchemas.ts`, `createStoryToolSchemas.test.ts`, `integration.test.ts` |
| Update requirements lines 252-272 | Keep validate-story subagent invocation model-owned through `use_subagents` and the exact `Skill: use_skill('validate-story')` assignment phrase. | `createStoryWorkflow.ts`, `createStoryWorkflow.test.ts`, `integration.test.ts` |
| Update requirements lines 274-333 | Update prompt projection and module tests for the three-step workflow, removed Step 4, exact projected Step 3 tool surface, and forbidden legacy text. | `createStoryWorkflow.test.ts`, `createStoryToolSchemas.test.ts`, `integration.test.ts` |
| Update requirements lines 335-359 | Run focused unit tests, prompt integration tests, typecheck, lint, static guards, and scope-diff validation. | Validation tasks in this plan |

## Phase 1: Shared Tool Schema Migration

Allowed files:

- `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md`
- `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`
- `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`

### Task 1: Update Create-Story Tool Schema Imports

- [x] 1.1. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, add the exact import `import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"` before the existing `ClineToolSpec` import.

- [x] 1.2. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, add the exact import `import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"` after the existing `ClineToolSpec` import.

### Task 2: Add Shared Tool Id Arrays And Step Builders

- [x] 2.1. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, add this exact exported Step 2 tool id array after `const CREATE_STORY_TOOL_SCHEMA_VARIANT = ModelFamily.NATIVE_GPT_5`:

```ts
export const CREATE_STORY_STEP_2_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ASK,
	ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.FILE_READ_RANGE,
]
```

- [x] 2.2. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, add this exact exported Step 3 tool id array immediately after `CREATE_STORY_STEP_2_TOOL_IDS`:

```ts
export const CREATE_STORY_STEP_3_TOOL_IDS: readonly ClineDefaultTool[] = [
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ASK,
	ClineDefaultTool.USE_SUBAGENTS,
	ClineDefaultTool.ATTEMPT,
]
```

- [x] 2.3. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, add this exact resolver immediately after `CREATE_STORY_STEP_3_TOOL_IDS`:

```ts
function resolveCreateStorySharedToolSpec(toolId: ClineDefaultTool): ClineToolSpec {
	registerClineToolSets()
	const tool = ClineToolSet.getToolByNameWithFallback(toolId, CREATE_STORY_TOOL_SCHEMA_VARIANT)
	if (tool === undefined) {
		throw new Error(`Missing shared/default tool schema for ${toolId}.`)
	}

	return tool.config
}
```

- [x] 2.4. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, replace the entire `buildCreateStoryStep2ToolSchemas` body with this exact body:

```ts
	return CREATE_STORY_STEP_2_TOOL_IDS.map((toolId) => resolveCreateStorySharedToolSpec(toolId))
```

- [x] 2.5. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, replace the entire `buildCreateStoryStep3ToolSchemas` body with this exact body:

```ts
	return CREATE_STORY_STEP_3_TOOL_IDS.map((toolId) => resolveCreateStorySharedToolSpec(toolId))
```

### Task 3: Update Tool Schema Unit Tests

- [x] 3.1. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, add these exact imports after the `ClineToolSpec` import: `import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"`, `import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"`, and `import { ModelFamily } from "@/shared/prompts"`.

- [x] 3.2. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, update the module import from `../createStoryToolSchemas` so it imports exactly `CREATE_STORY_STEP_2_TOOL_IDS`, `CREATE_STORY_STEP_3_TOOL_IDS`, `buildCreateStoryStep1ToolSchemas`, `buildCreateStoryStep2ToolSchemas`, and `buildCreateStoryStep3ToolSchemas`.

- [x] 3.3. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, replace `STEP_3_TOOL_NAMES` with the exact string array `["list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "send_user_message", "ask_followup_question", "use_subagents", "attempt_completion"]`.

- [x] 3.4. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, delete the `STEP_4_TOOL_NAMES` constant.

- [x] 3.5. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, replace `CREATE_STORY_STEP_BUILDERS` with an array containing exactly `buildCreateStoryStep1ToolSchemas`, `buildCreateStoryStep2ToolSchemas`, and `buildCreateStoryStep3ToolSchemas`.

- [x] 3.6. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, rename the test `"exposes the exact Step 1 through Step 4 tool schema order"` to `"exposes the exact Step 1 through Step 3 tool schema order"`.

- [x] 3.7. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, remove the assertion that calls `buildCreateStoryStep4ToolSchemas()`.

- [x] 3.8. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, add a test named `"resolves create-story shared/default tool schemas through the registered tool set"` that calls `registerClineToolSets()`, defines `const expectedStep2Schemas = CREATE_STORY_STEP_2_TOOL_IDS.map((toolId) => ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)?.config)`, defines `const expectedStep3Schemas = CREATE_STORY_STEP_3_TOOL_IDS.map((toolId) => ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)?.config)`, then asserts `expect(buildCreateStoryStep2ToolSchemas()).to.deep.equal(expectedStep2Schemas)` and `expect(buildCreateStoryStep3ToolSchemas()).to.deep.equal(expectedStep3Schemas)`.

- [x] 3.9. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, add `expect(schemaNames(buildCreateStoryStep3ToolSchemas())).not.to.include("workflow_progress_request")` and `expect(schemaNames(buildCreateStoryStep3ToolSchemas())).to.include("use_subagents")` to the exact Step 1 through Step 3 tool schema order test.

- [x] 3.10. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, replace `FORBIDDEN_MODEL_FACING_TOOL_NAMES` with this exact array:

```ts
const FORBIDDEN_MODEL_FACING_TOOL_NAMES: readonly string[] = [
	"set_workflow_values",
	"plan_story_artifacts",
	"plan_remediation_story_artifact",
	"generate_story_files",
	"build_workflow_document",
	"create_workflow_artifact",
	"archive_workflow_artifact",
	"delete_workflow_artifact",
	"move_workflow_project_file",
]
```

### Task 4: Validate Shared Tool Schema Migration

- [x] 4.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts` and verify the command exits successfully.

- [x] 4.2. Run `npm run check-types` with elevated permissions and verify the command exits successfully. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

- [x] 4.3. Run `npm run lint` and verify the command exits successfully.

- [x] 4.4. Run `git diff --name-only` and verify tracked diffs are limited to `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md`, `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, and `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`.

- [x] 4.5. Run `git ls-files --others --exclude-standard` and verify untracked files are limited to `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md` and `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-requirements.md`.

## Phase 2: Step 3 Prompt And Routing Migration

Allowed files:

- `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md`
- `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

### Task 5: Remove Step 4 Workflow Wiring

- [ ] 5.1. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, update the import from `./createStoryToolSchemas` so it imports exactly `buildCreateStoryStep1ToolSchemas`, `buildCreateStoryStep2ToolSchemas`, and `buildCreateStoryStep3ToolSchemas`.

- [ ] 5.2. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, delete the `CREATE_STORY_STEP_4_PROMPT_TEMPLATE` constant.

- [ ] 5.3. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, delete the `buildStep4PromptSource` function.

- [ ] 5.4. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, delete the `buildStep4DecisionTree` function.

- [ ] 5.5. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, delete the `"step-4"` entry from `createStoryWorkflowDefinition.steps`.

- [ ] 5.6. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, update the `stepNumber` property inside the `createStepDefinition` argument type from `stepNumber: 1 | 2 | 3 | 4` to exactly `stepNumber: 1 | 2 | 3`.

### Task 6: Replace Step 3 Shared Prompt Text

- [ ] 6.1. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, replace `STEP_3_SHARED_PROMPT_TEMPLATE` with this exact constant:

```ts
const STEP_3_SHARED_PROMPT_TEMPLATE = `You must follow these rules when authoring story tasks & subtasks:
1. Verify solution quality and standards
   - Ensure the proposed code or fix is appropriate, elegant, and consistent with modern, industry-standard practices for the project's tech stack, including CLEAN architecture.
   - If you must deviate from best practices (e.g., due to constraints), clearly explain why and what the ideal pattern would be.
2. Prescribe deep, architectural fixes over surface workarounds
   - Check whether the issue can and should be solved at a deeper architectural layer (design, data flow, responsibilities) rather than with a shallow or hacky workaround.
   - If you choose a workaround for pragmatic reasons, explicitly label it as such and describe the deeper architectural fix that would be ideal.
3. Look for underlying design-pattern flaws
   - Examine whether the issue reveals deeper design or pattern problems (e.g., responsibilities mixed, poor separation of concerns, leaky abstractions).
   - If such problems exist, call them out explicitly and propose how they could be addressed, even if the full fix is out of scope for the immediate change.
4. Consider downstream and peripheral impact
   - Evaluate how the change may affect other modules, call sites, and features, including edge cases and lifecycle interactions. Search the codbase and read peripheral files if uncertain.
   - If the change is likely to cause downstream or peripheral issues, that is acceptable only if:
     a) You clearly identify and describe these risks, AND
     b) You propose follow-up steps or mitigations as part of the solution.
5. Avoid hardcoded values; prescribe integration with config/strings where appropriate
   - Do NOT introduce hardcoded strings or values when they represent configuration, thresholds, labels, messages, or anything reasonably likely to change.
   - Instead, integrate such values into the app’s configuration system when appropriate for user/admin/dev tweaking
   - All user-facing or UI strings MUST go into a strings.xml (or similar)
   - If you cannot follow this rule for some reason, explicitly state why.
6. Prescribe removal of cruft and failed-attempt remnants
   - Ensure that your changes do not leave behind obsolete code/imports, commented-out experiments, dead branches, or outdated patterns related to prior failed attempts.
   - Consider related/downstream modules that may now contain redundant or inconsistent code as a result of your change.
   - De-crufting should be treated as part of the fix: either perform it in your changes, or clearly specify what should be removed/refactored and where.
- When deleting or retiring a domain concept, delete its named gates, helper methods, variables, and tests rather than repointing them at another surviving concept.
7. Practice Good Code Hygiene by avoiding common bad habits:
    - "any" typing
    - val as SomeType
    - as any in tests
    - optional properties most of the time (explicitly model which combinations exist and which don't whenever possible)
    - one-letter generics
    - non-boolean boolean checks
    - bang bang operators (explicitly check for the condition instead)
    - != null (explicitly check for the condition instead)
    - not declaring function return types
    - abuse of type assertions (use them only in special scenarios where the type is clearly known, and give priority to type declarations, interfaces, or generics)
    - Failing to use utility types (use utility types such as partial, pick, omit, etc when appropriate)
    - forcing assertions when types don't match
    - not using enums to manage constants
    - not using generics to abstract duplicated code
    - not using type narrowing
    - not explicitly defining generics parameters
    - semantic aliasing, where a variable/function/type with an old domain meaning is reassigned to a new generic or unrelated concept instead of being deleted
    - stale domain naming after behavior migration; names must describe the current approved responsibility, not the historical source of the code
    - compatibility remaps that preserve retired concepts by pointing them at surviving generic behavior unless the upstream requirements explicitly approve that remap
    - boolean aliases whose name does not exactly match the condition they represent; use the existing boolean directly or introduce a correctly named concept only if the architecture requires it
    - retaining obsolete gates/seams/flags after their original behavior is removed
8. Do not introduce architecture in the action plan that is not prescribed in an upstream document.
    - The action plan must not introduce architectural concepts or solutions which are not backed by existing project documentation. If something is not explicitly prescribed, you must gain user alignment and approval before including it in the action plan.
    - If you determine that additional or different architecture is necessary while authoring the action plan, you must stop and inform the user so that the appropriate revisions can be made to upstream documents first.
9. Avoid in-plan churn. Do not prescribe code in one task/ subtask only to replace the prescribed code in a subsequent task/ subtask. Identify the final shape of every line being prescribed, and require the dev agent to implement it that way in one task / subtask. 
10. The action plan must end in a repo-valid intermediate state that passes the same static gates required before commit, including formatting, lint, typecheck and any focused tests prescribed for that phase.
    - Do not prescribe unused imports, unused helpers, placeholder scaffolding, future-step code, or partially wired definitions unless the story's tasks/ subtasks also wire them into legitimate runtime use.
11. Tasks & Subtasks must be on their own lines starting with "[ ]" so that dev agents can mark completion as they progress through the action plan.
    - tasks & subtasks must have numerical IDs, with subtasks inheriting the parent task ID, e.g. task 1, subtasks 1.1, 1.2.
    - Subtasks must prescribe exact line-level revisions with target file indicated.
    - Subtasks must never prescribe more than ONE required revision
12. NEVER prescribe retyping, casting, renaming, or otherwise mutating existing capabilities/functionality within a task or subtask unless you have surfaced the proposed change as a single topic to the user and gained their approval.

If at any point you cannot satisfy one or more of these rules (for example, due to missing context or constraints in the existing architecture), you MUST:
- Explicitly state which rule(s) you cannot fully satisfy, and why.
- Propose the best available compromise, and outline what a more ideal long-term fix would look like.

After authoring the tasks & subtasks, dispatch a subagent to validate that the story is fully compliant and implementation-ready.
You must provide the subagent with this exact prompt (no paraphrasing or alterations of any kind):
Skill: use_skill('validate-story') Your task is to validate the story document I've just drafted to ensure that it is implementation-ready. You will receive separate workflow instructions which provide exact guidance regarding story validation. Complete the story validation per the instructions, then respond to me using attempt_completion with your findings. In your response, you must include the exact task and/or subtask numbers for any items which have issues that I need to address.

Once the subagent completes their validation & provides you with their findings, address any issues they've identified. If the subagent identified issues, correct them in the story document, shut down the subagent, and repeat the subagent validation process with a fresh subagent. Repeat this process until a subagent completes validation with no findings.

Once validation passes with no findings, call attempt_completion and include the following information:
- The story is complete and implementation-ready
- Story validation was completed by a Subagent via the Validate Story workflow and all issues were successfully resolved
- The user should run the Dev Story workflow next`
```

- [ ] 6.2. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, replace `CREATE_STORY_STEP_3_BACKLOG_PROMPT_TEMPLATE` with this exact constant:

```ts
const CREATE_STORY_STEP_3_BACKLOG_PROMPT_TEMPLATE = `Review the existing tasks and subtasks in {workflow.target_story} and determine whether they meet the following criteria:
- They fully satisfy the story's requirements
- They respect the story's scope and scope boundary
- They support achievement of the story's objective
- They prescribe changes in a manner which complies with the story's general instructions
- Subtasks are scoped to a single revision in a single target file
- Each subtask includes specific allowed files
- Tasks & subtasks provide specific prescriptive revisions without deferring decision space to the implementing agent.
- Requirements do not ask for delivery of imports, helpers, placeholder scaffolding, future-step code, or partially-wired definitions unless the story will also wire them into legitimate runtime use.
- Prescribed tests provide adequate coverage of both happy paths and failure paths for all code revisions
- Tests are prescribed only for behavior, contracts, regression, and material risks required by the story document and project documentation
- Any tests built via the story's tasks use exact assertions for canonical machine-consumed outputs and stable contracts, including tool names/ schema shape, artifact file formats, and persisted metadata.
- Any tests built via the story's tasks use shape and invariant assertions for editable content: required fields exist, strings are non-empty, mappings are correct, and forbidden legacy values are absent.
- Any tests built via the story's tasks do not add static guards unless they protect an approved boundary, forbidden legacy dependency, or known regression risk.

Notify the user that you've reviwed the existing tasks & subtasks for coverage, consistency, and quality, surface any issues you've identified to them, and ask them what additional issues or concerns they'd like you to address.

${STEP_3_SHARED_PROMPT_TEMPLATE}`
```

- [ ] 6.3. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, replace `CREATE_STORY_STEP_3_DRAFT_PROMPT_TEMPLATE` with this exact constant:

```ts
const CREATE_STORY_STEP_3_DRAFT_PROMPT_TEMPLATE = `Review runtime code & tests and identify the full set of in-scope revisions needed to deliver the story's requirements and objective.
If the story requires touching existing artifacts or placeholders, trace the exact runtime resolution path end to end:
    config/source of truth
    resolver/helper
    handler/runtime consumer
    tests/docs that assert the convention
    For any plan that introduces a new artifact, tool, or schema entry, perform a sibling-pattern audit:
    registration
    executor wiring
    prompt/tool exposure
    approval/path policy
    tests
    snapshots/generated surfaces
    docs/reference surfaces if treated as canonical in-repo
Provide the user with the identified revision set and tell them your next step is to translate these revisions into implementation-ready tasks and subtasks.
Next, build the story's tasks & subtasks using the identified revision set.

${STEP_3_SHARED_PROMPT_TEMPLATE}`
```

- [ ] 6.4. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, ensure `STEP_3_SHARED_PROMPT_TEMPLATE`, `CREATE_STORY_STEP_3_BACKLOG_PROMPT_TEMPLATE`, and `CREATE_STORY_STEP_3_DRAFT_PROMPT_TEMPLATE` do not include `*** User Review & Feedback ***`, `Provide the user with the full path for {workflow.target_story}`, `unlock the next step's instructions`, `workflow_progress_request`, `After authoring the tasks & subtasks, reach each line of the story`, or `### Progression Rule: successful use of attempt_completion`.

- [ ] 6.5. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, keep `buildStep3PromptSource(input: WorkflowPromptBuilderInput)` with this exact final body:

```ts
	const selectedStoryStatus = readWorkflowStringValue(
		input.session.workflowValues,
		CreateStoryWorkflowValueKey.SelectedStoryStatus,
	)

	if (selectedStoryStatus === "backlog") {
		return {
			kind: "current_step_instruction_template",
			currentStepInstructionTemplate: CREATE_STORY_STEP_3_BACKLOG_PROMPT_TEMPLATE,
		}
	}

	if (selectedStoryStatus === "draft") {
		return {
			kind: "current_step_instruction_template",
			currentStepInstructionTemplate: CREATE_STORY_STEP_3_DRAFT_PROMPT_TEMPLATE,
		}
	}

	throw new Error(`Create Story Step 3 prompt does not support selected_story_status ${selectedStoryStatus ?? "unset"}.`)
```

### Task 7: Move Finalization Routes Into Step 3

- [ ] 7.1. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, replace `buildStep3DecisionTree()` so its `entryBranchId` remains `"step-3-project-prompt"` and its branch keys are exactly `"step-3-project-prompt"`, `"step-3-await-attempt-completion"`, `"step-3-await-draft-status-update"`, `"step-3-await-draft-story-move"`, and `"step-3-await-backlog-status-update"`.

- [ ] 7.2. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, set the `"step-3-project-prompt"` route to this exact route object:

```ts
{
	id: "step-3-project-prompt",
	trigger: { kind: "always" },
	action: {
		kind: "project_prompt",
	},
	followingBranchId: "step-3-await-attempt-completion",
}
```

- [ ] 7.3. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, set the `"step-3-await-attempt-completion"` branch routes to exactly two routes with IDs `"step-3-update-draft-story-status-to-backlog"` and `"step-3-confirm-backlog-story-status"`.

- [ ] 7.4. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, set route `"step-3-update-draft-story-status-to-backlog"` to use `trigger: attemptCompletionSucceededForSelectedStoryStatus("draft")`, action `{ kind: "update_story_index_status", storyIndexWorkflowValueKey: CreateStoryWorkflowValueKey.StoriesIndex, storyIdentityWorkflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity, status: "backlog", expectedCurrentStatus: "draft" }`, and `followingBranchId: "step-3-await-draft-status-update"`.

- [ ] 7.5. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, set route `"step-3-confirm-backlog-story-status"` to use `trigger: attemptCompletionSucceededForBacklogRevision()`, action `{ kind: "update_story_index_status", storyIndexWorkflowValueKey: CreateStoryWorkflowValueKey.StoriesIndex, storyIdentityWorkflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity, status: "backlog", expectedCurrentStatus: "backlog" }`, and `followingBranchId: "step-3-await-backlog-status-update"`.

- [ ] 7.6. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, set the `"step-3-await-draft-status-update"` branch routes to these exact two route objects:

```ts
{
	id: "step-3-move-draft-story-to-backlog",
	trigger: toolBackedOperationSucceeded(
		"step-3-await-attempt-completion",
		"step-3-update-draft-story-status-to-backlog",
	),
	action: {
		kind: "move_project_file",
		sourceFolderSegments: ["implementation", "drafts"],
		destinationFolderSegments: ["implementation", "stories-backlog"],
		filenameWorkflowValueKey: CreateStoryWorkflowValueKey.TargetStoryFilenameForMove,
	},
	followingBranchId: "step-3-await-draft-story-move",
},
{
	id: "step-3-terminal-error-after-draft-status-update",
	trigger: toolBackedOperationFailed(
		"step-3-await-attempt-completion",
		"step-3-update-draft-story-status-to-backlog",
	),
	action: {
		kind: "terminal_error",
		errorMessage: "Unable to update selected draft story status to backlog.",
	},
}
```

- [ ] 7.7. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, set the `"step-3-await-draft-story-move"` branch routes to these exact two route objects:

```ts
{
	id: "step-3-complete-workflow-after-draft-story-move",
	trigger: toolBackedOperationSucceeded(
		"step-3-await-draft-status-update",
		"step-3-move-draft-story-to-backlog",
	),
	action: {
		kind: "complete_workflow",
	},
},
{
	id: "step-3-terminal-error-after-draft-story-move",
	trigger: toolBackedOperationFailed(
		"step-3-await-draft-status-update",
		"step-3-move-draft-story-to-backlog",
	),
	action: {
		kind: "terminal_error",
		errorMessage: "Unable to move selected draft story to the implementation backlog.",
	},
}
```

- [ ] 7.8. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, set the `"step-3-await-backlog-status-update"` branch routes to these exact two route objects:

```ts
{
	id: "step-3-complete-workflow-after-backlog-status-confirmation",
	trigger: toolBackedOperationSucceeded(
		"step-3-await-attempt-completion",
		"step-3-confirm-backlog-story-status",
	),
	action: {
		kind: "complete_workflow",
	},
},
{
	id: "step-3-terminal-error-after-backlog-status-confirmation",
	trigger: toolBackedOperationFailed(
		"step-3-await-attempt-completion",
		"step-3-confirm-backlog-story-status",
	),
	action: {
		kind: "terminal_error",
		errorMessage: "Unable to confirm selected backlog story status.",
	},
}
```

- [ ] 7.9. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, ensure `buildStep3DecisionTree()` does not call `workflowProgressRequestConfirmed()`, does not call `workflowProgressRequestDenied()`, does not route to `transition_step`, and does not reference step number `4`.

### Task 8: Update Workflow Definition Unit Tests

- [ ] 8.1. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, delete the `ProgressionRouteExpectation` interface.

- [ ] 8.2. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, update the test named `"routes progress confirmation forward and denial back to the project prompt"` so it no longer declares a `progressionCases` array and no longer loops over Step 2 and Step 3 cases.

- [ ] 8.3. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, update the workflow definition inventory test so `Object.keys(createStoryWorkflowDefinition.steps)` is asserted to deep equal exactly `["step-1", "step-2", "step-3"]`.

- [ ] 8.4. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, remove the assertion that `getStep("step-4")` includes `id: "step-4"`, `stepNumber: 4`, and `checklistLabel: "Finalize & Validate Story Document"`.

- [ ] 8.5. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, add `const retiredStepId = ["step", "4"].join("-")` immediately after the exact step-key assertion and assert `expect(Reflect.has(createStoryWorkflowDefinition.steps, retiredStepId)).to.equal(false)`.

- [ ] 8.6. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, update the Step 3 draft prompt test to assert the rendered prompt includes the materialized path `/tmp/create-story-project/implementation/drafts/Story-1-1.md`, includes `Skill: use_skill('validate-story')`, includes `Your task is to validate the story document I've just drafted to ensure that it is implementation-ready.`, includes `Complete the story validation per the instructions, then respond to me using attempt_completion with your findings.`, includes `The story is complete and implementation-ready`, includes `Story validation was completed by a Subagent via the Validate Story workflow and all issues were successfully resolved`, includes `The user should run the Dev Story workflow next`, and does not include `{workflow.target_story}`.

- [ ] 8.7. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, update the Step 3 backlog prompt test to assert the rendered prompt includes the materialized path `/tmp/create-story-project/implementation/stories-backlog/Story-1-2.md`, includes `Review the existing tasks and subtasks`, includes `Skill: use_skill('validate-story')`, includes `The story is complete and implementation-ready`, includes `Story validation was completed by a Subagent via the Validate Story workflow and all issues were successfully resolved`, includes `The user should run the Dev Story workflow next`, and does not include `{workflow.target_story}`.

- [ ] 8.8. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, add a Step 3 prompt test named `"omits retired progress and Step 4 prompt text from Step 3 prompts"` with this exact assertion block:

```ts
const draftPrompt = getPromptInstructions("step-3", {
	[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/drafts/Story-1-1.md",
	[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "draft",
})
const backlogPrompt = getPromptInstructions("step-3", {
	[CreateStoryWorkflowValueKey.TargetStory]: "/tmp/create-story-project/implementation/stories-backlog/Story-1-2.md",
	[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog",
})
const retiredStepChecklistLabel = ["Finalize", " & Validate Story Document"].join("")

for (const prompt of [draftPrompt, backlogPrompt]) {
	expect(prompt).not.to.include("*** User Review & Feedback ***")
	expect(prompt).not.to.include("unlock the next step's instructions")
	expect(prompt).not.to.include("workflow_progress_request")
	expect(prompt).not.to.include("### Progression Rule: successful use of attempt_completion")
	expect(prompt).not.to.include(
		"Verify that {workflow.target_story} is complete, correctly formatted, internally consistent, and safe to hand off for implementation.",
	)
	expect(prompt).not.to.include(retiredStepChecklistLabel)
	expect(prompt).not.to.include("*** Shown only if")
	expect(prompt).not.to.include("*** end conditional prompt block ***")
}
```

- [ ] 8.9. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, update the tool exposure test named `"exposes workflow_progress_request only in progress-request steps"` so it asserts Step 1 does not include `"workflow_progress_request"`, Step 2 includes `"workflow_progress_request"`, Step 3 does not include `"workflow_progress_request"`, and no assertion references Step 4.

- [ ] 8.10. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, add a Step 3 tool exposure test named `"exposes use_subagents and attempt_completion in Step 3"` that asserts `getToolNamesForStep("step-3")` deep equals exactly `["list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "send_user_message", "ask_followup_question", "use_subagents", "attempt_completion"]`.

- [ ] 8.11. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, update the test named `"routes progress confirmation forward and denial back to the project prompt"` so it asserts these exact Step 2 route contracts and does not reference Step 3: `findStepRoute("step-2", "step-2-project-prompt", "step-2-project-prompt")` has `trigger` deep equal `{ kind: "always" }`, `action` deep equal `{ kind: "project_prompt" }`, and `followingBranchId` equal `"step-2-await-progress-request"`; `findStepRoute("step-2", "step-2-await-progress-request", "step-2-transition-to-step-3")` has `trigger` deep equal `{ kind: "on_event", eventKind: "workflow_progress_request_confirmed" }` and `action` deep equal `{ kind: "transition_step", target: { kind: "entry_branch", stepNumber: 3 } }`; `findStepRoute("step-2", "step-2-await-progress-request", "step-2-return-to-project-prompt")` has `trigger` deep equal `{ kind: "on_event", eventKind: "workflow_progress_request_denied" }` and `action` deep equal `{ kind: "project_prompt" }`.

- [ ] 8.12. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, delete the Step 4 prompt test named `"builds a non-empty final validation prompt"`.

- [ ] 8.13. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, replace the Step 4 attempt-completion exposure test with a Step 3 test named `"exposes attempt_completion only in Step 3"` that asserts Step 1 and Step 2 do not include `"attempt_completion"`, asserts Step 3 includes `"attempt_completion"`, and does not reference Step 4.

- [ ] 8.14. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, replace the Step 4 draft finalization test with a Step 3 test named `"routes draft finalization through status update, file move, completion, and terminal errors"` containing this exact setup and project-prompt/status-update assertions:

```ts
const projectPromptRoute = findStepRoute("step-3", "step-3-project-prompt", "step-3-project-prompt")
expect(projectPromptRoute.trigger).to.deep.equal({ kind: "always" })
expect(projectPromptRoute.action).to.deep.equal({
	kind: "project_prompt",
})
expect(projectPromptRoute.followingBranchId).to.equal("step-3-await-attempt-completion")

const statusUpdateRoute = findStepRoute(
	"step-3",
	"step-3-await-attempt-completion",
	"step-3-update-draft-story-status-to-backlog",
)
expectEventPredicateMatchesForStep({
	stepId: "step-3",
	route: statusUpdateRoute,
	workflowValues: {
		[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "draft",
	},
	triggerEvent: {
		kind: "attempt_completion_succeeded",
	},
})
```

- [ ] 8.15. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, in the Step 3 draft finalization test, assert route `"step-3-update-draft-story-status-to-backlog"` action deep equals `{ kind: "update_story_index_status", storyIndexWorkflowValueKey: CreateStoryWorkflowValueKey.StoriesIndex, storyIdentityWorkflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity, status: "backlog", expectedCurrentStatus: "draft" }` and assert `statusUpdateRoute.followingBranchId` equals `"step-3-await-draft-status-update"`.

- [ ] 8.16. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, in the Step 3 draft finalization test, add this exact move-route action assertion:

```ts
const moveRoute = findStepRoute("step-3", "step-3-await-draft-status-update", "step-3-move-draft-story-to-backlog")
expect(moveRoute.action).to.deep.equal({
	kind: "move_project_file",
	sourceFolderSegments: ["implementation", "drafts"],
	destinationFolderSegments: ["implementation", "stories-backlog"],
	filenameWorkflowValueKey: CreateStoryWorkflowValueKey.TargetStoryFilenameForMove,
})
```

- [ ] 8.17. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, replace the Step 4 backlog finalization test with a Step 3 test named `"routes backlog revision finalization through status confirmation without file movement"` and begin the test with this exact route setup and assertion block:

```ts
const statusConfirmationRoute = findStepRoute(
	"step-3",
	"step-3-await-attempt-completion",
	"step-3-confirm-backlog-story-status",
)
expectEventPredicateMatchesForStep({
	stepId: "step-3",
	route: statusConfirmationRoute,
	workflowValues: {
		[CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog",
		[CreateStoryWorkflowValueKey.ReviseBacklogStory]: true,
	},
	triggerEvent: {
		kind: "attempt_completion_succeeded",
	},
})
expect(statusConfirmationRoute.action).to.deep.equal({
	kind: "update_story_index_status",
	storyIndexWorkflowValueKey: CreateStoryWorkflowValueKey.StoriesIndex,
	storyIdentityWorkflowValueKey: CreateStoryWorkflowValueKey.SelectedStoryIdentity,
	status: "backlog",
	expectedCurrentStatus: "backlog",
})
expect(statusConfirmationRoute.followingBranchId).to.equal("step-3-await-backlog-status-update")

const backlogStatusBranch = getStep("step-3").decisionTree.branches["step-3-await-backlog-status-update"]
if (backlogStatusBranch === undefined) {
	throw new Error("Missing backlog status update branch.")
}
expect(backlogStatusBranch.routes.map((route) => route.action.kind)).to.deep.equal([
	"complete_workflow",
	"terminal_error",
])
```

- [ ] 8.18. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, in the Step 3 draft finalization test, add these exact route lookup and event predicate assertions:

```ts
expectEventPredicateMatchesForStep({
	stepId: "step-3",
	route: moveRoute,
	workflowValues: {},
	triggerEvent: buildToolBackedOperationSucceededEvent(
		"step-3-await-attempt-completion",
		"step-3-update-draft-story-status-to-backlog",
	),
})
expect(moveRoute.followingBranchId).to.equal("step-3-await-draft-story-move")

const statusFailureRoute = findStepRoute(
	"step-3",
	"step-3-await-draft-status-update",
	"step-3-terminal-error-after-draft-status-update",
)
expectEventPredicateMatchesForStep({
	stepId: "step-3",
	route: statusFailureRoute,
	workflowValues: {},
	triggerEvent: buildToolBackedOperationFailedEvent(
		"step-3-await-attempt-completion",
		"step-3-update-draft-story-status-to-backlog",
	),
})
expect(statusFailureRoute.action).to.deep.equal({
	kind: "terminal_error",
	errorMessage: "Unable to update selected draft story status to backlog.",
})

const completionRoute = findStepRoute(
	"step-3",
	"step-3-await-draft-story-move",
	"step-3-complete-workflow-after-draft-story-move",
)
expectEventPredicateMatchesForStep({
	stepId: "step-3",
	route: completionRoute,
	workflowValues: {},
	triggerEvent: buildToolBackedOperationSucceededEvent(
		"step-3-await-draft-status-update",
		"step-3-move-draft-story-to-backlog",
	),
})
expect(completionRoute.action).to.deep.equal({
	kind: "complete_workflow",
})

const moveFailureRoute = findStepRoute(
	"step-3",
	"step-3-await-draft-story-move",
	"step-3-terminal-error-after-draft-story-move",
)
expectEventPredicateMatchesForStep({
	stepId: "step-3",
	route: moveFailureRoute,
	workflowValues: {},
	triggerEvent: buildToolBackedOperationFailedEvent(
		"step-3-await-draft-status-update",
		"step-3-move-draft-story-to-backlog",
	),
})
expect(moveFailureRoute.action).to.deep.equal({
	kind: "terminal_error",
	errorMessage: "Unable to move selected draft story to the implementation backlog.",
})
```

- [ ] 8.19. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, add a Step 3 routing negative assertion that `Object.keys(getStep("step-3").decisionTree.branches)` does not include `"step-3-await-progress-request"` and that `JSON.stringify(getStep("step-3").decisionTree)` does not include `"workflow_progress_request_confirmed"` or `"workflow_progress_request_denied"`.

- [ ] 8.20. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, in the Step 3 backlog finalization test, narrow `statusConfirmationRoute.trigger` with this exact guard before direct predicate calls:

```ts
if (statusConfirmationRoute.trigger.kind !== "event_predicate") {
	throw new Error(`Expected event_predicate trigger, received ${statusConfirmationRoute.trigger.kind}.`)
}
```

Then assert `statusConfirmationRoute.trigger.matches(createEventPredicateInput({ activeBranchId: "test-branch", workflowValues: { [CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog", [CreateStoryWorkflowValueKey.ReviseBacklogStory]: false }, step: getStep("step-3"), triggerEvent: { kind: "attempt_completion_succeeded" } }))` equals `false`.

- [ ] 8.21. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, rename the describe block `describe("createStoryWorkflowDefinition Step 4", () => {` to exactly `describe("createStoryWorkflowDefinition Step 3 completion", () => {`.

- [ ] 8.22. In `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, in the Step 3 backlog finalization test, add these exact route lookup and event predicate assertions:

```ts
const completionRoute = findStepRoute(
	"step-3",
	"step-3-await-backlog-status-update",
	"step-3-complete-workflow-after-backlog-status-confirmation",
)
expectEventPredicateMatchesForStep({
	stepId: "step-3",
	route: completionRoute,
	workflowValues: {},
	triggerEvent: buildToolBackedOperationSucceededEvent(
		"step-3-await-attempt-completion",
		"step-3-confirm-backlog-story-status",
	),
})
expect(completionRoute.action).to.deep.equal({
	kind: "complete_workflow",
})

const statusFailureRoute = findStepRoute(
	"step-3",
	"step-3-await-backlog-status-update",
	"step-3-terminal-error-after-backlog-status-confirmation",
)
expectEventPredicateMatchesForStep({
	stepId: "step-3",
	route: statusFailureRoute,
	workflowValues: {},
	triggerEvent: buildToolBackedOperationFailedEvent(
		"step-3-await-attempt-completion",
		"step-3-confirm-backlog-story-status",
	),
})
expect(statusFailureRoute.action).to.deep.equal({
	kind: "terminal_error",
	errorMessage: "Unable to confirm selected backlog story status.",
})
```

### Task 9: Validate Step 3 Migration

- [ ] 9.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts` and verify the command exits successfully.

- [ ] 9.2. Run `npm run check-types` with elevated permissions and verify the command exits successfully. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

- [ ] 9.3. Run `npm run lint` and verify the command exits successfully.

- [ ] 9.4. Run `git diff --name-only` and verify tracked diffs are limited to `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md`, `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, and `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`.

- [ ] 9.5. Run `git ls-files --others --exclude-standard` and verify untracked files are limited to `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md` and `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-requirements.md`.

## Phase 3: Prompt Projection Integration

Allowed files:

- `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md`
- `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`

### Task 10: Update Create-Story Integration Test Helpers

- [ ] 10.1. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, update the import from `@/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas` so it imports exactly `buildCreateStoryStep2ToolSchemas` and `buildCreateStoryStep3ToolSchemas`.

- [ ] 10.2. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, update `type CreateStoryPromptStepNumber = 2 | 3 | 4` to `type CreateStoryPromptStepNumber = 2 | 3`.

- [ ] 10.3. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, update `getCreateStoryEntryBranchId(activeStepNumber: CreateStoryPromptStepNumber)` so it handles exactly cases `2` and `3`, returns `createStoryWorkflowDefinition.steps["step-2"].decisionTree.entryBranchId` for `2`, returns `createStoryWorkflowDefinition.steps["step-3"].decisionTree.entryBranchId` for `3`, and contains no case for `4`.

### Task 11: Update Create-Story Prompt Projection Tests

- [ ] 11.1. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, update the test `"projects active create-story step tools from module-owned builders into native GPT-5 prompts"` so its expectations array contains exactly two entries: `{ activeStepNumber: 2, expectedToolSpecs: buildCreateStoryStep2ToolSchemas() }` and `{ activeStepNumber: 3, expectedToolSpecs: buildCreateStoryStep3ToolSchemas() }`.

- [ ] 11.2. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, replace the test `"renders create-story response-tool guidance for progress steps and completion step only"` with a test named `"renders create-story response-tool guidance for Step 2 progress and Step 3 completion"` that builds Step 2 context and asserts `expectResponseToolNames(systemPrompt, ["\`workflow_progress_request\`"], ["\`attempt_completion\`"])`, then builds Step 3 context and asserts `expectResponseToolNames(systemPrompt, ["\`attempt_completion\`"], ["\`workflow_progress_request\`"])`.

- [ ] 11.3. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, update `"does not statically expose forbidden runtime or story-planning tools in create-story prompt projection"` so `activeStepNumbers` is exactly `[2, 3]`.

- [ ] 11.4. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, in `"does not statically expose forbidden runtime or story-planning tools in create-story prompt projection"`, add Step 3-specific assertions inside the loop: when `activeStepNumber === 3`, `projectedToolNames` includes `"use_subagents"`, includes `"attempt_completion"`, and does not include `"workflow_progress_request"`.

- [ ] 11.5. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, update `"projects create-story current step details into the full-turn input payload only"` so it asserts the Step 2 payload includes `"1. Gather Inputs - Complete"`, `"2. Review Context & Ensure Project Alignment - Active"`, and `"3. Author Tasks & Subtasks - Not Started"`, defines `const retiredStepChecklistLine = ["4. ", "Finalize", " & Validate Story Document", " - Not Started"].join("")`, and asserts `expect(workflowInputPayloadBlock).to.not.include(retiredStepChecklistLine)`.

- [ ] 11.6. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add an optional `workflowValues?: WorkflowValues` parameter to `buildCreateStoryPromptContext(activeStepNumber: CreateStoryPromptStepNumber)` and, immediately after `taskState.activeWorkflowSession = createCreateStoryWorkflowSession(activeStepNumber)`, add this exact block:

```ts
if (workflowValues !== undefined) {
	taskState.activeWorkflowSession.workflowValues = {
		...taskState.activeWorkflowSession.workflowValues,
		...workflowValues,
	}
}
```

- [ ] 11.7. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add a test named `"projects create-story Step 3 validate-story subagent instructions into the full-turn input payload only"` using `async function ()` instead of an arrow function; inside it call `const context = await buildCreateStoryPromptContext(3)`, narrow `context.workflowInputPayloadBlock` by throwing `new Error("Expected create-story Step 3 workflow input payload.")` when it is `undefined`, and assert the payload includes `"Step 3: Author Tasks & Subtasks"`, `CREATE_STORY_TARGET_STORY`, `"Review runtime code & tests and identify the full set of in-scope revisions needed to deliver the story's requirements and objective."`, `"Skill: use_skill('validate-story')"`, `"Your task is to validate the story document I've just drafted to ensure that it is implementation-ready."`, `"Complete the story validation per the instructions, then respond to me using attempt_completion with your findings."`, `"The story is complete and implementation-ready"`, `"Story validation was completed by a Subagent via the Validate Story workflow and all issues were successfully resolved"`, and `"The user should run the Dev Story workflow next"`.

- [ ] 11.8. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, in the create-story Step 3 payload projection test, define `const retiredStepChecklistLabel = ["Finalize", " & Validate Story Document"].join("")` and assert the payload does not include `"{workflow.target_story}"`, `"*** User Review & Feedback ***"`, `"unlock the next step's instructions"`, `"workflow_progress_request"`, `"### Progression Rule: successful use of attempt_completion"`, `"Verify that {workflow.target_story} is complete, correctly formatted, internally consistent, and safe to hand off for implementation."`, `retiredStepChecklistLabel`, `"*** Shown only if"`, or `"*** end conditional prompt block ***"`.

- [ ] 11.9. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, inside the `async function ()` test added by 11.7, add this exact `runPromptTest` assertion block after the workflow-input payload assertions:

```ts
await runPromptTest(this, context, "gpt-5-codex", async ({ systemPrompt, tools }) => {
	expect(systemPrompt).to.not.include("CURRENT STEP DETAILED INSTRUCTIONS")
	expect(systemPrompt).to.not.include("Step 3: Author Tasks & Subtasks")
	expect(systemPrompt).to.not.include("Skill: use_skill('validate-story')")
	expect(systemPrompt).to.not.include("The story is complete and implementation-ready")
	expect(getNativeToolNames(tools)).to.deep.equal(buildCreateStoryStep3ToolSchemas().map((tool) => tool.name))
})
```

- [ ] 11.10. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, add a test named `"projects create-story Step 3 backlog variant content into the full-turn input payload"` using `async function ()` instead of an arrow function; inside it call `const context = await buildCreateStoryPromptContext(3, { [CreateStoryWorkflowValueKey.SelectedStoryStatus]: "backlog", [CreateStoryWorkflowValueKey.TargetStory]: "/test/project/implementation/stories-backlog/Story-1-2.md" })`, narrow `context.workflowInputPayloadBlock` by throwing `new Error("Expected create-story Step 3 backlog workflow input payload.")` when it is `undefined`, then assert the payload includes `"Review the existing tasks and subtasks in /test/project/implementation/stories-backlog/Story-1-2.md and determine whether they meet the following criteria:"`, includes `"Skill: use_skill('validate-story')"`, includes `"The story is complete and implementation-ready"`, does not include `"Review runtime code & tests and identify the full set of in-scope revisions needed to deliver the story's requirements and objective."`, and does not include `"{workflow.target_story}"`.

- [ ] 11.11. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, in the backlog Step 3 payload projection test added by 11.10, define `const retiredStepChecklistLabel = ["Finalize", " & Validate Story Document"].join("")` and assert the payload includes `"Your task is to validate the story document I've just drafted to ensure that it is implementation-ready."`, includes `"Complete the story validation per the instructions, then respond to me using attempt_completion with your findings."`, includes `"Story validation was completed by a Subagent via the Validate Story workflow and all issues were successfully resolved"`, includes `"The user should run the Dev Story workflow next"`, does not include `"*** User Review & Feedback ***"`, does not include `"*** Shown only if"`, does not include `"*** end conditional prompt block ***"`, does not include `"workflow_progress_request"`, does not include `"Verify that {workflow.target_story} is complete, correctly formatted, internally consistent, and safe to hand off for implementation."`, and does not include `retiredStepChecklistLabel`.

- [ ] 11.12. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, remove the exact import line `import { AGENT_FEEDBACK_PARAMETER } from "@/core/prompts/system-prompt/types"`.

- [ ] 11.13. In `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, delete these exact exported local shared/default tool builder functions as one named cleanup set: `buildCreateStoryReadFileToolSchema`, `buildCreateStoryReadFileRangeToolSchema`, `buildCreateStoryListFilesToolSchema`, `buildCreateStorySearchFilesToolSchema`, `buildCreateStoryListCodeDefinitionNamesToolSchema`, `buildCreateStoryApplyPatchToolSchema`, `buildCreateStorySendUserMessageToolSchema`, `buildCreateStoryAskFollowupQuestionToolSchema`, `buildCreateStoryWorkflowProgressRequestToolSchema`, `buildCreateStoryAttemptCompletionToolSchema`, and `buildCreateStoryStep4ToolSchemas`.

### Task 12: Validate Prompt Projection

- [ ] 12.1. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify the command exits successfully.

- [ ] 12.2. Run `npm run check-types` with elevated permissions and verify the command exits successfully. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

- [ ] 12.3. Run `npm run lint` and verify the command exits successfully.

- [ ] 12.4. Run `git diff --name-only` and verify tracked diffs are limited to `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md`, `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, and `src/core/prompts/system-prompt/__tests__/integration.test.ts`.

- [ ] 12.5. Run `git ls-files --others --exclude-standard` and verify untracked files are limited to `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md` and `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-requirements.md`.

## Phase 4: Final Validation

Allowed files:

- `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md`

### Task 13: Run Required Focused Validation

- [ ] 13.1. Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts` and verify the command exits successfully.

- [ ] 13.2. Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify the command exits successfully.

- [ ] 13.3. Run `npm run check-types` with elevated permissions and verify the command exits successfully. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

- [ ] 13.4. Run `npm run lint` and verify the command exits successfully.

### Task 14: Run Static Guards

- [ ] 14.1. Run `rg -n "CREATE_STORY_STEP_4_PROMPT_TEMPLATE|buildStep4DecisionTree|buildStep4PromptSource|buildCreateStoryStep4ToolSchemas" src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify the command returns no matches.

- [ ] 14.2. Run `rg -n "\"step-4\"|step-4-|Finalize & Validate Story Document" src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts` and verify the command returns no matches.

- [ ] 14.3. Run `rg -n "workflow_progress_request" src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts` and verify every match is inside Step 2 prompt template text, `workflowProgressRequestConfirmed`, `workflowProgressRequestDenied`, or `buildStep2DecisionTree`; any match inside `STEP_3_SHARED_PROMPT_TEMPLATE`, `CREATE_STORY_STEP_3_BACKLOG_PROMPT_TEMPLATE`, `CREATE_STORY_STEP_3_DRAFT_PROMPT_TEMPLATE`, or `buildStep3DecisionTree` is a validation failure.

- [ ] 14.4. Run `rg -n "ClineDefaultTool\\.USE_SUBAGENTS|ClineDefaultTool\\.ATTEMPT" src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts` and verify both matches are inside `CREATE_STORY_STEP_3_TOOL_IDS`.

- [ ] 14.5. Run `rg -n "use_subagents|attempt_completion" src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify at least one match exists in each of these exact files: `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, and `src/core/prompts/system-prompt/__tests__/integration.test.ts`.

- [ ] 14.6. Run `rg -n "CreateStoryPromptStepNumber = 2 \\| 3 \\| 4|buildCreateStoryStep4ToolSchemas|buildCreateStoryPromptContext\\(4\\)|activeStepNumber: 4|createStoryWorkflowDefinition\\.steps\\[\"step-4\"\\]|4\\. Finalize & Validate Story Document" src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify the command returns no matches.

- [ ] 14.7. Run `rg -n "buildCreateStoryReadFileToolSchema|buildCreateStoryReadFileRangeToolSchema|buildCreateStoryListFilesToolSchema|buildCreateStorySearchFilesToolSchema|buildCreateStoryListCodeDefinitionNamesToolSchema|buildCreateStoryApplyPatchToolSchema|buildCreateStorySendUserMessageToolSchema|buildCreateStoryAskFollowupQuestionToolSchema|buildCreateStoryWorkflowProgressRequestToolSchema|buildCreateStoryAttemptCompletionToolSchema|buildCreateStoryStep4ToolSchemas|AGENT_FEEDBACK_PARAMETER" src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts` and verify the command returns no matches.

### Task 15: Run Scope-Diff Validation

- [ ] 15.1. Run `git diff --name-only` and verify tracked diffs are limited to these files: `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md`, `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, and `src/core/prompts/system-prompt/__tests__/integration.test.ts`.

- [ ] 15.2. Run `git ls-files --others --exclude-standard` and verify untracked files are absent or limited to `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-action-plan.md` and `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-validate-story-subagent-update-requirements.md`.

- [ ] 15.3. Confirm no files outside the allowed final validation set have persistent tracked or untracked diffs before reporting completion.
