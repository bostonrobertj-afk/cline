- Read this plan from top to bottom before making any changes.
- Read each task and subtask in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.
  - After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.

# Prompt Canonicalization Action Plan

## Requirement Trace

This plan implements the runtime revisions identified in:

- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/module-patches/prompt-canonicalization-runtime-revisions.md`

The approved backing requirements and guide language are in:

- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/brainstorming/brainstorming-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/code-review/code-review-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/correct-course/correct-course-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/create-epics-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/dev-story/dev-story-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/pi-planning-requirements.md`

Exact source-document AI-facing prompt prose for source-derived prompt corrections was verified in:

- `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md`
- `/Users/robertboston/Documents/Cline/Workflows/create-epics.md`
- `/Users/robertboston/Documents/Cline/Workflows/pi-planning.md`

Canonical runtime prompt construction requirements for this plan:

- AI-facing prompt constants contain AI-facing text only.
- Readable multiline template literal constants are required for full AI-agent prompt templates.
- Full prompt bodies must not be encoded as one-line strings with `\n` escape sequences.
- `String.raw` must not be used for workflow prompt templates unless requirements explicitly require literal backslash preservation.
- Conditional AI-agent prompt content must use section assembly in `buildPromptSource(...)`.
- Source-document authoring markers such as `Conditional prompting`, `conditional prompt`, `Shown only if`, and `end conditional` must not appear in runtime prompt constants or rendered AI-facing prompt output.
- Optional prompt sections must be included only when their backing workflow value exists and is non-empty.
- Runtime-generated prompt content must be assembled separately from source-authored static prose and must not be listed in `promptTemplates`.
- Prompt tests must use shape and invariant assertions, not exact editable prose assertions.

## Task 1: Acceptance Audit Review Prompt Formatting

- [ ] Subtask 1.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/acceptanceAuditReviewWorkflow.ts`, replace `ACCEPTANCE_AUDIT_REVIEW_STEP_2_PROMPT` with a readable multiline template literal. Preserve the exact rendered AI-facing text and every `{workflow.target_story}`, `{workflow.epics_document}`, `{workflow.architecture_document}`, `{workflow.review_scope_manifest}`, `{workflow.review_commit_hash}`, `{workflow.review_commit_parent}`, and `{workflow.acceptance_audit_output}` token. Do not change `buildStep2PromptSource()`. Do not change `promptTemplates: [ACCEPTANCE_AUDIT_REVIEW_STEP_2_PROMPT]`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/acceptanceAuditReviewWorkflow.ts`

## Task 2: Blind Review Prompt Formatting

- [ ] Subtask 2.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`, replace `BLIND_REVIEW_STEP_2_PROMPT = [ ... ].join("\n")` with `const BLIND_REVIEW_STEP_2_PROMPT = \`...\`` as a readable multiline template literal. Preserve the exact rendered AI-facing text and every `{workflow.review_commit_hash}`, `{workflow.review_commit_parent}`, and `{workflow.blind_review_output}` token. Do not change `buildStep2PromptSource()`. Do not change `promptTemplates: [BLIND_REVIEW_STEP_2_PROMPT]`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`

## Task 3: Brainstorming Step 3 Prompt Source

- [ ] Subtask 3.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`, replace the contents of existing constants `STEP_3_SHARED_FACILITATION_PROMPT`, `BRAINSTORMING_STEP_3_SUGGEST_PROMPT_TEMPLATE`, and `BRAINSTORMING_STEP_3_STANDARD_PROMPT_TEMPLATE` with the exact requirements-backed prompt text below. Preserve the existing two-variant prompt structure; do not replace it with new section constants.

```ts
const STEP_3_SHARED_FACILITATION_PROMPT = `Goal: Guide an interactive brainstorming session from setup through technique selection, idea capture, and final organization, pausing whenever user input or confirmation is needed.

- Engage the user in interactive brainstorming using the selected approach.
- Keep the user in control at each decision point. Pause for clarification, a technique switch, or continuation whenever needed. Record \`techniques_used\` and \`ideas_generated\` in \`{workflow.output_file}\` as needed.
- The goal is to generate as many ideas as possible without exhausting the user.
- Techniques for keeping brainstorming going: ask probing questions, ask users how the current idea connects to an earlier idea, offer challenges to the user's idea or assumptions, offer new ideas or angles to keep the conversation going.

Once the user indicates they're ready, use \`workflow_progress_request\` to confirm and unlock the next workflow step.`

const BRAINSTORMING_STEP_3_SUGGEST_PROMPT_TEMPLATE = `Read \`{workflow.output_file}\`.

Call \`get_brainstorming_methods\` to retrieve the list of supported brainstorming methods. Select a brainstorming technique that seems appropriate based on the topic indicated in \`{workflow.output_file}\`. Propose the selected technique to the user.

After the user accepts the proposed technique, call \`append_brainstorming_selected_technique\` with the accepted technique name, description, and category/id when available. Do not call \`set_workflow_values\` for \`selected_techniques\`.

Then use governed file-edit tools to replace the \`user requested technique suggestion\` line under the \`selected techniques\` heading in \`{workflow.output_file}\` with the accepted technique name and description.

After the accepted technique has been appended and reflected in \`{workflow.output_file}\`, continue with the shared brainstorming facilitation instructions below.

${STEP_3_SHARED_FACILITATION_PROMPT}`

const BRAINSTORMING_STEP_3_STANDARD_PROMPT_TEMPLATE = `Read \`{workflow.output_file}\`.

Use the already selected brainstorming technique recorded in \`{workflow.output_file}\`.

${STEP_3_SHARED_FACILITATION_PROMPT}`
```

Do not add topic refinement, goal refinement, or the text `Offer challenges to to`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

- [ ] Subtask 3.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`, preserve the existing two-variant selection method by replacing the body of `buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` with this exact branch-selection shape:

```ts
	const selectedApproach = readSelectedApproach(input.session.workflowValues)

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate:
			selectedApproach === BrainstormingSelectedApproach.Suggest
				? BRAINSTORMING_STEP_3_SUGGEST_PROMPT_TEMPLATE
				: BRAINSTORMING_STEP_3_STANDARD_PROMPT_TEMPLATE,
	}
```

Do not perform local workflow-value substitution in this function.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

- [ ] Subtask 3.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`, keep Step 3 `promptTemplates` as the two complete prompt variants, exactly:

```ts
[
	BRAINSTORMING_STEP_3_SUGGEST_PROMPT_TEMPLATE,
	BRAINSTORMING_STEP_3_STANDARD_PROMPT_TEMPLATE,
]
```

No imports are added or removed by this subtask.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`

- [ ] Subtask 3.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts`, inside test `builds Step 3 prompt and tool variants and routes workflow progress decisions`, add these exact assertions after `expect(suggestPrompt).to.include(OUTPUT_FILE)`:

```ts
			expect(suggestPrompt).to.include("Goal: Guide an interactive brainstorming session")
			expect(suggestPrompt).to.include("Call `get_brainstorming_methods`")
			expect(suggestPrompt).to.include("call `append_brainstorming_selected_technique`")
			expect(suggestPrompt).to.include("Do not call `set_workflow_values` for `selected_techniques`.")
			expect(suggestPrompt).to.include("replace the `user requested technique suggestion` line")
			expect(suggestPrompt).to.include("Engage the user in interactive brainstorming using the selected approach.")
		expect(suggestPrompt).to.include("Keep the user in control at each decision point.")
		expect(suggestPrompt).to.include("Record `techniques_used` and `ideas_generated`")
		expect(suggestPrompt).to.include("generate as many ideas as possible without exhausting the user")
		expect(suggestPrompt).not.to.include("Help the user to refine their topic and goals")
		expect(suggestPrompt).not.to.include("Offer challenges to to")
```

Add these exact assertions after `expect(choosePrompt).to.include(OUTPUT_FILE)`:

```ts
		expect(choosePrompt).to.include("Goal: Guide an interactive brainstorming session")
		expect(choosePrompt).to.include("Use the already selected brainstorming technique recorded")
		expect(choosePrompt).not.to.include("Call `get_brainstorming_methods`")
		expect(choosePrompt).not.to.include("call `append_brainstorming_selected_technique`")
		expect(choosePrompt).to.include("Engage the user in interactive brainstorming using the selected approach.")
		expect(choosePrompt).to.include("Keep the user in control at each decision point.")
		expect(choosePrompt).to.include("Record `techniques_used` and `ideas_generated`")
		expect(choosePrompt).to.include("generate as many ideas as possible without exhausting the user")
		expect(choosePrompt).not.to.include("Help the user to refine their topic and goals")
		expect(choosePrompt).not.to.include("Offer challenges to to")
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts`

## Task 4: Code Review Conditional Prompt Sections

- [ ] Subtask 4.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, update `CODE_REVIEW_STEP_4_UPSTREAM_FAILURE_PROMPT` by deleting only these marker lines from the template literal:
  - `*** Conditional prompting: Runtime must assess the findings in the code-review-output document. If any findings are present under "upstream failure", then the following prompt must be shown: ***`
  - `*** end conditional prompt block ***`

Preserve the remaining AI-facing upstream-failure text and `{workflow.architecture_document}` and `{workflow.epics_document}` tokens exactly.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

- [ ] Subtask 4.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, update `CODE_REVIEW_STEP_4_REMEDIATION_STORY_PROMPT` by deleting only these marker lines from the template literal:
  - `*** Conditional prompting: shown only if a remediation story was generated: ***`
  - `*** End conditional prompt block ***`

Preserve the remaining AI-facing remediation-story text and every `{workflow.architecture_document}`, `{workflow.epics_document}`, `{workflow.target_story}`, and `{workflow.remediation_story}` token exactly.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

- [ ] Subtask 4.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, add these constants immediately after `CODE_REVIEW_STEP_2_INITIAL_PROMPT`:

```ts
const CODE_REVIEW_STEP_2_MISSING_SUBAGENT_OUTPUT_HEADER =
	"These subagent output files were not found in the project's review folder:"

const CODE_REVIEW_STEP_2_MISSING_SUBAGENT_OUTPUT_INSTRUCTION =
	"Please launch a new subagent and assign them to the workflow associated with the missing file."
```

No imports are added or removed by this subtask.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

- [ ] Subtask 4.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, replace the missing-output branch return in `buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` with this exact section-assembly shape:

```ts
	const promptSections = [
		CODE_REVIEW_STEP_2_MISSING_SUBAGENT_OUTPUT_HEADER,
		missingSubagentOutputFiles.join("\n"),
		CODE_REVIEW_STEP_2_MISSING_SUBAGENT_OUTPUT_INSTRUCTION,
	]

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: promptSections.join("\n"),
	}
```

Do not add the generated `missingSubagentOutputFiles.join("\n")` value to `promptTemplates`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

- [ ] Subtask 4.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, update Step 2 `promptTemplates` from `[CODE_REVIEW_STEP_2_INITIAL_PROMPT]` to exactly:

```ts
[
	CODE_REVIEW_STEP_2_INITIAL_PROMPT,
	CODE_REVIEW_STEP_2_MISSING_SUBAGENT_OUTPUT_HEADER,
	CODE_REVIEW_STEP_2_MISSING_SUBAGENT_OUTPUT_INSTRUCTION,
]
```

Do not change Step 4 `promptTemplates`; it must remain exactly `[CODE_REVIEW_STEP_4_BASE_PROMPT, CODE_REVIEW_STEP_4_UPSTREAM_FAILURE_PROMPT, CODE_REVIEW_STEP_4_REMEDIATION_STORY_PROMPT]`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`

- [ ] Subtask 4.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`, in test `routes Step 2 after child-output discovery and projects missing-output prompts`, after `expect(missingPrompt).to.include("blind-review-1-1.md")`, add these exact assertions:

```ts
		expect(missingPrompt).to.include("These subagent output files were not found in the project's review folder:")
		expect(missingPrompt).to.include(
			"Please launch a new subagent and assign them to the workflow associated with the missing file.",
		)
		expect(missingPrompt.indexOf("These subagent output files were not found")).to.be.lessThan(
			missingPrompt.indexOf("blind-review-1-1.md"),
		)
		expect(missingPrompt.indexOf("blind-review-1-1.md")).to.be.lessThan(
			missingPrompt.indexOf("Please launch a new subagent"),
		)
		expect(missingPrompt).not.to.include("Conditional prompting")
		expect(missingPrompt).not.to.include("end conditional prompt block")
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

- [ ] Subtask 4.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`, in test `builds non-empty Step 4 prompts and materializes code-review and remediation paths conditionally`, add these exact assertions after `expect(upstreamPrompt).not.to.equal(basePrompt)`:

```ts
		expect(upstreamPrompt).to.include("For findings listed under \"upstream failure\"")
		expect(upstreamPrompt).not.to.include("You'll now prepare a remediation story based on the documented review findings.")
```

Add these exact assertions after `expect(remediationPrompt).to.include(remediationStory)`:

```ts
		expect(remediationPrompt).to.include("For findings listed under \"upstream failure\"")
		expect(remediationPrompt).to.include("You'll now prepare a remediation story based on the documented review findings.")
```

Inside the existing `for (const prompt of [basePrompt, upstreamPrompt, remediationPrompt])` loop, add these exact assertions before `expectNoCodeReviewWorkflowPromptTokens(prompt)`:

```ts
			expect(prompt).not.to.include("Conditional prompting")
			expect(prompt).not.to.include("end conditional prompt block")
			expect(prompt).not.to.include("End conditional prompt block")
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts`

## Task 5: Correct Course Step 3 Section Assembly

- [ ] Subtask 5.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts`, replace `const CORRECT_COURSE_STEP_3_PROMPT_TEMPLATE: string = String.raw\`...\`` with four readable multiline template literal constants named exactly:
  - `CORRECT_COURSE_STEP_3_BASE_PROMPT_TEMPLATE`
  - `CORRECT_COURSE_STEP_3_EPIC_SOURCE_PROMPT_TEMPLATE`
  - `CORRECT_COURSE_STEP_3_STORY_SOURCE_PROMPT_TEMPLATE`
  - `CORRECT_COURSE_STEP_3_FINAL_PROMPT_TEMPLATE`

The base constant must contain the existing AI-facing text from the start of the current `CORRECT_COURSE_STEP_3_PROMPT_TEMPLATE` through `- review files including documented findings from implemented stories which have been assessed via the code review workflow`, preserving existing workflow tokens.

The epic-source constant must be exactly:

```ts
const CORRECT_COURSE_STEP_3_EPIC_SOURCE_PROMPT_TEMPLATE = `Discovered while authoring a specific epic: {workflow.epic_source_indicator}
Epic: {workflow.epic_source_identifier}
Epic Document: {workflow.epics_document}`
```

The story-source constant must be exactly:

```ts
const CORRECT_COURSE_STEP_3_STORY_SOURCE_PROMPT_TEMPLATE = `Discovered while authoring, implementing, or reviewing a specific story: {workflow.story_source_indicator}
Story: {workflow.story_source_identifier}`
```

The final constant must contain the existing AI-facing text from `Define the core problem and assign it to one of the following categories:` through the end of the current prompt, preserving existing workflow tokens.

Do not include `*** conditional`, `*** end conditional ***`, `String.raw`, or `: string = String.raw` in any replacement constant.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts`

- [ ] Subtask 5.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts`, delete these constants and helpers:
  - `CORRECT_COURSE_EPIC_CONDITIONAL_START`
  - `CORRECT_COURSE_EPIC_CONDITIONAL_END`
  - `CORRECT_COURSE_STORY_CONDITIONAL_START`
  - `CORRECT_COURSE_STORY_CONDITIONAL_END`
  - `removeDelimitedBlock(...)`
  - `removeConditionalMarkers(...)`

No imports are added or removed by this subtask.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts`

- [ ] Subtask 5.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts`, replace the body of `buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` with this exact section-assembly shape:

```ts
	const promptSections = [CORRECT_COURSE_STEP_3_BASE_PROMPT_TEMPLATE]

	if (input.session.workflowValues[CorrectCourseWorkflowValueKey.EpicSourceIndicator] === "yes") {
		promptSections.push(CORRECT_COURSE_STEP_3_EPIC_SOURCE_PROMPT_TEMPLATE)
	}

	if (input.session.workflowValues[CorrectCourseWorkflowValueKey.StorySourceIndicator] === "yes") {
		promptSections.push(CORRECT_COURSE_STEP_3_STORY_SOURCE_PROMPT_TEMPLATE)
	}

	promptSections.push(CORRECT_COURSE_STEP_3_FINAL_PROMPT_TEMPLATE)

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: promptSections.join("\n\n"),
	}
```

Do not perform local workflow-value substitution in this function.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts`

- [ ] Subtask 5.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts`, update Step 3 `promptTemplates` from `[CORRECT_COURSE_STEP_3_PROMPT_TEMPLATE]` to exactly:

```ts
[
	CORRECT_COURSE_STEP_3_BASE_PROMPT_TEMPLATE,
	CORRECT_COURSE_STEP_3_EPIC_SOURCE_PROMPT_TEMPLATE,
	CORRECT_COURSE_STEP_3_STORY_SOURCE_PROMPT_TEMPLATE,
	CORRECT_COURSE_STEP_3_FINAL_PROMPT_TEMPLATE,
]
```

Remove any now-unused `CORRECT_COURSE_STEP_3_PROMPT_TEMPLATE` reference.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts`

- [ ] Subtask 5.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts`, rename test `includes Step 3 conditional blocks only when source indicators are yes` to `includes Step 3 conditional sections only when source indicators are yes`. Inside that test, after the existing `expect(fullPrompt).to.include("Discovered while authoring, implementing, or reviewing a specific story:")`, add these exact assertions:

```ts
		expect(fullPrompt).not.to.include("*** conditional")
		expect(fullPrompt).not.to.include("*** end conditional ***")
```

After the existing `expect(noEpicPrompt).to.include("Discovered while authoring, implementing, or reviewing a specific story:")`, add:

```ts
		expect(noEpicPrompt).not.to.include("*** conditional")
		expect(noEpicPrompt).not.to.include("*** end conditional ***")
```

After the existing `expect(noStoryIndicatorPrompt).not.to.include("Discovered while authoring, implementing, or reviewing a specific story:")`, add:

```ts
		expect(noStoryIndicatorPrompt).not.to.include("*** conditional")
		expect(noStoryIndicatorPrompt).not.to.include("*** end conditional ***")
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts`

## Task 6: Create Architecture Step 9 Prompt Formatting

- [ ] Subtask 6.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, reformat `STEP_9_EXISTING_DOCUMENT_HEADER_PROMPT`, `STEP_9_EXISTING_DOCUMENT_BODY_PROMPT`, `STEP_9_NEW_DOCUMENT_REVIEW_PROMPT`, and `STEP_9_FINAL_PROMPT` as readable multiline template literal constants. Preserve the exact rendered AI-facing text and every `{workflow.projectTitle}`, `{workflow.projectFolderName}`, `{workflow.output_file}`, and `{workflow.change_plan}` token. Do not change `STEP_9_CHANGE_PLAN_PROMPT_LINE`. Do not change `buildStep9PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource`. Do not change Step 9 `promptTemplates`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

## Task 7: Create Epics Step 2 Optional Context Sections

- [ ] Subtask 7.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`, add `WorkflowPromptBuilderInput` to the existing import from `../../types`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

- [ ] Subtask 7.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`, replace `CREATE_EPICS_STEP_2_PROMPT_TEMPLATE` with these exact named section constants. These constants split the existing Step 2 AI-facing prompt into canonical prompt sections without changing its required stable instructions.

```ts
const CREATE_EPICS_STEP_2_REQUIRED_CONTEXT_PROMPT = `Read \`{workflow.output_file}\`.
Read \`{workflow.architecture_document}\`.`

const CREATE_EPICS_STEP_2_BRAINSTORMING_CONTEXT_PROMPT = "Read `{workflow.brainstorming_document}` when present."

const CREATE_EPICS_STEP_2_ADDITIONAL_CONTEXT_PROMPT =
	"Read any files listed in `{workflow.additional_context_files}` when present."

const CREATE_EPICS_STEP_2_BODY_PROMPT = `Read any other files provided within \`{workflow.output_file}\` as additional context, including files listed under Additional Context when useful.

Identify the work necessary to deliver the project based on the architecture document.

Provide your understanding of the necessary work to the user and confirm alignment before drafting epics.

Break the project into epics by coherent capability outcomes, not by files, layers, or implementation chores.

Ensure each epic delivers one testable outcome, groups requirements that change together, has clear dependencies and completion criteria, and is small enough to implement through a focused set of downstream stories.

Split epics that contain multiple independent outcomes or major lifecycle transitions.

Sequence epics by dependency order with aid from the architecture document.

Avoid epics that are only \`backend\`, \`frontend\`, or \`tests\` unless that is genuinely the user-facing capability boundary.

Call \`upsert_epic\` for each user-aligned epic. Use \`upsert_epic\` to persist every accepted epic and every accepted revision. Do not use \`apply_patch\`, \`build_workflow_document\`, \`set_workflow_values\`, or raw markdown editing for epic creation or revision.

Do not draft stories, tasks, subtasks, acceptance criteria, action plans, implementation checklists, delivery specs, or downstream implementation plans.

Notify the user and ask them to review the drafted epics.

Revise epics through \`upsert_epic\` as needed based on user feedback.

After the user indicates alignment with the drafted epics, use \`attempt_completion\` to provide a final recap and remind the user to run the \`pi-planning\` workflow for each epic to define that epic's user stories.`
```

Do not add epic markdown-formatting instructions. Do not change `when present` to `when useful` in the optional context section constants.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

- [ ] Subtask 7.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`, replace `function buildStep2PromptSource(): WorkflowStepPromptSource` with this exact signature and section-assembly body:

```ts
function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const promptSections = [CREATE_EPICS_STEP_2_REQUIRED_CONTEXT_PROMPT]
	const brainstormingDocument = input.session.workflowValues[CreateEpicsWorkflowValueKey.BrainstormingDocument]
	const additionalContextFiles = input.session.workflowValues[CreateEpicsWorkflowValueKey.AdditionalContextFiles]

	if (typeof brainstormingDocument === "string" && brainstormingDocument.trim().length > 0) {
		promptSections.push(CREATE_EPICS_STEP_2_BRAINSTORMING_CONTEXT_PROMPT)
	}

	if (typeof additionalContextFiles === "string" && additionalContextFiles.trim().length > 0) {
		promptSections.push(CREATE_EPICS_STEP_2_ADDITIONAL_CONTEXT_PROMPT)
	}

	promptSections.push(CREATE_EPICS_STEP_2_BODY_PROMPT)

	return { kind: "current_step_instruction_template", currentStepInstructionTemplate: promptSections.join("\n\n") }
}
```

Do not perform local workflow-value substitution in this function.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

- [ ] Subtask 7.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`, update Step 2 `promptTemplates` from `[CREATE_EPICS_STEP_2_PROMPT_TEMPLATE]` to exactly:

```ts
[
	CREATE_EPICS_STEP_2_REQUIRED_CONTEXT_PROMPT,
	CREATE_EPICS_STEP_2_BRAINSTORMING_CONTEXT_PROMPT,
	CREATE_EPICS_STEP_2_ADDITIONAL_CONTEXT_PROMPT,
	CREATE_EPICS_STEP_2_BODY_PROMPT,
]
```

Remove any now-unused `CREATE_EPICS_STEP_2_PROMPT_TEMPLATE` reference.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

- [ ] Subtask 7.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`, in test `builds the Step 2 prompt and exposes only the approved model-facing tools`, preserve the existing assertions:

```ts
			expect(prompt).to.include("Read `/tmp/create-epics-project/discovery/brainstorming.md` when present.")
			expect(prompt).to.include("Read any files listed in `/tmp/create-epics-project/research.md` when present.")
```

Then add these exact assertions after those assertions:

```ts
			expect(prompt).to.include("Call `upsert_epic` for each user-aligned epic.")
			expect(prompt).to.include("Use `upsert_epic` to persist every accepted epic and every accepted revision.")
			expect(prompt).to.include(
				"Do not draft stories, tasks, subtasks, acceptance criteria, action plans, implementation checklists, delivery specs, or downstream implementation plans.",
			)
			expect(prompt).to.include("After the user indicates alignment with the drafted epics, use `attempt_completion`")
```

Do not change tool-name assertions in this test.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

- [ ] Subtask 7.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`, after test `builds the Step 2 prompt and exposes only the approved model-facing tools`, add a new test named `omits Step 2 optional context instructions when optional context values are absent` that builds the Step 2 prompt with exactly:

```ts
	it("omits Step 2 optional context instructions when optional context values are absent", () => {
		const step2 = createEpicsWorkflowDefinition.steps["step-2"]
		const workflowValues: WorkflowValues = {
			output_file: OUTPUT_FILE,
			architecture_document: "/tmp/create-epics-project/planning/architecture.md",
		}
		const promptSource = step2.buildPromptSource(createPromptInput(step2, workflowValues))
		if (promptSource.kind !== "current_step_instruction_template") {
			throw new Error("Missing current step instruction template for step-2.")
		}
		const prompt = renderWorkflowPromptTemplate({
			template: promptSource.currentStepInstructionTemplate,
			workflowValueKeys: createEpicsWorkflowDefinition.workflowValueKeys,
			workflowValues,
			context: "create-epics step-2 optional context absent test prompt",
		})

		expect(prompt).to.include(`Read \`${OUTPUT_FILE}\`.`)
		expect(prompt).to.include("Read `/tmp/create-epics-project/planning/architecture.md`.")
		expect(prompt).not.to.include("brainstorming.md")
		expect(prompt).not.to.include("research.md")
		expect(prompt).not.to.include("{workflow.brainstorming_document}")
		expect(prompt).not.to.include("{workflow.additional_context_files}")
	})
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

- [ ] Subtask 7.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`, after the test added in Subtask 7.6, add a new test named `renders each Step 2 optional context instruction only when its value is present` with this exact body:

```ts
	it("renders each Step 2 optional context instruction only when its value is present", () => {
		const step2 = createEpicsWorkflowDefinition.steps["step-2"]
		const renderStep2Prompt = (workflowValues: WorkflowValues, context: string): string => {
			const promptSource = step2.buildPromptSource(createPromptInput(step2, workflowValues))
			if (promptSource.kind !== "current_step_instruction_template") {
				throw new Error("Missing current step instruction template for step-2.")
			}
			return renderWorkflowPromptTemplate({
				template: promptSource.currentStepInstructionTemplate,
				workflowValueKeys: createEpicsWorkflowDefinition.workflowValueKeys,
				workflowValues,
				context,
			})
		}

		const brainstormingOnlyPrompt = renderStep2Prompt(
			{
				output_file: OUTPUT_FILE,
				architecture_document: "/tmp/create-epics-project/planning/architecture.md",
				brainstorming_document: "/tmp/create-epics-project/discovery/brainstorming.md",
			},
			"create-epics step-2 brainstorming-only test prompt",
		)
		const additionalContextOnlyPrompt = renderStep2Prompt(
			{
				output_file: OUTPUT_FILE,
				architecture_document: "/tmp/create-epics-project/planning/architecture.md",
				additional_context_files: "/tmp/create-epics-project/research.md",
			},
			"create-epics step-2 additional-context-only test prompt",
		)

			expect(brainstormingOnlyPrompt).to.include("Read `/tmp/create-epics-project/discovery/brainstorming.md` when present.")
			expect(brainstormingOnlyPrompt).not.to.include("research.md")
			expect(additionalContextOnlyPrompt).to.include("Read any files listed in `/tmp/create-epics-project/research.md` when present.")
			expect(additionalContextOnlyPrompt).not.to.include("brainstorming.md")
	})
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

## Task 8: Create Story Prompt Marker Regression Coverage

- [ ] Subtask 8.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`, inside `expectNoCreateStoryWorkflowPromptTokens(prompt: string): void`, after the existing raw workflow-token loop, add these exact assertions:

```ts
	expect(prompt).not.to.include("*** Shown only if")
	expect(prompt).not.to.include("*** end conditional prompt block ***")
```

Do not change `createStoryWorkflow.ts`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts`

## Task 9: Dev Story Step 2 Generated Current Task Section

- [ ] Subtask 9.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`, replace `DEV_STORY_STEP_2_PROMPT_TEMPLATE` with these exact constants. Preserve the static AI-facing Step 2 prompt text and separate the generated current-task detail from the static prompt template.

```ts
const DEV_STORY_STEP_2_STATIC_PROMPT_TEMPLATE = `You are tasked with implementing a story with a prescribed set of tasks and subtasks. You will be provided with the story's instructions and frontmatter, then will be provided with the assigned tasks one at a time. Once you've completed all subtasks for the provided task you will be provided with the next task.
You will use the following tools to manage your progress while implementing this story:
- story_task_complete: call this tool to mark a subtask complete. The tool will automatically mark a task complete once you complete all of it's subtasks.
- request_task_detail: call this tool to request the detailed instructions for a given task ID. This info is automatically provided when a task is completed and a new task is unlocked, but you can use this tool if you need the system to re-send that information at any time.
- show_incomplete_tasks: call this tool to request a list of incomplete tasks & subtasks. This tool does not provide detailed instructions; it only provides the list of tasks & subtasks with their IDs.

*** Story Frontmatter ***
General Instructions:
{workflow.story_general_instructions}

Objective:
{workflow.story_objective}

Scope:
{workflow.story_scope}

Scope Boundary:
{workflow.story_scope_boundary}

Requirements:
{workflow.story_requirements}

Known Issues/ Risks/ Technical Debt:
{workflow.story_issues}

**Continue task impelentation until instructed otherwise- when the final task is complete the next workflow step will unlock and further instructions will be provided.**

*** Current Story Task: ***`
const DEV_STORY_STEP_2_CURRENT_TASK_PROMPT_SEPARATOR = "\n"
```

Do not include `current_story_task`, `*** Conditional Prompting: ***`, or `*** end conditional prompting block ***` in either constant. Do not add `Complete only the task and subtasks provided to you in the current step instructions. Do not implement future tasks or subtasks until they are provided in a later message.`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

- [ ] Subtask 9.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`, replace the initial-branch return in `buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` with this exact shape:

```ts
		return {
			kind: "current_step_instruction_template",
			currentStepInstructionTemplate: [
				DEV_STORY_STEP_2_STATIC_PROMPT_TEMPLATE,
				currentTaskDetail,
			].join(DEV_STORY_STEP_2_CURRENT_TASK_PROMPT_SEPARATOR),
		}
```

Do not change the task-loop branch that returns only `currentTaskDetail`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

- [ ] Subtask 9.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`, update Step 2 `promptTemplates` from `[DEV_STORY_STEP_2_PROMPT_TEMPLATE]` to `[DEV_STORY_STEP_2_STATIC_PROMPT_TEMPLATE]`. Do not add generated `currentTaskDetail` to `promptTemplates`. Remove any now-unused `DEV_STORY_STEP_2_PROMPT_TEMPLATE` reference.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`

- [ ] Subtask 9.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts`, inside `expectNoDevStoryWorkflowPromptTokens(prompt: string): void`, after the existing raw workflow-token loop, add these exact assertions:

```ts
	expect(prompt).not.to.include("Conditional Prompting")
	expect(prompt).not.to.include("end conditional prompting block")
	expect(prompt).not.to.include("current_story_task")
```

Inside test `projects the initial full Step 2 prompt with current task detail`, after existing assertion `expect(prompt).to.include("  - [ ] Subtask 1.1: Update runtime contract")`, add these exact assertions:

```ts
		expect(prompt).to.include("You will use the following tools to manage your progress while implementing this story:")
		expect(prompt).to.include("- story_task_complete: call this tool to mark a subtask complete.")
		expect(prompt).to.include("- request_task_detail: call this tool to request the detailed instructions for a given task ID.")
		expect(prompt).to.include("- show_incomplete_tasks: call this tool to request a list of incomplete tasks & subtasks.")
		expect(prompt).to.include("*** Story Frontmatter ***")
		expect(prompt).to.include("General Instructions:")
		expect(prompt).to.include("Known Issues/ Risks/ Technical Debt:")
		expect(prompt).not.to.include("*** Story General Instructions: ***")
		expect(prompt).not.to.include("Complete only the task and subtasks provided to you in the current step instructions.")
```

Do not change task-loop route assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts`

## Task 10: PI Planning Step 2 Optional Context Sections

- [ ] Subtask 10.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, delete these constants:
  - `PI_PLANNING_STEP_2_WITH_BRAINSTORMING_AND_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_2_WITH_BRAINSTORMING_ONLY_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_2_WITH_ADDITIONAL_CONTEXT_ONLY_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_2_WITHOUT_OPTIONAL_CONTEXT_PROMPT_TEMPLATE`

Replace them with these exact named section constants:

```ts
const PI_PLANNING_STEP_2_INTRO_PROMPT_TEMPLATE = `Your goal in this workflow is to break a single epic down into deliverable user stories. In this step, you will prepare by reading relevant context. Do not begin generating stories in this step.

You will be focusing on \`{workflow.target_epic}\` during this workflow.`

const PI_PLANNING_STEP_2_PRIMARY_CONTEXT_PROMPT_TEMPLATE = `Primary Context:
- \`{workflow.epics_index}\`
- \`{workflow.epics_document}\`
- \`{workflow.architecture_document}\``

const PI_PLANNING_STEP_2_BRAINSTORMING_CONTEXT_PROMPT_TEMPLATE = `Secondary Context:
- \`{workflow.brainstorming_document}\``

const PI_PLANNING_STEP_2_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE = `Additional Context:
- \`{workflow.additional_context}\``

const PI_PLANNING_STEP_2_ASSESSMENT_PROMPT_TEMPLATE = `Assess the provided context for issues, guidance, scope, risks, or requirements relevant to \`{workflow.target_epic}\`, including:
- conflicts between the target epic and architecture decisions, constraints, components, data models, integrations, or deployment assumptions
- ambiguity in the epic objective, requirements, scope, or scope boundary
- missing architectural guidance needed to sequence or size stories
- missing dependencies, prerequisite capabilities, shared contracts, or validation expectations
- requirements in the epic that appear unsupported by the architecture document
- architecture decisions that imply work not captured in the target epic
- risks that would prevent coherent story breakdown, such as unclear ownership, incomplete external-system behavior, unresolved UX/data/API expectations, or contradictory constraints`

const PI_PLANNING_STEP_2_PROGRESS_PROMPT_TEMPLATE = `Do not silently resolve conflicts or fill gaps with assumptions. If you identify material conflicts, ambiguities, or missing information, summarize them for the user as questions or decisions needed before story drafting can begin.

If issues are minor and do not block story drafting, note them briefly and explain to the user how you will account for them during story decomposition.

Only proceed after the user has clarified blocking issues or confirmed that the current context is sufficient. At that point call workflow_progress_request to unlock the next workflow step's instructions.`
```

Do not include `not provided` in any replacement constant.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, replace the body of `buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` with this exact section-assembly shape:

```ts
	const promptSections = [PI_PLANNING_STEP_2_INTRO_PROMPT_TEMPLATE, PI_PLANNING_STEP_2_PRIMARY_CONTEXT_PROMPT_TEMPLATE]
	const brainstormingDocument = input.session.workflowValues[PiPlanningWorkflowValueKey.BrainstormingDocument]
	const additionalContext = input.session.workflowValues[PiPlanningWorkflowValueKey.AdditionalContext]

	if (typeof brainstormingDocument === "string" && brainstormingDocument.trim().length > 0) {
		promptSections.push(PI_PLANNING_STEP_2_BRAINSTORMING_CONTEXT_PROMPT_TEMPLATE)
	}

	if (typeof additionalContext === "string" && additionalContext.trim().length > 0) {
		promptSections.push(PI_PLANNING_STEP_2_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE)
	}

	promptSections.push(PI_PLANNING_STEP_2_ASSESSMENT_PROMPT_TEMPLATE, PI_PLANNING_STEP_2_PROGRESS_PROMPT_TEMPLATE)

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: promptSections.join("\n\n"),
	}
```

Do not perform local workflow-value substitution in this function.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, update Step 2 `promptTemplates` to exactly:

```ts
[
	PI_PLANNING_STEP_2_INTRO_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_2_PRIMARY_CONTEXT_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_2_BRAINSTORMING_CONTEXT_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_2_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_2_ASSESSMENT_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_2_PROGRESS_PROMPT_TEMPLATE,
]
```

Remove any references to the four deleted Step 2 full-prompt constants.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, in test `renders Step 2 through Step 5 prompts with required workflow value references and no backend-only tools`, after `expectNoPiPlanningWorkflowPromptTokens(prompt)`, add this exact conditional assertion block:

```ts
			if (promptExpectation.stepId === "step-2") {
				expect(prompt).to.include("Primary Context:")
				expect(prompt).to.include("Secondary Context:")
				expect(prompt).to.include("Additional Context:")
				expect(prompt).not.to.include("not provided")
			}
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

- [ ] Subtask 10.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, after test `renders Step 2 through Step 5 prompts with required workflow value references and no backend-only tools`, add a new test named `renders Step 2 optional context sections only when backing values are present`. The test must build these three prompts:
  - `brainstormingOnlyPrompt` from `{ ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.AdditionalContext]: "" }`
  - `additionalContextOnlyPrompt` from `{ ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.BrainstormingDocument]: "" }`
  - `noOptionalContextPrompt` from `{ ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.BrainstormingDocument]: "", [PiPlanningWorkflowValueKey.AdditionalContext]: "" }`

The test must assert exactly:

```ts
		expect(brainstormingOnlyPrompt).to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString())
		expect(brainstormingOnlyPrompt).not.to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString())
		expect(additionalContextOnlyPrompt).to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString())
		expect(additionalContextOnlyPrompt).not.to.include(
			SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString(),
		)
		expect(noOptionalContextPrompt).not.to.include(
			SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString(),
		)
		expect(noOptionalContextPrompt).not.to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString())
		for (const prompt of [brainstormingOnlyPrompt, additionalContextOnlyPrompt, noOptionalContextPrompt]) {
			expect(prompt).not.to.include("not provided")
			expectNoPiPlanningWorkflowPromptTokens(prompt)
		}
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

## Task 11: Static Guards And Validation

- [ ] Subtask 11.1. Run this exact focused unit-test command:

```sh
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/__tests__/acceptanceAuditReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts
```

Mark this subtask complete only if the command exits successfully.
  - Allowed files: none.

- [ ] Subtask 11.2. Run this exact static guard command and confirm it returns no matches:

```sh
! rg -n "Conditional prompting|conditional prompt|end conditional|not provided|String.raw|current_story_task|Offer challenges to to|Help the user to refine their topic and goals" src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts
```

Mark this subtask complete only if the command exits successfully.
  - Allowed files: none.

- [ ] Subtask 11.3. Run this exact typecheck command:

```sh
npm run check-types
```

Mark this subtask complete only if the command exits successfully.
  - Allowed files: none.

- [ ] Subtask 11.4. Run this exact lint command:

```sh
npm run lint
```

Mark this subtask complete only if the command exits successfully.
  - Allowed files: none.

- [ ] Subtask 11.5. Run this exact package command:

```sh
npm run package
```

Mark this subtask complete only if the command exits successfully.
  - Allowed files: none.

- [ ] Subtask 11.6. Run this exact scope-diff command:

```sh
git diff --name-only
```

Confirm the output contains only these tracked files:

```text
docs/workflows/workflow-runtime/workflow-modules/module-patches/prompt-canonicalization-action-plan.md
src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/acceptanceAuditReviewWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts
```

If any other file appears, stop and ask the user before proceeding.
  - Allowed files: none.

- [ ] Subtask 11.7. Run this exact untracked-file command:

```sh
git ls-files --others --exclude-standard
```

Confirm the output contains no untracked files except files in this exact directory:

```text
docs/workflows/workflow-runtime/workflow-modules/module-patches/
```

If any other untracked file appears, stop and ask the user before proceeding.
  - Allowed files: none.

## Compliance Matrix

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1 | module-build-guide Prompt Construction; runtime revisions acceptance-audit-review | `acceptanceAuditReviewWorkflow.ts` | `ACCEPTANCE_AUDIT_REVIEW_STEP_2_PROMPT`, `buildStep2PromptSource`, Step 2 `promptTemplates` | Step 2 returns `current_step_instruction_template` and existing test renders through `renderWorkflowPromptTemplate` | No imports/helpers removed; promptTemplates unchanged | 11.1, 11.3, 11.4, 11.5 |
| 2.1 | module-build-guide Prompt Construction; runtime revisions blind-review | `blindReviewWorkflow.ts` | `BLIND_REVIEW_STEP_2_PROMPT`, `buildStep2PromptSource`, Step 2 `promptTemplates` | Step 2 returns `current_step_instruction_template` and existing test renders through `renderWorkflowPromptTemplate` | No imports/helpers removed; promptTemplates unchanged | 11.1, 11.3, 11.4, 11.5 |
| 3.1-3.3 | brainstorming requirements Step 3; `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md`; module-build-guide Prompt Construction | `brainstormingWorkflow.ts` | `STEP_3_SHARED_FACILITATION_PROMPT`, `BRAINSTORMING_STEP_3_SUGGEST_PROMPT_TEMPLATE`, `BRAINSTORMING_STEP_3_STANDARD_PROMPT_TEMPLATE`, `buildStep3PromptSource`, `readSelectedApproach`, `BrainstormingSelectedApproach.Suggest` | Step 3 uses `WorkflowPromptBuilderInput`, `readSelectedApproach`, `BrainstormingSelectedApproach.Suggest`, and `current_step_instruction_template` | Existing two-variant prompt structure and Step 3 `promptTemplates` preserved; no local workflow-value substitution added | 3.4, 11.1, 11.2, 11.3, 11.4, 11.5 |
| 3.4 | brainstorming testing requirements | `brainstormingWorkflow.test.ts` | Existing test `builds Step 3 prompt and tool variants and routes workflow progress decisions` | Existing helper renders prompt through shared renderer | No imports added | 11.1 |
| 4.1-4.5 | code-review requirements Step 2 and Step 4; module-build-guide Prompt Construction | `codeReviewWorkflow.ts` | `CODE_REVIEW_STEP_2_MISSING_SUBAGENT_OUTPUT_HEADER`, `CODE_REVIEW_STEP_2_MISSING_SUBAGENT_OUTPUT_INSTRUCTION`, `CODE_REVIEW_STEP_4_UPSTREAM_FAILURE_PROMPT`, `CODE_REVIEW_STEP_4_REMEDIATION_STORY_PROMPT`, `buildStep2PromptSource`, `buildStep4PromptSource` | Step 2 missing-output content is generated runtime content; Step 4 already uses section assembly | Marker lines removed; Step 2 promptTemplates updated; generated missing list excluded from promptTemplates | 4.6, 4.7, 11.1, 11.2, 11.3, 11.4, 11.5 |
| 4.6-4.7 | code-review testing requirements | `codeReviewWorkflow.test.ts` | Existing `buildPrompt`, `expectNoCodeReviewWorkflowPromptTokens` | Existing prompt rendering helper uses shared renderer | No imports added | 11.1 |
| 5.1-5.4 | correct-course requirements Step 3; module-build-guide Prompt Construction | `correctCourseWorkflow.ts` | `CORRECT_COURSE_STEP_3_BASE_PROMPT_TEMPLATE`, `CORRECT_COURSE_STEP_3_EPIC_SOURCE_PROMPT_TEMPLATE`, `CORRECT_COURSE_STEP_3_STORY_SOURCE_PROMPT_TEMPLATE`, `CORRECT_COURSE_STEP_3_FINAL_PROMPT_TEMPLATE`, `buildStep3PromptSource` | Step 3 uses `WorkflowPromptBuilderInput` and declared workflow value enum keys | `String.raw`, marker constants, marker-removal helpers, and obsolete promptTemplate reference removed | 5.5, 11.1, 11.2, 11.3, 11.4, 11.5 |
| 5.5 | correct-course testing requirements | `correctCourseWorkflow.test.ts` | Existing test `includes Step 3 conditional blocks only when source indicators are yes` | Existing prompt rendering helper uses shared renderer | Test renamed to section terminology | 11.1 |
| 6.1 | create-architecture optional formatting cleanup; module-build-guide Prompt Construction | `createArchitectureWorkflow.ts` | `STEP_9_EXISTING_DOCUMENT_HEADER_PROMPT`, `STEP_9_EXISTING_DOCUMENT_BODY_PROMPT`, `STEP_9_NEW_DOCUMENT_REVIEW_PROMPT`, `STEP_9_FINAL_PROMPT` | `buildStep9PromptSource` already performs section assembly and Step 9 promptTemplates already list each section | No imports/helpers removed; promptTemplates unchanged | 11.1, 11.3, 11.4, 11.5 |
| 7.1-7.4 | create-epics requirements Step 2; `/Users/robertboston/Documents/Cline/Workflows/create-epics.md`; module-build-guide Prompt Construction | `createEpicsWorkflow.ts` | `WorkflowPromptBuilderInput`, `CREATE_EPICS_STEP_2_REQUIRED_CONTEXT_PROMPT`, `CREATE_EPICS_STEP_2_BRAINSTORMING_CONTEXT_PROMPT`, `CREATE_EPICS_STEP_2_ADDITIONAL_CONTEXT_PROMPT`, `CREATE_EPICS_STEP_2_BODY_PROMPT`, `buildStep2PromptSource` | Existing step builder accepts `WorkflowPromptBuilderInput` from runtime; prompt source returns `current_step_instruction_template` | Obsolete `CREATE_EPICS_STEP_2_PROMPT_TEMPLATE` removed; promptTemplates updated; stable `upsert_epic`, no-downstream-drafting, and `attempt_completion` instructions preserved | 7.5, 7.6, 7.7, 11.1, 11.3, 11.4, 11.5 |
| 7.5-7.7 | create-epics testing requirements | `createEpicsWorkflow.test.ts` | Existing Step 2 prompt test and shared renderer pattern | Existing test imports `WorkflowValues` and `renderWorkflowPromptTemplate` | No imports added | 11.1 |
| 8.1 | create-story requirements Step 2 and Step 3 marker exclusion | `createStoryWorkflow.test.ts` | `expectNoCreateStoryWorkflowPromptTokens` | Existing helper is used by Step 2, Step 3, and Step 4 prompt tests | No runtime edits; no imports added | 11.1 |
| 9.1-9.3 | dev-story requirements Step 2; module-build-guide Prompt Construction | `devStoryWorkflow.ts` | `DEV_STORY_STEP_2_STATIC_PROMPT_TEMPLATE`, `DEV_STORY_STEP_2_CURRENT_TASK_PROMPT_SEPARATOR`, `buildStep2PromptSource` | Existing task-loop branch returns generated `currentTaskDetail`; initial branch returns static prompt template plus generated content | Obsolete `DEV_STORY_STEP_2_PROMPT_TEMPLATE`, `current_story_task`, and marker prose removed; generated current task excluded from promptTemplates; required story progress tool instructions preserved | 9.4, 11.1, 11.2, 11.3, 11.4, 11.5 |
| 9.4 | dev-story testing requirements | `devStoryWorkflow.test.ts` | `expectNoDevStoryWorkflowPromptTokens` | Existing helper is used by initial and task-loop prompt tests | No imports added | 11.1 |
| 10.1-10.3 | pi-planning requirements Step 2; `/Users/robertboston/Documents/Cline/Workflows/pi-planning.md`; module-build-guide Prompt Construction | `piPlanningWorkflow.ts` | Step 2 section constants, `buildStep2PromptSource`, `PiPlanningWorkflowValueKey.BrainstormingDocument`, `PiPlanningWorkflowValueKey.AdditionalContext` | Existing runtime supplies `WorkflowPromptBuilderInput`; prompt source returns `current_step_instruction_template` | Four obsolete Step 2 full-prompt constants removed; `not provided` removed; Step 2 promptTemplates updated | 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5 |
| 10.4-10.5 | pi-planning testing requirements | `piPlanningWorkflow.test.ts` | Existing `buildPrompt`, `expectNoPiPlanningWorkflowPromptTokens`, `SAMPLE_WORKFLOW_VALUES` | Existing helper renders through shared prompt renderer | No imports added | 11.1 |
| 11.1-11.7 | module-build-guide validation expectations; action-plan-guide validation requirements | Validation commands | Exact test files and scripts verified in live repo | `npm run test:unit`, `npm run check-types`, `npm run lint`, `npm run package`, `git diff --name-only`, `git ls-files --others --exclude-standard` exist | Static guard and scope diff prescribed | 11.1-11.7 |
