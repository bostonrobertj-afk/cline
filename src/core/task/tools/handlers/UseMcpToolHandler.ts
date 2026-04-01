import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import type { McpConnection } from "@services/mcp/types"
import { ClineAsk, ClineAskUseMcpServer } from "@shared/ExtensionMessage"
import type { McpToolCallResponse } from "@shared/mcp"
import { telemetryService } from "@/services/telemetry"
import { truncateContent } from "@/shared/content-limits"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IFullyManagedTool } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import {
	evaluateFullSourceReadAllowance,
	findTrackedSourceOverlap,
	recordTrackedSourceWindow,
} from "../utils/readFileContentUtils"
import { ToolResultUtils } from "../utils/ToolResultUtils"

export class UseMcpToolHandler implements IFullyManagedTool {
	readonly name = ClineDefaultTool.MCP_USE

	getDescription(block: ToolUse): string {
		return `[${block.name} for '${block.params.server_name}']`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const server_name = block.params.server_name
		const tool_name = block.params.tool_name
		const mcp_arguments = block.params.arguments

		const partialMessage = JSON.stringify({
			type: "use_mcp_tool",
			serverName: uiHelpers.removeClosingTag(block, "server_name", server_name),
			toolName: uiHelpers.removeClosingTag(block, "tool_name", tool_name),
			arguments: uiHelpers.removeClosingTag(block, "arguments", mcp_arguments),
		} satisfies ClineAskUseMcpServer)

		// Check if tool should be auto-approved using MCP-specific logic
		const config = uiHelpers.getConfig()
		const shouldAutoApprove = config.callbacks.shouldAutoApproveTool(block.name)

		if (shouldAutoApprove) {
			await uiHelpers.removeLastPartialMessageIfExistsWithType("ask", "use_mcp_server")
			await uiHelpers.say("use_mcp_server", partialMessage, undefined, undefined, block.partial)
		} else {
			await uiHelpers.removeLastPartialMessageIfExistsWithType("say", "use_mcp_server")
			await uiHelpers.ask("use_mcp_server" as ClineAsk, partialMessage, block.partial).catch(() => {})
		}
	}

	private hasExplicitReadSourceTarget(parsedArguments: Record<string, unknown> | undefined): boolean {
		if (!parsedArguments) {
			return false
		}

		const symbol = parsedArguments.symbol
		const startLine = parsedArguments.start_line
		const endLine = parsedArguments.end_line

		return (
			(typeof symbol === "string" && symbol.trim().length > 0) ||
			((typeof startLine === "number" || typeof startLine === "string") &&
				(typeof endLine === "number" || typeof endLine === "string"))
		)
	}

	private normalizeReadSourcePayload(item: McpToolCallResponse["content"][number]):
		| {
				displayPath: string
				source: string
				startLine: number
				endLine: number
		  }
		| undefined {
		const resource = item?.resource
		if (!resource || typeof resource !== "object") {
			return undefined
		}

		const candidate = resource as Record<string, unknown>
		const source = typeof candidate.source === "string" ? candidate.source : undefined
		const rawStartLine = candidate.start_line
		const rawEndLine = candidate.end_line
		const startLine = typeof rawStartLine === "number" ? rawStartLine : Number(rawStartLine)
		const endLine = typeof rawEndLine === "number" ? rawEndLine : Number(rawEndLine)
		const displayPath =
			(typeof candidate.path === "string" && candidate.path) ||
			(typeof candidate.file_path === "string" && candidate.file_path) ||
			(typeof candidate.uri === "string" && candidate.uri) ||
			"(unknown path)"

		if (!source || !Number.isFinite(startLine) || !Number.isFinite(endLine)) {
			return undefined
		}

		return {
			displayPath,
			source,
			startLine,
			endLine,
		}
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const server_name: string | undefined = block.params.server_name
		const tool_name: string | undefined = block.params.tool_name
		const mcp_arguments: string | undefined = block.params.arguments

		// Extract provider information for telemetry
		const apiConfig = config.services.stateManager.getApiConfiguration()
		const currentMode = config.services.stateManager.getGlobalSettingsKey("mode")
		const provider = (currentMode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider) as string

		// Validate required parameters
		if (!server_name) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(block.name, "server_name")
		}

		if (!tool_name) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(block.name, "tool_name")
		}

		// Parse and validate arguments if provided
		let parsedArguments: Record<string, unknown> | undefined
		if (mcp_arguments) {
			try {
				parsedArguments = JSON.parse(mcp_arguments)
			} catch (_error) {
				config.taskState.consecutiveMistakeCount++
				await config.callbacks.say("error", `Cline tried to use ${tool_name} with an invalid JSON argument. Retrying...`)
				return formatResponse.toolError(formatResponse.invalidMcpToolArgumentError(server_name, tool_name))
			}
		}

		config.taskState.consecutiveMistakeCount = 0

		// Handle approval flow
		const completeMessage = JSON.stringify({
			type: "use_mcp_tool",
			serverName: server_name,
			toolName: tool_name,
			arguments: mcp_arguments,
		} satisfies ClineAskUseMcpServer)

		const isToolAutoApproved = config.services.mcpHub.connections
			?.find((conn: McpConnection) => conn.server.name === server_name)
			?.server.tools?.find((tool) => tool.name === tool_name)?.autoApprove

		if (config.callbacks.shouldAutoApproveTool(block.name) || isToolAutoApproved) {
			// Auto-approval flow
			await config.callbacks.removeLastPartialMessageIfExistsWithType("ask", "use_mcp_server")
			await config.callbacks.say("use_mcp_server", completeMessage, undefined, undefined, false)

			// Capture telemetry
			telemetryService.captureToolUsage(
				config.ulid,
				block.name,
				config.api.getModel().id,
				provider,
				true,
				true,
				undefined,
				block.isNativeToolCall,
			)
		} else {
			// Manual approval flow
			const notificationMessage = `Cline wants to use ${tool_name || "unknown tool"} on ${server_name || "unknown server"}`

			// Show notification
			showNotificationForApproval(notificationMessage, config.autoApprovalSettings.enableNotifications)

			await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "use_mcp_server")

			const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("use_mcp_server", completeMessage, config)
			if (!didApprove) {
				telemetryService.captureToolUsage(
					config.ulid,
					block.name,
					config.api.getModel().id,
					provider,
					false,
					false,
					undefined,
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
				undefined,
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

		// Show MCP request started message
		await config.callbacks.say("mcp_server_request_started")

		try {
			// Check for any pending notifications before the tool call
			const notificationsBefore = config.services.mcpHub.getPendingNotifications()
			for (const notification of notificationsBefore) {
				await config.callbacks.say("mcp_notification", `[${notification.serverName}] ${notification.message}`)
			}

			// Execute the MCP tool
			const toolResult = await config.services.mcpHub.callTool(server_name, tool_name, parsedArguments, config.ulid)

			// Check for any pending notifications after the tool call
			const notificationsAfter = config.services.mcpHub.getPendingNotifications()
			for (const notification of notificationsAfter) {
				await config.callbacks.say("mcp_notification", `[${notification.serverName}] ${notification.message}`)
			}

			// Process tool result
			const toolResultImages =
				toolResult?.content
					.filter(
						(item): item is Extract<McpToolCallResponse["content"][number], { type: "image" }> =>
							item.type === "image",
					)
					.map((item) => `data:${item.mimeType};base64,${item.data}`) || []

			let toolResultText =
				(toolResult?.isError ? "Error:\n" : "") +
					toolResult?.content
						.map((item) => {
							if (item.type === "text") {
								return item.text
							}
							if (item.type === "resource") {
								const { blob: _blob, ...rest } = item.resource
								if (tool_name === "read_source") {
									const normalized = this.normalizeReadSourcePayload(item)
									if (!normalized) {
										return JSON.stringify(rest)
									}

									const cacheKey = normalized.displayPath.toLowerCase()
									const overlap = findTrackedSourceOverlap(
										config.taskState.sourceReadWindowCache.get(cacheKey) ?? [],
										normalized.startLine,
										normalized.endLine,
									)
									if (overlap?.type === "contained") {
										return `[MCP source already in context] '${normalized.displayPath}' lines ${normalized.startLine}-${normalized.endLine} are already covered by previously returned lines ${overlap.window.startLine}-${overlap.window.endLine} in this task. Reuse that earlier excerpt or request only novel lines.`
									}

									if (overlap?.type === "substantial") {
										return `[MCP source overlap notice] '${normalized.displayPath}' lines ${normalized.startLine}-${normalized.endLine} substantially overlap previously returned lines ${overlap.window.startLine}-${overlap.window.endLine} in this task. Reissue read_source for only the novel subsection if you need more code.`
									}

									const allowance = evaluateFullSourceReadAllowance(normalized.source)
									if (!this.hasExplicitReadSourceTarget(parsedArguments) && !allowance.allowed) {
										return `[MCP full source read blocked] '${normalized.displayPath}' is ${allowance.totalLines} lines / ${allowance.totalBytes} bytes, which exceeds the 800-line / 65536-byte full-read limit. Reissue read_source with an explicit symbol or 1-based start_line/end_line range.`
									}

									recordTrackedSourceWindow(config.taskState.sourceReadWindowCache, cacheKey, {
										startLine: normalized.startLine,
										endLine: normalized.endLine,
									})

									return `[MCP source range ${normalized.startLine}-${normalized.endLine}] ${normalized.displayPath}\n${normalized.source}`
								}
								return JSON.stringify(rest)
							}
							return ""
						})
						.filter(Boolean)
						.join("\n\n") || "(No response)"

			// webview extracts images from the text response to display in the UI
			const toolResultToDisplay = toolResultText + toolResultImages.map((image) => `\n\n${image}`).join("")
			await config.callbacks.say("mcp_server_response", toolResultToDisplay)

			// Handle model image support
			const supportsImages = config.api.getModel().info.supportsImages ?? false
			if (toolResultImages.length > 0 && !supportsImages) {
				toolResultText += `\n\n[${toolResultImages.length} images were provided in the response, and while they are displayed to the user, you do not have the ability to view them.]`
			}

			// Truncate response if it exceeds 400KB to prevent context overflow
			toolResultText = truncateContent(toolResultText)

			// Return formatted result (only pass images if model supports them)
			return formatResponse.toolResult(toolResultText, supportsImages ? toolResultImages : undefined)
		} catch (error) {
			return `Error executing MCP tool: ${(error as Error)?.message}`
		}
	}
}
