# Continuation-Turn Prompt Update Action Plan

This document is the implementation plan for the continuation-turn prompt captured in [continuation-turn-prompt-update.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/continuation-turn-prompt-update.md).

The executing agent must follow this plan literally. Do not redesign the prompt shape, change the trigger, widen scope into unrelated prompt systems, or introduce alternative branching logic unless this plan explicitly says to.

## Locked Decisions

- Primary trigger:
  - continuation-turn behavior is keyed off `currentRequestHasHumanAuthoredInput === false`
- Final selection rule:
  - use the continuation-turn prompt only when:
    - `currentRequestHasHumanAuthoredInput === false`
    - `currentRequestShouldSendFullPromptAssembly === false`
    - `taskState.managedWorkflowRun` is falsy
  - otherwise keep the existing full system prompt behavior
- Scope:
  - apply this change to the main task loop in `src/core/task/index.ts`
  - do not modify placeholder-workflow prompting logic
  - do not modify focus-chain prompting logic
  - do not modify managed-workflow prompting logic
  - do not modify `SubagentRunner` in this pass
- Architecture:
  - the continuation-turn prompt must be its own prompt component file
  - it must not be implemented as a `TOOL USE` sub-mode
  - it must not be implemented as a provider-specific API adapter hack
  - it must be selected through shared system-prompt generation so it works across providers
- Prompt assembly:
  - full turns continue to use the existing prompt registry / variant / template path
  - continuation turns use a dedicated continuation component as the entire system prompt body
  - native tool schema exposure remains unchanged
- Reuse rule:
  - dynamic continuation lines must reuse existing prompt helpers/constants where documented, rather than paraphrasing new wording

## Step 1: Add Explicit Continuation-Turn Context Fields

### File
- `src/core/prompts/system-prompt/types.ts`

### Change
Extend `SystemPromptContext` with the additional fields needed to build the continuation prompt without touching existing prompt subsystems.

### Exact Edits
Add these optional fields to `SystemPromptContext` near the other prompt-state booleans:

```ts
	readonly isContinuationTurn?: boolean
	readonly currentFocusChainChecklist?: string | null
```

### Notes
- Do not remove or rename any existing fields.
- Do not add a new mode field; use `context.providerInfo.mode`.

## Step 2: Add A Dedicated Prompt Section Id

### File
- `src/core/prompts/system-prompt/templates/placeholders.ts`

### Change
Add a new `SystemPromptSection` entry for the continuation component.

### Exact Edit
Insert this enum member directly after `TOOL_USE`:

```ts
	CONTINUATION_TURN = "CONTINUATION_TURN_SECTION",
```

### Notes
- Do not add the new section to `REQUIRED_PLACEHOLDERS`.
- Do not change any variant templates or `componentOrder` arrays in this pass.

## Step 3: Export Small Reuse Helpers Instead Of Duplicating Prompt Wording

### File
- `src/core/prompts/system-prompt/components/response_tools.ts`

### Change
Expose a public helper for the current-mode response-tools line.

### Exact Edits
1. Change these helpers from file-local to exported:

```ts
export function getActModeResponseTools(context: SystemPromptContext): string[] { ... }
export function getPlanModeResponseTools(context: SystemPromptContext): string[] { ... }
export function joinToolNames(toolNames: string[]): string { ... }
```

2. Add a new exported helper below `joinToolNames(...)`:

```ts
export function getCurrentModeResponseToolsLine(context: SystemPromptContext): string {
	const currentModeTools =
		context.providerInfo.mode === "plan" ? getPlanModeResponseTools(context) : getActModeResponseTools(context)
	return `- Use ${joinToolNames(currentModeTools)} when responding to the user.`
}
```

### File
- `src/core/prompts/system-prompt/components/task_progress.ts`

### Change
Expose the placeholder-workflow reminder sentence as a reusable constant instead of leaving it embedded in a private template string.

### Exact Edit
Add this exported constant above `UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW`:

```ts
export const PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER =
	'When the active step\'s "Done Signal" is true, use `task_progress` with `__COMPLETE_NEXT_STEP__` on the next relevant tool call, and use it only once in that assistant turn.'
```

Then rewrite the last bullet in `UPDATING_TASK_PROGRESS_PLACEHOLDER_WORKFLOW` to interpolate that constant verbatim:

```ts
- ${PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER}
```

### Notes
- Do not change the wording of the sentence.
- Do not change any other task-progress strings.

## Step 4: Add The Dedicated Continuation-Turn Component

### New File
- `src/core/prompts/system-prompt/components/continuation_turn.ts`

### Change
Create the continuation-turn prompt component as a standalone builder that reuses the documented prompt fragments.

### Required Contents
Create the file with this structure:

```ts
import { FocusChainPrompts } from "@/core/task/focus-chain/prompts"
import { MULTI_ROOT_HINT } from "../constants"
import {
	INDXR_EXPLORATION_PREFERENCE_GUIDANCE,
	hasConnectedIndxrServer,
} from "./mcp"
import { getCurrentModeResponseToolsLine } from "./response_tools"
import { PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER } from "./task_progress"
import type { PromptVariant, SystemPromptContext } from "../types"

function renderChecklistForPrompt(checklist: string): string {
	return ["```text", checklist.trim(), "```"].join("\n")
}

function getFocusChainReminderLine(context: SystemPromptContext): string {
	if (context.activeWorkflowSupportsPlaceholders && !context.managedWorkflowActive) {
		return `- ${PLACEHOLDER_WORKFLOW_DONE_SIGNAL_REMINDER}`
	}

	return `- ${FocusChainPrompts.reminder.trim()}`
}

export async function getContinuationTurnSection(
	_variant: PromptVariant,
	context: SystemPromptContext,
): Promise<string | undefined> {
	if (context.isContinuationTurn !== true) {
		return undefined
	}

	const lines = [
		"CONTINUATION TURN",
		"",
		"Continue the current task from the latest tool results and conversation state.",
		"",
		"- Use the native tool schema as the source of truth for tool names, parameters, and required fields.",
		`- Operate from ${context.cwd || process.cwd()}; use explicit paths.`,
		getCurrentModeResponseToolsLine(context),
		"- Ask the user only if required to unblock progress or reduce risk.",
		"- Prefer completing the next concrete step instead of restating prior context.",
	]

	if (context.isMultiRootEnabled) {
		lines.push(`- ${MULTI_ROOT_HINT.trim()}`)
	}

	if (hasConnectedIndxrServer(context)) {
		lines.push(`- ${INDXR_EXPLORATION_PREFERENCE_GUIDANCE}`)
	}

	const checklist = context.currentFocusChainChecklist?.trim()
	if (checklist) {
		lines.push("", "CURRENT TASK LIST", renderChecklistForPrompt(checklist), getFocusChainReminderLine(context))
	}

	return lines.join("\n")
}
```

### Notes
- Do not add YOLO-mode-specific continuation wording in this pass.
- Do not include `BUILTIN_FILE_TOOL_FALLBACK_GUIDANCE`.
- Do not include managed-workflow-specific reminder text.
- Do not import from `focus-chain/index.ts`; reuse `FocusChainPrompts.reminder` and reproduce only the fenced checklist rendering format.

## Step 5: Register The Continuation Component

### File
- `src/core/prompts/system-prompt/components/index.ts`

### Change
Register the new continuation component in the system-prompt component registry.

### Exact Edits
1. Add the import:

```ts
import { getContinuationTurnSection } from "./continuation_turn"
```

2. Add this registry entry near the top of the returned array, directly after `AGENT_ROLE`:

```ts
		{ id: SystemPromptSection.CONTINUATION_TURN, fn: getContinuationTurnSection },
```

### Notes
- Do not remove or reorder the existing component registrations beyond inserting this new one.

## Step 6: Teach The Prompt Registry To Return The Continuation Component As A Standalone Prompt

### File
- `src/core/prompts/system-prompt/registry/PromptRegistry.ts`

### Change
Branch inside `get(context)` so continuation turns return only the continuation component while still using the normal variant to resolve native tools.

### Exact Edits
Inside `async get(context: SystemPromptContext): Promise<string>`, keep the existing variant lookup and native-tool setup:

```ts
		const variant = this.getVariant(context)
		this.nativeTools = ClineToolSet.getNativeTools(variant, context)
```

Immediately after that, add:

```ts
		if (context.isContinuationTurn) {
			const continuationComponent = this.components[SystemPromptSection.CONTINUATION_TURN]
			if (!continuationComponent) {
				throw new Error("Continuation turn prompt component is not registered")
			}
			return (await continuationComponent(variant, context)) ?? ""
		}
```

Leave the existing `PromptBuilder` path unchanged for non-continuation turns.

### Notes
- Add `SystemPromptSection` to the imports at the top of the file if it is not already imported.
- Do not create a new variant family or alternate template file.

## Step 7: Add A Pure Helper For Continuation-Prompt Selection

### File
- `src/core/task/prompt-refresh.ts`

### Change
Add a small pure helper that encapsulates the prompt-selection rule for main-task continuation turns.

### Exact Edit
Add this export below `getNextTurnsSinceFullPromptRefresh(...)`:

```ts
export function shouldUseContinuationTurnPrompt(params: {
	hasHumanAuthoredInput: boolean
	shouldSendFullPromptAssembly: boolean
	managedWorkflowActive?: boolean
}): boolean {
	return (
		params.hasHumanAuthoredInput === false &&
		params.shouldSendFullPromptAssembly === false &&
		params.managedWorkflowActive !== true
	)
}
```

### Notes
- Do not change the existing refresh-frequency helpers.
- Do not alter the semantics of `shouldSendFullPromptAssembly(...)`.

## Step 8: Use The Helper In The Main Task Loop

### File
- `src/core/task/index.ts`

### Change
Populate the new continuation context fields and switch prompt generation to the continuation component on eligible non-human turns.

### Exact Edits

1. Update the imports from `./prompt-refresh` to include:

```ts
shouldUseContinuationTurnPrompt,
```

2. In `attemptApiRequest(...)`, after:

```ts
		const shouldSendFullPromptAssembly = this.currentRequestShouldSendFullPromptAssembly
```

add:

```ts
		const shouldUseContinuationPrompt = shouldUseContinuationTurnPrompt({
			hasHumanAuthoredInput: this.currentRequestHasHumanAuthoredInput,
			shouldSendFullPromptAssembly,
			managedWorkflowActive: !!this.taskState.managedWorkflowRun,
		})
```

3. Keep these existing lines unchanged:

```ts
		const shouldIncludeDynamicPromptContext = shouldSendFullPromptAssembly
		const shouldIncludeBmadPromptContext = shouldSendFullPromptAssembly
```

4. When constructing `promptContext`, add:

```ts
			isContinuationTurn: shouldUseContinuationPrompt,
			currentFocusChainChecklist: this.taskState.currentFocusChainChecklist,
```

Place them near the other prompt-state booleans.

5. Do not change the `getSystemPrompt(promptContext)` call. The registry branch added in Step 6 must handle continuation turns automatically.

### Required Result
- Human-authored turns still get the full prompt.
- Non-human turns that hit a full-prompt refresh still get the full prompt.
- Non-human turns that do not send a full refresh and are not managed-workflow turns get only the continuation-turn prompt.

## Step 9: Leave Provider Adapters Unchanged

### Files
- `src/core/api/providers/openai-native.ts`
- all other provider adapters

### Change
Do not edit these files in this pass.

### Reason
- `systemPrompt` is already passed through the shared provider interface.
- The continuation-turn prompt is selected earlier in shared prompt generation.
- This deployment is intentionally cross-provider, not Responses-API-only.

## Step 10: Do Not Change Subagent Prompting In This Pass

### Files
- `src/core/task/tools/subagent/SubagentRunner.ts`
- `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

### Change
Do not edit these files in this pass.

### Reason
- The requested trigger is `currentRequestHasHumanAuthoredInput === false` from the main task loop.
- Subagent prompt injection is a separate system with different state wiring.
- Keep this rollout focused on the main deployed task loop first.

## Step 11: Add Continuation-Prompt Unit Coverage

### File
- `src/core/task/__tests__/prompt-refresh.test.ts`

### Change
Add tests for `shouldUseContinuationTurnPrompt(...)`.

### Required Tests
Add tests that prove:

1. it returns `true` when:
   - `hasHumanAuthoredInput: false`
   - `shouldSendFullPromptAssembly: false`
   - `managedWorkflowActive: false`

2. it returns `false` when:
   - `hasHumanAuthoredInput: true`

3. it returns `false` when:
   - `shouldSendFullPromptAssembly: true`

4. it returns `false` when:
   - `managedWorkflowActive: true`

### Notes
- Do not alter the existing prompt-refresh tests.

## Step 12: Add Prompt Integration Coverage For Continuation Turns

### File
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`

### Change
Add continuation-turn prompt coverage by calling `getSystemPrompt(...)` with `isContinuationTurn: true`.

### Required Tests
Add three explicit test cases and snapshot each resulting `systemPrompt`:

1. Basic ACT-mode continuation turn
   - `providerInfo.mode = "act"`
   - no multi-root
   - no Indxr
   - no checklist

2. ACT-mode continuation turn with Indxr and checklist
   - connected Indxr server
   - `currentFocusChainChecklist` set to a short 2-item checklist
   - `activeWorkflowSupportsPlaceholders = false`
   - `managedWorkflowActive = false`

3. PLAN-mode continuation turn with multi-root and placeholder workflow
   - `providerInfo.mode = "plan"`
   - `isMultiRootEnabled = true`
   - `currentFocusChainChecklist` set
   - `activeWorkflowSupportsPlaceholders = true`
   - `managedWorkflowActive = false`

### Required Assertions
- The continuation snapshots must contain `CONTINUATION TURN`.
- They must not contain the full prompt sections such as:
  - `TOOL USE`
  - `RULES`
  - `CAPABILITIES`
- The response-tools line must reflect the current mode.

### Snapshot Files
Create or update snapshot baselines under:
- `src/core/prompts/system-prompt/__tests__/__snapshots__/`

Use descriptive filenames consistent with the existing snapshot convention.

## Step 13: Add A Direct Registry-Level Guard Test

### File
- `src/core/prompts/system-prompt/__tests__/PromptBuilder.test.ts`

### Change
Add one focused test that proves continuation prompts bypass full-template assembly.

### Required Test
Create a test that:
- builds a `PromptRegistry` or directly exercises the component/registry path with `isContinuationTurn: true`
- verifies the resulting prompt contains `CONTINUATION TURN`
- verifies it does not include content from the variant base template like `You are Cline.`

### Notes
- Keep the test narrow.
- Do not rewrite the existing builder tests.

## Step 14: Validate The Existing Full-Prompt Behavior Remains Intact

### File
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`

### Change
Do not delete the existing snapshot coverage for normal full prompts.

### Required Result
- Existing full-prompt snapshots should only change if a necessary shared import/export edit incidentally affects formatting.
- If no full-prompt text changes are required, leave those snapshots untouched.

## Step 15: Validation Commands

After implementation, run these commands from `/Users/robertboston/Documents/Cline Extension/cline`:

```sh
npx tsc --noEmit
```

```sh
npm run test:unit -- --update-snapshots --exit src/core/task/__tests__/prompt-refresh.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/prompts/system-prompt/__tests__/PromptBuilder.test.ts
```

### Manual Verification
Confirm all of the following:
- A normal human-authored request still produces the existing full prompt.
- A non-human internal turn with `currentRequestHasHumanAuthoredInput === false` and `currentRequestShouldSendFullPromptAssembly === false` produces only the continuation prompt.
- A non-human refresh turn still produces the full prompt.
- Managed-workflow turns still use the existing full prompt path.
- Continuation-turn prompts still receive native tool schema because the tool registry/native tool selection path was not changed.

## Step 16: Deployment Notes

When the implementation is complete:
- do not change workflow files
- do not change tool schemas
- do not change provider adapters
- do not change subagent prompt injection
- do not change placeholder-workflow or focus-chain prompt generation logic beyond reusing exported strings/constants

The rollout goal is:
- smaller system prompts on eligible non-human continuation turns
- no behavior change on human-authored turns
- no change to full-prompt refresh semantics
