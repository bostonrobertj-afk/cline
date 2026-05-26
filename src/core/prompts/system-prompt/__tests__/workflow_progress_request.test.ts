import { expect } from "chai"
import { describe, it } from "mocha"
import { ClineToolSet } from "@/core/prompts/system-prompt/registry/ClineToolSet"
import { registerClineToolSets } from "@/core/prompts/system-prompt/tools/init"
import { workflow_progress_request_variants } from "@/core/prompts/system-prompt/tools/workflow_progress_request"
import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"

const EXPECTED_WORKFLOW_PROGRESS_REQUEST_SPEC = {
	variant: ModelFamily.GENERIC,
	id: ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST,
	name: "workflow_progress_request",
	description: "Ask the user to confirm whether the current workflow step is ready to advance.",
	parameters: [],
}

describe("workflow_progress_request tool registration", () => {
	it("defines the exact shared/default workflow progress request tool spec", () => {
		expect(workflow_progress_request_variants).to.deep.equal([EXPECTED_WORKFLOW_PROGRESS_REQUEST_SPEC])
	})

	it("registers workflow_progress_request for native GPT-5 fallback lookup", () => {
		registerClineToolSets()

		const tool = ClineToolSet.getToolByNameWithFallback(ClineDefaultTool.WORKFLOW_PROGRESS_REQUEST, ModelFamily.NATIVE_GPT_5)

		if (tool === undefined) {
			throw new Error("Expected workflow_progress_request to resolve through ClineToolSet fallback.")
		}

		expect(tool.config).to.deep.equal(EXPECTED_WORKFLOW_PROGRESS_REQUEST_SPEC)
		expect(tool.config.parameters).to.deep.equal([])
	})
})
