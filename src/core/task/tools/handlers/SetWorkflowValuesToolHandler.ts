import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import type { WorkflowValues } from "@/core/task/workflow-runtime/types"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"

function readWorkflowValues(block: ToolUse): WorkflowValues | undefined {
	const rawValues = (block.params as Record<string, unknown>).values

	if (rawValues === null || Array.isArray(rawValues) || typeof rawValues !== "object") {
		return undefined
	}

	const prototype = Object.getPrototypeOf(rawValues)
	if (prototype !== Object.prototype && prototype !== null) {
		return undefined
	}

	const entries = Object.entries(rawValues)
	if (entries.length === 0) {
		return undefined
	}

	for (const [, value] of entries) {
		if (typeof value !== "string") {
			return undefined
		}
	}

	return Object.fromEntries(entries) as WorkflowValues
}

export class SetWorkflowValuesToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.SET_WORKFLOW_VALUES

	getDescription(block: ToolUse) {
		const values = readWorkflowValues(block)
		const keys = values ? Object.keys(values) : []

		if (keys.length > 0) {
			return `[${block.name} ${keys.join(", ")}]`
		}

		return `[${block.name}]`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers) {
		const values = readWorkflowValues(block)
		if (values === undefined) {
			return
		}

		const keys = Object.keys(values)
		await uiHelpers.say("tool", JSON.stringify({ tool: "setWorkflowValues", values: keys }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const values = readWorkflowValues(block)
		if (values === undefined) {
			config.taskState.consecutiveMistakeCount++
			return formatResponse.toolError(
				"Missing required parameter 'values'. Provide a non-empty object whose property values are strings.",
			)
		}

		const keys = Object.keys(values)

		if (config.isSubagentExecution !== true) {
			await config.callbacks.say(
				"tool",
				JSON.stringify({ tool: "setWorkflowValues", values: keys }),
				undefined,
				undefined,
				false,
			)
		}

		try {
			const result = await config.workflowRuntime.applyWorkflowValueWrites({
				taskState: config.taskState,
				values,
			})

			config.taskState.consecutiveMistakeCount = 0

			const changedKeys = Object.keys(result.changedValues)
			const unchangedKeys = Object.keys(result.unchangedValues)

			if (changedKeys.length === 0) {
				const unchangedSummary = unchangedKeys.length > 0 ? unchangedKeys.join(", ") : keys.join(", ")
				return formatResponse.toolResult(
					`No workflow values changed. Existing stored values already matched the requested values: ${unchangedSummary}. Do not call set_workflow_values again unless one of those values changes.`,
				)
			}

			const unchangedSuffix = unchangedKeys.length > 0 ? ` Unchanged existing values: ${unchangedKeys.join(", ")}.` : ""
			return formatResponse.toolResult(
				`Stored ${changedKeys.length} workflow value${changedKeys.length === 1 ? "" : "s"}: ${changedKeys.join(", ")}.${unchangedSuffix}`.trim(),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount++
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
