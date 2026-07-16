# Spec: `implement`

Step 3 of the nested delivery loop - the autonomous implementation engine for one phase. It runs without stopping (except for human clarification) until every ticket in the phase has a done-summary, then hands off to `phase-reorient` and exits.

Two distinct layers. Keep them clear in your head: the **loop script** is the dumb orchestrator - it globs files, invokes `pi`, and decides what to do next based on what's on disk. The **per-iteration pi instance** is where the actual work happens - it reads context, drives TDD, handles review, and writes the outcome. The loop is bash; the pi instance is intelligent.

This skill realises the inner loop from FLOW-SPEC.md:

```
PHASE
  3. implement    → fresh pi per ticket, TDD to green, code-review
  4. task-reorient → auto-invoked by loop after each done ticket
  5. phase-reorient → auto-invoked by loop when phase is done
```

`task-reorient` and `phase-reorient` are not separate human steps - the loop owns their invocation.

---

## Pre-conditions

STATE.md must exist with `status: implementing` and a valid `current_phase`. Run `phase-grilling` first if not.

---

## Layer 1: The loop script (`implement.sh`)

The loop is deliberately dumb. It doesn't parse summaries for content, track decisions, or understand what's being built. It only cares about one question per tick: is there a ticket without a done-summary?

### Startup

1. Read `current_phase` from STATE.md.
2. Initialise `iteration=0`, `max_iterations=<cap>` (suggest 20 for a phase).

### Per-tick cycle

```
loop:
  1. Glob .flow/phases/<phase>/tickets/*.md. Find the first runnable ticket
     (per ARTIFACT-CONTRACT.md frontier rule: no done-summary + all blocking-edge
     slugs have done-summaries; lowest prefix wins).
  2. If frontier is empty:
     a. Read the current phase's status from milestone-spec.md
        (look up STATE.md current_phase in the phase list).
     b. If status is `done` → exit 0. The loop is finished.
     c. If status is not `done` → invoke phase-reorient → go to step 1.
  3. If iteration >= max_iterations → write failure summary → exit 1.
  4. Increment iteration.
  5. Build the per-iteration prompt for this ticket (see "Prompt structure").
  6. Invoke: pi --prompt <prompt-file>
  7. If done-summary written: invoke task-reorient → go to step 1.
     If failed/escalation: go to step 1.
```

The loop never writes summaries itself. It infers state entirely from what's already on disk. If pi crashes mid-iteration without writing a summary, the loop re-attempts the same ticket on the next tick.

task-reorient runs after every successful ticket, including the last one. It sets `current_task: none`. The loop then re-globs on step 1, finds no runnable tickets, and checks the phase status before deciding whether to invoke phase-reorient or exit.

**The phase's `done` status is the single exit signal.** Phase-reorient marks the phase `done` when it runs clean (no done-definition gaps). If it adds fix-up tickets instead, the phase stays un-done, the loop continues, and phase-reorient is invoked again after those tickets complete. The max_iterations cap covers the doom-loop case: a gap that keeps recurring and never closes will eventually hit the cap, exit 1 with a failure summary, and require human investigation.

### Max iterations

When `iteration >= max_iterations` before all tickets are done, the loop:
- Writes `.flow/phases/<phase>/summaries/<current-ticket>.md` with `status: failed` and a note that max iterations were hit without completing the phase (possible doom loop - human should investigate).
- Exits 1.

The per-ticket code-review loop (inside a pi instance) has its own separate cap - see Layer 2. Hitting it counts the iteration as failed and returns control to the outer loop, which then ticks normally.

### Invoking task-reorient and phase-reorient

Both are invoked as fresh `pi` instances with a minimal prompt pointing them at the relevant artifact paths and instructing them to run their respective skill. They are not part of the implementation iteration - they run in their own context window.

```bash
pi --prompt .flow/.prompts/task-reorient-prompt.md
pi --prompt .flow/.prompts/phase-reorient-prompt.md
```

Prompt templates for each live alongside `implement.sh`.

---

## Layer 2: Per-iteration pi instructions

Each pi instance gets a fresh context window. It assembles everything it needs from disk - no live oracle, no conversation history from prior iterations.

### Prompt structure

The loop builds a prompt each iteration by injecting the current ticket path (and prior summary path if it exists) into a template. The template lists every artifact file the instance should read, and what each one provides:

```
You are implementing one ticket in the nested delivery loop.

Your ticket: .flow/phases/<phase>/tickets/<ticket>.md

Read these files before starting:

- .flow/milestone-spec.md
  The destination and module interfaces. This is the vision - everything you
  build must land on the right side of these seams. Read it first.

- .flow/phases/<phase>/phase-spec.md
  This phase's goal, scope, and done definition. Your ticket lives inside this scope.

- .flow/CONTEXT.md
  The glossary and project-specific rules. Use this vocabulary throughout.

- .flow/adr/*.md
  Hard decisions already made. Check for any that touch your area.

- .flow/phases/<phase>/tickets/<ticket>.md
  Your task. What to build (the vertical slice), which module interface it builds behind
  or wires across, acceptance criteria at the interface seam, blocking edges, constraints.

- .flow/phases/<phase>/summaries/<ticket>.md  [if it exists]
  Your prior attempt. What was tried, what failed, what to try differently.

[per-iteration instructions follow - see below]
```

### What to do

After reading context:

**1. Orient to the vision - the grey-box contract.**
Read `milestone-spec.md` and understand the module interfaces in your area. These interfaces are the human's. Your job is to fill the implementation *behind* them - not to redesign or extend the surface.

The rule:
- YAGNI on scope: build the minimal slice this ticket asks for, nothing more.
- Build with the grain on structure: place your seams exactly where the vision says they go. Use `/codebase-design` vocabulary when thinking about seam placement.
- Do not change the interface surface. If your work reveals that an interface needs changing to proceed correctly, that is an escalation - not a silent decision. Escalate before committing anything.

**Before writing any production code, open the task summary file and write these first lines:**
```
Module zone: <pure | shell | port>
Allowed dependencies: <values only | ports only | external system>
Forbidden move: <one or two sentences from the interface spec>
Pure boundary intact: <N/A - pure core | will confirm on completion>
```
Then write the first failing test. This makes architectural orientation auditable and gives a clean restart context if the task fails. Read the ticket's acceptance criteria (those are the failing tests) and the phase-spec Testing Decisions (that names the fake at the seam). If you can't write a failing test against the interface seam that maps to the AC, stop and re-read the phase-spec before proceeding.

**2. Check for uncommitted changes.**
If the prior summary has `status: failed` or notes an escalation, there may be uncommitted changes in the working tree from the last attempt. Read the summary to understand what was tried. Decide: is the partial work worth keeping and building on, or should you reset it (`git stash` or `git checkout -- .`) and start clean? Document your choice in your summary.

**3. Drive TDD to green.**
Use `/tdd` - one red-green slice at a time. The test is the spec: write it first, confirm it fails for the right reason, make it pass, refactor. Only test external behaviour at the agreed seam - not implementation details. Don't skip ahead. If a step of the implementation feels untestable at the interface seam, that's a design problem - raise it as an escalation rather than working around it with internal unit tests.

**4. Code review.**
When all acceptance criteria are met and tests are green, spawn persistent reviewer subagents via `/code-review`. The reviewers run a two-axis review (Standards + Spec). 

If the reviewers find serious issues and you agree they are real:
- Implement the changes so the work adheres to the ticket, the phase vision, and the milestone vision.
- Tell the reviewer subagents (they're persistent - keep the same instances) to re-review.
- Repeat until reviewers are satisfied, or until the review iteration cap is hit.

If the review iteration cap is hit without convergence: treat the whole iteration as **failed**. No commit. Write a failed-summary explaining the review didn't converge.

If the reviewers find issues you disagree with: use your judgement - if they conflict with the ticket or the vision, note the disagreement in the summary and proceed.

**5. On success.**
Commit with the message: `feat(<ticket-slug>): <short description>`

Write `.flow/phases/<phase>/summaries/<ticket>.md`:

```
status: done

Module zone: <pure | shell | port>
Allowed dependencies: <as stated in interface spec>
Forbidden move: <as stated in interface spec>
Pure boundary intact: <yes — evidence: ... | N/A - pure core>

## What was built
<what the ticket delivered>

## Key decisions
<any implementation decisions made mid-task that aren't already in CONTEXT.md or ADRs>

## Files touched
<a short list>
```

**6. On failure.**
No commit. Write `.flow/phases/<phase>/summaries/<ticket>.md`:

```
status: failed

## What was tried
<what approach was attempted>

## Why it failed
<the wall that was hit>

## What the next iteration should try differently
<a concrete suggestion if you have one>
```

### Escalation

When you hit a wall you can't resolve from disk alone - an interface-level decision that would change a module interface in `milestone-spec.md`, or a discovery that the phase premise itself is wrong - **do not resolve it silently and do not guess.**

Escalation is a single action:

1. Stop implementing.
2. Run the inline grilling directly in this session. Dan is in the tmux pane and will answer. Scope the grilling to what's needed: a single hard question and an ADR, or a full `phase-grilling` re-run if the phase premise is broken. Update the on-disk artifacts as you go (CONTEXT.md entries, ADRs, revised tickets).
3. Write a summary:

```
status: failed

## Escalation
<what wall was hit and what question needed human input>

## What was resolved
<what was decided and what artifacts were updated>

## Next iteration
<what the fresh instance should pick up from>
```

4. Exit **without committing**. Do not resume implementing in this session.

The loop re-globs on the next tick and picks up from the revised state. The fresh instance has a clean context window and the updated artifacts.

---

## Context assembly (per iteration)

Every instance assembles its context from these files and nothing else:

| File | What it provides |
|---|---|
| `milestone-spec.md` | The destination + module interfaces. The vision to build with. |
| `phase-spec.md` | This phase's goal, scope, done definition. |
| `CONTEXT.md` | Glossary and project-specific rules. |
| `adr/*.md` | Hard decisions. Read the ones that touch your area. |
| `tickets/<slug>.md` | Your task: what to build, acceptance criteria, constraints, blocking edges. |
| `summaries/<slug>.md` | Your prior attempt (if exists): what failed and what to try instead. |

No live oracle. If the docs don't answer a question the instance needs, that's a gap to escalate - not to guess.

---

## Summary formats

### `status: done`
- What was built (one or two sentences)
- Key decisions made mid-implementation not already captured in CONTEXT.md / ADRs
- Files touched (short list)

**Note:** done-summaries serve two readers - the next implement iteration (to learn from a prior failed attempt) and the task-reorient instance (to harvest decisions and check remaining tickets). The "Key decisions" section in particular must be comprehensive enough for a fresh task-reorient agent to harvest from without having been present during implementation.

### `status: failed`
- What was tried
- Why it failed (the specific wall)
- What the next iteration should try differently (if you have a concrete suggestion)

### Escalation (also `status: failed`)
- What wall was hit
- What was resolved (inline grilling outcome + artifacts updated)
- What the next fresh instance should pick up from

---

## Commit format

One commit per successfully completed ticket:

```
feat(<ticket-slug>): <short description of what was built>
```

Example: `feat(02-auth-middleware): add JWT validation at the HTTP seam`

Commits only on success - never on failure or escalation.

---

## Handoff

When all tickets have done-summaries, the loop:
1. Auto-invokes `phase-reorient` (fresh pi instance).
2. Exits 0.

The human then reads the phase-reorient output and invokes `phase-grilling` for the next phase (cross-phase orchestration is manual - see "Out of scope").

---

## Out of scope

**Cross-phase orchestration.** This loop handles exactly one phase then exits. Invoking `phase-grilling` for the next phase, and eventually `milestone-audit`, is manual. Build and test the single-phase loop first; automate the cross-phase chain once it's proven.

**STATE.md writes (mid-loop).** `task-reorient` updates `current_task` after each done ticket. The loop doesn't write STATE.md directly - it reads `current_phase` at startup and otherwise navigates by globbing summaries.
