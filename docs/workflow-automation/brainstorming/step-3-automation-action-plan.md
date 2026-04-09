---
title: Brainstorming Step 3 Automation Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - The action-plan file itself may be edited only to update the current step checkbox.
  - Do not make edits outside the allowed-files list for the current step.
  - If any ambiguity is discovered, or any code/test/doc/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - Use `apply_patch` for all non-generated file edits.
---

# Brainstorming Step 3 Automation Action Plan

## Goal

Implement the runtime-owned Step 3 automation for `brainstorming.md` so the system can:

- intercept `brainstorming.md` Step 3 before an ordinary AI turn
- show a single-page workflow form
- collect one required long-form `topic` submission through a large textarea
- invoke `capture_brainstorming_topic` through the existing workflow-form execution path
- overwrite only the `## Topic` section body in `{output_file}`
- preserve the rest of the brainstorming session artifact unchanged

This plan covers only the Step 3 workflow-form and file-write slice. It does not add deterministic Step 3 progression, Step 4 automation, contextual tool-matrix rollout, or workflow-source edits under `/Users/robertboston/Documents/Cline/Workflows/`.

## Locked Decisions

- Action-plan filename: `step-3-automation-action-plan.md`
- Tool id/name: `capture_brainstorming_topic`
- Workflow-form resolver id: `brainstorming_step_3_capture_topic`
- Shared helper file: `src/shared/capture-brainstorming-topic.ts`
- Prompt-tool file: `src/core/prompts/system-prompt/tools/capture_brainstorming_topic.ts`
- Handler file: `src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts`
- Single workflow-form parameter key: `topic`
- Step 3 form title: `What topics and/or goals would you like to focus on for this brainstorming session?`
- Step 3 form guidance text: `Be as detailed as you can- we'll worry about formatting later!`
- Step 3 field label: `Topic and Goals`
- Step 3 field help text: `""`
- Workflow-form field presentation contract: `presentation?: { textareaSize?: "default" | "large" }`
- Step 3 field presentation value: `presentation: { textareaSize: "large" }`
- Workflow-form dictionary title: `Brainstorming Topic Reference`
- Tool success result contract: `{"persisted":true,"artifact_path":"<absolute path>","topic_captured":true}`
- Re-run behavior: replace the entire existing `## Topic` body with the latest submitted `topic` value
- Prompt-surface scope: mirror the code-review system-run backend tools by registering `capture_brainstorming_topic` as an ordinary prompt tool with no prompt-layer workflow gating, include it in the same family of variant `.tools(...)` allowlists, and use the contextual native-tool matrix only for step-specific native filtering

## Source Of Truth

Treat these as authoritative for this slice:

- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/brainstorming/step-3-automation-requirements.md`
- `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md`
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-brainstorming/template.md`

The “Ideally this does not present a workflow form...” note in `enablement-tracker.md` is stale for this slice. Do not align implementation to that note.

## Scope Guard

- Do not edit `/Users/robertboston/Documents/Cline/Workflows/**`.
- Do not edit `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/brainstorming/enablement-tracker.md`.
- Do not edit `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`.
- Do not edit `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/**` except for the Step 2 `capture_brainstorming_topic` allowlist additions prescribed below.
- Do not edit `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts` except for the Step 2 native-tool exposure change prescribed below.
- Do not edit `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts` except for the Step 2 native compact-description change prescribed below.
- Do not edit `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`.
- Do not add Step 3 topic text to workflow placeholder state.
- Do not append or merge into `## Topic`; replace the section body deterministically.
- Do not broaden schema-derived control inference for all string fields; Step 3 must declare its textarea field explicitly in the resolver.

## Step 1
[x] Sync the Step 3 requirements document to the approved implementation contract before any code work begins.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/brainstorming/step-3-automation-requirements.md`

Exact edits:
1. In `step-3-automation-requirements.md` at lines 15-23, remove the current non-requirement that says the large-textarea property name is intentionally unfixed.
2. In `step-3-automation-requirements.md` under `### 6. Long-form textarea presentation` at lines 116-126, replace the final paragraph with this exact contract:

```md
The workflow-form field-definition contract must support this exact optional property on `WorkflowFormFieldDefinition`:

`presentation?: { textareaSize?: "default" | "large" }`
```

3. Immediately after `### 5. Field type` in `step-3-automation-requirements.md`, add the exact field identity contract:
   - field key: `topic`
   - field label: `Topic and Goals`
   - field help: empty string
4. In the `## Tool Contract Requirements` section at lines 150-169, add the exact input-model statement that `capture_brainstorming_topic` accepts one required string parameter named `topic`.
5. In the `## Workflow Form Requirements` section, add the exact dictionary-title requirement:
   - `Brainstorming Topic Reference`
6. In the `## Output File Requirements` section at lines 202-216, add the exact overwrite rule:
   - reruns replace the full existing `## Topic` section body
   - reruns do not append or merge with previous Step 3 content
7. In the failure/success contract area near the end of the file, add the exact tool result contract:

```md
On success, `capture_brainstorming_topic` returns:

`{"persisted":true,"artifact_path":"<absolute path>","topic_captured":true}`
```

8. Do not edit any other brainstorming docs in this step.

## Step 2
[x] Add the Step 3 tool identity, shared workflow-step helpers, prompt-tool registration, and workflow-form dictionary support for `capture_brainstorming_topic`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/capture-brainstorming-topic.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/capture_brainstorming_topic.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/**`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`

Exact edits:
1. In `src/shared/tools.ts` at lines 38-46, insert a new enum member immediately after `PREPARE_BRAINSTORMING_SESSION = "prepare_brainstorming_session",`:

```ts
	CAPTURE_BRAINSTORMING_TOPIC = "capture_brainstorming_topic",
```

2. Create `src/shared/capture-brainstorming-topic.ts` with exactly these exports:
   - `CAPTURE_BRAINSTORMING_TOPIC_WORKFLOW_STEPS = { "brainstorming.md": [3] } as const`
   - `CAPTURE_BRAINSTORMING_TOPIC_TITLE = "What topics and/or goals would you like to focus on for this brainstorming session?"`
   - `CAPTURE_BRAINSTORMING_TOPIC_PROMPT = "Be as detailed as you can- we'll worry about formatting later!"`
   - `CAPTURE_BRAINSTORMING_TOPIC_FIELD_KEY = "topic"`
   - `CAPTURE_BRAINSTORMING_TOPIC_FIELD_LABEL = "Topic and Goals"`
   - `CAPTURE_BRAINSTORMING_TOPIC_TOOL_DICTIONARY_TITLE = "Brainstorming Topic Reference"`
   - `normalizeCaptureBrainstormingTopicWorkflowName(workflowName?: string)` that accepts `brainstorming.md` and `brainstorming`
   - `isCaptureBrainstormingTopicStep(workflowName?: string, stepNumber?: number): boolean`
3. Create `src/core/prompts/system-prompt/tools/capture_brainstorming_topic.ts` by mirroring the structure of `src/core/prompts/system-prompt/tools/build_review_input.ts` lines 1-16, but use:
   - `id = ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC`
   - `name: "capture_brainstorming_topic"`
   - `description: "Capture the runtime-owned brainstorming Step 3 topic text. Resolve {output_file} from workflow state, replace only the body of the canonical ## Topic section with the submitted long-form topic/goals text, preserve the rest of the brainstorming template unchanged, and persist the updated artifact."`
   - one required string parameter:
     - `name: "topic"`
     - `required: true`
     - `description: "Long-form raw topic/goals text captured from the Step 3 workflow form."`
     - `instruction: "Provide the raw Step 3 topic/goals text exactly as collected from the workflow form."`
4. In `src/core/prompts/system-prompt/tools/init.ts` at lines 1-40, add:

```ts
import { capture_brainstorming_topic_variants } from "./capture_brainstorming_topic"
```

Then, in `allToolVariants` at lines 50-89, insert `...capture_brainstorming_topic_variants,` immediately after `...prepare_brainstorming_session_variants,`.
5. In `src/core/prompts/system-prompt/spec.ts`, inside `getNativeToolDescription(...)` at lines 468-520, add a new `case "capture_brainstorming_topic":` immediately after `case "select_target_epic":` that returns exactly:

```ts
"Capture the runtime-owned brainstorming Step 3 topic text. Resolve {output_file} from workflow state, replace only the body of the canonical ## Topic section with the submitted long-form topic/goals text, preserve the rest of the brainstorming template unchanged, and persist the updated artifact."
```

6. In each of these variant config files:
   - `src/core/prompts/system-prompt/variants/devstral/config.ts`
   - `src/core/prompts/system-prompt/variants/gemini-3/config.ts`
   - `src/core/prompts/system-prompt/variants/generic/config.ts`
   - `src/core/prompts/system-prompt/variants/glm/config.ts`
   - `src/core/prompts/system-prompt/variants/gpt-5/config.ts`
   - `src/core/prompts/system-prompt/variants/hermes/config.ts`
   - `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
   - `src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
   - `src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
   - `src/core/prompts/system-prompt/variants/next-gen/config.ts`
   - `src/core/prompts/system-prompt/variants/trinity/config.ts`
   - `src/core/prompts/system-prompt/variants/xs/config.ts`
   add:

```ts
ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC,
```

   immediately after the existing:

```ts
ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION,
```

   so `capture_brainstorming_topic` is variant-exposed with the same ordinary prompt-tool configuration style used by the code-review backend tools.
7. In `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`:
   - add a new `PlaceholderToolBundle` union member immediately after `"TECH_SPEC_DOCUMENT_BUILD"`:

```ts
| "BRAINSTORMING_TOPIC_CAPTURE"
```

   - add a new `PLACEHOLDER_BUILTIN_BUNDLE_TOOLS` entry immediately after `TECH_SPEC_DOCUMENT_BUILD`:

```ts
BRAINSTORMING_TOPIC_CAPTURE: [ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC],
```

   - in the `"brainstorming.md"` row, Step 3 only, append `"BRAINSTORMING_TOPIC_CAPTURE"` immediately after `"DOC_WRITE"`
   - do not change any other workflow row
8. In `src/core/task/workflow-form/dictionaries/systemDictionary.ts`:
   - add `"topic"` to `WORKFLOW_START_SYSTEM_DICTIONARY_KEYS` immediately after `"time",`
   - add a new `workflowFormSystemDictionary.topic` entry immediately after `time` and before `title` with exactly:

```ts
topic: {
	label: "The main focus area for this brainstorming session",
	medium: "The topic and/or goals you provide are added to the brainstorming document before GPT invocation",
	long: "",
	examples: [],
	contextTags: ["topic"],
}
```

9. In `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`:
   - add a new exported config constant named `captureBrainstormingTopicToolDictionaryConfig`
   - set `toolName: ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC`
   - set `heading: "## capture_brainstorming_topic"`
   - set `runtimeTitle: "Brainstorming Topic Reference"`
   - set `overviewLines` to exactly:

```ts
["This form gathers your input regarding the topic for this brainstorming session and adds it to the brainstorming document before invoking the AI Agent."]
```

   - set `parameterDescriptions` to exactly:

```ts
{
	topic: workflowFormSystemDictionary.topic.medium,
}
```

   - set `termKeys: ["topic"]`
10. In `src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`, add one new test immediately after the existing “renders any configured tool” test at lines 39-58 that calls `buildRuntimeToolDictionaryMarkdownFromConfig(captureBrainstormingTopicToolDictionaryConfig)` and asserts the markdown equals exactly:

```md
## capture_brainstorming_topic

This form gathers your input regarding the topic for this brainstorming session and adds it to the brainstorming document before invoking the AI Agent.

### Parameters

- `topic` (required, string): The topic and/or goals you provide are added to the brainstorming document before GPT invocation

### Term Reference

- `topic`: The main focus area for this brainstorming session. The topic and/or goals you provide are added to the brainstorming document before GPT invocation
```
11. In `src/core/prompts/system-prompt/__tests__/spec.test.ts`:
   - add the import for `capture_brainstorming_topic_variants` beside the existing workflow-owned tool imports near the top of the file
   - add one new test immediately after the existing `build_review_input globally available without workflow gating` test at lines 350-353 asserting:

```ts
const tool = capture_brainstorming_topic_variants[0]
expect(tool.contextRequirements).to.equal(undefined)
```

   - add one native/minimal prompt test immediately after the existing `compacts native build_review_input descriptions and parameter text` test at lines 1119-1137 asserting the compact OpenAI/native tool description for `capture_brainstorming_topic` equals exactly:

```text
Capture the runtime-owned brainstorming Step 3 topic text. Resolve {output_file} from workflow state, replace only the body of the canonical ## Topic section with the submitted long-form topic/goals text, preserve the rest of the brainstorming template unchanged, and persist the updated artifact.
```

   - and asserting the only exposed property key is `topic`
12. In `src/core/prompts/system-prompt/__tests__/integration.test.ts`:
   - update the existing broad native-tool assertions near lines 470-475 and 492-498 so they also require `capture_brainstorming_topic` in the native tool list alongside `build_review_diff_output`, `build_review_input`, and `build_epics_document`
   - add one new native-tool filtering test immediately after the existing `pi-planning step 2` native filter coverage at lines 1575-1590 that runs with:
   - `enableNativeToolCalls: true`
   - `useMinimalGptPrompt: true`
   - `activeWorkflowSupportsPlaceholders: true`
   - `managedWorkflowActive: false`
   - `activePlaceholderWorkflowName: "brainstorming.md"`
   - `activePlaceholderWorkflowStepNumber: 3`
   - assert `capture_brainstorming_topic` is included in the native tool list
   - assert `capture_brainstorming_topic` is not included when the same test context is rerun for Step 2
13. Refresh only the affected prompt snapshot files under `src/core/prompts/system-prompt/__tests__/__snapshots__/` that fail because `capture_brainstorming_topic` is now exposed with the same ordinary prompt-tool configuration style as the code-review backend tools. Do not edit unrelated snapshots.
14. Do not edit any prompt-variant files beyond the exact `.tools(...)` insertions prescribed above.

## Step 3
[x] Add the field-level large-textarea contract and the renderer support without changing default textarea behavior.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`

Exact edits:
1. In `src/shared/ExtensionMessage.ts` at lines 406-417, introduce a new field-level presentation type immediately before `WorkflowFormFieldDefinition`:

```ts
export interface WorkflowFormFieldPresentation {
	textareaSize?: "default" | "large"
}
```

Then add:

```ts
	presentation?: WorkflowFormFieldPresentation
```

to `WorkflowFormFieldDefinition` immediately after `visible?: boolean`.
2. In `webview-ui/src/components/chat/ChatRow.tsx` at lines 898-906, replace the hard-coded textarea class string with a branch that:
   - keeps the existing default class `min-h-24 ...` when `field.presentation?.textareaSize !== "large"`
   - uses `min-h-48 ...` when `field.presentation?.textareaSize === "large"`
   - leaves every non-textarea control unchanged
3. In `webview-ui/src/components/chat/ChatRow.test.tsx`, add one new test immediately after the existing “prefills workflow_form inputs from raw values” test at lines 701-713 that renders a `workflow_form` textarea field with:

```ts
presentation: { textareaSize: "large" }
```

and asserts the rendered `<textarea>` has the `min-h-48` class.
4. In the same file, add one second test immediately after that new test which renders the same textarea field without `presentation` and asserts the rendered `<textarea>` still has `min-h-24`.

## Step 4
[x] Add the Step 3 workflow-form resolver and the content-aware trigger that intercepts until `## Topic` is populated.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`

Exact edits:
1. In `src/core/task/workflow-form/WorkflowFormRegistry.ts`:
   - add the new imports for `captureBrainstormingTopicToolDictionaryConfig`, `buildRuntimeToolDictionaryMarkdownFromConfig`, and the shared Step 3 constants near lines 1-18
   - export `BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID = "brainstorming_step_3_capture_topic"` immediately after `BRAINSTORMING_STEP_2_SELECT_SESSION_RESOLVER_ID` at lines 30-35
2. In the same file, add a new resolver entry immediately after the existing Step 2 brainstorming resolver at lines 705-773 with this exact behavior:
   - `id: BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID`
   - `toolName: ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC`
   - `defaultInitialPhase: "collect_inputs"`
   - `buildDefinition()` returns:
     - `title: CAPTURE_BRAINSTORMING_TOPIC_TITLE`
     - `toolDictionaryTitle: CAPTURE_BRAINSTORMING_TOPIC_TOOL_DICTIONARY_TITLE`
     - `toolDictionaryMarkdown: buildRuntimeToolDictionaryMarkdownFromConfig(captureBrainstormingTopicToolDictionaryConfig)`
     - `pages.collect_inputs.prompt: CAPTURE_BRAINSTORMING_TOPIC_PROMPT`
     - `pages.collect_inputs.fields` is exactly one manually declared field:
       - `key: "topic"`
       - `label: "Topic and Goals"`
       - `help: ""`
       - `control: "textarea"`
       - `valueSchema: { type: "string" }`
       - `required: true`
       - `visible: true`
       - `presentation: { textareaSize: "large" }`
     - `pages.collect_inputs.submitLabel: "Submit"`
     - `pages.collect_inputs.cancelLabel: "Cancel"`
     - `pages.retry_error` reuses the same prompt and same single field, with:
       - `submitLabel: "Submit"`
       - `cancelLabel: "Cancel"`
       - `retryLabel: "Start Over"`
     - `successMessage: "The brainstorming session topic is ready."`
   - `buildToolExecutionFailureFallbackMessage()` returns:

```ts
"The workflow form could not store the brainstorming session topic. Review the topic text and try again."
```

   - `buildToolExecutionRequest(_session, values)` returns:
     - `toolName: ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC`
     - `toolInput: { topic: values.topic?.rawValue ?? "" }`
     - `toolParams: { topic: values.topic?.rawValue ?? "" }`
   - `evaluateToolExecutionResult(session, args)` succeeds only when:
     - `parsed?.persisted === true`
     - `parsed?.topic_captured === true`
     - `typeof parsed?.artifact_path === "string"`
   - for failure text, use the same pattern as the existing interactive resolvers and do not set `fallbackToAgent`
3. In `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`, add four tests immediately after the existing Step 2 brainstorming resolver tests at lines 35-168:
   - resolver metadata test asserting id `brainstorming_step_3_capture_topic` and tool name `capture_brainstorming_topic`
   - definition test asserting:
     - exact title
     - exact prompt
     - exact dictionary title
     - one field only
     - field key `topic`
     - field control `textarea`
     - empty help
     - `presentation` equals `{ textareaSize: "large" }`
   - request-serialization test asserting a multiline raw value such as `"Line one\n\nLine two"` is forwarded unchanged into both `toolInput.topic` and `toolParams.topic`
   - success-evaluation test asserting the JSON result `{"persisted":true,"artifact_path":"/tmp/brainstorming.md","topic_captured":true}` returns `{ succeeded: true }`
4. In `src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`:
   - import `fs/promises`
   - import `BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID`
   - leave `shouldInterceptUntilCurrentTaskArtifactExists()` unchanged for the existing file-existence triggers
   - add a new helper immediately after it that:
     - resolves `{output_file}` from merged placeholder workflow state
     - returns `true` if `output_file` is missing
     - returns `true` if the resolved file path lacks a current-task write proof
     - returns `true` if the file does not exist
     - reads the file and extracts the body between `## Topic` and the next level-2 heading
     - returns `true` when that extracted body is empty or whitespace-only
     - returns `false` when that extracted body contains non-whitespace content
   - add a new registry row immediately after the Step 2 brainstorming-related rows:
     - `workflowName: "brainstorming.md"`
     - `stepNumber: 3`
     - `resolverId: BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID`
     - `shouldIntercept` delegates to the new helper
5. In `src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`, add:
   - one mapping test immediately after the quick-spec mapping test at lines 277-281 asserting `brainstorming.md` Step 3 maps to `brainstorming_step_3_capture_topic`
   - one test asserting interception is `true` when `output_file` is missing
   - one test asserting interception is `true` when the file exists and has a current-task write proof but the canonical `## Topic` section is empty
   - one test asserting interception is `false` when the file exists, has a current-task write proof, and the `## Topic` section contains non-empty text
   - one test asserting interception is `true` when the file contains non-empty topic text but the current task has no write proof for that file

## Step 5
[x] Implement `capture_brainstorming_topic` as the workflow-owned file mutator and register it everywhere the runtime expects a file-edit tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`

Exact edits:
1. Create `src/core/task/tools/handlers/CaptureBrainstormingTopicToolHandler.ts` by following the structural pattern in:
   - `PrepareBrainstormingSessionToolHandler.ts` lines 33-70 for active-step and placeholder resolution
   - `BuildEpicDeliverySpecToolHandler.ts` lines 20-55 and 119-280 for atomic file replacement, approval flow, write proof recording, cache invalidation, and JSON success results
2. In that new handler file, implement these exact behaviors:
   - `readonly name = ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC`
   - `getDescription()` returns `[capture_brainstorming_topic]`
   - reject use outside active `brainstorming.md` Step 3 with:

```ts
"capture_brainstorming_topic can only be used while brainstorming.md Step 3 is the active placeholder workflow context."
```

   - require a non-empty `topic` parameter after trimming, with:

```ts
"capture_brainstorming_topic requires a non-empty 'topic' value."
```

   - require `{output_file}` from merged placeholder state, with:

```ts
"Could not resolve workflow placeholder 'output_file' from the active placeholder workflow state."
```

   - if the resolved file cannot be read, return:

```ts
`Could not read the resolved output_file at ${outputFilePath}.`
```

   - if the file does not contain the canonical `## Topic` section, return:

```ts
"The resolved brainstorming session output file does not contain the canonical '## Topic' section."
```

   - replace the body between `## Topic` and the next level-2 heading with the submitted `topic` text
   - preserve everything outside that section byte-for-byte except the replaced body and the necessary newline boundary around the inserted section content
   - run the standard editable-file approval path against `outputFilePath`
   - run the pre-tool hook before writing
   - write atomically
   - record and persist a placeholder-workflow write proof for `outputFilePath`
   - set `config.taskState.didEditFile = true`
   - delete the lowercase `outputFilePath` key from `config.taskState.fileReadCache`
   - do not call `persistWorkflowPlaceholderValues`
   - return:

```ts
formatResponse.toolResult(
	JSON.stringify({ persisted: true, artifact_path: outputFilePath, topic_captured: true }),
)
```

3. In `src/core/task/tools/ToolExecutorCoordinator.ts`:
   - add the new import beside the existing workflow-owned handler imports near lines 11-45
   - add a `toolHandlersMap` entry immediately after `PREPARE_BRAINSTORMING_SESSION` at lines 130-139:

```ts
[ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC]: (_v: ToolValidator) => new CaptureBrainstormingTopicToolHandler(),
```

4. In `src/core/task/tools/response/ResponseToolRegistry.ts` at lines 60-97, add:

```ts
[ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC]: undefined,
```

immediately after the existing brainstorming Step 2 workflow-owned entry.
5. In `src/core/task/tools/autoApprove.ts`, add `ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC` to every edit-files switch cluster that already contains:
   - `BUILD_REVIEW_DIFF_OUTPUT`
   - `BUILD_REVIEW_INPUT`
   - `BUILD_EPIC_DELIVERY_SPEC`
   - `BUILD_STORY_DOCUMENT`
   - `BUILD_TECH_SPEC_DOCUMENT`
6. In `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`, add a new `capture_brainstorming_topic` block immediately after the existing `build_epic_delivery_spec` tests at lines 2660-2962:
   - create a brainstorming temp repo fixture whose output file contains the canonical headings from `.cline/skills/bmad-brainstorming/template.md`
   - success test:
     - active workflow `brainstorming.md`
     - checklist with Step 3 unchecked
     - `activePlaceholderWorkflowValues.output_file` points at the artifact
     - tool params include a multiline `topic`
     - assert returned JSON contains `persisted: true`, `artifact_path`, and `topic_captured: true`
     - assert `## Topic` contains the submitted text
     - assert `## Selected Approach`, `## Selected Techniques`, `### Techniques Used`, and `## Ideas Generated` remain present
     - assert write proof, `didEditFile`, and file-read-cache invalidation all occur
   - wrong-workflow-step rejection test:
     - active workflow `brainstorming.md`
     - active checklist/current step set to Step 2 instead of Step 3
     - valid `output_file` and valid `topic`
     - assert the returned error text equals exactly:

```text
capture_brainstorming_topic can only be used while brainstorming.md Step 3 is the active placeholder workflow context.
```

   - empty-topic rejection test:
     - active workflow `brainstorming.md`
     - active Step 3 context
     - `toolParams.topic` is whitespace-only
     - assert the returned error text equals exactly:

```text
capture_brainstorming_topic requires a non-empty 'topic' value.
```

   - missing-`output_file` failure test with the exact approved error
   - unreadable-`output_file` failure test:
     - active workflow `brainstorming.md`
     - active Step 3 context
     - `activePlaceholderWorkflowValues.output_file` points to a nonexistent file path
     - assert the returned error text equals:

```text
Could not read the resolved output_file at ${outputFilePath}.
```

   - missing-`## Topic` heading failure test with the exact approved error
   - overwrite test proving a preexisting `## Topic` body is replaced, not appended

## Step 6
[x] Add end-to-end workflow-form regressions for the pre-turn Step 3 intercept and the workflow-form tool execution bridge.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, add one new chain test immediately after the existing code-review three-stage chaining test at lines 2550-2733.
2. That new test must prove this exact pre-turn behavior:
   - active workflow source is `brainstorming.md`
   - checklist has Step 1 and Step 2 complete, Step 3 incomplete
   - `activePlaceholderWorkflowValues.output_file` points to a real artifact on disk whose `## Topic` section is empty
   - `activePlaceholderWorkflowTaskWriteProofPaths` contains that artifact path
   - `workflowFormRuntime.createSession` is called once with:
     - `resolverId: "brainstorming_step_3_capture_topic"`
     - `triggerSource: "deterministic_workflow_progression"`
     - `owner.workflowName: "brainstorming.md"`
     - `owner.stepNumber: 3`
     - `initialPhase: "collect_inputs"`
   - `renderWorkflowFormMessage` first renders an interactive `ask` payload
   - the pending workflow-form outcome invokes `capture_brainstorming_topic`
   - after the fake tool execution succeeds, the loop exits before any ordinary AI turn
3. In the same file, add one direct `executeWorkflowFormToolAndSync` test immediately after the existing native diff workflow-form execution test at lines 3292-3305 that invokes:
   - `toolName: "capture_brainstorming_topic"`
   - `toolInput: { topic: "Line one\n\nLine two" }`
   - `toolParams: { topic: "Line one\n\nLine two" }`
   - `session.resolverId: "brainstorming_step_3_capture_topic"`
   - assert the synthetic workflow-form native call id uses the session id
   - assert the returned evaluation equals exactly:

```ts
{
	succeeded: true,
	errorMessage: '{"persisted":true,"artifact_path":"/tmp/brainstorming-session.md","topic_captured":true}',
	fallbackToAgent: false,
}
```

     when the tool result content is `{"persisted":true,"artifact_path":"/tmp/brainstorming-session.md","topic_captured":true}`
4. In the same file, add one failure-path `executeWorkflowFormToolAndSync` test immediately after that success test asserting the Step 3 workflow form stays in failure state when the tool result text is:

```text
Error: The resolved brainstorming session output file does not contain the canonical '## Topic' section.
```

and that the returned `errorMessage` matches that exact string.

## Final Pass
[x] Perform the string-contract and scope audit before implementation is declared complete.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/brainstorming/step-3-automation-action-plan.md`

Exact checks:
1. Read this action plan top to bottom and confirm every prescribed string contract is used consistently:
   - `capture_brainstorming_topic`
   - `brainstorming_step_3_capture_topic`
   - `topic`
   - `Topic and Goals`
   - `Brainstorming Topic Reference`
   - `presentation?: { textareaSize?: "default" | "large" }`
   - `topic_captured`
2. Confirm every step stays within the Step 3 workflow-form slice and does not drift into:
   - deterministic progression
   - Step 4 technique selection
   - contextual tool matrix or variant allowlists
   - workflow-source edits under `/Users/robertboston/Documents/Cline/Workflows/`
3. Confirm the plan never tells the implementation agent to persist topic text into workflow placeholder state.
4. Confirm the plan never tells the implementation agent to append or merge into `## Topic`.
5. If any inconsistency, missing registration point, or undeclared file change is found during this audit, stop and ask for input before implementing.
