import fs from "fs/promises"
import path from "path"

type WorkflowReminderEntry = {
	purpose: string
}

type WorkflowReminderConfig = Record<string, WorkflowReminderEntry>

const WORKFLOW_REMINDERS_PATH = path.join("_bmad", "_config", "workflow-reminders.json")

export async function getBmadWorkflowReminder(cwd: string, workflowId: string): Promise<string | undefined> {
	try {
		const remindersPath = path.resolve(cwd, WORKFLOW_REMINDERS_PATH)
		const raw = await fs.readFile(remindersPath, "utf8")
		const config = JSON.parse(raw) as WorkflowReminderConfig
		const entry = config[workflowId]
		if (!entry) {
			return undefined
		}

		return `<active_bmad_workflow workflow_id="${workflowId}">
The active BMAD workflow for this task is ${workflowId}.
${entry.purpose}
</active_bmad_workflow>`
	} catch {
		return undefined
	}
}
