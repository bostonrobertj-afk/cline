import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { getPlaceholderWorkflowValueMap, resolvePlaceholderWorkflowText } from "@core/workflows/placeholder-workflow-rendering"
import { getActivePlaceholderWorkflowStepDetails } from "@core/workflows/placeholder-workflow-step-details"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import path from "path"
import { recordAndPersistPlaceholderWorkflowWriteProof } from "@/core/task/focus-chain/placeholderWorkflowWriteProofs"
import { isCaptureBrainstormingTopicStep } from "@/shared/capture-brainstorming-topic"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import { ToolResultUtils } from "../utils/ToolResultUtils"

async function atomicReplaceTextFile(filePath: string, content: string): Promise<void> {
	const parentDir = path.dirname(filePath)
	const tempFilePath = path.join(parentDir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`)

	await fs.mkdir(parentDir, { recursive: true })

	try {
		await fs.writeFile(tempFilePath, content, "utf8")
		await fs.rename(tempFilePath, filePath)
	} catch (error) {
		try {
			await fs.unlink(tempFilePath)
		} catch {
			// Ignore temp-file cleanup failures.
		}
		throw error
	}
}

async function resolveActiveBrainstormingStepThree(config: TaskConfig) {
	if (!config.taskState.activePlaceholderWorkflowSource) {
		return undefined
	}

	if (!config.taskState.currentFocusChainChecklist?.trim()) {
		return undefined
	}

	return await getActivePlaceholderWorkflowStepDetails({
		checklistMarkdown: config.taskState.currentFocusChainChecklist,
		source: config.taskState.activePlaceholderWorkflowSource,
		stablePlaceholderValues: config.taskState.activePlaceholderWorkflowStableValues,
		placeholderValues: config.taskState.activePlaceholderWorkflowValues,
	})
}

function resolveOutputFilePath(config: TaskConfig): string | undefined {
	const placeholders =
		getPlaceholderWorkflowValueMap(
			config.taskState.activePlaceholderWorkflowStableValues,
			config.taskState.activePlaceholderWorkflowValues,
		) ?? {}

	const outputFileRaw = resolvePlaceholderWorkflowText(placeholders.output_file?.trim(), placeholders)?.trim()
	if (!outputFileRaw) {
		return undefined
	}

	const resolutionBase =
		placeholders.cwd?.trim() ||
		placeholders.project_root?.trim() ||
		placeholders["project-root"]?.trim() ||
		config.taskState.activePlaceholderWorkflowStableValues?.cwd?.trim() ||
		config.cwd

	return path.isAbsolute(outputFileRaw) ? outputFileRaw : path.resolve(resolutionBase, outputFileRaw)
}

function replaceTopicSectionBody(markdown: string, topic: string): string | undefined {
	const topicHeadingMatch = /^## Topic[^\S\r\n]*\r?\n/m.exec(markdown)
	if (!topicHeadingMatch) {
		return undefined
	}

	const sectionBodyStart = topicHeadingMatch.index + topicHeadingMatch[0].length
	const remainingMarkdown = markdown.slice(sectionBodyStart)
	const nextHeadingMatch = /^##\s+/m.exec(remainingMarkdown)
	if (!nextHeadingMatch) {
		return undefined
	}

	const sectionBodyEnd = sectionBodyStart + nextHeadingMatch.index
	const newline = markdown.includes("\r\n") ? "\r\n" : "\n"
	const normalizedTopic = topic.replace(/\r?\n/g, newline)

	return markdown.slice(0, sectionBodyStart) + `${normalizedTopic}${newline}${newline}` + markdown.slice(sectionBodyEnd)
}

export class CaptureBrainstormingTopicToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.CAPTURE_BRAINSTORMING_TOPIC

	getDescription(_block: ToolUse): string {
		return "[capture_brainstorming_topic]"
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			const activeStep = await resolveActiveBrainstormingStepThree(config)
			if (!isCaptureBrainstormingTopicStep(activeStep?.sourceName, activeStep?.stepNumber)) {
				return formatResponse.toolError(
					"capture_brainstorming_topic can only be used while brainstorming.md Step 3 is the active placeholder workflow context.",
				)
			}

			const topic = typeof block.params.topic === "string" ? block.params.topic.trim() : ""
			if (!topic) {
				return formatResponse.toolError("capture_brainstorming_topic requires a non-empty 'topic' value.")
			}

			const outputFilePath = resolveOutputFilePath(config)
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

			const updatedOutputFile = replaceTopicSectionBody(outputFileContents, topic)
			if (!updatedOutputFile) {
				return formatResponse.toolError(
					"The resolved brainstorming session output file does not contain the canonical '## Topic' section.",
				)
			}

			const completeMessage = JSON.stringify({
				tool: "captureBrainstormingTopic",
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
					`Cline wants to update ${getWorkspaceBasename(outputFilePath, "CaptureBrainstormingTopic.notification")}`,
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

			return formatResponse.toolResult(
				JSON.stringify({ persisted: true, artifact_path: outputFilePath, topic_captured: true }),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
