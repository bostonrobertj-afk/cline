import { expect } from "chai"
import { StreamResponseHandler } from "../StreamResponseHandler"

describe("StreamResponseHandler", () => {
	it("upgrades placeholder tool call ids when the real OpenAI Responses call_id arrives later", () => {
		const handler = new StreamResponseHandler()
		const { toolUseHandler } = handler.getHandlers()

		toolUseHandler.processToolUseDelta(
			{
				type: "tool_use",
				id: "fc_0ad17b3bd677d97e0069bcce385b648193a2ccc93a433d1581",
				name: "execute_command",
			},
			undefined,
		)

		toolUseHandler.processToolUseDelta(
			{
				type: "tool_use",
				id: "fc_0ad17b3bd677d97e0069bcce385b648193a2ccc93a433d1581",
				input: '{"command":"pwd"}',
			},
			"call_real_123",
		)

		const toolUses = toolUseHandler.getPartialToolUsesAsContent()
		expect(toolUses).to.have.length(1)
		expect(toolUses[0].call_id).to.equal("call_real_123")
	})

	it("retains finalized native tool call ids for parity validation after streaming completes", () => {
		const handler = new StreamResponseHandler()
		const { toolUseHandler } = handler.getHandlers()

		toolUseHandler.processToolUseDelta(
			{
				type: "tool_use",
				id: "fc_read_1",
				name: "read_file",
				input: '{"path":"src/index.ts"}',
			},
			"call_read_1",
		)
		toolUseHandler.processToolUseDelta(
			{
				type: "tool_use",
				id: "fc_read_2",
				name: "read_file",
				input: '{"path":"src/other.ts"}',
			},
			"call_read_2",
		)

		const finalizedToolUses = toolUseHandler.getAllFinalizedToolUses()

		expect(finalizedToolUses.map((toolUse) => toolUse.call_id)).to.deep.equal(["call_read_1", "call_read_2"])
	})
})
