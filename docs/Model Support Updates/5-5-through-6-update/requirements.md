# OpenAI GPT-5.5 Through GPT-6 Model Support Requirements

Status: Draft for user review. Requirements only; implementation is not authorized by this document.

Evidence reviewed: September 17, 2026. Code references describe the current working tree, including existing uncommitted work.

## 1. Introduction

### 1.1 Purpose

Extend the OpenAI API-key provider to support the approved models released after GPT-5.4, through GPT-6 Astra. Each addition must receive the existing GPT-5.4 integration behavior, including Responses API conversation continuity, native tools, compact prompt assembly, and context management, with the adaptations required by its documented API contract.

The objective is usable model support throughout an existing Cline task and workflow, rather than model-picker entries alone.

### 1.2 Document Conventions

- **Must** denotes a mandatory requirement.
- `FR-*`, `IR-*`, and `NFR-*` identify functional, interface, and non-functional requirements.
- Model IDs, API fields, and source identifiers appear in monospace.
- Current implementation observations are evidence, not requirements to preserve defects.
- Model capability limits are distinct from per-request generation budgets.

### 1.3 Intended Audience

The repository owner approves product scope and behavior. Architecture and action-plan authors translate these requirements into prescribed changes. Backend, prompt-system, and webview developers implement the approved plan. Testers verify model integration and regression protection.

### 1.4 Scope and Approved Decisions

The user approved the **OpenAI API-key provider**, internally `openai-native`, and these five additions:

| Display identity | API model ID |
| --- | --- |
| GPT-5.5 | `gpt-5.5` |
| GPT-5.6 Sol | `gpt-5.6-sol` |
| GPT-5.6 Terra | `gpt-5.6-terra` |
| GPT-5.6 Luna | `gpt-5.6-luna` |
| GPT-6 Astra | `gpt-6-astra` |

The existing `gpt-5.4-2026-03-05` and `gpt-5.4-mini-2026-03-17` entries remain supported. The approved list includes Luna; no additional model IDs are implied by the earlier description of “main and mini.”

The user also approved:

- A saved reasoning effort of `none` must resolve to `low` when using GPT-6 Astra.
- Reviewing and correcting the shared OpenAI native Responses accounting behavior, including reasoning-token double counting and missing cache-write usage.
- Upgrading the OpenAI SDK and validating affected providers.
- Centralizing explicit model capabilities for backend and UI consumers.
- Using per-response cost estimates and deferring exact GPT-5.5 session-level billing after investigation did not resolve OpenAI's session boundary.

This update supports access to newer models while retaining the fork's existing task and workflow integration. It does not expand the ChatGPT subscription (`openai-codex`) or OpenAI-compatible (`openai`) provider catalogs or introduce a new provider.

### 1.5 References

Repository requirements and architecture:

- [Requirements authoring guidelines](../../requirements-guidelines.md)
- [Core application architecture](../../../src/core/README.md)
- [System prompt documentation](../../../src/core/prompts/system-prompt/README.md)
- [Workflow runtime architecture](../../workflows/workflow-runtime/architecture.md)
- [Workflow runtime requirements](../../workflows/workflow-runtime/requirements.md)
- [OpenAI native early response-ID action plan](../../context-management/openai-native-early-response-id-action-plan.md), historical context for the existing continuity behavior; its patch-specific restrictions are not a plan for this update.

Current implementation evidence:

- [Model catalogs](../../../src/shared/api.ts)
- [OpenAI native provider](../../../src/core/api/providers/openai-native.ts) and [provider tests](../../../src/core/api/providers/__tests__/openai-native.test.ts)
- [Responses history transformation](../../../src/core/api/transform/openai-response-format.ts)
- [Model classification](../../../src/utils/model-utils.ts)
- [Task orchestration](../../../src/core/task/index.ts)
- [Native GPT prompt selection](../../../src/core/prompts/system-prompt/variants/native-gpt-5/config.ts) and [apply-patch tool eligibility](../../../src/core/prompts/system-prompt/tools/apply_patch.ts)
- [OpenAI settings](../../../webview-ui/src/components/settings/providers/OpenAINative.tsx) and [reasoning values](../../../src/shared/storage/types.ts)
- [Cost calculation](../../../src/utils/cost.ts)

External API contracts, verified on the evidence date:

- [GPT-5.5](https://developers.openai.com/api/docs/models/gpt-5.5)
- [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), and [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) and [migration guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra)
- [Reasoning and output usage](https://developers.openai.com/api/docs/guides/reasoning)
- [Prompt caching and cache-write accounting](https://developers.openai.com/api/docs/guides/prompt-caching)

## 2. General Description

### 2.1 Product Perspective and Current Baseline

This is an extension of existing provider, model-selection, prompt, and usage surfaces. No separate architecture document for this model update exists yet. This requirements document records the user's approved scope within the existing application and workflow architecture; it does not prescribe new ownership boundaries.

The current native catalog includes GPT-5.4 and GPT-5.4 mini, but none of the five additions. Its default model is `gpt-5.2`. GPT-5.4 and mini select `OPENAI_RESPONSES`; several older GPT entries use different request paths.

The current GPT-5.4 Responses path stores HTTP responses, sends `previous_response_id` with the corresponding incremental input, emits reusable response IDs before completion, and retries eligible broken chains with full history. It does not send the catalog's maximum output-token capability as a default request budget.

GPT-5 classification currently controls compact prompts, reduced environment details, native GPT prompt selection, apply-patch eligibility, and server-side compaction. `isGPT5ModelFamily` recognizes GPT-5 names but not GPT-6 Astra. The global reasoning value set stops at `xhigh`. These are integration gaps for the additions, not evidence that a catalog-only change would be sufficient.

The Responses usage handler currently adds `reasoning_tokens` to `output_tokens` and assigns zero cache-write tokens. OpenAI's usage contract includes reasoning within output usage and exposes cache-write usage for newer models. Accounting correctness is an explicitly approved exception to preserving existing shared native Responses behavior.

### 2.2 Product Features

The update provides model selection and persistence, model-appropriate reasoning settings, GPT-5.4-equivalent task and workflow integration, valid Responses requests, and accurate usage and cost reporting for the approved scope.

### 2.3 User Classes and Characteristics

- Extension users select models and reasoning effort independently for Plan and Act modes and run ordinary tasks or product-owned workflows.
- Repository maintainers maintain model metadata and provider compatibility.
- Testers exercise request contracts, long-running tool conversations, workflow continuation, and usage reporting.

### 2.4 Operating Environment

The feature operates in the existing VS Code extension backend and webview, using the existing OpenAI API-key credentials, settings persistence, network client, and supported operating systems. It introduces no hardware or platform requirements.

### 2.5 Constraints

- `src/core/task/index.ts` remains the application orchestrator. `WorkflowRuntime` retains workflow session, progression, persistence, and resume ownership. Workflow modules retain step definitions and tool schemas; focus chain remains a projection.
- Existing prompt wording, workflow behavior, tool permissions, and older-model request routing must not be redesigned as part of model support.
- Shared changes must be limited to the approved integration and accounting requirements, with regression evidence for existing consumers.
- Requirements approval does not establish implementation completion. Implementation must follow a separately authorized action plan and applicable repository guidance.

### 2.6 Assumptions and Dependencies

API access depends on the user's OpenAI account permissions and model availability. Catalog presence cannot grant access. Model specifications and prices are externally maintained and must be rechecked when preparing the implementation plan. The user selected an SDK upgrade rather than a compatibility adaptation. The action plan must prescribe a version that supports the required effort and usage fields and validate affected provider consumers without introducing a new platform requirement.

## 3. System Requirements

### 3.1 Functional Requirements

**FR-1 — Model selection and persistence.** All five approved IDs must be selectable in the native OpenAI provider in both Plan and Act configurations. Selection must survive settings persistence, extension reload, and task resume. Each selected ID must reach the API unchanged and must not silently resolve to the default model. Existing selections and the existing provider default must remain intact.

**FR-2 — Model capabilities and prices.** Each addition must declare image input, prompt caching, reasoning, native tools, a 1,050,000-token context window, and a 128,000-token output capability. Metadata and cost calculation must reflect the applicable standard API rates below, expressed in USD per million tokens. These are capability and billing values, not a new default request budget or a guarantee of model access.

| Model | Input | Cached input | Cache write | Output |
| --- | ---: | ---: | ---: | ---: |
| GPT-5.5 | 5.00 | 0.50 | No separate cache-write rate | 30.00 |
| GPT-5.6 Sol | 4.00 | 0.40 | 5.00 | 20.00 |
| GPT-5.6 Terra | 2.00 | 0.20 | 2.50 | 12.00 |
| GPT-5.6 Luna | 0.20 | 0.02 | 0.25 | 1.20 |
| GPT-6 Astra | 10.00 | 1.00 | 12.50 | 50.00 |

The linked model references specify increased rates above 272,000 input tokens: twice the applicable input/cache rates and 1.5 times the output rate. Cost estimates must select the tier independently for each response using its reported total input tokens. The user approved this estimation method after investigation could not establish the billing-session boundary in OpenAI's GPT-5.5 documentation. Exact session-level billing is deferred; GPT-5.5 estimates may differ from the final invoice after a response exceeds the threshold and a later response falls below it. No persisted billing-session state or retroactive repricing is required. Exactly 272,000 input tokens remains in the lower tier. Sol's published promotional pricing is stated to last at least through November 21, 2026; later updates require renewed verification.

**FR-3 — Responses request compatibility.** All additions must use the existing GPT-5.4 HTTP Responses path with structured native tool definitions and the existing native-tools prerequisite. Requests must omit unsupported parameters. In particular, Astra must not receive `temperature`, `top_p`, `top_logprobs`, or the unsupported output-logprobs include value. The catalog output ceiling must not introduce a default `max_output_tokens` limit absent from the GPT-5.4 path. New transport or hosted-tool capabilities are not required.

**FR-4 — Conversation continuity.** The additions must retain stored-response chaining, incremental input after the selected response anchor, early response-ID emission and deduplication, and existing eligible full-history recovery. Tool calls interrupted before `response.completed` must still provide the task loop with a reusable response ID. Continuation must retain tool-call/result associations and must not duplicate or discard history through model-specific routing mistakes.

**FR-5 — Prompt and tool parity.** For equivalent task settings and workflow state, each addition must receive the same compact prompt behavior, reduced environment details, native GPT variant, and eligible application tools as GPT-5.4. This includes apply-patch and workflow-owned per-step tool definitions. GPT-5.1/GPT-5.2-specific prompt routing must not be applied merely because an addition is a newer GPT model. Existing full-prompt/continuation selection, instruction priority, refresh cadence, and prompt wording must remain intact.

**FR-6 — Context management and resume.** Each addition must participate in the existing GPT-5.4 server-side compaction policy and application context-management eligibility. The current server threshold is half the model context window, bounded to 80,000–120,000 tokens; the approved additions consequently use 120,000. Compaction events, persisted history, task resume, and workflow resume must retain their existing contracts. Model support must not move active-step authority into prompts or focus chain.

**FR-7 — Reasoning settings.** The selectable and transmitted reasoning efforts must respect this matrix:

| Model | Supported efforts |
| --- | --- |
| GPT-5.5 | `none`, `low`, `medium`, `high`, `xhigh` |
| GPT-5.6 Sol, Terra, Luna | `none`, `low`, `medium`, `high`, `xhigh`, `max` |
| GPT-6 Astra | `low`, `medium`, `high`, `xhigh`, `max` |

`max` must survive UI selection, persistence, backend normalization, and request construction for models that support it. A saved `none` value must resolve to effective `low` for Astra in both UI and backend, including configurations loaded without a new UI selection. The stored preference must not be globally rewritten so that switching models unexpectedly changes an otherwise valid setting. Other unsupported or invalid saved values must use the existing effective `medium` fallback. Existing reasoning-summary configuration must continue to work where supported. Settings behavior for GPT-5.4 and earlier models must remain unchanged; the new models must not be sent unsupported values.

**FR-8 — Usage accounting.** The shared native Responses path must count reported output tokens once; reasoning-token details must not be added again to an inclusive output total. It must preserve reported cached-input and cache-write usage, use zero for absent optional cache counts, and calculate non-cached input consistently with the API's accounting definitions. The existing usage stream, persisted task usage, and displayed totals must retain the distinct categories without duplication. Corrections apply to native Responses consumers, including existing models, without retroactively rewriting historical stored records.

**FR-9 — Cost accounting.** Cost estimates must use the selected model's applicable rates and the corrected token categories. Cache writes must not be silently billed as zero or ordinary input for GPT-5.6 and Astra. Tier selection must use each response's reported total input tokens, including cached input, under the approved per-response estimation policy in FR-2. Missing optional usage details must not produce invalid numbers. Existing other-provider accounting contracts must remain intact.

**FR-10 — Bounded compatibility.** Existing GPT-5.4/main-mini selection, tool execution, request chaining, and workflow behavior must remain supported. Older GPT request formats and provider defaults must remain intact except for the expressly approved shared native Responses accounting correction. This update must not add subscription-provider support, broaden unrelated provider behavior, or infer support for future unverified model IDs.

### 3.2 Acceptance Evidence

| Requirements | Required evidence |
| --- | --- |
| FR-1, FR-2 | Each approved ID resolves correctly after Plan/Act persistence; limits and rates agree with reviewed sources. |
| FR-3, FR-4 | Parameter and streaming tests cover all additions, native tools, continuation after an interrupted tool turn, and existing chain-recovery cases. |
| FR-5, FR-6 | Prompt/tool eligibility and context tests establish parity with GPT-5.4; regression coverage retains older-model variants and workflow-owned tool contracts. |
| FR-7 | Supported efforts round-trip; `max` remains `max`; Astra resolves saved `none` to `low`; unsupported values use the specified fallback without changing another model's saved preference. |
| FR-8, FR-9 | Numeric fixtures cover reasoning as a subset of output, cache reads/writes, absent optional details, and tier boundaries below/at/above 272,000 input tokens, including a high-input response followed by a lower-input response that independently returns to the lower tier. |
| FR-10 | Existing native provider and affected shared-consumer regressions pass; catalog/default and unrelated-provider behavior remain unchanged. |

Validation must include an extension-level smoke test of model selection, a native tool turn and continuation, and workflow execution/resume for the additions using an account with access. Missing credentials or unavailable models must be reported as unverified live behavior. Mocked tests and document approval must not be presented as proof of live API compatibility. Exact test commands and QA pause points belong in the action plan.

## 4. External Interface Requirements

### 4.1 User Interfaces

**IR-1.** Use the existing native OpenAI model selector, Plan/Act settings, reasoning-effort and summary controls, model information, and usage displays. New entries and model-specific effort choices must appear there. No new settings screen, authentication flow, or unrelated wording change is required.

### 4.2 Hardware Interfaces

**IR-2.** Retain the extension's existing supported hardware and OS interfaces. No model-specific hardware integration is required.

### 4.3 Communications Interfaces

**IR-3.** Use the existing authenticated OpenAI HTTPS Responses integration and streaming event handling. Preserve current cancellation, retry, and error-reporting contracts. API access failures must remain distinguishable from successful model resolution. WebSocket transport, async hosted tools, and mid-turn steering are not part of GPT-5.4 parity for this update.

### 4.4 Software Interfaces

**IR-4.** Backend and webview must agree on model IDs, supported efforts, effective fallback behavior, and capability metadata. Provider output must remain compatible with the existing task loop, API stream, history persistence, context management, and usage displays. SDK/API compatibility must be validated explicitly for newer fields and effort values; changing a type alone does not establish support.

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

**NFR-1.** FR-1/FR-2/FR-7 must use the existing local settings and metadata flow without adding a blocking network lookup on each selection or turn. FR-3 through FR-6 must preserve incremental requests and prompt/context reductions to avoid resending full history except through existing recovery conditions. FR-8/FR-9 must calculate usage from received events without adding API calls. FR-10 must not introduce additional requests for existing models. These requirements preserve the current integration's latency and context-use characteristics; model inference speed and cache-hit rates are not guaranteed.

### 5.2 Safety Requirements

**NFR-2.** New model selection must not bypass existing tool approvals, workflow progression checks, or completion checks. Correcting usage totals must not create new authority for the model or change workflow state ownership.

### 5.3 Security Requirements

**NFR-3.** Retain existing API-key storage, authentication, transport security, and logging boundaries. Do not introduce credentials into documentation, fixtures, or logs. Preserve the existing GPT-5.4 stored-response behavior; no additional external service or data-sharing integration is required.

### 5.4 Software Quality Attributes

**NFR-4.** Model identity, capabilities, and effort support must remain consistent across UI and backend. Regression coverage must establish both new-model behavior and preservation of existing paths. Architecture and action-plan authors must surface ambiguous API semantics or conflicting requirements before prescribing implementation; unverified compatibility must not be hidden behind broad model-name matching.

### 5.5 Other Requirements and Scope Boundaries

**NFR-5.** This update does not require new model-native capabilities such as pro mode, hosted computer use, programmatic tool calling, explicit prompt-cache breakpoint controls, persisted-reasoning controls, or new service-tier settings. Existing Cline tools and workflow integration define the requested parity. An API-required adaptation remains in scope; an additional product feature requires separate approval.

**NFR-6.** The implementation plan must identify exact allowed files, required validation, and QA pauses under the [action plan guide](../../action-plan-guide.md). Any effect on existing behavior beyond the approved shared native Responses accounting correction must be surfaced separately for user approval. Requirements review, architecture decisions, implementation, and live validation are distinct completion states.
