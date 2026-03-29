import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import { formatResults } from "./index"

describe("formatResults", () => {
	it("includes explicit 1-based line numbers for match context", () => {
		const result = formatResults(
			[
				{
					filePath: "/repo/src/example.ts",
					line: 42,
					column: 1,
					match: "const target = true;",
					beforeContext: ["const before = true;"],
					afterContext: ["return target;"],
				},
			],
			"/repo",
		)

		assert.ok(result.includes("src/example.ts"))
		assert.ok(result.includes("│41│const before = true;"))
		assert.ok(result.includes("│42│const target = true;"))
		assert.ok(result.includes("│43│return target;"))
	})
})
