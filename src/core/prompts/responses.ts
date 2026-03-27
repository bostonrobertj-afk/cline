import { Anthropic } from "@anthropic-ai/sdk"
import * as diff from "diff"
import * as path from "path"
import { Mode } from "@/shared/storage/types"
import { ClineIgnoreController, LOCK_TEXT_SYMBOL } from "../ignore/ClineIgnoreController"

const CONTEXT_WINDOW_WARNING_THRESHOLD_PERCENT = 50
const INLINE_FINAL_FILE_CONTENT_MAX_CHARS = 2000
const PATCH_SUMMARY_MAX_CHARS = 1400

interface SavedFileReferenceOptions {
	autoFormattingApplied?: boolean
	userEditsApplied?: boolean
}

function countLines(text: string): number {
	if (!text) {
		return 0
	}

	return text.split("\n").length
}

function countChangedRegions(patch: string): number {
	const matches = patch.match(/^@@/gm)
	return matches?.length ?? (patch.trim() ? 1 : 0)
}

function formatFinalFileStateBlock(args: {
	relPath: string
	finalContent: string
	isNewFile: boolean
	referenceFormat: "full_content" | "patch_summary" | "metadata_summary"
	patchTruncated?: boolean
	autoFormattingApplied?: boolean
	userEditsApplied?: boolean
}) {
	const {
		relPath,
		finalContent,
		isNewFile,
		referenceFormat,
		patchTruncated = false,
		autoFormattingApplied = false,
		userEditsApplied = false,
	} = args

	return (
		`<final_file_state path="${relPath.toPosix()}">\n` +
		`saved=true\n` +
		`created_file=${isNewFile}\n` +
		`chars=${finalContent.length}\n` +
		`lines=${countLines(finalContent)}\n` +
		`reference_format=${referenceFormat}\n` +
		`exact_saved_content_matches_agent_output=${!autoFormattingApplied && !userEditsApplied}\n` +
		`user_edits_applied=${userEditsApplied}\n` +
		`auto_formatting_applied=${autoFormattingApplied}\n` +
		`patch_truncated=${patchTruncated}\n` +
		`additional_verification_read_required=${patchTruncated}\n` +
		`</final_file_state>\n\n`
	)
}

function formatVerificationGuidance(relPath: string, patchTruncated: boolean) {
	return patchTruncated
		? `The save succeeded, but the patch summary was truncated. Only use read_file on ${relPath.toPosix()} if you need the exact surrounding saved context before another edit.\n\n`
		: `The save succeeded. No additional verification read is required unless you need broader file context for a follow-up edit.\n\n`
}

function formatSavedFileReference(
	relPath: string,
	previousContent: string | undefined,
	finalContent: string | undefined,
	isNewFile = false,
	options: SavedFileReferenceOptions = {},
): string {
	if (!finalContent) {
		return ""
	}

	if (isNewFile && finalContent.length <= INLINE_FINAL_FILE_CONTENT_MAX_CHARS) {
		return (
			formatFinalFileStateBlock({
				relPath,
				finalContent,
				isNewFile,
				referenceFormat: "full_content",
				autoFormattingApplied: options.autoFormattingApplied,
				userEditsApplied: options.userEditsApplied,
			}) +
			`Here is the full, updated content of the file that was saved:\n\n` +
			`<final_file_content path="${relPath.toPosix()}">\n${finalContent}\n</final_file_content>\n\n` +
			`IMPORTANT: For any future changes to this file, use the final_file_content shown above as your reference. This content reflects the current state of the file, including any auto-formatting. Always base your SEARCH/REPLACE operations on this final version to ensure accuracy.\n\n` +
			formatVerificationGuidance(relPath, false)
		)
	}

	if (previousContent !== undefined) {
		const prettyPatch = formatResponse.createPrettyPatch(relPath.toPosix(), previousContent, finalContent).trim()
		const changedRegions = countChangedRegions(prettyPatch)
		const patchTruncated = prettyPatch.length > PATCH_SUMMARY_MAX_CHARS

		if (prettyPatch.length === 0) {
			return (
				formatFinalFileStateBlock({
					relPath,
					finalContent,
					isNewFile,
					referenceFormat: "patch_summary",
					autoFormattingApplied: options.autoFormattingApplied,
					userEditsApplied: options.userEditsApplied,
				}) +
				`<final_file_patch_summary path="${relPath.toPosix()}">\n` +
				`chars=${finalContent.length}\n` +
				`lines=${countLines(finalContent)}\n` +
				`changed_regions=0\n` +
				`No textual differences were detected between the previous baseline and the saved file.\n` +
				`</final_file_patch_summary>\n\n` +
				formatVerificationGuidance(relPath, false)
			)
		}

		const patchText = !patchTruncated
			? prettyPatch
			: `${prettyPatch.slice(0, PATCH_SUMMARY_MAX_CHARS).trimEnd()}\n...[patch truncated]`

		return (
			formatFinalFileStateBlock({
				relPath,
				finalContent,
				isNewFile,
				referenceFormat: "patch_summary",
				patchTruncated,
				autoFormattingApplied: options.autoFormattingApplied,
				userEditsApplied: options.userEditsApplied,
			}) +
			`<final_file_patch_summary path="${relPath.toPosix()}">\n` +
			`chars=${finalContent.length}\n` +
			`lines=${countLines(finalContent)}\n` +
			`changed_regions=${changedRegions}\n` +
			`${patchTruncated ? "patch_truncated=true\n" : ""}` +
			`${patchText}\n` +
			`</final_file_patch_summary>\n\n` +
			formatVerificationGuidance(relPath, patchTruncated)
		)
	}

	return (
		formatFinalFileStateBlock({
			relPath,
			finalContent,
			isNewFile,
			referenceFormat: "metadata_summary",
			autoFormattingApplied: options.autoFormattingApplied,
			userEditsApplied: options.userEditsApplied,
		}) +
		`<final_file_summary path="${relPath.toPosix()}">\n` +
		`saved=true\n` +
		`created_file=${isNewFile}\n` +
		`chars=${finalContent.length}\n` +
		`lines=${countLines(finalContent)}\n` +
		`</final_file_summary>\n\n` +
		formatVerificationGuidance(relPath, false)
	)
}

export const formatResponse = {
	taggedHumanInputContent: (tag: "task" | "feedback" | "user_message", text: string | undefined) =>
		[`<${tag}>`, text ?? "", `</${tag}>`].join("\n"),

	latestHumanInput: (tag: "task" | "feedback" | "user_message", text: string | undefined) =>
		[
			"[LATEST HUMAN USER INPUT]",
			"The tagged content below is the latest direct input from the human user for this turn.",
			formatResponse.taggedHumanInputContent(tag, text),
		].join("\n"),

	normalNextTurnDialogue: (tag: "task" | "feedback" | "user_message", text: string | undefined) =>
		[
			"[NORMAL NEXT-TURN HUMAN INPUT]",
			"The tagged content below is the latest direct input from the human user for the current live turn.",
			formatResponse.taggedHumanInputContent(tag, text),
		].join("\n"),

	systemGeneratedContextNotice: () =>
		[
			"[SYSTEM-GENERATED CONTEXT]",
			"Everything below this marker is runtime-generated context from the system, tools, workspace state, prior task state, or environment metadata. It is not a new message from the human user.",
		].join("\n"),

	duplicateFileReadNotice: () =>
		`[[NOTE] This file read has been removed to save space in the context window. Refer to the latest file read for the most up to date version of this file.]`,

	contextTruncationNotice: () =>
		`[NOTE] Some previous conversation history with the user has been removed to maintain optimal context window length. The initial user task has been retained for continuity, while intermediate conversation history has been removed. Keep this in mind as you continue assisting the user. Pay special attention to the user's latest messages.`,

	processFirstUserMessageForTruncation: () => {
		return "[Continue assisting the user!]"
	},

	condense: () =>
		`The user has accepted the condensed conversation summary you generated. This summary covers important details of the historical conversation with the user which has been truncated.\n<explicit_instructions type="condense_response">It's crucial that you respond by ONLY asking the user what you should work on next. You should NOT take any initiative or make any assumptions about continuing with work. For example you should NOT suggest file changes or attempt to read any files.\nWhen asking the user what you should work on next, you can reference information in the summary which was just generated. However, you should NOT reference information outside of what's contained in the summary for this response. Keep this response CONCISE.</explicit_instructions>`,

	toolDenied: () => `The user denied this operation.`,

	toolError: (error?: string) => `The tool execution failed with the following error:\n<error>\n${error}\n</error>`,

	compactedToolResultNotice: (toolName: string) =>
		`[NOTE] The older ${toolName} output was removed to save context window space. Re-run ${toolName} if you need the full result again.]`,

	savedFileReference: (
		relPath: string,
		previousContent: string | undefined,
		finalContent: string | undefined,
		isNewFile = false,
		options: SavedFileReferenceOptions = {},
	) => formatSavedFileReference(relPath, previousContent, finalContent, isNewFile, options),

	clineIgnoreError: (path: string) =>
		`Access to ${path} is blocked by the .clineignore file settings. You must try to continue in the task without using this file, or ask the user to update the .clineignore file.`,

	permissionDeniedError: (reason: string) =>
		`Command execution blocked by CLINE_COMMAND_PERMISSIONS: ${reason}. You must try a different approach or ask the user to update the permission settings.`,

	noToolsUsed: (usingNativeToolCalls: boolean) =>
		`[ERROR] You did not use a tool in your previous response! Please retry with a tool use.

${usingNativeToolCalls ? "" : toolUseInstructionsReminder}

# Next Steps

If you have completed the user's task, use the attempt_completion tool. 
If you require additional information from the user, use the ask_followup_question tool. 
Otherwise, if you have not completed the task and do not need additional information, then proceed with the next step of the task. 
(This is an automated message, so do not respond to it conversationally.)`,

	tooManyMistakes: (feedback?: string) =>
		`You seem to be having trouble proceeding. The user has provided the following feedback to help guide you:\n<feedback>\n${feedback}\n</feedback>`,

	missingToolParameterError: (paramName: string) =>
		`Missing value for required parameter '${paramName}'. Please retry with complete response.\n\n${toolUseInstructionsReminder}`,

	/**
	 * Specialized error for write_to_file when the 'content' parameter is missing.
	 * Provides progressive guidance based on how many times this has happened consecutively,
	 * and includes token budget awareness to help the model understand output constraints.
	 */
	writeToFileMissingContentError: (relPath: string, consecutiveFailures: number, contextUsagePercent?: number): string => {
		const baseError = `Failed to write to '${relPath}': The 'content' parameter was empty. This typically happens when the file content is too large to generate in a single response, or when output token limits are reached before the content parameter is fully written.`

		const contextWarning =
			contextUsagePercent !== undefined && contextUsagePercent > CONTEXT_WINDOW_WARNING_THRESHOLD_PERCENT
				? `\n\nWarning: Context window is ${contextUsagePercent}% full. The remaining output budget may be insufficient for large file writes. You MUST use a strategy that produces smaller outputs.`
				: ""

		if (consecutiveFailures >= 3) {
			// After 3+ failures, be very directive — stop trying write_to_file entirely
			return (
				`${baseError}${contextWarning}\n\n` +
				`CRITICAL: You have failed to write this file ${consecutiveFailures} times in a row. You MUST change your approach — do NOT retry write_to_file for this file again.\n\n` +
				`Required action — choose ONE of these strategies:\n` +
				`1. **Create an empty file first, then use replace_in_file** to add content in small sections (recommended)\n` +
				`2. **Break the file into multiple smaller files** if architecturally appropriate\n` +
				`3. **Write a minimal skeleton** using write_to_file (just imports, class/function signatures, no implementations), then use replace_in_file to fill in each section one at a time\n\n` +
				`Each replace_in_file call should add no more than 50-100 lines of content at a time.`
			)
		}
		if (consecutiveFailures >= 2) {
			// After 2 failures, strongly suggest alternative approaches
			return (
				`${baseError}${contextWarning}\n\n` +
				`This is your ${consecutiveFailures}${consecutiveFailures === 2 ? "nd" : "rd"} failed attempt. The file content is likely too large to generate in one response. You must use a different strategy:\n\n` +
				`Recommended approaches:\n` +
				`1. **Use write_to_file with a minimal skeleton** (just the structure — imports, class/function signatures, no implementations), then use replace_in_file to fill in each section incrementally\n` +
				`2. **Use replace_in_file with smaller chunks** — if the file already exists, make targeted edits instead of rewriting the entire file\n` +
				`3. **Break the task into smaller steps** — write one function or section at a time\n\n` +
				`Do NOT attempt to write the full file content in a single write_to_file call again.`
			)
		}
		// First failure — provide helpful guidance
		return (
			`${baseError}${contextWarning}\n\n` +
			`Suggestions:\n` +
			`- If the file is large, try breaking down the task into smaller steps. Write a skeleton first, then fill in sections using replace_in_file.\n` +
			`- If the file already exists, prefer replace_in_file to make targeted edits instead of rewriting the entire file.\n` +
			`- Ensure the 'content' parameter contains the complete file content before closing the tool tag.\n\n` +
			toolUseInstructionsReminder
		)
	},

	invalidMcpToolArgumentError: (serverName: string, toolName: string) =>
		`Invalid JSON argument used with ${serverName} for ${toolName}. Please retry with a properly formatted JSON argument.`,

	toolResult: (
		text: string,
		images?: string[],
		fileString?: string,
	): string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> => {
		const toolResultOutput = []

		if (!(images && images.length > 0) && !fileString) {
			return text
		}

		const textBlock: Anthropic.TextBlockParam = { type: "text", text }
		toolResultOutput.push(textBlock)

		if (images && images.length > 0) {
			const imageBlocks: Anthropic.ImageBlockParam[] = formatImagesIntoBlocks(images)
			toolResultOutput.push(...imageBlocks)
		}

		if (fileString) {
			const fileBlock: Anthropic.TextBlockParam = { type: "text", text: fileString }
			toolResultOutput.push(fileBlock)
		}

		return toolResultOutput
	},

	imageBlocks: (images?: string[]): Anthropic.ImageBlockParam[] => {
		return formatImagesIntoBlocks(images)
	},

	formatFilesList: (
		absolutePath: string,
		files: string[],
		didHitLimit: boolean,
		clineIgnoreController?: ClineIgnoreController,
	): string => {
		const sorted = files
			.map((file) => {
				// convert absolute path to relative path
				const relativePath = path.relative(absolutePath, file).toPosix()
				return file.endsWith("/") ? relativePath + "/" : relativePath
			})
			// Sort so files are listed under their respective directories to make it clear what files are children of what directories. Since we build file list top down, even if file list is truncated it will show directories that cline can then explore further.
			.sort((a, b) => {
				const aParts = a.split("/") // only works if we use toPosix first
				const bParts = b.split("/")
				for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
					if (aParts[i] !== bParts[i]) {
						// If one is a directory and the other isn't at this level, sort the directory first
						if (i + 1 === aParts.length && i + 1 < bParts.length) {
							return -1
						}
						if (i + 1 === bParts.length && i + 1 < aParts.length) {
							return 1
						}
						// Otherwise, sort alphabetically
						return aParts[i].localeCompare(bParts[i], undefined, {
							numeric: true,
							sensitivity: "base",
						})
					}
				}
				// If all parts are the same up to the length of the shorter path,
				// the shorter one comes first
				return aParts.length - bParts.length
			})

		const clineIgnoreParsed = clineIgnoreController
			? sorted.map((filePath) => {
					// path is relative to absolute path, not cwd
					// validateAccess expects either path relative to cwd or absolute path
					// otherwise, for validating against ignore patterns like "assets/icons", we would end up with just "icons", which would result in the path not being ignored.
					const absoluteFilePath = path.resolve(absolutePath, filePath)
					const isIgnored = !clineIgnoreController.validateAccess(absoluteFilePath)
					if (isIgnored) {
						return LOCK_TEXT_SYMBOL + " " + filePath
					}

					return filePath
				})
			: sorted

		if (didHitLimit) {
			return `${clineIgnoreParsed.join(
				"\n",
			)}\n\n(File list truncated. Use list_files on specific subdirectories if you need to explore further.)`
		}
		if (clineIgnoreParsed.length === 0 || (clineIgnoreParsed.length === 1 && clineIgnoreParsed[0] === "")) {
			return "No files found."
		}
		return clineIgnoreParsed.join("\n")
	},

	createPrettyPatch: (filename = "file", oldStr?: string, newStr?: string) => {
		// strings cannot be undefined or diff throws exception
		const patch = diff.createPatch(filename.toPosix(), oldStr || "", newStr || "")
		const lines = patch.split("\n")
		const prettyPatchLines = lines.slice(4)
		return prettyPatchLines.join("\n")
	},

	taskResumption: (
		mode: Mode,
		agoText: string,
		cwd: string,
		wasRecent: boolean | 0 | undefined,
		responseText?: string,
		hasPendingFileContextWarnings?: boolean,
	): [string, string] => {
		const taskResumptionMessage = `${formatResponse.systemGeneratedContextNotice()}\n\n[CONVERSATION REOPENED] ${
			mode === "plan"
				? `This conversation was reopened ${agoText}. The current working directory is now '${cwd.toPosix()}'. Review the latest context before responding. If you previously attempted a tool use that the user did not provide a result for, assume that tool use was not successful. Because you are in PLAN MODE, respond to the user's latest input instead of advancing the task directly.`
				: `This conversation was reopened ${agoText}. The current working directory is now '${cwd.toPosix()}'. Review the latest context before continuing work. If the prior run stopped mid-step, reassess the current state before proceeding.\n\nNote: If you previously attempted a tool use that the user did not provide a result for, you should assume the tool use was not successful and assess whether you should retry. If the last tool was a browser_action, the browser has been closed and you must launch a new browser if needed.`
		}${
			wasRecent && !hasPendingFileContextWarnings
				? "\n\nIMPORTANT: If the last tool use was a replace_in_file or write_to_file that was interrupted, the file was reverted back to its original state before the interrupted edit, and you do NOT need to re-read the file as you already have its up-to-date contents."
				: ""
		}`

		const userResponseMessage = `${
			responseText
				? `${mode === "plan" ? "Latest human-authored input for generate_plan_output (be sure to provide your response in the <response> parameter)" : "Latest human-authored input for the reopened thread"}:\n${formatResponse.latestHumanInput("user_message", responseText)}`
				: mode === "plan"
					? "(Conversation reopened without a new human message. Review the existing context and use ask_followup_question only if clarification is genuinely required.)"
					: ""
		}`

		return [taskResumptionMessage, userResponseMessage]
	},

	planModeInstructions: () => {
		return `In this mode you should focus on information gathering, asking questions, and architecting a solution. Once you have a plan, use the generate_plan_output tool to engage in a conversational back and forth with the user. Do not use the generate_plan_output tool until you've gathered all the information you need e.g. with read_file or ask_followup_question.
(Remember: If it seems the user wants you to use tools only available in Act Mode, you should ask the user to "toggle to Act mode" (use those words) - they will have to manually do this themselves with the Plan/Act toggle button below. You do not have the ability to switch to Act Mode yourself, and must wait for the user to do it themselves once they are satisfied with the plan. You also cannot present an option to toggle to Act mode, as this will be something you need to direct the user to do manually themselves.)`
	},

	fileEditWithUserChanges: (
		relPath: string,
		userEdits: string,
		autoFormattingEdits: string | undefined,
		previousContent: string | undefined,
		finalContent: string | undefined,
		isNewFile: boolean,
		newProblemsMessage: string | undefined,
	) =>
		`The user made the following updates to your content:\n\n${userEdits}\n\n` +
		(autoFormattingEdits
			? `The user's editor also applied the following auto-formatting to your content:\n\n${autoFormattingEdits}\n\n(Note: Pay close attention to changes such as single quotes being converted to double quotes, semicolons being removed or added, long lines being broken into multiple lines, adjusting indentation style, adding/removing trailing commas, etc. This will help you ensure future SEARCH/REPLACE operations to this file are accurate.)\n\n`
			: "") +
		`The updated content, which includes both your original modifications and the additional edits, has been successfully saved to ${relPath.toPosix()}.\n\n` +
		formatSavedFileReference(relPath, previousContent, finalContent, isNewFile, {
			autoFormattingApplied: !!autoFormattingEdits,
			userEditsApplied: true,
		}) +
		`Please note:\n` +
		`1. You do not need to re-write the file with these changes, as they have already been applied.\n` +
		`2. Proceed with the task using this updated file state as the new baseline.\n` +
		`3. If the user's edits have addressed part of the task or changed the requirements, adjust your approach accordingly.\n` +
		`${newProblemsMessage}`,

	fileEditWithoutUserChanges: (
		relPath: string,
		autoFormattingEdits: string | undefined,
		previousContent: string | undefined,
		finalContent: string | undefined,
		isNewFile: boolean,
		newProblemsMessage: string | undefined,
	) =>
		`The content was successfully saved to ${relPath.toPosix()}.\n\n` +
		(autoFormattingEdits
			? `Along with your edits, the user's editor applied the following auto-formatting to your content:\n\n${autoFormattingEdits}\n\n(Note: Pay close attention to changes such as single quotes being converted to double quotes, semicolons being removed or added, long lines being broken into multiple lines, adjusting indentation style, adding/removing trailing commas, etc. This will help you ensure future SEARCH/REPLACE operations to this file are accurate.)\n\n`
			: "") +
		formatSavedFileReference(relPath, previousContent, finalContent, isNewFile, {
			autoFormattingApplied: !!autoFormattingEdits,
			userEditsApplied: false,
		}) +
		`${newProblemsMessage}`,

	diffError: (relPath: string, originalContent: string | undefined) =>
		`This is likely because the SEARCH block content doesn't match exactly with what's in the file, or if you used multiple SEARCH/REPLACE blocks they may not have been in the order they appear in the file. (Please also ensure that when using the replace_in_file tool, Do NOT add extra characters to the markers (e.g., ------- SEARCH> is INVALID). Do NOT forget to use the closing +++++++ REPLACE marker. Do NOT modify the marker format in any way. Malformed XML will cause complete tool failure and break the entire editing process.)\n\n` +
		`The file was reverted to its original state:\n\n` +
		`<file_content path="${relPath.toPosix()}">\n${originalContent}\n</file_content>\n\n` +
		`Now that you have the latest state of the file, try the operation again with fewer, more precise SEARCH blocks. For large files especially, it may be prudent to try to limit yourself to <5 SEARCH/REPLACE blocks at a time, then wait for the user to respond with the result of the operation before following up with another replace_in_file call to make additional edits.\n(If you run into this error 3 times in a row, you may use the write_to_file tool as a fallback.)`,

	toolAlreadyUsed: (toolName: string) =>
		`Tool [${toolName}] was not executed because a tool has already been used in this message. Only one tool may be used per message. You must assess the first tool's result before proceeding to use the next tool.`,

	clineIgnoreInstructions: (content: string) =>
		`# .clineignore\n\n(The following is provided by a root-level .clineignore file where the user has specified files and directories that should not be accessed. When using list_files, you'll notice a ${LOCK_TEXT_SYMBOL} next to files that are blocked. Attempting to access the file's contents e.g. through read_file will result in an error.)\n\n${content}\n.clineignore`,

	clineRulesGlobalDirectoryInstructions: (globalClineRulesFilePath: string, content: string) =>
		`# .clinerules/\n\nThe following is provided by a global .clinerules/ directory, located at ${globalClineRulesFilePath.toPosix()}, where the user has specified instructions for all working directories:\n\n${content}`,

	clineRulesLocalDirectoryInstructions: (cwd: string, content: string) =>
		`# .clinerules/\n\nThe following is provided by a root-level .clinerules/ directory where the user has specified instructions for this working directory (${cwd.toPosix()})\n\n${content}`,

	clineRulesLocalFileInstructions: (cwd: string, content: string) =>
		`# .clinerules\n\nThe following is provided by a root-level .clinerules file where the user has specified instructions for this working directory (${cwd.toPosix()})\n\n${content}`,

	windsurfRulesLocalFileInstructions: (cwd: string, content: string) =>
		`# .windsurfrules\n\nThe following is provided by a root-level .windsurfrules file where the user has specified instructions for this working directory (${cwd.toPosix()})\n\n${content}`,

	cursorRulesLocalFileInstructions: (cwd: string, content: string) =>
		`# .cursorrules\n\nThe following is provided by a root-level .cursorrules file where the user has specified instructions for this working directory (${cwd.toPosix()})\n\n${content}`,

	cursorRulesLocalDirectoryInstructions: (cwd: string, content: string) =>
		`# .cursor/rules\n\nThe following is provided by a root-level .cursor/rules directory where the user has specified instructions for this working directory (${cwd.toPosix()})\n\n${content}`,

	agentsRulesLocalFileInstructions: (cwd: string, content: string) =>
		`# AGENTS.md\n\nThe following is provided by AGENTS.md files found recursively throughout this working directory (${cwd.toPosix()}) where the user has specified instructions. Nested AGENTS.md will be combined below, and you should only apply the instructions for each AGENTS.md file that is directly applicable to the current task, i.e. if you are reading or writing to a file in that directory.\n\n${content}`,

	fileContextWarning: (editedFiles: string[]): string => {
		const fileCount = editedFiles.length
		const fileVerb = fileCount === 1 ? "file has" : "files have"
		const fileDemonstrativePronoun = fileCount === 1 ? "this file" : "these files"
		const filePersonalPronoun = fileCount === 1 ? "it" : "they"

		return (
			`<explicit_instructions>\nCRITICAL FILE STATE ALERT: ${fileCount} ${fileVerb} been externally modified since your last interaction. Your cached understanding of ${fileDemonstrativePronoun} is now stale and unreliable. Before making ANY modifications to ${fileDemonstrativePronoun}, you must execute read_file to obtain the current state, as ${filePersonalPronoun} may contain completely different content than what you expect:\n` +
			`${editedFiles.map((file) => ` ${path.resolve(file).toPosix()}`).join("\n")}\n` +
			`Failure to re-read before editing will result in replace_in_file edit errors, requiring subsequent attempts and wasting tokens. You DO NOT need to re-read these files after subsequent edits, unless instructed to do so.\n</explicit_instructions>`
		)
	},
}

// to avoid circular dependency
const formatImagesIntoBlocks = (images?: string[]): Anthropic.ImageBlockParam[] => {
	return images
		? images.map((dataUrl) => {
				// data:image/png;base64,base64string
				const [rest, base64] = dataUrl.split(",")
				const mimeType = rest.split(":")[1].split(";")[0]
				return {
					type: "image",
					source: {
						type: "base64",
						media_type: mimeType,
						data: base64,
					},
				} as Anthropic.ImageBlockParam
			})
		: []
}

const toolUseInstructionsReminder = `# Reminder: Instructions for Tool Use
Tool uses are formatted using XML-style tags. The tool name is enclosed in opening and closing tags, and each parameter is similarly enclosed within its own set of tags. Here's the structure:
<tool_name>
<parameter1_name>value1</parameter1_name>
<parameter2_name>value2</parameter2_name>
...
</tool_name>
For example:
<attempt_completion>
<result>
I have completed the task...
</result>
</attempt_completion>
Always adhere to this format for all tool uses to ensure proper parsing and execution.`
