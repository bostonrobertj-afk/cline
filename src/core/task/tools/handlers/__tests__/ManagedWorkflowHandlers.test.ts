import * as disk from "@core/storage/disk"
import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import sinon from "sinon"
import { HostProvider } from "@/hosts/host-provider"
import { setVscodeHostProviderMock } from "@/test/host-provider-test-utils"
import { resolvePlaceholderWorkflowManagedVariant } from "../../../bmad-agent-mode"
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
				getRemoteConfigSettings: () => ({}),
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
			const config = createConfig({ isSubagentExecution: false })
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
			expect(savedMetadata.managedWorkflowRun?.phases[0].items[0].completed).to.equal(true)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)

			const restoredRun = savedMetadata.managedWorkflowRun
			expect(restoredRun).to.exist
			expect(restoredRun?.workflowId).to.equal("bmad-code-review")
			expect(restoredRun?.phases[0].items[0].completed).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("keeps managed workflow item completion subagent-local without overwriting parent metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new CompleteWorkflowItemToolHandler()
			const config = createConfig()
			config.taskState.managedWorkflowRun = createManagedWorkflowRun()
			config.taskState.activeWorkflowId = "bmad-code-review"

			const parentMetadata = {
				activeWorkflowId: "parent-workflow",
				managedWorkflowRun: { workflowId: "parent-run" },
			} as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(parentMetadata)
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
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(parentMetadata.activeWorkflowId).to.equal("parent-workflow")
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)
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
			const config = createConfig({ isSubagentExecution: false })
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

	it("keeps workflow placeholder updates subagent-local without overwriting parent metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig()
			config.taskState.activePlaceholderWorkflowId = "dev-story"

			const parentMetadata = {
				activeWorkflowId: "parent-workflow",
				activePlaceholderWorkflowId: "parent-placeholder",
				activePlaceholderWorkflowValues: { story_path: "parent.md" },
			} as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(parentMetadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						research_topic: "workflow gating",
						report_path: "docs/workflow-gating.md",
					},
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Stored 2 workflow placeholders")
			expect(config.taskState.activePlaceholderWorkflowValues).to.deep.equal({
				research_topic: "workflow gating",
				report_path: "docs/workflow-gating.md",
			})
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(parentMetadata.activePlaceholderWorkflowId).to.equal("parent-placeholder")
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("treats duplicate managed workflow placeholder values as a no-op", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig()
			const run = createManagedWorkflowRun()
			run.dynamicPlaceholders = {
				research_topic: "token resolution",
				validation_report_path: "reports/validation.md",
			}
			run.updatedAt = 123
			config.taskState.managedWorkflowRun = run
			config.taskState.activeWorkflowId = "bmad-code-review"

			const getMetadataStub = sandbox
				.stub(disk, "getTaskMetadata")
				.resolves({ activeWorkflowId: "bmad-code-review" } as any)
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

			expect(String(result)).to.contain("No workflow placeholder values changed")
			expect(String(result)).to.contain("Do not call set_workflow_placeholders again")
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(config.taskState.managedWorkflowRun?.dynamicPlaceholders).to.deep.equal({
				research_topic: "token resolution",
				validation_report_path: "reports/validation.md",
			})
			expect(config.taskState.managedWorkflowRun?.updatedAt).to.equal(123)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).called).to.equal(false)
		} finally {
			sandbox.restore()
		}
	})

	it("treats stable managed workflow placeholder values as already available", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig()
			const run = createManagedWorkflowRun()
			run.stablePlaceholders = {
				project_name: "cline",
				user_name: "Rob",
			}
			run.updatedAt = 123
			config.taskState.managedWorkflowRun = run
			config.taskState.activeWorkflowId = "bmad-code-review"

			const getMetadataStub = sandbox
				.stub(disk, "getTaskMetadata")
				.resolves({ activeWorkflowId: "bmad-code-review" } as any)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						project_name: "cline",
						user_name: "Rob",
					},
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Success: workflow placeholder values were already available")
			expect(String(result)).to.contain("project_name, user_name")
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(config.taskState.managedWorkflowRun?.dynamicPlaceholders).to.equal(undefined)
			expect(config.taskState.managedWorkflowRun?.updatedAt).to.equal(123)
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).called).to.equal(false)
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
				isSubagentExecution: false,
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

	it("persists placeholders for active non-managed workflows", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new SetWorkflowPlaceholdersToolHandler()
			const config = createConfig({ isSubagentExecution: false })
			config.taskState.activePlaceholderWorkflowId = "dev-story"

			const metadata = { activeWorkflowId: "dev-story" } as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "set_workflow_placeholders",
				params: {
					values: {
						research_topic: "workflow gating",
						report_path: "docs/workflow-gating.md",
					},
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Stored 2 workflow placeholders")
			expect(getMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect(config.taskState.managedWorkflowRun).to.equal(undefined)
			expect(config.taskState.activePlaceholderWorkflowValues).to.deep.equal({
				research_topic: "workflow gating",
				report_path: "docs/workflow-gating.md",
			})
		} finally {
			sandbox.restore()
		}
	})

	it("reports workflow completion instead of a stale current phase on the final required item", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new CompleteWorkflowItemToolHandler()
			const config = createConfig({ isSubagentExecution: false })
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
			const config = createConfig({ isSubagentExecution: false })
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

	it("keeps managed workflow activation through use_skill subagent-local without overwriting parent metadata", async () => {
		const sandbox = sinon.createSandbox()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig()
			const parentMetadata = { activeWorkflowId: "parent-workflow" } as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(parentMetadata)
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
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(parentMetadata.activeWorkflowId).to.equal("parent-workflow")
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

	it("activates local workflows through use_skill", async () => {
		const sandbox = sinon.createSandbox()
		let tempDir: string | undefined
		try {
			tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-local-"))
			const workflowPath = path.join(tempDir, "local-review.md")
			await fs.writeFile(workflowPath, "# Local review\nInspect the staged diff.", "utf8")
			const metadata = {} as any
			sandbox.stub(disk, "getTaskMetadata").resolves(metadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const handler = new UseSkillToolHandler()
			const config = createConfig({
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) => (key === "globalWorkflowToggles" ? {} : undefined),
						getWorkspaceStateKey: (key: string) => (key === "workflowToggles" ? { [workflowPath]: true } : undefined),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "local-review.md",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('# Workflow "local-review.md" is now active')
			expect(String(result)).to.contain("Inspect the staged diff.")
			expect(config.taskState.activeWorkflowId).to.equal(undefined)
			expect(config.taskState.activePlaceholderWorkflowId).to.equal("local-review.md")
			expect(config.taskState.activePlaceholderWorkflowSource).to.deep.equal({
				type: "local",
				name: "local-review.md",
				path: workflowPath,
			})
			expect(config.taskState.activeWorkflowJustStarted).to.equal(true)
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.firstCall.args[1].activePlaceholderWorkflowSource).to.deep.equal({
				type: "local",
				name: "local-review.md",
				path: workflowPath,
			})
		} finally {
			sandbox.restore()
			if (tempDir) {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		}
	})

	it("keeps placeholder workflow activation through use_skill subagent-local without overwriting parent metadata", async () => {
		const sandbox = sinon.createSandbox()
		let tempDir: string | undefined
		try {
			tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-subagent-local-"))
			const workflowPath = path.join(tempDir, "local-review.md")
			await fs.writeFile(workflowPath, "# Local review\nInspect the staged diff.", "utf8")
			const parentMetadata = {
				activePlaceholderWorkflowId: "parent-placeholder",
				activePlaceholderWorkflowSource: { type: "remote", name: "parent" },
			} as any
			const getMetadataStub = sandbox.stub(disk, "getTaskMetadata").resolves(parentMetadata)
			const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

			const handler = new UseSkillToolHandler()
			const config = createConfig({
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) => (key === "globalWorkflowToggles" ? {} : undefined),
						getWorkspaceStateKey: (key: string) => (key === "workflowToggles" ? { [workflowPath]: true } : undefined),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "local-review.md",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('# Workflow "local-review.md" is now active')
			expect(config.taskState.activePlaceholderWorkflowId).to.equal("local-review.md")
			expect(getMetadataStub.called).to.equal(false)
			expect(saveMetadataStub.called).to.equal(false)
			expect(parentMetadata.activePlaceholderWorkflowId).to.equal("parent-placeholder")
		} finally {
			sandbox.restore()
			if (tempDir) {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		}
	})

	it("seeds a placeholder checklist through use_skill when the workflow exposes step headings", async () => {
		const sandbox = sinon.createSandbox()
		let tempDir: string | undefined
		try {
			tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-local-checklist-"))
			const workflowPath = path.join(tempDir, "local-review.md")
			await fs.writeFile(
				workflowPath,
				`# Local review

## Step 1: Gather Context
Inspect the scoped story before asking follow-up questions.

## Step 2: Review
Inspect the prepared review input and write findings.`,
				"utf8",
			)
			sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const handler = new UseSkillToolHandler()
			const config = createConfig({
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) => (key === "globalWorkflowToggles" ? {} : undefined),
						getWorkspaceStateKey: (key: string) => (key === "workflowToggles" ? { [workflowPath]: true } : undefined),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "local-review.md",
				},
				partial: false,
			} as any)

			expect(
				(config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).calledOnceWithExactly(
					"- [ ] Step 1: Gather Context\n- [ ] Step 2: Review",
				),
			).to.equal(true)
		} finally {
			sandbox.restore()
			if (tempDir) {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		}
	})

	it("computes stable placeholders for placeholder workflows through use_skill and persists them", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-local-stable-"))
		const workflowPath = path.join(tempDir, ".cline", "skills", "custom-review", "custom-review.md")
		const manifestPath = path.join(tempDir, "_bmad", "_config", "skill-manifest.csv")
		const configPath = path.join(tempDir, "_bmad", "bmm", "config.yaml")
		await fs.mkdir(path.dirname(workflowPath), { recursive: true })
		await fs.mkdir(path.dirname(manifestPath), { recursive: true })
		await fs.mkdir(path.dirname(configPath), { recursive: true })
		await fs.writeFile(workflowPath, "# Custom review\nRespond in {communication_language} from {config_source}.", "utf8")
		await fs.writeFile(
			manifestPath,
			[
				"canonicalId,name,description,module,path,install_to_bmad",
				'"custom-review","custom-review","Custom review workflow","bmm","_bmad/bmm/workflows/custom-review/SKILL.md","true"',
			].join("\n"),
			"utf8",
		)
		await fs.writeFile(configPath, 'communication_language: "English"\n', "utf8")
		sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
		const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig({
				cwd: tempDir,
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) => (key === "globalWorkflowToggles" ? {} : undefined),
						getWorkspaceStateKey: (key: string) => (key === "workflowToggles" ? { [workflowPath]: true } : undefined),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "custom-review.md",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Respond in English from _bmad/bmm/config.yaml.")
			expect(config.taskState.activePlaceholderWorkflowSource).to.deep.equal({
				type: "local",
				name: "custom-review.md",
				path: workflowPath,
				configPath,
			})
			expect(config.taskState.activePlaceholderWorkflowStableValues).to.include({
				communication_language: "English",
				config_source: "_bmad/bmm/config.yaml",
			})
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.firstCall.args[1].activePlaceholderWorkflowStableValues).to.include({
				communication_language: "English",
				config_source: "_bmad/bmm/config.yaml",
			})
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("activates global workflows through use_skill when no local workflow shadows them", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-global-"))
		const workflowPath = path.join(tempDir, "global-review.md")
		await fs.writeFile(workflowPath, "# Global review\nReview the release notes.", "utf8")
		sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
		const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()

		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig({
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) =>
							key === "globalWorkflowToggles" ? { [workflowPath]: true } : undefined,
						getWorkspaceStateKey: () => ({}),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "global-review.md",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('# Workflow "global-review.md" is now active')
			expect(String(result)).to.contain("Review the release notes.")
			expect(config.taskState.activeWorkflowId).to.equal(undefined)
			expect(config.taskState.activePlaceholderWorkflowId).to.equal("global-review.md")
			expect(config.taskState.activePlaceholderWorkflowSource).to.deep.equal({
				type: "global",
				name: "global-review.md",
				path: workflowPath,
			})
			expect(saveMetadataStub.calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("renders preserved dynamic placeholder values when re-activating the same local workflow through use_skill", async () => {
		const sandbox = sinon.createSandbox()
		let tempDir: string | undefined
		try {
			tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-local-rendered-"))
			const workflowPath = path.join(tempDir, ".cline", "skills", "custom-review", "custom-review.md")
			const manifestPath = path.join(tempDir, "_bmad", "_config", "skill-manifest.csv")
			const configPath = path.join(tempDir, "_bmad", "bmm", "config.yaml")
			await fs.mkdir(path.dirname(workflowPath), { recursive: true })
			await fs.mkdir(path.dirname(manifestPath), { recursive: true })
			await fs.mkdir(path.dirname(configPath), { recursive: true })
			await fs.writeFile(workflowPath, "# Local review\nReview {{story_id}} before continuing.", "utf8")
			await fs.writeFile(
				manifestPath,
				[
					"canonicalId,name,description,module,path,install_to_bmad",
					'"custom-review","custom-review","Custom review workflow","bmm","_bmad/bmm/workflows/custom-review/SKILL.md","true"',
				].join("\n"),
				"utf8",
			)
			await fs.writeFile(configPath, 'story_id: "1.0"\n', "utf8")
			sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
			sandbox.stub(disk, "saveTaskMetadata").resolves()

			const handler = new UseSkillToolHandler()
			const config = createConfig({
				cwd: tempDir,
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: () => ({}),
						getGlobalSettingsKey: (key: string) => (key === "globalWorkflowToggles" ? {} : undefined),
						getWorkspaceStateKey: (key: string) => (key === "workflowToggles" ? { [workflowPath]: true } : undefined),
						getRemoteConfigSettings: () => ({}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})
			config.taskState.activePlaceholderWorkflowId = "custom-review.md"
			config.taskState.activePlaceholderWorkflowSource = {
				type: "local",
				name: "custom-review.md",
				path: workflowPath,
				configPath,
			}
			config.taskState.activePlaceholderWorkflowStableValues = {
				story_id: "1.0",
				config_source: "_bmad/bmm/config.yaml",
			}
			config.taskState.activePlaceholderWorkflowValues = {
				story_id: "1.2",
			}
			config.taskState.currentFocusChainChecklist = "- [ ] Existing checklist item"

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "custom-review.md",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain("Review 1.2 before continuing.")
			expect(String(result)).to.not.contain("{{story_id}}")
			expect(config.taskState.activePlaceholderWorkflowStableValues).to.include({
				story_id: "1.0",
				config_source: "_bmad/bmm/config.yaml",
			})
			expect(config.taskState.activePlaceholderWorkflowValues).to.deep.equal({
				story_id: "1.2",
			})
			expect((config.callbacks.updateFCListFromToolResponse as sinon.SinonStub).called).to.equal(false)
		} finally {
			sandbox.restore()
			if (tempDir) {
				await fs.rm(tempDir, { recursive: true, force: true })
			}
		}
	})

	it("activates remote workflows through use_skill", async () => {
		const sandbox = sinon.createSandbox()
		sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
		const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()
		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig({
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: (key: string) => (key === "remoteWorkflowToggles" ? {} : undefined),
						getGlobalSettingsKey: () => ({}),
						getWorkspaceStateKey: () => ({}),
						getRemoteConfigSettings: () => ({
							remoteGlobalWorkflows: [
								{ name: "remote-review", contents: "# Remote review\nCheck the config.", alwaysEnabled: true },
							],
						}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "remote-review",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('# Workflow "remote-review" is now active')
			expect(String(result)).to.contain("Check the config.")
			expect(config.taskState.activeWorkflowId).to.equal(undefined)
			expect(config.taskState.activePlaceholderWorkflowId).to.equal("remote-review")
			expect(config.taskState.activePlaceholderWorkflowSource).to.deep.equal({
				type: "remote",
				name: "remote-review",
				contents: "# Remote review\nCheck the config.",
			})
			expect(saveMetadataStub.calledOnce).to.equal(true)
		} finally {
			sandbox.restore()
		}
	})

	it("auto-binds the owning BMAD agent when mapped placeholder workflows are activated through use_skill", async () => {
		const sandbox = sinon.createSandbox()
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-placeholder-autobind-"))
		const managedWorkflowConfigPath = path.join(tempDir, "_bmad", "_config", "managed-workflows.json")
		await fs.mkdir(path.dirname(managedWorkflowConfigPath), { recursive: true })
		await fs.writeFile(
			managedWorkflowConfigPath,
			JSON.stringify([
				{
					workflowId: "bmad-code-review",
					slashCommand: "bmad-code-review",
					skillName: "bmad-code-review",
					module: "bmm",
					skillPath: ".cline/skills/bmad-code-review/SKILL.md",
					workflowPath: ".cline/skills/bmad-code-review/workflow.md",
					aliases: [],
					phaseRoots: [],
					checklistPath: null,
					supportsManagedExecution: true,
					strategyHints: [],
					extractionMode: "linear",
					primaryStepRange: null,
					packagedAssetPaths: [],
				},
			]),
			"utf8",
		)
		sandbox.stub(disk, "getTaskMetadata").resolves({} as any)
		const saveMetadataStub = sandbox.stub(disk, "saveTaskMetadata").resolves()
		try {
			const resolvedVariant = await resolvePlaceholderWorkflowManagedVariant(tempDir, "code-review")
			expect(resolvedVariant?.managedWorkflowId).to.equal("bmad-code-review")
			expect(resolvedVariant?.owningAgent?.id).to.equal("bmad-dev")

			const handler = new UseSkillToolHandler()
			const config = createConfig({
				cwd: tempDir,
				isSubagentExecution: false,
				services: {
					stateManager: {
						getGlobalStateKey: (key: string) => (key === "remoteWorkflowToggles" ? {} : undefined),
						getGlobalSettingsKey: () => ({}),
						getWorkspaceStateKey: () => ({}),
						getRemoteConfigSettings: () => ({
							remoteGlobalWorkflows: [
								{
									name: "code-review",
									contents: "# Placeholder code review\nInspect the implementation.",
									alwaysEnabled: true,
								},
							],
						}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "code-review",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('# Workflow "code-review" is now active')
			expect(config.taskState.activeAgentId).to.equal("bmad-dev")
			expect(config.taskState.activeAgentSkillName).to.equal("bmad-dev")
			expect(config.taskState.activeAgentInvokedSlashCommand).to.equal("code-review")
			expect(config.taskState.activePlaceholderWorkflowId).to.equal("code-review")
			expect(saveMetadataStub.calledOnce).to.equal(true)
			expect(saveMetadataStub.firstCall.args[1].activeAgentId).to.equal("bmad-dev")
		} finally {
			sandbox.restore()
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})

	it("blocks mapped placeholder workflows through use_skill when the active BMAD agent is incompatible", async () => {
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "use-skill-placeholder-incompatible-"))
		const managedWorkflowConfigPath = path.join(tempDir, "_bmad", "_config", "managed-workflows.json")
		await fs.mkdir(path.dirname(managedWorkflowConfigPath), { recursive: true })
		await fs.writeFile(
			managedWorkflowConfigPath,
			JSON.stringify([
				{
					workflowId: "bmad-code-review",
					slashCommand: "bmad-code-review",
					skillName: "bmad-code-review",
					module: "bmm",
					skillPath: ".cline/skills/bmad-code-review/SKILL.md",
					workflowPath: ".cline/skills/bmad-code-review/workflow.md",
					aliases: [],
					phaseRoots: [],
					checklistPath: null,
					supportsManagedExecution: true,
					strategyHints: [],
					extractionMode: "linear",
					primaryStepRange: null,
					packagedAssetPaths: [],
				},
			]),
			"utf8",
		)

		try {
			const handler = new UseSkillToolHandler()
			const config = createConfig({
				cwd: tempDir,
				services: {
					stateManager: {
						getGlobalStateKey: (key: string) => (key === "remoteWorkflowToggles" ? {} : undefined),
						getGlobalSettingsKey: () => ({}),
						getWorkspaceStateKey: () => ({}),
						getRemoteConfigSettings: () => ({
							remoteGlobalWorkflows: [
								{
									name: "code-review",
									contents: "# Placeholder code review\nInspect the implementation.",
									alwaysEnabled: true,
								},
							],
						}),
						getApiConfiguration: () => ({ planModeApiProvider: "openai", actModeApiProvider: "openai" }),
					},
				} as any,
			})
			config.taskState.activeAgentId = "bmad-pm"
			config.taskState.activeAgentSkillName = "bmad-pm"
			config.taskState.activeAgentInvokedSlashCommand = "bmad-pm"
			config.taskState.activeAgentJustActivated = false

			const result = await handler.execute(config, {
				type: "tool_use",
				name: "use_skill",
				params: {
					skill_name: "code-review",
				},
				partial: false,
			} as any)

			expect(String(result)).to.contain('Active agent "bmad-pm" is not allowed to use skill "code-review"')
			expect(config.taskState.activePlaceholderWorkflowId).to.equal(undefined)
			expect(config.taskState.activeAgentId).to.equal("bmad-pm")
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true })
		}
	})
})
