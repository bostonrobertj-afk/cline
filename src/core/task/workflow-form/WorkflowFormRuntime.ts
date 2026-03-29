import type { ClineWorkflowForm, WorkflowFormFieldValuePayload } from "@shared/ExtensionMessage"
import {
	WorkflowFormAction,
	type WorkflowFormFieldSubmission,
	type WorkflowFormSubmissionRequest,
} from "@shared/proto/cline/task"
import { randomUUID } from "crypto"
import { readFileSync } from "fs"
import path from "path"
import type {
	WorkflowFormResolverDefinition,
	WorkflowFormRuntimeCreateSessionOptions,
	WorkflowFormRuntimeOutcome,
	WorkflowFormSessionState,
	WorkflowFormValues,
} from "./types"
import { workflowFormRegistry } from "./WorkflowFormRegistry"

function defaultReadToolDictionaryMarkdown(relativePath: string): string {
	return readFileSync(path.resolve(process.cwd(), relativePath), "utf8")
}

function buildValuesFromSubmissions(fields: WorkflowFormFieldSubmission[]): WorkflowFormValues {
	return fields.reduce<WorkflowFormValues>((accumulator, field) => {
		if (!field.key || !field.value) {
			return accumulator
		}

		const normalizedValue: WorkflowFormFieldValuePayload = {}
		if (field.value.stringValue !== undefined) {
			normalizedValue.stringValue = field.value.stringValue
		}
		if (field.value.integerValue !== undefined) {
			normalizedValue.integerValue = field.value.integerValue
		}
		if (field.value.stringArrayValue?.values !== undefined) {
			normalizedValue.stringArrayValue = field.value.stringArrayValue.values
		}

		accumulator[field.key] = normalizedValue
		return accumulator
	}, {})
}

export class WorkflowFormRuntime {
	constructor(
		private readonly resolvers: Record<string, WorkflowFormResolverDefinition> = workflowFormRegistry,
		private readonly readToolDictionaryMarkdown: (relativePath: string) => string = defaultReadToolDictionaryMarkdown,
	) {}

	createSession(options: WorkflowFormRuntimeCreateSessionOptions): WorkflowFormSessionState {
		return {
			sessionId: randomUUID(),
			resolverId: options.resolverId,
			triggerSource: options.triggerSource,
			owner: options.owner,
			phase: "confirm",
			values: {},
		}
	}

	buildPayload(session: WorkflowFormSessionState): ClineWorkflowForm {
		const resolver = this.getResolver(session.resolverId)
		const toolDictionaryMarkdown = this.readToolDictionaryMarkdown(resolver.toolDictionaryRelativePath)

		switch (session.phase) {
			case "confirm":
				return resolver.buildConfirmPayload(session, toolDictionaryMarkdown)
			case "collect":
				return resolver.buildCollectPayload(session, toolDictionaryMarkdown)
			case "retry_error":
				return resolver.buildRetryPayload(session, toolDictionaryMarkdown)
			case "success":
				return this.buildSuccessPayload(session, "The workflow form completed successfully.")
			default:
				return resolver.buildConfirmPayload(session, toolDictionaryMarkdown)
		}
	}

	buildRetryPayload(session: WorkflowFormSessionState, errorMessage: string): ClineWorkflowForm {
		const retrySession: WorkflowFormSessionState = {
			...session,
			phase: "retry_error",
			lastError: errorMessage,
		}

		return this.getResolver(retrySession.resolverId).buildRetryPayload(
			retrySession,
			this.readToolDictionaryMarkdown(this.getResolver(retrySession.resolverId).toolDictionaryRelativePath),
		)
	}

	buildSuccessPayload(session: WorkflowFormSessionState, successMessage: string): ClineWorkflowForm {
		const resolver = this.getResolver(session.resolverId)
		const toolDictionaryMarkdown = this.readToolDictionaryMarkdown(resolver.toolDictionaryRelativePath)
		const basePayload = resolver.buildCollectPayload(
			{
				...session,
				phase: "success",
			},
			toolDictionaryMarkdown,
		)

		return {
			...basePayload,
			phase: "success",
			fields: undefined,
			options: undefined,
			submitLabel: undefined,
			cancelLabel: undefined,
			retryLabel: undefined,
			errorMessage: undefined,
			successMessage,
		}
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
			const confirmValue = nextValues.confirm?.stringValue?.trim().toLowerCase()
			if (request.action === WorkflowFormAction.SUBMIT && confirmValue === "yes") {
				const nextSession: WorkflowFormSessionState = {
					...session,
					phase: "collect",
					values: nextValues,
					lastError: undefined,
				}

				return {
					kind: "render_form",
					session: nextSession,
					payload: resolver.buildCollectPayload(
						nextSession,
						this.readToolDictionaryMarkdown(resolver.toolDictionaryRelativePath),
					),
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

		if (
			request.action === WorkflowFormAction.SUBMIT ||
			(session.phase === "retry_error" && request.action === WorkflowFormAction.RETRY)
		) {
			const nextSession: WorkflowFormSessionState = {
				...session,
				phase: "collect",
				values: nextValues,
				lastError: undefined,
			}

			return {
				kind: "invoke_tool",
				session: nextSession,
				toolName: resolver.toolName,
				toolInput: resolver.translateSubmissionToToolUse(nextValues),
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
