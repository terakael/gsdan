---
name: phase-reorient
description: "End-of-phase step: check for cross-task integration gaps, sweep for deep-module leaks that accumulated across tasks, reshape downstream phases in milestone-spec.md, and finalise the phase. Re-entrant - adds fix-up tickets for done-definition gaps and Strong architecture drift, then exits without marking done; the loop continues until a clean run."
---

Run when the ticket frontier is empty - every ticket has a done-summary. You have the
holistic view no single task-reorient could have: all task findings at once. Use it to
check for cross-task integration gaps, sweep for deep-module leaks that accumulated one
ticket at a time (which no per-ticket diff review can see), harvest phase-level
decisions, and reshape downstream phases. Then, when clean, finalise the phase.

This skill is re-entrant. If you find a gap that breaks the phase's done-definition, add
a fix-up ticket and stop WITHOUT marking the phase done. The implement loop re-globs,
implements the fix-up, and invokes you again. Repeat until a clean run. Marking the
phase `done` in milestone-spec.md is the signal that terminates the implement loop.

The loop invokes you headlessly (`pi -p --approve --no-session`) when the frontier is
empty and the phase is not yet `done` in milestone-spec.md.

## Context

Read these files before starting (the loop's prompt pre-loads most of them; read any
that are missing):

| File | What it provides |
|---|---|
| `.flow/STATE.md` | `current_phase` |
| `.flow/phases/<phase>/summaries/*.md` | All task summaries — read every one; the holistic view is the point |
| `.flow/phases/<phase>/phase-spec.md` | The phase's goal, scope, and done definition — the arbiter for gap decisions |
| `.flow/milestone-spec.md` | The destination, module interfaces, phase list, and downstream stubs |
| `.flow/CONTEXT.md` | Glossary and rules |
| `.flow/adr/*.md` | Relevant hard decisions |

Read every summary. The holistic view is what you're here for.

## Steps

### 1. Harvest cross-task decisions

Read all task summaries together. Look for decisions, patterns, or rules that only emerge
from the full-phase picture - things no single task-reorient could have seen.

- New domain terms or rules that crystallised across multiple tasks - add to CONTEXT.md
  via `/domain-modeling`.
- Architectural decisions that are clearly hard-to-reverse, surprising without context,
  and real trade-offs - open ADRs via `/domain-modeling`.
- Decisions task-reorient already captured - skip. This is a cross-task sweep, not a
  repeat.

### 2. Check for cross-task gaps

Read all summaries holistically. Ask yourself: are there things that individually looked
fine per-task but don't join up cleanly across the whole phase? Integration points
between tasks, an interface that landed differently in one task than another task assumed,
a seam placed in two places.

Bar: **concrete gap, not speculation**. The gap must be something the summaries actually
surface - not a concern you'd have about any phase, not a cosmetic re-organisation.

For each concrete gap, apply the **done-definition test**. Read the phase's done
definition in phase-spec.md and ask:

> Does this gap mean the phase has not delivered what its done-definition says it
> should deliver?

**If yes - gap breaks the done-definition:**

- Add one or more fix-up tickets to `.flow/phases/<phase>/tickets/` with correct
  blocking edges, using the full ticket format from `../_shared/ARTIFACT-CONTRACT.md`.
- Add them and stop. Leave milestone-spec.md and STATE.md untouched.
- The loop re-globs, implements the fix-up tickets, and invokes you again.

**If no - forward scope (phase delivered what it said; this is additional work):**

- Add it as a downstream stub or a modification to an existing downstream stub in
  milestone-spec.md.
- The current phase can close. Continue to step 3.

### 3. Architecture drift check [If milestone-spec has typed zone fields]

If `milestone-spec.md` has typed zone fields, look across all summaries for phase-level drift:

- Is the primary transition still callable with in-memory adapters only?
- Did any work push domain rules into ports or shell code?
- Did any missing port or broken seam go unescalated? Record in CONTEXT.md / ADR.
- Did any interface change expose a milestone-grilling mistake? Update downstream stubs.

No typed zone fields → skip.

### 4. Deepening sweep

A per-ticket diff review is blind to smells that accumulate one commit at a time: a
match that grew an arm per ticket, an interface that widened as variants piled up, a
leak that only shows once the whole shape is in view. This is the one moment with that
whole shape in view, so look at it.

Run `/scan-codebase-architecture` scoped to the code this phase touched. It reads the
spine, CONTEXT, and ADRs first, so it won't re-flag deliberate stubs or spine seams -
and it returns a list of findings.

Route each finding (do not act on anything the scan already dropped):

- **Spec/ADR conflict flagged** → drop it. If the intent exists in the spine but isn't
  yet a formal ADR, note in `phase-reorient-summary.md` that the next `phase-grilling`
  should record a ratifying ADR - that's enough to prevent future sweeps re-flagging it.
  Don't author a judgment-call ADR here - this step is headless and can't ask Dan.
  (A ratifying ADR for a decision the spine already made is fine to write; a new
  judgment call is not.)

- **`Strong` + drift-from-vision `yes` + one-ticket-sized `yes`** → the code has drifted
  from where the spine's seam goes, and a single ticket pulls it back. Add a fix-up
  ticket to `.flow/phases/<phase>/tickets/` (full ticket format, correct blocking edges)
  and **stop without marking the phase done** - same re-entrant path as a done-definition
  gap. Leave milestone-spec.md and STATE.md untouched. The loop re-globs, implements the
  fix-up, and invokes you again. This is allowed because it adds a ticket to the current
  phase without changing the phase's destination.

- **Everything else** (`Worth exploring`, `Speculative`, `drift-from-vision: no`, or
  larger than one ticket) → record as a downstream stub in milestone-spec.md or a note
  in CONTEXT.md. Does not block the phase. The human schedules it.

The bar for a fix-up ticket is tight on purpose: only concrete drift-from-vision leaks
that pass the deletion test and fit one ticket. Net-new deepening ideas never become
fix-up tickets - that's how this stays terminating. Fix the drift, the next sweep is
clean, the phase closes.

### 5. Curate higher-layer AGENTS.md

With the full phase in view, curate the AGENTS.md files at higher layers (module /
directory-type level) for the directories this phase touched. These layers capture why
that only emerges from the full-phase shape — patterns that crystallised across tasks,
seam rationale visible only once all the pieces are together.

For each module or component directory that had multiple tasks touching it:

1. Load the ancestor chain for that directory.
2. Run `/write-agents` at the module or component level, sourcing from all task
   summaries and the phase-reorient findings, not just one ticket.
3. Enforce non-redundancy in both directions: pull shared why up to the appropriate
   layer; push sibling-specific content down to the child that owns it.
4. Confirm no content duplicates what already exists in ancestor or descendant files.

This step is mechanical layer-specificity work — not a judgment call. It runs headless
without human input. If a decision at this layer requires human sign-off (a new interface
decision, not documentation of an existing one), that's an escalation for the next phase
grilling, not something to record here.

### 6. Reshape downstream phases

Based on what the whole phase taught you, adjust the downstream phase stubs in
milestone-spec.md. Same discipline as task-reorient, one level up: concrete outcome,
not speculation.

You can:
- Modify existing downstream stubs (scope changed, approach needs adjusting).
- Add new phases (the work revealed a step that wasn't anticipated).
- Remove planned phases that turned out unnecessary.

A rough stub update is enough - phase-grilling fills in the detail when the phase is
reached. Keep the destination map honest.

Leave the completed phase's stub and phase-spec.md in place. Task-reorient kept them
current; your view here is forward only.

### 7. Status transition (clean run only)

Only reach this step if step 2 found no done-definition gaps and step 4 added no fix-up
ticket.

**a.** Mark the current phase `done` in the milestone-spec.md phase list.

**b.** Determine the next step:

If downstream `pending` phases exist (middle phase):
- Mark the next pending phase `active` in milestone-spec.md.
- Write STATE.md:

```
current_phase: NN-<next-phase-name>
current_task: none
status: grilling
```

If no downstream `pending` phases remain (last phase):
- Write STATE.md:

```
current_phase: none
current_task: none
status: audit
```

Write STATE.md last, after milestone-spec.md is updated.

**Always, on every run (clean or fix-up):** write a summary to
`.flow/phases/<phase>/phase-reorient-summary.md`:

```
run: clean | fixup

## What was found
<one paragraph: cross-task gaps, deepening-sweep findings, or decisions harvested, or "no gaps found">

## Actions taken
<bullet list of files written and why>

## Next step
<what the loop will do next: phase marked done / fix-up ticket(s) added / phase advancing to grilling>
```

This file is the only durable record of the run — write it even if nothing changed.

## Reads / Writes

**Reads:** STATE.md, all task summaries, phase-spec.md, milestone-spec.md, CONTEXT.md,
relevant ADRs. Invokes `/scan-codebase-architecture` (which reads the code this phase
touched plus the spine/CONTEXT/ADRs as guardrails). Invokes `/write-agents` for
higher-layer curation.

**Writes (clean run - no gaps):**

| File | Notes |
|---|---|
| `.flow/CONTEXT.md` | Cross-task decisions via `/domain-modeling` |
| `.flow/adr/NNNN-<slug>.md` | If cross-task decisions meet ADR criteria |
| `.flow/milestone-spec.md` | Phase status transitions + downstream stub changes |
| `AGENTS.md` (higher layers) | Via `/write-agents` — module/component level curation |
| `.flow/STATE.md` | Written last |

**Writes (fix-up path - gap broke done-definition, or a Strong drift-from-vision finding
from the deepening sweep):**

| File | Notes |
|---|---|
| `.flow/phases/<phase>/tickets/NN-<slug>.md` | Fix-up tickets only (integration gap or architecture drift) |
| `.flow/CONTEXT.md` | If step 1 harvested anything |

On the fix-up path, STATE.md and milestone-spec.md are untouched. The loop reads the
phase status from milestone-spec.md and exits only when it sees `done` there. Downstream
ticket details stay in milestone-spec.md stubs until phase-grilling turns them into
tickets when the phase is reached.
