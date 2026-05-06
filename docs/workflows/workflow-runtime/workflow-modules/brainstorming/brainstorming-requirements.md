# Brainstorming Workflow Module Requirements

## Scope

Build the product-owned `brainstorming` workflow module using `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md` as the behavior reference. Workflow names must not include `.md`.

Do not revive deleted legacy helpers or placeholder-era workflow-specific tools, including `brainstormingTechniqueLibrary.ts`, `brainstormingSessionFiles.ts`, `prepare-brainstorming-session.ts`, or `capture-brainstorming-topic.ts`.

This prohibition does not forbid newly specified shared workflow tools or module-owned registry code required by this document, including `get_brainstorming_methods` and `append_brainstorming_selected_technique`.

## Workflow Identity

- `name`: `brainstorming`
- `slashCommandName`: `brainstorming`
- `useSkillName`: `brainstorming`
- `persona`: `analyst`
- `projectSubfolder`: `discovery`

## Runtime-Owned Values

The brainstorming module must define its workflow-owned value contract according to `FR-10a` through `FR-10c1`, `FR-21a`, and `FR-21b`.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory per `FR-10c1`, `FR-35g1`, and `FR-35g2`.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`, per `FR-10j1` and `FR-10j2`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- optional `context_file`
- `session_topic`
- `has_session_goals`
- optional `session_goals`
- `selected_approach`
- `selected_techniques`
- `random_technique_candidate`
- `random_technique_rejected_ids`
- `random_technique_confirmation`
- `techniques_used`
- `ideas_generated`
- `output_file`, the canonical prompt-readable absolute path to `brainstorming.md`
- output artifact metadata required by `FR-20l` and `FR-20m`, including project context, artifact family, artifact identity, artifact filename, artifact relative path, and artifact absolute path

`selected_techniques` is the canonical selected-technique workflow value. It must be an array of technique objects. Each object must include at least `name` and `description`, and may include `id` and `category`. Workflow code and AI tools must not introduce a separate `selected_technique` value.

The brainstorming artifact definition must map `outputValueKeys.artifactAbsolutePath` to `output_file`. This makes the generic runtime-resolved artifact absolute path available as the workflow's canonical session output file path for later `buildPromptSource` functions and document builders.

Any workflow form field whose submitted value must survive beyond form-local state must declare a durable workflow-value destination and persist through the runtime value seam, per `FR-39f` through `FR-39m`.

Any AI-writable brainstorming values must be exposed only through module-owned active-step tool schema. The active step and prompt variant schema is authoritative for which mutation tools and workflow values are model-visible for that turn. The module must use `set_workflow_values` only when the active prompt variant explicitly exposes replacement-style workflow-value writes, and must use `append_brainstorming_selected_technique` for the selected-technique append semantics specified below, per `FR-35a`, `FR-35g` through `FR-35m`, and `FR-35n` through `FR-35n3`.

Workflow values must remain JSON-safe and preserve type/shape, per `FR-35i` through `FR-35k`. Prompt builders may render workflow values only through deterministic rendering, per `FR-35l`; runtime or tool code requiring string paths or identities must validate non-empty strings per `FR-35m`.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state, per `FR-49a`, `FR-50`, and `FR-52` through `FR-52b`.

## AI-Writable Workflow Values

The brainstorming module must define step-specific AI-writable workflow-value exposure.

| Step | AI-visible mutation tool | Allowed workflow values | Notes |
| --- | --- | --- | --- |
| Step 1 | none | none | Step 1 values are form/deterministic writes only. |
| Step 2 | none | none | Step 2 values are form/deterministic writes only. |
| Step 3 choose/random | `set_workflow_values` | `techniques_used`, `ideas_generated` | `selected_techniques` must not be exposed through `set_workflow_values`. |
| Step 3 suggest | `append_brainstorming_selected_technique` | append tool updates `selected_techniques` | Step 3 suggest must not expose `set_workflow_values`; session notes must be written to `{output_file}` through `build_workflow_document`. |
| Step 4 | none | none | Step 4 writes the output document through `build_workflow_document`. |

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory. Workflow-specific entry copy should describe the brainstorming workflow.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`, per `FR-29b1`.
- `stepNumber` must define the runtime step order.
- `checklistLabel` must define the focus-chain task text projected to the UI.
- `buildPromptSource` must provide module-owned prompt text per `FR-14a` through `FR-14g`.
- `buildToolSchema` must provide module-owned per-step tool schema per `FR-15` and `FR-35`.
- `decisionTree` must own step progression, form rendering, deterministic actions, transitions, model handoff, and completion behavior per `FR-16` and `FR-29`.
- Any workflow-form or deterministic operation selected by a step must follow `FR-39` through `FR-43`.
- Final-step completion must use workflow-runtime completion and teardown behavior per `FR-46` through `FR-49`.

The module must define these four steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Gather Inputs` | Allocate/create `brainstorming.md`, build the initial document shell, render one multi-panel setup form, and write submitted context/topic/goals into the output document. |
| `step-2` | 2 | `Resolve Session Approach` | Present the three approach paths, persist `selected_approach`, route through choose/random/suggest behavior, and write selected technique state into the output document. |
| `step-3` | 3 | `Perform Interactive Brainstorming` | Model-driven facilitation step; may retrieve brainstorming methods when suggestion was requested; progression requires `workflow_progress_request` confirmation. |
| `step-4` | 4 | `Organize Ideas & Plan Next Actions` | Model-driven organization/final-report step that appends the summary to `output_file`, completes the workflow, and triggers teardown after final delivery. |

## Forms And Deterministic Behavior

Step 1 must model progression as explicit decision actions in this order: `allocate_artifact`, `build_workflow_document` for the initial document shell, `render_workflow_form`, `build_workflow_document` for submitted setup values, then `transition_step` to Step 2.

Step 1 must begin with an `allocate_artifact` decision action for the brainstorming session output artifact. The runtime converts that action into `create_workflow_artifact`.

Step 1 must define success and failure routes for the first artifact-allocation result. If the first allocation succeeds, the next action must build the initial document shell. If the first allocation fails, the next action must retry allocation exactly once.

Step 1 must define success and failure routes for the retry allocation result. If the retry succeeds, the next action must build the initial document shell. If the retry fails, the next action must be `terminal_error`.

Step 1 must call `build_workflow_document` after artifact allocation and before the Step 1 workflow form to create the initial document layout with these H1 headings:

- `stepsCompleted`
- `inputDocuments`
- `session topic`
- `session goals`
- `selected approach`
- `selected techniques`
- `ideas generated`
- `context file`

If the initial document-shell build succeeds, the next action must render the Step 1 workflow form. If the initial document-shell build fails, the next action must be `terminal_error`.

The Step 1 workflow form must be triggered by one `render_workflow_form` decision action. Multi-panel behavior must live inside the form definition, not as separate decision actions per panel.

The Step 1 workflow form must include these four panels:

- Panel 1 must show: `You can provide a file to be used as context. If you have a file you'd like to use, enter the file path below. If not, leave the text box empty and click continue` and collect optional `context_file` through a small text area.
- Panel 2 must show: `Please share the details of the topic, problem, or opportunity you'd like to focus on during this session` and collect required `session_topic` through a large text area.
- Panel 3 must show: `Do you have any specific goals for this session?` and collect required `has_session_goals` through a yes/no boolean field.
- Panel 4 must show only when `has_session_goals` is yes. It must show: `What are your goals for this session?` and collect required `session_goals` through a large text area.

The Step 1 workflow form must collect optional context file and required topic/problem/opportunity input. Durable submitted values must persist and clear through workflow-value destinations declared by the module, using the central workflow-form clearing semantics in `FR-39n` through `FR-39r`.

After the Step 1 workflow form completes, the next action must use `build_workflow_document` to populate the already-created brainstorming output artifact by writing `context_file` under `context file`, `session_topic` under `session topic`, and `session_goals` under `session goals` when goals were provided. When that `build_workflow_document` action succeeds, the Step 1 decision tree must select a `transition_step` action targeting Step 2. Step 1 must not rely on implicit completion, optional progression, or model-driven handoff to advance to Step 2.

Step 2 must begin with one `render_workflow_form` decision action for approach selection. The first panel must ask `How would you like to select the brainstorming approach for this session?` and must present a required `radio_group` with exactly these options:

- `I want to choose`
- `I want a random technique`
- `I want you to suggest a technique`

The selected value must persist to `selected_approach` and must be written under the `selected approach` heading in `brainstorming.md` using `build_workflow_document`.

If `selected_approach` is `I want to choose`, the same Step 2 workflow form must continue to category and technique selection panels. The category panel title must be `Which category would you like to explore?` and must use a single dropdown with exactly these categories: `Collaborative`, `Creative`, `Deep`, `Introspective Delight`, `Structured`, `Theatrical`, `Wild`, `Biomimetic`, `Quantum`, and `Cultural`. The technique panel title must be `Which technique would you like?` and must use a single dropdown populated from the selected category. Back navigation must clear stale technique selection and refresh options for the newly selected category.

If `selected_approach` is `I want a random technique`, the Step 2 decision tree must run the deterministic random-selection procedure. When that procedure succeeds, it must persist the selected candidate technique to `random_technique_candidate`, update any retry/exclusion state in `random_technique_rejected_ids`, and re-enter Step 2 next-action evaluation.

After a random candidate exists, Step 2 must render a workflow form panel showing `Random Technique: {technique name}`, `About This Technique: {technique description}`, and `Ready to get started?`. The panel must collect a required `random_technique_confirmation` value with confirm/retry choices.

If the user confirms the random candidate, Step 2 must persist the candidate into `selected_techniques`, write the selected technique name and description under the `selected techniques` heading in `brainstorming.md`, and then transition to Step 3.

If the user requests another random technique, Step 2 must re-run the deterministic random-selection procedure. The procedure must avoid immediately presenting the same rejected candidate again when another eligible technique exists.

If `selected_approach` is `I want you to suggest a technique`, Step 2 must write `user requested technique suggestion` under the `selected techniques` heading.

After the Step 2 approach path completes and the required approach/technique state has been written to `brainstorming.md`, the Step 2 decision tree must select a `transition_step` action targeting Step 3. Step 2 must not rely on implicit completion, optional progression, or model-driven handoff to advance to Step 3.

Technique categories and techniques must come from the module-owned brainstorming technique registry migrated from `brain-methods.csv`.

## Artifact Family Registry Extension

The brainstorming module requires a runtime-owned unnumbered workflow-document artifact family for its session output document.

The implementation must extend the artifact-family registry and related type surface to support a singleton project markdown artifact for brainstorming output, consistent with `FR-20b1a`, `FR-20j3`, and `FR-20j3a`.

The new artifact family must be runtime-owned, not module-owned. The brainstorming module may reference the artifact-family identifier, but must not define or override canonical filename patterns, extensions, numbering scopes, discovery patterns, or path construction, per `FR-20j4` and `FR-20k`.

The new artifact family must use:

- allocation mode: singleton project artifact
- identity requirement: none
- numbering scope: project singleton
- content kind: markdown
- file extension: `.md`
- stable singleton identity: `brainstorming_session`
- canonical filename pattern: `brainstorming.md`
- discovery pattern matching only `brainstorming.md`

Step 1 must allocate/create this artifact through an `allocate_artifact` decision action, which the runtime executes through `create_workflow_artifact`. The runtime must create the empty file and persist project/artifact metadata into workflow values per `FR-20l`, `FR-20m`, and `FR-20n`.

The artifact definition for this family must map the runtime artifact output value keys into brainstorming workflow values. In particular, `outputValueKeys.artifactAbsolutePath` must be `output_file`, so a successful Step 1 artifact allocation persists `session.workflowValues.output_file` with the absolute file path. Later workflow prompts and document builders must read `output_file` rather than recomputing or rediscovering the path.

Subsequent document population or updates must use `build_workflow_document`, which consumes the runtime-resolved destination path and must not allocate identity, choose filenames, or choose folders, per `FR-20p`.

## Brainstorming Technique Registry

The brainstorming module must own a typed brainstorming technique registry migrated from `.cline/skills/bmad-brainstorming/brain-methods.csv`.

The migrated registry must be code-owned module data. Step execution, prompt building, workflow forms, and tools must not read the CSV file at runtime.

Each registry entry must include at least:

- stable technique id or name
- category
- display name
- description

The registry must expose deterministic module APIs for:

- listing supported categories
- listing techniques by category
- retrieving a technique by id or name
- selecting a random technique
- returning the full supported technique inventory for AI use

Step 2 must use this registry to populate category and technique workflow-form options and to perform deterministic random-technique selection.

Step 3 must use `selected_approach` from workflow values to determine whether AI technique suggestion is needed. Step 3 must not require the AI to inspect `brainstorming.md` to determine whether suggestion is needed.

## Random Technique Selection Procedure

The brainstorming module must define a deterministic random-selection procedure for Step 2.

The procedure must be code-owned deterministic workflow logic, not a shared backend tool and not an AI-callable tool. It must run only as part of Step 2 canonical next-action evaluation when `selected_approach` is `I want a random technique` and no current random candidate is available.

The procedure must read from the module-owned brainstorming technique registry, select one eligible technique, persist `random_technique_candidate` and retry/exclusion state in `random_technique_rejected_ids` through the canonical workflow-value seam, and re-enter Step 2 next-action evaluation.

If the current runtime action surface cannot represent this non-tool deterministic state mutation, the implementation must extend the workflow-runtime decision-action surface in alignment with `FR-16a`, `FR-16d`, `FR-29c1` through `FR-29c3`, and `FR-43` rather than modeling random selection as a tool-backed operation.

If no eligible technique can be selected, Step 2 must route to `terminal_error` with a user-visible failure message.

## Selected Technique Append Tool

The implementation must add a shared backend workflow tool named `append_brainstorming_selected_technique`.

The tool handler must live in the shared tool infrastructure, outside the brainstorming workflow module. The tool's validation source must be the brainstorming module-owned technique registry.

`append_brainstorming_selected_technique` must append one accepted technique to the existing `selected_techniques` workflow value without dropping existing entries. The tool must read the current `selected_techniques` array, append the accepted technique, de-dupe by stable id or name, and persist the complete updated array through the workflow-value seam.

The AI must not update `selected_techniques` directly through `set_workflow_values`. Any Step 3 update to `selected_techniques` must use `append_brainstorming_selected_technique`.

The tool must return the updated `selected_techniques` array or a clear failure result.

## Step 3 Prompt Construction

Step 3 must enter model-driven work through a `project_prompt` decision action.

Step 3 `buildPromptSource` must construct one of two explicit prompt variants based on `selected_approach`.

When `selected_approach` is `I want you to suggest a technique`, Step 3 prompt construction must use this prompt text:

Read `{output_file}`.

Call `get_brainstorming_methods` to retrieve the list of supported brainstorming methods. Select a brainstorming technique that seems appropriate based on the topic indicated in `{output_file}`. Propose the selected technique to the user.

After the user accepts the proposed technique, call `append_brainstorming_selected_technique` with the accepted technique name, description, and category/id when available. Do not call `set_workflow_values` for `selected_techniques`.

Then call `build_workflow_document` to replace the `user requested technique suggestion` line under the `selected techniques` heading in `{output_file}` with the accepted technique name and description.

After the accepted technique has been appended and written to `{output_file}`, continue with the shared brainstorming facilitation instructions below.

When `selected_approach` is `I want to choose` or `I want a random technique`, Step 3 prompt construction must use this opening prompt text:

Read `{output_file}`.

Use the already selected brainstorming technique recorded in `{output_file}`. Do not call `get_brainstorming_methods`.

Then include these shared brainstorming facilitation instructions for both prompt variants:

Goal: Guide an interactive brainstorming session from setup through technique selection, idea capture, and final organization, pausing whenever user input or confirmation is needed.

- Engage the user in interactive brainstorming using the selected approach.
- Keep the user in control at each decision point. Pause for clarification, a technique switch, or continuation whenever needed. Record `techniques_used` and `ideas_generated` in `{output_file}` as needed.
- The goal is to generate as many ideas as possible without exhausting the user.
- Techniques for keeping brainstorming going: ask probing questions, ask users how the current idea connects to an earlier idea, offer challenges to the user's idea or assumptions, offer new ideas or angles to keep the conversation going.

Once the user indicates they're ready, use `workflow_progress_request` to confirm and unlock the next workflow step.

Step 3 tool schema must expose exactly the tools required by the selected prompt variant. For the suggestion variant, Step 3 must expose `get_brainstorming_methods`, `append_brainstorming_selected_technique`, `build_workflow_document`, and `workflow_progress_request`. For choose/random variants, Step 3 must expose `build_workflow_document`, `set_workflow_values` for `techniques_used` and `ideas_generated`, and `workflow_progress_request`, but must not expose `get_brainstorming_methods` or `append_brainstorming_selected_technique`.

In the suggestion variant, `techniques_used` and `ideas_generated` must not be exposed as AI-writable runtime workflow values; any needed session notes must be written to `{output_file}` through `build_workflow_document`.

When Step 3 receives a `workflow_progress_request_confirmed` event, the Step 3 decision tree must select a `transition_step` action targeting Step 4. If the request is denied, Step 3 must remain active and return to `project_prompt` for continued brainstorming facilitation.

## Step 4 Prompt Construction

Step 4 must enter model-driven work through a `project_prompt` decision action.

Step 4 `buildPromptSource` must construct the Step 4 prompt from the source workflow prompt, not newly authored implementation copy. The prompt must include this text:

- Review the captured ideas, cluster them into themes, and identify the strongest candidates. Ask the user which ideas matter most right now: high-impact, quick wins, or the most innovative concepts.
- For each prioritized idea, define next steps, resource needs, obstacles, and success indicators.
- Do not extend into solutioning during this workflow. If the user attempts to steer the conversation toward solutioning or planning actions, STOP and tell them that this workflow is scoped to idea-generation, and that they should use one of these workflows for solutioning:
  - create architecture (if the solution(s) will likely require a large body of work consisting of one or more epics)
  - quick spec (if the solution(s) will likely require small patches that can be implemented quickly)
- Append the themes, priorities, and summary to `{output_file}`.
- Send the user a final message indicating that the brainstorming session is complete using `attempt_completion`. Include the full file path of `{output_file}` in this message.

Step 4 tool schema must expose `build_workflow_document` for appending the themes, priorities, and summary to `{output_file}`. Step 4 must also expose `attempt_completion` for final user delivery.

Step 4 completion requires successful final delivery through `attempt_completion`. After that final delivery, the workflow runtime must perform normal workflow completion and teardown. Step 4 must not use a workflow-specific completion handler.

## Prompting And Tools

Step prompts must be module-owned prompt builders. Shared workflow tool handlers live outside workflow modules, but brainstorming module definitions must own when those tools are invoked or exposed for this workflow.

The brainstorming module's canonical tool-schema file is `brainstormingToolSchemas.ts`.

`brainstormingWorkflow.ts` must not define inline tool schemas. Every `buildToolSchema(...)` assignment in the brainstorming workflow definition must delegate directly to an exported builder from `brainstormingToolSchemas.ts`.

`brainstormingToolSchemas.ts` must own the complete model-visible tool schema for each model-facing brainstorming step and variant, including Step 3 choose, Step 3 random, Step 3 suggest, and Step 4.

Step 3 choose/random schemas must expose exactly `build_workflow_document`, `set_workflow_values` for `techniques_used` and `ideas_generated`, and `workflow_progress_request`.

Step 3 suggest schema must expose exactly `get_brainstorming_methods`, `append_brainstorming_selected_technique`, `build_workflow_document`, and `workflow_progress_request`.

Step 4 schema must expose exactly `build_workflow_document` and `attempt_completion`.

`set_workflow_values`, `create_workflow_artifact`, `build_workflow_document`, `workflow_progress_request`, `get_brainstorming_methods`, and `append_brainstorming_selected_technique` may be exposed only through module-owned per-step tool schema when needed.

The implementation must add an AI-callable `get_brainstorming_methods` tool backed by the module-owned brainstorming technique registry.

`get_brainstorming_methods` must be read-only. It must return the supported brainstorming inventory with category, name, and description, and must not mutate workflow values, allocate artifacts, or write to `brainstorming.md`.

Step 3 must expose `get_brainstorming_methods` only when `selected_approach` is `I want you to suggest a technique`. For choose or random paths, Step 3 must not expose that tool and must prompt the AI to use the already selected technique.

## Completion

Step 4 completes through final user delivery and workflow teardown. No workflow-specific completion handler is allowed.

## Cleanup / Compatibility

Remove or update remaining `brainstorming.md` workflow-identifier references in live runtime surfaces, including `workflowPersonaRegistry.ts`, without changing real markdown filenames.
