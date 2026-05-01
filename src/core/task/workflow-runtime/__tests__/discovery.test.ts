import { expect } from "chai"
import { mkdtemp, rm, writeFile } from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import path from "path"
import { discoverWorkflowCandidates } from "../discovery"
import type { WorkflowWorkspacePathPolicy } from "../types"

describe("discoverWorkflowCandidates", () => {
	let cwd: string

	beforeEach(async () => {
		cwd = await mkdtemp(path.join(tmpdir(), "workflow-discovery-test-"))
	})

	afterEach(async () => {
		await rm(cwd, { recursive: true, force: true })
	})

	function createAllowAllWorkspacePathPolicy(): WorkflowWorkspacePathPolicy {
		return {
			validateAccess: () => true,
		}
	}

	it("fails denied target directories before returning the ENOENT fallback", async () => {
		const missingDeniedDirectory = path.join(cwd, "missing-denied-directory")
		const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
			validateAccess: (filePath) => filePath !== missingDeniedDirectory,
		}

		let capturedError: unknown
		try {
			await discoverWorkflowCandidates({
				baseDirectory: cwd,
				workspacePathPolicy,
				targetPathSegments: ["missing-denied-directory"],
				entryType: "file",
				immediateChildrenOnly: true,
				sort: "alpha_asc",
			})
		} catch (error) {
			capturedError = error
		}

		expect(capturedError).to.be.instanceOf(Error)
		if (!(capturedError instanceof Error)) {
			throw new Error("Expected denied discovery target to throw.")
		}
		expect(capturedError.message).to.equal(
			`Workflow discovery target directory is blocked by workspace path policy: ${missingDeniedDirectory}`,
		)
	})

	it("filters denied child entries out of returned candidates", async () => {
		const allowedFile = path.join(cwd, "allowed.md")
		const deniedFile = path.join(cwd, "denied.md")
		await writeFile(allowedFile, "allowed", "utf8")
		await writeFile(deniedFile, "denied", "utf8")

		const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
			validateAccess: (filePath) => filePath !== deniedFile,
		}

		const candidates = await discoverWorkflowCandidates({
			baseDirectory: cwd,
			workspacePathPolicy,
			entryType: "file",
			immediateChildrenOnly: true,
			sort: "alpha_asc",
		})

		expect(candidates).to.deep.equal([{ value: "allowed.md", label: "allowed.md" }])
	})

	it("still returns an empty candidate list for allowed missing target directories", async () => {
		const candidates = await discoverWorkflowCandidates({
			baseDirectory: cwd,
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
			targetPathSegments: ["missing-allowed-directory"],
			entryType: "file",
			immediateChildrenOnly: true,
			sort: "alpha_asc",
		})

		expect(candidates).to.deep.equal([])
	})
})
