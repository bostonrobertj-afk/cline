---
title: Responses API Resume Chaining Action Plan
scope: Resume OpenAI Responses API threads from stored previous_response_id anchors without replaying the full historical transcript when a stored chain is still reusable.
execution:
  - Read this frontmatter first and follow it literally.
  - Read each step in full before making any change.
  - Execute only the current step.
  - After completing a step, update that step's checkbox from [ ] to [x].
  - Then stop and read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Do not widen scope beyond the allowed-files list for the current step.
  - Do not make any change that is not explicitly prescribed in this plan.
  - Use apply_patch for all file edits.
  - Run only the exact verification command listed in Step 4.
  - If any ambiguity is discovered, or any additional change appears necessary but is not explicitly prescribed here, stop immediately and ask for input before proceeding.
---

# Scope

This plan covers only the Responses API resume-chaining policy for stored OpenAI response chains.

It does not cover:
- generic task suspend/resume UX
- focus-chain persistence or deterministic workflow progression
- attempt_completion behavior
- websocket-only response-chain behavior
- non-OpenAI providers

# Background

The current codebase still applies a local 23-hour cutoff before it will reuse a stored `previous_response_id`. That cutoff exists in both the shared OpenAI Responses transform and the non-native OpenAI provider path, and it is what forces the system back to full-history replay even when a stored OpenAI Responses chain is still available.

The current resume path in `Task.resumeTaskFromHistory(...)` also rewrites `apiConversationHistory` and folds the previous user message into the new request payload. That behavior is necessary only when the next request must rebuild full context. It should not run when the current provider can continue from a stored OpenAI Responses anchor.

# Action Plan

- [x] Step 1: Remove the stale 23-hour reuse gate and centralize reusable response-anchor discovery
  - Allowed files:
    - `docs/responses-api-resume-chaining-action-plan.md`
    - `src/core/api/transform/openai-response-format.ts`
    - `src/core/api/providers/openai.ts`
  - Read [openai-response-format.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/transform/openai-response-format.ts#L74) through [openai-response-format.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/transform/openai-response-format.ts#L118) before editing.
  - Read [openai.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/providers/openai.ts#L265) through [openai.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/providers/openai.ts#L286) before editing.
  - In [openai-response-format.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/transform/openai-response-format.ts#L74), add a new exported helper immediately above `convertToOpenAIResponsesInput(...)` named `findLatestReusablePreviousResponseAnchor(...)`.
  - That helper must accept:
    - `messages: ClineStorageMessage[]`
    - `options?: { previousResponseProviderIds?: string[] }`
  - That helper must return:
    - `previousResponseId?: string`
    - `previousResponseIdChainBreakReason?: string`
    - `nextMessageIndex: number`
  - The helper must scan backward exactly once and implement this logic:
    - if it hits `previousResponseIdChainBroken === true`, stop immediately and return no `previousResponseId`, the stored break reason (or `"stored_chain_break_boundary"`), and `nextMessageIndex: 0`
    - otherwise, pick the latest assistant message whose `modelInfo.providerId` is in the supplied provider-id set and whose `id` is a non-empty string
    - when a matching assistant message is found, return that `id` and `nextMessageIndex: i + 1`
    - do not inspect `ts`
    - do not compare message age against 23 hours, 24 hours, or any other duration
  - Still in [openai-response-format.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/transform/openai-response-format.ts#L82), replace the inline backward scan inside `convertToOpenAIResponsesInput(...)` with a call to `findLatestReusablePreviousResponseAnchor(...)`.
  - Use the helper return values to set:
    - `previousResponseId`
    - `previousResponseIdChainBreakReason`
    - `messages = _messages.slice(nextMessageIndex)` only when `previousResponseId` is present
  - Remove the outdated 24-hour / 23-hour comment from [openai-response-format.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/transform/openai-response-format.ts#L97) and replace it with a comment that says the helper chooses the latest reusable stored Responses anchor unless an explicit chain-break boundary blocks reuse.
  - In [openai.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/providers/openai.ts#L19), add an import for `findLatestReusablePreviousResponseAnchor` from `../transform/openai-response-format`.
  - In [openai.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/providers/openai.ts#L265), remove the local backward scan entirely.
  - Replace it with a call to `findLatestReusablePreviousResponseAnchor(messages, { previousResponseProviderIds: ["openai"] })`.
  - Set `previousResponseId` from the helper result and set `inputMessages = messages.slice(anchor.nextMessageIndex)` only when `previousResponseId` exists.
  - Do not add any new age-based gate in `openai.ts`.

- [x] Step 2: Make task resume preserve stored API history when the current provider can continue from a stored Responses anchor
  - Allowed files:
    - `docs/responses-api-resume-chaining-action-plan.md`
    - `src/core/task/index.ts`
  - Read [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L258) through [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L320), [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2257), and [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2416) through [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2557) before editing.
  - In [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1), add an import for `findLatestReusablePreviousResponseAnchor` from `@core/api/transform/openai-response-format`.
  - In the exported-helper section of [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L258), add a new exported pure helper named `prepareApiConversationHistoryForResume(...)`.
  - That helper must accept:
    - `existingApiConversationHistory: ClineStorageMessage[]`
    - `providerInfo: Pick<ApiProviderInfo, "providerId" | "model">`
  - That helper must return:
    - `resumeUsesStoredResponsesChain: boolean`
    - `apiConversationHistory: ClineStorageMessage[]`
    - `carryForwardUserContent: ClineContent[]`
  - The helper must implement this exact policy:
    - only attempt stored-chain resume when `providerInfo.providerId` is `"openai"` or `"openai-native"`
    - only attempt stored-chain resume when `providerInfo.model.info.apiFormat === ApiFormat.OPENAI_RESPONSES`
    - call `findLatestReusablePreviousResponseAnchor(existingApiConversationHistory, { previousResponseProviderIds: [providerInfo.providerId] })`
    - if that helper returns a `previousResponseId`, return:
      - `resumeUsesStoredResponsesChain: true`
      - `apiConversationHistory: existingApiConversationHistory`
      - `carryForwardUserContent: []`
    - otherwise, preserve the current fallback behavior:
      - if history is empty, return empty history and empty carry-forward content
      - if the last history message is `assistant`, return the history unchanged and empty carry-forward content
      - if the last history message is `user`, remove that last user message from the returned history and return its content as `carryForwardUserContent`
      - if the last history message is neither `assistant` nor `user`, keep the current thrown error behavior
  - In [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2416), delete the inline `modifiedApiConversationHistory` / `modifiedOldUserContent` construction block.
  - Replace it with:
    - `const providerInfo = this.getCurrentProviderInfo()`
    - `const resumeConversationState = prepareApiConversationHistoryForResume(existingApiConversationHistory, providerInfo)`
    - `newUserContent.push(...resumeConversationState.carryForwardUserContent)`
  - In [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2555), change the overwrite call so it runs only when `resumeConversationState.resumeUsesStoredResponsesChain === false`.
  - Leave all of these behaviors unchanged in this step:
    - `taskResumptionMessage`
    - `"Latest human-authored input for the reopened thread"` framing
    - pending file-context warning injection
    - `TaskResume` and `UserPromptSubmit` hooks
    - `nextApiRequestIncludesHumanAuthoredInput`
  - The intended end state for this step is:
    - if the current provider can continue from a stored OpenAI Responses anchor, the resume turn keeps `apiConversationHistory` intact and sends only fresh resume-time context plus the new human input
    - if no reusable stored anchor exists, the current full-history replay behavior remains intact

- [x] Step 3: Add regression coverage for aged stored anchors and resume-policy branching
  - Allowed files:
    - `docs/responses-api-resume-chaining-action-plan.md`
    - `src/core/api/transform/__tests__/openai-response-format.test.ts`
    - `src/core/api/providers/__tests__/openai.test.ts`
    - `src/core/task/__tests__/responsesResumePolicy.test.ts`
  - Read [openai-response-format.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/transform/__tests__/openai-response-format.test.ts#L57), [openai.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/providers/__tests__/openai.test.ts#L289), and the new helper added in Step 2 before editing.
  - In [openai-response-format.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/transform/__tests__/openai-response-format.test.ts#L57), replace the current provider-specific chaining test data so the assistant message timestamp is `Date.now() - 48 * 60 * 60 * 1000`.
  - Keep the assertion outcome the same: the test must still expect `previousResponseId === "resp_456"` and only the post-anchor tool-output item in `input`.
  - Add one new test to [openai.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/providers/__tests__/openai.test.ts) immediately after the existing fallback-usage test block.
  - That new provider test must:
    - create an `OpenAiHandler`
    - stub `responses.create`
    - pass `messages` containing an assistant message with:
      - `id: "resp_prev_chain_aged"`
      - `ts: Date.now() - 48 * 60 * 60 * 1000`
      - `modelInfo.providerId: "openai"`
    - include one trailing user message `"continue"`
    - drain `handler.createMessage(...)`
    - assert the first request params contain `previous_response_id === "resp_prev_chain_aged"`
  - Create a new file [responsesResumePolicy.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/responsesResumePolicy.test.ts).
  - In that new file, add tests for `prepareApiConversationHistoryForResume(...)` covering exactly these two cases:
    - `openai-native` + `ApiFormat.OPENAI_RESPONSES` + a reusable assistant anchor older than 48 hours + trailing user message:
      - expect `resumeUsesStoredResponsesChain === true`
      - expect returned `apiConversationHistory` length to remain unchanged
      - expect `carryForwardUserContent` to be empty
    - `openai-native` + `ApiFormat.OPENAI_RESPONSES` + an explicit `previousResponseIdChainBroken` assistant boundary followed by a trailing user message:
      - expect `resumeUsesStoredResponsesChain === false`
      - expect the returned history to omit the trailing user message
      - expect `carryForwardUserContent` to contain that removed user content
  - Do not edit [openai-native.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts) in this plan.
  - Do not add any task-resume webview/controller integration tests in this plan.

- [x] Step 4: Run the exact verification command
  - Allowed files:
    - `docs/responses-api-resume-chaining-action-plan.md`
  - Run exactly this command and no other verification command:
```bash
npm run test:unit -- src/core/api/transform/__tests__/openai-response-format.test.ts src/core/api/providers/__tests__/openai.test.ts src/core/task/__tests__/responsesResumePolicy.test.ts --exit
```
  - If this exact command fails, stop and ask for input before making any further changes.
