---
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After completing a step, change that step's checkbox from `[ ]` to `[x]`.
  - Then read the next step in full before executing it.
  - If any ambiguity appears, or any change seems necessary that is not explicitly prescribed here, stop and ask the user before proceeding.
---

# Workflow Progress Request Action Plan

## Step 1

[x] Align the requirements document with the approved contextual-gating decision.

Allowed files:
- `docs/response-tool-modernization/workflow-progress-request/requirements.md`

Exact changes:
- In `docs/response-tool-modernization/workflow-progress-request/requirements.md` at lines 178-189, append one new verification bullet immediately after the existing `No`-branch continuation bullet: `- contextual exposure only for \`create-prd.md\` steps 3 through 14`
- In `docs/response-tool-modernization/workflow-progress-request/requirements.md`, replace the entire `## Out Of Scope` section at lines 191-199 with this exact section:

```md
## Contextual Gating Requirements

- `workflow_progress_request` must be exposed only when the active placeholder workflow is `create-prd.md`
- `workflow_progress_request` must be exposed only when the active placeholder-workflow step number is 3 through 14 inclusive
- `workflow_progress_request` must be absent for `create-prd.md` steps 1, 2, and 15
- `workflow_progress_request` must be absent from every other placeholder workflow unless a later requirements update explicitly adds that workflow

## Out Of Scope

- Replacing the existing placeholder-workflow focus-chain progression system.
- Introducing a new generic workflow-form subsystem for this capability.
- Treating the human’s `Yes` as a managed-workflow item completion signal.
- Requiring freeform human input before the runtime can branch.
```

## Step 2

[x] Add the shared tool contract, prompt-tool spec, and variant exposure.

Allowed files:
- `src/shared/tools.ts`
- `src/shared/workflow-progress-request.ts`
- `src/core/prompts/system-prompt/tools/workflow_progress_request.ts`
- `src/core/prompts/system-prompt/tools/index.ts`
- `src/core/prompts/system-prompt/tools/init.ts`
- `src/core/prompts/system-prompt/spec.ts`
- `src/core/prompts/system-prompt/variants/generic/config.ts`
- `src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `src/core/prompts/system-prompt/variants/glm/config.ts`
- `src/core/prompts/system-prompt/variants/hermes/config.ts`
- `src/core/prompts/system-prompt/variants/devstral/config.ts`
- `src/core/prompts/system-prompt/variants/trinity/config.ts`
- `src/core/prompts/system-prompt/variants/xs/config.ts`

Exact changes:
- In `src/shared/tools.ts`:
  - Add `WORKFLOW_PROGRESS_REQUEST = "workflow_progress_request",` immediately after line 11 (`SEND_USER_MESSAGE`).
  - Add `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,` immediately after line 76 in `READ_ONLY_TOOLS`.
- Create `src/shared/workflow-progress-request.ts` with these exact exports:
  - `WORKFLOW_PROGRESS_REQUEST_WORKFLOW_NAME = "create-prd.md"`
  - `WORKFLOW_PROGRESS_REQUEST_STEP_NUMBERS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const`
  - `WORKFLOW_PROGRESS_REQUEST_QUESTION = "Ready to move on to the next step in the workflow?"`
  - `WORKFLOW_PROGRESS_REQUEST_OPTIONS = ["Yes", "No"] as const`
  - `isWorkflowProgressRequestWorkflowName(workflowName?: string): boolean` returning `true` for `"create-prd.md"` and `"create-prd"`, `false` otherwise
  - `isWorkflowProgressRequestStep(stepNumber?: number): boolean` returning `true` only for 3 through 14
  - `shouldExposeWorkflowProgressRequest({ workflowName, stepNumber, yoloModeToggled }: { workflowName?: string; stepNumber?: number; yoloModeToggled?: boolean }): boolean` returning `false` when `yoloModeToggled === true`, otherwise delegating to the workflow-name and step helpers
- Create `src/core/prompts/system-prompt/tools/workflow_progress_request.ts` as a single generic `ClineToolSpec` sibling to `build_review_input.ts`:
  - `id: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST`
  - `name: "workflow_progress_request"`
  - `description: "Ask the user to confirm whether the active create-prd placeholder-workflow step is ready to advance. The runtime owns the exact Yes/No prompt and option labels. On success, this tool displays the runtime-owned prompt, returns \`[Message displayed.]\`, and ends your current turn. If the user selects \`Yes\`, the runtime completes the next placeholder-workflow step before the next model request is built. If the user selects \`No\`, the workflow does not advance and the user's reply arrives on the following turn as normal human-authored input."`
  - `contextRequirements` must call `shouldExposeWorkflowProgressRequest` with `context.activePlaceholderWorkflowName`, `context.activePlaceholderWorkflowStepNumber`, and `context.yoloModeToggled`
  - `parameters: []`
  - export as `workflow_progress_request_variants = [generic]`
- In `src/core/prompts/system-prompt/tools/index.ts`, add `export * from "./workflow_progress_request"` immediately after line 22 (`send_user_message`).
- In `src/core/prompts/system-prompt/tools/init.ts`:
  - add `import { workflow_progress_request_variants } from "./workflow_progress_request"` immediately after line 25
  - add `...workflow_progress_request_variants,` immediately after line 67 (`send_user_message_variants`)
- In `src/core/prompts/system-prompt/spec.ts`, add this exact compact native description case immediately after line 481:

```ts
		case "workflow_progress_request":
			return "Ask whether the user is ready to move to the next create-prd workflow step. The runtime owns the Yes/No prompt, and the Yes branch advances the focus chain before the next request is built."
```

- In each prompt-variant config listed below, insert `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,` immediately after the current `ClineDefaultTool.ASK,` entry:
  - `src/core/prompts/system-prompt/variants/generic/config.ts` after line 69
  - `src/core/prompts/system-prompt/variants/gpt-5/config.ts` after line 59
  - `src/core/prompts/system-prompt/variants/next-gen/config.ts` after line 64
  - `src/core/prompts/system-prompt/variants/native-next-gen/config.ts` after line 48
  - `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts` after line 71
  - `src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts` after line 64
  - `src/core/prompts/system-prompt/variants/gemini-3/config.ts` after line 59
  - `src/core/prompts/system-prompt/variants/glm/config.ts` after line 49
  - `src/core/prompts/system-prompt/variants/hermes/config.ts` after line 50
  - `src/core/prompts/system-prompt/variants/devstral/config.ts` after line 50
  - `src/core/prompts/system-prompt/variants/trinity/config.ts` after line 50
  - `src/core/prompts/system-prompt/variants/xs/config.ts` after line 49

## Step 3

[x] Align the textual system-prompt guidance with the new response-tool path.

Allowed files:
- `src/core/prompts/system-prompt/components/response_tools.ts`
- `src/core/prompts/system-prompt/components/continuation_turn.ts`
- `src/core/prompts/system-prompt/components/task_progress.ts`

Exact changes:
- In `src/core/prompts/system-prompt/components/response_tools.ts`:
  - add an import for `shouldExposeWorkflowProgressRequest`
  - add this exact line in `RESPONSE_TOOL_LINES` immediately after `ask_followup_question`:
    - `workflow_progress_request: "- \`workflow_progress_request\`: Use when the active create-prd workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing",`
  - extend `ResponseToolName` automatically through the object key
  - in both `getActModeResponseToolNames` and `getPlanModeResponseToolNames`, insert `workflow_progress_request` immediately after `ask_followup_question` when `shouldExposeWorkflowProgressRequest(...)` is `true`
- In `src/core/prompts/system-prompt/components/continuation_turn.ts`:
  - add an import for `shouldExposeWorkflowProgressRequest`
  - in `getFocusChainReminderLine`, insert this exact branch before the generic placeholder-workflow branch at lines 17-19:

```ts
	if (
		shouldExposeWorkflowProgressRequest({
			workflowName: context.activePlaceholderWorkflowName,
			stepNumber: context.activePlaceholderWorkflowStepNumber,
			yoloModeToggled: context.yoloModeToggled,
		})
	) {
		return "- When the active step's \"Done Signal\" is true, use `workflow_progress_request`. Do not include `task_progress` on that tool call; the runtime-owned `Yes` branch completes the next checklist step before the next model request is built."
	}
```

- In `src/core/prompts/system-prompt/components/task_progress.ts`:
  - add an import for `shouldExposeWorkflowProgressRequest`
  - add this exact constant immediately after `UPDATING_TASK_PROGRESS_NATIVE_GPT5`:

```ts
const UPDATING_TASK_PROGRESS_WORKFLOW_PROGRESS_REQUEST = `UPDATING TASK PROGRESS

The user has triggered a workflow with a prebuilt checklist.
- Detailed instructions are automatically sent when a checklist item first becomes the active step.
- When the active step's "Done Signal" is true, use \`workflow_progress_request\`.
- Do not include \`task_progress\` on \`workflow_progress_request\`; the runtime-owned \`Yes\` branch completes the next checklist step before the next model request is built.
- If the user selects \`No\`, continue the conversation on the next turn without advancing the workflow.`
```

  - in `getUpdatingTaskProgress`, insert this exact branch immediately before the existing placeholder-workflow branch at lines 57-59:

```ts
	if (
		shouldExposeWorkflowProgressRequest({
			workflowName: context.activePlaceholderWorkflowName,
			stepNumber: context.activePlaceholderWorkflowStepNumber,
			yoloModeToggled: context.yoloModeToggled,
		})
	) {
		return UPDATING_TASK_PROGRESS_WORKFLOW_PROGRESS_REQUEST
	}
```

## Step 4

[x] Wire the runtime handler and the contextual native-tool matrix.

Allowed files:
- `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`
- `src/core/task/tools/ToolExecutorCoordinator.ts`
- `src/core/task/tools/response/ResponseToolRegistry.ts`
- `src/shared/tools.ts`
- `src/shared/workflow-progress-request.ts`

Exact changes:
- In `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`:
  - add `"WORKFLOW_PROGRESS_REQUEST"` to the `PlaceholderToolBundle` union immediately after `"EPICS_BUILD"` at line 12
  - add `WORKFLOW_PROGRESS_REQUEST: [ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST],` immediately after the `EPICS_BUILD` bundle at line 41
  - leave `ACT_MODE_RESPONSE_TOOL_IDS` and `PLAN_MODE_RESPONSE_TOOL_IDS` unchanged at lines 74-85
  - replace the `create-prd.md` matrix row at lines 184-197 with this exact row:

```ts
		"create-prd.md": {
			1: ["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"],
			2: ["DOC_READ", "DOC_WRITE"],
			3: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			4: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			5: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			6: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			7: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			8: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			9: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			10: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			11: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			12: ["DOC_READ", "DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			13: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
			14: ["DOC_WRITE", "WORKFLOW_PROGRESS_REQUEST"],
		},
```

- Do not edit `src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts`; its existing `stepRow.flatMap(...)` logic at lines 109-115 already picks up the new bundle.
- Do not edit `src/core/task/tools/autoApprove.ts`; response tools are intentionally not auto-approved there, and `workflow_progress_request` must follow that policy.
- Create `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts` as a new response-tool handler with no tool parameters:
  - import `findLast` from `@shared/array`
  - import `ClineAsk`, `ClineAskQuestion` from `@shared/ExtensionMessage`
  - import `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL` from `@shared/focus-chain-utils`
  - import `ClineDefaultTool` from `@shared/tools`
  - import `formatResponse` from `../../../prompts/responses`
  - import `ResponseToolRuntime`
  - import `isWorkflowProgressRequestWorkflowName`, `WORKFLOW_PROGRESS_REQUEST_OPTIONS`, and `WORKFLOW_PROGRESS_REQUEST_QUESTION`
  - `handlePartialBlock` must call `uiHelpers.ask("followup" as ClineAsk, JSON.stringify({ question: WORKFLOW_PROGRESS_REQUEST_QUESTION, options: [...WORKFLOW_PROGRESS_REQUEST_OPTIONS] } satisfies ClineAskQuestion), block.partial)`
  - `getDescription` must return `[workflow_progress_request]`
  - `execute` must:
    - return `formatResponse.toolError("workflow_progress_request is unavailable while YOLO mode is enabled because no interactive user response can be collected.")` when `config.yoloModeToggled` is `true`
    - return `formatResponse.toolError("workflow_progress_request can only be used during the active create-prd placeholder workflow.")` when `isWorkflowProgressRequestWorkflowName(config.taskState.activePlaceholderWorkflowSource?.name)` is `false`
    - do not attempt step-number validation inside the handler; `TaskState` has no canonical active placeholder step-number field at `src/core/task/TaskState.ts:144-170`, so step-specific gating remains prompt-owned via `context.activePlaceholderWorkflowStepNumber`
    - return `formatResponse.toolError("workflow_progress_request requires an active placeholder-workflow focus chain checklist before it can advance the workflow.")` when `config.taskState.currentFocusChainChecklist` is falsy
    - call `responseToolRuntime.prepareForResponseDelivery(config, this.name)` before `config.callbacks.ask(...)`
    - call `config.callbacks.ask("followup", JSON.stringify(sharedMessage), false)` with the exact shared message described above
    - when the returned `text` matches `"Yes"` or `"No"`, update the last `ask === "followup"` message exactly like `AskFollowupQuestionToolHandler` does at lines 93-101
    - when `text === "Yes"`, call `config.callbacks.updateFCListFromToolResponse(FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL)` before `responseToolRuntime.queueFollowup(...)`
    - when the update result is rejected, return `formatResponse.toolError(updateResult.feedback ?? "Failed to advance the active placeholder-workflow checklist.")` and do not queue followup content
    - when the reply is freeform and not one of the two options, call `config.callbacks.say("user_feedback", text ?? "", images, followupFiles)` exactly like `AskFollowupQuestionToolHandler` does at lines 102-105
    - queue followup content with `route: "normal_user_turn"`
    - finish with `responseToolRuntime.finalizeSuccess(config, this.name)`
- In `src/core/task/tools/ToolExecutorCoordinator.ts`:
  - add the new handler import beside `SendUserMessageHandler`
  - add `[ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST]: (_v: ToolValidator) => new WorkflowProgressRequestToolHandler(),` immediately after the `SEND_USER_MESSAGE` entry at line 94
- In `src/core/task/tools/response/ResponseToolRegistry.ts`, add this exact metadata block immediately after the `SEND_USER_MESSAGE` entry:

```ts
		[ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST]: {
			toolName: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
			defaultTurnBehavior: "end_turn",
			threadDisplayStateAfterTurnEnds: ThreadDisplayStates.ACTIVE_USER,
			dismissCommandOutputAskBeforeBlockingAsk: true,
			partialMessage: {
				channel: "ask",
				type: "followup",
			},
			},
	```
- Do not add a second `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST` key anywhere else in `RESPONSE_TOOL_METADATA`; this tool must appear exactly once, as the response-tool metadata entry above.

## Step 5

[x] Add focused coverage for gating, prompt guidance, native filtering, and handler behavior.

Allowed files:
- `src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

Exact changes:
- In `src/core/prompts/system-prompt/__tests__/spec.test.ts`:
  - add `import { workflow_progress_request_variants } from "../tools/workflow_progress_request"` beside the other tool imports
  - in the `workflow placeholder tool gating` suite, add a new test immediately after line 351 that asserts:
    - `workflow_progress_request_variants[0].contextRequirements` is `true` for `create-prd.md` step 3
    - it is `false` for `create-prd.md` step 2
    - it is `false` for `create-epics.md` step 3
  - in the compact native description suite near line 857, add a new test that builds `toolSpecFunctionDefinition(workflow_progress_request_variants[0], context)` for a minimal native GPT-5 context and asserts:
    - the function description equals `Ask whether the user is ready to move to the next create-prd workflow step. The runtime owns the Yes/No prompt, and the Yes branch advances the focus chain before the next request is built.`
    - `Object.keys(getOpenAIProperties(openAI))` deep-equals `[]`
- In `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`, add a new placeholder-workflow test after line 66 for `create-prd.md` step 3 asserting:
  - the context sets `managedWorkflowActive: false`, `activeWorkflowSupportsPlaceholders: true`, `activeDeterministicPlaceholderWorkflowEnabled: false`, `activePlaceholderWorkflowName: "create-prd.md"`, and `activePlaceholderWorkflowStepNumber: 3`
  - the returned prompt contains `workflow_progress_request`
  - the returned prompt does not contain `send_user_message`
  - the returned prompt contains `Do not include \`task_progress\` on \`workflow_progress_request\``
- In `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`, add a new test immediately after the existing `create-epics step 2` case at line 260:
  - include `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST` in `registeredTools`
  - use context `activePlaceholderWorkflowName: "create-prd.md"` and `activePlaceholderWorkflowStepNumber: 3`
  - assert the kept ids include `ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST`, `ClineDefaultTool.ASK`, `ClineDefaultTool.SEND_USER_MESSAGE`, `ClineDefaultTool.ATTEMPT`, `ClineDefaultTool.APPLY_PATCH`, `ClineDefaultTool.FILE_NEW`, `ClineDefaultTool.BROWSER`, `ClineDefaultTool.MCP_ACCESS`, and `ClineDefaultTool.NEW_TASK`
  - assert the kept ids do not include `ClineDefaultTool.SEARCH`, `ClineDefaultTool.FILE_READ`, `ClineDefaultTool.FILE_READ_RANGE`, or `ClineDefaultTool.PLAN_MODE`
- In `src/core/prompts/system-prompt/__tests__/integration.test.ts`:
  - add a continuation-turn prompt test after line 666 with this exact context: `providerInfo.mode: "act"`, `isContinuationTurn: true`, `currentFocusChainChecklist: "- [ ] Step 3: Discover and classify the project"`, `activeWorkflowSupportsPlaceholders: true`, `managedWorkflowActive: false`, `activePlaceholderWorkflowName: "create-prd.md"`, and `activePlaceholderWorkflowStepNumber: 3`; assert the system prompt includes `workflow_progress_request`, includes `Do not include \`task_progress\``, includes `runtime-owned \`Yes\` branch completes the next checklist step before the next model request is built`, and does not include `use \`send_user_message\` tool call to briefly tell the user what step you are completing`
  - add a native-tool filter test after the existing `create-epics step 2` native test at line 1242 using this exact context: native GPT-5 minimal prompt (`providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai")`, `enableNativeToolCalls: true`, `useMinimalGptPrompt: true`, `activeWorkflowSupportsPlaceholders: true`, `managedWorkflowActive: false`, `activePlaceholderWorkflowName: "create-prd.md"`, `activePlaceholderWorkflowStepNumber: 3`); assert:
    - native tool names include `"workflow_progress_request"`, `"attempt_completion"`, `"ask_followup_question"`, `"send_user_message"`, and `"apply_patch"`
    - native tool names do not include `"read_file"`, `"read_file_range"`, `"search_files"`, or `"generate_plan_output"`
- Create `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts` modeled on `AskFollowupQuestionToolHandler.test.ts` with these exact cases:
  - `queues selected Yes responses after completing the next workflow step`
    - `ask` returns `{ text: "Yes" }`
    - `taskState.activePlaceholderWorkflowSource = { name: "create-prd.md" } as any`
    - `taskState.currentFocusChainChecklist = "- [ ] Step 3: Discover and classify the project"`
    - assert `updateFCListFromToolResponse` is called once with `FOCUS_CHAIN_COMPLETE_NEXT_STEP_SENTINEL`
    - assert `pendingResponseToolFollowup` equals `{ toolName: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST, route: "normal_user_turn", text: "Yes", images: undefined, files: undefined }`
    - assert the last followup message text stores `selected: "Yes"`
  - `queues selected No responses without advancing the workflow`
    - same state, `ask` returns `{ text: "No" }`
    - assert `updateFCListFromToolResponse` is not called
    - assert followup text is `"No"`
  - `returns a tool error when checklist advancement is rejected`
    - `ask` returns `{ text: "Yes" }`
    - `updateFCListFromToolResponse` resolves `{ accepted: false, feedback: "Workflow progress already advanced once in this assistant turn." }`
    - assert the handler result equals `formatResponse.toolError("Workflow progress already advanced once in this assistant turn.")`
    - assert `pendingResponseToolFollowup` remains `undefined`
  - `returns a tool error when no active checklist is available`
    - omit `currentFocusChainChecklist`
    - assert the result equals `formatResponse.toolError("workflow_progress_request requires an active placeholder-workflow focus chain checklist before it can advance the workflow.")`

## Step 6

[x] Run the targeted verification commands and perform the final string-contract audit.

Allowed files:
- `docs/response-tool-modernization/workflow-progress-request/action-plan.md`
- `docs/response-tool-modernization/workflow-progress-request/requirements.md`
- `src/shared/tools.ts`
- `src/shared/workflow-progress-request.ts`
- `src/core/prompts/system-prompt/tools/workflow_progress_request.ts`
- `src/core/prompts/system-prompt/tools/index.ts`
- `src/core/prompts/system-prompt/tools/init.ts`
- `src/core/prompts/system-prompt/spec.ts`
- `src/core/prompts/system-prompt/components/response_tools.ts`
- `src/core/prompts/system-prompt/components/continuation_turn.ts`
- `src/core/prompts/system-prompt/components/task_progress.ts`
- `src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `src/core/task/tools/handlers/WorkflowProgressRequestToolHandler.ts`
- `src/core/task/tools/ToolExecutorCoordinator.ts`
- `src/core/task/tools/response/ResponseToolRegistry.ts`
- `src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
- `src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`

Exact changes:
- Run these exact test commands and do not substitute broader suites:
  - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts`
  - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
  - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
  - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`
  - `npm run test:unit -- src/core/task/tools/handlers/__tests__/WorkflowProgressRequestToolHandler.test.ts`
- After the tests pass, manually grep the edited files for these exact contracts and confirm they match everywhere:
  - `workflow_progress_request`
  - `Ready to move on to the next step in the workflow?`
  - `Yes`
  - `No`
  - `create-prd.md`
  - `__COMPLETE_NEXT_STEP__`
- If any command fails or any contract string differs from the plan above, stop and ask the user before making any unplanned correction.
