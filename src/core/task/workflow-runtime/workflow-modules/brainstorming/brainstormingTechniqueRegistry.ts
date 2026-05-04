export enum BrainstormingTechniqueCategory {
	Collaborative = "Collaborative",
	Creative = "Creative",
	Deep = "Deep",
	IntrospectiveDelight = "Introspective Delight",
	Structured = "Structured",
	Theatrical = "Theatrical",
	Wild = "Wild",
	Biomimetic = "Biomimetic",
	Quantum = "Quantum",
	Cultural = "Cultural",
}

export interface BrainstormingTechnique {
	id: string
	name: string
	category: BrainstormingTechniqueCategory
	description: string
}

export const BRAINSTORMING_TECHNIQUES = [
	{
		id: "yes-and-building",
		name: "Yes And Building",
		category: BrainstormingTechniqueCategory.Collaborative,
		description:
			"Build momentum through positive additions where each idea becomes a launching pad - use prompts like 'Yes and we could also...' or 'Building on that idea...' to create energetic collaborative flow that builds upon previous contributions",
	},
	{
		id: "brain-writing-round-robin",
		name: "Brain Writing Round Robin",
		category: BrainstormingTechniqueCategory.Collaborative,
		description:
			"Silent idea generation followed by building on others' written concepts - gives quieter voices equal contribution while maintaining documentation through the sequence of writing silently, passing ideas, and building on received concepts",
	},
	{
		id: "random-stimulation",
		name: "Random Stimulation",
		category: BrainstormingTechniqueCategory.Collaborative,
		description:
			"Use random words/images as creative catalysts to force unexpected connections - breaks through mental blocks with serendipitous inspiration by asking how random elements relate, what connections exist, and forcing relationships",
	},
	{
		id: "role-playing",
		name: "Role Playing",
		category: BrainstormingTechniqueCategory.Collaborative,
		description:
			"Generate solutions from multiple stakeholder perspectives to build empathy while ensuring comprehensive consideration - embody different roles by asking what they want, how they'd approach problems, and what matters most to them",
	},
	{
		id: "ideation-relay-race",
		name: "Ideation Relay Race",
		category: BrainstormingTechniqueCategory.Collaborative,
		description:
			"Rapid-fire idea building under time pressure creates urgency and breakthroughs - structure with 30-second additions, quick building on ideas, and fast passing to maintain creative momentum and prevent overthinking",
	},
	{
		id: "what-if-scenarios",
		name: "What If Scenarios",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Explore radical possibilities by questioning all constraints and assumptions - perfect for breaking through stuck thinking using prompts like 'What if we had unlimited resources?' 'What if the opposite were true?' or 'What if this problem didn't exist?'",
	},
	{
		id: "analogical-thinking",
		name: "Analogical Thinking",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Find creative solutions by drawing parallels to other domains - transfer successful patterns by asking 'This is like what?' 'How is this similar to...' and 'What other examples come to mind?' to connect to existing solutions",
	},
	{
		id: "reversal-inversion",
		name: "Reversal Inversion",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Deliberately flip problems upside down to reveal hidden assumptions and fresh angles - great when conventional approaches fail by asking 'What if we did the opposite?' 'How could we make this worse?' and 'What's the reverse approach?'",
	},
	{
		id: "first-principles-thinking",
		name: "First Principles Thinking",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Strip away assumptions to rebuild from fundamental truths - essential for breakthrough innovation by asking 'What do we know for certain?' 'What are the fundamental truths?' and 'If we started from scratch?'",
	},
	{
		id: "forced-relationships",
		name: "Forced Relationships",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Connect unrelated concepts to spark innovative bridges through creative collision - take two unrelated things, find connections between them, identify bridges, and explore how they could work together to generate unexpected solutions",
	},
	{
		id: "time-shifting",
		name: "Time Shifting",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Explore solutions across different time periods to reveal constraints and opportunities by asking 'How would this work in the past?' 'What about 100 years from now?' 'Different era constraints?' and 'What time-based solutions apply?'",
	},
	{
		id: "metaphor-mapping",
		name: "Metaphor Mapping",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Use extended metaphors as thinking tools to explore problems from new angles - transforms abstract challenges into tangible narratives by asking 'This problem is like a metaphor,' extending the metaphor, and mapping elements to discover insights",
	},
	{
		id: "cross-pollination",
		name: "Cross-Pollination",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Transfer solutions from completely different industries or domains to spark breakthrough innovations by asking how industry X would solve this, what patterns work in field Y, and how to adapt solutions from domain Z",
	},
	{
		id: "concept-blending",
		name: "Concept Blending",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Merge two or more existing concepts to create entirely new categories - goes beyond simple combination to genuine innovation by asking what emerges when concepts merge, what new category is created, and how the blend transcends original ideas",
	},
	{
		id: "reverse-brainstorming",
		name: "Reverse Brainstorming",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Generate problems instead of solutions to identify hidden opportunities and unexpected pathways by asking 'What could go wrong?' 'How could we make this fail?' and 'What problems could we create?' to reveal solution insights",
	},
	{
		id: "sensory-exploration",
		name: "Sensory Exploration",
		category: BrainstormingTechniqueCategory.Creative,
		description:
			"Engage all five senses to discover multi-dimensional solution spaces beyond purely analytical thinking by asking what ideas feel, smell, taste, or sound like, and how different senses engage with the problem space",
	},
	{
		id: "five-whys",
		name: "Five Whys",
		category: BrainstormingTechniqueCategory.Deep,
		description:
			"Drill down through layers of causation to uncover root causes - essential for solving problems at source rather than symptoms by asking 'Why did this happen?' repeatedly until reaching fundamental drivers and ultimate causes",
	},
	{
		id: "morphological-analysis",
		name: "Morphological Analysis",
		category: BrainstormingTechniqueCategory.Deep,
		description:
			"Systematically explore all possible parameter combinations for complex systems requiring comprehensive solution mapping - identify key parameters, list options for each, try different combinations, and identify emerging patterns",
	},
	{
		id: "provocation-technique",
		name: "Provocation Technique",
		category: BrainstormingTechniqueCategory.Deep,
		description:
			"Use deliberately provocative statements to extract useful ideas from seemingly absurd starting points - catalyzes breakthrough thinking by asking 'What if provocative statement?' 'How could this be useful?' 'What idea triggers?' and 'Extract the principle'",
	},
	{
		id: "assumption-reversal",
		name: "Assumption Reversal",
		category: BrainstormingTechniqueCategory.Deep,
		description:
			"Challenge and flip core assumptions to rebuild from new foundations - essential for paradigm shifts by asking 'What assumptions are we making?' 'What if the opposite were true?' 'Challenge each assumption' and 'Rebuild from new assumptions'",
	},
	{
		id: "question-storming",
		name: "Question Storming",
		category: BrainstormingTechniqueCategory.Deep,
		description:
			"Generate questions before seeking answers to properly define problem space - ensures solving the right problem by asking only questions, no answers yet, focusing on what we don't know, and identifying what we should be asking",
	},
	{
		id: "constraint-mapping",
		name: "Constraint Mapping",
		category: BrainstormingTechniqueCategory.Deep,
		description:
			"Identify and visualize all constraints to find promising pathways around or through limitations - ask what all constraints exist, which are real vs imagined, and how to work around or eliminate barriers to solution space",
	},
	{
		id: "failure-analysis",
		name: "Failure Analysis",
		category: BrainstormingTechniqueCategory.Deep,
		description:
			"Study successful failures to extract valuable insights and avoid common pitfalls - learns from what didn't work by asking what went wrong, why it failed, what lessons emerged, and how to apply failure wisdom to current challenges",
	},
	{
		id: "emergent-thinking",
		name: "Emergent Thinking",
		category: BrainstormingTechniqueCategory.Deep,
		description:
			"Allow solutions to emerge organically without forcing linear progression - embraces complexity and natural development by asking what patterns emerge, what wants to happen naturally, and what's trying to emerge from the system",
	},
	{
		id: "inner-child-conference",
		name: "Inner Child Conference",
		category: BrainstormingTechniqueCategory.IntrospectiveDelight,
		description:
			"Channel pure childhood curiosity and wonder to rekindle playful exploration - ask what 7-year-old you would ask, use 'why why why' questioning, make it fun again, and forbid boring thinking to access innocent questioning that cuts through adult complications",
	},
	{
		id: "shadow-work-mining",
		name: "Shadow Work Mining",
		category: BrainstormingTechniqueCategory.IntrospectiveDelight,
		description:
			"Explore what you're actively avoiding or resisting to uncover hidden insights - examine unconscious blocks and resistance patterns by asking what you're avoiding, where's resistance, what scares you, and mining the shadows for buried wisdom",
	},
	{
		id: "values-archaeology",
		name: "Values Archaeology",
		category: BrainstormingTechniqueCategory.IntrospectiveDelight,
		description:
			"Excavate deep personal values driving decisions to clarify authentic priorities - dig to bedrock motivations by asking what really matters, why you care, what's non-negotiable, and what core values guide your choices",
	},
	{
		id: "future-self-interview",
		name: "Future Self Interview",
		category: BrainstormingTechniqueCategory.IntrospectiveDelight,
		description:
			"Seek wisdom from wiser future self for long-term perspective - gain temporal self-mentoring by asking your 80-year-old self what they'd tell younger you, how future wisdom speaks, and what long-term perspective reveals",
	},
	{
		id: "body-wisdom-dialogue",
		name: "Body Wisdom Dialogue",
		category: BrainstormingTechniqueCategory.IntrospectiveDelight,
		description:
			"Let physical sensations and gut feelings guide ideation - tap somatic intelligence often ignored by mental approaches by asking what your body says, where you feel it, trusting tension, and following physical cues for embodied wisdom",
	},
	{
		id: "permission-giving",
		name: "Permission Giving",
		category: BrainstormingTechniqueCategory.IntrospectiveDelight,
		description:
			"Grant explicit permission to think impossible thoughts and break self-imposed creative barriers - give yourself permission to explore, try, experiment, and break free from limitations that constrain authentic creative expression",
	},
	{
		id: "scamper-method",
		name: "SCAMPER Method",
		category: BrainstormingTechniqueCategory.Structured,
		description:
			"Systematic creativity through seven lenses for methodical product improvement and innovation - Substitute (what could you substitute), Combine (what could you combine), Adapt (how could you adapt), Modify (what could you modify), Put to other uses, Eliminate, Reverse",
	},
	{
		id: "six-thinking-hats",
		name: "Six Thinking Hats",
		category: BrainstormingTechniqueCategory.Structured,
		description:
			"Explore problems through six distinct perspectives without conflict - White Hat (facts), Red Hat (emotions), Yellow Hat (benefits), Black Hat (risks), Green Hat (creativity), Blue Hat (process) to ensure comprehensive analysis from all angles",
	},
	{
		id: "mind-mapping",
		name: "Mind Mapping",
		category: BrainstormingTechniqueCategory.Structured,
		description:
			"Visually branch ideas from central concept to discover connections and expand thinking - perfect for organizing complex thoughts and seeing big picture by putting main idea in center, branching concepts, and identifying sub-branches",
	},
	{
		id: "resource-constraints",
		name: "Resource Constraints",
		category: BrainstormingTechniqueCategory.Structured,
		description:
			"Generate innovative solutions by imposing extreme limitations - forces essential priorities and creative efficiency under pressure by asking what if you had only $1, no technology, one hour to solve, or minimal resources only",
	},
	{
		id: "decision-tree-mapping",
		name: "Decision Tree Mapping",
		category: BrainstormingTechniqueCategory.Structured,
		description:
			"Map out all possible decision paths and outcomes to reveal hidden opportunities and risks - visualizes complex choice architectures by identifying possible paths, decision points, and where different choices lead",
	},
	{
		id: "solution-matrix",
		name: "Solution Matrix",
		category: BrainstormingTechniqueCategory.Structured,
		description:
			"Create systematic grid of problem variables and solution approaches to find optimal combinations and discover gaps - identify key variables, solution approaches, test combinations, and identify most effective pairings",
	},
	{
		id: "trait-transfer",
		name: "Trait Transfer",
		category: BrainstormingTechniqueCategory.Structured,
		description:
			"Borrow attributes from successful solutions in unrelated domains to enhance approach - systematically adapts winning characteristics by asking what traits make success X work, how to transfer these traits, and what they'd look like here",
	},
	{
		id: "time-travel-talk-show",
		name: "Time Travel Talk Show",
		category: BrainstormingTechniqueCategory.Theatrical,
		description:
			"Interview past/present/future selves for temporal wisdom - playful method for gaining perspective across different life stages by interviewing past self, asking what future you'd say, and exploring different timeline perspectives",
	},
	{
		id: "alien-anthropologist",
		name: "Alien Anthropologist",
		category: BrainstormingTechniqueCategory.Theatrical,
		description:
			"Examine familiar problems through completely foreign eyes - reveals hidden assumptions by adopting outsider's bewildered perspective by becoming alien observer, asking what seems strange, and getting outside perspective insights",
	},
	{
		id: "dream-fusion-laboratory",
		name: "Dream Fusion Laboratory",
		category: BrainstormingTechniqueCategory.Theatrical,
		description:
			"Start with impossible fantasy solutions then reverse-engineer practical steps - makes ambitious thinking actionable through backwards design by dreaming impossible solutions, working backwards to reality, and identifying bridging steps",
	},
	{
		id: "emotion-orchestra",
		name: "Emotion Orchestra",
		category: BrainstormingTechniqueCategory.Theatrical,
		description:
			"Let different emotions lead separate brainstorming sessions then harmonize - uses emotional intelligence for comprehensive perspective by exploring angry perspectives, joyful approaches, fearful considerations, hopeful solutions, then harmonizing all voices",
	},
	{
		id: "parallel-universe-cafe",
		name: "Parallel Universe Cafe",
		category: BrainstormingTechniqueCategory.Theatrical,
		description:
			"Explore solutions under alternative reality rules - breaks conventional thinking by changing fundamental assumptions about how things work by exploring different physics universes, alternative social norms, changed historical events, and reality rule variations",
	},
	{
		id: "persona-journey",
		name: "Persona Journey",
		category: BrainstormingTechniqueCategory.Theatrical,
		description:
			"Embody different archetypes or personas to access diverse wisdom through character exploration - become the archetype, ask how persona would solve this, and explore what character sees that normal thinking misses",
	},
	{
		id: "chaos-engineering",
		name: "Chaos Engineering",
		category: BrainstormingTechniqueCategory.Wild,
		description:
			"Deliberately break things to discover robust solutions - builds anti-fragility by stress-testing ideas against worst-case scenarios by asking what if everything went wrong, breaking on purpose, how it fails gracefully, and building from rubble",
	},
	{
		id: "guerrilla-gardening-ideas",
		name: "Guerrilla Gardening Ideas",
		category: BrainstormingTechniqueCategory.Wild,
		description:
			"Plant unexpected solutions in unlikely places - uses surprise and unconventional placement for stealth innovation by asking where's the least expected place, planting ideas secretly, growing solutions underground, and implementing with surprise",
	},
	{
		id: "pirate-code-brainstorm",
		name: "Pirate Code Brainstorm",
		category: BrainstormingTechniqueCategory.Wild,
		description:
			"Take what works from anywhere and remix without permission - encourages rule-bending rapid prototyping and maverick thinking by asking what pirates would steal, remixing without asking, taking best and running, and needing no permission",
	},
	{
		id: "zombie-apocalypse-planning",
		name: "Zombie Apocalypse Planning",
		category: BrainstormingTechniqueCategory.Wild,
		description:
			"Design solutions for extreme survival scenarios - strips away all but essential functions to find core value by asking what happens when society collapses, what basics work, building from nothing, and thinking in survival mode",
	},
	{
		id: "drunk-history-retelling",
		name: "Drunk History Retelling",
		category: BrainstormingTechniqueCategory.Wild,
		description:
			"Explain complex ideas with uninhibited simplicity - removes overthinking barriers to find raw truth through simplified expression by explaining like you're tipsy, using no filter, sharing raw thoughts, and simplifying to absurdity",
	},
	{
		id: "anti-solution",
		name: "Anti-Solution",
		category: BrainstormingTechniqueCategory.Wild,
		description:
			"Generate ways to make the problem worse or more interesting - reveals hidden assumptions through destructive creativity by asking how to sabotage this, what would make it fail spectacularly, and how to create more problems to find solution insights",
	},
	{
		id: "quantum-superposition",
		name: "Quantum Superposition",
		category: BrainstormingTechniqueCategory.Wild,
		description:
			"Hold multiple contradictory solutions simultaneously until best emerges through observation and testing - explores how all solutions could be true simultaneously, how contradictions coexist, and what happens when outcomes are observed",
	},
	{
		id: "elemental-forces",
		name: "Elemental Forces",
		category: BrainstormingTechniqueCategory.Wild,
		description:
			"Imagine solutions being sculpted by natural elements to tap into primal creative energies - explore how earth would sculpt this, what fire would forge, how water flows through this, and what air reveals to access elemental wisdom",
	},
	{
		id: "natures-solutions",
		name: "Nature's Solutions",
		category: BrainstormingTechniqueCategory.Biomimetic,
		description:
			"Study how nature solves similar problems and adapt biological strategies to challenge - ask how nature would solve this, what ecosystems provide parallels, and what biological strategies apply to access 3.8 billion years of evolutionary wisdom",
	},
	{
		id: "ecosystem-thinking",
		name: "Ecosystem Thinking",
		category: BrainstormingTechniqueCategory.Biomimetic,
		description:
			"Analyze problem as ecosystem to identify symbiotic relationships, natural succession, and ecological principles - explore symbiotic relationships, natural succession application, and ecological principles for systems thinking",
	},
	{
		id: "evolutionary-pressure",
		name: "Evolutionary Pressure",
		category: BrainstormingTechniqueCategory.Biomimetic,
		description:
			"Apply evolutionary principles to gradually improve solutions through selective pressure and adaptation - ask how evolution would optimize this, what selective pressures apply, and how this adapts over time to harness natural selection wisdom",
	},
	{
		id: "observer-effect",
		name: "Observer Effect",
		category: BrainstormingTechniqueCategory.Quantum,
		description:
			"Recognize how observing and measuring solutions changes their behavior - uses quantum principles for innovation by asking how observing changes this, what measurement effects matter, and how to use observer effect advantageously",
	},
	{
		id: "entanglement-thinking",
		name: "Entanglement Thinking",
		category: BrainstormingTechniqueCategory.Quantum,
		description:
			"Explore how different solution elements might be connected regardless of distance - reveals hidden relationships by asking what elements are entangled, how distant parts affect each other, and what hidden connections exist between solution components",
	},
	{
		id: "superposition-collapse",
		name: "Superposition Collapse",
		category: BrainstormingTechniqueCategory.Quantum,
		description:
			"Hold multiple potential solutions simultaneously until constraints force single optimal outcome - leverages quantum decision theory by asking what if all options were possible, what constraints force collapse, and which solution emerges when observed",
	},
	{
		id: "indigenous-wisdom",
		name: "Indigenous Wisdom",
		category: BrainstormingTechniqueCategory.Cultural,
		description:
			"Draw upon traditional knowledge systems and indigenous approaches overlooked by modern thinking - ask how specific cultures would approach this, what traditional knowledge applies, and what ancestral wisdom guides us to access overlooked problem-solving methods",
	},
	{
		id: "fusion-cuisine",
		name: "Fusion Cuisine",
		category: BrainstormingTechniqueCategory.Cultural,
		description:
			"Mix cultural approaches and perspectives like fusion cuisine - creates innovation through cultural cross-pollination by asking what happens when mixing culture A with culture B, what cultural hybrids emerge, and what fusion creates",
	},
	{
		id: "ritual-innovation",
		name: "Ritual Innovation",
		category: BrainstormingTechniqueCategory.Cultural,
		description:
			"Apply ritual design principles to create transformative experiences and solutions - uses anthropological insights for human-centered design by asking what ritual would transform this, how to make it ceremonial, and what transformation this needs",
	},
	{
		id: "mythic-frameworks",
		name: "Mythic Frameworks",
		category: BrainstormingTechniqueCategory.Cultural,
		description:
			"Use myths and archetypal stories as frameworks for understanding and solving problems - taps into collective unconscious by asking what myth parallels this, what archetypes are involved, and how mythic structure informs solution",
	},
] as const satisfies readonly BrainstormingTechnique[]

const BRAINSTORMING_TECHNIQUE_CATEGORIES = [
	BrainstormingTechniqueCategory.Collaborative,
	BrainstormingTechniqueCategory.Creative,
	BrainstormingTechniqueCategory.Deep,
	BrainstormingTechniqueCategory.IntrospectiveDelight,
	BrainstormingTechniqueCategory.Structured,
	BrainstormingTechniqueCategory.Theatrical,
	BrainstormingTechniqueCategory.Wild,
	BrainstormingTechniqueCategory.Biomimetic,
	BrainstormingTechniqueCategory.Quantum,
	BrainstormingTechniqueCategory.Cultural,
] as const satisfies readonly BrainstormingTechniqueCategory[]

export function listBrainstormingTechniqueCategories(): readonly BrainstormingTechniqueCategory[] {
	return BRAINSTORMING_TECHNIQUE_CATEGORIES
}

export function listBrainstormingTechniquesByCategory(
	category: BrainstormingTechniqueCategory,
): readonly BrainstormingTechnique[] {
	return BRAINSTORMING_TECHNIQUES.filter((technique) => technique.category === category)
}

function normalizeTechniqueLookupValue(value: string): string {
	return value.trim().toLowerCase()
}

export function findBrainstormingTechniqueByIdOrName(input: { id?: string; name?: string }): BrainstormingTechnique | undefined {
	if (input.id !== undefined) {
		const normalizedId = normalizeTechniqueLookupValue(input.id)
		if (normalizedId.length > 0) {
			const matchedById = BRAINSTORMING_TECHNIQUES.find((technique) => technique.id === normalizedId)
			if (matchedById !== undefined) {
				return matchedById
			}
		}
	}

	if (input.name !== undefined) {
		const normalizedName = normalizeTechniqueLookupValue(input.name)
		if (normalizedName.length > 0) {
			return BRAINSTORMING_TECHNIQUES.find((technique) => normalizeTechniqueLookupValue(technique.name) === normalizedName)
		}
	}

	return undefined
}

export function selectRandomBrainstormingTechnique(input: {
	excludedIds: readonly string[]
	random?: () => number
}): BrainstormingTechnique | undefined {
	const excludedIds = new Set(input.excludedIds.map((id) => normalizeTechniqueLookupValue(id)))
	const eligibleTechniques = BRAINSTORMING_TECHNIQUES.filter((technique) => !excludedIds.has(technique.id))

	if (eligibleTechniques.length === 0) {
		return undefined
	}

	const random = input.random ?? Math.random
	const randomValue = random()
	const boundedRandomValue = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.9999999999999999) : 0
	const selectedIndex = Math.floor(boundedRandomValue * eligibleTechniques.length)

	return eligibleTechniques[selectedIndex]
}
