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

	it("wraps normal next-turn dialogue separately from reopened-thread copy", () => {
		const framed = formatResponse.normalNextTurnDialogue("user_message", "Continue the review")

		expect(framed).to.contain("[NORMAL NEXT-TURN HUMAN INPUT]")
		expect(framed).to.contain("current live turn")
		expect(framed).to.contain("[LATEST HUMAN USER INPUT]")
		expect(framed).to.contain("<user_message>\nContinue the review\n</user_message>")
	})

	it("renders reopened-thread copy without synthetic resume framing", () => {
		const [taskResumptionMessage, userResponseMessage] = formatResponse.taskResumption(
			"act",
			"just now",
			"/workspace/project",
			false,
			"Continue the review",
			false,
		)

		expect(userResponseMessage).to.contain("[LATEST HUMAN USER INPUT]")
		expect(userResponseMessage).to.contain("Latest human-authored input for the reopened thread")
		expect(taskResumptionMessage).to.contain("[SYSTEM-GENERATED CONTEXT]")
		expect(taskResumptionMessage).to.contain("[CONVERSATION REOPENED]")
		expect(taskResumptionMessage).to.not.contain("[TASK RESUMPTION]")
	})
})

describe("formatResponse file save summaries", () => {
	it("uses a compact patch summary for edited existing files", () => {
		const response = formatResponse.fileEditWithoutUserChanges(
			path.posix.join("src", "small.ts"),
			undefined,
			"export const value = 0\n",
			"export const value = 1\n",
			false,
			undefined,
		)

		expect(response).to.not.contain("<final_file_content")
		expect(response).to.contain("<final_file_patch_summary")
		expect(response).to.contain("use read_file")
		expect(response).to.contain("changed_regions=")
	})

	it("keeps final_file_content for tiny new files", () => {
		const response = formatResponse.fileEditWithoutUserChanges(
			path.posix.join("src", "small.ts"),
			undefined,
			undefined,
			"export const value = 1\n",
			true,
			undefined,
		)

		expect(response).to.contain("<final_file_content")
		expect(response).to.not.contain("<final_file_patch_summary")
	})

	it("replaces large final file echoes with a compact summary", () => {
		const largeContent = "const value = 1;\n".repeat(400)
		const response = formatResponse.fileEditWithoutUserChanges(
			path.posix.join("src", "large.ts"),
			undefined,
			"const value = 0;\n",
			largeContent,
			false,
			undefined,
		)

		expect(response).to.not.contain("<final_file_content")
		expect(response).to.contain("<final_file_patch_summary")
		expect(response).to.contain("use read_file")
	})

	it("falls back to a metadata summary when previousContent is unavailable", () => {
		const response = formatResponse.fileEditWithoutUserChanges(
			path.posix.join("src", "fallback.ts"),
			undefined,
			undefined,
			"const value = 1\n",
			false,
			undefined,
		)

		expect(response).to.not.contain("<final_file_content")
		expect(response).to.contain("<final_file_summary")
		expect(response).to.contain("created_file=false")
		expect(response).to.contain("use read_file")
	})
})
