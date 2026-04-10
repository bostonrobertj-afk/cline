import fs from "fs/promises"
import { resolveCanonicalBrainstormingSkillPath } from "./brainstormingSessionFiles"

export type BrainstormingTechniqueEntry = {
	category: string
	techniqueName: string
	description: string
}

export type BrainstormingTechniqueOption = {
	value: string
	label: string
	description: string
}

function parseCsvLine(line: string): string[] {
	const values: string[] = []
	let current = ""
	let inQuotes = false

	for (let i = 0; i < line.length; i++) {
		const char = line[i]
		const nextChar = line[i + 1]

		if (char === '"' && inQuotes && nextChar === '"') {
			current += '"'
			i++
			continue
		}

		if (char === '"') {
			inQuotes = !inQuotes
			continue
		}

		if (char === "," && !inQuotes) {
			values.push(current)
			current = ""
			continue
		}

		current += char
	}

	values.push(current)
	return values.map((value) => value.trim())
}

async function loadBrainstormingTechniqueEntries(cwd: string): Promise<BrainstormingTechniqueEntry[]> {
	const csvPath = await resolveCanonicalBrainstormingSkillPath(cwd, "brain-methods.csv")
	const csv = await fs.readFile(csvPath, "utf8")
	const lines = csv
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)

	if (lines.length < 2) {
		return []
	}

	return lines.slice(1).map((line) => {
		const [category = "", techniqueName = "", description = ""] = parseCsvLine(line)

		return {
			category,
			techniqueName,
			description,
		}
	})
}

export async function listBrainstormingTechniqueCategories(cwd: string): Promise<string[]> {
	const entries = await loadBrainstormingTechniqueEntries(cwd)
	const seen = new Set<string>()

	return entries
		.map((entry) => entry.category)
		.filter((category) => {
			if (!category || seen.has(category)) {
				return false
			}
			seen.add(category)
			return true
		})
}

export async function listBrainstormingTechniqueOptionsByCategory(
	cwd: string,
	category: string,
): Promise<BrainstormingTechniqueOption[]> {
	const entries = await loadBrainstormingTechniqueEntries(cwd)

	return entries
		.filter((entry) => entry.category === category)
		.map((entry) => ({
			value: entry.techniqueName,
			label: entry.techniqueName,
			description: entry.description,
		}))
}

export async function selectRandomBrainstormingTechnique(cwd: string): Promise<BrainstormingTechniqueEntry> {
	const entries = await loadBrainstormingTechniqueEntries(cwd)
	if (entries.length === 0) {
		throw new Error("Could not load any brainstorming techniques from the canonical technique library.")
	}

	return entries[Math.floor(Math.random() * entries.length)]
}

export async function getBrainstormingTechniqueByName(
	cwd: string,
	techniqueName: string,
): Promise<BrainstormingTechniqueEntry | undefined> {
	const entries = await loadBrainstormingTechniqueEntries(cwd)
	return entries.find((entry) => entry.techniqueName === techniqueName)
}
