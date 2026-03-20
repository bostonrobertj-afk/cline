import { expect } from "chai"
import fs from "fs/promises"
import os from "os"
import path from "path"
import type { SkillMetadata } from "@/shared/skills"
import {
	buildBmadAgentActivationInstructions,
	buildBmadAgentReminder,
	filterSkillsForBmadAgentMode,
	getOwningBmadAgentForSkill,
	isSkillAllowedForBmadAgent,
	resolveBmadAgentActivation,
} from "./bmad-agent-mode"

describe("bmad-agent-mode", () => {
	const tempDirs: string[] = []

	async function makeWorkspaceWithSkill(skillName: string): Promise<string> {
		const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "bmad-agent-mode-"))
		tempDirs.push(workspaceDir)

		const skillDir = path.join(workspaceDir, ".cline", "skills", skillName)
		await fs.mkdir(skillDir, { recursive: true })
		await fs.writeFile(
			path.join(skillDir, "SKILL.md"),
			`---
name: ${skillName}
description: Test wrapper skill
---

You must fully embody this test BMAD skill wrapper.`,
			"utf8",
		)

		return workspaceDir
	}

	async function makeWorkspaceWithSkillAndReferencedPersona(skillName: string): Promise<string> {
		const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "bmad-agent-mode-docs-"))
		tempDirs.push(workspaceDir)

		const skillDir = path.join(workspaceDir, ".cline", "skills", skillName)
		await fs.mkdir(skillDir, { recursive: true })
		await fs.writeFile(
			path.join(skillDir, "SKILL.md"),
			`---
name: ${skillName}
description: Test wrapper skill
---

You must fully embody this test BMAD skill wrapper.
Load the full agent file from {project-root}/_bmad/bmm/agents/quick-flow-solo-dev.md and follow it exactly.`,
			"utf8",
		)

		const personaPath = path.join(workspaceDir, "_bmad", "bmm", "agents")
		await fs.mkdir(personaPath, { recursive: true })
		await fs.writeFile(
			path.join(personaPath, "quick-flow-solo-dev.md"),
			`name: "quick flow solo dev"

You must fully embody this test BMAD skill wrapper.

<agent id="quick-flow-solo-dev.agent.yaml" name="Barry">
  <activation>
    <step n="1">Load config</step>
  </activation>
</agent>`,
			"utf8",
		)

		return workspaceDir
	}

	afterEach(async () => {
		await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
	})

	it("resolves preferred alias commands using builtin BMAD fallback metadata when the wrapper skill is installed", async () => {
		const workspaceDir = await makeWorkspaceWithSkill("bmad-quick-flow-solo-dev")

		const activation = await resolveBmadAgentActivation(workspaceDir, "bmad-agent-bmm-quick-flow-solo-dev")

		expect(activation).to.deep.include({
			skillName: "bmad-quick-flow-solo-dev",
			invokedSlashCommand: "bmad-agent-bmm-quick-flow-solo-dev",
			preferredActivationCommand: "bmad-agent-bmm-quick-flow-solo-dev",
		})
		expect(activation?.agent.id).to.equal("bmad-quick-flow-solo-dev")
		expect(activation?.agent.allowedSkills).to.deep.equal([
			"bmad-quick-spec",
			"bmad-quick-dev",
			"bmad-quick-dev-new-preview",
			"bmad-party-mode",
		])
	})

	it("builds activation instructions from the installed BMAD wrapper skill when no workspace allowlist file exists", async () => {
		const workspaceDir = await makeWorkspaceWithSkill("bmad-quick-flow-solo-dev")

		const instructions = await buildBmadAgentActivationInstructions(workspaceDir, "bmad-quick-flow-solo-dev", {
			skillName: "bmad-quick-flow-solo-dev",
			activatedSlashCommand: "bmad-agent-bmm-quick-flow-solo-dev",
		})

		expect(instructions).to.include('skill_name="bmad-quick-flow-solo-dev"')
		expect(instructions).to.include('slash_command="/bmad-agent-bmm-quick-flow-solo-dev"')
		expect(instructions).to.include("<installed_bmad_skill_activation")
		expect(instructions).to.include("<installed_bmad_skill_instructions")
		expect(instructions).to.include("You must fully embody this test BMAD skill wrapper.")
	})

	it("uses a compact activation wrapper when the installed BMAD skill loads a persona document", async () => {
		const workspaceDir = await makeWorkspaceWithSkillAndReferencedPersona("bmad-quick-flow-solo-dev")

		const instructions = await buildBmadAgentActivationInstructions(workspaceDir, "bmad-quick-flow-solo-dev", {
			skillName: "bmad-quick-flow-solo-dev",
			activatedSlashCommand: "bmad-agent-bmm-quick-flow-solo-dev",
		})

		expect(instructions).to.include("<installed_bmad_skill_activation")
		expect(instructions).to.include("Treat the loaded document below as the primary source of truth")
		expect(instructions).to.include('<document path="_bmad/bmm/agents/quick-flow-solo-dev.md">')
		expect(instructions).to.not.include("<installed_bmad_skill_wrapper")
		expect(instructions).to.not.include("<installed_bmad_skill_instructions")
		expect(instructions?.match(/You must fully embody this test BMAD skill wrapper\./g)?.length).to.equal(1)
	})

	it("marks follow-up reminder turns as still active while distinguishing them from initial activation", async () => {
		const workspaceDir = await makeWorkspaceWithSkill("bmad-dev")
		const activation = await resolveBmadAgentActivation(workspaceDir, "bmad-agent-bmm-dev")

		expect(activation).to.not.equal(null)

		const reminder = buildBmadAgentReminder(activation!.agent, {
			skillName: activation!.skillName,
			activatedSlashCommand: activation!.preferredActivationCommand,
		})

		expect(reminder).to.include('<active_bmad_agent activated="true" reminder="true"')
		expect(reminder).to.not.include('activated="false"')
		expect(reminder).to.include("Remain in this persona until /bmad-exit.")
	})

	describe("filterSkillsForBmadAgentMode", () => {
		const enabledSkills: SkillMetadata[] = [
			{ name: "bmad-help", description: "help", path: "/skills/bmad-help/SKILL.md", source: "project" },
			{ name: "bmad-quick-spec", description: "quick spec", path: "/skills/bmad-quick-spec/SKILL.md", source: "project" },
			{ name: "bmad-quick-dev", description: "quick dev", path: "/skills/bmad-quick-dev/SKILL.md", source: "project" },
			{
				name: "bmad-market-research",
				description: "market research",
				path: "/skills/bmad-market-research/SKILL.md",
				source: "project",
			},
		]

		it("returns all enabled skills when no BMAD agent is active", () => {
			expect(filterSkillsForBmadAgentMode(enabledSkills, undefined).map((skill) => skill.name)).to.deep.equal([
				"bmad-help",
				"bmad-quick-spec",
				"bmad-quick-dev",
				"bmad-market-research",
			])
		})

		it("restricts active BMAD turns to the agent's allowed skills plus bmad-help", () => {
			expect(
				filterSkillsForBmadAgentMode(enabledSkills, {
					allowedSkills: ["bmad-quick-spec", "bmad-quick-dev"],
				}).map((skill) => skill.name),
			).to.deep.equal(["bmad-help", "bmad-quick-spec", "bmad-quick-dev"])
		})

		it("falls back to only always-allowed BMAD skills when the active agent cannot be resolved", () => {
			expect(filterSkillsForBmadAgentMode(enabledSkills, null).map((skill) => skill.name)).to.deep.equal(["bmad-help"])
		})
	})

	describe("workflow ownership and permission helpers", () => {
		it("infers the owning BMAD agent for uniquely-allowed managed workflows", async () => {
			const workspaceDir = await makeWorkspaceWithSkill("bmad-dev")

			const owner = await getOwningBmadAgentForSkill(workspaceDir, "bmad-code-review")

			expect(owner?.id).to.equal("bmad-dev")
		})

		it("treats bmad-help as agent-agnostic for ownership resolution", async () => {
			const workspaceDir = await makeWorkspaceWithSkill("bmad-dev")

			const owner = await getOwningBmadAgentForSkill(workspaceDir, "bmad-help")

			expect(owner).to.equal(undefined)
		})

		it("allows bmad-help for any active BMAD agent", () => {
			expect(
				isSkillAllowedForBmadAgent(
					{
						allowedSkills: ["bmad-dev-story", "bmad-code-review"],
					},
					"bmad-help",
				),
			).to.equal(true)
		})
	})
})
