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

Bucket selection is the first required decision.

### 1. Shared Tool Ids

All built-in tools start in [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8) under `ClineDefaultTool`.

Adding an enum member there does **not** decide prompt exposure by itself.

### 2. Prompt-Exposed Tools

Prompt-exposed tools follow the system-prompt tool path:

1. shared tool id in [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8)
2. prompt-tool spec in [src/core/prompts/system-prompt/tools](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools)
3. prompt-tool registration in [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L1)
4. variant exposure in [variants](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants)
5. native-schema compaction in [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L461)
6. workflow-specific contextual gating in [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L177) when needed

### 3. Backend-Only Workflow Automation Tools

Backend-only workflow automation tools follow the runtime-owned backend contract path under [src/core/task/tools](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools):

1. shared tool id in [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8)
2. backend contract shape in [backendWorkflowToolContractTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/backendWorkflowToolContractTypes.ts)
3. backend contract registry in [backendWorkflowToolContracts.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts)
4. runtime handler registration in [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L91)

Backend-only workflow automation tools must **not** be added to prompt tool specs, [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts), prompt variant configs, [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts) native-compaction branches, or [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts).

### 4. Shared Runtime Seams

Both buckets still share these runtime requirements:

1. runtime handler registration: [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L91)
2. approval behavior: [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L42)
3. response-tool exhaustiveness: [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L5)

## Important Note

[tools/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/README.md) is the repo-local reference for prompt-exposed tool registration details in `tools/` and already reflects the current `init.ts` entrypoint.

## Required Steps

### 1. Add the canonical tool id

Add the new enum member to [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L8) inside `ClineDefaultTool`.

Also decide whether the tool belongs in `READ_ONLY_TOOLS` at [tools.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/tools.ts#L68). Only add it there if it truly does not modify workspace state.

### 2. If the tool is prompt-exposed, add the prompt-tool spec

Create a new file in [src/core/prompts/system-prompt/tools](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools) following the current pattern used by [build_review_diff_output.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/build_review_diff_output.ts#L1):

- import `ModelFamily`
- import `ClineDefaultTool`
- define `const id = ClineDefaultTool.YOUR_TOOL`
- export a `your_tool_variants` array

If the tool does not need model-specific behavior, a single `ModelFamily.GENERIC` variant is enough.

### 3. If the tool is prompt-exposed, register the prompt-tool spec

Update both files:

- [tools/index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/index.ts)
- [init.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/init.ts#L43)

In `init.ts`:

- import the new `*_variants`
- spread those variants into `allToolVariants`

Without this step, the tool will not be available to the prompt registry or native tool schemas.

### 4. If the tool is prompt-exposed, expose the tool in variant configs

Add the tool to each relevant variant config under [variants](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants).

Example live placement: [gpt-5/config.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts#L67).

If the tool should be globally available, add it to all applicable prompt variants. If it is workflow- or context-specific, pair this with contextual gating instead of relying only on broad variant exposure.

### 5. If the tool is backend-only workflow automation, add the backend contract

Update [backendWorkflowToolContractTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/backendWorkflowToolContractTypes.ts) only if the shared runtime contract shape itself must change.

Add the tool contract entry to [backendWorkflowToolContracts.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts) instead of creating a prompt-tool file.

This is the canonical contract source for backend-only workflow automation used by workflow forms, workflow completion, and other runtime-owned automation seams.

### 6. Register the runtime handler

Create a handler in [src/core/task/tools/handlers](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers), then wire it into [ToolExecutorCoordinator.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/ToolExecutorCoordinator.ts#L91):

- import the handler
- add a `toolHandlersMap` entry for the new `ClineDefaultTool` id

If the tool reuses an existing implementation under a different name, use `SharedToolHandler`. Otherwise register a dedicated handler.

### 7. Wire approval behavior

Update [autoApprove.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/autoApprove.ts#L42).

Map the tool into the correct approval branch:

- read-like tools
- edit/write-like tools
- command-like tools
- browser/MCP-like tools

If you skip this, the tool may not obey the existing UI approval settings correctly.

### 8. Update response-tool exhaustiveness

Update [ResponseToolRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/response/ResponseToolRegistry.ts#L5).

Every `ClineDefaultTool` enum member must be represented there, even if the new tool is not a response tool. For most normal tools, that means adding:

```ts
[ClineDefaultTool.YOUR_TOOL]: undefined,
```

### 9. If the tool is prompt-exposed, add native-schema compaction

If the tool is exposed to native tool-calling variants, add a concise native description branch in [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L467).

This repo actively compacts native tool descriptions for GPT-native surfaces. If you skip this, your tool may show up with a much noisier schema than neighboring tools.

If the tool has structured parameters that need special compact wording, also add parameter-description handling in the same file.

### 10. If the tool is prompt-exposed and not globally available, add contextual gating

If the tool should only appear for certain workflows or steps, update [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L177) and any related bundle definitions it depends on.

This is how prompt-exposed workflow tools are narrowed to specific workflow steps in this fork.

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

For backend-only workflow automation tools in this fork, the closest live sibling patterns are:

- [backendWorkflowToolContracts.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/backendWorkflowToolContracts.ts)
- [backendWorkflowToolContractTypes.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/backendWorkflowToolContractTypes.ts)
- [BuildReviewInputToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildReviewInputToolHandler.ts)
- [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts)

Those tools are good references when your tool:

- resolves inputs from workflow placeholder state
- has no user-supplied parameters
- writes a deterministic artifact
- needs workflow-step-specific contextual gating

## Fast Audit Before You Call It Done

Before you consider a new tool fully wired, verify all of these:

- the tool id exists in `ClineDefaultTool`
- prompt-exposed tools only: the prompt-tool file exports `*_variants`
- prompt-exposed tools only: `tools/index.ts` exports it
- prompt-exposed tools only: `init.ts` imports and registers it
- prompt-exposed tools only: every intended variant config includes it
- backend-only workflow automation tools only: `backendWorkflowToolContracts.ts` includes the runtime-owned contract entry
- backend-only workflow automation tools only: no prompt-tool file, `init.ts` entry, variant-config entry, native-compaction branch, or contextual-tool bundle was added for the backend-only tool
- `ToolExecutorCoordinator` can instantiate its handler
- `autoApprove.ts` routes it to the right approval category
- `ResponseToolRegistry.ts` includes an entry for exhaustiveness
- `spec.ts` has native compaction if native variants expose it
- contextual gating is updated if a prompt-exposed tool is step-specific
- tests cover runtime, exposure, and gating

## Best Existing References

For this fork, these are the most useful docs to read alongside the code:

- [CONTRIBUTING.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/CONTRIBUTING.md#L629)
- [tools/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/README.md#L100)
- [local-diff-output-builder.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/local-diff-output-builder.md#L18)

`local-diff-output-builder.md` is especially useful because it documents the real blast radius for a new tool in this fork, including runtime registration, approval policy, native-schema compaction, prompt variants, and tests.
