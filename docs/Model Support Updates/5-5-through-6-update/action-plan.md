- Read this plan from top to bottom before making any changes.
- Read each task and subtask in full immediately before executing it.
- Execute only one task or subtask at a time- return to this file and read the next task or subtask before executing. Do not rely on your internal memory when switching to a new task or subtask.
  - Exception: You may execute multiple sequential subtasks with one patch only if they are scoped to the same file, but must review each subtask vs the landed code after the patch to ensure that every subtask was implemented exactly as prescribed before marking the subtask as complete.
  - After completing a task or subtask, update that step's checkbox from "[ ]" to "[x]".
- Checkbox updates to this plan file are allowed in every step in addition to the listed allowed-files set.
- Do not edit any file not listed in the current step's allowed-files list.
- If any ambiguity is discovered, or if any change is needed outside the allowed-files list for the current step, stop and ask the user before proceeding.
- Implement tasks and subtasks exactly as instructed. If deviation seems necessary, stop, inform the user, and explain why you believe the task or subtask should be carried out differently than prescribed.

# OpenAI GPT-5.5 Through GPT-6 Support — Action Plan

Status: Implementation through Task 22 is complete. Task 23 live QA is partially executed, remains unchecked, and is paused on the workflow-runtime Focus Chain projection defect discovered during V5 Document Project reload/resume QA. Foundational Build Phase 73 must align Focus Chain with the canonical numbered workflow-step projection before V5 step 4 resumes. The user approved splitting the CLI provider-scoped checks into reachable native and compatible-provider sessions.

## Approved method and evidence

This plan implements [requirements.md](requirements.md), including the subsequent user decisions to upgrade the SDK, centralize model capabilities, and use per-response cost estimates. Exact GPT-5.5 session billing is deferred. The estimate can differ from the invoice after crossing 272,000 input tokens and subsequently returning below that threshold. Do not introduce billing-session persistence or retroactive repricing.

Use OpenAI SDK **6.49.0**, pinned exactly. Inspection of the published package confirmed `max` in `ReasoningEffort` and `cache_write_tokens` in Responses usage. SDK 7.17.0 also supplies these fields but raises its Node minimum to 22. The selected 6.x upgrade avoids that additional platform change. A read-only TypeScript compiler-host resolution against 6.49.0 produced zero diagnostics in the current backend/CLI source graph. This is authoring evidence, not implementation or runtime validation.

Model limits, rates, and reasoning options were checked against the official references linked in requirements §1.5. OpenAI's GPT-5.5 model page uses “full session” without defining a reset boundary; the user approved the documented approximation. New-model parameter construction must send explicit `none` for GPT-5.5/5.6: omitting reasoning would use the API default rather than the selected non-reasoning mode. Preserve the older models' existing omission behavior.

Centralization means `src/shared/storage/types.ts` owns the complete recognized effort vocabulary, `src/shared/openai-native-models.ts` owns the five new model records and their effort capabilities, and `src/shared/utils/reasoning-support.ts` owns provider/model option lookup and effective-effort resolution. Recognition and persistence accept `max`; capability resolution determines whether it may be selected or sent. The existing five-value behavior remains the fallback policy for unextended integrations, not a separate legacy effort type or a claim of newly verified API support. Only the four approved native 5.6/Astra profiles gain `max` exposure. Existing GPT-5 predicates remain the compatibility baseline for existing models. Do not rename GPT-5 family enums, rewrite prompt templates, add future model pattern matching, or add these catalog entries to other providers.

The user explicitly approved this normalization correction and the required CLI, shared-selector, and existing-provider fallout. Do not repair reasoning types with assertions, widen the catalog to an arbitrary string-keyed record, or add a controller-only `max` escape hatch. Use typed collection lookup and comparison; keep stored preferences separate from effective model settings. CLI effort help text gains the already-approved `max` option; no other CLI prose changes.

## Requirement trace (prepared before tasks)

Paths in this trace are repository-relative; task allowed-file lists below use absolute paths.

| Source | Exact behavior / stable contract | Owner / evidence | Tasks |
| --- | --- | --- | --- |
| FR-1 | Five exact IDs from requirements §1.4; Plan/Act strings survive protobuf and JSON round trips; default remains `gpt-5.2` | `src/shared/api.ts`, configuration converters, new shared tests, native provider | 2–4, 16–17, 22–23 |
| FR-2 | 1,050,000 context, 128,000 output ceiling; rate table; threshold inclusive at 272,000; per-response estimate | new `src/shared/openai-native-models.ts`, existing `src/utils/cost.ts` | 3–4, 16–17 |
| FR-3 | `OPENAI_RESPONSES`, stored HTTP responses, existing native-tool prerequisite; omit unsupported sampling and output-budget fields | `src/core/api/providers/openai-native.ts` | 1, 14, 17 |
| FR-4 | Early/deduplicated `response_id`, anchored incremental input, existing chain failure retry | provider and existing response-transform tests | 14, 17, 22–23 |
| FR-5 | Existing `NATIVE_GPT_5` variant, apply-patch, compact prompt and reduced environment; unchanged workflow schema override | model utilities, task, variant config files, tool spec | 5–13, 18, 22–23 |
| FR-6 | Provider compaction threshold 120,000 for new models; application auto-condense eligibility; resume | task, subagent, model utilities, provider | 5–6, 13–14, 18, 22–23 |
| FR-7 | Global six-value recognition and persistence; provider/model subsets; Astra saved `none` resolves to `low` without a storage write; unsupported values resolve to `medium` | storage types, profile, shared reasoning support, controller, native provider, selector and CLI | 2–3, 14–17, 19–20 |
| FR-8 | Inclusive output counted once; separate input/cache read/cache write; missing counts zero | provider usage, existing `updateApiReqMsg`/`getApiMetrics` | 14, 17, 22–23 |
| FR-9 | Standard rates and two tiers; fresh tier selection for each response; no repricing stored history | profile rates and provider calculator invocation | 3, 14, 17 |
| FR-10 | Other catalogs/defaults and request behavior retained; unextended requests and controls do not gain `max`; shared native usage correction is approved; CLI validation uses a declared build runner | native Chat Completions, compatible OpenAI, Codex, OpenRouter/Vercel transforms, shared selector, CLI, regression tests | 1, 5–23 |
| IR-1 | Existing `Model`, `Reasoning Effort`, `Reasoning Summary`; model-specific options in webview/CLI; CLI flag recognizes the global vocabulary; display names exactly from FR-1 table | existing controls, CLI helpers/help, catalog `name` fields | 3, 19–20 |
| IR-2 | No hardware/OS change | SDK 6.x selection and Node-20-compatible CLI build runner | 1, 21–22 |
| IR-3 | Existing credentials, HTTPS streaming, cancellation/errors; no new transport | native provider and shared `createOpenAIClient` | 1, 14, 17, 22 |
| IR-4 | Same capability/effort definition in backend/UI; compatible usage event shapes | shared profile and current API stream | 2–5, 14–20, 22 |
| NFR-1 | No added model lookup or billing API requests; incremental requests retained | static profile and native request builder | 3, 14, 17 |
| NFR-2 | Tool approvals and runtime progression unchanged | no handler/runtime mutation permitted | 18, 22–23 |
| NFR-3 | Existing key storage and networking; no secrets in fixtures | test key remains `test-api-key`; shared networking unchanged | 1, 17, 22–23 |
| NFR-4 | Explicit registry; source-backed values; regression evidence | shared profile tests and compliance matrix | 3, 16–23 |
| NFR-5 | No pro mode, hosted-tool feature, cache-breakpoint UI, or service-tier additions | allowed-file scope and request assertions | 14, 17, 22 |
| NFR-6 | Exact changes, validation and QA pause; separate documentation/implementation/live states | this plan | 1–23 |

No new prompt-template placeholder, workflow value, workflow route, artifact, or panel is introduced. Existing `Native Tool Call must be enabled in your setting for OpenAI Responses API` remains the prerequisite error. Task 19.4 prescribes the exact existing CLI help string with `|max` appended. Test fixture prose below is test input, not new product wording.

## Execution baseline

Working directory for commands: `/Users/robertboston/Documents/Cline Extension/cline`.

Before Task 1, capture `git status --short`, `git diff --name-only`, and `git ls-files --others --exclude-standard`. Save `git diff --binary` and copies of the two model-support documents to a fresh directory outside the repository for comparison. Preserve the existing dirty changes, especially `src/core/task/index.ts`, the prompt integration suite, and workflow runtime/module files. Existing dirty files are not authorization to modify them. Do not stage, commit, reset, or regenerate unrelated files.

The earlier execution saved `/private/tmp/cline-model-support-baseline-hrrh1wpn`, including a staged patch. At this revision, only `package.json` and `package-lock.json` are dirty before this plan edit; the earlier workflow changes are now part of the checkout baseline. Capture a fresh baseline on resume and retain the earlier snapshot for attribution. Do not assume that earlier staged changes are still uncommitted. Preserve the existing SDK delta; inspect it before deciding whether Task 1's install command needs to run again.

For each task: its allowed-file set is exclusive apart from checkbox changes to this plan. Test tasks may use their explicitly listed existing imports; production symbols introduced by earlier tasks must exist before those tests are added. An unexpected compile/runtime fallout is a stop condition, not permission to broaden a task.

## Tasks

### [x] 1. Upgrade the SDK

Requirement source: IR-2, IR-3, IR-4, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/package.json`
- `/Users/robertboston/Documents/Cline Extension/cline/package-lock.json`

Run `npm install --save-exact openai@6.49.0 --ignore-scripts` from the repository root. The only direct dependency revision is `dependencies.openai` from `^6.21.0` to `6.49.0`; retain the package manager's corresponding lockfile resolution and integrity changes. Do not change `engines`, webview dependencies, standalone lockfiles, or unrelated dependency versions. There are no source imports to change in this task.

Confirm `node -p "require('openai/version').VERSION"` prints `6.49.0`; `openai/package.json` is not an exported package subpath. Review the lockfile diff for unrelated churn and stop if it appears. The already-produced changes to `@smithy/hash-node`, `@smithy/signature-v4`, `@smithy/core`, and `@smithy/types` satisfy the SDK's newly declared optional peer constraints and their transitive dependencies; verify that relationship rather than treating those packages as arbitrary upgrades. Do not substitute 7.x or a floating `latest`.

### [x] 2. Extend the recognized reasoning-effort vocabulary

Requirement source: FR-7, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/storage/types.ts`

Replace the option declaration and retain its derived type:

```ts
export const OPENAI_REASONING_EFFORT_OPTIONS = ["none", "low", "medium", "high", "xhigh", "max"] as const
export type OpenaiReasoningEffort = (typeof OPENAI_REASONING_EFFORT_OPTIONS)[number]
```

Keep the guard signature `isOpenaiReasoningEffort(value: unknown): value is OpenaiReasoningEffort`; replace its body with `return OPENAI_REASONING_EFFORT_OPTIONS.some((allowed) => allowed === value)`. Delete the `value as OpenaiReasoningEffort` assertion. Strict comparison against the typed options performs validation without asserting the input's type. Leave the body and return type of `normalizeOpenaiReasoningEffort` unchanged: it lowercases input, preserves every recognized value including `max`, and returns `medium` for undefined, empty, or invalid input. Do not add a separate legacy effort type or change reasoning-summary definitions. No imports are required. Model support is enforced in Tasks 3.2, 14, 15 and 19, not in this global normalizer.

### [x] 3. Create the shared capability source

Requirement source: FR-1, FR-2, FR-5, FR-6, FR-7, FR-9, IR-4, NFR-1.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/openai-native-models.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/utils/reasoning-support.ts`

#### [x] 3.1. Define native profiles and exact typed lookup

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/openai-native-models.ts`

Create this module. Imports: `import type { OpenAiCompatibleModelInfo } from "./api"`, `import { ApiFormat } from "./proto/cline/models"`, and `import type { OpenaiReasoningEffort } from "./storage/types"`. The API import must remain type-only to avoid a runtime cycle when `api.ts` imports this module. Do not import the capability resolver back into the profile module.

Define and export:

```ts
export interface OpenAiNativeModelProfile {
  info: OpenAiCompatibleModelInfo
  reasoningEfforts: readonly OpenaiReasoningEffort[]
  gpt54Behavior: true
}
```

Define private `createModelInfo(name: string, inputPrice: number, outputPrice: number, cacheReadsPrice: number, cacheWritesPrice?: number): OpenAiCompatibleModelInfo`. Return an object with exactly: `name`, `maxTokens: 128_000`, `contextWindow: 1_050_000`, `supportsImages: true`, `supportsPromptCache: true`, `supportsReasoning: true`, `supportsReasoningEffort: true`, `supportsTools: true`, `apiFormat: ApiFormat.OPENAI_RESPONSES`, `systemRole: "developer"`, the three required price arguments, optional `cacheWritesPrice` only when supplied, and `tiers`. Do not set `temperature`.

`tiers` has two entries. First: `contextWindow: 272_000` and the supplied prices. Second: `contextWindow: Number.MAX_SAFE_INTEGER`, input/read/write prices multiplied by 2, output price multiplied by 1.5. Omit cache-write price in both tiers when absent. The finite upper bound preserves JSON serialization. No per-session state is stored.

Export `openAiNativeModelProfiles` as a literal object with these exact keys, each containing `info: createModelInfo(...)`, `reasoningEfforts`, and `gpt54Behavior: true`, and use `satisfies Record<string, OpenAiNativeModelProfile>`:

| Key | createModelInfo arguments | reasoningEfforts |
| --- | --- | --- |
| `gpt-5.5` | `"GPT-5.5", 5, 30, 0.5` | `["none", "low", "medium", "high", "xhigh"]` |
| `gpt-5.6-sol` | `"GPT-5.6 Sol", 4, 20, 0.4, 5` | `["none", "low", "medium", "high", "xhigh", "max"]` |
| `gpt-5.6-terra` | `"GPT-5.6 Terra", 2, 12, 0.2, 2.5` | `["none", "low", "medium", "high", "xhigh", "max"]` |
| `gpt-5.6-luna` | `"GPT-5.6 Luna", 0.2, 1.2, 0.02, 0.25` | `["none", "low", "medium", "high", "xhigh", "max"]` |
| `gpt-6-astra` | `"GPT-6 Astra", 10, 50, 1, 12.5` | `["low", "medium", "high", "xhigh", "max"]` |

After the literal profiles, define private `const profilesById: ReadonlyMap<string, OpenAiNativeModelProfile> = new Map<string, OpenAiNativeModelProfile>(Object.entries(openAiNativeModelProfiles))`. Export `getOpenAiNativeModelProfile(modelId: string, providerId: string): OpenAiNativeModelProfile | undefined` returning `providerId === "openai-native" ? profilesById.get(modelId) : undefined`. This lookup accepts a string without asserting that it is a catalog key and excludes inherited object property names. No substring, prefix, alias, or future-version acceptance. Do not create `resolveOpenAiNativeReasoningEffort`; Task 3.2 supplies the one shared resolver used by request builders and controls.

Export `extendedOpenAiNativeModels` as a literal five-key object whose values are the corresponding `.info` properties. Keep the five literal keys so `keyof` is a finite model-ID union; do not widen it to `Record<string, ...>` or derive it with untyped `Object.fromEntries`.

#### [x] 3.2. Define provider/model effort options and resolution

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/utils/reasoning-support.ts`

Keep existing `supportsReasoningEffortForModel` unchanged. Add `getOpenAiNativeModelProfile` from `../openai-native-models` and `{ normalizeOpenaiReasoningEffort, type OpenaiReasoningEffort }` from `../storage/types`.

Define private `const DEFAULT_MODEL_REASONING_EFFORTS: readonly OpenaiReasoningEffort[] = ["none", "low", "medium", "high", "xhigh"]`. This is the preserved application capability policy for provider/model pairs without an approved profile. Keep it explicit: deriving it by removing `max` from the global vocabulary would automatically expose future additions to unextended models.

Export `getModelReasoningEfforts(modelId: string, providerId: string): readonly OpenaiReasoningEffort[]` returning `getOpenAiNativeModelProfile(modelId, providerId)?.reasoningEfforts ?? DEFAULT_MODEL_REASONING_EFFORTS`.

Export `resolveModelReasoningEffort(modelId: string, providerId: string, effort?: string): OpenaiReasoningEffort`. Set `normalizedEffort = normalizeOpenaiReasoningEffort(effort)`. If `providerId === "openai-native" && modelId === "gpt-6-astra" && normalizedEffort === "none"`, return `low`. Otherwise return `getModelReasoningEfforts(modelId, providerId).find((allowed) => allowed === normalizedEffort) ?? "medium"`. Return the typed array member; do not cast the input. Thus globally valid `max` remains stored, but resolves to `medium` for unextended pairs. No settings writes, provider exposure, or reasoning-enabled decision occurs here. Existing request omission and UI visibility gates remain with their current owners.

### [x] 4. Expose the five catalog entries

Requirement source: FR-1, FR-2, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/api.ts`

Add `import { extendedOpenAiNativeModels } from "./openai-native-models"`. Add `...extendedOpenAiNativeModels` as the first member of `openAiNativeModels`. Retain `as const satisfies Record<string, OpenAiCompatibleModelInfo>` and the existing `OpenAiNativeModelId` derivation. Retain `openAiNativeDefaultModelId = "gpt-5.2"`. Do not change any existing entry, other catalog, model interface, or default. No dead imports result.

### [x] 5. Make classification consume provider-scoped capabilities

Requirement source: FR-5, FR-6, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/utils/model-utils.ts`

Import `getOpenAiNativeModelProfile` from `@/shared/openai-native-models`. Keep `isGPT5ModelFamily` unchanged. Add exported `isGptPromptModel(id: string, providerId?: string): boolean` returning `isGPT5ModelFamily(id) || getOpenAiNativeModelProfile(id, providerId ?? "")?.gpt54Behavior === true`.

Change `isNextGenModelFamily(id: string)` to `isNextGenModelFamily(id: string, providerId?: string)`. Keep its existing normalized predicates and prepend `getOpenAiNativeModelProfile(id, providerId ?? "")?.gpt54Behavior === true` to the OR expression. In `isNativeToolCallingConfig`, pass `providerInfo.providerId` to `isNextGenModelFamily(modelId, providerInfo.providerId)`. Keep the setting/provider guards and parallel-calling function intact; parallel eligibility already delegates to native eligibility. No existing export is deleted. Calls omitting providerId retain old behavior.

### [x] 6. Route parent prompt and context gates through capabilities

Requirement source: FR-5, FR-6, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

Replace the `isGPT5ModelFamily` named import from `@utils/model-utils` with `isGptPromptModel`. In `shouldUseMinimalGptPrompt`, return `isGptPromptModel(providerInfo.model.id, providerInfo.providerId)`. Set `useReducedEnvironmentDetails` with `isGptPromptModel(this.getCurrentProviderInfo().model.id, this.getCurrentProviderInfo().providerId)`.

For both existing `isNextGenModelFamily(this.api.getModel().id)` calls (the `getNewContextMessagesAndMetadata` argument and the `useAutoCondense` branch), add `this.getCurrentProviderInfo().providerId` as the second argument. No other task-loop, workflow, usage, prompt wording, or persistence revision. Preserve the user's existing diff in this file.

### [x] 7. Extend the native-gpt-5 matcher

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`

Replace the `isGPT5ModelFamily` import with `isGptPromptModel`; replace the one matcher call with `isGptPromptModel(modelId, providerInfo.providerId)`. Retain the native-tools switch, provider guard, chat exclusion, and any GPT-5.1/GPT-5.2 exclusions exactly. Do not change tags, descriptions, enum names, components, tools, or template overrides. Remove no other import.

### [x] 8. Extend the gpt-5 matcher

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`

Replace the `isGPT5ModelFamily` import with `isGptPromptModel`; replace the one matcher call with `isGptPromptModel(modelId, providerInfo.providerId)`. Retain the native-tools switch, provider guard, chat exclusion, and any GPT-5.1/GPT-5.2 exclusions exactly. Do not change tags, descriptions, enum names, components, tools, or template overrides. Remove no other import.

### [x] 9. Keep native generic selection disjoint

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`

Replace imported `isGPT5ModelFamily` with `isGptPromptModel`. Return `!isGptPromptModel(modelId, providerInfo.providerId) && isNextGenModelFamily(modelId, providerInfo.providerId)` from the existing final matcher expression. Keep remaining configuration unchanged.

### [x] 10. Preserve non-native next-generation fallback

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`

Replace imported `isGPT5ModelFamily` with `isGptPromptModel`. Add `providerInfo.providerId` as second argument to both `isNextGenModelFamily` calls. Replace the final GPT exclusion predicate with `isGptPromptModel(modelId, providerInfo.providerId)`. Preserve the early non-native branch and its order; do not redesign matcher priority or change templates.

### [x] 11. Exclude newly recognized native models from generic fallback

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`

Pass `providerInfo.providerId` as the second argument in its single `isNextGenModelFamily(modelId)` call. No import changes. Preserve local, GLM, Trinity, and missing-provider handling.

### [x] 12. Retain apply-patch eligibility

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/apply_patch.ts`

Replace imported `isGPT5ModelFamily` with `isGptPromptModel`. In `NATIVE_GPT_5.contextRequirements`, use `isGptPromptModel(context.providerInfo.model.id, context.providerInfo.providerId)` before the unchanged GPT-OSS OR branch. Preserve `GPT_5` spread inheritance, both exported variants, parameter names, required fields, and the entire tool description.

### [x] 13. Pass provider identity through child context eligibility

Requirement source: FR-6, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

#### [x] 13.1. Update child eligibility signature

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

In `SubagentRunner.ts`, append required parameter `providerId: string` to `shouldCompactBeforeNextRequest`. Pass it as the second argument to `isNextGenModelFamily(modelId, providerId)`. At its single production call, append `providerInfo.providerId` after `providerInfo.model.id`. Preserve threshold calculation, `buildPromptContext`, and child workflow handling. No import changes.

#### [x] 13.2. Update the reflected signature and spy

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

In the test file, append `providerId: string` to `ShouldCompactBeforeNextRequest` and to the `shouldCompactSpy` function's parameters in the existing request-total-token test. Forward it in `shouldCompactBeforeNextRequest.call(this, previousRequestTotalTokens, api, modelId, providerId)`. Retain its assertion that `previousRequestTotalTokens` equals 23. No fixture or import changes. These two changes are the entire signature fallout.

### [x] 14. Adapt native Responses reasoning, compaction and usage

Requirement source: FR-3, FR-4, FR-6, FR-7, FR-8, FR-9.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai-native.ts`

#### [x] 14.1. Resolve native reasoning

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai-native.ts`

Import `getOpenAiNativeModelProfile` from `@/shared/openai-native-models` and `resolveModelReasoningEffort` from `@/shared/utils/reasoning-support`. Remove `normalizeOpenaiReasoningEffort` from the storage import, retaining `normalizeOpenaiReasoningSummary`; remove the now-unused `ChatCompletionReasoningEffort` import after replacing both assertions below.

In `buildResponseCreateParams`, derive `profile = getOpenAiNativeModelProfile(args.modelId, "openai-native")` and `requestedEffort = resolveModelReasoningEffort(args.modelId, "openai-native", this.options.reasoningEffort)`. Set `reasoning` undefined only when `!profile && requestedEffort === "none"`; otherwise construct the existing effort/optional summary object using `requestedEffort` directly. In `createCompletionStream`, derive `requestedEffort = resolveModelReasoningEffort(model.id, "openai-native", this.options.reasoningEffort)` and retain the existing `includeReasoning && requestedEffort !== "none"` inclusion condition, passing `requestedEffort` directly. SDK 6.49 accepts the recognized union; neither request path requires an effort assertion. Preserve every other request field, routing decision, and omission of sampling/output-budget fields. Older native models keep their five-value policy and `none` omission on both paths.

#### [x] 14.2. Enable registered-model compaction

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai-native.ts`

Change the compaction early-return condition to `!isGPT5ModelFamily(modelId) && !getOpenAiNativeModelProfile(modelId, "openai-native")?.gpt54Behavior`. Retain the threshold calculation and `{ type: "compaction", compact_threshold }` result.

#### [x] 14.3. Correct completed-response usage

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai-native.ts`

Inside the existing narrowed `response.completed` + defined-usage branch, replace zero cache-write tokens with `usage.input_tokens_details?.cache_write_tokens || 0`. Delete `reasoningTokens` and `totalOutputTokens`. Pass `outputTokens` to `calculateApiCostOpenAI` and emit `outputTokens` in the usage chunk. Retain non-cached input subtraction, response ID, total-token logging, and the remaining chunk shape. No stream union change, repricing state, Chat Completions accounting change, retry rewrite, or added API call.

### [x] 15. Preserve persistence and constrain existing-provider requests

Requirement source: FR-7, FR-10, IR-4.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai-codex.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/transform/openrouter-stream.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/transform/vercel-ai-gateway-stream.ts`

#### [x] 15.1. Verify the existing persistence path

Allowed files / full targets:

- None (read-only verification of `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/state/reasoningEffort.ts`).

Confirm the controller normalizer already calls `isOpenaiReasoningEffort` for recognized strings and `normalizeOpenaiReasoningEffort` for other strings. Task 2 makes those branches preserve `max`/`MAX`. Retain the existing numeric protobuf enum cases. Do not add a `max` special case, change the function, or add a protobuf enum: Plan/Act settings already carry string values. Task 16 verifies this unchanged production path.

#### [x] 15.2. Constrain compatible OpenAI requests

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai.ts`

Remove only `normalizeOpenaiReasoningEffort` from the storage import; retain `normalizeOpenaiReasoningSummary`. Import `resolveModelReasoningEffort` from `@/shared/utils/reasoning-support`. In `OpenAiHandler.createMessage`, replace the effort-normalizer call inside the existing reasoning-model branch with `resolveModelReasoningEffort(modelId, "openai", this.options.reasoningEffort)`, using the existing `modelId` local. Preserve the branch predicate, summary handling and `none` omission. No method signature or caller changes.

#### [x] 15.3. Constrain Codex requests

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai-codex.ts`

Remove only `normalizeOpenaiReasoningEffort` from the storage import; retain `normalizeOpenaiReasoningSummary`. Import `resolveModelReasoningEffort` from `@/shared/utils/reasoning-support`. In `OpenAiCodexHandler.buildRequestBody`, replace the effort-normalizer call with `resolveModelReasoningEffort(model.id, "openai-codex", this.options.reasoningEffort)`. Preserve summary handling, `none` omission, model catalog, authentication and request transport. No method signature or caller changes.

#### [x] 15.4. Constrain OpenRouter request transformation

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/transform/openrouter-stream.ts`

Replace the `normalizeOpenaiReasoningEffort` import with `resolveModelReasoningEffort` from `@/shared/utils/reasoning-support`. Replace the existing normalization expression with `reasoningEffort !== undefined ? resolveModelReasoningEffort(model.id, "openrouter", reasoningEffort) : undefined`. Retain the distinction between absent effort and default effort, `none` omission, the reasoning-support predicate, and thinking-budget precedence. The transform's other callers inherit the same preserved five-value policy; do not change its signature or their request construction.

#### [x] 15.5. Constrain Vercel request transformation

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/transform/vercel-ai-gateway-stream.ts`

Replace the `normalizeOpenaiReasoningEffort` import with `resolveModelReasoningEffort` from `@/shared/utils/reasoning-support`. Replace the existing normalization expression with `reasoningEffort !== undefined ? resolveModelReasoningEffort(model.id, "vercel-ai-gateway", reasoningEffort) : undefined`. Preserve absent effort, `none` omission, the reasoning-support predicate, and thinking-budget precedence. No transform signature or caller changes.

### [x] 16. Test capabilities, effort resolution and persistence

Requirement source: FR-1, FR-2, FR-7, FR-10, IR-4.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/__tests__/openai-native-models.test.ts`

Create a Mocha/Chai test module importing `expect` from `chai`, `describe`/`it` from `mocha`, `openAiNativeModels`, `openAiNativeDefaultModelId`, `openAiCodexModels` from `../api`, `openAiNativeModelProfiles` and `getOpenAiNativeModelProfile` from `../openai-native-models`, `OPENAI_REASONING_EFFORT_OPTIONS`, `isOpenaiReasoningEffort` and `normalizeOpenaiReasoningEffort` from `../storage/types`, `getModelReasoningEfforts` and `resolveModelReasoningEffort` from `../utils/reasoning-support`, the controller normalizer as `normalizeStoredEffort` from `@/core/controller/state/reasoningEffort`, `ApiFormat` from `../proto/cline/models`, and both `convertApiConfigurationToProto` and `convertProtoToApiConfiguration` from `../proto-conversions/models/api-configuration-conversion`.

Use literal `MODEL_IDS = ["gpt-5.5", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"] as const`. Add these named tests inside `describe("OpenAI native model profiles", ...)`:

- `registers exactly the approved native models`: assert profile keys exactly equal MODEL_IDS; every native catalog entry equals the profile info; each has context 1050000, maxTokens 128000, `OPENAI_RESPONSES`, true image/cache/reasoning/tools support; default is `gpt-5.2`; old GPT-5.4 and mini remain; subscription catalog has none of the five additions.
- `uses JSON-safe per-response price tiers`: use the literal price tuples from Task 3 as expectations; check both tier objects and that JSON round-trip retains the upper boundary as `Number.MAX_SAFE_INTEGER`. Do not assert Infinity for these new entries.
- `limits profiles to exact native provider IDs`: each ID resolves for `openai-native`, not `openai`, `openai-codex`, or `openrouter`; `gpt-6`, `gpt-6-mini`, `gpt-7`, `gpt-6-astra-extra`, `toString`, and `__proto__` resolve undefined.
- `recognizes the complete effort vocabulary`: options equal `["none","low","medium","high","xhigh","max"]`; the guard accepts each value and rejects `MAX`, `invalid`, undefined, null, 0 and `{}`. Normalization preserves each value, maps `MAX` to `max`, and maps undefined, empty string and `invalid` to `medium`.
- `resolves only supported native efforts`: for each literal ID assert `getModelReasoningEfforts(id,"openai-native")` equals the exact FR-7 list; every supported effort resolves to itself through `resolveModelReasoningEffort(id,"openai-native",effort)`; Astra `none` and `NONE` resolve to `low`; GPT-5.5 `max` resolves to `medium`; undefined, empty string, and `invalid` resolve to `medium`; uppercase `MAX` resolves to `max` on 5.6/Astra.
- `preserves unextended provider and model capabilities`: for native IDs `gpt-5.4-2026-03-05`, `gpt-5.4-mini-2026-03-17`, `gpt-5.2`, and unknown `gpt-7`, and for each new ID with providers `openai`, `openai-codex`, `openrouter`, `vercel-ai-gateway`, `cline`, `gemini`, and `vertex`, options equal `["none","low","medium","high","xhigh"]`. All five resolve unchanged; `max`, `MAX`, and `invalid` resolve to `medium`. Global normalization still preserves `max`. Non-native Astra `none` stays `none`.
- `round trips model IDs and saved efforts without applying model fallback`: for each ID, use configuration `{ planModeApiProvider: "openai-native", actModeApiProvider: "openai-native", planModeApiModelId: id, actModeApiModelId: id, planModeReasoningEffort: "max", actModeReasoningEffort: "none" }`. Convert to protobuf, JSON stringify/parse, convert back; assert both model IDs and both effort strings remain unchanged. Assert `normalizeStoredEffort("max")` and `normalizeStoredEffort("MAX")` return `max`; the numeric enum constants LOW/MEDIUM/HIGH must resolve to low/medium/high respectively (import the enum as `ProtoOpenaiReasoningEffort` from `../proto/cline/state`). For Astra, resolve the restored Act setting to `low`, then assert the restored setting is still `none`.

Use explicit equality/undefined assertions. No new schema, persisted key, or snapshot.

### [x] 17. Verify request, stream, cost and usage propagation

Requirement source: FR-1–FR-4, FR-6–FR-10, IR-3.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/reasoning-effort-compatibility.test.ts`

#### [x] 17.1. Replace the additive-reasoning assertion

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Repair the existing test named `should include reasoning tokens in Responses API output usage totals`: rename it `counts inclusive Responses output tokens once`; change its `reasoning_tokens` from 70 to 20 and `total_tokens` from 220 to 150; retain `output_tokens: 30`, input 120, cached 20. Change the emitted output assertion from 100 to 30. Keep the input/cache assertions. No old assertion of additive reasoning remains.

#### [x] 17.2. Add request and continuity coverage

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Add `import { strict as assert } from "node:assert"` and `import type OpenAI from "openai"`; import `openAiNativeModels` from `@/shared/api`, `calculateApiCostOpenAI` from `@/utils/cost`, `getApiMetrics`/`getLastApiReqTotalTokens` from `@/shared/getApiMetrics`, `updateApiReqMsg` from `@/core/task/utils`, and `type MessageStateHandler` from `@/core/task/message-state`. Import `type ClineMessage` from `@/shared/ExtensionMessage`. Existing `sinon`, `Logger`, handler, and `createAsyncIterable` remain. Add literal MODEL_IDS from Task 16 locally (no test-to-test import). The OpenAI import is type-only and supplies `OpenAI.Responses.ResponseInputItem` for the prescribed union narrowing; it emits no runtime dependency.

Within the existing describe/afterEach scope, define `readTool: ChatCompletionTool[] = [{ type: "function", function: { name: "read_file", description: "Read a file", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false } } }]`; add `import type { ChatCompletionTool } from "openai/resources/chat/completions"`. Define `collect = async (stream: ApiStream): Promise<ApiStreamChunk[]>` by pushing each yielded chunk; import both types from `../../transform/stream`. For accessing private methods, use the existing test convention `(handler as any)` only at the method/stub boundary; use stream discriminants for public chunks.

For each MODEL_IDS entry create a fresh handler with `{ openAiNativeApiKey: "test-api-key", apiModelId: id }`. Stub `ensureClient` to `{ responses: { create: createStub } }` and `useWebsocketMode` to false. Add parameterized tests with names prefixed by the ID:

- `uses stored HTTP Responses and the selected model`: createStub returns empty async iterable. Drain `createMessage("system", [{role:"user",content:"hi"}], readTool)`. Assert handler ID and request model equal id, store/stream true, instructions `system`, tools contain one function named `read_file` with `strict: true` and the exact input schema; context_management equals `[{type:"compaction",compact_threshold:120000}]`. Assert absent keys `temperature`, `top_p`, `top_logprobs`, `include`, `max_output_tokens`, `service_tier`, `prompt_cache_options`, `previous_response_id`. Assert one request.
- `enforces native tools`: use `await assert.rejects(() => collect(handler.createMessage("system", [{role:"user",content:"hi"}], undefined)), {message:"Native Tool Call must be enabled in your setting for OpenAI Responses API"})`; assert createStub not called.
- `transmits model-supported effort`: call `buildResponseCreateParams` with `{ modelId:id, modelInfo:handler.getModel().info, systemPrompt:"system", input:[], tools:[], store:true }` on handlers configured with each FR-7 effort plus `none`, `max`, and `invalid`. Assert `.reasoning.effort` is the supported value, Astra-none low, GPT-5.5-max medium, invalid medium. For summary `none`, assert no summary property; default summary is `auto`. Do not assert effort by calling the resolver under test to compute expectations.
- `continues an interrupted tool turn from its early response ID`: first stream has `response.created` and `response.in_progress`, both `{response:{id:"resp_early"}}`; then `response.output_item.added` with `{item:{type:"function_call",id:"fc_1",call_id:"call_1",name:"read_file",arguments:""}}`; then `response.function_call_arguments.delta` with `{item_id:"fc_1",delta:'{"path":"README.md"}'}`. No completion event. Assert exactly one response_id chunk with `resp_early`, before the first tool_calls chunk. Configure `createStub.onFirstCall().resolves(createAsyncIterable(firstEvents))` with the preceding events and `createStub.onSecondCall().resolves(createAsyncIterable([]))`. Next request uses history `[{role:"user",content:"hi"},{role:"assistant",id:"resp_early",modelInfo:{providerId:"openai-native",modelId:id,mode:"act"},content:[{type:"tool_use",id:"fc_1",call_id:"call_1",name:"read_file",input:{path:"README.md"}}]},{role:"user",content:[{type:"tool_result",tool_use_id:"fc_1",call_id:"call_1",content:"file contents"}]}]`, annotated `ClineStorageMessage[]` (import from `@/shared/messages/content`). Assert request has previous_response_id `resp_early`, includes function_call_output with call_id `call_1` and output `file contents`, and contains no replayed original `hi` input or function_call item. Narrow ResponseInput items by `type` before union-specific access.
- `retains broken-chain recovery`: in a separate test with a fresh handler/stub and the exact three-message history above, configure `createStub.onFirstCall().rejects({code:"previous_response_not_found",message:"missing response chain",status:404})`, then `createStub.onSecondCall().resolves(createAsyncIterable([]))`. Drain one `createMessage("system", history, readTool)` invocation. Assert exactly two calls, first anchored, second without previous_response_id, second containing original `hi` input and matching tool call/output. Preserve existing logged fallback behavior.
- `emits compaction for the selected model`: return `{type:"response.output_item.done",item:{type:"compaction",id:"cmp_1",encrypted_content:"encrypted"}}`; assert one `{type:"context_compacted",id:"cmp_1"}` chunk.

#### [x] 17.3. Verify persisted usage categories

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Add `preserves cached reads and writes through persisted request metrics` for `gpt-5.6-sol`: stream one `response.completed` with response id `resp_usage`, usage `{input_tokens:1000,input_tokens_details:{cached_tokens:200,cache_write_tokens:300},output_tokens:100,output_tokens_details:{reasoning_tokens:70},total_tokens:1100}`. Find the usage chunk; throw if absent or wrong discriminant. Assert input 500, read 200, write 300, output 100, and totalCost within 1e-12 of **0.00558**.

Use `messages: ClineMessage[] = [{ts:1,type:"say",say:"api_req_started",text:'{"request":"test"}'}]`. Stub MessageStateHandler using only `getClineMessages: () => messages` and async `updateClineMessage(index: number, patch: Partial<ClineMessage>)` merging that patch into messages[index], cast through `unknown as MessageStateHandler` at this fixture boundary. Call `updateApiReqMsg({messageStateHandler, lastApiReqIndex:0, inputTokens:usage.inputTokens, outputTokens:usage.outputTokens, cacheWriteTokens:usage.cacheWriteTokens ?? 0, cacheReadTokens:usage.cacheReadTokens ?? 0, totalCost:usage.totalCost, api:handler})`, where `usage` is the narrowed chunk and `messageStateHandler` is the fixture. JSON round-trip messages; assert persisted `tokensIn:500`, `tokensOut:100`, `cacheReads:200`, `cacheWrites:300`, and cost .00558. Assert `getApiMetrics` returns `{totalTokensIn:500,totalTokensOut:100,totalCacheReads:200,totalCacheWrites:300,totalCost:usage.totalCost}` and `getLastApiReqTotalTokens` returns 1100. No production persistence change is required.

#### [x] 17.4. Verify tier boundaries and independent estimates

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Add `uses independent per-response cost tiers`: literal rows `[id,inputRate,readRate,writeRate,outputRate]` are `["gpt-5.5",5,.5,0,30]`, `["gpt-5.6-sol",4,.4,5,20]`, `["gpt-5.6-terra",2,.2,2.5,12]`, `["gpt-5.6-luna",.2,.02,.25,1.2]`, `["gpt-6-astra",10,1,12.5,50]`. Declare the rows `as const` to preserve the model-key union. Call `calculateApiCostOpenAI(openAiNativeModels[id], totalInput, 100, writes, 1000)`. For total input 271999/272000/272001 and output 100, cached reads 1000, writes 0 for GPT-5.5 or 2000 otherwise, assert calculated cost within 1e-12 of `((totalInput-1000-writes)*inputRate*inputMultiplier + 1000*readRate*inputMultiplier + writes*writeRate*inputMultiplier + 100*outputRate*outputMultiplier)/1_000_000`; multipliers are exactly 1/1 for the first two values, 2/1.5 for the third. Then calculate a 1000-input/100-output/no-cache response and assert `(1000*inputRate+100*outputRate)/1_000_000`, independent of the preceding high-tier call. This verifies total-input tier selection, including cache usage, and approved estimate reset semantics.

#### [x] 17.5. Verify absent optional usage

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Add `defaults missing optional cache usage to zero`: completed event for Astra with usage `{input_tokens:10,output_tokens:5,total_tokens:15}`; assert input10/output5/read0/write0 and finite cost .00035. Retain existing tests for argument deduplication, GPT-5.4 retries, early IDs, and summary handling.

#### [x] 17.6. Protect older native request paths

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Using the handler, collector, tool fixture and empty-stream stubs from Task 17.2, add parameterized tests named `preserves older native reasoning requests` for `gpt-5.4-2026-03-05`, `gpt-5.4-mini-2026-03-17`, and `gpt-5.2`. For each ID, use literal input/expected pairs `max`/`medium`, `MAX`/`medium`, `invalid`/`medium`, `xhigh`/`xhigh`, and `none`/omitted. Configure both `responses.create` and `chat.completions.create` on the test client, each returning an empty async iterable; drain `createMessage("system", [{role:"user",content:"hi"}], readTool)`. Assert GPT-5.4/main-mini invoke only Responses, with the expected `reasoning.effort` or no reasoning object; GPT-5.2 invokes only Chat Completions, with the expected `reasoning_effort` or undefined. Verify saved handler input options retain their original effort string. No production changes in this task.

#### [x] 17.7. Protect other providers at request construction

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/reasoning-effort-compatibility.test.ts`

Create a Mocha module importing `strict as assert` from `node:assert`, `describe`/`it`/`afterEach` from `mocha`, default `sinon` from `sinon`, default `OpenAI` from `openai`, `OpenAiHandler` from `../openai`, `OpenAiCodexHandler` from `../openai-codex`, `createOpenRouterStream` from `../../transform/openrouter-stream`, and `createVercelAIGatewayStream` from `../../transform/vercel-ai-gateway-stream`. Define `async function* emptyStream(): AsyncGenerator<never> {}` and restore Sinon after each test. Use `sinon.stub().resolves(emptyStream())` as a request spy, a fresh `new OpenAI({apiKey:"test-api-key"})` per case, and `Reflect.set` to install the spy on the client's `responses.create` or `chat.completions.create`; these fixtures never call a live API.

Define `assertEffort(payload: unknown, expected: string | undefined): void`: use `assert.ok(typeof payload === "object" && payload !== null)` before `"reasoning" in payload`. When expected is undefined, assert `!("reasoning" in payload) || payload.reasoning === undefined`; otherwise assert that the property exists, is a non-null object, has `effort`, and that `payload.reasoning.effort === expected`. This narrows actual requests without asserting a desired effort type. Inspect the spy's first argument through this helper and assert exactly one request.

- `preserves compatible OpenAI reasoning requests`: instantiate `OpenAiHandler` with `{openAiApiKey:"test-api-key",openAiModelId:"gpt-5.4-2026-03-05",reasoningEffort:effort}`, install the test client with `Reflect.set(handler,"client",client)`, and exhaust `handler.createMessage("system",[{role:"user",content:"hi"}])`. Capture `responses.create`. Literal pairs are `max`/`medium`, `MAX`/`medium`, `invalid`/`medium`, `xhigh`/`xhigh`, and `none`/omitted.
- `preserves Codex reasoning requests`: instantiate `OpenAiCodexHandler` with `{apiModelId:"gpt-5.3-codex",reasoningEffort:effort}`. Retrieve `buildRequestBody` with `Reflect.get`, assert `typeof method === "function"`, and call `method.call(handler,handler.getModel(),[],"system")`; pass its result to `assertEffort`. Use the same five literal pairs. This private request-builder test avoids OAuth and transport; do not weaken production visibility or change its signature.
- `preserves gateway reasoning requests`: for both transforms, call the real transform with the test client, `"system"`, `[{role:"user",content:"hi"}]`, `{id:"openai/gpt-5.6-sol",info:{supportsPromptCache:false}}`, and the input effort. Capture `chat.completions.create`. Use the same five pairs plus undefined/omitted. Assert `include_reasoning` is false for `none`, true for the other inputs, and that the model ID is unchanged. The provider-qualified new model name must not activate native `max` support.

Expectations are literals; do not use the resolver under test to calculate expected values. Existing provider/transform suites in V1 retain coverage of thinking budgets and other request fields.

### [x] 18. Test prompt classification and workflow schema parity

Requirement source: FR-5, FR-6, FR-10, NFR-2.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/openai-native-models.test.ts`

Create tests importing `expect` from `chai`, `describe`/`it` from `mocha`, `getSystemPrompt`/`PromptRegistry` from `../index`, `type SystemPromptContext` from `../types`, `type ClineToolSpec` from `../spec`, `openAiNativeModels` from `@/shared/api`, `ModelFamily` from `@/shared/prompts`, `ClineDefaultTool` from `@/shared/tools`, and `{ isGptPromptModel, isNextGenModelFamily, isNativeToolCallingConfig }` from `@/utils/model-utils`.

Define `makeContext(id: keyof typeof openAiNativeModels): SystemPromptContext` returning `{cwd:"/test/project",ide:"TestIde",isTesting:true,providerInfo:{providerId:"openai-native",model:{id,info:openAiNativeModels[id]},mode:"act"},enableNativeToolCalls:true,useMinimalGptPrompt:isGptPromptModel(id,"openai-native"),supportsBrowserUse:false,clineWebToolsEnabled:false,subagentsEnabled:false}`. MODEL_IDS is the exact literal array in Task 16. Capture the baseline with `makeContext("gpt-5.4-2026-03-05")`.

- `selects the GPT-5.4 native family for every addition`: `PromptRegistry.getInstance().getModelFamily(context)` for each profile context returns `ModelFamily.NATIVE_GPT_5`; compact flag true; native eligibility true when enabled and false when disabled; next-gen eligibility true with native provider. Assert GPT-5.1 and GPT-5.2 remain `NATIVE_GPT_5_1` using minimal model info `{supportsPromptCache:true}` for ID fixtures.
- `preserves provider boundaries`: Astra with provider `openai`, `openai-codex`, or `openrouter` gives false from the new prompt predicate and next-gen predicate, while native Astra gives true. `gpt-7` remains false even for native. Existing `gpt-5.4-2026-03-05` remains true for existing GPT-5-compatible providers.
- `matches the baseline native tool schema`: generate baseline and each new model's prompt sequentially (the registry carries mutable nativeTools); assert nonempty prompt and deep-equal tools to the captured baseline. Assert returned function tool names include `apply_patch` and `read_file`. Extract names only after `"function" in tool` with non-null function or `"name" in tool` with a string name; do not blindly access union fields.
- `retains workflow tool overrides on full and continuation turns`: define `workflowToolSchemaOverride: readonly ClineToolSpec[]` with one spec `{variant:ModelFamily.NATIVE_GPT_5,id:ClineDefaultTool.FILE_READ,name:"read_file",description:"Read a file",parameters:[{name:"path",required:true,instruction:"Path to the file"}]}`. For baseline and every new model generate contexts with `activeWorkflowName:"document-project"`, `activeWorkflowStepNumber:2`, that override, and `isContinuationTurn` false then true. Assert nonempty system prompt, exactly one projected native function `read_file`, required schema field `path`, and equality of the resulting tool schema to baseline for the corresponding turn kind. Assert no `apply_patch` in this restricted tool surface. Do not assert exact editable workflow prose.

No prompt placeholder is introduced by this update. Retain the existing full integration suite's workflow-value/raw-placeholder negative assertions unchanged and execute that suite in V1; do not replace them with snapshots or regenerate baselines.

### [x] 19. Connect reasoning controls to shared resolution

Requirement source: FR-7, FR-10, IR-1, IR-4.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/settings/ReasoningEffortSelector.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/utils/reasoning-effort.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/components/SettingsPanelContent.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/index.ts`

#### [x] 19.1. Resolve the shared webview control by provider and model

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/settings/ReasoningEffortSelector.tsx`

Keep `ReasoningEffortSelectorProps` unchanged. Remove `isOpenaiReasoningEffort` and `OPENAI_REASONING_EFFORT_OPTIONS` from the storage import; retain `Mode` and `OpenaiReasoningEffort` as type imports. Import `getModelReasoningEfforts` and `resolveModelReasoningEffort` from `@shared/utils/reasoning-support`; add `normalizeApiConfiguration` to the existing `./utils/providerUtils` import. Destructure `allowedEfforts` without a default.

After `modeFields`, derive `{selectedProvider, selectedModelId} = normalizeApiConfiguration(apiConfiguration, currentMode)`, `supportedEfforts = getModelReasoningEfforts(selectedModelId, selectedProvider)`, and `effectiveAllowedEfforts = allowedEfforts ? supportedEfforts.filter((effort) => allowedEfforts.includes(effort)) : supportedEfforts`. The existing optional list can restrict the model's options, never expand them. Derive `resolvedEffort = resolveModelReasoningEffort(selectedModelId, selectedProvider, modeFields.reasoningEffort)` and `selectedEffort = effectiveAllowedEfforts.find((effort) => effort === resolvedEffort) ?? "medium"`. Render options from `effectiveAllowedEfforts` instead of `allowedEfforts`.

Keep labels, description, capitalization, `onValueChange`, and component export unchanged. No effect or render path may write an effective fallback to settings. Existing native, compatible OpenAI, Codex, OpenRouter, Cline, Vercel, Gemini and Vertex screens already use this shared control; their current visibility gates and invocation props remain unchanged. Do not add a resolver prop or edit `OpenAINative.tsx`.

#### [x] 19.2. Define testable CLI effort parsing and cycling

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/utils/reasoning-effort.ts`

Create this module importing `isOpenaiReasoningEffort`, `OPENAI_REASONING_EFFORT_OPTIONS` and `type OpenaiReasoningEffort` from `@shared/storage/types`, and `getModelReasoningEfforts`/`resolveModelReasoningEffort` from `@shared/utils/reasoning-support`.

Export `normalizeCliReasoningEffort(value: string | undefined, warn: (message: string) => void): OpenaiReasoningEffort | undefined`. Move the existing CLI entrypoint parser's behavior into it: return undefined for undefined; lowercase input; return recognized values via the global guard; otherwise call `warn` with exactly ``Invalid --reasoning-effort '${value}'. Using 'medium'. Valid values: ${OPENAI_REASONING_EFFORT_OPTIONS.join(", ")}.`` and return `medium`. Recognition preserves `max` independent of the active model; request resolution happens later.

Export `nextReasoningEffort(current: OpenaiReasoningEffort, modelId: string, providerId: string): OpenaiReasoningEffort`. Set `options = getModelReasoningEfforts(modelId, providerId)`, `effective = resolveModelReasoningEffort(modelId, providerId, current)` and `index = options.indexOf(effective)`. Return `options[(index + 1) % options.length] ?? "medium"`. This advances from the displayed effective value and wraps within the model's supported options. Both helpers are pure apart from the injected warning callback; no state imports or writes.

#### [x] 19.3. Use model capabilities in CLI settings

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/components/SettingsPanelContent.tsx`

Remove only `OPENAI_REASONING_EFFORT_OPTIONS` from the storage import. Retain `isOpenaiReasoningEffort`, `OpenaiReasoningEffort`, and the existing local `normalizeReasoningEffort(value: unknown)` with its `low` initialization fallback. Delete the local `nextReasoningEffort` function; import its replacement from `../utils/reasoning-effort` and import `resolveModelReasoningEffort` from `@shared/utils/reasoning-support`.

Extend the existing model-ID `useMemo` return and destructuring with `actReasoningProviderId` and `planReasoningProviderId`: return `actProvider ?? ""` and `planProvider ?? ""` respectively, retaining the existing Plan-provider fallback to Act. Include both fields as empty strings in the early return. Preserve model-key lookup and existing memo dependencies.

After that memo, derive `effectiveActReasoningEffort = resolveModelReasoningEffort(actModelId, actReasoningProviderId, actReasoningEffort)` and `effectivePlanReasoningEffort = resolveModelReasoningEffort(planModelId, planReasoningProviderId, planReasoningEffort)`. In the settings-items memo use those effective values for the two Act effort rows and the one Plan effort row, and replace the corresponding raw-effort entries in that memo's dependency list with the effective values. Preserve reasoning-control visibility and all other rows.

In `handleAction`'s existing `cycle` branch, derive `modelId` and `providerId` from the target mode's model/provider locals and call `setReasoningEffortForMode(targetMode, nextReasoningEffort(currentEffort, modelId, providerId))`. Add `actModelId`, `planModelId`, `actReasoningProviderId`, and `planReasoningProviderId` to `handleAction`'s dependency list; retain its raw-effort dependencies. Preserve existing setters, shared/separate-mode behavior, and raw saved state. Merely displaying or switching to Astra must not replace saved `none`; an explicit cycle action writes the user's next selection.

#### [x] 19.4. Connect CLI flag parsing and help

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/index.ts`

Remove the local `normalizeReasoningEffort(value?: string)` function and its now-unused `isOpenaiReasoningEffort`, `OPENAI_REASONING_EFFORT_OPTIONS`, and `OpenaiReasoningEffort` import. Import `normalizeCliReasoningEffort` from `./utils/reasoning-effort`. In `applyTaskOptions`, replace its parser call with `normalizeCliReasoningEffort(options.reasoningEffort, printWarning)`. Preserve the existing state writes, mode handling, and telemetry. In both existing `--reasoning-effort <effort>` option definitions, replace help text `Reasoning effort: none|low|medium|high|xhigh` with exactly `Reasoning effort: none|low|medium|high|xhigh|max`. No new flag, default, warning or other command wording.

### [x] 20. Verify webview and CLI effort behavior

Requirement source: FR-1, FR-7, FR-10, IR-1, IR-4.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/settings/__tests__/OpenAINativeModels.spec.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/utils/reasoning-effort.test.ts`

#### [x] 20.1. Verify webview options and saved preferences

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/settings/__tests__/OpenAINativeModels.spec.tsx`

Create a Vitest/Testing Library module. Import `{render,screen,fireEvent,cleanup}` from `@testing-library/react`, `{afterEach,describe,expect,it,vi}` from `vitest`, `type ApiConfiguration` from `@shared/api`, `OpenAINativeProvider` from `../providers/OpenAINative`, and default `ReasoningEffortSelector` from `../ReasoningEffortSelector`.

Use `vi.hoisted` to declare `const apiConfiguration: ApiConfiguration = {}` and return mutable state `{apiConfiguration,planActSeparateModelsSetting:true}` plus `handleModeFieldChange = vi.fn()` and `handleFieldChange = vi.fn()`. Mock `@/context/ExtensionStateContext`'s `useExtensionState` to return that state. Mock `../utils/useApiConfigurationHandlers` to return the two spies. Mock `../common/ApiKeyField` and `../common/ModelInfoView` with components returning null. Mock `../common/ModelSelector` with a native select `aria-label="Model"`, value selectedModelId, the original event-shaped onChange callback, and an option for every models key displaying `models[id].name ?? id`. Type its props as `{models: Record<string,{name?:string}>,selectedModelId:string,onChange:(event:{target:{value:string}})=>void}` and wire the select with `onChange={(event) => onChange(event)}`; do not cast the configuration.

Mock `@/components/ui/select` as follows: Select renders `<select aria-label="Reasoning Effort" value={value} onChange={e=>onValueChange(e.target.value)}>{children}</select>`; SelectContent returns children; SelectItem renders `<option value={value}>{children}</option>`; SelectTrigger and SelectValue return null. Type mock props explicitly using React `ReactNode`, string, and callbacks; import `type ReactNode` from `react`. Mock `../ReasoningSummarySelector` to return null. These replacements isolate wiring while keeping the actual effort-selector component and capability resolver.

After each test call cleanup and vi.clearAllMocks. For each mode `plan` and `act`, set both provider fields to `openai-native`, both model fields to the case ID, both effort fields to the case value; render `<OpenAINativeProvider currentMode={mode} showModelOptions={true}/>`.

Test `shows model-specific reasoning options`: use all five literal IDs and exact option arrays from FR-7, assert the select's option values and selected value. Test `shows low for saved Astra none without a write`: both saved efforts `none`, select value low, both settings still none, spies not called; unmount, replace both model IDs with `gpt-5.5`, render again and assert selected none with no write. Explicit remounting is required because the mocked context does not subscribe memoized components to configuration changes. Test `persists max through the existing Plan and Act handler`: for every 5.6/Astra ID change effort select to max, assert handleModeFieldChange called with `{plan:"planModeReasoningEffort",act:"actModeReasoningEffort"}`, `"max"`, and currentMode. Test `retains older native options`: GPT-5.4 mini offers only `["none","low","medium","high","xhigh"]`; saved `max` displays `medium` without a write. Test `selects every approved model`: change Model select to each new ID; assert handler receives `{plan:"planModeApiModelId",act:"actModeApiModelId"}`, selected ID and currentMode.

Test `does not expose max to unextended providers` by rendering the actual shared selector for both modes using provider pairs `openai`, `openai-codex`, `openrouter`, `vercel-ai-gateway`, `cline`, `gemini`, and `vertex`. Set both provider fields to the case provider; set both `planModeApiModelId`/`actModeApiModelId` to `gpt-5.6-sol`, both `planModeOpenAiModelId`/`actModeOpenAiModelId` to `gpt-5.6-sol`, both `planModeOpenRouterModelId`/`actModeOpenRouterModelId` and `planModeVercelAiGatewayModelId`/`actModeVercelAiGatewayModelId` to `openai/gpt-5.6-sol`, and both saved efforts to `max`. Assert the five-value list, effective medium, saved max unchanged and no writes; provider-specific default-model lookup must also remain within the five-value policy. Test `resolves Plan and Act independently` with Plan native Astra/saved none and Act compatible OpenAI `gpt-5.6-sol`/saved max: render one mode at a time, assert Plan low with Astra options and Act medium with five options, and no setting writes. Test `optional allowed efforts only restrict capabilities`: native GPT-5.5 with `allowedEfforts={["medium","max"]}` offers only medium. Use DOM `instanceof HTMLSelectElement` narrowing before reading `.value`/`.options`. No snapshot generation.

#### [x] 20.2. Verify CLI parsing and model-specific cycling

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/cli/src/utils/reasoning-effort.test.ts`

Create Vitest tests importing `describe`/`it`/`expect`/`vi` from `vitest` and `normalizeCliReasoningEffort`/`nextReasoningEffort` from `./reasoning-effort`.

- `parses every recognized effort without a model fallback`: all six lowercase values and `MAX` return their recognized lowercase value and do not call the warning spy; undefined returns undefined without a warning. `invalid` returns medium and warns exactly `Invalid --reasoning-effort 'invalid'. Using 'medium'. Valid values: none, low, medium, high, xhigh, max.`
- `cycles only supported model efforts`: explicit native rows for all five IDs use FR-7's ordered lists; assert every value advances to the next and the last wraps to the first. Native GPT-5.4/main-mini and `gpt-5.2`, plus `gpt-5.6-sol` with providers `openai`, `openai-codex`, `openrouter`, `vercel-ai-gateway`, `cline`, `gemini` and `vertex`, cycle only `["none","low","medium","high","xhigh"]`. Expectations are literal rows, not generated by the capability lookup.
- `cycles from the effective value without rewriting the input preference`: saved `none` on native Astra advances from effective low to medium; saved `max` on native GPT-5.5 or compatible OpenAI advances from effective medium to high. Assert the input configuration object's saved string remains unchanged after the pure helper call. Actual settings writes remain owned by the existing explicit-action handler.

V2-CLI also runs the existing CLI entrypoint suite; V5 checks actual settings-panel wiring, mode separation, and help/flag behavior.

### [x] 21. Declare the CLI build runner

Requirement source: FR-10, IR-2, NFR-6.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/cli/package.json`
- `/Users/robertboston/Documents/Cline Extension/cline/package-lock.json`

Run `npm install --workspace cli --save-dev --save-exact tsx@4.23.15 --ignore-scripts` from the repository root. This adds exactly `"tsx": "4.23.15"` to the CLI package's `devDependencies` and the corresponding workspace lockfile entry. The npm registry reports that 4.23.15 requires Node `>=18.0.0`, which remains within the CLI's existing Node `>=20.0.0` contract. Do not change the CLI build scripts, root dependency declarations, engines, runtime dependencies, or other package files. Confirm `npm ls tsx --workspace cli` resolves 4.23.15 without errors.

### [x] 22. Run validation and inspect the complete delta

Requirement source: FR-1–FR-10, IR-1–IR-4, NFR-1–NFR-6.

Allowed files / full targets:

- None (read-only validation; temporary/build output only).

Run V1, V2, V2-CLI, V3, V4, and the scope audit below. Record exact results in the execution record. A failing command is a pause: report it and its relationship to baseline changes; do not edit outside a prescribed task or erase existing changes. Do not mark this task complete if a required gate has not passed. No source imports, fixtures, or symbols are created in this task.

### [ ] 23. Pause for extension QA and record actual evidence

Requirement source: FR-1–FR-10, requirements §3.2, NFR-6.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/docs/Model Support Updates/5-5-through-6-update/action-plan.md`

Stop after automated validation and ask the user to run/authorize the V5 extension and CLI QA. Do not mark this task complete on the strength of mocked tests. Record per-model pass/fail/unavailable results below. If account access or credentials are unavailable, report live compatibility as unverified and leave this task unchecked. Do not add API keys or raw private prompts to this document. This plan does not authorize implementation of a QA-discovered defect outside its exact tasks.

V5 exposed a pre-existing workflow-runtime projection mismatch: `WorkflowRuntime` restored the active Document Project Step 4 session and its values correctly and projected the canonical numbered `Complete` / `Active` / `Not Started` step list, while the downstream Focus Chain still recognized only retired checkbox markdown and rendered no workflow status. Implementation of that generic defect belongs exclusively to Phase 73 of `docs/workflows/workflow-runtime/foundational-build/action-plan.md`. Do not resume V5 step 4 or mark Task 23 complete until Phase 73 automated validation passes and the same disposable Document Project interrupt/reload/resume scenario confirms the numbered Focus Chain survives.

## Validation commands and QA

Run commands from the workspace root. These commands are prescribed for implementation, not claimed to have been run during document authoring.

### V1 — Backend and SDK consumer regressions

```sh
npm run test:unit -- 'src/core/api/providers/__tests__/*.test.ts' 'src/core/api/transform/__tests__/*.test.ts' src/shared/__tests__/openai-native-models.test.ts src/core/prompts/system-prompt/__tests__/openai-native-models.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/prompts/system-prompt/__tests__/spec.test.ts src/utils/__tests__/model-utils.test.ts src/utils/cost.test.ts src/shared/__tests__/getApiMetrics.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/__tests__/responseToolTurnFlow.test.ts src/core/task/__tests__/ToolExecutor.workflowModelToolLifecycle.test.ts
```

The provider glob includes native OpenAI, compatible OpenAI, OpenRouter, Vercel, OCA, LiteLLM, SAP, WandB, the other existing provider suites, and Task 17.7's `reasoning-effort-compatibility.test.ts`. The transform glob protects SDK tool/message conversions. Do not use `--update-snapshots`. New test paths are created by Tasks 16, 17.7 and 18 before this command.

### V2 — Webview

```sh
npm --prefix webview-ui run test -- src/components/settings/__tests__/OpenAINativeModels.spec.tsx src/components/settings/__tests__/APIOptions.spec.tsx
```

The new test path is created by Task 20.1.

### V2-CLI — CLI effort parsing and cycling

```sh
npm --prefix cli run test:run -- src/utils/reasoning-effort.test.ts src/index.test.ts
```

Task 20.2 creates the focused helper suite. The existing `src/index.test.ts` checks CLI command parsing; it is supplementary coverage, not a substitute for testing the helpers now used by the actual entrypoint and settings panel.

### V3 — Type and style checks

```sh
npx tsc --noEmit
npx tsc --noEmit -p webview-ui/tsconfig.json
npx tsc --noEmit -p cli/tsconfig.json
npm run lint
npm run format
```

These are the three typecheck stages of `check-types` without its unnecessary protobuf generation: this update introduces no protobuf/state schema field. Existing generated files must not be regenerated or changed. Formatting and lint commands are read-only. Restrict any formatting corrections to the current task's allowed files; preserve unrelated baseline formatting issues and report them.

### V4 — Build

```sh
npm run build:webview
node esbuild.mjs --production
npm --prefix cli run build:production
```

Do not package, publish, or install the extension automatically. Build artifacts are generated output, not new tracked source changes. The CLI production build must resolve its declared local `tsx` dependency without an ad hoc registry download.

### Scope audit

```sh
git diff --check
git diff --name-only
git ls-files --others --exclude-standard
git diff -- package.json package-lock.json src/shared/storage/types.ts src/shared/api.ts src/shared/openai-native-models.ts src/shared/utils/reasoning-support.ts src/utils/model-utils.ts src/core/task/index.ts src/core/api/providers/openai-native.ts src/core/api/providers/openai.ts src/core/api/providers/openai-codex.ts src/core/api/transform/openrouter-stream.ts src/core/api/transform/vercel-ai-gateway-stream.ts webview-ui/src/components/settings/ReasoningEffortSelector.tsx cli/src/utils/reasoning-effort.ts cli/src/components/SettingsPanelContent.tsx cli/src/index.ts
```

Compare with the pre-implementation baseline, not with an assumed clean tree. For files already dirty, review the implementation delta against the saved baseline diff. Every new tracked/untracked source change must belong to a task's allowed-file list. The initial requirements revision and this action plan are documentation baseline changes, not proof that implementation has happened. No source deletion, snapshot rewrite, provider-default change, workflow module change, or credential file is authorized.

### V5 — Manual extension and CLI QA (mandatory pause)

Use a disposable test workspace and an OpenAI account that can access each of the five approved models. Use existing native tool settings and approval controls. For each model record:

1. Select the model in Plan and Act with separate settings enabled, save, reload the extension, and confirm both IDs are retained. Run a small task and confirm request diagnostics show the selected ID and Responses HTTP path.
2. Exercise the available effort choices, including max on 5.6/Astra. Select none on GPT-5.5, switch to Astra, and confirm effective low; switch back and confirm none remains saved. Confirm Plan/Act separation.
3. Ask the model to read a test file and modify it through the existing apply-patch tool; approve through the normal UI. Confirm a follow-up tool turn continues from the earlier response ID. Interrupt after a native tool call, resume, and confirm no orphaned tool-output or duplicated-history error.
4. After Foundational Build Phase 73 automated validation passes, start Document Project in the disposable workspace, complete its entry forms, exercise a model-driven step, then interrupt/reload/resume. Confirm current workflow step, values, permitted per-step tools, and the canonical numbered `Complete` / `Active` / `Not Started` downstream Focus Chain projection survive. Do not alter the module or its prescribed prompt text. For compaction, inspect the outgoing `context_management` threshold and validate compaction event/resume through the automated fixture; do not deliberately spend hundreds of thousands of tokens solely to trigger a live threshold.
5. Inspect usage for a completed response. Confirm output includes reasoning once, reads/writes remain separate, and cost is a per-response estimate. Cache hits/writes depend on provider behavior; lack of a hit is not itself a test failure. Verify one existing GPT-5.4 or mini task still works and an older GPT-5.2 selection retains its prior routing.

Record access failures separately from implementation failures. Live smoke testing does not establish exact GPT-5.5 invoice equivalence.

For CLI settings, build the CLI with `npm --prefix cli run build`, then run the actual built entrypoint with `node cli/dist/cli.mjs --help` to confirm help lists all six efforts. Use `node cli/dist/cli.mjs` for the interactive CLI session; do not route these arguments through the `dev` package script because its shell sequence forwards trailing arguments to `npm run unlink` instead of the Cline entrypoint. Verify native 5.6 cycles through max, Astra excludes none, and GPT-5.5/older native and compatible OpenAI omit max. With separate Plan/Act settings under the native OpenAI provider, use Astra with saved none in Plan and GPT-5.5 with saved max in Act: displayed efforts must be low/medium, and merely viewing settings or switching models must preserve saved preferences. An explicit cycle advances to medium/high respectively. In a separate compatible OpenAI provider session, use `gpt-5.6-sol` with saved max: the displayed effort must be medium with the five-value option set, merely viewing settings or switching models must preserve saved max, and an explicit cycle must advance to high. Verify shared-mode cycling still updates both modes through the existing setter. Run a disposable task with `--reasoning-effort max`; confirm it is accepted without an invalid-value warning, retained in the selected mode's configuration, and constrained by the request resolver for the chosen model. Do not initiate paid requests outside the user-authorized QA session.

## Delta fallout audit

- `OPENAI_REASONING_EFFORT_OPTIONS`, its derived `OpenaiReasoningEffort` type, guard and normalizer recognize the same six values. Typed comparisons replace the effort assertion. Controller persistence inherits recognition; it gains no exception branch. Per-model options and resolution are separate shared exports, with the explicit five-value baseline for unextended integrations.
- Native Chat Completions/Responses, compatible OpenAI, Codex, and OpenRouter/Vercel transformations replace global normalization with effective resolution at their existing request seams. Obsolete normalizer imports and both native effort casts are removed. Existing absence/none/summary/budget rules remain in their callers. Tests cover native routing and actual non-native request construction; no unsupported max leaks from the global type change.
- `api.ts` imports a shared module that imports its model interface only as a type; there is no runtime import cycle. Literal catalog keys retain `OpenAiNativeModelId` discrimination. No protobuf additions or generated converters are required.
- The GPT-5-only classifier remains exported for existing consumers/tests. Task/variant/apply-patch imports are replaced only where prescribed. Native provider retains the old classifier for its legacy request path and combines it with the profile in compaction.
- `isNextGenModelFamily` gains an optional argument, so remaining one-argument callers retain the existing contract. The parent, matcher, and child call sites requiring Astra eligibility explicitly receive provider identity.
- The child method gains a required argument; its single production caller, reflected test signature, and spy forwarding are prescribed in Task 13. No child prompt behavior is independently redesigned.
- Reasoning accounting cleanup removes two local variables and replaces both consumers; its incorrect fixture and assertion are replaced. Existing usage stream and persisted `api_req_started` fields already carry separate cache counts; Task 17 verifies that path rather than changing history formats.
- The shared selector derives mode/provider/model from existing configuration; no new resolver prop or provider-screen edit is required. The existing optional allowed list only restricts capabilities. CLI cycling uses each mode's provider/model and effective value, while its flag parser uses global recognition. Both old local CLI helpers are removed at their specified sites, imports and hook dependencies are updated, and the warning/help list includes max. Neither UI writes effective fallbacks during display.
- No new workflow prompt placeholder is introduced. Existing workflow materialization and forbidden-placeholder coverage remain active in the integration suite; new tests protect tool-schema invariants rather than editable prose.
- SDK 6.49 retains the currently used imports and request/event types, verified in the published package and read-only compiler inspection. V1 validates runtime effects across existing SDK consumer suites. No speculative SDK consumer rewrites are prescribed.

## Compliance matrix

“Existing” means inspected in the current working tree; “new” identifies its defining earlier task. None of the steps relies on an undefined symbol. File paths below are repository-relative equivalents of the absolute task targets.

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | IR-2, IR-3, IR-4, FR-10 | `package.json`<br>`package-lock.json` | OpenAI SDK ReasoningEffort/ResponseUsage verified in published 6.49.0 | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 2 | FR-7, FR-10 | `src/shared/storage/types.ts` | OpenaiReasoningEffort, options, guard and normalizer existing | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V2, V3 |
| 3 | FR-1, FR-2, FR-5, FR-6, FR-7, FR-9, IR-4, NFR-1 | `src/shared/openai-native-models.ts`<br>`src/shared/utils/reasoning-support.ts` | New profile/lookup/resolver exports defined in 3.1/3.2; existing ModelInfo, ApiFormat and reasoning predicate verified | Yes; task gives exact shapes/call sites | Yes; task and delta audit | V1, V2, V2-CLI, V3 |
| 4 | FR-1, FR-2, FR-10 | `src/shared/api.ts` | openAiNativeModels/default/id existing; Task 3 export | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V2, V3 |
| 5 | FR-5, FR-6, FR-10 | `src/utils/model-utils.ts` | Existing model predicates and signatures; new helper here | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 6 | FR-5, FR-6, FR-10 | `src/core/task/index.ts` | Four existing gates; Task 5 signatures | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3, V5 |
| 7 | FR-5, FR-10 | `src/core/prompts/system-prompt/variants/native-gpt-5/config.ts` | config.matcher existing; Task 5 helper | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 8 | FR-5, FR-10 | `src/core/prompts/system-prompt/variants/gpt-5/config.ts` | config.matcher existing; Task 5 helper | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 9 | FR-5, FR-10 | `src/core/prompts/system-prompt/variants/native-next-gen/config.ts` | config.matcher existing; Task 5 helpers | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 10 | FR-5, FR-10 | `src/core/prompts/system-prompt/variants/next-gen/config.ts` | config.matcher and registry order existing | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 11 | FR-5, FR-10 | `src/core/prompts/system-prompt/variants/generic/config.ts` | config.matcher existing | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 12 | FR-5, FR-10 | `src/core/prompts/system-prompt/tools/apply_patch.ts` | NATIVE_GPT_5/GPT_5/contextRequirements existing | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 13 | FR-6, FR-10 | `src/core/task/tools/subagent/SubagentRunner.ts`<br>`src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts` | Method, one caller, test type and spy verified | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 14 | FR-3, FR-4, FR-6, FR-7, FR-8, FR-9 | `src/core/api/providers/openai-native.ts` | Three private seams and ResponseUsage verified; Tasks 1/3 types | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3, V5 |
| 15 | FR-7, FR-10, IR-4 | `src/core/api/providers/openai.ts`<br>`src/core/api/providers/openai-codex.ts`<br>`src/core/api/transform/openrouter-stream.ts`<br>`src/core/api/transform/vercel-ai-gateway-stream.ts` | Existing request effort seams and unchanged controller persistence path verified; Task 3.2 resolver | Yes; subtasks name each replacement and preserved omission rule | Yes; obsolete normalizer imports removed; controller workaround prohibited | V1, V3 |
| 16 | FR-1, FR-2, FR-7, FR-10, IR-4 | `src/shared/__tests__/openai-native-models.test.ts` | Existing converters/enum; Tasks 2–4/15 exports | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 17 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts`<br>`src/core/api/providers/__tests__/reasoning-effort-compatibility.test.ts` | Native/provider request seams, stream discriminants, metrics, SDK client stubs and test fixtures verified | Yes; subtasks give exact request/event/assertion shapes | Yes; stale accounting assertion replaced and compatibility coverage added | V1, V3 |
| 18 | FR-5, FR-6, FR-10, NFR-2 | `src/core/prompts/system-prompt/__tests__/openai-native-models.test.ts` | Registry getModelFamily/getSystemPrompt and override shapes verified; Tasks 3/5 helpers | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3, V5 |
| 19 | FR-7, FR-10, IR-1, IR-4 | `webview-ui/src/components/settings/ReasoningEffortSelector.tsx`<br>`cli/src/utils/reasoning-effort.ts`<br>`cli/src/components/SettingsPanelContent.tsx`<br>`cli/src/index.ts` | Existing selector/config normalization, CLI parser/cycler/state/model lookup and help definitions verified; Tasks 2/3 types | Yes; subtasks specify each helper, call and dependency | Yes; both old CLI helpers/imports removed and selector defaults replaced | V2, V2-CLI, V3, V5 |
| 20 | FR-1, FR-7, FR-10, IR-1, IR-4 | `webview-ui/src/components/settings/__tests__/OpenAINativeModels.spec.tsx`<br>`cli/src/utils/reasoning-effort.test.ts` | Actual provider/selector wiring and CLI Vitest aliases/scripts verified | Yes; subtasks give exact fixtures and assertions | Yes; tests cover fallback without preference writes | V2, V2-CLI, V3 |
| 21 | FR-10, IR-2, NFR-6 | `cli/package.json`<br>`package-lock.json` | Existing CLI build script invokes `tsx`; missing declaration reproduced during V5 | Yes; exact package, version and install command specified | Yes; no script, engine or runtime dependency changes | V3, V4 |
| 22 | FR-1–FR-10, IR-1–IR-4, NFR-1–NFR-6 | Read-only | Commands and paths verified during authoring and V5 correction | Yes; task gives exact commands | Yes; task and delta audit | V1–V4, V2-CLI, scope audit |
| 23 | FR-1–FR-10, requirements §3.2, NFR-6 | `docs/Model Support Updates/5-5-through-6-update/action-plan.md` | Existing extension/CLI UI and runtime; no new symbols | Yes; task gives exact QA behaviors | Yes; task and delta audit | V5 |
| 3.1 | FR-1, FR-2, FR-5, FR-6, FR-7, FR-9, IR-4, NFR-1 | `src/shared/openai-native-models.ts` | New interface, profile literal, typed Map lookup and finite catalog export defined here | Yes | Explicit in subtask | V1, V2, V3 |
| 3.2 | FR-7, FR-10, IR-4 | `src/shared/utils/reasoning-support.ts` | Existing predicate verified; new options/resolver defined here | Yes | Explicit baseline array and assertion-free lookup | V1, V2, V2-CLI, V3 |
| 13.1 | FR-6, FR-10 | `src/core/task/tools/subagent/SubagentRunner.ts` | Production child signature/call; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 13.2 | FR-6, FR-10 | `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts` | Reflected test type and forwarding; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 14.1 | FR-3, FR-4, FR-6, FR-7, FR-8, FR-9 | `src/core/api/providers/openai-native.ts` | Request reasoning; detailed in parent task | Yes | Explicit in subtask | V1, V3, V5 |
| 14.2 | FR-3, FR-4, FR-6, FR-7, FR-8, FR-9 | `src/core/api/providers/openai-native.ts` | Compaction guard; detailed in parent task | Yes | Explicit in subtask | V1, V3, V5 |
| 14.3 | FR-3, FR-4, FR-6, FR-7, FR-8, FR-9 | `src/core/api/providers/openai-native.ts` | Usage accounting; detailed in parent task | Yes | Explicit in subtask | V1, V3, V5 |
| 15.1 | FR-7, FR-10, IR-4 | Read-only: `src/core/controller/state/reasoningEffort.ts` | Existing string guard/normalizer and numeric enum cases verified | Yes | Explicit prohibition on special-case branch | V1, V3 |
| 15.2 | FR-7, FR-10, IR-4 | `src/core/api/providers/openai.ts` | Existing model ID, reasoning branch and summary handling verified | Yes | Exact import replacement | V1, V3 |
| 15.3 | FR-7, FR-10, IR-4 | `src/core/api/providers/openai-codex.ts` | Existing model object and request builder verified | Yes | Exact import replacement | V1, V3 |
| 15.4 | FR-7, FR-10, IR-4 | `src/core/api/transform/openrouter-stream.ts` | Existing optional effort and budget precedence verified | Yes | Exact import/expression replacement | V1, V3 |
| 15.5 | FR-7, FR-10, IR-4 | `src/core/api/transform/vercel-ai-gateway-stream.ts` | Existing optional effort and budget precedence verified | Yes | Exact import/expression replacement | V1, V3 |
| 17.1 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Obsolete additive-token assertion; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 17.2 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Request/stream fixtures; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 17.3 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Persisted usage fixture; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 17.4 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Price boundary fixtures; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 17.5 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Missing optional usage; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 17.6 | FR-7, FR-10 | `src/core/api/providers/__tests__/openai-native.test.ts` | Both native transport builders and model routing verified | Yes | Literal expectations avoid resolver self-testing | V1, V3 |
| 17.7 | FR-7, FR-10, IR-3 | `src/core/api/providers/__tests__/reasoning-effort-compatibility.test.ts` | Existing provider constructors/private builder and transform signatures verified | Yes | Narrowing helper and exact request assertions prescribed | V1, V3 |
| 19.1 | FR-7, FR-10, IR-1, IR-4 | `webview-ui/src/components/settings/ReasoningEffortSelector.tsx` | Existing props, config normalizer and handler verified | Yes | Obsolete global default/guard imports removed | V2, V3 |
| 19.2 | FR-7, FR-10, IR-1, IR-4 | `cli/src/utils/reasoning-effort.ts` | New pure parser/cycler exports defined here | Yes | Existing parser/cycler behavior assigned to later callers | V2-CLI, V3 |
| 19.3 | FR-7, FR-10, IR-1, IR-4 | `cli/src/components/SettingsPanelContent.tsx` | Existing model/provider memo, three display rows, action and setter verified | Yes | Local helper deletion, imports and hook dependencies explicit | V2-CLI, V3, V5 |
| 19.4 | FR-7, FR-10, IR-1, IR-4 | `cli/src/index.ts` | Existing parser, two help definitions and applyTaskOptions verified | Yes | Old helper/imports removed; exact help change | V2-CLI, V3, V5 |
| 20.1 | FR-1, FR-7, FR-10, IR-1, IR-4 | `webview-ui/src/components/settings/__tests__/OpenAINativeModels.spec.tsx` | Actual provider/selector wiring and typed context fixture verified | Yes | Exact DOM narrowing and remount behavior | V2, V3 |
| 20.2 | FR-7, FR-10, IR-1, IR-4 | `cli/src/utils/reasoning-effort.test.ts` | Task 19.2 helpers and Vitest configuration verified | Yes | Literal capability/parse assertions | V2-CLI, V3 |

## Authoring audit and execution record

Authoring audit: re-read the full revised plan against every line of action-plan-guide Steps 1–9 and required frontmatter. Every task/subtask is traced and covered in the matrix; the shared vocabulary is extended at its source; model capabilities and request/control consumers are prescribed; controller workaround and obsolete resolver/selector-prop instructions are removed; imports, fixtures, narrowing, hook dependencies and helper cleanup are explicit; definitions precede consumers; validation covers backend, webview and CLI; prompt wording and workflow ownership remain unchanged. This authoring audit does not establish implementation or live compatibility.

Implementation record (fill only when executed):

| Gate | Result | Evidence / blockers |
| --- | --- | --- |
| SDK version | Verified during earlier execution | `require('openai/version').VERSION` returned `6.49.0`; existing package/lockfile delta must still be reviewed under Task 1. |
| V1 | Passed | 536 passing, 4 pending; all prescribed backend/provider/transform/shared/prompt/task suites completed successfully. |
| V2 | Passed | 19 tests passed across 2 files; the existing APIOptions suite emitted its pre-existing React warnings without test failures. |
| V2-CLI | Passed | 66 tests passed across 2 files. |
| V3 | Passed | All three TypeScript commands exited 0; lint checked 1,753 files with no fixes; format exited 0 with no fixes. |
| V4 | Passed | Webview production build completed after 6,820 modules; extension and CLI production builds completed. The CLI build resolved local `tsx@4.23.15`; its initial sandboxed IPC denial was rerun successfully with the required filesystem permission. |
| Scope audit | Passed | `git diff --check` was clean. The 26 tracked modified paths and 7 untracked paths are all task-authorized; no tracked build output appeared. The fresh pre-implementation baseline contained only this plan and the Task 1 package files. |
| V5 workflow projection | Blocked | Disposable Document Project QA restored the active Step 4 workflow name, session values, fixed project selection, prerequisite resolutions, branch context, permitted `list_files` request, and resume state. Focus Chain rendered no status because its downstream parser accepted only retired checkbox markdown while `WorkflowRuntime` projected the canonical numbered status list. Foundational Build Phase 73 owns the generic correction; rerun this scenario after its automated validation passes. |
| V5 GPT-5.5 | Partial pass | Paid CLI Responses task completed with emitted model metadata `openai-native:gpt-5.5`; the interactive selector exposed none through xhigh, omitted max, and preserved saved none across an Astra round trip. Extension-specific task, reload, workflow, response-chain and usage checks remain pending. |
| V5 GPT-5.6 Sol | Partial pass | Paid CLI Responses task completed with emitted model metadata `openai-native:gpt-5.6-sol`; interactive CLI cycling reached max. Extension-specific checks remain pending. |
| V5 GPT-5.6 Terra | Partial pass | Paid CLI Responses task completed at max. A disposable CLI task read a test file, applied the existing patch tool, read the saved result in a follow-up turn, and completed successfully. Extension-specific checks remain pending. |
| V5 GPT-5.6 Luna | Partial pass | Paid CLI Responses task completed with emitted model metadata `openai-native:gpt-5.6-luna`. Extension-specific checks remain pending. |
| V5 GPT-6 Astra | Partial pass | Paid CLI Responses task completed with emitted model metadata `openai-native:gpt-6-astra`; interactive CLI display resolved saved none to low and omitted none from cycling. Extension-specific checks remain pending. |
| Existing-model QA | Partial pass | Interactive CLI checks confirmed GPT-5.4 omits max and preserved the original separate Plan/Act model and effort settings after restart. The prescribed live existing-model extension tasks remain pending. |
| CLI settings/flag QA | Partial pass | Built help lists all six efforts; native model lists, model-specific cycling, saved-preference preservation, shared-mode updates, and separate-mode persistence passed. The user approved splitting the native Plan/Act and compatible-provider fallback checks into separate reachable sessions; those corrected checks remain pending. |
