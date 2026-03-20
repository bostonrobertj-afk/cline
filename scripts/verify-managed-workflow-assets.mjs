#!/usr/bin/env node

import { execFileSync } from "child_process"
import fs from "fs"
import minimatch from "minimatch"
import path from "path"
import { REGISTRY_PATH, SUPPORTED_MANAGED_WORKFLOWS } from "./managed-workflows.shared.mjs"

const cwd = process.cwd()

function parseArgs(argv) {
	const options = {
		archive: undefined,
		archivePrefix: "",
	}

	for (const arg of argv) {
		if (arg.startsWith("--archive=")) {
			options.archive = arg.slice("--archive=".length)
		} else if (arg === "--archive") {
			throw new Error("Use --archive=<path> when verifying an archive.")
		} else if (arg.startsWith("--archive-prefix=")) {
			options.archivePrefix = arg.slice("--archive-prefix=".length)
		}
	}

	return options
}

function parseVscodeIgnore() {
	const rawIgnore = fs.readFileSync(path.join(cwd, ".vscodeignore"), "utf8")
	const parsedIgnore = rawIgnore
		.split(/[\n\r]/)
		.map((line) => line.trim())
		.filter(Boolean)
		.filter((line) => !/^\s*#/.test(line))

	return [
		...parsedIgnore,
		...parsedIgnore
			.filter((pattern) => !/(^|\/)[^/]*\*[^/]*$/.test(pattern))
			.map((pattern) => (/\/$/.test(pattern) ? `${pattern}**` : `${pattern}/**`)),
	]
}

function createIgnoreMatcher() {
	const patterns = parseVscodeIgnore()
	const ignore = patterns.filter((pattern) => !pattern.startsWith("!"))
	const negate = patterns.filter((pattern) => pattern.startsWith("!")).map((pattern) => pattern.slice(1))

	return (targetPath) => {
		const normalizedPath = targetPath.split(path.sep).join("/")
		const isIncludedAgain = negate.some((pattern) => minimatch(normalizedPath, pattern, { dot: true }))
		if (isIncludedAgain) {
			return false
		}

		return ignore.some((pattern) => minimatch(normalizedPath, pattern, { dot: true }))
	}
}

function ensureFileExists(targetPath, label, failures) {
	if (!fs.existsSync(path.join(cwd, targetPath))) {
		failures.push(`${label} is missing: ${targetPath}`)
	}
}

function listArchiveEntries(archivePath) {
	const resolvedArchive = path.resolve(cwd, archivePath)
	if (!fs.existsSync(resolvedArchive)) {
		throw new Error(`Archive is missing: ${archivePath}`)
	}

	const output = execFileSync("unzip", ["-Z1", resolvedArchive], {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	})

	return new Set(
		output
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean),
	)
}

function verifySourceTree(registry, failures) {
	const ignoreMatcher = createIgnoreMatcher()
	const expectedIds = new Set(SUPPORTED_MANAGED_WORKFLOWS.map((workflow) => workflow.workflowId))
	const actualIds = new Set(registry.map((workflow) => workflow.workflowId))

	for (const workflowId of expectedIds) {
		if (!actualIds.has(workflowId)) {
			failures.push(`Registry entry missing for managed workflow: ${workflowId}`)
		}
	}

	for (const workflow of registry) {
		if (!expectedIds.has(workflow.workflowId)) {
			failures.push(`Unexpected managed workflow present in registry: ${workflow.workflowId}`)
		}

		ensureFileExists(workflow.skillPath, `${workflow.workflowId} skillPath`, failures)
		ensureFileExists(workflow.workflowPath, `${workflow.workflowId} workflowPath`, failures)

		if (workflow.checklistPath) {
			ensureFileExists(workflow.checklistPath, `${workflow.workflowId} checklistPath`, failures)
		}

		for (const phaseRoot of workflow.phaseRoots ?? []) {
			if (!fs.existsSync(path.join(cwd, phaseRoot))) {
				failures.push(`${workflow.workflowId} phase root is missing: ${phaseRoot}`)
			}
		}

		for (const assetPath of workflow.packagedAssetPaths ?? []) {
			ensureFileExists(assetPath, `${workflow.workflowId} packaged asset`, failures)
			if (ignoreMatcher(assetPath)) {
				failures.push(`${workflow.workflowId} packaged asset is excluded by .vscodeignore: ${assetPath}`)
			}
		}
	}
}

function verifyArchive(registry, archivePath, archivePrefix, failures) {
	const archiveEntries = listArchiveEntries(archivePath)
	const normalizedPrefix = archivePrefix ? archivePrefix.replace(/\\/g, "/").replace(/\/?$/, "/") : ""
	const requiredArchivePaths = new Set([REGISTRY_PATH, ...registry.flatMap((workflow) => workflow.packagedAssetPaths)])

	for (const requiredPath of requiredArchivePaths) {
		const expectedEntry = `${normalizedPrefix}${requiredPath}`.replace(/\\/g, "/")
		if (!archiveEntries.has(expectedEntry)) {
			failures.push(`Archive is missing required managed workflow asset: ${expectedEntry}`)
		}
	}
}

function main() {
	const { archive, archivePrefix } = parseArgs(process.argv.slice(2))
	const registryPath = path.join(cwd, REGISTRY_PATH)
	if (!fs.existsSync(registryPath)) {
		throw new Error(`Managed workflow registry is missing: ${REGISTRY_PATH}`)
	}

	const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"))
	const failures = []

	verifySourceTree(registry, failures)

	if (archive) {
		verifyArchive(registry, archive, archivePrefix, failures)
	}

	if (failures.length > 0) {
		throw new Error(`Managed workflow asset verification failed:\n- ${failures.join("\n- ")}`)
	}

	const assetCount = registry.reduce((sum, workflow) => sum + workflow.packagedAssetPaths.length, 0)
	if (archive) {
		console.log(
			`Verified ${registry.length} managed workflows, ${assetCount} source assets, and archive contents for ${archive}.`,
		)
	} else {
		console.log(`Verified ${registry.length} managed workflows and ${assetCount} packaged assets in the source tree.`)
	}
}

try {
	main()
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
}
