---
title: Test 35 Turn-Reduction Action Plan
instructions:
  - Read this document from top to bottom before making any changes.
  - Read each step in full before executing that step.
  - Execute only the current step.
  - After completing a step, update that step's checkbox from `[ ]` to `[x]`.
  - After marking a step complete, stop and read the next step in full before making any additional change.
  - Do not edit any file that is not listed in the current step's allowed-files list.
  - Do not make any change that is not explicitly prescribed here.
  - If any ambiguity is discovered, or any additional change appears necessary that is not explicitly prescribed here, stop immediately and ask for input.
  - Use `apply_patch` for every file edit.
---

# Test 35 Turn-Reduction Action Plan

## Goal
Reduce turn count for `dev-story.md`-style runs by allowing one coherent full-file read after the model has already narrowed the work to a single concrete file, while preserving the bounded-read protections that were added to prevent 200k-token tool-output blowups.

## Source Of Truth
- Production evidence: [test-35-log.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-35-log.md#L14) through [test-35-log.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-35-log.md#L52414)
- External workflow prompt surfaces to keep aligned: `/Users/robertboston/Documents/Cline/Workflows`
- `dev-story.md` tool surface: [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L211)
- Bounded full-read constants: [readFileContentUtils.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/utils/readFileContentUtils.ts#L8)
- Native `read_file` enforcement: [ReadFileToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/ReadFileToolHandler.ts#L201)
- Indxr `read_source` enforcement: [UseMcpToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseMcpToolHandler.ts#L268)
- Prompt guidance seam: [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L190)
- Native tool-description seam: [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L480)
- Responses API system-prompt resend seam: [openai-native.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/providers/openai-native.ts#L422)
- Historical large-tool compaction seam: [ContextManager.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-management/ContextManager.ts#L22)

## Observed Runtime Pattern
- The final `dev-story.md` run begins at [test-35-log.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-35-log.md#L14) and activates the workflow at [test-35-log.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-35-log.md#L24).
- The first AI-visible step after workflow-start resolution is already Step 2, with a 3486-character step prompt at [test-35-log.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-35-log.md#L37).
- The run reaches `apiRequestCount: 92` at [test-35-log.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-35-log.md#L51810) and totals `143160` Responses tokens at [test-35-log.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-35-log.md#L52414).
- Early turns show the pattern this plan is targeting: two full reads on the first request at [test-35-log.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-35-log.md#L42), then repeated `read_file_range` calls at [test-35-log.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-35-log.md#L77), followed by repeated `use_mcp_tool` exploration at [test-35-log.md](/Users/robertboston/Documents/Cline%20Extension/cline/docs/prod-testing/test-35-log.md#L112).
- Because Responses sends `instructions` every turn at [openai-native.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/providers/openai-native.ts#L422), turn count matters materially. This plan therefore optimizes for fewer exploration turns, not for suppressing step instructions.

## Locked Decisions
- Raise the bounded full-read allowance to exactly `800` lines and exactly `65_536` bytes.
- Keep Indxr-first discovery intact.
- Keep overlap tracking and overlap-notice behavior intact.
- Keep historical large-tool compaction intact.
- Do not change workflow-step injection cadence for Responses.

## Scope Guard
- This plan changes only the bounded full-read thresholds, the prompt guidance that teaches the model when to use one full read after narrowing to a single file, the exact tests that cover those contracts, and the prompt snapshots that assert the same strings.
- Do not change the `dev-story.md` tool matrix in [contextualToolMatrix.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/registry/contextualToolMatrix.ts#L211-L216).
- Do not change overlap constants or source-window tracking in [readFileContentUtils.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/utils/readFileContentUtils.ts#L10-L120).
- Do not change overlap-notice behavior in [UseMcpToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseMcpToolHandler.ts#L254-L266).
- Do not change Responses prompt transport in [openai-native.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/api/providers/openai-native.ts#L422-L428).
- Do not change compaction thresholds or large-tool classification in [ContextManager.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/context/context-management/ContextManager.ts#L22-L37).
- Do not broaden this work into workflow redesign, Indxr server changes, or log-format changes.
- Do not edit any external workflow file other than the exact files explicitly prescribed in Step 4.

## [x] Step 1: Raise The Bounded Full-Read Thresholds In Runtime Enforcement And Handler Tests
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/utils/readFileContentUtils.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/ReadFileToolHandler.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/UseMcpToolHandler.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/ReadFileToolHandler.repeatReads.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/task/tools/handlers/__tests__/UseMcpToolHandler.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/prod-testing/test-35-action-plan.md`
- Prescribed changes:
  - In [readFileContentUtils.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/utils/readFileContentUtils.ts#L8-L11), change only these two constants:
    - `MAX_FULL_SOURCE_READ_LINES` from `300` to `800`
    - `MAX_FULL_SOURCE_READ_BYTES` from `16_384` to `65_536`
  - Do not change `SOURCE_RANGE_OVERLAP_REUSE_RATIO` or `MAX_TRACKED_SOURCE_WINDOWS_PER_FILE`.
  - In [ReadFileToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/ReadFileToolHandler.ts#L201-L205) and [ReadFileToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/ReadFileToolHandler.ts#L256-L260), change the blocked-read message string only. Replace `300-line / 16384-byte full-read limit` with `800-line / 65536-byte full-read limit`. Do not change any other wording in that message.
  - In [UseMcpToolHandler.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/UseMcpToolHandler.ts#L268-L270), change the blocked-read message string only. Replace `300-line / 16384-byte full-read limit` with `800-line / 65536-byte full-read limit`. Do not change any other wording in that message.
  - In [ReadFileToolHandler.repeatReads.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/ReadFileToolHandler.repeatReads.test.ts#L205-L236), keep the existing test names but update the fixtures and assertions exactly as follows:
    - In the existing `"blocks full-file reads that exceed the bounded full-read limit"` test, change the generated fixture from `301` lines to `801` lines, change the negative-content assertion from `"line 301"` to `"line 801"`, and change the expected blocked-limit string to `800-line / 65536-byte full-read limit`.
    - Immediately after that test, add one new test named exactly `"allows full-file reads at the 800-line threshold"`. The test must:
      - write a file containing exactly `800` lines with no trailing newline
      - call `handler.execute(config, makeBlock(relPath))`
      - assert that the returned string includes `"line 800"`
      - assert that the returned string does not include `"[Full file read blocked]"`
      - assert that `taskState.fileReadCache.get(absolutePath.toLowerCase())` is defined
    - In the existing `"blocks oversized full-file reads instead of caching them"` test, change the fixture from `"a".repeat(200_000)` to `"a".repeat(65_537)`, keep the cache assertion, and change the expected blocked-limit string to `800-line / 65536-byte full-read limit`.
    - Immediately after that test, add one new test named exactly `"allows full-file reads at the 65536-byte threshold"`. The test must:
      - write a file containing exactly `"a".repeat(65_536)`
      - call `handler.execute(config, makeBlock(relPath))`
      - assert that the returned string length is `65_536`
      - assert that the returned string does not include `"[Full file read blocked]"`
      - assert that `taskState.fileReadCache.get(absolutePath.toLowerCase())` is defined
  - In [UseMcpToolHandler.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/task/tools/handlers/__tests__/UseMcpToolHandler.test.ts#L109-L155), update and extend the MCP bounded-read coverage exactly as follows:
    - In the existing `"blocks oversized non-targeted read_source payloads"` test, change `end_line` from `301` to `801`, change the generated source fixture from `301` lines to `801` lines, change the negative-content assertion from `"line 301"` to `"line 801"`, and add an assertion that the result includes `800-line / 65536-byte full-read limit`.
    - Immediately after that test, add one new test named exactly `"allows non-targeted read_source payloads at the 800-line threshold"`. The test must:
      - use a resource with `start_line: 1`, `end_line: 800`, and exactly `800` lines of source with no trailing newline
      - call `handler.execute(config, makeBlock("read_source", JSON.stringify({ path: "src/allowed.ts" })))`
      - assert that the result includes `"[MCP source range 1-800] src/allowed.ts"`
      - assert that the result includes `"line 800"`
      - assert that the result does not include `"[MCP full source read blocked]"`
  - Do not change any other tests in either file during this step.

## [x] Step 2: Update Prompt Guidance So Narrowed Work Prefers One Coherent Full Read
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/components/mcp.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/spec.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/next-gen/template.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/template.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/prod-testing/test-35-action-plan.md`
- Prescribed changes:
  - In [mcp.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/components/mcp.ts#L190-L199), replace the four guidance strings exactly as follows:
    - Replace the Indxr branch of `readFileGuidance` with:
```ts
"When Indxr is available, use its tools first for discovery, summaries, symbol lookup, dependency tracing, and targeted source reads. Once you have narrowed the work to one concrete file, prefer a single read_file call when that file is at or below 800 lines and 65536 bytes and you need the full raw contents for editing; otherwise keep using targeted source reads or read_file_range."
```
    - Replace the non-Indxr branch of `readFileGuidance` with:
```ts
"Prefer using search_files and list_code_definition_names first to narrow the target, then use read_file_range for targeted inspection. Once you have narrowed the work to one concrete file, prefer a single read_file call when that file is at or below 800 lines and 65536 bytes and you need the full raw contents, rather than stitching together many nearby range reads."
```
    - Replace the Indxr branch of `readFileRangeGuidance` with:
```ts
"Use this when you need exact raw line-based inspection after Indxr has already narrowed the target, when the file exceeds the full-read limit, or when Indxr is insufficient."
```
    - Replace the non-Indxr branch of `readFileRangeGuidance` with:
```ts
"Use this after search_files or list_code_definition_names has narrowed the problem to a focused region, when the file exceeds the full-read limit, or when you need a targeted refresher without replaying the entire file."
```
    - Replace the Indxr branch of `useMcpToolGuidance` with:
```ts
` When Indxr is available, default to its MCP tools first for code exploration, symbol lookup, file understanding, dependency tracing, and targeted source reads before using built-in \`search_files\`, \`list_code_definition_names\`, \`read_file\`, or \`read_file_range\`. After you have narrowed the task to one concrete file, prefer one full raw read only when the file is at or below 800 lines and 65536 bytes; otherwise prefer symbol-targeted or explicit line-range reads. Use built-in file tools only when exact raw file contents, regex search, or direct line inspection are required.`
```
  - In [spec.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/spec.ts#L480-L499), update only the Indxr-connected tool descriptions exactly as follows:
    - Replace the `use_mcp_tool` connected description with:
```ts
"Use a connected MCP tool. When Indxr is available, default to its exploration tools first for code exploration, symbol lookup, file understanding, dependency tracing, and targeted source reads. After you have narrowed the task to one concrete file, prefer one full raw read only when the file is at or below 800 lines and 65536 bytes; otherwise prefer symbol-targeted or explicit line-range source reads."
```
    - Replace the `read_file` connected description with:
```ts
"Use Indxr first for discovery, summaries, symbol lookup, dependency tracing, and targeted source reads. Once the task is narrowed to one concrete file, use read_file when exact full raw file contents are required for a file at or below 800 lines and 65536 bytes, or when Indxr is insufficient."
```
    - Replace the `read_file_range` connected description with:
```ts
"Use only when exact raw line-based inspection is required after Indxr has already narrowed the target, when the file exceeds the full-read limit, or when Indxr is insufficient."
```
  - In [next-gen/template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/next-gen/template.ts#L60-L63), replace the fallback exploration string with:
```ts
"For code investigation, prefer this order when possible: search_files to narrow candidate files, list_code_definition_names to map relevant symbols and line numbers, then take one read_file pass for a single target file when it is at or below 800 lines and 65536 bytes and you need the full editing context; otherwise use read_file_range or symbol-targeted MCP reads for the smallest relevant section. Avoid rereading overlapping regions or stitching together many adjacent range reads when one allowed full read would be clearer."
```
  - In [gpt-5/template.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/gpt-5/template.ts#L74-L77), replace the fallback exploration string with the exact same string used in `next-gen/template.ts`.
  - In [native-gpt-5-1/overrides.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts#L18-L21), replace the fallback exploration string with:
```ts
"For code exploration, prefer search_files first, then list_code_definition_names, then take one read_file pass for a single target file when it is at or below 800 lines and 65536 bytes and you need the full editing context; otherwise use read_file_range or symbol-targeted MCP reads for the smallest relevant section. Avoid repeating overlapping reads or stitching together many adjacent range reads when one allowed full read would be clearer."
```
  - In [spec.test.ts](/Users/robertboston/Documents/Cline%20Extension/cline/src/core/prompts/system-prompt/__tests__/spec.test.ts#L593-L600), replace the three expected strings for `readTool`, `rangeTool`, and `mcpTool` so they match the new exact descriptions above.
  - Do not change any other prompt text in this step.

## [x] Step 3: Update The Canonical Prompt Snapshots To Match The New Guidance
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-basic.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-browser.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-focus-chain.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/anthropic_claude_sonnet_4-no-mcp.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-basic.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-browser.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-focus-chain.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/cline_devstral-no-mcp.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-basic.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-browser.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-focus-chain.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_3-no-mcp.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-basic.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-browser.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-focus-chain.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openai_gpt_5-no-mcp.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-basic.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-browser.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-focus-chain.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/src/core/prompts/system-prompt/__tests__/__snapshots__/openrouter_arcee_ai_trinity_large_preview-no-mcp.snap`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/prod-testing/test-35-action-plan.md`
- Prescribed changes:
  - In every snapshot file listed above that still contains the old bounded-read sentence, replace this exact sentence:
```text
Use read_file only when the file is at or below 300 lines and 16384 bytes and you truly need the exact full contents.
```
  - With this exact sentence:
```text
Use read_file only when the file is at or below 800 lines and 65536 bytes and you truly need the exact full contents.
```
  - In every snapshot file listed above that still contains the old non-Indxr `read_file_range` guidance sentence, replace this exact sentence:
```text
Use this after search_files or list_code_definition_names has already narrowed the problem to a focused region, or when you need a targeted refresher without replaying the entire file.
```
  - With this exact sentence:
```text
Use this after search_files or list_code_definition_names has narrowed the problem to a focused region, when the file exceeds the full-read limit, or when you need a targeted refresher without replaying the entire file.
```
  - In the four Anthropic snapshot files listed above, replace this exact fallback guidance sentence wherever it appears:
```text
For code investigation, prefer this order when possible: search_files to narrow candidate files, list_code_definition_names to map relevant symbols and line numbers, then read_file_range or symbol-targeted MCP reads for the smallest relevant section. Use read_file only when the target file is at or below 300 lines and 16384 bytes. Avoid rereading overlapping regions when a narrower range will do.
```
  - With this exact sentence:
```text
For code investigation, prefer this order when possible: search_files to narrow candidate files, list_code_definition_names to map relevant symbols and line numbers, then take one read_file pass for a single target file when it is at or below 800 lines and 65536 bytes and you need the full editing context; otherwise use read_file_range or symbol-targeted MCP reads for the smallest relevant section. Avoid rereading overlapping regions or stitching together many adjacent range reads when one allowed full read would be clearer.
```
  - Do not regenerate snapshots wholesale. Apply only the exact string replacements prescribed in this step.

## [x] Step 4: Audit External Workflow Prompting And Align The Three Files That Still Teach The Old Read Pattern
- Allowed files:
  - `/Users/robertboston/Documents/Cline/Workflows/advanced-elicitation.md`
  - `/Users/robertboston/Documents/Cline/Workflows/blind-review.md`
  - `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md`
  - `/Users/robertboston/Documents/Cline/Workflows/check-implementation-readiness.md`
  - `/Users/robertboston/Documents/Cline/Workflows/cis-design-thinking.md`
  - `/Users/robertboston/Documents/Cline/Workflows/cis-innovation-strategy.md`
  - `/Users/robertboston/Documents/Cline/Workflows/cis-problem-solving.md`
  - `/Users/robertboston/Documents/Cline/Workflows/cis-storytelling.md`
  - `/Users/robertboston/Documents/Cline/Workflows/code-review.md`
  - `/Users/robertboston/Documents/Cline/Workflows/correct-course.md`
  - `/Users/robertboston/Documents/Cline/Workflows/create-architecture.md`
  - `/Users/robertboston/Documents/Cline/Workflows/create-epics-and-stories.md`
  - `/Users/robertboston/Documents/Cline/Workflows/create-prd.md`
  - `/Users/robertboston/Documents/Cline/Workflows/create-product-brief.md`
  - `/Users/robertboston/Documents/Cline/Workflows/create-story.md`
  - `/Users/robertboston/Documents/Cline/Workflows/create-ux-design.md`
  - `/Users/robertboston/Documents/Cline/Workflows/dev-story.md`
  - `/Users/robertboston/Documents/Cline/Workflows/distillator.md`
  - `/Users/robertboston/Documents/Cline/Workflows/document-project.md`
  - `/Users/robertboston/Documents/Cline/Workflows/domain-research.md`
  - `/Users/robertboston/Documents/Cline/Workflows/edit-prd.md`
  - `/Users/robertboston/Documents/Cline/Workflows/editorial-review-prose.md`
  - `/Users/robertboston/Documents/Cline/Workflows/editorial-review-structure.md`
  - `/Users/robertboston/Documents/Cline/Workflows/generate-project-context.md`
  - `/Users/robertboston/Documents/Cline/Workflows/help.md`
  - `/Users/robertboston/Documents/Cline/Workflows/index-docs.md`
  - `/Users/robertboston/Documents/Cline/Workflows/market-research.md`
  - `/Users/robertboston/Documents/Cline/Workflows/party-mode.md`
  - `/Users/robertboston/Documents/Cline/Workflows/qa-generate-e2e-tests.md`
  - `/Users/robertboston/Documents/Cline/Workflows/quick-dev-new-preview.md`
  - `/Users/robertboston/Documents/Cline/Workflows/quick-dev.md`
  - `/Users/robertboston/Documents/Cline/Workflows/quick-spec.md`
  - `/Users/robertboston/Documents/Cline/Workflows/retrospective.md`
  - `/Users/robertboston/Documents/Cline/Workflows/review-adversarial-general.md`
  - `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md`
  - `/Users/robertboston/Documents/Cline/Workflows/shard-doc.md`
  - `/Users/robertboston/Documents/Cline/Workflows/sprint-planning.md`
  - `/Users/robertboston/Documents/Cline/Workflows/sprint-status.md`
  - `/Users/robertboston/Documents/Cline/Workflows/teach-me-testing.md`
  - `/Users/robertboston/Documents/Cline/Workflows/technical-research.md`
  - `/Users/robertboston/Documents/Cline/Workflows/validate-prd.md`
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/prod-testing/test-35-action-plan.md`
- Prescribed changes:
  - These workflow files are outside the repo workspace. Before writing to any file under `/Users/robertboston/Documents/Cline/Workflows`, request escalated write approval for that path.
  - Review the workflow files in the exact order listed in the allowed-files list above, excluding this action-plan document.
  - For these files, make no edits. Their current wording does not prescribe a tool-usage pattern that conflicts with the post-plan tool state:
    - `/Users/robertboston/Documents/Cline/Workflows/advanced-elicitation.md`
    - `/Users/robertboston/Documents/Cline/Workflows/blind-review.md`
    - `/Users/robertboston/Documents/Cline/Workflows/brainstorming.md`
    - `/Users/robertboston/Documents/Cline/Workflows/check-implementation-readiness.md`
    - `/Users/robertboston/Documents/Cline/Workflows/cis-design-thinking.md`
    - `/Users/robertboston/Documents/Cline/Workflows/cis-innovation-strategy.md`
    - `/Users/robertboston/Documents/Cline/Workflows/cis-problem-solving.md`
    - `/Users/robertboston/Documents/Cline/Workflows/cis-storytelling.md`
    - `/Users/robertboston/Documents/Cline/Workflows/correct-course.md`
    - `/Users/robertboston/Documents/Cline/Workflows/create-architecture.md`
    - `/Users/robertboston/Documents/Cline/Workflows/create-epics-and-stories.md`
    - `/Users/robertboston/Documents/Cline/Workflows/create-prd.md`
    - `/Users/robertboston/Documents/Cline/Workflows/create-product-brief.md`
    - `/Users/robertboston/Documents/Cline/Workflows/create-story.md`
    - `/Users/robertboston/Documents/Cline/Workflows/create-ux-design.md`
    - `/Users/robertboston/Documents/Cline/Workflows/dev-story.md`
    - `/Users/robertboston/Documents/Cline/Workflows/distillator.md`
    - `/Users/robertboston/Documents/Cline/Workflows/document-project.md`
    - `/Users/robertboston/Documents/Cline/Workflows/domain-research.md`
    - `/Users/robertboston/Documents/Cline/Workflows/edit-prd.md`
    - `/Users/robertboston/Documents/Cline/Workflows/editorial-review-prose.md`
    - `/Users/robertboston/Documents/Cline/Workflows/editorial-review-structure.md`
    - `/Users/robertboston/Documents/Cline/Workflows/generate-project-context.md`
    - `/Users/robertboston/Documents/Cline/Workflows/help.md`
    - `/Users/robertboston/Documents/Cline/Workflows/index-docs.md`
    - `/Users/robertboston/Documents/Cline/Workflows/market-research.md`
    - `/Users/robertboston/Documents/Cline/Workflows/party-mode.md`
    - `/Users/robertboston/Documents/Cline/Workflows/qa-generate-e2e-tests.md`
    - `/Users/robertboston/Documents/Cline/Workflows/quick-spec.md`
    - `/Users/robertboston/Documents/Cline/Workflows/retrospective.md`
    - `/Users/robertboston/Documents/Cline/Workflows/review-adversarial-general.md`
    - `/Users/robertboston/Documents/Cline/Workflows/review-edge-case-hunter.md`
    - `/Users/robertboston/Documents/Cline/Workflows/shard-doc.md`
    - `/Users/robertboston/Documents/Cline/Workflows/sprint-planning.md`
    - `/Users/robertboston/Documents/Cline/Workflows/sprint-status.md`
    - `/Users/robertboston/Documents/Cline/Workflows/teach-me-testing.md`
    - `/Users/robertboston/Documents/Cline/Workflows/technical-research.md`
    - `/Users/robertboston/Documents/Cline/Workflows/validate-prd.md`
  - In [quick-dev-new-preview.md](/Users/robertboston/Documents/Cline/Workflows/quick-dev-new-preview.md#L14), replace the entire paragraph at Step 2 with this exact paragraph:
```md
Keep the plan grounded in the clarified intent and current project patterns. Prefer an efficient exploration order: use `search_files` first when the relevant file is not already known, use `list_code_definition_names` to inspect structure before broad reads, then once the work is narrowed to one concrete file, take one `read_file` pass when that file is at or below 800 lines and 65536 bytes and you need the full editing context. Use `read_file_range` for the smallest relevant section when the file exceeds that limit or the issue is localized. Avoid stitching together many adjacent range reads when one allowed full read would be clearer. If the intent is still ambiguous, ask the missing questions before proceeding. If the draft grows beyond 1600 tokens, ask whether to split the scope or keep the full spec.
```
  - In [quick-dev-new-preview.md](/Users/robertboston/Documents/Cline/Workflows/quick-dev-new-preview.md#L21), replace the entire paragraph at Step 3 with this exact paragraph:
```md
Update the spec frontmatter status to `in-progress`. If the work is `one-shot` or no sub-agent/task split is available, implement directly. Otherwise hand `{spec_file}` to a sub-agent or task for implementation. During implementation, prefer targeted refreshes when you already have the needed context. Once the work is narrowed to one concrete file, take one `read_file` pass when that file is at or below 800 lines and 65536 bytes and you need the full editing context; otherwise use `read_file_range` for the smallest relevant section.
```
  - In [quick-dev.md](/Users/robertboston/Documents/Cline/Workflows/quick-dev.md#L10), replace the entire Step 2 paragraph with this exact paragraph:
```md
When working in direct mode, search for the files, patterns, dependencies, and configuration that matter. Prefer `search_files` first when the relevant file is not already known, use `list_code_definition_names` to inspect structure before broad reads, then once the work is narrowed to one concrete file, take one `read_file` pass when that file is at or below 800 lines and 65536 bytes and you need the full editing context. Use `read_file_range` for the smallest relevant section when the file exceeds that limit or the change is localized. Avoid stitching together many adjacent range reads when one allowed full read would be clearer. Then present a focused implementation plan and ask whether to proceed or gather more context.
```
  - In [quick-dev.md](/Users/robertboston/Documents/Cline/Workflows/quick-dev.md#L15), replace the entire first paragraph of Step 3 with this exact paragraph:
```md
Read only the relevant files or file ranges needed to implement the change, make the requested changes using existing conventions, and add or update tests when the change warrants it. Once the work is narrowed to one concrete file, prefer one `read_file` pass when that file is at or below 800 lines and 65536 bytes and you need the full editing context; otherwise use `read_file_range` for the smallest relevant section. Avoid unnecessary rereads of unchanged files when a targeted refresh is sufficient. Run the relevant tests and fix failures before moving on.
```
  - In [code-review.md](/Users/robertboston/Documents/Cline/Workflows/code-review.md#L34-L38), replace the entire four-bullet block under `If additional discovery is needed, keep it tightly scoped:` with this exact six-bullet block:
```md
- prefer Indxr tools first for symbol/source discovery when available
- use built-in file tools only when Indxr is unavailable, insufficient, or when exact raw file text, regex search, or direct line inspection is required
- when using built-in file tools, start with `search_files` or `list_code_definition_names`
- once the review is narrowed to one concrete file, take one `read_file` pass only when that file is at or below 800 lines and 65536 bytes and full raw context is required
- otherwise use `read_file_range` for the smallest relevant section, and avoid stitching together many adjacent range reads when one allowed full read would be clearer
- do not begin with broad full-file or broad repo-wide reads unless a narrower path has already proven insufficient
```
  - Do not edit any other workflow file in this step.

## [ ] Step 5: Run The Exact Verification Sweep
- Allowed files:
  - `/Users/robertboston/Documents/Cline Extension/cline/docs/prod-testing/test-35-action-plan.md`
- Prescribed changes:
  - Do not make any code or snapshot edits in this step other than changing this checkbox to `[x]` after successful verification.
  - Run this exact command and no broader unit-test command:
```sh
npm run test:unit -- src/core/task/tools/handlers/__tests__/ReadFileToolHandler.repeatReads.test.ts src/core/task/tools/handlers/__tests__/UseMcpToolHandler.test.ts src/core/prompts/system-prompt/__tests__/spec.test.ts --exit
```
  - Then run this exact scoped string-audit command:
```sh
rg -n "300 lines and 16384 bytes|300-line / 16384-byte|target file is at or below 300 lines and 16384 bytes|Use this after search_files or list_code_definition_names has already narrowed the problem to a focused region, or when you need a targeted refresher without replaying the entire file.|For code investigation, prefer this order when possible: search_files to narrow candidate files, list_code_definition_names to map relevant symbols and line numbers, then read_file_range or symbol-targeted MCP reads for the smallest relevant section. Use read_file only when the target file is at or below 300 lines and 16384 bytes. Avoid rereading overlapping regions when a narrower range will do.|For large files, prefer symbol-targeted or explicit line-range source reads instead of full raw file reads.|Use only when exact raw line-based inspection is required after Indxr has already narrowed the target, or when Indxr is insufficient." src/core/task/tools src/core/prompts/system-prompt src/core/prompts/system-prompt/__tests__/spec.test.ts
```
  - Then run this exact snapshot-audit command:
```sh
rg -n "300 lines and 16384 bytes|target file is at or below 300 lines and 16384 bytes|Use this after search_files or list_code_definition_names has already narrowed the problem to a focused region, or when you need a targeted refresher without replaying the entire file.|For code investigation, prefer this order when possible: search_files to narrow candidate files, list_code_definition_names to map relevant symbols and line numbers, then read_file_range or symbol-targeted MCP reads for the smallest relevant section. Use read_file only when the target file is at or below 300 lines and 16384 bytes. Avoid rereading overlapping regions when a narrower range will do." src/core/prompts/system-prompt/__tests__/__snapshots__
```
  - Then run this exact external-workflow audit command:
```sh
rg -n 'Avoid broad full-file `read_file` usage on large files|prefer targeted refreshes or `read_file_range` over rereading large unchanged files in full|then use `read_file_range` only for the smallest relevant section' '/Users/robertboston/Documents/Cline/Workflows'
```
  - If the unit-test command fails, or any `rg` command returns any match in the scoped files, stop immediately and ask for input before making any additional change.

## Expected Result
- Bounded full reads remain capped and explicit, but the cap now admits most edit-sized source files in the target repo.
- Prompting still teaches Indxr-first discovery, but it now explicitly teaches the model to stop stitching together many adjacent targeted reads once one concrete file has been identified and that file is within the bounded full-read window.
- Native and MCP bounded-read enforcement, prompt descriptions, tests, snapshots, and the affected external workflow prompts all use the same `800` / `65536` string contract.
