# Step 06 - Research Completion

Workflow ID: `bmad-market-research`

## EXECUTION
<step n="1" goal="Research synthesis and final strategy inputs">
  <action>Search current sources for market-entry best practices and risk-assessment frameworks that can strengthen the final synthesis.</action>
  <detail>Use the current market topic plus broad strategic sources to inform the final recommendations and risk framing.</detail>
</step>

<step n="2" goal="Synthesize the full market story">
  <action>Combine the market, customer, and competitive findings into a concise executive summary, introduction, and recommendation set.</action>
  <detail>Prepare the final report structure, including the table of contents, methodology notes, future outlook, and implementation guidance.</detail>
</step>

<step n="3" goal="Finalize the research document">
  <action>Replace the `Research Overview` placeholder in `{outputFile}` with a concise overview that points the reader to the executive summary and the full report.</action>
  <action>Append the final synthesis, TOC, methodology, recommendations, outlook, and conclusion sections to `{outputFile}`.</action>
  <detail>
    Use these section headers in the report:
    - `## Executive Summary`
    - `## Table of Contents`
    - `## 1. Market Research Introduction and Methodology`
    - `## 2. {{research_topic}} Market Analysis and Dynamics`
    - `## 3. Customer Insights and Behavior Analysis`
    - `## 4. Competitive Landscape and Positioning`
    - `## 5. Strategic Market Recommendations`
    - `## 6. Market Entry and Growth Strategies`
    - `## 7. Risk Assessment and Mitigation`
    - `## 8. Implementation Roadmap and Success Metrics`
    - `## 9. Future Market Outlook and Opportunities`
    - `## 10. Market Research Methodology and Source Verification`
    - `## 11. Market Research Appendices and Additional Resources`
    - `## Market Research Conclusion`
  </detail>
</step>

<step n="4" goal="Present the completion gate">
  <output>Summarize the complete market research document and invite the user to finish.</output>
  <ask>Offer `[C] Complete Research` to save the final document and close the workflow.</ask>
  <branch if="user chooses `C`">
    <action>Update frontmatter `stepsCompleted: [1, 2, 3, 4, 5, 6]`.</action>
    <output>Mark the market research workflow complete.</output>
  </branch>
</step>

## CHECKPOINT
Halt until the user explicitly completes the workflow.

## ADVISORY
- Keep the final document authoritative, source-backed, and easy to navigate.
- Replace the placeholder overview before appending the remainder of the report.
- Do not close the workflow until the user selects the completion option.
