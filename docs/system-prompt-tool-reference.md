# System Prompt Tool Reference

This document is a consolidated reference for the tool surface relevant to prompt construction and placeholder-workflow matrix review.

It is intended to reduce file-hopping during manual workflow audits. It does not replace the source files as the final authority, but it summarizes the current tool inventory defined in:

- [tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts)
- [tools/](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools)
- [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts)
- [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts)

## Scope Notes

- This document covers prompt-defined tools under `src/core/prompts/system-prompt/tools/`.
- Not every tool listed here is visible in every turn. Visibility depends on provider, mode, workflow context, connected MCP servers, and tool filtering.
- Some entries are implementation placeholders or currently hidden from agent-visible schema.
- Dynamic MCP tools are real runtime tools even though they do not live as one-file-per-tool under `tools/`.

## Static Prompt-Defined Tools

| Tool | Category | Description | Notes |
| --- | --- | --- | --- |
| `access_mcp_resource` | MCP | Access a resource exposed by a connected MCP server, such as files, API responses, or system information. | Gateway tool for MCP resources. Requires a server name and resource URI. |
| `act_mode_respond` | Response | Send a brief ACT-mode preamble or progress update to the user and end the current turn. | ACT mode only; OpenAI native path. |
| `apply_patch` | Editing | Apply an add/update/delete patch to a file using the repo’s custom patch format. | GPT-5-family only. Used for structured patch edits. |
| `ask_followup_question` | Response | Ask the user a concise question, optionally with 2-5 choices, and end the current turn. | Hidden when YOLO mode is enabled. |
| `attempt_completion` | Response | Present the final result of completed work to the user, optionally with a command, and end the current turn. | End-of-task response tool. |
| `browser_action` | Browser | Interact with the Puppeteer-controlled browser one action at a time. | Used for browser automation and screenshots. |
| `build_review_diff_output` | Workflow-specific | Build and replace the stable review diff artifact at `{diff_output}` from a supported Git-backed source. | Intended for `code-review` workflow Step 3. |
| `complete_workflow_item` | Managed workflow | Mark the current backend-managed workflow item complete. | Managed-workflow-only tool; not for placeholder workflows. |
| `execute_command` | Execution | Execute a CLI command in the current working directory. | Exposed as `execute_command`; shared enum id is `BASH`. |
| `focus_chain` | Internal | Placeholder/dependency tool used to support focus-chain/task-progress behavior. | Empty description; effectively not an agent-facing operational tool. |
| `generate_explanation` | Hidden/human-facing | Open a multi-file diff view and generate inline AI explanations of changes between git refs. | `contextRequirements: () => false`; currently kept out of agent tool schemas. |
| `generate_plan_output` | Response | Present a structured plan after relevant exploration is complete. | PLAN mode only. |
| `list_code_definition_names` | Code exploration | List top-level code definitions in a directory/file scope to help target later reads. | Built-in structural exploration tool. |
| `list_files` | File exploration | List files and directories in a directory, optionally recursively. | Use for structure discovery, not file-creation confirmation. |
| `load_mcp_documentation` | Hidden/MCP setup | Load documentation about creating and installing MCP servers. | Currently hidden from agent-visible schema via `contextRequirements: () => false`. |
| `new_task` | Task routing | Create a new task with preloaded context summarizing the current conversation and work so far. | Used for task splitting/handoff. |
| `read_file` | File reading | Read a file’s contents, including text extraction from PDF/DOCX. | Do not use to list directories. |
| `read_file_range` | File reading | Read a specific line range from a file. | Used for targeted inspection after narrowing the target. |
| `replace_in_file` | Editing | Make targeted in-file edits using SEARCH/REPLACE blocks. | Good for localized modifications without rewriting a whole file. |
| `search_files` | Search | Run a regex search across files in a directory and return context-rich matches. | Built-in raw-text/regex discovery tool. |
| `send_user_message` | Response | Send a direct normal message to the user when other response tools are not the right fit. | Available in both ACT and PLAN mode. |
| `set_workflow_placeholders` | Workflow-specific | Persist dynamic placeholder values discovered during the active workflow. | Used by managed workflows and placeholder workflows that support placeholders. |
| `use_subagents` | Orchestration | Run up to five focused in-process subagents in parallel for exploration/research. | Hidden during subagent runs and when subagents are disabled. |
| `use_mcp_tool` | MCP | Invoke a tool exposed by a connected MCP server by server name, tool name, and arguments. | Gateway tool for non-native MCP usage. |
| `use_skill` | Workflow/skill activation | Load and activate a skill, workflow, or managed workflow by name. | Primary workflow/skill routing tool. |
| `web_fetch` | Web | Fetch a URL and analyze the page content with a prompt. | Only available for the `cline` provider when web tools are enabled. |
| `web_search` | Web | Perform a web search and return relevant results, optionally filtering domains. | Only available for the `cline` provider when web tools are enabled. |
| `write_to_file` | Editing | Create or overwrite a file with provided content, creating directories as needed. | Whole-file write tool. |

## Dynamic Tool Families

### Dynamic MCP Native Tools

Connected MCP servers can contribute native tool definitions dynamically at runtime through [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts).

Runtime naming shape:

- `<serverUid>0mcp0<tool_name>`

Examples:

- `c2mYhF0mcp0lookup_symbol`
- `c2mYhF0mcp0search_relevant`

Notes:

- The stable logical tool name is the suffix after `0mcp0`.
- These tools are separate from `use_mcp_tool`; they are surfaced directly as native tools when connected and permitted by the current context/filtering path.

### Dynamic Subagent-Named Tools

When subagents are enabled, the system can also generate dynamic native tools for configured subagents in [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts).

Description shape:

- `Use the "<subagent name>" subagent: <subagent description>`

Notes:

- These are generated from cached subagent configs.
- They replace the generic `use_subagents` tool in native-tool mode when present.

## Canonical Indxr Tool Names

The prompt layer treats the following 19 tool names as the canonical Indxr tool signature set in [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts).

These names matter for:

- Indxr detection
- Indxr-aware prompt guidance
- contextual tool matrix bundles

| Indxr tool | Practical meaning |
| --- | --- |
| `lookup_symbol` | Find a named symbol directly. |
| `list_declarations` | List declarations in a scope. |
| `search_signatures` | Search by signatures/types/interfaces. |
| `get_tree` | Inspect code/file tree structure. |
| `get_imports` | Inspect file or module imports. |
| `get_stats` | Get index or project stats. |
| `get_file_summary` | Get a first-pass summary of a file. |
| `read_source` | Read targeted source content. |
| `get_file_context` | Get surrounding/dependency context for a file. |
| `regenerate_index` | Rebuild or refresh the index. |
| `get_token_estimate` | Estimate token cost before a larger read. |
| `search_relevant` | Search semantically relevant code. |
| `get_diff_summary` | Summarize diff/change scope. |
| `batch_file_summaries` | Summarize multiple files in one call. |
| `get_callers` | Find callers/usages of a symbol. |
| `get_public_api` | Inspect public interfaces only. |
| `explain_symbol` | Explain a symbol’s purpose/behavior. |
| `get_related_tests` | Find tests related to a symbol/file/change. |
| `get_dependency_graph` | Inspect dependency relationships. |

## Visibility And Gating Notes

These notes matter during workflow-matrix review because “tool exists in source” is not the same thing as “tool is present in a given turn.”

- `generate_plan_output` is PLAN-mode-only.
- `act_mode_respond` is ACT-mode-only.
- `ask_followup_question` is hidden in YOLO mode.
- `use_subagents` is hidden when subagents are disabled and during subagent runs.
- `complete_workflow_item` is managed-workflow-only.
- `set_workflow_placeholders` is available only when a managed workflow is active or the active workflow supports placeholders.
- `web_search` and `web_fetch` require the `cline` provider plus web tools enabled.
- `access_mcp_resource` and `use_mcp_tool` require MCP availability.
- `load_mcp_documentation` is currently disabled from agent-visible schema.
- `generate_explanation` is currently disabled from agent-visible schema.
- `focus_chain` is an internal placeholder/dependency tool, not a practical agent-facing operational tool.

## Response Tool Set Summary

The response tools defined by the prompt layer are:

- `attempt_completion`
- `send_user_message`
- `ask_followup_question`
- `generate_plan_output`
- `act_mode_respond`

Current mode-oriented response-tool intent:

- ACT mode: `attempt_completion`, `send_user_message`, and usually `ask_followup_question`; native OpenAI ACT mode may also expose `act_mode_respond`
- PLAN mode: `generate_plan_output`, `send_user_message`, and usually `ask_followup_question`

The exact visible subset in a given turn should always be determined from the actual tool schema/filtering for that turn.

## Suggested Audit Usage

When manually reviewing workflow-step rows in [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts):

1. Read the workflow step text in `/Users/robertboston/Documents/Cline/Workflows/`.
2. Use this document to confirm what tools actually exist and what they do.
3. Map the step’s required actions to existing matrix bundles.
4. If a required concrete tool exists here but is not representable by the current bundle model, record a bundle-model gap explicitly.
