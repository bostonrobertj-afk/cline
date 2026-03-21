# Step 2c: Random Technique Selection

## META

- Goal: create a surprising but workable brainstorming technique combination through random selection.
- Execute this phase in order.
- Halt whenever a user response, confirmation, or routing choice is required.

## EXECUTION

<step n="1" goal="Load the technique library and build excitement for serendipitous discovery">
  <action>Read `../brain-methods.csv` on demand.</action>
  <output>
    Explain the value of random technique selection as a way to break out of predictable thinking patterns.
    <detail>
      Emphasize that random selection can:
      - surface techniques the user would not normally choose
      - break creative ruts
      - create unexpected combinations and breakthrough thinking
    </detail>
  </output>
</step>

<step n="2" goal="Randomly assemble a compatible brainstorming sequence">
  <action>
    Randomly select a short technique sequence from the library.
    <detail>
      Use random selection with light compatibility checks:
      - prefer variety across categories
      - avoid obviously contradictory combinations
      - keep time and energy demands reasonably workable together
    </detail>
  </action>
  <output>Reveal the selected techniques with enthusiasm and explain why the combination is creatively interesting.</output>
</step>

<step n="3" goal="Present the random combination and get user response">
  <output>Highlight the creative potential and unexpected synergy of the random technique combination.</output>
  <ask>
    Ask whether the user wants to continue with this combination, shuffle for a different one, request more detail, or return to approach selection.
    <detail>
      Options:
      - `[C]` Continue with this random combination
      - `[Shuffle]` generate a different random combination
      - `[Details]` hear more about a selected technique
      - `[Back]` return to approach selection
    </detail>
  </ask>
  <branch if="user selects `[Shuffle]`">
    <goto step="2" />
  </branch>
  <branch if="user selects `[Details]`">
    <output>Provide the requested detail and then re-present the same response options.</output>
  </branch>
  <branch if="user selects `[Back]`">
    <handoff path="./step-01-session-setup.md" />
  </branch>
</step>

<step n="4" goal="Persist the confirmed random selection and route to execution">
  <branch if="user confirms the random selection">
    <action>Update frontmatter with `selected_approach: 'random-selection'`, `techniques_used`, and `stepsCompleted: [1, 2]`.</action>
    <action>Append a technique-selection section to `{brainstorming_session_output_file}` that records the random combination and the discovery rationale.</action>
    <handoff path="./step-03-technique-execution.md" />
  </branch>
</step>

## CHECKPOINT

Halt for user confirmation before advancing to technique execution.

## ADVISORY

- Keep the sense of surprise and creative adventure high.
- Do not second-guess the random process into a hidden recommendation flow.
- Allow reshuffling without making the user feel they chose incorrectly.
