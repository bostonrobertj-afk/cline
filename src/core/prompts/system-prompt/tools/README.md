# Tool Registration System

This directory contains the prompt-defined tool modules for the system prompt architecture.

The runtime registration entrypoint is `init.ts`, which collects tool variant arrays from this directory and registers them with `ClineToolSet`.

## Overview

Each tool file exports a `{toolName}_variants` array of `ClineToolSpec` objects keyed by `ModelFamily`.

At startup, `registerClineToolSets()` in `init.ts` imports those arrays, flattens them into one list, and calls `ClineToolSet.register(...)` for each entry.

`ClineToolSet` then exposes lookup helpers such as:

- `getToolByName(...)`
- `getToolByNameWithFallback(...)`
- `getEnabledTools(...)`
- `getEnabledToolSpecs(...)`

## Files

- **`init.ts`** - Main registration entrypoint used to register prompt-defined tools with `ClineToolSet`
- **`index.ts`** - Barrel exports for tool modules that are re-exported from this directory
- **Individual tool files** - Each exports a `{toolName}_variants` array

There is no `register.ts`, `example-usage.ts`, or built-in registration-summary helper in the current codebase.

## Usage

### Basic Registration

```typescript
import { registerClineToolSets } from "./tools/init";

registerClineToolSets();
```

### Using Registered Tools

```typescript
import { ClineToolSet } from "../registry/ClineToolSet";
import { ModelFamily } from "@/shared/prompts";
import { ClineDefaultTool } from "@/shared/tools";

registerClineToolSets();

const genericTools = ClineToolSet.getTools(ModelFamily.GENERIC);
const executeCommandTool = ClineToolSet.getToolByNameWithFallback(
  ClineDefaultTool.BASH,
  ModelFamily.GENERIC,
);
```

## Tool Structure

Each tool file follows this pattern:

```typescript
import { ModelFamily } from "@/shared/prompts";
import { ClineDefaultTool } from "@/shared/tools";
import type { ClineToolSpec } from "../spec";

const GENERIC: ClineToolSpec = {
    variant: ModelFamily.GENERIC,
    id: ClineDefaultTool.BASH,
    name: "execute_command",
    description: "Tool description",
    parameters: [
        {
            name: "command",
            required: true,
            instruction: "Command to execute.",
        },
    ],
};

const NATIVE_GPT_5: ClineToolSpec = {
    ...GENERIC,
    variant: ModelFamily.NATIVE_GPT_5,
};

export const execute_command_variants: ClineToolSpec[] = [GENERIC, NATIVE_GPT_5];
```

## Registered Tools

The following prompt-defined tool variant arrays are currently registered from `init.ts`:

- `access_mcp_resource`
- `act_mode_respond`
- `apply_patch`
- `ask_followup_question`
- `attempt_completion`
- `browser_action`
- `build_epic_delivery_spec`
- `build_epics_document`
- `build_review_diff_output`
- `build_review_input`
- `build_story_document`
- `build_tech_spec_document`
- `capture_brainstorming_topic`
- `complete_workflow_item`
- `execute_command`
- `focus_chain`
- `generate_explanation`
- `generate_plan_output`
- `list_code_definition_names`
- `list_files`
- `load_mcp_documentation`
- `new_task`
- `prepare_brainstorming_session`
- `read_file`
- `read_file_range`
- `replace_in_file`
- `search_files`
- `select_target_epic`
- `send_user_message`
- `set_workflow_placeholders`
- `story_notes_update`
- `story_task_complete`
- `story_task_reminder`
- `story_testing_complete`
- `subagent`
- `use_mcp_tool`
- `use_skill`
- `web_fetch`
- `web_search`
- `workflow_progress_request`
- `write_to_file`

## Adding New Tools

1. Create a new tool file following the naming pattern: `{tool_name}.ts`
2. Export a `{tool_name}_variants` array with tool specifications
3. Add the import and spread to `init.ts` so the tool is registered at runtime
4. Add the export to `index.ts` if the tool should be re-exported from the barrel file

## Notes

- `ClineToolSet.register(...)` ignores duplicate registrations for the same tool id within the same model family
- Tools are registered per `ModelFamily`
- `init.ts` is the source of truth for prompt-defined tool registration in this directory
- Dynamic MCP-native tools and dynamic subagent-native tools are added elsewhere at runtime and are not represented one-file-per-tool under `tools/`
- All tool variants are collected and registered in a single function call
