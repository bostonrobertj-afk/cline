# Create Story Workflow Module Requirements

## Scope

Build the product-owned `create-story` workflow module using `/Users/robertboston/Documents/Cline/Workflows/create-story.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use the completed brainstorming, create-architecture, create-epics, and pi-planning module requirements only as structural references where they still align with the guide and current project requirements.

The create-story workflow must prepare an existing draft or backlog story file for implementation by reviewing project context, adding or revising implementation tasks and subtasks, validating the story handoff, and moving a draft story into the implementation backlog when the story becomes ready for the dev-story workflow.

The create-story workflow must not create canonical story identities, canonical story filenames, story index entries, story files, remediation story entries, or review findings documents. Those responsibilities belong to runtime-owned story planning/generation tools and review/remediation workflows.

Do not rely on the source markdown workflow file, legacy templates, BMAD files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

## Source Verbiage Fidelity

The create-story requirements must preserve the exact user-provided UI and AI prompt verbiage from `/Users/robertboston/Documents/Cline/Workflows/create-story.md`.

The module must not invent, paraphrase, summarize, or add UI-visible panel titles, `promptMarkdown`, field labels, action labels, static notice content, helper text, or AI prompt text.

If required UI-visible text or prompt text is missing from the source document, the module build must stop and request source-document clarification before requirements, action-plan, or runtime implementation work proceeds.

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

If the selected epic's `Epics.index.json` entry has `story-index-generated: false`, the workflow must render a user-facing message stating that the selected epic does not yet have a story index file and that the user must run the `pi-planning` workflow to generate it. The workflow must not proceed to story selection or model-driven work.

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
| `step-1` | 1 | `Gather Inputs` | Resolve required and optional prerequisites, render one same-session workflow form for Panels A through G, derive story paths and metadata, and transition only actionable draft or user-approved backlog stories to Step 2. |
| `step-2` | 2 | `Review Context & Ensure Project Alignment` | Model-driven context review step; progression requires `workflow_progress_request` confirmation. |
| `step-3` | 3 | `Author Tasks & Subtasks` | Model-driven story task/subtask authoring or revision step; progression requires `workflow_progress_request` confirmation after user review. |
| `step-4` | 4 | `Finalize & Validate Story Document` | Model-driven story validation step; final delivery uses `attempt_completion` and routes `attempt_completion_succeeded` through deterministic story finalization before completion. |

## Step 1: Gather Inputs

Step 1 must resolve prerequisite files before rendering module-owned input workflow forms.

Step 1 must invoke `resolve_prerequisite_files` for `architecture_document`, `epics_document`, `epics_index`, and `brainstorming_document`.

After prerequisite resolution succeeds or optional prerequisites are skipped, Step 1 must render one module-owned workflow form session containing Panels A through G. Step 1 must not split Panels A through G across separate workflow form sessions.

Panel A must render through the initial `render_workflow_form` action. Panels B through G must render through Phase 68 same-session `continue_workflow_form` actions after workflow runtime evaluates module-owned routes/actions.

Runtime/module logic must run between Step 1 panels when the next panel depends on selected inputs, deterministic backend checks, selected-project file checks, story index parsing, story file path derivation, remediation context derivation, or story status handling. Runtime/module logic must provide or replace the target panel data immediately before the continued panel renders.

Back navigation must use explicit `backDestinationPanelId` values. Runtime must not assume the workflow form can replay module-owned routes/actions to infer prior panel history.

Panel titles, `promptMarkdown`, field labels, action labels, allowed actions, and back destinations must match `/Users/robertboston/Documents/Cline/Workflows/create-story.md` exactly. The module must not add `static_notice` fields, helper fields, explanatory fields, or other UI-visible copy that is not present in the source document.

Panel A must be:

- `panelId`: module-owned Panel A id
- `title`: `Epic Selection`
- `promptMarkdown`: `Which epic are we focusing on during this workflow?`
- field kind: `dropdown`
- field label: `Target Epic`
- field required: `true`
- options: `JsonOptionsSource` with the list of epics derived from `planning/Epics.index.json`
- option label: `Epic {identity}: {title}`
- option descriptions: none

Panel A must derive its dropdown from `Epics.index.json`, not from markdown parsing of `Epics.md`. The selected value must persist `epic_identity`, and runtime/module logic must persist the selected epic as `target_epic`.

Panel A must reject or fail clearly if `Epics.index.json` contains no epics.

After Panel A, runtime/module logic must inspect the selected epic's canonical `story-index-generated` value from `Epics.index.json` and derive `stories_index` as `implementation/epic-{E}-stories.index.json`.

Panel B must be shown after Panel A when the selected epic's `Epics.index.json` entry has `story-index-generated: true`.

Panel B must be:

- `panelId`: module-owned Panel B id
- `title`: `Story Selection`
- `promptMarkdown`: `Which story should I focus on during this workflow?`
- field kind: `dropdown`
- field label: `Target Story`
- field required: `true`
- options: `JsonOptionsSource` with the list of all stories derived from the identified story index file
- option label: `Story {story_identity}`
- option descriptions: none

Panel C must be shown after Panel A when the selected epic's `Epics.index.json` entry has `story-index-generated: false`.

Panel C must be:

- `panelId`: module-owned Panel C id
- `title`: `Missing Story Index for Selected Epic`
- `promptMarkdown`: `The selected epic does not yet have a story index. Please end this workflow then run the pi-planning workflow in a new conversation to generate this epic's story index before running the create-story workflow.`
- fields: none
- allowed action: `submit`
- submit action label: `End Workflow`
- allowed action: `back`
- back action label: `Select Another Epic`
- `backDestinationPanelId`: Panel A

Panel C submit must route to `complete_workflow` without model-driven work, story-index mutation, or file movement.

After Panel B, runtime/module logic must persist `selected_story_identity`, `selected_story_file_name`, `selected_story_type`, `selected_story_status`, and `selected_story_file_generated` from the selected story index entry. Runtime/module logic must derive the selected story's status from the story index file.

If the selected story has `status: "draft"`, runtime/module logic must set `target_story` to the selected story file path, derive remediation context when applicable, and transition to Step 2.

If the selected story is a remediation story, runtime/module logic must locate the story on which the remediation story was based, persist that full file path to `parent_story`, locate the review findings document that led to the remediation story's creation, and persist that full file path to `findings_document`.

Panel D must be shown after Panel B when the selected story's index entry has `story_file_generated: false`.

Panel D must be:

- `panelId`: module-owned Panel D id
- `title`: `Missing Story File`
- `promptMarkdown`: `The selected story's document does not exist yet. Run the PI-planning workflow to generate the story document before selecting the story during the create-story workflow.`
- fields: none
- allowed action: `submit`
- submit action label: `End workflow`
- allowed action: `back`
- back action label: `Select Another Story`
- `backDestinationPanelId`: Panel B

Panel D submit must route to `complete_workflow` without model-driven work, story-index mutation, or file movement.

Panel E must be shown after Panel B when the selected story's status is `backlog`.

Panel E must be:

- `panelId`: module-owned Panel E id
- `title`: `Story Ready for Implementation`
- `promptMarkdown`: `The selected story appears to be ready for implementation.`
- field kind: `boolean`
- field label: `Would you like to revise this story's existing tasks?`
- field required: `true`
- field `allowedValueType`: `boolean`
- field `trueLabel`: `Yes`
- field `falseLabel`: `No`
- allowed action: `submit`
- submit action label: `Continue`
- allowed action: `back`
- back action label: `Select Another Story`
- `backDestinationPanelId`: Panel B

If the user answers yes on Panel E, runtime/module logic must persist `revise_backlog_story`, derive and persist `target_story`, derive remediation context when applicable, and transition to Step 2.

Panel F must be shown if the user answers no on Panel E.

Panel F must be:

- `panelId`: module-owned Panel F id
- `title`: `Run Dev-Story Workflow`
- `promptMarkdown`: `Since the selected story already has been populated with tasks and subtasks, your next step is to run the dev-story workflow and select this story as the implementation target.`
- fields: none
- allowed action: `submit`
- submit action label: `End Workflow`
- allowed action: `back`
- back action label: `Select Another Story`
- `backDestinationPanelId`: Panel B

Panel F submit must route to `complete_workflow` without model-driven work, story-index mutation, or file movement.

Panel G must be shown after Panel B when the selected story's status is `complete` or `review`.

Panel G must be:

- `panelId`: module-owned Panel G id
- `title`: `Story Already Implemented`
- `promptMarkdown`: `This story has already been implemented. New tasks should not be added to stories after implementation. If findings were documented during QA, the QA agent generated a remediation story to address those findings. Please go back and select the appropriate remediation story as the target for this workflow, or end this workflow.`
- fields: none
- allowed action: `submit`
- submit action label: `End Workflow`
- allowed action: `back`
- back action label: `Select Another Story`
- `backDestinationPanelId`: Panel B

Panel G submit must route to `complete_workflow` without model-driven work, story-index mutation, or file movement.

Step 1 must be runtime-driven and must expose an empty tool schema through an exported builder from `createStoryToolSchemas.ts`.

## Step 2: Review Context & Ensure Project Alignment

Step 2 must enter model-driven work through a `project_prompt` decision action.

Step 2 `buildPromptSource` must construct the Step 2 prompt from module-owned code. The Step 2 prompt must preserve the AI-facing text for the selected condition from `/Users/robertboston/Documents/Cline/Workflows/create-story.md`, with workflow value placeholders rendered through deterministic workflow value rendering. Source-document marker lines such as `*** Shown only if... ***` and `*** end conditional prompt block ***` are authoring guidance for prompt construction and must not appear in prompt constants, `promptTemplates`, or rendered AI-facing Step 2 prompt output.

When the selected story has `status: "backlog"` and `revise_backlog_story: true`, Step 2 must use this exact prompt variant:

```text
In this workflow you will be assisting the user in revising an existing story file.

The target story for this workflow is: target_story

Before doing anything else, ensure that the existing content within the target story file fully aligns with the project's foundational documents, including:
- Project Architecture: architecture_document
- Epics Document: epics_document
If you detect any conflict or misalignment, notify the user and work with them to identify the appropriate resolution. Only proceed once the story file's objective, scope, scope boundary, requirements, and Known Issues/ Risks/ Technical Debt sections fully align with the project's foundational documents.

Then, ask the user to explain the revisions they require. If they ask you for suggestions regarding task/subtask revisions, ground your response in the provided context and existing runtime code/tests.

Once you've reviewed context and ensured that the target story's existing non-task content aligns with the provided project documentation, call workflow_progress_request to unlock the next step's instructions.
```

When the selected story has `status: "draft"` and is not a remediation story, Step 2 must use this exact prompt variant:

```text
In this workflow, you'll be preparing a story file for implementation by adding tasks and subtasks.

The target story for this workflow is: target_story

Before beginning work on the story's tasks & subtasks, ensure that the existing content within the target story file fully aligns with the project's foundational documents, including:
- Project Architecture: architecture_document
- Epics Document: epics_document

If you detect any conflict or misalignment, notify the user and work with them to identify the appropriate resolution. Only proceed once the story file's objective, scope, scope boundary, requirements, and Known Issues/ Risks/ Technical Debt sections fully align with the project's foundational documents.

Once you've reviewed context and ensured that the target story's existing non-task content aligns with the provided project documentation, call workflow_progress_request to unlock the next step's instructions.
```

When the selected story has `status: "draft"` and is a remediation story, Step 2 must use this exact prompt variant:

```text
In this workflow, you'll be preparing a remediation story file for implementation by adding tasks and subtasks.

The target story for this workflow is: target_story

This story was generated due to QA findings after the following story was completed and reviewed:
Originating story: parent_story
The QA findings were documented in this file: findings_document

Before doing anything else, review the originating story and QA findings and ensure that the existing content in the target story document aligns with the QA findings. Then, assess the target story document vs the project's foundational documents, including:
- Project Architecture: architecture_document
- Epics Document: epics_document

If you detect any conflict or misalignment, notify the user and work with them to identify the appropriate resolution. Only proceed once the story file's objective, scope, scope boundary, requirements, and Known Issues/ Risks/ Technical Debt sections fully align with the project's foundational documents.

Once you've reviewed context and ensured that the target story's existing non-task content aligns with the provided project documentation, call workflow_progress_request to unlock the next step's instructions.
```

No fallback Step 2 prompt variant is allowed. If workflow state does not match one of the supported Step 2 prompt conditions, the workflow must fail clearly instead of projecting a generic prompt.

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

Step 3 `buildPromptSource` must construct the Step 3 prompt from module-owned code. The Step 3 prompt must preserve the AI-facing text for the selected condition from `/Users/robertboston/Documents/Cline/Workflows/create-story.md`, with workflow value placeholders rendered through deterministic workflow value rendering. Source-document marker lines such as `*** Shown only if... ***` and `*** end conditional prompt block ***` are authoring guidance for prompt construction and must not appear in prompt constants, `promptTemplates`, or rendered AI-facing Step 3 prompt output.

When the selected story has `status: "backlog"`, Step 3 must begin with this exact prompt variant:

```text
Review the existing tasks and subtasks in target_story and determine whether they meet the following criteria:
- They fully satisfy the story's requirements
- They respect the story's scope and scope boundary
- They support achievement of the story's objective
- They prescribe changes in a manner which complies with the story's general instructions
- Subtasks are scoped to a single revision in a single target file
- Each subtask includes specific allowed files
- Tasks & subtasks provide specific prescriptive revisions without deferring decision space to the implementing agent.
- Requirements do not ask for delivery of imports, helpers, placeholder scaffolding, future-step code, or partially-wired definitions unless the story will also wire them into legitimate runtime use.
- Prescribed tests provide adequate coverage of both happy paths and failure paths for all code revisions
- Tests are prescribed only for behavior, contracts, regression, and material risks required by the story document and project documentation
- Any tests built via the story's tasks use exact assertions for canonical machine-consumed outputs and stable contracts, including tool names/ schema shape, artifact file formats, and persisted metadata.
- Any tests built via the story's tasks use shape and invariant assertions for editable content: required fields exist, strings are non-empty, mappings are correct, and forbidden legacy values are absent.
- Any tests built via the story's tasks do not add static guards unless they protect an approved boundary, forbidden legacy dependency, or known regression risk.

Notify the user that you've reviwed the existing tasks & subtasks for coverage, consistency, and quality, surface any issues you've identified to them, and ask them what additional issues or concerns they'd like you to address.
```

When the selected story has `status: "draft"`, Step 3 must begin with this exact prompt variant:

```text
Review runtime code & tests and identify the full set of in-scope revisions needed to deliver the story's requirements and objective.
If the story requires touching existing artifacts or placeholders, trace the exact runtime resolution path end to end:
    config/source of truth
    resolver/helper
    handler/runtime consumer
    tests/docs that assert the convention
    For any plan that introduces a new artifact, tool, or schema entry, perform a sibling-pattern audit:
    registration
    executor wiring
    prompt/tool exposure
    approval/path policy
    tests
    snapshots/generated surfaces
    docs/reference surfaces if treated as canonical in-repo
Provide the user with the identified revision set and tell them your next step is to translate these revisions into implementation-ready tasks and subtasks.
Next, build the story's tasks & subtasks using the identified revision set.
```

Both Step 3 prompt variants must then append this exact shared prompt text:

```text
You must follow these rules when authoring story tasks & subtasks:
1. Verify solution quality and standards
   - Ensure the proposed code or fix is appropriate, elegant, and consistent with modern, industry-standard practices for the project's tech stack, including CLEAN architecture.
   - If you must deviate from best practices (e.g., due to constraints), clearly explain why and what the ideal pattern would be.
2. Prescribe deep, architectural fixes over surface workarounds
   - Check whether the issue can and should be solved at a deeper architectural layer (design, data flow, responsibilities) rather than with a shallow or hacky workaround.
   - If you choose a workaround for pragmatic reasons, explicitly label it as such and describe the deeper architectural fix that would be ideal.
3. Look for underlying design-pattern flaws
   - Examine whether the issue reveals deeper design or pattern problems (e.g., responsibilities mixed, poor separation of concerns, leaky abstractions).
   - If such problems exist, call them out explicitly and propose how they could be addressed, even if the full fix is out of scope for the immediate change.
4. Consider downstream and peripheral impact
   - Evaluate how the change may affect other modules, call sites, and features, including edge cases and lifecycle interactions. Search the codbase and read peripheral files if uncertain.
   - If the change is likely to cause downstream or peripheral issues, that is acceptable only if:
     a) You clearly identify and describe these risks, AND
     b) You propose follow-up steps or mitigations as part of the solution.
5. Avoid hardcoded values; prescribe integration with config/strings where appropriate
   - Do NOT introduce hardcoded strings or values when they represent configuration, thresholds, labels, messages, or anything reasonably likely to change.
   - Instead, integrate such values into the app’s configuration system when appropriate for user/admin/dev tweaking
   - All user-facing or UI strings MUST go into a strings.xml (or similar)
   - If you cannot follow this rule for some reason, explicitly state why.
6. Prescribe removal of cruft and failed-attempt remnants
   - Ensure that your changes do not leave behind obsolete code/imports, commented-out experiments, dead branches, or outdated patterns related to prior failed attempts.
   - Consider related/downstream modules that may now contain redundant or inconsistent code as a result of your change.
   - De-crufting should be treated as part of the fix: either perform it in your changes, or clearly specify what should be removed/refactored and where.
- When deleting or retiring a domain concept, delete its named gates, helper methods, variables, and tests rather than repointing them at another surviving concept.
7. Practice Good Code Hygiene by avoiding common bad habits:
    - "any" typing
    - val as SomeType
    - as any in tests
    - optional properties most of the time (explicitly model which combinations exist and which don't whenever possible)
    - one-letter generics
    - non-boolean boolean checks
    - bang bang operators (explicitly check for the condition instead)
    - != null (explicitly check for the condition instead)
    - not declaring function return types
    - abuse of type assertions (use them only in special scenarios where the type is clearly known, and give priority to type declarations, interfaces, or generics)
    - Failing to use utility types (use utility types such as partial, pick, omit, etc when appropriate)
    - forcing assertions when types don't match
    - not using enums to manage constants
    - not using generics to abstract duplicated code
    - not using type narrowing
    - not explicitly defining generics parameters
    - semantic aliasing, where a variable/function/type with an old domain meaning is reassigned to a new generic or unrelated concept instead of being deleted
    - stale domain naming after behavior migration; names must describe the current approved responsibility, not the historical source of the code
    - compatibility remaps that preserve retired concepts by pointing them at surviving generic behavior unless the upstream requirements explicitly approve that remap
    - boolean aliases whose name does not exactly match the condition they represent; use the existing boolean directly or introduce a correctly named concept only if the architecture requires it
    - retaining obsolete gates/seams/flags after their original behavior is removed
8. Do not introduce architecture in the action plan that is not prescribed in an upstream document.
    - The action plan must not introduce architectural concepts or solutions which are not backed by existing project documentation. If something is not explicitly prescribed, you must gain user alignment and approval before including it in the action plan.
    - If you determine that additional or different architecture is necessary while authoring the action plan, you must stop and inform the user so that the appropriate revisions can be made to upstream documents first.
9. Avoid in-plan churn. Do not prescribe code in one task/ subtask only to replace the prescribed code in a subsequent task/ subtask. Identify the final shape of every line being prescribed, and require the dev agent to implement it that way in one task / subtask.
10. The action plan must end in a repo-valid intermediate state that passes the same static gates required before commit, including formatting, lint, typecheck and any focused tests prescribed for that phase.
    - Do not prescribe unused imports, unused helpers, placeholder scaffolding, future-step code, or partially wired definitions unless the story's tasks/ subtasks also wire them into legitimate runtime use.
11. Tasks & Subtasks must be on their own lines starting with "[ ]" so that dev agents can mark completion as they progress through the action plan.
    - tasks & subtasks must have numerical IDs, with subtasks inheriting the parent task ID, e.g. task 1, subtasks 1.1, 1.2.
    - Subtasks must prescribe exact line-level revisions with target file indicated.
    - Subtasks must never prescribe more than ONE required revision
12. NEVER prescribe retyping, casting, renaming, or otherwise mutating existing capabilities/functionality within a task or subtask unless you have surfaced the proposed change as a single topic to the user and gained their approval.

If at any point you cannot satisfy one or more of these rules (for example, due to missing context or constraints in the existing architecture), you MUST:
- Explicitly state which rule(s) you cannot fully satisfy, and why.
- Propose the best available compromise, and outline what a more ideal long-term fix would look like.

After authoring the tasks & subtasks, reach each line of the story and seek out any inconsistencies or conflicts. During this review, assess each task and subtask for internal dependencies, and ensure that no task or subtask is dependent upon a task or subtask which is sequenced after it in the story. Resolve them appropriately, asking the user for input if necessary, before indicating that the tasks & subtasks are complete.

*** User Review & Feedback ***
Provide the user with the full path for target_story and ask them to review the tasks / subtasks section and provide feedback. Refine based on the user's feedback as needed. Once the user is satisfied with the tasks / subtasks section, unlock the next step's instructions by calling workflow_progress_request.
```

No fallback Step 3 prompt variant is allowed. If workflow state does not match one of the supported Step 3 prompt conditions, the workflow must fail clearly instead of projecting a generic prompt.

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

Step 4 `buildPromptSource` must construct the Step 4 prompt from module-owned code. The Step 4 prompt must preserve this exact prompt text from `/Users/robertboston/Documents/Cline/Workflows/create-story.md`, with workflow value placeholders rendered through deterministic workflow value rendering:

```text
Verify that target_story is complete, correctly formatted, internally consistent, and safe to hand off for implementation.

Validate the story as a complete implementation handoff:
- every acceptance criterion is covered by one or more tasks
- every task maps to a real part of the approved story scope
- task order is executable and non-conflicting
- no two tasks prescribe contradictory file changes or incompatible invariants
- every planned code change has corresponding test-maintenance coverage where needed
- stale assertions, mocks, snapshots, validators, and type contracts are accounted for when affected

If you detect ambiguity, contradiction, or missing coverage, correct it. If correction requires a new decision, stop and ask the user.

When validation passes, use attempt_completion to notify the user that the story is complete and ready for implementation.
```

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
- one Step 1 workflow form session containing Panels A through G
- target-epic dropdown population from `Epics.index.json`
- persistence of `target_epic` and `epic_identity`
- derived `stories_index` path after epic selection
- Panel A to Panel B same-session runtime-routed continuation when the selected epic has `story-index-generated: true`
- Panel A to Panel C same-session runtime-routed continuation when the selected epic has `story-index-generated: false`
- Panel C end-workflow behavior and back navigation to Panel A
- target-story dropdown population from the selected epic's story index
- persistence of selected story metadata from the story index
- Panel B to Panel D same-session runtime-routed continuation when `story_file_generated` is `false`
- Panel D end-workflow behavior and back navigation to Panel B
- draft story path derivation under `implementation/drafts`
- backlog story path derivation under `implementation/stories-backlog`
- Panel B to Step 2 transition for actionable draft stories
- Panel B to Panel E same-session runtime-routed continuation for backlog stories
- Panel E yes/no branching, including yes routing to Step 2 and no routing to Panel F
- Panel F end-workflow behavior and back navigation to Panel B
- Panel B to Panel G same-session runtime-routed continuation for `review` and `complete` stories
- Panel G end-workflow behavior and back navigation to Panel B
- exact Panel A through Panel G titles, `promptMarkdown`, field labels, action labels, allowed actions, and back destinations
- exact Panel A and Panel B `jsonOptionsSource` option label templates, with no option descriptions
- absence of unauthorized `static_notice` fields, helper fields, explanatory fields, or other source-unprescribed UI-visible copy in Panels A through G
- remediation story parent-story and findings-document derivation
- invalid remediation project-state failure for missing parent entry, missing parent file, or missing findings document
- Step 1 transition to Step 2 only for actionable draft stories or user-approved backlog revisions
- Step 2 prompt variant selection for backlog revision, primary draft story, and remediation draft story conditions, including deterministic rendering of required workflow-value placeholders, absence of known unauthorized legacy or invented prompt fragments, and exclusion of source-document authoring markers such as `*** Shown only if` and `*** end conditional prompt block ***`
- Step 2 unsupported prompt conditions fail clearly instead of falling back to a generic prompt
- Step 3 prompt variant selection for backlog revision and draft story conditions, including deterministic rendering of required workflow-value placeholders, absence of known unauthorized legacy or invented prompt fragments, and exclusion of source-document authoring markers such as `*** Shown only if` and `*** end conditional prompt block ***`
- Step 3 unsupported prompt conditions fail clearly instead of falling back to a generic prompt
- Step 4 prompt construction, including deterministic rendering of required workflow-value placeholders and absence of known unauthorized legacy or invented prompt fragments
- Step 2 through Step 4 decision-tree route structure
- exact Step 1 through Step 4 tool-schema outputs
- Step 2 and Step 3 progression through explicit `workflow_progress_request_confirmed` routing
- Step 4 finalization through explicit `attempt_completion_succeeded` routing
- draft story finalization status update and move to `implementation/stories-backlog`
- backlog story finalization without moving the story file out of `implementation/stories-backlog`

Prompt tests must not assert complete prompt strings or duplicate full user-authored prompt bodies as test-owned expected values. The implementation remains required to preserve the exact source-document prompt wording prescribed in this requirements document, but tests must verify prompt behavior through variant selection, required workflow-value interpolation, unsupported-state failures, routing/tool exposure contracts, and absence of unauthorized legacy or invented wording.

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
