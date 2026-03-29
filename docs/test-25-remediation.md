# Initial Requirements

- Enforce bounded source reads for large files across both native and Indxr/MCP tooling.
  - `read_file` must be disabled for files above an explicit threshold.
  - Indxr `read_source` must also be disabled for files above that same threshold when invoked without a symbol or explicit line range.
  - The threshold must be exact and implementation-defined in code, not left as a vague "small file" concept.
  - The gate should be based on file size and/or line count, with exact limits documented in the implementation.

- Require targeted reads when a full-file read is disallowed.
  - If an agent calls `read_file` on a disallowed file, the tool response must explicitly instruct it to use `read_file_range`, symbol lookup, or another targeted read capability.
  - If an agent calls Indxr `read_source` on a disallowed file without a symbol or explicit line range, the tool response must explicitly instruct it to use a symbol-targeted or range-targeted Indxr read instead.
  - These rejections must be tool-enforced, not prompt-only guidance.

- Keep targeted read capabilities available for large files.
  - Native `read_file_range` must remain available.
  - Indxr symbol-based and line-range-based source reads must remain available.
  - The intent is to remove large raw whole-file payloads, not to blind the agent.

- Ensure targeted source-read outputs carry stable positional metadata.
  - Any tool output intended to return a targeted section of a file must include the file path and explicit start/end line metadata in the returned model-facing payload.
  - Native targeted reads must preserve 1-based line coordinates.
  - Indxr/MCP targeted source reads must also preserve explicit line coordinates when returning source text.
  - Search-style discovery output should include match line numbers when feasible, so agents can order and revisit separate excerpts from the same file without ambiguity.

- Detect overlap and redundancy before returning source payloads into the live Responses thread.
  - If a requested file section is already materially present in active context for the current task/thread, do not resend the same raw content.
  - If a requested range substantially overlaps a recently returned range from the same file, return a compact notice or only the novel lines instead of replaying the overlapping body.
  - This overlap policy must apply to both native file-read tools and Indxr/MCP source-read tools.

- Compress tool outputs aggressively, with software-development safety as the constraint.
  - Tool outputs should be optimized for model state transfer, not for human-readable transcript fidelity.
  - Large raw payloads that can be cheaply reacquired from the workspace should not be returned unless strictly necessary for the immediate next reasoning step.
  - High-volume tools must return compact structured summaries whenever full raw output is not required.
  - This requirement applies to both native tools and MCP/Indxr tools.

- Prevent MCP wrapper inflation from defeating source-read efficiency gains.
  - `use_mcp_tool` must not blindly forward large MCP text/resource payloads into the Responses thread when a more compact representation is sufficient.
  - Indxr integration must preserve its intended token-savings benefit by returning targeted source payloads instead of repeatedly injecting large raw excerpts.

- Update prompt guidance so it no longer encourages full-file first-pass reading for code investigation.
  - Prompt variants that currently recommend `read_file` for the first full-file pass must be revised.
  - The preferred exploration order should push search/symbol discovery first, then targeted reads, with full-file reads permitted only for files below the enforced threshold.
  - Prompting must reinforce the runtime policy instead of contradicting it.

- Lower the OpenAI Responses server-side compaction threshold for GPT-5 Responses usage.
  - The current threshold is too high to meaningfully constrain growth in long-lived coding threads.
  - The new threshold must be reduced from the current setting so compaction activates materially earlier.
  - This is a secondary mitigation, not the primary fix; read-bounding and redundant-output suppression remain the primary controls.

- Preserve coding effectiveness while reducing token consumption.
  - Agents must still be able to inspect enough code to complete real software-development tasks.
  - The remediation must favor more targeted reads and reacquisition over large persistent payloads, rather than simply removing needed capabilities.

- Apply the policy consistently in the live, uninterrupted `previous_response_id` scenario.
  - Requirements must be designed around the case where OpenAI Responses chaining is healthy and provider-side thread continuity is preserved.
  - The remediation must reduce what enters the live Responses thread up front, since already-threaded tool output cannot be selectively pruned afterward.
