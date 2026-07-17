---
name: milestone-audit
description: "Close-out gate: run when STATE.md shows status: audit. Check runtime integration, requirements coverage, and cross-phase consistency. Add gap phases for any blockers; set status: ready-to-ship when clean."
disable-model-invocation: true
---

Step 6 - the close-out gate. Run when `STATE.md` shows `status: audit`. Three checks
across the whole milestone — something no per-phase review could see — then either clear
the milestone for shipping or add gap phases for what is still open.

The recursive mirror of `phase-reorient`, one level up: where phase-reorient closes
cross-task gaps inside a phase, milestone-audit closes cross-phase gaps across the whole
milestone.

Re-entrant: if you find gaps, add gap phases and set STATE.md so the human can drive
them through the normal flow, then re-invoke milestone-audit. When clean, set
`status: ready-to-ship`.

## Pre-conditions

`STATE.md` must show `status: audit`. If it does not, check STATE.md to see where you
actually are.

## Context

Read these files before starting:

| File | What it provides |
|---|---|
| `.flow/milestone-spec.md` | The destination: problem, solution, user stories, module interfaces, phase list |
| `.flow/phases/*/phase-spec.md` | Each phase's goal, scope, and done-definition |
| `.flow/phases/*/summaries/*.md` | All task summaries across all phases |
| `.flow/CONTEXT.md` | Glossary and rules |
| `.flow/adr/*.md` | Hard decisions |

Read every summary across every phase. The milestone-level view is the point.

## Steps

Steps 1, 2, 3, and 4 are independent — run them in parallel as subagents to keep context
windows manageable.

### 1. Runtime integration

Run the full test suite. Record the exact command and its result.

This is the empirical gate. Cross-phase integration gaps often only show up at runtime:
a module interface that looks consistent on paper may not wire up correctly until you
run the whole thing; tests that passed per-phase may fail at the milestone level.

Record all failures. They are candidates for step 4.

**Done when:** the test suite has run to completion and all failures are recorded.

### 2. Requirements coverage

Map each user story from `milestone-spec.md` back to the summaries and phase-specs that
claim to deliver it.

Spawn parallel review subagents — one per story cluster or area — to keep context
windows manageable. Each subagent gets: the user stories it is checking, the relevant
phase-specs, and the done-summaries of the tickets that should have delivered them. It
returns: `covered` / `partial` / `missing` for each story, with a pointer to the
evidence.

Partially met requirements are candidates for step 4. Missing requirements are
candidates for step 4.

**Done when:** every user story has a `covered` / `partial` / `missing` verdict with
evidence.

### 3. Cross-phase code review

Run `/code-review` focused on two things no per-ticket review could see:

- **Cross-phase consistency**: do patterns, naming, and conventions hold across phases?
  Did choices made in phase 1 stay coherent through the last phase?
- **Interface conformance**: does the built system honour the module interfaces defined
  in `milestone-spec.md`? The module interfaces are the spine Dan owns — this is the
  "did we build the thing we designed" gate.

Spawn parallel subagents by area if the milestone diff is large — one per module or
phase area, each checking its slice. A serious finding is one that breaks correctness,
violates a module interface, or undermines the architectural vision. Style nits and minor
improvements are not serious findings.

**Done when:** every module area has been reviewed and all serious findings are recorded.

### 4. AGENTS.md chain coherence

Check the whole AGENTS.md ancestor chain is coherent and non-redundant across the
milestone's directory tree.

Spawn a reviewer subagent. Give it: all AGENTS.md files in the repo (walking the full
tree), the milestone-spec (module interfaces and architectural intent), and the
ARTIFACT-CONTRACT.md sharp rule. Have it check:

- **Completeness:** does every module or component directory that has code from this
  milestone have an AGENTS.md? Missing files are candidates for step 5.
- **Non-redundancy:** is any why-content repeated verbatim across layers? Content in a
  child that is already fully stated in a parent should be flagged.
- **Accuracy:** does the stated why for each layer match the code that landed? Rationale
  that was superseded by late-phase decisions and never updated is a gap.
- **Coherence:** does the chain tell a consistent story from root to leaf? An intent
  stated in a parent that contradicts a decision documented in a child is a conflict.

**Done when:** the reviewer has checked the full tree and returned a verdict (clean /
gaps-found) with specific gaps listed.

### 5. Gap analysis

Gather findings from all four checks. For each finding, apply the **destination test**:

> Does this gap mean the milestone has not delivered what its problem statement,
> solution, and user stories say it should deliver?

| Answer | Action |
|---|---|
| Yes — breaks the milestone's requirements | Add a gap-closure phase to `milestone-spec.md`. Shipping waits. |
| No — quality nit or future improvement | Note it in the audit doc. Non-blocking. |

For AGENTS.md gaps specifically: a missing or stale AGENTS.md is non-blocking unless it
reflects a genuine coherence gap in the architecture (a decision that was never recorded
and leaves the code ambiguous). Missing docs without architectural ambiguity go in the
audit as a non-blocking note.

The same "concrete gap, not speculation" discipline applies. If you would need to build
something to confirm the gap exists, it is a downstream concern, not a blocker.

**Done when:** every finding has a verdict and gap phases are written for all blockers.

### 6. Write `milestone-audit.md`

Write `.flow/milestone-audit.md` using the format below. Each re-audit run overwrites
the previous one — the latest is the current truth; git history preserves the trail.

**Done when:** the audit document is written and its Status field matches the actual
outcome (clean or gaps-found).

### 7. Update STATE.md

**Gaps found:**
- Gap phases are already in `milestone-spec.md` (added in step 4).
- Mark the first gap phase `active` in the phase list.
- Write STATE.md:

```
current_phase: NN-<first-gap-phase>
current_task: none
status: grilling
```

The human runs phase-grilling on the gap phase, drives it through implement, then
re-invokes milestone-audit.

**Clean:**
- Write STATE.md:

```
current_phase: none
current_task: none
status: ready-to-ship
```

Write STATE.md last, after milestone-spec.md and milestone-audit.md are updated.

## Audit document format

```markdown
# Milestone Audit
_Audit run: <date> · against <commit or HEAD>_

## Status
clean | gaps-found

## Next action
gaps-found → run phase-grilling on NN-<gap-phase>
clean → ready to ship

## Integration findings
**Test run:** `<command>` → <result: N passed, N failed>

<Summary of cross-phase integration. Name any failures and which seams they implicate.>

## Requirements coverage
| User story | Status | Evidence |
|---|---|---|
| As a <actor>, I want <feature> | covered / partial / missing | phase N, tickets … |

## Code review findings
<Cross-phase consistency and interface conformance findings, organised by area.
For each serious finding: what it is, which phases it spans, whether it blocks shipping.>

## AGENTS.md chain
<Coherence verdict: clean | gaps-found. List any missing, stale, redundant, or
conflicting AGENTS.md content found across the tree. Note whether each is blocking.>

## Gap list
| Gap | Type | Affects | Gap phase added |
|---|---|---|---|
| <description> | integration / coverage / code-quality / agents-docs | <phases/stories> | NN-<gap-phase> |

Empty when clean.
```

## Reads / Writes

**Reads:** milestone-spec.md, all phase-specs, all summaries across all phases,
CONTEXT.md, ADRs, all AGENTS.md files in the repo tree.

**Writes:**

| File | Condition |
|---|---|
| `.flow/milestone-audit.md` | Every run — overwrites previous |
| `.flow/milestone-spec.md` | Gap phase stubs added + gap phase marked `active` |
| `.flow/STATE.md` | Written last |

Phase specs, tickets, CONTEXT.md, and ADRs stay untouched. Gap phases are stubs in
milestone-spec.md; phase-grilling elaborates them. All decisions were already harvested
by task-reorient and phase-reorient throughout the flow.
