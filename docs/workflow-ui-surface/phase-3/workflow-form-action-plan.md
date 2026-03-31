---
title: Workflow UI Surface Phase 3 Workflow-Form Silo Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - This plan follows the live reauthored `/Users/robertboston/Documents/Cline/Workflows/code-review.md` workflow. Any stale Phase 3 requirement text that still says the manual fallback returns to “Step 2” must be implemented as returning control to the current Step 3 fallback instructions, per explicit user approval on 2026-03-31.
---

# Workflow UI Surface Phase 3 Workflow-Form Silo Action Plan

This plan implements only the Phase 3 workflow-form silo described in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-3/requirements.md)
- [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-3/discovery.md)
- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)

This plan does not implement the tool silo or the deterministic-progression silo.

Locked decisions for this pass:

- The existing Phase 1 diff workflow form stays on the legacy resolver id `code_review_step_3_diff_source`, but its trigger ownership and user-facing step references must align to the live Step 2 diff workflow state.
- The new Phase 3 resolver id is `code_review_step_3_review_input`.
- The only human-submitted field for the Phase 3 form is `story_path`.
- The Phase 3 form must not ask for `diff_output`; it is resolved automatically from workflow placeholders/tool behavior.
- The exact workflow-form UI fallback message for the diff/story mismatch case is:
  - `diff_output does not identify recent changes to the story file. Proceeding with AI generation of review_input.md using the fallback Step 3 instructions.`
- After any post-tool Phase 3 failure, the workflow form must render the failure once in the workflow UI, suppress the resolver for the current active workflow step, clear the active form session, and return control to the manual Step 3 workflow instructions.
- This pass must not modify:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/**`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/**`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
  - `/Users/robertboston/Documents/Cline/Workflows/**`

## Step 1
[ ] Generalize the workflow-form runtime so confirm pages can advance directly to `collect_inputs` when no `select_source` page exists, and extend the post-tool evaluation contract to carry a fallback-to-agent signal.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Exact edits:
1. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L26-L29), extend `WorkflowFormToolExecutionEvaluation` so it contains:
   - `succeeded: boolean`
   - `errorMessage?: string`
   - `fallbackToAgent?: boolean`
2. Do not change `WorkflowFormRuntimeOutcome`; the post-tool fallback will be handled in task integration, not by adding a new runtime submission outcome kind.
3. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L130-L154), replace the hard-coded `confirm -> select_source` transition with this exact rule:
   - build the current resolver definition once for the current `confirm` session
   - if `definition.pages.select_source` exists, advance to `select_source`
   - otherwise, if `definition.pages.collect_inputs` exists, advance to `collect_inputs`
   - otherwise throw `new Error("Workflow form confirm phase requires a select_source or collect_inputs page.")`
4. Keep all existing cancel behavior unchanged:
   - `WorkflowFormAction.CANCEL` still returns `fallback_to_agent`
   - `"No"` or any non-`"yes"` confirm submission still returns `fallback_to_agent`
5. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts):
   - update all existing live Phase 1 diff-resolver session fixtures so `owner.stepNumber` is `2`, not `3`
   - keep the existing Phase 1 confirm-path test, but update its assertion description to explicitly say Phase 1 still advances from `confirm` to `select_source`
   - add a new custom resolver named `confirm_to_collect_form` in the test file only, with:
     - `toolName: ClineDefaultTool.BUILD_REVIEW_INPUT`
     - `pages.confirm`
     - `pages.collect_inputs`
     - no `pages.select_source`
   - add one new test immediately after the Phase 1 confirm transition test:
     - `"transitions from confirm to collect_inputs when the resolver has no select_source page"`
     - create the session with `initialPhase` omitted
     - submit `{ confirm: "yes" }`
     - assert `outcome.kind === "render_form"`
     - assert `outcome.session.phase === "collect_inputs"`
     - assert `outcome.payload.phase === "collect_inputs"`

## Step 2
[ ] Add the Phase 3 review-input tool dictionary config and resolver, and align the existing Phase 1 resolver text to the reauthored Step 2/Step 3 workflow state.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Exact edits:
1. In [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L54-L79), add a new exported config immediately after `buildReviewDiffOutputToolDictionaryConfig`:
   - `buildReviewInputToolDictionaryConfig`
   - `toolName: ClineDefaultTool.BUILD_REVIEW_INPUT`
   - `heading: "## build_review_input"`
   - `runtimeTitle: "Review Input Reference"`
   - `overviewLines` exactly equal to:

```ts
[
	"Review Input Artifact. Build and replace the stable review-input artifact at {review_input}.",
	"",
	"Story File Path. The human must provide only the story markdown file path for the current review cycle.",
	"",
	"Workflow-owned Diff Artifact. The stable diff artifact at {diff_output} is resolved automatically and is not recollected from the human.",
]
```

   - `parameterDescriptions.story_path = "Required story markdown file path. The workflow-owned diff artifact at {diff_output} is resolved automatically."`
   - `termKeys: []`
2. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L22-L31), add:
   - `export const CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID = "code_review_step_3_review_input"`
   - `const STORY_PATH_FIELD_KEY = "story_path"`
   - `const CODE_REVIEW_STEP_3_REVIEW_INPUT_DIFF_MISMATCH_MESSAGE = "diff_output does not identify recent changes to the story file. Proceeding with AI generation of review_input.md using the fallback Step 3 instructions."`
3. In the same file, import `buildReviewInputToolDictionaryConfig` next to `buildReviewDiffOutputToolDictionaryConfig`.
4. Still in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L45-L206), add one helper function immediately after `buildConcreteInputFieldDefinitions(...)`:

```ts
function buildReviewInputFieldDefinitions(): WorkflowFormFieldDefinition[] {
	return [
		buildSchemaBackedField({
			toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
			binding: { parameterName: "story_path" },
			key: STORY_PATH_FIELD_KEY,
			label: "Story File Path",
			help: "Path to the story markdown file being reviewed. The workflow-owned `review-input.diff` artifact will be supplied automatically.",
			required: true,
			placeholder: "/absolute/path/to/story.md",
			visible: true,
		}),
	]
}
```

5. In the existing Phase 1 resolver entry at [WorkflowFormRegistry.ts:310-429](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L310), leave the resolver id unchanged, but update only its step-numbered strings:
   - `successMessage` from `The Step 3 diff artifact is ready.` to `The Step 2 diff artifact is ready.`
   - `buildToolExecutionFailureFallbackMessage()` from `The workflow form could not build the Step 3 diff artifact. Review the input and try again.` to `The workflow form could not build the Step 2 diff artifact. Review the input and try again.`
6. Still in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L430-L431), insert a new resolver entry immediately before the workflow-start resolver with these exact behaviors:
   - `id: CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID`
   - `toolName: ClineDefaultTool.BUILD_REVIEW_INPUT`
   - `buildDefinition(session)` returns:
     - `title: "Review Input Artifact"`
     - `toolDictionaryTitle: "Review Input Reference"`
     - `toolDictionaryMarkdown: buildRuntimeToolDictionaryMarkdownFromConfig(buildReviewInputToolDictionaryConfig)`
     - `pages.confirm.prompt = "This workflow requires the following tool-produced artifact: `review-input.md`.\n\nCan you provide the story file path required to produce `review-input.md`?"`
     - `pages.confirm.options = ["Yes", "No"]`
     - no `pages.select_source`
     - `pages.collect_inputs.prompt = "Provide the story file path needed to produce `review-input.md`. The workflow-owned `review-input.diff` artifact will be supplied automatically."`
     - `pages.collect_inputs.fields = buildReviewInputFieldDefinitions()`
     - `pages.retry_error.prompt = "The system could not produce `review-input.md`. Update the story file path or retry the request."`
     - `pages.retry_error.fields = buildReviewInputFieldDefinitions()`
     - `pages.collect_inputs.submitLabel = "Submit"`
     - `pages.collect_inputs.cancelLabel = "Cancel"`
     - `pages.retry_error.submitLabel = "Submit"`
     - `pages.retry_error.cancelLabel = "Cancel"`
     - `pages.retry_error.retryLabel = "Start Over"`
     - `successMessage = "The Step 3 review-input artifact is ready."`
   - `buildToolExecutionFailureFallbackMessage()` returns exactly:
     - `The workflow form could not build the Step 3 review-input artifact. The workflow will return to the Step 3 fallback instructions.`
   - `buildToolExecutionRequest(session, values)`:
     - uses `buildReviewInputFieldDefinitions()`
     - parses `story_path` with `getParsedFieldValue(...)`
     - throws if the parsed value is not a string
     - returns:

```ts
{
	toolName: ClineDefaultTool.BUILD_REVIEW_INPUT,
	toolInput: { story_path: storyPath },
	toolParams: { story_path: storyPath },
}
```

   - `evaluateToolExecutionResult(session, args)`:
     - success when parsed JSON has `persisted === true` and `review_input_available === true`
     - when parsed JSON has `reason === "diff_output does not identify recent changes to the story file."`, return:

```ts
{
	succeeded: false,
	errorMessage: CODE_REVIEW_STEP_3_REVIEW_INPUT_DIFF_MISMATCH_MESSAGE,
	fallbackToAgent: true,
}
```

   - when `isWorkflowFormFailureText(args.toolResultText)` is true, return:

```ts
{
	succeeded: false,
	errorMessage: args.toolResultText?.trim() ?? this.buildToolExecutionFailureFallbackMessage(session),
	fallbackToAgent: true,
}
```

   - otherwise return:

```ts
{
	succeeded: false,
	errorMessage: this.buildToolExecutionFailureFallbackMessage(session),
	fallbackToAgent: true,
}
```

7. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts):
   - import `CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID`
   - update all existing Phase 1 `owner.stepNumber` test fixtures from `3` to `2`
   - update the first test description to say `"returns the code-review diff resolver metadata by id"`
   - update the existing Phase 1 success-message expectations implicitly by asserting the registry still returns `toolName: "build_review_diff_output"` and by not asserting the old Step 3 copy anywhere
   - add one new test immediately after the existing Phase 1 resolver metadata test:
     - `"returns the code-review step 3 review-input resolver metadata by id"`
     - assert resolver id equals `code_review_step_3_review_input`
     - assert toolName equals `build_review_input`
   - add one new test after the Phase 1 serialization tests:
     - `"serializes the Phase 3 review-input resolver into tool params"`
     - build a session with `owner.stepNumber = 3`
     - pass `{ story_path: { rawValue: "docs/story.md" } }`
     - assert `toolInput` and `toolParams` both contain only `story_path: "docs/story.md"`
   - add one new success test:
     - `"treats persisted review-input tool results as success"`
     - pass JSON `{ persisted: true, review_input_available: true, artifact_path: "/tmp/review-input.md" }`
     - assert the evaluation equals `{ succeeded: true }`
   - add one new no-go test:
     - `"treats the diff/story mismatch result as a fallback-to-agent failure"`
     - pass JSON `{ persisted: false, review_input_available: false, recent_story_changes_detected: false, reason: "diff_output does not identify recent changes to the story file." }`
     - assert:
       - `succeeded === false`
       - `errorMessage === "diff_output does not identify recent changes to the story file. Proceeding with AI generation of review_input.md using the fallback Step 3 instructions."`
       - `fallbackToAgent === true`
   - add one new tool-error test:
     - `"treats workflow-form tool errors for review-input as fallback-to-agent failures"`
     - pass `toolResultText = "The tool execution failed with the following error:\n<error>\nThe provided story file does not contain the required story structure for deterministic review-input generation.\n</error>"`
     - assert `fallbackToAgent === true`

## Step 3
[ ] Move the existing diff workflow-form trigger to Step 2 and add the new Phase 3 review-input trigger at Step 3, both using current-task write-proof gating against the correct stable artifact placeholder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`

Exact edits:
1. In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L11-L15), import `CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID`.
2. In the same file, add one local helper immediately above `workflowFormWorkflowStepTriggerRegistry`:

```ts
async function shouldInterceptUntilCurrentTaskArtifactExists(args: {
	cwd: string
	taskState: Pick<
		TaskState,
		| "activePlaceholderWorkflowStableValues"
		| "activePlaceholderWorkflowValues"
		| "activePlaceholderWorkflowTaskWriteProofPaths"
	>
	placeholderKey: "diff_output" | "review_input"
}): Promise<boolean> {
	const placeholders = getPlaceholderWorkflowValueMap(
		args.taskState.activePlaceholderWorkflowStableValues,
		args.taskState.activePlaceholderWorkflowValues,
	)
	const artifactPath = placeholders?.[args.placeholderKey]?.trim()
	if (!artifactPath) {
		return true
	}

	const resolvedArtifactPath = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(args.cwd, artifactPath)
	return !(
		taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedArtifactPath) &&
		(await fileExistsForPlaceholderWorkflowWriteProof(resolvedArtifactPath))
	)
}
```

3. Replace the existing inline `code-review.md` trigger entry at [WorkflowFormTriggerRegistry.ts:98-119](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L98) with two explicit entries:
   - first entry:
     - `workflowName: "code-review.md"`
     - `stepNumber: 2`
     - `resolverId: CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID`
     - `shouldIntercept(...)` delegates to `shouldInterceptUntilCurrentTaskArtifactExists({ cwd, taskState, placeholderKey: "diff_output" })`
   - second entry immediately after it:
     - `workflowName: "code-review.md"`
     - `stepNumber: 3`
     - `resolverId: CODE_REVIEW_STEP_3_REVIEW_INPUT_RESOLVER_ID`
     - `shouldIntercept(...)` delegates to `shouldInterceptUntilCurrentTaskArtifactExists({ cwd, taskState, placeholderKey: "review_input" })`
4. In [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts):
   - add imports for:
     - `fs/promises`
     - `os`
     - `path`
     - `getWorkflowFormWorkflowStepTriggerDefinition`
   - keep all existing slash-command tests unchanged
   - append one new test:
     - `"maps code-review step 2 to the diff workflow-form resolver"`
     - assert `getWorkflowFormWorkflowStepTriggerDefinition("code-review.md", 2)?.resolverId === "code_review_step_3_diff_source"`
   - append one new test:
     - `"maps code-review step 3 to the review-input workflow-form resolver"`
     - assert `getWorkflowFormWorkflowStepTriggerDefinition("code-review.md", 3)?.resolverId === "code_review_step_3_review_input"`
   - append one new filesystem-backed test:
     - `"does not intercept code-review step 3 when review_input has a current-task write proof and exists on disk"`
     - create a temp dir
     - create `review-input.md`
     - resolve the step 3 trigger
     - call `shouldIntercept({ cwd: tempDir, taskState: { activePlaceholderWorkflowStableValues: { review_input: reviewInputPath }, activePlaceholderWorkflowValues: {}, activePlaceholderWorkflowTaskWriteProofPaths: [reviewInputPath] } })`
     - assert the result is `false`
   - append one new filesystem-backed test:
     - `"intercepts code-review step 3 when review_input is missing a current-task write proof"`
     - create the file on disk but pass `activePlaceholderWorkflowTaskWriteProofPaths: []`
     - assert the result is `true`

## Step 4
[ ] Update task integration so the Phase 3 resolver can render the exact fallback/error message once, suppress itself, clear the session, and return control to the manual Step 3 workflow path after post-tool failures.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1498-L1524), make `executeWorkflowFormToolAndSync(...)` return `fallbackToAgent` alongside `succeeded` and `errorMessage` by forwarding `evaluation.fallbackToAgent ?? false`.
2. In the same file at [index.ts:1596-1616](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1596), keep the success path unchanged, keep the ordinary retry path unchanged, and insert this exact new branch before the current retry-state persistence:
   - when `toolExecution.succeeded === false` and `toolExecution.fallbackToAgent === true`:
     - build `retrySession = { ...outcome.session, phase: "retry_error", lastError: toolExecution.errorMessage }`
     - build `retryPayload = this.workflowFormRuntime.buildRetryPayload(retrySession, toolExecution.errorMessage)`
     - `await this.renderWorkflowFormMessage(retryPayload)`
     - if `outcome.session.resolverId` is not already present in `this.taskState.suppressedWorkflowFormResolverIds`, append it
     - `await this.clearWorkflowFormSession()`
     - `break`
3. Do not call `persistWorkflowFormSession()` separately in that fallback branch; `clearWorkflowFormSession()` must remain the persistence point after the suppression list is updated.
4. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), update all existing Phase 1 diff-form active-step fixtures to match the live workflow:
   - any created or restored Phase 1 diff-form session owner that currently uses `stepNumber: 3` must use `stepNumber: 2`
   - any checklist fixture where the diff form is the active step must now label that step as Step 2, not Step 3
   - any workflow markdown fixture where the diff form fallback guidance is the active step must reflect the live ordering:
     - Step 2 = diff source resolution / `review-input.diff`
     - Step 3 = construct `review_input.md`
5. Still in [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), add one new integration-style test immediately after the existing successful diff-form progression test:
   - `"opens the Phase 3 review-input workflow form after Step 2 is complete and Step 3 is active"`
   - use a temp workflow markdown fixture whose Step 2 is already complete and whose Step 3 contains the manual `review_input.md` fallback instructions
   - set the checklist to Step 3 active
   - set stable placeholders `{ output_folder: ..., diff_output: ..., review_input: ... }`
   - create a fake runtime session with:
     - `resolverId: "code_review_step_3_review_input"`
     - `triggerSource: "deterministic_workflow_progression"`
     - `owner.stepNumber = 3`
     - `initialPhase: "confirm"`
   - assert `maybeResolveWorkflowFormBeforeApiTurn.call(fakeTask)` creates that exact session via `workflowFormRuntime.createSession(...)`
6. Add one new post-tool fallback test:
   - `"renders the exact Phase 3 diff/story mismatch message once, suppresses the resolver, and returns control to manual Step 3"`
   - session:
     - `resolverId: "code_review_step_3_review_input"`
     - `owner.stepNumber = 3`
     - `phase: "collect_inputs"`
     - `values.story_path = { rawValue: "docs/story.md" }`
   - fake `toolExecutor.executeTool(...)` appends one `tool_result` with JSON:

```ts
{
	persisted: false,
	review_input_available: false,
	recent_story_changes_detected: false,
	reason: "diff_output does not identify recent changes to the story file.",
}
```

   - fake `renderWorkflowFormMessage` should record both payloads
   - call `executeWorkflowFormToolAndSync` through `maybeResolveWorkflowFormBeforeApiTurn` so the suppression/clear path is exercised
   - assert:
     - the second rendered payload has `phase === "retry_error"`
     - the second rendered payload `errorMessage` equals `diff_output does not identify recent changes to the story file. Proceeding with AI generation of review_input.md using the fallback Step 3 instructions.`
     - `taskState.suppressedWorkflowFormResolverIds` contains `code_review_step_3_review_input`
     - `taskState.activeWorkflowFormSession === undefined`
7. Add one new post-tool hard-error fallback test:
   - `"falls back after build_review_input tool errors and preserves the tool error in the workflow UI"`
   - same session shape as the previous test
   - fake `toolExecutor.executeTool(...)` appends one `text` block equal to:

```ts
The tool execution failed with the following error:
<error>
The provided story file does not contain the required story structure for deterministic review-input generation.
</error>
```

   - assert the rendered retry payload error message is that exact multi-line tool error
   - assert suppression and session clearing behave the same as the diff/story mismatch test

## Step 5
[ ] Run the focused workflow-form silo verification.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-3/workflow-form-action-plan.md`

Exact edits:
1. Run exactly these commands from `/Users/robertboston/Documents/Cline Extension/cline`:
   - `npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts --exit`
   - `npx tsc --noEmit`
2. If both commands pass, mark this step complete.
3. If either command fails, stop and report the failure without making any additional changes unless the failure is caused by an explicit mistake in this action plan.
