# Spec: `milestone-audit`

Step 6 - the close-out gate. Human-invoked when `STATE.md` shows `status: audit` (set by `phase-reorient` after the last phase completed). It runs three checks across the whole milestone - something no per-phase review could see - and either clears the milestone for shipping or adds gap phases to close what's still open.

It's the recursive mirror of `phase-reorient`, one level up:

| | phase-reorient | milestone-audit |
|---|---|---|
| **Gaps it finds** | cross-task integration gaps | cross-phase integration gaps |
| **Fix mechanism** | fix-up tickets in current phase | gap phases in milestone |
| **Arbiter** | phase's done-definition | milestone's requirements / destination |
| **Re-entry signal** | phase status `done` | milestone-audit.md `Status: clean` |
| **Invoked by** | implement loop (automatic) | human (manual) |

Re-entrant: audit → if gaps, add phases + set STATE.md → human drives gap phase through normal machinery → human re-invokes audit → when clean, STATE.md set to `ready-to-ship`, human ships.

---

## Pre-conditions

`STATE.md` must show `status: audit`. If it doesn't, you're not at this step yet - check `STATE.md` to see where you are.

---

## Context assembly

Read these files before starting:

| File | What it provides |
|---|---|
| `.flow/milestone-spec.md` | The destination: problem, solution, user stories, module interfaces, phase list |
| `.flow/phases/*/phase-spec.md` | Each phase's goal, scope, and done-definition |
| `.flow/phases/*/summaries/*.md` | All task summaries across all phases — the holistic record of what was built |
| `.flow/CONTEXT.md` | The glossary and rules — context for the review |
| `.flow/adr/*.md` | Hard decisions — needed to interpret code-review findings correctly |

Read every summary across every phase. The milestone-level view is the point.

---

## Step-by-step

Three independent checks, then gap analysis, then write the audit and update STATE.md. The three checks can be run in parallel - they're independent axes.

### 1. Runtime integration

Run the full test suite. Record the exact command and its result.

This is the empirical gate - cross-phase integration gaps often only show up at runtime. A module interface that looks consistent on paper may not wire up correctly until you run the whole thing. Tests that pass per-phase may fail at the milestone level.

If the suite fails: the failures are gaps. Note them for the gap analysis step.

### 2. Requirements coverage

Check whether the milestone's destination was actually delivered. Map each user story from `milestone-spec.md` back to the summaries and phase-specs that claim to deliver it.

Spawn parallel review subagents - one per story cluster or area - to keep context windows manageable. Each subagent gets: the user stories it's checking, the relevant phase-specs, and the done-summaries of the tickets that should have delivered them. It returns: covered | partial | missing for each story, with a pointer to the evidence.

Partially met requirements are gaps. Missing requirements are gaps.

### 3. Code review - cross-phase consistency and interface conformance

Run `/code-review` focused on two things no per-ticket review could see:
- **Cross-phase consistency**: do the patterns, naming, and conventions hold across phases? Did choices made in phase 1 stay coherent through phase 4?
- **Interface conformance**: does the built system actually honour the module interfaces defined in `milestone-spec.md`? The module interfaces are the spine the human owns - this is the "did we build the thing we designed" gate.

This is not a re-run of the per-ticket reviews that happened inside `implement`. The scope here is the joins between phases and the overall architecture.

Spawn parallel review subagents by area if the milestone diff is large - one subagent per module or phase area, each checking its slice for cross-phase consistency and interface conformance. They report findings back; serious findings are gaps.

A serious finding is one that would break correctness, violate a module interface, or undermine the architectural vision. Style nits and minor improvements are not gaps.

### 4. Gap analysis

Gather the findings from all three checks. For each finding, apply the **requirements/destination test**:

> Does this gap mean the milestone has not delivered what its problem statement, solution, and user stories say it should deliver?

| Answer | Action |
|---|---|
| Yes — gap breaks the milestone's requirements or destination | Add a gap-closure phase to `milestone-spec.md`. No `ready-to-ship` yet. |
| No — milestone delivered what it said; this is a quality nit or a future improvement | Note it in the audit doc but don't block shipping. |

The same "concrete gap, not speculation" discipline applies. If you'd need to build something to confirm the gap exists, it's a downstream concern, not a blocker.

### 5. Write `milestone-audit.md`

Overwrite `.flow/milestone-audit.md` with the current findings. See "Audit document format." Each re-audit run overwrites the previous one - the latest is the current truth; git history preserves the trail.

### 6. Update STATE.md and stop

**If gaps were found:**
- Gap phases have been added to `milestone-spec.md` (with stub descriptions of what they need to close).
- Mark the first gap phase `active` in the phase list.
- Write STATE.md:
  ```
  current_phase: NN-<first-gap-phase>
  current_task: none
  status: grilling
  ```
- Stop. The human runs `phase-grilling` on the gap phase, drives it through the normal machinery (`implement`, reorients), then re-invokes `milestone-audit`.

**If clean:**
- Write STATE.md:
  ```
  current_phase: none
  current_task: none
  status: ready-to-ship
  ```
- The milestone has passed. The human ships (tag, deploy, whatever the project's ship action is).

---

## Reads / Writes

**Reads:**
- `.flow/milestone-spec.md`
- `.flow/phases/*/phase-spec.md`
- `.flow/phases/*/summaries/*.md`
- `.flow/CONTEXT.md`
- `.flow/adr/*.md`

**Writes:**

| File | Notes |
|---|---|
| `.flow/milestone-audit.md` | Overwritten each run — always reflects current audit state |
| `.flow/milestone-spec.md` | Gap phase stubs added on gaps; gap phase marked `active` |
| `.flow/STATE.md` | Written last |

Does **not** write:
- Phase specs or tickets — gap phases are stubs in milestone-spec.md; `phase-grilling` elaborates them.
- CONTEXT.md or ADRs — phase-reorient and task-reorient already harvested decisions throughout. If the audit surfaces something new that genuinely warrants a glossary entry or ADR, add it, but this is rare.

---

## Audit document format

```markdown
# Milestone Audit
_Audit run: <date> · against <commit or HEAD>_

## Status

clean | gaps-found

## Next action

gaps found → run phase-grilling on NN-<gap-phase>
  OR
clean → ready to ship

## Integration findings

**Test run:** `<command>` → <result: N passed, N failed>

<prose summary of what was checked and what the results mean for cross-phase integration.
If tests failed, name the failures and which phase seams they implicate.>

## Requirements coverage

| User story | Status | Evidence |
|---|---|---|
| As a <actor>, I want <feature> | covered / partial / missing | phase N, tickets NN-slug, NN-slug |

<Brief notes on partial or missing coverage.>

## Code review findings

<Cross-phase consistency and interface conformance findings. Organised by area.
For each serious finding: what it is, which phases it spans, whether it's a gap-blocker or a non-blocking note.>

## Gap list

| Gap | Type | Affects | Gap phase added |
|---|---|---|---|
| <description> | integration / coverage / code-quality | <phases/stories> | NN-<gap-phase> |

Empty when clean.
```

---

## Gap decision criteria

The milestone's problem statement, solution, and user stories are the arbiter. One question per finding:

> Does this mean the milestone has not delivered what it said it would?

- **Yes** → gap-closure phase. The milestone is not done.
- **No** → note in audit doc. Non-blocking. The milestone is done once all yes-gaps are closed.

Cross-phase consistency and interface conformance failures that break the architectural vision count as gaps - the module interfaces are the human-owned spine, and honouring them is a stated deliverable. Style nits, minor improvements, and speculative concerns do not.

---

## STATE.md transitions

### Gaps found

```
current_phase: NN-<first-gap-phase>
current_task: none
status: grilling
```

Human runs `phase-grilling` on the gap phase, drives it through `implement`, then re-invokes `milestone-audit`.

### Clean

```
current_phase: none
current_task: none
status: ready-to-ship
```

Human ships manually. Nothing has shipped yet at the point this is written - `ready-to-ship` is the honest name.

---

## Out of scope

**Running phase-grilling or implement for gap phases.** milestone-audit adds the gap phase stubs and sets STATE.md. The human drives the gap phases through the normal machinery manually.

**Ticket or task-level work.** milestone-audit operates at phase and milestone scope. It adds gap phases, not individual tickets (phase-grilling does that).

**Code changes.** milestone-audit reviews and finds gaps; it never edits code. Gap phases exist so the loop can close the gaps cleanly.

**Cross-milestone work.** This skill closes out one milestone. What comes next (the next milestone, a new project) is out of scope.
