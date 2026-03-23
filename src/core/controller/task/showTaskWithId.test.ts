import { strict as assert } from "node:assert"
import { StringRequest } from "@shared/proto/cline/common"
import { describe, it } from "mocha"
import sinon from "sinon"
import { Controller } from ".."
import { showTaskWithId } from "./showTaskWithId"

describe("controller/task/showTaskWithId", () => {
	it("reopens a task from in-memory history in followup mode", async () => {
		const controller = {
			stateManager: {
				getGlobalStateKey: sinon.stub().returns([{ id: "task-1", task: "Saved task" }]),
			},
			initTask: sinon.stub().resolves(),
		}
		const request = { value: "task-1" } as StringRequest

		const response = await showTaskWithId(controller as unknown as Controller, request)

		sinon.assert.calledOnceWithExactly(
			controller.initTask,
			undefined,
			undefined,
			undefined,
			{ id: "task-1", task: "Saved task" },
			undefined,
			"followup",
		)
		assert.equal(response.id, "task-1")
		assert.equal(response.task, "Saved task")
	})

	it("reopens a task fetched from storage in followup mode", async () => {
		const controller = {
			stateManager: {
				getGlobalStateKey: sinon.stub().returns([]),
			},
			getTaskWithId: sinon.stub().resolves({
				historyItem: { id: "task-2", task: "Fetched task" },
			}),
			initTask: sinon.stub().resolves(),
		}
		const request = { value: "task-2" } as StringRequest

		const response = await showTaskWithId(controller as unknown as Controller, request)

		sinon.assert.calledOnceWithExactly(controller.getTaskWithId, "task-2")
		sinon.assert.calledOnceWithExactly(
			controller.initTask,
			undefined,
			undefined,
			undefined,
			{ id: "task-2", task: "Fetched task" },
			undefined,
			"followup",
		)
		assert.equal(response.id, "task-2")
		assert.equal(response.task, "Fetched task")
	})
})
