---
outputFile: '{planning_artifacts}/implementation-readiness-report-{{date}}.md'
---

# step 06 final assessment

## META

- Goal: To provide a comprehensive summary of all findings and give the report a final polish, ensuring clear recommendations and overall readiness status.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Initialize Final Assessment">
  <action>Review all findings from previous steps</action>
  <action>Provide a comprehensive summary</action>
  <action>Add specific recommendations</action>
  <action>Determine overall readiness status&quot;</action>
</step>

<step n="2" goal="Review Previous Findings">
  <action>File and FR Validation findings</action>
  <action>UX Alignment issues</action>
  <action>Epic Quality violations</action>
</step>

<step n="3" goal="Add Final Assessment Section">
  <action>[Specific action item 1]</action>
  <action>[Specific action item 2]</action>
  <action>[Specific action item 3]</action>
</step>

<step n="4" goal="Complete the Report">
  <action>Ensure all findings are clearly documented</action>
  <action>Verify recommendations are actionable</action>
  <action>Add date and assessor information</action>
  <output>Save the final report</output>
</step>

<step n="5" goal="Present Completion">
  <action>Review the detailed report for specific findings and recommendations.&quot; ## WORKFLOW COMPLETE The implementation readiness workflow is now complete.</action>
  <action>The report contains all findings and recommendations for the user to consider.</action>
  <action>Implementation Readiness complete.</action>
  <action>Invoke the bmad-help skill.</action>
  <action>---</action>
  <output>Display: &quot;Implementation Readiness Assessment Complete Report generated: {outputFile} The assessment found [number] issues requiring attention.</output>
</step>

## CHECKPOINT

Complete the current required actions in order before moving to the next workflow phase.

## ADVISORY

- Use the prose block below for the full agent-facing guidance that complements the structured execution steps.

## REFERENCE

<prose>
## STEP GOAL:

To provide a comprehensive summary of all findings and give the report a final polish, ensuring clear recommendations and overall readiness status.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 📖 You are at the final step - complete the assessment
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Role Reinforcement:

- ✅ You are delivering the FINAL ASSESSMENT
- ✅ Your findings are objective and backed by evidence
- ✅ Provide clear, actionable recommendations
- ✅ Success is measured by value of findings

### Step-Specific Rules:

- 🎯 Compile and summarize all findings
- 🚫 Don't soften the message - be direct
- 💬 Provide specific examples for problems
- 🚪 Add final section to the report

## EXECUTION PROTOCOLS:

- 🎯 Review all findings from previous steps
- 💾 Add summary and recommendations
- 📖 Determine overall readiness status
- 🚫 Complete and present final report

## FINAL ASSESSMENT PROCESS:

### 1. Initialize Final Assessment

"Completing **Final Assessment**.

I will now:

1. Review all findings from previous steps
2. Provide a comprehensive summary
3. Add specific recommendations
4. Determine overall readiness status"

### 2. Review Previous Findings

Check the {outputFile} for sections added by previous steps:

- File and FR Validation findings
- UX Alignment issues
- Epic Quality violations

### 3. Add Final Assessment Section

Append to {outputFile}:

```markdown
## Summary and Recommendations

### Overall Readiness Status

[READY/NEEDS WORK/NOT READY]

### Critical Issues Requiring Immediate Action

[List most critical issues that must be addressed]

### Recommended Next Steps

1. [Specific action item 1]
2. [Specific action item 2]
3. [Specific action item 3]

### Final Note

This assessment identified [X] issues across [Y] categories. Address the critical issues before proceeding to implementation. These findings can be used to improve the artifacts or you may choose to proceed as-is.
```

### 4. Complete the Report

- Ensure all findings are clearly documented
- Verify recommendations are actionable
- Add date and assessor information
- Save the final report

### 5. Present Completion

Display:
"**Implementation Readiness Assessment Complete**

Report generated: {outputFile}

The assessment found [number] issues requiring attention. Review the detailed report for specific findings and recommendations."

## WORKFLOW COMPLETE

The implementation readiness workflow is now complete. The report contains all findings and recommendations for the user to consider.

Implementation Readiness complete. Invoke the `bmad-help` skill.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All findings compiled and summarized
- Clear recommendations provided
- Readiness status determined
- Final report saved

### ❌ SYSTEM FAILURE:

- Not reviewing previous findings
- Incomplete summary
- No clear recommendations
</prose>
