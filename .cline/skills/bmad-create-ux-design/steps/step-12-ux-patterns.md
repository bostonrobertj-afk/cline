# step 12 ux patterns

## META

- Goal: ux patterns
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Identify Pattern Categories">
  <action>Button hierarchy and actions</action>
  <action>Feedback patterns (success, error, warning, info)</action>
  <action>Form patterns and validation</action>
  <action>Navigation patterns</action>
  <action>Modal and overlay patterns</action>
</step>

<step n="2" goal="Define Critical Patterns First">
  <action>Visual hierarchy (primary vs. secondary actions)</action>
  <action>Feedback mechanisms</action>
  <action>Error recovery</action>
  <action>Accessibility requirements</action>
  <action>Mobile vs. desktop considerations</action>
</step>

<step n="3" goal="Establish Pattern Guidelines">
  <action>Document specific design decisions: Pattern Guidelines Template:</action>
</step>

<step n="4" goal="Design System Integration">
  <action>[Custom rule 1]</action>
  <action>[Custom rule 2]</action>
  <action>[Custom rule 3]&quot;</action>
  <ask>How do these patterns complement our design system components?</ask>
  <ask>What customizations are needed?</ask>
  <ask>How do we maintain consistency while meeting unique needs?</ask>
</step>

<step n="5" goal="Create Pattern Documentation">
  <action>Clear usage guidelines for each pattern</action>
  <action>Visual examples and specifications</action>
  <action>Implementation notes for developers</action>
  <action>Accessibility checklists</action>
  <action>Mobile-first considerations</action>
</step>

<step n="6" goal="Generate UX Patterns Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>These patterns ensure users have a consistent, predictable experience across all interactions.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated UX patterns content and present choices: &quot;I've established UX consistency patterns for .</output>
  <output>[A] Advanced Elicitation - Let's refine our UX patterns [P] Party Mode - Bring different perspectives on consistency patterns [C] Continue - Save this to the document and move to responsive design</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current UX patterns content</action>
  <action>Process the enhanced pattern insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current UX patterns</action>
  <action>Process the collaborative pattern insights that come back</action>
  <action>Load ./step-13-responsive-accessibility.md</action>
  <ask>Ask user: &quot;Accept these improvements to the UX patterns? (y/n)&quot;</ask>
  <ask>Ask user: &quot;Accept these changes to the UX patterns? (y/n)&quot;</ask>
  <output>If yes: Update content with improvements, then return to A/P/C menu</output>
  <output>If no: Keep original content, then return to A/P/C menu</output>
  <output>Append the final content to {planning_artifacts}/ux-design-specification.md</output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.

## REFERENCE

<prose>
## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER generate content without user input

- 📖 CRITICAL: ALWAYS read the complete step file before taking any action - partial understanding leads to incomplete decisions
- 🔄 CRITICAL: When loading next step with 'C', ensure the entire file is read and understood before proceeding
- ✅ ALWAYS treat this as collaborative discovery between UX facilitator and stakeholder
- 📋 YOU ARE A UX FACILITATOR, not a content generator
- 💬 FOCUS on establishing consistency patterns for common UX situations
- 🎯 COLLABORATIVE pattern definition, not assumption-based design
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- ✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis before taking any action
- ⚠️ Present A/P/C menu after generating UX patterns content
- 💾 ONLY save when user chooses C (Continue)
- 📖 Update output file frontmatter, adding this step to the end of the list of stepsCompleted.
- 🚫 FORBIDDEN to load next step until C is selected

## COLLABORATION MENUS (A/P/C):

This step will generate content and present choices:

- **A (Advanced Elicitation)**: Use discovery protocols to develop deeper pattern insights
- **P (Party Mode)**: Bring multiple perspectives to define UX patterns
- **C (Continue)**: Save the content to the document and proceed to next step

## PROTOCOL INTEGRATION:

- When 'A' selected: Invoke the `bmad-advanced-elicitation` skill
- When 'P' selected: Invoke the `bmad-party-mode` skill
- PROTOCOLS always return to this step's A/P/C menu
- User accepts/rejects protocol changes before proceeding

## CONTEXT BOUNDARIES:

- Current document and frontmatter from previous steps are available
- Component strategy from step 11 informs pattern decisions
- User journeys from step 10 identify common pattern needs
- Focus on consistency patterns for common UX situations

## YOUR TASK:

Establish UX consistency patterns for common situations like buttons, forms, navigation, and feedback.

## UX PATTERNS SEQUENCE:

### 1. Identify Pattern Categories

Determine which patterns need definition for your product:
"Let's establish consistency patterns for how {{project_name}} behaves in common situations.

**Pattern Categories to Define:**

- Button hierarchy and actions
- Feedback patterns (success, error, warning, info)
- Form patterns and validation
- Navigation patterns
- Modal and overlay patterns
- Empty states and loading states
- Search and filtering patterns

Which categories are most critical for your product? We can go through each thoroughly or focus on the most important ones."

### 2. Define Critical Patterns First

Focus on patterns most relevant to your product:

**For [Critical Pattern Category]:**
"**[Pattern Type] Patterns:**
What should users see/do when they need to [pattern action]?

**Considerations:**

- Visual hierarchy (primary vs. secondary actions)
- Feedback mechanisms
- Error recovery
- Accessibility requirements
- Mobile vs. desktop considerations

**Examples:**

- [Example 1 for this pattern type]
- [Example 2 for this pattern type]

How should {{project_name}} handle [pattern type] interactions?"

### 3. Establish Pattern Guidelines

Document specific design decisions:

**Pattern Guidelines Template:**

```markdown
### [Pattern Type]

**When to Use:** [Clear usage guidelines]
**Visual Design:** [How it should look]
**Behavior:** [How it should interact]
**Accessibility:** [A11y requirements]
**Mobile Considerations:** [Mobile-specific needs]
**Variants:** [Different states or styles if applicable]
```

### 4. Design System Integration

Ensure patterns work with chosen design system:
"**Integration with [Design System]:**

- How do these patterns complement our design system components?
- What customizations are needed?
- How do we maintain consistency while meeting unique needs?

**Custom Pattern Rules:**

- [Custom rule 1]
- [Custom rule 2]
- [Custom rule 3]"

### 5. Create Pattern Documentation

Generate comprehensive pattern library:

**Pattern Library Structure:**

- Clear usage guidelines for each pattern
- Visual examples and specifications
- Implementation notes for developers
- Accessibility checklists
- Mobile-first considerations

### 6. Generate UX Patterns Content

Prepare the content to append to the document:

#### Content Structure:

When saving to document, append these Level 2 and Level 3 sections:

```markdown
## UX Consistency Patterns

### Button Hierarchy

[Button hierarchy patterns based on conversation]

### Feedback Patterns

[Feedback patterns based on conversation]

### Form Patterns

[Form patterns based on conversation]

### Navigation Patterns

[Navigation patterns based on conversation]

### Additional Patterns

[Additional patterns based on conversation]
```

### 7. Present Content and Menu

Show the generated UX patterns content and present choices:
"I've established UX consistency patterns for {{project_name}}. These patterns ensure users have a consistent, predictable experience across all interactions.

**Here's what I'll add to the document:**

[Show the complete markdown content from step 6]

**What would you like to do?**
[A] Advanced Elicitation - Let's refine our UX patterns
[P] Party Mode - Bring different perspectives on consistency patterns
[C] Continue - Save this to the document and move to responsive design

### 8. Handle Menu Selection

#### If 'A' (Advanced Elicitation):

- Invoke the `bmad-advanced-elicitation` skill with the current UX patterns content
- Process the enhanced pattern insights that come back
- Ask user: "Accept these improvements to the UX patterns? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'P' (Party Mode):

- Invoke the `bmad-party-mode` skill with the current UX patterns
- Process the collaborative pattern insights that come back
- Ask user: "Accept these changes to the UX patterns? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'C' (Continue):

- Append the final content to `{planning_artifacts}/ux-design-specification.md`
- Update frontmatter: append step to end of stepsCompleted array
- Load `./step-13-responsive-accessibility.md`

## APPEND TO DOCUMENT:

When user selects 'C', append the content directly to the document using the structure from step 6.

## SUCCESS METRICS:

✅ Critical pattern categories identified and prioritized
✅ Consistency patterns clearly defined and documented
✅ Patterns integrated with chosen design system
✅ Accessibility considerations included for all patterns
✅ Mobile-first approach incorporated
✅ A/P/C menu presented and handled correctly
✅ Content properly appended to document when C selected

## FAILURE MODES:

❌ Not identifying the most critical pattern categories
❌ Patterns too generic or not actionable
❌ Missing accessibility considerations
❌ Patterns not aligned with design system
❌ Not considering mobile differences
❌ Not presenting A/P/C menu after content generation
❌ Appending content without user selecting 'C'

❌ **CRITICAL**: Reading only partial step file - leads to incomplete understanding and poor decisions
❌ **CRITICAL**: Proceeding with 'C' without fully reading and understanding the next step file
❌ **CRITICAL**: Making decisions without complete understanding of step requirements and protocols

## NEXT STEP:

After user selects 'C' and content is saved to document, load `./step-13-responsive-accessibility.md` to define responsive design and accessibility strategy.

Remember: Do NOT proceed to step-13 until user explicitly selects 'C' from the A/P/C menu and content is saved!
</prose>
