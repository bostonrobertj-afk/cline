---
title: Create Story Step 2 Automation Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/doc change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - This plan implements only the Step 2 automation requirements in `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/create-story/step-2-automation-requirements.md`.
  - Do not modify `/Users/robertboston/Documents/Cline/Workflows/create-story.md`, workflow-start form code, deterministic progression files, or Step 3/4/5 prompting behavior while executing this plan.
  - Before changing any string, path, placeholder key, tool id, enum member, result field, or artifact path, re-read the corresponding requirement in `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/create-story/step-2-automation-requirements.md`.
---

# Create Story Step 2 Automation Action Plan

This plan implements the workflow-owned Step 2 story scaffold builder defined in:

- [step-2-automation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/create-story/step-2-automation-requirements.md)

Live seams verified before authoring this plan:

- the built-in tool enum and read-only classification live in [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8-L87)
- the sibling shared workflow-step helpers live in [build-epic-delivery-spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-epic-delivery-spec.ts#L1-L29)
- prompt-tool registration and native-schema compaction live in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L1-L36), [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L1-L92), and [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L482-L495)
- contextual tool exposure is currently driven by [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L3-L220) and documented in [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L467-L473)
- runtime handler registration lives in [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L94-L139)
- sibling workflow-owned builder behavior, including atomic replacement, approval payloads, write-proof persistence, and cache invalidation, lives in [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L1-L280)
- placeholder persistence for workflow-owned artifacts lives in [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L85-L198)
- the live story template structure to preserve lives in [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-story/template.md#L1-L47)
- the live epic-delivery-spec story source structure lives in [epic-delivery-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/create-epics/epic-delivery-spec-template.md#L21-L33)
- the current prompt/native and handler test seams live in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L383-L407), [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L989-L1010), [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L442-L620), [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1600-L1711), [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L386-L480), and [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts#L82-L86)

Locked decisions for this pass:

- the canonical built-in tool id is `build_story_document`
- the shared helper file is `src/shared/build-story-document.ts`
- the internal contextual bundle name is `STORY_DOCUMENT_BUILD`
- the tool is workflow-owned and accepts no human-authored parameters
- the tool is gated only for `create-story.md` Step 2
- the canonical template source is the stable placeholder `{story_template}`
- the canonical artifact path is `{output_folder}/implementation-artifacts/story<epic>.<story>.md`
- the selected story source is the `## Story <story_number>` block from `{epic_delivery_spec}`
- the copied section mapping is `### Objective` -> `## Story`, `### Acceptance Criteria` -> `## Acceptance Criteria`, and `### Sequencing/ Dependencies` -> `## Sequencing / Dependencies`
- the generated artifact must preserve `Status: backlog`
- the tool success payload must be exactly `{"persisted":true,"artifact_path":"...","story_doc_available":true}`
- the approved user-facing missing-story / missing-section error for this slice is exactly `Unable to populate story document from the epic delivery spec. Please ensure the epic delivery spec is complete before attempting this workflow.`

## Step 1
[x] Register the shared tool id and the create-story Step 2 gating helper.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/build-story-document.ts`

Exact edits:
1. In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L39-L50), add the exact enum member `BUILD_STORY_DOCUMENT = "build_story_document"` immediately after `BUILD_EPIC_DELIVERY_SPEC = "build_epic_delivery_spec"`.
2. In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L69-L87), do not add `BUILD_STORY_DOCUMENT` to `READ_ONLY_TOOLS`; this tool writes a file and must remain outside the read-only list.
3. Create [build-story-document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-story-document.ts) as the create-story Step 2 sibling of [build-epic-delivery-spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-epic-delivery-spec.ts#L1-L29).
4. In the new shared helper file, export these exact members:
   - `BUILD_STORY_DOCUMENT_WORKFLOW_STEPS = { "create-story.md": [2] } as const`
   - `isBuildStoryDocumentStep(workflowName?: string, stepNumber?: number): boolean`
   - `shouldExposeBuildStoryDocument({ workflowName, stepNumber }: { workflowName?: string; stepNumber?: number }): boolean`
5. Reuse the exact workflow-name normalization pattern used in [build-epic-delivery-spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-epic-delivery-spec.ts#L5-L12), but normalize only:
   - `create-story.md`
   - `create-story`
   - both to `create-story.md`
6. Type the local `allowedSteps` variable exactly `readonly number[]` before calling `.includes(stepNumber)`.

## Step 2
[x] Register `build_story_document` across prompt-tool, contextual-tool, variant, approval, response-registry, and canonical-doc surfaces.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_story_document.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/index.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/init.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/autoApprove.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/contextual-tool-schema.md`

Exact edits:
1. Create [build_story_document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_story_document.ts) next to [build_epic_delivery_spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_epic_delivery_spec.ts#L1-L22).
2. In the new prompt-tool file:
   - set `id = ClineDefaultTool.BUILD_STORY_DOCUMENT`
   - set `variant: ModelFamily.GENERIC`
   - set `name: "build_story_document"`
   - set `parameters: []`
   - set `description` exactly to:
     - `Build the canonical create-story Step 2 scaffold at {output_folder}/implementation-artifacts/story<epic>.<story>.md from workflow-owned placeholder state. Resolve {epic_delivery_spec}, {story_number}, and {story_template} from workflow state, preserve the full story template structure, and persist the resolved artifact path as {story_doc}. There are no human-supplied parameters.`
   - set `contextRequirements` to `shouldExposeBuildStoryDocument({ workflowName: context.activePlaceholderWorkflowName, stepNumber: context.activePlaceholderWorkflowStepNumber })`
3. In [tools/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L6-L10), export `./build_story_document` immediately after `./build_epic_delivery_spec`.
4. In [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L8-L11), import `build_story_document_variants` immediately after `build_epic_delivery_spec_variants`.
5. In [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L53-L58), spread `...build_story_document_variants` immediately after `...build_epic_delivery_spec_variants`.
6. In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L490-L495), add a compact native-description case for `build_story_document` immediately after `build_epic_delivery_spec` and before `select_target_epic`.
7. The compact description string in [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L490-L495) must be exactly:
   - `Build the canonical create-story Step 2 scaffold at {output_folder}/implementation-artifacts/story<epic>.<story>.md from workflow-owned placeholder state. Resolve {epic_delivery_spec}, {story_number}, and {story_template} from workflow state, preserve the full story template structure, and persist the resolved artifact path as {story_doc}.`
8. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L3-L22), add the new bundle name `STORY_DOCUMENT_BUILD` immediately after `EPIC_DELIVERY_SPEC_BUILD`.
9. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L43-L48), add `STORY_DOCUMENT_BUILD: [ClineDefaultTool.BUILD_STORY_DOCUMENT],` immediately after `EPIC_DELIVERY_SPEC_BUILD`.
10. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L214-L220), replace the current create-story Step 2 row `["DOC_READ", "LOCAL_EXEC"]` with `["STORY_DOCUMENT_BUILD"]`. Leave Steps 3, 4, and 5 unchanged.
11. In each prompt variant config file where `ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC` already appears, insert `ClineDefaultTool.BUILD_STORY_DOCUMENT,` immediately after it:
   - [devstral/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts#L62-L64)
   - [gemini-3/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts#L74-L76)
   - [generic/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts#L82-L84)
   - [glm/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts#L62-L64)
   - [gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts#L72-L74)
   - [hermes/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts#L64-L66)
   - [native-gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts#L84-L86)
   - [native-gpt-5-1/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts#L79-L81)
   - [native-next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts#L72-L74)
   - [next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts#L77-L79)
   - [trinity/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts#L63-L65)
   - [xs/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts#L58-L60)
12. In [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L44-L61), [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L73-L90), and [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L110-L119), add `ClineDefaultTool.BUILD_STORY_DOCUMENT` immediately after `ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC` in all three write-like switch branches.
13. In [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L87-L99), add exactly one `undefined` entry for `ClineDefaultTool.BUILD_STORY_DOCUMENT` immediately after `ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC`.
14. Do not add any response-tool metadata entry for `BUILD_STORY_DOCUMENT`; it must remain a non-response tool.
15. In [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md#L467-L473), change the create-story Step 2 row from ``DOC_READ`, `LOCAL_EXEC`` to ``STORY_DOCUMENT_BUILD`` and leave the rest of the row unchanged.

## Step 3
[x] Implement `BuildStoryDocumentToolHandler` and wire it into the runtime executor.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

Exact edits:
1. Create [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts) as the create-story Step 2 sibling of [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L1-L280).
2. The new handler must implement `IToolHandler` only; do not add `IPartialBlockHandler` in this slice.
3. Set `readonly name = ClineDefaultTool.BUILD_STORY_DOCUMENT` and `getDescription()` to return exactly `[build_story_document]`.
4. At the top of the file, copy the local `atomicReplaceTextFile(...)`, `replaceTemplateSection(...)`, and `escapeRegExp(...)` helpers from [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L19-L58) unchanged.
5. Add a local helper named exactly `resolveActiveCreateStoryStepTwo` using the same `getActivePlaceholderWorkflowStepDetails(...)` pattern currently used by [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L60-L74), but gated to create-story Step 2.
6. Add a local helper named exactly `extractSelectedStoryBlock(markdown: string, storyNumber: string): string | undefined` that:
   - matches only `## Story <story_number>` headings
   - starts the block immediately after the matched heading
   - ends the block at the next `## Story ` heading or the next higher-level `# ` heading
   - trims and returns the selected block
7. Add a local helper named exactly `extractRequiredStorySection(storyBlock: string, heading: string): string | undefined` that:
   - matches only `### ${heading}` inside the selected story block
   - ends each section at the next `### ` heading
   - trims and returns the section body
8. Define the exact shared failure constant:
   - `const POPULATE_STORY_DOCUMENT_ERROR = "Unable to populate story document from the epic delivery spec. Please ensure the epic delivery spec is complete before attempting this workflow."`
9. In `execute(...)`, fail fast with `formatResponse.toolError("build_story_document can only be used while create-story.md Step 2 is the active placeholder workflow context.")` unless `isBuildStoryDocumentStep(activeStep?.sourceName, activeStep?.stepNumber)` is true.
10. Resolve merged placeholders with `getPlaceholderWorkflowValueMap(...) ?? {}` exactly as [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L121-L128) does.
11. Resolve and trim these exact dynamic inputs through `resolvePlaceholderWorkflowText(...)` before validation:
    - `epic_delivery_spec`
    - `story_number`
12. For missing dynamic placeholders, return these exact tool errors:
    - missing `epic_delivery_spec`: `Could not resolve workflow placeholder 'epic_delivery_spec' from the active placeholder workflow state.`
    - missing `story_number`: `Could not resolve workflow placeholder 'story_number' from the active placeholder workflow state.`
13. Resolve the delivery-spec path against the same `resolutionBase` precedence used by [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L142-L151).
14. Build stable placeholders with `buildWorkflowStablePlaceholders({ cwd: config.cwd })`.
15. Resolve the template path with `resolveWorkflowPlaceholderText("{story_template}", stablePlaceholders)`.
16. If the resolved template raw value is empty or still contains `{story_template}`, return `formatResponse.toolError("Could not resolve stable placeholder 'story_template' from .cline/workflow-config.yaml.")`.
17. Resolve the artifact raw path by interpolating the selected story number into the exact placeholder string ``{output_folder}/implementation-artifacts/story${storyNumber}.md`` and passing it through `resolveWorkflowPlaceholderText(...)`.
18. If the resolved artifact raw path is empty or still contains `{output_folder}`, return `formatResponse.toolError("Could not resolve stable placeholder 'output_folder' from .cline/workflow-config.yaml.")`.
19. Read the canonical template and resolved epic delivery spec with `fs.readFile(..., "utf8")`.
20. For unreadable files, return these exact tool errors:
    - template read failure: `Could not read the canonical story template at ${templatePath}.`
    - delivery spec read failure: `Could not read the resolved epic_delivery_spec at ${epicDeliverySpecPath}.`
21. Use `extractSelectedStoryBlock(...)` to locate only the selected `## Story ${storyNumber}` block. If it cannot be found, return `formatResponse.toolError(POPULATE_STORY_DOCUMENT_ERROR)`.
22. From the selected story block, extract exactly these required sections with `extractRequiredStorySection(...)`:
    - `Objective`
    - `Acceptance Criteria`
    - `Sequencing/ Dependencies`
23. If any extracted section is missing or empty after trimming, return `formatResponse.toolError(POPULATE_STORY_DOCUMENT_ERROR)`.
24. Preserve the full template by editing the loaded template text in place:
    - replace line 1 `# Story {{epic_num}}.{{story_num}}` with `# Story ${storyNumber}`
    - replace the body between `## Story\n` and `## Acceptance Criteria\n` with the extracted objective content
    - replace the body between `## Acceptance Criteria\n` and `## Sequencing / Dependencies\n` with the extracted acceptance-criteria content
    - replace the body between `## Sequencing / Dependencies\n` and `## Tasks / Subtasks\n` with the extracted sequencing/dependencies content
25. Do not rewrite, remove, or populate any other template-owned section. `Status: backlog`, `## Tasks / Subtasks`, `## Latest Review Findings`, `## Dev Notes`, `### Project Structure Notes`, `### References`, and `## Dev Agent Record` must remain present after Step 2.
26. Follow the approval flow pattern from [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L213-L247):
    - the approval payload `tool` value must be exactly `buildStoryDocument`
    - `path` must be `getReadablePath(config.cwd, artifactPath)`
    - `content` must list the resolved source and template paths on separate lines with these exact labels:
      - `Epic Delivery Spec: ...`
      - `Template: ...`
27. Run `ToolHookUtils.runPreToolUseIfEnabled(config, block)` with the same cancellation handling used by [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts#L249-L258).
28. After approval and pre-tool hooks, write the rebuilt story document with `atomicReplaceTextFile(...)`, record write proof with `recordAndPersistPlaceholderWorkflowWriteProof(...)`, set `config.taskState.didEditFile = true`, and delete the lower-cased artifact path from `config.taskState.fileReadCache`.
29. Persist the resolved absolute artifact path via `persistWorkflowPlaceholderValues(config, { story_doc: artifactPath })`.
30. Return `formatResponse.toolResult(JSON.stringify({ persisted: true, artifact_path: artifactPath, story_doc_available: true }))` on success.
31. Wrap the main execution body in `try/catch` and return `formatResponse.toolError(error instanceof Error ? error.message : String(error))` for unexpected failures.
32. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L10-L16), import `BuildStoryDocumentToolHandler` immediately after `BuildEpicDeliverySpecToolHandler`.
33. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L128-L133), register `[ClineDefaultTool.BUILD_STORY_DOCUMENT]: (_v: ToolValidator) => new BuildStoryDocumentToolHandler(),` immediately after `BUILD_EPIC_DELIVERY_SPEC` and before `SELECT_TARGET_EPIC`.

## Step 4
[x] Add prompt/native, handler, and non-response-registry coverage for `build_story_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`

Exact edits:
1. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L19-L31), import `build_story_document_variants` immediately after `build_epic_delivery_spec_variants`.
2. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L383-L407), add a new gating test immediately after the existing `build_epic_delivery_spec` gate test with this exact title:
   - `it("gates build_story_document to create-story step 2", () => { ... })`
3. In that new gate test, assert:
   - `create-story.md` Step 2 => `true`
   - `create-story.md` Step 3 => `false`
   - `pi-planning.md` Step 2 => `false`
4. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L989-L1010), add a new native-compaction test immediately after the existing `build_epic_delivery_spec` compaction test with this exact title:
   - `it("compacts native build_story_document descriptions and parameter text", () => { ... })`
5. In that compaction test, use `activePlaceholderWorkflowName: "create-story.md"` and `activePlaceholderWorkflowStepNumber: 2`, then assert:
   - the OpenAI function description equals the exact Step 2 compact description string from Step 2.7 above
   - `Object.keys(openAIProperties)` deep-equals `[]`
6. In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L442-L507), insert a new create-story Step 2 filtering test immediately before the existing create-story Step 3 test with this exact title:
   - `it("applies create-story step 2 row and keeps only the story-document builder plus preserved tools", () => { ... })`
7. In that Step 2 contextual filter test:
   - register `BUILD_STORY_DOCUMENT`, `SET_WORKFLOW_PLACEHOLDERS`, `LIST_FILES`, `SEARCH`, `FILE_READ`, `FILE_READ_RANGE`, `BASH`, `ASK`, `SEND_USER_MESSAGE`, `ATTEMPT`, `PLAN_MODE`, `BROWSER`, `MCP_ACCESS`, and `NEW_TASK`
   - set context to `activePlaceholderWorkflowName: "create-story.md"` and `activePlaceholderWorkflowStepNumber: 2`
   - assert the kept ids include only:
     - `BUILD_STORY_DOCUMENT`
     - `ASK`
     - `SEND_USER_MESSAGE`
     - `ATTEMPT`
     - `BROWSER`
     - `MCP_ACCESS`
     - `NEW_TASK`
   - assert the kept ids do not include `SET_WORKFLOW_PLACEHOLDERS`, `LIST_FILES`, `FILE_READ`, `FILE_READ_RANGE`, `SEARCH`, `BASH`, or `PLAN_MODE`
8. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1600-L1711), insert a new native-tool integration test immediately before the existing create-story Step 3 test with this exact title:
   - `it("filters native tools for create-story step 2", async function () { ... })`
9. In that Step 2 integration test:
   - use the same `runPromptTest(...)` harness and GPT-5 minimal-native context pattern already used by the adjacent workflow-step tests
   - set `activePlaceholderWorkflowName: "create-story.md"` and `activePlaceholderWorkflowStepNumber: 2`
   - assert `nativeToolNames` include `build_story_document` and `attempt_completion`
   - assert `nativeToolNames` do not include `set_workflow_placeholders`, `read_file`, `search_files`, `execute_command`, or `generate_plan_output`
10. In [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts#L82-L86), extend the existing non-response assertion block to include `assert.equal(ResponseToolRegistry.get(ClineDefaultTool.BUILD_STORY_DOCUMENT), undefined)`.
11. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L18-L27), import `BuildStoryDocumentToolHandler` immediately after `BuildEpicDeliverySpecToolHandler`.
12. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L386-L480), add a new repo fixture helper immediately after `createBuildEpicDeliverySpecRepo(...)` named exactly:
    - `createBuildStoryDocumentRepo(options?: { includeWorkflowConfig?: boolean; omitStoryTemplate?: boolean; preexistingArtifact?: string; omitRequiredSection?: "Objective" | "Acceptance Criteria" | "Sequencing/ Dependencies"; selectedStoryMissing?: boolean })`
13. The new repo fixture helper must:
    - create a temp repo dir rooted at `build-story-document-`
    - write `.cline/workflow-config.yaml` with exactly:
      - always `output_folder: "planning"` when `includeWorkflowConfig !== false`
      - `story_template: "{project-root}/.cline/skills/bmad-create-story/template.md"` only when `omitStoryTemplate !== true`
    - write the live story template structure from [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-story/template.md#L1-L47) to `.cline/skills/bmad-create-story/template.md`
    - write the selected-source file to `planning/implementation-artifacts/epic-3-delivery-spec.md`
    - set the artifact path to `planning/implementation-artifacts/story3.2.md`
    - write a delivery-spec fixture containing exactly one selected story block `## Story 3.2` with required `### Objective`, `### Acceptance Criteria`, and `### Sequencing/ Dependencies` sections unless `omitRequiredSection` removes one or `selectedStoryMissing === true` removes the full block
    - return `repoDir`, `epicDeliverySpecRelativePath`, `epicDeliverySpecPath`, `templatePath`, and `artifactPath`
14. Insert a new test block immediately after the existing `build_epic_delivery_spec` tests and before the first `CodeReviewSpecUpdateToolHandler` test at [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L2440-L2758).
15. Add these exact handler test titles and assertions:
    - `it("builds the canonical story document from the full template and persists story_doc", async () => { ... })`
      - use `createBuildStoryDocumentRepo({ preexistingArtifact: "# stale\\n" })`
      - set `config.taskState.activePlaceholderWorkflowId = "create-story.md"`
      - set `config.taskState.activePlaceholderWorkflowSource` to a minimal `create-story.md` source containing Step 2
      - set `config.taskState.currentFocusChainChecklist = "- [x] Step 1:  (System-Owned) Resolve the target story\\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold"`
      - set `config.taskState.activePlaceholderWorkflowValues = { epic_delivery_spec: epicDeliverySpecRelativePath, story_number: "3.2" }`
      - execute `build_story_document`
      - expect parsed result payload fields:
        - `persisted === true`
        - `artifact_path === artifactPath`
        - `story_doc_available === true`
      - expect `config.taskState.activePlaceholderWorkflowValues?.story_doc === artifactPath`
      - expect `config.taskState.activePlaceholderWorkflowTaskWriteProofPaths` to include `artifactPath`
      - expect `config.taskState.didEditFile === true`
      - expect `config.taskState.fileReadCache.has(artifactPath.toLowerCase()) === false`
      - expect the artifact contents to include:
        - `# Story 3.2`
        - `Status: backlog`
        - `## Story`
        - the copied objective lines from the selected story block
        - `## Acceptance Criteria`
        - the copied acceptance criteria lines
        - `## Sequencing / Dependencies`
        - the copied sequencing/dependencies lines
        - `## Tasks / Subtasks`
        - `## Latest Review Findings`
        - `## Dev Notes`
        - `### Project Structure Notes`
        - `### References`
        - `## Dev Agent Record`
        - `### Debug Log References`
        - `### Completion Notes List`
        - `### File List`
    - `it("requires epic_delivery_spec from merged placeholder workflow state for build_story_document", async () => { ... })`
      - expect exact tool error: `Could not resolve workflow placeholder 'epic_delivery_spec' from the active placeholder workflow state.`
    - `it("requires story_number from merged placeholder workflow state for build_story_document", async () => { ... })`
      - expect exact tool error: `Could not resolve workflow placeholder 'story_number' from the active placeholder workflow state.`
    - `it("rejects build_story_document outside create-story step 2 context", async () => { ... })`
      - set `activePlaceholderWorkflowSource.name = "create-story.md"` but move the checklist to Step 3
      - expect exact tool error: `build_story_document can only be used while create-story.md Step 2 is the active placeholder workflow context.`
    - `it("fails with the story_template stable-placeholder error when workflow-config is missing for build_story_document", async () => { ... })`
      - use `includeWorkflowConfig: false`
      - expect exact tool error: `Could not resolve stable placeholder 'story_template' from .cline/workflow-config.yaml.`
    - `it("requires story_template from workflow-config stable placeholders for build_story_document", async () => { ... })`
      - use `omitStoryTemplate: true`
      - expect exact tool error: `Could not resolve stable placeholder 'story_template' from .cline/workflow-config.yaml.`
    - `it("fails when the canonical story template cannot be read for build_story_document", async () => { ... })`
      - remove the template file before execution
      - expect exact tool error: `Could not read the canonical story template at ${templatePath}.`
    - `it("fails with the approved user-facing message when the selected story cannot be found", async () => { ... })`
      - use `selectedStoryMissing: true`
      - expect exact tool error: `Unable to populate story document from the epic delivery spec. Please ensure the epic delivery spec is complete before attempting this workflow.`
      - assert the canonical artifact file was not created
    - `it("fails with the approved user-facing message when the Objective section is missing", async () => { ... })`
      - use `omitRequiredSection: "Objective"`
      - expect the same exact approved user-facing error
      - assert the canonical artifact file was not created
    - `it("fails with the approved user-facing message when the Acceptance Criteria section is missing", async () => { ... })`
      - use `omitRequiredSection: "Acceptance Criteria"`
      - expect the same exact approved user-facing error
      - assert the canonical artifact file was not created
    - `it("fails with the approved user-facing message when the Sequencing/ Dependencies section is missing", async () => { ... })`
      - use `omitRequiredSection: "Sequencing/ Dependencies"`
      - expect the same exact approved user-facing error
      - assert the canonical artifact file was not created
    - `it("overwrites an existing canonical artifact atomically for build_story_document", async () => { ... })`
      - use `preexistingArtifact: "# stale\\n"`
      - after execution, assert the artifact content no longer equals the stale content and now contains `# Story 3.2`
    - `it("copies objective, acceptance criteria, and sequencing/dependencies into the correct destination sections for build_story_document", async () => { ... })`
      - assert the copied objective text appears only between `## Story` and `## Acceptance Criteria`
      - assert the copied acceptance criteria text appears only between `## Acceptance Criteria` and `## Sequencing / Dependencies`
      - assert the copied sequencing/dependencies text appears only between `## Sequencing / Dependencies` and `## Tasks / Subtasks`

## Step 5
[x] Run the required verification commands and perform the final string-contract audit.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/create-story/step-2-automation-action-plan.md`

Exact steps:
1. Run this exact targeted unit-test command from repo root:
   - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
2. Run this exact typecheck command from repo root:
   - `npx tsc --noEmit`
3. Run this exact string-contract audit command from repo root:
   - `rg -n "BUILD_STORY_DOCUMENT|build_story_document|STORY_DOCUMENT_BUILD|story_doc_available|buildStoryDocument|Could not resolve workflow placeholder 'epic_delivery_spec'|Could not resolve workflow placeholder 'story_number'|Could not resolve stable placeholder 'story_template'|Could not read the canonical story template|Unable to populate story document from the epic delivery spec" src docs`
4. If any command fails because of changes made in Steps 1 through 4, fix only those failures using the already-touched files from the relevant earlier step, then rerun Step 5 from the beginning.
5. If any command fails in a file or subsystem not prescribed in this plan, stop and ask for input before making further changes.
6. After all three commands pass, re-read this action plan top to bottom and confirm there is no unresolved string-contract conflict across:
   - `build_story_document`
   - `BUILD_STORY_DOCUMENT`
   - `STORY_DOCUMENT_BUILD`
   - `story_doc`
   - `story_doc_available`
   - `story_template`
   - `{output_folder}/implementation-artifacts/story<epic>.<story>.md`
7. Mark this step complete only after the verification commands pass and the re-read finds no remaining conflict between the plan and the implemented code.
