import * as disk from "@core/storage/disk"
import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import { HostProvider } from "@/hosts/host-provider"
import { setVscodeHostProviderMock } from "@/test/host-provider-test-utils"
import { startOrResumeManagedWorkflowRun } from "../../../managed-workflows/ManagedWorkflowController"
import type { ManagedWorkflowRunState } from "../../../managed-workflows/types"
import { TaskState } from "../../../TaskState"
import type { TaskConfig } from "../../types/TaskConfig"
import { AttemptCompletionHandler } from "../AttemptCompletionHandler"
import { CompleteWorkflowItemToolHandler } from "../CompleteWorkflowItemToolHandler"
import { SetWorkflowPlaceholdersToolHandler } from "../SetWorkflowPlaceholdersToolHandler"
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
		expect(String(result)).to.contain("[attempt_completion] Result: Done")
		expect(config.taskState.consecutiveMistakeCount).to.equal(0)
		expect(config.taskState.didAttemptCompletionEndTask).to.equal(false)
		expect((config.callbacks.say as sinon.SinonStub).calledWith("completion_result", "done")).to.equal(true)
		expect((config.callbacks.ask as sinon.SinonStub).calledOnce).to.equal(true)
		expect((config.callbacks.ask as sinon.SinonStub).calledWith("completion_result", "", false)).to.equal(true)
	})

	it("ends the task cleanly for managed workflow completion even when attempt_completion includes a command", async () => {
		const handler = new AttemptCompletionHandler()
		const config = createConfig()
		const run = createManagedWorkflowRun()
		run.allRequiredComplete = true
		run.status = "completed"
		run.phases[0].completed = true
		run.phases[0].items = run.phases[0].items.map((item) => ({ ...item, completed: true }))
		config.taskState.managedWorkflowRun = run

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "attempt_completion",
			params: {
				result: "done",
				command: "git status --short",
			},
			partial: false,
		} as any)

		expect(String(result)).to.contain("[attempt_completion] Result: Done")
		expect(config.taskState.didAttemptCompletionEndTask).to.equal(false)
		expect((config.callbacks.executeCommandTool as sinon.SinonStub).calledWith("git status --short", undefined)).to.equal(
			true,
		)
		expect((config.callbacks.ask as sinon.SinonStub).calledOnce).to.equal(true)
		expect((config.callbacks.ask as sinon.SinonStub).calledWith("completion_result", "", false)).to.equal(true)
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

	it("resolves checkpoint items through the complete_workflow_item handler without requiring attempt_completion", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new CompleteWorkflowItemToolHandler()
			const config = createConfig()
			config.taskState.managedWorkflowRun = {
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
							{
								id: "step-01-gather-context::item-1",
								label: "Load context",
								sourceText: "Load context",
								completed: true,
							},
							{
								id: "step-01-gather-context::checkpoint",
								label: "Confirm the summary",
								sourceText: "Confirm the summary",
								completed: false,
								blocked: true,
							},
						],
					},
				],
			}
			config.taskState.activeWorkflowId = "bmad-code-review"

			const metadata = { activeWorkflowId: "bmad-code-review" } as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "complete_workflow_item",
				params: {
					item_id: "step-01-gather-context::checkpoint",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('Marked checkpoint "step-01-gather-context::checkpoint" complete.')
			expect(String(result)).to.contain("All required workflow phases are complete.")
			expect(config.taskState.managedWorkflowRun?.phases[0].items[1].completed).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("persists managed workflow placeholders to task metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig()
			config.taskState.managedWorkflowRun = createManagedWorkflowRun()
			config.taskState.activeWorkflowId = "bmad-code-review"

			const metadata = { activeWorkflowId: "bmad-code-review" } as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						research_topic: "token resolution",
						validation_report_path: "reports/validation.md",
					},
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Stored 2 workflow placeholders")
			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect(config.taskState.managedWorkflowRun?.dynamicPlaceholders).to.deep.equal({
				research_topic: "token resolution",
				validation_report_path: "reports/validation.md",
			})
			expect(config.taskState.managedWorkflowRun?.updatedAt).to.be.greaterThan(0)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("round-trips managed workflow placeholder state through task metadata save and reload", async () => {
		const tempGlobalStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), "managed-workflow-metadata-"))
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig({
				taskId: "task-managed-workflow-metadata",
			})
			config.taskState.managedWorkflowRun = {
				...createManagedWorkflowRun(),
				stablePlaceholders: {
					project_name: "Cline",
					communication_language: "English",
				},
				dynamicPlaceholders: {
					research_topic: "token resolution",
				},
			}
			config.taskState.activeWorkflowId = "bmad-code-review"

			setVscodeHostProviderMock({
				globalStorageFsPath: tempGlobalStorageDir,
			})

			await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						validation_report_path: "reports/validation.md",
					},
				},
				partial: false,
			} as any)

			const reloadedMetadata = await disk.getTaskMetadata(config.taskId)
			expect(reloadedMetadata.managedWorkflowRun).to.exist
			expect(reloadedMetadata.managedWorkflowRun?.stablePlaceholders).to.deep.equal({
				project_name: "Cline",
				communication_language: "English",
			})
			expect(reloadedMetadata.managedWorkflowRun?.dynamicPlaceholders).to.deep.equal({
				research_topic: "token resolution",
				validation_report_path: "reports/validation.md",
			})
		} finally {
			await fs.rm(tempGlobalStorageDir, { recursive: true, force: true })
			HostProvider.reset()
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

	it("activates managed workflow aliases through use_skill and persists the workflow run", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig()
			const metadata = {} as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "bmad-problem-solving",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('Managed workflow "bmad-cis-problem-solving" is now active')
			expect(config.taskState.managedWorkflowRun?.workflowId).to.equal("bmad-cis-problem-solving")
			expect(config.taskState.activeWorkflowId).to.equal("bmad-cis-problem-solving")
			expect(config.taskState.activeAgentId).to.equal(undefined)
			expect(config.taskState.activeAgentInvokedSlashCommand).to.equal(undefined)
			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("resumes a managed workflow through use_skill when the same workflow is already active", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig()
			config.taskState.managedWorkflowRun = (
				await startOrResumeManagedWorkflowRun(config.cwd, "bmad-code-review", undefined, "bmad-code-review")
			).run
			config.taskState.activeWorkflowId = "bmad-code-review"
			config.taskState.activeWorkflowJustStarted = false
			const metadata = { activeWorkflowId: "bmad-code-review" } as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "bmad-code-review",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('Managed workflow "bmad-code-review" is active again')
			expect(config.taskState.activeWorkflowId).to.equal("bmad-code-review")
			expect(config.taskState.activeWorkflowJustStarted).to.equal(false)
		} finally {
			sandbox.restore()
		}
	})

	it("rejects same-thread managed workflow activation when a BMAD agent is already active outside subagent execution", async () => {
		const handler = new UseSkillToolHandler()
		const config = createConfig({ isSubagentExecution: false })
		config.taskState.activeAgentId = "bmad-dev"
		config.taskState.activeAgentSkillName = "bmad-dev"
		config.taskState.activeAgentInvokedSlashCommand = "bmad-agent-bmm-dev"
		config.taskState.activeAgentJustActivated = false

		const result = await handler.execute(config, {
			type: "tool_use",
			name: "use_skill",
			params: {
				skill_name: "bmad-code-review",
			},
			partial: false,
		} as any)

		expect(String(result)).to.contain("must be activated from a dedicated subagent")
		expect(String(result)).to.contain('call use_skill with "bmad-code-review"')
		expect(config.taskState.managedWorkflowRun).to.equal(undefined)
		expect(config.taskState.activeWorkflowId).to.equal(undefined)
		expect(config.taskState.activeAgentId).to.equal("bmad-dev")
	})
})
