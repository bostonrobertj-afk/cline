# Step 2b: AI-Recommended Techniques

## META

- Goal: analyze the session context and recommend a tailored brainstorming technique sequence.
- Execute this phase in order.
- Halt whenever a user response, confirmation, or routing choice is required.

## EXECUTION

<step n="1" goal="Load the technique library and analyze the session context">
  <action>Read `../brain-methods.csv` on demand.</action>
  <action>
    Analyze the session topic, goals, constraints, tone, complexity, and likely session duration.
    <detail>
      Match the context across:
      - goal type
      - complexity level
      - energy and tone
      - time available
    </detail>
  </action>
  <output>Explain that the recommendation will be based on the user's specific session context rather than a generic technique list.</output>
</step>

<step n="2" goal="Generate a tailored recommended technique sequence">
  <action>
    Recommend a short sequence of techniques that fit the user's goals and constraints.
    <detail>
      The recommendation should explain:
      - why each technique fits the session
      - how the sequence builds from one technique to the next
      - the expected outcomes of the full sequence
      - total estimated time
    </detail>
  </action>
  <output>Present the recommendation as a clear session plan with rationale for each technique.</output>
</step>

<step n="3" goal="Explain the recommendations and get user confirmation">
  <output>Provide deeper explanations for each recommended technique, including what the user can expect during facilitation.</output>
  <ask>
    Ask whether the user wants to continue with the recommended sequence, modify it, request more detail, or return to approach selection.
    <detail>
      Options:
      - `[C]` Continue with the recommended techniques
      - `[Modify]` adjust the technique selection or sequence
      - `[Details]` hear more about a specific technique
      - `[Back]` return to approach selection
    </detail>
  </ask>
  <branch if="user asks for more detail or adjustments">
    <output>Provide the requested detail or revised recommendation and then re-present the confirmation options.</output>
  </branch>
  <branch if="user chooses to return to approach selection">
    <handoff path="./step-01-session-setup.md" />
  </branch>
</step>

<step n="4" goal="Persist the confirmed recommendation and route to execution">
  <branch if="user confirms the recommendation">
    <action>Update frontmatter with `selected_approach: 'ai-recommended'`, `techniques_used`, and `stepsCompleted: [1, 2]`.</action>
    <action>Append a technique-selection section to `{brainstorming_session_output_file}` that records the recommendation context, chosen techniques, and AI rationale.</action>
    <handoff path="./step-03-technique-execution.md" />
  </branch>
  <branch if="user wants further changes instead of confirming">
    <goto step="3" />
  </branch>
</step>

## CHECKPOINT

Halt for user confirmation before advancing to technique execution.

## ADVISORY

- Provide clear rationale that ties each recommendation to the user's actual goals.
- Allow the user to question, modify, or reject the recommendation.
- Avoid generic recommendations that are not grounded in the session context.
