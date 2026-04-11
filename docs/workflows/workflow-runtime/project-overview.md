# Background
- This repo began as a fork of Cline, an existing VSCode extension.
- The goal when it was forked was to integrate BMAD into the architecture.
- The initial approach to that integration was a concept known as managed workflows, which were eventually abandoned due to lack of scalability and compatibility with the broader architecture.
- The second approach was to build all of the BMAD workflows through the Cline UI's workflow creation capability, which creates placeholder workflows. This approach worked well, and allowed the execution of BMAD workflows within Cline with integrated prompting.
- Once the BMAD workflows were turned into placeholder workflows, focus shifted to optimizing functionality.
- The initial focus was on token consumption, with many patches targeting more contextual prompting to deliver only the relevant-in-the-moment instructions to the AI agent.
- Once prompting mechanisms were essentially fully optimized, the next area of focus was on token consumption tied to tool calls. Many patches focused on streamlining and contextualizing tool use and tool output to reduce the tokens consumed by tool use. This eventually led to the contextual tool matrix.
- Once that work was done, focus shifted to automating workflow progression. The BMAD placeholder workflows were integrated with Cline's existing focus chain capability, and shortly after deterministic workflow progression was developed to automate step completion.
- Once that was done, the next area of focus was to begin to build deterministic mechanisms to handle certain workflow steps. The original workflows relied fully on the AI Agent to execute every task, and many of those tasks were (and still are) candidates for deterministic resolution, e.g. persisting values as session variables, gather inputs and persisting them in a file, creating files from templates, and other similar tasks. This led to the creation of workflow forms, a deterministic capability designed to gather inputs from a user then pass them to the runtime so that deterministic mechanisms/tools could use them to resolve workflow-specific tasks.
- That work has been ongoing, with methodical expansion one workflow at a time. The recent challenge has been that the underlying capabilities, built in successive layers as described above, did not foresee the needs of other workflowss and were limited in their capabilities, leading to each workflow hard-coding bespoke mechanisms to use things like workflow forms and deterministic progression.
- A decision has been made to pause the expansion of the existing capabilities and make a clean break from the placeholder workflow config, which treats a workflow markdown file as the canonical authority, to a true workflow runtime that orchestrates an active workflow across all of the various supporting mechanisms, such as focus chain, welcome panels, deterministic progression, and workflow forms.
- You are stepping in at the point where we know we need to do this work, but we have not yet begun project disovery and documentation. The immediate focus will be on drafting the high-level architecture, which will inform requirements, which will in turn inform action plans for implementation.

# Goals
- Eliminate reliance on BMAD documents and placeholder workflow documents- this includes the workflow documents as well as supporting files such as templates, workflow or agent persona-related .yaml files, etc. These functionality these files supports should be migrated to back-end code so that runtime code is no longer reliant on user-accesible markdown files.
- Create a canonical workflow runtime which is invoked by index.ts. Index.ts remains the primary app-level orchestrator- the workflow runtime simply acts as a subrunner when a workflow is active with workflow-specific orchestration responsibility
- Purge the managed workflow capability from the system

## Active Workflow Variable
- Persist activeWorkflowName as the single indicator of which workflow is active, and retire:
    - activePlaceholderWorkflowId
    - activePlaceholderWorkflowSource
    - activePlaceholderWorkflowName in prompt context
    - Managed-workflow state in managedWorkflowRun
- activeWorkflowName is the sole canonical workflow-identity flag answering whether a workflow is active and which workflow is active; it is not the carrier for workflow session state, active step state, or per-turn orchestration state.”

## Two-Layer Workflow Architecture
- Establish a central worklow runtime orchestrator backed by workflow-specific modules:
    - workflow module says: what this workflow is, what steps exist, what prompt strings should be used during this workflow, what transitions are allowed, what capabilities each step needs, what prompt/tool/UI projections apply, and which specialized evaluators or handlers are available
    - shared workflow runtime says: given that definition and the current workflow session state, what happens now
- Workflow Runtime should contain:
    workflow activation entrypoint
    active workflow session creation
    canonical active-workflow state ownership
    workflow definition loading / resolution
    current-step resolution from runtime state
    lifecycle orchestration across turns
    dispatch to the correct capability for the active step
    focus-chain projection from workflow definition + session state
    prompt-context projection for system-prompt assembly
    tool-surface projection for contextual gating
    workflow start-card invocation orchestration
    workflow-form invocation orchestration
    non-interactive deterministic step-resolution orchestration
    progression evaluation / advancement orchestration
    completion detection orchestration
    teardown / cleanup orchestration
    persistence and resume orchestration
    capability handoff boundaries and contracts
    fallback handling when deterministic paths fail
    runtime validation of workflow definitions
    observability / diagnostics / logging
    shared runtime error handling
    workflow session mutation rules
- Workflow-specific modules should contain:
    workflow identity and metadata
    step graph and transition definitions
    steps to feed focus chain
    per-workflow prompt/persona overlays
    per-step prompting
    workflow-level tool gating defaults
    per-step tool matrix
    per-step progression rules
    start card configuration
    workflow form configuration(s)
    deterministic step-resolution configuration
    completion / teardown rules
    resume-state requirements
    references to any workflow-specific evaluators or handlers

## Current Workflow Step Indicator
- Current runtime code has focus chain markdown as the canonical indicator of which step is active
- In new architecture, the shared workflow runtime owns the active step indicator.

## Workflow Progression Logic
- In the current runtime, deterministic workflow progression is housed as a child of the focus chain capability, and orchestrated by both focus-chain/index.ts and task/index.ts.
- In new architecture, the workflow-specific modules should contain the details for each workflow's step progression logic, and the workflow runtime should use those rules to orchestrate step progression, updating the active workflow step variable to signal when progression has occurred.
- workflow_progress_request will continue to be the mechanism through which the AI agent can request workflow step progression, but the tool must only be available to the AI Agent when the workflow runtime indicates it should be provided, and the "yes" response to the tool's UI ask should not progress the workflow directly- it should be handed to the workflow runtime, and the workflow runtime should validate that workflow_progress_request is a permitted progress mechanism for the current workflow step, then update the workflow step variable to signal progression.
- task_progress will be retired- focus chain will only progress when the active step variable changes.
    - This means the tools that the AI agent uses to directly progress the focus chain must also be retired.
    - This means that focus chain becomes a feature that only supports active workflows.
- WorkflowStepResolutionRegistry should be retired- the information there belongs in the workflow modules, and is used during workflow orchestration by the workflow runtime. 

## Workflow Forms
- In the current runtime, WorkflowFormRuntime owns building per-panel workflow form payloads.
- In the new architecture, the workflow runtime owns building the per-panel worfklow form payloads
    - This means workflowFormRuntime must be retired

### Tool Calls Associated with Workflow Forms
- In the current runtime, workflow form resolvers decide what tools should be called, what inputs from the workflow form to use, interpret tool results, and supply fallback error messaging. Tool execution happens in task/index.ts via executeWorkflowFormOperationAndSync, which calls this.toolExecutor.executeTool
- In the new architecture, the workflow runtime should execute deterministic operations for workflow forms via the normal tool path, apply the result to workflow session state, and decide what happens next
- This means that task/index.ts will no longer own executeWorkflowFormOperationandSync- this moves into the workflow runtime.

##  Make persistence/resume a first-class objective.
- In the current runtime, workflow persistence/resume is fragmented across TaskState, task metadata on disk, and capability-specific session blobs, including:
    activeWorkflowId
    activePlaceholderWorkflowId
    activePlaceholderWorkflowSource
    placeholder stable/dynamic values
    placeholder deterministic state
    placeholder write-proof paths
    activeWorkflowFormSession
    activeWorkflowStepResolutionSession
    managedWorkflowRun
- The new runtime should own the minimum persisted workflow session state needed to resume safely and reconstruct active workflow state.

## Workflow Prompting
- In the current runtime, workflow-related prompting is scattered across many prompting mechanisms including (but not limited to):
    src/core/task/index.ts (line 2593)
    buildWorkflowPromptInstructions() assembles workflow persona and BMAD/workflow reminder text.
    src/core/task/index.ts (line 3905)
    prompt-context assembly injects workflow identity, placeholder step context, deterministic flags, and workflow capability flags into SystemPromptContext.
    src/core/workflows/placeholder-workflow-step-details.ts (line 170)
    derives step-aware workflow prompt context from the checklist plus workflow source.
    src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts (line 151)
    maps workflow name to persona instructions.
    src/core/prompts/system-prompt/components/agent_role.ts (line 10)
    injects workflow persona text.
    src/core/prompts/system-prompt/components/user_instructions.ts (line 10)
    injects workflow reminder/custom workflow instructions.
    src/core/prompts/system-prompt/components/task_progress.ts (line 62)
    teaches workflow-specific progression behavior like workflow_progress_request vs task_progress.
    src/core/prompts/system-prompt/components/continuation_turn.ts (line 13)
    adds step-completion guidance again on continuation turns.
    src/core/prompts/system-prompt/registry/contextualNativeToolFilter.ts (line 18)
    workflow-step-specific tool gating shapes what the model can see.
    src/core/task/focus-chain/index.ts (line 250)
    separately injects “current workflow status” and “current workflow step” prompt text outside the system-prompt component path.
- In the new architecture, workflow runtime builds canonical workflow prompt data for the turn, while system prompt uses that to build the final workflow prompt section from that data.
- The workflow modules contain the actual step-specific prompt strings and export them
- The workflow runtime sends a payload to the prompt architecture telling it which prompt strings to import on that turn
- The prompt architecture imports those prompt strings and builds the system prompt.
- Example of something that might live in a workflow module:
        export const codeReviewPromptContent = {
    step1: {
        full: `Step 1:\n\nFollow these instructions:\n- Blah\n- Blah\n- Blah`,
        minimal: `Step 1: Do blah, blah, blah.`,
    },
    }
- workflow reminders- these need to be retired or migrated to operate within the architecture described above.

## Workflow Completion/ Teardown
- In the current runtime, task/index.ts handles workflow teardown. Each turn, it checks to see if the last item in the active focus chain was completed. If so, it calls workflowCompletionHandler, then teardownCompletedPlaceholderWorkflow, which clears all workflow-related task state, claers the checklist progression, and persists the cleared metadata. 
- In the new architecture, the workflow runtime should own completion detection, and should own teardown of the canonical workflow session. Focus chain, prompt state, and other surfaces are then cleared as downstream projections of that teardown. 

## Maintain external specialist capabilities
- The workflow runtime should not in-line existing specialist capabilities such as workflow forms or tool execution.

## Workflow Support Files

### workflow-config.yaml
these become typescript constants/variables declared in the workflow runtime layer, likely in something like workflowRuntimeConfig.ts, and exported for use elsewhere when needed.


### Workflow Document Templates
- In current runtime workflows rely on markdown files as templates for workflow-emitted documentation.
- In the new architecture, workflow modules own coded definitions for document layout, and tools use that code to produce markdown documents during workflows.

### Agent Personas
- In current state, prompt-owned mapping lives in workflowPersonaRegistry and is consumed from task/index.ts.
- Persona activation relies on agent files in BMAD folders
- Agent metadata and allowlisting live in agent-manifest.csv and agent-workflow-allowlist.json

## Subagents
In the new architecture, if a subagent is assigned a workflow via useSkill, the subagent runtime activates that workflow in the child session only
the child gets its own:
    activeWorkflowName
    workflow session state
    active step
    prompt projection
    tool gating
    completion/teardown
    the parent keeps its own workflow session untouched

## Workflow Start Cards
- In the new architecture, this capability remains outside workflow runtime, but workflow runtime passes the info needed to render a start card for each workflow.

## BMAD packaging/skill enablement
- This will be retired. It exists because of the current dependency on BMAD files. Once all necessary content lives in runtime code it will be redundant.

## Discovery/Activation
- resolveAvailableWorkflows.ts will be retired- this app will not support user-authored workflows, so does not need that registration and detection functionality.
- workflow-activation.ts will be retired- this file's functionality belongs in 2 places- task/index.ts detects the invocation method (slash command or useSkill), then sets activeWorkflowName, and the rest of this file's accountability belongs in the workflow runtime.
- The repo will need a canonical inventory of registered workflows.
- workflow-placeholders.ts will be retired- workflow placeholders only exist because the current runtime has to turn markdown file scripting into dynamic prompts at runtime. In the new architecture, workflow step instructions can be rendered in Typescript from real values in scope, meaning:
    placeholder substitution is no longer a first-class workflow runtime concern
    workflow modules can express dynamic instructions as normal code
    workflow config becomes typed data, not token replacement
    unresolved-placeholder failure modes disappear entirely
What remains of workflow-placeholder.ts' accountability (read config/state, compute needed value, project into prompt text or UI payload) is owned by the workflow runtime. 
