// Prompt for initial list creation
const initial = `
# task_progress CREATION REQUIRED - ACT MODE ACTIVATED

Include "task_progress" in your next tool call with a concise checklist of the remaining milestones if there is not already an active task list.`

// For when recommending but not requiring a list
const listInstructionsRecommended = `
Include a brief "task_progress" checklist in your next tool call and keep it current with "- [ ]" and "- [x]".`

// Prompt for reminders to update the list periodically
const reminder = `
Update the full "task_progress" checklist in your next tool call so it matches the current state of the task.`

const completed = `

**All {{totalItems}} items have been completed!**

Use attempt_completion if the task is fully done; otherwise create a new concise checklist for the remaining work.`

const planModeReminder = `
# task_progress List (Optional - Plan Mode)

In PLAN MODE, include a preliminary "task_progress" list only if it helps communicate concrete next steps.

${reminder}`

const recommended = `
# task_progress RECOMMENDED

When starting a new task, it is recommended to include a todo list using the task_progress parameter.

${listInstructionsRecommended}
`

const apiRequestCount = `
# task_progress

You've made {{apiRequestCount}} API requests without a task_progress parameter. Add a concise checklist to track the remaining work.

${reminder}
`

export const FocusChainPrompts = {
	initial,
	reminder,
	recommended,
	planModeReminder,
	completed,
	apiRequestCount,
}
