---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup beyond what is explicitly prescribed here.
---

# Quick Spec Workflow Progression Action Plan

## Scope Lock

This plan implements the deterministic workflow progression slice defined in [workflow-progression-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/quick-spec/workflow-progression-requirements.md).

Live seam audit completed before authoring this plan:

- [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md#L5) now has ten steps, with deterministic targets only at Step 1, Step 2, and Step 10.
- [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md#L15), [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md#L20), [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md#L25), [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md#L30), [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md#L35), [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md#L44), and [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md#L61) explicitly route Steps 3 through 9 through `workflow_progress_request`.
- [quick-spec.md](/Users/robertboston/Documents/Cline/Workflows/quick-spec.md#L79) closes the workflow with `attempt_completion`, which makes Step 10 machine-checkable through tool context.
- [tech-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-quick-spec/tech-spec-template.md#L1) defines the canonical Step 2 scaffold headings and YAML frontmatter, including `status: 'backlog'`.
- [BuildTechSpecDocumentToolHandler.ts:39](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L39) already owns the canonical quick-spec slug derivation contract.
- [BuildTechSpecDocumentToolHandler.ts:106](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L106) and [BuildTechSpecDocumentToolHandler.ts:139](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L139) already own the canonical Step 2 artifact path and template-substitution behavior.
- [build-tech-spec-document.ts:1](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/build-tech-spec-document.ts#L1) already gates the scaffold builder to `quick-spec.md` Step 2.
- [TaskState.ts:34](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L34) does not yet include `quick-spec.md` in the deterministic workflow-name union.
- [deterministicPlaceholderProgression.ts:32](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32) does not yet allowlist or dispatch `quick-spec.md`.
- [workflow-progress-request.ts:1](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1) does not yet include `quick-spec.md`, so Steps 3 through 9 currently cannot receive shared runtime-owned advancement.

This plan must remain independent from:

- workflow-start card behavior
- workflow-start form behavior
- Step 2 scaffold-building implementation
- contextual tool matrix configuration
- persona activation

The exact quick-spec progression contract for this plan is:

- Step 1: `title` is already available in placeholder workflow state and is non-empty after trimming
- Step 2: `output_file` resolves to the canonical `tech-spec-wip.md`, the scaffold exists, its YAML frontmatter and H1 are initialized correctly from placeholder state, all required headings from the live template are present, and raw `{title}`, `{slug}`, and `{date}` tokens are gone
- Steps 3 through 9: not evaluator-completed; they advance only through `workflow_progress_request`
- Step 10: `attempt_completion` executes successfully in the current turn

## Action Plan

- [x] Step 1: Extend the deterministic workflow-name contract and supported-workflow allowlist for `quick-spec.md`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
  - In [TaskState.ts:34](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L34), insert the exact union member `"quick-spec.md"` immediately after `"create-story.md"` and before `"dev-story.md"`.
  - Do not modify any other `TaskState` type or field in this step.
  - In [deterministicPlaceholderProgression.ts:32](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32), extend `isDeterministicPlaceholderWorkflowSupported(...)` so it returns `true` for `workflowName === "quick-spec.md"` immediately after the existing `create-story.md` branch and before the existing `dev-story.md` branch.
  - Do not add fuzzy matching, basename-only matching, or grouped "quick workflow" helpers in this step.

- [x] Step 2: Add the quick-spec structural scaffold validator and deterministic evaluator branches
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
  - In [deterministicPlaceholderProgression.ts:55](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L55), immediately after `CREATE_STORY_REQUIRED_TEMPLATE_HEADINGS`, insert this exact constant:
    ```ts
    const QUICK_SPEC_REQUIRED_TEMPLATE_HEADINGS = [
    	"## Overview",
    	"### Problem Statement",
    	"### Solution",
    	"### Scope",
    	"#### In Scope",
    	"#### Out of Scope",
    	"## Context for Development",
    	"### Codebase Patterns",
    	"### Files to Reference",
    	"### Technical Decisions",
    	"## Implementation Plan",
    	"### Acceptance Criteria",
    	"### Implementation Seams",
    	"### Tasks",
    	"## Latest Review Findings",
    ] as const
    ```
  - In [deterministicPlaceholderProgression.ts:282](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L282), immediately before `didSuccessfulAttemptCompletionOccur(...)`, insert:
    ```ts
    async function validateQuickSpecScaffoldStructure(args: { placeholders: Record<string, string> }): Promise<boolean>
    ```
  - Implement `validateQuickSpecScaffoldStructure(...)` with this exact behavior:
    - read and trim `output_file`, `implementation_artifacts`, `title`, and `date` from `args.placeholders`; return `false` if any are blank
    - resolve `output_file` with `resolveArtifactPlaceholderPath(...)`
    - resolve the canonical artifact path by calling `resolveArtifactPlaceholderPath(args.placeholders, path.join(implementationArtifacts, "tech-spec-wip.md"))`
    - require `arePathsEqual(resolvedOutputFilePath, resolvedCanonicalArtifactPath)` to be `true`
    - read the artifact through `readFileIfExists(...)`; return `false` if it is missing
    - derive `expectedSlug` inline using the exact slug algorithm already used at [BuildTechSpecDocumentToolHandler.ts:39-45](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildTechSpecDocumentToolHandler.ts#L39):
      - `trim()`
      - `toLowerCase()`
      - `.replace(/[^a-z0-9]+/g, "-")`
      - `.replace(/-+/g, "-")`
      - `.replace(/^-+|-+$/g, "")`
    - return `false` if `expectedSlug` is blank
    - require the artifact text to contain these exact initialized lines:
      - `title: '<resolved title>'`
      - `slug: '<expectedSlug>'`
      - `created: '<resolved date>'`
      - `status: 'backlog'`
      - `# Tech-Spec: <resolved title>`
    - require the artifact text to not contain any of:
      - `{title}`
      - `{slug}`
      - `{date}`
    - require every heading in `QUICK_SPEC_REQUIRED_TEMPLATE_HEADINGS` to be present by checking `extractMarkdownSection(fileText, heading) !== undefined`
    - return `true` only when every condition above succeeds
  - Immediately before [deterministicPlaceholderProgression.ts:895](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L895), insert:
    ```ts
    async function evaluateQuickSpecStep(args: {
    	taskState: TaskState
    	stepNumber: number
    	toolContext?: DeterministicPlaceholderToolContext
    }): Promise<DeterministicStepEvaluationResult>
    ```
  - Implement `evaluateQuickSpecStep(...)` using `const placeholders = getMergedPlaceholderValues(args.taskState)` and these exact branches:
    - `case 1`:
      - read `title = placeholders.title?.trim()`
      - return `{ completed: false }` if blank
      - otherwise return:
        ```ts
        {
        	completed: true,
        	reason: "title was already available in workflow placeholder state.",
        }
        ```
    - `case 2`:
      - call `await validateQuickSpecScaffoldStructure({ placeholders })`
      - return `{ completed: false }` when it returns `false`
      - otherwise return:
        ```ts
        {
        	completed: true,
        	reason: "The canonical quick-spec scaffold already exists, preserves the required template heading set, and is initialized correctly.",
        }
        ```
    - `case 10`:
      - require `didSuccessfulAttemptCompletionOccur(args.toolContext)` to be `true`
      - otherwise return `{ completed: false }`
      - on success return:
        ```ts
        {
        	completed: true,
        	reason: "attempt_completion was executed successfully for the final quick-spec closeout.",
        }
        ```
    - `default`:
      - return `{ completed: false }`
  - Do not add evaluator branches for Steps 3 through 9.
  - In [deterministicPlaceholderProgression.ts:1115](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L1115), add a new `if (args.workflowName === "quick-spec.md")` dispatch branch immediately after the existing `pi-planning.md` branch and before the existing `create-story.md` branch, routing to `evaluateQuickSpecStep(...)`.

- [x] Step 3: Add shared `workflow_progress_request` support for quick-spec Steps 3 through 9
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/shared/workflow-progress-request.ts`
  - In [workflow-progress-request.ts:1-6](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1), insert this exact entry immediately after `"create-story.md": [3, 4],` and before `"create-epics.md": [3],`:
    ```ts
    "quick-spec.md": [3, 4, 5, 6, 7, 8, 9],
    ```
  - In [workflow-progress-request.ts:19-31](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L19), insert this exact normalization branch immediately after the existing `create-story` branch and before the existing `create-epics` branch:
    ```ts
    if (normalized === "quick-spec.md" || normalized === "quick-spec") {
    	return "quick-spec.md"
    }
    ```
  - Do not change `WORKFLOW_PROGRESS_REQUEST_QUESTION`, `WORKFLOW_PROGRESS_REQUEST_OPTIONS`, or `shouldExposeWorkflowProgressRequest(...)`.

- [x] Step 4: Add focused deterministic progression tests for quick-spec
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
  - In the support-gate test at [deterministicPlaceholderProgression.test.ts:55-63](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L55), insert these two exact assertions immediately after the existing `create-story.md` assertions and before the existing `dev-story.md` assertions:
    ```ts
    expect(isDeterministicPlaceholderWorkflowSupported("quick-spec.md")).to.equal(true)
    expect(isDeterministicPlaceholderWorkflowSupported("quick-spec")).to.equal(false)
    ```
  - Immediately before the existing `describe("create-story.md", ...)` block at [deterministicPlaceholderProgression.test.ts:3212](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L3212), insert a new `describe("quick-spec.md", () => { ... })` block.
  - Inside that new block, declare these exact shared constants:
    - `const quickSpecStep1Heading = "## Step 1: Gather Project Info"`
    - `const quickSpecStep2Heading = "## Step 2: (System-Owned) Resolve or start the spec draft"`
    - `const quickSpecStep3Heading = "## Step 3: Identify the Objective"`
    - `const quickSpecStep9Heading = "## Step 9: Build Tasks / Subtasks"`
    - `const quickSpecStep10Heading = "## Step 10: Final Review & Closeuout"`
    - `const quickSpecScaffoldFixture =` the exact live template structure from [tech-spec-template.md:1-46](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-quick-spec/tech-spec-template.md#L1) with placeholders replaced to:
      - `title: 'Quick Spec Workflow'`
      - `slug: 'quick-spec-workflow'`
      - `created: '2026-04-08'`
      - `status: 'backlog'`
      - `# Tech-Spec: Quick Spec Workflow`
  - Add these exact test titles in this exact order:
    - `it("completes quick-spec step 1 when title is already available in workflow placeholder state", async () => { ... })`
    - `it("does not complete quick-spec step 1 when title is missing", async () => { ... })`
    - `it("does not complete quick-spec step 1 when title is blank after trimming", async () => { ... })`
    - `it("completes quick-spec step 2 when output_file points to the canonical initialized scaffold", async () => { ... })`
    - `it("does not complete quick-spec step 2 when output_file is missing", async () => { ... })`
    - `it("does not complete quick-spec step 2 when output_file is outside implementation_artifacts/tech-spec-wip.md", async () => { ... })`
    - `it("does not complete quick-spec step 2 when the scaffold status is not backlog", async () => { ... })`
    - `it("does not complete quick-spec step 2 when a required template heading is missing", async () => { ... })`
    - `it("does not complete quick-spec step 2 when unresolved placeholder tokens remain", async () => { ... })`
    - `it("does not deterministically complete quick-spec step 3 when overview content is already populated", async () => { ... })`
    - `it("does not deterministically complete quick-spec step 9 when tasks are already populated", async () => { ... })`
    - `it("completes quick-spec step 10 from successful attempt_completion tool context", async () => { ... })`
    - `it("does not complete quick-spec step 10 when attempt_completion was not executed", async () => { ... })`
  - Use these exact fixture conventions:
    - every test uses `workflowName: "quick-spec.md"`
    - the Step 1 checklist is `"- [ ] Step 1: Gather Project Info"`
    - the Step 2 checklist is `"- [ ] Step 2: (System-Owned) Resolve or start the spec draft"`
    - the Step 3 checklist is `"- [ ] Step 3: Identify the Objective"`
    - the Step 9 checklist is `"- [ ] Step 9: Build Tasks / Subtasks"`
    - the Step 10 checklist is `"- [ ] Step 10: Final Review & Closeuout"`
    - every relative-path test sets `stablePlaceholderValues.cwd = tempDir` and `stablePlaceholderValues.project_root = tempDir`
    - every Step 2-path test sets `stablePlaceholderValues.implementation_artifacts = path.join(tempDir, "planning", "implementation-artifacts")`
    - every Step 2-path test sets `stablePlaceholderValues.date = "2026-04-08"`
    - every Step 2-path test sets `placeholderValues.title = "Quick Spec Workflow"`
    - every Step 2 success test sets `placeholderValues.output_file = path.join("planning", "implementation-artifacts", "tech-spec-wip.md")`
  - Use these exact reason assertions:
    - Step 1 success reason: `"title was already available in workflow placeholder state."`
    - Step 2 success reason: `"The canonical quick-spec scaffold already exists, preserves the required template heading set, and is initialized correctly."`
    - Step 10 success reason: `"attempt_completion was executed successfully for the final quick-spec closeout."`
  - Use these exact Step 2 fixture mutations for the negative tests:
    - `output_file missing`: omit `placeholderValues.output_file`
    - `outside implementation_artifacts/tech-spec-wip.md`: set `placeholderValues.output_file = path.join("planning", "other", "tech-spec-wip.md")` and write the scaffold at `path.join(tempDir, "planning", "other", "tech-spec-wip.md")`
    - `status is not backlog`: replace `status: 'backlog'` with `status: 'ready-for-dev'`
    - `required template heading is missing`: remove the exact `### Files to Reference` heading line from `quickSpecScaffoldFixture`
    - `unresolved placeholder tokens remain`: start from the live template text and replace only the YAML frontmatter plus H1 values so at least one raw `{title}`, `{slug}`, or `{date}` token remains in the body
  - For every Step 1 and Step 2 negative test, assert the checklist remains unchanged and `pendingAutoCompletedPlaceholderWorkflowStepNotices` stays empty.
  - For the Step 2 success test, assert the checklist becomes `"- [x] Step 2: (System-Owned) Resolve or start the spec draft"`.
  - For the Step 3 and Step 9 governed tests, write a populated scaffold file first, then assert deterministic progression leaves the checklist unchanged and produces no notices.
  - For the Step 10 success test, pass tool context:
    ```ts
    {
    	toolName: "attempt_completion",
    	toolWasExecuted: true,
    	toolResult: "[attempt_completion] Result:\nDone",
    }
    ```
  - For the Step 10 failure test, keep the same tool name and result but set `toolWasExecuted: false`.

- [x] Step 5: Update shared prompt/runtime regression coverage for `workflow_progress_request` on quick-spec Steps 3 through 9
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
  - In [spec.test.ts:463-536](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L463), update the existing workflow-progress-request gating test title to:
    - `it("gates workflow_progress_request to create-prd steps 3 through 14, create-story steps 3 and 4, quick-spec steps 3 through 9, create-epics step 3, and pi-planning steps 4 and 5", () => {`
  - In that same test body, add these exact assertions after the existing `create-story.md` assertions and before the existing `create-epics.md` assertions:
    ```ts
    expect(
    	tool.contextRequirements?.({
    		...mockContext,
    		activePlaceholderWorkflowName: "quick-spec.md",
    		activePlaceholderWorkflowStepNumber: 3,
    	}),
    ).to.equal(true)
    expect(
    	tool.contextRequirements?.({
    		...mockContext,
    		activePlaceholderWorkflowName: "quick-spec.md",
    		activePlaceholderWorkflowStepNumber: 9,
    	}),
    ).to.equal(true)
    expect(
    	tool.contextRequirements?.({
    		...mockContext,
    		activePlaceholderWorkflowName: "quick-spec.md",
    		activePlaceholderWorkflowStepNumber: 2,
    	}),
    ).to.equal(false)
    expect(
    	tool.contextRequirements?.({
    		...mockContext,
    		activePlaceholderWorkflowName: "quick-spec.md",
    		activePlaceholderWorkflowStepNumber: 10,
    	}),
    ).to.equal(false)
    ```
  - In [task_progress.test.ts:132-177](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/task_progress.test.ts#L132), immediately after the existing create-story tests and before `describe("generic task progress prompt", ...)`, add these two tests:
    - `it("teaches workflow_progress_request for quick-spec step 3", async () => { ... })`
    - `it("does not teach workflow_progress_request for quick-spec step 10", async () => { ... })`
  - In the quick-spec step 3 task-progress test, use:
    - `activePlaceholderWorkflowName: "quick-spec.md"`
    - `activePlaceholderWorkflowStepNumber: 3`
    - assert the returned prompt contains `workflow_progress_request`
    - assert it does not contain `send_user_message`
    - assert it contains `Do not include \`task_progress\` on \`workflow_progress_request\``
  - In the quick-spec step 10 task-progress test, use:
    - `activePlaceholderWorkflowName: "quick-spec.md"`
    - `activePlaceholderWorkflowStepNumber: 10`
    - assert the returned prompt does not contain `workflow_progress_request`
    - assert it does not contain `Do not include \`task_progress\` on \`workflow_progress_request\``
  - In [response_tools.test.ts:91-141](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/response_tools.test.ts#L91), immediately after the existing create-story block, add a new `describe("quick-spec response tools prompt helpers", () => { ... })` block with these two tests:
    - `it("includes workflow_progress_request in response tools for quick-spec step 3", () => { ... })`
    - `it("omits workflow_progress_request from response tools for unsupported quick-spec step 10", () => { ... })`
  - In the quick-spec step 3 response-tools test, use a base context cloned from the existing `createStoryBaseContext`, overriding:
    - `activePlaceholderWorkflowName: "quick-spec.md"`
    - `activePlaceholderWorkflowStepNumber: 3`
    - assert `getCurrentModeResponseToolsLine(context)` contains `` `workflow_progress_request` ``
    - assert `getResponseToolsSection(context)` contains the existing shared workflow-progress-request description string
  - In the quick-spec step 10 response-tools test, keep the same base context but set `activePlaceholderWorkflowStepNumber: 10`, then assert both helper outputs omit `workflow_progress_request`.
  - In [integration.test.ts:784-865](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L784), immediately after the existing create-story continuation-turn tests and before `describe("Context-Specific Features", ...)`, add these two tests:
    - `it("generates a continuation prompt for quick-spec step 3 with workflow_progress_request guidance", async function () { ... })`
    - `it("does not generate workflow_progress_request guidance for quick-spec step 10", async function () { ... })`
  - In the quick-spec step 3 integration test, mirror the existing create-story continuation-turn setup but use:
    - `activePlaceholderWorkflowName: "quick-spec.md"`
    - `activePlaceholderWorkflowStepNumber: 3`
    - `currentFocusChainChecklist: "- [ ] Step 3: Identify the Objective"`
    - assert the prompt includes `workflow_progress_request`
    - assert it includes `Do not include \`task_progress\``
    - assert it includes `runtime-owned \`Yes\` branch completes the next checklist step before the next model request is built`
  - In the quick-spec step 10 integration test, use:
    - `activePlaceholderWorkflowName: "quick-spec.md"`
    - `activePlaceholderWorkflowStepNumber: 10`
    - `currentFocusChainChecklist: "- [ ] Step 10: Final Review & Closeuout"`
    - assert the prompt does not include `workflow_progress_request`
    - assert it does not include `Do not include \`task_progress\``

- [x] Step 6: Update the deterministic progression reference documentation for quick-spec
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md`
  - In the supported-workflow list at [deterministic-workflow-progression-readme.md:70-79](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L70), insert:
    - `` `quick-spec.md` ``
    immediately after `` `create-story.md` `` and before `` `dev-story.md` ``.
  - In the `Current evaluator examples:` block at [deterministic-workflow-progression-readme.md:117-121](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L117), insert this exact new workflow bullet immediately after the existing `create-story.md` bullet and before `review-adversarial-general.md`:
    ```md
    - `quick-spec.md`
      - Step 1 completes when `title` already exists in workflow placeholder state and is non-empty after trimming
      - Step 2 completes when `output_file` resolves to the canonical `tech-spec-wip.md`, the scaffold preserves the required template heading set, and the YAML frontmatter plus top heading are initialized correctly
      - Steps 3 through 9 are not evaluator-completed; they transition through `workflow_progress_request`
      - Step 10 completes when the current turn successfully executes `attempt_completion`
    ```
  - In the examples list at [deterministic-workflow-progression-readme.md:191-194](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L191), insert these exact bullets immediately after the existing `create-story.md` bullets and before `review-adversarial-general.md`:
    ```md
    - In `quick-spec.md`, if `title` is already available in placeholder state, Step 1 can complete immediately on the next deterministic pass.
    - In `quick-spec.md`, if `output_file` already points to the canonical `tech-spec-wip.md` scaffold with the required heading set and initialized frontmatter, Step 2 can auto-complete.
    - In `quick-spec.md`, Steps 3 through 9 do not auto-complete from document state alone because they are governed by `workflow_progress_request`.
    - In `quick-spec.md`, Step 10 can auto-complete when the current turn successfully executes `attempt_completion`.
    ```

- [x] Step 7: Run the prescribed verification commands and do not edit files in this step
  - Allowed files:
    - None. This is a read-only verification step.
  - Run these exact commands from the repo root:
    - `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
    - `npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/task_progress.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`
    - `npx tsc --noEmit`
    - `rg -n "quick-spec.md|QUICK_SPEC_REQUIRED_TEMPLATE_HEADINGS|validateQuickSpecScaffoldStructure|title was already available in workflow placeholder state|The canonical quick-spec scaffold already exists|attempt_completion was executed successfully for the final quick-spec closeout" src/core/task/TaskState.ts src/core/task/focus-chain/deterministicPlaceholderProgression.ts src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts src/shared/workflow-progress-request.ts src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/task_progress.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts docs/workflows/deterministic-workflow-progression-readme.md`
  - If any command fails, stop and report the exact failure before making further changes.
