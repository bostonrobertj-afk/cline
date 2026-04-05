import { ModelFamily } from "@/shared/prompts"
import { ClineDefaultTool } from "@/shared/tools"
import type { ClineToolSpec } from "../spec"

const id = ClineDefaultTool.BUILD_EPICS_DOCUMENT

const generic: ClineToolSpec = {
	id,
	variant: ModelFamily.GENERIC,
	name: "build_epics_document",
	description:
		"Build or resolve the canonical epics artifact at {output_folder}/planning_artifacts/epics.md from workflow-owned placeholder state. Resolve inputs from workflow state; there are no human-supplied parameters.",
	parameters: [],
}

export const build_epics_document_variants = [generic]
