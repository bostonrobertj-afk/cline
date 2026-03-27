## Goal

Implement the proposed remediation for the `Agent Struggled with set_workflow_placeholders` finding in [test-18-findings.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/test-18-findings.md): make the required wrapper shape unmistakable in compact native tool schema output, inject the usage guidance into the Native GPT-5 prompt variant, and add regression coverage so this does not drift again.

## Scope

This plan is only for the `set_workflow_placeholders` usability/prompting issue. It does not change placeholder persistence semantics, workflow rendering, or the new canonical stable-config path beyond referencing it accurately in prompt text.

## Implementation Steps

### 1. Tighten the compact native schema output for `set_workflow_placeholders`

File: [src/core/prompts/system-prompt/spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts)

Current change points:
- [spec.ts:460](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L460)
- [spec.ts:499](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L499)

Required changes:
- Update the compact native tool description returned by `getNativeToolDescription(...)` for `set_workflow_placeholders` so it shows the actual wrapper shape instead of an unwrapped object example.
- Replace the current example:
  `{"story_path":"docs/story.md","project_context":"docs/project-context.md"}`
  with a wrapper example:
  `{"values":{"story_path":"docs/story.md","project_context":"docs/project-context.md"}}`
- Update the compact parameter description returned by `getNativeToolParameterDescription(...)` for `tool.name === "set_workflow_placeholders"` and `param.name === "values"` so it explicitly says the tool must be called as `{"values": {...}}`, not just that `values` is an object map.
- Keep the dynamic-vs-stable distinction in the wording:
  dynamic values belong in `set_workflow_placeholders`
  stable config-backed values like `output_folder` come from `.cline/workflow-config.yaml`

Acceptance criteria:
- Compact native tool schemas show the wrapper shape in both the tool-level description and the `values` parameter description.
- A model reading only the compact native schema can infer the required call shape without trial-and-error.

### 2. Inject the placeholder guidance into the Native GPT-5 prompt variant

Files:
- [src/core/prompts/system-prompt/variants/native-gpt-5/template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/template.ts)
- reference implementations:
  - [src/core/prompts/system-prompt/variants/gpt-5/template.ts:6](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/template.ts#L6)
  - [src/core/prompts/system-prompt/variants/native-next-gen/template.ts:6](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/template.ts#L6)
  - [src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts:6](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L6)

Current change points:
- [native-gpt-5/template.ts:29](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/template.ts#L29)

Required changes:
- Add the same `getWorkflowPlaceholderToolGuidance(context)` helper pattern used in the sibling GPT-family variants.
- Inject the line:
  `- When a step sets a placeholder value, use \`set_workflow_placeholders\`.`
  into the Native GPT-5 prompt when either of these conditions is true:
  - `context.managedWorkflowActive`
  - `context.activeWorkflowSupportsPlaceholders`
- Place that guidance in the same task-progress / workflow-guidance neighborhood used by the sibling templates so the prompt remains consistent across GPT-family variants.
- While editing, confirm the variant still includes the placeholder-workflow `task_progress` guidance and that the inserted guidance does not collapse section spacing.

Acceptance criteria:
- Native GPT-5 receives the same `set_workflow_placeholders` usage reminder as GPT-5, Native GPT-5.1, and Native Next Gen.
- The guidance appears only when a placeholder-capable workflow is active.

### 3. Add focused regression coverage for Native GPT-5

File: [src/core/prompts/system-prompt/__tests__/integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)

Current change points:
- [integration.test.ts:517](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts#L517)

Required changes:
- Extend the existing `includes set_workflow_placeholders guidance for placeholder workflows across prompt variants` test to add a Native GPT-5 case.
- Use the same workflow-enabled context pattern already used in that test:
  - `activeWorkflowSupportsPlaceholders: true`
  - `managedWorkflowActive: false`
- Assert that the Native GPT-5 rendered prompt includes:
  - `When a step sets a placeholder value, use \`set_workflow_placeholders\`.`
  - one of the valid placeholder-workflow / `task_progress` snippets already used by the test
- Keep the existing GPT-5, Native GPT-5.1, and Native Next Gen cases intact.

Acceptance criteria:
- The integration test fails if Native GPT-5 loses the guidance again.
- The test still verifies the companion placeholder-workflow `task_progress` language, not just the one-line reminder.

### 4. Add direct schema-level assertions for the compact wrapper example

Files:
- [src/core/prompts/system-prompt/__tests__/integration.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/integration.test.ts)
- optionally [src/core/prompts/system-prompt/__tests__/spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts) if there is already a lower-level schema test pattern that fits better

Required changes:
- Add a compact-native-schema assertion that `set_workflow_placeholders` exposes the wrapped example `{"values": {...}}`.
- Add a parameter-level assertion that the `values` parameter description says the tool must be called as `{"values": {...}}`.
- Keep the assertion targeted to the compact native path so future generic-schema wording changes do not create noisy failures.

Acceptance criteria:
- A regression in compact native schema wording fails a focused test before it reaches runtime.

## Verification

Run at least:

1. `npm run test:unit -- --exit src/core/prompts/system-prompt/__tests__/spec.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts`
2. `npx tsc --noEmit`

If snapshots or prompt fixtures are affected, update them only if the rendered changes match the intended remediation above.

## Expected Result

After these changes:
- Native GPT-family prompts consistently tell the model when to use `set_workflow_placeholders`.
- Compact native schema output shows the true wrapper shape `{"values": {...}}`.
- The model no longer has to infer the call shape from an error message.
- Native GPT-5 is covered by the same regression checks already guarding the sibling variants.
