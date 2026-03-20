import { expect } from "chai"
import { describe, it } from "mocha"
import {
	completeManagedWorkflowItem,
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

		const firstPhaseItemIds = run.phases[0].items.map((item) => item.id)

		run = completeManagedWorkflowItem(run, firstPhaseItemIds[0])
		expect(run.currentPhaseIndex).to.equal(0)
		expect(run.phases[0].completed).to.equal(false)

		for (const itemId of firstPhaseItemIds.slice(1, -1)) {
			run = completeManagedWorkflowItem(run, itemId)
		}

		run = completeManagedWorkflowItem(run, firstPhaseItemIds[firstPhaseItemIds.length - 1])

		expect(run.currentPhaseIndex).to.equal(1)
		expect(run.phases[0].completed).to.equal(true)
		expect(run.phases[1].sourcePath).to.equal(".cline/skills/bmad-code-review/steps/step-02-review.md")
	})

	it("falls back to the authored skill file when a managed workflow does not ship a separate workflow.md", async () => {
		clearManagedWorkflowRegistryCache(cwd)

		const run = await startManagedWorkflowRun(cwd, "bmad-distillator", "bmad-distillator")
		const renderedChecklist = renderManagedWorkflowTaskProgress(run)

		expect(run.phases).to.have.length(1)
		expect(run.phases[0].sourcePath).to.equal(".cline/skills/bmad-distillator/SKILL.md")
		expect(run.phases[0].items.length).to.be.greaterThan(1)
		expect(renderedChecklist).to.contain("Validate inputs.")
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

	it("prevents checkpoint items from completing before earlier required items are done", async () => {
		clearManagedWorkflowRegistryCache(cwd)

		const run = await startManagedWorkflowRun(cwd, "bmad-code-review", "bmad-code-review")
		const checkpointItem = run.phases[0].items.find((item) => item.blocked)

		expect(checkpointItem).to.exist
		expect(() => completeManagedWorkflowItem(run, checkpointItem!.id)).to.throw(
			`not the active workflow item. Complete "${run.phases[0].items[0].id}" first`,
		)
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
