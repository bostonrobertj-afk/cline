# Validate Story Workflow Module Requirements

## Scope

Build the product-owned `validate-story` workflow module using `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use completed workflow module requirements only as structural references where they still align with the guide and current project requirements.

The validate-story workflow performs a Scrum Master pre-implementation review of an implementation-ready story or remediation story before it is passed to a developer. The workflow reads the selected project's architecture document, epics document, and target story document, then reports section-level and task/subtask-level violations through `attempt_completion`.

The target story document is created initially by the `pi-planning` workflow and finalized by the `create-story` workflow. The validate-story workflow must treat `create-story` as the runtime `producingWorkflowName` for `target_story` prerequisite resolution because the validator requires the implementation-ready story content finalized by create-story.

The workflow must not modify story files, epics files, architecture files, project files, story indexes, or workflow artifacts.

Do not rely on the source markdown workflow file, legacy BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

## Source Verbiage Fidelity

The validate-story requirements must preserve the exact user-provided AI prompt verbiage from `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story.md`.

The module must not invent, paraphrase, summarize, or add UI-visible panel titles, `promptMarkdown`, field labels, action labels, static notice content, helper text, descriptions, button labels, or AI prompt text.

If required UI-visible text, prompt text, or user-visible error text is missing from the source document or from an existing shared runtime/tool contract, the module build must stop and request source-document or requirements clarification before action-plan or runtime implementation work proceeds.

Required prerequisite-file missing, rejection, and cancel behavior must use existing runtime-owned prerequisite-file UI and messaging. The validate-story module must not define module-owned terminal-error text for missing required prerequisite files after prerequisite resolution starts.

## Workflow Identity

- `name`: `validate-story`
- `slashCommandName`: `validate-story`
- `useSkillName`: `validate-story`
- `displayName`: `validate story`
- `description`: `In this workflow, the agent assesses an implementation-ready story to ensure that it is correctly-written in compliance with project requirements and workflow quality standards.`
- `persona`: `scrum-master`
- `projectSubfolder`: `planning`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above as the workflow overview text.

The validate-story module must be registered as an in-scope shipped workflow under the main project mapping `validate-story` / `scrum-master` / `planning`.

## Persona

The validate-story module must use the persona prescribed by `validate-story.md`.

The module must copy the persona into module-owned constants and must not read BMAD agent files or the source markdown workflow document at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition` for the mapped `scrum-master` persona.

- `name`: `Bob`
- `role`: `Scrum Master`
- `identity`: `producing clear, actionable stories.`
- `communicationStyle`: `crisp, checklist-driven, and ambiguity-free.`
- `capabilities`: [`story validation & story task/ subtask authoring.`]
- `principles`: [`always assessing runtime code & tracing seams end-to-end to ensure task coverage is comprehensive.`]

## Runtime-Owned Values

The validate-story module must define its workflow-owned value contract according to `FR-10a` through `FR-10c1`, `FR-21a`, and `FR-21b`.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory per `FR-10c1`, `FR-35g1`, and `FR-35g2`.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`, per `FR-10j1` and `FR-10j2`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- required `target_story`, the absolute path to the selected `implementation/stories-backlog` story or remediation story file
- required `epics_document`, the absolute path to the selected project's `planning/Epics.md`
- required `architecture_document`, the absolute path to the selected project's `planning/architecture.md`

Workflow values must remain JSON-safe and preserve type/shape, per `FR-35i` through `FR-35k`. Prompt builders may render workflow values only through deterministic rendering, per `FR-35l`; runtime or tool code requiring string paths must validate the expected type and shape per `FR-35m`.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state, per `FR-49a`, `FR-50`, and `FR-52` through `FR-52b`.

## AI-Writable Workflow Values

The validate-story module must not define AI-writable workflow values.

No validate-story step may expose `set_workflow_values`. Project selection and prerequisite-file path persistence are runtime-owned deterministic behavior.

## Runtime Artifacts And Output Documents

The validate-story module must not declare workflow artifact definitions, artifact output value keys, document builders, runtime-owned document generation, or project-numbered artifacts.

The validate-story workflow produces no file output. Its only final delivery is the model response through `attempt_completion`.

## Required Prerequisite Files

The validate-story workflow requires three selected-project prerequisite files before model-driven work can begin:

| Prerequisite id | Requirement | Producing workflow | Project subfolder | Match | Workflow value key | Output document reference |
| --- | --- | --- | --- | --- | --- | --- |
| `target_story` | required | `create-story` | `implementation/stories-backlog` | naming pattern `/^(Story-[1-9]\d*-[1-9]\d*|Remediation-story-[1-9]\d*-[1-9]\d*-[1-9]\d*)\.md$/` | `target_story` | `none` |
| `epics_document` | required | `create-epics` | `planning` | exact filename `Epics.md` | `epics_document` | `none` |
| `architecture_document` | required | `create-architecture` | `planning` | exact filename `architecture.md` | `architecture_document` | `none` |

The prerequisite files must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action, per `FR-20j6` through `FR-20j8`.

Prerequisite selection must not be implemented as a module-owned `selectorDiscovery` workflow form, and it must not mutate shared project-selection behavior.

Runtime-owned prerequisite discovery must resolve only under the selected project root and must target the exact selected-project subfolders listed above. It must not accept absolute user-provided paths, parent-directory escapes, or files outside the selected project.

When a user selects or confirms a prerequisite file, `resolve_prerequisite_files` must persist the selected full absolute path to the declaration's `workflowValueKey`.

If any required prerequisite file has no match, is rejected, or is canceled, runtime-owned required-prerequisite behavior must stop the workflow before model-driven work begins. The validate-story module must not add a later missing-prerequisite terminal-error path for these files.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the validate-story workflow using the module-owned description.

The validate-story workflow is not approved for child/subagent activation. The module must not declare child inheritance rules.

The validate-story workflow is not approved for workflow-specific workflow forms. It must use only the shared entry form and runtime-owned prerequisite-file selection panels.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`
- `stepNumber` must define the runtime step order
- `checklistLabel` must define the focus-chain task text projected to the UI
- `buildPromptSource` must provide module-owned prompt text
- `buildToolSchema` must provide module-owned per-step tool schema
- `decisionTree` must own prerequisite resolution, model handoff, and completion behavior
- Final-step completion must use workflow-runtime completion and teardown behavior

The module must define this one step, using this exact `checklistLabel` value:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Assess Story Before Implementation` | Resolve all required prerequisites, project the source-prescribed prompt with required workflow values rendered, expose only the approved read/review/communication/final-delivery tools, and complete the workflow after successful `attempt_completion`. |

## Step 1: Assess Story Before Implementation

Step 1 is model-driven after project selection and successful required-prerequisite resolution.

The Step 1 prompt template must reference these workflow values through shared runtime prompt-template tokens:

- `{workflow.projectTitle}`
- `{workflow.projectFolderName}`
- `{workflow.architecture_document}`
- `{workflow.epics_document}`
- `{workflow.target_story}`

The source document records these placeholders as bare workflow-value tokens. The implementation must translate those source placeholders into `{workflow.<workflowValueKey>}` prompt-template tokens in the module-owned TypeScript prompt constant and must let the shared `WorkflowRuntime` prompt-template renderer materialize them. The module must not perform local `replace`, `replaceAll`, regex, or hand-built substitution for these workflow-value references.

The Step 1 current-step prompt template must use this exact source text, with only the listed workflow-value placeholders converted to shared runtime prompt-template tokens:

```text
You are performing a pre-implementation review of an implementation-story document before it is passed to the developer for implementation.
- Project: {workflow.projectTitle}
- Project Folder: {workflow.projectFolderName}
- Architecture Document: {workflow.architecture_document}
- Epics Documentation: {workflow.epics_document}
- Target Story: {workflow.target_story}

Perform a line-by-line review to ensure that the provided story document meets all relevant project and quality standards, including:
- Objective, scope, scope boundary, and requirements are appropriate for the story and aligned with the upstream epics and architecture documentation
- The story's tasks and subtasks fully comply with the following:
    - Tasks & subtasks must start on a new line beginning with "[ ]", then the ID, then the target file's full file path, then the prescribed change.
    - Tasks and subtasks are numbered sequentially with subtasks inheriting their parent task's ID, e.g. Task 1, Subtasks 1.1, 1.2
    - The tasks/subtasks fully satisfy the story's requirements & objective while adhering to the scope and scope boundary
    - Prescribed revisions are exact and leave no ambiguity for the developer to solve during implementation.
    - Prescribed changes must include exact shapes for helpers, functions, fixtures, transition objects, discriminant narrowing, and object fields.
    - Each subtask or task without subordinate subtasks prescribes exactly one revision in a single target file
    - Tasks & Subtasks align with these quality expectations:
        - Symbol lifecycle: every referenced helper, constant, type, builder, and test utility must be created, exported, and imported before first use. Import subtasks must list exact symbol names; phrases like "all helpers", "all exports", "the builders", or "matching sibling imports" are not permitted.
        - Live contract verification: every prescribed constructor call, method call, return type, runtime action object, path-policy object, session object, form-session object, event object, and submitted-value payload must match the live exported TypeScript contract or a symbol created earlier in the same plan.
        - Single-change granularity: a subtask must not bundle multiple helpers, multiple unrelated tests, or multiple runtime branches when splitting them would make sequencing, imports, or exact assertions clearer.
        - Stable object assertions: tests for machine-consumed contracts must use exact deep-equality or exact field assertions, not "include", "deep-include", "transition type", or "action kind", when the requirements prescribe stable object fields.
        - Fixture completeness: every test fixture must prescribe exact required object fields and exact setup calls/data, including runtime sessions, values, temp files, write data, cleanup, and second/fresh fixture setup where isolation is required.
        - Deterministic helper behavior: helper subtasks must prescribe exact narrowing, intermediate variables, empty checks, return values, and error paths. Internally contradictory wording is not permitted.
        - Filesystem/path-policy behavior: if a requirement involves selected-project containment, file type, workspace path policy, or runtime-owned artifact resolution, the story must prescribe that exact validation path.
        - Legacy/forbidden coverage: unit tests and final validation guards must enumerate every forbidden legacy concept required by the requirements.
    Tasks & subtasks must NEVER include the use of these low-quality code methods:
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
- Prescribed tests provide adequate coverage of both happy paths and failure paths for all code revisions
- Tests are prescribed only for behavior, contracts, regression, and material risks required by the story document and project documentation
- Any tests built via the story's tasks use exact assertions for canonical machine-consumed outputs and stable contracts, including tool names/ schema shape, artifact file formats, and persisted metadata.
- Any tests built via the story's tasks use shape and invariant assertions for editable content: required fields exist, strings are non-empty, mappings are correct, and forbidden legacy values are absent.
- Any tests built via the story's tasks do not add static guards unless they protect an approved boundary, forbidden legacy dependency, or known regression risk.

Once you've reviewed the story document, provide a response to the user using attempt_completion. In your response, list each story section and indicate "no violations" or provide specific violation details. For the task section, provide either a "no violations" or violations details for each task and subtask. If findings were present, instruct the user to run the create-story workflow and provide your findings to the agent in that workflow.
```

The final review response must be delivered through `attempt_completion`.

The final review response must cover the story document sections generated by the runtime story template:

- `General Instructions`
- `Objective`
- `Scope`
- `Scope Boundary`
- `Requirements`
- `Known Issues/ Risks/ Technical Debt`
- `Tasks`
- `Validation`

For each non-task section, the final response must indicate exactly `no violations` or provide violation details. For the `Tasks` section, the final response must indicate `no violations` or provide violation details for each task and subtask.

If findings are present, the final response must instruct the user to run the `create-story` workflow and provide the findings to that workflow's agent.

## Decision Tree Requirements

The workflow decision tree must route shared project-selection completion into runtime-owned prerequisite resolution before any model-driven work begins.

The first model-driven Step 1 action must be `project_prompt` only after all required prerequisite files have been resolved and their absolute paths have been persisted to the declared workflow value keys.

The Step 1 decision tree must route `attempt_completion_succeeded` to `complete_workflow`.

The workflow must not route to story-index validation, artifact allocation, document generation, child workflow activation, story file mutation, story status update, story file movement, or runtime-owned backend tools after `attempt_completion_succeeded`.

## Tool Schema Requirements

The validate-story module must define all model-visible tool schemas in:

```text
src/core/task/workflow-runtime/workflow-modules/validate-story/validateStoryToolSchemas.ts
```

Every step's `buildToolSchema(...)` must delegate directly to a named export from that file.

Each step's `buildToolSchema(...)` return value is the complete per-turn workflow-specific tool schema override for that active workflow turn. Prompt projection must consume that exact override for both native and non-native workflow tool surfaces. The override must replace any legacy workflow contextual tool bundle behavior rather than augmenting it.

Step 1 must expose exactly these existing shared/default tool schemas, in this order:

1. `read_file`
2. `read_file_range`
3. `list_files`
4. `search_files`
5. `list_code_definition_names`
6. `execute_command`
7. `send_user_message`
8. `attempt_completion`

The Step 1 tool-schema builder must follow `FR-15g` and the module build guide shared/default tool-schema resolver pattern. It must declare the exact ordered `readonly ClineDefaultTool[]` for the Step 1 tool ids and resolve each shared/default tool through `ClineToolSet.getToolByNameWithFallback(..., ModelFamily.NATIVE_GPT_5)` after calling `registerClineToolSets()`. It must not hand-build or copy local `ClineToolSpec` objects, and it must not define custom validate-story descriptions for shared/default tools.

The validate-story tool schema must not include:

- `apply_patch`
- `write_to_file`
- `set_workflow_values`
- `workflow_progress_request`
- `ask_followup_question`
- `use_subagents`
- `create_workflow_artifact`
- `build_workflow_document`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`
- `resolve_prerequisite_files`
- `resolve_existing_project_artifact`
- `validate_story_index_entry`

## Module File Layout

The module implementation must use the canonical workflow-module layout:

```text
src/core/task/workflow-runtime/workflow-modules/validate-story/
  index.ts
  validateStoryToolSchemas.ts
  validateStoryWorkflow.ts
  __tests__/
    validateStoryToolSchemas.test.ts
    validateStoryWorkflow.test.ts
```

If prompt projection or registry coverage belongs in an existing shared test file, the action plan must name the exact shared test file and exact imports required.

The module must export the workflow definition from local `index.ts` and register it in `WorkflowRegistry.ts`.

The shipped workflow registry must resolve the workflow by:

- canonical workflow `name`
- `slashCommandName`
- `useSkillName`

The registry must not preserve markdown filename identities such as `validate-story.md` as activation aliases.

## Historical Cleanup Expectations

The validate-story implementation must not introduce or preserve runtime dependencies on:

- `docs/workflows/workflow-runtime/workflow-modules/validate-story/validate-story.md`
- `.cline/skills/bmad-validate-story`
- placeholder workflow state
- managed-workflow state
- `.cline/workflow-config.yaml`
- legacy contextual tool matrix workflow bundles
- workflow-specific document-generation handlers
- workflow-specific completion handlers

## Testing Requirements

The module build must include focused unit tests covering:

- workflow identity, `slashCommandName`, `useSkillName`, display name, description, project subfolder, persona fields, and entry panel description reuse
- workflow registry resolution by workflow name, slash command, and use-skill name
- negative registry coverage proving `validate-story.md` does not resolve as a workflow name, slash command, or use-skill name
- workflow value inventory, including entry project keys, `target_story`, `epics_document`, and `architecture_document`
- absence of AI-writable workflow values
- absence of workflow artifact definitions and document builders
- prerequisite declarations for `target_story`, `epics_document`, and `architecture_document`, including required mode, producing workflow, selected-project subfolder, exact filename or naming pattern, workflow value key, and `outputDocumentReference: "none"`
- runtime-owned prerequisite resolution route before Step 1 model-driven work begins
- acceptance of both `Story-{E}-{S}.md` and `Remediation-story-{E}-{S}-{R}.md` target-story filename forms
- rejection of nonmatching target-story filenames
- runtime prerequisite behavior that persists selected absolute paths to `target_story`, `epics_document`, and `architecture_document`
- runtime prerequisite behavior that stops before model-driven work when a required prerequisite is missing, rejected, or canceled
- Step 1 `checklistLabel`, prompt-source shape, and `project_prompt` route after prerequisite resolution
- Step 1 prompt projection preserving source wording while rendering `{workflow.projectTitle}`, `{workflow.projectFolderName}`, `{workflow.architecture_document}`, `{workflow.epics_document}`, and `{workflow.target_story}`
- prompt projection proving the raw prompt-template tokens `{workflow.projectTitle}`, `{workflow.projectFolderName}`, `{workflow.architecture_document}`, `{workflow.epics_document}`, and `{workflow.target_story}` do not leak after all runtime values are provided
- Step 1 exported tool-schema builder returning exactly the approved model-visible tool names in order and using existing shared/default specs
- prompt integration proving Step 1 projected tools are present in active workflow native/non-native prompt surfaces and forbidden tools are absent
- Step 1 `attempt_completion_succeeded` routing to workflow completion without story index updates, story file moves, artifact allocation, document generation, subagent dispatch, or parent workflow mutation
- absence of runtime dependency on the validate-story source markdown, placeholder workflow state, managed-workflow state, `.md` workflow identity aliases, workflow-specific document-generation handlers, workflow-specific completion handlers, and the legacy tool matrix

Prompt tests must not assert complete prompt strings or duplicate full user-authored prompt bodies as test-owned expected values. The implementation remains required to preserve the exact source-document prompt wording prescribed in this requirements document, but tests must verify prompt behavior through required workflow-value interpolation, prerequisite-dependent model handoff, routing/tool exposure contracts, and absence of unauthorized legacy or invented wording.

Tool-schema tests for existing shared/default tools must verify approved tool names and absence of custom validate-story model-facing schema prose. They must not duplicate or restate existing shared tool descriptions unless the action plan is deliberately testing reuse of the exact shared `ClineToolSpec` objects.

Tests must verify that model-facing schemas do not expose backend-only runtime tools:

- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`
- `resolve_prerequisite_files`
- `resolve_existing_project_artifact`
- `validate_story_index_entry`

## Validation Requirements

The validate-story action plan must prescribe validation commands that include:

- focused validate-story workflow module unit tests
- focused validate-story tool-schema tests
- workflow registry and prompt-projection tests covering slash-command and use-skill activation
- `npm run check-types`
- `npm run lint`
- focused `rg` checks proving forbidden legacy validate-story runtime concepts are not present in the module implementation

If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun the exact blocked validation command before treating the failure as a code defect.

Persistent diffs after implementation must be limited to files authorized by the action plan phase being executed.
