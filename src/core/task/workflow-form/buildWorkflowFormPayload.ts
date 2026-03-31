import type { ClineWorkflowForm, WorkflowFormDefinition, WorkflowFormRenderablePhase } from "@shared/ExtensionMessage"
import type { WorkflowFormSessionState } from "./types"

export function buildWorkflowFormPayload(args: {
	session: WorkflowFormSessionState
	definition: WorkflowFormDefinition
	errorMessage?: string
	successMessage?: string
}): ClineWorkflowForm {
	if (args.session.phase === "success") {
		return {
			sessionId: args.session.sessionId,
			resolverId: args.session.resolverId,
			phase: "success",
			definition: args.definition,
			values: args.session.values,
			successMessage: args.successMessage ?? args.definition.successMessage,
		}
	}

	const page = args.definition.pages[args.session.phase as WorkflowFormRenderablePhase]
	if (!page) {
		throw new Error(`Workflow form definition is missing the page for phase: ${args.session.phase}`)
	}

	return {
		sessionId: args.session.sessionId,
		resolverId: args.session.resolverId,
		phase: args.session.phase,
		definition: args.definition,
		values: args.session.values,
		errorMessage: args.errorMessage,
	}
}
