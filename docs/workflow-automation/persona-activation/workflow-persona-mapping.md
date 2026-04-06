# Workflow Persona Mapping

This document inventories every placeholder workflow currently present in `/Users/robertboston/Documents/Cline/Workflows` and records the intended direct workflow-to-persona mapping for the upcoming workflow-owned persona activation system.

## Mapping Rules

- `write-remediation-story.md` maps to the `developer` persona.
- `blind-review.md`, `review-edge-case-hunter.md`, `code-review.md`, and `review-adversarial-general.md` map to the new `quality-control` persona.
- Existing workflow-to-persona decisions listed below are the canonical source of truth for the prompt-owned persona registry.
- Workflows marked `unassigned` must not inject any workflow persona.

## Persona Source Files

| Persona | Source File |
| --- | --- |
| `analyst` | `_bmad/bmm/agents/analyst.md` |
| `architect` | `_bmad/bmm/agents/architect.md` |
| `creative-writer` | `_bmad/bmm/agents/creative-writer.md` |
| `developer` | `_bmad/bmm/agents/dev.md` |
| `master-test-architect` | `_bmad/tea/agents/bmad-tea/SKILL.md` |
| `product-manager` | `_bmad/bmm/agents/pm.md` |
| `quality-control` | `_bmad/bmm/agents/quality-control.md` |
| `quick-flow-solo-dev` | `_bmad/bmm/agents/quick-flow-solo-dev.md` |
| `scrum-master` | `_bmad/bmm/agents/sm.md` |
| `tech-writer` | `_bmad/bmm/agents/tech-writer/tech-writer.md` |
| `ux-designer` | `_bmad/bmm/agents/ux-designer.md` |

## Inventory

| Workflow | Persona | Notes |
| --- | --- | --- |
| `advanced-elicitation.md` | `analyst` | New explicit mapping |
| `blind-review.md` | `quality-control` | New explicit mapping. |
| `brainstorming.md` | `analyst` | Preserves current unique owner (`bmad-analyst`). |
| `check-implementation-readiness.md` | `architect` | Preserves current unique owner (`bmad-architect`). |
| `cis-design-thinking.md` | `ux-designer` |  New explicit mapping |
| `cis-innovation-strategy.md` | `architect` | No unique current automatic owner. |
| `cis-problem-solving.md` | `analyst` |  New explicit mapping |
| `cis-storytelling.md` | `creative-writer` | No unique current automatic owner. |
| `code-review.md` | `quality-control` | Overrides prior developer ownership. |
| `correct-course.md` | `scrum-master` | Preserves current unique owner (`bmad-sm`). |
| `create-architecture.md` | `architect` | Preserves current unique owner (`bmad-architect`). |
| `create-epics-and-stories.md` | `product-manager` | Preserves current unique owner (`bmad-pm`). |
| `create-prd.md` | `product-manager` | Preserves current unique owner (`bmad-pm`). |
| `create-product-brief.md` | `analyst` | Preserves current unique owner (`bmad-analyst`). |
| `create-story.md` | `scrum-master` | Preserves current unique owner (`bmad-sm`). |
| `create-ux-design.md` | `ux-designer` | Preserves current unique owner (`bmad-ux-designer`). |
| `dev-story.md` | `developer` | Preserves current unique owner (`bmad-dev`). |
| `distillator.md` | `unassigned` | No unique current automatic owner. |
| `document-project.md` | `analyst` | Preserves current unique owner (`bmad-analyst`). |
| `domain-research.md` | `analyst` | Preserves current unique owner (`bmad-analyst`). |
| `edit-prd.md` | `product-manager` | Preserves current unique owner (`bmad-pm`). |
| `editorial-review-prose.md` | `tech-writer` | Preserves current unique owner (`bmad-tech-writer`). |
| `editorial-review-structure.md` | `tech-writer` | Preserves current unique owner (`bmad-tech-writer`). |
| `generate-project-context.md` | `analyst` | Preserves current unique owner (`bmad-analyst`). |
| `help.md` | `unassigned` | No unique current automatic owner. |
| `index-docs.md` | `tech-writer` | Preserves current unique owner (`bmad-tech-writer`). |
| `market-research.md` | `analyst` | Preserves current unique owner (`bmad-analyst`). |
| `pi-planning.md` | `scrum-master` | New explicit mapping. |
| `qa-generate-e2e-tests.md` | `quality-control` | Preserves current unique owner (`bmad-qa`). |
| `quick-dev-new-preview.md` | `quick-flow-solo-dev` | Preserves current unique owner (`bmad-quick-flow-solo-dev`). |
| `quick-dev.md` | `quick-flow-solo-dev` | Preserves current unique owner (`bmad-quick-flow-solo-dev`). |
| `quick-spec.md` | `quick-flow-solo-dev` | Preserves current unique owner (`bmad-quick-flow-solo-dev`). |
| `retrospective.md` | `scrum-master` | Preserves current unique owner (`bmad-sm`). |
| `review-adversarial-general.md` | `quality-control` | Overrides prior developer ownership. |
| `review-edge-case-hunter.md` | `quality-control` | Overrides prior developer ownership. |
| `shard-doc.md` | `tech-writer` | Preserves current unique owner (`bmad-tech-writer`). |
| `sprint-planning.md` | `scrum-master` | Preserves current unique owner (`bmad-sm`). |
| `sprint-status.md` | `scrum-master` | Preserves current unique owner (`bmad-sm`). |
| `teach-me-testing.md` | `master-test-architect` | Preserves current unique owner (`bmad-tea`). |
| `technical-research.md` | `analyst` | Preserves current unique owner (`bmad-analyst`). |
| `validate-prd.md` | `product-manager` | Preserves current unique owner (`bmad-pm`). |
| `write-remediation-story.md` | `developer` | New explicit mapping. |
