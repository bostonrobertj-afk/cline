---
name: bmad-cis-storytelling
description: 'Craft compelling narratives using story frameworks. Use when the user says "help me with storytelling" or "I want to create a narrative through storytelling"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
story_frameworks_file: './story-types.csv'
default_output_file: '{output_folder}/story-{date}.md'
---

# workflow

## META

- Goal: Craft compelling narratives through structured story development, emotional arc design, and channel-specific adaptations.
- Only the current phase checklist and the current active step's details are shown in the prompt at one time.
- Mark an optional branch complete when it is intentionally skipped so the next step's details can be revealed.
- As soon as the current active checklist item is actually finished, call `complete_workflow_item` for that item before starting work from the next checklist item.
- After you complete the final checklist item in this phase, stop and wait for the prompt to refresh before doing any work from the next phase.
- Do not attempt checklist items from another phase while the current phase is active.
- If the current step establishes a dynamic workflow-state value that later workflow text refers to by placeholder, store it immediately with `set_workflow_placeholders` using the exact placeholder key.

## EXECUTION

<step n="1" goal="Set up the storytelling context">
  <branch if="context data was provided with the invocation" optional="true">
    <action>Load the provided context document and use it to ground the story session.</action>
    <ask>Ask what specific angle or emphasis the user wants to emphasize from the provided context.</ask>
  </branch>
  <ask>Ask what the story is for, who the target audience is, what messages the audience should take away, and what constraints exist around length, tone, medium, or brand rules.</ask>
  <template-output>story_purpose, target_audience, key_messages</template-output>
</step>

<step n="2" goal="Select the story framework">
  <action>Load `{story_frameworks_file}` and parse the available storytelling frameworks.</action>
  <output>Present the most relevant narrative-framework options for the user's purpose.</output>
  <branch if="the user asks for a recommendation" optional="true">
    <action>Recommend the framework that best fits the purpose, audience, and constraints and explain why.</action>
  </branch>
  <ask>Ask which framework the user wants to use, accepting either a numbered selection or a recommendation request.</ask>
  <template-output>story_type, framework_name</template-output>
</step>

<step n="3" goal="Gather the story elements and core transformation">
  <action>Use a Socratic approach to draw out the story instead of drafting it immediately unless the user explicitly asks for a draft.</action>
  <detail>Keep conflict, tension, transformation, vivid details, authenticity, and emotional stakes active throughout this phase.</detail>
  <ask>Ask who or what the hero is, what their ordinary world is, what disrupts it, what trials they face, and how they are transformed.</ask>
  <template-output>story_beats, character_voice, conflict_tension, transformation</template-output>
</step>

<step n="4" goal="Design the emotional arc">
  <ask>Ask what the audience should feel at the beginning, how that emotion changes at the turning point, what emotion should remain at the end, and where the emotional peaks and valleys occur.</ask>
  <template-output>emotional_arc, emotional_touchpoints</template-output>
</step>

<step n="5" goal="Develop the opening hook">
  <ask>Ask what surprising fact, question, or statement could open the story and what the most intriguing lead-in might be.</ask>
  <detail>The hook should create curiosity, emotional relevance, or tension immediately.</detail>
  <template-output>opening_hook</template-output>
</step>

<step n="6" goal="Write or co-create the core narrative">
  <ask>Ask whether the user wants to draft the story themselves with guidance, have you draft it, or co-create it interactively.</ask>
  <branch if="the user wants to draft it themselves" optional="true">
    <action>Provide writing prompts, structure guidance, and feedback on drafts they share.</action>
  </branch>
  <branch if="the user wants you to draft it" optional="true">
    <action>Draft the core narrative based on the story work completed so far.</action>
  </branch>
  <branch if="the user wants to co-create it" optional="true">
    <action>Build the narrative iteratively with the user through back-and-forth refinement.</action>
  </branch>
  <template-output>complete_story, core_narrative</template-output>
</step>

<step n="7" goal="Create story variations for different formats">
  <ask>Ask which channels or formats will use this story.</ask>
  <output>Create short, medium, and extended versions sized for those usage contexts.</output>
  <template-output>short_version, medium_version, extended_version</template-output>
</step>

<step n="8" goal="Provide usage guidance">
  <ask>Ask where and how the story will be used.</ask>
  <action>Provide guidance on best channels, audience-specific adaptation, tone alignment, and possible visual or multimedia enhancements.</action>
  <template-output>best_channels, audience_considerations, tone_notes, adaptation_suggestions</template-output>
</step>

<step n="9" goal="Refine the story and plan next steps">
  <ask>Ask which parts feel strongest, what needs refinement, what the key resolution or call to action is, whether more versions are needed, and how the story will be tested with its audience.</ask>
  <template-output>resolution, refinement_opportunities, additional_versions, feedback_plan</template-output>
</step>

<step n="10" goal="Compile the final output">
  <action>Compile all story components into the target template structure.</action>
  <action>Verify that the tone, voice, and format are consistent across all versions and usage notes.</action>
  <template-output>agent_role, agent_name, user_name, date</template-output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- After each `<template-output>`, save the current artifact to `{default_output_file}`, show the generated content, present the checkpoint menu, and wait for the user's response before proceeding.
- Guide through questions before drafting, keep the story anchored in authentic voice, and avoid giving time estimates.
