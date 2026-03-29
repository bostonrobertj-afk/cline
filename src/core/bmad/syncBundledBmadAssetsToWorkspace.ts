import fs from "fs/promises"
import path from "path"
import { Logger } from "@/shared/services/Logger"
import { fileExistsAtPath } from "@/utils/fs"

const BMAD_SOURCE_PATHS = ["_bmad", path.join(".cline", "skills"), path.join(".cline", "workflow-config.yaml")]

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

async function copyBundledAssetPath(sourcePath: string, targetPath: string): Promise<void> {
	const stats = await fs.stat(sourcePath)
	if (stats.isDirectory()) {
		await copyDirectoryContents(sourcePath, targetPath)
		return
	}

	await fs.mkdir(path.dirname(targetPath), { recursive: true })
	await fs.copyFile(sourcePath, targetPath)
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

	for (const relativePath of BMAD_SOURCE_PATHS) {
		const sourcePath = path.join(extensionPath, relativePath)
		if (!(await fileExistsAtPath(sourcePath))) {
			Logger.warn(`[BMAD Sync] Packaged asset path missing, skipping: ${sourcePath}`)
			continue
		}

		const targetPath = path.join(workspacePath, relativePath)
		await copyBundledAssetPath(sourcePath, targetPath)
		Logger.log(`[BMAD Sync] Synchronized bundled assets from ${relativePath} into workspace`)
	}
}
