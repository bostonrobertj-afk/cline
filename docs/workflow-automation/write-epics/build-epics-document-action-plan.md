---
title: Build Epics Document Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/generated-file change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - This plan implements only the `build_epics_document` custom-tool capability for `create-epics.md`. Do not modify workflow-start-form code, deterministic progression code, or `/Users/robertboston/Documents/Cline/Workflows/create-epics.md` while executing this plan.
  - The requirements document at `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/build-epics-document-requirements.md` remains the primary source of truth, except where later user-approved scope decisions in this thread narrowed implementation details for this pass.
---

# Build Epics Document Action Plan

## Supersession

The `inputDocuments` frontmatter contract prescribed in this plan's Verified Live Contracts, Locked Decisions, Step 2, and Step 4 was authored from legacy template/BMAD references instead of the user-authored [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md) workflow contract and is superseded by [build-epics-document-frontmatter-remediation-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-frontmatter-remediation-action-plan.md).

For `build_epics_document`, the generated `epics.md` frontmatter must:

- preserve `stepsCompleted`
- write labeled `Architecture`, `PRD`, and optional `UI/UX` entries
- not use `inputDocuments` as the Step 2 source-document contract

This plan implements only the `build_epics_document` requirements described in:

- [build-epics-document-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-requirements.md)
- [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md)
- [epics-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md)
- [step-01-validate-prerequisites.md](/Users/robertboston/Documents/Cline%20Extension/cline/_bmad/bmm/workflows/3-solutioning/bmad-create-epics-and-stories/steps/step-01-validate-prerequisites.md)

## Scope

This plan is intentionally limited to:

- registering and exposing the new workflow-owned tool `build_epics_document`
- implementing the runtime handler that builds or resolves `{output_folder}/planning_artifacts/epics.md`
- persisting `{output_file}` into active workflow placeholder state after successful execution
- adding focused runtime, prompt-surface, contextual-filter, and snapshot coverage for the new tool

This plan does not implement:

- workflow-start-form collection for `create-epics.md`
- deterministic progression for `create-epics.md`
- Step 3 epic drafting behavior
- any edits to `/Users/robertboston/Documents/Cline/Workflows/create-epics.md`

## Verified Live Contracts

- [epics-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md#L1) already provides the canonical frontmatter fields `stepsCompleted` and `inputDocuments`.
- [step-01-validate-prerequisites.md](/Users/robertboston/Documents/Cline%20Extension/cline/_bmad/bmm/workflows/3-solutioning/bmad-create-epics-and-stories/steps/step-01-validate-prerequisites.md#L59) explicitly says the copied epics document should list loaded files in `inputDocuments: []`.
- [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md#L13) defines the canonical Step 2 artifact path as `{output_folder}/planning_artifacts/epics.md`.
- [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md#L24) defines the Step 2 outcome that the canonical artifact must be available as `{output_file}`.
- [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts#L113) already resolves stable placeholders including `project-root`, `project_root`, `cwd`, and config-backed placeholders like `output_folder`.
- [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L84) and [placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/managed-workflows/placeholders.ts#L31) already provide the live placeholder-state mutation path the handler can reuse to establish `{output_file}`.
- [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L22) is the closest sibling for a zero-human-input workflow-owned artifact tool with atomic file replacement and write-proof persistence.
- [build_review_input.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_input.ts#L7) is the closest sibling prompt-tool spec for a no-parameter workflow-owned tool.
- [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L175) currently filters `create-epics.md` Step 2 down to `DOC_READ` and `DOC_WRITE` only, so a new native tool will remain hidden there unless the matrix is explicitly updated.

## Locked Decisions

- The new canonical tool id and exposed tool name are exactly `build_epics_document`.
- The runtime handler file is named exactly `BuildEpicsDocumentToolHandler.ts`.
- The only canonical Step 2 artifact path is `{output_folder}/planning_artifacts/epics.md`.
- On success, the tool result payload must be exactly these keys:
  - `persisted`
  - `artifact_path`
  - `mode`
  - `output_file_available`
- The handler must establish `{output_file}` by mutating active workflow placeholder state in runtime, not by adding a new workflow-form seam.
- The template frontmatter augmentation for this pass updates only the existing `inputDocuments` array.
- `inputDocuments` must be written in this exact order:
  - resolved `architecture_document`
  - resolved `prd`
  - resolved `ui_spec` when present
  - resolved `ux_spec` when present
- Per user-approved scope for this pass, leave `### UX Design Requirements` intentionally unpopulated.
- Per the current requirements document scope, do not parse the architecture document into `### Additional Requirements`; record the architecture path only in frontmatter.
- Preserve the intentionally truncated template tail exactly as-is, including the final `## Epic {{N}}: {{epic_title_N}}` heading and trailing blank lines.
- Do not replace `{{project_name}}` in this pass.
- The new contextual bundle name is exactly `EPICS_BUILD`.

## String-Contract Audit

Use these exact strings everywhere in this plan:

- tool id: `build_epics_document`
- enum member: `BUILD_EPICS_DOCUMENT`
- handler class: `BuildEpicsDocumentToolHandler`
- contextual bundle: `EPICS_BUILD`
- artifact path expression: `{output_folder}/planning_artifacts/epics.md`
- result keys:
  - `persisted`
  - `artifact_path`
  - `mode`
  - `output_file_available`
- supported modes:
  - `new`
  - `continue`
- required placeholder keys:
  - `mode`
  - `architecture_document`
  - `prd`
  - `output_folder`
- optional placeholder keys:
  - `ui_spec`
  - `ux_spec`
- PRD section headings to extract:
  - `## Functional Requirements`
  - `## Non-Functional Requirements`
  - `## Domain-Specific Requirements`
  - `## Roadmap`
- template section markers to populate:
  - `### Functional Requirements`
  - `### NonFunctional Requirements`
  - `### Additional Requirements`
  - `### UX Design Requirements`
  - `### Domain-Specific Requirements`
  - `## Roadmap`
  - `### FR Coverage Map`

## Step 1
[x] Register `build_epics_document` across the shared tool enum, prompt-tool registry, prompt variants, and compact native-tool descriptions.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_epics_document.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`

Exact edits:
1. In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L38-L41), add the new enum member immediately after `BUILD_REVIEW_INPUT`:

```ts
	BUILD_EPICS_DOCUMENT = "build_epics_document",
```

2. Do not add `BUILD_EPICS_DOCUMENT` to `READ_ONLY_TOOLS`.
3. Create the new file [build_epics_document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_epics_document.ts) with this exact structure:
   - import `ModelFamily`, `ClineDefaultTool`, and `ClineToolSpec`
   - set `const id = ClineDefaultTool.BUILD_EPICS_DOCUMENT`
   - export one `generic` variant with:
     - `id`
     - `variant: ModelFamily.GENERIC`
     - `name: "build_epics_document"`
     - `description: "Build or resolve the canonical epics artifact at {output_folder}/planning_artifacts/epics.md from workflow-owned placeholder state. Resolve inputs from workflow state; there are no human-supplied parameters."`
     - `parameters: []`
   - export `build_epics_document_variants = [generic]`
4. In [tools/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L7-L8), export the new tool file immediately after `build_review_input`.
5. In [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L9-L10), import `build_epics_document_variants` immediately after `build_review_input_variants`.
6. In [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L50-L52), spread `...build_epics_document_variants` immediately after `...build_review_input_variants`.
7. In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L484-L488), add a new compact-description case immediately after `build_review_input`:

```ts
		case "build_epics_document":
			return "Build or resolve the canonical epics artifact at {output_folder}/planning_artifacts/epics.md from workflow-owned placeholder state. Resolve inputs from workflow state; there are no human-supplied parameters."
```

8. In each of these 12 variant config files, insert `ClineDefaultTool.BUILD_EPICS_DOCUMENT` immediately after the existing `ClineDefaultTool.BUILD_REVIEW_INPUT` line:
   - [devstral/config.ts:60](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts#L60)
   - [gemini-3/config.ts:72](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts#L72)
   - [generic/config.ts:80](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts#L80)
   - [glm/config.ts:60](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts#L60)
   - [gpt-5/config.ts:70](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts#L70)
   - [hermes/config.ts:62](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts#L62)
   - [native-gpt-5-1/config.ts:77](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts#L77)
   - [native-gpt-5/config.ts:82](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts#L82)
   - [native-next-gen/config.ts:70](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts#L70)
   - [next-gen/config.ts:75](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts#L75)
   - [trinity/config.ts:61](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts#L61)
   - [xs/config.ts:56](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts#L56)
9. Do not modify executor wiring, auto-approval, or response-tool registry in this step; those runtime surfaces are handled in Step 2 with the real handler file present.

## Step 2
[x] Implement `BuildEpicsDocumentToolHandler`, wire it into the runtime executor/approval/registry surfaces, and persist `{output_file}` after successful execution.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`

Exact edits:
1. Create the new file [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts) and implement one handler class named exactly `BuildEpicsDocumentToolHandler`.
2. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L11-L13), import `BuildEpicsDocumentToolHandler` immediately after `BuildReviewInputToolHandler`.
3. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L123-L125), register the new handler immediately after `BUILD_REVIEW_INPUT`:

```ts
			[ClineDefaultTool.BUILD_EPICS_DOCUMENT]: (_v: ToolValidator) => new BuildEpicsDocumentToolHandler(),
```

4. In [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L54-L56), [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L81-L83), and [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L110-L113), add `ClineDefaultTool.BUILD_EPICS_DOCUMENT` immediately after `ClineDefaultTool.BUILD_REVIEW_INPUT` in all three edit-file approval branches.
5. In [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L84-L86), add:

```ts
		[ClineDefaultTool.BUILD_EPICS_DOCUMENT]: undefined,
```

immediately after `BUILD_REVIEW_INPUT`.
6. The new file must mirror the sibling handler structure used in [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L22):
   - implement `IToolHandler` and `IPartialBlockHandler`
   - expose `readonly name = ClineDefaultTool.BUILD_EPICS_DOCUMENT`
   - `getDescription()` must return exactly `[build_epics_document]`
   - `handlePartialBlock()` must emit `{"tool":"buildEpicsDocument"}` through `uiHelpers.say("tool", ...)`
7. Add a local `atomicReplaceTextFile(filePath: string, content: string)` helper in this file that matches the temp-file swap behavior used in [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L22-L37).
8. Add a local `parseFrontmatterDocument(markdown: string)` helper that:
   - requires the document to start with `---\n`
   - splits on the first closing frontmatter delimiter `\n---\n`
   - parses the YAML block with `yaml.load(..., { schema: yaml.JSON_SCHEMA })`
   - throws an `Error` if frontmatter is missing or does not parse to a plain object
   - returns `{ frontmatter: Record<string, unknown>, body: string }`
9. Add a local `serializeFrontmatterDocument(frontmatter: Record<string, unknown>, body: string)` helper that returns:

```ts
`---\n${yaml.dump(frontmatter, { lineWidth: -1 }).trimEnd()}\n---\n\n${body.replace(/^\n+/, "")}`
```

10. Add a local `extractRequiredPrdSection(markdown: string, heading: string, prdPath: string)` helper that:
   - reads only level-2 PRD sections
   - finds the exact heading line `## ${heading}`
   - captures content until the next `\n## ` heading or end-of-document
   - trims the captured body
   - throws `new Error(\`Could not find required PRD section '## ${heading}' in ${prdPath}.\`)` if the section is absent
11. Add a local `replaceTemplateSection(templateBody: string, startMarker: string, endMarker: string, replacement: string)` helper that:
   - requires both markers to exist
   - preserves everything outside the marker range exactly
   - writes the replacement body as:

```ts
`${startMarker}${replacement.trim() ? `${replacement.trim()}\n\n` : "\n"}`
```

   - throws if either marker is missing
12. Add a local `applyGenericWorkflowPlaceholders(...)` helper copied from [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L84-L108), still using `applyManagedWorkflowDynamicPlaceholders(...)` and a synthetic `ManagedWorkflowRunState`.
13. Add a local `persistOutputFilePlaceholder(config: TaskConfig, outputFilePath: string)` helper that:
   - if `config.taskState.managedWorkflowRun` exists, updates it with `{ output_file: outputFilePath }` via `applyManagedWorkflowDynamicPlaceholders(...)`
   - otherwise requires `config.taskState.activePlaceholderWorkflowId` and updates `config.taskState.activePlaceholderWorkflowValues` via the synthetic generic-workflow helper
   - if no active placeholder-capable workflow exists, throws `new Error("No active workflow with placeholder support is currently active.")`
   - when `config.isSubagentExecution === false`, saves metadata exactly like [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L219-L231)
   - always calls `await config.callbacks.updateFCListFromToolResponse(undefined)` after a successful state update
14. In `execute(...)`, resolve merged workflow placeholders with `getPlaceholderWorkflowValueMap(...) ?? {}` exactly like [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L50-L54).
15. Resolve required workflow-owned inputs by trimming these exact keys from merged placeholder state:
   - `mode`
   - `architecture_document`
   - `prd`
16. Resolve optional workflow-owned inputs by trimming these exact keys:
   - `ui_spec`
   - `ux_spec`
17. Missing required inputs must return `formatResponse.toolError(...)` with these exact messages:
   - `Could not resolve workflow placeholder 'mode' from the active placeholder workflow state.`
   - `Could not resolve workflow placeholder 'architecture_document' from the active placeholder workflow state.`
   - `Could not resolve workflow placeholder 'prd' from the active placeholder workflow state.`
18. Resolve stable placeholders with `await buildWorkflowStablePlaceholders({ cwd: config.cwd })`.
19. Resolve the canonical artifact raw path with:

```ts
const artifactRaw = resolveWorkflowPlaceholderText("{output_folder}/planning_artifacts/epics.md", stablePlaceholders)
```

20. If `artifactRaw` is empty, return:
   - `formatResponse.toolError("Could not resolve stable placeholder 'output_folder' from .cline/workflow-config.yaml.")`
21. Resolve the template raw path with:

```ts
const templateRaw = resolveWorkflowPlaceholderText(
	"{project-root}/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md",
	stablePlaceholders,
)
```

22. Resolve the document path base in this exact order:
   - merged `cwd`
   - merged `project_root`
   - merged `project-root`
   - stable `cwd`
   - `config.cwd`
23. Resolve `architecture_document`, `prd`, `ui_spec`, and `ux_spec` to absolute paths against that base when they are relative.
24. Resolve `artifactRaw` and `templateRaw` to absolute paths against `config.cwd` when they are relative.
25. If `mode` is neither `new` nor `continue`, return:
   - `formatResponse.toolError(\`Unsupported workflow mode "${mode}". Supported values: new, continue.\`)`
26. When `mode === "continue"`:
   - do not ask for file-write approval
   - do not read the template
   - fail with `formatResponse.toolError(\`Could not continue create-epics workflow because the canonical epics artifact does not exist at ${artifactPath}.\`)` when the artifact is absent
   - call `persistOutputFilePlaceholder(config, artifactPath)`
   - set `config.taskState.consecutiveMistakeCount = 0`
   - return exactly:

```json
{"persisted":false,"artifact_path":"<absolute path>","mode":"continue","output_file_available":true}
```

27. When `mode === "new"`:
   - read the template file
   - read the PRD file
   - do not parse `ui_spec`, `ux_spec`, or the architecture document body in this pass
28. In `new` mode, set `inputDocuments` on parsed template frontmatter to this exact ordered array:
   - resolved `architecture_document`
   - resolved `prd`
   - resolved `ui_spec` when present
   - resolved `ux_spec` when present
29. Preserve every other existing frontmatter field unchanged.
30. Extract these exact PRD section bodies with `extractRequiredPrdSection(...)`:
   - `Functional Requirements`
   - `Non-Functional Requirements`
   - `Domain-Specific Requirements`
   - `Roadmap`
31. Do not attempt to extract a PRD UI/UX section in this pass.
32. Rebuild the template body by applying `replaceTemplateSection(...)` in this exact order and with these exact markers:
   - Functional:
     - start marker: `"### Functional Requirements\n\n"`
     - end marker: `"### NonFunctional Requirements\n"`
     - replacement: extracted functional section body
   - Non-functional:
     - start marker: `"### NonFunctional Requirements\n\n"`
     - end marker: `"### Additional Requirements\n"`
     - replacement: extracted non-functional section body
   - Additional:
     - start marker: `"### Additional Requirements\n\n"`
     - end marker: `"### UX Design Requirements\n"`
     - replacement: `""`
   - UX:
     - start marker: `"### UX Design Requirements\n\n"`
     - end marker: `"### Domain-Specific Requirements\n"`
     - replacement: `""`
   - Domain:
     - start marker: `"### Domain-Specific Requirements\n\n"`
     - end marker: `"## Roadmap\n"`
     - replacement: extracted domain section body
   - Roadmap:
     - start marker: `"## Roadmap\n\n"`
     - end marker: `"### FR Coverage Map\n"`
     - replacement: extracted roadmap section body
33. Preserve `### FR Coverage Map`, `## Epic List`, and the intentionally truncated tail exactly as they appear in the template.
34. For `new` mode approval, mirror the write-approval flow used in [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts#L113-L157):
   - approval target path is the resolved artifact path
   - tool preview `tool` value must be `buildEpicsDocument`
   - preview `path` must be the readable artifact path
   - preview `content` must list the PRD path and template path
35. After approval in `new` mode:
   - write the rebuilt document with `atomicReplaceTextFile(...)`
   - call `recordAndPersistPlaceholderWorkflowWriteProof(...)` for the artifact path
   - set `config.taskState.didEditFile = true`
   - clear `config.taskState.fileReadCache` for the artifact path
36. After a successful `new` write:
   - call `persistOutputFilePlaceholder(config, artifactPath)`
   - set `config.taskState.consecutiveMistakeCount = 0`
   - return exactly:

```json
{"persisted":true,"artifact_path":"<absolute path>","mode":"new","output_file_available":true}
```

37. Do not:
   - call `set_workflow_placeholders`
   - add any public parameters to the tool
   - replace `{{project_name}}`
   - populate `### Additional Requirements`
   - populate `### UX Design Requirements`
   - fabricate write proof in `continue` mode

## Step 3
[x] Add the new contextual native-tool bundle for `create-epics.md` Step 2 and cover the prompt-surface contracts for global availability, compact descriptions, and step-specific filtering.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

Exact edits:
1. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L3-L18), add `| "EPICS_BUILD"` immediately after `| "DIFF_BUILD"`.
2. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L34-L40), add the new bundle immediately after `DIFF_BUILD`:

```ts
	EPICS_BUILD: [ClineDefaultTool.BUILD_EPICS_DOCUMENT],
```

3. In the `create-epics.md` row at [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L175-L180), change Step 2 from:

```ts
		2: ["DOC_READ", "DOC_WRITE"],
```

to:

```ts
		2: ["DOC_READ", "DOC_WRITE", "EPICS_BUILD"],
```

4. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L23-L24), import `build_epics_document_variants` immediately after `build_review_input_variants`.
5. Immediately after the existing `build_review_input` global-availability test at [spec.test.ts:343](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L343-L346), add:
   - `it("keeps build_epics_document globally available without workflow gating", () => { ... })`
   - assert `build_epics_document_variants[0].contextRequirements === undefined`
6. Immediately after the existing `compacts native build_review_input descriptions and parameter text` test at [spec.test.ts:811](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L811-L830), add:
   - `it("compacts native build_epics_document descriptions and parameter text", () => { ... })`
   - use the same minimal GPT native context shape as the sibling test
   - assert the OpenAI tool description is exactly:

```ts
"Build or resolve the canonical epics artifact at {output_folder}/planning_artifacts/epics.md from workflow-owned placeholder state. Resolve inputs from workflow state; there are no human-supplied parameters."
```

   - assert `Object.keys(openAIProperties)` is exactly `[]`
7. In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L156-L212), insert a new test immediately after the existing `code-review step 3` test titled exactly:
   - `applies create-epics step 2 row and keeps build_epics_document without placeholder-write tools`
8. That new contextual-filter test must:
   - use `activePlaceholderWorkflowName: "create-epics.md"`
   - use `activePlaceholderWorkflowStepNumber: 2`
   - register these native tools:
     - `LIST_FILES`
     - `SEARCH`
     - `FILE_READ`
     - `FILE_READ_RANGE`
     - `APPLY_PATCH`
     - `FILE_NEW`
     - `BUILD_EPICS_DOCUMENT`
     - `SET_WORKFLOW_PLACEHOLDERS`
     - `ASK`
     - `SEND_USER_MESSAGE`
     - `ATTEMPT`
     - `PLAN_MODE`
     - `BROWSER`
     - `MCP_ACCESS`
     - `NEW_TASK`
   - assert the kept ids include:
     - `LIST_FILES`
     - `SEARCH`
     - `FILE_READ`
     - `FILE_READ_RANGE`
     - `APPLY_PATCH`
     - `FILE_NEW`
     - `BUILD_EPICS_DOCUMENT`
     - `ASK`
     - `SEND_USER_MESSAGE`
     - `ATTEMPT`
     - `BROWSER`
     - `MCP_ACCESS`
     - `NEW_TASK`
   - assert the kept ids do not include:
     - `SET_WORKFLOW_PLACEHOLDERS`
     - `PLAN_MODE`
9. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L473-L476), add `expect(toolNames).to.include("build_epics_document")` immediately after the existing `build_review_input` assertion.
10. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L495-L496), add the same `build_epics_document` assertion immediately after the existing `build_review_input` assertion.
11. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1150-L1205), insert a new test immediately after `filters native tools for code-review step 3` titled exactly:
   - `filters native tools for create-epics step 2`
12. That new integration test must:
   - use `providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai")`
   - set `enableNativeToolCalls: true`
   - set `useMinimalGptPrompt: true`
   - set `activeWorkflowSupportsPlaceholders: true`
   - set `managedWorkflowActive: false`
   - set `activePlaceholderWorkflowName: "create-epics.md"`
   - set `activePlaceholderWorkflowStepNumber: 2`
   - assert the native tool names include:
     - `build_epics_document`
     - `list_files`
     - `search_files`
     - `read_file`
     - `read_file_range`
     - `apply_patch`
     - `write_to_file`
     - `attempt_completion`
   - assert the native tool names do not include:
     - `set_workflow_placeholders`
     - `execute_command`
     - `generate_plan_output`
     - any Indxr-prefixed MCP tool names

## Step 4
[x] Add focused handler and registry tests for `build_epics_document`, including `new`, `continue`, negative, relative-path, and non-response-tool coverage.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`

Exact edits:
1. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L18-L24), import `BuildEpicsDocumentToolHandler` immediately after `BuildReviewInputToolHandler`.
2. Immediately after `createReviewInputRepo(...)` in [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L169), add a new helper named exactly `createBuildEpicsDocumentRepo(options?: { includeWorkflowConfig?: boolean; preexistingArtifact?: string })`.
3. That helper must:
   - create a temp git repo
   - write `.cline/workflow-config.yaml` when `includeWorkflowConfig !== false` with:

```yaml
output_folder: "planning"
```

   - write the live template file to:
     - `.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md`
   - write:
     - `docs/architecture.md`
     - `docs/prd.md`
     - `docs/ui-spec.md`
     - `docs/ux-spec.md`
   - make the PRD content include these exact level-2 sections:
     - `## Functional Requirements`
     - `## Non-Functional Requirements`
     - `## Domain-Specific Requirements`
     - `## Roadmap`
   - use relative placeholder-path targets in the helper return object:
     - `architectureRelativePath = "docs/architecture.md"`
     - `prdRelativePath = "docs/prd.md"`
     - `uiSpecRelativePath = "docs/ui-spec.md"`
     - `uxSpecRelativePath = "docs/ux-spec.md"`
   - return the resolved canonical artifact path:
     - `${repoDir}/planning/planning_artifacts/epics.md`
4. Immediately after the existing `build_review_input` tests at [ManagedWorkflowHandlers.test.ts:1761](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L1761), add these `build_epics_document` tests in this exact order.
5. Add a positive `new` mode test titled exactly:
   - `builds and atomically replaces planning_artifacts/epics.md from the template and PRD sections when mode=new`
6. In that `mode=new` test:
   - use `createBuildEpicsDocumentRepo({ preexistingArtifact: "# stale\\n" })`
   - set `config.taskState.activePlaceholderWorkflowId = "create-epics.md"`
   - set `config.taskState.activePlaceholderWorkflowValues` to exactly:

```ts
{
	mode: "new",
	architecture_document: architectureRelativePath,
	prd: prdRelativePath,
	ui_spec: uiSpecRelativePath,
	ux_spec: uxSpecRelativePath,
}
```

   - execute the handler with `params: {}`
   - assert the parsed payload is exactly:
     - `persisted === true`
     - `mode === "new"`
     - `output_file_available === true`
     - `artifact_path === artifactPath`
   - assert `config.taskState.activePlaceholderWorkflowValues?.output_file === artifactPath`
   - assert `config.taskState.activePlaceholderWorkflowTaskWriteProofPaths` includes `artifactPath`
   - assert the written artifact contains:
     - `inputDocuments:`
     - the resolved absolute architecture path
     - the resolved absolute PRD path
     - the resolved absolute UI spec path
     - the resolved absolute UX spec path
     - `### Functional Requirements`
     - `FR1:`
     - `### NonFunctional Requirements`
     - `NFR1:`
     - `### Additional Requirements`
     - `### UX Design Requirements`
     - `### Domain-Specific Requirements`
     - `## Roadmap`
     - `### FR Coverage Map`
     - `## Epic {{N}}: {{epic_title_N}}`
   - assert the artifact contains the exact blank-section sequence:

```md
### Additional Requirements

### UX Design Requirements

### Domain-Specific Requirements
```

7. Add a positive `continue` mode test titled exactly:
   - `resolves the canonical epics artifact and sets output_file when mode=continue`
8. In that `mode=continue` test:
   - use `createBuildEpicsDocumentRepo({ preexistingArtifact: "# existing epics\\n" })`
   - set `config.taskState.activePlaceholderWorkflowId = "create-epics.md"`
   - set `config.taskState.activePlaceholderWorkflowValues` to exactly:

```ts
{
	mode: "continue",
	architecture_document: architectureRelativePath,
	prd: prdRelativePath,
}
```

   - execute the handler with `params: {}`
   - assert the parsed payload is exactly:
     - `persisted === false`
     - `mode === "continue"`
     - `output_file_available === true`
     - `artifact_path === artifactPath`
   - assert `config.taskState.activePlaceholderWorkflowValues?.output_file === artifactPath`
   - assert the artifact contents remain exactly `"# existing epics\n"`
   - assert `config.taskState.activePlaceholderWorkflowTaskWriteProofPaths` remains exactly `[]`
9. Add these six negative tests with these exact titles:
   - `requires mode from merged placeholder state for build_epics_document`
   - `rejects unsupported mode values for build_epics_document`
   - `requires architecture_document from merged placeholder state for build_epics_document`
   - `requires prd from merged placeholder state for build_epics_document`
   - `requires output_folder from workflow-config stable placeholders for build_epics_document`
   - `fails continue mode when the canonical epics artifact does not exist`
10. In each negative test, assert these exact failure messages:
   - missing mode:
     - `formatResponse.toolError("Could not resolve workflow placeholder 'mode' from the active placeholder workflow state.")`
   - invalid mode:
     - `formatResponse.toolError('Unsupported workflow mode "resume". Supported values: new, continue.')`
   - missing architecture document:
     - `formatResponse.toolError("Could not resolve workflow placeholder 'architecture_document' from the active placeholder workflow state.")`
   - missing prd:
     - `formatResponse.toolError("Could not resolve workflow placeholder 'prd' from the active placeholder workflow state.")`
   - missing output_folder:
     - `formatResponse.toolError("Could not resolve stable placeholder 'output_folder' from .cline/workflow-config.yaml.")`
   - missing continue artifact:
     - `formatResponse.toolError(\`Could not continue create-epics workflow because the canonical epics artifact does not exist at ${artifactPath}.\`)`
11. The `mode=new` positive test is the relative-path regression for this capability. Do not add a second redundant relative-path test; keep the relative document paths and relative `output_folder` coverage inside that one positive test.
12. In [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts#L74-L80), add one new test immediately after `registers all governed response tools as turn-ending` titled exactly:
   - `keeps build_epics_document registered as a non-response tool`
13. In that new response-tool test, assert exactly:

```ts
assert.equal(ResponseToolRegistry.get(ClineDefaultTool.BUILD_EPICS_DOCUMENT), undefined)
```

## Step 5
[x] Update the prompt snapshots affected by the new globally exposed tool, then run the focused verification suite and final string-contract audit.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/build-epics-document-action-plan.md`

Exact commands:
1. `npm run test:unit -- src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts --exit`
2. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts --exit`
3. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts --exit`
4. `npm run test:unit -- src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts --exit`
5. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts --update-snapshots --exit`
6. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts --exit`
7. `npx tsc --noEmit`
8. `rg -n "build_epics_document|BUILD_EPICS_DOCUMENT|EPICS_BUILD" src/shared/tools.ts src/core/prompts/system-prompt src/core/task/tools`

Completion criteria:
- All seven test/typecheck commands pass.
- The final `rg` command shows the string contract consistently across the expected runtime surfaces only.
- No files outside the allowed files from Steps 1-4 are modified, except the snapshot files updated by Step 5 and this action-plan document’s checkbox updates.
- If any command fails because of a file or seam not explicitly covered above, stop and report the failure without making any additional changes unless the failure is caused by an explicit mistake in this action plan.
