import { expect } from "chai"
import { describe, it } from "mocha"
import { getCurrentModeResponseToolsLine, getResponseToolsSection } from "../components/response_tools"
import type { SystemPromptContext } from "../types"

const baseContext = {
	providerInfo: {
		mode: "act",
		providerId: "test",
		model: {
			id: "test-model",
			info: {
				supportsPromptCache: false,
			},
		},
	},
	activePlaceholderWorkflowName: "pi-planning.md",
	activeWorkflowSupportsPlaceholders: true,
	managedWorkflowActive: false,
} as SystemPromptContext

const createStoryBaseContext = {
	providerInfo: {
		mode: "act",
		providerId: "test",
		model: {
			id: "test-model",
			info: {
				supportsPromptCache: false,
			},
		},
	},
	activePlaceholderWorkflowName: "create-story.md",
	activeWorkflowSupportsPlaceholders: true,
	managedWorkflowActive: false,
} as SystemPromptContext

describe("response tools prompt helpers", () => {
	it("includes workflow_progress_request in response tools for pi-planning step 4", () => {
		const context: SystemPromptContext = {
			...baseContext,
			activePlaceholderWorkflowStepNumber: 4,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`workflow_progress_request`")
		expect(currentModeLine).to.contain("`attempt_completion`")
		expect(currentModeLine).to.contain("`ask_followup_question`")
		expect(currentModeLine).to.contain("`send_user_message`")
		expect(responseToolsSection).to.contain("RESPONSE TOOLS")
		expect(responseToolsSection).to.contain(
			"- `workflow_progress_request`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing",
		)
	})

	it("includes workflow_progress_request in response tools for pi-planning step 5", () => {
		const context: SystemPromptContext = {
			...baseContext,
			activePlaceholderWorkflowStepNumber: 5,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`workflow_progress_request`")
		expect(currentModeLine).to.contain("`attempt_completion`")
		expect(currentModeLine).to.contain("`ask_followup_question`")
		expect(currentModeLine).to.contain("`send_user_message`")
		expect(responseToolsSection).to.contain("RESPONSE TOOLS")
		expect(responseToolsSection).to.contain(
			"- `workflow_progress_request`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing",
		)
	})

	it("omits workflow_progress_request from response tools for unsupported pi-planning step 3", () => {
		const context: SystemPromptContext = {
			...baseContext,
			activePlaceholderWorkflowStepNumber: 3,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.not.contain("`workflow_progress_request`")
		expect(responseToolsSection).to.not.contain("- `workflow_progress_request`")
	})
})

describe("create-story response tools prompt helpers", () => {
	it("includes workflow_progress_request in response tools for create-story step 3", () => {
		const context: SystemPromptContext = {
			...createStoryBaseContext,
			activePlaceholderWorkflowStepNumber: 3,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`workflow_progress_request`")
		expect(currentModeLine).to.contain("`attempt_completion`")
		expect(currentModeLine).to.contain("`ask_followup_question`")
		expect(currentModeLine).to.contain("`send_user_message`")
		expect(responseToolsSection).to.contain("RESPONSE TOOLS")
		expect(responseToolsSection).to.contain(
			"- `workflow_progress_request`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing",
		)
	})

	it("includes workflow_progress_request in response tools for create-story step 4", () => {
		const context: SystemPromptContext = {
			...createStoryBaseContext,
			activePlaceholderWorkflowStepNumber: 4,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`workflow_progress_request`")
		expect(currentModeLine).to.contain("`attempt_completion`")
		expect(currentModeLine).to.contain("`ask_followup_question`")
		expect(currentModeLine).to.contain("`send_user_message`")
		expect(responseToolsSection).to.contain("RESPONSE TOOLS")
		expect(responseToolsSection).to.contain(
			"- `workflow_progress_request`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing",
		)
	})

	it("omits workflow_progress_request from response tools for unsupported create-story step 5", () => {
		const context: SystemPromptContext = {
			...createStoryBaseContext,
			activePlaceholderWorkflowStepNumber: 5,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.not.contain("`workflow_progress_request`")
		expect(responseToolsSection).to.not.contain("- `workflow_progress_request`")
	})
})

describe("quick-dev response tools prompt helpers", () => {
	it("includes workflow_progress_request in response tools for quick-dev step 2", () => {
		const context: SystemPromptContext = {
			...createStoryBaseContext,
			activePlaceholderWorkflowName: "quick-dev.md",
			activePlaceholderWorkflowStepNumber: 2,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`workflow_progress_request`")
		expect(responseToolsSection).to.contain(
			"- `workflow_progress_request`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing",
		)
	})

	it("omits workflow_progress_request from response tools for unsupported quick-dev step 3", () => {
		const context: SystemPromptContext = {
			...createStoryBaseContext,
			activePlaceholderWorkflowName: "quick-dev.md",
			activePlaceholderWorkflowStepNumber: 3,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.not.contain("`workflow_progress_request`")
		expect(responseToolsSection).to.not.contain("- `workflow_progress_request`")
	})

	it("omits workflow_progress_request from response tools for unsupported quick-dev step 4", () => {
		const context: SystemPromptContext = {
			...createStoryBaseContext,
			activePlaceholderWorkflowName: "quick-dev.md",
			activePlaceholderWorkflowStepNumber: 4,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.not.contain("`workflow_progress_request`")
		expect(responseToolsSection).to.not.contain("- `workflow_progress_request`")
	})

	it("omits workflow_progress_request from response tools for unsupported quick-dev step 5", () => {
		const context: SystemPromptContext = {
			...createStoryBaseContext,
			activePlaceholderWorkflowName: "quick-dev.md",
			activePlaceholderWorkflowStepNumber: 5,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.not.contain("`workflow_progress_request`")
		expect(responseToolsSection).to.not.contain("- `workflow_progress_request`")
	})
})

describe("quick-spec response tools prompt helpers", () => {
	it("includes workflow_progress_request in response tools for quick-spec step 3", () => {
		const context: SystemPromptContext = {
			...createStoryBaseContext,
			activePlaceholderWorkflowName: "quick-spec.md",
			activePlaceholderWorkflowStepNumber: 3,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`workflow_progress_request`")
		expect(responseToolsSection).to.contain(
			"- `workflow_progress_request`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing",
		)
	})

	it("omits workflow_progress_request from response tools for unsupported quick-spec step 10", () => {
		const context: SystemPromptContext = {
			...createStoryBaseContext,
			activePlaceholderWorkflowName: "quick-spec.md",
			activePlaceholderWorkflowStepNumber: 10,
		}

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.not.contain("`workflow_progress_request`")
		expect(responseToolsSection).to.not.contain("- `workflow_progress_request`")
	})
})
