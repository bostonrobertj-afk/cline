import { expect } from "chai"
import { describe, it } from "mocha"
import path from "path"
import { formatResponse } from "../responses"

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
