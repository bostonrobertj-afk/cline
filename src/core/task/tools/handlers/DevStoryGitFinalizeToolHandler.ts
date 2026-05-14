import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { execa } from "execa"
import { readFile } from "fs/promises"
import path from "path"
import {
	DEV_STORY_WORKFLOW_NAME,
	getAllowedFileEntriesForCompletedStory,
	parseDevStoryDocument,
	type StoryTaskAllowedFileEntry,
} from "@/core/task/story-tools/storyTaskDocument"
import { parseWorkflowStoryIndexJson } from "@/core/task/workflow-runtime/storyArtifacts"
import type { ActiveWorkflowSession, WorkflowValue, WorkflowValues } from "@/core/task/workflow-runtime/types"
import { ClineDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import type { IToolHandler } from "../ToolExecutorCoordinator"
import type { ToolValidator } from "../ToolValidator"
import type { TaskConfig } from "../types/TaskConfig"

export interface DevStoryGitCommandCall {
	cwd: string
	args: readonly string[]
}

export interface DevStoryGitCommandResult {
	exitCode: number
	stdout: string
	stderr: string
}

export type DevStoryGitCommandRunner = (call: DevStoryGitCommandCall) => Promise<DevStoryGitCommandResult>

type DevStoryGitFinalizeOperation = "prepare_staging" | "stage_selected_unpermitted" | "commit_staged"

const TARGET_STORY_FILENAME_VALUE_KEY = "target_story_filename"
const SELECTED_STORY_IDENTITY_VALUE_KEY = "selected_story_identity"
const STORIES_INDEX_VALUE_KEY = "stories_index"
const UNPERMITTED_FILE_PATHS_VALUE_KEY = "unpermitted_file_paths"
const SELECTED_UNPERMITTED_FILE_PATHS_VALUE_KEY = "selected_unpermitted_file_paths"
const COMMIT_STAGED_FILES_VALUE_KEY = "commit_staged_files"
const PREPARE_STAGING_STATUS_ARGS = ["status", "--porcelain=v1", "-z", "--untracked-files=all"] as const
const GIT_ADD_ALL_PATHS_PREFIX = ["add", "-A", "--"] as const
const GIT_RESTORE_STAGED_PATH_PREFIX = ["restore", "--staged", "--"] as const
const GIT_DIFF_CACHED_QUIET_ARGS = ["diff", "--cached", "--quiet"] as const
const GIT_COMMIT_MESSAGE_PREFIX = "dev-story workflow run: story: "

type ValueReadResult<ValueType> = { ok: true; value: ValueType } | { ok: false; message: string }

interface ActiveDevStoryContext {
	session: ActiveWorkflowSession
	gitRoot: string
}

interface PrepareStagingContext extends ActiveDevStoryContext {
	selectedProjectRoot: string
	storiesIndex: string
	targetStoryFilename: string
	storyIdentity: string
}

interface StageSelectedUnpermittedContext extends ActiveDevStoryContext {
	unpermittedFilePaths: readonly string[]
	selectedUnpermittedFilePaths: readonly string[]
}

interface CommitStagedContext extends ActiveDevStoryContext {
	commitStagedFiles: boolean
	storyIdentity: string
}

interface ResolvedGitPath {
	fullPath: string
	normalizedGitPath: string
}

interface PorcelainStatusRecord extends ResolvedGitPath {
	statusColumns: string
	alreadyStaged: boolean
}

export async function defaultDevStoryGitCommandRunner(call: DevStoryGitCommandCall): Promise<DevStoryGitCommandResult> {
	const result = await execa("git", [...call.args], { cwd: call.cwd, shell: false, reject: false })
	return {
		exitCode: result.exitCode ?? 1,
		stdout: result.stdout,
		stderr: result.stderr,
	}
}

function readRequiredOperation(block: ToolUse): string | undefined {
	const operation = block.params.operation
	if (typeof operation !== "string") {
		return undefined
	}

	const trimmedOperation = operation.trim()
	return trimmedOperation === "" ? undefined : trimmedOperation
}

function isDevStoryGitFinalizeOperation(operation: string): operation is DevStoryGitFinalizeOperation {
	switch (operation) {
		case "prepare_staging":
		case "stage_selected_unpermitted":
		case "commit_staged":
			return true
		default:
			return false
	}
}

function readRequiredStringWorkflowValue(args: {
	workflowValues: WorkflowValues
	key: string
	operation: string
}): ValueReadResult<string> {
	const value = args.workflowValues[args.key]
	if (typeof value !== "string") {
		return {
			ok: false,
			message: `dev_story_git_finalize ${args.operation} failed: workflow value '${args.key}' must be a non-empty string.`,
		}
	}

	const trimmedValue = value.trim()
	if (trimmedValue === "") {
		return {
			ok: false,
			message: `dev_story_git_finalize ${args.operation} failed: workflow value '${args.key}' must be a non-empty string.`,
		}
	}

	return { ok: true, value: trimmedValue }
}

function readRequiredBooleanWorkflowValue(args: {
	workflowValues: WorkflowValues
	key: string
	operation: string
}): ValueReadResult<boolean> {
	const value = args.workflowValues[args.key]
	if (typeof value !== "boolean") {
		return {
			ok: false,
			message: `dev_story_git_finalize ${args.operation} failed: workflow value '${args.key}' must be a boolean.`,
		}
	}

	return { ok: true, value }
}

function readRequiredStringArrayWorkflowValue(args: {
	workflowValues: WorkflowValues
	key: string
	operation: string
}): ValueReadResult<readonly string[]> {
	const value: WorkflowValue | undefined = args.workflowValues[args.key]
	if (!Array.isArray(value)) {
		return {
			ok: false,
			message: `dev_story_git_finalize ${args.operation} failed: workflow value '${args.key}' must be an array of strings.`,
		}
	}

	const normalizedValues: string[] = []
	for (const entry of value) {
		if (typeof entry !== "string") {
			return {
				ok: false,
				message: `dev_story_git_finalize ${args.operation} failed: workflow value '${args.key}' must be an array of strings.`,
			}
		}
		normalizedValues.push(entry)
	}

	return { ok: true, value: normalizedValues }
}

function resolveStoriesIndexPath(gitRoot: string, storiesIndex: string): string {
	return path.isAbsolute(storiesIndex) ? path.normalize(storiesIndex) : path.resolve(gitRoot, storiesIndex)
}

function isPathInsideRoot(rootPath: string, candidatePath: string): boolean {
	const relativePath = path.relative(rootPath, candidatePath)
	return relativePath === "" || (relativePath.startsWith("..") === false && path.isAbsolute(relativePath) === false)
}

function normalizeGitPath(gitPath: string): string {
	let normalizedPath = gitPath.replace(/\\/g, "/")
	while (normalizedPath.startsWith("./")) {
		normalizedPath = normalizedPath.slice(2)
	}
	return normalizedPath
}

function resolveGitStatusPath(args: {
	gitRoot: string
	gitPath: string
	operation: DevStoryGitFinalizeOperation
}): ValueReadResult<ResolvedGitPath> {
	const normalizedGitPath = normalizeGitPath(args.gitPath)
	if (normalizedGitPath === "" || path.isAbsolute(normalizedGitPath)) {
		return {
			ok: false,
			message: `dev_story_git_finalize ${args.operation} failed: changed git path ${args.gitPath} is not a relative path under the git root.`,
		}
	}

	const fullPath = path.resolve(args.gitRoot, normalizedGitPath)
	if (!isPathInsideRoot(args.gitRoot, fullPath)) {
		return {
			ok: false,
			message: `dev_story_git_finalize ${args.operation} failed: changed git path ${normalizedGitPath} resolves outside git root ${args.gitRoot}.`,
		}
	}

	return {
		ok: true,
		value: {
			fullPath,
			normalizedGitPath,
		},
	}
}

function resolveFullPathUnderGitRoot(args: {
	gitRoot: string
	fullPath: string
	operation: DevStoryGitFinalizeOperation
	pathRole: string
}): ValueReadResult<ResolvedGitPath> {
	const fullPath = path.normalize(args.fullPath)
	if (!isPathInsideRoot(args.gitRoot, fullPath)) {
		return {
			ok: false,
			message: `dev_story_git_finalize ${args.operation} failed: ${args.pathRole} ${fullPath} resolves outside git root ${args.gitRoot}.`,
		}
	}

	const relativePath = path.relative(args.gitRoot, fullPath)
	if (relativePath === "") {
		return {
			ok: false,
			message: `dev_story_git_finalize ${args.operation} failed: ${args.pathRole} ${fullPath} must resolve to a file path under the git root.`,
		}
	}

	return {
		ok: true,
		value: {
			fullPath,
			normalizedGitPath: normalizeGitPath(relativePath.split(path.sep).join("/")),
		},
	}
}

function resolveAllowedFilePath(args: {
	gitRoot: string
	allowedFile: StoryTaskAllowedFileEntry
	operation: DevStoryGitFinalizeOperation
}): ValueReadResult<ResolvedGitPath> {
	const rawAllowedPath = args.allowedFile.path.trim()
	const fullPath = path.isAbsolute(rawAllowedPath) ? path.normalize(rawAllowedPath) : path.resolve(args.gitRoot, rawAllowedPath)
	const resolved = resolveFullPathUnderGitRoot({
		gitRoot: args.gitRoot,
		fullPath,
		operation: args.operation,
		pathRole: `allowed-file path ${rawAllowedPath}`,
	})
	if (!resolved.ok) {
		return resolved
	}

	return resolved
}

function hasAcceptedStatus(statusColumns: string): boolean {
	return (
		statusColumns.includes("M") || statusColumns.includes("A") || statusColumns.includes("D") || statusColumns.includes("T")
	)
}

function parsePorcelainStatusRecords(args: {
	stdout: string
	gitRoot: string
	operation: DevStoryGitFinalizeOperation
}): ValueReadResult<readonly PorcelainStatusRecord[]> {
	const records = args.stdout.split("\0")
	if (records[records.length - 1] === "") {
		records.pop()
	}

	const parsedRecords: PorcelainStatusRecord[] = []
	for (const record of records) {
		if (record.length < 4 || record[2] !== " ") {
			return {
				ok: false,
				message: `dev_story_git_finalize ${args.operation} failed: malformed git status record '${record}'.`,
			}
		}

		const statusColumns = record.slice(0, 2)
		const gitPath = record.slice(3)
		if (gitPath.trim() === "") {
			return {
				ok: false,
				message: `dev_story_git_finalize ${args.operation} failed: malformed git status record '${record}'.`,
			}
		}

		if (statusColumns === "!!") {
			continue
		}

		if (statusColumns.includes("U")) {
			return {
				ok: false,
				message: `dev_story_git_finalize ${args.operation} failed: unmerged git status '${statusColumns}' for path ${gitPath}.`,
			}
		}

		if (statusColumns.includes("R")) {
			return {
				ok: false,
				message: `dev_story_git_finalize ${args.operation} failed: rename git status '${statusColumns}' for path ${gitPath} is not supported.`,
			}
		}

		if (statusColumns.includes("C")) {
			return {
				ok: false,
				message: `dev_story_git_finalize ${args.operation} failed: copy git status '${statusColumns}' for path ${gitPath} is not supported.`,
			}
		}

		if (statusColumns !== "??" && !hasAcceptedStatus(statusColumns)) {
			return {
				ok: false,
				message: `dev_story_git_finalize ${args.operation} failed: malformed git status '${statusColumns}' for path ${gitPath}.`,
			}
		}

		const resolvedPath = resolveGitStatusPath({
			gitRoot: args.gitRoot,
			gitPath,
			operation: args.operation,
		})
		if (!resolvedPath.ok) {
			return resolvedPath
		}

		parsedRecords.push({
			...resolvedPath.value,
			statusColumns,
			alreadyStaged: statusColumns[0] !== " ",
		})
	}

	return { ok: true, value: parsedRecords }
}

function appendUniquePath(paths: string[], pathToAppend: string): void {
	if (!paths.includes(pathToAppend)) {
		paths.push(pathToAppend)
	}
}

function deriveSelectedProjectRoot(args: { gitRoot: string; storiesIndex: string; operation: string }): ValueReadResult<{
	selectedProjectRoot: string
	storiesIndex: string
}> {
	const storiesIndex = resolveStoriesIndexPath(args.gitRoot, args.storiesIndex)
	const implementationFolder = path.dirname(storiesIndex)
	if (path.basename(implementationFolder) !== "implementation") {
		return {
			ok: false,
			message: `dev_story_git_finalize ${args.operation} failed: stories_index path ${storiesIndex} must be inside an implementation folder.`,
		}
	}

	return {
		ok: true,
		value: {
			selectedProjectRoot: path.dirname(implementationFolder),
			storiesIndex,
		},
	}
}

function readActiveDevStoryContext(
	config: TaskConfig,
	operation: DevStoryGitFinalizeOperation,
): ValueReadResult<ActiveDevStoryContext> {
	const session = config.taskState.activeWorkflowSession
	if (config.taskState.activeWorkflowName !== DEV_STORY_WORKFLOW_NAME || session === undefined) {
		return {
			ok: false,
			message: `dev_story_git_finalize ${operation} failed: requires an active dev-story workflow session.`,
		}
	}

	return {
		ok: true,
		value: {
			session,
			gitRoot: config.cwd,
		},
	}
}

function readPrepareStagingContext(config: TaskConfig): ValueReadResult<PrepareStagingContext> {
	const operation: DevStoryGitFinalizeOperation = "prepare_staging"
	const activeContext = readActiveDevStoryContext(config, operation)
	if (!activeContext.ok) {
		return activeContext
	}

	const targetStoryFilename = readRequiredStringWorkflowValue({
		workflowValues: activeContext.value.session.workflowValues,
		key: TARGET_STORY_FILENAME_VALUE_KEY,
		operation,
	})
	if (!targetStoryFilename.ok) {
		return targetStoryFilename
	}
	if (path.basename(targetStoryFilename.value) !== targetStoryFilename.value) {
		return {
			ok: false,
			message: `dev_story_git_finalize ${operation} failed: workflow value '${TARGET_STORY_FILENAME_VALUE_KEY}' must be a single filename path segment.`,
		}
	}

	const storyIdentity = readRequiredStringWorkflowValue({
		workflowValues: activeContext.value.session.workflowValues,
		key: SELECTED_STORY_IDENTITY_VALUE_KEY,
		operation,
	})
	if (!storyIdentity.ok) {
		return storyIdentity
	}

	const storiesIndex = readRequiredStringWorkflowValue({
		workflowValues: activeContext.value.session.workflowValues,
		key: STORIES_INDEX_VALUE_KEY,
		operation,
	})
	if (!storiesIndex.ok) {
		return storiesIndex
	}

	const selectedProjectRoot = deriveSelectedProjectRoot({
		gitRoot: activeContext.value.gitRoot,
		storiesIndex: storiesIndex.value,
		operation,
	})
	if (!selectedProjectRoot.ok) {
		return selectedProjectRoot
	}

	return {
		ok: true,
		value: {
			...activeContext.value,
			selectedProjectRoot: selectedProjectRoot.value.selectedProjectRoot,
			storiesIndex: selectedProjectRoot.value.storiesIndex,
			targetStoryFilename: targetStoryFilename.value,
			storyIdentity: storyIdentity.value,
		},
	}
}

function readStageSelectedUnpermittedContext(config: TaskConfig): ValueReadResult<StageSelectedUnpermittedContext> {
	const operation: DevStoryGitFinalizeOperation = "stage_selected_unpermitted"
	const activeContext = readActiveDevStoryContext(config, operation)
	if (!activeContext.ok) {
		return activeContext
	}

	const selectedPaths = readRequiredStringArrayWorkflowValue({
		workflowValues: activeContext.value.session.workflowValues,
		key: SELECTED_UNPERMITTED_FILE_PATHS_VALUE_KEY,
		operation,
	})
	if (!selectedPaths.ok) {
		return selectedPaths
	}

	const unpermittedPaths = readRequiredStringArrayWorkflowValue({
		workflowValues: activeContext.value.session.workflowValues,
		key: UNPERMITTED_FILE_PATHS_VALUE_KEY,
		operation,
	})
	if (!unpermittedPaths.ok) {
		return unpermittedPaths
	}

	return {
		ok: true,
		value: {
			...activeContext.value,
			unpermittedFilePaths: unpermittedPaths.value,
			selectedUnpermittedFilePaths: selectedPaths.value,
		},
	}
}

function readCommitStagedContext(config: TaskConfig): ValueReadResult<CommitStagedContext> {
	const operation: DevStoryGitFinalizeOperation = "commit_staged"
	const activeContext = readActiveDevStoryContext(config, operation)
	if (!activeContext.ok) {
		return activeContext
	}

	const commitStagedFiles = readRequiredBooleanWorkflowValue({
		workflowValues: activeContext.value.session.workflowValues,
		key: COMMIT_STAGED_FILES_VALUE_KEY,
		operation,
	})
	if (!commitStagedFiles.ok) {
		return commitStagedFiles
	}

	const storyIdentity = readRequiredStringWorkflowValue({
		workflowValues: activeContext.value.session.workflowValues,
		key: SELECTED_STORY_IDENTITY_VALUE_KEY,
		operation,
	})
	if (!storyIdentity.ok) {
		return storyIdentity
	}

	return {
		ok: true,
		value: {
			...activeContext.value,
			commitStagedFiles: commitStagedFiles.value,
			storyIdentity: storyIdentity.value,
		},
	}
}

export class DevStoryGitFinalizeToolHandler implements IToolHandler {
	readonly name = ClineDefaultTool.DEV_STORY_GIT_FINALIZE

	constructor(
		private readonly validator: ToolValidator,
		private readonly runner: DevStoryGitCommandRunner = defaultDevStoryGitCommandRunner,
	) {}

	getDescription(block: ToolUse): string {
		const operation = readRequiredOperation(block)
		return operation === undefined ? `[${block.name}]` : `[${block.name} ${operation}]`
	}

	private buildToolFailure(config: TaskConfig, message: string): ToolResponse {
		config.taskState.consecutiveMistakeCount += 1
		return formatResponse.toolError(message)
	}

	private validatePathAccess(args: {
		operation: DevStoryGitFinalizeOperation
		fullPath: string
		pathRole: string
	}): ValueReadResult<string> {
		const accessValidation = this.validator.checkClineIgnorePath(args.fullPath)
		if (!accessValidation.ok) {
			return {
				ok: false,
				message: `dev_story_git_finalize ${args.operation} failed: ${args.pathRole} ${args.fullPath} is blocked by workspace path policy. ${formatResponse.clineIgnoreError(args.fullPath)}`,
			}
		}

		return { ok: true, value: args.fullPath }
	}

	private resolveProjectRecordPaths(context: PrepareStagingContext): ValueReadResult<{
		backlogStory: ResolvedGitPath
		reviewStory: ResolvedGitPath
		storiesIndex: ResolvedGitPath
	}> {
		const operation: DevStoryGitFinalizeOperation = "prepare_staging"
		const backlogStoryPath = path.join(
			context.selectedProjectRoot,
			"implementation",
			"stories-backlog",
			context.targetStoryFilename,
		)
		const reviewStoryPath = path.join(
			context.selectedProjectRoot,
			"implementation",
			"stories-review",
			context.targetStoryFilename,
		)
		const backlogStory = resolveFullPathUnderGitRoot({
			gitRoot: context.gitRoot,
			fullPath: backlogStoryPath,
			operation,
			pathRole: "moved story source path",
		})
		if (!backlogStory.ok) {
			return backlogStory
		}

		const reviewStory = resolveFullPathUnderGitRoot({
			gitRoot: context.gitRoot,
			fullPath: reviewStoryPath,
			operation,
			pathRole: "moved story destination path",
		})
		if (!reviewStory.ok) {
			return reviewStory
		}

		const storiesIndex = resolveFullPathUnderGitRoot({
			gitRoot: context.gitRoot,
			fullPath: context.storiesIndex,
			operation,
			pathRole: "story index path",
		})
		if (!storiesIndex.ok) {
			return storiesIndex
		}

		return {
			ok: true,
			value: {
				backlogStory: backlogStory.value,
				reviewStory: reviewStory.value,
				storiesIndex: storiesIndex.value,
			},
		}
	}

	private async readAllowedFilePathSet(args: {
		context: PrepareStagingContext
		reviewStoryPath: string
	}): Promise<ValueReadResult<ReadonlySet<string>>> {
		const operation: DevStoryGitFinalizeOperation = "prepare_staging"
		const storyAccess = this.validatePathAccess({
			operation,
			fullPath: args.reviewStoryPath,
			pathRole: "target story path",
		})
		if (!storyAccess.ok) {
			return storyAccess
		}

		let storyMarkdown: string
		try {
			storyMarkdown = await readFile(args.reviewStoryPath, "utf8")
		} catch (error) {
			return {
				ok: false,
				message: `dev_story_git_finalize ${operation} failed: target story path ${args.reviewStoryPath} could not be read. ${error instanceof Error ? error.message : String(error)}`,
			}
		}

		const parsedDocument = parseDevStoryDocument(storyMarkdown)
		if (!parsedDocument.ok) {
			return {
				ok: false,
				message: `dev_story_git_finalize ${operation} failed: target story path ${args.reviewStoryPath} has malformed ## Tasks content. ${parsedDocument.message}`,
			}
		}

		const allowedFilePathSet = new Set<string>()
		for (const allowedFile of getAllowedFileEntriesForCompletedStory(parsedDocument.document)) {
			const resolvedAllowedFile = resolveAllowedFilePath({
				gitRoot: args.context.gitRoot,
				allowedFile,
				operation,
			})
			if (!resolvedAllowedFile.ok) {
				return resolvedAllowedFile
			}

			const allowedFileAccess = this.validatePathAccess({
				operation,
				fullPath: resolvedAllowedFile.value.fullPath,
				pathRole: `allowed-file path ${allowedFile.path}`,
			})
			if (!allowedFileAccess.ok) {
				return allowedFileAccess
			}

			allowedFilePathSet.add(path.normalize(resolvedAllowedFile.value.fullPath))
		}

		return { ok: true, value: allowedFilePathSet }
	}

	private async validateStoryIndexForPrepareStaging(args: {
		context: PrepareStagingContext
		storiesIndexPath: string
	}): Promise<ValueReadResult<string>> {
		const operation: DevStoryGitFinalizeOperation = "prepare_staging"
		let storyIndexJson: string
		try {
			storyIndexJson = await readFile(args.storiesIndexPath, "utf8")
		} catch (error) {
			return {
				ok: false,
				message: `dev_story_git_finalize ${operation} failed: story index path ${args.storiesIndexPath} for story ${args.context.storyIdentity} could not be read. ${error instanceof Error ? error.message : String(error)}`,
			}
		}

		try {
			const storyIndex = parseWorkflowStoryIndexJson(storyIndexJson)
			const selectedStory = storyIndex.stories.find((story) => story.story_identity === args.context.storyIdentity)
			if (selectedStory === undefined) {
				return {
					ok: false,
					message: `dev_story_git_finalize ${operation} failed: story index path ${args.storiesIndexPath} does not contain story ${args.context.storyIdentity}.`,
				}
			}
			if (selectedStory.story_file_name !== args.context.targetStoryFilename) {
				return {
					ok: false,
					message: `dev_story_git_finalize ${operation} failed: story index path ${args.storiesIndexPath} maps story ${args.context.storyIdentity} to ${selectedStory.story_file_name}, not ${args.context.targetStoryFilename}.`,
				}
			}
		} catch (error) {
			return {
				ok: false,
				message: `dev_story_git_finalize ${operation} failed: story index path ${args.storiesIndexPath} is malformed for story ${args.context.storyIdentity}. ${error instanceof Error ? error.message : String(error)}`,
			}
		}

		return { ok: true, value: args.storiesIndexPath }
	}

	private async runPrepareStaging(config: TaskConfig, context: PrepareStagingContext): Promise<ToolResponse> {
		const operation: DevStoryGitFinalizeOperation = "prepare_staging"
		const projectRecordPaths = this.resolveProjectRecordPaths(context)
		if (!projectRecordPaths.ok) {
			return this.buildToolFailure(config, projectRecordPaths.message)
		}

		const targetStoryAccess = this.validatePathAccess({
			operation,
			fullPath: projectRecordPaths.value.reviewStory.fullPath,
			pathRole: "target story path",
		})
		if (!targetStoryAccess.ok) {
			return this.buildToolFailure(config, targetStoryAccess.message)
		}

		for (const [pathRole, projectRecordPath] of [
			["moved story source path", projectRecordPaths.value.backlogStory.fullPath],
			["moved story destination path", projectRecordPaths.value.reviewStory.fullPath],
			["story index path", projectRecordPaths.value.storiesIndex.fullPath],
		] as const) {
			const accessValidation = this.validatePathAccess({ operation, fullPath: projectRecordPath, pathRole })
			if (!accessValidation.ok) {
				return this.buildToolFailure(config, accessValidation.message)
			}
		}

		const storyIndexValidation = await this.validateStoryIndexForPrepareStaging({
			context,
			storiesIndexPath: projectRecordPaths.value.storiesIndex.fullPath,
		})
		if (!storyIndexValidation.ok) {
			return this.buildToolFailure(config, storyIndexValidation.message)
		}

		const allowedFilePathSet = await this.readAllowedFilePathSet({
			context,
			reviewStoryPath: projectRecordPaths.value.reviewStory.fullPath,
		})
		if (!allowedFilePathSet.ok) {
			return this.buildToolFailure(config, allowedFilePathSet.message)
		}

		const statusResult = await this.runner({
			cwd: context.gitRoot,
			args: PREPARE_STAGING_STATUS_ARGS,
		})
		if (statusResult.exitCode !== 0) {
			return this.buildToolFailure(
				config,
				`dev_story_git_finalize ${operation} failed: git status failed in ${context.gitRoot}. ${statusResult.stderr || statusResult.stdout || `exit code ${statusResult.exitCode}`}`,
			)
		}

		const parsedStatusRecords = parsePorcelainStatusRecords({
			stdout: statusResult.stdout,
			gitRoot: context.gitRoot,
			operation,
		})
		if (!parsedStatusRecords.ok) {
			return this.buildToolFailure(config, parsedStatusRecords.message)
		}

		const projectRecordPathSet = new Set(
			[
				projectRecordPaths.value.backlogStory.fullPath,
				projectRecordPaths.value.reviewStory.fullPath,
				projectRecordPaths.value.storiesIndex.fullPath,
			].map((fullPath) => path.normalize(fullPath)),
		)
		const stagePaths: string[] = []
		const restoreStagedPaths: string[] = []
		const unpermittedFilePaths: string[] = []

		for (const statusRecord of parsedStatusRecords.value) {
			const accessValidation = this.validatePathAccess({
				operation,
				fullPath: statusRecord.fullPath,
				pathRole: `changed git path ${statusRecord.normalizedGitPath}`,
			})
			if (!accessValidation.ok) {
				return this.buildToolFailure(config, accessValidation.message)
			}

			const fullPathKey = path.normalize(statusRecord.fullPath)
			if (allowedFilePathSet.value.has(fullPathKey) || projectRecordPathSet.has(fullPathKey)) {
				appendUniquePath(stagePaths, statusRecord.normalizedGitPath)
				continue
			}

			appendUniquePath(unpermittedFilePaths, statusRecord.normalizedGitPath)
			if (statusRecord.alreadyStaged) {
				appendUniquePath(restoreStagedPaths, statusRecord.normalizedGitPath)
			}
		}

		if (stagePaths.length > 0) {
			const addResult = await this.runner({
				cwd: context.gitRoot,
				args: [...GIT_ADD_ALL_PATHS_PREFIX, ...stagePaths],
			})
			if (addResult.exitCode !== 0) {
				return this.buildToolFailure(
					config,
					`dev_story_git_finalize ${operation} failed: git add failed for paths ${stagePaths.join(", ")} in ${context.gitRoot}. ${addResult.stderr || addResult.stdout || `exit code ${addResult.exitCode}`}`,
				)
			}
		}

		for (const restorePath of restoreStagedPaths) {
			const restoreResult = await this.runner({
				cwd: context.gitRoot,
				args: [...GIT_RESTORE_STAGED_PATH_PREFIX, restorePath],
			})
			if (restoreResult.exitCode !== 0) {
				return this.buildToolFailure(
					config,
					`dev_story_git_finalize ${operation} failed: git restore --staged failed for path ${restorePath}. ${restoreResult.stderr || restoreResult.stdout || `exit code ${restoreResult.exitCode}`}`,
				)
			}
		}

		if (stagePaths.length === 0 && unpermittedFilePaths.length === 0) {
			return this.buildToolFailure(
				config,
				`dev_story_git_finalize ${operation} failed: staging found no allowed, selected, or required project-record files stageable for story ${context.storyIdentity}.`,
			)
		}

		await config.workflowRuntime.applyWorkflowValueWrites({
			taskState: config.taskState,
			values: {
				[UNPERMITTED_FILE_PATHS_VALUE_KEY]: unpermittedFilePaths,
			},
		})
		config.taskState.consecutiveMistakeCount = 0

		return formatResponse.toolResult(
			JSON.stringify({
				operation,
				staged_file_paths: stagePaths,
				unstaged_unpermitted_file_paths: restoreStagedPaths,
				unpermitted_file_paths: unpermittedFilePaths,
			}),
		)
	}

	private async runStageSelectedUnpermitted(
		config: TaskConfig,
		context: StageSelectedUnpermittedContext,
	): Promise<ToolResponse> {
		const operation: DevStoryGitFinalizeOperation = "stage_selected_unpermitted"
		if (context.selectedUnpermittedFilePaths.length === 0) {
			config.taskState.consecutiveMistakeCount = 0
			return formatResponse.toolResult(
				JSON.stringify({
					operation,
					staged_file_paths: [],
				}),
			)
		}

		const persistedUnpermittedPathSet = new Set(context.unpermittedFilePaths)
		const selectedPaths: string[] = []
		for (const selectedPath of context.selectedUnpermittedFilePaths) {
			if (!persistedUnpermittedPathSet.has(selectedPath)) {
				return this.buildToolFailure(
					config,
					`dev_story_git_finalize ${operation} failed: selected unpermitted path ${selectedPath} is not present in latest persisted unpermitted_file_paths.`,
				)
			}

			const resolvedSelection = resolveGitStatusPath({
				gitRoot: context.gitRoot,
				gitPath: selectedPath,
				operation,
			})
			if (!resolvedSelection.ok) {
				return this.buildToolFailure(config, resolvedSelection.message)
			}
			if (resolvedSelection.value.normalizedGitPath !== selectedPath) {
				return this.buildToolFailure(
					config,
					`dev_story_git_finalize ${operation} failed: selected unpermitted path ${selectedPath} must already be normalized with / separators and no leading ./.`,
				)
			}

			const accessValidation = this.validatePathAccess({
				operation,
				fullPath: resolvedSelection.value.fullPath,
				pathRole: `selected unpermitted path ${selectedPath}`,
			})
			if (!accessValidation.ok) {
				return this.buildToolFailure(config, accessValidation.message)
			}

			selectedPaths.push(selectedPath)
		}

		const addResult = await this.runner({
			cwd: context.gitRoot,
			args: [...GIT_ADD_ALL_PATHS_PREFIX, ...selectedPaths],
		})
		if (addResult.exitCode !== 0) {
			return this.buildToolFailure(
				config,
				`dev_story_git_finalize ${operation} failed: git add failed for selected unpermitted paths ${selectedPaths.join(", ")}. ${addResult.stderr || addResult.stdout || `exit code ${addResult.exitCode}`}`,
			)
		}

		config.taskState.consecutiveMistakeCount = 0
		return formatResponse.toolResult(
			JSON.stringify({
				operation,
				staged_file_paths: selectedPaths,
			}),
		)
	}

	private async runCommitStaged(config: TaskConfig, context: CommitStagedContext): Promise<ToolResponse> {
		const operation: DevStoryGitFinalizeOperation = "commit_staged"
		if (!context.commitStagedFiles) {
			config.taskState.consecutiveMistakeCount = 0
			return formatResponse.toolResult(
				JSON.stringify({
					operation,
					story_identity: context.storyIdentity,
					committed: false,
				}),
			)
		}

		const diffResult = await this.runner({
			cwd: context.gitRoot,
			args: GIT_DIFF_CACHED_QUIET_ARGS,
		})
		if (diffResult.exitCode === 0) {
			return this.buildToolFailure(
				config,
				`dev_story_git_finalize ${operation} failed: story ${context.storyIdentity} has no staged files to commit.`,
			)
		}
		if (diffResult.exitCode !== 1) {
			return this.buildToolFailure(
				config,
				`dev_story_git_finalize ${operation} failed: git diff --cached --quiet failed for story ${context.storyIdentity}. ${diffResult.stderr || diffResult.stdout || `exit code ${diffResult.exitCode}`}`,
			)
		}

		const commitMessage = `${GIT_COMMIT_MESSAGE_PREFIX}${context.storyIdentity}`
		const commitResult = await this.runner({
			cwd: context.gitRoot,
			args: ["commit", "-m", commitMessage],
		})
		if (commitResult.exitCode !== 0) {
			return this.buildToolFailure(
				config,
				`dev_story_git_finalize ${operation} failed: git commit failed for story ${context.storyIdentity}. ${commitResult.stderr || commitResult.stdout || `exit code ${commitResult.exitCode}`}`,
			)
		}

		config.taskState.consecutiveMistakeCount = 0
		return formatResponse.toolResult(
			JSON.stringify({
				operation,
				story_identity: context.storyIdentity,
				committed: true,
			}),
		)
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const operation = readRequiredOperation(block)
		if (operation === undefined) {
			return formatResponse.toolError("dev_story_git_finalize failed: operation is required.")
		}

		if (!isDevStoryGitFinalizeOperation(operation)) {
			return formatResponse.toolError(`dev_story_git_finalize failed: unsupported operation '${operation}'.`)
		}

		switch (operation) {
			case "prepare_staging": {
				const context = readPrepareStagingContext(config)
				if (!context.ok) {
					return this.buildToolFailure(config, context.message)
				}
				return this.runPrepareStaging(config, context.value)
			}
			case "stage_selected_unpermitted": {
				const context = readStageSelectedUnpermittedContext(config)
				if (!context.ok) {
					return this.buildToolFailure(config, context.message)
				}
				return this.runStageSelectedUnpermitted(config, context.value)
			}
			case "commit_staged": {
				const context = readCommitStagedContext(config)
				if (!context.ok) {
					return this.buildToolFailure(config, context.message)
				}
				return this.runCommitStaged(config, context.value)
			}
		}
	}
}
