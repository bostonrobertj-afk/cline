import { formatResponse } from "@core/prompts/responses"
import { ClineDefaultTool } from "@shared/tools"
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
	options: TaskProgressUpdateOptions,
): Promise<PreToolTaskProgressUpdateResult> {
	const { block, focusChainEnabled, updateFCListFromToolResponse } = options

	if (!focusChainEnabled || block.partial || block.name !== ClineDefaultTool.ATTEMPT) {
		return {
			skipToolExecution: false,
			skipPostExecutionUpdate: false,
		}
	}

	const focusChainUpdate = await updateFCListFromToolResponse(block.params?.task_progress)
	if (focusChainUpdate.feedback) {
		return {
			skipToolExecution: true,
			skipPostExecutionUpdate: true,
			toolResult: formatResponse.toolError(focusChainUpdate.feedback),
		}
	}

	return {
		skipToolExecution: false,
		skipPostExecutionUpdate: true,
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
