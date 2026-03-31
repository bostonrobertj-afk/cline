# Workflow Document Runtime Review

## Purpose

This document records what the current runtime actually does with placeholder workflow documents, based on the code in this repo as of March 30, 2026.

It is specifically focused on runtime paths that:

- load workflow documents
- parse step headings and step bodies
- render placeholder values into workflow text
- derive current-step details from workflow documents
- derive workflow-start form shape from workflow documents
- inject workflow step text into focus-chain guidance
- make deterministic progression decisions that depend on workflow structure or placeholder state

## High-Level Summary

In the current implementation, placeholder workflow documents are not used only by the workflow-start form.

They are also used by:

- workflow activation
- checklist generation
- current-step detail resolution
- focus-chain prompt injection
- placeholder extraction
- deterministic progression support and step evaluation

Because of that, any authoring convention for Step 1 must preserve compatibility with all of those consumers, not just the start-form path.

## Runtime Touchpoints

### 1. Workflow activation loads and renders the full document

Relevant code:

- [workflow-activation.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-activation.ts)
- [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)
- [workflow-placeholders.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts)

What happens:

- `activatePlaceholderWorkflowInTaskState(...)` loads workflow contents and stores an `ActivePlaceholderWorkflowSource`.
- Stable placeholders are built from `.cline/workflow-config.yaml` by `buildWorkflowStablePlaceholders(...)`.
- The workflow text is rendered through `getRenderedActivePlaceholderWorkflowSourceContents(...)`.
- Unresolved placeholder tokens are logged but left in place.

Important implication:

- The runtime expects workflow documents to contain real placeholder tokens like `{review_input}` or `{spec_file}`.
- Bare keys like `review_input` do not participate in placeholder rendering.

### 2. Checklist generation is driven by markdown step headings

Relevant code:

- [placeholder-workflow-step-details.ts:197](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts#L197)
- [placeholder-workflow-step-details.ts:273](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts#L273)
- [placeholder-workflow-step-details.ts:58](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts#L58)

What happens:

- `buildPlaceholderWorkflowChecklist(...)` parses workflow sections from the rendered workflow text.
- A section becomes a checklist step only when its heading matches `STEP_HEADING_REGEX`.
- The regex requires a markdown heading whose text starts with `Step <number>`.

Safe authoring conclusion:

- Inner subheadings like `### Workflow Form Inputs` do not create a new checklist step.
- Inner headings that look like `### Step 2: ...` do create a new workflow section and will affect checklist behavior.

### 3. Current-step detail resolution uses both rendered and raw workflow text

Relevant code:

- [placeholder-workflow-step-details.ts:120](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts#L120)

What happens:

- `getActivePlaceholderWorkflowStepDetails(...)` finds the first incomplete checklist item.
- It resolves `details` from rendered workflow contents.
- It separately resolves `rawDetails` from the unrendered workflow contents.

Important implication:

- Any future metadata convention added inside Step 1 can be read from `rawDetails` without losing unresolved placeholder tokens.
- But the rest of the runtime still consumes `details`, which is the rendered step body shown to the agent.

### 4. Placeholder extraction only recognizes real placeholder tokens

Relevant code:

- [workflow-placeholders.ts:83](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts#L83)
- [workflow-placeholders.ts:7](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts#L7)

What happens:

- `extractWorkflowPlaceholderKeys(...)` scans text for `{key}` or `{{key}}`.
- It returns the extracted keys without braces.

Important implication:

- Workflow text must still contain actual `{placeholder}` tokens for runtime extraction to work.
- A metadata block that uses bare keys only is not sufficient for the current runtime.

### 5. Focus-chain prompt injection uses the current rendered step body directly

Relevant code:

- [focus-chain/index.ts:365](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L365)
- [focus-chain/index.ts:398](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts#L398)

What happens:

- The focus-chain manager calls `getActivePlaceholderWorkflowStepDetails(...)`.
- It injects `stepDetails.details` into the prompt as the current workflow step instructions.
- It also checks `findUnresolvedWorkflowPlaceholders(stepDetails.details)`.

Important implication:

- Any authoring added to Step 1 becomes part of the instructions the agent sees.
- Step 1 metadata must therefore be readable and non-destructive as part of the visible workflow instructions unless explicitly filtered in future code.

### 6. Workflow-start form shape currently derives from Step 1 placeholder extraction

Relevant code:

- [WorkflowFormTriggerRegistry.ts:49](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L49)
- [WorkflowFormTriggerRegistry.ts:78](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L78)

What happens:

- `resolveWorkflowFormSlashCommandStartCandidate(...)` runs only for slash-command placeholder-workflow activation.
- It resolves the active step from the workflow document and checklist.
- It extracts placeholder keys from `activeStep.details`.
- It also reads `activeStep.rawDetails` for a current workflow-specific forced-field exception.

Important implication:

- The current workflow-start form is document-derived.
- More specifically, it is placeholder-token-derived from Step 1.
- If Step 1 stops including real `{placeholder}` tokens, the current start-form path cannot infer its fields.

### 7. Deterministic progression support is hardcoded per workflow, not inferred from document metadata

Relevant code:

- [deterministicPlaceholderProgression.ts:31](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L31)
- [deterministicPlaceholderProgression.ts:299](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts#L299)

What happens:

- Deterministic support is enabled by exact workflow name.
- Step completion logic is implemented in hardcoded evaluators per supported workflow.
- For `review-adversarial-general.md`, Step 1 logic is currently implemented in code, not parsed from workflow-file metadata.

Important implication:

- The runtime does not currently understand required vs optional vs `one_of` semantics from workflow documents.
- If that behavior is needed now, the current document-derived implementation must be expanded to parse it explicitly.

## Authoring Constraints Implied By Current Runtime

Based on the code above, the current runtime imposes these real constraints on placeholder workflow documents:

- Workflow steps must be introduced by headings matching `Step <number>`.
- Inner headings are safe only if they do not look like `Step <number>`.
- Step bodies may contain additional markdown, but that markdown remains part of the current-step prompt shown to the agent.
- Placeholder-dependent runtime behavior still requires literal `{placeholder}` tokens in the workflow text.
- Bare placeholder keys alone are not enough.
- Any new metadata convention must be additive to placeholder-bearing workflow text unless the runtime is changed to stop depending on token extraction.

## Immediate Conclusion For Step 1 Input Semantics

The current runtime does not yet have a workable built-in representation for:

- required workflow-start inputs
- optional workflow-start inputs
- `one_of` workflow-start inputs

The current implementation only knows how to:

- extract placeholder keys from Step 1 text
- build a form from that key set
- apply form-side validation rules that are configured in runtime code

So if Step 1 input semantics must be expressed through workflow documents in the current architecture, any solution must:

- preserve literal `{placeholder}` tokens for the rest of the runtime
- add parseable requirement markers alongside them
- update the start-form runtime to parse and enforce those markers from Step 1 `rawDetails`

## Practical Takeaway

Workflow documents are currently part of a shared runtime contract, not just form configuration.

Any authoring change meant to help workflow-start forms must be evaluated against all of these consumers:

- activation rendering
- checklist generation
- current-step resolution
- focus-chain prompt injection
- placeholder extraction
- workflow-start form trigger generation
- deterministic progression logic

If a proposed Step 1 format breaks literal placeholder-token usage, it is not compatible with the current runtime.
