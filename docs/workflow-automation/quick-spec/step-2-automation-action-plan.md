---
title: Quick Spec Step 2 Automation Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/doc change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - This plan implements only the Step 2 automation requirements in `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/quick-spec/step-2-automation-requirements.md`.
  - Do not modify workflow-start-card code, workflow-start form behavior, deterministic progression files, Step 3+ quick-spec prompting, or persona activation while executing this plan.
  - Before changing any string, path, placeholder key, tool id, enum member, result field, status label, or artifact path, re-read the corresponding requirement in `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/quick-spec/step-2-automation-requirements.md`.
---

# Quick Spec Step 2 Automation Action Plan

This plan implements the workflow-owned Step 2 quick-spec scaffold builder defined in:

- [step-2-automation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/quick-spec/step-2-automation-requirements.md)

Live seams verified before authoring this plan:

- the built-in tool enum and read-only classification live in [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L6-L77)
- sibling shared workflow-step helpers live in [build-story-document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-story-document.ts#L1-L29)
- prompt-tool registration and native-schema compaction live in [tools/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L1-L28), [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L1-L75), and [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L490-L494)
- contextual tool exposure is currently bundle-based and runtime-resolved through [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L1-L120) and [contextualNativeToolFilter.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts#L63-L122)
- workflow-form automatic-status resolver definitions live in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L485-L626)
- workflow-form step-trigger registration lives in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L17-L140)
- runtime handler registration lives in [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L94-L139)
- sibling workflow-owned builder behavior, including atomic replacement, approval payloads, write-proof persistence, placeholder persistence, and cache invalidation, lives in [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L1-L283) and [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L1-L387)
- placeholder persistence helper wiring already lives in [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L111-L198)
- the live quick-spec template structure to preserve lives in [tech-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-quick-spec/tech-spec-template.md#L1-L31)
- the live quick-spec workflow now assigns this behavior to Step 2 in [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md#L7-L9)
- the existing quick-spec pre-turn startup-card persistence seam already lives in [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2054-L2206)
- the current prompt/native and handler test seams live in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L410-L417), [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L1039-L1059), [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L442-L479), [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1600-L1619), [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L117-L166), [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L260-L336), [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L277-L336), [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L2860-L3415), and [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts#L77-L87)

Locked decisions for this pass:

- the canonical built-in tool id is `build_tech_spec_document`
- the shared helper file is `src/shared/build-tech-spec-document.ts`
- the internal contextual bundle name is `TECH_SPEC_DOCUMENT_BUILD`
- the tool is workflow-owned and accepts no human-authored parameters
- the tool is gated only for `quick-spec.md` Step 2
- the canonical template source path is `{project-root}/.cline/skills/bmad-quick-spec/tech-spec-template.md`
- the canonical artifact path is `{implementation_artifacts}/tech-spec-wip.md`
- the workflow-owned input title key is `title`
- the derived slug must be deterministic kebab-case normalization from `title`
- the generated scaffold must preserve `status: 'backlog'`
- the tool success payload fields are exactly:
  - `persisted`
  - `artifact_path`
  - `output_file_available`
- the automatic-status labels/messages are exactly:
  - pending: `Preparing workflow documents`
  - success: `Workflow documents ready`
  - failure: `Automatic workflow preparation failed- falling back to manual LLM workflow preparation.`
  - successMessage: `The Step 2 tech-spec scaffold is ready.`

## Step 1
- [x] Register the shared tool id and the quick-spec Step 2 gating helper.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/build-tech-spec-document.ts`

Exact edits:
1. In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L34-L49), add the exact enum member `BUILD_TECH_SPEC_DOCUMENT = "build_tech_spec_document"` immediately after `BUILD_STORY_DOCUMENT = "build_story_document"`.
2. In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L66-L77), do not add `BUILD_TECH_SPEC_DOCUMENT` to `READ_ONLY_TOOLS`; this tool writes a file and must remain outside the read-only list.
3. Create [build-tech-spec-document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-tech-spec-document.ts) as the quick-spec Step 2 sibling of [build-story-document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-story-document.ts#L1-L29).
4. In the new shared helper file, export these exact members:
   - `BUILD_TECH_SPEC_DOCUMENT_WORKFLOW_STEPS = { "quick-spec.md": [2] } as const`
   - `isBuildTechSpecDocumentStep(workflowName?: string, stepNumber?: number): boolean`
   - `shouldExposeBuildTechSpecDocument({ workflowName, stepNumber }: { workflowName?: string; stepNumber?: number }): boolean`
5. Reuse the exact workflow-name normalization pattern used in [build-story-document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-story-document.ts#L5-L13), but normalize only:
   - `quick-spec.md`
   - `quick-spec`
   - both to `quick-spec.md`
6. Type the local `allowedSteps` variable exactly `readonly number[]` before calling `.includes(stepNumber)`.

## Step 2
- [x] Register `build_tech_spec_document` across prompt-tool, contextual-tool, variant, approval, response-registry, and canonical-doc surfaces.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_tech_spec_document.ts`
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
1. Create [build_tech_spec_document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_tech_spec_document.ts) next to [build_story_document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_story_document.ts#L1-L22).
2. In the new prompt-tool file:
   - set `id = ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT`
   - set `variant: ModelFamily.GENERIC`
   - set `name: "build_tech_spec_document"`
   - set `parameters: []`
   - set `description` exactly to:
     - `Build the canonical quick-spec Step 2 scaffold at {implementation_artifacts}/tech-spec-wip.md from workflow-owned placeholder state. Resolve {title} from workflow state, derive {slug}, preserve the full tech-spec template structure, and persist the resolved artifact path as {output_file}. There are no human-supplied parameters.`
   - set `contextRequirements` to `shouldExposeBuildTechSpecDocument({ workflowName: context.activePlaceholderWorkflowName, stepNumber: context.activePlaceholderWorkflowStepNumber })`
3. In [tools/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L7-L11), export `./build_tech_spec_document` immediately after `./build_story_document`.
4. In [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L9-L13), import `build_tech_spec_document_variants` immediately after `build_story_document_variants`.
5. In [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L57-L60), spread `...build_tech_spec_document_variants` immediately after `...build_story_document_variants`.
6. In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L490-L495), add a compact native-description case for `build_tech_spec_document` immediately after `build_story_document`.
7. The compact description string in [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L490-L495) must be exactly:
   - `Build the canonical quick-spec Step 2 scaffold at {implementation_artifacts}/tech-spec-wip.md from workflow-owned placeholder state. Resolve {title} from workflow state, derive {slug}, preserve the full tech-spec template structure, and persist the resolved artifact path as {output_file}.`
8. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L3-L22), add the new bundle name `TECH_SPEC_DOCUMENT_BUILD` immediately after `STORY_DOCUMENT_BUILD`.
9. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L43-L49), add `TECH_SPEC_DOCUMENT_BUILD: [ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT],` immediately after `STORY_DOCUMENT_BUILD`.
10. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L380-L384), replace the current quick-spec Step 2 row `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE"]` with `["TECH_SPEC_DOCUMENT_BUILD"]`. Leave the other quick-spec rows unchanged in this slice.
11. In each prompt variant config file where `ClineDefaultTool.BUILD_STORY_DOCUMENT` already appears, insert `ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT,` immediately after it:
    - [devstral/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts#L62-L65)
    - [gemini-3/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts#L74-L77)
    - [generic/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts#L82-L85)
    - [glm/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts#L62-L65)
    - [gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts#L72-L75)
    - [hermes/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts#L64-L67)
    - [native-gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts#L84-L87)
    - [native-gpt-5-1/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts#L79-L82)
    - [native-next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts#L72-L75)
    - [next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts#L77-L80)
    - [trinity/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts#L63-L66)
    - [xs/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts#L58-L61)
12. In [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L44-L61), [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L73-L90), and [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L110-L123), add `ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT` immediately after `ClineDefaultTool.BUILD_STORY_DOCUMENT` in all three write-like switch branches.
13. In [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L96-L100), add exactly one `undefined` entry for `ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT` immediately after `ClineDefaultTool.BUILD_STORY_DOCUMENT`.
14. Do not add any response-tool metadata entry for `BUILD_TECH_SPEC_DOCUMENT`; it must remain a non-response tool.
15. In [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md), update the quick-spec Step 2 row so it lists `TECH_SPEC_DOCUMENT_BUILD` and no longer lists the old read/write/code bundles for that step.

## Step 3
- [x] Implement `BuildTechSpecDocumentToolHandler` and wire it into the runtime executor.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

Exact edits:
1. Create [BuildTechSpecDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts) as the quick-spec Step 2 sibling of [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L1-L283).
2. The new handler must implement `IToolHandler` only; do not add `IPartialBlockHandler` in this slice.
3. Set `readonly name = ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT` and `getDescription()` to return exactly `[build_tech_spec_document]`.
4. At the top of the file, copy the local `atomicReplaceTextFile(...)` helper from [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L17-L35) unchanged.
5. Add a local helper named exactly `slugifyQuickSpecTitle(title: string): string` that implements the approved slug rules:
   - trim outer whitespace
   - lowercase the result
   - replace spaces and other word separators with `-`
   - remove punctuation that is not filesystem-safe
   - collapse repeated `-`
   - trim leading/trailing `-`
6. Add a local helper named exactly `resolveActiveQuickSpecStepTwo(config: TaskConfig)` using the same `getActivePlaceholderWorkflowStepDetails(...)` pattern currently used by [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L59-L74), but gated to quick-spec Step 2.
7. In `execute(...)`, fail fast with `formatResponse.toolError("build_tech_spec_document can only be used while quick-spec.md Step 2 is the active placeholder workflow context.")` unless `isBuildTechSpecDocumentStep(activeStep?.sourceName, activeStep?.stepNumber)` is true.
8. Resolve merged placeholders with `getPlaceholderWorkflowValueMap(...) ?? {}` exactly as [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L128-L133) does.
9. Resolve and trim the exact dynamic input `title` through `resolvePlaceholderWorkflowText(...)` before validation.
10. For missing `title`, return the exact tool error:
    - `Could not resolve workflow placeholder 'title' from the active placeholder workflow state.`
11. Build stable placeholders with `buildWorkflowStablePlaceholders({ cwd: config.cwd })`.
12. Resolve the canonical template path by passing the exact placeholder string `{project-root}/.cline/skills/bmad-quick-spec/tech-spec-template.md` through `resolveWorkflowPlaceholderText(...)`.
13. If the resolved template path is empty or still contains `{project-root}`, return `formatResponse.toolError("Could not resolve the canonical quick-spec template path from stable workflow placeholders.")`.
14. Resolve the artifact raw path through `resolveWorkflowPlaceholderText("{implementation_artifacts}/tech-spec-wip.md", stablePlaceholders)`.
15. If the resolved artifact raw path is empty or still contains `{implementation_artifacts}`, return `formatResponse.toolError("Could not resolve stable placeholder 'implementation_artifacts' from .cline/workflow-config.yaml.")`.
16. Resolve `templatePath` and `artifactPath` to absolute filesystem paths using the same `path.isAbsolute(...) ? ... : path.resolve(config.cwd, ...)` pattern used by [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L183-L184).
17. Read the canonical template with `fs.readFile(templatePath, "utf8")`.
18. If the template cannot be read, return `formatResponse.toolError(\`Could not read the canonical quick-spec template at ${templatePath}.\`)`.
19. Derive `slug = slugifyQuickSpecTitle(title)` and `date = stablePlaceholders.date?.trim()`.
20. If `date` is empty, return `formatResponse.toolError("Could not resolve stable placeholder 'date' from workflow runtime state.")`.
21. If `slug` is empty after normalization, return `formatResponse.toolError("Could not derive a valid slug from workflow placeholder 'title'.")`.
22. Build the scaffold by replacing these exact placeholders in the loaded template text:
    - `{title}` -> resolved title
    - `{slug}` -> derived slug
    - `{date}` -> resolved date
23. Do not rewrite any other part of the template. Preserve:
    - `status: 'backlog'`
    - `stepsCompleted: []`
    - all remaining frontmatter arrays
    - the full section structure through `## Latest Review Findings`
24. Follow the approval flow pattern from [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L221-L258):
    - the approval payload `tool` value must be exactly `buildTechSpecDocument`
    - `path` must be `getReadablePath(config.cwd, artifactPath)`
    - `content` must list the resolved title and template path on separate lines with these exact labels:
      - `Title: ...`
      - `Template: ...`
25. Run `ToolHookUtils.runPreToolUseIfEnabled(config, block)` with the same cancellation handling used by [BuildStoryDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildStoryDocumentToolHandler.ts#L260-L269).
26. After approval and pre-tool hooks, write the rebuilt scaffold with `atomicReplaceTextFile(...)`, record write proof with `recordAndPersistPlaceholderWorkflowWriteProof(...)`, set `config.taskState.didEditFile = true`, and delete the lower-cased artifact path from `config.taskState.fileReadCache`.
27. Persist the resolved absolute artifact path via `persistWorkflowPlaceholderValues(config, { output_file: artifactPath })`.
28. Return `formatResponse.toolResult(JSON.stringify({ persisted: true, artifact_path: artifactPath, output_file_available: true }))` on success.
29. Wrap the main execution body in `try/catch` and return `formatResponse.toolError(error instanceof Error ? error.message : String(error))` for unexpected failures.
30. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts), import `BuildTechSpecDocumentToolHandler` immediately after `BuildStoryDocumentToolHandler`.
31. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L129-L134), register `[ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT]: (_v: ToolValidator) => new BuildTechSpecDocumentToolHandler(),` immediately after `BUILD_STORY_DOCUMENT`.

## Step 4
- [x] Add the zero-input automatic-status workflow-form resolver and quick-spec Step 2 trigger.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts`

Exact edits:
1. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L24-L29), add the exact exported resolver id constant:
   - `export const QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_RESOLVER_ID = "quick_spec_step_2_build_tech_spec_document"`
   immediately after `WRITE_REMEDIATION_STORY_STEP_2_REVIEW_INPUT_RESOLVER_ID`.
2. In [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L558-L626), add a new resolver entry immediately after the write-remediation-story automatic-status resolver and before `PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID`.
3. The new resolver entry must use:
   - `id: QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_RESOLVER_ID`
   - `toolName: ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT`
   - `defaultInitialPhase: "collect_inputs"`
4. `buildDefinition()` for the new resolver must return:
   - `title: "Tech Spec Scaffold"`
   - `toolDictionaryTitle: "Tech Spec Scaffold Reference"`
   - `toolDictionaryMarkdown: ""`
   - `presentation.kind: "automatic_status"`
   - `presentation.pendingLabel: "Preparing workflow documents"`
   - `presentation.successLabel: "Workflow documents ready"`
   - `presentation.failureLabel: "Automatic workflow preparation failed- falling back to manual LLM workflow preparation."`
   - `pages.collect_inputs.prompt: "The system will now build the canonical quick-spec scaffold from the stored workflow title and the canonical quick-spec template."`
   - `pages.collect_inputs.fields: []`
   - `pages.collect_inputs.submitLabel: "Submit"`
   - `pages.collect_inputs.cancelLabel: "Cancel"`
   - `pages.retry_error.prompt: "The system could not produce the canonical quick-spec scaffold from the stored workflow inputs. Retry the request or return to the Step 2 fallback instructions."`
   - `pages.retry_error.fields: []`
   - `pages.retry_error.submitLabel: "Submit"`
   - `pages.retry_error.cancelLabel: "Cancel"`
   - `pages.retry_error.retryLabel: "Start Over"`
   - `successMessage: "The Step 2 tech-spec scaffold is ready."`
5. `buildToolExecutionFailureFallbackMessage()` for the new resolver must return exactly:
   - `The workflow form could not build the Step 2 tech-spec scaffold from stored workflow inputs. The workflow will return to the Step 2 fallback instructions.`
6. `buildToolExecutionRequest(_session, _values)` for the new resolver must return:
   - `toolName: ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT`
   - `toolInput: {}`
   - `toolParams: {}`
7. `evaluateToolExecutionResult(session, args)` for the new resolver must:
   - parse `args.toolResultText` with the existing `parseWorkflowFormJsonToolResult(...)`
   - return `{ succeeded: true }` only when `parsed?.persisted === true && parsed?.output_file_available === true`
   - if `isWorkflowFormFailureText(args.toolResultText)` is true, return:
     - `succeeded: false`
     - `errorMessage: args.toolResultText?.trim() ?? this.buildToolExecutionFailureFallbackMessage(session)`
     - `fallbackToAgent: true`
   - otherwise return:
     - `succeeded: false`
     - `errorMessage: this.buildToolExecutionFailureFallbackMessage(session)`
     - `fallbackToAgent: true`
8. In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L10-L15), import `QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_RESOLVER_ID` immediately after `PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID`.
9. In [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L111-L140), add a new trigger definition immediately after the write-remediation-story trigger:
   - `workflowName: "quick-spec.md"`
   - `stepNumber: 2`
   - `resolverId: QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_RESOLVER_ID`
   - `shouldIntercept({ cwd, taskState }) { return shouldInterceptUntilCurrentTaskArtifactExists({ cwd, taskState, placeholderKey: "output_file" }) }`

## Step 5
- [x] Add prompt/native, workflow-form, trigger, handler, persistence, and non-response-registry coverage for `build_tech_spec_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

Exact edits:
1. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L19-L31), import `build_tech_spec_document_variants` immediately after `build_story_document_variants`.
2. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L410-L417), add a new gating test immediately after the existing `build_story_document` gate test with this exact title:
   - `it("gates build_tech_spec_document to quick-spec step 2", () => { ... })`
3. In that new gate test, assert:
   - `quick-spec.md` Step 2 => `true`
   - `quick-spec.md` Step 3 => `false`
   - `create-story.md` Step 2 => `false`
4. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L1039-L1059), add a new native-compaction test immediately after the existing `build_story_document` compaction test with this exact title:
   - `it("compacts native build_tech_spec_document descriptions and parameter text", () => { ... })`
5. In that compaction test, use `activePlaceholderWorkflowName: "quick-spec.md"` and `activePlaceholderWorkflowStepNumber: 2`, then assert:
   - the OpenAI function description equals the exact Step 2 compact description string from Step 2.7 above
   - `Object.keys(openAIProperties)` deep-equals `[]`
6. In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts), add a new quick-spec Step 2 filtering test immediately before the first quick-spec-adjacent row break with this exact title:
   - `it("applies quick-spec step 2 row and keeps only the tech-spec-document builder plus preserved tools", () => { ... })`
7. In that quick-spec Step 2 contextual filter test:
   - register `BUILD_TECH_SPEC_DOCUMENT`, `SET_WORKFLOW_PLACEHOLDERS`, `LIST_FILES`, `SEARCH`, `FILE_READ`, `FILE_READ_RANGE`, `LIST_CODE_DEF`, `BASH`, `ASK`, `SEND_USER_MESSAGE`, `ATTEMPT`, `PLAN_MODE`, `BROWSER`, `MCP_ACCESS`, and `NEW_TASK`
   - set context to `activePlaceholderWorkflowName: "quick-spec.md"` and `activePlaceholderWorkflowStepNumber: 2`
   - assert the kept ids include only:
     - `BUILD_TECH_SPEC_DOCUMENT`
     - `ASK`
     - `SEND_USER_MESSAGE`
     - `ATTEMPT`
     - `BROWSER`
     - `MCP_ACCESS`
     - `NEW_TASK`
   - assert the kept ids do not include `SET_WORKFLOW_PLACEHOLDERS`, `LIST_FILES`, `FILE_READ`, `FILE_READ_RANGE`, `LIST_CODE_DEF`, `SEARCH`, `BASH`, or `PLAN_MODE`
8. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts), add a new native-tool integration test immediately after the existing create-story Step 2 test with this exact title:
   - `it("filters native tools for quick-spec step 2", async function () { ... })`
9. In that quick-spec Step 2 integration test:
   - use the same `runPromptTest(...)` harness and GPT-5 minimal-native context pattern already used by the adjacent workflow-step tests
   - set `activePlaceholderWorkflowName: "quick-spec.md"` and `activePlaceholderWorkflowStepNumber: 2`
   - assert `nativeToolNames` include `build_tech_spec_document` and `attempt_completion`
   - assert `nativeToolNames` do not include `set_workflow_placeholders`, `read_file`, `search_files`, `execute_command`, or `generate_plan_output`
10. In [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts#L77-L87), extend the existing non-response assertion block to include `assert.equal(ResponseToolRegistry.get(ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT), undefined)`.
11. In [WorkflowFormRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L117-L166), import `QUICK_SPEC_STEP_2_BUILD_TECH_SPEC_DOCUMENT_RESOLVER_ID` and add a new test immediately after the existing write-remediation-story automatic workflow-preparation test with this exact title:
    - `it("declares the quick-spec step 2 tech-spec resolver as automatic workflow preparation", () => { ... })`
12. In that new registry test, assert:
    - `resolver.defaultInitialPhase === "collect_inputs"`
    - `definition.presentation` deep-equals the locked pending/success/failure labels from this plan
    - `definition.successMessage === "The Step 2 tech-spec scaffold is ready."`
    - `definition.pages.collect_inputs?.fields` deep-equals `[]`
13. In [WorkflowFormTriggerRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L260-L336), add:
    - a new mapping test titled exactly `it("maps quick-spec step 2 to the tech-spec workflow-form resolver", () => { ... })` asserting the resolver id
    - a new positive intercept test titled exactly `it("intercepts quick-spec step 2 when output_file is missing a current-task write proof", async () => { ... })`
    - a new negative intercept test titled exactly `it("does not intercept quick-spec step 2 when output_file has a current-task write proof and exists on disk", async () => { ... })`
14. Those quick-spec trigger tests must use `placeholderKey: "output_file"` semantics matching the new trigger and must create/remove a temp `tech-spec-wip.md` file on disk exactly the same way the sibling review-input trigger tests create/remove `review-input.md`.
15. In [WorkflowFormRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts), add a new automatic-status runtime test immediately after the existing automatic-status payload tests with this exact title:
    - `it("invokes build_tech_spec_document from a collect_inputs automatic-status session", () => { ... })`
16. In that runtime test, create a custom resolver equivalent to the quick-spec Step 2 automatic-status shape and assert `handleSubmission(...)` returns:
    - `kind === "invoke_tool"`
    - `toolName === "build_tech_spec_document"`
    - `toolInput` deep-equals `{}`
    - `toolParams` deep-equals `{}`
17. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L18-L27), import `BuildTechSpecDocumentToolHandler` immediately after `BuildStoryDocumentToolHandler`.
18. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts), add a new repo fixture helper immediately after `createBuildStoryDocumentRepo(...)` named exactly:
    - `createBuildTechSpecDocumentRepo(options?: { includeWorkflowConfig?: boolean; preexistingArtifact?: string; title?: string; templateOverride?: string })`
19. The new repo fixture helper must:
    - create a temp repo dir rooted at `build-tech-spec-document-`
    - write `.cline/workflow-config.yaml` with exactly:
      - `implementation_artifacts: "{project-root}/planning/implementation-artifacts"` when `includeWorkflowConfig !== false`
    - write the live quick-spec template structure from [tech-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-quick-spec/tech-spec-template.md#L1-L31) to `.cline/skills/bmad-quick-spec/tech-spec-template.md` unless `templateOverride` is provided
    - set the artifact path to `planning/implementation-artifacts/tech-spec-wip.md`
    - return `repoDir`, `templatePath`, `artifactPath`, and `title`
20. Insert a new test block immediately after the existing `build_story_document` tests and before the next unrelated handler block.
21. Add these exact handler test titles and assertions:
    - `it("builds the canonical quick-spec scaffold from the full template and persists output_file", async () => { ... })`
      - assert payload fields `persisted === true`, `artifact_path === artifactPath`, `output_file_available === true`
      - assert `config.taskState.activePlaceholderWorkflowValues?.output_file === artifactPath`
      - assert write proof contains `artifactPath`
      - assert `didEditFile === true`
      - assert cache entry for lower-cased artifact path is removed
      - assert artifact contains:
        - `title: '<resolved title>'`
        - `slug: '<derived slug>'`
        - `created: '<resolved date>'`
        - `status: 'backlog'`
        - `# Tech-Spec: <resolved title>`
        - all template section headings through `## Latest Review Findings`
    - `it("requires title from merged placeholder workflow state for build_tech_spec_document", async () => { ... })`
      - assert exact error `Could not resolve workflow placeholder 'title' from the active placeholder workflow state.`
    - `it("rejects build_tech_spec_document outside quick-spec step 2 context", async () => { ... })`
      - assert exact error `build_tech_spec_document can only be used while quick-spec.md Step 2 is the active placeholder workflow context.`
    - `it("requires implementation_artifacts from workflow-config stable placeholders for build_tech_spec_document", async () => { ... })`
      - assert exact error `Could not resolve stable placeholder 'implementation_artifacts' from .cline/workflow-config.yaml.`
    - `it("fails when the canonical quick-spec template cannot be read for build_tech_spec_document", async () => { ... })`
      - assert exact error `Could not read the canonical quick-spec template at ${templatePath}.`
    - `it("overwrites an existing canonical tech-spec-wip artifact atomically for build_tech_spec_document", async () => { ... })`
      - assert stale content is fully replaced
22. For all handler tests above, the active placeholder workflow context must be set exactly to:
    - `activePlaceholderWorkflowId = "quick-spec.md"`
    - `activePlaceholderWorkflowSource.name = "quick-spec.md"`
    - `currentFocusChainChecklist = "- [x] Step 1: Gather Project Info\n- [ ] Step 2:  (System-Owned) Resolve or start the spec draft"`
    - `activePlaceholderWorkflowValues.title = <fixture title>` when the test requires a valid title
23. In [placeholderWorkflowPersistence.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2054-L2206), keep the existing quick-spec workflow-start-card tests unchanged and add one new automatic-status chain test immediately after the existing create-story start-card test with this exact title:
    - `it("chains the quick-spec workflow-start title collection into the Step 2 tech-spec automatic workflow-preparation form before the AI turn", async () => { ... })`
24. In that new persistence test, model the same pre-turn loop shape already used for workflow forms:
    - quick-spec slash-command activation begins
    - workflow-start form/session success stores `title`
    - deterministic progression advances into Step 2
    - the Step 2 automatic-status workflow form opens before the AI turn
    - the invoked tool is `build_tech_spec_document`
    - `title` remains present in placeholder state

## Step 6
- [x] Verify the exact required test suites and string contracts, then stop.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/quick-spec/step-2-automation-action-plan.md`

Exact verification commands:
1. Run:
   - `npm run test:unit -- src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
2. Run:
   - `npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
3. Run:
   - `npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`
4. Run:
   - `npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
5. Run:
   - `npm run test:unit -- src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
6. Run:
   - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts`
7. Run:
   - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
8. Run:
   - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`
9. Run:
   - `npm run test:unit -- src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
10. Run:
   - `npx tsc --noEmit`
11. After tests pass, re-read this file from top to bottom and perform a final string-contract audit against the implementation for:
   - `build_tech_spec_document`
   - `BUILD_TECH_SPEC_DOCUMENT`
   - `TECH_SPEC_DOCUMENT_BUILD`
   - `quick_spec_step_2_build_tech_spec_document`
   - `buildTechSpecDocument`
   - `output_file_available`
   - `Preparing workflow documents`
   - `Workflow documents ready`
   - `Automatic workflow preparation failed- falling back to manual LLM workflow preparation.`
   - `The Step 2 tech-spec scaffold is ready.`
12. If any command fails because the live code requires a change not explicitly prescribed in this plan, stop and ask for input before making further edits.
