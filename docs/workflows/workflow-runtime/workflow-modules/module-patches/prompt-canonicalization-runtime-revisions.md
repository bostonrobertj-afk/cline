# Prompt Canonicalization Runtime Revisions

This document lists runtime code, test, and related non-requirements revisions needed to align existing workflow modules with the canonical prompt-construction method documented in `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`.

Global implementation expectations:

- Use readable multiline template literal prompt constants.
- Keep prompt constants limited to AI-facing prompt text.
- Use section assembly in `buildPromptSource(...)` for conditional prompt content.
- Use generated runtime sections for dynamic runtime-derived content.
- Keep workflow-value placeholders as `{workflow.<workflowValueKey>}` tokens and rely on the shared runtime renderer.
- Update each affected workflow's `promptTemplates` array to include every static prompt template/fragment returned or assembled by `buildPromptSource(...)`.
- Update prompt tests to assert conditional inclusion/exclusion, workflow-token materialization, and absence of authoring markers or invented fallback text.

## acceptance-audit-review

Runtime revisions:

- In `src/core/task/workflow-runtime/workflow-modules/acceptance-audit-review/acceptanceAuditReviewWorkflow.ts`, convert `ACCEPTANCE_AUDIT_REVIEW_STEP_2_PROMPT` from a one-line template literal with `\n` escape sequences to a readable multiline template literal.
- Preserve the rendered prompt content except for source-format-only differences.
- Keep `buildStep2PromptSource()` returning `ACCEPTANCE_AUDIT_REVIEW_STEP_2_PROMPT`.
- Keep `promptTemplates: [ACCEPTANCE_AUDIT_REVIEW_STEP_2_PROMPT]`.

Test revisions:

- Update acceptance-audit-review prompt tests if they assert exact source formatting.
- Add or confirm coverage that Step 2 prompt output contains materialized required workflow values and no raw `{workflow.` tokens.

## blind-review

Runtime revisions:

- In `src/core/task/workflow-runtime/workflow-modules/blind-review/blindReviewWorkflow.ts`, convert `BLIND_REVIEW_STEP_2_PROMPT` from array-of-lines plus `.join("\n")` to a readable multiline template literal.
- Preserve rendered prompt content.
- Keep `buildStep2PromptSource()` returning `BLIND_REVIEW_STEP_2_PROMPT`.
- Keep `promptTemplates: [BLIND_REVIEW_STEP_2_PROMPT]`.

Test revisions:

- Update blind-review prompt tests if they assert exact source formatting.
- Add or confirm coverage that Step 2 prompt output contains materialized required workflow values and no raw `{workflow.` tokens.

## brainstorming

Runtime revisions:

- In `src/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingWorkflow.ts`, rewrite Step 3 prompt constants to match `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md`.
- Restore the source opening goal sentence.
- Remove invented topic/goal refinement instructions not present in the source document.
- Restore the source instructions to engage using the selected approach, keep the user in control at decision points, pause as needed, record `techniques_used` and `ideas_generated`, and generate as many ideas as possible without exhausting the user.
- Fix `Offer challenges to to the user's ideas or assumptions`.
- Keep the technique-suggestion instructions conditionally selected when `selected_approach` is `Suggest`.
- Keep `BRAINSTORMING_STEP_3_SUGGEST_PROMPT_TEMPLATE` and `BRAINSTORMING_STEP_3_STANDARD_PROMPT_TEMPLATE` as named reviewable templates, or refactor to section assembly with a conditional suggestion section.
- Ensure `promptTemplates` includes all static Step 3 templates/fragments used by the builder.

Test revisions:

- Update brainstorming workflow tests so Step 3 suggestion branch includes technique-suggestion instructions and standard branch excludes them.
- Assert both Step 3 branches include the source goal sentence and source user-control/generation instructions.
- Assert both Step 3 branches exclude invented topic/goal refinement text.
- Assert no raw `{workflow.` tokens leak in rendered prompt output.

## code-review

Runtime revisions:

- In `src/core/task/workflow-runtime/workflow-modules/code-review/codeReviewWorkflow.ts`, remove source-document marker lines from `CODE_REVIEW_STEP_4_UPSTREAM_FAILURE_PROMPT`.
- Remove source-document marker lines from `CODE_REVIEW_STEP_4_REMEDIATION_STORY_PROMPT`.
- Keep Step 4 section assembly in `buildStep4PromptSource(...)`: base prompt, optional upstream-failure fragment, optional remediation-story fragment.
- Keep `promptTemplates` updated to include Step 4 base and conditional AI-facing fragments.
- Refactor Step 2 missing-subagent-output prompt so source-authored header/instruction strings are named constants and the missing-file list is inserted as generated runtime content.
- Do not include generated missing-file list content in `promptTemplates`.

Test revisions:

- Update Step 4 tests to assert upstream-failure content appears only when upstream findings are present.
- Update Step 4 tests to assert remediation-story content appears only when a remediation story was generated.
- Add assertions that Step 4 rendered prompt excludes `Conditional prompting`, `end conditional prompt block`, and `End conditional prompt block`.
- Update Step 2 missing-output tests to assert the static header/instruction text and generated file list appear in order.
- Assert no raw `{workflow.` tokens leak in rendered prompt output.

## correct-course

Runtime revisions:

- In `src/core/task/workflow-runtime/workflow-modules/correct-course/correctCourseWorkflow.ts`, replace `CORRECT_COURSE_STEP_3_PROMPT_TEMPLATE: string = String.raw\`...\`` with readable multiline prompt section constants.
- Remove `CORRECT_COURSE_EPIC_CONDITIONAL_START`, `CORRECT_COURSE_EPIC_CONDITIONAL_END`, `CORRECT_COURSE_STORY_CONDITIONAL_START`, and `CORRECT_COURSE_STORY_CONDITIONAL_END`.
- Remove `removeDelimitedBlock(...)`.
- Remove `removeConditionalMarkers(...)`.
- Split the monolithic Step 3 prompt into named AI-facing sections:
  - base prompt before the epic/story source details
  - epic-source fragment
  - story-source fragment
  - remaining body/final prompt
- Refactor `buildStep3PromptSource(...)` to assemble sections in final output order.
- Push the epic-source fragment only when `epic_source_indicator` is `yes`.
- Push the story-source fragment only when `story_source_indicator` is `yes`.
- Update Step 3 `promptTemplates` to include every static prompt section used by the builder.

Test revisions:

- Update correct-course Step 3 prompt tests to assert epic fragment inclusion/exclusion.
- Update correct-course Step 3 prompt tests to assert story fragment inclusion/exclusion.
- Add assertions that rendered Step 3 prompt excludes `*** conditional`, `*** end conditional`, and related marker text.
- Assert no raw `{workflow.` tokens leak in rendered prompt output.

## create-architecture

Runtime revisions:

- In `src/core/task/workflow-runtime/workflow-modules/create-architecture/createArchitectureWorkflow.ts`, reformat `STEP_9_EXISTING_DOCUMENT_HEADER_PROMPT`, `STEP_9_EXISTING_DOCUMENT_BODY_PROMPT`, `STEP_9_NEW_DOCUMENT_REVIEW_PROMPT`, and `STEP_9_FINAL_PROMPT` as readable multiline template literal constants.
- Preserve Step 9 section assembly in `buildStep9PromptSource(...)`.
- Preserve conditional order:
  - existing document header
  - optional change plan line
  - existing document body
  - final prompt
  - or new document review prompt followed by final prompt

Test revisions:

- Update create-architecture prompt tests only if they assert exact source formatting.
- Confirm Step 9 tests assert the existing-document and new-document branches exclude the opposite branch and materialize workflow values.

## create-epics

Runtime revisions:

- In `src/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsWorkflow.ts`, split `CREATE_EPICS_STEP_2_PROMPT_TEMPLATE` into named sections.
- Add `WorkflowPromptBuilderInput` to `buildStep2PromptSource(...)`.
- Always include the output file, architecture document, and other always-required Step 2 instructions.
- Include the brainstorming document read instruction only when `brainstorming_document` exists.
- Include the additional context files read instruction only when `additional_context_files` exists and is non-empty.
- Use section assembly in `buildStep2PromptSource(...)`.
- Update Step 2 `promptTemplates` to include every static prompt section used by the builder.

Test revisions:

- Add or update Step 2 prompt tests for both optional context values present, brainstorming only, additional context only, and neither present.
- Assert absent optional lines do not appear.
- Assert no raw `{workflow.` tokens leak in rendered prompt output.

## create-story

Runtime revisions:

- No live prompt marker leakage was identified in `src/core/task/workflow-runtime/workflow-modules/create-story/createStoryWorkflow.ts`.
- Optional cleanup: if aligning strictly to the module build guide, rename or split Step 2 and Step 3 branch prompts so source-document conditional marker semantics are represented by code branches and not by ambiguous constant names.

Test revisions:

- Add or confirm assertions that Step 2 and Step 3 selected prompt branches do not include `*** Shown only if`, `*** end conditional prompt block`, or other source-document marker text.
- Assert no raw `{workflow.` tokens leak in rendered prompt output.

## dev-story

Runtime revisions:

- In `src/core/task/workflow-runtime/workflow-modules/dev-story/devStoryWorkflow.ts`, remove `*** Conditional Prompting: ***` and `*** end conditional prompting block ***` from `DEV_STORY_STEP_2_PROMPT_TEMPLATE`.
- Replace the literal `current_story_task` placeholder and `.replaceAll("current_story_task", currentTaskDetail)` with section assembly.
- Split static Step 2 prose/frontmatter into named constants.
- Insert `currentTaskDetail` as generated runtime content under the `*** Current Story Task: ***` heading.
- Preserve the task-loop branch that returns only `currentTaskDetail` when the active branch is `DEV_STORY_STEP_2_TASK_LOOP_BRANCH_ID`, unless requirements are revised to require surrounding prose on every loop projection.
- Update Step 2 `promptTemplates` to include only static prompt sections, not generated current-task content.

Test revisions:

- Update Step 2 tests to assert initial prompt includes generated current task detail.
- Add assertions that Step 2 prompt excludes `Conditional Prompting` and `end conditional prompting block`.
- Add or confirm tests for task-loop branch output.
- Assert no raw `{workflow.` tokens leak in rendered prompt output.

## edge-case-hunter-review

No runtime prompt-construction revisions identified.

Test revisions:

- No test revisions identified beyond any global prompt-token materialization checks already in place.

## pi-planning

Runtime revisions:

- In `src/core/task/workflow-runtime/workflow-modules/pi-planning/piPlanningWorkflow.ts`, replace the four Step 2 full-prompt variants with section assembly.
- Define named Step 2 sections:
  - base/introduction
  - primary context reads
  - optional brainstorming context read
  - optional additional context read
  - assessment instructions
  - final progress instruction
- Include the brainstorming section only when `brainstorming_document` exists.
- Include the additional-context section only when `additional_context` exists and is non-empty.
- Remove all hardcoded `not provided` lines.
- Update Step 2 `promptTemplates` to include every static Step 2 section used by the builder.
- Keep Steps 3-6 branch selection unless requirements are revised; no marker leakage was identified in those live prompt constants.

Test revisions:

- Update Step 2 prompt tests for all optional-context combinations: both present, brainstorming only, additional context only, neither present.
- Assert absent optional context lines do not appear.
- Assert `not provided` never appears in rendered Step 2 prompt output.
- Assert no raw `{workflow.` tokens leak in rendered prompt output.

## write-remediation-story

No runtime prompt-construction revisions identified.

Test revisions:

- No test revisions identified beyond any global prompt-token materialization checks already in place.

## Cross-Workflow Validation

After implementing workflow-specific revisions:

- Run focused workflow unit tests for every changed workflow module.
- Run prompt projection tests that cover workflow prompt rendering and tool-schema projection.
- Run `npm run check-types`.
- Run `npm run lint`.
- Run a negative search over changed workflow files for forbidden prompt-authoring markers that should no longer appear in runtime prompt constants:
  - `Conditional prompting`
  - `conditional prompt`
  - `end conditional`
  - `not provided`
  - `String.raw`
  - full prompt bodies encoded as one-line strings with `\n`
