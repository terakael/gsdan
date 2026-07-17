# write-agents

Shared AGENTS.md authoring utility. Called by the implementer (leaf layers, during the red/green cycle) and by phase-reorient (higher layers, once the full phase shape is visible).

## Role

- Derives why from flow artifacts and the code diff - not from inference or invention.
- Leaf-layer calls: intent-why is written during red (why the seam exists, what it must never do); discovered-why is appended during green (constraints hit, approach chosen over a failed alternative).
- Higher-layer calls: cross-task patterns that only emerge from the full-phase picture and can only be placed correctly once all the tasks are done.

## Forbidden move

- Restating content already in an ancestor AGENTS.md. The ancestor chain is non-redundant by design; duplication creates independent drift between layers.

## Constraints

- The why must be traceable to a flow artifact (ticket, summary, phase-spec, milestone-spec, ADR) or to the code diff. Invented rationale is worse than no rationale - it misleads future agents.
- "Nothing new at this layer" is a valid and correct output. An AGENTS.md that would only restate ancestors should not be written.
