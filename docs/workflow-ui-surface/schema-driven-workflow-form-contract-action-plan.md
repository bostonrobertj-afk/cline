---
title: Schema-Driven Workflow Form Contract Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/doc/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Schema-Driven Workflow Form Contract Action Plan

This plan implements:

- [readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/readme.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/phase-2/requirements.md)
- [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/discovery.md)
- [test-31.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/test-31.md)

Locked decisions for this pass:

- The base workflow-form capability remains runtime-defined from the invoked tool schema.
- Any layer between tool schema, runtime form definition, submission transport, payload assembly, and final tool invocation must remain compatible with the runtime-defined contract.
- The shared workflow-form transport must stop predeclaring field-value types as string / integer / string-array buckets.
- The shared workflow-form transport will carry raw submitted values generically; runtime schema parsing determines the typed value later.
- `WorkflowFormFieldDefinition` must carry the resolved schema fragment for that field so the runtime and webview can both obey the same contract.
- The base workflow-form capability keeps the existing simple control family only: `select`, `text`, `textarea`, and `number`.
- Boolean-valued schema fields will render through the existing `select` control with `true` / `false` options in this pass. No new checkbox control is introduced in this pass.
- Arrays and objects will use the existing `textarea` control in this pass.
- Arrays whose item schema is `string` will accept one trimmed value per line by default.
- Arrays with non-string item schemas and objects will accept JSON text in this pass.
- Use case 1 keeps its intended three-screen UX exactly:
  1. `confirm`
  2. `select_source`
  3. `collect_inputs`
- The source-selection screen for use case 1 must become schema-derived; it must not stay hard-coded.
- Workflow-start forms remain specialized only in field discovery and required / optional semantics from workflow documents.
- Workflow-start forms must still inherit field typing from the invoked tool schema for `set_workflow_placeholders`.
- Only [build_review_diff_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_diff_output.ts) requires a schema upgrade in this pass.
- Future workflow-form use cases must verify that the invoked tool's schema is sufficiently machine-readable for the required staged UX and upgrade that tool schema if it is not.

## Step 1
[ ] Replace the hard-coded typed workflow-form submission envelope with a schema-agnostic raw-value contract, and expose resolved field schema in the shared workflow-form payload.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/proto/cline/task.proto`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/proto/cline/task.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/grpc-js/cline/task.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/generated/nice-grpc/cline/task.ts`

Exact edits:
1. In [task.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto#L126-L132), replace the entire `WorkflowFormFieldValue` `oneof` declaration with this exact message:

```proto
message WorkflowFormFieldValue {
  string raw_value = 1;
}
```

2. In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L380-L404), keep `WorkflowFormFieldControl` unchanged as exactly:
   - `"select" | "text" | "textarea" | "number"`
3. In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L388-L392), replace `WorkflowFormFieldValuePayload` with this exact interface:

```ts
export interface WorkflowFormFieldValuePayload {
	rawValue?: string
}
```

4. In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L388-L404), insert these exact declarations immediately above `WorkflowFormFieldValuePayload`:

```ts
export type WorkflowFormJsonSchemaType = "string" | "integer" | "boolean" | "array" | "object"

export interface WorkflowFormJsonSchema {
	type: WorkflowFormJsonSchemaType
	enum?: string[]
	const?: string | number | boolean
	items?: WorkflowFormJsonSchema
	properties?: Record<string, WorkflowFormJsonSchema>
	required?: string[]
	additionalProperties?: WorkflowFormJsonSchema
	oneOf?: WorkflowFormJsonSchema[]
}
```

5. In [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L394-L403), add `valueSchema: WorkflowFormJsonSchema` immediately after `control: WorkflowFormFieldControl`.
6. Do not change `WorkflowFormDefinition`, `WorkflowFormPageDefinition`, or `ClineWorkflowForm` in this step.
7. After editing [task.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto), run `npm run protos`.
8. Keep only the generated task-proto output changes in:
   - [task.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto/cline/task.ts)
   - [task.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/generated/grpc-js/cline/task.ts)
   - [task.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/generated/nice-grpc/cline/task.ts)
9. Do not manually edit those generated files.

## Step 2
[ ] Add the shared workflow-form schema-resolution and raw-value parsing helpers, and make tool-spec lookup canonical outside the dictionary builder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/schema.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts`

Exact edits:
1. Create [schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts) with these exact exports:
   - `export interface WorkflowFormFieldSchemaBinding { parameterName: string; propertyPath?: string[]; useAdditionalProperties?: boolean }`
   - `export function resolveWorkflowFormToolSpec(toolName: ClineDefaultTool): ClineToolSpec`
   - `export function resolveWorkflowFormSchema(toolName: ClineDefaultTool, binding: WorkflowFormFieldSchemaBinding): WorkflowFormJsonSchema`
   - `export function deriveWorkflowFormControl(schema: WorkflowFormJsonSchema): WorkflowFormFieldControl`
   - `export function deriveWorkflowFormOptions(schema: WorkflowFormJsonSchema): WorkflowFormFieldOption[] | undefined`
   - `export function parseWorkflowFormRawValue(rawValue: string | undefined, schema: WorkflowFormJsonSchema): unknown`
2. In that new file, move the existing `resolveWorkflowFormToolSpec(...)` implementation out of [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L21-L29) without changing its behavior.
3. In `resolveWorkflowFormSchema(...)`, implement these exact resolution rules:
   - look up the tool spec by `toolName`
   - find the parameter whose `name === binding.parameterName`
   - if `binding.useAdditionalProperties === true`, require `parameter.additionalProperties` to exist and return that schema fragment
   - else if `binding.propertyPath` is present, walk `parameter.properties` segment-by-segment and return the final property schema
   - else return the parameter schema itself
   - on any missing parameter or missing schema segment, throw `Error("Workflow form schema binding could not be resolved.")`
4. In `resolveWorkflowFormSchema(...)`, normalize every returned schema fragment to the shared `WorkflowFormJsonSchema` shape:
   - `type` is required
   - copy through `enum`, `const`, `items`, `properties`, `required`, `additionalProperties`, and `oneOf` when present
   - recursively normalize nested `items`, `properties`, `additionalProperties`, and `oneOf`
5. In `deriveWorkflowFormControl(...)`, use these exact rules:
   - `schema.enum` with string values => `"select"`
   - `schema.type === "boolean"` => `"select"`
   - `schema.type === "integer"` => `"number"`
   - `schema.type === "array"` => `"textarea"`
   - `schema.type === "object"` => `"textarea"`
   - otherwise => `"text"`
6. In `deriveWorkflowFormOptions(...)`, use these exact rules:
   - string `enum` values => return `[{ value, label: value }]` for each enum member
   - boolean schema => return `[{ value: "true", label: "True" }, { value: "false", label: "False" }]`
   - otherwise => `undefined`
7. In `parseWorkflowFormRawValue(...)`, use these exact rules:
   - `undefined`, empty string, or all-whitespace input => return `undefined`
   - `string` => return `trimmedRawValue`
   - `integer` => parse base-10 integers only; return `undefined` when parsing fails
   - `boolean` => accept only case-insensitive `true` and `false`; return `true` / `false`
   - `array` with `schema.items?.type === "string"` => split `trimmedRawValue` on `\n`, trim each line, drop empties, and return the resulting string array
   - every other `array` => `JSON.parse(trimmedRawValue)` and return the parsed value only when it is an array
   - `object` => `JSON.parse(trimmedRawValue)` and return the parsed value only when it is a non-null object and not an array
   - on JSON parse failure, return `undefined`
8. In [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L1-L29), remove the local `resolveWorkflowFormToolSpec(...)` implementation and import it from `../schema`.
9. Add [schema.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts) with these exact tests:
   - `"resolves set_workflow_placeholders additionalProperties as a string schema"` using binding `{ parameterName: "values", useAdditionalProperties: true }`
   - `"resolves build_review_diff_output context_lines as an integer schema"` using binding `{ parameterName: "context_lines" }`
   - `"derives select control and options from an enum string schema"`
   - `"parses line-delimited string-array raw values"`
   - `"returns undefined for invalid integer raw values"`

## Step 3
[ ] Upgrade the `build_review_diff_output` tool schema so use case 1 branch selection and final-screen field typing are machine-readable, then refactor the Phase 1 resolver to derive those definitions from schema instead of hard-coded mappings.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_review_diff_output.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Exact edits:
1. In [build_review_diff_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_diff_output.ts#L13-L35), keep the three top-level parameters unchanged by name:
   - `source`
   - `scoped_paths`
   - `context_lines`
2. Replace the current prose-only `source` schema at [build_review_diff_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_diff_output.ts#L14-L20) with this exact machine-readable shape while preserving the existing `instruction` text:

```ts
properties: {
	type: {
		type: "string",
		enum: ["commit", "commit_range", "ref_diff", "worktree_head_scoped"],
	},
	commit: { type: "string" },
	base: { type: "string" },
	head: { type: "string" },
},
requiredProperties: ["type"],
oneOf: [
	{
		type: "object",
		properties: {
			type: { type: "string", const: "commit" },
			commit: { type: "string" },
		},
		required: ["type", "commit"],
	},
	{
		type: "object",
		properties: {
			type: { type: "string", const: "commit_range" },
			base: { type: "string" },
			head: { type: "string" },
		},
		required: ["type", "base", "head"],
	},
	{
		type: "object",
		properties: {
			type: { type: "string", const: "ref_diff" },
			base: { type: "string" },
			head: { type: "string" },
		},
		required: ["type", "base", "head"],
	},
	{
		type: "object",
		properties: {
			type: { type: "string", const: "worktree_head_scoped" },
		},
		required: ["type"],
	},
],
```

3. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L281-L295), add one new test named `"encodes build_review_diff_output source variants as machine-readable schema"` that asserts:
   - `source.properties.type.enum` exactly equals `["commit", "commit_range", "ref_diff", "worktree_head_scoped"]`
   - `source.oneOf` exists and has length `4`
4. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L15-L128), delete `buildSourceTypeOptions()` entirely.
5. Immediately above `buildSourceSelectionFieldDefinitions()` in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L61), add these exact helpers:
   - `buildSchemaBackedField(args)` which:
     - resolves `valueSchema` from `resolveWorkflowFormSchema(...)`
     - derives `control` from `deriveWorkflowFormControl(...)`
     - derives default `options` from `deriveWorkflowFormOptions(...)`
     - returns a `WorkflowFormFieldDefinition` while allowing caller overrides for `key`, `label`, `help`, `required`, `placeholder`, `visible`, and `oneOfGroupId`
   - `getSelectedSourceType(values)` which reads `values["source.type"]?.rawValue?.trim()`
   - `getSourceBranchPropertyKeys(sourceType)` that returns:
     - `["commit"]` for `"commit"`
     - `["base", "head"]` for `"commit_range"` and `"ref_diff"`
     - `[]` for `"worktree_head_scoped"`
6. Replace `buildSourceSelectionFieldDefinitions()` so it returns exactly one field built through `buildSchemaBackedField(...)` with:
   - `key: "source.type"`
   - binding `{ parameterName: "source", propertyPath: ["type"] }`
   - label/help from the existing source dictionary entry
   - `required: true`
   - `visible: true`
   - `options` relabeled from the system dictionary when a matching key exists; do not leave the old hard-coded option list in place
7. Replace `buildConcreteInputFieldDefinitions(values)` so it:
   - reads the selected source type from `getSelectedSourceType(values)`
   - adds one schema-backed field for each branch-specific source property returned by `getSourceBranchPropertyKeys(sourceType)`
   - adds `scoped_paths` with binding `{ parameterName: "scoped_paths" }` whenever a source type is selected
   - adds `context_lines` with binding `{ parameterName: "context_lines" }` for every selected source type except `"worktree_head_scoped"`
   - preserves the current labels, help text, placeholders, and visible/required behavior exactly
8. Do not change the current staged pages or prompt copy in the Phase 1 resolver.
9. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L17-L50), update the Phase 1 serialization test input values to:
   - `{ rawValue: "commit_range" }`
   - `{ rawValue: "main" }`
   - `{ rawValue: "feature/review-form" }`
   - `{ rawValue: "src/core/task/index.ts\nwebview-ui/src/components/chat" }`
   - `{ rawValue: "5" }`
10. In that same file, add one new test immediately after the Phase 1 serialization test named `"derives Phase 1 source-selection options from the build_review_diff_output schema"`.
That test must assert the `select_source` page exposes exactly these option values on the `source.type` field:
   - `commit`
   - `commit_range`
   - `ref_diff`
   - `worktree_head_scoped`
11. In that same file, add one new test immediately after the new source-selection test named `"attaches schema-derived value types to Phase 1 concrete input fields"`.
That test must build a `collect_inputs` definition for `source.type = "commit"` and assert:
   - `source.commit.valueSchema.type === "string"`
   - `scoped_paths.valueSchema.type === "array"`
   - `context_lines.valueSchema.type === "integer"`

## Step 4
[ ] Refactor the workflow-form runtime and resolver payload assembly to consume the new raw-value contract and schema-derived field definitions, including workflow-start forms.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`

Exact edits:
1. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L18-L82), replace the current typed-value helpers with schema-aware raw-value handling:
   - change `hasWorkflowFormValue(...)` so it accepts `(field: WorkflowFormFieldDefinition, value: WorkflowFormFieldValuePayload | undefined)` and returns `true` only when `parseWorkflowFormRawValue(value?.rawValue, field.valueSchema)` returns something other than `undefined`
   - keep string trimming behavior through `parseWorkflowFormRawValue(...)`
2. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L63-L82), replace `buildValuesFromSubmissions(...)` so it copies only `field.value.rawValue` into `{ rawValue }`.
3. In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L40-L60), update required-field and one-of validation so each field is evaluated through the field definition returned by `getCurrentPageFields(...)`; do not validate raw strings without consulting `field.valueSchema`.
4. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L22-L33), delete `getStringValue`, `getStringArrayValue`, and `getIntegerValue`.
5. Replace those deleted helpers with:
   - `getParsedFieldValue(fields, values, key)` that finds the current field definition by `key` and returns `parseWorkflowFormRawValue(values[key]?.rawValue, field.valueSchema)`
   - `getCurrentCollectFields(session, buildDefinition)` that returns `buildDefinition(session).pages.collect_inputs?.fields ?? []`
6. In the Phase 1 resolver `buildToolExecutionRequest(...)` at [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L271-L340), rebuild `toolInput` from parsed raw values:
   - `source.type`, `source.commit`, `source.base`, and `source.head` must come from parsed string values
   - `scoped_paths` must come from a parsed array value
   - `context_lines` must come from a parsed integer value
   - do not read `rawValue` directly in this method
7. In the workflow-start resolver `buildWorkflowStartPlaceholderFieldDefinitions(...)` at [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L174-L202), replace the hard-coded `control: "text"` field construction with `buildSchemaBackedField(...)` using binding `{ parameterName: "values", useAdditionalProperties: true }`.
8. In that same workflow-start builder, preserve the existing field order, labels, help text, required flags, one-of group ids, placeholders, and visibility exactly.
9. In the workflow-start resolver `buildToolExecutionRequest(...)` at [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L411-L426), parse each current field through its `valueSchema` and only retain parsed string values in the final `filteredValues` object.
10. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L177-L223), update the workflow-start serialization test to use `rawValue` inputs instead of `stringValue`.
11. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L112-L175), extend the workflow-start definition test so it also asserts every emitted field has `valueSchema.type === "string"`.
12. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L37-L68), update the custom resolver fixture so every field definition includes `valueSchema: { type: "string" }`.
13. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L99-L117), update the custom resolver's `buildToolExecutionRequest(...)` to read `values[field.key]?.rawValue`.
14. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), replace every typed test submission payload with `rawValue` submissions.
15. Add one new runtime test named `"drops schema-invalid optional collect_inputs values while still invoking the tool"` using the Phase 1 resolver, a `collect_inputs` session with:
   - `source.type.rawValue = "commit"`
   - `source.commit.rawValue = "abc1234"`
   - `context_lines.rawValue = "not-a-number"`
   and assert:
   - the outcome kind is `invoke_tool`
   - `toolInput` does not include `context_lines`
   - `toolParams` does not include `context_lines`

## Step 5
[ ] Replace the webview's field-name-based workflow-form submission mapping with a generic schema-driven submit path, and make the workflow-form row read/write raw values from the runtime definition.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`

Exact edits:
1. In [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts#L11-L115), delete:
   - `WorkflowFormUiValue`
   - `normalizeWorkflowFormStringValue(...)`
   - `normalizeWorkflowFormStringArrayValue(...)`
   - `normalizeWorkflowFormIntegerValue(...)`
2. In that same file, change `buildWorkflowFormSubmissionRequest(...)` to this exact signature:

```ts
export function buildWorkflowFormSubmissionRequest(
	workflowForm: ClineWorkflowForm,
	action: WorkflowFormAction,
	values: Record<string, string> = {},
): WorkflowFormSubmissionRequest
```

3. In `buildWorkflowFormSubmissionRequest(...)`, implement these exact stage rules:
   - when `workflowForm.phase === "confirm"`, read `const confirm = values.confirm?.trim()`
   - if `confirm` is non-empty, submit exactly one field: `{ key: "confirm", value: { rawValue: confirm } }`
   - do not inspect `workflowForm.definition.pages.confirm?.options` beyond that
   - for every other non-success phase, read the current page from `workflowForm.definition.pages[workflowForm.phase]`
   - iterate that page's `fields ?? []`, not `Object.entries(values)`
4. For each iterated field on non-confirm phases:
   - read `const rawValue = values[field.key]?.trim()`
   - if `rawValue` is empty, skip the field
   - otherwise submit `{ key: field.key, value: { rawValue } }`
5. Do not special-case `source.type`, `scoped_paths`, `context_lines`, `story_path`, `project_context`, or any other business field name in this function.
6. Change `submitWorkflowForm(...)` to this exact signature:

```ts
export async function submitWorkflowForm(
	workflowForm: ClineWorkflowForm,
	action: WorkflowFormAction,
	values: Record<string, string> = {},
)
```

7. Update `submitWorkflowForm(...)` so it calls:
   - `TaskServiceClient.submitWorkflowForm(buildWorkflowFormSubmissionRequest(workflowForm, action, values))`
8. In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L134-L160), replace the current typed-value restoration helpers so:
   - `createWorkflowFormInputValues(...)` returns `value.rawValue ?? ""`
   - `isWorkflowFormFieldRequiredValueValid(...)` uses `field.valueSchema.type` plus the existing `field.control` to validate:
     - `integer` => base-10 integer text only
     - `array` / `object` => any non-empty trimmed textarea content
     - everything else => non-empty trimmed content
9. Keep the staged submit-disable rules exactly as they are today:
   - `select_source` validates only source-selection fields
   - `collect_inputs` / `retry_error` validate only concrete fields
10. In [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L1588-L1734), update every workflow-form submit call so it passes the full `workflowForm` object into `submitWorkflowForm(...)`.
11. Do not change the existing staged workflow-form card structure or button labels in this step.
12. In [useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx#L245-L340), update the existing workflow-form submission tests so they pass a `workflowForm` fixture into `submitWorkflowForm(...)` and assert `rawValue` payloads instead of `stringValue` / `stringArrayValue` / `integerValue`.
13. Add one new `useMessageHandlers` regression named `"submits workflow-form fields generically without field-name transport mapping"` using a `workflowForm` fixture whose current page fields contain:
   - `source.type` with enum-string schema
   - `review_input` with string schema
   - `context_lines` with integer schema
   and assert all three are submitted through `rawValue`
14. Add one new `useMessageHandlers` regression named `"submits confirm answers without depending on field definitions"` that passes a confirm-phase `workflowForm` and asserts the request contains exactly `{ key: "confirm", value: { rawValue: "yes" } }`.
15. In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L40-L115), update the workflow-form fixture definitions so every field includes `valueSchema`.
16. In that same test file, replace all persisted `values` fixtures from `{ stringValue / integerValue / stringArrayValue }` to `{ rawValue }`.
17. Add one new `ChatRow` regression named `"prefills workflow_form inputs from raw values"` that renders a `collect_inputs` form whose persisted values contain:
   - `source.commit.rawValue = "abc1234"`
   - `context_lines.rawValue = "7"`
   and asserts those exact strings appear in the rendered inputs.

## Step 6
[ ] Run the focused verification suite and stop if any failure requires edits outside the prescribed files above.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-ui-surface/schema-driven-workflow-form-contract-action-plan.md`

Exact verification:
1. Run `npm run protos`.
2. Run:

```bash
npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/task/workflow-form/__tests__/schema.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts --exit
```

3. Run:

```bash
cd webview-ui && npx vitest run src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx src/components/chat/ChatRow.test.tsx
```

4. Run `npm run check-types`.
5. If any command fails because the implementation needs a file change not explicitly listed in the relevant prior step, stop and ask for input instead of broadening the fix.
