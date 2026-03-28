# Agent Feedback Requirements

## Purpose

Add an `agent_feedback` capability that lets the agent attach real-time feedback to specific response tool calls when it encounters meaningful difficulty, ambiguity, instability, or blocking conditions.

This feature exists to:

- surface agent difficulty to the user immediately in the chat UI
- create a user-sendable audit artifact that can be reviewed later for product optimization
- preserve a reliable record of feedback events with lightweight metadata

## In Scope

- `agent_feedback` may be provided only on these response tools:
  - `send_user_message`
  - `ask_followup_question`
  - `attempt_completion`
  - `generate_plan_output`
- `agent_feedback` is optional.
- When present, it must be handled consistently across prompting, schema, runtime, UI, logging, and persistence.

## Functional Requirements

### 1. Supported Tool Scope

- The system must allow `agent_feedback` only on the four supported response tools listed above.
- The system must not expose `agent_feedback` on any other tool.
- `agent_feedback` must appear in the schema whenever one of the four supported response tools is present in the active schema.

### 2. UI Behavior

- When a supported response tool call includes `agent_feedback`, the feedback message must render immediately beneath that response tool's primary user-facing artifact in the chat UI.
- The rendered feedback must be clearly labelled:
  - `Real-Time Agent Feedback`
- The agent feedback presentation must be visually distinct from normal user-authored feedback and must not be represented as if it came from the user.

### 3. Logging

- When `agent_feedback` is included, the runtime must emit log lines using existing runtime logging mechanisms.
- Each emitted log entry must include:
  - a timestamp
  - the response tool name
  - conversation-turn metadata sufficient to identify when the feedback occurred

### 4. User-Visible Audit File

- The system must maintain a single user-visible audit file for `agent_feedback` events.
- That audit file must be easy for a user to locate and send externally.
- That audit file must be easy to copy into this repo for later product analysis and optimization.
- The audit file must contain only entries from the most recent 7 days.
- Older entries must be pruned automatically so the file remains a rolling 7-day audit window.
- Each persisted audit entry must include:
  - the feedback message
  - a timestamp
  - the response tool name
  - conversation-turn metadata sufficient to identify when the feedback occurred

### 5. Prompting

- Prompting must teach the agent that `agent_feedback` is for meaningful blockers or materially confusing/ambiguous situations that affect correctness or progress.
- Prompting must not encourage routine or noisy use of `agent_feedback`.
- A shared prompt string should be used so the same instruction can be applied in:
  - the main Tool Use guidance
  - continuation-turn prompting

## Data Requirements

- `agent_feedback` must be an object parameter.
- The required data model for v1 is:
  - `message: string`
- The `message` must be a concise description of the problem, ambiguity, instability, or blocker the agent encountered.

## Behavior Constraints

- `agent_feedback` must accompany the supported response tool call that triggered it; it is not a standalone response mode.
- The feature must preserve the existing meaning of user-authored feedback pathways.
- Agent-authored feedback must not be stored or displayed as if it were existing `user_feedback`.

## Known Blast Radius

The following existing files are expected to be in scope for implementation.

### Response Tool Schema Files

- [send_user_message.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/send_user_message.ts)
- [ask_followup_question.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/ask_followup_question.ts)
- [attempt_completion.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts)
- [generate_plan_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/generate_plan_output.ts)
- [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts)
- [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts)

### Prompting And Prompt Assembly

- [response_tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/response_tools.ts)
- [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts)

### Response Tool Runtime And Handlers

- [SendUserMessageHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SendUserMessageHandler.ts)
- [AskFollowupQuestionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AskFollowupQuestionToolHandler.ts)
- [AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts)
- [PlanModeRespondHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PlanModeRespondHandler.ts)
- [ResponseToolRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRuntime.ts)
- [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts)

### Message Types, Persistence, And Audit Storage

- [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
- [cline-message.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto-conversions/cline-message.ts)
- [message-state.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/message-state.ts)
- [disk.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/storage/disk.ts)

### UI Rendering

- [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)

### Logging

- [Logger.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/services/Logger.ts)
- [common.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/common.ts)

### Tests Expected To Change

- [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts)
- [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)
- [SendUserMessageHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/SendUserMessageHandler.test.ts)
- [AskFollowupQuestionToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/AskFollowupQuestionToolHandler.test.ts)
- [AttemptCompletionHandler.postCompletionFollowup.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts)
- [PlanModeRespondHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/PlanModeRespondHandler.test.ts)
- [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts)
- [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx)

## Companion Specification

Exact structural and implementation-facing decisions for this feature live in:

- [specification.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-feedback/specification.md)
