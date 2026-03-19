import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity"
import { azureOpenAiDefaultApiVersion, ModelInfo, OpenAiCompatibleModelInfo, openAiModelInfoSaneDefaults } from "@shared/api"
import { normalizeOpenaiReasoningEffort } from "@shared/storage/types"
import OpenAI, { AzureOpenAI } from "openai"
import { buildExternalBasicHeaders } from "@/services/EnvUtils"
import { ClineStorageMessage } from "@/shared/messages/content"
import { createOpenAIClient, fetch } from "@/shared/net"
import { ApiHandler, CommonApiHandlerOptions } from "../index"
import { withRetry } from "../retry"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { convertToR1Format } from "../transform/r1-format"
import { ApiStream } from "../transform/stream"
import { ToolCallProcessor } from "../transform/tool-call-processor"

type ResponseTool = any

interface OpenAiHandlerOptions extends CommonApiHandlerOptions {
	openAiApiKey?: string
	openAiBaseUrl?: string
	azureApiVersion?: string
	azureIdentity?: boolean
	openAiHeaders?: Record<string, string>
	openAiModelId?: string
	openAiModelInfo?: OpenAiCompatibleModelInfo
	reasoningEffort?: string
}

export class OpenAiHandler implements ApiHandler {
	private options: OpenAiHandlerOptions
	private client: OpenAI | undefined

	constructor(options: OpenAiHandlerOptions) {
		this.options = options
	}

	private getAzureAudienceScope(baseUrl?: string): string {
		const url = baseUrl?.toLowerCase() ?? ""
		if (url.includes("azure.us")) return "https://cognitiveservices.azure.us/.default"
		if (url.includes("azure.com")) return "https://cognitiveservices.azure.com/.default"
		return "https://cognitiveservices.azure.com/.default"
	}

	private ensureClient(): OpenAI {
		if (!this.client) {
			if (!this.options.openAiApiKey && !this.options.azureIdentity) {
				throw new Error("OpenAI API key or Azure Identity Authentication is required")
			}
			try {
				const baseUrl = this.options.openAiBaseUrl?.toLowerCase() ?? ""
				const isAzureDomain = baseUrl.includes("azure.com") || baseUrl.includes("azure.us")
				const externalHeaders = buildExternalBasicHeaders()
				// Azure API shape slightly differs from the core API shape...
				if (
					this.options.azureApiVersion ||
					(isAzureDomain && !this.options.openAiModelId?.toLowerCase().includes("deepseek"))
				) {
					if (this.options.azureIdentity) {
						this.client = new AzureOpenAI({
							baseURL: this.options.openAiBaseUrl,
							azureADTokenProvider: getBearerTokenProvider(
								new DefaultAzureCredential(),
								this.getAzureAudienceScope(this.options.openAiBaseUrl),
							),
							apiVersion: this.options.azureApiVersion || azureOpenAiDefaultApiVersion,
							defaultHeaders: {
								...externalHeaders,
								...this.options.openAiHeaders,
							},
							fetch,
						})
					} else {
						this.client = new AzureOpenAI({
							baseURL: this.options.openAiBaseUrl,
							apiKey: this.options.openAiApiKey,
							apiVersion: this.options.azureApiVersion || azureOpenAiDefaultApiVersion,
							defaultHeaders: {
								...externalHeaders,
								...this.options.openAiHeaders,
							},
							fetch,
						})
					}
				} else {
					this.client = createOpenAIClient({
						baseURL: this.options.openAiBaseUrl,
						apiKey: this.options.openAiApiKey,
						defaultHeaders: this.options.openAiHeaders,
					})
				}
			} catch (error: any) {
				throw new Error(`Error creating OpenAI client: ${error.message}`)
			}
		}
		return this.client
	}

	private shouldRetryWithFullContext(error: unknown, hadPreviousResponseId: boolean): boolean {
		const errorCode =
			typeof error === "object" && error && "code" in error && typeof (error as { code: unknown }).code === "string"
				? (error as { code: string }).code
				: undefined

		return !!hadPreviousResponseId && errorCode === "previous_response_not_found"
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: ClineStorageMessage[], tools?: ResponseTool[]): ApiStream {
		const client = this.ensureClient()
		const modelId = this.options.openAiModelId ?? ""
		const isDeepseekReasoner = modelId.includes("deepseek-reasoner")
		const isR1FormatRequired = this.options.openAiModelInfo?.isR1FormatRequired ?? false
		const isReasoningModelFamily =
			["o1", "o3", "o4", "gpt-5"].some((prefix) => modelId.includes(prefix)) && !modelId.includes("chat")

			const toResponsesContent = (content: any): any[] => {
			if (typeof content === "string") {
				return [{ type: "input_text", text: content }]
			}

			if (!Array.isArray(content)) {
				return [{ type: "input_text", text: String(content ?? "") }]
			}

			return content.map((item: any) => {
				if (!item || typeof item !== "object") {
					return { type: "input_text", text: String(item ?? "") }
				}

				if (item.type === "text") {
					return { type: "input_text", text: item.text ?? "" }
				}

				if (item.type === "image_url") {
					return {
						type: "input_image",
						image_url: typeof item.image_url === "string" ? item.image_url : item.image_url?.url,
					}
				}

				return item
			})
		}

		let previousResponseId: string | undefined
		let inputMessages = messages

		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i] as any
			const isRecentEnough = message?.ts ? Date.now() - message.ts < 23 * 60 * 60 * 1000 : false
			const isOpenAiCompatibleAssistant =
				message?.role === "assistant" &&
				message?.modelInfo?.providerId === "openai" &&
				typeof message?.id === "string" &&
				message.id.length > 0

			if (isOpenAiCompatibleAssistant && isRecentEnough) {
				previousResponseId = message.id
				inputMessages = messages.slice(i + 1)
				break
			}
		}

		let responseInput: any[] = convertToOpenAiMessages(inputMessages).map((message: any) => {
			return {
				role: message.role,
				content: toResponsesContent(message.content),
			}
		})

		let temperature: number | undefined
		if (this.options.openAiModelInfo?.temperature !== undefined) {
			const tempValue = Number(this.options.openAiModelInfo.temperature)
			temperature = tempValue === 0 ? undefined : tempValue
		} else {
			temperature = openAiModelInfoSaneDefaults.temperature
		}
		let reasoningEffort: string | undefined
		let maxTokens: number | undefined

		if (this.options.openAiModelInfo?.maxTokens && this.options.openAiModelInfo.maxTokens > 0) {
			maxTokens = Number(this.options.openAiModelInfo.maxTokens)
		} else {
			maxTokens = undefined
		}

		if (isDeepseekReasoner || isR1FormatRequired) {
			responseInput = convertToR1Format([{ role: "user", content: systemPrompt }, ...inputMessages]).map((message: any) => {
				return {
					role: message.role,
					content: toResponsesContent(message.content),
				}
			})
		}

		if (isReasoningModelFamily) {
			responseInput = convertToOpenAiMessages(inputMessages).map((message: any) => {
				return {
					role: message.role,
					content: toResponsesContent(message.content),
				}
			})
			const requestedEffort = normalizeOpenaiReasoningEffort(this.options.reasoningEffort)
			reasoningEffort = requestedEffort === "none" ? undefined : requestedEffort

			if (reasoningEffort) {
				temperature = undefined // GPT-5.4 rejects temperature when reasoning effort is not none
			}
		}

		const request: any = {
			model: modelId,
			instructions: systemPrompt,
			input: responseInput,
			stream: true,
		}

		const fallbackRequest: any = {
			model: modelId,
			instructions: systemPrompt,
			input: convertToOpenAiMessages(messages).map((message: any) => {
				return {
					role: message.role,
					content: toResponsesContent(message.content),
				}
			}),
			stream: true,
		}

		if (previousResponseId) {
			request.previous_response_id = previousResponseId
		}


		if (tools?.length) {
			const responseTools = tools.map((tool: any) => {
				if (tool?.type === "function" && tool.function) {
					return {
						type: "function",
						name: tool.function.name,
						description: tool.function.description,
						parameters: tool.function.parameters,
						strict: tool.function.strict,
					}
				}

				return tool
			})

			request.tools = responseTools
			fallbackRequest.tools = responseTools
		}

		if (temperature !== undefined) {
			request.temperature = temperature
			fallbackRequest.temperature = temperature
		}

		if (maxTokens) {
			request.max_output_tokens = maxTokens
			fallbackRequest.max_output_tokens = maxTokens
		}

		if (reasoningEffort) {
			const reasoning = { effort: reasoningEffort }
			request.reasoning = reasoning
			fallbackRequest.reasoning = reasoning
		}

		let stream: any
		try {
			stream = await client.responses.create(request)
		} catch (error) {
			if (this.shouldRetryWithFullContext(error, !!previousResponseId)) {
				stream = await client.responses.create(fallbackRequest)
			} else {
				throw error
			}
		}

		const toolCallProcessor = new ToolCallProcessor()

		for await (const event of stream as AsyncIterable<any>) {
			if (event.type === "response.output_text.delta" && event.delta) {
				yield {
					type: "text",
					text: event.delta,
				}
			}

			if (event.type === "response.output_item.done" && event.item?.type === "function_call") {
				yield* toolCallProcessor.processToolCallDeltas([
					{
						index: event.output_index ?? 0,
						id: event.item.call_id ?? event.item.id,
						type: "function",
						function: {
							name: event.item.name,
							arguments: event.item.arguments ?? "",
						},
					},
				] as any)
			}

			if (event.type === "response.completed" && event.response) {
				yield {
					type: "response_id",
					id: event.response.id,
				}

				if (event.response.usage) {
					yield {
						type: "usage",
						inputTokens: event.response.usage.input_tokens || 0,
						outputTokens: event.response.usage.output_tokens || 0,
						cacheReadTokens: 0,
						cacheWriteTokens: 0,
					}
				}
			}
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		return {
			id: this.options.openAiModelId ?? "",
			info: this.options.openAiModelInfo ?? openAiModelInfoSaneDefaults,
		}
	}
}
