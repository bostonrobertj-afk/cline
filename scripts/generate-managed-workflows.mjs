#!/usr/bin/env node

import fs from "fs/promises"
import path from "path"
import { PHASE_ROOT_CANDIDATES, REGISTRY_PATH, SUPPORTED_MANAGED_WORKFLOWS } from "./managed-workflows.shared.mjs"

const cwd = process.cwd()

async function fileExists(targetPath) {
	try {
		await fs.access(targetPath)
		return true
	} catch {
		return false
	}
}

async function collectFiles(dirPath, basePath = dirPath) {
	const entries = await fs.readdir(dirPath, { withFileTypes: true })
	const files = []

	for (const entry of entries) {
		const absPath = path.join(dirPath, entry.name)
		if (entry.isDirectory()) {
			files.push(...(await collectFiles(absPath, basePath)))
			continue
		}

		if (entry.isFile()) {
			files.push(path.relative(cwd, absPath).split(path.sep).join("/"))
		}
	}

	return files.sort((left, right) => left.localeCompare(right))
}

async function resolveWorkflowPath(skillDir, workflow) {
	const overrideCandidate = workflow.workflowPathOverride ? [workflow.workflowPathOverride] : []
	const candidates = [...overrideCandidate, "workflow.yaml", "workflow.md", "instructions.md", "SKILL.md"]
	for (const candidate of candidates) {
		const absPath = path.join(skillDir, candidate)
		if (await fileExists(absPath)) {
			return path.relative(cwd, absPath).split(path.sep).join("/")
		}
	}

	throw new Error(`No workflow source found in ${skillDir}`)
}

async function resolvePhaseRoots(skillDir) {
	const roots = []

	for (const candidate of PHASE_ROOT_CANDIDATES) {
		const absPath = path.join(skillDir, candidate)
		try {
			const stat = await fs.stat(absPath)
			if (stat.isDirectory()) {
				roots.push(path.relative(cwd, absPath).split(path.sep).join("/"))
			}
		} catch {
			// Missing directories are allowed.
		}
	}

	return roots
}

async function buildRegistry() {
	const registry = []

	for (const workflow of SUPPORTED_MANAGED_WORKFLOWS) {
		const skillDir = path.join(cwd, ".cline", "skills", workflow.workflowId)
		const skillPath = path.join(skillDir, "SKILL.md")

		if (!(await fileExists(skillPath))) {
			throw new Error(`Managed workflow skill is missing SKILL.md: ${workflow.workflowId}`)
		}

		const workflowPath = await resolveWorkflowPath(skillDir, workflow)
		const checklistPath = (await fileExists(path.join(skillDir, "checklist.md")))
			? path.relative(cwd, path.join(skillDir, "checklist.md")).split(path.sep).join("/")
			: null

		registry.push({
			workflowId: workflow.workflowId,
			slashCommand: workflow.workflowId,
			skillName: workflow.workflowId,
			module: workflow.module,
			skillPath: path.relative(cwd, skillPath).split(path.sep).join("/"),
			workflowPath,
			aliases: workflow.aliases ?? [],
			phaseRoots: await resolvePhaseRoots(skillDir),
			checklistPath,
			supportsManagedExecution: true,
			strategyHints: workflow.strategyHints ?? [],
			extractionMode: workflow.extractionMode ?? "linear",
			primaryStepRange: workflow.primaryStepRange ?? null,
			packagedAssetPaths: await collectFiles(skillDir),
		})
	}

	return registry.sort((left, right) => left.workflowId.localeCompare(right.workflowId))
}

async function main() {
	const registry = await buildRegistry()
	const outputPath = path.join(cwd, REGISTRY_PATH)
	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8")
	console.log(`Generated ${REGISTRY_PATH} with ${registry.length} managed workflows.`)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
