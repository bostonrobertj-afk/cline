---
title: Backend Workflow Tool Contract Realignment Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After completing a step, change that step's checkbox from "[ ]" to "[x]".
  - Do not begin the next step until the current step is fully complete and verified.
  - If any ambiguity, mismatch, or unprescribed change is discovered, stop and ask the user before proceeding.
  - Do not make decisions that are not explicitly prescribed in this document.
---

# Backend Workflow Tool Contract Realignment Action Plan

This action plan implements the approved requirements in [backend-workflow-tool-contract-realignment-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prompt-tools/backend-workflow-tool-contract-realignment-requirements.md).

It realigns the locked backend-only workflow automation tools so they stop depending on prompt-tool configuration while preserving runtime behavior for:

- workflow forms
- workflow completion
- existing backend handlers
- approval behavior
- response-tool exhaustiveness

The locked backend-only migration set for this plan is:

- `build_review_input`
- `build_tech_spec_document`
- `capture_brainstorming_topic`
- `prepare_brainstorming_session`
- `select_target_epic`
- `build_epic_delivery_spec`
- `build_story_document`
- `build_epics_document`
- `code_review_spec_update`

The locked prompt-exposed tools that must remain in the prompt-tool bucket for this plan are:

- `set_workflow_placeholders`
- `build_review_diff_output`
- `workflow_progress_request`
- `complete_workflow_item`

## Step 1

- [x] Create the canonical backend workflow tool contract types and registry.

Allowed files:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContractTypes.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

Required edits:

1. Create [backendWorkflowToolContractTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/backendWorkflowToolContractTypes.ts) with the exact exports below and no additional exports:

```ts
import type { ClineDefaultTool } from "@/shared/tools"

export type BackendWorkflowToolSchemaNode = {
	type?: "string" | "boolean" | "integer" | "array" | "object"
	enum?: unknown
	const?: string | number | boolean
	items?: BackendWorkflowToolSchemaNode
	properties?: Record<string, BackendWorkflowToolSchemaNode>
	required?: string[] | boolean
	requiredProperties?: string[]
	additionalProperties?: BackendWorkflowToolSchemaNode
	oneOf?: BackendWorkflowToolSchemaNode[]
}

export interface BackendWorkflowToolParameterContract extends BackendWorkflowToolSchemaNode {
	name: string
	required: boolean
	description?: string
}

export interface BackendWorkflowToolContract {
	id: ClineDefaultTool
	name: string
	parameters: BackendWorkflowToolParameterContract[]
}
```

2. Create [backendWorkflowToolContracts.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts) with the exact registry shape below:
   - import `ClineDefaultTool` from [src/shared/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8-L55)
   - import the three contract types from the new types file
   - export `backendWorkflowToolContracts` as `Record<ClineDefaultTool, BackendWorkflowToolContract | undefined>`
   - export `getBackendWorkflowToolContract(toolName: ClineDefaultTool): BackendWorkflowToolContract | undefined`
   - export `isBackendWorkflowToolContractTool(toolName: ClineDefaultTool): boolean`

3. Populate `backendWorkflowToolContracts` with exact entries for the locked backend-only set and `undefined` for every other `ClineDefaultTool` enum member so the map stays exhaustive, matching the exhaustiveness pattern already used in [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L5-L105).

4. Use the exact contract payloads below for the backend-only entries:

```ts
[ClineDefaultTool.BUILD_REVIEW_INPUT]: {
	id: ClineDefaultTool.BUILD_REVIEW_INPUT,
	name: "build_review_input",
	parameters: [],
},
[ClineDefaultTool.BUILD_EPICS_DOCUMENT]: {
	id: ClineDefaultTool.BUILD_EPICS_DOCUMENT,
	name: "build_epics_document",
	parameters: [],
},
[ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION]: {
	id: ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION,
	name: "prepare_brainstorming_session",
	parameters: [],
},
[ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC]: {
	id: ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC,
	name: "capture_brainstorming_topic",
	parameters: [
		{
			name: "topic",
			required: true,
			type: "string",
			description: "Long-form raw topic/goals text captured from the Step 3 workflow form.",
		},
	],
},
[ClineDefaultTool.SELECT_TARGET_EPIC]: {
	id: ClineDefaultTool.SELECT_TARGET_EPIC,
	name: "select_target_epic",
	parameters: [],
},
[ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC]: {
	id: ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC,
	name: "build_epic_delivery_spec",
	parameters: [],
},
[ClineDefaultTool.BUILD_STORY_DOCUMENT]: {
	id: ClineDefaultTool.BUILD_STORY_DOCUMENT,
	name: "build_story_document",
	parameters: [],
},
[ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT]: {
	id: ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT,
	name: "build_tech_spec_document",
	parameters: [],
},
[ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE]: {
	id: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
	name: "code_review_spec_update",
	parameters: [],
},
```

5. Do not include prompt-only fields in the new contract files. Specifically do not add `variant`, `instruction`, `contextRequirements`, or prompt-native description compaction data.

Verification:

- Confirm the new registry is exhaustive across the full [ClineDefaultTool enum](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8-L55).
- Confirm the only non-`undefined` entries are the nine locked backend-only tools above.

## Step 2

- [x] Convert workflow-form schema and dictionary lookup to the unified workflow-form contract resolver.

Allowed files:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/schema.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`

Required edits:

1. In [schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts#L1-L115):
   - remove the `ClineToolSpec` import at line 2
   - add imports for `BackendWorkflowToolContract`, `BackendWorkflowToolParameterContract`, and `BackendWorkflowToolSchemaNode` from the new types file
   - add an import for `getBackendWorkflowToolContract` from the new registry file
   - keep the existing prompt imports from lines 1, 3, and 10 because prompt-exposed tools still resolve through `ClineToolSet`

2. Replace the local `WorkflowFormSchemaSource` type at [schema.ts:19-29](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts#L19-L29) with a type alias to `BackendWorkflowToolSchemaNode`.

3. Rename `resolveWorkflowFormToolSpec(...)` at [schema.ts:31-39](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts#L31-L39) to `resolveWorkflowFormToolContract(...)`.

4. Implement `resolveWorkflowFormToolContract(...)` with this exact lookup order:
   - first call `getBackendWorkflowToolContract(toolName)`
   - if it returns a contract, return it immediately
   - otherwise resolve the prompt tool from `registerClineToolSets()` and `ClineToolSet.getToolByNameWithFallback(...)`
   - if the prompt tool is still missing, throw `new Error(\`Unknown workflow-form tool contract: ${toolName}\`)`
   - adapt the resolved `tool.config` into a `BackendWorkflowToolContract` by returning:

```ts
{
	id: tool.config.id,
	name: tool.config.name,
	parameters: (tool.config.parameters ?? []).map((parameter) => ({
		name: parameter.name,
		required: parameter.required,
		description: parameter.description,
		type: parameter.type,
		enum: parameter.enum,
		const: parameter.const as string | number | boolean | undefined,
		items: parameter.items as BackendWorkflowToolSchemaNode | undefined,
		properties: parameter.properties as Record<string, BackendWorkflowToolSchemaNode> | undefined,
		requiredProperties: parameter.requiredProperties,
		additionalProperties: parameter.additionalProperties as BackendWorkflowToolSchemaNode | undefined,
		oneOf: parameter.oneOf as BackendWorkflowToolSchemaNode[] | undefined,
	})),
}
```

5. In [schema.ts:84-114](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts#L84-L114):
   - change the local `tool` variable to come from `resolveWorkflowFormToolContract(toolName)`
   - keep the parameter lookup logic exactly the same

6. In [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L1-L149):
   - remove the `ClineToolSpec` import at line 1
   - rename `resolveWorkflowFormToolSpec` import at line 3 to `resolveWorkflowFormToolContract`
   - import `BackendWorkflowToolContract` from the new types file
   - rename `WorkflowFormToolDictionaryConfig` to `WorkflowFormToolDictionaryContractConfig`
   - update every reference to that interface in the file
   - change `buildToolDictionaryEntryLines(..., tool: ClineToolSpec)` at line 24 to `tool: BackendWorkflowToolContract`
   - change both runtime lookups at lines 135 and 148 to call `resolveWorkflowFormToolContract(...)`

7. Do not change any of the dictionary markdown text, headings, or parameter-description strings in this step.

Verification:

- Confirm [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts) no longer imports prompt `ClineToolSpec`.
- Confirm [schema.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/schema.ts) exposes `resolveWorkflowFormToolContract(...)` and no longer exposes `resolveWorkflowFormToolSpec(...)`.

## Step 3

- [x] Repoint workflow-form runtime callers and existing tests to the new contract terminology and backend registry behavior.

Allowed files:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts`

Required edits:

1. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L231-L250):
   - update the import near line 33 from `resolveWorkflowFormToolSpec` to `resolveWorkflowFormToolContract`
   - change `const tool = resolveWorkflowFormToolSpec(args.toolName)` at line 237 to `const tool = resolveWorkflowFormToolContract(args.toolName)`
   - keep the rest of `buildSchemaDerivedPublicToolFieldDefinitions(...)` unchanged

2. In [schema.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts#L12-L66):
   - keep the existing `set_workflow_placeholders` and `build_review_diff_output` assertions
   - insert a new test immediately after the `build_review_diff_output context_lines` test asserting that `resolveWorkflowFormSchema(ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC, { parameterName: "topic" })` resolves to `{ type: "string" }`

3. In [buildToolDictionary.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts#L40-L59):
   - rename the test title at line 40 from `"renders any configured tool by looking up its schema through the shared tool registry"` to `"renders any configured tool by looking up its schema through the workflow-form contract resolver"`
   - keep the existing assertions in that test unchanged
   - insert a new test after line 59 asserting that `buildRuntimeToolDictionaryMarkdownFromConfig(captureBrainstormingTopicToolDictionaryConfig)` still renders `- \`topic\` (required, string):`

4. In [workflowCompletionHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts#L1-L78):
   - import `getBackendWorkflowToolContract` from the new registry file
   - insert a new production-contract test immediately after the existing production mapping test at lines 22-28
   - assert that `getBackendWorkflowToolContract(ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE)` deep-equals:

```ts
{
	id: ClineDefaultTool.CODE_REVIEW_SPEC_UPDATE,
	name: "code_review_spec_update",
	parameters: [],
}
```

Verification:

- Confirm workflow-form tests now cover one prompt-exposed tool path and one backend-contract tool path.
- Confirm the workflow-completion test file proves that `code_review_spec_update` lives in the same backend-only bucket.

## Step 4

- [x] Remove the backend-only migration set from prompt registration, prompt variants, native compaction, and contextual gating.

Allowed files:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_review_input.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_tech_spec_document.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/capture_brainstorming_topic.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/prepare_brainstorming_session.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/select_target_epic.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_epic_delivery_spec.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_story_document.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_epics_document.ts`

Required edits:

1. In [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L3-L43):
   - delete the eight backend-only imports at lines 9, 10, 12, 13, 14, 15, 25, and 30
   - do not delete `build_review_diff_output_variants`, `complete_workflow_item_variants`, `set_workflow_placeholders_variants`, or `workflow_progress_request_variants`

2. In [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L52-L94):
   - delete these spreads from `allToolVariants`:
     - `...build_review_input_variants,`
     - `...build_epics_document_variants,`
     - `...build_epic_delivery_spec_variants,`
     - `...build_story_document_variants,`
     - `...build_tech_spec_document_variants,`
     - `...prepare_brainstorming_session_variants,`
     - `...capture_brainstorming_topic_variants,`
     - `...select_target_epic_variants,`

3. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L1-L38):
   - delete the exports at lines 7, 8, 10, 11, 12, and 25
   - also delete the exports for `prepare_brainstorming_session` and `capture_brainstorming_topic`

4. Delete these prompt-tool files entirely:
   - [build_review_input.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_input.ts)
   - [build_epics_document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_epics_document.ts)
   - [prepare_brainstorming_session.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/prepare_brainstorming_session.ts)
   - [capture_brainstorming_topic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/capture_brainstorming_topic.ts)
   - [select_target_epic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/select_target_epic.ts)
   - [build_epic_delivery_spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_epic_delivery_spec.ts)
   - [build_story_document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_story_document.ts)
   - [build_tech_spec_document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_tech_spec_document.ts)

5. In every prompt variant config listed in the allowed-files list, remove the following enum members from the workflow-tool cluster and keep the remaining order unchanged:
   - `ClineDefaultTool.BUILD_REVIEW_INPUT`
   - `ClineDefaultTool.BUILD_EPICS_DOCUMENT`
   - `ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION`
   - `ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC`
   - `ClineDefaultTool.SELECT_TARGET_EPIC`
   - `ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC`
   - `ClineDefaultTool.BUILD_STORY_DOCUMENT`
   - `ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT`

6. In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L482-L501), delete the native-description `case` branches for:
   - `build_review_input`
   - `build_epics_document`
   - `build_epic_delivery_spec`
   - `build_story_document`
   - `build_tech_spec_document`
   - `select_target_epic`
   - `capture_brainstorming_topic`
   - do not delete the `workflow_progress_request`, `set_workflow_placeholders`, or `build_review_diff_output` branches

7. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L3-L61):
   - remove these bundle names from `PlaceholderToolBundle`:
     - `EPICS_BUILD`
     - `TARGET_EPIC_SELECT`
     - `EPIC_DELIVERY_SPEC_BUILD`
     - `STORY_DOCUMENT_BUILD`
     - `TECH_SPEC_DOCUMENT_BUILD`
     - `BRAINSTORMING_TOPIC_CAPTURE`
   - remove the matching entries from `PLACEHOLDER_BUILTIN_BUNDLE_TOOLS`

8. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L111-L427), remove only the deleted backend bundle tokens from workflow rows and preserve all remaining bundle tokens exactly:
   - `brainstorming.md` step `3`: remove `"BRAINSTORMING_TOPIC_CAPTURE"` and keep `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`
   - `create-epics.md` step `2`: remove `"EPICS_BUILD"` and keep `["DOC_READ", "DOC_WRITE"]`
   - `create-story.md` step `2`: replace `["STORY_DOCUMENT_BUILD"]` with `[]`
   - `pi-planning.md` step `2`: replace `["TARGET_EPIC_SELECT"]` with `[]`
   - `pi-planning.md` step `3`: replace `["EPIC_DELIVERY_SPEC_BUILD"]` with `[]`
   - `quick-spec.md` step `2`: replace `["TECH_SPEC_DOCUMENT_BUILD"]` with `[]`

Verification:

- Confirm no file under [src/core/prompts/system-prompt/tools](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools) still defines any tool from the locked backend-only set.
- Confirm [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts) no longer contains the removed backend bundle names.

## Step 5

- [x] Update prompt-surface tests so they stop asserting prompt exposure for backend-only workflow tools.

Allowed files:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/`

Required edits:

1. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L19-L43):
   - delete imports for:
     - `build_epic_delivery_spec_variants`
     - `build_epics_document_variants`
     - `build_review_input_variants`
     - `build_story_document_variants`
     - `build_tech_spec_document_variants`
     - `capture_brainstorming_topic_variants`
     - `prepare_brainstorming_session_variants`
     - `select_target_epic_variants`

2. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L335-L494), delete the backend-only gating tests at:
   - lines 351-354
   - lines 356-359
   - lines 361-364
   - lines 366-390
   - lines 392-416
   - lines 418-442
   - lines 444-468
   - lines 470-494
   - keep the `set_workflow_placeholders`, `build_review_diff_output`, and `workflow_progress_request` tests

3. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L1097-L1269), delete the backend-only native-compaction tests at:
   - lines 1097-1116
   - lines 1118-1137
   - lines 1139-1158
   - lines 1160-1181
   - lines 1183-1204
   - lines 1206-1227
   - lines 1229-1248
   - lines 1250-1269

4. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L469-L500):
   - keep the positive assertion for `build_review_diff_output`
   - delete the positive assertions for `build_review_input`, `build_epics_document`, and `capture_brainstorming_topic`

5. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1543-L1970):
   - `create-epics` step 2: remove `build_epics_document` from the positive include list at lines 1560-1568 and keep the remaining assertions
   - `pi-planning` step 2: replace the positive include of `select_target_epic` at line 1594 with a negative assertion that `nativeToolNames` does not include `"select_target_epic"`
   - `brainstorming` step 3: replace the positive include at line 1620 with a negative assertion that `nativeToolNames` does not include `"capture_brainstorming_topic"`, and keep the existing negative assertion for step 2
   - `pi-planning` step 3: replace the positive include of `build_epic_delivery_spec` at line 1662 with a negative assertion that `nativeToolNames` does not include `"build_epic_delivery_spec"`
   - `create-story` step 2: replace the positive include of `build_story_document` at line 1793 with a negative assertion that `nativeToolNames` does not include `"build_story_document"`
   - `quick-spec` step 2: replace the positive include of `build_tech_spec_document` at line 1964 with a negative assertion that `nativeToolNames` does not include `"build_tech_spec_document"`

6. In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L288-L608):
   - `create-epics` step 2 test:
     - remove `makeRegisteredTool(ClineDefaultTool.BUILD_EPICS_DOCUMENT)` from the fixture
     - remove `ClineDefaultTool.BUILD_EPICS_DOCUMENT` from the positive kept-id assertions
   - `pi-planning` step 2 test:
     - remove `makeRegisteredTool(ClineDefaultTool.SELECT_TARGET_EPIC)` from the fixture
     - replace the positive kept-id assertion for `ClineDefaultTool.SELECT_TARGET_EPIC` with a negative assertion
   - `pi-planning` step 3 test:
     - remove `makeRegisteredTool(ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC)` from the fixture
     - replace the positive kept-id assertion for `ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC` with a negative assertion
   - `create-story` step 2 test:
     - remove `makeRegisteredTool(ClineDefaultTool.BUILD_STORY_DOCUMENT)` from the fixture
     - replace the positive kept-id assertion for `ClineDefaultTool.BUILD_STORY_DOCUMENT` with a negative assertion
   - `quick-spec` step 2 test:
     - remove `makeRegisteredTool(ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT)` from the fixture
     - replace the positive kept-id assertion for `ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT` with a negative assertion
   - do not add a new `brainstorming.md` step 3 contextual-filter test in this file because [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1603-L1642) already covers the absence contract

7. After completing the test-source edits above, refresh the prompt/native snapshots by running this exact command and accepting only the snapshot diffs produced under [__snapshots__](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__):

```bash
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts --update-snapshots --exit
```

8. When reviewing the generated snapshot changes, confirm they only reflect the planned removal of backend-only workflow tools from prompt and native-tool surfaces, plus any resulting prompt text changes caused by that same removal.

Verification:

- Confirm no prompt-surface test imports a deleted backend-only tool module.
- Confirm prompt tests now assert absence, not presence, for the migrated backend-only tools.

## Step 6

- [x] Update the canonical docs and README so future agents classify tools into the correct bucket.

Allowed files:

- `/Users/robertboston/Documents/Cline Extension/cline/docs/tools-reference/how-to-add-a-tool.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/README.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-automation-readme.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/agent-101.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/README.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/CONTRIBUTING.md`

Required edits:

1. In [how-to-add-a-tool.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md#L14-L172):
   - rewrite `## Source Of Truth` so bucket selection is the first required decision
   - add a new first subsection that says:
     - all built-in tools start in `ClineDefaultTool`
     - prompt-exposed tools follow the prompt-tool path
     - backend-only workflow automation tools follow the runtime-owned backend contract path under `src/core/task/tools`
   - keep the existing runtime-handler, auto-approve, and response-registry guidance, but split the prompt-specific items so they apply only to prompt-exposed tools
   - add a prohibitive rule that backend-only workflow automation tools must not be added to prompt tool specs, `init.ts`, prompt variant configs, `spec.ts` native-compaction branches, or `contextualToolMatrix.ts`

2. In [system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md#L22-L181):
   - remove the backend-only migration set from the prompt-defined inventory table
   - remove them from the `Prompt-Defined Tool Families Added By Recent Workflow Enablement` section
   - expand the `Shared Tool Ids That Are Not Part Of The Normal Prompt Tool Catalog` section so it includes the full backend-only set:
     - `build_review_input`
     - `build_tech_spec_document`
     - `capture_brainstorming_topic`
     - `prepare_brainstorming_session`
     - `select_target_epic`
     - `build_epic_delivery_spec`
     - `build_story_document`
     - `build_epics_document`
     - `code_review_spec_update`
   - update the visibility notes so only the prompt-exposed workflow tools remain there

3. In [tools/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/README.md#L1-L144):
   - keep the stale `register.ts` correction
   - add one explicit scope sentence in the opening section stating that this directory is only for prompt-exposed tools and must not hold backend-only workflow automation tools
   - remove the backend-only migration set from the `Registered Tools` list
   - update `Adding New Tools` so the first instruction is to classify the tool into the prompt-exposed bucket or the backend-only workflow automation bucket before creating any file in this directory

4. In [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-automation-readme.md#L1-L219):
   - broaden the document from workflow-completion-only language to the shared backend-only workflow automation bucket
   - add a short architecture section that names the runtime-owned backend contract files in `src/core/task/tools`
   - keep the `workflowCompletionHandler` and `executeInternalToolSilently(...)` documentation, but explicitly describe them as consumers of the same backend-only bucket as workflow forms
   - add one future-guidance subsection stating that new backend-only workflow automation tools must register their contract in the backend registry, handler in `ToolExecutorCoordinator`, approval routing in `autoApprove.ts`, and exhaustiveness entry in `ResponseToolRegistry.ts`

5. In [agent-101.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-101.md#L17-L64):
   - in both `Prompt and tool surface` lists at lines 29-32 and 58-63, add [how-to-add-a-tool.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md) immediately before [src/core/prompts/system-prompt/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/README.md)
   - in the `Practical Guidance` list at lines 102-107, replace the bullet text `prompt/tool docs in docs/system-prompt-tool-reference.md and src/core/prompts/system-prompt/` with `prompt/tool bucket docs in docs/tools-reference/how-to-add-a-tool.md, docs/system-prompt-tool-reference.md, and src/core/prompts/system-prompt/`

6. In [src/core/prompts/system-prompt/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/README.md#L868-L895):
   - insert one short scope note immediately before `#### 3. Export Tool from Index`
   - the note must state that the `tools/index.ts`, `tools/init.ts`, and variant-config steps in that section apply only to prompt-exposed tools
   - the note must also direct backend-only workflow automation tools to the runtime-owned contract path documented in [docs/tools-reference/how-to-add-a-tool.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md) and [docs/workflows/workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-automation-readme.md)

7. In [src/core/prompts/system-prompt/CONTRIBUTING.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/CONTRIBUTING.md#L608-L639):
   - insert one short scope note immediately before `### Registering Tool Variants`
   - the note must state that the registration and variant-config guidance in that section is only for prompt-exposed tools
   - the note must explicitly say backend-only workflow automation tools must not be added to `tools/index.ts`, `tools/init.ts`, or prompt variant configs, and must instead follow the runtime-owned backend contract path

Verification:

- Confirm the updated docs define what belongs in each bucket going forward.
- Confirm none of the seven updated docs instruct future agents to add backend-only workflow automation tools to prompt-tool registration.

## Step 7

- [x] Run the prescribed verification commands and complete the final string-contract audit.

Allowed files:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/schema.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/schema.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/workflowCompletionHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/tools-reference/how-to-add-a-tool.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/README.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-automation-readme.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/agent-101.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/README.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/CONTRIBUTING.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContractTypes.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts`

Required verification:

1. Run these exact commands:

```bash
npm run test:unit -- src/core/task/workflow-form/__tests__/schema.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts --exit
npm run test:unit -- src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts --exit
npm run test:unit -- src/core/task/__tests__/workflowCompletionHandler.test.ts --exit
npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts --exit
npm run test:unit -- src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts --exit
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts --exit
npx tsc --noEmit
```

2. Run a string-contract audit and confirm all of the following exact names are used consistently and nowhere misspelled:
   - `BackendWorkflowToolContract`
   - `BackendWorkflowToolParameterContract`
   - `BackendWorkflowToolSchemaNode`
   - `backendWorkflowToolContracts`
   - `getBackendWorkflowToolContract`
   - `isBackendWorkflowToolContractTool`
   - `resolveWorkflowFormToolContract`
   - `WorkflowFormToolDictionaryContractConfig`

3. Run a final scope audit and confirm:
   - the locked backend-only tool set has no prompt-tool file, no `init.ts` registration, no prompt variant exposure, no native-compaction branch, and no contextual-tool bundle
   - the locked prompt-exposed tools still remain in the prompt bucket
   - workflow forms still resolve `set_workflow_placeholders` and `build_review_diff_output`
   - workflow forms also resolve backend-only contracts for `build_review_input` and `capture_brainstorming_topic`
   - `code_review_spec_update` remains runtime-only and is represented in the backend contract registry
   - prompt snapshots under `src/core/prompts/system-prompt/__tests__/__snapshots__/` were refreshed during Step 5 and the normal `integration.test.ts` run now passes without `--update-snapshots`

If any verification fails, stop and ask the user before changing scope beyond the steps above.
