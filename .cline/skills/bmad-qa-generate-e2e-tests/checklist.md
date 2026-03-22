# Quinn Automate - Validation Checklist

<critical>Call complete_workflow_item as soon as the current active checklist item is actually finished before moving to the next item.</critical>
<critical>After the final checklist item in this phase is complete, stop and wait for the prompt to refresh before doing work from the next phase.</critical>
<critical>Do not attempt checklist items from another phase while the current phase is active.</critical>

## Test Generation

- [ ] API tests generated (if applicable)
- [ ] E2E tests generated (if UI exists)
- [ ] Tests use standard test framework APIs
- [ ] Tests cover happy path
- [ ] Tests cover 1-2 critical error cases

## Test Quality

- [ ] All generated tests run successfully
- [ ] Tests use proper locators (semantic, accessible)
- [ ] Tests have clear descriptions
- [ ] No hardcoded waits or sleeps
- [ ] Tests are independent (no order dependency)

## Output

- [ ] Test summary created
- [ ] Tests saved to appropriate directories
- [ ] Summary includes coverage metrics

## Validation

Run the tests using your project's test command.

**Expected**: All tests pass ✅

---

**Need more comprehensive testing?** Install [Test Architect (TEA)](https://bmad-code-org.github.io/bmad-method-test-architecture-enterprise/) for advanced workflows.
