import { ApiHandler } from "@core/api"
import { FileContextTracker } from "@core/context/context-tracking/FileContextTracker"
import { getHookModelContext } from "@core/hooks/hook-model-context"
import { getHooksEnabledSafe } from "@core/hooks/hooks-utils"
import { ClineIgnoreController } from "@core/ignore/ClineIgnoreController"
import { CommandPermissionController } from "@core/permissions"
import { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import type { CommandExecutionOptions } from "@integrations/terminal"
import { BrowserSession } from "@services/browser/BrowserSession"
import { UrlContentFetcher } from "@services/browser/UrlContentFetcher"
import { McpHub } from "@services/mcp/McpHub"
import { ClineAsk, ClineSay } from "@shared/ExtensionMessage"
import { ClineContent } from "@shared/messages/content"
import { ClineDefaultTool, toolUseNames } from "@shared/tools"
import { ClineAskResponse } from "@shared/WebviewMessage"
import { Logger } from "@/shared/services/Logger"
import { isParallelToolCallingEnabled, modelDoesntSupportWebp } from "@/utils/model-utils"
import { ToolUse } from "../assistant-message"
import { ContextManager } from "../context/context-management/ContextManager"
import { formatResponse } from "../prompts/responses"
import { StateManager } from "../storage/StateManager"
import { WorkspaceRootManager } from "../workspace"
import { clearPartialResponseToolPreview, ToolResponse, upsertPartialResponseToolSayPreview } from "."
import type { FocusChainChecklistUpdateResult } from "./focus-chain/types"
import { applyPostToolTaskProgressUpdate, applyPreToolTaskProgressUpdate } from "./focus-chain/updateFromToolResponse"
import { MessageStateHandler } from "./message-state"
import { TaskState } from "./TaskState"
import { AutoApprove } from "./tools/autoApprove"
import { ResponseToolRegistry } from "./tools/response/ResponseToolRegistry"
import { ResponseToolRuntime } from "./tools/response/ResponseToolRuntime"
import { IPartialBlockHandler, ToolExecutorCoordinator } from "./tools/ToolExecutorCoordinator"
import { ToolValidator } from "./tools/ToolValidator"
import { TaskConfig, validateTaskConfig } from "./tools/types/TaskConfig"
import { createUIHelpers } from "./tools/types/UIHelpers"
import { ToolDisplayUtils } from "./tools/utils/ToolDisplayUtils"
import { ToolResultUtils } from "./tools/utils/ToolResultUtils"

export function canonicalizeAttemptCompletionParams(block: ToolUse): boolean {
	if (block.name === ClineDefaultTool.ATTEMPT && !block.params?.result && typeof block.params?.response === "string") {
		block.params.result = block.params.response
		return true
	}

	return false
}

export type ToolExecutionOutcomeStatus = "streaming" | "executed" | "skipped" | "rejected" | "not_handled"

export interface ToolExecutionOutcome {
	status: ToolExecutionOutcomeStatus
	emittedToolResult: boolean
}

export class ToolExecutor {
	private autoApprover: AutoApprove
	private coordinator: ToolExecutorCoordinator
	private responseToolRuntime = new ResponseToolRuntime()

	// Auto-approval methods using the AutoApprove class
	private shouldAutoApproveTool(toolName: ClineDefaultTool): boolean | [boolean, boolean] {
		return this.autoApprover.shouldAutoApproveTool(toolName)
	}

	private async shouldAutoApproveToolWithPath(
		blockname: ClineDefaultTool,
		autoApproveActionpath: string | undefined,
	): Promise<boolean> {
		return this.autoApprover.shouldAutoApproveToolWithPath(blockname, autoApproveActionpath)
	}

	constructor(
		// Core Services & Managers
		private taskState: TaskState,
		private messageStateHandler: MessageStateHandler,
		private api: ApiHandler,
		private urlContentFetcher: UrlContentFetcher,
		private browserSession: BrowserSession,
		private diffViewProvider: DiffViewProvider,
		private mcpHub: McpHub,
		private fileContextTracker: FileContextTracker,
		private clineIgnoreController: ClineIgnoreController,
		private commandPermissionController: CommandPermissionController,
		private contextManager: ContextManager,
		private stateManager: StateManager,

		// Configuration & Settings

		private cwd: string,
		private taskId: string,
		private ulid: string,
		private vscodeTerminalExecutionMode: "vscodeTerminal" | "backgroundExec",

		// Workspace Management
		private workspaceManager: WorkspaceRootManager | undefined,
		private isMultiRootEnabled: boolean,

		// Callbacks to the Task (Entity)
		private say: (
			type: ClineSay,
			text?: string,
			images?: string[],
			files?: string[],
			partial?: boolean,
		) => Promise<number | undefined>,
		private ask: (
			type: ClineAsk,
			text?: string,
			partial?: boolean,
		) => Promise<{
			response: ClineAskResponse
			text?: string
			images?: string[]
			files?: string[]
		}>,
		private saveCheckpoint: (isAttemptCompletionMessage?: boolean, completionMessageTs?: number) => Promise<void>,
		private sayAndCreateMissingParamError: (toolName: ClineDefaultTool, paramName: string, relPath?: string) => Promise<any>,
		private removeLastPartialMessageIfExistsWithType: (type: "ask" | "say", askOrSay: ClineAsk | ClineSay) => Promise<void>,
		private executeCommandTool: (
			command: string,
			timeoutSeconds: number | undefined,
			options?: CommandExecutionOptions,
		) => Promise<[boolean, any]>,
		private cancelRunningCommandTool: () => Promise<boolean>,
		private doesLatestTaskCompletionHaveNewChanges: () => Promise<boolean>,
		private updateFCListFromToolResponse: (taskProgress: string | undefined) => Promise<FocusChainChecklistUpdateResult>,
		private switchToActMode: () => Promise<boolean>,
		private cancelTask: () => Promise<void>,

		// Atomic hook state helpers from Task
		private setActiveHookExecution: (hookExecution: NonNullable<typeof taskState.activeHookExecution>) => Promise<void>,
		private clearActiveHookExecution: () => Promise<void>,
		private getActiveHookExecution: () => Promise<typeof taskState.activeHookExecution>,
		private runUserPromptSubmitHook: (
			userContent: ClineContent[],
			context: "initial_task" | "resume" | "feedback",
		) => Promise<{ cancel?: boolean; wasCancelled?: boolean; contextModification?: string; errorMessage?: string }>,
	) {
		this.autoApprover = new AutoApprove(this.stateManager)

		// Initialize the coordinator and register all tool handlers
		this.coordinator = new ToolExecutorCoordinator()
		this.registerToolHandlers()
	}

	// Create a properly typed TaskConfig object for handlers
	// NOTE: modifying this object in the tool handlers is okay since these are all references to the singular ToolExecutor instance's variables. However, be careful modifying this object assuming it will update the ToolExecutor instance, e.g. config.browserSession = ... will not update the ToolExecutor.browserSession instance variable. Use applyLatestBrowserSettings() instead.
	private asToolConfig(): TaskConfig {
		const config: TaskConfig = {
			taskId: this.taskId,
			ulid: this.ulid,
			mode: this.stateManager.getGlobalSettingsKey("mode"),
			strictPlanModeEnabled: this.stateManager.getGlobalSettingsKey("strictPlanModeEnabled"),
			yoloModeToggled: this.stateManager.getGlobalSettingsKey("yoloModeToggled"),
			doubleCheckCompletionEnabled: this.stateManager.getGlobalSettingsKey("doubleCheckCompletionEnabled"),
			vscodeTerminalExecutionMode: this.vscodeTerminalExecutionMode,
			enableParallelToolCalling: this.isParallelToolCallingEnabled(),
			isSubagentExecution: false,
			cwd: this.cwd,
			workspaceManager: this.workspaceManager,
			isMultiRootEnabled: this.isMultiRootEnabled,
			taskState: this.taskState,
			messageState: this.messageStateHandler,
			api: this.api,
			autoApprovalSettings: this.stateManager.getGlobalSettingsKey("autoApprovalSettings"),
			autoApprover: this.autoApprover,
			browserSettings: this.stateManager.getGlobalSettingsKey("browserSettings"),
			focusChainSettings: this.stateManager.getGlobalSettingsKey("focusChainSettings"),
			services: {
				mcpHub: this.mcpHub,
				browserSession: this.browserSession,
				urlContentFetcher: this.urlContentFetcher,
				diffViewProvider: this.diffViewProvider,
				fileContextTracker: this.fileContextTracker,
				clineIgnoreController: this.clineIgnoreController,
				commandPermissionController: this.commandPermissionController,
				contextManager: this.contextManager,
				stateManager: this.stateManager,
			},
			callbacks: {
				say: this.say,
				ask: this.ask,
				saveCheckpoint: this.saveCheckpoint,
				postStateToWebview: async () => {},
				reinitExistingTaskFromId: async () => {},
				cancelTask: this.cancelTask,
				updateTaskHistory: async () => [],
				executeCommandTool: this.executeCommandTool,
				cancelRunningCommandTool: this.cancelRunningCommandTool,
				doesLatestTaskCompletionHaveNewChanges: this.doesLatestTaskCompletionHaveNewChanges,
				updateFCListFromToolResponse: this.updateFCListFromToolResponse,
				sayAndCreateMissingParamError: this.sayAndCreateMissingParamError,
				removeLastPartialMessageIfExistsWithType: this.removeLastPartialMessageIfExistsWithType,
				upsertPartialResponseToolSayPreview: (block, sayType, text) =>
					upsertPartialResponseToolSayPreview({
						taskState: this.taskState,
						messageStateHandler: this.messageStateHandler,
						say: this.say,
						block,
						sayType,
						text,
					}),
				clearPartialResponseToolPreview: (block, options) =>
					clearPartialResponseToolPreview({
						taskState: this.taskState,
						messageStateHandler: this.messageStateHandler,
						block,
						removeMessage: options?.removeMessage,
					}),
				shouldAutoApproveTool: this.shouldAutoApproveTool.bind(this),
				shouldAutoApproveToolWithPath: this.shouldAutoApproveToolWithPath.bind(this),
				applyLatestBrowserSettings: this.applyLatestBrowserSettings.bind(this),
				switchToActMode: this.switchToActMode,
				setActiveHookExecution: this.setActiveHookExecution,
				clearActiveHookExecution: this.clearActiveHookExecution,
				getActiveHookExecution: this.getActiveHookExecution,
				runUserPromptSubmitHook: this.runUserPromptSubmitHook,
			},
			coordinator: this.coordinator,
		}

		// Validate the config at runtime to catch any missing properties
		validateTaskConfig(config)
		return config
	}

	/**
	 * Register all tool handlers with the coordinator
	 */
	private registerToolHandlers(): void {
		const validator = new ToolValidator(this.clineIgnoreController)
		// Register all tools via toolUseNames
		for (const tool of toolUseNames) {
			this.coordinator.registerByName(tool, validator)
		}
	}

	/**
	 * Main entry point for tool execution - called by Task class
	 */
	public async executeTool(block: ToolUse): Promise<ToolExecutionOutcome> {
		return await this.execute(block)
	}

	/**
	 * Updates the browser settings
	 */
	public async applyLatestBrowserSettings() {
		await this.browserSession.dispose()
		const apiHandlerModel = this.api.getModel()
		const useWebp = this.api ? !modelDoesntSupportWebp(apiHandlerModel) : true
		this.browserSession = new BrowserSession(this.stateManager, useWebp)
		return this.browserSession
	}

	/**
	 * Handles errors during tool execution.
	 *
	 * Logs the error, displays it to the user via the UI, and adds an error
	 * result to the conversation context so the AI can see what went wrong.
	 *
	 * @param action Description of what was being attempted (e.g., "executing read_file")
	 * @param error The error that occurred
	 * @param block The tool use block that caused the error
	 */
	private async handleError(action: string, error: Error, block: ToolUse): Promise<void> {
		const errorString = `Error ${action}: ${error.message}`
		await this.say("error", errorString)

		// Create error response for the tool
		const errorResponse = formatResponse.toolError(errorString)
		this.pushToolResult(errorResponse, block)
		if (block.isNativeToolCall && block.call_id && !this.taskState.nativeToolCallIdsExecuted.has(block.call_id)) {
			this.taskState.nativeToolCallIdsSkipped.add(block.call_id)
		}
	}

	/**
	 * Pushes a tool result to the user message content.
	 *
	 * This is a critical method that:
	 * - Formats the tool result appropriately for the API
	 * - Adds it to the conversation context
	 * - Marks that a tool has been used in this turn
	 *
	 * @param content The tool response content to add
	 * @param block The tool use block that generated this result
	 */
	private pushToolResult = (
		content: ToolResponse,
		block: ToolUse,
		target: "userMessageContent" | "completedResponseToolResultContent" = "userMessageContent",
	) => {
		const destination =
			target === "completedResponseToolResultContent"
				? this.taskState.completedResponseToolResultContent
				: this.taskState.userMessageContent
		// Use the ToolResultUtils to properly format and push the tool result
		const emittedResult = ToolResultUtils.pushToolResult(
			content,
			block,
			destination,
			(block: ToolUse) => ToolDisplayUtils.getToolDescription(block),
			this.coordinator,
			this.taskState.toolUseIdMap,
		)
		if (emittedResult && block.isNativeToolCall && block.call_id) {
			this.taskState.nativeToolCallIdsWithResults.add(block.call_id)
			this.taskState.nativeToolCallIdsBreakingPreviousResponseChain.delete(block.call_id)
		}
		// Mark that a tool has been used (only matters when parallel tool calling is disabled)
		if (!this.isParallelToolCallingEnabled()) {
			this.taskState.didAlreadyUseTool = true
		}
		return emittedResult
	}

	private markNativeToolCallBreaksPreviousResponseChain(block: ToolUse): void {
		if (!block.isNativeToolCall || !block.call_id) {
			return
		}

		this.taskState.nativeToolCallIdsBreakingPreviousResponseChain.add(block.call_id)
	}

	private shouldIsolateCompletedResponseToolContent(block: ToolUse): boolean {
		const responseToolMetadata = ResponseToolRegistry.get(block.name)
		return (
			responseToolMetadata?.defaultTurnBehavior === "end_turn" &&
			this.taskState.responseToolTurnShouldEnd &&
			this.taskState.responseToolTurnCompletedBy === block.name
		)
	}

	/**
	 * Check if parallel tool calling is enabled.
	 * Parallel tool calling is enabled if:
	 * 1. User has enabled it in settings, OR
	 * 2. The current model/provider supports native tool calling and handles parallel tools well
	 */
	private isParallelToolCallingEnabled(): boolean {
		const enableParallelSetting = this.stateManager.getGlobalSettingsKey("enableParallelToolCalling")
		const model = this.api.getModel()
		const apiConfig = this.stateManager.getApiConfiguration()
		const mode = this.stateManager.getGlobalSettingsKey("mode")
		const providerId = (mode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider) as string
		return isParallelToolCallingEnabled(enableParallelSetting, { providerId, model, mode })
	}

	/**
	 * Tools that are restricted in plan mode and can only be used in act mode
	 */
	private static readonly PLAN_MODE_RESTRICTED_TOOLS: ClineDefaultTool[] = [
		ClineDefaultTool.FILE_NEW,
		ClineDefaultTool.FILE_EDIT,
		ClineDefaultTool.NEW_RULE,
		ClineDefaultTool.APPLY_PATCH,
	]

	/**
	 * Execute a tool through the coordinator if it's registered.
	 *
	 * This is the main entry point for tool execution, called by the Task class.
	 * It handles:
	 * - Checking if the tool is registered with the coordinator
	 * - Validating tool execution is allowed (not rejected, not already used, etc.)
	 * - Enforcing plan mode restrictions on file modification tools
	 * - Delegating to partial or complete block handlers
	 * - Error handling and checkpointing
	 *
	 * @param block The tool use block to execute
	 * @returns true if the tool was handled (even if execution failed), false if not registered
	 */
	private async execute(block: ToolUse): Promise<ToolExecutionOutcome> {
		// Note: MCP tool name transformation happens earlier in ToolUseHandler.getPartialToolUsesAsContent()
		// The toolUseIdMap is updated at the point of transformation in index.ts

		if (!this.coordinator.has(block.name)) {
			return { status: "not_handled", emittedToolResult: false } // Tool not handled by coordinator
		}
		canonicalizeAttemptCompletionParams(block)

		const config = this.asToolConfig()

		try {
			// Check if user rejected a previous tool
			if (this.taskState.didRejectTool) {
				const reason = block.partial
					? "Tool was interrupted and not executed due to user rejecting a previous tool."
					: "Skipping tool due to user rejecting a previous tool."
				this.createToolRejectionMessage(block, reason)
				if (block.isNativeToolCall && block.call_id) {
					this.taskState.nativeToolCallIdsSkipped.add(block.call_id)
				}
				this.markNativeToolCallBreaksPreviousResponseChain(block)
				return { status: "rejected", emittedToolResult: false }
			}

			if (
				this.taskState.hasExhaustedResponseToolFailureBudget() &&
				this.responseToolRuntime.isGovernedResponseAttempt({ config, block })
			) {
				const reason = block.partial
					? "Tool was interrupted because governed response tool failures already exhausted the current turn's retry budget."
					: "Skipping tool because governed response tool failures already exhausted the current turn's retry budget."
				this.createToolRejectionMessage(block, reason)
				if (block.isNativeToolCall && block.call_id) {
					this.taskState.nativeToolCallIdsSkipped.add(block.call_id)
				}
				this.markNativeToolCallBreaksPreviousResponseChain(block)
				return { status: "rejected", emittedToolResult: false }
			}

			if (this.taskState.responseToolTurnShouldEnd) {
				const reason = block.partial
					? "Tool was interrupted because a previous response tool already completed the current assistant turn."
					: "Skipping tool because a previous response tool already completed the current assistant turn."
				this.createToolRejectionMessage(block, reason)
				if (block.isNativeToolCall && block.call_id) {
					this.taskState.nativeToolCallIdsSkipped.add(block.call_id)
				}
				this.markNativeToolCallBreaksPreviousResponseChain(block)
				return { status: "rejected", emittedToolResult: false }
			}

			// Check if a tool has already been used in this message (only enforced when parallel tool calling is disabled)
			if (!this.isParallelToolCallingEnabled() && this.taskState.didAlreadyUseTool) {
				this.taskState.userMessageContent.push({
					type: "text",
					text: formatResponse.toolAlreadyUsed(block.name),
				})
				if (block.isNativeToolCall && block.call_id) {
					this.taskState.nativeToolCallIdsSkipped.add(block.call_id)
				}
				this.markNativeToolCallBreaksPreviousResponseChain(block)
				return { status: "rejected", emittedToolResult: false }
			}

			// Logic for plan-mode tool call restrictions
			if (
				this.stateManager.getGlobalSettingsKey("strictPlanModeEnabled") &&
				this.stateManager.getGlobalSettingsKey("mode") === "plan" &&
				block.name &&
				this.isPlanModeToolRestricted(block.name)
			) {
				const errorMessage = `Tool '${block.name}' is not available in PLAN MODE. This tool is restricted to ACT MODE for file modifications. Only use tools available for PLAN MODE when in that mode.`
				await this.removeLastPartialMessageIfExistsWithType("say", "error")
				await this.say("error", errorMessage)
				// Only push the final error message when the streaming is done.
				if (!block.partial) {
					this.pushToolResult(formatResponse.toolError(errorMessage), block)
				}
				if (block.isNativeToolCall && block.call_id) {
					this.taskState.nativeToolCallIdsSkipped.add(block.call_id)
				}
				if (block.partial) {
					this.markNativeToolCallBreaksPreviousResponseChain(block)
				}
				return { status: "rejected", emittedToolResult: !block.partial }
			}

			// Close browser for non-browser tools
			if (block.name !== "browser_action") {
				await this.browserSession.closeBrowser()
			}

			// Handle partial blocks
			if (block.partial) {
				await this.handlePartialBlock(block, config)
				return { status: "streaming", emittedToolResult: false }
			}

			// Handle complete blocks
			return await this.handleCompleteBlock(block, config)
		} catch (error) {
			await this.handleError(`executing ${block.name}`, error as Error, block)
			return { status: "executed", emittedToolResult: true }
		}
	}

	/**
	 * Check if a tool is restricted in plan mode.
	 *
	 * In strict plan mode, file modification tools (write_to_file, editedExistingFile, etc.)
	 * are blocked. The AI must switch to Act mode to use these tools.
	 *
	 * @param toolName The name of the tool to check
	 * @returns true if the tool is restricted in plan mode, false otherwise
	 */
	private isPlanModeToolRestricted(toolName: ClineDefaultTool): boolean {
		return ToolExecutor.PLAN_MODE_RESTRICTED_TOOLS.includes(toolName)
	}

	/**
	 * Create a tool rejection message and add it to user message content.
	 *
	 * Used when a tool cannot be executed (e.g., user rejected a previous tool,
	 * tool was interrupted, etc.). Adds a text message to the conversation explaining
	 * why the tool was not executed.
	 *
	 * @param block The tool use block that was rejected
	 * @param reason Human-readable explanation of why the tool was rejected
	 */
	private createToolRejectionMessage(block: ToolUse, reason: string): void {
		this.taskState.userMessageContent.push({
			type: "text",
			text: `${reason} ${ToolDisplayUtils.getToolDescription(block, this.coordinator)}`,
		})
	}

	/**
	 * Adds hook context modification to the conversation if provided.
	 * Parses the context to extract type prefix and formats as XML.
	 *
	 * @param contextModification The context string from the hook output
	 * @param source The hook source name ("PreToolUse" or "PostToolUse")
	 */
	private addHookContextToConversation(contextModification: string | undefined, source: string): void {
		if (!contextModification) {
			return
		}

		const contextText = contextModification.trim()
		if (!contextText) {
			return
		}

		// Extract context type from first line if specified (e.g., "WORKSPACE_RULES: ...")
		const lines = contextText.split("\n")
		const firstLine = lines[0]
		let contextType = "general"
		let content = contextText

		// Check if first line specifies a type: "TYPE: content"
		const typeMatchRegex = /^([A-Z_]+):\s*(.*)/
		const typeMatch = typeMatchRegex.exec(firstLine)
		if (typeMatch) {
			contextType = typeMatch[1].toLowerCase()
			const remainingLines = lines.slice(1).filter((l: string) => l.trim())
			content = typeMatch[2] ? [typeMatch[2], ...remainingLines].join("\n") : remainingLines.join("\n")
		}

		const hookContextBlock = {
			type: "text" as const,
			text: `<hook_context source="${source}" type="${contextType}">\n${content}\n</hook_context>`,
		}

		this.taskState.userMessageContent.push(hookContextBlock)
	}

	/**
	 * Runs the PostToolUse hook after tool execution.
	 * This is extracted from handleCompleteBlock to eliminate code duplication
	 * between success and error paths.
	 *
	 * @param block The tool use block that was executed
	 * @param toolResult The result from the tool execution
	 * @param executionSuccess Whether the tool executed successfully
	 * @param executionStartTime The timestamp when tool execution started
	 * @returns true if hook requested cancellation, false otherwise
	 */
	private async runPostToolUseHook(
		block: ToolUse,
		toolResult: any,
		executionSuccess: boolean,
		executionStartTime: number,
		hooksEnabled: boolean,
	): Promise<boolean> {
		const { executeHook } = await import("../hooks/hook-executor")

		const executionTimeMs = Date.now() - executionStartTime

		const postToolResult = await executeHook({
			hookName: "PostToolUse",
			hookInput: {
				postToolUse: {
					toolName: block.name,
					parameters: Object.fromEntries(
						Object.entries(block.params).map(([key, value]) => [
							key,
							typeof value === "string" ? value : JSON.stringify(value),
						]),
					),
					result: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
					success: executionSuccess,
					executionTimeMs,
				},
			},
			isCancellable: true,
			say: this.say,
			setActiveHookExecution: this.setActiveHookExecution,
			clearActiveHookExecution: this.clearActiveHookExecution,
			messageStateHandler: this.messageStateHandler,
			taskId: this.taskId,
			hooksEnabled,
			model: getHookModelContext(this.api, this.stateManager),
			toolName: block.name,
		})

		// Handle cancellation request
		if (postToolResult.cancel === true) {
			const errorMessage = postToolResult.errorMessage || "Hook requested task cancellation"
			await this.say("error", errorMessage)
			return true
		}

		// Add context modification to the conversation if provided
		if (postToolResult.contextModification) {
			this.addHookContextToConversation(postToolResult.contextModification, "PostToolUse")
		}

		return false
	}

	/**
	 * Handle partial block streaming UI updates.
	 *
	 * During streaming API responses, the AI sends partial tool use blocks as they're
	 * generated. This method updates the UI to show the tool being constructed in real-time.
	 *
	 * NOTE: This is ONLY for UI updates. No tool results are pushed to the conversation
	 * during partial block handling. The complete block handler will add the final result.
	 *
	 * @param block The partial tool use block with incomplete parameters
	 * @param config The task configuration containing all necessary context
	 */
	private async handlePartialBlock(block: ToolUse, config: TaskConfig): Promise<void> {
		// NOTE: We don't push tool results in partial blocks because this is only for UI streaming.
		// The ToolExecutor will handle pushToolResult() when the complete block is processed.
		// This maintains separation of concerns: partial = UI updates, complete = final state changes.
		const handler = this.coordinator.getHandler(block.name)

		// Check if handler supports partial blocks with proper typing
		if (handler && "handlePartialBlock" in handler) {
			const uiHelpers = createUIHelpers(config)
			const partialHandler = handler as IPartialBlockHandler
			await partialHandler.handlePartialBlock(block, uiHelpers)
		}
	}

	/**
	 * Handle complete block execution.
	 *
	 * This is the main execution flow for a tool:
	 * 1. Execute the actual tool (tool handlers now run PreToolUse hooks post-approval)
	 * 2. Run PostToolUse hooks (if enabled) - cannot block, only observe
	 * 3. Add hook context modifications to the conversation
	 * 4. Update focus chain tracking
	 *
	 * Note: PreToolUse hooks are now executed by individual tool handlers after approval
	 * and before the actual tool operation. This provides better UX as approval dialogs
	 * appear immediately without hook execution delay.
	 *
	 * PostToolUse hooks are for observation/logging only and cannot block.
	 *
	 * @param block The complete tool use block with all parameters
	 * @param config The task configuration containing all necessary context
	 */
	private async handleCompleteBlock(block: ToolUse, config: any): Promise<ToolExecutionOutcome> {
		// Check abort flag at the very start to prevent execution after cancellation
		if (this.taskState.abort) {
			this.markNativeToolCallBreaksPreviousResponseChain(block)
			return { status: "skipped", emittedToolResult: false }
		}

		const hooksEnabled = getHooksEnabledSafe(this.stateManager.getGlobalSettingsKey("hooksEnabled"))

		// Track if we need to cancel after hooks complete
		let shouldCancelAfterHook = false

		let executionSuccess = true
		let toolResult: any = null
		let toolWasExecuted = false
		const executionStartTime = Date.now()
		let skipPostExecutionFocusChainUpdate = false
		let emittedToolResult = false

		try {
			// Final abort check immediately before tool execution
			if (this.taskState.abort) {
				this.markNativeToolCallBreaksPreviousResponseChain(block)
				return { status: "skipped", emittedToolResult: false }
			}

			const preToolTaskProgressUpdate = await applyPreToolTaskProgressUpdate({
				block,
				focusChainEnabled: this.stateManager.getGlobalSettingsKey("focusChainSettings").enabled,
				updateFCListFromToolResponse: this.updateFCListFromToolResponse,
			})
			skipPostExecutionFocusChainUpdate = preToolTaskProgressUpdate.skipPostExecutionUpdate
			if (preToolTaskProgressUpdate.skipToolExecution) {
				toolResult = preToolTaskProgressUpdate.toolResult
				emittedToolResult = this.pushToolResult(toolResult, block)
				if (block.isNativeToolCall && block.call_id) {
					this.taskState.nativeToolCallIdsSkipped.add(block.call_id)
				}
				if (!emittedToolResult) {
					this.markNativeToolCallBreaksPreviousResponseChain(block)
				}
				return { status: "skipped", emittedToolResult }
			}

			// Execute the actual tool
			Logger.info(`[ToolExecutor ${config.taskId}] starting tool ${block.name} (call_id=${block.call_id ?? "none"})`)
			toolResult = await this.coordinator.execute(config, block)
			toolWasExecuted = true
			await this.handleGovernedResponseToolFailureIfNeeded(config, block, toolResult)
			const shouldIsolateCompletedResponseToolResult = this.shouldIsolateCompletedResponseToolContent(block)
			emittedToolResult = this.pushToolResult(
				toolResult,
				block,
				shouldIsolateCompletedResponseToolResult ? "completedResponseToolResultContent" : "userMessageContent",
			)
			if (block.isNativeToolCall && block.call_id) {
				this.taskState.nativeToolCallIdsExecuted.add(block.call_id)
				this.taskState.nativeToolCallIdsSkipped.delete(block.call_id)
			}
			Logger.info(`[ToolExecutor ${config.taskId}] completed tool ${block.name} (call_id=${block.call_id ?? "none"})`)

			// Track the last executed tool for consecutive call detection (used by act_mode_respond)
			this.taskState.lastToolName = block.name

			// Check abort before running PostToolUse hook (success path)
			if (this.taskState.abort) {
				return { status: "executed", emittedToolResult }
			}

			// Run PostToolUse hook for successful tool execution
			// Skip for attempt_completion since it marks task completion, not actual work
			if (hooksEnabled && block.name !== "attempt_completion") {
				const hookRequestedCancel = await this.runPostToolUseHook(
					block,
					toolResult,
					executionSuccess,
					executionStartTime,
					hooksEnabled, // always true here - already checked by caller
				)
				if (hookRequestedCancel) {
					await config.callbacks.cancelTask()
					shouldCancelAfterHook = true
				}
			}
		} catch (error) {
			Logger.error(`[ToolExecutor ${config.taskId}] failed tool ${block.name} (call_id=${block.call_id ?? "none"})`, error)
			executionSuccess = false
			toolResult = formatResponse.toolError(`Tool execution failed: ${error}`)
			await this.handleGovernedResponseToolFailureIfNeeded(config, block, toolResult)

			// Check abort before running PostToolUse hook (error path)
			if (this.taskState.abort) {
				throw error
			}

			// Run PostToolUse hook for failed tool execution
			// Skip for attempt_completion since it marks task completion, not actual work
			if (toolWasExecuted && hooksEnabled && block.name !== "attempt_completion") {
				const hookRequestedCancel = await this.runPostToolUseHook(
					block,
					toolResult,
					executionSuccess,
					executionStartTime,
					hooksEnabled, // always true here - already checked by caller
				)
				if (hookRequestedCancel) {
					await config.callbacks.cancelTask()
					shouldCancelAfterHook = true
				}
			}

			// Re-throw the error after PostToolUse completes
			throw error
		}

		// Early return if hook requested cancellation
		if (shouldCancelAfterHook) {
			return { status: "executed", emittedToolResult }
		}

		// Handle focus chain updates
		const postToolTaskProgressUpdate = await applyPostToolTaskProgressUpdate({
			block,
			focusChainEnabled: this.stateManager.getGlobalSettingsKey("focusChainSettings").enabled,
			skipPostExecutionUpdate: skipPostExecutionFocusChainUpdate,
			toolContext: {
				toolName: block.name,
				toolParams: (block.params as Record<string, unknown>) ?? undefined,
				toolResult,
				toolWasExecuted,
			},
			updateFCListFromToolResponse: this.updateFCListFromToolResponse,
		})
		if (postToolTaskProgressUpdate.feedback) {
			const feedbackTarget = this.shouldIsolateCompletedResponseToolContent(block)
				? this.taskState.completedResponseToolResultContent
				: this.taskState.userMessageContent
			feedbackTarget.push({
				type: "text",
				text: postToolTaskProgressUpdate.feedback,
			})
		}

		return { status: "executed", emittedToolResult }
	}

	private async handleGovernedResponseToolFailureIfNeeded(
		config: TaskConfig,
		block: ToolUse,
		toolResult: ToolResponse,
	): Promise<void> {
		if (!this.responseToolRuntime.isGovernedResponseAttempt({ config, block })) {
			return
		}

		const failure = this.responseToolRuntime.classifyFailureResult(toolResult)
		if (!failure) {
			return
		}

		const state = this.responseToolRuntime.recordFailure(config, block.name, failure.message, failure.cause)
		if (state.failureCount === 2) {
			await this.say("error", this.responseToolRuntime.buildSecondFailureUserMessage(block.name, failure))
		}
	}
}
