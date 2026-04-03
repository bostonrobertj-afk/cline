---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - Do not edit `/Users/robertboston/Documents/Cline/Workflows/code-review.md` in this plan; that workflow-source update is explicitly out of scope and will be handled separately by the user.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup, migration work, or compatibility changes beyond what is explicitly prescribed here.
---

# Code Review Story Path Contract Action Plan

## Scope

This plan aligns the `code-review.md` runtime, workflow-form behavior, internal completion tooling, tests, and canonical docs to the approved `story_path` contract.

This plan assumes the user will separately update `/Users/robertboston/Documents/Cline/Workflows/code-review.md` so that Step 1 and later prose use `{story_path}` instead of `{spec_file}`.

This buildout must not:

- introduce a new workflow-start mechanism
- introduce a new auto-run workflow-form execution seam
- couple `code-review.md` to `write-remediation-story.md`
- rename the internal tool id `code_review_spec_update`
- edit the workflow source file itself in this pass

The required end state for this plan is:

- `build_review_input` resolves `story_path` from workflow state instead of a public human parameter
- the `code-review.md` Step 3 workflow form becomes a zero-field system-owned form that invokes `build_review_input` using already-stored workflow state
- `code_review_spec_update` resolves `{story_path}` instead of `{spec_file}` and returns `story_path_updated` / `story_path_path`
- canonical docs and tests consistently describe `story_path` as the code-review source artifact

## Action Plan

[x] Step 1: Convert `build_review_input` from a public `story_path` tool to a workflow-state-driven tool contract.
Allowed files: `src/core/prompts/system-prompt/tools/build_review_input.ts`, `src/core/prompts/system-prompt/spec.ts`, `src/core/prompts/system-prompt/__tests__/spec.test.ts`, `src/core/task/tools/handlers/BuildReviewInputToolHandler.ts`, `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
In [build_review_input.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_input.ts#L7-L20), replace the current description and single-parameter schema with this exact contract:
- keep `id`, `variant`, and `name` unchanged
- set `description` to `Build and replace the stable review-input artifact at {review_input} from the workflow-owned story file at {story_path} plus the workflow-owned diff artifact at {diff_output}. Resolve all inputs from workflow state.`
- set `parameters: []`
In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L486-L487), replace the compact native description for `build_review_input` with the exact string `Build review-input.md from workflow-owned {story_path} and {diff_output}. Resolve inputs from workflow state; there are no human-supplied parameters.`
In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L574-L576), delete the special-case `story_path` parameter-description branch for `build_review_input` entirely so the file no longer contains any `tool.name === "build_review_input" && param.name === "story_path"` branch.
In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L784-L803), keep the existing test name but change its assertions to:
- expect the compact description string to equal `Build review-input.md from workflow-owned {story_path} and {diff_output}. Resolve inputs from workflow state; there are no human-supplied parameters.`
- expect `Object.keys(openAIProperties)` to deep equal `[]`
- remove the `openAIProperties.story_path?.description` assertion
In [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L1-L189), make these exact handler changes:
- add `getPlaceholderWorkflowValueMap` from `@core/workflows/placeholder-workflow-rendering` to the imports
- change `getDescription(...)` to return the exact string `[build_review_input]`
- change `handlePartialBlock(...)` to emit `JSON.stringify({ tool: "buildReviewInput" })`
- in `execute(...)`, delete the current `params.story_path` parsing and `Error: Missing required parameter 'story_path'.` branch
- immediately after `const params = block.params as Record<string, unknown>`, build `const placeholders = getPlaceholderWorkflowValueMap(config.taskState.activePlaceholderWorkflowStableValues, config.taskState.activePlaceholderWorkflowValues) ?? {}`
- derive `const explicitStoryPath = typeof params.story_path === "string" ? params.story_path.trim() : ""`
- derive `const storyPathRaw = placeholders.story_path?.trim() || explicitStoryPath`
- if `storyPathRaw` is blank, return `formatResponse.toolError("Could not resolve workflow placeholder 'story_path' from the active placeholder workflow state.")`
- compute `const resolutionBase = placeholders.cwd?.trim() || placeholders.project_root?.trim() || placeholders["project-root"]?.trim() || config.cwd`
- resolve `storyAbsolutePath` from `storyPathRaw` against `resolutionBase` instead of `config.cwd`
- leave `diff_output` and `review_input` resolution logic unchanged
- leave the extraction logic unchanged
- keep the success payload field `story_path: storyAbsolutePath`
- keep the mismatch reason string exactly `diff_output does not identify recent changes to the story file.`
In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1844-L1957), rewrite the three `build_review_input` tests to use placeholder state instead of public tool params:
- in each test, set `config.taskState.activePlaceholderWorkflowValues = { story_path: storyPath }` before executing the handler
- invoke the tool with `params: {}`
- keep all success and mismatch assertions unchanged
- add one new test immediately after the current deterministic-structure failure test named `requires story_path from merged placeholder state`
- in that new test, do not set `activePlaceholderWorkflowValues.story_path`, invoke the tool with `params: {}`, and assert the exact returned value equals `formatResponse.toolError("Could not resolve workflow placeholder 'story_path' from the active placeholder workflow state.")`
- do not change any `code_review_spec_update` tests in this step

[x] Step 2: Convert the `code-review.md` Step 3 workflow form to a zero-field resolver that reuses stored workflow state.
Allowed files: `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, `docs/workflow-ui-surface/workflow-form-readme.md`
In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L457-L536), replace the Step 3 review-input resolver definition with this exact behavior:
- keep `id`, `toolName`, and `successMessage` unchanged
- change `pages.confirm.prompt` to `This workflow requires the following tool-produced artifact: \`review-input.md\`.\n\nThe system will use the stored \`story_path\` and the workflow-owned \`review-input.diff\` artifact to build \`review-input.md\`. Continue?`
- change `pages.collect_inputs.prompt` to `The system will now build \`review-input.md\` from the stored \`story_path\` and the workflow-owned \`review-input.diff\` artifact.`
- set `pages.collect_inputs.fields` to `[]`
- change `pages.retry_error.prompt` to `The system could not produce \`review-input.md\` from the stored workflow inputs. Retry the request or return to the Step 3 fallback instructions.`
- set `pages.retry_error.fields` to `[]`
- change `buildToolExecutionFailureFallbackMessage()` to return the exact string `The workflow form could not build the Step 3 review-input artifact from stored workflow inputs. The workflow will return to the Step 3 fallback instructions.`
- change `buildToolExecutionRequest(...)` to ignore submitted values and return `{ toolName: ClineDefaultTool.BUILD_REVIEW_INPUT, toolInput: {}, toolParams: {} }`
- leave `evaluateToolExecutionResult(...)` unchanged
In [buildToolDictionary.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L78-L94), keep `toolName`, `heading`, and `runtimeTitle` unchanged, but replace the `overviewLines` and `parameterDescriptions` block with:
- `overviewLines: [ "Review Input Artifact. Build and replace the stable review-input artifact at {review_input}.", "", "Workflow-owned Story File. The active placeholder workflow must already provide {story_path}; the form does not recollect it from the human.", "", "Workflow-owned Diff Artifact. The stable diff artifact at {diff_output} is resolved automatically and is not recollected from the human." ]`
- `parameterDescriptions: {}`
In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L25-L45), keep the existing test name but change the expectation so `fields.map((field) => field.key)` deep equals `[]`; delete the `fields[0]` assertions.
In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L182-L209), keep the existing serialization test name but change the invocation values to `{}` and assert `toolInput` deep equals `{}` and `toolParams` deep equals `{}`.
In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L535-L566), add one new test immediately after `allows workflow-start submit when required and one-of semantics are satisfied` named `invokes the tool when collect_inputs has zero fields`.
For that new runtime test:
- define a custom resolver in the test body whose `collect_inputs.fields` and `retry_error.fields` are both `[]`
- have its `buildToolExecutionRequest(...)` return `{ toolName: ClineDefaultTool.BUILD_REVIEW_INPUT, toolInput: {}, toolParams: {} }`
- create a `collect_inputs` session for that resolver
- submit with `fields: []`
- assert `outcome.kind === "invoke_tool"`
- assert the emitted `toolInput` and `toolParams` are both empty objects
In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1402-L1453) and [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L1543-L1594), update both Step 3 workflow-form fixtures so:
- `createdSession.values` is `{}` instead of containing `story_path`
- the queued `pendingWorkflowFormOutcome.toolInput` is `{}`
- the queued `pendingWorkflowFormOutcome.toolParams` is `{}`
- keep all fallback success-message assertions unchanged
In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L96-L100), change the Step 3 delivered-use-case bullet to `\`code-review.md\` Step 3 review-input form using \`build_review_input\` with workflow-owned inputs`
In [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md#L163-L172), change usage step 6 to `Deterministic progression runs again and may advance directly into the Step 3 review-input form, which invokes \`build_review_input\` from stored workflow state on success.`
Do not change `WorkflowFormRuntime.ts` implementation in this step; the new runtime test is sufficient to lock the zero-field submit behavior already present at [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L196-L245).

[x] Step 3: Move the completion-side merge contract from `{spec_file}` to `{story_path}` and rename the internal success result fields.
Allowed files: `src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts`, `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`, `docs/workflow-automation/code-review-final-documentation/requirements.md`, `docs/workflow-automation/workflow-end-automation/code-review-completion.md`, `docs/workflow-automation/workflow-automation-readme.md`
In [CodeReviewSpecUpdateToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts#L101-L207), make these exact contract changes:
- rename the merged-placeholder lookup local from `specFileRaw` to `storyPathRaw`
- resolve `placeholders.story_path?.trim()` instead of `placeholders.spec_file?.trim()`
- if missing, return `formatResponse.toolError("Could not resolve workflow placeholder 'story_path' from the active placeholder workflow state.")`
- rename the resolved path local from `specFilePath` to `storyFilePath`
- read the story markdown from `storyFilePath`
- keep the call into `codeReviewSpecUpdateMerge(...)` unchanged except for variable names feeding `specFileMarkdown`
- change the approval message content line from `Spec file: ...` to `Story file: ...`
- change the auto-approval checks to use `storyFilePath`
- change the notification basename target to `storyFilePath`
- write the merged file back to `storyFilePath`
- record write proof for `storyFilePath`
- clear `storyFilePath` from `fileReadCache`
- return the exact success JSON object `{ persisted: true, story_path_updated: true, review_input_cleared: true, story_path_path: storyFilePath, review_input_path: reviewInputPath }`
In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1965-L2077), rewrite the three `code_review_spec_update` contract tests to use `story_path` and the renamed result fields:
- in the success test, set `config.taskState.activePlaceholderWorkflowValues = { story_path: specFilePath }`
- keep the fixture helper `createCodeReviewSpecUpdateRepo()` unchanged in this step; it may still produce a variable named `specFilePath`
- invoke the tool with `params: { story_path: "ignored.md" }`
- assert the returned JSON object equals `{ persisted: true, story_path_updated: true, review_input_cleared: true, story_path_path: specFilePath, review_input_path: reviewInputPath }`
- keep all file-content and write-proof assertions unchanged
- rename `requires spec_file from merged placeholder state` to `requires story_path from merged placeholder state`
- in that test, assert the exact error text `Could not resolve workflow placeholder 'story_path' from the active placeholder workflow state.`
- update the approval test setup below those cases so `activePlaceholderWorkflowValues = { story_path: specFilePath }`
In [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md#L1-L260), replace every occurrence of `{spec_file}` with `{story_path}` throughout the document, then make these additional exact edits:
- at [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md#L5), change `back into {spec_file}` to `back into {story_path}`
- at [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md#L206-L208), rename the subsection heading to `### 2. Missing \`story_path\`` and update the failure sentence to reference `{story_path}`
- at [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/code-review-final-documentation/requirements.md#L237), change the success contract string to `formatResponse.toolResult(JSON.stringify({ persisted: true, story_path_updated: true, review_input_cleared: true, story_path_path: "<absolute path>", review_input_path: "<absolute path>" }))`
In [code-review-completion.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-end-automation/code-review-completion.md#L22-L27), change the responsibility bullets to:
- `merging the final review-authored writable content from \`review_input.md\` into \`{story_path}\``
- `clearing \`review_input.md\``
- `recording write proof for \`{story_path}\``
In [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-automation-readme.md#L80-L86), change the ownership bullets to:
- `placeholder resolution for \`{review_input}\` and \`{story_path}\``
- `approval and file-write behavior`
- `story-file mutation`
- `review_input.md clearing`
- `write-proof recording for \`{story_path}\``

[x] Step 4: Refresh prompt snapshots, then run the exact targeted verification suite for this contract change.
Allowed files: `src/core/prompts/system-prompt/__tests__/__snapshots__`
First run this exact command to refresh only the prompt snapshots affected by the `build_review_input` schema and description changes:
```bash
UPDATE_SNAPSHOTS=true npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
```
Do not hand-edit snapshot contents. Only accept snapshot diffs produced by that command.
Then run this exact verification command:
```bash
npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts
```
If either command fails, stop and surface the failure instead of making unplanned fixes.

[x] Step 5: Perform a final string-contract and scope-boundary audit before handing the change back.
Allowed files: `src/core/prompts/system-prompt/tools/build_review_input.ts`, `src/core/prompts/system-prompt/spec.ts`, `src/core/prompts/system-prompt/__tests__/spec.test.ts`, `src/core/task/tools/handlers/BuildReviewInputToolHandler.ts`, `src/core/task/tools/handlers/CodeReviewSpecUpdateToolHandler.ts`, `src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`, `src/core/task/workflow-form/WorkflowFormRegistry.ts`, `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`, `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`, `src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`, `docs/workflow-ui-surface/workflow-form-readme.md`, `docs/workflow-automation/code-review-final-documentation/requirements.md`, `docs/workflow-automation/workflow-end-automation/code-review-completion.md`, `docs/workflow-automation/workflow-automation-readme.md`, `src/core/prompts/system-prompt/__tests__/__snapshots__`
Before marking this step complete, verify all of these exact conditions:
- no file in the allowed set still describes `build_review_input` as requiring a human-supplied `story_path`
- no Step 3 workflow-form test fixture still queues `toolInput: { story_path: ... }` or `toolParams: { story_path: ... }`
- no `code_review_spec_update` contract surface in the allowed set still uses `spec_file_updated`, `spec_file_path`, or the error text `Could not resolve workflow placeholder 'spec_file' from the active placeholder workflow state.`
- no canonical doc in the allowed set still describes code-review completion as mutating `{spec_file}`
- the workflow source file `/Users/robertboston/Documents/Cline/Workflows/code-review.md` remains untouched by this plan
If any of those checks fail, fix only the mismatch inside the already-allowed files for the relevant earlier step. If a mismatch requires any additional file, stop and ask the user.
