# Spec: `milestone-grilling`

The first step in the nested delivery loop. You invoke it once per project with a rough idea in mind. It grills you on the destination, names the module interfaces (the spine you own), breaks the milestone into phase stubs, and decides whether phase 1 is a walking skeleton. Then it writes everything to disk so the rest of the flow has a foundation to build on.

Hands off to `phase-grilling`.

---

## Pre-conditions

Check before doing anything else.

**If `.flow/milestone-spec.md` exists:** refuse and stop. This skill runs once per flow. Check `STATE.md` to see where you actually are. (See "Out of scope" for why this is a deliberate limit, not an oversight.)

**If `.flow/` doesn't exist:** create the directory layout:

```
.flow/
  STATE.md         ← written at the end of this skill
  milestone-spec.md
  CONTEXT.md
  adr/             ← created on first ADR
  phases/          ← empty; phase-grilling populates this
```

---

## Step-by-step

Run `/grilling` steered through the steps below. `/domain-modeling` is active throughout - not a separate step after. Capture terms as they surface, challenge fuzzy language, write CONTEXT.md entries and ADRs as things crystallise.

At the end, synthesise via `/to-spec`, augment the output, and write the artifacts.

### 1. Sharpen the destination

Steer toward the problem and solution. What are we building? Who's it for? What's the actual problem? Why does it need solving now?

Cover these before moving on:
- What does success look like at the end of this milestone?
- What's explicitly out of scope?
- Any hard constraints - time, tech stack, compatibility?

This is also where the first glossary entries go. When a domain term comes up, resolve it and write it to CONTEXT.md right there.

### 2. Classify the milestone

Before naming interfaces, ask one question: **is this milestone establishing or changing architecture, or is it working within established architecture?**

**Establishing / changing:**
- Greenfield — nothing is proven yet
- Brownfield adding new or unproven seams, new module interfaces, a new architectural layer
- Rewrites targeting a new architectural shape

**Within established architecture:**
- Brownfield feature work behind existing, working interfaces
- Filling implementations behind seams that are already proven and stable

**Why this matters:** the establishing path produces typed module interfaces, a primary transition section, and a mechanical walking-skeleton bar. The within path skips steps 3 and 4 and the typed-field work — the architecture is already specified, and downstream skills key off whether typed zone fields exist in `milestone-spec.md`. If this is a within-architecture milestone, jump straight to step 5 after this step.

If the milestone adds one new seam to an otherwise established architecture, treat it as establishing for that seam and within for the rest.

### 3. Find primary transitions [Establishing path only]

Before naming module interfaces, identify where the system cashes out its meaning: the **primary transition(s)**.

Ask:
1. What is this system's primary transition, transaction, or transform?
2. If there isn't one global transition, what is the standard pattern per top-level flow?
3. What goes in?
4. What comes out?
5. Where does the pure boundary sit?

If the primary transition is unknown — don't stop. Route to `/prototype` and spike it. The right transition sometimes only becomes clear from throwing code at it. Record it as an open architectural decision (ADR) and continue once the spike resolves it.

Allow:
- One global transition (tick reducer, main processing loop)
- A per-use-case pattern: `decide(State, Command) -> (State, Effects, Result)`
- A small named set (write path + read path)

**The primary transition is the litmus test for module interfaces in step 4.** A module should be able to answer "I serve this transition." Some modules — auth, logging, config — are legitimately orthogonal and don't need to justify themselves against the primary transition. But a domain module that can't answer the question at all may be premature or mis-scoped.

Record the primary transition(s) in the format described in "milestone-spec.md format" below.

### 4. Name the module interfaces

Use `/codebase-design` vocabulary throughout this step. The goal is a set of **grey-boxes**: each module has an interface the human owns and an implementation agents fill behind it. The human understands the architecture through these interfaces, not through what's inside them. **Testability is a first-class design criterion here, not an afterthought** - an interface that's hard to test is a design smell, and the fix is usually a better interface.

Steer toward the architecture spine. The human owns roughly 10 module interfaces; agents fill the implementations behind them. Naming these is the main act of this step.

For each module, use the `/codebase-design` depth and testability tests to drive the grilling:
- What does this module expose to callers? (Keep the surface small.)
- What complexity does it hide? (The more it hides, the deeper it is.)
- **Deletion test:** if you deleted this module, would complexity disappear or reappear across callers? Disappear → it's a pass-through; push down. Reappear → it's earning its keep.
- Where does the seam sit? What crosses the boundary?
- **Testability:** does the interface accept its dependencies rather than create them? Does it return results rather than produce side effects? Can you inject a fake or in-memory adapter at this seam without touching the implementation? What does a test of this module look like from the caller's perspective?
- Which interfaces are stable from day one? Which might flex as the phases progress?

For each module agreed on, write it up using the structured template in the `milestone-spec.md` format below before moving on. Don't accumulate them and write at the end - capture each one as it crystallises, so the definition is fresh and exact.

The grey-box contract: **these interfaces belong to the human. Agents fill the implementation behind them. An agent may not change the interface surface without an explicit human decision - that decision earns an ADR.**

If an interface decision is hard to reverse, surprising without context, and the result of a real trade-off - open an ADR (via `/domain-modeling`). Skip it if any of the three is missing.

### 5. Break into phase stubs

Steer toward the rolling-wave plan. The goal is a short ordered list of one-liner stubs. Don't over-specify the far phases - that's intentional.

Cover:
- What's the natural build order given the interfaces?
- What can be done independently? What blocks what?
- Is the list short enough to hold in your head?

Each stub: `NN-<name>`, one-line description of what it delivers. Phase 1 gets status `active`; all others get `pending`. Near phases can run to a sentence or two; far phases stay one-liners until `phase-grilling` reaches them.

### 6. Decide: walking skeleton for phase 1?

Steer toward a yes/no using the milestone classification from step 2.

**Yes (establishing path — new or unproven seams):**
- Greenfield: always. Nothing is proven yet.
- Brownfield adding new architecture: new module interfaces, new integration points, untested wiring.

On the establishing path the walking skeleton has a mechanical done-bar tied to the primary transition:
1. The primary transition exists with real types.
2. A test calls it with in-memory adapters for every required port.
3. One meaningful flow passes through and produces the expected output shape.
4. The test uses zero real infrastructure.

This proves the pure/impure boundary is real, not just that "end-to-end works." If there are multiple primary transitions, exercise the riskiest or most central one; include others if cheap.

**No (within-architecture path — proven seams only):**
- Brownfield milestone filling behind existing, working interfaces.
- The within-path skeleton (if used) has the original bar: thinnest end-to-end slice confirming the existing seams wire up. No typed-zone proof required.

If yes: phase 1's stub describes the walking skeleton. Not a feature — just the minimal path through the architecture. Phase 2 onwards is feature work.

If no: phase 1 is the first feature slice.

### 7. Synthesise

Run `/to-spec` to turn the grilling conversation into a structured document. This is synthesis, not another interview - `/to-spec` just formalises what the grilling already resolved.

Then augment the output with these sections:
- **Primary Transitions** — (establishing path only) the primary transitions or pattern
- **Module Interfaces** — the stable spine (see format below)
- **Phase List** — the rolling-wave stubs

Write the result to `.flow/milestone-spec.md`.

### 8. Write artifacts

See "Reads / Writes" for the full list. Write STATE.md last.

---

## Reads / Writes

**Reads:**
- The grilling conversation (in-context)
- Existing repo state (scanned during step 2 to orient the module interface discussion)

**Writes:**

| File | Notes |
|---|---|
| `.flow/milestone-spec.md` | the destination; written once by this skill |
| `.flow/CONTEXT.md` | seeded with glossary entries and rules from the grilling |
| `.flow/adr/NNNN-<slug>.md` | one per hard decision that meets the ADR criteria |
| `.flow/STATE.md` | written last (see "Handoff") |

Does **not** write anything under `.flow/phases/` - that's `phase-grilling`'s territory.

---

## `milestone-spec.md` format

```markdown
# Milestone: <name>

## Problem Statement

The problem, from the user's perspective.

## Solution

The solution, from the user's perspective.

## User Stories

High-level, milestone-scoped. Each one is a meaningful outcome, not a single ticket.

1. As a <actor>, I want <feature>, so that <benefit>

## Implementation Decisions

Module-level decisions: which modules exist, what each is responsible for,
any hard architectural choices. No file paths or code snippets - unless a
prototype produced a snippet that pins a decision better than prose can, in
which case inline it and note it came from a prototype.

## Testing Decisions

Where the test seam is. What makes a good test in this codebase. Seam-level,
not file-level. Driven by the testability discussion in step 2 — this section
summarises what was already decided, not new thinking.

For each module interface: which fake or in-memory adapter exercises it in
tests? How do you know the implementation behind the interface is correct?

## Out of Scope

What this milestone deliberately does not do.

## Primary Transitions

[Establishing path only. Omit for within-architecture milestones.]

The place(s) where the system cashes out its meaning. Written before module
interfaces; every domain module should be able to say which transition it serves
(some — auth, config, logging — are legitimately orthogonal and don't need to).

### 1. `<function-or-pattern-signature>`

**Meaning:** one sentence on what this transition represents.

**Pure boundary:** where the pure/impure line sits relative to this transition.
The signature fixes what stays pure and what belongs in the shell.

Add more transitions if the system has more than one top-level flow. Allow a
pattern (`decide(State, Command) -> (State, Effects, Result)`) when there is
no single global function.

## Module Interfaces

The grey-boxes the human owns. Agents fill the implementation behind each one.
These interfaces are the architecture - the human understands the system through
them, not through what's inside. They don't change without the human's explicit
decision; a change earns an ADR.

For each module:

### `<ModuleName>`

**Exposes:** what callers see - methods, types, invariants, error modes.
Keep this surface small.

**Hides:** the complexity behind the interface. The more hidden here,
the deeper the module.

**Seam:** where this interface lives in the codebase (layer, package, file
pattern). Enough for an implementer to know where to build.

**Test seam:** how this module is tested. What fake or in-memory adapter sits
at this seam in tests. Whether the interface accepts its dependencies (so fakes
can be injected) or creates them (a red flag). The test that proves the module
works should be describable in one sentence at this point.

**Stability:** stable from day one | may flex in phase N | to be confirmed.

**Zone:** `pure` | `shell` | `port`
- `pure` — no I/O, deterministic given inputs, testable with no fakes at all
- `shell` — orchestrates use cases; sequences pure module calls and port calls; holds no domain policy
- `port` — external dependency; has an in-memory adapter for tests and a production adapter; the seam testability and distribution share

**Allowed deps:** `values only` | `ports only` | `external system`

**Effects leave via:** `none` | `returned data` | `injected port`

**Forbidden move:** one or two sentences. The one thing (or two, if genuinely distinct) this module must never do.

*Ports only:* a port seam is real only if both adapters implement the same contract without test-only hooks on the production interface.

Repeat for each module. Written in domain terms from CONTEXT.md.

## Phase List

Rolling-wave. The near phase can be a sentence or two; far phases stay
one-liners until phase-grilling reaches them.

| Phase | Description | Status |
|---|---|---|
| 01-<name> | <stub> | active |
| 02-<name> | <stub> | pending |

Status values: `pending`, `active`, `done`. `milestone-grilling` sets phase 1 to `active` and the rest to `pending`. After that, status transitions belong to `phase-reorient` (marks a phase `done`, flips the next one to `active`) - never to `phase-grilling`.
```

---

## Phase stub format

Each phase list entry:
- `NN-<name>`: zero-padded two-digit prefix, kebab-case name
- Description: what this phase delivers, not how
- Status: `pending` on creation; updated by later skills in the flow

The rolling-wave rule: the phase you're about to start gets detail; everything further out stays one line. Don't front-load the planning.

If phase 1 is a walking skeleton, its stub describes the end-to-end path through the new seams - thin, concrete, wired up end-to-end. The phrase "walking skeleton" doesn't need to appear; the description makes it obvious.

---

## Walking skeleton decision

Made in step 6 of the grilling, reflected in phase 1's stub.

**Yes (establishing path — new or unproven seams):**
- Greenfield: always. Nothing is proven yet.
- Brownfield adding new architecture: new module interfaces, new integration points, untested wiring.

Done-bar (establishing path): the skeleton is complete when the primary transition exists with real types, a test calls it with in-memory adapters only, one meaningful flow passes through, and the test uses zero real infrastructure. This proves the pure/impure boundary is real.

**No (within-architecture path — proven seams only):**
- Brownfield milestone filling behind existing, working interfaces.
- Within-path skeleton (if used): thinnest end-to-end slice confirming existing seams wire up. No typed-zone proof required.

When the answer is yes, the walking skeleton is phase 1. Phase 2 onwards is feature work.

---

## Handoff

Write STATE.md last:

```
current_phase: 01-<first-phase-name>
current_task: none
status: grilling
```

This tells the human (and, eventually, the orchestration script) that `phase-grilling` on phase 01 is the next step.

---

## Out of scope

**Multi-milestone support.** This skill handles exactly one milestone per repo. The block on an existing `milestone-spec.md` is deliberate - not a gap to fill later.

Multi-milestone would need a higher level of nesting: a `.flow/milestones/` directory, each milestone getting its own subtree that mirrors how `.flow/phases/` works today. It's the same recursive pattern one level up. But it's not needed until the single-milestone flow is proven, so it stays out of scope here.
