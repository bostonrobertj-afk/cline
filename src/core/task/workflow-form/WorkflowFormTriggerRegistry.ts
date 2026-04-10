import type { WorkflowFormDefinitionPayload } from "@shared/ExtensionMessage"
import fs from "fs/promises"
import path from "path"
import type { PersistentSlashCommandAction } from "@/core/slash-commands"
import { discoverBrainstormingSessions } from "@/core/workflows/brainstormingSessionFiles"
import {
	listBrainstormingTechniqueCategories,
	listBrainstormingTechniqueOptionsByCategory,
} from "@/core/workflows/brainstormingTechniqueLibrary"
import { getPlaceholderWorkflowValueMap } from "@/core/workflows/placeholder-workflow-rendering"
import { getActivePlaceholderWorkflowStepDetails } from "@/core/workflows/placeholder-workflow-step-details"
import {
	fileExistsForPlaceholderWorkflowWriteProof,
	taskStateHasPlaceholderWorkflowWriteProof,
} from "../focus-chain/placeholderWorkflowWriteProofs"
import type { TaskState } from "../TaskState"
import type { WorkflowFormSessionOwner, WorkflowFormSessionState, WorkflowFormTriggerSource } from "./types"
import {
	BRAINSTORMING_STEP_2_PREPARE_SESSION_RESOLVER_ID,
	BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID,
	BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID,
	buildBrainstormingStep2InitialDefinitionPayload,
	buildBrainstormingStep4DefinitionPayload,
	buildWorkflowStartDefinitionPayload,
	CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID,
	getWorkflowFormResolverDefinition,
	PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
} from "./WorkflowFormRegistry"
import { parseWorkflowStartRequirements } from "./workflowStartRequirements"

export interface WorkflowFormWorkflowStepTriggerDefinition {
	workflowName: string
	stepNumber: number
	resolverId: string
	shouldIntercept(args: {
		cwd: string
		taskState: Pick<
			TaskState,
			| "activePlaceholderWorkflowStableValues"
			| "activePlaceholderWorkflowValues"
			| "activePlaceholderWorkflowTaskWriteProofPaths"
		>
	}): Promise<boolean>
}

interface WorkflowFormCandidateActiveStep {
	stepNumber: number
	stepTitle: string
}

export interface WorkflowFormStartCandidate {
	resolverId: string
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
	activeStep: WorkflowFormCandidateActiveStep
	definitionPayload: WorkflowFormDefinitionPayload
}

export interface WorkflowFormWorkflowStepCandidate {
	resolverId: string
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
	activeStep: WorkflowFormCandidateActiveStep
	definitionPayload: WorkflowFormDefinitionPayload
}

function createDefinitionDraftSession(args: {
	resolverId: string
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
}): WorkflowFormSessionState {
	return {
		sessionId: `workflow-form-trigger-${args.resolverId}`,
		resolverId: args.resolverId,
		triggerSource: args.triggerSource,
		owner: args.owner,
		definitionVersion: 2,
		definitionPayload: {
			definitionVersion: 2,
			title: "",
			toolDictionaryTitle: "",
			toolDictionaryMarkdown: "",
			firstPanelId: "",
			panels: {},
		},
		firstPanelId: "",
		currentPanelId: "",
		values: {},
		data: {},
	}
}

function buildWorkflowStepDefinitionPayload(args: {
	resolverId: string
	triggerSource: WorkflowFormTriggerSource
	owner: WorkflowFormSessionOwner
}): WorkflowFormDefinitionPayload {
	return getWorkflowFormResolverDefinition(args.resolverId).buildDefinition(createDefinitionDraftSession(args))
}

function resolveAbsoluteWorkflowArtifactPath(args: {
	cwd: string
	taskState: Pick<TaskState, "activePlaceholderWorkflowStableValues" | "activePlaceholderWorkflowValues">
	placeholderKey: "output_folder" | "output_file"
}): string | undefined {
	const placeholders = getPlaceholderWorkflowValueMap(
		args.taskState.activePlaceholderWorkflowStableValues,
		args.taskState.activePlaceholderWorkflowValues,
	)
	const artifactPath = placeholders?.[args.placeholderKey]?.trim()
	if (!artifactPath) {
		return undefined
	}

	return path.isAbsolute(artifactPath) ? artifactPath : path.resolve(args.cwd, artifactPath)
}

async function buildBrainstormingStep2DefinitionPayloadForTrigger(cwd: string, outputFolderPath: string) {
	const sessionDirectory = path.join(outputFolderPath, "brainstorming")
	const sessions = await discoverBrainstormingSessions(sessionDirectory)
	if (sessions.length === 0) {
		return undefined
	}

	return buildBrainstormingStep2InitialDefinitionPayload({
		sessionOptions: sessions.map((session) => ({
			value: session.absolutePath,
			label: session.fileName,
			description: session.date,
		})),
	})
}

async function buildBrainstormingStep4DefinitionPayloadForTrigger(cwd: string) {
	const categories = await listBrainstormingTechniqueCategories(cwd)
	const techniqueOptionsByCategory = Object.fromEntries(
		await Promise.all(
			categories.map(async (category) => [category, await listBrainstormingTechniqueOptionsByCategory(cwd, category)]),
		),
	)

	return buildBrainstormingStep4DefinitionPayload({
		categoryOptions: categories.map((category) => ({
			value: category,
			label: category,
		})),
		techniqueOptionsByCategory,
	})
}

export async function resolveWorkflowFormSlashCommandStartCandidate(args: {
	cwd: string
	taskState: Pick<
		TaskState,
		| "activePlaceholderWorkflowSource"
		| "currentFocusChainChecklist"
		| "activePlaceholderWorkflowStableValues"
		| "activePlaceholderWorkflowValues"
	>
	currentTurnSlashCommandAction?: PersistentSlashCommandAction
}): Promise<WorkflowFormStartCandidate | undefined> {
	if (args.currentTurnSlashCommandAction?.type !== "activate_placeholder_workflow") {
		return undefined
	}

	if (!args.taskState.activePlaceholderWorkflowSource || !args.taskState.currentFocusChainChecklist) {
		return undefined
	}

	const activeStep = await getActivePlaceholderWorkflowStepDetails({
		checklistMarkdown: args.taskState.currentFocusChainChecklist,
		source: args.taskState.activePlaceholderWorkflowSource,
		stablePlaceholderValues: args.taskState.activePlaceholderWorkflowStableValues,
		placeholderValues: args.taskState.activePlaceholderWorkflowValues,
	})
	if (activeStep?.stepNumber !== 1) {
		return undefined
	}

	const parsedRequirements = parseWorkflowStartRequirements(activeStep.rawDetails)
	if (!parsedRequirements) {
		return undefined
	}

	const workflowName = args.taskState.activePlaceholderWorkflowSource.name

	return {
		resolverId: PLACEHOLDER_WORKFLOW_START_SET_WORKFLOW_PLACEHOLDERS_RESOLVER_ID,
		triggerSource: "slash_command",
		owner: {
			kind: "slash_command",
			workflowName,
			stepNumber: 1,
		},
		activeStep: {
			stepNumber: 1,
			stepTitle: activeStep.stepTitle,
		},
		definitionPayload: buildWorkflowStartDefinitionPayload({
			workflowName,
			workflowStartRequirements: parsedRequirements,
		}),
	}
}

async function shouldInterceptUntilCurrentTaskArtifactExists(args: {
	cwd: string
	taskState: Pick<
		TaskState,
		| "activePlaceholderWorkflowStableValues"
		| "activePlaceholderWorkflowValues"
		| "activePlaceholderWorkflowTaskWriteProofPaths"
	>
	placeholderKey: "diff_output" | "review_input" | "output_file"
}): Promise<boolean> {
	const placeholders = getPlaceholderWorkflowValueMap(
		args.taskState.activePlaceholderWorkflowStableValues,
		args.taskState.activePlaceholderWorkflowValues,
	)
	const artifactPath = placeholders?.[args.placeholderKey]?.trim()
	if (!artifactPath) {
		return true
	}

	const resolvedArtifactPath = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(args.cwd, artifactPath)
	return !(
		taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedArtifactPath) &&
		(await fileExistsForPlaceholderWorkflowWriteProof(resolvedArtifactPath))
	)
}

async function shouldInterceptUntilBrainstormingTopicExists(args: {
	cwd: string
	taskState: Pick<
		TaskState,
		| "activePlaceholderWorkflowStableValues"
		| "activePlaceholderWorkflowValues"
		| "activePlaceholderWorkflowTaskWriteProofPaths"
	>
}): Promise<boolean> {
	const placeholders = getPlaceholderWorkflowValueMap(
		args.taskState.activePlaceholderWorkflowStableValues,
		args.taskState.activePlaceholderWorkflowValues,
	)
	const artifactPath = placeholders?.output_file?.trim()
	if (!artifactPath) {
		return true
	}

	const resolvedArtifactPath = path.isAbsolute(artifactPath) ? artifactPath : path.resolve(args.cwd, artifactPath)
	if (!taskStateHasPlaceholderWorkflowWriteProof(args.taskState, resolvedArtifactPath)) {
		return true
	}

	if (!(await fileExistsForPlaceholderWorkflowWriteProof(resolvedArtifactPath))) {
		return true
	}

	const content = await fs.readFile(resolvedArtifactPath, "utf8")
	const topicMatch = content.match(/^## Topic\s*\n([\s\S]*?)(?=^##\s|$)/m)
	const topicBody = topicMatch?.[1] ?? ""

	return topicBody.trim().length === 0
}

function getMarkdownSectionBody(markdown: string, heading: string): string {
	const normalized = markdown.replace(/\r\n/g, "\n")
	const match = normalized.match(
		new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=^##\\s|$)`, "m"),
	)
	return match?.[1]?.trim() ?? ""
}

async function shouldInterceptUntilBrainstormingApproachAndTechniqueExist(args: {
	cwd: string
	taskState: Pick<TaskState, "activePlaceholderWorkflowStableValues" | "activePlaceholderWorkflowValues">
}) {
	const outputFilePath = resolveAbsoluteWorkflowArtifactPath({
		cwd: args.cwd,
		taskState: args.taskState,
		placeholderKey: "output_file",
	})
	if (!outputFilePath) {
		return false
	}

	try {
		const content = await fs.readFile(outputFilePath, "utf8")
		return (
			getMarkdownSectionBody(content, "## Selected Approach").length === 0 ||
			getMarkdownSectionBody(content, "## Selected Techniques").length === 0
		)
	} catch {
		return false
	}
}

export const workflowFormWorkflowStepTriggerRegistry: WorkflowFormWorkflowStepTriggerDefinition[] = [
	{
		workflowName: "code-review.md",
		stepNumber: 2,
		resolverId: CODE_REVIEW_STEP_3_DIFF_SOURCE_RESOLVER_ID,
		async shouldIntercept({ cwd, taskState }) {
			return shouldInterceptUntilCurrentTaskArtifactExists({ cwd, taskState, placeholderKey: "diff_output" })
		},
	},
	{
		workflowName: "brainstorming.md",
		stepNumber: 2,
		resolverId: BRAINSTORMING_STEP_2_PREPARE_SESSION_RESOLVER_ID,
		async shouldIntercept({ cwd, taskState }) {
			const outputFolderPath = resolveAbsoluteWorkflowArtifactPath({
				cwd,
				taskState,
				placeholderKey: "output_folder",
			})
			if (!outputFolderPath) {
				return false
			}

			const definitionPayload = await buildBrainstormingStep2DefinitionPayloadForTrigger(cwd, outputFolderPath)
			return definitionPayload !== undefined
		},
	},
	{
		workflowName: "brainstorming.md",
		stepNumber: 3,
		resolverId: BRAINSTORMING_STEP_3_CAPTURE_TOPIC_RESOLVER_ID,
		async shouldIntercept({ cwd, taskState }) {
			return shouldInterceptUntilBrainstormingTopicExists({ cwd, taskState })
		},
	},
	{
		workflowName: "brainstorming.md",
		stepNumber: 4,
		resolverId: BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID,
		async shouldIntercept({ cwd, taskState }) {
			return shouldInterceptUntilBrainstormingApproachAndTechniqueExist({ cwd, taskState })
		},
	},
]

export function getWorkflowFormWorkflowStepTriggerDefinition(workflowName: string, stepNumber: number) {
	return workflowFormWorkflowStepTriggerRegistry.find(
		(trigger) => trigger.workflowName === workflowName && trigger.stepNumber === stepNumber,
	)
}

export async function resolveWorkflowFormWorkflowStepCandidate(args: {
	cwd: string
	taskState: Pick<
		TaskState,
		| "activePlaceholderWorkflowSource"
		| "currentFocusChainChecklist"
		| "activePlaceholderWorkflowStableValues"
		| "activePlaceholderWorkflowValues"
		| "activePlaceholderWorkflowTaskWriteProofPaths"
	>
}): Promise<WorkflowFormWorkflowStepCandidate | undefined> {
	if (!args.taskState.activePlaceholderWorkflowSource || !args.taskState.currentFocusChainChecklist) {
		return undefined
	}

	const activeStep = await getActivePlaceholderWorkflowStepDetails({
		checklistMarkdown: args.taskState.currentFocusChainChecklist,
		source: args.taskState.activePlaceholderWorkflowSource,
		stablePlaceholderValues: args.taskState.activePlaceholderWorkflowStableValues,
		placeholderValues: args.taskState.activePlaceholderWorkflowValues,
	})
	if (!activeStep?.stepNumber) {
		return undefined
	}

	const workflowName = args.taskState.activePlaceholderWorkflowSource.name
	const trigger = getWorkflowFormWorkflowStepTriggerDefinition(workflowName, activeStep.stepNumber)
	if (!trigger) {
		return undefined
	}

	const shouldIntercept = await trigger.shouldIntercept({ cwd: args.cwd, taskState: args.taskState })
	if (!shouldIntercept) {
		return undefined
	}

	const owner: WorkflowFormSessionOwner = {
		kind: "placeholder_workflow_step",
		workflowName,
		stepNumber: activeStep.stepNumber,
	}

	return {
		resolverId: trigger.resolverId,
		triggerSource: "deterministic_workflow_progression",
		owner,
		activeStep: {
			stepNumber: activeStep.stepNumber,
			stepTitle: activeStep.stepTitle,
		},
		definitionPayload:
			trigger.resolverId === BRAINSTORMING_STEP_2_PREPARE_SESSION_RESOLVER_ID
				? ((await (async () => {
						const outputFolderPath = resolveAbsoluteWorkflowArtifactPath({
							cwd: args.cwd,
							taskState: args.taskState,
							placeholderKey: "output_folder",
						})
						if (!outputFolderPath) {
							return undefined
						}
						return buildBrainstormingStep2DefinitionPayloadForTrigger(args.cwd, outputFolderPath)
					})()) ??
					buildWorkflowStepDefinitionPayload({
						resolverId: trigger.resolverId,
						triggerSource: "deterministic_workflow_progression",
						owner,
					}))
				: trigger.resolverId === BRAINSTORMING_STEP_4_CHOOSE_APPROACH_RESOLVER_ID
					? await buildBrainstormingStep4DefinitionPayloadForTrigger(args.cwd)
					: buildWorkflowStepDefinitionPayload({
							resolverId: trigger.resolverId,
							triggerSource: "deterministic_workflow_progression",
							owner,
						}),
	}
}
