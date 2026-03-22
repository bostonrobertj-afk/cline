# Step 2a: User-Selected Techniques

## META

- Goal: Let the user browse the technique library and choose one or more techniques directly.
- Execute the current phase in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use structured execution tags only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load the technique library">
  <action>Load `../brain-methods.csv` on demand.</action>
  <detail>Parse the category, technique name, description, prompts, best-for guidance, energy level, and typical duration.</detail>
</step>

<step n="2" goal="Present technique categories">
  <ask>Which technique category interests you most: 1 through 7, or something more specific?</ask>
  <branch if="the user chooses 1" optional="true">
    <detail>Show the structured-thinking techniques with brief summaries and examples.</detail>
  </branch>
  <branch if="the user chooses 2" optional="true">
    <detail>Show the creative-innovation techniques with brief summaries and examples.</detail>
  </branch>
  <branch if="the user chooses 3" optional="true">
    <detail>Show the collaborative-methods techniques with brief summaries and examples.</detail>
  </branch>
  <branch if="the user chooses 4" optional="true">
    <detail>Show the deep-analysis techniques with brief summaries and examples.</detail>
  </branch>
  <branch if="the user chooses 5" optional="true">
    <detail>Show the theatrical-exploration techniques with brief summaries and examples.</detail>
  </branch>
  <branch if="the user chooses 6" optional="true">
    <detail>Show the wild-thinking techniques with brief summaries and examples.</detail>
  </branch>
  <branch if="the user chooses 7" optional="true">
    <detail>Show the introspective-delight techniques with brief summaries and examples.</detail>
  </branch>
</step>

<step n="3" goal="Let the user select techniques">
  <ask>Which techniques do you want to use? You can choose by number or name, ask for details, browse another category, or go back.</ask>
  <branch if="the user asks for details" optional="true">
    <detail>Provide more information about the named technique and keep the user in control of the selection.</detail>
  </branch>
  <branch if="the user asks to browse another category" optional="true">
    <detail>Return to the category list without changing session state.</detail>
  </branch>
  <branch if="the user selects Back" optional="true">
    <handoff path="./step-01-session-setup.md">Return to approach selection.</handoff>
  </branch>
</step>

<step n="4" goal="Confirm the selected techniques">
  <ask>Confirm these choices, or would you like to modify them?</ask>
  <branch if="the user confirms">
    <action>Update frontmatter with `selected_approach: 'user-selected'`, the chosen techniques, and `stepsCompleted: [1, 2]`.</action>
    <handoff path="./step-03-technique-execution.md">Begin technique execution.</handoff>
  </branch>
  <branch if="the user wants to modify the selection" optional="true">
    <detail>Return to the relevant category or technique list and keep the discussion open.</detail>
  </branch>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.
