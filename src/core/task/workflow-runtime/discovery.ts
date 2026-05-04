import fs from "fs/promises"
import path from "path"

import type { WorkflowDiscoveryCandidate, WorkflowDiscoveryRequest } from "@/core/task/workflow-runtime/types"

const alphaCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })
const windowsDriveSyntaxPattern = /^[A-Za-z]:/

export function isWorkflowDiscoveryTargetPathSegment(segment: string): boolean {
	if (segment.length === 0) {
		return false
	}

	if (segment === "." || segment === "..") {
		return false
	}

	if (path.posix.isAbsolute(segment) || path.win32.isAbsolute(segment)) {
		return false
	}

	if (segment.includes(path.posix.sep) || segment.includes(path.win32.sep)) {
		return false
	}

	return !windowsDriveSyntaxPattern.test(segment)
}

export function resolveWorkflowDiscoveryTargetDirectory(
	request: Pick<WorkflowDiscoveryRequest, "rootDirectory" | "targetPathSegments">,
): string {
	const resolvedRootDirectory = path.resolve(request.rootDirectory)
	const targetPathSegments = request.targetPathSegments ?? []

	for (const segment of targetPathSegments) {
		if (!isWorkflowDiscoveryTargetPathSegment(segment)) {
			throw new Error(`Invalid workflow discovery target path segment: ${JSON.stringify(segment)}`)
		}
	}

	const resolvedTargetDirectory = path.resolve(resolvedRootDirectory, ...targetPathSegments)
	const relativeTargetPath = path.relative(resolvedRootDirectory, resolvedTargetDirectory)

	if (relativeTargetPath === ".." || relativeTargetPath.startsWith(`..${path.sep}`) || path.isAbsolute(relativeTargetPath)) {
		throw new Error(`Workflow discovery target directory must stay within root directory: ${resolvedTargetDirectory}`)
	}

	return resolvedTargetDirectory
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
	const resolvedTargetDirectory = resolveWorkflowDiscoveryTargetDirectory(request)

	if (!request.workspacePathPolicy.validateAccess(resolvedTargetDirectory)) {
		throw new Error(`Workflow discovery target directory is blocked by workspace path policy: ${resolvedTargetDirectory}`)
	}

	try {
		const entries = await fs.readdir(resolvedTargetDirectory, { withFileTypes: true })

		return entries
			.filter((entry) => request.workspacePathPolicy.validateAccess(path.join(resolvedTargetDirectory, entry.name)))
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
