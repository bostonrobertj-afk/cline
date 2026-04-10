# Agent 101

## Intro

This repo is a custom Cline fork with deep BMAD integration.

Work is ongoing to enable more automated runtime behavior for placeholder workflows, so new agents should assume that workflow behavior is split across:

- workflow documents
- runtime orchestration code
- prompt and tool filtering
- UI startup and workflow-form surfaces
- workflow-specific automation and progression logic

This document is a lightweight onboarding guide. It is not an exhaustive spec.

## Start Here

Read these first if you need to get productive quickly:

- Repo and architecture overview:
  - [README.md](/Users/robertboston/Documents/Cline%20Extension/cline/README.md)
  - [src/core/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/README.md)
  - [.clinerules/cline-overview.md](/Users/robertboston/Documents/Cline%20Extension/cline/.clinerules/cline-overview.md)
- Workflow runtime:
  - [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md)
  - [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-automation-readme.md)
  - [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)
- Prompt and tool surface:
  - [system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md)
  - [how-to-add-a-tool.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md)
  - [src/core/prompts/system-prompt/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/README.md)
  - [src/core/prompts/system-prompt/tools/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/README.md)

## Workflow Runtime

These docs explain how placeholder workflows are actually run and managed:

- High-level lifecycle and runtime touchpoints:
  - [workflow-document-runtime-review.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-document-runtime-review.md)
- Workflow automation and completion handling:
  - [workflow-automation-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/workflow-automation-readme.md)
- Deterministic progression:
  - [deterministic-workflow-progression-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflows/deterministic-workflow-progression-readme.md)

## Workflow UI Surfaces

Placeholder workflows can be intercepted by system-owned startup and step-resolution UI.

- Workflow-start cards:
  - [docs/workflow-automation/workflow-start-card/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/README.md)
- Workflow forms:
  - [docs/workflow-ui-surface/workflow-form-readme.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/workflow-form-readme.md)
- Non-interactive deterministic workflow-step resolution:
  - [architecture.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/architecture.md)
  - [requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-ui-surface/non-interactive-deterministic-workflow-step-resolution/requirements.md)

## Prompt And Tooling

These files are useful when you need to understand what the model can see and what tools can be exposed in a given turn:

- Consolidated tool inventory:
  - [docs/system-prompt-tool-reference.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/system-prompt-tool-reference.md)
- Bucket selection and tool wiring:
  - [docs/tools-reference/how-to-add-a-tool.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/tools-reference/how-to-add-a-tool.md)
- System prompt architecture:
  - [src/core/prompts/system-prompt/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/README.md)
- Prompt-defined tool registration:
  - [src/core/prompts/system-prompt/tools/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/tools/README.md)

## UI / Webview

If the task touches the product UI, onboarding should include these docs:

- Storybook and UI development surface:
  - [webview-ui/.storybook/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/.storybook/README.md)
- Settings UI notes:
  - [webview-ui/src/components/settings/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/settings/README.md)

## CLI / SDK / Platform Docs

These are useful when the task extends beyond placeholder workflows:

- CLI:
  - [cli/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/cli/README.md)
  - [docs/cline-cli/overview.mdx](/Users/robertboston/Documents/Cline%20Extension/cline/docs/cline-cli/overview.mdx)
  - [docs/cline-cli/samples/overview.mdx](/Users/robertboston/Documents/Cline%20Extension/cline/docs/cline-cli/samples/overview.mdx)
- SDK and API:
  - [docs/cline-sdk/overview.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/cline-sdk/overview.md)
  - [docs/api/overview.mdx](/Users/robertboston/Documents/Cline%20Extension/cline/docs/api/overview.mdx)
- MCP:
  - [docs/mcp/mcp-overview.mdx](/Users/robertboston/Documents/Cline%20Extension/cline/docs/mcp/mcp-overview.mdx)

## Testing / Evals

These are the most relevant repo-local testing references I found:

- [testing-platform/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/testing-platform/README.md)
- [evals/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/evals/README.md)
- [evals/e2e/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/evals/e2e/README.md)
- [evals/smoke-tests/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/evals/smoke-tests/README.md)
- [src/test/e2e/README.md](/Users/robertboston/Documents/Cline%20Extension/cline/src/test/e2e/README.md)

## Practical Guidance

When supporting the user, assume that workflow behavior is rarely defined in one place.

For any workflow-related task, check at least:

- the authored workflow file in `/Users/robertboston/Documents/Cline/Workflows/`
- workflow runtime docs in `docs/workflows/`
- prompt/tool bucket docs in `docs/tools-reference/how-to-add-a-tool.md`, `docs/system-prompt-tool-reference.md`, and `src/core/prompts/system-prompt/`
- startup / workflow-form docs if the task touches pre-turn interception or deterministic UI
- relevant UI docs if the behavior is rendered in the webview
