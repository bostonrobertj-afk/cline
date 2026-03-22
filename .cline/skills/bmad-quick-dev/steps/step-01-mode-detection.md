---
---

# Step 1: Mode Detection

## META

- Goal: Detect the execution mode, capture the baseline, and route to the right follow-up step.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Capture the baseline commit">
  <branch if="the repository is a Git worktree" optional="true">
    <action>Run `git rev-parse HEAD` and store the result as `{baseline_commit}`.</action>
  </branch>
  <branch if="the repository is not under Git" optional="true">
    <action>Set `{baseline_commit}` to `NO_GIT`.</action>
  </branch>
</step>

<step n="2" goal="Load project context">
  <action>Load `**/project-context.md` if it exists.</action>
</step>

<step n="3" goal="Determine the execution mode and route accordingly">
  <branch if="the user provided a tech-spec path" optional="true">
    <action>Set `{execution_mode}` to `tech-spec` and `{tech_spec_path}` to the provided path.</action>
    <handoff path="./step-03-execute.md" />
  </branch>
  <branch if="the user provided direct instructions" optional="true">
    <action>Set `{execution_mode}` to `direct`.</action>
    <branch if="the request is small and isolated" optional="true">
      <output>Select: [P] Plan first (tech-spec) or [E] Execute directly.</output>
      <ask>Which option do you want?</ask>
    </branch>
    <branch if="the request spans multiple components or has higher routing risk" optional="true">
      <output>This looks like a broader feature and may need planning first.</output>
      <ask>Choose [P] plan first, [W] use the full BMad flow, or [E] execute directly.</ask>
    </branch>
  </branch>
</step>
