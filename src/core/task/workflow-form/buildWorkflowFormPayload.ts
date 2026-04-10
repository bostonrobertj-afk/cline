import type { ClineWorkflowForm, WorkflowFormDefinitionPayload, WorkflowFormResolvedPanelPayload } from "@shared/ExtensionMessage"
import type { WorkflowFormSessionState } from "./types"

export function buildWorkflowFormPayload(args: {
	session: WorkflowFormSessionState
	definition: WorkflowFormDefinitionPayload
	panel?: WorkflowFormResolvedPanelPayload
	errorMessage?: string
	successMessage?: string
	success?: boolean
}): ClineWorkflowForm {
	const basePayload = {
		sessionId: args.session.sessionId,
		resolverId: args.session.resolverId,
		title: args.definition.title,
		toolDictionaryTitle: args.definition.toolDictionaryTitle,
		toolDictionaryMarkdown: args.definition.toolDictionaryMarkdown,
		values: args.session.values,
	}

	if (args.success === true) {
		return {
			...basePayload,
			renderState: "success",
			successMessage: args.successMessage,
		}
	}

	if (args.errorMessage) {
		return {
			...basePayload,
			renderState: "failure",
			panel: args.panel,
			errorMessage: args.errorMessage,
		}
	}

	return {
		...basePayload,
		renderState: "panel",
		panel: args.panel,
	}
}
