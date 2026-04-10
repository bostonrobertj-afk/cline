# Workflow Form V1 Gaps

## Purpose

This document identifies the deficiencies, inconsistencies, missing capabilities, and architectural limitations of the current workflow-form implementation.

Historical note:

- this gap analysis documents the pre-remediation v1 limitations that motivated Workflow Form v2
- it is retained for design history, not as the live runtime contract
- use [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md) and [workflow-form-v2-enablement-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-enablement-guide.md) for the current behavior

It is based on:

- [workflow-form-v1-assessment.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v1-assessment.md)
- the live runtime in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts)
- the live resolver registry in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- the live trigger registry in [WorkflowFormTriggerRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormTriggerRegistry.ts)

## High-Level Summary

Workflow Form v1 is already a shared capability, but it is still too narrow and too opinionated around the first few shipped use cases.

The core problem is not that there are multiple workflow-form systems.

The core problem is that the single shared system still hard-codes too much of:

- panel sequencing
- transition semantics
- context shape
- failure/retry behavior
- trigger evaluation shape

As a result, current use cases work, but new use cases with richer UX requirements force resolver-specific logic instead of flowing naturally from the shared capability.

## Primary Gaps

### 1. The panel flow model is not truly declarative

The live runtime does not support an arbitrary panel graph.

It supports a fixed set of phases in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/types.ts):

- `confirm`
- `select_source`
- `collect_inputs`
- `retry_error`
- `success`

Why this is a gap:

- these names encode specific shipped use cases into the shared contract
- a workflow cannot define its own sequence of panels without mapping them onto those names
- the shared capability is therefore not a generic staged-form engine yet

Practical consequence:

- the code-review diff form fits well because it happens to match `confirm -> select_source -> collect_inputs`
- brainstorming Step 4 does not fit cleanly because it wants a more general branching panel graph

Why v1 was configured this way:

- the original discovery and requirements documents in [discovery.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/discovery.md) and [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md) frame workflow forms primarily as a deterministic workflow-step resolution mechanism, not as a general-purpose wizard engine
- the first design problem was very specific:
  - pause normal agent execution at a supported workflow step
  - collect only the human inputs needed for a deterministic tool call
  - invoke the tool with the AI out of the loop
  - return control to deterministic workflow progression
- the phase model was chosen to reflect that execution lifecycle cleanly:
  - `confirm`:
    - establishes the system-owned handoff
    - gives the user an explicit off-ramp back to the normal AI path before any structured collection begins
  - `select_source`:
    - separates variant choice from concrete data entry
    - lets the system determine which later fields are relevant from tool schema instead of asking for every possible input up front
  - `collect_inputs`:
    - performs the actual structured data capture after the system knows which branch of the tool contract applies
  - `retry_error`:
    - keeps tool execution failure inside the same deterministic system-owned surface instead of immediately dumping the user back into the AI path
  - `success`:
    - gives the runtime an explicit terminal state so deterministic progression can resume after the system-owned step completes
- this structure was therefore doing real architectural work:
  - preserving the boundary between system-owned deterministic execution and fallback AI execution
  - minimizing the amount of state the runtime had to persist and resume
  - keeping the UI and transport contract simple enough to ship as an additive layer inside the existing task runtime
  - avoiding a page-history engine or general graph interpreter before the repo had even validated that system-owned workflow-step resolution was worth the complexity

Why this matters for v2:

- the fixed phase model is not just accidental hard-coding; it encodes the original ownership and lifecycle boundaries of the capability
- if v2 replaces these phases with a more generic panel graph, it still needs to preserve the original benefits:
  - a clean system-owned confirmation seam
  - a structured way to represent variant selection before concrete field entry
  - a first-class error-recovery state that does not leak raw inputs into the model path
  - an explicit success handoff back into deterministic workflow progression

Expected v2 solution:

- replace the fixed phase enum as the primary modeling tool with a declarative panel graph
- let each resolver declare:
  - panel ids
  - panel-to-panel transitions
  - branch destinations
  - explicit Back / restart targets
- keep a small set of runtime-owned lifecycle states around that panel graph rather than making the entire system free-form
- in practice, that means:
  - panel sequencing becomes resolver-declared and workflow-specific
  - ownership semantics remain runtime-owned and shared
  - failure recovery and terminal success remain first-class runtime concerns
- this gives v2 a better fit for richer flows such as Brainstorming Step 2 and Step 4 while preserving the architectural protections v1 was designed to enforce

### 2. Conditional panels are only partially supported

The current system can rebuild downstream fields from prior selections, but only through bespoke resolver logic.

Examples:

- `buildConcreteInputFieldDefinitions(session.values)` in [WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts)
- source-variant helpers such as `resolveSelectedSourceVariantSchema(...)`

Why this is a gap:

- the shared runtime does not provide a first-class conditional-panel model
- conditional behavior exists, but only because the code-review resolver hand-builds it
- the capability is therefore use-case-proven but not generalized

Practical consequence:

- the repo already has a working precedent for conditional panels
- but every new conditional flow risks becoming another bespoke resolver implementation

Why v1 was configured this way:

- the original workflow-form discovery and Phase 1 plan did not start from a goal of building a generic conditional-panel framework
- they started from a narrower goal:
  - take one deterministic tool-backed workflow step
  - let the user choose which branch of that tool contract applies
  - then collect only the concrete inputs required by that chosen branch
- for the first use case, that branching logic was specifically about `build_review_diff_output` source variants:
  - `commit`
  - `commit_range`
  - `ref_diff`
  - `worktree_head_scoped`
- the original design intent was therefore:
  - keep the shared capability schema-driven
  - avoid asking the user for every possible field up front
  - derive only the relevant follow-on inputs from the selected variant
  - preserve the canonical tool contract as the source of truth for what the form should ask
- importantly, the architecture also treated staged UX specialization as resolver-owned rather than runtime-owned
- that split is still reflected in the live design guidance in [workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md):
  - the base capability is runtime-defined from tool schema
  - use cases may specialize field discovery, ordering, labels, help text, and staged UX
  - if a use case needs staged variant selection, the relevant tool schema should be made machine-readable enough to support it
- in other words, the bespoke conditional logic was not just expedient hard-coding
- it was a consequence of the original boundary decision:
  - shared runtime owns generic staged-form mechanics
  - resolver owns use-case-specific branching behavior derived from tool schema

Why this matters for v2:

- if we generalize conditional panels, we should not lose the original benefits that motivated the current design
- specifically, v2 still needs to preserve:
  - tool schema as the source of truth for branching-relevant inputs
  - the ability to ask only the fields relevant to the selected tool-contract branch
  - resolver-level specialization for UX copy and ordering where that remains useful
- the real opportunity is not to remove resolver involvement entirely
- it is to move the conditional-panel mechanics themselves into the shared capability so resolvers declare branching instead of hand-building it

Expected v2 solution:

- make conditional panels a first-class shared capability instead of a bespoke resolver pattern
- let resolvers declare:
  - which upstream answers activate which downstream panels
  - which fields belong to each branch
  - how downstream panels and fields should be recomputed from current session state
- move stale-value clearing into the shared workflow-form system so downstream values are automatically reset when an upstream choice changes
- preserve the current schema-driven discipline:
  - tool schema remains the authoritative source for branch-relevant inputs when applicable
  - resolvers may still specialize labels, ordering, and help text
- in short, v2 should generalize the mechanics of conditional flows while preserving the tool-contract-centered design that the current code-review implementation depends on

### 3. Back behavior is hard-coded to one specific stage shape

In [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts), `BACK` only has specialized behavior for returning from:

- `collect_inputs`
- `retry_error`

back to:

- `select_source`

Why this is a gap:

- the current Back logic assumes exactly one upstream decision panel
- it also assumes a specific preservation/reset rule derived from the diff-source use case
- this is not a generic “go to previous panel and recompute downstream state” capability

Practical consequence:

- the current `Back` capability works for the specific staged shape it was designed around
- the same behavior cannot be reused cleanly for more general multi-step branching flows without extending the shared runtime

Why v1 was configured this way:

- the original workflow-form buildout did not include `Back`
- `Back` was added later because the upcoming brainstorming work needed a way for the user to return to an upstream panel and change a prior selection
- however, the implementation plan in [workflow-form-back-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-back-action-plan.md) explicitly chose a narrow v1 extension rather than a general navigation model
- the underlying architectural reason was that the workflow-form system still treated the current panel sequence as runtime-owned flow, not as a generic resolver-declared panel graph with history
- once that was true, a fully generic Back feature would have required introducing one or more new shared concepts the repo was explicitly trying to avoid in that pass:
  - page-history state
  - broader panel-to-panel transition semantics
  - resolver-owned custom navigation transport
- the chosen design therefore optimized for a narrower guarantee:
  - allow the user to revisit the immediate upstream selection screen
  - clear stale downstream values safely
  - avoid turning workflow forms into a browser-like or wizard-engine state machine before that broader architecture had been designed
- that plan locked `Back` to:
  - `collect_inputs` and `retry_error`
  - `select_source` only
  - no generic page-history stack
  - no resolver-owned custom back transport
- the reason was not that only code review mattered
- the reason was that the repo wanted the smallest shared capability change that could support staged upstream reselection without introducing generic panel-history state or broadening the workflow-form engine prematurely
- in practice, this meant brainstorming supplied the product need, but the implementation reused the existing `select_source -> collect_inputs` mental model from the code-review staged flow instead of introducing general previous-panel navigation

Why this matters for v2:

- v2 should preserve the important stale-value-clearing behavior when upstream selections change
- but it should not hard-code the destination panel name or assume there is only one legal upstream panel
- it also needs to remain compatible with the current code-review staged flow so that the existing narrow `Back` behavior can be migrated into a more general previous-panel capability rather than replaced with a different UX model

Expected v2 solution:

- replace the hard-coded `Back -> select_source` behavior with a generic shared previous-panel model driven by the declared panel graph
- Back should return to the actual prior logical panel for the current branch, not to a hard-coded panel name
- the shared runtime should continue to own stale-value clearing when the user moves upstream and changes a dependency
- those reset rules should be declarative and tied to panel/field dependencies rather than to specific phase names
- there should not be a Back button on the first panel of a workflow form, because there is no prior panel to return to within the form flow
- this lets v2 preserve the safe stale-value-clearing behavior from v1 while supporting richer multi-panel flows such as Brainstorming Step 4

### 4. Retry restarts from hard-coded restart phases instead of the true first page of an arbitrary flow

`RETRY` is currently special-cased for `retry_error`, and from there it restarts only from a hard-coded restart phase.

Why this is a gap:

- the runtime does not remember or derive the true first page of an arbitrary workflow-form flow
- instead, it uses a fixed restart rule:
  - `collect_inputs` when the form originally started in `collect_inputs`
  - otherwise `select_source`
- that means retry behavior is tied to the current hard-coded phase model rather than to the actual structure of the form

Practical consequence:

- current shipped forms work because their restart paths happen to fit those two cases
- richer multi-page forms will not automatically retry back to their real first page unless that page is still one of the hard-coded restart phases

Expected v2 solution:

- `Retry` should restart from the first panel of the workflow form
- the restart target should not depend on hard-coded phase names such as `collect_inputs` or `select_source`
- the shared runtime should restore the user to that first panel and clear any downstream values that no longer belong to the restarted flow
- this preserves the expected plain-English meaning of retry:
  - the previous submission failed
  - the user is returned to the beginning of the form so they can start over and submit again

### 5. Session context is too narrow and too use-case-specific

`WorkflowFormSessionContext` currently has dedicated properties for:

- `workflowStartRequirements`
- `brainstormingSessionOptions`

Why this is a gap:

- the shared context shape is already accumulating case-specific slots
- this does not scale for richer staged forms
- it signals that the capability lacks a more generic resolver-owned context contract

Practical consequence:

- every new form that needs resolver-supplied staged data risks adding more dedicated context fields
- the shared types become a list of historical use cases rather than a stable form abstraction

Why v1 was configured this way:

- the original workflow-form architecture explicitly required persisted session state to stay minimal and to avoid duplicating workflow state, tool-result state, or a second orchestration model, as documented in [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/architecture.md) and [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/requirements.md)
- that pushed v1 toward a narrow interpretation of session context:
  - context should carry only the extra data needed to rebuild the live form definition at resume time
  - context should not become a generic persistence bag for arbitrary resolver-owned state
- the Phase 2 workflow-start remediation made that boundary explicit:
  - requirement gathering, form definition / UX flow, and tool-argument bridging were separated on purpose
  - the workflow-start parser was required to output normalized requirements only
  - the shared resolver then rebuilt the actual fields, copy, and validation behavior from `workflowName` plus `workflowStartRequirements`
- in other words, `workflowStartRequirements` was added as a deliberately small typed payload because the repo wanted the minimum context needed to reconstruct the start form without persisting duplicated field definitions, labels, or page-shape state
- the same pattern carried into the brainstorming Step 2 session picker:
  - that flow needed runtime-discovered select options supplied from a tool handler
  - the shared capability did not have a generic resolver-owned context mechanism for handler-launched staged data
  - the chosen implementation added `brainstormingSessionOptions` as a narrowly typed slot rather than introducing an unbounded `Record<string, unknown>`-style context bag into the persisted session contract
- so the current context shape reflects a real v1 design preference:
  - prefer small explicit typed additions
  - preserve resumability
  - avoid persisting duplicated form-definition state
  - avoid opening the door to arbitrary hidden per-resolver state in the shared session model

Why this matters for v2:

- v2 should generalize resolver-supplied context without losing the original protections that motivated the narrow shape
- specifically, a better shared context contract still needs to preserve:
  - minimal persisted state
  - resumable reconstruction of the live form definition
  - a clear separation between normalized requirement/input data and the derived form-definition/UI shape
  - guardrails against turning session context into an unstructured dumping ground for per-use-case state

Expected v2 solution:

- stop treating session context as the primary place where per-form structure is carried
- instead, make the workflow-form definition itself the typed payload that tells the shared runtime:
  - which panels exist
  - which fields each panel contains
  - which fields are required
  - which transitions and actions are allowed
  - which static or dynamic options belong to a field
- keep session persistence focused on three things:
  - the typed form-definition payload
  - the user-entered session values
  - minimal runtime metadata such as session id, current panel id, and owner/trigger information
- with that model, workflow-specific constructs such as `workflowStartRequirements` and `brainstormingSessionOptions` no longer need to exist as dedicated top-level shared session-context fields
- this keeps the shared capability declarative and typed while avoiding a growing bag of one-off context properties

### 6. Tool-handler-launched forms are more constrained than other forms

The callback surface in [TaskConfig.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/types/TaskConfig.ts) currently restricts `runWorkflowFormSession(...)` to:

- `initialPhase: "collect_inputs"`

Why this is a gap:

- tool-handler-launched forms are a real runtime entry path
- they should not be limited to the simplest possible panel type
- the shared capability is inconsistent across launch modes

Practical consequence:

- the brainstorming session picker works because it is a one-panel dropdown
- a handler-initiated staged form would require capability work before it could use the same panel model as step-triggered forms

### 7. Result interpretation is duplicated in resolver code

Each resolver currently interprets its tool result directly.

Examples:

- `persisted === true && diff_available === true`
- `persisted === true && review_input_available === true`
- special string reason handling for diff/story mismatch

Why this is a gap:

- automatic-status builders share a common pattern, but not a common contract
- success/failure/fallback classification logic is spread across resolvers
- the base capability does not provide structured result semantics for workflow-form tools

Practical consequence:

- similar resolvers repeat nearly the same logic
- any adjustment to fallback semantics risks copy/paste drift

Expected solution:

- do not carry zero-human-input automatic builders forward as part of Workflow Form v2
- instead, migrate those automatic builders onto a separate shared capability for non-interactive system-owned workflow-step execution and user-visible status/notification
- keep Workflow Form v2 focused on its proper responsibility:
  - gathering human input
  - rendering branching/staged input UX
  - validating submitted values
  - handing validated submissions off to runtime-owned tool execution
- in other words, the right fix is not to make Workflow Form v2 better at automatic builders
- the right fix is to remove that mixed responsibility from the workflow-form boundary

### 8. Automatic-status forms are shared in rendering but not in configuration shape

The renderer can display `automatic_status`, but the automatic builders are still configured one resolver at a time.

Why this is a gap:

- multiple automatic-status use cases have the same structure:
  - pending card
  - direct backend tool invocation
  - success card
  - optional fallback-to-agent behavior
- that pattern is not yet expressed as reusable config in the shared capability

Practical consequence:

- code review Step 3
- write-remediation-story Step 2
- quick-spec Step 2

all use nearly the same operational pattern but remain separate handwritten resolvers

### 9. Workflow-form copy customization is inconsistent

Some use cases rely on:

- per-workflow override tables
- ad hoc string constants
- dedicated shared string modules
- resolver-local prompt strings

Why this is a gap:

- copy behavior is not modeled consistently
- there is no clear shared strategy for which text belongs in:
  - shared runtime config
  - shared use-case constants
  - resolver-local definitions

Practical consequence:

- future work is more likely to introduce naming and phrasing drift
- maintenance cost rises as more resolvers are added

Note:

- this gap is largely downstream of gap #5
- if Workflow Form v2 moves to a typed form-definition payload that carries titles, prompts, labels, help text, and action labels directly, most of today’s copy inconsistency becomes an authoring/governance issue rather than a core capability issue

## Inconsistencies

### 1. Not all use cases enter through the same orchestration path

Current entry modes differ:

- slash-command startup
- deterministic step interception
- tool-handler-initiated launch

This is not inherently wrong, but the resulting capability is inconsistent because:

- the shared session model is not equally expressive across all three
- the tool-handler path is more constrained than the others

### 2. Some forms are interactive while others are effectively workflow-owned tool runners

This split exists today:

- interactive human-input forms
- automatic-status backend invocations

This is acceptable, but the capability boundary is blurry because:

- both live under the same system
- yet the configuration and result semantics are very different
- the shared abstraction does not clearly distinguish what is common versus what is use-case-specific

### 3. Dictionary quality varies by use case

Examples:

- some forms have strong runtime dictionary content
- some use empty or very thin dictionary content

Why this matters:

- the shared capability promises runtime-generated tool reference content
- uneven dictionary quality means the user-facing and maintenance experience is inconsistent

### 4. Use-case-specific context has already leaked into shared types

This is one of the clearest architectural inconsistencies.

The shared session context currently contains brainstorming-specific data alongside generic workflow-start data.

That is a strong signal that the shared capability boundary is being stretched by use-case needs it does not model cleanly yet.

## Missing Capabilities

### 1. Generic multi-panel graph definition

Missing capability:

- define an arbitrary set of named panels
- declare transitions between panels
- declare branch destinations
- declare which earlier fields affect which later panels
- keep runtime-owned lifecycle boundaries for entry, failure recovery, and terminal success

This is the biggest missing capability for v2.

### 2. Generic previous-panel navigation

Missing capability:

- return to the actual prior panel, not just `select_source`
- preserve only the right subset of values based on declared dependencies
- omit Back on the first panel of a workflow form

### 3. Flow-aware retry restart

Missing capability:

- restart from the first panel of the workflow form instead of from hard-coded phase names
- clear downstream values appropriately when the user starts over after a failed submission

### 4. Typed workflow-form definition payload

Missing capability:

- a typed payload that tells the shared runtime:
  - which panels exist
  - which fields each panel contains
  - which fields are required
  - which transitions and actions are allowed
  - which static or dynamic options belong to a field
- session persistence centered on:
  - the form-definition payload
  - user-entered values
  - minimal runtime metadata

### 5. Direct expression of branching step flows in the shared capability

Missing capability:

- express a full branching system-owned step directly through the normal workflow-form model
- support branch outcomes where some choices immediately run different backend actions
- support later panels only for branches that require them
- eliminate the need for handler-owned orchestration just to work around workflow-form limitations

### 6. Clear separation between workflow forms and automatic workflow-step execution/status

Missing capability:

- keep Workflow Form v2 focused on human-input collection and staged/branching input UX
- move zero-human-input automatic builders onto a separate shared capability for non-interactive system-owned workflow-step execution and user-visible status/notification

## Additional Risks And Concerns

### 1. Resolver growth will continue to centralize complexity in one file

[WorkflowFormRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts) is already carrying:

- use-case constants
- staged field construction
- prompt strings
- request serialization
- result interpretation

If the shared capability does not become more expressive, that file will keep growing as a use-case switchboard.

### 2. Shared types may become a catalog of exceptions

If each new workflow adds:

- dedicated context slots
- special launch assumptions
- new phase-like behavior

then the shared contract will become harder to reason about and harder to extend safely.

### 3. New workflow UX work will keep feeling expensive

Without a stronger shared staged-form model, every new advanced form will require:

- capability work
- resolver work
- trigger work
- often webview/runtime coordination

That creates friction for workflows that should instead just be data/config consumers of the shared capability.

## Recommended Framing For V2

Workflow Form v2 should not be “another flavor” of workflow form.

It should be a generalization of the existing shared capability so current use cases become simpler specializations of one stronger model.

The design target should be:

- one shared workflow-form engine
- resolver-defined panel graphs instead of fixed phase semantics
- generic dependency-aware value reset rules
- generic previous-panel navigation
- retry that restarts from the first panel of the workflow
- typed workflow-form definition payloads instead of one-off shared session-context fields
- direct expression of branching step flows without handler-owned orchestration workarounds
- a clean boundary between workflow forms and separate automatic workflow-step execution/status capability

## Bottom Line

Workflow Form v1 is successful enough to prove the overall direction, but it is not yet expressive enough to support richer workflows cleanly.

The biggest issue is not lack of reuse.

The biggest issue is that reuse currently depends on bending each workflow to a narrow staged-form model rather than letting the shared capability express the workflow naturally.
