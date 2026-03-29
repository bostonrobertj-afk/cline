---
title: Subagent Responses Context Reinjection Action Plan
execution_instructions:
  - Read each step in full before executing that step.
  - Execute only the current step.
  - After completing a step, update that step's `[ ]` checkbox to `[x]`.
  - After updating the completed step's checkbox, return to this document and read the next step in full before making additional changes.
  - Do not execute any later step based on stale context, memory, or assumptions about what a later step might require.
  - If any ambiguity is discovered, or any necessary code or test change is not explicitly prescribed in this document, stop and ask for input before proceeding.
  - Do not widen scope beyond the files explicitly allowed in the current step.
---

# Subagent Responses Context Reinjection Action Plan

This document is the implementation plan for stopping local conversation-history reinjection of placeholder-workflow activation and focus-chain guidance for subagents running on the OpenAI Responses API, while preserving the existing reinjection behavior for subagents running on non-Responses paths.

The executing agent must follow this plan literally.

## Locked Decisions

- Scope:
  - eliminate local `conversation` mutation for placeholder-workflow activation/focus-chain prompt injections on Responses-backed subagent runs
  - keep the current local reinjection path for subagent runs not using the Responses API
  - preserve placeholder-workflow activation and focus-chain guidance for Responses-backed subagent runs by moving it into the request system prompt instead of dropping it
- Responses-backed runs for this plan are exactly:
  - `ApiFormat.OPENAI_RESPONSES`
  - `ApiFormat.OPENAI_RESPONSES_WEBSOCKET_MODE`
- Non-Responses runs for this plan include everything else, including:
  - `ApiFormat.ANTHROPIC_CHAT`
  - legacy OpenAI chat/completions formats
  - any other non-Responses provider format
- Required behavior:
  - the initial subagent user message must continue to contain the human-authored prompt and workspace metadata block exactly as it does today
  - the larger placeholder-workflow activation instructions must be sent only on workflow-start/full-instruction turns, not on later refresh or continuation turns
  - the smaller focus-chain/current-step guidance must remain present on every turn where subagent runtime guidance is supposed to appear, including continuation turns
  - placeholder-workflow activation instructions and focus-chain instructions must no longer be appended into local subagent `conversation` history on Responses-backed runs
  - on Responses-backed runs, the one-time activation instructions and the recurring focus-chain/current-step guidance must be appended to the per-request system prompt instead of local user-message history
  - non-Responses runs must continue to receive local conversation reinjection, with one-time activation instructions on workflow-start/full-instruction turns and recurring focus-chain/current-step guidance on subsequent turns
- Out of scope:
  - `src/core/task/index.ts`
  - `src/core/task/focus-chain/index.ts`
  - `src/core/api/providers/openai-native.ts`
  - `src/core/api/providers/openai.ts`
  - `src/core/api/transform/openai-response-format.ts`
  - workflow files under `/Users/robertboston/Documents/Cline/Workflows/`
  - snapshot files
- Non-goals:
  - do not redesign the main task loop
  - do not remove prompt refresh
  - do not remove placeholder-workflow activation or focus-chain guidance for Responses-backed subagents
  - do not add provider-specific branching beyond the API-format gate described above

## Files To Modify

1. `src/core/task/tools/subagent/SubagentRunner.ts`
2. `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

No other files are to be modified in this pass.

## [x] Step 1: Add A Responses-API Gate And Split Prompt Injection Collection From Delivery

### Allowed Files

- [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)

### Exact Changes

#### 1A. Add a file-local helper that identifies Responses-backed subagent runs from `ApiFormat`.

In [SubagentRunner.ts:108-124](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L108), insert this helper immediately after `createEmptyRequestUsageState()` and before `serializeToolResult(...)`:

```ts
function usesResponsesApi(apiFormat: ApiFormat | undefined): boolean {
	return apiFormat === ApiFormat.OPENAI_RESPONSES || apiFormat === ApiFormat.OPENAI_RESPONSES_WEBSOCKET_MODE
}
```

Do not make this helper exported.

Do not add provider-id checks to this helper. It must be based only on `ApiFormat`.

#### 1B. Replace the current mixed “collect and mutate” prompt-injection method with a pure collector.

At [SubagentRunner.ts:1076-1118](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L1076), rename the existing method:

```ts
private async appendSubagentPromptInjections(
	conversation: ClineStorageMessage[],
	state: TaskState,
	shouldSendFullPromptAssembly: boolean,
): Promise<void>
```

to:

```ts
private async buildSubagentPromptInjectionBlocks(
	state: TaskState,
	shouldSendFullPromptAssembly: boolean,
): Promise<ClineTextContentBlock[]>
```

Then make the following exact behavioral changes inside that method:

1. Remove the `conversation` parameter entirely.
2. Remove the current early return on `!shouldSendFullPromptAssembly`. After this change, the method must be able to collect recurring focus-chain instructions on continuation turns.

3. Change the activation-instruction gate so that activation instructions are collected only when both of these are true:
   - `shouldSendFullPromptAssembly`
   - `state.activeWorkflowJustStarted && state.activePlaceholderWorkflowSource`

4. Keep the existing focus-chain collection logic, but it must now run regardless of `shouldSendFullPromptAssembly` so the smaller current-step guidance can be present on continuation turns.
5. Keep the existing state-reset side effects when focus-chain instructions are generated:
   - `state.apiRequestsSinceLastTodoUpdate = 0`
   - `state.todoListWasUpdatedByUser = false`
6. Replace the current tail section that mutates `conversation` with:

```ts
return additions
```

After this edit, `buildSubagentPromptInjectionBlocks(...)` must only collect and return text blocks. It must not mutate `conversation`. It must collect:
- one-time activation instructions only on workflow-start/full-instruction turns
- recurring focus-chain/current-step guidance on every applicable turn, including continuation turns

Do not remove:
- `buildActivePlaceholderWorkflowActivationInstructions(...)`
- `focusChainManager.shouldIncludeFocusChainInstructions()`
- the focus-chain state resets

#### 1C. Add a dedicated local-conversation append helper for the non-Responses branch.

Immediately below the new `buildSubagentPromptInjectionBlocks(...)` method, add a new private method named exactly:

```ts
private appendSubagentPromptInjectionBlocksToConversation(
	conversation: ClineStorageMessage[],
	additions: ClineTextContentBlock[],
): void
```

Its body must be the exact conversation-mutation logic currently living at the bottom of the old method:

1. If `additions.length === 0`, return immediately.
2. If the last message is not a `user` message, push a new `user` message with `content: additions`.
3. Otherwise, normalize the last user message content with `ensureUserMessageContentArray(lastMessage)` and append `...additions`.

Do not add any new behavior in this helper.

### Pause Point 1

Stop after Step 1 and report:
- the exact new helper name used for API-format gating
- the exact new collector method name
- the exact new local-conversation append helper name
- confirmation that prompt-injection collection still preserves the existing focus-chain state-reset side effects

Do not proceed until this checkpoint is reviewed.

## [x] Step 2: Route Prompt Injections To System Prompt For Responses Runs And Keep Local Reinjection For Others

### Allowed Files

- [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)

### Exact Changes

#### 2A. Compute the Responses-path gate once per subagent run loop.

At [SubagentRunner.ts:461-463](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L461), leave `nativeToolCallsRequested` unchanged.

Immediately after that block, add:

```ts
			const responsesApiActive = usesResponsesApi(providerInfo.model.info.apiFormat)
```

Do not derive this from `providerId`.

#### 2B. Build prompt injections every turn, but only append them into local `conversation` for non-Responses runs.

At [SubagentRunner.ts:516-529](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L516), replace:

```ts
					await this.appendSubagentPromptInjections(conversation, state, shouldSendFullPromptAssembly)
```

with:

```ts
					const promptInjectionBlocks = await this.buildSubagentPromptInjectionBlocks(
						state,
						shouldSendFullPromptAssembly,
					)
					if (!responsesApiActive) {
						this.appendSubagentPromptInjectionBlocksToConversation(conversation, promptInjectionBlocks)
					}
```

Do not change any surrounding `shouldSendFullPromptAssembly` / `shouldUseContinuationPrompt` logic in this step.

After this change:
- on Responses-backed runs, `promptInjectionBlocks` must contain:
  - activation instructions on the first workflow-start/full-instruction turn only
  - focus-chain/current-step guidance on every applicable turn, including continuation turns
- on non-Responses runs, those collected blocks must continue to be appended into local conversation instead of the system prompt

#### 2C. Append collected prompt injections to the system prompt for Responses-backed runs.

At [SubagentRunner.ts:546-553](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L546), keep the existing `systemPrompt` construction exactly as-is.

Immediately after the existing `const systemPrompt = ...` block, add:

```ts
					const promptInjectionText = promptInjectionBlocks.map((block) => block.text).join("\n\n").trim()
					const effectiveSystemPrompt =
						responsesApiActive && promptInjectionText.length > 0
							? `${systemPrompt}\n\n${promptInjectionText}`
							: systemPrompt
```

Then at [SubagentRunner.ts:591-594](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L591), replace the first argument passed to `createMessageWithInitialChunkRetry(...)` from:

```ts
						systemPrompt,
```

to:

```ts
						effectiveSystemPrompt,
```

Do not rename `systemPrompt`.

Do not append prompt-injection text to `generatedSystemPrompt` or `baseSystemPrompt`; it must be appended only at the final `effectiveSystemPrompt` layer.

#### 2D. Preserve the existing initial user message seed exactly.

Do not modify [SubagentRunner.ts:491-510](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L491):
- keep the initial user message
- keep the human-authored prompt
- keep the workspace metadata block behavior exactly as-is

This step only changes how activation/focus-chain prompt injections are transported after collection.

### Pause Point 2

Stop after Step 2 and report:
- the exact new gate variable name used in the run loop
- the exact line where non-Responses runs still append prompt injections to local conversation
- the exact `effectiveSystemPrompt` construction added for Responses-backed runs
- confirmation that the initial seeded user message was not changed

Do not proceed until this checkpoint is reviewed.

## [x] Step 3: Add Regression Coverage For Responses And Non-Responses Branches

### Allowed Files

- [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts)

### Exact Changes

#### 3A. Keep the existing non-Responses reinjection test, but make its scope explicit in the title.

In [SubagentRunner.test.ts:1287](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1287), change the existing test title from:

```ts
it("reinjects focus-chain guidance on every internal turn when prompt refresh frequency is zero", async () => {
```

to:

```ts
it("reinjects focus-chain guidance on every internal turn when prompt refresh frequency is zero for non-Responses subagents", async () => {
```

Do not change the assertions inside that existing test.

#### 3B. Add a new Responses-backed regression test directly after the non-Responses reinjection test.

Insert a new test immediately after the updated non-Responses test.

The new test title must be exactly:

```ts
it("moves placeholder workflow prompt injections into the system prompt for OpenAI Responses subagents", async () => {
```

Use the same remote `review-edge-case-hunter` workflow fixture content already used in the neighboring reinjection tests.

The test must:

1. Create a two-turn `createMessage` stub, with:
   - first call yielding a `list_files` tool call
   - second call yielding an `attempt_completion` tool call
2. Stub `PromptRegistry.getInstance().get(...)` to return:
   - `"system prompt"` when `context.isContinuationTurn !== true`
   - `"CONTINUATION TURN"` when `context.isContinuationTurn === true`
3. Use:
   - `stubApiHandler(createMessage, { modelId: "gpt-5.4-mini-2026-03-17", apiFormat: ApiFormat.OPENAI_RESPONSES })`
4. Create a config with:
   - `createTaskConfig(false, 0)`
   - `config.services.stateManager.getApiConfiguration = () => ({ actModeApiProvider: "openai-native", planModeApiProvider: "openai-native" })`
5. Run:

```ts
const runner = new SubagentRunner(config)
const result = await runner.run(`Skill: use_skill('review-edge-case-hunter')`, () => {})
```

6. Assert:
   - `result.status === "completed"`
   - `createMessage.callCount === 2`
7. Inspect the first request:
   - `const initialUser = createMessage.firstCall.args[1][0]`
   - `const initialTexts = extractTextFromMessage(initialUser)`
   - assert `initialTexts` does **not** match:
     - `/^### Reminder:/m`
     - `/# CURRENT WORKFLOW STEP/`
     - `/<explicit_instructions type="review-edge-case-hunter">/`
   - inspect `const firstSystemPrompt = createMessage.firstCall.args[0] as string`
   - assert `firstSystemPrompt` **does** match:
     - `/<explicit_instructions type="review-edge-case-hunter">/`
     - `/^### Reminder:/m`
     - `/# CURRENT WORKFLOW STEP/`
8. Inspect the second request:
   - `const secondConversation = createMessage.secondCall.args[1]`
   - `const followUpUser = secondConversation[secondConversation.length - 1]`
   - `const followUpTexts = extractTextFromMessage(followUpUser)`
   - assert `followUpTexts` does **not** match:
     - `/^### Reminder:/m`
     - `/Current Progress: 0\\/2 items completed/`
     - `/# CURRENT WORKFLOW STEP/`
     - `/<explicit_instructions type="review-edge-case-hunter">/`
   - inspect `const secondSystemPrompt = createMessage.secondCall.args[0] as string`
   - assert `secondSystemPrompt` **does** match:
     - `/^### Reminder:/m`
     - `/Current Progress: 0\\/2 items completed/`
     - `/# CURRENT WORKFLOW STEP/`
   - assert `secondSystemPrompt` does **not** match:
     - `/<explicit_instructions type="review-edge-case-hunter">/`
   - assert `secondSystemPrompt` does **not** match `/CONTINUATION TURN/`

That second-turn assertion is intentional: on a Responses-backed full-prompt refresh turn, the system prompt must keep the smaller recurring focus-chain/current-step guidance while omitting the one-time activation instructions.

Do not assert on workspace metadata in this new test.

#### 3C. Add a continuation-turn Responses regression test.

Insert a second new test immediately after the Responses refresh test.

The new test title must be exactly:

```ts
it("keeps continuation-turn placeholder workflow guidance out of local user content for OpenAI Responses subagents", async () => {
```

Use the same workflow fixture and two-turn tool-call structure as the existing test at [SubagentRunner.test.ts:1223-1285](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L1223).

The new test must differ in these exact ways:

1. Use:
   - `stubApiHandler(createMessage, { modelId: "gpt-5.4-mini-2026-03-17", apiFormat: ApiFormat.OPENAI_RESPONSES })`
   - `config.services.stateManager.getApiConfiguration = () => ({ actModeApiProvider: "openai-native", planModeApiProvider: "openai-native" })`
2. Use the default `createTaskConfig(false)` prompt refresh frequency so the second turn remains a continuation turn.
3. Assert:
   - `promptGetStub.secondCall.args[0].isContinuationTurn === true`
4. Inspect `followUpUser` from the second conversation and assert it does **not** match:
   - `/^### Reminder:/m`
   - `/Current Progress: 0\\/2 items completed/`
   - `/# CURRENT WORKFLOW STEP/`
   - `/<explicit_instructions type="review-edge-case-hunter">/`
5. Inspect `const secondSystemPrompt = createMessage.secondCall.args[0] as string`
6. Assert:
   - `secondSystemPrompt` matches `/CONTINUATION TURN/`
   - `secondSystemPrompt` matches `/^### Reminder:/m`
   - `secondSystemPrompt` matches `/Current Progress: 0\\/2 items completed/`
   - `secondSystemPrompt` matches `/# CURRENT WORKFLOW STEP/`
   - `secondSystemPrompt` does **not** match `/<explicit_instructions type="review-edge-case-hunter">/`

That final assertion set is important: on continuation turns for Responses-backed subagents, the smaller recurring focus-chain/current-step guidance must still be present, but it must ride in the request system prompt rather than local user-message reinjection. The larger activation payload must remain absent after the initial workflow-start turn.

Do not change any existing continuation-turn test outside the title change in 3A.

### Pause Point 3

Stop after Step 3 and report:
- the exact renamed non-Responses test title
- the exact two new Responses test titles
- confirmation that one new test covers prompt-refresh turns and one covers continuation turns

Do not proceed until this checkpoint is reviewed.

## [x] Step 4: Validation

### Allowed Files

- no source edits unless a validation failure directly identifies a defect in one of the files allowed by Steps 1-3

### Exact Commands

Run exactly these commands, in this order:

1. `npm run test:unit -- --exit src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
2. `npx tsc --noEmit`

If both pass, stop.

If either fails:
- fix only the files already listed in Steps 1-3
- rerun only the failing command until it passes
- then rerun both commands in the original order

Do not update snapshots during this plan. If any snapshot changes are suggested, stop and ask for input before proceeding.

### Pause Point 4

Stop after Step 4 and report:
- the pass/fail result for each command in order
- any files changed during validation repair, if any
- confirmation that no snapshots were updated

Do not proceed beyond this plan.
