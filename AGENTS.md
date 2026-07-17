# gsdan

Workflow spec and skill suite. The human owns the architecture; fresh-context agents implement behind it. The artifacts in this repo ARE the product - there is no application code here.

## Why this exists

- **Pocock's flow** gives architectural discipline: human-owned module interfaces, agents filling behind them, TDD against fast in-memory seams. But it front-loads all thinking into one grilling session and then goes quiet. No named step for what happens when implementation teaches you something the spec missed - and on any real project, it always does.
- **GSD** has the adaptive loop: rolling-wave planning, deviation rules, re-orient on surprise. But its plans are lists of file edits. No human-owned seams, no deep-module discipline, no TDD. An agent following GSD drifts off-vision.
- This combines them: GSD's loop structure, Pocock's architectural discipline.

## Decisions

- **Fresh context per task, not a live oracle.** Each implementer is a fresh pi instance. Context is assembled entirely from disk: `milestone-spec.md`, `phase-spec.md`, `CONTEXT.md`, ADRs, the ticket, prior summary if one exists. No live oracle.
  - Context windows fill and rot over a long build.
  - The oracle is a single point of failure; it dies with its session.
  - Every escalation becomes an answer written back to disk - the oracle works itself out of a job.
- **Human owns interfaces; agents fill behind them.** Module interfaces in `milestone-spec.md` belong to the human. Agents implement behind them, never redesign them. Any interface-level decision requires human sign-off before it lands.
  - The architecture IS the seam-placement decisions. Silent interface changes produce emergent structure, not architecture.
  - A rejected proposal costs one iteration; a silently-adopted change costs a refactor across every task already built against it.
- **Two documentation axes, one sharp rule.** `.flow/` is temporal: delivery-loop-organized, goes stale once a milestone ships. AGENTS.md files are spatial: anchored to directories, accumulate across milestones. Sharp rule: "what are we building / is it done" → `.flow/`; "why is this code shaped this way" → AGENTS.md.
  - An implementer needs both: `.flow/` tells it what to build; AGENTS.md tells it why the code around it is shaped the way it is.
- **Rolling-wave planning.** Phases beyond the current one stay as one-line stubs. A phase is elaborated into full spec and tickets only immediately before implementation begins.
  - A detailed plan for a phase months out will be wrong before it is used.
  - The re-orient steps harvest what was learned and adjust downstream stubs, keeping the map honest without over-detailing it.
- **Escalation exits without committing.** When an implementer hits a wall - an interface decision or a broken phase premise - it updates on-disk artifacts, writes a failed summary, and exits. It does not resume implementing in the same session.
  - The escalating instance holds grilling conversation plus partial implementation; that polluted context window should not write committed code.
  - The fresh instance picks up with clean context and updated artifacts.

## Constraints

- No live oracle mid-implementation. Questions the disk cannot answer are escalations, not guesses.
- The implement loop is dumb by design. The bash script globs files and invokes pi. Intelligence lives in the pi instances, not the orchestration script.
- `summaries/` is the single source of completion truth. `STATE.md` is a hint; when they disagree, the summaries win.
- Interface changes require human sign-off. `interface-gate.ts` enforces this at the tooling level - no self-approval path exists.
