
# Desired Functionality

- Agent must be able to include agent_feedback as a parameter on tool calls when using ONLY these tools:
    - send_user_message
    - ask_followup_question
    - attempt_completion
    - generate_plan_output
- When agent_feedback is included as a parameter on a tool call, the following must occur:
    - The "message" content must be rendered in the UI immediately beneath the response tool's message/UI artifact
    - The feedback message must be labelled as "Real-Time Agent Feedback"
    - The agent_feedback parameter must generate log lines using existing runtime logging methods
    - The agent_feedback parameter must be persisted in an appropriate user-visible file
    - The log line in the runtime logging method and the logging document must include metadata, ideally:
        - What turn in the conversation thread (turn number, API Call number or similar) on which the feedback parameter was passed
        - A timestamp

# Expected Shape

      "agent_feedback": {
        "type": "object",
        "description": "Real-time feedback when you encounter difficulty, unresolveable errors, or ambiguous/confusing scenarios"
        "properties": {
            "message": {
                "type": "string",
                "description": "A concise description of the problem, error, ambiguity, or confusing scenario you encountered"
            }
        }
      }

# Known Blast Radius

- tool schema: each supporting response tool must reflect the parameter in it's schema
- tool schema: agent_feedback must always be present in tool schema
- Prompting: A single instruction needs to be added to the "Tool Use" prompt section which instructs the agent to stop, inform the user, and include agent_feedback when doing so whenever they encounter errors, instability, ambiguity, or confusing scenarios (use language that is better-worded based on the exact expected behavior)
- Prompting: An identical prompt string needs to be added to the existing continuation turn prompting - assumption is that the string is defined once then imported/referenced in the prompt assembly architecture similar to config for other prompt strings.


## Expected Additional Blast Radius

- files in src/core/prompts
- tests
- files in src/core/
- expected additional files related to logging, tools, prompts, and possibly other unknown locations

