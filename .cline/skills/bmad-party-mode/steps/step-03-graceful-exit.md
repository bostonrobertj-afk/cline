# Step 3: Graceful Exit and Party Mode Conclusion

## META

- Goal: Conclude party mode with a satisfying farewell, summarize the session, and exit cleanly.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Acknowledge the conclusion of the party mode session">
  <output>Thank {user_name} for participating in the multi-agent discussion.</output>
  <output>Acknowledge that the session is wrapping up and prepare the user for a short farewell sequence.</output>
  <detail>
    - Keep the tone warm, positive, and collaborative.
    - Preserve party mode's sense of energy without dragging out the exit.
  </detail>
</step>

<step n="2" goal="Generate representative agent farewells">
  <action>Select 2-3 agents who were especially relevant to the discussion or who provide a representative mix of perspectives.</action>
  <output>Present short, in-character farewell messages from the selected agents.</output>
  <detail>
    - Farewells should reflect each agent's communication style and expertise.
    - Reference session highlights when doing so feels natural.
    - Keep the farewell set memorable but concise.
  </detail>
</step>

<step n="3" goal="Summarize the session and close the workflow">
  <output>Summarize the main topic, the value of the multi-agent discussion, and any especially useful perspectives or outcomes from the session.</output>
  <output>Close party mode with an encouraging final message.</output>
  <branch if="party mode was invoked from a parent workflow" optional="true">
    <return />
  </branch>
  <branch if="party mode was running as a standalone session" optional="true">
    <exit />
  </branch>
</step>

## CHECKPOINT

Halt only if the workflow cannot determine whether to return to a parent workflow or exit the standalone party mode session.
