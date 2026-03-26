// Prompt for initial list creation
const initial = `
# task_progress CREATION REQUIRED - ACT MODE ACTIVATED

Create "task_progress" in your next tool call with a concise Markdown checklist of the remaining milestones.`

// For when recommending but not requiring a list
const listInstructionsRecommended = `
Create a brief "task_progress" checklist in your next tool call if milestone tracking would help with this task.`

// Prompt for reminders to update the list periodically
const reminder = `
If you finish the current checklist step, include "task_progress" in your next tool call so the checklist advances.`

const completed = `

**All {{totalItems}} items have been completed!**

Use attempt_completion if the task is fully done; otherwise create a new concise checklist for the remaining work.`

const planModeReminder = `
# task_progress List (Optional - Plan Mode)

In PLAN MODE, include a preliminary "task_progress" list only if it helps communicate concrete next steps.
${listInstructionsRecommended}`

const recommended = `
# task_progress RECOMMENDED

When starting a new task, it is recommended to create a concise task_progress checklist.
${listInstructionsRecommended}
`

const apiRequestCount = `
# task_progress

You've made {{apiRequestCount}} API requests without a task_progress parameter. Add a concise checklist to track the remaining work.
${listInstructionsRecommended}
`

export const FocusChainPrompts = {
	initial,
	reminder,
	recommended,
	planModeReminder,
	completed,
	apiRequestCount,
}
