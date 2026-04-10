# Workflow Form V1 Assessment

## Purpose

This document assesses the live workflow-form capability in v1 and inventories every current runtime use case.

Historical note:

- this assessment is retained as a pre-remediation v1 snapshot
- it is not the live runtime contract after the Workflow Form v2 remediation
- use [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md) and [workflow-form-v2-enablement-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-enablement-guide.md) for the current behavior

It is grounded in the live implementation, primarily:

- [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
- [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)

## Historical V1 Shared Capability Snapshot

Workflow Form v1 is a single shared capability, not multiple separate systems.

Shared runtime pieces:

- one session/runtime engine in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- one transport contract in [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts)
- one shared renderer in [ChatRow.tsx](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx)
- one resolver registry in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- one trigger registry for step interception in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)

The current shared form model supports:

- fixed phases: `confirm`, `select_source`, `collect_inputs`, `retry_error`, `success`
- two presentation kinds: `interactive_form` and `automatic_status`
- schema-derived fields
- staged flows where later field sets can be rebuilt from earlier values
- Back from `collect_inputs` or `retry_error` to `select_source`
- Retry from `retry_error`
- deterministic tool invocation through the normal backend tool path

The main v1 constraint is that the shared capability is still organized around a small set of hard-coded phase names and transitions rather than a fully declarative multi-panel state machine.

## Historical V1 Runtime Entry Paths

The live system currently opens workflow forms from three places:

1. Slash-command startup path
- [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts) resolves the generic workflow-start candidate.
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1828) creates the session before the first AI turn.

2. Deterministic step interception path
- [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts) maps exact workflow/step pairs to resolvers.
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L260) resolves the current interception candidate.

3. Tool-handler initiated path
- [PrepareBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts) uses `runWorkflowFormSession(...)`.
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L1487) currently constrains that helper to `initialPhase: "collect_inputs"`.

## Use Case Inventory

### 1. Generic Workflow Start Form

Workflow and step:

- many slash-command-started placeholder workflows
- Step 1 only

Resolver:

- `placeholder_workflow_start_set_workflow_placeholders`

Trigger:

- slash-command start candidate in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L45)

What the user sees:

- one `collect_inputs` panel
- fields are derived from Step 1 raw directives:
  - `Required: {placeholder}`
  - `Optional: {placeholder}`
  - `One of: {placeholder_a}, {placeholder_b}`
- the panel title and prompt may be overridden per workflow
- on validation failure, the same panel re-renders as `retry_error`

Backend behavior:

- serializes selected values into `set_workflow_placeholders`
- persists dynamic workflow placeholders before the first AI turn
- uses runtime-built field definitions and runtime-built tool dictionary content

Hard-coded or use-case-specific behavior:

- start-form eligibility is hard-coded to Step 1 plus the directive-line parser
- the session context has a dedicated `workflowStartRequirements` field in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts)
- per-workflow label/prompt overrides live in `workflowStartFormOverrides` in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- the shared capability does not have a generic contextual copy override system; this use case carries its own override table

### 2. Code Review Step 2 Diff Artifact Builder

Workflow and step:

- `code-review.md`
- Step 2

Resolver:

- `code_review_step_3_diff_source`

Trigger:

- step trigger in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L164)

What the user sees:

- `confirm` panel
  - prompt asks whether the user can provide inputs required to produce `review-input.diff`
  - options: `Yes`, `No`
- `select_source` panel
  - one dropdown for diff source type
  - options derive from the `build_review_diff_output` schema
- `collect_inputs` panel
  - field set is rebuilt from the selected source type
  - examples: `commit`, `base`, `head`, `scoped_paths`, `context_lines`
- `retry_error` panel
  - same fields as `collect_inputs`
  - exposes `Back` and `Start Over`

Backend behavior:

- serializes the staged values into `build_review_diff_output`
- converts field values into the tool’s canonical nested `source` object plus optional `scoped_paths` and `context_lines`
- treats success as `persisted === true` and `diff_available === true`

Hard-coded or use-case-specific behavior:

- the shared phase model explicitly privileges `select_source` as the only upstream selection phase
- Back behavior in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts) is hard-coded to return to `select_source`
- downstream field reset behavior is also hard-coded around `select_source -> collect_inputs`
- the source-type-specific field derivation lives in bespoke resolver helpers:
  - `buildSourceSelectionFieldDefinitions()`
  - `buildConcreteInputFieldDefinitions(...)`
- this is effectively the prototype for conditional panels, but the capability is not yet generalized beyond this naming and transition pattern

### 3. Code Review Step 3 Automatic Review Input Preparation

Workflow and step:

- `code-review.md`
- Step 3

Resolver:

- `code_review_step_3_review_input`

Trigger:

- step trigger in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L172)

What the user sees:

- no interactive fields
- one automatic status card
- pending copy tells the user the system is building `review-input.md` from stored workflow state
- on success, the card updates to success
- on failure, the card updates to failure and the runtime can fall back to the agent path

Backend behavior:

- invokes backend-only tool `build_review_input`
- success contract expects `persisted === true` and `review_input_available === true`
- special failure reason `"diff_output does not identify recent changes to the story file."` becomes fallback-to-agent rather than ordinary retry

Hard-coded or use-case-specific behavior:

- `automatic_status` is a shared presentation mode, but fallback handling for this resolver is bespoke
- the special diff/story mismatch string is hard-coded in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- the base capability has no generalized typed result-classification layer for structured workflow fallback categories; the resolver interprets this tool’s result contract directly

### 4. Write Remediation Story Step 2 Automatic Review Input Preparation

Workflow and step:

- `write-remediation-story.md`
- Step 2

Resolver:

- `write_remediation_story_step_2_review_input`

Trigger:

- step trigger in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L180)

What the user sees:

- same automatic-status card pattern as code review Step 3
- prompt text is scoped to Step 2 fallback copy

Backend behavior:

- invokes backend-only tool `build_review_input`
- success/failure classification mirrors the code-review automatic preparation path

Hard-coded or use-case-specific behavior:

- almost identical resolver to code review Step 3, but duplicated with step-specific strings
- this indicates the shared capability does not yet provide a clean way to parameterize “automatic backend artifact build with fallback copy” as reusable config

### 5. Quick Spec Step 2 Automatic Tech Spec Scaffold Builder

Workflow and step:

- `quick-spec.md`
- Step 2

Resolver:

- `quick_spec_step_2_build_tech_spec_document`

Trigger:

- step trigger in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L188)

What the user sees:

- no interactive fields
- one automatic status card
- pending copy says the system is building the canonical quick-spec scaffold from stored title and template state

Backend behavior:

- invokes backend-only tool `build_tech_spec_document`
- success expects `persisted === true` and `output_file_available === true`
- failure falls back to the agent path

Hard-coded or use-case-specific behavior:

- another bespoke automatic artifact-builder resolver with its own strings and result interpretation
- tool dictionary markdown is empty for this resolver, which is another sign that automatic-status use cases still rely on per-use-case choices instead of a stronger shared contract

### 6. Brainstorming Step 2 Existing Session Picker

Workflow and step:

- `brainstorming.md`
- Step 2 follow-on path when the user chooses to list existing sessions

Resolver:

- `brainstorming_step_2_select_session`

Trigger:

- not in the step-trigger registry
- launched from [PrepareBrainstormingSessionToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/PrepareBrainstormingSessionToolHandler.ts#L270) through `runWorkflowFormSession(...)`

What the user sees:

- one `collect_inputs` panel
- one dropdown listing existing brainstorming session files
- submit button labeled `Continue`
- `retry_error` repeats the same panel

Backend behavior:

- the handler first does a normal follow-up ask asking whether to continue newest, start new, or list all sessions
- if the user chooses list-all, the handler discovers the session files, converts them into dropdown options, and injects them into form session context as `brainstormingSessionOptions`
- the form itself serializes the selected file into `set_workflow_placeholders` for `output_file`

Hard-coded or use-case-specific behavior:

- this flow requires a dedicated `brainstormingSessionOptions` session-context slot in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts)
- the more important limitation is architectural: the shared workflow-form capability could not cleanly represent the full Step 2 branching interaction as one coherent form-driven flow
- because of that gap, the repo introduced `prepare_brainstorming_session` as a Step 2 orchestration tool that:
  - handles the initial three-way choice
  - performs the immediate backend side effects for `Continue newest session` and `Start new session`
  - launches the workflow form only for the `List all sessions` branch
- the handler-launched form is therefore a workaround for the missing shared branching/orchestration capability, not the core problem by itself
- the tool-handler launch path only supports `initialPhase: "collect_inputs"` in [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts), which reinforces that this branch was implemented as a narrow subflow instead of as one unified Step 2 workflow-form experience
- the capability does not yet offer a generic “resolver-provided option payload” context model; this use case has a dedicated brainstorming-specific context property

### 7. Brainstorming Step 3 Topic Capture

Workflow and step:

- `brainstorming.md`
- Step 3

Resolver:

- `brainstorming_step_3_capture_topic`

Trigger:

- step trigger in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts#L196)

What the user sees:

- one `collect_inputs` panel
- large textarea field `topic`
- title: `What topics and/or goals would you like to focus on for this brainstorming session?`
- prompt: `Be as detailed as you can- we'll worry about formatting later!`

Backend behavior:

- invokes backend-only tool `capture_brainstorming_topic`
- tool replaces the `## Topic` section body in the resolved brainstorming output file
- success expects `persisted === true`, `topic_captured === true`, and a string `artifact_path`

Hard-coded or use-case-specific behavior:

- the trigger’s done-signal logic is bespoke: it reads the output file, parses the canonical `## Topic` section, and also requires a current-task write proof in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)
- the form is simple, but the interception logic is not generic
- this use case exposes a repo-specific gap between shared form rendering and shared workflow step completion semantics

## Cross-Cutting Hard-Coded V1 Constraints

These are the main places where use cases are still compensating for missing shared capability.

### Fixed Phase Names

The phase model in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts) is fixed to:

- `confirm`
- `select_source`
- `collect_inputs`
- `retry_error`
- `success`

Impact:

- only one upstream branching phase is first-class
- workflows that want multi-branch or multi-panel flows must map themselves onto those names instead of declaring their own panel graph

### Hard-Coded Back and Retry Semantics

In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts):

- Back only has special logic for returning from `collect_inputs` or `retry_error` to `select_source`
- Retry is treated as an error-recovery action, not a general-purpose secondary panel action

Impact:

- the diff-source resolver works well
- richer flows such as “pick path -> pick category -> pick technique” or “show random result -> regenerate” do not fit cleanly without new shared capability

### Narrow Session Context Shape

`WorkflowFormSessionContext` currently contains dedicated properties for:

- `workflowStartRequirements`
- `brainstormingSessionOptions`

Impact:

- the capability already needs use-case-specific context keys
- there is no more generic typed context container for resolver-owned staged data sources

### Use-Case-Specific Result Interpretation

Resolvers currently own their own tool-result interpretation logic.

Impact:

- success and failure contracts are repeated in resolver code
- fallback-to-agent behavior is bespoke per resolver
- automatic-status builders are similar in behavior but still duplicated

### Trigger Logic Lives Outside The Shared Form Contract

Step interception is still expressed as workflow-specific `shouldIntercept(...)` functions in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts).

Impact:

- the shared form capability does not yet own a more declarative “done signal” or “open-form-when” contract
- file-content parsing, write-proof checks, and artifact existence checks remain bespoke per use case

### Missing Shared Branching Capability Forces Handler-Owned Orchestration

The brainstorming Step 2 implementation shows that workflow-form v1 cannot yet express a single branching workflow-form flow where:

- panel 1 presents multiple user choices
- some choices immediately invoke different backend side effects
- only one choice proceeds to a later panel
- the whole interaction still remains one coherent workflow-form experience

Because that shared capability is missing, the repo had to introduce handler-owned orchestration through `prepare_brainstorming_session`, then launch a narrower workflow form only for the `List all sessions` branch.

The current tool-handler callback surface also only supports:

- `initialPhase: "collect_inputs"`

Impact:

- branching step interactions may get split between a tool-owned orchestration layer and a workflow-form subflow instead of being expressed directly in the shared workflow-form capability
- tool-initiated staged flows cannot begin at `confirm` or another upstream panel without expanding the shared callback contract

## Summary

Workflow Form v1 is already one shared capability, but it is still a narrow shared capability.

What is truly shared today:

- session persistence
- rendering
- transport
- schema-derived fields
- deterministic backend tool execution
- a limited staged-form runtime

What is still effectively hard-coded around current use cases:

- panel graph shape
- Back and Retry semantics
- special session context payloads
- result interpretation patterns
- trigger/done-signal logic

The most important v2 design opportunity is to keep the single shared capability, but move from:

- “resolvers adapt themselves to a fixed phase model”

to:

- “resolvers declare a panel graph, transitions, and reset rules using one generalized staged-form contract”

That would let future workflows such as brainstorming Step 4 use the same base capability without adding another flavor of workflow form.
