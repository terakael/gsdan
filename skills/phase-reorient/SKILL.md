---
name: phase-reorient
description: "End-of-phase step: check for cross-task integration gaps, reshape downstream phases in milestone-spec.md, and finalise the phase. Re-entrant - adds fix-up tickets for done-definition gaps and exits without marking done; the loop continues until a clean run."
---

Run when the ticket frontier is empty - every ticket has a done-summary. You have the
holistic view no single task-reorient could have: all task findings at once. Use it to
check for cross-task integration gaps, harvest phase-level decisions, and reshape
downstream phases. Then, when clean, finalise the phase.

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
  blocking edges, using the full ticket format from ARTIFACT-CONTRACT.md.
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

### 4. Reshape downstream phases

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

### 5. Status transition (clean run only)

Only reach this step if step 2 found no done-definition gaps.

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
<one paragraph: cross-task gaps or decisions harvested, or "no gaps found">

## Actions taken
<bullet list of files written and why>

## Next step
<what the loop will do next: phase marked done / fix-up ticket(s) added / phase advancing to grilling>
```

This file is the only durable record of the run — write it even if nothing changed.

## Reads / Writes

**Reads:** STATE.md, all task summaries, phase-spec.md, milestone-spec.md, CONTEXT.md,
relevant ADRs.

**Writes (clean run - no gaps):**

| File | Notes |
|---|---|
| `.flow/CONTEXT.md` | Cross-task decisions via `/domain-modeling` |
| `.flow/adr/NNNN-<slug>.md` | If cross-task decisions meet ADR criteria |
| `.flow/milestone-spec.md` | Phase status transitions + downstream stub changes |
| `.flow/STATE.md` | Written last |

**Writes (fix-up path - gap broke done-definition):**

| File | Notes |
|---|---|
| `.flow/phases/<phase>/tickets/NN-<slug>.md` | Fix-up tickets only |
| `.flow/CONTEXT.md` | If step 1 harvested anything |

On the fix-up path, STATE.md and milestone-spec.md are untouched. The loop reads the
phase status from milestone-spec.md and exits only when it sees `done` there. Downstream
ticket details stay in milestone-spec.md stubs until phase-grilling turns them into
tickets when the phase is reached.
