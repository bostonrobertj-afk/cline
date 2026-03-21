# Step 2d: Progressive Technique Flow

## META

- Goal: design a phased brainstorming journey that moves from divergent exploration toward actionable outcomes.
- Execute this phase in order.
- Halt whenever a user response, confirmation, or routing choice is required.

## EXECUTION

<step n="1" goal="Load the technique library and design a phase-by-phase creative journey">
  <action>Read `../brain-methods.csv` on demand.</action>
  <action>Map techniques to four creative phases: expansive exploration, pattern recognition, idea development, and action planning.</action>
  <output>
    Explain the value of a progressive technique flow as a structured creative journey.
    <detail>
      The journey should move from:
      - broad idea generation
      - to theme and pattern recognition
      - to concept development
      - to implementation planning
    </detail>
  </output>
</step>

<step n="2" goal="Present the full journey map with rationale for each phase">
  <output>
    Show the full progressive journey map, including the selected technique for each phase, the goal of that phase, the energy profile, and the expected transition between phases.
    <detail>
      Include:
      - total estimated time
      - the primary session focus
      - why each phase fits its role in the overall creative journey
      - the benefits of systematic progression from divergence to convergence
    </detail>
  </output>
  <ask>Ask whether the user wants to continue with the journey, customize one or more phases, request more detail, or return to approach selection.</ask>
</step>

<step n="3" goal="Handle journey customization when requested">
  <branch if="user wants to customize the journey">
    <output>
      Offer phase-specific customization options and timing adjustments.
      <detail>
        Allow changes such as:
        - swapping a technique in one phase
        - compressing the journey for speed
        - extending the journey with an extra phase or bonus technique
        - emphasizing one phase more heavily based on the user's goals
      </detail>
    </output>
    <ask>Ask which phase or journey property the user wants to modify.</ask>
  </branch>
  <branch if="user asks for more detail instead of changing the journey">
    <output>Provide the requested explanation for the relevant phase or technique, then re-present the decision options.</output>
  </branch>
  <branch if="user chooses to return to approach selection">
    <handoff path="./step-01-session-setup.md" />
  </branch>
</step>

<step n="4" goal="Persist the confirmed progressive flow and route to execution">
  <branch if="user confirms the progressive journey">
    <action>Update frontmatter with `selected_approach: 'progressive-flow'`, `techniques_used`, and `stepsCompleted: [1, 2]`.</action>
    <action>Append a technique-selection section to `{brainstorming_session_output_file}` that records the progressive phases and the journey rationale.</action>
    <handoff path="./step-03-technique-execution.md" />
  </branch>
  <branch if="user requests another round of customization before confirming">
    <goto step="3" />
  </branch>
</step>

## CHECKPOINT

Halt for journey confirmation before advancing to technique execution.

## ADVISORY

- Preserve the logic of moving from broad exploration toward structured action.
- Keep the journey flexible enough to reflect the user's goals and energy.
- Do not skip directly to later phases without establishing an initial exploration foundation.
