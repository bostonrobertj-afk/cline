import fs from "fs/promises"
import path from "path"
import { Logger } from "@/shared/services/Logger"
import { fileExistsAtPath } from "@/utils/fs"

const BMAD_SOURCE_DIRECTORIES = ["_bmad", path.join(".cline", "skills")]

async function copyDirectoryContents(sourceDir: string, targetDir: string): Promise<void> {
	await fs.mkdir(targetDir, { recursive: true })
	const entries = await fs.readdir(sourceDir, { withFileTypes: true })

	for (const entry of entries) {
		const sourcePath = path.join(sourceDir, entry.name)
		const targetPath = path.join(targetDir, entry.name)

		if (entry.isDirectory()) {
			await copyDirectoryContents(sourcePath, targetPath)
			continue
		}

		if (entry.isFile()) {
			await fs.mkdir(path.dirname(targetPath), { recursive: true })
			await fs.copyFile(sourcePath, targetPath)
		}
	}
}

async function isBmadWorkspace(workspacePath: string): Promise<boolean> {
	return (
		(await fileExistsAtPath(path.join(workspacePath, "_bmad"))) ||
		(await fileExistsAtPath(path.join(workspacePath, ".cline", "skills")))
	)
}

export async function syncBundledBmadAssetsToWorkspace(extensionPath: string, workspacePath?: string): Promise<void> {
	if (!workspacePath) {
		return
	}

	if (!(await isBmadWorkspace(workspacePath))) {
		return
	}

	for (const relativeDir of BMAD_SOURCE_DIRECTORIES) {
		const sourceDir = path.join(extensionPath, relativeDir)
		if (!(await fileExistsAtPath(sourceDir))) {
			Logger.warn(`[BMAD Sync] Packaged asset directory missing, skipping: ${sourceDir}`)
			continue
		}

		const targetDir = path.join(workspacePath, relativeDir)
		await copyDirectoryContents(sourceDir, targetDir)
		Logger.log(`[BMAD Sync] Synchronized bundled assets from ${relativeDir} into workspace`)
	}
}
