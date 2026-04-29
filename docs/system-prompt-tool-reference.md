# System Prompt Tool Reference

This document is a runtime-oriented reference for the tool surface that the system prompt can expose today.

It is intended to reduce file-hopping during prompt audits and workflow enablement work.

It summarizes the current tool inventory defined in:

- [src/core/prompts/system-prompt/tools/init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts)
- [src/core/prompts/system-prompt/tools/](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools)
- [src/core/prompts/system-prompt/spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts)
- [src/core/prompts/system-prompt/registry/ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts)
- [src/shared/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts)

## Scope Notes

- This document covers tools that are registered through the system-prompt tool layer.
- Not every registered tool is visible in every turn. Visibility depends on provider, mode, MCP availability, and runtime-projected workflow tool schemas.
- Some shared tool ids in [src/shared/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts) are not prompt-defined tools and should not be treated as part of the normal prompt tool catalog.
- Dynamic MCP-native tools are real runtime tools even though they are not implemented one-file-per-tool under `tools/`.

## Prompt-Defined Tool Inventory

These are the tools currently registered from [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts).

| Tool | Category | Description | Notes |
| --- | --- | --- | --- |
| `access_mcp_resource` | MCP | Access a resource exposed by a connected MCP server, such as files, API responses, or system information. | Gateway tool for MCP resources. |
| `act_mode_respond` | Response | Send a brief ACT-mode preamble or progress update to the user and end the current turn. | ACT mode only; OpenAI native path. |
| `apply_patch` | Editing | Apply an add/update/delete patch to a file using the repo’s custom patch format. | GPT-5-family only. |
| `ask_followup_question` | Response | Ask the user a concise question, optionally with choices, and end the current turn. | Hidden in YOLO mode. |
| `attempt_completion` | Response | Present the final result of completed work to the user and end the current turn. | End-of-task response tool. |
| `browser_action` | Browser | Interact with the Puppeteer-controlled browser one action at a time. | Browser automation and screenshots. |
| `execute_command` | Execution | Execute a CLI command in the current working directory. | Shared enum id is `BASH`. |
| `focus_chain` | Internal | Placeholder/dependency tool used to support focus-chain behavior. | Not a practical agent-facing operational tool. |
| `generate_explanation` | Hidden | Open a multi-file diff view and generate inline AI explanations of changes between Git refs. | Currently disabled from agent-visible schema. |
| `generate_plan_output` | Response | Present a structured plan after relevant exploration is complete. | PLAN mode only. |
| `list_code_definition_names` | Code exploration | List top-level code definitions in a directory or file scope. | Structural exploration tool. |
| `list_files` | File exploration | List files and directories in a directory, optionally recursively. | Use for structure discovery. |
| `load_mcp_documentation` | Hidden | Load documentation about creating and installing MCP servers. | Currently disabled from agent-visible schema. |
| `new_task` | Task routing | Create a new task with preloaded context summarizing the current conversation and work so far. | Used for task splitting and handoff. |
| `read_file` | File reading | Read a file’s contents, including text extraction from PDF and DOCX. | Do not use to list directories. |
| `read_file_range` | File reading | Read a specific line range from a file. | Targeted follow-up read tool. |
| `replace_in_file` | Editing | Make targeted in-file edits using SEARCH/REPLACE blocks. | Good for localized modifications. |
| `search_files` | Search | Run a regex search across files in a directory and return context-rich matches. | Raw-text discovery tool. |
| `send_user_message` | Response | Send a normal direct message to the user. | Available in ACT and PLAN mode. |
| `use_subagents` | Orchestration | Run focused in-process subagents in parallel for exploration or research. | Hidden during subagent runs and when subagents are disabled. |
| `use_mcp_tool` | MCP | Invoke a tool exposed by a connected MCP server by server name, tool name, and arguments. | Gateway tool for non-native MCP usage. |
| `use_skill` | Workflow/skill activation | Load and activate a skill or workflow by name. | Primary workflow and skill routing tool. |
| `web_fetch` | Web | Fetch a URL and analyze the page content with a prompt. | Only available for the `cline` provider when web tools are enabled. |
| `web_search` | Web | Perform a web search and return relevant results, optionally filtering domains. | Only available for the `cline` provider when web tools are enabled. |
| `write_to_file` | Editing | Create or overwrite a file with provided content, creating directories as needed. | Whole-file write tool. |

## Workflow Runtime Tool Projection

Workflow modules may project a complete per-turn native tool schema through `WorkflowRuntime`. That runtime-projected schema is authoritative for workflow-specific visibility on the active turn and is separate from the static prompt-tool registration list above.

- `set_workflow_values` is visible only when supplied by the active workflow module's complete per-turn schema.
- `workflow_progress_request` is visible only when supplied by the active workflow module's complete per-turn schema.
- `create_workflow_artifact` is visible only when supplied by the active workflow module's complete per-turn schema.

## Shared Tool Ids That Are Not Part Of The Normal Prompt Tool Catalog

The shared enum in [src/shared/tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts) contains some ids that should not be treated as normal prompt-defined tools in workflow audits.

Important current cases:

- `set_workflow_values`
- `workflow_progress_request`
- `create_workflow_artifact`
  - workflow-module-projected tool ids, not static prompt-tool catalog entries
- `condense`
- `summarize_task`
- `report_bug`
- `new_rule`
  - these participate in other runtime or slash-command flows
  - they are not registered through [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts) as standard system-prompt tools

When auditing prompt exposure, treat [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts) as the source of truth for prompt-defined registration.

## Dynamic Tool Families

### Dynamic MCP Native Tools

Connected MCP servers can contribute native tool definitions dynamically at runtime through [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts).

Runtime naming shape:

- `<serverUid>0mcp0<tool_name>`

Examples:

- `c2mYhF0mcp0lookup_symbol`
- `c2mYhF0mcp0search_relevant`

Notes:

- the stable logical tool name is the suffix after `0mcp0`
- these tools are separate from `use_mcp_tool`
- they are surfaced directly as native tools when connected and permitted by the current context and filtering path

### Dynamic Subagent-Named Tools

When subagents are enabled, the system can generate dynamic native tools for configured subagents in [ClineToolSet.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/ClineToolSet.ts).

Description shape:

- `Use the "<subagent name>" subagent: <subagent description>`

Notes:

- these are generated from cached subagent configs
- they can replace the generic `use_subagents` tool in native-tool mode

## Canonical Indxr Tool Names

The prompt layer treats the following names as the canonical Indxr signature set for detection, Indxr-aware prompt guidance, and contextual-tool bundles.

| Indxr tool | Practical meaning |
| --- | --- |
| `lookup_symbol` | Find a named symbol directly. |
| `list_declarations` | List declarations in a scope. |
| `search_signatures` | Search by signatures, types, and interfaces. |
| `get_tree` | Inspect code and file tree structure. |
| `get_imports` | Inspect file or module imports. |
| `get_stats` | Get index or project stats. |
| `get_file_summary` | Get a first-pass summary of a file. |
| `read_source` | Read targeted source content. |
| `get_file_context` | Get surrounding or dependency context for a file. |
| `regenerate_index` | Rebuild or refresh the index. |
| `get_token_estimate` | Estimate token cost before a larger read. |
| `search_relevant` | Search semantically relevant code. |
| `get_diff_summary` | Summarize diff or change scope. |
| `batch_file_summaries` | Summarize multiple files in one call. |
| `get_callers` | Find callers and usages of a symbol. |
| `get_public_api` | Inspect public interfaces only. |
| `explain_symbol` | Explain a symbol’s purpose and behavior. |
| `get_related_tests` | Find tests related to a symbol, file, or change. |
| `get_dependency_graph` | Inspect dependency relationships. |

## Visibility And Gating Notes

These notes matter because “tool exists in source” is not the same thing as “tool is present in a given turn.”

- `generate_plan_output` is PLAN-mode-only.
- `act_mode_respond` is ACT-mode-only.
- `ask_followup_question` is hidden in YOLO mode.
- `use_subagents` is hidden when subagents are disabled and during subagent runs.
- `web_search` and `web_fetch` require the `cline` provider plus web tools enabled.
- `access_mcp_resource` and `use_mcp_tool` require MCP availability.
- `load_mcp_documentation` is currently disabled from agent-visible schema.
- `generate_explanation` is currently disabled from agent-visible schema.
- `focus_chain` is an internal placeholder or dependency tool, not a practical agent-facing operational tool.
- workflow-module-projected schemas replace the visible native tool surface for the active workflow turn.

## Response Tool Summary

The response tools defined through the prompt layer are:

- `attempt_completion`
- `send_user_message`
- `ask_followup_question`
- `generate_plan_output`
- `act_mode_respond`

Current mode-oriented intent:

- ACT mode: `attempt_completion`, `send_user_message`, and usually `ask_followup_question`; native OpenAI ACT mode may also expose `act_mode_respond`
- PLAN mode: `generate_plan_output`, `send_user_message`, and usually `ask_followup_question`
- workflow turns may expose module-projected response tools through the active workflow schema

The exact visible subset in a given turn should always be derived from the actual prompt build and filtering context for that turn.

## Suggested Audit Usage

When manually reviewing workflow-module tool schemas:

1. Read the product-owned workflow module definition.
2. Use this document to confirm which tools are truly prompt-defined today.
3. Check whether a candidate tool is:
   - prompt-defined and context-gated
   - dynamic MCP-native
   - runtime-projected by the active workflow module
   - internal-only and therefore not model-facing
