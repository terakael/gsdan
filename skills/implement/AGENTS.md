# implement

The inner loop. A bash script (`implement.sh`) spins up one fresh pi instance per ticket, waits for a summary, and advances. Three TypeScript extensions enforce structural constraints at the tooling level so they cannot be skipped by instruction.

## Two layers with deliberately different jobs

- `implement.sh` globs files, invokes pi, and advances. It makes no decisions. It cannot see inside summaries beyond checking `status: done`.
- The per-iteration pi instance assembles context from disk, drives TDD, handles escalation, and writes the outcome.

This separation is load-bearing. A loop script that "understood" what it was iterating over would accumulate logic that belongs in the pi instances, making the loop harder to reason about and less predictable.

## Extensions

Three extensions enforce one structural constraint each at the tooling level. They are loaded into every per-iteration pi session by `implement.sh`. Each one closes the gap between "the instructions say to do X" and "the code actually prevents not doing X."

- **`interface-gate.ts`** - blocks any write to `.flow/adr/` or `.flow/milestone-spec.md` until the human approves it in the tmux pane. Without this gate, an agent could write an ADR - effectively recording an interface decision - without the human ever seeing it. On rejection, the write never happens and the agent is steered back into grilling.
- **`auto-exit.ts`** - calls `ctx.shutdown()` when the agent settles after writing the summary file. Each per-iteration pi instance must exit after its job is done; without this, the outer loop has no clean signal that the iteration finished. Checks that the summary was written during this session (not a stale file from a prior failed attempt) before shutting down.
- **`agents-doc-gate.ts`** - blocks a `status: done` summary write that lacks an `AGENTS fidelity review:` attestation line. The fidelity review step must actually happen before a ticket is marked done. Without this gate, the step can be silently skipped and the loop advances without AGENTS.md content ever being verified against the code. Does not inspect the quality of the review; only verifies that one ran and that its outcome is recorded.

## Forbidden move

- `implement.sh` must not parse summary content for meaning, make routing decisions based on what an agent wrote, or track state between iterations. All state lives in `.flow/` files; the loop only asks "is there a runnable ticket?"
- The per-iteration pi instance must not self-approve an interface change. `interface-gate.ts` enforces this regardless of what the instructions say.
