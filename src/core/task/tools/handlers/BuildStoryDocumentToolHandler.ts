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
import { isBuildStoryDocumentStep } from "@/shared/build-story-document"
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

function replaceTemplateSection(templateBody: string, startMarker: string, endMarker: string, replacement: string): string {
	const startIndex = templateBody.indexOf(startMarker)
	if (startIndex === -1) {
		throw new Error(`Template marker not found: ${startMarker}`)
	}

	const endIndex = templateBody.indexOf(endMarker, startIndex + startMarker.length)
	if (endIndex === -1) {
		throw new Error(`Template marker not found: ${endMarker}`)
	}

	return (
		templateBody.slice(0, startIndex) +
		`${startMarker}${replacement.trim() ? `${replacement.trim()}\n\n` : ""}` +
		templateBody.slice(endIndex)
	)
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function resolveActiveCreateStoryStepTwo(config: TaskConfig) {
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

function extractSelectedStoryBlock(markdown: string, storyNumber: string): string | undefined {
	const headingPattern = new RegExp(`^\\s{0,3}##\\s+Story\\s+${escapeRegExp(storyNumber)}\\s*$`, "m")
	const headingMatch = headingPattern.exec(markdown)
	if (!headingMatch) {
		return undefined
	}

	const blockStart = headingMatch.index + headingMatch[0].length
	const remainingMarkdown = markdown.slice(blockStart)
	const nextBoundaryMatch = /^\s{0,3}(?:##\s+Story\s+|#\s+)/m.exec(remainingMarkdown)
	const storyBlock = nextBoundaryMatch === null ? remainingMarkdown : remainingMarkdown.slice(0, nextBoundaryMatch.index)

	return storyBlock.trim()
}

function extractRequiredStorySection(storyBlock: string, heading: string): string | undefined {
	const headingPattern = new RegExp(`^\\s{0,3}###\\s+${escapeRegExp(heading)}\\s*$`, "m")
	const headingMatch = headingPattern.exec(storyBlock)
	if (!headingMatch) {
		return undefined
	}

	const sectionStart = headingMatch.index + headingMatch[0].length
	const remainingBlock = storyBlock.slice(sectionStart)
	const nextHeadingMatch = /^\s{0,3}###\s+/m.exec(remainingBlock)
	const sectionBody = nextHeadingMatch === null ? remainingBlock : remainingBlock.slice(0, nextHeadingMatch.index)
	const trimmedSection = sectionBody.trim()

	return trimmedSection || undefined
}

const POPULATE_STORY_DOCUMENT_ERROR =
	"Unable to populate story document from the epic delivery spec. Please ensure the epic delivery spec is complete before attempting this workflow."

export class BuildStoryDocumentToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.BUILD_STORY_DOCUMENT

	getDescription(_block: ToolUse): string {
		return "[build_story_document]"
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			const activeStep = await resolveActiveCreateStoryStepTwo(config)
			if (!isBuildStoryDocumentStep(activeStep?.sourceName, activeStep?.stepNumber)) {
				return formatResponse.toolError(
					"build_story_document can only be used while create-story.md Step 2 is the active placeholder workflow context.",
				)
			}

			const placeholders =
				getPlaceholderWorkflowValueMap(
					config.taskState.activePlaceholderWorkflowStableValues,
					config.taskState.activePlaceholderWorkflowValues,
				) ?? {}

			const epicDeliverySpecRaw = resolvePlaceholderWorkflowText(
				placeholders.epic_delivery_spec?.trim(),
				placeholders,
			)?.trim()
			const storyNumber = resolvePlaceholderWorkflowText(placeholders.story_number?.trim(), placeholders)?.trim()

			if (!epicDeliverySpecRaw) {
				return formatResponse.toolError(
					"Could not resolve workflow placeholder 'epic_delivery_spec' from the active placeholder workflow state.",
				)
			}

			if (!storyNumber) {
				return formatResponse.toolError(
					"Could not resolve workflow placeholder 'story_number' from the active placeholder workflow state.",
				)
			}

			const resolutionBase =
				placeholders.cwd?.trim() ||
				placeholders.project_root?.trim() ||
				placeholders["project-root"]?.trim() ||
				config.taskState.activePlaceholderWorkflowStableValues?.cwd?.trim() ||
				config.cwd

			const epicDeliverySpecPath = path.isAbsolute(epicDeliverySpecRaw)
				? epicDeliverySpecRaw
				: path.resolve(resolutionBase, epicDeliverySpecRaw)

			const stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd: config.cwd })
			const templateRaw = resolveWorkflowPlaceholderText("{story_template}", stablePlaceholders)

			if (!templateRaw || templateRaw.includes("{story_template}")) {
				return formatResponse.toolError(
					"Could not resolve stable placeholder 'story_template' from .cline/workflow-config.yaml.",
				)
			}

			const artifactRaw = resolveWorkflowPlaceholderText(
				`{output_folder}/implementation-artifacts/story${storyNumber}.md`,
				stablePlaceholders,
			)

			if (!artifactRaw || artifactRaw.includes("{output_folder}")) {
				return formatResponse.toolError(
					"Could not resolve stable placeholder 'output_folder' from .cline/workflow-config.yaml.",
				)
			}

			const templatePath =
				templateRaw && path.isAbsolute(templateRaw) ? templateRaw : path.resolve(config.cwd, templateRaw ?? "")
			const artifactPath = path.isAbsolute(artifactRaw) ? artifactRaw : path.resolve(config.cwd, artifactRaw)

			let templateMarkdown: string
			try {
				templateMarkdown = await fs.readFile(templatePath, "utf8")
			} catch {
				return formatResponse.toolError(`Could not read the canonical story template at ${templatePath}.`)
			}

			let epicDeliverySpecContents: string
			try {
				epicDeliverySpecContents = await fs.readFile(epicDeliverySpecPath, "utf8")
			} catch {
				return formatResponse.toolError(`Could not read the resolved epic_delivery_spec at ${epicDeliverySpecPath}.`)
			}

			const selectedStoryBlock = extractSelectedStoryBlock(epicDeliverySpecContents, storyNumber)
			if (!selectedStoryBlock) {
				return formatResponse.toolError(POPULATE_STORY_DOCUMENT_ERROR)
			}

			const objective = extractRequiredStorySection(selectedStoryBlock, "Objective")
			const acceptanceCriteria = extractRequiredStorySection(selectedStoryBlock, "Acceptance Criteria")
			const sequencingDependencies = extractRequiredStorySection(selectedStoryBlock, "Sequencing/ Dependencies")

			if (!objective || !acceptanceCriteria || !sequencingDependencies) {
				return formatResponse.toolError(POPULATE_STORY_DOCUMENT_ERROR)
			}

			let rebuiltDocument = templateMarkdown.replace("# Story {{epic_num}}.{{story_num}}", `# Story ${storyNumber}`)
			rebuiltDocument = replaceTemplateSection(rebuiltDocument, "## Story\n", "## Acceptance Criteria\n", objective)
			rebuiltDocument = replaceTemplateSection(
				rebuiltDocument,
				"## Acceptance Criteria\n",
				"## Sequencing / Dependencies\n",
				acceptanceCriteria,
			)
			rebuiltDocument = replaceTemplateSection(
				rebuiltDocument,
				"## Sequencing / Dependencies\n",
				"## Tasks / Subtasks\n",
				sequencingDependencies,
			)

			const completeMessage = JSON.stringify({
				tool: "buildStoryDocument",
				path: getReadablePath(config.cwd, artifactPath),
				content: `Epic Delivery Spec: ${getReadablePath(config.cwd, epicDeliverySpecPath)}\nTemplate: ${getReadablePath(config.cwd, templatePath)}`,
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
					`Cline wants to build ${getWorkspaceBasename(artifactPath, "BuildStoryDocument.notification")}`,
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
			await persistWorkflowPlaceholderValues(config, { story_doc: artifactPath })

			return formatResponse.toolResult(
				JSON.stringify({ persisted: true, artifact_path: artifactPath, story_doc_available: true }),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
