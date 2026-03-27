# Indxr-Aware Prompting Action Plan

## Goal

Update Cline's prompt system so it prefers Indxr for code exploration when Indxr is actually available in the current workspace session, while preserving the existing built-in exploration flow as the fallback when Indxr is not connected.

This plan is intentionally limited to the prompt and tool-description surfaces most likely to steer the model away from Indxr and toward built-in file exploration.

## Desired Behavior

When Indxr is connected as an MCP server for the current workspace session:

- Prefer Indxr for early code exploration and repo understanding.
- Prefer structural / summary / targeted-source MCP reads before broad built-in file exploration.
- Keep built-in tools as fallback when Indxr cannot answer the question or when exact raw file access is still needed.
- Preserve the existing behavior when Indxr is not connected.

When Indxr is not connected:

- Preserve today's built-in exploration methodology unchanged.

## Trigger Strategy

### Preferred Trigger

Use runtime MCP visibility, not filesystem detection.

Define an Indxr-aware helper that checks the current `SystemPromptContext` for a connected MCP server exposing a recognizable Indxr tool signature.

Recommended signal:

- A connected MCP server
- With at least one or more expected Indxr tools such as:
  - `search_relevant`
  - `get_file_summary`
  - `read_source`
  - `get_token_estimate`

### Why This Trigger

- It only activates when Indxr is actually usable in the current session.
- It avoids false positives where the binary exists on disk but is not configured, disabled, or failing to start.
- It fits the current prompt assembly model, which already has access to `context.mcpHub.getServers()`.

### Suggested Helper Location

Add a shared helper in:

- `src/core/prompts/system-prompt/components/mcp.ts`

Potential shape:

- `hasConnectedIndxrServer(context)`
- `getConnectedIndxrServers(context)`
- `isIndxrToolName(name)`

The helper should be reusable by prompt components, variant overrides, and possibly native schema compaction logic.

## Files To Update

### 1. MCP Awareness Layer

#### `src/core/prompts/system-prompt/components/mcp.ts`

Purpose:

- Add Indxr detection helpers
- Strengthen MCP guidance when Indxr is available

Planned changes:

- Add a helper that detects a connected Indxr MCP server from server tool names.
- Extend the rendered MCP section with a short conditional block when Indxr is present.
- The new block should say, in substance:
  - Use Indxr first for code exploration and structural discovery.
  - Prefer Indxr summaries / symbol-aware exploration before broad `search_files` or full-file reads.
  - Fall back to built-in file tools when exact raw file content or non-Indxr behavior is needed.

Important constraint:

- Keep the default MCP section generic when Indxr is not present.

#### `src/core/prompts/system-prompt/tools/use_mcp_tool.ts`

Purpose:

- Make the generic MCP tool description less neutral when Indxr is connected

Planned changes:

- Consider adding a context-sensitive description or instruction note for MCP tool use when Indxr is available.
- Suggested emphasis:
  - MCP tools may be preferable to built-in file exploration when they provide lower-token structural access.
  - When Indxr is available, prefer its exploration tools before built-in `search_files`, `list_code_definition_names`, `read_file`, and `read_file_range`.

Important constraint:

- Do not make `use_mcp_tool` Indxr-specific globally.
- This should remain conditional and additive.

### 2. Built-In Exploration Tool Descriptions

These files currently teach a built-in exploration funnel. They should become conditional so they stop over-recommending built-ins when Indxr is connected.

#### `src/core/prompts/system-prompt/tools/search_files.ts`

Current pressure:

- Tells the model to "Start here" before `list_code_definition_names`, `read_file`, or `read_file_range`.

Planned changes:

- Make the description conditional.
- When Indxr is not available:
  - Preserve the current "Start here" guidance.
- When Indxr is available:
  - Reframe `search_files` as a fallback or secondary tool.
  - Suggested substance:
    - Use this when Indxr is unavailable, insufficient, or when regex search across raw files is the better fit.

#### `src/core/prompts/system-prompt/tools/list_code_definition_names.ts`

Current pressure:

- Frames built-in symbol listing as the preferred narrowing step before reads.

Planned changes:

- Make the description conditional.
- When Indxr is available:
  - Reframe as fallback symbol discovery when Indxr is unavailable or when a built-in directory-level definition pass is specifically better.

#### `src/core/prompts/system-prompt/tools/read_file_range.ts`

Current pressure:

- Explicitly teaches "after `search_files` or `list_code_definition_names`."

Planned changes:

- Make the description conditional.
- When Indxr is available:
  - Reframe as the follow-up tool after Indxr or built-in narrowing.
  - Suggested substance:
    - Use after Indxr or other exploration tools have isolated a specific raw file region that must be inspected directly.

### 3. Native Compact Tool Schema Shaping

#### `src/core/prompts/system-prompt/spec.ts`

Purpose:

- Native compact tool descriptions are highly influential on GPT-5 native paths.

Current problem:

- Built-in tools are compact, curated, and assertive.
- MCP tools are exposed more generically, so built-ins may still feel "more official."

Planned changes:

- Update compact native tool descriptions conditionally for:
  - `search_files`
  - `list_code_definition_names`
  - `read_file_range`
- When Indxr is available:
  - Built-in descriptions should no longer imply first-choice status.
  - They should read more like fallback tools for regex search, directory-wide definition listing, or precise raw source inspection.
- Optionally add a compact Indxr preference sentence somewhere in the native MCP path if there is a good central location.

Important constraint:

- Avoid hardcoding server-specific MCP tool names into generic native descriptions unless the helper confirms Indxr is present.

### 4. Shared Rules Layer

#### `src/core/prompts/system-prompt/components/rules.ts`

Current pressure:

- Reinforces `search_files` plus `read_file` style investigation.
- Reinforces one-at-a-time MCP use, but not why MCP might be preferable.

Planned changes:

- Add a conditional rule when Indxr is available.
- Suggested substance:
  - For code investigation, prefer Indxr's structural exploration tools before broad built-in regex search or full-file reads.
  - Use built-in file tools when exact raw file contents, regex behavior, or direct line-based inspection are required.

Important constraint:

- This should be phrased as a preference, not an absolute prohibition.

### 5. Non-Native / Text Prompt Family Overrides

These files contain the clearest explicit built-in-first exploration ordering and should be updated to conditional Indxr-aware wording.

#### `src/core/prompts/system-prompt/variants/gpt-5/template.ts`

Current pressure:

- Explicitly says to prefer:
  - `search_files`
  - `list_code_definition_names`
  - `read_file`
  - `read_file_range`

Planned changes:

- Replace the hardcoded built-in-first rule with conditional guidance.
- When Indxr is available:
  - Prefer Indxr for initial exploration, summaries, and targeted source discovery.
  - Use built-in tools as fallback for regex search, direct raw file reads, or line-based follow-up.
- When Indxr is not available:
  - Preserve current behavior.

#### `src/core/prompts/system-prompt/variants/next-gen/template.ts`

Current pressure:

- Same built-in-first ordering as the GPT-5 text path.

Planned changes:

- Mirror the conditional logic used in the GPT-5 text template.

#### `src/core/prompts/system-prompt/variants/native-gpt-5-1/overrides.ts`

Current pressure:

- Strongly reinforces:
  - `search_files`
  - `list_code_definition_names`
  - `read_file`
  - `read_file_range`
- Also has strong procedural guidance, so this file has outsized influence.

Planned changes:

- Update the rules and objective text so the exploration order becomes conditional:
  - Indxr-first when available
  - Existing built-in order when not
- Keep the rest of the GPT-5.1 procedural structure intact.

## Recommended Prompt Wording Pattern

Use the same conceptual wording everywhere to avoid mixed signals.

Suggested pattern:

- "When Indxr is available, prefer it for code exploration, structural summaries, and targeted source discovery before using built-in `search_files`, `list_code_definition_names`, `read_file`, or `read_file_range`."
- "Use built-in file tools when Indxr is unavailable, insufficient for the task, or when exact raw file contents / regex search / line-based inspection are required."

This keeps the guidance:

- clear
- conditional
- fallback-friendly
- non-destructive to current behavior

## Scope Control

### In Scope

- Prompt components
- Variant overrides
- Tool descriptions
- Native compact schema wording
- Tests and snapshots affected by those changes

### Out of Scope

- Bundling Indxr into Cline
- Repo-on-disk installation detection
- MCP server config generation
- Runtime tool ranking outside the prompt layer
- Changes to unrelated prompt families unless they share one of the listed files

## Testing Plan

### Unit / Snapshot Coverage

Update or add tests to verify:

- Baseline prompts are unchanged when no Indxr server is connected.
- Indxr-aware guidance appears when a connected MCP server exposes Indxr tool names.
- Native GPT-5 minimal prompts include the Indxr-first guidance when applicable.
- Built-in tool descriptions change wording conditionally when Indxr is present.

Priority test files:

- `src/core/prompts/system-prompt/__tests__/integration.test.ts`
- `src/core/prompts/system-prompt/__tests__/spec.test.ts`

Expected snapshot churn:

- Prompt snapshots for GPT-5 text
- Prompt snapshots for next-gen text
- Prompt snapshots for GPT-5 native minimal prompts if wording is introduced there
- Possibly native tool schema snapshots if compact descriptions are changed

### Manual Verification Scenarios

1. No MCP servers connected
   - Prompt remains unchanged from today's baseline

2. MCP connected, but not Indxr
   - Generic MCP guidance appears
   - No Indxr-first exploration wording appears

3. Indxr connected
   - MCP section identifies the available Indxr-aware preference
   - Built-in exploration tools stop presenting themselves as first-choice
   - GPT-5 / next-gen / native GPT-5.1 prompt variants reflect Indxr-first wording

## Risks And Mitigations

### Risk: Over-biasing Toward Indxr

If the prompt becomes too aggressive, the model may avoid useful built-in tools even when they are the better fit.

Mitigation:

- Phrase the guidance as "prefer" rather than "must"
- Keep explicit fallback cases for regex search, exact raw file access, and line-based inspection

### Risk: Fragile Indxr Detection

If detection relies only on server name, it may miss renamed configs.

Mitigation:

- Detect by connected tool signature first
- Optionally use server name only as a secondary heuristic

### Risk: Snapshot Noise

Prompt changes across shared files will touch many snapshots.

Mitigation:

- Update tests after implementation in one pass
- Keep wording centralized so future maintenance is easier

### Risk: Divergent Guidance Across Variants

Different variants may drift if each gets custom wording.

Mitigation:

- Centralize detection in a shared helper
- Reuse a common wording pattern across files

## Recommended Implementation Order

1. Add shared Indxr detection helper in `components/mcp.ts`
2. Update `mcp.ts` MCP prompt text with conditional Indxr-first guidance
3. Update built-in exploration tool descriptions:
   - `search_files.ts`
   - `list_code_definition_names.ts`
   - `read_file_range.ts`
4. Update native compact description shaping in `spec.ts`
5. Update shared `rules.ts`
6. Update variant-specific explicit ordering files:
   - `gpt-5/template.ts`
   - `next-gen/template.ts`
   - `native-gpt-5-1/overrides.ts`
7. Update `use_mcp_tool.ts` if needed to reinforce the MCP-side preference
8. Refresh tests and snapshots

## Recommended Deliverable Split

### Pass 1

- Add detection helper
- Add shared Indxr-first wording
- Update tool descriptions
- Update shared rules

### Pass 2

- Update variant-specific ordering rules
- Update tests and snapshots

This split reduces confusion during review and makes it easier to validate that the conditional detection works before broad snapshot churn.

## Success Criteria

The work should be considered complete when:

- Cline only presents Indxr-first exploration guidance when Indxr is connected in the current session
- Existing behavior remains unchanged when Indxr is absent
- GPT-5 native, GPT-5 text, next-gen text, and GPT-5.1 native paths no longer strongly steer the model into built-in-first exploration when Indxr is available
- Tests and snapshots pass after the update
