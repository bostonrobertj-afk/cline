import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { getTaskMetadata, saveTaskMetadata } from "@core/storage/disk"
import { applyManagedWorkflowDynamicPlaceholders } from "@core/task/managed-workflows/placeholders"
import type { ManagedWorkflowRunState } from "@core/task/managed-workflows/types"
import { getPlaceholderWorkflowValueMap } from "@core/workflows/placeholder-workflow-rendering"
import { buildWorkflowStablePlaceholders, resolveWorkflowPlaceholderText } from "@core/workflows/workflow-placeholders"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import * as yaml from "js-yaml"
import path from "path"
import { recordAndPersistPlaceholderWorkflowWriteProof } from "@/core/task/focus-chain/placeholderWorkflowWriteProofs"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value)
}

function parseFrontmatterDocument(markdown: string): { frontmatter: Record<string, unknown>; body: string } {
	if (!markdown.startsWith("---\n")) {
		throw new Error("Document is missing required YAML frontmatter.")
	}

	const closingDelimiterIndex = markdown.indexOf("\n---\n", 4)
	if (closingDelimiterIndex === -1) {
		throw new Error("Document is missing required YAML frontmatter.")
	}

	const rawFrontmatter = markdown.slice(4, closingDelimiterIndex)
	const body = markdown.slice(closingDelimiterIndex + "\n---\n".length)
	const parsed = yaml.load(rawFrontmatter, { schema: yaml.JSON_SCHEMA })

	if (!isPlainObject(parsed)) {
		throw new Error("Document frontmatter must parse to a plain object.")
	}

	return { frontmatter: parsed, body }
}

function serializeFrontmatterDocument(frontmatter: Record<string, unknown>, body: string): string {
	return `---\n${yaml.dump(frontmatter, { lineWidth: -1 }).trimEnd()}\n---\n\n${body.replace(/^\n+/, "")}`
}

function extractRequiredPrdSection(markdown: string, heading: string, prdPath: string): string {
	const headingLine = `## ${heading}`
	const startIndex = markdown.indexOf(headingLine)
	if (startIndex === -1 || (startIndex > 0 && markdown[startIndex - 1] !== "\n")) {
		throw new Error(`Could not find required PRD section '## ${heading}' in ${prdPath}.`)
	}

	const sectionBodyStart = startIndex + headingLine.length
	const nextHeadingIndex = markdown.indexOf("\n## ", sectionBodyStart)
	const sectionBody =
		nextHeadingIndex === -1 ? markdown.slice(sectionBodyStart) : markdown.slice(sectionBodyStart, nextHeadingIndex)

	return sectionBody.trim()
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

function applyGenericWorkflowPlaceholders(
	workflowId: string,
	currentStablePlaceholders: Record<string, string> | undefined,
	currentPlaceholders: Record<string, string> | undefined,
	values: Record<string, unknown>,
) {
	const syntheticRun: ManagedWorkflowRunState = {
		workflowId,
		slashCommand: workflowId,
		status: "active",
		currentPhaseIndex: 0,
		phases: [],
		createdAt: 0,
		updatedAt: 0,
		allRequiredComplete: false,
		stablePlaceholders: currentStablePlaceholders,
		dynamicPlaceholders: currentPlaceholders,
	}

	return applyManagedWorkflowDynamicPlaceholders(syntheticRun, values)
}

async function persistOutputFilePlaceholder(config: TaskConfig, outputFilePath: string): Promise<void> {
	if (config.taskState.managedWorkflowRun) {
		const managedResult = applyManagedWorkflowDynamicPlaceholders(config.taskState.managedWorkflowRun, {
			output_file: outputFilePath,
		})
		config.taskState.managedWorkflowRun = managedResult.run
		config.taskState.activeWorkflowId = config.taskState.managedWorkflowRun.workflowId
	} else {
		const genericWorkflowId = config.taskState.activePlaceholderWorkflowId
		if (!genericWorkflowId) {
			throw new Error("No active workflow with placeholder support is currently active.")
		}

		const genericResult = applyGenericWorkflowPlaceholders(
			genericWorkflowId,
			config.taskState.activePlaceholderWorkflowStableValues,
			config.taskState.activePlaceholderWorkflowValues,
			{ output_file: outputFilePath },
		)
		config.taskState.activePlaceholderWorkflowValues = genericResult.run.dynamicPlaceholders
	}

	if (!config.isSubagentExecution) {
		try {
			const metadata = await getTaskMetadata(config.taskId)
			metadata.activeWorkflowId = config.taskState.activeWorkflowId
			metadata.activePlaceholderWorkflowId = config.taskState.activePlaceholderWorkflowId
			metadata.activePlaceholderWorkflowSource = config.taskState.activePlaceholderWorkflowSource
			metadata.activePlaceholderWorkflowStableValues = config.taskState.activePlaceholderWorkflowStableValues
			metadata.activePlaceholderWorkflowValues = config.taskState.activePlaceholderWorkflowValues
			metadata.managedWorkflowRun = config.taskState.managedWorkflowRun
			await saveTaskMetadata(config.taskId, metadata)
		} catch {
			// Non-fatal: the in-memory managed workflow run remains canonical for the active task.
		}
	}

	await config.callbacks.updateFCListFromToolResponse(undefined)
}

export class BuildEpicsDocumentToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.BUILD_EPICS_DOCUMENT

	getDescription(_block: ToolUse): string {
		return "[build_epics_document]"
	}

	async handlePartialBlock(_block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		await uiHelpers.say("tool", JSON.stringify({ tool: "buildEpicsDocument" }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const _params = block.params as Record<string, unknown>
		void _params

		const placeholders =
			getPlaceholderWorkflowValueMap(
				config.taskState.activePlaceholderWorkflowStableValues,
				config.taskState.activePlaceholderWorkflowValues,
			) ?? {}

		const mode = placeholders.mode?.trim()
		const architectureDocumentRaw = placeholders.architecture_document?.trim()
		const prdRaw = placeholders.prd?.trim()
		const uiSpecRaw = placeholders.ui_spec?.trim()
		const uxSpecRaw = placeholders.ux_spec?.trim()

		if (!mode) {
			return formatResponse.toolError(
				"Could not resolve workflow placeholder 'mode' from the active placeholder workflow state.",
			)
		}

		if (!architectureDocumentRaw) {
			return formatResponse.toolError(
				"Could not resolve workflow placeholder 'architecture_document' from the active placeholder workflow state.",
			)
		}

		if (!prdRaw) {
			return formatResponse.toolError(
				"Could not resolve workflow placeholder 'prd' from the active placeholder workflow state.",
			)
		}

		const stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd: config.cwd })
		const artifactRaw = resolveWorkflowPlaceholderText("{output_folder}/planning_artifacts/epics.md", stablePlaceholders)

		if (!artifactRaw || artifactRaw.includes("{output_folder}")) {
			return formatResponse.toolError(
				"Could not resolve stable placeholder 'output_folder' from .cline/workflow-config.yaml.",
			)
		}

		const templateRaw = resolveWorkflowPlaceholderText(
			"{project-root}/.cline/skills/bmad-create-epics-and-stories/templates/epics-template.md",
			stablePlaceholders,
		)

		const resolutionBase =
			placeholders.cwd?.trim() ||
			placeholders.project_root?.trim() ||
			placeholders["project-root"]?.trim() ||
			stablePlaceholders.cwd?.trim() ||
			config.cwd

		const architectureDocumentPath = path.isAbsolute(architectureDocumentRaw)
			? architectureDocumentRaw
			: path.resolve(resolutionBase, architectureDocumentRaw)
		const prdPath = path.isAbsolute(prdRaw) ? prdRaw : path.resolve(resolutionBase, prdRaw)
		const uiSpecPath = uiSpecRaw
			? path.isAbsolute(uiSpecRaw)
				? uiSpecRaw
				: path.resolve(resolutionBase, uiSpecRaw)
			: undefined
		const uxSpecPath = uxSpecRaw
			? path.isAbsolute(uxSpecRaw)
				? uxSpecRaw
				: path.resolve(resolutionBase, uxSpecRaw)
			: undefined
		const artifactPath = path.isAbsolute(artifactRaw) ? artifactRaw : path.resolve(config.cwd, artifactRaw)
		const templatePath =
			templateRaw && path.isAbsolute(templateRaw) ? templateRaw : path.resolve(config.cwd, templateRaw ?? "")

		if (mode !== "new" && mode !== "continue") {
			return formatResponse.toolError(`Unsupported workflow mode "${mode}". Supported values: new, continue.`)
		}

		try {
			if (mode === "continue") {
				try {
					await fs.access(artifactPath)
				} catch {
					return formatResponse.toolError(
						`Could not continue create-epics workflow because the canonical epics artifact does not exist at ${artifactPath}.`,
					)
				}

				await persistOutputFilePlaceholder(config, artifactPath)
				config.taskState.consecutiveMistakeCount = 0

				return formatResponse.toolResult(
					JSON.stringify({
						persisted: false,
						artifact_path: artifactPath,
						mode: "continue",
						output_file_available: true,
					}),
				)
			}

			const templateMarkdown = await fs.readFile(templatePath, "utf8")
			const prdMarkdown = await fs.readFile(prdPath, "utf8")
			const { frontmatter, body } = parseFrontmatterDocument(templateMarkdown)

			delete frontmatter.inputDocuments
			frontmatter.Architecture = architectureDocumentPath
			frontmatter.PRD = prdPath

			const uiUxDocumentPaths = [uiSpecPath, uxSpecPath].filter(
				(candidate): candidate is string => typeof candidate === "string" && candidate.length > 0,
			)
			if (uiUxDocumentPaths.length > 0) {
				frontmatter["UI/UX"] = uiUxDocumentPaths
			} else {
				delete frontmatter["UI/UX"]
			}

			const functionalRequirements = extractRequiredPrdSection(prdMarkdown, "Functional Requirements", prdPath)
			const nonFunctionalRequirements = extractRequiredPrdSection(prdMarkdown, "Non-Functional Requirements", prdPath)
			const domainSpecificRequirements = extractRequiredPrdSection(prdMarkdown, "Domain-Specific Requirements", prdPath)
			const roadmap = extractRequiredPrdSection(prdMarkdown, "Roadmap", prdPath)

			let rebuiltBody = replaceTemplateSection(
				body,
				"### Functional Requirements\n\n",
				"### NonFunctional Requirements\n",
				functionalRequirements,
			)
			rebuiltBody = replaceTemplateSection(
				rebuiltBody,
				"### NonFunctional Requirements\n\n",
				"### Additional Requirements\n",
				nonFunctionalRequirements,
			)
			rebuiltBody = replaceTemplateSection(
				rebuiltBody,
				"### Additional Requirements\n\n",
				"### UX Design Requirements\n",
				"",
			)
			rebuiltBody = replaceTemplateSection(
				rebuiltBody,
				"### UX Design Requirements\n\n",
				"### Domain-Specific Requirements\n",
				"",
			)
			rebuiltBody = replaceTemplateSection(
				rebuiltBody,
				"### Domain-Specific Requirements\n\n",
				"## Roadmap\n",
				domainSpecificRequirements,
			)
			rebuiltBody = replaceTemplateSection(rebuiltBody, "## Roadmap\n\n", "### FR Coverage Map\n", roadmap)

			const completeMessage = JSON.stringify({
				tool: "buildEpicsDocument",
				path: getReadablePath(config.cwd, artifactPath),
				content: `PRD: ${getReadablePath(config.cwd, prdPath)}\nTemplate: ${getReadablePath(config.cwd, templatePath)}`,
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
					`Cline wants to build ${getWorkspaceBasename(artifactPath, "BuildEpicsDocument.notification")}`,
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

			await atomicReplaceTextFile(artifactPath, serializeFrontmatterDocument(frontmatter, rebuiltBody))
			await recordAndPersistPlaceholderWorkflowWriteProof({
				taskId: config.taskId,
				taskState: config.taskState,
				filePath: artifactPath,
			})
			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(artifactPath.toLowerCase())
			await persistOutputFilePlaceholder(config, artifactPath)
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					artifact_path: artifactPath,
					mode: "new",
					output_file_available: true,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
