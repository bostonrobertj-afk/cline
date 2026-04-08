import { expect } from "chai"
import fs from "fs"
import { describe, it } from "mocha"
import path from "path"
import { buildWorkflowStartCardPayload } from "../buildWorkflowStartCardPayload"
import { getWorkflowStartCardRegistryEntry } from "../WorkflowStartCardRegistry"

function parseWorkflowStartMessagesReference() {
	const repoRoot = path.resolve(__dirname, "../../../../../")
	const referencePath = path.join(repoRoot, "docs/workflow-automation/workflow-start-card/workflow-start-messages.md")
	const contents = fs.readFileSync(referencePath, "utf8")
	const lines = contents.split(/\r?\n/)
	const entries: Array<{ workflowName: string; markdownBody: string }> = []

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index]

		if (!line.endsWith(":") || line.startsWith("Message: ")) {
			continue
		}

		const messageLine = lines[index + 1]

		if (!messageLine?.startsWith("Message: ")) {
			throw new Error(`Missing Message: line after heading: ${line}`)
		}

		entries.push({
			workflowName: `${line.slice(0, -1)}.md`,
			markdownBody: messageLine.slice("Message: ".length),
		})
		index += 1
	}

	return entries
}

describe("workflow-start-card/WorkflowStartCardRegistry", () => {
	it("returns a registry entry for every approved workflow-start message with exact body alignment", () => {
		const entries = parseWorkflowStartMessagesReference()

		expect(entries.length).to.equal(43)
		for (const entry of entries) {
			expect(getWorkflowStartCardRegistryEntry(entry.workflowName)).to.deep.equal(entry)
		}
	})

	it("builds workflow-start-card payloads with generated titles and the fixed CTA label", () => {
		const quickSpecPayload = buildWorkflowStartCardPayload({
			sessionId: "session-quick-spec",
			workflowName: "quick-spec.md",
			markdownBody: "Quick spec body",
		})
		const createStoryPayload = buildWorkflowStartCardPayload({
			sessionId: "session-create-story",
			workflowName: "create-story.md",
			markdownBody: "Create story body",
		})

		expect(quickSpecPayload.title).to.equal("Welcome to the Quick Spec Workflow!")
		expect(createStoryPayload.title).to.equal("Welcome to the Create Story Workflow!")
		expect(quickSpecPayload.ctaLabel).to.equal("Get Started")
		expect(getWorkflowStartCardRegistryEntry("nonexistent-workflow.md")).to.equal(undefined)
	})
})
