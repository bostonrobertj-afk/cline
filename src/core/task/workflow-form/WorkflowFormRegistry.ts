import type { ClineWorkflowForm, WorkflowFormFieldDefinition, WorkflowFormFieldOption } from "@shared/ExtensionMessage"
import {
	buildToolDictionaryMarkdown,
	WORKFLOW_FORM_TOOL_DICTIONARY_HEADING,
} from "@/core/task/workflow-form/dictionaries/buildToolDictionary"
import { workflowFormSystemDictionary } from "@/core/task/workflow-form/dictionaries/systemDictionary"
import type { WorkflowFormResolverDefinition, WorkflowFormSessionState, WorkflowFormValues } from "./types"

const SOURCE_TYPE_FIELD_KEY = "source.type"
const SOURCE_COMMIT_FIELD_KEY = "source.commit"
const SOURCE_BASE_FIELD_KEY = "source.base"
const SOURCE_HEAD_FIELD_KEY = "source.head"
const SCOPED_PATHS_FIELD_KEY = "scoped_paths"
const CONTEXT_LINES_FIELD_KEY = "context_lines"

function getStringValue(values: WorkflowFormValues, key: string): string | undefined {
	return values[key]?.stringValue?.trim()
}

function getStringArrayValue(values: WorkflowFormValues, key: string): string[] {
	const normalized = values[key]?.stringArrayValue ?? []
	return normalized.map((value: string) => value.trim()).filter(Boolean)
}

function getIntegerValue(values: WorkflowFormValues, key: string): number | undefined {
	const value = values[key]?.integerValue
	return Number.isInteger(value) ? value : undefined
}

function getDictionaryStartLine(markdown: string): number {
	const lines = markdown.split("\n")
	const lineIndex = lines.findIndex((line) => line === WORKFLOW_FORM_TOOL_DICTIONARY_HEADING)
	if (lineIndex === -1) {
		throw new Error(`Could not locate ${WORKFLOW_FORM_TOOL_DICTIONARY_HEADING} in the workflow form tool dictionary`)
	}

	return lineIndex + 1
}

function buildSourceTypeOptions(): WorkflowFormFieldOption[] {
	return [
		{
			value: "commit",
			label: workflowFormSystemDictionary.commit.label,
			description: workflowFormSystemDictionary.commit.medium,
		},
		{
			value: "commit_range",
			label: workflowFormSystemDictionary.commit_range.label,
			description: workflowFormSystemDictionary.commit_range.medium,
		},
		{
			value: "ref_diff",
			label: workflowFormSystemDictionary.ref_diff.label,
			description: workflowFormSystemDictionary.ref_diff.medium,
		},
		{
			value: "worktree_head_scoped",
			label: workflowFormSystemDictionary.worktree_head_scoped.label,
			description: workflowFormSystemDictionary.worktree_head_scoped.medium,
		},
	]
}

function buildFieldDefinitions(values: WorkflowFormValues): WorkflowFormFieldDefinition[] {
	const sourceType = getStringValue(values, SOURCE_TYPE_FIELD_KEY)
	const showsCommitField = sourceType === "commit"
	const showsBaseAndHeadFields = sourceType === "commit_range" || sourceType === "ref_diff"
	const showsScopedPaths = Boolean(sourceType)
	const worktreeScoped = sourceType === "worktree_head_scoped"

	return [
		{
			key: SOURCE_TYPE_FIELD_KEY,
			label: workflowFormSystemDictionary.source.label,
			help: workflowFormSystemDictionary.source.medium,
			control: "select",
			required: true,
			options: buildSourceTypeOptions(),
			visible: true,
		},
		{
			key: SOURCE_COMMIT_FIELD_KEY,
			label: workflowFormSystemDictionary.commit.label,
			help: workflowFormSystemDictionary.commit.medium,
			control: "text",
			required: showsCommitField,
			placeholder: "abc1234",
			visible: showsCommitField,
		},
		{
			key: SOURCE_BASE_FIELD_KEY,
			label: workflowFormSystemDictionary.base.label,
			help: workflowFormSystemDictionary.base.medium,
			control: "text",
			required: showsBaseAndHeadFields,
			placeholder: "main",
			visible: showsBaseAndHeadFields,
		},
		{
			key: SOURCE_HEAD_FIELD_KEY,
			label: workflowFormSystemDictionary.head.label,
			help: workflowFormSystemDictionary.head.medium,
			control: "text",
			required: showsBaseAndHeadFields,
			placeholder: "HEAD",
			visible: showsBaseAndHeadFields,
		},
		{
			key: SCOPED_PATHS_FIELD_KEY,
			label: workflowFormSystemDictionary.scoped_paths.label,
			help: workflowFormSystemDictionary.scoped_paths.medium,
			control: "textarea",
			required: worktreeScoped,
			placeholder: "src/core/task/index.ts",
			visible: showsScopedPaths,
		},
		{
			key: CONTEXT_LINES_FIELD_KEY,
			label: workflowFormSystemDictionary.context_lines.label,
			help: workflowFormSystemDictionary.context_lines.medium,
			control: "number",
			required: false,
			placeholder: "3",
			visible: Boolean(sourceType) && !worktreeScoped,
		},
	]
}

function buildBasePayload(
	session: WorkflowFormSessionState,
	toolDictionaryMarkdown: string,
	overrides: Pick<ClineWorkflowForm, "prompt" | "phase"> &
		Partial<
			Pick<
				ClineWorkflowForm,
				"options" | "fields" | "submitLabel" | "cancelLabel" | "retryLabel" | "errorMessage" | "successMessage"
			>
		>,
): ClineWorkflowForm {
	return {
		sessionId: session.sessionId,
		resolverId: session.resolverId,
		toolName: "build_review_diff_output",
		title: "Prepare Diff Input",
		prompt: overrides.prompt,
		phase: overrides.phase,
		toolDictionaryRelativePath: "docs/workflow-ui-surface/tool-dictionary.md",
		toolDictionaryStartLine: getDictionaryStartLine(toolDictionaryMarkdown),
		options: overrides.options,
		fields: overrides.fields,
		values: session.values,
		submitLabel: overrides.submitLabel,
		cancelLabel: overrides.cancelLabel,
		retryLabel: overrides.retryLabel,
		errorMessage: overrides.errorMessage,
		successMessage: overrides.successMessage,
	}
}

export const workflowFormRegistry: Record<"code_review_step_3_diff_source", WorkflowFormResolverDefinition> = {
	code_review_step_3_diff_source: {
		id: "code_review_step_3_diff_source",
		toolName: "build_review_diff_output",
		toolDictionaryRelativePath: "docs/workflow-ui-surface/tool-dictionary.md",
		getToolDictionaryStartLine(markdown: string): number {
			return getDictionaryStartLine(markdown)
		},
		buildConfirmPayload(session, toolDictionaryMarkdown) {
			return buildBasePayload(session, toolDictionaryMarkdown, {
				phase: "confirm",
				prompt: "If you already know the Git-backed diff source for workflow Step 3, the system can build the review diff artifact directly before the fallback AI path runs.",
				options: ["Yes", "No"],
			})
		},
		buildCollectPayload(session, toolDictionaryMarkdown) {
			return buildBasePayload(session, toolDictionaryMarkdown, {
				phase: "collect",
				prompt: "Provide the diff source details for build_review_diff_output so the system can create the Step 3 review diff artifact.",
				fields: buildFieldDefinitions(session.values),
				submitLabel: "Submit",
				cancelLabel: "Cancel",
			})
		},
		buildRetryPayload(session, toolDictionaryMarkdown) {
			return buildBasePayload(session, toolDictionaryMarkdown, {
				phase: "retry_error",
				prompt: "The system could not build the review diff artifact. Update the diff source details or retry the request.",
				fields: buildFieldDefinitions(session.values),
				submitLabel: "Submit",
				cancelLabel: "Cancel",
				retryLabel: "Retry",
				errorMessage: session.lastError,
			})
		},
		translateSubmissionToToolUse(values) {
			const sourceType = getStringValue(values, SOURCE_TYPE_FIELD_KEY)
			const scopedPaths = getStringArrayValue(values, SCOPED_PATHS_FIELD_KEY)
			const contextLines = getIntegerValue(values, CONTEXT_LINES_FIELD_KEY)
			let toolInput: Record<string, unknown>

			switch (sourceType) {
				case "commit":
					toolInput = {
						source: {
							type: "commit",
							commit: getStringValue(values, SOURCE_COMMIT_FIELD_KEY) ?? "",
						},
					}
					break
				case "commit_range":
					toolInput = {
						source: {
							type: "commit_range",
							base: getStringValue(values, SOURCE_BASE_FIELD_KEY) ?? "",
							head: getStringValue(values, SOURCE_HEAD_FIELD_KEY) ?? "",
						},
					}
					break
				case "ref_diff":
					toolInput = {
						source: {
							type: "ref_diff",
							base: getStringValue(values, SOURCE_BASE_FIELD_KEY) ?? "",
							head: getStringValue(values, SOURCE_HEAD_FIELD_KEY) ?? "",
						},
					}
					break
				case "worktree_head_scoped":
					toolInput = {
						source: {
							type: "worktree_head_scoped",
						},
						scoped_paths: scopedPaths,
					}
					break
				default:
					throw new Error(`Unsupported workflow form source type: ${sourceType ?? "undefined"}`)
			}

			if (sourceType !== "worktree_head_scoped" && scopedPaths.length > 0) {
				toolInput.scoped_paths = scopedPaths
			}

			if (contextLines !== undefined) {
				toolInput.context_lines = contextLines
			}

			return toolInput
		},
	},
}

export function getWorkflowFormResolverDefinition() {
	return workflowFormRegistry.code_review_step_3_diff_source
}

export function getDefaultWorkflowFormToolDictionaryMarkdown() {
	return buildToolDictionaryMarkdown()
}
