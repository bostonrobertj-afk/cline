# Execution Plan: `send_user_message`

## Objective

Introduce `send_user_message` as a new first-class response capability that gives the AI agent a clean, unconditional, always-available path for sending a user-visible message when more specialized response tools are not appropriate.

This tool must close the current response-gap between:

- `attempt_completion`
- `ask_followup_question`
- `generate_plan_output`
- `act_mode_respond`

It must support ordinary dialogue such as:

- acknowledgements
- lightweight clarifications
- short reactions
- brief status statements
- conversational steering that is not a question and not a completion

## Non-Negotiable Requirements

The implementation must satisfy all of the following:

1. `send_user_message` must be available in both ACT and PLAN mode.
2. `send_user_message` must not be hidden by `contextRequirements`.
3. `send_user_message` must not be restricted by `yoloModeToggled`.
4. `send_user_message` must not be rejected because of current mode.
5. `send_user_message` must not have any consecutive-call block.
6. `send_user_message` must not require a follow-up tool call after use.
7. `send_user_message` must not be framed as a progress-only tool.
8. `send_user_message` must not be framed as a plan-only tool.
9. `send_user_message` must be presented in prompting as the general fallback response tool when specialized response tools are not the right fit.
10. `send_user_message` must be included in every prompt/tool schema variant so it is actually available to the agent at runtime.

## Current Gap

Today, the runtime and prompt stack do not provide a clean general-purpose message lane:

- `attempt_completion` is specialized for completion/final answers.
- `ask_followup_question` is specialized for questions.
- `generate_plan_output` is framed as plan presentation.
- `act_mode_respond` is ACT-only, constrained, and explicitly filtered by extra behavior.

That leaves no obvious, always-valid tool for messages like:

- "That is a good choice."
- "I agree with that direction."
- "I see the issue."
- "I should correct my previous assumption."
- "That constraint changes the approach."

## Design Decision

`send_user_message` should be implemented as a minimal wrapper around the existing non-blocking text-output path rather than inventing a new UI surface.

The recommended implementation is:

- reuse `Task.say("text", ...)`
- do not introduce a new `ClineSay` type unless a later UX requirement proves it necessary
- do not use `ask(...)`
- do not use `completion_result`
- do not couple the tool to task-progress semantics

This keeps the tool simple, predictable, and deployable without unnecessary webview/proto churn.

## Proposed Behavior

### Tool semantics

`send_user_message` is the general-purpose tool for sending a direct user-visible message when:

- the agent is not completing the task
- the agent is not asking a question
- the agent is not specifically presenting a plan
- the agent is not merely emitting a constrained progress preamble

### Recommended parameters

Keep the schema intentionally narrow:

- `message`: required string

Do not add:

- `needs_more_exploration`
- mode fields
- approval fields
- mandatory progress metadata
- tool-followup instructions

An optional `task_progress` parameter could be added later if there is a real product need, but it should not be part of the first implementation unless there is already a hard dependency on it.

## Implementation Plan

### 1. Add the new canonical tool id

Update [src/shared/tools.ts](../src/shared/tools.ts):

- add `SEND_USER_MESSAGE = "send_user_message"` to `ClineDefaultTool`
- include it in any tool-name lists derived from the enum automatically
- add it to `READ_ONLY_TOOLS`

Rationale:

- it does not mutate the workspace
- it should be treated as a safe, non-destructive messaging tool

### 2. Add the prompt tool spec

Create a new prompt-tool definition:

- [src/core/prompts/system-prompt/tools/send_user_message.ts](../src/core/prompts/system-prompt/tools/send_user_message.ts)

This file should define variants for:

- `ModelFamily.GENERIC`
- `ModelFamily.NATIVE_GPT_5`
- `ModelFamily.NATIVE_NEXT_GEN`
- `ModelFamily.GEMINI_3`

The description should explicitly say:

- use this to send a user-visible message when other response tools are not appropriate or available
- this tool is available in both ACT and PLAN mode
- this tool is not limited to progress updates
- this tool is not limited to plan presentation
- this tool should not be used for final task completion when `attempt_completion` is the correct tool
- this tool should not be used when a real question should be asked with `ask_followup_question`

The spec must not define:

- `contextRequirements`
- mode-based restrictions
- special conditional availability text

### 3. Export and register the tool spec

Update:

- [src/core/prompts/system-prompt/tools/index.ts](../src/core/prompts/system-prompt/tools/index.ts)
- [src/core/prompts/system-prompt/tools/init.ts](../src/core/prompts/system-prompt/tools/init.ts)

Required changes:

- export `send_user_message`
- import `send_user_message_variants`
- register those variants in `registerClineToolSets()`

### 4. Add the runtime handler

Create:

- [src/core/task/tools/handlers/SendUserMessageHandler.ts](../src/core/task/tools/handlers/SendUserMessageHandler.ts)

Recommended behavior:

- implement `IToolHandler`
- optionally implement `IPartialBlockHandler` so partial text can stream through the same `text` lane
- validate that `message` exists
- call `config.callbacks.say("text", message, undefined, undefined, false)`
- return a neutral success result such as `[Message displayed.]`

The handler must not:

- check `config.mode`
- check `taskState.lastToolName`
- increment mistakes for using the tool in the "wrong" mode
- tell the model it must use another tool next
- block consecutive `send_user_message` calls

### 5. Register the runtime handler

Update [src/core/task/tools/ToolExecutorCoordinator.ts](../src/core/task/tools/ToolExecutorCoordinator.ts):

- import `SendUserMessageHandler`
- add a `toolHandlersMap` entry for `ClineDefaultTool.SEND_USER_MESSAGE`

This is the runtime gate that ensures the tool is actually executable once emitted by the model.

### 6. Make the tool available in every prompt variant

Update the tool lists in all prompt-variant configs so `send_user_message` is always exposed in tool schemas.

Expected files include:

- [src/core/prompts/system-prompt/variants/config.template.ts](../src/core/prompts/system-prompt/variants/config.template.ts)
- [src/core/prompts/system-prompt/variants/generic/config.ts](../src/core/prompts/system-prompt/variants/generic/config.ts)
- [src/core/prompts/system-prompt/variants/gpt-5/config.ts](../src/core/prompts/system-prompt/variants/gpt-5/config.ts)
- [src/core/prompts/system-prompt/variants/native-gpt-5/config.ts](../src/core/prompts/system-prompt/variants/native-gpt-5/config.ts)
- [src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts](../src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts)
- [src/core/prompts/system-prompt/variants/native-next-gen/config.ts](../src/core/prompts/system-prompt/variants/native-next-gen/config.ts)
- [src/core/prompts/system-prompt/variants/next-gen/config.ts](../src/core/prompts/system-prompt/variants/next-gen/config.ts)
- [src/core/prompts/system-prompt/variants/gemini-3/config.ts](../src/core/prompts/system-prompt/variants/gemini-3/config.ts)
- [src/core/prompts/system-prompt/variants/hermes/config.ts](../src/core/prompts/system-prompt/variants/hermes/config.ts)
- [src/core/prompts/system-prompt/variants/glm/config.ts](../src/core/prompts/system-prompt/variants/glm/config.ts)
- [src/core/prompts/system-prompt/variants/devstral/config.ts](../src/core/prompts/system-prompt/variants/devstral/config.ts)
- [src/core/prompts/system-prompt/variants/trinity/config.ts](../src/core/prompts/system-prompt/variants/trinity/config.ts)
- [src/core/prompts/system-prompt/variants/xs/config.ts](../src/core/prompts/system-prompt/variants/xs/config.ts)

Implementation rule:

- `send_user_message` should be added everywhere the product expects the model to be able to talk to the human
- it must not be exposed only for a subset of providers unless there is a proven tool-schema incompatibility

### 7. Update prompt copy so the tool is clearly defined as the fallback response lane

Update [src/core/prompts/system-prompt/components/response_tools.ts](../src/core/prompts/system-prompt/components/response_tools.ts):

- add `send_user_message` to the response-tool section
- include it in both ACT-mode and PLAN-mode response tool lists
- describe it as the tool to use when other, more specialized response tools are not appropriate or available

Recommended prompt positioning:

- `attempt_completion`: specialized final/completion response
- `ask_followup_question`: specialized question response
- `generate_plan_output`: specialized plan presentation response
- `act_mode_respond`: specialized ACT-mode progress/preamble response
- `send_user_message`: general-purpose user-visible message fallback

Also update any prompt copy that currently overclaims exclusivity for narrower tools.

### 8. Update variant-specific overrides that steer response behavior

Review and update prompt overrides that currently push the model into overly narrow response lanes.

Priority files:

- [src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts](../src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts)
- [src/core/prompts/system-prompt/variants/gemini-3/overrides.ts](../src/core/prompts/system-prompt/variants/gemini-3/overrides.ts)
- other variant overrides that mention `act_mode_respond`, `generate_plan_output`, or exclusive reply behavior

Required adjustment:

- `send_user_message` must be described as a valid, normal tool for ordinary direct communication with the user
- overrides must not present it as second-class, exceptional, or "only if forced"

### 9. Update compact tool descriptions and schema-adjacent helpers

Review [src/core/prompts/system-prompt/spec.ts](../src/core/prompts/system-prompt/spec.ts) and related prompt/spec helpers for any places that:

- enumerate response tools
- generate concise descriptions
- assume only the existing response tools exist

Add `send_user_message` where needed so native-function and schema-generation paths stay aligned with prompt copy.

### 10. Update prompt tests and snapshots

Expected test surfaces include:

- [src/core/prompts/system-prompt/__tests__](../src/core/prompts/system-prompt/__tests__)
- prompt snapshots under `__snapshots__`
- any integration tests that assert response-tool availability or prompt text

Required assertions:

- `send_user_message` appears in ACT-mode response guidance
- `send_user_message` appears in PLAN-mode response guidance
- `send_user_message` is not removed by `yoloModeToggled`
- `send_user_message` appears in tool schemas for every supported variant

### 11. Add handler tests

Create a focused runtime test similar to the existing tool-handler tests, likely under:

- [src/core/task/tools/handlers/__tests__](../src/core/task/tools/handlers/__tests__)

Test cases should cover:

1. normal success path with a valid message
2. missing required `message` param returns the expected missing-param error
3. ACT mode usage succeeds
4. PLAN mode usage succeeds
5. back-to-back `send_user_message` calls both succeed
6. success does not require a follow-up tool call
7. success does not mutate mode-related state or apply hidden filtering

### 12. Verify parser/translator surfaces if tool names are surfaced outside prompt schemas

Review these areas for tool-name awareness or user-visible tool labeling:

- [src/core/assistant-message/parse-assistant-message.ts](../src/core/assistant-message/parse-assistant-message.ts)
- [src/core/assistant-message/index.ts](../src/core/assistant-message/index.ts)
- [src/core/task/StreamResponseHandler.ts](../src/core/task/StreamResponseHandler.ts)
- any CLI/webview translator code that maps tool names to visible labels

If the system already handles tools generically, no change is needed. If any allowlists or switch statements exist, add `send_user_message` there.

## Deployment Strategy

### Phase 1: Runtime and schema foundation

Implement:

- enum entry
- prompt tool spec
- handler
- handler registration
- variant inclusion

Goal:

- the model can emit `send_user_message`
- runtime accepts it everywhere
- the user sees the message

### Phase 2: Prompt contract alignment

Implement:

- `response_tools.ts` changes
- override changes
- concise tool-description alignment
- snapshot updates

Goal:

- prompting matches runtime truth
- the model is explicitly taught when to use `send_user_message`

### Phase 3: Validation and release

Implement:

- unit tests
- prompt tests
- variant exposure verification
- manual smoke tests

Goal:

- confirm no hidden gates or unintended exclusions remain

## Validation Checklist

### Static validation

Run:

```bash
npx biome check src/shared/tools.ts src/core/prompts/system-prompt/components/response_tools.ts src/core/prompts/system-prompt/spec.ts src/core/prompts/system-prompt/tools/send_user_message.ts src/core/task/tools/ToolExecutorCoordinator.ts src/core/task/tools/handlers/SendUserMessageHandler.ts
```

```bash
npx tsc --noEmit --pretty false
```

### Unit and prompt validation

Run the targeted unit tests for:

- prompt rendering
- tool schema generation
- tool-handler behavior

If existing test commands already cover these areas, use the repo-standard commands rather than inventing one-off runners.

### Manual smoke tests

Validate at least the following cases:

1. ACT mode, user says something that merits a short acknowledgement. The model can use `send_user_message`.
2. PLAN mode, user says something that merits a short acknowledgement. The model can use `send_user_message`.
3. The model uses `send_user_message` twice in a row without rejection.
4. `yoloModeToggled === true` does not remove `send_user_message` from the response options.
5. A native function-calling model can see and use the tool.
6. A non-native XML-style model can see and use the tool.
7. The message is delivered as a normal user-visible text output.

## Acceptance Criteria

The implementation is complete only when all of the following are true:

- `send_user_message` exists as a registered runtime tool.
- `send_user_message` appears in every supported prompt variant tool list.
- `send_user_message` has no mode gate.
- `send_user_message` has no consecutive-use gate.
- `send_user_message` has no context gate.
- `send_user_message` is described in prompt copy as the fallback user-message tool.
- the user can receive a message from it in both ACT and PLAN mode.
- back-to-back uses succeed.
- prompt tests and runtime tests pass.
- TypeScript and Biome pass.

## Non-Goals

This execution should not:

- replace `attempt_completion`
- replace `ask_followup_question`
- replace `generate_plan_output`
- replace `act_mode_respond`
- redesign the chat UI
- add a new message rendering type unless the existing `text` lane proves insufficient

The goal is not to remove specialized tools. The goal is to add a clean general-purpose response lane that fills the current gap.

## Recommended Commit Sequence

Use a small, reviewable commit series:

1. add `send_user_message` enum, spec, and handler
2. register it everywhere in runtime and prompt variants
3. update response-tool prompt copy and overrides
4. add tests and snapshots
5. run validation and package smoke-test

This sequence makes it easy to isolate failures if a provider-specific prompt/config path is missed.
