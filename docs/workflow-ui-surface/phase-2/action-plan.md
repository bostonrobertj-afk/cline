---
title: Workflow UI Surface Phase 2 Slash-Command Start Form Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/doc/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Workflow UI Surface Phase 2 Slash-Command Start Form Action Plan

This plan implements the Phase 2 requirements in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-2/requirements.md)
- [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/architecture.md)
- [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/discovery.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md)

The goal of this pass is to add the human-only, slash-command-started Step 1 workflow-form path for placeholder workflows without replacing any existing activation, tool, or deterministic progression system.

Locked decisions for this pass:

- The delivered Phase 2 path is triggered only when the current turn contains a `PersistentSlashCommandAction` of type `activate_placeholder_workflow`.
- `use_skill` activation must not start this UX.
- The `loadContext()` ordering must change so slash-command placeholder workflow activation is applied before the workflow-form interception check runs.
- The existing `code-review.md` Step 3 workflow-form behavior must remain intact.
- The new start-of-workflow resolver id is `placeholder_workflow_start_set_workflow_placeholders`.
- The start-of-workflow resolver must begin directly in `collect_inputs`; there is no confirm screen for slash-command-started Step 1 forms.
- The start-of-workflow resolver must invoke `set_workflow_placeholders` only, using the canonical wrapper shape `{"values": {...}}`.
- Successful slash-command start-form submission clears the workflow-form session even if Step 1 remains incomplete after deterministic sync; in that case the AI resumes on Step 1 fallback instructions.
- `review-adversarial-general.md` is the first delivered use case and must receive a workflow-specific UI override for copy, field ordering, and the `diff_output` forced-field exception described below.
- This pass must not modify any workflow source file under `/Users/robertboston/Documents/Cline/Workflows/`.

## Step 1
[x] Extend the workflow-form session contracts and resolver registry so runtime-created slash-command start forms can carry their own field schema, copy, and tool-execution metadata.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Exact edits:
1. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L1-L80), add `WorkflowFormFieldDefinition` to the `@shared/ExtensionMessage` import.
2. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L21-L55), insert these new interfaces immediately after `WorkflowFormSessionPhase`:

```ts
export interface WorkflowFormSessionContext {
	title: string
	prompt: string
	toolDictionaryTitle: string
	toolDictionaryMarkdown: string
	fields: WorkflowFormFieldDefinition[]
	placeholderFieldKeys: string[]
	successMessage: string
	toolExecutionFailureFallbackMessage: string
}
```

3. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L26-L34), add these two properties to `WorkflowFormSessionState`:
   - `initialPhase: Exclude<WorkflowFormSessionPhase, "success">`
   - `context?: WorkflowFormSessionContext`
4. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L51-L55), add these optional properties to `WorkflowFormRuntimeCreateSessionOptions`:
   - `initialPhase?: Exclude<WorkflowFormSessionPhase, "success">`
   - `context?: WorkflowFormSessionContext`
5. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L36-L49), change the resolver contract so `buildToolExecutionRequest` accepts the full session state:

```ts
buildToolExecutionRequest(session: WorkflowFormSessionState, values: WorkflowFormValues): WorkflowFormToolExecutionRequest
```

6. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L1-L13), add these imports:
   - `buildRuntimeToolDictionaryMarkdownFromConfig` is already present; keep it.
   - add `type WorkflowFormSessionContext` to the local type import list.
7. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L15-L22), add this constant immediately after `CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID`:

```ts
export const PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID =
	"placeholder_workflow_start_set_workflow_placeholders"
```

8. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L24-L131), leave the Phase 1 field helpers untouched. Append new Step 1 start-form helpers after them:
   - `const WORKFLOW_START_TOOL_DICTIONARY_CONFIG = { ... }` for `set_workflow_placeholders` with:
     - `toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS`
     - `heading: "## set_workflow_placeholders"`
     - `runtimeTitle: "Workflow Placeholder Reference"`
     - `overviewLines: ["Persist dynamic placeholder values for the active workflow before the first AI turn begins."]`
     - `parameterDescriptions.values = "Workflow placeholder key/value map. Submit only the placeholders the human actually supplied."`
     - `termKeys: []`
   - `interface WorkflowStartFormOverride`
   - `const workflowStartFormOverrides: Record<string, WorkflowStartFormOverride>` containing exactly one entry for `"review-adversarial-general.md"` with:
     - `title: "Adversarial Review Inputs"`
     - `prompt: "Provide the review material needed to begin this workflow. Supply at least one review target. If you also have a supporting spec or story file, include it as `spec_file`."`
     - `placeholderOrder: ["review_input", "diff_output", "spec_file"]`
     - `labels.review_input = "Review Input File"`
     - `labels.diff_output = "Review Diff File"`
     - `labels.spec_file = "Spec or Story File"`
     - `help.review_input = "Path to an existing review-input markdown file for this review."`
     - `help.diff_output = "Path to an existing review-input diff file for this review."`
     - `help.spec_file = "Optional path to a story, spec, or requirements file that defines expected behavior."`
     - `forcedPlaceholderKeys: ["diff_output"]`
   - `function humanizeWorkflowPlaceholderKey(key: string): string`
   - `function buildWorkflowStartPlaceholderFieldDefinitions(args: { placeholderKeys: string[]; override?: WorkflowStartFormOverride }): WorkflowFormFieldDefinition[]`
     - every field must be `control: "text"`
     - every field must be `required: false`
     - every field must be `visible: true`
     - labels/help come from override first, otherwise the humanized placeholder key
     - `placeholder` must be `"/absolute/path/to/file-or-artifact"`
   - `export function buildWorkflowStartFormSessionContext(args: { workflowName: string; placeholderKeys: string[] }): WorkflowFormSessionContext`
     - apply override ordering first, then append any remaining keys alphabetically
     - build `toolDictionaryMarkdown` with `buildRuntimeToolDictionaryMarkdownFromConfig(WORKFLOW_START_TOOL_DICTIONARY_CONFIG)`
     - default title is `"Workflow Start Inputs"`
     - default prompt is `"Provide any Step 1 workflow inputs you already have. Submit at least one value to store it before the first AI turn begins."`
     - default success message is `"Workflow start inputs were stored."`
     - default fallback message is `"The workflow form could not store the workflow start inputs. Review the values and try again."`
9. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L164-L260), add a second resolver entry for `PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID` with these exact behaviors:
   - `toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS`
   - `title: "Workflow Start Inputs"` and `toolDictionaryTitle: "Workflow Placeholder Reference"` as base metadata; the actual rendered values must come from `session.context`
   - `toolDictionaryMarkdown` must be the runtime dictionary built from `WORKFLOW_START_TOOL_DICTIONARY_CONFIG`
   - `buildConfirmPayload(session)` must delegate directly to `buildCollectInputsPayload(session)`
   - `buildSelectSourcePayload(session)` must delegate directly to `buildCollectInputsPayload(session)`
   - `buildCollectInputsPayload(session)` must read `session.context!` and return `buildBasePayload(session, this, { phase: "collect_inputs", prompt: session.context.prompt, fields: session.context.fields, submitLabel: "Submit", cancelLabel: "Cancel" })` while overriding `title`, `toolDictionaryTitle`, and `toolDictionaryMarkdown` from `session.context`
   - `buildRetryPayload(session)` must reuse `session.context` and return the same fields with `phase: "retry_error"`, `submitLabel: "Submit"`, `cancelLabel: "Cancel"`, `retryLabel: "Start Over"`, and `errorMessage: session.lastError`
   - `buildSuccessMessage(session)` must return `session.context?.successMessage ?? "Workflow start inputs were stored."`
   - `buildToolExecutionFailureFallbackMessage(session)` must return `session.context?.toolExecutionFailureFallbackMessage ?? "The workflow form could not store the workflow start inputs. Review the values and try again."`
   - `buildToolExecutionRequest(session, values)` must:
     - read `session.context?.placeholderFieldKeys ?? []`
     - include only trimmed non-empty `stringValue`s from those keys
     - build `toolInput` exactly as `{ values: filteredValues }`
     - build `toolParams` exactly as `{ values: JSON.stringify(filteredValues) }`
10. In the existing Phase 1 resolver entry in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L165-L260), change only the `buildToolExecutionRequest` signature to `(session, values)` and ignore `session`; do not change any Phase 1 serialization behavior.
11. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts), keep the existing Phase 1 tests and add three new tests:
   - `"builds workflow-start session context with the review-adversarial-general override"` asserting title, prompt, field ordering, and labels for `review_input`, `diff_output`, `spec_file`
   - `"serializes workflow-start placeholder submissions into set_workflow_placeholders input"` asserting empty strings are dropped and `toolParams.values` is the JSON string for the remaining keys
   - `"reuses session-owned success and failure copy for the workflow-start resolver"` asserting the resolver returns the `session.context` messages verbatim
12. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), prepare for Step 3 by adding one new custom-resolver fixture that expects `buildToolExecutionRequest(session, values)` and one new test named `"creates collect_inputs sessions when the caller supplies an initialPhase"` that asserts `createSession({ initialPhase: "collect_inputs" })` stores `phase: "collect_inputs"` and preserves the provided `context`.

## Step 2
[x] Add a slash-command start trigger resolver that derives Step 1 fields from the active workflow state, while preserving the existing step-trigger registry for later in-workflow forms.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`

Exact edits:
1. In [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts#L15-L30), add `rawDetails: string` to `ActivePlaceholderWorkflowStepDetails`.
2. In [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts#L105-L148), update `getActivePlaceholderWorkflowStepDetails(...)` so it parses the step section twice:
   - once from rendered workflow contents, exactly as it does today, for `details`
   - once from the unrendered source contents for the same matched section, for `rawDetails`
   - use the same step-number/title matching logic for both passes
   - return `rawDetails: rawMatchingSection.details.trim()`
   - do not change any existing matching semantics for `details`
3. In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L1-L57), keep the existing step-trigger registry intact. Add these imports:
   - `type PersistentSlashCommandAction` from `@/core/slash-commands`
   - `getActivePlaceholderWorkflowStepDetails` from `@/core/workflows/placeholder-workflow-step-details`
   - `extractWorkflowPlaceholderKeys` from `@/core/workflows/workflow-placeholders`
   - `buildWorkflowStartFormSessionContext`
   - `PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID`
   - `type WorkflowFormSessionContext`
   - `type WorkflowFormSessionOwner`
   - `type WorkflowFormTriggerSource`
4. In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L10-L25), add these exact exported interfaces under the existing `WorkflowFormWorkflowStepTriggerDefinition`:

```ts
export interface WorkflowFormStartCandidate {
	resolverId: string
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
	initialPhase: "collect_inputs"
	context: WorkflowFormSessionContext
	activeStep: {
		stepNumber: number
		stepTitle: string
	}
}
```

5. Replace `workflowFormSlashCommandTriggerRegistry: Array<never> = []` in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L25) with this exported helper instead of a registry constant:

```ts
export async function resolveWorkflowFormSlashCommandStartCandidate(args: {
	cwd: string
	taskState: Pick<
		TaskState,
		| "activePlaceholderWorkflowSource"
		| "currentFocusChainChecklist"
		| "activePlaceholderWorkflowStableValues"
		| "activePlaceholderWorkflowValues"
	>
	currentTurnSlashCommandAction?: PersistentSlashCommandAction
}): Promise<WorkflowFormStartCandidate | undefined>
```

6. Implement `resolveWorkflowFormSlashCommandStartCandidate(...)` with these exact rules:
   - return `undefined` unless `args.currentTurnSlashCommandAction?.type === "activate_placeholder_workflow"`
   - return `undefined` unless `taskState.activePlaceholderWorkflowSource` and `taskState.currentFocusChainChecklist` are present
   - resolve `activeStep` via `getActivePlaceholderWorkflowStepDetails(...)`
   - return `undefined` unless `activeStep?.stepNumber === 1`
   - compute `renderedPlaceholderKeys = extractWorkflowPlaceholderKeys(activeStep.details)`
   - compute `rawPlaceholderKeys = extractWorkflowPlaceholderKeys(activeStep.rawDetails)`
   - if the workflow name is `"review-adversarial-general.md"`, union in `diff_output` from `rawPlaceholderKeys` even when it is absent from `renderedPlaceholderKeys`
   - build the final field-key list by:
     - starting with the rendered keys
     - adding the forced `diff_output` exception for `review-adversarial-general.md` only
     - de-duplicating while preserving order
   - return `undefined` if the final key list is empty
   - otherwise return:

```ts
{
	resolverId: PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
	triggerSource: "slash_command",
	owner: {
		kind: "slash_command",
		workflowName: args.taskState.activePlaceholderWorkflowSource.name,
		stepNumber: 1,
	},
	initialPhase: "collect_inputs",
	context: buildWorkflowStartFormSessionContext({
		workflowName: args.taskState.activePlaceholderWorkflowSource.name,
		placeholderKeys: finalPlaceholderKeys,
	}),
	activeStep: {
		stepNumber: 1,
		stepTitle: activeStep.stepTitle,
	},
}
```

7. Add a new test file at [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts) with exactly three tests:
   - `"returns a slash-command start candidate for review-adversarial-general step 1"` using a remote workflow source whose Step 1 raw details reference `{review_input}`, `{diff_output}`, and `{spec_file}` while stable values already contain `diff_output`; assert the candidate exists, resolver id is `placeholder_workflow_start_set_workflow_placeholders`, `initialPhase` is `collect_inputs`, and `context.placeholderFieldKeys` is exactly `["review_input", "diff_output", "spec_file"]`
   - `"returns undefined when the current turn did not activate a placeholder workflow by slash command"` by passing `currentTurnSlashCommandAction: undefined`
   - `"returns undefined when step 1 has no placeholder inputs after rendered extraction and no forced-field exception applies"` using a Step 1 section with no placeholders

## Step 3
[x] Update the workflow-form runtime so slash-command start sessions can start at `collect_inputs`, resume from persisted session state, and retry back into the same phase without borrowing Phase 1’s confirm/select-source flow.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Exact edits:
1. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L42-L50), change `createSession(...)` so:
   - `phase` becomes `options.initialPhase ?? "confirm"`
   - `initialPhase` is persisted on the session
   - `context: options.context` is persisted on the session
2. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L175-L190), change the `invoke_tool` branch so it calls `resolver.buildToolExecutionRequest(nextSession, nextValues)`.
3. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L193-L206), change retry handling so the restart target is session-specific:
   - derive `const restartPhase = session.initialPhase === "collect_inputs" ? "collect_inputs" : "select_source"`
   - for `restartPhase === "collect_inputs"`, reset to `phase: "collect_inputs"` and keep only the values whose keys are present in `session.context?.placeholderFieldKeys ?? []`
   - for `restartPhase === "select_source"`, preserve the existing Phase 1 behavior exactly
4. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), keep all Phase 1 tests and add these two tests:
   - `"invokes set_workflow_placeholders from a collect_inputs start session"` using `initialPhase: "collect_inputs"` and a custom resolver with `placeholderFieldKeys`; assert the outcome is `invoke_tool` and the tool params contain only the submitted placeholder keys
   - `"restarts a collect_inputs start session on retry instead of returning to select_source"` by setting `session.initialPhase = "collect_inputs"`, `session.phase = "retry_error"`, and asserting the retry outcome renders `collect_inputs`

## Step 4
[x] Reorder `loadContext()` and generalize pre-turn workflow-form interception so slash-command-started Step 1 sessions are created after activation, while existing step-triggered sessions continue to work unchanged.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L216-L274), keep `resolveWorkflowFormInterceptionCandidate(...)` as the step-trigger resolver for deterministic workflow progression only. Do not widen it to include slash-command-start behavior.
2. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1529-L1609), change `maybeResolveWorkflowFormBeforeApiTurn()` to accept an optional parameter:

```ts
private async maybeResolveWorkflowFormBeforeApiTurn(currentTurnSlashCommandAction?: PersistentSlashCommandAction): Promise<void>
```

3. In that same method:
   - if `this.taskState.activeWorkflowFormSession` already exists, skip new-candidate resolution and enter the existing render loop immediately
   - otherwise resolve `const slashStartCandidate = await resolveWorkflowFormSlashCommandStartCandidate({ cwd: this.cwd, taskState: this.taskState, currentTurnSlashCommandAction })`
   - if `slashStartCandidate` is present, create the session from it
   - otherwise fall back to the current deterministic-step `resolveWorkflowFormInterceptionCandidate(...)` path exactly as it works today
4. When creating a new slash-command start session in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1538-L1548), call:

```ts
this.workflowFormRuntime.createSession({
	resolverId: slashStartCandidate.resolverId,
	triggerSource: slashStartCandidate.triggerSource,
	owner: slashStartCandidate.owner,
	initialPhase: slashStartCandidate.initialPhase,
	context: slashStartCandidate.context,
})
```

5. Keep the existing deterministic-step session creation branch unchanged except for passing `initialPhase: "confirm"` explicitly.
6. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L4718-L4847), change the ordering inside `loadContext()` exactly as follows:
   - keep slash-command parsing inside `processTextContent(...)`
   - keep `processedUserContent` and `environmentDetails` assembly where it is
   - keep the `clinerules` existence check where it is
   - move `await this.applyPersistentSlashCommandAction(persistentSlashCommandAction)` so it runs before the workflow-form interception call
   - after that call, invoke `await this.maybeResolveWorkflowFormBeforeApiTurn(persistentSlashCommandAction)`
   - delete the old pre-processing call to `maybeResolveWorkflowFormBeforeApiTurn()` at [index.ts:4822](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L4822)
7. In [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L270-L314), update the existing order test so it asserts `applyPersistentSlashCommandAction` is called before `maybeResolveWorkflowFormBeforeApiTurn`, and `maybeResolveWorkflowFormBeforeApiTurn` is still called before focus-chain prompt generation.
8. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L720-L776), keep the existing deterministic-step workflow-form test and update the `createSession` expectation to include `initialPhase: "confirm"` and `context: undefined`.
9. Add one new test to [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts) named `"resumes an existing slash-command workflow-form session without requiring a new slash-command action"`:
   - seed `taskState.activeWorkflowFormSession` with `resolverId: "placeholder_workflow_start_set_workflow_placeholders"`, `triggerSource: "slash_command"`, `owner.kind: "slash_command"`, `phase: "collect_inputs"`, `initialPhase: "collect_inputs"`, and a `context` containing one placeholder field
   - stub `workflowFormRuntime.buildPayload` and `renderWorkflowFormMessage`
   - call `maybeResolveWorkflowFormBeforeApiTurn(undefined)`
   - assert it does not call `workflowFormRuntime.createSession`
   - assert it does render the stored session

## Step 5
[x] Tighten deterministic Step 1 completion for `review-adversarial-general.md` so stable config-backed `diff_output` alone does not complete the workflow, and add the required regression coverage for the new start-form path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`

Exact edits:
1. In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts), find the `review-adversarial-general.md` Step 1 evaluator and replace its merged-placeholder check with this exact rule:
   - read `review_input` and `diff_output` only from `taskState.activePlaceholderWorkflowValues`
   - treat Step 1 as complete only when at least one of those dynamic values is a non-empty trimmed string
   - keep the success reason text as `"review_input or diff_output is already available for this review pass."`
2. In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L52-L88), keep the existing dynamic-value success test and add a new negative test named `"does not complete review-adversarial-general step 1 from stable diff_output alone"` that seeds only `stablePlaceholderValues.diff_output`.
3. In [FocusChainManager.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts), add a new test named `"does not request the Phase 1 workflow form for review-adversarial-general step 1 on ordinary continuation turns"`:
   - seed an active `review-adversarial-general.md` placeholder workflow on Step 1
   - do not provide any current-turn slash-command action
   - call `shouldInterceptWorkflowFormBeforeApiTurn({ cwd, taskState })`
   - assert it returns `false`
   - this test locks in the separation between the new slash-command-start trigger path and the older step-trigger interception path

## Step 6
[x] Run the targeted unit-test suite, confirm the new slash-command start path and existing Phase 1 path both pass, and then update this document to reflect completion.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-2/action-plan.md`

Exact edits and commands:
1. Run this exact command from `/Users/robertboston/Documents/Cline Extension/cline`:

```bash
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts --exit
```

2. If the command fails, stop and ask for input before making any change that is not already prescribed above.
3. If the command passes, update the checkboxes in this document so Steps 1 through 6 accurately reflect completion.

# Post-Execution Findings

High: Slash-command Step 1 forms can be reported as successful even when set_workflow_placeholders failed. The success path in index.ts (line 1504) still decides success by calling shouldInterceptWorkflowFormBeforeApiTurn(...) at index.ts (line 1521), but that gate now only checks the old step-trigger registry in index.ts (line 219) and does not account for the new slash-command start resolver created in WorkflowFormTriggerRegistry.ts (line 49). As a result, a failed start-form tool run still falls into the success branch at index.ts (line 1601) and renders the success copy from WorkflowFormRegistry.ts (line 430). This is user-reachable because the start resolver can emit { values: {} } at WorkflowFormRegistry.ts (line 439), and set_workflow_placeholders explicitly returns an error for empty values at SetWorkflowPlaceholdersToolHandler.ts (line 138).

Medium: The new start form does not enforce the documented “submit at least one Step 1 input” rule. All auto-generated Step 1 fields are marked optional in WorkflowFormRegistry.ts (line 184), the webview only disables submit when required fields are invalid in ChatRow.tsx (line 323), and the runtime will invoke the tool even when the filtered placeholder map is empty in WorkflowFormRuntime.ts (line 177) and WorkflowFormRegistry.ts (line 439). That means the primary Phase 2 use case currently allows an empty submit instead of forcing the human to provide at least one review target.