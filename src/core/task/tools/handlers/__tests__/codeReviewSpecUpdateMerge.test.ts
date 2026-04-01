import { expect } from "chai"
import { describe, it } from "mocha"
import { codeReviewSpecUpdateMerge } from "../codeReviewSpecUpdateMerge"

describe("codeReviewSpecUpdateMerge", () => {
	it("replaces status and latest review findings, appends only new remediation tasks, and clears review_input to an empty file", () => {
		const result = codeReviewSpecUpdateMerge({
			specFileMarkdown: `# Story 4.1: Code Review Final Documentation
Status: review

## Acceptance Criteria
- AC 1

## Latest Review Findings
- Old finding

## Tasks / Subtasks
- [ ] Existing story task
- [ ] Carry forward remediation task
`,
			reviewInputMarkdown: `# Story 4.1: Code Review Final Documentation
Status: ready-for-dev

## Latest Review Findings
- New final finding
- Another final finding

## Tasks / Subtasks
- [ ] Carry forward remediation task
  - Added nested remediation note
- [ ] New remediation task
`,
		})

		expect(result).to.deep.equal({
			kind: "success",
			updatedSpecFileMarkdown: `# Story 4.1: Code Review Final Documentation
Status: ready-for-dev

## Acceptance Criteria
- AC 1

## Latest Review Findings
- New final finding
- Another final finding

## Tasks / Subtasks
- [ ] Existing story task
- [ ] Carry forward remediation task
  - Added nested remediation note
- [ ] New remediation task`,
			clearedReviewInputMarkdown: "",
		})
	})

	it("creates missing latest-review-findings and tasks sections at the end of the spec file in the required order", () => {
		const result = codeReviewSpecUpdateMerge({
			specFileMarkdown: `# Story 4.1: Code Review Final Documentation
## Acceptance Criteria
- AC 1
`,
			reviewInputMarkdown: `# Story 4.1: Code Review Final Documentation
Status: ready-for-dev

## Latest Review Findings

## Tasks / Subtasks
- [ ] New remediation task
`,
		})

		expect(result).to.deep.equal({
			kind: "success",
			updatedSpecFileMarkdown: `# Story 4.1: Code Review Final Documentation
Status: ready-for-dev
## Acceptance Criteria
- AC 1

## Latest Review Findings

## Tasks / Subtasks
- [ ] New remediation task`,
			clearedReviewInputMarkdown: "",
		})
	})

	it("fails when review_input.md is missing the top-level Status line", () => {
		const result = codeReviewSpecUpdateMerge({
			specFileMarkdown: `# Story 4.1
Status: review
`,
			reviewInputMarkdown: `# Story 4.1

## Latest Review Findings
- Finding

## Tasks / Subtasks
- [ ] Task
`,
		})

		expect(result).to.deep.equal({
			kind: "error",
			message: "review_input.md does not contain the required top-level Status: line.",
		})
	})

	it("fails when review_input.md is missing the Latest Review Findings section", () => {
		const result = codeReviewSpecUpdateMerge({
			specFileMarkdown: `# Story 4.1
Status: review
`,
			reviewInputMarkdown: `# Story 4.1
Status: ready-for-dev

## Tasks / Subtasks
- [ ] Task
`,
		})

		expect(result).to.deep.equal({
			kind: "error",
			message: "review_input.md does not contain the required ## Latest Review Findings section.",
		})
	})

	it("fails when review_input.md is missing the Tasks / Subtasks section", () => {
		const result = codeReviewSpecUpdateMerge({
			specFileMarkdown: `# Story 4.1
Status: review
`,
			reviewInputMarkdown: `# Story 4.1
Status: ready-for-dev

## Latest Review Findings
- Finding
`,
		})

		expect(result).to.deep.equal({
			kind: "error",
			message: "review_input.md does not contain the required ## Tasks / Subtasks section.",
		})
	})
})
