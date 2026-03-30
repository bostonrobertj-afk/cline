import { expect } from "chai"
import { describe, it } from "mocha"
import {
	buildRuntimeToolDictionaryMarkdown,
	buildToolDictionaryMarkdown,
	TOOL_DICTIONARY_TERM_KEYS,
	WORKFLOW_FORM_TOOL_DICTIONARY_HEADING,
} from "../buildToolDictionary"
import { workflowFormSystemDictionary } from "../systemDictionary"

describe("buildToolDictionaryMarkdown", () => {
	it("finds the stable build_review_diff_output heading", () => {
		const markdown = buildToolDictionaryMarkdown()

		expect(markdown).to.include(WORKFLOW_FORM_TOOL_DICTIONARY_HEADING)
	})

	it("renders required versus optional parameter status from the schema", () => {
		const markdown = buildToolDictionaryMarkdown()

		expect(markdown).to.include("- `source` (required, object):")
		expect(markdown).to.include("- `scoped_paths` (optional, array):")
		expect(markdown).to.include("- `context_lines` (optional, integer):")
	})

	it("keeps translation entries for every Phase 1 technical term used in the tool dictionary", () => {
		const markdown = buildToolDictionaryMarkdown()

		for (const key of TOOL_DICTIONARY_TERM_KEYS) {
			expect(workflowFormSystemDictionary[key]).to.not.equal(undefined)
			expect(markdown).to.include(`\`${key}\``)
		}
	})
})

describe("buildRuntimeToolDictionaryMarkdown", () => {
	it("renders the runtime tool reference without internal workflow-ui-surface framing", () => {
		const markdown = buildRuntimeToolDictionaryMarkdown()

		expect(markdown).to.include("## build_review_diff_output")
		expect(markdown).to.include("### Supported Source Variants")
		expect(markdown).to.include("### Parameters")
		expect(markdown).to.include("### Term Reference")
		expect(markdown).to.not.include("# Workflow UI Surface Tool Dictionary")
		expect(markdown).to.not.include("Generated from")
	})
})
