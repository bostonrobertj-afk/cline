# Create Story Workflow Module Requirements

## Scope

Build the product-owned `create-story` workflow module using `/Users/robertboston/Documents/Cline/Workflows/create-story.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use the completed brainstorming, create-architecture, create-epics, and pi-planning module requirements only as structural references where they still align with the guide and current project requirements.

The create-story workflow must prepare an existing draft or backlog story file for implementation by reviewing project context, adding or revising implementation tasks and subtasks, validating the story handoff, and moving a draft story into the implementation backlog when the story becomes ready for the dev-story workflow.

The create-story workflow must not create canonical story identities, canonical story filenames, story index entries, story files, remediation story entries, or review findings documents. Those responsibilities belong to runtime-owned story planning/generation tools and review/remediation workflows.

Do not rely on the source markdown workflow file, legacy templates, BMAD files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

## Workflow Identity

- `name`: `create-story`
- `slashCommandName`: `create-story`
- `useSkillName`: `create-story`
- `displayName`: `Create Story`
- `description`: `Prepare an existing draft or backlog story file for implementation by adding or revising actionable tasks and subtasks.`
- `persona`: `scrum-master`
- `projectSubfolder`: `planning`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above.

## Persona

The create-story module must derive its structured persona from the canonical workflow mapping in `docs/workflows/workflow-runtime/requirements.md` and the migration source `_bmad/bmm/agents/sm.md`.

The module must copy the derived persona into module-owned constants and must not read `_bmad/bmm/agents/sm.md` or `/Users/robertboston/Documents/Cline/Workflows/create-story.md` at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition` for the mapped `scrum-master` persona.

- `name` must be `Bob`.
- `role` must be `Scrum Master`.
- `identity` must describe producing clear, actionable stories.
- `communicationStyle` must be crisp, checklist-driven, and ambiguity-free.
- `capabilities` must include story validation & story task/ subtask authoring.
- `principles` must inlude always assessing runtime code & tracing seams end-to-end to ensure task coverage is comprehensive.

If the requirements mapping or BMAD source file changes before implementation, the module-build action plan must require re-deriving this persona before code changes.

## Runtime-Owned Values

The create-story module must define its workflow-owned value contract according to `FR-10a` through `FR-10c1`, `FR-21a`, and `FR-21b`.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory per `FR-10c1`, `FR-35g1`, and `FR-35g2`.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`, per `FR-10j1` and `FR-10j2`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- required `architecture_document`, the absolute path to the selected `planning/architecture.md`
- required `epics_document`, the absolute path to the selected `planning/Epics.md`
- required `epics_index`, the absolute path to the selected `planning/Epics.index.json`
- optional `brainstorming_document`, the absolute path to the selected `discovery/brainstorming.md`
- `target_epic`, the selected epic's user-facing title or label
- `epic_identity`, the selected epic's canonical positive numeric identity
- `stories_index`, the selected epic's `implementation/epic-{E}-stories.index.json` absolute path
- `selected_story_identity`, the selected story's canonical dotted identity
- `selected_story_file_name`, the selected story's canonical filename from the story index
- `selected_story_type`, the selected story's `story_type` value
- `selected_story_status`, the selected story's `status` value
- `selected_story_file_generated`, the selected story's `story_file_generated` value
- `target_story`, the absolute path to the selected story file when the workflow may edit that story
- optional `parent_story_identity`, the selected remediation story's parent story identity
- optional `parent_story`, the absolute path to the remediation story's parent story file
- optional `findings_document`, the absolute path to the review findings document that produced the remediation story
- optional `revise_backlog_story`, the user's yes/no response for revising an existing backlog story
- optional `target_story_filename_for_move`, the filename value used by deterministic file movement when a draft story is finalized

Any workflow form field whose submitted value must survive beyond form-local state must declare a durable workflow-value destination and persist through the runtime value seam, per `FR-39f` through `FR-39m`.

Workflow values must remain JSON-safe and preserve type/shape, per `FR-35i` through `FR-35k`. Prompt builders may render workflow values only through deterministic rendering, per `FR-35l`; runtime or tool code requiring string paths, identities, filenames, statuses, or booleans must validate the expected type and shape per `FR-35m`.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state, per `FR-49a`, `FR-50`, and `FR-52` through `FR-52b`.

## AI-Writable Workflow Values

The create-story module must not define AI-writable workflow values.

No create-story step may expose `set_workflow_values`. Story selection, story-status derivation, target path derivation, remediation parent derivation, findings-document derivation, final status updates, and final file movement are runtime-owned deterministic behavior.

## Required And Optional Prerequisite Files

The create-story workflow requires these selected-project prerequisite files before model-driven work can begin:

| Prerequisite id | Requirement | Producing workflow | Project subfolder | Match | Workflow value key |
| --- | --- | --- | --- | --- | --- |
| `architecture_document` | required | `create-architecture` | `planning` | exact filename `architecture.md` | `architecture_document` |
| `epics_document` | required | `create-epics` | `planning` | exact filename `Epics.md` | `epics_document` |
| `epics_index` | required | `create-epics` | `planning` | exact filename `Epics.index.json` | `epics_index` |
| `brainstorming_document` | optional | `brainstorming` | `discovery` | exact filename `brainstorming.md` | `brainstorming_document` |

Each prerequisite must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action, per `FR-20j6` through `FR-20j8`.

Prerequisite selection must not be implemented as a module-owned `selectorDiscovery` workflow form, and it must not mutate shared project-selection behavior.

Runtime-owned prerequisite discovery must resolve only under the selected project root and must target the declared project subfolder. It must not accept absolute paths, parent-directory escapes, or files outside the selected project.

If any required prerequisite is not discoverable or is rejected by the user, the workflow must inform the user that they must run the producing workflow first and must not proceed to epic selection, story selection, model-driven work, story-file editing, final status updates, final file movement, or completion.

Optional `brainstorming_document` no-match, rejection, or cancellation must allow the workflow to continue without a brainstorming context file.

All prerequisite declarations must use `outputDocumentReference: "none"` because create-story does not create a workflow output document that records selected prerequisite paths.

`epic-{E}-stories.index.json` must not be declared as a generic required prerequisite. The selected epic's story index is derived after the user selects an epic from `Epics.index.json`.

## Story Index And Story File Ownership

`Epics.index.json` is the project-level epic inventory. The create-story workflow must use it to populate the target-epic dropdown and derive `epic_identity`.

After the user selects an epic, runtime/module logic must derive the expected story index path as `implementation/epic-{E}-stories.index.json`, where `{E}` is the selected `epic_identity`.

If the selected epic's story index file does not exist, the workflow must render a user-facing message stating that the selected epic does not yet have a story index file and that the user must run the `pi-planning` workflow to generate it. The workflow must not proceed to story selection or model-driven work.

`epic-{E}-stories.index.json` is the selected epic's canonical story inventory. The create-story workflow must use the story index to populate the target-story dropdown and derive story metadata. The AI must not parse story identities or filenames from markdown and must not provide canonical story identities or filenames.

The workflow must derive story file paths from the selected story's indexed `story_file_name` and `status`:

| Story status | Project subfolder for selected story file |
| --- | --- |
| `draft` | `implementation/drafts` |
| `backlog` | `implementation/stories-backlog` |
| `review` | `implementation/stories-review` |
| `complete` | `implementation/stories-complete` |

If the selected story's index entry has `story_file_generated: false`, the workflow must render a user-facing message stating that the user must run the `pi-planning` workflow to generate a story file for the target story. The workflow must not proceed to model-driven work.

If the selected story has `status: "review"` or `status: "complete"`, the workflow must render a user-facing message stating that the story has already been implemented and that new tasks should not be added to stories after implementation. The message must instruct the user to go back and select the appropriate remediation story when QA findings require follow-up work.

If the selected story has `status: "draft"`, runtime/module logic must set `target_story` to the selected draft story file path.

If the selected story has `status: "backlog"`, runtime/module logic must ask whether the user wants to revise existing tasks and subtasks before implementing it through the dev-story workflow. If the user answers yes, runtime/module logic must set `target_story` to the selected backlog story file path. If the user answers no, the workflow must render a confirmation panel telling the user to run the dev-story workflow and select this story as the implementation target, then route to workflow completion after confirmation.

If the selected story has `story_type: "remediation"`, runtime/module logic must:

- read `parent_story_identity` from the selected story index entry
- locate the parent story's index entry in the same story index
- resolve `parent_story` from the parent story's indexed filename and current status folder
- locate the review findings document in the selected project's `review` folder by matching the parent story identity in the findings-document filename
- persist the located findings document path to `findings_document`

The create-story module must treat a missing parent story index entry, missing parent story file, or missing findings document for a remediation story as invalid project state and must fail clearly without allowing model-driven story editing.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the create-story workflow.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`, per `FR-29b1`.
- `stepNumber` must define the runtime step order.
- `checklistLabel` must define the focus-chain task text projected to the UI.
- `buildPromptSource` must provide module-owned prompt text per `FR-14a` through `FR-14g`.
- `buildToolSchema` must provide module-owned per-step tool schema per `FR-15` and `FR-35`.
- `decisionTree` must own step progression, form rendering, deterministic actions, transitions, model handoff, and completion behavior per `FR-16` and `FR-29`.
- Any workflow-form or deterministic operation selected by a step must follow `FR-39` through `FR-43`.
- Final-step completion must route `attempt_completion_succeeded` through deterministic story finalization and then `complete_workflow` per `FR-19` through `FR-19c` and `FR-46` through `FR-49`.

The module must define these four steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Gather Inputs` | Resolve required and optional prerequisites, render target-epic and target-story workflow forms, derive story paths and metadata, and transition only actionable draft or user-approved backlog stories to Step 2. |
| `step-2` | 2 | `Review Context & Ensure Project Alignment` | Model-driven context review step; progression requires `workflow_progress_request` confirmation. |
| `step-3` | 3 | `Author Tasks & Subtasks` | Model-driven story task/subtask authoring or revision step; progression requires `workflow_progress_request` confirmation after user review. |
| `step-4` | 4 | `Finalize & Validate Story Document` | Model-driven story validation step; final delivery uses `attempt_completion` and routes `attempt_completion_succeeded` through deterministic story finalization before completion. |

## Step 1: Gather Inputs

Step 1 must resolve prerequisite files before rendering module-owned input workflow forms.

Step 1 must invoke `resolve_prerequisite_files` for `architecture_document`, `epics_document`, `epics_index`, and `brainstorming_document`.

After prerequisite resolution succeeds or optional prerequisites are skipped, Step 1 must render module-owned workflow form behavior for story selection.

Panel A must ask `Which epic are we focusing on during this workflow?`

Panel A must render a required dropdown populated from `planning/Epics.index.json` by using `jsonOptionsSource`. The option value must be the selected epic's `identity`; labels must identify the selected epic clearly from the index entry. The selected value must persist `epic_identity`, and runtime/module logic must persist the corresponding user-facing epic label or title to `target_epic`.

Panel A must derive its dropdown from `Epics.index.json`, not from markdown parsing of `Epics.md`.

Panel A must reject or fail clearly if `Epics.index.json` contains no epics.

After Panel A, runtime/module logic must derive `stories_index` for the selected epic. If the selected epic's story index file is absent, Step 1 must render the cannot-continue message described in `Story Index And Story File Ownership`.

Panel B must be shown only when the selected epic's story index file is present.

Panel B must ask `Which story should I focus on during this workflow?`

Panel B must render a required dropdown populated from the selected epic's `stories_index`. The option value must be the selected story's `story_identity`; labels must identify each story clearly from its indexed identity and filename.

After Panel B, runtime/module logic must persist `selected_story_identity`, `selected_story_file_name`, `selected_story_type`, `selected_story_status`, and `selected_story_file_generated` from the selected story index entry.

If the selected story has `story_file_generated: false`, Step 1 must render the cannot-continue message described in `Story Index And Story File Ownership`.

If the selected story has `status: "draft"`, Step 1 must derive and persist `target_story`, derive remediation context when applicable, and transition to Step 2.

If the selected story has `status: "backlog"`, Step 1 must render Panel C.

Panel C must ask `The selected story appears to be ready for implementation. Do you want to revise the existing tasks and subtasks before implementing it via the dev-story workflow?`

Panel C must render a required yes/no field and must include a back option that lets the user return to Panel B to select another story.

If the user answers yes on Panel C, Step 1 must persist `revise_backlog_story`, derive and persist `target_story`, derive remediation context when applicable, and transition to Step 2.

If the user answers no on Panel C, Step 1 must render Panel D.

Panel D must state `Since the selected story already has been populated with tasks and subtasks, your next step is to run the dev-story workflow and select this story as the implementation target.`

Panel D must render a confirmation control. Confirmation must route to `complete_workflow` without model-driven work, story-index mutation, or file movement.

If the selected story has `status: "review"` or `status: "complete"`, Step 1 must render Panel E.

Panel E must state `This story has already been implemented. New tasks should not be added to stories after implementation. If findings were documented during QA, the QA agent generated a remediation story to address those findings. Please go back and select the appropriate remediation story as the target for this workflow.`

Panel E must include a back option that lets the user return to Panel B to select another story.

Step 1 must be runtime-driven and must expose an empty tool schema through an exported builder from `createStoryToolSchemas.ts`.

## Step 2: Review Context & Ensure Project Alignment

Step 2 must enter model-driven work through a `project_prompt` decision action.

Step 2 `buildPromptSource` must construct the Step 2 prompt from module-owned code.

When the selected story has `status: "backlog"` and the user answered yes on Panel C, the Step 2 prompt must instruct the AI that it is revising an existing story file.

When the selected story has `status: "draft"` and `story_type: "primary"`, the Step 2 prompt must instruct the AI that it is preparing a story file for implementation by adding tasks and subtasks.

When the selected story has `status: "draft"` and `story_type: "remediation"`, the Step 2 prompt must instruct the AI that it is preparing a remediation story file for implementation by adding tasks and subtasks. The prompt must include `parent_story` and `findings_document`.

The Step 2 prompt must instruct the AI to:

- focus on `target_story`
- read `target_story`
- read `architecture_document`
- read `epics_document`
- read `brainstorming_document` when present
- for remediation stories, read `parent_story` and `findings_document`
- ensure existing non-task story content fully aligns with project architecture and epics context
- for remediation stories, ensure the target remediation story aligns with the QA findings that produced it
- identify conflicts or misalignment before task/subtask authoring begins
- notify the user of conflicts, ambiguities, or missing information
- work with the user to identify the appropriate resolution when a decision is needed
- proceed only once the story objective, scope, scope boundary, requirements, and known issues/risks/technical-debt sections align with the provided project documentation
- for backlog revisions, ask the user to explain the required revisions and ground any suggested revisions in provided context and existing runtime code/tests
- call `workflow_progress_request` only after context review is complete and blocking issues are resolved or the user confirms the current context is sufficient

Step 2 tool schema must expose exactly:

- `read_file`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`
- `apply_patch`
- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file_range`

Step 2 must not expose:

- `set_workflow_values`
- `plan_story_artifacts`
- `plan_remediation_story_artifact`
- `generate_story_files`
- `attempt_completion`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

Step 2 must transition to Step 3 only on `workflow_progress_request_confirmed`. A denied progression request must return to the Step 2 project prompt.

## Step 3: Author Tasks & Subtasks

Step 3 must enter model-driven work through a `project_prompt` decision action.

Step 3 `buildPromptSource` must construct the Step 3 prompt from module-owned code.

When the selected story has `status: "backlog"`, the Step 3 prompt must instruct the AI to review existing tasks and subtasks in `target_story` and determine whether they satisfy all requirements, scope, scope boundary, objective, story instructions, test coverage expectations, and action-plan quality rules.

When the selected story has `status: "draft"`, the Step 3 prompt must instruct the AI to review runtime code and tests and identify the full set of in-scope revisions needed to deliver the story's requirements and objective.

The Step 3 prompt must instruct the AI to:

- inspect relevant runtime code and tests before authoring tasks and subtasks
- trace any required existing artifact, placeholder, resolver, handler, runtime consumer, test, or document convention end to end
- perform sibling-pattern audits for any new artifact, tool, schema entry, prompt/tool exposure, approval/path policy, test, snapshot, or canonical document surface
- provide the user with the identified revision set before translating it into tasks and subtasks
- author implementation-ready tasks and subtasks in `target_story`
- verify proposed tasks and subtasks for project standards, architecture fit, downstream impact, and code hygiene
- prefer deep architectural fixes over surface workarounds
- identify any downstream or peripheral risks and propose follow-up mitigations where needed
- avoid prescribing hardcoded values where configuration or constants are appropriate
- prescribe removal of cruft and failed-attempt remnants when the story retires or replaces existing behavior
- avoid `any`, broad type assertions, forced assertions, non-boolean boolean checks, stale domain naming, compatibility remaps for retired concepts, and other prohibited code-hygiene patterns
- avoid introducing architecture not backed by upstream requirements or architecture documents
- avoid in-plan churn by prescribing the final intended code shape directly
- ensure the resulting story can end in a repo-valid intermediate state that passes focused tests, formatting, lint, and typecheck
- ensure each task and subtask is ordered so no item depends on a later item
- ask the user to review the tasks/subtasks section in `target_story`
- refine based on user feedback
- call `workflow_progress_request` only after the user is satisfied with the tasks/subtasks section

The Step 3 prompt must require task/subtask prescriptions to follow the module's action-plan/story authoring rules from the source workflow, including the rule that each subtask is scoped to a single revision in a single target file with specific allowed files.

Step 3 tool schema must expose exactly:

- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`

Step 3 must not expose:

- `set_workflow_values`
- `plan_story_artifacts`
- `plan_remediation_story_artifact`
- `generate_story_files`
- `attempt_completion`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

Step 3 must transition to Step 4 only on `workflow_progress_request_confirmed`. A denied progression request must return to the Step 3 project prompt.

## Step 4: Finalize & Validate Story Document

Step 4 must enter model-driven work through a `project_prompt` decision action.

Step 4 `buildPromptSource` must construct the Step 4 prompt from module-owned code.

The Step 4 prompt must instruct the AI to validate `target_story` as a complete implementation handoff.

The Step 4 prompt must instruct the AI to verify:

- every acceptance criterion is covered by one or more tasks
- every task maps to a real part of the approved story scope
- task order is executable and non-conflicting
- no two tasks prescribe contradictory file changes or incompatible invariants
- every planned code change has corresponding test-maintenance coverage where needed
- stale assertions, mocks, snapshots, validators, and type contracts are accounted for when affected
- task/subtask content remains aligned with story objective, scope, scope boundary, requirements, and general instructions

If the AI detects ambiguity, contradiction, missing coverage, or unsafe handoff content, the prompt must instruct the AI to correct it when the correction does not require a new user decision. If correction requires a new decision, the AI must stop and ask the user.

The Step 4 prompt must instruct the AI to call `attempt_completion` only after validation passes and the story is complete and ready for implementation.

Step 4 tool schema must expose exactly:

- `read_file`
- `read_file_range`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `attempt_completion`

Step 4 must not expose:

- `list_files`
- `search_files`
- `list_code_definition_names`

- `workflow_progress_request`
- `set_workflow_values`
- `plan_story_artifacts`
- `plan_remediation_story_artifact`
- `generate_story_files`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

Step 4 must route `attempt_completion_succeeded` through deterministic finalization before `complete_workflow`.

For a draft story, deterministic finalization must:

- update the selected story's `status` in `stories_index` from `draft` to `backlog`
- move the story file from `implementation/drafts` to `implementation/stories-backlog` by using the runtime-owned file-move capability
- preserve the story file's canonical filename from `selected_story_file_name`
- route to `complete_workflow` only after both status update and file movement succeed

For a backlog story selected for revision, deterministic finalization must:

- leave the story file in `implementation/stories-backlog`
- leave or set the selected story's `status` in `stories_index` to `backlog`
- route to `complete_workflow` after the story index status is confirmed

Finalization failure must not silently complete the workflow. A failed story-index update or failed file move must fail clearly and leave the workflow active or terminal according to the module-owned decision tree.

## Tool Schema Ownership

The create-story module must have a canonical tool-schema file:

```text
src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts
```

All model-visible workflow tool-schema builders must live there.

`createStoryWorkflow.ts` must not define inline `ClineToolSpec` objects, inline tool arrays, local tool-schema builder bodies, or fallback empty schemas.

Each `WorkflowStepDefinition.buildToolSchema(...)` must delegate directly to a named export from `createStoryToolSchemas.ts`.

The returned `readonly ClineToolSpec[]` is the complete model-visible workflow tool surface for that turn. It is not additive with default workflow tools.

The create-story module must not expose backend-only runtime tools in any model-facing schema:

- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

## Legacy Cleanup Ownership

The create-story module buildout owns cleanup only for legacy create-story package content that is superseded by the runtime-owned create-story workflow module.

The create-story module buildout must delete `.cline/skills/bmad-create-story/**`, excluding only `workflow.md` and `steps/**/*.md`.

The create-story module buildout must delete `.cline/skills/bmad-create-story/template.md`. The runtime create-story workflow does not create a new story document from this template; it edits existing story files generated upstream by `pi-planning`.

The create-story module buildout must delete `src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts` if it exists, and must verify no active runtime registration or model-facing schema references remain.

Any surviving story-document creation or update behavior must be implemented through current workflow-runtime mechanisms: module-owned prompt builders, governed model-facing file-edit tools, runtime-owned deterministic actions, or shared document-generation patterns where they are explicitly required. The bespoke `BuildStoryDocumentToolHandler.ts` surface must not be remapped, renamed, or preserved.

The create-story module must not reintroduce or preserve legacy placeholder workflow state, managed-workflow state, or standalone create-story prompt package behavior.

Legacy story implementation prompt-state fields, including `activeStoryTaskId`, `activeStorySubtaskIds`, and `lastPromptedStoryTaskKey`, are out of scope for create-story and must remain untouched until the `dev-story` module build.

## Testing Requirements

The create-story module must include module tests for:

- workflow identity and metadata
- persona fields
- workflow value inventory
- absence of AI-writable workflow values
- entry project value keys
- prerequisite declarations for `architecture_document`, `epics_document`, `epics_index`, and `brainstorming_document`
- runtime-owned prerequisite resolution routes
- target-epic dropdown population from `Epics.index.json`
- persistence of `target_epic` and `epic_identity`
- derived `stories_index` path after epic selection
- cannot-continue behavior when the selected epic story index is missing
- target-story dropdown population from the selected epic's story index
- persistence of selected story metadata from the story index
- blocking behavior when `story_file_generated` is `false`
- draft story path derivation under `implementation/drafts`
- backlog story path derivation under `implementation/stories-backlog`
- review and complete story blocking behavior with back navigation to story selection
- backlog revision yes/no branching
- remediation story parent-story and findings-document derivation
- invalid remediation project-state failure for missing parent entry, missing parent file, or missing findings document
- Step 1 transition to Step 2 only for actionable draft stories or user-approved backlog revisions
- Panel D confirmation routing directly to workflow completion
- Step 2 prompt source output for backlog revision, primary draft story, and remediation draft story variants
- Step 3 prompt source output for backlog revision and draft story variants
- Step 4 prompt source output
- Step 2 through Step 4 decision-tree route structure
- exact Step 1 through Step 4 tool-schema outputs
- Step 2 and Step 3 progression through explicit `workflow_progress_request_confirmed` routing
- Step 4 finalization through explicit `attempt_completion_succeeded` routing
- draft story finalization status update and move to `implementation/stories-backlog`
- backlog story finalization without moving the story file out of `implementation/stories-backlog`

Tests must verify that model-facing schemas do not expose backend-only runtime tools:

- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

Tests must verify that no create-story step exposes:

- `set_workflow_values`
- `plan_story_artifacts`
- `plan_remediation_story_artifact`
- `generate_story_files`

Prompt integration tests must prove:

- current step details appear in the input payload, not system instructions
- runtime-projected workflow schema is the exact native tool surface for each active create-story step
- response-tool guidance matches the projected schema
- `workflow_progress_request` appears only when Step 2 or Step 3 is active
- `attempt_completion` appears only when Step 4 is active
- backend-only runtime tools are not statically exposed

Legacy cleanup tests must prove:

- legacy create-story prompt/package behavior is not used at runtime

Validation must include:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
```

Add focused `rg` checks proving:

- `BuildStoryDocumentToolHandler` is absent from active create-story runtime paths after migration.
- `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, and `move_workflow_project_file` are not present in create-story model-facing tool schemas.
- `set_workflow_values`, `plan_story_artifacts`, `plan_remediation_story_artifact`, and `generate_story_files` are not present in create-story model-facing tool schemas.
