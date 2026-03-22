# Step 3: Context Completion & Finalization

## META

- Goal: Finalize the project context file and make it ready for AI agent use.
- This is the final step.

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
  <ask>Need any explanation of the rules or how the context file should be maintained?</ask>
</step>
