# Brainstorming Step 3 Automation Requirements

## Purpose

This document defines the requirements for the Step 3 automation in [brainstorming.md](/Users/robertboston/Documents/Cline/Workflows/brainstorming.md).

This slice covers only the system-owned Step 3 behavior:

- present the Step 3 prompt through the existing workflow-form capability
- collect the user's brainstorming topic and goals through one required long-form textarea field
- use a workflow-owned tool to write the submitted response into the `## Topic` section of `{output_file}`
- keep the raw human input out of model-visible conversational context
- support a larger textarea presentation appropriate for paragraph-length input

This document does not define:

- deterministic Step 3 completion rules
- Step 2 session-preparation behavior
- Step 4 technique-selection behavior
- persona activation

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [brainstorming.md](/Users/robertboston/Documents/Cline/Workflows/brainstorming.md)
- [enablement-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/brainstorming/enablement-tracker.md)
- [step-2-automation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/brainstorming/step-2-automation-requirements.md)
- [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-brainstorming/template.md)
- [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md)
- [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
- [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)

## Approved Product Decision

For this slice, Step 3 must use the workflow-form capability rather than the normal chat composer reply path.

This approved decision intentionally replaces the earlier preference in [enablement-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/brainstorming/enablement-tracker.md) for normal-chat capture.

## Capability Boundary

This slice defines the runtime-owned Step 3 topic-capture behavior for `brainstorming.md`.

The canonical tool id and exposed tool name must be:

- `capture_brainstorming_topic`

This slice must:

- keep Step 3 system-owned
- use the existing workflow-form capability as the user interaction surface
- present exactly one required textarea field for the user's topic/goals response
- write the submitted text into the `## Topic` section of `{output_file}`
- preserve the rest of the brainstorming template structure unchanged

This slice must not:

- use generic followup asks for the Step 3 input collection
- route the Step 3 response through normal freeform user chat input
- ask the model to restate, summarize, or transform the user's Step 3 input before writing it
- persist the topic/goals text as a workflow placeholder value
- define Step 3 deterministic completion logic

## Core Requirement

When `brainstorming.md` Step 3 is active and `{output_file}` has already been prepared by Step 2, the runtime must resolve Step 3 through a system-owned workflow form that:

1. presents the authored Step 3 question to the user
2. collects one required long-form topic/goals response
3. submits that response through the dedicated workflow-form transport
4. invokes a workflow-owned tool named `capture_brainstorming_topic`
5. writes the submitted response into the `## Topic` section of `{output_file}`

## Workflow Form Requirements

### 1. Interaction surface

Step 3 must use the existing workflow-form capability described in [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md).

The Step 3 interaction must be implemented as a single-page `collect_inputs` workflow form.

This slice must not require:

- a `confirm` page
- a `select_source` page
- a multi-step staged form flow

### 2. Form title

The workflow form must present this exact title:

- `What topics and/or goals would you like to focus on for this brainstorming session?`

### 3. Form guidance text

The workflow form must present this exact supporting text to the user:

- `Be as detailed as you can- we'll worry about formatting later!`

### 4. Field count

The Step 3 workflow form must present exactly one user-editable field.

The workflow-form dictionary title requirement for this slice is:

- `Brainstorming Topic Reference`

### 5. Field type

That field must be rendered as a required `textarea` control through the workflow-form field-definition contract.

The Step 3 field identity contract must be:

- field key: `topic`
- field label: `Topic and Goals`
- field help: `""`

### 6. Long-form textarea presentation

The workflow-form capability must support a field-level presentation extension that allows a textarea field to opt into a larger long-form rendering mode suitable for paragraph-length responses.

For this slice:

- the Step 3 textarea field must opt into that large long-form rendering mode
- the large long-form rendering mode must produce a visibly larger input area than the current default workflow-form textarea presentation
- the requirement is semantic rather than pixel-locked

The workflow-form field-definition contract must support this exact optional property on `WorkflowFormFieldDefinition`:

`presentation?: { textareaSize?: "default" | "large" }`

### 7. Required-input rule

The Step 3 workflow form must not allow submission when the textarea value is empty or whitespace-only after trimming.

### 8. Raw-input handling

The raw textarea value collected through the workflow form must not be replayed into model-visible conversational context as ordinary user text, recap text, or followup text.

### 9. Workflow reference content

The Step 3 workflow-form reference modal must use the existing workflow-form dictionary mechanism.

The dictionary title must be:

- `Brainstorming Topic Reference`

The runtime system dictionary must include `topic` with:

- label: `The main focus area for this brainstorming session`
- medium: `The topic and/or goals you provide are added to the brainstorming document before GPT invocation`

## Tool Contract Requirements

### 1. Tool identity

The Step 3 workflow-owned tool id must be:

- `capture_brainstorming_topic`

### 2. Tool scope

This tool is the Step 3 automation tool for `brainstorming.md`.

For this slice, prompt-surface exposure must mirror the code-review system-run backend tools:

- register `capture_brainstorming_topic` as an ordinary prompt tool with no prompt-layer workflow gating
- include it in the same family of variant `.tools(...)` allowlists used by the existing code-review backend tools
- use the contextual native-tool matrix only for step-specific native filtering

### 3. Input model

`capture_brainstorming_topic` must accept the canonical workflow-form submission for the one Step 3 textarea field.

`capture_brainstorming_topic` accepts one required string parameter named `topic`.

The runtime must own:

- resolving `{output_file}`
- locating the `## Topic` section
- applying the file update

The model must not provide user-authored tool arguments for:

- `output_file`
- template path
- section markers
- replacement boundaries

### 4. No placeholder persistence of topic text

The submitted brainstorming topic/goals text must not be persisted as a workflow placeholder value.

## Prompt Text Requirements

The Step 3 automation must preserve the exact authored user-facing strings from [enablement-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/brainstorming/enablement-tracker.md):

- title: `What topics and/or goals would you like to focus on for this brainstorming session?`
- text: `Be as detailed as you can- we'll worry about formatting later!`

No wording drift is allowed in this slice.

## Output File Requirements

### 1. Required artifact input

The Step 3 automation must require `{output_file}` from the active placeholder workflow state.

### 2. Topic target section

The user's submitted response must be written under the `## Topic` heading in [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-brainstorming/template.md).

### 3. Template preservation

The Step 3 write must preserve all existing template headings and all content outside the `## Topic` section.

This includes preserving:

- `# Brainstorming Session Results`
- `## Selected Approach`
- `## Selected Techniques`
- `### Techniques Used`
- `## Ideas Generated`

### 4. Section write behavior

The Step 3 automation must populate the body of the `## Topic` section with the user's submitted text.

The write must not:

- remove the `## Topic` heading
- rewrite unrelated sections
- append duplicate `## Topic` headings

On reruns:

- replace the full existing `## Topic` section body
- do not append or merge with previous Step 3 content

### 5. Formatting behavior

The runtime must preserve the user's submitted text as closely as possible when writing the `## Topic` section.

This slice must not require the runtime to summarize, reformat, or structurally normalize the user's prose beyond the minimal write behavior needed to place it under `## Topic`.

## Turn Behavior Requirements

### 1. System-owned flow

This automation is fully system-owned.

The runtime must own:

- rendering the Step 3 workflow form
- validating the required textarea input
- invoking `capture_brainstorming_topic`
- applying the output-file mutation

### 2. No model-authored collection path

The model must not be asked to:

- ask the Step 3 question itself
- collect the Step 3 answer through ordinary conversational turns
- decide where in the artifact the Step 3 answer should be written
- transform the Step 3 answer before it is written

## Workflow Form Integration Requirements

### 1. Trigger shape

The Step 3 workflow form must be integrated through the existing workflow-form runtime seams rather than through a new custom input surface.

### 2. Resolver ownership

The Step 3 form definition must be capability-owned through the existing workflow-form resolver registry.

### 3. Dedicated field presentation support

The large-textarea behavior required by this slice must be implemented as workflow-form field-definition support, not as a brainstorming-specific renderer hack keyed only to workflow name or resolver id.

### 4. Existing textarea compatibility

The long-form textarea presentation extension must not break existing workflow-form textarea use cases that rely on the current default rendering.

## Failure Requirements

The Step 3 automation must fail with a runtime/tool error if any of these are true:

- `output_file` cannot be resolved from active workflow state
- the resolved `{output_file}` cannot be read
- the resolved `{output_file}` does not contain the canonical `## Topic` section
- the runtime cannot write the updated artifact
- the runtime cannot render or complete the Step 3 workflow form
- the workflow-form submission does not contain a valid non-empty textarea value

The Step 3 automation must not produce a partial file update when the required `## Topic` section cannot be resolved.

On success, `capture_brainstorming_topic` returns:

`{"persisted":true,"artifact_path":"<absolute path>","topic_captured":true}`

## Explicit Non-Requirements

This slice does not require:

- deterministic Step 3 completion logic
- a normal-chat reply capture path
- persistence of topic/goals text into placeholder state
- technique selection
- brainstorming idea generation
- any modification of the authored Step 4 or Step 5 workflow content
