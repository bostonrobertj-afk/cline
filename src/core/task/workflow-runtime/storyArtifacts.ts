export type WorkflowStoryType = "primary" | "remediation"
export type WorkflowStoryStatus = "draft" | "backlog" | "review" | "complete"

export interface WorkflowStoryIndexEntry {
	story_identity: string
	story_file_name: string
	story_type: WorkflowStoryType
	parent_story_identity: string | null
	story_file_generated: boolean
	status: WorkflowStoryStatus
}

export interface WorkflowStoryIndex {
	version: 1
	stories: WorkflowStoryIndexEntry[]
}

const EPIC_IDENTITY_PATTERN = /^[1-9]\d*$/
const PRIMARY_STORY_IDENTITY_PATTERN = /^([1-9]\d*)\.([1-9]\d*)$/
const REMEDIATION_STORY_IDENTITY_PATTERN = /^([1-9]\d*)\.([1-9]\d*)\.([1-9]\d*)$/
const STORY_INDEX_ENTRY_KEYS = [
	"story_identity",
	"story_file_name",
	"story_type",
	"parent_story_identity",
	"story_file_generated",
	"status",
] as const
const STORY_INDEX_KEYS = ["version", "stories"] as const
const STORY_STATUSES: readonly WorkflowStoryStatus[] = ["draft", "backlog", "review", "complete"]

function assertPositiveInteger(value: number, fieldName: string): void {
	if (Number.isInteger(value) === false || value <= 0) {
		throw new Error(`${fieldName} must be a positive integer.`)
	}
}

function assertEpicIdentity(epicIdentity: string): void {
	if (EPIC_IDENTITY_PATTERN.test(epicIdentity) === false) {
		throw new Error("Epic identity must be a positive numeric string.")
	}
}

function parsePrimaryStoryIdentity(storyIdentity: string): { epicIdentity: string; storyNumber: string } {
	const match = PRIMARY_STORY_IDENTITY_PATTERN.exec(storyIdentity)
	const epicIdentity = match?.[1]
	const storyNumber = match?.[2]
	if (epicIdentity === undefined || storyNumber === undefined) {
		throw new Error("Parent story identity must use dotted positive numeric form E.S.")
	}

	return { epicIdentity, storyNumber }
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && Array.isArray(value) === false
}

function assertOnlyKeys(args: { record: Record<string, unknown>; allowedKeys: readonly string[]; context: string }): void {
	for (const key of Object.keys(args.record)) {
		if (args.allowedKeys.includes(key) === false) {
			throw new Error(`${args.context} contains unsupported key ${key}.`)
		}
	}
}

export function isWorkflowStoryType(value: unknown): value is WorkflowStoryType {
	return value === "primary" || value === "remediation"
}

export function isWorkflowStoryStatus(value: unknown): value is WorkflowStoryStatus {
	return typeof value === "string" && STORY_STATUSES.some((status) => status === value)
}

function parseStoryIdentity(storyIdentity: string): {
	storyType: WorkflowStoryType
	epicIdentity: string
	storyNumber: string
	remediationStoryNumber: string | undefined
} {
	const primaryMatch = PRIMARY_STORY_IDENTITY_PATTERN.exec(storyIdentity)
	const primaryEpicIdentity = primaryMatch?.[1]
	const primaryStoryNumber = primaryMatch?.[2]
	if (primaryEpicIdentity !== undefined && primaryStoryNumber !== undefined) {
		return {
			storyType: "primary",
			epicIdentity: primaryEpicIdentity,
			storyNumber: primaryStoryNumber,
			remediationStoryNumber: undefined,
		}
	}

	const remediationMatch = REMEDIATION_STORY_IDENTITY_PATTERN.exec(storyIdentity)
	const remediationEpicIdentity = remediationMatch?.[1]
	const remediationStoryNumber = remediationMatch?.[2]
	const remediationNumber = remediationMatch?.[3]
	if (remediationEpicIdentity !== undefined && remediationStoryNumber !== undefined && remediationNumber !== undefined) {
		return {
			storyType: "remediation",
			epicIdentity: remediationEpicIdentity,
			storyNumber: remediationStoryNumber,
			remediationStoryNumber: remediationNumber,
		}
	}

	throw new Error("story_identity must use canonical dotted positive numeric form E.S or E.S.R.")
}

function buildCanonicalStoryFilename(args: {
	storyType: WorkflowStoryType
	epicIdentity: string
	storyNumber: string
	remediationStoryNumber: string | undefined
}): string {
	if (args.storyType === "primary") {
		return `Story-${args.epicIdentity}-${args.storyNumber}.md`
	}

	if (args.remediationStoryNumber === undefined) {
		throw new Error("Remediation story identity must include a remediation story number.")
	}

	return `Remediation-story-${args.epicIdentity}-${args.storyNumber}-${args.remediationStoryNumber}.md`
}

export function buildEpicStoriesIndexFilename(epicIdentity: string): string {
	assertEpicIdentity(epicIdentity)
	return `epic-${epicIdentity}-stories.index.json`
}

export function buildPrimaryStoryIndexEntry(args: { epicIdentity: string; storyNumber: number }): WorkflowStoryIndexEntry {
	assertEpicIdentity(args.epicIdentity)
	assertPositiveInteger(args.storyNumber, "Story number")
	return {
		story_identity: `${args.epicIdentity}.${args.storyNumber}`,
		story_file_name: `Story-${args.epicIdentity}-${args.storyNumber}.md`,
		story_type: "primary",
		parent_story_identity: null,
		story_file_generated: false,
		status: "draft",
	}
}

export function buildRemediationStoryIndexEntry(args: {
	parentStoryIdentity: string
	remediationStoryNumber: number
}): WorkflowStoryIndexEntry {
	const parentIdentity = parsePrimaryStoryIdentity(args.parentStoryIdentity)
	assertPositiveInteger(args.remediationStoryNumber, "Remediation story number")
	return {
		story_identity: `${args.parentStoryIdentity}.${args.remediationStoryNumber}`,
		story_file_name: `Remediation-story-${parentIdentity.epicIdentity}-${parentIdentity.storyNumber}-${args.remediationStoryNumber}.md`,
		story_type: "remediation",
		parent_story_identity: args.parentStoryIdentity,
		story_file_generated: false,
		status: "draft",
	}
}

export function parseWorkflowStoryIndexJson(rawJson: string): WorkflowStoryIndex {
	let parsedIndex: unknown
	try {
		parsedIndex = JSON.parse(rawJson)
	} catch (error) {
		const detail = error instanceof Error ? ` ${error.message}` : ""
		throw new Error(`Story index is malformed JSON.${detail}`)
	}

	if (isRecord(parsedIndex) === false) {
		throw new Error("Story index must be a JSON object.")
	}
	assertOnlyKeys({ record: parsedIndex, allowedKeys: STORY_INDEX_KEYS, context: "Story index" })
	if (parsedIndex.version !== 1) {
		throw new Error("Story index version must be 1.")
	}

	if (Array.isArray(parsedIndex.stories) === false) {
		throw new Error("Story index stories must be an array.")
	}

	const stories: WorkflowStoryIndexEntry[] = parsedIndex.stories.map((entry, index) => {
		const context = `Story index stories[${index}]`
		if (isRecord(entry) === false) {
			throw new Error(`${context} must be an object.`)
		}
		assertOnlyKeys({ record: entry, allowedKeys: STORY_INDEX_ENTRY_KEYS, context })

		if (typeof entry.story_identity !== "string") {
			throw new Error(`${context}.story_identity must be a string.`)
		}
		const parsedStoryIdentity = parseStoryIdentity(entry.story_identity)

		if (isWorkflowStoryType(entry.story_type) === false) {
			throw new Error(`${context}.story_type must be primary or remediation.`)
		}
		if (entry.story_type !== parsedStoryIdentity.storyType) {
			throw new Error(`${context}.story_type must match story_identity.`)
		}

		if (typeof entry.story_file_name !== "string") {
			throw new Error(`${context}.story_file_name must be a string.`)
		}
		const expectedFilename = buildCanonicalStoryFilename(parsedStoryIdentity)
		if (entry.story_file_name !== expectedFilename) {
			throw new Error(`${context}.story_file_name must be ${expectedFilename}.`)
		}

		if (entry.story_type === "primary") {
			if (entry.parent_story_identity !== null) {
				throw new Error(`${context}.parent_story_identity must be null for primary stories.`)
			}
		} else {
			const expectedParentIdentity = `${parsedStoryIdentity.epicIdentity}.${parsedStoryIdentity.storyNumber}`
			if (entry.parent_story_identity !== expectedParentIdentity) {
				throw new Error(`${context}.parent_story_identity must be ${expectedParentIdentity} for remediation stories.`)
			}
		}

		if (typeof entry.story_file_generated !== "boolean") {
			throw new Error(`${context}.story_file_generated must be a boolean.`)
		}
		if (isWorkflowStoryStatus(entry.status) === false) {
			throw new Error(`${context}.status must be draft, backlog, review, or complete.`)
		}

		return {
			story_identity: entry.story_identity,
			story_file_name: entry.story_file_name,
			story_type: entry.story_type,
			parent_story_identity: entry.parent_story_identity,
			story_file_generated: entry.story_file_generated,
			status: entry.status,
		}
	})

	return {
		version: 1,
		stories,
	}
}

export function stringifyWorkflowStoryIndex(index: WorkflowStoryIndex): string {
	return `${JSON.stringify(
		{
			version: index.version,
			stories: index.stories.map((story) => ({
				story_identity: story.story_identity,
				story_file_name: story.story_file_name,
				story_type: story.story_type,
				parent_story_identity: story.parent_story_identity,
				story_file_generated: story.story_file_generated,
				status: story.status,
			})),
		},
		undefined,
		2,
	)}\n`
}
