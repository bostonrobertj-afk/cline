# Execution 03: Workflow Corpus And Documentation Migration

## Objective

Rewrite the managed workflow authoring corpus and the managed workflow documentation so they align with the decoupled runtime contract and no longer instruct the agent to use `attempt_completion` as a checkpoint-resolution mechanism.

This workstream owns only authored docs and workflow assets. It must not change runtime code, prompt assembly code, or webview/controller code.

## Why This Exists

The current authored corpus still encodes the old mental model:

- final checkpoints are described as if `attempt_completion` is the mechanism that resolves them
- many step files frame checkpoints as pseudo-steps the agent must mentally translate
- workflow docs assume checkpoints are phase-exit gates mediated through the completion tool
- the formatting guide still teaches checkpoint semantics that are too tightly coupled to the old runtime

Once Execution 01 and 02 land, the authored corpus must match the new architecture or the model will continue to receive conflicting instructions.

## Discovery Summary

The primary source-of-truth files that must be updated are:

- [docs/managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md)
- all managed workflow assets referenced by [_bmad/_config/managed-workflows.json](/Users/robertboston/Documents/Cline%20Extension/cline/_bmad/_config/managed-workflows.json)

Important existing authored guidance patterns to remove or rewrite:

- “Use the attempt_completion tool to send a final message ... then HALT”
- “Never try to complete checkpoints using the complete_workflow_item tool. The correct tool for checkpoints is attempt_completion.”
- any wording that makes `attempt_completion` a checklist-gating mechanism rather than a communication/completion tool

## Owned Write Scope

This workstream owns only:

- `docs/managed-bmad-workflow-formatting-guide.md`
- `.cline/skills/**/workflow.md`
- `.cline/skills/**/step-*.md`
- `.cline/skills/**/steps*/step-*.md`
- other managed workflow phase markdown referenced by `_bmad/_config/managed-workflows.json`
- documentation files that directly explain managed workflow authoring or execution behavior

This workstream must not edit:

- `src/**`
- `webview-ui/**`
- runtime tests

## Required Design Outcome

After this migration:

1. Authored workflow files must describe checkpoints using the new workflow-native completion model from Execution 01.
2. Authored workflow files must no longer tell the agent that `attempt_completion` is how to satisfy a checkpoint.
3. The formatting guide must clearly separate:
   - workflow progression tools
   - communication/completion tools
4. Managed workflow step files should make dialogue obligations explicit without pretending the runtime will enforce them automatically.

## Required Changes

### 1. Update the canonical formatting guide

In [managed-bmad-workflow-formatting-guide.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/managed-bmad-workflow-formatting-guide.md):

- rewrite the checkpoint section to reflect the new runtime model
- explicitly state that `attempt_completion` is not the mechanism for resolving workflow checkpoints
- document the new workflow-native checkpoint/progression mechanism once Execution 01 defines it
- add a short authoring warning about not coupling human interaction to workflow-state tools

### 2. Update every managed workflow asset in the registry

Use [_bmad/_config/managed-workflows.json](/Users/robertboston/Documents/Cline%20Extension/cline/_bmad/_config/managed-workflows.json) as the source of truth.

For every managed workflow:

- rewrite `workflow.md` and all phase files so checkpoint language matches the new contract
- remove stale `attempt_completion` checkpoint instructions
- keep phase-progression instructions accurate
- keep placeholder guidance accurate

### 3. Normalize checkpoint authoring

Wherever a workflow currently implies that a checkpoint is “the final completion tool call,” rewrite it so the authoring distinction is clear:

- regular steps are completed through workflow progression
- checkpoints are workflow gates resolved through the workflow-native mechanism
- `attempt_completion` is reserved for communicating completion/final output to the human after workflow state is already satisfied

### 4. Re-audit dialogue language in managed workflows

For workflows that want mid-step or end-of-phase dialogue:

- keep the authored intent explicit
- use consistent `<ask>` and `<output>` structure
- remove wording that assumes the old runtime will magically pause on `<detail>`
- add explicit authoring notes where needed so future authors do not repeat the same assumption

This is especially important for:

- `bmad-code-review`
- `bmad-quick-dev`
- `bmad-quick-dev-new-preview`
- any workflow that presents findings, options, recommendations, approvals, or review outcomes

### 5. Update supporting plan/spec docs if they are now misleading

If any docs in `docs/managed-workflow-standardization/` or related managed-workflow remediation docs would materially mislead future contributors after this refactor, update them or add a short note pointing to the new contract.

Do not rewrite old historical plan docs wholesale. Only patch places that would otherwise send contributors down the wrong path.

## Migration Method

Use this order:

1. wait for Execution 01 to finalize the runtime contract name and semantics
2. update the formatting guide
3. update the highest-risk workflow assets first:
   - `bmad-code-review`
   - `bmad-generate-project-context`
   - any workflow whose final checkpoint currently names `attempt_completion`
4. complete the remainder of the managed workflow registry

## Acceptance Criteria

- no managed workflow markdown file in the active registry tells the agent to use `attempt_completion` to resolve a checkpoint
- the formatting guide teaches the new separation of concerns correctly
- managed workflow authoring instructions no longer couple checkpoint progression to human-agent communication
- high-risk workflows with dialogue or review presentation steps are rewritten to be internally consistent

## Deliverables

- updated formatting guide
- updated managed workflow markdown corpus
- a short migration note in this file under `## Completion Notes`

## Completion Notes

- Updated the managed workflow formatting guide and the `bmad-code-review` phase docs to remove checkpoint-resolution coupling to `attempt_completion` and replace it with workflow-native checkpoint-resolution language.
- QA PASS: verified the edited docs now describe checkpoint resolution without instructing the agent to use `attempt_completion` for checkpoints, and the formatting guide reflects the new checkpoint rule consistently.
