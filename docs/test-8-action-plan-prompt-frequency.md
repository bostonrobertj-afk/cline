# Test 8 Action Plan: Prompt Refresh Frequency

This document tracks the remediation and implementation plan for the repeated prompt-injection behavior identified in [test-8-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-8-findings.md).

# Remediation

## Every-Turn Prompt Injection

The prompt-injection behavior should be softened with a new runtime setting rather than by trying to special-case individual workflow and focus-chain paths one by one. The current implementation already distinguishes between human-authored turns and internal continuation turns in the main task loop through `nextApiRequestIncludesHumanAuthoredInput` in [index.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts#L2249), and it already has a notion of prompt refresh cadence through `isPromptRefreshTurn()` in [index.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts#L1218). The problem is that those concepts are not currently used as the central gate for all dynamic prompt assembly, especially in subagents.

The remediation should therefore be a new user-facing setting named **Prompt Refresh Frequency**. It should control how often dynamic system-injected prompt content is reattached on internal, tool-result-driven turns. This setting should not remove the base system prompt or tool schema. It should only suppress the dynamic per-turn prompt additions outside of tool definitions and tool results, such as:

- BMAD role/workflow reminders assembled in [index.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts#L2337)
- rules and workspace instruction blocks included through `SystemPromptContext` at [index.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts#L2351)
- placeholder workflow activation text appended in [workflow-activation.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-activation.ts#L114)
- focus-chain reminder/current-step blocks generated in [focus-chain/index.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/index.ts#L227)
- subagent-specific prompt injections appended in [SubagentRunner.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L955)

The intended behavior of the new setting should be:

- `0` means inject the full dynamic prompt on every eligible turn
- `10` means inject the full dynamic prompt only every tenth eligible internal turn
- default value should be `5`

The full prompt assembly should always bypass this filter and be sent when:

- the request is the first turn in the task/subagent run
- the request includes human-authored input
- an agent/workflow activation event just occurred
- the configured prompt-frequency threshold is reached

Whenever a full prompt assembly is sent for any of those reasons, the internal refresh counter should be reset. That reset should happen for both primary agents and subagents, so the cadence stays consistent regardless of whether the next full prompt was caused by human input or by the frequency threshold itself.

This approach solves two problems at once:

- it gives users direct control over how often Cline repeats dynamic workflow/focus-chain/rules guidance on internal turns
- it avoids brittle one-off fixes for placeholder workflows, because the suppression becomes a central policy that applies across both primary-agent and subagent prompt assembly

# Action Plan

## Build & Deploy Prompt Frequency

1. Add a new global setting key named `promptRefreshFrequency` in [state-keys.ts](/Users/robertboston/Documents/Cline Extension/cline/src/shared/storage/state-keys.ts) with default `5`.

2. Expose that setting through extension state and persistence:
   - add it to [ExtensionMessage.ts](/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts)
   - ensure it flows through state serialization in the generated proto-backed state payloads if needed
   - ensure `StateManager.getGlobalSettingsKey(...)` can read it like the existing feature/runtime settings

3. Add the UI control in settings near the existing advanced runtime/model controls.
   - label: `Prompt Refresh Frequency`
   - control type: dropdown or slider
   - allowed values: `0` through `10`
   - description should make the scale explicit:
     - `0 = full prompt every eligible internal turn`
     - `10 = full prompt every tenth eligible internal turn`

4. Add a new per-task counter to [TaskState.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts) for primary-agent runs, for example `turnsSinceFullPromptRefresh`.
   - this counter should track only eligible internal turns between full prompt assemblies
   - it should not count human-authored turns as “suppressed turns”; those should trigger a full prompt and reset the counter

5. Add equivalent counter behavior for subagent-local task state in [SubagentRunner.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts), using the `TaskState` instance created for each subagent run.

6. Replace the current main-task refresh logic in [index.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts#L1213) and [index.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts#L1218) with logic based on the new setting.
   - treat `0` as interval `1`
   - otherwise use the setting value directly as the refresh interval
   - preserve existing hard overrides for first request and activation/state-transition cases

7. Centralize the definition of “full prompt assembly required” in the main task loop.
   - inputs to this decision should include:
     - first request in task
     - human-authored input present
     - active agent/workflow just activated
     - plan/act mode transition state that already forces a refresh
     - configured prompt-frequency threshold reached
   - this decision should produce one boolean used consistently for all dynamic prompt additions

8. Use that boolean to gate dynamic prompt-context assembly in the main task loop at [index.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts#L2238).
   - when false, still build the normal base system prompt and tool schema
   - when false, suppress dynamic context such as:
     - BMAD role/workflow reminders
     - global/local rules text
     - cline-ignore instructions
     - preferred-language instructions
     - prompt skill scope that is only needed for dynamic re-grounding

9. Apply the same gating policy to placeholder-workflow and focus-chain prompt injection in the primary task path.
   - any code that appends workflow activation or focus-chain reminder/current-step text onto the outgoing user message should only do so on full-prompt turns
   - human-authored turns must always bypass the filter and receive the full assembly

10. Apply equivalent gating to subagent prompt assembly in [SubagentRunner.ts](/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts).
    - add a subagent-side `shouldSendFullPromptAssembly` decision
    - gate both:
      - `SystemPromptContext` dynamic fields returned from `buildPromptContext(...)`
      - appended placeholder/focus-chain injections from `appendSubagentPromptInjections(...)`

11. Reset the refresh counter any time a full prompt assembly is sent.
    - reset on first turn
    - reset on human-authored input turns
    - reset on activation-triggered refreshes
    - reset when the frequency threshold itself triggers a refresh

12. Increment the refresh counter only on internal turns where:
    - there is no human-authored input
    - the turn was eligible for suppression
    - the full dynamic prompt was not sent

13. Add tests for primary-agent behavior.
    - verify first turn always gets full prompt assembly
    - verify human-authored follow-up turns always get full prompt assembly regardless of setting
    - verify `promptRefreshFrequency=0` sends full dynamic prompt every eligible turn
    - verify `promptRefreshFrequency=5` suppresses intermediate internal turns and refreshes on the fifth eligible turn
    - verify the counter resets after a human-authored turn

14. Add tests for subagent behavior.
    - verify subagents do not receive placeholder/focus-chain injections on every internal request when the threshold has not been reached
    - verify subagents still receive full prompt assembly on their first turn
    - verify a threshold-triggered refresh restores the workflow/current-step block at the expected cadence
    - verify the subagent counter resets after a full refresh

15. Add one integration-style test proving that the base system prompt and tool schema remain present even when dynamic prompt injections are suppressed. This guards against accidentally stripping core tool availability or variant behavior.

16. Manual verification after implementation:
    - set Prompt Refresh Frequency to `0` and confirm current behavior remains effectively unchanged
    - set it to `5` and confirm workflow/focus-chain reminders stop appearing on every internal continuation turn
    - confirm any user-authored follow-up still restores the full prompt immediately
    - confirm subagent runs no longer spam repeated current-step reminders on every tool-result turn

17. Acceptance criteria:
    - new setting is visible in UI and persisted
    - default value is `5`
    - human-authored turns always assemble the full prompt
    - first turns always assemble the full prompt
    - internal turns are filtered according to the configured frequency
    - counter resets whenever the full prompt is sent
    - filtering suppresses dynamic injected prompt content, not the base system prompt or tool schema
