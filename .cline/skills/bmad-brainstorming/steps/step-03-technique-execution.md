# Step 3: Interactive Technique Execution and Facilitation

## META

- Goal: facilitate the selected brainstorming techniques through genuine interactive coaching, preserving divergence and creative momentum before converging.
- Execute this phase in order.
- Halt whenever a user response, confirmation, or routing choice is required.

## EXECUTION

<step n="1" goal="Initialize the current technique with a collaborative coaching frame">
  <output>
    Introduce the current technique as a collaborative exploration rather than a rigid script.
    <detail>
      Establish that:
      - the user and facilitator will build ideas together
      - one technique element will be explored at a time
      - the user can ask to stay with a promising thread instead of moving on
      - the user can say "next technique" or "move on" at any point
    </detail>
  </output>
  <output>Explain the current technique's focus, energy, and intended contribution to the broader brainstorming session.</output>
</step>

<step n="2" goal="Facilitate one technique element at a time through an iterative coaching loop">
  <action>
    Present one technique element or prompt at a time and respond to the user's input through genuine back-and-forth coaching.
    <detail>
      Treat this as a repeated facilitation loop, not a one-pass sequence:
      - introduce one technique element at a time
      - invite the user's first thoughts, reactions, or ideas
      - build on their response before deciding whether to stay with the thread, shift angles, or move on
      - return to this same loop for as many exchanges as needed within the current technique
    </detail>
    <detail>
      Coaching pattern:
      - if the user gives a basic response, ask a deeper follow-up and connect it to the session topic
      - if the user gives a rich response, build on it and push the idea further
      - if the user seems stuck, offer a gentle starting angle or provocative alternative
      - for structured techniques, focus on one perspective or component at a time
    </detail>
    <detail>
      Divergence and momentum rules:
      - default to continued exploration rather than early organization or conclusion
      - aim for 100+ ideas before moving to organization whenever the session supports it
      - every 10 ideas, pivot into a distinctly different creative domain to avoid semantic clustering
      - before offering to conclude, consider whether the session still has untapped novelty
      - spend substantial time in active ideation before suggesting convergence
    </detail>
    <detail>
      Documentation guidance:
      - capture important ideas, patterns, and breakthroughs as they emerge
      - summarize discovered ideas when it helps sustain momentum or preserve a promising thread
      - ask whether to document the current ideas now or keep the creative momentum going before documenting
      - when capturing ideas, use this format:
        - `**[Category #X]**: [Mnemonic Title]`
        - `_Concept_: [2-3 sentence description]`
        - `_Novelty_: [What makes this different from obvious solutions]`
    </detail>
  </action>
  <ask>
    Periodically ask what the user wants to do next after a meaningful stretch of exploration.
    <detail>
      Options:
      - `[K]` Keep exploring this technique
      - `[T]` Try a different technique
      - `[A]` Go deeper on a specific idea via advanced elicitation
      - `[B]` Take a quick break and resume later
      - `[C]` Move to idea organization
    </detail>
    <detail>
      Unless the user clearly wants to conclude, recommend continued exploration rather than early organization.
    </detail>
  </ask>
  <output>
    When useful, summarize what the current technique or exploration thread has produced, including major insights, surprises, and how it serves the session goals.
  </output>
</step>

<step n="3" goal="Handle the user's continuation choice and update the session state">
  <branch if="user selects `[K]`">
    <action>Continue exploring the current technique without resetting the broader session context.</action>
    <goto step="2" />
  </branch>
  <branch if="user selects `[T]`">
    <action>Transition to the next selected technique and frame it as a fresh angle on the same session topic.</action>
    <goto step="1" />
  </branch>
  <branch if="user selects `[A]`">
    <handoff path="skill:bmad-advanced-elicitation" />
  </branch>
  <branch if="user selects `[B]`">
    <action>Pause the session cleanly, preserving current progress so the user can resume later.</action>
    <exit />
  </branch>
  <branch if="user selects `[C]`">
    <action>Update frontmatter with `stepsCompleted: [1, 2, 3]`, completed techniques, idea counts, and facilitation notes.</action>
    <action>Append the technique execution results and collaboration narrative to `{brainstorming_session_output_file}`.</action>
    <handoff path="./step-04-idea-organization.md" />
  </branch>
</step>

## CHECKPOINT

Halt for the user's continuation choice before moving to another technique, advanced elicitation, pause, or idea organization.

## ADVISORY

- This phase should feel like genuine creative coaching, not a scripted questionnaire.
- Follow the user's energy and interests while still protecting divergence and novelty.
- Document both the ideas produced and the key facilitation insights that shaped them.
