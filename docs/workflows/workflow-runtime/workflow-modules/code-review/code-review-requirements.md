# Code Review Workflow Module Requirements

## Scope

Build the product-owned `code-review` workflow module using `/Users/robertboston/Documents/Cline/Workflows/code-review.md` as the behavior reference. Workflow names must not include `.md`.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide. Use completed workflow module requirements only as structural references where they still align with the guide and current project requirements.

The code-review workflow performs a structured review of a completed story after the `dev-story` workflow has implemented the story and committed the implementation changes. It resolves the target story, collects a commit hash, prepares review artifacts and review-scope guidance, dispatches specialist subagent review workflows, consolidates findings, and creates a remediation story when findings require follow-up work.

The code-review workflow must not implement the child `blind-review`, `edge-case-hunter-review`, or `acceptance-audit-review` workflows. It may assign those child workflows to subagents and locate their output artifacts after the child workflows complete.

Do not rely on the source markdown workflow file, legacy BMAD workflow package files, placeholder workflow state, managed-workflow state, `.cline/workflow-config.yaml`, or other legacy workflow assets at runtime. Source files are migration references only.

## Source Verbiage Fidelity

The code-review requirements must preserve the exact user-provided UI and AI prompt verbiage from `/Users/robertboston/Documents/Cline/Workflows/code-review.md`.

The module must not invent, paraphrase, summarize, or add UI-visible panel titles, `promptMarkdown`, field labels, action labels, static notice content, helper text, descriptions, button labels, or AI prompt text.

If required UI-visible text or prompt text is missing from the source document, the module build must stop and request source-document clarification before action-plan or runtime implementation work proceeds.

## Workflow Identity

- `name`: `code-review`
- `slashCommandName`: `code-review`
- `useSkillName`: `code-review`
- `displayName`: `code review`
- `description`: `This workflow performs a thorough assessment of a completed story to ensure that the prescribed updates were implemented correctly. You should only run this workflow after a story has been implemented via the dev-story workflow, and the files touched during implementation have been staged and committed.`
- `persona`: `quality-control`
- `projectSubfolder`: `review`

The workflow-specific shared entry `WorkflowForm` informational panel must reuse the module-owned description above as the workflow overview text.

## Persona

The code-review module must use the persona prescribed by `/Users/robertboston/Documents/Cline/Workflows/code-review.md`.

The module must copy the persona into module-owned constants and must not read `_bmad/bmm/agents/quality-control.md` or `/Users/robertboston/Documents/Cline/Workflows/code-review.md` at runtime.

The module-owned persona must be a structured `WorkflowPersonaDefinition` for the mapped `quality-control` persona.

- `name`: `Fred`
- `role`: `Quality Control`
- `identity`: `Coordinates quality review after implementation to ensure that code is functional and compliant before it ships to production.`
- `capabilities`: [`QA findings triage & documentation`]
- `communicationStyle`: `precise and detailed`
- `principles`: [`lazily formatted and noncompliant code must never hit the production environment.`]

## Runtime-Owned Values

The code-review module must define its workflow-owned value contract according to `FR-10a` through `FR-10c1`, `FR-21a`, and `FR-21b`.

The module must declare every supported workflow value key in `workflowValueKeys`. `WorkflowRuntime.applyWorkflowValueWrites(...)` must be able to reject or no-op any write outside that inventory per `FR-10c1`, `FR-35g1`, and `FR-35g2`.

The module must declare `entryProjectValueKeys` with exactly these three destinations, and each destination must also appear in `workflowValueKeys`, per `FR-10j1` and `FR-10j2`:

- `projectMode`
- `projectTitle`
- `projectFolderName`

The module must include workflow-value keys for:

- entry project selection values
- `review_folder`, the absolute path to the selected project's `review` folder
- `target_story`, the absolute path to the selected `implementation/stories-review` story or remediation story file
- `selected_story_identity`, the selected target story identity derived from `target_story`
- `selected_story_filename`, the selected target story filename derived from `target_story`
- `epic_identity`, the selected target story's epic identity
- `stories_index`, the derived `implementation/epic-{E}-stories.index.json` absolute path
- `epics_document`, the absolute path to the selected project's `Epics.md`
- `architecture_document`, the absolute path to the selected project's `architecture.md`
- `code_review_output`, the absolute path to `code-review-{target}.md`
- `code_review_output_artifact_family`, the internal artifact-family output key written when `code_review_output` is allocated
- `code_review_output_artifact_identity`, the internal artifact-identity output key written when `code_review_output` is allocated
- `code_review_output_artifact_filename`, the internal artifact-filename output key written when `code_review_output` is allocated
- `code_review_output_artifact_relative_path`, the internal artifact-relative-path output key written when `code_review_output` is allocated
- `review_scope_manifest`, the absolute path to `review-scope-{target}.md`
- `review_scope_manifest_artifact_family`, the internal artifact-family output key written when `review_scope_manifest` is allocated
- `review_scope_manifest_artifact_identity`, the internal artifact-identity output key written when `review_scope_manifest` is allocated
- `review_scope_manifest_artifact_filename`, the internal artifact-filename output key written when `review_scope_manifest` is allocated
- `review_scope_manifest_artifact_relative_path`, the internal artifact-relative-path output key written when `review_scope_manifest` is allocated
- `blind_review_output`, the absolute path to `blind-review-{target}.md` after the child `blind-review` workflow produces it
- `acceptance_audit_output`, the absolute path to `acceptance-audit-{target}.md` after the child `acceptance-audit-review` workflow produces it
- `edge_case_review_output`, the absolute path to `edge-case-hunter-{target}.md` after the child `edge-case-hunter-review` workflow produces it
- `missing_subagent_output_files`, a string array containing expected child output filenames that are missing or empty when Step 2 progression is requested
- `review_commit_hash`, the normalized reviewed commit hash submitted by the user
- `review_commit_parent`, the reviewed commit's parent hash
- `remediation_story`, the absolute path to the generated remediation story when findings are present
- `remediation_story_artifact_family`, the internal artifact-family output key written when `remediation_story` is allocated
- `remediation_story_artifact_identity`, the internal artifact-identity output key written when `remediation_story` is allocated
- `remediation_story_artifact_filename`, the internal artifact-filename output key written when `remediation_story` is allocated
- `remediation_story_artifact_relative_path`, the internal artifact-relative-path output key written when `remediation_story` is allocated
- `remediation_story_parent_identity`, the internal parent-identity output key written when `remediation_story` is allocated
- `review_findings_present`, a boolean indicating whether `code_review_output` contains any recorded findings under the required findings headings
- `upstream_findings_present`, a boolean indicating whether `code_review_output` contains any recorded findings under `## Upstream Failures`

Any workflow form field whose submitted value must survive beyond form-local state must declare a durable workflow-value destination and persist through the runtime value seam.

Workflow values must remain JSON-safe and preserve type/shape. Prompt builders may render workflow values only through deterministic rendering; runtime or tool code requiring string paths, identities, filenames, statuses, arrays, booleans, or object values must validate the expected type and shape.

Workflow-owned values must clear on teardown and participate in safe resume through runtime-owned session state.

## AI-Writable Workflow Values

The code-review module must not define AI-writable workflow values.

No code-review step may expose `set_workflow_values`. Target selection, review artifact derivation, commit metadata persistence, child-output discovery, remediation-story planning, and workflow completion are runtime-owned deterministic behavior or governed backend tool behavior.

## Runtime Artifact Families

The workflow runtime artifact-family registry must support these target-derived review artifact families before the code-review module can be implemented:

| Artifact family | Allocation mode | Identity requirement | Filename pattern | Project folder | Workflow owner |
| --- | --- | --- | --- | --- | --- |
| `blind_review_output` | `derived_from_target` | `target_story_or_remediation_story` | `blind-review-{target}.md` | `review` | `blind-review` |
| `acceptance_audit_output` | `derived_from_target` | `target_story_or_remediation_story` | `acceptance-audit-{target}.md` | `review` | `acceptance-audit-review` |
| `edge_case_review_output` | `derived_from_target` | `target_story_or_remediation_story` | `edge-case-hunter-{target}.md` | `review` | `edge-case-hunter-review` |
| `code_review_output` | `derived_from_target` | `target_story_or_remediation_story` | `code-review-{target}.md` | `review` | `code-review` |
| `review_scope_manifest` | `derived_from_target` | `target_story_or_remediation_story` | `review-scope-{target}.md` | `review` | `code-review` |

`{target}` must be the selected story or remediation-story identity with dots replaced by hyphens. Story `1.1` must produce `1-1`; remediation story `1.1.1` must produce `1-1-1`.

The `code-review` workflow owns creation and document-building for `code_review_output` and `review_scope_manifest`.

The `code-review` workflow does not own creation of `blind_review_output`, `acceptance_audit_output`, or `edge_case_review_output`; it locates those files after the assigned child workflows complete.

The runtime must not preserve the retired `Review-input-{target}.md`, `Review-input-{target}.diff`, `Review-blind-hunter-{target}.md`, `Review-edge-case-hunter-{target}.md`, or `Adversarial-review-{target}.md` artifact families as canonical code-review module outputs.

## Required Prerequisite Files

The code-review workflow requires one selected-project prerequisite file before model-driven work can begin:

| Prerequisite id | Requirement | Producing workflow | Project subfolder | Match | Workflow value key |
| --- | --- | --- | --- | --- | --- |
| `target_story` | required | `dev-story` | `implementation/stories-review` | naming pattern `/^(Story-\d+-\d+|Remediation-story-\d+-\d+-\d+)\.md$/` | `target_story` |

The prerequisite must be declared in `WorkflowDefinition.prerequisiteFiles` and resolved through the runtime-owned `resolve_prerequisite_files` decision action.

Prerequisite selection must not be implemented as a module-owned `selectorDiscovery` workflow form, and it must not mutate shared project-selection behavior.

Runtime-owned prerequisite discovery must resolve only under the selected project root and must target `implementation/stories-review`. It must not accept absolute paths, parent-directory escapes, or files outside the selected project.

If no required story file is discoverable or if the user rejects or cancels story selection, the workflow must inform the user that they must run the producing `dev-story` workflow first and must not proceed to artifact generation, commit-hash collection, model-driven work, remediation-story planning, or completion.

The prerequisite declaration must use `outputDocumentReference: "none"` because code-review does not create an initial output document that records selected prerequisite paths.

## Derived Project Files

After `target_story` is selected, runtime/module logic must derive these project document paths from the selected project:

- `epics_document`: selected project `Epics.md`
- `architecture_document`: selected project `architecture.md`

Runtime/module logic must persist those paths as workflow values before Step 3 prompts may reference them.

If either derived project document is missing, blocked by workspace path policy, or outside the selected project, the workflow must route to `terminal_error` before model-driven review work begins. The terminal error must identify the missing or blocked document and the selected project path.

## Story Identity And Story Index Derivation

After `target_story` is selected, runtime/module logic must derive `selected_story_filename` from the selected path basename.

Runtime/module logic must derive `selected_story_identity` from the selected filename:

- `Story-1-2.md` derives `1.2`
- `Remediation-story-1-2-1.md` derives `1.2.1`

Runtime/module logic must derive `epic_identity` from the first numeric segment of `selected_story_identity`:

- `1.2` derives epic `1`
- `1.2.1` derives epic `1`

Runtime/module logic must derive `stories_index` from the selected story filename as `implementation/epic-{E}-stories.index.json`, where `{E}` is `epic_identity`.

For example, `Story-1-2.md` and `Remediation-story-1-2-1.md` both derive `implementation/epic-1-stories.index.json`.

The code-review workflow must not ask the user to select a story index file. `stories_index` is a runtime-derived value.

If `stories_index` is needed for remediation story planning or story index update behavior and is missing, malformed, blocked by workspace path policy, or does not contain an entry whose `story_identity` and `story_file_name` match the selected story, the workflow must route to `terminal_error` before generating a remediation story or completing the workflow. The terminal error must identify the derived story index path, selected story identity, selected story filename, and the concrete validation failure.

## Entry And Steps

The shared entry `WorkflowForm` remains mandatory for user-facing main-agent workflow invocations. Workflow-specific entry copy must describe the code-review workflow.

The module must define each workflow step as a `WorkflowStepDefinition` that satisfies the main workflow-runtime contract:

- `id` must use canonical `step-{stepNumber}` form and exactly match `stepNumber`
- `stepNumber` must define the runtime step order
- `checklistLabel` must define the focus-chain task text projected to the UI
- `buildPromptSource` must provide module-owned prompt text
- `buildToolSchema` must provide module-owned per-step tool schema
- `decisionTree` must own step progression, form rendering, deterministic actions, transitions, model handoff, and completion behavior
- Any workflow-form or deterministic operation selected by a step must follow the workflow-runtime form and action contracts
- Final-step completion must use workflow-runtime completion and teardown behavior

The module must define these four steps, using these exact `checklistLabel` values:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Resolve Review Target` | Resolve the required target-story prerequisite, derive project/story metadata, create the code-review output artifact, render the commit-hash form, validate the commit hash, generate the review-scope manifest, and transition to Step 2 only after valid review evidence exists. |
| `step-2` | 2 | `Dispatch Specialist Subagent Reviewers` | Model-driven subagent-dispatch step; progress only after user confirmation through `workflow_progress_request` and after all three expected child output documents are present and non-empty. |
| `step-3` | 3 | `Triage & Consolidate Findings` | Model-driven findings triage step; exposes `record_findings` and progresses after user confirmation through `workflow_progress_request`. |
| `step-4` | 4 | `Process Findings & Complete Workflow` | Runtime-driven findings evaluation and remediation-story creation, followed by conditional model-driven remediation-story population when findings are present. |

## Step 1: Resolve Review Target

Step 1 must begin by resolving the `target_story` prerequisite.

After `target_story` is resolved, Step 1 must run deterministic module/runtime logic to:

- set `review_folder` to the selected project's `review` folder
- derive `selected_story_filename`
- derive `selected_story_identity`
- derive `epic_identity`
- derive `stories_index`
- derive `epics_document`
- derive `architecture_document`
- validate the selected story filename convention
- validate the selected story path remains under `implementation/stories-review`
- create `code-review-{target}.md` and persist its absolute path as `code_review_output`
- populate `code_review_output` with the required findings headings

The code review artifact must be populated with exactly:

```md
# Code Review Findings

## Task Failures

## Dev Agent Failures

## Upstream Failures
```

After prerequisite and artifact setup, Step 1 must render one module-owned workflow form session for commit-hash collection.

Panel A must be:

- `panelId`: module-owned Panel A id
- `title`: `Identify Implementation Evidence`
- `promptMarkdown`: `Provide the commit hash for the target story's commit.`
- field kind: `small_text`
- field label: `commit hash`
- field required: `true`
- allowed action: `submit`
- submit action label: `submit`

Panel A must persist the submitted commit hash into workflow state only after runtime validates that the submitted commit hash resolves in the selected project/repo root.

If the provided commit hash is invalid for any reason, Step 1 must continue the same workflow form session to Panel B.

Panel B must be:

- `panelId`: module-owned Panel B id
- `title`: `Invalid Commit Hash`
- `promptMarkdown`: `The provided commit hash is invalid. Please go back and provide a valid commit hash.`
- fields: none
- allowed action: `back`
- back action label: `back`
- `backDestinationPanelId`: Panel A

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

If review-scope preparation succeeds, Step 1 must transition to Step 2.

Step 1 must expose an empty model-facing tool schema through an exported builder from `codeReviewToolSchemas.ts`.

## Step 2: Dispatch Specialist Subagent Reviewers

Step 2 must enter model-driven work through a `project_prompt` decision action.

Step 2 `buildPromptSource` must construct the Step 2 prompt from module-owned code. The Step 2 prompt must preserve this exact source prompt text:

```text
You have been tasked with conducting a QA review for a completed development story through a structured review workflow. You will be provided with instructions which you must follow precisely. If at any point your next task seems unclear or ambiguous, stop and ask the user for guidance.

Your first task is to dispatch subagents and task them with performing specialized code reviews. Your role in this phase is to act as a coordinator while subagents perform the actual code review legwork. Do not perform your own code review. Let the subagents run their specialized workflows, then collect their findings.

*** Launch Subagents: ***
It is critical that you use the exact "use_skill" subagent prompt verbiage provided below. This verbiage triggers a runtime-driven workflow for the subagent which provides them with the instructions needed for their specialized code review.
Launch three subagents and assign their specialized code review workflows:
- Blind Review:
    - You MUST assign the appropriate workflow to this subagent by including this exact phrase, with identical formatting and punctuation in your prompt: Skill: use_skill('blind-review')
    - The blind-review workflow will then activate and provide the subagent with detailed instructions.
- Edge Case Hunter:
     - You MUST assign the appropriate workflow to this subagent by including this exact phrase, with identical formatting and punctuation in your prompt: Skill: use_skill('edge-case-hunter-review')
     - The edge-case-hunter workflow will then activate and provide the subagent with detailed instructions.
- Acceptance Audit Review:
    - You MUST assign the appropriate workflow to this subagent by including this exact phrase, with identical formatting and punctuation in your prompt: Skill: use_skill('acceptance-audit-review')
    - The acceptance-audit-review workflow will then activate and provide the subagent with detailed instructions.
- Track any review layer that fails, times out, or returns no useful output. Once the subagents complete their work, shut them down.

Once all three subagents are done and shut down, call workflow_progress_request to unlock the next workflow step's instructions.
```

Step 2 must expose the tools needed to launch subagents, send user-visible messages, and call `workflow_progress_request`.

Step 2 must not expose `record_findings`, `attempt_completion`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `plan_remediation_story_artifact`, `update_story_index_status`, or retired code-review tools.

When `workflow_progress_request` is confirmed, runtime/module logic must locate the child output documents matching the selected target story:

- `blind-review-{target}.md`
- `acceptance-audit-{target}.md`
- `edge-case-hunter-{target}.md`

Runtime/module logic must persist their full paths as `blind_review_output`, `acceptance_audit_output`, and `edge_case_review_output` before prompting Step 3.

If any expected child output file is missing or empty, runtime/module logic must persist the missing or empty expected filenames as `missing_subagent_output_files`, remain in Step 2, and prompt the AI with exactly:

```text
These subagent output files were not found in the project's review folder:
<missing files>
Please launch a new subagent and assign them to the workflow associated with the missing file.
```

`<missing files>` must be replaced with the missing or empty expected filename list.

Step 2 progression to Step 3 requires both:

- user confirmation in response to `workflow_progress_request`
- all three child output files found and non-empty

## Step 3: Triage & Consolidate Findings

Step 3 must enter model-driven work through a `project_prompt` decision action after `blind_review_output`, `acceptance_audit_output`, and `edge_case_review_output` have been persisted.

Step 3 `buildPromptSource` must construct the Step 3 prompt from module-owned code. The Step 3 prompt must preserve this exact source prompt text, with workflow values rendered by runtime prompt rendering:

```text
Subagent findings are available:
Blind Review: blind_review_output
Edge Case Hunter: edge_case_review_output
Acceptance Audit: acceptance_audit_output

You must read all three documents, assess them following the instructions below, then persist final findings using record_findings.

You may leverage the following additional documents when validating the subagents' findings:
- target_story
- review_scope_manifest
- epics_document
- architecture_document

*** You must build a combined findings record following the following guidelines: ***

1: Validate each finding using the available documentation, performing tightly-scoped line-targeted file reads only when necessary. Drop any findings which you determine to be invalid or false-positives.
2: Assign each finding to one or more of the following categories:
    - task failure: the story tasks/ subtasks failed to prescribe the exact correct revisions. For these findings, you must indicate the relevant task and/or subtask ID from the target story.
    - dev agent failure: the dev agent failed to implement the tasks/ subtasks exactly as written. For these findings, you must indicate the relevant task and/or subtask ID from the target story.
    - upstream failure: the project's backing documentation either prescribed an incorrect solution or underspecified the necessary solution. For these findings, you must indicate the supporting project document which requires revision to support resolution of the finding.

Call record_findings to persist your final set of validated and classified findings. In your tool call, use the following formatting:

{
  findings: Array<{
    finding: string
    categories: Array<"task_failure" | "dev_agent_failure" | "upstream_failure">
    description: string
  }>
}

Once you've persisted the final set of findings (if any), send the user a message providing them with the findings you persisted, or stating that the review is complete with no actionable findings.

After presenting findings to the user, call workflow_progress_request to unlock the next workflow step's instructions.
```

Step 3 must expose `record_findings`, file-read tools needed to read the referenced review/project/story documents, user-message tools, and `workflow_progress_request`.

Step 3 must not expose `attempt_completion`, `set_workflow_values`, `build_workflow_document`, `create_workflow_artifact`, `plan_remediation_story_artifact`, `update_story_index_status`, or retired code-review tools.

When `workflow_progress_request` is confirmed after findings triage, Step 3 must transition to Step 4.

## `record_findings` Tool

The code-review module must add an AI-callable backend workflow tool named `record_findings`.

The tool schema must accept:

```ts
{
  findings: Array<{
    finding: string
    categories: Array<"task_failure" | "dev_agent_failure" | "upstream_failure">
    description: string
  }>
}
```

The tool must be included in the Step 3 schema override and must not be included in any default tool schemas or any non-Step 3 code-review tool schema.

The tool must resolve its target path from the workflow session's `code_review_output` key. The model must not provide the target file path.

`findings` may be an empty array. If `findings` is empty, the tool must make no document changes and must return success indicating that no findings were recorded.

Each successful `record_findings` call must append the submitted findings to the existing `code_review_output` document. The tool must not replace or remove previously recorded findings.

If a submitted finding has multiple categories, the tool must write that finding under each corresponding category heading. This intentional duplication is required so each findings section can be read independently.

For each category heading being updated, the tool must append each submitted finding in exactly this markdown shape:

```md
### {finding}

{description}
```

`{finding}` must be replaced with the submitted `finding` string. `{description}` must be replaced with the submitted `description` string. The tool must preserve the existing document heading order and append new finding blocks beneath the appropriate existing heading.

Category-to-heading mapping must be:

| Category | Heading |
| --- | --- |
| `task_failure` | `## Task Failures` |
| `dev_agent_failure` | `## Dev Agent Failures` |
| `upstream_failure` | `## Upstream Failures` |

The tool must fail without document mutation when:

- there is no active `code-review` workflow session
- `code_review_output` is missing or not a string
- `code_review_output` is blocked by workspace path policy
- `code_review_output` does not exist
- the submitted payload contains unsupported category values
- a finding entry is missing `finding`, `categories`, or `description`
- a finding entry has an empty `finding`, empty `description`, or empty `categories`
- the target document is missing one or more required headings

The tool result must report how many findings were recorded and which category headings were updated. It must not return raw document content.

## Step 4: Process Findings & Complete Workflow

Step 4 must evaluate whether findings are present in `code_review_output` under any of these headings:

- `## Task Failures`
- `## Dev Agent Failures`
- `## Upstream Failures`

Runtime/module logic must persist `review_findings_present` and `upstream_findings_present` immediately after this findings evaluation and before selecting the Step 4 route or prompt variant.

If no findings are present, Step 4 must not prompt the AI agent. Runtime must update the selected target story's story-index status to `complete`, move the selected target story file from `implementation/stories-review` to `implementation/stories-complete`, then complete the workflow.

If findings are present, Step 4 must use the existing runtime-owned `create_workflow_artifact` capability based on `target_story` to create the next remediation story artifact:

- if the target story is `1.1`, the remediation story is `1.1.1`
- if the target story is `1.1.1`, the remediation story is `1.1.2`

Step 4 must then populate the remediation story shell with these exact headings using the runtime-owned `build_workflow_document` capability:

```md
# Story

## General Instructions

## Objective

## Scope

## Scope Boundary

## Requirements

## Known Issues/ Risks/ Technical Debt

## Tasks

## Validation
```

Once the file is generated and populated, runtime must set the full file path for the new artifact as the workflow's `remediation_story` session key and add the new story to the appropriate story index file.

Step 4 must use runtime-owned or backend-only behavior for remediation story planning, artifact creation, initial document build, story index mutation, and story file movement. It must not expose `create_workflow_artifact`, `build_workflow_document`, `plan_remediation_story_artifact`, story index update tools, or story file movement tools to the AI model.

If findings are present, Step 4 must enter model-driven work through a `project_prompt` decision action after runtime has generated and persisted `remediation_story`.

Step 4 prompt construction must include this source prompt text:

```text
Review the findings in code_review_output.
```

If any findings are present under `## Upstream Failures`, the Step 4 prompt must include this exact conditional prompt block:

```text
*** Conditional prompting: Runtime must assess the findings in the code-review-output document. If any findings are present under "upstream failure", then the following prompt must be shown: ***
For findings listed under "upstream failure", determine which project documents require revision before a remediation story can be generated. Project documents include:
- architecture_document
- epics_document

Determine the exact revisions necessary, then message the user providing the exact proposed revisions and justification. Upon user approval, update the project documents with the approved revisions only, then follow the additional instructions below.
*** end conditional prompt block ***
```

When a remediation story was generated, the Step 4 prompt must include this exact conditional prompt block:

```text
*** Conditional prompting: shown only if a remediation story was generated: ***
You'll now prepare a remediation story based on the documented review findings.
Read the following relevant files:
- architecture_document
- epics_document
- target_story

The story file has been generated from a template for you here:
- remediation_story

Your task is to populate the following sections in the generated story document:
- objective
- scope
- scope boundary
- requirements
- known issues/ risks/ technical debt

Present proposed drafts for the content to be added to the user, and add it to the generated document upon user approval. Do not add, delete, or modify document headings.

You must not populate the tasks section of the story document. 

Once you've populated the assigned sections of the story document, use attempt_completion to send a final message to the user informing them that you have produced the remediation story. Include the full file path to the document in your message, which is remediation_story, and remind the user to run the write-remediation-story workflow to finalize the story by generating tasks and subtasks.
*** End conditional prompt block ***
```

Step 4 must expose the file-read and governed file-edit tools needed to read project/story/review documents and edit only the approved remediation story sections and any user-approved upstream project document revisions. Step 4 must expose `attempt_completion`.

Step 4 must not expose `record_findings`, `set_workflow_values`, `create_workflow_artifact`, `build_workflow_document`, `plan_remediation_story_artifact`, `update_story_index_status`, `move_workflow_project_file`, or retired code-review tools.

When `attempt_completion_succeeded` occurs after the Step 4 model-driven remediation-story prompt, runtime must update the selected target story's story-index status to `complete`, move the selected target story file from `implementation/stories-review` to `implementation/stories-complete`, then complete the workflow.

The Step 4 completion story-index update must use backend-only `update_story_index_status` behavior with:

- `storyIndexWorkflowValueKey: "stories_index"`
- `storyIdentityWorkflowValueKey: "selected_story_identity"`
- `status: "complete"`
- `expectedCurrentStatus: "review"`

The Step 4 completion story-file move must use runtime-owned `move_project_file` behavior with:

- `sourceFolderSegments: ["implementation", "stories-review"]`
- `destinationFolderSegments: ["implementation", "stories-complete"]`
- `filenameWorkflowValueKey: "selected_story_filename"`

If the completion story-index update or completion story-file move fails, the workflow must route to `terminal_error` and must not complete the workflow. The terminal error must include the concrete backend failure reason.

## Terminal Error Handling

When these requirements state that the workflow routes to `terminal_error`, the runtime must:

- stop the current workflow progression
- not transition to the next step
- not complete the workflow
- not perform later mutations after the failure point
- preserve any files and workflow values already changed before the failure point unless the failing operation itself is atomic and can roll back safely
- show a user-visible error message that includes the failed operation name, relevant file path or story identity when applicable, the concrete reason, and the required user action when known

For AI-callable `record_findings` errors, invalid tool requests must return a model-visible tool failure with the same error-message detail and must not mutate the findings document.

## Tool Cleanup And Legacy State Removal

The code-review module build must not preserve legacy standalone code-review completion-handler behavior as a separate workflow-completion seam.

Any surviving `code_review_spec_update` behavior must be re-established as ordinary code-review workflow-module steps, next-action decision actions, document builders, or tool-backed operations before completion criteria are satisfied. If no surviving behavior is required by this requirements document, the legacy handler, registry entries, model-facing schema surfaces, prompt references, tests, and response registry entries must be removed.

The code-review module build must delete or replace legacy review-input artifact support:

- `Review-input-{target}.md`
- `Review-input-{target}.diff`
- `BuildReviewInputToolHandler`
- `BuildReviewDiffOutputToolHandler`
- model-facing `build_review_diff_output`

The code-review module build must not migrate `.cline/skills/bmad-code-review/**/*`. The approved disposition for the legacy BMAD code-review workflow package is delete. Runtime implementation must not depend on those files before deletion.

`SubagentToolHandler.ts` must remain workflow-agnostic. Code-review-specific review-layer orchestration belongs in the code-review workflow module and `WorkflowRuntime`, not in the generic subagent handler.

## Tool Schema Ownership

The code-review module must own its model-facing tool schemas in:

```text
src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewToolSchemas.ts
```

`codeReviewWorkflow.ts` must not define inline `ClineToolSpec` objects, inline tool arrays, local tool-schema builder bodies, or fallback empty schemas.

Every `WorkflowStepDefinition.buildToolSchema(...)` must delegate to a named export from `codeReviewToolSchemas.ts`.

The returned `readonly ClineToolSpec[]` is the complete model-visible workflow tool surface for that turn.

Model-facing schemas must not include backend-only runtime-owned tools unless a future requirement explicitly approves projection.

The code-review module must not preserve `.md` activation aliases such as `code-review.md`.

## Registration

The code-review module must export its workflow definition from:

```text
src/core/task/workflow-runtime/workflow-modules/code-review/index.ts
```

The shipped workflow registry must register code-review by canonical:

- `name`
- `slashCommandName`
- `useSkillName`

The registry must reject or fail to resolve `code-review.md` as a workflow name, slash command, or skill alias.

## Testing Requirements

The code-review module build must add focused tests for:

- workflow identity, display name, description, slash command, skill name, persona, and project subfolder
- shared entry panel prompt using the module description
- workflow value inventory and entry project value keys
- required target-story prerequisite declaration using the canonical story/remediation-story filename pattern under `implementation/stories-review`
- Step 1 prerequisite routing and deterministic target-story setup
- story filename to story identity, epic identity, and derived story index path
- derived `Epics.md` and `architecture.md` path persistence
- target-derived artifact family support for `code-review-{target}.md` and `review-scope-{target}.md`
- absence of retired review-input and old review-layer artifact families from code-review module outputs
- `code_review_output` initial document headings
- Step 1 workflow form Panel A exact field shape and action label
- invalid commit hash route to same-session Panel B with exact title, prompt, action label, and back destination
- valid commit hash route through deterministic review-scope preparation
- review scope manifest path, heading order, changed-file table shape, target command rendering, and workflow-value persistence
- Step 1 terminal error behavior for failed review-scope preparation
- Step 2 exact tool schema names and forbidden tool absence
- Step 2 prompt source shape, including non-empty required workflow-value rendering and required subagent assignment markers
- Step 2 child output discovery for `blind-review-{target}.md`, `acceptance-audit-{target}.md`, and `edge-case-hunter-{target}.md`
- Step 2 missing/empty child output prompt behavior without transitioning to Step 3
- Step 2 transition to Step 3 only after user confirmation and all three child outputs are found and non-empty
- Step 3 exact tool schema names, including `record_findings`
- Step 3 prompt source shape, including non-empty document path rendering for `blind_review_output`, `acceptance_audit_output`, and `edge_case_review_output`
- `record_findings` active workflow gating
- `record_findings` payload validation
- `record_findings` empty-array no-op success
- `record_findings` append semantics
- `record_findings` multi-category duplication across headings
- `record_findings` rejection when required headings are missing
- `record_findings` absence from non-Step 3 schemas and default schemas
- Step 3 transition to Step 4 after `workflow_progress_request` confirmation
- Step 4 no-findings route through target-story status update to `complete`, target-story file move from `implementation/stories-review` to `implementation/stories-complete`, and workflow completion without prompting the AI
- Step 4 findings route through remediation story artifact planning, artifact creation, initial document build, story index update, and prompt projection
- Step 4 upstream-failure conditional prompt inclusion
- Step 4 remediation-story conditional prompt inclusion when a remediation story is generated
- Step 4 exact tool schema names and forbidden backend-only tool absence
- Step 4 `attempt_completion_succeeded` route through target-story status update to `complete`, target-story file move from `implementation/stories-review` to `implementation/stories-complete`, and `complete_workflow`
- workflow completion only after Step 4 procedures finish
- deletion or retirement of `Review-input-{target}.md`, `Review-input-{target}.diff`, `BuildReviewInputToolHandler`, `BuildReviewDiffOutputToolHandler`, and `build_review_diff_output`
- absence of runtime reads from `/Users/robertboston/Documents/Cline/Workflows/code-review.md`, `.cline/skills/bmad-code-review/**/*`, and BMAD agent files

Prompt-related tests must avoid brittle full-prose assertions for editable prompt bodies. They must verify behavior, routing, schema exposure, non-empty prompt insertion where required, required placeholder rendering, absence of forbidden legacy values, current step details projected in the correct payload location, and projected tool schema matching the prompt's tool references.

Tool-schema tests must assert exact tool names and forbidden backend-only tool absence.

Handler tests must cover `record_findings` through runtime workflow values and must not require the model to provide the target findings document path.

Prompt integration tests must prove:

- current step details appear in the input payload, not system instructions
- code-review workflow schema is projected only when code-review is active
- Step 3 projects `record_findings`
- Step 4 projects `attempt_completion`
- retired tools are not projected
- backend-only runtime tools are not statically exposed

## Validation Requirements

Implementation phases must use focused validation appropriate to each changed surface, including:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewToolSchemas.test.ts
npm run test:unit -- src/core/task/tools/handlers/__tests__/<code-review-record-findings-test-file>.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
```

The action plan may refine exact focused test filenames after it inspects the final code/test layout, but it must keep validation scoped to the surfaces changed in each phase and must stop on the first non-environment validation failure.

Add focused negative `rg` checks for retired surfaces after the relevant cleanup phase, including:

```bash
rg -n "Review-input|build_review_diff_output|BuildReviewInputToolHandler|BuildReviewDiffOutputToolHandler" src/core/task src/core/prompts docs/workflows/workflow-runtime/workflow-modules/code-review
rg -n "code-review\\.md|bmad-code-review" src/core/task/workflow-runtime src/core/prompts
```

The `rg` checks must inspect hits in context. Historical docs and explicit negative test assertions are not runtime regressions by themselves.
