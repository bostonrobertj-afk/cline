---
title: Brainstorming Step 2 Automation Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - The action-plan file itself may be edited only to update the current step checkbox.
  - Do not make edits outside the allowed-files list for the current step.
  - If any ambiguity is discovered, or any code/test/doc/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - Use `apply_patch` for all non-generated file edits.
---

# Brainstorming Step 2 Automation Action Plan

## Goal

Implement the runtime-owned Step 2 automation for `brainstorming.md` so the system can:

- inspect `{output_folder}/brainstorming/`
- continue the newest existing brainstorming session
- start a new brainstorming session from the canonical template
- launch a dropdown workflow-form picker for `List all sessions`
- persist the selected absolute path as `{output_file}`

This plan covers only the Step 2 automation slice. It does not add deterministic Step 2 progression support, Step 3 automation, Step 4 automation, or any workflow changes under `/Users/robertboston/Documents/Cline/Workflows/`.

## Locked Decisions

- Tool id/name: `prepare_brainstorming_session`
- Workflow-form resolver id: `brainstorming_step_2_select_session`
- Task callback name: `runWorkflowFormSession`
- Workflow-form session context key: `brainstormingSessionOptions`
- Step 2 followup question text: `How would you like to proceed with your brainstorming session?`
- Step 2 followup options are exactly:
  - `Continue newest session`
  - `Start new session`
  - `List all sessions`
- List-all workflow-form copy is exactly:
  - title: `Select a Brainstorming Session`
  - prompt: `Choose an existing brainstorming session to continue.`
  - field label: `Session`
- Canonical new-session base path: `{output_folder}/brainstorming/brainstorming-session-{{date}}.md`
- Same-day collision rule:
  - first file for a date uses no numeric suffix
  - the next same-day file uses `-2`
  - later same-day files use the next unused integer suffix (`-3`, `-4`, and so on)
- Newest-session rule:
  - sort by ISO date descending
  - for equal dates, sort by numeric suffix descending, treating the unsuffixed base file as sequence `1`
- The narrow tool-owned workflow-form bridge uses a new workflow-form `triggerSource` value named exactly `tool_handler`.
- `runWorkflowFormSession` creates the workflow-form session, persists it, and runs the existing workflow-form loop in `Task`; it does not return a custom payload.
- The handler validates the final persisted `output_file` after the workflow-form returns and treats any missing or non-option value as failure.

## Scope Guard

- Do not edit:
  - `/Users/robertboston/Documents/Cline/Workflows/**`
  - `/Users/robertboston/Documents/Cline Extension/cline/.cline/workflow-config.yaml`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/**`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
- Do not add deterministic progression support for `brainstorming.md` Step 2 in this pass.
- Do not reintroduce `brainstorming_session_output_file` anywhere.
- Do not broaden this slice into Step 3 or Step 4 automation.

## Step 1
[x] Sync the Step 2 requirements document to the live workflow contract before any code work begins.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/brainstorming/step-2-automation-requirements.md`

Exact edits:
1. In [step-2-automation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/brainstorming/step-2-automation-requirements.md), replace every date-plus-time filename reference so the requirements document matches the live Step 2 workflow at [brainstorming.md](/Users/robertboston/Documents/Cline/Workflows/brainstorming.md#L7-L12). This includes the purpose summary, core requirements, filename-filter section, file-creation section, and verification expectations.
2. In [step-2-automation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/brainstorming/step-2-automation-requirements.md#L86-L91), change the canonical new-session file shape from:

```md
- `{output_folder}/brainstorming/brainstorming-session-{{date}}-{{time}}.md`
```

to:

```md
- `{output_folder}/brainstorming/brainstorming-session-{{date}}.md`
```

3. Replace the filename-filter subsection at [step-2-automation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/brainstorming/step-2-automation-requirements.md#L112-L118) so it says the Step 2 discovery logic must consider only:

```md
- `brainstorming-session-<date>.md`
- `brainstorming-session-<date>-<integer>.md`
```

4. Delete the stale sentence that references `brainstorming_session_output_file` in `.cline/workflow-config.yaml`, because that config key no longer exists in the live repo.
5. Replace the current newest-session rule at [step-2-automation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/brainstorming/step-2-automation-requirements.md#L120-L123) with a rule that explicitly states:
   - sort sessions by ISO date descending
   - for equal dates, sort by numeric suffix descending
   - treat the unsuffixed base file as sequence `1`
6. Under `## File Creation Requirements`, insert a new subsection immediately after `### 3. Existing-file safety` that states:
   - the first same-day file uses `brainstorming-session-YYYY-MM-DD.md`
   - if that file exists, the next same-day file is `brainstorming-session-YYYY-MM-DD-2.md`
   - later collisions use the next unused integer suffix
7. In the verification section near the end of the file, change the two expectations that still say `new timestamped session file` / `new timestamped session` so they instead say `new date-based brainstorming session file` and explicitly allow the numeric collision suffix rule.
8. Do not edit any other brainstorming docs in this step.

## Step 2
[x] Add the new Step 2 tool id, shared string-contract helpers, prompt tool spec, and prompt-surface registration for `prepare_brainstorming_session`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/prepare-brainstorming-session.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/prepare_brainstorming_session.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`

Exact edits:
1. In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L38-L47), insert a new enum member immediately after `BUILD_EPICS_DOCUMENT = "build_epics_document",`:

```ts
	PREPARE_BRAINSTORMING_SESSION = "prepare_brainstorming_session",
```

2. Create [prepare-brainstorming-session.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/prepare-brainstorming-session.ts) with exactly these exports:
   - `PREPARE_BRAINSTORMING_SESSION_WORKFLOW_STEPS = { "brainstorming.md": [2] } as const`
   - `PREPARE_BRAINSTORMING_SESSION_QUESTION = "How would you like to proceed with your brainstorming session?"`
   - `PREPARE_BRAINSTORMING_SESSION_OPTIONS = ["Continue newest session", "Start new session", "List all sessions"] as const`
   - `PREPARE_BRAINSTORMING_SESSION_LIST_TITLE = "Select a Brainstorming Session"`
   - `PREPARE_BRAINSTORMING_SESSION_LIST_PROMPT = "Choose an existing brainstorming session to continue."`
   - `PREPARE_BRAINSTORMING_SESSION_LIST_FIELD_LABEL = "Session"`
   - `normalizePrepareBrainstormingSessionWorkflowName(workflowName?: string)` that accepts `brainstorming.md` and `brainstorming`
   - `isPrepareBrainstormingSessionStep(workflowName?: string, stepNumber?: number): boolean`
   - `shouldExposePrepareBrainstormingSession({ workflowName, stepNumber, yoloModeToggled }): boolean` that returns `false` in YOLO mode and otherwise delegates to `isPrepareBrainstormingSessionStep`
3. Create [prepare_brainstorming_session.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/prepare_brainstorming_session.ts) as a no-parameter tool spec that mirrors the structure of [select_target_epic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/select_target_epic.ts#L1-L22) but uses:
   - `id = ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION`
   - `name: "prepare_brainstorming_session"`
   - `description: "Show the runtime-owned brainstorming Step 2 session-preparation flow. Resolve {output_folder} from workflow state, inspect {output_folder}/brainstorming/, continue the newest session, start a new session from the canonical template, or launch the structured session picker, then persist the final absolute path as {output_file}. There are no human-supplied parameters."`
   - `contextRequirements` backed by `shouldExposePrepareBrainstormingSession`
   - `parameters: []`
4. In [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L23-L41), add the new import:

```ts
import { prepare_brainstorming_session_variants } from "./prepare_brainstorming_session"
```

and in the `allToolVariants` array at [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L69-L88), insert `...prepare_brainstorming_session_variants,` immediately after `...new_task_variants,`.
5. In each prompt-variant config listed in the allowed-files list, insert `ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION` immediately after `ClineDefaultTool.BUILD_EPICS_DOCUMENT` and before `ClineDefaultTool.SELECT_TARGET_EPIC`. Use the existing workflow-tool cluster in each file:
   - [generic/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts#L79-L86)
   - [gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts#L69-L76)
   - [native-gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts#L81-L88)
   - [native-gpt-5-1/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts#L76-L83)
   - [next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts#L74-L81)
   - [native-next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts#L69-L76)
   - [gemini-3/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts#L71-L78)
   - [glm/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts#L59-L66)
   - [hermes/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts#L61-L68)
   - [devstral/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts#L59-L66)
   - [trinity/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts#L60-L67)
   - [xs/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts#L55-L62)
6. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts):
   - add the import for `prepare_brainstorming_session_variants` next to the existing workflow-tool imports at [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L23-L40)
   - add one new gating test immediately after the existing `select_target_epic` gating test at [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L359-L383) that asserts:
     - `brainstorming.md` Step 2 returns `true`
     - `brainstorming.md` Step 3 returns `false`
     - `pi-planning.md` Step 2 returns `false`
   - add one native-description compaction test immediately after the native `select_target_epic` compaction test at [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L1175-L1194) that asserts the OpenAI native description equals:

```ts
"Show the runtime-owned brainstorming Step 2 session-preparation flow. Resolve {output_folder} from workflow state, inspect {output_folder}/brainstorming/, continue the newest session, start a new session from the canonical template, or launch the structured session picker, then persist the final absolute path as {output_file}."
```

7. In [system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md):
   - add a table row immediately after `build_epics_document` at [system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md#L34-L39):

```md
| `prepare_brainstorming_session` | Workflow-specific | Resolve and persist the brainstorming Step 2 session path from workflow-owned state, including continue, start-new, and list-all flows. | Context-gated to supported workflow/step. |
```

   - add `prepare_brainstorming_session` under the `workflow selection / routing helpers` list at [system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md#L85-L88)
   - add `prepare_brainstorming_session` to the visibility note sentence at [system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md#L179-L180), alongside the other context-gated workflow tools

## Step 3
[x] Add the narrow tool-owned workflow-form bridge to the task/runtime plumbing and keep constructor/test parity intact.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/types.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/types/TaskConfig.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/utils/ToolConstants.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/ToolExecutor.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L10-L18), widen `WorkflowFormTriggerSource` from:

```ts
export type WorkflowFormTriggerSource = "deterministic_workflow_progression" | "slash_command"
```

to:

```ts
export type WorkflowFormTriggerSource = "deterministic_workflow_progression" | "slash_command" | "tool_handler"
```

2. In [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L47-L50), extend `WorkflowFormSessionContext` by importing `WorkflowFormFieldOption` from `@shared/ExtensionMessage` and adding:

```ts
	brainstormingSessionOptions?: WorkflowFormFieldOption[]
```

immediately after `workflowStartRequirements?: WorkflowFormStartRequirements`.
3. In [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L1-L29), import `WorkflowFormSessionContext` and `WorkflowFormSessionOwner` from `@/core/task/workflow-form/types`.
4. In [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts#L151-L156), add this new callback signature immediately after `runUserPromptSubmitHook`:

```ts
		runWorkflowFormSession: (args: {
			resolverId: string
			owner: WorkflowFormSessionOwner
			initialPhase: "collect_inputs"
			context?: WorkflowFormSessionContext
		}) => Promise<void>
```

5. In [ToolConstants.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/utils/ToolConstants.ts#L55-L76), append `"runWorkflowFormSession"` to `TASK_CALLBACKS_KEYS` immediately after `"runUserPromptSubmitHook"`.
6. In [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L97-L137), add a new constructor parameter immediately after `runUserPromptSubmitHook`:

```ts
		private runWorkflowFormSession: (args: {
			resolverId: string
			owner: WorkflowFormSessionOwner
			initialPhase: "collect_inputs"
			context?: WorkflowFormSessionContext
		}) => Promise<void>,
```

and import the same two workflow-form types at the top of the file.
7. In [ToolExecutor.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/ToolExecutor.ts#L179-L217), add:

```ts
					runWorkflowFormSession: this.runWorkflowFormSession,
```

immediately after `runUserPromptSubmitHook: this.runUserPromptSubmitHook,`.
8. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1046-L1081), pass `this.runWorkflowFormSession.bind(this)` as the final `ToolExecutor` constructor argument immediately after `this.runUserPromptSubmitHook.bind(this)`.
9. In [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1476-L1537), add a new private method immediately after `clearWorkflowFormSession()` and before `renderWorkflowFormMessage(...)`:

```ts
	private async runWorkflowFormSession(args: {
		resolverId: string
		owner: WorkflowFormSessionOwner
		initialPhase: "collect_inputs"
		context?: WorkflowFormSessionContext
	}) {
		if (this.taskState.activeWorkflowFormSession) {
			throw new Error("A workflow form session is already active.")
		}

		this.taskState.activeWorkflowFormSession = this.workflowFormRuntime.createSession({
			resolverId: args.resolverId,
			triggerSource: "tool_handler",
			owner: args.owner,
			initialPhase: args.initialPhase,
			context: args.context,
		})
		await this.persistWorkflowFormSession()
		await this.maybeResolveWorkflowFormBeforeApiTurn()
	}
```

10. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L181-L243), add a new reflected method binding immediately after `clearWorkflowFormSession`:

```ts
const runWorkflowFormSession = Reflect.get(Task.prototype, "runWorkflowFormSession") as TaskMethod<
	[
		{
			resolverId: string
			owner: WorkflowFormSessionOwner
			initialPhase: "collect_inputs"
			context?: WorkflowFormSessionContext
		},
	],
	Promise<void>
>
```

and import `WorkflowFormSessionOwner` from `../workflow-form/types`.
11. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts), add one new test immediately after the metadata-persistence workflow-form tests and before the larger loop tests that:
   - builds a fake task with `taskState.activeWorkflowFormSession = undefined`
   - stubs `workflowFormRuntime.createSession` to return a session with `resolverId: "brainstorming_step_2_select_session"` and `triggerSource: "tool_handler"`
   - stubs `persistWorkflowFormSession` and `maybeResolveWorkflowFormBeforeApiTurn`
   - calls `runWorkflowFormSession` with:
     - `resolverId: "brainstorming_step_2_select_session"`
     - `owner.kind = "placeholder_workflow_step"`
     - `owner.workflowName = "brainstorming.md"`
     - `owner.stepNumber = 2`
     - `initialPhase: "collect_inputs"`
     - `context.brainstormingSessionOptions = [{ value: "/tmp/session-a.md", label: "session-a.md" }]`
   - asserts `createSession` received `triggerSource: "tool_handler"`
   - asserts `persistWorkflowFormSession` and `maybeResolveWorkflowFormBeforeApiTurn` were each called once
12. In each ToolExecutor constructor parity test file listed above, add one extra trailing `sinon.stub().resolves()` argument to the `new ToolExecutor(...)` call so the constructor arity matches the new `runWorkflowFormSession` callback parameter:
   - [ToolExecutor.responseToolFailureBudget.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts#L35-L75)
   - [ToolExecutor.nativeToolParity.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts#L30-L73)
   - [ToolExecutor.focusChainProtection.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts#L35-L69)
   - [ToolExecutor.focusChainProtection.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts#L119-L153)
   - [ToolExecutor.focusChainProtection.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts#L208-L242)

## Step 4
[x] Add the brainstorming session-picker workflow-form resolver and its registry coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Exact edits:
1. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L25-L30), add a new exported resolver id constant immediately after `QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_RESOLVER_ID`:

```ts
export const BRAINSTORMING_STEP_2_SELECT_SESSION_RESOLVER_ID = "brainstorming_step_2_select_session"
```

2. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L1-L23), add imports for:
   - `PREPARE_BRAINSTORMING_SESSION_LIST_FIELD_LABEL`
   - `PREPARE_BRAINSTORMING_SESSION_LIST_PROMPT`
   - `PREPARE_BRAINSTORMING_SESSION_LIST_TITLE`
from `@/shared/prepare-brainstorming-session`.
3. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L365-L779), add a new resolver entry immediately before `PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID` with exactly these behaviors:
   - `id: BRAINSTORMING_STEP_2_SELECT_SESSION_RESOLVER_ID`
   - `toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS`
   - `buildDefinition(session)`:
     - reads `const options = session.context?.brainstormingSessionOptions`
     - throws `new Error("Brainstorming session picker definition requires brainstormingSessionOptions.")` if `options` is missing or empty
     - calls `buildWorkflowStartRuntimeToolDictionary({ fieldKeys: ["output_file"] })` and uses the returned `title` and `markdown` for `toolDictionaryTitle` and `toolDictionaryMarkdown`
     - returns a definition with:
       - `title: PREPARE_BRAINSTORMING_SESSION_LIST_TITLE`
       - `pages.collect_inputs.prompt: PREPARE_BRAINSTORMING_SESSION_LIST_PROMPT`
       - one select field with:
         - `key: "output_file"`
         - `label: PREPARE_BRAINSTORMING_SESSION_LIST_FIELD_LABEL`
         - `help: "Choose an existing brainstorming session file to continue."`
         - `control: "select"`
         - `valueSchema: { type: "string", enum: options.map((option) => option.value) }`
         - `required: true`
         - `options`
         - `visible: true`
       - `submitLabel: "Continue"`
       - `cancelLabel: "Cancel"`
       - a matching `retry_error` page with the same field, prompt, submit/cancel labels, and `retryLabel: "Start Over"`
       - `successMessage: "The brainstorming session output file is ready."`
   - `buildToolExecutionFailureFallbackMessage()` returns exactly:

```ts
"The brainstorming session picker could not store output_file. Review the selected session and try again."
```

   - `buildToolExecutionRequest(_session, values)` returns:
     - `toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS`
     - `toolInput: { values: { output_file: <selected string> } }`
     - `toolParams: { values: JSON.stringify({ output_file: <selected string> }) }`
   - `evaluateToolExecutionResult(session, args)`:
     - returns `{ succeeded: false, errorMessage: args.toolResultText?.trim() ?? this.buildToolExecutionFailureFallbackMessage(session) }` when `isWorkflowFormFailureText(args.toolResultText)` is `true`
     - otherwise returns `{ succeeded: true }`
4. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L3-L10), import `BRAINSTORMING_STEP_2_SELECT_SESSION_RESOLVER_ID`.
5. Add one metadata test immediately after the existing resolver-id tests that asserts the new resolver id returns `toolName === "set_workflow_placeholders"`.
6. Add one definition test immediately after the workflow-start override tests that:
   - builds the new resolver with `phase: "collect_inputs"`
   - passes `context.brainstormingSessionOptions = [{ value: "/tmp/brainstorming-session-2026-04-08.md", label: "brainstorming-session-2026-04-08.md", description: "/tmp/brainstorming-session-2026-04-08.md" }]`
   - asserts:
     - `definition.title === "Select a Brainstorming Session"`
     - `definition.pages.collect_inputs?.prompt === "Choose an existing brainstorming session to continue."`
     - the only field key is `output_file`
     - the field label is `Session`
     - the field control is `select`
     - the field option value equals `/tmp/brainstorming-session-2026-04-08.md`
     - `definition.pages.collect_inputs?.submitLabel === "Continue"`
7. Add one serialization test immediately after that definition test that asserts `buildToolExecutionRequest(...)` produces:

```ts
{
	toolName: "set_workflow_placeholders",
	toolInput: { values: { output_file: "/tmp/brainstorming-session-2026-04-08.md" } },
	toolParams: { values: "{\"output_file\":\"/tmp/brainstorming-session-2026-04-08.md\"}" },
}
```

8. Do not edit any existing resolver behavior in this step.

## Step 5
[x] Implement `PrepareBrainstormingSessionToolHandler`, register it, and cover the runtime-owned Step 2 branches with handler tests.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts`

Exact edits:
1. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L5-L45), add the new handler import:

```ts
import { PrepareBrainstormingSessionToolHandler } from "./handlers/PrepareBrainstormingSessionToolHandler"
```

2. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L130-L137), add this mapping immediately after `BUILD_EPICS_DOCUMENT` and before `BUILD_EPIC_DELIVERY_SPEC`:

```ts
			[ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION]: (_v: ToolValidator) =>
				new PrepareBrainstormingSessionToolHandler(),
```

3. Create [PrepareBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts) using [SelectTargetEpicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts#L1-L150) and [BuildTechSpecDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L1-L198) as the sibling patterns. The new handler must implement exactly this behavior:
   - `readonly name = ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION`
   - top-level `execute(config, _block)` wrapper uses a single `try/catch` and returns `formatResponse.toolError(error instanceof Error ? error.message : String(error))` from the catch
   - if `config.yoloModeToggled === true`, return:

```ts
formatResponse.toolError(
	"prepare_brainstorming_session is unavailable while YOLO mode is enabled because no interactive user response can be collected.",
)
```

   - resolve the active placeholder workflow step via `getActivePlaceholderWorkflowStepDetails(...)`, matching the gating pattern from `SelectTargetEpicToolHandler`
   - if the active context is not `brainstorming.md` Step 2, return:

```ts
formatResponse.toolError(
	"prepare_brainstorming_session can only be used while brainstorming.md Step 2 is the active placeholder workflow context.",
)
```

   - resolve `output_folder` from merged placeholder workflow state using `getPlaceholderWorkflowValueMap(...)` and `resolvePlaceholderWorkflowText(...)`
   - if `output_folder` cannot be resolved, return:

```ts
formatResponse.toolError(
	"Could not resolve workflow placeholder 'output_folder' from the active placeholder workflow state.",
)
```

   - resolve the canonical template path via `buildWorkflowStablePlaceholders({ cwd: config.cwd })` and `resolveWorkflowPlaceholderText("{project-root}/.cline/skills/bmad-brainstorming/template.md", stablePlaceholders)`
   - if the template path cannot be resolved, return:

```ts
formatResponse.toolError(
	"Could not resolve the canonical brainstorming template path from stable workflow placeholders.",
)
```

   - if the template file cannot be read, return:

```ts
formatResponse.toolError(`Could not read the canonical brainstorming template at ${templatePath}.`)
```

   - inspect only `{output_folder}/brainstorming/`
   - match existing files only with:

```ts
/^brainstorming-session-(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.md$/
```

   - sort discovered sessions newest-first by parsed date descending, then suffix integer descending, with the unsuffixed base file treated as sequence `1`
   - when no matching sessions exist:
     - create the brainstorming directory recursively
     - create today’s canonical file using `{date}` from `buildWorkflowStablePlaceholders(...)`
     - if `brainstorming-session-YYYY-MM-DD.md` already exists, use the next unused `-2`, `-3`, and so on
     - write the template contents to the new file
     - call `recordAndPersistPlaceholderWorkflowWriteProof(...)`
     - set `config.taskState.didEditFile = true`
     - delete the lowercase cache entry from `config.taskState.fileReadCache`
     - call `persistWorkflowPlaceholderValues(config, { output_file: artifactPath })`
     - return exactly:

```ts
"Stored workflow placeholder output_file from the runtime-owned brainstorming session preparation flow."
```

   - when matching sessions exist:
     - ask the exact approved followup question with the exact three approved options
     - if the returned text is not one of the three options, return:

```ts
formatResponse.toolError(
	"prepare_brainstorming_session did not receive a valid session-preparation selection from the interactive followup ask.",
)
```

     - update the last `followup` message with the selected option exactly like `SelectTargetEpicToolHandler`
   - `Continue newest session` branch:
     - persist the first discovered session path as `{output_file}`
     - return the same success string above
   - `Start new session` branch:
     - use the same create-and-persist path described above, including the `-2` / `-3` collision rule
     - return the same success string above
   - `List all sessions` branch:
     - build `brainstormingSessionOptions` from the discovered sessions in newest-first order
     - each option must be:
       - `value: <absolute path>`
       - `label: path.basename(<absolute path>)`
       - `description: <absolute path>`
     - call `await config.callbacks.runWorkflowFormSession({ resolverId: BRAINSTORMING_STEP_2_SELECT_SESSION_RESOLVER_ID, owner: { kind: "placeholder_workflow_step", workflowName: "brainstorming.md", stepNumber: 2 }, initialPhase: "collect_inputs", context: { brainstormingSessionOptions } })`
     - after the callback returns, read `config.taskState.activePlaceholderWorkflowValues?.output_file`
     - if the persisted value is not exactly one of the option `value`s, return:

```ts
formatResponse.toolError("The brainstorming session picker did not persist a valid output_file selection.")
```

     - otherwise return the same success string above
4. Create [PrepareBrainstormingSessionToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts) using the structure from [SelectTargetEpicToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/SelectTargetEpicToolHandler.test.ts#L1-L277). Include exactly these tests:
   - `fails when output_folder is missing from merged placeholder workflow state`
   - `creates a new brainstorming session file from the canonical template when no sessions exist`
   - `asks the exact followup question and persists the newest existing session when Continue newest session is selected`
   - `creates brainstorming-session-YYYY-MM-DD-2.md when Start new session is selected and the same-day base file already exists`
   - `launches the workflow-form picker and accepts a persisted output_file from List all sessions`
   - `fails when List all sessions returns without persisting one of the offered session paths`
5. For the test config callback stub, add `runWorkflowFormSession: sinon.stub().resolves()` to the callbacks object.
6. In the `List all sessions` success test, make the callback stub mutate `config.taskState.activePlaceholderWorkflowValues = { output_file: <chosen option path> }` before resolving.
7. Do not edit any other handler in this step.

## Step 6
[ ] Run the exact verification commands for the Step 2 automation slice and do not make any further edits in this step.

Allowed files:
- None

Exact verification commands:
1. Run:

```sh
npm run test -- src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts
```

2. If any test fails, stop and report the failure before making any additional changes.
3. Do not edit any file in this step unless the user explicitly authorizes a follow-up fix outside this plan.

## Remediation Section

These follow-up steps are authorized only after the QA findings against [step-2-automation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/brainstorming/step-2-automation-requirements.md) have been confirmed. Execute them in order, one step at a time, exactly like the main plan steps above.

## Step 7
[x] Restrict Step 2 session discovery to real files only and prove that matching directories are ignored.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts`

Exact edits:
1. In [PrepareBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts#L72-L106), change `discoverBrainstormingSessions(sessionDirectory)` so it reads directory entries with `await fs.readdir(sessionDirectory, { withFileTypes: true })` instead of plain string names.
2. In that same helper, replace the current `entries: string[]` local and `.map((fileName) => { ... })` callback with a `Dirent`-based flow that:
   - iterates the returned entries as `entry`
   - returns `undefined` immediately when `entry.isFile()` is `false`
   - runs `SESSION_FILENAME_PATTERN.exec(entry.name)` instead of `fileName`
   - uses `entry.name` for both `absolutePath: path.join(sessionDirectory, entry.name)` and `fileName: entry.name`
   - keeps the existing date/suffix parsing and newest-first sort unchanged
3. Do not change the `ENOENT` empty-directory behavior in this helper.
4. In [PrepareBrainstormingSessionToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts), add a new test immediately after `asks the exact followup question and persists the newest existing session when Continue newest session is selected` that:
   - creates a real directory named `brainstorming-session-2026-04-08-3.md` inside the brainstorming output directory
   - creates real files `brainstorming-session-2026-04-08-2.md` and `brainstorming-session-2026-04-07.md`
   - selects `Continue newest session`
   - asserts the persisted `output_file` is the `brainstorming-session-2026-04-08-2.md` file path, not the matching directory path
5. In that same test file, update the existing `launches the workflow-form picker and accepts a persisted output_file from List all sessions` test so it also:
   - creates a real directory named `brainstorming-session-2026-04-08-9.md`
   - keeps the two real session files already used in the test
   - asserts the `brainstormingSessionOptions` payload passed to `runWorkflowFormSession` still contains only the two file-backed options and does not include the matching directory path

## Step 8
[x] Add the missing Step 2 failure and edge-case coverage required by the requirements document.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Exact edits:
1. In [PrepareBrainstormingSessionToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts), add a new import for the placeholder persistence module:

```ts
import * as workflowPlaceholderPersistence from "../SetWorkflowPlaceholdersToolHandler"
```

2. In that same test file, add a new test immediately after `fails when output_folder is missing from merged placeholder workflow state` that:
   - calls `createWorkspace()`
   - deletes the returned `templatePath`
   - executes the handler with a valid `outputFolder`
   - asserts the result equals `formatResponse.toolError(\`Could not read the canonical brainstorming template at ${templatePath}.\`)`
3. Add a new test immediately after `creates a new brainstorming session file from the canonical template when no sessions exist` that:
   - creates the workspace and config normally
   - uses a sinon sandbox to stub `fs.readdir` so it rejects with `Object.assign(new Error("Could not enumerate brainstorming sessions."), { code: "EACCES" })`
   - executes the handler
   - asserts the result equals `formatResponse.toolError("Could not enumerate brainstorming sessions.")`
4. Add a new test immediately after `creates brainstorming-session-YYYY-MM-DD-2.md when Start new session is selected and the same-day base file already exists` that:
   - creates the base file and the `-2` file for today
   - selects `Start new session`
   - asserts the new file path is `brainstorming-session-YYYY-MM-DD-3.md`
   - asserts the base and `-2` files remain unchanged
5. Add a new test immediately after that `-3` collision test that:
   - creates the workspace and config for the no-sessions path
   - stubs `fs.mkdir` to reject with `new Error("Could not create brainstorming directory.")`
   - executes the handler
   - asserts the result equals `formatResponse.toolError("Could not create brainstorming directory.")`
6. Add a new test immediately after the `fs.mkdir` failure test that:
   - creates the workspace and config for the no-sessions path
   - stores `const originalWriteFile = fs.writeFile.bind(fs)` before stubbing
   - stubs `fs.writeFile` with a call fake that:
     - delegates to `originalWriteFile` for every path except the expected new session artifact path
     - throws `new Error("Could not create brainstorming session file.")` for that expected artifact path
   - executes the handler
   - asserts the result equals `formatResponse.toolError("Could not create brainstorming session file.")`
7. Add a new test immediately after the `fs.writeFile` failure test that:
   - creates at least one real existing session file
   - stubs `workflowPlaceholderPersistence.persistWorkflowPlaceholderValues` to reject with `new Error("Could not persist output_file.")`
   - selects `Continue newest session`
   - executes the handler
   - asserts the result equals `formatResponse.toolError("Could not persist output_file.")`
8. Add a new test immediately after `fails when List all sessions returns without persisting one of the offered session paths` that:
   - creates at least one real existing session file
   - selects `List all sessions`
   - provides `runWorkflowFormSession: sinon.stub().rejects(new Error("Could not render brainstorming session picker."))`
   - executes the handler
   - asserts the result equals `formatResponse.toolError("Could not render brainstorming session picker.")`
9. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts), add `expect(() => ...)` coverage immediately after `builds the brainstorming session-picker definition` that:
   - calls `resolver.buildDefinition(...)` with the same brainstorming Step 2 session metadata used by that test
   - passes `context: {}` with no `brainstormingSessionOptions`
   - asserts the call throws exactly `Brainstorming session picker definition requires brainstormingSessionOptions.`
10. Do not add any production-code edits in this step.

## Step 9
[x] Run the corrected verification command for the Step 2 automation slice and stop if any test fails.

Allowed files:
- None

Exact verification commands:
1. Run:

```sh
npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/task/tools/handlers/__tests__/PrepareBrainstormingSessionToolHandler.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/__tests__/ToolExecutor.responseToolFailureBudget.test.ts src/core/task/__tests__/ToolExecutor.nativeToolParity.test.ts src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts
```

2. If any test fails, stop and report the failure before making any additional changes.
3. Do not edit any file in this step unless the user explicitly authorizes a follow-up fix outside this plan.
