import { expect } from "chai"
import { describe, it } from "mocha"
import path from "path"
import { formatResponse, isSerializedToolFailureResultText } from "../responses"

describe("isSerializedToolFailureResultText", () => {
	it("classifies serialized tool denial and error strings as failures", () => {
		expect(isSerializedToolFailureResultText(formatResponse.toolDenied())).to.equal(true)
		expect(isSerializedToolFailureResultText(formatResponse.toolError("boom"))).to.equal(true)
	})

	it("classifies missing, empty, and legacy Error-prefixed text as failures", () => {
		expect(isSerializedToolFailureResultText(undefined)).to.equal(true)
		expect(isSerializedToolFailureResultText("")).to.equal(true)
		expect(isSerializedToolFailureResultText("Error: boom")).to.equal(true)
	})

	it("does not classify normal success text as a failure", () => {
		expect(isSerializedToolFailureResultText("ok")).to.equal(false)
	})
})

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
		expect(framed).to.not.contain("[LATEST HUMAN USER INPUT]")
		expect(framed).to.contain("<user_message>\nContinue the review\n</user_message>")
	})

	it("keeps latest-human-input and normal-next-turn wrappers as peers rather than nested blocks", () => {
		const latest = formatResponse.latestHumanInput("user_message", "Continue the review")
		const nextTurn = formatResponse.normalNextTurnDialogue("user_message", "Continue the review")

		expect(latest).to.contain("[LATEST HUMAN USER INPUT]")
		expect(latest).to.not.contain("[NORMAL NEXT-TURN HUMAN INPUT]")
		expect(nextTurn).to.contain("[NORMAL NEXT-TURN HUMAN INPUT]")
		expect(nextTurn).to.not.contain("[LATEST HUMAN USER INPUT]")
		expect(latest).to.contain("<user_message>\nContinue the review\n</user_message>")
		expect(nextTurn).to.contain("<user_message>\nContinue the review\n</user_message>")
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
		expect(response).to.contain("<final_file_state")
		expect(response).to.contain("<final_file_patch_summary")
		expect(response).to.contain("reference_format=patch_summary")
		expect(response).to.contain("exact_saved_content_matches_agent_output=true")
		expect(response).to.contain("additional_verification_read_required=false")
		expect(response).to.contain("changed_regions=")
		expect(response).to.contain("No additional verification read is required")
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
		expect(response).to.contain("<final_file_state")
		expect(response).to.contain("reference_format=full_content")
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
		expect(response).to.contain("<final_file_state")
		expect(response).to.contain("<final_file_patch_summary")
		expect(response).to.contain("patch_truncated=true")
		expect(response).to.contain("additional_verification_read_required=true")
		expect(response).to.contain("Only use read_file")
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
		expect(response).to.contain("<final_file_state")
		expect(response).to.contain("<final_file_summary")
		expect(response).to.contain("created_file=false")
		expect(response).to.contain("reference_format=metadata_summary")
		expect(response).to.contain("No additional verification read is required")
	})

	it("marks auto-formatting as changing the exact saved output", () => {
		const response = formatResponse.fileEditWithoutUserChanges(
			path.posix.join("src", "formatted.ts"),
			"@@\n-const value = 1\n+const value = 1;\n",
			"const value = 0\n",
			"const value = 1\n",
			false,
			undefined,
		)

		expect(response).to.contain("auto_formatting_applied=true")
		expect(response).to.contain("exact_saved_content_matches_agent_output=false")
	})

	it("marks user edits as changing the exact saved output", () => {
		const response = formatResponse.fileEditWithUserChanges(
			path.posix.join("src", "edited.ts"),
			"@@\n-const value = 1\n+const value = 2\n",
			undefined,
			"const value = 1\n",
			"const value = 2\n",
			false,
			undefined,
		)

		expect(response).to.contain("user_edits_applied=true")
		expect(response).to.contain("exact_saved_content_matches_agent_output=false")
		expect(response).to.contain("You do not need to re-write the file")
	})
})
