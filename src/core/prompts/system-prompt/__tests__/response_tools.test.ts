import { expect } from "chai"
import { describe, it } from "mocha"
import { getCurrentModeResponseToolsLine, getResponseToolsSection } from "../components/response_tools"
import type { SystemPromptContext } from "../types"

const makeContext = (overrides: Partial<SystemPromptContext> = {}): SystemPromptContext =>
	({
		ide: "TestIde",
		providerInfo: {
			mode: "act",
			providerId: "test",
			model: { id: "test-model", info: { supportsPromptCache: false } },
		},
		yoloModeToggled: false,
		...overrides,
	}) as SystemPromptContext

describe("response tools prompt helpers", () => {
	it("omits workflow_progress_request from non-native ACT response tools", () => {
		const context = makeContext()

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`attempt_completion`")
		expect(currentModeLine).to.contain("`ask_followup_question`")
		expect(currentModeLine).to.contain("`send_user_message`")
		expect(currentModeLine).to.not.contain("`workflow_progress_request`")
		expect(currentModeLine).to.not.contain("`act_mode_respond`")
		expect(responseToolsSection).to.contain("- `attempt_completion`: Use once at the end of each workflow")
		expect(responseToolsSection).to.contain(
			"- `ask_followup_question`: Use to ask a question + present options for user to select",
		)
		expect(responseToolsSection).to.contain("- `send_user_message`: Use by default to send messages to the user")
		expect(responseToolsSection).to.not.contain("- `workflow_progress_request`:")
		expect(responseToolsSection).to.not.contain("- `act_mode_respond`:")
	})

	it("omits workflow_progress_request from non-native PLAN response tools", () => {
		const context = makeContext({ providerInfo: { ...makeContext().providerInfo, mode: "plan" } })

		const currentModeLine = getCurrentModeResponseToolsLine(context)
		const responseToolsSection = getResponseToolsSection(context)

		expect(currentModeLine).to.contain("`generate_plan_output`")
		expect(currentModeLine).to.contain("`ask_followup_question`")
		expect(currentModeLine).to.contain("`send_user_message`")
		expect(currentModeLine).to.not.contain("`workflow_progress_request`")
		expect(currentModeLine).to.not.contain("`act_mode_respond`")
		expect(responseToolsSection).to.contain("- `generate_plan_output`: Use to present a structured plan")
		expect(responseToolsSection).to.not.contain("- `workflow_progress_request`:")
	})

	it("includes workflow_progress_request in ACT response tools only when native visibility includes it", () => {
		const context = makeContext({
			enableNativeToolCalls: true,
			visibleNativeToolNames: [
				"attempt_completion",
				"ask_followup_question",
				"workflow_progress_request",
				"send_user_message",
			],
		})

		expect(getCurrentModeResponseToolsLine(context)).to.contain("`workflow_progress_request`")
		expect(getResponseToolsSection(context)).to.contain(
			"- `workflow_progress_request`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing",
		)
	})

	it("omits workflow_progress_request from ACT response tools when native visibility excludes it", () => {
		const context = makeContext({
			enableNativeToolCalls: true,
			visibleNativeToolNames: ["attempt_completion", "ask_followup_question", "send_user_message"],
		})

		expect(getCurrentModeResponseToolsLine(context)).to.not.contain("`workflow_progress_request`")
		expect(getResponseToolsSection(context)).to.not.contain("`workflow_progress_request`")
	})

	it("includes workflow_progress_request in PLAN response tools only when native visibility includes it", () => {
		const context = makeContext({
			providerInfo: { ...makeContext().providerInfo, mode: "plan" },
			enableNativeToolCalls: true,
			visibleNativeToolNames: [
				"generate_plan_output",
				"ask_followup_question",
				"workflow_progress_request",
				"send_user_message",
			],
		})

		expect(getCurrentModeResponseToolsLine(context)).to.contain("`workflow_progress_request`")
		expect(getCurrentModeResponseToolsLine(context)).to.not.contain("`act_mode_respond`")
		expect(getResponseToolsSection(context)).to.contain(
			"- `workflow_progress_request`: Use when the active workflow step is complete and you need the runtime-owned Yes/No confirmation before advancing",
		)
	})

	it("mentions act_mode_respond only when it is visible in native ACT mode", () => {
		const visibleContext = makeContext({
			enableNativeToolCalls: true,
			visibleNativeToolNames: [
				"attempt_completion",
				"ask_followup_question",
				"workflow_progress_request",
				"send_user_message",
				"act_mode_respond",
			],
		})

		expect(getCurrentModeResponseToolsLine(visibleContext)).to.contain("`act_mode_respond`")
		expect(getResponseToolsSection(visibleContext)).to.contain("`act_mode_respond`")

		const hiddenContext = makeContext({
			enableNativeToolCalls: true,
			visibleNativeToolNames: [
				"attempt_completion",
				"ask_followup_question",
				"workflow_progress_request",
				"send_user_message",
			],
		})

		expect(getCurrentModeResponseToolsLine(hiddenContext)).to.not.contain("`act_mode_respond`")
		expect(getResponseToolsSection(hiddenContext)).to.not.contain("`act_mode_respond`")
	})
})
