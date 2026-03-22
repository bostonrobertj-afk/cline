import { expect } from "chai"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { getBuiltinBmadAgentAllowlist, getOwningBmadAgentForSkill } from "../bmad-agent-mode"

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

const EXPECTED_WORKFLOW_AGENT_ENTRIES: Record<(typeof ADDED_MANAGED_WORKFLOWS)[number], string[]> = {
	"bmad-brainstorming": ["bmad-analyst"],
	"bmad-domain-research": ["bmad-analyst"],
	"bmad-editorial-review-prose": ["bmad-tech-writer"],
	"bmad-editorial-review-structure": ["bmad-tech-writer"],
	"bmad-generate-project-context": ["bmad-analyst"],
	"bmad-index-docs": ["bmad-tech-writer"],
	"bmad-market-research": ["bmad-analyst"],
	"bmad-party-mode": [
		"bmad-analyst",
		"bmad-pm",
		"bmad-architect",
		"bmad-ux-designer",
		"bmad-sm",
		"bmad-dev",
		"bmad-qa",
		"bmad-tea",
		"bmad-tech-writer",
		"bmad-quick-flow-solo-dev",
	],
	"bmad-qa-generate-e2e-tests": ["bmad-qa"],
	"bmad-quick-dev-new-preview": ["bmad-quick-flow-solo-dev"],
	"bmad-quick-spec": ["bmad-quick-flow-solo-dev"],
	"bmad-retrospective": ["bmad-sm"],
	"bmad-shard-doc": ["bmad-tech-writer"],
	"bmad-teach-me-testing": ["bmad-tea"],
	"bmad-technical-research": ["bmad-analyst"],
	"bmad-validate-prd": ["bmad-pm"],
}

const UNIQUE_OWNER_WORKFLOWS = Object.fromEntries(
	Object.entries(EXPECTED_WORKFLOW_AGENT_ENTRIES).filter(([, agents]) => agents.length === 1),
) as Record<string, string[]>

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

function buildWorkflowAgentIndex(agents: ReadonlyArray<{ id: string; allowedSkills: string[] }>): Map<string, string[]> {
	const byWorkflow = new Map<string, string[]>()

	for (const agent of agents) {
		for (const skill of agent.allowedSkills) {
			const current = byWorkflow.get(skill) ?? []
			current.push(agent.id)
			byWorkflow.set(skill, current)
		}
	}

	for (const [skill, agentIds] of byWorkflow.entries()) {
		byWorkflow.set(
			skill,
			agentIds.sort((left, right) => left.localeCompare(right)),
		)
	}

	return byWorkflow
}

describe("managed workflow registry and agent coverage", () => {
	const repoRoot = getRepoRoot()
	const tempDirs: string[] = []

	afterEach(async () => {
		await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
	})

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

	it("keeps configured and builtin agent allowlists aligned for every newly managed workflow", async () => {
		const allowlistPath = path.join(repoRoot, "_bmad", "_config", "agent-workflow-allowlist.json")
		const configured = JSON.parse(await fs.readFile(allowlistPath, "utf8")) as {
			agents: Array<{ id: string; allowedSkills: string[] }>
		}

		const configuredIndex = buildWorkflowAgentIndex(configured.agents)
		const builtinIndex = buildWorkflowAgentIndex(getBuiltinBmadAgentAllowlist())

		for (const [workflowId, expectedAgents] of Object.entries(EXPECTED_WORKFLOW_AGENT_ENTRIES)) {
			const sortedExpectedAgents = [...expectedAgents].sort((left, right) => left.localeCompare(right))
			expect(configuredIndex.get(workflowId) ?? [], `configured allowlist coverage for ${workflowId}`).to.deep.equal(
				sortedExpectedAgents,
			)
			expect(builtinIndex.get(workflowId) ?? [], `builtin allowlist coverage for ${workflowId}`).to.deep.equal(
				sortedExpectedAgents,
			)
		}
	})

	it("returns the expected unique owning agent for newly managed workflows that should auto-bind to one agent", async () => {
		const tempWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), "managed-workflow-owner-"))
		tempDirs.push(tempWorkspace)

		for (const [workflowId, [expectedOwner]] of Object.entries(UNIQUE_OWNER_WORKFLOWS)) {
			const owner = await getOwningBmadAgentForSkill(tempWorkspace, workflowId)
			expect(owner?.id, `unique owning agent for ${workflowId}`).to.equal(expectedOwner)
		}

		const sharedWorkflowOwner = await getOwningBmadAgentForSkill(tempWorkspace, "bmad-party-mode")
		expect(sharedWorkflowOwner).to.equal(undefined)
	})
})
