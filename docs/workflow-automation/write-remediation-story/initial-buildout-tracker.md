# Workflow Source Document
/Users/robertboston/Documents/Cline/Workflows/write-remediation-story.md

# Necessary Buildout Steps
- [x] Configure deterministic progress gates
- [ ] Configure workflow start form to build review_input from story_path using same tool used in code-review
    - [x] update build_review_input so it resolves story_path from stored variables at runtime, and update code-review as needed
- [x] Add workflow entry in contextualtoolmatrix
- [x] Ensure that the workflow has an assigned agent persona


Yes. The best fit is to reuse the existing `AGENT_ROLE_SECTION` injection seam, not the BMAD agent system.

Why this is the right seam:
- Full-prompt assembly already flows through [`SystemPromptContext`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/types.ts) into the prompt registry.
- [`PromptRegistry.get(...)`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/PromptRegistry.ts#L91) bypasses normal component assembly on continuation turns, so anything injected through `AGENT_ROLE_SECTION` naturally becomes full-prompt-only.
- [`getAgentRoleSection(...)`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts#L11) already supports context-driven top-of-prompt replacement via `activeAgentRoleInstructions`.

My recommendation:
1. Add a prompt-owned workflow persona registry, e.g. `src/core/prompts/system-prompt/registry/workflowPersonaRegistry.ts`
2. Map workflow filename -> inline persona block text there
3. Extend `SystemPromptContext` with something like:
   - `activeWorkflowPersonaInstructions?: string`
4. In [`index.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/index.ts#L3499), when a full prompt is being assembled and `activePlaceholderWorkflowName` is present, resolve that registry and set the new field
5. Update [`agent_role.ts`](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/agent_role.ts#L11) to prefer `activeWorkflowPersonaInstructions` before the generic default

Why not reuse `activeAgentId`:
- it brings BMAD side effects you said you don’t want: skill filtering, agent-mode semantics, reminders, exit behavior

So the clean architecture is:
workflow active -> prompt context gets persona text -> `AGENT_ROLE_SECTION` renders it on full-prompt turns only.