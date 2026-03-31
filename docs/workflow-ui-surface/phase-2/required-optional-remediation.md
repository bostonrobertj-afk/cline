# Required / Optional / One-Of Workflow Input Remediation Requirements

## Purpose

This document records the remediation requirements for making the current document-derived workflow-start form implementation workable.

These requirements are intentionally grounded in the current runtime:

- the workflow-start form derives its shape from Step 1 of the active workflow document
- Step 1 content is also consumed by other runtime systems
- Step 1 content may still be shown to the AI agent if the form path is skipped or falls through

## Runtime Compatibility Requirements

- Step 1 must continue to contain literal `{placeholder}` tokens.
- The workflow-start form must not rely on bare keys like `review_input`.
- Any Step 1 remediation markup must remain compatible with:
  - placeholder rendering
  - current-step detail extraction
  - focus-chain prompt injection
  - placeholder extraction
  - deterministic progression support

These requirements rule out any solution that removes or replaces literal `{placeholder}` tokens.

## Required Step 1 Directive Format

The workflow-start form runtime must derive required, optional, and one-of semantics from compact directive lines embedded directly in Step 1.

The supported directive lines are:

- `Required:`
- `Optional:`
- `One of:`

These directive labels are case-sensitive and must be recognized exactly as written above.

Each directive line must use literal `{placeholder}` tokens.

Backticks around placeholders are allowed for readability, but the runtime-significant part is the `{}` placeholder token itself.

## Required Directive Behavior

### `Required:`

- A `Required:` line may contain one or more placeholders.
- Placeholders on a `Required:` line must be comma-separated.
- Example:
  - `Required: {diff_output}, {repo_root}`
- Every placeholder listed on a `Required:` line must be treated as required.

### `Optional:`

- An `Optional:` line may contain one or more placeholders.
- Placeholders on an `Optional:` line must be comma-separated.
- Example:
  - `Optional: {review_mode}, {spec_file}`
- Every placeholder listed on an `Optional:` line must be treated as optional.

### `One of:`

- A `One of:` line may contain between 2 and 5 placeholders.
- Placeholders on a `One of:` line must be comma-separated.
- Example:
  - `One of: {placeholder_a}, {placeholder_b}, {placeholder_c}`
- At least one placeholder listed on a `One of:` line must be filled.
- Step 1 may contain multiple separate `One of:` lines.
- Each `One of:` line must be treated as its own independent requirement set.
- If more than 5 placeholders are authored on a `One of:` line, the runtime must ignore anything after the 5th placeholder.
- This cap exists to prevent the form UI from becoming unmanageable.

## Presence Rules

- Step 1 may contain any subset of the supported directive lines.
- A workflow is not required to use all three directive types.

Examples of valid Step 1 directive usage:

- `Required: {diff_output}, {repo_root}`
- `Required: {diff_output}`
- `Optional: {review_mode}, {spec_file}`
- `One of: {review_input}, {spec_file}`
- `Required: {diff_output}, {repo_root}` plus `One of: {review_input}, {spec_file}`
- `Required: {diff_output}` plus `One of: {review_input}, {spec_file}` plus `One of: {repo_root}, {workspace_root}`

## Skip Behavior Requirement

- If Step 1 contains none of the supported directive lines, the workflow-start form must be skipped.
- In that case, turn 1 must proceed directly to the AI agent as usual.

The runtime must not fall back to treating all extracted Step 1 placeholders as semantically equivalent.

## Parsing Requirements

When implemented in code, the workflow-start form path must:

- resolve the active workflow Step 1
- read Step 1 `rawDetails`
- detect directive lines beginning with:
  - `Required:`
  - `Optional:`
  - `One of:`
- extract literal `{placeholder}` tokens from those lines
- derive form semantics from those parsed lines

The runtime must not infer required, optional, or one-of semantics from ordinary prose.

## UI Requirements

Once the workflow form capability understands `Required`, `Optional`, and `One of:`, the UI must present those semantics explicitly instead of hiding them behind submit-button behavior.

### Required Fields

- Fields listed under `Required:` must be rendered as required fields.
- The UI must visually mark them as required near the label.
- The simplest acceptable treatment is a required badge or a visible `*`.
- Submit must remain disabled until all required fields are populated.

### Optional Fields

- Fields listed under `Optional:` must be rendered as optional fields.
- The UI should visually mark them as optional near the label, unless the design intentionally treats unlabeled fields as implicitly optional.
- Optional fields must never block submission on their own.

### One-Of Groups

- Each `One of:` line must be rendered as a grouped set of alternatives.
- The UI must show a short instruction above the alternatives.
- The simplest recommended presentation is:
  - render the first field
  - render an all-caps `OR`
  - render the next field
- If a `One of:` line contains more than two placeholders, the same `OR` separator pattern must be repeated between each displayed field.
- The UI must make it clear that the user must provide one member of the `One of:` list, not all of them.
- The UI must not render placeholders beyond the first 5 members of any `One of:` line.

### Example One-Of Presentation

Provide one of the following

Review Input File

OR

Spec File

OR

Diff Output File

Optional supporting context can still appear below that group as normal optional fields.

### Validation Behavior

- `Required:` means every listed field must be filled.
- `Optional:` means the field may be left blank.
- `One of:` means at least one field in the list must be filled.
- If a workflow uses both `Required:` and `One of:`, submission must satisfy both:
  - all required fields are filled
  - each one-of requirement has at least one filled member
- If a workflow uses multiple `One of:` lines, submission must satisfy each `One of:` line independently.

## Current Gap This Remediation Must Close

The current workflow-start form implementation can extract placeholder keys from Step 1, but it does not currently model:

- field-level required semantics
- field-level optional semantics
- one-of alternative sets

The current UI also does not yet:

- visually distinguish required vs optional fields
- model one-of groups
- present alternative-group UX such as an `OR` separator

This remediation therefore requires both:

- workflow-document parsing support for directive lines
- UI updates so humans can understand the contract being enforced
