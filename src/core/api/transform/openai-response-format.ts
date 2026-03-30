import { ResponseInput, ResponseInputMessageContentList, ResponseReasoningItem } from "openai/resources/responses/responses"
import { ClineStorageMessage } from "@/shared/messages/content"

/**
 * Converts an array of ClineStorageMessage objects (extension of Anthropic format) to a ResponseInput array to use with OpenAI's Responses API.
 *
 * ## Key Differences from Chat Completions API
 *
 * The Responses API has stricter requirements than the Chat Completions API:
 *
 * ### Chat Completions API:
 * - Messages are simple role/content pairs
 * - System prompts are separate messages with role="system"
 * - No explicit reasoning item structure
 * - More forgiving about message ordering
 *
 * ### Responses API:
 * - Uses an "input" array of heterogeneous items (messages, reasoning, function_calls, etc.)
 * - System prompts go in an "instructions" field, not as messages
 * - Reasoning items MUST be immediately followed by a message or function_call
 * - Strict ordering requirements match training data distribution
 *
 * ## The Reasoning Item Constraint
 *
 * **THE CRITICAL ERROR:** "Item 'rs_...' of type 'reasoning' was provided without its required following item"
 *
 * This error occurs when reasoning items are orphaned or separated from their corresponding output.
 *
 * ### What Causes This Error:
 * ```
 * ❌ WRONG - Reasoning orphaned between turns:
 * [
 *   { role: "user", content: [...] },
 *   { type: "reasoning", id: "rs_abc", summary: [...] },  // ← ORPHANED!
 *   { type: "message", role: "assistant", content: [...] },
 *   { role: "user", content: [...] }
 * ]
 * ```
 *
 * ### The Fix - Keep Complete Assistant Turns Together:
 * ```
 * ✅ CORRECT - Reasoning paired with its message:
 * [
 *   { role: "user", content: [...] },
 *   { type: "reasoning", id: "rs_abc", summary: [...] },
 *   { type: "message", role: "assistant", content: [...] },  // ← Immediately follows reasoning
 *   { role: "user", content: [...] }
 * ]
 * ```
 *
 * **Per OpenAI Engineering Guidance:**
 * - ❌ WRONG: `content += filter(lambda x: x.type == "reasoning", resp.output)`
 * - ✅ CORRECT: `content += resp.output`
 *
 * Never extract only reasoning items - always include the complete output sequence
 * (reasoning + message/function_call) as provided by the API.
 *
 * ## Implementation Strategy
 *
 * 1. **Separate processing for assistant vs user messages** - Assistant turns need special
 *    handling to maintain reasoning-message pairing
 * 2. **Collect all assistant items together** - Gather reasoning, messages, and function_calls
 *    for the entire assistant turn before validating
 * 3. **Validate pairing within each turn** - Ensure each reasoning item is immediately followed
 *    by a message or function_call, inserting placeholders if needed
 * 4. **Flush complete turns atomically** - Add all items from an assistant turn together to
 *    maintain proper sequencing
 *
 * @link https://community.openai.com/t/openai-api-error-function-call-was-provided-without-its-required-reasoning-item-the-real-issue/1355347
 *
 * @param messages - Array of ClineStorageMessage objects to be converted
 * @returns ResponseInput array containing the transformed messages with proper reasoning pairing
 */
export function findLatestReusablePreviousResponseAnchor(
	messages: ClineStorageMessage[],
	options?: { previousResponseProviderIds?: string[] },
): {
	previousResponseId?: string
	previousResponseIdChainBreakReason?: string
	nextMessageIndex: number
} {
	const previousResponseProviderIds = new Set(options?.previousResponseProviderIds ?? ["openai-native"])

	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i]
		if (msg.previousResponseIdChainBroken) {
			return {
				previousResponseIdChainBreakReason: msg.previousResponseIdChainBrokenReason || "stored_chain_break_boundary",
				nextMessageIndex: 0,
			}
		}

		const isMatchingAssistant =
			msg.role === "assistant" &&
			typeof msg.modelInfo?.providerId === "string" &&
			previousResponseProviderIds.has(msg.modelInfo.providerId)

		if (isMatchingAssistant && typeof msg.id === "string" && msg.id.length > 0) {
			return {
				previousResponseId: msg.id,
				nextMessageIndex: i + 1,
			}
		}
	}

	return {
		nextMessageIndex: 0,
	}
}

export function convertToOpenAIResponsesInput(
	_messages: ClineStorageMessage[],
	options?: { usePreviousResponseId?: boolean; previousResponseProviderIds?: string[] },
): {
	input: ResponseInput
	previousResponseId?: string
	previousResponseIdChainBreakReason?: string
} {
	// Chain from the latest stored Responses API assistant message when available.
	// When chaining, only send new items after that assistant turn.
	let previousResponseId: string | undefined
	let previousResponseIdChainBreakReason: string | undefined
	let messages = _messages

	if (options?.usePreviousResponseId) {
		// The helper chooses the latest reusable stored Responses anchor unless an explicit
		// chain-break boundary blocks reuse.
		const anchor = findLatestReusablePreviousResponseAnchor(_messages, {
			previousResponseProviderIds: options.previousResponseProviderIds,
		})
		previousResponseId = anchor.previousResponseId
		previousResponseIdChainBreakReason = anchor.previousResponseIdChainBreakReason
		if (previousResponseId) {
			messages = _messages.slice(anchor.nextMessageIndex)
		}
	}

	// Stored Responses API item IDs (for example `rs_*`, `msg_*`, `fc_*`) are only
	// safe to rely on when continuing a live response chain via `previous_response_id`.
	// When we rebuild full context instead, replaying those IDs can cause the API to
	// treat them as stale item references and reject the request with:
	// "Item with id 'rs_*' not found."
	const reuseStoredOutputItemIds = !!previousResponseId

	const allItems: any[] = []
	const toolUseIdToCallId = new Map<string, string>()

	for (const m of messages) {
		if (typeof m.content === "string") {
			if (m.role === "assistant") {
				allItems.push({
					type: "message",
					role: "assistant",
					content: [{ type: "output_text", text: m.content }],
				})
			} else {
				allItems.push({
					type: "message",
					role: m.role,
					content: [{ type: "input_text", text: m.content }],
				})
			}
			continue
		}

		if (m.role === "assistant") {
			// For assistant messages, we must ensure reasoning items are IMMEDIATELY followed
			// by their corresponding message or function_call. Process the entire assistant
			// turn and ensure proper pairing.
			const assistantItems: any[] = []

			for (const part of m.content) {
				switch (part.type) {
					case "thinking":
						// Only include reasoning item if it has actual content (thinking text or summary)
						// Empty reasoning items cause API errors: "Item 'rs_...' of type 'reasoning' was provided without its required following item"
						const hasThinkingContent = part.thinking && part.thinking.trim().length > 0
						const hasSummaryContent = part.summary && Array.isArray(part.summary) && part.summary.length > 0

						if (part.call_id && part.call_id.length > 0 && (hasThinkingContent || hasSummaryContent)) {
							// Use summary if available, otherwise use thinking text
							let summary: any[] = []
							if (hasSummaryContent) {
								// part.summary is already in the correct format from OpenAI Responses API
								summary = part.summary as any[]
							} else if (hasThinkingContent) {
								// Convert thinking text to summary format
								summary = [
									{
										type: "summary_text",
										text: part.thinking,
									},
								]
							}

							const reasoningItem: any = {
								type: "reasoning",
								summary,
							}
							if (reuseStoredOutputItemIds) {
								reasoningItem.id = part.call_id
							}
							assistantItems.push(reasoningItem as ResponseReasoningItem)
						}
						break
					case "redacted_thinking":
						// Include reasoning item with encrypted content if it has a call_id
						// Even if data is missing, we need to maintain the reasoning-function_call pairing
						if (part.call_id && part.call_id.length > 0) {
							const reasoningItem: any = {
								type: "reasoning",
								summary: [],
							}
							if (reuseStoredOutputItemIds) {
								reasoningItem.id = part.call_id
							}
							// Only include encrypted_content if data exists
							if (part.data) {
								reasoningItem.encrypted_content = part.data
							}
							assistantItems.push(reasoningItem as ResponseReasoningItem)
						}
						break
					case "text":
						// Message ID goes at the message level, not in the content
						// The reasoning item and message can have different IDs - they just need to be adjacent
						const messageItem: any = {
							type: "message",
							role: "assistant",
							content: [{ type: "output_text", text: part.text }],
						}
						// Only reuse stored message ids when continuing a live response chain.
						if (reuseStoredOutputItemIds && part.call_id) {
							messageItem.id = part.call_id
						}
						assistantItems.push(messageItem)
						break
					case "image":
						// Message ID goes at the message level, not in the content
						const imageItem: any = {
							type: "message",
							role: "assistant",
							content: [{ type: "output_text", text: `[image:${part.source.media_type}]` }],
						}
						if (reuseStoredOutputItemIds && part.call_id) {
							imageItem.id = part.call_id
						}
						assistantItems.push(imageItem)
						break
					case "tool_use": {
						// Function calls use call_id, not related to reasoning item ID
						const call_id = part.call_id || part.id
						if (part.id && call_id) {
							toolUseIdToCallId.set(part.id, call_id)
						}
						assistantItems.push({
							type: "function_call",
							call_id,
							name: part.name,
							arguments: JSON.stringify(part.input ?? {}),
							// MAX 53 characters for OpenAI Responses API tool IDs.
							// When rebuilding full context, omit stored output item ids and rely on
							// the stable call_id instead.
							...(reuseStoredOutputItemIds
								? { id: !part.id.startsWith("fc_") ? `fc_${part.id.slice(0, 50)}` : part.id }
								: {}),
						})
						break
					}
				}
			}

			allItems.push(...assistantItems)
		} else {
			// User messages - collect all content
			const messageContent: ResponseInputMessageContentList = []

			for (const part of m.content) {
				switch (part.type) {
					case "text":
						messageContent.push({ type: "input_text", text: part.text })
						break
					case "image":
						messageContent.push({
							type: "input_image",
							detail: "auto",
							image_url: `data:${part.source.media_type};base64,${part.source.data}`,
						})
						break
					case "tool_result": {
						// Flush any pending message content before adding tool result
						if (messageContent.length > 0) {
							allItems.push({
								type: "message",
								role: m.role,
								content: [...messageContent],
							})
							messageContent.length = 0
						}

						const call_id = part.call_id || toolUseIdToCallId.get(part.tool_use_id) || part.tool_use_id

						if (!call_id) {
							throw new Error(
								`Missing OpenAI Responses call_id for tool_result with tool_use_id: ${part.tool_use_id}`,
							)
						}

						allItems.push({
							type: "function_call_output",
							call_id,
							output: convertToolResultContentToResponseOutput(part.content),
						})
						break
					}
				}
			}

			// Flush any remaining user message content
			if (messageContent.length > 0) {
				allItems.push({
					type: "message",
					role: m.role,
					content: [...messageContent],
				})
			}
		}
	}

	return { input: allItems, previousResponseId, previousResponseIdChainBreakReason }
}

function convertToolResultContentToResponseOutput(content: unknown): string | Array<Record<string, unknown>> {
	if (typeof content === "string") {
		return content
	}

	if (!Array.isArray(content)) {
		return JSON.stringify(content ?? "")
	}

	const outputParts: Array<Record<string, unknown>> = []

	for (const part of content) {
		if (!part || typeof part !== "object" || !("type" in part)) {
			outputParts.push({ type: "input_text", text: String(part ?? "") })
			continue
		}

		if (part.type === "text") {
			outputParts.push({ type: "input_text", text: typeof part.text === "string" ? part.text : "" })
			continue
		}

		if (part.type === "image") {
			const source = "source" in part && part.source && typeof part.source === "object" ? (part.source as any) : undefined
			if (typeof source?.media_type === "string" && typeof source?.data === "string") {
				outputParts.push({
					type: "input_image",
					detail: "auto",
					image_url: `data:${source.media_type};base64,${source.data}`,
				})
			}
		}
	}

	if (outputParts.length === 0) {
		return JSON.stringify(content)
	}

	if (outputParts.every((part) => part.type === "input_text")) {
		return outputParts.map((part) => String(part.text ?? "")).join("\n")
	}

	return outputParts
}
