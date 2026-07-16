# Spec: `phase-reorient`

Step 5 of the nested delivery loop. It runs when the phase's ticket frontier is empty - every ticket has a done-summary. It has the holistic view that no single `task-reorient` could have: all tasks' findings at once. It uses that view to check for cross-task integration gaps, harvest phase-level decisions, and reshape the downstream phases. Then, when clean, it finalises the phase and hands off.

It's re-entrant. If it finds a gap that breaks the phase's done-definition, it adds a fix-up ticket to the current phase and exits without finalising. The implement loop re-globs, finds the new ticket, implements it, and invokes `phase-reorient` again. This repeats until phase-reorient runs clean - no done-definition gaps remain. **Phase-reorient marking the phase `done` is what terminates the loop.** The loop's max_iterations cap bounds any runaway (including the nasty case where a gap keeps recurring and phase-reorient keeps adding a fix-up ticket that never closes).

Runs as a **fresh pi instance** - same principle as every other step. Context comes entirely from disk.

---

## Invocation

Auto-invoked by the implement loop when the frontier is empty. The loop's exit logic:

```
3. If frontier is empty:
   a. Read current phase's status from milestone-spec.md (via STATE.md current_phase).
   b. If status is `done` → exit 0. The loop is finished.
   c. If status is not `done` → invoke phase-reorient → re-glob → go to step 1.
```

The phase's `done` status is the single exit signal. This must not be simplified to an unconditional invoke-then-exit - that would either skip the gap check (if phase-reorient always marks done) or cause an infinite loop (if it sometimes doesn't).

The loop's prompt for phase-reorient lives at `.flow/.prompts/phase-reorient-prompt.md` alongside `implement.sh`.

---

## Context assembly

Read these files before starting:

| File | What it provides |
|---|---|
| `.flow/STATE.md` | `current_phase` — identifies the phase just completed |
| `.flow/phases/<phase>/summaries/*.md` | All task summaries — the holistic input; read every one |
| `.flow/phases/<phase>/phase-spec.md` | The phase's goal, scope, and **done definition** — the arbiter for gap decisions |
| `.flow/milestone-spec.md` | The destination, module interfaces, phase list, and downstream stubs |
| `.flow/CONTEXT.md` | The glossary and rules — read before harvesting to avoid re-adding existing entries |
| `.flow/adr/*.md` | Hard decisions — read relevant ones before opening new ADRs |

Read every summary. The holistic view is the point — this is the first step that has all task findings at once.

---

## Step-by-step

### 1. Harvest cross-task decisions

Read through all task summaries together. Look for decisions, patterns, or rules that no single task-reorient could see because they require the full-phase picture.

- New domain terms or rules that crystallised across multiple tasks → add to CONTEXT.md via `/domain-modeling`.
- Architectural decisions that are now clearly hard-to-reverse, surprising without context, and real trade-offs → open ADRs via `/domain-modeling`.
- Individual task decisions that task-reorient already captured → skip. This is a cross-task sweep, not a repeat of task-reorient's work.

### 2. Check for cross-task gaps

Read all summaries holistically. Ask: **are there things that individually looked fine per-task but don't join up cleanly when you look at the whole phase?** Integration points between tasks, an interface that landed differently in task 2 than task 5 assumed, a seam that was placed in two places.

The bar is **concrete gap, not speculation**. A gap must be something the summaries actually surface - not a concern you'd have about any phase, and not a cosmetic re-organisation.

For each concrete gap, apply the **done-definition test**: read the phase's `done` definition in `phase-spec.md`.

**If the gap breaks the done-definition** (the phase cannot honestly be called complete without fixing it):
- Add one or more fix-up tickets to `.flow/phases/<phase>/tickets/` with correct blocking edges, using the full ticket format from ARTIFACT-CONTRACT.md.
- Do **not** do the status transition. Do **not** mark the phase done.
- Exit. The loop will re-glob, find the new tickets, implement them, and invoke phase-reorient again.

**If the gap is new/forward scope** (the phase delivered what it said it would; this is additional work beyond the done-definition):
- Add it as a downstream phase stub, a modification to an existing downstream stub, or a new phase in the milestone's phase list.
- It does not block the current phase from closing.

### 3. Architecture drift check [If milestone-spec has typed zone fields]

If `milestone-spec.md` has typed zone fields (establishing-path milestone), look across all task summaries together for phase-level drift:

- Is the primary transition still callable with in-memory adapters only? If any task's summary or code changes suggest the pure core now depends on infrastructure-shaped types or performs direct I/O, the boundary has moved.
- Did any phase work push domain rules into ports or shell code? Look for adapter tests that assert business policy, or shell code that contains decision logic.
- Did any missing port or broken seam surface during implementation that was never escalated and never updated the milestone-spec? If so, record it in CONTEXT.md or open an ADR, and consider whether the milestone-spec's module interfaces need updating.
- Did any task force an interface change that milestone-grilling got wrong? If the abstraction was mis-scoped, the downstream phase stubs need adjusting.

If `milestone-spec.md` has no typed zone fields (within-architecture milestone), skip this step.

### 4. Reshape downstream phases

Based on what the whole phase taught us, adjust the downstream phase stubs in `milestone-spec.md`. This is the phase-level rolling-wave update - the same "concrete outcome, not speculation" discipline, one level up.

You can:
- **Modify** existing downstream stubs (scope changed, approach needs adjusting, effort estimate shifted).
- **Add** new phases (the work revealed a step that wasn't anticipated).
- **Remove** planned phases (a phase turned out to be unnecessary given how things actually landed).

Be liberal. Phase-grilling will re-grill each downstream phase when it's reached and elaborate from scratch - so a rough stub update is enough. You're keeping the destination map honest, not pre-writing the phase spec.

Don't touch the completed phase's stub retroactively; don't touch the completed phase's `phase-spec.md` (task-reorient kept it current throughout).

### 5. Status transition (only when clean)

If step 2 found no done-definition gaps - or if this is a re-run and all prior fix-up tickets are now done - finalise the phase:

1. Mark the current phase `done` in the milestone-spec.md phase list.
2. Determine the next step:
   - **If there are downstream `pending` phases:** mark the next one `active`. Update STATE.md (see "STATE.md transitions").
   - **If this was the last phase (no remaining pending phases):** update STATE.md for milestone-audit.

---

## Reads / Writes

**Reads:**
- `.flow/STATE.md`
- `.flow/phases/<phase>/summaries/*.md` (all of them)
- `.flow/phases/<phase>/phase-spec.md`
- `.flow/milestone-spec.md`
- `.flow/CONTEXT.md`
- `.flow/adr/*.md` (relevant)

**Writes:**

| File | Notes |
|---|---|
| `.flow/CONTEXT.md` | Cross-task/phase-level decisions harvested from all summaries |
| `.flow/adr/NNNN-<slug>.md` | ADR if a cross-task decision meets the criteria |
| `.flow/phases/<phase>/tickets/NN-<slug>.md` | Fix-up tickets only — when a gap breaks the done-definition |
| `.flow/milestone-spec.md` | Phase status transitions (done/active) + downstream stub changes |
| `.flow/STATE.md` | Written last on a clean run (see "STATE.md transitions") |

Does **not** write:
- The completed phase's `phase-spec.md` — task-reorient kept it current; this step looks forward.
- Tickets in other phases — downstream changes go in `milestone-spec.md` stubs, not other phases' ticket directories (phase-grilling handles that when the phase is reached).
- Summaries — those belong to the implement iteration.

---

## Gap decision criteria

The done-definition in `phase-spec.md` is the arbiter. One question per gap:

> Does this gap mean the phase has not delivered what its done-definition says it should deliver?

| Answer | Action |
|---|---|
| Yes — gap breaks done-definition | Fix-up ticket in current phase. No status transition. Loop continues. |
| No — phase delivered what it said; this is additional/new scope | Downstream stub or new phase. Current phase closes. |

Apply the same discipline as task-reorient one level up: **concrete gap, not speculation**. If you'd need to build something to confirm the gap exists, it's not a concrete gap yet - it's a downstream risk, and it goes in a downstream stub.

---

## STATE.md transitions

### Fix-up tickets added (gap broke done-definition)

No STATE.md write. `status` stays `implementing`. The loop re-globs and continues.

### Clean run, middle phase (downstream phases remain)

```
current_phase: NN-<next-phase-name>
current_task: none
status: grilling
```

The human's next step is `phase-grilling` for the new `current_phase`.

### Clean run, last phase (no downstream phases remain)

```
current_phase: none
current_task: none
status: audit
```

The human's next step is `milestone-audit`.

---

## Out of scope

**Per-task ticket sweeping.** task-reorient already handled that after each task. phase-reorient only adds tickets for cross-task gaps the holistic view surfaces — not a repeat per-ticket check.

**Completed phase's `phase-spec.md`.** Leave it as task-reorient left it. This step looks forward.

**Cross-milestone work.** phase-reorient's scope is one phase and the downstream stubs in milestone-spec.md. Cross-phase integration and requirements coverage is milestone-audit's job.
