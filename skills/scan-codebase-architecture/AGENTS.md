# scan-codebase-architecture

Accumulated-shape architecture sweep. Called by phase-reorient during the deepening step; returns findings for phase-reorient to route.

## Role

- Detects deep-module leaks that are invisible per-ticket but visible in the accumulated shape of what a phase produced. A per-ticket diff review only ever sees "+1 change"; this skill sees the shape those changes accumulated into.

## Forbidden move

- Acting on its own findings. It returns a structured list; phase-reorient decides which become fix-up tickets, which become downstream stubs, and which are dropped. The routing logic belongs to the caller.

## Constraints

- Reads `milestone-spec.md`, `CONTEXT.md`, and ADRs before reading any code. Deliberate stubs and spine seams must not be flagged as leaks; the roadmap is the difference between a real leak and an intended tracer.
- Deletion-test positive is the bar for a finding: removing the structure would concentrate complexity, not just move it. When in doubt, leave it out.
