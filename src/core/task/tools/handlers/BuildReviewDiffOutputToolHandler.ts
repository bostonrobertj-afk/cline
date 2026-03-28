import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { buildWorkflowStablePlaceholders, resolveWorkflowPlaceholderText } from "@core/workflows/workflow-placeholders"
import { getWorkspaceBasename } from "@core/workspace"
import { getReadablePath, isLocatedInWorkspace } from "@utils/path"
import fs from "fs/promises"
import path from "path"
import simpleGit from "simple-git"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IPartialBlockHandler, IToolHandler } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { ToolResultUtils } from "../utils/ToolResultUtils"

type ReviewDiffSource =
	| { type: "commit"; commit: string }
	| { type: "commit_range"; base: string; head: string }
	| { type: "ref_diff"; base: string; head: string }
	| { type: "worktree_head_scoped" }

function parseObjectInput(value: unknown): Record<string, unknown> | null {
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value)
			if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
				return parsed as Record<string, unknown>
			}
		} catch {
			return null
		}

		return null
	}

	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>
	}

	return null
}

function toTrimmedString(value: unknown): string {
	return typeof value === "string" ? value.trim() : ""
}

function parseSource(value: unknown): ReviewDiffSource | null {
	const parsed = parseObjectInput(value)
	if (!parsed) {
		return null
	}

	const type = toTrimmedString(parsed.type)
	switch (type) {
		case "commit":
			return { type: "commit", commit: toTrimmedString(parsed.commit) }
		case "commit_range":
			return {
				type: "commit_range",
				base: toTrimmedString(parsed.base),
				head: toTrimmedString(parsed.head),
			}
		case "ref_diff":
			return {
				type: "ref_diff",
				base: toTrimmedString(parsed.base),
				head: toTrimmedString(parsed.head),
			}
		case "worktree_head_scoped":
			return { type: "worktree_head_scoped" }
		default:
			return null
	}
}

function parseScopedPaths(value: unknown): string[] {
	let rawValue = value
	if (typeof value === "string") {
		try {
			rawValue = JSON.parse(value)
		} catch {
			return []
		}
	}

	if (!Array.isArray(rawValue)) {
		return []
	}

	return rawValue
		.filter((entry): entry is string => typeof entry === "string")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
}

function parseContextLines(value: unknown): number | null {
	if (value === undefined) {
		return 3
	}

	if (typeof value === "number") {
		return Number.isInteger(value) && value >= 0 ? value : null
	}

	if (typeof value === "string") {
		const parsed = Number(value.trim())
		return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
	}

	return null
}

function formatCommandForArtifact(args: string[]): string {
	return args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(" ")
}

async function atomicReplaceTextFile(filePath: string, content: string): Promise<void> {
	const parentDir = path.dirname(filePath)
	const tempFilePath = path.join(parentDir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`)

	await fs.mkdir(parentDir, { recursive: true })

	try {
		await fs.writeFile(tempFilePath, content, "utf8")
		await fs.rename(tempFilePath, filePath)
	} catch (error) {
		try {
			await fs.unlink(tempFilePath)
		} catch {
			// Ignore temp-file cleanup failures.
		}
		throw error
	}
}

function buildArtifactContent(args: {
	source: ReviewDiffSource
	rawDiff: string
	displayCommand: string
	parent?: string
	subject?: string
	scopedPaths: string[]
}): string {
	const rawDiff = args.rawDiff.trimEnd()

	switch (args.source.type) {
		case "commit":
			return `# Review Diff Output

## Source
- Type: commit
- Commit: \`${args.source.commit}\`
- Parent: \`${args.parent ?? "(none)"}\`
- Commit message: \`${args.subject ?? ""}\`
- Command: \`${args.displayCommand}\`

## Diff
\`\`\`diff
${rawDiff}
\`\`\`
`
		case "commit_range":
			return `# Review Diff Output

## Source
- Type: commit_range
- Base: \`${args.source.base}\`
- Head: \`${args.source.head}\`
- Command: \`${args.displayCommand}\`

## Diff
\`\`\`diff
${rawDiff}
\`\`\`
`
		case "ref_diff":
			return `# Review Diff Output

## Source
- Type: ref_diff
- Base: \`${args.source.base}\`
- Head: \`${args.source.head}\`
- Command: \`${args.displayCommand}\`

## Diff
\`\`\`diff
${rawDiff}
\`\`\`
`
		case "worktree_head_scoped":
			return `# Review Diff Output

## Source
- Type: worktree_head_scoped
- Ref: \`HEAD\`
- Scoped paths: \`${args.scopedPaths.join(", ")}\`
- Command: \`${args.displayCommand}\`

## Diff
\`\`\`diff
${rawDiff}
\`\`\`
`
	}
}

export class BuildReviewDiffOutputToolHandler implements IToolHandler, IPartialBlockHandler {
	readonly name = ClineDefaultTool.BUILD_REVIEW_DIFF_OUTPUT

	getDescription(block: ToolUse): string {
		const source = parseSource((block.params as Record<string, unknown>).source)
		const sourceType = source?.type ?? "unknown"
		return `[${block.name} ${sourceType}]`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const source = parseSource((block.params as Record<string, unknown>).source)
		const sourceType = source?.type ?? "unknown"
		await uiHelpers.say("tool", JSON.stringify({ tool: "buildReviewDiffOutput", sourceType }), undefined, undefined, true)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const params = block.params as Record<string, unknown>
		const rawSource = parseObjectInput(params.source)
		const source = parseSource(params.source)
		const scopedPaths = parseScopedPaths(params.scoped_paths)
		const contextLines = parseContextLines(params.context_lines)

		if (!rawSource || typeof rawSource.type !== "string" || rawSource.type.trim().length === 0) {
			config.taskState.consecutiveMistakeCount++
			return "Error: Missing required parameter 'source'. Provide an object with a supported source.type."
		}

		if (contextLines === null) {
			config.taskState.consecutiveMistakeCount++
			return "Error: 'context_lines' must be a non-negative integer."
		}

		const rawSourceType = rawSource.type.trim()
		if (!source) {
			config.taskState.consecutiveMistakeCount++
			return `Error: Unsupported source.type "${rawSourceType}". Supported values: commit, commit_range, ref_diff, worktree_head_scoped.`
		}

		if (source.type === "commit" && !source.commit) {
			config.taskState.consecutiveMistakeCount++
			return 'Error: source.commit is required when source.type is "commit".'
		}

		if (source.type === "commit_range" && (!source.base || !source.head)) {
			config.taskState.consecutiveMistakeCount++
			return 'Error: source.base and source.head are required when source.type is "commit_range".'
		}

		if (source.type === "ref_diff" && (!source.base || !source.head)) {
			config.taskState.consecutiveMistakeCount++
			return 'Error: source.base and source.head are required when source.type is "ref_diff".'
		}

		if (source.type === "worktree_head_scoped" && scopedPaths.length === 0) {
			config.taskState.consecutiveMistakeCount++
			return 'Error: scoped_paths is required and must contain at least one path when source.type is "worktree_head_scoped".'
		}

		const stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd: config.cwd })
		let diffOutputRaw: string | undefined = stablePlaceholders.diff_output
		if (!diffOutputRaw) {
			diffOutputRaw = resolveWorkflowPlaceholderText("{output_folder}/review-input.diff", stablePlaceholders)
		}

		if (!diffOutputRaw) {
			return formatResponse.toolError(
				"Could not resolve stable placeholder 'diff_output' or 'output_folder' from .cline/workflow-config.yaml.",
			)
		}

		const outputPath = path.isAbsolute(diffOutputRaw) ? diffOutputRaw : path.resolve(config.cwd, diffOutputRaw)

		try {
			const git = simpleGit(config.cwd)
			const isRepo = await git.checkIsRepo()
			if (!isRepo) {
				return formatResponse.toolError(`The current directory (${config.cwd}) is not a git repository.`)
			}

			const validateRef = async (ref: string) => {
				try {
					await git.revparse([ref])
				} catch {
					throw new Error(
						`Invalid git reference '${ref}'. Please provide a valid commit hash, branch name, tag, or relative reference.`,
					)
				}
			}

			if (source.type === "commit") {
				await validateRef(source.commit)
			}
			if (source.type === "commit_range") {
				await validateRef(source.base)
				await validateRef(source.head)
			}
			if (source.type === "ref_diff") {
				await validateRef(source.base)
				await validateRef(source.head)
			}

			let diffArgs: string[]
			let sourceLabel: string
			let parent: string | undefined
			let subject: string | undefined

			switch (source.type) {
				case "commit":
					diffArgs = [
						"show",
						"--format=medium",
						`--unified=${contextLines}`,
						source.commit,
						...(scopedPaths.length ? ["--", ...scopedPaths] : []),
					]
					sourceLabel = `commit ${source.commit}`
					subject = (await git.raw(["show", "-s", "--format=%s", source.commit])).trim()
					const parentLine = (await git.raw(["rev-list", "--parents", "-n", "1", source.commit])).trim()
					parent = parentLine.split(/\s+/)[1] ?? "(none)"
					break
				case "commit_range":
					diffArgs = [
						"diff",
						`--unified=${contextLines}`,
						`${source.base}..${source.head}`,
						...(scopedPaths.length ? ["--", ...scopedPaths] : []),
					]
					sourceLabel = `commit_range ${source.base}..${source.head}`
					break
				case "ref_diff":
					diffArgs = [
						"diff",
						`--unified=${contextLines}`,
						`${source.base}..${source.head}`,
						...(scopedPaths.length ? ["--", ...scopedPaths] : []),
					]
					sourceLabel = `ref_diff ${source.base}..${source.head}`
					break
				case "worktree_head_scoped":
					diffArgs = ["diff", `--unified=${contextLines}`, "HEAD", "--", ...scopedPaths]
					sourceLabel = "worktree_head_scoped HEAD"
					break
			}

			const rawDiff = await git.raw(diffArgs)
			if (!rawDiff.trim() || !rawDiff.includes("diff --git")) {
				return formatResponse.toolResult(
					JSON.stringify({
						persisted: false,
						diff_available: false,
						reason: "No Git-backed diff content was available for the requested source and scope.",
					}),
				)
			}

			const displayCommand = formatCommandForArtifact(["git", ...diffArgs])
			const artifactContent = buildArtifactContent({
				source,
				rawDiff,
				displayCommand,
				parent,
				subject,
				scopedPaths,
			})

			const completeMessage = JSON.stringify({
				tool: "buildReviewDiffOutput",
				path: getReadablePath(config.cwd, outputPath),
				content: `Source: ${sourceLabel}\nCommand: ${displayCommand}`,
				operationIsLocatedInWorkspace: await isLocatedInWorkspace(outputPath),
			})

			const shouldAutoApprove =
				config.isSubagentExecution || (await config.callbacks.shouldAutoApproveToolWithPath(block.name, outputPath))

			if (shouldAutoApprove) {
				if (!config.isSubagentExecution) {
					await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
					await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
				}
			} else {
				showNotificationForApproval(
					`Cline wants to build ${getWorkspaceBasename(outputPath, "BuildReviewDiffOutput.notification")}`,
					config.autoApprovalSettings.enableNotifications,
				)

				await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")

				const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
				if (!didApprove) {
					return formatResponse.toolDenied()
				}
			}

			try {
				const { ToolHookUtils } = await import("../utils/ToolHookUtils")
				await ToolHookUtils.runPreToolUseIfEnabled(config, block)
			} catch (error) {
				const { PreToolUseHookCancellationError } = await import("@core/hooks/PreToolUseHookCancellationError")
				if (error instanceof PreToolUseHookCancellationError) {
					return formatResponse.toolDenied()
				}
				throw error
			}

			await atomicReplaceTextFile(outputPath, artifactContent)
			config.taskState.didEditFile = true
			config.taskState.fileReadCache.delete(outputPath.toLowerCase())
			config.taskState.consecutiveMistakeCount = 0

			return formatResponse.toolResult(
				JSON.stringify({
					persisted: true,
					diff_available: true,
					artifact_path: outputPath,
					source_label: sourceLabel,
					scoped_path_count: scopedPaths.length,
				}),
			)
		} catch (error) {
			return formatResponse.toolError(error instanceof Error ? error.message : String(error))
		}
	}
}
