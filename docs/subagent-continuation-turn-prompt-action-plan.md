# Subagent Continuation-Turn Prompt Action Plan

This document is the implementation plan for extending the existing continuation-turn prompt rollout to subagents.

The executing agent must follow this plan literally. Do not redesign the continuation prompt, do not widen scope into the main task loop, and do not alter subagent prompt semantics beyond the explicit subagent continuation wiring described here.

## Locked Decisions

- Reuse the existing continuation-turn prompt infrastructure that already exists in:
  - `src/core/task/prompt-refresh.ts`
  - `src/core/prompts/system-prompt/registry/PromptRegistry.ts`
  - `src/core/prompts/system-prompt/components/continuation_turn.ts`
- Do not create a second subagent-specific continuation prompt component.
- Subagent continuation turns must use the existing shared helper:
  - `shouldUseContinuationTurnPrompt(...)`
- Subagent continuation turns are identified with the same non-human assumption already used in the subagent loop:
  - `hasHumanAuthoredInput: false`
- Final subagent selection rule:
  - use the continuation-turn prompt only when:
    - `shouldSendFullPromptAssembly === false`
    - `managedWorkflowActive !== true`
  - this must be computed through `shouldUseContinuationTurnPrompt(...)`
- Managed-workflow subagent turns must remain on the full-prompt path.
- Placeholder-workflow subagent turns are in scope and must use the continuation prompt on eligible suppressed internal turns.
- Existing subagent prompt additions must remain unchanged:
  - assigned-skill directive behavior
  - subagent system suffix
  - workspace metadata injection
  - `appendSubagentPromptInjections(...)`
- Do not change:
  - `src/core/task/index.ts`
  - provider adapters
  - prompt component wording
  - focus-chain generation logic
  - placeholder-workflow generation logic

## Step 1: Import The Existing Continuation Selector Into The Subagent Runner

### File
- `src/core/task/tools/subagent/SubagentRunner.ts`

### Change
Extend the existing prompt-refresh import to include the shared continuation selector.

### Exact Edit
Change the import from:

```ts
import {
	getNextTurnsSinceFullPromptRefresh,
	normalizePromptRefreshFrequency,
	shouldSendFullPromptAssembly,
} from "@core/task/prompt-refresh"
```

to:

```ts
import {
	getNextTurnsSinceFullPromptRefresh,
	normalizePromptRefreshFrequency,
	shouldSendFullPromptAssembly,
	shouldUseContinuationTurnPrompt,
} from "@core/task/prompt-refresh"
```

## Step 2: Compute Continuation Eligibility Inside The Subagent Request Loop

### File
- `src/core/task/tools/subagent/SubagentRunner.ts`

### Change
Inside the `while (true)` request loop, compute a subagent continuation-turn boolean immediately after the existing full-prompt decision.

### Exact Edit
In the loop, keep this line:

```ts
const shouldSendFullPromptAssembly = this.shouldSendFullPromptAssembly(state)
```

Immediately after it, add:

```ts
const shouldUseContinuationPrompt = shouldUseContinuationTurnPrompt({
	hasHumanAuthoredInput: false,
	shouldSendFullPromptAssembly,
	managedWorkflowActive: !!state.managedWorkflowRun,
})
```

### Notes
- Do not replace `shouldSendFullPromptAssembly`.
- Do not add any extra gating conditions.
- The helper already encodes the intended managed-workflow exclusion.

## Step 3: Pass The Continuation Decision Into Subagent Prompt-Context Construction

### File
- `src/core/task/tools/subagent/SubagentRunner.ts`

### Change
Add a new parameter to `buildPromptContext(...)` and pass the computed value from the loop.

### Exact Edits
1. In the loop, update the `buildPromptContext(...)` call to include:

```ts
shouldUseContinuationPrompt,
```

Place it directly after `shouldSendFullPromptAssembly`.

2. Update the `buildPromptContext` parameter type definition from:

```ts
shouldSendFullPromptAssembly: boolean
```

to:

```ts
shouldSendFullPromptAssembly: boolean
shouldUseContinuationPrompt: boolean
```

### Notes
- Do not rename the existing `shouldSendFullPromptAssembly` parameter.

## Step 4: Populate Continuation-Turn Context Fields For Subagents

### File
- `src/core/task/tools/subagent/SubagentRunner.ts`

### Change
Add the existing continuation-turn context fields to the returned `SystemPromptContext`.

### Exact Edit
Inside the object returned by `buildPromptContext(...)`, add:

```ts
			isContinuationTurn: params.shouldUseContinuationPrompt,
			currentFocusChainChecklist: params.state.currentFocusChainChecklist,
```

Place them near the other prompt-state fields:
- `activeWorkflowSupportsPlaceholders`
- `managedWorkflowActive`

### Required Result
- Eligible subagent internal turns must pass `isContinuationTurn: true` into `PromptRegistry.get(context)`.
- Subagent prompt context must always carry the current checklist value so the existing continuation component can render `CURRENT TASK LIST`.

## Step 5: Leave Full-Prompt Suppression Logic Intact

### File
- `src/core/task/tools/subagent/SubagentRunner.ts`

### Change
Do not alter the existing suppression logic that already removes dynamic prompt fields on non-refresh subagent turns.

### Required Behavior
These lines stay as they are:

```ts
const skills = params.shouldSendFullPromptAssembly ? ... : []
```

and:

```ts
if (params.shouldSendFullPromptAssembly && params.state.activeAgentId) { ... }
if (params.shouldSendFullPromptAssembly && params.state.managedWorkflowRun) { ... }
```

### Reason
- The continuation prompt should remain small.
- Dynamic reminder content must continue to be suppressed on internal turns unless the full prompt is being resent.

## Step 6: Leave Subagent Prompt Injections Unchanged

### File
- `src/core/task/tools/subagent/SubagentRunner.ts`

### Change
Do not modify `appendSubagentPromptInjections(...)`.

### Required Result
- Full-prompt turns still receive the existing focus-chain / workflow injection behavior.
- Suppressed internal turns continue not to get those user-message prompt injections.
- The continuation prompt now supplies the compact reminder context instead.

## Step 7: Preserve Subagent System-Prompt Wrapping

### Files
- `src/core/task/tools/subagent/SubagentRunner.ts`
- `src/core/task/tools/subagent/SubagentBuilder.ts`

### Change
Do not change the existing wrapping path:

```ts
const generatedSystemPrompt = await promptRegistry.get(context)
const baseSystemPrompt = this.agent.buildSystemPrompt(generatedSystemPrompt, context)
```

and do not change:
- `buildAssignedSkillDirective(...)`
- `SubagentBuilder.buildSystemPrompt(...)`

### Required Result
- When `PromptRegistry.get(context)` returns the continuation prompt, it must still be wrapped by:
  - agent identity prefix when configured
  - subagent execution suffix
  - optional subagent Indxr suffix
  - assigned-skill directive when applicable

## Step 8: Add A Direct Prompt-Context Unit Test For Subagent Continuation Fields

### File
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Change
Add a direct `buildPromptContext(...)` test that proves the new context fields are populated on suppressed internal subagent turns.

### Required Test
Add a test named:

```ts
it("marks suppressed internal subagent turns as continuation turns and forwards the current checklist", async () => { ... })
```

### Exact Assertions
Build a `TaskState` with:
- `currentFocusChainChecklist = "- [ ] Step 1\\n- [ ] Step 2"`
- `activePlaceholderWorkflowId = "review-edge-case-hunter"`

Call `buildPromptContext(...)` with:
- `shouldSendFullPromptAssembly: false`
- `shouldUseContinuationPrompt: true`

Assert:

```ts
assert.equal(context.isContinuationTurn, true)
assert.equal(context.currentFocusChainChecklist, "- [ ] Step 1\n- [ ] Step 2")
assert.equal(context.activeWorkflowSupportsPlaceholders, true)
assert.equal(context.managedWorkflowActive, false)
assert.deepEqual(context.skills, [])
assert.equal(context.activeAgentId, undefined)
assert.equal(context.activeWorkflowReminder, undefined)
```

## Step 9: Update The Existing Placeholder Two-Turn Test To Verify Continuation Mode

### File
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Existing Test To Update
- `it("injects placeholder workflow activation only on the first subagent turn and suppresses repeated guidance before the refresh threshold", ...)`

### Change
Keep the existing assertions, but also verify that the second prompt-context request is a continuation turn.

### Exact Test Update
Change the `PromptRegistry.getInstance().get(...)` stub in this test so it:
- records each `context`
- returns `"CONTINUATION TURN"` when `context.isContinuationTurn === true`
- otherwise returns `"system prompt"`

After the run completes, add these assertions:

```ts
assert.equal(promptGetStub.callCount, 2)
assert.equal(promptGetStub.firstCall.args[0].isContinuationTurn, false)
assert.equal(promptGetStub.secondCall.args[0].isContinuationTurn, true)
assert.equal(promptGetStub.secondCall.args[0].currentFocusChainChecklist, "- [ ] Step 1: Gather Context\n- [ ] Step 2: Review")
```

Also assert the second system prompt passed to `createMessage` contains the continuation marker:

```ts
const secondSystemPrompt = createMessage.secondCall.args[0] as string
assert.match(secondSystemPrompt, /CONTINUATION TURN/)
```

### Notes
- Keep the existing assertions that the second user message does not re-include the placeholder activation and current-step guidance.

## Step 10: Update The Existing Refresh-Frequency-Zero Test To Prove Continuation Is Disabled

### File
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Existing Test To Update
- `it("reinjects focus-chain guidance on every internal turn when prompt refresh frequency is zero", ...)`

### Change
Keep the existing assertions, but also verify that the second turn does not enter continuation mode.

### Exact Test Update
Change the `PromptRegistry.get(...)` stub in this test to:
- record each `context`
- return `"CONTINUATION TURN"` when `context.isContinuationTurn === true`
- otherwise return `"system prompt"`

After the run completes, add:

```ts
assert.equal(promptGetStub.callCount, 2)
assert.equal(promptGetStub.firstCall.args[0].isContinuationTurn, false)
assert.equal(promptGetStub.secondCall.args[0].isContinuationTurn, false)
```

Also assert the second system prompt passed to `createMessage` does not contain the continuation marker:

```ts
const secondSystemPrompt = createMessage.secondCall.args[0] as string
assert.doesNotMatch(secondSystemPrompt, /CONTINUATION TURN/)
```

### Reason
- `promptRefreshFrequency = 0` forces a full prompt on every eligible internal turn.
- That must override continuation mode for subagents the same way it already does for the main task loop.

## Step 11: Add A Managed-Workflow Two-Turn Guard Test

### File
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Change
Add a two-turn managed-workflow test that proves managed-workflow subagent turns never enter continuation mode.

### Required Test
Add a new test named:

```ts
it("keeps managed-workflow subagent turns on the full-prompt path even on suppressed internal turns", async () => { ... })
```

### Exact Scenario
1. Use the existing managed-workflow activation pattern from:
   - `it("auto-activates an explicitly assigned managed workflow before the first subagent turn", ...)`
2. Make the subagent run take two turns:
   - first turn calls `list_files`
   - second turn calls `attempt_completion`
3. Stub `PromptRegistry.get(...)` to:
   - record contexts
   - return `"CONTINUATION TURN"` only when `context.isContinuationTurn === true`
   - otherwise return `"system prompt"`

### Required Assertions
After the run completes, assert:

```ts
assert.equal(promptGetStub.callCount, 2)
assert.equal(promptGetStub.firstCall.args[0].managedWorkflowActive, true)
assert.equal(promptGetStub.secondCall.args[0].managedWorkflowActive, true)
assert.equal(promptGetStub.firstCall.args[0].isContinuationTurn, false)
assert.equal(promptGetStub.secondCall.args[0].isContinuationTurn, false)
```

Also assert the second system prompt passed to `createMessage` does not contain the continuation marker:

```ts
const secondSystemPrompt = createMessage.secondCall.args[0] as string
assert.doesNotMatch(secondSystemPrompt, /CONTINUATION TURN/)
```

## Step 12: Keep Existing Shared Continuation Tests Unchanged

### Files
- `src/core/task/__tests__/prompt-refresh.test.ts`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `src/core/prompts/system-prompt/__tests__/PromptBuilder.test.ts`

### Change
Do not modify these files in this pass.

### Reason
- The shared continuation-turn prompt component and selector are already covered.
- This rollout is only wiring subagents into the existing infrastructure.

## Step 13: Validation Commands

After implementation, run these commands from `/Users/robertboston/Documents/Cline Extension/cline`:

```sh
npx tsc --noEmit
```

```sh
npm run test:unit -- --exit src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts
```

### Manual Verification
Confirm all of the following from the updated tests and code review:
- placeholder-workflow subagent internal turns use the continuation prompt when refresh is suppressed
- refresh-frequency-zero subagent turns stay on the full-prompt path
- managed-workflow subagent turns stay on the full-prompt path
- assigned-skill directive behavior is unchanged
- workspace metadata still appears only in the initial user message
- no provider adapter or main task-loop code was modified

## Step 14: Deployment Notes

When the implementation is complete:
- do not update prompt snapshot files
- do not update workflow docs
- do not update the main continuation-turn action plan
- do not change the continuation prompt wording
- do not add a subagent-only continuation component

The rollout goal is:
- eligible subagent internal turns use the same compact continuation prompt as the main agent
- refresh and managed-workflow protections remain intact
- existing subagent prompt wrappers and directives continue to work exactly as before
