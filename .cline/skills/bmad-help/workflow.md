# workflow

## META

- Goal: Recommend the most relevant BMAD workflows or agents based on the user's recent activity, current module, and available artifacts.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Load the workflow catalog and resolve module configuration">
  <action>Load `{project-root}/_bmad/_config/bmad-help.csv`.</action>
  <action>Scan each module folder under `{project-root}/_bmad/` except `_config` for `config.yaml` files.</action>
  <action>Resolve each workflow row's output-location variables against the relevant module configuration so artifact paths can be searched accurately.</action>
  <detail>Also resolve `communication_language` and `project_knowledge` from each scanned module when available.</detail>
</step>

<step n="2" goal="Ground recommendations in project knowledge and active-module context">
  <branch if="a resolved project_knowledge path exists" optional="true">
    <action>Read the relevant project-knowledge documents for grounding context.</action>
    <detail>Use discovered project facts when composing project-specific guidance. If no documentation is available, say so instead of inventing details.</detail>
  </branch>
  <action>Detect the active module from the conversation context, recent workflows, or user query keywords.</action>
  <branch if="the active module is ambiguous" optional="true">
    <ask>Ask the user which module or area they want help with before proceeding.</ask>
  </branch>
</step>

<step n="3" goal="Infer what was most recently completed or what the user is asking for">
  <action>Analyze the current task input, recent workflow mentions, and any matching artifacts discovered at the resolved output paths.</action>
  <branch if="the latest completed workflow is still unclear" optional="true">
    <ask>Ask the user what workflow they most recently completed or what they want help with next.</ask>
  </branch>
</step>

<step n="4" goal="Assemble the next-step recommendations">
  <action>Use phase ordering, required workflow flags, artifact presence, and workflow descriptions to determine the most relevant next steps.</action>
  <detail>List optional workflows that are relevant before the next required workflow, but be explicit about which item is the next required step when there is one.</detail>
  <branch if="a workflow uses a command" optional="true">
    <output>Present the workflow as a command-style skill invocation in backticks.</output>
  </branch>
  <branch if="a workflow requires an agent to be loaded first" optional="true">
    <output>Present the workflow code plus the required agent-loading instruction instead of a slash-style command.</output>
  </branch>
</step>

<step n="5" goal="Present recommendations with the right supporting guidance">
  <output>Present each recommended workflow with its name, invocation method, agent identity when relevant, and a short reason it is being recommended.</output>
  <output>Tell the user to run each workflow in a fresh context window.</output>
  <branch if="a recommendation is a validation workflow" optional="true">
    <output>Recommend using a different high-quality LLM for that validation pass when one is available.</output>
  </branch>
  <detail>Present the response in `{communication_language}` and match the user's tone while keeping the recommendations easy to scan.</detail>
</step>

## CHECKPOINT

Complete the current required analysis before recommending the next workflow phase.

## ADVISORY

- Use discovered artifacts and module sequencing to ground recommendations in actual workflow progress rather than guesswork.
