---
name: milestone-grilling
description: "One-time project kickoff: classify the milestone, name the primary transition(s), name the module interfaces, break the work into phase stubs, decide on a walking skeleton for phase 1, and write the .flow/ foundation."
disable-model-invocation: true
---

The first step of the nested delivery loop. Run once per project. Grill Dan on the
destination, name the module interfaces (the spine he owns), break the milestone into
phase stubs, and decide whether phase 1 is a walking skeleton. Write everything to disk
so the rest of the flow has a foundation to build on.

## Pre-conditions

Check these before anything else.

**If `.flow/milestone-spec.md` already exists:** refuse and stop. This skill runs once
per flow. Read STATE.md to see where the project actually is.

**If `.flow/` does not exist:** create the directory layout now:

```
.flow/
  STATE.md             ← written at the end
  milestone-spec.md    ← written at the end
  CONTEXT.md           ← seeded during grilling
  adr/                 ← created on first ADR
  phases/              ← empty; phase-grilling populates this
```

Run `/grilling` steered through the steps below. Run `/domain-modeling`
throughout - not a separate step, but active the whole time.

### 1. Sharpen the destination

Steer toward the problem and solution. Cover all of these before moving on:

- What are we building? Who is it for? What problem does it solve, and why now?
- What does success look like at the end of this milestone?
- What is explicitly out of scope?
- Any hard constraints - time, tech stack, compatibility?

When a domain term surfaces, resolve it and write it to CONTEXT.md right there via
`/domain-modeling`.

**Done when:** the problem, solution, success definition, and hard constraints are all
on the table and unambiguous.

### 2. Classify the milestone

Ask one question: **is this milestone establishing or changing architecture, or is it
working within established architecture?**

**Establishing / changing:**
- Greenfield — nothing proven yet
- Brownfield adding new or unproven seams, new module interfaces, a new architectural layer
- Rewrites targeting a new architectural shape

**Within established architecture:**
- Brownfield feature work behind existing, working interfaces
- Filling behind seams that are already proven and stable

The establishing path produces typed module interfaces, a primary transition section,
and a mechanical walking-skeleton bar. The within path skips steps 3 and 4 — the
architecture is already in `milestone-spec.md` and downstream skills key off whether
typed zone fields exist. Jump to step 5 on the within path.

If the milestone adds one new seam to an established architecture, treat it as
establishing for that seam and within for the rest.

**Done when:** the path is clear.

### 3. Find primary transitions [Establishing path only]

Before naming module interfaces, identify where the system cashes out its meaning.

Ask:
1. What is this system's primary transition, transaction, or transform?
2. If not one global transition, what is the standard pattern per top-level flow?
3. What goes in?
4. What comes out?
5. Where does the pure boundary sit?

If unknown — don't stop. Route to `/prototype` and spike it. Record it as an ADR
and continue once the spike resolves it.

Allow one global transition, a per-use-case pattern, or a small named set.

The primary transition is the litmus test for module interfaces. A domain module
should be able to say "I serve this transition." Orthogonal modules (auth, logging,
config) are exempt.

**Done when:** at least one transition (or pattern) is named with a signature,
a one-sentence meaning, and a pure-boundary marker.

### 4. Name the module interfaces

Use `/codebase-design` vocabulary. Steer toward **grey-boxes** the human owns.
**Testability is a first-class design criterion** — a hard-to-test interface is a
design smell, and the fix is usually a better interface.

For each module, use the depth and testability tests:
- What does this module expose? (Keep the surface small.)
- What complexity does it hide?
- **Deletion test:** delete this module — complexity disappears (pass-through, push
  down) or reappears (earning its keep)?
- **Testability:** accepts deps rather than creating them? Returns results rather than
  side effects? Can you inject a fake at this seam?
- Which interfaces are stable from day one? Which might flex?

Capture each module in the template as it crystallises — don't accumulate and write
at the end.

**The grey-box contract:** these interfaces belong to Dan. Agents fill the
implementation behind them. An agent may not change the surface without an explicit
Dan decision — that earns an ADR.

For each interface decision that is hard to reverse, surprising without context, and
the result of a real trade-off: open an ADR via `/domain-modeling`.

**Done when:** every top-level module has a named interface with clear seams, a
described test strategy, typed zone fields, and hard decisions have ADRs.

### 5. Break into phase stubs

Steer toward a short rolling-wave plan. Keep far phases as one-liners.

Cover:
- What is the natural build order given the interfaces?
- What can be done independently? What blocks what?
- Is the list short enough to hold in your head?

Each stub: `NN-<name>` plus a one-line description of what it delivers. Phase 1 gets
status `active`; all others get `pending`.

**Done when:** the phase list has a sensible build order, every stub is a one-liner
or short sentence, and blocking relationships are clear.

### 6. Decide: walking skeleton for phase 1?

**Establishing path (new or unproven seams):** yes.

Done-bar for the establishing skeleton:
1. The primary transition exists with real types.
2. A test calls it with in-memory adapters for every required port.
3. One meaningful flow passes through and produces the expected output shape.
4. The test uses zero real infrastructure.

This proves the pure/impure boundary is real, not just that "end-to-end works."

**Within-architecture path (proven seams only):** no, or use the original bar (thinnest
end-to-end slice confirming existing seams wire up).

**Done when:** a clear yes or no, and phase 1's stub reflects it.

### 7. Synthesise and write

Run `/to-spec`, giving it the grilling conversation as context. This is synthesis, not
another interview.

Augment the output with these sections before writing:
- **Primary Transitions** — (establishing path only) the transition(s) or pattern
- **Module Interfaces** — the stable spine
- **Phase List** — the rolling-wave stubs

Write to `.flow/milestone-spec.md`. Write STATE.md last.

**Done when:** all artifacts are written and STATE.md points to phase-grilling on
phase 01.

## `milestone-spec.md` format

```markdown
# Milestone: <name>

## Problem Statement
## Solution
## User Stories

High-level, milestone-scoped. Each is a meaningful outcome.
1. As a <actor>, I want <feature>, so that <benefit>

## Implementation Decisions

Module-level decisions. No file paths or code snippets unless a prototype produced a
snippet that pins a decision better than prose.

## Testing Decisions

Where the test seam is. What makes a good test in this codebase. Driven by
the testability discussion in step 2 — this summarises what was decided there.

For each module interface: which fake or in-memory adapter exercises it in
tests? How do you know the implementation behind the interface is correct?

## Out of Scope

## Primary Transitions

[Establishing path only. Omit for within-architecture milestones.]

The place(s) where the system cashes out its meaning. Named before module
interfaces; every domain module should be able to say which transition it serves.
Orthogonal modules (auth, config, logging) are exempt.

### 1. `<function-or-pattern-signature>`

**Meaning:** one sentence.

**Pure boundary:** where the pure/impure line sits.

Add more if the system has multiple top-level flows. Use a pattern
(`decide(State, Command) -> (State, Effects, Result)`) when there's no single
global function.

## Module Interfaces

The grey-boxes Dan owns. Agents fill the implementation behind each one. The human
understands the architecture through these interfaces, not through what's inside them.
These don't change without Dan's explicit decision; a change earns an ADR.

For each module:

### `<ModuleName>`

**Exposes:** what callers see — methods, types, invariants, error modes. Keep it small.

**Hides:** the complexity behind the interface. More hidden = deeper module.

**Seam:** where this interface lives (layer, package, file pattern). Enough for an
implementer to know where to build.

**Test seam:** how this module is tested. What fake or in-memory adapter sits at
this seam in tests. Whether the interface accepts its dependencies (so fakes can
be injected) or creates them (a red flag). Describable in one sentence.

**Stability:** stable from day one | may flex in phase N | to be confirmed.

**Zone:** `pure` | `shell` | `port`
- `pure` — no I/O, deterministic given inputs, testable with no fakes at all
- `shell` — orchestrates use cases; sequences pure calls and port calls; holds no domain policy
- `port` — external dependency; has an in-memory adapter for tests and a production adapter

**Allowed deps:** `values only` | `ports only` | `external system`

**Effects leave via:** `none` | `returned data` | `injected port`

**Forbidden move:** one or two sentences. The one thing (or two, if genuinely distinct)
this module must never do.

*Ports only:* a port seam is real only if both adapters implement the same contract
without test-only hooks on the production interface.

## Phase List

| Phase | Description | Status |
|---|---|---|
| 01-<name> | <stub> | active |
| 02-<name> | <stub> | pending |
```

Status values: `pending`, `active`, `done`. Set phase 1 to `active`, rest to `pending`.
Status transitions after this belong to `phase-reorient`.

## Handoff

Write STATE.md last:

```
current_phase: 01-<first-phase-name>
current_task: none
status: grilling
```

## Reads / Writes

**Reads:** the grilling conversation; existing repo state (scanned during step 2).

**Writes:**

| File | Notes |
|---|---|
| `.flow/milestone-spec.md` | written once |
| `.flow/CONTEXT.md` | seeded with glossary entries and rules |
| `.flow/adr/NNNN-<slug>.md` | one per hard decision meeting ADR criteria |
| `.flow/STATE.md` | written last |

Write nothing under `.flow/phases/` — that is phase-grilling's territory.
