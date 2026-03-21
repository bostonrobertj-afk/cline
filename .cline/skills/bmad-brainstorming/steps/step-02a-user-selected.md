# Step 2a: User-Selected Techniques

## META

- Goal: let the user browse the brainstorming technique library and choose techniques directly.
- Execute this phase in order.
- Halt whenever a user response, confirmation, or routing choice is required.

## EXECUTION

<step n="1" goal="Load the brainstorming technique library for browsing">
  <action>Read `../brain-methods.csv` on demand.</action>
  <action>Parse the technique library by category, technique name, description, facilitation prompts, best-for guidance, energy level, and typical duration.</action>
  <output>Explain that the full brainstorming technique library is now available for browsing.</output>
</step>

<step n="2" goal="Present technique categories and capture the user's browsing direction">
  <output>
    Show the major brainstorming technique categories with concise descriptions and representative examples.
    <detail>
      Present categories such as:
      - Structured Thinking
      - Creative Innovation
      - Collaborative Methods
      - Deep Analysis
      - Theatrical Exploration
      - Wild Thinking
      - Introspective Delight
    </detail>
  </output>
  <ask>Ask which category the user wants to explore, or what style of thinking they feel drawn to.</ask>
</step>

<step n="3" goal="Present techniques from the chosen category and support exploration">
  <action>
    Show 3-5 techniques from the selected category.
    <detail>
      For each technique, include:
      - technique name
      - duration
      - energy level
      - brief description
      - what it is best for
      - an example facilitation prompt
    </detail>
  </action>
  <ask>Ask which techniques appeal to the user, whether they want more details, whether they want to browse another category, or whether they want to go back to approach selection.</ask>
  <branch if="user asks for more details about a technique">
    <output>Provide deeper detail for the requested technique and then re-present the selection options.</output>
  </branch>
  <branch if="user asks to browse another category">
    <goto step="2" />
  </branch>
  <branch if="user asks to return to approach selection">
    <handoff path="./step-01-session-setup.md" />
  </branch>
</step>

<step n="4" goal="Confirm the selected techniques and persist the choice">
  <output>Summarize the selected techniques and explain how they fit the user's session goals.</output>
  <ask>
    Ask the user to confirm the selected techniques or request changes.
    <detail>
      Confirmation options:
      - `[C]` Continue with the selected techniques
      - `[Back]` Modify the selection
    </detail>
  </ask>
  <branch if="user confirms the selection">
    <action>Update frontmatter with `selected_approach: 'user-selected'`, `techniques_used`, and `stepsCompleted: [1, 2]`.</action>
    <action>Append a technique-selection section to `{brainstorming_session_output_file}` that records the chosen techniques and the selection rationale.</action>
    <handoff path="./step-03-technique-execution.md" />
  </branch>
  <branch if="user wants to modify the selection">
    <goto step="3" />
  </branch>
</step>

## CHECKPOINT

Halt for category selection and final technique confirmation before advancing.

## ADVISORY

- Present techniques neutrally without steering or recommending.
- Load CSV data only when it is needed for category or technique presentation.
- Respect the user's autonomy in technique selection.
