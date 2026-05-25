# PI Planning Workflow Module Requirements

## Scope

Build the product-owned `pi-planning` workflow module using `/Users/robertboston/Documents/Cline/Workflows/pi-planning.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use the completed brainstorming, create-architecture, and create-epics module requirements only as structural references where they still align with the guide and current project requirements.

The pi-planning workflow must select one existing epic, review architecture and epics context, determine the needed story set, update the selected epic's story index, generate draft story files from that index, and populate each generated or existing draft story file with initial story details.

The pi-planning workflow must not produce or depend on an `Epic-{E}-delivery-spec.md` artifact. Epic delivery specs are retired legacy artifacts.

Do not rely on the source markdown workflow file, legacy templates, BMAD files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

## Workflow Identity

- `name`: `pi-planning`
- `slashCommandName`: `pi-planning`
- `useSkillName`: `pi-planning`
- `displayName`: `PI Planning`
- `description`: `Break a selected epic into implementation-ready draft story files using architecture, epics, and optional discovery context.`
- `persona`: `product-manager`
- `projectSubfolder`: `planning`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above.

## Persona

The pi-planning module must derive its structured persona from the canonical workflow mapping in `docs/workflows/workflow-runtime/requirements.md`, the migration source `_bmad/bmm/agents/pm.md`, and the pi-planning source persona text.

The module must copy the derived persona into module-owned constants and must not read `_bmad/bmm/agents/pm.md` or `/Users/robertboston/Documents/Cline/Workflows/pi-planning.md` at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition` for the mapped `product-manager` persona.

- `name` must be `John`.
- `role` must be `Product Manager`.
- `identity` must describe breaking well-defined epics down into deliverable stories with clear scope.
- `communicationStyle` must be detailed, diligent, and to-the-point, and must not encourage assumptions.
- `capabilities` must include breaking epics into deliverable stories with clear scope.
- `principles` must include validating documentation coverage and consistency against existing runtime code when forming story coverage.

If the requirements mapping, BMAD source file, or pi-planning source persona text changes before implementation, the module-build action plan must require re-deriving this persona before code changes.

## Foundational Runtime Dependency

The pi-planning workflow depends on the runtime-owned story planning tools defined in `FR-20q` through `FR-20t`.

Before the pi-planning module can pass QA, shared runtime behavior for `plan_story_artifacts` must support the current `Epics.index.json` lifecycle:

- `plan_story_artifacts` must validate the provided `epic_identity` against the selected project's `planning/Epics.index.json`.
- `plan_story_artifacts` must create or update `implementation/epic-{E}-stories.index.json`.
- `plan_story_artifacts` must set the selected epic's `story-index-generated` value to `true` in `planning/Epics.index.json` after the story index exists.
- The update to `Epics.index.json` must preserve all other indexed epics and must not alter epic identities or titles.

If the existing foundational implementation does not provide this behavior, the pi-planning module action plan must identify and schedule a foundational build phase before implementing pi-planning module code that depends on it.

## Runtime-Owned Values

The pi-planning module must define its workflow-owned value contract according to `FR-10a` through `FR-10c1`, `FR-21a`, and `FR-21b`.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory per `FR-10c1`, `FR-35g1`, and `FR-35g2`.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`, per `FR-10j1` and `FR-10j2`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- `implementation_folder`, the selected project's `implementation` folder
- `drafts_folder`, the selected project's `implementation/drafts` folder
- required `architecture_document`, the absolute path to the selected `planning/architecture.md`
- required `epics_document`, the absolute path to the selected `planning/Epics.md`
- required `epics_index`, the absolute path to the selected `planning/Epics.index.json`
- optional `brainstorming_document`, the absolute path to the selected `discovery/brainstorming.md`
- optional `additional_context`, the user-provided full file paths for additional context files
- `target_epic`, the selected epic's user-facing label or title
- `epic_identity`, the selected epic's canonical positive numeric identity
- optional `stories_index`, the selected epic's `implementation/epic-{E}-stories.index.json` absolute path when it exists at workflow start or after story planning
- `stories_index_existed_at_workflow_start`, a boolean indicating whether the selected epic already had a story index when Step 1 derived selected-epic values
- optional `edit_intent`, the user's Panel B selection, with exact allowed values `Complete initial story buildout` and `edit existing story file`
- optional `selected_story_identity`, the story identity selected in Panel C when `edit_intent` is `edit existing story file`
- optional `selected_story_file_name`, the `story_file_name` read from the selected story index entry
- optional `selected_story_status`, the `status` read from the selected story index entry
- optional `target_story`, the full absolute path resolved from `selected_story_identity` and the selected epic's story index

Any workflow form field whose submitted value must survive beyond form-local state must declare a durable workflow-value destination and persist through the runtime value seam, per `FR-39f` through `FR-39m`.

Workflow values must remain JSON-safe and preserve type/shape, per `FR-35i` through `FR-35k`. Prompt builders may render workflow values only through deterministic rendering, per `FR-35l`; runtime or tool code requiring string paths or identities must validate non-empty strings per `FR-35m`.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state, per `FR-49a`, `FR-50`, and `FR-52` through `FR-52b`.

## AI-Writable Workflow Values

The pi-planning module must define `stories_index` as AI-writable only for Step 4, and only so the AI can persist the generated story-index absolute path after successfully calling `plan_story_artifacts` for an epic that did not have a story index at workflow start.

Step 4 is the only pi-planning step that may expose `set_workflow_values`.

When exposed in Step 4, `set_workflow_values` must allow writing only the `stories_index` key. It must not allow the AI to mutate `epic_identity`, `target_epic`, prerequisite file paths, project folder paths, story identities, story filenames, story counts, or any artifact metadata.

No other pi-planning step may expose `set_workflow_values`.

## Required And Optional Prerequisite Files

The pi-planning workflow requires these selected-project prerequisite files before model-driven work can begin:

| Prerequisite id | Requirement | Producing workflow | Project subfolder | Match | Workflow value key |
| --- | --- | --- | --- | --- | --- |
| `architecture_document` | required | `create-architecture` | `planning` | exact filename `architecture.md` | `architecture_document` |
| `epics_document` | required | `create-epics` | `planning` | exact filename `Epics.md` | `epics_document` |
| `epics_index` | required | `create-epics` | `planning` | exact filename `Epics.index.json` | `epics_index` |
| `brainstorming_document` | optional | `brainstorming` | `discovery` | exact filename `brainstorming.md` | `brainstorming_document` |

Each prerequisite must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action, per `FR-20j6` through `FR-20j8`.

Prerequisite selection must not be implemented as a module-owned `selectorDiscovery` workflow form, and it must not mutate shared project-selection behavior.

Runtime-owned prerequisite discovery must resolve only under the selected project root and must target the declared project subfolder. It must not accept absolute paths, parent-directory escapes, or files outside the selected project.

If any required prerequisite is not discoverable or is rejected by the user, the workflow must inform the user that they must run the producing workflow first and must not proceed to model-driven work, story planning, story-file generation, story-file editing, or completion.

Optional `brainstorming_document` no-match, rejection, or cancellation must allow the workflow to continue without a brainstorming context file.

All prerequisite declarations must use `outputDocumentReference: "none"` because pi-planning does not create a workflow output document that records selected prerequisite paths.

## Story Index And Story File Ownership

`Epics.index.json` is the project-level epic inventory. The pi-planning workflow must use it to populate the target-epic dropdown and determine whether the selected epic already has a story index.

`epic-{E}-stories.index.json` is the selected epic's canonical story inventory. It must be created or updated by `plan_story_artifacts`, not by direct model-authored file editing.

The AI must not provide canonical story identities or story filenames. Runtime-owned story planning tools assign them.

`generate_story_files` must create missing draft story files under `implementation/drafts` from the selected epic's story index. The AI must not manually create story files.

After story files exist, the AI may edit generated or existing draft story files by using governed file tools exposed by the active step schema.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the pi-planning workflow.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`, per `FR-29b1`.
- `stepNumber` must define the runtime step order.
- `checklistLabel` must define the focus-chain task text projected to the UI.
- `buildPromptSource` must provide module-owned prompt text per `FR-14a` through `FR-14g`.
- `buildToolSchema` must provide module-owned per-step tool schema per `FR-15` and `FR-35`.
- `decisionTree` must own step progression, form rendering, deterministic actions, transitions, model handoff, and completion behavior per `FR-16` and `FR-29`.
- Any workflow-form or deterministic operation selected by a step must follow `FR-39` through `FR-43`.
- Final-step completion must route `attempt_completion_succeeded` to `complete_workflow` per `FR-46` through `FR-49`.

The module must define these six steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Gather Inputs` | Resolve required and optional prerequisites, set implementation folder values, render the target-epic, edit-intent, story-selection, and additional-context workflow form, and transition to Step 2 or Step 6 according to the user's edit intent. |
| `step-2` | 2 | `Review Context` | Model-driven context review step; progression requires `workflow_progress_request` confirmation. |
| `step-3` | 3 | `Determine How Many Stories Are Needed` | Model-driven story-count analysis step; progression requires `workflow_progress_request` confirmation. |
| `step-4` | 4 | `Generate an Updated Story Index` | Model-driven story-index planning step; progression occurs after `plan_story_artifacts` succeeds or after `workflow_progress_request` confirms no additional stories are needed. |
| `step-5` | 5 | `Generate Story Files from the Story Index` | Model-driven story-file generation step; progression occurs after `generate_story_files` succeeds. |
| `step-6` | 6 | `Populate Story Files with Initial Details` | Model-driven draft-story editing and final alignment step; final delivery uses `attempt_completion` and routes `attempt_completion_succeeded` to workflow completion. |

## Step 1: Gather Inputs

Step 1 must resolve prerequisite files before rendering the module-owned input workflow form.

Step 1 must invoke `resolve_prerequisite_files` for `architecture_document`, `epics_document`, `epics_index`, and `brainstorming_document`.

After prerequisite resolution succeeds or optional prerequisites are skipped, Step 1 must persist:

- `implementation_folder` as the selected project's `implementation` folder absolute path
- `drafts_folder` as the selected project's `implementation/drafts` folder absolute path

Step 1 must render one module-owned workflow form containing these panels:

| Panel | Trigger | Field behavior |
| --- | --- | --- |
| Panel A | First panel | Ask `Which epic are we working on during this workflow?`; render a required dropdown populated from `epics_index`; option labels must identify the epic clearly; selected value must persist `target_epic` and `epic_identity`; runtime/module logic must determine whether the selected epic has an existing story index, set `stories_index_existed_at_workflow_start`, and set `stories_index` to the selected epic's `implementation/epic-{E}-stories.index.json` absolute path when the story index exists. |
| Panel B | Only when the selected epic has an existing story index | Title `Provide Edit Intent`; promptMarkdown `It looks like the selected epic already has a story index file with generated story files. Please select one of the following options:`; render a required dropdown field with label `select one`; options must be exactly `Complete initial story buildout` and `edit existing story file`; persist the selected value to `edit_intent`. |
| Panel C | Only after Panel B when `edit_intent` is `edit existing story file` | Title `Select Story`; promptMarkdown `Which story would you like to edit?`; render a required dropdown field with label `Select Story`; options must be JSON-derived from the selected epic's story index file using `jsonOptionsSource` root `{ kind: "selected_project_root" }`, `sourcePathSegments` `["implementation", "epic-{workflow.epic_identity}-stories.index.json"]`, `itemsPath` `"stories"`, `valueProperty` `"story_identity"`, and `labelTemplate` `"Story {story_identity}: {story_file_name}"`; no `descriptionTemplate` may be defined; persist the selected story identity to `selected_story_identity`. |
| Panel D | After Panel A when no story index exists, after Panel B when `edit_intent` is `Complete initial story buildout`, or after Panel C when `edit_intent` is `edit existing story file` | Ask `If you'd like to include any other files as workflow context please provide their full file paths below.`; collect optional large-text-area input into `additional_context`. |

Panel A must derive its dropdown from `Epics.index.json`, not from markdown parsing of `Epics.md`.

Panel A must reject or fail clearly if `Epics.index.json` contains no epics.

The module must not allow the user to type arbitrary epic identities in Panel A.

The existing Required Context panel that displays `Epics.index.json`, `Epics.md`, and `architecture.md` as friendly file-name hyperlinks must be removed because prerequisite file resolution already handles prerequisite-file confirmation and path persistence.

When Panel C completes, module logic must derive `selected_story_file_name` and `selected_story_status` from `selected_story_identity` and `stories_index`. The selected entry must be a primary story whose status is `draft` or `backlog`; `review`, `complete`, remediation, malformed, or otherwise unsupported entries must fail closed before Step 6 model-driven work.

After any required missing-story generation completes, runtime-owned `validate_story_index_entry` must validate the selected primary story entry using the derived `selected_story_file_name`, the selected `selected_story_identity`, the selected epic's `stories_index`, and the selected entry status. Runtime-owned `resolve_existing_project_artifact` must then resolve and persist `target_story` from `selected_story_identity` using `WorkflowArtifactFamily.Story` and status-specific selected-project subfolders: `["implementation", "drafts"]` for `draft` stories and `["implementation", "stories-backlog"]` for `backlog` stories.

Target-story setup must fail closed before Step 6 model-driven work if `selected_story_identity` is missing, `stories_index` is missing, the story index cannot be read or parsed including malformed or noncanonical story-index entries, the selected story identity is absent from the index, the selected story entry is not a supported draft or backlog primary story, or runtime-owned existing artifact resolution cannot resolve an existing selected-project story file.

The Step 1 deterministic `generate_story_files` route must use this exact workflow-step status definition:

- `title`: `Generate Missing Story Files`
- `pendingLabel`: `Generating missing story files`
- `successLabel`: `Generated missing story files`
- `failureLabel`: `Failed to generate missing story files`

`target_story` resolution must fail closed with these exact terminal error messages:

- Missing `selected_story_identity`: `PI Planning requires a selected story identity before resolving the target story.`
- Missing `stories_index`: `PI Planning requires a resolved stories_index path before resolving the target story.`
- Unreadable or malformed story index: `I could not read or parse the selected story index before resolving the target story.`
- Selected story identity absent from index: `The selected story was not found in the selected story index.`
- Unsupported status: `The selected story has an unsupported story status.`
- Existing artifact resolution failure: `The target story path does not exist.`

Step 1 must transition according to the completed form state:

- If no story index existed at workflow start, Panel B and Panel C must not render, Panel D must render after Panel A, and the workflow must transition to Step 2 after Panel D completes.
- If a story index existed at workflow start and `edit_intent` is `Complete initial story buildout`, Panel C must not render, Panel D must render after Panel B, and the workflow must transition to Step 2 after Panel D completes.
- If a story index existed at workflow start and `edit_intent` is `edit existing story file`, Panel C must render after Panel B, Panel D must render after Panel C, runtime/module logic must derive selected story metadata from the story index, generate any missing draft story files from the selected epic's story index by invoking the existing `generate_story_files` backend workflow tool through a workflow-owned deterministic route before Step 6, validate and resolve `target_story` through the existing runtime-owned story-index and artifact-resolution actions, and transition directly to Step 6 without entering Steps 2 through 5.

Step 1 must be runtime-driven and must expose an empty tool schema through an exported builder from `piPlanningToolSchemas.ts`.

## Step 2: Review Context

Step 2 must enter model-driven work through a `project_prompt` decision action.

Step 2 `buildPromptSource` must construct the Step 2 prompt from module-owned code by assembling named prompt sections. The prompt must preserve the source prompt verbiage and structure below, with source placeholders rendered from their corresponding workflow value keys.

The Step 2 base prompt must render this source prompt text:

```text
Your goal in this workflow is to break a single epic down into deliverable user stories. In this step, you will prepare by reading relevant context. Do not begin generating stories in this step.
You will be focusing on {target_epic} during this workflow.
*** Primary Context: ***
  {epics_index}
  {epics_document}
  {architecture_document}
```

The Step 2 prompt must include this label only when either `brainstorming_document` or `additional_context` is set to a non-empty value:

```text
*** Secondary Context ***
```

Inside that single secondary context block, the Step 2 prompt must include this line only when `brainstorming_document` is set to a non-empty value:

```text
  {brainstorming_document}
```

Inside that single secondary context block, the Step 2 prompt must include this line only when `additional_context` is set to a non-empty value:

```text
  {additional_context}
```

The Step 2 assessment prompt must render this source prompt text after the context sections:

```text
Assess the provided context for issues, guidance, scope, risks, or requirements relevant to {target_epic}, including:
- conflicts between the target epic and architecture decisions, constraints, components, data models, integrations, or deployment assumptions
- ambiguity in the epic objective, requirements, scope, or scope boundary
- missing architectural guidance needed to sequence or size stories
- missing dependencies, prerequisite capabilities, shared contracts, or validation expectations
- requirements in the epic that appear unsupported by the architecture document
- architecture decisions that imply work not captured in the target epic
- risks that would prevent coherent story breakdown, such as unclear ownership, incomplete external-system behavior, unresolved UX/data/API expectations, or contradictory constraints

Do not silently resolve conflicts or fill gaps with assumptions. If you identify material conflicts, ambiguities, or missing information, summarize them for the user as questions or decisions needed before story drafting can begin.

If issues are minor and do not block story drafting, note them briefly and explain to the user how you will account for them during story decomposition.

Only proceed after the user has clarified blocking issues or confirmed that the current context is sufficient. At that point call workflow_progress_request to unlock the next workflow step's instructions.
```

Absent optional context values must not render raw workflow placeholders, empty read instructions, or invented fallback text. The Step 2 prompt must not render `not provided` unless a later source document or requirements revision explicitly prescribes that exact AI-facing text.

Step 2 tool schema must expose exactly:

- `read_file`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`

Step 2 must not expose:

- `apply_patch`
- `set_workflow_values`
- `plan_story_artifacts`
- `generate_story_files`
- `attempt_completion`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

Step 2 must transition to Step 3 only on `workflow_progress_request_confirmed`. A denied progression request must return to the Step 2 project prompt.

## Step 3: Determine How Many Stories Are Needed

Step 3 must enter model-driven work through a `project_prompt` decision action.

Step 3 `buildPromptSource` must construct the Step 3 prompt from module-owned code by assembling named prompt sections. The prompt must preserve the source prompt verbiage and structure below, with source placeholders rendered from their corresponding workflow value keys.

When `stories_index` existed at workflow start, the Step 3 prompt must include this source prompt text before the shared Step 3 body:

```text
Review the existing story files for this epic in {drafts_folder}.
```

The Step 3 shared body prompt must render this source prompt text:

```text
Review provided context and existing runtime code/ tests to determine the full set of stories needed to support delivery of {target_epic}.

A story should represent one coherent, testable capability outcome. It may include backend, UI, prompt/schema, state, docs, and tests later, but only when those pieces are required to deliver the same outcome.

Split a story if:
- The objective contains multiple independent outcomes.
- One part can ship or be validated without the other.
- It crosses a major lifecycle boundary.
- It would need separate QA gates.
- Its requirements cannot be summarized clearly under one Objective.

Stories should not be created that are only file edits, test updates, cleanup chores, or technical layers unless that layer is itself the deliverable contract.

Once you've determined how many stories are needed, provide an update to the user explaining how many stories are needed, then call workflow_progress_request to unlock the next workflow step's instructions.
```

The Step 3 prompt must not render source-document conditional marker text such as `Shown only if` or `end conditional prompt block`.

Step 3 tool schema must expose exactly:

- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`

Step 3 must not expose:

- `apply_patch`
- `set_workflow_values`
- `plan_story_artifacts`
- `generate_story_files`
- `attempt_completion`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

Step 3 must transition to Step 4 only on `workflow_progress_request_confirmed`. A denied progression request must return to the Step 3 project prompt.

## Step 4: Generate An Updated Story Index

Step 4 must enter model-driven work through a `project_prompt` decision action.

Step 4 `buildPromptSource` must construct the Step 4 prompt from module-owned code by selecting the appropriate named branch prompt section and appending the shared story-index location section. The prompt must preserve the source prompt verbiage and structure below, with source placeholders rendered from their corresponding workflow value keys.

When `stories_index` existed at workflow start, the Step 4 prompt must include this source prompt text:

```text
This system uses a story index as the canonical indicator of which stories must exist for each epic.
Target epic: {target_epic}
Story Index: {stories_index}

Review the existing story index, then call plan_story_artifacts if additional stories are required beyond what the story index indicates. Use {epic_identity} when calling the tool. Indicate how many story files are needed to support delivery of {target_epic}. This tool will add additional stories to the existing story index when you indicate a number of stories greater than the index already contains. e.g. if a story index exists with three story files, and you call plan_story_artifacts and include story_count: 5, the tool will add 2 additional stories to the index so that it contains a total of 5 stories.

If the existing story index does not need additional stories added, use workflow_progress_request to unlock the next workflow step's instructions.
```

When `stories_index` did not exist at workflow start, the Step 4 prompt must include this source prompt text:

```text
This system uses a story index as the canonical indicator of which stories must exist for each epic. Generate the story index by calling plan_story_artifacts and including the total number of stories required in the story_count field. Use {epic_identity} when calling the tool.

Once you generate the story index, call set_workflow_values to set the generated file's full file path as the stories_index workflow session key.
```

After the selected Step 4 branch text, the Step 4 prompt must render this source prompt text:

```text
The story index file can be found in {implementation_folder}.
```

The Step 4 prompt must not render source-document conditional marker text such as `Shown only if` or `end conditional prompt block`.

Step 4 tool schema must expose exactly:

- `read_file`
- `plan_story_artifacts`
- `set_workflow_values`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`

Step 4 `set_workflow_values` exposure must be limited to `stories_index`.

Step 4 must not expose:

- `apply_patch`
- `generate_story_files`
- `attempt_completion`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

Step 4 must transition to Step 5 after successful story-index availability is confirmed. When `stories_index` already existed at workflow start, successful `plan_story_artifacts` may re-enter runtime and route directly to Step 5. When `stories_index` did not exist at workflow start, the AI must call `set_workflow_values` after `plan_story_artifacts` succeeds, and Step 4 must transition to Step 5 only after `stories_index` is persisted.

Step 4 must also transition to Step 5 after `workflow_progress_request_confirmed` when no additional stories are required. A denied progression request must return to the Step 4 project prompt.

## Step 5: Generate Story Files From The Story Index

Step 5 must enter model-driven work through a `project_prompt` decision action.

Step 5 `buildPromptSource` must construct the Step 5 prompt from module-owned code by selecting the appropriate named branch prompt section and appending the shared generated-story-file location section. The prompt must preserve the source prompt verbiage and structure below, with source placeholders rendered from their corresponding workflow value keys.

When `stories_index` existed at workflow start, the Step 5 prompt must include this source prompt text:

```text
Call generate_story_files to generate one templatized story for each story in {stories_index} for which a story file does not already exist. The tool automatically identifies stories with index entries for which there is not an existing story document and generates the files for you. Use {epic_identity} when calling the tool.
```

When `stories_index` did not exist at workflow start, the Step 5 prompt must include this source prompt text:

```text
Call generate_story_files to generate one templatized story file for each story in {stories_index}. Use {epic_identity} when calling the tool.
```

After the selected Step 5 branch text, the Step 5 prompt must render this source prompt text:

```text
Generated story files can be found in {drafts_folder}.
```

The Step 5 prompt must not render source-document conditional marker text such as `Shown only if` or `end conditional prompt block`.

Step 5 tool schema must expose exactly:

- `generate_story_files`
- `send_user_message`
- `ask_followup_question`

Step 5 must not expose:

- `read_file`
- `apply_patch`
- `set_workflow_values`
- `plan_story_artifacts`
- `attempt_completion`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

Step 5 must transition to Step 6 after successful `generate_story_files`.

## Step 6: Populate Story Files With Initial Details

Step 6 must enter model-driven work through a `project_prompt` decision action.

Step 6 `buildPromptSource` must construct the Step 6 prompt from module-owned code using `edit_intent`.

When `edit_intent` is `edit existing story file`, the Step 6 prompt must render only the edit-existing-story prompt variant. The prompt must preserve this exact source prompt text, with the listed placeholder labels populated from workflow values:

```text
You have been called inside a workflow designed to revise the initial sections of an implementation-ready story file in response to violations found during pre-implementation validation.
- Project: projectTitle
- Project Folder: projectFolderName
- Architecture Document: architecture_document
- Epics Documentation: epics_document
- Target Story: target_story

First, ask the user to share the feedback gathered during story validation. Then, review the following sections in the story document, identify the exact revisions needed to address the violations, and provide them to the user as a proposed story revision.
Once the user approves of your revisions, update the story document. Do not edit the tasks section of the story document.
Sections to review and revise based on validation findings:
- Scope
- Scope Boundary
- Requirements
- Objective
- Known Issues/ Risks/ Technical Debt

Once the approved revisions are saved to the story document, use attempt_completion to provide the user with final confirmation and end this workflow.
```

The edit-existing-story prompt variant must render:

- `projectTitle`
- `projectFolderName`
- `architecture_document`
- `epics_document`
- `target_story`

The edit-existing-story prompt variant must not include initial-buildout instructions, `drafts_folder`, `plan_story_artifacts`, `generate_story_files`, or the instruction to run `create_story` for each generated story.

When `edit_intent` is `Complete initial story buildout` or `edit_intent` is absent, the Step 6 prompt must render only the initial-buildout prompt variant. The prompt must preserve this exact source prompt text, with both `drafts_folder` placeholder labels populated from workflow values:

```text
Populate the generated story files in drafts_folder to set implementation sequence and story-specific details.

Sequence stories by dependency:
1. Contracts, state shape, and invariants.
2. Core runtime/backend behavior.
3. User-facing forms or lifecycle flows.
4. Prompt/tool/schema behavior.
5. Workflow/module consumers.
6. Cleanup, migration, and validation.

Read each story file with read_file, then use apply_patch to add story-specific content under these existing headings:

Scope:
Define what is in-scope

Scope Boundary:
Define items which are out of scope. Should not be overly exhaustive- focus on the things that could be mistakenly interpreted as in-scope to establish a firm scope boundary.

Requirements:
- List the source requirements this story satisfies.
- State the behavior, constraints, and validation expectations.
- Include relevant “must not” rules or invariants.
- Do not include implementation tasks, subtasks, file lists, or commands.

Objective:
As a [user/system/workflow/runtime actor]
I want [one capability outcome]
so that [the value or enabled downstream behavior]

Known Issues/ Risks/ Technical Debt
Include items relevant to the story

Do not create story files manually- use the appropriate plan_story_artifacts -> generate_story_files process if new stories or story files are needed at any point.

Once every story file in drafts_folder contains the required information, send an update to the user informing them that you've updated the epic's stories with initial story details. Ask the user to review and provide feedback. Continue refining the stories as needed based on user feedback.

Once the user is fully aligned with the story set and each story's content, use attempt_completion to provide a final workflow recap to the user, and remind them to run create_story for each generated story to generate story tasks before implementation.
```

The initial-buildout prompt variant must not include the edit-existing-story validation-feedback instructions or `target_story`.

When `edit_intent` is `edit existing story file`, Step 6 tool schema must expose exactly:

- `read_file`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `attempt_completion`

When `edit_intent` is `Complete initial story buildout` or `edit_intent` is absent, Step 6 tool schema must expose exactly:

- `list_files`
- `read_file`
- `apply_patch`
- `plan_story_artifacts`
- `generate_story_files`
- `send_user_message`
- `ask_followup_question`
- `attempt_completion`

Step 6 must not expose:

- `set_workflow_values`
- `workflow_progress_request`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

Step 6 must route `attempt_completion_succeeded` to `complete_workflow`.

## Tool Schema Ownership

The pi-planning module must have a canonical tool-schema file:

```text
src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningToolSchemas.ts
```

All model-visible workflow tool-schema builders must live there.

`piPlanningWorkflow.ts` must not define inline `ClineToolSpec` objects, inline tool arrays, local tool-schema builder bodies, or fallback empty schemas.

Each `WorkflowStepDefinition.buildToolSchema(...)` must delegate directly to a named export from `piPlanningToolSchemas.ts`.

The returned `readonly ClineToolSpec[]` is the complete model-visible workflow tool surface for that turn. It is not additive with default workflow tools.

## Testing Requirements

The pi-planning module must include module tests for:

- workflow identity and metadata
- persona fields
- workflow value inventory
- entry project value keys
- prerequisite declarations for `architecture_document`, `epics_document`, `epics_index`, and `brainstorming_document`
- runtime-owned prerequisite resolution routes
- implementation and drafts folder workflow-value persistence
- Step 1 workflow form Panel A target-epic dropdown population from `Epics.index.json`
- persistence of `target_epic`, `epic_identity`, `stories_index`, and `stories_index_existed_at_workflow_start` after Panel A submission
- absence of the removed Required Context panel from the Step 1 workflow form
- Step 1 workflow form Panel B edit-intent dropdown behavior, including exact allowed values `Complete initial story buildout` and `edit existing story file`
- Step 1 workflow form Panel C story-selection dropdown behavior, including JSON-derived options from the selected epic's story index file using `jsonOptionsSource` root `{ kind: "selected_project_root" }`, `sourcePathSegments` `["implementation", "epic-{workflow.epic_identity}-stories.index.json"]`, `itemsPath` `"stories"`, `valueProperty` `"story_identity"`, `labelTemplate` `"Story {story_identity}: {story_file_name}"`, and no `descriptionTemplate`
- Step 1 workflow form Panel D optional `additional_context` persistence
- Step 1 transition to Step 2 when no story index existed at workflow start
- Step 1 transition to Step 2 when `edit_intent` is `Complete initial story buildout`
- Step 1 selected story metadata derivation, deterministic generation of missing story files, draft/backlog `target_story` resolution through runtime-owned story-index validation and existing-artifact resolution, and direct transition to Step 6 when `edit_intent` is `edit existing story file`
- `target_story` setup fail-closed behavior for missing, malformed or noncanonical, unsupported-status, or unresolved selected story targets
- Step 2 prompt source output for optional-context states: brainstorming only, additional context only, both present, and neither present
- Step 2 prompt output excluding absent optional context lines and excluding the invented fallback text `not provided`
- Step 3 prompt source output, including the source-backed existing-story-index conditional prompt section, the source-backed shared prompt body, and exclusion of source-document conditional marker text
- Step 4 prompt source output for existing and missing story-index branches, including source-backed branch text, the shared story-index location line, and exclusion of source-document conditional marker text
- Step 5 prompt source output for existing and missing story-index branches, including source-backed branch text, the shared generated-story-file location line, and exclusion of source-document conditional marker text
- Step 6 prompt source output for the initial-buildout variant
- Step 6 prompt source output for the edit-existing-story variant
- Step 2 through Step 6 decision-tree route structure
- exact Step 1 through Step 5 tool-schema outputs
- exact Step 6 initial-buildout tool-schema output
- exact Step 6 edit-existing-story tool-schema output
- Step 4 `set_workflow_values` schema restriction to `stories_index`
- Step 4 transition after successful existing-index `plan_story_artifacts` re-entry and after new-index `stories_index` persistence
- Step 4 transition after confirmed no-additional-stories progression
- Step 5 transition after successful `generate_story_files`
- Step 6 completion through explicit `attempt_completion_succeeded` routing

Tests must verify that model-facing schemas do not expose backend-only runtime tools:

- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

Tests must verify `set_workflow_values` appears only in Step 4 and only for `stories_index`.

Runtime or handler tests must be added or updated for the foundational dependency that `plan_story_artifacts` sets the selected epic's `story-index-generated` value to `true` in `Epics.index.json`.

Prompt integration tests must prove:

- current step details appear in the input payload, not system instructions
- runtime-projected workflow schema is the exact native tool surface for each active pi-planning step
- response-tool guidance matches the projected schema
- `plan_story_artifacts` appears in Step 4 and Step 6 initial-buildout projection, and is absent from Step 6 edit-existing-story projection
- `generate_story_files` appears in Step 5 and Step 6 initial-buildout projection, and is absent from Step 6 edit-existing-story projection
- backend-only runtime tools such as `build_workflow_document` are not statically exposed

Validation must include:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningToolSchemas.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts src/core/task/tools/handlers/__tests__/PlanStoryArtifactsToolHandler.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
```

Add focused `rg` checks proving:

- `Epic-{E}-delivery-spec.md`, `epic-delivery-spec`, and `BuildEpicDeliverySpecToolHandler` do not appear in pi-planning module runtime code or requirements.
- `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, and `move_workflow_project_file` are not present in pi-planning model-facing tool schemas.
- `set_workflow_values` is absent from all pi-planning model-facing tool schemas except Step 4.
