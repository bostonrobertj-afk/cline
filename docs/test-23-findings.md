Explain this logging:

ERROR Search failed in /Users/robertboston/Library/Mobile Documents/com~apple~CloudDocs/Documents/DungeoniQ-Campaign/Users/robertboston/Library/Mobile Documents/com~apple~CloudDocs/Documents/DungeoniQ-Campaign:
INFO [WorkflowPlaceholders] unresolved placeholder tokens remain after rendering review-edge-case-hunter.md: {"location":"N/A","trigger_condition":"Input empty or undecodable","guard_snippet":"Provide valid content to review","potential_consequence":"Review skipped- no analysis performed"}, {
  "location": "file:start-end (or file:line when single line, or file:hunk when exact line unavailable)",
  "trigger_condition": "one-line description (max 15 words)",
  "guard_snippet": "minimal code sketch that closes the gap (single-line escaped string, no raw newlines or unescaped quotes)",
  "potential_consequence": "what could actually go wrong (max 15 words)"

- Continuation turn prompting STILL has task_progress verbiage for deterministic progress workflows: 
- When the active step's "Done Signal" is true, use send_user_message tool call to briefly tell the user what step you are completing, and include task_progress with __COMPLETE_NEXT_STEP__. Use it only once in that assistant turn.

- This part also does not make sense within the context of a workflow supported by deterministic progression:
Reminder: Detailed instructions are shown for the first incomplete checklist item. Keep task_progress moving so the active step and its details stay in sync.


- Subagent threads are still injecting context as input each turn- they should be on the Responses API and behaving the same as the main agent thread does.

- What was vague or confusing: the output_folder placeholder was not consistently resolved, so file paths were unclear (_bmad-output vs {output_folder}), and build_review_diff_output required a source object that was not obvious from the initial instructions. 


# Need to Remediate:

## Item 1:
The legacy task_progress prompt text can still leak for deterministic workflows because the deterministic flag is derived from “current step details resolved successfully” rather than from the active workflow identity itself. In both the main thread and subagent thread, prompt assembly does:

resolve activePlaceholderWorkflowPromptContext
then compute activeDeterministicPlaceholderWorkflowEnabled from activePlaceholderWorkflowPromptContext.activePlaceholderWorkflowName
That happens in task/index.ts (line 2810) and SubagentRunner.ts (line 955). If step-detail resolution returns no name for any reason, the deterministic flag falls back to false even though the active workflow is still code-review.md or dev-story.md. Once that happens:
continuation_turn.ts (line 17) emits the old send_user_message + task_progress instruction
focus-chain/index.ts (line 253) can fall back to the generic “Keep task_progress moving” reminder when workflow-step details are not resolved

Fix for above- the prompt changes for workflows supported by deterministic focus chain progression need a stable gate, not one that is brittle like the current "current step details resolved successfully" gate. This applies to both agents and subagents. 

## Item 2: 
Need to move these out of input and into system instructions for primary agents:
    - environment_details block
    - focus chain block
    - focus chain "current step" block
The only thing in "input" should be the user's message.

Main task:
environment_details
auto-compact summarizeTask(...)
placeholder-workflow activation instructions
focus-chain block
focus-chain current-step details block
Subagents:
workspace metadata block in the initial user message
non-Responses placeholder-workflow activation
non-Responses focus-chain/current-step guidance