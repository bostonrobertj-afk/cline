import { expect } from "chai"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { syncBundledBmadAssetsToWorkspace } from "./syncBundledBmadAssetsToWorkspace"

describe("syncBundledBmadAssetsToWorkspace", () => {
	const tempDirs: string[] = []

	async function makeTempDir(prefix: string): Promise<string> {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
		tempDirs.push(dir)
		return dir
	}

	afterEach(async () => {
		await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
	})

	it("overwrites matching BMAD workspace assets with the packaged extension versions", async () => {
		const extensionDir = await makeTempDir("bmad-extension-")
		const workspaceDir = await makeTempDir("bmad-workspace-")

		await fs.mkdir(path.join(extensionDir, "_bmad", "_config"), { recursive: true })
		await fs.mkdir(path.join(extensionDir, ".cline", "skills", "bmad-code-review"), { recursive: true })
		await fs.writeFile(
			path.join(extensionDir, "_bmad", "_config", "managed-workflows.json"),
			'{"version":"packaged"}',
			"utf8",
		)
		await fs.writeFile(
			path.join(extensionDir, ".cline", "skills", "bmad-code-review", "workflow.md"),
			"# packaged workflow\n",
			"utf8",
		)

		await fs.mkdir(path.join(workspaceDir, "_bmad", "_config"), { recursive: true })
		await fs.mkdir(path.join(workspaceDir, ".cline", "skills", "bmad-code-review"), { recursive: true })
		await fs.writeFile(path.join(workspaceDir, "_bmad", "_config", "managed-workflows.json"), '{"version":"stale"}', "utf8")
		await fs.writeFile(
			path.join(workspaceDir, ".cline", "skills", "bmad-code-review", "workflow.md"),
			"# stale workflow\n",
			"utf8",
		)

		await syncBundledBmadAssetsToWorkspace(extensionDir, workspaceDir)

		expect(await fs.readFile(path.join(workspaceDir, "_bmad", "_config", "managed-workflows.json"), "utf8")).to.equal(
			'{"version":"packaged"}',
		)
		expect(
			await fs.readFile(path.join(workspaceDir, ".cline", "skills", "bmad-code-review", "workflow.md"), "utf8"),
		).to.equal("# packaged workflow\n")
	})

	it("does not create BMAD assets in unrelated workspaces", async () => {
		const extensionDir = await makeTempDir("bmad-extension-")
		const workspaceDir = await makeTempDir("non-bmad-workspace-")

		await fs.mkdir(path.join(extensionDir, "_bmad", "_config"), { recursive: true })
		await fs.mkdir(path.join(extensionDir, ".cline", "skills", "bmad-code-review"), { recursive: true })
		await fs.writeFile(
			path.join(extensionDir, "_bmad", "_config", "managed-workflows.json"),
			'{"version":"packaged"}',
			"utf8",
		)

		await syncBundledBmadAssetsToWorkspace(extensionDir, workspaceDir)

		let exists = true
		try {
			await fs.access(path.join(workspaceDir, "_bmad", "_config", "managed-workflows.json"))
		} catch {
			exists = false
		}

		expect(exists).to.equal(false)
	})
})
