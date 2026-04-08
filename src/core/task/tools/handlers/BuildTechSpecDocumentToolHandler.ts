import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { getPlaceholderWorkflowValueMap, resolvePlaceholderWorkflowText } from "@core/workflows/placeholder-workflow-rendering"
import { getActivePlaceholderWorkflowStepDetails } from "@core/workflows/placeholder-workflow-step-details"
import { buildWorkflowStablePlaceholders, resolveWorkflowPlaceholderText } from "@core/workflows/workflow-placeholders"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import path from "path"
import { recordAndPersistPlaceholderWorkflowWriteProof } from "@/core/task/focus-chain/placeholderWorkflowWriteProofs"
import { isBuildTechSpecDocumentStep } from "@/shared/build-tech-spec-document"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import { ToolResultUtils } from "../utils/ToolResultUtils"
import { persistWorkflowPlaceholderValues } from "./SetWorkflowPlaceholdersToolHandler"

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

function slugifyQuickSpecTitle(title: string): string {
	return title
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "")
}

async function resolveActiveQuickSpecStepTwo(config: TaskConfig) {
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

export class BuildTechSpecDocumentToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.BUILD_TECH_SPEC_DOCUMENT

	getDescription(_block: ToolUse): string {
		return "[build_tech_spec_document]"
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			const activeStep = await resolveActiveQuickSpecStepTwo(config)
			if (!isBuildTechSpecDocumentStep(activeStep?.sourceName, activeStep?.stepNumber)) {
				return formatResponse.toolError(
					"build_tech_spec_document can only be used while quick-spec.md Step 2 is the active placeholder workflow context.",
				)
			}

			const placeholders =
				getPlaceholderWorkflowValueMap(
					config.taskState.activePlaceholderWorkflowStableValues,
					config.taskState.activePlaceholderWorkflowValues,
				) ?? {}

			const title = resolvePlaceholderWorkflowText(placeholders.title?.trim(), placeholders)?.trim()
			if (!title) {
				return formatResponse.toolError(
					"Could not resolve workflow placeholder 'title' from the active placeholder workflow state.",
				)
			}

			const stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd: config.cwd })
			const templateRaw = resolveWorkflowPlaceholderText(
				"{project-root}/.cline/skills/bmad-quick-spec/tech-spec-template.md",
				stablePlaceholders,
			)

			if (!templateRaw || templateRaw.includes("{project-root}")) {
				return formatResponse.toolError(
					"Could not resolve the canonical quick-spec template path from stable workflow placeholders.",
				)
			}

			const artifactRaw = resolveWorkflowPlaceholderText("{implementation_artifacts}/tech-spec-wip.md", stablePlaceholders)

			if (!artifactRaw || artifactRaw.includes("{implementation_artifacts}")) {
				return formatResponse.toolError(
					"Could not resolve stable placeholder 'implementation_artifacts' from .cline/workflow-config.yaml.",
				)
			}

			const templatePath =
				templateRaw && path.isAbsolute(templateRaw) ? templateRaw : path.resolve(config.cwd, templateRaw ?? "")
			const artifactPath = path.isAbsolute(artifactRaw) ? artifactRaw : path.resolve(config.cwd, artifactRaw)

			let templateMarkdown: string
			try {
				templateMarkdown = await fs.readFile(templatePath, "utf8")
			} catch {
				return formatResponse.toolError(`Could not read the canonical quick-spec template at ${templatePath}.`)
			}

			const slug = slugifyQuickSpecTitle(title)
			const date = stablePlaceholders.date?.trim()

			if (!date) {
				return formatResponse.toolError("Could not resolve stable placeholder 'date' from workflow runtime state.")
			}

			if (!slug) {
				return formatResponse.toolError("Could not derive a valid slug from workflow placeholder 'title'.")
			}

			const rebuiltDocument = templateMarkdown
				.replaceAll("{title}", title)
				.replaceAll("{slug}", slug)
				.replaceAll("{date}", date)

			const completeMessage = JSON.stringify({
				tool: "buildTechSpecDocument",
				path: getReadablePath(config.cwd, artifactPath),
				content: `Title: ${title}\nTemplate: ${getReadablePath(config.cwd, templatePath)}`,
				operationIsLocatedInWorkspace: await isLocatedInWorkspace(artifactPath),
			})

			const shouldAutoApprove =
				config.isSubagentExecution || (await config.callbacks.shouldAutoApproveToolWithPath(block.name, artifactPath))

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to build ${getWorkspaceBasename(artifactPath, "BuildTechSpecDocument.notification")}`,
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

			await atomicReplaceTextFile(artifactPath, rebuiltDocument)
			await recordAndPersistPlaceholderWorkflowWriteProof({
				taskId: config.taskId,
				taskState: config.taskState,
				filePath: artifactPath,
			})
			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(artifactPath.toLowerCase())
			await persistWorkflowPlaceholderValues(config, { output_file: artifactPath })

			return formatResponse.toolResult(
				JSON.stringify({ persisted: true, artifact_path: artifactPath, output_file_available: true }),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
