import { expect } from "chai"
import fs from "fs/promises"
import { describe, it } from "mocha"
import os from "os"
import path from "path"
import { extractManagedWorkflowPhases } from "../ManagedWorkflowPhaseExtractor"
import { clearManagedWorkflowRegistryCache, getManagedWorkflowDefinition } from "../ManagedWorkflowRegistry"

describe("ManagedWorkflowPhaseExtractor", () => {
	const cwd = process.cwd()

	it("extracts step-only checklist items for the converted bmad-code-review gather-context phase", async () => {
		clearManagedWorkflowRegistryCache(cwd)
		const workflow = await getManagedWorkflowDefinition(cwd, "bmad-code-review")
		const phases = await extractManagedWorkflowPhases(cwd, workflow!)
		const gatherContextPhase = phases.find((phase) => phase.id === "step-01-gather-context")

		expect(gatherContextPhase).to.exist
		expect(gatherContextPhase!.execution?.steps).to.have.length(4)
		expect(gatherContextPhase!.items.map((item) => item.label)).to.deep.equal([
			"Determine the review target",
			"Construct {diff_output} from the chosen source",
			"Load spec and context documents when available",
			"Check review size and confirm readiness",
			"Halt after presenting the summary and wait for the user to confirm that review should proceed.",
		])
		expect(gatherContextPhase!.items.some((item) => item.label.includes("staged changes"))).to.equal(false)
		expect(gatherContextPhase!.execution?.steps[0]?.instructions.some((node) => node.type === "branch")).to.equal(true)
		expect(gatherContextPhase!.checkpointText).to.contain("Halt after presenting the summary")
	})

	it("preserves workflow placeholders during extraction instead of stripping them from step content", async () => {
		clearManagedWorkflowRegistryCache(cwd)
		const workflow = await getManagedWorkflowDefinition(cwd, "bmad-code-review")
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "managed-workflow-placeholder-extraction-"))

		try {
			const phaseRoot = path.join(tempRoot, ".cline", "skills", "bmad-code-review", "steps")
			await fs.mkdir(phaseRoot, { recursive: true })
			await fs.writeFile(
				path.join(phaseRoot, "step-01-gather-context.md"),
				[
					"# Gather Context",
					"",
					"## EXECUTION",
					"",
					'<step n="1" goal="Load {{research_topic}} for {project_name}">',
					"  <action>Review {{research_topic}} in {project_name}</action>",
					"</step>",
				].join("\n"),
				"utf8",
			)

			const phases = await extractManagedWorkflowPhases(tempRoot, workflow!)
			expect(phases).to.have.length(1)
			expect(phases[0].execution?.steps[0]?.goal).to.equal("Load {{research_topic}} for {project_name}")
			expect(phases[0].execution?.steps[0]?.instructions[0]?.text).to.equal("Review {{research_topic}} in {project_name}")
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true })
		}
	})

	it("preserves branch and detail content without turning them into sprint-status checklist rows", async () => {
		clearManagedWorkflowRegistryCache(cwd)
		const workflow = await getManagedWorkflowDefinition(cwd, "bmad-sprint-status")
		const phases = await extractManagedWorkflowPhases(cwd, workflow!)

		expect(phases).to.have.length(1)
		expect(phases[0].execution?.steps).to.have.length(6)
		expect(phases[0].items.map((item) => item.label)).to.deep.equal([
			"Determine execution mode and route to the matching path",
			"Load context and locate the sprint status file",
			"Read, classify, and validate sprint status",
			"Select the next workflow recommendation",
			"Display the sprint summary",
			"Present interactive action options and close cleanly",
			"Stop before advancing whenever the sprint status file is missing, a status value must be corrected, or the user must choose an action.",
		])
		expect(phases[0].items.some((item) => item.label.includes("Data mode output"))).to.equal(false)
		expect(phases[0].items.some((item) => item.label.includes("next_workflow_id"))).to.equal(false)
		expect(phases[0].execution?.steps[1]?.instructions.some((node) => node.type === "branch")).to.equal(true)
	})

	it("parses branch-based starter presentation guidance as step detail rather than checklist rows", async () => {
		clearManagedWorkflowRegistryCache(cwd)
		const workflow = await getManagedWorkflowDefinition(cwd, "bmad-create-architecture")
		const phases = await extractManagedWorkflowPhases(cwd, workflow!)
		const starterPhase = phases.find((phase) => phase.id === "step-03-starter")

		expect(starterPhase).to.exist
		const starterPresentation = starterPhase!.execution?.steps.find((step) => step.number === 3)
		expect(starterPresentation).to.exist
		expect(starterPresentation!.goal).to.equal("Present the starter recommendation")
		expect(starterPresentation!.instructions.filter((node) => node.type === "branch")).to.have.length(3)
		expect(starterPhase!.items.some((item) => item.label.includes("well-maintained starter"))).to.equal(false)
	})

	it("does not silently fall back to workflow.md when an explicit phase-root workflow is missing its step files", async () => {
		const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "managed-workflow-phase-roots-"))
		const workflow = await getManagedWorkflowDefinition(cwd, "bmad-code-review")

		try {
			await fs.mkdir(path.join(tempRoot, "_bmad", "_config"), { recursive: true })
			await fs.writeFile(
				path.join(tempRoot, "_bmad", "_config", "managed-workflows.json"),
				JSON.stringify([workflow], null, 2),
				"utf8",
			)
			await fs.mkdir(path.join(tempRoot, ".cline", "skills", "bmad-code-review"), { recursive: true })
			await fs.writeFile(
				path.join(tempRoot, ".cline", "skills", "bmad-code-review", "workflow.md"),
				'# workflow\n\n## EXECUTION\n\n<step n="1" goal="Wrapper only"><action>Wrapper action</action></step>\n',
				"utf8",
			)

			let thrownError: unknown
			try {
				await extractManagedWorkflowPhases(tempRoot, workflow!)
			} catch (error) {
				thrownError = error
			}

			expect(thrownError).to.be.instanceOf(Error)
			expect((thrownError as Error).message).to.match(
				/configured with explicit phase roots .* but no phase markdown files were found/i,
			)
		} finally {
			await fs.rm(tempRoot, { recursive: true, force: true })
		}
	})
})
