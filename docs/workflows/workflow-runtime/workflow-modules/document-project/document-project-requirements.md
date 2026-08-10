# Document Project Workflow Module Requirements

## Scope

These requirements define the runtime workflow module for the Document Project workflow. The module must implement the source workflow at `docs/workflows/workflow-runtime/workflow-modules/document-project/document-project.md` within the workflow-runtime module system.

The module must carry forward every applicable requirement from `docs/workflows/workflow-runtime/requirements.md`, align with `docs/workflows/workflow-runtime/architecture.md`, and follow `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`.

Document Project is a selected-project workflow that automatically selects the fixed `Agent Guidance` project, resolves two optional root-level guidance documents, creates and initializes either missing document through the existing shared artifact allocation and document-generation capabilities, gathers only the baseline information required by the missing documents, and then guides the AI agent through creation, review, update, or expansion of the project documentation.

The workflow source document is a migration source of truth only. Runtime code must not read, import, parse, or otherwise depend on that markdown file. The module must own its identity, entry copy, persona, workflow values, artifact declarations, prerequisite declarations, forms, document builders, decision trees, prompts, and tool-schema builders as product code.

The existing shared artifact allocation, empty-file creation, deterministic full-document generation, persistence, and resume capabilities must be reused as-is. This module build must not introduce Document Project-specific artifact lifecycle fields, a parallel allocation ledger, a parallel scaffold-completion carrier, bespoke artifact handlers, or a module-specific repair to shared resume behavior. Any broader shared-capability weakness is outside this module build.

The migration-matrix disposition for `.cline/skills/bmad-document-project/**/*` is `Leave in place`. The module build must not delete, migrate, remap, rewrite, or otherwise modify those files.

## Canonical Requirement Inheritance

The following main-project requirement groups apply to this module and are incorporated into the behavior prescribed below:

| Requirement group | Application to Document Project |
| --- | --- |
| `FR-1` through `FR-5i` | Registry-owned slash-command and `useSkill` activation, canonical `activeWorkflowName`, and canonical next-action consumption |
| `FR-7` through `FR-10c1` | Runtime-owned workflow session, active step, workflow values, persistence, resume, and declared workflow-value inventory |
| `FR-10d` through `FR-10g3` | Mandatory informational entry form, shared project-candidate discovery, automatic fixed-project selection, child activation behavior, and omission of interactive project selection |
| `FR-10j` through `FR-10l1` | Project identity persistence, project-selection completion, project-folder creation, and canonical project-folder preparation |
| `FR-10m8` | Artifact-linked deterministic prerequisite resolution as the sole existing-file route for the two registered singleton artifacts |
| `FR-11` through `FR-21b`, where applicable | Code-owned module metadata, project selection and output placement, step graph, prompts, tool schemas, decision trees, forms, artifacts, builders, deterministic procedures, completion, workflow values, and no undeclared AI writes |
| `FR-20a`, `FR-20a1`, `FR-20b1a`, `FR-20b2`, `FR-20b2g`, `FR-20b2h`, `FR-20b9`, `FR-20b9a`, `FR-20d` through `FR-20p9` | Root-level singleton artifact registration, deterministic prerequisite adoption, missing-only allocation, exact output mappings, exact scaffolds, retries, failures, path policy, and governed model edits |
| `FR-22` through `FR-30`, where applicable | Runtime-owned active step, focus-chain projection, mutually exclusive decision-tree routes, one immediate action per evaluation, canonical form/tool result events, and transition handling |
| `FR-31` through `FR-38` | Runtime prompt projection and complete per-turn native tool-schema override |
| `FR-39` through `FR-45` | Runtime-owned workflow-form rendering, durable form-value persistence, conditional panel sequencing, and canonical next-action re-evaluation |
| `FR-46`, `FR-46a`, and `FR-48` through `FR-52d` | Explicit completion, teardown, cleared projections and values, persistence, and safe shared resume behavior |
| `FR-53`, `FR-55`, `FR-55a`, `FR-56`, and `FR-57` through `FR-57l` | Code-owned prompts, builders, and persona; no runtime dependency on legacy workflow assets; migration-matrix governance |
| `FR-58` through `FR-65`, where applicable | Execution-context isolation, automatic fixed-project child activation, validation, shared error handling, and module-owned deterministic failure routes |
| `IR-1` through `IR-17a`, where applicable | Existing focus-chain, form, prompt, tool-execution, persistence, and child-execution integration seams |
| `NFR-1` through `NFR-15`, where applicable | In-process execution, path and tool controls, isolation, safe failure, maintainability, and behavioral parity |
| `OR-1`, `OR-1a`, `OR-2`, and `OR-3` | Action-plan traceability, end-to-end workflow-value coverage, required verification, and no separate orchestration service |

Story-, epic-, review-, and other workflow-family requirements that do not govern these two singleton artifacts are not part of this module.

## Source Wording Preservation

All source-authored AI-facing and user-facing wording identified in these requirements must be preserved exactly. Implementation must not summarize, paraphrase, normalize, correct, or stylistically recast that wording.

This includes preserving the source's existing:

- `comprehenvise` spelling in the persona principle
- `misonfigurations` spelling in the Developer Guide-only prompt branch
- “focused on updating existing documentation” wording in the Add Supporting Documentation branch
- duplicate `3.` numbering in that branch
- capitalization, contractions, punctuation, option text, form labels, and action label `continue`

Source authoring labels and delimiters are not runtime prompt content. Headings and markers such as `# Module metadata:`, `# Persona`, `# Tool Schema Override`, `# Workflow Steps`, `### Prompt:`, `*** conditional prompt ... ***`, `*** end conditional prompt ... ***`, `*** begin ... example ***`, `*** end ... example ***`, `Panel A:`, `Field:`, and `allowedActions/ Labels:` must not appear in rendered model prompts, forms, or generated documents.

Every AI-facing reference written in the source as `workflow.<key>` must use the runtime-owned prompt token `{workflow.<key>}` in code-owned prompt templates. The shared prompt renderer must materialize those tokens. The module must not use local `replace`, `replaceAll`, regular-expression replacement, or hand-built token substitution.

The seven module-owned failure messages prescribed below are the only new Document Project failure copy. Existing shared entry, prerequisite, workflow-form rendering, workflow-form value persistence, step-transition, artifact, document-generation, file-tool, approval, path-policy, and model-tool failures must retain their existing shared repo-owned copy and behavior. The module must not duplicate or recast those shared messages.

## Foundational Project-Selection And Output-Placement Contract Required By This Module

The Document Project definition must use the approved typed project-selection and output-placement contract. This is a foundational runtime dependency and must not be replaced with module-local booleans or a Document Project-specific selection carrier.

The shared definition types must express this exact shape:

```ts
type WorkflowProjectSelectionDefinition =
	| { kind: "interactive" }
	| {
			kind: "automatic_fixed"
			projectTitle: string
			projectFolderName: string
	  }

type WorkflowDefinition = WorkflowDefinitionBase & {
	projectSelection: WorkflowProjectSelectionDefinition
	projectOutputPlacement: WorkflowProjectOutputPlacement
	entryProjectValueKeys: WorkflowEntryProjectValueKeys
}
```

`WorkflowProjectOutputPlacement` must remain exactly:

```ts
type WorkflowProjectOutputPlacement =
	| { kind: "selected_project_root" }
	| { kind: "selected_project_subfolder"; subfolder: WorkflowProjectSubfolder }
```

`ShippedWorkflowMetadata` must expose the equivalent project-selection and output-placement fields, but must not expose `entryProjectValueKeys`:

```ts
type ShippedWorkflowMetadata = ShippedWorkflowMetadataBase & {
	projectSelection: WorkflowProjectSelectionDefinition
	projectOutputPlacement: WorkflowProjectOutputPlacement
}
```

The shared contracts must remove the legacy singular `projectSubfolder` field rather than preserving an alias. Existing workflows that ask the user to select a project must explicitly declare `projectSelection: { kind: "interactive" }`.

Definition validation must fail closed for structurally invalid combinations, including:

- a definition without `projectSelection`, `projectOutputPlacement`, or `entryProjectValueKeys`
- an unsupported `projectSelection.kind`
- `projectSelection: { kind: "automatic_fixed" }` without both non-empty, already-trimmed fixed values
- an automatic fixed project folder name that is not a valid canonical filesystem identity

These are shared definition-validation diagnostics, not new module-owned user copy.

## Workflow Identity And Entry

The workflow definition must expose exactly:

- `name`: `document-project`
- `displayName`: `document project`
- `slashCommandName`: `document-project`
- `useSkillName`: `document-project`
- `description`: `This workflow builds and/or updates documentation to leverage as context while planning and implementing development projects. It focuses on a developer guide and project overview which together explain the nature of your project as well as your preferences and rules for working in the repo.`

The workflow must be activated through the shipped runtime registry by canonical name, slash command, and skill name. It must not add or preserve a `.md` activation alias.

The workflow-specific informational panel of the mandatory shared entry `WorkflowForm` must use exactly:

`In this workflow, you'll generate or update the developer guide and project overview, which are used in other workflows to provide agents with context regarding your project and ways of working.`

The entry form must not render an interactive project-selection panel for Document Project. Any shared title, button, or form-shell copy not overridden above remains owned by the existing shared entry-form capability and must be reused unchanged.

The Document Project workflow definition and shipped metadata must declare exactly:

```ts
projectSelection: {
	kind: "automatic_fixed",
	projectTitle: "Agent Guidance",
	projectFolderName: "agent-guidance",
},
projectOutputPlacement: {
	kind: "selected_project_root",
},
```

For a user-facing main-agent invocation, automatic project resolution must begin after successful submission of the informational entry panel. Main-agent discovery and finalization must not run before that submission. Child activation uses the shared automatic fixed-project activation behavior without rendering or requiring the informational entry panel.

Automatic project resolution must:

1. Before creating the fixed project folder, call the existing shared `discoverWorkflowCandidates(...)` project-selection seam with `rootDirectory` obtained from the existing runtime-owned `resolveWorkflowProjectOutputRoot()`, `workspacePathPolicy` set to the runtime's existing workspace path policy, `entryType: "directory"`, `immediateChildrenOnly: true`, `buildLabel: (entryName) => entryName`, `sort: "alpha_asc"`, and no `targetPathSegments` or `namingPattern`.
2. Supply `agent-guidance` from the module definition as the fixed project candidate instead of obtaining a candidate from user input.
3. Set `projectMode` to `existing` when the discovered candidates contain the exact value `agent-guidance` and to `new` otherwise.
4. Set `projectTitle` to `Agent Guidance` and `projectFolderName` to `agent-guidance`.
5. Invoke the shared runtime-owned `finalizeWorkflowProjectSelection(...)` helper exactly once with the task state, active Document Project definition, and resolved fixed `WorkflowProjectSelectionState`; do not synthesize a project-selection form submission.
6. Through that helper, assign the normal session project-selection state, clear the completed informational entry form session, persist the three values through the declared `entryProjectValueKeys`, ensure the selected project and shared canonical project folders exist, record normal project-selection completion, and continue through the existing `new` or `existing` entry-artifact-resolution path.
7. Resolve the selected project root through the existing runtime-owned `resolveWorkflowProjectOutputFolder(session)` behavior, which derives `join(cwd, "docs", "projects", session.projectSelection.projectFolderName)`, without defining or persisting a separate selected-project-root workflow value.
8. Continue to Step 1 without asking the user to select a project.

The module must not declare parent-to-child workflow-value inheritance. A child activation uses the shared automatic fixed-project activation behavior and does not render the mandatory entry form. The shared prohibition on active-step forms in child sessions remains unchanged; this module must not introduce a child-specific form substitute.

## Persona

The module must define exactly this `WorkflowPersonaDefinition`:

```ts
{
	name: "Mary",
	role: "Technical Writer",
	identity: "producing product documentation for developer teams.",
	capabilities: ["product analysis", "technical documentation"],
	communicationStyle: "crisp, checklist-driven, and ambiguity-free.",
	principles: ["Developers do their best work when they have comprehenvise product documentation at their disposal."],
}
```

The persona must be code-owned and must not be loaded from a BMAD persona file, the source workflow markdown, or another runtime asset.

## Runtime-Owned Workflow Values

The module must declare exactly these 28 keys in its canonical `workflowValueKeys` inventory:

1. `projectMode`
2. `projectTitle`
3. `projectFolderName`
4. `project_overview_artifact_family`
5. `project_overview_artifact_identity`
6. `project_overview_artifact_filename`
7. `project_overview_artifact_relative_path`
8. `project_overview`
9. `developer_guide_artifact_family`
10. `developer_guide_artifact_identity`
11. `developer_guide_artifact_filename`
12. `developer_guide_artifact_relative_path`
13. `developer_guide`
14. `project_overview_creation_required`
15. `developer_guide_creation_required`
16. `session_objective`
17. `repo_type`
18. `product_type`
19. `primary_programming_language`
20. `repo_status`
21. `api_indicator`
22. `database_indicator`
23. `state_management_indicator`
24. `ui_indicator`
25. `deployment_indicator`
26. `recent_project`
27. `planned_enhancements`
28. `known_issues`

The module must declare exactly these entry project destinations:

```ts
entryProjectValueKeys: {
	projectMode: "projectMode",
	projectTitle: "projectTitle",
	projectFolderName: "projectFolderName",
}
```

The value types and writers are:

| Keys | Required type | Owner |
| --- | --- | --- |
| `projectMode` | `"new" \| "existing"` | shared automatic project resolution |
| `projectTitle`, `projectFolderName` | non-empty string | shared automatic project resolution |
| artifact family, identity, filename, relative-path, and absolute-path keys | non-empty string when the artifact is adopted or allocated; absent before then | shared prerequisite adoption or artifact allocation |
| `project_overview_creation_required`, `developer_guide_creation_required` | boolean | Step 2 deterministic procedure |
| `session_objective` | exactly `"Update existing documents"` or `"Add supporting documentation"` | Workflow Form 1 Panel D |
| `repo_type`, `product_type`, `primary_programming_language`, `repo_status` | string | Workflow Form 2 |
| `api_indicator`, `database_indicator`, `state_management_indicator`, `ui_indicator`, `deployment_indicator` | boolean | Workflow Form 2 |
| `recent_project`, `planned_enhancements`, `known_issues` | string | Workflow Form 2 |

No Document Project workflow value is AI-writable. No step may expose `set_workflow_values`, and no undeclared workflow key may be written. The generic key `creationRequired` must not be introduced.

All values must remain JSON-safe, persist in the active workflow session, restore through the shared resume contract, and clear during workflow teardown.

## Artifact-Family Registration

The shared `WorkflowArtifactFamily` and `WORKFLOW_ARTIFACT_FAMILY_REGISTRY` must contain these exact complete definitions:

| Enum member | String id | Allocation mode | Identity requirement | Filename pattern | Extension | Content kind | Numbering scope | Singleton identity | Discovery pattern | Sidecar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `WorkflowArtifactFamily.ProjectOverview` | `project_overview` | `singleton_project` | `none` | `project-overview.md` | `.md` | `markdown` | `project_singleton` | `project_overview` | `/^project-overview\.md$/` | none |
| `WorkflowArtifactFamily.DeveloperGuide` | `developer_guide` | `singleton_project` | `none` | `developer-guide.md` | `.md` | `markdown` | `project_singleton` | `developer_guide` | `/^developer-guide\.md$/` | none |

The module may reference these family identifiers but must not duplicate or override registry-owned identity, filename, discovery, extension, content-kind, allocation, numbering, or sidecar behavior.

## Workflow Artifact Definitions

The module must declare exactly two artifacts.

### Project Overview

```ts
{
	id: "project_overview",
	family: WorkflowArtifactFamily.ProjectOverview,
	intentMode: "new",
	parentIdentitySource: undefined,
	targetIdentitySource: undefined,
	outputValueKeys: {
		projectTitle: "projectTitle",
		projectFolderName: "projectFolderName",
		artifactFamily: "project_overview_artifact_family",
		artifactIdentity: "project_overview_artifact_identity",
		artifactFilename: "project_overview_artifact_filename",
		artifactRelativePath: "project_overview_artifact_relative_path",
		artifactAbsolutePath: "project_overview",
		parentIdentity: undefined,
		targetIdentity: undefined,
	},
}
```

### Developer Guide

```ts
{
	id: "developer_guide",
	family: WorkflowArtifactFamily.DeveloperGuide,
	intentMode: "new",
	parentIdentitySource: undefined,
	targetIdentitySource: undefined,
	outputValueKeys: {
		projectTitle: "projectTitle",
		projectFolderName: "projectFolderName",
		artifactFamily: "developer_guide_artifact_family",
		artifactIdentity: "developer_guide_artifact_identity",
		artifactFilename: "developer_guide_artifact_filename",
		artifactRelativePath: "developer_guide_artifact_relative_path",
		artifactAbsolutePath: "developer_guide",
		parentIdentity: undefined,
		targetIdentity: undefined,
	},
}
```

Both artifacts must resolve directly under the selected project root:

- `project-overview.md`
- `developer-guide.md`

After either adoption or allocation, the corresponding outputs must have these exact values:

| Artifact | Family | Identity | Filename | Project-relative path | Absolute path |
| --- | --- | --- | --- | --- | --- |
| Project Overview | `project_overview` | `project_overview` | `project-overview.md` | `project-overview.md` | `join(cwd, "docs", "projects", "agent-guidance", "project-overview.md")` |
| Developer Guide | `developer_guide` | `developer_guide` | `developer-guide.md` | `developer-guide.md` | `join(cwd, "docs", "projects", "agent-guidance", "developer-guide.md")` |

Both metadata sets must also use `projectTitle: "Agent Guidance"` and `projectFolderName: "agent-guidance"`.

The module must not compute either filename or path, inspect the filesystem to infer artifact state, create collision suffixes, expose archive/delete behavior, or overwrite an existing canonical artifact.

## Optional Artifact-Linked Prerequisites

The module must declare these prerequisites in this exact record order:

| Record key / id | Requirement | Resolution mode | Producing workflow | Project segments | Match | Workflow value key | Output document reference | Artifact id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `project_overview` | `optional` | `deterministic_exact_filename` | `document-project` | `[]` | exact filename `project-overview.md` | `project_overview` | `none` | `project_overview` |
| `developer_guide` | `optional` | `deterministic_exact_filename` | `document-project` | `[]` | exact filename `developer-guide.md` | `developer_guide` | `none` | `developer_guide` |

The first runtime-owned action in Step 1 must be:

```ts
{
	kind: "resolve_prerequisite_files",
	prerequisiteIds: ["project_overview", "developer_guide"],
}
```

Resolution must complete in that declaration order before Workflow Form 1 is rendered.

The shared resolver must persist at most one current result per prerequisite using the existing exact union:

```ts
type WorkflowPrerequisiteFileResolution =
	| { prerequisiteId: string; outcome: "found"; resolvedAbsolutePath: string }
	| { prerequisiteId: string; outcome: "not_found" }
```

For each `found` result, runtime must:

- persist the full absolute path to the prerequisite's path workflow value
- adopt the file as the corresponding registered singleton artifact
- persist the complete registry-derived artifact metadata
- preserve the file unchanged
- skip prerequisite-choice, singleton-conflict, replacement, archive, delete, allocation, and initial-scaffold behavior for that artifact

For each `not_found` result, runtime must:

- persist the completed no-match result
- leave that artifact's family, identity, filename, relative path, and absolute path workflow values unset
- retain the shared entry project values
- continue without prerequisite-choice or cannot-continue UI
- defer path determination until shared artifact allocation in Step 2

Resolution must use exact filenames in the selected project root, validate selected-project containment and workspace path policy, and never discover or persist an intended path for a file that does not exist.

The module must reuse the shared resolver's existing failure and resume behavior. It must not add prerequisite-selection UI or new prerequisite-specific user copy.

## Initial Document Builders

The module must provide two code-owned deterministic initial document builders. Each builder must return the exact content below with the shown heading order, blank-line structure, punctuation, and a single final newline. The source example delimiters are not document content.

### `project-overview.md`

```text
# Executive Summary

# Classification

Repository Type:
Product Type:
Primary Language:
Repo Status:
Architecture Pattern:

# Structure

# Technology Stack Summary

# Key Features

# Architecture Highlights

# Repository Structure

# Dependency Graph & Data Flow

# Integration Points & API Contracts

# Documentation Map
```

### `developer-guide.md`

```text
# Coding Style

# Before Contributing
All updates should start with a clean working tree. Always check for a clean tree before beginning work, and ask the user to commit anything already in the working tree before you begin if the tree is not clean.

# Local Development Instructions
- You must always follow workflow instructions exactly
- You must always stop and ask for guidance when faced with anything ambiguous or for which a decision is required that has not been explicitly deferred to you by the user or workflow instructions
- You must avoid broad file scan behavior. Limit system access to the files necessary to perform the task assigned to you.
- You must only use attempt_completion once, as your final completion report at the end of a workflow.

# Code Quality
- Keep changes narrowly scoped to the requested behavior and follow the existing architecture, naming conventions, helper APIs, and file organization already present in the codebase.
- Prefer type-safe, explicit implementations. Avoid `any`, unchecked casts, ad hoc string parsing, duplicated constants, and broad fallback behavior unless the project already uses that pattern or the requirements explicitly call for it.
- Do not invent user-facing text, prompts, labels, errors, configuration values, or workflow behavior. Reuse existing repo-owned strings and patterns where available; if required wording is missing, ask for clarification.
- When changing behavior, update the directly affected tests and remove stale imports, helpers, fixtures, assertions, and validation guards. Do not leave dead code behind.
- Before considering work complete, run the repository’s relevant focused tests plus the standard quality gates, such as typecheck, lint/format, and build/package commands if configured. Record the exact commands and outcomes.

# End to End Testing

# Commit Guidelines
When asked to commit your work, follow these rules:
	- Write clear, descriptive commit messages
	- Use conventional commit format (e.g. “feat:”, “fix:”, “docs:”)
	- Reference project title, story number, epic number, or phase number where relevant.

# Most Recent Project Notes

# Planned Enhancements

# Known Issues & Technical Debt
```

The initial builders must run only through runtime-invoked `build_workflow_document` actions after the corresponding missing artifact has been allocated. They must never run for a `found` prerequisite. They must not be model-facing and must not read the source markdown or BMAD assets at runtime.

## Focus-Chain Steps

The workflow must define exactly four steps:

| Step id | Step number | Exact checklist label | Mode |
| --- | --- | --- | --- |
| `step-1` | 1 | `Identify Session Objective` | runtime-driven |
| `step-2` | 2 | `Document Generation` | runtime-driven |
| `step-3` | 3 | `Identify Baseline Data` | runtime-driven |
| `step-4` | 4 | `Support System Documentation` | model-driven |

No additional steps may be added without a requirements revision.

Steps 1 through 3 must return `{ kind: "none" }` as their prompt source. Step 4 must return a non-empty current-step instruction template selected from the exact prompt assembly contract below.

## Workflow Form 1: Confirm Document Generation

The module must define one Step 1 form with:

- `definitionVersion`: `2`
- form title: `Confirm Document Generation`
- `toolDictionaryTitle`: `""`
- `toolDictionaryMarkdown`: `""`
- no back or cancel actions

The form must contain exactly four panel configurations. The Step 1 decision tree must select exactly one start panel from the persisted prerequisite results and their pre-allocation path state. No route may rely on panel order as priority.

### Panel A

- condition: both `project_overview` and `developer_guide` resolved as `not_found`, and both paths remained unset
- title: `Full Scan Needed`
- `promptMarkdown`: `The Agent Guidance folder exists, but it’s currently empty. I’ll proceed with a full scan to generate the necessary repo documentation.`
- fields: `[]`
- allowed actions: `["submit"]`
- submit label: `continue`
- submission writes: none
- submission outcome: complete Workflow Form 1 and transition to Step 2

### Panel B

- condition: `developer_guide` resolved as `found` with its path set, and `project_overview` resolved as `not_found` with its path unset
- title: `Missing Project Overview`
- `promptMarkdown`: `The required Project Overview document is missing from the Agent Guidance folder in this repo. I'll generate that file for you during this workflow.`
- fields: `[]`
- allowed actions: `["submit"]`
- submit label: `continue`
- submission writes: none
- submission outcome: complete Workflow Form 1 and transition to Step 2

### Panel C

- condition: `project_overview` resolved as `found` with its path set, and `developer_guide` resolved as `not_found` with its path unset
- title: `Missing Developer Guide`
- `promptMarkdown`: `The required Developer Guide document is missing from the Agent Guidance folder in this repo. I'll generate that file for you during this workflow.`
- fields: `[]`
- allowed actions: `["submit"]`
- submit label: `continue`
- submission writes: none
- submission outcome: complete Workflow Form 1 and transition to Step 2

### Panel D

- condition: both prerequisites resolved as `found`, and both paths were set
- title: `Clarify Intent`
- `promptMarkdown`: `It looks like the foundational reference documents are in place. What would you like to do?`
- exactly one field:
  - key and durable workflow destination: `session_objective`
  - kind: `dropdown`
  - allowed value type: `string`
  - required: `true`
  - label: `Select One`
  - options, values, and order:
    1. `Update existing documents`
    2. `Add supporting documentation`
- allowed actions: `["submit"]`
- submit label: `continue`
- submission outcome: persist the exact selected option to `session_objective`, complete Workflow Form 1, and transition to Step 2

The source provides no helper text, placeholders, static notices, descriptions, additional fields, true/false labels, success messages, or cancel/back labels for this form. None may be added.

## Step 1 Routing

Step 1 must execute in this order:

1. Resolve `project_overview`, then `developer_guide`, through the single `resolve_prerequisite_files` action.
2. Require both persisted resolution results.
3. Validate that each result agrees with whether its path was set during resolution.
4. Select exactly one Workflow Form 1 panel.
5. Render the selected panel as the form's start panel.
6. After successful submission, transition to Step 2.

If the results do not select exactly one panel, Step 1 must terminate with:

`I could not determine which reference documents need to be generated.`

## Step 2 Routing And Artifact Generation

At Step 2 entry, before artifact allocation, one runtime-owned deterministic procedure must require both persisted prerequisite results, validate their agreement with prerequisite-resolution-time path state, and atomically persist:

- `project_overview_creation_required: true` when `project_overview` was unset after prerequisite resolution; otherwise `false`
- `developer_guide_creation_required: true` when `developer_guide` was unset after prerequisite resolution; otherwise `false`

These booleans record whether each file was missing at prerequisite resolution. They must not be recomputed from path presence after allocation.

If resolution state is missing or inconsistent, or creation-state derivation fails, Step 2 must terminate with:

`I could not determine which reference documents need to be generated.`

Applying the successfully derived, validated Boolean map must use the existing shared deterministic-procedure workflow-value persistence contract as-is. The module must not add a Document Project-specific persistence-failure route or mapping.

After the booleans are persisted:

- a `false` value preserves the found artifact and skips allocation and initial document building for that artifact
- a `true` value allocates the registered singleton through the shared `allocate_artifact` action, persists its canonical metadata and full absolute path, and then initializes it through `build_workflow_document`

When both artifacts require creation, the exact order is:

1. allocate Project Overview
2. build the Project Overview initial document
3. allocate Developer Guide
4. build the Developer Guide initial document

Each operation must finish and persist its result before canonical next-action evaluation selects the next operation.

An initial allocation failure must retry allocation of that same artifact exactly once. No other operation may run between the two attempts.

If the Project Overview retry fails, terminate with:

`I could not create project-overview.md in the Agent Guidance folder.`

If the Developer Guide retry fails, terminate with:

`I could not create developer-guide.md in the Agent Guidance folder.`

An initial scaffold-build failure must not retry the full-document write.

If Project Overview initialization fails, terminate with:

`I could not populate the initial content for project-overview.md.`

If Developer Guide initialization fails, terminate with:

`I could not populate the initial content for developer-guide.md.`

A failed artifact must block the next artifact and Step 3. These failure routes must not archive, delete, replace, suffix, overwrite, or invoke singleton-conflict UI.

After both artifact paths are available and every required initial scaffold is complete, Step 2 must transition to Step 3.

The decision tree must reuse the shared operation result and resume behavior as-is. It must not add module-specific lifecycle state.

## Workflow Form 2: Gather Baseline Project Data

The module must define one Step 3 form with:

- `definitionVersion`: `2`
- form title: `Gather Baseline Project Data`
- `toolDictionaryTitle`: `""`
- `toolDictionaryMarkdown`: `""`
- no back or cancel actions

The form must use the existing shared boolean-field presentation and copy unchanged. The module must not invent `Yes`, `No`, or other boolean labels.

Every panel allows only `submit`, labels that action `continue`, and persists its single field to the workflow value stated below before advancing.

Every dropdown, radio-group, small-text, and large-text field must use `allowedValueType: "string"`. Every boolean field must use `allowedValueType: "boolean"`. For every enumerated dropdown or radio option, the option's `value` and `label` must both equal the exact source string shown below.

### Panels A Through I: Project Overview Baseline

| Panel | Title | Exact `promptMarkdown` | Field kind | Exact label | Options / cardinality | Durable value |
| --- | --- | --- | --- | --- | --- | --- |
| A | `Repository Type` | `Please select which of the following best describes this repository.` | `dropdown` | `Select One` | `Monolith: Single cohesive codebase`; `Monorepo: Multiple parts in one repository`; `Multi-part: Separate client/server or similar architecture` | `repo_type` |
| B | `Project Type` | `Which of the following best matches this product's niche?` | `dropdown` | `Select One` | `healthcare`; `fintech`; `govtech`; `edtech`; `aerospace`; `automotive`; `scientific`; `legaltech`; `insurtech`; `energy`; `process control`; `building automation`; `gaming`; `entertainment`; `mobile application`; `web application`; `desktop application`; `CLI`; `library`; `extension`; `infrastructure`; `other` | `product_type` |
| C | `Primary Language` | `What is this project's primary programming language?` | `small_text` | `Select One` | none | `primary_programming_language` |
| D | `Repo Status` | `Is this a Greenfield or Brownfield project?` | `radio_group` | `Select One` | single; `Greenfield: Brand-new project with minimal files/folders in place`; `Brownfield: Established project with existing architecture` | `repo_status` |
| E | `API Usage` | `Does your product leverage internal or external APIs?` | `boolean` | `Select One` | shared boolean semantics | `api_indicator` |
| F | `Data Models` | `Does your product leverage data models or backend databases?` | `boolean` | `Select One` | shared boolean semantics | `database_indicator` |
| G | `State Management` | `Does your product leverage State Management?` | `boolean` | `Select One` | shared boolean semantics | `state_management_indicator` |
| H | `User Interface` | `Does your product have a UI?` | `boolean` | `Select One` | shared boolean semantics | `ui_indicator` |
| I | `Deployment Configuration` | `Does your product require a deployment configuration?` | `boolean` | `Select One` | shared boolean semantics | `deployment_indicator` |

Every field in Panels A through I is required.

The exact sequence is A → B → C → D → E → F → G → H → I.

### Panels J Through L: Developer Guide Baseline

| Panel | Title | Exact `promptMarkdown` | Field kind | Exact label | Required | Durable value |
| --- | --- | --- | --- | --- | --- | --- |
| J | `Recent Project` | `Tell me about the most recent update or enhancement you completed for this repository.` | `large_text` | `Describe your most recent product update` | `true` | `recent_project` |
| K | `Planned Enhancements` | `What future enhancements, fixes, or updates do you have in mind for this product?` | `large_text` | `Planned Product Enhancements` | `true` | `planned_enhancements` |
| L | `Known Issues` | `What known issues, risks, or technical debt should I know about?` | `large_text` | `Known Issues & Technical Debt` | `true` | `known_issues` |

The exact sequence is J → K → L, and Panel L completes the form.

The source provides no helper text, placeholders, static notices, descriptions, additional fields, success messages, cancel labels, or back labels for Workflow Form 2. None may be added.

## Step 3 Routing And Form Sequencing

Step 3 must select exactly one of these mutually exclusive paths:

| Project Overview creation required | Developer Guide creation required | Required behavior |
| --- | --- | --- |
| `false` | `false` | Do not render Workflow Form 2; transition directly to Step 4 |
| `true` | `false` | Render Workflow Form 2 at Panel A; run A through I; complete after I; transition to Step 4 |
| `false` | `true` | Render Workflow Form 2 at Panel J; run J through L; complete after L; transition to Step 4 |
| `true` | `true` | Render Workflow Form 2 at Panel A; run A through I, then J through L; complete after L; transition to Step 4 |

Workflow Form 2 must receive the two persisted creation-required booleans as form session data so Panel I can declaratively route to Panel J only when `developer_guide_creation_required` is `true`; otherwise Panel I terminates the form. The values remain canonically owned by the workflow session and must not be persisted a second time from form-local data.

If Step 3 cannot select Panel A, Panel J, or the valid skip path, terminate with:

`I could not determine which baseline information must be collected.`

Workflow Form 1 and Workflow Form 2 rendering, submitted-value persistence, and transition execution must use the existing shared `WorkflowRuntime` behavior and failure copy unchanged. The module must not define failure-message overrides, wrapper actions, or decision-tree failure routes for these shared-runtime operations.

## Step 4 Prompt Selection And Routing

Step 4 must be model-driven and must render exactly one prompt variant. Selection must use the two persisted creation-required booleans. When both are `false`, selection must additionally use the exact persisted `session_objective`.

| Project Overview creation required | Developer Guide creation required | Session objective | Prompt sections, in exact order |
| --- | --- | --- | --- |
| `true` | `true` | ignored | Base → Both-created status → Shared paths → Input introduction → Project Overview inputs → Developer Guide inputs → Both-document work |
| `true` | `false` | ignored | Base → Shared paths → Project Overview-only status → Input introduction → Project Overview inputs → Project Overview-only work |
| `false` | `true` | ignored | Base → Shared paths → Developer Guide-only status → Input introduction → Developer Guide inputs → Developer Guide-only work |
| `false` | `false` | `Update existing documents` | Base → Shared paths → Update-existing-documents work |
| `false` | `false` | `Add supporting documentation` | Base → Shared paths → Add-supporting-documentation work |

The Shared paths section is unconditional because the source places it outside every conditional authoring marker. It must appear in all five variants in the exact position shown above.

The prompt builder must select the named sections, omit every unselected section completely, and join the selected sections with exactly one blank line. The source's conditional authoring markers must not appear.

If the booleans or `session_objective` do not select exactly one valid variant, Step 4 must terminate with:

`I could not determine the appropriate documentation task for the current session.`

After a valid prompt is projected, Step 4 must route to `project_prompt`. Successful `attempt_completion` must emit `attempt_completion_succeeded`, and the Step 4 decision tree must route that event to `complete_workflow`.

`attempt_completion` execution itself must not directly complete or tear down the workflow. Model-tool failures must remain on Step 4 and use existing shared model-tool failure reporting unless a later requirements revision provides a module-specific route and exact copy.

## Exact Step 4 Prompt Sections

### Base

```text
Role and Objective:
You are an expert technical writer and principal software architect. Your task is to generate comprehensive, production-ready system documentation for the codebase in the current workspace.
```

### Both-Created Status

```text
These documents were automatically generated by the system with required headings and will be completed by you during this workflow.
```

### Shared Paths

```text
    - Project Overview: {workflow.project_overview}
    - Developer Guide: {workflow.developer_guide}
```

### Project Overview-Only Status

```text
This document was missing at workflow invocation and has been generated as an initial scaffold for you to complete during this workflow:
    - Project Overview: {workflow.project_overview}
Completing this document is your primary focus during this workflow. You may add content and edit as-needed.

This document appears to have been generated during an earlier session. You'll need to ask the user to review and indicate whether additional revisions are needed:
    - Developer Guide: {workflow.developer_guide}
If you identify any inaccuracies or gaps in this document during your work, do not automatically update this document. Stop, inform the user of your discovery, and gain their consent before editing this document.
```

### Developer Guide-Only Status

```text
This document was missing at workflow invocation and has been generated as an initial scaffold for you to complete during this workflow:
    - Developer Guide: {workflow.developer_guide}
Completing this document is your primary focus during this workflow. You may add content and edit as-needed.

This document appears to have been generated during an earlier session. You'll need to ask the user to review and indicate whether additional revisions are needed:
    - Project Overview: {workflow.project_overview}
If you identify any inaccuracies or gaps in this document during your work, do not automatically update this document. Stop, inform the user of your discovery, and gain their consent before editing this document.
```

### Input Introduction

```text
The user provided the following inputs, which you must immediately add to the owning document under the appropriate headings:
```

### Project Overview Inputs

```text
Project Overview:
    - Repository Type: {workflow.repo_type}
    - Product Type: {workflow.product_type}
    - Primary Programming Language: {workflow.primary_programming_language}
    - Repo Status: {workflow.repo_status}
```

### Developer Guide Inputs

```text
Developer Guide:
    - Recent Project Notes: {workflow.recent_project}
    - Planned Enhancements: {workflow.planned_enhancements}
    - Known Issues/ Tech Debt: {workflow.known_issues}
```

### Both-Document Work

```text
After saving the user's inputs, notify them that you've added their inputs to the documents and are beginning your initial repo scan.

Perform an exhaustive system review in order to generate the needed content for the remaining sections in both of the provided documents. The user has provided these indicators to inform your scan:
- Uses APIs: {workflow.api_indicator}
- Uses Data Models or Databases: {workflow.database_indicator}
- Uses State Management: {workflow.state_management_indicator}
- Has a UI: {workflow.ui_indicator}
- Requires Deployment Config: {workflow.deployment_indicator}

The steps below are considered the appropriate method to conduct this system scan to populate the Project Overview:

# Context Gathering
1. Scan all active source files, configuration files, and data schemas in the repository.
2. Analyze the system's entry points, primary module dependencies, and external integrations.
3. Add content to {workflow.project_overview} as you work.

## 1. System Overview
- High-level functional purpose of the application.
- Target audience and primary use cases.
- Core business logic flows.

## 2. Architecture & Tech Stack
- Complete list of languages, frameworks, databases, and major third-party dependencies.
- High-level structural pattern used (e.g., MVC, Microservices, Clean Architecture).
- Data flow mapping from ingestion to storage.

## 3. Module & Directory Breakdown
- A visual directory tree of critical source folders.
- Detailed explanations for the responsibilities of each key module/package.

## 4. Core API & Interface Specifications
- Publicly exposed APIs, webhook listeners, or event-driven queues.
- Key function signatures, inputs, outputs, and expected error handling mechanisms.

## 5. Setup, Deployment & Testing
- Exact step-by-step local installation and environment variable configuration instructions.
- Test suites execution scripts and continuous integration deployment workflows.

## 6. Existing Documentation
- Full inventory of any existing system context, guides, or readme files

# Content Constraints
- Be explicit, factual, and strictly technical.
- Do not invent, extrapolate, or hallucinate features not found in the source code.
- Format all code blocks, variables, and path names with appropriate markdown notation.
- If a specific architecture pattern is ambiguous, state the observable code organization rather than guessing.

To populate the Developer Guide, walk the user through each section, preferring their input augmented by your own system review as needed.
Here's how to think about each section of the document:
- Before Contributing: What does a dev agent need to know before they write a single line of code in this repo? A good way to approach this is to identify the top 3-5 "gotchas" or "must-knows" that agents can't afford to overlook.
- Local Development Instructions: This section is more procedure-oriented, as you can see by the pregenerated content. You may add content to this section, but do not remove the pregenerated content in this section.
- Code Quality: This section also includes pregenerated content, which can be revised if the user requests changes. This is intended to ensure that dev agents output is clean, consistent, scalable, and reliable.
- End to End Testing: This section should detail the end-to-end testing for the product as well as any targeted testing suites. If any tests run automatically, this section should indicate what triggers them and which tests are automatically run.
- Commit Guidelines: This section also includes pregenerated content which can be revised if the user wishes.
- Most Recent Project Notes: This section should provide an overview of the most recent work in this repo (where applicable)
- Planned Enhancements: This section should be a backlog of future product changes that the user has identified but is not ready to act on yet.
- Known Issues & Technical Debt: This section should be an inventory of any known system issues, tech debt, or misconfigurations.

Stop and ask the user for guidance and clarification as needed. Once you complete your system scan and have documented your findings, inform the user and work with them to ensure that your drafted content is correct and comprehensive.

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.
```

### Developer Guide-Only Work

```text
To populate the Developer Guide, walk the user through each section, preferring their input augmented by your own system review as needed.
Here's how to think about each section of the document:
- Before Contributing: What does a dev agent need to know before they write a single line of code in this repo? A good way to approach this is to identify the top 3-5 "gotchas" or "must-knows" that agents can't afford to overlook.
- Local Development Instructions: This section is more procedure-oriented, as you can see by the pregenerated content. You may add content to this section, but do not remove the pregenerated content in this section.
- Code Quality: This section also includes pregenerated content, which can be revised if the user requests changes. This is intended to ensure that dev agents output is clean, consistent, scalable, and reliable.
- End to End Testing: This section should detail the end-to-end testing for the product as well as any targeted testing suites. If any tests run automatically, this section should indicate what triggers them and which tests are automatically run.
- Commit Guidelines: This section also includes pregenerated content which can be revised if the user wishes.
- Most Recent Project Notes: This section should provide an overview of the most recent work in this repo (where applicable)
- Planned Enhancements: This section should be a backlog of future product changes that the user has identified but is not ready to act on yet.
- Known Issues & Technical Debt: This section should be an inventory of any known system issues, tech debt, or misonfigurations.

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.
```

### Project Overview-Only Work

```text
After saving the user's inputs, notify them that you've added their inputs to the document and are beginning your system scan.

Perform an exhaustive system review in order to generate the needed content for the remaining sections in the Project Overview document. The user has provided these indicators to inform your scan:
- Uses APIs: {workflow.api_indicator}
- Uses Data Models or Databases: {workflow.database_indicator}
- Uses State Management: {workflow.state_management_indicator}
- Has a UI: {workflow.ui_indicator}
- Requires Deployment Config: {workflow.deployment_indicator}

The steps below are considered the appropriate method to conduct this system scan:

# Context Gathering
1. Scan all active source files, configuration files, and data schemas in the repository.
2. Analyze the system's entry points, primary module dependencies, and external integrations.
3. Add content to {workflow.project_overview} as you work.

## 1. System Overview
- High-level functional purpose of the application.
- Target audience and primary use cases.
- Core business logic flows.

## 2. Architecture & Tech Stack
- Complete list of languages, frameworks, databases, and major third-party dependencies.
- High-level structural pattern used (e.g., MVC, Microservices, Clean Architecture).
- Data flow mapping from ingestion to storage.

## 3. Module & Directory Breakdown
- A visual directory tree of critical source folders.
- Detailed explanations for the responsibilities of each key module/package.

## 4. Core API & Interface Specifications
- Publicly exposed APIs, webhook listeners, or event-driven queues.
- Key function signatures, inputs, outputs, and expected error handling mechanisms.

## 5. Setup, Deployment & Testing
- Exact step-by-step local installation and environment variable configuration instructions.
- Test suites execution scripts and continuous integration deployment workflows.

## 6. Existing Documentation
- Full inventory of any existing system context, guides, or readme files

# Content Constraints
- Be explicit, factual, and strictly technical.
- Do not invent, extrapolate, or hallucinate features not found in the source code.
- Format all code blocks, variables, and path names with appropriate markdown notation.
- If a specific architecture pattern is ambiguous, state the observable code organization rather than guessing.

Stop and ask the user for guidance and clarification as needed. Once you complete your system scan and have documented your findings, inform the user and work with them to ensure that your drafted content is correct and comprehensive.

Once the document is fully populated and the user has approved the content, use attempt_completion to deliver a final recap of the work completed and end this workflow.
```

### Update Existing Documents Work

```text
You have been called inside a project documentation workflow focused on updating existing documentation. The existing project documentation is located at docs/projects/agent-guidance.

Follow these steps:
1. Identify which documents exist in the documentation folder
2. Use ask_followup_question to provide the user with a list of all existing documents in the folder asking them which file they'd like to update first
3. Make revisions as needed based on the user's direction and/or any documentation they provide you with.
4. Ensure that the user has reviewed and approved all new content, then use attempt_completion to provide a final change summary and end the workflow.
```

### Add Supporting Documentation Work

```text
You have been called inside a project documentation workflow focused on updating existing documentation. The existing project documentation is located at docs/projects/agent-guidance.

Follow these steps:
1. Ask the user what they'd like to add new documentation for
2. Assess existing documentation to determine whether the content the user wants to add belongs in an existing document. If so, suggest updating the existing document(s) instead of generating new files.
3. Assist them in generating the requested documentation and/or updating existing documentation in the project documentation folder (docs/projects/agent-guidance)
3. When finished, confirm that the user has reviewed and approved all new content, then use attempt_completion to provide a final change summary and end the workflow.
```

## Prompt Rendering Requirements

The prompt builder may use these workflow tokens and no others:

- `{workflow.project_overview}`
- `{workflow.developer_guide}`
- `{workflow.repo_type}`
- `{workflow.product_type}`
- `{workflow.primary_programming_language}`
- `{workflow.repo_status}`
- `{workflow.recent_project}`
- `{workflow.planned_enhancements}`
- `{workflow.known_issues}`
- `{workflow.api_indicator}`
- `{workflow.database_indicator}`
- `{workflow.state_management_indicator}`
- `{workflow.ui_indicator}`
- `{workflow.deployment_indicator}`

The creation-required booleans and `session_objective` select sections; their values must not be interpolated into the prompt.

Before projection:

- both artifact paths must be non-empty strings
- every workflow value referenced by the selected branch must exist with the prescribed type
- every selected template token must be valid and declared

After shared rendering:

- no `{workflow.*}` token may remain
- no bare `workflow.<key>` source reference may remain
- no source authoring marker may appear
- no unselected branch prose may appear

Step 4 prompt tests must follow `FR-14h`: assert branch shape, ordering, inclusion/exclusion, non-empty required values, token materialization, and forbidden-text absence. They must not snapshot or assert the complete editable prompt prose as one monolithic string.

## Exact Per-Turn Tool Schema Override

All four steps must delegate `buildToolSchema` directly to named exports in `documentProjectToolSchemas.ts`. The workflow definition must not declare inline schemas, inline arrays, or local fallback builder bodies.

Steps 1, 2, and 3 must each return exactly:

```ts
[]
```

An empty runtime-driven step schema is a complete replacement surface. It must not fall back to default tools.

Step 4 must declare this exact ordered `ClineDefaultTool[]`:

```ts
[
	ClineDefaultTool.BASH,
	ClineDefaultTool.LIST_FILES,
	ClineDefaultTool.SEARCH,
	ClineDefaultTool.LIST_CODE_DEF,
	ClineDefaultTool.FILE_READ,
	ClineDefaultTool.FILE_READ_RANGE,
	ClineDefaultTool.APPLY_PATCH,
	ClineDefaultTool.FILE_NEW,
	ClineDefaultTool.SEND_USER_MESSAGE,
	ClineDefaultTool.ASK,
	ClineDefaultTool.ATTEMPT,
]
```

The projected Step 4 names must therefore be exactly, in order:

1. `execute_command`
2. `list_files`
3. `search_files`
4. `list_code_definition_names`
5. `read_file`
6. `read_file_range`
7. `apply_patch`
8. `write_to_file`
9. `send_user_message`
10. `ask_followup_question`
11. `attempt_completion`

For every id, `documentProjectToolSchemas.ts` must call:

```ts
ClineToolSet.getToolByNameWithFallback(toolId, ModelFamily.NATIVE_GPT_5)
```

and return the registered tool's `tool.config`. The module must preserve each shared tool's current registered name, description, parameter schema, required fields, and context requirements exactly. It must not copy, wrap, rewrite, or hand-build shared `ClineToolSpec` objects.

The Step 4 schema must not include:

- `workflow_progress_request`
- `set_workflow_values`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`
- any other runtime-owned artifact or deterministic tool
- `use_subagents`
- `use_skill`
- web tools
- browser tools
- MCP tools
- workflow-specific backend tools

The model-facing file tools remain subject to the existing tool registration, strict-plan-mode, approval, auto-approval, hook, `.clineignore`, and workspace path-policy controls. Document Project must consume those shared controls as-is. This module build must not add, reorganize, or recast shared execution-control behavior or tests merely because Step 4 projects existing shared tools; any weakness in that shared capability is outside this workflow-module build.

## Prompt And Tool Projection

For Steps 1 through 3:

- the active step must contribute no module-owned current-step AI instruction text
- both input workflow blocks must retain the shared workflow identity, description, four-step checklist, and current-step heading/label supplied by the existing runtime projection
- the projected workflow tool-schema override must be exactly `[]`
- runtime-only artifact, prerequisite, form, value-write, document-build, and transition actions must not become native tools

For Step 4:

- the full-turn input workflow block must include the rendered current-step prompt
- the continuation-turn input workflow block must include the same rendered current-step prompt under the shared projection contract
- both input workflow blocks must include the four-step checklist
- the persona must appear only in the full-turn input workflow block when permitted by the shared task-first-request gate
- no workflow-specific prompt content may be added to system instructions
- the projected native schema must be the exact 11-tool override
- response-tool guidance must match the projected inclusion of `send_user_message`, `ask_followup_question`, and `attempt_completion`
- no Step 1–3, legacy, backend-only, non-Document-Project, subagent, web, browser, or MCP tool may leak into the projected schema

## Module-Owned Failure Copy

The module must own and reuse these exact strings without variants:

| Failure | Exact message |
| --- | --- |
| prerequisite-state or creation-state derivation | `I could not determine which reference documents need to be generated.` |
| Project Overview allocation after the one allowed retry | `I could not create project-overview.md in the Agent Guidance folder.` |
| Project Overview initial scaffold build | `I could not populate the initial content for project-overview.md.` |
| Developer Guide allocation after the one allowed retry | `I could not create developer-guide.md in the Agent Guidance folder.` |
| Developer Guide initial scaffold build | `I could not populate the initial content for developer-guide.md.` |
| Step 3 path selection | `I could not determine which baseline information must be collected.` |
| Step 4 branch selection | `I could not determine the appropriate documentation task for the current session.` |

No synonym, prefix, suffix, filename variant, third-person rewrite, or generic `Document Project` subject may replace these first-person messages.

## Registration And Source Independence

The module must use the standard module layout:

```text
src/core/task/workflow-runtime/workflow-modules/document-project/
  documentProjectWorkflow.ts
  documentProjectToolSchemas.ts
  documentProjectDocument.ts
  index.ts
  __tests__/
    documentProjectWorkflow.test.ts
    documentProjectToolSchemas.test.ts
    documentProjectDocument.test.ts
```

No module-local registry or specialized handler file is required.

The module must:

- export its definition and required public constants from its local `index.ts`
- register with `WorkflowRegistry.ts`
- appear in shipped workflow metadata using the exact project-selection and output-placement declarations
- resolve by canonical name, slash command, and `useSkillName`
- add both shared artifact-family enum members and complete registry entries
- extend shared artifact-definition typing to permit the two standalone singleton families
- preserve all existing workflow registrations while migrating definitions and shipped metadata to the approved project-selection and output-placement contracts

The module and shared runtime code must not import or read:

- `docs/workflows/workflow-runtime/workflow-modules/document-project/document-project.md`
- `.cline/skills/bmad-document-project/**/*`
- `.cline/workflow-config.yaml`
- BMAD agent/persona/reminder files
- placeholder workflow definitions

The module must not add a workflow-specific filesystem scanner, artifact allocator, artifact handler, document-generation handler, prompt renderer, project-selection carrier, resume ledger, or form runtime.

## Prescribed Test Coverage

### Module Definition And Metadata Tests

`documentProjectWorkflow.test.ts` must verify:

- exact identity, description, entry copy, persona object, and four checklist labels
- exact automatic fixed-project definition, root output placement, and entry project-value mapping
- no legacy `projectSubfolder`, `.md` alias, child inheritance, or undeclared value key
- exact 28-key workflow-value inventory and no AI-writable values
- exact two artifact definitions and output mappings
- exact two prerequisite declarations, record order, deterministic resolution mode, empty path segments, filename matches, artifact links, and output destinations
- all prompt templates reference only declared workflow keys
- Steps 1–3 have `kind: "none"` prompt sources and Step 4 has a non-empty prompt source

### Artifact Registry And Document Tests

Focused registry and `documentProjectDocument.test.ts` coverage must verify:

- exact Project Overview and Developer Guide enum values and every registry field
- both discovery expressions match only the exact canonical filename
- both artifacts are singleton project artifacts with no sidecar behavior
- root placement produces the filename alone as artifact-relative path
- adopted and newly allocated artifacts produce equivalent complete output metadata
- each initial builder produces the exact prescribed content, blank lines, heading order, indentation, punctuation, and final newline
- neither builder emits source example delimiters or reads source/BMAD files
- generated Developer Guide content retains every pre-generated Local Development Instructions, Code Quality, and Commit Guidelines line

### Workflow Form Tests

Form tests must verify:

- both forms use `definitionVersion: 2`
- exact titles and empty `toolDictionaryTitle` / `toolDictionaryMarkdown`
- exact panel titles, prompts, field kinds, allowed value types, required flags, labels, option values/order, selection cardinality, durable destinations, allowed actions, and submit label
- no field, helper, placeholder, notice, description, cancel action, back action, or additional UI copy exists
- Form 1 Panels A–C are fieldless and write no workflow values
- Form 1 Panel D writes only `session_objective`
- Form 2 persists each value before the next panel observes workflow state
- Form 2 uses shared boolean presentation without module-owned true/false labels
- Form 2's four route combinations select skip, A–I, J–L, or A–L exactly
- Panel I completes when Developer Guide creation is false and routes to J when it is true
- invalid initial-panel state selects the exact prescribed routing message
- form definitions and decision trees add no module-specific rendering, value-persistence, or transition failure message, wrapper, or route

### Step 1 And Prerequisite Runtime Tests

Runtime coverage must verify:

- main-agent activation renders the informational entry panel and never the interactive project selector
- main-agent automatic project discovery and finalization do not run before successful informational-panel submission, then run exactly once afterward
- interactive and automatic selection call `discoverWorkflowCandidates(...)` with the same project-output-root, workspace-path-policy, directory-only immediate-child, `buildLabel: (entryName) => entryName`, alphabetical request and with no target segments or naming pattern
- automatic selection supplies fixed candidate `agent-guidance`, derives `existing` from an exact candidate match and `new` from its absence, and performs discovery before creating the fixed project folder
- the exact fixed project values are assigned to normal session project-selection state and persisted through the three `entryProjectValueKeys`
- interactive and automatic selection invoke the shared `finalizeWorkflowProjectSelection(...)` behavior, and automatic selection does not synthesize a project-selection form submission
- shared finalization clears the completed entry form, persists the three project values, creates required folders, records project-selection completion, and preserves the existing `new` or `existing` entry-artifact-resolution continuation
- the correct selected root is derived from the project output root and `session.projectSelection.projectFolderName`, with no separate selected-project-root workflow value
- child automatic selection does not copy an unrelated parent project or render an entry form
- Step 1's first action resolves `project_overview` then `developer_guide`
- no Workflow Form 1 panel renders before both results persist
- exact-filename root discovery, selected-project containment, and workspace path-policy enforcement
- no-match does not persist an intended path
- found files are adopted without modification and with complete metadata
- linked artifacts bypass prerequisite-choice and singleton conflict/replacement/archive/delete UI
- all four result combinations select exactly Panels A, B, C, and D respectively
- unresolved, duplicate, contradictory, undeclared, path-inconsistent, or metadata-inconsistent results fail closed
- persisted complete results are reused and failed atomic mutation is rerun through the existing shared resume behavior

### Step 2 Artifact And Failure Tests

Module/runtime integration tests must verify:

- both creation-required booleans derive and persist before any allocation
- `found`/path-set derives `false`; `not_found`/path-unset derives `true`
- a result/path disagreement terminates before allocating either artifact
- booleans are not recomputed from path presence after allocation
- none-missing, Project-Overview-only, Developer-Guide-only, and both-missing combinations
- existing artifacts and their content are preserved
- only a missing artifact may be allocated
- unresolved or found linked prerequisites fail closed if allocation is attempted
- allocation persists exact canonical metadata and full absolute path
- each missing artifact is allocated before its corresponding scaffold is built
- both-missing execution order is Project Overview allocation/build, then Developer Guide allocation/build
- each successful result persists before the next action
- an unexpected exclusive-write collision fails without suffixing or overwriting
- the first allocation failure retries that same allocation once
- a second allocation failure uses the artifact-specific exact error
- scaffold failure does not retry and uses the artifact-specific exact error
- a failure blocks the next artifact and Step 3
- resume uses the existing shared capability as-is, does not add module state, does not reallocate an already allocated artifact, and does not scaffold over a found or already initialized artifact

No test may require a Document Project-specific repair to the shared artifact resume mechanism.

### Step 3 Routing Tests

Tests must cover:

- both flags false skips the form and transitions to Step 4
- Project Overview true / Developer Guide false starts at A and completes at I
- Project Overview false / Developer Guide true starts at J and completes at L
- both true starts at A, transitions I → J, and completes at L
- exact A–I and J–L sequence
- every field persists to the exact durable key with the prescribed value type
- invalid flags use the exact prescribed baseline-data routing error
- form rendering, durable-value persistence, and transitions rely on shared runtime handling without module-owned overrides
- skipped panels do not write or clear unrelated workflow values

### Step 4 Prompt And Completion Tests

Prompt-builder tests must cover all five variants and verify:

- exactly one valid branch is selected
- exact named-section order from the assembly matrix
- Shared paths appears in all five variants
- Both-created status appears only when both flags are true
- the correct status, input, and work sections appear for each single-missing case
- neither baseline-input section appears when both flags are false
- exact objective values select the two existing-document branches
- the exact literal `docs/projects/agent-guidance` appears at every prescribed location in both existing-document branches, with no project-folder workflow token
- an absent, malformed, or unsupported objective with both flags false selects the exact Step 4 routing error
- every required workflow token materializes to a non-empty rendered value
- no unresolved token, bare source workflow reference, conditional authoring marker, example delimiter, or unselected branch prose remains
- the source's spelling, wording, and duplicate numbering anomalies remain unchanged

Completion tests must verify:

- Step 4 initially returns `project_prompt`
- successful `attempt_completion` emits `attempt_completion_succeeded`
- that event selects `complete_workflow`
- failed or unrelated model tools do not complete the workflow
- completion tears down the workflow and clears workflow values, form state, prompt state, and focus-chain projection through shared runtime behavior

Prompt tests must use stable shape and invariant assertions rather than a full-prompt snapshot.

### Tool Schema Tests

`documentProjectToolSchemas.test.ts` must verify:

- Steps 1, 2, and 3 each return exactly `[]`
- Step 4 returns the exact 11 ids and exact projected names in the prescribed order
- every Step 4 spec is deeply equal to the corresponding registered `ModelFamily.NATIVE_GPT_5` shared spec
- no shared description, parameter, required-field, or context requirement is locally copied or changed
- the complete Step 4 override includes `send_user_message`, `ask_followup_question`, and `attempt_completion`
- every forbidden backend, mutation, progression, legacy, subagent, skill, web, browser, and MCP tool is absent

### Prompt Integration And Regression Tests

System-prompt integration coverage must prove:

- current Step 4 details appear in both the full-turn and continuation-turn input workflow blocks, not as ad hoc system-prompt content
- both input workflow blocks include the exact four-step checklist under the shared projection contract
- persona projection follows the task-first-request gate and appears only in the full-turn input workflow block
- Steps 1–3 retain the shared current-step heading/label without module-owned instruction text
- no workflow-specific system-instructions block is projected
- Step 1–3 empty overrides do not fall back to default native tools
- Step 4 projects exactly the 11-tool override
- response-tool guidance agrees with the projected response tools
- no `build_workflow_document`, `create_workflow_artifact`, `set_workflow_values`, or `workflow_progress_request` model-facing schema leaks
- no source workflow path, BMAD content, placeholder workflow content, or conditional authoring marker leaks into prompts

Registry and activation regression coverage must prove:

- canonical name, slash command, and `useSkillName` resolve the module
- no `.md` alias resolves it
- existing shipped workflows remain registered after the project-selection and output-placement migration
- existing workflows declare interactive project selection and preserve their approved output placements
- shipped metadata mirrors definition selection and placement without `entryProjectValueKeys`

Path coverage owned by this module build must prove:

- project folder creation, prerequisite scanning, artifact allocation, and deterministic document builds remain within the selected project/workspace boundaries
- no direct module `fs` access bypasses shared capabilities

Step 4 file-tool registration, strict-plan-mode, approval, auto-approval, hook, `.clineignore`, and workspace path-policy behavior remains governed by the existing shared implementation and its existing regression suites. The action plan must run the relevant existing shared regression suites but must not add or modify shared execution-control tests unless this module build changes that shared behavior.

### Shared Capability And Handler Scope

This module adds no specialized backend tool or handler. No new specialized-handler test suite is required.

If the action plan must touch an existing shared artifact, document-generation, form, prompt, registry, or runtime capability to expose the already-approved contract, it must update that capability's focused existing tests without recasting unrelated behavior. Such changes must preserve the shared capability's current copy and semantics. Merely projecting an existing shared Step 4 tool does not authorize changes to that tool's handler or execution-control tests.

## Required Validation

The implementation action plan must include, at minimum, these focused commands with the exact final file set adjusted to the files the approved action plan changes:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/document-project/__tests__/documentProjectDocument.test.ts
npm run test:unit -- src/core/task/workflow-runtime/__tests__/WorkflowRuntime.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
npm run package
```

The action plan must also prescribe focused static checks proving:

- no runtime import or read of the source workflow markdown or `.cline/skills/bmad-document-project`
- no legacy `projectSubfolder` remains after the approved project-selection/output-placement migration
- no forbidden tool id appears in `documentProjectToolSchemas.ts`
- no direct `fs`, `fs/promises`, BMAD, placeholder-workflow, or ad hoc prompt replacement logic exists in the Document Project module
- `.cline/skills/bmad-document-project/**/*` remains unchanged

## Completion Criteria

The Document Project module build is complete only when:

- the approved project-selection, output-placement, and automatic fixed-project contracts are represented in shared types, definitions, shipped metadata, validation, and runtime selection
- both artifact families are fully registered
- the module is code-owned, registered, source-independent, and activates through all canonical entrypoints
- automatic selected-project resolution, prerequisites, both forms, both initial builders, all four steps, all deterministic routes, all exact failure messages, all five Step 4 prompt variants, and explicit completion are implemented
- Steps 1–3 expose exact empty tool overrides and Step 4 exposes the exact 11-tool override
- existing shared allocation, scaffolding, persistence, and resume behavior is reused without a Document Project-specific lifecycle extension
- all prescribed behavioral, contract, regression, prompt-projection, artifact, routing, form, failure-path, and migration-safety tests pass
- the required validation commands pass
- the legacy Document Project BMAD package remains untouched
