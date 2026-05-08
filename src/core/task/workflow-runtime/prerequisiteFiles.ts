import fs from "fs/promises"
import path from "path"

import {
	isWorkflowDiscoveryTargetPathSegment,
	resolveWorkflowDiscoveryTargetDirectory,
} from "@/core/task/workflow-runtime/discovery"
import type { WorkflowPrerequisiteFileDefinition, WorkflowWorkspacePathPolicy } from "@/core/task/workflow-runtime/types"

const alphaCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })

export interface WorkflowPrerequisiteFileCandidate {
	filename: string
	absolutePath: string
	projectRelativePath: string
}

export interface DiscoverWorkflowPrerequisiteFileCandidatesRequest {
	selectedProjectRoot: string
	prerequisite: WorkflowPrerequisiteFileDefinition
	workspacePathPolicy: WorkflowWorkspacePathPolicy
}

function hasNodeErrorCode(error: unknown, code: string): boolean {
	if (!(error instanceof Error) || !("code" in error)) {
		return false
	}

	return error.code === code
}

function matchesPrerequisiteFileDefinition(filename: string, prerequisite: WorkflowPrerequisiteFileDefinition): boolean {
	if (prerequisite.match.kind === "exact_filename") {
		return filename === prerequisite.match.filename
	}

	prerequisite.match.pattern.lastIndex = 0
	return prerequisite.match.pattern.test(filename)
}

function comparePrerequisiteFileCandidates(
	left: WorkflowPrerequisiteFileCandidate,
	right: WorkflowPrerequisiteFileCandidate,
): number {
	const alphaComparison = alphaCollator.compare(left.filename, right.filename)

	if (alphaComparison !== 0) {
		return alphaComparison
	}

	if (left.filename < right.filename) {
		return -1
	}

	if (left.filename > right.filename) {
		return 1
	}

	return left.absolutePath.localeCompare(right.absolutePath)
}

export async function discoverWorkflowPrerequisiteFileCandidates({
	selectedProjectRoot,
	prerequisite,
	workspacePathPolicy,
}: DiscoverWorkflowPrerequisiteFileCandidatesRequest): Promise<WorkflowPrerequisiteFileCandidate[]> {
	for (const segment of prerequisite.projectSubfolderSegments) {
		if (!isWorkflowDiscoveryTargetPathSegment(segment)) {
			throw new Error(`Invalid workflow prerequisite file target path segment: ${JSON.stringify(segment)}`)
		}
	}

	const prerequisiteDirectory = resolveWorkflowDiscoveryTargetDirectory({
		rootDirectory: selectedProjectRoot,
		targetPathSegments: prerequisite.projectSubfolderSegments,
	})

	if (!workspacePathPolicy.validateAccess(prerequisiteDirectory)) {
		throw new Error(`Workflow prerequisite file directory is blocked by workspace path policy: ${prerequisiteDirectory}`)
	}

	try {
		const entries = await fs.readdir(prerequisiteDirectory, { withFileTypes: true })

		return entries
			.filter((entry) => entry.isFile())
			.filter((entry) => matchesPrerequisiteFileDefinition(entry.name, prerequisite))
			.map((entry) => {
				const absolutePath = path.join(prerequisiteDirectory, entry.name)
				return {
					filename: entry.name,
					absolutePath,
					projectRelativePath: path.join(...prerequisite.projectSubfolderSegments, entry.name),
				}
			})
			.filter((candidate) => workspacePathPolicy.validateAccess(candidate.absolutePath))
			.sort(comparePrerequisiteFileCandidates)
	} catch (error) {
		if (hasNodeErrorCode(error, "ENOENT")) {
			return []
		}

		throw error
	}
}
