import type { ToolUse } from "@core/assistant-message"
import { PreToolUseHookCancellationError } from "@core/hooks/PreToolUseHookCancellationError"
import { formatResponse } from "@core/prompts/responses"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import { fs } from "fs/promises"
import path from "path"
import type { WorkflowValues } from "@/core/task/workflow-runtime/types"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import { getBackendWorkflowToolContract } from "../backendWorkflowToolContracts"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { ToolResultUtils } from "../utils/ToolResultUtils"

function parseRequest(
	block: ToolUse,
): { artifactId: string; destinationPath: string; content: string; workflowValueWrites?: WorkflowValues } | undefined {
	const params = block.params as Record<string, unknown> | undefined
	if (!params || typeof params !== "object" || Array.isArray(params)) {
		return undefined
	}

	const artifactId = params.artifact_id
	const destinationPath = params.destination_path
	const content = params.content

	if (
		typeof artifactId !== "string" ||
		artifactId.length === 0 ||
		typeof destinationPath !== "string" ||
		destinationPath.length === 0 ||
		typeof content !== "string" ||
		content.length === 0
	) {
		return undefined
	}

	const workflowValueWritesRaw = params.workflow_value_writes
	if (workflowValueWritesRaw === undefined) {
		return { artifactId, destinationPath, content }
	}

	if (
		workflowValueWritesRaw === null ||
		Array.isArray(workflowValueWritesRaw) ||
		Object.prototype.toString.call(workflowValueWritesRaw) !== "[object Object]" ||
		(Object.getPrototypeOf(workflowValueWritesRaw) !== Object.prototype &&
			Object.getPrototypeOf(workflowValueWritesRaw) !== null)
	) {
		return undefined
	}

	for (const value of Object.values(workflowValueWritesRaw)) {
		if (typeof value !== "string") {
			return undefined
		}
	}

	return {
		artifactId,
		destinationPath,
		content,
		workflowValueWrites: workflowValueWritesRaw as WorkflowValues,
	}
}

async function atomicReplaceTextFile(filePath: string, content: string): Promise<void> {
	const directory = path.dirname(filePath)
	const tempFilePath = path.join(
		directory,
		`.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
	)

	await fs.mkdir(directory, { recursive: true })

	try {
		await fs.writeFile(tempFilePath, content, "utf8")
		await fs.rename(tempFilePath, filePath)
	} catch (error) {
		try {
			await fs.unlink(tempFilePath)
		} catch {}
		throw error
	}
}

export class BuildWorkflowDocumentToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT

	getDescription(block: ToolUse): string {
		const request = parseRequest(block)
		if (request) {
			return `[${block.name} ${request.artifactId}]`
		}

		return `[${block.name}]`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		if (!getBackendWorkflowToolContract(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT)) {
			throw new Error("Backend workflow tool contract missing for build_workflow_document.")
		}

		const request = parseRequest(block)
		if (!request) {
			return
		}

		await uiHelpers.say(
			"tool",
			JSON.stringify({
				tool: "buildWorkflowDocument",
				artifactId: request.artifactId,
				destinationPath: request.destinationPath,
			}),
			undefined,
			undefined,
			true,
		)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			if (!getBackendWorkflowToolContract(ClineDefaultTool.BUILD_WORKFLOW_DOCUMENT)) {
				return formatResponse.toolError("Backend workflow tool contract missing for build_workflow_document.")
			}

			const request = parseRequest(block)
			if (!request) {
				config.taskState.consecutiveMistakeCount += 1
				return formatResponse.toolError(
					"Missing required parameters. Provide non-empty string values for 'artifact_id', 'destination_path', and 'content'. Optional 'workflow_value_writes' must be an object whose property values are strings.",
				)
			}

			const { artifactId, destinationPath, content, workflowValueWrites } = request

			let priorContent: string | undefined
			try {
				priorContent = await fs.readFile(destinationPath, "utf8")
			} catch (error) {
				const errorCode =
					typeof error === "object" && error !== null && "code" in error
						? (error as { code?: unknown }).code
						: undefined
				if (errorCode !== "ENOENT") {
					throw error
				}
			}

			const documentWouldChange = priorContent !== content
			const completeMessage = JSON.stringify({
				tool: "buildWorkflowDocument",
				path: getReadablePath(config.cwd, destinationPath),
				content: `Artifact: ${artifactId}`,
				operationIsLocatedInWorkspace: await isLocatedInWorkspace(destinationPath),
			})

			const shouldAutoApprove =
				config.isSubagentExecution || (await config.callbacks.shouldAutoApproveToolWithPath(block.name, destinationPath))

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to build ${getWorkspaceBasename(destinationPath, "BuildWorkflowDocument.notification")}`,
					config.autoApprovalSettings.enableNotifications,
				)
				await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
				const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
				if (!didApprove) {
					return formatResponse.toolDenied()
				}
			}

			try {
				const ToolHookUtils = await import("../utils/ToolHookUtils")
				await ToolHookUtils.runPreToolUseIfEnabled(config, block)
			} catch (error) {
				if (error instanceof PreToolUseHookCancellationError) {
					return formatResponse.toolDenied()
				}
				throw error
			}

			if (documentWouldChange === true) {
				await atomicReplaceTextFile(destinationPath, content)
			}

			const workflowWriteResult = workflowValueWrites
				? await config.workflowRuntime.applyWorkflowValueWrites({
						taskState: config.taskState,
						values: workflowValueWrites,
					})
				: undefined

			const changedWorkflowValueKeys = workflowWriteResult ? Object.keys(workflowWriteResult.changedValues) : []
			const unchangedWorkflowValueKeys = workflowWriteResult ? Object.keys(workflowWriteResult.unchangedValues) : []

			if (documentWouldChange === true) {
				config.taskState.didEditFile = true
				config.taskState.fileReadCache.delete(destinationPath.toLowerCase())
			}

			config.taskState.consecutiveMistakeCount = 0

			if (documentWouldChange === false && changedWorkflowValueKeys.length === 0) {
				return formatResponse.toolResult(
					JSON.stringify({
						persisted: false,
						artifact_id: artifactId,
						destination_path: destinationPath,
						document_updated: false,
						workflow_value_writes_applied: false,
						reason: "Destination already contained the requested content and no workflow values changed.",
					}),
				)
			}

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					artifact_id: artifactId,
					destination_path: destinationPath,
					document_updated: documentWouldChange,
					workflow_value_writes_applied: changedWorkflowValueKeys.length > 0,
					changed_workflow_value_keys: changedWorkflowValueKeys,
					unchanged_workflow_value_keys: unchangedWorkflowValueKeys,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
