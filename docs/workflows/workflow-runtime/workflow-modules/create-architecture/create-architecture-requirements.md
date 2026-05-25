# Create Architecture Workflow Module Requirements

## Scope

Build the product-owned `create-architecture` workflow module using `/Users/robertboston/Documents/Cline/Workflows/create-architecture.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use `docs/workflows/workflow-runtime/workflow-modules/brainstorming/brainstorming-requirements.md` only as a structural reference where it still aligns with the guide.

The create-architecture workflow must create and guide completion of an `architecture.md` planning artifact through collaborative discovery, explicit design decisions, code-aware assessment, roadmap sequencing, and final readiness review.

Do not rely on the source markdown workflow file, the markdown output template, BMAD files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

## Workflow Identity

- `name`: `create-architecture`
- `slashCommandName`: `create-architecture`
- `useSkillName`: `create-architecture`
- `displayName`: `Create Architecture`
- `description`: `Create a complete architecture document through collaborative discovery, explicit design decisions, and a final readiness review.`
- `persona`: `architect`
- `projectSubfolder`: `planning`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above.

## Persona

The create-architecture module must derive its structured persona from the canonical workflow mapping in `docs/workflows/workflow-runtime/requirements.md` and the migration source `_bmad/bmm/agents/architect.md`.

The module must copy the derived persona into module-owned constants and must not read `_bmad/bmm/agents/architect.md` at runtime.

The module-owned persona must use:

- `name`: `Winston`
- `role`: `Architect`
- `identity`: `Designs scalable systems and chooses practical technology with care.`
- `capabilities`: `distributed systems`, `cloud`, `API design`, `scalability`
- `communicationStyle`: `Calm, pragmatic, and tradeoff-aware.`
- `principles`:
  - `Prefer simple, boring solutions that scale when needed.`
  - `Let user journeys, business value, and developer productivity guide technical decisions.`

If the requirements mapping or BMAD source changes before implementation, the module-build action plan must require re-deriving this persona before code changes.

## Runtime-Owned Values

The create-architecture module must define its workflow-owned value contract according to `FR-10a` through `FR-10c1`, `FR-21a`, and `FR-21b`.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory per `FR-10c1`, `FR-35g1`, and `FR-35g2`.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`, per `FR-10j1` and `FR-10j2`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- `creation_required`, the durable boolean workflow value persisted by Step 1 from the `entry_artifact_resolution_completed` result for `architecture_document`
- `has_context_files`
- optional `context_files`
- optional `change_plan`, the user-provided file path from Panel 9 when revising an existing architecture document
- `scope`
- `has_architectural_goals`
- optional `architectural_goals`
- `has_core_architectural_rules`
- optional `core_architectural_rules`
- `output_file`, the canonical prompt-readable absolute path to `architecture.md`
- output artifact metadata required by `FR-20l` and `FR-20m`, including project context, artifact family, artifact identity, artifact filename, artifact relative path, and artifact absolute path

The architecture artifact definition must map `outputValueKeys.artifactAbsolutePath` to `output_file`. This makes the generic runtime-resolved artifact absolute path available as the workflow's canonical output file path for later `buildPromptSource` functions and document builders.

Any workflow form field whose submitted value must survive beyond form-local state must declare a durable workflow-value destination and persist through the runtime value seam, per `FR-39f` through `FR-39m`.

The create-architecture module must not expose `set_workflow_values` in any model-facing step. User-approved document content must be persisted to `architecture.md` through governed file-edit tools, not through AI-authored workflow-value mutation.

Workflow values must remain JSON-safe and preserve type/shape, per `FR-35i` through `FR-35k`. Prompt builders may render workflow values only through deterministic rendering, per `FR-35l`; runtime or tool code requiring string paths or identities must validate non-empty strings per `FR-35m`.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state, per `FR-49a`, `FR-50`, and `FR-52` through `FR-52b`.

## AI-Writable Workflow Values

The create-architecture module must not define AI-writable workflow values.

No create-architecture step may expose `set_workflow_values`. The architecture document is the source of truth after Step 2 form persistence and later model-facing document edits.

## Output Artifact

The create-architecture workflow requires a runtime-owned unnumbered singleton project markdown artifact for its architecture output document.

The implementation must extend the artifact-family registry and related type surface to support an architecture document artifact family, consistent with `FR-20b1a`, `FR-20j3`, and `FR-20j3a`.

The new artifact family must be runtime-owned, not module-owned. The create-architecture module may reference the artifact-family identifier, but must not define or override canonical filename patterns, extensions, numbering scopes, discovery patterns, or path construction, per `FR-20j4` and `FR-20k`.

The new artifact family must use:

- allocation mode: singleton project artifact
- identity requirement: none
- numbering scope: project singleton
- content kind: markdown
- file extension: `.md`
- stable singleton identity: `architecture_document`
- canonical filename pattern: `architecture.md`
- discovery pattern matching only `architecture.md`

The artifact must be created in the selected project's `planning` subfolder beneath the runtime-owned project output root.

Step 1 must begin by waiting for the runtime-owned `entry_artifact_resolution_completed` event for the `architecture_document` artifact instead of beginning with an unconditional `allocate_artifact` action.

When `entry_artifact_resolution_completed` reports `creationRequired: true` for `architecture_document`, Step 1 must allocate/create `architecture.md`, build the initial architecture document shell, persist `creation_required: true`, and transition to Step 2 after the shell build succeeds.

When `entry_artifact_resolution_completed` reports `creationRequired: false` for `architecture_document`, Step 1 must skip `allocate_artifact`, skip the initial `build_workflow_document`, use the runtime-persisted `output_file`, persist `creation_required: false`, and transition to Step 2 so the user can optionally provide a change management plan before Step 9.

Subsequent runtime-owned deterministic document population must use `build_workflow_document`, which consumes the runtime-resolved destination path and must not allocate identity, choose filenames, or choose folders, per `FR-20p`.

Model-facing steps that edit `{output_file}` must use governed file-read and file-edit tools rather than `build_workflow_document`.

## Document Template

The initial `architecture.md` document shell must be produced from module-owned code, not by reading `docs/workflows/workflow-runtime/workflow-modules/create-architecture/architecture-template.md` at runtime.

The template file is a migration reference only. The module-owned document builder must generate this heading structure exactly:

```markdown
# Scope, Context, & Goals

## Relevant Context

## Scope

## Architectural goals

## Core architectural rules

## Project Context Analysis

## Interpretation

# Responsibility boundaries

## Durable vs transient ownership

### Required additional baseline for authority enforcement

# Current code assessment

### Aligned

### Partially aligned

### Not aligned / conflicts

# Key tradeoffs and risks

## Tradeoffs

## Risks

# Project Blast Radius

# Dependencies

# Project Roadmap
```

When artifact creation is required, Step 1 must build this shell immediately after artifact allocation.

When `creation_required` is `true`, Step 2 must write submitted form values under the matching headings in the same document by using `build_workflow_document` with deterministic module-owned content construction. When `creation_required` is `false`, Step 2 must not run `build_workflow_document`; it may collect `change_plan` for Step 9 prompt materialization. Later model-facing steps must update the document through governed file-edit tools.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the create-architecture workflow.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`, per `FR-29b1`.
- `stepNumber` must define the runtime step order.
- `checklistLabel` must define the focus-chain task text projected to the UI.
- `buildPromptSource` must provide module-owned prompt text per `FR-14a` through `FR-14g`.
- `buildToolSchema` must provide module-owned per-step tool schema per `FR-15` and `FR-35`.
- `decisionTree` must own step progression, form rendering, deterministic actions, transitions, model handoff, and completion behavior per `FR-16` and `FR-29`.
- Any workflow-form or deterministic operation selected by a step must follow `FR-39` through `FR-43`.
- Final-step completion must use workflow-runtime completion and teardown behavior per `FR-46` through `FR-49`.

The module must define these nine steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Generate Output Document` | Wait for entry artifact resolution; create and initialize `architecture.md` only when creation is required, persist `creation_required`, and transition to Step 2. |
| `step-2` | 2 | `Gather User Inputs` | Render one multi-panel input form; when `creation_required` is `true`, write submitted values into the output document and transition to Step 3; when `creation_required` is `false`, optionally collect `change_plan` and transition to Step 9. |
| `step-3` | 3 | `Establish Architecture Foundational Elements` | Model-driven architecture foundation step; progression requires `workflow_progress_request` confirmation. |
| `step-4` | 4 | `Revolve Responsibility & Ownership` | Model-driven responsibility and ownership step; progression requires `workflow_progress_request` confirmation. |
| `step-5` | 5 | `Code Alignment Assessment` | Model-driven code and test assessment step; progression requires `workflow_progress_request` confirmation. |
| `step-6` | 6 | `Identify Key Tradeoffs & Risks` | Model-driven tradeoff and risk step; progression requires `workflow_progress_request` confirmation. |
| `step-7` | 7 | `Map out Blast Radius` | Model-driven blast-radius step; progression requires `workflow_progress_request` confirmation. |
| `step-8` | 8 | `Build Project Roadmap` | Model-driven dependency and roadmap step; progression requires `workflow_progress_request` confirmation. |
| `step-9` | 9 | `Finalize Architecture Document` | Model-driven final readiness review and final delivery through `attempt_completion`; routes `attempt_completion_succeeded` to workflow completion through its decision tree. |

## Step 1: Generate Output Document

Step 1 must model progression by first branching on `entry_artifact_resolution_completed` for `architecture_document`.

When `creationRequired: true`, Step 1 must run explicit decision actions in this order: `allocate_artifact`, `build_workflow_document` for the initial document shell while persisting `creation_required: true`, then `transition_step` to Step 2.

When `creationRequired: false`, Step 1 must persist `creation_required: false`, select a `transition_step` action targeting Step 2, and must not run `allocate_artifact` or `build_workflow_document`.

Step 1 must define success and failure routes for the first artifact-allocation result when creation is required. If the first allocation succeeds, the next action must build the initial document shell. If the first allocation fails, the next action must retry allocation exactly once.

Step 1 must define success and failure routes for the retry allocation result. If the retry succeeds, the next action must build the initial document shell. If the retry fails, the next action must be `terminal_error`.

If the initial document-shell build succeeds, the Step 1 decision tree must select a `transition_step` action targeting Step 2. If the initial document-shell build fails, the next action must be `terminal_error`.

Step 1 must be runtime-driven and must expose an empty tool schema through an exported builder from `createArchitectureToolSchemas.ts`.

## Step 2: Gather User Inputs

Step 2 must render the Step 2 workflow form through creation-state-specific routes. When `creation_required` is `true`, the form must start at Panel 1. When `creation_required` is `false`, the form must start at Panel 8.

The Step 2 workflow form must include these nine panels:

| Panel | Trigger | Field behavior |
| --- | --- | --- |
| Panel 1 | Only when `creation_required` is `true`; first creation panel | Ask `Are there any files which you'd like to provide as context for this session?`; collect required yes/no value into `has_context_files`. |
| Panel 2 | Only when Panel 1 is yes | Ask `Please provide the full file path for each file you'd like to use as session context.`; collect required large text area value into `context_files`. |
| Panel 3 | When Panel 1 is no, or after Panel 2 completes, only when `creation_required` is `true` | Ask `Please describe the scope of this architecture document`; collect required large text area value into `scope`. |
| Panel 4 | After Panel 3 | Ask `Would you like to provide architectural goals?`; collect required yes/no value into `has_architectural_goals`. |
| Panel 5 | Only when Panel 4 is yes | Ask `Please provide the architectural goals below.`; collect required large text area value into `architectural_goals`. |
| Panel 6 | When Panel 4 is no, or after Panel 5 completes | Ask `Would you like to provide the core architectural rules now?`; collect required yes/no value into `has_core_architectural_rules`. |
| Panel 7 | Only when Panel 6 is yes | Ask `Please provide the core architectural rules below.`; collect required large text area value into `core_architectural_rules`. |
| Panel 8 | Only when `creation_required` is `false`; first existing-document panel | Title `Existing Architecture Document`; prompt `It looks like this project already has an architecture document. Do you have a change management plan to provide?`; collect required boolean form-local value using key `has_change_plan`, label `select one`, options `yes` and `no`, submit label `submit`. If `no`, complete the form and proceed to Step 9 without showing Panel 9. |
| Panel 9 | Only when Panel 8 is yes | Title `Provide File Path`; prompt `Please provide the full file path for your change management plan.`; collect required `small_text` value into workflow value `change_plan`, label `file path`, submit label `submit`, back label `back`; terminal panel. |

Panels 3 through 7 must not be shown when `creation_required` is `false`.

The form must only collect and persist the user's input. It must not validate context-file existence, validate file access, read provided context files, normalize file paths, or reject paths based on workspace policy during form submission.

If `has_context_files` changes from yes to no through navigation, stale `context_files` must be cleared. If `has_architectural_goals` changes from yes to no, stale `architectural_goals` must be cleared. If `has_core_architectural_rules` changes from yes to no, stale `core_architectural_rules` must be cleared.

After the Step 2 workflow form completes, the next action depends on `creation_required`.

When `creation_required` is `true`, the next action must use `build_workflow_document` to populate the newly-created architecture output artifact by writing:

- `context_files` under `Relevant Context`, when provided
- `scope` under `Scope`
- `architectural_goals` under `Architectural goals`, when provided
- `core_architectural_rules` under `Core architectural rules`, when provided

When that `build_workflow_document` action succeeds, the Step 2 decision tree must select a `transition_step` action targeting Step 3. Step 2 must not rely on implicit completion, optional progression, or model-driven handoff to advance to Step 3.

When `creation_required` is `false`, Step 2 must not run `build_workflow_document`; it must transition directly to Step 9. If Panel 9 was submitted, `change_plan` must already be persisted as a workflow value.

Step 2 must be runtime-driven and must expose an empty tool schema through an exported builder from `createArchitectureToolSchemas.ts`.

## Step 3: Establish Architecture Foundational Elements

Step 3 must enter model-driven work through a `project_prompt` decision action.

Step 3 `buildPromptSource` must construct the Step 3 prompt from the source workflow prompt. Source references to `output_document` must render from the workflow value key `output_file`. The Step 3 prompt must render this source prompt text:

```text
Review {output_file} and any additional files listed within it as relevant context.

If files were provided in the relevant context section, draft and propose content for the project context analysis section, then save it to {output_file} once the user approves.

Ensure that the scope, architectural goals, and core architectural rules are sufficient to enable completion of the remaining document sections. If the existing is vague, overly broad, or lacks sufficient detail, engage the user and guide them through improving the content of these sections until it is appropriate for a project architecture document and sufficient to act as a basis for the remaining document sections.

Once the scope, architectural goals, and core architectural rules sections are sufficient, draft and propose content for the interpretation section of the document to the user, and save it to {output_file} once the user approves.

Once you've saved user-approved content to the document's interpretation section, use workflow_progress_request to confirm and unlock the next workflow step.
```

Step 3 tool schema must expose exactly:

- `read_file`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`

When Step 3 receives a `workflow_progress_request_confirmed` event, the Step 3 decision tree must select a `transition_step` action targeting Step 4. If the request is denied, Step 3 must remain active and return to `project_prompt`.

## Step 4: Revolve Responsibility & Ownership

Step 4 must enter model-driven work through a `project_prompt` decision action.

Step 4 `buildPromptSource` must construct the Step 4 prompt from the source workflow prompt. Source references to `output_document` must render from the workflow value key `output_file`. The Step 4 prompt must render this source prompt text:

```text
Guide the user through documenting the following sections of {output_file}:
- Responsibility Boundaries
- Durable vs Transient Ownership
- Required Additional Baseline for Authority Enforcement

Refer to relevant context, runtime code, and tests frequently to help keep things grounded in reality and ensure that the section's final content is comprehensive.

Once the user is aligned with this content, use workflow_progress_request to confirm and unlock the next workflow step.
```

Step 4 tool schema must expose exactly:

- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`

When Step 4 receives a `workflow_progress_request_confirmed` event, the Step 4 decision tree must select a `transition_step` action targeting Step 5. If the request is denied, Step 4 must remain active and return to `project_prompt`.

## Step 5: Code Alignment Assessment

Step 5 must enter model-driven work through a `project_prompt` decision action.

Step 5 `buildPromptSource` must construct the Step 5 prompt from the source workflow prompt. Source references to `output_document` must render from the workflow value key `output_file`. The Step 5 prompt must render this source prompt text:

```text
Inform the user that you will now assess current runtime code & tests to identify what existing code is aligned, partially aligned, and not aligned with the intended architecture, then do a thorough assessment of the repository and record your findings in {output_file} under the appropriate section headings.

Brief the user on your findings, answer any questions they have, make adjustments if needed, then use workflow_progress_request to unlock the next workflow step once the user approves the content you've added based on your code alignment assessment.
```

Step 5 tool schema must expose exactly:

- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`

Step 5 must not expose `execute_command` unless requirements are explicitly revised to require command execution during architecture assessment.

When Step 5 receives a `workflow_progress_request_confirmed` event, the Step 5 decision tree must select a `transition_step` action targeting Step 6. If the request is denied, Step 5 must remain active and return to `project_prompt`.

## Step 6: Identify Key Tradeoffs & Risks

Step 6 must enter model-driven work through a `project_prompt` decision action.

Step 6 `buildPromptSource` must construct the Step 6 prompt from the source workflow prompt. Source references to `output_file` must render from the workflow value key `output_file`. The Step 6 prompt must render this source prompt text:

```text
Identify the key tradeoffs and risks based on the existing contents of {output_file}, performing additional code assessment if needed. Provide a proposed draft for the key tradeoffs and risks section of the document to the user, refine as needed based on their feedback, and save the final version under the appropriate document headings once the user approves.

Once the tradeoffs and risks sections are populated with user-approved content, use workflow_progress_request to unlock the next workflow step.
```

Step 6 tool schema must expose exactly:

- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`

When Step 6 receives a `workflow_progress_request_confirmed` event, the Step 6 decision tree must select a `transition_step` action targeting Step 7. If the request is denied, Step 6 must remain active and return to `project_prompt`.

## Step 7: Map out Blast Radius

Step 7 must enter model-driven work through a `project_prompt` decision action.

Step 7 `buildPromptSource` must construct the Step 7 prompt from the source workflow prompt. Source references to `output_document` must render from the workflow value key `output_file`. The Step 7 prompt must render this source prompt text:

```text
Draft and propose a comprehensive blast radius for this project encompassing all files, modules, directories, shared components, and integration boundaries to the user, adjust based on their feedback, and save the approved content under the appropriate heading in {output_file}.

Once the blast radius section of the architecture document is populated with user-approved content, use workflow_progress_request to unlock the next workflow step.
```

Step 7 tool schema must expose exactly:

- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`

When Step 7 receives a `workflow_progress_request_confirmed` event, the Step 7 decision tree must select a `transition_step` action targeting Step 8. If the request is denied, Step 7 must remain active and return to `project_prompt`.

## Step 8: Build Project Roadmap

Step 8 must enter model-driven work through a `project_prompt` decision action.

Step 8 `buildPromptSource` must construct the Step 8 prompt from the source workflow prompt. Source references to `output_document` must render from the workflow value key `output_file`. The Step 8 prompt must render this source prompt text:

```text
Identify the key dependencies that will matter during project implementation, provide them to the user, adjust based on their feedback, then save them in the dependencies section of {output_file}.

Next, build an implementation roadmap which establishes high-level project implementation sequencing based on the identified dependencies & blast radius. Provide the proposed draft to the user, adjust based on their feedback, then save it to the project roadmap section of {output_file}.

Once you've populated the dependencies and implementation roadmap sections of {output_file} with user-approved content, use workflow_progress_request to unlock the final workflow step.
```

Step 8 tool schema must expose exactly:

- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`

When Step 8 receives a `workflow_progress_request_confirmed` event, the Step 8 decision tree must select a `transition_step` action targeting Step 9. If the request is denied, Step 8 must remain active and return to `project_prompt`.

## Step 9: Finalize Architecture Document

Step 9 must enter model-driven work through a `project_prompt` decision action.

Step 9 `buildPromptSource` must construct the Step 9 prompt from the source workflow prompt, normalized to use `{output_file}` consistently. Source references to `output_document` must render from the workflow value key `output_file`.

When `creation_required` is `false`, Step 9 prompt construction must include this conditional prompt segment:

```text
You have been called inside a workflow focused on revising an existing architecture document within the following project:
- Project: {projectTitle}
- Project Folder: {projectFolderName}
- Architecture Document: {output_file}
```

When `creation_required` is `false` and `change_plan` is set to a non-empty value, Step 9 prompt construction must include this additional line inside the same conditional segment:

```text
- Change Management Plan: {change_plan}
```

When `creation_required` is `false`, Step 9 prompt construction must then include this conditional prompt segment:

```text
Steps 1-8 were automatically completed by the system.
Review the architecture document and any files listed in the "Relevant Context" section.
After reviewing, confirm the scope of revisions that the user wishes to make in the architecture document, then work with them to identify the correct revisions to the existing document and update {output_file} appropriately.
```

When `creation_required` is `true`, Step 9 prompt construction must include this conditional prompt segment:

```text
Review the full architecture for coherence and pattern and structure alignment.
Classify any issues as critical, important, or minor.
If there are critical issues, present them and ask how the user wants to resolve them before implementation. If there are important or minor issues, present them as refinements and ask whether to address them now.
```

Step 9 prompt construction must always include this final prompt segment:

```text
When finished, present a short completion summary using attempt_completion and explain that the architecture document is now the technical source of truth and is ready to inform the create-epics workflow.
```

Step 9 tool schema must expose exactly:

- `read_file`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `attempt_completion`

Step 9 completion requires successful final delivery through `attempt_completion`. Successful `attempt_completion` emits `attempt_completion_succeeded`; the Step 9 decision tree must route that event to the runtime-owned `complete_workflow` action. Step 9 must not use a workflow-specific completion handler or finalizer.

## Prompting And Tools

Step prompts must be module-owned prompt builders. Shared workflow tool handlers live outside workflow modules, but create-architecture module definitions must own when those tools are exposed for this workflow.

The create-architecture module's canonical tool-schema file is `createArchitectureToolSchemas.ts`.

`createArchitectureWorkflow.ts` must not define inline tool schemas. Every `buildToolSchema(...)` assignment in the create-architecture workflow definition must delegate directly to an exported builder from `createArchitectureToolSchemas.ts`.

`createArchitectureToolSchemas.ts` must own the complete model-visible tool schema for each create-architecture step.

Step 1 and Step 2 schemas must return empty arrays through named exported builders because those steps are runtime-driven and never route to model-driven work.

Step 3 schema must expose exactly `read_file`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`.

Steps 4 through 8 schemas must expose exactly `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `workflow_progress_request`.

Step 9 schema must expose exactly `read_file`, `apply_patch`, `send_user_message`, `ask_followup_question`, and `attempt_completion`.

No create-architecture model-facing step may expose `create_workflow_artifact`, `build_workflow_document`, or `set_workflow_values`. Artifact creation and deterministic document writes remain runtime-owned.

The legacy tool matrix is a loose migration reference only. The create-architecture module must not copy legacy placeholder-write behavior, must not expose placeholder-era tools, and must not treat the old step numbers as authoritative over this requirements document.

## Completion

Step 9 completes through final user delivery followed by the module-owned `attempt_completion_succeeded` route to the runtime-owned `complete_workflow` action. No workflow-specific completion handler or finalizer is allowed.

The workflow is complete only after `attempt_completion` succeeds in Step 9 and the Step 9 decision tree routes `attempt_completion_succeeded` to `complete_workflow`.

## Tests And Validation Expectations

The implementation must include module tests proving:

- workflow identity, display name, description, project subfolder, and persona match this document
- workflow value inventory includes every declared value, including `creation_required` and optional `change_plan`, and no undeclared hidden runtime-written values
- entry project value keys map to declared workflow values
- architecture artifact definition maps runtime output values into create-architecture workflow values, including `output_file`
- `architecture.md` document builder produces the exact required heading structure without reading `architecture-template.md` at runtime
- Step 2 form panels, transitions, required fields, and stale clears match this document, including Panel 1 start when `creation_required` is `true`, Panel 8 start when `creation_required` is `false`, Panel 8 no routing directly to Step 9 without setting `change_plan`, Panel 8 yes routing to Panel 9, Panel 9 persisting `change_plan`, and Panels 3 through 7 never appearing when `creation_required` is `false`
- Step 1 and Step 2 are runtime-driven and expose empty schemas through named exported builders
- Step 3 exposes exactly the required tool schema
- Steps 4 through 8 expose exactly the required tool schema
- Step 9 exposes exactly the required tool schema
- no model-facing step exposes `create_workflow_artifact`, `build_workflow_document`, or `set_workflow_values`
- all workflow steps delegate `buildToolSchema(...)` directly to named exports from `createArchitectureToolSchemas.ts`
- Step 3 through Step 8 denied progress requests return to `project_prompt`
- Step 3 through Step 8 confirmed progress requests transition to the next step
- Step 9 prompt projection includes the `creation_required: false` conditional prompt segments only when `creation_required` is `false`
- Step 9 prompt projection includes the `Change Management Plan` line only when `change_plan` is set to a non-empty value
- Step 9 prompt projection includes the `creation_required: true` conditional prompt segment only when `creation_required` is `true`
- Step 9 prompt projection does not leak raw placeholders used by Step 9 prompt text: `change_plan`, `projectTitle`, `projectFolderName`, `output_document`, or `output_file`
- Step 9 final delivery completes and triggers normal workflow teardown

Runtime tests must cover:

- architecture artifact family registry allocation and path resolution under the selected project's `planning` folder
- successful Step 1 allocation, initial shell write, `creation_required: true` persistence, and transition to Step 2
- successful Step 1 existing-document path, `creation_required: false` persistence, no allocation, no initial shell write, and transition to Step 2
- successful Step 2 `creation_required: true` form completion, submitted-value document write, and transition to Step 3
- successful Step 2 `creation_required: false` form completion without `change_plan`, no `build_workflow_document` action, and transition to Step 9
- successful Step 2 `creation_required: false` form completion with `change_plan`, no `build_workflow_document` action, `change_plan` persistence, and transition to Step 9
- prompt projection for create-architecture current-step input payloads
- response-tool guidance matching the projected tool schema for model-facing steps

Validation must include targeted unit tests and `npm run check-types`.
