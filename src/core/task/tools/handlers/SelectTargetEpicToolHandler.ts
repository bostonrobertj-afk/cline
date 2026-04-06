import { findLast } from "@shared/array"
import { ClineAskQuestion } from "@shared/ExtensionMessage"
import fs from "fs/promises"
import path from "path"
import {
	isSelectTargetEpicStep,
	SELECT_TARGET_EPIC_PLACEHOLDER_KEY,
	SELECT_TARGET_EPIC_QUESTION,
} from "@/shared/select-target-epic"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolUse } from "../../../assistant-message"
import { formatResponse } from "../../../prompts/responses"
import { getPlaceholderWorkflowValueMap, resolvePlaceholderWorkflowText } from "../../../workflows/placeholder-workflow-rendering"
import { getActivePlaceholderWorkflowStepDetails } from "../../../workflows/placeholder-workflow-step-details"
import type { ToolResponse } from "../../index"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import { persistWorkflowPlaceholderValues } from "./SetWorkflowPlaceholdersToolHandler"

function extractEpicLabels(markdown: string): string[] {
	const anchorMatch = /^\s{0,3}###\s+Epic List\s*$/m.exec(markdown)
	if (!anchorMatch) {
		return []
	}

	const epicSectionStart = anchorMatch.index + anchorMatch[0].length
	const remainingMarkdown = markdown.slice(epicSectionStart)
	const nextHigherLevelHeadingMatch = /^\s{0,3}#{1,2}\s+/m.exec(remainingMarkdown)
	const epicSection =
		nextHigherLevelHeadingMatch === null ? remainingMarkdown : remainingMarkdown.slice(0, nextHigherLevelHeadingMatch.index)

	return Array.from(epicSection.matchAll(/^\s{0,3}###\s+Epic\s+(\d+):\s*(.+?)\s*$/gm), (match) => {
		const [, epicNumber, epicTitle] = match
		return `Epic ${epicNumber}: ${epicTitle.trim()}`
	})
}

async function resolveActivePiPlanningStepTwo(config: TaskConfig) {
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

function resolveEpicsDocumentPath(config: TaskConfig): string | undefined {
	const placeholders =
		getPlaceholderWorkflowValueMap(
			config.taskState.activePlaceholderWorkflowStableValues,
			config.taskState.activePlaceholderWorkflowValues,
		) ?? {}

	const epicsDocumentRaw = resolvePlaceholderWorkflowText(placeholders.epics_document?.trim(), placeholders)?.trim()
	if (!epicsDocumentRaw) {
		return undefined
	}

	const resolutionBase =
		placeholders.cwd?.trim() ||
		placeholders.project_root?.trim() ||
		placeholders["project-root"]?.trim() ||
		config.taskState.activePlaceholderWorkflowStableValues?.cwd?.trim() ||
		config.cwd

	return path.isAbsolute(epicsDocumentRaw) ? epicsDocumentRaw : path.resolve(resolutionBase, epicsDocumentRaw)
}

export class SelectTargetEpicToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.SELECT_TARGET_EPIC

	getDescription(_block: ToolUse): string {
		return "[select_target_epic]"
	}

	async execute(config: TaskConfig, _block: ToolUse): Promise<ToolResponse> {
		if (config.yoloModeToggled === true) {
			return formatResponse.toolError(
				"select_target_epic is unavailable while YOLO mode is enabled because no interactive user response can be collected.",
			)
		}

		const activeStep = await resolveActivePiPlanningStepTwo(config)
		if (!isSelectTargetEpicStep(activeStep?.sourceName, activeStep?.stepNumber)) {
			return formatResponse.toolError(
				"select_target_epic can only be used while pi-planning.md Step 2 is the active placeholder workflow context.",
			)
		}

		const epicsDocumentPath = resolveEpicsDocumentPath(config)
		if (!epicsDocumentPath) {
			return formatResponse.toolError(
				"Could not resolve workflow placeholder 'epics_document' from the active placeholder workflow state.",
			)
		}

		let epicsDocumentContents: string
		try {
			epicsDocumentContents = await fs.readFile(epicsDocumentPath, "utf8")
		} catch {
			return formatResponse.toolError(`Could not read the resolved epics_document at ${epicsDocumentPath}.`)
		}

		const options = extractEpicLabels(epicsDocumentContents)
		if (options.length === 0) {
			return formatResponse.toolError(
				"Could not extract any canonical epic headings from the '### Epic List' section of the epics document.",
			)
		}

		const sharedMessage = {
			question: SELECT_TARGET_EPIC_QUESTION,
			options,
		} satisfies ClineAskQuestion

		const { text } = await config.callbacks.ask("followup", JSON.stringify(sharedMessage), false)
		if (!text || !options.includes(text)) {
			return formatResponse.toolError(
				"select_target_epic did not receive a valid epic selection from the interactive followup ask.",
			)
		}

		const clineMessages = config.messageState.getClineMessages()
		const lastFollowupMessage = findLast(clineMessages, (message: any) => message.ask === "followup")
		if (lastFollowupMessage) {
			lastFollowupMessage.text = JSON.stringify({
				...sharedMessage,
				selected: text,
			} satisfies ClineAskQuestion)
			await config.messageState.saveClineMessagesAndUpdateHistory()
		}

		try {
			await persistWorkflowPlaceholderValues(config, {
				[SELECT_TARGET_EPIC_PLACEHOLDER_KEY]: text,
			})
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}

		return `Stored workflow placeholder ${SELECT_TARGET_EPIC_PLACEHOLDER_KEY} from the runtime-owned epic selection.`
	}
}
