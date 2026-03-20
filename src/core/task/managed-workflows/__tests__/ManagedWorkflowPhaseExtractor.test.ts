import { expect } from "chai"
import { describe, it } from "mocha"
import { extractManagedWorkflowPhases } from "../ManagedWorkflowPhaseExtractor"
import { clearManagedWorkflowRegistryCache, getManagedWorkflowDefinition } from "../ManagedWorkflowRegistry"

describe("ManagedWorkflowPhaseExtractor", () => {
	const cwd = process.cwd()

	it("extracts detailed numbered-heading items for bmad-create-prd discovery", async () => {
		clearManagedWorkflowRegistryCache(cwd)
		const workflow = await getManagedWorkflowDefinition(cwd, "bmad-create-prd")
		const phases = await extractManagedWorkflowPhases(cwd, workflow!)
		const discoveryPhase = phases.find((phase) => phase.id === "step-02-discovery")

		expect(discoveryPhase).to.exist
		expect(discoveryPhase!.items.length).to.be.greaterThan(8)
		expect(discoveryPhase!.items.some((item) => item.label.includes("Check Document State"))).to.equal(true)
		expect(discoveryPhase!.items.some((item) => item.label.includes("Load Classification Data"))).to.equal(true)
	})

	it("extracts multiple step-driven items for bmad-review-edge-case-hunter", async () => {
		clearManagedWorkflowRegistryCache(cwd)
		const workflow = await getManagedWorkflowDefinition(cwd, "bmad-review-edge-case-hunter")
		const phases = await extractManagedWorkflowPhases(cwd, workflow!)

		expect(phases).to.have.length(1)
		expect(phases[0].items.length).to.be.greaterThan(4)
		expect(phases[0].items.some((item) => item.label.includes("Receive Content"))).to.equal(true)
		expect(phases[0].items.some((item) => item.label.includes("Present Findings"))).to.equal(true)
	})

	it("extracts workflow-step items for bmad-sprint-status instead of collapsing to one item", async () => {
		clearManagedWorkflowRegistryCache(cwd)
		const workflow = await getManagedWorkflowDefinition(cwd, "bmad-sprint-status")
		const phases = await extractManagedWorkflowPhases(cwd, workflow!)

		expect(phases).to.have.length(1)
		expect(phases[0].items.length).to.be.greaterThan(8)
		expect(phases[0].items.some((item) => item.label.includes("Determine execution mode"))).to.equal(true)
		expect(phases[0].items.some((item) => item.label.includes('Persist "next_workflow_id"'))).to.equal(true)
		expect(phases[0].items.some((item) => item.label.includes("Display summary: Produce output -"))).to.equal(true)
		expect(phases[0].items.some((item) => item.label.startsWith("Data mode output:"))).to.equal(false)
		expect(phases[0].items.some((item) => item.label.startsWith("Validate sprint-status file:"))).to.equal(false)
		expect(phases[0].items.some((item) => item.label.includes("Jump to Step 20"))).to.equal(false)
		expect(phases[0].items.some((item) => item.label.includes("Jump to Step 30"))).to.equal(false)
	})

	it("uses the document-project instructions router rather than the thin wrapper workflow file", async () => {
		clearManagedWorkflowRegistryCache(cwd)
		const workflow = await getManagedWorkflowDefinition(cwd, "bmad-document-project")
		const phases = await extractManagedWorkflowPhases(cwd, workflow!)

		expect(workflow!.workflowPath).to.equal(".cline/skills/bmad-document-project/instructions.md")
		expect(phases).to.have.length(1)
		expect(phases[0].sourcePath).to.equal(".cline/skills/bmad-document-project/instructions.md")
		expect(phases[0].items.length).to.be.greaterThan(4)
	})

	it("marks ux design next-step guidance as advisory when extracted", async () => {
		clearManagedWorkflowRegistryCache(cwd)
		const workflow = await getManagedWorkflowDefinition(cwd, "bmad-create-ux-design")
		const phases = await extractManagedWorkflowPhases(cwd, workflow!)
		const completionPhase = phases.find((phase) => phase.id === "step-14-complete")

		expect(completionPhase).to.exist
		const advisoryOptions = completionPhase!.items.filter((item) =>
			/Wireframe Generation|Interactive Prototype|Figma Visual Design/i.test(item.label),
		)
		for (const item of advisoryOptions) {
			expect(item.required).to.equal(false)
			expect(item.advisory).to.equal(true)
		}
	})
})
