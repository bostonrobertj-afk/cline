import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineDefaultTool } from "@/shared/tools"
import {
	buildRuntimeToolDictionaryMarkdownFromConfig,
	buildToolDictionaryMarkdownFromConfig,
	TOOL_DICTIONARY_TERM_KEYS,
	type WorkflowFormToolDictionaryContractConfig,
} from "../buildToolDictionary"
import { workflowFormSystemDictionary } from "../systemDictionary"

const buildWorkflowDocumentDictionaryConfig: WorkflowFormToolDictionaryContractConfig = {
	toolName: ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT,
	heading: "## build_workflow_document",
	runtimeTitle: "Workflow Document Builder Reference",
	overviewLines: ["Build a workflow-owned markdown artifact from runtime-resolved document content."],
	parameterDescriptions: {
		artifact_id: "Canonical workflow artifact id selected by the active workflow module.",
		destination_path: "Absolute destination path resolved by WorkflowRuntime.",
		content: "Fully resolved markdown content to write to the destination path.",
		workflow_value_writes: "Optional workflow-value writeback map to persist after a successful document write.",
	},
	termKeys: TOOL_DICTIONARY_TERM_KEYS,
}

describe("buildToolDictionaryMarkdownFromConfig", () => {
	it("renders configured build_workflow_document parameter rows from the schema", () => {
		const markdown = buildToolDictionaryMarkdownFromConfig(buildWorkflowDocumentDictionaryConfig)

		expect(markdown).to.include("## build_workflow_document")
		expect(markdown).to.include("- `artifact_id` (required, string):")
		expect(markdown).to.include("- `destination_path` (required, string):")
		expect(markdown).to.include("- `content` (required, string):")
	})

	it("keeps translation entries for every Phase 1 technical term used in the tool dictionary", () => {
		const markdown = buildToolDictionaryMarkdownFromConfig(buildWorkflowDocumentDictionaryConfig)

		for (const key of TOOL_DICTIONARY_TERM_KEYS) {
			expect(workflowFormSystemDictionary[key]).to.not.equal(undefined)
			expect(markdown).to.include(`\`${key}\``)
		}
	})

	it("renders any configured tool by looking up its schema through the workflow-form contract resolver", () => {
		const markdown = buildToolDictionaryMarkdownFromConfig({
			...buildWorkflowDocumentDictionaryConfig,
			termKeys: [],
		})
		const runtimeMarkdown = buildRuntimeToolDictionaryMarkdownFromConfig({
			...buildWorkflowDocumentDictionaryConfig,
			termKeys: [],
		})

		expect(markdown).to.include("## build_workflow_document")
		expect(markdown).to.include(
			"- `artifact_id` (required, string): Canonical workflow artifact id selected by the active workflow module.",
		)
		expect(runtimeMarkdown).to.include("## build_workflow_document")
		expect(runtimeMarkdown).to.not.include("# Workflow UI Surface Tool Dictionary")
	})
})

describe("buildRuntimeToolDictionaryMarkdownFromConfig", () => {
	it("renders the runtime tool reference without internal workflow-ui-surface framing", () => {
		const markdown = buildRuntimeToolDictionaryMarkdownFromConfig(buildWorkflowDocumentDictionaryConfig)

		expect(markdown).to.include("## build_workflow_document")
		expect(markdown).to.include("- `artifact_id` (required, string):")
		expect(markdown).to.include("- `destination_path` (required, string):")
		expect(markdown).to.include("- `content` (required, string):")
		expect(markdown).to.include("### Parameters")
		expect(markdown).to.include("### Term Reference")
		expect(markdown).to.not.include("# Workflow UI Surface Tool Dictionary")
		expect(markdown).to.not.include("Generated from")
	})
})
