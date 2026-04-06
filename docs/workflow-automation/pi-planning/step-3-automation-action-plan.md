---
title: PI Planning Step 3 Automation Action Plan
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After finishing a step, change that step's checkbox from [ ] to [x].
  - After marking a step complete, read the next step in full before doing any additional work.
  - Do not pre-apply later-step edits based on assumptions or partially-read context.
  - If any ambiguity is discovered, or any code/test/doc change appears necessary that is not explicitly prescribed below, stop and ask for input before proceeding.
  - This plan implements only the Step 3 automation requirements in `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/step-3-automation-requirements.md`.
  - Do not modify `/Users/robertboston/Documents/Cline/Workflows/pi-planning.md`, `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/progress-tracker.md`, deterministic progression files, workflow-form code, or prompt-component source files while executing this plan.
  - Before changing any string, path, placeholder key, tool id, or bundle name, re-read the corresponding requirement in `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/step-3-automation-requirements.md`.
---

# PI Planning Step 3 Automation Action Plan

This plan implements the Step 3 workflow-owned artifact builder defined in:

- [step-3-automation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/step-3-automation-requirements.md)

Live seams verified before authoring this plan:

- the canonical Step 2 sibling pattern for workflow/step support lives in [select-target-epic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/select-target-epic.ts#L1-L42)
- built-in tool ids and read-only classification live in [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8-L50) and [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L68-L86)
- the current Step 2 handler resolves merged placeholders, reads the canonical epics document, persists placeholder state, and avoids a response-tool continuation in [SelectTargetEpicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts#L20-L150)
- the sibling workflow-owned artifact builder pattern, including atomic replacement, approval flow, write-proof persistence, file-cache invalidation, and placeholder persistence, lives in [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L22-L393)
- the shared placeholder-persistence helper that already triggers deterministic re-checks lives in [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L96-L151)
- placeholder-workflow write proofs are recorded through [placeholderWorkflowWriteProofs.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/placeholderWorkflowWriteProofs.ts#L30-L48)
- prompt-tool registration and native-schema compaction live in [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L1-L89), [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L1-L35), and [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L467-L494)
- pi-planning step-level native-tool filtering is currently driven only by [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L3-L53) and [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L316-L318)
- the canonical template structure that must be preserved lives in [epic-delivery-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/create-epics/epic-delivery-spec-template.md#L1-L33)
- the existing deterministic Step 3 tests already assert the canonical artifact name `epic-3-delivery-spec.md` and must remain consistent with this slice in [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L2935-L2995)

Locked decisions for this pass:

- the canonical built-in tool id is `build_epic_delivery_spec`
- the tool is workflow-owned and takes no human-authored parameters
- the tool is gated only for `pi-planning.md` Step 3
- the canonical template path is `{project-root}/.cline/skills/create-epics/epic-delivery-spec-template.md`
- the canonical artifact path is `{output_folder}/implementation-artifacts/epic-<number>-delivery-spec.md`
- the generated document must be built from the full template, not a partial reconstruction
- the top two template headings become `# Epic N: Title` and `### Epic N: Title`
- the tool overwrites the canonical artifact atomically when it already exists
- when the selected epic is missing or any required section is missing, the user-facing error must be exactly `Unable to populate delivery spec from the epics document. Please ensure the epics document is complete before attempting this workflow.`
- successful persistence must reuse `persistWorkflowPlaceholderValues(...)`; do not add `epic_delivery_spec` to any artifact-normalization allowlist, because this tool must persist the fully resolved absolute artifact path directly

## Step 1
[x] Register the new shared tool id and workflow-step support helper.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/tools.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/build-epic-delivery-spec.ts`

Exact edits:
1. In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8-L50), add the exact enum member `BUILD_EPIC_DELIVERY_SPEC = "build_epic_delivery_spec"` immediately after `SELECT_TARGET_EPIC = "select_target_epic"`.
2. In [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L68-L86), do not add `BUILD_EPIC_DELIVERY_SPEC` to `READ_ONLY_TOOLS`; this tool writes a file and must stay outside the read-only list.
3. Create [build-epic-delivery-spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-epic-delivery-spec.ts) as the Step 3 sibling of [select-target-epic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/select-target-epic.ts#L1-L42).
4. In the new shared helper file, export these exact members:
   - `BUILD_EPIC_DELIVERY_SPEC_WORKFLOW_STEPS = { "pi-planning.md": [3] } as const`
   - `isBuildEpicDeliverySpecStep(workflowName?: string, stepNumber?: number): boolean`
   - `shouldExposeBuildEpicDeliverySpec({ workflowName, stepNumber }: { workflowName?: string; stepNumber?: number }): boolean`
5. Reuse the exact workflow-name normalization behavior from [select-target-epic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/select-target-epic.ts#L8-L16):
   - accept `pi-planning.md`
   - accept `pi-planning`
   - normalize both to `pi-planning.md`
6. Type the local `allowedSteps` variable exactly `readonly number[]` before calling `.includes(stepNumber)` to avoid the tuple-union TypeScript failure pattern already seen on similar step maps.
7. Do not add any YOLO-specific gating to this helper; unlike `select_target_epic`, this tool does not require interactive user input.

## Step 2
[x] Register `build_epic_delivery_spec` across prompt-tool, gating, approval, response-registry, and variant surfaces.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/build_epic_delivery_spec.ts`
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

Exact edits:
1. Create [build_epic_delivery_spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_epic_delivery_spec.ts) next to [build_epics_document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_epics_document.ts#L1-L16) and [select_target_epic.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/select_target_epic.ts#L1-L23).
2. In the new prompt-tool file:
   - set `id = ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC`
   - set `variant: ModelFamily.GENERIC`
   - set `name: "build_epic_delivery_spec"`
   - set `parameters: []`
   - set `description` exactly to:
     - `Build the canonical pi-planning Step 3 delivery spec at {output_folder}/implementation-artifacts/epic-<number>-delivery-spec.md from workflow-owned placeholder state. Resolve {epics_document} and {target_epic} from workflow state, preserve the full template structure, and persist the resolved artifact path as {epic_delivery_spec}. There are no human-supplied parameters.`
   - set `contextRequirements` to `shouldExposeBuildEpicDeliverySpec({ workflowName: context.activePlaceholderWorkflowName, stepNumber: context.activePlaceholderWorkflowStepNumber })`
3. In [tools/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts#L7-L23), export the new file immediately after `./build_epics_document`.
4. In [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L9-L26), import `build_epic_delivery_spec_variants` immediately after `build_epics_document_variants`.
5. In [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L53-L70), spread `...build_epic_delivery_spec_variants` immediately after `...build_epics_document_variants`.
6. In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L486-L494), add a compact native description case for `build_epic_delivery_spec` immediately after `build_epics_document` and before `select_target_epic`.
7. The compact description string in [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L486-L494) must be exactly:
   - `Build the canonical pi-planning Step 3 delivery spec at {output_folder}/implementation-artifacts/epic-<number>-delivery-spec.md from workflow-owned placeholder state. Resolve {epics_document} and {target_epic} from workflow state, preserve the full template structure, and persist the resolved artifact path as {epic_delivery_spec}.`
8. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L3-L23), add the new bundle name `EPIC_DELIVERY_SPEC_BUILD` immediately after `TARGET_EPIC_SELECT`.
9. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L41-L46), add `EPIC_DELIVERY_SPEC_BUILD: [ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC],` immediately after `TARGET_EPIC_SELECT`.
10. In [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L316-L318), change the `pi-planning.md` row from only Step 2 to:
    - `2: ["TARGET_EPIC_SELECT"],`
    - `3: ["EPIC_DELIVERY_SPEC_BUILD"],`
11. In each variant config file where `ClineDefaultTool.SELECT_TARGET_EPIC` currently appears, insert `ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC,` immediately after it:
    - [devstral/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/devstral/config.ts#L63)
    - [gemini-3/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gemini-3/config.ts#L75)
    - [generic/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts#L83)
    - [glm/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/glm/config.ts#L63)
    - [gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts#L73)
    - [hermes/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/hermes/config.ts#L65)
    - [native-gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts#L85)
    - [native-gpt-5-1/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/config.ts#L80)
    - [native-next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts#L73)
    - [next-gen/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts#L78)
    - [trinity/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/trinity/config.ts#L64)
    - [xs/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/xs/config.ts#L59)
12. In [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L44-L61), [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L73-L90), and [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L110-L119), add `ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC` immediately after `ClineDefaultTool.SELECT_TARGET_EPIC` in all three write-like switch branches.
13. In [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L93-L99), add exactly one `undefined` entry for `ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC` immediately after `ClineDefaultTool.SELECT_TARGET_EPIC`.
14. Do not add any response-tool metadata entry for `BUILD_EPIC_DELIVERY_SPEC`; it must remain a non-response tool.

## Step 3
[x] Implement `BuildEpicDeliverySpecToolHandler` and wire it into the executor.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts`

Exact edits:
1. Create [BuildEpicDeliverySpecToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicDeliverySpecToolHandler.ts) as the Step 3 workflow-owned builder sibling of [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L165-L393).
2. The new handler must implement `IToolHandler` only; do not add `IPartialBlockHandler` or a custom preview payload in this slice.
3. Set `readonly name = ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC` and `getDescription()` to return exactly `[build_epic_delivery_spec]`.
4. At the top of the file, copy the local `atomicReplaceTextFile(...)` helper from [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L22-L39) unchanged.
5. Also add a local `replaceTemplateSection(...)` helper using the exact start-marker / end-marker replacement pattern from [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L85-L101).
6. Add a local helper that resolves the active placeholder-workflow step using the exact [SelectTargetEpicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts#L38-L53) pattern, but name it exactly `resolveActivePiPlanningStepThree`.
7. In `execute(...)`, fail fast with `formatResponse.toolError("build_epic_delivery_spec can only be used while pi-planning.md Step 3 is the active placeholder workflow context.")` unless `isBuildEpicDeliverySpecStep(activeStep?.sourceName, activeStep?.stepNumber)` is true.
8. Resolve merged placeholders with `getPlaceholderWorkflowValueMap(...) ?? {}` exactly as [SelectTargetEpicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts#L55-L75) does.
9. Resolve and trim these exact placeholder-backed inputs:
   - `epics_document`
   - `target_epic`
10. Use `resolvePlaceholderWorkflowText(...)` for `epics_document` and `target_epic` before trimming, then resolve relative file paths against the same `resolutionBase` precedence used in [SelectTargetEpicToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SelectTargetEpicToolHandler.ts#L67-L75).
11. For missing placeholders, return these exact sibling-pattern errors:
   - missing `epics_document`: `Could not resolve workflow placeholder 'epics_document' from the active placeholder workflow state.`
   - missing `target_epic`: `Could not resolve workflow placeholder 'target_epic' from the active placeholder workflow state.`
12. Build stable placeholders with `buildWorkflowStablePlaceholders({ cwd: config.cwd })` exactly as [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L210-L247) does.
13. Resolve the template path with `resolveWorkflowPlaceholderText("{project-root}/.cline/skills/create-epics/epic-delivery-spec-template.md", stablePlaceholders)`.
14. Resolve the artifact path by:
   - extracting the epic number from `target_epic` using the exact canonical shape `Epic N: Title`
   - building the placeholder string `{output_folder}/implementation-artifacts/epic-<number>-delivery-spec.md`
   - passing it through `resolveWorkflowPlaceholderText(...)`
15. If the resolved artifact raw path is empty or still contains `{output_folder}`, return the exact stable-placeholder error already used by [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L213-L217):
   - `Could not resolve stable placeholder 'output_folder' from .cline/workflow-config.yaml.`
16. Read the canonical template file and the resolved epics document with `fs.readFile(..., "utf8")`.
17. For unreadable files, return these exact tool errors:
   - template read failure: `Could not read the canonical epic delivery spec template at ${templatePath}.`
   - epics document read failure: `Could not read the resolved epics_document at ${epicsDocumentPath}.`
18. Extract the selected epic block only from the canonical `### Epic N: Title` section shape in the epics document. End that block at the next `### Epic ` heading or the next higher-level `## ` heading.
19. From the selected epic block, extract exactly these `####` sections:
   - `Objective`
   - `Description`
   - `Success Measures`
   - `Scope`
   - `Scope Boundary`
20. If the selected epic cannot be matched, or if any required section is missing or empty after trimming, return `formatResponse.toolError(...)` with this exact message:
   - `Unable to populate delivery spec from the epics document. Please ensure the epics document is complete before attempting this workflow.`
21. Preserve the full template by editing the loaded template text in place:
   - replace line 1 `# Epic Name` with `# ${targetEpic}`
   - replace line 3 `### Epic #: Epic_Name` with `### ${targetEpic}`
   - populate the section bodies bounded by these exact markers from [epic-delivery-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/create-epics/epic-delivery-spec-template.md#L5-L33):
     - `#### Objective\n` -> `#### Description\n`
     - `#### Description\n` -> `#### Success Measures\n`
     - `#### Success Measures\n` -> `#### Scope\n`
     - `#### Scope\n` -> `#### Scope Boundary\n`
     - `#### Scope Boundary\n` -> `# User Stories\n`
22. Do not remove, rewrite, or populate the `# User Stories` scaffold; it must remain in the output after Step 3.
23. Follow the approval flow pattern in [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L330-L356):
   - `tool` value in the approval payload must be exactly `buildEpicDeliverySpec`
   - `path` must be `getReadablePath(config.cwd, artifactPath)`
   - `content` must list the resolved epics source and template paths on separate lines
24. Run `ToolHookUtils.runPreToolUseIfEnabled(config, block)` using the same cancellation handling as [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L359-L368).
25. After approval and pre-tool hooks, write the rebuilt document with `atomicReplaceTextFile(...)`, record write proof with `recordAndPersistPlaceholderWorkflowWriteProof(...)`, set `config.taskState.didEditFile = true`, and delete the artifact from `config.taskState.fileReadCache` using the lower-cased absolute path key pattern from [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L370-L379).
26. Persist the resolved absolute artifact path via `persistWorkflowPlaceholderValues(config, { epic_delivery_spec: artifactPath })`.
27. Do not edit `ARTIFACT_PLACEHOLDER_KEYS` or any placeholder-normalization helper; passing the absolute `artifactPath` into `persistWorkflowPlaceholderValues(...)` is the entire contract for this slice.
28. Return `formatResponse.toolResult(JSON.stringify({ persisted: true, artifact_path: artifactPath, epic_delivery_spec_available: true }))` on success.
29. Wrap the main execution body in `try/catch` and return `formatResponse.toolError(error instanceof Error ? error.message : String(error))` for unexpected failures.
30. In [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L96-L142) and [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts#L192-L212), fix the existing helper-visibility seam by:
    - moving `applyGenericWorkflowPlaceholders(...)` out of the class into a file-local function placed immediately above `persistWorkflowPlaceholderValues(...)`
    - keeping its parameter list and synthetic-run body exactly the same as the current private method
    - replacing the current `const handler = new SetWorkflowPlaceholdersToolHandler()` / `handler.applyGenericWorkflowPlaceholders(...)` call with a direct call to the new file-local helper
    - removing the now-unused private class method from `SetWorkflowPlaceholdersToolHandler`
31. Do not change any other placeholder-persistence semantics in [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts); this step is only the minimal TypeScript-safe extraction needed for the existing file-level helper to compile.
32. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L11-L41), import `BuildEpicDeliverySpecToolHandler` immediately after `BuildEpicsDocumentToolHandler`.
33. In [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L127-L131), register `[ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC]: (_v: ToolValidator) => new BuildEpicDeliverySpecToolHandler(),` immediately after `BUILD_EPICS_DOCUMENT` and before `SELECT_TARGET_EPIC`.

## Step 4
[x] Add workflow-owned builder tests and non-response-registry coverage for the new tool.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`

Exact edits:
1. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L18-L25), import `BuildEpicDeliverySpecToolHandler` immediately after `BuildEpicsDocumentToolHandler`.
2. In [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L276-L360), add a new repo-fixture helper immediately after `createBuildEpicsDocumentRepo(...)` named exactly `createBuildEpicDeliverySpecRepo(options?: { includeWorkflowConfig?: boolean; preexistingArtifact?: string; omitRequiredSection?: "Objective" | "Description" | "Success Measures" | "Scope" | "Scope Boundary"; selectedEpicMissing?: boolean })`.
3. The new repo-fixture helper must:
   - create a temp repo dir
   - write `.cline/workflow-config.yaml` with `output_folder: "planning"` when `includeWorkflowConfig !== false`
   - write the canonical template to `.cline/skills/create-epics/epic-delivery-spec-template.md` using the exact structure from [epic-delivery-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/create-epics/epic-delivery-spec-template.md#L1-L33)
   - write `docs/epics.md` containing the canonical `### Epic List` anchor plus `### Epic 2: Catalog` and `### Epic 3: Checkout`
   - include all five required `####` sections for `Epic 3: Checkout` unless `omitRequiredSection` removes one of them
   - omit the `Epic 3: Checkout` block entirely when `selectedEpicMissing === true`
   - return `repoDir`, `epicsRelativePath`, `epicsPath`, `templatePath`, and `artifactPath`
4. Insert a new test block immediately after the existing `build_epics_document` tests and before the first `CodeReviewSpecUpdateToolHandler` test at [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L2343).
5. Add these exact test titles and exact assertions:
   - `it("builds the canonical epic delivery spec from the full template and persists epic_delivery_spec", async () => { ... })`
     - use `createBuildEpicDeliverySpecRepo({ preexistingArtifact: "# stale\\n" })`
     - set `config.taskState.activePlaceholderWorkflowId = "pi-planning.md"`
     - set `config.taskState.activePlaceholderWorkflowSource` to a minimal `pi-planning.md` source containing Step 3
     - set `config.taskState.currentFocusChainChecklist = "- [x] Step 1: Gather Requirements\\n- [x] Step 2: Identify Target Epic\\n- [ ] Step 3: Build Epic Delivery Spec"`
     - set `config.taskState.activePlaceholderWorkflowValues = { epics_document: epicsRelativePath, target_epic: "Epic 3: Checkout" }`
     - execute `build_epic_delivery_spec`
     - expect parsed result payload fields:
       - `persisted === true`
       - `artifact_path === artifactPath`
       - `epic_delivery_spec_available === true`
     - expect `config.taskState.activePlaceholderWorkflowValues?.epic_delivery_spec === artifactPath`
     - expect `config.taskState.activePlaceholderWorkflowTaskWriteProofPaths` to include `artifactPath`
     - expect `config.taskState.didEditFile === true`
     - expect `config.taskState.fileReadCache.has(artifactPath.toLowerCase()) === false`
     - expect the artifact contents to include:
       - `# Epic 3: Checkout`
       - `### Epic 3: Checkout`
       - all five populated Step 3 section headings
       - `# User Stories`
       - `## Story #`
       - `### Objective`
       - `### Acceptance Criteria`
       - `### Sequencing/ Dependencies`
   - `it("requires epics_document from merged placeholder workflow state for build_epic_delivery_spec", async () => { ... })`
     - expect exact tool error: `Could not resolve workflow placeholder 'epics_document' from the active placeholder workflow state.`
   - `it("requires target_epic from merged placeholder workflow state for build_epic_delivery_spec", async () => { ... })`
     - expect exact tool error: `Could not resolve workflow placeholder 'target_epic' from the active placeholder workflow state.`
   - `it("requires output_folder from workflow-config stable placeholders for build_epic_delivery_spec", async () => { ... })`
     - use `includeWorkflowConfig: false`
     - expect exact tool error: `Could not resolve stable placeholder 'output_folder' from .cline/workflow-config.yaml.`
   - `it("fails when the canonical epic delivery spec template cannot be read", async () => { ... })`
     - remove the template file before execution
     - expect exact tool error: `Could not read the canonical epic delivery spec template at ${templatePath}.`
   - `it("fails with the approved user-facing message when the selected epic cannot be found", async () => { ... })`
     - use `selectedEpicMissing: true`
     - expect exact tool error with the approved message from the requirements
   - `it("fails with the approved user-facing message when a required epic section is missing", async () => { ... })`
     - use `omitRequiredSection: "Scope Boundary"`
     - expect exact tool error with the approved message from the requirements
   - `it("overwrites an existing canonical artifact atomically for build_epic_delivery_spec", async () => { ... })`
     - pre-create the artifact with stale content
     - execute the tool
     - expect the final file contents to no longer equal the stale content and to contain `# Epic 3: Checkout`
6. Keep `isSubagentExecution: true` in these tests by reusing `createConfig(...)`; this avoids approval-UI branching and keeps the tests focused on runtime file behavior.
7. In [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts#L82-L85), extend the existing non-response-tool assertion to also require `ResponseToolRegistry.get(ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC) === undefined`.
8. Do not create a new focused handler test file for this slice; keep the artifact-builder coverage in `ManagedWorkflowHandlers.test.ts` alongside the existing `build_epics_document` builder tests.

## Step 5
[x] Add prompt gating and native-tool-surface tests for the new Step 3 builder.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

Exact edits:
1. In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L19-L37), import `build_epic_delivery_spec_variants` immediately after `build_epics_document_variants`.
2. In the workflow placeholder tool-gating block at [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L330-L380), add a new test immediately after `gates select_target_epic to pi-planning step 2` with this exact title:
   - `it("gates build_epic_delivery_spec to pi-planning step 3", () => { ... })`
3. In that new gating test, assert:
   - `true` for `activePlaceholderWorkflowName: "pi-planning.md", activePlaceholderWorkflowStepNumber: 3`
   - `false` for `activePlaceholderWorkflowName: "pi-planning.md", activePlaceholderWorkflowStepNumber: 2`
   - `false` for `activePlaceholderWorkflowName: "create-epics.md", activePlaceholderWorkflowStepNumber: 3`
4. In the compact-description block at [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L920-L960), add a new test immediately after `compacts native build_epics_document descriptions and parameter text` and before `compacts native select_target_epic descriptions` with this exact title:
   - `it("compacts native build_epic_delivery_spec descriptions and parameter text", () => { ... })`
5. In that new compaction test, set `activePlaceholderWorkflowName: "pi-planning.md"` and `activePlaceholderWorkflowStepNumber: 3`, then assert:
   - the OpenAI function description equals the exact compact string prescribed in Step 2 item 7
   - `Object.keys(openAIProperties)` is `[]`
6. In [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts#L262-L302), add a new test immediately after the existing pi-planning Step 2 row test with this exact title:
   - `it("applies pi-planning step 3 row and keeps only the delivery-spec builder plus preserved tools", () => { ... })`
7. In that new contextual filter test:
   - register `BUILD_EPIC_DELIVERY_SPEC`, `SET_WORKFLOW_PLACEHOLDERS`, `LIST_FILES`, `SEARCH`, `FILE_READ`, `FILE_READ_RANGE`, `ASK`, `SEND_USER_MESSAGE`, `ATTEMPT`, `PLAN_MODE`, `BROWSER`, `MCP_ACCESS`, and `NEW_TASK`
   - assert the kept ids include:
     - `ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC`
     - `ClineDefaultTool.ASK`
     - `ClineDefaultTool.SEND_USER_MESSAGE`
     - `ClineDefaultTool.ATTEMPT`
     - `ClineDefaultTool.BROWSER`
     - `ClineDefaultTool.MCP_ACCESS`
     - `ClineDefaultTool.NEW_TASK`
   - assert the kept ids do not include:
     - `ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS`
     - `ClineDefaultTool.LIST_FILES`
     - `ClineDefaultTool.FILE_READ`
     - `ClineDefaultTool.PLAN_MODE`
8. In [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1298-L1322), add a new test immediately after `filters native tools for pi-planning step 2` with this exact title:
   - `it("filters native tools for pi-planning step 3", async function () { ... })`
9. In that new integration test, use the same native OpenAI prompt context shape as the neighboring pi-planning Step 2 test, but set `activePlaceholderWorkflowStepNumber: 3`.
10. In the Step 3 integration assertion, require the native tool names to include:
    - `"build_epic_delivery_spec"`
    - `"attempt_completion"`
11. In the same assertion, require the native tool names to exclude:
    - `"set_workflow_placeholders"`
    - `"read_file"`
    - `"execute_command"`
    - `"generate_plan_output"`
12. Do not edit snapshot files in this step. If any snapshot suite fails later because the new tool unexpectedly appears outside pi-planning Step 3 gating, stop and report it instead of updating snapshots ad hoc.

## Step 6
[x] Run the prescribed verification commands in order, stop on the first failure, and complete the string-contract audit.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/pi-planning/step-3-automation-action-plan.md`

Exact commands:
1. `npm run test:unit -- src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
2. `npm run test:unit -- src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts`
3. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts`
4. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts`
5. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`
6. `npx tsc --noEmit`
7. `rg -n "BUILD_EPIC_DELIVERY_SPEC|build_epic_delivery_spec|EPIC_DELIVERY_SPEC_BUILD|epic_delivery_spec|epic-[0-9]+-delivery-spec|Unable to populate delivery spec from the epics document\\. Please ensure the epics document is complete before attempting this workflow\\." src docs/workflow-automation/pi-planning`

Completion rules:
- If any command fails, stop immediately, leave this step unchecked, and report the exact failing command plus the failure.
- Mark this step complete only if every command passes.
- Do not add substitute verification commands unless the user explicitly approves an action-plan correction.
