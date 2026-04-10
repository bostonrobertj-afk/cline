import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { discoverBrainstormingSessions, resolveBrainstormingSessionDirectory } from "@core/workflows/brainstormingSessionFiles"
import { getActivePlaceholderWorkflowStepDetails } from "@core/workflows/placeholder-workflow-step-details"
import { isPrepareBrainstormingSessionStep } from "@/shared/prepare-brainstorming-session"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import { persistWorkflowPlaceholderValues } from "./SetWorkflowPlaceholdersToolHandler"

async function resolveActiveBrainstormingStepTwo(config: TaskConfig) {
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

export class SelectBrainstormingSessionToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.SELECT_BRAINSTORMING_SESSION

	getDescription(_block: ToolUse): string {
		return "[select_brainstorming_session]"
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			const activeStep = await resolveActiveBrainstormingStepTwo(config)
			if (!isPrepareBrainstormingSessionStep(activeStep?.sourceName, activeStep?.stepNumber)) {
				return formatResponse.toolError(
					"select_brainstorming_session can only be used while brainstorming.md Step 2 is the active placeholder workflow context.",
				)
			}

			const selectedOutputFile = typeof block.params?.output_file === "string" ? block.params.output_file.trim() : ""
			if (!selectedOutputFile) {
				return formatResponse.toolError("select_brainstorming_session requires a non-empty 'output_file' value.")
			}

			const sessionDirectory = resolveBrainstormingSessionDirectory(config)
			if (!sessionDirectory) {
				return formatResponse.toolError(
					"Could not resolve workflow placeholder 'output_folder' from the active placeholder workflow state.",
				)
			}

			const sessions = await discoverBrainstormingSessions(sessionDirectory)
			if (!sessions.some((session) => session.absolutePath === selectedOutputFile)) {
				return formatResponse.toolError(
					"select_brainstorming_session requires an existing canonical brainstorming session path.",
				)
			}

			await persistWorkflowPlaceholderValues(config, { output_file: selectedOutputFile })
			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					artifact_path: selectedOutputFile,
					output_file_available: true,
					selected: true,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
