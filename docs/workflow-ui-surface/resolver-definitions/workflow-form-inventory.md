# Workflow Form Inventory

This document lists every live workflow-form entry point I could verify in the current runtime and identifies the resolver each one uses.

There are two runtime entry paths:

- explicit workflow-step triggers from [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L126)
- generic slash-command workflow-start interception from [WorkflowFormTriggerRegistry.ts#L41-L86](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L41)

## A. Explicit Step-Triggered Workflow Forms

These are the workflow forms registered directly in `workflowFormWorkflowStepTriggerRegistry`.

### 1. `code-review.md` Step 2

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/code-review.md:23](/Users/robertboston/Documents/Cline/Workflows/code-review.md:23)
- Trigger definition:
  - [WorkflowFormTriggerRegistry.ts#L127-L135](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L127)
- Resolver used:
  - `code_review_step_3_diff_source`
- Resolver definition:
  - [WorkflowFormRegistry.ts#L364-L483](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L364)

### 2. `code-review.md` Step 3

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/code-review.md:60](/Users/robertboston/Documents/Cline/Workflows/code-review.md:60)
- Trigger definition:
  - [WorkflowFormTriggerRegistry.ts#L136-L143](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L136)
- Resolver used:
  - `code_review_step_3_review_input`
- Resolver definition:
  - [WorkflowFormRegistry.ts#L484-L556](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L484)

### 3. `write-remediation-story.md` Step 2

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md:6](/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md:6)
- Trigger definition:
  - [WorkflowFormTriggerRegistry.ts#L144-L151](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L144)
- Resolver used:
  - `write_remediation_story_step_2_review_input`
- Resolver definition:
  - [WorkflowFormRegistry.ts#L557-L629](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L557)

## B. Generic Workflow-Start Form

This is one resolver reused across multiple workflows.

- Start-candidate resolver path:
  - [WorkflowFormTriggerRegistry.ts#L41-L86](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L41)
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`
- Resolver definition:
  - [WorkflowFormRegistry.ts#L630-L702](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L630)
- Activation contract:
  - current turn must be a placeholder-workflow slash-command activation
  - active checklist step must be Step 1
  - Step 1 raw details must produce workflow-start requirements through [parseWorkflowStartRequirements](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts#L18)

### Workflows I verified as live users of the generic workflow-start resolver

These workflow files currently contain Step 1 directive lines that the live parser can consume because they use `{placeholder}` tokens.

#### 1. `blind-review.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/blind-review.md:10](/Users/robertboston/Documents/Cline/Workflows/blind-review.md:10)
- Parsed start requirements source:
  - `Required: {diff_output}`
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`

#### 2. `brainstorming.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/brainstorming.md:7](/Users/robertboston/Documents/Cline/Workflows/brainstorming.md:7)
- Parsed start requirements source:
  - `Optional: {context_file}`
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`

#### 3. `code-review.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/code-review.md:10](/Users/robertboston/Documents/Cline/Workflows/code-review.md:10)
- Parsed start requirements source:
  - `Required: {story_path}`
  - `Optional: {review_target}`
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`

#### 4. `create-epics.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/create-epics.md:5](/Users/robertboston/Documents/Cline/Workflows/create-epics.md:5)
- Parsed start requirements source:
  - `Required: {architecture_document}, {prd}, {mode}`
  - `Optional: {ux_spec}, {ui_spec}`
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`
- Explicit regression coverage:
  - [WorkflowFormTriggerRegistry.test.ts#L58-L94](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L58)

#### 5. `create-prd.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/create-prd.md:5](/Users/robertboston/Documents/Cline/Workflows/create-prd.md:5)
- Parsed start requirements source:
  - `Required: {architecture_document} {mode}`
  - `Optional: {prd}`
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`

#### 6. `dev-story.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/dev-story.md:8](/Users/robertboston/Documents/Cline/Workflows/dev-story.md:8)
- Parsed start requirements source:
  - `Required: {story_path}`
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`

#### 7. `pi-planning.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/pi-planning.md:6](/Users/robertboston/Documents/Cline/Workflows/pi-planning.md:6)
- Parsed start requirements source:
  - `Required: {epics_document}, {architecture_document}`
  - `Optional: {epic_delivery_spec}`
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`

#### 8. `review-adversarial-general.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/review-adversarial-general.md:10](/Users/robertboston/Documents/Cline/Workflows/review-adversarial-general.md:10)
- Parsed start requirements source:
  - `Required: {diff_output}`
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`
- Important note:
  - the file uses `One Of:` rather than the parser’s canonical `One of:` prefix at [workflowStartRequirements.ts#L5-L7](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts#L5), so the required placeholder is live but the one-of group is not currently parsed from this file
- Explicit coverage for the generic start-form path:
  - [WorkflowFormTriggerRegistry.test.ts#L11-L56](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L11)

#### 9. `review-edge-case-hunter.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md:11](/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md:11)
- Parsed start requirements source:
  - `Required: {review_input}, {diff_output}`
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`

#### 10. `write-remediation-story.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md:4](/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md:4)
- Parsed start requirements source:
  - `Required: {story_path}`
- Resolver used:
  - `placeholder_workflow_start_set_workflow_placeholders`

## C. Authored But Not Currently Live As Generic Start-Form Users

These workflow files contain Step 1 requirement-looking lines, but the live parser does not currently consume them because the placeholder syntax is not canonical `{placeholder}` syntax.

### 1. `create-story.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/create-story.md:6](/Users/robertboston/Documents/Cline/Workflows/create-story.md:6)
- Authored line:
  - `Required: \`epics_document\``
- Why it is not live:
  - [extractWorkflowPlaceholderKeys](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts#L73) only extracts `{...}` or `{{...}}` tokens

### 2. `correct-course.md`

- Workflow file:
  - [/Users/robertboston/Documents/Cline/Workflows/correct-course.md:5](/Users/robertboston/Documents/Cline/Workflows/correct-course.md:5)
- Authored lines:
  - `Required: \`architecture_document\`, \`prd_document\``
  - `Optional: \`UI_spec\`, \`UX_spec\``
- Why it is not live:
  - [extractWorkflowPlaceholderKeys](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/workflow-placeholders.ts#L73) only extracts `{...}` or `{{...}}` tokens

## Bottom Line

The current runtime has four resolver implementations, but those resolvers are reused across multiple workflow entry points:

- explicit step-triggered workflow forms:
  - `code-review.md` Step 2
  - `code-review.md` Step 3
  - `write-remediation-story.md` Step 2
- generic workflow-start form:
  - currently live for the ten workflows listed above
