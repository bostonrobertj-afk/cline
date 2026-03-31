import type { DeterministicPlaceholderToolContext } from "./deterministicPlaceholderProgression"
import type { FocusChainChecklistUpdateResult } from "./types"

interface TaskProgressCarrier {
	name: string
	partial?: boolean
	params?: {
		task_progress?: string
	}
}

interface TaskProgressUpdateOptions {
	block: TaskProgressCarrier
	focusChainEnabled: boolean
	updateFCListFromToolResponse: (
		taskProgress: string | undefined,
		toolContext?: DeterministicPlaceholderToolContext,
	) => Promise<FocusChainChecklistUpdateResult>
}

export interface PreToolTaskProgressUpdateResult {
	skipToolExecution: boolean
	skipPostExecutionUpdate: boolean
	toolResult?: string
}

export interface PostToolTaskProgressUpdateResult {
	feedback?: string
}

export async function applyPreToolTaskProgressUpdate(
	_options: TaskProgressUpdateOptions,
): Promise<PreToolTaskProgressUpdateResult> {
	return {
		skipToolExecution: false,
		skipPostExecutionUpdate: false,
	}
}

export async function applyPostToolTaskProgressUpdate(
	options: TaskProgressUpdateOptions & {
		skipPostExecutionUpdate?: boolean
		toolContext?: DeterministicPlaceholderToolContext
	},
): Promise<PostToolTaskProgressUpdateResult> {
	const { block, focusChainEnabled, skipPostExecutionUpdate, toolContext, updateFCListFromToolResponse } = options

	if (!focusChainEnabled || block.partial || skipPostExecutionUpdate) {
		return {}
	}

	const focusChainUpdate = await updateFCListFromToolResponse(block.params?.task_progress, toolContext)
	return {
		feedback: focusChainUpdate.feedback,
	}
}
