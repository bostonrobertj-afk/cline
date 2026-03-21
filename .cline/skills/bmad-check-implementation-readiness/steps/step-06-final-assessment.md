---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 06 final assessment

## META

- Goal: synthesize all findings, produce clear readiness guidance, and finalize the implementation-readiness report.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Review the findings produced by the earlier assessment phases">
  <action>
    Review the sections already added to `{outputFile}`.
    <detail>
      At minimum, synthesize findings from:
      - document discovery
      - PRD analysis
      - epic coverage validation
      - UX alignment
      - epic quality review
    </detail>
  </action>
</step>

<step n="2" goal="Determine overall implementation-readiness status">
  <action>
    Determine the overall readiness status based on the full assessment evidence.
    <detail>
      Use a clear status such as:
      - `READY`
      - `NEEDS WORK`
      - `NOT READY`
    </detail>
  </action>
  <annotation annotationKind="critical">Do not soften the readiness status if the findings show substantial traceability, alignment, or quality gaps.</annotation>
</step>

<step n="3" goal="Write the summary and recommendations section of the report">
  <action>
    Append a summary and recommendations section to `{outputFile}`.
    <detail>
      Include:
      - overall readiness status
      - critical issues requiring immediate action
      - recommended next steps
      - a final note summarizing issue count, issue categories, and the implications for implementation readiness
    </detail>
  </action>
</step>

<step n="4" goal="Finalize and polish the report">
  <action>Ensure all findings are clearly documented and internally consistent.</action>
  <action>Verify that recommendations are specific and actionable.</action>
  <action>Add assessment date and assessor information where appropriate.</action>
  <output>Finalize and save the report.</output>
</step>

<step n="5" goal="Present completion and communicate the outcome clearly">
  <output>
    Present the final completion message for the user.
    <detail>
      Communicate:
      - that the implementation-readiness assessment is complete
      - where the report was generated
      - how many issues require attention
      - that the user should review the report for detailed findings and recommendations
    </detail>
  </output>
  <action>Conclude the workflow after the report is finalized.</action>
</step>

## CHECKPOINT

Complete the final synthesis and report finalization before the workflow ends.

## ADVISORY

- Keep the final message direct, evidence-based, and actionable.
- Do not invoke other workflows or skills automatically from this phase; the assessment should end with the finalized report and outcome summary.
