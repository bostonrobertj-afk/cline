---
title: Recommendation For More Direct Workflow Paths
date: 2026-04-01
inputs:
  - /Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts
  - /Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts
  - /Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/mcp.ts
  - /Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts
  - /Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/continuation_turn.ts
  - /Users/robertboston/Documents/Cline/Workflows/dev-story.md
  - /Users/robertboston/Documents/Cline/Workflows/blind-review.md
  - /Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md
  - /Users/robertboston/Documents/Cline/Workflows/review-adversarial-general.md
  - /Users/robertboston/Documents/Cline Extension/cline/docs/context-management/dev-story-step-2-agent-trace-analysis.md
---

# Recommendation For More Direct Workflow Paths

## Purpose

This document recommends how to update tool availability, contextual tool schema, and prompt instructions so these workflows push the model toward simpler, more direct paths:

- `dev-story.md`
- `blind-review.md`
- `review-edge-case-hunter.md`
- `review-adversarial-general.md`

The key distinction is:

- `dev-story` is implementation-first
- the three review workflows are review-first

They should not share the same discovery posture.

## Current Shaping Layers

### 1. Tool availability is too broad

The current matrix rows are:

- `dev-story.md` Step 2:
  - `DOC_READ`
  - `DOC_WRITE`
  - `CODE_READ`
  - `INDXR_DISCOVERY`
  - `INDXR_SOURCE_READ`
  - `INDXR_SYMBOL_GRAPH`
  - `LOCAL_EXEC`
- `review-adversarial-general.md` Step 2:
  - `DOC_READ`
  - `CODE_READ`
  - `INDXR_DISCOVERY`
  - `INDXR_SOURCE_READ`
  - `INDXR_SYMBOL_GRAPH`
- `blind-review.md` Step 2:
  - `DOC_READ`
  - `CODE_READ`
  - `INDXR_DISCOVERY`
  - `INDXR_SOURCE_READ`
  - `INDXR_SYMBOL_GRAPH`
  - `DOC_WRITE`
- `review-edge-case-hunter.md` Step 2:
  - `DOC_READ`
  - `CODE_READ`
  - `INDXR_DISCOVERY`
  - `INDXR_SOURCE_READ`
  - `INDXR_SYMBOL_GRAPH`
- `review-edge-case-hunter.md` Step 3:
  - `DOC_READ`
  - `CODE_READ`
  - `INDXR_DISCOVERY`
  - `INDXR_SOURCE_READ`
  - `INDXR_SYMBOL_GRAPH`

Sources:

- [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts)
- [dev-story.md](/Users/robertboston/Documents/Cline/Workflows/dev-story.md)
- [blind-review.md](/Users/robertboston/Documents/Cline/Workflows/blind-review.md)
- [review-edge-case-hunter.md](/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md)
- [review-adversarial-general.md](/Users/robertboston/Documents/Cline/Workflows/review-adversarial-general.md)

Because [contextualNativeToolFilter.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts) uses the matrix row directly to filter both built-in and MCP tools, these workflows expose:

- built-in search/read tools
- multiple overlapping Indxr discovery tools
- multiple overlapping Indxr symbol-graph tools
- multiple overlapping source-read tools

That is too much overlap for both workflow classes:

- too many exploration options for `dev-story` implementation work
- too many widening options for review workflows that are supposed to remain anchored to provided material

### 2. The generic tool-use section is not the main driver

The generic tool-use guidance is broad and mostly procedural:

- choose the most appropriate tool
- batch independent actions
- wait for tool results
- proceed step-by-step

That guidance can increase caution, but it does not by itself tell the model to explore the codebase structurally before opening an obvious file.

Source:

- [tool_use/guidelines.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/tool_use/guidelines.ts)

So the main prompt problem is not the generic tool-use section. The main prompt problem is the workflow-agnostic Indxr/schema bias described below.

### 3. The contextual schema strongly biases toward Indxr-first exploration

The compact/native tool descriptions explicitly tell the model to:

- default to Indxr first in `use_mcp_tool`
- use built-in `search_files` only when Indxr is unavailable or insufficient
- use built-in `read_file` only after Indxr narrows the work
- use `read_file_range` only after Indxr narrows the target

Sources:

- [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L486)
- [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L197)

For `dev-story`, this reverses the desired path for a narrow implementation task that already has:

- a story file
- latest review findings
- suggested file touch hints

For the review workflows, this also over-amplifies widening behavior:

- `blind-review.md` says to use the diff as the primary source of truth and inspect only the minimum additional code needed
- `review-adversarial-general.md` says to constrain exploration to what is relevant to the review target
- `review-edge-case-hunter.md` says to trace directly reachable paths from the provided content

The current schema bias does not help the model do that. It encourages one more structural lookup before committing to a local conclusion.

### 4. The workflow instructions are strict, but they do not define a hierarchy

`dev-story` Step 2 says:

- read the next unchecked task directly from the story
- open only the files needed
- implement the smallest correct change
- do not search across the repo unless the story task requires discovery

That is directionally correct, but it does not say what to do first when both are true:

- the story already points to likely files
- the tool environment offers many structural discovery tools

So the model resolves the ambiguity by taking the safest-feeling path:

- one more lookup
- one more summary
- one more targeted source read

The review workflows have the same missing hierarchy:

- `blind-review.md` does not operationalize “minimum additional code inspection required”
- `review-adversarial-general.md` does not operationalize “constrain your exploration to what is relevant”
- `review-edge-case-hunter.md` does not operationalize “directly reachable from the changed lines” into an ordered tool path

## What The Trace Suggests

The traced Story 4.2 run did not wander aimlessly. It behaved like a cautious contract debugger:

- task noun -> symbol lookup
- symbol lookup -> file summary
- file summary -> targeted source read
- targeted source read -> tiny patch
- tiny patch -> test rerun
- failed or uncertain test -> another adjacent seam lookup

Source: [dev-story-step-2-agent-trace-analysis.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/context-management/dev-story-step-2-agent-trace-analysis.md)

That means the current environment is making exploratory seam validation easier than local commitment.

## Recommendation

## A. Split implementation and review workflow policy

The first recommendation is conceptual:

- do not treat `dev-story` and the review workflows as needing the same discovery posture

They serve different purposes:

- `dev-story` is implementation-first
- `blind-review`, `review-edge-case-hunter`, and `review-adversarial-general` are review-first

So the tool matrix and schema guidance should diverge more sharply between them.

## B. Narrow `dev-story` Step 2 tool availability

The highest-value change for `dev-story` is to reduce the Step 2 row in the contextual tool matrix.

### Recommended target behavior

Step 2 should primarily support:

- direct story reading
- direct file reading
- direct patching
- narrow testing

It should not provide a broad investigation surface by default.

### Recommended matrix change

Replace the current Step 2 row:

- `["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "LOCAL_EXEC"]`

with a narrower implementation row:

- `["DOC_READ", "DOC_WRITE", "CODE_READ", "LOCAL_EXEC"]`

Optional fallback alternative if some Indxr support must remain:

- introduce a new bundle specifically for implementation-only Indxr use
- keep only:
  - `lookup_symbol`
  - `read_source`

Do not include for `dev-story` Step 2:

- `search_relevant`
- `search_signatures`
- `list_declarations`
- `get_tree`
- `get_imports`
- `get_stats`
- `get_diff_summary`
- `get_token_estimate`
- `get_file_summary`
- `get_file_context`
- `batch_file_summaries`
- `get_callers`
- `get_public_api`
- `get_related_tests`
- `get_dependency_graph`

Why:

- these tools are valuable for review, investigation, and architecture tracing
- they are overpowered for a local story-implementation step
- they made the Story 4.2 run validate too many adjacent seams before committing

## C. Keep review workflows review-shaped, but reduce overlap

The review workflows should not be collapsed all the way down to the `dev-story` implementation posture. They legitimately need more structural inspection than `dev-story`.

But they still need a narrower and more ordered discovery surface than they have now.

### Recommended review matrix posture

For these workflows:

- `blind-review.md` Step 2
- `review-adversarial-general.md` Step 2
- `review-edge-case-hunter.md` Step 2
- `review-edge-case-hunter.md` Step 3

remove `INDXR_SYMBOL_GRAPH` from the default row and keep:

- `DOC_READ`
- `CODE_READ`
- `INDXR_DISCOVERY`
- `INDXR_SOURCE_READ`
- `DOC_WRITE` where the workflow needs a findings artifact

Why remove `INDXR_SYMBOL_GRAPH`:

- it contains the tools most likely to widen scope beyond the supplied content:
  - `lookup_symbol`
  - `explain_symbol`
  - `get_callers`
  - `get_public_api`
  - `get_related_tests`
  - `get_dependency_graph`
- these are useful when a review truly needs structural escalation
- they should not be the default first-line inspection surface for diff-anchored or content-anchored review steps

### Escalation rule for review workflows

If symbol-graph tools remain available at all, they should be exposed only after a prior direct-content step has already happened:

1. read the diff or review input
2. inspect directly changed files or directly referenced code
3. only then allow symbol, caller, or dependency traversal if the direct read reveals a concrete unresolved question

## D. Reverse the `dev-story` Step 2 schema guidance priority

For `dev-story` Step 2 specifically, the schema should no longer say “Indxr first.”

### Current problem

The compact/native descriptions in `spec.ts` and `mcp.ts` currently frame built-in file tools as fallback tools and Indxr as the default exploration path.

That makes the agent behave like this:

- lookup symbol
- get file summary
- read source
- only later open the obvious file

### Recommended guidance change

When the active workflow is `dev-story.md` and the active step is `2`, change the effective guidance to:

- start with the story file and the story’s likely file touch hints
- if the story or latest review findings name a concrete file, open that file directly
- use built-in `search_files`, `read_file`, and `read_file_range` first for local implementation work
- use Indxr only if the first direct file pass fails to reveal the implementation seam

In other words:

- `dev-story` Step 2 should be built-in-first
- Indxr should become an escalation path, not the default path

## E. Add workflow-specific review hierarchies

The review workflows need hierarchy too, but not the same one as `dev-story`.

### `blind-review.md` Step 2

Recommended hierarchy:

1. read `{diff_output}` first
2. inspect only directly changed non-Markdown files from that diff
3. only if the diff references a helper or contract not understandable in-place, open the smallest supporting source region
4. do not branch into caller graphs, related tests, or dependency graphs unless a finding cannot be confirmed without it

### `review-edge-case-hunter.md` Step 2 / Step 3

Recommended hierarchy:

1. walk branching paths in the provided review scope first
2. inspect directly reachable code from those branches
3. do not widen to broader symbolic graph traversal unless the provided content explicitly references an external function whose behavior is required to determine whether the path is handled

### `review-adversarial-general.md` Step 2

Recommended hierarchy:

1. use `{diff_output}` as the primary review boundary
2. use `{spec_file}` or `{review_input}` only to establish expected behavior
3. inspect changed files directly before any graph-style exploration
4. use structural tools only to resolve a concrete unanswered question created by the changed code

## F. Add a file-first hierarchy to `dev-story` Step 2 prompting

The workflow instructions should explicitly rank the next move choices.

### Recommended `dev-story` Step 2 decision order

When working an unchecked task:

1. If the story already names likely files, open those first.
2. If the latest review finding cites a file or line location, inspect that cited file before any repo-wide discovery.
3. If the story lists a suggested file touch list, treat that as the first discovery boundary.
4. Use repo-wide search only if those direct file reads fail to reveal the relevant seam.

This is the missing hierarchy in the current `dev-story.md` step text.

## G. Add stop-exploring boundaries for both workflow classes

The agent currently has many ways to keep validating one more seam.

### For `dev-story`

A direct-path implementation prompt needs a clear stopping rule such as:

- after opening 1-2 implementation files for the current item, patch or run a focused test before performing additional discovery
- do not use a second discovery tool family unless the first direct read produced a concrete mismatch or missing seam

### For the review workflows

The stop-exploring boundary should be phrased differently:

- do not open a second-order supporting file unless the directly reviewed material contains a concrete unresolved dependency
- do not use caller, public-API, related-test, or dependency-graph tools unless you can name the exact unresolved question they are needed to answer

These workflows are supposed to be skeptical, but still bounded.

## H. Keep Indxr strong where it adds the most value

This recommendation is not “remove Indxr.”

Indxr still fits well in:

- review workflows
- code-review
- broader architecture and investigation workflows

The recommendation is narrower:

- do not expose the full Indxr exploration surface during a local implementation workflow step unless the step is itself investigatory
- and in review workflows, keep Indxr available mainly for first-order diff or content anchoring and targeted source reads, not unconstrained symbolic widening

## I. Recommended Workflow-Specific Tool Posture

The simplest way to make these workflows behave differently is to treat them as two classes with four concrete profiles.

### `dev-story.md` Step 2

Primary posture:

- open the story and cited files directly
- patch quickly
- validate with a narrow test run

Recommended tool surface:

- keep:
  - `DOC_READ`
  - `DOC_WRITE`
  - `CODE_READ`
  - `LOCAL_EXEC`
- remove by default:
  - `INDXR_DISCOVERY`
  - `INDXR_SOURCE_READ`
  - `INDXR_SYMBOL_GRAPH`

Rationale:

- this workflow already has strong task-local guidance
- the full Indxr surface turns local implementation into contract triangulation

### `blind-review.md` Step 2

Primary posture:

- inspect the diff first
- read only directly changed or directly referenced code
- write bounded findings

Recommended tool surface:

- keep:
  - `DOC_READ`
  - `CODE_READ`
  - `INDXR_DISCOVERY`
  - `INDXR_SOURCE_READ`
  - `DOC_WRITE`
- remove by default:
  - `INDXR_SYMBOL_GRAPH`

Rationale:

- blind review benefits from targeted discovery and source reads
- it should not start from caller graphs or dependency graphs when the diff is supposed to be the review boundary

### `review-edge-case-hunter.md` Step 2 / Step 3

Primary posture:

- follow branches directly reachable from the changed code
- widen only when the changed path explicitly depends on an external seam

Recommended tool surface:

- keep:
  - `DOC_READ`
  - `CODE_READ`
  - `INDXR_DISCOVERY`
  - `INDXR_SOURCE_READ`
- remove by default:
  - `INDXR_SYMBOL_GRAPH`

Rationale:

- this workflow legitimately needs more path tracing than `blind-review`
- but its exploration boundary is still “directly reachable paths,” not broad graph traversal

### `review-adversarial-general.md` Step 2

Primary posture:

- start from the diff and expected behavior inputs
- inspect changed code directly
- escalate only when the changed code leaves a concrete unanswered question

Recommended tool surface:

- keep:
  - `DOC_READ`
  - `CODE_READ`
  - `INDXR_DISCOVERY`
  - `INDXR_SOURCE_READ`
- remove by default:
  - `INDXR_SYMBOL_GRAPH`

Rationale:

- adversarial review needs skepticism, not unrestricted exploration
- the current symbol-graph bundle makes it too easy to widen before the changed code has been fully inspected

## J. Keep Generic Tool-Use Guidance Stable, But Make Indxr Guidance Workflow-Specific

The prompt-layer recommendation is not to rewrite the whole tool-use section.

### Keep mostly as-is

The generic guidance in `tool_use/guidelines.ts` should remain mostly intact because it still provides useful baseline behavior:

- think before using tools
- choose the smallest appropriate tool
- wait for results
- verify before completing

Those instructions are not the reason `dev-story` expanded into a long structural exploration loop.

### Change the workflow-sensitive layer instead

The layer that should change is the Indxr/schema guidance in:

- [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts)
- [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts)

Recommended prompt posture:

- `dev-story.md` Step 2:
  - built-in/file-first
  - Indxr only when direct file reads and narrow built-in search fail to reveal the seam
- `blind-review.md`, `review-edge-case-hunter.md`, `review-adversarial-general.md`:
  - direct-material-first
  - diff/review-input/content first
  - targeted Indxr discovery and source reads allowed
  - symbol-graph widening only when there is a named unresolved question

### Optional small generic tool-use refinement

If one generic prompt tweak is made, it should be small and hierarchy-preserving, for example:

- prefer opening the most likely concrete file before using a second discovery tool family

But that should remain secondary to the workflow-specific schema changes above.

## Recommended Change Set

If only one pass is made, these are the highest-value updates:

1. Narrow `dev-story.md` Step 2 in [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts) to remove `INDXR_DISCOVERY` and `INDXR_SYMBOL_GRAPH`.
2. Narrow the review workflow rows in the same matrix by removing `INDXR_SYMBOL_GRAPH` from:
   - `blind-review.md` Step 2
   - `review-adversarial-general.md` Step 2
   - `review-edge-case-hunter.md` Step 2
   - `review-edge-case-hunter.md` Step 3
3. Make `dev-story` Step 2 schema guidance built-in-first instead of Indxr-first in:
   - [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts)
   - [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts)
4. Do not do a broad rewrite of [tool_use/guidelines.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/tool_use/guidelines.ts); at most add a small concrete-file-first hint if needed.
5. Add explicit review hierarchies to:
   - [blind-review.md](/Users/robertboston/Documents/Cline/Workflows/blind-review.md)
   - [review-edge-case-hunter.md](/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md)
   - [review-adversarial-general.md](/Users/robertboston/Documents/Cline/Workflows/review-adversarial-general.md)
6. Add explicit file-first and stop-exploring hierarchy to `dev-story.md` Step 2.

## Expected Behavioral Shift

If the above changes are made, the intended `dev-story` path becomes:

1. read `project-context`
2. read the story task
3. open the story-named implementation file directly
4. patch source and tests
5. run a narrow test target
6. only if the test reveals a new seam, open one adjacent file

The intended review-workflow path becomes:

1. read the supplied diff or review input
2. inspect directly changed or directly referenced code first
3. write findings from that bounded scope
4. only widen into structural exploration when a specific unresolved question forces it

Those are the simpler, more direct paths these workflows should take.

## Bottom Line

The current workflow environments combine:

- too many overlapping exploration tools
- schema guidance that elevates Indxr over direct file work
- generic tool guidance that is acceptable on its own, but not enough to counteract the schema bias
- workflow constraints that discourage wandering but do not tell the model how to choose a first seam

That combination makes exploratory seam validation the path of least resistance.

The fix for `dev-story` is to make local implementation work feel easier than structural exploration:

- fewer tools
- reversed priority
- an explicit file-first hierarchy
- a hard stop-exploring boundary
- no broad rewrite of the generic tool-use section

The parallel fix for the review workflows is:

- preserve bounded review capability
- remove the graph-heavy widening tools from default exposure
- define a direct-material-first order of operations
- require a named unresolved question before broader structural escalation
