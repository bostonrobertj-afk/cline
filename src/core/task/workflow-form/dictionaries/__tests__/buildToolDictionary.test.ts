import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import {
	buildRuntimeToolDictionaryMarkdown,
	buildRuntimeToolDictionaryMarkdownFromConfig,
	buildToolDictionaryMarkdown,
	buildToolDictionaryMarkdownFromConfig,
	buildWorkflowStartRuntimeToolDictionary,
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

		expect(markdown).to.include("- `values` (required, object):")
	})

	it("keeps translation entries for every Phase 1 technical term used in the tool dictionary", () => {
		const markdown = buildToolDictionaryMarkdown()

		for (const key of TOOL_DICTIONARY_TERM_KEYS) {
			expect(workflowFormSystemDictionary[key]).to.not.equal(undefined)
			expect(markdown).to.include(`\`${key}\``)
		}
	})

	it("renders any configured tool by looking up its schema through the workflow-form contract resolver", () => {
		const config = {
			toolName: ClineDefaultTool.SET_WORKFLOW_VALUES,
			heading: "## set_workflow_values",
			runtimeTitle: "Workflow Value Reference",
			overviewLines: ["Persist workflow values for the active workflow before the first AI turn begins."],
			parameterDescriptions: {
				values: "Workflow value key/value map. Submit only the values the human actually supplied.",
			},
			termKeys: [],
		}

		const markdown = buildToolDictionaryMarkdownFromConfig(config)
		const runtimeMarkdown = buildRuntimeToolDictionaryMarkdownFromConfig(config)

		expect(markdown).to.include("## set_workflow_values")
		expect(markdown).to.include(
			"- `values` (required, object): Workflow value key/value map. Submit only the values the human actually supplied.",
		)
		expect(runtimeMarkdown).to.include("## set_workflow_values")
		expect(runtimeMarkdown).to.not.include("# Workflow UI Surface Tool Dictionary")
	})

	it("builds a workflow-start runtime dictionary with contextual term reference rows", () => {
		const { title, markdown } = buildWorkflowStartRuntimeToolDictionary({
			fieldKeys: ["review_input", "spec_file"],
		})

		expect(title).to.equal("Workflow Value Reference")
		expect(markdown).to.include("## set_workflow_values")
		expect(markdown).to.include("- `values` (required, object):")
		expect(markdown).to.include("### Term Reference")
		expect(markdown).to.include("`review_input`")
		expect(markdown).to.include("`spec_file`")
	})

	it("omits the workflow-start term reference section when no mapped keys exist", () => {
		const { markdown } = buildWorkflowStartRuntimeToolDictionary({
			fieldKeys: ["unmapped_input"],
		})

		expect(markdown).to.include("## set_workflow_values")
		expect(markdown).to.include("### Parameters")
		expect(markdown).to.not.include("### Term Reference")
	})
})

describe("buildRuntimeToolDictionaryMarkdown", () => {
	it("renders the runtime tool reference without internal workflow-ui-surface framing", () => {
		const markdown = buildRuntimeToolDictionaryMarkdown()

		expect(markdown).to.include("## set_workflow_values")
		expect(markdown).to.include("- `values` (required, object):")
		expect(markdown).to.include("### Parameters")
		expect(markdown).to.include("### Term Reference")
		expect(markdown).to.not.include("# Workflow UI Surface Tool Dictionary")
		expect(markdown).to.not.include("Generated from")
	})
})
