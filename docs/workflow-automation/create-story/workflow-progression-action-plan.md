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

# Create Story Workflow Progression Action Plan

## Scope Lock

This plan implements the deterministic progression slice defined in [workflow-progression-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/create-story/workflow-progression-requirements.md).

Live seam audit completed before authoring this plan:

- [create-story.md](/Users/robertboston/Documents/Cline/Workflows/create-story.md#L5) has five steps, with deterministic targets only at Step 1, Step 2, and Step 5.
- [create-story.md](/Users/robertboston/Documents/Cline/Workflows/create-story.md#L64) and [create-story.md](/Users/robertboston/Documents/Cline/Workflows/create-story.md#L115) explicitly route Step 3 and Step 4 through `workflow_progress_request`.
- [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-story/template.md#L3) now starts at `Status: backlog`, which makes Step 5's terminal `ready-for-dev` gate machine-checkable.
- [epic-delivery-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/create-epics/epic-delivery-spec-template.md#L23) guarantees story blocks shaped as `## Story <number>` with `### Objective`, `### Acceptance Criteria`, and `### Sequencing/ Dependencies`.
- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L33) does not yet include `create-story.md` in the deterministic workflow-name union.
- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32) does not yet allowlist or dispatch `create-story.md`.
- [workflow-progress-request.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/workflow-progress-request.ts#L1) already supports `create-story.md` Steps 3 and 4 and must not be changed in this slice.
- No live Step 2 scaffold-building runtime tool was found in `src/`, so this slice must verify the persisted artifact contract only; it must not invent or implement Step 2 automation.

This plan must remain independent from:

- workflow-start form behavior
- contextual tool exposure
- Step 2 scaffold-building tool implementation
- persona activation
- `workflow_progress_request` handler logic

The create-story deterministic contract for this plan is:

- Step 1: `{epic_delivery_spec}` resolves to an existing file and `{story_number}` is already present
- Step 2: `{story_doc}` resolves under `{output_folder}/implementation-artifacts`, preserves every required heading from the live story template, retains `Status: backlog`, and matches the selected `## Story {story_number}` delivery-spec content for `## Story` and `## Acceptance Criteria` after insignificant whitespace normalization
- Step 3: not evaluator-completed
- Step 4: not evaluator-completed
- Step 5: `{story_doc}` exists and contains top-level `Status: ready-for-dev`

Per the user-approved decision for this slice, the Step 2 H1 check must validate story-number identity only. It must not attempt to derive or compare story-title text from `{epic_delivery_spec}`.

## Action Plan

- [x] Step 1: Extend the deterministic workflow-name contract and support allowlist for `create-story.md`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/TaskState.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
  - In [TaskState.ts:33](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts#L33), extend the `DeterministicPlaceholderWorkflowName` union by inserting the exact canonical filename `"create-story.md"` immediately after `"pi-planning.md"` and before `"dev-story.md"`.
  - Do not modify [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts) `AutoCompletedPlaceholderWorkflowStepNotice`, `ActivePlaceholderWorkflowDeterministicState`, or any `TaskState` field in this step.
  - In [deterministicPlaceholderProgression.ts:32](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L32), extend `isDeterministicPlaceholderWorkflowSupported(...)` so it returns `true` for `workflowName === "create-story.md"` immediately after the existing `pi-planning.md` branch and before the existing `dev-story.md` branch.
  - Do not add fuzzy matching, slash-command aliases, basename matching, or grouped "story workflow" helpers in this step.

- [x] Step 2: Add create-story-specific artifact validation helpers for Step 2 without coupling to any other workflow
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
  - In [deterministicPlaceholderProgression.ts:47](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L47), immediately after `type DeterministicStepEvaluationResult = { ... }`, insert this exact constant declaration:
    ```ts
    const CREATE_STORY_REQUIRED_TEMPLATE_HEADINGS = [
    	"## Story",
    	"## Acceptance Criteria",
    	"## Tasks / Subtasks",
    	"## Senior Developer QA Findings",
    	"## Dev Notes",
    	"### Project Structure Notes",
    	"### References",
    	"## Dev Agent Record",
    	"### Agent Model Used",
    	"### Debug Log References",
    	"### Completion Notes List",
    	"### File List",
    ] as const
    ```
  - Immediately after the existing `extractMarkdownSection(...)` helper at [deterministicPlaceholderProgression.ts:93](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L93), insert these four helpers in this exact order:
    1. `function normalizeInsignificantWhitespace(value: string): string`
    2. `function extractCreateStoryTopHeadingLine(fileText: string): string | undefined`
    3. `function extractCreateStoryEpicDeliverySpecStoryBlock(fileText: string, storyNumber: string): string | undefined`
    4. `function extractCreateStoryEpicDeliverySpecSection(storyBlock: string, heading: "### Objective" | "### Acceptance Criteria"): string | undefined`
  - Implement `normalizeInsignificantWhitespace(...)` with this exact normalization contract:
    - replace `\r\n` with `\n`
    - trim trailing spaces and tabs at line ends using `/[ \t]+$/gm`
    - collapse runs of 3 or more newlines to exactly 2 newlines using `/\n{3,}/g`
    - trim the final normalized string
  - Implement `extractCreateStoryTopHeadingLine(...)` by returning the trimmed first match of `/^# Story[^\n]*$/m`, or `undefined` when there is no such line.
  - Implement `extractCreateStoryEpicDeliverySpecStoryBlock(...)` with this exact behavior:
    - trim `storyNumber`; return `undefined` if blank
    - escape regex metacharacters in `storyNumber` inline using `.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`
    - find an exact heading line matching `^##\\s+Story\\s+${escapedStoryNumber}\\s*$` with multiline mode
    - if no such heading exists, return `undefined`
    - slice from that heading line to the next `^##\\s+Story\\s+` heading or end-of-file
    - return the trimmed slice
  - Implement `extractCreateStoryEpicDeliverySpecSection(...)` with this exact behavior:
    - escape the supplied heading string inline using `.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`
    - find the exact subsection heading line in `storyBlock`
    - if not found, return `undefined`
    - slice from that heading line to the next `^###\\s+` heading or end-of-block
    - return the trimmed subsection body without the heading line
  - Immediately after the existing `getCreateEpicsCanonicalArtifactPath(...)` helper at [deterministicPlaceholderProgression.ts:121](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L121), insert these two helpers in this exact order:
    1. `function getCreateStoryCanonicalArtifactDir(placeholders: Record<string, string>): string | undefined`
    2. `async function validateCreateStoryScaffoldAgainstEpicDeliverySpec(args: { placeholders: Record<string, string> }): Promise<boolean>`
  - Implement `getCreateStoryCanonicalArtifactDir(...)` with this exact behavior:
    - read `outputFolder` from `placeholders.output_folder?.trim()`
    - return `undefined` if blank
    - return `resolveArtifactPlaceholderPath(placeholders, path.join(outputFolder, "implementation-artifacts"))`
  - Implement `validateCreateStoryScaffoldAgainstEpicDeliverySpec(...)` with this exact behavior:
    - trim `story_doc`, `epic_delivery_spec`, and `story_number` from `args.placeholders`; return `false` if any are blank
    - resolve `story_doc` and `epic_delivery_spec` through `resolveArtifactPlaceholderPath(...)`
    - resolve the canonical artifacts directory through `getCreateStoryCanonicalArtifactDir(...)`; return `false` if it is `undefined`
    - require `arePathsEqual(path.dirname(resolvedStoryDocPath), canonicalArtifactDir)` to be `true`
    - read both files through `readFileIfExists(...)`; return `false` if either is missing
    - require `hasTopLevelStatusValue(storyDocText, ["backlog"])`
    - require every heading in `CREATE_STORY_REQUIRED_TEMPLATE_HEADINGS` to be present by checking `extractMarkdownSection(storyDocText, heading) !== undefined`
    - load `storyHeadingLine` through `extractCreateStoryTopHeadingLine(storyDocText)`; return `false` if missing
    - reject the scaffold if `storyHeadingLine.includes("{{")`
    - reject the scaffold unless `normalizeInsignificantWhitespace(storyHeadingLine)` matches `new RegExp(\`^# Story\\\\s+\${escapedStoryNumber}(?::|\\\\s|$)\`)`, where `escapedStoryNumber` is built from the same inline regex escaping rule used in `extractCreateStoryEpicDeliverySpecStoryBlock(...)`
    - load `storySection` from `extractMarkdownSection(storyDocText, "## Story")`; return `false` if missing
    - load `acceptanceCriteriaSection` from `extractMarkdownSection(storyDocText, "## Acceptance Criteria")`; return `false` if missing
    - reject the scaffold if `storySection.includes("{{")`
    - reject the scaffold if `acceptanceCriteriaSection.includes("[Add acceptance criteria from epics/PRD]")`
    - load `storyBlock` through `extractCreateStoryEpicDeliverySpecStoryBlock(epicDeliverySpecText, storyNumber)`; return `false` if missing
    - load `deliverySpecObjective` through `extractCreateStoryEpicDeliverySpecSection(storyBlock, "### Objective")`; return `false` if missing
    - load `deliverySpecAcceptanceCriteria` through `extractCreateStoryEpicDeliverySpecSection(storyBlock, "### Acceptance Criteria")`; return `false` if missing
    - require `normalizeInsignificantWhitespace(storySection) === normalizeInsignificantWhitespace(deliverySpecObjective)`
    - require `normalizeInsignificantWhitespace(acceptanceCriteriaSection) === normalizeInsignificantWhitespace(deliverySpecAcceptanceCriteria)`
    - return `true` only when every check above succeeds
  - Do not add any new helper file, parser module, placeholder mutation, deterministic state mutation, or Step 2 scaffold-building logic in this step.

- [x] Step 3: Add a dedicated `create-story.md` evaluator and wire it into deterministic dispatch
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts`
  - Immediately after the closing brace of `evaluateCreateEpicsStep(...)` at [deterministicPlaceholderProgression.ts:661](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L661) and before `evaluateWriteRemediationStoryStep(...)`, insert a new function named exactly:
    ```ts
    async function evaluateCreateStoryStep(args: {
    	taskState: TaskState
    	stepNumber: number
    	toolContext?: DeterministicPlaceholderToolContext
    }): Promise<DeterministicStepEvaluationResult>
    ```
  - Inside `evaluateCreateStoryStep(...)`, use `const placeholders = getMergedPlaceholderValues(args.taskState)`, then implement these exact branches:
    - `case 1`:
      - trim `epicDeliverySpec` from `placeholders.epic_delivery_spec`
      - trim `storyNumber` from `placeholders.story_number`
      - return `{ completed: false }` if either value is blank
      - resolve `epicDeliverySpec` through `resolveArtifactPlaceholderPath(placeholders, epicDeliverySpec)`
      - require `await fileExistsForPlaceholderWorkflowWriteProof(resolvedEpicDeliverySpecPath)` to be `true`
      - on success return:
        ```ts
        {
        	completed: true,
        	reason: "epic_delivery_spec resolves to an existing file path and story_number was already available in workflow placeholder state.",
        }
        ```
    - `case 2`:
      - call `await validateCreateStoryScaffoldAgainstEpicDeliverySpec({ placeholders })`
      - return `{ completed: false }` when it returns `false`
      - on success return:
        ```ts
        {
        	completed: true,
        	reason: "story_doc already exists in the canonical implementation-artifacts location, preserves the full story template heading set, and matches the selected story content from epic_delivery_spec.",
        }
        ```
    - `case 5`:
      - trim `storyDoc` from `placeholders.story_doc`
      - return `{ completed: false }` if blank
      - resolve `storyDoc` through `resolveArtifactPlaceholderPath(placeholders, storyDoc)`
      - load file text through `readFileIfExists(resolvedStoryDocPath)`; return `{ completed: false }` if missing
      - require `hasTopLevelStatusValue(storyDocText, ["ready-for-dev"])`
      - on success return:
        ```ts
        {
        	completed: true,
        	reason: "The story document now contains Status: ready-for-dev.",
        }
        ```
    - `default`:
      - return `{ completed: false }`
  - Do not read or use `toolContext` inside `evaluateCreateStoryStep(...)`.
  - Do not add `case 3` or `case 4`; those steps must remain evaluator-incomplete in this slice.
  - In [deterministicPlaceholderProgression.ts:876](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L876), update `evaluateDeterministicStep(...)` so `workflowName === "create-story.md"` dispatches to `evaluateCreateStoryStep(...)`.
  - Insert the new dispatch branch immediately after the existing `pi-planning.md` branch and before the existing `dev-story.md` branch.
  - Keep all existing explicit workflow branches intact. Do not route `create-story.md` through `evaluateDevStoryStep(...)`, `evaluatePiPlanningStep(...)`, or any grouped story-workflow helper.

- [x] Step 4: Add focused deterministic regression coverage for `create-story.md`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
  - In the support-gate test at [deterministicPlaceholderProgression.test.ts:51](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L51), add these two exact assertions immediately after the existing `pi-planning.md` assertion and before the existing `dev-story.md` assertion:
    ```ts
    expect(isDeterministicPlaceholderWorkflowSupported("create-story.md")).to.equal(true)
    expect(isDeterministicPlaceholderWorkflowSupported("create-story")).to.equal(false)
    ```
  - Immediately after the existing `does not deterministically complete pi-planning step 5 when setup placeholders and artifacts are already present` test ending at [deterministicPlaceholderProgression.test.ts:3174](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts#L3174) and before the final unsupported-workflow test, insert a new `create-story.md` test block with these exact test titles:
    - `it("completes create-story step 1 when epic_delivery_spec resolves to an existing file and story_number is non-empty", async () => { ... })`
    - `it("does not complete create-story step 1 when epic_delivery_spec is missing", async () => { ... })`
    - `it("does not complete create-story step 1 when story_number is blank after trimming", async () => { ... })`
    - `it("does not complete create-story step 1 when epic_delivery_spec resolves to a missing file", async () => { ... })`
    - `it("completes create-story step 2 when story_doc exists in implementation-artifacts with backlog status, all required headings, and matching selected story content", async () => { ... })`
    - `it("does not complete create-story step 2 when a required template heading is missing", async () => { ... })`
    - `it("does not complete create-story step 2 when the selected story block cannot be found in epic_delivery_spec", async () => { ... })`
    - `it("does not complete create-story step 2 when the story objective content differs from epic_delivery_spec", async () => { ... })`
    - `it("does not complete create-story step 2 when the acceptance criteria stub text remains", async () => { ... })`
    - `it("does not complete create-story step 2 when story_doc is outside output_folder/implementation-artifacts", async () => { ... })`
    - `it("does not complete create-story step 2 when story_doc has Status: ready-for-dev", async () => { ... })`
    - `it("does not deterministically complete create-story step 3 when project structure notes are already populated", async () => { ... })`
    - `it("does not deterministically complete create-story step 4 when tasks and subtasks are already populated", async () => { ... })`
    - `it("completes create-story step 5 when story_doc contains Status: ready-for-dev", async () => { ... })`
    - `it("does not complete create-story step 5 when story_doc still contains Status: backlog", async () => { ... })`
    - `it("advances through create-story steps 1 and 2 in one deterministic pass when both are already provable", async () => { ... })`
  - Use these exact fixture conventions for the new block:
    - every new test uses `workflowName: "create-story.md"`
    - Step 1 workflow heading: `## Step 1:  (System-Owned) Resolve the target story`
    - Step 2 workflow heading: `## Step 2:  (System-Owned) Build Story Document Scaffold`
    - Step 3 workflow heading: `## Step 3: Author Story Context and Project Structure Notes`
    - Step 4 workflow heading: `## Step 4: Author Implementation-Ready Story Guidance`
    - Step 5 workflow heading: `## Step 5: Validate and finalize the story`
    - Step 1 success reason assertion: `"epic_delivery_spec resolves to an existing file path and story_number was already available in workflow placeholder state."`
    - Step 2 success reason assertion: `"story_doc already exists in the canonical implementation-artifacts location, preserves the full story template heading set, and matches the selected story content from epic_delivery_spec."`
    - Step 5 success reason assertion: `"The story document now contains Status: ready-for-dev."`
  - For the Step 1 success and missing-file tests:
    - create `epicDeliverySpecPath = path.join(tempDir, "output", "implementation-artifacts", "epic-3-delivery-spec.md")`
    - use checklist markdown:
      `- [ ] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold`
    - set `placeholderValues.epic_delivery_spec = path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md")`
    - set `placeholderValues.story_number = "3.2"` in the success and missing-file tests
    - in the success test, write the exact delivery-spec fixture to `epicDeliverySpecPath` with `writeFileWithMtime(...)`
    - in the success test, assert the checklist becomes:
      `- [x] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold`
    - in the success test, assert the last notice reason equals `"epic_delivery_spec resolves to an existing file path and story_number was already available in workflow placeholder state."`
    - in the missing-file test, do not create `epicDeliverySpecPath`
    - in the missing-file test, assert the checklist remains unchanged and notices stay empty
  - For the Step 1 missing-placeholder tests:
    - use checklist markdown:
      `- [ ] Step 1:  (System-Owned) Resolve the target story`
    - for `does not complete create-story step 1 when epic_delivery_spec is missing`, omit `placeholderValues.epic_delivery_spec` and keep `placeholderValues.story_number = "3.2"`
    - for `does not complete create-story step 1 when story_number is blank after trimming`, set `placeholderValues.epic_delivery_spec = "/tmp/epic-3-delivery-spec.md"` and `placeholderValues.story_number = "   "`
    - in both tests, assert the checklist remains unchanged and notices stay empty
  - For every new Step 1, Step 2, and Step 5 test that uses relative artifact paths:
    - set `stablePlaceholderValues.cwd = tempDir`
    - set `stablePlaceholderValues.project_root = tempDir`
    - set `placeholderValues.output_folder = "output"`
  - Use this exact epic-delivery-spec fixture body in every Step 2 and multi-step success test unless a failure case explicitly changes one surface:
    ```md
    # Epic Name

    ## Story 3.2

    ### Objective
    As a release manager,
    I want the story scaffold to inherit exactly the approved objective,
    so that the story starts from the right implementation intent.

    ### Acceptance Criteria
    1. The scaffold copies the approved objective into the story document.
    2. The scaffold copies the approved acceptance criteria without drift.

    ### Sequencing/ Dependencies
    Depends on Story 3.1
    ```
  - Use this exact passing story-doc fixture body in the Step 2 success test, the Step 5 backlog/ready tests, and the multi-step test unless a failure case explicitly changes one surface:
    ```md
    # Story 3.2: Placeholder Title

    Status: backlog

    ## Story

    As a release manager,
    I want the story scaffold to inherit exactly the approved objective,
    so that the story starts from the right implementation intent.

    ## Acceptance Criteria

    1. The scaffold copies the approved objective into the story document.
    2. The scaffold copies the approved acceptance criteria without drift.

    ## Tasks / Subtasks

    - [ ] Task 1 (AC: #)
      - [ ] Subtask 1.1

    ## Senior Developer QA Findings

    ## Dev Notes

    - Relevant architecture patterns and constraints

    ### Project Structure Notes

    - Alignment with unified project structure (paths, modules, naming)

    ### References

    - Cite all technical details with source paths and sections, e.g. [Source: docs/<file>.md#Section]

    ## Dev Agent Record

    ### Agent Model Used

    {{agent_model_name_version}}

    ### Debug Log References

    ### Completion Notes List

    ### File List
    ```
  - For the Step 2 success test, modify only the `## Story` and `## Acceptance Criteria` bodies to introduce insignificant whitespace differences:
    - add trailing spaces at line ends
    - keep paragraph spacing unchanged
    - keep the normalized content otherwise identical to the epic-delivery-spec fixture
  - For the Step 2 failure titled `does not complete create-story step 2 when a required template heading is missing`, remove exactly `### References` from the otherwise-passing story-doc fixture.
  - For the Step 2 failure titled `does not complete create-story step 2 when the selected story block cannot be found in epic_delivery_spec`, change the delivery-spec story heading to `## Story 9.9` and keep `story_number: "3.2"`.
  - For the Step 2 failure titled `does not complete create-story step 2 when the story objective content differs from epic_delivery_spec`, change only the first line inside `## Story` to `As a different stakeholder,`.
  - For the Step 2 failure titled `does not complete create-story step 2 when the acceptance criteria stub text remains`, replace the entire `## Acceptance Criteria` body with:
    ```md
    1. [Add acceptance criteria from epics/PRD]
    ```
  - For the Step 2 failure titled `does not complete create-story step 2 when story_doc is outside output_folder/implementation-artifacts`, write the otherwise-passing story-doc fixture to `path.join(tempDir, "output", "story-3-2.md")` while keeping `output_folder = "output"`.
  - For the Step 2 failure titled `does not complete create-story step 2 when story_doc has Status: ready-for-dev`, change only the top-level status line to `Status: ready-for-dev`.
  - For the Step 3 negative test:
    - use the otherwise-passing story-doc fixture plus a populated `### Project Structure Notes` section
    - keep checklist markdown as `- [ ] Step 3: Author Story Context and Project Structure Notes`
    - assert the checklist remains unchanged and `pendingAutoCompletedPlaceholderWorkflowStepNotices` stays empty
  - For the Step 4 negative test:
    - use the otherwise-passing story-doc fixture
    - replace the `## Tasks / Subtasks` body with fully populated checked tasks and subtasks
    - keep checklist markdown as `- [ ] Step 4: Author Implementation-Ready Story Guidance`
    - assert the checklist remains unchanged and `pendingAutoCompletedPlaceholderWorkflowStepNotices` stays empty
  - For the Step 5 success and backlog tests:
    - create `storyDocPath = path.join(tempDir, "output", "implementation-artifacts", "story3.2.md")`
    - use checklist markdown:
      `- [ ] Step 5: Validate and finalize the story`
    - set `placeholderValues.story_doc = path.join("output", "implementation-artifacts", "story3.2.md")`
    - in both tests, write the story-doc fixture to `storyDocPath` with `writeFileWithMtime(...)`
  - For the Step 5 success test:
    - change only the top-level status line to `Status: ready-for-dev`
    - assert the checklist becomes `- [x] Step 5: Validate and finalize the story`
    - assert the last notice reason equals `"The story document now contains Status: ready-for-dev."`
  - For the Step 5 backlog test:
    - keep the top-level status line as `Status: backlog`
    - assert the checklist remains unchanged and notices stay empty
  - For the multi-step deterministic pass test:
    - use checklist markdown:
      `- [ ] Step 1:  (System-Owned) Resolve the target story\n- [ ] Step 2:  (System-Owned) Build Story Document Scaffold\n- [ ] Step 3: Author Story Context and Project Structure Notes`
    - provide relative placeholder values:
      - `epic_delivery_spec: path.join("output", "implementation-artifacts", "epic-3-delivery-spec.md")`
      - `story_doc: path.join("output", "implementation-artifacts", "story3.2.md")`
      - `story_number: "3.2"`
      - `output_folder: "output"`
    - assert the final checklist becomes:
      `- [x] Step 1:  (System-Owned) Resolve the target story\n- [x] Step 2:  (System-Owned) Build Story Document Scaffold\n- [ ] Step 3: Author Story Context and Project Structure Notes`
    - assert `pendingAutoCompletedPlaceholderWorkflowStepNotices` has length 2 and its reasons are:
      1. `"epic_delivery_spec resolves to an existing file path and story_number was already available in workflow placeholder state."`
      2. `"story_doc already exists in the canonical implementation-artifacts location, preserves the full story template heading set, and matches the selected story content from epic_delivery_spec."`
  - Do not delete, reorder, or weaken any existing assertions for `create-epics.md`, `pi-planning.md`, `dev-story.md`, `write-remediation-story.md`, review workflows, or the final unsupported-workflow test.

- [x] Step 5: Update the canonical deterministic progression readme for `create-story.md`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md`
  - In the supported-workflow list at [deterministic-workflow-progression-readme.md:70](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L70), insert `create-story.md` immediately after `pi-planning.md` and before `dev-story.md`.
  - In the `Current evaluator examples` section at [deterministic-workflow-progression-readme.md:98](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L98), insert a new top-level bullet for `create-story.md` immediately after the existing `pi-planning.md` bullet and before the existing `review-adversarial-general.md` bullet with these exact sub-bullets:
    - `Step 1 completes when epic_delivery_spec resolves to an existing file path and story_number is already present in workflow placeholder state`
    - `Step 2 completes when story_doc exists under {output_folder}/implementation-artifacts, keeps Status: backlog, preserves every required template heading, and matches the selected epic-delivery-spec story content for the story body and acceptance criteria after insignificant whitespace normalization`
    - `Steps 3 and 4 are not evaluator-completed; they transition through workflow_progress_request`
    - `Step 5 completes when story_doc contains Status: ready-for-dev`
  - In the `Examples` section at [deterministic-workflow-progression-readme.md:176](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md#L176), insert these exact bullets immediately after the existing `pi-planning.md` examples and before the existing `review-adversarial-general.md` example:
    - `In create-story.md, if epic_delivery_spec already resolves to an existing file and story_number is already present, Step 1 can complete immediately on the next deterministic pass.`
    - `In create-story.md, if story_doc already exists under {output_folder}/implementation-artifacts with Status: backlog, keeps every required template heading, and its story body plus acceptance criteria match the selected delivery-spec story after insignificant whitespace normalization, Step 2 can auto-complete.`
    - `In create-story.md, Steps 3 and 4 do not auto-complete from document state alone because they are governed by workflow_progress_request.`
    - `In create-story.md, if story_doc now contains Status: ready-for-dev, Step 5 can auto-complete.`
  - Do not modify [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md), [contextual-tool-schema.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/contextual-tool-schema.md), or any create-story workflow doc in this step.

- [x] Step 6: Run the focused deterministic progression verification and stop after the prescribed checks pass
  - Allowed files:
    - none
  - Run these commands in order:
    1. `npm run test:unit -- src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts`
    2. `npx tsc --noEmit`
    3. `rg -n '"create-story.md"|Status: backlog|Status: ready-for-dev|CREATE_STORY_REQUIRED_TEMPLATE_HEADINGS|evaluateCreateStoryStep|workflow_progress_request' src/core/task docs/workflows docs/workflow-automation/create-story`
  - If the unit test or TypeScript check fails because a prescribed `create-story.md` assertion, reason string, helper name, or heading check was missed, fix only the files listed in Steps 1 through 5 and rerun the failed command.
  - If a failure requires edits outside the files listed in Steps 1 through 5, stop and ask the user before proceeding.
  - After all three commands pass, do not make any additional cleanup edits in workflow forms, contextual tool configuration, workflow completion automation, or non-canonical docs as part of this plan.
