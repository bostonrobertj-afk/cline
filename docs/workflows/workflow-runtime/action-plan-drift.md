# Critical Drift Issues
- The action plan builds, then replaces the same things it built needlessly (e.g. 1.11h write a constructor, then 6.5a2 changes it- should have written the constructor correctly in the first place)
- The action plan places dozens of tasks behind a "stop and wait for workflow modules" barrier needlessly, which ensures that the foundational capabilities are not in-place before workflow modules are built. The only tasks / subtasks that I found which should have been moved were:
    -  the ones targeting workflow-specific tools, but these should have been pulled out of the action plan along with the other workflow-specific tasks and subtasks
- 2.76 requires a barrel file which is not part of the prescribed architecture
    - blast radius includes 2.76, 2.77, 2.77b, 2.77c, 3.1a, 3.5b, 9.1a-9.4c
- 2.77a requires modules to already be built instead of establishing the workflowregistry as a foundational capability to be populated further as modules are built. The correct approach is to build workflowregistry during the initial action plan so that it exists as a foundational capability, so that when workflow modules are built they have a registry to be added to.
- 3.1b- temporary bridge steps are not permitted.
- 3.3b- The architecture and requirements documents require additive slash command functionality so that the runtime-owned workflows' slash commands function properly. Deleting/disabling existing slash command functionality is not part of this project's scope and explicitly banned.
- 4.2 only because it currently assumes the banned temporary bridge was built first.
- 5.1 because it leaves legacy code in place for bridging/compatibility- banned, not permitted.
- 5.7 because it lumps several revisions into one subtask without explicit line-level instruction
- 5.10 because it lumps several revisions into one subtask without explicit line-level instruction
- 1.11h and 6.5a2- in-plan churn instead of writing the right code in one pass
- 6.5a3- that code is written and revised three times in the same action plan- should be prescribed in one task with the correct final shape
- 6.7- lumps several changes into one subtask
- 7.2b- lumps several changes into one subtask
- 7.3b, 7.3C, AND 7.3D for two reasons:
    1: wasting time updating a file that will likely be deleted when brainstorming workflow is migrated because it is not compliant with the new architecture
    2: performing workflow-specific work inside the initial runtime buildout action plan

# Non-Violations to Make sure You Don't Accidentally Treat as Violations
- the 5.4 instructions to preserve dev-story handling- that code needs to be in place when we migrate dev-story to the new architecture so we can reference and recreate it before deleting it.
- Subtask 5.15 - CORRECT- NEEDS TO STAY IN-PLACE UNTIL WORKFLOW MODULES ARE BUILT FOR REFERENCE PURPOSES
- Subtask 5.17- CORRECT- NEEDS TO STAY IN-PLACE UNTIL WORKFLOW MODULES ARE BUILT FOR REFERENCE PURPOSES


