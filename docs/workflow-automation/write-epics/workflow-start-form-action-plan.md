---
instructions:
  - Read this plan top to bottom before making any changes.
  - Execute only one step at a time.
  - Before starting a step, read that step in full, including its allowed-files list and exact edit instructions.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not edit any file not listed in the current step's allowed-files list.
  - If any ambiguity is discovered, or any additional file or behavior change appears necessary, stop and ask the user before proceeding.
  - Preserve all exact strings, workflow filenames, placeholder keys, dictionary keys, dialog titles, and fallback messages prescribed here.
---

# create-epics workflow-start form action plan

## Supersession

The field-level dictionary-entry contract and UI prescribed in Steps 2-4 of this plan were authored without explicit user approval and are superseded by [workflow-start-form-remediation-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/workflow-start-form-remediation-action-plan.md).

For `create-epics.md`, preserve the existing workflow-form UX pattern:

- keep the form-level `Open inputs reference` affordance
- keep field labels and inline help as plain text
- do not add field-level clickable dictionary elements in this pass

## Scope

This plan implements the workflow-start form buildout for [`create-epics.md`](/Users/robertboston/Documents/Cline/Workflows/create-epics.md) using the existing slash-command placeholder-workflow path and the existing `placeholder_workflow_start_set_workflow_placeholders` resolver.

This plan is intentionally limited to:

- Step 1 workflow authoring for the start-form parser
- workflow-start override wiring for `create-epics.md`
- preserving the existing form-level dictionary reference UX for this form
- focused trigger, registry, persistence, and webview regressions

This plan does **not** implement:

- deterministic progression for `create-epics.md`
- Step 2 `build_epics_document`
- any changes to tool handlers outside the existing `set_workflow_placeholders` path

## Verified live contracts

- Canonical workflow source:
  - [`create-epics.md:4`](/Users/robertboston/Documents/Cline/Workflows/create-epics.md#L4) defines the current Step 1 block.
  - [`create-epics.md:5`](/Users/robertboston/Documents/Cline/Workflows/create-epics.md#L5) still uses backticked bare keys and the stale `PRD` spelling.
  - [`create-epics.md:16`](/Users/robertboston/Documents/Cline/Workflows/create-epics.md#L16) and [`create-epics.md:18`](/Users/robertboston/Documents/Cline/Workflows/create-epics.md#L18) already use the canonical `{prd}` placeholder downstream.
- Workflow-start trigger/runtime:
  - [`workflowStartRequirements.ts:18`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/workflowStartRequirements.ts#L18) parses only literal `Required:`, `Optional:`, and `One of:` directive lines containing `{placeholder}` tokens.
  - [`WorkflowFormRegistry.ts:604`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L604) already builds workflow-start forms through `placeholder_workflow_start_set_workflow_placeholders`.
  - [`WorkflowFormRegistry.ts:278`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L278) currently builds workflow-start fields from override labels/help and a shared schema-backed string field contract.
- Shared workflow-form payload shape:
  - [`ExtensionMessage.ts:405`](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L405) currently allows only plain `label`, `help`, `control`, `valueSchema`, `required`, `oneOfGroupId`, `placeholder`, `options`, and `visible` on workflow-form fields.
- Dictionary runtime:
  - [`systemDictionary.ts:9`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L9) currently ships only Phase 1 diff-related dictionary keys.
  - [`ChatRow.tsx:582`](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L582) already supports the existing form-level `Open inputs reference` dialog for the active tool.
  - [`ChatRow.tsx:767`](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L767) renders field labels and help as plain text today; there is no field-level dictionary-entry affordance yet.
- Existing regression seams:
  - [`WorkflowFormTriggerRegistry.test.ts:13`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L13) already covers slash-command workflow-start candidate discovery.
  - [`WorkflowFormRegistry.test.ts:11`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L11) already covers workflow-start resolver metadata and serialization.
  - [`placeholderWorkflowPersistence.test.ts:2382`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2382) already covers the "do not reopen Step 1 after successful placeholder storage" path.
  - [`ChatRow.test.tsx:352`](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L352) already covers workflow-start rendering, and [`ChatRow.test.tsx:377`](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L377) already covers the form-level dictionary dialog.

## Locked decisions

- The workflow filename remains `create-epics.md`.
- The workflow-start resolver remains `placeholder_workflow_start_set_workflow_placeholders`.
- The Step 1 placeholder keys are exactly:
  - `architecture_document`
  - `prd`
  - `mode`
  - `ux_spec`
  - `ui_spec`
- The workflow-specific start-form title is exactly:
  - `Inputs for This Workflow`
- The workflow-specific start-form prompt is exactly:
  - `Provide the following to start the workflow:`
- The existing form-level `Open inputs reference` affordance remains the only approved dictionary-access path for this pass.
- This pass must not add a new field-level clickable dictionary affordance.
- `mode` remains a text field. This plan must not introduce a workflow-specific dropdown.

## String-contract audit

Use these exact strings everywhere in this plan:

- workflow filename: `create-epics.md`
- resolver id: `placeholder_workflow_start_set_workflow_placeholders`
- tool name: `set_workflow_placeholders`
- title: `Inputs for This Workflow`
- prompt: `Provide the following to start the workflow:`
- field labels:
  - `Architecture Document`
  - `PRD`
  - `Mode`
  - `UX Spec`
  - `UI Spec`
- field help:
  - `Provide the path to the architecture document.`
  - `Provide the path to the PRD.`
  - `Enter \`new\` to create a new epics document or \`continue\` to resume an existing one.`
  - `Optional path to a UX specification document.`
  - `Optional path to a UI specification document.`
- placeholder text:
  - `/absolute/path/to/architecture.md`
  - `/absolute/path/to/prd.md`
  - `new or continue`
  - `/absolute/path/to/ux-spec.md`
  - `/absolute/path/to/ui-spec.md`

[x] Step 1: Reauthor `create-epics.md` Step 1 so the live workflow-start parser can discover the form and the fallback instructions stay usable.
Allowed files:
- `/Users/robertboston/Documents/Cline/Workflows/create-epics.md`

In [`create-epics.md:4`](/Users/robertboston/Documents/Cline/Workflows/create-epics.md#L4), replace the entire current Step 1 block through the `Done Signal` line with this exact text:

```md
## Step 1: (System-Owned) Confirm the input set
Required: {architecture_document}, {prd}, {mode}
Optional: {ux_spec}, {ui_spec}

Use `set_workflow_placeholders` to persist the collected Step 1 inputs for this workflow before continuing.

Done Signal: `{architecture_document}`, `{prd}`, and `{mode}` are present and non-empty in workflow placeholder state for the active task/workflow session.
```

Do not change Step 2 or later workflow text in this step.

[x] Step 2: Extend the shared workflow-form field contract and system dictionary so workflow-start fields can carry clickable per-field dictionary entries for `create-epics.md`.
Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/ExtensionMessage.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts`

In [`ExtensionMessage.ts:405`](/Users/robertboston/Documents/Cline%20Extension/cline/src/shared/ExtensionMessage.ts#L405), add this new shared interface immediately above `WorkflowFormFieldDefinition`:

```ts
export interface WorkflowFormFieldDictionaryEntry {
	title: string
	markdown: string
}
```

Then extend `WorkflowFormFieldDefinition` with one new optional property directly above `visible?: boolean`:

```ts
dictionaryEntry?: WorkflowFormFieldDictionaryEntry
```

In [`systemDictionary.ts:9`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L9), keep `PHASE_1_SYSTEM_DICTIONARY_KEYS` exactly as-is. Immediately after it, add:

```ts
export const WORKFLOW_START_SYSTEM_DICTIONARY_KEYS = [
	"architecture_document",
	"prd",
	"mode",
	"ux_spec",
	"ui_spec",
] as const

export const WORKFLOW_FORM_SYSTEM_DICTIONARY_KEYS = [
	...PHASE_1_SYSTEM_DICTIONARY_KEYS,
	...WORKFLOW_START_SYSTEM_DICTIONARY_KEYS,
] as const
```

Replace the existing `WorkflowFormSystemDictionaryKey` type alias at [`systemDictionary.ts:31`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L31) so it reads:

```ts
export type WorkflowFormSystemDictionaryKey = (typeof WORKFLOW_FORM_SYSTEM_DICTIONARY_KEYS)[number]
```

Extend `workflowFormSystemDictionary` with these exact additional entries after the existing `artifact` entry:

```ts
	architecture_document: {
		label: "Architecture Document",
		medium: "Path to the architecture document that defines the system structure, technical constraints, and implementation boundaries for the project.",
		long: "Use the architecture document input to point the workflow at the canonical architecture source it should treat as the technical constraint document while drafting epics.",
		examples: ["docs/architecture.md", "/absolute/path/to/architecture.md"],
		contextTags: ["workflow_start", "document_path"],
	},
	prd: {
		label: "PRD",
		medium: "Path to the product requirements document that defines the approved requirements for the project.",
		long: "Use the PRD input to point the workflow at the canonical product requirements source that Step 2 and Step 3 must use when building and refining the epics document.",
		examples: ["docs/prd.md", "/absolute/path/to/prd.md"],
		contextTags: ["workflow_start", "document_path"],
	},
	mode: {
		label: "Mode",
		medium: "Controls whether the workflow should create a new epics document or continue from an existing one.",
		long: "Use `new` to scaffold a fresh epics document and use `continue` to resume working from an existing epics document.",
		examples: ["new", "continue"],
		contextTags: ["workflow_start", "workflow_control"],
	},
	ux_spec: {
		label: "UX Spec",
		medium: "Optional path to a UX specification document that defines experience requirements, journeys, or interaction expectations.",
		long: "Provide the UX spec only when the project already has a supporting UX document that should inform epic scope and story framing.",
		examples: ["docs/ux-spec.md", "/absolute/path/to/ux-spec.md"],
		contextTags: ["workflow_start", "document_path", "optional_input"],
	},
	ui_spec: {
		label: "UI Spec",
		medium: "Optional path to a UI specification document that defines screens, layouts, or interface requirements.",
		long: "Provide the UI spec only when the project already has a supporting UI document that should inform epic scope and story framing.",
		examples: ["docs/ui-spec.md", "/absolute/path/to/ui-spec.md"],
		contextTags: ["workflow_start", "document_path", "optional_input"],
	},
```

Immediately above `renderSystemDictionaryMarkdown()` at [`systemDictionary.ts:169`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/dictionaries/systemDictionary.ts#L169), add this new exported helper:

```ts
export function renderSystemDictionaryEntryMarkdown(key: WorkflowFormSystemDictionaryKey): string {
	const entry = workflowFormSystemDictionary[key]
	const lines = [
		`## ${key}`,
		"",
		`- Label: ${entry.label}`,
		`- Medium: ${entry.medium}`,
		`- Long: ${entry.long}`,
		`- Examples: ${entry.examples.join(" | ")}`,
		`- Context tags: ${entry.contextTags.join(", ")}`,
	]

	return `${lines.join("\n").trimEnd()}\n`
}
```

In `renderSystemDictionaryMarkdown()`, replace the inline per-entry line-building block with a call to `renderSystemDictionaryEntryMarkdown(key).trimEnd()` so the single-entry renderer is the only source of truth for entry markdown formatting.

[x] Step 3: Add the `create-epics.md` workflow-start override and bind each field to its system-dictionary entry without changing the shared trigger path.
Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts`

In [`WorkflowFormRegistry.ts:5`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L5), extend the import from `systemDictionary.ts` to include `renderSystemDictionaryEntryMarkdown`.

In [`WorkflowFormRegistry.ts:246`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L246), extend `WorkflowStartFormOverride` with two new optional maps:

```ts
	placeholders?: Record<string, string>
	dictionaryKeys?: Record<string, WorkflowFormSystemDictionaryKey>
```

Immediately above `buildWorkflowStartPlaceholderFieldDefinitions(...)` at [`WorkflowFormRegistry.ts:278`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L278), add this helper:

```ts
function buildWorkflowFormFieldDictionaryEntry(key: WorkflowFormSystemDictionaryKey) {
	return {
		title: workflowFormSystemDictionary[key].label,
		markdown: renderSystemDictionaryEntryMarkdown(key),
	}
}
```

In `workflowStartFormOverrides` at [`WorkflowFormRegistry.ts:253`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L253), add a new `create-epics.md` entry immediately after the existing `review-adversarial-general.md` entry with this exact content:

```ts
	"create-epics.md": {
		title: "Inputs for This Workflow",
		prompt: "Provide the following to start the workflow:",
		labels: {
			architecture_document: "Architecture Document",
			prd: "PRD",
			mode: "Mode",
			ux_spec: "UX Spec",
			ui_spec: "UI Spec",
		},
		help: {
			architecture_document: "Provide the path to the architecture document.",
			prd: "Provide the path to the PRD.",
			mode: "Enter `new` to create a new epics document or `continue` to resume an existing one.",
			ux_spec: "Optional path to a UX specification document.",
			ui_spec: "Optional path to a UI specification document.",
		},
		placeholders: {
			architecture_document: "/absolute/path/to/architecture.md",
			prd: "/absolute/path/to/prd.md",
			mode: "new or continue",
			ux_spec: "/absolute/path/to/ux-spec.md",
			ui_spec: "/absolute/path/to/ui-spec.md",
		},
		dictionaryKeys: {
			architecture_document: "architecture_document",
			prd: "prd",
			mode: "mode",
			ux_spec: "ux_spec",
			ui_spec: "ui_spec",
		},
	},
```

In `buildWorkflowStartPlaceholderFieldDefinitions(...)` at [`WorkflowFormRegistry.ts:293`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/WorkflowFormRegistry.ts#L293), keep the existing schema binding and required/one-of behavior intact, but replace the hard-coded placeholder assignment and add dictionary-entry wiring so each field is built with:

- `placeholder: args.override?.placeholders?.[key] ?? "/absolute/path/to/file-or-artifact"`
- `dictionaryEntry: args.override?.dictionaryKeys?.[key] ? buildWorkflowFormFieldDictionaryEntry(args.override.dictionaryKeys[key]) : undefined`

Do not add any per-workflow trigger entry for Step 1 in this step.

In [`WorkflowFormRegistry.test.ts:11`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts#L11), add these two tests immediately after the existing resolver metadata tests:

- `it("builds the create-epics workflow-start definition with the approved override copy and dictionary entries", () => { ... })`
  - build the resolver definition through `getWorkflowFormResolverDefinition(PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID)`
  - use a session with:
    - `resolverId: "placeholder_workflow_start_set_workflow_placeholders"`
    - `triggerSource: "slash_command"`
    - `owner.workflowName: "create-epics.md"`
    - `owner.stepNumber: 1`
    - `context.workflowName: "create-epics.md"`
    - `context.workflowStartRequirements.requiredFieldKeys = ["architecture_document", "prd", "mode"]`
    - `context.workflowStartRequirements.optionalFieldKeys = ["ux_spec", "ui_spec"]`
  - assert:
    - `definition.title === "Inputs for This Workflow"`
    - `definition.pages.collect_inputs?.prompt === "Provide the following to start the workflow:"`
    - the collect-input field keys are exactly `["architecture_document", "prd", "mode", "ux_spec", "ui_spec"]`
    - `fields[0]?.label === "Architecture Document"`
    - `fields[0]?.dictionaryEntry?.title === "Architecture Document"`
    - `fields[0]?.dictionaryEntry?.markdown` includes `## architecture_document`
    - `fields[2]?.placeholder === "new or continue"`
- `it("omits blank optional create-epics values when serializing set_workflow_placeholders", () => { ... })`
  - use the same session shape
  - call `buildToolExecutionRequest(...)` with:
    - `architecture_document.rawValue = "/abs/architecture.md"`
    - `prd.rawValue = "/abs/prd.md"`
    - `mode.rawValue = "new"`
    - `ux_spec.rawValue = ""`
    - `ui_spec.rawValue = ""`
  - assert:
    - `outcome.toolName === "set_workflow_placeholders"`
    - `outcome.toolInput` deeply equals:

```ts
{
	values: {
		architecture_document: "/abs/architecture.md",
		prd: "/abs/prd.md",
		mode: "new",
	},
}
```

    - `outcome.toolParams` deeply equals:

```ts
{
	values: JSON.stringify({
		architecture_document: "/abs/architecture.md",
		prd: "/abs/prd.md",
		mode: "new",
	}),
}
```

[x] Step 4: Render field-level dictionary-entry dialogs in the workflow-form UI by making the field label itself the clickable affordance.
Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx`

In [`ChatRow.tsx:580`](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L580), keep the existing form-level `Open inputs reference` dialog unchanged.

Add one new local state value near the existing workflow-dictionary dialog state in the same component:

```ts
const [activeWorkflowFieldDictionaryEntry, setActiveWorkflowFieldDictionaryEntry] =
	useState<WorkflowFormFieldDefinition["dictionaryEntry"] | null>(null)
```

In `renderWorkflowFormField(...)` at [`ChatRow.tsx:767`](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L767), replace the plain label rendering block with this exact behavior:

- when `field.dictionaryEntry` is absent, keep the current plain-text label rendering
- when `field.dictionaryEntry` is present, render `field.label` inside a `button` with:
  - `type="button"`
  - the same text position currently occupied by the label
  - `className="text-left underline underline-offset-2 text-link disabled:opacity-50"`
  - `disabled={workflowFormSubmissionPending}`
  - `onClick={() => setActiveWorkflowFieldDictionaryEntry(field.dictionaryEntry)}`
- keep the required asterisk immediately after the label text in both cases
- keep `field.help` as plain text below the label

Immediately after the existing form-level dictionary `Dialog` block at [`ChatRow.tsx:591`](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.tsx#L591), add a second `Dialog` controlled by `activeWorkflowFieldDictionaryEntry !== null` with:

- `onOpenChange={(open) => { if (!open) { setActiveWorkflowFieldDictionaryEntry(null) } }}`
- `DialogTitle` bound to `activeWorkflowFieldDictionaryEntry?.title`
- `DialogDescription` exactly equal to:
  - `Read-only reference for this workflow input.`
- body markdown rendered with:
  - `<MarkdownRow markdown={activeWorkflowFieldDictionaryEntry?.markdown ?? ""} />`

Do not move field help text into the dialog. The dialog is supplemental reference, not a replacement for the inline help copy.

In [`ChatRow.test.tsx:377`](/Users/robertboston/Documents/Cline%20Extension/cline/webview-ui/src/components/chat/ChatRow.test.tsx#L377), keep the existing form-level dictionary tests intact. Add this new test immediately after `opens the workflow dictionary in a read-only dialog`:

- `it("opens a workflow-start field dictionary entry from the field label", async () => { ... })`
  - render a `collect_inputs` workflow-form row whose only field is:

```ts
{
	key: "architecture_document",
	label: "Architecture Document",
	help: "Provide the path to the architecture document.",
	control: "text",
	valueSchema: { type: "string" },
	required: true,
	placeholder: "/absolute/path/to/architecture.md",
	visible: true,
	dictionaryEntry: {
		title: "Architecture Document",
		markdown: "## architecture_document\n\n- Label: Architecture Document",
	},
}
```

  - click the button with role `button` and name `Architecture Document`
  - assert the dialog title `Architecture Document` appears
  - assert the dialog body includes `architecture_document`

[x] Step 5: Add focused start-form trigger and persistence regressions for `create-epics.md`, then run the exact verification commands and final string-contract audit.
Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`

In [`WorkflowFormTriggerRegistry.test.ts:13`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts#L13), add these two tests immediately after the existing `review-adversarial-general` slash-command candidate test:

- `it("returns a slash-command start candidate for create-epics step 1 when the workflow uses canonical directive placeholders", async () => { ... })`
  - use `activePlaceholderWorkflowSource.name = "create-epics.md"`
  - use `currentTurnSlashCommandAction.workflowId = "create-epics"`
  - use this exact workflow `contents`:

```md
# Create Epics

## Step 1: (System-Owned) Confirm the input set
Required: {architecture_document}, {prd}, {mode}
Optional: {ux_spec}, {ui_spec}

Use `set_workflow_placeholders` to persist the collected Step 1 inputs for this workflow before continuing.

Done Signal: `{architecture_document}`, `{prd}`, and `{mode}` are present and non-empty in workflow placeholder state for the active task/workflow session.

## Step 2: (System-Owned) Build the requirements inventory
Build the epics scaffold.
```

  - assert:
    - `candidate?.resolverId === "placeholder_workflow_start_set_workflow_placeholders"`
    - `candidate?.initialPhase === "collect_inputs"`
    - `candidate?.context` deeply equals:

```ts
{
	workflowName: "create-epics.md",
	workflowStartRequirements: {
		requiredFieldKeys: ["architecture_document", "prd", "mode"],
		optionalFieldKeys: ["ux_spec", "ui_spec"],
	},
}
```

- `it("returns undefined for create-epics step 1 when the workflow regresses to backticked bare keys", async () => { ... })`
  - use the same fixture shape, but use this exact Step 1 block:

```md
## Step 1: (System-Owned) Confirm the input set
Required: `architecture_document`, `PRD`, `mode`
Optional: `ux_spec`, `ui_spec`
```

  - assert `candidate === undefined`

In [`placeholderWorkflowPersistence.test.ts:2382`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2382), add this new test immediately after `does not reopen the workflow-start form when workflow-start success leaves Step 1 active`:

- `it("opens the create-epics workflow-start form on slash-command activation and stores only the supplied placeholders", async () => { ... })`

Build the fixture by adapting the existing no-reopen workflow-start test with these exact workflow-specific changes:

- use a workflow-start session with:
  - `workflowName: "create-epics.md"`
  - `stepNumber: 1`
  - `values` equal to:

```ts
{
	architecture_document: { rawValue: "docs/architecture.md" },
	prd: { rawValue: "docs/prd.md" },
	mode: { rawValue: "new" },
}
```

  - `context.workflowStartRequirements.requiredFieldKeys = ["architecture_document", "prd", "mode"]`
  - `context.workflowStartRequirements.optionalFieldKeys = ["ux_spec", "ui_spec"]`
- set `taskState.activePlaceholderWorkflowId = "create-epics.md"`
- set `taskState.activePlaceholderWorkflowSource.name = "create-epics.md"`
- set `taskState.activePlaceholderWorkflowSource.contents` to:

```md
# Create Epics

## Step 1: (System-Owned) Confirm the input set
Required: {architecture_document}, {prd}, {mode}
Optional: {ux_spec}, {ui_spec}

Use `set_workflow_placeholders` to persist the collected Step 1 inputs for this workflow before continuing.

Done Signal: `{architecture_document}`, `{prd}`, and `{mode}` are present and non-empty in workflow placeholder state for the active task/workflow session.

## Step 2: (System-Owned) Build the requirements inventory
Build the epics scaffold.

## Step 3: Define the Epics
Draft the epics.
```

- set the initial checklist to:
  - `- [ ] Step 1: Confirm the input set`
  - `- [ ] Step 2: Build the requirements inventory`
  - `- [ ] Step 3: Define the Epics`
- in `renderWorkflowFormMessage(...)`, set `pendingWorkflowFormOutcome` on the first render only, with:

```ts
{
	kind: "invoke_tool",
	session: workflowStartSession,
	toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
	toolInput: {
		values: {
			architecture_document: "docs/architecture.md",
			prd: "docs/prd.md",
			mode: "new",
		},
	},
	toolParams: {
		values: JSON.stringify({
			architecture_document: "docs/architecture.md",
			prd: "docs/prd.md",
			mode: "new",
		}),
	},
}
```

- in `executeWorkflowFormToolAndSync(...)`, assert the incoming outcome matches the exact `toolInput` and `toolParams` above, then set:

```ts
taskState.activePlaceholderWorkflowValues = {
	architecture_document: "docs/architecture.md",
	prd: "docs/prd.md",
	mode: "new",
}
```

- keep the checklist unchanged after success so this regression continues to prove the workflow-start form does not reopen when Step 1 remains active

Add these exact assertions at the end of the test:

- `expect(fakeTask.workflowFormRuntime.createSession.callCount).to.equal(1)`
- `expect(fakeTask.workflowFormRuntime.createSession.firstCall.args[0]?.resolverId).to.equal("placeholder_workflow_start_set_workflow_placeholders")`
- `expect(fakeTask.executeWorkflowFormToolAndSync.calledOnce).to.equal(true)`
- `expect(taskState.activePlaceholderWorkflowValues).to.deep.equal({ architecture_document: "docs/architecture.md", prd: "docs/prd.md", mode: "new" })`
- `expect(taskState.activePlaceholderWorkflowValues?.ux_spec).to.equal(undefined)`
- `expect(taskState.activePlaceholderWorkflowValues?.ui_spec).to.equal(undefined)`
- `expect(taskState.activeWorkflowFormSession).to.equal(undefined)`
- `expect(fakeTask.renderWorkflowFormMessage.secondCall.args[1]).to.equal("say")`

After the tests are in place, run these exact verification commands from `/Users/robertboston/Documents/Cline Extension/cline`:

```bash
npm run test:unit -- src/core/task/workflow-form/__tests__/WorkflowFormTriggerRegistry.test.ts src/core/task/workflow-form/__tests__/WorkflowFormRegistry.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts
npm --prefix webview-ui test -- src/components/chat/ChatRow.test.tsx
```

Then run this exact final string-contract audit command:

```bash
rg -n "create-epics.md|architecture_document|prd|mode|ux_spec|ui_spec|Inputs for This Workflow|Provide the following to start the workflow:" /Users/robertboston/Documents/Cline/Workflows/create-epics.md src/shared/ExtensionMessage.ts src/core/task/workflow-form webview-ui/src/components/chat
```

If any command fails for a reason not already prescribed in this plan, stop and ask the user before making additional changes.
