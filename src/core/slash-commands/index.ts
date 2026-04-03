import type { ApiProviderInfo } from "@core/api"
import { ClineRulesToggles } from "@shared/cline-rules"
import { McpPromptResponse } from "@shared/mcp"
import type { GlobalInstructionsFile } from "@shared/remote-config/schema"
import { telemetryService } from "@/services/telemetry"
import { Logger } from "@/shared/services/Logger"
import { isNativeToolCallingConfig } from "@/utils/model-utils"
import {
	condenseToolResponse,
	deepPlanningToolResponse,
	explainChangesToolResponse,
	newRuleToolResponse,
	newTaskToolResponse,
	reportBugToolResponse,
} from "../prompts/commands"
import { StateManager } from "../storage/StateManager"
import {
	type ActivePlaceholderWorkflowSource,
	buildActivePlaceholderWorkflowSource,
} from "../workflows/placeholder-workflow-step-details"
import { loadResolvedWorkflowContent } from "../workflows/resolution/loadResolvedWorkflowContent"
import { resolveWorkflowByName } from "../workflows/resolution/resolveAvailableWorkflows"

export type PersistentSlashCommandAction =
	| { type: "activate_managed_workflow"; workflowId: string; slashCommand: string }
	| { type: "activate_placeholder_workflow"; workflowId: string; workflowSource: ActivePlaceholderWorkflowSource }

/**
 * Callback type for fetching MCP prompts
 */
export type McpPromptFetcher = (serverName: string, promptName: string) => Promise<McpPromptResponse | null>

/**
 * Processes text for slash commands and transforms them with appropriate instructions
 * This is called after parseMentions() to process any slash commands in the user's message
 */
export async function parseSlashCommands(
	text: string,
	localWorkflowToggles: ClineRulesToggles,
	globalWorkflowToggles: ClineRulesToggles,
	ulid: string,
	focusChainSettings?: { enabled: boolean },
	enableNativeToolCalls?: boolean,
	providerInfo?: ApiProviderInfo,
	mcpPromptFetcher?: McpPromptFetcher,
	cwd?: string,
): Promise<{
	processedText: string
	needsClinerulesFileCheck: boolean
	persistentSlashCommandAction?: PersistentSlashCommandAction
}> {
	const SUPPORTED_DEFAULT_COMMANDS = ["newtask", "smol", "compact", "newrule", "reportbug", "deep-planning", "explain-changes"]

	// Determine if the current provider/model/setting actually uses native tool calling
	const willUseNativeTools = providerInfo ? isNativeToolCallingConfig(providerInfo, enableNativeToolCalls ?? false) : false

	const commandReplacements: Record<string, string> = {
		newtask: newTaskToolResponse(willUseNativeTools),
		smol: condenseToolResponse(focusChainSettings),
		compact: condenseToolResponse(focusChainSettings),
		newrule: newRuleToolResponse(),
		reportbug: reportBugToolResponse(),
		"deep-planning": deepPlanningToolResponse(focusChainSettings, providerInfo, willUseNativeTools),
		"explain-changes": explainChangesToolResponse(),
	}

	// Regex patterns to extract content from different XML tags
	const tagPatterns = [
		{ tag: "task", regex: /<task>([\s\S]*?)<\/task>/i },
		{ tag: "feedback", regex: /<feedback>([\s\S]*?)<\/feedback>/i },
		{ tag: "answer", regex: /<answer>([\s\S]*?)<\/answer>/i },
		{ tag: "user_message", regex: /<user_message>([\s\S]*?)<\/user_message>/i },
	]

	// Regex to find slash commands anywhere in text (not just at the beginning).
	// This mirrors how @ mentions work - they can appear anywhere in a message.
	//
	// Pattern breakdown: /(^|\s)\/([a-zA-Z0-9_.:@-]+)(?=\s|$)/
	//   - (^|\s)  : Must be at start of string OR preceded by whitespace
	//   - \/      : The literal slash character
	//   - ([a-zA-Z0-9_.:@-]+) : The command name (letters, numbers, underscore, dot, hyphen, colon, @)
	//   - (?=\s|$): Must be followed by whitespace or end of string (lookahead)
	//
	// This safely avoids false matches in:
	//   - URLs: "http://example.com/newtask" - slash not preceded by whitespace
	//   - File paths: "some/path/newtask" - same reason
	//   - Partial words: "foo/bar" - same reason
	//
	// Only ONE slash command per message is processed (first match found).
	// Note: Colons are allowed to support MCP prompt commands like /mcp:server:prompt
	const slashCommandInTextRegex = /(^|\s)\/([a-zA-Z0-9_.:@-]+)(?=\s|$)/

	// Helper function to calculate positions and remove slash command from text
	const removeCommand = (
		fullText: string,
		contentStartIndex: number,
		matchIndexInContent: number,
		prefixLength: number,
		commandText: string,
	): string => {
		const commandPositionInContent = matchIndexInContent + prefixLength
		const commandPositionInFullText = contentStartIndex + commandPositionInContent
		const commandEndPosition = commandPositionInFullText + commandText.length

		return fullText.substring(0, commandPositionInFullText) + fullText.substring(commandEndPosition)
	}

	// if we find a valid match, we will return inside that block
	for (const { regex } of tagPatterns) {
		const regexObj = new RegExp(regex.source, regex.flags)
		const tagMatch = regexObj.exec(text)

		if (tagMatch) {
			const tagContent = tagMatch[1]
			const tagStartIndex = tagMatch.index
			const contentStartIndex = text.indexOf(tagContent, tagStartIndex)

			// Find slash command within the tag content
			const slashMatch = slashCommandInTextRegex.exec(tagContent)
			const bareCommandAtStartMatch = /^\s*([a-zA-Z0-9_.:@-]+)(?=\s|$)/.exec(tagContent)

			const slashCommandName = slashMatch?.[2]
			const bareCommandName = bareCommandAtStartMatch?.[1]
			const commandName = slashCommandName ?? bareCommandName

			if (!commandName) {
				continue
			}

			const removeMatchedCommand = () => {
				if (slashMatch && slashCommandName === commandName) {
					return removeCommand(text, contentStartIndex, slashMatch.index, slashMatch[1].length, `/${slashMatch[2]}`)
				}

				if (bareCommandAtStartMatch && bareCommandName === commandName) {
					const leadingWhitespaceLength = bareCommandAtStartMatch[0].length - bareCommandAtStartMatch[1].length
					return removeCommand(
						text,
						contentStartIndex,
						bareCommandAtStartMatch.index,
						leadingWhitespaceLength,
						bareCommandAtStartMatch[1],
					)
				}

				return text
			}

			let remoteWorkflowToggles: Record<string, boolean> = {}
			let remoteWorkflows: GlobalInstructionsFile[] = []
			try {
				const stateManager = StateManager.get()
				const remoteConfigSettings = stateManager.getRemoteConfigSettings()
				remoteWorkflowToggles = stateManager.getGlobalStateKey("remoteWorkflowToggles") || {}
				remoteWorkflows = remoteConfigSettings?.remoteGlobalWorkflows || []
			} catch {
				// StateManager is not always initialized in isolated slash-command tests.
			}
			const resolvedWorkflow = await resolveWorkflowByName(
				{
					cwd,
					localWorkflowToggles,
					globalWorkflowToggles,
					remoteWorkflowToggles,
					remoteWorkflows,
				},
				commandName,
			)

			if (resolvedWorkflow?.source === "managed" && resolvedWorkflow.workflowId && resolvedWorkflow.slashCommand) {
				const textWithoutSlashCommand = removeMatchedCommand()
				telemetryService.captureSlashCommandUsed(ulid, commandName, "workflow")
				return {
					processedText: textWithoutSlashCommand,
					needsClinerulesFileCheck: false,
					persistentSlashCommandAction: {
						type: "activate_managed_workflow",
						workflowId: resolvedWorkflow.workflowId,
						slashCommand: resolvedWorkflow.slashCommand,
					},
				}
			}

			// we give preference to the default commands if the user has a file with the same name
			if (SUPPORTED_DEFAULT_COMMANDS.includes(commandName)) {
				// remove the slash command and add custom instructions at the top of this message
				if (!slashMatch) {
					continue
				}
				const textWithoutSlashCommand = removeMatchedCommand()
				const processedText = commandReplacements[commandName] + textWithoutSlashCommand

				// Track telemetry for builtin slash command usage
				telemetryService.captureSlashCommandUsed(ulid, commandName, "builtin")

				return {
					processedText: processedText,
					needsClinerulesFileCheck: commandName === "newrule",
				}
			}

			// Check for MCP prompt commands (format: mcp:<server>:<prompt>)
			if (commandName.startsWith("mcp:") && mcpPromptFetcher) {
				const parts = commandName.split(":")
				if (parts.length >= 3) {
					const serverName = parts[1]
					const promptName = parts.slice(2).join(":") // Allow colons in prompt name

					try {
						const promptResponse = await mcpPromptFetcher(serverName, promptName)
						if (promptResponse) {
							// Format the prompt messages as text
							const promptContent = formatMcpPromptResponse(promptResponse)

							// Remove the slash command and add the prompt content
							if (!slashMatch) {
								continue
							}
							const textWithoutSlashCommand = removeMatchedCommand()
							const processedText =
								`<mcp_prompt server="${serverName}" prompt="${promptName}">\n${promptContent}\n</mcp_prompt>\n` +
								textWithoutSlashCommand

							// Track telemetry for MCP prompt usage
							telemetryService.captureSlashCommandUsed(ulid, commandName, "mcp_prompt")

							return { processedText, needsClinerulesFileCheck: false }
						}
						// Prompt not found - log for debugging and fall through to workflow checking
						Logger.debug(`MCP prompt not found: ${commandName} (server: ${serverName}, prompt: ${promptName})`)
					} catch (error) {
						Logger.error(`Error fetching MCP prompt ${commandName}: ${error}`)
					}
				}
			}

			if (resolvedWorkflow && resolvedWorkflow.source !== "managed") {
				try {
					const loadedWorkflow = await loadResolvedWorkflowContent(resolvedWorkflow)
					if (!loadedWorkflow || loadedWorkflow.kind !== "instructions") {
						continue
					}
					const workflowSource = await buildActivePlaceholderWorkflowSource(
						resolvedWorkflow,
						loadedWorkflow.contents,
						cwd,
					)
					if (!workflowSource) {
						continue
					}

					// Remove the slash command and let the task layer inject rendered workflow
					// instructions after the persistent activation state has been applied.
					if (!slashMatch) {
						continue
					}
					const textWithoutSlashCommand = removeMatchedCommand()

					// Track telemetry for workflow command usage
					telemetryService.captureSlashCommandUsed(ulid, commandName, "workflow")

					return {
						processedText: textWithoutSlashCommand,
						needsClinerulesFileCheck: false,
						persistentSlashCommandAction: {
							type: "activate_placeholder_workflow",
							workflowId: resolvedWorkflow.name,
							workflowSource,
						},
					}
				} catch (error) {
					Logger.error(
						`Error reading workflow for slash command ${resolvedWorkflow.name}${resolvedWorkflow.fullPath ? ` (${resolvedWorkflow.fullPath})` : ""}: ${error}`,
					)
				}
			}
		}
	}

	// if no supported commands are found, return the original text
	return { processedText: text, needsClinerulesFileCheck: false }
}

/**
 * Formats MCP prompt response messages into a text format for injection
 */
export function formatMcpPromptResponse(response: McpPromptResponse): string {
	const parts: string[] = []

	if (response.description) {
		parts.push(`Description: ${response.description}`)
	}

	for (const message of response.messages) {
		const roleLabel = message.role === "user" ? "User" : "Assistant"

		if (message.content.type === "text") {
			parts.push(`[${roleLabel}]\n${message.content.text}`)
		} else if (message.content.type === "image") {
			parts.push(`[${roleLabel}]\n[Image: ${message.content.mimeType}]`)
		} else if (message.content.type === "audio") {
			parts.push(`[${roleLabel}]\n[Audio: ${message.content.mimeType}]`)
		} else if (message.content.type === "resource") {
			const resource = message.content.resource
			if (resource.text) {
				parts.push(`[${roleLabel}]\n[Resource: ${resource.uri}]\n${resource.text}`)
			} else {
				parts.push(`[${roleLabel}]\n[Resource: ${resource.uri}]`)
			}
		}
	}

	return parts.join("\n\n")
}
