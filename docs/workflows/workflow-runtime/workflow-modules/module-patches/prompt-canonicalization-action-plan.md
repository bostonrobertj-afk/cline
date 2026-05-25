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
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-architecture/create-architecture-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-epics/create-epics-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/dev-story/dev-story-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflows/workflow-runtime/workflow-modules/pi-planning/pi-planning-requirements.md`

Exact source-document AI-facing prompt prose for source-derived prompt corrections was verified in:

- `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md`
- `/Users/robertboston/Documents/Cline/Workflows/create-architecture.md`
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
const STEP_3_SHARED_FACILITATION_PROMPT = `You have been called inside a workflow to conduct an interactive brainstorming session from setup through technique selection, idea capture, and final organization, pausing whenever user input or confirmation is needed.

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
			expect(suggestPrompt).to.include("You have been called inside a workflow to conduct an interactive brainstorming session")
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
		expect(choosePrompt).to.include("You have been called inside a workflow to conduct an interactive brainstorming session")
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

## Task 6: Create Architecture Prompt Source Alignment

- [ ] Subtask 6.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, replace `STEP_3_PROMPT`, `STEP_4_PROMPT`, `STEP_5_PROMPT`, `STEP_6_PROMPT`, `STEP_7_PROMPT`, `STEP_8_PROMPT`, `STEP_9_EXISTING_DOCUMENT_HEADER_PROMPT`, `STEP_9_EXISTING_DOCUMENT_BODY_PROMPT`, `STEP_9_NEW_DOCUMENT_REVIEW_PROMPT`, and `STEP_9_FINAL_PROMPT` with these exact readable multiline template literal constants:

```ts
const STEP_3_PROMPT = `Review {workflow.output_file} and any additional files listed within it as relevant context.

If files were provided in the relevant context section, draft and propose content for the project context analysis section, then save it to {workflow.output_file} once the user approves.

Ensure that the scope, architectural goals, and core architectural rules are sufficient to enable completion of the remaining document sections. If the existing is vague, overly broad, or lacks sufficient detail, engage the user and guide them through improving the content of these sections until it is appropriate for a project architecture document and sufficient to act as a basis for the remaining document sections.

Once the scope, architectural goals, and core architectural rules sections are sufficient, draft and propose content for the interpretation section of the document to the user, and save it to {workflow.output_file} once the user approves.

Once you've saved user-approved content to the document's interpretation section, use workflow_progress_request to confirm and unlock the next workflow step.`

const STEP_4_PROMPT = `Guide the user through documenting the following sections of {workflow.output_file}:
- Responsibility Boundaries
- Durable vs Transient Ownership
- Required Additional Baseline for Authority Enforcement

Refer to relevant context, runtime code, and tests frequently to help keep things grounded in reality and ensure that the section's final content is comprehensive.

Once the user is aligned with this content, use workflow_progress_request to confirm and unlock the next workflow step.`

const STEP_5_PROMPT = `Inform the user that you will now assess current runtime code & tests to identify what existing code is aligned, partially aligned, and not aligned with the intended architecture, then do a thorough assessment of the repository and record your findings in {workflow.output_file} under the appropriate section headings.

Brief the user on your findings, answer any questions they have, make adjustments if needed, then use workflow_progress_request to unlock the next workflow step once the user approves the content you've added based on your code alignment assessment.`

const STEP_6_PROMPT = `Identify the key tradeoffs and risks based on the existing contents of {workflow.output_file}, performing additional code assessment if needed. Provide a proposed draft for the key tradeoffs and risks section of the document to the user, refine as needed based on their feedback, and save the final version under the appropriate document headings once the user approves.

Once the tradeoffs and risks sections are populated with user-approved content, use workflow_progress_request to unlock the next workflow step.`

const STEP_7_PROMPT = `Draft and propose a comprehensive blast radius for this project encompassing all files, modules, directories, shared components, and integration boundaries to the user, adjust based on their feedback, and save the approved content under the appropriate heading in {workflow.output_file}.

Once the blast radius section of the architecture document is populated with user-approved content, use workflow_progress_request to unlock the next workflow step.`

const STEP_8_PROMPT = `Identify the key dependencies that will matter during project implementation, provide them to the user, adjust based on their feedback, then save them in the dependencies section of {workflow.output_file}.

Next, build an implementation roadmap which establishes high-level project implementation sequencing based on the identified dependencies & blast radius. Provide the proposed draft to the user, adjust based on their feedback, then save it to the project roadmap section of {workflow.output_file}.

Once you've populated the dependencies and implementation roadmap sections of {workflow.output_file} with user-approved content, use workflow_progress_request to unlock the final workflow step.`

const STEP_9_EXISTING_DOCUMENT_HEADER_PROMPT = `You have been called inside a workflow focused on revising an existing architecture document within the following project:
- Project: {workflow.projectTitle}
- Project Folder: {workflow.projectFolderName}
- Architecture Document: {workflow.output_file}`

const STEP_9_CHANGE_PLAN_PROMPT_LINE = "- Change Management Plan: {workflow.change_plan}"

const STEP_9_EXISTING_DOCUMENT_BODY_PROMPT = `Steps 1-8 were automatically completed by the system.

Review the architecture document and any files listed in the "Relevant Context" section.
After reviewing, confirm the scope of revisions that the user wishes to make in the architecture document, then work with them to identify the correct revisions to the existing document and update {workflow.output_file} appropriately.`

const STEP_9_NEW_DOCUMENT_REVIEW_PROMPT = `Review the full architecture for coherence and pattern and structure alignment.
Classify any issues as critical, important, or minor.
If there are critical issues, present them and ask how the user wants to resolve them before implementation. If there are important or minor issues, present them as refinements and ask whether to address them now.`

const STEP_9_FINAL_PROMPT =
	`When finished, present a short completion summary using attempt_completion and explain that the architecture document is now the technical source of truth and is ready to inform the create-epics workflow.`
```

Do not change `buildStep3PromptSource()`, `buildStep4PromptSource()`, `buildStep5PromptSource()`, `buildStep6PromptSource()`, `buildStep7PromptSource()`, `buildStep8PromptSource()`, `buildStep9PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource`, or Step 3 through Step 9 `promptTemplates`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`

- [ ] Subtask 6.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`, in test `renders Step 3 through Step 8 prompt sources with output_file and required section instructions`, replace the `promptExpectations` constant with this exact array:

```ts
		const promptExpectations: readonly PromptExpectation[] = [
			{
				stepId: "step-3",
				requiredSnippets: [
					`Review ${OUTPUT_FILE} and any additional files listed within it as relevant context.`,
					"project context analysis section",
					"If the existing is vague",
					"interpretation section",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-4",
				requiredSnippets: [
					`Guide the user through documenting the following sections of ${OUTPUT_FILE}:`,
					"Responsibility Boundaries",
					"Durable vs Transient Ownership",
					"Required Additional Baseline for Authority Enforcement",
					"runtime code, and tests frequently",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-5",
				requiredSnippets: [
					"Inform the user that you will now assess current runtime code & tests",
					"aligned, partially aligned, and not aligned",
					`record your findings in ${OUTPUT_FILE}`,
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-6",
				requiredSnippets: [
					`Identify the key tradeoffs and risks based on the existing contents of ${OUTPUT_FILE}`,
					"performing additional code assessment if needed",
					"key tradeoffs and risks section",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-7",
				requiredSnippets: [
					"Draft and propose a comprehensive blast radius for this project",
					"all files, modules, directories, shared components, and integration boundaries",
					`save the approved content under the appropriate heading in ${OUTPUT_FILE}`,
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-8",
				requiredSnippets: [
					"Identify the key dependencies that will matter during project implementation",
					"identified dependencies & blast radius",
					`project roadmap section of ${OUTPUT_FILE}`,
					"workflow_progress_request",
				],
			},
		]
```

In test `renders the Step 9 new-document prompt without existing-document values`, after `expect(prompt).not.to.equal("")`, add these exact assertions:

```ts
		expect(prompt).to.include("Review the full architecture for coherence and pattern and structure alignment.")
		expect(prompt).to.include("When finished, present a short completion summary using attempt_completion")
```

In test `renders the Step 9 existing-document prompt without a change plan`, after `expect(prompt).not.to.equal("")`, add these exact assertions:

```ts
		expect(prompt).to.include("You have been called inside a workflow focused on revising an existing architecture document within the following project:")
		expect(prompt).to.include("Steps 1-8 were automatically completed by the system.")
		expect(prompt).to.include("Review the architecture document and any files listed in the \"Relevant Context\" section.")
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts`

- [ ] Subtask 6.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, inside test `projects create-architecture current step details into the full-turn input payload only`, replace these current Step 3 prompt assertions:

```ts
			expect(workflowInputPayloadBlock).to.include(`Read \`${CREATE_ARCHITECTURE_OUTPUT_FILE}\`.`)
			expect(workflowInputPayloadBlock).to.include("Draft and propose content for Project Context Analysis")
```

with these exact assertions:

```ts
			expect(workflowInputPayloadBlock).to.include(
				`Review ${CREATE_ARCHITECTURE_OUTPUT_FILE} and any additional files listed within it as relevant context.`,
			)
			expect(workflowInputPayloadBlock).to.include("project context analysis section")
			expect(workflowInputPayloadBlock).to.include("If the existing is vague")
```

In the same test, replace these current `systemPrompt` negative assertions:

```ts
				expect(systemPrompt).to.not.include(`Read \`${CREATE_ARCHITECTURE_OUTPUT_FILE}\`.`)
				expect(systemPrompt).to.not.include("Draft and propose content for Project Context Analysis")
```

with these exact assertions:

```ts
				expect(systemPrompt).to.not.include(
					`Review ${CREATE_ARCHITECTURE_OUTPUT_FILE} and any additional files listed within it as relevant context.`,
				)
				expect(systemPrompt).to.not.include("project context analysis section")
				expect(systemPrompt).to.not.include("If the existing is vague")
```
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

## Task 7: Create Epics Step 2 Optional Context Sections

- [ ] Subtask 7.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts`, add this exact exported builder immediately after `buildCreateEpicsUpsertEpicToolSchema()`:

```ts
export function buildCreateEpicsApplyPatchToolSchema(): ClineToolSpec {
	return {
		variant: CREATE_EPICS_TOOL_SCHEMA_VARIANT,
		id: ClineDefaultTool.APPLY_PATCH,
		name: "apply_patch",
		description: "Apply a structured patch to one or more files using the repository apply_patch format.",
		parameters: [
			{
				name: "input",
				required: true,
				type: "string",
				instruction: "The apply_patch command that you wish to execute.",
				description: "The apply_patch command that you wish to execute.",
			},
		],
	}
}
```

Then update `buildCreateEpicsStep2ToolSchemas()` so the returned array order is exactly:

```ts
[
	buildCreateEpicsReadFileToolSchema(),
	buildCreateEpicsUpsertEpicToolSchema(),
	buildCreateEpicsApplyPatchToolSchema(),
	buildCreateEpicsSendUserMessageToolSchema(),
	buildCreateEpicsAskFollowupQuestionToolSchema(),
	buildCreateEpicsAttemptCompletionToolSchema(),
]
```
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts`

- [ ] Subtask 7.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`, add `WorkflowPromptBuilderInput` to the existing import from `../../types`.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

- [ ] Subtask 7.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`, replace `CREATE_EPICS_STEP_2_PROMPT_TEMPLATE` with these exact named section constants. These constants preserve the source prompt verbiage and split only the optional read-list items required for canonical conditional assembly.

```ts
const CREATE_EPICS_STEP_2_REQUIRED_CONTEXT_PROMPT = `Read the following:
- \`{workflow.output_file}\`
- \`{workflow.architecture_document}\``

const CREATE_EPICS_STEP_2_BRAINSTORMING_CONTEXT_PROMPT = `- \`{workflow.brainstorming_document}\``

const CREATE_EPICS_STEP_2_ADDITIONAL_CONTEXT_PROMPT = `- \`{workflow.additional_context_files}\``

const CREATE_EPICS_STEP_2_BODY_PROMPT = `Identify the work necessary to deliver the project based on the provided architecture document. Provide your understanding of the necessary work to the user, confirm their alignment, then break the work down into a logical set of epics to guide project delivery.

Break the project into epics by coherent capability outcomes, not by files, layers, or implementation chores.

Each epic must:
- Deliver one testable outcome.
- Group requirements that change together.
- Have clear dependencies and completion criteria.
- Be small enough to implement through a focused set of stories; split epics that contain multiple independent outcomes or major lifecycle transitions.

Sequence epics by dependency order with aid from the provided architecture document:
1. Shared contracts/invariants.
2. Core runtime/backend behavior.
3. User-facing flows.
4. Prompt/tool/schema behavior.
5. Workflow/module consumers.
6. Cleanup, migration, and validation.

Do not create epics that are only “backend,” “frontend,” or “tests” unless that is genuinely the user-facing capability boundary.

Call \`upsert_epic\` for each user-aligned epic. Use \`upsert_epic\` to persist every accepted epic and every accepted revision.

Once you've drafted the epics, notify the user and ask them to review the drafted epics. Adjust as needed using \`apply_patch\` based on their feedback.

Once the user has indicated alignment with the drafted epics, use attempt_completion to provide a final recap and remind the user to run the pi-planning workflow for each epic to define the epics' user stories.`
```

Do not add read instructions outside the `Read the following:` list. Do not use double-quoted one-line string constants for these prompt sections.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

- [ ] Subtask 7.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`, replace `function buildStep2PromptSource(): WorkflowStepPromptSource` with this exact signature and section-assembly body:

```ts
function buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const contextLines = [CREATE_EPICS_STEP_2_REQUIRED_CONTEXT_PROMPT]
	const brainstormingDocument = input.session.workflowValues[CreateEpicsWorkflowValueKey.BrainstormingDocument]
	const additionalContextFiles = input.session.workflowValues[CreateEpicsWorkflowValueKey.AdditionalContextFiles]

	if (typeof brainstormingDocument === "string" && brainstormingDocument.trim().length > 0) {
		contextLines.push(CREATE_EPICS_STEP_2_BRAINSTORMING_CONTEXT_PROMPT)
	}

	if (typeof additionalContextFiles === "string" && additionalContextFiles.trim().length > 0) {
		contextLines.push(CREATE_EPICS_STEP_2_ADDITIONAL_CONTEXT_PROMPT)
	}

	const promptSections = [contextLines.join("\n"), CREATE_EPICS_STEP_2_BODY_PROMPT]

	return { kind: "current_step_instruction_template", currentStepInstructionTemplate: promptSections.join("\n\n") }
}
```

Do not perform local workflow-value substitution in this function.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`

- [ ] Subtask 7.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`, update Step 2 `promptTemplates` from `[CREATE_EPICS_STEP_2_PROMPT_TEMPLATE]` to exactly:

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

- [ ] Subtask 7.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsToolSchemas.test.ts`, update `STEP_2_TOOL_NAMES` to exactly:

```ts
const STEP_2_TOOL_NAMES = [
	"read_file",
	"upsert_epic",
	"apply_patch",
	"send_user_message",
	"ask_followup_question",
	"attempt_completion",
] as const
```

Then delete `"apply_patch"` from `FORBIDDEN_STEP_2_TOOL_NAMES`. Do not change the remaining forbidden tool names.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsToolSchemas.test.ts`

- [ ] Subtask 7.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`, in test `builds the Step 2 prompt and exposes only the approved model-facing tools`, replace the Step 2 prompt assertions from `expect(prompt).to.include(\`Read \`${OUTPUT_FILE}\`.\`)` through `expect(prompt).to.include("Do not use \`apply_patch\`, \`build_workflow_document\`, \`set_workflow_values\`")` with these exact assertions:

```ts
			expect(prompt).to.include("Read the following:")
			expect(prompt).to.include(`- \`${OUTPUT_FILE}\``)
			expect(prompt).to.include("- `/tmp/create-epics-project/planning/architecture.md`")
			expect(prompt).to.include("- `/tmp/create-epics-project/discovery/brainstorming.md`")
			expect(prompt).to.include("- `/tmp/create-epics-project/research.md`")
			expect(prompt).to.include(
				"Identify the work necessary to deliver the project based on the provided architecture document.",
			)
			expect(prompt).to.include("Each epic must:")
			expect(prompt).to.include("Sequence epics by dependency order with aid from the provided architecture document:")
			expect(prompt).to.include("Do not create epics that are only “backend,” “frontend,” or “tests”")
			expect(prompt).to.include("Use `upsert_epic` to persist every accepted epic and every accepted revision.")
			expect(prompt).to.include("Adjust as needed using `apply_patch` based on their feedback.")
			expect(prompt).to.include("use attempt_completion to provide a final recap")
```

In the same test, update the expected `step2ToolNames` array to exactly:

```ts
[
	"read_file",
	"upsert_epic",
	"apply_patch",
	"send_user_message",
	"ask_followup_question",
	"attempt_completion",
]
```

Then delete `"apply_patch"` from the forbidden tool-name loop. Do not change the remaining forbidden tool names.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

- [ ] Subtask 7.8. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`, after test `builds the Step 2 prompt and exposes only the approved model-facing tools`, add a new test named `omits Step 2 optional context instructions when optional context values are absent` that builds the Step 2 prompt with exactly:

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

			expect(prompt).to.include("Read the following:")
			expect(prompt).to.include(`- \`${OUTPUT_FILE}\``)
			expect(prompt).to.include("- `/tmp/create-epics-project/planning/architecture.md`")
			expect(prompt).not.to.include("brainstorming.md")
			expect(prompt).not.to.include("research.md")
		expect(prompt).not.to.include("{workflow.brainstorming_document}")
		expect(prompt).not.to.include("{workflow.additional_context_files}")
	})
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

- [ ] Subtask 7.9. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`, after the test added in Subtask 7.8, add a new test named `renders each Step 2 optional context instruction only when its value is present` with this exact body:

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

			expect(brainstormingOnlyPrompt).to.include("- `/tmp/create-epics-project/discovery/brainstorming.md`")
			expect(brainstormingOnlyPrompt).not.to.include("research.md")
			expect(additionalContextOnlyPrompt).to.include("- `/tmp/create-epics-project/research.md`")
			expect(additionalContextOnlyPrompt).not.to.include("brainstorming.md")
	})
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts`

- [ ] Subtask 7.10. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, inside test `projects active create-epics Step 2 tools into native GPT-5 prompts`, update the expected `nativeToolNames` array to exactly:

```ts
[
	"read_file",
	"upsert_epic",
	"apply_patch",
	"send_user_message",
	"ask_followup_question",
	"attempt_completion",
]
```

Then delete `expect(nativeToolNames).to.not.include("apply_patch")` from that test. Do not change the remaining forbidden-tool assertions.

In test `projects create-epics current step details into the full-turn input payload only`, replace the existing Step 2 prompt assertions from `expect(workflowInputPayloadBlock).to.include(\`Read \`${CREATE_EPICS_OUTPUT_FILE}\`.\`)` through the assertion for the `After the user indicates alignment...` sentence with these exact assertions:

```ts
				expect(workflowInputPayloadBlock).to.include("Read the following:")
				expect(workflowInputPayloadBlock).to.include(`- \`${CREATE_EPICS_OUTPUT_FILE}\``)
				expect(workflowInputPayloadBlock).to.include(`- \`${CREATE_EPICS_ARCHITECTURE_DOCUMENT}\``)
				expect(workflowInputPayloadBlock).to.include(`- \`${CREATE_EPICS_BRAINSTORMING_DOCUMENT}\``)
				expect(workflowInputPayloadBlock).to.include(`- \`${CREATE_EPICS_ADDITIONAL_CONTEXT_FILES}\``)
				expect(workflowInputPayloadBlock).to.include(
					"Identify the work necessary to deliver the project based on the provided architecture document.",
				)
				expect(workflowInputPayloadBlock).to.include("Each epic must:")
				expect(workflowInputPayloadBlock).to.include("Adjust as needed using `apply_patch` based on their feedback.")
				expect(workflowInputPayloadBlock).to.include("use attempt_completion to provide a final recap")
```

In the same test, replace the matching `systemPrompt` negative assertions for the old read/upsert/final recap snippets with these exact assertions:

```ts
					expect(systemPrompt).to.not.include("Read the following:")
					expect(systemPrompt).to.not.include(`- \`${CREATE_EPICS_OUTPUT_FILE}\``)
					expect(systemPrompt).to.not.include(
						"Identify the work necessary to deliver the project based on the provided architecture document.",
					)
					expect(systemPrompt).to.not.include("Adjust as needed using `apply_patch` based on their feedback.")
```
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

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

## Task 10: PI Planning Steps 2-5 Source Prompt Canonicalization

- [ ] Subtask 10.1. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, delete these constants:
  - `PI_PLANNING_STEP_2_WITH_BRAINSTORMING_AND_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_2_WITH_BRAINSTORMING_ONLY_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_2_WITH_ADDITIONAL_CONTEXT_ONLY_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_2_WITHOUT_OPTIONAL_CONTEXT_PROMPT_TEMPLATE`

Replace them with these exact named section constants:

```ts
const PI_PLANNING_STEP_2_BASE_PROMPT_TEMPLATE = `Your goal in this workflow is to break a single epic down into deliverable user stories. In this step, you will prepare by reading relevant context. Do not begin generating stories in this step.
You will be focusing on \`{workflow.target_epic}\` during this workflow.
*** Primary Context: ***
  \`{workflow.epics_index}\`
  \`{workflow.epics_document}\`
  \`{workflow.architecture_document}\``

const PI_PLANNING_STEP_2_SECONDARY_CONTEXT_HEADER_PROMPT_TEMPLATE = `*** Secondary Context ***`

const PI_PLANNING_STEP_2_BRAINSTORMING_CONTEXT_PROMPT_TEMPLATE = `  \`{workflow.brainstorming_document}\``

const PI_PLANNING_STEP_2_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE = `  \`{workflow.additional_context}\``

const PI_PLANNING_STEP_2_ASSESSMENT_PROMPT_TEMPLATE = `Assess the provided context for issues, guidance, scope, risks, or requirements relevant to \`{workflow.target_epic}\`, including:
- conflicts between the target epic and architecture decisions, constraints, components, data models, integrations, or deployment assumptions
- ambiguity in the epic objective, requirements, scope, or scope boundary
- missing architectural guidance needed to sequence or size stories
- missing dependencies, prerequisite capabilities, shared contracts, or validation expectations
- requirements in the epic that appear unsupported by the architecture document
- architecture decisions that imply work not captured in the target epic
- risks that would prevent coherent story breakdown, such as unclear ownership, incomplete external-system behavior, unresolved UX/data/API expectations, or contradictory constraints

Do not silently resolve conflicts or fill gaps with assumptions. If you identify material conflicts, ambiguities, or missing information, summarize them for the user as questions or decisions needed before story drafting can begin.

If issues are minor and do not block story drafting, note them briefly and explain to the user how you will account for them during story decomposition.

Only proceed after the user has clarified blocking issues or confirmed that the current context is sufficient. At that point call workflow_progress_request to unlock the next workflow step's instructions.`
```

Do not include `not provided` or `Additional Context` in any replacement constant. Do not split the intro and primary context into separate constants.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.2. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, delete these constants:
  - `PI_PLANNING_STEP_3_WITH_EXISTING_STORY_INDEX_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_3_WITHOUT_EXISTING_STORY_INDEX_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_4_WITH_EXISTING_STORY_INDEX_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_4_WITHOUT_EXISTING_STORY_INDEX_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_5_WITH_EXISTING_STORY_INDEX_PROMPT_TEMPLATE`
  - `PI_PLANNING_STEP_5_WITHOUT_EXISTING_STORY_INDEX_PROMPT_TEMPLATE`

Replace them with these exact named section constants:

```ts
const PI_PLANNING_STEP_3_EXISTING_STORY_INDEX_PROMPT_TEMPLATE = `Review the existing story files for this epic in {workflow.drafts_folder}.`

const PI_PLANNING_STEP_3_BODY_PROMPT_TEMPLATE = `Review provided context and existing runtime code/ tests to determine the full set of stories needed to support delivery of {workflow.target_epic}.

A story should represent one coherent, testable capability outcome. It may include backend, UI, prompt/schema, state, docs, and tests later, but only when those pieces are required to deliver the same outcome.

Split a story if:
- The objective contains multiple independent outcomes.
- One part can ship or be validated without the other.
- It crosses a major lifecycle boundary.
- It would need separate QA gates.
- Its requirements cannot be summarized clearly under one Objective.

Stories should not be created that are only file edits, test updates, cleanup chores, or technical layers unless that layer is itself the deliverable contract.

Once you've determined how many stories are needed, provide an update to the user explaining how many stories are needed, then call workflow_progress_request to unlock the next workflow step's instructions.`

const PI_PLANNING_STEP_4_EXISTING_STORY_INDEX_PROMPT_TEMPLATE = `This system uses a story index as the canonical indicator of which stories must exist for each epic.
Target epic: {workflow.target_epic}
Story Index: {workflow.stories_index}

Review the existing story index, then call plan_story_artifacts if additional stories are required beyond what the story index indicates. Use {workflow.epic_identity} when calling the tool. Indicate how many story files are needed to support delivery of {workflow.target_epic}. This tool will add additional stories to the existing story index when you indicate a number of stories greater than the index already contains. e.g. if a story index exists with three story files, and you call plan_story_artifacts and include story_count: 5, the tool will add 2 additional stories to the index so that it contains a total of 5 stories.

If the existing story index does not need additional stories added, use workflow_progress_request to unlock the next workflow step's instructions.`

const PI_PLANNING_STEP_4_NEW_STORY_INDEX_PROMPT_TEMPLATE = `This system uses a story index as the canonical indicator of which stories must exist for each epic. Generate the story index by calling plan_story_artifacts and including the total number of stories required in the story_count field. Use {workflow.epic_identity} when calling the tool.

Once you generate the story index, call set_workflow_values to set the generated file's full file path as the stories_index workflow session key.`

const PI_PLANNING_STEP_4_STORY_INDEX_LOCATION_PROMPT_TEMPLATE = `The story index file can be found in {workflow.implementation_folder}.`

const PI_PLANNING_STEP_5_EXISTING_STORY_INDEX_PROMPT_TEMPLATE = `Call generate_story_files to generate one templatized story for each story in {workflow.stories_index} for which a story file does not already exist. The tool automatically identifies stories with index entries for which there is not an existing story document and generates the files for you. Use {workflow.epic_identity} when calling the tool.`

const PI_PLANNING_STEP_5_NEW_STORY_INDEX_PROMPT_TEMPLATE = `Call generate_story_files to generate one templatized story file for each story in {workflow.stories_index}. Use {workflow.epic_identity} when calling the tool.`

const PI_PLANNING_STEP_5_STORY_FILES_LOCATION_PROMPT_TEMPLATE = `Generated story files can be found in {workflow.drafts_folder}.`
```

Do not include `Story-index branch`, `Story-file branch`, `An existing story index is present`, `no story index existed at workflow start`, `Shown only if`, or `end conditional prompt block` in any replacement constant.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.3. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, replace the body of `buildStep2PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` with this exact section-assembly shape:

```ts
	const promptSections = [PI_PLANNING_STEP_2_BASE_PROMPT_TEMPLATE]
	const secondaryContextLines: string[] = []
	const brainstormingDocument = input.session.workflowValues[PiPlanningWorkflowValueKey.BrainstormingDocument]
	const additionalContext = input.session.workflowValues[PiPlanningWorkflowValueKey.AdditionalContext]

	if (typeof brainstormingDocument === "string" && brainstormingDocument.trim().length > 0) {
		secondaryContextLines.push(PI_PLANNING_STEP_2_BRAINSTORMING_CONTEXT_PROMPT_TEMPLATE)
	}

	if (typeof additionalContext === "string" && additionalContext.trim().length > 0) {
		secondaryContextLines.push(PI_PLANNING_STEP_2_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE)
	}

	if (secondaryContextLines.length > 0) {
		promptSections.push([PI_PLANNING_STEP_2_SECONDARY_CONTEXT_HEADER_PROMPT_TEMPLATE, ...secondaryContextLines].join("\n"))
	}

	promptSections.push(PI_PLANNING_STEP_2_ASSESSMENT_PROMPT_TEMPLATE)

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: promptSections.join("\n\n"),
	}
```

Do not perform local workflow-value substitution in this function.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.4. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, replace the body of `buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` with this exact section-assembly shape:

```ts
	const storiesIndexExistedAtWorkflowStart =
		readWorkflowBooleanValue(input.session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) ===
		true
	const promptSections: string[] = []

	if (storiesIndexExistedAtWorkflowStart === true) {
		promptSections.push(PI_PLANNING_STEP_3_EXISTING_STORY_INDEX_PROMPT_TEMPLATE)
	}

	promptSections.push(PI_PLANNING_STEP_3_BODY_PROMPT_TEMPLATE)

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: promptSections.join("\n\n"),
	}
```

Do not perform local workflow-value substitution in this function.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.5. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, replace the body of `buildStep4PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` with this exact section-assembly shape:

```ts
	const storiesIndexExistedAtWorkflowStart =
		readWorkflowBooleanValue(input.session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) ===
		true
	const branchPromptTemplate =
		storiesIndexExistedAtWorkflowStart === true
			? PI_PLANNING_STEP_4_EXISTING_STORY_INDEX_PROMPT_TEMPLATE
			: PI_PLANNING_STEP_4_NEW_STORY_INDEX_PROMPT_TEMPLATE

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: [branchPromptTemplate, PI_PLANNING_STEP_4_STORY_INDEX_LOCATION_PROMPT_TEMPLATE].join(
			"\n\n",
		),
	}
```

Do not perform local workflow-value substitution in this function.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.6. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, replace the body of `buildStep5PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource` with this exact section-assembly shape:

```ts
	const storiesIndexExistedAtWorkflowStart =
		readWorkflowBooleanValue(input.session.workflowValues, PiPlanningWorkflowValueKey.StoriesIndexExistedAtWorkflowStart) ===
		true
	const branchPromptTemplate =
		storiesIndexExistedAtWorkflowStart === true
			? PI_PLANNING_STEP_5_EXISTING_STORY_INDEX_PROMPT_TEMPLATE
			: PI_PLANNING_STEP_5_NEW_STORY_INDEX_PROMPT_TEMPLATE

	return {
		kind: "current_step_instruction_template",
		currentStepInstructionTemplate: [branchPromptTemplate, PI_PLANNING_STEP_5_STORY_FILES_LOCATION_PROMPT_TEMPLATE].join(
			"\n\n",
		),
	}
```

Do not perform local workflow-value substitution in this function.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.7. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, update Step 2 `promptTemplates` to exactly:

```ts
[
	PI_PLANNING_STEP_2_BASE_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_2_SECONDARY_CONTEXT_HEADER_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_2_BRAINSTORMING_CONTEXT_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_2_ADDITIONAL_CONTEXT_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_2_ASSESSMENT_PROMPT_TEMPLATE,
]
```

Remove any references to the four deleted Step 2 full-prompt constants.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.8. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, update Step 3, Step 4, and Step 5 `promptTemplates` to exactly:

```ts
// step-3 promptTemplates
[
	PI_PLANNING_STEP_3_EXISTING_STORY_INDEX_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_3_BODY_PROMPT_TEMPLATE,
]

// step-4 promptTemplates
[
	PI_PLANNING_STEP_4_EXISTING_STORY_INDEX_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_4_NEW_STORY_INDEX_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_4_STORY_INDEX_LOCATION_PROMPT_TEMPLATE,
]

// step-5 promptTemplates
[
	PI_PLANNING_STEP_5_EXISTING_STORY_INDEX_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_5_NEW_STORY_INDEX_PROMPT_TEMPLATE,
	PI_PLANNING_STEP_5_STORY_FILES_LOCATION_PROMPT_TEMPLATE,
]
```

Remove any references to the six deleted Step 3, Step 4, and Step 5 full-prompt constants.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`

- [ ] Subtask 10.9. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, in `expectNoPiPlanningWorkflowPromptTokens(prompt: string): void`, append these exact entries to `forbiddenTokens` after `"{workflow.target_story}"`:

```ts
		"Shown only if",
		"end conditional prompt block",
		"Story-index branch",
		"Story-file branch",
		"An existing story index is present",
		"no story index existed at workflow start",
		"Additional Context:",
		"not provided",
```

In the same file, in test `renders Step 2 through Step 5 prompts with required workflow value references and no backend-only tools`, replace the existing `promptExpectations` array with this exact array:

```ts
		const promptExpectations: ReadonlyArray<{
			stepId: WorkflowStepDefinition["id"]
			requiredSnippets: readonly string[]
		}> = [
			{
				stepId: "step-2",
				requiredSnippets: [
					"Your goal in this workflow is to break a single epic down into deliverable user stories.",
					"Epic 1: Improve workflow runtime",
					"*** Primary Context: ***",
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicsIndex].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicsDocument].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ArchitectureDocument].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString(),
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-3",
				requiredSnippets: [
					"Review the existing story files for this epic in",
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.DraftsFolder].toString(),
					"Review provided context and existing runtime code/ tests to determine the full set of stories needed",
					"Split a story if:",
					"Stories should not be created that are only file edits, test updates, cleanup chores, or technical layers",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-4",
				requiredSnippets: [
					"This system uses a story index as the canonical indicator of which stories must exist for each epic.",
					"Epic 1: Improve workflow runtime",
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.StoriesIndex].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicIdentity].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.ImplementationFolder].toString(),
					"Review the existing story index, then call plan_story_artifacts",
					"The story index file can be found in",
					"workflow_progress_request",
				],
			},
			{
				stepId: "step-5",
				requiredSnippets: [
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.StoriesIndex].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.EpicIdentity].toString(),
					SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.DraftsFolder].toString(),
					"Call generate_story_files to generate one templatized story for each story in",
					"Generated story files can be found in",
				],
			},
		]
```

After `expectNoPiPlanningWorkflowPromptTokens(prompt)`, add this exact conditional assertion block:

```ts
				if (promptExpectation.stepId === "step-2") {
					expect(prompt).to.include("*** Primary Context: ***")
					expect(prompt).to.include("*** Secondary Context ***")
					expect(prompt).not.to.include("Additional Context:")
					expect(prompt).not.to.include("not provided")
				}
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

- [ ] Subtask 10.10. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, in test `uses stories_index_existed_at_workflow_start for Step 3 through Step 5 existing-index prompt branches`, replace the assertions from `expect(step3ExistingPrompt).to.include("An existing story index is present")` through `expect(step5NewPrompt).not.to.include("existing \`stories_index\` was present at workflow start")` with these exact assertions:

```ts
		expect(step3ExistingPrompt).to.include(
			`Review the existing story files for this epic in ${SAMPLE_WORKFLOW_VALUES[
				PiPlanningWorkflowValueKey.DraftsFolder
			].toString()}.`,
		)
		const step3NewPrompt = buildPrompt("step-3", storyIndexPresentButCreatedDuringWorkflowValues)
		expect(step3NewPrompt).not.to.include("Review the existing story files for this epic in")

		const step4ExistingPrompt = buildPrompt("step-4", existingIndexValues)
		expect(step4ExistingPrompt).to.include(
			`Story Index: ${SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.StoriesIndex].toString()}`,
		)
		expect(step4ExistingPrompt).to.include("Review the existing story index, then call plan_story_artifacts")
		const step4NewPrompt = buildPrompt("step-4", storyIndexPresentButCreatedDuringWorkflowValues)
		expect(step4NewPrompt).to.include("Generate the story index by calling plan_story_artifacts")
		expect(step4NewPrompt).not.to.include("Review the existing story index, then call plan_story_artifacts")

		const step5ExistingPrompt = buildPrompt("step-5", existingIndexValues)
		expect(step5ExistingPrompt).to.include(
			`Call generate_story_files to generate one templatized story for each story in ${SAMPLE_WORKFLOW_VALUES[
				PiPlanningWorkflowValueKey.StoriesIndex
			].toString()} for which a story file does not already exist.`,
		)
		const step5NewPrompt = buildPrompt("step-5", storyIndexPresentButCreatedDuringWorkflowValues)
		expect(step5NewPrompt).to.include("Call generate_story_files to generate one templatized story file for each story in")
		expect(step5NewPrompt).to.include(`${PROJECT_ROOT}/implementation/epic-1-stories.index.json`)
		expect(step5NewPrompt).not.to.include("for which a story file does not already exist")
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

- [ ] Subtask 10.11. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`, after test `renders Step 2 through Step 5 prompts with required workflow value references and no backend-only tools`, add a new test named `renders Step 2 optional context sections only when backing values are present`. The test must build these three prompts:
  - `brainstormingOnlyPrompt` from `{ ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.AdditionalContext]: "" }`
  - `additionalContextOnlyPrompt` from `{ ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.BrainstormingDocument]: "" }`
  - `noOptionalContextPrompt` from `{ ...SAMPLE_WORKFLOW_VALUES, [PiPlanningWorkflowValueKey.BrainstormingDocument]: "", [PiPlanningWorkflowValueKey.AdditionalContext]: "" }`

The test must assert exactly:

```ts
			expect(brainstormingOnlyPrompt).to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString())
			expect(brainstormingOnlyPrompt).not.to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString())
			expect(brainstormingOnlyPrompt).to.include("*** Secondary Context ***")
			expect(brainstormingOnlyPrompt).not.to.include("Additional Context:")
			expect(additionalContextOnlyPrompt).to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString())
			expect(additionalContextOnlyPrompt).not.to.include(
				SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString(),
			)
			expect(additionalContextOnlyPrompt).to.include("*** Secondary Context ***")
			expect(additionalContextOnlyPrompt).not.to.include("Additional Context:")
			expect(noOptionalContextPrompt).not.to.include(
				SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.BrainstormingDocument].toString(),
			)
			expect(noOptionalContextPrompt).not.to.include(SAMPLE_WORKFLOW_VALUES[PiPlanningWorkflowValueKey.AdditionalContext].toString())
			expect(noOptionalContextPrompt).not.to.include("*** Secondary Context ***")
			expect(noOptionalContextPrompt).not.to.include("Additional Context:")
			for (const prompt of [brainstormingOnlyPrompt, additionalContextOnlyPrompt, noOptionalContextPrompt]) {
				expect(prompt).not.to.include("not provided")
				expectNoPiPlanningWorkflowPromptTokens(prompt)
			}
```

Do not add exact full-prompt equality assertions.
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts`

- [ ] Subtask 10.12. In `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`, inside test `projects pi-planning current step details into the full-turn input payload only`, replace the three current Step 2 prompt assertions:

```ts
				expect(workflowInputPayloadBlock).to.include("Prepare to break a single epic down into deliverable user stories.")
				expect(workflowInputPayloadBlock).to.include(`Focus only on \`${PI_PLANNING_TARGET_EPIC}\`.`)
				expect(workflowInputPayloadBlock).to.include(
					`Read \`${PI_PLANNING_EPICS_INDEX}\`, \`${PI_PLANNING_EPICS_DOCUMENT}\`, and \`${PI_PLANNING_ARCHITECTURE_DOCUMENT}\`.`,
				)
```

with these exact assertions:

```ts
				expect(workflowInputPayloadBlock).to.include(
					"Your goal in this workflow is to break a single epic down into deliverable user stories. In this step, you will prepare by reading relevant context. Do not begin generating stories in this step.",
				)
				expect(workflowInputPayloadBlock).to.include(
					`You will be focusing on \`${PI_PLANNING_TARGET_EPIC}\` during this workflow.`,
				)
				expect(workflowInputPayloadBlock).to.include("*** Primary Context: ***")
				expect(workflowInputPayloadBlock).to.include(`  \`${PI_PLANNING_EPICS_INDEX}\``)
				expect(workflowInputPayloadBlock).to.include(`  \`${PI_PLANNING_EPICS_DOCUMENT}\``)
				expect(workflowInputPayloadBlock).to.include(`  \`${PI_PLANNING_ARCHITECTURE_DOCUMENT}\``)
```

In the same test, replace the matching three `systemPrompt` negative assertions with these exact assertions:

```ts
					expect(systemPrompt).to.not.include(
						"Your goal in this workflow is to break a single epic down into deliverable user stories.",
					)
					expect(systemPrompt).to.not.include(
						`You will be focusing on \`${PI_PLANNING_TARGET_EPIC}\` during this workflow.`,
					)
					expect(systemPrompt).to.not.include("*** Primary Context: ***")
```
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`

## Task 11: Static Guards And Validation

- [ ] Subtask 11.1. Run this exact focused unit-test command:

```sh
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/__tests__/acceptanceAuditReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/blind-review/__tests__/blindReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/brainstorming/__tests__/brainstormingWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/code-review/__tests__/codeReviewWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/correct-course/__tests__/correctCourseWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsToolSchemas.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts
```

Mark this subtask complete only if the command exits successfully.
  - Allowed files: none.

- [ ] Subtask 11.2. Run this exact static guard command and confirm it returns no matches:

```sh
! rg -n 'Conditional prompting|conditional prompt|Shown only if|end conditional|not provided|String.raw|(_PROMPT|_PROMPT_TEMPLATE)(: [^=]+)? = ".*\\n|\bcurrent_story_task\b|Offer challenges to to|Help the user to refine their topic and goals|Additional Context:|Story-index branch|Story-file branch|An existing story index is present|no story index existed at workflow start' src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/acceptanceAuditReviewWorkflow.ts src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts
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
src/core/task/workflow-runtime/workflow-modules/create-architecture/__tests__/createArchitectureWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsToolSchemas.ts
src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/create-epics/__tests__/createEpicsToolSchemas.test.ts
src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/dev-story/__tests__/devStoryWorkflow.test.ts
src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts
src/core/task/workflow-runtime/workflow-modules/pi-planning/__tests__/piPlanningWorkflow.test.ts
src/core/prompts/system-prompt/__tests__/integration.test.ts
```

If any other file appears, stop and ask the user before proceeding.
  - Allowed files: none.

- [ ] Subtask 11.7. Run this exact untracked-file command:

```sh
git ls-files --others --exclude-standard
```

Confirm the output is empty.

If any untracked file appears, stop and ask the user before proceeding.
  - Allowed files: none.

## Compliance Matrix

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| Task 1 | module-build-guide Prompt Construction; runtime revisions acceptance-audit-review | `acceptanceAuditReviewWorkflow.ts` | Task owns Subtask 1.1 | Live Step 2 prompt constant formatting verified | Subtask 1.1 prescribes no helper/import fallout | 11.1, 11.3, 11.4, 11.5 |
| 1.1 | module-build-guide Prompt Construction; runtime revisions acceptance-audit-review | `acceptanceAuditReviewWorkflow.ts` | `ACCEPTANCE_AUDIT_REVIEW_STEP_2_PROMPT`, `buildStep2PromptSource`, Step 2 `promptTemplates` | Step 2 returns `current_step_instruction_template` and existing test renders through `renderWorkflowPromptTemplate` | No imports/helpers removed; promptTemplates unchanged | 11.1, 11.3, 11.4, 11.5 |
| Task 2 | module-build-guide Prompt Construction; runtime revisions blind-review | `blindReviewWorkflow.ts` | Task owns Subtask 2.1 | Live Step 2 prompt constant formatting verified | Subtask 2.1 prescribes no helper/import fallout | 11.1, 11.3, 11.4, 11.5 |
| 2.1 | module-build-guide Prompt Construction; runtime revisions blind-review | `blindReviewWorkflow.ts` | `BLIND_REVIEW_STEP_2_PROMPT`, `buildStep2PromptSource`, Step 2 `promptTemplates` | Step 2 returns `current_step_instruction_template` and existing test renders through `renderWorkflowPromptTemplate` | No imports/helpers removed; promptTemplates unchanged | 11.1, 11.3, 11.4, 11.5 |
| Task 3 | brainstorming requirements Step 3 | `brainstormingWorkflow.ts`; `brainstormingWorkflow.test.ts` | Task owns Subtasks 3.1, 3.2, 3.3, and 3.4 | Live Step 3 branch builder, templates, and tests verified | Subtasks preserve two-variant structure and update prompt assertions | 11.1, 11.2, 11.3 |
| 3.1 | brainstorming requirements Step 3 | `brainstormingWorkflow.ts` | `STEP_3_SHARED_FACILITATION_PROMPT`, `BRAINSTORMING_STEP_3_SUGGEST_PROMPT_TEMPLATE`, `BRAINSTORMING_STEP_3_STANDARD_PROMPT_TEMPLATE` | Existing two-variant prompt constants are live in Step 3 | No imports/helpers removed | 3.4, 11.1, 11.2 |
| 3.2 | brainstorming requirements Step 3 | `brainstormingWorkflow.ts` | `buildStep3PromptSource`, `readSelectedApproach`, `BrainstormingSelectedApproach.Suggest` | Step 3 receives `WorkflowPromptBuilderInput` and returns `current_step_instruction_template` | No local workflow-value substitution added | 3.4, 11.1, 11.3 |
| 3.3 | brainstorming requirements Step 3 prompt template inventory | `brainstormingWorkflow.ts` | Step 3 `promptTemplates` | Step 3 templates are two complete branch templates | No imports added | 11.1, 11.3 |
| 3.4 | brainstorming testing requirements | `brainstormingWorkflow.test.ts` | Test `builds Step 3 prompt and tool variants and routes workflow progress decisions` | Existing helper renders through shared renderer | No imports added | 11.1 |
| Task 4 | code-review requirements Step 2 and Step 4 | `codeReviewWorkflow.ts`; `codeReviewWorkflow.test.ts` | Task owns Subtasks 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, and 4.7 | Live Step 2 generated-content branch and Step 4 conditional branches verified | Subtasks remove marker text and separate generated missing-output content | 11.1, 11.2, 11.3 |
| 4.1 | code-review requirements Step 4 upstream prompt | `codeReviewWorkflow.ts` | `CODE_REVIEW_STEP_4_UPSTREAM_FAILURE_PROMPT` | Step 4 branch appends upstream fragment conditionally | Marker-only lines removed | 4.7, 11.1, 11.2 |
| 4.2 | code-review requirements Step 4 remediation prompt | `codeReviewWorkflow.ts` | `CODE_REVIEW_STEP_4_REMEDIATION_STORY_PROMPT` | Step 4 branch appends remediation fragment conditionally | Marker-only lines removed | 4.7, 11.1, 11.2 |
| 4.3 | code-review generated missing-output content requirement | `codeReviewWorkflow.ts` | `CODE_REVIEW_STEP_2_MISSING_SUBAGENT_OUTPUT_HEADER`, `CODE_REVIEW_STEP_2_MISSING_SUBAGENT_OUTPUT_INSTRUCTION` | Step 2 missing-output static text is separated from generated file list | No imports added | 4.6, 11.1 |
| 4.4 | code-review Step 2 missing-output branch | `codeReviewWorkflow.ts` | `buildStep2PromptSource`, `missingSubagentOutputFiles` | Generated missing-file list remains runtime content | Generated list excluded from promptTemplates | 4.6, 11.1, 11.3 |
| 4.5 | code-review Step 2 prompt template inventory | `codeReviewWorkflow.ts` | Step 2 `promptTemplates` | Static templates only are listed | Generated missing list excluded | 11.1, 11.3 |
| 4.6 | code-review Step 2 tests | `codeReviewWorkflow.test.ts` | `missingPrompt` assertions | Existing helper renders through shared renderer | No imports added | 11.1 |
| 4.7 | code-review Step 4 tests | `codeReviewWorkflow.test.ts` | `basePrompt`, `upstreamPrompt`, `remediationPrompt` assertions | Existing helper renders through shared renderer | No imports added | 11.1 |
| Task 5 | correct-course requirements Step 3 | `correctCourseWorkflow.ts`; `correctCourseWorkflow.test.ts` | Task owns Subtasks 5.1, 5.2, 5.3, 5.4, and 5.5 | Live Step 3 monolithic prompt, marker helpers, and tests verified | Subtasks remove marker helpers and obsolete monolithic prompt | 11.1, 11.2, 11.3, 11.4 |
| 5.1 | correct-course requirements Step 3 source sections | `correctCourseWorkflow.ts` | `CORRECT_COURSE_STEP_3_BASE_PROMPT_TEMPLATE`, `CORRECT_COURSE_STEP_3_EPIC_SOURCE_PROMPT_TEMPLATE`, `CORRECT_COURSE_STEP_3_STORY_SOURCE_PROMPT_TEMPLATE`, `CORRECT_COURSE_STEP_3_FINAL_PROMPT_TEMPLATE` | Step 3 section constants replace monolithic `String.raw` prompt | Obsolete monolithic constant removed | 5.5, 11.1, 11.2 |
| 5.2 | correct-course marker helper cleanup | `correctCourseWorkflow.ts` | Marker constants, `removeDelimitedBlock`, `removeConditionalMarkers` | Section assembly removes need for marker stripping | Dead helpers/constants removed | 11.2, 11.3, 11.4 |
| 5.3 | correct-course Step 3 section assembly | `correctCourseWorkflow.ts` | `buildStep3PromptSource`, source indicator enum keys | Step 3 conditionally appends epic/story sections | No local workflow-value substitution added | 5.5, 11.1, 11.3 |
| 5.4 | correct-course Step 3 prompt template inventory | `correctCourseWorkflow.ts` | Step 3 `promptTemplates` | Every static section returned by builder is listed | Obsolete promptTemplate reference removed | 11.1, 11.3 |
| 5.5 | correct-course Step 3 tests | `correctCourseWorkflow.test.ts` | Test `includes Step 3 conditional sections only when source indicators are yes` | Existing prompt rendering helper covers each branch | Test terminology updated | 11.1 |
| Task 6 | create-architecture requirements Steps 3-9 | `createArchitectureWorkflow.ts`; `createArchitectureWorkflow.test.ts`; `integration.test.ts` | Task owns Subtasks 6.1, 6.2, and 6.3 | Live Step 3-9 prompt constants, module tests, and integration projection tests verified | Subtasks replace stale prompt snippets and keep builders unchanged | 11.1, 11.2 |
| 6.1 | create-architecture requirements Steps 3-9 source prompts | `createArchitectureWorkflow.ts` | `STEP_3_PROMPT` through `STEP_9_FINAL_PROMPT` | Existing Step 3-9 builders and promptTemplates consume these constants | No builder/promptTemplates changes prescribed | 6.2, 11.1, 11.2 |
| 6.2 | create-architecture prompt tests | `createArchitectureWorkflow.test.ts` | Step 3-8 `promptExpectations`; Step 9 branch tests | Existing `buildPrompt` renders through shared renderer | No imports added | 11.1 |
| 6.3 | create-architecture prompt integration fallout | `integration.test.ts` | Test `projects create-architecture current step details into the full-turn input payload only` | Full-turn payload and system prompt negative assertions match new Step 3 text | Stale Step 3 prompt projection assertions removed | 11.1 |
| Task 7 | create-epics requirements Step 2 | `createEpicsWorkflow.ts`; `createEpicsToolSchemas.ts`; `createEpicsWorkflow.test.ts`; `createEpicsToolSchemas.test.ts`; `integration.test.ts` | Task owns Subtasks 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, and 7.10 | Live Step 2 prompt, schema, tests, and integration projection verified | Subtasks add `apply_patch` schema and remove stale forbidden assertions | 11.1, 11.3 |
| 7.1 | create-epics requirements Step 2 tool schema | `createEpicsToolSchemas.ts` | `buildCreateEpicsApplyPatchToolSchema`, `buildCreateEpicsStep2ToolSchemas` | Step 2 schema order includes `apply_patch` after `upsert_epic` | No imports needed because `ClineDefaultTool` already imported | 7.6, 11.1, 11.3 |
| 7.2 | create-epics requirements Step 2 prompt builder input | `createEpicsWorkflow.ts` | `WorkflowPromptBuilderInput` import | Step 2 builder will accept runtime prompt-builder input | Import added | 11.3, 11.4 |
| 7.3 | create-epics requirements Step 2 source prompt | `createEpicsWorkflow.ts` | `CREATE_EPICS_STEP_2_REQUIRED_CONTEXT_PROMPT`, optional context line constants, `CREATE_EPICS_STEP_2_BODY_PROMPT` | Source prompt verbiage and optional list structure preserved | Obsolete full prompt constant replaced | 7.7, 7.8, 7.9, 11.1 |
| 7.4 | create-epics Step 2 conditional assembly | `createEpicsWorkflow.ts` | `buildStep2PromptSource`, `contextLines` | Optional list items append only when backing values are non-empty | No local workflow-value substitution added | 7.8, 7.9, 11.1 |
| 7.5 | create-epics prompt template inventory | `createEpicsWorkflow.ts` | Step 2 `promptTemplates` | Every static template/fragment returned by builder is listed | Obsolete promptTemplate reference removed | 11.1, 11.3 |
| 7.6 | create-epics tool-schema tests | `createEpicsToolSchemas.test.ts` | `STEP_2_TOOL_NAMES`, `FORBIDDEN_STEP_2_TOOL_NAMES` | Exact schema order assertion matches requirements | `apply_patch` removed from forbidden list | 11.1 |
| 7.7 | create-epics Step 2 prompt/schema test | `createEpicsWorkflow.test.ts` | Existing Step 2 prompt test; `step2ToolNames` | Prompt and schema assertions match source and tool requirements | `apply_patch` removed from forbidden loop | 11.1 |
| 7.8 | create-epics absent optional context test | `createEpicsWorkflow.test.ts` | New absent optional context test | Renderer receives Step 2 template and no optional values | No imports added | 11.1 |
| 7.9 | create-epics optional context branch test | `createEpicsWorkflow.test.ts` | New optional context branch test | Renderer covers brainstorming-only and additional-context-only branches | No imports added | 11.1 |
| 7.10 | create-epics prompt integration fallout | `integration.test.ts` | Create-epics native tool projection test; create-epics current-step payload test | Full-turn payload, tool list, and system prompt negative assertions match new Step 2 text/schema | Stale prompt projection and forbidden `apply_patch` assertions removed | 11.1 |
| Task 8 | create-story requirements prompt marker exclusion | `createStoryWorkflow.test.ts` | Task owns Subtask 8.1 | Live prompt-token helper verified | Subtask adds marker regression assertions only | 11.1 |
| 8.1 | create-story requirements Step 2 and Step 3 marker exclusion | `createStoryWorkflow.test.ts` | `expectNoCreateStoryWorkflowPromptTokens` | Existing helper is used by Step 2, Step 3, and Step 4 prompt tests | No runtime edits; no imports added | 11.1 |
| Task 9 | dev-story requirements Step 2 static/generated separation | `devStoryWorkflow.ts`; `devStoryWorkflow.test.ts` | Task owns Subtasks 9.1, 9.2, 9.3, and 9.4 | Live Step 2 static prompt, current-task generated detail, and tests verified | Subtasks remove obsolete marker/current-task placeholder from static template | 11.1, 11.2, 11.3 |
| 9.1 | dev-story requirements Step 2 static prompt | `devStoryWorkflow.ts` | `DEV_STORY_STEP_2_STATIC_PROMPT_TEMPLATE`, `DEV_STORY_STEP_2_CURRENT_TASK_PROMPT_SEPARATOR` | Static prompt excludes generated current task and marker prose | Obsolete marker prose not copied | 9.4, 11.1, 11.2 |
| 9.2 | dev-story Step 2 initial branch assembly | `devStoryWorkflow.ts` | `buildStep2PromptSource`, `currentTaskDetail` | Initial branch returns static template plus generated task detail | Task-loop branch preserved | 9.4, 11.1, 11.3 |
| 9.3 | dev-story Step 2 prompt template inventory | `devStoryWorkflow.ts` | Step 2 `promptTemplates` | Static template only is listed | Obsolete prompt constant removed | 11.1, 11.3 |
| 9.4 | dev-story testing requirements | `devStoryWorkflow.test.ts` | `expectNoDevStoryWorkflowPromptTokens`, Step 2 initial prompt test | Existing helper covers initial and task-loop prompt tests | No imports added | 11.1 |
| Task 10 | pi-planning requirements Steps 2-5 | `piPlanningWorkflow.ts`; `piPlanningWorkflow.test.ts`; `integration.test.ts` | Task owns Subtasks 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, and 10.12 | Live Step 2-5 prompt constants, builders, templates, tests, and integration projection verified | Subtasks remove obsolete full-prompt constants and stale branch-label assertions | 11.1, 11.2, 11.3 |
| 10.1 | pi-planning requirements Step 2 source prompt sections | `piPlanningWorkflow.ts` | `PI_PLANNING_STEP_2_BASE_PROMPT_TEMPLATE`, secondary context constants, `PI_PLANNING_STEP_2_ASSESSMENT_PROMPT_TEMPLATE` | One base section, one conditional secondary context block, one assessment section | Four obsolete Step 2 full-prompt constants removed; no `Additional Context` label | 10.9, 10.11, 10.12, 11.1, 11.2 |
| 10.2 | pi-planning requirements Steps 3-5 source prompt sections | `piPlanningWorkflow.ts` | `PI_PLANNING_STEP_3_EXISTING_STORY_INDEX_PROMPT_TEMPLATE`, `PI_PLANNING_STEP_3_BODY_PROMPT_TEMPLATE`, `PI_PLANNING_STEP_4_EXISTING_STORY_INDEX_PROMPT_TEMPLATE`, `PI_PLANNING_STEP_4_NEW_STORY_INDEX_PROMPT_TEMPLATE`, `PI_PLANNING_STEP_4_STORY_INDEX_LOCATION_PROMPT_TEMPLATE`, `PI_PLANNING_STEP_5_EXISTING_STORY_INDEX_PROMPT_TEMPLATE`, `PI_PLANNING_STEP_5_NEW_STORY_INDEX_PROMPT_TEMPLATE`, `PI_PLANNING_STEP_5_STORY_FILES_LOCATION_PROMPT_TEMPLATE` | Source prompt text replaces recast branch labels | Six obsolete Step 3-5 full-prompt constants removed | 10.9, 10.10, 11.1, 11.2 |
| 10.3 | pi-planning Step 2 conditional assembly | `piPlanningWorkflow.ts` | `buildStep2PromptSource`, `secondaryContextLines` | Secondary context header appears only when at least one optional value exists | No local workflow-value substitution added | 10.11, 10.12, 11.1 |
| 10.4 | pi-planning Step 3 conditional assembly | `piPlanningWorkflow.ts` | `buildStep3PromptSource`, `storiesIndexExistedAtWorkflowStart`, `promptSections` | Existing-story-file instruction appears only when story index existed at workflow start | No local workflow-value substitution added | 10.9, 10.10, 11.1 |
| 10.5 | pi-planning Step 4 conditional assembly | `piPlanningWorkflow.ts` | `buildStep4PromptSource`, `branchPromptTemplate` | Existing-index and new-index branches are selected by `stories_index_existed_at_workflow_start` | No local workflow-value substitution added | 10.9, 10.10, 11.1 |
| 10.6 | pi-planning Step 5 conditional assembly | `piPlanningWorkflow.ts` | `buildStep5PromptSource`, `branchPromptTemplate` | Existing-index and new-index branches are selected by `stories_index_existed_at_workflow_start` | No local workflow-value substitution added | 10.9, 10.10, 11.1 |
| 10.7 | pi-planning Step 2 prompt template inventory | `piPlanningWorkflow.ts` | Step 2 `promptTemplates` | Every static Step 2 section/fragment used by builder is listed | Obsolete Step 2 constants removed | 11.1, 11.3 |
| 10.8 | pi-planning Steps 3-5 prompt template inventory | `piPlanningWorkflow.ts` | Step 3, Step 4, and Step 5 `promptTemplates` | Every static Step 3-5 section/fragment used by builders is listed | Obsolete Step 3-5 constants removed | 11.1, 11.3 |
| 10.9 | pi-planning module prompt test | `piPlanningWorkflow.test.ts` | `expectNoPiPlanningWorkflowPromptTokens`; `promptExpectations` in `renders Step 2 through Step 5 prompts...` | Existing helper renders through shared renderer | Stale prompt snippets and stale branch-label allowances replaced with source-backed snippets and forbidden-token coverage | 11.1 |
| 10.10 | pi-planning Step 3-5 branch test | `piPlanningWorkflow.test.ts` | Test `uses stories_index_existed_at_workflow_start for Step 3 through Step 5 existing-index prompt branches` | Existing and new story-index prompt branches are asserted by source-backed branch snippets | Stale branch-label assertions removed | 11.1 |
| 10.11 | pi-planning optional context test | `piPlanningWorkflow.test.ts` | New optional context branch test | Existing `buildPrompt`, `SAMPLE_WORKFLOW_VALUES`, and helper cover optional combinations | No imports added | 11.1 |
| 10.12 | pi-planning prompt integration fallout | `integration.test.ts` | Test `projects pi-planning current step details into the full-turn input payload only` | Full-turn payload and system prompt negative assertions match new Step 2 text | Stale prompt projection assertions removed | 11.1 |
| Task 11 | action-plan-guide validation | Validation commands | Task owns Subtasks 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, and 11.7 | Command paths and scripts verified | Scope and untracked guards prescribed | 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7 |
| 11.1 | module-build-guide validation expectations | Validation command | Focused unit/integration test paths | Command paths exist in repo | Includes `integration.test.ts` and create-epics schema tests | 11.1 |
| 11.2 | approved static guard requirements | Validation command | `rg` guard pattern and target files | Guard avoids `current_story_task_id` false positive through word-boundary pattern, includes every changed workflow file, and checks one-line `\n` prompt-body regressions | Guard includes acceptance-audit-review and blind-review workflow files | 11.2 |
| 11.3 | repo typecheck gate | Validation command | `npm run check-types` | Script exists in `package.json` | None | 11.3 |
| 11.4 | repo lint gate | Validation command | `npm run lint` | Script exists in `package.json` | None | 11.4 |
| 11.5 | package validation requirement | Validation command | `npm run package` | Script exists in `package.json` | None | 11.5 |
| 11.6 | action-plan-guide scope diff | Validation command | `git diff --name-only` allowlist | Allowlist includes every code/test file touched by subtasks | Integration and create-epics schema fallout included | 11.6 |
| 11.7 | action-plan-guide untracked-file guard | Validation command | `git ls-files --others --exclude-standard` | Output must be empty | Broad module-patches exception removed | 11.7 |
