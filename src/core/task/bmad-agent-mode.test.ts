import { expect } from "chai"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { getBmadWorkflowReminder } from "./bmad-agent-mode"

describe("bmad-agent-mode", () => {
	const tempDirs: string[] = []

	async function makeWorkspaceWithWorkflowReminders(reminders: Record<string, { purpose: string }>): Promise<string> {
		const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "bmad-workflow-reminder-"))
		tempDirs.push(workspaceDir)

		const configDir = path.join(workspaceDir, "_bmad", "_config")
		await fs.mkdir(configDir, { recursive: true })
		await fs.writeFile(path.join(configDir, "workflow-reminders.json"), JSON.stringify(reminders, null, 2), "utf8")

		return workspaceDir
	}

	afterEach(async () => {
		await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })))
	})

	it("returns a reminder block for configured managed workflows", async () => {
		const workspaceDir = await makeWorkspaceWithWorkflowReminders({
			"bmad-code-review": {
				purpose: "Review the implementation against the active checklist before moving forward.",
			},
		})

		const reminder = await getBmadWorkflowReminder(workspaceDir, "bmad-code-review")

		expect(reminder).to.include('<active_bmad_workflow workflow_id="bmad-code-review">')
		expect(reminder).to.include("The active BMAD workflow for this task is bmad-code-review.")
		expect(reminder).to.include("Review the implementation against the active checklist before moving forward.")
	})

	it("returns undefined when the workflow is not present in the reminder config", async () => {
		const workspaceDir = await makeWorkspaceWithWorkflowReminders({
			"bmad-code-review": {
				purpose: "Review the implementation against the active checklist before moving forward.",
			},
		})

		const reminder = await getBmadWorkflowReminder(workspaceDir, "bmad-review-edge-case-hunter")

		expect(reminder).to.equal(undefined)
	})

	it("returns undefined when the reminder file is missing", async () => {
		const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "bmad-workflow-reminder-missing-"))
		tempDirs.push(workspaceDir)

		const reminder = await getBmadWorkflowReminder(workspaceDir, "bmad-code-review")

		expect(reminder).to.equal(undefined)
	})
})
