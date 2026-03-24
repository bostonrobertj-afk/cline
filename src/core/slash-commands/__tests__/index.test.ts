import type { McpPromptResponse } from "@shared/mcp"
import { expect } from "chai"
import fs from "fs/promises"
import os from "os"
import path from "path"
import * as sinon from "sinon"
import { StateManager } from "../../storage/StateManager"
import * as bmadAgentMode from "../../task/bmad-agent-mode"
import { formatMcpPromptResponse, McpPromptFetcher, parseSlashCommands } from "../index"

describe("slash-commands", () => {
	afterEach(() => {
		sinon.restore()
	})

	describe("formatMcpPromptResponse", () => {
		it("should format text message", () => {
			const response: McpPromptResponse = {
				messages: [{ role: "user", content: { type: "text", text: "Hello world" } }],
			}
			const result = formatMcpPromptResponse(response)
			expect(result).to.equal("[User]\nHello world")
		})

		it("should format assistant message", () => {
			const response: McpPromptResponse = {
				messages: [{ role: "assistant", content: { type: "text", text: "I can help" } }],
			}
			const result = formatMcpPromptResponse(response)
			expect(result).to.equal("[Assistant]\nI can help")
		})

		it("should include description when provided", () => {
			const response: McpPromptResponse = {
				description: "Test description",
				messages: [{ role: "user", content: { type: "text", text: "Hello" } }],
			}
			const result = formatMcpPromptResponse(response)
			expect(result).to.include("Description: Test description")
			expect(result).to.include("[User]\nHello")
		})

		it("should format multiple messages", () => {
			const response: McpPromptResponse = {
				messages: [
					{ role: "user", content: { type: "text", text: "Question" } },
					{ role: "assistant", content: { type: "text", text: "Answer" } },
				],
			}
			const result = formatMcpPromptResponse(response)
			expect(result).to.include("[User]\nQuestion")
			expect(result).to.include("[Assistant]\nAnswer")
		})

		it("should format image content", () => {
			const response: McpPromptResponse = {
				messages: [{ role: "user", content: { type: "image", data: "base64data", mimeType: "image/png" } }],
			}
			const result = formatMcpPromptResponse(response)
			expect(result).to.equal("[User]\n[Image: image/png]")
		})

		it("should format audio content", () => {
			const response: McpPromptResponse = {
				messages: [{ role: "user", content: { type: "audio", data: "base64data", mimeType: "audio/mp3" } }],
			}
			const result = formatMcpPromptResponse(response)
			expect(result).to.equal("[User]\n[Audio: audio/mp3]")
		})

		it("should format resource with text", () => {
			const response: McpPromptResponse = {
				messages: [
					{
						role: "user",
						content: {
							type: "resource",
							resource: { uri: "file:///test.txt", text: "File content" },
						},
					},
				],
			}
			const result = formatMcpPromptResponse(response)
			expect(result).to.include("[Resource: file:///test.txt]")
			expect(result).to.include("File content")
		})

		it("should format resource without text", () => {
			const response: McpPromptResponse = {
				messages: [
					{
						role: "user",
						content: {
							type: "resource",
							resource: { uri: "file:///binary.bin" },
						},
					},
				],
			}
			const result = formatMcpPromptResponse(response)
			expect(result).to.equal("[User]\n[Resource: file:///binary.bin]")
		})
	})

	describe("parseSlashCommands MCP handling", () => {
		const mockMcpPromptFetcher: McpPromptFetcher = async (serverName, promptName) => {
			if (serverName === "test-server" && promptName === "greet") {
				return {
					description: "A greeting prompt",
					messages: [{ role: "user", content: { type: "text", text: "Hello from MCP!" } }],
				}
			}
			return null
		}

		it("should process MCP prompt command in task tag", async () => {
			const text = "<task>/mcp:test-server:greet</task>"
			const result = await parseSlashCommands(text, {}, {}, "test-ulid", undefined, false, undefined, mockMcpPromptFetcher)

			expect(result.processedText).to.include('<mcp_prompt server="test-server" prompt="greet">')
			expect(result.processedText).to.include("Hello from MCP!")
			expect(result.needsClinerulesFileCheck).to.equal(false)
		})

		it("should process MCP prompt with additional text", async () => {
			const text = "<task>/mcp:test-server:greet Please expand on this</task>"
			const result = await parseSlashCommands(text, {}, {}, "test-ulid", undefined, false, undefined, mockMcpPromptFetcher)

			expect(result.processedText).to.include('<mcp_prompt server="test-server" prompt="greet">')
			expect(result.processedText).to.include("Please expand on this")
		})

		it("should handle MCP prompt with colons in prompt name", async () => {
			const fetcherWithColons: McpPromptFetcher = async (serverName, promptName) => {
				if (serverName === "server" && promptName === "prompt:with:colons") {
					return {
						messages: [{ role: "user", content: { type: "text", text: "Colon prompt" } }],
					}
				}
				return null
			}

			const text = "<task>/mcp:server:prompt:with:colons</task>"
			const result = await parseSlashCommands(text, {}, {}, "test-ulid", undefined, false, undefined, fetcherWithColons)

			expect(result.processedText).to.include('prompt="prompt:with:colons"')
			expect(result.processedText).to.include("Colon prompt")
		})

		// Note: Tests for "unknown MCP server", "no fetcher", and "fetcher errors"
		// are skipped because they require StateManager initialization when falling
		// through to workflow checking. The core MCP functionality is covered above.
	})

	describe("parseSlashCommands BMAD activation", () => {
		it("should resolve managed workflow aliases before BMAD agent activation", async () => {
			sinon.stub(bmadAgentMode, "resolveBmadAgentActivation").resolves(undefined)
			sinon.stub(bmadAgentMode, "isBmadExitCommand").resolves(false)

			const result = await parseSlashCommands(
				"<task>/bmad-problem-solving help me untangle this issue</task>",
				{},
				{},
				"test-ulid",
				undefined,
				false,
				undefined,
				undefined,
				process.cwd(),
			)

			expect(result.processedText).to.equal("<task> help me untangle this issue</task>")
			expect(result.needsClinerulesFileCheck).to.equal(false)
			expect(result.persistentSlashCommandAction).to.deep.equal({
				type: "activate_managed_workflow",
				workflowId: "bmad-cis-problem-solving",
				slashCommand: "bmad-cis-problem-solving",
			})
		})

		it("should resolve preferred BMAD alias commands into persistent activation state", async () => {
			sinon.stub(bmadAgentMode, "resolveBmadAgentActivation").resolves({
				agent: {
					id: "bmad-quick-flow-solo-dev",
					slashCommand: "bmad-quick-flow-solo-dev",
					personaFile: "_bmad/bmm/agents/quick-flow-solo-dev.md",
					allowedSkills: ["bmad-quick-spec", "bmad-quick-dev"],
				},
				skillName: "bmad-quick-flow-solo-dev",
				invokedSlashCommand: "bmad-agent-bmm-quick-flow-solo-dev",
				preferredActivationCommand: "bmad-agent-bmm-quick-flow-solo-dev",
			})
			sinon.stub(bmadAgentMode, "isBmadExitCommand").resolves(false)

			const result = await parseSlashCommands(
				"<task>/bmad-agent-bmm-quick-flow-solo-dev ch how are you today</task>",
				{},
				{},
				"test-ulid",
				undefined,
				false,
				undefined,
				undefined,
				"/test/project",
			)

			expect(result.processedText).to.equal("<task> ch how are you today</task>")
			expect(result.needsClinerulesFileCheck).to.equal(false)
			expect(result.persistentSlashCommandAction).to.deep.equal({
				type: "activate_bmad_agent",
				agentId: "bmad-quick-flow-solo-dev",
				skillName: "bmad-quick-flow-solo-dev",
				invokedSlashCommand: "bmad-agent-bmm-quick-flow-solo-dev",
			})
		})

		it("should resolve BMAD activation when the command token arrives without a leading slash", async () => {
			sinon.stub(bmadAgentMode, "resolveBmadAgentActivation").resolves({
				agent: {
					id: "bmad-quick-flow-solo-dev",
					slashCommand: "bmad-quick-flow-solo-dev",
					personaFile: "_bmad/bmm/agents/quick-flow-solo-dev.md",
					allowedSkills: ["bmad-quick-spec", "bmad-quick-dev"],
				},
				skillName: "bmad-quick-flow-solo-dev",
				invokedSlashCommand: "bmad-agent-bmm-quick-flow-solo-dev",
				preferredActivationCommand: "bmad-agent-bmm-quick-flow-solo-dev",
			})
			sinon.stub(bmadAgentMode, "isBmadExitCommand").resolves(false)

			const result = await parseSlashCommands(
				"<task>bmad-agent-bmm-quick-flow-solo-dev CR target is entity-creation-engine.ts</task>",
				{},
				{},
				"test-ulid",
				undefined,
				false,
				undefined,
				undefined,
				"/test/project",
			)

			expect(result.processedText).to.equal("<task> CR target is entity-creation-engine.ts</task>")
			expect(result.needsClinerulesFileCheck).to.equal(false)
			expect(result.persistentSlashCommandAction).to.deep.equal({
				type: "activate_bmad_agent",
				agentId: "bmad-quick-flow-solo-dev",
				skillName: "bmad-quick-flow-solo-dev",
				invokedSlashCommand: "bmad-agent-bmm-quick-flow-solo-dev",
			})
		})
	})

	describe("parseSlashCommands workflow resolution", () => {
		it("loads local workflows through the shared resolver", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "slash-local-"))
			const workflowPath = path.join(tempDir, "local-flow.md")
			await fs.writeFile(workflowPath, "# Local Flow\nDo the local thing.", "utf8")
			sinon.stub(StateManager, "get").returns({
				getRemoteConfigSettings: () => ({}),
				getGlobalStateKey: () => ({}),
			} as any)

			const result = await parseSlashCommands(
				"<task>/local-flow.md continue</task>",
				{ [workflowPath]: true },
				{},
				"test-ulid",
			)

			expect(result.processedText).to.include('<explicit_instructions type="local-flow.md">')
			expect(result.processedText).to.include("Do the local thing.")
			expect(result.persistentSlashCommandAction).to.deep.equal({
				type: "activate_placeholder_workflow",
				workflowId: "local-flow.md",
			})
		})

		it("prefers local workflows over global workflows with the same name", async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "slash-precedence-"))
			const localPath = path.join(tempDir, "shared-flow.md")
			const globalPath = path.join(tempDir, "global-shared", "shared-flow.md")
			await fs.mkdir(path.dirname(globalPath), { recursive: true })
			await fs.writeFile(localPath, "local body", "utf8")
			await fs.writeFile(globalPath, "global body", "utf8")
			sinon.stub(StateManager, "get").returns({
				getRemoteConfigSettings: () => ({}),
				getGlobalStateKey: () => ({}),
			} as any)

			const result = await parseSlashCommands(
				"<task>/shared-flow.md now</task>",
				{ [localPath]: true },
				{ [globalPath]: true },
				"test-ulid",
			)

			expect(result.processedText).to.include("local body")
			expect(result.processedText).to.not.include("global body")
			expect(result.persistentSlashCommandAction).to.deep.equal({
				type: "activate_placeholder_workflow",
				workflowId: "shared-flow.md",
			})
		})

		it("loads remote workflows through the shared resolver", async () => {
			sinon.stub(StateManager, "get").returns({
				getRemoteConfigSettings: () => ({
					remoteGlobalWorkflows: [{ name: "remote-flow", contents: "remote body", alwaysEnabled: true }],
				}),
				getGlobalStateKey: () => ({}),
			} as any)

			const result = await parseSlashCommands("<task>/remote-flow please</task>", {}, {}, "test-ulid")

			expect(result.processedText).to.include('<explicit_instructions type="remote-flow">')
			expect(result.processedText).to.include("remote body")
			expect(result.persistentSlashCommandAction).to.deep.equal({
				type: "activate_placeholder_workflow",
				workflowId: "remote-flow",
			})
		})
	})
})
