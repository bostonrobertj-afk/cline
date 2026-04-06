---
instructions:
  - Read each step in full before making any changes.
  - Execute only the current step.
  - After completing the current step, update that step's checkbox from `[ ]` to `[x]`.
  - After updating the checkbox, read the next step in full before making any further changes.
  - Do not pre-apply edits from later steps.
  - Do not edit any file not listed in the current step's allowed-files list.
  - If any ambiguity, conflicting live seam, or unplanned required change is discovered, stop and ask for input before proceeding.
---

# PI Planning Persona Activation Action Plan

## Scope Lock

This plan implements the `pi-planning.md` persona-activation slice defined in [persona-activation-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/pi-planning/persona-activation-requirements.md).

Live seam audit completed before authoring this plan:

- [workflowPersonaRegistry.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts#L14) is the only registry source of workflow-to-persona truth.
- [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L2154) already resolves workflow persona instructions through `resolveWorkflowPersonaInstructions(activeWorkflowName)`.
- [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts#L975) already resolves workflow persona instructions through the same registry when full prompt assembly is enabled.
- [agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts#L12) already injects `activeWorkflowPersonaInstructions` without workflow-specific branching.
- [workflow-persona-mapping.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md#L28) is the in-repo human mapping inventory and currently lacks `pi-planning.md`.

Because those runtime seams already match the required injection model, this plan must not edit [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts), [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts), or [agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts) in this slice.

## Steps

- [x] Step 1: Add the `pi-planning.md` runtime mapping and align the human inventory
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md`
  - In [workflowPersonaRegistry.ts:39](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts#L39), insert the exact mapping entry:
    ```ts
    	"pi-planning.md": "scrum-master",
    ```
    between:
    ```ts
    	"market-research.md": "analyst",
    ```
    and:
    ```ts
    	"qa-generate-e2e-tests.md": "quality-control",
    ```
  - Do not edit:
    - the `WorkflowPersonaId` union
    - `WORKFLOW_PERSONA_INSTRUCTIONS`
    - `resolveWorkflowPersonaId(...)`
    - `resolveWorkflowPersonaInstructions(...)`
  - In [workflow-persona-mapping.md:58](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/persona-activation/workflow-persona-mapping.md#L58), insert the exact inventory row:
    ```md
    | `pi-planning.md` | `scrum-master` | New explicit mapping. |
    ```
    between:
    ```md
    | `market-research.md` | `analyst` | Preserves current unique owner (`bmad-analyst`). |
    ```
    and:
    ```md
    | `qa-generate-e2e-tests.md` | `quality-control` | Preserves current unique owner (`bmad-qa`). |
    ```
  - Do not edit any other mapping row or note text in the inventory.

- [x] Step 2: Add resolver-level regression coverage using registry-driven assertions
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/workflowPersonaRegistry.test.ts`
  - Create the new file [workflowPersonaRegistry.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/workflowPersonaRegistry.test.ts).
  - In that file:
    - import `expect` from `chai`
    - import `describe` and `it` from `mocha`
    - import:
      - `resolveWorkflowPersonaId`
      - `resolveWorkflowPersonaInstructions`
      - `WORKFLOW_PERSONA_INSTRUCTIONS`
      from `../registry/workflowPersonaRegistry`
  - Add a test titled exactly:
    - `it("resolves pi-planning.md to the scrum-master persona id", () => { ... })`
  - In that test, assert:
    - `resolveWorkflowPersonaId("pi-planning.md") === "scrum-master"`
    - `resolveWorkflowPersonaId("pi-planning") === "scrum-master"`
  - Add a second test titled exactly:
    - `it("resolves pi-planning.md to the existing scrum-master persona instructions", () => { ... })`
  - In that test, assert:
    - `resolveWorkflowPersonaInstructions("pi-planning.md") === WORKFLOW_PERSONA_INSTRUCTIONS["scrum-master"]`
  - Use the exported `WORKFLOW_PERSONA_INSTRUCTIONS["scrum-master"]` constant in the assertion instead of copying the persona prose into the test. This is required to avoid stale assertion failures if persona prose changes later.

- [x] Step 3: Extend full-prompt and continuation prompt coverage for `pi-planning.md`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts`
  - In [integration.test.ts:1686](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L1686), keep the existing `code-review.md` persona tests unchanged.
  - Immediately after the existing full-prompt persona test, add a new test titled exactly:
    - `it("injects scrum-master workflow persona guidance for pi-planning full prompts without XML artifacts", async function () { ... })`
  - Use the same `runPromptTest(...)` pattern and `"gpt-5.4-2026-03-05"` model id as the existing sibling test.
  - Set:
    - `providerInfo: makeProviderInfo("gpt-5.4-2026-03-05", "openai")`
    - `enableNativeToolCalls: true`
    - `useMinimalGptPrompt: true`
    - `activeWorkflowName: "pi-planning.md"`
    - `activeWorkflowPersonaInstructions: resolveWorkflowPersonaInstructions("pi-planning.md")`
  - In that test:
    - assign `const personaInstructions = resolveWorkflowPersonaInstructions("pi-planning.md") ?? ""`
    - assert `personaInstructions` is not empty
    - assert `systemPrompt` includes `personaInstructions`
    - assert `systemPrompt` includes `Role: Scrum Master`
    - assert `systemPrompt` does not include `<agent`
    - assert `systemPrompt` does not include `<persona`
    - assert `systemPrompt` does not include `Active BMAD agent persona`
  - Immediately after the existing continuation omission test, add a new test titled exactly:
    - `it("omits pi-planning workflow persona guidance on continuation turns", async function () { ... })`
  - Use the same continuation-turn pattern as the existing sibling test, but set:
    - `activeWorkflowName: "pi-planning.md"`
    - `activeWorkflowPersonaInstructions: undefined`
  - In that continuation test:
    - assign `const personaInstructions = resolveWorkflowPersonaInstructions("pi-planning.md") ?? ""`
    - assert `personaInstructions` is not empty
    - assert `systemPrompt` does not include `personaInstructions`
    - assert `systemPrompt` does not include `Role: Scrum Master`
  - Do not update snapshots in this slice.
  - Do not edit prompt component source files.

- [x] Step 4: Extend subagent prompt-context coverage for `pi-planning.md`
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
  - Add an import for `resolveWorkflowPersonaInstructions` from:
    - `@/core/prompts/system-prompt/registry/workflowPersonaRegistry`
  - In [SubagentRunner.test.ts:2580](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L2580), keep the existing `code-review.md` full-prompt test unchanged.
  - Immediately after that test, add a new test titled exactly:
    - `it("builds scrum-master workflow persona instructions for pi-planning full prompt assembly", async () => { ... })`
  - Use the same structure as the existing sibling test, but set:
    - `state.activePlaceholderWorkflowId = "pi-planning.md"`
    - `state.activePlaceholderWorkflowSource.name = "pi-planning.md"`
    - `state.activePlaceholderWorkflowSource.contents = "# PI Planning\nPlan and refine stories."`
  - In that test, assert:
    - `context.managedWorkflowActive === false`
    - `context.activeWorkflowName === "pi-planning.md"`
    - `context.activeWorkflowPersonaInstructions === resolveWorkflowPersonaInstructions("pi-planning.md")`
    - `context.activeWorkflowPersonaInstructions` contains `Role: Scrum Master`
    - `context.activeWorkflowReminder === undefined`
    - `context.activeWorkflowSupportsPlaceholders === true`
  - In [SubagentRunner.test.ts:2613](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts#L2613), keep the existing `code-review.md` internal-turn suppression test unchanged.
  - Immediately after that test, add a new test titled exactly:
    - `it("suppresses pi-planning workflow persona instructions on internal turns without full prompt assembly", async () => { ... })`
  - Use the same structure as the existing sibling suppression test, but set:
    - `state.activePlaceholderWorkflowId = "pi-planning.md"`
    - `state.activePlaceholderWorkflowSource.name = "pi-planning.md"`
    - `state.activePlaceholderWorkflowSource.contents = "# PI Planning\nPlan and refine stories."`
  - In that suppression test, assert:
    - `context.activeWorkflowName === "pi-planning.md"`
    - `context.activeWorkflowPersonaInstructions === undefined`
    - `context.activeWorkflowReminder === undefined`
    - `context.enableNativeToolCalls === true`
    - `context.enableParallelToolCalling === false`
    - `context.isSubagentRun === true`
  - Do not edit [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts), [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts), or [agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts) in this step.

- [x] Step 5: Run verification and string-contract audit
  - Allowed files:
    - none
  - Run these commands in order, and stop on the first failure:
    1. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/workflowPersonaRegistry.test.ts`
    2. `npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts`
    3. `npm run test:unit -- src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`
    4. `npx tsc --noEmit`
    5. `rg -n '"pi-planning.md"|scrum-master|resolveWorkflowPersonaInstructions|resolveWorkflowPersonaId|Role: Scrum Master' src/core/prompts/system-prompt src/core/task/tools/subagent docs/workflow-automation/persona-activation docs/workflow-automation/pi-planning`
  - Verification expectations:
    - no snapshot updates are required
    - no changes are allowed in [index.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts)
    - no changes are allowed in [SubagentRunner.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts)
    - no changes are allowed in [agent_role.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts)
  - If any verification failure suggests one of those already-aligned runtime files must change, stop and ask for input instead of expanding this slice automatically.
