import { EmptyRequest } from "@shared/proto/cline/common"
import { describe, it } from "mocha"
import sinon from "sinon"
import { Controller } from ".."
import { cancelTask } from "./cancelTask"

describe("controller/task/cancelTask", () => {
	it("preserves the thread-visible reopen path for user-facing cancel requests", async () => {
		const controller = {
			cancelTask: sinon.stub().resolves(),
		}

		await cancelTask(controller as unknown as Controller, EmptyRequest.create({}))

		sinon.assert.calledOnceWithExactly(controller.cancelTask, true)
	})
})
