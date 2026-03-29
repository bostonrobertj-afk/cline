import path from "node:path"
import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { getWorkspaceBasename, resolveWorkspacePath } from "@core/workspace"
import { extractFileContent, type FileContentResult } from "@integrations/misc/extract-file-content"
import { arePathsEqual, getReadablePath, isLocatedInWorkspace } from "@utils/path"
import { telemetryService } from "@/services/telemetry"
import { ClineSayTool } from "@/shared/ExtensionMessage"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IFullyManagedTool } from "../ToolExecutorCoordinator"
import type { ToolValidator } from "../ToolValidator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { buildReadFileDelta, createReadFileSnapshot, evaluateFullSourceReadAllowance } from "../utils/readFileContentUtils"
import { ToolResultUtils } from "../utils/ToolResultUtils"

export class ReadFileToolHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.FILE_READ

	constructor(private validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		return `[${block.name} for '${block.params.path}']`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const relPath = block.params.path

		const config = uiHelpers.getConfig()
		if (config.isSubagentExecution) {
			return
		}

		// Create and show partial UI message
		const sharedMessageProps = {
			tool: "readFile",
			path: getReadablePath(config.cwd, uiHelpers.removeClosingTag(block, "path", relPath)),
			content: undefined,
			operationIsLocatedInWorkspace: await isLocatedInWorkspace(relPath),
		}

		const partialMessage = JSON.stringify(sharedMessageProps)

		// Handle auto-approval vs manual approval for partial
		if (await uiHelpers.shouldAutoApproveToolWithPath(block.name, relPath)) {
			await uiHelpers.removeLastPartialMessageIfExistsWithType("ask", "tool")
			await uiHelpers.say("tool", partialMessage, undefined, undefined, block.partial)
		} else {
			await uiHelpers.removeLastPartialMessageIfExistsWithType("say", "tool")
			await uiHelpers.ask("tool", partialMessage, block.partial).catch(() => {})
		}
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const relPath: string | undefined = block.params.path

		// Extract provider information for telemetry
		const apiConfig = config.services.stateManager.getApiConfiguration()
		const currentMode = config.services.stateManager.getGlobalSettingsKey("mode")
		const provider = (currentMode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider) as string

		// Validate required parameters
		const pathValidation = this.validator.assertRequiredParams(block, "path")
		if (!pathValidation.ok) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "path")
		}

		// Check clineignore access
		const accessValidation = this.validator.checkClineIgnorePath(relPath!)
		if (!accessValidation.ok) {
			if (!config.isSubagentExecution) {
				await config.callbacks.say("clineignore_error", relPath)
			}
			return formatResponse.toolError(formatResponse.clineIgnoreError(relPath!))
		}

		// Resolve the absolute path based on multi-workspace configuration
		const pathResult = resolveWorkspacePath(config, relPath!, "ReadFileToolHandler.execute")
		const { absolutePath, displayPath } =
			typeof pathResult === "string" ? { absolutePath: pathResult, displayPath: relPath! } : pathResult

		// Determine workspace context for telemetry
		const fallbackAbsolutePath = path.resolve(config.cwd, relPath ?? "")
		const workspaceContext = {
			isMultiRootEnabled: config.isMultiRootEnabled || false,
			usedWorkspaceHint: typeof pathResult !== "string", // multi-root path result indicates hint usage
			resolvedToNonPrimary: !arePathsEqual(absolutePath, fallbackAbsolutePath),
			resolutionMethod: (typeof pathResult !== "string" ? "hint" : "primary_fallback") as "hint" | "primary_fallback",
		}

		// Handle approval flow
		const sharedMessageProps = {
			tool: "readFile",
			path: getReadablePath(config.cwd, displayPath),
			content: absolutePath,
			operationIsLocatedInWorkspace: await isLocatedInWorkspace(relPath!),
		} satisfies ClineSayTool

		const completeMessage = JSON.stringify(sharedMessageProps)

		const shouldAutoApprove =
			config.isSubagentExecution || (await config.callbacks.shouldAutoApproveToolWithPath(block.name, relPath))
		if (shouldAutoApprove) {
			// Auto-approval flow
			if (!config.isSubagentExecution) {
				await config.callbacks.removeLastPartialMessageIfExistsWithType("ask", "tool")
				await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
			}

			// Capture telemetry
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
			// Manual approval flow
			const notificationMessage = `Cline wants to read ${getWorkspaceBasename(absolutePath, "ReadFileToolHandler.notification")}`

			// Show notification
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

		// Run PreToolUse hook after approval but before execution
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

		// === File Read Deduplication ===
		// Repeated reads of the same file in a task can now return either a compact
		// unchanged notice or a local diff against the cached snapshot, which keeps
		// the model current without replaying the entire file every time.
		const cacheKey = absolutePath.toLowerCase()
		const cached = config.taskState.fileReadCache.get(cacheKey)
		const supportsImages = config.api.getModel().info.supportsImages ?? false

		if (cached) {
			cached.readCount++

			const currentMtime = await this.getFileMtime(absolutePath)
			if (currentMtime === undefined) {
				config.taskState.fileReadCache.delete(cacheKey)
			} else if (currentMtime === cached.mtime && cached.snapshotText) {
				config.taskState.consecutiveMistakeCount = 0
				return `[File unchanged since last read] '${displayPath}' has not changed since your previous full read in this task. Reuse the content you already have. If you need a focused refresher, use read_file_range for the relevant 1-based lines.`
			} else {
				let fileContent: FileContentResult
				try {
					fileContent = await extractFileContent(absolutePath, supportsImages)
				} catch (error) {
					config.taskState.consecutiveMistakeCount++
					const errorMessage = error instanceof Error ? error.message : String(error)
					const normalizedMessage = errorMessage.startsWith("Error reading file:")
						? errorMessage
						: `Error reading file: ${errorMessage}`
					return formatResponse.toolError(normalizedMessage)
				}

				if (!fileContent.imageBlock) {
					const allowance = evaluateFullSourceReadAllowance(fileContent.text)
					if (!allowance.allowed) {
						config.taskState.consecutiveMistakeCount = 0
						return `[Full file read blocked] '${displayPath}' is ${allowance.totalLines} lines / ${allowance.totalBytes} bytes, which exceeds the 300-line / 16384-byte full-read limit. Use read_file_range with explicit 1-based start_line and end_line values for the smallest relevant section.`
					}
				}

				config.taskState.consecutiveMistakeCount = 0
				await config.services.fileContextTracker.trackFileContext(relPath!, "read_tool")

				if (fileContent.imageBlock) {
					config.taskState.userMessageContent.push(fileContent.imageBlock)
				}

				const updatedMtime = currentMtime ?? (await this.getFileMtime(absolutePath)) ?? 0
				const snapshotText = createReadFileSnapshot(fileContent.text, !!fileContent.imageBlock)
				config.taskState.fileReadCache.set(cacheKey, {
					readCount: cached.readCount,
					mtime: updatedMtime,
					imageBlock: fileContent.imageBlock,
					snapshotText,
				})

				if (cached.snapshotText && fileContent.text === cached.snapshotText) {
					return `[File unchanged since last read] '${displayPath}' content matches your previous full read in this task, even though the file timestamp changed. Reuse the content you already have. If you need a focused refresher, use read_file_range for the relevant 1-based lines.`
				}

				if (currentMtime !== cached.mtime && cached.snapshotText && snapshotText) {
					const delta = buildReadFileDelta(displayPath, cached.snapshotText, fileContent.text)
					if (delta) {
						return delta
					}
				}

				return fileContent.text
			}
		}

		// Execute the actual file read operation
		let fileContent: FileContentResult
		try {
			fileContent = await extractFileContent(absolutePath, supportsImages)
		} catch (error) {
			// Return a graceful tool error instead of crashing. This allows the
			// model to see the error (e.g. "File not found") and recover by
			// trying a different path, rather than terminating the entire task.
			config.taskState.consecutiveMistakeCount++
			const errorMessage = error instanceof Error ? error.message : String(error)
			const normalizedMessage = errorMessage.startsWith("Error reading file:")
				? errorMessage
				: `Error reading file: ${errorMessage}`
			return formatResponse.toolError(normalizedMessage)
		}

		if (!fileContent.imageBlock) {
			const allowance = evaluateFullSourceReadAllowance(fileContent.text)
			if (!allowance.allowed) {
				config.taskState.consecutiveMistakeCount = 0
				return `[Full file read blocked] '${displayPath}' is ${allowance.totalLines} lines / ${allowance.totalBytes} bytes, which exceeds the 300-line / 16384-byte full-read limit. Use read_file_range with explicit 1-based start_line and end_line values for the smallest relevant section.`
			}
		}

		// Only reset mistake count after a successful read, so that repeated
		// file-not-found errors accumulate toward the yolo-mode mistake limit.
		config.taskState.consecutiveMistakeCount = 0

		// Track file read operation
		await config.services.fileContextTracker.trackFileContext(relPath!, "read_tool")

		// Cache metadata for deduplication (no content stored — saves memory)
		let mtime = 0
		mtime = (await this.getFileMtime(absolutePath)) ?? 0
		config.taskState.fileReadCache.set(cacheKey, {
			readCount: 1,
			mtime,
			imageBlock: fileContent.imageBlock,
			snapshotText: createReadFileSnapshot(fileContent.text, !!fileContent.imageBlock),
		})

		// Handle image blocks separately - they need to be pushed to userMessageContent
		if (fileContent.imageBlock) {
			config.taskState.userMessageContent.push(fileContent.imageBlock)
		}

		return fileContent.text
	}

	private async getFileMtime(absolutePath: string): Promise<number | undefined> {
		try {
			const stat = await import("node:fs/promises").then((fs) => fs.stat(absolutePath))
			return stat.mtimeMs
		} catch {
			return undefined
		}
	}
}
