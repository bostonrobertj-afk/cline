import { expect } from "chai"
import fs from "fs/promises"
import path from "path"

const ADDED_MANAGED_WORKFLOWS = [
	"bmad-brainstorming",
	"bmad-domain-research",
	"bmad-editorial-review-prose",
	"bmad-editorial-review-structure",
	"bmad-generate-project-context",
	"bmad-index-docs",
	"bmad-market-research",
	"bmad-party-mode",
	"bmad-qa-generate-e2e-tests",
	"bmad-quick-dev-new-preview",
	"bmad-quick-spec",
	"bmad-retrospective",
	"bmad-shard-doc",
	"bmad-teach-me-testing",
	"bmad-technical-research",
	"bmad-validate-prd",
] as const

function getRepoRoot(): string {
	return path.resolve(__dirname, "../../../..")
}

async function listInScopeWorkflowIds(repoRoot: string): Promise<string[]> {
	const skillsRoot = path.join(repoRoot, ".cline", "skills")
	const entries = await fs.readdir(skillsRoot, { withFileTypes: true })
	const workflows: string[] = []

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue
		}

		const name = entry.name
		if (!name.startsWith("bmad-")) {
			continue
		}
		if (name.startsWith("bmad-testarch") || name.startsWith("bmad-wds")) {
			continue
		}

		try {
			const stat = await fs.stat(path.join(skillsRoot, name, "workflow.md"))
			if (stat.isFile()) {
				workflows.push(name)
			}
		} catch {
			// Non-workflow skill directories are intentionally ignored.
		}
	}

	return workflows.sort((left, right) => left.localeCompare(right))
}

describe("managed workflow registry and agent coverage", () => {
	const repoRoot = getRepoRoot()

	it("registers every in-scope bmad workflow for managed execution", async () => {
		const inScopeWorkflowIds = await listInScopeWorkflowIds(repoRoot)
		const registryPath = path.join(repoRoot, "_bmad", "_config", "managed-workflows.json")
		const registry = JSON.parse(await fs.readFile(registryPath, "utf8")) as Array<{
			workflowId: string
			supportsManagedExecution: boolean
		}>

		const managedIds = new Set(registry.filter((entry) => entry.supportsManagedExecution).map((entry) => entry.workflowId))
		const missing = inScopeWorkflowIds.filter((workflowId) => !managedIds.has(workflowId))

		expect(missing).to.deep.equal([])
		expect(ADDED_MANAGED_WORKFLOWS.filter((workflowId) => !managedIds.has(workflowId))).to.deep.equal([])
	})
})
