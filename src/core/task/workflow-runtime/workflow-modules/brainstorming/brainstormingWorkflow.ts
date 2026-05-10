import type {
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
	WorkflowFormOptionDefinition,
} from "@shared/ExtensionMessage"
import { WorkflowArtifactFamily } from "../../artifactFamilies"
import type {
	ActiveWorkflowSession,
	WorkflowDecisionBranchTrigger,
	WorkflowDecisionTree,
	WorkflowDefinition,
	WorkflowDeterministicProcedureResult,
	WorkflowPersonaDefinition,
	WorkflowPromptBuilderInput,
	WorkflowStepDefinition,
	WorkflowStepPromptSource,
	WorkflowValue,
	WorkflowValues,
} from "../../types"
import { buildBrainstormingDocumentFromSession, buildInitialBrainstormingDocument } from "./brainstormingDocument"
import {
	type BrainstormingTechnique,
	findBrainstormingTechniqueByIdOrName,
	listBrainstormingTechniqueCategories,
	listBrainstormingTechniquesByCategory,
	selectRandomBrainstormingTechnique,
} from "./brainstormingTechniqueRegistry"
import {
	buildBrainstormingStep1ToolSchemas,
	buildBrainstormingStep2ToolSchemas,
	buildBrainstormingStep3ToolSchemas,
	buildBrainstormingStep4ToolSchemas,
} from "./brainstormingToolSchemas"

enum BrainstormingWorkflowValueKey {
	ProjectMode = "projectMode",
	ProjectTitle = "projectTitle",
	ProjectFolderName = "projectFolderName",
	ContextFile = "context_file",
	SessionTopic = "session_topic",
	HasSessionGoals = "has_session_goals",
	SessionGoals = "session_goals",
	SelectedApproach = "selected_approach",
	SelectedTechniques = "selected_techniques",
	RandomTechniqueCandidate = "random_technique_candidate",
	RandomTechniqueRejectedIds = "random_technique_rejected_ids",
	RandomTechniqueConfirmation = "random_technique_confirmation",
	TechniquesUsed = "techniques_used",
	IdeasGenerated = "ideas_generated",
	OutputFile = "output_file",
	OutputArtifactFamily = "output_artifact_family",
	OutputArtifactIdentity = "output_artifact_identity",
	OutputArtifactFilename = "output_artifact_filename",
	OutputArtifactRelativePath = "output_artifact_relative_path",
	ChosenTechniqueId = "chosen_technique_id",
}

enum BrainstormingSelectedApproach {
	Choose = "I want to choose",
	Random = "I want a random technique",
	Suggest = "I want you to suggest a technique",
}

enum BrainstormingRandomTechniqueConfirmation {
	Confirm = "confirm",
	Retry = "retry",
}

const BRAINSTORMING_SESSION_ARTIFACT_ID = "brainstorming_session"
const STEP_1_SETUP_FORM_ID = "step-1-setup-form"
const STEP_2_APPROACH_FORM_ID = "step-2-approach-form"
const STEP_2_RANDOM_CONFIRMATION_PANEL_ID = "step-2-random-confirmation-panel"
const SUGGESTED_TECHNIQUE_PLACEHOLDER = "user requested technique suggestion"
const BRAINSTORMING_WORKFLOW_DISPLAY_NAME = "Brainstorming"
const BRAINSTORMING_WORKFLOW_DESCRIPTION =
	"This workflow guides an interactive brainstorming session, captures the session topic and goals, helps resolve an appropriate brainstorming technique, records generated ideas, and writes the session output to brainstorming.md."
const BRAINSTORMING_WORKFLOW_PERSONA: WorkflowPersonaDefinition = {
	name: "Mary",
	role: "Analyst",
	identity:
		"Mary is an insightful analyst who helps turn messy ideas into clear options through brainstorming, market research, competitive analysis, and requirements elicitation.",
	capabilities: ["brainstorming", "ideation", "market research", "competitive analysis", "requirements elicitation"],
	communicationStyle: "Curious, precise, evidence-driven, and discovery-oriented.",
	principles: [
		"Use structured analysis such as Porter's Five Forces, SWOT, root-cause analysis, brainstorming methods, and competitive intelligence to uncover what matters.",
	],
}

const STEP_3_SHARED_FACILITATION_PROMPT = `Identify the following critical information within the document:
- Session Topic
- Session Goals
- Selected Techniques

Help the user to refine their topic and goals to serve as a strong foundation for the brainstorming session if needed. Ask probing questions and offer suggestions to encourage the user to transform overly-brief or vague topics and goals into more thoughtful, detailed versions, updating the document to reflect revised versions once they’ve approved.

Once the session topic and session goals are detailed and thoughtful enough to serve as a launching point for brainstorming, leverage the selected technique to guide the user through a thorough brainstorming process. 
If at any point the user asks to switch to a new brainstorming technique, you can use get_brainstorming_methods to retrieve a full list of supported techniques. 

Tips for the session:
- Ask probing questions
- Ask how ideas connect to earlier ideas
- Offer challenges to to the user's ideas or assumptions
- Offer new ideas and angles
Be sure to record the session's progress in \`{output_file}\`, including noting any new techniques which are adopted and ideas that are generated.

Once the user indicates they're ready to move on from idea generation, use \`workflow_progress_request\` to confirm and unlock the next workflow step.`

const STEP_4_PROMPT = `- Review the captured ideas, cluster them into themes, and identify the strongest candidates. Ask the user which ideas matter most right now: high-impact, quick wins, or the most innovative concepts.
- For each prioritized idea, define next steps, resource needs, obstacles, and success indicators.
- Do not extend into solutioning during this workflow. If the user attempts to steer the conversation toward solutioning or planning actions, STOP and tell them that this workflow is scoped to idea-generation, and that they should use one of these workflows for solutioning:
  - create architecture (if the solution(s) will likely require a large body of work consisting of one or more epics)
  - quick spec (if the solution(s) will likely require small patches that can be implemented quickly)
- Append the themes, priorities, and summary to \`{output_file}\`.
- Send the user a final message indicating that the brainstorming session is complete using \`attempt_completion\`. Include the full file path of \`{output_file}\` in this message.`

const BRAINSTORMING_WORKFLOW_VALUE_KEYS = [
	BrainstormingWorkflowValueKey.ProjectMode,
	BrainstormingWorkflowValueKey.ProjectTitle,
	BrainstormingWorkflowValueKey.ProjectFolderName,
	BrainstormingWorkflowValueKey.ContextFile,
	BrainstormingWorkflowValueKey.SessionTopic,
	BrainstormingWorkflowValueKey.HasSessionGoals,
	BrainstormingWorkflowValueKey.SessionGoals,
	BrainstormingWorkflowValueKey.SelectedApproach,
	BrainstormingWorkflowValueKey.SelectedTechniques,
	BrainstormingWorkflowValueKey.RandomTechniqueCandidate,
	BrainstormingWorkflowValueKey.RandomTechniqueRejectedIds,
	BrainstormingWorkflowValueKey.RandomTechniqueConfirmation,
	BrainstormingWorkflowValueKey.TechniquesUsed,
	BrainstormingWorkflowValueKey.IdeasGenerated,
	BrainstormingWorkflowValueKey.OutputFile,
	BrainstormingWorkflowValueKey.OutputArtifactFamily,
	BrainstormingWorkflowValueKey.OutputArtifactIdentity,
	BrainstormingWorkflowValueKey.OutputArtifactFilename,
	BrainstormingWorkflowValueKey.OutputArtifactRelativePath,
	BrainstormingWorkflowValueKey.ChosenTechniqueId,
]

function buildTerminalTransition(): WorkflowFormDefinitionPayload["panels"][string]["transition"] {
	return {
		type: "conditional",
		conditionSourceKey: "__terminal__",
		branches: [],
		defaultTerminal: true,
	}
}

function buildOption(value: string): WorkflowFormOptionDefinition {
	return {
		value,
		label: value,
	}
}

function buildTechniqueOption(technique: BrainstormingTechnique): WorkflowFormOptionDefinition {
	return {
		value: technique.id,
		label: technique.name,
		description: technique.description,
	}
}

function buildTechniqueConditionalOptions(): NonNullable<WorkflowFormFieldDefinition["conditionalOptions"]> {
	return listBrainstormingTechniqueCategories().map((category) => ({
		when: {
			sourceKey: "chosen_technique_category",
			operator: "equals",
			value: category,
		},
		options: listBrainstormingTechniquesByCategory(category).map(buildTechniqueOption),
	}))
}

function isWorkflowRecord(value: WorkflowValue | undefined): value is WorkflowValues {
	return typeof value === "object" && value !== undefined && Array.isArray(value) === false
}

function readWorkflowStringValue(workflowValues: WorkflowValues, key: BrainstormingWorkflowValueKey): string | undefined {
	const value = workflowValues[key]
	if (typeof value !== "string") {
		return undefined
	}

	const trimmedValue = value.trim()
	return trimmedValue.length > 0 ? trimmedValue : undefined
}

function readRandomTechniqueConfirmation(workflowValues: WorkflowValues): BrainstormingRandomTechniqueConfirmation | undefined {
	const value = readWorkflowStringValue(workflowValues, BrainstormingWorkflowValueKey.RandomTechniqueConfirmation)
	if (value === BrainstormingRandomTechniqueConfirmation.Confirm) {
		return BrainstormingRandomTechniqueConfirmation.Confirm
	}
	if (value === BrainstormingRandomTechniqueConfirmation.Retry) {
		return BrainstormingRandomTechniqueConfirmation.Retry
	}

	return undefined
}

function readSelectedApproach(workflowValues: WorkflowValues): BrainstormingSelectedApproach | undefined {
	const value = readWorkflowStringValue(workflowValues, BrainstormingWorkflowValueKey.SelectedApproach)
	if (value === BrainstormingSelectedApproach.Choose) {
		return BrainstormingSelectedApproach.Choose
	}
	if (value === BrainstormingSelectedApproach.Random) {
		return BrainstormingSelectedApproach.Random
	}
	if (value === BrainstormingSelectedApproach.Suggest) {
		return BrainstormingSelectedApproach.Suggest
	}

	return undefined
}

function readTechniqueWorkflowValue(value: WorkflowValue | undefined): WorkflowValues | undefined {
	if (!isWorkflowRecord(value)) {
		return undefined
	}

	const id = value.id
	const name = value.name
	const description = value.description
	const category = value.category
	if (
		typeof id !== "string" ||
		id.trim().length === 0 ||
		typeof name !== "string" ||
		name.trim().length === 0 ||
		typeof description !== "string" ||
		description.trim().length === 0 ||
		typeof category !== "string" ||
		category.trim().length === 0
	) {
		return undefined
	}

	return {
		id,
		name,
		description,
		category,
	}
}

function readRandomTechniqueCandidate(workflowValues: WorkflowValues): WorkflowValues | undefined {
	return readTechniqueWorkflowValue(workflowValues[BrainstormingWorkflowValueKey.RandomTechniqueCandidate])
}

function readRejectedTechniqueIds(workflowValues: WorkflowValues): readonly string[] {
	const value = workflowValues[BrainstormingWorkflowValueKey.RandomTechniqueRejectedIds]
	if (!Array.isArray(value)) {
		return []
	}

	return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
}

function appendUniqueTechniqueId(existingIds: readonly string[], techniqueId: string): readonly string[] {
	if (existingIds.includes(techniqueId)) {
		return existingIds
	}

	return [...existingIds, techniqueId]
}

function buildTechniqueWorkflowValue(technique: BrainstormingTechnique): WorkflowValues {
	return {
		id: technique.id,
		name: technique.name,
		description: technique.description,
		category: technique.category,
	}
}

function sourceRouteMatches(sourceRoute: { branchId: string; routeId: string }, branchId: string, routeId: string): boolean {
	return sourceRoute.branchId === branchId && sourceRoute.routeId === routeId
}

function toolBackedOperationSucceeded(branchId: string, routeId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "tool_backed_operation_succeeded" &&
			sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId),
	}
}

function toolBackedOperationFailed(branchId: string, routeId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "tool_backed_operation_failed" &&
			sourceRouteMatches(triggerEvent.sourceRoute, branchId, routeId),
	}
}

function entryArtifactResolutionCompletedWithCreationRequired(creationRequired: boolean): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "entry_artifact_resolution_completed" &&
			triggerEvent.artifactResolutions.some(
				(artifactResolution) =>
					artifactResolution.artifactId === BRAINSTORMING_SESSION_ARTIFACT_ID &&
					artifactResolution.creationRequired === creationRequired,
			),
	}
}

function workflowFormCompleted(workflowFormId: string): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent }) =>
			triggerEvent.kind === "workflow_form_completed" && triggerEvent.workflowFormId === workflowFormId,
	}
}

function workflowFormCompletedWithApproach(
	workflowFormId: string,
	approach: BrainstormingSelectedApproach,
): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_form_completed" &&
			triggerEvent.workflowFormId === workflowFormId &&
			readSelectedApproach(workflowValues) === approach,
	}
}

function workflowFormCompletedWithRandomConfirmation(
	confirmation: BrainstormingRandomTechniqueConfirmation,
): WorkflowDecisionBranchTrigger {
	return {
		kind: "event_predicate",
		matches: ({ triggerEvent, workflowValues }) =>
			triggerEvent.kind === "workflow_form_completed" &&
			triggerEvent.workflowFormId === STEP_2_APPROACH_FORM_ID &&
			readRandomTechniqueConfirmation(workflowValues) === confirmation,
	}
}

function buildStep1SetupWorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Brainstorming Setup",
		toolDictionaryTitle: "Brainstorming Setup",
		toolDictionaryMarkdown: "Provide the inputs needed to prepare the brainstorming session.",
		firstPanelId: "step-1-context-panel",
		panels: {
			"step-1-context-panel": {
				panelId: "step-1-context-panel",
				title: "Context File",
				promptMarkdown:
					"You can provide a file to be used as context. If you have a file you'd like to use, enter the file path below. If not, leave the text box empty and click continue",
				fields: [
					{
						key: BrainstormingWorkflowValueKey.ContextFile,
						workflowValueKey: BrainstormingWorkflowValueKey.ContextFile,
						kind: "small_text",
						label: "Context file",
						required: false,
						allowedValueType: "string",
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Continue",
				},
				transition: {
					type: "sequential",
					nextPanelId: "step-1-topic-panel",
				},
			},
			"step-1-topic-panel": {
				panelId: "step-1-topic-panel",
				title: "Session Topic",
				promptMarkdown:
					"Please share the details of the topic, problem, or opportunity you'd like to focus on during this session",
				fields: [
					{
						key: BrainstormingWorkflowValueKey.SessionTopic,
						workflowValueKey: BrainstormingWorkflowValueKey.SessionTopic,
						kind: "large_text",
						label: "Session topic",
						required: true,
						allowedValueType: "string",
						presentation: {
							textareaSize: "large",
						},
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: {
					type: "sequential",
					nextPanelId: "step-1-goals-check-panel",
				},
			},
			"step-1-goals-check-panel": {
				panelId: "step-1-goals-check-panel",
				title: "Session Goals",
				promptMarkdown: "Do you have any specific goals for this session?",
				fields: [
					{
						key: BrainstormingWorkflowValueKey.HasSessionGoals,
						workflowValueKey: BrainstormingWorkflowValueKey.HasSessionGoals,
						kind: "boolean",
						label: "Session goals",
						required: true,
						allowedValueType: "boolean",
						trueLabel: "Yes",
						falseLabel: "No",
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: {
					type: "conditional",
					conditionSourceKey: BrainstormingWorkflowValueKey.HasSessionGoals,
					branches: [
						{
							matchValue: true,
							nextPanelId: "step-1-goals-detail-panel",
						},
						{
							matchValue: false,
							terminal: true,
							staleValueKeysToClear: [BrainstormingWorkflowValueKey.SessionGoals],
						},
					],
					defaultTerminal: true,
				},
			},
			"step-1-goals-detail-panel": {
				panelId: "step-1-goals-detail-panel",
				title: "Goal Details",
				promptMarkdown: "What are your goals for this session?",
				fields: [
					{
						key: BrainstormingWorkflowValueKey.SessionGoals,
						workflowValueKey: BrainstormingWorkflowValueKey.SessionGoals,
						kind: "large_text",
						label: "Session goals",
						required: true,
						allowedValueType: "string",
						presentation: {
							textareaSize: "large",
						},
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: buildTerminalTransition(),
			},
		},
	}
}

function buildStep2ApproachWorkflowForm(): WorkflowFormDefinitionPayload {
	return {
		definitionVersion: 2,
		title: "Brainstorming Approach",
		toolDictionaryTitle: "Brainstorming Approach",
		toolDictionaryMarkdown: "Select how the brainstorming technique should be chosen for this session.",
		firstPanelId: "step-2-approach-panel",
		panels: {
			"step-2-approach-panel": {
				panelId: "step-2-approach-panel",
				title: "Brainstorming Approach",
				promptMarkdown: "How would you like to select the brainstorming approach for this session?",
				fields: [
					{
						key: BrainstormingWorkflowValueKey.SelectedApproach,
						workflowValueKey: BrainstormingWorkflowValueKey.SelectedApproach,
						kind: "radio_group",
						label: "Brainstorming approach",
						required: true,
						options: [
							buildOption(BrainstormingSelectedApproach.Choose),
							buildOption(BrainstormingSelectedApproach.Random),
							buildOption(BrainstormingSelectedApproach.Suggest),
						],
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Continue",
				},
				transition: {
					type: "conditional",
					conditionSourceKey: BrainstormingWorkflowValueKey.SelectedApproach,
					branches: [
						{
							matchValue: BrainstormingSelectedApproach.Choose,
							nextPanelId: "step-2-category-panel",
						},
						{
							matchValue: BrainstormingSelectedApproach.Random,
							terminal: true,
						},
						{
							matchValue: BrainstormingSelectedApproach.Suggest,
							terminal: true,
						},
					],
					defaultTerminal: true,
				},
			},
			"step-2-category-panel": {
				panelId: "step-2-category-panel",
				title: "Which category would you like to explore?",
				promptMarkdown: "Which category would you like to explore?",
				fields: [
					{
						key: "chosen_technique_category",
						kind: "dropdown",
						label: "Technique category",
						required: true,
						options: listBrainstormingTechniqueCategories().map(buildOption),
						resetValueKeysOnChange: [BrainstormingWorkflowValueKey.ChosenTechniqueId],
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: {
					type: "sequential",
					nextPanelId: "step-2-technique-panel",
					staleValueKeysToClear: [BrainstormingWorkflowValueKey.ChosenTechniqueId],
				},
			},
			"step-2-technique-panel": {
				panelId: "step-2-technique-panel",
				title: "Which technique would you like?",
				promptMarkdown: "Which technique would you like?",
				fields: [
					{
						key: BrainstormingWorkflowValueKey.ChosenTechniqueId,
						workflowValueKey: BrainstormingWorkflowValueKey.ChosenTechniqueId,
						kind: "dropdown",
						label: "Technique",
						required: true,
						conditionalOptions: buildTechniqueConditionalOptions(),
						dependsOn: ["chosen_technique_category"],
					},
				],
				allowedActions: ["submit", "back"],
				actionLabels: {
					submit: "Continue",
					back: "Back",
				},
				transition: buildTerminalTransition(),
				backDestinationPanelId: "step-2-category-panel",
				backStaleValueKeysToClear: [BrainstormingWorkflowValueKey.ChosenTechniqueId],
			},
			[STEP_2_RANDOM_CONFIRMATION_PANEL_ID]: {
				panelId: STEP_2_RANDOM_CONFIRMATION_PANEL_ID,
				title: "Random Technique",
				promptMarkdown:
					"Random Technique: {workflow.random_technique_candidate.name}\n\nAbout This Technique: {workflow.random_technique_candidate.description}\n\nReady to get started?",
				fields: [
					{
						key: BrainstormingWorkflowValueKey.RandomTechniqueConfirmation,
						workflowValueKey: BrainstormingWorkflowValueKey.RandomTechniqueConfirmation,
						kind: "radio_group",
						label: "Ready to get started?",
						required: true,
						options: [
							{
								value: BrainstormingRandomTechniqueConfirmation.Confirm,
								label: "Confirm",
							},
							{
								value: BrainstormingRandomTechniqueConfirmation.Retry,
								label: "Retry",
							},
						],
					},
				],
				allowedActions: ["submit"],
				actionLabels: {
					submit: "Continue",
				},
				transition: buildTerminalTransition(),
			},
		},
	}
}

function buildRandomTechniqueSelectionResult(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const rejectedIds = readRejectedTechniqueIds(session.workflowValues)
	const selectedTechnique = selectRandomBrainstormingTechnique({ excludedIds: rejectedIds })
	if (selectedTechnique === undefined) {
		return {
			kind: "failed",
			errorMessage: "No eligible brainstorming technique remains for random selection.",
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[BrainstormingWorkflowValueKey.RandomTechniqueCandidate]: buildTechniqueWorkflowValue(selectedTechnique),
			[BrainstormingWorkflowValueKey.RandomTechniqueRejectedIds]: [...rejectedIds],
		},
	}
}

function persistChosenTechniqueResult(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const chosenTechniqueId = readWorkflowStringValue(session.workflowValues, BrainstormingWorkflowValueKey.ChosenTechniqueId)
	if (chosenTechniqueId === undefined) {
		return {
			kind: "failed",
			errorMessage: "No brainstorming technique was selected.",
		}
	}

	const selectedTechnique = findBrainstormingTechniqueByIdOrName({ id: chosenTechniqueId })
	if (selectedTechnique === undefined) {
		return {
			kind: "failed",
			errorMessage: `Unknown brainstorming technique id: ${chosenTechniqueId}`,
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[BrainstormingWorkflowValueKey.SelectedTechniques]: [buildTechniqueWorkflowValue(selectedTechnique)],
		},
	}
}

function persistRandomConfirmedTechniqueResult(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const candidate = readRandomTechniqueCandidate(session.workflowValues)
	if (candidate === undefined) {
		return {
			kind: "failed",
			errorMessage: "No random brainstorming technique candidate is available to confirm.",
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[BrainstormingWorkflowValueKey.SelectedTechniques]: [candidate],
		},
	}
}

function buildRandomTechniqueRetryResult(session: ActiveWorkflowSession): WorkflowDeterministicProcedureResult {
	const candidate = readRandomTechniqueCandidate(session.workflowValues)
	const candidateId = candidate?.id
	if (typeof candidateId !== "string" || candidateId.trim().length === 0) {
		return {
			kind: "failed",
			errorMessage: "No random brainstorming technique candidate is available to reject.",
		}
	}

	const rejectedIds = appendUniqueTechniqueId(readRejectedTechniqueIds(session.workflowValues), candidateId)
	const nextTechnique = selectRandomBrainstormingTechnique({ excludedIds: rejectedIds })
	if (nextTechnique === undefined) {
		return {
			kind: "failed",
			errorMessage: "No eligible brainstorming technique remains for random selection.",
		}
	}

	return {
		kind: "succeeded",
		workflowValueWrites: {
			[BrainstormingWorkflowValueKey.RandomTechniqueRejectedIds]: [...rejectedIds],
			[BrainstormingWorkflowValueKey.RandomTechniqueCandidate]: buildTechniqueWorkflowValue(nextTechnique),
			[BrainstormingWorkflowValueKey.RandomTechniqueConfirmation]: "",
		},
	}
}

function buildBrainstormingDocumentWithSuggestionPlaceholder(session: ActiveWorkflowSession): string {
	return buildBrainstormingDocumentFromSession({
		...session,
		workflowValues: {
			...session.workflowValues,
			[BrainstormingWorkflowValueKey.SelectedTechniques]: SUGGESTED_TECHNIQUE_PLACEHOLDER,
		},
	})
}

function replaceOutputFilePlaceholder(input: WorkflowPromptBuilderInput, source: string): string {
	const outputFileValue = input.session.workflowValues[BrainstormingWorkflowValueKey.OutputFile]
	if (outputFileValue === undefined) {
		return source
	}

	return source.replace(/\{output_file\}/g, input.renderWorkflowValue(outputFileValue))
}

function buildStep3PromptSource(input: WorkflowPromptBuilderInput): WorkflowStepPromptSource {
	const selectedApproach = readSelectedApproach(input.session.workflowValues)
	const openingPrompt =
		selectedApproach === BrainstormingSelectedApproach.Suggest
			? `Read \`{output_file}\`.

The user has requested that you propose an appropriate brainstorming technique based on the information they've provided in \`{output_file}\`. Call \`get_brainstorming_methods\` to retrieve the list of supported brainstorming methods. Select a brainstorming technique that seems appropriate, then propose that technique to the user.

After the user accepts the proposed technique, call \`append_brainstorming_selected_technique\` with the accepted technique name, description, and category/id when available. Do not call \`set_workflow_values\` for \`selected_techniques\`.

Then record the selected technique under the \`selected techniques\` heading in \`{output_file}\` with the accepted technique name and description.

After the accepted technique has been appended and written to \`{output_file}\`, continue with the shared brainstorming facilitation instructions below.`
			: `Read \`{output_file}\`.`

	return {
		currentStepInstructions: replaceOutputFilePlaceholder(
			input,
			`${openingPrompt}

${STEP_3_SHARED_FACILITATION_PROMPT}`,
		),
	}
}

function createEmptyPromptSource(): WorkflowStepPromptSource {
	return {}
}

function createStepDefinition(args: {
	stepNumber: 1 | 2 | 3 | 4
	checklistLabel: string
	decisionTree: WorkflowDecisionTree
	buildPromptSource?: WorkflowStepDefinition["buildPromptSource"]
	buildToolSchema: WorkflowStepDefinition["buildToolSchema"]
}): WorkflowStepDefinition {
	return {
		id: `step-${args.stepNumber}`,
		stepNumber: args.stepNumber,
		checklistLabel: args.checklistLabel,
		buildPromptSource: args.buildPromptSource ?? createEmptyPromptSource,
		buildToolSchema: args.buildToolSchema,
		decisionTree: args.decisionTree,
	}
}

function buildStep1DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-1-resolve-entry-artifact",
		branches: {
			"step-1-resolve-entry-artifact": {
				id: "step-1-resolve-entry-artifact",
				routes: [
					{
						id: "step-1-allocate-artifact",
						trigger: entryArtifactResolutionCompletedWithCreationRequired(true),
						action: {
							kind: "allocate_artifact",
							artifactId: BRAINSTORMING_SESSION_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-allocation",
					},
					{
						id: "step-1-continue-existing-artifact",
						trigger: entryArtifactResolutionCompletedWithCreationRequired(false),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 3,
							},
						},
					},
				],
			},
			"step-1-await-allocation": {
				id: "step-1-await-allocation",
				routes: [
					{
						id: "step-1-build-initial-shell",
						trigger: toolBackedOperationSucceeded("step-1-resolve-entry-artifact", "step-1-allocate-artifact"),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: BRAINSTORMING_SESSION_ARTIFACT_ID,
								buildContent: buildInitialBrainstormingDocument,
							},
						},
						followingBranchId: "step-1-await-initial-shell",
					},
					{
						id: "step-1-retry-allocate-artifact",
						trigger: toolBackedOperationFailed("step-1-resolve-entry-artifact", "step-1-allocate-artifact"),
						action: {
							kind: "allocate_artifact",
							artifactId: BRAINSTORMING_SESSION_ARTIFACT_ID,
						},
						followingBranchId: "step-1-await-retry-allocation",
					},
				],
			},
			"step-1-await-retry-allocation": {
				id: "step-1-await-retry-allocation",
				routes: [
					{
						id: "step-1-build-initial-shell-after-retry",
						trigger: toolBackedOperationSucceeded("step-1-await-allocation", "step-1-retry-allocate-artifact"),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: BRAINSTORMING_SESSION_ARTIFACT_ID,
								buildContent: buildInitialBrainstormingDocument,
							},
						},
						followingBranchId: "step-1-await-initial-shell",
					},
					{
						id: "step-1-terminal-error-after-retry-allocation",
						trigger: toolBackedOperationFailed("step-1-await-allocation", "step-1-retry-allocate-artifact"),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to allocate brainstorming.md after retrying artifact creation.",
						},
					},
				],
			},
			"step-1-await-initial-shell": {
				id: "step-1-await-initial-shell",
				routes: [
					{
						id: "step-1-render-setup-form",
						trigger: {
							kind: "event_predicate",
							matches: ({ triggerEvent }) =>
								triggerEvent.kind === "tool_backed_operation_succeeded" &&
								(sourceRouteMatches(
									triggerEvent.sourceRoute,
									"step-1-await-allocation",
									"step-1-build-initial-shell",
								) ||
									sourceRouteMatches(
										triggerEvent.sourceRoute,
										"step-1-await-retry-allocation",
										"step-1-build-initial-shell-after-retry",
									)),
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: STEP_1_SETUP_FORM_ID,
						},
						followingBranchId: "step-1-await-setup-form",
					},
					{
						id: "step-1-terminal-error-after-initial-shell",
						trigger: {
							kind: "event_predicate",
							matches: ({ triggerEvent }) =>
								triggerEvent.kind === "tool_backed_operation_failed" &&
								(sourceRouteMatches(
									triggerEvent.sourceRoute,
									"step-1-await-allocation",
									"step-1-build-initial-shell",
								) ||
									sourceRouteMatches(
										triggerEvent.sourceRoute,
										"step-1-await-retry-allocation",
										"step-1-build-initial-shell-after-retry",
									)),
						},
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to initialize brainstorming.md.",
						},
					},
				],
			},
			"step-1-await-setup-form": {
				id: "step-1-await-setup-form",
				routes: [
					{
						id: "step-1-build-submitted-values-document",
						trigger: workflowFormCompleted(STEP_1_SETUP_FORM_ID),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: BRAINSTORMING_SESSION_ARTIFACT_ID,
								buildContent: buildBrainstormingDocumentFromSession,
							},
						},
						followingBranchId: "step-1-await-submitted-values-document",
					},
				],
			},
			"step-1-await-submitted-values-document": {
				id: "step-1-await-submitted-values-document",
				routes: [
					{
						id: "step-1-transition-to-step-2",
						trigger: toolBackedOperationSucceeded(
							"step-1-await-setup-form",
							"step-1-build-submitted-values-document",
						),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 2,
							},
						},
					},
					{
						id: "step-1-terminal-error-after-submitted-values-document",
						trigger: toolBackedOperationFailed("step-1-await-setup-form", "step-1-build-submitted-values-document"),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to write brainstorming setup values to brainstorming.md.",
						},
					},
				],
			},
		},
	}
}

function buildStep2DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-2-render-approach-form",
		branches: {
			"step-2-render-approach-form": {
				id: "step-2-render-approach-form",
				routes: [
					{
						id: "step-2-render-approach-form",
						trigger: { kind: "always" },
						action: {
							kind: "render_workflow_form",
							workflowFormId: STEP_2_APPROACH_FORM_ID,
						},
						followingBranchId: "step-2-after-approach-form",
					},
				],
			},
			"step-2-after-approach-form": {
				id: "step-2-after-approach-form",
				routes: [
					{
						id: "step-2-persist-chosen-technique",
						trigger: workflowFormCompletedWithApproach(STEP_2_APPROACH_FORM_ID, BrainstormingSelectedApproach.Choose),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: persistChosenTechniqueResult,
							},
						},
						followingBranchId: "step-2-write-chosen-document",
					},
					{
						id: "step-2-write-suggestion-placeholder",
						trigger: workflowFormCompletedWithApproach(
							STEP_2_APPROACH_FORM_ID,
							BrainstormingSelectedApproach.Suggest,
						),
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: BRAINSTORMING_SESSION_ARTIFACT_ID,
								buildContent: buildBrainstormingDocumentWithSuggestionPlaceholder,
							},
						},
						followingBranchId: "step-2-await-suggestion-placeholder-document",
					},
					{
						id: "step-2-select-random-technique",
						trigger: {
							kind: "event_predicate",
							matches: ({ triggerEvent, workflowValues }) =>
								triggerEvent.kind === "workflow_form_completed" &&
								triggerEvent.workflowFormId === STEP_2_APPROACH_FORM_ID &&
								readSelectedApproach(workflowValues) === BrainstormingSelectedApproach.Random &&
								readRandomTechniqueCandidate(workflowValues) === undefined,
						},
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: buildRandomTechniqueSelectionResult,
							},
						},
						followingBranchId: "step-2-after-random-selection",
					},
				],
			},
			"step-2-write-chosen-document": {
				id: "step-2-write-chosen-document",
				routes: [
					{
						id: "step-2-write-chosen-document",
						trigger: { kind: "always" },
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: BRAINSTORMING_SESSION_ARTIFACT_ID,
								buildContent: buildBrainstormingDocumentFromSession,
							},
						},
						followingBranchId: "step-2-await-chosen-document",
					},
				],
			},
			"step-2-await-chosen-document": {
				id: "step-2-await-chosen-document",
				routes: [
					{
						id: "step-2-transition-to-step-3-after-chosen-document",
						trigger: toolBackedOperationSucceeded("step-2-write-chosen-document", "step-2-write-chosen-document"),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 3,
							},
						},
					},
					{
						id: "step-2-terminal-error-after-chosen-document",
						trigger: toolBackedOperationFailed("step-2-write-chosen-document", "step-2-write-chosen-document"),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to write the selected brainstorming technique to brainstorming.md.",
						},
					},
				],
			},
			"step-2-after-random-selection": {
				id: "step-2-after-random-selection",
				routes: [
					{
						id: "step-2-render-random-confirmation",
						trigger: {
							kind: "session_predicate",
							matches: ({ workflowValues }) =>
								readSelectedApproach(workflowValues) === BrainstormingSelectedApproach.Random &&
								readRandomTechniqueCandidate(workflowValues) !== undefined &&
								readRandomTechniqueConfirmation(workflowValues) === undefined,
						},
						action: {
							kind: "render_workflow_form",
							workflowFormId: STEP_2_APPROACH_FORM_ID,
							startPanelId: STEP_2_RANDOM_CONFIRMATION_PANEL_ID,
						},
						followingBranchId: "step-2-after-random-confirmation-form",
					},
				],
			},
			"step-2-after-random-confirmation-form": {
				id: "step-2-after-random-confirmation-form",
				routes: [
					{
						id: "step-2-persist-confirmed-random-technique",
						trigger: workflowFormCompletedWithRandomConfirmation(BrainstormingRandomTechniqueConfirmation.Confirm),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: persistRandomConfirmedTechniqueResult,
							},
						},
						followingBranchId: "step-2-write-random-confirmed-document",
					},
					{
						id: "step-2-retry-random-technique",
						trigger: workflowFormCompletedWithRandomConfirmation(BrainstormingRandomTechniqueConfirmation.Retry),
						action: {
							kind: "run_deterministic_procedure",
							instruction: {
								run: buildRandomTechniqueRetryResult,
							},
						},
						followingBranchId: "step-2-after-random-selection",
					},
				],
			},
			"step-2-write-random-confirmed-document": {
				id: "step-2-write-random-confirmed-document",
				routes: [
					{
						id: "step-2-write-random-confirmed-document",
						trigger: { kind: "always" },
						action: {
							kind: "build_workflow_document",
							instruction: {
								artifactId: BRAINSTORMING_SESSION_ARTIFACT_ID,
								buildContent: buildBrainstormingDocumentFromSession,
							},
						},
						followingBranchId: "step-2-await-random-confirmed-document",
					},
				],
			},
			"step-2-await-random-confirmed-document": {
				id: "step-2-await-random-confirmed-document",
				routes: [
					{
						id: "step-2-transition-to-step-3-after-random-document",
						trigger: toolBackedOperationSucceeded(
							"step-2-write-random-confirmed-document",
							"step-2-write-random-confirmed-document",
						),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 3,
							},
						},
					},
					{
						id: "step-2-terminal-error-after-random-document",
						trigger: toolBackedOperationFailed(
							"step-2-write-random-confirmed-document",
							"step-2-write-random-confirmed-document",
						),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to write the random brainstorming technique to brainstorming.md.",
						},
					},
				],
			},
			"step-2-await-suggestion-placeholder-document": {
				id: "step-2-await-suggestion-placeholder-document",
				routes: [
					{
						id: "step-2-transition-to-step-3-after-suggestion-placeholder",
						trigger: toolBackedOperationSucceeded(
							"step-2-after-approach-form",
							"step-2-write-suggestion-placeholder",
						),
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 3,
							},
						},
					},
					{
						id: "step-2-terminal-error-after-suggestion-placeholder",
						trigger: toolBackedOperationFailed("step-2-after-approach-form", "step-2-write-suggestion-placeholder"),
						action: {
							kind: "terminal_error",
							errorMessage: "Unable to write the brainstorming suggestion placeholder to brainstorming.md.",
						},
					},
				],
			},
		},
	}
}

function buildStep3DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-3-project-prompt",
		branches: {
			"step-3-project-prompt": {
				id: "step-3-project-prompt",
				routes: [
					{
						id: "step-3-project-prompt",
						trigger: { kind: "always" },
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-3-await-progress-request",
					},
				],
			},
			"step-3-await-progress-request": {
				id: "step-3-await-progress-request",
				routes: [
					{
						id: "step-3-transition-to-step-4",
						trigger: { kind: "on_event", eventKind: "workflow_progress_request_confirmed" },
						action: {
							kind: "transition_step",
							target: {
								kind: "entry_branch",
								stepNumber: 4,
							},
						},
					},
					{
						id: "step-3-continue-brainstorming",
						trigger: { kind: "on_event", eventKind: "workflow_progress_request_denied" },
						action: {
							kind: "project_prompt",
						},
					},
				],
			},
		},
	}
}

function buildStep4DecisionTree(): WorkflowDecisionTree {
	return {
		entryBranchId: "step-4-project-prompt",
		branches: {
			"step-4-project-prompt": {
				id: "step-4-project-prompt",
				routes: [
					{
						id: "step-4-project-prompt",
						trigger: { kind: "always" },
						action: {
							kind: "project_prompt",
						},
						followingBranchId: "step-4-await-attempt-completion",
					},
				],
			},
			"step-4-await-attempt-completion": {
				id: "step-4-await-attempt-completion",
				routes: [
					{
						id: "step-4-complete-workflow-after-attempt-completion",
						trigger: { kind: "on_event", eventKind: "attempt_completion_succeeded" },
						action: {
							kind: "complete_workflow",
						},
					},
				],
			},
		},
	}
}

export const brainstormingWorkflowDefinition: WorkflowDefinition = {
	name: "brainstorming",
	displayName: BRAINSTORMING_WORKFLOW_DISPLAY_NAME,
	description: BRAINSTORMING_WORKFLOW_DESCRIPTION,
	slashCommandName: "brainstorming",
	useSkillName: "brainstorming",
	persona: BRAINSTORMING_WORKFLOW_PERSONA,
	projectSubfolder: "discovery",
	workflowValueKeys: BRAINSTORMING_WORKFLOW_VALUE_KEYS,
	entryProjectValueKeys: {
		projectMode: BrainstormingWorkflowValueKey.ProjectMode,
		projectTitle: BrainstormingWorkflowValueKey.ProjectTitle,
		projectFolderName: BrainstormingWorkflowValueKey.ProjectFolderName,
	},
	entryPanel: {
		promptMarkdown: BRAINSTORMING_WORKFLOW_DESCRIPTION,
	},
	artifacts: {
		[BRAINSTORMING_SESSION_ARTIFACT_ID]: {
			id: BRAINSTORMING_SESSION_ARTIFACT_ID,
			family: WorkflowArtifactFamily.BrainstormingSession,
			intentMode: "new",
			parentIdentitySource: undefined,
			targetIdentitySource: undefined,
			outputValueKeys: {
				projectTitle: BrainstormingWorkflowValueKey.ProjectTitle,
				projectFolderName: BrainstormingWorkflowValueKey.ProjectFolderName,
				artifactFamily: BrainstormingWorkflowValueKey.OutputArtifactFamily,
				artifactIdentity: BrainstormingWorkflowValueKey.OutputArtifactIdentity,
				artifactFilename: BrainstormingWorkflowValueKey.OutputArtifactFilename,
				artifactRelativePath: BrainstormingWorkflowValueKey.OutputArtifactRelativePath,
				artifactAbsolutePath: BrainstormingWorkflowValueKey.OutputFile,
				parentIdentity: undefined,
				targetIdentity: undefined,
			},
		},
	},
	workflowForms: {
		[STEP_1_SETUP_FORM_ID]: buildStep1SetupWorkflowForm(),
		[STEP_2_APPROACH_FORM_ID]: buildStep2ApproachWorkflowForm(),
	},
	steps: {
		"step-1": createStepDefinition({
			stepNumber: 1,
			checklistLabel: "Gather Inputs",
			decisionTree: buildStep1DecisionTree(),
			buildToolSchema: buildBrainstormingStep1ToolSchemas,
		}),
		"step-2": createStepDefinition({
			stepNumber: 2,
			checklistLabel: "Resolve Session Approach",
			decisionTree: buildStep2DecisionTree(),
			buildToolSchema: buildBrainstormingStep2ToolSchemas,
		}),
		"step-3": createStepDefinition({
			stepNumber: 3,
			checklistLabel: "Perform Interactive Brainstorming",
			decisionTree: buildStep3DecisionTree(),
			buildPromptSource: buildStep3PromptSource,
			buildToolSchema: buildBrainstormingStep3ToolSchemas,
		}),
		"step-4": createStepDefinition({
			stepNumber: 4,
			checklistLabel: "Organize Ideas & Plan Next Actions",
			decisionTree: buildStep4DecisionTree(),
			buildPromptSource: (input) => ({
				currentStepInstructions: replaceOutputFilePlaceholder(input, STEP_4_PROMPT),
			}),
			buildToolSchema: buildBrainstormingStep4ToolSchemas,
		}),
	},
}
