# Subagent OpenAI Responses Chaining Action Plan

This document is the implementation plan for fixing subagent-side `previous_response_id` chaining when the selected provider is OpenAI and the selected request path is the Responses API.

The executing agent must follow this plan literally. Do not redesign the architecture, do not widen scope into the main task loop, and do not introduce provider-specific behavior for non-OpenAI or non-Responses runs.

## Locked Decisions

- Scope:
  - fix subagent assistant-history persistence so OpenAI Responses-capable subagent turns can chain correctly on later turns
  - keep the existing generic replay behavior for every other provider / API path
- In-scope providers:
  - `openai-native`
  - `openai`
- Out of scope:
  - `src/core/task/index.ts`
  - `src/core/api/transform/openai-response-format.ts`
  - `src/core/api/providers/openai-native.ts`
  - `src/core/api/providers/openai.ts`
  - any non-OpenAI provider adapters
- Required behavior:
  - subagent assistant turns must persist `modelInfo` exactly like the main task loop does
  - subagent assistant turns must persist the provider response id when one is available
  - subagent assistant turns must keep the current generic `requestId` fallback for providers that do not expose a reusable response id
- Response-id selection rule:
  - use an explicit `response_id` stream chunk when present
  - otherwise use the `usage` chunk id when present
  - otherwise fall back to the existing `requestId`
- Non-goals:
  - do not force any Responses-specific transform logic onto Anthropic, Gemini, OpenRouter, or other providers
  - do not change how `convertToOpenAIResponsesInput(...)` discovers a chaining anchor
  - do not add any new provider-specific storage fields

## Files To Modify

1. `src/core/task/tools/subagent/SubagentRunner.ts`
2. `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

No other files are to be modified in this pass.

## Step 1: Add A Typed Subagent Assistant `modelInfo` Object

### File
- `src/core/task/tools/subagent/SubagentRunner.ts`

### Line References
- import block: `src/core/task/tools/subagent/SubagentRunner.ts:36-39`
- provider info construction: `src/core/task/tools/subagent/SubagentRunner.ts:431-439`

### Change
Mirror the main task loop by constructing a `modelInfo` object for subagent assistant history entries.

### Exact Edits
1. Extend the shared-messages import at `:36` so it also imports `ClineMessageModelInfo` from `@shared/messages/metrics`.

Add this import directly below the existing `@shared/messages` import:

```ts
import type { ClineMessageModelInfo } from "@shared/messages/metrics"
```

2. Immediately after the existing `providerInfo` object at `:434-439`, add:

```ts
			const modelInfo: ClineMessageModelInfo = {
				providerId: providerInfo.providerId,
				modelId: providerInfo.model.id,
				mode: providerInfo.mode,
			}
```

### Notes
- Do not derive this from `api.getModel()` later in the loop.
- Do not store any extra fields on `modelInfo`.

## Step 2: Track `responseId` Separately From The Existing `requestId`

### File
- `src/core/task/tools/subagent/SubagentRunner.ts`

### Line References
- streaming state initialization: `src/core/task/tools/subagent/SubagentRunner.ts:563-566`

### Change
Split provider response ids from the existing generic `requestId` accumulator so OpenAI Responses ids do not get overwritten by `msg_*` / `fc_*` item ids.

### Exact Edit
Replace the current declaration block:

```ts
				let assistantText = ""
				let assistantTextSignature: string | undefined
				let requestId: string | undefined
```

with:

```ts
				let assistantText = ""
				let assistantTextSignature: string | undefined
				let requestId: string | undefined
				let responseId: string | undefined
```

### Notes
- Keep `requestId`; it remains the generic fallback path.
- `responseId` is only for the persisted assistant message id choice at the end of the turn.

## Step 3: Capture Explicit `response_id` Chunks And `usage.id` As The OpenAI Response Anchor

### File
- `src/core/task/tools/subagent/SubagentRunner.ts`

### Line References
- stream switch: `src/core/task/tools/subagent/SubagentRunner.ts:578-622`

### Change
Teach the subagent stream loop to preserve the real provider response id for OpenAI Responses runs while leaving the current generic `requestId` fallback intact.

### Exact Edits
1. In the existing `case "usage":` block at `:580-600`, keep the current `requestId = requestId ?? chunk.id` line and add this immediately after it:

```ts
							if (chunk.id) {
								responseId = chunk.id
							}
```

2. Leave the existing `case "text":`, `case "tool_calls":`, and `case "reasoning":` `requestId = requestId ?? chunk.id` behavior intact.

3. Add a brand-new `case "response_id":` branch directly after the existing `case "reasoning":` branch:

```ts
						case "response_id":
							responseId = chunk.id
							requestId = requestId ?? chunk.id
							break
```

### Required Result
After this step, subagent runs must behave like this:
- OpenAI `openai` Responses path:
  - prefer the explicit `response_id` chunk id
- OpenAI `openai-native` Responses path:
  - prefer the `usage.id` / completed-response id
- Everything else:
  - continue using the existing `requestId` fallback

### Notes
- Do not add provider-name branching in this switch.
- Do not remove the existing `requestId` assignments from text/tool_calls/reasoning cases.
- Do not change `createMessageWithInitialChunkRetry(...)`.

## Step 4: Persist Real Assistant Turns With `modelInfo` And `id: responseId || requestId`

### File
- `src/core/task/tools/subagent/SubagentRunner.ts`

### Line References
- real assistant history push: `src/core/task/tools/subagent/SubagentRunner.ts:689-694`

### Change
Persist the same metadata shape the main task loop already stores for assistant turns.

### Exact Edit
Replace the current assistant push block:

```ts
				if (assistantContent.length > 0) {
					conversation.push({
						role: "assistant",
						content: assistantContent,
						id: requestId,
					})
				}
```

with:

```ts
				if (assistantContent.length > 0) {
					conversation.push({
						role: "assistant",
						content: assistantContent,
						modelInfo,
						id: responseId || requestId,
					})
				}
```

### Notes
- Do not add `modelInfo` to the synthetic empty-response fallback assistant message at `:707-717`.
- Do not change the synthetic fallback message’s content.
- Do not add `previousResponseIdChainBroken` fields in this pass.

## Step 5: Do Not Modify The OpenAI Transformer Or Provider Adapters

### Files Not To Change
- `src/core/api/transform/openai-response-format.ts:88-110`
- `src/core/api/providers/openai.ts:265-286`
- `src/core/api/providers/openai-native.ts:220-266`
- `src/core/task/index.ts:4038-4097`

### Reason
The OpenAI transformer already does the correct thing once subagent history contains:
- `modelInfo.providerId`
- a real response id in `message.id`

The main loop already persists this metadata correctly. This plan brings subagents into parity rather than changing OpenAI request construction.

## Step 6: Extend The Test Helper So Subagent Tests Can Target OpenAI Responses Paths

### File
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Line References
- helper `stubApiHandler(...)`: `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts:147-160`

### Change
Make the local API-handler stub configurable so the new tests can simulate:
- `openai-native` + `ApiFormat.OPENAI_RESPONSES`
- `openai` + `ApiFormat.OPENAI_RESPONSES`

### Exact Edit
Replace the current helper:

```ts
function stubApiHandler(createMessage: sinon.SinonStub) {
	sinon.stub(coreApi, "buildApiHandler").returns({
		abort: sinon.stub(),
		getModel: () => ({
			id: "anthropic/claude-sonnet-4.5",
			info: {
				contextWindow: 200_000,
				apiFormat: ApiFormat.ANTHROPIC_CHAT,
				supportsPromptCache: true,
			},
		}),
		createMessage,
	} as never)
}
```

with:

```ts
type StubApiOptions = {
	modelId?: string
	apiFormat?: ApiFormat
}

function stubApiHandler(createMessage: sinon.SinonStub, options?: StubApiOptions) {
	sinon.stub(coreApi, "buildApiHandler").returns({
		abort: sinon.stub(),
		getModel: () => ({
			id: options?.modelId ?? "anthropic/claude-sonnet-4.5",
			info: {
				contextWindow: 200_000,
				apiFormat: options?.apiFormat ?? ApiFormat.ANTHROPIC_CHAT,
				supportsPromptCache: true,
			},
		}),
		createMessage,
	} as never)
}
```

### Notes
- Do not change `createTaskConfig(...)`.
- Keep the default helper behavior anthropic so existing tests continue to read naturally.

## Step 7: Add An OpenAI Native Responses Subagent Regression Test

### File
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Insertion Point
- insert this test after the existing test at `:316-396` (`"emits native tool_use blocks with matching tool_result tool_use_id across turns"`)

### Change
Add a test that proves `usage.id` wins over earlier `msg_*` / `fc_*` item ids and that the stored assistant turn carries `modelInfo`.

### Required Test Name
```ts
it("stores openai-native responses subagent turns with provider metadata and the completed response id", async () => { ... })
```

### Required Test Body
Add this test verbatim, adjusting only indentation to match the file:

```ts
		it("stores openai-native responses subagent turns with provider metadata and the completed response id", async () => {
			const createMessage = sinon.stub()
			createMessage.onFirstCall().callsFake(async function* () {
				yield {
					type: "text",
					id: "msg_subagent_native_text_1",
					text: "Inspecting the workspace.",
				}
				yield {
					type: "tool_calls",
					id: "fc_subagent_native_1",
					tool_call: {
						function: {
							id: "toolu_subagent_native_1",
							name: ClineDefaultTool.LIST_FILES,
							arguments: JSON.stringify({ path: ".", recursive: false }),
						},
					},
				}
				yield {
					type: "usage",
					id: "resp_subagent_native_1",
					inputTokens: 10,
					outputTokens: 5,
				}
			})
			createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: any[]) {
				const assistantMessage = conversation[1]
				assert.equal(assistantMessage.role, "assistant")
				assert.equal(assistantMessage.id, "resp_subagent_native_1")
				assert.deepEqual(assistantMessage.modelInfo, {
					providerId: "openai-native",
					modelId: "gpt-5.4-mini-2026-03-17",
					mode: "act",
				})
				yield {
					type: "tool_calls",
					tool_call: {
						function: {
							id: "toolu_subagent_native_complete_1",
							name: ClineDefaultTool.ATTEMPT,
							arguments: JSON.stringify({ result: "done" }),
						},
					},
				}
			})

			const promptRegistry = PromptRegistry.getInstance()
			sinon.stub(promptRegistry, "get").callsFake(async () => {
				promptRegistry.nativeTools = undefined
				return "system prompt"
			})
			sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
			sinon.stub(skills, "discoverSkills").resolves([])
			sinon.stub(skills, "getAvailableSkills").returns([])
			stubApiHandler(createMessage, {
				modelId: "gpt-5.4-mini-2026-03-17",
				apiFormat: ApiFormat.OPENAI_RESPONSES,
			})
			initializeHostProvider()

			const config = createTaskConfig(false)
			config.services.stateManager.getApiConfiguration = () => ({
				actModeApiProvider: "openai-native",
				planModeApiProvider: "openai-native",
			})

			const runner = new SubagentRunner(config)
			const result = await runner.run("Inspect the repo", () => {})

			assert.equal(result.status, "completed")
			assert.equal(createMessage.callCount, 2)
		})
```

### Required Assertions
- the persisted assistant message id on turn 2 must be `resp_subagent_native_1`
- the persisted assistant message must contain `modelInfo.providerId === "openai-native"`
- the earlier `msg_*` and `fc_*` ids must not win

## Step 8: Add An OpenAI Responses Regression Test For Explicit `response_id` Chunks

### File
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Insertion Point
- insert this test immediately after the new openai-native regression test from Step 7

### Change
Add a test that proves an explicit `response_id` chunk wins for the `openai` provider path.

### Required Test Name
```ts
it("stores openai responses subagent turns with the explicit response_id anchor", async () => { ... })
```

### Required Test Body
Add this test verbatim, adjusting only indentation to match the file:

```ts
		it("stores openai responses subagent turns with the explicit response_id anchor", async () => {
			const createMessage = sinon.stub()
			createMessage.onFirstCall().callsFake(async function* () {
				yield {
					type: "text",
					id: "msg_subagent_openai_text_1",
					text: "Searching for the right files.",
				}
				yield {
					type: "tool_calls",
					id: "fc_subagent_openai_1",
					tool_call: {
						function: {
							id: "toolu_subagent_openai_1",
							name: ClineDefaultTool.LIST_FILES,
							arguments: JSON.stringify({ path: ".", recursive: false }),
						},
					},
				}
				yield {
					type: "response_id",
					id: "resp_subagent_openai_1",
				}
			})
			createMessage.onSecondCall().callsFake(async function* (_systemPrompt: string, conversation: any[]) {
				const assistantMessage = conversation[1]
				assert.equal(assistantMessage.role, "assistant")
				assert.equal(assistantMessage.id, "resp_subagent_openai_1")
				assert.deepEqual(assistantMessage.modelInfo, {
					providerId: "openai",
					modelId: "gpt-5.4-mini-2026-03-17",
					mode: "act",
				})
				yield {
					type: "tool_calls",
					tool_call: {
						function: {
							id: "toolu_subagent_openai_complete_1",
							name: ClineDefaultTool.ATTEMPT,
							arguments: JSON.stringify({ result: "done" }),
						},
					},
				}
			})

			const promptRegistry = PromptRegistry.getInstance()
			sinon.stub(promptRegistry, "get").callsFake(async () => {
				promptRegistry.nativeTools = undefined
				return "system prompt"
			})
			sinon.stub(SubagentBuilder.prototype, "getConfiguredSkills").returns(undefined)
			sinon.stub(skills, "discoverSkills").resolves([])
			sinon.stub(skills, "getAvailableSkills").returns([])
			stubApiHandler(createMessage, {
				modelId: "gpt-5.4-mini-2026-03-17",
				apiFormat: ApiFormat.OPENAI_RESPONSES,
			})
			initializeHostProvider()

			const config = createTaskConfig(false)
			config.services.stateManager.getApiConfiguration = () => ({
				actModeApiProvider: "openai",
				planModeApiProvider: "openai",
			})

			const runner = new SubagentRunner(config)
			const result = await runner.run("Inspect the repo", () => {})

			assert.equal(result.status, "completed")
			assert.equal(createMessage.callCount, 2)
		})
```

### Required Assertions
- the persisted assistant message id on turn 2 must be `resp_subagent_openai_1`
- the persisted assistant message must contain `modelInfo.providerId === "openai"`
- the earlier `msg_*` and `fc_*` ids must not win

## Step 9: Do Not Add Any New Tests Outside `SubagentRunner.test.ts`

### Files Not To Change
- `src/core/api/transform/__tests__/openai-response-format.test.ts`
- `src/core/api/providers/__tests__/openai-native.test.ts`
- `src/core/api/providers/__tests__/openai.test.ts`

### Reason
This bug is in subagent history persistence, not in the OpenAI transformer or provider request builders. The subagent regression tests are the correct place to lock the behavior.

## Step 10: Validation

Run exactly these commands from the repo root:

```bash
npx tsc --noEmit
npm run test:unit -- --exit src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
```

## Expected Outcome

After the plan is executed:
- OpenAI Responses subagent turns with provider `openai-native` must persist the completed `resp_*` id from `usage.id` and include `modelInfo`
- OpenAI Responses subagent turns with provider `openai` must persist the completed `resp_*` id from the explicit `response_id` chunk and include `modelInfo`
- non-OpenAI providers must continue using the existing generic subagent replay flow
- no provider adapter behavior changes should be required for the fix to work
