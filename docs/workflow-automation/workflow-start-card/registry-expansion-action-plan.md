---
instructions:
  - Read this plan from top to bottom before making any changes.
  - Read each step in full immediately before executing it.
  - Execute only one step at a time.
  - After completing a step, update that step's checkbox from "[ ]" to "[x]".
  - Do not make changes outside the allowed files listed for the current step.
  - If any ambiguity is discovered, or if any change is needed outside the allowed files for the current step, stop and ask the user before proceeding.
  - Do not infer additional cleanup beyond what is explicitly prescribed here.
---

# Workflow Start Card Registry Expansion Action Plan

## Scope Lock

This plan fixes the current under-seeded workflow-start-card registry so the capability is enabled for every workflow documented in [workflow-start-messages.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md).

Live seam audit completed before authoring this plan:

- [WorkflowStartCardRegistry.ts:3](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts#L3) currently contains only one registry entry: `"quick-spec.md"`.
- [workflow-start-messages.md:1](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md#L1) through [workflow-start-messages.md:128](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md#L128) contain 43 approved workflow/message pairs.
- The live workflow folder `/Users/robertboston/Documents/Cline/Workflows` also contains exactly 43 `.md` workflow files, and the reference file currently has no missing or extra workflow entries relative to that directory.
- [requirements.md:17](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/requirements.md#L17) and [requirements.md:284](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/requirements.md#L284) still describe `quick-spec.md` as the first/only delivery target, which now conflicts with the approved intent for registry-wide enablement.
- [README.md:11](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/README.md#L11) still says `quick-spec.md` is the first delivered workflow.
- [WorkflowStartCardRegistry.test.ts:7](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts#L7) only asserts the `quick-spec.md` entry.
- [placeholderWorkflowPersistence.test.ts:2095](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2095) still treats `brainstorming.md` as a missing-entry fallback case, but [workflow-start-messages.md:7](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md#L7) now defines an approved message for `brainstorming`.

This fix plan must preserve the existing workflow-start-card runtime mechanism:

- `workflow_start_card`
- `ClineWorkflowStartCard`
- `submitWorkflowStartCard`
- `WorkflowStartCardSubmissionRequest`
- `WorkflowStartCardAction`
- `CONTINUE`
- `activeWorkflowStartCardSession`
- fixed CTA `Get Started`
- code-owned runtime registry
- docs/reference file remains non-runtime

This plan must not:

- introduce runtime parsing of `workflow-start-messages.md`
- change workflow-start-card transport, UI, or persistence behavior
- change workflow-start-card heading generation
- alter workflow-start-card activation gating
- edit the previously saved `action-plan.md`

## Action Plan

- [x] Step 1: Align the workflow-start-card requirements and README with full registry seeding from the approved reference file
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-start-card/requirements.md`
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-start-card/README.md`
  - In [requirements.md:17](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/requirements.md#L17), replace the entire four-line block:
    ```md
    The first workflow to use it will be:

    - `quick-spec.md`
    ```
    with this exact text:
    ```md
    The runtime registry must be seeded for every placeholder workflow that has an approved entry in `workflow-start-messages.md`.
    ```
  - In [requirements.md:284](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/requirements.md#L284), replace the entire `### 3. First delivery target` subsection through line 290 with this exact text:
    ```md
    ### 3. Registry Coverage Target

    This slice must seed the runtime registry with every approved workflow/message pair documented in:

    - [workflow-start-messages.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md)

    Missing registry entries for workflows documented there are requirements failures for this capability.
    ```
  - In [README.md:11](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/README.md#L11), replace:
    ```md
    `quick-spec.md` is the first delivered workflow for this capability.
    ```
    with:
    ```md
    The runtime registry is seeded for every workflow documented in `workflow-start-messages.md`.
    ```
  - Do not change the fixed CTA wording, the heading-generation contract, or the “docs are reference-only” statement in this step.

- [x] Step 2: Expand the runtime registry to include every approved workflow/message pair from the reference file
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts`
  - In [WorkflowStartCardRegistry.ts:3](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts#L3), replace the entire `workflowStartCardRegistry` object with a fully populated object containing one entry for each workflow heading in [workflow-start-messages.md:1](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md#L1) through [workflow-start-messages.md:128](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md#L128).
  - Use the exact `.md` workflow filename as each registry key by appending `.md` to the heading text from the reference file. The populated object must contain these exact keys and no others, in this exact order:
    - `"advanced-elicitation.md"`
    - `"blind-review.md"`
    - `"brainstorming.md"`
    - `"check-implementation-readiness.md"`
    - `"cis-design-thinking.md"`
    - `"cis-innovation-strategy.md"`
    - `"cis-problem-solving.md"`
    - `"cis-storytelling.md"`
    - `"code-review.md"`
    - `"correct-course.md"`
    - `"create-architecture.md"`
    - `"create-epics.md"`
    - `"create-prd.md"`
    - `"create-product-brief.md"`
    - `"create-story.md"`
    - `"create-ux-design.md"`
    - `"dev-story.md"`
    - `"distillator.md"`
    - `"document-project.md"`
    - `"domain-research.md"`
    - `"edit-prd.md"`
    - `"editorial-review-prose.md"`
    - `"editorial-review-structure.md"`
    - `"generate-project-context.md"`
    - `"help.md"`
    - `"index-docs.md"`
    - `"market-research.md"`
    - `"party-mode.md"`
    - `"pi-planning.md"`
    - `"qa-generate-e2e-tests.md"`
    - `"quick-dev.md"`
    - `"quick-dev-new-preview.md"`
    - `"quick-spec.md"`
    - `"retrospective.md"`
    - `"review-adversarial-general.md"`
    - `"review-edge-case-hunter.md"`
    - `"shard-doc.md"`
    - `"sprint-planning.md"`
    - `"sprint-status.md"`
    - `"teach-me-testing.md"`
    - `"technical-research.md"`
    - `"validate-prd.md"`
    - `"write-remediation-story.md"`
  - For each registry entry:
    - set `workflowName` to the exact same `.md` filename as the key
    - set `markdownBody` to the exact `Message:` string from the matching entry in `workflow-start-messages.md`, without adding or removing punctuation, spacing, or markdown
  - Preserve the existing `Record<string, WorkflowStartCardRegistryEntry>` type and the existing `getWorkflowStartCardRegistryEntry(workflowName: string)` helper exactly as-is.
  - Do not introduce runtime file I/O, parser helpers, dynamic imports, or codegen in this step. This remains a code-owned registry seeded by manually copied approved strings.

- [x] Step 3: Replace the quick-spec-only regression coverage with full reference-file alignment coverage and a non-quick-spec runtime proof
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts`
    - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
  - In [WorkflowStartCardRegistry.test.ts:1](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts#L1), add the exact new imports needed for file-backed alignment coverage:
    - `fs` from `"fs"`
    - `path` from `"path"`
  - Immediately before the `describe(...)` block in [WorkflowStartCardRegistry.test.ts:6](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts#L6), add a helper named exactly `parseWorkflowStartMessagesReference()` with this exact behavior:
    - compute `repoRoot` as `path.resolve(__dirname, "../../../../../")`
    - compute `referencePath` as `path.join(repoRoot, "docs/workflow-automation/workflow-start-card/workflow-start-messages.md")`
    - read the file synchronously through `fs.readFileSync(referencePath, "utf8")`
    - parse each workflow block as:
      - a heading line ending with `:`
      - followed by a `Message: ` line
    - return an array of objects with shape:
      - `workflowName: "<heading>.md"`
      - `markdownBody: "<message text after 'Message: '>"`
    - throw an error if any heading is missing a following `Message: ` line
  - Replace the current first test at [WorkflowStartCardRegistry.test.ts:7](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts#L7) with a new test titled exactly:
    ```ts
    it("returns a registry entry for every approved workflow-start message with exact body alignment", () => {
    ```
    and implement it with this exact behavior:
    - call `const entries = parseWorkflowStartMessagesReference()`
    - assert `entries.length === 43`
    - iterate every parsed entry and assert:
      ```ts
      expect(getWorkflowStartCardRegistryEntry(entry.workflowName)).to.deep.equal(entry)
      ```
  - Keep the existing title-generation test at [WorkflowStartCardRegistry.test.ts:16](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts#L16), but add one new assertion after `quickSpecPayload.ctaLabel`:
    ```ts
    expect(getWorkflowStartCardRegistryEntry("nonexistent-workflow.md")).to.equal(undefined)
    ```
  - In [placeholderWorkflowPersistence.test.ts:2054](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2054), keep the existing `quick-spec.md` startup-card test unchanged.
  - Replace the missing-entry fallback test at [placeholderWorkflowPersistence.test.ts:2095](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2095) so it no longer uses `brainstorming.md`. Update it to:
    - keep the same test title concept
    - set `taskState.activePlaceholderWorkflowSource.name = "unconfigured-workflow.md"`
    - set `contents = "# Unconfigured Workflow\n"`
    - keep the existing assertions that no session is created and nothing renders
  - Immediately after the `quick-spec.md` startup-card test at [placeholderWorkflowPersistence.test.ts:2054](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/__tests__/placeholderWorkflowPersistence.test.ts#L2054), add a new test titled exactly:
    ```ts
    it("opens the create-story workflow-start card when that workflow is activated through the same pre-turn path", async () => {
    ```
    and implement it as the exact sibling of the `quick-spec.md` test, with these substitutions only:
    - `taskState.activePlaceholderWorkflowSource.name = "create-story.md"`
    - `contents = "# Create Story\n"`
    - expected `workflowName` is `"create-story.md"`
    - expected `markdownBody` is the exact `create-story` message from [workflow-start-messages.md:43](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md#L43) and [workflow-start-messages.md:44](/Users/robertboston/Documents/Cline%20Extension/cline/docs/workflow-automation/workflow-start-card/workflow-start-messages.md#L44)
    - expected rendered title is `Welcome to the Create Story Workflow!`
    - expected CTA remains `Get Started`
  - Do not change any workflow-start-card runtime code in this step. This step is tests only.

- [x] Step 4: Run the required verification commands and perform the final registry coverage audit
  - Allowed files:
    - `/Users/robertboston/Documents/Cline Extension/cline/docs/workflow-automation/workflow-start-card/registry-expansion-action-plan.md`
  - Run these commands in this exact order:
    1. `npm run test:unit -- src/core/task/workflow-start-card/__tests__/WorkflowStartCardRegistry.test.ts src/core/task/__tests__/placeholderWorkflowPersistence.test.ts`
    2. `npx tsc --noEmit`
    3. `ruby -e 'workflows=Dir["/Users/robertboston/Documents/Cline/Workflows/*.md"].map{|p| File.basename(p)}.sort; entries=File.readlines("docs/workflow-automation/workflow-start-card/workflow-start-messages.md", chomp:true).select{|l| l.end_with?(":") && l !~ /^(Message|message):/}.map{|l| l[0..-2]+".md"}.sort; abort("workflow/message mismatch: #{(workflows-entries).inspect} #{(entries-workflows).inspect}") unless workflows==entries; puts "workflow/message coverage OK: #{workflows.size} entries"'`
    4. `rg -n '"[a-z0-9-]+\\.md": \\{' src/core/task/workflow-start-card/WorkflowStartCardRegistry.ts`
  - For command 4, verify that the output contains exactly 43 registry-key lines.
  - If any command fails, stop and resolve only the failure required to satisfy this plan. Do not widen scope.
  - After all commands pass, re-read this entire action plan and verify that these contracts are consistent across the updated implementation and docs:
    - registry entry coverage is driven by every approved `workflow-start-messages.md` entry
    - `quick-spec.md` is no longer described as the only delivered workflow
    - `brainstorming.md` is no longer treated as a missing-entry fallback case
    - `unconfigured-workflow.md` remains the no-registry no-op proof
    - `Get Started` remains unchanged
  - Only after that final audit passes should this step be marked `[x]`.
