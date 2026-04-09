import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import {
	buildRuntimeToolDictionaryMarkdown,
	buildRuntimeToolDictionaryMarkdownFromConfig,
	buildToolDictionaryMarkdown,
	buildToolDictionaryMarkdownFromConfig,
	buildWorkflowStartRuntimeToolDictionary,
	captureBrainstormingTopicToolDictionaryConfig,
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

	it("renders any configured tool by looking up its schema through the shared tool registry", () => {
		const config = {
			toolName: ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS,
			heading: "## set_workflow_placeholders",
			runtimeTitle: "Workflow Placeholder Reference",
			overviewLines: ["Persist workflow placeholder values."],
			parameterDescriptions: {
				values: "Workflow placeholder key/value map.",
			},
			termKeys: [],
		}

		const markdown = buildToolDictionaryMarkdownFromConfig(config)
		const runtimeMarkdown = buildRuntimeToolDictionaryMarkdownFromConfig(config)

		expect(markdown).to.include("## set_workflow_placeholders")
		expect(markdown).to.include("- `values` (required, object): Workflow placeholder key/value map.")
		expect(runtimeMarkdown).to.include("## set_workflow_placeholders")
		expect(runtimeMarkdown).to.not.include("# Workflow UI Surface Tool Dictionary")
	})

	it("renders the brainstorming topic runtime tool dictionary", () => {
		const markdown = buildRuntimeToolDictionaryMarkdownFromConfig(captureBrainstormingTopicToolDictionaryConfig)

		expect(markdown).to.equal(`## capture_brainstorming_topic

This form gathers your input regarding the topic for this brainstorming session and adds it to the brainstorming document before invoking the AI Agent.

### Parameters

- \`topic\` (required, string): The topic and/or goals you provide are added to the brainstorming document before GPT invocation

### Term Reference

- \`topic\`: The main focus area for this brainstorming session. The topic and/or goals you provide are added to the brainstorming document before GPT invocation
`)
	})

	it("builds a workflow-start runtime dictionary with contextual term reference rows", () => {
		const { title, markdown } = buildWorkflowStartRuntimeToolDictionary({
			fieldKeys: ["review_input", "spec_file"],
		})

		expect(title).to.equal("Workflow Placeholder Reference")
		expect(markdown).to.include("## set_workflow_placeholders")
		expect(markdown).to.include("- `values` (required, object):")
		expect(markdown).to.include("### Term Reference")
		expect(markdown).to.include("`review_input`")
		expect(markdown).to.include("`spec_file`")
	})

	it("omits the workflow-start term reference section when no mapped keys exist", () => {
		const { markdown } = buildWorkflowStartRuntimeToolDictionary({
			fieldKeys: ["unmapped_input"],
		})

		expect(markdown).to.include("## set_workflow_placeholders")
		expect(markdown).to.include("### Parameters")
		expect(markdown).to.not.include("### Term Reference")
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
