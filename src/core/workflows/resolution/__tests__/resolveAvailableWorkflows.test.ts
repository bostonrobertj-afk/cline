import { expect } from "chai"
import { describe, it } from "mocha"
import { createWorkflowSkillMetadata, resolveAvailableWorkflows, resolveWorkflowByName } from "../resolveAvailableWorkflows"

describe("resolveAvailableWorkflows", () => {
	it("applies managed then local then global then remote precedence", async () => {
		const workflows = await resolveAvailableWorkflows({
			cwd: process.cwd(),
			localWorkflowToggles: {
				"/workspace/shared-workflow.md": true,
				"/workspace/local-only.md": true,
			},
			globalWorkflowToggles: {
				"/global/shared-workflow.md": true,
				"/global/global-only.md": true,
			},
			remoteWorkflowToggles: {},
			remoteWorkflows: [
				{ name: "shared-workflow.md", contents: "remote shared", alwaysEnabled: true },
				{ name: "remote-only", contents: "remote only", alwaysEnabled: true },
			],
		})

		expect(workflows.map((workflow) => workflow.name)).to.include("bmad-code-review")
		expect(workflows.filter((workflow) => workflow.name === "shared-workflow.md")).to.have.length(1)
		expect(workflows.find((workflow) => workflow.name === "shared-workflow.md")?.source).to.equal("local")
		expect(workflows.find((workflow) => workflow.name === "global-only.md")?.source).to.equal("global")
		expect(workflows.find((workflow) => workflow.name === "remote-only")?.source).to.equal("remote")
	})

	it("resolves managed workflows by slash command, skill name, and alias", async () => {
		const bySlash = await resolveWorkflowByName({ cwd: process.cwd() }, "bmad-code-review")
		const bySkill = await resolveWorkflowByName({ cwd: process.cwd() }, "bmad-problem-solving")

		expect(bySlash?.source).to.equal("managed")
		expect(bySlash?.workflowId).to.equal("bmad-code-review")
		expect(bySkill?.source).to.equal("managed")
		expect(bySkill?.workflowId).to.equal("bmad-cis-problem-solving")
	})

	it("creates prompt-visible workflow metadata without changing source semantics", async () => {
		const metadata = createWorkflowSkillMetadata([
			{
				name: "workspace-flow.md",
				source: "local",
				description: "Workspace workflow: workspace-flow.md",
				fileName: "workspace-flow.md",
				fullPath: "/workspace/workspace-flow.md",
			},
			{
				name: "remote-flow",
				source: "remote",
				description: "Remote workflow: remote-flow",
				fileName: "remote-flow",
				contents: "# remote",
			},
		])

		expect(metadata).to.deep.equal([
			{
				name: "workspace-flow.md",
				description: "Workspace workflow: workspace-flow.md",
				path: "/workspace/workspace-flow.md",
				source: "project",
			},
			{
				name: "remote-flow",
				description: "Remote workflow: remote-flow",
				path: "remote-workflow://remote-flow",
				source: "global",
			},
		])
	})
})
