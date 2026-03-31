---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup beyond what is explicitly prescribed here.
---

# Attempt Completion Signal Action Plan

[x] Step 1: Remove the dedicated pre-tool `attempt_completion` focus-chain timing exception and replace the old regression with a post-tool parity test.
Allowed files: `src/core/task/focus-chain/updateFromToolResponse.ts`, `src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts`
In [updateFromToolResponse.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/updateFromToolResponse.ts) at lines 1-2, remove the now-unused imports `formatResponse` and `ClineDefaultTool`.
In that same file at lines 33-58, delete the `attempt_completion`-specific pre-tool branch from `applyPreToolTaskProgressUpdate(...)` in full.
After that deletion, remove the local destructuring from `options` entirely, make `applyPreToolTaskProgressUpdate(...)` return only `{ skipToolExecution: false, skipPostExecutionUpdate: false }`, and do not call `updateFCListFromToolResponse(...)` anywhere inside the pre-tool helper.
Do not change `applyPostToolTaskProgressUpdate(...)` at lines 60-76 in this step.
In [ToolExecutor.focusChainProtection.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts), delete the regression at lines 97-193 that expects `attempt_completion` to be rejected before execution.
Replace that deleted test with a new regression in the same location named `routes attempt_completion task_progress through the post-tool focus-chain path after execution`.
In that replacement test, keep the same `TaskState`, `stateManager`, and `ToolExecutor` scaffolding pattern already used in this file.
Set `updateFCListFromToolResponse` to resolve `{ accepted: true }`.
Set `executeStub` to resolve `"[attempt_completion] Result:\\nDone"`.
Execute a `ClineDefaultTool.ATTEMPT` block whose params include `result: "Done"` and `task_progress: "- [ ] Something else"`.
Assert all of the following exactly:
- `executeStub.calledOnce === true`
- `updateFCListFromToolResponse.calledOnce === true`
- `updateFCListFromToolResponse.firstCall.args[0] === "- [ ] Something else"`
- `updateFCListFromToolResponse.firstCall.args[1]` is truthy
- `updateFCListFromToolResponse.firstCall.args[1].toolName === "attempt_completion"`
- `updateFCListFromToolResponse.firstCall.args[1].toolWasExecuted === true`
Do not add any new assertions about thread end, task end, or user acceptance.

[x] Step 2: Thread `toolContext` through deterministic evaluation and add explicit final-step `attempt_completion` gates for the approved workflows.
Allowed files: `src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
In [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts) at lines 104-119, insert a new helper immediately after `resolveOutputFolderFile(...)`:
`function didSuccessfulAttemptCompletionOccur(toolContext?: DeterministicPlaceholderToolContext): boolean { return toolContext?.toolName === "attempt_completion" && toolContext.toolWasExecuted === true }`
Update the argument types for `evaluateCodeReviewStep(...)` at lines 150-153, `evaluateReviewAdversarialGeneralStep(...)` at lines 296-299, and `evaluateDevStoryStep(...)` at lines 343-346 so each accepts `toolContext?: DeterministicPlaceholderToolContext`.
In `evaluateCodeReviewStep(...)`, add `case 7` immediately before the `default` branch at lines 291-292.
That new `case 7` must return `{ completed: false }` unless `didSuccessfulAttemptCompletionOccur(args.toolContext)` is true.
When the helper returns true, `case 7` must return `{ completed: true, reason: "attempt_completion was executed successfully for the final QA findings report." }`.
In `evaluateReviewAdversarialGeneralStep(...)`, add `case 3` immediately before the `default` branch at lines 338-339.
That new `case 3` must return `{ completed: false }` unless `didSuccessfulAttemptCompletionOccur(args.toolContext)` is true.
When the helper returns true, `case 3` must return `{ completed: true, reason: "attempt_completion was executed successfully to deliver adversarial findings." }`.
In `evaluateDevStoryStep(...)`, add `case 4` immediately before the `default` branch at lines 419-420.
That new `case 4` must return `{ completed: false }` unless `didSuccessfulAttemptCompletionOccur(args.toolContext)` is true.
When the helper returns true, `case 4` must return `{ completed: true, reason: "attempt_completion was executed successfully for the final closeout report." }`.
At lines 424-446, update `evaluateDeterministicStep(...)` so its args type includes `toolContext?: DeterministicPlaceholderToolContext`, then forward that `toolContext` into all three workflow-specific evaluators.
At lines 494-498, update the `evaluateDeterministicStep(...)` call inside `applyDeterministicPlaceholderProgression(...)` so it passes `toolContext: args.toolContext`.
Do not add any global rule that auto-completes all workflows on `attempt_completion`.

[x] Step 3: Add focused deterministic unit coverage for the new final-step gates and preserve the existing file-backed gates unchanged.
Allowed files: `src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
In [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts), do not modify the helper functions at lines 12-48.
After the existing `review-adversarial-general` Step 2 relative-path test ending at line 332, insert two new tests.
The first new test must be named `completes review-adversarial-general step 3 from successful attempt_completion tool context`.
In that test, create a task state with:
- `workflowName: "review-adversarial-general.md"`
- `workflowContents` containing exactly `## Step 3: Present findings\nDeliver findings using attempt_completion.`
- `checklistMarkdown: "- [ ] Step 3: Present findings"`
Call `applyDeterministicPlaceholderProgression(...)` with `toolContext: { toolName: "attempt_completion", toolParams: { result: "Done" }, toolResult: "[attempt_completion] Result:\\nDone", toolWasExecuted: true }`.
Assert the checklist becomes `"- [x] Step 3: Present findings"` and the last notice reason equals `"attempt_completion was executed successfully to deliver adversarial findings."`.
The second new test must be named `does not complete review-adversarial-general step 3 when attempt_completion was not executed`.
Use the same workflow setup, but pass `toolContext: { toolName: "attempt_completion", toolParams: { result: "Done" }, toolResult: "[attempt_completion] Result:\\nDone", toolWasExecuted: false }`.
Assert the checklist remains `"- [ ] Step 3: Present findings"` and no notices are added.
After the existing `code-review` Step 6 stale-spec test ending at line 896, insert a new test named `completes code-review step 7 from successful attempt_completion tool context`.
That test must use:
- `workflowName: "code-review.md"`
- `workflowContents` containing exactly `## Step 7: Present QA Findings to the Human User\nDeliver the final QA findings using attempt_completion.`
- `checklistMarkdown: "- [ ] Step 7: Present QA Findings to the Human User"`
- the same successful `toolContext` shape used above
Assert the checklist becomes `"- [x] Step 7: Present QA Findings to the Human User"` and the last notice reason equals `"attempt_completion was executed successfully for the final QA findings report."`.
After the existing `dev-story` Step 2 outside-checklist test ending at line 1012, insert a new test named `completes dev-story step 4 from successful attempt_completion tool context`.
That test must use:
- `workflowName: "dev-story.md"`
- `workflowContents` containing exactly `## Step 4: Closeout\nProvide the final closeout report using attempt_completion.`
- `checklistMarkdown: "- [ ] Step 4: Closeout"`
- the same successful `toolContext` shape used above
Assert the checklist becomes `"- [x] Step 4: Closeout"` and the last notice reason equals `"attempt_completion was executed successfully for the final closeout report."`.
Do not rewrite or delete any existing artifact-backed deterministic tests in this file.

[x] Step 4: Add subagent parity so successful `attempt_completion` reaches post-tool deterministic progression before the subagent returns.
Allowed files: `src/core/task/tools/subagent/SubagentRunner.ts`, `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
In [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts) at lines 16-18, extend the deterministic progression import so `DeterministicPlaceholderToolContext` is imported as a type alongside `isDeterministicPlaceholderWorkflowSupported`.
In [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts) at lines 798-819, keep the existing missing-`result` validation exactly as written.
Immediately after the `completionResult` missing-value check and before the stats increment at line 816, insert a call to `applyPostToolTaskProgressUpdate(...)`.
That inserted call must use:
- `block: toolCallBlock`
- `focusChainEnabled`
- `skipPostExecutionUpdate: preToolTaskProgressUpdate.skipPostExecutionUpdate`
- `toolContext: { toolName, toolParams: (toolCallParams as Record<string, unknown>) ?? undefined, toolResult: completionResult, toolWasExecuted: true }`
- `updateFCListFromToolResponse: subagentConfig.callbacks.updateFCListFromToolResponse`
Do not add any new early-return, failure, or feedback-surfacing behavior in this branch; after the post-tool update call, preserve the existing `stats` update, `onProgress({ status: "completed", ... })`, and completed return value exactly.
At lines 913-914 inside `createSubagentTaskConfig(...)`, change the `updateFCListFromToolResponse` callback signature so it accepts `(taskProgress: string | undefined, toolContext?: DeterministicPlaceholderToolContext)` and forwards both arguments to `focusChainManager.updateFCListFromToolResponse(taskProgress, toolContext)`.
In [SubagentRunner.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts), first update the stale inherited-step test at lines 1885-1948 so it creates the inherited `diff_output` file before deterministic progression runs:
- use the existing `diff_output` path already assigned at lines 1900-1902
- call `await fs.mkdir(path.dirname(config.taskState.activePlaceholderWorkflowValues!.diff_output), { recursive: true })`
- call `await fs.writeFile(config.taskState.activePlaceholderWorkflowValues!.diff_output, "diff --git a/file b/file", "utf8")`
Then update that same test’s expected notice reason at line 1942 to `"diff_output resolves to an existing file path."`.
Then insert a new regression immediately after the test ending at line 2082 named `auto-completes a subagent final workflow step when attempt_completion succeeds`.
In that new test:
- create a temporary task directory with `disk.ensureTaskDirectoryExists` stubbed, following the same pattern as the nearby subagent focus-chain tests
- stub the prompt registry and skill discovery exactly the same way the test at lines 2024-2045 does
- stub the API handler so the first tool-call response is a single `ClineDefaultTool.ATTEMPT` with arguments `{ "result": "done" }`
- configure `workflowResolution.resolveAvailableWorkflows` to return exactly one workflow entry:
  `{ name: "review-adversarial-general.md", source: "remote", description: "Remote workflow: review-adversarial-general.md", fileName: "review-adversarial-general.md", contents: "# BMAD Review: Adversarial General\\n\\n## Step 3: Present findings\\nDeliver findings using attempt_completion." }`
- create the runner from `createTaskConfig(false)` with `focusChainSettings.enabled = true`
- call `runner.run("Skill: use_skill('review-adversarial-general.md')", () => {})`
- assert the run result status is `"completed"`
- read the subagent-local focus-chain file using the same `subagentFocusChainStorageKey` and `getFocusChainFilePath(...)` pattern already used at lines 2069-2077
- assert that file contains `- [x] Step 3: Present findings`
Do not add assertions about thread end, task end, or parent callback invocation in this new regression.

[x] Step 5: Update the deterministic-progression readme so the documented examples match the new supported final-step gates.
Allowed files: `docs/workflows/deterministic-workflow-progression-readme.md`
In [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md), keep the overall structure intact.
At lines 43-44 in the Inputs section, expand the `optional toolContext` bullet so it explicitly says that current-turn tool execution facts can drive workflow-specific deterministic gates.
At lines 99-104 in the Current evaluator examples section, add these exact bullets:
- under `code-review.md`: `Step 7 completes when a successful current-turn attempt_completion delivers the final QA findings report`
- under `review-adversarial-general.md`: `Step 3 completes when a successful current-turn attempt_completion delivers the final findings`
- under `dev-story.md`: `Step 4 completes when a successful current-turn attempt_completion delivers the final closeout report`
At lines 131-137 in the Extension Guidelines section, add one bullet stating: `Use toolContext-based gates only when a workflow step explicitly treats a successful current-turn tool execution as its machine-checkable done signal.`
At lines 139-145 in the Examples section, add three new examples matching the exact supported gates from Step 2:
- `In code-review.md, Step 7 can auto-complete when the current turn successfully executes attempt_completion for the final QA findings report.`
- `In review-adversarial-general.md, Step 3 can auto-complete when the current turn successfully executes attempt_completion to deliver the adversarial findings.`
- `In dev-story.md, Step 4 can auto-complete when the current turn successfully executes attempt_completion for the final closeout report.`
Do not change the readme's statement that workflow-specific logic remains explicit and hardcoded.

[x] Step 6: Run only the focused verification for the touched seams and stop.
Allowed files: none
Run `npm run test:unit -- src/core/task/__tests__/ToolExecutor.focusChainProtection.test.ts src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`.
If the verification fails because one of the three plan-corrected test seams was missed, make only the prescribed fix and rerun the same command:
- add the required non-empty step-detail line to the new deterministic tests from Step 3
- create the inherited `diff_output` file in the existing subagent Step 1 test from Step 4
- replace any unsupported `assert.deepInclude` usage with the exact property assertions prescribed in Step 1
If the verification fails for any reason that requires touching files outside the allowed files from Steps 1-5, stop and ask the user before proceeding.
After the targeted tests pass, do not make any additional cleanup changes in `ToolExecutor.ts`, `ToolHookUtils.ts`, `AttemptCompletionHandler.ts`, managed workflows, checkpoint internals, or response-tool lifecycle code during this plan.
