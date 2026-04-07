- workflow form resolver must not define dictionary titles- the canonical source shoudl be the buildToolDictionary
- UI must derive the title for each workflow form's dictionary modal from ToolDictionary
- Workflow Start Forms' dictionary is not configured according to established platform architecture:
    - a workflow-start dictionary config object is defined in WorkflowFormRegistry.ts (line 235)
    - that config is then passed into the shared builder logic from buildToolDictionary.ts (line 108)


## Workflow Start Form
- Dictionary config must be defined in and exported from buildToolDictionary.ts, NOT in WorkflowFormRegistry.ts
- 