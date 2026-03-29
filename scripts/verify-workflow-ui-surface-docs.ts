import { readFileSync } from "fs"
import path from "path"
import { buildToolDictionaryMarkdown } from "../src/core/task/workflow-form/dictionaries/buildToolDictionary"
import { renderSystemDictionaryMarkdown } from "../src/core/task/workflow-form/dictionaries/systemDictionary"

const expectedOutputs = [
	{
		relativePath: "docs/workflow-ui-surface/system-dictionary.md",
		content: renderSystemDictionaryMarkdown(),
	},
	{
		relativePath: "docs/workflow-ui-surface/tool-dictionary.md",
		content: buildToolDictionaryMarkdown(),
	},
]

for (const output of expectedOutputs) {
	const filePath = path.resolve(process.cwd(), output.relativePath)
	const existingContent = readFileSync(filePath, "utf8")

	if (existingContent !== output.content) {
		throw new Error(`${output.relativePath} is out of date. Run npm run generate-workflow-ui-surface-docs.`)
	}
}
