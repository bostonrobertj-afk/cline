# Edge Case Hunter Review Workflow Module Requirements

## Scope

Build the product-owned `edge-case-hunter-review` workflow module using `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use completed workflow module requirements, especially `code-review` and `blind-review`, only as structural references where they still align with the guide, current project requirements, and the edge-case-hunter-review source instructions.

The edge-case-hunter-review workflow performs an edge case review of implementation changes using Git-backed evidence, a target story, and a review scope manifest. The AI agent must trace changed code and narrowly relevant adjacent surfaces to identify overlooked boundary, lifecycle, integration, configuration, and adjacent-file issues. The AI agent must write its findings to the workflow output document and complete the workflow after reporting the review result.

The edge-case-hunter-review workflow may run as a user-facing main-agent workflow or as a child/subagent workflow assigned by another workflow. Main-agent activation uses the shared workflow entry form, prerequisite story selection, Step 1 commit-hash form, deterministic review-scope manifest generation, and output artifact generation. Child/subagent activation bypasses all user-facing forms and prerequisite UI, inherits required workflow values from the parent session, creates its own edge-case review output artifact, and proceeds directly to model-driven review.

Do not rely on the source markdown workflow file, legacy BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

## Source Verbiage Fidelity

The edge-case-hunter-review requirements must preserve the exact user-provided UI and AI prompt verbiage from `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md`.

The module must not invent, paraphrase, summarize, or add UI-visible panel titles, `promptMarkdown`, field labels, action labels, static notice content, helper text, descriptions, button labels, or AI prompt text.

If required UI-visible text or prompt text is missing from the source document, the module build must stop and request source-document clarification before action-plan or runtime implementation work proceeds.

## Workflow Identity

- `name`: `edge-case-hunter-review`
- `slashCommandName`: `edge-case-hunter-review`
- `useSkillName`: `edge-case-hunter-review`
- `displayName`: `edge case hunter review`
- `description`: `In this workflow, the agent acts as a path tracer, walking every branching path to identify every edge case associated with recent code updates to ensure that no detail was overlooked during implementation.`
- `persona`: `quality-control`
- `projectSubfolder`: `review`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above as the workflow overview text for user-facing main-agent workflow activation.

The module must not register `review-edge-case-hunter`, `review-edge-case-hunter.md`, or any `.md` suffixed alias as a workflow name, slash command, or use-skill name.

## Persona

The edge-case-hunter-review module must use the persona prescribed by `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md`.

The module must copy the persona into module-owned constants and must not read `_bmad/bmm/agents/quality-control.md` or `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md` at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition` for the mapped `quality-control` persona.

- `name`: `Fred`
- `role`: `Quality Control`
- `identity`: `Coordinates quality review after implementation to ensure that code is functional and compliant before it ships to production.`
- `capabilities`: [`rigorous edge case analysis of preproduction code`]
- `communicationStyle`: `precise and detailed`
- `principles`: [`small details at overlooked boundaries can make or break a product. Finding the small things up-front saves countless hours of triage and bug-fixing later.`]

## Runtime-Owned Values

The edge-case-hunter-review module must define its workflow-owned value contract according to `FR-10a` through `FR-10c1`.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- `target_story`, the absolute path to the selected or inherited `implementation/stories-review` story or remediation story file
- `selected_story_identity`, the dotted numeric story identity derived from the basename of `target_story`
- `review_commit_hash`, the normalized reviewed commit hash
- `review_commit_parent`, the reviewed commit's parent hash
- `review_scope_manifest`, the absolute path to `review-scope-{target}.md`
- `review_scope_manifest_artifact_family`, the internal artifact-family output key written when `review_scope_manifest` is allocated
- `review_scope_manifest_artifact_identity`, the internal artifact-identity output key written when `review_scope_manifest` is allocated
- `review_scope_manifest_artifact_filename`, the internal artifact-filename output key written when `review_scope_manifest` is allocated
- `review_scope_manifest_artifact_relative_path`, the internal artifact-relative-path output key written when `review_scope_manifest` is allocated
- `edge_case_review_output`, the absolute path to `edge-case-hunter-{target}.md`
- `edge_case_review_output_artifact_family`, the internal artifact-family output key written when `edge_case_review_output` is allocated
- `edge_case_review_output_artifact_identity`, the internal artifact-identity output key written when `edge_case_review_output` is allocated
- `edge_case_review_output_artifact_filename`, the internal artifact-filename output key written when `edge_case_review_output` is allocated
- `edge_case_review_output_artifact_relative_path`, the internal artifact-relative-path output key written when `edge_case_review_output` is allocated

Any workflow form field whose submitted value must survive beyond form-local state must declare a durable workflow-value destination and persist through the runtime value seam.

Workflow values must remain JSON-safe and preserve type/shape. Prompt builders may render workflow values only through deterministic rendering; runtime or tool code requiring string paths, identities, filenames, statuses, arrays, booleans, or object values must validate the expected type and shape.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state.

## AI-Writable Workflow Values

The edge-case-hunter-review module must not define AI-writable workflow values.

No edge-case-hunter-review step may expose `set_workflow_values`. Target story selection, commit metadata persistence, review-scope manifest persistence, artifact derivation, and workflow completion are runtime-owned deterministic behavior or governed backend behavior.

## Runtime Artifact Families

The workflow runtime artifact-family registry must support these target-derived review artifact families before the edge-case-hunter-review module can be implemented:

| Artifact family | Allocation mode | Identity requirement | Filename pattern | Project folder | Workflow owner |
| --- | --- | --- | --- | --- | --- |
| `review_scope_manifest` | `derived_from_target` | `target_story_or_remediation_story` | `review-scope-{target}.md` | `review` | `code-review` and `edge-case-hunter-review` main-agent activation |
| `edge_case_review_output` | `derived_from_target` | `target_story_or_remediation_story` | `edge-case-hunter-{target}.md` | `review` | `edge-case-hunter-review` |

`{target}` must be the selected or inherited story or remediation-story identity with dots replaced by hyphens. Story `1.1` must produce `1-1`; remediation story `1.1.1` must produce `1-1-1`.

The edge-case-hunter-review workflow owns creation of `edge_case_review_output`.

For user-facing main-agent activation, the edge-case-hunter-review workflow also owns creation and population of `review_scope_manifest`, mirroring the review-scope manifest behavior used by the `code-review` workflow. For child/subagent activation, the workflow must inherit `review_scope_manifest` from the parent workflow session and must not create or replace that inherited manifest.

The module must derive a module-owned `selected_story_identity` workflow value from `target_story` after prerequisite resolution or child inheritance. The derived value must be the story or remediation-story identity in dotted numeric form, such as `1.1` or `1.1.1`, parsed only from the basename of `target_story` using the approved story filename patterns. The artifact definitions for `review_scope_manifest` and `edge_case_review_output` must use `selected_story_identity` as `targetIdentitySource`.

The module must not parse edge-case review output artifact filenames, replace output artifact separators, derive lineage segments from output artifact paths, or compute target artifact identities from any source other than the basename of `target_story` using the approved story filename patterns.

The module artifact definitions must map runtime artifact output values into the workflow values listed above. In particular:

- `review_scope_manifest.outputValueKeys.artifactAbsolutePath` must be `review_scope_manifest`
- `edge_case_review_output.outputValueKeys.artifactAbsolutePath` must be `edge_case_review_output`

The source instructions prescribe only the edge-case output artifact filename and output workflow value. They do not prescribe initial document headings or initial document body content for `edge_case_review_output`. The module must not invent initial edge-case output headings. The runtime-owned artifact creation may create an empty document for the model to populate during Step 2.

The edge-case-hunter-review module must use only `edge-case-hunter-{target}.md` as its canonical output artifact filename form.

The runtime must not preserve `Review-edge-case-hunter-{target}.md`, `review_edge_case_hunter`, `ReviewEdgeCaseHunter`, or other legacy edge-case-hunter artifact filename or artifact-family forms as canonical module outputs.

## Required Prerequisite Files

For user-facing main-agent activation, the edge-case-hunter-review workflow requires one selected-project prerequisite file before Step 1 commit-hash collection, review-scope manifest generation, and edge-case output artifact generation can complete:

| Prerequisite id | Requirement | Producing workflow | Project subfolder | Match | Workflow value key |
| --- | --- | --- | --- | --- | --- |
| `target_story` | required | `dev-story` | `implementation/stories-review` | naming pattern `/^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/` | `target_story` |

The prerequisite must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action.

Prerequisite selection must not be implemented as a module-owned `selectorDiscovery` workflow form, and it must not mutate shared project-selection behavior.

Runtime-owned prerequisite discovery must resolve only under the selected project root and must target `implementation/stories-review`. It must not accept absolute paths, parent-directory escapes, or files outside the selected project.

If no required story file is discoverable or if the user rejects or cancels story selection, the workflow must inform the user that a story file in `implementation/stories-review` is required and must not proceed to commit-hash collection, review-scope manifest generation, edge-case output artifact generation, model-driven work, or completion.

The prerequisite declaration must use `outputDocumentReference: "none"` because edge-case-hunter-review does not create an initial output document that records selected prerequisite paths.

## Child/Subagent Activation

The edge-case-hunter-review workflow may be activated for a subagent through parent-owned subagent workflow assignment. The subagent must not call `use_skill` itself. Workflow assignment must follow the global subagent workflow-session requirements in `FR-62a` through `FR-62q`.

When activated as a child/subagent workflow, the edge-case-hunter-review workflow must inherit these workflow values from the parent workflow session:

- `review_commit_hash`
- `review_commit_parent`
- `target_story`
- `review_scope_manifest`

Child/subagent workflow activation must copy project selection from the parent workflow session as runtime activation context, not through the workflow-value inheritance map.

The workflow must not require runtime to persist whether edge-case-hunter-review was activated as a main-agent workflow or child/subagent workflow. Instead, Step 1 must use workflow-value state as the gate for progression: `edge_case_review_output` must not be generated and Step 2 must not be projected unless `target_story`, `review_commit_hash`, `review_commit_parent`, and `review_scope_manifest` are all present as non-empty strings.

When activated as a child/subagent workflow, the edge-case-hunter-review workflow must bypass:

- the mandatory shared workflow overview/project-selection form
- `resolve_prerequisite_files`
- the Step 1 commit-hash workflow form
- review-scope manifest creation
- any other user-facing workflow form

When activated as a child/subagent workflow and `target_story`, `review_commit_hash`, `review_commit_parent`, and `review_scope_manifest` are already inherited and valid, the workflow must bypass prerequisite selection, the Step 1 commit-hash workflow form, and review-scope manifest generation, create `edge_case_review_output` for the inherited `target_story`, and project the Step 2 prompt.

If one or more required inherited values is missing or invalid during child/subagent activation, the workflow must route to `terminal_error`. The terminal error must identify the missing or invalid inherited workflow values and state that edge-case-hunter-review cannot start without parent-provided review evidence.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the edge-case-hunter-review workflow using the module-owned description.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`
- `stepNumber` must define the runtime step order
- `checklistLabel` must define the focus-chain task text projected to the UI
- `buildPromptSource` must provide module-owned prompt text
- `buildToolSchema` must provide module-owned per-step tool schema
- `decisionTree` must own step progression, form rendering, deterministic actions, transitions, model handoff, and completion behavior
- Any workflow-form or deterministic operation selected by a step must follow the workflow-runtime form and action contracts
- Final-step completion must use workflow-runtime completion and teardown behavior

The module must define these two steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Gather Inputs & Generate Output File` | For main-agent activation, resolve `target_story`, collect and validate the commit hash, persist `review_commit_hash` and `review_commit_parent`, generate and persist `review_scope_manifest`, create `edge_case_review_output`, and transition to Step 2 only after valid review evidence, manifest, and output artifact exist. For child/subagent activation, validate inherited workflow values, create `edge_case_review_output`, and transition to Step 2 without rendering any forms or generating a new review-scope manifest. |
| `step-2` | 2 | `Conduct Exhaustive Path Analysis` | Model-driven edge case review step. Project the source-prescribed prompt, expose only the model-visible tools required for Git-backed inspection, implementation source review, output document writing, ordinary user messaging, and final completion, and complete the workflow after successful `attempt_completion`. |

The edge-case-hunter-review workflow has no entry singleton artifacts. Its Step 1 decision tree must not branch on `entry_artifact_resolution_completed`, must not inspect `creationRequired`, and must not use the singleton artifact startup flow described in the module build guide. Runtime-owned entry artifact resolution may complete with an empty artifact resolution list before Step 1 orchestration, and the module must proceed through its Step 1 entry branch using normal prerequisite, deterministic procedure, and target-derived artifact allocation routes.

## Step 1: Gather Inputs & Generate Output File

For user-facing main-agent activation, Step 1 must begin by resolving the `target_story` prerequisite.

After `target_story` is resolved, Step 1 must render one module-owned workflow form session for commit-hash collection.

Panel A must be:

- `panelId`: module-owned Panel A id
- `title`: `Identify Implementation Evidence`
- `promptMarkdown`: `Provide the commit hash for the target story's commit.`
- field kind: `small_text`
- field label: `commit hash`
- field required: `true`
- allowed action: `submit`
- submit action label: `submit`

Once Panel A is submitted, runtime must perform this deterministic procedure:

1. Read the user-submitted commit hash from the workflow form.
2. Resolve the selected project repo root from `target_story`.
3. Verify the selected project is inside a Git work tree:

```bash
git rev-parse --is-inside-work-tree
```

4. Normalize/validate the submitted hash as a commit:

```bash
git rev-parse --verify <submittedCommitHash>^{commit}
```

The stdout becomes `review_commit_hash`.

5. Resolve the parent of that normalized commit:

```bash
git rev-parse <normalizedCommitHash>^
```

The stdout becomes `review_commit_parent`.

6. Persist both workflow values:

```ts
review_commit_hash: normalizedCommitHash
review_commit_parent: parentHash
```

If any of those Git commands fail or return empty output, the deterministic procedure must return success without writing `review_commit_hash` or `review_commit_parent`. Step 1 must then continue the same workflow form session to Panel B.

Panel B must be:

- `panelId`: module-owned Panel B id
- `title`: `Invalid Commit Hash`
- `promptMarkdown`: `The provided commit hash is invalid. Please go back and provide a valid commit hash.`
- fields: none
- allowed action: `back`
- back action label: `back`
- `backDestinationPanelId`: Panel A

Panel B must be shown only when the commit hash is invalid for any reason.

If the submitted commit hash is valid, Step 1 must perform deterministic review-scope preparation:

- confirm the selected project/repo root is a Git repository
- confirm the submitted commit hash resolves in that repo
- derive the commit parent
- collect changed file status with `git show --name-status <commit_hash>`
- collect additions/deletions with `git show --numstat <commit_hash>`
- derive per-file targeted review commands
- read `target_story`
- extract story identity, tasks/subtasks, and allowed files
- identify committed files that are outside the story's allowed files
- identify allowed files not touched by the commit
- preserve the story task/subtask context as review guidance, not as proof of implementation
- generate `review-scope-{target}.md` in the selected project's `review` folder
- persist the manifest path as `review_scope_manifest`
- persist normalized commit metadata as `review_commit_hash` and `review_commit_parent`

The review scope manifest must use these headings exactly:

```md
# Review Scope Manifest

## Source

## Summary

## Changed Files

## Review Targets

## Suggested Review Strategy
```

The review scope manifest must include:

- source commit metadata
- changed-file table
- allowed-file comparison
- task/subtask summary
- targeted per-file review commands

The `## Source` section must include:

- `Commit: <hash>`
- `Parent: <parent hash>`
- `Story: <target_story path>`
- `Generated from: git show --name-status --numstat <hash>`

The `## Summary` section must include:

- file count
- added-file count
- modified-file count
- deleted-file count
- total additions/deletions

The `## Changed Files` section must include a table with `Status`, `Path`, `Additions`, and `Deletions` columns.

The `## Review Targets` section must include each changed file path, its status, the reason to inspect it, and a targeted `git show <hash> -- <path>` command.

The `## Suggested Review Strategy` section must include the source-prescribed strategy:

```md
- Start with modified/added implementation files.
- Inspect deleted files only for unintended removal.
- Use targeted git show commands per file rather than loading the whole commit diff.
```

If review-scope preparation fails after a valid commit hash is submitted, Step 1 must route to `terminal_error`. The terminal error must identify the failed operation and the concrete backend failure reason.

For any activation path, Step 1 output file generation must run every time the workflow runs.

Once `target_story`, `selected_story_identity`, `review_commit_hash`, `review_commit_parent`, and `review_scope_manifest` are available and valid for the activation path, runtime must generate this artifact in the selected project's `review` folder:

```text
edge-case-hunter-<target>.md
```

Where `<target>` is the story identity for `target_story` with dots replaced by hyphens.

Examples:

- Story identity `1.1` produces `edge-case-hunter-1-1.md`
- Remediation story identity `1.1.1` produces `edge-case-hunter-1-1-1.md`

The full file path for the generated document must be set as the workflow's `edge_case_review_output` session key.

If edge-case output artifact creation fails, Step 1 must route to `terminal_error`. The terminal error must identify the failed artifact operation, the selected or inherited `target_story`, and the concrete backend failure reason.

If review-scope preparation and edge-case output artifact creation succeed, Step 1 must transition to Step 2.

Step 1 must expose an empty model-facing tool schema through an exported builder from `edgeCaseHunterReviewToolSchemas.ts`.

## Step 2: Conduct Exhaustive Path Analysis

Step 2 must enter model-driven work through a `project_prompt` decision action.

Step 2 `buildPromptSource` must construct the Step 2 prompt from module-owned code. The Step 2 prompt must preserve this exact source prompt text, with workflow values rendered by runtime prompt rendering:

```text
Your task is to conduct an edge case review before recently built or modified code ships to production.

Your review is not a general implementation review. Your job is to find overlooked boundary, lifecycle, integration, configuration, and adjacent-file cases that may have been missed during implementation.

Review the following:
- Review Scope: review_scope_manifest
- Target Story: target_story
- Commit hash for the implemented code: review_commit_hash
- Parent commit hash before implementation: review_commit_parent

Use `review_scope_manifest` as the starting map for the review. Use the commit hash and parent hash to inspect the implementation diff when you need to verify exact changed code.

1. Identify every changed file, changed symbol, changed workflow value, changed tool/schema contract, changed route/action, changed persisted artifact, changed test fixture, changed validation path, changed prompt surface, or changed configuration surface described by the review scope.

2. For each changed item, trace outward to the adjacent surfaces that could be affected:
   - callers and callees
   - imports and exports
   - type definitions and discriminated unions
   - schema builders and tool handlers
   - runtime routing and workflow values
   - persisted files, artifact metadata, and cleanup paths
   - prompt projection and continuation behavior
   - validation, error handling, retry, and terminal-error paths
   - tests and fixtures that claim to cover the behavior

3. Walk the boundary paths for each changed or adjacent surface. Focus on edges where values, states, files, or control flow transition:
   - missing else/default branches
   - null, empty, malformed, duplicate, stale, or missing values
   - renamed, moved, copied, or deleted files
   - partial success, retry, rollback, cancellation, timeout, or failed cleanup
   - ordering dependencies between route actions
   - stale cache, stale workflow values, or un-cleared session state
   - incompatible old callers, persisted data, or restored sessions
   - changed tests that no longer match runtime behavior

4. Ask, for each boundary path: “Does the current implementation actually handle this path?” Verify using the changed code and narrowly relevant adjacent code. Do not assume coverage from intent, naming, or happy-path tests.

5. Ask, for each changed item: “What nearby file, registration, type, schema, route, prompt, fixture, or cleanup path should have changed with this, but did not?” Treat missing adjacent updates as findings when supported by evidence.

6. Collect only unhandled or suspicious boundary paths as findings. Discard paths that are clearly handled.

7. Re-run the review once from the opposite direction: start from tests, schemas, routes, artifact outputs, and persisted workflow values, then trace back to the implementation code. Add any newly discovered unhandled paths to findings.

8. Document your findings in edge_case_review_output. For each finding, include:
   - finding: a short title
   - description: a detailed explanation including:
     - what is wrong
     - the trigger condition
     - the likely consequence if not addressed
     - exact supporting code location with file path, start line, and end line for the smallest supporting line range
     - if the finding depends on multiple non-contiguous locations, include each cited location
     - what the cited code proves

If no findings were identified, add a note to edge_case_review_output stating that no findings were found after thorough edge case review.

9. Use attempt_completion to provide a final report including:
   - number of findings, or a clear statement that no findings were identified
   - the full file path for your recorded findings: edge_case_review_output
   - an overview of the findings you documented, if any
```

The prompt renderer must replace `review_scope_manifest`, `target_story`, `review_commit_hash`, `review_commit_parent`, and `edge_case_review_output` with their persisted workflow values before projection. The projected prompt must not leak those placeholder strings when valid workflow values are available.

Step 2 must expose only the model-callable tools required for the source-prescribed work:

- `execute_command`, so the AI can run Git evidence commands using `review_commit_hash` and `review_commit_parent`
- `list_files`, so the AI can inspect local repository structure when needed to interpret changed implementation paths and adjacent surfaces
- `search_files`, so the AI can trace references, registrations, call sites, or missing propagation that are visible from the implementation changes
- `list_code_definition_names`, so the AI can inspect available symbols when the diff requires source-level reference tracing
- `read_file`, so the AI can inspect changed implementation files, review scope manifest contents, target story context, and narrowly relevant supporting code
- `read_file_range`, so the AI can inspect line-targeted source ranges and gather precise evidence for findings
- `apply_patch`, so the AI can update `edge_case_review_output` through a governed patch when that is the appropriate file-write method
- `write_to_file`, so the AI can create or fully replace the `edge_case_review_output` contents when that is the appropriate file-write method
- `send_user_message`, so the AI can send an ordinary user-visible message if it encounters a blocker before final completion
- `attempt_completion`, so the AI can complete the workflow after documenting the review

Step 2 must not expose `web_search`, `web_fetch`, `browser_action`, `ask_followup_question`, `use_subagents`, `use_skill`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `archive_workflow_artifact`, `delete_workflow_artifact`, `move_workflow_project_file`, `workflow_progress_request`, MCP tools, or retired blind-review/code-review/edge-case-hunter tools.

When `attempt_completion_succeeded` occurs in Step 2, the workflow must complete. Edge-case-hunter-review completion must not update story index status, move story files, generate remediation stories, dispatch subagents, or mutate parent workflow state.

## Terminal Error Handling

When these requirements state that the workflow routes to `terminal_error`, the runtime must:

- stop the current workflow progression
- not transition to the next step
- not complete the workflow
- not perform later mutations after the failure point
- preserve any files and workflow values already changed before the failure point unless the failing operation itself is atomic and can roll back safely
- show a user-visible error message that includes the failed operation name, relevant file path or story identity when applicable, the concrete reason, and the required user action when known

## Tool Cleanup And Legacy State Removal

The edge-case-hunter-review module build must not preserve or re-establish legacy edge-case-hunter behavior through placeholder workflow state, managed-workflow state, legacy workflow markdown, legacy `.cline/skills` workflow packages, or retired review artifact names.

The legacy workflow package `.cline/skills/bmad-review-edge-case-hunter/**/*` must be deleted during the module build. Do not migrate or preserve behavior from that package into the new runtime module.

The legacy tool matrix may be used only as migration reference material for historical tool-category intent. It must not participate in runtime schema generation and must not be copied as a one-to-one tool mapping.

The edge-case-hunter-review module must not add specialized backend workflow tools unless normal shared tools cannot safely express the source-prescribed behavior. This requirements document does not require any new AI-callable specialized backend workflow tool.

## Module File Layout

The edge-case-hunter-review implementation should use only the module files it actually needs, consistent with the module build guide:

```text
src/core/task/workflow-runtime/workflow-modules/edge-case-hunter-review/
  edgeCaseHunterReviewWorkflow.ts
  edgeCaseHunterReviewToolSchemas.ts
  index.ts
  __tests__/
    edgeCaseHunterReviewWorkflow.test.ts
    edgeCaseHunterReviewToolSchemas.test.ts
```

The edge-case-hunter-review module must not create a module-owned registry file.

The edge-case-hunter-review module must not create a new module-owned document helper for review-scope manifest rendering. Main-agent review-scope manifest generation must reuse the existing review-scope manifest helper exports from `src/core/task/workflow-runtime/workflow-modules/code-review/reviewScopeManifest.ts`, including `buildReviewScopeManifestModel`, `buildReviewScopeManifestMarkdown`, `parseGitShowNameStatus`, and `parseGitShowNumstat` as needed.

The edge-case-hunter-review workflow may define module-local deterministic orchestration inside `edgeCaseHunterReviewWorkflow.ts` to collect Git output, read the target story, call the existing review-scope manifest helpers, and write the generated manifest to `review_scope_manifest`.

No module-owned document helper, registry file, static data file, or additional module file may be added unless the requirements are revised first to prescribe that file by name and purpose.


## Testing Requirements

The module build must include focused unit tests covering:

- workflow identity, `slashCommandName`, `useSkillName`, display name, description, project subfolder, persona fields, and entry panel description reuse
- workflow registry resolution by workflow name, slash command, and use-skill name
- negative registry coverage proving `review-edge-case-hunter`, `review-edge-case-hunter.md`, and `edge-case-hunter-review.md` do not resolve as workflow names, slash commands, or use-skill names
- workflow value inventory, including entry project keys, `target_story`, `selected_story_identity`, `review_commit_hash`, `review_commit_parent`, `review_scope_manifest`, `edge_case_review_output`, and artifact metadata keys for both `review_scope_manifest` and `edge_case_review_output`
- prerequisite declaration for `target_story` using `implementation/stories-review`, required mode, producing workflow `dev-story`, naming pattern for `Story-{E}-{S}.md` and `Remediation-story-{E}-{S}-{R}.md`, workflow value key `target_story`, and `outputDocumentReference: "none"`
- artifact definitions for `review_scope_manifest` and `edge_case_review_output`, using runtime-owned target-derived artifact families, derived intent mode, `selected_story_identity` target identity source, and output value key mappings
- main-agent Step 1 routing through prerequisite resolution, commit-hash form Panel A, invalid-commit Panel B, review-scope manifest generation, edge-case output artifact creation, and transition to Step 2 after valid commit metadata, manifest, and output artifact allocation
- child/subagent Step 1 routing that bypasses shared entry UI, prerequisite selection, commit-hash workflow forms, and review-scope manifest creation; validates inherited `review_commit_hash`, `review_commit_parent`, `target_story`, and `review_scope_manifest`; creates `edge_case_review_output`; and transitions to Step 2
- Step 1 value-gated routing that refuses to generate `edge_case_review_output` or project Step 2 until `target_story`, `review_commit_hash`, `review_commit_parent`, and `review_scope_manifest` are present
- deterministic commit validation behavior, including successful persistence of normalized commit hash and parent hash, invalid hash routing to Panel B without writing commit values, parent-hash failure routing to Panel B, and selected project not being inside a Git work tree routing to Panel B
- review scope manifest path, heading order, changed-file table shape, allowed-file comparison, target command rendering, and workflow-value persistence for main-agent activation
- review-scope preparation failure routing to `terminal_error` with the concrete backend failure reason
- inherited review-scope manifest missing or invalid child/subagent activation routing to `terminal_error`
- edge-case output artifact creation failure routing to `terminal_error` with the concrete backend failure reason
- Step 1 exported tool-schema builder returning an empty model-visible schema
- Step 2 prompt projection preserving source wording while rendering `review_scope_manifest`, `target_story`, `review_commit_hash`, `review_commit_parent`, and `edge_case_review_output` values without leaking placeholders
- Step 2 exported tool-schema builder returning exactly the approved model-visible tool names
- prompt integration proving Step 2 projected tools are present in active workflow native/non-native prompt surfaces and forbidden tools are absent
- Step 2 `attempt_completion_succeeded` routing to workflow completion without story index updates, story file moves, remediation story generation, subagent dispatch, or parent workflow mutation
- absence of runtime dependency on `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md`, `.cline/skills/bmad-review-edge-case-hunter`, placeholder workflow state, managed-workflow state, old `review-edge-case-hunter` workflow identity aliases, and the legacy tool matrix

Prompt tests must not assert exact editable prompt prose. They must assert behavior and invariants: prompt output exists, required workflow values render non-empty, placeholders do not leak, forbidden legacy text is absent, current step details are projected in the correct payload location, and the projected tool schema matches the prompt's tool references.

## Validation Requirements

The edge-case-hunter-review action plan must prescribe validation commands that include:

- focused edge-case-hunter-review workflow module unit tests
- focused edge-case-hunter-review tool-schema tests
- workflow registry/prompt projection tests covering slash-command and use-skill activation
- subagent child-workflow activation tests covering inherited workflow values and form bypass
- `npm run check-types`
- `npm run lint`

If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos` and rerun the exact blocked validation command before treating the failure as a code defect.

Persistent diffs after implementation must be limited to files authorized by the action plan phase being executed.
