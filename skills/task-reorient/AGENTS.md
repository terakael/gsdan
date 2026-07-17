# task-reorient

Post-ticket sweep. Runs after every completed ticket, before the next one starts.

## Role

- Harvests decisions from the just-completed ticket's done-summary into `CONTEXT.md` and ADRs.
- Reshapes remaining tickets in the current phase if concrete outcome from the just-completed ticket makes it necessary.
- Confirms leaf `AGENTS.md` landed for touched directories; runs `/write-agents` if coverage is missing.
- Advances `STATE.md` to the next runnable ticket so the implement loop can continue.

## Forbidden move

- Touching `milestone-spec.md` or the phase goal. The blast radius of this skill is limited to remaining tickets in the current phase. Anything touching the phase goal or downstream phases belongs to phase-reorient.

## Constraints

- Reacts only to concrete outcome from the just-completed ticket. Not to what might be affected, not to speculative improvements, not to different possible sequencing. The "concrete outcome" bar prevents task-reorient from expanding scope mid-phase.
- Blocking edges in tickets are load-bearing: the frontier computation in `../_shared/ARTIFACT-CONTRACT.md` depends on them being correct. A missed or incorrect blocking edge produces wrong ticket ordering, not just a sequencing preference.
