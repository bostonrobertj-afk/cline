# Write Remediation Story Validate-Story Subagent Update Requirements

## Scope

Update the already-built `write-remediation-story` workflow module to match the revised source workflow at `/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md`.

This is an update-specific requirements document. It must not replace, rewrite, or mutate `docs/workflows/workflow-runtime/workflow-modules/write-remediation-story/write-remediation-story-requirements.md`. The original write-remediation-story requirements remain authoritative for behavior not explicitly changed here.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide for runtime workflow shape, model-facing tool schemas, decision-tree routing, prompt projection, testing, and validation.

The update owns only these behavior changes:

- update the Step 3 prompt so the parent agent dispatches validate-story subagents after authoring remediation-story tasks and subtasks
- require the parent agent to repeat validate-story subagent validation until validation passes with no findings
- update Step 3 final completion messaging so it tells the user the remediation story is ready for implementation and that validation was conducted by a subagent using the Validate Story workflow
- update the Step 3 model-facing tool schema so the agent can activate validate-story subagents
- update focused module tests and prompt projection tests for the revised Step 3 prompt and tool surface

No Step 1 prerequisite, replacement-form, association-validation, story-index-validation, or workflow-form behavior is changed by this update. No Step 2 originating-story resolution behavior is changed by this update. No Step 4 finalization behavior is changed by this update. No workflow identity, prerequisite file declaration, workflow value key, entry project key, project subfolder, persona, registry registration, slash-command name, use-skill name, or `.md` alias behavior is changed by this update.

## Source Fidelity

The runtime implementation must faithfully represent the revised source document. Prompt text and user-facing text that remains in scope must not be paraphrased, summarized, or invented.

The source line `### Progression Rule: agent successfully uses attempt_completion` is source authoring metadata for runtime routing. It must not appear in runtime prompt constants, `promptTemplates`, projected prompt payloads, or test-owned expected prompt payloads except as a forbidden-string assertion.

The source Step 3 prompt now instructs the parent agent to dispatch a validate-story subagent. Although the source document's Step 3 tool-schema summary does not separately list `use_subagents`, the module-build guide requires prompt/tool consistency and maps subagent activation to `use_subagents`. This update therefore supersedes the original requirements only for the Step 3 `use_subagents` tool exposure.

## Workflow Steps

The write-remediation-story workflow must continue to define exactly four workflow steps after this update:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Validate Inputs` | Unchanged. Resolve required prerequisites, validate findings/remediation-story association, render the incompatible-file replacement form when needed, validate the selected remediation story index entry, and transition to Step 2 only when inputs are valid. |
| `step-2` | 2 | `Locate Originating Story File` | Unchanged. Resolve and persist `originating_story`, then transition to Step 3. |
| `step-3` | 3 | `Complete Remediation Story` | Model-driven remediation-story task/subtask authoring step. The agent must dispatch validate-story subagents until validation passes with no findings, then call `attempt_completion`. |
| `step-4` | 4 | `Finalize Remediation Story` | Unchanged. Runtime-driven finalization after Step 3 `attempt_completion_succeeded`; update the selected remediation story from `draft` to `backlog`, move the story file from `implementation/drafts` to `implementation/stories-backlog`, then complete the workflow. |

Step 3 must continue to route `attempt_completion_succeeded` to Step 4. This update must not move Step 4 finalization into Step 3 and must not allow Step 3 `attempt_completion_succeeded` to directly complete the workflow.

## Step 3 Prompt

Step 3 must enter model-driven work through a `project_prompt` decision action.

Step 3 `buildPromptSource` must construct the Step 3 prompt from module-owned code. The Step 3 prompt must preserve the revised AI-facing source text from `/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md`, with workflow value placeholders rendered through deterministic workflow value rendering.

The Step 3 runtime prompt template must be exactly:

```text
You have been invoked inside a workflow focused on completing a drafted remediation story in response to QA findings after an upstream story in the same project was completed.

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

Once all tasks and subtasks are added to {workflow.target_story} and you've validated them per step 9 above, use attempt_completion to provide a final update to the user notifying them that the remediation story is ready for implementation, and that story validation was conducted by a subagent using the Validate Story workflow. 
```

The runtime prompt template must use `{workflow.originating_story}`, `{workflow.code_review_output}`, and `{workflow.target_story}` tokens. The shared runtime prompt renderer must materialize those tokens before prompt projection. The projected prompt must not leak raw source placeholder strings `originating_story`, `code_review_output`, or `target_story` when valid workflow values are available.

The Step 3 prompt must include the exact validate-story subagent assignment phrase:

```text
Skill: use_skill('validate-story')
```

The Step 3 prompt must not include the retired local-finalization text from the original module build:

```text
8. Finalize the tasks & subtasks by reviewing them one-by-one and ensuring that:
```

The Step 3 prompt must not include the retired completion sentence from the original module build:

```text
Once all tasks and subtasks are added to target_story and you've validated them per step 8 above, use attempt_completion to provide a final update to the user notifying them that the remediation story is ready for implementation.
```

## Validate-Story Subagent Invocation

The validate-story subagent invocation is model-owned through `use_subagents`. The runtime must not introduce specialized parent-side parsing of validate-story subagent findings.

The exact subagent assignment phrase must remain in the parent write-remediation-story Step 3 prompt. It is consumed by the existing subagent workflow assignment mechanism before the child agent turn. The validate-story subagent must be activated as a child workflow through the product-owned workflow registry and runtime subagent bootstrap behavior.

The write-remediation-story module must not introduce `childInheritance` rules for write-remediation-story. Child inheritance belongs to the child validate-story workflow definition. The parent workflow must provide the necessary parent workflow values already present in the active write-remediation-story session, especially `target_story`, `originating_story`, and `code_review_output`, for validate-story inheritance.

The write-remediation-story module must not add new runtime architecture for subagent locking, parent/child synchronization, subagent result parsing, or parent workflow mutation. The parent model remains responsible for reading validate-story subagent findings from the `use_subagents` result, correcting the story when needed, shutting down the subagent, and repeating with a fresh subagent until validation returns no findings.

## Tool Schema Ownership

The write-remediation-story module must continue to own model-facing tool schemas in:

```text
src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts
```

Step 1, Step 2, and Step 4 must continue to expose empty model-facing tool schemas.

Step 3 must expose exactly these model-facing tools, in this order:

- `execute_command`
- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `write_to_file`
- `send_user_message`
- `use_subagents`
- `attempt_completion`

Step 3 must continue to resolve normal shared/default tools through registered shared/default specs using `ClineToolSet.getToolByNameWithFallback(...)`. The module must not hand-build or copy local `ClineToolSpec` objects for these normal shared/default tools.

This update supersedes the original requirements only where they forbid `use_subagents` in write-remediation-story Step 3. Step 3 must still not expose `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `update_story_index_status`, `plan_story_artifacts`, `plan_remediation_story_artifact`, `generate_story_files`, `workflow_progress_request`, `ask_followup_question`, web tools, MCP tools, `use_skill`, or retired workflow tools.

## Prompt Projection

Write-remediation-story prompt projection must continue to place current step details in the workflow input payload, not in system instructions.

Prompt projection tests must verify that Step 3 prompt payloads include:

- the materialized originating-story path
- the materialized code-review output path
- the materialized target-story path
- the exact validate-story assignment phrase `Skill: use_skill('validate-story')`
- the exact validation prompt sentence `Your task is to validate the story document I've just drafted to ensure that it is implementation-ready.`
- the exact instruction `Complete the story validation per the instructions, then respond to me using attempt_completion with your findings.`
- the exact final completion phrase `the remediation story is ready for implementation, and that story validation was conducted by a subagent using the Validate Story workflow.`

Prompt projection tests must verify that Step 3 prompt payloads do not include:

- raw workflow placeholders for `originating_story`, `code_review_output`, or `target_story`
- `### Progression Rule: agent successfully uses attempt_completion`
- the retired local-finalization heading `8. Finalize the tasks & subtasks by reviewing them one-by-one and ensuring that:`
- the retired completion sentence `Once all tasks and subtasks are added to target_story and you've validated them per step 8 above, use attempt_completion to provide a final update to the user notifying them that the remediation story is ready for implementation.`

Prompt projection tests must verify that Step 3 projects the new native tool surface including `use_subagents` and `attempt_completion`, and excludes `workflow_progress_request` and backend-only runtime tools.

Prompt tests must not assert complete prompt strings or duplicate full prompt bodies as test-owned expected values. Tests must use focused includes, exclusions, materialized workflow-value checks, route checks, and projected-tool checks.

## Testing Requirements

Update focused write-remediation-story module tests to verify:

- Step 3 prompt includes the validate-story subagent assignment phrase
- Step 3 prompt includes the validate-story instruction sentence and `attempt_completion` response instruction
- Step 3 prompt includes the final completion wording that says story validation was conducted by a subagent using the Validate Story workflow
- Step 3 prompt excludes the retired local-finalization heading and retired step-8 completion sentence
- Step 3 prompt excludes source authoring metadata
- Step 3 prompt continues to materialize `originating_story`, `code_review_output`, and `target_story`
- Step 3 still routes `attempt_completion_succeeded` to Step 4
- Step 4 finalization behavior remains unchanged

Update write-remediation-story tool-schema tests to verify:

- Step 1, Step 2, and Step 4 expose no tools
- Step 3 exposes the new exact tool order including `use_subagents` before `attempt_completion`
- Step 3 resolves shared/default tool specs through the registered shared/default tool set
- no write-remediation-story step exposes backend-only runtime tools, story-planning tools, artifact lifecycle tools, web tools, MCP tools, `workflow_progress_request`, `ask_followup_question`, `set_workflow_values`, or `use_skill`

Update prompt integration tests to verify:

- write-remediation-story Step 3 projects the new exact native tool surface
- Step 3 includes `use_subagents` and `attempt_completion`
- Step 3 excludes `workflow_progress_request`
- Step 3 includes validate-story subagent instructions in the workflow input payload and continuation workflow input payload
- current step details remain in the workflow input payload, not the system prompt
- non-native prompt text renders approved Step 3 tools without forbidden tool headings

## Validation Requirements

Validation for this update must include:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/write-remediation-story/__tests__/writeRemediationStoryToolSchemas.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
```

When running `npm run check-types`, run it with elevated permissions. If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

Validation must include focused static guards proving:

- the retired local-finalization heading is absent from write-remediation-story runtime code and tests
- the retired step-8 completion sentence is absent from write-remediation-story runtime code and tests
- `Skill: use_skill('validate-story')` is present in write-remediation-story Step 3 runtime code and prompt projection tests
- `use_subagents` is present in the write-remediation-story Step 3 projected tool schema
- `workflow_progress_request` remains absent from the write-remediation-story Step 3 projected tool schema
- backend-only runtime tools remain absent from all write-remediation-story model-facing schemas

Validation must include a scope-diff check proving persistent tracked diffs are limited to files authorized by the action plan for this update and that untracked files are either absent or explicitly authorized by the update action plan.
