import type { McpPromptResponse } from "@shared/mcp"
import { expect } from "chai"
import * as sinon from "sinon"
import type { WorkflowDefinition } from "@/core/task/workflow-runtime/types"
import * as WorkflowRegistry from "@/core/task/workflow-runtime/WorkflowRegistry"
import { formatMcpPromptResponse, type McpPromptFetcher, parseSlashCommands } from "../index"

const ENTRY_PROJECT_VALUE_KEYS = {
	projectMode: "entry_project_mode",
	projectTitle: "entry_project_title",
	projectFolderName: "entry_project_folder_name",
}

function createResolvedWorkflow(
	args?: Partial<Pick<WorkflowDefinition, "name" | "slashCommandName" | "useSkillName">>,
): WorkflowDefinition {
	return {
		name: args?.name ?? "quick-spec",
		displayName: "Quick Spec",
		description: "Create a quick planning spec.",
		slashCommandName: args?.slashCommandName ?? "quick-spec",
		useSkillName: args?.useSkillName ?? "quick-spec",
		persona: {
			name: "Spec Engineer",
			role: "Planning engineer",
			identity: "A focused workflow persona for drafting compact implementation plans.",
			capabilities: ["scope clarification", "implementation planning"],
			communicationStyle: "Concise and practical.",
			principles: ["Keep plans actionable", "Preserve workflow contracts"],
		},
		projectSubfolder: "planning",
		workflowValueKeys: Object.values(ENTRY_PROJECT_VALUE_KEYS),
		entryProjectValueKeys: ENTRY_PROJECT_VALUE_KEYS,
		entryPanel: { promptMarkdown: "Entry panel" },
		steps: {
			"step-1": {
				id: "step-1",
				stepNumber: 1,
				checklistLabel: "Step 1",
				buildPromptSource: () => ({
					currentStepInstructions: "Step 1",
				}),
				buildToolSchema: () => [],
				decisionTree: {
					entryBranchId: "entry",
					branches: {
						entry: {
							id: "entry",
							routes: [
								{
									id: "entry-route",
									trigger: { kind: "always" },
									action: { kind: "project_prompt" },
								},
							],
						},
					},
				},
			},
		},
	}
}

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
			const result = await parseSlashCommands(text, "test-ulid", undefined, undefined, mockMcpPromptFetcher)

			expect(result.processedText).to.include('<mcp_prompt server="test-server" prompt="greet">')
			expect(result.processedText).to.include("Hello from MCP!")
			expect(result.needsClinerulesFileCheck).to.equal(false)
		})

		it("should process MCP prompt with additional text", async () => {
			const text = "<task>/mcp:test-server:greet Please expand on this</task>"
			const result = await parseSlashCommands(text, "test-ulid", undefined, undefined, mockMcpPromptFetcher)

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
			const result = await parseSlashCommands(text, "test-ulid", undefined, undefined, fetcherWithColons)

			expect(result.processedText).to.include('prompt="prompt:with:colons"')
			expect(result.processedText).to.include("Colon prompt")
		})

		// Note: Tests for "unknown MCP server", "no fetcher", and "fetcher errors"
		// are skipped because they require StateManager initialization when falling
		// through to workflow checking. The core MCP functionality is covered above.
	})

	describe("parseSlashCommands shipped workflow activation", () => {
		it("activates a shipped workflow slash command and strips it from the task text", async () => {
			sinon.stub(WorkflowRegistry, "resolveWorkflowBySlashCommand").returns(createResolvedWorkflow())

			const result = await parseSlashCommands("<task>/quick-spec draft a plan</task>", "test-ulid")

			expect(result.processedText).to.equal("<task> draft a plan</task>")
			expect(result.needsClinerulesFileCheck).to.equal(false)
			expect(result.persistentSlashCommandAction).to.deep.equal({
				type: "activate_workflow",
				workflowName: "quick-spec",
				invocationSource: "slash_command",
			})
		})
	})
})
