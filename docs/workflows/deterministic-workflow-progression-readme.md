# Deterministic Workflow Progression
## Purpose
Deterministic workflow progression is the runtime capability that auto-completes certain placeholder-workflow steps when the repo can prove that the step is already satisfied from task state, placeholder values, or task-written artifacts.

Its job is to reduce unnecessary model turns and keep the focus-chain checklist aligned with real runtime state for supported workflows.

## System Position
This capability lives in [deterministicPlaceholderProgression.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts) and sits inside the placeholder-workflow / focus-chain runtime path.

It is called from:

- [focus-chain/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/index.ts) during normal focus-chain checklist updates
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts) as a fallback when the focus-chain manager is not present

It also influences post-tool guidance indirectly, because handlers such as [SetWorkflowPlaceholdersToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/SetWorkflowPlaceholdersToolHandler.ts) change their next-step messaging when a deterministic workflow is active.

## Responsibilities
- Recognize whether the active placeholder workflow is one of the explicitly supported deterministic workflows.
- Resolve the current active step from the checklist plus workflow document.
- Evaluate whether that step is already complete from runtime facts rather than from a model judgment.
- Advance the checklist by exactly one step at a time using the standard focus-chain sentinel path, then continue looping while more steps can be deterministically completed.
- Record human-readable auto-completion notices for later prompt/UI surfacing.
- Update derived placeholder values or deterministic state when a supported evaluator is allowed to do so.

## Non-Responsibilities
- It does not parse arbitrary workflow metadata into progression rules.
- It does not make unsupported workflows deterministic.
- It does not render workflow forms or collect user input.
- It does not execute tools, create artifacts, or write files on its own.
- It does not replace the normal focus-chain checklist machinery; it only feeds into it.
- It does not decide whether a workflow document is well-authored in general.
- It does not own workflow teardown or workflow-end automation; those run afterward through `workflowCompletionRunner`.

## Inputs
Primary inputs:

- `taskState`, especially:
  - `activePlaceholderWorkflowSource`
  - stable and dynamic placeholder values
  - task start time
  - pending deterministic state
  - placeholder-workflow write-proof paths
- the current checklist markdown
- optional `toolContext`, which can carry current-turn tool execution facts that drive workflow-specific deterministic gates

Runtime dependencies used by evaluators:

- active-step resolution from the workflow document
- merged placeholder values
- current-task write proofs for artifacts
- filesystem reads and stats for referenced files
- focus-chain checklist update evaluation

## Outputs
The main output is a [DeterministicPlaceholderProgressionResult](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts) containing:

- updated checklist markdown
- whether placeholder values changed
- whether deterministic state changed
- whether auto-completion notices were added

Side effects may also include:

- updates to `taskState.activePlaceholderWorkflowValues`
- updates to `taskState.activePlaceholderWorkflowDeterministicState`
- appended entries in `pendingAutoCompletedPlaceholderWorkflowStepNotices`

## Invariants
- Deterministic support is opt-in by exact workflow name, not by convention.
- The currently supported workflows are:
  - `code-review.md`
  - `dev-story.md`
  - `review-adversarial-general.md`
  - `blind-review.md`
  - `review-edge-case-hunter.md`
- A step is auto-completed only when its evaluator returns both `completed: true` and a concrete reason.
- Checklist advancement still happens through the standard focus-chain update path; this capability does not mutate checklist markdown ad hoc.
- Some artifact-backed completion checks rely on current-task write proofs, while others intentionally use plain file existence or file-stat checks depending on the workflow step.
- Unsupported workflows and unresolved steps are left unchanged.

## Core Logic
At a high level, the runtime does this:

1. Resolve the active step from the current checklist and active placeholder workflow.
2. Exit immediately if there is no active step or the workflow is not in the supported allowlist.
3. Dispatch to a workflow-specific evaluator for the current step.
4. If the evaluator cannot prove completion, stop.
5. If it can prove completion:
   - carry forward any placeholder-value changes
   - carry forward any deterministic-state changes
   - append an auto-completion notice with the evaluator’s reason
   - advance the checklist by one step
6. Re-resolve the next active step and repeat until no further deterministic completion is possible.

Current evaluator examples:

- `code-review.md`
  - Step 1 checks placeholder presence
  - Step 2 requires task-written `diff_output` with a surviving write proof
  - Step 3 requires task-written `review_input` with a surviving write proof
  - Step 4 derives `review_mode` from available artifacts
  - Step 5 requires every required review layer to have either an already-recorded completion source or a current-task fallback prompt artifact
  - Step 6 requires a task-written `spec_file` that now carries a terminal review status
  - Step 7 completes when the current turn successfully executes `attempt_completion`
- `review-adversarial-general.md`
  - Step 1 completes when `diff_output` resolves to an existing file path
  - Step 2 completes when `adversarial-review-findings.md` was written during the current task and still exists
  - Step 3 completes when the current turn successfully executes `attempt_completion`
- `blind-review.md`
  - Step 1 completes when `diff_output` resolves to an existing file path
  - Step 2 completes when `adversarial-review-findings.md` was written during the current task and still exists
  - Step 3 completes when the current turn successfully executes `attempt_completion`
- `review-edge-case-hunter.md`
  - Step 1 completes when `review_input` and `diff_output` both resolve to existing file paths
  - Step 2 completes when `edge-case-review-findings.md` was written during the current task and still exists
  - Step 3 completes when the current turn successfully executes `attempt_completion`
- `dev-story.md`
  - steps inspect story-file existence, checklist completion, and top-level status values
  - Step 4 completes when the current turn successfully executes `attempt_completion`

## Failure Modes
- The active workflow is unsupported, so deterministic progression is skipped.
- The active step cannot be resolved from the workflow/checklist state.
- Required placeholders are absent or blank.
- Expected artifacts were not written during the current task, so write-proof checks fail.
- Referenced files cannot be read or stat-ed.
- A multi-artifact gate cannot be proven because one required path is missing, blank, or points to a missing file.
- Expected file content markers such as top-level `Status:` values are missing or non-terminal.
- A derived placeholder value may already match the needed value; in that case the step can still auto-complete, but no placeholder-value mutation is recorded.

## Usage
Use this capability when a placeholder workflow step should advance based on repo-verifiable state rather than another assistant turn.

In normal runtime flow:

- a tool response updates or rechecks checklist state
- deterministic progression runs
- the checklist may auto-advance
- if the checklist just became fully complete, workflow-end handling may run immediately afterward
- focus-chain prompting then shows the next real active step

When deterministic progression is reached from pre-turn workflow-form resolution, focus-chain prompting and AI invocation begin only after the pre-turn system-owned decision loop has no further eligible work.

This is especially important for steps whose completion is defined by:

- an artifact being written in the current task
- a file status changing to a known terminal value
- a placeholder being deterministically derivable from already-written artifacts

## Extension Guidelines
- Add support only when the completion criteria are objectively machine-checkable.
- Extend [isDeterministicPlaceholderWorkflowSupported(...)](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/deterministicPlaceholderProgression.ts) and the workflow-specific evaluator dispatch together.
- Keep workflow-specific logic explicit and hardcoded; do not quietly infer behavior from free-form workflow prose.
- Use current-task write proofs for generated artifacts whenever completion depends on task-local writes.
- Use toolContext-based gates only when a workflow step explicitly treats a successful current-turn tool execution as its machine-checkable done signal.
- Return a concrete completion reason for every deterministic auto-completion.
- Keep placeholder mutations narrow and intentional.
- Add or update focused unit tests in [deterministicPlaceholderProgression.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/focus-chain/__tests__/deterministicPlaceholderProgression.test.ts) for every new evaluator branch.

## Examples
- In `code-review.md`, if `diff_output` was written during this task and the artifact still exists, Step 2 can complete without asking the model to re-confirm it.
- In `code-review.md`, if `review_input` was written during this task and the artifact still exists, Step 3 can complete without asking the model to re-confirm it.
- In `code-review.md`, if both `review_input` and `diff_output` exist as current-task artifacts, Step 4 derives `review_mode = full` automatically.
- In `review-adversarial-general.md`, if `diff_output` resolves to an existing file, Step 1 can complete immediately on the next deterministic pass.
- In `review-adversarial-general.md`, if Step 2 writes `{output_folder}/adversarial-review-findings.md` during the current task and the artifact still exists, Step 2 can auto-complete.
- In `blind-review.md`, if `diff_output` resolves to an existing file, Step 1 can complete immediately on the next deterministic pass.
- In `blind-review.md`, if Step 2 writes `{output_folder}/adversarial-review-findings.md` during the current task and the artifact still exists, Step 2 can auto-complete.
- In `blind-review.md`, Step 3 can auto-complete when the current turn successfully executes `attempt_completion`.
- In `review-edge-case-hunter.md`, if `review_input` and `diff_output` both resolve to existing files, Step 1 can complete immediately on the next deterministic pass.
- In `review-edge-case-hunter.md`, if Step 2 writes `{output_folder}/edge-case-review-findings.md` during the current task and the artifact still exists, Step 2 can auto-complete.
- In `review-edge-case-hunter.md`, Step 3 can auto-complete when the current turn successfully executes `attempt_completion`.
- In `code-review.md`, if every required review layer already has a current-task fallback prompt artifact, Step 5 can auto-complete without another model confirmation turn.
- In `code-review.md`, if `spec_file` was updated during this task and now contains a terminal review status, Step 6 can auto-complete.
- In `dev-story.md`, if the story file’s `## Tasks / Subtasks` section has no unchecked items, the task-execution step can auto-complete.
- In `code-review.md`, Step 7 can auto-complete when the current turn successfully executes `attempt_completion`.
- In `review-adversarial-general.md`, Step 3 can auto-complete when the current turn successfully executes `attempt_completion`.
- In `dev-story.md`, Step 4 can auto-complete when the current turn successfully executes `attempt_completion`.

## (Optional) Performance
The capability is lightweight for unsupported workflows and early-exit cases.

For supported workflows, cost is mostly:

- active-step resolution
- a small amount of file I/O for the current step
- repeated step evaluation only while deterministic auto-completions keep succeeding

Because the loop advances one checklist step at a time and stops on the first non-provable step, work stays bounded by the number of immediately satisfiable steps.

## (Optional) Observability
There is no standalone telemetry surface dedicated only to this module.

In practice, you observe it through:

- checklist changes emitted through normal `task_progress` flow
- persisted placeholder-workflow metadata when placeholder values or deterministic state change
- pending auto-completed step notices
- workflow-end handoff into `workflowCompletionRunner` when deterministic progression fully completes the active placeholder workflow
- focus-chain behavior that immediately starts showing the next step instead of repeating the previous one
- the unit test suite covering supported progression branches
