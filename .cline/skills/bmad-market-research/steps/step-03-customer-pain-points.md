# Step 03 - Customer Pain Points and Needs

Workflow ID: `bmad-market-research`

## EXECUTION
<step n="1" goal="Research customer pain points and unmet needs">
  <action>Search current sources for customer challenges, frustrations, unmet needs, adoption barriers, support issues, satisfaction gaps, and emotional impact related to `{{research_topic}}`.</action>
  <detail>Use review data, customer feedback, surveys, and authoritative market sources. Gather multiple current URLs where possible.</detail>
</step>

<step n="2" goal="Prioritize the pain points">
  <action>Compare the findings to identify the highest-impact frustrations, the most important unmet needs, and the clearest opportunity areas.</action>
  <detail>Note frequency, severity, trust issues, retention risk, and any patterns that repeat across sources.</detail>
</step>

<step n="3" goal="Append the pain-point analysis to the report">
  <action>Append the customer pain point analysis to `{outputFile}`.</action>
  <detail>
    Use these section headers in the report:
    - `## Customer Pain Points and Needs`
    - `### Customer Challenges and Frustrations`
    - `### Unmet Customer Needs`
    - `### Barriers to Adoption`
    - `### Service and Support Pain Points`
    - `### Customer Satisfaction Gaps`
    - `### Emotional Impact Assessment`
    - `### Pain Point Prioritization`
  </detail>
</step>

<step n="4" goal="Present the continuation gate">
  <output>Summarize the pain-point findings and invite the user to continue.</output>
  <ask>Offer `[C] Continue` to save this phase and move to customer decision processes.</ask>
  <branch if="user chooses `C`">
    <action>Update frontmatter `stepsCompleted: [1, 2, 3]`.</action>
    <output>Load `./step-04-customer-decisions.md`.</output>
  </branch>
</step>

## CHECKPOINT
Halt until the user explicitly continues.

## ADVISORY
- Ground the analysis in current evidence and cite URLs for claims.
- Do not advance until the pain-point section is written and the user approves continuation.
