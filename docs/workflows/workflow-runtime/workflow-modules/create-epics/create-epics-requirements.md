# Create Epics Workflow Module Requirements

## Scope

Build the product-owned `create-epics` workflow module using `/Users/robertboston/Documents/Cline/Workflows/create-epics.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use the brainstorming and create-architecture module requirements only as structural references where they still align with the guide.

The create-epics workflow must create and guide completion of the project-level epics artifact. It must use an existing architecture document as the required source of truth, optionally include an existing brainstorming document as supplemental context, draft implementation-ordered epics, and generate the machine-readable epic index required by downstream workflows.

Do not rely on the source markdown workflow file, legacy templates, BMAD files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

## Workflow Identity

- `name`: `create-epics`
- `slashCommandName`: `create-epics`
- `useSkillName`: `create-epics`
- `displayName`: `Create Epics`
- `description`: `Create a project-level epics document from an existing architecture document, then generate the structured epic index used by downstream planning workflows.`
- `persona`: `product-manager`
- `projectSubfolder`: `planning`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above.

## Persona

The create-epics module must derive its structured persona from the canonical workflow mapping in `docs/workflows/workflow-runtime/requirements.md` and the migration source `_bmad/bmm/agents/pm.md`.

The module must copy the derived persona into module-owned constants and must not read `_bmad/bmm/agents/pm.md` at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition` for the mapped `product-manager` persona.

- `role` must be `Product Manager`.
- `name`, `identity`, and `communicationStyle` must be non-empty strings.
- `capabilities` and `principles` must be non-empty arrays of non-empty strings.

If the requirements mapping or BMAD source changes before implementation, the module-build action plan must require re-deriving this persona before code changes.

## Runtime-Owned Values

The create-epics module must define its workflow-owned value contract according to `FR-10a` through `FR-10c1`, `FR-21a`, and `FR-21b`.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory per `FR-10c1`, `FR-35g1`, and `FR-35g2`.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`, per `FR-10j1` and `FR-10j2`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- required `architecture_document`, the absolute path to the selected `architecture.md`
- required `has_brainstorming_document`, the user's yes/no response indicating whether they want to provide a brainstorming workflow file
- optional `brainstorming_document`, the user-provided absolute path to a brainstorming workflow file
- optional `additional_context_files`, the user-provided full file paths for any additional context files
- `output_file`, the canonical prompt-readable absolute path to `Epics.md`
- `epics_index_file`, the canonical absolute path to `Epics.index.json`
- output artifact metadata required by `FR-20l` and `FR-20m` for `Epics.md`, including project context, artifact family, artifact identity, artifact filename, artifact relative path, and artifact absolute path
- output artifact metadata required by `FR-20l` and `FR-20m` for `Epics.index.json`, including project context, artifact family, artifact identity, artifact filename, artifact relative path, and artifact absolute path

The `Epics.md` artifact definition must map `outputValueKeys.artifactAbsolutePath` to `output_file`.

The `Epics.index.json` artifact definition must map `outputValueKeys.artifactAbsolutePath` to `epics_index_file`.

Any workflow form field whose submitted value must survive beyond form-local state must declare a durable workflow-value destination and persist through the runtime value seam, per `FR-39f` through `FR-39m`.

The create-epics module must not expose `set_workflow_values` in any model-facing step. Required document and index mutations must happen through module-owned backend tools or runtime-owned deterministic actions.

Workflow values must remain JSON-safe and preserve type/shape, per `FR-35i` through `FR-35k`. Prompt builders may render workflow values only through deterministic rendering, per `FR-35l`; runtime or tool code requiring string paths or identities must validate non-empty strings per `FR-35m`.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state, per `FR-49a`, `FR-50`, and `FR-52` through `FR-52b`.

## AI-Writable Workflow Values

The create-epics module must not define AI-writable workflow values.

No create-epics step may expose `set_workflow_values`. The epics document is the source of truth for human-facing epic content, and `Epics.index.json` is generated deterministically from canonical epic sections.

## Required Prerequisite And Context Files

The create-epics workflow requires an existing `architecture.md` file in the selected project's `planning` subfolder before model-driven work can begin.

The required architecture prerequisite is produced by the `create-architecture` workflow. If no valid `planning/architecture.md` file is discoverable for the selected project, the workflow must inform the user that they must run the `create-architecture` workflow first to generate the required architecture document, and the create-epics workflow must not proceed to artifact allocation, document initialization, model-driven work, or completion.

The required architecture prerequisite must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action, per `FR-20j6` through `FR-20j8`. It must not be implemented as a module-owned `selectorDiscovery` workflow form.

The architecture prerequisite declaration must use `id: "architecture_document"`, `requirement: "required"`, `projectSubfolderSegments: ["planning"]`, `match: { kind: "exact_filename", filename: "architecture.md" }`, `producingWorkflowName: "create-architecture"`, `workflowValueKey: "architecture_document"`, and `outputDocumentReference: "module_document_builder"`.

Runtime-owned prerequisite discovery must resolve only under the selected project root and must target the selected project's `planning` subfolder. It must not accept absolute paths, parent-directory escapes, or files outside the selected project.

When exactly one valid `planning/architecture.md` file is discoverable, the runtime-owned prerequisite flow must present a confirmation panel. When multiple valid prerequisite candidates match, the runtime-owned prerequisite flow must present the discoverable candidates for user selection and confirmation.

The workflow must not automatically discover an optional brainstorming workflow file. Optional brainstorming context must be collected through the Step 1 workflow form.

The Step 1 workflow form must ask whether the user has a brainstorming workflow file they would like to use during the session. The user's yes/no response must persist to `has_brainstorming_document`.

When `has_brainstorming_document` is yes, the Step 1 workflow form must require the user to provide the full file path to the brainstorming workflow file and persist that path to `brainstorming_document`.

When `has_brainstorming_document` is no, the Step 1 workflow form must not require, infer, discover, or persist a `brainstorming_document` value.

The Step 1 workflow form must also ask the user to provide any additional files they want to use as context. The response must be optional and must persist to `additional_context_files` only when the user provides one or more file paths.

The workflow form must collect user-provided context paths as input text. It must not validate file existence, normalize file paths, read provided files, or reject paths based on workspace policy during form submission.

## Output Artifacts

The create-epics workflow uses runtime-owned artifact families that already exist in the workflow artifact-family registry:

| Artifact | Family | Canonical filename | Stable identity | Content kind |
| --- | --- | --- | --- | --- |
| Human-facing epics document | `WorkflowArtifactFamily.Epics` | `Epics.md` | `epics` | markdown |
| Machine-readable epic index | `WorkflowArtifactFamily.EpicsIndex` | `Epics.index.json` | `epics_index` | structured JSON index |

Although the source workflow document may use lowercase shorthand such as `epics.md`, implementation must use the canonical runtime-owned filename `Epics.md` from `FR-20b2`.

Both artifacts must be created in the selected project's `planning` subfolder beneath the runtime-owned project output root.

The create-epics module may reference the runtime-owned artifact-family identifiers, but must not define or override canonical filename patterns, extensions, numbering scopes, discovery patterns, singleton identities, or path construction, per `FR-20j4` and `FR-20k`.

Step 1 must begin by waiting for the runtime-owned `entry_artifact_resolution_completed` event for the `Epics.md` artifact.

When `entry_artifact_resolution_completed` reports `creationRequired: true` for `Epics.md`, Step 1 must allocate/create `Epics.md`, build the initial epics document shell, and continue only after the required architecture prerequisite has been resolved and the context workflow form has completed.

When `entry_artifact_resolution_completed` reports `creationRequired: false` for `Epics.md`, Step 1 must skip `allocate_artifact` and skip the initial `build_workflow_document` shell build for `Epics.md`; it must use the runtime-persisted `output_file` and continue against the existing document only after the required architecture prerequisite has been resolved and the context workflow form has completed.

`Epics.index.json` must be generated or regenerated deterministically when Step 2 receives `attempt_completion_succeeded`, and successful index generation must route to `complete_workflow`. The final index content must match this schema exactly:

```json
{ "version": 1, "epics": [{ "identity": "1", "title": "...", "story-index-generated": false }] }
```

`identity` values in `Epics.index.json` must be positive numeric strings matching the epic numbers in `Epics.md`. `title` values must be non-empty strings matching the canonical epic titles in `Epics.md`. Index generation must set `story-index-generated` to `false` for every epic. The index must not contain story, remediation-story, review, scope, objective, or requirements data.

## Document Template

The initial `Epics.md` document shell must be produced from module-owned code, not by reading `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/create-epics/epic-delivery-spec-template.md` at runtime.

The template file is a migration reference only. The module-owned document builder must generate this heading structure exactly:

```markdown
# Context

## Architecture

## Brainstorming

## Additional Context

# Epics
```

When `Epics.md` is newly created, Step 1 must write the discovered `architecture_document` path under `Architecture`.

When `Epics.md` is newly created and `brainstorming_document` was provided, Step 1 must write the user-provided `brainstorming_document` path under `Brainstorming`.

When `Epics.md` is newly created and no `brainstorming_document` was provided, the `Brainstorming` heading must remain present and empty.

When `Epics.md` is newly created and `additional_context_files` was provided, Step 1 must write the user-provided `additional_context_files` value under `Additional Context`.

When `Epics.md` is newly created and no `additional_context_files` value was provided, the `Additional Context` heading must remain present and empty.

When continuing an existing `Epics.md`, the workflow must not rebuild the shell or overwrite existing epic content. Step 2 prompt construction must render the resolved `architecture_document`, `brainstorming_document`, and `additional_context_files` workflow values directly so model-driven work does not depend on existing-document context headings being refreshed.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the create-epics workflow.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`, per `FR-29b1`.
- `stepNumber` must define the runtime step order.
- `checklistLabel` must define the focus-chain task text projected to the UI.
- `buildPromptSource` must provide module-owned prompt text per `FR-14a` through `FR-14g`.
- `buildToolSchema` must provide module-owned per-step tool schema per `FR-15` and `FR-35`.
- `decisionTree` must own step progression, form rendering, deterministic actions, transitions, model handoff, and completion behavior per `FR-16` and `FR-29`.
- Any workflow-form or deterministic operation selected by a step must follow `FR-39` through `FR-43`.
- Final-step completion must route `attempt_completion_succeeded` through deterministic `Epics.index.json` generation and then `complete_workflow` per `FR-46` through `FR-49`.

The module must define these two steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Gather Inputs` | Wait for entry artifact resolution, resolve required `architecture.md`, render the context-input workflow form, allocate and initialize `Epics.md` only when creation is required, and transition to Step 2. |
| `step-2` | 2 | `Draft Epics` | Model-driven epic drafting step; AI must draft epics with the user, persist each accepted epic through `upsert_epic`, use `attempt_completion` after user alignment, and route `attempt_completion_succeeded` through deterministic `Epics.index.json` generation before `complete_workflow`. |

## Step 1: Gather Inputs

Step 1 must model progression by first receiving `entry_artifact_resolution_completed` for the `Epics.md` artifact and then resolving prerequisite files before any model-driven work begins.

Step 1 must invoke `resolve_prerequisite_files` for the declared `architecture_document` prerequisite before rendering the module-owned context workflow form.

If the required architecture prerequisite is not found, the runtime-owned prerequisite flow must surface a user-facing notification that the user must run the `create-architecture` workflow first, and Step 1 must stop without allocating or building `Epics.md`.

If the required architecture prerequisite is found and confirmed, runtime-owned prerequisite resolution must persist the selected absolute path to `architecture_document`.

Step 1 must render a module-owned context workflow form after the required architecture prerequisite has been resolved.

The Step 1 context workflow form must include these three panels:

| Panel | Trigger | Field behavior |
| --- | --- | --- |
| Panel A | First panel | Ask `Do you have a brainstorming workflow file you'd like to use during this session?`; collect required yes/no value into `has_brainstorming_document`. |
| Panel B | Only when Panel A is yes | Ask `Please provide the full file path to your brainstorming workflow file below.`; collect required small text area value into `brainstorming_document`. |
| Panel C | When Panel A is no, or after Panel B completes | Ask `If you'd like to provide any additional files as context please provide their full file paths below.`; collect optional large text area value into `additional_context_files`. |

If `has_brainstorming_document` changes from yes to no through navigation, stale `brainstorming_document` must be cleared.

When `creationRequired: true` for `Epics.md`, Step 1 must run explicit decision actions in this order after required prerequisite resolution and context-form completion succeed: `allocate_artifact`, `build_workflow_document` for the initial document shell with resolved prerequisite and context paths, then `transition_step` to Step 2.

When `creationRequired: false` for `Epics.md`, Step 1 must select a `transition_step` action targeting Step 2 after required prerequisite resolution and context-form completion succeed, and must not run `allocate_artifact` or the initial `build_workflow_document` shell build for `Epics.md`.

Step 1 must define success and failure routes for the first artifact-allocation result when creation is required. If the first allocation succeeds, the next action must build the initial document shell. If the first allocation fails, the next action must retry allocation exactly once.

Step 1 must define success and failure routes for the retry allocation result. If the retry succeeds, the next action must build the initial document shell. If the retry fails, the next action must be `terminal_error`.

If the initial document-shell build succeeds, the Step 1 decision tree must select a `transition_step` action targeting Step 2. If the initial document-shell build fails, the next action must be `terminal_error`.

Step 1 must be runtime-driven and must expose an empty tool schema through an exported builder from `createEpicsToolSchemas.ts`.

## Epic Upsert Tool

The implementation must add a specialized backend workflow tool named `upsert_epic`.

`upsert_epic` is the only model-facing write surface for adding or revising epics in `Epics.md`. The Step 2 prompt must not instruct the AI to use `apply_patch`, `build_workflow_document`, `set_workflow_values`, or raw markdown editing for epic creation.

The tool must accept these required parameters:

- `identity`: positive numeric string, such as `1`
- `title`: non-empty string
- `objective`: object containing required non-empty strings `as_a`, `i_want`, and `so_that`
- `description`: non-empty string
- `requirements`: array of non-empty strings
- `scope`: array of non-empty strings
- `scope_boundary`: array of non-empty strings

The tool must reject partial tool blocks and missing, empty, malformed, or unsupported parameter shapes.

The tool must validate active workflow/session state and must execute only for the active `create-epics` workflow.

The tool must resolve the target document from the active workflow's `output_file` value. It must not accept a model-provided destination path.

The tool must write or replace exactly one canonical epic section in `Epics.md` using this shape:

```markdown
## Epic {identity}: {title}

### Objective
As a {as_a}
I want {i_want}
So that {so_that}

### Description
{description}

### Requirements
- {requirement}

### Scope
- {scope item}

### Scope Boundary
- {scope boundary item}
```

If an epic with the same `identity` already exists, `upsert_epic` must replace that epic section and preserve all other canonical epic sections.

If no epic with the same `identity` exists, `upsert_epic` must insert the new epic section under `# Epics`.

The resulting epic sections must be ordered by numeric identity.

`upsert_epic` must not create stories, tasks, subtasks, acceptance criteria, delivery specs, or implementation plans.

`upsert_epic` must return structured JSON containing the updated epic identity, title, and the current ordered epic inventory.

## Step 2: Draft Epics

Step 2 must enter model-driven work through a `project_prompt` decision action.

Step 2 `buildPromptSource` must construct the Step 2 prompt from module-owned code. The prompt must instruct the AI to:

- read `{output_file}`
- read `{architecture_document}`
- read `{brainstorming_document}` when present
- read any other files provided within `{output_file}` as additional context, including files listed under `Additional Context` when useful
- identify the work necessary to deliver the project based on the architecture document
- provide its understanding of the necessary work to the user and confirm alignment before drafting epics
- break the project into epics by coherent capability outcomes, not by files, layers, or implementation chores
- ensure each epic delivers one testable outcome, groups requirements that change together, has clear dependencies and completion criteria, and is small enough to implement through a focused set of downstream stories
- split epics that contain multiple independent outcomes or major lifecycle transitions
- sequence epics by dependency order with aid from the architecture document
- avoid epics that are only `backend`, `frontend`, or `tests` unless that is genuinely the user-facing capability boundary
- call `upsert_epic` for each user-aligned epic
- notify the user and ask them to review the drafted epics
- revise epics through `upsert_epic` as needed based on user feedback
- after the user indicates alignment with the drafted epics, use `attempt_completion` to provide a final recap and remind the user to run the `pi-planning` workflow for each epic to define that epic's user stories

Step 2 prompt construction must not instruct the AI to draft stories, tasks, subtasks, acceptance criteria, action plans, or implementation checklists.

Step 2 tool schema must expose exactly:

- `read_file`
- `upsert_epic`
- `send_user_message`
- `ask_followup_question`
- `attempt_completion`

Step 2 must not expose:

- `build_workflow_document`
- `apply_patch`
- `set_workflow_values`
- `workflow_progress_request`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

## Epics Index Generation

When Step 2 receives `attempt_completion_succeeded`, workflow-owned decision routing must generate or regenerate `Epics.index.json` from the canonical epic sections in `Epics.md` and then route successful index builds to `complete_workflow`.

Index generation must fail clearly if `Epics.md` contains no canonical epic sections.

Index generation must fail clearly if two canonical epic sections contain the same identity.

Malformed, missing, non-positive, non-numeric epic identities and empty epic titles must be rejected by `upsert_epic` before persistence. Index generation must parse canonical epic headings and must not treat malformed or noncanonical headings as valid index candidates.

Index generation must write exactly this JSON shape:

```json
{
  "version": 1,
  "epics": [
    {
      "identity": "1",
      "title": "Example",
      "story-index-generated": false
    }
  ]
}
```

The generated `epics` array must be ordered by numeric identity.

Index generation must write to the runtime-resolved `epics_index_file` path. It must not accept a model-provided path and must not derive the path outside the runtime-owned artifact-family registry.

## Tool Schema Ownership

The create-epics module must have a canonical tool-schema file:

```text
src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts
```

All model-visible workflow tool-schema builders must live there.

`createEpicsWorkflow.ts` must not define inline `ClineToolSpec` objects, inline tool arrays, local tool-schema builder bodies, or fallback empty schemas.

Each `WorkflowStepDefinition.buildToolSchema(...)` must delegate directly to a named export from `createEpicsToolSchemas.ts`.

The returned `readonly ClineToolSpec[]` is the complete model-visible workflow tool surface for that turn. It is not additive with default workflow tools.

## Testing Requirements

The create-epics module must include module tests for:

- workflow identity and metadata
- persona fields
- workflow value inventory
- entry project value keys
- required architecture prerequisite discovery behavior
- Step 1 context workflow form panels
- conditional brainstorming-document panel behavior
- absence of automated brainstorming workflow file discovery
- stale `brainstorming_document` clearing when `has_brainstorming_document` changes to no
- optional `additional_context_files` persistence
- output artifact definitions and output value mappings for `Epics.md` and `Epics.index.json`
- Step 1 decision-tree route for `entry_artifact_resolution_completed` with `creationRequired: true`
- Step 1 decision-tree route for `entry_artifact_resolution_completed` with `creationRequired: false`
- Step 1 failure behavior when `architecture.md` is not discoverable
- initial document shell heading order
- initial document shell rendering of required prerequisite and user-provided context paths
- Step 2 prompt source output
- exact Step 1 and Step 2 tool-schema outputs
- absence of `build_workflow_document`, `apply_patch`, `set_workflow_values`, archive/delete/move artifact tools, and `workflow_progress_request` from Step 2 model-facing schema

The `upsert_epic` backend tool must include handler tests for:

- active workflow gating
- missing and malformed parameters
- positive numeric identity validation
- empty value rejection and non-empty title validation
- canonical section insertion
- same-identity replacement
- numeric ordering
- preservation of other canonical epic sections
- rejection of stories, tasks, subtasks, acceptance criteria, or unsupported extra fields
- path resolution through `output_file`
- workspace path-policy enforcement
- structured JSON result shape

The index generation path must include tests for:

- successful generation from one canonical epic
- successful generation from multiple canonical epics ordered numerically
- replacement of stale index content
- failure when no canonical epics exist
- failure for duplicate epic identities
- exact schema shape with no story, remediation-story, review, scope, objective, or requirements data

Prompt integration tests must prove:

- current step details appear in the input payload, not system instructions
- runtime-projected workflow schema is the exact native tool surface for Step 2
- response-tool guidance matches the projected Step 2 schema
- `upsert_epic` appears only when Step 2 is active
- backend-only runtime tools such as `build_workflow_document` are not statically exposed

Validation must include:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsToolSchemas.test.ts
npm run test:unit -- src/core/task/tools/handlers/__tests__/UpsertEpicToolHandler.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
```

Add focused `rg` checks proving `build_workflow_document`, `apply_patch`, `set_workflow_values`, `archive_workflow_artifact`, `delete_workflow_artifact`, and `move_workflow_project_file` are not present in the create-epics Step 2 model-facing tool schema.
