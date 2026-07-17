# phase-reorient

End-of-phase step. Runs when the ticket frontier is empty. Has the holistic view no single task-reorient could have.

## Role

- Harvests cross-task decisions that only emerge from reading all task summaries together.
- Checks for cross-task integration gaps and runs the deepening sweep via `/scan-codebase-architecture` to catch accumulated-shape leaks no per-ticket diff review can see.
- Curates higher-layer AGENTS.md files using `/write-agents` - this is the right moment because the full phase shape is visible for the first time.
- Reshapes downstream phase stubs in `milestone-spec.md` based on what the whole phase taught.

## Forbidden move

- Marking the phase `done` in `milestone-spec.md` when a fix-up ticket was added. `done` is the signal that terminates the implement loop; setting it prematurely exits the loop before the fix-up work runs.
- Writing judgment-call ADRs. This skill runs headless and cannot ask Dan. A ratifying ADR for a decision the spine already made is fine; a new interface judgment requires human involvement and belongs in the next phase-grilling.

## Constraints

- Re-entrant by design: adds fix-up tickets → stops without marking done → loop implements them → invokes phase-reorient again. Termination relies on the bar for fix-up tickets being tight: only concrete drift-from-vision leaks that pass the deletion test and fit one ticket. Net-new deepening ideas never become fix-up tickets.
- On the fix-up path, `milestone-spec.md` and `STATE.md` stay untouched. The implement loop reads the phase status from `milestone-spec.md` and exits only when it sees `done` there.
