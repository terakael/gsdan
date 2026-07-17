# Artifact Contract

The shared seam every skill in the flow depends on. All state lives on disk under `.flow/` at the repo root. Skills read and write these files; a fresh implementer agent assembles its entire context from here and never talks to a live oracle.

This document is the source of truth for paths, file structure, ownership, and lifecycle. If a skill needs to read or write flow state, it does it the way described here.

## Layout

```
.flow/
  STATE.md                       # resumable pointer: current phase / task / status
  milestone-spec.md              # the destination + module interfaces + phase stubs
  CONTEXT.md                     # ubiquitous language + harvested project rules
  adr/
    NNNN-<slug>.md               # one hard, hard-to-reverse decision each
  phases/
    NN-<name>/
      phase-spec.md              # this phase's high-detail spec
      tickets/
        NN-<slug>.md             # one task: acceptance criteria + blocking edges + constraints
      summaries/
        NN-<slug>.md             # status: done|failed + notes; authoritative for completion
  milestone-audit.md             # cross-phase integration + requirements coverage
```

## Conventions

- **Numbering.** Zero-padded two-digit prefixes for phases and tickets (`01`, `02`, ...); four-digit for ADRs (`0001`). Prefixes are for human readability and as a stable tiebreaker — they are not a topological guarantee. The real dependency truth is the blocking edges declared inside each ticket (see "Frontier computation" below).
- **Slugs.** kebab-case, short. `01-mine-a-rock`.
- **Single source of truth for "done."** Completion lives only in `summaries/` (see below). Nothing else records done-state. `STATE.md` is a convenience pointer, not a second source of truth.

## Inferring state (no index files)

There is deliberately no ticket index. The loop infers everything from files that already exist:

- **Ticket set** — glob `phases/NN-<name>/tickets/*.md`.
- **Done-state** — a ticket is done iff `summaries/<slug>.md` exists with `status: done`.
- **Runnable ticket** — a ticket with no done-summary whose blocking-edge slugs all have done-summaries.
- **Frontier** — the set of all runnable tickets. The loop picks the lowest-prefix one.
- **Next ticket** — the lowest-prefix runnable ticket (see "Frontier computation" below).
- **Phase complete** — every ticket has a done-summary.

The loop only reads the `status:` line to decide done-ness; it never reads the whole summary pile. An implementer reads only its own ticket's prior summary.

## Frontier computation

The loop and `task-reorient` both use the same rule to find the next ticket:

1. Glob `tickets/*.md`, sort by prefix.
2. For each ticket (in prefix order): skip if it has a done-summary. Check its blocking-edges section — if every listed slug has a done-summary, this ticket is **runnable**.
3. The first runnable ticket is the next ticket.
4. If no runnable ticket exists and all tickets have done-summaries → phase complete.

Prefix is a stable tiebreaker for tickets with no ordering dependency between them — not a topological guarantee. `phase-grilling` numbers tickets in a sensible reading order, but that order is not load-bearing. Blocking edges are the authority.

## Files

### `STATE.md`

A small resumable pointer so a human (and later the tmux orchestration script) can pick up after a full restart. Written by every skill as it transitions. It is a **hint**: if it ever disagrees with the summaries (e.g. a crash mid-write), the summaries win and `STATE.md` can be rebuilt by scanning them.

```
current_phase: 01-<name>
current_task: 02-<slug>          # or "none" between tasks
status: grilling | implementing | reorienting | audit | blocked | ready-to-ship
```

### `milestone-spec.md`

The destination. Written by `milestone-grilling`; amended by `phase-reorient` (downstream phase stubs) and `milestone-audit` (gap phases). Read by **every implementer** — this is the vision they build with the grain of.

Contents:
- **Problem** / **Solution**.
- **Primary Transitions** — (establishing-path milestones only) the primary transition(s) or transition pattern: signature, one-sentence meaning, pure-boundary marker. Omitted for within-architecture milestones.
- **Module interfaces** — the spine the human owns. Each interface now includes typed fields: Zone (`pure` | `shell` | `port`), Allowed deps, Effects leave via, Forbidden move. These fields are present only on establishing-path milestones; their absence signals a within-architecture milestone to downstream skills.
- **Phase list** — each entry is `NN-<name>`, a one-line stub, and a status (`pending` / `active` / `done`).

### `CONTEXT.md`

Seeded by `milestone-grilling`; appended by `phase-grilling` and both re-orient steps (all via `/domain-modeling`). Read by **every implementer** — this is the rulebook.

Contents:
- **Glossary** — term → definition (the ubiquitous language).
- **Rules** — project-specific conventions that emerged ("in this codebase we always X").

### `adr/NNNN-<slug>.md`

One hard, hard-to-reverse decision per file. Written whenever such a decision is made or confirmed (including during escalation). Read by implementers whose area the decision touches.

Standard ADR structure:
```
# NNNN. <title>

Status: proposed | accepted | superseded by NNNN
Context: <the forces at play>
Decision: <what was decided>
Consequences: <what follows, good and bad>
```

### `phases/NN-<name>/phase-spec.md`

This phase's high-detail spec, elaborated from the milestone-spec stub. Written by `phase-grilling`; amended lightly by `task-reorient`, more heavily on escalation. Read by implementers in this phase.

Contents:
- The phase's **goal** and **scope**.
- What **"done" for the phase** looks like.
- **Module Interfaces** — which grey-boxes this phase advances: each module listed as `implementing behind` or `wiring / using`.
- **Testing Decisions** — fake/adapter strategy, test seam, example test shape, contract test requirements for any new ports.
- **Architecture Assertions** — structural invariants the code must obey (e.g. "primary transition remains callable with in-memory adapters only"). Distinct from Testing Decisions.

### `phases/NN-<name>/tickets/NN-<slug>.md`

One task. Written by `phase-grilling`; rewritten by escalation, `task-reorient`, or `phase-reorient` (fix-up tickets). Read by the implementer working it.

Contents — **what, not how**:
- **What to build** — the end-to-end behaviour this ticket makes work, described as a vertical slice.
- **Interface** — which module interface(s) from `milestone-spec.md` this slice builds behind or wires across, marked as `implementing behind` or `wiring / using`. The implementer must not change the listed interface surfaces; a surface change is an escalation.
- **Acceptance criteria** — what done looks like, written from the caller's perspective at the interface seam.
- **Blocking edges** — which tickets must be done before this one can start.
- **Constraints** — any hard constraints that came out of grilling.

It does not prescribe implementation. The implementer decides *how*, within the milestone-spec vision: build the minimal slice this ticket asks for, but place seams where the vision says they go.

### `phases/NN-<name>/summaries/NN-<slug>.md`

The authoritative completion record for a ticket. Written by the implementer at the end of each ralph iteration, success or failure. Overwritten each attempt (only the latest attempt's notes are kept). Read by the next iteration (to learn from a prior failure) and by the re-orient steps (to harvest decisions).

On **done**, the summary opens with the startup-ritual lines written before coding began:
```
status: done

Module zone: <pure | shell | port>
Allowed dependencies: <values only | ports only | external system>
Forbidden move: <one or two sentences>
Pure boundary intact: <yes — evidence: ... | N/A - pure core>
```
Followed by: what was built, key decisions, files touched.

The `Pure boundary intact` field is required when the task touches a port, the shell, or the pure/impure seam. Use `N/A - pure core` for tasks entirely inside the pure core. Only present on establishing-path milestones (where typed zone fields exist in milestone-spec).

On **failed**: what was tried, what wall was hit, what to try differently.
- On **failed**: what was tried, what wall was hit or why it failed — so the next iteration takes a different path.

### `milestone-audit.md`

Written by `milestone-audit`. Read by the human; on gaps, feeds new phase stubs back into `milestone-spec.md`.

Contents:
- Cross-phase **integration findings** (the seams between phases — what no single phase re-orient can see).
- **Requirements coverage** against the destination.
- **Gap list** and overall status.

## AGENTS.md files

The durable-why layer. AGENTS.md files live in the codebase itself, next to the code they document — not under `.flow/`. They are spatial: anchored to directories, outliving any single milestone.

**The sharp rule:** if a fact answers "what are we building / is it done", it belongs in `.flow/`. If it answers "why is this code shaped this way", it belongs in `AGENTS.md`.

`.flow/` is temporal — organized by the delivery loop, goes stale once a milestone ships. AGENTS.md files outlive the plan and accumulate across milestones.

**Two kinds of why:**
- **Intent-why** — why this seam exists, what it must never do. Known before coding, from the ticket and grilling artifacts. Written during the red step alongside the failing tests.
- **Discovered-why** — rationale only visible after writing code: constraints hit, approach chosen over a failed alternative. Appended during the drive to green.

**Layered contract:** every AGENTS.md covers only its own directory layer. An agent working anywhere loads the full ancestor chain and gets complete, non-redundant context. Anything already in a parent AGENTS.md is not repeated; anything specific to one child goes in that child, not the parent.

**Lifecycle:** AGENTS.md is staged and uncommitted during the red/green cycle, then committed together with the code and tests in the one commit when the ticket goes green. Spec and code are one artifact.

**Who writes it:**
- The implementer writes and updates leaf-level AGENTS.md for touched directories (red through green).
- `phase-reorient` curates the higher layers (module / directory-type) once the phase's full shape is visible.
- `task-reorient` does a light sweep after each ticket to confirm leaf AGENTS.md landed.
- `milestone-audit` checks the whole ancestor chain for coherence and non-redundancy across the tree.

See `AGENTS-WRITING-STANDARDS.md` for format rules, layer specificity filters, and the redundancy discipline.

## Who touches what

| Artifact | Written by | Read by |
|---|---|---|
| `STATE.md` | every skill (on transition) | human, orchestration script |
| `milestone-spec.md` | `milestone-grilling`, `phase-reorient`, `milestone-audit` | every implementer |
| `CONTEXT.md` | `milestone-grilling`, `phase-grilling`, both re-orients | every implementer |
| `adr/*` | any skill making a hard decision | implementers in that area |
| `phase-spec.md` | `phase-grilling`, `task-reorient`, escalation | implementers in the phase |
| `tickets/*` | `phase-grilling`, `task-reorient`, `phase-reorient` (fix-up), escalation | the implementer working it |
| `summaries/*` | the implementer | next iteration, re-orient steps |
| `milestone-audit.md` | `milestone-audit` | human, then `milestone-spec.md` |
| `AGENTS.md` (leaf) | implementer | implementer (next task), engineers |
| `AGENTS.md` (higher layers) | `phase-reorient` | engineers, implementers in that area |

## An implementer's assembled context

When the ralph loop spins up a fresh instance for one ticket, that instance's context is assembled from:

- `milestone-spec.md` — the vision (so it builds with the grain)
- this phase's `phase-spec.md` — the phase scope
- `CONTEXT.md` — the glossary and rules
- relevant `adr/*` — the hard decisions in its area
- its own `tickets/<slug>.md` — the task: what to build, which interface it builds behind, acceptance criteria, blocking edges, constraints
- its own `summaries/<slug>.md` if a prior attempt exists — what already failed
- the ancestor chain of `AGENTS.md` for its target directory — durable why for this scope

Nothing else. No live oracle. If the docs don't answer a question the agent needs, that's a gap the agent escalates — and the answer gets harvested back into these files so the next fresh agent inherits it.
