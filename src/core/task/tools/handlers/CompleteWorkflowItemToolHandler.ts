import type { ToolUse } from "@core/assistant-message"
import { getTaskMetadata, saveTaskMetadata } from "@core/storage/disk"
import { completeManagedWorkflowItem } from "@core/task/managed-workflows/ManagedWorkflowController"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

export class CompleteWorkflowItemToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.COMPLETE_WORKFLOW_ITEM

	getDescription(block: ToolUse): string {
		const itemId = block.params["item_id"] as string | undefined
		return itemId ? `[${block.name} ${itemId}]` : `[${block.name}]`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const itemId = block.params["item_id"] as string | undefined
		const message = JSON.stringify({ tool: "completeWorkflowItem", itemId: itemId || "" })
		await uiHelpers.say("tool", message, undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const itemId = block.params["item_id"] as string | undefined
		const currentRun = config.taskState.managedWorkflowRun

		if (!currentRun) {
			config.taskState.consecutiveMistakeCount++
			return "Error: No managed workflow is currently active."
		}

		if (!itemId) {
			config.taskState.consecutiveMistakeCount++
			return "Error: Missing required parameter 'item_id'."
		}

		if (!config.isSubagentExecution) {
			const message = JSON.stringify({ tool: "completeWorkflowItem", itemId })
			await config.callbacks.say("tool", message, undefined, undefined, false)
		}

		const updatedRun = completeManagedWorkflowItem(currentRun, itemId)
		config.taskState.managedWorkflowRun = updatedRun
		config.taskState.activeWorkflowId = updatedRun.workflowId

		try {
			const metadata = await getTaskMetadata(config.taskId)
			metadata.activeWorkflowId = updatedRun.workflowId
			metadata.managedWorkflowRun = updatedRun
			await saveTaskMetadata(config.taskId, metadata)
		} catch {
			// Non-fatal: in-memory state remains canonical for the active task.
		}

		await config.callbacks.updateFCListFromToolResponse(undefined)

		const currentPhase = updatedRun.phases[updatedRun.currentPhaseIndex]
		const phaseMessage = currentPhase ? `Current phase: ${currentPhase.title}.` : "All required workflow phases are complete."

		return `Marked workflow item "${itemId}" complete. ${phaseMessage}`
	}
}
