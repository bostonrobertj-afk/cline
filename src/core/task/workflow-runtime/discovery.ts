import fs from "fs/promises"
import path from "path"

import type { WorkflowDiscoveryCandidate, WorkflowDiscoveryRequest } from "@/core/task/workflow-runtime/types"

const alphaCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })

function resolveTargetDirectory(request: WorkflowDiscoveryRequest): string {
	return path.resolve(request.baseDirectory, ...(request.targetPathSegments ?? []))
}

function matchesEntryType(
	entry: { isDirectory(): boolean; isFile(): boolean },
	entryType: WorkflowDiscoveryRequest["entryType"],
): boolean {
	if (entryType === "any") {
		return true
	}

	return entryType === "file" ? entry.isFile() : entry.isDirectory()
}

function matchesImmediateChildrenOnly(entryName: string, immediateChildrenOnly: boolean): boolean {
	if (!immediateChildrenOnly) {
		return true
	}

	return !entryName.includes(path.posix.sep) && !entryName.includes(path.win32.sep)
}

function matchesNamingPattern(entryName: string, namingPattern?: RegExp): boolean {
	if (!namingPattern) {
		return true
	}

	namingPattern.lastIndex = 0
	return namingPattern.test(entryName)
}

function compareCandidates(
	left: WorkflowDiscoveryCandidate,
	right: WorkflowDiscoveryCandidate,
	sort: WorkflowDiscoveryRequest["sort"],
): number {
	const direction = sort === "alpha_desc" ? -1 : 1
	const alphaComparison = alphaCollator.compare(left.value, right.value)

	if (alphaComparison !== 0) {
		return alphaComparison * direction
	}

	if (left.value < right.value) {
		return -1 * direction
	}

	if (left.value > right.value) {
		return 1 * direction
	}

	return 0
}

export async function discoverWorkflowCandidates(request: WorkflowDiscoveryRequest): Promise<WorkflowDiscoveryCandidate[]> {
	const resolvedTargetDirectory = resolveTargetDirectory(request)

	try {
		const entries = await fs.readdir(resolvedTargetDirectory, { withFileTypes: true })

		return entries
			.filter((entry) => matchesEntryType(entry, request.entryType))
			.filter((entry) => matchesImmediateChildrenOnly(entry.name, request.immediateChildrenOnly))
			.filter((entry) => matchesNamingPattern(entry.name, request.namingPattern))
			.map((entry) => ({
				value: entry.name,
				label: request.buildLabel ? request.buildLabel(entry.name) : entry.name,
			}))
			.sort((left, right) => compareCandidates(left, right, request.sort))
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return []
		}

		throw error
	}
}
