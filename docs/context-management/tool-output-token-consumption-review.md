# Tool Output Token Consumption Review

## Purpose

This document reviews the runtime mechanisms currently used to control token consumption from tool outputs, explains why they are not sufficient for short high-churn workflows, and recommends a concrete direction to reduce spend.

The review is grounded in the live runtime code, not prior assumptions.

## Executive Summary

The app already has multiple protections against tool outputs overwhelming context:

- source-level output caps on some tools
- duplicate file-read suppression
- historical tool-result compaction
- context truncation
- optional auto-condense / summarize-task flows
- OpenAI Responses `previous_response_id` chaining
- OpenAI server-side compaction

The core problem is that these protections are mostly tuned to prevent context-window failure, not to reduce cumulative prompt spend during fast tool-heavy workflows.

In the current architecture, tool outputs can remain in retained server-side or local conversation state across many chained requests. Even when the client only sends a small delta, the model is still billed to process the accumulated thread state until compaction or truncation happens. That means a workflow can stay far below the hard context limit and still become too expensive.

## Implemented Mechanisms

### 1. Request chaining and retained thread state

For OpenAI Responses, the app chains from the latest reusable assistant response and only sends new items after that anchor:

- `src/core/api/transform/openai-response-format.ts`
- `src/core/api/providers/openai-native.ts`

This is good and necessary, but it only reduces client resend. It does not prevent the provider from billing for retained server-side context on later turns.

### 2. OpenAI server-side compaction

The native OpenAI provider enables Responses server-side compaction for GPT-5-family models:

- `src/core/api/providers/openai-native.ts`

Current threshold logic:

- minimum: `80_000`
- maximum: `120_000`
- ratio: `0.5` of model context

This means compaction often will not fire during workflows that repeatedly run 20k-50k-token requests, even though those workflows can already be expensive.

### 3. Standard context truncation

When `useAutoCondense` is off, the app only truncates when the previous request is near the effective context ceiling:

- `src/core/context/context-management/ContextManager.ts`
- `src/core/context/context-management/context-window-utils.ts`

This is a hard-limit safety valve, not a cost-control strategy.

### 4. Auto-condense / summarize-task compaction

When `useAutoCondense` is on and the model family is eligible, the task can switch into summarize-task compaction:

- `src/core/task/index.ts`
- `src/core/task/tools/handlers/SummarizeTaskHandler.ts`

Important current behavior:

- `useAutoCondense` defaults to `false`
- `src/shared/storage/state-keys.ts`

So the stronger compaction path is not active by default.

### 5. Always-on duplicate file-read compaction

Every request applies always-on duplicate file compaction across conversation history:

- `src/core/task/index.ts`
- `src/core/context/context-management/ContextManager.ts`

This replaces repeated historical file reads with notices instead of replaying the same file content indefinitely.

This is one of the better current mitigations, but it only helps file-read repetition.

### 6. Threshold-triggered large historical tool-result compaction

The context manager can compact large historical tool results for these tools:

- `read_file`
- `search_files`
- `list_files`
- `list_code_definition_names`
- `execute_command`
- `use_subagents`
- `browser_action`
- `web_search`
- `web_fetch`
- `use_mcp_tool`
- `access_mcp_resource`
- `load_mcp_documentation`
- `generate_explanation`

Implementation:

- `src/core/context/context-management/ContextManager.ts`

Current behavior:

- only triggered from the token-pressure optimization path
- does not run as an always-on cost-control pass
- preserves the newest tool outputs by skipping the tail of the conversation
- only compacts tool results larger than `4000` characters

This is helpful, but too reactive for the workflows currently driving cost.

### 7. Terminal output limiting

Command output has two layers of limits:

- terminal managers truncate final returned output to the configured line limit
- unretrieved process buffers are truncated before being returned

Relevant code:

- `src/integrations/terminal/constants.ts`
- `src/integrations/terminal/standalone/StandaloneTerminalProcess.ts`
- `src/hosts/vscode/terminal/VscodeTerminalProcess.ts`
- `src/integrations/terminal/standalone/StandaloneTerminalManager.ts`
- `src/hosts/vscode/terminal/VscodeTerminalManager.ts`

Important current settings:

- default command output line limit: `500`
- max unretrieved lines: `500`

This helps, but users can still raise the output line limit substantially, and command output is only one source of tool-output growth.

### 8. Read-file controls

The app already has strong mitigations for normal file reads:

- `read_file` blocks full reads above `800` lines or `65536` bytes
- repeated unchanged reads return a compact reuse notice
- repeated changed reads can return a compact diff instead of the full file
- `read_file_range` tracks overlapping windows and returns overlap notices

Relevant code:

- `src/core/task/tools/handlers/ReadFileToolHandler.ts`
- `src/core/task/tools/handlers/ReadFileRangeToolHandler.ts`
- `src/core/task/tools/utils/readFileContentUtils.ts`

Gap:

- `read_file_range` does not impose its own hard byte or line cap on the returned selection

### 9. Search and file-list result caps

The app already limits some enumeration tools:

- `search_files` caps output to `300` results and `0.25MB`
- `list_files` limits listing depth output through the file service and formats a truncated list

Relevant code:

- `src/services/ripgrep/index.ts`
- `src/core/task/tools/handlers/ListFilesToolHandler.ts`
- `src/core/prompts/responses.ts`

These are solid protections.

### 10. MCP output limits

Current MCP protections:

- `use_mcp_tool` truncates output to `400KB`
- `access_mcp_resource` truncates output to `400KB`
- `use_mcp_tool` has overlap / range protections for `read_source`

Relevant code:

- `src/shared/content-limits.ts`
- `src/core/task/tools/handlers/UseMcpToolHandler.ts`
- `src/core/task/tools/handlers/AccessMcpResourceHandler.ts`

Gap:

- `400KB` is still extremely large for prompt economy

### 11. File-edit result minimization

The app avoids echoing full saved file contents for many edit operations by returning:

- patch summaries
- metadata summaries
- compact final-file-state blocks

Relevant code:

- `src/core/prompts/responses.ts`
- `src/core/task/tools/handlers/WriteToFileToolHandler.ts`
- `src/core/task/tools/handlers/ApplyPatchHandler.ts`

This is a strong cost-saving mechanism and should be treated as the pattern to reuse elsewhere.

### 12. Subagent result summarization

The parent task does not receive a full transcript from `use_subagents`; it receives a compact summary:

- `src/core/task/tools/handlers/SubagentToolHandler.ts`

This is good for parent-task cost, though subagent runs still incur their own internal usage.

### 13. Web tools

Current behavior:

- `web_search` returns a concise result list
- `web_fetch` returns the raw fetched result text
- `browser_action` returns console logs and a screenshot reference

Relevant code:

- `src/core/task/tools/handlers/WebSearchToolHandler.ts`
- `src/core/task/tools/handlers/WebFetchToolHandler.ts`
- `src/core/task/tools/handlers/BrowserToolHandler.ts`

Gap:

- `web_fetch` currently has no explicit truncation path
- `browser_action` does not have a dedicated token budget for console-log text

## Why These Mechanisms Are Not Sufficient

### 1. The protections are mostly reactive

The strongest history-reduction paths only activate when:

- the request is already near the context threshold
- auto-condense is enabled
- or a specific duplicate-file condition is met

That is too late for cost control.

### 2. Tool outputs dominate history long before compaction fires

The current request-token estimate logging already breaks out history into:

- total history
- current user input
- tool outputs
- tool calls

Implementation:

- `src/core/task/tokenUsageLogging.ts`

In the observed expensive workflow pattern, tool outputs are the dominant component of history well before the app reaches any hard context-management trigger.

### 3. Several high-volume tools still permit oversized payloads

The weakest remaining output surfaces are:

- `web_fetch`
- `read_file_range`
- MCP/resource outputs with a `400KB` cap
- browser console-log text

### 4. The default settings favor continuity over spend

Two defaults matter here:

- `useAutoCondense = false`
- OpenAI server-side compaction threshold floors at `80k` and often lands at `120k`

That combination is conservative for continuity, but expensive for long tool-heavy workflows.

## Recommendation

## Primary Recommendation

Shift the token-management strategy from "prevent context failure" to "proactively compact expensive historical tool outputs."

The app should preserve the latest turn faithfully, but compact older tool-result bodies much earlier, using a budget-driven policy instead of waiting for near-limit context pressure.

## Recommended Changes

### 1. Add always-on historical tool-output compaction

Add a second always-on pass, parallel to duplicate file compaction, that compacts older tool results once they exceed a modest budget.

Recommended policy:

- run every request during request-history assembly
- preserve the latest assistant/user pair untouched
- compact older tool-result bodies for high-volume tools into short notices plus minimal metadata

Initial target tools:

- `use_mcp_tool`
- `access_mcp_resource`
- `execute_command`
- `web_fetch`
- `browser_action`
- `search_files`
- `list_files`
- `use_subagents`
- `read_file_range`

Why this is the most important change:

- it attacks the actual cost driver
- it works even when the task never gets near the hard context limit
- it complements, rather than replaces, current truncation and summarize-task behavior

### 2. Lower the OpenAI server-side compaction threshold

The current `80k-120k` threshold is too high for cost-sensitive GPT-5 workflows.

Recommendation:

- lower the threshold substantially, or make it user-configurable
- prefer a default that triggers compaction at a much smaller retained-thread size

A lower threshold will not solve every case, but it will reduce the number of repeated medium-large retained-thread requests before OpenAI compacts the thread.

### 3. Enable proactive auto-condense by default for eligible models

`useAutoCondense` should no longer default to `false` for next-gen model families.

Recommendation:

- enable it by default for eligible next-gen providers
- or introduce a separate cost-oriented auto-condense mode that triggers earlier than the current near-limit strategy

### 4. Tighten source-level caps on remaining high-volume tools

Recommended changes:

- add `truncateContent(...)` or an equivalent stricter cap to `web_fetch`
- reduce MCP/resource truncation from `400KB` to a far smaller default
- add explicit line/byte limits to `read_file_range`
- add a dedicated size cap for browser console-log text returned by `browser_action`

These are straightforward wins because they reduce payload size before history accumulation begins.

### 5. Treat command-output limit inflation as a cost risk

The default terminal output line limit of `500` is reasonable. Much larger user-selected values are expensive.

Recommendation:

- keep the default conservative
- consider lowering the UI max or warning when users choose very high output limits

### 6. Expose tool-output burden in the UI

The backend already estimates:

- `history.toolOutputs`
- `history.toolCalls`

Recommendation:

- surface tool-output share in task diagnostics or the context window UI
- make it obvious when spend is being driven by retained tool output rather than by new human input

This helps users understand why a workflow is getting expensive before it becomes unusable.

## Recommended Implementation Order

1. Always-on historical tool-output compaction
2. Lower OpenAI server-side compaction threshold
3. Enable earlier auto-condense by default
4. Tighten `web_fetch`, MCP/resource, `read_file_range`, and browser log caps
5. Add UI visibility for tool-output-driven context growth

## Bottom Line

The app does not currently lack context-management mechanisms. It lacks mechanisms that optimize for cost early enough.

Today, most protections activate only after tool outputs have already accumulated into an expensive retained thread. The fastest path to materially lowering spend is to compact older tool outputs proactively on every request, instead of waiting for hard context pressure.
