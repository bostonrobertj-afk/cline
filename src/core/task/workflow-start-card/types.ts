export interface WorkflowStartCardSessionState {
	sessionId: string
	workflowName: string
	markdownBody: string
	submitLabel: string
	projectMode?: "new" | "existing"
	existingProjectOptions: Array<{ value: string; label: string }>
	selectedExistingProject?: string
	newProjectTitle?: string
}
