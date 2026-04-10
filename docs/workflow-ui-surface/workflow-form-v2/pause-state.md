# Workflow Form V2 Pause State

## Purpose

This document records where the Workflow Form v2 build is being paused so the next pass can resume from the real unresolved state rather than from older plans or partially completed remediation work.

## Pause Reason

Workflow Form v2 is being paused because finalizing the capability cleanly now depends on broader workflow-architecture modernization.

The repo has:

- a real top-level runtime spine in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
- shared capabilities for workflow forms, deterministic progression, workflow-step resolution, and workflow-owned tools

But it does not yet have one canonical per-workflow orchestration/config layer that owns the end-to-end runtime contract for an active workflow.

That matters here because at least one of the remaining Workflow Form v2 defects is not just a workflow-specific bug. It exposes a deeper architectural inconsistency:

- runtime-owned panel-by-panel execution is intended to be canonical
- but some workflow-specific definition-building logic is still shaping runtime behavior in per-workflow code

## Unaddressed Findings

### 1. High: Brainstorming Step 4 can follow the wrong branch after `Back` or `Retry` if the user changes the approach on returning to `approach_selection`.

Relevant seams:

- [WorkflowFormRegistry.ts:717](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L717)
- [WorkflowFormRegistry.ts:730](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L730)
- [WorkflowFormRegistry.ts:829](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L829)
- [WorkflowFormRegistry.ts:867](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L867)
- [WorkflowFormRuntime.ts:680](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L680)
- [WorkflowFormRuntime.ts:817](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L817)
- [WorkflowFormRuntime.ts:977](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L977)

Why this matters:

- the issue is not just “Brainstorming Step 4 is buggy”
- it shows that the runtime can still route from a stale resolved panel snapshot instead of re-resolving transition behavior from updated session state
- that is a Workflow Form v2 architecture problem, not merely a local workflow misconfiguration

Current effect:

- a user can return to `approach_selection`
- change the selected approach
- resubmit
- and still be routed down the prior branch because the transition was precomputed from earlier persisted state

### 2. Medium: The panel-by-panel webview boundary is only partially compliant.

Relevant seams:

- [ExtensionMessage.ts:570](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L570)
- [buildWorkflowFormPayload.ts:18](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/buildWorkflowFormPayload.ts#L18)
- [ChatRow.tsx:386](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L386)

Why this matters:

- the V2 boundary says the webview should receive only the resolved active panel payload
- the live transport still includes the full session value bag
- the renderer hydrates local state from that full bag

Current effect:

- the UI sees more than the resolved active panel contract
- the panel-by-panel boundary exists, but not cleanly

### 3. Low: `dependsOn` is exposed as part of the shared V2 contract but is effectively dead metadata.

Relevant seams:

- [ExtensionMessage.ts:486](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L486)
- [WorkflowFormRegistry.ts:819](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L819)
- [WorkflowFormRuntime.ts:183](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L183)
- [WorkflowFormRuntime.ts:191](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRuntime.ts#L191)
- [ChatRow.tsx:793](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L793)

Why this matters:

- `dependsOn` is part of the shared V2 surface
- but neither runtime resolution nor rendering actually uses it
- current behavior works only because reset rules are doing the real work

Current effect:

- the contract surface advertises a dependency mechanism that is not actually live
- this is lower risk than Finding 1, but it is still contract drift

## Compliance Summary

### Fully compliant

- typed V2 definition transport
- typed V2 submission transport
- structural validation
- workflow-start migration
- Code Review Step 2 migration
- Brainstorming Step 2 existing-session plus zero-session split
- persistence/resume with persisted `definitionPayload`
- generic field rendering
- removal of handler-owned workflow-form orchestration

### Partially compliant

- panel-by-panel runtime/webview exchange
- shared dependency/reset contract surface

### Non-compliant

- Brainstorming Step 4 Back/Retry reselection path
- conditional branch routing after upstream reselection

## Residual Risks And Test Gaps

- No current workflow-form unit coverage appears to exercise:
  - Back to `approach_selection`
  - changing the approach
  - resubmitting through the newly selected branch
- The current Step 4 back test stops at stale-value clearing in [WorkflowFormRuntime.test.ts:492](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L492).
- Current retry coverage is generic rather than Step 4-specific in [WorkflowFormRuntime.test.ts:555](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L555).
- The webview suites were reported to pass after proto regeneration:
  - `ChatRow.test.tsx`
  - `useMessageHandlers.test.tsx`
- The root workflow-form unit runner was reported to have unresolved `@shared/proto` import issues in this workspace during targeted execution, so targeted backend verification remains less reliable than it should be for this body of work.

## Resume Guidance

When this project resumes, do not restart from older action plans alone.

Start from:

- this pause-state document
- [workflow-form-v2-architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/workflow-form-v2-architecture.md)
- [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/requirements.md)
- [remediation-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-v2/remediation-plan.md)
- the broader workflow-runtime docs in [agent-101.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/agent-101.md)

The next phase should begin by deciding how the broader workflow architecture will provide a canonical per-workflow orchestration/config layer for the shared runtime capabilities.
