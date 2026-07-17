---
name: phase-grilling
description: "Per-phase kickoff: read the milestone context, grill Dan on the phase's scope and tasks, get ticket breakdown approved, and write phase artifacts. Hands off to implement."
disable-model-invocation: true
---

Step 2 of the nested delivery loop. Run once per phase, right before the implement loop
starts. Read the milestone context, grill Dan on scope and tasks, propose a ticket
breakdown for approval, and write the phase artifacts. Hand off to implement.

A pure reader of `milestone-spec.md` — everything you write is scoped to the current
phase. Downstream implications go into CONTEXT.md or ADRs; phase-reorient applies them
at the phase boundary.

## Pre-conditions

Check before anything else.

**Read `current_phase` from STATE.md.** That is the phase to work.

**If `milestone-spec.md` does not exist:** refuse and stop. Run milestone-grilling first.

**If `phase-spec.md` already exists for the selected phase:** refuse and stop. Check
STATE.md — this phase has already been grilled. If you are mid-phase, the next step is
implement.

If `.flow/phases/NN-<name>/` does not exist yet, create it now with empty `tickets/`
and `summaries/` subdirectories.

## Steps

Run `/grilling` steered through three areas, then propose and write artifacts.
Run `/domain-modeling` throughout — active the whole time, not a separate step.

### 1. Load context

Before grilling, read:
- `milestone-spec.md` — destination, module interfaces, phase stubs
- `CONTEXT.md` — glossary and rules
- Relevant ADRs
- The stub for the current phase from the Phase List

Orient to the milestone before scoping the phase. The module interfaces in
`milestone-spec.md` are the spine — everything built in this phase must land on
the right side of those seams.

**Done when:** clear picture of where this phase sits and what the interfaces constrain.

### 2. Grill: phase goal and scope

What does this phase deliver? What does "done" look like?

Cover:
- What user-visible or system-level outcome does this phase produce?
- What is explicitly out of scope for this phase (but in scope for a later one)?
- Any hard constraints specific to this phase?

Downstream implications — new decisions, constraints that ripple — go into CONTEXT.md
or an ADR. Leave `milestone-spec.md` alone. phase-reorient applies them at the boundary.

**Done when:** goal, scope boundary, done definition, and phase-specific constraints
are unambiguous.

### 3. Anchor to module interfaces

Before breaking into tasks, establish which grey-boxes this phase touches. Read the
Module Interfaces section of `milestone-spec.md` and ask:

- Which module interfaces does this phase **implement behind** for the first time?
- Which are already in place and just **being used** (called across the seam, not filled)?
- Does this phase introduce any new seams? If so, name them using `/codebase-design`
  vocabulary and confirm whether they need adding to `milestone-spec.md`. A new seam
  on the spec is an interface change — Dan's call, earns an ADR.

Write the answers into the `phase-spec.md` Module Interfaces section (see format below).
Every ticket in the phase must fall behind at least one of these interfaces.

**Done when:** the phase-spec Module Interfaces section is filled and every listed
interface is traceable to a module on `milestone-spec.md`.

### 4. Grill: task breakdown

Break the phase into tickets. Each ticket delivers **exactly one observable outcome,
testable at a single named interface seam.** The implementation can touch several
modules; the outcome and the test surface are singular.

That outcome takes one of two shapes. Pick the right one per ticket, and say which out
loud so Dan is approving a decomposition he can actually judge:

- **Tracer-bullet slice** — a thin end-to-end cut through every relevant layer,
  delivering one observable behaviour, tested at the outer seam. Favour these in
  early / walking-skeleton phases: they prove the seams connect.
- **Orthogonal deepening** — deep work behind one module's interface, tested at that
  interface. Favour these in later phases, once the seams they sit behind are proven.

Most phases mix the two. Choose deliberately — don't default to one-ticket-per-module,
which quietly produces horizontal layers with no exercised behaviour.

For each proposed ticket:
- What single observable outcome does it deliver?
- Which module interface is its test surface? (Slice: the outer seam. Deepening: the
  module's own interface.)
- **What failing test proves it done, written at that seam?** If the only way to test
  it is to poke internals, the seam is wrong or it isn't a real unit.
- What blocks it? Which tickets must finish first?

Surface these anti-patterns as you go — flag them to Dan, don't quietly bake them in:
- **Grab-bag** — no single clear test surface. Split it.
- **Conflated responsibilities** — two module jobs in one ticket, so neither seam is
  clean. Split so each seam stands on its own.
- **Orphan stub** — an interface with no caller and no exercised behaviour. YAGNI:
  drop it, or fold it into the ticket that first needs it.
- **Internals-only tests** — if a ticket can only be tested by poking internals, the
  seam is wrong or it isn't a real unit.

**When a clean split needs an interface `milestone-spec.md` doesn't have** — or would
reshape one it does — say so. That is a milestone-level change and Dan's call: update
`milestone-spec.md` and record an ADR, or re-split to stay within the existing
interfaces. Do not bend an interface inside a ticket to make the split work.

**Prototype escape hatch:** if the *approach* is genuinely unknown (not just the scope),
pause and spawn an interactive subagent to run `/prototype`. The subagent builds the
minimal throwaway, writes findings to disk, returns a summary. The grilling continues
with that knowledge. Harvest only findings — prototype code is throwaway.

**Done when:** every ticket has one observable outcome, a named test-surface
interface, a describable failing test at that seam, and agreed blocking edges.

### 5. Propose and approve ticket breakdown

Present the proposed breakdown before writing any files. For each ticket show:
- **Title** (`NN-<slug>`)
- **What it delivers** — the one observable outcome it makes work
- **Shape** — tracer-bullet slice or orthogonal deepening
- **Interface (test surface)** — the single seam its tests target
- **Blocked by** — sibling slugs, or "none"

Ask: does the granularity feel right? Does each ticket deliver one outcome? Is each
test surface the right seam? Are blocking edges correct? Should anything be split or
merged?

Iterate until approved.

### 6. Synthesise and write

Run `/to-spec` to synthesise the grilling into a structured `phase-spec.md`. Write it.
Then write all ticket files from the approved breakdown. Write STATE.md last.

**Done when:** `phase-spec.md`, all tickets, and STATE.md are written.

## `phase-spec.md` format

```markdown
# Phase NN: <name>

## Goal
What this phase achieves in one or two sentences. User-visible or system-level outcome.

## Scope
What is included in this phase and what is explicitly excluded.

## Done
How we know this phase is complete. Observable state, not a task checklist.

## Module Interfaces

Which grey-boxes this phase advances. Every ticket in the phase must fall behind
at least one of these.

- **`<ModuleName>`** — [implementing behind | wiring / using]
  One sentence on what this phase adds or wires for this module.

## Implementation Decisions
Phase-specific architectural or technical decisions from grilling.

## Testing Decisions

Decided in step 3 before any tickets are written.

- **Fake / adapter strategy:** for each interface being implemented behind, what
  sits at the seam in tests? Concrete enough that an implementer can build the
  test without asking.
- **Test seam:** which module interface(s) the tests target. Tests cross the same
  seam callers do — testing past the interface means the module is probably the
  wrong shape.
- **Example test shape:** what a passing test for this phase looks like. One
  concrete example beats a paragraph of description.
- **Contract tests:** if this phase introduces a new port, name the shared contract
  test suite here. Both adapters must pass it. Wire this into the first seam-wiring
  ticket's acceptance criteria and this phase's done definition.

## Architecture Assertions

Structural invariants the code must obey. Distinct from Testing Decisions.

Required in every phase:
- The primary transition remains callable with in-memory adapters only.

Add as relevant:
- Domain rules live in pure-module tests, not adapter tests.
- Adapters translate only; they do not encode domain policy.
```

## Ticket format

Each ticket at `.flow/phases/NN-<name>/tickets/NN-<slug>.md` must start with YAML
frontmatter so the implement loop can parse blocking edges without guessing at prose
formatting:

```markdown
---
slug: NN-<slug>
blocks:
  - NN-<blocking-slug>
  - NN-<another-blocking-slug>
---
```

Use `blocks: []` when there are no blocking edges. The `blocks` list contains plain
slugs only — no backticks, no descriptions. Descriptions belong in the prose body.

The full ticket body follows the frontmatter:

```markdown
# NN-<slug>

## What to build
The single observable outcome this ticket delivers. Written in domain vocabulary from
CONTEXT.md. For a tracer-bullet slice, describe the end-to-end path: caller → seam →
implementation → output. For an orthogonal deepening, describe the behaviour behind
the one module interface.

## Interface (test surface)
The single module interface from `milestone-spec.md` this ticket's tests target.
Slice: the outer seam. Deepening: the module's own interface.

- `<ModuleName>` — [implementing behind | wiring / using]

The implementer must not change the interface surface, and writes the acceptance tests
at this seam — not against internals. If the work reveals that an interface needs
changing to proceed correctly, that is an escalation.

## Acceptance criteria

These are your test cases. Each criterion is a failing test that must be written
before any production code, and a passing test before the ticket can be marked
done. Written from the caller's perspective at the interface seam.

- [ ] Criterion 1
- [ ] Criterion 2

## Blocking edges
Sibling ticket slugs that must be done before this one can start.
- 01-<slug>
Or: "None - can start immediately."

## Constraints
Hard requirements on *how* this ticket is built: interface contracts, performance
limits, things that must not break. Not ordering dependencies (those go above).
- Constraint 1
Or: "None."
```

Tickets describe **what, not how**. The implementer decides the approach, within the
milestone-spec vision: minimal slice on scope, build with the grain on structure.

Blocking edges reference only sibling tickets in the same `tickets/` directory.

## Handoff

Write STATE.md last:

```
current_phase: NN-<name>
current_task: 01-<first-ticket-slug>
status: implementing
```

## Reads / Writes

**Reads:**
- `.flow/STATE.md` — phase selection
- `.flow/milestone-spec.md` — read-only throughout
- `.flow/CONTEXT.md` — read at start; appended during grilling
- `.flow/adr/*.md` — relevant hard decisions

**Writes:**

| File | Notes |
|---|---|
| `.flow/phases/NN-<name>/phase-spec.md` | written once |
| `.flow/phases/NN-<name>/tickets/NN-<slug>.md` | one per task |
| `.flow/adr/NNNN-<slug>.md` | one per hard decision meeting ADR criteria |
| `.flow/CONTEXT.md` | new entries appended during grilling |
| `.flow/STATE.md` | written last |

Write nothing to `milestone-spec.md` or to other phases' directories.
