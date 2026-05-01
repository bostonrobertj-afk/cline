import type { ClineWorkflowStepResolutionStatus, WorkflowForm } from "@shared/ExtensionMessage"
import type { TaskState } from "@/core/task/TaskState"
import type { WorkflowFormSessionState } from "@/core/task/workflow-form/types"
import type { WorkflowNextAction } from "@/core/task/workflow-runtime/types"
import type { WorkflowRuntime } from "@/core/task/workflow-runtime/WorkflowRuntime"

export interface WorkflowToolBackedOperationConsumerResult {
	toolResultText: string | undefined
}

export interface WorkflowNextActionConsumerAdapter {
	shouldAbort(): boolean
	persistWorkflowRuntimeMetadata(): Promise<void>
	renderWorkflowForm(payload: WorkflowForm): Promise<void>
	waitForWorkflowFormCompletion(formSession: WorkflowFormSessionState): Promise<void>
	renderWorkflowStepResolutionStatus(payload: ClineWorkflowStepResolutionStatus): Promise<void>
	reportTerminalError(errorMessage: string): Promise<void>
	executeToolBackedOperation(
		nextAction: Extract<WorkflowNextAction, { kind: "execute_tool_backed_operation" }>,
	): Promise<WorkflowToolBackedOperationConsumerResult>
}

export interface WorkflowNextActionConsumerArgs {
	taskState: TaskState
	workflowRuntime: WorkflowRuntime
	adapter: WorkflowNextActionConsumerAdapter
}

export class WorkflowNextActionConsumer {
	private readonly taskState: TaskState
	private readonly workflowRuntime: WorkflowRuntime
	private readonly adapter: WorkflowNextActionConsumerAdapter

	constructor(args: WorkflowNextActionConsumerArgs) {
		this.taskState = args.taskState
		this.workflowRuntime = args.workflowRuntime
		this.adapter = args.adapter
	}

	async consume(nextAction: WorkflowNextAction | undefined): Promise<void> {
		let currentAction = nextAction
		if (currentAction === undefined) {
			return
		}

		while (!this.adapter.shouldAbort()) {
			switch (currentAction.kind) {
				case "no_op":
					return
				case "project_prompt":
					await this.adapter.persistWorkflowRuntimeMetadata()
					return
				case "persist_workflow_teardown":
					await this.adapter.persistWorkflowRuntimeMetadata()
					return
				case "terminal_error":
					await this.adapter.persistWorkflowRuntimeMetadata()
					await this.adapter.reportTerminalError(currentAction.errorMessage)
					return
				case "complete_workflow":
					await this.adapter.persistWorkflowRuntimeMetadata()
					return
				case "render_workflow_form":
					await this.adapter.persistWorkflowRuntimeMetadata()
					await this.adapter.renderWorkflowForm(currentAction.payload)
					await this.adapter.waitForWorkflowFormCompletion(currentAction.formSession)
					if (this.adapter.shouldAbort()) {
						return
					}
					currentAction = await this.workflowRuntime.resolveNextAction({ taskState: this.taskState })
					break
				case "execute_tool_backed_operation": {
					if (currentAction.toolBackedOperationSession) {
						const toolBackedOperationStatusPayload = this.workflowRuntime.buildToolBackedOperationStatusPayload({
							taskState: this.taskState,
							session: currentAction.toolBackedOperationSession,
						})
						if (toolBackedOperationStatusPayload) {
							await this.adapter.renderWorkflowStepResolutionStatus(toolBackedOperationStatusPayload)
						}
					}

					const toolResult = await this.adapter.executeToolBackedOperation(currentAction)
					currentAction = await this.workflowRuntime.handleToolBackedOperationToolResult({
						taskState: this.taskState,
						toolResultText: toolResult.toolResultText,
					})
					await this.adapter.persistWorkflowRuntimeMetadata()
					break
				}
			}
		}
	}
}
