---
title: Workflow UI Surface Phase 2 Generalization Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/doc/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Workflow UI Surface Phase 2 Generalization Action Plan

This plan implements the immediate architectural correction described across:

- [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/discovery.md)
- [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/architecture.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md)

The goal of this pass is not to ship a new human-start workflow form yet. The goal is to remove the remaining hard-coded Phase 1 seams so the workflow-form capability becomes configuration-driven across:

- workflow name
- workflow step number
- resolver id
- prompt strings
- success/error copy
- target tool
- tool-parameter serialization
- tool dictionary content

Locked decisions for this pass:

- Resolver definitions remain capability-owned under `src/core/task/workflow-form/`.
- Workflow-step trigger references remain runtime-owned and must be separated from resolver definitions, matching [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/architecture.md#L204).
- This pass must preserve the currently delivered Phase 1 behavior for `code-review.md` Step 3 exactly.
- This pass must not add a new workflow use case, must not modify workflow source files under `/Users/robertboston/Documents/Cline/Workflows/`, and must not add a slash-command runtime interception path yet.
- The runtime must stop hard-coding `build_review_diff_output`; resolver definitions must own tool selection and tool-param serialization.
- The tool dictionary builder must stop hard-coding `build_review_diff_output`; it must derive schema from the existing tool registry and accept per-resolver configuration.
- `shouldInterceptWorkflowFormBeforeApiTurn(...)` must remain the authoritative pre-turn gate, but its policy must come from a workflow-step trigger registry instead of inline `code-review.md` Step 3 branching.

## Step 1
[x] Generalize the workflow-form contracts and the tool-dictionary builder so resolver definitions can describe arbitrary tools without changing the runtime.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`

Exact edits:
1. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L1), add `import type { ClineDefaultTool } from "@/shared/tools"` immediately after the existing shared/proto imports.
2. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L4), replace `export type WorkflowFormResolverId = "code_review_step_3_diff_source"` with `export type WorkflowFormResolverId = string`.
3. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L14), insert this new interface immediately after `WorkflowFormToolInput`:

```ts
export interface WorkflowFormToolExecutionRequest {
	toolName: ClineDefaultTool
	toolInput: WorkflowFormToolInput
	toolParams: Record<string, string>
}
```

4. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L30-L38), replace `WorkflowFormResolverDefinition` with this exact shape:

```ts
export interface WorkflowFormResolverDefinition {
	id: WorkflowFormResolverId
	toolName: ClineDefaultTool
	title: string
	toolDictionaryTitle: string
	toolDictionaryMarkdown: string
	buildConfirmPayload(session: WorkflowFormSessionState): ClineWorkflowForm
	buildSelectSourcePayload(session: WorkflowFormSessionState): ClineWorkflowForm
	buildCollectInputsPayload(session: WorkflowFormSessionState): ClineWorkflowForm
	buildRetryPayload(session: WorkflowFormSessionState): ClineWorkflowForm
	buildSuccessMessage(session: WorkflowFormSessionState): string
	buildToolExecutionFailureFallbackMessage(session: WorkflowFormSessionState): string
	buildToolExecutionRequest(values: WorkflowFormValues): WorkflowFormToolExecutionRequest
}
```

5. In [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L1-L96), replace the build-review-diff-only implementation with a generic builder that does all of the following:
   - import `ModelFamily` from `@/shared/prompts`
   - import `ClineDefaultTool` from `@/shared/tools`
   - import `registerClineToolSets` from `@/core/prompts/system-prompt/tools/init`
   - import `ClineToolSet` from `@/core/prompts/system-prompt/registry/ClineToolSet`
   - keep using `workflowFormSystemDictionary` and `PHASE_1_SYSTEM_DICTIONARY_KEYS`
   - add this new exported config interface:

```ts
export interface WorkflowFormToolDictionaryConfig {
	toolName: ClineDefaultTool
	heading: string
	runtimeTitle: string
	overviewLines: string[]
	parameterDescriptions: Record<string, string>
	termKeys?: WorkflowFormSystemDictionaryKey[]
}
```

   - add `resolveWorkflowFormToolSpec(toolName: ClineDefaultTool): ClineToolSpec` that:
     - calls `registerClineToolSets()`
     - calls `ClineToolSet.getToolByNameWithFallback(toolName, ModelFamily.GENERIC)`
     - throws `Unknown workflow-form tool spec: ${toolName}` if the tool is absent
   - replace the zero-argument dictionary builders with:

```ts
export function buildToolDictionaryMarkdown(config: WorkflowFormToolDictionaryConfig): string
export function buildRuntimeToolDictionaryMarkdown(config: WorkflowFormToolDictionaryConfig): string
```

   - make both functions iterate the resolved tool spec’s `parameters` array so required/optional status still comes from the schema
   - make parameter descriptions come from `config.parameterDescriptions[parameter.name]`, falling back to `"No dictionary description is available for this parameter."`
   - make term-reference rendering use `config.termKeys ?? PHASE_1_SYSTEM_DICTIONARY_KEYS`
   - keep the current Phase 1 review-diff content by exporting:
     - `TOOL_DICTIONARY_TERM_KEYS`
     - `WORKFLOW_FORM_TOOL_DICTIONARY_HEADING`
     - `WORKFLOW_FORM_RUNTIME_TOOL_REFERENCE_TITLE`
     - `buildReviewDiffOutputToolDictionaryConfig`
     where `buildReviewDiffOutputToolDictionaryConfig` contains the existing Phase 1 heading, title, overview lines, parameter descriptions, and term keys
   - keep the existing zero-argument `buildToolDictionaryMarkdown()` and `buildRuntimeToolDictionaryMarkdown()` call sites working by renaming the generic functions internally to `buildToolDictionaryMarkdownFromConfig(...)` and `buildRuntimeToolDictionaryMarkdownFromConfig(...)`, then re-exporting the current zero-arg wrappers that delegate to `buildReviewDiffOutputToolDictionaryConfig`
6. In [buildToolDictionary.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts#L1-L47):
   - keep the existing assertions for the review-diff dictionary
   - import `ClineDefaultTool` from `@/shared/tools`
   - import `buildToolDictionaryMarkdownFromConfig` and `buildRuntimeToolDictionaryMarkdownFromConfig`
   - add a new test named exactly `"renders any configured tool by looking up its schema through the shared tool registry"` that passes this inline config:

```ts
{
	toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
	heading: "## set_workflow_placeholders",
	runtimeTitle: "Workflow Placeholder Reference",
	overviewLines: ["Persist workflow placeholder values."],
	parameterDescriptions: {
		values: "Workflow placeholder key/value map.",
	},
	termKeys: [],
}
```

   - in that new test, assert the generated markdown includes:
     - `## set_workflow_placeholders`
     - `- \`values\` (required, object): Workflow placeholder key/value map.`
   - add a second assertion in that same test that the runtime markdown built from the same config includes `## set_workflow_placeholders` and does not include `# Workflow UI Surface Tool Dictionary`

## Step 2
[x] Replace the single baked-in resolver implementation with a configuration-driven resolver registry and add a separate workflow-step trigger registry.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Exact edits:
1. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L1-L257):
   - add `import { ClineDefaultTool } from "@/shared/tools"`
   - import `type { WorkflowFormResolverId }` from `./types`
   - import `buildReviewDiffOutputToolDictionaryConfig` and `buildRuntimeToolDictionaryMarkdownFromConfig` from `./dictionaries/buildToolDictionary`
2. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L10-L16), keep the existing field-key constants exactly as-is. They remain the Phase 1 resolver’s field schema.
3. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L127-L155), change `buildBasePayload(...)` so it accepts `resolver: WorkflowFormResolverDefinition` as a second parameter and uses:
   - `toolName: resolver.toolName`
   - `title: resolver.title`
   - `toolDictionaryTitle: resolver.toolDictionaryTitle`
   - `toolDictionaryMarkdown: resolver.toolDictionaryMarkdown`
   instead of the current hard-coded build-review-diff values.
4. At the top of [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L1), add this exported constant exactly:

```ts
export const CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID = "code_review_step_3_diff_source"
```

5. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L157-L253), keep only one live resolver entry, but rewrite it so it is fully metadata-driven:
   - `id: CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID`
   - `toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT`
   - `title: "Review Diff Artifact"`
   - `toolDictionaryTitle: "Diff Source Reference"`
   - `toolDictionaryMarkdown: buildRuntimeToolDictionaryMarkdownFromConfig(buildReviewDiffOutputToolDictionaryConfig)`
   - keep the existing confirm/select-source/collect/retry prompts verbatim
   - add `buildSuccessMessage()` that returns exactly `"The Step 3 diff artifact is ready."`
   - add `buildToolExecutionFailureFallbackMessage()` that returns exactly `"The workflow form could not build the Step 3 diff artifact. Review the input and try again."`
   - replace `translateSubmissionToToolUse(values)` with `buildToolExecutionRequest(values)` that:
     - preserves the existing `toolInput` construction exactly
     - returns:

```ts
{
	toolName: ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT,
	toolInput,
	toolParams,
}
```

     - sets `toolParams.source = JSON.stringify(toolInput.source)`
     - if `toolInput.scoped_paths` is present, sets `toolParams.scoped_paths = JSON.stringify(toolInput.scoped_paths)`
     - if `toolInput.context_lines` is present, sets `toolParams.context_lines = String(toolInput.context_lines)`
6. Change `workflowFormRegistry` to `Record<string, WorkflowFormResolverDefinition>`.
7. Replace [getWorkflowFormResolverDefinition()]( /Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L255-L257 ) with:

```ts
export function getWorkflowFormResolverDefinition(resolverId: WorkflowFormResolverId): WorkflowFormResolverDefinition {
	const resolver = workflowFormRegistry[resolverId]
	if (!resolver) {
		throw new Error(`Unknown workflow form resolver: ${resolverId}`)
	}

	return resolver
}
```

8. Delete `getDefaultWorkflowFormToolDictionaryMarkdown()` entirely. No runtime code in this repo currently needs it once the registry owns per-resolver dictionary markdown.
9. Add a brand-new file at [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts) with all of the following:
   - imports for `path`, `getPlaceholderWorkflowValueMap`, `fileExistsForPlaceholderWorkflowWriteProof`, `taskStateHasPlaceholderWorkflowWriteProof`, `TaskState`, and `CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID`
   - this exact exported interface:

```ts
export interface WorkflowFormWorkflowStepTriggerDefinition {
	workflowName: string
	stepNumber: number
	resolverId: string
	shouldIntercept(args: {
		cwd: string
		taskState: Pick<
			TaskState,
			| "activePlaceholderWorkflowStableValues"
			| "activePlaceholderWorkflowValues"
			| "activePlaceholderWorkflowTaskWriteProofPaths"
		>
	}): Promise<boolean>
}
```

   - this exact exported constant:

```ts
export const workflowFormSlashCommandTriggerRegistry: Array<never> = []
```

   - `workflowFormWorkflowStepTriggerRegistry` containing exactly one entry for `code-review.md` Step `3`
   - that entry’s `shouldIntercept(...)` must copy the current `diff_output` satisfaction logic from [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L250-L263) exactly:
     - merge stable+dynamic placeholders
     - resolve `diff_output`
     - return `true` when the path is absent
     - when present, require both current-task write proof and on-disk existence to suppress the form
   - export `getWorkflowFormWorkflowStepTriggerDefinition(workflowName: string, stepNumber: number)` that returns the matching entry or `undefined`
10. Add a new unit test file at [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts) with three tests:
   - `"returns the code-review step 3 resolver metadata by id"` asserting:
     - resolver id is `code_review_step_3_diff_source`
     - tool name is `build_review_diff_output`
     - title is `Review Diff Artifact`
     - success message is `The Step 3 diff artifact is ready.`
   - `"serializes the Phase 1 review-diff resolver into tool params"` asserting `buildToolExecutionRequest(...)` returns `toolParams.source`, `toolParams.scoped_paths`, and `toolParams.context_lines` exactly as strings
   - `"throws for an unknown resolver id"` asserting the thrown message is `Unknown workflow form resolver: unknown_resolver`

## Step 3
[x] Generalize the runtime and the pre-turn interception path so the task loop uses the shared trigger/registry definitions instead of hard-coded `code-review.md` Step 3 branching.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

Exact edits:
1. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L102-L191), change the `invoke_tool` branch so it no longer uses `resolver.translateSubmissionToToolUse(nextValues)`. Replace that line with `...resolver.buildToolExecutionRequest(nextValues)` so the returned outcome now includes `toolName`, `toolInput`, and `toolParams`.
2. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L215-L264), add a new helper immediately above `shouldInterceptWorkflowFormBeforeApiTurn(...)` named exactly `resolveWorkflowFormInterceptionCandidate`. It must:
   - accept the same `cwd` and `taskState` shape that `shouldInterceptWorkflowFormBeforeApiTurn(...)` currently accepts
   - return `undefined` when there is no active placeholder workflow source or no current checklist
   - call `getActivePlaceholderWorkflowStepDetails(...)`
   - call `getWorkflowFormWorkflowStepTriggerDefinition(activeWorkflowName, activeStep.stepNumber)`
   - return `undefined` if the trigger is missing
   - return `undefined` if `suppressedWorkflowFormResolverIds` already contains the trigger’s `resolverId`
   - call `await trigger.shouldIntercept({ cwd, taskState })`
   - return `{ trigger, activeStep }` only when that check returns `true`
3. Rewrite [shouldInterceptWorkflowFormBeforeApiTurn(...)]( /Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L215-L264 ) so it simply calls `resolveWorkflowFormInterceptionCandidate(...)` and returns `candidate !== undefined`.
4. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1468-L1483), change `getWorkflowFormToolErrorMessage(...)` to accept `session: WorkflowFormSessionState` as its first parameter. Keep the current appended-tool-result text extraction logic, but when no text is found, return `getWorkflowFormResolverDefinition(session.resolverId).buildToolExecutionFailureFallbackMessage(session)` instead of the current hard-coded Step 3 string.
5. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1485-L1521), change `executeWorkflowFormToolAndSync(...)` so it:
   - deletes the local `toolParams` construction block entirely
   - calls `this.toolExecutor.executeTool(...)` with:

```ts
{
	type: "tool_use",
	name: outcome.toolName,
	params: outcome.toolParams as any,
	partial: false,
}
```

   - passes `outcome.session` into `getWorkflowFormToolErrorMessage(...)`
6. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1523-L1602), change `maybeResolveWorkflowFormBeforeApiTurn()` as follows:
   - replace the initial boolean-only `shouldIntercept` call with `const candidate = await resolveWorkflowFormInterceptionCandidate(...)`
   - return early when `candidate` is `undefined`
   - when creating a new session, use:
     - `resolverId: candidate.trigger.resolverId`
     - `owner.workflowName: this.taskState.activePlaceholderWorkflowSource!.name`
     - `owner.stepNumber: candidate.activeStep.stepNumber`
   - delete the hard-coded `"code_review_step_3_diff_source"`, `"code-review.md"`, and `3` literals
   - in the `invoke_tool` success path, compute `const resolver = getWorkflowFormResolverDefinition(outcome.session.resolverId)` and pass `resolver.buildSuccessMessage(outcome.session)` into `buildSuccessPayload(...)` instead of the current hard-coded Step 3 success string
7. Do not change any other behavior in `maybeResolveWorkflowFormBeforeApiTurn()`. The looping, persistence, retry, and thread-display behavior must remain intact.
8. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L112-L159), extend the `"translates structured submissions into the canonical Phase 1 tool shape"` test so it also asserts:

```ts
expect(outcome.toolParams).to.deep.equal({
	source: JSON.stringify({
		type: "commit_range",
		base: "main",
		head: "feature/review-form",
	}),
	scoped_paths: JSON.stringify(["src/core/task/index.ts", "webview-ui/src/components/chat"]),
	context_lines: "5",
})
```

9. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1-L317), add a new test named exactly `"uses whichever resolver id was supplied when building invoke_tool outcomes"` that:
   - constructs `new WorkflowFormRuntime({ generic_form: customResolver } as any)`
   - gives `customResolver` id `generic_form`, tool name `set_workflow_placeholders`, and `buildToolExecutionRequest(...)` returning:

```ts
{
	toolName: "set_workflow_placeholders" as any,
	toolInput: { values: { review_input: "docs/review.md" } },
	toolParams: {
		values: JSON.stringify({ review_input: "docs/review.md" }),
	},
}
```

   - creates a session with `resolverId: "generic_form"`
   - submits a `collect_inputs` form
   - asserts the outcome kind is `invoke_tool`
   - asserts the tool name is `set_workflow_placeholders`
   - asserts the tool params equal the JSON string above
10. In [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts#L283-L339):
   - keep the existing Step 3 interception assertions
   - after the final successful Step 3 assertions, replace the checklist with:

```ts
[
	"- [x] Step 1: Determine Review Source",
	"- [ ] Step 2: Construct & Persist Review Input File",
	"- [ ] Step 3: System-Owned Diff Source Resolution And Diff Output Persistence",
].join("\n")
```

   - assert `shouldInterceptWorkflowFormBeforeApiTurn({ cwd: tempDir, taskState })` returns `false` for that Step 2-active checklist, proving the interception policy now comes from workflow-step configuration rather than workflow-name matching alone

## Step 4
[x] Update persistence/regression tests for the widened `invoke_tool` outcome shape and verify the generalized interception path still preserves Phase 1 prompt behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L712-L715), replace the fake pending workflow-form outcome object with:

```ts
fakeTask.pendingWorkflowFormOutcome = {
	kind: "invoke_tool",
	session: createdSession,
	toolName: "build_review_diff_output",
	toolInput: {
		source: {
			type: "commit",
			commit: "abc1234",
		},
	},
	toolParams: {
		source: JSON.stringify({
			type: "commit",
			commit: "abc1234",
		}),
	},
}
```

2. In that same test block immediately after [maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L739), add this exact assertion:

```ts
sinon.assert.calledOnceWithExactly(fakeTask.workflowFormRuntime.createSession, {
	resolverId: "code_review_step_3_diff_source",
	triggerSource: "deterministic_workflow_progression",
	owner: {
		kind: "placeholder_workflow_step",
		workflowName: "code-review.md",
		stepNumber: 3,
	},
})
```

3. Do not change the existing prompt assertions in that test. They already prove the important invariant: after successful workflow-form resolution, the next prompt is built from Step 4 and does not include the Step 3 fallback instructions.

## Step 5
[x] Run the targeted regression suite and update this plan document to reflect completion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-2-generalization-action-plan.md`

Exact edits:
1. Run this exact command from `/Users/robertboston/Documents/Cline Extension/cline`:

```bash
npm run test:unit -- src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit
```

2. If any test fails, stop and ask for input before making any change that is not already prescribed in Steps 1-4.
3. If the suite passes, change this step’s checkbox from `[ ]` to `[x]`.
