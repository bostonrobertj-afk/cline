import type { ToolUse } from "@core/assistant-message"
import { PreToolUseHookCancellationError } from "@core/hooks/PreToolUseHookCancellationError"
import { formatResponse } from "@core/prompts/responses"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import path from "path"
import type { ActiveWorkflowSession } from "@/core/task/workflow-runtime/types"
import {
	parseCanonicalEpicIndexEntries,
	upsertCanonicalEpicSection,
} from "@/core/task/workflow-runtime/workflow-modules/create-epics/createEpicsDocument"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import { getBackendWorkflowToolContract } from "../backendWorkflowToolContracts"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { ToolValidator } from "../ToolValidator"
import type { TaskConfig } from "../types/TaskConfig"
import { ToolResultUtils } from "../utils/ToolResultUtils"

const CREATE_EPICS_WORKFLOW_NAME = "create-epics"

interface UpsertEpicObjective {
	as_a: string
	i_want: string
	so_that: string
}

interface UpsertEpicRequest {
	identity: string
	title: string
	objective: UpsertEpicObjective
	description: string
	requirements: readonly string[]
	scope: readonly string[]
	scopeBoundary: readonly string[]
}

type ParseResult =
	| {
			kind: "succeeded"
			request: UpsertEpicRequest
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

type SessionValidationResult =
	| {
			kind: "succeeded"
			session: ActiveWorkflowSession
	  }
	| {
			kind: "failed"
			message: string
	  }

const UPSERT_EPIC_ALLOWED_PARAM_NAMES = new Set([
	"identity",
	"title",
	"objective",
	"description",
	"requirements",
	"scope",
	"scope_boundary",
])

const UPSERT_EPIC_OBJECTIVE_PARAM_NAMES = new Set(["as_a", "i_want", "so_that"])
const UPSERT_EPIC_IDENTITY_PATTERN = /^[1-9]\d*$/

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
		.filter((paramName) => !UPSERT_EPIC_ALLOWED_PARAM_NAMES.has(paramName))
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

function parseNonEmptyStringParam(block: ToolUse, paramName: string): ValueParseResult<string> {
	return readNonEmptyStringValue(readRawParam(block, paramName), paramName)
}

function parseIdentityParam(block: ToolUse): ValueParseResult<string> {
	const identity = parseNonEmptyStringParam(block, "identity")
	if (identity.kind === "failed") {
		return identity
	}

	if (!UPSERT_EPIC_IDENTITY_PATTERN.test(identity.value)) {
		return { kind: "failed", message: "Parameter 'identity' must be a positive numeric string." }
	}

	return identity
}

function parseObjectiveParam(block: ToolUse): ValueParseResult<UpsertEpicObjective> {
	const parsedValue = parseJsonStringOrMaterializedValue("objective", readRawParam(block, "objective"))
	if (parsedValue.kind === "failed") {
		return parsedValue
	}

	if (!isPlainObject(parsedValue.value)) {
		return { kind: "failed", message: "Parameter 'objective' must be an object." }
	}

	const unsupportedObjectiveFields = Object.keys(parsedValue.value)
		.filter((fieldName) => !UPSERT_EPIC_OBJECTIVE_PARAM_NAMES.has(fieldName))
		.sort()
	if (unsupportedObjectiveFields.length > 0) {
		return {
			kind: "failed",
			message: `Parameter 'objective' has unsupported field(s): ${unsupportedObjectiveFields.join(", ")}.`,
		}
	}

	const asA = readNonEmptyStringValue(parsedValue.value.as_a, "objective.as_a")
	const iWant = readNonEmptyStringValue(parsedValue.value.i_want, "objective.i_want")
	const soThat = readNonEmptyStringValue(parsedValue.value.so_that, "objective.so_that")
	if (asA.kind === "failed") {
		return asA
	}
	if (iWant.kind === "failed") {
		return iWant
	}
	if (soThat.kind === "failed") {
		return soThat
	}

	return {
		kind: "succeeded",
		value: {
			as_a: asA.value,
			i_want: iWant.value,
			so_that: soThat.value,
		},
	}
}

function parseStringArrayParam(block: ToolUse, paramName: string): ValueParseResult<readonly string[]> {
	const parsedValue = parseJsonStringOrMaterializedValue(paramName, readRawParam(block, paramName))
	if (parsedValue.kind === "failed") {
		return parsedValue
	}

	if (!Array.isArray(parsedValue.value)) {
		return { kind: "failed", message: `Parameter '${paramName}' must be an array.` }
	}

	if (parsedValue.value.length === 0) {
		return { kind: "failed", message: `Parameter '${paramName}' must contain at least one non-empty string.` }
	}

	const values: string[] = []
	for (const [index, item] of parsedValue.value.entries()) {
		const parsedItem = readNonEmptyStringValue(item, `${paramName}[${index}]`)
		if (parsedItem.kind === "failed") {
			return parsedItem
		}
		values.push(parsedItem.value)
	}

	return { kind: "succeeded", value: values }
}

function parseUpsertEpicRequest(block: ToolUse): ParseResult {
	if (block.partial === true) {
		return { kind: "failed", message: "upsert_epic cannot execute partial tool blocks." }
	}

	const unsupportedTopLevelParams = findUnsupportedTopLevelParams(block)
	if (unsupportedTopLevelParams.length > 0) {
		return {
			kind: "failed",
			message: `Unsupported parameter(s) for upsert_epic: ${unsupportedTopLevelParams.join(
				", ",
			)}. Accepted parameters are identity, title, objective, description, requirements, scope, and scope_boundary. upsert_epic cannot create stories, tasks, subtasks, or acceptance criteria.`,
		}
	}

	const identity = parseIdentityParam(block)
	const title = parseNonEmptyStringParam(block, "title")
	const objective = parseObjectiveParam(block)
	const description = parseNonEmptyStringParam(block, "description")
	const requirements = parseStringArrayParam(block, "requirements")
	const scope = parseStringArrayParam(block, "scope")
	const scopeBoundary = parseStringArrayParam(block, "scope_boundary")

	const parseResults = [identity, title, objective, description, requirements, scope, scopeBoundary]
	const failedResult = parseResults.find((result) => result.kind === "failed")
	if (failedResult?.kind === "failed") {
		return { kind: "failed", message: failedResult.message }
	}

	if (
		identity.kind !== "succeeded" ||
		title.kind !== "succeeded" ||
		objective.kind !== "succeeded" ||
		description.kind !== "succeeded" ||
		requirements.kind !== "succeeded" ||
		scope.kind !== "succeeded" ||
		scopeBoundary.kind !== "succeeded"
	) {
		return { kind: "failed", message: "Unable to parse upsert_epic parameters." }
	}

	return {
		kind: "succeeded",
		request: {
			identity: identity.value,
			title: title.value,
			objective: objective.value,
			description: description.value,
			requirements: requirements.value,
			scope: scope.value,
			scopeBoundary: scopeBoundary.value,
		},
	}
}

function resolveActiveCreateEpicsSession(config: TaskConfig): SessionValidationResult {
	if (config.taskState.activeWorkflowName !== CREATE_EPICS_WORKFLOW_NAME) {
		return { kind: "failed", message: "upsert_epic can only run during an active create-epics workflow session." }
	}

	const session = config.taskState.activeWorkflowSession
	if (session === undefined) {
		return { kind: "failed", message: "upsert_epic requires an active create-epics workflow session." }
	}

	return { kind: "succeeded", session }
}

function resolveOutputFilePath(session: ActiveWorkflowSession): ValueParseResult<string> {
	const outputFileValue = session.workflowValues.output_file
	if (typeof outputFileValue !== "string") {
		return { kind: "failed", message: "Workflow value 'output_file' must be a non-empty string for upsert_epic." }
	}

	const outputFilePath = outputFileValue.trim()
	if (outputFilePath.length === 0) {
		return { kind: "failed", message: "Workflow value 'output_file' must be a non-empty string for upsert_epic." }
	}

	return { kind: "succeeded", value: outputFilePath }
}

export class UpsertEpicToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.UPSERT_EPIC

	constructor(private readonly validator: ToolValidator) {}

	getDescription(block: ToolUse): string {
		const identity = readRawParam(block, "identity")
		if (typeof identity === "string" && identity.trim().length > 0) {
			return `[${block.name} Epic ${identity.trim()}]`
		}

		return `[${block.name}]`
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		if (!getBackendWorkflowToolContract(ClineDefaultTool.UPSERT_EPIC)) {
			return formatResponse.toolError("Backend workflow tool contract missing for upsert_epic.")
		}

		const request = parseUpsertEpicRequest(block)
		if (request.kind === "failed") {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(request.message)
		}

		const sessionResult = resolveActiveCreateEpicsSession(config)
		if (sessionResult.kind === "failed") {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(sessionResult.message)
		}

		const outputFilePath = resolveOutputFilePath(sessionResult.session)
		if (outputFilePath.kind === "failed") {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(outputFilePath.message)
		}

		const accessValidation = this.validator.checkClineIgnorePath(outputFilePath.value)
		if (!accessValidation.ok) {
			return formatResponse.toolError(formatResponse.clineIgnoreError(outputFilePath.value))
		}

		try {
			const priorContent = await fs.readFile(outputFilePath.value, "utf8")
			const updatedContent = upsertCanonicalEpicSection(priorContent, {
				identity: request.request.identity,
				title: request.request.title,
				objective: request.request.objective,
				description: request.request.description,
				requirements: request.request.requirements,
				scope: request.request.scope,
				scopeBoundary: request.request.scopeBoundary,
			})
			const documentWouldChange = priorContent !== updatedContent

			if (documentWouldChange === true) {
				const completeMessage = JSON.stringify({
					tool: "upsertEpic",
					path: getReadablePath(config.cwd, outputFilePath.value),
					content: `Epic ${request.request.identity}: ${request.request.title}`,
					operationIsLocatedInWorkspace: await isLocatedInWorkspace(outputFilePath.value),
				})
				const shouldAutoApprove =
					config.isSubagentExecution ||
					(await config.callbacks.shouldAutoApproveToolWithPath(block.name, outputFilePath.value))

				if (shouldAutoApprove === true) {
					if (!config.isSubagentExecution) {
						await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
						await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
					}
				} else {
					showNotificationForApproval(
						`Cline wants to update ${getWorkspaceBasename(outputFilePath.value, "UpsertEpicToolHandler.notification")}`,
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

				await atomicReplaceTextFile(outputFilePath.value, updatedContent)
				config.taskState.didEditFile = true
				config.taskState.fileReadCache.delete(outputFilePath.value.toLowerCase())
			}

			config.taskState.consecutiveMistakeCount = 0
			const epics = parseCanonicalEpicIndexEntries(updatedContent)

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: documentWouldChange,
					identity: request.request.identity,
					title: request.request.title,
					epics,
				}),
			)
		} catch (error) {
			config.taskState.consecutiveMistakeCount += 1
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
