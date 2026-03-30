---
instructions:
  - Read the frontmatter first and follow it literally.
  - Read each step in full before making any change.
  - Execute only the current step.
  - After completing a step, change that step's checkbox from `[ ]` to `[x]`.
  - Then stop and read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - Do not widen scope beyond the allowed-files list for the current step.
  - Do not make any change that is not explicitly prescribed in this plan.
  - Use `apply_patch` for all file edits.
  - Run only the exact verification command listed in Step 4.
  - If any ambiguity is discovered, or any necessary change is not explicitly prescribed here, stop immediately and ask for input before proceeding.
---

# Workflow UI Surface Remediation Action Plan

## Scope

This plan implements the requirements documented in [docs/workflow-ui-surface/remediation.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/remediation.md) by removing the workflow-form runtime dependency on `docs/workflow-ui-surface/...`, keeping the tool dictionary available as a read-only runtime reference, keeping the system dictionary internal, and ensuring the runtime UX no longer exposes internal implementation naming such as `workflow-ui-surface`.

This plan does not redesign the workflow-form transport or deterministic progression system. It only changes the runtime help/documentation surface for the Phase 1 Step 3 workflow form.

## Step 1

- [x] Replace the workflow-form dictionary contract so the runtime payload carries user-facing dictionary content directly instead of carrying a repo-relative file path.

Allowed files:
- `src/shared/ExtensionMessage.ts`
- `src/core/task/workflow-form/types.ts`
- `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`
- `src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `src/core/task/workflow-form/WorkflowFormRuntime.ts`

Exact changes:

1. In [src/shared/ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L405), update `ClineWorkflowForm` so it no longer exposes `toolDictionaryRelativePath` and `toolDictionaryStartLine`.
   Replace those two fields with exactly these two fields:
   - `toolDictionaryTitle: string`
   - `toolDictionaryMarkdown: string`

2. In [src/core/task/workflow-form/types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts#L26), remove the path-based resolver contract.
   Make these exact signature changes:
   - remove `toolDictionaryRelativePath: string`
   - remove `getToolDictionaryStartLine(markdown: string): number`
   - change `buildConfirmPayload(session: WorkflowFormSessionState, toolDictionaryMarkdown: string): ClineWorkflowForm` to `buildConfirmPayload(session: WorkflowFormSessionState): ClineWorkflowForm`
   - change `buildCollectPayload(session: WorkflowFormSessionState, toolDictionaryMarkdown: string): ClineWorkflowForm` to `buildCollectPayload(session: WorkflowFormSessionState): ClineWorkflowForm`
   - change `buildRetryPayload(session: WorkflowFormSessionState, toolDictionaryMarkdown: string): ClineWorkflowForm` to `buildRetryPayload(session: WorkflowFormSessionState): ClineWorkflowForm`

3. In [src/core/task/workflow-form/dictionaries/buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L9), keep `buildToolDictionaryMarkdown()` unchanged as the docs-mirror generator, but add a new runtime-facing helper for the current form tool entry.
   Add exactly:
   - `export const WORKFLOW_FORM_RUNTIME_TOOL_REFERENCE_TITLE = "Diff Source Reference"`
   - `export function buildRuntimeToolDictionaryMarkdown(): string`

   Implement `buildRuntimeToolDictionaryMarkdown()` as follows:
   - it must reuse the same schema-driven/spec-driven content sources already used by `buildToolDictionaryMarkdown()`
   - it must return only the `build_review_diff_output` entry content needed by the runtime help surface
   - it must not include the top-level heading `# Workflow UI Surface Tool Dictionary`
   - it must not include the generated-from line `Generated from ...`
   - it must begin with the existing tool heading `## build_review_diff_output`
   - it must preserve the existing supported-source, parameters, and term-reference sections for that tool entry

4. In [src/core/task/workflow-form/WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L1), stop deriving payload data from a repo file path.
   Make these exact edits:
   - remove the `WORKFLOW_FORM_TOOL_DICTIONARY_HEADING` import
   - import `buildRuntimeToolDictionaryMarkdown` and `WORKFLOW_FORM_RUNTIME_TOOL_REFERENCE_TITLE`
   - delete `getDictionaryStartLine(...)`
   - declare one module-level constant named `RUNTIME_TOOL_DICTIONARY_MARKDOWN` initialized to `buildRuntimeToolDictionaryMarkdown()`
   - in `buildBasePayload(...)`, remove the `toolDictionaryMarkdown` parameter entirely
   - in `buildBasePayload(...)`, set:
     - `toolDictionaryTitle: WORKFLOW_FORM_RUNTIME_TOOL_REFERENCE_TITLE`
     - `toolDictionaryMarkdown: RUNTIME_TOOL_DICTIONARY_MARKDOWN`
   - remove every remaining use of `toolDictionaryRelativePath`
   - remove every remaining use of `toolDictionaryStartLine`
   - remove the resolver fields `toolDictionaryRelativePath` and `getToolDictionaryStartLine`
   - update `buildConfirmPayload`, `buildCollectPayload`, and `buildRetryPayload` so each calls `buildBasePayload(session, { ... })` without a markdown argument

5. In [src/core/task/workflow-form/WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L1), remove file-based dictionary loading entirely.
   Make these exact edits:
   - delete the `existsSync` and `readFileSync` imports
   - delete the `path` import
   - delete `resolveWorkflowFormAssetPath(...)`
   - delete `defaultReadToolDictionaryMarkdown(...)`
   - change the constructor to accept only `private readonly resolvers: Record<string, WorkflowFormResolverDefinition> = workflowFormRegistry`
   - remove every call to `this.readToolDictionaryMarkdown(...)`
   - in `buildPayload(...)`, call `resolver.buildConfirmPayload(session)`, `resolver.buildCollectPayload(session)`, and `resolver.buildRetryPayload(session)` directly
   - in `buildRetryPayload(...)`, call `this.getResolver(retrySession.resolverId).buildRetryPayload(retrySession)` directly
   - in `buildSuccessPayload(...)`, call `resolver.buildCollectPayload({ ...session, phase: "success" })`
   - in `handleSubmission(...)`, when confirm transitions to collect, call `resolver.buildCollectPayload(nextSession)` directly

6. Do not edit the docs-generation scripts in this step. The existing docs mirror behavior stays in place for now; this step only removes live runtime dependence on those docs files.

## Step 2

- [x] Replace the workflow-form UI's file-open behavior with a read-only in-app dictionary surface that uses the runtime payload content and does not expose repo paths or `workflow-ui-surface`.

Allowed files:
- `webview-ui/src/components/chat/ChatRow.tsx`

Exact changes:

1. In [webview-ui/src/components/chat/ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L1), remove the workflow-form dependency on workspace file opening.
   Make these exact edits:
   - remove the `OpenFileRelativePathAtRangeRequest` import
   - remove `FileServiceClient` from the `@/services/grpc-client` import

2. In the component state section near [webview-ui/src/components/chat/ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L222), add exactly one new piece of state:
   - `const [isWorkflowDictionaryOpen, setIsWorkflowDictionaryOpen] = useState(false)`

3. Replace `handleWorkflowDictionaryOpen` at [webview-ui/src/components/chat/ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L504) with a simple modal-toggle callback.
   The new callback must:
   - return immediately if `workflowForm` is falsy
   - otherwise call `setIsWorkflowDictionaryOpen(true)`
   - it must no longer call any gRPC file-open method
   - it must no longer log path-open failures

4. Add the dialog imports needed for an in-app read-only surface.
   In the import section, add:
   - `Dialog`
   - `DialogContent`
   - `DialogHeader`
   - `DialogTitle`
   from `@/components/ui/dialog`

5. In the workflow-form render block at [webview-ui/src/components/chat/ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L1450), change the dictionary button and add the modal.
   Make these exact edits:
   - change the button label from the hardcoded `About build_review_diff_output` to `About ${workflowForm.toolDictionaryTitle}`
   - keep the button available only in `collect` and `retry_error`
   - directly after that button, render a `Dialog` controlled by `isWorkflowDictionaryOpen`
   - `Dialog` must close by calling `setIsWorkflowDictionaryOpen(false)` when `onOpenChange` receives `false`
   - inside the dialog, render:
     - `DialogContent` with a class that allows vertical scrolling for long markdown content
     - `DialogHeader`
     - `DialogTitle` showing `workflowForm.toolDictionaryTitle`
     - a read-only markdown body using `MarkdownRow markdown={workflowForm.toolDictionaryMarkdown}`
   - do not add any edit affordances, file-path labels, repo-path labels, or workspace-open buttons inside the dialog

6. Do not change any workflow-form submission behavior, ownership, or button routing in this step. Only change how the dictionary reference is presented.

## Step 3

- [x] Update regression coverage so tests validate the new runtime help contract, the in-app read-only dictionary UX, and the removal of any required `docs/...` runtime dependency.

Allowed files:
- `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`
- `webview-ui/src/components/chat/ChatRow.test.tsx`
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`

Exact changes:

1. In [src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1):
   - remove the injected dictionary-reader constructor usage and instantiate `new WorkflowFormRuntime()` directly in the shared runtime fixture
   - replace the old repo-root/path-resolution test at lines 124-146 with a new install-like regression test that:
     - temporarily changes `process.cwd()` to `/`
     - builds a session with `new WorkflowFormRuntime()`
     - asserts `payload.title === "Prepare Diff Input"`
     - asserts `payload.toolDictionaryTitle === "Diff Source Reference"`
     - asserts `payload.toolDictionaryMarkdown` includes `## build_review_diff_output`
     - asserts `payload.toolDictionaryMarkdown` does not include `# Workflow UI Surface Tool Dictionary`
     - asserts `payload.toolDictionaryMarkdown` does not include `Generated from`

2. In [src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts#L1):
   - remove the dependency on `workflowFormRegistry.code_review_step_3_diff_source.getToolDictionaryStartLine(...)`
   - keep the existing schema/term coverage assertions for `buildToolDictionaryMarkdown()`
   - add a new `describe` block or test for `buildRuntimeToolDictionaryMarkdown()` that asserts:
     - it includes `## build_review_diff_output`
     - it includes `### Supported Source Variants`
     - it includes `### Parameters`
     - it includes `### Term Reference`
     - it does not include `# Workflow UI Surface Tool Dictionary`
     - it does not include `Generated from`

3. In [webview-ui/src/components/chat/ChatRow.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L1):
   - remove the `mockOpenFileRelativePathAtRange` hoisted mock
   - remove the `FileServiceClient` mock block entirely
   - update `createWorkflowFormMessage(...)` so the JSON payload uses:
     - `toolDictionaryTitle: "Diff Source Reference"`
     - `toolDictionaryMarkdown: "## build_review_diff_output\\n\\nTool reference body."`
   - replace the old "opens the tool dictionary at the workflow form start line" test with a new test that:
     - clicks the `About Diff Source Reference` button
     - asserts a dialog title `Diff Source Reference` is rendered
     - asserts the rendered markdown body contains `build_review_diff_output`
     - does not assert any file-open RPC

4. In [webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx#L297):
   - update the embedded `workflow_form` fixture payload so it uses:
     - `toolDictionaryTitle: "Diff Source Reference"`
     - `toolDictionaryMarkdown: "## build_review_diff_output\\n\\nTool reference body."`
   - remove the old path-based fields from that fixture

5. Do not add any packaging-script tests in this step. The required regression coverage here is runtime-contract coverage: install-like runtime payload creation plus in-app UI rendering without `docs/...` dependency.

## Step 4

- [x] Run the focused verification suite for the runtime contract and workflow-form UI help surface.

Allowed files:
- None

Run exactly these two commands and no other verification commands:

```sh
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts --exit
```

```sh
cd webview-ui && npm run test -- src/components/chat/ChatRow.test.tsx src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx
```

Expected result:

- Both commands exit successfully.
- The workflow-form runtime tests prove the payload can be built in an install-like environment without reading `docs/...`.
- The dictionary builder tests prove the runtime reference markdown omits internal `Workflow UI Surface` framing while keeping the active tool entry content.
- The ChatRow tests prove the form opens a read-only in-app dictionary reference instead of opening a workspace file.
