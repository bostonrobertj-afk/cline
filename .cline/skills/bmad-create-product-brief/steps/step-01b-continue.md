---
# File References
outputFile: '{planning_artifacts}/product-brief-{{project_name}}-{{date}}.md'
---

# step 01b continue

## META

- Goal: resume the product brief workflow from the last completed point and restore the same working context.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Analyze current workflow state">
  <action>
    Review the current file and frontmatter.
    <detail>
      Resolve:
      - `stepsCompleted`
      - `lastStep`
      - `inputDocuments`
      - all other frontmatter variables
    </detail>
  </action>
</step>

<step n="2" goal="Restore previously loaded context documents">
  <action>
    Reload every file listed in `inputDocuments` completely.
    <detail>
      Do not discover new documents in continuation mode.
      Restore the exact same context that existed before the interruption.
    </detail>
  </action>
</step>

<step n="3" goal="Report current progress">
  <output>
    Summarize the restored state for the user, including completed steps, last worked step, and the number of context documents.
  </output>
</step>

<step n="4" goal="Choose the next workflow file">
  <branch if="lastStep = 1">
    <handoff path="./step-02-vision.md" />
  </branch>
  <branch if="lastStep = 2">
    <handoff path="./step-03-users.md" />
  </branch>
  <branch if="lastStep = 3">
    <handoff path="./step-04-metrics.md" />
  </branch>
  <branch if="lastStep = 4">
    <handoff path="./step-05-scope.md" />
  </branch>
  <branch if="lastStep = 5">
    <handoff path="./step-06-complete.md" />
  </branch>
  <branch if="lastStep = 6">
    <output>The workflow is already complete, so surface the completion options instead of loading another step.</output>
  </branch>
</step>

<step n="5" goal="Handle a completed workflow">
  <output>Offer to review the finished brief, suggest next workflows, or start a new revision.</output>
</step>

<step n="6" goal="Present the continuation menu">
  <ask>Invite the user to chat or choose whether to continue.</ask>
  <branch if="the user selects C and the workflow is not complete">
    <output>Proceed with the next workflow file identified above.</output>
  </branch>
  <branch if="the user selects C and the workflow is complete">
    <output>Keep the completion state and stay at the wrap-up menu.</output>
  </branch>
  <output>Always halt and wait for user input after showing the menu.</output>
</step>

## CHECKPOINT

Pause for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Persist workflow state updates whenever this phase writes or updates a managed artifact.
