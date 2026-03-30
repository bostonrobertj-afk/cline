import fs from "fs/promises"
import path from "path"
import { getTaskMetadata, saveTaskMetadata } from "@/core/storage/disk"
import { arePathsEqual } from "@/utils/path"
import type { TaskState } from "../TaskState"

export function normalizePlaceholderWorkflowWriteProofPath(filePath: string): string {
	return path.resolve(filePath)
}

export function taskStateHasPlaceholderWorkflowWriteProof(
	taskState: Pick<TaskState, "activePlaceholderWorkflowTaskWriteProofPaths">,
	filePath: string,
): boolean {
	const normalizedCandidatePath = normalizePlaceholderWorkflowWriteProofPath(filePath)
	return taskState.activePlaceholderWorkflowTaskWriteProofPaths.some((storedPath) =>
		arePathsEqual(storedPath, normalizedCandidatePath),
	)
}

export async function fileExistsForPlaceholderWorkflowWriteProof(filePath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(filePath)
		return stats.isFile()
	} catch {
		return false
	}
}

export async function recordAndPersistPlaceholderWorkflowWriteProof(args: {
	taskId: string
	taskState: TaskState
	filePath: string
}): Promise<void> {
	const normalizedFilePath = normalizePlaceholderWorkflowWriteProofPath(args.filePath)

	if (!taskStateHasPlaceholderWorkflowWriteProof(args.taskState, normalizedFilePath)) {
		args.taskState.activePlaceholderWorkflowTaskWriteProofPaths.push(normalizedFilePath)
	}

	try {
		const metadata = await getTaskMetadata(args.taskId)
		metadata.activePlaceholderWorkflowTaskWriteProofPaths = [...args.taskState.activePlaceholderWorkflowTaskWriteProofPaths]
		await saveTaskMetadata(args.taskId, metadata)
	} catch {
		// Non-fatal: successful writes should still count for the active task even if metadata persistence fails.
	}
}
