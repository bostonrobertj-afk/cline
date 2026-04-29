import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.FILE_READ

const generic: ClineToolSpec = {
	variant: ModelFamily.GENERIC,
	id,
	name: "read_file",
	description:
		"Request to read the contents of a file at the specified path. {{READ_FILE_EXPLORATION_GUIDANCE}} Automatically extracts raw text from PDF and DOCX files. Do NOT use this tool to list the contents of a directory.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: `The path of the file to read (relative to the current working directory {{CWD}}){{MULTI_ROOT_HINT}}`,
			usage: "File path here",
		},
	],
}

const NATIVE_GPT_5: ClineToolSpec = {
	variant: ModelFamily.NATIVE_GPT_5,
	id,
	name: "read_file",
	description:
		"Request to read the contents of a file at the specified path. {{READ_FILE_EXPLORATION_GUIDANCE}} Automatically extracts raw text from PDF and DOCX files. Do NOT use this tool to list the contents of a directory.",
	parameters: [
		{
			name: "path",
			required: true,
			instruction: `The path of the file to read (relative to the current working directory {{CWD}}){{MULTI_ROOT_HINT}}`,
			usage: "File path here",
		},
	],
}

const NATIVE_NEXT_GEN: ClineToolSpec = {
	...NATIVE_GPT_5,
	variant: ModelFamily.NATIVE_NEXT_GEN,
}

export const read_file_variants = [generic, NATIVE_NEXT_GEN, NATIVE_GPT_5]
