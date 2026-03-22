# Step 3: Interactive Technique Execution and Facilitation

## META

- Goal: Facilitate the selected technique or techniques through interactive coaching and idea capture.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load the selected technique context">
  <detail>Use the selected techniques from frontmatter and the session topic from step 1.</detail>
  <detail>Keep the coaching tone collaborative and responsive rather than scripted.</detail>
</step>

<step n="2" goal="Start the current technique">
  <output>Let’s begin with the current technique and explore ideas together.</output>
  <detail>Introduce one technique element at a time and keep the user in control of the pace.</detail>
  <ask>What immediately comes to mind for this starting prompt?</ask>
</step>

<step n="3" goal="Respond to user ideas and deepen the exploration">
  <branch if="the user gives a short response">
    <detail>Ask a focused follow-up question that expands the idea without changing the current technique.</detail>
  </branch>
  <branch if="the user gives a detailed response" optional="true">
    <detail>Reflect the strongest insight, build on it, and explore one new angle.</detail>
  </branch>
  <branch if="the user seems stuck" optional="true">
    <detail>Offer a gentle starting angle and keep the user moving.</detail>
  </branch>
  <branch if="the user says next technique or move on" optional="true">
    <detail>Capture the partial progress and hand off to the next selected technique.</detail>
  </branch>
</step>

<step n="4" goal="Check whether to continue the current technique">
  <ask>Would you like to keep exploring this technique, or move to the next one?</ask>
  <branch if="the user wants to continue" optional="true">
    <detail>Continue the same technique and keep capturing ideas.</detail>
  </branch>
  <branch if="the user wants to move on" optional="true">
    <detail>Record the key ideas, update frontmatter, and transition to the next technique.</detail>
  </branch>
</step>

<step n="5" goal="Capture ideas in the session document">
  <detail>Record each idea using the session’s idea format, preserving the user's wording where useful.</detail>
  <detail>Update `ideas_generated` and `techniques_used` as the session progresses.</detail>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
