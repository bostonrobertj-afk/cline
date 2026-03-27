import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const id = ClineDefaultTool.FILE_READ_RANGE

const description =
	"Request to read only a specific 1-based line range from a text file. {{READ_FILE_RANGE_EXPLORATION_GUIDANCE}}"

const parameters: ClineToolSpec["parameters"] = [
	{
		name: "path",
		required: true,
		instruction: `The path of the file to read (relative to the current working directory {{CWD}}){{MULTI_ROOT_HINT}}`,
		usage: "File path here",
	},
	{
		name: "start_line",
		required: true,
		type: "integer",
		instruction: "The first line to include, using 1-based line numbers.",
		usage: "1",
	},
	{
		name: "end_line",
		required: true,
		type: "integer",
		instruction: "The last line to include, using 1-based line numbers. Must be greater than or equal to start_line.",
		usage: "40",
	},
	TASK_PROGRESS_PARAMETER,
]

const generic: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "read_file_range",
	description,
	parameters,
}

const NATIVE_GPT_5: ClineToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id,
	name: "read_file_range",
	description,
	parameters,
}

const NATIVE_NEXT_GEN: ClineToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

export const read_file_range_variants = [generic, NATIVE_GPT_5, NATIVE_NEXT_GEN]
