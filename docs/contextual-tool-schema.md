# Contextual Tool Schema

## Purpose

Document the current understanding and agreed direction for aggressively trimming the native tool schema sent each turn, using existing contextual indicators where possible.

## Current Runtime Facts

- In native tool mode, tools are sent as structured schema alongside the request, not only described in the system prompt.
- In minimal/native GPT mode:
  - the inline human-readable tools catalog is omitted from the system prompt
  - the native tool schema descriptions are compacted
  - the structural schema is unchanged
- Connected MCP tools are emitted in native schema with a prefixed runtime name of the form `<serverUid>0mcp0<toolName>`, not just the bare MCP tool name.
- For OpenAI Responses, `previous_response_id` helps reduce replayed conversation/input history, but the tool schema is still sent on each request.
- The current full native GPT tool schema is a meaningful token sink, on the order of a few thousand input tokens per turn.

## Agreed Goals

- Aggressively trim the native tool schema using contextual indicators already available or cheaply derivable at prompt-build time.
- Avoid scattering hard-coded workflow/step `if` statements throughout the codebase.
- Prefer symbolic, declarative gating over ad hoc branching.
- Keep the design provider-safe and centered in tool selection, not prompt-text hacks.
- Remove tools from the schema when the current run context makes them unusable or redundant.

## Existing Gating Mechanism

- Tool inclusion already supports `contextRequirements` on `ClineToolSpec`.
- Native tool selection already filters tools by those `contextRequirements`.
- This means contextual tool omission is already supported architecturally; the main missing piece is richer workflow-specific prompt context.

Relevant files:
- [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts)
- [types.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts)

## Placeholder Workflow Step Resolver

For placeholder workflows, the existing helper that determines the active step is:

- [placeholder-workflow-step-details.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/workflows/placeholder-workflow-step-details.ts)

Primary function:

- `getActivePlaceholderWorkflowStepDetails(...)`

What it already resolves:

- `sourceName`
- `stepNumber`
- `stepTitle`
- `stepHeading`
- `details`

How it determines the active step:

- finds the first incomplete checklist item
- parses the authored placeholder workflow
- matches by `stepNumber`, then normalized step title

This is already used by focus chain to inject the current placeholder workflow step instructions.

## Agreed Gating Signals

For placeholder workflows, we aligned that the effective gating signals already exist:

- workflow identifier: `sourceName`
- active step identifier: `stepNumber`

For the current intended use, `stepNumber` is sufficient as the step identifier.

We also aligned that `sourceName` is the placeholder workflow's name for this purpose.

## Agreed Prompt-Context Plumbing

We do not want tool selection logic to depend directly on focus-chain-local helper return objects.

Instead, the agreed direction is:

1. Resolve the active placeholder workflow step once using the existing helper.
2. Copy the needed fields into `SystemPromptContext`.
3. Let tool gating read those prompt-context fields.

Suggested prompt-context fields:

- `activePlaceholderWorkflowName?: string`
- `activePlaceholderWorkflowStepNumber?: number`

These would be populated from:

- `activePlaceholderWorkflowName <- stepDetails.sourceName`
- `activePlaceholderWorkflowStepNumber <- stepDetails.stepNumber`

This is not a second inference system. It is just normalizing existing resolved values into the shared prompt-context contract.

## Agreed Design Direction

We aligned that the long-term design should be symbolic/declarative rather than a spread of manual `if` blocks.

Preferred shape:

- keep the variant tool list as a superset
- evaluate contextual availability centrally during tool selection
- allow tools to declare workflow/step requirements symbolically

Conceptual example:

```ts
workflowRequirements: {
	placeholder: {
		workflowName: "code-review",
		stepNumbers: [3],
	},
}
```

Then a shared resolver can decide whether the tool should be included for the current turn.

## Additional Aligned Gating Rules

We also aligned on these contextual trimming rules:

- Do not expose `use_subagents` when `isSubagentRun === true`.
  - A subagent should not be offered the subagent-spawning tool in its own tool schema.
  - This should be enforced through contextual tool selection rather than prompt wording alone.

- Only expose response tools for the current `providerInfo.mode`.
  - In `act` mode, expose only the ACT-mode response tools.
  - In `plan` mode, expose only the PLAN-mode response tools.
  - Do not send both mode-specific response tool sets in the same native schema when only one mode is active.

These rules should be implemented as schema-level trimming, not just descriptive guidance in the system prompt.

## Explicit Non-Goals / Rejections

We explicitly do not want to gate tools by:

- parsing rendered prompt text
- parsing `activeWorkflowReminder`
- matching freeform step details text
- relying on the visible system prompt text for native-tool schema truth

We also do not want to hard-code workflow-step branching throughout unrelated files.

## Current Conclusion

The key missing capability is not discovery of gating signals. It is plumbing and declarative evaluation.

We already have:

- a context-based tool filtering mechanism
- an existing helper that resolves the active placeholder workflow name and step

The next implementation step, when chosen, should focus on:

- exposing the resolved placeholder workflow name + step number on `SystemPromptContext`
- adding a symbolic way for tools to declare workflow/step-scoped availability
- trimming native tool schema from that centralized selection layer

## Deterministic MCP Tool Name Resolution

When MCP tools are present in native schema, the emitted runtime name is not the canonical tool name. The runtime name is constructed as:

- `<serverUid> + "0mcp0" + <mcpToolName>`

The delimiter is the shared constant:

- `CLINE_MCP_TOOL_IDENTIFIER = "0mcp0"`

So any matrix rule that refers to MCP or Indxr tools must normalize emitted names deterministically:

```ts
const canonicalMcpToolName = rawName.includes("0mcp0")
	? rawName.split("0mcp0")[1] ?? rawName
	: rawName
```

Examples:

- `c2mYhF0mcp0lookup_symbol` -> `lookup_symbol`
- `c2mYhF0mcp0get_file_summary` -> `get_file_summary`
- `c2mYhF0mcp0get_dependency_graph` -> `get_dependency_graph`

Relevant files:

- [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/mcp.ts)
- [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts)
- [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts)

## Uniform Placeholder Workflow Screening Methodology

The placeholder-workflow matrix below is now grounded in one consistent screening pass instead of step-by-step intuition.

- Corpus screened: all 40 placeholder workflow files under `/Users/robertboston/Documents/Cline/Workflows`
- Total step bodies screened: 235 `## Step N:` sections
- Segmentation rule: parse each workflow by exact `## Step N:` headings and screen each step body independently
- Screening scope: keyword hits, explicit tool-name mentions, and whether the step text directs the main agent versus a spawned subagent

### Broad keyword taxonomy used on every workflow step

- `READ`
  - `read`, `review`, `load`, `open`, `inspect`, `scan`, `study`, `analyze`, `analyse`, `examine`, `identify`, `determine`, `understand`, `gather`, `collect`, `trace`, `map`, `enumerate`, `list`, `find`, `search`, `lookup`, `check`, `verify`, `validate`, `parse`, `compare`
- `WRITE`
  - `write`, `update`, `edit`, `revise`, `rewrite`, `modify`, `change`, `create`, `draft`, `append`, `insert`, `replace`, `persist`, `record`, `save`, `store`, `set`, `populate`, `fill`, `copy`, `rename`, `move`, `remove`, `delete`, `archive`, `normalize`, `shard`
- `EXECUTE`
  - `run`, `execute`, `test`, `build`, `compile`, `install`, `lint`, `format`, `diff`, `commit`, `patch`, `apply`, `generate`
- `RESEARCH`
  - `research`, `investigate`, `explore`, `survey`, `benchmark`, `look up`, `look-up`, `reference`, `sources`, `source`, `citations`
- `REPORT`
  - `summarize`, `summarise`, `present`, `report`, `document`, `explain`, `describe`, `recommend`, `propose`, `outline`, `plan`, `answer`
- `WORKFLOW`
  - `workflow`, `placeholder`, `frontmatter`, `checklist`, `step`, `status`, `route`, `continue`, `resume`, `progress`
- `INTERACT`
  - `ask`, `confirm`, `clarify`, `question`, `select`, `choose`, `respond`
- `DELEGATE`
  - `subagent`, `delegate`, `parallel`
- `SKILL`
  - `skill`
- `DIFF_REVIEW`
  - `diff`, `review`, `qa`, `adversarial`, `edge case`, `edge-case`

### Explicit tool-name screen applied uniformly

Every step was also screened for literal tool-name mentions. The corpus-level hits were:

- `set_workflow_placeholders`
- `build_review_diff_output`
- `use_skill`
- `search_files`
- `list_code_definition_names`
- `send_user_message`
- `attempt_completion`

These are signals, not blind auto-includes. If a tool name appears only inside an example prompt intended for a spawned subagent, it does not automatically widen the main agent's schema.

### Bundle derivation rules used for the matrix

Apply these rules in order for every step:

1. `CURRENT_MODE_RESPONSE` is always present for the active provider mode.
2. Direct main-agent explicit tool mentions override generic keyword inference.
3. `PLACEHOLDER_WRITE` is added only when the step explicitly says to set workflow placeholders, persist workflow variables, or update workflow status/frontmatter fields as a tracked state action.
4. `DIFF_BUILD` is added only when the step explicitly requires Git-backed diff construction or names `build_review_diff_output`.
5. `SUBAGENT_COORD` is added only when the step explicitly instructs the main agent to launch or coordinate subagents.
6. `WORKFLOW_ROUTE` is added only when the step explicitly instructs the main agent to invoke another workflow or skill directly.
7. `LOCAL_EXEC` is added when `EXECUTE` hits are operational, such as running tests, building artifacts, generating output through commands, producing diffs, or committing.
8. `EXTERNAL_RESEARCH` is added only when the step explicitly calls for current external information, version-sensitive verification, market/domain/technical research, or source/citation gathering beyond local repo documents.
9. `CODE_READ` is added instead of `DOC_READ` when the `READ` hits are clearly code-centric, such as references to source files, repo patterns, implementation details, imports, dependencies, tests, diffs, commits, patches, or code-structure inspection.
10. When `CODE_READ` is present and a connected MCP server exposes the canonical Indxr tool set, also add `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, and `INDXR_SYMBOL_GRAPH`.
11. `INDXR_MAINTENANCE` is added only when a step explicitly instructs the agent to reindex or refresh the code index. No current placeholder workflow step requires it.
12. `DOC_READ` is added for non-code reading tasks, including planning artifacts, workflow docs, templates, specs, briefs, reports, and other narrative or structured documents.
13. `DOC_WRITE` is added when the step directs the agent to create, update, append, revise, or finalize artifacts, specs, reports, briefs, or other persistent files.

This keeps the matrix below tied to one shared rubric rather than one-off interpretation.

## Placeholder Workflow Step Matrix

This section scopes only placeholder workflows under `/Users/robertboston/Documents/Cline/Workflows/`.

### Global rules

- Every step includes `CURRENT_MODE_RESPONSE`.
- `CURRENT_MODE_RESPONSE` means:
  - `act` mode: `send_user_message`, `ask_followup_question`, `attempt_completion`
  - `plan` mode: `send_user_message`, `ask_followup_question`, `generate_plan_output`
- Do not expose `use_subagents` when `isSubagentRun === true`.
- Managed workflows are out of scope for this matrix.
- The matrix below is an intentionally aggressive minimal allowlist for main-agent placeholder-workflow turns.
- If a provider cannot expose a listed tool family, that step should not automatically widen to the full default schema; any fallback widening should be an explicit later design decision.
- Each row below is derived from the uniform keyword + explicit-tool screen above, not from ad hoc step-by-step assumptions.
- When Indxr is connected, MCP-prefixed runtime names must be canonicalized by splitting on `0mcp0` before matching against the Indxr bundles in this matrix.
- The matrix below covers placeholder-workflow-relevant tool bundles only. The complete native schema also includes browser- and non-Indxr MCP-oriented tools that may be present at runtime even when no current placeholder workflow step explicitly calls for them.

### Bundle legend

- `DOC_READ`
  - `list_files`, `search_files`, `read_file`, `read_file_range`
- `CODE_READ`
  - `list_files`, `search_files`, `list_code_definition_names`, `read_file`, `read_file_range`
- `DOC_WRITE`
  - `apply_patch`
- `LOCAL_EXEC`
  - `execute_command`
- `PLACEHOLDER_WRITE`
  - `set_workflow_placeholders`
- `WORKFLOW_ROUTE`
  - `use_skill`
- `SUBAGENT_COORD`
  - `use_subagents`
- `DIFF_BUILD`
  - `build_review_diff_output`
- `EXTERNAL_RESEARCH`
  - `web_search`, `web_fetch`
  - only when the active provider exposes those tools
- `INDXR_DISCOVERY`
  - `search_relevant`, `search_signatures`, `list_declarations`, `get_tree`, `get_imports`, `get_stats`, `get_diff_summary`, `get_token_estimate`
  - only when a connected MCP server exposes these canonical Indxr tool names after `0mcp0` normalization
- `INDXR_SOURCE_READ`
  - `get_file_summary`, `read_source`, `get_file_context`, `batch_file_summaries`
  - only when a connected MCP server exposes these canonical Indxr tool names after `0mcp0` normalization
- `INDXR_SYMBOL_GRAPH`
  - `lookup_symbol`, `explain_symbol`, `get_callers`, `get_public_api`, `get_related_tests`, `get_dependency_graph`
  - only when a connected MCP server exposes these canonical Indxr tool names after `0mcp0` normalization
- `INDXR_MAINTENANCE`
  - `regenerate_index`
  - only when a connected MCP server exposes this canonical Indxr tool name after `0mcp0` normalization

### Complete-schema tools with no current placeholder-workflow rows

- `BROWSER_VERIFY`
  - `browser_action`
  - Present in the native schema when browser use is supported, but none of the current placeholder workflow steps explicitly require launching and driving the browser.
- `MCP_RESOURCE_READ`
  - `access_mcp_resource`
  - Present when MCP is connected, but no current placeholder workflow step explicitly instructs the main agent to read a named MCP resource.
- `MCP_SERVER_DOCS`
  - `load_mcp_documentation`
  - Present when MCP is connected, but none of the current placeholder workflows are MCP-server-creation workflows.
- `INDXR_MAINTENANCE`
  - `regenerate_index`
  - Present only when Indxr is connected, and intentionally excluded from current step rows because no placeholder workflow step explicitly instructs the agent to regenerate the index.

### Complete-schema tools intentionally excluded from the matrix

- Dynamic MCP server tools
  - Non-Indxr MCP tools appear only when specific MCP servers are connected and are not statically enumerable in a placeholder-workflow matrix.
- Managed-workflow-only tools such as `complete_workflow_item`
  - These belong to backend-managed workflows, not placeholder workflows, and are intentionally out of scope for this document.
- `generate_explanation`
  - Registered in the codebase, but currently filtered out of agent schemas with `contextRequirements: () => false`, so it is not part of the emitted native tool schema for these runs.
- `focus_chain`
  - Registered as a dependency marker, but filtered out of emitted schemas because it has an empty description.

### advanced-elicitation.md

- Step 1: `DOC_READ`
- Step 2: no additional tools
- Step 3: no additional tools
- Step 4: no additional tools
- Step 5: no additional tools
- Step 6: no additional tools

### brainstorming.md

- Step 1: `DOC_READ`, `DOC_WRITE`
- Step 2: `DOC_WRITE`
- Step 3: `DOC_READ`, `DOC_WRITE`
- Step 4: no additional tools
- Step 5: `DOC_WRITE`

### check-implementation-readiness.md

- Step 1: `DOC_READ`, `DOC_WRITE`
- Step 2: `DOC_READ`, `DOC_WRITE`
- Step 3: `DOC_READ`, `DOC_WRITE`
- Step 4: `DOC_READ`, `DOC_WRITE`
- Step 5: `DOC_READ`, `DOC_WRITE`
- Step 6: `DOC_READ`, `DOC_WRITE`

### cis-design-thinking.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`
- Step 3: no additional tools
- Step 4: `DOC_READ`
- Step 5: `DOC_READ`
- Step 6: no additional tools
- Step 7: no additional tools

### cis-innovation-strategy.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`
- Step 3: `DOC_READ`
- Step 4: `DOC_READ`
- Step 5: `DOC_READ`
- Step 6: no additional tools
- Step 7: no additional tools
- Step 8: no additional tools
- Step 9: no additional tools

### cis-problem-solving.md

- Step 1: `DOC_READ`
- Step 2: no additional tools
- Step 3: `DOC_READ`
- Step 4: no additional tools
- Step 5: `DOC_READ`
- Step 6: no additional tools
- Step 7: no additional tools
- Step 8: no additional tools
- Step 9: no additional tools

### cis-storytelling.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`
- Step 3: no additional tools
- Step 4: no additional tools
- Step 5: no additional tools
- Step 6: no additional tools
- Step 7: no additional tools
- Step 8: no additional tools
- Step 9: `DOC_WRITE`

### code-review.md

- Step 1: `DOC_READ`, `PLACEHOLDER_WRITE`
- Step 2: `DOC_READ`, `DOC_WRITE`, `PLACEHOLDER_WRITE`
- Step 3: `DOC_READ`, `LOCAL_EXEC`, `DIFF_BUILD`
- Step 4: `PLACEHOLDER_WRITE`
- Step 5: `SUBAGENT_COORD`, `DOC_WRITE`
- Step 6: `DOC_READ`, `DOC_WRITE`, `LOCAL_EXEC`
- Step 7: no additional tools

### correct-course.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`, `DOC_WRITE`
- Step 3: `DOC_WRITE`
- Step 4: `DOC_WRITE`
- Step 5: `DOC_READ`, `DOC_WRITE`
- Step 6: no additional tools

### create-architecture.md

- Step 1: `DOC_READ`, `DOC_WRITE`
- Step 2: `DOC_READ`, `DOC_WRITE`
- Step 3: `DOC_READ`, `DOC_WRITE`, `EXTERNAL_RESEARCH`
- Step 4: `DOC_WRITE`
- Step 5: `DOC_WRITE`
- Step 6: `DOC_WRITE`
- Step 7: `DOC_READ`
- Step 8: `DOC_WRITE`

### create-epics-and-stories.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`, `DOC_WRITE`
- Step 3: `DOC_WRITE`, `WORKFLOW_ROUTE`
- Step 4: `DOC_WRITE`, `WORKFLOW_ROUTE`
- Step 5: `DOC_READ`

### create-prd.md

- Step 1: `DOC_READ`, `DOC_WRITE`
- Step 2: `DOC_WRITE`
- Step 3: `DOC_WRITE`
- Step 4: `DOC_WRITE`
- Step 5: `DOC_WRITE`
- Step 6: `DOC_WRITE`
- Step 7: `DOC_WRITE`
- Step 8: `DOC_WRITE`
- Step 9: `DOC_WRITE`
- Step 10: `DOC_WRITE`
- Step 11: `DOC_WRITE`
- Step 12: `DOC_READ`, `DOC_WRITE`

### create-product-brief.md

- Step 1: `DOC_READ`, `DOC_WRITE`
- Step 2: `DOC_WRITE`, `WORKFLOW_ROUTE`
- Step 3: `DOC_WRITE`, `WORKFLOW_ROUTE`
- Step 4: `DOC_WRITE`, `WORKFLOW_ROUTE`
- Step 5: `DOC_WRITE`, `WORKFLOW_ROUTE`
- Step 6: `DOC_READ`

### create-story.md

- Step 1: `DOC_READ`, `DOC_WRITE`
- Step 2: `DOC_READ`, `LOCAL_EXEC`
- Step 3: `DOC_READ`
- Step 4: `EXTERNAL_RESEARCH`
- Step 5: `DOC_READ`, `DOC_WRITE`
- Step 6: `DOC_READ`, `DOC_WRITE`

### create-ux-design.md

- Step 1: `DOC_READ`, `DOC_WRITE`
- Step 2: `DOC_WRITE`, `WORKFLOW_ROUTE`
- Step 3: `DOC_WRITE`, `WORKFLOW_ROUTE`
- Step 4: `DOC_WRITE`, `WORKFLOW_ROUTE`
- Step 5: `DOC_READ`, `DOC_WRITE`

### dev-story.md

- Step 1: `DOC_READ`, `PLACEHOLDER_WRITE`
- Step 2: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `LOCAL_EXEC`, `STORY_TASK_EXECUTION`
- Step 3: `DOC_READ`, `DOC_WRITE`, `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `LOCAL_EXEC`, `STORY_TASK_VALIDATION`
- Step 4: `DOC_READ`, `DOC_WRITE`, `LOCAL_EXEC`

### distillator.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`, `LOCAL_EXEC`
- Step 3: `DOC_READ`
- Step 4: `DOC_READ`
- Step 5: `DOC_WRITE`
- Step 6: no additional tools

### document-project.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`, `WORKFLOW_ROUTE`

### domain-research.md

- Step 1: `DOC_READ`, `DOC_WRITE`
- Step 2: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 3: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 4: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 5: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 6: `EXTERNAL_RESEARCH`, `DOC_READ`, `DOC_WRITE`

### edit-prd.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`
- Step 3: `DOC_READ`
- Step 4: `DOC_WRITE`
- Step 5: `DOC_READ`, `DOC_WRITE`, `WORKFLOW_ROUTE`
- Step 6: no additional tools

### editorial-review-prose.md

- Step 1: `DOC_READ`
- Step 2: no additional tools
- Step 3: `DOC_READ`
- Step 4: no additional tools

### editorial-review-structure.md

- Step 1: `DOC_READ`
- Step 2: no additional tools
- Step 3: `DOC_READ`
- Step 4: no additional tools
- Step 5: no additional tools
- Step 6: no additional tools

### generate-project-context.md

- Step 1: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `DOC_READ`, `DOC_WRITE`
- Step 2: `DOC_WRITE`
- Step 3: `DOC_READ`, `DOC_WRITE`

### help.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`
- Step 3: `DOC_READ`
- Step 4: no additional tools
- Step 5: no additional tools

### index-docs.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`
- Step 3: `DOC_READ`
- Step 4: `DOC_WRITE`
- Step 5: no additional tools

### market-research.md

- Step 1: no additional tools
- Step 2: `DOC_WRITE`
- Step 3: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 4: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 5: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 6: `EXTERNAL_RESEARCH`, `DOC_READ`, `DOC_WRITE`

### party-mode.md

- Step 1: `DOC_READ`
- Step 2: no additional tools
- Step 3: no additional tools

### qa-generate-e2e-tests.md

- Step 1: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`
- Step 2: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `DOC_WRITE`
- Step 3: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `LOCAL_EXEC`, `DOC_WRITE`

### quick-dev-new-preview.md

- Step 1: `DOC_READ`
- Step 2: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `DOC_WRITE`
- Step 3: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `DOC_WRITE`, `LOCAL_EXEC`, `SUBAGENT_COORD`
- Step 4: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `DOC_WRITE`, `LOCAL_EXEC`, `SUBAGENT_COORD`
- Step 5: `DOC_READ`, `DOC_WRITE`, `LOCAL_EXEC`

### quick-dev.md

- Step 1: `DOC_READ`, `LOCAL_EXEC`
- Step 2: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`
- Step 3: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `DOC_WRITE`, `LOCAL_EXEC`
- Step 4: `DOC_READ`, `DOC_WRITE`
- Step 5: `DOC_READ`, `LOCAL_EXEC`, `SUBAGENT_COORD`
- Step 6: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `DOC_WRITE`

### quick-spec.md

- Step 1: `DOC_READ`, `DOC_WRITE`
- Step 2: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`, `DOC_WRITE`
- Step 3: `DOC_WRITE`
- Step 4: `DOC_READ`, `DOC_WRITE`

### retrospective.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`
- Step 3: `DOC_READ`
- Step 4: no additional tools
- Step 5: `DOC_WRITE`
- Step 6: `WORKFLOW_ROUTE`

### review-adversarial-general.md

- Step 1: `DOC_READ`
- Step 2: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`
- Step 3: no additional tools

### review-edge-case-hunter.md

- Step 1: `DOC_READ`
- Step 2: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`
- Step 3: `CODE_READ`, `INDXR_DISCOVERY`, `INDXR_SOURCE_READ`, `INDXR_SYMBOL_GRAPH`
- Step 4: no additional tools

### shard-doc.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`
- Step 3: `LOCAL_EXEC`
- Step 4: `DOC_READ`
- Step 5: no additional tools
- Step 6: `LOCAL_EXEC`

### sprint-planning.md

- Step 1: `DOC_READ`
- Step 2: `DOC_WRITE`
- Step 3: `DOC_READ`, `DOC_WRITE`
- Step 4: `DOC_WRITE`
- Step 5: `DOC_READ`

### sprint-status.md

- Step 1: no additional tools
- Step 2: `DOC_READ`, `DOC_WRITE`
- Step 3: no additional tools
- Step 4: `WORKFLOW_ROUTE`
- Step 5: `DOC_READ`
- Step 6: `DOC_READ`

### teach-me-testing.md

- Step 1: `DOC_READ`
- Step 2: `DOC_READ`, `DOC_WRITE`
- Step 3: `DOC_READ`, `DOC_WRITE`
- Step 4: `DOC_READ`, `DOC_WRITE`
- Step 5: `DOC_READ`, `DOC_WRITE`

### technical-research.md

- Step 1: `DOC_WRITE`
- Step 2: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 3: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 4: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 5: `EXTERNAL_RESEARCH`, `DOC_WRITE`
- Step 6: `EXTERNAL_RESEARCH`, `DOC_READ`, `DOC_WRITE`

### validate-prd.md

- Step 1: `DOC_READ`, `DOC_WRITE`
- Step 2: `DOC_READ`, `DOC_WRITE`
- Step 3: `DOC_READ`, `DOC_WRITE`
- Step 4: `DOC_READ`, `DOC_WRITE`
- Step 5: `DOC_READ`, `DOC_WRITE`
- Step 6: `DOC_READ`, `DOC_WRITE`
- Step 7: `DOC_READ`, `DOC_WRITE`
- Step 8: `DOC_READ`, `DOC_WRITE`
- Step 9: `DOC_READ`, `DOC_WRITE`
- Step 10: `DOC_READ`, `DOC_WRITE`
- Step 11: `DOC_READ`, `DOC_WRITE`
- Step 12: `DOC_READ`, `DOC_WRITE`, `WORKFLOW_ROUTE`
