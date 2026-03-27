# Findings

## Agent Struggled with set_workflow_placeholders - RESOLVED
user: were you unable to identify the correct shape for set_workflow_placeholders in the provided tool schema?


agent: Not from the schema alone. The visible tool definition only showed a no-arg wrapper, so I had to probe and got the required shape from the error message.
Actual shape used: set_workflow_placeholders({ values: { ... } }).
Recommendation: expose one explicit example in the schema docs, e.g. {"values":{"spec_file":"..."}}, so the call shape is clear without trial-and-error.

Possible problematic file in this repo: 
    - /Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts

Additional Concern: It does not appear that the in-prompt string regarding how/when to use set_workflow_placeholders is ever being injected.

Root cause assessment:
- The structured tool spec does define the required `values` object shape in `src/core/prompts/system-prompt/tools/set_workflow_placeholders.ts` and the native-schema compaction path in `src/core/prompts/system-prompt/spec.ts`, but the compact native parameter description still does not include an explicit wrapper example like `{"values": {...}}`.
- The stronger prompt-level guidance about when to use `set_workflow_placeholders` is not injected for the `native-gpt-5` variant. `src/core/prompts/system-prompt/variants/gpt-5/template.ts`, `src/core/prompts/system-prompt/variants/native-next-gen/template.ts`, and `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts` append the guidance line, but `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts` does not.
- The prompt integration test in `src/core/prompts/system-prompt/__tests__/integration.test.ts` covers GPT-5, Native GPT-5.1, and Native Next Gen, but not Native GPT-5, so this regression path is currently unguarded.

Proposed remediation:
- Add an explicit wrapper example to the compact native parameter description for `set_workflow_placeholders.values` in `src/core/prompts/system-prompt/spec.ts`, not just to the tool description.
- Inject the same placeholder-workflow guidance line into `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts` that the other GPT-family variants already use.
- Extend `src/core/prompts/system-prompt/__tests__/integration.test.ts` to assert that Native GPT-5 includes the `set_workflow_placeholders` guidance and the placeholder-workflow task-progress instructions.


## Placeholder value resolution in placeholder workflows- RESOLVED
Variables in workflow steps are not being resolved at runtime as expected

Root cause assessment:
- Placeholder rendering itself is implemented correctly in `src/core/workflows/placeholder-workflow-rendering.ts` and `src/core/workflows/workflow-placeholders.ts`.
- The failure appears to be in stable placeholder loading, not dynamic placeholder refresh. Your `code-review.md` step details use `{output_folder}`, and that value is supposed to come from stable workflow placeholders loaded from config before any `set_workflow_placeholders` call.
- The underlying design problem is that stable placeholder resolution depended on workflow-path/module inference at all. That made stable config availability vary by where the workflow file lived, even though `{output_folder}` is supposed to come from one shared stable config source.
- The implemented fix is to move stable placeholder loading to a canonical workspace config file at `.cline/workflow-config.yaml` and have both placeholder workflows and managed workflows load stable placeholders from that shared location.
- Workflow-derived prompt text is then rendered against merged `stable + dynamic` placeholder maps before injection, which leaves only truly dynamic not-yet-set values unresolved.

Proposed remediation:
- Use `.cline/workflow-config.yaml` as the canonical stable placeholder source for all workflows.
- Remove path/module inference as the primary stable-config mechanism in placeholder workflow activation.
- Add diagnostics logging for placeholder workflow activation showing the canonical config path, whether the file was found, and a sample of loaded stable placeholder keys.
- Add regression tests covering current-step prompt resolution, activation instructions, and managed workflow rendering against the shared canonical config.


## Thread State Misbehavior- RESOLVED
Conversation thread is intermittently locking requiring steer before accepting input. It seems to only happen after the ai agent uses send_user_message but does not seem to happen every time the agent uses that response tool.

Root cause assessment:
- The backend handoff path appears to be working at least in the captured case: the logs show `thread_display_state_transition ... "nextState":"active_user","reason":"response_tool_turn_ended"` after `send_user_message` completes.
- That points away from the task loop and toward UI state derivation. In `webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts`, any trailing `message.partial === true` row is treated as an active streaming state and mapped to `Steer` / `Cancel` before thread ownership is considered.
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts` also distinguishes between `active_user`, passive-open, and running states based on a mix of `threadDisplayState`, `clineAsk`, and the last visible message. Those signals are not derived from a single authoritative “backend quiescent and user-owned” condition.
- The issue is intermittent because it depends on UI ordering: if a trailing partial/streaming artifact remains the decisive last row when the thread has already transitioned to `active_user`, the composer/button state can still look like a running task even though the backend has already handed the thread back.

Proposed remediation:
- Make `active_user` an override in `webview-ui/src/components/chat/chat-view/shared/buttonConfig.ts` so the UI never shows `Steer` / `Cancel` for a user-owned thread, even if an older partial row is still present.
- Audit the response-tool preview lifecycle so `send_user_message` handoff clears or supersedes any trailing partial preview state before the action-button logic runs.
- Add a focused end-to-end regression test covering `send_user_message -> response_tool_turn_ended -> active_user`, asserting that the composer remains enabled and the primary action is not `steer`.
- Add logging on the webview side for the derived button/composer state when `threadDisplayState === "active_user"` so any future mismatch can be diagnosed against the backend transition logs.

## Human Input Double-Tagged in Prompts- RESOLVED
Example:
User
[NORMAL NEXT-TURN HUMAN INPUT]
The tagged content below is the latest direct input from the human user for the current live turn.
[LATEST HUMAN USER INPUT]
The tagged content below is the latest direct input from the human user for this turn.
<feedback>
were you unable to identify the correct shape for set_workflow_placeholders in the provided tool schema?
</feedback>

Root cause assessment:
- This is a direct formatting bug in `src/core/prompts/responses.ts`.
- `formatResponse.normalNextTurnDialogue(...)` emits the `[NORMAL NEXT-TURN HUMAN INPUT]` wrapper and then nests the full output of `formatResponse.latestHumanInput(...)`, which adds a second `[LATEST HUMAN USER INPUT]` wrapper around the same content.
- That duplication is mechanical rather than conditional, so every prompt built through `normalNextTurnDialogue(...)` will double-tag the same human input.

Proposed remediation:
- Refactor `src/core/prompts/responses.ts` so `normalNextTurnDialogue(...)` emits a single wrapper for the live next-turn human input instead of embedding `latestHumanInput(...)` verbatim.
- Keep one canonical helper for tagged human input blocks, then have the normal-next-turn variant compose from raw content rather than from another pre-tagged wrapper.
- Add prompt-format tests covering both helpers so the normal-next-turn variant cannot reintroduce nested human-input markers.

## Tool Use Prompt Section is embedded at the tail-end of the previous prompt section- RESOLVED
Example:
System Instructions
Agent Metadata
Name: Amelia
Title: Developer Agent
Capabilities: story execution, TDD, code implementation

Persona
Role: Developer Agent
Identity: Executes approved stories precisely and follows team standards.
Communication Style: Ultra-succinct. Use file paths and AC IDs. No fluff.
Principles:

All tests must pass before review.
Cover every task and subtask with unit tests before marking it complete. TOOL USE
Use these tools in one response when they are not dependent on one another; if using tools dependent on one another do so sequentially.

environment_details provides runtime context
Use list_files when you need directory structure
For native tool calls, treat the tool schema as the source of truth for canonical parameter names, required fields, and argument shape. Match the schema exactly.

Root cause assessment:
- This is a template-separator bug in `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`.
- The `BASE` template places `{{AGENT_ROLE}}` immediately followed by `{{TOOL_USE}}` with no `====` separator between them, unlike the other section boundaries in that file and unlike the more clearly separated layouts used in other prompt variants.
- Because of that, the rendered `TOOL USE` heading can be concatenated onto the tail of the prior section instead of starting as a distinct prompt section.

Proposed remediation:
- Insert an explicit section separator between `AGENT_ROLE` and `TOOL_USE` in `src/core/prompts/system-prompt/variants/native-gpt-5/template.ts`, matching the rest of the base-template structure.
- Add a prompt integration assertion that the Native GPT-5 system prompt contains `\n====\n` before `TOOL USE`, so future template edits cannot collapse those sections together.
- Spot-check the other variant templates for similar missing separators while adding that regression coverage.



