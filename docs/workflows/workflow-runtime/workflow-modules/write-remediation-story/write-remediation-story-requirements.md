# Write Remediation Story Workflow Module Requirements

## Scope

Build the product-owned `write-remediation-story` workflow module using `/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use completed workflow module requirements and implementations only as structural references where they still align with the guide, current project requirements, and the write-remediation-story source instructions.

The write-remediation-story workflow completes an existing drafted remediation story by adding the tasks and subtasks needed to address documented code-review findings. It does not create a remediation story. The upstream `code-review` workflow creates the draft remediation story and the code-review findings document.

Do not rely on the source markdown workflow file, legacy BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, the legacy contextual tool matrix, or legacy workflow-step-resolution registries at runtime. Source and legacy files are migration references only.

## Source Verbiage Fidelity

The module must preserve the exact user-provided UI and AI prompt verbiage from `/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md` where that source provides text.

The module must not invent, paraphrase, summarize, or add UI-visible panel titles, `promptMarkdown`, field labels, action labels, static notice content, helper text, button labels, or AI prompt text unless this requirements document is revised to prescribe the exact text.

The source document uses illustrative filename examples. Requirements and implementation must use the canonical project filename forms from `docs/workflows/workflow-runtime/requirements.md`: `code-review-{target}.md`, `Story-{E}-{S}.md`, and `Remediation-story-{E}-{S}-{R}.md`.

## Workflow Identity

- `name`: `write-remediation-story`
- `slashCommandName`: `write-remediation-story`
- `useSkillName`: `write-remediation-story`
- `displayName`: `write remediation story`
- `description`: `In this workflow, the agent completes a drafted remediation story by adding tasks & subtasks focused on review findings for a completed story.`
- `persona`: `scrum-master`
- `projectSubfolder`: `planning`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above as the workflow overview text for user-facing workflow activation.

The module must not register `write-remediation-story.md` or any `.md` suffixed alias as a workflow name, slash command, or use-skill name.

## Persona

The write-remediation-story module must use the persona prescribed by `/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md`.

The module must copy the persona into module-owned constants and must not read the write-remediation-story source document at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition` for the mapped `scrum-master` persona.

- `name`: `Bob`
- `role`: `Scrum Master`
- `identity`: `producing clear, actionable stories.`
- `communicationStyle`: `crisp, checklist-driven, and ambiguity-free.`
- `capabilities`: [`story validation & story task/ subtask authoring.`]
- `principles`: [`always assessing runtime code & tracing seams end-to-end to ensure task coverage is comprehensive.`]

## Runtime-Owned Values

The write-remediation-story module must define its workflow-owned value contract according to the project requirements for module-owned workflow values.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- `code_review_output`, the absolute path to the selected code-review findings document
- `target_story`, the absolute path to the selected drafted remediation story in `implementation/drafts`
- `target_story_filename`, the basename of `target_story`, used by runtime-owned file movement
- `selected_story_identity`, the dotted numeric identity of the selected drafted remediation story
- `originating_story`, the absolute path to the story or remediation story that was reviewed by `code_review_output`
- `originating_story_identity`, the dotted numeric identity of the story or remediation story that was reviewed by `code_review_output`
- `epic_identity`, the selected epic identity derived from the selected drafted remediation story
- `stories_index`, the absolute path to `implementation/epic-{E}-stories.index.json` for the selected epic
- `replacement_document_choice`, a transient Step 1 workflow-form routing value used only to route the incompatible-file replacement form after Panel A submission

`selected_story_identity` must be derived from `target_story` using only canonical `Remediation-story-{E}-{S}-{R}.md` filename parsing.

`originating_story_identity` must be derived from `code_review_output` using only canonical `code-review-{target}.md` filename parsing.

`epic_identity` must be the first segment of `selected_story_identity`.

`stories_index` must be the selected project's `implementation/epic-{E}-stories.index.json`, where `{E}` is `epic_identity`.

`replacement_document_choice` must be written only by the Step 1 replacement workflow form. It must support only `review_findings` and `remediation_story`. It must not be AI-writable, must not be projected into Step 3 prompt instructions, and must be cleared before the workflow transitions to Step 2.

Workflow values must remain JSON-safe and preserve type/shape. Prompt builders may render workflow values only through deterministic rendering. Runtime or tool code requiring string paths, identities, filenames, statuses, arrays, booleans, or object values must validate the expected type and shape.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state.

## AI-Writable Workflow Values

The write-remediation-story module must not define AI-writable workflow values.

No write-remediation-story step may expose `set_workflow_values`. Prerequisite selection, association validation, originating-story resolution, story-index path derivation, story status update, story file movement, and workflow completion are runtime-owned deterministic behavior or governed backend behavior.

## Runtime Artifacts And Existing Files

The write-remediation-story workflow does not allocate a new workflow artifact.

The workflow edits the existing drafted remediation story selected as `target_story`. The workflow must not allocate another remediation story, increment remediation story numbers, compute a new remediation story filename, or expose `plan_remediation_story_artifact` to the AI model.

The workflow must not expose `create_workflow_artifact`, `build_workflow_document`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `update_story_index_status`, `plan_story_artifacts`, `plan_remediation_story_artifact`, or `generate_story_files` in any model-facing tool schema.

The runtime-owned finalization path may use backend-only `update_story_index_status` and `move_project_file` decision actions.

## Required Prerequisite Files

For user-facing activation, the write-remediation-story workflow requires two selected-project prerequisite files before Step 1 validation can complete:

| Prerequisite id | Requirement | Producing workflow | Project subfolder | Match | Workflow value key |
| --- | --- | --- | --- | --- | --- |
| `code_review_output` | required | `code-review` | `review` | naming pattern `/^code-review-\d+-\d+(?:-\d+)?\.md$/` | `code_review_output` |
| `target_story` | required | `code-review` | `implementation/drafts` | naming pattern `/^Remediation-story-\d+-\d+-\d+\.md$/` | `target_story` |

Both prerequisites must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action.

Prerequisite selection must not be implemented as a module-owned `selectorDiscovery` workflow form, and it must not mutate shared project-selection behavior.

When a user selects a prerequisite file, `resolve_prerequisite_files` must persist the selected full absolute path to the declaration's `workflowValueKey`.

## Canonical Association Rules

The module must validate that the selected `code_review_output` and selected `target_story` are associated before the workflow may locate `originating_story` or project Step 3 model-driven work.

The association check must parse only the selected filenames:

- `code_review_output` basename must match `/^code-review-(\d+)-(\d+)(?:-(\d+))?\.md$/`
- `target_story` basename must match `/^Remediation-story-(\d+)-(\d+)-(\d+)\.md$/`

The files are associated when the first two numeric identity segments match:

- `code-review-1-1.md` and `Remediation-story-1-1-1.md` are associated
- `code-review-1-1.md` and `Remediation-story-1-2-1.md` are not associated
- `code-review-1-1.md` and `Remediation-story-1-1-2.md` are associated
- `code-review-1-1-1.md` and `Remediation-story-1-1-2.md` are associated

The module must derive:

- `selected_story_identity` from `target_story` as `E.S.R`
- `originating_story_identity` from `code_review_output` as `E.S` or `E.S.R`
- `epic_identity` from `selected_story_identity` as `E`
- `target_story_filename` from the basename of `target_story`
- `stories_index` from the selected project root and `epic_identity`

The module must validate that `stories_index` exists and contains a story entry for `selected_story_identity` with:

- `story_type: "remediation"`
- `story_file_name` equal to `target_story_filename`
- `status: "draft"`

If the story-index entry is missing, malformed, not a remediation story, mapped to a different file name, or not in `draft` status, the workflow must fail before Step 3 model-driven work.

Story-index validation failures must use these exact user-visible terminal error messages:

- Missing or malformed index file: `The required story index file is either missing or incorrectly formatted. Please ensure a correctly-formatted story index is file is present in the project's implementation subfolder before retrying this workflow. You may run the pi-planning workflow to generate one.`
- Missing remediation entry: `The selected remediation story is missing from the story index. Please add the remediation story to the story index, then retry this workflow.`
- Wrong `story_type`, mismatched `story_file_name`, or non-`draft` status: `The selected remediation story's story index entry is malformed. Please update it, then retry this workflow.`

## Step 1: Validate Inputs

Step 1 is runtime-driven and must expose an empty model-visible tool schema through a named export from `writeRemediationStoryToolSchemas.ts`.

Step 1 must validate that `code_review_output` and `target_story` are associated according to the canonical association rules above.

If the selected files are associated, Step 1 must persist the derived workflow values required for later steps and transition to Step 2.

If the selected files are not associated, Step 1 must render one module-owned workflow form with the following panels.

Panel A:

- `title`: `Incompatible files`
- `promptMarkdown`: `The findings document and remediation story identified are not associated with one another. Which document would you like to replace?`
- field kind: `radio_group`
- field label: `document to replace`
- options: `review findings`, `remediation story`
- the field must persist its submitted value to `replacement_document_choice`
- selecting `review findings` must persist `review_findings`
- selecting `remediation story` must persist `remediation_story`
- required: `true`

After Panel A submission, Step 1 routing must use `replacement_document_choice` to choose the next panel:

- `review_findings` routes to Panel C, `Replace Findings Document`
- `remediation_story` routes to Panel B, `Replace Story Document`

Panel B:

- `title`: `Replace Story Document`
- `promptMarkdown`: `Please select a drafted Remediation Story compatible with Findings Document: {code review document file name from prerequisite file resolution}`
- field kind: `dropdown`
- field label: `remediation story`
- options: all canonical remediation story files present in the selected project's `implementation/drafts` folder, populated through runtime-owned `selectorDiscovery`
- required: `true`
- allowed actions: `submit`, `back`
- action labels: `submit`, `back`
- previous panel: Panel A
- submitted value must be the selected remediation story filename
- after submission, Step 1 deterministic validation must resolve the submitted filename against the selected project's `implementation/drafts` folder, validate the resolved path through runtime-owned path-policy seams, and replace `target_story` with the resolved full absolute path before association re-validation

Panel C:

- `title`: `Replace Findings Document`
- `promptMarkdown`: `Please select a drafted Code Review findings document compatible with the Remediation Story: {remediation story document file name from prerequisite file resolution}`
- field kind: `dropdown`
- field label: `review findings`
- options: all canonical code-review findings documents present in the selected project's `review` folder, populated through runtime-owned `selectorDiscovery`
- required: `true`
- allowed actions: `submit`, `back`
- action labels: `submit`, `back`
- previous panel: Panel A
- submitted value must be the selected code-review findings filename
- after submission, Step 1 deterministic validation must resolve the submitted filename against the selected project's `review` folder, validate the resolved path through runtime-owned path-policy seams, and replace `code_review_output` with the resolved full absolute path before association re-validation

Panel B and Panel C submissions must trigger deterministic filename-to-absolute-path resolution, workflow-value replacement, and association re-validation after the replacement filename is submitted. If the files are associated after replacement, Step 1 must persist the derived workflow values required for later steps and transition to Step 2.

Panel B and Panel C submissions must clear `replacement_document_choice` before transitioning to Step 2 or terminal failure.

If files cannot be resolved as associated files after workflow form submission, the workflow must fail with this exact user-visible terminal error and end:

```text
The provided files are not associated with one another. Please ensure that correct upstream workflows have completed and produced their output documentation, then retry this workflow in a new thread.
```

Step 1 must not project model-driven work, must not expose file editing tools, and must not mutate the filesystem.

## Step 2: Locate Originating Story File

Step 2 is runtime-driven and must expose an empty model-visible tool schema through a named export from `writeRemediationStoryToolSchemas.ts`.

Step 2 must derive `originating_story` from `originating_story_identity`:

- If `originating_story_identity` has two numeric segments `E.S`, the expected originating story filename is `Story-{E}-{S}.md`.
- If `originating_story_identity` has three numeric segments `E.S.R`, the expected originating story filename is `Remediation-story-{E}-{S}-{R}.md`.

Step 2 must resolve the originating story under the selected project's `implementation/stories-complete` folder.

If the expected originating story exists and passes workspace path-policy validation, Step 2 must persist its full absolute path as `originating_story` and transition to Step 3.

If the expected originating story cannot be resolved, the workflow must end with this exact user-visible terminal error:

```text
The origin story on which the provided findings are based could not be located. Please retry this workflow in a new thread once the appropriate origin story file is restored in the project's implementation/stories-complete subfolder.
```

Step 2 must not create a legacy `review_input` value or preserve the retired `write_remediation_story_step_2_review_input` behavior.

## Step 3: Complete Remediation Story

Step 3 is model-driven and must enter model-driven work through a `project_prompt` decision action.

Step 3 `buildPromptSource` must construct the Step 3 prompt from module-owned code. The Step 3 prompt must preserve this exact source prompt text, with workflow values rendered by runtime prompt rendering:

```text
You have been invoked inside a workflow focused on completing a drafted remediation story in response to QA findings after an upstream story in the same project was completed.

Read these files first:
- The originating story: originating_story
- QA findings for the originating story: code_review_output
- Drafted remediation story: target_story

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
   
1. Read the requirements in target_story and parse them into observable obligations:
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

8. Finalize the tasks & subtasks by reviewing them one-by-one and ensuring that:
  - The story will culminate in a compile-ready state so that system diagnostics/ tests can be run cleanly between stories.
  - No task or subtask is dependent on another task or subtask which is sequenced after it, or dependent on work that has not been completed and is not within the story's scope.
  - no subtask prescribes more than one revision in a single target file
  - no task which is NOT supported by subordinate subtasks prescribes more than one revision in a single target file
  - every task is clearly aligned with one of the three approved task methods
  - tasks and subtasks start with "[ ]"
  - subtasks are nested under their parent tasks with appropriate indentation
  - tasks and subtasks are numbered sequentially, with subtasks inheriting the parent task ID (e.g. task 1, subtask 1.1)

9. Author the story's validation section by prescribing the most targeted set of unit tests and validations possible while ensuring that the intended revisions and behavior are in place.

Once all tasks and subtasks are added to target_story and you've validated them per step 8 above, use attempt_completion to provide a final update to the user notifying them that the remediation story is ready for implementation.
```

The prompt renderer must replace `originating_story`, `code_review_output`, and `target_story` with their persisted workflow values before projection. The projected prompt must not leak those placeholder strings when valid workflow values are available.

Step 3 must expose only the model-callable tools required for the source-prescribed work:

- `execute_command`
- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `write_to_file`
- `send_user_message`
- `attempt_completion`

Step 3 must not expose `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `update_story_index_status`, `plan_story_artifacts`, `plan_remediation_story_artifact`, `generate_story_files`, `workflow_progress_request`, `ask_followup_question`, `use_subagents`, web tools, MCP tools, or retired workflow tools.

The Step 3 tool schema builder must use existing shared/default tool specs. The module must not add custom model-facing tool descriptions, parameter descriptions, or parameters unless this requirements document is revised to approve the exact schema text and shape.

When `attempt_completion_succeeded` occurs in Step 3, the workflow must transition to Step 4. Step 3 `attempt_completion_succeeded` must not directly complete the workflow.

## Step 4: Workflow Finalization

Step 4 is runtime-driven and must expose an empty model-visible tool schema through a named export from `writeRemediationStoryToolSchemas.ts`.

Step 4 must finalize the target remediation story after successful Step 3 `attempt_completion`.

Step 4 must update the selected remediation story's entry in `stories_index` from `draft` to `backlog` using the runtime-owned `update_story_index_status` decision action.

The status update action must use:

- `storyIndexWorkflowValueKey`: `stories_index`
- `storyIdentityWorkflowValueKey`: `selected_story_identity`
- `status`: `backlog`
- `expectedCurrentStatus`: `draft`

After the status update succeeds, Step 4 must move the selected remediation story file from the selected project's `implementation/drafts` folder to the selected project's `implementation/stories-backlog` folder using the runtime-owned `move_project_file` decision action.

The move action must use:

- `sourceFolderSegments`: [`implementation`, `drafts`]
- `destinationFolderSegments`: [`implementation`, `stories-backlog`]
- `filenameWorkflowValueKey`: `target_story_filename`

After the move succeeds, Step 4 must complete the workflow through `complete_workflow`.

If the story-index status update fails or the file move fails, the workflow must end through a terminal failure path that includes the concrete backend/runtime failure reason. If the backend/runtime failure reason is absent, the module may use the existing generic fallback `Tool-backed operation failed.`.

Step 4 must not project model-driven work, must not expose model-facing tools, and must not require the AI model to call any finalization tool.

## Decision Tree Requirements

Each step must have an explicit decision tree.

Each tool-backed operation and deterministic procedure must have explicit success and failure routes. Failure routes must end in a retry route or terminal failure; they must not silently no-op.

The workflow must represent completion only through workflow-owned runtime state and decision-tree actions. `attempt_completion` success must be emitted to workflow runtime as `attempt_completion_succeeded`; response-tool execution must not directly tear down or finalize the workflow.

## Tool Schema Requirements

The module must define all model-visible tool-schema builders in:

```text
src/core/task/workflow-runtime/workflow-modules/write-remediation-story/writeRemediationStoryToolSchemas.ts
```

Every step's `buildToolSchema(...)` must delegate directly to a named export from that file.

Step tool schemas must be:

| Step | Tool names |
| --- | --- |
| Step 1 | `[]` |
| Step 2 | `[]` |
| Step 3 | `["execute_command", "list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "attempt_completion"]` |
| Step 4 | `[]` |

The legacy contextual tool matrix must not participate in model-facing tool projection.

## Module File Layout

The write-remediation-story implementation should use only the module files it actually needs, consistent with the module build guide:

```text
src/core/task/workflow-runtime/workflow-modules/write-remediation-story/
  writeRemediationStoryWorkflow.ts
  writeRemediationStoryToolSchemas.ts
  index.ts
  __tests__/
    writeRemediationStoryWorkflow.test.ts
    writeRemediationStoryToolSchemas.test.ts
```

The write-remediation-story module must not create a module-owned document helper, registry file, static data file, or additional module file unless the requirements are revised first to prescribe that file by name and purpose.

## Historical Cleanup Expectations

The module build must not preserve or re-establish write-remediation-story behavior through placeholder workflow state, managed-workflow state, source markdown loading, `.md` workflow identity aliases, legacy focus-chain deterministic progression, or the legacy contextual tool matrix.

The action plan must address the project-requirements cleanup row for the legacy step-resolution registry constant `WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_DEFINITION_ID`. If the legacy registry file or export no longer exists in the checkout, the action plan must prescribe validation proving that no live runtime dependency remains.

The module build must not preserve `review_input`, `story_path`, or `write_remediation_story_step_2_review_input` as write-remediation-story runtime workflow values or step-resolution concepts.

## Testing Requirements

The module build must include focused unit tests covering:

- workflow identity, `slashCommandName`, `useSkillName`, display name, description, project subfolder, persona fields, and entry panel description reuse
- workflow registry resolution by workflow name, slash command, and use-skill name
- negative registry coverage proving `write-remediation-story.md` does not resolve as a workflow name, slash command, or use-skill name
- workflow value inventory, including entry project keys, `code_review_output`, `target_story`, `target_story_filename`, `selected_story_identity`, `originating_story`, `originating_story_identity`, `epic_identity`, and `stories_index`
- prerequisite declarations for `code_review_output` and `target_story`, including required mode, producing workflow `code-review`, selected-project subfolders, canonical filename patterns, workflow value keys, and `outputDocumentReference: "none"`
- association validation for primary-story and remediation-story code-review filenames against drafted remediation story filenames
- replacement workflow form structure, including Panel A, Panel B, Panel C, persisted replacement workflow values, back actions, and terminal failure when replacement still does not produce associated files
- replacement Panel A routing through `replacement_document_choice`, including `review_findings` routing to Panel C, `remediation_story` routing to Panel B, and clearing `replacement_document_choice` before Step 2 transition
- story-index validation for selected drafted remediation story identity, filename, type, and draft status
- originating-story identity derivation from `code_review_output`
- originating-story path resolution for primary stories and remediation stories under `implementation/stories-complete`
- terminal error when the originating story cannot be resolved
- Step 1, Step 2, and Step 4 exported tool-schema builders returning empty model-visible schemas
- Step 3 exported tool-schema builder returning exactly the approved model-visible tool names
- Step 3 prompt projection preserving source wording while rendering `originating_story`, `code_review_output`, and `target_story` values without leaking placeholders
- prompt integration proving Step 3 projected tools are present in active workflow native/non-native prompt surfaces and forbidden tools are absent
- Step 3 `attempt_completion_succeeded` routing to Step 4 rather than direct workflow completion
- Step 4 story-index status update action shape
- Step 4 remediation story move action shape
- Step 4 completion only after status update and file move succeed
- Step 4 failure routing for status-update and file-move failures with the concrete backend/runtime failure reason
- absence of runtime dependency on the write-remediation-story source markdown, placeholder workflow state, managed-workflow state, `.md` workflow identity aliases, legacy `review_input` or `story_path` values, and the legacy tool matrix

Prompt tests must not assert exact editable prompt prose. They must assert behavior and invariants: prompt output exists, required workflow values render non-empty, placeholders do not leak, forbidden legacy text is absent, current step details are projected in the correct payload location, and the projected tool schema matches the prompt's tool references.

## Validation Requirements

The write-remediation-story action plan must prescribe validation commands that include:

- focused write-remediation-story workflow module unit tests
- focused write-remediation-story tool-schema tests
- workflow registry/prompt projection tests covering slash-command and use-skill activation
- `npm run check-types`
- `npm run lint`
- focused `rg` checks proving forbidden legacy write-remediation-story runtime concepts are not present in the module implementation

If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun the exact blocked validation command before treating the failure as a code defect.

Persistent diffs after implementation must be limited to files authorized by the action plan phase being executed.
