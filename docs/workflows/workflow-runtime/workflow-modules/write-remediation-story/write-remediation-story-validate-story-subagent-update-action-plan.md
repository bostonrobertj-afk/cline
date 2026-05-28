# Write Remediation Story Validate-Story Subagent Update Action Plan

## FrontMatter

- Read this plan from top to bottom before making any changes.
- Read each task and subtask in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.
  - After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.

## Scope

This plan updates the already-built `write-remediation-story` workflow module so Step 3 invokes validate-story subagents before final user delivery, using [write-remediation-story-validate-story-subagent-update-requirements.md](./write-remediation-story-validate-story-subagent-update-requirements.md) as the backing requirements document.

This is a new update action plan. Do not edit [action-plan.md](./action-plan.md), which belongs to the original write-remediation-story module build.

Scope-diff note: [write-remediation-story-validate-story-subagent-update-requirements.md](./write-remediation-story-validate-story-subagent-update-requirements.md) is the backing requirements document for this update and may appear as an untracked documentation file in scope-diff checks. It is authorized to persist as an untracked file, but this plan does not authorize editing it.

## Scope Boundary

- Do not edit `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/action-plan.md`.
- Do not edit `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-requirements.md`.
- Do not edit `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-requirements.md`.
- Do not edit `/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md`.
- Do not change write-remediation-story identity, persona, project subfolder, prerequisite declarations, workflow forms, entry project keys, registry registration, slash-command name, use-skill name, `.md` alias behavior, or workflow value key inventory.
- Do not change Step 1 input validation, replacement-form, selected remediation story validation, or Step 2 originating-story resolution behavior.
- Do not change Step 4 finalization behavior or move Step 4 finalization into Step 3.
- Do not add write-remediation-story `childInheritance` rules, subagent locking, parent/child synchronization, subagent result parsing, or parent workflow mutation.
- Do not expose backend-only workflow tools, story-planning tools, artifact lifecycle tools, `update_story_index_status`, `move_workflow_project_file`, web tools, MCP tools, `workflow_progress_request`, `ask_followup_question`, `set_workflow_values`, or `use_skill` in model-facing write-remediation-story tool schemas.
- Do not add exact full-prompt snapshot assertions for editable prompt prose; use focused includes, exclusions, materialized workflow-value checks, route checks, and projected-tool checks.

## Requirement Trace

| Requirement | Required Behavior | Owning Files |
| --- | --- | --- |
| Update requirements lines 11-27 | Update only Step 3 validate-story subagent behavior, preserve unchanged workflow surfaces, and use module-build-guide prompt/tool consistency to authorize `use_subagents`. | `writeRemediationStoryWorkflow.ts`, `writeRemediationStoryToolSchemas.ts`, focused tests, `integration.test.ts` |
| Update requirements lines 29-40 | Preserve the four-step workflow shape and keep Step 3 `attempt_completion_succeeded` routing to Step 4. | `writeRemediationStoryWorkflow.ts`, `writeRemediationStoryWorkflow.test.ts` |
| Update requirements lines 42-169 | Replace Step 3 prompt with the revised exact prompt text, materialize workflow placeholders, include validate-story subagent assignment, and exclude retired local-finalization text. | `writeRemediationStoryWorkflow.ts`, `writeRemediationStoryWorkflow.test.ts`, `integration.test.ts` |
| Update requirements lines 171-179 | Keep validate-story invocation model-owned through `use_subagents` without parent-side synchronization, parsing, or inheritance architecture. | `writeRemediationStoryWorkflow.ts`, `writeRemediationStoryToolSchemas.ts`, focused tests, `integration.test.ts` |
| Update requirements lines 181-207 | Update Step 3 model-facing tool order to include `use_subagents` before `attempt_completion` and continue resolving shared/default specs through `ClineToolSet`. | `writeRemediationStoryToolSchemas.ts`, `writeRemediationStoryToolSchemas.test.ts`, `writeRemediationStoryWorkflow.test.ts`, `integration.test.ts` |
| Update requirements lines 209-232 | Update prompt projection coverage for materialized values, validate-story subagent instructions, retired text exclusions, and the revised Step 3 tool surface. | `writeRemediationStoryWorkflow.test.ts`, `integration.test.ts` |
| Update requirements lines 234-285 | Run focused unit tests, prompt integration tests, typecheck, lint, static guards, and scope-diff validation. | Validation tasks in this plan |

## Phase 1: Step 3 Tool Schema Update

Allowed files for Phase 1 tasks and subtasks:

- `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md`
- `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts`
- `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts`

- [ ] Task 1: Update Write-Remediation-Story Step 3 Tool IDs

  - [ ] Subtask 1.1: In `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts`, insert `ClineDefaultTool.USE_SUBAGENTS,` inside `WRITE_REMEDIATION_STORY_STEP_3_TOOL_IDS` immediately after `ClineDefaultTool.SEND_USER_MESSAGE,` and immediately before `ClineDefaultTool.ATTEMPT,`.

- [ ] Task 2: Update Write-Remediation-Story Tool Schema Unit Tests

  - [ ] Subtask 2.1: In `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts`, replace `STEP_3_TOOL_NAMES` with this exact array:

```ts
const STEP_3_TOOL_NAMES: readonly string[] = [
	"execute_command",
	"list_files",
	"search_files",
	"list_code_definition_names",
	"read_file",
	"read_file_range",
	"apply_patch",
	"write_to_file",
	"send_user_message",
	"use_subagents",
	"attempt_completion",
]
```

  - [ ] Subtask 2.2: In `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts`, remove the exact string entry `"use_subagents",` from `FORBIDDEN_MODEL_FACING_TOOL_NAMES`.

  - [ ] Subtask 2.3: In `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts`, update the `WRITE_REMEDIATION_STORY_STEP_3_TOOL_IDS` expected array in test `"uses only approved Cline default tool ids for Step 3"` by inserting `ClineDefaultTool.USE_SUBAGENTS,` immediately after `ClineDefaultTool.SEND_USER_MESSAGE,` and immediately before `ClineDefaultTool.ATTEMPT,`.

- [ ] Task 3: Validate Step 3 Tool Schema Update

  - [ ] Subtask 3.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts` and verify the command exits successfully.

  - [ ] Subtask 3.2: Run `npm run check-types` with elevated permissions and verify the command exits successfully. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

  - [ ] Subtask 3.3: Run `npm run lint` and verify the command exits successfully.

  - [ ] Subtask 3.4: Run `git diff --name-only` and verify tracked diffs are limited to `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts`, and `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts`.

  - [ ] Subtask 3.5: Run `git ls-files --others --exclude-standard` and verify untracked files are absent or limited to `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md` and `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-requirements.md`.

## Phase 2: Step 3 Prompt Update

Allowed files for Phase 2 tasks and subtasks:

- `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md`
- `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts`
- `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`

- [ ] Task 4: Replace Step 3 Prompt Template

  - [ ] Subtask 4.1: In `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts`, replace `WRITE_REMEDIATION_STORY_STEP_3_PROMPT_TEMPLATE` with this exact constant:

    The fenced constant below contains source-owned example checklist markers. Treat those markers as required runtime prompt text, not as action-plan tasks or subtasks.

```ts
const WRITE_REMEDIATION_STORY_STEP_3_PROMPT_TEMPLATE = `You have been invoked inside a workflow focused on completing a drafted remediation story in response to QA findings after an upstream story in the same project was completed.

Read these files first:
- The originating story: {workflow.originating_story}
- QA findings for the originating story: {workflow.code_review_output}
- Drafted remediation story: {workflow.target_story}

The remediation story's frontmatter has already been populated. Your task is to complete the story document by adding the tasks and subtasks necessary to ensure the documented findings are fully addressed.

The QA findings are organized into these categories:
  - task failure: the story tasks/ subtasks failed to prescribe the exact correct revisions. 
  - dev agent failure: the dev agent failed to implement the tasks/ subtasks exactly as written.
  - upstream failure: the project's backing documentation either prescribed an incorrect solution or underspecified the necessary solution.

A finding may belong to one or more of the selected categories. You must handle each finding in accordance with the categories it belongs to as follows:
  - task failure: Associated tasks and/or subtasks in the originating story were incorrectly authored. The remediation story must include tasks/ subtasks which are correctly-authored versions of the original tasks and/ or subtasks to ensure project-correct implementation.
  - dev agent failure: The associated tasks and/or subtasks in the originating story were correctly authored, but the developer failed to implement them as written. The associated tasks and/or subtasks should be included in the remediation story as they were written in the originating story.
  - upstream failure: Because the project's upstream documents were insufficient, the originating story will not contain tasks/ subtasks which can be easily rewritten or migrated into the remediation story in most cases. These findings will require you to identify and author net-new tasks and/or subtasks. Note that any gaps or issues in the upstream project documents were addressed after the QA review and before this workflow, so the project documentation can be treated as reliable project context during this workflow.

When authoring the tasks and subtasks for the remediation story, you must follow this process:
   
1. Read the requirements in {workflow.target_story} and parse them into observable obligations:
   runtime behavior, persisted values, artifacts, form UI, tool exposure, prompt projection, routing, validation, cleanup, and tests.

2. Map each obligation to the owning layer:
   workflow definition, shared runtime, tool handler, schema builder, artifact registry, prompt integration, runtime tests, handler tests, cleanup, or validation.

3. For each owning layer, inspect the actual target files:
   current code, sibling module patterns, imports, exports, shared types, route/action contracts, workflow value contracts, tool schemas, fixture helpers, and existing test style.

4. Derive the exact delta from code, not from requirement prose:
   add, update, delete, export, register, test, or validate. No “support X” or “cover Y” summaries.

5. Check compile contracts:
   required imports, discriminated unions, required fields, typed return values, event/session/action shape, workflow values, mocks, stubs, fixtures, and no forced casts.

6. Identify the tasks and subtasks necessary to deliver the remediation story's scope and objective following these rules exactly:
  - Every task must meet one of these task methods:
    1. The task is scoped to a single prescribed code revision in a single target file
    2. The task is scoped to a set of revisions in a single target file and is supported by subtasks, each of which are scoped to a single prescribed revision in the same target file
    3. The task is scoped to a set of revisions scoped to a single function or capability across several files, and is supported by subtasks which are each scoped to a single prescribed revision in a single target file. 
      Example of a task appropriately aligned with task method 1:
        [ ] Task 1: In /users/user_name/documents/folder_a/folder_b/task.ts, add import some_function from /users/user_name/documents/folder_b/folder_a/module.ts.
      
      Example of a task approriately aligned with task method 2:
        [ ] Task 1: Add necessary imports in In /users/user_name/documents/folder_a/folder_b/task.ts.
          [ ] Subtask 1.1: In /users/user_name/documents/folder_a/folder_b/task.ts, add import some_function from /users/user_name/documents/folder_b/folder_a/module.ts
          [ ] Subtask 1.2: In /users/user_name/documents/folder_a/folder_b/task.ts, add import some_other_function from /users/user_name/documents/folder_b/folder_b/module.ts

      Example of a task appropriately aligned with task method 3:
        [ ] Task 1: Rename some_function to some_function_a across all files it appears in.
          [ ] Subtask 1.1: In /users/user_name/documents/folder_a/folder_b/task.ts, replace existing import some_function from /users/user_name/documents/folder_b/folder_a/module.ts with import some_function_a from /users/user_name/documents/folder_b/folder_a/module.ts
          [ ] Subtask 1.2: In /users/user_name/documents/folder_a/folder_c/task.ts, replace existing import some_function from /users/user_name/documents/folder_b/folder_a/module.ts with import some_function_a from /users/user_name/documents/folder_b/folder_a/module.ts
  - Tasks & Subtasks must prescribe the following explicitly:
    - imports
    - helper shapes
    - fixture values
    - event/action/session objects
    - stable behavioral assertions
    - test assertions
    - discriminated. unions
    - optional properties
    - tool params/results
    - schema objects
    - event objects
    - persisted metadata
    - stubs
    - mocks
    - compile-safe type narrowing
    - object construction
    - fixture shape
    - helper return typing
  - Identify existing cruft, failed-attempt remnants, and any that may exist after the prescribed revisions and include tasks/ subtasks to clean them up.
  - Prescribe integration with config/strings where appropriate. Do not introduce hardcoded strings or values when they represent configuration, thresholds, labels, messages, or anything reasonably likely to change.
- Avoid these disallowed patterns at all times:
    - "any" typing
    - val as SomeType
    - "as any" in tests
    - unnecessary optional properties when it is possible to model which combinations do and don't exist
    - bang bang operators
    - unneccessary type assertions
    - not using type narrowing
    not defining generics parameters
    - semantic aliasing
    - preservation of legacy variables/functions/types via semantic aliasing

7. Identify tests relevant to the code touched by the tasks and subtasks, and determine whether any test requires revision to compatibility with the updated code. If tests require revision, include tasks and subtasks to ensure they are updated prior to validation.
  - Include tasks/ subtasks prescribing new tests when existing tests cannot reliably check behavior, contracts, regressions, and material risks for the code that will be in place once the prescribed revisions are in place.

8. Author the story's validation section by prescribing the most targeted set of unit tests and validations possible while ensuring that the intended revisions and behavior are in place.

9. After authoring the tasks & subtasks, dispatch a subagent to validate that the story is fully compliant and implementation-ready.
You must provide the subagent with this exact prompt (no paraphrasing or alterations of any kind):
Skill: use_skill('validate-story') Your task is to validate the story document I've just drafted to ensure that it is implementation-ready. You will receive separate workflow instructions which provide exact guidance regarding story validation. Complete the story validation per the instructions, then respond to me using attempt_completion with your findings. In your response, you must include the exact task and/or subtask numbers for any items which have issues that I need to address.

Once the subagent completes their validation & provides you with their findings, address any issues they've identified. If the subagent identified issues, correct them in the story document, shut down the subagent, and repeat the subagent validation process with a fresh subagent. Repeat this process until a subagent completes validation with no findings.

Once all tasks and subtasks are added to {workflow.target_story} and you've validated them per step 9 above, use attempt_completion to provide a final update to the user notifying them that the remediation story is ready for implementation, and that story validation was conducted by a subagent using the Validate Story workflow. `
```

- [ ] Task 5: Update Workflow Unit Tests For Revised Step 3 Prompt

  - [ ] Subtask 5.1: In `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`, replace `STEP_3_TOOL_NAMES` with this exact array:

```ts
const STEP_3_TOOL_NAMES: readonly string[] = [
	"execute_command",
	"list_files",
	"search_files",
	"list_code_definition_names",
	"read_file",
	"read_file_range",
	"apply_patch",
	"write_to_file",
	"send_user_message",
	"use_subagents",
	"attempt_completion",
]
```

  - [ ] Subtask 5.2: In `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`, remove the exact string entry `"use_subagents",` from `FORBIDDEN_MODEL_FACING_TOOL_NAMES`.

  - [ ] Subtask 5.3: In `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`, in test `"projects Step 3 prompt with materialized workflow values and no raw placeholders"`, add this exact assertion block immediately after `expect(prompt).to.include(TARGET_STORY_PATH)` and immediately before `expect(prompt).not.to.include("{workflow.originating_story}")`:

```ts
expect(prompt).to.include("Skill: use_skill('validate-story')")
expect(prompt).to.include(
	"Your task is to validate the story document I've just drafted to ensure that it is implementation-ready.",
)
expect(prompt).to.include(
	"Complete the story validation per the instructions, then respond to me using attempt_completion with your findings.",
)
expect(prompt).to.include(
	"the remediation story is ready for implementation, and that story validation was conducted by a subagent using the Validate Story workflow.",
)
```

  - [ ] Subtask 5.4: In `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`, in test `"projects Step 3 prompt with materialized workflow values and no raw placeholders"`, add this exact assertion block immediately after `expect(prompt).not.to.include("{workflow.target_story}")`:

```ts
expect(prompt).not.to.include("### Progression Rule: agent successfully uses attempt_completion")
expect(prompt).not.to.include("8. Finalize the tasks & subtasks by reviewing them one-by-one and ensuring that:")
expect(prompt).not.to.include("validated them per step 8 above")
expect(prompt).not.to.include(
	"Once all tasks and subtasks are added to target_story and you've validated them per step 8 above, use attempt_completion to provide a final update to the user notifying them that the remediation story is ready for implementation.",
)
```

- [ ] Task 6: Validate Step 3 Prompt Update

  - [ ] Subtask 6.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts` and verify the command exits successfully.

  - [ ] Subtask 6.2: Run `npm run check-types` with elevated permissions and verify the command exits successfully. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

  - [ ] Subtask 6.3: Run `npm run lint` and verify the command exits successfully.

  - [ ] Subtask 6.4: Run `git diff --name-only` and verify tracked diffs are limited to `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts`, and `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`.

  - [ ] Subtask 6.5: Run `git ls-files --others --exclude-standard` and verify untracked files are absent or limited to `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md` and `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-requirements.md`.

## Phase 3: Prompt Projection Integration

Allowed files for Phase 3 tasks and subtasks:

- `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md`
- `src/core/prompts/system-prompt/__tests__/integration.test.ts`

- [ ] Task 7: Update Prompt Projection Tests

  - [ ] Subtask 7.1: In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, remove the exact string entry `"use_subagents",` from `WRITE_REMEDIATION_STORY_FORBIDDEN_PROMPT_TOOL_NAMES`.

  - [ ] Subtask 7.2: In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, in test `"projects active write-remediation-story Step 3 tools from module-owned builders into native GPT-5 prompts"`, add this exact assertion block immediately after `expect(context.workflowToolSchemaOverride).to.deep.equal(buildWriteRemediationStoryStep3ToolSchemas())`:

```ts
const projectedToolNames = (context.workflowToolSchemaOverride ?? []).map((tool) => tool.name)
expect(projectedToolNames).to.include("use_subagents")
expect(projectedToolNames).to.include("attempt_completion")
expect(projectedToolNames).to.not.include("workflow_progress_request")
```

  - [ ] Subtask 7.3: In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, in test `"projects write-remediation-story Step 3 materialized values into full-turn and continuation payloads"`, add this exact assertion block inside the `for (const payloadBlock of payloadBlocks)` loop immediately after `expect(payloadBlock).to.include(WRITE_REMEDIATION_STORY_TARGET_STORY)` and immediately before `expect(payloadBlock).to.not.include("originating_story")`:

```ts
expect(payloadBlock).to.include("Skill: use_skill('validate-story')")
expect(payloadBlock).to.include(
	"Your task is to validate the story document I've just drafted to ensure that it is implementation-ready.",
)
expect(payloadBlock).to.include(
	"Complete the story validation per the instructions, then respond to me using attempt_completion with your findings.",
)
expect(payloadBlock).to.include(
	"the remediation story is ready for implementation, and that story validation was conducted by a subagent using the Validate Story workflow.",
)
```

  - [ ] Subtask 7.4: In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, in test `"projects write-remediation-story Step 3 materialized values into full-turn and continuation payloads"`, add this exact assertion block inside the `for (const payloadBlock of payloadBlocks)` loop immediately after `expect(payloadBlock).to.not.include("target_story")`:

```ts
expect(payloadBlock).to.not.include("### Progression Rule: agent successfully uses attempt_completion")
expect(payloadBlock).to.not.include("8. Finalize the tasks & subtasks by reviewing them one-by-one and ensuring that:")
expect(payloadBlock).to.not.include("validated them per step 8 above")
expect(payloadBlock).to.not.include(
	"Once all tasks and subtasks are added to target_story and you've validated them per step 8 above, use attempt_completion to provide a final update to the user notifying them that the remediation story is ready for implementation.",
)
```

  - [ ] Subtask 7.5: In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, in test `"does not expose forbidden tools in write-remediation-story Step 3 prompt projection"`, add this exact assertion block immediately after the closing brace of the loop that starts `for (const forbiddenToolName of WRITE_REMEDIATION_STORY_FORBIDDEN_PROMPT_TOOL_NAMES)`:

```ts
expect(projectedToolNames).to.include("use_subagents")
expect(projectedToolNames).to.include("attempt_completion")
expect(projectedToolNames).to.not.include("workflow_progress_request")
```

  - [ ] Subtask 7.6: In `src/core/prompts/system-prompt/__tests__/integration.test.ts`, in test `"renders write-remediation-story Step 3 tools through non-native prompt text without forbidden tools"`, add this exact assertion block immediately after the closing brace of the loop that starts `for (const approvedToolName of approvedToolNames)` and immediately before the loop that starts `for (const forbiddenToolName of WRITE_REMEDIATION_STORY_FORBIDDEN_PROMPT_TOOL_NAMES)`:

```ts
expect(systemPrompt).to.include("use_subagents")
expect(systemPrompt).to.include("attempt_completion")
expect(systemPrompt).to.not.include("workflow_progress_request")
```

- [ ] Task 8: Validate Prompt Projection Update

  - [ ] Subtask 8.1: Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify the command exits successfully.

  - [ ] Subtask 8.2: Run `npm run check-types` with elevated permissions and verify the command exits successfully. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

  - [ ] Subtask 8.3: Run `npm run lint` and verify the command exits successfully.

  - [ ] Subtask 8.4: Run `git diff --name-only` and verify tracked diffs are limited to `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`, and `src/core/prompts/system-prompt/__tests__/integration.test.ts`.

  - [ ] Subtask 8.5: Run `git ls-files --others --exclude-standard` and verify untracked files are absent or limited to `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md` and `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-requirements.md`.

## Phase 4: Final Validation

Allowed files for Phase 4 tasks and subtasks:

- `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md`

- [ ] Task 9: Run Required Focused Validation

  - [ ] Subtask 9.1: Run `npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts` and verify the command exits successfully.

  - [ ] Subtask 9.2: Run `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify the command exits successfully.

  - [ ] Subtask 9.3: Run `npm run check-types` with elevated permissions and verify the command exits successfully. If this command fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

  - [ ] Subtask 9.4: Run `npm run lint` and verify the command exits successfully.

- [ ] Task 10: Run Static Guards

  - [ ] Subtask 10.1: Run `rg -n "### Progression Rule: agent successfully uses attempt_completion|8\\. Finalize the tasks & subtasks by reviewing them one-by-one and ensuring that:|validated them per step 8 above" src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify there are no matches in `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts` and every test-file match is inside a `not.to.include(...)` negative assertion block.

  - [ ] Subtask 10.2: Run `rg -n "Skill: use_skill\\('validate-story'\\)" src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify at least one match exists in each of these exact files: `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`, and `src/core/prompts/system-prompt/__tests__/integration.test.ts`.

  - [ ] Subtask 10.3: Run `rg -n "ClineDefaultTool\\.USE_SUBAGENTS|ClineDefaultTool\\.ATTEMPT" src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts` and verify both matches are inside `WRITE_REMEDIATION_STORY_STEP_3_TOOL_IDS`.

  - [ ] Subtask 10.4: Run `rg -n "use_subagents|attempt_completion|ClineDefaultTool\\.USE_SUBAGENTS|ClineDefaultTool\\.ATTEMPT" src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify at least one match exists in each of these exact files: `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`, and `src/core/prompts/system-prompt/__tests__/integration.test.ts`.

  - [ ] Subtask 10.5: Run `rg -n "\"workflow_progress_request\"|ClineDefaultTool\\.WORKFLOW_PROGRESS_REQUEST" src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts` and verify there are no matches in `writeRemediationStoryToolSchemas.ts` and that every test-file match is inside a forbidden-tool negative assertion list.

  - [ ] Subtask 10.6: Run `rg -n "\"use_subagents\"" src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts` and verify no match appears inside `FORBIDDEN_MODEL_FACING_TOOL_NAMES` or `WRITE_REMEDIATION_STORY_FORBIDDEN_PROMPT_TOOL_NAMES`.

  - [ ] Subtask 10.7: Run `rg -n "web_search|web_fetch|browser_action|ask_followup_question|use_skill|set_workflow_values|build_workflow_document|create_workflow_artifact|archive_workflow_artifact|delete_workflow_artifact|move_workflow_project_file|update_story_index_status|workflow_progress_request|use_mcp_tool|access_mcp_resource|load_mcp_documentation|plan_story_artifacts|plan_remediation_story_artifact|generate_story_files|build_review_input|build_review_diff_output|code_review_spec_update|record_findings" src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts` and verify the command returns no matches.

  - [ ] Subtask 10.8: Run `rg -n "\"step-3-transition-to-step-4\"|action: \\{ kind: \"transition_step\", target: \\{ kind: \"entry_branch\", stepNumber: 4 \\} \\}|\"step-4\": createStepDefinition|checklistLabel: \"Finalize Remediation Story\"" src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts` and verify all four exact Step 3-to-Step 4 preservation markers are present.

- [ ] Task 11: Run Scope-Diff Validation

  - [ ] Subtask 11.1: Run `git diff --name-only` and verify tracked diffs are limited to these files: `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryWorkflow.ts`, `src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts`, and `src/core/prompts/system-prompt/__tests__/integration.test.ts`.

  - [ ] Subtask 11.2: Run `git ls-files --others --exclude-standard` and verify untracked files are absent or limited to `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-action-plan.md` and `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-validate-story-subagent-update-requirements.md`.

  - [ ] Subtask 11.3: Confirm no files outside the allowed final validation set have persistent tracked or untracked diffs before reporting completion.
