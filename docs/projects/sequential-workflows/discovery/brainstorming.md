# stepsCompleted

# inputDocuments

# session topic

Design human-in-the-loop orchestration patterns for future runtime workflows with approval checkpoints and thread handoff

# session goals

- determine whether approval-gated orchestration of runtime workflows is feasible
- identify the most practical approval checkpoint patterns for sequenced workflow execution
- ideate on implementation approaches that balance autonomy, safety, and user control
- estimate the level of effort to implement human-in-the-loop sequenced workflows
- keep the brainstorming focused on orchestration patterns that can work even before individual workflows are fully built out
- define how a new task/conversation thread should be auto-created at each workflow boundary
- explore which user-provided inputs should be inherited or auto-populated in the continuation flow

# selected approach

Solution Matrix: explore transition type, approval policy, approval payload, and fallback behavior for sequential workflows

# selected techniques

- Solution Matrix: Create systematic grid of problem variables and solution approaches to find optimal combinations and discover gaps - identify key variables, solution approaches, test combinations, and identify most effective pairings

# ideas generated

- Example sequential chain: run create-story, then automatically run dev-story, then automatically run code-review
- Possible focus: how to coordinate multiple workflows back-to-back with approval checkpoints between stages or exceptions only
- In-workflow interactions should remain intact; approval gates are specifically for moving from one workflow to the next
- Approval policy preference: always gate every workflow transition
- Approval gates likely sit only at workflow boundaries, preserving all interactions within each workflow
- Each approval gate could show: completed-workflow summary, next-workflow intent, expected outcome, risks, and user action required
- If approval is denied, the chain should pause and offer options such as revise, abort, or reroute
- If approval is delayed or ignored, the chain should remain paused rather than advancing automatically
- Each workflow starting in a new task/conversation thread is a separate boundary rule that likely belongs in transition prerequisites or handoff behavior
- Possible implication: approval at the boundary may need to create, open, or route into a fresh task thread before the next workflow begins
- The new thread should be auto-created on approval, with backend-populated fields carrying over from the preceding workflow when appropriate
- Example carryover: existing vs new project choice, and if existing was chosen, the specific project selection should persist into the next workflow
- Some fields in the new workflow can be auto-populated from the previous workflow; for example, code-review's target story should default to the story just completed in dev-story when chained automatically
- A general inheritance rule could decide when any field should be auto-filled from context versus explicitly re-asked in the new thread
- Inherit only when the field is a direct dependency of the next workflow
- Direct-dependency inheritance should be explicitly defined in the workflow schema/configuration, not guessed at runtime
- Eligible direct-dependency fields should include artifact references, selection/state fields, and completion/approval metadata, but only when the schema marks them as inheritable
- If a field is not marked as inheritable in the schema, the system should always re-ask the user in the new thread
- Any explicit schema/configuration mechanism is acceptable for marking direct-dependency and inheritable fields, as long as it is clearly defined
- If an inheritable field has no usable prior value, the system should re-ask the user in the new thread
- In the create-story → dev-story → code-review chain, schema-marked inheritable fields may include target story/artifact references, project context, completion metadata, and approval or review-state fields
- Approval/review-state fields should only be inherited when the next workflow directly depends on them
- Next focus area: approval-gate UX and what users see before transitioning between workflows
- Approval gate UX preference: show a concise summary of the completed workflow and the next workflow
- The concise transition summary should emphasize what just completed and what is about to start
- Approval gate action preference: the user should only be able to approve or reject the transition
- If the user rejects the transition, the chain should terminate and the session flow should end
- The pre-transition message must inform the user that the new workflow will open in a new thread and that the UI will automatically open it
- Next focus area: schema/configuration structure for inheritable workflow fields
- Preferred schema/configuration pattern: a mapping of upstream workflow outputs to downstream inputs
- The mapping should be defined at the workflow level as a single cross-workflow mapping table
- The cross-workflow mapping table should include a fallback/re-ask behavior column
- The fallback/re-ask behavior should apply to both missing and invalid values
- The current cross-workflow mapping table columns are sufficient; no additional metadata is needed

# themes

- Workflow boundary and thread handoff behavior
- Schema-driven inheritance and cross-workflow mapping rules
- Approval-gate UX and transition messaging

# priorities

- High-impact: workflow boundary and thread handoff behavior
- Quick wins: approval-gate UX and transition messaging
- Innovative concepts: schema-driven inheritance and cross-workflow mapping rules

# next steps

- Workflow boundary and thread handoff behavior
  - Next step: validate the core handoff sequence and boundary conditions
  - Resource needs: workflow orchestration context, handoff state details
  - Obstacles: ensuring thread creation/opening is reliable and consistent
  - Success indicator: a clear, dependable transition from one workflow thread to the next

- Approval-gate UX and transition messaging
  - Next step: confirm the minimal message and decision flow users see before transitioning
  - Resource needs: UI copy and transition prompt requirements
  - Obstacles: keeping the message concise while still informative
  - Success indicator: users clearly understand what just completed, what is next, and that the next workflow opens in a new thread

- Schema-driven inheritance and cross-workflow mapping rules
  - Next step: validate the table-driven inheritance model and fallback behavior
  - Resource needs: workflow schema/configuration model and mapping definitions
  - Obstacles: keeping mapping rules explicit without adding unnecessary complexity
  - Success indicator: direct-dependency fields are consistently inherited only when schema-marked, and missing/invalid values are re-asked

# summary

- Brainstorming focused on human-in-the-loop orchestration for sequential workflows, with approval-gated transitions, auto-created new threads, schema-defined carryover rules, and concise transition messaging

# context file
