---
title: Input Prompt Cleanup Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, stop, then read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Stop at every PAUSE POINT and provide an update so the work can be checked before continuing.
  - If any ambiguity is discovered, or any code/test change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Input Prompt Cleanup Action Plan

This plan implements the relocation described in `docs/input-prompt-cleanup/requirements.md`.

Locked scope:
- Relocate in-scope runtime-generated prompt content out of request `input`/conversation transport and into the request `instructions`/system-prompt path.
- Preserve existing prompt wording.
- Preserve existing contextual filtering.
- Preserve existing first-turn, full-prompt, compact, and continuation-turn behavior as prescribed in the requirements document.
- Preserve the subagent workspace metadata block exactly as-is in the initial user message.
- Fix the OCA Responses adapter so it uses top-level `instructions` instead of a fake `role: "system"` input item.

Out of scope for this plan:
- `src/core/prompts/system-prompt/components/continuation_turn.ts`
- `src/core/prompts/system-prompt/components/index.ts`
- `src/core/prompts/system-prompt/types.ts`
- `src/core/api/transform/openai-response-format.ts`
- hook-context transport
- any prompt wording changes
- any prompt-schema or contextual-native-tool filtering changes

## Step 1
[x] Add the main-task system-prompt append helper and current-request storage, then cover the helper with unit tests.

Allowed files:
- `src/core/task/index.ts`
- `src/core/task/__tests__/prompt-context.test.ts`

Exact edits:
1. In `src/core/task/index.ts` immediately after the existing exported helper `shouldIncludePersistentPromptContext(...)` at lines 182-184, insert this exported helper exactly:

```ts
export function appendPromptInjectionBlocksToSystemPrompt(
	systemPrompt: string,
	promptInjectionBlocks: ClineTextContentBlock[],
): string {
	const promptInjectionText = promptInjectionBlocks
		.map((block) => block.text)
		.filter((text) => text.trim().length > 0)
		.join("\n\n")

	return promptInjectionText.length > 0 ? `${systemPrompt}\n\n${promptInjectionText}` : systemPrompt
}
```

2. In `src/core/task/index.ts` at the class field block around lines 617-619, insert this new field immediately after `private currentRequestShouldSendFullPromptAssembly = true`:

```ts
	private currentRequestPromptInjectionBlocks: ClineTextContentBlock[] = []
```

3. In `src/core/task/__tests__/prompt-context.test.ts` line 2, change the import from:

```ts
import { isActiveDeterministicPlaceholderWorkflowEnabled, shouldIncludePersistentPromptContext } from "../index"
```

to:

```ts
import {
	appendPromptInjectionBlocksToSystemPrompt,
	isActiveDeterministicPlaceholderWorkflowEnabled,
	shouldIncludePersistentPromptContext,
} from "../index"
```

4. In `src/core/task/__tests__/prompt-context.test.ts`, insert these two `it(...)` blocks immediately before the closing `})` of the existing `describe("shouldIncludePersistentPromptContext", ...)` block:

```ts
	it("appends runtime prompt injection blocks to the system prompt with blank-line separators", () => {
		const result = appendPromptInjectionBlocksToSystemPrompt("BASE SYSTEM PROMPT", [
			{ type: "text", text: "ENVIRONMENT: reduced" },
			{ type: "text", text: "### Reminder:\nCurrent Progress: 0/2 items completed" },
		] as any)

		expect(result).to.equal(
			"BASE SYSTEM PROMPT\n\nENVIRONMENT: reduced\n\n### Reminder:\nCurrent Progress: 0/2 items completed",
		)
	})

	it("leaves the system prompt unchanged when there are no runtime prompt injection blocks", () => {
		expect(appendPromptInjectionBlocksToSystemPrompt("BASE SYSTEM PROMPT", [])).to.equal("BASE SYSTEM PROMPT")
	})
```

5. Do not make any other changes in either file during this step.

## Step 2
[x] Relocate main-task runtime prompt injections out of user/input content and into the effective system prompt, while preserving continuation-turn focus-chain/current-step coverage.

Allowed files:
- `src/core/task/index.ts`
- `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`

Exact edits in `src/core/task/index.ts`:
1. In `attemptApiRequest(...)` at lines 2877-2878, replace:

```ts
const { systemPrompt, tools } = await getSystemPrompt(promptContext)
const effectiveSystemPrompt = systemPrompt
```

with:

```ts
const { systemPrompt, tools } = await getSystemPrompt(promptContext)
const effectiveSystemPrompt = appendPromptInjectionBlocksToSystemPrompt(
	systemPrompt,
	this.currentRequestPromptInjectionBlocks,
)
```

2. In `recursivelyMakeClineRequests(...)` at lines 3479-3481, replace:

```ts
let parsedUserContent: ClineContent[]
let environmentDetails: string
let clinerulesError: boolean
```

with:

```ts
let parsedUserContent: ClineContent[]
let runtimePromptInjectionBlocks: ClineTextContentBlock[] = []
let clinerulesError: boolean
```

3. In the compact branch at lines 3483-3488, replace:

```ts
parsedUserContent = userContent
environmentDetails = ""
clinerulesError = false
this.taskState.lastAutoCompactTriggerIndex = previousApiReqIndex
```

with:

```ts
parsedUserContent = userContent
runtimePromptInjectionBlocks = []
clinerulesError = false
this.taskState.lastAutoCompactTriggerIndex = previousApiReqIndex
```

4. In the non-compact branch at lines 3491-3496, replace:

```ts
;[parsedUserContent, environmentDetails, clinerulesError] = await this.loadContext(
	userContent,
	includeFileDetails,
	useCompactPrompt,
	!useReducedEnvironmentDetails,
)
```

with:

```ts
;[parsedUserContent, runtimePromptInjectionBlocks, clinerulesError] = await this.loadContext(
	userContent,
	includeFileDetails,
	useCompactPrompt,
	!useReducedEnvironmentDetails,
)
```

5. Delete the entire environment-details user-content append block at lines 3515-3519:

```ts
// add environment details as its own text block, separate from tool results
// do not add environment details to the message which we are compacting the context window
if (environmentDetails) {
	userContent.push({ type: "text", text: environmentDetails })
}
```

6. At lines 3521-3529, replace the compact summarize-task append block:

```ts
if (shouldCompact) {
	userContent.push({
		type: "text",
		text: summarizeTask(
			this.stateManager.getGlobalSettingsKey("focusChainSettings"),
			this.cwd,
			isMultiRootEnabled(this.stateManager),
		),
	})
}
```

with:

```ts
if (shouldCompact) {
	runtimePromptInjectionBlocks.push({
		type: "text",
		text: summarizeTask(
			this.stateManager.getGlobalSettingsKey("focusChainSettings"),
			this.cwd,
			isMultiRootEnabled(this.stateManager),
		),
	})
}

this.currentRequestPromptInjectionBlocks = runtimePromptInjectionBlocks
```

7. In `loadContext(...)` at line 4303, change the return type from:

```ts
): Promise<[ClineContent[], string, boolean]> {
```

to:

```ts
): Promise<[ClineContent[], ClineTextContentBlock[], boolean]> {
```

8. In `loadContext(...)` immediately after the `Promise.all(...)` block at lines 4407-4410, insert:

```ts
const promptInjectionBlocks: ClineTextContentBlock[] = []
if (environmentDetails.trim().length > 0) {
	promptInjectionBlocks.push({
		type: "text",
		text: environmentDetails,
	})
}
```

9. In `loadContext(...)` at lines 4426-4430, replace the user-content append with a prompt-injection append. Replace:

```ts
if (shouldSendFullPromptAssembly && placeholderWorkflowActivationInstructions?.trim()) {
	processedUserContent.push({
		type: "text",
		text: placeholderWorkflowActivationInstructions,
	})
}
```

with:

```ts
if (shouldSendFullPromptAssembly && placeholderWorkflowActivationInstructions?.trim()) {
	promptInjectionBlocks.push({
		type: "text",
		text: placeholderWorkflowActivationInstructions,
	})
}
```

10. In `loadContext(...)` at line 4467, remove the `shouldSendFullPromptAssembly &&` prefix from the focus-chain inclusion guard. Change:

```ts
if (shouldSendFullPromptAssembly && !useCompactPrompt && this.FocusChainManager?.shouldIncludeFocusChainInstructions()) {
```

to:

```ts
if (!useCompactPrompt && this.FocusChainManager?.shouldIncludeFocusChainInstructions()) {
```

11. In the same focus-chain block at lines 4473-4477, replace the user-content append with a prompt-injection append. Replace:

```ts
if (focusChainInstructions.trim()) {
	processedUserContent.push({
		type: "text",
		text: focusChainInstructions,
	})
```

with:

```ts
if (focusChainInstructions.trim()) {
	promptInjectionBlocks.push({
		type: "text",
		text: focusChainInstructions,
	})
```

12. In `loadContext(...)` at lines 4484-4486, change the diagnostic summary from `processedUserContent` only to the combined outbound prompt surface. Replace:

```ts
logFocusChainDiagnosticEvent(this.taskId, "load_context_final_summary", {
	...summarizeFocusChainTextBlocks(processedUserContent),
	placeholderActivationInstructionsAppended,
})
```

with:

```ts
logFocusChainDiagnosticEvent(this.taskId, "load_context_final_summary", {
	...summarizeFocusChainTextBlocks([...processedUserContent, ...promptInjectionBlocks]),
	placeholderActivationInstructionsAppended,
})
```

13. At line 4489, change the return statement from:

```ts
return [processedUserContent, environmentDetails, clinerulesError]
```

to:

```ts
return [processedUserContent, promptInjectionBlocks, clinerulesError]
```

Exact edits in `src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts`:
14. Rename the first test at lines 160-187 from:

```ts
it("appends placeholder workflow checklist and current-step guidance when full prompt assembly is required", async () => {
```

to:

```ts
it("returns environment details and placeholder-workflow guidance as prompt injection blocks when full prompt assembly is required", async () => {
```

15. Inside that first test, immediately after `const fakeTask = createFakeTask(0)`, insert:

```ts
fakeTask.buildPlaceholderWorkflowActivationInstructions.resolves("ACTIVATION: placeholder workflow just started")
```

16. In that same first test, change the destructuring at lines 170-176 from:

```ts
const [processedUserContent, environmentDetails] = await (Task.prototype as any).loadContext.call(
	fakeTask,
	userContent,
	false,
	false,
	false,
)
```

to:

```ts
const [processedUserContent, promptInjectionBlocks] = await (Task.prototype as any).loadContext.call(
	fakeTask,
	userContent,
	false,
	false,
	false,
)
```

17. Replace the assertion block at lines 178-186 with this exact block:

```ts
const userText = collectTextValues(processedUserContent).join("\n")
const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")

expect(userText).to.not.contain("ENVIRONMENT: reduced")
expect(userText).to.not.contain("### Reminder:")
expect(userText).to.not.contain("# CURRENT WORKFLOW STEP")
expect(userText).to.not.contain("ACTIVATION: placeholder workflow just started")

expect(promptInjectionText).to.contain("ENVIRONMENT: reduced")
expect(promptInjectionText).to.contain("ACTIVATION: placeholder workflow just started")
expect(promptInjectionText).to.contain("### Reminder:")
expect(promptInjectionText).to.contain("Current Progress: 0/2 items completed")
expect(promptInjectionText).to.contain("- [ ] Step 1: Determine Review Source")
expect(promptInjectionText).to.contain("# CURRENT WORKFLOW STEP")
expect(promptInjectionText).to.contain("You are currently on this step: Step 1: Determine Review Source")
expect(fakeTask.getEnvironmentDetails.calledOnceWith(false, false)).to.equal(true)
```

18. Rename the second test at lines 189-204 from:

```ts
it("suppresses placeholder workflow checklist and current-step guidance on tool-only continuation turns before the refresh threshold", async () => {
```

to:

```ts
it("returns placeholder-workflow continuation guidance as prompt injection blocks on tool-only continuation turns", async () => {
```

19. Inside that second test, immediately after `const fakeTask = createFakeTask()`, insert this exact setup:

```ts
fakeTask.taskState.pendingAutoCompletedPlaceholderWorkflowStepNotices = [
	{
		workflowName: "code-review.md",
		stepNumber: 4,
		checklistLabel: "Step 4: Set Review Mode",
		reason: "review_mode was derived deterministically from fresh review artifacts.",
	},
]
```

20. In that second test, change the destructuring at lines 199-200 from:

```ts
const [processedUserContent] = await (Task.prototype as any).loadContext.call(fakeTask, userContent, false, false, false)
const promptText = collectTextValues(processedUserContent).join("\n")
```

to:

```ts
const [processedUserContent, promptInjectionBlocks] = await (Task.prototype as any).loadContext.call(
	fakeTask,
	userContent,
	false,
	false,
	false,
)
const userText = collectTextValues(processedUserContent).join("\n")
const promptInjectionText = collectTextValues(promptInjectionBlocks).join("\n")
```

21. Replace the assertions at lines 202-203 with this exact block:

```ts
expect(userText).to.not.contain("TODO LIST UPDATE SUGGESTED")
expect(userText).to.not.contain("# CURRENT WORKFLOW STEP")
expect(userText).to.not.contain("# AUTO-COMPLETED WORKFLOW STEPS")

expect(promptInjectionText).to.contain("### Reminder:")
expect(promptInjectionText).to.contain("Current Progress: 0/2 items completed")
expect(promptInjectionText).to.contain("# AUTO-COMPLETED WORKFLOW STEPS")
expect(promptInjectionText).to.contain("Step 4: Set Review Mode")
expect(promptInjectionText).to.contain("# CURRENT WORKFLOW STEP")
expect(promptInjectionText).to.contain("You are currently on this step: Step 1: Determine Review Source")
```

22. Do not modify any other files in this step.

## Step 3
[ ] PAUSE POINT: Report the completed main-task transport changes and wait for review before touching subagent or provider code.

Allowed files:
- None

Execution requirements:
- Do not edit any files in this step.
- Provide a concise update that Steps 1-2 are complete.
- Explicitly mention that `src/core/prompts/system-prompt/components/continuation_turn.ts` has not been modified.
- Explicitly mention that main-task runtime-generated prompt sections now ride on the system-prompt path through `attemptApiRequest(...)` instead of being appended into outbound user content.
- Do not begin Step 4 until review feedback says to continue.

## Step 4
[x] Generalize subagent prompt transport so prompt injections always ride in the subagent system prompt, while leaving workspace metadata untouched.

Allowed files:
- `src/core/task/tools/subagent/SubagentRunner.ts`

Exact edits:
1. In `src/core/task/tools/subagent/SubagentRunner.ts` at lines 532-535, delete this entire block:

```ts
const promptInjectionBlocks = await this.buildSubagentPromptInjectionBlocks(state, shouldSendFullPromptAssembly)
if (!responsesApiActive) {
	this.appendSubagentPromptInjectionBlocksToConversation(conversation, promptInjectionBlocks)
}
```

and replace it with:

```ts
const promptInjectionBlocks = await this.buildSubagentPromptInjectionBlocks(state, shouldSendFullPromptAssembly)
```

2. In the same file at lines 566-569, replace:

```ts
const effectiveSystemPrompt =
	responsesApiActive && promptInjectionText.length > 0
		? `${systemPrompt}\n\n${promptInjectionText}`
		: systemPrompt
```

with:

```ts
const effectiveSystemPrompt =
	promptInjectionText.length > 0 ? `${systemPrompt}\n\n${promptInjectionText}` : systemPrompt
```

3. Delete the entire now-unused `appendSubagentPromptInjectionBlocksToConversation(...)` method at lines 1118-1137.

4. Do not modify `getWorkspaceMetadataEnvironmentBlock()` at lines 394-410.

5. Do not modify the initial user-message injection of workspace metadata at lines 500-513.

## Step 5
[x] Update the non-Responses subagent regression tests so they prove relocation to the system prompt without disturbing workspace metadata behavior.

Allowed files:
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

Exact edits:
1. In the test `it("auto-activates an explicitly assigned placeholder workflow before the first subagent turn", ...)` at lines 1216-1228, replace the existing initial-user/system-prompt assertions:

```ts
const initialUser = createMessage.firstCall.args[1][0] as {
	role: string
	content: Array<{ type?: string; text?: string }>
}
const initialTexts = extractTextFromMessage(initialUser)
assert.match(initialTexts, /<explicit_instructions type="review-edge-case-hunter">/)
assert.match(initialTexts, /Edge case review instructions/)
assert.match(initialTexts, /# task_progress RECOMMENDED/)
const systemPrompt = createMessage.firstCall.args[0] as string
assert.doesNotMatch(systemPrompt, /Assigned Workflow Activation/)
```

with:

```ts
const initialUser = createMessage.firstCall.args[1][0] as {
	role: string
	content: Array<{ type?: string; text?: string }>
}
const initialTexts = extractTextFromMessage(initialUser)
assert.doesNotMatch(initialTexts, /<explicit_instructions type="review-edge-case-hunter">/)
assert.doesNotMatch(initialTexts, /Edge case review instructions/)
assert.doesNotMatch(initialTexts, /# task_progress RECOMMENDED/)
const systemPrompt = createMessage.firstCall.args[0] as string
assert.match(systemPrompt, /<explicit_instructions type="review-edge-case-hunter">/)
assert.match(systemPrompt, /Edge case review instructions/)
assert.match(systemPrompt, /# task_progress RECOMMENDED/)
```

2. Rename the test at line 1230 from:

```ts
it("injects placeholder workflow activation only on the first subagent turn and suppresses repeated guidance before the refresh threshold", async () => {
```

to:

```ts
it("keeps placeholder-workflow activation first-turn-only while relocating prompt injections into the system prompt for non-Responses subagents", async () => {
```

3. In that renamed test, replace the assertion block at lines 1295-1318 with this exact block:

```ts
const initialUser = createMessage.firstCall.args[1][0] as {
	role: string
	content: Array<{ type?: string; text?: string }>
}
const initialTexts = extractTextFromMessage(initialUser)
assert.doesNotMatch(initialTexts, /<explicit_instructions type="review-edge-case-hunter">/)
assert.doesNotMatch(initialTexts, /### Reminder:/)
assert.doesNotMatch(initialTexts, /# CURRENT WORKFLOW STEP/)

const firstSystemPrompt = createMessage.firstCall.args[0] as string
assert.match(firstSystemPrompt, /<explicit_instructions type="review-edge-case-hunter">/)
assert.match(firstSystemPrompt, /### Reminder:/)
assert.match(firstSystemPrompt, /# CURRENT WORKFLOW STEP/)
assert.doesNotMatch(firstSystemPrompt, /CONTINUATION TURN/)

const secondConversation = createMessage.secondCall.args[1] as Array<{
	role: string
	content: Array<{ type?: string; text?: string }>
}>
const followUpUser = secondConversation[secondConversation.length - 1] as {
	role: string
	content: Array<{ type?: string; text?: string }>
}
const followUpTexts = extractTextFromMessage(followUpUser)
assert.doesNotMatch(followUpTexts, /<explicit_instructions type="review-edge-case-hunter">/)
assert.doesNotMatch(followUpTexts, /### Reminder:/)
assert.doesNotMatch(followUpTexts, /Current Progress: 0\/2 items completed/)
assert.doesNotMatch(followUpTexts, /# CURRENT WORKFLOW STEP/)

const secondSystemPrompt = createMessage.secondCall.args[0] as string
assert.match(secondSystemPrompt, /CONTINUATION TURN/)
assert.match(secondSystemPrompt, /### Reminder:/)
assert.match(secondSystemPrompt, /Current Progress: 0\/2 items completed/)
assert.match(secondSystemPrompt, /# CURRENT WORKFLOW STEP/)
assert.doesNotMatch(secondSystemPrompt, /<explicit_instructions type="review-edge-case-hunter">/)
```

4. Rename the test at line 1321 from:

```ts
it("reinjects focus-chain guidance on every internal turn when prompt refresh frequency is zero for non-Responses subagents", async () => {
```

to:

```ts
it("keeps focus-chain guidance in the system prompt on every internal turn when prompt refresh frequency is zero for non-Responses subagents", async () => {
```

5. In that renamed test, replace the assertion block at lines 1382-1395 with this exact block:

```ts
const secondConversation = createMessage.secondCall.args[1] as Array<{
	role: string
	content: Array<{ type?: string; text?: string }>
}>
const followUpUser = secondConversation[secondConversation.length - 1] as {
	role: string
	content: Array<{ type?: string; text?: string }>
}
const followUpTexts = extractTextFromMessage(followUpUser)
assert.doesNotMatch(followUpTexts, /### Reminder:/)
assert.doesNotMatch(followUpTexts, /Current Progress: 0\/2 items completed/)
assert.doesNotMatch(followUpTexts, /# CURRENT WORKFLOW STEP/)
const secondSystemPrompt = createMessage.secondCall.args[0] as string
assert.match(secondSystemPrompt, /### Reminder:/)
assert.match(secondSystemPrompt, /Current Progress: 0\/2 items completed/)
assert.match(secondSystemPrompt, /# CURRENT WORKFLOW STEP/)
assert.doesNotMatch(secondSystemPrompt, /CONTINUATION TURN/)
```

6. Do not modify the existing Responses-backed subagent tests at lines 1398-1590.

7. Do not modify the existing workspace-metadata test at lines 2197-2232.

## Step 6
[x] Fix the OCA Responses adapter and add a direct provider-level request-shape regression test.

Allowed files:
- `src/core/api/providers/oca.ts`
- `src/core/api/providers/__tests__/oca.test.ts`

Exact edits in `src/core/api/providers/oca.ts`:
1. At lines 382-385, replace:

```ts
const inputMessages = convertToOpenAIResponsesInput(messages, { usePreviousResponseId: false }).input
// Convert messages to Responses API input format
const input: OpenAI.Responses.ResponseInputItem[] = [{ role: "system", content: systemPrompt }, ...inputMessages]
```

with:

```ts
const input = convertToOpenAIResponsesInput(messages, { usePreviousResponseId: false }).input
```

2. In the `responsesParams` object at lines 410-417, insert `instructions: systemPrompt,` immediately after `model: this.options.ocaModelId || liteLlmDefaultModelId,` so the block becomes:

```ts
const responsesParams: OpenAI.Responses.ResponseCreateParamsStreaming = {
	model: this.options.ocaModelId || liteLlmDefaultModelId,
	instructions: systemPrompt,
	input,
	stream: true,
	tools: responseTools,
	...(typeof temperature === "number" ? { temperature } : {}),
	...(typeof maxOutputTokens === "number" && maxOutputTokens > 0 ? { max_output_tokens: maxOutputTokens } : {}),
}
```

Exact edits in `src/core/api/providers/__tests__/oca.test.ts`:
3. Create a new file `src/core/api/providers/__tests__/oca.test.ts` with exactly this content:

```ts
import { expect } from "chai"
import sinon from "sinon"
import { OcaHandler } from "../oca"
import { convertToOpenAIResponsesInput } from "../../transform/openai-response-format"
import { ApiFormat } from "@/shared/proto/index.cline"

function createAsyncIterable(data: any[] = []) {
	return {
		[Symbol.asyncIterator]: async function* () {
			yield* data
		},
	}
}

describe("OcaHandler", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("sends the Responses system prompt via instructions instead of a system input item", async () => {
		const createStub = sinon.stub().resolves(
			createAsyncIterable([
				{
					type: "response.completed",
					response: {
						id: "resp_oca_prompt_transport",
						usage: {
							input_tokens: 12,
							output_tokens: 4,
						},
					},
				},
			]),
		)

		const handler = new OcaHandler({
			ocaModelId: "oracle/gpt-5.4-mini",
			ocaModelInfo: {
				apiFormat: ApiFormat.OPENAI_RESPONSES,
				contextWindow: 200_000,
				supportsReasoning: false,
			} as any,
		})

		sinon.stub(handler as any, "ensureOpenAIClient").returns({
			responses: {
				create: createStub,
			},
		} as any)
		sinon.stub(handler, "calculateCost").resolves(0)

		const messages = [{ role: "user", content: "hi" }] as any
		for await (const _chunk of handler.createMessage("system prompt", messages, [])) {
			// drain
		}

		const request = createStub.firstCall.args[0]
		expect(request.instructions).to.equal("system prompt")
		expect(request.input).to.deep.equal(convertToOpenAIResponsesInput(messages, { usePreviousResponseId: false }).input)
		expect(
			(request.input as Array<{ role?: string; content?: unknown }>).some(
				(item) => item.role === "system" && item.content === "system prompt",
			),
		).to.equal(false)
	})
})
```

4. Do not modify any other provider files or any shared Responses transformer files in this step.

## Step 7
[ ] PAUSE POINT: Report the subagent and OCA transport changes, then wait for review before running verification.

Allowed files:
- None

Execution requirements:
- Do not edit any files in this step.
- Provide a concise update that Steps 4-6 are complete.
- Explicitly mention that the subagent workspace metadata test remains untouched.
- Explicitly mention that `src/core/prompts/system-prompt/components/continuation_turn.ts` is still unchanged.
- Do not begin Step 8 until review feedback says to continue.

## Step 8
[ ] Run the prescribed targeted regression command and report the result without widening scope.

Allowed files:
- None

Execution requirements:
1. Run exactly this command and no broader test command:

```bash
npm run test:unit -- src/core/task/__tests__/prompt-context.test.ts src/core/task/__tests__/loadContext.placeholderWorkflow.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/api/providers/__tests__/oca.test.ts --exit
```

2. If this command fails for any reason that would require code changes outside the files already prescribed in this action plan, stop immediately and ask for input instead of widening scope.

3. If the command passes, provide the exact pass/fail summary and stop.

4. Do not run the full test suite.
