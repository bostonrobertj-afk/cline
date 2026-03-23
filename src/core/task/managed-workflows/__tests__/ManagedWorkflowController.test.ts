import { expect } from "chai"
import { describe, it } from "mocha"
import {
	completeManagedWorkflowItem,
	resolveManagedWorkflowCheckpoint,
	startManagedWorkflowRun,
	startOrResumeManagedWorkflowRun,
} from "../ManagedWorkflowController"
import { clearManagedWorkflowRegistryCache } from "../ManagedWorkflowRegistry"
import { buildManagedWorkflowPrompt, renderManagedWorkflowTaskProgress } from "../ManagedWorkflowRenderer"
import type { ManagedWorkflowRunState } from "../types"

describe("ManagedWorkflowController", () => {
	const cwd = process.cwd()

	it("loads bmad-code-review as a phased managed workflow and advances only after the current phase is complete", async () => {
		clearManagedWorkflowRegistryCache(cwd)

		let run = await startManagedWorkflowRun(cwd, "bmad-code-review", "bmad-code-review")

		expect(run.workflowId).to.equal("bmad-code-review")
		expect(run.currentPhaseIndex).to.equal(0)
		expect(run.phases).to.have.length(4)
		expect(run.phases[0].sourcePath).to.equal(".cline/skills/bmad-code-review/steps/step-01-gather-context.md")
		expect(run.phases[0].items.length).to.be.greaterThan(1)
		expect(run.stablePlaceholders).to.include({
			"project-root": cwd,
			project_root: cwd,
			user_name: "Rob",
			communication_language: "English",
			document_output_language: "English",
			user_skill_level: "intermediate",
		})
		expect(run.stablePlaceholders?.output_folder).to.equal(`${cwd}/_bmad-output`)

		const regularPhaseItemIds = run.phases[0].items.filter((item) => !item.blocked).map((item) => item.id)
		const checkpointItem = run.phases[0].items.find((item) => item.blocked)

		expect(checkpointItem).to.exist
		expect(regularPhaseItemIds).to.have.length.greaterThan(1)

		run = completeManagedWorkflowItem(run, regularPhaseItemIds[0])
		expect(run.currentPhaseIndex).to.equal(0)
		expect(run.phases[0].completed).to.equal(false)

		for (const itemId of regularPhaseItemIds.slice(1)) {
			run = completeManagedWorkflowItem(run, itemId)
		}

		run = resolveManagedWorkflowCheckpoint(run, checkpointItem!.id)

		expect(run.currentPhaseIndex).to.equal(1)
		expect(run.phases[0].completed).to.equal(true)
		expect(run.phases[1].sourcePath).to.equal(".cline/skills/bmad-code-review/steps/step-02-review.md")
	})

	it("renders a step-only checklist and active-step obligations without dumping raw phase source", async () => {
		clearManagedWorkflowRegistryCache(cwd)

		const run = await startManagedWorkflowRun(cwd, "bmad-code-review", "bmad-code-review")
		const prompt = buildManagedWorkflowPrompt(run)
		const taskProgress = renderManagedWorkflowTaskProgress(run)

		expect(prompt).to.contain("Current phase regular steps:")
		expect(prompt).to.contain("Current phase checkpoint:")
		expect(prompt).to.contain("Checkpoint rule:")
		expect(prompt).to.contain("Never use complete_workflow_item for a checkpoint item")
		expect(prompt).to.contain("Current active step: Determine the review target")
		expect(prompt).to.contain("Actions:")
		expect(prompt).to.contain("Branches:")
		expect(prompt).to.contain("Details:")
		expect(prompt).to.not.contain("<managed_workflow_phase")
		expect(prompt).to.not.contain("<step n=")
		expect(taskProgress).to.contain("step 01 gather context: Determine the review target")
		expect(taskProgress).to.contain("(Checkpoint) step 01 gather context: Halt after presenting the summary")
		expect(taskProgress).to.not.contain("staged changes")
	})

	it("resolves stable and dynamic managed workflow placeholders in the rendered prompt", () => {
		const run: ManagedWorkflowRunState = {
			workflowId: "synthetic-workflow",
			slashCommand: "synthetic-workflow",
			status: "active",
			currentPhaseIndex: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			allRequiredComplete: false,
			stablePlaceholders: {
				"project-root": "/workspace/project",
				project_root: "/workspace/project",
				project_name: "Cline",
				user_name: "Rob",
				communication_language: "English",
				output_folder: "/workspace/project/output",
			},
			dynamicPlaceholders: {
				research_topic: "token resolution",
				validation_report_path: "reports/validation.md",
			},
			phases: [
				{
					id: "phase-1",
					title: "Review {project_name}",
					sourcePath: "phase-1.md",
					sourceContent: "# Phase 1",
					completed: false,
					checkpointText: "Confirm {validation_report_path}",
					items: [
						{
							id: "phase-1::item-1",
							label: "Ask {user_name} about {{research_topic}}",
							sourceText: "Ask {user_name} about {{research_topic}}",
							completed: false,
							blocked: true,
						},
					],
					execution: {
						steps: [],
					},
				},
			],
		}

		const prompt = buildManagedWorkflowPrompt(run)
		const taskProgress = renderManagedWorkflowTaskProgress(run)

		expect(prompt).to.contain("Current phase: Review Cline")
		expect(prompt).to.contain("Current checkpoint: Confirm reports/validation.md")
		expect(prompt).to.contain("Current phase checkpoint:")
		expect(taskProgress).to.contain("Review Cline: Ask Rob about token resolution")
		expect(taskProgress).to.contain("(Checkpoint)")
	})

	it("falls back to the authored skill file when a managed workflow does not ship a separate workflow.md", async () => {
		clearManagedWorkflowRegistryCache(cwd)

		const run = await startManagedWorkflowRun(cwd, "bmad-distillator", "bmad-distillator")
		const renderedChecklist = renderManagedWorkflowTaskProgress(run)

		expect(run.phases).to.have.length(1)
		expect(run.phases[0].sourcePath).to.equal(".cline/skills/bmad-distillator/SKILL.md")
		expect(run.phases[0].items.length).to.be.greaterThan(1)
		expect(renderedChecklist).to.contain("Validate inputs")
	})

	it("resolves the compatibility alias bmad-problem-solving to the canonical managed workflow", async () => {
		clearManagedWorkflowRegistryCache(cwd)

		const run = await startManagedWorkflowRun(cwd, "bmad-problem-solving", "bmad-problem-solving")

		expect(run.workflowId).to.equal("bmad-cis-problem-solving")
		expect(run.slashCommand).to.equal("bmad-problem-solving")
		expect(run.phases[0].items.length).to.be.greaterThan(6)
	})

	it("resumes an in-progress managed workflow without resetting completed items", async () => {
		clearManagedWorkflowRegistryCache(cwd)

		const initialRun = await startManagedWorkflowRun(cwd, "bmad-code-review", "bmad-code-review")
		const updatedRun = completeManagedWorkflowItem(initialRun, initialRun.phases[0].items[0].id)
		const { run: resumedRun, resumed } = await startOrResumeManagedWorkflowRun(
			cwd,
			"bmad-code-review",
			updatedRun,
			"bmad-code-review",
		)

		expect(resumed).to.equal(true)
		expect(resumedRun.phases[0].items[0].completed).to.equal(true)
		expect(resumedRun.currentPhaseIndex).to.equal(0)
	})

	it("refreshes an active run when the stored phase layout no longer matches the current workflow definition", async () => {
		clearManagedWorkflowRegistryCache(cwd)

		const legacyWrapperRun: ManagedWorkflowRunState = {
			workflowId: "bmad-code-review",
			slashCommand: "bmad-code-review",
			status: "active",
			currentPhaseIndex: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			allRequiredComplete: false,
			phases: [
				{
					id: "workflow",
					title: "workflow",
					sourcePath: ".cline/skills/bmad-code-review/workflow.md",
					sourceContent: "# workflow",
					completed: false,
					items: [
						{
							id: "workflow::item-1",
							label: "Configuration Loading: project_name, planning_artifacts, implementation_artifacts, user_name",
							sourceText:
								"Configuration Loading: project_name, planning_artifacts, implementation_artifacts, user_name",
							completed: false,
						},
						{
							id: "workflow::item-2",
							label: "First Step Execution: First Step Execution",
							sourceText: "First Step Execution: First Step Execution",
							completed: false,
						},
					],
				},
			],
		}

		const { run: refreshedRun, resumed } = await startOrResumeManagedWorkflowRun(
			cwd,
			"bmad-code-review",
			legacyWrapperRun,
			"bmad-code-review",
		)

		expect(resumed).to.equal(false)
		expect(refreshedRun.phases).to.have.length(4)
		expect(refreshedRun.phases[0].sourcePath).to.equal(".cline/skills/bmad-code-review/steps/step-01-gather-context.md")
		expect(refreshedRun.phases[0].items.length).to.be.greaterThan(2)
	})

	it("rejects regular item completion for checkpoint items", async () => {
		clearManagedWorkflowRegistryCache(cwd)

		const run = await startManagedWorkflowRun(cwd, "bmad-code-review", "bmad-code-review")
		const checkpointItem = run.phases[0].items.find((item) => item.blocked)

		expect(checkpointItem).to.exist
		expect(() => completeManagedWorkflowItem(run, checkpointItem!.id)).to.throw(
			"is a checkpoint and cannot be completed as a regular workflow item",
		)
	})

	it("resolves checkpoint items through the checkpoint-specific workflow path", async () => {
		clearManagedWorkflowRegistryCache(cwd)

		const run = await startManagedWorkflowRun(cwd, "bmad-code-review", "bmad-code-review")
		const regularItemIds = run.phases[0].items.filter((item) => !item.blocked).map((item) => item.id)
		const checkpointItem = run.phases[0].items.find((item) => item.blocked)

		expect(checkpointItem).to.exist

		let updatedRun = run
		for (const itemId of regularItemIds) {
			updatedRun = completeManagedWorkflowItem(updatedRun, itemId)
		}

		updatedRun = resolveManagedWorkflowCheckpoint(updatedRun, checkpointItem!.id)

		expect(updatedRun.phases[0].items.find((item) => item.id === checkpointItem!.id)?.completed).to.equal(true)
		expect(updatedRun.currentPhaseIndex).to.equal(1)
		expect(updatedRun.phases[0].completed).to.equal(true)
	})

	it("prevents later items from bypassing an unresolved blocked checkpoint", () => {
		const run: ManagedWorkflowRunState = {
			workflowId: "synthetic-workflow",
			slashCommand: "synthetic-workflow",
			status: "active",
			currentPhaseIndex: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			allRequiredComplete: false,
			phases: [
				{
					id: "phase-1",
					title: "Phase 1",
					sourcePath: "phase-1.md",
					sourceContent: "# Phase 1",
					completed: false,
					items: [
						{ id: "phase-1::item-1", label: "Prep", sourceText: "Prep", completed: true },
						{
							id: "phase-1::checkpoint",
							label: "Wait for checkpoint",
							sourceText: "Wait for checkpoint",
							completed: false,
							blocked: true,
						},
						{ id: "phase-1::item-3", label: "After checkpoint", sourceText: "After checkpoint", completed: false },
					],
				},
			],
		}

		expect(() => completeManagedWorkflowItem(run, "phase-1::item-3")).to.throw(
			'not the active workflow item. Complete checkpoint "phase-1::checkpoint" first',
		)
	})

	it("prevents later required items from completing before the active workflow item", () => {
		const run: ManagedWorkflowRunState = {
			workflowId: "synthetic-workflow",
			slashCommand: "synthetic-workflow",
			status: "active",
			currentPhaseIndex: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			allRequiredComplete: false,
			phases: [
				{
					id: "phase-1",
					title: "Phase 1",
					sourcePath: "phase-1.md",
					sourceContent: "# Phase 1",
					completed: false,
					items: [
						{ id: "phase-1::item-1", label: "First", sourceText: "First", completed: false },
						{ id: "phase-1::item-2", label: "Second", sourceText: "Second", completed: false },
						{ id: "phase-1::item-3", label: "Third", sourceText: "Third", completed: false },
					],
				},
			],
		}

		expect(() => completeManagedWorkflowItem(run, "phase-1::item-3")).to.throw(
			'not the active workflow item. Complete "phase-1::item-1" first',
		)
	})

	it("moves to a terminal no-active-phase state after the last required item completes", () => {
		let run: ManagedWorkflowRunState = {
			workflowId: "synthetic-workflow",
			slashCommand: "synthetic-workflow",
			status: "active",
			currentPhaseIndex: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			allRequiredComplete: false,
			phases: [
				{
					id: "phase-1",
					title: "Phase 1",
					sourcePath: "phase-1.md",
					sourceContent: "# Phase 1",
					completed: false,
					items: [{ id: "phase-1::item-1", label: "Only item", sourceText: "Only item", completed: false }],
				},
			],
		}

		run = completeManagedWorkflowItem(run, "phase-1::item-1")

		expect(run.status).to.equal("completed")
		expect(run.allRequiredComplete).to.equal(true)
		expect(run.currentPhaseIndex).to.equal(run.phases.length)
		expect(buildManagedWorkflowPrompt(run)).to.contain("all required phases are complete")
		expect(buildManagedWorkflowPrompt(run)).to.contain(
			"ensure the final checkpoint has already been resolved through the workflow-native checkpoint path",
		)
	})

	it("does not allow duplicate completion of an already completed item", () => {
		const run: ManagedWorkflowRunState = {
			workflowId: "synthetic-workflow",
			slashCommand: "synthetic-workflow",
			status: "active",
			currentPhaseIndex: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			allRequiredComplete: false,
			phases: [
				{
					id: "phase-1",
					title: "Phase 1",
					sourcePath: "phase-1.md",
					sourceContent: "# Phase 1",
					completed: false,
					items: [{ id: "phase-1::item-1", label: "Only item", sourceText: "Only item", completed: true }],
				},
			],
		}

		expect(() => completeManagedWorkflowItem(run, "phase-1::item-1")).to.throw('Item "phase-1::item-1" is already complete')
	})

	it("treats advisory items as visible but non-blocking for workflow completion", () => {
		let run: ManagedWorkflowRunState = {
			workflowId: "synthetic-workflow",
			slashCommand: "synthetic-workflow",
			status: "active",
			currentPhaseIndex: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			allRequiredComplete: false,
			phases: [
				{
					id: "phase-1",
					title: "Phase 1",
					sourcePath: "phase-1.md",
					sourceContent: "# Phase 1",
					completed: false,
					items: [
						{ id: "phase-1::item-1", label: "Required item", sourceText: "Required item", completed: false },
						{
							id: "phase-1::item-2",
							label: "Advisory next step",
							sourceText: "Advisory next step",
							completed: false,
							required: false,
							advisory: true,
						},
					],
				},
			],
		}

		run = completeManagedWorkflowItem(run, "phase-1::item-1")

		expect(run.status).to.equal("completed")
		expect(run.allRequiredComplete).to.equal(true)
		expect(run.phases[0].items[1].completed).to.equal(false)
	})
})
