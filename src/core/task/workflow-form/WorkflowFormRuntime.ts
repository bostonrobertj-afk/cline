import type { ClineWorkflowForm, WorkflowFormFieldDefinition, WorkflowFormFieldValuePayload } from "@shared/ExtensionMessage"
import {
	WorkflowFormAction,
	type WorkflowFormFieldSubmission,
	type WorkflowFormSubmissionRequest,
} from "@shared/proto/cline/task"
import { randomUUID } from "crypto"
import { buildWorkflowFormPayload } from "./buildWorkflowFormPayload"
import { parseWorkflowFormRawValue } from "./schema"
import type {
	WorkflowFormResolverDefinition,
	WorkflowFormRuntimeCreateSessionOptions,
	WorkflowFormRuntimeOutcome,
	WorkflowFormSessionState,
	WorkflowFormValues,
} from "./types"
import { workflowFormRegistry } from "./WorkflowFormRegistry"

function hasWorkflowFormValue(field: WorkflowFormFieldDefinition, value: WorkflowFormFieldValuePayload | undefined): boolean {
	return parseWorkflowFormRawValue(value?.rawValue, field.valueSchema) !== undefined
}

function getCurrentPageFields(session: WorkflowFormSessionState, resolver: WorkflowFormResolverDefinition) {
	const definition = resolver.buildDefinition(session)
	const page = session.phase === "success" ? undefined : definition.pages[session.phase]
	return page?.fields ?? []
}

function areRequiredWorkflowFormFieldsSatisfied(values: WorkflowFormValues, fields: WorkflowFormFieldDefinition[]): boolean {
	return fields.filter((field) => field.required).every((field) => hasWorkflowFormValue(field, values[field.key]))
}

function areOneOfWorkflowFormGroupsSatisfied(values: WorkflowFormValues, fields: WorkflowFormFieldDefinition[]): boolean {
	const groupedKeys = fields.reduce<Record<string, string[]>>((acc, field) => {
		if (!field.oneOfGroupId) {
			return acc
		}
		acc[field.oneOfGroupId] ??= []
		acc[field.oneOfGroupId].push(field.key)
		return acc
	}, {})

	return Object.values(groupedKeys).every((groupKeys) =>
		groupKeys.some((key) => {
			const field = fields.find((entry) => entry.key === key)
			return field ? hasWorkflowFormValue(field, values[key]) : false
		}),
	)
}

function buildValuesFromSubmissions(fields: WorkflowFormFieldSubmission[]): WorkflowFormValues {
	return fields.reduce<WorkflowFormValues>((accumulator, field) => {
		if (!field.key || !field.value) {
			return accumulator
		}

		accumulator[field.key] = { rawValue: field.value.rawValue }
		return accumulator
	}, {})
}

export class WorkflowFormRuntime {
	constructor(private readonly resolvers: Record<string, WorkflowFormResolverDefinition> = workflowFormRegistry) {}

	createSession(options: WorkflowFormRuntimeCreateSessionOptions): WorkflowFormSessionState {
		const resolver = this.getResolver(options.resolverId)
		const initialPhase = options.initialPhase ?? resolver.defaultInitialPhase ?? "confirm"

		return {
			sessionId: randomUUID(),
			resolverId: options.resolverId,
			triggerSource: options.triggerSource,
			owner: options.owner,
			phase: initialPhase,
			initialPhase,
			values: {},
			context: options.context,
		}
	}

	buildPayload(session: WorkflowFormSessionState): ClineWorkflowForm {
		const resolver = this.getResolver(session.resolverId)
		const definition = resolver.buildDefinition(session)

		return buildWorkflowFormPayload({
			session,
			definition,
			automaticStatusState: definition.presentation?.kind === "automatic_status" ? "pending" : undefined,
		})
	}

	buildRetryPayload(session: WorkflowFormSessionState, errorMessage: string): ClineWorkflowForm {
		const retrySession: WorkflowFormSessionState = {
			...session,
			phase: "retry_error",
			lastError: errorMessage,
		}
		const resolver = this.getResolver(retrySession.resolverId)
		const definition = resolver.buildDefinition(retrySession)

		return buildWorkflowFormPayload({
			session: retrySession,
			definition,
			errorMessage,
		})
	}

	buildSuccessPayload(session: WorkflowFormSessionState, successMessage: string): ClineWorkflowForm {
		const resolver = this.getResolver(session.resolverId)
		const successSession = { ...session, phase: "success" as const }
		const definition = resolver.buildDefinition(successSession)

		return buildWorkflowFormPayload({
			session: successSession,
			definition,
			automaticStatusState: definition.presentation?.kind === "automatic_status" ? "success" : undefined,
			successMessage,
		})
	}

	buildFailurePayload(session: WorkflowFormSessionState): ClineWorkflowForm {
		const resolver = this.getResolver(session.resolverId)
		const failureSession = { ...session, phase: "success" as const }
		const definition = resolver.buildDefinition(failureSession)

		return buildWorkflowFormPayload({
			session: failureSession,
			definition,
			automaticStatusState: "failure",
		})
	}

	handleSubmission(session: WorkflowFormSessionState, request: WorkflowFormSubmissionRequest): WorkflowFormRuntimeOutcome {
		const resolver = this.getResolver(session.resolverId)
		const nextValues = {
			...session.values,
			...buildValuesFromSubmissions(request.fields),
		}

		if (request.action === WorkflowFormAction.CANCEL) {
			return {
				kind: "fallback_to_agent",
				session: {
					...session,
					values: nextValues,
				},
			}
		}

		if (session.phase === "confirm") {
			const confirmValue = nextValues.confirm?.rawValue?.trim().toLowerCase()
			if (request.action === WorkflowFormAction.SUBMIT && confirmValue === "yes") {
				const definition = resolver.buildDefinition(session)
				const nextPhase = definition.pages.select_source
					? "select_source"
					: definition.pages.collect_inputs
						? "collect_inputs"
						: undefined
				if (!nextPhase) {
					throw new Error("Workflow form confirm phase requires a select_source or collect_inputs page.")
				}

				const nextSession: WorkflowFormSessionState = {
					...session,
					phase: nextPhase,
					values: nextValues,
					lastError: undefined,
				}

				return {
					kind: "render_form",
					session: nextSession,
					payload: this.buildPayload(nextSession),
				}
			}

			return {
				kind: "fallback_to_agent",
				session: {
					...session,
					values: nextValues,
				},
			}
		}

		if (session.phase === "select_source" && request.action === WorkflowFormAction.SUBMIT) {
			const sourceType = nextValues["source.type"]?.rawValue?.trim()
			if (!sourceType) {
				return {
					kind: "render_form",
					session: {
						...session,
						values: nextValues,
					},
					payload: this.buildPayload({
						...session,
						values: nextValues,
					}),
				}
			}

			const nextSession: WorkflowFormSessionState = {
				...session,
				phase: "collect_inputs",
				values: nextValues,
				lastError: undefined,
			}

			return {
				kind: "render_form",
				session: nextSession,
				payload: this.buildPayload(nextSession),
			}
		}

		if (
			(session.phase === "collect_inputs" || session.phase === "retry_error") &&
			request.action === WorkflowFormAction.SUBMIT
		) {
			const fields = getCurrentPageFields(session, resolver)
			if (!areRequiredWorkflowFormFieldsSatisfied(nextValues, fields)) {
				const nextSession: WorkflowFormSessionState = {
					...session,
					phase: "retry_error",
					values: nextValues,
					lastError: "required fields are missing input",
				}

				return {
					kind: "render_form",
					session: nextSession,
					payload: this.buildRetryPayload(nextSession, "required fields are missing input"),
				}
			}

			if (!areOneOfWorkflowFormGroupsSatisfied(nextValues, fields)) {
				const nextSession: WorkflowFormSessionState = {
					...session,
					phase: "retry_error",
					values: nextValues,
					lastError: "One-of fields require at least one field be completed prior to submitting",
				}

				return {
					kind: "render_form",
					session: nextSession,
					payload: this.buildRetryPayload(
						nextSession,
						"One-of fields require at least one field be completed prior to submitting",
					),
				}
			}

			const nextSession: WorkflowFormSessionState = {
				...session,
				phase: session.phase,
				values: nextValues,
				lastError: undefined,
			}

			return {
				kind: "invoke_tool",
				session: nextSession,
				...resolver.buildToolExecutionRequest(nextSession, nextValues),
			}
		}

		if (session.phase === "retry_error" && request.action === WorkflowFormAction.RETRY) {
			const restartPhase = session.initialPhase === "collect_inputs" ? "collect_inputs" : "select_source"
			if (restartPhase === "collect_inputs") {
				const pageFields = getCurrentPageFields(session, resolver)
				const placeholderFieldKeys = pageFields.map((field) => field.key)
				const nextSession: WorkflowFormSessionState = {
					...session,
					phase: "collect_inputs",
					values: Object.fromEntries(
						Object.entries(session.values).filter(([key]) => placeholderFieldKeys.includes(key)),
					),
					lastError: undefined,
				}

				return {
					kind: "render_form",
					session: nextSession,
					payload: this.buildPayload(nextSession),
				}
			}

			const confirmValue = session.values.confirm
			const nextSession: WorkflowFormSessionState = {
				...session,
				phase: "select_source",
				values: confirmValue ? { confirm: confirmValue } : {},
				lastError: undefined,
			}

			return {
				kind: "render_form",
				session: nextSession,
				payload: this.buildPayload(nextSession),
			}
		}

		return {
			kind: "render_form",
			session,
			payload: this.buildPayload(session),
		}
	}

	private getResolver(resolverId: string): WorkflowFormResolverDefinition {
		const resolver = this.resolvers[resolverId]
		if (!resolver) {
			throw new Error(`Unknown workflow form resolver: ${resolverId}`)
		}

		return resolver
	}
}

export function normalizeWorkflowFormSubmissionFields(fields: WorkflowFormFieldSubmission[]): WorkflowFormValues {
	return buildValuesFromSubmissions(fields)
}
