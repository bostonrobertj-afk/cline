import type { ToolUse } from "@core/assistant-message"
import { PreToolUseHookCancellationError } from "@core/hooks/PreToolUseHookCancellationError"
import { formatResponse } from "@core/prompts/responses"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import path from "path"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { ActiveWorkflowSession } from "../../workflow-runtime/types"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { ToolValidator } from "../ToolValidator"
import type { TaskConfig } from "../types/TaskConfig"
import { ToolResultUtils } from "../utils/ToolResultUtils"

const CODE_REVIEW_WORKFLOW_NAME = "code-review"

enum CodeReviewFindingCategory {
	TaskFailure = "task_failure",
	DevAgentFailure = "dev_agent_failure",
	UpstreamFailure = "upstream_failure",
}
const CODE_REVIEW_FINDING_CATEGORIES = [
	CodeReviewFindingCategory.TaskFailure,
	CodeReviewFindingCategory.DevAgentFailure,
	CodeReviewFindingCategory.UpstreamFailure,
] as const

interface CodeReviewFindingRequest {
	finding: string
	categories: readonly CodeReviewFindingCategory[]
	description: string
}

type ParseResult =
	| {
			kind: "succeeded"
			findings: readonly CodeReviewFindingRequest[]
	  }
	| {
			kind: "failed"
			message: string
	  }

type ValueParseResult<ParsedValue> =
	| {
			kind: "succeeded"
			value: ParsedValue
	  }
	| {
			kind: "failed"
			message: string
	  }

interface HeadingSection {
	start: number
	end: number
}

const RECORD_FINDINGS_ALLOWED_PARAM_NAMES = new Set(["findings"])
const CODE_REVIEW_FINDING_CATEGORY_HEADINGS: Record<CodeReviewFindingCategory, string> = {
	[CodeReviewFindingCategory.TaskFailure]: "## Task Failures",
	[CodeReviewFindingCategory.DevAgentFailure]: "## Dev Agent Failures",
	[CodeReviewFindingCategory.UpstreamFailure]: "## Upstream Failures",
}
const CODE_REVIEW_REQUIRED_HEADINGS = [
	CODE_REVIEW_FINDING_CATEGORY_HEADINGS[CodeReviewFindingCategory.TaskFailure],
	CODE_REVIEW_FINDING_CATEGORY_HEADINGS[CodeReviewFindingCategory.DevAgentFailure],
	CODE_REVIEW_FINDING_CATEGORY_HEADINGS[CodeReviewFindingCategory.UpstreamFailure],
] as const

async function atomicReplaceTextFile(filePath: string, content: string): Promise<void> {
	const directory = path.dirname(filePath)
	const tempFilePath = path.join(
		directory,
		`.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
	)

	await fs.writeFile(tempFilePath, content, "utf8")
	try {
		await fs.rename(tempFilePath, filePath)
	} catch (error) {
		try {
			await fs.unlink(tempFilePath)
		} catch {}
		throw error
	}
}

function readRawParam(block: ToolUse, paramName: string): unknown {
	for (const [key, value] of Object.entries(block.params)) {
		if (key === paramName) {
			return value
		}
	}

	return undefined
}

function findUnsupportedTopLevelParams(block: ToolUse): readonly string[] {
	return Object.keys(block.params)
		.filter((paramName) => !RECORD_FINDINGS_ALLOWED_PARAM_NAMES.has(paramName))
		.sort()
}

function parseJsonStringOrMaterializedValue(paramName: string, rawValue: unknown): ValueParseResult<unknown> {
	if (typeof rawValue !== "string") {
		return { kind: "succeeded", value: rawValue }
	}

	const trimmedValue = rawValue.trim()
	if (trimmedValue.length === 0) {
		return { kind: "failed", message: `Parameter '${paramName}' must not be empty.` }
	}

	try {
		return { kind: "succeeded", value: JSON.parse(trimmedValue) }
	} catch {
		return { kind: "failed", message: `Parameter '${paramName}' must be valid JSON when supplied as a string.` }
	}
}

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false
	}

	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

function readNonEmptyStringValue(value: unknown, fieldName: string): ValueParseResult<string> {
	if (typeof value !== "string") {
		return { kind: "failed", message: `Parameter '${fieldName}' must be a string.` }
	}

	const trimmedValue = value.trim()
	if (trimmedValue.length === 0) {
		return { kind: "failed", message: `Parameter '${fieldName}' must not be empty.` }
	}

	return { kind: "succeeded", value: trimmedValue }
}

function parseCategory(value: unknown, fieldName: string): ValueParseResult<CodeReviewFindingCategory> {
	if (typeof value !== "string") {
		return { kind: "failed", message: `Parameter '${fieldName}' must be a string.` }
	}

	switch (value.trim()) {
		case CodeReviewFindingCategory.TaskFailure:
			return { kind: "succeeded", value: CodeReviewFindingCategory.TaskFailure }
		case CodeReviewFindingCategory.DevAgentFailure:
			return { kind: "succeeded", value: CodeReviewFindingCategory.DevAgentFailure }
		case CodeReviewFindingCategory.UpstreamFailure:
			return { kind: "succeeded", value: CodeReviewFindingCategory.UpstreamFailure }
		default:
			return {
				kind: "failed",
				message: `Parameter '${fieldName}' must be one of task_failure, dev_agent_failure, or upstream_failure.`,
			}
	}
}

function parseCategories(value: unknown, fieldName: string): ValueParseResult<readonly CodeReviewFindingCategory[]> {
	if (!Array.isArray(value)) {
		return { kind: "failed", message: `Parameter '${fieldName}' must be an array.` }
	}

	if (value.length === 0) {
		return { kind: "failed", message: `Parameter '${fieldName}' must contain at least one category.` }
	}

	const categories: CodeReviewFindingCategory[] = []
	for (const [index, item] of value.entries()) {
		const category = parseCategory(item, `${fieldName}[${index}]`)
		if (category.kind === "failed") {
			return category
		}
		categories.push(category.value)
	}

	return { kind: "succeeded", value: categories }
}

function parseFindingRequest(value: unknown, index: number): ValueParseResult<CodeReviewFindingRequest> {
	if (!isPlainObject(value)) {
		return { kind: "failed", message: `Parameter 'findings[${index}]' must be an object.` }
	}

	const finding = readNonEmptyStringValue(value.finding, `findings[${index}].finding`)
	const categories = parseCategories(value.categories, `findings[${index}].categories`)
	const description = readNonEmptyStringValue(value.description, `findings[${index}].description`)
	if (finding.kind === "failed") {
		return finding
	}
	if (categories.kind === "failed") {
		return categories
	}
	if (description.kind === "failed") {
		return description
	}

	return {
		kind: "succeeded",
		value: {
			finding: finding.value,
			categories: categories.value,
			description: description.value,
		},
	}
}

function parseRecordFindingsRequest(block: ToolUse): ParseResult {
	if (block.partial === true) {
		return { kind: "failed", message: "record_findings cannot execute partial tool blocks." }
	}

	const unsupportedTopLevelParams = findUnsupportedTopLevelParams(block)
	if (unsupportedTopLevelParams.length > 0) {
		return {
			kind: "failed",
			message: `Unsupported parameter(s) for record_findings: ${unsupportedTopLevelParams.join(
				", ",
			)}. Accepted parameter is findings.`,
		}
	}

	const parsedValue = parseJsonStringOrMaterializedValue("findings", readRawParam(block, "findings"))
	if (parsedValue.kind === "failed") {
		return parsedValue
	}

	if (!Array.isArray(parsedValue.value)) {
		return { kind: "failed", message: "Parameter 'findings' must be an array." }
	}

	const findings: CodeReviewFindingRequest[] = []
	for (const [index, item] of parsedValue.value.entries()) {
		const finding = parseFindingRequest(item, index)
		if (finding.kind === "failed") {
			return { kind: "failed", message: finding.message }
		}
		findings.push(finding.value)
	}

	return { kind: "succeeded", findings }
}

function resolveActiveCodeReviewSession(config: TaskConfig): ValueParseResult<ActiveWorkflowSession> {
	if (config.taskState.activeWorkflowName !== CODE_REVIEW_WORKFLOW_NAME) {
		return { kind: "failed", message: "record_findings can only run during an active code-review workflow session." }
	}

	const session = config.taskState.activeWorkflowSession
	if (session === undefined) {
		return { kind: "failed", message: "record_findings requires an active code-review workflow session." }
	}

	return { kind: "succeeded", value: session }
}

function resolveCodeReviewOutputPath(session: ActiveWorkflowSession): ValueParseResult<string> {
	const outputValue = session.workflowValues.code_review_output
	if (typeof outputValue !== "string") {
		return {
			kind: "failed",
			message: "Workflow value 'code_review_output' must be a non-empty string for record_findings.",
		}
	}

	const outputPath = outputValue.trim()
	if (outputPath.length === 0) {
		return {
			kind: "failed",
			message: "Workflow value 'code_review_output' must be a non-empty string for record_findings.",
		}
	}

	return { kind: "succeeded", value: outputPath }
}

function normalizeMarkdownLines(markdown: string): readonly string[] {
	return markdown.replace(/\r\n/g, "\n").split("\n")
}

function findMissingRequiredHeadings(markdown: string): readonly string[] {
	const lines = new Set(normalizeMarkdownLines(markdown))
	return CODE_REVIEW_REQUIRED_HEADINGS.filter((heading) => !lines.has(heading))
}

function formatUnknownError(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

function findHeadingSection(lines: readonly string[], heading: string): HeadingSection | undefined {
	const start = lines.findIndex((line) => line === heading)
	if (start === -1) {
		return undefined
	}

	let end = lines.length
	for (let lineIndex = start + 1; lineIndex < lines.length; lineIndex += 1) {
		if (/^##\s+/.test(lines[lineIndex])) {
			end = lineIndex
			break
		}
	}

	return { start, end }
}

function buildFindingBlock(finding: CodeReviewFindingRequest): readonly string[] {
	return [`### ${finding.finding}`, "", finding.description]
}

function buildBlocksByHeading(findings: readonly CodeReviewFindingRequest[]): ReadonlyMap<string, readonly string[][]> {
	const blocksByHeading = new Map<string, string[][]>()

	for (const finding of findings) {
		const categorySet = new Set(finding.categories)
		for (const category of CODE_REVIEW_FINDING_CATEGORIES) {
			if (categorySet.has(category)) {
				const heading = CODE_REVIEW_FINDING_CATEGORY_HEADINGS[category]
				const existingBlocks = blocksByHeading.get(heading) ?? []
				blocksByHeading.set(heading, [...existingBlocks, [...buildFindingBlock(finding)]])
			}
		}
	}

	return blocksByHeading
}

function buildUpdatedHeadings(findings: readonly CodeReviewFindingRequest[]): readonly string[] {
	const categories = new Set<CodeReviewFindingCategory>()
	for (const finding of findings) {
		for (const category of finding.categories) {
			categories.add(category)
		}
	}

	const headings: string[] = []
	for (const category of CODE_REVIEW_FINDING_CATEGORIES) {
		if (categories.has(category)) {
			headings.push(CODE_REVIEW_FINDING_CATEGORY_HEADINGS[category])
		}
	}

	return headings
}

function appendBlocksToSection(lines: readonly string[], section: HeadingSection, blocks: readonly string[][]): string[] {
	const sectionLines = lines.slice(section.start, section.end)
	while (sectionLines.length > 0 && sectionLines[sectionLines.length - 1] === "") {
		sectionLines.pop()
	}

	const appendedSectionLines = [...sectionLines]
	for (const block of blocks) {
		if (appendedSectionLines.length > 0) {
			appendedSectionLines.push("")
		}
		appendedSectionLines.push(...block)
	}

	return [...lines.slice(0, section.start), ...appendedSectionLines, ...lines.slice(section.end)]
}

function appendFindingsToDocument(markdown: string, findings: readonly CodeReviewFindingRequest[]): string {
	const blocksByHeading = buildBlocksByHeading(findings)
	let updatedLines = [...normalizeMarkdownLines(markdown)]

	for (const heading of [...CODE_REVIEW_REQUIRED_HEADINGS].reverse()) {
		const blocks = blocksByHeading.get(heading)
		if (blocks === undefined || blocks.length === 0) {
			continue
		}

		const section = findHeadingSection(updatedLines, heading)
		if (section === undefined) {
			throw new Error(`code_review_output is missing required heading: ${heading}.`)
		}

		updatedLines = appendBlocksToSection(updatedLines, section, blocks)
	}

	return updatedLines.join("\n")
}

export class RecordFindingsToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.RECORD_FINDINGS

	constructor(private readonly validator: ToolValidator) {}

	getDescription(_block: ToolUse): string {
		return "[record_findings]"
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const request = parseRecordFindingsRequest(block)
		if (request.kind === "failed") {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(request.message)
		}

		const session = resolveActiveCodeReviewSession(config)
		if (session.kind === "failed") {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(session.message)
		}

		const outputPath = resolveCodeReviewOutputPath(session.value)
		if (outputPath.kind === "failed") {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(outputPath.message)
		}

		const accessValidation = this.validator.checkClineIgnorePath(outputPath.value)
		if (!accessValidation.ok) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(formatResponse.clineIgnoreError(outputPath.value))
		}

		let documentContent: string
		try {
			documentContent = await fs.readFile(outputPath.value, "utf8")
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(formatUnknownError(error))
		}

		const missingHeadings = findMissingRequiredHeadings(documentContent)
		if (missingHeadings.length > 0) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(`code_review_output is missing required heading(s): ${missingHeadings.join(", ")}.`)
		}

		if (request.findings.length === 0) {
			config.taskState.consecutiveMistakeCount = 0
			return formatResponse.toolResult(
				JSON.stringify({
					recordedFindingCount: 0,
					updatedHeadings: [],
				}),
			)
		}

		const updatedContent = appendFindingsToDocument(documentContent, request.findings)
		const updatedHeadings = buildUpdatedHeadings(request.findings)
		const completeMessage = JSON.stringify({
			tool: "recordFindings",
			path: getReadablePath(config.cwd, outputPath.value),
			content: `Recorded ${request.findings.length} code-review finding(s).`,
			operationIsLocatedInWorkspace: await isLocatedInWorkspace(outputPath.value),
		})

		try {
			const shouldAutoApprove =
				config.isSubagentExecution || (await config.callbacks.shouldAutoApproveToolWithPath(block.name, outputPath.value))

			if (shouldAutoApprove === true) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to update ${getWorkspaceBasename(outputPath.value, "RecordFindingsToolHandler.notification")}`,
					config.autoApprovalSettings.enableNotifications,
				)
				await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
				const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
				if (didApprove === false) {
					return formatResponse.toolDenied()
				}
			}

			try {
				const { ToolHookUtils } = await import("../utils/ToolHookUtils")
				await ToolHookUtils.runPreToolUseIfEnabled(config, block)
			} catch (error) {
				if (error instanceof PreToolUseHookCancellationError) {
					return formatResponse.toolDenied()
				}
				throw error
			}

			await atomicReplaceTextFile(outputPath.value, updatedContent)
			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(outputPath.value.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					recordedFindingCount: request.findings.length,
					updatedHeadings,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(formatUnknownError(error))
		}
	}
}
