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

	it("rejects invalid target path segments before applying allow-all workspace path policy", async () => {
		const invalidTargetPathSegments: ReadonlyArray<{ readonly label: string; readonly segment: string }> = [
			{ label: "empty string", segment: "" },
			{ label: "current directory", segment: "." },
			{ label: "parent directory", segment: ".." },
			{ label: "POSIX nested path", segment: "nested/path" },
			{ label: "Windows nested path", segment: "nested\\path" },
			{ label: "absolute path", segment: path.resolve(cwd, "outside") },
			{ label: "Windows drive syntax", segment: "C:" },
		]

		for (const invalidTargetPathSegment of invalidTargetPathSegments) {
			let capturedError: unknown
			try {
				await discoverWorkflowCandidates({
					rootDirectory: cwd,
					workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
					targetPathSegments: [invalidTargetPathSegment.segment],
					entryType: "file",
					immediateChildrenOnly: true,
					sort: "alpha_asc",
				})
			} catch (error) {
				capturedError = error
			}

			expect(capturedError, invalidTargetPathSegment.label).to.be.instanceOf(Error)
			if (!(capturedError instanceof Error)) {
				throw new Error(`Expected ${invalidTargetPathSegment.label} target path segment to throw.`)
			}
			expect(capturedError.message, invalidTargetPathSegment.label).to.include(
				"Invalid workflow discovery target path segment",
			)
		}
	})

	it("rejects invalid target path segments before workspace path policy validation", async () => {
		let validateAccessCallCount = 0
		const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
			validateAccess: () => {
				validateAccessCallCount += 1
				return true
			},
		}

		let capturedError: unknown
		try {
			await discoverWorkflowCandidates({
				rootDirectory: cwd,
				workspacePathPolicy,
				targetPathSegments: [".."],
				entryType: "file",
				immediateChildrenOnly: true,
				sort: "alpha_asc",
			})
		} catch (error) {
			capturedError = error
		}

		expect(capturedError).to.be.instanceOf(Error)
		expect(validateAccessCallCount).to.equal(0)
	})

	it("fails denied target directories before returning the ENOENT fallback", async () => {
		const missingDeniedDirectory = path.join(cwd, "missing-denied-directory")
		const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
			validateAccess: (filePath) => filePath !== missingDeniedDirectory,
		}

		let capturedError: unknown
		try {
			await discoverWorkflowCandidates({
				rootDirectory: cwd,
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
			rootDirectory: cwd,
			workspacePathPolicy,
			entryType: "file",
			immediateChildrenOnly: true,
			sort: "alpha_asc",
		})

		expect(candidates).to.deep.equal([{ value: "allowed.md", label: "allowed.md" }])
	})

	it("still returns an empty candidate list for allowed missing target directories", async () => {
		const candidates = await discoverWorkflowCandidates({
			rootDirectory: cwd,
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
			targetPathSegments: ["missing-allowed-directory"],
			entryType: "file",
			immediateChildrenOnly: true,
			sort: "alpha_asc",
		})

		expect(candidates).to.deep.equal([])
	})
})
