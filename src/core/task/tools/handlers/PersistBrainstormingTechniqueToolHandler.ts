import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import {
	atomicReplaceTextFile,
	replaceMarkdownSectionBody,
	resolveBrainstormingOutputFilePath,
} from "@core/workflows/brainstormingSessionFiles"
import { getActivePlaceholderWorkflowStepDetails } from "@core/workflows/placeholder-workflow-step-details"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import { recordAndPersistPlaceholderWorkflowWriteProof } from "@/core/task/focus-chain/placeholderWorkflowWriteProofs"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import { ToolResultUtils } from "../utils/ToolResultUtils"
import { persistWorkflowPlaceholderValues } from "./SetWorkflowPlaceholdersToolHandler"

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

function buildTechniqueSectionBody(techniqueName: string, techniqueDescription: string): string {
	return `### Techniques Used\n- ${techniqueName}: ${techniqueDescription}`
}

export class PersistBrainstormingTechniqueToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.PERSIST_BRAINSTORMING_TECHNIQUE

	getDescription(_block: ToolUse): string {
		return "[persist_brainstorming_technique]"
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			const activeStep = await resolveActiveBrainstormingStepFour(config)
			if (!isBrainstormingStepFour(activeStep?.sourceName, activeStep?.stepNumber)) {
				return formatResponse.toolError(
					"persist_brainstorming_technique can only be used while brainstorming.md Step 4 is the active placeholder workflow context.",
				)
			}

			const techniqueName = typeof block.params?.technique_name === "string" ? block.params.technique_name.trim() : ""
			const techniqueDescription =
				typeof block.params?.technique_description === "string" ? block.params.technique_description.trim() : ""
			if (!techniqueName || !techniqueDescription) {
				return formatResponse.toolError(
					"persist_brainstorming_technique requires non-empty 'technique_name' and 'technique_description' values.",
				)
			}

			const outputFilePath = resolveBrainstormingOutputFilePath(config)
			if (!outputFilePath) {
				return formatResponse.toolError(
					"Could not resolve workflow placeholder 'output_file' from the active placeholder workflow state.",
				)
			}

			let outputFileContents: string
			try {
				outputFileContents = await fs.readFile(outputFilePath, "utf8")
			} catch {
				return formatResponse.toolError(`Could not read the resolved output_file at ${outputFilePath}.`)
			}

			const updatedOutputFile = replaceMarkdownSectionBody(
				outputFileContents,
				"## Selected Techniques",
				buildTechniqueSectionBody(techniqueName, techniqueDescription),
			)
			if (!updatedOutputFile) {
				return formatResponse.toolError(
					"The resolved brainstorming session output file does not contain the canonical '## Selected Techniques' section.",
				)
			}

			const completeMessage = JSON.stringify({
				tool: "persistBrainstormingTechnique",
				path: getReadablePath(config.cwd, outputFilePath),
				content: `Brainstorming artifact: ${getReadablePath(config.cwd, outputFilePath)}`,
				operationIsLocatedInWorkspace: await isLocatedInWorkspace(outputFilePath),
			})

			const shouldAutoApprove =
				config.isSubagentExecution || (await config.callbacks.shouldAutoApproveToolWithPath(block.name, outputFilePath))

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to update ${getWorkspaceBasename(outputFilePath, "PersistBrainstormingTechnique.notification")}`,
					config.autoApprovalSettings.enableNotifications,
				)
				await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")

				const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
				if (!didApprove) {
					return formatResponse.toolDenied()
				}
			}

			try {
				const { ToolHookUtils } = await import("../utils/ToolHookUtils")
				await ToolHookUtils.runPreToolUseIfEnabled(config, block)
			} catch (error) {
				const { PreToolUseHookCancellationError } = await import("@core/hooks/PreToolUseHookCancellationError")
				if (error instanceof PreToolUseHookCancellationError) {
					return formatResponse.toolDenied()
				}
				throw error
			}

			await atomicReplaceTextFile(outputFilePath, updatedOutputFile)
			await recordAndPersistPlaceholderWorkflowWriteProof({
				taskId: config.taskId,
				taskState: config.taskState,
				filePath: outputFilePath,
			})
			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(outputFilePath.toLowerCase())
			await persistWorkflowPlaceholderValues(config, { selected_technique: techniqueName })

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					artifact_path: outputFilePath,
					selected_technique: techniqueName,
					technique_persisted: true,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
