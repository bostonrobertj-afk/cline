---
title: Workflow UI Surface Phase 1 Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Do not add pause points or permission checks beyond the stop-and-ask rule below.
  - If any ambiguity is discovered, or any code/test/doc/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
---

# Workflow UI Surface Phase 1 Action Plan

This plan implements [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md) for the single delivered Phase 1 use case:

- placeholder workflow: `code-review.md`
- workflow step: `Step 3`
- delivered trigger: deterministic workflow progression
- invoked existing tool: `build_review_diff_output`

Locked architectural constraints:

- The new capability is a runtime-only internal component.
- The capability must be slash-command-ready in general, but Phase 1 must not bind it to any specific slash command.
- The form capability must pause existing trigger paths and return control to those same paths after it resolves; it must not replace them.
- Raw human form inputs must not be replayed into model-visible context.
- The workflow form and tool dictionary must both remain schema-driven.
- The tool dictionary must use the system dictionary for human-friendly translations.
- Phase 1 uses open-at-line/range support for the dictionary affordance; Phase 1 does not add peek behavior.

Approved naming and contract constants:

- Ask type: `workflow_form`
- Say type: `workflow_form`
- Task RPC: `submitWorkflowForm`
- Task request: `WorkflowFormSubmissionRequest`
- File RPC: `openFileRelativePathAtRange`
- Runtime component root: `src/core/task/workflow-form/`
- Dictionary backing source: `src/core/task/workflow-form/dictionaries/systemDictionary.ts`
- Tool dictionary builder: `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`
- Generated docs:
  - `docs/workflow-ui-surface/system-dictionary.md`
  - `docs/workflow-ui-surface/tool-dictionary.md`
- Generator scripts:
  - `scripts/generate-workflow-ui-surface-docs.ts`
  - `scripts/verify-workflow-ui-surface-docs.ts`
- Package scripts:
  - `generate-workflow-ui-surface-docs`
  - `verify-workflow-ui-surface-docs`

Phase 1 behavioral constraints that must remain true after implementation:

- Initial `No` in the Step 3 workflow-form prompt falls back to the AI Step 3 path.
- Explicit cancel during the workflow-form flow also falls back to the AI Step 3 path.
- The fallback AI Step 3 path must not ask the human for the same diff-source inputs again; it must attempt to find a usable diff source itself and create the fallback artifact when it cannot.
- Tool execution errors stay inside the form flow first and show retry. If the user declines retry by cancelling from that error state, fall back to the AI Step 3 path.

## Step 1
[x] Add the generic Phase 1 contracts: new workflow-form ask/say enums, the structured submission request, and the file open-at-range RPC/host selection contract.

Allowed files:
- `proto/cline/ui.proto`
- `proto/cline/task.proto`
- `proto/cline/file.proto`
- `proto/host/window.proto`

Exact edits:
1. In `proto/cline/ui.proto` at the `ClineAsk` enum block on lines 35-54, append `WORKFLOW_FORM = 18;` immediately after `USE_SUBAGENTS = 17;`.
2. In `proto/cline/ui.proto` at the `ClineSay` enum block on lines 57-96, append `WORKFLOW_FORM_SAY = 38;` immediately after `SUBAGENT_USAGE = 37;`.
3. Do not add any new specialized payload messages to `proto/cline/ui.proto` in Phase 1. Follow the repo’s current ask/say pattern: the workflow-form render payload will be serialized into `ClineMessage.text`, just like `followup` and `generate_plan_output`.
4. In `proto/cline/task.proto` at the `TaskService` block on lines 12-45, insert a new unary RPC immediately after `askResponse(AskResponseRequest)`:

```proto
  // Sends a structured workflow-form submission to the active task/runtime
  rpc submitWorkflowForm(WorkflowFormSubmissionRequest) returns (Empty);
```

5. In `proto/cline/task.proto` immediately after `AskResponseRequest` on lines 108-115, insert these new messages exactly:

```proto
enum WorkflowFormAction {
  WORKFLOW_FORM_ACTION_UNSPECIFIED = 0;
  SUBMIT = 1;
  CANCEL = 2;
  RETRY = 3;
}

message WorkflowFormFieldValue {
  oneof kind {
    string string_value = 1;
    int32 integer_value = 2;
    StringArray string_array_value = 3;
  }
}

message WorkflowFormFieldSubmission {
  string key = 1;
  WorkflowFormFieldValue value = 2;
}

message WorkflowFormSubmissionRequest {
  Metadata metadata = 1;
  string session_id = 2;
  WorkflowFormAction action = 3;
  repeated WorkflowFormFieldSubmission fields = 4;
}
```

6. In `proto/cline/file.proto` at the `FileService` block on lines 64-71, insert a new RPC immediately after `openFileRelativePath(StringRequest)`:

```proto
  // Open a file in the editor by a relative path and reveal a target line/range
  rpc openFileRelativePathAtRange(OpenFileRelativePathAtRangeRequest) returns (Empty);
```

7. In `proto/cline/file.proto`, immediately after the `FileService` block and before `RefreshedRules`, insert this request message exactly:

```proto
message OpenFileRelativePathAtRangeRequest {
  Metadata metadata = 1;
  string relative_path = 2;
  int32 start_line = 3;
  optional int32 start_character = 4;
  optional int32 end_line = 5;
  optional int32 end_character = 6;
  optional bool preserve_focus = 7;
  optional bool preview = 8;
}
```

8. In `proto/host/window.proto` at `ShowTextDocumentOptions` on lines 47-52, append these optional fields exactly:

```proto
  optional int32 selection_start_line = 4;
  optional int32 selection_start_character = 5;
  optional int32 selection_end_line = 6;
  optional int32 selection_end_character = 7;
```

9. Do not add peek-related RPCs, messages, or options in this step.

## Step 2
[x] Regenerate proto outputs, add the new ask/say unions and shared workflow-form payload types, and wire the new enum mappings.

Allowed files:
- `src/shared/ExtensionMessage.ts`
- `src/shared/WebviewMessage.ts`
- `src/shared/proto-conversions/cline-message.ts`
- `src/shared/proto/**`
- `src/generated/**`
- `webview-ui/src/services/grpc-client.ts`

Exact edits:
1. In `src/shared/ExtensionMessage.ts` at `ClineAsk` on lines 159-177, append `"workflow_form"`.
2. In `src/shared/ExtensionMessage.ts` at `ClineSay` on lines 179-218, append `"workflow_form"`.
3. In `src/shared/ExtensionMessage.ts` immediately after `ClineAskNewTask` on lines 373-375, add these shared JSON payload interfaces exactly:

```ts
export type WorkflowFormPhase = "confirm" | "collect" | "retry_error" | "success"
export type WorkflowFormFieldControl = "select" | "text" | "textarea" | "number"

export interface WorkflowFormFieldOption {
	value: string
	label: string
	description?: string
}

export interface WorkflowFormFieldValuePayload {
	stringValue?: string
	integerValue?: number
	stringArrayValue?: string[]
}

export interface WorkflowFormFieldDefinition {
	key: string
	label: string
	help: string
	control: WorkflowFormFieldControl
	required: boolean
	placeholder?: string
	options?: WorkflowFormFieldOption[]
	visible?: boolean
}

export interface ClineWorkflowForm {
	sessionId: string
	resolverId: string
	toolName: string
	title: string
	prompt: string
	phase: WorkflowFormPhase
	toolDictionaryRelativePath: string
	toolDictionaryStartLine: number
	options?: string[]
	fields?: WorkflowFormFieldDefinition[]
	values?: Record<string, WorkflowFormFieldValuePayload>
	submitLabel?: string
	cancelLabel?: string
	retryLabel?: string
	errorMessage?: string
	successMessage?: string
}
```

4. In `src/shared/WebviewMessage.ts` at line 19, do not extend `ClineAskResponse`. The new structured workflow-form submission must stay separate from `askResponse`.
5. In `src/shared/proto-conversions/cline-message.ts`, extend both enum maps:
   - at lines 23-42 add `workflow_form: ClineAsk.WORKFLOW_FORM`
   - at lines 56-75 add `[ClineAsk.WORKFLOW_FORM]: "workflow_form"`
   - at lines 179-219 add `workflow_form: ClineSay.WORKFLOW_FORM_SAY`
   - at lines 232-271 add `[ClineSay.WORKFLOW_FORM_SAY]: "workflow_form"`
6. Do not add specialized proto payload-field conversion logic for workflow forms in this file. Keep the payload in `message.text` JSON for Phase 1.
7. Run `npm run protos` exactly once after the proto edits from Step 1 are complete.
8. Keep all generated changes produced by `npm run protos`, including:
   - `src/shared/proto/cline/ui.ts`
   - `src/shared/proto/cline/task.ts`
   - `src/shared/proto/cline/file.ts`
   - `src/shared/proto/host/window.ts`
   - matching `src/generated/grpc-js/**`
   - matching `src/generated/nice-grpc/**`
   - `src/generated/hosts/**`
   - `webview-ui/src/services/grpc-client.ts`

## Step 3
[x] Add Phase 1 open-at-range file plumbing and keep existing plain file-open behavior unchanged.

Allowed files:
- `src/core/controller/file/openFileRelativePath.ts`
- `src/core/controller/file/openFileRelativePathAtRange.ts`
- `src/integrations/misc/open-file.ts`
- `src/hosts/vscode/hostbridge/window/showTextDocument.ts`
- `src/core/controller/file/__tests__/openFileRelativePath.test.ts`
- `src/core/controller/file/__tests__/openFileRelativePathAtRange.test.ts`

Exact edits:
1. Leave `src/core/controller/file/openFileRelativePath.ts` lines 14-35 behaviorally unchanged for the existing RPC.
2. Add a new file `src/core/controller/file/openFileRelativePathAtRange.ts` that mirrors the workspace-relative resolution logic from `openFileRelativePath.ts`, but consumes `OpenFileRelativePathAtRangeRequest` and calls a new `openFile(...)` overload with:
   - resolved absolute path
   - `preserveFocus ?? false`
   - `preview ?? false`
   - a selection object built from:
     - `startLine = request.startLine`
     - `startCharacter = request.startCharacter ?? 1`
     - `endLine = request.endLine ?? request.startLine`
     - `endCharacter = request.endCharacter ?? (request.startCharacter ?? 1)`
3. In `src/integrations/misc/open-file.ts` at lines 32-44, change the `openFile(...)` signature to:

```ts
export async function openFile(
	absolutePath: string,
	preserveFocus: boolean = false,
	preview: boolean = false,
	selection?: {
		startLine: number
		startCharacter: number
		endLine: number
		endCharacter: number
	},
)
```

4. In the same function, when `selection` is present, pass the new `selectionStartLine`, `selectionStartCharacter`, `selectionEndLine`, and `selectionEndCharacter` fields into `HostProvider.window.showTextDocument`.
5. In `src/hosts/vscode/hostbridge/window/showTextDocument.ts` at lines 27-39:
   - keep the existing preview/focus/viewColumn handling
   - add a `selection` property to `vscode.TextDocumentShowOptions` when `request.options.selectionStartLine` is defined
   - convert the 1-based request coordinates to VS Code’s 0-based `vscode.Position`
   - use the request’s explicit end coordinates when present; otherwise select the start position only
6. Add a new test file `src/core/controller/file/__tests__/openFileRelativePathAtRange.test.ts` covering:
   - relative path resolution to the correct absolute path
   - forwarding the correct 1-based selection values into the integration layer
   - no-op behavior when no workspace exists
7. Extend `src/core/controller/file/__tests__/openFileRelativePath.test.ts` only if needed to verify the plain RPC still forwards the original call shape and does not require selection data.

## Step 4
[x] Add the runtime-only workflow-form component, its session/payload types, and the generic dictionary-generation pipeline.

Allowed files:
- `src/core/task/workflow-form/types.ts`
- `src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `src/core/task/workflow-form/WorkflowFormRuntime.ts`
- `src/core/task/workflow-form/dictionaries/systemDictionary.ts`
- `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`
- `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`
- `scripts/generate-workflow-ui-surface-docs.ts`
- `scripts/verify-workflow-ui-surface-docs.ts`
- `package.json`
- `docs/workflow-ui-surface/system-dictionary.md`
- `docs/workflow-ui-surface/tool-dictionary.md`

Exact edits:
1. Add `src/core/task/workflow-form/types.ts` with:
   - `WorkflowFormResolverId = "code_review_step_3_diff_source"`
   - `WorkflowFormTriggerSource = "deterministic_workflow_progression" | "slash_command"`
   - `WorkflowFormSessionOwner` shape:
     - `kind: "placeholder_workflow_step" | "slash_command"`
     - workflow owner fields for Phase 1:
       - `workflowName`
       - `stepNumber`
   - `WorkflowFormSessionState` shape:
     - `sessionId`
     - `resolverId`
     - `triggerSource`
     - `owner`
     - `phase`
     - `values`
     - `lastError`
   - `WorkflowFormResolverDefinition` shape with:
     - `id`
     - `toolName`
     - `toolDictionaryRelativePath`
     - `getToolDictionaryStartLine(markdown: string): number`
     - `buildConfirmPayload(...)`
     - `buildCollectPayload(...)`
     - `buildRetryPayload(...)`
     - `translateSubmissionToToolUse(...)`
2. Add `src/core/task/workflow-form/WorkflowFormRegistry.ts` with one exported registry entry only:
   - resolver id: `code_review_step_3_diff_source`
   - tool name: `build_review_diff_output`
   - dictionary path: `docs/workflow-ui-surface/tool-dictionary.md`
   - tool-entry anchor rule: locate the first exact line equal to `## build_review_diff_output`
3. In that registry entry, define the Phase 1 form exactly as follows:
   - confirm phase:
     - title: `Prepare Diff Input`
     - prompt explaining that the system can build the Step 3 diff artifact directly if the user already knows the diff source
     - options exactly `Yes` and `No`
   - collect/retry phases:
     - `source.type` select with options `commit`, `commit_range`, `ref_diff`, `worktree_head_scoped`
     - conditional required inputs:
       - `source.commit`: single-line text
       - `source.base`: single-line text
       - `source.head`: single-line text
       - `scoped_paths`: multiline textarea, one repo-relative path per line, required only when `source.type === "worktree_head_scoped"`
     - optional inputs for non-`worktree_head_scoped`:
       - `scoped_paths`: multiline textarea
       - `context_lines`: number input with placeholder `3`
4. `translateSubmissionToToolUse(...)` must convert form fields into the exact canonical Phase 1 tool shape:
   - `source.type = "commit"` => `{ source: { type: "commit", commit } }`
   - `source.type = "commit_range"` => `{ source: { type: "commit_range", base, head } }`
   - `source.type = "ref_diff"` => `{ source: { type: "ref_diff", base, head } }`
   - `source.type = "worktree_head_scoped"` => `{ source: { type: "worktree_head_scoped" }, scoped_paths }`
   - for all non-`worktree_head_scoped` variants, include `scoped_paths` only when at least one trimmed line exists
   - include `context_lines` only when the form supplies a valid integer
5. Add `src/core/task/workflow-form/dictionaries/systemDictionary.ts` with a structured export that supports:
   - `label`
   - `medium`
   - `long`
   - `examples`
   - `contextTags`
6. Populate the Phase 1 system dictionary with every technical term that appears in the `build_review_diff_output` form flow or tool dictionary entry, including all of these exact keys:
   - `source`
   - `commit`
   - `commit_range`
   - `ref_diff`
   - `worktree_head_scoped`
   - `scoped_paths`
   - `context_lines`
   - `git_ref`
   - `commit_hash`
   - `branch`
   - `tag`
   - `remote_branch_reference`
   - `repo_relative_path`
   - `head`
   - `staged_changes`
   - `unstaged_changes`
   - `unified_diff`
   - `artifact`
7. Add `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts` that:
   - imports the `build_review_diff_output` schema from `src/core/prompts/system-prompt/tools/build_review_diff_output.ts`
   - imports the system dictionary
   - generates one consolidated markdown tool dictionary
   - writes a stable `## build_review_diff_output` heading
   - renders required vs optional status from the schema itself
   - replaces technical term phrases with system-dictionary labels/explanations in the output text
8. Add `scripts/generate-workflow-ui-surface-docs.ts` to generate:
   - `docs/workflow-ui-surface/system-dictionary.md`
   - `docs/workflow-ui-surface/tool-dictionary.md`
9. Add `scripts/verify-workflow-ui-surface-docs.ts` to fail when either generated doc no longer matches its generated output exactly.
10. In `package.json` at lines 402-409, add these scripts immediately after `protos`:

```json
"generate-workflow-ui-surface-docs": "npx tsx scripts/generate-workflow-ui-surface-docs.ts",
"verify-workflow-ui-surface-docs": "npx tsx scripts/verify-workflow-ui-surface-docs.ts",
```

11. Add tests proving:
   - the tool dictionary start line resolver finds `## build_review_diff_output`
   - the generated tool dictionary reflects schema-required vs optional status
   - every Phase 1 technical term used in the tool dictionary has a system-dictionary translation entry

## Step 5
[x] Add workflow-form session persistence and the dedicated structured submission path without overloading existing ask-response behavior.

Allowed files:
- `src/core/task/TaskState.ts`
- `src/core/context/context-tracking/ContextTrackerTypes.ts`
- `src/core/task/index.ts`
- `src/core/controller/task/submitWorkflowForm.ts`
- `src/core/controller/task/askResponse.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `src/core/controller/task/askResponse.test.ts`
- `src/core/controller/task/__tests__/submitWorkflowForm.test.ts`

Exact edits:
1. In `src/core/task/TaskState.ts` at lines 136-150, add one new optional persisted field:

```ts
	activeWorkflowFormSession?: WorkflowFormSessionState
```

Import the type from `@/core/task/workflow-form/types`.
2. In `src/core/context/context-tracking/ContextTrackerTypes.ts` at `TaskMetadata` on lines 35-50, add:

```ts
	activeWorkflowFormSession?: WorkflowFormSessionState
```

3. In `src/core/task/index.ts`:
   - at `getAwaitingUserResponseSubtypeForAsk(...)` around line 560, add a special case so `workflow_form` returns `AwaitingUserResponseSubtypes.SYSTEM` for both partial and finalized asks
   - at `handleWebviewAskResponse(...)` around line 1196, leave the existing generic ask-response handler unchanged
   - in metadata persistence around lines 1506-1512, persist `activeWorkflowFormSession`
   - in metadata restore around lines 1653-1659, restore `activeWorkflowFormSession`
   - in each placeholder-workflow/managed-workflow reset block around lines 1438-1444, 1468-1473, and 1487-1492, explicitly clear `activeWorkflowFormSession`
4. Add `src/core/controller/task/submitWorkflowForm.ts` as the sole handler for the new RPC. It must:
   - return `Empty` if there is no active task
   - call `controller.task.handleWorkflowFormSubmission(request)`
   - never route through `askResponse`
5. In `src/core/controller/task/askResponse.ts` on lines 21-109, do not add workflow-form submission cases. Keep this handler scoped to the existing text-centric ask responses only.
6. Add `Task` methods in `src/core/task/index.ts` for:
   - `handleWorkflowFormSubmission(request: WorkflowFormSubmissionRequest)`
   - `persistWorkflowFormSession()`
   - `clearWorkflowFormSession()`
7. `handleWorkflowFormSubmission(...)` must:
   - validate the submitted `session_id` matches the active session
   - branch on `action`
   - hand the request to `WorkflowFormRuntime`
   - never copy the raw submitted values into `taskState.userMessageContent`
8. Add tests proving:
   - workflow-form session metadata persists and restores
   - `askResponse` does not accept workflow-form submissions
   - `submitWorkflowForm` routes only to the dedicated task method

## Step 6
[x] Insert the workflow-form runtime into the deterministic placeholder workflow progression path for `code-review.md` Step 3 only, and keep the fallback AI path intact.

Allowed files:
- `src/core/task/index.ts`
- `src/core/task/focus-chain/index.ts`
- `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
- `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `/Users/robertboston/Documents/Cline/Workflows/code-review.md`

Exact edits:
1. In `/Users/robertboston/Documents/Cline/Workflows/code-review.md` lines 33-51, rewrite Step 3 so:
   - the heading explicitly marks the step as system-owned, using this exact heading:

```md
## Step 3: System-Owned Diff Source Resolution And Diff Output Persistence
```

   - the goal line explicitly states the primary path is runtime-owned and AI instructions are fallback-only
   - the existing body becomes fallback instructions only
2. The fallback Step 3 body must say all of the following explicitly:
   - the agent is in the fallback path because the system-owned workflow-form path was not completed
   - do not ask the human to restate or re-enter a diff source they already declined to provide in the form flow
   - first inspect available workflow context, story context, placeholders, and repo state to find a supported diff source
   - use `build_review_diff_output` whenever a supported source is discovered
   - use raw `git show` / `git diff` only when the tool is unavailable, errors, or the requested diff source is outside the supported contract
   - if no supported or fallback diff source is available, still create `review-input.diff` with explicit fallback notes
3. In `src/core/task/index.ts`, add a pre-API-turn interception point immediately before prompt assembly begins around the block that starts at line 2790. Insert a call named exactly `maybeResolveWorkflowFormBeforeApiTurn()` before `activePlaceholderWorkflowPromptContext` is computed.
4. Implement `maybeResolveWorkflowFormBeforeApiTurn()` in `src/core/task/index.ts` so it:
   - returns immediately unless all of these are true:
     - `activePlaceholderWorkflowSource?.name === "code-review.md"`
     - current incomplete step number is `3`
     - `{diff_output}` is not already satisfied
   - creates a Phase 1 workflow-form session when one does not already exist
   - sends a `workflow_form` ask using `this.ask(...)`
   - waits for the workflow-form runtime to either:
     - execute `build_review_diff_output` successfully through the existing `ToolExecutor.executeTool(...)` path, or
     - return a fallback-to-agent outcome
   - if the outcome is fallback-to-agent, clears the workflow-form session and allows the normal AI turn to continue
   - if the outcome is successful deterministic resolution, clears the workflow-form session and returns early from the current API-turn setup so deterministic progression can advance before the AI is invoked again
5. To preserve the existing tool-result flow, the workflow-form runtime must call `ToolExecutor.executeTool(...)` with a synthetic `ToolUse` block for `build_review_diff_output` rather than calling `BuildReviewDiffOutputToolHandler` directly.
6. In `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`:
   - do not change Step 3 completion semantics
   - continue treating Step 3 as completed only when `{diff_output}` points to a fresh `review-input.diff`
   - rely on the invoked tool’s normal output/result to satisfy the done signal
7. In `src/core/task/focus-chain/index.ts`, do not add a parallel post-step progression path. Keep using the existing deterministic progression mechanism.
8. Add tests proving:
   - the runtime intercepts only `code-review.md` Step 3
   - successful tool-backed form resolution results in the same Step 3 completion signal as the existing deterministic path
   - fallback-to-agent leaves Step 3 unresolved so the fallback AI instructions are shown on the next AI turn

## Step 7
[x] Implement the Phase 1 webview workflow-form frame, dictionary-open control, and dedicated structured submission flow.

Allowed files:
- `webview-ui/src/components/chat/ChatRow.tsx`
- `webview-ui/src/components/chat/OptionsButtons.tsx`
- `webview-ui/src/components/chat/ChatRow.test.tsx`
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`
- `webview-ui/src/components/ui/button.tsx`
- `webview-ui/src/components/ui/select.tsx`
- `webview-ui/src/services/grpc-client.ts`
- `src/shared/ExtensionMessage.ts`

Exact edits:
1. In `webview-ui/src/components/chat/ChatRow.tsx` at the `ask` switch around lines 1210-1344, add a new `case "workflow_form":`.
2. Parse `message.text` as `ClineWorkflowForm` from `@shared/ExtensionMessage`.
3. Render the Phase 1 interaction in a single inline system-owned frame with these exact behaviors:
   - header label indicates a system-owned form interaction rather than an AI-authored question
   - `confirm` phase:
     - show the prompt
     - render `Yes` / `No` using the existing `OptionsButtons` component
   - `collect` and `retry_error` phases:
     - show the prompt
     - render a button labeled exactly `About build_review_diff_output`
     - clicking that button must call the new `FileServiceClient.openFileRelativePathAtRange(...)` with:
       - relative path from the payload
       - start line from the payload
       - `preview: false`
       - `preserveFocus: false`
     - render the schema-driven field controls:
       - select for `source.type`
       - single-line text inputs for `source.commit`, `source.base`, `source.head`
       - multiline textarea for `scoped_paths`
       - numeric text input for `context_lines`
     - keep `Submit` disabled until the currently selected source’s required fields are valid
     - render `Cancel` in all collect/retry states
     - render `Retry` only in `retry_error`
   - `success` phase:
     - show the success message and no inputs
4. In `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts`:
   - do not route `workflow_form` through `TaskServiceClient.askResponse`
   - add a dedicated `submitWorkflowForm(...)` helper that calls `TaskServiceClient.submitWorkflowForm(...)`
   - do not allow freeform composer sends while `clineAsk === "workflow_form"` and `awaitingUserResponseSubtype === "system"`
5. Add a dedicated submission builder that maps UI values into the approved `WorkflowFormSubmissionRequest` shape:
   - `source.type`, `source.commit`, `source.base`, `source.head` => `string_value`
   - `scoped_paths` => `string_array_value`
   - `context_lines` => `integer_value`
6. `Yes` must transition into the structured form by submitting a `submitWorkflowForm` request with:
   - `action = SUBMIT`
   - `fields = [{ key: "confirm", value: { string_value: "yes" } }]`
7. `No` must fall back to the AI path by submitting:
   - `action = CANCEL`
   - no fields
8. In the collect/retry UI:
   - `Cancel` submits `action = CANCEL`
   - `Retry` submits `action = RETRY`
   - `Submit` submits `action = SUBMIT` with the current structured fields
9. Extend `ChatRow.test.tsx` and `useMessageHandlers.test.tsx` to cover:
   - `workflow_form` confirm rendering
   - dictionary open button wiring
   - structured submission routing through `submitWorkflowForm`
   - composer suppression while the system-owned form is awaiting input

## Step 8
[x] Add the dedicated controller/runtime tests, generate the docs, and run only the prescribed verification commands.

Allowed files:
- `src/core/controller/file/__tests__/openFileRelativePathAtRange.test.ts`
- `src/core/controller/task/__tests__/submitWorkflowForm.test.ts`
- `src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`
- `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
- `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
- `src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts`
- `webview-ui/src/components/chat/ChatRow.test.tsx`
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`
- generated docs under `docs/workflow-ui-surface/`

Exact verification commands:
1. Run:

```sh
npm run generate-workflow-ui-surface-docs
```

2. Run:

```sh
npm run verify-workflow-ui-surface-docs
```

3. Run:

```sh
npm run test:unit -- src/core/controller/file/__tests__/openFileRelativePath.test.ts src/core/controller/file/__tests__/openFileRelativePathAtRange.test.ts src/core/controller/task/askResponse.test.ts src/core/controller/task/__tests__/submitWorkflowForm.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts src/core/task/focus-chain/__tests__/FocusChainManager.placeholderWorkflow.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts --exit
```

4. Run:

```sh
cd webview-ui && npm run test -- src/components/chat/ChatRow.test.tsx src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx
```

5. Do not run the full backend test suite.
6. Do not run any slash-command-specific Phase 2 tests.
7. If any additional failing test requires a change not already prescribed in Steps 1-7, stop and ask for input instead of widening scope.
