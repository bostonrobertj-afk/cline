import { expect } from "chai"
import { describe, it } from "mocha"
import { getPlaceholderWorkflowValueMap, resolvePlaceholderWorkflowText } from "../placeholder-workflow-rendering"

describe("placeholder workflow rendering", () => {
	it("resolves both single-curly and double-curly placeholders", () => {
		const result = resolvePlaceholderWorkflowText("Review {story_path} and summarize {{story_id}}.", {
			story_path: "docs/stories/1.2.md",
			story_id: "1.2",
		})

		expect(result).to.equal("Review docs/stories/1.2.md and summarize 1.2.")
	})

	it("leaves unresolved placeholders unchanged", () => {
		const result = resolvePlaceholderWorkflowText("Review {story_path} and {{story_id}}.", {
			story_path: "docs/stories/1.2.md",
		})

		expect(result).to.equal("Review docs/stories/1.2.md and {{story_id}}.")
	})

	it("lets dynamic placeholders override stable placeholders when merging", () => {
		const placeholders = getPlaceholderWorkflowValueMap(
			{
				story_id: "1.0",
				communication_language: "English",
			},
			{
				story_id: "1.2",
			},
		)

		const result = resolvePlaceholderWorkflowText("Review {{story_id}} in {communication_language}.", placeholders)

		expect(result).to.equal("Review 1.2 in English.")
	})
})
