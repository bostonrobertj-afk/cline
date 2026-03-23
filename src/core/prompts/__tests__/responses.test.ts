import { expect } from "chai"
import { describe, it } from "mocha"
import path from "path"
import { formatResponse } from "../responses"

describe("formatResponse user input framing", () => {
	it("labels the latest human input explicitly", () => {
		const framed = formatResponse.latestHumanInput("task", "Review this story")

		expect(framed).to.contain("[LATEST HUMAN USER INPUT]")
		expect(framed).to.contain("<task>\nReview this story\n</task>")
	})

	it("renders resumed human input before system-generated context", () => {
		const [taskResumptionMessage, userResponseMessage] = formatResponse.taskResumption(
			"act",
			"just now",
			"/workspace/project",
			false,
			"Continue the review",
			false,
		)

		expect(userResponseMessage).to.contain("[LATEST HUMAN USER INPUT]")
		expect(taskResumptionMessage).to.contain("[SYSTEM-GENERATED CONTEXT]")
	})
})

describe("formatResponse file save summaries", () => {
	it("keeps final_file_content for smaller files", () => {
		const response = formatResponse.fileEditWithoutUserChanges(
			path.posix.join("src", "small.ts"),
			undefined,
			"export const value = 1\n",
			undefined,
		)

		expect(response).to.contain("<final_file_content")
		expect(response).to.not.contain("<final_file_summary")
	})

	it("replaces large final file echoes with a compact summary", () => {
		const largeContent = "const value = 1;\n".repeat(400)
		const response = formatResponse.fileEditWithoutUserChanges(
			path.posix.join("src", "large.ts"),
			undefined,
			largeContent,
			undefined,
		)

		expect(response).to.not.contain("<final_file_content")
		expect(response).to.contain("<final_file_summary")
		expect(response).to.contain("use read_file")
	})
})
