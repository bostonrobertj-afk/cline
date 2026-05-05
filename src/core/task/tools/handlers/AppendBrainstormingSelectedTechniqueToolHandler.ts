import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import type { ActiveWorkflowSession, WorkflowValue, WorkflowValues } from "@/core/task/workflow-runtime/types"
import {
	type BrainstormingTechnique,
	findBrainstormingTechniqueByIdOrName,
} from "@/core/task/workflow-runtime/workflow-modules/brainstorming/brainstormingTechniqueRegistry"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"

interface AppendBrainstormingSelectedTechniqueRequest {
	name: string
	description: string
	id: string | undefined
	category: string | undefined
}

const SELECTED_TECHNIQUES_WORKFLOW_VALUE_KEY = "selected_techniques"

function readRawParameter(block: ToolUse, parameterName: string): unknown {
	return Object.entries(block.params).find(([key]) => key === parameterName)?.[1]
}

function readRequiredStringParameter(block: ToolUse, parameterName: string): string | undefined {
	const value = readRawParameter(block, parameterName)
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	if (trimmedValue === "") {
		return undefined
	}

	return trimmedValue
}

function readOptionalStringParameter(block: ToolUse, parameterName: string): string | undefined | "invalid" {
	const value = readRawParameter(block, parameterName)
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== "string") {
		return "invalid"
	}

	const trimmedValue = value.trim()
	if (trimmedValue === "") {
		return "invalid"
	}

	return trimmedValue
}

function parseRequest(block: ToolUse): AppendBrainstormingSelectedTechniqueRequest | undefined {
	const name = readRequiredStringParameter(block, "name")
	const description = readRequiredStringParameter(block, "description")
	const id = readOptionalStringParameter(block, "id")
	const category = readOptionalStringParameter(block, "category")

	if (name === undefined || description === undefined || id === "invalid" || category === "invalid") {
		return undefined
	}

	return {
		name,
		description,
		id,
		category,
	}
}

function findAcceptedTechnique(request: AppendBrainstormingSelectedTechniqueRequest): BrainstormingTechnique | undefined {
	if (request.id !== undefined) {
		return findBrainstormingTechniqueByIdOrName({ id: request.id })
	}

	return findBrainstormingTechniqueByIdOrName({ name: request.name })
}

function isWorkflowObject(value: WorkflowValue): value is WorkflowValues {
	return typeof value === "object" && !Array.isArray(value)
}

function readExistingSelectedTechniques(session: ActiveWorkflowSession): readonly WorkflowValues[] | "invalid" {
	const value = session.workflowValues[SELECTED_TECHNIQUES_WORKFLOW_VALUE_KEY]
	if (value === undefined) {
		return []
	}

	if (!Array.isArray(value)) {
		return "invalid"
	}

	if (!value.every((entry) => isWorkflowObject(entry))) {
		return "invalid"
	}

	return value
}

function buildSelectedTechniqueValue(technique: BrainstormingTechnique): WorkflowValues {
	return {
		id: technique.id,
		name: technique.name,
		category: technique.category,
		description: technique.description,
	}
}

function normalizeTechniqueDedupValue(value: string): string {
	return value.trim().toLowerCase()
}

function readNormalizedTechniqueValue(technique: WorkflowValues, key: "id" | "name"): string | undefined {
	const value = technique[key]
	if (typeof value !== "string") {
		return undefined
	}

	const normalizedValue = normalizeTechniqueDedupValue(value)
	if (normalizedValue === "") {
		return undefined
	}

	return normalizedValue
}

function hasSelectedTechnique(existingSelectedTechniques: readonly WorkflowValues[], selectedTechnique: WorkflowValues): boolean {
	const selectedTechniqueId = readNormalizedTechniqueValue(selectedTechnique, "id")
	const selectedTechniqueName = readNormalizedTechniqueValue(selectedTechnique, "name")

	return existingSelectedTechniques.some((existingTechnique) => {
		const existingTechniqueId = readNormalizedTechniqueValue(existingTechnique, "id")
		if (
			selectedTechniqueId !== undefined &&
			existingTechniqueId !== undefined &&
			existingTechniqueId === selectedTechniqueId
		) {
			return true
		}

		const existingTechniqueName = readNormalizedTechniqueValue(existingTechnique, "name")
		return (
			selectedTechniqueName !== undefined &&
			existingTechniqueName !== undefined &&
			existingTechniqueName === selectedTechniqueName
		)
	})
}

export class AppendBrainstormingSelectedTechniqueToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.APPEND_BRAINSTORMING_SELECTED_TECHNIQUE

	getDescription(_block: ToolUse): string {
		return "[append_brainstorming_selected_technique]"
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		if (config.taskState.activeWorkflowName !== "brainstorming" || config.taskState.activeWorkflowSession === undefined) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(
				"append_brainstorming_selected_technique can only be used while the brainstorming workflow is active.",
			)
		}

		const request = parseRequest(block)
		if (request === undefined) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(
				"Missing required parameters. Provide non-empty string values for 'name' and 'description'. Optional 'id' and 'category' values must be non-empty strings when provided.",
			)
		}

		const acceptedTechnique = findAcceptedTechnique(request)
		if (acceptedTechnique === undefined) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(
				"Unknown brainstorming technique. Provide a technique id or name from get_brainstorming_methods.",
			)
		}

		const session = config.taskState.activeWorkflowSession
		const existingSelectedTechniques = readExistingSelectedTechniques(session)
		if (existingSelectedTechniques === "invalid") {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError("Workflow value 'selected_techniques' must be absent or an array of objects.")
		}

		const selectedTechnique = buildSelectedTechniqueValue(acceptedTechnique)
		const alreadySelected = hasSelectedTechnique(existingSelectedTechniques, selectedTechnique)
		const updatedSelectedTechniques: WorkflowValue[] = alreadySelected
			? [...existingSelectedTechniques]
			: [...existingSelectedTechniques, selectedTechnique]

		try {
			const workflowValueWriteResult = await config.workflowRuntime.applyWorkflowValueWrites({
				taskState: config.taskState,
				values: {
					[SELECTED_TECHNIQUES_WORKFLOW_VALUE_KEY]: updatedSelectedTechniques,
				},
			})
			const changedWorkflowValueKeys = Object.keys(workflowValueWriteResult.changedValues)
			const selectedTechniquesChanged = changedWorkflowValueKeys.includes(SELECTED_TECHNIQUES_WORKFLOW_VALUE_KEY)

			if (!alreadySelected && !selectedTechniquesChanged) {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError("Unable to persist 'selected_techniques' through the active workflow value seam.")
			}

			if (selectedTechniquesChanged) {
				const nextAction = await config.workflowRuntime.resolveNextAction({ taskState: config.taskState })
				if (nextAction.kind !== "no_op") {
					config.callbacks.queueWorkflowNextAction(nextAction)
				}
			}

			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: selectedTechniquesChanged,
					duplicate: alreadySelected,
					selected_techniques: updatedSelectedTechniques,
					changed_workflow_value_keys: changedWorkflowValueKeys,
					unchanged_workflow_value_keys: Object.keys(workflowValueWriteResult.unchangedValues),
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
