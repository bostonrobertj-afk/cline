# Prompt Canonicalization Requirements Revisions

This document lists module requirements revisions needed to align existing workflow modules with the canonical prompt-construction method documented in `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md`.

Canonical expectations:

- AI-agent prompt constants contain AI-facing prompt text only.
- Source-document authoring notes such as `*** conditional prompt ***`, `only shown if...`, and `end conditional` are builder instructions, not prompt text.
- Conditional prompt content is represented as named prompt sections and assembled in `buildPromptSource(...)`.
- Optional prompt lines are included only when their backing workflow value exists.
- Prompt requirements must require tests proving authoring markers and absent optional fallback text do not leak into AI-facing prompt output.

## acceptance-audit-review

No requirements revisions identified for prompt behavior. The runtime prompt needs formatting cleanup only.

## blind-review

No requirements revisions identified for prompt behavior. The runtime prompt needs formatting cleanup only.

## brainstorming

Revise the Step 3 prompt requirements to match `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md`.

Required requirements changes:

- Require the Step 3 prompt to include the source opening goal sentence: `Goal: Guide an interactive brainstorming session from setup through technique selection, idea capture, and final organization, pausing whenever user input or confirmation is needed.`
- Require the Step 3 prompt to include the source instruction to engage the user in interactive brainstorming using the selected approach.
- Require the Step 3 prompt to include the source instruction to keep the user in control at each decision point and pause for clarification, a technique switch, or continuation whenever needed.
- Require the Step 3 prompt to include the source instruction to record `techniques_used` and `ideas_generated` in `{output_file}` as needed.
- Require the Step 3 prompt to include the source instruction that the goal is to generate as many ideas as possible without exhausting the user.
- Require the Step 3 technique-suggestion section only when `selected_approach` indicates the user requested a suggestion.
- Remove or replace any requirements wording that authorizes topic/goal refinement prose not present in the source document.
- Add testing requirements that the suggestion variant includes technique-suggestion instructions, the standard variant excludes them, both variants include the source goal sentence and user-control/generation instructions, and neither variant includes invented facilitation text.

## code-review

Revise Step 4 prompt requirements so conditional block markers are not required as AI-facing prompt text.

Required requirements changes:

- Replace wording that says Step 4 must include the exact conditional prompt block including `*** Conditional prompting... ***` and `*** end conditional prompt block ***`.
- Preserve the AI-facing upstream-failure text as a conditional prompt section shown only when upstream findings are present.
- Preserve the AI-facing remediation-story text as a conditional prompt section shown only when a remediation story was generated.
- Explicitly state that marker lines are source-document authoring guidance and must not appear in prompt constants or rendered AI-facing prompt output.
- Add testing requirements that Step 4 includes each conditional AI-facing section only under its condition and excludes `Conditional prompting`, `end conditional prompt block`, and `End conditional prompt block` from rendered prompt output.

Revise Step 2 missing-subagent-output prompt requirements:

- Distinguish source-authored header/instruction text from the runtime-generated missing-file list.
- Require deterministic insertion of the missing-file list as generated runtime content.
- Add testing requirements for missing-file prompt output that asserts the static header/instruction text, the generated file list, and absence of source-document authoring markers.

## correct-course

Revise Step 3 prompt requirements so conditional block markers are not required as AI-facing prompt text.

Required requirements changes:

- Remove `*** conditional: only shown if ... ***` and `*** end conditional ***` marker lines from exact AI-facing prompt text requirements.
- Preserve the AI-facing epic-source fragment:
  - `Discovered while authoring a specific epic: {epic_source_indicator}`
  - `Epic: {epic_source_identifier}`
  - `Epic Document: {epics_document}`
- Preserve the AI-facing story-source fragment:
  - `Discovered while authoring, implementing, or reviewing a specific story: {story_source_indicator}`
  - `Story: {story_source_identifier}`
- Require the epic-source fragment only when `epic_source_indicator` is `yes`.
- Require the story-source fragment only when `story_source_indicator` is `yes`.
- Explicitly state that marker lines are source-document authoring guidance and must not appear in prompt constants or rendered AI-facing prompt output.
- Add testing requirements that each conditional fragment is included and excluded under the correct workflow values and that marker text never appears in Step 3 prompt output.

## create-architecture

No behavioral requirements revisions identified. Step 9 already follows section assembly.

Optional requirements cleanup:

- If prompt-source formatting is covered in requirements, align it with the module build guide by requiring readable multiline prompt constants instead of one-line strings with `\n` escape sequences.

## create-epics

Revise Step 2 prompt requirements for optional context handling.

Required requirements changes:

- Require the brainstorming document read instruction only when `brainstorming_document` exists.
- Require the additional context file read instruction only when `additional_context_files` exists and is non-empty.
- Require prompt construction by section assembly rather than unconditional optional placeholder rendering.
- Require that absent optional values do not render placeholder text, empty read instructions, or invented fallback text.
- Add testing requirements for all relevant Step 2 optional-context states: brainstorming only, additional context only, both present, neither present.

## create-story

Normalize requirements language for Step 2 and Step 3 conditional prompts.

Required requirements changes:

- Replace language requiring preservation of "exact conditional prompt text" from the source document with language requiring preservation of the AI-facing text for each condition.
- Explicitly state that source-document marker lines such as `*** Shown only if... ***` and `*** end conditional prompt block ***` are authoring guidance and must not appear in rendered prompt output.
- Add testing requirements asserting the selected branch includes the correct AI-facing text and excludes marker text.

No live runtime prompt marker leakage was identified in `createStoryWorkflow.ts`; this is a requirements-hardening revision to prevent future regression.

## dev-story

Revise Step 2 prompt requirements so the current-task content is treated as generated runtime content.

Required requirements changes:

- Remove `*** Conditional Prompting: ***` and `*** end conditional prompting block ***` from AI-facing Step 2 prompt requirements.
- Require runtime to provide current task detail as generated runtime content derived from the parsed target story task inventory.
- Require static Step 2 prompt prose and generated current-task content to be assembled separately.
- Add testing requirements that the initial Step 2 prompt includes the generated current task detail and excludes conditional authoring marker text.

## edge-case-hunter-review

No requirements revisions identified.

## pi-planning

Revise Step 2 prompt requirements for optional context handling.

Required requirements changes:

- Require the brainstorming document read instruction only when `brainstorming_document` exists.
- Require the additional context read instruction only when `additional_context` exists and is non-empty.
- Require prompt construction by section assembly rather than four hardcoded full-prompt variants.
- Explicitly prohibit invented fallback text such as `not provided` in rendered prompt output unless a source document or requirements revision explicitly prescribes it.
- Add testing requirements for all relevant Step 2 optional-context states: brainstorming only, additional context only, both present, neither present.
- Add testing requirements asserting `not provided` never appears in Step 2 prompt output.

## write-remediation-story

No requirements revisions identified.
