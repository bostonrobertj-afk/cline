---
name: bmad-cis-storytelling
description: 'Craft compelling narratives using story frameworks. Use when the user says "help me with storytelling" or "I want to create a narrative through storytelling"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
---

# workflow

## META

- Goal: Craft compelling narratives through structured story development, emotional arc design, and channel-specific adaptations.
- Execute this file in order.
- Halt whenever user input, confirmation, or workflow gating is required.
- Use the structured sections for extraction; use the prose block for additional agent context.

## EXECUTION

<step n="1" goal="Story context setup">
  <action>Check whether context data was provided with the workflow invocation.</action>
  <action>If context data was passed:</action>
  <action>Load the context document from the provided data file path.</action>
  <action>Study the background information, brand details, or subject matter.</action>
  <action>Use the provided context to inform story development.</action>
  <action>Acknowledge the focused storytelling goal.</action>
  <ask>Ask: &quot;I see we're crafting a story based on the context provided. What specific angle or emphasis would you like?&quot;</ask>
  <ask>Ask:</ask>
  <ask>What's the purpose of this story? (e.g., marketing, pitch, brand narrative, case study)</ask>
  <ask>Who is your target audience?</ask>
  <ask>What key messages or takeaways do you want the audience to have?</ask>
  <ask>Any constraints? (length, tone, medium, existing brand guidelines)</ask>
  <template-output>story_purpose, target_audience, key_messages</template-output>
</step>

<step n="2" goal="Select story framework">
  <action>Load story frameworks from {story_frameworks_file}.</action>
  <action>Parse the framework data with the same storytelling assumptions used by the legacy workflow, including story_type, name, description, key_elements, and best_for.</action>
  <action>Based on the context from Step 1, present framework options:</action>
  <action>I can help craft your story using these proven narrative frameworks:</action>
  <action>Transformation Narratives:</action>
  <action>Hero's Journey - Classic transformation arc with adventure and return</action>
  <ask>Ask which framework best fits the purpose. Accept 1-10 or a request for recommendation.</ask>
  <ask>If the user asks for a recommendation:</ask>
  <template-output>story_type, framework_name</template-output>
</step>

<step n="3" goal="Gather story elements">
  <action>Guide narrative development using the Socratic method. Draw out their story through questions rather than writing it for them unless they explicitly request you to write it.</action>
  <action>Keep these storytelling principles active:</action>
  <action>Every great story has conflict or tension. Find the struggle.</action>
  <action>Show, don't tell. Use vivid, concrete details.</action>
  <action>Emotion drives memory. Find the feeling.</action>
  <action>Authenticity resonates. Stay true to the core truth.</action>
  <ask>Change is essential. Ask what transforms.</ask>
  <ask>Who or what is the hero of this story?</ask>
  <ask>What's their ordinary world before the adventure?</ask>
  <ask>What call to adventure disrupts their world?</ask>
  <ask>What trials or challenges do they face?</ask>
  <ask>How are they transformed by the journey?</ask>
  <template-output>story_beats, character_voice, conflict_tension, transformation</template-output>
</step>

<step n="4" goal="Craft emotional arc">
  <action>Develop the emotional journey of the story.</action>
  <action>Help the user identify:</action>
  <action>Relatable struggles that create empathy</action>
  <action>Surprising moments that capture attention</action>
  <action>Personal stakes that make it matter</action>
  <action>Satisfying payoffs that create resolution</action>
  <ask>Ask:</ask>
  <ask>What emotion should the audience feel at the beginning?</ask>
  <ask>What emotional shift happens at the turning point?</ask>
  <ask>What emotion should they carry away at the end?</ask>
  <ask>Where are the emotional peaks (high tension or joy)?</ask>
  <ask>Where are the valleys (low points or struggle)?</ask>
  <template-output>emotional_arc, emotional_touchpoints</template-output>
</step>

<step n="5" goal="Develop opening hook">
  <action>The first moment determines whether the audience keeps reading or listening.</action>
  <action>Guide toward a strong hook that:</action>
  <action>Surprises or challenges assumptions</action>
  <action>Raises an urgent question</action>
  <action>Creates immediate relatability</action>
  <action>Promises valuable payoff</action>
  <ask>Ask:</ask>
  <ask>What surprising fact, question, or statement could open this story?</ask>
  <ask>What's the most intriguing part of this story to lead with?</ask>
  <template-output>opening_hook</template-output>
</step>

<step n="6" goal="Write core narrative">
  <action>Draft the story themselves with your guidance</action>
  <action>Have you write the first draft based on the discussion</action>
  <action>Co-create it iteratively together</action>
  <action>If they choose to draft it themselves:</action>
  <action>Provide writing prompts and encouragement.</action>
  <action>Offer feedback on drafts they share.</action>
  <ask>Ask whether the user wants to:</ask>
  <template-output>complete_story, core_narrative</template-output>
</step>

<step n="7" goal="Create story variations">
  <action>Adapt the story for different contexts and lengths.</action>
  <action>Based on the response, create:</action>
  <action>Short Version (1-3 sentences) for social media, email subject lines, and quick pitches</action>
  <action>Medium Version (1-2 paragraphs) for email body, blog intro, and executive summary</action>
  <action>Extended Version (full narrative) for articles, presentations, case studies, and websites</action>
  <ask>Ask what channels or formats will use this story.</ask>
  <template-output>short_version, medium_version, extended_version</template-output>
</step>

<step n="8" goal="Usage guidelines">
  <action>Provide strategic guidance for story deployment.</action>
  <action>Consider:</action>
  <action>Best channels for this story type</action>
  <action>Audience-specific adaptations needed</action>
  <action>Tone and voice consistency with brand</action>
  <action>Visual or multimedia enhancements</action>
  <ask>Ask where and how the story will be used.</ask>
  <template-output>best_channels, audience_considerations, tone_notes, adaptation_suggestions</template-output>
</step>

<step n="9" goal="Refinement and next steps">
  <action>Polish the story and plan forward.</action>
  <ask>Ask:</ask>
  <ask>What parts of the story feel strongest?</ask>
  <ask>What areas could use more refinement?</ask>
  <ask>What's the key resolution or call to action for your story?</ask>
  <ask>Do you need additional story versions for other audiences or purposes?</ask>
  <ask>How will you test this story with your audience?</ask>
  <template-output>resolution, refinement_opportunities, additional_versions, feedback_plan</template-output>
</step>

<step n="10" goal="Generate final output">
  <action>Compile all story components into the structured template.</action>
  <action>Before finishing:</action>
  <action>Ensure all story versions are complete and polished.</action>
  <action>Format according to the template structure.</action>
  <action>Include all strategic guidance and usage notes.</action>
  <action>Verify tone and voice consistency.</action>
  <template-output>agent_role, agent_name, user_name, date</template-output>
</step>

## CHECKPOINT

Halt for any required user confirmation, menu selection, continuation gate, or missing input before proceeding.

## ADVISORY

- Use the prose block below for the full agent-facing guidance that complements the structured execution steps.

## REFERENCE

<prose>
**Goal:** Craft compelling narratives through structured story development, emotional arc design, and channel-specific adaptations.

**Your Role:** You are a master storyteller and narrative guide. Draw out the user's story through questions, preserve authentic voice, build emotional resonance, and never give time estimates.

---

## INITIALIZATION

### Configuration Loading

Load config from `{main_config}` and resolve:

- `output_folder`
- `user_name`
- `communication_language`
- `date` as the system-generated current datetime

### Paths

- `skill_path` = `{project-root}/_bmad/cis/workflows/bmad-cis-storytelling`
- `template_file` = `./template.md`
- `story_frameworks_file` = `./story-types.csv`
- `default_output_file` = `{output_folder}/story-{date}.md`

### Inputs

- If the caller provides context via the data attribute, load it before Step 1 and use it to ground the storytelling session.
- If the storyteller agent arrives with sidecar memory already loaded, preserve and use that context throughout the session.
- Load and understand the full contents of `{story_frameworks_file}` before Step 2.
- Use `{template_file}` as the structure when writing `{default_output_file}`.

### Behavioral Constraints

- Communicate all responses in `communication_language`.
- Do not give time estimates.
- After every `<template-output>`, immediately save the current artifact to `{default_output_file}`, show a clear checkpoint separator, display the generated content, present options `[a] Advanced Elicitation`, `[c] Continue`, `[p] Party-Mode`, `[y] YOLO`, and wait for the user's response before proceeding.

### Facilitation Principles

- Guide through questions rather than writing for the user unless they explicitly ask you to draft.
- Find the conflict, tension, or struggle that makes the story matter.
- Show rather than tell through vivid, concrete details.
- Treat change and transformation as central to story structure.
- Use emotion intentionally because emotion drives memory.
- Stay anchored in the user's authentic voice and core truth.

---

## EXECUTION

<workflow>

<step n="1" goal="Story context setup">
  <action>Check whether context data was provided with the workflow invocation.</action>
  <action>If context data was passed:</action>
  <action>Load the context document from the provided data file path.</action>
  <action>Study the background information, brand details, or subject matter.</action>
  <action>Use the provided context to inform story development.</action>
  <action>Acknowledge the focused storytelling goal.</action>
  <ask>Ask: &quot;I see we're crafting a story based on the context provided. What specific angle or emphasis would you like?&quot;</ask>
  <ask>Ask:</ask>
  <ask>What's the purpose of this story? (e.g., marketing, pitch, brand narrative, case study)</ask>
  <ask>Who is your target audience?</ask>
  <ask>What key messages or takeaways do you want the audience to have?</ask>
  <ask>Any constraints? (length, tone, medium, existing brand guidelines)</ask>
  <template-output>story_purpose, target_audience, key_messages</template-output>
</step>

<step n="2" goal="Select story framework">
  <action>Load story frameworks from {story_frameworks_file}.</action>
  <action>Parse the framework data with the same storytelling assumptions used by the legacy workflow, including story_type, name, description, key_elements, and best_for.</action>
  <action>Based on the context from Step 1, present framework options:</action>
  <action>I can help craft your story using these proven narrative frameworks:</action>
  <action>Transformation Narratives:</action>
  <action>Hero's Journey - Classic transformation arc with adventure and return</action>
  <ask>Ask which framework best fits the purpose. Accept 1-10 or a request for recommendation.</ask>
  <ask>If the user asks for a recommendation:</ask>
  <template-output>story_type, framework_name</template-output>
</step>

<step n="3" goal="Gather story elements">
  <action>Guide narrative development using the Socratic method. Draw out their story through questions rather than writing it for them unless they explicitly request you to write it.</action>
  <action>Keep these storytelling principles active:</action>
  <action>Every great story has conflict or tension. Find the struggle.</action>
  <action>Show, don't tell. Use vivid, concrete details.</action>
  <action>Emotion drives memory. Find the feeling.</action>
  <action>Authenticity resonates. Stay true to the core truth.</action>
  <ask>Change is essential. Ask what transforms.</ask>
  <ask>Who or what is the hero of this story?</ask>
  <ask>What's their ordinary world before the adventure?</ask>
  <ask>What call to adventure disrupts their world?</ask>
  <ask>What trials or challenges do they face?</ask>
  <ask>How are they transformed by the journey?</ask>
  <template-output>story_beats, character_voice, conflict_tension, transformation</template-output>
</step>

<step n="4" goal="Craft emotional arc">
  <action>Develop the emotional journey of the story.</action>
  <action>Help the user identify:</action>
  <action>Relatable struggles that create empathy</action>
  <action>Surprising moments that capture attention</action>
  <action>Personal stakes that make it matter</action>
  <action>Satisfying payoffs that create resolution</action>
  <ask>Ask:</ask>
  <ask>What emotion should the audience feel at the beginning?</ask>
  <ask>What emotional shift happens at the turning point?</ask>
  <ask>What emotion should they carry away at the end?</ask>
  <ask>Where are the emotional peaks (high tension or joy)?</ask>
  <ask>Where are the valleys (low points or struggle)?</ask>
  <template-output>emotional_arc, emotional_touchpoints</template-output>
</step>

<step n="5" goal="Develop opening hook">
  <action>The first moment determines whether the audience keeps reading or listening.</action>
  <action>Guide toward a strong hook that:</action>
  <action>Surprises or challenges assumptions</action>
  <action>Raises an urgent question</action>
  <action>Creates immediate relatability</action>
  <action>Promises valuable payoff</action>
  <ask>Ask:</ask>
  <ask>What surprising fact, question, or statement could open this story?</ask>
  <ask>What's the most intriguing part of this story to lead with?</ask>
  <template-output>opening_hook</template-output>
</step>

<step n="6" goal="Write core narrative">
  <action>Draft the story themselves with your guidance</action>
  <action>Have you write the first draft based on the discussion</action>
  <action>Co-create it iteratively together</action>
  <action>If they choose to draft it themselves:</action>
  <action>Provide writing prompts and encouragement.</action>
  <action>Offer feedback on drafts they share.</action>
  <ask>Ask whether the user wants to:</ask>
  <template-output>complete_story, core_narrative</template-output>
</step>

<step n="7" goal="Create story variations">
  <action>Adapt the story for different contexts and lengths.</action>
  <action>Based on the response, create:</action>
  <action>Short Version (1-3 sentences) for social media, email subject lines, and quick pitches</action>
  <action>Medium Version (1-2 paragraphs) for email body, blog intro, and executive summary</action>
  <action>Extended Version (full narrative) for articles, presentations, case studies, and websites</action>
  <ask>Ask what channels or formats will use this story.</ask>
  <template-output>short_version, medium_version, extended_version</template-output>
</step>

<step n="8" goal="Usage guidelines">
  <action>Provide strategic guidance for story deployment.</action>
  <action>Consider:</action>
  <action>Best channels for this story type</action>
  <action>Audience-specific adaptations needed</action>
  <action>Tone and voice consistency with brand</action>
  <action>Visual or multimedia enhancements</action>
  <ask>Ask where and how the story will be used.</ask>
  <template-output>best_channels, audience_considerations, tone_notes, adaptation_suggestions</template-output>
</step>

<step n="9" goal="Refinement and next steps">
  <action>Polish the story and plan forward.</action>
  <ask>Ask:</ask>
  <ask>What parts of the story feel strongest?</ask>
  <ask>What areas could use more refinement?</ask>
  <ask>What's the key resolution or call to action for your story?</ask>
  <ask>Do you need additional story versions for other audiences or purposes?</ask>
  <ask>How will you test this story with your audience?</ask>
  <template-output>resolution, refinement_opportunities, additional_versions, feedback_plan</template-output>
</step>

<step n="10" goal="Generate final output">
  <action>Compile all story components into the structured template.</action>
  <action>Before finishing:</action>
  <action>Ensure all story versions are complete and polished.</action>
  <action>Format according to the template structure.</action>
  <action>Include all strategic guidance and usage notes.</action>
  <action>Verify tone and voice consistency.</action>
  <template-output>agent_role, agent_name, user_name, date</template-output>
</step>

</workflow>
</prose>
