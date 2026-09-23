# System Prompt Architecture

This directory builds the system prompt and model-visible tool definitions for a request. The application-level caller supplies context; registered model variants select generic prompt components and default tools. During a workflow, the shared workflow runtime supplies workflow instructions separately and projects the complete tool schema for the active step.

This guide describes the current implementation. The [workflow runtime requirements](../../../../docs/workflows/workflow-runtime/requirements.md), [architecture](../../../../docs/workflows/workflow-runtime/architecture.md), and [module build guide](../../../../docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md) govern workflow-specific behavior.

## Request Assembly And Ownership

The main-task integration is in [Task](../../task/index.ts); child execution uses [SubagentRunner](../../task/tools/subagent/SubagentRunner.ts). The main-task flow is:

1. Task selects full or continuation assembly using the helpers in [prompt-refresh.ts](../../task/prompt-refresh.ts). First requests, human input, workflow activation, mode-switch responses, and periodic refreshes can require a full prompt.
2. [WorkflowRuntime.buildTurnProjection(...)](../../task/workflow-runtime/WorkflowRuntime.ts) produces the workflow projection for the current session and step.
3. Task appends the selected workflow input block to user-message content and passes the workflow tool override, provider details, turn flags, and other runtime context into `getSystemPrompt(context)`.
4. [PromptRegistry](registry/PromptRegistry.ts) selects a variant, builds native tool definitions, and derives visible tool names. It rebuilds the native definitions with those names in context so descriptions and response guidance can reflect the same tool surface.
5. For a full turn, [PromptBuilder](registry/PromptBuilder.ts) builds the variant's ordered components, resolves its template, and normalizes whitespace. For a continuation turn, the registry invokes [getContinuationTurnSection](components/continuation_turn.ts) directly instead of the full builder.
6. [getSystemPrompt](index.ts) returns `{ systemPrompt, tools }`. Task applies any separate runtime prompt-injection blocks and supplies the request to the API layer.

### Workflow Projection

The workflow runtime owns exactly these three prompt/tool outputs:

| Output | Consumer and purpose |
| --- | --- |
| `workflowInputPayloadBlock` | Full-turn user input: workflow context, checklist, current-step instructions, and eligible persona content |
| `continuationWorkflowInputPayloadBlock` | Continuation-turn user input: workflow context, checklist, and the same current-step instructions, without persona content |
| `workflowToolSchemaOverride` | Prompt/native tool generation: the complete ordered schema for the active workflow step |

Task appends one of the two workflow input blocks for the turn. Workflow instructions are not inserted into a separate workflow system-instructions section or the generic user-instructions component. The full workflow block includes the persona only when the workflow is active on the task's first API request (`apiRequestCount === 1`). Runtime-only steps retain the shared current-step heading and label even when they have no module instruction text.

Workflow modules own prompt templates and per-step schema builders. WorkflowRuntime renders and projects them; focus chain reflects runtime state and does not choose the active step. BMAD files and authored workflow markdown are not runtime prompt sources for shipped workflows.

## Source Map

```text
system-prompt/
├── index.ts                       # getSystemPrompt(context), public exports
├── types.ts                       # Context, variants, components, overrides
├── spec.ts                        # Tool specifications and native converters
├── constants.ts                   # Shared prompt fragments
├── registry/
│   ├── PromptRegistry.ts          # Variant selection, full/continuation assembly
│   ├── PromptBuilder.ts           # Component/template and textual tool assembly
│   ├── ClineToolSet.ts            # Shared tool registry and native tool generation
│   └── contextualNativeToolFilter.ts
├── components/
│   ├── index.ts                   # Registered top-level components
│   ├── continuation_turn.ts       # Reduced continuation instructions
│   ├── response_tools.ts          # Response guidance used by other components
│   ├── skills.ts                  # Registered; currently gated off
│   ├── act_vs_plan_mode.ts
│   ├── system_info.ts
│   ├── user_instructions.ts
│   ├── tool_use/                  # Catalog, formatting, examples, guidelines
│   └── ...                       # Other registered generic components
├── templates/
│   ├── TemplateEngine.ts
│   └── placeholders.ts
├── tools/
│   ├── init.ts                    # registerClineToolSets()
│   ├── index.ts                   # Shared tool-spec exports
│   └── ...                       # Shared model-specific tool specifications
├── variants/
│   ├── index.ts                   # Ordered VARIANT_CONFIGS inventory
│   ├── variant-builder.ts
│   ├── variant-validator.ts
│   ├── config.template.ts
│   └── ...                       # Model-family config/template/override folders
└── __tests__/                     # Mocha/Chai tests and prompt/tool snapshots
```

Tool execution lives outside this directory, under [task/tools](../../task/tools). Workflow prompt and tool-schema content lives under [workflow-modules](../../task/workflow-runtime/workflow-modules).

## Public API And Context

Use the request entrypoint when both system text and native tools are needed:

```typescript
import { getSystemPrompt, type SystemPromptContext } from "@/core/prompts/system-prompt"

export async function buildRequestPrompt(context: SystemPromptContext) {
	return getSystemPrompt(context)
}
```

`SystemPromptContext` requires `providerInfo` and `ide`. Optional fields cover workspace information, rule text, browser/MCP capabilities, skills, subagent flags, compact prompting, native tool enablement, and workflow state. See [types.ts](types.ts) for the complete contract. Construct a new context when changing readonly fields, for example `{ ...context, runtimePlaceholders: { PROJECT_TYPE: "TypeScript" } }`.

`PromptRegistry.getInstance()` registers shared tools and loads variants/components during construction. `load()` is synchronous. `get(context)` returns system text and refreshes the registry's `nativeTools`; it does not accept a separate model-id argument. `getVariant(context)` returns the selected variant.

`getVersion(modelId, version, context, isNextGenModelFamily?)` and `getByTag(modelId, tag?, label?, context?, isNextGenModelFamily?)` remain available for explicit registered-variant lookup. They build full prompt text directly and do not perform the normal `get(context)` native-tool/continuation flow. Version/tag/label lookup operates over loaded variants, not a separately loaded historical prompt catalog.

## Model Variants

[VARIANT_CONFIGS](variants/index.ts) currently registers these families, in matching order:

1. `NATIVE_GPT_5`
2. `GPT_5`
3. `NATIVE_GPT_5_1`
4. `GEMINI_3`
5. `NATIVE_NEXT_GEN`
6. `GLM`
7. `HERMES`
8. `DEVSTRAL`
9. `NEXT_GEN`
10. `TRINITY`
11. `XS`
12. `GENERIC`

The registry evaluates each variant's `matcher(context)` and selects the first match. Matchers can inspect provider, model, native-tool settings, and custom-prompt preferences. Generic is the fallback when no matcher succeeds. Model detection is not a central model-id substring switch; inspect each family's `config.ts` and its imported model utilities before changing selection behavior.

[PromptVariant](types.ts) includes a required matcher, readonly configuration and component/tool lists, tags, labels, placeholders, and overrides. [VariantBuilder](variants/variant-builder.ts) requires a description, matcher, and non-empty component order. Version defaults to `1`; an omitted template is generated from the component order.

This minimal example demonstrates the API; it is not a replacement for a shipped variant's configuration:

```typescript
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import { SystemPromptSection } from "@/core/prompts/system-prompt/templates/placeholders"
import { createVariant } from "@/core/prompts/system-prompt/variants/variant-builder"
import { validateVariant } from "@/core/prompts/system-prompt/variants/variant-validator"

const config = createVariant(ModelFamily.GENERIC)
	.description("Minimal prompt configuration example.")
	.matcher(() => true)
	.components(SystemPromptSection.TOOL_USE, SystemPromptSection.SYSTEM_INFO)
	.tools(ClineDefaultTool.FILE_READ, ClineDefaultTool.SEND_USER_MESSAGE)
	.build()

const validation = validateVariant({ ...config, id: ModelFamily.GENERIC })
```

For production examples, inspect [generic/config.ts](variants/generic/config.ts) and [native-gpt-5/config.ts](variants/native-gpt-5/config.ts). Native tool generation requires both `labels.use_native_tools === 1` and `context.enableNativeToolCalls`.

The builder stores `componentOverrides` and `toolOverrides`, but storing override metadata does not guarantee it is applied. Components explicitly consume supported overrides; the current shared tool-selection path does not apply `variant.toolOverrides`. Do not document `enabled` or `order` as universally enforced switches.

## Components And Templates

[getSystemPromptComponents()](components/index.ts) registers:

- `CONTINUATION_TURN`
- `SYSTEM_INFO`, `MCP`, and `USER_INSTRUCTIONS`
- `TOOL_USE`, `EDITING_FILES`, and `CAPABILITIES`
- `SKILLS`, `RULES`, and `OBJECTIVE`
- `ACT_VS_PLAN` and `FEEDBACK`

Registration does not mean every component renders on every request. Full-turn variants select their component order, and components can return `undefined`. `SKILLS` is registered but currently disabled by `SKILLS_PROMPT_SECTION_GATE` in [skills.ts](components/skills.ts). `response_tools.ts` is a helper consumed by full/continuation components, not a separately registered top-level section.

There is no standalone `AGENT_ROLE` component. `TODO` and `TOOLS` remain enum entries in [placeholders.ts](templates/placeholders.ts), but are not registered top-level components. Tool catalog text is assembled inside `tool_use/`. `USER_INSTRUCTIONS` consumes caller-supplied repository rules and language/path-policy instructions, not workflow persona or reminder content.

Components have the signature `(variant: PromptVariant, context: SystemPromptContext) => Promise<string | undefined>`. PromptBuilder builds them sequentially, logs and skips failed components, prepares placeholders, resolves the base template, and cleans up separators and whitespace. Individual components decide how to consume template overrides and context flags.

### Two Different Template Mechanisms

| Mechanism | Syntax | Owner and behavior |
| --- | --- | --- |
| Generic prompt templates | `{{PLACEHOLDER}}`, including nested property lookup | [TemplateEngine](templates/TemplateEngine.ts); unknown placeholders remain unresolved |
| Workflow prompt templates | `{workflow.<declaredKey>}` | [WorkflowRuntime](../../task/workflow-runtime/WorkflowRuntime.ts); validates declared keys, recursively renders values, and rejects malformed references or cycles |

Do not substitute one mechanism for the other or perform module-local workflow-value replacement.

The generic engine accepts a string or context-based template function:

```typescript
import { TemplateEngine } from "@/core/prompts/system-prompt/templates/TemplateEngine"
import type { SystemPromptContext } from "@/core/prompts/system-prompt/types"

export function renderLocation(context: SystemPromptContext): string {
	return new TemplateEngine().resolve("Workspace: {{CWD}}", context, {
		CWD: context.cwd ?? process.cwd(),
	})
}
```

For full prompts, placeholder preparation applies variant placeholders, standard runtime values, component output, and finally `context.runtimePlaceholders`. Missing standard sections are filled with empty strings. The engine preserves strings and JSON-serializes other supplied values.

`useMinimalGptPrompt` affects individual components and tool descriptions; it is separate from continuation-turn selection. In minimal native-tool mode, `tool_use/` omits the inline tool catalog and examples because structured tool definitions are supplied separately.

## Tool Selection And Exposure

Shared identifiers live in [ClineDefaultTool](../../../shared/tools.ts). An enum member or backend handler does not by itself expose a tool to the model.

### Default Non-Workflow Selection

[ClineToolSet](registry/ClineToolSet.ts) resolves a variant's ordered tool IDs through `getToolByNameWithFallback`: exact family, then generic, then another registered family. It deduplicates IDs and applies tool-level `contextRequirements`.

When enabled for a main-agent context, cached agent configurations can supply dynamically named subagent specs. These replace the shared `use_subagents` spec when dynamic specs are available. Child runs do not receive this dynamic expansion.

For native tools, [contextualNativeToolFilter.ts](registry/contextualNativeToolFilter.ts) applies generic plan/act response-tool filtering and appends tools from enabled MCP servers. Blank-description specs are excluded before provider conversion. `ClineDefaultTool.TODO` (`focus_chain`) is a blank-description dependency placeholder with no coordinator handler, not an exposed task-management tool.

### Active Workflow Selection

When `workflowToolSchemaOverride` is present, both enabled-spec selection and contextual native filtering use that array as the complete tool surface. An empty array means no workflow tools; it does not fall back to defaults. The override bypasses default tool selection, dynamic subagent expansion, generic mode filtering, and automatic MCP-tool addition. Native enablement, blank-description exclusion, and provider conversion still apply.

Module-owned `{workflowId}ToolSchemas.ts` files select and order shared specs through the registry and define explicitly authorized workflow-specific specs when needed. Registration of a shared spec, such as `workflow_progress_request`, makes it reusable; default exposure still depends on the selected schema. `set_workflow_values` and `create_workflow_artifact` are exposed only when a module projects them. `build_workflow_document` is a backend-only deterministic full-document writer.

The retired contextual workflow matrix is not part of this path. Follow the [module build guide](../../../../docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md) for workflow exposure changes.

### Text And Native Schemas

[PromptBuilder.getToolsPrompts](registry/PromptBuilder.ts) uses `getEnabledToolSpecs` for textual tool descriptions. Text rendering handles parameter dependencies and context conditions and supports compact descriptions.

Native generation uses the converters in [spec.ts](spec.ts): Anthropic-style input schemas for Anthropic, Bedrock, and MiniMax; function declarations for Gemini and Gemini models on Vertex; Anthropic-style schemas for other Vertex models; and OpenAI-compatible function definitions for other providers. Parameter types, nested schema fields, context-dependent instructions, and native description compaction are defined there. Tool-level context checks can also fail during conversion.

[response_tools.ts](components/response_tools.ts) derives guidance from workflow overrides or visible native tool names when supplied, with generic mode-based fallback otherwise. Prompt guidance must describe tools that are actually available on the turn.

## Extending The System

### Components And Variants

For a new top-level component, implement its function under `components/`, add its section identifier in `templates/placeholders.ts`, register it in `components/index.ts`, and include it only in the intended variant component orders/templates. Workflow-specific instructions belong in workflow modules rather than new generic prompt carriers.

For a new variant, define its config/template/overrides, register it in `variants/index.ts` at the intended matcher precedence, and validate it with `validateVariant`. Keep examples aligned with the actual builder and component contracts instead of copying class implementations into documentation.

### Tools

Choose the exposure path before changing registration:

| Tool category | Prompt ownership |
| --- | --- |
| Shared model-facing tool | Spec under `tools/`, exported by `tools/index.ts`, registered by `tools/init.ts`, selected by applicable variant or workflow schemas |
| Workflow-specific model-facing tool | Schema owned by the workflow module and returned by that step's schema builder; no default/global exposure |
| Backend-only deterministic workflow capability | Backend contract and runtime decision action; no model-facing prompt registration |

Tool specs use [ClineToolSpec](spec.ts), with canonical ID, model family, name, description, optional context requirements, and parameter definitions. Reuse existing shared specs for ordinary tools such as `read_file`, `read_file_range`, `apply_patch`, `write_to_file`, `send_user_message`, and `ask_followup_question`. For current spec examples, see [read_file_range.ts](tools/read_file_range.ts) and [send_user_message.ts](tools/send_user_message.ts).

Execution is a separate responsibility. Implement a handler under [task/tools/handlers](../../task/tools/handlers) and register it in [ToolExecutorCoordinator.toolHandlersMap](../../task/tools/ToolExecutorCoordinator.ts). Check the shared ID, assistant-message parameter parsing, [approval handling](../../task/tools/autoApprove.ts), [response-tool classification](../../task/tools/response/ResponseToolRegistry.ts), and any required [backend workflow contract](../../task/tools/backendWorkflowToolContracts.ts). Preserve existing path-policy, approval, hook, and execution controls. A prompt spec alone does not implement a callable backend tool.

The older [tool-authoring guide](../../../../docs/tools-reference/how-to-add-a-tool.md) still contains contextual-matrix and legacy-handler references. Use the current source links above and the canonical workflow module guide for those surfaces.

## Validation

Run commands from the repository root. Unit tests use Mocha and Chai through `scripts/run-unit-tests.cjs`.

Focused prompt validation:

```sh
npm run test:unit -- src/core/prompts/system-prompt/__tests__/PromptRegistry.test.ts src/core/prompts/system-prompt/__tests__/PromptBuilder.test.ts src/core/prompts/system-prompt/__tests__/TemplateEngine.test.ts src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/response_tools.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts
```

Normal integration runs compare against existing snapshots. To regenerate the prompt/native-tool snapshots after reviewing an intentional change:

```sh
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts --update-snapshots
```

`UPDATE_SNAPSHOTS=true` is also recognized by the integration suite. Snapshot updates write files under `__tests__/__snapshots__`; ordinary test runs do not regenerate them. Review the resulting diff. Workflow prompt tests should protect rendering, placement, token resolution, and exact tool surfaces without asserting exact editable workflow prompt prose.

A repository-style assertion uses Chai:

```typescript
import { expect } from "chai"
import { ModelFamily } from "@/shared/prompts"
import { createVariant } from "@/core/prompts/system-prompt/variants/variant-builder"
import { SystemPromptSection } from "@/core/prompts/system-prompt/templates/placeholders"

it("generates a template from the component order", () => {
	const config = createVariant(ModelFamily.GENERIC)
		.description("Template generation test.")
		.matcher(() => true)
		.components(SystemPromptSection.SYSTEM_INFO)
		.build()

	expect(config.baseTemplate).to.equal("{{SYSTEM_INFO_SECTION}}")
})
```

For implementation changes, also run the relevant handler/module tests and required project checks (`npm run check-types`, `npm run lint`, and package validation when prescribed by the applicable plan). These commands are not necessary merely to refresh this README; documentation changes should instead verify links, examples against live signatures, and the scope diff.
