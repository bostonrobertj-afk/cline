import { strict as assert } from "node:assert"
import { describe, it } from "mocha"
import sinon from "sinon"
import { ClineDefaultTool } from "@/shared/tools"
import {
	clearInterruptedPartialResponseToolPreviews,
	clearPartialResponseToolPreview,
	upsertPartialResponseToolSayPreview,
} from "../index"
import { TaskState } from "../TaskState"

describe("partial response tool preview helpers", () => {
	it("coalesces repeated partial updates for the same call_id into one preview row", async () => {
		const taskState = new TaskState()
		const messages: any[] = []
		const messageStateHandler = {
			getClineMessages: () => messages,
			updateClineMessage: sinon.stub().callsFake(async (index: number, update: Record<string, unknown>) => {
				messages[index] = { ...messages[index], ...update }
			}),
		}
		const say = sinon
			.stub()
			.callsFake(async (_type: string, text?: string, _images?: string[], _files?: string[], partial?: boolean) => {
				const ts = messages.length + 1
				messages.push({
					type: "say",
					say: "text",
					text,
					partial,
					ts,
				})
				return ts
			})

		const firstResult = await upsertPartialResponseToolSayPreview({
			taskState,
			messageStateHandler,
			say,
			block: {
				call_id: "call_send_user_message",
				name: ClineDefaultTool.SEND_USER_MESSAGE,
			},
			sayType: "text",
			text: "First preview",
		})
		const duplicateResult = await upsertPartialResponseToolSayPreview({
			taskState,
			messageStateHandler,
			say,
			block: {
				call_id: "call_send_user_message",
				name: ClineDefaultTool.SEND_USER_MESSAGE,
			},
			sayType: "text",
			text: "First preview",
		})
		const updatedResult = await upsertPartialResponseToolSayPreview({
			taskState,
			messageStateHandler,
			say,
			block: {
				call_id: "call_send_user_message",
				name: ClineDefaultTool.SEND_USER_MESSAGE,
			},
			sayType: "text",
			text: "Updated preview",
		})

		assert.equal(firstResult, true)
		assert.equal(duplicateResult, false)
		assert.equal(updatedResult, true)
		sinon.assert.calledOnce(say)
		sinon.assert.calledOnce(messageStateHandler.updateClineMessage)
		assert.deepEqual(messages, [
			{
				type: "say",
				say: "text",
				text: "Updated preview",
				partial: true,
				ts: 1,
			},
		])
	})

	it("removes interrupted preview rows instead of leaving them looking complete", async () => {
		const taskState = new TaskState()
		const messages: any[] = [
			{
				type: "say",
				say: "text",
				text: "Half-finished preview",
				partial: true,
				ts: 1,
			},
		]
		taskState.setPartialResponseToolPreview({
			key: "call_send_user_message",
			toolName: ClineDefaultTool.SEND_USER_MESSAGE,
			sayType: "text",
			fingerprint: "text:Half-finished preview",
			messageTs: 1,
			status: "streaming",
		})
		const messageStateHandler = {
			getClineMessages: () => messages,
			deleteClineMessage: sinon.stub().callsFake(async (index: number) => {
				messages.splice(index, 1)
			}),
		}

		const cleared = await clearPartialResponseToolPreview({
			taskState,
			messageStateHandler,
			block: {
				call_id: "call_send_user_message",
				name: ClineDefaultTool.SEND_USER_MESSAGE,
			},
			removeMessage: true,
		})

		assert.equal(cleared, true)
		assert.equal(taskState.getAllPartialResponseToolPreviews().length, 0)
		assert.equal(messages.length, 0)
	})

	it("clears all streaming response-tool previews during interruption cleanup", async () => {
		const taskState = new TaskState()
		const messages: any[] = [
			{ type: "say", say: "text", text: "one", partial: true, ts: 1 },
			{ type: "say", say: "completion_result", text: "two", partial: true, ts: 2 },
		]
		taskState.setPartialResponseToolPreview({
			key: "call_1",
			toolName: ClineDefaultTool.SEND_USER_MESSAGE,
			sayType: "text",
			fingerprint: "text:one",
			messageTs: 1,
			status: "streaming",
		})
		taskState.setPartialResponseToolPreview({
			key: "call_2",
			toolName: ClineDefaultTool.ATTEMPT,
			sayType: "completion_result",
			fingerprint: "completion_result:two",
			messageTs: 2,
			status: "streaming",
		})
		const messageStateHandler = {
			getClineMessages: () => messages,
			deleteClineMessage: sinon.stub().callsFake(async (index: number) => {
				messages.splice(index, 1)
			}),
		}

		await clearInterruptedPartialResponseToolPreviews({
			taskState,
			messageStateHandler,
		})

		assert.equal(taskState.getAllPartialResponseToolPreviews().length, 0)
		assert.equal(messages.length, 0)
		sinon.assert.calledTwice(messageStateHandler.deleteClineMessage)
	})
})
