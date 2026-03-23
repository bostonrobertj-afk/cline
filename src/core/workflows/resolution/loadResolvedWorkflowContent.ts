import fs from "fs/promises"
import type { ResolvedWorkflowEntry } from "./resolveAvailableWorkflows"

export type LoadedResolvedWorkflowContent =
	| { kind: "managed" }
	| {
			kind: "instructions"
			contents: string
			displayPath?: string
	  }

export async function loadResolvedWorkflowContent(
	workflow: ResolvedWorkflowEntry,
): Promise<LoadedResolvedWorkflowContent | undefined> {
	switch (workflow.source) {
		case "managed":
			return { kind: "managed" }
		case "remote":
			return {
				kind: "instructions",
				contents: workflow.contents?.trim() ?? "",
			}
		case "local":
		case "global":
			if (!workflow.fullPath) {
				return undefined
			}

			return {
				kind: "instructions",
				contents: (await fs.readFile(workflow.fullPath, "utf8")).trim(),
				displayPath: workflow.fullPath,
			}
	}
}
