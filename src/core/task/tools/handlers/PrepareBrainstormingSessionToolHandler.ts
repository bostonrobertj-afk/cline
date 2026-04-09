import { findLast } from "@shared/array"
import { ClineAskQuestion } from "@shared/ExtensionMessage"
import fs from "fs/promises"
import path from "path"
import { recordAndPersistPlaceholderWorkflowWriteProof } from "@/core/task/focus-chain/placeholderWorkflowWriteProofs"
import { BRAINSTORMING_STEP_2_SELECT_SESSION_RESOLVER_ID } from "@/core/task/workflow-form/WorkflowFormRegistry"
import { getPlaceholderWorkflowValueMap, resolvePlaceholderWorkflowText } from "@/core/workflows/placeholder-workflow-rendering"
import { getActivePlaceholderWorkflowStepDetails } from "@/core/workflows/placeholder-workflow-step-details"
import { buildWorkflowStablePlaceholders, resolveWorkflowPlaceholderText } from "@/core/workflows/workflow-placeholders"
import {
	isPrepareBrainstormingSessionStep,
	PREPARE_BRAINSTORMING_SESSION_OPTIONS,
	PREPARE_BRAINSTORMING_SESSION_QUESTION,
} from "@/shared/prepare-brainstorming-session"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolUse } from "../../../assistant-message"
import { formatResponse } from "../../../prompts/responses"
import type { ToolResponse } from "../../index"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import { persistWorkflowPlaceholderValues } from "./SetWorkflowPlaceholdersToolHandler"

const SESSION_FILENAME_PATTERN = /^brainstorming-session-(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.md$/
const SUCCESS_MESSAGE = "Stored workflow placeholder output_file from the runtime-owned brainstorming session preparation flow."

type BrainstormingSessionFile = {
	absolutePath: string
	fileName: string
	date: string
	sequence: number
}

async function resolveActiveBrainstormingStepTwo(config: TaskConfig) {
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

function resolveOutputFolderPath(config: TaskConfig): string | undefined {
	const placeholders =
		getPlaceholderWorkflowValueMap(
			config.taskState.activePlaceholderWorkflowStableValues,
			config.taskState.activePlaceholderWorkflowValues,
		) ?? {}

	const outputFolderRaw = resolvePlaceholderWorkflowText(placeholders.output_folder?.trim(), placeholders)?.trim()
	if (!outputFolderRaw) {
		return undefined
	}

	const resolutionBase =
		placeholders.cwd?.trim() ||
		placeholders.project_root?.trim() ||
		placeholders["project-root"]?.trim() ||
		config.taskState.activePlaceholderWorkflowStableValues?.cwd?.trim() ||
		config.cwd

	return path.isAbsolute(outputFolderRaw) ? outputFolderRaw : path.resolve(resolutionBase, outputFolderRaw)
}

async function discoverBrainstormingSessions(sessionDirectory: string): Promise<BrainstormingSessionFile[]> {
	let entries: Awaited<ReturnType<typeof fs.readdir>>
	try {
		entries = await fs.readdir(sessionDirectory, { withFileTypes: true })
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return []
		}
		throw error
	}

	return entries
		.map((entry) => {
			if (!entry.isFile()) {
				return undefined
			}

			const match = SESSION_FILENAME_PATTERN.exec(entry.name)
			if (!match) {
				return undefined
			}

			const [, date, suffix] = match
			return {
				absolutePath: path.join(sessionDirectory, entry.name),
				fileName: entry.name,
				date,
				sequence: suffix ? Number.parseInt(suffix, 10) : 1,
			} satisfies BrainstormingSessionFile
		})
		.filter((session): session is BrainstormingSessionFile => !!session)
		.sort((left, right) => {
			if (left.date !== right.date) {
				return right.date.localeCompare(left.date)
			}

			return right.sequence - left.sequence
		})
}

async function resolveNextSessionPath(sessionDirectory: string, date: string): Promise<string> {
	const baseName = `brainstorming-session-${date}.md`
	const basePath = path.join(sessionDirectory, baseName)

	try {
		await fs.access(basePath)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return basePath
		}
		throw error
	}

	for (let suffix = 2; ; suffix++) {
		const candidatePath = path.join(sessionDirectory, `brainstorming-session-${date}-${suffix}.md`)
		try {
			await fs.access(candidatePath)
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return candidatePath
			}
			throw error
		}
	}
}

async function createAndPersistBrainstormingSession(args: {
	config: TaskConfig
	sessionDirectory: string
	templateContents: string
	date: string
}): Promise<string> {
	await fs.mkdir(args.sessionDirectory, { recursive: true })
	const artifactPath = await resolveNextSessionPath(args.sessionDirectory, args.date)
	await fs.writeFile(artifactPath, args.templateContents, "utf8")
	await recordAndPersistPlaceholderWorkflowWriteProof({
		taskId: args.config.taskId,
		taskState: args.config.taskState,
		filePath: artifactPath,
	})
	args.config.taskState.didEditFile = true
	args.config.taskState.fileReadCache.delete(artifactPath.toLowerCase())
	await persistWorkflowPlaceholderValues(args.config, { output_file: artifactPath })
	return artifactPath
}

export class PrepareBrainstormingSessionToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.PREPARE_BRAINSTORMING_SESSION

	getDescription(_block: ToolUse): string {
		return "[prepare_brainstorming_session]"
	}

	async execute(config: TaskConfig, _block: ToolUse): Promise<ToolResponse> {
		try {
			if (config.yoloModeToggled === true) {
				return formatResponse.toolError(
					"prepare_brainstorming_session is unavailable while YOLO mode is enabled because no interactive user response can be collected.",
				)
			}

			const activeStep = await resolveActiveBrainstormingStepTwo(config)
			if (!isPrepareBrainstormingSessionStep(activeStep?.sourceName, activeStep?.stepNumber)) {
				return formatResponse.toolError(
					"prepare_brainstorming_session can only be used while brainstorming.md Step 2 is the active placeholder workflow context.",
				)
			}

			const outputFolder = resolveOutputFolderPath(config)
			if (!outputFolder) {
				return formatResponse.toolError(
					"Could not resolve workflow placeholder 'output_folder' from the active placeholder workflow state.",
				)
			}

			const stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd: config.cwd })
			const templateRaw = resolveWorkflowPlaceholderText(
				"{project-root}/.cline/skills/bmad-brainstorming/template.md",
				stablePlaceholders,
			)
			if (!templateRaw || templateRaw.includes("{project-root}")) {
				return formatResponse.toolError(
					"Could not resolve the canonical brainstorming template path from stable workflow placeholders.",
				)
			}

			const templatePath = path.isAbsolute(templateRaw) ? templateRaw : path.resolve(config.cwd, templateRaw)
			let templateContents: string
			try {
				templateContents = await fs.readFile(templatePath, "utf8")
			} catch {
				return formatResponse.toolError(`Could not read the canonical brainstorming template at ${templatePath}.`)
			}

			const sessionDirectory = path.join(outputFolder, "brainstorming")
			const discoveredSessions = await discoverBrainstormingSessions(sessionDirectory)
			const date = stablePlaceholders.date?.trim()
			if (!date) {
				throw new Error("Could not resolve stable placeholder 'date' from workflow runtime state.")
			}

			if (discoveredSessions.length === 0) {
				await createAndPersistBrainstormingSession({
					config,
					sessionDirectory,
					templateContents,
					date,
				})
				return SUCCESS_MESSAGE
			}

			const sharedMessage = {
				question: PREPARE_BRAINSTORMING_SESSION_QUESTION,
				options: [...PREPARE_BRAINSTORMING_SESSION_OPTIONS],
			} satisfies ClineAskQuestion

			const { text } = await config.callbacks.ask("followup", JSON.stringify(sharedMessage), false)
			if (
				!text ||
				!PREPARE_BRAINSTORMING_SESSION_OPTIONS.includes(text as (typeof PREPARE_BRAINSTORMING_SESSION_OPTIONS)[number])
			) {
				return formatResponse.toolError(
					"prepare_brainstorming_session did not receive a valid session-preparation selection from the interactive followup ask.",
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

			if (text === "Continue newest session") {
				await persistWorkflowPlaceholderValues(config, { output_file: discoveredSessions[0].absolutePath })
				return SUCCESS_MESSAGE
			}

			if (text === "Start new session") {
				await createAndPersistBrainstormingSession({
					config,
					sessionDirectory,
					templateContents,
					date,
				})
				return SUCCESS_MESSAGE
			}

			const brainstormingSessionOptions = discoveredSessions.map((session) => ({
				value: session.absolutePath,
				label: path.basename(session.absolutePath),
				description: session.absolutePath,
			}))

			await config.callbacks.runWorkflowFormSession({
				resolverId: BRAINSTORMING_STEP_2_SELECT_SESSION_RESOLVER_ID,
				owner: {
					kind: "placeholder_workflow_step",
					workflowName: "brainstorming.md",
					stepNumber: 2,
				},
				initialPhase: "collect_inputs",
				context: { brainstormingSessionOptions },
			})

			const persistedOutputFile = config.taskState.activePlaceholderWorkflowValues?.output_file
			if (!persistedOutputFile || !brainstormingSessionOptions.some((option) => option.value === persistedOutputFile)) {
				return formatResponse.toolError("The brainstorming session picker did not persist a valid output_file selection.")
			}

			return SUCCESS_MESSAGE
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
