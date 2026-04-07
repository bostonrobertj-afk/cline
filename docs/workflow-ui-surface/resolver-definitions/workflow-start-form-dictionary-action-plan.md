---
instructions:
  - Read each step in full before making any change.
  - Execute only the current step.
  - After completing a step, update that step’s checkbox from `[ ]` to `[x]`.
  - After updating a step to `[x]`, read the next step in full before making any further changes.
  - Do not pre-apply later-step edits.
  - Do not make any change not explicitly prescribed in this plan.
  - If a workflow-start key in `docs/workflow-ui-surface/workflow-start keys.md` does not have a usable one-line definition, stop and ask for input instead of improvising.
  - If any ambiguity or unplanned runtime seam appears, stop and ask for input instead of improvising.
---

# Workflow Start Form Dictionary Action Plan

## Step 1
[x] Add the workflow-start glossary entries and expand the system-dictionary type surface.

Allowed files:
- `src/core/task/workflow-form/dictionaries/systemDictionary.ts`

Read-only dependency:
- `docs/workflow-ui-surface/workflow-start keys.md`

Exact changes:
- In [systemDictionary.ts:9-31](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L9), keep `PHASE_1_SYSTEM_DICTIONARY_KEYS` unchanged.
- Immediately after `PHASE_1_SYSTEM_DICTIONARY_KEYS`, add a new exported constant named `WORKFLOW_START_SYSTEM_DICTIONARY_KEYS`.
- Populate `WORKFLOW_START_SYSTEM_DICTIONARY_KEYS` with the exact key spellings defined in `docs/workflow-ui-surface/workflow-start keys.md`.
- Add a new exported constant named `WORKFLOW_FORM_SYSTEM_DICTIONARY_KEYS` that concatenates `PHASE_1_SYSTEM_DICTIONARY_KEYS` and `WORKFLOW_START_SYSTEM_DICTIONARY_KEYS`.
- Change the `WorkflowFormSystemDictionaryKey` type at [systemDictionary.ts:31](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L31) to derive from `WORKFLOW_FORM_SYSTEM_DICTIONARY_KEYS`, not `PHASE_1_SYSTEM_DICTIONARY_KEYS`.
- In [systemDictionary.ts:33-167](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L33), keep every existing Phase 1 entry unchanged.
- Append new `workflowFormSystemDictionary` entries for every key defined in `docs/workflow-ui-surface/workflow-start keys.md`.
- For each appended workflow-start entry, set:
  - `label` to the exact key string
  - `medium` to the one-line definition text from `docs/workflow-ui-surface/workflow-start keys.md`
  - `long` to `""`
  - `examples` to `[]`
  - `contextTags` to a single-element array containing the exact key string
- Do not rename existing Phase 1 keys.
- Do not edit `renderSystemDictionaryMarkdown()` in this step.

## Step 2
[x] Centralize workflow-start dictionary configuration in `buildToolDictionary.ts` and make `Term Reference` omission conditional.

Allowed files:
- `src/core/task/workflow-form/dictionaries/buildToolDictionary.ts`

Exact changes:
- In [buildToolDictionary.ts:24-51](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L24), refactor `buildToolDictionaryEntryLines(...)` so it:
  - computes the resolved term-key list before emitting the `### Term Reference` section
  - emits the `### Term Reference` heading only when the resolved term-key list is non-empty
  - omits the entire section when the resolved term-key list is empty
- Keep the existing `### Parameters` behavior unchanged.
- Keep `buildReviewDiffOutputToolDictionaryConfig` unchanged at [buildToolDictionary.ts:55-77](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L55).
- Keep `buildReviewInputToolDictionaryConfig` unchanged at [buildToolDictionary.ts:78-91](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L78).
- Do not add the workflow-start config to `WorkflowFormRegistry.ts`.
- Add a new exported helper type guard or equivalent filtering helper in this file that accepts a `string` key and returns only keys present in `workflowFormSystemDictionary`.
- Add a new exported function named `buildWorkflowStartRuntimeToolDictionary(args)` with this exact input shape:
  - `{ fieldKeys: readonly string[] }`
- Implement `buildWorkflowStartRuntimeToolDictionary(args)` in this file so that it:
  - filters `args.fieldKeys` through `workflowFormSystemDictionary`
  - builds a workflow-start `WorkflowFormToolDictionaryConfig` locally in this file
  - uses `toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS`
  - uses `heading: "## set_workflow_placeholders"`
  - uses `runtimeTitle: "Workflow Placeholder Reference"`
  - uses the existing workflow-start overview copy:
    - `Persist dynamic placeholder values for the active workflow before the first AI turn begins.`
  - uses the existing workflow-start parameter description for `values`
  - passes the filtered workflow-start term keys into the config
  - returns an object with exactly:
    - `title`
    - `markdown`
- Set `title` to the config’s `runtimeTitle`.
- Set `markdown` to `buildRuntimeToolDictionaryMarkdownFromConfig(config)`.
- Keep `buildToolDictionaryMarkdown()` and `buildRuntimeToolDictionaryMarkdown()` unchanged as diff-output convenience wrappers at [buildToolDictionary.ts:112-117](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/buildToolDictionary.ts#L112).

## Step 3
[x] Remove the inline workflow-start dictionary config from `WorkflowFormRegistry.ts` and drive runtime modal content from the active workflow-start field set.

Allowed files:
- `src/core/task/workflow-form/WorkflowFormRegistry.ts`

Exact changes:
- In [WorkflowFormRegistry.ts:3-11](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L3), replace the `buildRuntimeToolDictionaryMarkdownFromConfig` import usage for workflow-start with an import of `buildWorkflowStartRuntimeToolDictionary`.
- Remove the inline `WORKFLOW_START_TOOL_DICTIONARY_CONFIG` object at [WorkflowFormRegistry.ts:235-244](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L235) entirely.
- In [WorkflowFormRegistry.ts:304-335](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L304), extract the ordered workflow-start field-key calculation into a helper named `getWorkflowStartOrderedFieldKeys(args)`.
- `getWorkflowStartOrderedFieldKeys(args)` must preserve the current field ordering and dedupe behavior:
  - required keys first
  - optional keys second
  - `oneOfRequirement.fieldKeys` last
  - first occurrence wins
- Update `buildWorkflowStartPlaceholderFieldDefinitions(...)` so it consumes the ordered key list from `getWorkflowStartOrderedFieldKeys(args)` instead of recomputing its own local `orderedKeys`.
- In the workflow-start resolver at [WorkflowFormRegistry.ts:630-669](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L630), compute `orderedFieldKeys` once from the active `workflowStartRequirements`.
- Use that same `orderedFieldKeys` value for both:
  - `buildWorkflowStartPlaceholderFieldDefinitions(...)`
  - `buildWorkflowStartRuntimeToolDictionary({ fieldKeys: orderedFieldKeys })`
- Destructure the result of `buildWorkflowStartRuntimeToolDictionary({ fieldKeys: orderedFieldKeys })` into `title` and `markdown`.
- Set:
  - `toolDictionaryTitle: title`
  - `toolDictionaryMarkdown: markdown`
- Keep workflow-start title override, prompt override, placeholder override, success message, failure message, and submission serialization behavior unchanged.
- Do not edit non-workflow-start resolvers in this step.

## Step 4
[x] Update tests so they reflect the new canonical workflow-start dictionary path and catch the previous empty-section drift.

Allowed files:
- `src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`
- `src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
- `src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
- `webview-ui/src/components/chat/ChatRow.test.tsx`
- `webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`

Exact changes:
- In [buildToolDictionary.test.ts:38-57](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts#L38), keep the existing generic configured-tool test, but extend the file with workflow-start-specific assertions.
- Add one new test in `buildToolDictionary.test.ts` that calls `buildWorkflowStartRuntimeToolDictionary({ fieldKeys: [...] })` using workflow-start keys that will exist in `docs/workflow-ui-surface/workflow-start keys.md`.
- In that new test, assert all of the following:
  - `title === "Workflow Placeholder Reference"`
  - `markdown` includes `## set_workflow_placeholders`
  - `markdown` includes `- \`values\` (required, object):`
  - `markdown` includes `### Term Reference`
  - `markdown` includes at least two mapped workflow-start keys from the added glossary set
- Add a second new test in `buildToolDictionary.test.ts` that calls `buildWorkflowStartRuntimeToolDictionary({ fieldKeys: ["unmapped_input"] })`.
- In that second test, assert all of the following:
  - `markdown` includes `## set_workflow_placeholders`
  - `markdown` includes `### Parameters`
  - `markdown` does not include `### Term Reference`
- In [WorkflowFormRegistry.test.ts:33-62](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L33), extend the existing `create-epics` workflow-start definition test so it also asserts:
  - `definition.toolDictionaryTitle === "Workflow Placeholder Reference"`
  - `definition.toolDictionaryMarkdown` includes `## set_workflow_placeholders`
  - `definition.toolDictionaryMarkdown` includes `### Term Reference`
  - `definition.toolDictionaryMarkdown` includes at least one mapped create-epics workflow-start key from the glossary set added in Step 1
- In [WorkflowFormRegistry.test.ts:519-585](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L519), extend the normalized workflow-start test so it asserts that mapped `review-adversarial-general` keys appear in `definition.toolDictionaryMarkdown`.
- Add a new workflow-start fallback test in `WorkflowFormRegistry.test.ts` using a synthetic workflow-start session whose `requiredFieldKeys` contain only `unmapped_input`.
- In that fallback test, assert:
  - `definition.toolDictionaryMarkdown` includes `## set_workflow_placeholders`
  - `definition.toolDictionaryMarkdown` does not include `### Term Reference`
- In [WorkflowFormRuntime.test.ts:548-587](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L548), keep the submit-path assertions unchanged.
- Add one new runtime payload test in `WorkflowFormRuntime.test.ts` that creates a real workflow-start session with mapped glossary keys and asserts:
  - `payload.definition.toolDictionaryTitle === "Workflow Placeholder Reference"`
  - `payload.definition.toolDictionaryMarkdown` includes mapped workflow-start glossary keys
  - `payload.definition.toolDictionaryMarkdown` includes `### Term Reference`
- Add one new runtime payload test in `WorkflowFormRuntime.test.ts` that creates a real workflow-start session with only `unmapped_input` and asserts:
  - `payload.definition.toolDictionaryMarkdown` does not include `### Term Reference`
- Keep the diff-output dictionary title contract aligned to `Diff Output Reference` for this slice.
- If Step 5 exposes stale `Diff Source Reference` expectations outside the workflow-start assertions, update those stale sites to `Diff Output Reference` instead of changing the diff-output dictionary config.
- In [WorkflowFormRuntime.test.ts:1024-1027](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts#L1024), if still present, change the install-like-environment expectation from `Diff Source Reference` to `Diff Output Reference`.
- In [ChatRow.test.tsx:91-93](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L91), if still present, change the synthetic diff-source workflow-form fixture title from `Diff Source Reference` to `Diff Output Reference`.
- In [ChatRow.test.tsx:383-385](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L383), if still present, change the read-only dialog title assertion from `Diff Source Reference` to `Diff Output Reference`.
- In [useMessageHandlers.test.tsx:545-547](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx#L545), if still present, change the synthetic system-owned workflow-form fixture title from `Diff Source Reference` to `Diff Output Reference`.

Stale-test prevention notes:
- Do not keep or add assertions that expect the workflow-start runtime modal to be only `## set_workflow_placeholders` with no contextual term rows.
- Do not add new ChatRow UI tests in this slice; only update the existing stale diff-output title fixtures/assertions listed above if they still use `Diff Source Reference`.

## Step 5
[x] Run verification, stop on the first failure, and only then mark this step complete.

Allowed files:
- `docs/workflow-ui-surface/resolver-definitions/workflow-start-form-dictionary-action-plan.md`

Run these commands in order:

1. `npm run test:unit -- src/core/task/workflow-form/dictionaries/__tests__/buildToolDictionary.test.ts`
2. `npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`
3. `npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRuntime.test.ts`
4. `cd webview-ui && npm run test -- src/components/chat/ChatRow.test.tsx`
5. `cd webview-ui && npm run test -- src/components/chat/chat-view/hooks/useMessageHandlers.test.tsx`
6. `npx tsc --noEmit`
7. `rg -n "WORKFLOW_START_SYSTEM_DICTIONARY_KEYS|buildWorkflowStartRuntimeToolDictionary|Workflow Placeholder Reference|Diff Output Reference|### Term Reference|set_workflow_placeholders" src/core/task/workflow-form webview-ui/src/components/chat docs/workflow-ui-surface/resolver-definitions`

Verification expectations:
- Step 1 glossary additions are present in `systemDictionary.ts`
- the inline workflow-start dictionary config no longer exists in `WorkflowFormRegistry.ts`
- the workflow-start runtime dictionary helper exists only in `buildToolDictionary.ts`
- workflow-start payloads include contextual `Term Reference` rows when mapped terms exist
- workflow-start payloads omit the `Term Reference` section entirely when no mapped terms exist
- stale `Diff Source Reference` expectations/fixtures outside the workflow-start slice are aligned to the canonical `Diff Output Reference` title

If any command fails:
- do not continue to the next command
- do not mark this step complete
- report the exact failure and stop
