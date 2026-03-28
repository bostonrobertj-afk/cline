---
title: Agent Feedback Action Plan
execution_instructions:
  - Read each step in full before executing that step.
  - Execute only the current step.
  - After completing a step, update that step's `[ ]` checkbox to `[x]`.
  - After updating the completed step's checkbox, return to this document and read the next step in full before making additional changes.
  - Do not execute any later step based on stale context, memory, or assumptions about what a later step might require.
  - If any ambiguity is discovered, or any necessary code or test change is not explicitly prescribed in this document, stop and ask for input before proceeding.
  - Do not widen scope beyond the files explicitly allowed in the current step.
---

# Agent Feedback Action Plan

This action plan implements the requirements in:

- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-feedback/requirements.md)
- [specification.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-feedback/specification.md)

## Implementation Decisions Locked For This Plan

These decisions are mandatory for this implementation pass and must not be changed by the executing agent:

- The supported tools are exactly:
  - `send_user_message`
  - `ask_followup_question`
  - `attempt_completion`
  - `generate_plan_output`
- `generate_plan_output` supports `agent_feedback` only on the normal user-facing response branch.
- If `generate_plan_output` is called with `needs_more_exploration=true`, `agent_feedback` must be rejected for that tool call.
- The shared prompt string must be exactly:
  - `- If you hit a meaningful blocker, material ambiguity, or unstable behavior that affects correctness or progress, include \`agent_feedback\` on your response tool call with a concise description of the issue.`
- The new persisted/UI message type must be:
  - `agent_feedback`
- The UI label must be exactly:
  - `Real-Time Agent Feedback`
- The audit file path must be exactly:
  - `~/Documents/Cline/Audits/agent-feedback-audit.jsonl`
- The audit file format must be JSONL.
- The audit file must keep only entries from the last 7 days.
- The audit entry field names must be exactly:
  - `timestamp`
  - `taskId`
  - `toolName`
  - `message`
  - `turnIdentifier`
  - `apiCallIdentifier`
- The shared schema constant names must be exactly:
  - `AGENT_FEEDBACK_PARAMETER`
  - `AGENT_FEEDBACK_PROMPT_GUIDANCE`
- The shared runtime helper file must be exactly:
  - [agent-feedback.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/agent-feedback.ts)
- The shared runtime helper exports must be exactly:
  - `readAgentFeedbackMessage`
  - `buildAgentFeedbackAuditEntry`
  - `emitAgentFeedback`
- The new shared UI payload interface name must be exactly:
  - `ClineSayAgentFeedback`
- The new storage helper exports in [disk.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/storage/disk.ts) must be exactly:
  - `ensureAuditsDirectoryExists`
  - `getAgentFeedbackAuditFilePath`
  - `pruneAgentFeedbackAuditEntries`
  - `appendAgentFeedbackAuditEntry`

## Files Explicitly Not To Modify

- `/Users/robertboston/Documents/Cline Extension/cline/docs/agent-feedback/requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/agent-feedback/specification.md`
- any file under `/Users/robertboston/Documents/Cline/Workflows/`
- any snapshot file

## Step 1: Add Shared Schema Primitives

### Allowed Files

- [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts)
- [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts)

### Required Changes

1. Update [types.ts:280-290](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts#L280) by leaving `TASK_PROGRESS_PARAMETER` intact and appending two new exports immediately after it:
   - `AGENT_FEEDBACK_PROMPT_GUIDANCE`
   - `AGENT_FEEDBACK_PARAMETER`

2. `AGENT_FEEDBACK_PROMPT_GUIDANCE` must be defined exactly as:

```ts
export const AGENT_FEEDBACK_PROMPT_GUIDANCE =
	"- If you hit a meaningful blocker, material ambiguity, or unstable behavior that affects correctness or progress, include `agent_feedback` on your response tool call with a concise description of the issue."
```

3. `AGENT_FEEDBACK_PARAMETER` must be defined exactly as an optional object parameter with this effective shape:
   - `name: "agent_feedback"`
   - `required: false`
   - `type: "object"`
   - `instruction: "Optional object for real-time agent feedback when you encounter a meaningful blocker, material ambiguity, or unstable behavior that affects correctness or progress."`
   - `description: "Optional real-time agent feedback attached to this response tool call."`
   - `properties.message.type: "string"`
   - `properties.message.description: "Concise description of the blocker, ambiguity, instability, or confusing scenario."`
   - `requiredProperties: ["message"]`
   - `additionalProperties: false`
   - `usage: '{"message":"Concise description of the blocker or ambiguity."}'`

4. Update [spec.ts:21-46](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L21) to extend `ClineToolSpecParameter` with:
   - `requiredProperties?: string[]`

5. Update the OpenAI schema builder in [spec.ts:79-120](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L79):
   - after `paramSchema.properties = param.properties`, add:
     - `paramSchema.required = param.requiredProperties` when `param.requiredProperties?.length`
   - add `"requiredProperties"` to the `reservedKeys` set so it is not copied through a second time

6. Update the Anthropic schema builder in [spec.ts:172-214](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L172):
   - after `paramSchema.properties = param.properties`, add:
     - `paramSchema.required = param.requiredProperties` when `param.requiredProperties?.length`
   - add `"requiredProperties"` to the `reservedKeys` set

7. Update the Google schema builder in [spec.ts:270-300](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L270):
   - after building `paramSchema.properties`, set:
     - `paramSchema.required = param.requiredProperties` when `param.requiredProperties?.length`
   - do not invent a different field name for Google
   - leave the existing `enum` propagation intact

8. Do not make any other edits in this step.

## Step 2: Add `agent_feedback` To The Four Supported Tool Schemas

### Allowed Files

- [send_user_message.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/send_user_message.ts)
- [ask_followup_question.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/ask_followup_question.ts)
- [attempt_completion.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts)
- [generate_plan_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/generate_plan_output.ts)

### Required Changes

1. In each of the four files above, update the import from `../types` so it includes `AGENT_FEEDBACK_PARAMETER`.

2. In [send_user_message.ts:25-34](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/send_user_message.ts#L25) and [send_user_message.ts:43-50](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/send_user_message.ts#L43):
   - insert `AGENT_FEEDBACK_PARAMETER` immediately after the required `message` parameter and before `TASK_PROGRESS_PARAMETER`

3. In [ask_followup_question.ts:13-29](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/ask_followup_question.ts#L13) and [ask_followup_question.ts:39-52](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/ask_followup_question.ts#L39):
   - insert `AGENT_FEEDBACK_PARAMETER` immediately after the `options` parameter and before `TASK_PROGRESS_PARAMETER`

4. In [attempt_completion.ts:13-38](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts#L13), [attempt_completion.ts:47-73](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts#L47), and [attempt_completion.ts:82-101](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/attempt_completion.ts#L82):
   - insert `AGENT_FEEDBACK_PARAMETER` immediately after the optional `command` parameter and before any `task_progress` parameter

5. In [generate_plan_output.ts:32-57](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/generate_plan_output.ts#L32), [generate_plan_output.ts:67-79](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/generate_plan_output.ts#L67), and [generate_plan_output.ts:89-112](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/generate_plan_output.ts#L89):
   - insert `AGENT_FEEDBACK_PARAMETER` immediately before `task_progress`
   - do not add `needs_more_exploration` to `NATIVE_GPT_5` or `NATIVE_NEXT_GEN` in this pass
   - do not add any schema-level conditional hiding for `agent_feedback`; the `needs_more_exploration=true` restriction is enforced at runtime in Step 5

6. Do not add `agent_feedback` to any other tool file.

## Step 3: Add The Distinct Message Type And Proto Support

### Allowed Files

- [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
- [ui.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/ui.proto)
- [ui.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto/cline/ui.ts)
- [cline-message.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto-conversions/cline-message.ts)

### Required Changes

1. In [ExtensionMessage.ts:179-217](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L179):
   - add `"agent_feedback"` to the `ClineSay` union immediately after `"reasoning"` and before `"completion_result"`

2. In [ExtensionMessage.ts:350-360](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L350):
   - insert a new interface named `ClineSayAgentFeedback` immediately before `ClinePlanModeResponse`
   - its fields must be exactly:
     - `label: "Real-Time Agent Feedback"`
     - `message: string`
     - `timestamp: string`
     - `toolName: string`
     - `taskId: string`
     - `turnIdentifier: number`
     - `apiCallIdentifier: number`

3. In [ui.proto:57-95](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/ui.proto#L57):
   - add a new enum member:
     - `AGENT_FEEDBACK = 7;`
   - renumber every existing `ClineSay` member after `COMPLETION_RESULT_SAY` by +1 so there are no duplicate numeric values
   - do not change enum names other than inserting the new member

4. After editing `ui.proto`, run:
   - `npm run protos`

5. Do not hand-edit generated output except if `npm run protos` leaves formatting that must be preserved automatically.

6. In [cline-message.ts:179-218](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto-conversions/cline-message.ts#L179):
   - map `agent_feedback` to `ClineSay.AGENT_FEEDBACK`

7. In [cline-message.ts:231-269](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/proto-conversions/cline-message.ts#L231):
   - map `ClineSay.AGENT_FEEDBACK` back to `"agent_feedback"`

8. Do not add any new ask types.

## Step 4: Add Audit Storage And Shared Runtime Helper

### Allowed Files

- [disk.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/storage/disk.ts)
- [agent-feedback.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/agent-feedback.ts)

### Required Changes

1. In [disk.ts:44-69](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/storage/disk.ts#L44):
   - do not add `agent-feedback-audit.jsonl` to `GlobalFileNames`
   - keep the audit file as a Documents-based path helper, not task storage

2. In [disk.ts:158-220](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/storage/disk.ts#L158), append these new exported helpers after the existing directory helpers:
   - `ensureAuditsDirectoryExists()`
   - `getAgentFeedbackAuditFilePath()`

3. `ensureAuditsDirectoryExists()` must:
   - call `getDocumentsPath()`
   - create `<Documents>/Cline/Audits`
   - return that absolute directory path

4. `getAgentFeedbackAuditFilePath()` must:
   - call `ensureAuditsDirectoryExists()`
   - return `<Documents>/Cline/Audits/agent-feedback-audit.jsonl`

5. In [disk.ts:277-338](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/storage/disk.ts#L277), append these new exported helpers after `saveTaskMetadata(...)`:
   - `pruneAgentFeedbackAuditEntries(entries: AgentFeedbackAuditEntry[], now = new Date())`
   - `appendAgentFeedbackAuditEntry(entry: AgentFeedbackAuditEntry)`

6. `pruneAgentFeedbackAuditEntries(...)` must:
   - compute a 7-day cutoff using `7 * 24 * 60 * 60 * 1000`
   - retain only entries whose parsed ISO timestamps are greater than or equal to that cutoff
   - silently drop entries whose `timestamp` is invalid

7. `appendAgentFeedbackAuditEntry(...)` must:
   - read the existing JSONL file if present
   - ignore blank lines
   - drop malformed JSON lines and emit `Logger.warn("[AgentFeedbackAudit] Dropping malformed line during prune.")`
   - parse valid lines into `AgentFeedbackAuditEntry[]`
   - prune to 7 days using `pruneAgentFeedbackAuditEntries(...)`
   - append the new entry
   - rewrite the full JSONL file atomically using `atomicWriteFile`
   - end the file with a trailing newline

8. Create [agent-feedback.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/agent-feedback.ts) with these exact exports:
   - `AgentFeedbackAuditEntry`
   - `readAgentFeedbackMessage`
   - `buildAgentFeedbackAuditEntry`
   - `emitAgentFeedback`

9. In `agent-feedback.ts`, define `AgentFeedbackAuditEntry` with these exact fields:
   - `timestamp: string`
   - `taskId: string`
   - `toolName: string`
   - `message: string`
   - `turnIdentifier: number`
   - `apiCallIdentifier: number`

10. `readAgentFeedbackMessage(params)` must behave exactly as follows:
   - if `params.agent_feedback` is `undefined`, return `{ invalid: false, message: undefined }`
   - if `params.agent_feedback` is not a non-null object, return `{ invalid: true, message: undefined }`
   - if `params.agent_feedback.message` is not a non-empty string after trimming, return `{ invalid: true, message: undefined }`
   - otherwise return `{ invalid: false, message: trimmedMessage }`

11. `buildAgentFeedbackAuditEntry(config, toolName, message)` must:
   - set `timestamp` to `new Date().toISOString()`
   - set `taskId` from `config.taskId`
   - set `toolName` from the function argument
   - set `message` from the function argument
   - derive `apiCallIdentifier` as:
     - `config.messageState.getClineMessages().filter((m) => m.say === "api_req_started").length + 1`
   - set `turnIdentifier` to the exact same numeric value as `apiCallIdentifier`

12. `emitAgentFeedback(config, toolName, message)` must:
   - call `buildAgentFeedbackAuditEntry(...)`
   - call `Logger.info("[AgentFeedback]", entry)`
   - call `appendAgentFeedbackAuditEntry(entry)`
   - then call `config.callbacks.say("agent_feedback", JSON.stringify({ label: "Real-Time Agent Feedback", ...entry }), undefined, undefined, false)`

13. Do not add any other storage helper files in this step.

## Step 5: Integrate Agent Feedback Into The Four Response Tool Handlers

### Allowed Files

- [SendUserMessageHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SendUserMessageHandler.ts)
- [AskFollowupQuestionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AskFollowupQuestionToolHandler.ts)
- [AttemptCompletionHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts)
- [PlanModeRespondHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PlanModeRespondHandler.ts)

### Required Changes

1. In all four handlers, import:
   - `readAgentFeedbackMessage`
   - `emitAgentFeedback`
   from [agent-feedback.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/agent-feedback.ts)

2. In each handler’s `execute(...)` method, read `agent_feedback` immediately after reading the tool’s normal parameters.

3. In all four handlers, apply the same validation rule:
   - call `readAgentFeedbackMessage(block.params as Record<string, unknown>)`
   - if `invalid === true`, increment `config.taskState.consecutiveMistakeCount++` and return `config.callbacks.sayAndCreateMissingParamError(this.name, "agent_feedback.message")`
   - otherwise keep `message` as `agentFeedbackMessage`

4. In [SendUserMessageHandler.ts:25-39](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SendUserMessageHandler.ts#L25):
   - after `await config.callbacks.say("text", ...)`, add:
     - `if (agentFeedbackMessage) { await emitAgentFeedback(config, this.name, agentFeedbackMessage) }`

5. In [AskFollowupQuestionToolHandler.ts:75-80](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AskFollowupQuestionToolHandler.ts#L75):
   - do not use `responseToolRuntime.askForResponse(...)` for this call anymore
   - replace it with:
     - `await responseToolRuntime.prepareForResponseDelivery(config, this.name)`
     - `const responsePromise = config.callbacks.ask("followup", JSON.stringify(sharedMessage), false)`
     - `if (agentFeedbackMessage) { await emitAgentFeedback(config, this.name, agentFeedbackMessage) }`
     - `const { text, images, files: followupFiles } = await responsePromise`

6. In [PlanModeRespondHandler.ts:97-102](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PlanModeRespondHandler.ts#L97):
   - do not use `responseToolRuntime.askForResponse(...)` for this call anymore
   - replace it with:
     - `await responseToolRuntime.prepareForResponseDelivery(config, this.name)`
     - `const responsePromise = config.callbacks.ask(this.name, JSON.stringify(sharedMessage), false)`
     - `if (agentFeedbackMessage) { await emitAgentFeedback(config, this.name, agentFeedbackMessage) }`
     - `let { text, images, files: planResponseFiles } = await responsePromise`

7. In [PlanModeRespondHandler.ts:52-57](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PlanModeRespondHandler.ts#L52):
   - immediately before the existing `if (needsMoreExploration)` return, add this exact validation:
     - if `needsMoreExploration` is `true` and `agentFeedbackMessage` is defined, return `formatResponse.toolError("[agent_feedback is not allowed when generate_plan_output sets needs_more_exploration=true.]")`
   - do not emit `agent_feedback` on the `needs_more_exploration=true` branch
   - do not emit any `agent_feedback` UI row, audit entry, or log line when that branch is taken

8. In [AttemptCompletionHandler.ts:161-212](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts#L161):
   - ensure `emitAgentFeedback(...)` runs exactly once per tool call
   - in the `command` branch where a new completion result is emitted at [AttemptCompletionHandler.ts:164-167](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts#L164), insert the feedback immediately after the completion-result `say(...)` and before command handling
   - in the no-command branch at [AttemptCompletionHandler.ts:207-211](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/AttemptCompletionHandler.ts#L207), insert the feedback immediately after the completion-result `say(...)`
   - in the rare `command` branch where the completion artifact was already previously sent and the code skips the new `say("completion_result", ...)`, emit the feedback immediately before the command-execution block if `agentFeedbackMessage` exists

9. Do not change any existing `user_feedback` behavior for actual human responses.

## Step 6: Add The Shared Prompt String Everywhere It Must Appear

### Allowed Files

- [agent_feedback.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_feedback.ts)
- [tool_use/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/tool_use/index.ts)
- [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts)
- [native-gpt-5/template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/template.ts)
- [native-gpt-5-1/overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts)
- [native-next-gen/template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/template.ts)
- [gemini-3/overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/overrides.ts)
- [glm/overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/glm/overrides.ts)
- [trinity/overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/trinity/overrides.ts)

### Required Changes

1. Create [components/agent_feedback.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_feedback.ts).

2. In that file, export exactly:

```ts
import { AGENT_FEEDBACK_PROMPT_GUIDANCE } from "../types"

export function getAgentFeedbackPromptGuidanceLine(): string {
	return AGENT_FEEDBACK_PROMPT_GUIDANCE
}
```

3. In [tool_use/index.ts:10-37](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/tool_use/index.ts#L10):
   - import `getAgentFeedbackPromptGuidanceLine`
   - in both `TOOL_USE_TEMPLATE_TEXT` and `MINIMAL_GPT_TOOL_USE_TEMPLATE_TEXT`, insert `{{AGENT_FEEDBACK_GUIDANCE_LINE}}` immediately after `{{RESPONSE_TOOLS_SECTION}}`
   - in the template resolver at [tool_use/index.ts:66-72](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/tool_use/index.ts#L66), add:
     - `AGENT_FEEDBACK_GUIDANCE_LINE: getAgentFeedbackPromptGuidanceLine()`

4. In [continuation_turn.ts:31-41](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts#L31):
   - import `getAgentFeedbackPromptGuidanceLine`
   - insert `getAgentFeedbackPromptGuidanceLine()` immediately after `getCurrentModeResponseToolsLine(context)`

5. In [native-gpt-5/template.ts:50-57](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/template.ts#L50):
   - import `getAgentFeedbackPromptGuidanceLine`
   - insert `${getAgentFeedbackPromptGuidanceLine()}` immediately after the line that says `- For native tool calls, treat the tool schema as the source of truth...`

6. In [native-gpt-5-1/overrides.ts:26-44](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L26):
   - import `getAgentFeedbackPromptGuidanceLine`
   - insert `${getAgentFeedbackPromptGuidanceLine()}` immediately after `${getResponseToolsSection(_context)}`

7. In [native-next-gen/template.ts:70-74](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/template.ts#L70):
   - import `getAgentFeedbackPromptGuidanceLine`
   - insert `${getAgentFeedbackPromptGuidanceLine()}` immediately after `${getResponseToolsSection(context)}`

8. In [gemini-3/overrides.ts:8-14](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/overrides.ts#L8):
   - import `getAgentFeedbackPromptGuidanceLine`
   - insert `${getAgentFeedbackPromptGuidanceLine()}` immediately after `${getResponseToolsSection(context)}`

9. In [glm/overrides.ts:13-18](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/glm/overrides.ts#L13):
   - import `getAgentFeedbackPromptGuidanceLine`
   - insert `${getAgentFeedbackPromptGuidanceLine()}` immediately after `${getResponseToolsSection(context)}`

10. In [trinity/overrides.ts:9-30](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/trinity/overrides.ts#L9):
    - import `getAgentFeedbackPromptGuidanceLine`
    - insert `${getAgentFeedbackPromptGuidanceLine()}` immediately after `${getResponseToolsSection(_context)}`

11. Do not change the wording of the shared prompt string anywhere. Every prompt surface listed above must use the identical shared string.

## Step 7: Render `agent_feedback` In The Chat UI

### Allowed Files

- [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)

### Required Changes

1. Update the imports at the top of [ChatRow.tsx:1-16](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L1) so `ClineSayAgentFeedback` is imported from `@shared/ExtensionMessage`.

2. In the `say` switch at [ChatRow.tsx:952-973](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L952):
   - insert a new `case "agent_feedback":`
   - parse `message.text` as `ClineSayAgentFeedback`
   - if parsing fails, render the default markdown fallback using the existing `message.text`
   - if parsing succeeds, render a compact block with:
     - a bold label line showing `Real-Time Agent Feedback`
     - the feedback `message`
   - do not render `timestamp`, `toolName`, `taskId`, `turnIdentifier`, or `apiCallIdentifier` in the visible UI

3. Place the new `case "agent_feedback"` immediately before the existing `case "user_feedback"` block so it stays near adjacent human/agent feedback rendering.

4. Do not change any other chat row behavior.

## Step 8: Add And Update Tests

### Allowed Files

- [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts)
- [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)
- [SendUserMessageHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/SendUserMessageHandler.test.ts)
- [AskFollowupQuestionToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/AskFollowupQuestionToolHandler.test.ts)
- [AttemptCompletionHandler.postCompletionFollowup.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts)
- [PlanModeRespondHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/PlanModeRespondHandler.test.ts)
- [agentFeedback.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/agentFeedback.test.ts)
- [agentFeedbackAudit.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/storage/__tests__/agentFeedbackAudit.test.ts)
- [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx)

### Required Changes

1. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts):
   - add one new test that asserts the four supported response tools expose `agent_feedback`
   - assert `agent_feedback` is typed as an object
   - assert `agent_feedback.properties.message` exists
   - assert nested `required` includes `"message"`
   - do not add assertions for unsupported tools in this file

2. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts):
   - add one test asserting the exact shared prompt string appears in a normal Tool Use section
   - add one test asserting the exact shared prompt string appears in a continuation-turn prompt
   - do not use snapshots for these new assertions

3. In [SendUserMessageHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/SendUserMessageHandler.test.ts):
   - add one test where `params.agent_feedback.message` is present
   - assert the handler emits the normal `text` row first and an `agent_feedback` row second
   - assert the `agent_feedback` row payload JSON contains:
     - `label`
     - `message`
     - `timestamp`
     - `toolName`
     - `taskId`
     - `turnIdentifier`
     - `apiCallIdentifier`

4. In [AskFollowupQuestionToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/AskFollowupQuestionToolHandler.test.ts):
   - add one test where `params.agent_feedback.message` is present
   - make `callbacks.ask` return a promise that resolves after the `agent_feedback` row is emitted
   - assert `callbacks.say("agent_feedback", ...)` is called before the awaited question response is consumed

5. In [AttemptCompletionHandler.postCompletionFollowup.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts):
   - add one test where `params.agent_feedback.message` is present
   - assert the completion-result row is emitted before the `agent_feedback` row

6. In [PlanModeRespondHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/PlanModeRespondHandler.test.ts):
   - add one test where `params.agent_feedback.message` is present
   - assert the plan ask is created first and the `agent_feedback` row is emitted immediately afterward

7. In [PlanModeRespondHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/PlanModeRespondHandler.test.ts):
   - add one separate test where:
     - `params.agent_feedback.message` is present
     - `params.needs_more_exploration` is `"true"`
   - assert the handler returns the exact tool error string:
     - `[agent_feedback is not allowed when generate_plan_output sets needs_more_exploration=true.]`
   - assert no `agent_feedback` row is emitted
   - assert no plan ask is opened

8. Create [agentFeedback.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/agentFeedback.test.ts):
   - add one test for `readAgentFeedbackMessage(...)` covering:
     - absent payload
     - invalid payload
     - valid payload
   - add one test for `buildAgentFeedbackAuditEntry(...)` asserting:
     - `timestamp` is ISO-ish and non-empty
     - `taskId` and `toolName` are copied
     - `turnIdentifier === apiCallIdentifier`
     - the numeric identifier equals `api_req_started count + 1`

9. Create [agentFeedbackAudit.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/storage/__tests__/agentFeedbackAudit.test.ts):
   - add one pure-function test for `pruneAgentFeedbackAuditEntries(...)` showing that:
     - entries newer than 7 days remain
     - entries older than 7 days are removed
     - invalid timestamps are removed

10. In [ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx):
   - add one new test rendering a `say: "agent_feedback"` message row
   - assert the label `Real-Time Agent Feedback` is visible
   - assert the feedback message text is visible

11. Do not modify snapshots in this plan.

## Step 9: Validation

### Allowed Files

- no code changes unless a failing command reveals a defect in files already allowed by Steps 1 through 8

### Required Commands

Run these commands in this exact order:

1. `npm run protos`
2. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/spec.test.ts`
3. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/integration.test.ts`
4. `npm run test:unit -- --exit src/core/task/tools/handlers/__tests__/SendUserMessageHandler.test.ts`
5. `npm run test:unit -- --exit src/core/task/tools/handlers/__tests__/AskFollowupQuestionToolHandler.test.ts`
6. `npm run test:unit -- --exit src/core/task/tools/handlers/__tests__/AttemptCompletionHandler.postCompletionFollowup.test.ts`
7. `npm run test:unit -- --exit src/core/task/tools/handlers/__tests__/PlanModeRespondHandler.test.ts`
8. `npm run test:unit -- --exit src/core/task/tools/response/__tests__/agentFeedback.test.ts`
9. `npm run test:unit -- --exit src/core/storage/__tests__/agentFeedbackAudit.test.ts`
10. `npm run test:unit -- --exit webview-ui/src/components/chat/ChatRow.test.tsx`

### Validation Rules

- If any command fails, fix only files already allowed by earlier steps.
- Re-run only the failing command until it passes.
- After all individual failures are fixed, re-run the full Step 9 sequence in order.
- If any failing command appears to require snapshot updates or an out-of-scope file change, stop and ask for input.

## Remediation Addendum

This remediation addendum corrects the post-implementation findings while preserving the requirements and implementation decisions already locked above.

Additional remediation execution rules:

- Each remediation step below starts with `[ ]`.
- Before executing a remediation step, read that remediation step in full.
- Execute only that remediation step.
- When the remediation step is complete, change its leading `[ ]` to `[x]`.
- After marking the remediation step complete, return to this document and read the next remediation step in full before making any further changes.
- If any ambiguity is discovered, or any additional code or test change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.

### Remediation Scope Notes

- This addendum fixes only the two identified issues:
  - audit-write failures must not break governed response tool delivery
  - the shared `agent_feedback` prompt line must appear in the remaining custom Tool Use overrides that bypass the shared Tool Use component
- Do not revisit any other part of the implementation in this remediation pass.
- Do not modify requirements, specification, workflow files, or snapshot files.

## [x] Remediation Step 10: Make Audit Persistence Non-Fatal

### Allowed Files

- [agent-feedback.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/agent-feedback.ts)
- [agentFeedback.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/agentFeedback.test.ts)

### Required Changes

1. In [agent-feedback.ts:51-61](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/agent-feedback.ts#L51), keep the function name `emitAgentFeedback` and keep its overall responsibilities unchanged.

2. Replace the current straight-line implementation of `emitAgentFeedback(...)` with this exact behavior:
   - build the audit entry first using `buildAgentFeedbackAuditEntry(...)`
   - log the normal info line first using:
     - `Logger.info("[AgentFeedback]", entry)`
   - attempt `appendAgentFeedbackAuditEntry(entry)` inside a `try/catch`
   - if that append throws, catch the error and emit:
     - `Logger.warn("[AgentFeedbackAudit] Failed to persist agent feedback audit entry.", error)`
   - regardless of whether the append succeeded or failed, continue to:
     - `await config.callbacks.say("agent_feedback", JSON.stringify({ label: "Real-Time Agent Feedback", ...entry }), undefined, undefined, false)`

3. Do not rethrow from the `catch`.

4. Do not move the `config.callbacks.say("agent_feedback", ...)` call into the `try`.

5. Do not change `buildAgentFeedbackAuditEntry(...)`.

6. In [agentFeedback.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/agentFeedback.test.ts), add one new test with this exact purpose:
   - name it:
     - `it("continues to emit the UI row when audit persistence fails", async () => {`
   - stub `appendAgentFeedbackAuditEntry` to reject
   - stub `config.callbacks.say` to resolve
   - call `emitAgentFeedback(...)`
   - assert that `config.callbacks.say` is still called exactly once with `"agent_feedback"` as the say type
   - assert that the call resolves rather than throwing

7. In the same test, do not assert on logger internals beyond what is necessary to keep the test stable. The required behavioral assertion is that the UI emission still occurs and the helper does not throw.

### Pause Point 10

Stop after completing this step and provide an update containing exactly:

- whether `emitAgentFeedback(...)` is now non-fatal on audit-write failure
- the exact new warning log string
- the exact new test name added in `agentFeedback.test.ts`

## [x] Remediation Step 11: Add The Shared Prompt Line To The Remaining Custom Tool Use Overrides

### Allowed Files

- [gpt-5/template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/template.ts)
- [hermes/overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/overrides.ts)
- [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)

### Required Changes

1. In [gpt-5/template.ts:49-57](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/template.ts#L49):
   - add an import for `getAgentFeedbackPromptGuidanceLine` from:
     - `../../components/agent_feedback`
   - insert:
     - `${getAgentFeedbackPromptGuidanceLine()}`
   - place it immediately after `${getResponseToolsSection(context)}` and before `{{TOOL_USE_FORMATTING_SECTION}}`

2. In [hermes/overrides.ts:1-4](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/overrides.ts#L1):
   - add an import for `getAgentFeedbackPromptGuidanceLine` from:
     - `../../components/agent_feedback`

3. In [hermes/overrides.ts:19-25](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/overrides.ts#L19):
   - insert:
     - `${getAgentFeedbackPromptGuidanceLine()}`
   - place it immediately after `${getResponseToolsSection(context)}` and before the `## TOOLS` heading

4. Do not change the wording of the shared string.

5. Do not add the string inline manually. Both files must call `getAgentFeedbackPromptGuidanceLine()`.

6. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts), add two explicit non-snapshot assertions:
   - one test that builds a GPT-5 prompt and asserts `AGENT_FEEDBACK_PROMPT_GUIDANCE` is present
   - one test that builds a Hermes prompt and asserts `AGENT_FEEDBACK_PROMPT_GUIDANCE` is present

7. For the GPT-5 assertion:
   - use the same direct prompt-build style already used elsewhere in this file
   - ensure the provider/model context resolves the `gpt-5` variant path rather than a native GPT variant

8. For the Hermes assertion:
   - use a provider/model context that resolves the Hermes override path
   - assert only on inclusion of `AGENT_FEEDBACK_PROMPT_GUIDANCE`
   - do not add or update snapshots

### Pause Point 11

Stop after completing this step and provide an update containing exactly:

- whether GPT-5 Tool Use now includes the shared `agent_feedback` line
- whether Hermes Tool Use now includes the shared `agent_feedback` line
- the exact names of the two new integration tests

## [x] Remediation Step 12: Validation

### Allowed Files

- no code changes unless a failing command reveals a defect in files already allowed by Remediation Steps 10 through 11

### Required Commands

Run these commands in this exact order:

1. `npm run test:unit -- --exit src/core/task/tools/response/__tests__/agentFeedback.test.ts`
2. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/integration.test.ts`

### Validation Rules

- If a command fails, fix only files already allowed by Remediation Steps 10 through 11.
- Re-run only the failing command until it passes.
- After all individual failures are fixed, re-run the full Remediation Step 12 sequence in order.
- If any failure appears to require a snapshot update or any out-of-scope file change, stop and ask for input.

### Pause Point 12

Stop after the full Remediation Step 12 rerun passes and provide an update containing exactly:

- the pass/fail result for each Remediation Step 12 command
- the full changed file list for this remediation pass
- whether any ambiguity or out-of-scope pressure was encountered
