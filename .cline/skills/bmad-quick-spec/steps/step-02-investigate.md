---
wipFile: '{implementation_artifacts}/tech-spec-wip.md'
---

# Step 2: Map Technical Constraints & Anchor Points

## META

- Progress: Step 2 of 4
- Next: Generate Plan
- Focus on the codebase anchor points and constraints.
- Speak in the configured communication language.

## EXECUTION

<step n="1" goal="Load the current state">
  <action>Read `{wipFile}` and extract the Overview section plus any context gathered in Step 1.</action>
  <branch if="wip file is missing" optional="true">
    <output>The WIP file is missing. Return to Step 1 and initialize it first.</output>
    <exit />
  </branch>
</step>

<step n="2" goal="Perform the technical investigation">
  <ask>Are there other files or directories I should investigate deeply?</ask>
  <detail>Keep the prompt specific by naming the likely files, directories, or patterns that were already found.</detail>
  <branch if="user provides additional files or directories" optional="true">
    <action>Read the provided files completely and extract the relevant patterns, dependencies, and test files.</action>
  </branch>
  <branch if="no relevant code is found" optional="true">
    <action>Identify the target directory where the feature should live and the boilerplate or utilities that should be used.</action>
    <detail>Label this outcome as a confirmed clean slate when there is no legacy constraint to preserve.</detail>
  </branch>
  <action>Document the technical context the spec needs.</action>
  <detail>
    Capture tech stack, code patterns, files to modify or create, and test patterns.
  </detail>
  <branch if="project-context.md exists and was not already loaded" optional="true">
    <action>Load it now and extract any additional patterns or conventions that apply.</action>
  </branch>
</step>

<step n="3" goal="Update the WIP file with the investigation results">
  <action>Update the WIP frontmatter with `stepsCompleted: [1, 2]` and the captured stack, files, patterns, and test patterns.</action>
  <detail>
    Populate the Context for Development section with:
    - codebase patterns from the investigation
    - files reviewed and files to reference
    - technical decisions made during discovery
  </detail>
  <output>Context Gathered:</output>
  <detail>
    - Tech Stack: summarize the stack
    - Files to Modify: summarize the files identified
    - Patterns: summarize the code and workflow patterns
    - Tests: summarize the test patterns
  </detail>
</step>

<step n="4" goal="Present the checkpoint menu">
  <output>Display the checkpoint menu for Step 2.</output>
  <ask>Choose [A] Advanced Elicitation, [P] Party Mode, or [C] Continue to Generate Spec (Step 3 of 4).</ask>
  <branch if="user chooses A" optional="true">
    <action>Invoke the advanced elicitation flow on the current tech-spec content.</action>
    <detail>If the user accepts the improvements, update the WIP file and redisplay the menu.</detail>
  </branch>
  <branch if="user chooses P" optional="true">
    <action>Invoke the party mode flow on the current tech-spec content.</action>
    <detail>If the user accepts the changes, update the WIP file and redisplay the menu.</detail>
  </branch>
  <branch if="user chooses C" optional="true">
    <goto step="3" />
  </branch>
  <detail>If the user asks an unrelated question at the menu, answer briefly and redisplay the menu.</detail>
</step>
