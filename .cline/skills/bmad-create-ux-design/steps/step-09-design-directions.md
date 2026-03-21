# step 09 design directions

## META

- Goal: design directions
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Generate Design Direction Variations">
  <action>Different layout approaches and information hierarchy</action>
  <action>Various interaction patterns and visual weights</action>
  <action>Alternative color applications from our foundation</action>
  <action>Different density and spacing approaches</action>
  <action>Various navigation and component arrangements</action>
</step>

<step n="2" goal="Create HTML Design Direction Showcase">
  <action>6-8 full-screen mockup variations</action>
  <action>Interactive states and hover effects</action>
  <action>Side-by-side comparison tools</action>
  <action>Complete UI examples with real content</action>
  <action>Responsive behavior demonstrations</action>
</step>

<step n="3" goal="Present Design Exploration Framework">
  <action>Take your time exploring - this is a crucial decision that will guide all our design work!&quot;</action>
  <ask>Guide evaluation criteria: &quot;As you explore the design directions, look for: ✅ Layout Intuitiveness - Which information hierarchy matches your priorities?</ask>
  <ask>✅ Interaction Style - Which interaction style fits your core experience?</ask>
  <ask>✅ Visual Weight - Which visual density feels right for your brand?</ask>
</step>

<step n="4" goal="Facilitate Design Direction Selection">
  <action>Pick a favorite direction as-is</action>
  <action>Combine elements from multiple directions</action>
  <action>Request modifications to any direction</action>
  <action>Use one direction as a base and iterate</action>
  <ask>Which layout feels most intuitive for your users?</ask>
  <ask>Which visual weight matches your brand personality?</ask>
  <ask>Which interaction style supports your core experience?</ask>
</step>

<step n="5" goal="Document Design Direction Decision">
  <action>Capture the chosen approach: &quot;Based on your exploration, I'm understanding your design direction preference: Chosen Direction: [Direction number or combination] Key Elements: [Specific elements you liked] Modifications Needed: [Any changes requested] Rationale: [Why this direction works for your product] This will become our design foundation moving forward.</action>
  <ask>Are we ready to lock this in, or do you want to explore variations?&quot;</ask>
</step>

<step n="6" goal="Generate Design Direction Content">
  <output>Prepare the content to append to the document: #### Content Structure: When saving to document, append these Level 2 and Level 3 sections:</output>
</step>

<step n="7" goal="Present Content and Menu">
  <action>This visual approach will guide all our detailed design work.</action>
  <ask>Here's what I'll add to the document: [Show the complete markdown content from step 6] What would you like to do?</ask>
  <output>Show the generated design direction content and present choices: &quot;I've documented our design direction decision for .</output>
  <output>[A] Advanced Elicitation - Let's refine our design direction [P] Party Mode - Bring different perspectives on visual choices [C] Continue - Save this to the document and move to user journey flows</output>
</step>

<step n="8" goal="Handle Menu Selection">
  <action>Invoke the bmad-advanced-elicitation skill with the current design direction content</action>
  <action>Process the enhanced design insights that come back</action>
  <action>Invoke the bmad-party-mode skill with the current design direction</action>
  <action>Process the collaborative design insights that come back</action>
  <action>Load ./step-10-user-journeys.md</action>
  <ask>Ask user: &quot;Accept these improvements to the design direction? (y/n)&quot;</ask>
  <ask>Ask user: &quot;Accept these changes to the design direction? (y/n)&quot;</ask>
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
- 💬 FOCUS on generating and evaluating design direction variations
- 🎯 COLLABORATIVE exploration, not assumption-based design
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- ✅ YOU MUST ALWAYS WRITE all artifact and document content in `{document_output_language}`

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis before taking any action
- ⚠️ Present A/P/C menu after generating design direction content
- 💾 Generate HTML visualizer for design directions
- 📖 Update output file frontmatter, adding this step to the end of the list of stepsCompleted.
- 🚫 FORBIDDEN to load next step until C is selected

## COLLABORATION MENUS (A/P/C):

This step will generate content and present choices:

- **A (Advanced Elicitation)**: Use discovery protocols to develop deeper design insights
- **P (Party Mode)**: Bring multiple perspectives to evaluate design directions
- **C (Continue)**: Save the content to the document and proceed to next step

## PROTOCOL INTEGRATION:

- When 'A' selected: Invoke the `bmad-advanced-elicitation` skill
- When 'P' selected: Invoke the `bmad-party-mode` skill
- PROTOCOLS always return to this step's A/P/C menu
- User accepts/rejects protocol changes before proceeding

## CONTEXT BOUNDARIES:

- Current document and frontmatter from previous steps are available
- Visual foundation from step 8 provides design tokens
- Core experience from step 7 informs layout and interaction design
- Focus on exploring different visual design directions

## YOUR TASK:

Generate comprehensive design direction mockups showing different visual approaches for the product.

## DESIGN DIRECTIONS SEQUENCE:

### 1. Generate Design Direction Variations

Create diverse visual explorations:
"I'll generate 6-8 different design direction variations exploring:

- Different layout approaches and information hierarchy
- Various interaction patterns and visual weights
- Alternative color applications from our foundation
- Different density and spacing approaches
- Various navigation and component arrangements

Each mockup will show a complete vision for {{project_name}} with all our design decisions applied."

### 2. Create HTML Design Direction Showcase

Generate interactive visual exploration:
"🎨 Design Direction Mockups Generated!

I'm creating a comprehensive HTML design direction showcase at `{planning_artifacts}/ux-design-directions.html`

**What you'll see:**

- 6-8 full-screen mockup variations
- Interactive states and hover effects
- Side-by-side comparison tools
- Complete UI examples with real content
- Responsive behavior demonstrations

Each mockup represents a complete visual direction for your app's look and feel."

### 3. Present Design Exploration Framework

Guide evaluation criteria:
"As you explore the design directions, look for:

✅ **Layout Intuitiveness** - Which information hierarchy matches your priorities?
✅ **Interaction Style** - Which interaction style fits your core experience?
✅ **Visual Weight** - Which visual density feels right for your brand?
✅ **Navigation Approach** - Which navigation pattern matches user expectations?
✅ **Component Usage** - How well do the components support your user journeys?
✅ **Brand Alignment** - Which direction best supports your emotional goals?

Take your time exploring - this is a crucial decision that will guide all our design work!"

### 4. Facilitate Design Direction Selection

Help user choose or combine elements:
"After exploring all the design directions:

**Which approach resonates most with you?**

- Pick a favorite direction as-is
- Combine elements from multiple directions
- Request modifications to any direction
- Use one direction as a base and iterate

**Tell me:**

- Which layout feels most intuitive for your users?
- Which visual weight matches your brand personality?
- Which interaction style supports your core experience?
- Are there elements from different directions you'd like to combine?"

### 5. Document Design Direction Decision

Capture the chosen approach:
"Based on your exploration, I'm understanding your design direction preference:

**Chosen Direction:** [Direction number or combination]
**Key Elements:** [Specific elements you liked]
**Modifications Needed:** [Any changes requested]
**Rationale:** [Why this direction works for your product]

This will become our design foundation moving forward. Are we ready to lock this in, or do you want to explore variations?"

### 6. Generate Design Direction Content

Prepare the content to append to the document:

#### Content Structure:

When saving to document, append these Level 2 and Level 3 sections:

```markdown
## Design Direction Decision

### Design Directions Explored

[Summary of design directions explored based on conversation]

### Chosen Direction

[Chosen design direction based on conversation]

### Design Rationale

[Rationale for design direction choice based on conversation]

### Implementation Approach

[Implementation approach based on chosen direction]
```

### 7. Present Content and Menu

Show the generated design direction content and present choices:
"I've documented our design direction decision for {{project_name}}. This visual approach will guide all our detailed design work.

**Here's what I'll add to the document:**

[Show the complete markdown content from step 6]

**What would you like to do?**
[A] Advanced Elicitation - Let's refine our design direction
[P] Party Mode - Bring different perspectives on visual choices
[C] Continue - Save this to the document and move to user journey flows

### 8. Handle Menu Selection

#### If 'A' (Advanced Elicitation):

- Invoke the `bmad-advanced-elicitation` skill with the current design direction content
- Process the enhanced design insights that come back
- Ask user: "Accept these improvements to the design direction? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'P' (Party Mode):

- Invoke the `bmad-party-mode` skill with the current design direction
- Process the collaborative design insights that come back
- Ask user: "Accept these changes to the design direction? (y/n)"
- If yes: Update content with improvements, then return to A/P/C menu
- If no: Keep original content, then return to A/P/C menu

#### If 'C' (Continue):

- Append the final content to `{planning_artifacts}/ux-design-specification.md`
- Update frontmatter: append step to end of stepsCompleted array
- Load `./step-10-user-journeys.md`

## APPEND TO DOCUMENT:

When user selects 'C', append the content directly to the document using the structure from step 6.

## SUCCESS METRICS:

✅ Multiple design direction variations generated
✅ HTML showcase created with interactive elements
✅ Design evaluation criteria clearly established
✅ User able to explore and compare directions effectively
✅ Design direction decision made with clear rationale
✅ A/P/C menu presented and handled correctly
✅ Content properly appended to document when C selected

## FAILURE MODES:

❌ Not creating enough variation in design directions
❌ Design directions not aligned with established foundation
❌ Missing interactive elements in HTML showcase
❌ Not providing clear evaluation criteria
❌ Rushing decision without thorough exploration
❌ Not presenting A/P/C menu after content generation
❌ Appending content without user selecting 'C'

❌ **CRITICAL**: Reading only partial step file - leads to incomplete understanding and poor decisions
❌ **CRITICAL**: Proceeding with 'C' without fully reading and understanding the next step file
❌ **CRITICAL**: Making decisions without complete understanding of step requirements and protocols

## NEXT STEP:

After user selects 'C' and content is saved to document, load `./step-10-user-journeys.md` to design user journey flows.

Remember: Do NOT proceed to step-10 until user explicitly selects 'C' from the A/P/C menu and content is saved!
</prose>
