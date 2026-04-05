---
title: Create Epics Workflow-Start Form Remediation Action Plan
instructions:
  - Read this plan top to bottom before making any changes.
  - Execute only one step at a time.
  - Before starting a step, read that step in full, including its allowed-files list and exact edit instructions.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not edit any file not listed in the current step's allowed-files list.
  - If any ambiguity is discovered, or any additional file or behavior change appears necessary, stop and ask the user before proceeding.
  - This remediation plan exists because the original `create-epics` workflow-start action plan prescribed a field-level dictionary UX without explicit user approval. The remediation must remove that unauthorized UX and realign the implementation to the preexisting workflow-form behavior.
  - Preserve the valid `create-epics.md` Step 1 authoring, workflow-start override copy, placeholder serialization behavior, slash-command trigger path, and form-level `Open inputs reference` behavior.
---

# Create Epics Workflow-Start Form Remediation Action Plan

## Scope

This plan remediates the unauthorized field-level dictionary-entry buildout introduced during the `create-epics.md` workflow-start form implementation.

This plan is intentionally limited to:

- removing the unauthorized shared `dictionaryEntry` workflow-form field contract
- removing the unauthorized `create-epics.md` field-level dictionary plumbing
- restoring the existing workflow-form UI behavior that uses only the form-level `Open inputs reference` affordance
- removing the regression tests that lock in the unauthorized field-level UX
- adding a supersession note to the original action plan so future execution does not reintroduce the bad seam

This plan does **not** change:

- `/Users/robertboston/Documents/Cline/Workflows/create-epics.md`
- deterministic progression
- the `create-epics.md` workflow-start title, prompt, labels, help text, or placeholders
- `set_workflow_placeholders` request shape or trigger behavior

## Verified current bad seam

- The live shared contract now contains `WorkflowFormFieldDictionaryEntry` and `WorkflowFormFieldDefinition.dictionaryEntry` in [ExtensionMessage.ts:405](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L405).
- The live registry now threads `dictionaryEntry` through the shared schema-backed field helper and the `create-epics.md` override path in [WorkflowFormRegistry.ts:52](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L52), [WorkflowFormRegistry.ts:249](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L249), and [WorkflowFormRegistry.ts:315](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L315).
- The live system dictionary was expanded with `create-epics`-specific keys and an entry renderer solely to support that field-level UI in [systemDictionary.ts:31](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L31) and [systemDictionary.ts:217](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L217).
- The live ChatRow now renders field labels as clickable buttons and opens a second dictionary dialog in [ChatRow.tsx:295](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L295), [ChatRow.tsx:610](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L610), and [ChatRow.tsx:788](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L788).
- The live tests now assert the unauthorized field-level UX in [ChatRow.test.tsx:386](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L386) and [WorkflowFormRegistry.test.ts:33](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L33).
- The original action plan explicitly prescribed the unauthorized field-level UX in [workflow-start-form-action-plan.md:22](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/workflow-start-form-action-plan.md#L22), [workflow-start-form-action-plan.md:67](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/workflow-start-form-action-plan.md#L67), and [workflow-start-form-action-plan.md:347](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/workflow-start-form-action-plan.md#L347).

## Locked decisions

- The remediation target is the preexisting workflow-form UX pattern:
  - one form-level `Open inputs reference` affordance
  - plain inline field labels
  - plain inline field help text
- This remediation must not invent any replacement field-level affordance.
- `create-epics.md` keeps its approved workflow-start override copy:
  - title: `Inputs for This Workflow`
  - prompt: `Provide the following to start the workflow:`
  - labels/help/placeholders from the existing `create-epics.md` override stay intact
- The remediation must remove the unauthorized shared-type and UI surface entirely rather than leaving dead field-level dictionary plumbing in place.

## String-contract audit

After remediation, these strings and identifiers must remain true:

- workflow filename: `create-epics.md`
- resolver id: `placeholder_workflow_start_set_workflow_placeholders`
- tool name: `set_workflow_placeholders`
- title: `Inputs for This Workflow`
- prompt: `Provide the following to start the workflow:`
- placeholders:
  - `architecture_document`
  - `prd`
  - `mode`
  - `ux_spec`
  - `ui_spec`

After remediation, these unauthorized seams must be absent from runtime code:

- `WorkflowFormFieldDictionaryEntry`
- `dictionaryEntry` on `WorkflowFormFieldDefinition`
- `WORKFLOW_START_SYSTEM_DICTIONARY_KEYS`
- `WORKFLOW_FORM_SYSTEM_DICTIONARY_KEYS`
- `renderSystemDictionaryEntryMarkdown`
- `Read-only reference for this workflow input.`

## Step 1
[x] Remove the unauthorized shared field-level dictionary contract and registry plumbing while preserving the valid `create-epics.md` workflow-start override copy.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

Exact edits:
1. In [ExtensionMessage.ts:405](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L405), delete the entire `WorkflowFormFieldDictionaryEntry` interface.
2. In [ExtensionMessage.ts:410](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L410), remove `dictionaryEntry?: WorkflowFormFieldDictionaryEntry` from `WorkflowFormFieldDefinition`.
3. In [systemDictionary.ts:31](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L31), delete:
   - `WORKFLOW_START_SYSTEM_DICTIONARY_KEYS`
   - `WORKFLOW_FORM_SYSTEM_DICTIONARY_KEYS`
4. Replace the `WorkflowFormSystemDictionaryKey` type alias at [systemDictionary.ts:44](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L44) so it is again:

```ts
export type WorkflowFormSystemDictionaryKey = (typeof PHASE_1_SYSTEM_DICTIONARY_KEYS)[number]
```

5. In `workflowFormSystemDictionary` at [systemDictionary.ts:180](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L180), delete the five unauthorized entries:
   - `architecture_document`
   - `prd`
   - `mode`
   - `ux_spec`
   - `ui_spec`
6. Delete the entire `renderSystemDictionaryEntryMarkdown(...)` helper at [systemDictionary.ts:217](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L217).
7. In `renderSystemDictionaryMarkdown()` at [systemDictionary.ts:232](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L232), restore the original inline Phase 1 loop body:

```ts
	for (const key of PHASE_1_SYSTEM_DICTIONARY_KEYS) {
		const entry = workflowFormSystemDictionary[key]
		lines.push(`## ${key}`)
		lines.push("")
		lines.push(`- Label: ${entry.label}`)
		lines.push(`- Medium: ${entry.medium}`)
		lines.push(`- Long: ${entry.long}`)
		lines.push(`- Examples: ${entry.examples.join(" | ")}`)
		lines.push(`- Context tags: ${entry.contextTags.join(", ")}`)
		lines.push("")
	}
```

8. In [WorkflowFormRegistry.ts:7](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L7), remove `renderSystemDictionaryEntryMarkdown` from the import list.
9. In `buildSchemaBackedField(...)` at [WorkflowFormRegistry.ts:52](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L52):
   - remove `dictionaryEntry?: WorkflowFormFieldDefinition["dictionaryEntry"]` from the helper args
   - remove `dictionaryEntry: args.dictionaryEntry` from the returned field object
10. In `WorkflowStartFormOverride` at [WorkflowFormRegistry.ts:249](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L249), delete `dictionaryKeys?: Record<string, WorkflowFormSystemDictionaryKey>`.
11. In the `create-epics.md` override at [WorkflowFormRegistry.ts:273](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L273), delete the entire `dictionaryKeys` map and keep the `placeholders` map exactly as-is.
12. Delete the entire `buildWorkflowFormFieldDictionaryEntry(...)` helper at [WorkflowFormRegistry.ts:315](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L315).
13. In `buildWorkflowStartPlaceholderFieldDefinitions(...)` at [WorkflowFormRegistry.ts:337](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L337), remove the `dictionaryEntry` assignment entirely. Keep:
   - `label`
   - `help`
   - `required`
   - `oneOfGroupId`
   - `placeholder: args.override?.placeholders?.[key] ?? "/absolute/path/to/file-or-artifact"`
   - `visible: true`
14. In [WorkflowFormRegistry.test.ts:33](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L33), rename the test from:
   - `builds the create-epics workflow-start definition with the approved override copy and dictionary entries`
   to:
   - `builds the create-epics workflow-start definition with the approved override copy`
15. In that same test, delete the two assertions that mention `fields[0]?.dictionaryEntry`.
16. Keep the remaining assertions intact, including:
   - title
   - prompt
   - field order
   - label
   - `fields[2]?.placeholder === "new or continue"`
17. Do not modify the existing blank-optional serialization test that begins at [WorkflowFormRegistry.test.ts:72](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L72).

## Step 2
[x] Restore the original workflow-form UI behavior by removing the unauthorized field-label click path and second dictionary dialog.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`

Exact edits:
1. In [ChatRow.tsx:295](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L295), delete the `activeWorkflowFieldDictionaryEntry` state declaration entirely.
2. In the workflow-form render block at [ChatRow.tsx:610](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L610), delete the entire second `Dialog` that is controlled by `activeWorkflowFieldDictionaryEntry !== null`.
3. In `renderWorkflowFormField(...)` at [ChatRow.tsx:784](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L784), replace the conditional label button block with the original plain-text label rendering:

```tsx
					<div className="mb-1 text-xs font-semibold text-foreground">
						{field.label}
						{field.required && <span className="text-red-500">*</span>}
					</div>
```

4. Do not change:
   - inline `field.help`
   - input controls
   - the existing form-level `Open inputs reference` dialog
5. In [ChatRow.test.tsx:386](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L386), delete the entire test:
   - `it("opens a workflow-start field dictionary entry from the field label", async () => { ... })`
6. Do not modify the existing form-level dictionary test at [ChatRow.test.tsx:377](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L377).

## Step 3
[x] Add a supersession note to the original action plan so future execution follows the existing form-level dictionary pattern only.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/workflow-start-form-action-plan.md`

Exact edits:
1. Immediately below the title line at [workflow-start-form-action-plan.md:12](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/workflow-start-form-action-plan.md#L12), add this exact section:

```md
## Supersession

The field-level dictionary-entry contract and UI prescribed in Steps 2-4 of this plan were authored without explicit user approval and are superseded by [workflow-start-form-remediation-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/workflow-start-form-remediation-action-plan.md).

For `create-epics.md`, preserve the existing workflow-form UX pattern:

- keep the form-level `Open inputs reference` affordance
- keep field labels and inline help as plain text
- do not add field-level clickable dictionary elements in this pass
```

2. In the Scope section at [workflow-start-form-action-plan.md:20](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/workflow-start-form-action-plan.md#L20), replace:
   - `field-level dictionary-entry support needed by this form`
   with:
   - `preserving the existing form-level dictionary reference UX for this form`
3. In Locked decisions at [workflow-start-form-action-plan.md:67](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/workflow-start-form-action-plan.md#L67), delete the four bullets that prescribe field-level dictionary behavior and replace them with these exact bullets:
   - `The existing form-level \`Open inputs reference\` affordance remains the only approved dictionary-access path for this pass.`
   - `This pass must not add a new field-level clickable dictionary affordance.`
4. Do not rewrite the historical Step 2-Step 4 instructions in that document. The supersession note is the canonical correction for future readers.

## Step 4
[x] Run the focused remediation verification and final string-contract audit.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/workflow-start-form-remediation-action-plan.md`

Exact commands:
1. `npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts --exit`
2. `npm --prefix webview-ui test -- src/components/chat/ChatRow.test.tsx`
3. `npx tsc --noEmit`
4. `rg -n "WorkflowFormFieldDictionaryEntry|dictionaryEntry|WORKFLOW_START_SYSTEM_DICTIONARY_KEYS|WORKFLOW_FORM_SYSTEM_DICTIONARY_KEYS|renderSystemDictionaryEntryMarkdown|Read-only reference for this workflow input." src/shared/ExtensionMessage.ts src/core/task/workflow-form webview-ui/src/components/chat`

Completion criteria:
- The first three commands pass.
- The final `rg` command returns no matches in runtime code.
- `create-epics.md` Step 1 remains in its current corrected workflow-start authoring shape.
- The valid `create-epics.md` override copy, placeholder serialization behavior, and form-level `Open inputs reference` UX remain intact.
- If any command fails because of a file or seam not explicitly covered above, stop and report the failure without making additional changes unless the failure is caused by an explicit mistake in this remediation plan.
