import { expect } from "chai"
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises"
import { afterEach, beforeEach, describe, it } from "mocha"
import { tmpdir } from "os"
import path from "path"
import { discoverWorkflowPrerequisiteFileCandidates } from "../prerequisiteFiles"
import type {
	WorkflowPrerequisiteFileDefinition,
	WorkflowPrerequisiteFileMatchDefinition,
	WorkflowWorkspacePathPolicy,
} from "../types"

describe("discoverWorkflowPrerequisiteFileCandidates", () => {
	let selectedProjectRoot: string

	beforeEach(async () => {
		selectedProjectRoot = await mkdtemp(path.join(tmpdir(), "workflow-prerequisite-files-test-"))
	})

	afterEach(async () => {
		await rm(selectedProjectRoot, { recursive: true, force: true })
	})

	function createAllowAllWorkspacePathPolicy(): WorkflowWorkspacePathPolicy {
		return {
			validateAccess: () => true,
		}
	}

	function createPrerequisiteDefinition(
		match: WorkflowPrerequisiteFileMatchDefinition,
		projectSubfolderSegments: readonly string[] = ["planning"],
	): WorkflowPrerequisiteFileDefinition {
		return {
			id: "requirements",
			requirement: "required",
			projectSubfolderSegments,
			match,
			producingWorkflowName: "create-prd",
			workflowValueKey: "requirementsPath",
			outputDocumentReference: "none",
		}
	}

	async function writeProjectFile(relativePath: string, content = "content"): Promise<string> {
		const absolutePath = path.join(selectedProjectRoot, relativePath)
		await mkdir(path.dirname(absolutePath), { recursive: true })
		await writeFile(absolutePath, content, "utf8")
		return absolutePath
	}

	it("matches an exact prerequisite filename", async () => {
		const requirementsPath = await writeProjectFile(path.join("planning", "requirements.md"))
		await writeProjectFile(path.join("planning", "notes.md"))

		const candidates = await discoverWorkflowPrerequisiteFileCandidates({
			selectedProjectRoot,
			prerequisite: createPrerequisiteDefinition({
				kind: "exact_filename",
				filename: "requirements.md",
			}),
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})

		expect(candidates).to.deep.equal([
			{
				filename: "requirements.md",
				absolutePath: requirementsPath,
				projectRelativePath: path.join("planning", "requirements.md"),
			},
		])
	})

	it("matches prerequisite filenames by naming pattern and sorts by filename", async () => {
		const prd10Path = await writeProjectFile(path.join("planning", "prd-10.md"))
		await writeProjectFile(path.join("planning", "notes.md"))
		const prd2Path = await writeProjectFile(path.join("planning", "prd-2.md"))

		const candidates = await discoverWorkflowPrerequisiteFileCandidates({
			selectedProjectRoot,
			prerequisite: createPrerequisiteDefinition({
				kind: "naming_pattern",
				pattern: /^prd-\d+\.md$/,
			}),
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})

		expect(candidates).to.deep.equal([
			{
				filename: "prd-2.md",
				absolutePath: prd2Path,
				projectRelativePath: path.join("planning", "prd-2.md"),
			},
			{
				filename: "prd-10.md",
				absolutePath: prd10Path,
				projectRelativePath: path.join("planning", "prd-10.md"),
			},
		])
	})

	it("returns an empty candidate list when no prerequisite files match", async () => {
		await writeProjectFile(path.join("planning", "notes.md"))

		const candidates = await discoverWorkflowPrerequisiteFileCandidates({
			selectedProjectRoot,
			prerequisite: createPrerequisiteDefinition({
				kind: "exact_filename",
				filename: "requirements.md",
			}),
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})

		expect(candidates).to.deep.equal([])
	})

	it("scans safe nested project subfolder segments", async () => {
		const nestedRequirementsPath = await writeProjectFile(path.join("implementation", "stories", "requirements.md"))
		await writeProjectFile(path.join("planning", "requirements.md"))

		const candidates = await discoverWorkflowPrerequisiteFileCandidates({
			selectedProjectRoot,
			prerequisite: createPrerequisiteDefinition(
				{
					kind: "exact_filename",
					filename: "requirements.md",
				},
				["implementation", "stories"],
			),
			workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
		})

		expect(candidates).to.deep.equal([
			{
				filename: "requirements.md",
				absolutePath: nestedRequirementsPath,
				projectRelativePath: path.join("implementation", "stories", "requirements.md"),
			},
		])
	})

	it("rejects invalid project subfolder path segments", async () => {
		const invalidSegments: ReadonlyArray<{ readonly label: string; readonly segment: string }> = [
			{ label: "empty string", segment: "" },
			{ label: "current directory", segment: "." },
			{ label: "parent directory", segment: ".." },
			{ label: "POSIX nested path", segment: "nested/path" },
			{ label: "Windows nested path", segment: "nested\\path" },
			{ label: "absolute path", segment: path.resolve(selectedProjectRoot, "outside") },
			{ label: "Windows drive syntax", segment: "C:" },
		]

		for (const invalidSegment of invalidSegments) {
			let capturedError: unknown
			try {
				await discoverWorkflowPrerequisiteFileCandidates({
					selectedProjectRoot,
					prerequisite: createPrerequisiteDefinition(
						{
							kind: "exact_filename",
							filename: "requirements.md",
						},
						[invalidSegment.segment],
					),
					workspacePathPolicy: createAllowAllWorkspacePathPolicy(),
				})
			} catch (error) {
				capturedError = error
			}

			expect(capturedError, invalidSegment.label).to.be.instanceOf(Error)
			if (!(capturedError instanceof Error)) {
				throw new Error(`Expected ${invalidSegment.label} project subfolder segment to throw.`)
			}
			expect(capturedError.message, invalidSegment.label).to.include(
				"Invalid workflow prerequisite file target path segment",
			)
		}
	})

	it("rejects workspace-policy denied prerequisite directories", async () => {
		const prerequisiteDirectory = path.join(selectedProjectRoot, "planning")
		await mkdir(prerequisiteDirectory, { recursive: true })
		const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
			validateAccess: (filePath) => filePath !== prerequisiteDirectory,
		}

		let capturedError: unknown
		try {
			await discoverWorkflowPrerequisiteFileCandidates({
				selectedProjectRoot,
				prerequisite: createPrerequisiteDefinition({
					kind: "exact_filename",
					filename: "requirements.md",
				}),
				workspacePathPolicy,
			})
		} catch (error) {
			capturedError = error
		}

		expect(capturedError).to.be.instanceOf(Error)
		if (!(capturedError instanceof Error)) {
			throw new Error("Expected denied prerequisite directory to throw.")
		}
		expect(capturedError.message).to.equal(
			`Workflow prerequisite file directory is blocked by workspace path policy: ${prerequisiteDirectory}`,
		)
	})

	it("filters workspace-policy denied prerequisite file candidates", async () => {
		const allowedPath = await writeProjectFile(path.join("planning", "prd-allowed.md"))
		const deniedPath = await writeProjectFile(path.join("planning", "prd-denied.md"))
		const workspacePathPolicy: WorkflowWorkspacePathPolicy = {
			validateAccess: (filePath) => filePath !== deniedPath,
		}

		const candidates = await discoverWorkflowPrerequisiteFileCandidates({
			selectedProjectRoot,
			prerequisite: createPrerequisiteDefinition({
				kind: "naming_pattern",
				pattern: /^prd-.+\.md$/,
			}),
			workspacePathPolicy,
		})

		expect(candidates).to.deep.equal([
			{
				filename: "prd-allowed.md",
				absolutePath: allowedPath,
				projectRelativePath: path.join("planning", "prd-allowed.md"),
			},
		])
	})
})
