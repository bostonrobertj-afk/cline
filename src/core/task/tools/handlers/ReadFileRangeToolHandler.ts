import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { getWorkspaceBasename, resolveWorkspacePath } from "@core/workspace"
import { extractFileContent } from "@integrations/misc/extract-file-content"
import { arePathsEqual, getReadablePath, isLocatedInWorkspace } from "@utils/path"
import { telemetryService } from "@/services/telemetry"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IFullyManagedTool } from "../ToolExecutorCoordinator"
import type { ToolValidator } from "../ToolValidator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { extractReadFileRange } from "../utils/readFileContentUtils"
import { ToolResultUtils } from "../utils/ToolResultUtils"

export class ReadFileRangeToolHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.FILE_READ_RANGE

	constructor(private validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		return `[${block.name} for '${block.params.path}' lines ${block.params.start_line}-${block.params.end_line}]`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const relPath = block.params.path

		const config = uiHelpers.getConfig()
		if (config.isSubagentExecution) {
			return
		}

		const sharedMessageProps = {
			tool: "readFileRange",
			path: getReadablePath(config.cwd, uiHelpers.removeClosingTag(block, "path", relPath)),
			content: undefined,
			operationIsLocatedInWorkspace: await isLocatedInWorkspace(relPath),
		}

		const partialMessage = JSON.stringify(sharedMessageProps)

		if (await uiHelpers.shouldAutoApproveToolWithPath(block.name, relPath)) {
			await uiHelpers.removeLastPartialMessageIfExistsWithType("ask", "tool")
			await uiHelpers.say("tool", partialMessage, undefined, undefined, block.partial)
		} else {
			await uiHelpers.removeLastPartialMessageIfExistsWithType("say", "tool")
			await uiHelpers.ask("tool", partialMessage, block.partial).catch(() => {})
		}
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const relPath = block.params.path
		const startLineRaw = block.params.start_line
		const endLineRaw = block.params.end_line

		const apiConfig = config.services.stateManager.getApiConfiguration()
		const currentMode = config.services.stateManager.getGlobalSettingsKey("mode")
		const provider = (currentMode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider) as string

		const pathValidation = this.validator.assertRequiredParams(block, "path", "start_line", "end_line")
		if (!pathValidation.ok) {
			config.taskState.consecutiveMistakeCount++
			if (!relPath) {
				return await config.callbacks.sayAndCreateMissingParamError(this.name, "path")
			}
			if (!startLineRaw) {
				return await config.callbacks.sayAndCreateMissingParamError(this.name, "start_line")
			}
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "end_line")
		}

		const accessValidation = this.validator.checkClineIgnorePath(relPath!)
		if (!accessValidation.ok) {
			if (!config.isSubagentExecution) {
				await config.callbacks.say("clineignore_error", relPath)
			}
			return formatResponse.toolError(formatResponse.clineIgnoreError(relPath!))
		}

		const startLine = this.parseStrictPositiveInteger(startLineRaw!)
		const endLine = this.parseStrictPositiveInteger(endLineRaw!)
		if (startLine === undefined || endLine === undefined || endLine < startLine) {
			config.taskState.consecutiveMistakeCount++
			return formatResponse.toolError(
				"Error reading file range: start_line and end_line must be 1-based integers, and end_line must be greater than or equal to start_line.",
			)
		}

		const pathResult = resolveWorkspacePath(config, relPath!, "ReadFileRangeToolHandler.execute")
		const { absolutePath, displayPath } =
			typeof pathResult === "string" ? { absolutePath: pathResult, displayPath: relPath! } : pathResult

		const fallbackAbsolutePath = resolveWorkspacePath(
			config.cwd,
			relPath!,
			"ReadFileRangeToolHandler.execute.fallback",
		) as string
		const workspaceContext = {
			isMultiRootEnabled: config.isMultiRootEnabled || false,
			usedWorkspaceHint: typeof pathResult !== "string",
			resolvedToNonPrimary: !arePathsEqual(absolutePath, fallbackAbsolutePath),
			resolutionMethod: (typeof pathResult !== "string" ? "hint" : "primary_fallback") as "hint" | "primary_fallback",
		}

		const sharedMessageProps = {
			tool: "readFileRange",
			path: getReadablePath(config.cwd, displayPath),
			content: `${absolutePath}:${startLine}-${endLine}`,
			operationIsLocatedInWorkspace: await isLocatedInWorkspace(relPath!),
		}

		const completeMessage = JSON.stringify(sharedMessageProps)
		const shouldAutoApprove =
			config.isSubagentExecution || (await config.callbacks.shouldAutoApproveToolWithPath(block.name, relPath))
		if (shouldAutoApprove) {
			if (!config.isSubagentExecution) {
				await config.callbacks.removeLastPartialMessageIfExistsWithType("ask", "tool")
				await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
			}

			telemetryService.captureToolUsage(
				config.ulid,
				block.name,
				config.api.getModel().id,
				provider,
				true,
				true,
				workspaceContext,
				block.isNativeToolCall,
			)
		} else {
			const notificationMessage = `Cline wants to read lines ${startLine}-${endLine} from ${getWorkspaceBasename(absolutePath, "ReadFileRangeToolHandler.notification")}`
			showNotificationForApproval(notificationMessage, config.autoApprovalSettings.enableNotifications)

			await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
			const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
			if (!didApprove) {
				telemetryService.captureToolUsage(
					config.ulid,
					block.name,
					config.api.getModel().id,
					provider,
					false,
					false,
					workspaceContext,
					block.isNativeToolCall,
				)
				return formatResponse.toolDenied()
			}
			telemetryService.captureToolUsage(
				config.ulid,
				block.name,
				config.api.getModel().id,
				provider,
				false,
				true,
				workspaceContext,
				block.isNativeToolCall,
			)
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

		const supportsImages = config.api.getModel().info.supportsImages ?? false
		try {
			const fileContent = await extractFileContent(absolutePath, supportsImages)
			const range = extractReadFileRange(fileContent.text, startLine, endLine)
			config.taskState.consecutiveMistakeCount = 0
			await config.services.fileContextTracker.trackFileContext(relPath!, "read_tool")
			if (fileContent.imageBlock) {
				config.taskState.userMessageContent.push(fileContent.imageBlock)
			}

			return `[File range ${range.startLine}-${range.endLine} of ${range.totalLines}] ${displayPath}\n${range.selection}`
		} catch (error) {
			config.taskState.consecutiveMistakeCount++
			const errorMessage = error instanceof Error ? error.message : String(error)
			const normalizedMessage = errorMessage.startsWith("Error reading file:")
				? errorMessage
				: `Error reading file: ${errorMessage}`
			return formatResponse.toolError(normalizedMessage)
		}
	}

	private parseStrictPositiveInteger(raw: string): number | undefined {
		const trimmed = raw.trim()
		if (!/^[1-9]\d*$/.test(trimmed)) {
			return undefined
		}

		const parsed = Number(trimmed)
		return Number.isSafeInteger(parsed) ? parsed : undefined
	}
}
