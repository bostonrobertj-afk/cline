import type { ToolUse } from "@core/assistant-message"
import { getTaskMetadata, saveTaskMetadata } from "@core/storage/disk"
import { applyManagedWorkflowDynamicPlaceholders } from "@core/task/managed-workflows/placeholders"
import type { ManagedWorkflowRunState } from "@core/task/managed-workflows/types"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

function parseWorkflowPlaceholderValues(values: unknown): Record<string, unknown> {
	if (!values || typeof values !== "object" || Array.isArray(values)) {
		return {}
	}

	return values as Record<string, unknown>
}

function getWorkflowPlaceholderValues(block: ToolUse): Record<string, unknown> | undefined {
	return parseWorkflowPlaceholderValues((block.params as Record<string, unknown>).values)
}

function getNextStepGuidance(isManagedWorkflow: boolean): string {
	if (isManagedWorkflow) {
		return "Continue the current workflow step or call complete_workflow_item if that step is finished."
	}

	return "Continue the current placeholder workflow step. If that step is now complete, include the full current checklist as task_progress on your next tool call, keep the same step labels and order, change only the completed step from `- [ ]` to `- [x]`, and leave future steps unchecked."
}

export class SetWorkflowPlaceholdersToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.SET_WORKFLOW_PLACEHOLDERS

	private applyGenericWorkflowPlaceholders(
		workflowId: string,
		currentStablePlaceholders: Record<string, string> | undefined,
		currentPlaceholders: Record<string, string> | undefined,
		values: Record<string, unknown>,
	) {
		const syntheticRun: ManagedWorkflowRunState = {
			workflowId,
			slashCommand: workflowId,
			status: "active",
			currentPhaseIndex: 0,
			phases: [],
			createdAt: 0,
			updatedAt: 0,
			allRequiredComplete: false,
			stablePlaceholders: currentStablePlaceholders,
			dynamicPlaceholders: currentPlaceholders,
		}

		return applyManagedWorkflowDynamicPlaceholders(syntheticRun, values)
	}

	getDescription(block: ToolUse): string {
		const values = getWorkflowPlaceholderValues(block)
		const keys = values ? Object.keys(values) : []
		return keys.length > 0 ? `[${block.name} ${keys.join(", ")}]` : `[${block.name}]`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const values = getWorkflowPlaceholderValues(block) ?? {}
		const keys = Object.keys(values)
		if (keys.length === 0) {
			return
		}

		const message = JSON.stringify({ tool: "setWorkflowPlaceholders", values: keys })
		await uiHelpers.say("tool", message, undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const currentRun = config.taskState.managedWorkflowRun
		const genericWorkflowId = !currentRun ? config.taskState.activePlaceholderWorkflowId : undefined
		if (!currentRun && !genericWorkflowId) {
			config.taskState.consecutiveMistakeCount++
			return "Error: No active workflow with placeholder support is currently active."
		}

		const values = getWorkflowPlaceholderValues(block) ?? {}
		const keys = Object.keys(values)
		if (keys.length === 0) {
			config.taskState.consecutiveMistakeCount++
			return "Error: Missing required parameter 'values'. Provide at least one placeholder value to store."
		}

		if (!config.isSubagentExecution) {
			const message = JSON.stringify({ tool: "setWorkflowPlaceholders", values: keys })
			await config.callbacks.say("tool", message, undefined, undefined, false)
		}

		let changedKeys: string[]
		let unchangedKeys: string[]
		let unchangedDynamicKeys: string[]
		let unchangedStableKeys: string[]

		if (currentRun) {
			const managedResult = applyManagedWorkflowDynamicPlaceholders(currentRun, values)
			config.taskState.managedWorkflowRun = managedResult.run
			config.taskState.activeWorkflowId = config.taskState.managedWorkflowRun.workflowId
			changedKeys = managedResult.changedKeys
			unchangedKeys = managedResult.unchangedKeys
			unchangedDynamicKeys = managedResult.unchangedDynamicKeys
			unchangedStableKeys = managedResult.unchangedStableKeys
		} else {
			if (!genericWorkflowId) {
				config.taskState.consecutiveMistakeCount++
				return "Error: No active workflow with placeholder support is currently active."
			}

			const genericResult = this.applyGenericWorkflowPlaceholders(
				genericWorkflowId,
				config.taskState.activePlaceholderWorkflowStableValues,
				config.taskState.activePlaceholderWorkflowValues,
				values,
			)
			config.taskState.activePlaceholderWorkflowValues = genericResult.run.dynamicPlaceholders
			changedKeys = genericResult.changedKeys
			unchangedKeys = genericResult.unchangedKeys
			unchangedDynamicKeys = genericResult.unchangedDynamicKeys
			unchangedStableKeys = genericResult.unchangedStableKeys
		}

		const nextStepGuidance = getNextStepGuidance(!!currentRun)

		if (changedKeys.length === 0) {
			config.taskState.consecutiveMistakeCount = 0
			if (unchangedDynamicKeys.length > 0 && unchangedStableKeys.length === 0) {
				return `No workflow placeholder values changed. Existing stored values already matched the requested values: ${unchangedDynamicKeys.join(", ")}. Do not call set_workflow_placeholders again unless one of those values changes. ${nextStepGuidance}`
			}

			if (unchangedStableKeys.length > 0 && unchangedDynamicKeys.length === 0) {
				return `Success: workflow placeholder values were already available and matched the requested values: ${unchangedStableKeys.join(", ")}. Do not call set_workflow_placeholders again unless one of those values changes. ${nextStepGuidance}`
			}

			const unchangedSummary = unchangedKeys.length > 0 ? unchangedKeys.join(", ") : keys.join(", ")
			return `No workflow placeholder values changed. Existing workflow placeholders already matched the requested values: ${unchangedSummary}. Do not call set_workflow_placeholders again unless one of those values changes. ${nextStepGuidance}`
		}

		if (!config.isSubagentExecution) {
			try {
				const metadata = await getTaskMetadata(config.taskId)
				metadata.activeWorkflowId = config.taskState.activeWorkflowId
				metadata.activePlaceholderWorkflowId = config.taskState.activePlaceholderWorkflowId
				metadata.activePlaceholderWorkflowSource = config.taskState.activePlaceholderWorkflowSource
				metadata.activePlaceholderWorkflowStableValues = config.taskState.activePlaceholderWorkflowStableValues
				metadata.activePlaceholderWorkflowValues = config.taskState.activePlaceholderWorkflowValues
				metadata.managedWorkflowRun = config.taskState.managedWorkflowRun
				await saveTaskMetadata(config.taskId, metadata)
			} catch {
				// Non-fatal: the in-memory managed workflow run remains canonical for the active task.
			}
		}

		await config.callbacks.updateFCListFromToolResponse(undefined)
		config.taskState.consecutiveMistakeCount = 0

		const unchangedSuffix = unchangedKeys.length > 0 ? ` Unchanged existing values: ${unchangedKeys.join(", ")}.` : ""
		return `Stored ${changedKeys.length} workflow placeholder${changedKeys.length === 1 ? "" : "s"}: ${changedKeys.join(", ")}.${unchangedSuffix} ${nextStepGuidance}`.trim()
	}
}
