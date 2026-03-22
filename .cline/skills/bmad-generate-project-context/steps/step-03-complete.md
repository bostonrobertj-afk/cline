# Step 3: Context Completion & Finalization

## META

- Goal: Finalize the project context file and make it ready for AI agent use.
- This is the final step.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.

## EXECUTION

<step n="1" goal="Review, optimize, and finalize the project context">
  <action>Read the complete project context file and remove redundancy, obvious guidance, and any leftover duplication.</action>
  <detail>
    Keep the file lean and scannable. The final structure should include technology stack, critical implementation rules, and usage guidelines.
  </detail>

  <action>Update the frontmatter with completion status, sections completed, rule count, and `optimized_for_llm: true`.</action>
  <action>Append the usage guidelines so agents and humans know how to maintain the file.</action>
  <action>Save the completed context file to `{output_folder}/project-context.md`.</action>

  <output>Project context complete and optimized for LLM consumption.</output>
  <output>
    Conclude the workflow after reporting the completed context artifact.
    <detail>
      Do not ask a new follow-up question just to keep the workflow open.
      If the user already asked for explanation or maintenance guidance in the same task, include that explanation in the closing message.
      Otherwise, stop cleanly after confirming completion.
    </detail>
  </output>
</step>
