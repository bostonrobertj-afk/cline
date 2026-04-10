import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import {
	readCanonicalBrainstormingTemplate,
	resolveBrainstormingSessionDirectory,
	resolveNextBrainstormingSessionPath,
} from "@core/workflows/brainstormingSessionFiles"
import { getActivePlaceholderWorkflowStepDetails } from "@core/workflows/placeholder-workflow-step-details"
import { buildWorkflowStablePlaceholders } from "@core/workflows/workflow-placeholders"
import fs from "fs/promises"
import { recordAndPersistPlaceholderWorkflowWriteProof } from "@/core/task/focus-chain/placeholderWorkflowWriteProofs"
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

export class CreateBrainstormingSessionToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.CREATE_BRAINSTORMING_SESSION

	getDescription(_block: ToolUse): string {
		return "[create_brainstorming_session]"
	}

	async execute(config: TaskConfig, _block: ToolUse): Promise<ToolResponse> {
		try {
			const activeStep = await resolveActiveBrainstormingStepTwo(config)
			if (!isPrepareBrainstormingSessionStep(activeStep?.sourceName, activeStep?.stepNumber)) {
				return formatResponse.toolError(
					"create_brainstorming_session can only be used while brainstorming.md Step 2 is the active placeholder workflow context.",
				)
			}

			const sessionDirectory = resolveBrainstormingSessionDirectory(config)
			if (!sessionDirectory) {
				return formatResponse.toolError(
					"Could not resolve workflow placeholder 'output_folder' from the active placeholder workflow state.",
				)
			}

			const templateContents = await readCanonicalBrainstormingTemplate(config.cwd)
			const stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd: config.cwd })
			const date = stablePlaceholders.date?.trim()
			if (!date) {
				throw new Error("Could not resolve stable placeholder 'date' from workflow runtime state.")
			}

			await fs.mkdir(sessionDirectory, { recursive: true })
			const artifactPath = await resolveNextBrainstormingSessionPath(sessionDirectory, date)
			await fs.writeFile(artifactPath, templateContents, "utf8")
			await recordAndPersistPlaceholderWorkflowWriteProof({
				taskId: config.taskId,
				taskState: config.taskState,
				filePath: artifactPath,
			})
			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(artifactPath.toLowerCase())
			await persistWorkflowPlaceholderValues(config, { output_file: artifactPath })

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					artifact_path: artifactPath,
					output_file_available: true,
					created: true,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
