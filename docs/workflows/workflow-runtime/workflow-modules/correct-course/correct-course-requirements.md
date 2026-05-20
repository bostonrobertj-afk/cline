# Correct Course Workflow Module Requirements

## Scope

Build the product-owned `correct-course` workflow module using `docs/workflows/workflow-runtime/workflow-modules/correct-course/correct-course.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use completed workflow module requirements and implementations only as structural references where they still align with the guide, current project requirements, and the correct-course source instructions.

The correct-course workflow builds a project change management plan in response to a defect, missing documentation, or need for additional scope. It collects issue/source context from the user, creates a project-numbered change management plan in the selected project's `planning` folder, initializes the plan with required headings and the provided issue description, then projects model-driven instructions for the AI agent to assess affected project documents and complete the change management plan.

Do not rely on the source markdown workflow file, legacy BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, the legacy contextual tool matrix, or legacy workflow-step-resolution registries at runtime. Source and legacy files are migration references only.

## Source Verbiage Fidelity

The correct-course module must preserve the exact user-provided UI and AI prompt verbiage from `docs/workflows/workflow-runtime/workflow-modules/correct-course/correct-course.md` where that source provides text.

The module must not invent, paraphrase, summarize, or add UI-visible panel titles, `promptMarkdown`, field labels, action labels, static notice content, helper text, descriptions, button labels, terminal-error text, or AI prompt text unless this requirements document is revised to prescribe the exact text.

For existing shared model-facing tools, the module must use the existing shared/default `ClineToolSpec` objects and their existing model-facing descriptions, parameter descriptions, and parameter instructions. The module must not author, copy with edits, paraphrase, or wrap existing tool descriptions in module-specific prose.

If required UI-visible text, prompt text, terminal-error text, or custom model-facing tool-schema text is missing from the source document or from an existing shared repo tool spec, the module build must stop and request source-document or requirements clarification before action-plan or runtime implementation work proceeds.

## Workflow Identity

- `name`: `correct-course`
- `slashCommandName`: `correct-course`
- `useSkillName`: `correct-course`
- `displayName`: `correct course`
- `description`: `In this workflow, the agent builds a change management plan in response to a defect, missing documentation, or need for additional scope.`
- `persona`: `scrum-master`
- `projectSubfolder`: `planning`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above as the workflow overview text for user-facing workflow activation.

The module must not register `correct-course.md` or any `.md` suffixed alias as a workflow name, slash command, or use-skill name.

## Persona

The correct-course module must use the persona prescribed by `docs/workflows/workflow-runtime/workflow-modules/correct-course/correct-course.md`.

The module must copy the persona into module-owned constants and must not read the correct-course source document at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition` for the mapped `scrum-master` persona.

- `name`: `Bob`
- `role`: `Scrum Master`
- `identity`: `aligning project documentation to enable low-risk implementation.`
- `communicationStyle`: `crisp, checklist-driven, and ambiguity-free.`
- `capabilities`: [`project management`, `technical writing`, `project architecture`]
- `principles`: [`cohesive and coherent documentation is the most important part of software development.`]

## Runtime-Owned Values

The correct-course module must define its workflow-owned value contract according to the project requirements for module-owned workflow values.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- `architecture_document`, the absolute path to the selected project's `planning/architecture.md`
- `issue_description`, the user-provided issue description from Panel A
- `epic_source_indicator`, the user-provided `yes` or `no` response from Panel B
- `epic_source_identifier`, the selected epic identity from Panel C or the exact fallback value `not found` from Panel F
- `epics_document`, the absolute path to the selected project's `planning/Epics.md`, the exact fallback value `not found` from Panel F, or the exact fallback value `missing` from Panel H
- `epics_document_artifact_identity`, the internal runtime artifact identity value `epics` used only to resolve the selected project's singleton `planning/Epics.md` through `resolve_existing_project_artifact`; this value must not be rendered in prompts, collected from workflow forms, or exposed to the AI agent
- `story_source_indicator`, the user-provided `yes` or `no` response from Panel D or the exact fallback value `not found` from Panel G
- `story_source_identifier`, the selected story identity from Panel E
- `output_document`, the absolute path to the generated change management plan
- `output_document_artifact_family`, the internal artifact-family output key written when `output_document` is allocated
- `output_document_artifact_identity`, the internal artifact-identity output key written when `output_document` is allocated
- `output_document_artifact_filename`, the internal artifact-filename output key written when `output_document` is allocated
- `output_document_artifact_relative_path`, the internal artifact-relative-path output key written when `output_document` is allocated

Any workflow form field whose submitted value must survive beyond form-local state must declare a durable workflow-value destination and persist through the runtime value seam.

Workflow form fields used only to route missing-index or missing-file panels must remain form-local and must not create additional workflow values unless this requirements document is revised to name the value key and persistence behavior. The approved form-local missing-source choice field keys are `missing_epics_index_choice`, `missing_story_index_choice`, and `missing_epics_file_choice`.

Workflow values must remain JSON-safe and preserve type/shape. Prompt builders may render workflow values only through deterministic rendering. Runtime or tool code requiring string paths, identities, filenames, statuses, arrays, booleans, or object values must validate the expected type and shape.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state.

## AI-Writable Workflow Values

The correct-course module must not define AI-writable workflow values.

No correct-course step may expose `set_workflow_values`. Issue/source values are collected through workflow forms, `architecture_document` is selected through runtime-owned prerequisite resolution, `epics_document` is resolved through runtime-owned selected-project file checks, `output_document` and artifact metadata are persisted through runtime-owned artifact allocation, and initial document content is written through runtime-owned document generation.

## Runtime Artifact Family And Output Document

The correct-course workflow must use the existing runtime-owned `WorkflowArtifactFamily.ChangeManagementPlan` artifact family.

The artifact family contract is:

| Artifact family | Allocation mode | Identity requirement | Numbering scope | Filename pattern | Project folder | Content kind |
| --- | --- | --- | --- | --- | --- | --- |
| `change_management_plan` | `new_numbered` | `none` | `project_numbered` | `change-management-plan-{C}.md` | `planning` | `markdown` |

The correct-course workflow owns creation of one `change_management_plan` artifact per run.

The module artifact definition for the change management plan must use:

- `id`: `change_management_plan`
- `family`: `WorkflowArtifactFamily.ChangeManagementPlan`
- `intentMode`: `new`
- `parentIdentitySource`: `undefined`
- `targetIdentitySource`: `undefined`
- standalone output value keys
- `outputValueKeys.artifactAbsolutePath`: `output_document`

The module must route through `allocate_artifact` / runtime-owned `create_workflow_artifact`. It must not compute `{C}`, scan files, parse filenames, construct artifact paths, or write the empty artifact itself.

After artifact allocation succeeds, the module must route through runtime-owned `build_workflow_document` to populate the initial change management plan document.

The initial change management plan document must contain these headings in this exact order:

```text
# Identified Issue

# Issue Source

# Impact Assessment

# Architecture Modifications

# Epic Modifications

# Story Modifications

# Change Management Implementation
```

The initial document builder must place the rendered `issue_description` value under the `# Identified Issue` heading. The initial document builder must not add unapproved placeholder copy under any other heading.

After the file is generated and populated, `output_document` must contain the generated change management plan absolute path.

## Required Prerequisite Files

For user-facing activation, the correct-course workflow requires one selected-project prerequisite file before Step 1 issue/source collection, output artifact allocation, initial document generation, model-driven work, or completion can proceed:

| Prerequisite id | Requirement | Producing workflow | Project subfolder | Match | Workflow value key |
| --- | --- | --- | --- | --- | --- |
| `architecture_document` | required | `create-architecture` | `planning` | exact filename `architecture.md` | `architecture_document` |

The prerequisite must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action.

Prerequisite selection must not be implemented as a module-owned `selectorDiscovery` workflow form, and it must not mutate shared project-selection behavior.

Runtime-owned prerequisite discovery must resolve only under the selected project root and must target the selected project's `planning` folder. It must not accept absolute paths, parent-directory escapes, or files outside the selected project.

If the required architecture document is not discoverable or is rejected by the user, the workflow must use the existing runtime-owned required-prerequisite failure behavior and must not proceed to issue/source collection, output artifact allocation, initial document generation, model-driven work, or completion.

The prerequisite declaration must use `outputDocumentReference: "none"` because the initial correct-course document renders the architecture path only in the Step 3 prompt, not in the initial output document.

## Project Index And Existing Artifact Inputs

The correct-course workflow uses selected-project JSON index files only to populate workflow-form dropdown options and derive selected source context. The AI agent must not parse `Epics.index.json`, `epic-{E}-stories.index.json`, or `Epics.md` to determine canonical source selections during Step 1.

Panel C epic options must be derived from the selected project's `planning/Epics.index.json` through runtime-owned JSON-backed workflow-form options.

Panel C must use exact-file JSON option mode with:

- `root.kind`: `selected_project_root`
- `sourcePathSegments`: [`planning`, `Epics.index.json`]
- `itemsPath`: `epics`
- `valueProperty`: `identity`
- `labelTemplate`: `Epic {identity}: {title}`
- option descriptions: none

The Panel C label template is the existing repo pattern used for epic-selection dropdowns. The correct-course module must not invent a different epic option label or description.

If the selected project's `planning/Epics.index.json` file is unavailable before Panel C renders, the workflow must render Panel F instead of Panel C.

After Panel C submission, runtime/module logic may perform a missing-file routing check for selected-project `planning/Epics.md` only to choose between Panel H and runtime artifact resolution. When `planning/Epics.md` appears present, the workflow must persist `epics_document_artifact_identity` as `epics`, then resolve `epics_document` through runtime-owned `resolve_existing_project_artifact` using `WorkflowArtifactFamily.Epics`, `artifactIdentityWorkflowValueKey: "epics_document_artifact_identity"`, `projectSubfolderSegments: ["planning"]`, and `outputWorkflowValueKey: "epics_document"`.

If runtime-owned `resolve_existing_project_artifact` fails to resolve `planning/Epics.md` as a file inside the selected project or rejects it through workspace path-policy validation, the workflow must route to `terminal_error` with this exact message: `The selected project's Epics.md file could not be resolved. Please ensure planning/Epics.md exists as a file inside the selected project's planning folder and is permitted by workspace path policy before retrying this workflow.`

If `planning/Epics.md` is missing after an epic is selected, the workflow must render Panel H.

Panel E story options must be derived from every story index file discovered in the selected project's `implementation` folder through runtime-owned JSON-backed workflow-form discovered-files mode.

Panel E must use discovered-files JSON option mode with:

- `root.kind`: `selected_project_root`
- `sourceFileDiscovery.targetPathSegments`: [`implementation`]
- `sourceFileDiscovery.namingPattern`: `^epic-\d+-stories\.index\.json$`
- `sourceFileDiscovery.immediateChildrenOnly`: `true`
- `sourceFileDiscovery.sort`: `alpha_asc`
- `itemsPath`: `stories`
- `valueProperty`: `story_identity`
- `labelTemplate`: `Story {story_identity}: {story_file_name}`
- option descriptions: none

The Panel E label template is the existing repo pattern used for story-selection dropdowns. The correct-course module must not invent a different story option label or description.

If no story index files are available in the selected project's `implementation` folder before Panel E renders, the workflow must render Panel G instead of Panel E.

If JSON-backed option resolution fails because an existing index file is malformed, outside the selected project root, blocked by workspace path policy, has a malformed `itemsPath`, has malformed entries, has empty option values, has unresolved templates, or produces duplicate option values, the workflow must use the existing runtime-owned JSON-backed option failure behavior. The correct-course module must not introduce workflow-specific parsing or workflow-specific malformed-index error text unless this requirements document is revised to prescribe exact approved text.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the correct-course workflow using the module-owned description.

The correct-course workflow is not approved for child/subagent activation. The module must not declare child inheritance rules.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`
- `stepNumber` must define the runtime step order
- `checklistLabel` must define the focus-chain task text projected to the UI
- `buildPromptSource` must provide module-owned prompt text
- `buildToolSchema` must provide module-owned per-step tool schema
- `decisionTree` must own step progression, form rendering, deterministic actions, transitions, model handoff, and completion behavior
- Any workflow-form or deterministic operation selected by a step must follow the workflow-runtime form and action contracts
- Final-step completion must use workflow-runtime completion and teardown behavior

The module must define these three steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Identify the Issue` | Runtime-driven issue/source collection step. Resolve the required architecture prerequisite, render the Step 1 workflow form, persist approved issue/source values, resolve optional project source documents when applicable, and transition to Step 2 after source collection is complete. |
| `step-2` | 2 | `Generate Change Management Document` | Runtime-driven artifact setup step. Allocate `change_management_plan`, populate the initial document through `build_workflow_document`, persist `output_document`, and transition to Step 3 after the document is ready. |
| `step-3` | 3 | `Assess Issue & Build Plan` | Model-driven change-management planning step. Project the source-prescribed prompt, expose only the approved existing shared tools for project document review, output document editing, user communication, and final completion, and complete the workflow after successful `attempt_completion`. |

## Step 1: Identify the Issue

Step 1 is runtime-driven and must expose an empty model-visible tool schema through a named export from `correctCourseToolSchemas.ts`.

Step 1 must resolve the `architecture_document` prerequisite before rendering the module-owned input workflow form.

After prerequisite resolution succeeds, Step 1 must render one module-owned workflow form session containing Panels A through H. Step 1 must not split Panels A through H across separate workflow form sessions.

Panel A must render through the initial `render_workflow_form` action. Panel A submit may use a form-local transition to Panel B. Panel B submit must be runtime-routed so the workflow can choose Panel C, Panel D, or Panel F after applying latest submitted values and selected-project file checks. Panel C submit must be runtime-routed so the workflow can resolve `planning/Epics.md` and choose Step 2 or Panel H. Panel D submit must be runtime-routed so the workflow can choose Panel E, Panel G, or Step 2 after applying latest submitted values and selected-project story-index discovery. Panels F, G, and H submit must be runtime-routed so the workflow can choose Step 2 or `complete_workflow` from the submitted form-local choice. Panel E submit must complete the Step 1 workflow form and transition to Step 2 after canonical next-action re-evaluation.

Runtime/module logic must run between Step 1 panels when the next panel depends on selected inputs, selected-project file checks, JSON index discovery, JSON-backed option availability, or Epics.md path resolution. Runtime/module logic must provide or replace the target panel data immediately before the continued panel renders.

Back navigation must use explicit `backDestinationPanelId` values for runtime-routed panels. Runtime must not assume the workflow form can replay module-owned routes/actions to infer prior panel history.

Panel titles, `promptMarkdown`, field labels, action labels, allowed actions, and back destinations must match the source document exactly. The module must not add `static_notice` fields, helper fields, explanatory fields, or other UI-visible copy that is not present in the source document.

Panel A must be:

- `panelId`: module-owned Panel A id
- `title`: `Describe the Problem`
- `promptMarkdown`: `Please provide a detailed description of the issue.`
- field kind: `large_text`
- field key: `issue_description`
- field label: `Project Issue Description`
- field required: `true`
- field persists to workflow value `issue_description`
- allowed actions: `submit`, `back`
- action labels: `submit`, `back`

Panel B must be:

- `panelId`: module-owned Panel B id
- `title`: `Check Epic Source`
- `promptMarkdown`: `Was this issue discovered while building out a specific epic?`
- field kind: `radio_group`
- field key: `epic_source_indicator`
- field label: `response`
- field options: `yes`, `no`
- field required: `true`
- field persists to workflow value `epic_source_indicator`
- allowed actions: `submit`, `back`
- action labels: `submit`, `back`
- previous panel: Panel A

Panel B submission behavior must be:

- `yes`: check for selected-project `planning/Epics.index.json`; render Panel C when available; render Panel F when unavailable.
- `no`: clear `epic_source_identifier` and `epics_document`, then render Panel D.

Panel C must be:

- `panelId`: module-owned Panel C id
- `title`: `Identify Originating Epic`
- `promptMarkdown`: `Which epic?`
- field kind: `dropdown`
- field key: `epic_source_identifier`
- field label: `epic selection`
- field required: `true`
- field options: JSON-backed options from selected-project `planning/Epics.index.json` using the `Project Index And Existing Artifact Inputs` contract above
- field persists to workflow value `epic_source_identifier`
- allowed actions: `submit`, `back`
- action labels: `submit`, `back`
- previous panel: Panel B

After Panel C submission, the workflow must resolve selected-project `planning/Epics.md`:

- if `planning/Epics.md` exists and passes runtime selected-project containment and workspace path-policy checks, persist its absolute path as `epics_document` and proceed to Step 2.
- if `planning/Epics.md` is missing, render Panel H.

Panel D must be:

- `panelId`: module-owned Panel D id
- `title`: `Check Story Source`
- `promptMarkdown`: `Was this issue revealed while building, implementing, or reviewing a specific story?`
- field kind: `radio_group`
- field key: `story_source_indicator`
- field label: `response`
- field options: `yes`, `no`
- field required: `true`
- field persists to workflow value `story_source_indicator`
- allowed actions: `submit`, `back`
- action labels: `submit`, `back`
- previous panel: Panel B

Panel D submission behavior must be:

- `yes`: check for selected-project `implementation/epic-{E}-stories.index.json` files; render Panel E when one or more story index files are available; render Panel G when none are available.
- `no`: clear `story_source_identifier`, then proceed to Step 2.

Panel E must be:

- `panelId`: module-owned Panel E id
- `title`: `Identify Originating Story`
- `promptMarkdown`: `Which story?`
- field kind: `dropdown`
- field key: `story_source_identifier`
- field label: `story selection`
- field required: `true`
- field options: JSON-backed options from selected-project story index files using the `Project Index And Existing Artifact Inputs` contract above
- field persists to workflow value `story_source_identifier`
- allowed actions: `submit`, `back`
- action labels: `submit`, `back`
- previous panel: Panel D

After Panel E submission, the workflow must proceed to Step 2.

Panel F must be:

- `panelId`: module-owned Panel F id
- `title`: `Missing Epics Index`
- `promptMarkdown`: `There is no epics index file for this project. Proceed anyway?`
- field kind: `radio_group`
- field key: `missing_epics_index_choice`
- field label: `select one`
- field options: `continue`, `end workflow`
- field required: `true`
- field must remain form-local and must not persist to workflow values
- allowed actions: `submit`, `back`
- action labels: `submit`, `back`
- previous panel: Panel B

Panel F submission behavior must be:

- `continue`: persist `epic_source_identifier` as `not found`, persist `epics_document` as `not found`, then proceed to Step 2.
- `end workflow`: end the workflow through `complete_workflow`.

Panel G must be:

- `panelId`: module-owned Panel G id
- `title`: `Missing Story Index`
- `promptMarkdown`: `There are no story index files for this project. Proceed anyway?`
- field kind: `radio_group`
- field key: `missing_story_index_choice`
- field label: `select one`
- field options: `continue`, `end workflow`
- field required: `true`
- field must remain form-local and must not persist to workflow values
- allowed actions: `submit`, `back`
- action labels: `submit`, `back`
- previous panel: Panel D

Panel G submission behavior must be:

- `continue`: persist `story_source_indicator` as `not found`, then proceed to Step 2.
- `end workflow`: end the workflow through `complete_workflow`.

Panel H must be:

- `panelId`: module-owned Panel H id
- `title`: `Missing Epics File`
- `promptMarkdown`: `The Epics.md file for the selected epic is missing. Proceed Anyway?`
- field kind: `radio_group`
- field key: `missing_epics_file_choice`
- field label: `select one`
- field options: `continue`, `end workflow`
- field required: `true`
- field must remain form-local and must not persist to workflow values
- allowed actions: `submit`, `back`
- action labels: `submit`, `back`
- previous panel: Panel C

Panel H submission behavior must be:

- `continue`: persist `epics_document` as `missing`, then proceed to Step 2.
- `end workflow`: end the workflow through `complete_workflow`.

Step 1 must use stale-value clearing so upstream response changes cannot leave invalid downstream values:

- changing Panel B to `no` must clear `epic_source_identifier` and `epics_document`
- changing Panel B to `yes` must clear `story_source_indicator` and `story_source_identifier`
- changing Panel D to `no` must clear `story_source_identifier`

Step 1 must not project model-driven work, must not expose file editing tools, and must not mutate the filesystem.

## Step 2: Generate Change Management Document

Step 2 is runtime-driven and must expose an empty model-visible tool schema through a named export from `correctCourseToolSchemas.ts`.

Step 2 must allocate a `change_management_plan` artifact through the runtime-owned `allocate_artifact` decision action.

After artifact allocation succeeds, Step 2 must populate the generated artifact through the runtime-owned `build_workflow_document` decision action using the initial document contract above.

Step 2 must transition to Step 3 only after `output_document` and its artifact metadata keys are persisted and the initial document build succeeds.

If artifact allocation or initial document build fails, the workflow must route to terminal failure with the concrete backend/runtime failure reason. If the backend/runtime failure reason is absent, the module may use the existing generic fallback `Tool-backed operation failed.`.

Step 2 must not project model-driven work and must not expose `create_workflow_artifact` or `build_workflow_document` in model-facing tool schemas.

## Step 3: Assess Issue & Build Plan

Step 3 is model-driven and must enter model-driven work through a `project_prompt` decision action.

Step 3 `buildPromptSource` must construct the Step 3 prompt from module-owned code. The Step 3 prompt must preserve this exact source prompt text, with workflow values rendered by runtime prompt rendering:

```text
You are a Scrum Master navigating change management. Analyze the triggering issue, assess impact across project artifacts, and produce an actionable change management plan with clear handoff. You will document your plan in the provided change management plan. You should actively engage the user while carrying out the steps prescribed below to ensure that they are kept abreast of your progress and are able to provide input.

- Project: projectTitle
- Project Folder: projectFolderName
- Architecture Document: architecture_document
- Change Management Plan: output_document

The project folder contains all existing documentation for this project, which can include:
- discovery documents
- planning documents, including previous change management, architecture, epics, and epics index files
- implementation documents, including story files and story index files
- review files including documented findings from implemented stories which have been assessed via the code review workflow

*** conditional: only shown if epic_source_indicator = yes ***
Discovered while authoring a specific epic: epic_source_indicator
Epic: epic_source_identifier
Epic Document: epics_document
*** end conditional ***
*** conditional: only shown if story_source_indicator = yes ***
Discovered while authoring, implementing, or reviewing a specific story: story_source_indicator
Story: story_source_identifier
*** end conditional ***

Define the core problem and assign it to one of the following categories:
- technical limitation discovered during implementation
- new requirement emerged
- requirements mistranslated in story document
- strategic pivot desired
- failed approach requires a solution

- Assess initial impact and gather supporting evidence including concrete examples, error messages, user feedback, or technical constraints. Record your findings under the "Impact Assessment" heading in output_document and note the issue's source under the "Issue Source" heading.

Assess the project's stories:
Keep analysis and modification constrained to stories belonging to a single epic whenever feasible. Consider the following:
- Can the issue be addressed by modifying existing stories?
- Should new stories be added within the current epic structure?
- Would this approach maintain project timeline and scope as documented in architecture_document?
- Would reverting work from recently-completed stories simplify addressing this issue?
- If so, which stories' changes should be rolled back?

Add content under the "Story Modifications" heading in output_document indicating what work is needed for each story that should be touched as part of this change management process.

Assess the project's epics:
- Evaluate the story's parent epic and, if needed, other epics in the same project and consider:
    - Can the parent epic still be delivered as-documented?
    - Do future epics in the project require revisions?
    - Does the issue invalidate any existing epics?
    - Do new epics need to be introduced?
    - Does the sequencing of the project's epics need to be modified?
- Determine which of the following are necessary:
    - modify existing epic
    - add new epic
    - remove an existing epic

Add content under the "Epic Modifications" heading in output_document indicating what work is needed for each epic that should be touched as part of this change management process.

Assess the project's architecture:
- Evaluate architecture_document and consider:
-   Do the project's scope, architectural goals, core architectural rules, responsibility boundaries, or durable vs transient ownership, blast radius, dependencies, or roadmap need to be modified?

Add content under the "Architecture Modifications" heading in output_document indicating what work is needed in the architecture document as part of this change management process. 

Build a change management action plan using the following guidelines:
Indicate workflows which should be run with intended sequencing. This is the standard sequential workflow structure:
    - create-architecture: defines initial architectural expectations, produces the architecture document
    - create-epics: breaks the project down into clearly-scoped epics, sequences them appropriately, and generates Epics.md and epics.index.json.
    - pi-planning: breaks a single epic down into user stories, defines each story's objective, scope, scope boundary, and requirements, and generates story documents and a story index file for the target epic.
    - create-story: builds out the tasks and subtasks for a single story, adds them to story documents generated during the pi-planning workflow
    - dev-story: implements a single user story
    - code-review: conducts QA analysis on a completed user story, produces findings documents and, if needed, a remediation story with initial story content
    - write-remediation-story: Builds tasks and subtasks for a single remediation story, adds them to a story document produced by the code-review workflow

For each prescribed workflow, include details regarding what should be done to resolve the identified issue which agents executing those workflows can follow.

Add the action plan under the "Change Management Implementation" heading in output_document.

Provide an overview of what you've documented to the user including the full file path for output_document. Revise as needed based on their feedback. Once they are satisfied with your documentation, use attempt_completion to provide them with a closing set of instructions which include the following where relevant:
    - if the user needs to run the create-architecture or create-epics workflows, they must provide the full file path to output_document when prompted for context files.
    - if epics are to be deleted, added, or resequenced, or if stories are to be added, deleted, or resequenced, the user must run the following workflows in order:
        - create-epics (once)
        - pi-planning (once per modified/new epic)
        - create-story (once per modified/new story)
    - The user should not resume the normal dev-story - > code-review - > write-remediation-story cycle until all project documentation has been updated per the change management plan.
```

The prompt renderer must replace these placeholders with their persisted workflow values before projection:

- `projectTitle`
- `projectFolderName`
- `architecture_document`
- `output_document`
- `epic_source_indicator`
- `epic_source_identifier`
- `epics_document`
- `story_source_indicator`
- `story_source_identifier`

The projected prompt must not leak those placeholder strings when valid workflow values are available.

The epic conditional block must be included only when `epic_source_indicator` equals `yes`.

The story conditional block must be included only when `story_source_indicator` equals `yes`.

The source document's Tool Schema Override section requires Step 1 and Step 2 to expose empty tool schema overrides, and requires Step 3 to let the agent write to files, read files, send the user a general message, and provide a final recap through `attempt_completion`.

Step 3 must satisfy that source-prescribed capability inventory with this exact existing shared tool inventory:

- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `write_to_file`
- `send_user_message`
- `attempt_completion`

`list_files`, `search_files`, `list_code_definition_names`, `read_file`, and `read_file_range` are the approved existing shared tools for source-prescribed file discovery and file reading. `apply_patch`, `write_to_file`, `read_file`, and `read_file_range` are the approved existing shared tools for source-prescribed file writing and update verification. `send_user_message` is the approved existing shared tool for source-prescribed general user messaging. `attempt_completion` is the approved existing shared tool for the source-prescribed final recap.

The Step 3 tool schema builder must use existing shared/default tool specs for the approved tools above. The module must not add custom model-facing tool descriptions, parameter descriptions, or parameters unless this requirements document is revised to approve the exact schema text and shape.

Step 3 must not expose `execute_command`, `replace_in_file`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `update_story_index_status`, `plan_story_artifacts`, `plan_remediation_story_artifact`, `generate_story_files`, `workflow_progress_request`, `ask_followup_question`, `use_subagents`, web tools, MCP tools, or retired workflow tools.

When `attempt_completion_succeeded` occurs in Step 3, the workflow must complete through `complete_workflow`.

Correct-course completion must not update story index status, move story files, generate remediation stories, dispatch subagents, mutate parent workflow state, allocate additional artifacts, or rebuild the change management plan.

## Decision Tree Requirements

Each step must have an explicit decision tree.

Each tool-backed operation and deterministic procedure must have explicit success and failure routes. Failure routes must end in a retry route or terminal failure; they must not silently no-op.

The workflow must represent completion only through workflow-owned runtime state and decision-tree actions. `attempt_completion` success must be emitted to workflow runtime as `attempt_completion_succeeded`; response-tool execution must not directly tear down or finalize the workflow.

The decision tree must not branch on undocumented workflow values, hidden globals, legacy placeholder workflow state, managed-workflow state, or source markdown presence.

## Tool Schema Requirements

The module must define all model-visible tool-schema builders in:

```text
src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseToolSchemas.ts
```

Every step's `buildToolSchema(...)` must delegate directly to a named export from that file.

Each step's `buildToolSchema(...)` return value is the complete per-turn workflow-specific tool schema override for that active workflow turn. Prompt projection must consume that exact override for both native and non-native workflow tool surfaces. The override must replace any legacy workflow contextual tool bundle behavior rather than augmenting it.

Step tool schemas must be:

| Step | Tool names |
| --- | --- |
| Step 1 | `[]` |
| Step 2 | `[]` |
| Step 3 | `["list_files", "search_files", "list_code_definition_names", "read_file", "read_file_range", "apply_patch", "write_to_file", "send_user_message", "attempt_completion"]` |

The legacy contextual tool matrix must not participate in model-facing tool projection.

## Module File Layout

The correct-course implementation should use only the module files it actually needs, consistent with the module build guide:

```text
src/core/task/workflow-runtime/workflow-modules/correct-course/
  correctCourseWorkflow.ts
  correctCourseToolSchemas.ts
  correctCourseDocument.ts
  index.ts
  __tests__/
    correctCourseWorkflow.test.ts
    correctCourseToolSchemas.test.ts
    correctCourseDocument.test.ts
```

The correct-course module must not create a module-owned registry file, static data file, specialized backend tool handler, or additional module file unless the requirements are revised first to prescribe that file by name and purpose.

## Historical Cleanup Expectations

The module build must not preserve or re-establish correct-course behavior through placeholder workflow state, managed-workflow state, source markdown loading, `.md` workflow identity aliases, legacy focus-chain deterministic progression, or the legacy contextual tool matrix.

The module build must not add or preserve workflow-specific document-generation handlers for correct-course. Initial document creation must use module-owned document content builders with runtime-owned `build_workflow_document`.

The module build must not add custom model-facing `create_workflow_artifact` or `build_workflow_document` schemas.

## Testing Requirements

The module build must include focused unit tests covering:

- workflow identity, `slashCommandName`, `useSkillName`, display name, description, project subfolder, persona fields, and entry panel description reuse
- workflow registry resolution by workflow name, slash command, and use-skill name
- negative registry coverage proving `correct-course.md` does not resolve as a workflow name, slash command, or use-skill name
- workflow value inventory, including entry project keys, `architecture_document`, `issue_description`, `epic_source_indicator`, `epic_source_identifier`, `epics_document`, `epics_document_artifact_identity`, `story_source_indicator`, `story_source_identifier`, `output_document`, and output artifact metadata keys
- prerequisite declaration for `architecture_document`, including required mode, producing workflow `create-architecture`, selected-project subfolder `planning`, exact filename `architecture.md`, workflow value key, and `outputDocumentReference: "none"`
- change management plan artifact definition using runtime-owned `WorkflowArtifactFamily.ChangeManagementPlan`, `intentMode: "new"`, undefined parent and target identity sources, and standalone output value key mappings
- document builder output with the exact required heading order and `issue_description` rendered under `# Identified Issue`
- Step 1 workflow form structure for Panels A through H, including exact panel titles, `promptMarkdown`, field kinds, field labels, option values, required flags, allowed actions, action labels, and back destinations
- Panel B routing from `yes` to Panel C when `planning/Epics.index.json` is available
- Panel B routing from `yes` to Panel F when `planning/Epics.index.json` is unavailable
- Panel B routing from `no` to Panel D while clearing `epic_source_identifier` and `epics_document`
- Panel C JSON option source contract, including exact-file mode, `sourcePathSegments`, `itemsPath`, `valueProperty`, label template, and no option descriptions
- Panel C submission routing to runtime-owned `resolve_existing_project_artifact` when selected-project `planning/Epics.md` appears present, including `WorkflowArtifactFamily.Epics`, `artifactIdentityWorkflowValueKey: "epics_document_artifact_identity"`, `projectSubfolderSegments: ["planning"]`, `outputWorkflowValueKey: "epics_document"`, persisted artifact identity value `epics`, and the exact terminal error message prescribed for failed runtime resolution
- Panel C submission routing to Panel H when selected-project `planning/Epics.md` is missing
- Panel D routing from `yes` to Panel E when one or more `implementation/epic-{E}-stories.index.json` files are available
- Panel D routing from `yes` to Panel G when no story index files are available
- Panel D routing from `no` to Step 2 while clearing `story_source_identifier`
- Panel E JSON option source contract, including discovered-files mode, `sourceFileDiscovery` shape, `itemsPath`, `valueProperty`, label template, and no option descriptions
- Panel E submission persisting `story_source_identifier` and proceeding to Step 2
- Panel F `continue` route persisting `epic_source_identifier` and `epics_document` as `not found` and proceeding to Step 2
- Panel F `end workflow` route ending the workflow
- Panel G `continue` route persisting `story_source_indicator` as `not found` and proceeding to Step 2
- Panel G `end workflow` route ending the workflow
- Panel H `continue` route persisting `epics_document` as `missing` and proceeding to Step 2
- Panel H `end workflow` route ending the workflow
- stale-value clearing when upstream Panel B or Panel D choices invalidate downstream values
- Step 1 and Step 2 exported tool-schema builders returning empty model-visible schemas
- Step 2 artifact allocation route shape for `change_management_plan`
- Step 2 `build_workflow_document` route shape and success transition to Step 3
- Step 2 failure routing for artifact allocation and document build failures with the concrete backend/runtime failure reason
- Step 3 exported tool-schema builder returning exactly the approved model-visible tool names and using existing shared/default specs
- Step 3 prompt projection preserving source wording while rendering required workflow values without leaking placeholders
- Step 3 conditional prompt blocks: epic block included only when `epic_source_indicator` is `yes`, story block included only when `story_source_indicator` is `yes`
- prompt integration proving Step 3 projected tools are present in active workflow native/non-native prompt surfaces and forbidden tools are absent
- Step 3 `attempt_completion_succeeded` routing to workflow completion without story index updates, story file moves, remediation story generation, subagent dispatch, parent workflow mutation, additional artifact allocation, or output document rebuild
- absence of runtime dependency on the correct-course source markdown, placeholder workflow state, managed-workflow state, `.md` workflow identity aliases, workflow-specific document-generation handlers, and the legacy tool matrix

Prompt tests must not assert exact editable prompt prose except where exact source-prescribed strings are the approved runtime contract. They must assert behavior and invariants: prompt output exists, required workflow values render non-empty, placeholders do not leak, conditional blocks are included or omitted correctly, forbidden legacy text is absent, current step details are projected in the correct payload location, and the projected tool schema matches the prompt's tool references.

Tool-schema tests for existing shared/default tools must verify approved tool names and absence of custom correct-course model-facing schema prose. They must not duplicate or restate existing shared tool descriptions unless the action plan is deliberately testing reuse of the exact shared `ClineToolSpec` objects.

## Validation Requirements

The correct-course action plan must prescribe validation commands that include:

- focused correct-course workflow module unit tests
- focused correct-course tool-schema tests
- focused correct-course document-builder tests
- workflow registry/prompt projection tests covering slash-command and use-skill activation
- `npm run check-types`
- `npm run lint`
- focused `rg` checks proving forbidden legacy correct-course runtime concepts are not present in the module implementation

If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun the exact blocked validation command before treating the failure as a code defect.

Persistent diffs after implementation must be limited to files authorized by the action plan phase being executed.
