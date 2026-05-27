import { afterEach, describe, it } from "mocha"
import "should"
import * as sinon from "sinon"
import * as WorkflowRegistry from "@/core/task/workflow-runtime/WorkflowRegistry"
import { Controller } from "../core/controller"
import { getAvailableSlashCommands } from "../core/controller/slash/getAvailableSlashCommands"
import { EmptyRequest } from "../shared/proto/cline/common"
import { BASE_SLASH_COMMANDS, VSCODE_ONLY_COMMANDS } from "../shared/slashCommands"

async function getResponse() {
	return getAvailableSlashCommands({} as Controller, EmptyRequest.create())
}

describe("getAvailableSlashCommands", () => {
	afterEach(() => {
		sinon.restore()
	})

	it("returns all base slash commands", async () => {
		const response = await getResponse()

		response.commands.length.should.be.greaterThanOrEqual(BASE_SLASH_COMMANDS.length)

		for (const baseCmd of BASE_SLASH_COMMANDS) {
			const found = response.commands.find((cmd) => cmd.name === baseCmd.name)
			found!.should.not.be.undefined()
			found!.description.should.equal(baseCmd.description)
			found!.section.should.equal("default")
			found!.cliCompatible.should.equal(baseCmd.cliCompatible ?? false)
		}
	})

	it("does not include the deprecated subagent slash command", async () => {
		const response = await getResponse()
		const deprecatedCommand = response.commands.find((cmd) => cmd.name === "subagent")

		;(deprecatedCommand === undefined).should.be.true()
	})

	it("does not advertise retired BMAD persona slash commands bmad-agent-bmm-dev, bmad-dev, and bmad-exit", async () => {
		const response = await getResponse()
		const retiredCommands = ["bmad-agent-bmm-dev", "bmad-dev", "bmad-exit"]

		for (const retiredCommand of retiredCommands) {
			const found = response.commands.find((cmd) => cmd.name === retiredCommand)
			;(found === undefined).should.be.true()
		}
	})

	it('marks base commands with section "default"', async () => {
		const response = await getResponse()
		const baseCommandNames = BASE_SLASH_COMMANDS.map((cmd) => cmd.name)

		for (const cmd of response.commands) {
			if (baseCommandNames.includes(cmd.name)) {
				cmd.section.should.equal("default")
			}
		}
	})

	it("includes VS Code-only slash commands in the backend response", async () => {
		const response = await getResponse()

		for (const vscodeCmd of VSCODE_ONLY_COMMANDS) {
			const found = response.commands.find((cmd) => cmd.name === vscodeCmd.name)
			found!.should.not.be.undefined()
			found!.section.should.equal("default")
		}
	})

	describe("Shipped Workflow Slash Commands", () => {
		it("projects shipped workflow slash commands into custom CLI-compatible entries", async () => {
			sinon.stub(WorkflowRegistry, "getShippedWorkflowSlashCommands").returns([
				{ name: "quick-spec", description: "Shipped workflow: quick-spec" },
				{ name: "write-prd", description: "Shipped workflow: write-prd" },
			])

			const response = await getResponse()
			const quickSpec = response.commands.find((cmd) => cmd.name === "quick-spec")
			const writePrd = response.commands.find((cmd) => cmd.name === "write-prd")

			quickSpec!.should.not.be.undefined()
			quickSpec!.section.should.equal("custom")
			quickSpec!.cliCompatible.should.equal(true)
			quickSpec!.description.should.equal("Shipped workflow: quick-spec")

			writePrd!.should.not.be.undefined()
			writePrd!.section.should.equal("custom")
			writePrd!.cliCompatible.should.equal(true)
			writePrd!.description.should.equal("Shipped workflow: write-prd")
		})

		it("includes the registered quick-spec workflow slash command", async () => {
			const response = await getResponse()
			const quickSpec = response.commands.find((cmd) => cmd.name === "quick-spec")

			quickSpec!.should.not.be.undefined()
			quickSpec!.section.should.equal("custom")
			quickSpec!.cliCompatible.should.equal(true)
			quickSpec!.description.should.equal("Shipped workflow: quick-spec")
		})
	})
})
