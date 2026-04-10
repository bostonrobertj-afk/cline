import { getPlaceholderWorkflowValueMap, resolvePlaceholderWorkflowText } from "@core/workflows/placeholder-workflow-rendering"
import { buildWorkflowStablePlaceholders, resolveWorkflowPlaceholderText } from "@core/workflows/workflow-placeholders"
import type { Dirent } from "fs"
import fs from "fs/promises"
import path from "path"
import type { TaskConfig } from "@/core/task/tools/types/TaskConfig"

const SESSION_FILENAME_PATTERN = /^brainstorming-session-(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.md$/

export type BrainstormingSessionFile = {
	absolutePath: string
	fileName: string
	date: string
	sequence: number
}

export function resolveBrainstormingOutputFolderPath(config: TaskConfig): string | undefined {
	const placeholders =
		getPlaceholderWorkflowValueMap(
			config.taskState.activePlaceholderWorkflowStableValues,
			config.taskState.activePlaceholderWorkflowValues,
		) ?? {}

	const outputFolderRaw = resolvePlaceholderWorkflowText(placeholders.output_folder?.trim(), placeholders)?.trim()
	if (!outputFolderRaw) {
		return undefined
	}

	const resolutionBase =
		placeholders.cwd?.trim() ||
		placeholders.project_root?.trim() ||
		placeholders["project-root"]?.trim() ||
		config.taskState.activePlaceholderWorkflowStableValues?.cwd?.trim() ||
		config.cwd

	return path.isAbsolute(outputFolderRaw) ? outputFolderRaw : path.resolve(resolutionBase, outputFolderRaw)
}

export function resolveBrainstormingSessionDirectory(config: TaskConfig): string | undefined {
	const outputFolder = resolveBrainstormingOutputFolderPath(config)
	return outputFolder ? path.join(outputFolder, "brainstorming") : undefined
}

export function resolveBrainstormingOutputFilePath(config: TaskConfig): string | undefined {
	const placeholders =
		getPlaceholderWorkflowValueMap(
			config.taskState.activePlaceholderWorkflowStableValues,
			config.taskState.activePlaceholderWorkflowValues,
		) ?? {}

	const outputFileRaw = resolvePlaceholderWorkflowText(placeholders.output_file?.trim(), placeholders)?.trim()
	if (!outputFileRaw) {
		return undefined
	}

	const resolutionBase =
		placeholders.cwd?.trim() ||
		placeholders.project_root?.trim() ||
		placeholders["project-root"]?.trim() ||
		config.taskState.activePlaceholderWorkflowStableValues?.cwd?.trim() ||
		config.cwd

	return path.isAbsolute(outputFileRaw) ? outputFileRaw : path.resolve(resolutionBase, outputFileRaw)
}

export async function discoverBrainstormingSessions(sessionDirectory: string): Promise<BrainstormingSessionFile[]> {
	let entries: Dirent[]
	try {
		entries = await fs.readdir(sessionDirectory, { withFileTypes: true })
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return []
		}
		throw error
	}

	const sessions: BrainstormingSessionFile[] = []
	for (const entry of entries) {
		if (!entry.isFile()) {
			continue
		}

		const match = SESSION_FILENAME_PATTERN.exec(entry.name)
		if (!match) {
			continue
		}

		const [, date, suffix] = match
		sessions.push({
			absolutePath: path.join(sessionDirectory, entry.name),
			fileName: entry.name,
			date,
			sequence: suffix ? Number.parseInt(suffix, 10) : 1,
		})
	}

	return sessions.sort((left, right) => {
		if (left.date !== right.date) {
			return right.date.localeCompare(left.date)
		}

		return right.sequence - left.sequence
	})
}

export async function resolveNextBrainstormingSessionPath(sessionDirectory: string, date: string): Promise<string> {
	const baseName = `brainstorming-session-${date}.md`
	const basePath = path.join(sessionDirectory, baseName)

	try {
		await fs.access(basePath)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return basePath
		}
		throw error
	}

	for (let suffix = 2; ; suffix++) {
		const candidatePath = path.join(sessionDirectory, `brainstorming-session-${date}-${suffix}.md`)
		try {
			await fs.access(candidatePath)
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return candidatePath
			}
			throw error
		}
	}
}

export async function resolveCanonicalBrainstormingSkillPath(cwd: string, relativePath: string): Promise<string> {
	const stablePlaceholders = await buildWorkflowStablePlaceholders({ cwd })
	const rawPath = resolveWorkflowPlaceholderText(
		`{project-root}/.cline/skills/bmad-brainstorming/${relativePath}`,
		stablePlaceholders,
	)

	if (!rawPath || rawPath.includes("{project-root}")) {
		throw new Error(`Could not resolve the canonical brainstorming ${relativePath} path from stable workflow placeholders.`)
	}

	return path.isAbsolute(rawPath) ? rawPath : path.resolve(cwd, rawPath)
}

export async function readCanonicalBrainstormingTemplate(cwd: string): Promise<string> {
	const templatePath = await resolveCanonicalBrainstormingSkillPath(cwd, "template.md")

	try {
		return await fs.readFile(templatePath, "utf8")
	} catch {
		throw new Error(`Could not read the canonical brainstorming template at ${templatePath}.`)
	}
}

export async function atomicReplaceTextFile(filePath: string, content: string): Promise<void> {
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

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function replaceMarkdownSectionBody(markdown: string, heading: string, body: string): string | undefined {
	const sectionHeadingMatch = new RegExp(`^${escapeRegExp(heading)}[^\\S\\r\\n]*\\r?\\n`, "m").exec(markdown)
	if (!sectionHeadingMatch) {
		return undefined
	}

	const sectionBodyStart = sectionHeadingMatch.index + sectionHeadingMatch[0].length
	const remainingMarkdown = markdown.slice(sectionBodyStart)
	const nextHeadingMatch = /^##\s+/m.exec(remainingMarkdown)
	const sectionBodyEnd = nextHeadingMatch ? sectionBodyStart + nextHeadingMatch.index : markdown.length
	const newline = markdown.includes("\r\n") ? "\r\n" : "\n"
	const normalizedBody = body.replace(/\r?\n/g, newline)

	return markdown.slice(0, sectionBodyStart) + `${normalizedBody}${newline}${newline}` + markdown.slice(sectionBodyEnd)
}

export function isBrainstormingSessionFileName(fileName: string): boolean {
	return SESSION_FILENAME_PATTERN.test(fileName)
}
