import { Controller } from "@core/controller"
import * as openFileIntegration from "@integrations/misc/open-file"
import { Empty } from "@shared/proto/cline/common"
import { OpenFileRelativePathAtRangeRequest } from "@shared/proto/cline/file"
import * as pathUtils from "@utils/path"
import { expect } from "chai"
import { afterEach, beforeEach, describe, it } from "mocha"
import * as path from "path"
import * as sinon from "sinon"
import { Logger } from "@/shared/services/Logger"
import { openFileRelativePathAtRange } from "../openFileRelativePathAtRange"

describe("openFileRelativePathAtRange", () => {
	let sandbox: sinon.SinonSandbox
	let mockController: Controller
	let openFileIntegrationStub: sinon.SinonStub
	let getWorkspacePathStub: sinon.SinonStub
	let consoleErrorStub: sinon.SinonStub

	beforeEach(() => {
		sandbox = sinon.createSandbox()
		mockController = {} as any
		openFileIntegrationStub = sandbox.stub(openFileIntegration, "openFile")
		getWorkspacePathStub = sandbox.stub(pathUtils, "getWorkspacePath")
		consoleErrorStub = sandbox.stub(Logger, "error")
	})

	afterEach(() => {
		sandbox.restore()
	})

	it("should resolve the relative path and forward the selection to the integration layer", async () => {
		const workspacePath = "/workspace"
		const relativePath = "src/components/Test.tsx"
		const expectedAbsolutePath = path.resolve(workspacePath, relativePath)

		getWorkspacePathStub.resolves(workspacePath)

		const request = OpenFileRelativePathAtRangeRequest.create({
			relativePath,
			startLine: 12,
			startCharacter: 3,
			endLine: 18,
			endCharacter: 9,
			preserveFocus: true,
			preview: true,
		})

		const result = await openFileRelativePathAtRange(mockController, request)

		expect(result).to.deep.equal(Empty.create())
		expect(
			openFileIntegrationStub.calledOnceWithExactly(expectedAbsolutePath, true, true, {
				startLine: 12,
				startCharacter: 3,
				endLine: 18,
				endCharacter: 9,
			}),
		).to.be.true
	})

	it("should default the selection end coordinates when only the start position is provided", async () => {
		getWorkspacePathStub.resolves("/workspace")

		const request = OpenFileRelativePathAtRangeRequest.create({
			relativePath: "src/test.ts",
			startLine: 7,
		})

		await openFileRelativePathAtRange(mockController, request)

		expect(
			openFileIntegrationStub.calledOnceWithExactly(path.resolve("/workspace", "src/test.ts"), false, false, {
				startLine: 7,
				startCharacter: 1,
				endLine: 7,
				endCharacter: 1,
			}),
		).to.be.true
	})

	it("should return Empty and log an error when no workspace exists", async () => {
		getWorkspacePathStub.resolves(undefined)

		const request = OpenFileRelativePathAtRangeRequest.create({
			relativePath: "src/test.ts",
			startLine: 5,
		})

		const result = await openFileRelativePathAtRange(mockController, request)

		expect(result).to.deep.equal(Empty.create())
		expect(consoleErrorStub.calledOnce).to.be.true
		expect(openFileIntegrationStub.called).to.be.false
	})
})
