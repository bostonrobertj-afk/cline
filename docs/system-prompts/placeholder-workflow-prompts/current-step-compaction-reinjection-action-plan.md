---
title: Placeholder Workflow Current-Step Compaction Reinjection Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, stop, then read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Do not widen scope beyond the allowed-files list for the current step.
  - If any ambiguity is discovered, or any code/test/snapshot change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - Preserve existing prompt wording unless a step below explicitly prescribes a wording change.
---

# Context
- Placeholder current-step prompting is now one-shot per checklist label via `lastPromptedPlaceholderWorkflowChecklistLabel`.
- That marker must be cleared when previously-injected step details are no longer trustworthy because context was compacted or truncated.
- Two clearing triggers are approved:
  - app-local compaction/truncation
  - OpenAI Responses server-side compaction, when the response stream emits a compaction output item
- In the current codebase, only `src/core/api/providers/openai-native.ts` sends `context_management` with `compact_threshold`, so only that provider path is in scope for the OpenAI compaction-stream trigger.

# Locked Decisions
- Do not add any new placeholder-workflow state beyond the existing `lastPromptedPlaceholderWorkflowChecklistLabel`.
- Use a new `ApiStream` chunk named `context_compacted` to carry the OpenAI Responses compaction signal from the provider layer into task/subagent runtime code.
- Emit `context_compacted` only from `response.output_item.done` when `item.type === "compaction"`. Do not emit on `response.output_item.added`.
- Main-task compaction triggers must clear the marker in memory and persist the cleared value to task metadata.
- Subagent compaction triggers must clear the marker only in the subagent `TaskState` instance; do not persist subagent clears to task metadata.
- Do not edit `src/core/api/providers/openai.ts` in this plan. That provider does not currently send `context_management`.
- Managed workflows remain out of scope.

# Out Of Scope
- changing placeholder current-step wording
- changing checklist rendering
- changing prompt-refresh cadence
- adding heuristic token-threshold reinjection
- wiring compaction detection into any provider other than `openai-native`

## Step 1
[x] Add an explicit `context_compacted` stream chunk and emit it from OpenAI native Responses compaction items.

Allowed files:
- `src/core/api/transform/stream.ts`
- `src/core/api/providers/openai-native.ts`

Exact edits:
1. In `src/core/api/transform/stream.ts` at lines 2-7, add a new union member immediately after `ApiStreamUsageChunk`:

```ts
	| ApiStreamContextCompactedChunk
```

2. In `src/core/api/transform/stream.ts`, insert this new interface immediately after `ApiStreamUsageChunk` ends at line 37:

```ts
export interface ApiStreamContextCompactedChunk {
	type: "context_compacted"
	id?: string
}
```

3. In `src/core/api/providers/openai-native.ts` inside `processResponsesEvents(...)` at lines 770-806, keep the existing `function_call` and `reasoning` handling exactly as-is.

4. In that same `response.output_item.done` block, insert this new branch immediately after the existing `if (item.type === "reasoning") { ... }` block and before the closing brace for `if (chunk.type === "response.output_item.done")`:

```ts
				if (item.type === "compaction") {
					yield {
						type: "context_compacted",
						id: item.id,
					}
				}
```

5. Do not add any `context_compacted` emission to `response.output_item.added`.

6. Do not edit `src/core/api/providers/openai.ts` in this step.

## Step 2
[x] Add a primary-task helper for compaction-triggered marker clearing and wire the main task-loop trigger sites.

Allowed files:
- `src/core/task/index.ts`

Exact edits:
1. In `src/core/task/index.ts`, immediately after `persistLastPromptedPlaceholderWorkflowChecklistLabel()` ends at lines 2280-2289, insert this private helper exactly:

```ts
	private async clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction(): Promise<void> {
		if (this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel === undefined) {
			return
		}

		this.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
		await this.persistLastPromptedPlaceholderWorkflowChecklistLabel()
	}
```

2. In `src/core/task/index.ts` inside `handleContextWindowExceededError()` at lines 3311-3319, insert:

```ts
		await this.clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction()
```

immediately after:

```ts
		this.taskState.conversationHistoryDeletedRange = newDeletedRange
```

3. In `src/core/task/index.ts` inside the `if (contextManagementMetadata.updatedConversationHistoryDeletedRange) { ... }` block at lines 3527-3531, insert:

```ts
			await this.clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction()
```

immediately after:

```ts
			this.taskState.conversationHistoryDeletedRange = contextManagementMetadata.conversationHistoryDeletedRange
```

4. In `src/core/task/index.ts` inside the `if (this.taskState.currentlySummarizing) { ... }` block at lines 4063-4072, insert:

```ts
							await this.clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction()
```

immediately after:

```ts
							this.taskState.conversationHistoryDeletedRange = [start, end + 2]
```

5. In `src/core/task/index.ts` inside the stream-processing switch at lines 4415-4491, add this new case immediately after the existing `case "response_id": { ... }` block:

```ts
						case "context_compacted": {
							await this.clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction()
							break
						}
```

6. Do not change any existing prompt text or any other switch branch in this step.

## Step 3
[x] Clear and persist the marker in the two tool handlers that mutate `conversationHistoryDeletedRange` outside the main task loop.

Allowed files:
- `src/core/task/tools/handlers/SummarizeTaskHandler.ts`
- `src/core/task/tools/handlers/CondenseHandler.ts`

Exact edits:
1. In `src/core/task/tools/handlers/SummarizeTaskHandler.ts`, change the existing disk import at line 6 from:

```ts
import { ensureTaskDirectoryExists } from "@core/storage/disk"
```

to:

```ts
import { ensureTaskDirectoryExists, getTaskMetadata, saveTaskMetadata } from "@core/storage/disk"
```

2. In `src/core/task/tools/handlers/SummarizeTaskHandler.ts` at lines 228-233, insert this block immediately after the existing assignment to `config.taskState.conversationHistoryDeletedRange` and before `await config.messageState.saveClineMessagesAndUpdateHistory()`:

```ts
				if (config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel !== undefined) {
					config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
					try {
						const metadata = await getTaskMetadata(config.taskId)
						metadata.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
						await saveTaskMetadata(config.taskId, metadata)
					} catch {
						// Non-fatal: the in-memory marker remains canonical for the active turn.
					}
				}
```

3. In `src/core/task/tools/handlers/CondenseHandler.ts`, change the existing disk import at line 3 from:

```ts
import { ensureTaskDirectoryExists } from "@core/storage/disk"
```

to:

```ts
import { ensureTaskDirectoryExists, getTaskMetadata, saveTaskMetadata } from "@core/storage/disk"
```

4. In `src/core/task/tools/handlers/CondenseHandler.ts` at lines 65-70, insert this block immediately after the existing assignment to `config.taskState.conversationHistoryDeletedRange` and before `await config.messageState.saveClineMessagesAndUpdateHistory()`:

```ts
			if (config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel !== undefined) {
				config.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
				try {
					const metadata = await getTaskMetadata(config.taskId)
					metadata.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
					await saveTaskMetadata(config.taskId, metadata)
				} catch {
					// Non-fatal: the in-memory marker remains canonical for the active turn.
				}
			}
```

5. Do not add any new helper file in this step.

## Step 4
[x] Clear the subagent marker on both local compaction and OpenAI compaction-stream events.

Allowed files:
- `src/core/task/tools/subagent/SubagentRunner.ts`

Exact edits:
1. In `src/core/task/tools/subagent/SubagentRunner.ts`, leave `SubagentContextState` unchanged. Do not add new state fields there.

2. In `src/core/task/tools/subagent/SubagentRunner.ts`, immediately after `maybeAppendCurrentStepInputPrompt(...)` ends at lines 1179-1190, insert this helper exactly:

```ts
	private clearSubagentCurrentStepPromptMarkerForContextCompaction(state: TaskState): void {
		if (state.lastPromptedPlaceholderWorkflowChecklistLabel === undefined) {
			return
		}

		state.lastPromptedPlaceholderWorkflowChecklistLabel = undefined
	}
```

3. In `src/core/task/tools/subagent/SubagentRunner.ts` at lines 580-594, inside the existing `if (compactResult.didCompact) { ... }` block, insert:

```ts
						this.clearSubagentCurrentStepPromptMarkerForContextCompaction(state)
```

immediately before the existing `Logger.warn(...)` call.

4. In `src/core/task/tools/subagent/SubagentRunner.ts`, change the `createMessageWithInitialChunkRetry(...)` signature at lines 1348-1357 to accept a new final parameter:

```ts
		state: TaskState,
```

5. In `src/core/task/tools/subagent/SubagentRunner.ts` at the call site around lines 602-611, pass `state` as the new final argument to `this.createMessageWithInitialChunkRetry(...)`.

6. In `src/core/task/tools/subagent/SubagentRunner.ts` inside `createMessageWithInitialChunkRetry(...)` at lines 1377-1387, insert:

```ts
					if (compactResult.didCompact) {
						this.clearSubagentCurrentStepPromptMarkerForContextCompaction(state)
					}
```

immediately after:

```ts
					contextState.conversationHistoryDeletedRange = compactResult.conversationHistoryDeletedRange
```

7. In `src/core/task/tools/subagent/SubagentRunner.ts` inside the stream-processing switch at lines 619-668, add this new case immediately after the existing `case "response_id": { ... }` block:

```ts
						case "context_compacted":
							this.clearSubagentCurrentStepPromptMarkerForContextCompaction(state)
							break
```

8. Do not persist subagent marker clears to task metadata in this step.

## Step 5
[x] Add focused regression coverage for the two approved triggers and rerun the targeted suites.

Allowed files:
- `src/core/api/providers/__tests__/openai-native.test.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

Exact edits:
1. In `src/core/api/providers/__tests__/openai-native.test.ts`, add a new test immediately after `it("should include reasoning tokens in Responses API output usage totals", ...)` at lines 330-385.

2. Name the new test exactly:

```ts
it("emits context_compacted when a Responses compaction output item completes", async () => {
```

3. In that test, configure the fake Responses stream to yield:
   - one `response.output_item.done` event whose `item` is `{ type: "compaction", id: "cmp_test_123", encrypted_content: "encrypted" }`
   - one `response.completed` event with a normal `usage` payload

4. Drain `handler.createMessage(...)` into a `chunks` array and assert:
   - `chunks.some((chunk) => chunk.type === "context_compacted")` is `true`
   - the emitted `context_compacted` chunk has `id === "cmp_test_123"`

5. In `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, add this method extraction immediately after the existing `restoreBmadStateFromMetadata` / `persistWorkflowFormSession` bindings near lines 74-80:

```ts
const clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction = Reflect.get(
	Task.prototype,
	"clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction",
) as TaskMethod<[], Promise<void>>
```

6. In `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, add a new test immediately after `it("restores activePlaceholderWorkflowSource from metadata and resumes step-specific prompting", ...)`.

7. Name the new test exactly:

```ts
it("clears and persists the last prompted checklist label when context compaction invalidates current-step history", async () => {
```

8. In that test:
   - stub `disk.getTaskMetadata` to return an object whose `lastPromptedPlaceholderWorkflowChecklistLabel` is `"Step 1: Gather Context"`
   - stub `disk.saveTaskMetadata`
   - create a fake task with `createFakeTask("task-clear-compaction-marker")`
   - set `Object.setPrototypeOf(fakeTask, Task.prototype)`
   - bind `fakeTask.persistLastPromptedPlaceholderWorkflowChecklistLabel` from `Task.prototype`
   - set `fakeTask.taskState.lastPromptedPlaceholderWorkflowChecklistLabel = "Step 1: Gather Context"`
   - call `await clearLastPromptedPlaceholderWorkflowChecklistLabelForContextCompaction.call(fakeTask)`
   - assert the in-memory field is `undefined`
   - assert the final saved metadata has `lastPromptedPlaceholderWorkflowChecklistLabel === undefined`

9. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add a new non-Responses subagent test immediately after `it("keeps focus-chain guidance in the system prompt on every internal turn when prompt refresh frequency is zero for non-Responses subagents", ...)`.

10. Name that new test exactly:

```ts
it("re-injects the active current-step block on the next non-Responses subagent turn after local compaction clears the marker", async () => {
```

11. In that test:
   - mirror the existing placeholder-workflow subagent setup from the tests around lines 1329-1379
   - stub `runner.shouldCompactBeforeNextRequest(...)` to return `true` for the second turn
   - stub `runner.compactConversationForContextWindow(...)` to return `{ didCompact: true, conversationHistoryDeletedRange: [2, 3] }`
   - keep the workflow checklist unchanged across both turns
   - assert the second user message text contains `# CURRENT WORKFLOW STEP`
   - assert the second user message text contains `Step 1: Gather Context`

12. In `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`, add a new OpenAI Responses subagent test immediately after `it("keeps continuation-turn placeholder workflow guidance out of local user content for OpenAI Responses subagents", ...)`.

13. Name that new test exactly:

```ts
it("re-injects the active current-step block on the next OpenAI Responses subagent turn after a context_compacted stream chunk", async () => {
```

14. In that test:
   - mirror the existing OpenAI Responses placeholder-workflow subagent setup from lines 1460-1655
   - make the first streamed response yield a `context_compacted` chunk before the tool call chunk
   - keep the workflow checklist unchanged across both turns
   - assert the second user message text contains `# CURRENT WORKFLOW STEP`
   - assert the second user message text contains `Step 1: Gather Context`

15. After all Step 5 edits, run exactly:

```bash
npm run test:unit -- \
  src/core/api/providers/__tests__/openai-native.test.ts \
  src/core/task/__tests__/placeholderWorkflowPersistence.test.ts \
  src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
```

16. If any additional failing test or required change appears outside the files listed in this step, stop and ask for input before proceeding.
