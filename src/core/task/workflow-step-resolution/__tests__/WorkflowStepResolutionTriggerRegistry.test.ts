import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import { getWorkflowStepResolutionTriggerDefinition } from "../WorkflowStepResolutionTriggerRegistry"

describe("WorkflowStepResolutionTriggerRegistry", () => {
	it("maps code-review step 3 to the review-input workflow-step-resolution definition", () => {
		expect(getWorkflowStepResolutionTriggerDefinition("code-review.md", 3)?.definitionId).to.equal(
			"code_review_step_3_review_input",
		)
	})

	it("maps write-remediation-story step 2 to the review-input workflow-step-resolution definition", () => {
		expect(getWorkflowStepResolutionTriggerDefinition("write-remediation-story.md", 2)?.definitionId).to.equal(
			"write_remediation_story_step_2_review_input",
		)
	})

	it("maps quick-spec step 2 to the tech-spec workflow-step-resolution definition", () => {
		expect(getWorkflowStepResolutionTriggerDefinition("quick-spec.md", 2)?.definitionId).to.equal(
			"quick_spec_step_2_build_tech_spec_document",
		)
	})

	it("does not intercept code-review step 3 when review_input has a current-task write proof and exists on disk", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-step-resolution-trigger-"))
		const reviewInputPath = path.join(tempDir, "review-input.md")

		try {
			await fs.writeFile(reviewInputPath, "# review input\n", "utf8")

			const trigger = getWorkflowStepResolutionTriggerDefinition("code-review.md", 3)
			const shouldIntercept = await trigger?.shouldIntercept({
				cwd: tempDir,
				taskState: {
					activePlaceholderWorkflowStableValues: { review_input: reviewInputPath },
					activePlaceholderWorkflowValues: {},
					activePlaceholderWorkflowTaskWriteProofPaths: [reviewInputPath],
				},
			})

			expect(shouldIntercept).to.equal(false)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("intercepts code-review step 3 when review_input is missing a current-task write proof", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-step-resolution-trigger-"))
		const reviewInputPath = path.join(tempDir, "review-input.md")

		try {
			await fs.writeFile(reviewInputPath, "# review input\n", "utf8")

			const trigger = getWorkflowStepResolutionTriggerDefinition("code-review.md", 3)
			const shouldIntercept = await trigger?.shouldIntercept({
				cwd: tempDir,
				taskState: {
					activePlaceholderWorkflowStableValues: { review_input: reviewInputPath },
					activePlaceholderWorkflowValues: {},
					activePlaceholderWorkflowTaskWriteProofPaths: [],
				},
			})

			expect(shouldIntercept).to.equal(true)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("does not intercept quick-spec step 2 when output_file has a current-task write proof and exists on disk", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workflow-step-resolution-trigger-"))
		const techSpecPath = path.join(tempDir, "planning", "implementation-artifacts", "tech-spec-wip.md")

		try {
			await fs.mkdir(path.dirname(techSpecPath), { recursive: true })
			await fs.writeFile(techSpecPath, "# tech spec\n", "utf8")

			const trigger = getWorkflowStepResolutionTriggerDefinition("quick-spec.md", 2)
			const shouldIntercept = await trigger?.shouldIntercept({
				cwd: tempDir,
				taskState: {
					activePlaceholderWorkflowStableValues: {},
					activePlaceholderWorkflowValues: { output_file: techSpecPath },
					activePlaceholderWorkflowTaskWriteProofPaths: [techSpecPath],
				},
			})

			expect(shouldIntercept).to.equal(false)
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
})
