import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { buildToolDictionaryMarkdown } from "../src/core/task/workflow-form/dictionaries/buildToolDictionary"
import { renderSystemDictionaryMarkdown } from "../src/core/task/workflow-form/dictionaries/systemDictionary"

const outputs = [
	{
		relativePath: "docs/workflow-ui-surface/system-dictionary.md",
		content: renderSystemDictionaryMarkdown(),
	},
	{
		relativePath: "docs/workflow-ui-surface/tool-dictionary.md",
		content: buildToolDictionaryMarkdown(),
	},
]

for (const output of outputs) {
	const filePath = path.resolve(process.cwd(), output.relativePath)
	mkdirSync(path.dirname(filePath), { recursive: true })
	writeFileSync(filePath, output.content, "utf8")
}
