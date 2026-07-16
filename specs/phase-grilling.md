# Spec: `phase-grilling`

Step 2 of the nested delivery loop. You invoke it once per phase, right before the ralph loop starts. It reads the milestone context, grills you on the phase's scope and tasks, proposes a ticket breakdown for your approval, and writes the phase artifacts. Then it hands off to `implement`.

`phase-grilling` is a **pure reader** of `milestone-spec.md`. Everything it writes is scoped to the current phase. Downstream implications - things that might reshape later phases - get captured in `CONTEXT.md` or an ADR, and `phase-reorient` applies them at the phase boundary.

---

## Pre-conditions

Check before doing anything else.

**Phase selection:** read `current_phase` from `STATE.md`. That's the phase to work.

**If `milestone-spec.md` doesn't exist:** refuse and stop. Run `milestone-grilling` first.

**If `phase-spec.md` already exists for the selected phase:** refuse and stop. Check `STATE.md` - this phase has already been grilled. If you're mid-phase, the next step is `implement`.

If `.flow/phases/NN-<name>/` doesn't exist yet, create the directory (with `tickets/` and `summaries/` subdirectories).

---

## Step-by-step

Run `/grilling` steered through three areas. `/domain-modeling` is active throughout - capture new terms, challenge fuzzy language, write `CONTEXT.md` entries and ADRs as things crystallise.

At the end, synthesise into `phase-spec.md`, write tickets, update STATE.md.

### 1. Load context

Before grilling, read:
- `milestone-spec.md` - the destination, module interfaces, phase stubs
- `CONTEXT.md` - the glossary and rules
- Relevant ADRs
- The stub for the current phase from the Phase List

Orient to the milestone before scoping the phase. The module interfaces in `milestone-spec.md` are the spine - everything built in this phase must land on the right side of those seams.

### 2. Steer grilling: phase goal and scope

What does this phase deliver? What does "done" look like at the end of it?

Cover:
- What user-visible or system-level outcome does this phase produce?
- What's explicitly out of scope for this phase (but in scope for a later one)?
- Any hard constraints that apply to this phase specifically?

If anything surfaces that has implications for downstream phases - a new decision, a constraint that ripples - capture it in `CONTEXT.md` or an ADR. Don't touch `milestone-spec.md`. `phase-reorient` applies those implications at the end of the phase.

`/domain-modeling` is active here: any new domain terms or rules that emerge go into `CONTEXT.md` right away.

### 3. Anchor to module interfaces

Before breaking into tasks, establish which grey-boxes this phase touches. Read the Module Interfaces section of `milestone-spec.md` and ask:

- Which module interfaces does this phase implement behind for the first time?
- Which are already in place from a prior phase and are just being used (called across the seam, not filled)?
- Does this phase introduce any new seams? If so, name them now - using `/codebase-design` vocabulary - and check whether they need to be added to `milestone-spec.md`. (If yes, that's an interface change, which is a human call and earns an ADR.)

**For each interface being implemented behind, nail down the test strategy now - before any tickets are written.** Ask:
- What fake or in-memory adapter sits at this seam in tests? If there isn't one yet, design it here.
- Does the interface accept its dependencies rather than create them? If not, reshape it until it does.
- What does a passing test of this module look like from the caller's perspective? If you can't describe it in a sentence, the interface is probably the wrong shape.

Write the answers into the `phase-spec.md` Module Interfaces and Testing Decisions sections (see format below). This is what the human reads to understand which part of the architecture this phase is advancing and how it will be verified. A phase without a clear test strategy per interface is under-specified.

### 4. Steer grilling: task breakdown

Break the phase into tasks - **tracer-bullet vertical slices**, each cutting a complete end-to-end path through every relevant layer (not a horizontal slice of one layer). Each completed task should be demoable or verifiable on its own.

For each proposed slice:
- What end-to-end path does it cut? (Caller → seam → implementation → output.)
- Which module interface(s) does it build behind or wire across?
- **What failing test proves this slice is done?** Acceptance criteria are test cases - if you can't express each criterion as a test that currently fails, the slice isn't well-defined yet.
- Is the slice thin enough to be meaningfully done in one fresh context window?
- What blocks what? (Which tasks must finish before another can start?)

**Prototype escape hatch:** if Dan can't answer a grilling question about a task's *approach* (not just its scope) - the how is genuinely unknown - flag it as a prototype candidate and spawn an interactive subagent to run `/prototype`. The subagent writes its prototype and findings to disk and returns a summary. The grilling continues with that new knowledge. The prototype code is **throwaway**: only the findings are harvested (into `CONTEXT.md`, an ADR, or a ticket constraint). The code is not committed to the main tree.

Once all tasks are clear, move to step 5.

### 5. Propose and approve ticket breakdown

Present the proposed breakdown for Dan's approval before writing any files. For each ticket show:

- **Title** (`NN-<slug>`)
- **What it delivers** - the end-to-end behaviour it makes work
- **Interface** - which module interface(s) this slice builds behind or wires across
- **Blocked by** - which other tickets (slugs) must finish first, or "none"

Ask:
- Does the granularity feel right?
- Are the blocking edges correct?
- Does each slice have a clear interface it's building behind?
- Should anything be split or merged?

Iterate until approved.

Ticket prefix order is for human readability. Blocking edges are the authority - the loop uses the frontier rule from ARTIFACT-CONTRACT.md to determine what's runnable, not prefix order. `phase-grilling` still numbers tickets in a sensible reading order (blockers tend to come first), but that order is not load-bearing and the loop doesn't depend on it.

### 6. Synthesise phase-spec.md

Run `/to-spec` to synthesise the grilling conversation into a structured document, adapted to phase scope (see format below). This is synthesis, not another interview - `/to-spec` formalises what the grilling already resolved.

### 7. Write artifacts

See "Reads / Writes" below. Write STATE.md last.

---

## Reads / Writes

**Reads:**
- `.flow/milestone-spec.md` - destination, module interfaces, phase stub (read-only - this skill never writes it)
- `.flow/CONTEXT.md` - glossary and rules (read at start; appended during grilling)
- `.flow/adr/*.md` - relevant hard decisions
- `.flow/STATE.md` - phase selection (`current_phase`)

Note: `milestone-spec.md` phase statuses (`pending`/`active`/`done`) are read here but never written by this skill. Status transitions belong to `milestone-grilling` (sets phase 1 `active`) and `phase-reorient` (marks phases `done`, flips the next one `active`).

**Writes:**

| File | Notes |
|---|---|
| `.flow/phases/NN-<name>/phase-spec.md` | written once by this skill |
| `.flow/phases/NN-<name>/tickets/NN-<slug>.md` | one per task, in topological order |
| `.flow/adr/NNNN-<slug>.md` | one per hard decision that meets the ADR criteria |
| `.flow/CONTEXT.md` | new entries appended during grilling |
| `.flow/STATE.md` | written last (see "Handoff") |

Does **not** write `milestone-spec.md` or anything in other phases' directories.

---

## `phase-spec.md` format

```markdown
# Phase NN: <name>

## Goal

What this phase achieves, in one or two sentences. Written at the level of
user-visible or system-level outcome - not implementation steps.

## Scope

What's included in this phase, and what's explicitly excluded (but covered
by a later phase).

## Done

How we know this phase is complete. Verifiable outcomes - not a checklist of
tasks, but the observable state the system is in when the phase is finished.

## Module Interfaces

Which grey-boxes this phase advances. For each:

- **`<ModuleName>`** — [implementing behind | wiring / using]
  One sentence on what this phase adds or wires for this module.
  "Implementing behind" = this phase fills new implementation behind the interface.
  "Wiring / using" = the interface is already in place; this phase calls across it.

The human reads this section to understand which part of the architecture
this phase is advancing. Every ticket in the phase must fall behind at least
one of these interfaces.

## Implementation Decisions

Phase-specific architectural or technical decisions that emerged from grilling.
No file paths or code snippets - unless a prototype produced a snippet that
pins a decision better than prose can, in which case inline it and note it
came from a prototype.

## Testing Decisions

The test strategy for this phase, decided before tickets are written.

- **Fake / adapter strategy:** for each interface being implemented behind,
  what sits at the seam in tests? In-memory fake, test double, real adapter
  against a local instance? Concrete enough that an implementer can build
  the test without asking.
- **Test seam:** which module interface(s) the tests target. Tests cross the
  same seam callers do - if you're testing past the interface, the module is
  probably the wrong shape.
- **Example test shape:** what a passing test for this phase looks like. One
  concrete example is worth more than a paragraph of description.
- **Contract tests:** if this phase introduces a new port, name the shared
  contract test suite. Both the in-memory adapter and the production adapter
  must pass it before the port is considered proven. This belongs in the
  first seam-wiring ticket's acceptance criteria and in this phase's done
  definition.

## Architecture Assertions

Structural invariants the code must obey, regardless of test strategy.
Distinct from Testing Decisions (which says how to verify) — this says what
must remain structurally true.

Required assertion in every phase:
- The primary transition remains callable with in-memory adapters only.

Other common assertions (add as relevant):
- Domain rules live in pure-module tests, not adapter tests.
- Adapters translate only; they do not encode domain policy.
- No pure module depends on infrastructure-shaped types.
```

---

## Ticket format

Each ticket lives at `.flow/phases/NN-<name>/tickets/NN-<slug>.md`.

```markdown
# NN-<slug>

## What to build

The end-to-end behaviour this ticket makes work, from the user's or system's
perspective. Not a layer-by-layer implementation list. Written in the domain
vocabulary from CONTEXT.md.

This is a vertical slice: it cuts a complete path through the system from the
caller's perspective down to the implementation and back. Describe the path.

## Interface

Which module interface(s) from `milestone-spec.md` this slice builds behind
or wires across.

- `<ModuleName>` — [implementing behind | wiring / using]

The implementer must not change the surface of these interfaces. If the work
reveals that an interface needs changing, that is an escalation - not a silent
decision.

## Acceptance criteria

These are your test cases. Each criterion is a failing test that must be
written before any production code, and a passing test before the ticket
can be marked done. Write them from the caller's perspective at the interface
seam - not from inside the implementation.

- [ ] Criterion 1
- [ ] Criterion 2

## Blocking edges

Tickets that must be done before this one can start. Written as sibling slugs.

- 01-<slug>

Or: "None - can start immediately."

## Constraints

Hard requirements on *how* this ticket is built: technical limits, interface
contracts that must be respected, performance requirements, things that must
not break. These are not ordering dependencies (those go in Blocking edges) -
they are hard rules on the implementation itself.

- Constraint 1

Or: "None."
```

**Blocking edges** are ordering dependencies on other tickets in this phase. A ticket lists the slugs of tickets that must be `done` before it can start.

**Constraints** are hard requirements on this ticket's implementation: "must stay behind the existing auth interface," "response time under 100ms," "must not break the existing migration path." They constrain the how, not the when.

Tickets describe **what, not how**. The implementer decides the approach, within the milestone-spec vision: build the minimal slice this ticket asks for, but place seams where the vision says they go.

---

## Prototype escape hatch

Fires when the grilling reaches a task where the approach is genuinely unknown - Dan can't answer the "how would you build this?" question.

**Trigger:** the agent flags it as a prototype candidate. The question must be about *approach* (how to build it), not *scope* (what to build). Unknown scope is a grilling problem; unknown approach is a prototype problem.

**Mechanism:**
1. Spawn an interactive subagent running `/prototype`.
2. The subagent builds the minimal throwaway that answers the question, writes its findings to disk (a `NOTES.md` next to the prototype or an equivalent), and returns a summary to the grilling session.
3. The grilling continues with the new knowledge.

**What gets harvested:** only the findings - a decision, a constraint, a term. These flow into `CONTEXT.md`, an ADR, or a ticket's Constraints section as warranted, through the normal grilling flow.

**What doesn't get harvested:** the prototype code. It's throwaway from day one and is not committed to the main tree. Keep the answer, delete the code.

---

## Ticket ordering

Assign zero-padded two-digit prefixes in a sensible reading order - blockers tend to come first, which helps humans scan the list. But prefix order is not load-bearing: the loop uses the frontier rule from ARTIFACT-CONTRACT.md to determine what's runnable, not prefix order. Blocking edges are the authority.

If two tickets have no dependency between them, sequence them in whichever order makes most sense to a human reading the list.

---

## Handoff

Write STATE.md last:

```
current_phase: NN-<name>
current_task: 01-<first-ticket-slug>
status: implementing
```

This tells the ralph loop (and, eventually, the orchestration script) exactly where to resume: the first ticket in the current phase, ready to implement. If the machine restarts between `phase-grilling` and the first `implement` run, it picks up cleanly here.

---

## Out of scope

**Touching `milestone-spec.md`.** This skill never writes it. If the grilling surfaces something that should reshape a downstream phase - a new constraint, a decision that changes the plan - capture it in `CONTEXT.md` or an ADR. `phase-reorient` applies the change to `milestone-spec.md` at the end of the phase, once implementation has confirmed the insight.

**Running `implement`.** Phase-grilling ends when the artifacts are written. The human invokes the ralph loop next.

**Cross-phase ticket dependencies.** Tickets are scoped to this phase. Blocking edges reference only sibling tickets in the same `tickets/` directory - not tickets in other phases.
