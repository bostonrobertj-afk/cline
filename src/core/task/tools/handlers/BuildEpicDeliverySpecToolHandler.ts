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
import { isBuildEpicDeliverySpecStep } from "@/shared/build-epic-delivery-spec"
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

async function resolveActivePiPlanningStepThree(config: TaskConfig) {
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

function extractSelectedEpicBlock(markdown: string, targetEpic: string): string | undefined {
	const headingPattern = new RegExp(`^\\s{0,3}###\\s+${escapeRegExp(targetEpic)}\\s*$`, "m")
	const headingMatch = headingPattern.exec(markdown)
	if (!headingMatch) {
		return undefined
	}

	const blockStart = headingMatch.index + headingMatch[0].length
	const remainingMarkdown = markdown.slice(blockStart)
	const nextBoundaryMatch = /^\s{0,3}(?:###\s+Epic\s+|##\s+)/m.exec(remainingMarkdown)
	const epicBlock = nextBoundaryMatch === null ? remainingMarkdown : remainingMarkdown.slice(0, nextBoundaryMatch.index)

	return epicBlock.trim()
}

function extractRequiredEpicSection(epicBlock: string, heading: string): string | undefined {
	const headingPattern = new RegExp(`^\\s{0,3}####\\s+${escapeRegExp(heading)}\\s*$`, "m")
	const headingMatch = headingPattern.exec(epicBlock)
	if (!headingMatch) {
		return undefined
	}

	const sectionStart = headingMatch.index + headingMatch[0].length
	const remainingBlock = epicBlock.slice(sectionStart)
	const nextHeadingMatch = /^\s{0,3}####\s+/m.exec(remainingBlock)
	const sectionBody = nextHeadingMatch === null ? remainingBlock : remainingBlock.slice(0, nextHeadingMatch.index)
	const trimmedSection = sectionBody.trim()

	return trimmedSection || undefined
}

const POPULATE_DELIVERY_SPEC_ERROR =
	"Unable to populate delivery spec from the epics document. Please ensure the epics document is complete before attempting this workflow."

export class BuildEpicDeliverySpecToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.BUILD_EPIC_DELIVERY_SPEC

	getDescription(_block: ToolUse): string {
		return "[build_epic_delivery_spec]"
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		try {
			const activeStep = await resolveActivePiPlanningStepThree(config)
			if (!isBuildEpicDeliverySpecStep(activeStep?.sourceName, activeStep?.stepNumber)) {
				return formatResponse.toolError(
					"build_epic_delivery_spec can only be used while pi-planning.md Step 3 is the active placeholder workflow context.",
				)
			}

			const placeholders =
				getPlaceholderWorkflowValueMap(
					config.taskState.activePlaceholderWorkflowStableValues,
					config.taskState.activePlaceholderWorkflowValues,
				) ?? {}

			const epicsDocumentRaw = resolvePlaceholderWorkflowText(placeholders.epics_document?.trim(), placeholders)?.trim()
			const targetEpic = resolvePlaceholderWorkflowText(placeholders.target_epic?.trim(), placeholders)?.trim()

			if (!epicsDocumentRaw) {
				return formatResponse.toolError(
					"Could not resolve workflow placeholder 'epics_document' from the active placeholder workflow state.",
				)
			}

			if (!targetEpic) {
				return formatResponse.toolError(
					"Could not resolve workflow placeholder 'target_epic' from the active placeholder workflow state.",
				)
			}

			const resolutionBase =
				placeholders.cwd?.trim() ||
				placeholders.project_root?.trim() ||
				placeholders["project-root"]?.trim() ||
				config.taskState.activePlaceholderWorkflowStableValues?.cwd?.trim() ||
				config.cwd

			const epicsDocumentPath = path.isAbsolute(epicsDocumentRaw)
				? epicsDocumentRaw
				: path.resolve(resolutionBase, epicsDocumentRaw)

			const stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd: config.cwd })
			const templateRaw = resolveWorkflowPlaceholderText(
				"{project-root}/.cline/skills/create-epics/epic-delivery-spec-template.md",
				stablePlaceholders,
			)

			const targetEpicMatch = /^Epic\s+(\d+):\s+.+$/.exec(targetEpic)
			if (!targetEpicMatch) {
				return formatResponse.toolError(POPULATE_DELIVERY_SPEC_ERROR)
			}

			const artifactRaw = resolveWorkflowPlaceholderText(
				`{output_folder}/implementation-artifacts/epic-${targetEpicMatch[1]}-delivery-spec.md`,
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
				return formatResponse.toolError(`Could not read the canonical epic delivery spec template at ${templatePath}.`)
			}

			let epicsDocumentContents: string
			try {
				epicsDocumentContents = await fs.readFile(epicsDocumentPath, "utf8")
			} catch {
				return formatResponse.toolError(`Could not read the resolved epics_document at ${epicsDocumentPath}.`)
			}

			const selectedEpicBlock = extractSelectedEpicBlock(epicsDocumentContents, targetEpic)
			if (!selectedEpicBlock) {
				return formatResponse.toolError(POPULATE_DELIVERY_SPEC_ERROR)
			}

			const objective = extractRequiredEpicSection(selectedEpicBlock, "Objective")
			const description = extractRequiredEpicSection(selectedEpicBlock, "Description")
			const successMeasures = extractRequiredEpicSection(selectedEpicBlock, "Success Measures")
			const scope = extractRequiredEpicSection(selectedEpicBlock, "Scope")
			const scopeBoundary = extractRequiredEpicSection(selectedEpicBlock, "Scope Boundary")

			if (!objective || !description || !successMeasures || !scope || !scopeBoundary) {
				return formatResponse.toolError(POPULATE_DELIVERY_SPEC_ERROR)
			}

			let rebuiltDocument = templateMarkdown.replace("# Epic Name", `# ${targetEpic}`)
			rebuiltDocument = rebuiltDocument.replace("### Epic #: Epic_Name", `### ${targetEpic}`)
			rebuiltDocument = replaceTemplateSection(rebuiltDocument, "#### Objective\n", "#### Description\n", objective)
			rebuiltDocument = replaceTemplateSection(
				rebuiltDocument,
				"#### Description\n",
				"#### Success Measures\n",
				description,
			)
			rebuiltDocument = replaceTemplateSection(rebuiltDocument, "#### Success Measures\n", "#### Scope\n", successMeasures)
			rebuiltDocument = replaceTemplateSection(rebuiltDocument, "#### Scope\n", "#### Scope Boundary\n", scope)
			rebuiltDocument = replaceTemplateSection(rebuiltDocument, "#### Scope Boundary\n", "# User Stories\n", scopeBoundary)

			const completeMessage = JSON.stringify({
				tool: "buildEpicDeliverySpec",
				path: getReadablePath(config.cwd, artifactPath),
				content: `Epics: ${getReadablePath(config.cwd, epicsDocumentPath)}\nTemplate: ${getReadablePath(config.cwd, templatePath)}`,
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
					`Cline wants to build ${getWorkspaceBasename(artifactPath, "BuildEpicDeliverySpec.notification")}`,
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
			await persistWorkflowPlaceholderValues(config, { epic_delivery_spec: artifactPath })

			return formatResponse.toolResult(
				JSON.stringify({ persisted: true, artifact_path: artifactPath, epic_delivery_spec_available: true }),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
