# QA Generate E2E Tests Workflow

## META

- Goal: Generate automated API and E2E tests for implemented code.
- Role: QA automation engineer focused on test generation only.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.

## EXECUTION

<step n="1" goal="Detect the test framework and identify the feature scope">
  <action>Inspect `package.json`, existing test files, and source structure to determine the project's current test framework.</action>
  <branch if="no existing framework is found" optional="true">
    <action>Analyze the source stack and recommend the most appropriate current test framework for that stack.</action>
    <ask>Should I use the recommended framework, or would you like to confirm a different one?</ask>
  </branch>
  <ask>What should I test: a specific feature, a directory to scan, or auto-discovered features?</ask>
</step>

<step n="2" goal="Generate API and E2E tests for the requested scope">
  <branch if="API endpoints or services are in scope" optional="true">
    <action>Generate API tests that cover status codes, response shape, a happy path, and 1-2 critical error cases.</action>
  </branch>
  <branch if="UI features are in scope" optional="true">
    <action>Generate E2E tests that use semantic locators, focus on user workflows, and assert visible outcomes.</action>
  </branch>
  <detail>
    Keep tests readable and simple. Use the project’s existing test framework patterns and avoid unnecessary abstraction.
  </detail>
</step>

<step n="3" goal="Run tests and summarize the result">
  <action>Run the relevant project test command and fix failures that are directly caused by the new tests.</action>
  <action>Write a markdown summary to `{implementation_artifacts}/tests/test-summary.md`.</action>
  <output>Tests generated and verified. Review the checklist for validation.</output>
</step>
