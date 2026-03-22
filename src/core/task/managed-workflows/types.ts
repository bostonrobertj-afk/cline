export type ManagedWorkflowStatus = "active" | "completed" | "blocked" | "cancelled"
export type ManagedWorkflowExtractionStrategy =
	| "workflow-steps"
	| "template-outputs"
	| "numbered-headings"
	| "ordered-lists"
	| "bullet-groups"
	| "heading-items"
export type ManagedWorkflowExtractionMode = "linear" | "branch-aware" | "guided"
export type ManagedWorkflowRouteKind = "goto" | "handoff" | "return" | "exit"
export type ManagedWorkflowAnnotationKind = "critical" | "note" | "guideline"

export interface ManagedWorkflowInstructionNode {
	type: "branch" | "action" | "ask" | "output" | "detail" | "template-output" | "annotation" | "route"
	text?: string
	condition?: string
	optional?: boolean
	annotationKind?: ManagedWorkflowAnnotationKind
	routeKind?: ManagedWorkflowRouteKind
	routeTarget?: string
	children?: ManagedWorkflowInstructionNode[]
}

export interface ManagedWorkflowStepDefinition {
	id: string
	number?: number
	goal: string
	condition?: string
	optional?: boolean
	instructions: ManagedWorkflowInstructionNode[]
}

export interface ManagedWorkflowExecutionDefinition {
	steps: ManagedWorkflowStepDefinition[]
}

export interface ManagedWorkflowDefinition {
	workflowId: string
	slashCommand: string
	skillName: string
	module: string
	skillPath: string
	workflowPath: string
	aliases?: string[]
	phaseRoots: string[]
	checklistPath?: string | null
	supportsManagedExecution: boolean
	strategyHints?: ManagedWorkflowExtractionStrategy[]
	extractionMode?: ManagedWorkflowExtractionMode
	primaryStepRange?: {
		min?: number
		max?: number
	} | null
	packagedAssetPaths: string[]
}

export interface ManagedWorkflowItemState {
	id: string
	label: string
	sourceText: string
	completed: boolean
	stepId?: string
	optional?: boolean
	required?: boolean
	advisory?: boolean
	blocked?: boolean
}

export interface ManagedWorkflowPhaseState {
	id: string
	title: string
	sourcePath: string
	sourceContent: string
	execution?: ManagedWorkflowExecutionDefinition
	checkpointText?: string
	items: ManagedWorkflowItemState[]
	completed: boolean
}

export interface ManagedWorkflowRunState {
	workflowId: string
	slashCommand: string
	status: ManagedWorkflowStatus
	currentPhaseIndex: number
	phases: ManagedWorkflowPhaseState[]
	createdAt: number
	updatedAt: number
	allRequiredComplete: boolean
	stablePlaceholders?: Record<string, string>
	dynamicPlaceholders?: Record<string, string>
}
