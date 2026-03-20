import * as disk from "@core/storage/disk"
import { expect } from "chai"
import { describe, it } from "mocha"
import sinon from "sinon"
import type { ManagedWorkflowRunState } from "../../../managed-workflows/types"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { AttemptCompletionHandler } from "../AttemptCompletionHandler"
import { CompleteWorkflowItemToolHandler } from "../CompleteWorkflowItemToolHandler"
import { UseSkillToolHandler } from "../UseSkillToolHandler"

function createManagedWorkflowRun(): ManagedWorkflowRunState {
	return {
		workflowId: "bmad-code-review",
		slashCommand: "bmad-code-review",
		status: "active",
		currentPhaseIndex: 0,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		allRequiredComplete: false,
		phases: [
			{
				id: "step-01-gather-context",
				title: "Gather Context",
				sourcePath: ".cline/skills/bmad-code-review/steps/step-01-gather-context.md",
				sourceContent: "# Step 1",
				completed: false,
				items: [
					{ id: "step-01-gather-context::item-1", label: "Load context", sourceText: "Load context", completed: false },
					{
						id: "step-01-gather-context::item-2",
						label: "Summarize scope",
						sourceText: "Summarize scope",
						completed: false,
					},
				],
			},
		],
	}
}

function createConfig(overrides: Partial<TaskConfig> = {}): TaskConfig {
	const taskState = new TaskState()
	const callbacks = {
		say: sinon.stub().resolves(undefined),
		ask: sinon.stub().resolves({ response: "yesButtonClicked" }),
		saveCheckpoint: sinon.stub().resolves(),
		sayAndCreateMissingParamError: sinon.stub().resolves("missing"),
		removeLastPartialMessageIfExistsWithType: sinon.stub().resolves(),
		updateFCListFromToolResponse: sinon.stub().resolves(),
		doesLatestTaskCompletionHaveNewChanges: sinon.stub().resolves(false),
		executeCommandTool: sinon.stub().resolves([false, "ok"]),
	} as any

	return {
		taskId: "task-managed-workflow",
		ulid: "ulid-managed-workflow",
		cwd: process.cwd(),
		mode: "act",
		strictPlanModeEnabled: false,
		yoloModeToggled: false,
		doubleCheckCompletionEnabled: false,
		vscodeTerminalExecutionMode: "backgroundExec",
		enableParallelToolCalling: true,
		isSubagentExecution: true,
		taskState,
		messageState: {
			getClineMessages: () => [],
			setClineMessages: sinon.stub(),
			saveClineMessagesAndUpdateHistory: sinon.stub().resolves(),
		} as any,
		api: {
			getModel: () => ({ id: "test-model", info: { supportsImages: false } }),
		} as any,
		autoApprovalSettings: {
			enableNotifications: false,
			actions: { executeSafeCommands: false, executeAllCommands: false },
		} as any,
		autoApprover: {
			shouldAutoApproveTool: sinon.stub().returns([true, true]),
		} as any,
		browserSettings: {} as any,
		focusChainSettings: { enabled: false } as any,
		services: {
			stateManager: {
				getGlobalStateKey: () => undefined,
				getGlobalSettingsKey: () => undefined,
				getWorkspaceStateKey: () => undefined,
				getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
			},
		} as any,
		callbacks,
		coordinator: { getHandler: sinon.stub() } as any,
		...overrides,
	} as TaskConfig
}

describe("Managed workflow handlers", () => {
	it("blocks attempt_completion while a managed workflow still has incomplete items", async () => {
		const handler = new AttemptCompletionHandler()
		const config = createConfig()
		config.taskState.managedWorkflowRun = createManagedWorkflowRun()

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
			},
			partial: false,
		} as any)

		expect(String(result)).to.contain('Managed workflow "bmad-code-review" is still in progress')
		expect(config.taskState.consecutiveMistakeCount).to.equal(1)
	})

	it("allows attempt_completion once all required managed workflow items are complete", async () => {
		const handler = new AttemptCompletionHandler()
		const config = createConfig()
		const run = createManagedWorkflowRun()
		run.allRequiredComplete = true
		run.status = "completed"
		run.phases[0].completed = true
		run.phases[0].items = [
			...run.phases[0].items.map((item) => ({ ...item, completed: true })),
			{
				id: "step-01-gather-context::item-3",
				label: "Optional next step",
				sourceText: "Optional next step",
				completed: false,
				required: false,
				advisory: true,
			},
		]
		config.taskState.managedWorkflowRun = run

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
			},
			partial: false,
		} as any)

		expect(String(result)).to.not.contain("Managed workflow")
		expect(config.taskState.consecutiveMistakeCount).to.equal(0)
		expect((config.callbacks.say as sinon.SinonStub).calledWith("completion_result", "done")).to.equal(true)
	})

	it("persists managed workflow item completion to task metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new CompleteWorkflowItemToolHandler()
			const config = createConfig()
			config.taskState.managedWorkflowRun = createManagedWorkflowRun()
			config.taskState.activeWorkflowId = "bmad-code-review"

			const metadata = { activeWorkflowId: "bmad-code-review" } as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			await handler.execute(config, {
				type: "tool_use",
				name: "complete_workflow_item",
				params: {
					item_id: "step-01-gather-context::item-1",
				},
				partial: false,
			} as any)

			expect(config.taskState.managedWorkflowRun?.phases[0].items[0].completed).to.equal(true)
			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			const [, savedMetadata] = saveMetadataStub.firstCall.args
			expect(savedMetadata.managedWorkflowRun).to.exist
			expect(savedMetadata.managedWorkflowRun!.phases[0].items[0].completed).to.equal(true)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)

			const restoredRun = savedMetadata.managedWorkflowRun!
			expect(restoredRun.workflowId).to.equal("bmad-code-review")
			expect(restoredRun.phases[0].items[0].completed).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("reports workflow completion instead of a stale current phase on the final required item", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new CompleteWorkflowItemToolHandler()
			const config = createConfig()
			config.taskState.managedWorkflowRun = createManagedWorkflowRun()
			config.taskState.activeWorkflowId = "bmad-code-review"
			config.taskState.managedWorkflowRun.phases[0].items[0].completed = true

			const metadata = { activeWorkflowId: "bmad-code-review" } as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "complete_workflow_item",
				params: {
					item_id: "step-01-gather-context::item-2",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("All required workflow phases are complete.")
			expect(config.taskState.managedWorkflowRun?.currentPhaseIndex).to.equal(
				config.taskState.managedWorkflowRun?.phases.length,
			)
		} finally {
			sandbox.restore()
		}
	})

	it("activates managed workflow aliases through use_skill by resolving the canonical skill first", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig()
			const metadata = {} as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "bmad-problem-solving",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('Canonical managed workflow: "bmad-cis-problem-solving"')
			expect(config.taskState.managedWorkflowRun?.workflowId).to.equal("bmad-cis-problem-solving")
			expect(config.taskState.activeWorkflowId).to.equal("bmad-cis-problem-solving")
			expect(config.taskState.activeAgentId).to.equal("bmad-pm")
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("auto-activates the owning BMAD agent when a managed workflow is invoked through use_skill", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig()
			const metadata = {} as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "bmad-code-review",
				},
				partial: false,
			} as any)

			expect(config.taskState.activeAgentId).to.equal("bmad-dev")
			expect(config.taskState.activeAgentSkillName).to.equal("bmad-dev")
			expect(config.taskState.activeAgentInvokedSlashCommand).to.equal("bmad-code-review")
			expect(config.taskState.activeAgentJustActivated).to.equal(true)
			expect(config.taskState.managedWorkflowRun?.workflowId).to.equal("bmad-code-review")
		} finally {
			sandbox.restore()
		}
	})

	it("preserves a compatible active BMAD agent when starting a managed workflow through use_skill", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig()
			config.taskState.activeAgentId = "bmad-dev"
			config.taskState.activeAgentSkillName = "bmad-dev"
			config.taskState.activeAgentInvokedSlashCommand = "bmad-agent-bmm-dev"
			config.taskState.activeAgentJustActivated = false
			const metadata = {} as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "bmad-code-review",
				},
				partial: false,
			} as any)

			expect(config.taskState.activeAgentId).to.equal("bmad-dev")
			expect(config.taskState.activeAgentInvokedSlashCommand).to.equal("bmad-agent-bmm-dev")
			expect(config.taskState.managedWorkflowRun?.workflowId).to.equal("bmad-code-review")
		} finally {
			sandbox.restore()
		}
	})

	it("rejects incompatible active BMAD agents when starting a managed workflow through use_skill", async () => {
		const handler = new UseSkillToolHandler()
		const config = createConfig()
		config.taskState.activeAgentId = "bmad-sm"

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "use_skill",
			params: {
				skill_name: "bmad-code-review",
			},
			partial: false,
		} as any)

		expect(String(result)).to.contain('Active agent "bmad-sm" is not allowed to use skill "bmad-code-review"')
		expect(config.taskState.managedWorkflowRun).to.equal(undefined)
	})
})
