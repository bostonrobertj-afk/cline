# How To Add A Tool

This guide describes how to add, register, and verify a new built-in tool in this fork.

It is grounded in the live runtime and prompt surfaces, including:

- [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts)
- [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts)
- [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts)
- [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts)
- [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts)
- [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts)

## Source Of Truth

Use these layers in this order:

1. Shared tool id: [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8)
2. Prompt-tool spec: [src/core/prompts/system-prompt/tools](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools)
3. Prompt-tool registration: [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L1)
4. Variant exposure: [variants](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants)
5. Runtime handler registration: [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L91)
6. Approval behavior: [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L42)
7. Response-tool exhaustiveness: [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L5)
8. Native-schema compaction: [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L461)
9. Workflow-specific gating if needed: [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L177)

## Important Note

[tools/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/README.md#L100) is directionally useful, but it is stale in one important way: it still refers to `register.ts`. The live registration entry point is [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L43).

## Required Steps

### 1. Add the canonical tool id

Add the new enum member to [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8) inside `ClineDefaultTool`.

Also decide whether the tool belongs in `READ_ONLY_TOOLS` at [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L68). Only add it there if it truly does not modify workspace state.

### 2. Add the prompt-tool spec

Create a new file in [src/core/prompts/system-prompt/tools](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools) following the current pattern used by [build_epics_document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_epics_document.ts#L1):

- import `ModelFamily`
- import `ClineDefaultTool`
- define `const id = ClineDefaultTool.YOUR_TOOL`
- export a `your_tool_variants` array

If the tool does not need model-specific behavior, a single `ModelFamily.GENERIC` variant is enough.

### 3. Register the prompt-tool spec

Update both files:

- [tools/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts)
- [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L43)

In `init.ts`:

- import the new `*_variants`
- spread those variants into `allToolVariants`

Without this step, the tool will not be available to the prompt registry or native tool schemas.

### 4. Expose the tool in variant configs

Add the tool to each relevant variant config under [variants](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants).

Example live placement: [gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts#L67).

If the tool should be globally available, add it to all applicable prompt variants. If it is workflow- or context-specific, pair this with contextual gating instead of relying only on broad variant exposure.

### 5. Register the runtime handler

Create a handler in [src/core/task/tools/handlers](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers), then wire it into [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L91):

- import the handler
- add a `toolHandlersMap` entry for the new `ClineDefaultTool` id

If the tool reuses an existing implementation under a different name, use `SharedToolHandler`. Otherwise register a dedicated handler.

### 6. Wire approval behavior

Update [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L42).

Map the tool into the correct approval branch:

- read-like tools
- edit/write-like tools
- command-like tools
- browser/MCP-like tools

If you skip this, the tool may not obey the existing UI approval settings correctly.

### 7. Update response-tool exhaustiveness

Update [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L5).

Every `ClineDefaultTool` enum member must be represented there, even if the new tool is not a response tool. For most normal tools, that means adding:

```ts
[ClineDefaultTool.YOUR_TOOL]: undefined,
```

### 8. Add native-schema compaction

If the tool is exposed to native tool-calling variants, add a concise native description branch in [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L467).

This repo actively compacts native tool descriptions for GPT-native surfaces. If you skip this, your tool may show up with a much noisier schema than neighboring tools.

If the tool has structured parameters that need special compact wording, also add parameter-description handling in the same file.

### 9. Add contextual gating if the tool is not globally available

If the tool should only appear for certain workflows or steps, update [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L177) and any related bundle definitions it depends on.

This is how tools like `build_epics_document` are narrowed to specific workflow steps in this fork.

## Testing Checklist

At minimum, add or update tests for the seams you touched:

- handler runtime tests in [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts) or a focused handler test file
- prompt-spec exposure tests in [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts)
- contextual-filter tests in [contextualNativeToolFilter.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts) if gating changed
- integration/native-schema tests in [integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)
- response-tool exhaustiveness tests in [ResponseToolRuntime.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts) if you touched `ResponseToolRegistry`

Common verification commands:

```bash
npm run test:unit -- src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts --exit
npm run test:unit -- src/core/prompts/system-prompt/__tests__/spec.test.ts --exit
npm run test:unit -- src/core/prompts/system-prompt/__tests__/contextualNativeToolFilter.test.ts --exit
npm run test:unit -- src/core/task/tools/response/__tests__/ResponseToolRuntime.test.ts --exit
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts --exit
npx tsc --noEmit
```

If integration snapshots change intentionally, rerun with `--update-snapshots`.

## Workflow-Owned Tool Pattern

For workflow-owned deterministic tools in this fork, the closest live sibling patterns are:

- [build_review_input.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_input.ts)
- [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts)
- [build_epics_document.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_epics_document.ts)
- [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts)

Those tools are good references when your tool:

- resolves inputs from workflow placeholder state
- has no user-supplied parameters
- writes a deterministic artifact
- needs workflow-step-specific contextual gating

## Fast Audit Before You Call It Done

Before you consider a new tool fully wired, verify all of these:

- the tool id exists in `ClineDefaultTool`
- the prompt-tool file exports `*_variants`
- `tools/index.ts` exports it
- `init.ts` imports and registers it
- every intended variant config includes it
- `ToolExecutorCoordinator` can instantiate its handler
- `autoApprove.ts` routes it to the right approval category
- `ResponseToolRegistry.ts` includes an entry for exhaustiveness
- `spec.ts` has native compaction if native variants expose it
- contextual gating is updated if availability is step-specific
- tests cover runtime, exposure, and gating

## Best Existing References

For this fork, these are the most useful docs to read alongside the code:

- [CONTRIBUTING.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/CONTRIBUTING.md#L629)
- [tools/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/README.md#L100)
- [local-diff-output-builder.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/local-diff-output-builder.md#L18)

`local-diff-output-builder.md` is especially useful because it documents the real blast radius for a new tool in this fork, including runtime registration, approval policy, native-schema compaction, prompt variants, and tests.
