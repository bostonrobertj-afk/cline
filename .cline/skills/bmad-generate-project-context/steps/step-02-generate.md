# Step 2: Context Rules Generation

## META

- Goal: Turn discovery into lean, high-value implementation rules.
- Keep the content concise and optimized for LLM context.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Generate the project context rules category by category">
  <action>Use the discovery results from Step 1 to draft concise rules for the project context file.</action>
  <detail>
    The final context should keep only the rules that prevent implementation mistakes, with concise bullets under these headings:
    - Technology Stack & Versions
    - Language-Specific Rules
    - Framework-Specific Rules
    - Testing Rules
    - Code Quality & Style Rules
    - Development Workflow Rules
    - Critical Don't-Miss Rules
  </detail>

  <branch if="technology stack needs confirmation" optional="true">
    <output>Here is the discovered technology stack with exact versions.</output>
    <ask>Any critical version constraints or compatibility notes I should document?</ask>
  </branch>

  <branch if="language-specific rules are needed" optional="true">
    <output>Here are the language-specific patterns I found.</output>
    <ask>Are these patterns correct, and is there anything else agents should always follow?</ask>
  </branch>

  <branch if="framework-specific rules are needed" optional="true">
    <output>Here are the framework-specific patterns I found.</output>
    <ask>Should I add any other framework-specific rules?</ask>
  </branch>

  <branch if="testing rules are needed" optional="true">
    <output>Here are the testing rules I found.</output>
    <ask>Are there any testing rules agents should always follow?</ask>
  </branch>

  <branch if="code quality or workflow rules are needed" optional="true">
    <output>Here are the quality, style, and workflow rules I found.</output>
    <ask>Any additional rules or gotchas I should document?</ask>
  </branch>

  <detail>
    After each category, present the drafted content and offer the A/P/C menu again so the user can continue, revisit the rules, or request a different elicitation path.
  </detail>
</step>
