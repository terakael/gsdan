---
name: implement
description: "Run the autonomous implementation loop for one phase of the nested delivery loop. Pre-condition: STATE.md must have status: implementing and a valid current_phase."
disable-model-invocation: true
---

Autonomous per-phase implementation loop. Runs without stopping until every ticket in
the current phase has a done-summary, then hands off to `phase-reorient` and exits.

## Pre-conditions

- `.flow/STATE.md` exists with `status: implementing` and a valid `current_phase`.
- The current phase has a `phase-spec.md` and at least one ticket under `tickets/`.
- You are inside a tmux session (the loop spawns per-ticket windows there).

Run `phase-grilling` first if these aren't in place.

## What it does

Runs `.pi/skills/implement/implement.sh` from the repo root. For each ticket:

1. Finds the next runnable ticket (no done-summary, all blocking edges done).
2. Launches an **interactive pi session in a new tmux window** for that ticket.
3. The pi instance reads context from disk, writes the acceptance tests at the ticket's
   interface seam, gets them checked by a **test-review gate** (a fresh reviewer that
   must enumerate missing cases before any production code), drives `/tdd` to green,
   runs `/code-review`, then commits and writes a done-summary — or writes a
   failed-summary on failure.
   **Grey-box contract:** the instance fills the implementation behind the interfaces
   named in `milestone-spec.md`. It does not change the interface surface. If the work
   reveals that an interface needs changing to proceed correctly, that is an escalation
   — not a silent decision. Escalate before committing anything.
   **Before writing any production code,** open the task summary and write:
   ```
   Module zone: <pure | shell | port>
   Allowed dependencies: <values only | ports only | external system>
   Forbidden move: <from the interface spec>
   Pure boundary intact: <N/A - pure core | will confirm on completion>
   ```
   Then write the first failing test. This is the auditable startup ritual —
   it gives restart context and something task-reorient can inspect.
4. **Escalation** falls out naturally: the instance asks Dan inline in the tmux window.
   Dan answers. The instance updates artifacts, writes the summary, and exits. The loop
   notices the summary and advances.
5. After each done ticket, runs `task-reorient` headlessly (pi -p).
6. When no runnable tickets remain, runs `phase-reorient` headlessly.
7. Exits 0 when `phase-reorient` marks the phase `done` in `milestone-spec.md`.

The per-ticket pi session exits automatically via the `auto-exit.ts` extension, which
calls `ctx.shutdown()` when the agent settles after writing the summary file. The outer
loop waits by polling for the summary file, then kills the window if still open.

## How to run

The skill launches `implement.sh` in a **detached tmux window** so this pi session
stays free. When invoked, the model runs:

```bash
tmux new-window -d -n flow-loop "bash $(git rev-parse --show-toplevel)/.pi/skills/implement/implement.sh"
```

The window is named `flow-loop`. Switch to it with `Ctrl-b w` or
`tmux select-window -t flow-loop`. The loop logs its progress there and each
per-ticket window appears alongside it.

To override defaults, prepend env vars to the command inside the quotes:

```bash
tmux new-window -d -n flow-loop \
  "MAX_ITERATIONS=30 bash .../implement.sh"
```

Pre-conditions must be met before invoking: check `STATE.md` first.

## What the loop does NOT do

- Write STATE.md (task-reorient's job).
- Parse summary content beyond checking `status: done`.
- Make implementation decisions (the per-ticket pi instance's job).

The script is dumb by design. Intelligence lives in the pi instances it spawns.

## Phase-done signal

Phase-reorient marks a phase done by updating `milestone-spec.md`'s phase list so that
the line for the current phase contains the word `done`. The loop reads this via
`phase_status()` and exits 0 when it sees it.
