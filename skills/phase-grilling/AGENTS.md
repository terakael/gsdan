# phase-grilling

Per-phase kickoff. Runs once per phase, immediately before the implement loop for that phase.

## Role

- Elaborates one phase stub from `milestone-spec.md` into a full `phase-spec.md` and a set of tickets.
- Anchors every ticket to a named module interface from `milestone-spec.md`.
- The only pre-implement skill that can run `/prototype` to resolve a genuinely unknown approach before tickets are written.

## Forbidden move

- Writing to `milestone-spec.md`. Any downstream implication surfaced during phase grilling goes into `CONTEXT.md` or an ADR; `phase-reorient` folds those into the milestone spec at the phase boundary.

## Constraints

- Reads `milestone-spec.md` but never writes it. All mid-phase change is encapsulated within the current phase's directory until the phase boundary.
- When a needed interface does not exist in `milestone-spec.md`, that is a milestone-level decision requiring Dan's call - not something phase-grilling resolves unilaterally. A proposed addition earns an ADR and requires sign-off.
- Every ticket must fall behind at least one module interface named in `milestone-spec.md`. Tickets that can't be traced to a listed interface are a signal the decomposition or the interfaces need revisiting.
