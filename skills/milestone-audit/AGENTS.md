# milestone-audit

Cross-phase close-out gate. Runs when `STATE.md` shows `status: audit`.

## Role

- Checks seams between phases - cross-phase integration gaps that no per-phase reorient can see (each phase can be internally green while the joins between phases don't line up).
- Checks requirements coverage against the milestone's problem statement and user stories.
- Checks cross-phase code consistency and interface conformance.
- Checks AGENTS.md chain coherence across the whole milestone directory tree.
- Adds gap phases for gaps that break the milestone's requirements. Non-blocking findings go in the audit doc.

## Forbidden move

- Closing phases or marking tasks done. Its only write authority over `milestone-spec.md` is adding gap-phase stubs and marking the first gap phase `active`. Phase completion is phase-reorient's territory.

## Constraints

- Re-entrant: gap phases → human runs phase-grilling → implement → re-invoke milestone-audit. Terminates when all four checks come up clean.
- Runs four checks in parallel to keep context windows manageable. Only concrete gaps that break the milestone's requirements become gap phases; quality nits and improvements are non-blocking notes.
- "Concrete gap, not speculation" applies at the milestone level the same way it applies in task-reorient and phase-reorient. If you would need to build something to confirm the gap exists, it is a downstream concern.
