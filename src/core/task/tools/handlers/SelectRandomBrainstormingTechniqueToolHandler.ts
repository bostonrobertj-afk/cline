import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { selectRandomBrainstormingTechnique } from "@core/workflows/brainstormingTechniqueLibrary"
import { getActivePlaceholderWorkflowStepDetails } from "@core/workflows/placeholder-workflow-step-details"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"

async function resolveActiveBrainstormingStepFour(config: TaskConfig) {
	if (!config.taskState.activePlaceholderWorkflowSource || !config.taskState.currentFocusChainChecklist?.trim()) {
		return undefined
	}

	return await getActivePlaceholderWorkflowStepDetails({
		checklistMarkdown: config.taskState.currentFocusChainChecklist,
		source: config.taskState.activePlaceholderWorkflowSource,
		stablePlaceholderValues: config.taskState.activePlaceholderWorkflowStableValues,
		placeholderValues: config.taskState.activePlaceholderWorkflowValues,
	})
}

function isBrainstormingStepFour(workflowName?: string, stepNumber?: number): boolean {
	const normalized = workflowName?.replaceAll("\\", "/").split("/").at(-1)?.trim().toLowerCase()
	return (normalized === "brainstorming.md" || normalized === "brainstorming") && stepNumber === 4
}

export class SelectRandomBrainstormingTechniqueToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.SELECT_RANDOM_BRAINSTORMING_TECHNIQUE

	getDescription(_block: ToolUse): string {
		return "[select_random_brainstorming_technique]"
	}

	async execute(config: TaskConfig, _block: ToolUse): Promise<ToolResponse> {
		try {
			const activeStep = await resolveActiveBrainstormingStepFour(config)
			if (!isBrainstormingStepFour(activeStep?.sourceName, activeStep?.stepNumber)) {
				return formatResponse.toolError(
					"select_random_brainstorming_technique can only be used while brainstorming.md Step 4 is the active placeholder workflow context.",
				)
			}

			const technique = await selectRandomBrainstormingTechnique(config.cwd)
			return formatResponse.toolResult(
				JSON.stringify({
					technique_name: technique.techniqueName,
					technique_description: technique.description,
					technique_category: technique.category,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
