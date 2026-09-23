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

Status: Authored for review; no implementation step is complete. Execute only after the user authorizes implementation.

## Approved method and evidence

This plan implements [requirements.md](requirements.md), including the subsequent user decisions to upgrade the SDK, centralize model capabilities, and use per-response cost estimates. Exact GPT-5.5 session billing is deferred. The estimate can differ from the invoice after crossing 272,000 input tokens and subsequently returning below that threshold. Do not introduce billing-session persistence or retroactive repricing.

Use OpenAI SDK **6.49.0**, pinned exactly. Inspection of the published package confirmed `max` in `ReasoningEffort` and `cache_write_tokens` in Responses usage. SDK 7.17.0 also supplies these fields but raises its Node minimum to 22. The selected 6.x upgrade avoids that additional platform change. A read-only TypeScript compiler-host resolution against 6.49.0 produced zero diagnostics in the current backend/CLI source graph. This is authoring evidence, not implementation or runtime validation.

Model limits, rates, and reasoning options were checked against the official references linked in requirements §1.5. OpenAI's GPT-5.5 model page uses “full session” without defining a reset boundary; the user approved the documented approximation. New-model parameter construction must send explicit `none` for GPT-5.5/5.6: omitting reasoning would use the API default rather than the selected non-reasoning mode. Preserve the older models' existing omission behavior.

Centralization means one new shared module owns the five new model records, their capability flags, and their reasoning resolution. Existing GPT-5 predicates remain the compatibility baseline for existing models. Do not rename GPT-5 family enums, rewrite prompt templates, add future model pattern matching, or add these catalog entries to other providers.

## Requirement trace (prepared before tasks)

Paths in this trace are repository-relative; task allowed-file lists below use absolute paths.

| Source | Exact behavior / stable contract | Owner / evidence | Tasks |
| --- | --- | --- | --- |
| FR-1 | Five exact IDs from requirements §1.4; Plan/Act strings survive protobuf and JSON round trips; default remains `gpt-5.2` | `src/shared/api.ts`, configuration converters, new shared tests, native provider | 2–4, 16–17, 21–22 |
| FR-2 | 1,050,000 context, 128,000 output ceiling; rate table; threshold inclusive at 272,000; per-response estimate | new `src/shared/openai-native-models.ts`, existing `src/utils/cost.ts` | 3–4, 16–17 |
| FR-3 | `OPENAI_RESPONSES`, stored HTTP responses, existing native-tool prerequisite; omit unsupported sampling and output-budget fields | `src/core/api/providers/openai-native.ts` | 1, 14, 17 |
| FR-4 | Early/deduplicated `response_id`, anchored incremental input, existing chain failure retry | provider and existing response-transform tests | 14, 17, 21–22 |
| FR-5 | Existing `NATIVE_GPT_5` variant, apply-patch, compact prompt and reduced environment; unchanged workflow schema override | model utilities, task, variant config files, tool spec | 5–13, 18, 21–22 |
| FR-6 | Provider compaction threshold 120,000 for new models; application auto-condense eligibility; resume | task, subagent, model utilities, provider | 5–6, 13–14, 18, 21–22 |
| FR-7 | Effort lists from FR-7; `max` survives; Astra saved `none` resolves to `low` without a storage write; other invalid values resolve to `medium` | shared profile, controller normalizer, selector/provider UI | 2–3, 15–16, 19–20 |
| FR-8 | Inclusive output counted once; separate input/cache read/cache write; missing counts zero | provider usage, existing `updateApiReqMsg`/`getApiMetrics` | 14, 17, 21–22 |
| FR-9 | Standard rates and two tiers; fresh tier selection for each response; no repricing stored history | profile rates and provider calculator invocation | 3, 14, 17 |
| FR-10 | Other catalogs/defaults, older request paths and prompt wording unchanged; shared native usage correction is approved | SDK consumer regressions and diff review | 1, 5–14, 16–18, 21–22 |
| IR-1 | Existing `Model`, `Reasoning Effort`, `Reasoning Summary`; effort labels use existing capitalization; display names exactly from FR-1 table | existing controls and catalog `name` fields | 3, 19–20 |
| IR-2 | No hardware/OS change | SDK 6.x selection | 1, 21 |
| IR-3 | Existing credentials, HTTPS streaming, cancellation/errors; no new transport | native provider and shared `createOpenAIClient` | 1, 14, 17, 21 |
| IR-4 | Same capability/effort definition in backend/UI; compatible usage event shapes | shared profile and current API stream | 2–5, 14–20 |
| NFR-1 | No added model lookup or billing API requests; incremental requests retained | static profile and native request builder | 3, 14, 17 |
| NFR-2 | Tool approvals and runtime progression unchanged | no handler/runtime mutation permitted | 18, 21–22 |
| NFR-3 | Existing key storage and networking; no secrets in fixtures | test key remains `test-api-key`; shared networking unchanged | 1, 17, 21–22 |
| NFR-4 | Explicit registry; source-backed values; regression evidence | shared profile tests and compliance matrix | 3, 16–22 |
| NFR-5 | No pro mode, hosted-tool feature, cache-breakpoint UI, or service-tier additions | allowed-file scope and request assertions | 14, 17, 21 |
| NFR-6 | Exact changes, validation and QA pause; separate documentation/implementation/live states | this plan | 1–22 |

No new product prose, prompt-template placeholder, workflow value, workflow route, artifact, or panel is introduced. Existing `Native Tool Call must be enabled in your setting for OpenAI Responses API` remains the prerequisite error. Test fixture prose below is test input, not new product wording.

## Execution baseline

Working directory for commands: `/Users/robertboston/Documents/Cline Extension/cline`.

Before Task 1, capture `git status --short`, `git diff --name-only`, and `git ls-files --others --exclude-standard`. Save `git diff --binary` and copies of the two model-support documents to a fresh directory outside the repository for comparison. Preserve the existing dirty changes, especially `src/core/task/index.ts`, the prompt integration suite, and workflow runtime/module files. Existing dirty files are not authorization to modify them. Do not stage, commit, reset, or regenerate unrelated files.

For each task: its allowed-file set is exclusive apart from checkbox changes to this plan. Test tasks may use their explicitly listed existing imports; production symbols introduced by earlier tasks must exist before those tests are added. An unexpected compile/runtime fallout is a stop condition, not permission to broaden a task.

## Tasks

### [ ] 1. Upgrade the SDK

Requirement source: IR-2, IR-3, IR-4, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/package.json`
- `/Users/robertboston/Documents/Cline Extension/cline/package-lock.json`

Run `npm install --save-exact openai@6.49.0 --ignore-scripts` from the repository root. The only direct dependency revision is `dependencies.openai` from `^6.21.0` to `6.49.0`; retain the package manager's corresponding lockfile resolution and integrity changes. Do not change `engines`, webview dependencies, standalone lockfiles, or unrelated dependency versions. There are no source imports to change in this task.

Confirm `node -p "require('openai/package.json').version"` prints `6.49.0`. Review the lockfile diff for unrelated churn and stop if it appears. Do not substitute 7.x or a floating `latest`.

### [ ] 2. Represent the new effort without changing legacy normalization

Requirement source: FR-7, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/storage/types.ts`

Change only the exported type to:

```ts
export type OpenaiReasoningEffort = (typeof OPENAI_REASONING_EFFORT_OPTIONS)[number] | "max"
```

Keep the option array exactly `["none", "low", "medium", "high", "xhigh"]`. Keep `isOpenaiReasoningEffort` and `normalizeOpenaiReasoningEffort` behavior unchanged: the existing guard and default normalizer still reject `max` and resolve it to `medium`. This retains older providers' and CLI controls' behavior. The new native resolver in Task 3 accepts `max` for its listed models. No import or fixture deletion.

### [ ] 3. Create the shared capability source

Requirement source: FR-1, FR-2, FR-5, FR-6, FR-7, FR-9, IR-4, NFR-1.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/openai-native-models.ts`

Create this module. Imports: `import type { OpenAiCompatibleModelInfo } from "./api"`, `import { ApiFormat } from "./proto/cline/models"`, and `{ normalizeOpenaiReasoningEffort, type OpenaiReasoningEffort }` from `./storage/types`. The API import must remain type-only to avoid a runtime cycle when `api.ts` imports this module.

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

Export `getOpenAiNativeModelProfile(modelId: string, providerId: string): OpenAiNativeModelProfile | undefined`. Return undefined unless `providerId === "openai-native"` and `Object.prototype.hasOwnProperty.call(openAiNativeModelProfiles, modelId)` is true. After that guard, index with `modelId as keyof typeof openAiNativeModelProfiles`. No substring, prefix, alias, or future-version acceptance.

Export `resolveOpenAiNativeReasoningEffort(modelId: string, effort?: string): OpenaiReasoningEffort`. Resolve the profile using native provider ID. If absent, return the existing `normalizeOpenaiReasoningEffort(effort)`. Otherwise lowercase `(effort || "medium")`; for Astra and `none`, return `low`; for a value included in the profile's effort array return it as `OpenaiReasoningEffort`; otherwise return `medium`. Do not mutate settings. This single resolver is consumed by the provider and UI.

Export `extendedOpenAiNativeModels` as a literal five-key object whose values are the corresponding `.info` properties. Keep the five literal keys so `keyof` is a finite model-ID union; do not widen it to `Record<string, ...>` or derive it with untyped `Object.fromEntries`.

### [ ] 4. Expose the five catalog entries

Requirement source: FR-1, FR-2, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/api.ts`

Add `import { extendedOpenAiNativeModels } from "./openai-native-models"`. Add `...extendedOpenAiNativeModels` as the first member of `openAiNativeModels`. Retain `as const satisfies Record<string, OpenAiCompatibleModelInfo>` and the existing `OpenAiNativeModelId` derivation. Retain `openAiNativeDefaultModelId = "gpt-5.2"`. Do not change any existing entry, other catalog, model interface, or default. No dead imports result.

### [ ] 5. Make classification consume provider-scoped capabilities

Requirement source: FR-5, FR-6, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/utils/model-utils.ts`

Import `getOpenAiNativeModelProfile` from `@/shared/openai-native-models`. Keep `isGPT5ModelFamily` unchanged. Add exported `isGptPromptModel(id: string, providerId?: string): boolean` returning `isGPT5ModelFamily(id) || getOpenAiNativeModelProfile(id, providerId ?? "")?.gpt54Behavior === true`.

Change `isNextGenModelFamily(id: string)` to `isNextGenModelFamily(id: string, providerId?: string)`. Keep its existing normalized predicates and prepend `getOpenAiNativeModelProfile(id, providerId ?? "")?.gpt54Behavior === true` to the OR expression. In `isNativeToolCallingConfig`, pass `providerInfo.providerId` to `isNextGenModelFamily(modelId, providerInfo.providerId)`. Keep the setting/provider guards and parallel-calling function intact; parallel eligibility already delegates to native eligibility. No existing export is deleted. Calls omitting providerId retain old behavior.

### [ ] 6. Route parent prompt and context gates through capabilities

Requirement source: FR-5, FR-6, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/index.ts`

Replace the `isGPT5ModelFamily` named import from `@utils/model-utils` with `isGptPromptModel`. In `shouldUseMinimalGptPrompt`, return `isGptPromptModel(providerInfo.model.id, providerInfo.providerId)`. Set `useReducedEnvironmentDetails` with `isGptPromptModel(this.getCurrentProviderInfo().model.id, this.getCurrentProviderInfo().providerId)`.

For both existing `isNextGenModelFamily(this.api.getModel().id)` calls (the `getNewContextMessagesAndMetadata` argument and the `useAutoCondense` branch), add `this.getCurrentProviderInfo().providerId` as the second argument. No other task-loop, workflow, usage, prompt wording, or persistence revision. Preserve the user's existing diff in this file.

### [ ] 7. Extend the native-gpt-5 matcher

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5/config.ts`

Replace the `isGPT5ModelFamily` import with `isGptPromptModel`; replace the one matcher call with `isGptPromptModel(modelId, providerInfo.providerId)`. Retain the native-tools switch, provider guard, chat exclusion, and any GPT-5.1/GPT-5.2 exclusions exactly. Do not change tags, descriptions, enum names, components, tools, or template overrides. Remove no other import.

### [ ] 8. Extend the gpt-5 matcher

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/config.ts`

Replace the `isGPT5ModelFamily` import with `isGptPromptModel`; replace the one matcher call with `isGptPromptModel(modelId, providerInfo.providerId)`. Retain the native-tools switch, provider guard, chat exclusion, and any GPT-5.1/GPT-5.2 exclusions exactly. Do not change tags, descriptions, enum names, components, tools, or template overrides. Remove no other import.

### [ ] 9. Keep native generic selection disjoint

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-next-gen/config.ts`

Replace imported `isGPT5ModelFamily` with `isGptPromptModel`. Return `!isGptPromptModel(modelId, providerInfo.providerId) && isNextGenModelFamily(modelId, providerInfo.providerId)` from the existing final matcher expression. Keep remaining configuration unchanged.

### [ ] 10. Preserve non-native next-generation fallback

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/config.ts`

Replace imported `isGPT5ModelFamily` with `isGptPromptModel`. Add `providerInfo.providerId` as second argument to both `isNextGenModelFamily` calls. Replace the final GPT exclusion predicate with `isGptPromptModel(modelId, providerInfo.providerId)`. Preserve the early non-native branch and its order; do not redesign matcher priority or change templates.

### [ ] 11. Exclude newly recognized native models from generic fallback

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/generic/config.ts`

Pass `providerInfo.providerId` as the second argument in its single `isNextGenModelFamily(modelId)` call. No import changes. Preserve local, GLM, Trinity, and missing-provider handling.

### [ ] 12. Retain apply-patch eligibility

Requirement source: FR-5, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/tools/apply_patch.ts`

Replace imported `isGPT5ModelFamily` with `isGptPromptModel`. In `NATIVE_GPT_5.contextRequirements`, use `isGptPromptModel(context.providerInfo.model.id, context.providerInfo.providerId)` before the unchanged GPT-OSS OR branch. Preserve `GPT_5` spread inheritance, both exported variants, parameter names, required fields, and the entire tool description.

### [ ] 13. Pass provider identity through child context eligibility

Requirement source: FR-6, FR-10.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`
- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

#### [ ] 13.1. Update child eligibility signature

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/SubagentRunner.ts`

In `SubagentRunner.ts`, append required parameter `providerId: string` to `shouldCompactBeforeNextRequest`. Pass it as the second argument to `isNextGenModelFamily(modelId, providerId)`. At its single production call, append `providerInfo.providerId` after `providerInfo.model.id`. Preserve threshold calculation, `buildPromptContext`, and child workflow handling. No import changes.

#### [ ] 13.2. Update the reflected signature and spy

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts`

In the test file, append `providerId: string` to `ShouldCompactBeforeNextRequest` and to the `shouldCompactSpy` function's parameters in the existing request-total-token test. Forward it in `shouldCompactBeforeNextRequest.call(this, previousRequestTotalTokens, api, modelId, providerId)`. Retain its assertion that `previousRequestTotalTokens` equals 23. No fixture or import changes. These two changes are the entire signature fallout.

### [ ] 14. Adapt native Responses reasoning, compaction and usage

Requirement source: FR-3, FR-4, FR-6, FR-7, FR-8, FR-9.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai-native.ts`

#### [ ] 14.1. Resolve native reasoning

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai-native.ts`

Add imports `getOpenAiNativeModelProfile` and `resolveOpenAiNativeReasoningEffort` from `@/shared/openai-native-models`. Keep existing normalizer imports for the completion path. In `buildResponseCreateParams`, resolve `profile = getOpenAiNativeModelProfile(args.modelId, "openai-native")` and resolve `requestedEffort` with the new resolver. Set `reasoning` undefined only when `!profile && requestedEffort === "none"`; otherwise construct the existing effort/optional summary object using `requestedEffort` directly without `as ChatCompletionReasoningEffort`. With SDK 6.49 the union is assignable. Do not change `createCompletionStream` or its cast/import. Preserve all other request fields and omission of sampling/output-budget fields.

#### [ ] 14.2. Enable registered-model compaction

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai-native.ts`

Change the compaction early-return condition to `!isGPT5ModelFamily(modelId) && !getOpenAiNativeModelProfile(modelId, "openai-native")?.gpt54Behavior`. Retain the threshold calculation and `{ type: "compaction", compact_threshold }` result.

#### [ ] 14.3. Correct completed-response usage

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/openai-native.ts`

Inside the existing narrowed `response.completed` + defined-usage branch, replace zero cache-write tokens with `usage.input_tokens_details?.cache_write_tokens || 0`. Delete `reasoningTokens` and `totalOutputTokens`. Pass `outputTokens` to `calculateApiCostOpenAI` and emit `outputTokens` in the usage chunk. Retain non-cached input subtraction, response ID, total-token logging, and the remaining chunk shape. No stream union change, repricing state, Chat Completions accounting change, retry rewrite, or added API call.

### [ ] 15. Preserve max through task-setting normalization

Requirement source: FR-7, IR-4.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/controller/state/reasoningEffort.ts`

Before the existing `isOpenaiReasoningEffort(effort)` branch, return `"max"` when `typeof effort === "string" && effort.toLowerCase() === "max"`. Keep the existing numeric protobuf enum cases, legacy string normalization, imports, and return type. Task 2 widened that type. This is persistence normalization, not provider capability selection. Do not add a protobuf enum value: Plan/Act settings already carry string values.

### [ ] 16. Test capabilities, effort resolution and persistence

Requirement source: FR-1, FR-2, FR-7, FR-10, IR-4.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/shared/__tests__/openai-native-models.test.ts`

Create a Mocha/Chai test module importing `expect` from `chai`, `describe`/`it` from `mocha`, `openAiNativeModels`, `openAiNativeDefaultModelId`, `openAiCodexModels` from `../api`, the three profile exports `openAiNativeModelProfiles`, `getOpenAiNativeModelProfile`, `resolveOpenAiNativeReasoningEffort` from `../openai-native-models`, `normalizeOpenaiReasoningEffort` from `../storage/types`, the controller normalizer as `normalizeStoredEffort` from `@/core/controller/state/reasoningEffort`, `ApiFormat` from `../proto/cline/models`, and both `convertApiConfigurationToProto` and `convertProtoToApiConfiguration` from `../proto-conversions/models/api-configuration-conversion`.

Use literal `MODEL_IDS = ["gpt-5.5", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"] as const`. Add these named tests inside `describe("OpenAI native model profiles", ...)`:

- `registers exactly the approved native models`: assert profile keys exactly equal MODEL_IDS; every native catalog entry equals the profile info; each has context 1050000, maxTokens 128000, `OPENAI_RESPONSES`, true image/cache/reasoning/tools support; default is `gpt-5.2`; old GPT-5.4 and mini remain; subscription catalog has none of the five additions.
- `uses JSON-safe per-response price tiers`: use the literal price tuples from Task 3 as expectations; check both tier objects and that JSON round-trip retains the upper boundary as `Number.MAX_SAFE_INTEGER`. Do not assert Infinity for these new entries.
- `limits profiles to exact native provider IDs`: each ID resolves for `openai-native`, not `openai`, `openai-codex`, or `openrouter`; `gpt-6`, `gpt-6-mini`, `gpt-7`, `gpt-6-astra-extra`, `toString`, and `__proto__` resolve undefined.
- `resolves only supported native efforts`: for each literal ID assert the exact effort list in FR-7; every supported effort resolves to itself; Astra `none` and `NONE` resolve to `low`; GPT-5.5 `max` resolves to `medium`; undefined, empty string, and `invalid` resolve to `medium`; uppercase `MAX` resolves to `max` on 5.6/Astra. Existing normalizer `max` and existing GPT-5.4 native resolver `max` still return `medium`.
- `round trips model IDs and saved efforts without applying model fallback`: for each ID, use configuration `{ planModeApiProvider: "openai-native", actModeApiProvider: "openai-native", planModeApiModelId: id, actModeApiModelId: id, planModeReasoningEffort: "max", actModeReasoningEffort: "none" }`. Convert to protobuf, JSON stringify/parse, convert back; assert both model IDs and both effort strings remain unchanged. Assert `normalizeStoredEffort("max")` and `normalizeStoredEffort("MAX")` return `max`; the numeric enum constants LOW/MEDIUM/HIGH must resolve to low/medium/high respectively (import the enum as `ProtoOpenaiReasoningEffort` from `../proto/cline/state`). For Astra, resolve the restored Act setting to `low`, then assert the restored setting is still `none`.

Use explicit equality/undefined assertions. No new schema, persisted key, or snapshot.

### [ ] 17. Verify request, stream, cost and usage propagation

Requirement source: FR-1–FR-4, FR-6–FR-10, IR-3.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

#### [ ] 17.1. Replace the additive-reasoning assertion

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Repair the existing test named `should include reasoning tokens in Responses API output usage totals`: rename it `counts inclusive Responses output tokens once`; change its `reasoning_tokens` from 70 to 20 and `total_tokens` from 220 to 150; retain `output_tokens: 30`, input 120, cached 20. Change the emitted output assertion from 100 to 30. Keep the input/cache assertions. No old assertion of additive reasoning remains.

#### [ ] 17.2. Add request and continuity coverage

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Add `import { strict as assert } from "node:assert"`; import `openAiNativeModels` from `@/shared/api`, `calculateApiCostOpenAI` from `@/utils/cost`, `getApiMetrics`/`getLastApiReqTotalTokens` from `@/shared/getApiMetrics`, `updateApiReqMsg` from `@/core/task/utils`, and `type MessageStateHandler` from `@/core/task/message-state`. Import `type ClineMessage` from `@/shared/ExtensionMessage`. Existing `sinon`, `Logger`, handler, and `createAsyncIterable` remain. Add literal MODEL_IDS from Task 16 locally (no test-to-test import).

Within the existing describe/afterEach scope, define `readTool: ChatCompletionTool[] = [{ type: "function", function: { name: "read_file", description: "Read a file", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false } } }]`; add `import type { ChatCompletionTool } from "openai/resources/chat/completions"`. Define `collect = async (stream: ApiStream): Promise<ApiStreamChunk[]>` by pushing each yielded chunk; import both types from `../../transform/stream`. For accessing private methods, use the existing test convention `(handler as any)` only at the method/stub boundary; use stream discriminants for public chunks.

For each MODEL_IDS entry create a fresh handler with `{ openAiNativeApiKey: "test-api-key", apiModelId: id }`. Stub `ensureClient` to `{ responses: { create: createStub } }` and `useWebsocketMode` to false. Add parameterized tests with names prefixed by the ID:

- `uses stored HTTP Responses and the selected model`: createStub returns empty async iterable. Drain `createMessage("system", [{role:"user",content:"hi"}], readTool)`. Assert handler ID and request model equal id, store/stream true, instructions `system`, tools contain one function named `read_file` with `strict: true` and the exact input schema; context_management equals `[{type:"compaction",compact_threshold:120000}]`. Assert absent keys `temperature`, `top_p`, `top_logprobs`, `include`, `max_output_tokens`, `service_tier`, `prompt_cache_options`, `previous_response_id`. Assert one request.
- `enforces native tools`: use `await assert.rejects(() => collect(handler.createMessage("system", [{role:"user",content:"hi"}], undefined)), {message:"Native Tool Call must be enabled in your setting for OpenAI Responses API"})`; assert createStub not called.
- `transmits model-supported effort`: call `buildResponseCreateParams` with `{ modelId:id, modelInfo:handler.getModel().info, systemPrompt:"system", input:[], tools:[], store:true }` on handlers configured with each FR-7 effort plus `none`, `max`, and `invalid`. Assert `.reasoning.effort` is the supported value, Astra-none low, GPT-5.5-max medium, invalid medium. For summary `none`, assert no summary property; default summary is `auto`. Do not assert effort by calling the resolver under test to compute expectations.
- `continues an interrupted tool turn from its early response ID`: first stream has `response.created` and `response.in_progress`, both `{response:{id:"resp_early"}}`; then `response.output_item.added` with `{item:{type:"function_call",id:"fc_1",call_id:"call_1",name:"read_file",arguments:""}}`; then `response.function_call_arguments.delta` with `{item_id:"fc_1",delta:'{"path":"README.md"}'}`. No completion event. Assert exactly one response_id chunk with `resp_early`, before the first tool_calls chunk. Configure `createStub.onFirstCall().resolves(createAsyncIterable(firstEvents))` with the preceding events and `createStub.onSecondCall().resolves(createAsyncIterable([]))`. Next request uses history `[{role:"user",content:"hi"},{role:"assistant",id:"resp_early",modelInfo:{providerId:"openai-native",modelId:id,mode:"act"},content:[{type:"tool_use",id:"fc_1",call_id:"call_1",name:"read_file",input:{path:"README.md"}}]},{role:"user",content:[{type:"tool_result",tool_use_id:"fc_1",call_id:"call_1",content:"file contents"}]}]`, annotated `ClineStorageMessage[]` (import from `@/shared/messages/content`). Assert request has previous_response_id `resp_early`, includes function_call_output with call_id `call_1` and output `file contents`, and contains no replayed original `hi` input or function_call item. Narrow ResponseInput items by `type` before union-specific access.
- `retains broken-chain recovery`: in a separate test with a fresh handler/stub and the exact three-message history above, configure `createStub.onFirstCall().rejects({code:"previous_response_not_found",message:"missing response chain",status:404})`, then `createStub.onSecondCall().resolves(createAsyncIterable([]))`. Drain one `createMessage("system", history, readTool)` invocation. Assert exactly two calls, first anchored, second without previous_response_id, second containing original `hi` input and matching tool call/output. Preserve existing logged fallback behavior.
- `emits compaction for the selected model`: return `{type:"response.output_item.done",item:{type:"compaction",id:"cmp_1",encrypted_content:"encrypted"}}`; assert one `{type:"context_compacted",id:"cmp_1"}` chunk.

#### [ ] 17.3. Verify persisted usage categories

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Add `preserves cached reads and writes through persisted request metrics` for `gpt-5.6-sol`: stream one `response.completed` with response id `resp_usage`, usage `{input_tokens:1000,input_tokens_details:{cached_tokens:200,cache_write_tokens:300},output_tokens:100,output_tokens_details:{reasoning_tokens:70},total_tokens:1100}`. Find the usage chunk; throw if absent or wrong discriminant. Assert input 500, read 200, write 300, output 100, and totalCost within 1e-12 of **0.00558**.

Use `messages: ClineMessage[] = [{ts:1,type:"say",say:"api_req_started",text:'{"request":"test"}'}]`. Stub MessageStateHandler using only `getClineMessages: () => messages` and async `updateClineMessage(index: number, patch: Partial<ClineMessage>)` merging that patch into messages[index], cast through `unknown as MessageStateHandler` at this fixture boundary. Call `updateApiReqMsg({messageStateHandler, lastApiReqIndex:0, inputTokens:usage.inputTokens, outputTokens:usage.outputTokens, cacheWriteTokens:usage.cacheWriteTokens ?? 0, cacheReadTokens:usage.cacheReadTokens ?? 0, totalCost:usage.totalCost, api:handler})`, where `usage` is the narrowed chunk and `messageStateHandler` is the fixture. JSON round-trip messages; assert persisted `tokensIn:500`, `tokensOut:100`, `cacheReads:200`, `cacheWrites:300`, and cost .00558. Assert `getApiMetrics` returns `{totalTokensIn:500,totalTokensOut:100,totalCacheReads:200,totalCacheWrites:300,totalCost:usage.totalCost}` and `getLastApiReqTotalTokens` returns 1100. No production persistence change is required.

#### [ ] 17.4. Verify tier boundaries and independent estimates

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Add `uses independent per-response cost tiers`: literal rows `[id,inputRate,readRate,writeRate,outputRate]` are `["gpt-5.5",5,.5,0,30]`, `["gpt-5.6-sol",4,.4,5,20]`, `["gpt-5.6-terra",2,.2,2.5,12]`, `["gpt-5.6-luna",.2,.02,.25,1.2]`, `["gpt-6-astra",10,1,12.5,50]`. Declare the rows `as const` to preserve the model-key union. Call `calculateApiCostOpenAI(openAiNativeModels[id], totalInput, 100, writes, 1000)`. For total input 271999/272000/272001 and output 100, cached reads 1000, writes 0 for GPT-5.5 or 2000 otherwise, assert calculated cost within 1e-12 of `((totalInput-1000-writes)*inputRate*inputMultiplier + 1000*readRate*inputMultiplier + writes*writeRate*inputMultiplier + 100*outputRate*outputMultiplier)/1_000_000`; multipliers are exactly 1/1 for the first two values, 2/1.5 for the third. Then calculate a 1000-input/100-output/no-cache response and assert `(1000*inputRate+100*outputRate)/1_000_000`, independent of the preceding high-tier call. This verifies total-input tier selection, including cache usage, and approved estimate reset semantics.

#### [ ] 17.5. Verify absent optional usage

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/src/core/api/providers/__tests__/openai-native.test.ts`

Add `defaults missing optional cache usage to zero`: completed event for Astra with usage `{input_tokens:10,output_tokens:5,total_tokens:15}`; assert input10/output5/read0/write0 and finite cost .00035. Retain existing tests for argument deduplication, GPT-5.4 retries, early IDs, and summary handling.

### [ ] 18. Test prompt classification and workflow schema parity

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

### [ ] 19. Connect reasoning controls to shared resolution

Requirement source: FR-7, IR-1, IR-4.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/settings/ReasoningEffortSelector.tsx`
- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/settings/providers/OpenAINative.tsx`

#### [ ] 19.1. Add the optional effort resolver

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/settings/ReasoningEffortSelector.tsx`

In ReasoningEffortSelectorProps add `resolveEffort?: (effort?: string) => OpenaiReasoningEffort`; destructure it without a default. Set selectedEffort to `resolveEffort ? resolveEffort(modeFields.reasoningEffort) :` the complete existing guard/allowed-list/medium expression. Keep default allowedEfforts, label, description, onValueChange, and imports unchanged. This permits native resolution of `max` and Astra-none without affecting callers that omit the prop. No effect/hook may write the fallback to settings.

#### [ ] 19.2. Wire native model capabilities

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/settings/providers/OpenAINative.tsx`

In OpenAINative.tsx import `getOpenAiNativeModelProfile` and `resolveOpenAiNativeReasoningEffort` from `@shared/openai-native-models`. After normalization derive `const modelProfile = getOpenAiNativeModelProfile(selectedModelId, "openai-native")`. On ReasoningEffortSelector pass `allowedEfforts={modelProfile?.reasoningEfforts}` and `resolveEffort={modelProfile ? (effort) => resolveOpenAiNativeReasoningEffort(selectedModelId, effort) : undefined}`. Retain existing showReasoningEffort gate and summary control. All other providers continue to omit the new prop; do not edit their screens.

### [ ] 20. Verify UI effort selection without mutating saved preferences

Requirement source: FR-1, FR-7, IR-1, IR-4.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/webview-ui/src/components/settings/__tests__/OpenAINativeModels.spec.tsx`

Create a Vitest/Testing Library module. Import `{render,screen,fireEvent,cleanup}` from `@testing-library/react`, `{afterEach,describe,expect,it,vi}` from `vitest`, `type ApiConfiguration` from `@shared/api`, and `OpenAINativeProvider` from `../providers/OpenAINative`.

Use `vi.hoisted` to create mutable state `{apiConfiguration:{} as ApiConfiguration,planActSeparateModelsSetting:true}` and `handleModeFieldChange = vi.fn()`, `handleFieldChange = vi.fn()`. Mock `@/context/ExtensionStateContext`'s `useExtensionState` to return that state. Mock `../utils/useApiConfigurationHandlers` to return the two spies. Mock `../common/ApiKeyField` and `../common/ModelInfoView` with components returning null. Mock `../common/ModelSelector` with a native select `aria-label="Model"`, value selectedModelId, original onChange callback, and an option for every models key displaying `models[id].name ?? id`.

Mock `@/components/ui/select` as follows: Select renders `<select aria-label="Reasoning Effort" value={value} onChange={e=>onValueChange(e.target.value)}>{children}</select>`; SelectContent returns children; SelectItem renders `<option value={value}>{children}</option>`; SelectTrigger and SelectValue return null. Type mock props explicitly using React `ReactNode`, string, and callbacks; import `type ReactNode` from `react`. Mock `../ReasoningSummarySelector` to return null. These replacements isolate wiring while keeping the actual effort-selector component and capability resolver.

After each test call cleanup and vi.clearAllMocks. For each mode `plan` and `act`, set both provider fields to `openai-native`, both model fields to the case ID, both effort fields to the case value; render `<OpenAINativeProvider currentMode={mode} showModelOptions={true}/>`.

Test `shows model-specific reasoning options`: use all five literal IDs and exact option arrays from FR-7, assert the select's option values and selected value. Test `shows low for saved Astra none without a write`: both saved efforts `none`, select value low, both settings still none, spies not called; rerender after replacing both model IDs with `gpt-5.5`, assert selected none. Test `persists max through the existing Plan and Act handler`: for every 5.6/Astra ID change effort select to max, assert handleModeFieldChange called with `{plan:"planModeReasoningEffort",act:"actModeReasoningEffort"}`, `"max"`, and currentMode. Test `retains legacy options`: GPT-5.4 mini offers only the five legacy values. Test `selects every approved model`: change Model select to each new ID; assert handler receives `{plan:"planModeApiModelId",act:"actModeApiModelId"}`, selected ID and currentMode. No snapshot generation.

### [ ] 21. Run validation and inspect the complete delta

Requirement source: FR-1–FR-10, IR-1–IR-4, NFR-1–NFR-6.

Allowed files / full targets:

- None (read-only validation; temporary/build output only).

Run V1, V2, V3, V4, and the scope audit below. Record exact results in the execution record. A failing command is a pause: report it and its relationship to baseline changes; do not edit outside a prescribed task or erase existing changes. Do not mark this task complete if a required gate has not passed. No source imports, fixtures, or symbols are created in this task.

### [ ] 22. Pause for extension QA and record actual evidence

Requirement source: FR-1–FR-10, requirements §3.2, NFR-6.

Allowed files / full targets:

- `/Users/robertboston/Documents/Cline Extension/cline/docs/Model Support Updates/5-5-through-6-update/action-plan.md`

Stop after automated validation and ask the user to run/authorize the V5 extension QA. Do not mark this task complete on the strength of mocked tests. Record per-model pass/fail/unavailable results below. If account access or credentials are unavailable, report live compatibility as unverified and leave this task unchecked. Do not add API keys or raw private prompts to this document. This plan does not authorize implementation of a QA-discovered defect outside its exact tasks.

## Validation commands and QA

Run commands from the workspace root. These commands are prescribed for implementation, not claimed to have been run during document authoring.

### V1 — Backend and SDK consumer regressions

```sh
npm run test:unit -- 'src/core/api/providers/__tests__/*.test.ts' 'src/core/api/transform/__tests__/*.test.ts' src/shared/__tests__/openai-native-models.test.ts src/core/prompts/system-prompt/__tests__/openai-native-models.test.ts src/core/prompts/system-prompt/__tests__/integration.test.ts src/core/prompts/system-prompt/__tests__/spec.test.ts src/utils/__tests__/model-utils.test.ts src/utils/cost.test.ts src/shared/__tests__/getApiMetrics.test.ts src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts src/core/task/__tests__/responseToolTurnFlow.test.ts src/core/task/__tests__/ToolExecutor.workflowModelToolLifecycle.test.ts
```

The provider glob includes native OpenAI, compatible OpenAI, OpenRouter, Vercel, OCA, LiteLLM, SAP, WandB, and the other existing provider suites. The transform glob protects SDK tool/message conversions. Do not use `--update-snapshots`. New test paths are created by Tasks 16/18 before this command.

### V2 — Webview

```sh
npm --prefix webview-ui run test -- src/components/settings/__tests__/OpenAINativeModels.spec.tsx src/components/settings/__tests__/APIOptions.spec.tsx
```

The new test path is created by Task 20.

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
```

Do not package, publish, or install the extension automatically. Build artifacts are generated output, not new tracked source changes.

### Scope audit

```sh
git diff --check
git diff --name-only
git ls-files --others --exclude-standard
git diff -- package.json package-lock.json src/shared/storage/types.ts src/shared/api.ts src/utils/model-utils.ts src/core/task/index.ts src/core/api/providers/openai-native.ts
```

Compare with the pre-implementation baseline, not with an assumed clean tree. For files already dirty, review the implementation delta against the saved baseline diff. Every new tracked/untracked source change must belong to a task's allowed-file list. The initial requirements revision and this action plan are documentation baseline changes, not proof that implementation has happened. No source deletion, snapshot rewrite, provider-default change, workflow module change, or credential file is authorized.

### V5 — Manual extension QA (mandatory pause)

Use a disposable test workspace and an OpenAI account that can access each of the five approved models. Use existing native tool settings and approval controls. For each model record:

1. Select the model in Plan and Act with separate settings enabled, save, reload the extension, and confirm both IDs are retained. Run a small task and confirm request diagnostics show the selected ID and Responses HTTP path.
2. Exercise the available effort choices, including max on 5.6/Astra. Select none on GPT-5.5, switch to Astra, and confirm effective low; switch back and confirm none remains saved. Confirm Plan/Act separation.
3. Ask the model to read a test file and modify it through the existing apply-patch tool; approve through the normal UI. Confirm a follow-up tool turn continues from the earlier response ID. Interrupt after a native tool call, resume, and confirm no orphaned tool-output or duplicated-history error.
4. Start Document Project in the disposable workspace, complete its entry forms, exercise a model-driven step, then interrupt/reload/resume. Confirm current workflow step, values, permitted per-step tools, and downstream focus-chain projection survive. Do not alter the module or its prescribed prompt text. For compaction, inspect the outgoing `context_management` threshold and validate compaction event/resume through the automated fixture; do not deliberately spend hundreds of thousands of tokens solely to trigger a live threshold.
5. Inspect usage for a completed response. Confirm output includes reasoning once, reads/writes remain separate, and cost is a per-response estimate. Cache hits/writes depend on provider behavior; lack of a hit is not itself a test failure. Verify one existing GPT-5.4 or mini task still works and an older GPT-5.2 selection retains its prior routing.

Record access failures separately from implementation failures. Live smoke testing does not establish exact GPT-5.5 invoice equivalence.

## Delta fallout audit

- `OpenaiReasoningEffort` is widened while its legacy option array and guard remain unchanged. Existing CLI controls and other-provider normalizers do not start sending max. The native resolver and controller storage seam are the explicit exceptions.
- `api.ts` imports a shared module that imports its model interface only as a type; there is no runtime import cycle. Literal catalog keys retain `OpenAiNativeModelId` discrimination. No protobuf additions or generated converters are required.
- The GPT-5-only classifier remains exported for existing consumers/tests. Task/variant/apply-patch imports are replaced only where prescribed. Native provider retains the old classifier for its legacy request path and combines it with the profile in compaction.
- `isNextGenModelFamily` gains an optional argument, so remaining one-argument callers retain the existing contract. The parent, matcher, and child call sites requiring Astra eligibility explicitly receive provider identity.
- The child method gains a required argument; its single production caller, reflected test signature, and spy forwarding are prescribed in Task 13. No child prompt behavior is independently redesigned.
- Reasoning accounting cleanup removes two local variables and replaces both consumers; its incorrect fixture and assertion are replaced. Existing usage stream and persisted `api_req_started` fields already carry separate cache counts; Task 17 verifies that path rather than changing history formats.
- New selector props are optional. Other provider screens and their default behavior remain untouched. Effective Astra low does not trigger a settings write.
- No new workflow prompt placeholder is introduced. Existing workflow materialization and forbidden-placeholder coverage remain active in the integration suite; new tests protect tool-schema invariants rather than editable prose.
- SDK 6.49 retains the currently used imports and request/event types, verified in the published package and read-only compiler inspection. V1 validates runtime effects across existing SDK consumer suites. No speculative SDK consumer rewrites are prescribed.

## Compliance matrix

“Existing” means inspected in the current working tree; “new” identifies its defining earlier task. None of the steps relies on an undefined symbol. File paths below are repository-relative equivalents of the absolute task targets.

| Task/Subtask | Requirement Source | Target File | Symbols Verified | Live Contract Verified | Fallout Cleanup Prescribed | Validation Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | IR-2, IR-3, IR-4, FR-10 | `package.json`<br>`package-lock.json` | OpenAI SDK ReasoningEffort/ResponseUsage verified in published 6.49.0 | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 2 | FR-7, FR-10 | `src/shared/storage/types.ts` | OpenaiReasoningEffort, options, guard and normalizer existing | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V2, V3 |
| 3 | FR-1, FR-2, FR-5, FR-6, FR-7, FR-9, IR-4, NFR-1 | `src/shared/openai-native-models.ts` | New exports defined here; ModelInfo and ApiFormat existing | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V2, V3 |
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
| 15 | FR-7, IR-4 | `src/core/controller/state/reasoningEffort.ts` | Controller normalizer existing; Task 2 type | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V2, V3 |
| 16 | FR-1, FR-2, FR-7, FR-10, IR-4 | `src/shared/__tests__/openai-native-models.test.ts` | Existing converters/enum; Tasks 2–4/15 exports | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 17 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Provider seams, stream discriminants, metrics and test fixtures verified | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3 |
| 18 | FR-5, FR-6, FR-10, NFR-2 | `src/core/prompts/system-prompt/__tests__/openai-native-models.test.ts` | Registry getModelFamily/getSystemPrompt and override shapes verified; Tasks 3/5 helpers | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1, V3, V5 |
| 19 | FR-7, IR-1, IR-4 | `webview-ui/src/components/settings/ReasoningEffortSelector.tsx`<br>`webview-ui/src/components/settings/providers/OpenAINative.tsx` | Existing props and normalized model ID verified; Tasks 2/3 types | Yes; task gives exact shape/call sites | Yes; task and delta audit | V2, V3 |
| 20 | FR-1, FR-7, IR-1, IR-4 | `webview-ui/src/components/settings/__tests__/OpenAINativeModels.spec.tsx` | Actual provider and selector wiring; Vitest/RTL available | Yes; task gives exact shape/call sites | Yes; task and delta audit | V2, V3 |
| 21 | FR-1–FR-10, IR-1–IR-4, NFR-1–NFR-6 | Read-only | Commands and paths verified during authoring | Yes; task gives exact shape/call sites | Yes; task and delta audit | V1–V4, scope audit |
| 22 | FR-1–FR-10, requirements §3.2, NFR-6 | `docs/Model Support Updates/5-5-through-6-update/action-plan.md` | Existing extension UI/runtime; no new symbols | Yes; task gives exact shape/call sites | Yes; task and delta audit | V5 |
| 13.1 | FR-6, FR-10 | `src/core/task/tools/subagent/SubagentRunner.ts` | Production child signature/call; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 13.2 | FR-6, FR-10 | `src/core/task/tools/subagent/__tests__/SubagentRunner.test.ts` | Reflected test type and forwarding; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 14.1 | FR-3, FR-4, FR-6, FR-7, FR-8, FR-9 | `src/core/api/providers/openai-native.ts` | Request reasoning; detailed in parent task | Yes | Explicit in subtask | V1, V3, V5 |
| 14.2 | FR-3, FR-4, FR-6, FR-7, FR-8, FR-9 | `src/core/api/providers/openai-native.ts` | Compaction guard; detailed in parent task | Yes | Explicit in subtask | V1, V3, V5 |
| 14.3 | FR-3, FR-4, FR-6, FR-7, FR-8, FR-9 | `src/core/api/providers/openai-native.ts` | Usage accounting; detailed in parent task | Yes | Explicit in subtask | V1, V3, V5 |
| 17.1 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Obsolete additive-token assertion; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 17.2 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Request/stream fixtures; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 17.3 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Persisted usage fixture; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 17.4 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Price boundary fixtures; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 17.5 | FR-1–FR-4, FR-6–FR-10, IR-3 | `src/core/api/providers/__tests__/openai-native.test.ts` | Missing optional usage; detailed in parent task | Yes | Explicit in subtask | V1, V3 |
| 19.1 | FR-7, IR-1, IR-4 | `webview-ui/src/components/settings/ReasoningEffortSelector.tsx` | Selector resolver prop; detailed in parent task | Yes | Explicit in subtask | V2, V3 |
| 19.2 | FR-7, IR-1, IR-4 | `webview-ui/src/components/settings/providers/OpenAINative.tsx` | Provider profile wiring; detailed in parent task | Yes | Explicit in subtask | V2, V3 |

## Authoring audit and execution record

Authoring audit: every task traced to requirements; model IDs and metadata centralized; imports/callers and narrowing prescribed; task ordering creates new symbols before consumption; obsolete accounting assertion identified; existing prompt wording preserved; required commands and QA separated from completion claims.

Implementation record (fill only when executed):

| Gate | Result | Evidence / blockers |
| --- | --- | --- |
| SDK version | Not run | |
| V1 | Not run | |
| V2 | Not run | |
| V3 | Not run | |
| V4 | Not run | |
| Scope audit | Not run | |
| V5 GPT-5.5 | Not run | |
| V5 GPT-5.6 Sol | Not run | |
| V5 GPT-5.6 Terra | Not run | |
| V5 GPT-5.6 Luna | Not run | |
| V5 GPT-6 Astra | Not run | |
| Existing-model QA | Not run | |
