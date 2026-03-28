# Questions

What is access_mcp_resource

# Requirements
- "Indxr-Aware Exploration" should not be injected into the prompt if no Indxr tools are in the turn's tool schema. If there are Indxr tools in the tool schema, only the Indxr tools present in the tool schema should be called out in the prompt. Do not list Indxr tools that are not in the tool schema for that turn in this prompt section.
- send_user_message does not have task_progress in it's schema, causing agents to think they cannot include it with that tool, which directly contradicts prompting that tells agents to send task_progress as a parameter on send_user_message
- ~/Documents/Cline Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts is still not aligned with workflow scripting and is missing tools that the workflow prompts drive them to use. workflow source documents are here: /Users/robertboston/Documents/Cline/Workflows/
- this section needs cleanup:
        RESPONSE TOOLS
    Use these tools to respond to the user. A reply reaches the human user only when you use the appropriate response tool.

    attempt_completion: Use once at the end of each workflow
    send_user_message: Use by default to send messages to the user
    ask_followup_question: Use to ask a question + present options for user to select
    generate_plan_output: Use to present a structured plan
    In ACT MODE, respond using these: attempt_completion, ask_followup_question and send_user_message. In PLAN MODE, respond using these: generate_plan_output, ask_followup_question and send_user_message.

    When a step sets a placeholder value, use set_workflow_placeholders.

    - The "In ACT MODE... In PLAN MODE" line should be redudant, assuming the list above is filtered based on the current mode. 
    - Need to ensure that this is deterministically tied to which response tools are present in the schema that turn- even if that means that they're sharing some filtering/logic source.
    - The "When a step sets a placeholder value..." line is not necessary- placeholder workflow scripting reminds the agent of this tool whenever it should be used.
