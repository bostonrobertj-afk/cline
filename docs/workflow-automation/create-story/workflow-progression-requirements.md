# Create Story Workflow Progression Requirements

## Purpose

This document defines the deterministic workflow progression requirements for [create-story.md](/Users/robertboston/Documents/Cline/Workflows/create-story.md).

This slice covers:

- deterministic support registration for `create-story.md`
- machine-checkable completion rules for `create-story.md` Steps 1, 2, and 5
- explicit non-deterministic handling for `create-story.md` Steps 3 and 4
- focused deterministic progression test coverage
- canonical deterministic progression documentation alignment

This slice does not define:

- workflow-start form behavior
- Step 2 tool implementation details beyond the artifact proof contract it must satisfy
- contextual tool exposure
- persona activation
- `workflow_progress_request` handler behavior

Those belong to separate capability documents.

## Source Of Truth

These requirements are grounded in:

- [create-story.md](/Users/robertboston/Documents/Cline/Workflows/create-story.md)
- [enablement-tracker.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/create-story/enablement-tracker.md)
- [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)
- [template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-story/template.md)
- [epic-delivery-spec-template.md](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/create-epics/epic-delivery-spec-template.md)
- [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
- [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts)

## Capability Boundary

This slice is about deterministic progression only.

It must:

- add `create-story.md` to the deterministic workflow support path
- deterministically complete Step 1 when the required workflow inputs are already provable
- deterministically complete Step 2 when the scaffold artifact is present and the scaffolded story content matches the selected story from `{epic_delivery_spec}`
- leave Steps 3 and 4 to the existing `workflow_progress_request` runtime path
- deterministically complete Step 5 when `{story_doc}` has reached terminal `ready-for-dev` status

It must not:

- auto-complete Step 3 or Step 4 from file state alone
- infer deterministic support from workflow prose instead of explicit runtime registration
- treat partial scaffold output as sufficient for Step 2
- weaken the Step 2 equivalence check to file existence only
- treat the template's initial `Status: backlog` as Step 5 completion

## Overall Progression Contract

For `create-story.md`, the canonical progression behavior must be:

- Step 1: deterministic
- Step 2: deterministic
- Step 3: user-mediated through `workflow_progress_request`
- Step 4: user-mediated through `workflow_progress_request`
- Step 5: deterministic

The deterministic evaluator must advance at most one checklist step at a time through the standard focus-chain path, then continue looping only while the next active `create-story.md` step is also provably complete.

## Runtime Registration Requirements

### 1. Supported workflow name registration

`create-story.md` must be added to the exact deterministic workflow-name contract used by the runtime.

This includes:

- the `DeterministicPlaceholderWorkflowName` union in [TaskState.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/TaskState.ts)
- the exact-name allowlist in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)
- workflow-specific evaluator dispatch in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts)

The canonical workflow name is:

- `create-story.md`

This slice must not add support for:

- `create-story`
- any path-qualified variant
- any inferred alias beyond the exact deterministic registration path already used by this subsystem

## Step-Specific Deterministic Requirements

### Step 1: Resolve the target story

Step 1 must complete only when all of the following are true:

- `{epic_delivery_spec}` exists in merged placeholder state and is non-empty after trimming
- `{story_number}` exists in merged placeholder state and is non-empty after trimming
- `{epic_delivery_spec}` resolves to an existing file path

Completion reason must clearly state that:

- `epic_delivery_spec` resolves to an existing file path
- `story_number` was already available in workflow placeholder state

Step 1 must not complete when:

- `{epic_delivery_spec}` is missing
- `{story_number}` is missing or blank after trimming
- `{epic_delivery_spec}` resolves to a missing file

### Step 2: Build story document scaffold

Step 2 must complete only when all of the following are true:

- `{story_doc}` exists in merged placeholder state and is non-empty after trimming
- `{output_folder}` exists in merged placeholder state and is non-empty after trimming
- `{epic_delivery_spec}` exists in merged placeholder state and is non-empty after trimming
- `{story_number}` exists in merged placeholder state and is non-empty after trimming
- `{story_doc}` resolves to an existing file path
- `{story_doc}` resolves under `{output_folder}/implementation-artifacts`
- `{epic_delivery_spec}` resolves to an existing file path
- the story document contains every required heading from the live story template
- the story content seeded from `{epic_delivery_spec}` matches the selected story `{story_number}` with only insignificant whitespace normalization allowed

#### Required template headings

Step 2 must require all of these exact headings from the live template:

- `## Story`
- `## Acceptance Criteria`
- `## Tasks / Subtasks`
- `## Senior Developer QA Findings`
- `## Dev Notes`
- `### Project Structure Notes`
- `### References`
- `## Dev Agent Record`
- `### Agent Model Used`
- `### Debug Log References`
- `### Completion Notes List`
- `### File List`

#### Required scaffold status

Step 2 must require the scaffold artifact to remain non-terminal at this stage.

For the current live template, the required top-level status value is:

- `Status: backlog`

Step 2 must not complete if the scaffold file is missing this status line.

#### Epic-delivery-spec equivalence requirement

Step 2 must verify that the story seeded into `{story_doc}` is the exact selected story from `{epic_delivery_spec}`.

This means the evaluator must:

- resolve and read `{epic_delivery_spec}`
- locate the `## Story {story_number}` block in the delivery spec
- extract the story content that the Step 2 scaffold contract is responsible for copying into `{story_doc}`
- resolve and read `{story_doc}`
- extract the corresponding story-seeded surfaces from `{story_doc}`
- compare the copied content for structural equivalence, allowing only insignificant whitespace normalization

At minimum, the seeded-content comparison must cover:

- the top-level story heading identity in `{story_doc}`
- the populated `## Story` section
- the populated `## Acceptance Criteria` section

If the Step 2 scaffold contract persists any additional story-seeded content from `{epic_delivery_spec}`, the deterministic evaluator must compare those exact additional surfaces too. This slice must not define a weaker comparison contract than the Step 2 scaffold tool actually implements.

#### Normalization rule

The Step 2 equivalence check must permit only insignificant whitespace normalization.

Allowed normalization:

- line ending differences
- leading or trailing whitespace at line boundaries
- repeated blank-line differences that do not change content meaning

Not allowed:

- changed wording
- dropped bullets or reordered content
- substituted identifiers or numbering
- untouched template placeholder tokens
- template stub content left in place where delivery-spec content should have been copied
- content copied from the wrong story block

#### Step 2 failure conditions

Step 2 must not complete when any of the following are true:

- `{story_doc}` is missing
- `{story_doc}` is outside `{output_folder}/implementation-artifacts`
- any required template heading is missing
- the scaffold still contains unresolved story-title placeholder text
- the `## Story` section still contains unresolved placeholder text
- the `## Acceptance Criteria` section still contains template stub content
- the selected story cannot be located in `{epic_delivery_spec}`
- the seeded content differs beyond insignificant whitespace normalization

### Step 3: Author story context and project structure notes

Step 3 must not be deterministically completed by the evaluator.

Step 3 is governed by the existing `workflow_progress_request` runtime path and must remain incomplete until the user chooses `Yes` on that response tool.

The deterministic evaluator must not treat story-document edits, project-structure-note presence, or any other file content as sufficient to complete Step 3.

### Step 4: Author implementation-ready story guidance

Step 4 must not be deterministically completed by the evaluator.

Step 4 is governed by the existing `workflow_progress_request` runtime path and must remain incomplete until the user chooses `Yes` on that response tool.

The deterministic evaluator must not treat populated tasks, subagent output, or any other file content as sufficient to complete Step 4.

### Step 5: Validate and finalize the story

Step 5 must complete only when all of the following are true:

- `{story_doc}` exists in merged placeholder state and is non-empty after trimming
- `{story_doc}` resolves to an existing file path
- `{story_doc}` contains top-level `Status: ready-for-dev`

Completion reason must clearly state that the story document now contains terminal `ready-for-dev` status.

Step 5 must not complete when:

- `{story_doc}` is missing
- `{story_doc}` resolves to a missing file
- the story document still contains `Status: backlog`
- the story document contains any non-terminal status instead of `ready-for-dev`

This slice does not require Step 5 to re-check live codebase seams. Its deterministic gate is the terminal story status.

## Evaluator Design Requirements

### 1. Explicit workflow-specific evaluator

`create-story.md` progression logic must be implemented as an explicit workflow-specific evaluator branch in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts).

This slice must not attempt to infer progression rules by parsing arbitrary workflow prose.

### 2. Narrow helper additions only

If helper functions are added, they must be narrowly scoped to support `create-story.md` artifact checks such as:

- story-doc path resolution
- required-heading verification
- story-block extraction from `{epic_delivery_spec}`
- insignificant-whitespace normalization for equivalence comparison

Any helper introduced for this slice must be driven by the actual `create-story` artifact contracts above.

### 3. No placeholder mutation requirement

This slice does not require any placeholder-value mutation or deterministic-state mutation for `create-story.md`.

It only requires checklist advancement plus human-readable auto-completion notices when deterministic completion is proven.

## Test Requirements

Focused unit coverage must be added or updated in [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts).

At minimum, the tests must cover:

- support-list inclusion for `create-story.md`
- Step 1 completion when `{epic_delivery_spec}` exists and `{story_number}` is non-empty
- Step 1 failure when `{epic_delivery_spec}` is missing
- Step 1 failure when `{story_number}` is blank
- Step 1 failure when `{epic_delivery_spec}` points to a missing file
- Step 2 completion when `{story_doc}` exists in the canonical implementation-artifacts location, contains every required template heading, contains `Status: backlog`, and exactly matches the selected story from `{epic_delivery_spec}` after insignificant-whitespace normalization
- Step 2 failure when a required heading is missing
- Step 2 failure when the selected story cannot be found in `{epic_delivery_spec}`
- Step 2 failure when copied story content differs from `{epic_delivery_spec}`
- Step 2 failure when template stub content remains in `## Acceptance Criteria`
- Step 2 failure when `{story_doc}` is outside the canonical implementation-artifacts location
- Step 2 failure when the story file has a terminal status instead of `backlog`
- Step 5 completion when `{story_doc}` contains `Status: ready-for-dev`
- Step 5 failure when the story still contains `Status: backlog`
- proof that Steps 3 and 4 do not auto-complete from otherwise-present story artifacts
- at least one multi-step deterministic pass showing Step 1 and Step 2 can complete back-to-back when both are already provable

## Documentation Requirements

Once runtime support is implemented, [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md) must be updated so that:

- `create-story.md` appears in the supported deterministic workflow list
- the `create-story.md` step behavior is described accurately
- the Step 2 artifact-equivalence gate is documented as a content-verification check, not just a file-existence check
- the Step 3 and Step 4 `workflow_progress_request` boundary is documented accurately

## Non-Requirements

This slice does not require:

- implementing the Step 2 scaffold-building tool
- changing the `workflow_progress_request` question or options
- adding new response tools
- altering contextual tool exposure
- adding workflow-end automation beyond the standard deterministic progression path
