# Contextual Tool Matrix Audit Findings

## Scope

Manual audit of every placeholder workflow step in `/Users/robertboston/Documents/Cline/Workflows/` against:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`

This audit is limited to identifying alignment mismatches between workflow-step needs and the currently surfaced tool bundles, considering both the global tool surfaces defined near the top of `contextualToolMatrix.ts` and the step-specific bundle rows in `PLACEHOLDER_WORKFLOW_STEP_MATRIX`.

## Audit method

This review is being performed manually, one workflow at a time and one `## Step` at a time. For each step, the audit reads the workflow text directly, reviews the current matrix row for that workflow, references the consolidated tool reference to confirm the concrete tool surface behind each bundle, and then determines which tool-backed actions a competent agent might reasonably attempt from the step goal, body details, and done signal.

The audit records:

- underexposure when a step reasonably implies a tool-backed action and the needed bundle is not globally available and not present in the row
- overexposure when a row exposes a bundle that the step text does not support, including stale rows for nonexistent workflow steps
- bundle-model gaps when the step clearly needs a concrete tool or tool family that exists in the tool reference but cannot be represented accurately with the current bundle model

## Authorities used

- Workflow source corpus: `/Users/robertboston/Documents/Cline/Workflows/`
- Current placeholder workflow matrix: `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts`
- Consolidated tool reference: `/Users/robertboston/Documents/Cline Extension/cline/docs/system-prompt-tool-reference.md`

## Summary counts

- total workflows audited: 40
- total steps audited: 224
- workflows with no findings: 7
- workflows with findings: 33
- total underexposed rows: 108
- total overexposed rows: 16
- total bundle-model-gap rows: 0

## Findings by workflow

## advanced-elicitation.md

### Step 1: Load context and choose five methods

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step explicitly instructs the agent to persist `{target_file}` and `{methods}` with `set_workflow_placeholders`, while also reading `methods.csv`, `{agent_party}`, and `{target_file}`. `DOC_READ` covers the file-reading behavior, but the row omits `PLACEHOLDER_WRITE` even though the step body and done signal both require placeholder persistence. A competent agent following this step could reasonably attempt `set_workflow_placeholders` before the step is complete.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 3: Run selected methods and gate the changes

Current matrix bundles: `[]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
This step can require rereading the current approved `{target_file}`, generating revised content, presenting proposed changes, and then updating the working version if the user approves. That is not purely conversational. A competent agent might reasonably attempt `read_file` or `read_file_range` to operate on the latest approved state and then use `apply_patch` to update the working version once the user approves. The current row exposes no step-specific support for either the read or edit action.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 11: Write non-functional requirements

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step identifies relevant NFR categories, drafts measurable requirements, and saves the reviewed NFR section into the PRD. As with the earlier section-authoring steps, a competent agent would reasonably inspect the current PRD before updating it. The current row exposes only `DOC_WRITE`.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 10: Write functional requirements

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step extracts capability areas, drafts functional requirements, and then saves the reviewed section into the PRD. Because that is an update to the existing document, an agent could reasonably read the current PRD before patching it. The row currently exposes only write support.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 9: Define scope and roadmap

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step separates MVP/post-MVP/later scope, captures scope risks and mitigations, and saves the approved scope section into the PRD. A competent agent would reasonably inspect the current PRD before updating that section. The current row exposes only `DOC_WRITE`.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 8: Capture project-type requirements

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step drafts project-type content and saves it into the PRD after user review. Updating that existing artifact reasonably implies reading the current document first, but the row exposes only write support.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 7: Decide whether innovation needs its own section

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step reviews context/classification, decides whether an innovation section is warranted, and then either saves that section or records the intentional skip in the PRD. That update reasonably implies reading the current document before writing. The row exposes only `DOC_WRITE`.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 6: Capture domain-specific requirements

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step either drafts domain-specific requirements or explicitly records that no special domain obligations apply, then saves that result into the PRD. A competent agent would reasonably read the current PRD state before making that section-level update. The row currently exposes only document writing.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 5: Map user journeys

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step develops user journeys, maps them to implied requirements, and saves the approved journey set into the PRD. A competent agent would reasonably inspect the current document before updating it, but the row exposes only `DOC_WRITE`.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 4: Define success criteria

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step drafts measurable success criteria and saves the approved section into the PRD. Updating an existing PRD section reasonably implies reading the current document state before patching it, but the row exposes only write support.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 3: Define the vision and executive summary

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step re-anchors in confirmed context, drafts the vision/executive summary, and saves the approved result into the PRD. A competent agent would reasonably read the current PRD before patching that section, but the row exposes only `DOC_WRITE`.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 4: <no corresponding workflow step>

Current matrix bundles: `[]`

Expected bundles: `[]`

Finding type: overexposed

Why:
`advanced-elicitation.md` currently ends at Step 3. The matrix still carries a Step 4 entry even though the workflow source provides no Step 4 text, goal, or done signal to justify any row at that index. This is stale matrix surface area relative to the current workflow source.

Recommended matrix row: remove Step 4 from the workflow row

### Step 5: <no corresponding workflow step>

Current matrix bundles: `[]`

Expected bundles: `[]`

Finding type: overexposed

Why:
The workflow source defines no Step 5. This row remains in the matrix despite having no corresponding workflow step to support it.

Recommended matrix row: remove Step 5 from the workflow row

### Step 6: <no corresponding workflow step>

Current matrix bundles: `[]`

Expected bundles: `[]`

Finding type: overexposed

Why:
The workflow source defines no Step 6. This matrix entry is stale relative to the current workflow file.

Recommended matrix row: remove Step 6 from the workflow row

## brainstorming.md

### Step 1: Open or start a session

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step instructs the agent to persist `{context_file}` when present and to set `{brainstorming_session_output_file}`. `DOC_READ` and `DOC_WRITE` support discovering existing sessions, reading the template, and creating the session file, but the row omits `PLACEHOLDER_WRITE` even though the workflow text explicitly calls for placeholder persistence. A competent agent could reasonably attempt `set_workflow_placeholders` while completing this step.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 2: Identify Brainstorming Session Topic & Goals

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step requires updating `{brainstorming_session_output_file}` with the user’s topic and goals. A competent agent would reasonably inspect the current session file before patching it so the update lands in the right section and preserves any existing session state. The current row exposes only edit support and omits the document-reading support that the step’s file-update behavior reasonably implies.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 3: Choose a brainstorming approach

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
This step requires reading `brain-methods.csv`, updating `{brainstorming_session_output_file}`, and persisting both `{selected_approach}` and `{approach_description}` with `set_workflow_placeholders`. The current row covers the read and edit behavior but omits the placeholder-writing capability that the step explicitly requires in both the body and done signal.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 4: Perform Interactive Brainstorming

Current matrix bundles: `[]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
This step directs the agent to record `techniques_used` and `ideas_generated` in `{brainstorming_session_output_file}` during the session and then set `{ideas_generated}` from the recorded total using `set_workflow_placeholders`. A competent agent could reasonably read the current session file, patch it as the brainstorming session evolves, and then persist the final idea count as a placeholder. The current row exposes none of those step-specific capabilities.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 5: Organize ideas and plan next actions

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
This step requires the agent to review the captured ideas already stored in `{brainstorming_session_output_file}`, append new planning content, update the file frontmatter, and set `{workflow_completed}` using `set_workflow_placeholders`. A competent agent would reasonably read the current session artifact before patching it and then persist the completion placeholder. The current row exposes only edit support. The workflow file also labels this as a second `Step 4`; this finding maps to matrix row 5 by sequence because it is the fifth actual workflow step.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

## check-implementation-readiness.md

### Step 1: Discover and confirm the source set

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires locating planning documents, reading the readiness-report template, generating `readiness_report.md`, and persisting `{output_file}` with `set_workflow_placeholders`. The current row supports the document discovery and report-writing actions but omits the placeholder-writing capability that the step body and done signal explicitly require.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 4: Review epic and story quality

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires reviewing the planning artifacts, appending quality findings to `{output_file}`, and then setting `{quality}` to either `"fail"` or `"pass"` with `set_workflow_placeholders`. The current row supports the read/write analysis work but omits the placeholder-writing capability required by the step body and done signal.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 6: <no corresponding workflow step>

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
`check-implementation-readiness.md` currently defines only Steps 1 through 5. The matrix still includes a Step 6 row with read/write access even though the workflow source contains no Step 6 content to justify any step-level exposure at that index.

Recommended matrix row: remove Step 6 from the workflow row

## cis-design-thinking.md

### Step 1: Frame the challenge

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step may require reading provided context data, which the current `DOC_READ` exposure supports, but it also explicitly instructs the agent to capture `design_challenge` and `challenge_statement`. Given the available workflow-specific persistence tool in the reference, a competent agent could reasonably attempt `set_workflow_placeholders` to retain those values for downstream steps. That capability is missing from the row.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 2: Build empathy

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step instructs the agent to load `design-methods.csv` and then capture `user_insights`, `key_observations`, and `empathy_map`. `DOC_READ` supports the method-file read, but the row omits the workflow-placeholder persistence a competent agent could reasonably use to retain those captured outputs for later steps.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 3: Define the problem

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step is primarily conversational, but it explicitly directs the agent to capture `pov_statement`, `hmw_questions`, and `problem_insights`. Since `set_workflow_placeholders` exists specifically to persist dynamic workflow values, a competent agent could reasonably use it here. The current empty row exposes no step-specific support for that capture behavior.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 4: Ideate broadly

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires reviewing `design-methods.csv` to choose ideation methods and then capturing `ideation_methods`, `generated_ideas`, and `top_concepts`. The current row supports the file-read portion but omits placeholder persistence for the outputs the workflow explicitly says to capture.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 5: Prototype the leading ideas

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires choosing prototyping methods from `design-methods.csv` and then capturing `prototype_approach`, `prototype_description`, and `features_to_test`. `DOC_READ` supports the method lookup, but the row omits `PLACEHOLDER_WRITE` even though the step explicitly instructs the agent to capture those values.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 6: Test with users

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step directs the agent to capture `testing_plan`, `user_feedback`, and `key_learnings`. No file read is implied by the step text, but placeholder persistence is. Since `set_workflow_placeholders` exists specifically for that purpose, the empty row underexposes a tool-backed action a competent agent might reasonably attempt here.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 7: Plan the next iteration

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step tells the agent to capture `refinements`, `action_items`, and `success_metrics`. That is a plausible `set_workflow_placeholders` action, and the current empty row exposes no step-specific support for persisting those captured values.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

## cis-innovation-strategy.md

### Step 1: Establish the strategic context

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step may require reading supplied context, which `DOC_READ` supports, and it explicitly captures `company_name`, `strategic_focus`, `current_situation`, and `strategic_challenge`. A competent agent could reasonably use `set_workflow_placeholders` to persist those values for downstream steps, but the current row does not expose that capability.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 2: Analyze the market landscape

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step directs the agent to read `innovation-frameworks.csv` and capture `market_landscape`, `competitive_dynamics`, `market_opportunities`, and `market_insights`. The row covers the file-read portion but omits the placeholder-writing capability implied by the capture instruction.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 3: Deconstruct the current business model

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step tells the agent to use business-model frameworks and capture `current_business_model`, `value_proposition`, `revenue_cost_structure`, and `model_weaknesses`. The existing row already exposes `DOC_READ`, which is consistent with framework lookup, but it omits `PLACEHOLDER_WRITE` for the captured outputs.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 4: Identify disruption opportunities

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step uses `innovation-frameworks.csv` to choose disruption frameworks and then captures `disruption_vectors`, `unmet_jobs`, `technology_enablers`, and `strategic_whitespace`. The current row exposes the read behavior but omits placeholder persistence for those captured outputs.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 5: Generate innovation opportunities

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires selecting frameworks from `innovation-frameworks.csv` and capturing `innovation_initiatives`, `business_model_innovation`, `value_chain_opportunities`, and `partnership_opportunities`. The current row supports the framework lookup but omits placeholder persistence for the captured outputs.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 6: Develop and evaluate strategic options

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step synthesizes prior insights into three strategic options and explicitly captures a full placeholder set for all three options. That makes `set_workflow_placeholders` a reasonable tool-backed action even though no additional file read is required by the step text. The current row exposes no support for that persistence.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 7: Recommend a strategic direction

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires the agent to capture `recommended_strategy`, `key_hypotheses`, and `success_factors`. That is a plausible placeholder-persistence action, but the current empty row exposes no step-specific support for it.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 8: Build the execution roadmap

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step asks the agent to create a phased roadmap and capture `phase_1`, `phase_2`, and `phase_3`. That makes placeholder persistence a reasonable tool-backed action, but the current row provides no step-specific support for it.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 9: Define metrics, decision gates, and risk mitigation

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step directs the agent to define and capture `leading_indicators`, `lagging_indicators`, `decision_gates`, `key_risks`, and `risk_mitigation`. A competent agent could reasonably persist those values with `set_workflow_placeholders`, but the current empty row exposes no support for that action.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

## cis-problem-solving.md

### Step 6: Evaluate and select the best solution

Current matrix bundles: `[]`

Expected bundles: `["DOC_READ"]`

Finding type: underexposed

Why:
The step requires the agent to choose one or two evaluation methods that fit the situation before recommending a path. Unlike Steps 1, 3, and 5, the workflow does not restate the source file for those methods, so there is some ambiguity in how the agent is expected to retrieve them. Still, because the workflow repeatedly uses `{project-root}/.cline/skills/bmad-cis-problem-solving/solving-methods.csv` as its method source, a competent agent might reasonably attempt to read that file here as well. The current empty row does not expose that read action.

Recommended matrix row: `["DOC_READ"]`

## cis-storytelling.md

### Step 1: Set the storytelling context

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires reading `config.yaml` and any provided context, which the current `DOC_READ` bundle supports, but it also explicitly asks the agent to capture `story_purpose`, `target_audience`, and `key_messages`. A competent agent could reasonably persist those values with `set_workflow_placeholders`, and that capability is missing from the row.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 2: Choose the story framework

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires reading `story-types.csv` and then storing `story_type` and `framework_name`. The current row covers the file-read action but omits the placeholder persistence needed to retain the chosen framework details for later steps.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 3: Shape the core story

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step explicitly captures `story_beats`, `character_voice`, `conflict_tension`, and `transformation`. That makes placeholder persistence a reasonable tool-backed action, but the current empty row does not expose it.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 4: Design the emotional arc

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step tells the agent to store `emotional_arc` and `emotional_touchpoints`. That is a plausible `set_workflow_placeholders` action, but the current row exposes no support for it.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 5: Develop the opening hook

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step explicitly captures `opening_hook`. Since placeholder persistence is the concrete workflow tool meant for this kind of retained value, the empty row underexposes a tool-backed action a competent agent might reasonably attempt here.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 6: Draft or co-create the narrative

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step can involve drafting a core narrative and explicitly storing `complete_story` and `core_narrative`. Even without a required file write at this stage, `set_workflow_placeholders` is a reasonable tool-backed action to persist those narrative outputs. The current row exposes no support for that.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 7: Adapt the story for different formats

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step asks the agent to create and store `short_version`, `medium_version`, and `extended_version`. That implies retaining those values as workflow state, but the current empty row exposes no placeholder-writing support.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 8: Provide usage guidance

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step tells the agent to store `best_channels`, `audience_considerations`, `tone_notes`, and `adaptation_suggestions`. A competent agent could reasonably persist those values with `set_workflow_placeholders`, but the current row exposes no support for doing so.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 9: Refine and finalize

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
This step tells the agent to compile the final output into `{default_output_file}` using `{project-root}/.cline/skills/bmad-cis-storytelling/template.md` as a structure reference and then capture several final-state values. `DOC_WRITE` supports producing the output artifact, but the step also reasonably requires reading the template reference and persisting `resolution`, `refinement_opportunities`, `additional_versions`, `feedback_plan`, `agent_role`, `agent_name`, `user_name`, and `date`. Those read and placeholder-write needs are not surfaced by the current row.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

## code-review.md

### Step 1: Determine Review Source

Current matrix bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step may need to create `{output_folder}/code-review-findings.md` when no story/spec file is found, and it also explicitly requires setting `{spec_file}` and `{review_target}` with `set_workflow_placeholders`. The current row covers reading source context and placeholder persistence, but it omits the edit capability needed for the file-creation branch of the step.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 3: Construct & Persist Diff Output File

Current matrix bundles: `["DOC_READ", "LOCAL_EXEC", "DIFF_BUILD"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC", "DIFF_BUILD"]`

Finding type: underexposed

Why:
The step requires `review-input.diff` to be created on every run, whether by `build_review_diff_output` or by fallback `git show` / `git diff` construction, and it still requires a fallback artifact with explanatory notes when no diff source is available. `DIFF_BUILD` and `LOCAL_EXEC` cover the specialized tool and shell branches, but the row omits document-writing support even though the step explicitly requires persisting the diff artifact in every branch.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC", "DIFF_BUILD"]`

### Step 4: Set Review Mode

Current matrix bundles: `["PLACEHOLDER_WRITE"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires the agent to set `{review_mode}` based on whether `review_input.md` and/or `review_input.diff` are available. That implies checking the current artifact state before persisting the resulting mode. The row exposes placeholder persistence, but it omits the document/file-read support an agent could reasonably use to verify which review artifacts exist.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

## correct-course.md

### Step 1: Triage the trigger

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires reading project artifacts and `project-context.md` when present, and it explicitly instructs the agent to store `{mode}` and `{change_trigger}` with `set_workflow_placeholders`. The current row covers the document-reading side but omits the placeholder-writing capability required by the step body and done signal.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 2: Work through the change-analysis checklist

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step directs the agent to build and update the Sprint Change Proposal document, load `checklist.md`, set `{output_file}`, and, on approval, set `{workflow_status}`. The current row supports the document-read/write work, but it omits placeholder persistence even though the step explicitly requires it.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 3: <no corresponding workflow step>

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
`correct-course.md` currently defines only Steps 1 and 2. The matrix still includes a Step 3 row with document-write access even though the workflow source has no Step 3 content to justify it.

Recommended matrix row: remove Step 3 from the workflow row

### Step 4: <no corresponding workflow step>

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
The workflow source defines no Step 4. This matrix entry is stale relative to the current workflow file.

Recommended matrix row: remove Step 4 from the workflow row

### Step 5: <no corresponding workflow step>

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
The workflow source defines no Step 5. The row is stale and unsupported by the current `correct-course.md`.

Recommended matrix row: remove Step 5 from the workflow row

### Step 6: <no corresponding workflow step>

Current matrix bundles: `[]`

Expected bundles: `[]`

Finding type: overexposed

Why:
The workflow source defines no Step 6. This matrix entry is stale relative to the current workflow file.

Recommended matrix row: remove Step 6 from the workflow row

## create-architecture.md

### Step 1: Resume or initialize

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step requires reading any existing architecture document and source inputs, creating the architecture document from a template when needed, and setting `{output_file}` for later steps. The current row covers the document-read/write work but omits placeholder persistence even though the step body and done signal explicitly require it.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 2: Establish project context

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "EXTERNAL_RESEARCH"]`

Finding type: underexposed

Why:
This step not only reviews project documents and updates the architecture document, it also explicitly tells the agent to research current maintained starter options and recommend the best fit. `EXTERNAL_RESEARCH` is missing from the actual Step 2 row even though the workflow text clearly supports web-backed research behavior here.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "EXTERNAL_RESEARCH"]`

### Step 3: <no corresponding workflow step>

Current matrix bundles: `["DOC_READ", "DOC_WRITE", "EXTERNAL_RESEARCH"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
`create-architecture.md` currently defines Steps 1, 2, 4, 5, 6, 7, and 8. There is no Step 3 in the workflow source. The matrix still contains a fully exposed Step 3 row, which is stale relative to the current workflow file.

Recommended matrix row: remove Step 3 from the workflow row

### Step 4: Make the core architecture decisions

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step requires the agent to identify unresolved decisions based on the existing context or starter choice and then record decisions, rationale, trade-offs, and deferrals in the architecture document. A competent agent would reasonably read the current architecture state before patching it. The current row exposes only edit support and omits the read side of that work.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 5: Define implementation patterns

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step asks the agent to identify divergence-prone areas and then record concrete implementation patterns and consistency rules. Since those patterns need to fit the architecture document built so far, a competent agent would reasonably read the current document state before updating it. The row currently exposes only `DOC_WRITE`.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 6: Define project structure

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step maps requirements and previously made decisions into modules, services, directories, and boundaries, then records that structure in the architecture document. That reasonably implies reading the current architecture content before editing it. The current row exposes only document-writing support.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 7: Validate the architecture

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step begins as a read/review pass, but it also instructs the agent to ask whether important or minor issues should be addressed now. If the user chooses to address them immediately, the agent would reasonably need to update the architecture document within this step rather than defer all changes to Step 8. The current row exposes read support only.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 8: Complete the workflow

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step updates the existing architecture document with completion metadata such as `stepsCompleted`, `status`, and `completedAt`. A competent agent would reasonably inspect the current document before applying that final status update. The row currently exposes only write support.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

## create-epics-and-stories.md

### Step 3: Design and approve the epic structure

Current matrix bundles: `["DOC_WRITE", "WORKFLOW_ROUTE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

Finding type: underexposed

Why:
This step requires grouping the already approved requirements into epics, presenting a coverage map, optionally routing into Advanced Elicitation or Party Mode, and then writing the approved epic structure into `epics.md`. The route and write behaviors are surfaced, but a competent agent would also reasonably read the current requirements inventory and `epics.md` state before refining and writing the structure. That read support is missing from the row.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

### Step 4: Create stories epic by epic

Current matrix bundles: `["DOC_WRITE", "WORKFLOW_ROUTE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

Finding type: underexposed

Why:
The step breaks each approved epic into stories, presents drafts for review, optionally routes into Advanced Elicitation or Party Mode, and then appends approved stories to `epics.md`. As with Step 3, the current row exposes writing and workflow routing but omits the document-reading support an agent would reasonably use to inspect the current epic structure and existing story content before appending or revising it.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

## create-prd.md

### Step 1: Initialize or resume

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step reads config and existing/project input documents, creates or refreshes `prd.md`, and explicitly sets `{outputFile}` for the rest of the workflow. The current row covers the read/write document work but omits placeholder persistence for the output path the step defines.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 2: Discover and classify the product

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step uses loaded context to classify the product and then saves the approved classification into the PRD. A competent agent would reasonably inspect the current PRD state before writing the classification section. The current row exposes only write support.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

## create-product-brief.md

### Step 1: Initialize or resume the brief

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step reads config and context artifacts, creates or resumes the product brief, and explicitly sets `{outputFile}`. The current row covers the document read/write work but omits the placeholder persistence needed for the output path the workflow defines.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 2: Define the product vision

Current matrix bundles: `["DOC_WRITE", "WORKFLOW_ROUTE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

Finding type: underexposed

Why:
The step drafts and saves the executive summary/core vision sections, with optional routing into Advanced Elicitation or Party Mode before approval. The current row surfaces routing and writing, but an agent would reasonably read the current brief state before patching those sections.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

### Step 3: Define the target users

Current matrix bundles: `["DOC_WRITE", "WORKFLOW_ROUTE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

Finding type: underexposed

Why:
This step drafts and saves the target-users section and may route into deeper exploration before approval. The row exposes routing and writing, but it omits the document-reading support an agent would reasonably use before updating the living brief.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

### Step 4: Set success metrics

Current matrix bundles: `["DOC_WRITE", "WORKFLOW_ROUTE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

Finding type: underexposed

Why:
The step drafts and saves the success-metrics section and may route into deeper exploration first. As with the prior brief-authoring steps, a competent agent would reasonably inspect the current brief before patching it. The current row exposes only route/write support.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

### Step 5: Define the MVP scope

Current matrix bundles: `["DOC_WRITE", "WORKFLOW_ROUTE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

Finding type: underexposed

Why:
The step drafts and saves the MVP scope section, again with optional routing into Advanced Elicitation or Party Mode before approval. The row surfaces route/write behavior but omits the document-reading support an agent would reasonably use before updating the brief.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

## editorial-review-prose.md

### Step 1: Validate the input

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
The step validates provided `content` and `reader_type`, filters out code blocks/frontmatter during evaluation, and stops early on invalid input. It does not direct the agent to read files or consult a document source. The current `DOC_READ` exposure is not supported by the step goal, body, or done behavior.

Recommended matrix row: `[]`

## editorial-review-structure.md

### Step 1: Validate the input

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
The step validates the provided `content` payload, checks optional parameters, and derives structural facts such as headings, sections, and counts from that supplied content. It does not instruct the agent to read files or consult an external document source. The current `DOC_READ` bundle is therefore unsupported by the step text.

Recommended matrix row: `[]`

### Step 3: Analyze structure and flow

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
This step maps and evaluates the provided document content by section and word count. It is an analysis step over the already-supplied content, not a file-reading step. The current `DOC_READ` exposure is not supported by the goal or body text.

Recommended matrix row: `[]`

## review-adversarial-general.md

### Step 2: Perform adversarial analysis

Current matrix bundles: `["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`

Expected bundles: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`

Finding type: underexposed

Why:
The workflow explicitly says the review target may be a story file, a review-input file, a diff or commit, or a direct file target. The current row supports code exploration and Indxr-backed code reading, but it omits ordinary document/file reading for non-code review artifacts such as review-input files or story files. A competent agent could reasonably need `read_file` or `read_file_range` during this analysis step.

Recommended matrix row: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`

## review-edge-case-hunter.md

### Step 2: Exhaustive Path Analysis

Current matrix bundles: `["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`

Expected bundles: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`

Finding type: underexposed

Why:
The workflow says the scope may be a diff, a full file, or a function, all loaded from provided input. The current row supports code exploration but omits ordinary document/file reading for cases where the supplied review target is a diff artifact or other non-indexed review material. A competent agent could reasonably need `read_file` or `read_file_range` during this step.

Recommended matrix row: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`

### Step 3: Validate Completeness

Current matrix bundles: `["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`

Expected bundles: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`

Finding type: underexposed

Why:
This step rechecks every in-scope edge class from Step 2 and may need to revisit the same provided diff/full-file/function material. As in Step 2, ordinary document/file reading is a reasonable tool-backed action here when the supplied review target is not purely indexed source. The current row omits that support.

Recommended matrix row: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH"]`

## party-mode.md

### Step 2: Orchestrate the discussion

Current matrix bundles: `[]`

Expected bundles: `["SUBAGENT_COORD"]`

Finding type: underexposed

Why:
The workflow description says to orchestrate a multi-agent discussion, select 2-3 agents whose expertise matches the topic, and route the discussion among them. Given the available orchestration tool surface, a competent agent could reasonably attempt `use_subagents` to realize that multi-agent behavior instead of simulating it as a single monologue. The current empty row does not expose that capability.

Recommended matrix row: `["SUBAGENT_COORD"]`

## create-story.md

### Step 1: Resolve the target story

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step reads explicit input or `sprint-status.yaml`, may update the parent epic status in sprint tracking, and explicitly says to capture and preserve `story_id`, `story_key`, `story_path`, `epic_num`, `story_num`, and `story_title` when known. The current row covers the read/write document work but omits placeholder persistence for the resolved story identity the workflow depends on later.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

## create-ux-design.md

### Step 2: Define the project understanding

Current matrix bundles: `["DOC_WRITE", "WORKFLOW_ROUTE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

Finding type: underexposed

Why:
The step drafts and saves the project-understanding and core-experience sections, and can route into `Advanced Elicitation` or `Party Mode` before approval. Because it saves approved content into an existing UX specification and appends to `stepsCompleted`, a competent agent would reasonably read the current spec state before patching it. The current row exposes writing and routing, but not document reading.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

### Step 3: Shape the experience foundations

Current matrix bundles: `["DOC_WRITE", "WORKFLOW_ROUTE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

Finding type: underexposed

Why:
This step drafts multiple experience-foundation sections, presents them for review with optional workflow routing, then saves the approved content. As with Step 2, the agent would reasonably need to inspect the current UX specification before updating it. The current row omits `DOC_READ`.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

### Step 4: Define interaction structure

Current matrix bundles: `["DOC_WRITE", "WORKFLOW_ROUTE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

Finding type: underexposed

Why:
The step drafts and saves critical flows, component strategy, UX patterns, and responsive/accessibility requirements, again with optional routing before approval. Because the agent is extending and updating the live UX specification after each drafted section, reading the current document is a reasonable prerequisite. The current row exposes only writing and routing.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "WORKFLOW_ROUTE"]`

## dev-story.md

### Step 1: Configure Context & Variables

Current matrix bundles: `["PLACEHOLDER_WRITE"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step explicitly requires setting `{story_path}` with `set_workflow_placeholders`, but it also says to check for sprint status, load `{project_context}` when it exists, and verify that the story file exists. Those are document/file-reading actions. The current row exposes placeholder persistence only.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 2: Execute Incomplete Tasks & Subtasks

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "LOCAL_EXEC"]`

Finding type: underexposed

Why:
This step is the active implementation phase. It requires reading `{story_path}`, updating checklist items and the dev-agent record in that story, marking sprint status `in-progress` when applicable, gathering targeted code context, writing tests and implementation changes, and keeping tests green while working. A competent agent could reasonably need ordinary document reads, file edits via `apply_patch`, code exploration via built-in code read and Indxr-backed tools, and local command execution for targeted validation while implementing. The current row exposes only `DOC_READ`.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "LOCAL_EXEC"]`

### Step 3: Validation

Current matrix bundles: `[]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "LOCAL_EXEC"]`

Finding type: underexposed

Why:
The validation step runs the relevant test/lint/quality commands, may remediate failures caused by the implemented work, reviews the story acceptance criteria against the completed change, and updates `{story_path}` with the file list and final status. That combination reasonably requires document reads, file edits, code exploration, and local execution. The current row exposes none of that step-specific surface.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "LOCAL_EXEC"]`

### Step 4: Closeout

Current matrix bundles: `["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC"]`

Finding type: both

Why:
This step performs bookkeeping: update sprint status to `review`, relocate resolved QA findings within the story file, commit the changed files, and send the final summary. Those actions reasonably require reading the current story/sprint files, editing them, and using local execution for the commit. The current row is underexposed because it omits `DOC_READ`, and overexposed because it includes `CODE_READ` plus the Indxr bundles even though the closeout step does not call for code exploration or source-graph analysis.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC"]`

### Step 5: <no corresponding workflow step>

Current matrix bundles: `["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
`dev-story.md` currently defines only Steps 1 through 4. The matrix still includes a Step 5 row, which is stale relative to the current workflow source.

Recommended matrix row: remove Step 5 from the workflow row

### Step 6: <no corresponding workflow step>

Current matrix bundles: `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
The workflow source defines no Step 6. This matrix entry is stale relative to the current `dev-story.md`.

Recommended matrix row: remove Step 6 from the workflow row

## distillator.md

### Step 1: Validate inputs

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `[]`

Finding type: overexposed

Why:
This step validates supplied arguments such as `source_documents`, `downstream_consumer`, `token_budget`, `output_path`, and `--validate`, and stops for clarification if they are missing or ambiguous. It does not yet instruct the agent to read source files or directories. The current `DOC_READ` exposure is not supported by the step text.

Recommended matrix row: `[]`

## domain-research.md

### Step 1: Confirm the research scope

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step reads config, creates the report from a template, records the confirmed scope, and explicitly sets `{outputFile}`. The current row covers the document read/write work but omits placeholder persistence for the output path the workflow defines.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 2: Analyze the industry

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step researches current sources and then appends an `## Industry Analysis` section into the in-progress report. A competent agent would reasonably inspect the existing report before patching in the next section so the structure, titleing, and continuation gate remain coherent. The current row surfaces research and writing, but not document reading.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

### Step 3: Analyze the competitive landscape

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
This step researches competitors and appends an `## Competitive Landscape` section to the same in-progress report. As in Step 2, updating the evolving report reasonably implies reading its current contents before patching the next section. The current row omits `DOC_READ`.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

### Step 4: Analyze regulatory requirements

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step researches current regulations and appends a `## Regulatory Requirements` section to the report. Because the report is being built section by section, a competent agent would reasonably inspect the current report before adding the next section. The current row omits document reading.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

### Step 5: Analyze technical trends

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step researches technical trends and appends a `## Technical Trends and Innovation` section to the evolving report. As with the earlier research sections, reading the current report before patching the next section is a reasonable tool-backed action that the current row does not surface.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

## market-research.md

### Step 1: Confirm the research topic and scope

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step explicitly says to capture `research_topic` and `research_goals` once they are clear. That makes `set_workflow_placeholders` a reasonable tool-backed action even though the step is otherwise conversational. The current empty row exposes no support for that persistence.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

### Step 2: Initialize the research report

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
This step sets `research_type`, sets `{outputFile}`, and creates the report from `{project-root}/.cline/skills/bmad-market-research/research.template.md`. The current row exposes only writing, but the step also reasonably requires reading the template and persisting the workflow values it explicitly sets.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 3: Research customer behavior and segments

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step researches current sources and writes a `## Customer Behavior and Segments` section into the report. Updating the in-progress report reasonably implies reading its current state before patching it. The current row surfaces research and writing, but not document reading.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

### Step 4: Research pain points and decision processes

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
This step researches pain points and decision processes, then appends two sections to the evolving report. As with Step 3, reading the current report before updating it is a reasonable tool-backed action that the current row does not expose.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

### Step 5: Research the competitive landscape

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step researches current competitive information and appends a `## Competitive Landscape` section to the report. Because this updates an already-started report, reading the current document before patching it is a reasonable tool-backed action that the current row omits.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

## technical-research.md

### Step 1: Define scope and initialize the report

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step captures `research_topic` and `research_goals`, sets `{outputFile}`, and creates the report from `{project-root}/.cline/skills/bmad-technical-research/research.template.md`. The current row exposes only writing, but the step also reasonably requires reading the template and persisting the workflow values it explicitly sets.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "PLACEHOLDER_WRITE"]`

### Step 2: Research the technology stack

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step researches authoritative primary sources and writes a `## Technology Stack Analysis` section into the report. Because that updates an already-started report, reading the current document before patching it is a reasonable tool-backed action that the current row omits.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

### Step 3: Research integration patterns

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
This step appends an `## Integration Patterns Analysis` section to the in-progress report after current-source research. As with Step 2, reading the current report before updating it is a reasonable step-level action that the matrix does not expose.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

### Step 4: Research architectural patterns

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step researches architecture patterns and appends an `## Architectural Patterns and Design` section to the evolving report. A competent agent would reasonably inspect the current report before patching in that next section, but the current row omits `DOC_READ`.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

### Step 5: Research implementation and adoption

Current matrix bundles: `["EXTERNAL_RESEARCH", "DOC_WRITE"]`

Expected bundles: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step appends two major sections to the evolving report after researching implementation and adoption. Reading the current report before adding those sections is a reasonable tool-backed action, but the current row surfaces only research plus writing.

Recommended matrix row: `["EXTERNAL_RESEARCH", "DOC_READ", "DOC_WRITE"]`

## edit-prd.md

### Step 1: Resolve the PRD and optional guidance

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step loads the PRD-purpose reference, optionally loads a validation report, and explicitly captures `prd_file_path` and `validation_report_path` when known. The current row supports the file-reading behavior but omits placeholder persistence for the resolved paths the workflow carries forward.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 4: Apply the edits

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step edits the PRD section by section, updates frontmatter when needed, and preserves useful source references while staying inside the approved scope. A competent agent would reasonably inspect the current PRD state while applying those edits rather than treating the step as write-only. The current row omits document reading.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

## sprint-planning.md

### Step 2: Build the status map

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step initializes the status structure from `{project-root}/.cline/skills/bmad-sprint-planning/sprint-status-template.yaml` and replaces the example content with the real inventory. Because it explicitly uses a template source before writing the generated structure, the step reasonably requires reading as well as writing. The current row exposes only `DOC_WRITE`.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 4: Write the sprint status file

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
This step creates or updates `{implementation_artifacts}/sprint-status.yaml` with generated metadata and the full development-status map. Since the step can update an existing file rather than always writing a fresh one, a competent agent would reasonably inspect the current sprint status before patching it. The current row omits document reading.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

## sprint-status.md

### Step 3: Choose the next recommendation

Current matrix bundles: `[]`

Expected bundles: `["PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step explicitly instructs the agent to store `next_story_id`, `next_workflow_id`, and `next_agent` for the response. Since the workflow-specific persistence tool exists for exactly this kind of carried-forward state, a competent agent could reasonably use `set_workflow_placeholders` here. The current empty row does not expose that capability.

Recommended matrix row: `["PLACEHOLDER_WRITE"]`

## retrospective.md

### Step 2: Verify completeness and choose the scope

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step counts story completion from the selected epic and, when the user accepts that path, explicitly records `partial_retrospective = true`. The current row supports reading the source material but omits placeholder persistence for the scope decision the workflow says to record.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

## shard-doc.md

### Step 2: Choose the destination folder

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "LOCAL_EXEC"]`

Finding type: underexposed

Why:
The step does more than inspect a path: it verifies that the destination exists or can be created and confirms write permission. A competent agent could reasonably use local commands to test or create the folder before continuing. The current row exposes only document/file reading.

Recommended matrix row: `["DOC_READ", "LOCAL_EXEC"]`

## quick-spec.md

### Step 1: Resolve or start the spec draft

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step explicitly sets `{wipFile}`, may archive an existing draft by renaming it, reads related planning documents, and creates the new WIP file from a template. The current row covers document reads and writes, but it omits placeholder persistence for `{wipFile}` and local execution for the archive/rename branch.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC", "PLACEHOLDER_WRITE"]`

### Step 2: Investigate the codebase and constraints

Current matrix bundles: `["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step explicitly says to read the WIP draft, related docs, and project context in addition to inspecting likely code areas. The current row surfaces code exploration and WIP updates, but it omits ordinary document reading for the draft and the related planning/context docs.

Recommended matrix row: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE"]`

### Step 3: Build the spec

Current matrix bundles: `["DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE"]`

Finding type: underexposed

Why:
The step turns the gathered context into an ordered implementation plan and fills in dependencies, testing strategy, and notes in the WIP spec. Because this extends an existing draft, a competent agent would reasonably read the current WIP file before patching it. The current row exposes only writing.

Recommended matrix row: `["DOC_READ", "DOC_WRITE"]`

### Step 4: Review and finalize

Current matrix bundles: `["DOC_READ", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC"]`

Finding type: underexposed

Why:
The step reads the complete spec, updates frontmatter to `ready-for-dev`, and then renames the WIP file to `{implementation_artifacts}/tech-spec-{slug}.md`. The current row covers reading and editing the spec itself, but it does not expose local execution for the rename/finalize branch.

Recommended matrix row: `["DOC_READ", "DOC_WRITE", "LOCAL_EXEC"]`

## quick-dev.md

### Step 6: Resolve findings and finish

Current matrix bundles: `["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC"]`

Finding type: underexposed

Why:
This step can present findings one by one, apply fixes, update a tracked tech spec’s status and review notes, and then close out the workflow. A competent agent would reasonably need ordinary document reads for the tracked artifact or captured findings, code exploration for the actual fixes, document writing for artifact updates, and local execution to rerun targeted checks after fixes. The current row omits `DOC_READ` and `LOCAL_EXEC`.

Recommended matrix row: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC"]`

## quick-dev-new-preview.md

### Step 1: Clarify the request and route the work

Current matrix bundles: `["DOC_READ"]`

Expected bundles: `["DOC_READ", "PLACEHOLDER_WRITE"]`

Finding type: underexposed

Why:
The step explicitly sets `{wipFile}` and derives `{spec_file}` once the scope is clear. While the current row supports reading the existing planning or implementation artifacts to see whether work is already in progress, it omits placeholder persistence for the workflow state established in this step.

Recommended matrix row: `["DOC_READ", "PLACEHOLDER_WRITE"]`

### Step 2: Plan the work and freeze the spec

Current matrix bundles: `["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE"]`

Expected bundles: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC"]`

Finding type: underexposed

Why:
The step explicitly reads `{project-root}/.cline/skills/bmad-quick-dev-new-preview/tech-spec-template.md`, drafts the working spec at `{wipFile}`, and then renames `{wipFile}` to `{spec_file}` when the draft is approved. The current row covers code exploration and spec editing, but it omits ordinary document reading for the template/spec artifact and local execution for the rename/freeze action.

Recommended matrix row: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC"]`

### Step 3: Implement the approved spec

Current matrix bundles: `["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC", "SUBAGENT_COORD"]`

Expected bundles: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC", "SUBAGENT_COORD"]`

Finding type: underexposed

Why:
The step begins by verifying that `{spec_file}` exists and then updating its frontmatter status to `in-progress` before implementation proceeds. That makes ordinary document reading of the approved spec a reasonable tool-backed action alongside the existing code exploration, edits, local execution, and optional subagent handoff. The current row omits `DOC_READ`.

Recommended matrix row: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC", "SUBAGENT_COORD"]`

### Step 4: Review the changes

Current matrix bundles: `["CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC", "SUBAGENT_COORD"]`

Expected bundles: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC", "SUBAGENT_COORD"]`

Finding type: underexposed

Why:
The step updates `{spec_file}` status to `in-review`, constructs review inputs from `baseline_commit`, and appends deferred findings to `{deferred_work_file}` while running the adversarial review path. That reasonably implies reading the current spec and related review artifacts in addition to the already surfaced code exploration, edits, execution, and subagent coordination. The current row omits `DOC_READ`.

Recommended matrix row: `["DOC_READ", "CODE_READ", "INDXR_DISCOVERY", "INDXR_SOURCE_READ", "INDXR_SYMBOL_GRAPH", "DOC_WRITE", "LOCAL_EXEC", "SUBAGENT_COORD"]`

## No-Finding Workflows

- `document-project.md`
- `generate-project-context.md`
- `help.md`
- `index-docs.md`
- `qa-generate-e2e-tests.md`
- `teach-me-testing.md`
- `validate-prd.md`
