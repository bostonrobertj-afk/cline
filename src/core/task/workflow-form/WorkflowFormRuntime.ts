import type {
	ClineWorkflowForm,
	WorkflowFormAllowedValueType,
	WorkflowFormConditionDefinition,
	WorkflowFormDefinitionPayload,
	WorkflowFormFieldDefinition,
	WorkflowFormFieldKind,
	WorkflowFormPanelDefinition,
	WorkflowFormResolvedPanelPayload,
	WorkflowFormSubmittedValuePayload,
	WorkflowFormTransitionDefinition,
} from "@shared/ExtensionMessage"
import {
	WorkflowFormAction,
	type WorkflowFormFieldSubmission,
	type WorkflowFormSubmissionRequest,
} from "@shared/proto/cline/task"
import { randomUUID } from "crypto"
import { buildWorkflowFormPayload } from "./buildWorkflowFormPayload"
import { normalizeWorkflowFormSubmittedValue, validateWorkflowFormSubmittedValueAgainstSchema } from "./schema"
import type {
	WorkflowFormResolverDefinition,
	WorkflowFormRuntimeCreateSessionOptions,
	WorkflowFormRuntimeOutcome,
	WorkflowFormSessionData,
	WorkflowFormSessionState,
	WorkflowFormSessionValues,
} from "./types"
import { workflowFormRegistry } from "./WorkflowFormRegistry"

const SUPPORTED_FIELD_KINDS: WorkflowFormFieldKind[] = [
	"dropdown",
	"boolean",
	"small_text",
	"large_text",
	"number",
	"multi_select",
	"radio_group",
	"checkbox_group",
	"date",
	"date_time",
	"file_path",
	"directory_path",
	"artifact_picker",
	"markdown_display",
	"static_notice",
]

const SUPPORTED_ALLOWED_VALUE_TYPES: WorkflowFormAllowedValueType[] = [
	"string",
	"boolean",
	"integer",
	"number",
	"array",
	"object",
]

const NON_INPUT_FIELD_KINDS = new Set<WorkflowFormFieldKind>(["markdown_display", "static_notice"])

function isSupportedFieldKind(kind: string): kind is WorkflowFormFieldKind {
	return SUPPORTED_FIELD_KINDS.includes(kind as WorkflowFormFieldKind)
}

function isSupportedAllowedValueType(valueType: string): valueType is WorkflowFormAllowedValueType {
	return SUPPORTED_ALLOWED_VALUE_TYPES.includes(valueType as WorkflowFormAllowedValueType)
}

function isInputField(field: WorkflowFormFieldDefinition): boolean {
	return !NON_INPUT_FIELD_KINDS.has(field.kind)
}

function submittedValueToComparable(value: WorkflowFormSubmittedValuePayload | undefined): unknown {
	if (!value) {
		return undefined
	}

	switch (value.valueType) {
		case "string":
			return value.stringValue
		case "boolean":
			return value.booleanValue
		case "integer":
			return value.integerValue
		case "number":
			return value.numberValue
		case "array":
			return (value.arrayValue ?? []).map((entry) => submittedValueToComparable(entry))
		case "object":
			return Object.fromEntries(
				(value.objectValue ?? []).map((entry) => [entry.key, submittedValueToComparable(entry.value)]),
			)
		default:
			return undefined
	}
}

function submittedValuesEqual(
	left: WorkflowFormSubmittedValuePayload | undefined,
	right: WorkflowFormSubmittedValuePayload | undefined,
): boolean {
	return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function resolveComparableSourceValue(session: Pick<WorkflowFormSessionState, "values" | "data">, sourceKey: string): unknown {
	if (sourceKey in session.values) {
		return submittedValueToComparable(session.values[sourceKey])
	}

	if (sourceKey in session.data) {
		const value = session.data[sourceKey]
		if (value && typeof value === "object" && !Array.isArray(value) && "valueType" in value) {
			return submittedValueToComparable(value as WorkflowFormSubmittedValuePayload)
		}
		return value
	}

	const path = sourceKey.split(".")
	let current: unknown = session.data
	for (const segment of path) {
		if (!current || typeof current !== "object" || Array.isArray(current) || !(segment in current)) {
			return undefined
		}
		current = (current as Record<string, unknown>)[segment]
	}
	return current
}

function evaluateCondition(
	condition: WorkflowFormConditionDefinition | undefined,
	session: Pick<WorkflowFormSessionState, "values" | "data">,
): boolean {
	if (!condition) {
		return true
	}

	const sourceValue = resolveComparableSourceValue(session, condition.sourceKey)
	const operator = condition.operator ?? "equals"
	const values = condition.values ?? []

	switch (operator) {
		case "equals":
			if (values.length > 0) {
				return values.includes(sourceValue as string | boolean | number)
			}
			return sourceValue === condition.value
		case "not_equals":
			if (values.length > 0) {
				return !values.includes(sourceValue as string | boolean | number)
			}
			return sourceValue !== condition.value
		case "contains":
			if (Array.isArray(sourceValue)) {
				return sourceValue.includes(condition.value)
			}
			if (typeof sourceValue === "string" && typeof condition.value === "string") {
				return sourceValue.includes(condition.value)
			}
			return false
		case "not_contains":
			if (Array.isArray(sourceValue)) {
				return !sourceValue.includes(condition.value)
			}
			if (typeof sourceValue === "string" && typeof condition.value === "string") {
				return !sourceValue.includes(condition.value)
			}
			return true
		case "is_truthy":
			return Boolean(sourceValue)
		case "is_falsy":
			return !sourceValue
		default:
			return false
	}
}

function resolvePanelFields(
	panel: WorkflowFormPanelDefinition,
	session: Pick<WorkflowFormSessionState, "values" | "data">,
): WorkflowFormFieldDefinition[] {
	return panel.fields
		.filter((field) => field.visible !== false)
		.filter((field) => evaluateCondition(field.visibilityCondition, session))
		.map((field) => {
			const resolvedField: WorkflowFormFieldDefinition = { ...field }
			const conditionalOptions = field.conditionalOptions?.find((entry) => evaluateCondition(entry.when, session))
			if (conditionalOptions) {
				resolvedField.options = conditionalOptions.options
			}

			const conditionalOverride = field.conditionalFieldOverrides?.find((entry) => evaluateCondition(entry.when, session))
			if (conditionalOverride) {
				if (conditionalOverride.allowedValueType !== undefined) {
					resolvedField.allowedValueType = conditionalOverride.allowedValueType
				}
				if (conditionalOverride.required !== undefined) {
					resolvedField.required = conditionalOverride.required
				}
				if (conditionalOverride.selectionCardinality !== undefined) {
					resolvedField.selectionCardinality = conditionalOverride.selectionCardinality
				}
				if (conditionalOverride.selectionCount !== undefined) {
					resolvedField.selectionCount = conditionalOverride.selectionCount
				}
				if (conditionalOverride.minimumSelectionCount !== undefined) {
					resolvedField.minimumSelectionCount = conditionalOverride.minimumSelectionCount
				}
				if (conditionalOverride.contentMarkdown !== undefined) {
					resolvedField.contentMarkdown = conditionalOverride.contentMarkdown
				}
			}

			return resolvedField
		})
}

function normalizeWorkflowFormSubmissionFields(fields: WorkflowFormFieldSubmission[]): WorkflowFormSessionValues {
	return fields.reduce<WorkflowFormSessionValues>((accumulator, field) => {
		if (!field.key) {
			return accumulator
		}

		const normalizedValue = normalizeWorkflowFormSubmittedValue(field.value)
		if (!normalizedValue) {
			return accumulator
		}

		accumulator[field.key] = normalizedValue
		return accumulator
	}, {})
}

function getKnownPanelField(panel: WorkflowFormPanelDefinition, key: string): WorkflowFormFieldDefinition | undefined {
	return panel.fields.find((field) => field.key === key)
}

function validateStructuredValueShape(
	field: WorkflowFormFieldDefinition,
	value: WorkflowFormSubmittedValuePayload | undefined,
): boolean {
	if (!value) {
		return field.required !== true
	}

	switch (field.kind) {
		case "boolean":
			return value.valueType === "boolean"
		case "number":
			if (field.allowedValueType === "integer") {
				return value.valueType === "integer"
			}
			return value.valueType === "number" || value.valueType === "integer"
		case "small_text":
			return value.valueType === (field.allowedValueType ?? "string")
		case "large_text":
			return value.valueType === (field.allowedValueType ?? "string")
		case "dropdown":
		case "radio_group":
			if ((field.selectionCardinality ?? "single") === "single") {
				return value.valueType === "string"
			}
			return isStrictStringArrayValue(value)
		case "multi_select":
		case "checkbox_group":
			return isStrictStringArrayValue(value)
		case "date":
			return value.valueType === "string" && isValidDateValue(value.stringValue)
		case "date_time":
			return value.valueType === "string" && isValidDateTimeValue(value.stringValue)
		case "file_path":
		case "directory_path":
		case "artifact_picker":
			return value.valueType === "string" && isValidSingleLinePathValue(value.stringValue)
		case "markdown_display":
		case "static_notice":
			return value === undefined
		default:
			return false
	}
}

function getStringArrayValues(value: WorkflowFormSubmittedValuePayload | undefined): string[] {
	if (!value || value.valueType !== "array") {
		return []
	}

	return (value.arrayValue ?? [])
		.filter((entry): entry is WorkflowFormSubmittedValuePayload => entry.valueType === "string")
		.map((entry) => entry.stringValue ?? "")
}

function isStrictStringArrayValue(value: WorkflowFormSubmittedValuePayload | undefined): boolean {
	return value?.valueType === "array" && (value.arrayValue ?? []).every((entry) => entry.valueType === "string")
}

function isValidDateValue(value: string | undefined): boolean {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false
	}

	const [year, month, day] = value.split("-").map((segment) => Number.parseInt(segment, 10))
	const date = new Date(Date.UTC(year, month - 1, day))

	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isValidDateTimeValue(value: string | undefined): boolean {
	return typeof value === "string" && value.includes("T") && Number.isFinite(Date.parse(value))
}

function isValidSingleLinePathValue(value: string | undefined): boolean {
	return typeof value === "string" && value.trim().length > 0 && !value.includes("\n") && !value.includes("\r")
}

function assertCompatibleAllowedValueType(args: {
	kind: WorkflowFormFieldKind
	allowedValueType?: WorkflowFormAllowedValueType
	selectionCardinality?: WorkflowFormFieldDefinition["selectionCardinality"]
}): void {
	const { kind, allowedValueType } = args
	const selectionCardinality = args.selectionCardinality ?? "single"

	let isCompatible = false
	switch (kind) {
		case "boolean":
			isCompatible = allowedValueType === undefined || allowedValueType === "boolean"
			break
		case "number":
			isCompatible = allowedValueType === "integer" || allowedValueType === "number"
			break
		case "small_text":
			isCompatible = allowedValueType === undefined || allowedValueType === "string" || allowedValueType === "integer"
			break
		case "large_text":
			isCompatible =
				allowedValueType === undefined ||
				allowedValueType === "string" ||
				allowedValueType === "array" ||
				allowedValueType === "object"
			break
		case "dropdown":
			isCompatible =
				(selectionCardinality === "single" && (allowedValueType === undefined || allowedValueType === "string")) ||
				((selectionCardinality === "fixed_count" || selectionCardinality === "unbounded") &&
					(allowedValueType === undefined || allowedValueType === "array"))
			break
		case "radio_group":
			isCompatible = allowedValueType === undefined || allowedValueType === "string"
			break
		case "multi_select":
		case "checkbox_group":
			isCompatible = allowedValueType === undefined || allowedValueType === "array"
			break
		case "date":
		case "date_time":
		case "file_path":
		case "directory_path":
		case "artifact_picker":
			isCompatible = allowedValueType === undefined || allowedValueType === "string"
			break
		case "markdown_display":
		case "static_notice":
			isCompatible = allowedValueType === undefined
			break
		default:
			isCompatible = false
	}

	if (!isCompatible) {
		throw new Error(
			`Workflow form definition declares an unsupported allowed value type for field kind "${kind}": ${allowedValueType}`,
		)
	}
}

function validateSelectionRules(
	field: WorkflowFormFieldDefinition,
	value: WorkflowFormSubmittedValuePayload | undefined,
): boolean {
	const allowedOptionValues = new Set((field.options ?? []).map((option) => option.value))

	if (field.kind === "dropdown" || field.kind === "radio_group") {
		if ((field.selectionCardinality ?? "single") === "single") {
			if (!value || value.valueType !== "string") {
				return field.required !== true
			}
			return allowedOptionValues.size === 0 || allowedOptionValues.has(value.stringValue ?? "")
		}

		const selections = getStringArrayValues(value)
		if (allowedOptionValues.size > 0 && selections.some((selection) => !allowedOptionValues.has(selection))) {
			return false
		}

		if (field.selectionCardinality === "fixed_count" && selections.length !== field.selectionCount) {
			return false
		}

		return selections.length > 0 || field.required !== true
	}

	if (field.kind === "multi_select" || field.kind === "checkbox_group") {
		const selections = getStringArrayValues(value)
		if (allowedOptionValues.size > 0 && selections.some((selection) => !allowedOptionValues.has(selection))) {
			return false
		}

		if (field.minimumSelectionCount !== undefined && selections.length < field.minimumSelectionCount) {
			return false
		}

		if (field.selectionCardinality === "fixed_count" && selections.length !== field.selectionCount) {
			return false
		}

		return selections.length > 0 || field.required !== true
	}

	return true
}

function hasRenderableValue(value: WorkflowFormSubmittedValuePayload | undefined): boolean {
	if (!value) {
		return false
	}

	switch (value.valueType) {
		case "string":
			return (value.stringValue ?? "").trim().length > 0
		case "boolean":
			return value.booleanValue !== undefined
		case "integer":
			return value.integerValue !== undefined
		case "number":
			return value.numberValue !== undefined
		case "array":
			return (value.arrayValue ?? []).length > 0
		case "object":
			return (value.objectValue ?? []).length > 0
		default:
			return false
	}
}

function validateOneOfGroupRequirements(fields: WorkflowFormFieldDefinition[], values: WorkflowFormSessionValues): boolean {
	const groupedFields = fields.reduce<Map<string, WorkflowFormFieldDefinition[]>>((groups, field) => {
		if (!field.oneOfGroupId || !isInputField(field)) {
			return groups
		}

		const groupFields = groups.get(field.oneOfGroupId) ?? []
		groupFields.push(field)
		groups.set(field.oneOfGroupId, groupFields)
		return groups
	}, new Map())

	for (const groupFields of groupedFields.values()) {
		if (groupFields.some((field) => hasRenderableValue(values[field.key]))) {
			continue
		}

		return false
	}

	return true
}

function applyFieldResetRules(
	panel: WorkflowFormPanelDefinition,
	previousValues: WorkflowFormSessionValues,
	nextValues: WorkflowFormSessionValues,
	data: WorkflowFormSessionData,
): { values: WorkflowFormSessionValues; data: WorkflowFormSessionData } {
	const updatedValues = { ...nextValues }
	const updatedData = { ...data }

	for (const field of panel.fields) {
		if (!field.resetValueKeysOnChange?.length && !field.resetDataKeysOnChange?.length) {
			continue
		}

		if (submittedValuesEqual(previousValues[field.key], nextValues[field.key])) {
			continue
		}

		for (const key of field.resetValueKeysOnChange ?? []) {
			delete updatedValues[key]
		}

		for (const key of field.resetDataKeysOnChange ?? []) {
			delete updatedData[key]
		}
	}

	return {
		values: updatedValues,
		data: updatedData,
	}
}

function clearDeclaredKeys(
	values: WorkflowFormSessionValues,
	data: WorkflowFormSessionData,
	valueKeys: string[] | undefined,
	dataKeys: string[] | undefined,
): { values: WorkflowFormSessionValues; data: WorkflowFormSessionData } {
	const nextValues = { ...values }
	const nextData = { ...data }

	for (const key of valueKeys ?? []) {
		delete nextValues[key]
	}

	for (const key of dataKeys ?? []) {
		delete nextData[key]
	}

	return {
		values: nextValues,
		data: nextData,
	}
}

function resolveTransitionOutcome(
	transition: WorkflowFormTransitionDefinition,
	session: Pick<WorkflowFormSessionState, "values" | "data">,
): {
	nextPanelId?: string
	operationId?: string
	terminal?: boolean
	resultDataKey?: string
	rebuildDefinitionAfterSuccess: boolean
	recomputeDestinationAfterSuccess: boolean
	staleValueKeysToClear?: string[]
	staleDataKeysToClear?: string[]
} {
	switch (transition.type) {
		case "sequential":
			return {
				nextPanelId: transition.nextPanelId,
				rebuildDefinitionAfterSuccess: false,
				recomputeDestinationAfterSuccess: false,
				staleValueKeysToClear: transition.staleValueKeysToClear,
				staleDataKeysToClear: transition.staleDataKeysToClear,
			}
		case "deterministic_operation":
			return {
				nextPanelId: transition.nextPanelId,
				operationId: transition.operationId,
				terminal: transition.terminal,
				resultDataKey: transition.resultDataKey,
				rebuildDefinitionAfterSuccess: transition.rebuildDefinitionAfterSuccess ?? false,
				recomputeDestinationAfterSuccess: transition.recomputeDestinationAfterSuccess ?? false,
				staleValueKeysToClear: transition.staleValueKeysToClear,
				staleDataKeysToClear: transition.staleDataKeysToClear,
			}
		case "conditional": {
			const sourceValue = resolveComparableSourceValue(session, transition.conditionSourceKey)
			const branch = transition.branches.find((entry) => sourceValue === entry.matchValue)
			if (!branch) {
				return {
					nextPanelId: transition.defaultNextPanelId,
					operationId: transition.defaultOperationId,
					terminal: transition.defaultTerminal,
					rebuildDefinitionAfterSuccess: false,
					recomputeDestinationAfterSuccess: false,
				}
			}

			return {
				nextPanelId: branch.nextPanelId,
				operationId: branch.operationId,
				terminal: branch.terminal,
				rebuildDefinitionAfterSuccess: false,
				recomputeDestinationAfterSuccess: false,
				staleValueKeysToClear: branch.staleValueKeysToClear,
				staleDataKeysToClear: branch.staleDataKeysToClear,
			}
		}
	}
}

function collectPathToCurrentPanel(
	definition: WorkflowFormDefinitionPayload,
	session: Pick<WorkflowFormSessionState, "firstPanelId" | "currentPanelId" | "values" | "data">,
): string[] {
	const visited = new Set<string>()
	const path = [session.firstPanelId]

	while (path[path.length - 1] !== session.currentPanelId) {
		const currentPanelId = path[path.length - 1]
		if (visited.has(currentPanelId)) {
			break
		}
		visited.add(currentPanelId)

		const panel = definition.panels[currentPanelId]
		if (!panel) {
			break
		}

		const transitionOutcome = resolveTransitionOutcome(panel.transition, session)
		if (!transitionOutcome.nextPanelId || transitionOutcome.terminal === true) {
			break
		}

		path.push(transitionOutcome.nextPanelId)
	}

	return path
}

export class WorkflowFormRuntime {
	constructor(private readonly resolvers: Record<string, WorkflowFormResolverDefinition> = workflowFormRegistry) {}

	createSession(options: WorkflowFormRuntimeCreateSessionOptions): WorkflowFormSessionState {
		this.validateDefinition(options.definitionPayload)

		return {
			sessionId: randomUUID(),
			resolverId: options.resolverId,
			triggerSource: options.triggerSource,
			owner: options.owner,
			definitionVersion: 2,
			definitionPayload: options.definitionPayload,
			firstPanelId: options.definitionPayload.firstPanelId,
			currentPanelId: options.definitionPayload.firstPanelId,
			values: {},
			data: {},
		}
	}

	private resolvePanelPayload(session: WorkflowFormSessionState, panelId: string): WorkflowFormResolvedPanelPayload {
		const panel = this.getPanel(session.definitionPayload, panelId)

		return {
			panelId: panel.panelId,
			title: panel.title,
			promptMarkdown: panel.promptMarkdown,
			fields: resolvePanelFields(panel, session),
			allowedActions: panel.allowedActions,
			actionLabels: panel.actionLabels,
		}
	}

	buildPayload(session: WorkflowFormSessionState): ClineWorkflowForm {
		const panelId = session.failure?.panelId ?? session.currentPanelId

		return buildWorkflowFormPayload({
			session,
			definition: session.definitionPayload,
			panel: this.resolvePanelPayload(session, panelId),
			errorMessage: session.failure?.errorMessage,
		})
	}

	buildFailurePayload(session: WorkflowFormSessionState, errorMessage: string, panelId?: string): ClineWorkflowForm {
		const resolvedPanelId = panelId ?? session.failure?.panelId ?? session.currentPanelId

		return buildWorkflowFormPayload({
			session,
			definition: session.definitionPayload,
			panel: this.resolvePanelPayload(session, resolvedPanelId),
			errorMessage,
		})
	}

	buildRetryPayload(session: WorkflowFormSessionState, errorMessage: string): ClineWorkflowForm {
		return this.buildFailurePayload(session, errorMessage)
	}

	buildSuccessPayload(session: WorkflowFormSessionState, successMessage: string): ClineWorkflowForm {
		return buildWorkflowFormPayload({
			session,
			definition: session.definitionPayload,
			success: true,
			successMessage,
		})
	}

	handleSubmission(session: WorkflowFormSessionState, request: WorkflowFormSubmissionRequest): WorkflowFormRuntimeOutcome {
		if (request.panelId !== session.currentPanelId) {
			throw new Error(
				`Workflow form submission panel mismatch: expected ${session.currentPanelId}, received ${request.panelId}`,
			)
		}

		const activePanel = this.getPanel(session.definitionPayload, session.currentPanelId)
		const submittedValues = normalizeWorkflowFormSubmissionFields(request.fields)

		for (const submittedKey of Object.keys(submittedValues)) {
			const knownField = getKnownPanelField(activePanel, submittedKey)
			if (!knownField) {
				throw new Error(`Workflow form submission referenced an unknown field: ${submittedKey}`)
			}
		}

		const mergedValues = { ...session.values }
		for (const field of activePanel.fields.filter((entry) => isInputField(entry))) {
			if (submittedValues[field.key]) {
				mergedValues[field.key] = submittedValues[field.key]
			} else if (!(field.key in submittedValues)) {
				delete mergedValues[field.key]
			}
		}

		let nextSession: WorkflowFormSessionState = {
			...session,
			values: mergedValues,
			failure: undefined,
		}

		const resolvedFields = resolvePanelFields(activePanel, nextSession)
		for (const submittedKey of Object.keys(submittedValues)) {
			const resolvedField = resolvedFields.find((field) => field.key === submittedKey)
			if (!resolvedField || !isInputField(resolvedField)) {
				throw new Error(`Workflow form submission referenced an inactive field: ${submittedKey}`)
			}
		}

		if (request.action === WorkflowFormAction.SUBMIT) {
			for (const field of resolvedFields) {
				const submittedValue = nextSession.values[field.key]
				if (!isInputField(field)) {
					if (submittedValue && field.key in submittedValues) {
						throw new Error(`Workflow form non-input fields cannot accept submissions: ${field.key}`)
					}
					continue
				}

				if (submittedValue && !validateStructuredValueShape(field, submittedValue)) {
					return this.renderFailure(nextSession, activePanel.panelId, `Field "${field.key}" has an invalid value.`)
				}

				if (
					submittedValue &&
					field.valueSchema &&
					!validateWorkflowFormSubmittedValueAgainstSchema(submittedValue, field.valueSchema)
				) {
					return this.renderFailure(nextSession, activePanel.panelId, `Field "${field.key}" has an invalid value.`)
				}

				if (field.required && !hasRenderableValue(submittedValue)) {
					return this.renderFailure(nextSession, activePanel.panelId, `Field "${field.key}" is required.`)
				}

				if (submittedValue && !validateSelectionRules(field, submittedValue)) {
					return this.renderFailure(
						nextSession,
						activePanel.panelId,
						`Field "${field.key}" does not satisfy the declared selection rules.`,
					)
				}
			}

			if (!validateOneOfGroupRequirements(resolvedFields, nextSession.values)) {
				return this.renderFailure(
					nextSession,
					activePanel.panelId,
					"Provide at least one of the allowed alternative inputs before submitting.",
				)
			}
		}

		const resetResult = applyFieldResetRules(activePanel, session.values, nextSession.values, nextSession.data)
		nextSession = {
			...nextSession,
			values: resetResult.values,
			data: resetResult.data,
		}

		const allowedActions = new Set(activePanel.allowedActions)
		if (request.action === WorkflowFormAction.SUBMIT && !allowedActions.has("submit")) {
			return {
				kind: "render_form",
				session: nextSession,
				payload: this.buildPayload(nextSession),
			}
		}
		if (request.action === WorkflowFormAction.CANCEL && !allowedActions.has("cancel")) {
			return {
				kind: "render_form",
				session: nextSession,
				payload: this.buildPayload(nextSession),
			}
		}
		if (request.action === WorkflowFormAction.BACK && !allowedActions.has("back")) {
			return {
				kind: "render_form",
				session: nextSession,
				payload: this.buildPayload(nextSession),
			}
		}
		if (request.action === WorkflowFormAction.RETRY && (!session.failure || !allowedActions.has("retry"))) {
			return {
				kind: "render_form",
				session: nextSession,
				payload: this.buildPayload(nextSession),
			}
		}

		if (request.action === WorkflowFormAction.CANCEL) {
			return {
				kind: "fallback_to_agent",
				session: nextSession,
			}
		}

		if (request.action === WorkflowFormAction.BACK) {
			return this.handleBack(nextSession, activePanel)
		}

		if (request.action === WorkflowFormAction.RETRY) {
			return this.handleRetry(nextSession)
		}

		if (request.action !== WorkflowFormAction.SUBMIT) {
			return {
				kind: "render_form",
				session: nextSession,
				payload: this.buildPayload(nextSession),
			}
		}

		const transitionOutcome = resolveTransitionOutcome(activePanel.transition, nextSession)
		const clearedAfterTransition = clearDeclaredKeys(
			nextSession.values,
			nextSession.data,
			transitionOutcome.staleValueKeysToClear,
			transitionOutcome.staleDataKeysToClear,
		)
		nextSession = {
			...nextSession,
			values: clearedAfterTransition.values,
			data: clearedAfterTransition.data,
		}

		if (transitionOutcome.operationId) {
			const rebuiltSession = this.rebuildSessionDefinition(nextSession)
			return {
				kind: "invoke_deterministic_operation",
				session: rebuiltSession,
				operationId: transitionOutcome.operationId,
				nextPanelId: transitionOutcome.nextPanelId,
				terminal: transitionOutcome.terminal,
				resultDataKey: transitionOutcome.resultDataKey,
				rebuildDefinitionAfterSuccess: transitionOutcome.rebuildDefinitionAfterSuccess,
				recomputeDestinationAfterSuccess: transitionOutcome.recomputeDestinationAfterSuccess,
			}
		}

		if (!transitionOutcome.nextPanelId) {
			throw new Error(`Workflow form panel "${activePanel.panelId}" did not resolve to a next panel or operation.`)
		}

		const rebuiltSession = this.rebuildSessionDefinition({
			...nextSession,
			currentPanelId: transitionOutcome.nextPanelId,
		})

		return {
			kind: "render_form",
			session: rebuiltSession,
			payload: this.buildPayload(rebuiltSession),
		}
	}

	continueAfterDeterministicOperation(args: {
		session: WorkflowFormSessionState
		nextPanelId?: string
		rebuildDefinitionAfterSuccess: boolean
		recomputeDestinationAfterSuccess: boolean
	}):
		| Extract<WorkflowFormRuntimeOutcome, { kind: "render_form" }>
		| Extract<WorkflowFormRuntimeOutcome, { kind: "invoke_deterministic_operation" }> {
		const continuationBaseSession = args.rebuildDefinitionAfterSuccess
			? this.rebuildSessionDefinition(args.session)
			: args.session

		let nextPanelId = args.nextPanelId
		let values = continuationBaseSession.values
		let data = continuationBaseSession.data
		let continuationOperationId: string | undefined
		let continuationTerminal: boolean | undefined
		let continuationResultDataKey: string | undefined
		let continuationRebuildDefinitionAfterSuccess = false
		let continuationRecomputeDestinationAfterSuccess = false

		if (args.recomputeDestinationAfterSuccess) {
			const activePanel = this.getPanel(continuationBaseSession.definitionPayload, continuationBaseSession.currentPanelId)
			const recomputedOutcome = resolveTransitionOutcome(activePanel.transition, continuationBaseSession)
			nextPanelId = recomputedOutcome.nextPanelId
			continuationOperationId = recomputedOutcome.operationId
			continuationTerminal = recomputedOutcome.terminal
			continuationResultDataKey = recomputedOutcome.resultDataKey
			continuationRebuildDefinitionAfterSuccess = recomputedOutcome.rebuildDefinitionAfterSuccess
			continuationRecomputeDestinationAfterSuccess = recomputedOutcome.recomputeDestinationAfterSuccess

			const clearedAfterRecompute = clearDeclaredKeys(
				values,
				data,
				recomputedOutcome.staleValueKeysToClear,
				recomputedOutcome.staleDataKeysToClear,
			)
			values = clearedAfterRecompute.values
			data = clearedAfterRecompute.data
		}

		const rebuiltSession = this.rebuildSessionDefinition({
			...continuationBaseSession,
			values,
			data,
			failure: undefined,
		})

		if (continuationOperationId) {
			return {
				kind: "invoke_deterministic_operation",
				session: rebuiltSession,
				operationId: continuationOperationId,
				nextPanelId,
				terminal: continuationTerminal,
				resultDataKey: continuationResultDataKey,
				rebuildDefinitionAfterSuccess: continuationRebuildDefinitionAfterSuccess,
				recomputeDestinationAfterSuccess: continuationRecomputeDestinationAfterSuccess,
			}
		}

		if (!nextPanelId) {
			throw new Error(
				`Workflow form deterministic operation did not resolve to a next panel: ${continuationBaseSession.currentPanelId}`,
			)
		}

		return {
			kind: "render_form",
			session: {
				...rebuiltSession,
				currentPanelId: nextPanelId,
			},
			payload: this.buildPayload({
				...rebuiltSession,
				currentPanelId: nextPanelId,
			}),
		}
	}

	private handleBack(session: WorkflowFormSessionState, activePanel: WorkflowFormPanelDefinition): WorkflowFormRuntimeOutcome {
		if (session.currentPanelId === session.firstPanelId) {
			return {
				kind: "render_form",
				session,
				payload: this.buildPayload(session),
			}
		}

		const priorPanelId =
			activePanel.backDestinationPanelId ??
			collectPathToCurrentPanel(session.definitionPayload, session).slice(-2, -1)[0] ??
			session.firstPanelId
		const cleared = clearDeclaredKeys(
			session.values,
			session.data,
			activePanel.backStaleValueKeysToClear,
			activePanel.backStaleDataKeysToClear,
		)
		const nextSession = this.rebuildSessionDefinition({
			...session,
			currentPanelId: priorPanelId,
			values: cleared.values,
			data: cleared.data,
			failure: undefined,
		})

		return {
			kind: "render_form",
			session: nextSession,
			payload: this.buildPayload(nextSession),
		}
	}

	private handleRetry(session: WorkflowFormSessionState): WorkflowFormRuntimeOutcome {
		const firstPanel = this.getPanel(session.definitionPayload, session.firstPanelId)
		const firstPanelFieldKeys = new Set(firstPanel.fields.filter((field) => isInputField(field)).map((field) => field.key))
		const retainedValues = Object.fromEntries(Object.entries(session.values).filter(([key]) => firstPanelFieldKeys.has(key)))
		const nextSession = this.rebuildSessionDefinition({
			...session,
			currentPanelId: session.firstPanelId,
			values: retainedValues,
			data: {},
			failure: undefined,
		})

		return {
			kind: "render_form",
			session: nextSession,
			payload: this.buildPayload(nextSession),
		}
	}

	private renderFailure(session: WorkflowFormSessionState, panelId: string, errorMessage: string): WorkflowFormRuntimeOutcome {
		const failureSession = this.rebuildSessionDefinition({
			...session,
			failure: {
				panelId,
				errorMessage,
			},
		})

		return {
			kind: "render_form",
			session: failureSession,
			payload: this.buildFailurePayload(failureSession, errorMessage, panelId),
		}
	}

	private buildValidatedDefinition(session: WorkflowFormSessionState): WorkflowFormDefinitionPayload {
		const resolver = this.getResolver(session.resolverId)
		const definition = resolver.buildDefinition(session)
		this.validateDefinition(definition)
		return definition
	}

	private rebuildSessionDefinition(session: WorkflowFormSessionState): WorkflowFormSessionState {
		const definitionPayload = this.buildValidatedDefinition(session)
		if (!definitionPayload.panels[session.currentPanelId]) {
			throw new Error(`Workflow form definition is missing the panel: ${session.currentPanelId}`)
		}

		return {
			...session,
			definitionVersion: 2,
			definitionPayload,
			firstPanelId: definitionPayload.firstPanelId,
		}
	}

	private validateDefinition(definition: WorkflowFormDefinitionPayload): void {
		if (!definition.firstPanelId || !definition.panels[definition.firstPanelId]) {
			throw new Error("Workflow form definition must declare an existing first panel.")
		}

		for (const panel of Object.values(definition.panels)) {
			if (!definition.panels[panel.panelId]) {
				throw new Error(`Workflow form definition is missing the declared panel entry: ${panel.panelId}`)
			}

			if (panel.backDestinationPanelId && !definition.panels[panel.backDestinationPanelId]) {
				throw new Error(
					`Workflow form definition references a nonexistent destination panel: ${panel.backDestinationPanelId}`,
				)
			}

			for (const field of panel.fields) {
				if (!isSupportedFieldKind(field.kind)) {
					throw new Error(`Workflow form definition declares an unsupported field kind: ${field.kind}`)
				}

				if (field.allowedValueType && !isSupportedAllowedValueType(field.allowedValueType)) {
					throw new Error(
						`Workflow form definition declares an unsupported allowed value type: ${field.allowedValueType}`,
					)
				}

				assertCompatibleAllowedValueType(field)

				if (field.kind === "dropdown") {
					const cardinality = field.selectionCardinality ?? "single"
					if (!["single", "fixed_count", "unbounded"].includes(cardinality)) {
						throw new Error(`Workflow form definition declares an invalid dropdown cardinality: ${cardinality}`)
					}
					if (cardinality === "fixed_count" && (!field.selectionCount || field.selectionCount < 1)) {
						throw new Error("Workflow form definition declares an invalid dropdown cardinality: fixed_count")
					}
				}

				for (const override of field.conditionalFieldOverrides ?? []) {
					if (override.allowedValueType && !isSupportedAllowedValueType(override.allowedValueType)) {
						throw new Error(
							`Workflow form definition declares an unsupported allowed value type: ${override.allowedValueType}`,
						)
					}

					assertCompatibleAllowedValueType({
						kind: field.kind,
						allowedValueType: override.allowedValueType ?? field.allowedValueType,
						selectionCardinality: override.selectionCardinality ?? field.selectionCardinality,
					})
				}
			}

			this.validateTransitionDestinations(definition, panel.transition)
		}
	}

	private validateTransitionDestinations(
		definition: WorkflowFormDefinitionPayload,
		transition: WorkflowFormTransitionDefinition,
	): void {
		if (transition.type === "sequential" && !definition.panels[transition.nextPanelId]) {
			throw new Error(`Workflow form definition references a nonexistent destination panel: ${transition.nextPanelId}`)
		}

		if (
			transition.type === "deterministic_operation" &&
			transition.nextPanelId &&
			!definition.panels[transition.nextPanelId]
		) {
			throw new Error(`Workflow form definition references a nonexistent destination panel: ${transition.nextPanelId}`)
		}

		if (transition.type === "conditional") {
			for (const branch of transition.branches) {
				if (branch.nextPanelId && !definition.panels[branch.nextPanelId]) {
					throw new Error(`Workflow form definition references a nonexistent destination panel: ${branch.nextPanelId}`)
				}
			}

			if (transition.defaultNextPanelId && !definition.panels[transition.defaultNextPanelId]) {
				throw new Error(
					`Workflow form definition references a nonexistent destination panel: ${transition.defaultNextPanelId}`,
				)
			}
		}
	}

	private getPanel(definition: WorkflowFormDefinitionPayload, panelId: string): WorkflowFormPanelDefinition {
		const panel = definition.panels[panelId]
		if (!panel) {
			throw new Error(`Workflow form definition is missing the panel: ${panelId}`)
		}

		return panel
	}

	private getResolver(resolverId: string): WorkflowFormResolverDefinition {
		const resolver = this.resolvers[resolverId]
		if (!resolver) {
			throw new Error(`Unknown workflow form resolver: ${resolverId}`)
		}

		return resolver
	}
}

export { normalizeWorkflowFormSubmissionFields }
