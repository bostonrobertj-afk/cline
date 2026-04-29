# Audit Remediation

## 1. Workflow Progression Remediation

### Scope

This note documents the progression-design defect identified during the foundational-build audit and the remediation direction agreed for that defect.

This note is limited to step-progression ownership and transition mechanics. It does not replace the separate audit findings for deterministic retry/final-error behavior.

### Problem

The live foundational implementation hardcodes workflow step progression in `WorkflowRuntime` instead of deriving progression from module-owned rules:

- deterministic success unconditionally executes `session.activeStepNumber += 1` in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:483)
- approved `workflow_progress_request` unconditionally executes `session.activeStepNumber += 1` in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:572)
- `WorkflowStepDefinition` still carries a dedicated boolean `allowWorkflowProgressRequest` in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts:143)

That design is too narrow for the approved architecture because it hardcodes one specific progression rule:

- success means `+1`
- approved progression request means `+1`
- skipped steps, branching, and explicit step targeting cannot be expressed through module-owned progression rules

The live `nextActionRules` contract is also structurally too weak for the updated requirements:

- `WorkflowNextActionRule` is currently modeled as a flat array entry with `condition.matches(session)` and direct coupling to `WorkflowNextAction["kind"]` in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts:106)
- `WorkflowRuntime.resolveNextAction(...)` consumes those rules with first-match `.find(...)` semantics in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:197)
- there is no explicit branch target, no active-branch context, no runtime-owned failure/retry branch state, and no way to model follow-on branch traversal as required by the decision-tree requirements

So the problem is no longer just hardcoded `+1` progression. The current module-defined and runtime-consumed `nextActionRules` shape is itself inconsistent with the approved tree-structured branch model.

The approved source-of-truth requires:

- workflow modules define per-step progression rules, including whether `workflow_progress_request` is permitted: [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:253)
- `WorkflowRuntime` owns canonical next-action evaluation and canonical state mutation: [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:277), [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:278), [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:281)
- deterministic resolution uses workflow-module configuration to interpret results and update active-step state: [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md:351)
- AI-initiated progression requests are validated by the runtime and only then mutate canonical active-step state: [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md:361)

The approved docs do not require a separate dedicated progression API. They do require that progression remain module-owned and runtime-evaluated. The aligned remediation therefore uses `nextActionRules` themselves as the module-owned progression-rule mechanism.

### Remediation

#### 1. Replace the flat `nextActionRules` array contract with a step-owned decision-tree contract

`nextActionRules` must stop being modeled as a flat ordered array of independent first-match rules.

Instead, each step must expose a decision-tree configuration that gives `WorkflowRuntime`:

- an entry branch for the step
- explicit branch definitions keyed by stable branch id
- module-declared branch conditions / triggers
- explicit following-branch target(s)
- any explicit step-transition target reached by a satisfied branch

This replacement is necessary because the current array-plus-`.find(...)` model cannot express the required branch-following behavior for progression, retry, or terminal error handling.

#### 2. Add runtime-owned branch context and trigger context to workflow session state

`WorkflowRuntime` needs typed session state that can remember enough context to traverse the decision tree correctly across turns and across deterministic outcomes.

That runtime-owned branch state must be able to preserve at least:

- the active branch or current branch context for the step
- the most recent triggering outcome/event being evaluated
- deterministic failure / retry attempt state
- any terminal error detail needed for a module-defined error branch

The current `condition.matches(session)` contract is not sufficient because it has no branch context and no event-trigger context.

Examples of compliant transition outcomes:

- stay on the current step
- progress to a specific later step
- skip directly to a specific later step when conditions are satisfied

This keeps progression module-owned while letting `WorkflowRuntime` keep asking one unified question: what should happen next?

#### 3. Rewrite runtime evaluation to traverse the decision tree instead of first-match scanning

`WorkflowRuntime.resolveNextAction(...)` must stop scanning `nextActionRules` with `.find(...)`.

Instead, runtime must:

- start from the step's entry branch or current branch context
- evaluate the module-defined branch conditions against runtime state and trigger context
- follow the matched branch target
- map the resolved branch action into the runtime next action or explicit step transition

This tree traversal must become the canonical next-action evaluation path. The current first-match array semantics are not an approved fallback implementation.

#### 4. Remove `allowWorkflowProgressRequest`

`allowWorkflowProgressRequest` is redundant once progression is derived from `nextActionRules`.

Under the aligned design:

- tool exposure remains a separate concern
- progression validity is determined by whether any current-step `nextActionRule` matches the current state and prescribes a transition

So the dedicated boolean field must be removed from `WorkflowStepDefinition`, and progression permission must no longer be modeled as an independent hardcoded check.

#### 5. Decouple module branch actions from raw runtime next-action kinds

The module-owned decision-tree contract must not stay coupled directly to `WorkflowNextAction["kind"]` the way the current `WorkflowNextActionRule.action` field is.

Instead:

- workflow modules define branch actions in the module contract
- `WorkflowRuntime` interprets those branch actions and maps them into runtime next actions, runtime tool requests, explicit step transitions, or terminal error delivery actions

This separation is required so the module contract can stay branch-oriented while runtime remains the canonical execution/orchestration owner.

#### 6. Evaluate the decision tree for `workflow_progress_request` outcomes

When a `workflow_progress_request` result comes back, `WorkflowRuntime` must not hardcode `approved === true` into `+1` progression.

Instead:

- `WorkflowRuntime` receives the response through the existing tool flow
- `WorkflowRuntime` records the progression outcome as trigger context
- `WorkflowRuntime` evaluates the active step’s decision tree from the active branch context
- those branches may depend on the progression response itself and any additional session conditions
- if no transition rule matches, the workflow does not progress
- if a matching rule prescribes step progression, `WorkflowRuntime` sets the active step to the explicit target step from that rule

This applies to both confirm and deny responses. A deny response may still participate in rule evaluation; it simply should not cause progression unless a module-defined rule explicitly says it should.

#### 7. Evaluate the decision tree after deterministic success

Deterministic success must also stop using unconditional `+1` progression.

Instead:

- `WorkflowRuntime` applies the deterministic result to runtime-owned session state
- `WorkflowRuntime` records deterministic success as trigger context
- `WorkflowRuntime` then evaluates the active step’s decision tree from the active branch context
- only if a matching transition rule is satisfied may the runtime advance the workflow
- if a transition rule matches, runtime advances to the explicit target step from that rule, not the numerically next step by default

This is the same progression model as `workflow_progress_request`: module-owned rule definition, runtime-owned evaluation, runtime-owned canonical state mutation.

#### 8. Retire implicit fallback seams that bypass the decision-tree contract

The current runtime still has separate fallback seams that can emit workflow forms, deterministic operations, and progression behavior outside the module-defined `nextActionRules` path.

Those fallback seams must be removed or collapsed into the same decision-tree mechanism so the runtime has one canonical next-action evaluation methodology.

That includes:

- implicit workflow-form fallback selection
- implicit deterministic step-resolution fallback selection
- hardcoded progression and deterministic failure paths outside branch evaluation

#### 9. Expand evaluation input so transient trigger outcomes can participate

The current `nextActionRule.condition.matches(session)` shape only receives session state. That is not sufficient for decision-tree evaluation that depends on transient trigger outcomes such as:

- a confirmed or denied `workflow_progress_request`
- deterministic success for the current step
- deterministic failure and retry failure
- final report delivery outcomes

So the evaluation surface must be expanded so `WorkflowRuntime` can evaluate the decision tree against:

- current workflow session state
- active branch context
- the current trigger/outcome context

The implementation shape is flexible, but the progression trigger must be available during rule evaluation so modules can express transition conditions based on the actual event that just occurred.

#### 10. Update validation and foundational tests to assert the new branch contract

Once the decision-tree contract replaces the current array contract:

- workflow-definition validation must validate branch ids, branch targets, explicit step-transition targets, and any runtime-required branch metadata
- foundational tests must stop asserting first-match ordered-array behavior, hardcoded `+1` progression, or `allowWorkflowProgressRequest`
- foundational tests must instead assert branch traversal, explicit step targeting, retry/error branch handling, and runtime evaluation from branch context

### Required End State

After remediation:

- module-defined next-action branching is expressed through a decision-tree contract rather than a flat ordered `nextActionRules` array
- `WorkflowRuntime` consumes that tree from explicit branch ids and branch context rather than first-match `.find(...)` semantics
- progression targets are module-defined through the decision-tree contract
- `WorkflowRuntime` no longer contains hardcoded `+1` step progression for approved `workflow_progress_request`
- `WorkflowRuntime` no longer contains hardcoded `+1` step progression for deterministic success
- `allowWorkflowProgressRequest` no longer exists as a separate progression-permission field
- `workflow_progress_request`, deterministic success, deterministic failure, retry, and terminal error all flow through the same module-owned decision-tree mechanism
- tool exposure remains separate from step-transition decisioning

### Non-Goal

This remediation does not change the separate requirement that deterministic failure must execute workflow-defined retry handling and surface a final user-visible error if retry fails. That remains a distinct remediation item.

## 2. Workflow Form Payload Ownership Remediation

### Scope

This note documents the workflow-form ownership defect identified during the foundational-build audit and the remediation direction agreed for that defect.

This note is limited to per-panel workflow-form payload construction ownership, including the mandatory shared pre-workflow entry `WorkflowForm`. It does not replace the separate audit findings about workflow-form registry ownership or workflow-form result interpretation.

### Problem

The live foundational implementation still leaves per-panel workflow-form payload construction in `WorkflowFormRuntime` instead of moving that ownership into `WorkflowRuntime`:

- `WorkflowRuntime` selects the form and creates the session, but then delegates payload construction to `this.workflowFormRuntime.buildPayload(formSession)` in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:289)
- `WorkflowFormRuntime.buildPayload(...)` selects the active panel, resolves that panel, builds the resolved panel payload, and constructs the final `WorkflowForm` payload in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts:628)
- `buildResolvedPanelPayload(...)` in [WorkflowFormRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts:498) still performs the active-panel payload assembly step that the requirements moved to runtime ownership

That is a direct deviation from the approved source-of-truth:

- `WorkflowRuntime` must build the per-panel workflow form payload when the selected interaction is either the mandatory shared pre-workflow entry `WorkflowForm` or an active-step workflow form: [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:324)
- `WorkflowFormRuntime` must be retired as the canonical owner of per-panel workflow form payload construction: [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:336)
- the architecture says workflow runtime determines the active form interaction and builds the per-panel payload, while the workflow form capability renders and captures input: [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md:333), [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md:484)

### Remediation

#### 1. Move active-panel payload assembly into `WorkflowRuntime`

`WorkflowRuntime` must become the owner of:

- selecting the active form interaction, including the mandatory shared pre-workflow entry `WorkflowForm`
- selecting the active panel for the current form session state
- resolving the panel definition from workflow-module configuration
- resolving the concrete panel payload sent to the UI for that step and panel
- constructing the final `WorkflowForm` payload for the current panel

The current delegation to `workflowFormRuntime.buildPayload(...)` must be removed from runtime orchestration paths.

#### 2. Keep only generic form-engine mechanics in `WorkflowFormRuntime`

`WorkflowFormRuntime` may remain responsible for generic capability behavior such as:

- form-session creation
- submitted-value normalization
- submitted-value validation
- generic transition mechanics between panels
- generic message-shape helpers if they remain purely mechanical

But it must no longer own workflow-specific per-panel payload construction.

#### 3. Move `buildResolvedPanelPayload(...)` ownership or equivalent logic to runtime

The logic currently represented by `buildResolvedPanelPayload(...)` must either move into `WorkflowRuntime` directly or be replaced by a runtime-owned helper used by `WorkflowRuntime`.

The key requirement is ownership, not the exact helper location:

- active-panel payload resolution must run under `WorkflowRuntime`
- it must be driven by workflow-module configuration plus current runtime/session state
- it must no longer be owned by `WorkflowFormRuntime`

#### 4. Make `WorkflowRuntime` the caller that assembles the final `WorkflowForm`

After session creation or session update, `WorkflowRuntime` must assemble the final `WorkflowForm` payload itself before returning `render_workflow_form`.

That means the runtime path should become:

- obtain or update generic form session state
- determine the active panel
- resolve the active panel payload
- build the final `WorkflowForm`
- return `render_workflow_form`

instead of:

- obtain or update generic form session state
- hand the session to `WorkflowFormRuntime.buildPayload(...)`
- return the delegated payload

### Required End State

After remediation:

- `WorkflowRuntime` owns per-panel workflow-form payload construction
- `WorkflowFormRuntime` no longer selects the active panel for payload emission
- `WorkflowFormRuntime` no longer resolves the active panel payload for emission
- `WorkflowRuntime` returns `render_workflow_form` only after building the current panel payload itself
- generic workflow-form engine behavior remains in the workflow-form capability/runtime layer without retaining canonical per-panel payload ownership

### Non-Goal

This remediation does not require inlining the entire workflow-form engine into `WorkflowRuntime`. Generic form runtime behavior may remain in `WorkflowFormRuntime`; only the canonical ownership of per-panel workflow-form payload construction must move.

## 3. Activation Boundary Ownership Remediation

### Scope

This note documents the activation-boundary defect identified during the foundational-build audit and the remediation direction required for that defect.

This section defines the approved architectural end state for workflow activation ownership.

### Problem

The live foundational implementation drifted workflow activation away from the approved invocation/runtime ownership boundary:

- the approved architecture assigns the invocation seam the responsibility to detect workflow invocation, set `activeWorkflowName`, and invoke the runtime: [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md:177), [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/architecture.md:300)
- the approved requirements say `activeWorkflowName` is the canonical workflow identity and `WorkflowRuntime` must resolve the active workflow definition from the product-owned registry using that identity: [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:201), [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:205)
- the live foundational code instead passes a caller-supplied `WorkflowDefinition` into `WorkflowRuntime.activateWorkflow(...)` in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:46)
- `task/index.ts` resolves a full definition before activation in [task/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts:1744)
- `UseSkillToolHandler.ts` resolves and passes a full workflow definition in [UseSkillToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseSkillToolHandler.ts:41)
- `SubagentRunner.ts` does the same during child bootstrap in [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts:941)

That drift creates the wrong ownership model:

- callers resolve definitions that the runtime is supposed to resolve
- runtime activation is keyed off an object argument instead of canonical workflow identity
- tests and implementation planning then encode the same wrong contract

### Remediation

#### 1. Re-center activation on canonical workflow identity

Workflow activation must be keyed by `activeWorkflowName`, not by a caller-supplied `WorkflowDefinition`.

The approved activation flow is:

- invocation seam detects workflow invocation
- invocation seam determines the canonical workflow name for that invocation
- invocation seam sets `activeWorkflowName`
- invocation seam invokes `WorkflowRuntime`
- `WorkflowRuntime` resolves the active definition from the product-owned workflow registry using `activeWorkflowName`

That must be the only permanent activation model.

#### 2. Remove the caller-supplied `WorkflowDefinition` activation contract

`WorkflowRuntime.activateWorkflow(...)` must stop accepting a full `workflow: WorkflowDefinition` argument as its activation contract.

The runtime activation contract must instead operate from canonical workflow identity. The exact method signature may vary, but the end state must be:

- callers do not hand a `WorkflowDefinition` object into runtime activation
- runtime activation resolves the definition from the workflow registry
- runtime validation runs on the runtime-resolved definition, not on a caller-owned definition object

#### 3. Keep definition resolution out of invocation callers

The main-agent and child-agent invocation callers must stop resolving full workflow definitions as part of activation.

That means:

- `task/index.ts` must stop resolving a definition before calling runtime activation for persistent slash-command workflow activation
- `UseSkillToolHandler.ts` may translate a `useSkill` request into a canonical workflow identity, but it must not own full definition resolution or direct workflow activation state mutation
- `SubagentRunner.ts` may translate an assigned workflow skill into canonical child workflow identity, but it must not own full definition resolution as the activation contract

Callers may still use registry-owned identity lookup seams where needed to map slash-command or `useSkill` input to the canonical workflow name. But that lookup must not become the caller-owned workflow-definition activation contract.

#### 4. Keep child activation aligned to the same boundary

Child-session workflow activation must follow the same ownership model as main-agent activation:

- child bootstrap determines the canonical workflow identity for the assigned child workflow
- child activation sets the child execution context’s `activeWorkflowName`
- `WorkflowRuntime` resolves the definition for that child context
- child inheritance continues to flow through `parentSession` data passed into runtime-owned activation/session creation, not through caller-owned definition orchestration

This preserves child-session isolation while keeping one activation boundary.

#### 5. Keep resume and persistence name-based

Resume behavior must remain keyed by canonical workflow identity:

- persisted workflow state stores workflow identity and runtime-owned session state
- restore resolves by persisted workflow name
- restore must not depend on callers re-supplying a workflow definition object

This keeps activation, persistence, and resume aligned to the same identity-owned boundary.

#### 6. Update tests and planning artifacts to assert the corrected contract

Once the runtime boundary is corrected, touched tests and planning artifacts must stop encoding the caller-supplied-definition model.

Required test/document alignment includes:

- `WorkflowRuntime.test.ts` must stop treating caller-supplied workflow-definition activation as the approved contract
- `SubagentRunner.test.ts` must stop asserting the same contract for child activation
- implementation-order guidance used for follow-on work must stop prescribing caller-supplied definition activation and must instead describe name-based invocation plus runtime-owned resolution

### Required End State

After remediation:

- workflow invocation is keyed by canonical workflow identity, `activeWorkflowName`
- invocation callers no longer pass `WorkflowDefinition` objects into runtime activation
- `WorkflowRuntime` resolves the active workflow definition from the product-owned registry using canonical workflow identity
- slash-command, `useSkill`, and child-session activation all follow the same ownership boundary
- persistence and resume stay aligned to the same identity-owned activation model
- tests no longer ratify caller-supplied-definition activation as the approved behavior

### Non-Goal

This remediation does not populate the shipped workflow registry with workflow modules. Module population remains Module Build work. This remediation is only about restoring the approved ownership boundary between invocation callers and `WorkflowRuntime`.

## 4. Mandatory Shared Entry `WorkflowForm` Remediation

### Scope

This note documents the entry-flow capability defect identified during the foundational-build audit and the remediation direction required for that defect.

This note is limited to the mandatory shared pre-workflow entry flow that must run before every workflow-specific step. It supersedes the earlier wire-contract-only framing because the corrected architecture no longer preserves workflow start cards in the target model.

### Problem

The live foundational implementation still uses the legacy workflow-start-card capability for the entry flow that should now be modeled as one mandatory shared pre-workflow `WorkflowForm`:

- `WorkflowRuntime.resolveNextAction(...)` routes unresolved project selection to `render_workflow_start_card` in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:142)
- `buildProjectSelectionStartCardSession(...)` builds that interaction as start-card state, combining informational copy plus project-selection inputs in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:1631)
- `task/index.ts` renders that interaction through `buildWorkflowStartCardPayload(...)` and the `workflow_start_card` ask path in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts:1494)
- the shared message contract still exposes a separate `WorkflowStartCard` payload carrying project-selection fields in [ExtensionMessage.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts:597)
- the proto surface and webview submission builder still expose a separate `WorkflowStartCardSubmissionRequest` path in [task.proto](/Users/robertboston/Documents/Cline%20Extension/cline/proto/cline/task.proto:165) and [useMessageHandlers.ts](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.ts:49)

That directly violates the corrected source-of-truth:

- every workflow invocation must begin with one mandatory shared pre-workflow entry `WorkflowForm`: [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:223)
- the first panel of that `WorkflowForm` must be informational only and must carry the content legacy workflow start cards used to carry: [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:225)
- the second panel of that `WorkflowForm` must handle `new` versus `existing` project selection: [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:226)
- `WorkflowRuntime` must build that `WorkflowForm` payload and own the selection/result path: [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:324), [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:336)

### Remediation

#### 1. Remove workflow-start-card ownership from the live entry-flow path

`WorkflowRuntime` must stop treating the mandatory pre-workflow entry interaction as `render_workflow_start_card`.

That means removing the live ownership path built around:

- `render_workflow_start_card`
- `buildProjectSelectionStartCardSession(...)`
- `buildWorkflowStartCardPayload(...)`
- `workflow_start_card` ask/render/wait handling in `task/index.ts`
- separate `submitWorkflowStartCard(...)` runtime submission handling

Those surfaces may remain temporarily on disk until cleanup if needed, but they must no longer remain part of the live foundational runtime dependency chain once the replacement entry-form path lands.

#### 2. Build the mandatory shared entry flow as one `WorkflowForm`

`WorkflowRuntime` must build the entry flow through the same `WorkflowForm` capability used for other workflow forms.

That shared entry `WorkflowForm` must have exactly two panels:

- panel 1: informational only, carrying the workflow-specific informational content that legacy workflow start cards used to carry
- panel 2: project selection, collecting the shared `new` versus `existing` choice and the related project inputs

The entry flow must not be modeled as a separate capability alongside workflow forms.

#### 3. Move workflow-entry informational content into the `WorkflowForm` model

Workflow modules and runtime contracts must stop modeling that informational content as `workflow.startCard.*`.

Instead:

- the workflow definition must supply the informational content for panel 1 of the shared entry `WorkflowForm`
- `WorkflowRuntime` must combine that panel-1 content with the shared panel-2 project-selection definition when assembling the entry `WorkflowForm`
- no separate start-card definition or start-card payload contract may remain part of the target architecture

#### 4. Replace the separate shared/UI/proto entry path with the `WorkflowForm` path

The live foundational runtime must stop sending and receiving a separate start-card contract for entry-flow behavior.

That means:

- the shared message contract must stop using `WorkflowStartCard` for this interaction
- the shared proto contract must stop using `WorkflowStartCardSubmissionRequest` for this interaction
- the webview request builders must submit the entry flow through the `WorkflowForm` request path
- the chat/UI render path must render the entry flow as `workflow_form`, not `workflow_start_card`

#### 5. Keep project-selection behavior, but only through the `WorkflowForm` result path

This remediation changes the capability model, not the underlying selection semantics.

After the entry flow is reimplemented as `WorkflowForm`, `WorkflowRuntime` must still:

- populate existing-project options from the shared discovery/list-builder seam
- validate the selected existing project against discovered candidates
- validate and normalize a submitted new-project title
- persist canonical project-selection state through the workflow-session mutation seam
- continue canonical next-action evaluation after the entry form is submitted

### Required End State

After remediation:

- no live workflow entry path is routed through `render_workflow_start_card`
- every workflow invocation begins with one mandatory shared pre-workflow entry `WorkflowForm`
- panel 1 of that entry `WorkflowForm` is informational only
- panel 2 of that entry `WorkflowForm` performs shared project selection
- `WorkflowRuntime` owns assembly of that entry `WorkflowForm`
- the UI/shared/proto submission path for workflow entry is the `WorkflowForm` path, not a separate start-card path
- foundational runtime and UI tests assert the two-panel shared entry `WorkflowForm` contract instead of any `WorkflowStartCard` behavior

### Non-Goal

This remediation does not redesign the shared project-selection semantics themselves. Existing-project discovery, project-title normalization, and canonical project-selection persistence remain required; the change is that they must now run through the mandatory shared entry `WorkflowForm` instead of a separate start-card capability.

## 5. Legacy Deterministic Step-Resolution Removal Remediation

### Scope

This note documents the foundational-build defect in which legacy deterministic step resolution still survives as a special runtime feature/model, and the remediation direction required to remove that legacy modeling.

This note is limited to:

- removing deterministic step resolution as a distinct configuration/runtime concept
- removing the special next-action, definition, runtime-helper, and result-handler seams that preserve that legacy feature model
- keeping runtime-owned tool invocation as one generic `WorkflowRuntime` capability rather than the defining model for deterministic branch behavior
- preserving runtime-owned document-builder tool invocation as one generic branch action executed by `WorkflowRuntime`

This note does not replace the separate remediation for failure/retry/terminal-error branch handling.

### Problem

The live foundational implementation still preserves deterministic step resolution as a privileged architectural concept instead of expressing branch behavior through `WorkflowRuntime`'s module-defined decision tree.

That legacy model survives through several special seams:

- special next-action kind `run_deterministic_operation` in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts:88)
- special step config seam `stepResolutionDefinitionId` in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts:143)
- special deterministic-definition contract `WorkflowStepResolutionDefinition` in [workflow-step-resolution/types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-step-resolution/types.ts:20)
- special runtime helper `WorkflowStepResolutionRuntime.ts`
- special result-handling path `handleDeterministicToolResult(...)` in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:465)

That means `WorkflowRuntime` is still not simply evaluating the active module-defined branch and doing what that branch prescribes. Instead, legacy deterministic step resolution remains a privileged feature category hard-wired around tool-backed request/result handling.

One concrete symptom of that legacy modeling is document builders:

- `WorkflowDefinition` and `WorkflowStepDefinition` already carry `documentBuilders`, `documentBuilderId`, and `documentBuilderIds` in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts:108)
- `WorkflowRuntime.validateWorkflowDefinition(...)` verifies those references exist in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:822)
- but `WorkflowRuntime.resolveNextAction(...)` never translates a document-builder definition into the required `build_workflow_document` tool request in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:196)

Under the approved architecture, `WorkflowRuntime` should generically evaluate a branch, execute the runtime action(s) that branch prescribes, and then re-evaluate state. Tool invocation is one runtime capability inside that model. It is not the defining model for a separate deterministic-step-resolution feature.

### Remediation

#### 1. Remove deterministic step resolution as a distinct configuration/runtime concept

The following legacy seams must be removed from the canonical architecture:

- special next-action kind `run_deterministic_operation`
- special step config seam `stepResolutionDefinitionId`
- special deterministic-definition contract `WorkflowStepResolutionDefinition`
- special runtime helper `WorkflowStepResolutionRuntime.ts`
- special result-handler path that assumes deterministic work is a standalone feature with its own lifecycle

After remediation, branch behavior must come only from the module-defined decision tree and the generic runtime actions that `WorkflowRuntime` can execute.

#### 2. Make module-defined branch actions the source of truth

Workflow modules must stop expressing legacy deterministic step resolution through dedicated step-resolution definitions.

Instead, branch actions in the step-owned decision tree must be the source of truth for what `WorkflowRuntime` does next. Those branch actions may prescribe:

- runtime-owned tool invocation
- workflow form rendering
- prompt / AI continuation
- explicit step transition
- terminal error delivery
- combinations or sequences of those actions when the approved contract permits them

This keeps `WorkflowRuntime` focused on branch evaluation and execution rather than on a legacy deterministic subfeature.

#### 3. Keep tool invocation as one generic runtime capability inside `WorkflowRuntime`

Tool use should remain available to `WorkflowRuntime`, but only as one generic action capability available to branch execution.

That means:

- `WorkflowRuntime` may build runtime-originated tool requests when the active branch prescribes a tool-backed action
- those tool requests must run through the same shared executor path already used for other runtime-originated tool calls
- tool invocation must not be the defining contract for a dedicated deterministic-step-resolution feature

#### 4. Add generic runtime-owned document-builder tool invocation

For workflow document builders, `WorkflowRuntime` must add the missing generic translation from module definition to runtime-owned tool request.

The runtime-owned path must:

- resolve the referenced `documentBuilderId`
- read the selected `WorkflowDocumentBuilderDefinition`
- call `buildContent(session)` to obtain the fully resolved content
- resolve the canonical destination path for the builder’s `artifactId`
- include any declared `workflowValueWrites`
- build the `build_workflow_document` tool request with:
  - `artifact_id`
  - `destination_path`
  - `content`
  - optional `workflow_value_writes`

This document-builder path should be treated as one generic branch action execution path, not as evidence that deterministic step resolution remains a valid special feature.

#### 5. Reimplement any still-needed action tracking inside `WorkflowRuntime`

If runtime still needs temporary tracking/state/status while a branch-prescribed action is in flight, that tracking must live directly inside `WorkflowRuntime`.

No separate deterministic runtime helper file may survive as a canonical owner of that behavior.

#### 6. Remove standalone legacy coverage and move any still-valid assertions into `WorkflowRuntime` coverage

Once the legacy deterministic-step-resolution feature model is removed:

- standalone `WorkflowStepResolutionRuntime` coverage must not survive
- standalone `WorkflowStepResolutionDefinition` behavior must not survive as an approved contract
- any still-valid assertions about runtime-owned branch action execution must move into `WorkflowRuntime.test.ts`

### Required End State

After remediation:

- deterministic step resolution no longer survives as a distinct configuration/runtime feature
- branch actions in the module-owned decision tree are the source of truth for runtime behavior
- `WorkflowRuntime` generically evaluates branch actions and executes them
- tool invocation survives only as one generic runtime capability inside that model
- `build_workflow_document` can be invoked from runtime-owned workflow document-builder definitions through the shared executor path
- `WorkflowStepResolutionRuntime.ts`, `WorkflowStepResolutionDefinition`, `stepResolutionDefinitionId`, and `run_deterministic_operation` no longer survive as canonical architectural seams
- any still-needed action-tracking logic lives directly in `WorkflowRuntime`

### Non-Goal

This remediation does not prescribe every final branch-action type or every final UI/status detail. It only removes the unapproved legacy deterministic-step-resolution feature model and restores the approved architecture in which `WorkflowRuntime` evaluates module-defined branches and executes the actions those branches prescribe.

## 6. Branch Failure, Retry, And Terminal Error Remediation

### Scope

This note documents the remaining failure-handling defect identified during the foundational-build audit and the remediation direction required for that defect.

This note is limited to:

- preserving branch-action failure context long enough for rule evaluation
- executing module-defined retry behavior through the module-owned next-action decision tree
- executing module-defined terminal error delivery when retry reaches terminal failure

This note does not replace the separate remediation already defined for removing legacy deterministic step resolution and restoring generic branch-action execution inside `WorkflowRuntime`.

### Problem

The live foundational implementation still handles action failure with ad hoc runtime behavior instead of preserving failure context and then re-evaluating the same module-defined `nextActionRules` / decision-tree branches that govern every other runtime-owned next action:

- after a branch-prescribed action fails, `WorkflowRuntime` immediately clears the special deterministic-operation session in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:486)
- it then falls back into `resolveNextAction(...)` without preserving rule-readable failure context for the active step in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:493)
- there is no runtime path that executes a module-defined retry branch
- there is no runtime path that executes a module-defined final user-visible error branch

That is incompatible with the approved source-of-truth:

- workflow modules must define a per-step next-action decision tree with workflow-module-declared, runtime-observable branch triggers and following branch targets in [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:253)
- `WorkflowRuntime` must interpret branch-prescribed action outcomes by applying the result to workflow session state and then re-evaluating the active step's module-owned next-action decision tree in [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:335)
- when a branch-prescribed action fails, `WorkflowRuntime` must execute the retry branch defined by the active workflow and step, and if that retry path reaches terminal failure, it must execute the module-defined final user-visible error branch in [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-runtime/requirements.md:653)

### Remediation

#### 1. Preserve action failure in rule-readable runtime state

`WorkflowRuntime` must stop clearing branch-action failure immediately after the result is interpreted.

Instead, it must preserve enough runtime-owned failure context for the active step's decision tree to evaluate the failure branch on the next pass.

That preserved context must be sufficient for workflow modules to branch on at least:

- which branch-prescribed action failed
- whether the failure occurred on the initial attempt or on a retry path
- any terminal error detail needed for the final user-visible error action

#### 2. Re-evaluate the active step's decision tree after action failure

After a branch-prescribed action fails, `WorkflowRuntime` must re-evaluate the active step's module-owned next-action decision tree against:

- current workflow session state
- the preserved action-failure context

The runtime must not run a separate runtime-owned failure procedure in place of that decision-tree evaluation.

After a branch-prescribed action fails, runtime must only:

- persist failure context into runtime-readable state
- re-evaluate the active step's module-defined `nextActionRules` / decision tree
- execute the action prescribed by the matched failure branch

#### 3. Execute module-defined retry branches through the appropriate runtime action path

If the matched failure branch prescribes retry, `WorkflowRuntime` must:

- resolve the retry branch from the module-owned decision tree
- execute the runtime action or action sequence prescribed by that retry branch through the appropriate runtime execution path

Retry must therefore remain module-defined in branching logic while runtime remains the canonical orchestrator. `WorkflowRuntime` executes retry only because the re-evaluated `nextActionRules` / decision tree selected that retry branch, not because runtime contains a separate retry algorithm.

#### 4. Execute module-defined terminal error branches when retry reaches terminal failure

If the matched failure branch prescribes terminal failure, or if a retry branch reaches terminal failure, `WorkflowRuntime` must:

- resolve the module-defined final user-visible error branch
- execute the runtime action required to surface that final error to the user

That final error behavior must not be omitted and must not be replaced with silent continuation or generic implicit fallback. `WorkflowRuntime` surfaces terminal error only because the re-evaluated `nextActionRules` / decision tree selected that branch, not because runtime contains a separate terminal-failure procedure.

#### 5. Fail closed when no module-defined failure branch matches

If branch-action failure occurs and no retry branch or terminal error branch matches the preserved failure context, `WorkflowRuntime` must not behave as though recovery were approved.

The implementation shape may vary, but the runtime must fail closed rather than silently continuing as if the failure were non-terminal.

### Required End State

After remediation:

- branch-action failure is preserved in runtime-readable state long enough for module-defined failure branching to evaluate
- `WorkflowRuntime` re-evaluates the active step's decision tree after branch-action failure instead of substituting ad hoc runtime-owned failure branching
- module-defined retry branches execute through the runtime action path prescribed by the matching retry branch
- module-defined terminal error branches execute and surface a final user-visible error when retry reaches terminal failure
- success, failure, retry, and terminal error all flow through the same module-owned decision-tree mechanism
- there is no separate runtime-owned failure procedure; retry and terminal error behavior result only from re-evaluating the same module-defined `nextActionRules` / decision tree after failure context is recorded

### Non-Goal

This remediation does not require introducing a separate failure subsystem or a second next-action mechanism. It keeps failure handling inside the same module-owned decision-tree model already prescribed for workflow progression and branch-action result interpretation.

## 7. Workflow Prompt Variant And Workflow-Specific Tool Projection Remediation

### Scope

This note documents the foundational-build prompt/tool projection defect identified during the audit and the remediation direction required for that defect.

This note is limited to:

- replacing the current passthrough workflow prompt projection contract with a runtime-assembled prompt-variant contract
- making `WorkflowRuntime` the sole projection seam for workflow-specific tool exposure
- removing static prompt-variant exposure of workflow-specific tools
- updating prompt integration tests to assert runtime-owned prompt/tool projection

### Problem

The live foundational implementation still treats workflow prompt and tool projection as a passthrough seam instead of a runtime-owned assembly seam:

- `WorkflowRuntime.buildTurnProjection()` simply returns `activeStep.buildPromptProjection(...)` in [WorkflowRuntime.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/WorkflowRuntime.ts:651)
- `WorkflowPromptProjection` only carries one workflow system block, one workflow input block, and one workflow tool override in [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-runtime/types.ts:51)
- the prompt components and continuation-turn assembler simply consume those same raw projected fields in [workflow_system_instructions.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/workflow_system_instructions.ts:3), [workflow_input.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/workflow_input.ts:3), and [continuation_turn.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts:37)

That means `WorkflowRuntime` is not assembling workflow prompt variants from workflow-module content plus runtime/session state. It is merely forwarding raw step output.

The live prompt/tool exposure path also still leaves workflow-specific tools broadly exposed outside runtime projection:

- `workflow_progress_request` is statically included in GPT-5 prompt variant tool lists in [gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts:60) and [native-gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts:72)
- `complete_workflow_item` is likewise statically included in those same variant tool lists in [gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts:68) and [native-gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts:80)
- the override seam does exist and is consumed in [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts:137) and [contextualNativeToolFilter.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts:51), but it is not yet the sole source of workflow-specific tool exposure

Prompt integration tests currently ratify the passthrough model by asserting continuation behavior directly from the same raw workflow block fields rather than from runtime-owned prompt-variant assembly in [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts:1037).

### Remediation

#### 1. Replace the current workflow prompt projection contract with a five-artifact runtime projection contract

The current `WorkflowPromptProjection` contract is too thin.

It must be replaced with a runtime-owned projection contract that provides five artifacts each turn:

- full-turn workflow system instructions
- full-turn workflow input prompt
- workflow-specific tool schema override
- continuation-turn workflow system instructions
- continuation-turn workflow input prompt

`WorkflowRuntime` must project all five artifacts each turn so the main system prompting machinery can pull the variant it needs.

#### 2. Narrow the workflow-module prompting contract

Workflow modules must provide:

- per-step workflow instruction content
- per-step workflow-specific tool override material

Workflow modules must not be treated as the owner of fully assembled runtime prompt blocks.

`WorkflowRuntime` must assemble the final workflow prompt variants from:

- module-provided step content
- runtime-owned workflow/session state
- runtime-owned workflow framing that belongs in the workflow prompt blocks

#### 3. Rewrite `WorkflowRuntime.buildTurnProjection()` to assemble prompt variants

`WorkflowRuntime.buildTurnProjection()` must stop returning raw `activeStep.buildPromptProjection(...)` output unchanged.

Instead, it must:

- obtain the workflow-module content for the active step
- assemble the full-turn workflow system block
- assemble the full-turn workflow input block
- assemble the continuation-turn workflow system block
- assemble the continuation-turn workflow input block
- project the workflow-specific tool schema override for the current step

The runtime must become the actual owner of workflow prompt-variant assembly.

#### 4. Keep turn-type selection in the main system-prompt machinery

This remediation does not move turn-type selection into `WorkflowRuntime`.

The permanent ownership split is:

- `WorkflowRuntime` prepares both workflow prompt variants plus the workflow-specific tool override
- the main system-prompt machinery decides whether the current prompt build is full-turn or continuation-turn
- the main system-prompt machinery consumes the appropriate runtime-projected workflow prompt variant

#### 5. Make the runtime-projected override the sole exposure seam for workflow-specific tools

Workflow-specific tools must not remain statically exposed in prompt variant tool lists.

In particular:

- `workflow_progress_request` must not be exposed unless `WorkflowRuntime` includes it in the workflow-specific tool schema override for the current turn
- `complete_workflow_item` must not be exposed unless `WorkflowRuntime` includes it in the workflow-specific tool schema override for the current turn

The existing override consumers in `ClineToolSet` and `contextualNativeToolFilter` may remain, but after remediation they must become the only workflow-specific tool projection path.

#### 6. Remove broad static workflow-tool exposure from prompt variants

The GPT-5 prompt variant configs and any equivalent variant lists must stop statically including workflow-specific tools that belong under runtime projection control.

After remediation:

- static prompt variant tool lists contain only tools that are truly variant-global
- workflow-specific tools appear only through runtime projection

#### 7. Update prompt integration tests to assert runtime-owned projection

Prompt integration tests must stop ratifying the raw passthrough contract.

Instead, they must assert that:

- `WorkflowRuntime` projects both workflow prompt variants plus the workflow-specific tool override
- the main system-prompt machinery consumes the correct workflow prompt variant for the current prompt build
- workflow-specific tools are absent unless runtime included them in the override
- continuation-turn behavior is derived from runtime-owned prompt-variant assembly rather than from reusing the same raw workflow block fields

### Required End State

After remediation:

- `WorkflowRuntime` assembles workflow prompt variants rather than forwarding raw step projection
- the runtime projection contract carries all five workflow artifacts needed by the prompt system
- workflow modules provide prompt/tool source material, not fully assembled runtime prompt variants
- the main system-prompt machinery chooses between full-turn and continuation-turn variants from runtime-projected workflow artifacts
- `workflow_progress_request` and `complete_workflow_item` are not statically exposed in prompt variants
- workflow-specific tools are exposed only through the runtime-projected workflow tool override
- prompt integration tests assert the corrected runtime-owned prompt/tool projection model

### Non-Goal

This remediation does not move final prompt assembly out of the main system-prompt machinery. It only makes `WorkflowRuntime` the owner of workflow prompt-variant assembly and workflow-specific tool projection before the main prompt assembler consumes those runtime-projected artifacts.
