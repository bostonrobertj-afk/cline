---
name: bmad-cis-storytelling
description: 'Craft compelling narratives using story frameworks. Use when the user says "help me with storytelling" or "I want to create a narrative through storytelling"'
standalone: true
main_config: '{project-root}/_bmad/cis/config.yaml'
---

# workflow

## META

- Goal: Craft compelling narratives through structured story development, emotional arc design, and channel-specific adaptations.
- Execute this workflow in order.
- Halt whenever user input, confirmation, or workflow gating is required.

## EXECUTION

<step n="1" goal="Set up the story context">
  <action>
    Load the core workflow configuration from `{main_config}` and resolve the values needed for this session.
    <detail>
      Resolve:
      - `output_folder`
      - `user_name`
      - `communication_language`
      - `date`
      - `story_frameworks_file = ./story-types.csv`
      - `template_file = ./template.md`
      - `default_output_file = {output_folder}/story-{date}.md`
    </detail>
  </action>
  <action if="context data was provided with the workflow invocation">
    Load the provided context and use it to ground the storytelling session.
    <detail>
      Use the context to inform story purpose, audience, framing, and later narrative choices.
    </detail>
  </action>
  <action>Initialize `{default_output_file}` from `{template_file}` so the story artifact is ready to receive structured outputs.</action>
  <output>Frame the session as guided storytelling that preserves authentic voice, emotional resonance, and narrative clarity.</output>
  <branch if="context data was provided with the workflow invocation">
    <ask>Ask what specific angle, emphasis, or interpretation the user wants to bring to the provided context.</ask>
  </branch>
  <ask>
    Gather the core narrative context needed to shape the story.
    <detail>
      Cover:
      - What's the purpose of this story?
      - Who is the target audience?
      - What key messages or takeaways should the audience have?
      - What constraints exist, such as length, tone, medium, or brand guidelines?
    </detail>
  </ask>
  <template-output>story_purpose, target_audience, key_messages</template-output>
  <action>Save the current artifact state to `{default_output_file}` immediately after generating the story-context outputs.</action>
  <output>Show a clear checkpoint separator and display the story purpose, target audience, and key-message framing.</output>
  <ask>
    Ask whether the user wants to continue, use advanced elicitation, enter party mode, or proceed in YOLO mode.
    <detail>
      Present:
      - `[a]` Advanced Elicitation
      - `[c]` Continue
      - `[p]` Party-Mode
      - `[y]` YOLO
    </detail>
  </ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the story-context refinements from advanced elicitation should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the story-context refinements from party mode should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current story context and continue decisively into framework selection.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current story context and continue to framework selection.</action>
  </branch>
</step>

<step n="2" goal="Select the story framework">
  <action>
    Load and parse the story frameworks from `{story_frameworks_file}`.
    <detail>
      Preserve the same conceptual fields used by the original workflow, including framework type, name, description, key elements, and best-fit guidance.
    </detail>
  </action>
  <output>Present the available storytelling frameworks and explain how each one shapes the narrative differently.</output>
  <output>
    Offer framework options matched to the story context.
    <detail>
      Include transformation, strategic, and specialized narrative options as relevant, such as:
      - Hero's Journey
      - Pixar Story Spine
      - Customer Journey Story
      - Challenge-Overcome Arc
      - Brand Story
      - Pitch Narrative
      - Vision Narrative
      - Origin Story
      - Data Storytelling
      - Emotional Hooks
    </detail>
  </output>
  <ask>
    Ask which framework fits best, or whether the user wants a recommendation.
    <detail>
      Accept a numbered framework choice or a request for recommendation.
      If recommending, explain why the chosen framework best fits the story purpose, target audience, and key messages.
    </detail>
  </ask>
  <template-output>story_type, framework_name</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the framework-selection outputs.</action>
  <output>Show a clear checkpoint separator and display the selected framework and rationale.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the framework-selection refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode framework refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the selected framework and continue decisively into story development.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the selected framework and continue to story development.</action>
  </branch>
</step>

<step n="3" goal="Gather the story elements">
  <action>
    Guide narrative development using a Socratic style.
    <detail>
      Draw out the user's story through questions rather than writing it for them unless they explicitly ask for drafting help.
    </detail>
    <detail>
      Keep these principles active:
      - every great story has conflict or tension
      - show, don't tell
      - change is essential
      - emotion drives memory
      - authenticity resonates
    </detail>
  </action>
  <action>
    Use the selected framework's key elements to structure the questioning flow.
    <detail>
      Parse the framework into its component beats or narrative elements and use those to guide the conversation.
    </detail>
  </action>
  <ask>
    Gather the story beats, voice, conflict, and transformation.
    <detail>
      Tailor the prompts to the chosen framework.
      Examples include:
      - Hero's Journey: hero, ordinary world, call to adventure, trials, transformation, return
      - Pixar Story Spine: setup, disruption, chain of consequences, resolution
      - Brand Story: origin spark, values, impact, differentiation, future
      - Pitch Narrative: problem, vision, proof, desired action
      - Data Storytelling: context, insight, patterns, meaning, action
    </detail>
  </ask>
  <template-output>story_beats, character_voice, conflict_tension, transformation</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the story-element outputs.</action>
  <output>Show a clear checkpoint separator and display the story beats, voice, conflict, and transformation frame.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the story-element refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode story-element refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the story foundation and continue decisively into emotional-arc design.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the story foundation and continue to emotional-arc design.</action>
  </branch>
</step>

<step n="4" goal="Craft the emotional arc">
  <action>
    Develop the emotional journey of the story.
    <detail>
      Focus on relatable struggles, surprising moments, meaningful stakes, and satisfying payoffs.
    </detail>
  </action>
  <ask>
    Map the emotional arc with the user.
    <detail>
      Cover:
      - What emotion should the audience feel at the beginning?
      - What emotional shift happens at the turning point?
      - What emotion should they carry away at the end?
      - Where are the emotional peaks?
      - Where are the valleys?
    </detail>
  </ask>
  <template-output>emotional_arc, emotional_touchpoints</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the emotional-arc outputs.</action>
  <output>Show a clear checkpoint separator and display the emotional arc and key touchpoints.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the emotional-arc refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode emotional-arc refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the emotional arc and continue decisively into hook development.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the emotional arc and continue to hook development.</action>
  </branch>
</step>

<step n="5" goal="Develop the opening hook">
  <action>
    Guide the user toward a strong opening hook.
    <detail>
      A strong hook should:
      - surprise or challenge assumptions
      - raise an urgent question
      - create immediate relatability
      - promise valuable payoff
      - use vivid, concrete details where possible
    </detail>
  </action>
  <ask>
    Explore possible openings.
    <detail>
      Cover:
      - What surprising fact, question, or statement could open this story?
      - What's the most intriguing part of the story to lead with?
    </detail>
  </ask>
  <template-output>opening_hook</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the opening-hook output.</action>
  <output>Show a clear checkpoint separator and display the proposed opening hook.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the opening-hook refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode hook refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the opening hook and continue decisively into core narrative creation.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the opening hook and continue to core narrative creation.</action>
  </branch>
</step>

<step n="6" goal="Write the core narrative">
  <ask>
    Ask how the user wants to create the main story draft.
    <detail>
      Options should include:
      - the user drafts it with guidance
      - the agent writes the first draft based on the discussion
      - the story is co-created iteratively together
    </detail>
  </ask>
  <branch if="user chooses to draft the story themselves">
    <action>Provide writing prompts, encouragement, and feedback on any draft material the user shares.</action>
  </branch>
  <branch if="user chooses to have the agent draft the story">
    <action>
      Synthesize the gathered material into a complete narrative draft.
      <detail>
        Structure it according to the chosen framework and include vivid details, emotional beats, and the intended voice.
      </detail>
    </action>
  </branch>
  <branch if="user chooses collaborative co-creation">
    <action>Draft the story in sections, get feedback, and iterate together through the narrative.</action>
  </branch>
  <template-output>complete_story, core_narrative</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the core-narrative outputs.</action>
  <output>Show a clear checkpoint separator and display the current story draft or co-created narrative state.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the core-narrative refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode narrative refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current story draft and continue decisively into story variations.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current story draft and continue to story variations.</action>
  </branch>
</step>

<step n="7" goal="Create story variations">
  <action>
    Adapt the story for different contexts and lengths.
    <detail>
      Create:
      - a short version for quick pitches and social use
      - a medium version for email or summary contexts
      - an extended version for full narrative use
    </detail>
  </action>
  <ask>Ask what channels or formats will use this story.</ask>
  <template-output>short_version, medium_version, extended_version</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the story-variation outputs.</action>
  <output>Show a clear checkpoint separator and display the story variations created for the selected contexts.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the variation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode variation refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the current story variations and continue decisively into usage guidance.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the current story variations and continue to usage guidance.</action>
  </branch>
</step>

<step n="8" goal="Provide usage guidelines">
  <action>
    Provide strategic guidance for story deployment.
    <detail>
      Consider:
      - best channels for this story type
      - audience-specific adaptations
      - tone and voice consistency
      - visual or multimedia enhancements
      - testing and feedback approach
    </detail>
  </action>
  <ask>Ask where and how the story will be used.</ask>
  <template-output>best_channels, audience_considerations, tone_notes, adaptation_suggestions</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the usage-guidance outputs.</action>
  <output>Show a clear checkpoint separator and display the usage guidance and adaptation notes.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the usage-guidance refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode usage refinements should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the usage guidance and continue decisively into refinement planning.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the usage guidance and continue to refinement planning.</action>
  </branch>
</step>

<step n="9" goal="Refine and plan next steps">
  <action>Polish the story and identify the most important next improvements.</action>
  <ask>
    Guide a refinement conversation.
    <detail>
      Cover:
      - What parts of the story feel strongest?
      - What areas could use more refinement?
      - What's the key resolution or call to action?
      - Are additional versions needed for other audiences or purposes?
      - How will the story be tested with its audience?
    </detail>
  </ask>
  <template-output>resolution, refinement_opportunities, additional_versions, feedback_plan</template-output>
  <action>Save the updated artifact to `{default_output_file}` immediately after generating the refinement outputs.</action>
  <output>Show a clear checkpoint separator and display the resolution, refinement priorities, and feedback plan.</output>
  <ask>Ask whether the user wants `[a]` Advanced Elicitation, `[c]` Continue, `[p]` Party-Mode, or `[y]` YOLO.</ask>
  <branch if="user selects `[a]`">
    <handoff path="skill:bmad-advanced-elicitation" />
    <ask>Ask whether the refinement changes should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[p]`">
    <handoff path="skill:bmad-party-mode" />
    <ask>Ask whether the party-mode refinement changes should be incorporated before continuing.</ask>
  </branch>
  <branch if="user selects `[y]`">
    <action>Accept the refinement plan and continue decisively into final output generation.</action>
  </branch>
  <branch if="user selects `[c]`">
    <action>Accept the refinement plan and continue to final output generation.</action>
  </branch>
</step>

<step n="10" goal="Generate the final output">
  <action>
    Compile all story components into the final structured artifact.
    <detail>
      Ensure the story versions are complete, polished, and consistent with the intended tone and voice.
    </detail>
  </action>
  <action>Fill the remaining template metadata and finalize `{default_output_file}`.</action>
  <template-output>agent_role, agent_name, user_name, date</template-output>
  <action>Save the finalized story artifact to `{default_output_file}`.</action>
  <output>Show a clear checkpoint separator and present the completed story deliverable, including where it was saved.</output>
</step>

## CHECKPOINT

Halt whenever a phase checkpoint menu is presented after template outputs are saved and displayed, and wait for the user's `[a]`, `[c]`, `[p]`, or `[y]` choice before advancing.

## ADVISORY

- Act as a master storyteller and narrative guide: draw out the user's story through questions, preserve authentic voice, and build emotional resonance.
- Do not give time estimates.
- Keep the session grounded in `communication_language`.
- Do not tell the model to read this workflow file or any prose section; every operational instruction needed for execution is already expressed in the structured step content.
