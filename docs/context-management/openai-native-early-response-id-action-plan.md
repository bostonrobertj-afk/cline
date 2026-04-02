---
title: OpenAI Native Early Response ID Fix
instructions:
  - Read every step in full before making any change.
  - Execute only the current step.
  - After completing a step, change its checkbox from "[ ]" to "[x]".
  - After completing a step, re-read the next step in full before proceeding.
  - Do not edit any file not listed in the current step's allowed-files list.
  - Do not widen scope or redesign the fix.
  - Stop and ask for input if any required change is not explicitly prescribed here.
---

# Action Plan

## Goal

Fix OpenAI native Responses chaining so interrupted native-tool turns persist the current turn's reusable `response.id` before `response.completed`, preventing replay of stale post-anchor context on the next chained request.

## Locked Scope

- Do not change `src/core/task/index.ts`. The task loop already consumes `response_id` chunks at `src/core/task/index.ts:4498-4500` and already persists assistant history with `id: responseId || requestId` at `src/core/task/index.ts:4764-4768`.
- Do not change `src/core/api/transform/openai-response-format.ts`. The anchor-selection logic is not the fix target.
- Do not add fallback heuristics, prompt changes, or context-rewrite logic.
- Do not modify `ApiStream` types in `src/core/api/transform/stream.ts`; `response_id` already exists there.

## Step 1

- [x] Emit `response_id` early from the OpenAI native Responses event stream.

Allowed files:
- `src/core/api/providers/openai-native.ts`

Exact edits:
- In `src/core/api/providers/openai-native.ts`, inside `processResponsesEvents(...)` at `src/core/api/providers/openai-native.ts:745-940`, add a local `emittedResponseIds` set near the existing function-call tracking maps.
- Before the existing `response.output_item.added` branch at `src/core/api/providers/openai-native.ts:756`, add two new branches for:
  - `chunk.type === "response.created"`
  - `chunk.type === "response.in_progress"`
- In each branch:
  - read `const responseId = chunk.response?.id`
  - if `responseId` is a non-empty string and has not already been emitted for this request, add it to `emittedResponseIds` and `yield { type: "response_id", id: responseId }`
- Leave the existing `response.completed` usage emission untouched at `src/core/api/providers/openai-native.ts:911-937`.
- Do not emit `response_id` from any other event type in this patch.
- Do not change existing `tool_calls`, `reasoning`, `context_compacted`, or `usage` behavior.

## Step 2

- [x] Add provider regression coverage for early response-id emission and deduplication.

Allowed files:
- `src/core/api/providers/__tests__/openai-native.test.ts`

Exact edits:
- In `src/core/api/providers/__tests__/openai-native.test.ts`, add one new test immediately after the existing compaction test at `src/core/api/providers/__tests__/openai-native.test.ts:387-449`.
- Name the test exactly:
  - `it("emits a single response_id before tool calls when Responses streaming starts a native tool turn", async () => { ... })`
- Use the existing `createAsyncIterable(...)` helper and the existing `OpenAiNativeHandler` setup pattern already used in this file.
- Stub `responses.create` to return an async iterable with these events in this exact order:
  1. `response.created` with `response.id = "resp_early_anchor_123"`
  2. `response.in_progress` with the same `response.id = "resp_early_anchor_123"`
  3. `response.output_item.added` for a function call item with:
     - `type: "function_call"`
     - `id: "fc_test_early_123"`
     - `call_id: "call_test_early_123"`
     - `name: "read_file"`
     - `arguments: ""`
  4. `response.function_call_arguments.delta` for the same item id with a non-empty JSON delta string
- Do not include `response.completed` in this new test; the test must model the interrupted pre-completion native-tool case.
- Drain `handler.createMessage(...)` into a `chunks` array, following the existing pattern in this file.
- Assert all of the following:
  - exactly one chunk has `type === "response_id"`
  - that chunk's `id` equals `"resp_early_anchor_123"`
  - at least one chunk has `type === "tool_calls"`
  - the first `response_id` chunk appears earlier in the `chunks` array than the first `tool_calls` chunk
- Add one second test immediately after it named exactly:
  - `it("does not emit duplicate response_id chunks when created and in_progress share the same response id", async () => { ... })`
- For that second test, reuse the same event pattern but omit tool-call events after `response.in_progress`.
- Assert that the drained `chunks` array contains exactly one `response_id` chunk for `"resp_early_anchor_123"`.

## Step 3

- [x] Run the focused regression command and stop if any additional failure appears.

Allowed files:
- None

Exact command:

```bash
npm run test:unit -- src/core/api/providers/__tests__/openai-native.test.ts
```

Completion criteria:
- The command exits successfully.
- No new file changes are made during this step.

## Consistency Notes

- The only new runtime contract introduced by this plan is early emission of the existing `response_id` chunk type.
- The provider should still emit `usage` with `id: chunk.response.id` on `response.completed`; this plan does not remove that behavior.
- The task loop should continue using the first available early `response_id` for interrupted tool turns without any task-layer edits.
