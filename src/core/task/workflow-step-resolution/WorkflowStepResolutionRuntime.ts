import type { ClineWorkflowStepResolutionStatus } from "@shared/ExtensionMessage"
import { randomUUID } from "crypto"
import { buildWorkflowStepResolutionStatusPayload } from "./buildWorkflowStepResolutionStatusPayload"
import type {
	WorkflowStepResolutionDefinition,
	WorkflowStepResolutionRuntimeLike,
	WorkflowStepResolutionSessionOwner,
	WorkflowStepResolutionSessionState,
	WorkflowStepResolutionTriggerSource,
} from "./types"

export class WorkflowStepResolutionRuntime implements WorkflowStepResolutionRuntimeLike {
	constructor(private readonly definitions: Record<string, WorkflowStepResolutionDefinition>) {}

	createSession(options: {
		definitionId: string
		triggerSource: WorkflowStepResolutionTriggerSource
		owner: WorkflowStepResolutionSessionOwner
	}): WorkflowStepResolutionSessionState {
		this.getDefinition(options.definitionId)

		return {
			sessionId: randomUUID(),
			definitionId: options.definitionId,
			triggerSource: options.triggerSource,
			owner: options.owner,
			state: "pending",
		}
	}

	buildPayload(session: WorkflowStepResolutionSessionState): ClineWorkflowStepResolutionStatus {
		const definition = this.getDefinition(session.definitionId)
		return buildWorkflowStepResolutionStatusPayload(session, definition.buildStatusDefinition(session))
	}

	buildTerminalSession(
		session: WorkflowStepResolutionSessionState,
		state: "success" | "failure",
		lastError?: string,
	): WorkflowStepResolutionSessionState {
		return {
			...session,
			state,
			lastError,
		}
	}

	private getDefinition(definitionId: string) {
		const definition = this.definitions[definitionId]
		if (!definition) {
			throw new Error(`Unknown workflow step resolution definition: ${definitionId}`)
		}

		return definition
	}
}
