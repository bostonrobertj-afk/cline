---
title: Build Epics Document Frontmatter Remediation Action Plan
instructions:
  - Read this plan top to bottom before making any changes.
  - Execute only one step at a time.
  - Before starting a step, read that step in full, including its allowed-files list and exact edit instructions.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
  - Do not edit any file not listed in the current step's allowed-files list.
  - If any ambiguity is discovered, or any additional file or behavior change appears necessary, stop and ask the user before proceeding.
  - This remediation plan exists because the original `build_epics_document` requirements/action-plan lineage treated the legacy `inputDocuments` template field as the Step 2 source-of-truth contract instead of the user-authored `create-epics.md` frontmatter contract.
  - Preserve the valid `build_epics_document` runtime behavior outside this frontmatter seam, including artifact-path resolution, `output_file` persistence, PRD inventory extraction, and the approved decision to leave `### UX Design Requirements` unpopulated in this pass.
---

# Build Epics Document Frontmatter Remediation Action Plan

## Scope

This plan remediates the frontmatter-contract defect in the `build_epics_document` capability.

This plan is intentionally limited to:

- correcting the `build_epics_document` requirements doc so it reflects the authored `create-epics.md` frontmatter contract exactly
- adding a supersession note to the original `build-epics-document-action-plan.md` so future execution does not reintroduce the wrong `inputDocuments` contract
- updating the live epics template, handler, and handler tests so generated `epics.md` files use labeled `Architecture`, `PRD`, and optional `UI/UX` frontmatter entries
- removing `inputDocuments` as the runtime/tested contract for this capability

This plan does **not** change:

- PRD section extraction behavior
- contextual tool exposure
- response-tool registration
- deterministic progression
- workflow-start form behavior
- `/Users/robertboston/Documents/Cline/Workflows/create-epics.md`
- `step-01-validate-prerequisites.md`

## Verified current bad seam

- [create-epics.md:16](/Users/robertboston/Documents/Cline/Workflows/create-epics.md#L16) defines the authored Step 2 frontmatter contract as labeled entries:
  - `Architecture: {architecture_document}`
  - `PRD: {prd}`
  - `UI/UX: {ui_spec}, {ux_spec} (optional)`
- [build-epics-document-requirements.md:164](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-requirements.md#L164) currently describes frontmatter augmentation generically and does not lock the exact labeled YAML shape.
- [build-epics-document-action-plan.md:41](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-action-plan.md#L41), [build-epics-document-action-plan.md:62](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-action-plan.md#L62), and [build-epics-document-action-plan.md:301](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-action-plan.md#L301) explicitly prescribe `inputDocuments`.
- [epics-template.md:1](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md#L1) still carries the legacy `inputDocuments: []` field in the template frontmatter.
- [BuildEpicsDocumentToolHandler.ts:276](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L276) writes `frontmatter.inputDocuments = [...]` at runtime.
- [ManagedWorkflowHandlers.test.ts:2062](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L2062) asserts `inputDocuments:` in the generated artifact and does not lock the labeled `Architecture` / `PRD` / `UI/UX` contract.

## Locked decisions

- For this capability, the authored workflow in [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md) is the source of truth for the Step 2 frontmatter contract.
- `inputDocuments` is not an acceptable substitute for the Step 2 source-document references in generated `epics.md`.
- The generated `epics.md` frontmatter must preserve `stepsCompleted` and use these labeled keys:
  - `Architecture`
  - `PRD`
  - `UI/UX`
- `Architecture` must be set to the resolved `architecture_document` path.
- `PRD` must be set to the resolved `prd` path.
- `UI/UX` must be a YAML sequence that contains only the optional resolved `ui_spec` and `ux_spec` paths that are actually present, in that order.
- If neither optional UI/UX path is present, omit the `UI/UX` key from the generated frontmatter.
- The remediation must not edit `step-01-validate-prerequisites.md`; that legacy BMAD step document remains out of scope for this pass.

## String-contract audit

After remediation, these frontmatter strings must be true for generated `epics.md` artifacts:

- `stepsCompleted: []`
- `Architecture:`
- `PRD:`
- `UI/UX:` only when at least one optional UI/UX path is present

After remediation, these runtime/test seams must be absent for this capability:

- `frontmatter.inputDocuments =`
- generated-artifact assertions that require `inputDocuments:`

## Step 1
[x] Correct the source-of-truth docs so they explicitly preserve `stepsCompleted` and require labeled `Architecture` / `PRD` / optional `UI/UX` frontmatter for `build_epics_document`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/build-epics-document-requirements.md`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/build-epics-document-action-plan.md`

Exact edits:
1. In [build-epics-document-requirements.md:164](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-requirements.md#L164), replace the entire `### 2. Frontmatter augmentation` subsection with this exact content:

````md
### 2. Frontmatter augmentation

The tool must preserve the template's existing `stepsCompleted` field and write the Step 2 source-document references into labeled frontmatter keys that match the authored workflow in [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md):

```yaml
Architecture: /path/to/architecture.md
PRD: /path/to/prd.md
UI/UX:
  - /path/to/ui-spec.md
  - /path/to/ux-spec.md
```

Contract details:

- `Architecture` must be set to the resolved `{architecture_document}` path.
- `PRD` must be set to the resolved `{prd}` path.
- `UI/UX` must be a YAML sequence containing only the resolved optional `ui_spec` and `ux_spec` paths that are actually present, in that order.
- If neither optional UI/UX path is present, omit `UI/UX` from the generated frontmatter.
- `inputDocuments` is a legacy template field and does not satisfy this requirement for `build_epics_document`.
````

2. Do not change any other subsection in [build-epics-document-requirements.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-requirements.md).
3. Immediately below the title line at [build-epics-document-action-plan.md:14](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-action-plan.md#L14), add this exact section:

```md
## Supersession

The `inputDocuments` frontmatter contract prescribed in this plan's Verified Live Contracts, Locked Decisions, Step 2, and Step 4 was authored from legacy template/BMAD references instead of the user-authored [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md) workflow contract and is superseded by [build-epics-document-frontmatter-remediation-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-frontmatter-remediation-action-plan.md).

For `build_epics_document`, the generated `epics.md` frontmatter must:

- preserve `stepsCompleted`
- write labeled `Architecture`, `PRD`, and optional `UI/UX` entries
- not use `inputDocuments` as the Step 2 source-document contract
```

4. Do not rewrite the historical `inputDocuments` instructions inside [build-epics-document-action-plan.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/write-epics/build-epics-document-action-plan.md). The supersession note is the canonical correction for future readers.

## Step 2
[x] Update the live template, runtime handler, and handler tests so `build_epics_document` generates labeled frontmatter and no longer relies on `inputDocuments`.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`

Exact edits:
1. In [epics-template.md:1](/Users/robertboston/Documents/Cline%20Extension/cline/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md#L1), delete the `inputDocuments: []` line from the template frontmatter and keep `stepsCompleted: []`.
2. In the test template fixture at [ManagedWorkflowHandlers.test.ts:311](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L311), delete the `inputDocuments: []` line from the inline template string and keep `stepsCompleted: []`.
3. In [BuildEpicsDocumentToolHandler.ts:276](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts#L276), replace the entire `frontmatter.inputDocuments = [...]` block with this exact logic:

```ts
				delete frontmatter.inputDocuments
				frontmatter.Architecture = architectureDocumentPath
				frontmatter.PRD = prdPath

				const uiUxDocumentPaths = [uiSpecPath, uxSpecPath].filter(
					(candidate): candidate is string => typeof candidate === "string" && candidate.length > 0,
				)
				if (uiUxDocumentPaths.length > 0) {
					frontmatter["UI/UX"] = uiUxDocumentPaths
				} else {
					delete frontmatter["UI/UX"]
				}
```

4. Do not modify the surrounding PRD extraction, section replacement, artifact write, or `output_file` persistence logic in [BuildEpicsDocumentToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts).
5. In the positive `mode=new` test that currently begins near [ManagedWorkflowHandlers.test.ts:2027](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L2027), replace the frontmatter assertions at [ManagedWorkflowHandlers.test.ts:2062](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts#L2062) so they assert:
   - the artifact contains `stepsCompleted: []`
   - the artifact contains `Architecture: ${path.join(repoDir, architectureRelativePath)}`
   - the artifact contains `PRD: ${path.join(repoDir, prdRelativePath)}`
   - the artifact contains `UI/UX:`
   - the artifact contains `- ${path.join(repoDir, uiSpecRelativePath)}`
   - the artifact contains `- ${path.join(repoDir, uxSpecRelativePath)}`
   - the artifact does **not** contain `inputDocuments:`
6. Keep the existing assertions for:
   - parsed payload fields
   - `output_file` placeholder persistence
   - write-proof persistence
   - populated requirements-inventory/body markers
7. Immediately after that positive `mode=new` test, add one new test titled exactly:
   - `omits UI/UX frontmatter when optional workflow inputs are absent for build_epics_document`
8. In that new test:
   - use the existing `createBuildEpicsDocumentRepo()` helper
   - set `config.taskState.activePlaceholderWorkflowId = "create-epics.md"`
   - set `config.taskState.activePlaceholderWorkflowValues` to exactly:

```ts
{
	mode: "new",
	architecture_document: architectureRelativePath,
	prd: prdRelativePath,
}
```

   - execute the handler with `params: {}`
   - read the written artifact and assert:
     - it contains `stepsCompleted: []`
     - it contains `Architecture: ${path.join(repoDir, architectureRelativePath)}`
     - it contains `PRD: ${path.join(repoDir, prdRelativePath)}`
     - it does **not** contain `UI/UX:`
     - it does **not** contain `inputDocuments:`
9. Do not change the existing `mode=continue` test or any failure-message assertions in [ManagedWorkflowHandlers.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts).

## Step 3
[x] Run the focused remediation verification and final frontmatter string-contract audit.

Allowed files:
- `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/write-epics/build-epics-document-frontmatter-remediation-action-plan.md`

Exact commands:
1. `npm run test:unit -- src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts --exit`
2. `npx tsc --noEmit`
3. `rg -n "inputDocuments|Architecture:|PRD:|UI/UX:" .cline/skills/bmad-create-epics-and-stories/templates/epics-template.md src/core/task/tools/handlers/BuildEpicsDocumentToolHandler.ts src/core/task/tools/handlers/__tests__/ManagedWorkflowHandlers.test.ts`
4. `rg -n "Architecture:|PRD:|UI/UX:|inputDocuments" docs/workflow-automation/write-epics/build-epics-document-requirements.md`

Completion criteria:
- The first two commands pass.
- The first `rg` command shows:
  - no `inputDocuments` matches in the template, handler, or handler tests
  - labeled `Architecture:` and `PRD:` matches in the handler tests
  - `UI/UX:` matches in the handler runtime and handler tests only where the optional-list contract is being defined or asserted
- The second `rg` command shows:
  - labeled `Architecture:`, `PRD:`, and `UI/UX:` matches in the requirements doc
  - the only `inputDocuments` mention in the requirements doc is the explicit statement that it does not satisfy this capability's frontmatter requirement
- The generated-artifact contract for this capability is now anchored to the authored [create-epics.md](/Users/robertboston/Documents/Cline/Workflows/create-epics.md) workflow, not the legacy `inputDocuments` pattern.
- If any command fails because of a file or seam not explicitly covered above, stop and report the failure without making additional changes unless the failure is caused by an explicit mistake in this remediation plan.
