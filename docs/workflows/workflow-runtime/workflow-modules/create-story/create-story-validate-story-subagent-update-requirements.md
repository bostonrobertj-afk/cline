# Create Story Validate-Story Subagent Update Requirements

## Scope

Update the already-built `create-story` workflow module to match the revised source workflow at `/Users/robertboston/Documents/Cline/Workflows/create-story.md`.

This is an update-specific requirements document. It must not replace, rewrite, or mutate `docs/workflows/workflow-runtime/workflow-modules/create-story/create-story-requirements.md`. The original create-story requirements remain authoritative for behavior not explicitly changed here.

Use `docs/workflows/workflow-runtime/workflow-modules/module-build-guide.md` as the controlling module-build guide for runtime workflow shape, model-facing tool schemas, decision-tree routing, prompt projection, testing, and validation.

The update owns only these behavior changes:

- remove the model-driven Step 4 validation phase from create-story
- make Step 3 perform story task/subtask authoring, dispatch validate-story subagents, loop until validation passes with no findings, and then call `attempt_completion`
- preserve existing deterministic story finalization behavior, but route it from Step 3 `attempt_completion_succeeded` instead of Step 4 `attempt_completion_succeeded`
- update create-story Step 3 model-facing tools so the agent can launch subagents and complete the workflow
- update create-story model-facing shared/default tool schema construction to use registered shared/default tool specs through `ClineToolSet`
- update tests and prompt projection coverage for the new three-step workflow shape

No Step 1 input-selection behavior is changed by this update. No Step 2 context-review behavior is changed by this update. No create-story workflow identity, prerequisite file declaration, story index parsing, story path derivation, remediation context derivation, workflow form panel copy, panel routing, registry registration, slash-command name, use-skill name, persona, project subfolder, or entry project value contract is changed by this update.

## Source Fidelity

The runtime implementation must faithfully represent the revised source document. Prompt text and user-facing text that remains in scope must not be paraphrased, summarized, or invented.

Source-document conditional marker lines such as `*** Shown only if... ***` and `*** end conditional prompt block ***` are authoring guidance. They must not appear in runtime prompt constants, `promptTemplates`, projected prompt payloads, or test-owned expected prompt payloads except as forbidden-string assertions.

## Workflow Steps

The create-story workflow must define exactly three workflow steps after this update:

| Step id | Step number | `checklistLabel` | Required runtime shape |
| --- | --- | --- | --- |
| `step-1` | 1 | `Gather Inputs` | Unchanged. Resolve required and optional prerequisites, render one same-session workflow form for Panels A through G, derive story paths and metadata, and transition only actionable draft or user-approved backlog stories to Step 2. |
| `step-2` | 2 | `Review Context & Ensure Project Alignment` | Unchanged. Model-driven context review step; progression requires `workflow_progress_request` confirmation. |
| `step-3` | 3 | `Author Tasks & Subtasks` | Model-driven story task/subtask authoring or revision step; dispatches validate-story subagents until validation passes with no findings; final delivery uses `attempt_completion`; `attempt_completion_succeeded` routes through deterministic story finalization before completion. |

The workflow definition must not contain `step-4`, `buildStep4DecisionTree`, `buildStep4PromptSource`, `CREATE_STORY_STEP_4_PROMPT_TEMPLATE`, `buildCreateStoryStep4ToolSchemas`, Step 4 prompt templates, Step 4 checklist labels, Step 4 decision-tree branch IDs, Step 4 route IDs, or Step 4 prompt-projection expectations.

The existing helper used to create step definitions must no longer accept `4` as an allowed step number after Step 4 is removed.

## Step 3 Prompt

Step 3 must enter model-driven work through a `project_prompt` decision action.

Step 3 `buildPromptSource` must construct the Step 3 prompt from module-owned code. The Step 3 prompt must preserve the AI-facing text for the selected condition from `/Users/robertboston/Documents/Cline/Workflows/create-story.md`, with workflow value placeholders rendered through deterministic workflow value rendering.

When the selected story has `status: "backlog"`, Step 3 must begin with this exact prompt variant:

```text
Review the existing tasks and subtasks in target_story and determine whether they meet the following criteria:
- They fully satisfy the story's requirements
- They respect the story's scope and scope boundary
- They support achievement of the story's objective
- They prescribe changes in a manner which complies with the story's general instructions
- Subtasks are scoped to a single revision in a single target file
- Each subtask includes specific allowed files
- Tasks & subtasks provide specific prescriptive revisions without deferring decision space to the implementing agent.
- Requirements do not ask for delivery of imports, helpers, placeholder scaffolding, future-step code, or partially-wired definitions unless the story will also wire them into legitimate runtime use.
- Prescribed tests provide adequate coverage of both happy paths and failure paths for all code revisions
- Tests are prescribed only for behavior, contracts, regression, and material risks required by the story document and project documentation
- Any tests built via the story's tasks use exact assertions for canonical machine-consumed outputs and stable contracts, including tool names/ schema shape, artifact file formats, and persisted metadata.
- Any tests built via the story's tasks use shape and invariant assertions for editable content: required fields exist, strings are non-empty, mappings are correct, and forbidden legacy values are absent.
- Any tests built via the story's tasks do not add static guards unless they protect an approved boundary, forbidden legacy dependency, or known regression risk.

Notify the user that you've reviwed the existing tasks & subtasks for coverage, consistency, and quality, surface any issues you've identified to them, and ask them what additional issues or concerns they'd like you to address.
```

When the selected story has `status: "draft"`, Step 3 must begin with this exact prompt variant:

```text
Review runtime code & tests and identify the full set of in-scope revisions needed to deliver the story's requirements and objective.
If the story requires touching existing artifacts or placeholders, trace the exact runtime resolution path end to end:
    config/source of truth
    resolver/helper
    handler/runtime consumer
    tests/docs that assert the convention
    For any plan that introduces a new artifact, tool, or schema entry, perform a sibling-pattern audit:
    registration
    executor wiring
    prompt/tool exposure
    approval/path policy
    tests
    snapshots/generated surfaces
    docs/reference surfaces if treated as canonical in-repo
Provide the user with the identified revision set and tell them your next step is to translate these revisions into implementation-ready tasks and subtasks.
Next, build the story's tasks & subtasks using the identified revision set.
```

Both Step 3 prompt variants must then append this exact shared prompt text:

```text
You must follow these rules when authoring story tasks & subtasks:
1. Verify solution quality and standards
   - Ensure the proposed code or fix is appropriate, elegant, and consistent with modern, industry-standard practices for the project's tech stack, including CLEAN architecture.
   - If you must deviate from best practices (e.g., due to constraints), clearly explain why and what the ideal pattern would be.
2. Prescribe deep, architectural fixes over surface workarounds
   - Check whether the issue can and should be solved at a deeper architectural layer (design, data flow, responsibilities) rather than with a shallow or hacky workaround.
   - If you choose a workaround for pragmatic reasons, explicitly label it as such and describe the deeper architectural fix that would be ideal.
3. Look for underlying design-pattern flaws
   - Examine whether the issue reveals deeper design or pattern problems (e.g., responsibilities mixed, poor separation of concerns, leaky abstractions).
   - If such problems exist, call them out explicitly and propose how they could be addressed, even if the full fix is out of scope for the immediate change.
4. Consider downstream and peripheral impact
   - Evaluate how the change may affect other modules, call sites, and features, including edge cases and lifecycle interactions. Search the codbase and read peripheral files if uncertain.
   - If the change is likely to cause downstream or peripheral issues, that is acceptable only if:
     a) You clearly identify and describe these risks, AND
     b) You propose follow-up steps or mitigations as part of the solution.
5. Avoid hardcoded values; prescribe integration with config/strings where appropriate
   - Do NOT introduce hardcoded strings or values when they represent configuration, thresholds, labels, messages, or anything reasonably likely to change.
   - Instead, integrate such values into the app’s configuration system when appropriate for user/admin/dev tweaking
   - All user-facing or UI strings MUST go into a strings.xml (or similar)
   - If you cannot follow this rule for some reason, explicitly state why.
6. Prescribe removal of cruft and failed-attempt remnants
   - Ensure that your changes do not leave behind obsolete code/imports, commented-out experiments, dead branches, or outdated patterns related to prior failed attempts.
   - Consider related/downstream modules that may now contain redundant or inconsistent code as a result of your change.
   - De-crufting should be treated as part of the fix: either perform it in your changes, or clearly specify what should be removed/refactored and where.
- When deleting or retiring a domain concept, delete its named gates, helper methods, variables, and tests rather than repointing them at another surviving concept.
7. Practice Good Code Hygiene by avoiding common bad habits:
    - "any" typing
    - val as SomeType
    - as any in tests
    - optional properties most of the time (explicitly model which combinations exist and which don't whenever possible)
    - one-letter generics
    - non-boolean boolean checks
    - bang bang operators (explicitly check for the condition instead)
    - != null (explicitly check for the condition instead)
    - not declaring function return types
    - abuse of type assertions (use them only in special scenarios where the type is clearly known, and give priority to type declarations, interfaces, or generics)
    - Failing to use utility types (use utility types such as partial, pick, omit, etc when appropriate)
    - forcing assertions when types don't match
    - not using enums to manage constants
    - not using generics to abstract duplicated code
    - not using type narrowing
    - not explicitly defining generics parameters
    - semantic aliasing, where a variable/function/type with an old domain meaning is reassigned to a new generic or unrelated concept instead of being deleted
    - stale domain naming after behavior migration; names must describe the current approved responsibility, not the historical source of the code
    - compatibility remaps that preserve retired concepts by pointing them at surviving generic behavior unless the upstream requirements explicitly approve that remap
    - boolean aliases whose name does not exactly match the condition they represent; use the existing boolean directly or introduce a correctly named concept only if the architecture requires it
    - retaining obsolete gates/seams/flags after their original behavior is removed
8. Do not introduce architecture in the action plan that is not prescribed in an upstream document.
    - The action plan must not introduce architectural concepts or solutions which are not backed by existing project documentation. If something is not explicitly prescribed, you must gain user alignment and approval before including it in the action plan.
    - If you determine that additional or different architecture is necessary while authoring the action plan, you must stop and inform the user so that the appropriate revisions can be made to upstream documents first.
9. Avoid in-plan churn. Do not prescribe code in one task/ subtask only to replace the prescribed code in a subsequent task/ subtask. Identify the final shape of every line being prescribed, and require the dev agent to implement it that way in one task / subtask.
10. The action plan must end in a repo-valid intermediate state that passes the same static gates required before commit, including formatting, lint, typecheck and any focused tests prescribed for that phase.
    - Do not prescribe unused imports, unused helpers, placeholder scaffolding, future-step code, or partially wired definitions unless the story's tasks/ subtasks also wire them into legitimate runtime use.
11. Tasks & Subtasks must be on their own lines starting with "[ ]" so that dev agents can mark completion as they progress through the action plan.
    - tasks & subtasks must have numerical IDs, with subtasks inheriting the parent task ID, e.g. task 1, subtasks 1.1, 1.2.
    - Subtasks must prescribe exact line-level revisions with target file indicated.
    - Subtasks must never prescribe more than ONE required revision
12. NEVER prescribe retyping, casting, renaming, or otherwise mutating existing capabilities/functionality within a task or subtask unless you have surfaced the proposed change as a single topic to the user and gained their approval.

If at any point you cannot satisfy one or more of these rules (for example, due to missing context or constraints in the existing architecture), you MUST:
- Explicitly state which rule(s) you cannot fully satisfy, and why.
- Propose the best available compromise, and outline what a more ideal long-term fix would look like.

After authoring the tasks & subtasks, dispatch a subagent to validate that the story is fully compliant and implementation-ready.
You must provide the subagent with this exact prompt (no paraphrasing or alterations of any kind):
Skill: use_skill('validate-story') Your task is to validate the story document I've just drafted to ensure that it is implementation-ready. You will receive separate workflow instructions which provide exact guidance regarding story validation. Complete the story validation per the instructions, then respond to me using attempt_completion with your findings. In your response, you must include the exact task and/or subtask numbers for any items which have issues that I need to address.

Once the subagent completes their validation & provides you with their findings, address any issues they've identified. If the subagent identified issues, correct them in the story document, shut down the subagent, and repeat the subagent validation process with a fresh subagent. Repeat this process until a subagent completes validation with no findings.

Once validation passes with no findings, call attempt_completion and include the following information:
- The story is complete and implementation-ready
- Story validation was completed by a Subagent via the Validate Story workflow and all issues were successfully resolved
- The user should run the Dev Story workflow next
```

Step 3 must not include the source line `### Progression Rule: successful use of attempt_completion` in projected prompt text. That line is source authoring metadata for runtime routing.

No fallback Step 3 prompt variant is allowed. If workflow state does not match one of the supported Step 3 prompt conditions, the workflow must fail clearly instead of projecting a generic prompt.

## Step 3 Routing And Completion

Step 3 must no longer wait for `workflow_progress_request_confirmed` or route denied progress requests back to the Step 3 project prompt.

Step 3 must project the prompt, then wait for `attempt_completion_succeeded`.

After `attempt_completion_succeeded`, the Step 3 decision tree must preserve the existing deterministic finalization semantics:

- when `selected_story_status` is `draft`, update the selected story's status in `stories_index` from `draft` to `backlog`
- after a successful draft status update, move the story file from `implementation/drafts` to `implementation/stories-backlog`
- preserve the story file's canonical filename from `selected_story_file_name` / `target_story_filename_for_move`
- route to `complete_workflow` only after both the draft status update and draft file movement succeed
- when the selected story is a backlog story selected for revision, confirm or set the selected story's status in `stories_index` to `backlog`
- route a backlog revision to `complete_workflow` only after the backlog status confirmation succeeds
- do not move a backlog story out of `implementation/stories-backlog`
- fail clearly on story-index update failure or file-move failure

The final deterministic behavior is retained from the live workflow. Only its owning step changes from Step 4 to Step 3.

All Step 3 finalization branch IDs and route IDs must be renamed from `step-4-*` to `step-3-*` names so persisted route state, tests, logs, and action-plan references describe the current approved responsibility. The update must not preserve obsolete Step 4 route names as compatibility aliases.

## Tool Schema Ownership

The create-story module must continue to own model-facing tool schemas in:

```text
src/core/task/workflow-runtime/workflow-modules/create-story/createStoryToolSchemas.ts
```

As approved for this update, `createStoryToolSchemas.ts` must be brought into compliance with the module build guide's shared/default tool schema pattern. Normal shared Cline tools must be represented by ordered `ClineDefaultTool` id arrays and resolved through registered shared/default specs using `ClineToolSet.getToolByNameWithFallback(...)`.

`createStoryToolSchemas.ts` must not hand-build or copy local `ClineToolSpec` objects for these normal shared/default tools:

- `read_file`
- `read_file_range`
- `list_files`
- `search_files`
- `list_code_definition_names`
- `send_user_message`
- `attempt_completion`
- `apply_patch`
- `ask_followup_question`
- `workflow_progress_request`
- `use_subagents`

Step 1 must continue to expose no model-facing tools.

Step 2 must continue to expose exactly these model-facing tools, in this order:

- `read_file`
- `send_user_message`
- `ask_followup_question`
- `workflow_progress_request`
- `apply_patch`
- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file_range`

Step 3 must expose exactly these model-facing tools, in this order:

- `list_files`
- `search_files`
- `list_code_definition_names`
- `read_file`
- `read_file_range`
- `apply_patch`
- `send_user_message`
- `ask_followup_question`
- `use_subagents`
- `attempt_completion`

Step 3 must not expose `workflow_progress_request`.

No create-story step may expose:

- `set_workflow_values`
- `plan_story_artifacts`
- `plan_remediation_story_artifact`
- `generate_story_files`
- `build_workflow_document`
- `create_workflow_artifact`
- `archive_workflow_artifact`
- `delete_workflow_artifact`
- `move_workflow_project_file`

`move_workflow_project_file` remains backend-only and may be used only through runtime-owned deterministic routing.

## Validate-Story Subagent Invocation

The Step 3 prompt must instruct the parent agent to dispatch validate-story subagents using the exact assignment phrase:

```text
Skill: use_skill('validate-story')
```

The assignment phrase must remain in the parent create-story Step 3 prompt. It is consumed by the existing subagent workflow assignment mechanism before the child agent turn. The validate-story subagent must be activated as a child workflow through the product-owned workflow registry and runtime subagent bootstrap behavior.

The create-story module must not introduce `childInheritance` rules for create-story. Child inheritance belongs to the child validate-story workflow definition. The create-story parent workflow must provide the necessary parent workflow values already present in the active create-story session, especially `projectTitle`, `projectFolderName`, `target_story`, `epics_document`, and `architecture_document`, for validate-story inheritance.

The create-story module must not add new runtime architecture for subagent locking, parent/child synchronization, subagent result parsing, or parent workflow mutation. The parent model remains responsible for reading validate-story subagent findings from the `use_subagents` result, correcting the story when needed, shutting down the subagent, and repeating with a fresh subagent until validation returns no findings.

## Prompt Projection

Create-story prompt projection must continue to place current step details in the workflow input payload, not in system instructions.

Prompt projection tests must verify that Step 3 prompt payloads include:

- the selected Step 3 variant content for draft and backlog stories
- the exact validate-story assignment phrase `Skill: use_skill('validate-story')`
- the exact validation prompt sentence `Your task is to validate the story document I've just drafted to ensure that it is implementation-ready.`
- the exact instruction `Complete the story validation per the instructions, then respond to me using attempt_completion with your findings.`
- the exact final completion bullets:
  - `The story is complete and implementation-ready`
  - `Story validation was completed by a Subagent via the Validate Story workflow and all issues were successfully resolved`
  - `The user should run the Dev Story workflow next`

Prompt projection tests must verify that Step 3 prompt payloads do not include:

- source-document conditional marker lines
- the removed Step 4 validation prompt `Verify that {workflow.target_story} is complete, correctly formatted, internally consistent, and safe to hand off for implementation.`
- the removed Step 4 checklist label `Finalize & Validate Story Document`
- raw workflow placeholders for values expected to be rendered

Prompt tests must not assert complete prompt strings or duplicate full prompt bodies as test-owned expected values. Tests must use focused includes, exclusions, variant selection, required workflow-value interpolation, unsupported-state failures, routing/tool exposure contracts, and absence of unauthorized legacy or retired wording.

## Testing Requirements

Update focused create-story module tests to verify:

- the workflow definition contains exactly `step-1`, `step-2`, and `step-3`
- no `step-4` definition exists
- Step 3 checklist label remains `Author Tasks & Subtasks`
- Step 3 prompt variants preserve the required source-authored content for backlog and draft stories
- Step 3 prompt includes the exact validate-story subagent assignment prompt and final completion bullet list
- Step 3 prompt excludes conditional authoring markers and retired Step 4 prompt text
- Step 3 unsupported prompt conditions fail clearly
- Step 3 decision tree projects the model prompt and waits for `attempt_completion_succeeded`
- Step 3 no longer routes `workflow_progress_request_confirmed` or `workflow_progress_request_denied`
- Step 3 draft-story finalization updates status to `backlog`, moves the story from `implementation/drafts` to `implementation/stories-backlog`, and completes only after both deterministic operations succeed
- Step 3 backlog-story finalization confirms `backlog` status without moving the story file
- Step 3 deterministic finalization failures route to clear terminal errors
- obsolete Step 4 helper names, prompt constants, branch IDs, route IDs, and tool schema builders are removed

Update create-story tool-schema tests to verify:

- all create-story model-facing shared/default tool specs are resolved through the registered shared/default tool set
- Step 1 exposes no tools
- Step 2 exposes the unchanged exact tool order
- Step 3 exposes the new exact tool order including `use_subagents` and `attempt_completion`
- Step 3 does not expose `workflow_progress_request`
- no create-story step exposes forbidden workflow, story-planning, artifact, or backend-only runtime tools
- `move_workflow_project_file` remains absent from model-facing schemas

Update prompt integration tests to verify:

- create-story Step 3 projects the new exact native tool surface
- response-tool guidance matches the projected Step 3 schema
- Step 3 includes `use_subagents` and `attempt_completion`
- Step 3 excludes `workflow_progress_request`
- no Step 4 prompt or schema surface is projected
- current step details remain in the workflow input payload, not the system prompt

## Validation Requirements

Validation for this update must include:

```bash
npm run test:unit -- src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryWorkflow.test.ts src/core/task/workflow-runtime/workflow-modules/create-story/__tests__/createStoryToolSchemas.test.ts
npm run test:unit -- src/core/prompts/system-prompt/__tests__/integration.test.ts
npm run check-types
npm run lint
```

When running `npm run check-types`, run it with elevated permissions. If `npm run check-types` fails before TypeScript checking because generated proto files are missing or host probing fails, run `npm run protos`, then rerun `npm run check-types` with elevated permissions before treating the failure as a code defect.

Validation must include focused static guards proving:

- `CREATE_STORY_STEP_4_PROMPT_TEMPLATE` is absent from create-story runtime code and tests
- `buildStep4DecisionTree` is absent from create-story runtime code and tests
- `buildStep4PromptSource` is absent from create-story runtime code and tests
- `buildCreateStoryStep4ToolSchemas` is absent from create-story runtime code and tests
- `"step-4"` route and branch identifiers are absent from create-story runtime code and tests
- `Finalize & Validate Story Document` is absent from create-story runtime code and tests
- `workflow_progress_request` is absent from the create-story Step 3 projected tool schema
- `use_subagents` is present in the create-story Step 3 projected tool schema

Validation must include a scope-diff check proving persistent tracked diffs are limited to files authorized by the action plan for this update and that untracked files are either absent or explicitly authorized by the update action plan.
