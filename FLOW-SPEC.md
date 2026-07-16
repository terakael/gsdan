# Spec: The Nested Delivery Loop

A workflow for building software from a fuzzy idea to a shipped milestone, where a human owns the architecture and fresh-context agents do the implementation. It combines two things that each have half the answer: Pocock's architectural discipline (deep modules, human-owned interfaces, ubiquitous language, tracer bullets, TDD) and GSD's operational loop (plan → execute → verify → re-orient, with rolling-wave planning). Pocock has the destination but no clean loop. GSD has the loop but plans like vibe coding. This is the combination.

## Problem Statement

Two approaches exist and each is missing the other's strength.

Pocock's flow (`grill → to-spec → to-tickets → implement`) produces a strong architecture: the human holds ~10 module interfaces in their head, agents fill the implementations behind them, everything is TDD'd against a fast in-memory seam. But it front-loads all the thinking into one grilling session and then goes quiet. There's no named step for what happens when implementation teaches you something the spec missed - and on any large project, it always does. The planned journey is never the actual journey.

GSD has that loop. It plans a phase in detail only when you're about to build it (rolling-wave), executes with clear deviation rules, verifies, and re-plans when gaps appear. But its plans are lists of file edits. There's no concept of the human owning interfaces while agents work behind them, no deep-module discipline, no TDD, no tracer bullet. An agent following GSD produces working code with no principled model of where seams go.

The people who need this are one human architect and a series of fresh-context implementer agents. The human can't hold every ticket in their head at once, and shouldn't have to. The agents start each task with no memory of the discussion that shaped the project - so they either guess (and drift off-vision) or interrogate a live oracle agent (which doesn't scale and dies with its context window). Neither is good enough.

## Solution

A nested loop with two levels. A **milestone** contains **phases**; a **phase** contains **tasks**. Each level has a grilling step at the start (elaborate the low-detail stub into a high-detail spec) and a re-orient step at the end (harvest what was learned, adjust what's downstream). This is rolling-wave planning made recursive: you only ever hold one phase and one task in high detail, everything further out stays a low-detail stub until you get close - like swapping a low-res texture for a high-res one as you approach it.

The human owns the architecture at every level: the milestone spec names the module interfaces (the spine that doesn't move), and every implementer agent reads that spec so it builds *with the grain*. The rule that makes fresh-context agents work: **build the minimal slice this ticket asks for, but place your seams where the vision says they go.** YAGNI on scope, build-with-the-grain on structure. The agent doesn't implement future features, but it puts its interfaces exactly where the target architecture says, so the next task is a fill and not a refactor.

The knowledge that used to live in a live oracle agent's context window is externalised to disk. Every implementer assembles its context from durable artifacts - the milestone spec, the phase spec, `CONTEXT.md`, the relevant ADRs, and its ticket - not from a conversation. The re-orient steps *harvest* what was learned back into those artifacts, so the next fresh agent inherits it. The docs are the oracle.

Implementation is a **ralph loop**: a bash script spins up a fresh `pi` instance per iteration, points it at the assembled context and one ticket, and lets it drive TDD to green. It commits only on success. On failure it writes down what it tried and why it failed, so the next iteration takes a different path. tmux is assumed present throughout; when an agent hits an interface-level decision it can't make alone, it stops and the human jumps into that pane to answer inline.

This spec covers the **skills only**. Running them is manual for now - the human invokes each skill in the TUI by hand and tests locally. The tmux orchestration script that would chain the whole flow together is out of scope; it's far easier to write once the steps are known-good.

## The nested loop

```
MILESTONE
  1. milestone-grilling   → destination + phase stubs; milestone spec; is phase 1 a walking skeleton?
  ├─ PHASE (repeat per phase)
  │    2. phase-grilling   → phase spec + task tickets; adjust downstream phase stubs
  │    ├─ TASK (repeat per task)
  │    │    3. implement    → ralph loop, TDD to green, Pocock discipline; escalate interface changes to human
  │    │    4. task-reorient → (lightweight) harvest decisions + check remaining tasks
  │    └─ 5. phase-reorient → adjust downstream phases; harvest into milestone spec
  └─ 6. milestone-audit    → cross-phase integration + requirements coverage; gaps restart the loop; then ship
```

Each level adjusts *its own container's spec*. A task re-orient touches the phase spec (affecting the remaining tasks in this phase). A phase re-orient touches the milestone spec (affecting downstream phases). The one cross-level jump: if an implementer discovers something that breaks the *phase itself* (not just remaining tasks), it escalates early - see "Escalation" below. Even then, the blast radius stays inside the phase; the cascade up to the milestone spec and downstream phases waits for the end-of-phase `phase-reorient`.

## Escalation

When an implementer hits a wall it can't resolve alone, "escalate" doesn't mean the instance freezes. It means the agent **changes what it's doing**: it stops implementing and runs `phase-grilling` inline, in the same instance. Because tmux is present the human is already at that pane and answers the questions inline. The stuck instance has the full context of *why* it hit the wall, so it's the best-positioned thing to run that grilling.

The grilling updates the on-disk artifacts (`phase-spec.md`, the revised tickets, `CONTEXT.md`, ADRs), the instance writes a `summaries/` entry noting it escalated, and then it **exits without committing**. The ralph loop re-evaluates the (now revised) tickets and its next iteration picks up with a fresh instance. Two reasons the escalating instance exits rather than resuming implementation:

- **Fresh-context-per-task stays intact.** The escalating instance now carries grilling conversation plus whatever half-done implementation it had. You don't want that polluted context writing committed code. Hand back to a clean implementer against the revised ticket.
- **The loop stays dumb.** The bash script's only rule is "keep going while unchecked tickets remain." Grilling rewrites the tickets on disk; the loop just re-evaluates and continues. No escalation branch in the script - the whole escalation lives inside the pi instance.

The scope of the inline grilling scales with the problem, but the mechanism is identical either way:

- **Interface decision** → short. One or two questions, record an ADR, done.
- **Phase premise broken** → a full `phase-grilling` re-run on the phase, rewriting the remaining tickets.

What survives an escalation: already-committed tasks stay (they're green and committed, the new knowledge doesn't un-build them); the in-flight task's uncommitted work is discarded and likely rewritten by the re-plan; remaining tickets are re-planned. The implementer never makes the phase-level call itself - it escalates, the human confirms inline, and the re-plan happens with human involvement. That's the drift-prevention: an agent never silently adapts a phase.

The reference ralph loop's `max_iterations` cap naturally stops a task that keeps escalating without resolving.

## The on-disk artifact contract

This is the heart of the design. Every skill reads and writes these files; a fresh implementer agent gets everything it needs here and never talks to a live oracle. **`dan/ARTIFACT-CONTRACT.md` is the source of truth for paths, file structure, ownership, and lifecycle** - the summary below is orientation only.

```
.flow/
  STATE.md                     # resumable pointer: current phase / task / status (a hint, not truth)
  milestone-spec.md            # the destination: problem, solution, module interfaces, phase stubs
  CONTEXT.md                   # ubiquitous language + harvested project-specific rules
  adr/
    NNNN-<slug>.md             # hard, hard-to-reverse decisions, one per file
  phases/
    NN-<name>/
      phase-spec.md            # this phase's high-detail spec (from phase-grilling)
      tickets/
        NN-<slug>.md           # one task: acceptance criteria + blocking edges + constraints
      summaries/
        NN-<slug>.md           # status: done|failed + notes; authoritative for completion
  milestone-audit.md           # cross-phase audit output (from milestone-audit)
```

There is deliberately **no ticket index**. The loop infers work state from files that already exist: the ticket set and order from globbing `tickets/` by prefix, and done-state from whether a `summaries/<slug>.md` exists with `status: done`. `STATE.md` is a resumable pointer only - if it disagrees with the summaries, the summaries win. This keeps "what's done" in exactly one place and avoids redundant bookkeeping writes.

An implementer's assembled context is: `milestone-spec.md` + this phase's `phase-spec.md` + `CONTEXT.md` + relevant `adr/` files + its own ticket + its own prior `summaries/` entry if one exists.

## The skills

Six skills, one per step, each a `SKILL.md` in `dan/`, each independently delegatable. All reuse existing Pocock skills rather than reimplementing.

### 1. `milestone-grilling`

- **Reads:** the human's rough idea (conversation), any existing repo state.
- **Does:** drives `/grilling` to sharpen the destination. Names the module interfaces (the spine). Breaks the milestone into phase stubs - one-liners, not detailed. Decides whether phase 1 is a **walking skeleton**: warranted whenever the milestone introduces new or unproven seams (always true greenfield; true for a brownfield milestone that adds new architecture; false for pure fill against proven seams).
- **Writes:** `milestone-spec.md` (destination + interfaces + phase stubs), seeds `CONTEXT.md`, opens ADRs for hard decisions.
- **Reuses:** `/grilling`, `/to-spec`, `/domain-modeling` (for the glossary).

### 2. `phase-grilling`

- **Reads:** `milestone-spec.md`, `CONTEXT.md`, ADRs, the stub for the phase being started.
- **Does:** drives `/grilling` scoped to this one phase. Elaborates the stub into a full `phase-spec.md`. Breaks it into task tickets with blocking edges. If a task's *approach* (not just scope) is genuinely unknown, spikes it with `/prototype` first, then writes the ticket. Does **not** touch `milestone-spec.md` - any downstream implications it surfaces are recorded in `CONTEXT.md` / ADRs / the phase-spec and applied at the end-of-phase `phase-reorient`, keeping all mid-phase change encapsulated within the phase.
- **Writes:** `phase-spec.md`, `tickets/*`, new ADRs / `CONTEXT.md` entries. (Reads `milestone-spec.md` but never writes it.)
- **Reuses:** `/grilling`, `/to-spec`, `/to-tickets`, `/prototype`, `/domain-modeling` (new terms and patterns emerge once you're in the tasks - keep the glossary sharp and record ADRs as decisions harden).

### 3. `implement` (the ralph loop)

- **Form:** a bash script (`implement.sh` or similar) that loops, spinning up a fresh `pi` instance per iteration against one ticket. Modelled on the reference ralph loop but adjusted: fresh context each pass (no context rot), context assembled from the on-disk artifacts, TDD to green, commit only on success.
- **Each iteration does:** read assembled context (milestone spec, phase spec, `CONTEXT.md`, relevant ADRs, ticket, prior summary if any) → drive `/tdd` one red-green slice at a time → build the minimal slice but **place seams to match the milestone-spec vision** → on green, run `/code-review`, then commit and write a success `summaries/` entry → on failure, write a `summaries/` entry recording what was tried and why it failed (so the next iteration takes a different path), no commit.
- **Escalation:** if the agent hits a wall it can't resolve alone - an **interface-level decision** that would change a module interface in `milestone-spec.md`, or a discovery that the **phase premise itself is wrong** - it stops implementing and runs `phase-grilling` inline (see "Escalation" above). It does not resolve these silently. After the grilling updates the artifacts on disk, the instance exits without committing and the loop resumes with a fresh instance against the revised tickets.
- **Reuses:** `/tdd`, `/code-review`, `/codebase-design` (for seam placement vocabulary).

### 4. `task-reorient` (lightweight)

- **Reads:** the just-completed task's `summaries/` entry, `phase-spec.md`, remaining `tickets/`.
- **Does:** harvests any decisions made mid-implementation into `CONTEXT.md` / ADRs (mostly these already exist from the escalation step, so this is a sweep, not new thinking). Checks whether the remaining tickets in this phase are still right; splits/reorders/reframes as needed. Stays lightweight by default - the blast radius is just the rest of the phase. A phase-breaking discovery is handled earlier and inline via escalation (see "Escalation"), not deferred to here.
- **Writes:** updates to `tickets/`, `CONTEXT.md`, possibly `phase-spec.md`.
- **Reuses:** `/domain-modeling` (glossary / ADR harvesting).

### 5. `phase-reorient`

- **Reads:** all of this phase's `summaries/`, `phase-spec.md`, `milestone-spec.md`, downstream phase stubs.
- **Does:** looks at what the whole phase taught us and adjusts the downstream phases in `milestone-spec.md` - add, remove, or modify stubs to stay in sync with the destination. Harvests durable rules into `CONTEXT.md` / ADRs.
- **Writes:** updates to `milestone-spec.md` phase stubs, `CONTEXT.md`, ADRs.
- **Reuses:** `/domain-modeling` (glossary / ADR harvesting).

### 6. `milestone-audit`

- **Reads:** `milestone-spec.md`, all phases' specs and summaries.
- **Does:** checks the **seams between phases** - integration across the whole milestone, which no per-phase re-orient can see (each phase can be green while the joins don't line up). Checks requirements coverage against the destination. If gaps are found, restarts the loop with new phases (or a focused gap-closure phase) to close them, then re-audits. When clean, ships (commit/tag).
- **Writes:** `milestone-audit.md`; on gaps, new phase stubs in `milestone-spec.md`.

## What carries over from the reference ralph loop

- Fresh instance per iteration - no context rot, each task starts clean.
- A checklist/summary artifact that carries minimal state between iterations (here, `summaries/` per task rather than one global `STATE.md`).
- One unit of work per pass; only marked done when actually done.
- The loop script checks for remaining work and exits when there's none.

Adjusted for our needs: context is assembled from the full on-disk artifact layout (not one `SPEC.md`), the work is driven through `/tdd` and `/code-review` rather than freeform, commits happen only on success, and failures are recorded for the next iteration to learn from.

## Out of Scope

- **The tmux orchestration script** that chains the whole flow end to end. Build and manually test the six skills first; automate once they're known-good. (The interface-escalation design already assumes tmux is present, so the automation has a clear hook when we get there.)
- **Any non-local / non-manual running.** Everything runs in the local repo, invoked by hand in the TUI.
- **A ticket-tracker integration.** Tickets are markdown files under `.flow/phases/*/tickets/` for now; native blocking links on a real tracker are a later concern.
- **Reimplementing Pocock primitives.** We wrap `/grilling`, `/to-spec`, `/to-tickets`, `/tdd`, `/code-review`, `/prototype`, `/domain-modeling`, `/codebase-design` - not rebuild them.
- **The name.** "The Nested Delivery Loop" is a working title.

## Further Notes

- **The oracle works itself out of a job.** Early on, an implementer may hit gaps the docs don't cover and escalate to the human. Each escalation becomes an ADR or `CONTEXT.md` entry at re-orient, so the next fresh agent inherits the answer. Over time the docs get complete enough that escalations become rare. That's the goal: disk replaces the live oracle.
- **Two triggers for re-orientation, matching the research.** Lightweight check after every task (harvest + "is the next task still right?"); fuller re-orient at the phase boundary. Time is never the trigger - completion and surprise are.
- **Build order for the skills themselves:** the artifact contract (`.flow/` layout) is the shared seam every skill depends on, so pin it first. Then `milestone-grilling` and `phase-grilling` (they produce the artifacts), then `implement` (the ralph loop, the riskiest piece), then the two re-orient skills and the audit. Each can be delegated to a separate agent once the contract is fixed.
