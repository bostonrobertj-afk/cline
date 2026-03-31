---
title: Required / Optional / One-Of Workflow Start Form Remediation Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/doc/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Required / Optional / One-Of Workflow Start Form Remediation Action Plan

This plan implements:

- [required-optional-remediation.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-2/required-optional-remediation.md)
- [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md)
- [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/architecture.md)
- [readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/readme.md)

This plan supersedes the previous remediation action plan. The previous version patched the workflow-start branch in place. This version first restores the workflow-form capability to a single canonical core shape-definition path, then layers the Step 1 directive requirement-gathering use case onto that shared core.

Locked decisions for this pass:

- The core workflow-form capability must have one canonical basic form-definition path shared by Phase 1 and workflow-start use cases.
- Requirement gathering, form definition / UX flow, and tool-argument bridging must remain separate responsibilities.
- The canonical form-definition model must live in the shared contract layer.
- The shared workflow-form UX engine remains responsible for staged page flow.
- Requirement-gathering code must output normalized requirements only. It must not own page rendering, staged UX, or tool invocation.
- Workflow-start remains document-derived from Step 1.
- Literal `{placeholder}` tokens must remain in Step 1.
- Supported directive labels are exactly `Required:`, `Optional:`, and `One of:`.
- These directive labels are case-sensitive.
- `Required:` and `Optional:` lines accept one or more comma-separated `{placeholder}` tokens.
- Only the first `One of:` line is authoritative. Any later `One of:` lines must be ignored.
- The authoritative `One of:` line accepts 2 to 5 comma-separated `{placeholder}` tokens.
- If the authoritative `One of:` line contains more than 5 placeholders, placeholders after the 5th must be ignored.
- Precedence is `Required:` over `Optional:`.
- If a placeholder is both `Required:` and `Optional:`, ignore the `Optional:` indicator for that placeholder.
- If a placeholder is `Required:` or `Optional:` and also appears in the authoritative `One of:` line, it must still render inside the one-of group.
- Workflow-start field order must be `Required:` fields first, then `Optional:` fields, then the authoritative `One of:` group fields.
- The workflow-start form must be skipped when Step 1 contains none of the supported directive lines.
- The runtime must not fall back to treating all extracted Step 1 placeholders as semantically equivalent.
- Required-field validation failure copy must be exactly `required fields are missing input`.
- One-of validation failure copy must be exactly `One-of fields require at least one field be completed prior to submitting`.
- Required fields must render with a red asterisk.
- Optional fields must not receive a separate visual badge or suffix in this pass.
- `One of:` groups must render with all-caps `OR` separators between fields.
- The existing Phase 1 `code-review.md` Step 3 workflow-form behavior must remain intact functionally.
- This pass must not modify any workflow source file under `/Users/robertboston/Documents/Cline/Workflows/`.

## Step 1
[x] Introduce the canonical shared workflow-form definition model and stop treating `ClineWorkflowForm` as a use-case-specific flattened shape.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts`

Exact edits:
1. In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L380-L424), keep the existing `WorkflowFormFieldControl`, `WorkflowFormFieldOption`, and `WorkflowFormFieldValuePayload` declarations.
2. In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L394-L403), keep `required: boolean` and `oneOfGroupId?: string` on `WorkflowFormFieldDefinition`.
3. In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L405-L424), insert these new shared interfaces immediately above `ClineWorkflowForm`:

```ts
export type WorkflowFormRenderablePhase = Extract<
	WorkflowFormPhase,
	"confirm" | "select_source" | "collect_inputs" | "retry_error"
>

export interface WorkflowFormPageDefinition {
	prompt: string
	options?: string[]
	fields?: WorkflowFormFieldDefinition[]
	submitLabel?: string
	cancelLabel?: string
	retryLabel?: string
}

export interface WorkflowFormDefinition {
	toolName: string
	title: string
	toolDictionaryTitle: string
	toolDictionaryMarkdown: string
	pages: Partial<Record<WorkflowFormRenderablePhase, WorkflowFormPageDefinition>>
	successMessage: string
}
```

4. Replace `ClineWorkflowForm` in [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L405-L424) with this exact shape:

```ts
export interface ClineWorkflowForm {
	sessionId: string
	resolverId: string
	phase: WorkflowFormPhase
	definition: WorkflowFormDefinition
	values?: Record<string, WorkflowFormFieldValuePayload>
	errorMessage?: string
	successMessage?: string
}
```

5. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L1-L120), replace the current workflow-start-heavy `WorkflowFormSessionContext` with a normalized requirement context:

```ts
export interface WorkflowFormStartOneOfRequirement {
	id: string
	fieldKeys: string[]
}

export interface WorkflowFormStartRequirements {
	requiredFieldKeys: string[]
	optionalFieldKeys: string[]
	oneOfRequirement?: WorkflowFormStartOneOfRequirement
}

export interface WorkflowFormSessionContext {
	workflowName?: string
	workflowStartRequirements?: WorkflowFormStartRequirements
}
```

6. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L66-L86), replace the current resolver contract that builds individual page payloads with this exact contract:

```ts
buildDefinition(session: WorkflowFormSessionState): WorkflowFormDefinition
buildToolExecutionFailureFallbackMessage(session: WorkflowFormSessionState): string
buildToolExecutionRequest(session: WorkflowFormSessionState, values: WorkflowFormValues): WorkflowFormToolExecutionRequest
evaluateToolExecutionResult(
	session: WorkflowFormSessionState,
	args: { toolResultText?: string },
): WorkflowFormToolExecutionEvaluation
```

7. Remove these resolver-interface members from [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L66-L86):
   - `title`
   - `toolDictionaryTitle`
   - `toolDictionaryMarkdown`
   - `buildConfirmPayload`
   - `buildSelectSourcePayload`
   - `buildCollectInputsPayload`
   - `buildRetryPayload`
   - `buildSuccessMessage`
8. Create [buildWorkflowFormPayload.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts) with these exact exports:

```ts
import type { ClineWorkflowForm, WorkflowFormDefinition, WorkflowFormRenderablePhase } from "@shared/ExtensionMessage"
import type { WorkflowFormSessionState } from "./types"

export function buildWorkflowFormPayload(args: {
	session: WorkflowFormSessionState
	definition: WorkflowFormDefinition
	errorMessage?: string
	successMessage?: string
}): ClineWorkflowForm
```

9. Implement `buildWorkflowFormPayload(...)` so it:
   - if `args.session.phase === "success"`, returns:
     - `phase: "success"`
     - `definition: args.definition`
     - `values: args.session.values`
     - `successMessage: args.successMessage ?? args.definition.successMessage`
     - no `errorMessage`
   - otherwise resolves the page from `args.definition.pages[args.session.phase as WorkflowFormRenderablePhase]`
   - throws `Error("Workflow form definition is missing the page for phase: <phase>")` if the page is missing
   - returns `sessionId`, `resolverId`, `phase`, `definition`, `values`, and:
     - `errorMessage: args.errorMessage`
10. Do not edit any other files in this step.

## Step 2
[x] Refactor the shared workflow-form runtime so page rendering comes from the canonical definition model, while staged page flow remains runtime-owned and use-case-agnostic.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Exact edits:
1. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L1-L291), import `buildWorkflowFormPayload` from `./buildWorkflowFormPayload`.
2. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L75-L122), replace:
   - `buildPayload(...)`
   - `buildRetryPayload(...)`
   - `buildSuccessPayload(...)`
   so they all:
   - call `const definition = resolver.buildDefinition(session)`
   - return `buildWorkflowFormPayload(...)`
3. The exact behavior must be:
   - `buildPayload(session)` returns `buildWorkflowFormPayload({ session, definition })`
   - `buildRetryPayload(session, errorMessage)` returns `buildWorkflowFormPayload({ session: { ...session, phase: "retry_error", lastError: errorMessage }, definition, errorMessage })`
   - `buildSuccessPayload(session, successMessage)` returns `buildWorkflowFormPayload({ session: { ...session, phase: "success" }, definition, successMessage })`
4. Keep `createSession(...)`, `handleSubmission(...)`, and the existing phase-transition ownership in `WorkflowFormRuntime` for this step. Do not yet change validation logic in this step.
5. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), update the custom resolver fixtures so they implement `buildDefinition(session)` instead of individual `build*Payload(...)` methods.
6. Add one new test named `"builds confirm and retry payloads from the shared workflow-form definition"` that asserts:
   - the confirm payload and retry payload both carry the same `definition`
   - retry payload uses `phase: "retry_error"`
   - retry payload surfaces the provided `errorMessage`

## Step 3
[x] Move workflow-start requirement gathering into its own parser so it outputs normalized requirements only and does not build form copy, page shape, or tool payloads.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`

Exact edits:
1. Create [workflowStartRequirements.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts) with these exact exports:

```ts
import type { WorkflowFormStartRequirements } from "./types"

export const REQUIRED_DIRECTIVE_PREFIX = "Required:"
export const OPTIONAL_DIRECTIVE_PREFIX = "Optional:"
export const ONE_OF_DIRECTIVE_PREFIX = "One of:"
export const WORKFLOW_START_ONE_OF_LIMIT = 5

export function parseWorkflowStartRequirements(rawDetails: string): WorkflowFormStartRequirements | undefined
```

2. In that new file, import `extractWorkflowPlaceholderKeys` from `@/core/workflows/workflow-placeholders`.
3. Implement `parseWorkflowStartRequirements(rawDetails)` with these exact rules:
   - split `rawDetails` by newline
   - trim each line before processing
   - collect `requiredFieldKeys` from every `Required:` line by:
     - taking the substring after `Required:`
     - splitting by comma
     - trimming each segment
     - extracting placeholders from each segment with `extractWorkflowPlaceholderKeys`
   - collect `optionalFieldKeys` from every `Optional:` line using the same parsing rules
   - find only the first `One of:` line, if any
   - parse that line using the same comma-splitting and placeholder extraction rules
   - keep only the first 5 parsed placeholders from that first `One of:` line
   - ignore the `One of:` line entirely unless at least 2 placeholders remain
   - deduplicate `requiredFieldKeys` and `optionalFieldKeys` by first appearance
   - remove from `optionalFieldKeys` any key that appears in `requiredFieldKeys`
   - if there are no required fields, no optional fields, and no valid first `One of:` line, return `undefined`
   - otherwise return:

```ts
{
	requiredFieldKeys,
	optionalFieldKeys,
	oneOfRequirement: oneOfFieldKeys
		? {
				id: "workflow_start_one_of",
				fieldKeys: oneOfFieldKeys,
			}
		: undefined,
}
```

4. In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L1-L142):
   - remove `extractWorkflowPlaceholderKeys`
   - remove `buildWorkflowStartFormSessionContext`
   - import `parseWorkflowStartRequirements` from `./workflowStartRequirements`
5. In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L37-L109), keep the `WorkflowFormStartCandidate` shape but change `context` creation so it stores only:

```ts
context: {
	workflowName: args.taskState.activePlaceholderWorkflowSource.name,
	workflowStartRequirements: parsedRequirements,
}
```

6. Replace the current rendered/raw placeholder extraction and forced `diff_output` exception logic in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L78-L89) with:
   - `const parsedRequirements = parseWorkflowStartRequirements(activeStep.rawDetails)`
   - `if (!parsedRequirements) return undefined`
7. In [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts), rewrite the workflow-start fixtures to use literal directive lines instead of generic placeholder prose.
8. Add these 4 tests to [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts):
   - `"parses required and optional directive lines into workflow-start requirements"`
   - `"ignores Optional semantics when the same placeholder is also Required"`
   - `"uses only the first One of line and ignores later One of lines"`
   - `"ignores placeholders after the fifth member of the first One of line"`

## Step 4
[x] Move workflow-start form definition building into the shared core resolver path so workflow-start and Phase 1 both use the same canonical form-shape mechanism.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Exact edits:
1. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L137-L254), keep the `WORKFLOW_START_TOOL_DICTIONARY_CONFIG`, `humanizeWorkflowPlaceholderKey(...)`, and workflow-specific title/prompt/label/help override idea.
2. Remove `forcedPlaceholderKeys` from `WorkflowStartFormOverride` in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L148-L154).
3. Remove `forcedPlaceholderKeys` from the `review-adversarial-general.md` override in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L156-L173).
4. Replace `buildWorkflowStartPlaceholderFieldDefinitions(...)` in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L183-L223) with a helper that takes:

```ts
args: {
	requiredFieldKeys: string[]
	optionalFieldKeys: string[]
	oneOfRequirement?: { id: string; fieldKeys: string[] }
	override?: WorkflowStartFormOverride
}
```

5. Implement that helper so it:
   - orders fields as:
     - all required keys in order
     - then all optional keys in order
     - then all keys from `oneOfRequirement?.fieldKeys ?? []` in order
   - deduplicates by first appearance
   - sets `required: true` only for keys present in `requiredFieldKeys`
   - sets `oneOfGroupId: args.oneOfRequirement?.id` for keys present in `oneOfRequirement.fieldKeys`
   - keeps `control: "text"`, `visible: true`, and `placeholder: "/absolute/path/to/file-or-artifact"`
   - uses override labels/help first, otherwise humanized key names
6. Remove `buildWorkflowStartFormSessionContext(...)` entirely from [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L225-L254).
7. In the Phase 1 resolver entry in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L326-L443), replace:
   - `title`
   - `toolDictionaryTitle`
   - `toolDictionaryMarkdown`
   - all `build*Payload(...)` methods
   with one `buildDefinition(session)` that returns a `WorkflowFormDefinition` whose pages reproduce the exact existing Phase 1 UX:
   - `confirm`
   - `select_source`
   - `collect_inputs`
   - `retry_error`
8. In the workflow-start resolver entry in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L445-L523), replace all title/prompt/field/session-context page building with one `buildDefinition(session)` that:
   - reads `session.context?.workflowName`
   - reads `session.context?.workflowStartRequirements`
   - throws if either is missing
   - resolves the workflow override from `workflowStartFormOverrides`
   - builds fields from the normalized requirement data
   - returns a `WorkflowFormDefinition` with:
     - `toolName: set_workflow_placeholders`
     - title from override or `"Workflow Start Inputs"`
     - prompt from override or `"Provide any Step 1 workflow inputs you already have before the first AI turn begins."`
     - one `collect_inputs` page
     - one `retry_error` page
     - success message `"Workflow start inputs were stored."`
9. Keep `buildToolExecutionRequest(...)`, `buildToolExecutionFailureFallbackMessage(...)`, and `evaluateToolExecutionResult(...)` for both resolvers, but do not let them own field/page/copy shape anymore.
10. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts), replace the existing workflow-start session-context tests with tests that assert:
   - workflow-start `buildDefinition(session)` builds fields from normalized requirements
   - field ordering is required, then optional, then one-of
   - a key that is required and also in the one-of group remains `required: true` and carries `oneOfGroupId`
   - review-adversarial labels/help overrides still apply
11. Add one new Phase 1 test that asserts `buildDefinition(session)` still contains the expected `confirm`, `select_source`, `collect_inputs`, and `retry_error` pages.

## Step 5
[x] Replace the old minimum-filled-field validation path with shared canonical validation based on the current page definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Exact edits:
1. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L17-L35), keep `hasWorkflowFormValue(...)`.
2. Remove `countFilledWorkflowFormValues(...)` from [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L33-L35).
3. Directly below `hasWorkflowFormValue(...)`, add these exact helpers:

```ts
function getCurrentPageFields(session: WorkflowFormSessionState, resolver: WorkflowFormResolverDefinition) {
	const definition = resolver.buildDefinition(session)
	const page = session.phase === "success" ? undefined : definition.pages[session.phase]
	return page?.fields ?? []
}

function areRequiredWorkflowFormFieldsSatisfied(
	values: WorkflowFormValues,
	fields: Array<{ key: string; required: boolean }>,
): boolean {
	return fields.filter((field) => field.required).every((field) => hasWorkflowFormValue(values[field.key]))
}

function areOneOfWorkflowFormGroupsSatisfied(
	values: WorkflowFormValues,
	fields: Array<{ key: string; oneOfGroupId?: string }>,
): boolean {
	const groupedKeys = fields.reduce<Record<string, string[]>>((acc, field) => {
		if (!field.oneOfGroupId) {
			return acc
		}
		acc[field.oneOfGroupId] ??= []
		acc[field.oneOfGroupId].push(field.key)
		return acc
	}, {})

	return Object.values(groupedKeys).every((groupKeys) => groupKeys.some((key) => hasWorkflowFormValue(values[key])))
}
```

4. In the submit branch in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L197-L235), replace the `minimumFilledFieldCount` validation block with:
   - `const fields = getCurrentPageFields(session, resolver)`
   - if required fields are not satisfied:
     - render `retry_error`
     - set `lastError` to exactly `required fields are missing input`
   - else if one-of groups are not satisfied:
     - render `retry_error`
     - set `lastError` to exactly `One-of fields require at least one field be completed prior to submitting`
   - else invoke the tool
5. Do not change the Phase 1 page-flow transitions in `handleSubmission(...)`.
6. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), replace all remaining workflow-start fixtures that still refer to:
   - `minimumFilledFieldCount`
   - `minimumFilledFieldErrorMessage`
7. Add 3 tests:
   - `"renders retry_error when required workflow-start fields are missing"`
   - `"renders retry_error when the workflow-start one-of requirement is unsatisfied"`
   - `"allows workflow-start submit when required and one-of semantics are satisfied"`

## Step 6
[x] Update the chat-row UI to consume the canonical definition object, render required markers and one-of grouping, and keep all page rendering inside the shared form UX path.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`

Exact edits:
1. In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L282-L345), after parsing `workflowForm`, derive:
   - `const workflowFormPage = workflowForm?.phase === "success" ? undefined : workflowForm?.definition.pages[workflowForm.phase]`
   - `const visibleWorkflowFormFields = workflowFormPage?.fields?.filter((field) => field.visible !== false) ?? []`
   - `const workflowFormOptions = workflowFormPage?.options ?? []`
2. Remove all references in [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L320-L345) to:
   - `minimumFilledFieldCount`
   - `minimumFilledFieldErrorMessage`
3. Replace the submit-disable logic with the same required/one-of rules used in the runtime:
   - required fields must be filled
   - each one-of group present on the page must have at least one filled field
4. In the main workflow-form frame rendering path in [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L1470-L1735):
   - replace uses of `workflowForm.title` with `workflowForm.definition.title`
   - replace uses of `workflowForm.prompt` with `workflowFormPage?.prompt`
   - replace uses of `workflowForm.toolDictionaryTitle` with `workflowForm.definition.toolDictionaryTitle`
   - replace uses of `workflowForm.toolDictionaryMarkdown` with `workflowForm.definition.toolDictionaryMarkdown`
   - replace uses of top-level `options` / `fields` with `workflowFormOptions` / `visibleWorkflowFormFields`
5. For collect and retry pages:
   - group fields by `oneOfGroupId`
   - render ungrouped fields as standalone rows
   - render the one-of group with the exact instruction text `Provide one of the following`
   - render `OR` between adjacent one-of fields
6. For every required field label in both phases:
   - append `<span className="text-red-500">*</span>`
   - do not add any explicit optional label
7. In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx), update `createWorkflowFormMessage(...)` so it builds the new `definition.pages` shape instead of the old flattened payload shape.
8. Add 4 tests:
   - `"renders workflow-form title and prompt from the canonical definition"`
   - `"shows a red asterisk on required workflow-start fields"`
   - `"renders the workflow-start one-of group with OR separators"`
   - `"keeps Submit disabled until required fields and the one-of group are satisfied"`

## Step 7
[x] Update workflow-start persistence and registry tests to the new normalized requirement context and canonical form-definition model.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Exact edits:
1. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L782-L956), update every workflow-start session fixture so `context` contains only:
   - `workflowName`
   - `workflowStartRequirements`
2. Remove from those fixtures any stale workflow-start shape properties such as:
   - `title`
   - `prompt`
   - `toolDictionaryTitle`
   - `toolDictionaryMarkdown`
   - `fields`
   - `placeholderFieldKeys`
   - `requiredFieldKeys`
   - `optionalFieldKeys`
   - `oneOfGroups`
   - `minimumFilledFieldCount`
   - `minimumFilledFieldErrorMessage`
3. Keep the existing persistence intent of those tests unchanged:
   - resumed sessions still rebuild without a new slash command
   - successful tool execution still counts as workflow-form success even if Step 1 remains active
   - failed tool execution still leaves the form in failure state
4. In [loadContext.placeholderWorkflow.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts#L237-L320), keep the existing load-order assertions intact. Only update any payload-shape assumptions that break because `ClineWorkflowForm` now carries `definition`.

## Step 8
[x] Update the task success path to consume the canonical workflow-form definition instead of the removed resolver `buildSuccessMessage(...)` method.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

Exact edits:
1. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1601-L1608), keep the existing resolver lookup:

```ts
const resolver = getWorkflowFormResolverDefinition(outcome.session.resolverId)
```

2. Immediately below that line, add:

```ts
const definition = resolver.buildDefinition(outcome.session)
```

3. In the same success branch, replace:

```ts
resolver.buildSuccessMessage(outcome.session)
```

with:

```ts
definition.successMessage
```

4. Do not change any other success-branch behavior in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1595-L1611).

## Step 9
[x] Apply the strict-typing cleanup required by the canonical workflow-form refactor so the validation pipeline can compile the updated runtime and shared dictionary config.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`

Exact edits:
1. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L108-L121), keep `retrySession` explicitly typed as `WorkflowFormSessionState`:

```ts
const retrySession: WorkflowFormSessionState = {
	...session,
	phase: "retry_error",
	lastError: errorMessage,
}
```

2. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L223-L225), replace:

```ts
payload: this.buildRetryPayload(nextSession, nextSession.lastError),
```

with:

```ts
payload: this.buildRetryPayload(nextSession, "required fields are missing input"),
```

3. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L238-L240), replace:

```ts
payload: this.buildRetryPayload(nextSession, nextSession.lastError),
```

with:

```ts
payload: this.buildRetryPayload(nextSession, "One-of fields require at least one field be completed prior to submitting"),
```

4. In [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L11-L18), change:

```ts
termKeys?: WorkflowFormSystemDictionaryKey[]
```

to:

```ts
termKeys?: readonly WorkflowFormSystemDictionaryKey[]
```

5. Do not change any runtime behavior beyond those typing fixes.

## Step 10
[x] Remove the lint-only unused imports left behind by the canonical workflow-form refactor.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`

Exact edits:
1. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L47-L50), remove the unused imports:
   - `fileExistsForPlaceholderWorkflowWriteProof`
   - `taskStateHasPlaceholderWorkflowWriteProof`
2. Do not change any other imports in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts).
3. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L9-L14), remove the unused `WorkflowFormSessionState` type import.
4. Do not change any other imports in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts).

## Step 11
[x] Run the targeted validation commands, update this plan’s checkboxes, and stop immediately if any command fails.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/phase-2/required-optional-remediation-action-plan.md`

Exact edits:
1. Run this backend-focused command exactly:

```bash
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts --exit
```

2. Run this webview-focused command exactly from `/Users/robertboston/Documents/Cline Extension/cline/webview-ui`:

```bash
npm run test -- src/components/chat/ChatRow.test.tsx
```

3. If either command fails, stop immediately and report the exact failure without making any additional unplanned edits.
4. If both commands pass, update every completed step checkbox in this plan from `[ ]` to `[x]`.
